import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mats } from './materials.js';
import { heightAt, trailSamples, platforms, peaks } from './terrain.js';
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
}

function addCyl(list, rt, rb, h, seg, x, y, z, rx = 0, rz = 0) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg, 1, false);
  if (rx) g.rotateX(rx);
  if (rz) g.rotateZ(rz);
  g.translate(x, y, z);
  list.push(g);
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

function addRock(list, size, x, y, z, seed, squash = 0.8) {
  const geo = new THREE.DodecahedronGeometry(size, 0);
  const p = geo.attributes.position;
  const rand = mulberry32(seed);
  for (let i = 0; i < p.count; i++) {
    p.setXYZ(i, p.getX(i) * (0.72 + rand() * 0.5), p.getY(i) * squash * (0.8 + rand() * 0.4), p.getZ(i) * (0.75 + rand() * 0.45));
  }
  geo.computeVertexNormals();
  geo.rotateY(rand() * 6.2);
  geo.translate(x, y, z);
  list.push(geo);
}

class Bucket {
  constructor() { this.map = new Map(); }
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
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    }
    return group;
  }
}

function needleClump(bucket, x, y, z, r, rand, light) {
  const geo = new THREE.ConeGeometry(r * (0.55 + rand() * 0.45), r * 0.5, 5, 1, true);
  geo.rotateX(Math.PI * 0.5 + (rand() - 0.5) * 0.45);
  geo.rotateY(rand() * 6.2);
  geo.translate(x, y, z);
  bucket.add(geo, light ? mats.pineLight : (rand() < 0.35 ? mats.pineDeep : mats.pine));
}

function windPine(bucket, x, z, h, rand, leanDir = 3.55) {
  const y = heightAt(x, z);
  if (y < 34 || y > 232) return;
  const lean = h * (0.24 + rand() * 0.3);
  const tx = Math.cos(leanDir) * lean;
  const tz = Math.sin(leanDir) * lean;
  const topX = x + tx;
  const topZ = z + tz;
  bucket.add(segGeo(x, y - 0.5, z, x + tx * 0.28, y + h * 0.48, z + tz * 0.28, 0.3 + h * 0.011, 0.19 + h * 0.005), mats.trunk);
  bucket.add(segGeo(x + tx * 0.28, y + h * 0.48, z + tz * 0.28, topX, y + h * 0.9, topZ, 0.18 + h * 0.005, 0.07, 4), mats.trunk);
  for (let i = 0; i < 4; i++) {
    const a = leanDir + Math.PI + (rand() - 0.5) * 1.2;
    const reach = 0.8 + rand() * 1.5;
    const ex = x + Math.cos(a) * reach;
    const ez = z + Math.sin(a) * reach;
    bucket.add(segGeo(x + tx * 0.15, y + 0.2, z + tz * 0.15, ex, heightAt(ex, ez) - 0.1, ez, 0.09, 0.035, 4), mats.trunk);
  }
  const branches = 5;
  for (let i = 0; i < branches; i++) {
    const k = i / (branches - 1);
    const cx = x + tx * (0.38 + k * 0.58);
    const cz = z + tz * (0.38 + k * 0.58);
    const cy = y + h * (0.52 + k * 0.34);
    const side = leanDir + (rand() - 0.5) * 1.6;
    const reach = h * (0.2 + rand() * 0.16);
    const ex = cx + Math.cos(side) * reach;
    const ez = cz + Math.sin(side) * reach;
    bucket.add(segGeo(cx, cy, cz, ex, cy + (rand() - 0.5) * 0.5, ez, 0.07, 0.028, 4), mats.trunk);
    for (let n = 0; n < 4; n++) {
      needleClump(bucket, ex + (rand() - 0.5) * 1.1, cy + (rand() - 0.2) * 0.9, ez + (rand() - 0.5) * 1.1, h * (0.12 + rand() * 0.08), rand, rand() < 0.4);
    }
    if (i === 1 || i === 3) {
      const dx = ex + Math.cos(side + 0.5) * reach * 0.5;
      const dz = ez + Math.sin(side + 0.5) * reach * 0.5;
      bucket.add(segGeo(ex, cy, ez, dx, cy - 0.4, dz, 0.045, 0.015, 4), mats.trunk);
    }
  }
  for (let n = 0; n < 5; n++) {
    needleClump(bucket, topX + (rand() - 0.5) * h * 0.12, y + h * (0.92 + rand() * 0.06), topZ + (rand() - 0.5) * h * 0.12, h * 0.12, rand, rand() < 0.5);
  }
}

function createGraniteRefine(bucket) {
  const rand = mulberry32(8123);
  spireSpecs.forEach((s, si) => {
    const [cx, cz, base, topY, rBottom, rTop] = s;
    const baseY = Math.max(12, heightAt(cx, cz) - 12);
    const h = Math.max(8, topY - baseY);
    for (let b = 0; b < 4; b++) {
      const f = 0.16 + b * 0.19 + rand() * 0.05;
      const y = baseY + h * f;
      const r = rBottom + (rTop - rBottom) * f;
      const a0 = rand() * Math.PI * 2;
      for (let k = 0; k < 3; k++) {
        const a = a0 + k * 2.09;
        const w = r * (0.7 + rand() * 0.5);
        addBox(bucketList(bucket, k % 2 ? mats.graniteDark : mats.graniteLight), w, 0.16 + rand() * 0.2, 0.42 + rand() * 0.3,
          cx + Math.cos(a) * (r + 0.15), y, cz + Math.sin(a) * (r + 0.15), -a + Math.PI / 2, 0, (rand() - 0.5) * 0.06);
      }
    }
    for (let c = 0; c < 5; c++) {
      const a = rand() * Math.PI * 2;
      const f = 0.25 + rand() * 0.6;
      const y = baseY + h * f;
      const r = rBottom + (rTop - rBottom) * f;
      const ch = h * (0.08 + rand() * 0.18);
      addBox(bucketList(bucket, c % 2 ? mats.graniteDark : mats.stoneDark), 0.1 + rand() * 0.12, ch, 0.16,
        cx + Math.cos(a) * (r + 0.2), y, cz + Math.sin(a) * (r + 0.2), -a + Math.PI / 2, 0, (rand() - 0.5) * 0.06);
    }
    for (let w = 0; w < 3; w++) {
      const a = rand() * Math.PI * 2;
      const f = 0.35 + w * 0.18;
      const y = baseY + h * f;
      const r = rBottom + (rTop - rBottom) * f;
      const wh = h * (0.18 + rand() * 0.22);
      addBox(bucketList(bucket, mats.graniteDark), 0.18 + rand() * 0.14, wh, 0.1,
        cx + Math.cos(a) * (r + 0.12), y - wh * 0.3, cz + Math.sin(a) * (r + 0.12), -a + Math.PI / 2, 0, 0);
    }
    for (let m = 0; m < 3; m++) {
      const a = rand() * Math.PI * 2;
      const f = 0.24 + rand() * 0.5;
      const r = rBottom + (rTop - rBottom) * f;
      const x = cx + Math.cos(a) * (r + 0.3);
      const z = cz + Math.sin(a) * (r + 0.3);
      const y = baseY + h * f;
      const moss = new THREE.IcosahedronGeometry(0.7 + rand() * 1.5, 0);
      moss.scale(1.6 + rand(), 0.24, 1.1 + rand());
      moss.rotateY(rand() * 6.28);
      moss.translate(x, y + 0.15, z);
      bucket.add(moss, m % 2 ? mats.shrubLight : mats.shrub);
      if (m === 0) needleClump(bucket, x, y + 0.4, z, 0.55 + rand() * 0.5, rand, true);
    }
    if (si % 2 === 0) {
      for (let r = 0; r < 6; r++) {
        const a = rand() * Math.PI * 2;
        const rr = rBottom * (1.02 + rand() * 0.55);
        const x = cx + Math.cos(a) * rr;
        const z = cz + Math.sin(a) * rr;
        const rocks = [];
        addRock(rocks, 0.7 + rand() * 2.4, x, heightAt(x, z) + 0.2, z, 9000 + si * 10 + r, 0.62);
        rocks.forEach((g) => bucket.add(g, r % 2 ? mats.rock : mats.rockLight));
      }
    }
  });
  for (const p of peaks) {
    for (let i = 0; i < 9; i++) {
      const a = rand() * Math.PI * 2;
      const rr = p.r * (0.86 + rand() * 0.42);
      const x = p.x + Math.cos(a) * rr;
      const z = p.z + Math.sin(a) * rr;
      const y = heightAt(x, z);
      if (y < 45 || y > 226) continue;
      const rocks = [];
      addRock(rocks, 0.9 + rand() * 2.8, x, y + 0.25, z, 9500 + i, 0.58);
      rocks.forEach((g) => bucket.add(g, i % 2 ? mats.rock : mats.graniteLight));
    }
  }
  const pineRand = mulberry32(9921);
  for (const s of spireSpecs) {
    const count = 1 + (pineRand() * 3 | 0);
    for (let i = 0; i < count; i++) {
      const a = pineRand() * Math.PI * 2;
      const rr = s[4] * (0.62 + pineRand() * 0.5);
      const x = s[0] + Math.cos(a) * rr;
      const z = s[1] + Math.sin(a) * rr;
      windPine(bucket, x, z, 3.2 + pineRand() * 4.8, pineRand, 3.55 + (pineRand() - 0.5) * 0.5);
    }
  }
  for (const p of peaks) {
    for (let i = 0; i < 4; i++) {
      const a = pineRand() * Math.PI * 2;
      const rr = p.r * (0.55 + pineRand() * 0.32);
      const x = p.x + Math.cos(a) * rr;
      const z = p.z + Math.sin(a) * rr;
      windPine(bucket, x, z, 3.4 + pineRand() * 5.4, pineRand);
    }
  }
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

function chainSpan(bucket, ax, ay, az, bx, by, bz, sag = 0.28) {
  const steps = 4;
  let px = ax;
  let py = ay;
  let pz = az;
  for (let i = 1; i <= steps; i++) {
    const k = i / steps;
    const nx = ax + (bx - ax) * k;
    const nz = az + (bz - az) * k;
    const ny = ay + (by - ay) * k - Math.sin(k * Math.PI) * sag;
    bucket.add(segGeo(px, py, pz, nx, ny, nz, 0.035, 0.035, 4), mats.iron);
    px = nx;
    py = ny;
    pz = nz;
  }
}

function addHiker(bucket, x, y, z, yaw, seed) {
  const s = 0.9 + (seed % 5) * 0.035;
  const legs = [[-0.09, 0.26], [0.09, 0.22]];
  for (const [ox, hh] of legs) {
    addBox(bucketList(bucket, mats.iron), 0.12, 0.5 * s, 0.14, x + ox * s, y + hh * s, z, yaw);
  }
  addBox(bucketList(bucket, seed % 3 === 0 ? mats.ribbon : mats.pineDeep), 0.36 * s, 0.64 * s, 0.24 * s, x, y + 1.16 * s, z, yaw, 0, 0.04);
  const head = new THREE.IcosahedronGeometry(0.16 * s, 0);
  head.translate(x, y + 1.6 * s, z);
  bucket.add(head, mats.rockLight);
  addBox(bucketList(bucket, mats.ribbon), 0.28 * s, 0.4 * s, 0.18 * s, x - Math.sin(yaw) * 0.2 * s, y + 1.2 * s, z - Math.cos(yaw) * 0.2 * s, yaw);
  addBox(bucketList(bucket, mats.wood), 0.06 * s, 0.95 * s, 0.06 * s, x + Math.cos(yaw) * 0.34 * s, y + 0.75 * s, z - Math.sin(yaw) * 0.34 * s, yaw, 0, 0.18);
}

function addRefinePlatform(bucket, idx, side) {
  const f = frameAt(idx);
  const s = f.s;
  const off = s.width * 0.5 + 4.6;
  const cx = s.x + f.nx * side * off;
  const cz = s.z + f.nz * side * off;
  const cy = Math.max(s.y, heightAt(cx, cz));
  addCyl(bucketList(bucket, mats.stone), 4.6, 5.0, 0.38, 18, cx, cy + 0.19, cz);
  for (let i = 0; i < 11; i++) {
    const a = Math.atan2(f.nz * side, f.nx * side) - 1.35 + (i / 10) * 2.7;
    const px = cx + Math.cos(a) * 4.6;
    const pz = cz + Math.sin(a) * 4.6;
    addCyl(bucketList(bucket, mats.wood), 0.07, 0.1, 1.2, 5, px, cy + 0.98, pz);
    if (i < 10) {
      const b = a + 0.27;
      chainSpan(bucket, px, cy + 1.52, pz, cx + Math.cos(b) * 4.6, cy + 1.52, cz + Math.sin(b) * 4.6, 0.22);
    }
  }
  addBox(bucketList(bucket, mats.wood), 1.9, 0.12, 0.46, cx - f.nx * side * 2.1, cy + 0.74, cz - f.nz * side * 2.1, f.yaw);
  addBox(bucketList(bucket, mats.sign), 1.5, 0.82, 0.12, cx + f.nx * side * 2.0, cy + 1.85, cz + f.nz * side * 2.0, f.yaw + Math.PI * 0.5);
  addBox(bucketList(bucket, mats.wood), 0.14, 2.2, 0.14, cx + f.nx * side * 2.0, cy + 1.1, cz + f.nz * side * 2.0, f.yaw);
  for (let i = 0; i < 3; i++) {
    addHiker(bucket, cx + (i - 1) * 1.1, cy + 0.36, cz + (i % 2) * 0.8, f.yaw + i * 0.6, 40 + i + idx);
  }
}

function addMonkeys(bucket, idx) {
  const f = frameAt(idx);
  const side = 1;
  const bx = f.s.x + f.nx * side * (f.s.width * 0.5 + 1.6);
  const bz = f.s.z + f.nz * side * (f.s.width * 0.5 + 1.6);
  const by = heightAt(bx, bz);
  for (let i = 0; i < 3; i++) {
    const x = bx + (i - 1) * 0.9;
    const z = bz + (i % 2) * 0.7;
    const y = Math.max(by, heightAt(x, z)) + 0.18;
    const body = new THREE.SphereGeometry(0.24, 7, 5);
    body.scale(0.9, 1.15, 0.8);
    body.translate(x, y + 0.5, z);
    bucket.add(body, mats.trunk);
    const head = new THREE.SphereGeometry(0.16, 7, 5);
    head.translate(x, y + 0.86, z + 0.05);
    bucket.add(head, mats.wood);
    bucket.add(segGeo(x, y + 0.62, z - 0.18, x + 0.55, y + 0.9, z - 0.5, 0.035, 0.02, 4), mats.wood);
    for (const [ox, oz] of [[-0.17, -0.12], [0.17, -0.12], [-0.13, 0.14], [0.13, 0.14]]) {
      addCyl(bucketList(bucket, mats.wood), 0.035, 0.045, 0.42, 4, x + ox, y + 0.2, z + oz);
    }
  }
}

function createTrailRefine(bucket) {
  const rand = mulberry32(7331);
  const n = trailSamples.length;
  for (let i = 10; i < n - 10; i += 5) {
    const f = frameAt(i);
    const s = f.s;
    const g = frameAt(i + 1);
    if (g.s.y - s.y > 0.1) {
      addBox(bucketList(bucket, mats.stoneDark), Math.max(2.0, s.width * 0.84), 0.14, 0.5, s.x, s.y + 0.2, s.z, f.yaw);
    }
    if (i % 15 === 0) {
      addBox(bucketList(bucket, mats.stone), 0.34, 0.22, 0.8, s.x + f.nx * (s.width * 0.5 - 0.2), s.y + 0.24, s.z + f.nz * (s.width * 0.5 - 0.2), f.yaw);
      addBox(bucketList(bucket, mats.stone), 0.34, 0.22, 0.8, s.x - f.nx * (s.width * 0.5 - 0.2), s.y + 0.24, s.z - f.nz * (s.width * 0.5 - 0.2), f.yaw);
    }
  }
  for (const [idx, side] of [[62, 1], [198, -1]]) addRefinePlatform(bucket, idx, side);
  addMonkeys(bucket, 84);
  for (const idx of [26, 118, 236, 280]) {
    const f = frameAt(idx);
    const side = idx % 2 ? 1 : -1;
    const x = f.s.x + f.nx * side * (f.s.width * 0.5 + 0.9);
    const z = f.s.z + f.nz * side * (f.s.width * 0.5 + 0.9);
    const y = f.s.y;
    addBox(bucketList(bucket, mats.wood), 0.16, 2.4, 0.16, x - f.tx * 0.8, y + 1.2, z - f.tz * 0.8, f.yaw);
    addBox(bucketList(bucket, mats.wood), 0.16, 2.4, 0.16, x + f.tx * 0.8, y + 1.2, z + f.tz * 0.8, f.yaw);
    addBox(bucketList(bucket, mats.sign), 1.85, 0.92, 0.13, x, y + 2.0, z, f.yaw + Math.PI * 0.5);
    addBox(bucketList(bucket, mats.stoneDark), 0.7, 0.55, 0.55, x + f.tx * 1.4, y + 0.28, z + f.tz * 1.4, f.yaw);
  }
  for (const idx of [48, 152, 262]) {
    const f = frameAt(idx);
    const side = idx % 2 ? -1 : 1;
    const x = f.s.x + f.nx * side * (f.s.width * 0.5 + 1.1);
    const z = f.s.z + f.nz * side * (f.s.width * 0.5 + 1.1);
    addHiker(bucket, x, f.s.y + 0.16, z, f.yaw, 80 + idx);
  }
}

export function createHuangshanRefineStatic() {
  const bucket = new Bucket();
  createGraniteRefine(bucket);
  createTrailRefine(bucket);
  const gm = platforms[1];
  const fx = -247.5;
  const fz = -66;
  const fy = heightAt(fx, fz);
  for (const [x, z, y] of [[gm.x - 16, gm.z - 4, gm.y], [gm.x + 15, gm.z + 4, gm.y], [fx - 3, fz + 11, fy], [fx + 4, fz - 13, heightAt(fx + 4, fz - 13)]]) {
    addCyl(bucketList(bucket, mats.wood), 0.09, 0.12, 4.4, 6, x, y + 2.2, z);
    addBox(bucketList(bucket, mats.stoneDark), 0.5, 0.24, 0.5, x, y + 0.12, z);
  }
  return bucket.finish('huangshan-second-detail');
}

function birdGeometry() {
  const body = new THREE.SphereGeometry(0.12, 6, 4);
  body.scale(0.65, 0.55, 1.7);
  const left = new THREE.BoxGeometry(0.85, 0.03, 0.18);
  left.rotateZ(0.26);
  left.translate(-0.4, 0.04, 0);
  const right = new THREE.BoxGeometry(0.85, 0.03, 0.18);
  right.rotateZ(-0.26);
  right.translate(0.4, 0.04, 0);
  return mergeGeometries([body, left, right], false);
}

function hikerGeometry() {
  const parts = [];
  const add = (g) => parts.push(g);
  const body = new THREE.BoxGeometry(0.34, 0.62, 0.24);
  body.translate(0, 1.15, 0);
  add(body);
  const pack = new THREE.BoxGeometry(0.28, 0.42, 0.2);
  pack.translate(0, 1.2, -0.21);
  add(pack);
  const head = new THREE.IcosahedronGeometry(0.16, 0);
  head.translate(0, 1.62, 0);
  add(head);
  for (const s of [-1, 1]) {
    const leg = new THREE.BoxGeometry(0.12, 0.52, 0.14);
    leg.translate(s * 0.09, 0.27, 0);
    add(leg);
  }
  const pole = new THREE.CylinderGeometry(0.025, 0.025, 1.0, 4);
  pole.rotateZ(0.18);
  pole.translate(0.34, 0.72, 0.05);
  add(pole);
  return mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)), false);
}

export function createHuangshanRefineLife() {
  const group = new THREE.Group();
  group.name = 'huangshan-second-life';
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  const rand = mulberry32(6451);

  const mistGeo = new THREE.PlaneGeometry(1, 1);
  const mistMat = new THREE.MeshBasicMaterial({
    map: mats.mist.map, color: 0xe4edeb, transparent: true, opacity: 0.3,
    depthWrite: false, side: THREE.DoubleSide, fog: true, toneMapped: true,
  });
  const mistCount = 26;
  const mist = new THREE.InstancedMesh(mistGeo, mistMat, mistCount);
  mist.frustumCulled = false;
  mist.renderOrder = 3;
  const mistData = [];
  for (let i = 0; i < mistCount; i++) {
    const a = rand() * Math.PI * 2;
    const d = 120 + rand() * 620;
    mistData.push({
      x: Math.cos(a) * d, z: Math.sin(a) * d - 220, y: 24 + rand() * 54,
      w: 180 + rand() * 340, h: 42 + rand() * 110, yaw: rand() * 3.14,
      drift: 3 + rand() * 7, phase: rand() * 6.28,
    });
  }
  group.add(mist);

  const cloudGeo = new THREE.PlaneGeometry(1, 1);
  const cloudMat = new THREE.MeshBasicMaterial({
    map: mats.cloud.map, color: 0xf1f5f2, transparent: true, opacity: 0.34,
    depthWrite: false, side: THREE.DoubleSide, fog: true, toneMapped: true,
  });
  const cloudCount = 16;
  const clouds = new THREE.InstancedMesh(cloudGeo, cloudMat, cloudCount);
  clouds.frustumCulled = false;
  clouds.renderOrder = 2;
  const cloudData = [];
  for (let i = 0; i < cloudCount; i++) {
    cloudData.push({
      x: -260 + rand() * 620, z: -760 + rand() * 900, y: 42 + rand() * 74,
      w: 320 + rand() * 520, h: 180 + rand() * 320, rot: rand() * 3.14,
      drift: 2 + rand() * 5, phase: rand() * 6.28,
    });
  }
  group.add(clouds);

  const rayMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(0xffd9a0) } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec4 p = instanceMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * modelViewMatrix * p;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColor;
      varying vec2 vUv;
      void main() {
        float x = abs(vUv.x - 0.5) * 2.0;
        float edge = smoothstep(1.0, 0.05, x);
        float y = smoothstep(0.0, 0.35, vUv.y) * smoothstep(1.0, 0.55, vUv.y);
        float pulse = 0.72 + 0.28 * sin(uTime * 0.35 + vUv.y * 3.0);
        gl_FragColor = vec4(uColor, edge * y * 0.16 * pulse);
      }
    `,
  });
  const rayCount = 11;
  const rays = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), rayMat, rayCount);
  rays.frustumCulled = false;
  rays.renderOrder = 4;
  const rayData = [];
  for (let i = 0; i < rayCount; i++) {
    rayData.push({ x: 520 + (i - 5) * 26, y: 250 + (i % 3) * 22, z: 60 + (i % 4) * 20, w: 16 + (i % 4) * 9, h: 230 + (i % 5) * 44, sway: 0.1 + (i % 3) * 0.05 });
  }
  group.add(rays);

  const flagGeo = new THREE.PlaneGeometry(0.5, 0.66);
  flagGeo.translate(0, -0.33, 0);
  const flagMat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: true, fog: true });
  const flagRuns = [
    { a: [-166, 204.6, -230], b: [-134, 205.0, -222], n: 22 },
    { a: [-250.5, heightAt(-250.5, -55) + 4.2, -55], b: [-243.5, heightAt(-243.5, -79) + 4.2, -79], n: 16 },
  ];
  const flags = [];
  for (const run of flagRuns) {
    for (let i = 0; i < run.n; i++) {
      const t = (i + 0.5) / run.n;
      flags.push({
        x: run.a[0] + (run.b[0] - run.a[0]) * t,
        y: run.a[1] + (run.b[1] - run.a[1]) * t - Math.sin(t * Math.PI) * 0.5,
        z: run.a[2] + (run.b[2] - run.a[2]) * t,
        phase: i * 0.55,
        yaw: Math.atan2(run.b[0] - run.a[0], run.b[2] - run.a[2]) + Math.PI * 0.5,
      });
    }
  }
  const flagMesh = new THREE.InstancedMesh(flagGeo, flagMat, flags.length);
  flagMesh.frustumCulled = false;
  flags.forEach((f, i) => {
    const c = [0xb63a2b, 0xe0a12c, 0x2e5f86, 0x40704a, 0xe8e2d2][i % 5];
    flagMesh.setColorAt(i, color.setHex(c));
  });
  flagMesh.instanceColor.needsUpdate = true;
  group.add(flagMesh);

  const hikerCount = 7;
  const hikers = new THREE.InstancedMesh(hikerGeometry(), mats.pineDeep, hikerCount);
  hikers.frustumCulled = false;
  const hikerData = [];
  for (let i = 0; i < hikerCount; i++) {
    hikerData.push({ t: (i / hikerCount + 0.12) % 1, speed: 0.0052 + (i % 3) * 0.0009, side: (i % 2 ? 1 : -1) * 0.22, scale: 0.86 + (i % 4) * 0.05 });
    color.setHex([0xb04a38, 0x33566e, 0x3f6244, 0x746044][i % 4]);
    hikers.setColorAt(i, color);
  }
  hikers.instanceColor.needsUpdate = true;
  group.add(hikers);

  const birdCount = 22;
  const birds = new THREE.InstancedMesh(birdGeometry(), mats.iron, birdCount);
  birds.frustumCulled = false;
  const birdData = [];
  for (let i = 0; i < birdCount; i++) {
    birdData.push({
      cx: 190 + (i % 4) * 90, cz: -80 - (i % 5) * 70, r: 60 + (i % 6) * 24,
      y: 140 + (i % 5) * 16, speed: 0.035 + (i % 4) * 0.008, phase: i * 0.97,
      size: 0.9 + (i % 4) * 0.2,
    });
  }
  group.add(birds);

  function update(time) {
    mistData.forEach((m, i) => {
      const x = m.x + Math.sin(time * 0.018 * m.drift + m.phase) * 26;
      dummy.position.set(x, m.y + Math.sin(time * 0.05 + m.phase) * 1.4, m.z);
      dummy.rotation.set(-0.28, m.yaw, 0);
      dummy.scale.set(m.w, m.h, 1);
      dummy.updateMatrix();
      mist.setMatrixAt(i, dummy.matrix);
    });
    mist.instanceMatrix.needsUpdate = true;
    cloudData.forEach((m, i) => {
      const x = m.x + Math.sin(time * 0.012 * m.drift + m.phase) * 34;
      dummy.position.set(x, m.y, m.z);
      dummy.rotation.set(-Math.PI / 2, 0, m.rot);
      dummy.scale.set(m.w, m.h, 1);
      dummy.updateMatrix();
      clouds.setMatrixAt(i, dummy.matrix);
    });
    clouds.instanceMatrix.needsUpdate = true;

    rayMat.uniforms.uTime.value = time;
    rayData.forEach((r, i) => {
      dummy.position.set(r.x, r.y, r.z);
      dummy.rotation.set(0, -1.94 + Math.sin(time * 0.07 + i) * 0.03, Math.sin(time * 0.12 + i) * r.sway);
      dummy.scale.set(r.w, r.h, 1);
      dummy.updateMatrix();
      rays.setMatrixAt(i, dummy.matrix);
    });
    rays.instanceMatrix.needsUpdate = true;

    flags.forEach((f, i) => {
      dummy.position.set(f.x, f.y, f.z);
      dummy.rotation.set(Math.sin(time * 2.6 + f.phase) * 0.28, f.yaw, Math.cos(time * 2.1 + f.phase) * 0.18);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      flagMesh.setMatrixAt(i, dummy.matrix);
    });
    flagMesh.instanceMatrix.needsUpdate = true;

    hikerData.forEach((h, i) => {
      const t = (h.t + time * h.speed) % 1;
      const fi = t * (trailSamples.length - 1);
      const i0 = Math.floor(fi);
      const s = trailSamples[i0];
      const s2 = trailSamples[Math.min(trailSamples.length - 1, i0 + 1)];
      let tx = s2.x - s.x;
      let tz = s2.z - s.z;
      const len = Math.hypot(tx, tz) || 1;
      tx /= len;
      tz /= len;
      const nx = -tz;
      const nz = tx;
      dummy.position.set(s.x + nx * h.side + Math.sin(time * 1.4 + i) * 0.06, s.y + 0.16 + Math.sin(time * 3.4 + i) * 0.04, s.z + nz * h.side);
      dummy.rotation.set(0, Math.atan2(tx, tz), Math.sin(time * 3.4 + i) * 0.03);
      dummy.scale.setScalar(h.scale);
      dummy.updateMatrix();
      hikers.setMatrixAt(i, dummy.matrix);
    });
    hikers.instanceMatrix.needsUpdate = true;

    birdData.forEach((b, i) => {
      const t = time * b.speed + b.phase;
      const x = b.cx + Math.cos(t) * b.r;
      const z = b.cz + Math.sin(t) * b.r * 0.7;
      const y = b.y + Math.sin(time * 0.4 + b.phase) * 3.2;
      const dx = -Math.sin(t) * b.r;
      const dz = Math.cos(t) * b.r * 0.7;
      dummy.position.set(x, y, z);
      dummy.rotation.set(Math.sin(time * 2.0 + i) * 0.22, Math.atan2(dx, dz), 0);
      dummy.scale.setScalar(b.size);
      dummy.updateMatrix();
      birds.setMatrixAt(i, dummy.matrix);
    });
    birds.instanceMatrix.needsUpdate = true;
  }

  update(0);
  return { group, update };
}


