import * as THREE from 'three';
import { mats } from './materials.js';
import { heightAt, trailSamples } from './terrain.js';
import { spireSpecs } from './peaks.js';
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

function addBox(list, w, h, d, x, y, z, ry = 0, rx = 0, rz = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (rx) g.rotateX(rx);
  if (rz) g.rotateZ(rz);
  if (ry) g.rotateY(ry);
  g.translate(x, y, z);
  list.push(g);
  return g;
}

function addCyl(list, rt, rb, h, seg, x, y, z, rx = 0, rz = 0) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg, 1, false);
  if (rx) g.rotateX(rx);
  if (rz) g.rotateZ(rz);
  g.translate(x, y, z);
  list.push(g);
  return g;
}

function segGeo(ax, ay, az, bx, by, bz, ra, rb, seg = 5) {
  const dx = bx - ax;
  const dy = by - ay;
  const dz = bz - az;
  const len = Math.hypot(dx, dy, dz) || 1;
  const geo = new THREE.CylinderGeometry(rb, ra, len, seg, 1, false);
  geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(dx / len, dy / len, dz / len)
  ));
  geo.translate((ax + bx) * 0.5, (ay + by) * 0.5, (az + bz) * 0.5);
  return geo;
}

function addRock(list, size, x, y, z, rand, squash = 0.7) {
  const geo = new THREE.DodecahedronGeometry(size, 0);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    p.setXYZ(i, p.getX(i) * (0.72 + rand() * 0.5), p.getY(i) * squash * (0.75 + rand() * 0.5), p.getZ(i) * (0.75 + rand() * 0.45));
  }
  geo.computeVertexNormals();
  geo.rotateY(rand() * 6.2);
  geo.translate(x, y, z);
  list.push(geo);
}

function addGrassTuft(list, x, y, z, size, rand) {
  const a = rand() * Math.PI;
  for (let i = 0; i < 3; i++) {
    const blade = new THREE.PlaneGeometry(size * (0.14 + rand() * 0.1), size * (0.6 + rand() * 0.6));
    blade.translate(0, size * 0.32, 0);
    blade.rotateY(a + (i * Math.PI) / 3);
    blade.rotateZ((rand() - 0.5) * 0.4);
    blade.translate(x, y, z);
    list.push(blade);
  }
}

function needleClump(list, x, y, z, r, rand, light) {
  const geo = new THREE.ConeGeometry(r * (0.6 + rand() * 0.4), r * 0.5, 5, 1, true);
  geo.rotateX(Math.PI * 0.5 + (rand() - 0.5) * 0.42);
  geo.rotateY(rand() * 6.2);
  geo.translate(x, y, z);
  list.push(geo);
}

class Bucket {
  constructor() {
    this.map = new Map();
  }
  add(geo, mat) {
    if (!this.map.has(mat)) this.map.set(mat, []);
    this.map.get(mat).push(geo);
  }
  finish(name) {
    const group = new THREE.Group();
    group.name = name;
    for (const [mat, list] of this.map) {
      const geo = mergeGeometryList(list);
      if (!geo) continue;
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = !mat.userData?.noShadow;
      mesh.receiveShadow = true;
      group.add(mesh);
    }
    return group;
  }
}

const wetMat = new THREE.MeshStandardMaterial({
  color: 0x3f4947,
  roughness: 0.34,
  metalness: 0.08,
  transparent: false,
});

function createGraniteSkin(bucket) {
  const rand = mulberry32(51577);
  const wet = [];
  const shelves = [];
  const cracks = [];
  const moss = [];
  const grass = [];
  const scree = [];
  spireSpecs.forEach((s, si) => {
    const [cx, cz, , topY, rBottom, rTop] = s;
    const baseY = Math.max(12, heightAt(cx, cz) - 12);
    const h = Math.max(8, topY - baseY);
    const radiusAt = (f) => rBottom + (rTop - rBottom) * f;
    for (let k = 0; k < 6; k++) {
      const f = 0.18 + rand() * 0.66;
      const a = rand() * Math.PI * 2;
      const r = radiusAt(f);
      const w = 0.22 + rand() * 0.7;
      const hh = 3.5 + rand() * 14;
      const g = new THREE.BoxGeometry(0.11, hh, w);
      g.rotateZ((rand() - 0.5) * 0.07);
      g.rotateY(-a);
      g.translate(cx + Math.cos(a) * (r + 0.13), baseY + h * f, cz + Math.sin(a) * (r + 0.13));
      wet.push(g);
    }
    for (let k = 0; k < 4; k++) {
      const f = 0.2 + rand() * 0.62;
      const a = rand() * Math.PI * 2 + k * 0.7;
      const r = radiusAt(f);
      const w = 0.8 + rand() * 1.3;
      const g = new THREE.BoxGeometry(0.7 + rand() * 0.7, 0.13 + rand() * 0.1, w);
      g.rotateY(-a);
      g.translate(cx + Math.cos(a) * (r + 0.22), baseY + h * f, cz + Math.sin(a) * (r + 0.22));
      shelves.push(g);
    }
    for (let k = 0; k < 7; k++) {
      const f = 0.22 + rand() * 0.62;
      const a = rand() * Math.PI * 2;
      const r = radiusAt(f);
      const hh = 2 + rand() * 8;
      const g = new THREE.BoxGeometry(0.08, hh, 0.12 + rand() * 0.16);
      g.rotateY(-a + (rand() - 0.5) * 0.5);
      g.translate(cx + Math.cos(a) * (r + 0.17), baseY + h * f, cz + Math.sin(a) * (r + 0.17));
      cracks.push(g);
    }
    for (let k = 0; k < 5; k++) {
      const f = 0.2 + rand() * 0.58;
      const a = rand() * Math.PI * 2;
      const r = radiusAt(f);
      const m = new THREE.IcosahedronGeometry(0.55 + rand() * 1.15, 0);
      m.scale(1.5 + rand() * 0.8, 0.22, 1.1 + rand() * 0.6);
      m.rotateY(rand() * 6.28);
      m.translate(cx + Math.cos(a) * (r + 0.18), baseY + h * f + 0.12, cz + Math.sin(a) * (r + 0.18));
      moss.push(m);
    }
    for (let k = 0; k < 4; k++) {
      const f = 0.2 + rand() * 0.5;
      const a = rand() * Math.PI * 2;
      const r = radiusAt(f);
      addGrassTuft(grass, cx + Math.cos(a) * (r + 0.24), baseY + h * f + 0.1, cz + Math.sin(a) * (r + 0.24), 0.5 + rand() * 0.7, rand);
    }
    for (let k = 0; k < 9; k++) {
      const a = rand() * Math.PI * 2;
      const r = rBottom * (1.02 + rand() * 0.38);
      const x = cx + Math.cos(a) * r;
      const z = cz + Math.sin(a) * r;
      addRock(scree, 0.24 + rand() * 0.72, x, heightAt(x, z) + 0.22, z, rand, 0.62);
    }
    if (si % 3 === 0) {
      for (let k = 0; k < 3; k++) {
        const a = rand() * Math.PI * 2;
        const f = 0.3 + rand() * 0.4;
        const r = radiusAt(f);
        const x = cx + Math.cos(a) * (r + 0.4);
        const z = cz + Math.sin(a) * (r + 0.4);
        const y = baseY + h * f;
        const shrub = new THREE.IcosahedronGeometry(0.55 + rand() * 0.8, 0);
        shrub.scale(1.35, 0.72, 1.15);
        shrub.rotateY(rand() * 6.28);
        shrub.translate(x, y, z);
        bucket.add(shrub, mats.shrubLight);
      }
    }
  });
  wet.forEach((g) => bucket.add(g, wetMat));
  shelves.forEach((g) => bucket.add(g, mats.graniteDark));
  cracks.forEach((g) => bucket.add(g, mats.stoneDark));
  moss.forEach((g) => bucket.add(g, mats.shrub));
  grass.forEach((g) => bucket.add(g, mats.grass));
  scree.forEach((g) => bucket.add(g, mats.rock));
}

function createHeroPines(bucket) {
  const rand = mulberry32(88123);
  const spots = [
    [126, 80, 13.5], [112, 22, 11.5], [146, 62, 10.5], [58, -128, 12.5],
    [-110, -198, 13.8], [-190, -270, 11.8], [-236, -54, 12.2], [-262, -96, 10.8],
    [252, -300, 13.2], [300, 72, 12.4], [-378, -290, 11.4],
  ];
  spots.forEach(([x, z, h], si) => {
    const y = heightAt(x, z);
    if (y < 26 || y > 236) return;
    const leanDir = 3.55 + (rand() - 0.5) * 0.7;
    const lean = h * (0.28 + rand() * 0.2);
    const tx = Math.cos(leanDir) * lean;
    const tz = Math.sin(leanDir) * lean;
    const topX = x + tx;
    const topZ = z + tz;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + rand() * 0.4;
      const reach = 1.1 + rand() * 1.4;
      const ex = x + Math.cos(a) * reach;
      const ez = z + Math.sin(a) * reach;
      bucket.add(segGeo(x, y + 0.4, z, ex, heightAt(ex, ez) - 0.12, ez, 0.16, 0.04, 4), mats.trunk);
    }
    bucket.add(segGeo(x, y - 0.5, z, x + tx * 0.3, y + h * 0.52, z + tz * 0.3, 0.36 + h * 0.012, 0.2 + h * 0.006, 6), mats.trunk);
    bucket.add(segGeo(x + tx * 0.3, y + h * 0.52, z + tz * 0.3, topX, y + h * 0.94, topZ, 0.2 + h * 0.006, 0.075, 5), mats.trunk);
    for (let i = 0; i < 6; i++) {
      const k = i / 5;
      const cx = x + tx * (0.3 + k * 0.66);
      const cz = z + tz * (0.3 + k * 0.66);
      const cy = y + h * (0.52 + k * 0.36);
      const side = leanDir + Math.PI + (rand() - 0.5) * 1.3;
      const reach = h * (0.18 + rand() * 0.2);
      const ex = cx + Math.cos(side) * reach;
      const ez = cz + Math.sin(side) * reach;
      bucket.add(segGeo(cx, cy, cz, ex, cy - 0.2 + (rand() - 0.5) * 0.7, ez, 0.085, 0.03, 4), mats.trunk);
      for (let n = 0; n < 5; n++) {
        needleClump(bucketList(bucket, n % 3 === 0 ? mats.pineLight : n % 2 === 0 ? mats.pine : mats.pineDeep),
          ex + (rand() - 0.5) * 1.7, cy + (rand() - 0.3) * 1.1, ez + (rand() - 0.5) * 1.7,
          h * (0.11 + rand() * 0.06), rand, n % 3 === 0);
      }
    }
    for (let n = 0; n < 6; n++) {
      needleClump(bucketList(bucket, n % 2 === 0 ? mats.pineLight : mats.pineDeep),
        topX + (rand() - 0.5) * h * 0.15, y + h * (0.92 + rand() * 0.08), topZ + (rand() - 0.5) * h * 0.15,
        h * (0.1 + rand() * 0.05), rand, n % 2 === 0);
    }
    if (si % 2 === 0) {
      const rock = [];
      addRock(rock, 1.1 + rand() * 1.3, x + 0.8, y + 0.2, z + 0.6, rand, 0.5);
      rock.forEach((g) => bucket.add(g, mats.rockLight));
    }
  });
}

function bucketList(bucket, mat) {
  if (!bucket.map.has(mat)) bucket.map.set(mat, []);
  return bucket.map.get(mat);
}

function frameAt(i) {
  const n = trailSamples.length;
  const s = trailSamples[Math.max(0, Math.min(n - 1, i))];
  const a = trailSamples[Math.max(0, i - 1)];
  const b = trailSamples[Math.min(n - 1, i + 1)];
  let tx = b.x - a.x;
  let tz = b.z - a.z;
  const len = Math.hypot(tx, tz) || 1;
  tx /= len;
  tz /= len;
  return { s, tx, tz, nx: -tz, nz: tx, yaw: Math.atan2(tx, tz) };
}

function chainSpan(list, ax, ay, az, bx, by, bz, sag) {
  const steps = 4;
  let px = ax;
  let py = ay;
  let pz = az;
  for (let i = 1; i <= steps; i++) {
    const k = i / steps;
    const nx = ax + (bx - ax) * k;
    const nz = az + (bz - az) * k;
    const ny = ay + (by - ay) * k - Math.sin(k * Math.PI) * sag;
    list.push(segGeo(px, py, pz, nx, ny, nz, 0.034, 0.034, 4));
    px = nx;
    py = ny;
    pz = nz;
  }
}

function createTrailPolish(bucket) {
  const rand = mulberry32(73321);
  const grooves = [];
  const brackets = [];
  const drains = [];
  const markers = [];
  const posts = [];
  const boards = [];
  const ledger = [];
  const ledchains = [];
  const n = trailSamples.length;
  for (let i = 12; i < n - 12; i += 6) {
    const f = frameAt(i);
    const g = frameAt(i + 1);
    if (g.s.y - f.s.y < 0.08) continue;
    const w = Math.max(1.8, f.s.width * 0.8);
    addBox(grooves, w, 0.025, 0.055, f.s.x, f.s.y + 0.235, f.s.z, f.yaw);
    addBox(grooves, w * 0.72, 0.022, 0.045, f.s.x, f.s.y + 0.28, f.s.z + 0.18, f.yaw);
  }
  for (let i = 10; i < n - 10; i += 8) {
    const f = frameAt(i);
    for (const side of [1, -1]) {
      const x = f.s.x + f.nx * side * (f.s.width * 0.5 + 0.18);
      const z = f.s.z + f.nz * side * (f.s.width * 0.5 + 0.18);
      addBox(brackets, 0.32, 0.3, 0.08, x, f.s.y + 1.02, z, f.yaw);
      const ring = new THREE.TorusGeometry(0.07, 0.018, 4, 8);
      ring.rotateY(f.yaw);
      ring.translate(x, f.s.y + 1.14, z);
      brackets.push(ring);
    }
  }
  for (let i = 20; i < n - 20; i += 12) {
    const f = frameAt(i);
    const side = i % 2 ? 1 : -1;
    const x = f.s.x + f.nx * side * (f.s.width * 0.5 + 0.12);
    const z = f.s.z + f.nz * side * (f.s.width * 0.5 + 0.12);
    addBox(drains, 0.12, 0.045, 1.5, x, f.s.y + 0.06, z, f.yaw);
  }
  for (const idx of [70, 140, 210, 270]) {
    const f = frameAt(idx);
    const side = idx % 2 ? -1 : 1;
    const x = f.s.x + f.nx * side * (f.s.width * 0.5 + 0.9);
    const z = f.s.z + f.nz * side * (f.s.width * 0.5 + 0.9);
    addBox(markers, 0.3, 0.9, 0.22, x, f.s.y + 0.46, z, f.yaw);
    addBox(markers, 0.34, 0.12, 0.26, x, f.s.y + 0.96, z, f.yaw);
    addBox(grooves, 0.32, 0.06, 0.24, x, f.s.y + 0.72, z, f.yaw);
  }
  for (const idx of [100, 225]) {
    const f = frameAt(idx);
    const side = idx % 2 ? 1 : -1;
    const x = f.s.x + f.nx * side * (f.s.width * 0.5 + 1.7);
    const z = f.s.z + f.nz * side * (f.s.width * 0.5 + 1.7);
    addBox(posts, 0.15, 2.2, 0.15, x - f.tx * 0.9, f.s.y + 1.1, z - f.tz * 0.9, f.yaw);
    addBox(posts, 0.15, 2.2, 0.15, x + f.tx * 0.9, f.s.y + 1.1, z + f.tz * 0.9, f.yaw);
    addBox(boards, 1.9, 0.82, 0.12, x, f.s.y + 1.92, z, f.yaw + Math.PI * 0.5);
    addBox(boards, 1.35, 0.56, 0.1, x, f.s.y + 2.55, z, f.yaw + Math.PI * 0.5);
  }
  const f = frameAt(154);
  const side = -1;
  const cx = f.s.x + f.nx * side * (f.s.width * 0.5 + 3.0);
  const cz = f.s.z + f.nz * side * (f.s.width * 0.5 + 3.0);
  const cy = f.s.y + 0.04;
  const deck = new THREE.CylinderGeometry(3.0, 3.25, 0.32, 18);
  deck.translate(cx, cy - 0.16, cz);
  ledger.push(deck);
  for (let i = 0; i < 9; i++) {
    const a = Math.atan2(f.nz * side, f.nx * side) - 1.2 + (i / 8) * 2.4;
    const px = cx + Math.cos(a) * 3.0;
    const pz = cz + Math.sin(a) * 3.0;
    addCyl(ledger, 0.065, 0.09, 1.15, 5, px, cy + 0.56, pz);
    if (i < 8) {
      const b = Math.atan2(f.nz * side, f.nx * side) - 1.2 + ((i + 1) / 8) * 2.4;
      chainSpan(ledchains, px, cy + 1.08, pz, cx + Math.cos(b) * 3.0, cy + 1.08, cz + Math.sin(b) * 3.0, 0.18);
    }
  }
  addBox(boards, 1.6, 0.68, 0.12, cx + f.nx * side * 2.4, cy + 1.7, cz + f.nz * side * 2.4, f.yaw + Math.PI * 0.5);
  addBox(posts, 0.13, 1.9, 0.13, cx + f.nx * side * 2.4, cy + 0.9, cz + f.nz * side * 2.4, f.yaw);
  addBox(ledger, 2.0, 0.16, 0.5, cx - f.nx * side * 1.7, cy + 0.56, cz - f.nz * side * 1.7, f.yaw);
  grooves.forEach((g) => bucket.add(g, mats.stoneDark));
  brackets.forEach((g) => bucket.add(g, mats.iron));
  drains.forEach((g) => bucket.add(g, mats.stoneDark));
  markers.forEach((g) => bucket.add(g, mats.stone));
  posts.forEach((g) => bucket.add(g, mats.wood));
  boards.forEach((g) => bucket.add(g, mats.sign));
  ledger.forEach((g) => bucket.add(g, mats.deck));
  ledchains.forEach((g) => bucket.add(g, mats.iron));
}

export function createHuangshanFinalStatic() {
  const bucket = new Bucket();
  createGraniteSkin(bucket);
  createHeroPines(bucket);
  createTrailPolish(bucket);
  return bucket.finish('tianzhu-final-static');
}
