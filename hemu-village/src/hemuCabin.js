import * as THREE from 'three';
import { rand, addRod, mergedMesh } from './hemuCore.js';
import { terrainHeight } from './hemuTerrain.js';

const Y_AXIS = new THREE.Vector3(0, 1, 0);

export class StaticBuilder {
  constructor() {
    this.buckets = new Map();
  }

  add(key, geo, world = null) {
    if (world) geo.applyMatrix4(world);
    if (!this.buckets.has(key)) this.buckets.set(key, []);
    this.buckets.get(key).push(geo);
  }

  box(key, w, h, d, x, y, z, ry = 0, world = null) {
    const g = new THREE.BoxGeometry(w, h, d);
    if (ry) g.rotateY(ry);
    g.translate(x, y, z);
    this.add(key, g, world);
  }

  cylX(key, len, r, x, y, z, seg = 7, world = null) {
    const g = new THREE.CylinderGeometry(r, r, len, seg);
    g.rotateZ(Math.PI / 2);
    g.translate(x, y, z);
    this.add(key, g, world);
  }

  cylZ(key, len, r, x, y, z, seg = 7, world = null) {
    const g = new THREE.CylinderGeometry(r, r, len, seg);
    g.rotateX(Math.PI / 2);
    g.translate(x, y, z);
    this.add(key, g, world);
  }

  rod(key, ax, ay, az, bx, by, bz, r1, r2 = r1, seg = 5, world = null) {
    const list = [];
    addRod(list, ax, ay, az, bx, by, bz, r1, r2, seg);
    for (const g of list) this.add(key, g, world);
  }

  cone(key, r, h, x, y, z, seg = 6, world = null) {
    const g = new THREE.ConeGeometry(r, h, seg);
    g.translate(x, y, z);
    this.add(key, g, world);
  }

  flush(M, root) {
    for (const [key, list] of this.buckets) {
      const mesh = mergedMesh(list, M[key], true, true);
      if (!mesh) continue;
      mesh.name = 'hemu-static-' + key;
      if (key === 'window') mesh.castShadow = false;
      root.add(mesh);
    }
  }
}

export function localMatrix(x, z, rot, baseY = null) {
  const y = baseY == null ? terrainHeight(x, z) : baseY;
  const q = new THREE.Quaternion().setFromAxisAngle(Y_AXIS, rot);
  return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(1, 1, 1));
}

export function addCabin(B, { x, z, rot = 0, w = 8, d = 6.5, wallH = 2.9, seed = 1 }) {
  const world = localMatrix(x, z, rot);
  const smoke = [];
  const logR = 0.145;
  const rowH = 0.29;
  const rows = Math.max(8, Math.round(wallH / rowH));

  const nStone = Math.max(5, Math.round(w / 1.35));
  for (let i = 0; i < nStone; i++) {
    const t = i / (nStone - 1);
    const sx = -w / 2 + t * w;
    B.box('stone', 0.82, 0.36, 0.76, sx, 0.16, d / 2 + 0.08, (rand(seed, i) - 0.5) * 0.2, world);
    B.box('stone', 0.82, 0.36, 0.76, sx, 0.16, -d / 2 - 0.08, (rand(seed + 2, i) - 0.5) * 0.2, world);
  }
  for (const side of [-1, 1]) {
    B.box('stone', 0.74, 0.36, d, side * (w / 2 + 0.08), 0.16, 0, 0, world);
  }

  for (let i = 0; i < rows; i++) {
    const y = 0.25 + i * rowH;
    const jitter = (rand(seed + 3, i) - 0.5) * 0.028;
    B.cylX('log', w + 0.76, logR, 0, y, -d / 2 + jitter, 7, world);
    B.cylX('log', w + 0.76, logR, 0, y, d / 2 - jitter, 7, world);
    B.cylZ('log', d + 0.76, logR, -w / 2 + jitter, y, 0, 7, world);
    B.cylZ('log', d + 0.76, logR, w / 2 - jitter, y, 0, 7, world);
  }

  const ridgeH = d * 0.56;
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, 0);
  shape.lineTo(w / 2, 0);
  shape.lineTo(0, ridgeH);
  shape.closePath();
  const gable = new THREE.ShapeGeometry(shape);
  const frontGable = gable.clone();
  frontGable.translate(0, wallH, d / 2 + 0.015);
  B.add('timber', frontGable, world);
  const backGable = gable.clone();
  backGable.rotateY(Math.PI);
  backGable.translate(0, wallH, -d / 2 - 0.015);
  B.add('timber', backGable, world);

  const overhang = 0.9;
  const halfD = d / 2 + overhang;
  const slopeLen = Math.hypot(halfD, ridgeH);
  const angle = Math.atan2(ridgeH, halfD);
  for (const side of [1, -1]) {
    const slab = new THREE.BoxGeometry(w + 2.0, 0.2, slopeLen);
    slab.rotateX(side * angle);
    slab.translate(0, wallH + ridgeH / 2 + 0.07, (side * halfD) / 2);
    B.add('roof', slab, world);
    for (let k = 0; k < 6; k++) {
      const f = (k + 1) / 7;
      const bat = new THREE.BoxGeometry(w + 2.15, 0.08, 0.16);
      bat.rotateX(side * angle);
      bat.translate(0, wallH + ridgeH * (1 - f) + 0.18, side * f * halfD);
      B.add('roofDark', bat, world);
    }
    const fascia = new THREE.BoxGeometry(w + 2.2, 0.24, 0.16);
    fascia.translate(0, wallH + 0.06, side * halfD);
    B.add('timberDark', fascia, world);
  }
  B.box('roofDark', w + 2.15, 0.16, 0.3, 0, wallH + ridgeH + 0.12, 0, 0, world);
  for (let i = 0; i < 7; i++) {
    const bx = -w / 2 + 0.5 + i * ((w - 1) / 6);
    B.box('timberDark', 0.13, 0.13, d + 2.0, bx, wallH + 0.04, 0, 0, world);
  }

  const front = d / 2 + 0.11;
  const doorX = w * 0.14;
  B.box('door', 1.05, 2.0, 0.2, doorX, 1.12, front, 0, world);
  B.box('timberDark', 0.14, 2.2, 0.28, doorX - 0.64, 1.13, front + 0.05, 0, world);
  B.box('timberDark', 0.14, 2.2, 0.28, doorX + 0.64, 1.13, front + 0.05, 0, world);
  B.box('timberDark', 1.5, 0.16, 0.32, doorX, 2.19, front + 0.06, 0, world);
  B.box('stone', 1.6, 0.18, 0.9, doorX, 0.09, front + 0.38, 0, world);

  const winY = 1.62;
  for (const wx of [-w * 0.26, w * 0.37]) {
    B.box('timberDark', 1.02, 0.9, 0.16, wx, winY, front, 0, world);
    B.box('window', 0.76, 0.64, 0.15, wx, winY, front + 0.03, 0, world);
    B.box('timberDark', 0.06, 0.64, 0.19, wx, winY, front + 0.05, 0, world);
    B.box('timberDark', 0.76, 0.06, 0.19, wx, winY, front + 0.05, 0, world);
  }
  for (const side of [-1, 1]) {
    const sx = side * (w / 2 + 0.12);
    B.box('timberDark', 0.16, 0.86, 1.0, sx, winY, -d * 0.1, 0, world);
    B.box('window', 0.15, 0.6, 0.76, sx + side * 0.03, winY, -d * 0.1, 0, world);
  }
  if (rand(seed, 9) > 0.52) {
    const gx = w * 0.02;
    B.box('timberDark', 0.86, 0.7, 0.16, gx, wallH + ridgeH * 0.46, front - 0.05, 0, world);
    B.box('window', 0.64, 0.5, 0.16, gx, wallH + ridgeH * 0.46, front - 0.02, 0, world);
  }

  const chimneyX = -w * 0.28;
  const chimneyZ = -d * 0.18;
  for (let i = 0; i < 7; i++) {
    const s = 0.64 - i * 0.02;
    B.box('stone', s, 0.34, s, chimneyX + (rand(seed + 7, i) - 0.5) * 0.05, 0.3 + i * 0.34, chimneyZ, 0, world);
  }
  B.box('stoneDark', 0.74, 0.16, 0.74, chimneyX, 0.3 + 6 * 0.34 + 0.24, chimneyZ, 0, world);
  smoke.push(new THREE.Vector3(chimneyX, 0.3 + 6 * 0.34 + 0.36, chimneyZ).applyMatrix4(world));

  const pileX = w / 2 + 0.9;
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 5; col++) {
      B.cylZ('logLight', 1.45, 0.115, pileX + col * 0.25, 0.16 + row * 0.23, -d * 0.26, 5, world);
    }
  }

  if (rand(seed, 12) > 0.45) {
    B.box('timber', 2.6, 0.14, 1.5, doorX, 2.28, front + 0.65, 0, world);
    B.box('timberDark', 0.14, 2.2, 0.14, doorX - 1.15, 1.12, front + 1.32, 0, world);
    B.box('timberDark', 0.14, 2.2, 0.14, doorX + 1.15, 1.12, front + 1.32, 0, world);
  }

  return smoke;
}

export function addGranary(B, { x, z, rot = 0, w = 4.6, d = 3.8, seed = 20 }) {
  const world = localMatrix(x, z, rot);
  const base = 1.55;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      B.box('timberDark', 0.26, base, 0.26, sx * (w / 2 - 0.35), base / 2, sz * (d / 2 - 0.35), 0, world);
      B.box('stone', 0.58, 0.22, 0.58, sx * (w / 2 - 0.35), 0.11, sz * (d / 2 - 0.35), 0, world);
    }
  }
  B.box('timber', w + 0.7, 0.24, d + 0.7, 0, base, 0, 0, world);
  const rows = 8;
  for (let i = 0; i < rows; i++) {
    B.cylX('log', w + 0.3, 0.11, 0, base + 0.2 + i * 0.22, -d / 2, 6, world);
    B.cylX('log', w + 0.3, 0.11, 0, base + 0.2 + i * 0.22, d / 2, 6, world);
    B.cylZ('log', d + 0.3, 0.11, -w / 2, base + 0.2 + i * 0.22, 0, 6, world);
    B.cylZ('log', d + 0.3, 0.11, w / 2, base + 0.2 + i * 0.22, 0, 6, world);
  }
  const ridgeH = d * 0.62;
  const halfD = d / 2 + 0.5;
  const slopeLen = Math.hypot(halfD, ridgeH);
  const angle = Math.atan2(ridgeH, halfD);
  for (const side of [1, -1]) {
    const slab = new THREE.BoxGeometry(w + 1.1, 0.16, slopeLen);
    slab.rotateX(side * angle);
    slab.translate(0, base + 2.1 + ridgeH / 2, (side * halfD) / 2);
    B.add('roof', slab, world);
  }
  B.box('roofDark', w + 1.2, 0.13, 0.25, 0, base + 2.1 + ridgeH + 0.08, 0, 0, world);
  B.box('door', 0.85, 1.5, 0.16, 0, base + 1.05, d / 2 + 0.06, 0, world);
  for (let i = 0; i < 5; i++) {
    B.box('timberDark', 0.5, 0.08, 0.12, 0, 0.24 + i * 0.3, (d / 2 + 0.4) - i * 0.1, 0, world);
  }
  return [new THREE.Vector3(0, base + 2.9, -d * 0.2).applyMatrix4(world)];
}
