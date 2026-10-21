import * as THREE from 'three';
import { mats, makePlaqueMaterial } from './materials.js';
import { heightAt, trailSamples, platforms, peaks, smoothstep } from './terrain.js';
import { spireSpecs } from './peaks.js';
import { mergeGeometryList } from './geometry.js';

function rand32(seed) {
  let a = seed >>> 0;
  return () => {
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
  const q = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(dx / len, dy / len, dz / len)
  );
  geo.applyQuaternion(q);
  geo.translate((ax + bx) * 0.5, (ay + by) * 0.5, (az + bz) * 0.5);
  return geo;
}

function addRock(list, size, x, y, z, seed, squash = 0.8) {
  const geo = new THREE.DodecahedronGeometry(size, 0);
  const p = geo.attributes.position;
  const rand = rand32(seed);
  for (let i = 0; i < p.count; i++) {
    p.setXYZ(i, p.getX(i) * (0.75 + rand() * 0.45), p.getY(i) * squash * (0.8 + rand() * 0.4), p.getZ(i) * (0.78 + rand() * 0.4));
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

function needleClump(bucket, x, y, z, r, rand, light = false) {
  const geo = new THREE.ConeGeometry(r * (0.55 + rand() * 0.5), r * 0.55, 5, 1, true);
  geo.rotateX(Math.PI * 0.5 + (rand() - 0.5) * 0.5);
  geo.rotateY(rand() * 6.2);
  geo.translate(x, y, z);
  bucket.add(geo, light ? mats.pineLight : mats.pine);
}

function ledgePine(bucket, x, z, h, leanDir, rand) {
  const y = heightAt(x, z);
  const lean = h * (0.22 + rand() * 0.24);
  const tx = Math.cos(leanDir) * lean;
  const tz = Math.sin(leanDir) * lean;
  const topX = x + tx;
  const topZ = z + tz;
  bucket.add(segGeo(x, y - 0.6, z, x + tx * 0.35, y + h * 0.5, z + tz * 0.35, 0.32 + h * 0.012, 0.2 + h * 0.006), mats.trunk);
  bucket.add(segGeo(x + tx * 0.35, y + h * 0.5, z + tz * 0.35, topX, y + h * 0.92, topZ, 0.2 + h * 0.006, 0.09, 4), mats.trunk);
  const tiers = 3;
  for (let i = 0; i < tiers; i++) {
    const k = i / (tiers - 1);
    const cx = x + tx * (0.45 + k * 0.55);
    const cz = z + tz * (0.45 + k * 0.55);
    const cy = y + h * (0.58 + k * 0.3);
    const side = rand() * 6.2;
    bucket.add(segGeo(cx - Math.cos(side) * h * 0.1, cy - 0.4, cz - Math.sin(side) * h * 0.1, cx + Math.cos(side) * h * 0.28, cy, cz + Math.sin(side) * h * 0.28, 0.09, 0.04, 4), mats.trunk);
    for (let n = 0; n < 4; n++) {
      const a = side + (rand() - 0.5) * 2.4;
      const rr = h * (0.14 + rand() * 0.12);
      needleClump(bucket, cx + Math.cos(a) * rr, cy + rand() * 0.4, cz + Math.sin(a) * rr, h * (0.16 + rand() * 0.11), rand, rand() < 0.4);
    }
  }
  needleClump(bucket, topX, y + h * 0.96, topZ, h * 0.16, rand, true);
}

function chainSpan(target, ax, ay, az, bx, by, bz, sag = 0.32) {
  const steps = 4;
  let px = ax;
  let py = ay;
  let pz = az;
  for (let i = 1; i <= steps; i++) {
    const k = i / steps;
    const nx = ax + (bx - ax) * k;
    const nz = az + (bz - az) * k;
    const ny = ay + (by - ay) * k - Math.sin(k * Math.PI) * sag;
    const g = segGeo(px, py, pz, nx, ny, nz, 0.035, 0.035, 4);
    if (target && target.add) target.add(g, mats.iron);
    else target.push(g);
    px = nx;
    py = ny;
    pz = nz;
  }
}

function addCloudPlane(list, w, h, x, y, z, ry = 0, rx = 0) {
  const g = new THREE.PlaneGeometry(w, h, 1, 1);
  if (rx) g.rotateX(rx);
  g.rotateY(ry);
  g.translate(x, y, z);
  list.push(g);
}

function createWildlife(bucket) {
  const rand = rand32(4420);
  const flocks = [[360, 196, 70], [-30, 158, -170], [130, 128, -430], [-280, 96, -300]];
  for (let f = 0; f < flocks.length; f++) {
    const [fx, fy, fz] = flocks[f];
    const count = 4 + (rand() * 4 | 0);
    for (let i = 0; i < count; i++) {
      const x = fx + (rand() - 0.5) * 90;
      const y = fy + (rand() - 0.5) * 34;
      const z = fz + (rand() - 0.5) * 80;
      const a = rand() * 6.2;
      const wings = [];
      addBox(wings, 0.62, 0.04, 0.13, x - Math.cos(a) * 0.28, y, z - Math.sin(a) * 0.28, a, 0, 0.34);
      addBox(wings, 0.62, 0.04, 0.13, x + Math.cos(a) * 0.28, y, z + Math.sin(a) * 0.28, a, 0, -0.34);
      wings.forEach((g) => bucket.add(g, mats.iron));
    }
  }
  const walkers = [[28, 0.55], [106, -0.5], [168, 0.35], [238, -0.45], [286, 0.4]];
  for (let i = 0; i < walkers.length; i++) {
    const idx = walkers[i][0];
    const s = trailSamples[idx];
    const side = walkers[i][1];
    const nx = s.nx || 0;
    const nz = s.nz || 1;
    const x = s.x + nx * side * (s.width * 0.3);
    const z = s.z + nz * side * (s.width * 0.3);
    const y = s.y + 0.15;
    const yaw = Math.atan2(nx, nz);
    const body = [];
    const legs = [];
    const heads = [];
    const packs = [];
    addBox(legs, 0.13, 0.56, 0.15, x - 0.08, y + 0.6, z, yaw);
    addBox(legs, 0.13, 0.56, 0.15, x + 0.08, y + 0.56, z, yaw);
    addBox(body, 0.36, 0.64, 0.24, x, y + 1.18, z, yaw, 0, 0.05);
    addBox(packs, 0.3, 0.42, 0.2, x - Math.sin(yaw) * 0.19, y + 1.22, z - Math.cos(yaw) * 0.19, yaw);
    const hg = new THREE.IcosahedronGeometry(0.17, 0);
    hg.translate(x, y + 1.63, z);
    heads.push(hg);
    addBox(packs, 0.06, 0.95, 0.06, x + 0.32, y + 0.8, z + 0.06, yaw, 0, 0.16);
    body.forEach((g) => bucket.add(g, i % 2 ? mats.pineDeep : mats.wood));
    legs.forEach((g) => bucket.add(g, mats.iron));
    heads.forEach((g) => bucket.add(g, mats.rockLight));
    packs.forEach((g) => bucket.add(g, mats.ribbon));
  }
}

export function createFineDetail() {
  const root = new THREE.Group();
  root.name = 'fine-detail';
  const bucket = new Bucket();
  createYingkeDetail(bucket);
  createGraniteDetail(bucket);
  createTrailDetail(bucket);
  createSummitDetail(bucket, root);
  createWildlife(bucket);
  root.add(bucket.finish('merged-fine-detail'));
  return root;
}

export { createSkyDetail };

function createSkyDetail() {
  const root = new THREE.Group();
  root.name = 'layered-mist-and-sunrise';
  const rand = rand32(7702);
  const bright = [];
  const mist = [];
  const banks = [
    [900, 240, 120, 118, -380, 0.2], [1200, 300, -420, 142, -640, -0.24],
    [1000, 260, 380, 96, -210, 0.34], [1600, 360, -60, 178, -1020, 0.05],
    [760, 210, -620, 88, -240, -0.35], [1100, 280, 620, 126, -720, 0.18],
  ];
  for (const b of banks) addCloudPlane(bright, b[0], b[1], b[2], b[3], b[4], b[5], -Math.PI * 0.33);
  for (const b of banks) {
    if (rand() < 0.6) addCloudPlane(bright, b[0] * 0.8, b[1] * 0.7, b[2] + 60, b[3] + 10, b[4] - 80, b[5] + 0.1, -Math.PI * 0.36);
  }
  for (let i = 0; i < 18; i++) {
    const a = rand() * Math.PI * 2;
    const d = 120 + rand() * 640;
    addCloudPlane(mist, 260 + rand() * 420, 90 + rand() * 150, Math.cos(a) * d, 22 + rand() * 46, Math.sin(a) * d - 220, rand() * 3, -Math.PI * 0.5);
  }
  for (let i = 0; i < 12; i++) {
    const a = rand() * Math.PI * 2;
    const d = 300 + rand() * 520;
    addCloudPlane(mist, 170 + rand() * 280, 120 + rand() * 220, Math.cos(a) * d, 70 + rand() * 75, Math.sin(a) * d - 300, rand() * 1.4 - 0.7, 0);
  }
  for (let i = 0; i < 4; i++) addCloudPlane(bright, 80 + i * 26, 150 + i * 24, 34 - i * 38, 52 - i * 3, -320 - i * 58, 0.14 + i * 0.03, 0);
  for (let i = 0; i < 3; i++) addCloudPlane(bright, 110 + i * 30, 130 + i * 22, -460 + i * 40, 64 + i * 6, -560 - i * 42, 1.1, 0);
  for (const [list, mat] of [[bright, mats.cloud], [mist, mats.mist]]) {
    if (!list.length) continue;
    const mesh = new THREE.Mesh(mergeGeometryList(list), mat);
    mesh.renderOrder = 3;
    root.add(mesh);
  }
  const glow = new THREE.Sprite(mats.glow);
  glow.position.set(780, 268, 150);
  glow.scale.set(760, 420, 1);
  glow.renderOrder = 4;
  root.add(glow);
  return root;
}

function createSummitDetail(bucket, root) {
  const gm = platforms[1];
  const rand = rand32(5521);
  const walls = [];
  const caps = [];
  const ribbons = [];
  for (const [a0, a1] of [[0.35, 2.75], [3.55, 5.95]]) {
    const count = 10;
    for (let i = 0; i < count; i++) {
      const a = a0 + ((a1 - a0) * i) / (count - 1);
      const x = gm.x + Math.cos(a) * (gm.r + 0.35);
      const z = gm.z + Math.sin(a) * (gm.r + 0.35);
      addBox(walls, 2.25, 0.95, 0.48, x, gm.y + 0.58, z, -a);
      addBox(caps, 2.35, 0.14, 0.62, x, gm.y + 1.1, z, -a);
      if (i % 2 === 0) {
        addBox(ribbons, 0.13, 0.52 + rand() * 0.25, 0.02, x, gm.y + 0.82, z + 0.26, -a + Math.PI * 0.5);
      }
    }
  }
  const stele = [];
  addBox(stele, 1.1, 1.7, 0.55, gm.x + 2.4, gm.y + 0.9, gm.z + 9.2, 0.18);
  addBox(stele, 1.5, 0.2, 0.9, gm.x + 2.4, gm.y + 0.12, gm.z + 9.2, 0.18);
  walls.forEach((g) => bucket.add(g, mats.stone));
  caps.forEach((g) => bucket.add(g, mats.stoneDark));
  stele.forEach((g) => bucket.add(g, mats.stoneDark));
  ribbons.forEach((g) => bucket.add(g, mats.ribbon));
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.8), makePlaqueMaterial('长老峰', 'CHANGLAO PEAK · DANXIA'));
  plaque.position.set(gm.x + 2.4, gm.y + 1.5, gm.z + 9.49);
  plaque.rotation.y = 0.18;
  root.add(plaque);
  for (let i = 0; i < 12; i++) {
    const a = rand() * Math.PI * 2;
    const d = gm.r + 2 + rand() * 9;
    const x = gm.x + Math.cos(a) * d;
    const z = gm.z + Math.sin(a) * d;
    const rocks = [];
    addRock(rocks, 1 + rand() * 2.6, x, heightAt(x, z) + 0.3, z, 6200 + i, 0.7);
    rocks.forEach((g) => bucket.add(g, i % 2 ? mats.rock : mats.rockLight));
  }
  for (const [x, z] of [[gm.x - 20, gm.z - 17], [gm.x + 19, gm.z - 11], [gm.x + 17, gm.z + 18]]) {
    ledgePine(bucket, x, z, 4.5 + rand() * 3.5, rand() * Math.PI * 2, rand);
  }

  const fx = -255;
  const fz = -78;
  const fy = heightAt(fx, fz);
  const fdeck = [];
  const fposts = [];
  const fchains = [];
  const frogs = [];
  addCyl(fdeck, 4.6, 5.1, 0.38, 20, fx + 7.5, heightAt(fx + 7.5, fz + 12) + 0.1, fz + 12);
  for (let i = 0; i < 12; i++) {
    const a = -0.35 + (i / 11) * Math.PI * 1.2;
    const px = fx + 7.5 + Math.cos(a) * 4.7;
    const pz = fz + 12 + Math.sin(a) * 4.7;
    addCyl(fposts, 0.07, 0.1, 1.3, 5, px, heightAt(fx + 7.5, fz + 12) + 0.72, pz);
    if (i < 11) {
      const b = -0.35 + ((i + 1) / 11) * Math.PI * 1.2;
      chainSpan(fchains, px, heightAt(fx + 7.5, fz + 12) + 1.3, pz, fx + 7.5 + Math.cos(b) * 4.7, heightAt(fx + 7.5, fz + 12) + 1.3, fz + 12 + Math.sin(b) * 4.7, 0.2);
    }
  }
  for (let i = 0; i < 13; i++) {
    const a = rand() * Math.PI * 2;
    const d = 8 + rand() * 7;
    addRock(frogs, 1.2 + rand() * 3.2, fx + Math.cos(a) * d, heightAt(fx + Math.cos(a) * d, fz + Math.sin(a) * d) + 0.4, fz + Math.sin(a) * d, 6600 + i, 0.8);
  }
  fdeck.forEach((g) => bucket.add(g, mats.deck));
  fposts.forEach((g) => bucket.add(g, mats.wood));
  fchains.forEach((g) => bucket.add(g, mats.iron));
  frogs.forEach((g) => bucket.add(g, mats.graniteLight));
  const fribbons = [];
  for (let i = 0; i < 16; i++) {
    const a = -0.25 + rand() * 3.5;
    addBox(fribbons, 0.12, 0.5 + rand() * 0.3, 0.02, fx + 7.5 + Math.cos(a) * 4.75, heightAt(fx + 7.5, fz + 12) + 1.0, fz + 12 + Math.sin(a) * 4.75, -a + Math.PI * 0.5);
  }
  fribbons.forEach((g) => bucket.add(g, mats.ribbon));
  const sp = [];
  addBox(sp, 0.18, 2.2, 0.18, fx + 3.4, heightAt(fx + 3.4, fz + 8) + 1.1, fz + 8, 0.55);
  addBox(sp, 0.18, 2.2, 0.18, fx + 5.1, heightAt(fx + 5.1, fz + 8) + 1.1, fz + 8, 0.55);
  sp.forEach((g) => bucket.add(g, mats.wood));
  const fs = [];
  addBox(fs, 1.85, 0.9, 0.13, fx + 4.25, heightAt(fx + 3.4, fz + 8) + 2.0, fz + 8, 0.55);
  fs.forEach((g) => bucket.add(g, mats.sign));
  const fplaque = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.74), makePlaqueMaterial('赤壁丹崖', 'RED SANDSTONE CLIFFS'));
  fplaque.position.set(fx + 0.5, fy + 3.6, fz + 7.4);
  fplaque.rotation.y = 0.55;
  root.add(fplaque);
  for (const [x, z] of [[fx - 10, fz + 4], [fx + 10, fz - 1], [fx + 3, fz + 7]]) {
    ledgePine(bucket, x, z, 3.8 + rand() * 3.4, rand() * Math.PI * 2, rand);
  }
}

function frameAt(i) {
  const n = trailSamples.length;
  const s = trailSamples[i];
  const a = trailSamples[Math.max(0, i - 1)];
  const b = trailSamples[Math.min(n - 1, i + 1)];
  let tx = b.x - a.x;
  let tz = b.z - a.z;
  const len = Math.hypot(tx, tz) || 1;
  tx /= len;
  tz /= len;
  return { s, tx, tz, nx: -tz, nz: tx, yaw: Math.atan2(tx, tz), len };
}

function createTrailDetail(bucket) {
  const n = trailSamples.length;
  const rand = rand32(6111);
  const steps = [];
  const edges = [];
  const chains = [];
  const benches = [];
  const markers = [];
  const signPosts = [];
  const signs = [];
  for (let i = 8; i < n - 8; i += 2) {
    const f = frameAt(i);
    const s = f.s;
    const g = frameAt(Math.min(n - 1, i + 1));
    const rise = g.s.y - s.y;
    if (!(rise > 0.16 || (i % 6 === 0 && rand() < 0.5))) continue;
    const w = Math.max(2.2, s.width * 0.92);
    addBox(steps, w, 0.1 + Math.min(0.12, rise * 0.3), 0.46, s.x, s.y + 0.19, s.z, f.yaw);
    if (i % 4 === 0) {
      addBox(edges, 0.28, 0.22, 0.7, s.x + f.nx * (w * 0.5), s.y + 0.24, s.z + f.nz * (w * 0.5), f.yaw);
      addBox(edges, 0.28, 0.22, 0.7, s.x - f.nx * (w * 0.5), s.y + 0.24, s.z - f.nz * (w * 0.5), f.yaw);
    }
  }
  for (let i = 4; i < n - 8; i += 4) {
    const a = frameAt(i);
    const b = frameAt(Math.min(n - 1, i + 4));
    for (const side of [1, -1]) {
      const ax = a.s.x + a.nx * side * (a.s.width * 0.5 + 0.18);
      const az = a.s.z + a.nz * side * (a.s.width * 0.5 + 0.18);
      const bx = b.s.x + b.nx * side * (b.s.width * 0.5 + 0.18);
      const bz = b.s.z + b.nz * side * (b.s.width * 0.5 + 0.18);
      chainSpan(chains, ax, a.s.y + 1.12, az, bx, b.s.y + 1.12, bz, 0.26);
    }
  }
  for (const idx of [46, 132, 216, 268]) {
    const f = frameAt(idx);
    const s = f.s;
    const side = idx % 2 ? 1 : -1;
    const bx = s.x + f.nx * side * (s.width * 0.5 + 1.1);
    const bz = s.z + f.nz * side * (s.width * 0.5 + 1.1);
    const by = s.y;
    addBox(benches, 1.7, 0.12, 0.48, bx, by + 0.52, bz, f.yaw);
    addBox(benches, 0.12, 0.5, 0.42, bx + f.tx * 0.62, by + 0.25, bz + f.tz * 0.62, f.yaw);
    addBox(benches, 0.12, 0.5, 0.42, bx - f.tx * 0.62, by + 0.25, bz - f.tz * 0.62, f.yaw);
  }
  for (let i = 24; i < n - 20; i += 37) {
    const f = frameAt(i);
    const side = i % 2 ? 1 : -1;
    const x = f.s.x + f.nx * side * (f.s.width * 0.5 + 0.55);
    const z = f.s.z + f.nz * side * (f.s.width * 0.5 + 0.55);
    addBox(markers, 0.34, 0.95, 0.22, x, f.s.y + 0.5, z, f.yaw);
    addBox(markers, 0.4, 0.12, 0.28, x, f.s.y + 1.0, z, f.yaw);
  }
  const start = frameAt(10);
  const sy = start.s.y;
  addBox(signPosts, 0.2, 2.6, 0.2, start.s.x + start.nx * 2.1, sy + 1.3, start.s.z + start.nz * 2.1, start.yaw);
  addBox(signPosts, 0.2, 2.6, 0.2, start.s.x + start.nx * 3.7, sy + 1.3, start.s.z + start.nz * 3.7, start.yaw);
  addBox(signs, 1.8, 1.0, 0.14, start.s.x + start.nx * 2.9, sy + 2.1, start.s.z + start.nz * 2.9, start.yaw + Math.PI * 0.5);
  steps.forEach((g) => bucket.add(g, mats.stone));
  edges.forEach((g) => bucket.add(g, mats.stoneDark));
  chains.forEach((g) => bucket.add(g, mats.iron));
  benches.forEach((g) => bucket.add(g, mats.wood));
  markers.forEach((g) => bucket.add(g, mats.stoneDark));
  signPosts.forEach((g) => bucket.add(g, mats.wood));
  signs.forEach((g) => bucket.add(g, mats.sign2));
}

function createGraniteDetail(bucket) {
  const rand = rand32(3389);
  spireSpecs.forEach((s, si) => {
    const [cx, cz, , topY, rBottom] = s;
    const baseY = Math.max(12, heightAt(cx, cz) - 12);
    const h = Math.max(8, topY - baseY);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + si * 0.3;
      const rad = rBottom * (0.82 + rand() * 0.22);
      const fh = h * (0.32 + rand() * 0.42);
      const y = baseY + h * (0.18 + rand() * 0.46);
      const g = new THREE.BoxGeometry(0.65 + rand() * 1.5, fh, 0.5 + rand() * 0.9);
      g.rotateY(a + 0.3);
      g.rotateZ((rand() - 0.5) * 0.09);
      g.translate(cx + Math.cos(a) * rad, y, cz + Math.sin(a) * rad);
      bucket.add(g, i % 3 === 0 ? mats.graniteLight : mats.graniteDark);
    }
    for (let i = 0; i < 5; i++) {
      const a = rand() * Math.PI * 2;
      const rad = rBottom * (0.78 + rand() * 0.24);
      const ch = h * (0.12 + rand() * 0.24);
      const g = new THREE.BoxGeometry(0.13 + rand() * 0.16, ch, 0.14);
      g.rotateY(a + 0.2);
      g.translate(cx + Math.cos(a) * rad, baseY + h * (0.18 + rand() * 0.6), cz + Math.sin(a) * rad);
      bucket.add(g, mats.stoneDark);
    }
    for (let i = 0; i < 4; i++) {
      const a = rand() * Math.PI * 2;
      const rad = rBottom * (0.6 + rand() * 0.38);
      const w = 2.2 + rand() * 4.2;
      const g = new THREE.BoxGeometry(w, 0.35 + rand() * 0.3, 1.8 + rand() * 2.4);
      g.rotateY(a);
      g.translate(cx + Math.cos(a) * rad, baseY + h * (0.2 + rand() * 0.55), cz + Math.sin(a) * rad);
      bucket.add(g, mats.graniteLight);
    }
    for (let i = 0; i < 3; i++) {
      const a = rand() * Math.PI * 2;
      const rad = rBottom * (0.7 + rand() * 0.3);
      const moss = new THREE.IcosahedronGeometry(0.8 + rand() * 1.6, 0);
      moss.scale(1.5 + rand(), 0.26, 1.1 + rand());
      moss.rotateY(rand() * 6.2);
      moss.translate(cx + Math.cos(a) * rad, baseY + h * (0.2 + rand() * 0.55), cz + Math.sin(a) * rad);
      bucket.add(moss, i % 2 ? mats.shrubLight : mats.shrub);
    }
    const pines = 2 + (rand() * 3 | 0);
    for (let i = 0; i < pines; i++) {
      const a = rand() * Math.PI * 2;
      const rad = rBottom * (0.55 + rand() * 0.4);
      const x = cx + Math.cos(a) * rad;
      const z = cz + Math.sin(a) * rad;
      if (heightAt(x, z) > 228) continue;
      ledgePine(bucket, x, z, 3.2 + rand() * 4.4, rand() * Math.PI * 2, rand);
    }
  });
  for (const p of peaks) {
    for (let i = 0; i < 7; i++) {
      const a = rand() * Math.PI * 2;
      const rad = p.r * (0.72 + rand() * 0.4);
      const x = p.x + Math.cos(a) * rad;
      const z = p.z + Math.sin(a) * rad;
      const y = heightAt(x, z);
      if (y < 55 || y > 224) continue;
      const boulders = [];
      addRock(boulders, 1.2 + rand() * 3.4, x, y + 0.2, z, 4000 + i, 0.55);
      boulders.forEach((g) => bucket.add(g, i % 2 ? mats.rock : mats.rockLight));
    }
    for (let i = 0; i < 4; i++) {
      const a = rand() * Math.PI * 2;
      const rad = p.r * (0.5 + rand() * 0.35);
      const x = p.x + Math.cos(a) * rad;
      const z = p.z + Math.sin(a) * rad;
      if (heightAt(x, z) > 232) continue;
      ledgePine(bucket, x, z, 3.5 + rand() * 5, rand() * Math.PI * 2, rand);
    }
  }
}

function createYingkeDetail(bucket) {
  const bx = 139;
  const bz = 43;
  const by = heightAt(bx, bz) + 0.4;
  const rand = rand32(9017);
  const rock = [];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + rand() * 0.4;
    const d = 1.2 + rand() * 2.8;
    addRock(rock, 0.9 + rand() * 1.5, bx + Math.cos(a) * d, heightAt(bx + Math.cos(a) * d, bz + Math.sin(a) * d) + 0.15, bz + Math.sin(a) * d, 910 + i, 0.75);
  }
  rock.forEach((g) => bucket.add(g, mats.graniteLight));
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + rand() * 0.35;
    const len = 2.2 + rand() * 3.4;
    const ex = bx + Math.cos(a) * len;
    const ez = bz + Math.sin(a) * len;
    bucket.add(segGeo(bx, by + 0.5, bz, ex, heightAt(ex, ez) + 0.2, ez, 0.26 - i * 0.01, 0.07, 5), mats.trunk);
  }
  const tips = [
    [16, 14.2, 7.2], [24, 15.8, 4.0], [5.6, 8.6, 8.0], [8.5, 13.4, 10.5],
    [13.5, 11.0, 2.2], [19.0, 12.4, 10.0], [4.0, 10.2, 5.6], [28.0, 13.6, 7.6],
  ];
  for (let i = 0; i < tips.length; i++) {
    const [tx, ty, tz] = tips[i];
    const ox = bx + tx;
    const oz = bz + tz;
    const sx = bx + 4.6 + (i % 3) * 2.1;
    const sy = by + 10.8 + (i % 4);
    const sz = bz + 3.4 - (i % 2) * 1.1;
    bucket.add(segGeo(sx, sy, sz, ox, by + ty, oz, 0.34, 0.12, 5), mats.trunk);
    for (let n = 0; n < 13; n++) {
      const a = rand() * Math.PI * 2;
      const rr = 0.9 + rand() * 3.2;
      const cx = ox + Math.cos(a) * rr;
      const cz = oz + Math.sin(a) * rr;
      const cy = by + ty + (rand() - 0.4) * 2.2;
      needleClump(bucket, cx, cy, cz, 0.75 + rand() * 1.15, rand, rand() < 0.38);
    }
  }
  for (let i = 0; i < 44; i++) {
    const a = rand() * Math.PI * 2;
    const rr = 2 + rand() * 9;
    needleClump(bucket, bx + 8 + Math.cos(a) * rr, by + 14.5 + rand() * 4.2, bz + 4 + Math.sin(a) * rr * 0.7, 0.7 + rand() * 1.2, rand, rand() < 0.35);
  }
  const py = heightAt(131, 49) + 0.16;
  const deck = [];
  addCyl(deck, 3.5, 3.9, 0.32, 18, 131, py, 49);
  for (let i = 0; i < 11; i++) {
    const a = -0.4 + (i / 10) * Math.PI * 1.25;
    const px = 131 + Math.cos(a) * 3.5;
    const pz = 49 + Math.sin(a) * 3.5;
    addCyl(deck, 0.07, 0.1, 1.25, 5, px, py + 0.7, pz);
    if (i < 10) {
      const b = -0.4 + ((i + 1) / 10) * Math.PI * 1.25;
      const qx = 131 + Math.cos(b) * 3.5;
      const qz = 49 + Math.sin(b) * 3.5;
      chainSpan(bucket, px, py + 1.28, pz, qx, py + 1.28, qz, 0.18);
    }
  }
  deck.forEach((g) => bucket.add(g, mats.stone));
  const sx = 128;
  const sz = 59;
  const sy = heightAt(sx, sz);
  const posts = [];
  addBox(posts, 0.22, 2.5, 0.22, sx - 1.15, sy + 1.2, sz, 0.8);
  addBox(posts, 0.22, 2.5, 0.22, sx + 1.15, sy + 1.2, sz, 0.8);
  posts.forEach((g) => bucket.add(g, mats.wood));
  const boards = [];
  addBox(boards, 2.7, 1.35, 0.16, sx, sy + 2.1, sz, 0.8);
  boards.forEach((g) => bucket.add(g, mats.sign));
  const ribbons = [];
  for (let i = 0; i < 18; i++) {
    const a = -0.2 + rand() * 3.6;
    const px = 131 + Math.cos(a) * 3.55;
    const pz = 49 + Math.sin(a) * 3.55;
    addBox(ribbons, 0.1, 0.72 + rand() * 0.35, 0.02, px, py + 0.92, pz, -a);
  }
  ribbons.forEach((g) => bucket.add(g, mats.ribbon));
}

