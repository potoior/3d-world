import * as THREE from 'three';
import { heightAt, slopeAt, fbm, trailDistanceSq, platforms, peaks } from './terrain.js';
import { mats } from './materials.js';
import { mergeGeometryList } from './geometry.js';

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function segmentGeo(ax, ay, az, bx, by, bz, ra, rb, seg = 5) {
  const dx = bx - ax;
  const dy = by - ay;
  const dz = bz - az;
  const len = Math.hypot(dx, dy, dz) || 1;
  const geo = new THREE.CylinderGeometry(rb, ra, len, seg, 1, false);
  const q = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(dx / len, dy / len, dz / len)
  );
  geo.applyQuaternion(q);
  geo.translate((ax + bx) * 0.5, (ay + by) * 0.5, (az + bz) * 0.5);
  return geo;
}

function blob(bucket, x, y, z, r, rand) {
  const geo = new THREE.IcosahedronGeometry(1, 0);
  geo.scale(r * (0.85 + rand() * 0.4), r * (0.24 + rand() * 0.16), r * (0.8 + rand() * 0.4));
  geo.rotateY(rand() * 6.2);
  geo.translate(x + (rand() - 0.5) * r * 0.55, y, z + (rand() - 0.5) * r * 0.55);
  bucket.push(geo);
}

function addPine(buckets, trunks, x, y, z, height, spread, rand) {
  const variant = rand();
  const bucket = variant < 0.36 ? buckets.deep : variant < 0.68 ? buckets.mid : variant < 0.88 ? buckets.light : buckets.sun;
  const leanA = rand() * Math.PI * 2;
  const lean = 0.14 + rand() * 0.32;
  const tx = Math.cos(leanA) * lean * height;
  const tz = Math.sin(leanA) * lean * height;
  const midY = y + height * 0.5;
  const topX = x + tx;
  const topZ = z + tz;
  const topY = y + height * 0.92;
  trunks.push(segmentGeo(x, y - 0.4, z, x + tx * 0.42, midY, z + tz * 0.42, 0.3 + height * 0.014, 0.2 + height * 0.008, 5));
  trunks.push(segmentGeo(x + tx * 0.42, midY, z + tz * 0.42, topX, topY, topZ, 0.2 + height * 0.008, 0.11 + height * 0.004, 5));

  const tiers = 2 + (rand() * 2 | 0);
  for (let i = 0; i < tiers; i++) {
    const k = i / Math.max(1, tiers - 1);
    const cy = y + height * (0.55 + k * 0.36);
    const cr = spread * (1.05 - k * 0.35) * (0.8 + rand() * 0.3);
    const branchA = rand() * Math.PI * 2;
    const ox = Math.cos(branchA) * spread * (0.35 + rand() * 0.7);
    const oz = Math.sin(branchA) * spread * (0.35 + rand() * 0.7);
    trunks.push(segmentGeo(x + tx * k * 0.8, cy - 0.5, z + tz * k * 0.8, x + tx * k * 0.8 + ox * 0.6, cy, z + tz * k * 0.8 + oz * 0.6, 0.09, 0.05, 4));
    blob(bucket, x + tx * k * 0.8 + ox, cy, z + tz * k * 0.8 + oz, cr, rand);
    if (rand() < 0.6) blob(bucket, x + tx * k * 0.8 - ox * 0.4, cy - 0.35, z + tz * k * 0.8 - oz * 0.4, cr * 0.7, rand);
  }
}

function addShrub(buckets, x, y, z, r, rand) {
  const bucket = rand() < 0.5 ? buckets.shrub : buckets.shrubLight;
  const geo = new THREE.IcosahedronGeometry(1, 0);
  geo.scale(r * (1.1 + rand() * 0.5), r * (0.55 + rand() * 0.4), r * (1 + rand() * 0.4));
  geo.rotateY(rand() * 6);
  geo.translate(x, y + r * 0.35, z);
  bucket.push(geo);
}

function addRock(buckets, x, y, z, size, rand) {
  const bucket = rand() < 0.5 ? buckets.rock : buckets.rockLight;
  const geo = new THREE.DodecahedronGeometry(size, 0);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    p.setXYZ(i, p.getX(i) * (0.7 + rand() * 0.6), p.getY(i) * (0.55 + rand() * 0.5), p.getZ(i) * (0.75 + rand() * 0.5));
  }
  geo.computeVertexNormals();
  geo.rotateY(rand() * 6);
  geo.translate(x, y + size * 0.3, z);
  bucket.push(geo);
}

function addBambooGrove(buckets, x, y, z, rand) {
  const count = 5 + (rand() * 5 | 0);
  const baseRot = rand() * Math.PI * 2;
  for (let i = 0; i < count; i++) {
    const a = baseRot + (i / count) * Math.PI * 2 + (rand() - 0.5) * 0.6;
    const d = 0.5 + rand() * 3.2;
    const bx = x + Math.cos(a) * d;
    const bz = z + Math.sin(a) * d;
    const by = heightAt(bx, bz);
    const h = 5.5 + rand() * 5.5;
    const lean = (rand() - 0.5) * 0.13;
    const segs = 4;
    let px = bx;
    let pz = bz;
    let py = by;
    for (let k = 0; k < segs; k++) {
      const segH = h / segs;
      const nx = px + Math.sin(lean) * segH * 0.25;
      const nz = pz + Math.cos(lean) * segH * 0.08;
      const ny = py + segH;
      buckets.bamboo.push(segmentGeo(px, py, pz, nx, ny, nz, 0.075 - k * 0.008, 0.06 - k * 0.007, 5));
      const node = new THREE.CylinderGeometry(0.105 - k * 0.008, 0.105 - k * 0.008, 0.07, 6, 1, true);
      node.translate(nx, ny - 0.05, nz);
      buckets.bamboo.push(node);
      px = nx;
      py = ny;
      pz = nz;
    }
    const leaves = 4 + (rand() * 4 | 0);
    for (let k = 0; k < leaves; k++) {
      const la = rand() * Math.PI * 2;
      const ly = py - 0.4 - rand() * h * 0.55;
      const len = 0.7 + rand() * 0.7;
      const g = new THREE.PlaneGeometry(len, 0.22, 1, 1);
      g.rotateZ((rand() - 0.5) * 1.4);
      g.rotateY(la);
      g.translate(px + Math.cos(la) * len * 0.45, ly, pz + Math.sin(la) * len * 0.45);
      buckets.bambooLeaf.push(g);
    }
  }
}

function addFern(buckets, x, y, z, size, rand) {
  const fronds = 5 + (rand() * 4 | 0);
  for (let i = 0; i < fronds; i++) {
    const a = (i / fronds) * Math.PI * 2 + rand() * 0.5;
    const g = new THREE.PlaneGeometry(size * (0.32 + rand() * 0.18), size * (0.9 + rand() * 0.5), 1, 1);
    g.translate(0, size * 0.42, 0);
    g.rotateZ((rand() - 0.5) * 0.5);
    g.rotateX(-0.5 - rand() * 0.45);
    g.rotateY(a);
    g.translate(x, y, z);
    buckets.fern.push(g);
  }
}

function addMoss(buckets, x, y, z, r, rand) {
  const geo = new THREE.IcosahedronGeometry(1, 0);
  geo.scale(r * (1.1 + rand() * 0.6), r * (0.08 + rand() * 0.08), r * (0.9 + rand() * 0.5));
  geo.rotateY(rand() * 6.2);
  geo.translate(x, y + 0.03, z);
  buckets.moss.push(geo);
}

function addBroadleaf(buckets, trunks, x, y, z, height, rand) {
  const leanA = rand() * Math.PI * 2;
  const tx = Math.cos(leanA) * height * 0.12;
  const tz = Math.sin(leanA) * height * 0.12;
  trunks.push(segmentGeo(x, y - 0.5, z, x + tx * 0.5, y + height * 0.55, z + tz * 0.5, 0.5, 0.34, 6));
  trunks.push(segmentGeo(x + tx * 0.5, y + height * 0.55, z + tz * 0.5, x + tx, y + height * 0.92, z + tz, 0.34, 0.16, 6));
  for (let i = 0; i < 3; i++) {
    const a = rand() * Math.PI * 2;
    const bx = x + tx + Math.cos(a) * height * 0.22;
    const bz = z + tz + Math.sin(a) * height * 0.22;
    trunks.push(segmentGeo(x + tx * 0.7, y + height * 0.68, z + tz * 0.7, bx, y + height * (0.82 + rand() * 0.1), bz, 0.16, 0.07, 5));
    const r = height * (0.24 + rand() * 0.1);
    const c1 = new THREE.IcosahedronGeometry(1, 1);
    c1.scale(r * 1.25, r * 0.62, r * 1.1);
    c1.rotateY(rand() * 6.2);
    c1.translate(bx, y + height * 0.95, bz);
    buckets.broadleaf.push(c1);
  }
}

function addGrass(buckets, x, y, z, size, rand) {
  const rot = rand() * Math.PI;
  for (let k = 0; k < 2; k++) {
    const geo = new THREE.PlaneGeometry(size * (0.6 + rand() * 0.5), size * (0.9 + rand() * 0.6));
    geo.translate(0, size * 0.4, 0);
    geo.rotateY(rot + k * Math.PI * 0.5);
    geo.translate(x, y - 0.05, z);
    buckets.grass.push(geo);
  }
}

function clearOfPath(x, z, margin) {
  const d = Math.sqrt(trailDistanceSq(x, z));
  return d > margin;
}

function clearOfPlatform(x, z) {
  for (const p of platforms) {
    if (Math.hypot(x - p.x, z - p.z) < p.r + 6) return false;
  }
  return true;
}

function mergeBucket(bucket, material, name, cast = true) {
  if (!bucket.length) return null;
  const mesh = new THREE.Mesh(mergeGeometryList(bucket), material);
  mesh.castShadow = cast;
  mesh.receiveShadow = true;
  mesh.name = name;
  return mesh;
}

export function createVegetation() {
  const root = new THREE.Group();
  root.name = 'yandang-rhyolite-forest';
  const rand = mulberry32(47121);
  const buckets = {
    deep: [], mid: [], light: [], sun: [],
    shrub: [], shrubLight: [], rock: [], rockLight: [], grass: [],
    bamboo: [], bambooLeaf: [], fern: [], moss: [], broadleaf: [],
  };
  const trunks = [];
  let pines = 0;
  let shrubs = 0;
  let rocks = 0;
  let bamboo = 0;

  for (let attempt = 0; attempt < 3200; attempt++) {
    const x = (rand() - 0.5) * 1900;
    const z = (rand() - 0.5) * 1900;
    if (Math.abs(x) > 950 || Math.abs(z) > 950) continue;
    const y = heightAt(x, z);
    if (y < 14 || y > 262) continue;
    const slope = slopeAt(x, z);
    if (slope > 2.15) continue;
    if (!clearOfPath(x, z, 4.6) || !clearOfPlatform(x, z)) continue;
    const density = fbm(x * 0.012 + 7.2, z * 0.012 - 3.1, 3);
    if (density < 0.42 && rand() > 0.38) continue;
    if (y < 42 && rand() > 0.3) continue;
    const count = 1 + (rand() * (density > 0.55 ? 4 : 2) | 0);
    for (let i = 0; i < count; i++) {
      const px = x + (rand() - 0.5) * 30;
      const pz = z + (rand() - 0.5) * 30;
      if (Math.abs(px) > 940 || Math.abs(pz) > 940) continue;
      if (!clearOfPath(px, pz, 3.4) || !clearOfPlatform(px, pz)) continue;
      const py = heightAt(px, pz);
      if (py < 12 || py > 260) continue;
      if (slopeAt(px, pz) > 2.3) continue;
      addPine(buckets, trunks, px, py, pz, 7 + rand() * 9, 2.1 + rand() * 1.8, rand);
      pines++;
    }
  }

  const heroSpots = [
    [154, 128], [148, 104], [166, 156], [116, 40], [142, 12],
    [78, -26], [40, -58], [8, -92], [-28, -128], [-58, -154],
    [-88, -186], [-120, -214], [-152, -242], [-186, -252],
    [-166, -282], [-98, -288], [-48, -320], [18, -318], [72, -288],
    [120, -248], [-230, 96], [-300, 130], [260, 90], [312, -120],
  ];
  for (let h = 0; h < heroSpots.length; h++) {
    const [hx, hz] = heroSpots[h];
    const hy = heightAt(hx, hz);
    for (let i = 0; i < 3; i++) {
      const px = hx + (rand() - 0.5) * 18;
      const pz = hz + (rand() - 0.5) * 18;
      if (!clearOfPath(px, pz, 2.8) || !clearOfPlatform(px, pz)) continue;
      const py = heightAt(px, pz);
      addPine(buckets, trunks, px, py, pz, 6.5 + rand() * 7.5, 1.9 + rand() * 1.6, rand);
      pines++;
    }
  }

  for (let i = 0; i < 1200; i++) {
    const x = (rand() - 0.5) * 1900;
    const z = (rand() - 0.5) * 1900;
    if (Math.abs(x) > 950 || Math.abs(z) > 950) continue;
    const y = heightAt(x, z);
    if (y < 10 || y > 258) continue;
    if (!clearOfPath(x, z, 2.4) || !clearOfPlatform(x, z)) continue;
    if (rand() < 0.55) {
      addShrub(buckets, x, y, z, 0.7 + rand() * 1.4, rand);
      shrubs++;
    } else {
      addRock(buckets, x, y, z, 0.9 + rand() * 2.4, rand);
      rocks++;
    }
  }

  for (let i = 0; i < 2000; i++) {
    const x = (rand() - 0.5) * 1800;
    const z = (rand() - 0.5) * 1800;
    if (!clearOfPath(x, z, 2.2)) continue;
    const y = heightAt(x, z);
    if (y < 12 || y > 254) continue;
    if (slopeAt(x, z) > 1.8 && rand() < 0.7) continue;
    addGrass(buckets, x, y, z, 0.4 + rand() * 0.7, rand);
  }

  for (const p of peaks) {
    for (let i = 0; i < 10; i++) {
      const a = rand() * Math.PI * 2;
      const d = p.r * (0.68 + rand() * 0.65);
      const x = p.x + Math.cos(a) * d;
      const z = p.z + Math.sin(a) * d;
      if (!clearOfPath(x, z, 3)) continue;
      const y = heightAt(x, z);
      if (y < 70 || y > 250) continue;
      addRock(buckets, x, y, z, 1.4 + rand() * 3.6, rand);
      rocks++;
    }
  }

  const bambooSpots = [
    [120, 398], [82, 344], [188, 310], [54, 236], [106, 176], [176, 128],
    [250, 92], [214, 12], [306, 70], [356, 180], [392, 250], [288, 316],
    [432, 108], [486, 196], [520, 314], [440, -22], [366, -6], [40, -44],
    [-72, -88], [-156, -150], [-210, -112], [20, 84], [-30, 18],
  ];
  for (const [gx, gz] of bambooSpots) {
    const gy = heightAt(gx, gz);
    if (gy < 12 || gy > 190) continue;
    addBambooGrove(buckets, gx, gy, gz, rand);
    bamboo++;
    if (rand() < 0.55) addBambooGrove(buckets, gx + (rand() - 0.5) * 16, heightAt(gx, gz + 10), gz + 10 + rand() * 8, rand);
  }

  for (let i = 0; i < 900; i++) {
    const x = (rand() - 0.5) * 1500;
    const z = (rand() - 0.5) * 1500;
    const y = heightAt(x, z);
    if (y < 12 || y > 220) continue;
    if (!clearOfPath(x, z, 2.4) || !clearOfPlatform(x, z)) continue;
    if (slopeAt(x, z) > 1.9) continue;
    addFern(buckets, x, y, z, 0.55 + rand() * 0.85, rand);
    if (rand() < 0.5) addMoss(buckets, x + (rand() - 0.5) * 2.6, y + 0.02, z + (rand() - 0.5) * 2.6, 0.4 + rand() * 1.1, rand);
  }

  const ancientSpots = [[162, 138], [98, 82], [30, -24], [-42, -118], [210, 236]];
  for (const [ax, az] of ancientSpots) {
    const ay = heightAt(ax, az);
    if (!clearOfPath(ax, az, 5)) continue;
    addBroadleaf(buckets, trunks, ax, ay, az, 15 + rand() * 10, rand);
    addMoss(buckets, ax + 2, ay + 0.04, az + 1, 1.3 + rand(), rand);
  }

  root.add(mergeBucket(trunks, mats.trunk, 'ancient-tree-trunks'));
  root.add(mergeBucket(buckets.deep, mats.pineDeep, 'pines-deep'));
  root.add(mergeBucket(buckets.mid, mats.pine, 'pines-mid'));
  root.add(mergeBucket(buckets.light, mats.pineLight, 'pines-light'));
  root.add(mergeBucket(buckets.sun, mats.pineSun, 'pines-sunlit'));
  root.add(mergeBucket(buckets.shrub, mats.shrub, 'mountain-shrub'));
  root.add(mergeBucket(buckets.shrubLight, mats.shrubLight, 'mountain-shrub-light'));
  root.add(mergeBucket(buckets.rock, mats.rock, 'talus-rock'));
  root.add(mergeBucket(buckets.rockLight, mats.rockLight, 'talus-rock-light'));
  root.add(mergeBucket(buckets.grass, mats.grass, 'ledge-grass', false));
  root.add(mergeBucket(buckets.bamboo, mats.bamboo, 'bamboo-culms'));
  root.add(mergeBucket(buckets.bambooLeaf, mats.bambooLeaf, 'bamboo-leaves', false));
  root.add(mergeBucket(buckets.fern, mats.fern, 'ferns', false));
  root.add(mergeBucket(buckets.moss, mats.moss, 'moss-cushions', false));
  root.add(mergeBucket(buckets.broadleaf, mats.pineDeep, 'ancient-broadleaf'));
  return { group: root, counts: { pines, shrubs, rocks, bamboo } };
}
