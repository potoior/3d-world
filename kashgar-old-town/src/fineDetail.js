import * as THREE from 'three';
import { mats } from './materials.js';
import { addBox, addCylinder, mergedMesh } from './geometry.js';
import { getPlaqueMaterial } from './gardenBuild.js';
import { createBench, createStoneLantern, createFallenPetals } from './richProps.js';
import { createTree } from './props.js';
import { createWillow } from './gardenDetails.js';

function rnd(seed, n) {
  const v = Math.sin(seed * 57.13 + n * 41.71) * 43758.5453;
  return v - Math.floor(v);
}

function addSign(group, text, x, y, z, rot, width = 2.3) {
  const mat = getPlaqueMaterial(text);
  const board = new THREE.Mesh(new THREE.PlaneGeometry(width, width * 0.3125), mat);
  board.position.set(x, y + 1.62, z);
  board.rotation.y = rot;
  group.add(board);
  const frame = [];
  addBox(frame, width + 0.16, 0.1, 0.12, x, y + 1.62 + width * 0.156, z, rot);
  addBox(frame, width + 0.16, 0.1, 0.12, x, y + 1.62 - width * 0.156, z, rot);
  addBox(frame, 0.12, width * 0.3125 + 0.16, 0.12, x, y + 1.62, z, rot);
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  for (const side of [-1, 1]) {
    const px = x + side * width * 0.4 * c;
    const pz = z - side * width * 0.4 * s;
    addBox(frame, 0.16, 1.75, 0.16, px, y + 0.88, pz, rot);
  }
  const fm = mergedMesh(frame, mats.wallDark, true, true);
  if (fm) group.add(fm);
}

export function createCausewayDetail({ points, width = 8, y = 0.55, name = '' }) {
  const group = new THREE.Group();
  const curve = new THREE.CatmullRomCurve3(
    points.map((p) => new THREE.Vector3(p[0], 0, p[1])), false, 'catmullrom', 0.25
  );
  const len = curve.getLength();
  const n = Math.max(5, Math.round(len / 20));
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const p = curve.getPoint(t);
    const tan = curve.getTangent(t);
    const nx = -tan.z;
    const nz = tan.x;
    const side = i % 2 === 0 ? 1 : -1;
    const off = width * 0.5 - 1.0;
    const x = p.x + nx * side * off;
    const z = p.z + nz * side * off;
    if (i % 3 === 0) {
      const b = createBench({ x, z, rot: Math.atan2(tan.x, tan.z) + Math.PI * 0.5, length: 2.2 });
      b.position.y = y + 0.02;
      group.add(b);
    } else {
      const l = createStoneLantern({ x, z, scale: 0.92 });
      l.position.y = y + 0.02;
      group.add(l);
    }
  }
  const edge = [];
  const steps = Math.max(40, Math.round(len / 2.2));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const p = curve.getPoint(t);
    const tan = curve.getTangent(t);
    const nx = -tan.z;
    const nz = tan.x;
    for (const side of [-1, 1]) {
      const o = width * 0.5 + 0.32;
      const g = new THREE.BoxGeometry(0.42, 0.2, 0.85);
      g.rotateY(Math.atan2(tan.x, tan.z));
      g.translate(p.x + nx * side * o, y - 0.1, p.z + nz * side * o);
      edge.push(g);
    }
  }
  const em = mergedMesh(edge, mats.stone, true, true);
  if (em) group.add(em);
  if (name) {
    const t = 0.04;
    const p = curve.getPoint(t);
    const tan = curve.getTangent(t);
    const nx = -tan.z;
    const nz = tan.x;
    const x = p.x + nx * (width * 0.5 + 2.2);
    const z = p.z + nz * (width * 0.5 + 2.2);
    addSign(group, name, x, y, z, Math.atan2(tan.x, tan.z));
  }
  return group;
}

export function createLeifengDetail({ x, z, baseY }) {
  const group = new THREE.Group();
  const rocks = [];
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2 + rnd(31, i) * 0.3;
    const r = 15 + rnd(31, i + 4) * 10;
    const g = new THREE.IcosahedronGeometry(1.2 + rnd(31, i + 8) * 1.7, 0);
    g.scale(1.35, 0.68, 1.05);
    g.rotateY(rnd(31, i + 12) * 6.28);
    g.translate(x + Math.cos(a) * r, baseY - 0.9 + rnd(31, i + 16) * 0.5, z + Math.sin(a) * r);
    rocks.push(g);
  }
  const rm = mergedMesh(rocks, mats.pagodaStone, true, true);
  if (rm) group.add(rm);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + 0.35;
    const r = 16 + (i % 4) * 3.4;
    const px = x + Math.cos(a) * r;
    const pz = z + Math.sin(a) * r;
    if (i % 3 === 0) {
      const w = createWillow({ height: 6.8 + (i % 3) * 0.7, spread: 2.4, seed: 400 + i });
      w.position.set(px, baseY - 1.2, pz);
      group.add(w);
    } else {
      const p = createTree({ height: 7.6 + (i % 4) * 0.9, spread: 2.6, kind: 'pine', seed: 410 + i });
      p.position.set(px, baseY - 1.2, pz);
      group.add(p);
    }
  }
  const rail = [];
  const R = 12.7;
  for (let k = 0; k < 8; k++) {
    const a0 = (k / 8) * Math.PI * 2 + Math.PI / 8;
    const a1 = ((k + 1) / 8) * Math.PI * 2 + Math.PI / 8;
    const x0 = Math.cos(a0) * R;
    const z0 = Math.sin(a0) * R;
    const x1 = Math.cos(a1) * R;
    const z1 = Math.sin(a1) * R;
    addCylinder(rail, 0.13, 0.15, 0.95, 6, x + x0, baseY + 2.85, z + z0);
    addCylinder(rail, 0.13, 0.15, 0.95, 6, x + x1, baseY + 2.85, z + z1);
    const g = new THREE.BoxGeometry(0.15, 0.15, Math.hypot(x1 - x0, z1 - z0));
    g.rotateY(Math.atan2(x1 - x0, z1 - z0));
    g.translate(x + (x0 + x1) / 2, baseY + 3.22, z + (z0 + z1) / 2);
    rail.push(g);
  }
  for (let k = 0; k < 6; k++) {
    addBox(rail, 4.6, 0.42, 0.8, x, baseY + 0.2 + k * 0.4, z + R + 1.0 - k * 0.6);
  }
  const rlm = mergedMesh(rail, mats.marbleShade, true, true);
  if (rlm) group.add(rlm);
  for (const sx of [-1, 1]) {
    const l = createStoneLantern({ x: x + sx * 10.5, z: z + 9.5, scale: 1.15 });
    l.position.y = baseY + 2.45;
    group.add(l);
  }
  for (const [dx, dz] of [[-7, 11], [7, 11]]) {
    const b = createBench({ x: x + dx, z: z + dz, rot: Math.PI, length: 2.8 });
    b.position.y = baseY + 2.45;
    group.add(b);
  }
  return group;
}

export function createSantanDetail({ x, z, rx, rz, h }) {
  const group = new THREE.Group();
  const rocks = [];
  for (let i = 0; i < 34; i++) {
    const a = (i / 34) * Math.PI * 2 + rnd(61, i) * 0.22;
    const f = 0.87 + rnd(61, i + 5) * 0.16;
    const px = x + Math.cos(a) * rx * f;
    const pz = z + Math.sin(a) * rz * f;
    const g = new THREE.IcosahedronGeometry(1.1 + rnd(61, i + 9) * 1.5, 0);
    g.scale(1.5, 0.62, 1.05);
    g.rotateY(rnd(61, i + 13) * 6.28);
    g.translate(px, h * 0.38, pz);
    rocks.push(g);
  }
  const rm = mergedMesh(rocks, mats.pagodaStone, true, true);
  if (rm) group.add(rm);
  const wall = [];
  for (let i = 0; i < 5; i++) {
    const a0 = -0.4 + i * 0.34;
    const a1 = a0 + 0.26;
    const p0 = [x + Math.cos(a0) * rx * 0.72, z + Math.sin(a0) * rz * 0.72];
    const p1 = [x + Math.cos(a1) * rx * 0.72, z + Math.sin(a1) * rz * 0.72];
    const g = new THREE.BoxGeometry(0.62, 1.35, Math.hypot(p1[0] - p0[0], p1[1] - p0[1]));
    g.rotateY(Math.atan2(p1[0] - p0[0], p1[1] - p0[1]));
    g.translate((p0[0] + p1[0]) / 2, h + 0.6, (p0[1] + p1[1]) / 2);
    wall.push(g);
  }
  const wm = mergedMesh(wall, mats.stone, true, true);
  if (wm) group.add(wm);
  for (let i = 0; i < 5; i++) {
    const a = 1.4 + i * 0.6;
    const px = x + Math.cos(a) * rx * 0.72;
    const pz = z + Math.sin(a) * rz * 0.72;
    if (i % 2 === 0) {
      const p = createTree({ height: 6.4 + (i % 3) * 0.8, spread: 2.4, kind: 'pine', seed: 510 + i });
      p.position.set(px, h, pz);
      group.add(p);
    } else {
      const w = createWillow({ height: 5.8, spread: 2.2, seed: 520 + i });
      w.position.set(px, h, pz);
      group.add(w);
    }
  }
  for (const [dx, dz, ry] of [[-8, -3, 0.5], [6, 4, 2.2], [-1, 8, 3.4]]) {
    const b = createBench({ x: x + dx, z: z + dz, rot: ry, length: 2.1 });
    b.position.y = h + 0.02;
    group.add(b);
  }
  const petals = createFallenPetals({ x: x + 3, z: z + 5, radius: 4.5, count: 44, seed: 77 });
  petals.position.y = h;
  group.add(petals);
  return group;
}

export function createGushanDetail({ x, z, rx, rz, h }) {
  const group = new THREE.Group();
  const rocks = [];
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2 + rnd(81, i) * 0.25;
    const f = 0.8 + rnd(81, i + 4) * 0.2;
    const px = x + Math.cos(a) * rx * f;
    const pz = z + Math.sin(a) * rz * f;
    const g = new THREE.IcosahedronGeometry(1.0 + rnd(81, i + 8) * 1.8, 0);
    g.scale(1.4, 0.7, 1.1);
    g.rotateY(rnd(81, i + 12) * 6.28);
    g.translate(px, h * 0.3, pz);
    rocks.push(g);
  }
  const rm = mergedMesh(rocks, mats.pagodaStone, true, true);
  if (rm) group.add(rm);
  for (let i = 0; i < 8; i++) {
    const a = 1.1 + i * 0.58;
    const r = 0.62 + (i % 3) * 0.08;
    const px = x + Math.cos(a) * rx * r;
    const pz = z + Math.sin(a) * rz * r;
    if (i % 3 === 0) {
      const w = createWillow({ height: 6.6 + (i % 2) * 0.8, spread: 2.3, seed: 610 + i });
      w.position.set(px, h, pz);
      group.add(w);
    } else {
      const p = createTree({ height: 7.0 + (i % 4) * 0.9, spread: 2.5, kind: 'pine', seed: 620 + i });
      p.position.set(px, h, pz);
      group.add(p);
    }
  }
  for (const [dx, dz, ry] of [[-16, -62, 0.4], [-51, -79, 2.3], [-36, -80, 1.2]]) {
    const b = createBench({ x: dx, z: dz, rot: ry, length: 2.2 });
    b.position.y = h + 0.02;
    group.add(b);
  }
  for (const [px, pz] of [[-12, -62], [-50, -82], [-30, -88]]) {
    const l = createStoneLantern({ x: px, z: pz, scale: 0.85 });
    l.position.y = h + 0.02;
    group.add(l);
  }
  const cranes = [];
  for (const [cx, cz, ry] of [[-19, -66, 0.5], [-15, -68, 2.2]]) {
    const body = new THREE.SphereGeometry(0.34, 10, 8);
    body.scale(1.5, 0.9, 0.8);
    body.translate(cx, h + 1.15, cz);
    cranes.push(body);
    const neck = new THREE.CylinderGeometry(0.07, 0.1, 1.1, 6);
    neck.rotateZ(-0.35);
    neck.translate(cx + 0.42, h + 1.72, cz);
    cranes.push(neck);
    const head = new THREE.SphereGeometry(0.14, 8, 6);
    head.translate(cx + 0.62, h + 2.25, cz);
    cranes.push(head);
    const beak = new THREE.ConeGeometry(0.05, 0.34, 5);
    beak.rotateZ(-Math.PI / 2);
    beak.translate(cx + 0.82, h + 2.24, cz);
    cranes.push(beak);
    for (const sx of [-0.2, 0.2]) {
      const leg = new THREE.CylinderGeometry(0.035, 0.035, 0.62, 4);
      leg.translate(cx + sx, h + 0.31, cz);
      cranes.push(leg);
    }
    const tail = new THREE.ConeGeometry(0.2, 0.5, 5);
    tail.rotateZ(Math.PI / 2);
    tail.translate(cx - 0.55, h + 1.15, cz);
    cranes.push(tail);
    if (ry > 1.5) tail.translate(0, 0, 0.3);
  }
  const cm = mergedMesh(cranes, mats.marble, true, true);
  if (cm) group.add(cm);
  const wall = [];
  for (let i = 0; i < 4; i++) {
    addBox(wall, 5.5, 1.15, 0.5, x - 20 + i * 6.2, h + 0.57, z - 10, 0.12);
  }
  const wm = mergedMesh(wall, mats.stone, true, true);
  if (wm) group.add(wm);
  return group;
}

export function createShoreMist(lake, pagodaPoints = []) {
  const group = new THREE.Group();
  const curve = new THREE.CatmullRomCurve3(
    lake.map((p) => new THREE.Vector3(p[0], 0, p[1])), true, 'catmullrom', 0.35
  );
  const pts = curve.getSpacedPoints(240);
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const dx = p.x;
    const dz = p.z - 10;
    const d = Math.hypot(dx, dz) || 1;
    const nx = -dx / d;
    const nz = -dz / d;
    const w = 0.5 + 0.45 * Math.abs(Math.sin(i * 0.41));
    positions.push(p.x + nx * w, 0.16, p.z + nz * w);
    positions.push(p.x - nx * 0.25, 0.15, p.z - nz * 0.25);
    uvs.push(0, 0, 1, 1);
  }
  for (let i = 0; i < pts.length; i++) {
    const a = i * 2;
    const b = ((i + 1) % pts.length) * 2;
    indices.push(a, b, a + 1, a + 1, b, b + 1);
  }
  const foam = new THREE.BufferGeometry();
  foam.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  foam.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  foam.setIndex(indices);
  foam.computeVertexNormals();
  const rings = [];
  for (const [x, z] of pagodaPoints) {
    const ring = new THREE.RingGeometry(1.5, 2.15, 28);
    ring.rotateX(-Math.PI / 2);
    ring.translate(x, 0.17, z);
    rings.push(ring);
    const ring2 = new THREE.RingGeometry(2.5, 2.62, 28);
    ring2.rotateX(-Math.PI / 2);
    ring2.translate(x, 0.17, z);
    rings.push(ring2);
  }
  const fm = mergedMesh([foam], mats.snow, false, true);
  if (fm) group.add(fm);
  if (rings.length) {
    const rm = mergedMesh(rings, mats.causeway, false, true);
    if (rm) group.add(rm);
  }
  return group;
}
