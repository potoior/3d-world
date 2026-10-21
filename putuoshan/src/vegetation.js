import * as THREE from 'three';
import { heightAt, slopeAt, fbm, trailDistanceSq, platforms, peaks, clearZones } from './terrain.js';
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
  for (const z0 of clearZones) {
    if (Math.hypot(x - z0.x, z - z0.z) < z0.r) return false;
  }
  if (Math.hypot(x - 235, z - 361) < 38) return false;
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
  root.name = 'tianzhu-pines';
  const rand = mulberry32(47121);
  const buckets = {
    deep: [], mid: [], light: [], sun: [],
    shrub: [], shrubLight: [], rock: [], rockLight: [], grass: [],
  };
  const trunks = [];
  let pines = 0;
  let shrubs = 0;
  let rocks = 0;

  for (let attempt = 0; attempt < 5000; attempt++) {
    const x = (rand() - 0.5) * 1900;
    const z = (rand() - 0.5) * 1900;
    if (Math.abs(x) > 950 || Math.abs(z) > 950) continue;
    const y = heightAt(x, z);
    if (y < 14 || y > 236) continue;
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
      if (py < 12 || py > 234) continue;
      if (slopeAt(px, pz) > 2.3) continue;
      addPine(buckets, trunks, px, py, pz, 7 + rand() * 9, 2.1 + rand() * 1.8, rand);
      pines++;
    }
  }

  const heroSpots = [
    [126, 80], [112, 22], [146, 62], [158, 58], [170, -8],
    [58, -128], [84, -178], [42, -176], [-110, -198], [-128, -258],
    [-190, -270], [-214, -210], [-262, -96], [-236, -54],
    [-378, -290], [-414, -348], [10, -382], [46, -452], [252, -300],
    [282, -372], [-470, -30], [300, 72], [-300, 150], [-180, 40],
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

  for (let i = 0; i < 1400; i++) {
    const x = (rand() - 0.5) * 1900;
    const z = (rand() - 0.5) * 1900;
    if (Math.abs(x) > 950 || Math.abs(z) > 950) continue;
    const y = heightAt(x, z);
    if (y < 10 || y > 232) continue;
    if (!clearOfPath(x, z, 2.4) || !clearOfPlatform(x, z)) continue;
    if (rand() < 0.55) {
      addShrub(buckets, x, y, z, 0.7 + rand() * 1.4, rand);
      shrubs++;
    } else {
      addRock(buckets, x, y, z, 0.9 + rand() * 2.4, rand);
      rocks++;
    }
  }

  for (let i = 0; i < 1800; i++) {
    const x = (rand() - 0.5) * 1800;
    const z = (rand() - 0.5) * 1800;
    if (!clearOfPath(x, z, 2.2)) continue;
    const y = heightAt(x, z);
    if (y < 12 || y > 226) continue;
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
      if (y < 70 || y > 225) continue;
      addRock(buckets, x, y, z, 1.4 + rand() * 3.6, rand);
      rocks++;
    }
  }

  root.add(mergeBucket(trunks, mats.trunk, 'pine-trunks'));
  root.add(mergeBucket(buckets.deep, mats.pineDeep, 'pines-deep'));
  root.add(mergeBucket(buckets.mid, mats.pine, 'pines-mid'));
  root.add(mergeBucket(buckets.light, mats.pineLight, 'pines-light'));
  root.add(mergeBucket(buckets.sun, mats.pineSun, 'pines-sunlit'));
  root.add(mergeBucket(buckets.shrub, mats.shrub, 'mountain-shrub'));
  root.add(mergeBucket(buckets.shrubLight, mats.shrubLight, 'mountain-shrub-light'));
  root.add(mergeBucket(buckets.rock, mats.rock, 'talus-rock'));
  root.add(mergeBucket(buckets.rockLight, mats.rockLight, 'talus-rock-light'));
  root.add(mergeBucket(buckets.grass, mats.grass, 'ledge-grass', false));
  return { group: root, counts: { pines, shrubs, rocks } };
}
