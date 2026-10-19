import * as THREE from 'three';
import { mats } from './materials.js';
import { addBox, addCylinder, addBar, mergedMesh } from './geometry.js';
import { getPlaqueMaterial } from './gardenBuild.js';
import { createLotus } from './gardenDetails.js';
import { terrainHeight, WATER_Y } from './terrain.js';

export function hash(seed, n) {
  const v = Math.sin(seed * 127.1 + n * 311.7) * 43758.5453;
  return v - Math.floor(v);
}

export function orientedBox(list, w, h, d, x, y, z, ry, ox = 0, oz = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.rotateY(ry);
  const wx = ox * Math.cos(ry) + oz * Math.sin(ry);
  const wz = -ox * Math.sin(ry) + oz * Math.cos(ry);
  g.translate(x + wx, y, z + wz);
  list.push(g);
}

export function addPlaque(root, text, w, h, x, y, z, ry = 0) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), getPlaqueMaterial(text));
  m.position.set(x, y, z);
  m.rotation.y = ry;
  root.add(m);
  return m;
}

export function addBench(wood, x, z, ry, gy) {
  orientedBox(wood, 2.5, 0.16, 0.72, x, gy + 0.58, z, ry);
  orientedBox(wood, 2.5, 0.72, 0.12, x, gy + 0.94, z, ry, 0, -0.3);
  for (const o of [-0.95, 0.95]) {
    orientedBox(wood, 0.12, 0.56, 0.58, x, gy + 0.3, z, ry, o, 0);
  }
}

export function addLamp(gold, lantern, x, z, gy, scale = 1) {
  addCylinder(gold, 0.09 * scale, 0.13 * scale, 3.1 * scale, 7, x, gy + 1.55 * scale, z);
  addBox(gold, 0.46 * scale, 0.1 * scale, 0.46 * scale, x, gy + 3.12 * scale, z);
  addBox(lantern, 0.36 * scale, 0.46 * scale, 0.36 * scale, x, gy + 2.84 * scale, z);
  addBox(gold, 0.28 * scale, 0.08 * scale, 0.28 * scale, x, gy + 2.55 * scale, z);
}

export function addRailLine(rail, gold, lantern, pts, opts = {}) {
  const step = opts.step || 2.9;
  const side = opts.side || 1;
  const offset = opts.offset || 0;
  const samp = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, z0] = pts[i];
    const [x1, z1] = pts[i + 1];
    const dx = x1 - x0;
    const dz = z1 - z0;
    const len = Math.hypot(dx, dz) || 1;
    const nx = (dz / len) * side;
    const nz = (-dx / len) * side;
    const n = Math.max(1, Math.round(len / step));
    for (let k = i === 0 ? 0 : 1; k <= n; k++) {
      const t = k / n;
      const px = x0 + dx * t + nx * offset;
      const pz = z0 + dz * t + nz * offset;
      samp.push([px, pz, Math.atan2(dx, dz), nx, nz]);
    }
  }
  for (let i = 0; i < samp.length; i++) {
    const [x, z] = samp[i];
    const gy = Math.max(0.35, terrainHeight(x, z));
    addBox(rail, 0.15, 1.1, 0.15, x, gy + 0.55, z);
    if (i > 0) {
      const p = samp[i - 1];
      const py = Math.max(0.35, terrainHeight(p[0], p[1]));
      addBar(rail, p[0], p[1], x, z, (gy + py) / 2 + 1.06, 0.1, 0.11);
      addBar(rail, p[0], p[1], x, z, (gy + py) / 2 + 0.58, 0.07, 0.07);
    }
  }
  const lampEvery = opts.lampEvery || 6;
  for (let i = lampEvery; i < samp.length; i += lampEvery) {
    const [x, z, , nx, nz] = samp[i];
    const lx = x - nx * (opts.lampOffset || 1.5);
    const lz = z - nz * (opts.lampOffset || 1.5);
    addLamp(gold, lantern, lx, lz, Math.max(0.35, terrainHeight(lx, lz)), opts.lampScale || 1);
  }
  return samp;
}

export function addReeds(list, cx, cz, seed, count = 12, radius = 1.5) {
  for (let i = 0; i < count; i++) {
    const a = hash(seed, i) * Math.PI * 2;
    const r = Math.sqrt(hash(seed, i + 7)) * radius;
    const x = cx + Math.cos(a) * r;
    const z = cz + Math.sin(a) * r;
    const base = Math.max(terrainHeight(x, z), WATER_Y - 0.12);
    const bh = 1.1 + hash(seed, i + 13) * 1.5;
    const g = new THREE.ConeGeometry(0.045, bh, 3);
    g.rotateZ((hash(seed, i + 19) - 0.5) * 0.28);
    g.translate(x, base + bh * 0.5, z);
    list.push(g);
  }
}

export function addShoreRocks(list, cx, cz, seed, count = 6, spread = 5, size = 1.1) {
  for (let i = 0; i < count; i++) {
    const a = hash(seed, i) * Math.PI * 2;
    const r = spread * (0.4 + hash(seed, i + 5) * 0.7);
    const x = cx + Math.cos(a) * r;
    const z = cz + Math.sin(a) * r;
    const s = size * (0.55 + hash(seed, i + 9) * 0.9);
    const g = new THREE.IcosahedronGeometry(s, 0);
    g.scale(1.45, 0.75, 1.15);
    g.rotateY(a);
    g.translate(x, Math.max(0.2, terrainHeight(x, z)) + s * 0.25, z);
    list.push(g);
  }
}

export function addPetalCarpet(list, cx, cz, rad, count, seed, mode = 'ground') {
  for (let i = 0; i < count; i++) {
    const a = hash(seed, i) * Math.PI * 2;
    const r = Math.sqrt(hash(seed, i + 3)) * rad;
    const x = cx + Math.cos(a) * r;
    const z = cz + Math.sin(a) * r;
    let y;
    if (mode === 'water') y = WATER_Y + 0.025;
    else if (mode === 'path') y = Math.max(0.4, terrainHeight(x, z) + 0.035);
    else y = Math.max(0.4, terrainHeight(x, z) + 0.03);
    const g = new THREE.CircleGeometry(0.09 + hash(seed, i + 11) * 0.08, 5);
    g.scale(1, 1, 0.55);
    g.rotateX(-Math.PI / 2);
    g.rotateY(hash(seed, i + 17) * 6.28);
    g.translate(x, y, z);
    list.push(g);
  }
}

export function addLotusBed(root, x, z, radius, count, seed) {
  if (terrainHeight(x, z) > WATER_Y - 0.02) return;
  const lotus = createLotus({ x, z, radius, count, seed });
  lotus.position.y = WATER_Y - 0.04;
  root.add(lotus);
}

export function addCherryTree(seed, height = 7, spread = 3.2) {
  const group = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.36, height * 0.52, 7), mats.trunk);
  trunk.position.y = height * 0.26;
  trunk.castShadow = true;
  group.add(trunk);
  const blobs = [];
  for (let i = 0; i < 11; i++) {
    const r = spread * (0.5 + hash(seed, i) * 0.5);
    const blob = new THREE.IcosahedronGeometry(r, 1);
    blob.scale(1.2, 0.7, 1.2);
    blob.translate(
      (hash(seed, i + 5) - 0.5) * spread * 2.0,
      height * (0.52 + hash(seed, i + 9) * 0.38),
      (hash(seed, i + 13) - 0.5) * spread * 2.0
    );
    blobs.push(blob);
  }
  const mesh = mergedMesh(blobs, seed % 3 === 0 ? mats.cherryLight : mats.cherry, true, true);
  if (mesh) group.add(mesh);
  return group;
}

export function addFootBridge(root, x, z, rot, span = 10, width = 3.2) {
  const group = new THREE.Group();
  const wood = [];
  const rail = [];
  const segs = 9;
  const rise = span * 0.12;
  for (let i = 0; i < segs; i++) {
    const t0 = -0.5 + i / segs;
    const t1 = -0.5 + (i + 1) / segs;
    const z0 = t0 * span;
    const z1 = t1 * span;
    const y0 = 0.35 + rise * Math.cos(t0 * Math.PI);
    const y1 = 0.35 + rise * Math.cos(t1 * Math.PI);
    const g = new THREE.BoxGeometry(width, 0.24, (z1 - z0) * 1.04);
    g.rotateX(-Math.atan2(y1 - y0, z1 - z0));
    g.translate(0, (y0 + y1) / 2, (z0 + z1) / 2);
    wood.push(g);
    for (const sx of [-1, 1]) {
      addBox(rail, 0.13, 0.95, 0.13, sx * width / 2, (y0 + y1) / 2 + 0.55, (z0 + z1) / 2);
      addBar(rail, sx * width / 2, z0, sx * width / 2, z1, (y0 + y1) / 2 + 1.0, 0.09, 0.09);
    }
  }
  const wm = mergedMesh(wood, mats.wood, true, true);
  if (wm) group.add(wm);
  const rm = mergedMesh(rail, mats.wallDark, true, true);
  if (rm) group.add(rm);
  group.position.set(x, Math.max(0.5, terrainHeight(x, z)), z);
  group.rotation.y = rot;
  root.add(group);
  return group;
}

export function addMarker(root, x, z, text, ry = 0) {
  const stone = [];
  addBox(stone, 0.55, 1.5, 0.42, 0, 0.75, 0);
  addBox(stone, 0.8, 0.16, 0.62, 0, 0.08, 0);
  const m = mergedMesh(stone, mats.stone, true, true);
  const gy = Math.max(0.55, terrainHeight(x, z));
  if (m) {
    m.position.set(x, gy, z);
    root.add(m);
  }
  if (text) addPlaque(root, text, 0.72, 0.28, x + Math.sin(ry) * 0.23, gy + 1.13, z + Math.cos(ry) * 0.23, ry);
}

export function addBuoy(lantern, white, x, z, scale = 1) {
  const b = new THREE.SphereGeometry(0.42 * scale, 8, 6);
  b.scale(1, 0.72, 1);
  b.translate(x, WATER_Y + 0.14 * scale, z);
  lantern.push(b);
  const cap = new THREE.ConeGeometry(0.3 * scale, 0.42 * scale, 6);
  cap.translate(x, WATER_Y + 0.5 * scale, z);
  white.push(cap);
  addCylinder(white, 0.05 * scale, 0.06 * scale, 0.5 * scale, 5, x, WATER_Y + 0.34 * scale, z);
}

export function addBannerPole(gold, red, x, z, gy, h = 6.4) {
  addCylinder(gold, 0.08, 0.12, h, 7, x, gy + h / 2, z);
  addCylinder(gold, 0.05, 0.05, 1.5, 5, x + 0.7, gy + h - 0.35, z);
  addBox(red, 1.35, 0.07, 0.07, x + 0.75, gy + h - 0.1, z);
  addBox(red, 0.95, 1.75, 0.05, x + 0.95, gy + h - 1.0, z);
}

export function addTreeLine(root, pts, offset, count, seed, kind = 'broad') {
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    const idx = Math.min(pts.length - 2, Math.floor(t * (pts.length - 1)));
    const lt = t * (pts.length - 1) - idx;
    const x0 = pts[idx][0];
    const z0 = pts[idx][1];
    const x1 = pts[idx + 1][0];
    const z1 = pts[idx + 1][1];
    const dx = x1 - x0;
    const dz = z1 - z0;
    const len = Math.hypot(dx, dz) || 1;
    const side = i % 2 === 0 ? 1 : -1;
    const x = x0 + dx * lt + (dz / len) * offset * side;
    const z = z0 + dz * lt - (dx / len) * offset * side;
    const h = terrainHeight(x, z);
    if (h < 1) continue;
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.42, 5, 6), mats.trunk);
    trunk.position.y = 2.5;
    g.add(trunk);
    const blobs = [];
    const canopies = 5 + (i % 3);
    for (let k = 0; k < canopies; k++) {
      const r = 2.1 + hash(seed, i * 7 + k) * 1.7;
      const b = new THREE.IcosahedronGeometry(r, 1);
      b.scale(1, 0.82, 1);
      b.translate(
        (hash(seed, i + k) - 0.5) * 4.2,
        5.5 + hash(seed, i + k + 9) * 3.4,
        (hash(seed, i + k + 17) - 0.5) * 4.2
      );
      blobs.push(b);
    }
    const cm = mergedMesh(blobs, kind === 'pine' ? mats.pine : mats.blade, true, true);
    if (cm) g.add(cm);
    g.position.set(x, h - 0.1, z);
    g.rotation.y = hash(seed, i + 200) * 6.28;
    root.add(g);
  }
}
