import * as THREE from 'three';
import { mats } from './materials.js';
import { addBox, addCylinder, addBar, mergedMesh } from './geometry.js';
import { createRoof } from './roof.js';
import { getPlaqueMaterial } from './gardenBuild.js';
import { createGardenLife } from './richLife.js';

function addRod(list, ax, ay, az, bx, by, bz, r = 0.08, seg = 4) {
  const dx = bx - ax;
  const dy = by - ay;
  const dz = bz - az;
  const len = Math.hypot(dx, dy, dz);
  if (len < 0.001) return;
  const g = new THREE.CylinderGeometry(r, r, len, seg);
  g.translate(0, len / 2, 0);
  const q = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(dx, dy, dz).normalize()
  );
  g.applyQuaternion(q);
  g.translate(ax, ay, az);
  list.push(g);
}

export function createCauseway({ points, width = 8, y = 0.55 }) {
  const curve = new THREE.CatmullRomCurve3(
    points.map((p) => new THREE.Vector3(p[0], 0, p[1])),
    false,
    'catmullrom',
    0.25
  );
  const segs = Math.max(24, Math.round(curve.getLength() / 4));
  const pts = curve.getSpacedPoints(segs);
  const deck = [];
  const edge = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    if (len < 0.01) continue;
    const ang = Math.atan2(b.x - a.x, b.z - a.z);
    const g = new THREE.BoxGeometry(width, 0.7, len + 0.5);
    g.rotateY(ang);
    g.translate((a.x + b.x) / 2, y - 0.35, (a.z + b.z) / 2);
    deck.push(g);
    for (const side of [-1, 1]) {
      const px = Math.cos(ang) * side * (width / 2 + 0.25);
      const pz = -Math.sin(ang) * side * (width / 2 + 0.25);
      const c = new THREE.BoxGeometry(0.55, 0.75, len + 0.55);
      c.rotateY(ang);
      c.translate((a.x + b.x) / 2 + px, y - 0.33, (a.z + b.z) / 2 + pz);
      edge.push(c);
    }
  }
  const group = new THREE.Group();
  const dm = mergedMesh(deck, mats.causeway, true, true);
  if (dm) group.add(dm);
  const em = mergedMesh(edge, mats.stone, true, true);
  if (em) group.add(em);
  return group;
}

function archY(t, span, rise, baseY) {
  return baseY + 0.35 + rise * Math.cos(Math.max(-1, Math.min(1, t)) * Math.PI * 0.5);
}

export function createStoneBridge({ x = 0, z = 0, rot = 0, span = 14, width = 5.2, rise = 2.2, snow = false, name = '' }) {
  const group = new THREE.Group();
  const segs = 16;
  const deck = [];
  const rail = [];
  const stone = [];
  const weather = [];
  const snowCap = [];
  const topMat = snow ? mats.snow : mats.stone;
  const baseY = 0.2;
  for (let i = 0; i < segs; i++) {
    const t0 = -1 + (2 * i) / segs;
    const t1 = -1 + (2 * (i + 1)) / segs;
    const z0 = (t0 * span) / 2;
    const z1 = (t1 * span) / 2;
    const y0 = archY(t0, span, rise, baseY);
    const y1 = archY(t1, span, rise, baseY);
    const g = new THREE.BoxGeometry(width, 0.32, (z1 - z0) * 1.06);
    g.rotateX(-Math.atan2(y1 - y0, z1 - z0));
    g.translate(0, (y0 + y1) / 2, (z0 + z1) / 2);
    deck.push(g);
    if (snow) {
      const s = new THREE.BoxGeometry(width * 0.92, 0.06, (z1 - z0) * 0.98);
      s.rotateX(-Math.atan2(y1 - y0, z1 - z0));
      s.translate(0, (y0 + y1) / 2 + 0.19, (z0 + z1) / 2);
      rail.push(s);
    }
  }
  for (const side of [-1, 1]) {
    for (let i = 0; i <= 10; i++) {
      const t = -1 + (2 * i) / 10;
      const zz = (t * span) / 2;
      const yy = archY(t, span, rise, baseY);
      addBox(rail, 0.22, 0.9, 0.22, side * (width / 2 - 0.1), yy + 0.62, zz);
      if (snow) addBox(snowCap, 0.3, 0.08, 0.3, side * (width / 2 - 0.1), yy + 1.11, zz);
      if (i < 10) {
        const t2 = -1 + (2 * (i + 1)) / 10;
        const z2 = (t2 * span) / 2;
        const y2 = archY(t2, span, rise, baseY);
        addBar(rail, side * (width / 2 - 0.1), zz, side * (width / 2 - 0.1), z2, (yy + y2) / 2 + 1.02, 0.14, 0.16);
        addBox(stone, 0.1, 0.44, Math.abs(z2 - zz) * 0.72, side * (width / 2 - 0.06), (yy + y2) / 2 + 0.52, (zz + z2) / 2);
        if (snow) addBox(snowCap, 0.12, 0.06, Math.abs(z2 - zz) * 0.7, side * (width / 2 - 0.06), (yy + y2) / 2 + 0.77, (zz + z2) / 2);
      }
    }
    for (let i = 0; i < 14; i++) {
      const t0 = -1 + (2 * i) / 14;
      const t1 = -1 + (2 * (i + 1)) / 14;
      const tm = (t0 + t1) / 2;
      const zm = (tm * span) / 2;
      const y0 = archY(t0, span, rise, baseY);
      const y1 = archY(t1, span, rise, baseY);
      const dz = ((t1 - t0) * span) / 2;
      const dy = y1 - y0;
      const g = new THREE.BoxGeometry(0.2, 0.4, Math.hypot(dz, dy) * 0.94);
      g.rotateX(-Math.atan2(dy, dz));
      g.translate(side * (width / 2 + 0.07), (y0 + y1) / 2 - 0.24, zm);
      stone.push(g);
    }
    for (let i = 0; i < 8; i++) {
      const t = -0.86 + (1.72 * i) / 8;
      const zz = (t * span) / 2;
      const yy = archY(t, span, rise, baseY);
      addBox(weather, 0.07, 0.18 + (i % 3) * 0.11, 0.42 + (i % 2) * 0.2, side * (width / 2 + 0.13), yy - 0.52, zz);
    }
  }
  for (const s of [-1, 1]) {
    for (let k = 0; k < 3; k++) {
      addBox(stone, width * 0.96, 0.16, 0.62, 0, baseY + 0.32 + k * 0.15, s * (span / 2 + 0.85 - k * 0.5));
    }
  }
  const dm = mergedMesh(deck, topMat, true, true);
  if (dm) group.add(dm);
  const rm = mergedMesh(rail, topMat, true, true);
  if (rm) group.add(rm);
  const sm = mergedMesh(stone, mats.stone, true, true);
  if (sm) group.add(sm);
  if (weather.length) {
    const wm = mergedMesh(weather, mats.pagodaStone, true, true);
    if (wm) group.add(wm);
  }
  if (snowCap.length) {
    const cm = mergedMesh(snowCap, mats.snow, true, true);
    if (cm) group.add(cm);
  }
  const arch = new THREE.Mesh(new THREE.TorusGeometry(span * 0.31, 0.25, 6, 22, Math.PI), mats.stone);
  arch.rotation.y = Math.PI / 2;
  arch.position.y = 0.22;
  group.add(arch);
  if (name === '断桥残雪') {
    const board = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.75), getPlaqueMaterial(name));
    board.position.set(width * 0.5 + 1.5, baseY + 1.55, span * 0.5 + 1.1);
    group.add(board);
    const frame = [];
    addBox(frame, 0.16, 2.4, 0.16, width * 0.5 + 0.35, baseY + 1.2, span * 0.5 + 1.2);
    addBox(frame, 0.16, 2.4, 0.16, width * 0.5 + 2.65, baseY + 1.2, span * 0.5 + 1.2);
    addBox(frame, 2.6, 0.14, 0.2, width * 0.5 + 1.5, baseY + 2.02, span * 0.5 + 1.15);
    const fm = mergedMesh(frame, mats.stone, true, true);
    if (fm) group.add(fm);
  }
  group.position.set(x, 0, z);
  group.rotation.y = rot;
  group.userData = { span, width, rise, baseY };
  return group;
}

export function createIslet({ x = 0, z = 0, rx = 12, rz = 9, h = 0.9, mat = mats.stone }) {
  const group = new THREE.Group();
  const bank = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.12, h + 0.5, 30), mat);
  bank.scale.set(rx, 1, rz);
  bank.position.set(x, (h - 0.5) / 2, z);
  bank.castShadow = true;
  bank.receiveShadow = true;
  group.add(bank);
  const top = new THREE.Mesh(new THREE.CircleGeometry(1, 34), mats.grass);
  top.rotation.x = -Math.PI / 2;
  top.scale.set(rx * 0.985, rz * 0.985, 1);
  top.position.set(x, h, z);
  top.receiveShadow = true;
  group.add(top);
  return group;
}

export function createHill({ x = 0, z = 0, rx = 70, rz = 50, h = 24, mat = mats.hill, seed = 1 }) {
  const group = new THREE.Group();
  const geo = new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.5);
  geo.scale(rx, h, rz);
  const rnd = (n) => {
    const v = Math.sin(seed * 41.7 + n * 57.1) * 43758.5453;
    return v - Math.floor(v);
  };
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const px = pos.getX(i);
    const pz = pos.getZ(i);
    const edge = Math.hypot(px / rx, pz / rz);
    const bump = 1 + (rnd(i) - 0.5) * 0.18 * (1 - edge * 0.4);
    pos.setX(i, px * bump);
    pos.setZ(i, pz * bump);
    pos.setY(i, pos.getY(i) * (0.86 + rnd(i + 7) * 0.26));
  }
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, -1.5, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return group;
}

export function createPeachTree({ height = 6.2, spread = 2.2, seed = 1 }) {
  const group = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.3, height * 0.58, 7), mats.trunk);
  trunk.position.y = height * 0.29;
  trunk.castShadow = true;
  group.add(trunk);
  const rnd = (n) => {
    const v = Math.sin(seed * 63.1 + n * 47.9) * 43758.5453;
    return v - Math.floor(v);
  };
  const blossom = [];
  const deep = [];
  for (let i = 0; i < 10; i++) {
    const r = spread * (0.42 + rnd(i) * 0.42);
    const blob = new THREE.IcosahedronGeometry(r, 1);
    blob.scale(1.1, 0.82, 1.05);
    blob.translate(
      (rnd(i + 5) - 0.5) * spread * 1.7,
      height * (0.56 + rnd(i + 9) * 0.34),
      (rnd(i + 13) - 0.5) * spread * 1.7
    );
    if (i % 3 === 0) deep.push(blob);
    else blossom.push(blob);
  }
  const bm = mergedMesh(blossom, mats.peach, true, true);
  if (bm) group.add(bm);
  const dm = mergedMesh(deep, mats.peachDeep, true, true);
  if (dm) group.add(dm);
  return group;
}

export function createLeifengPagoda({ x = 0, z = 0, baseY = 26, scale = 1 }) {
  const group = new THREE.Group();
  const base = [];
  addCylinder(base, 11.5, 13.2, 2.4, 8, 0, 1.2, 0);
  addCylinder(base, 9.4, 10.4, 1.2, 8, 0, 3.0, 0);
  const bm = mergedMesh(base, mats.marbleShade, true, true);
  if (bm) group.add(bm);
  const plinth = [];
  addCylinder(plinth, 11.7, 12.0, 0.22, 8, 0, 2.42, 0);
  for (let k = 0; k < 6; k++) {
    addBox(plinth, 4.8, 0.4, 0.58, 0, 0.2 + k * 0.4, 10.5 + (5 - k) * 0.55);
  }
  addBox(plinth, 5.4, 1.0, 0.5, 0, 0.5, 10.6);
  const plm = mergedMesh(plinth, mats.stone, true, true);
  if (plm) group.add(plm);
  const cornerLantern = [];
  const lanternGlow = [];
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
    const lx = Math.cos(a) * 11.6;
    const lz = Math.sin(a) * 11.6;
    addCylinder(cornerLantern, 0.1, 0.14, 2.1, 6, lx, 3.35, lz);
    addCylinder(cornerLantern, 0.32, 0.26, 0.16, 6, lx, 4.45, lz);
    const bulb = new THREE.SphereGeometry(0.3, 8, 6);
    bulb.scale(1, 1.2, 1);
    bulb.translate(lx, 4.2, lz);
    lanternGlow.push(bulb);
  }
  const clm = mergedMesh(cornerLantern, mats.wood, true, true);
  if (clm) group.add(clm);
  const lg = mergedMesh(lanternGlow, mats.lanternRed, true, false);
  if (lg) group.add(lg);

  let y = 3.4;
  const tiers = [
    [7.1, 8.5, 5.4],
    [6.4, 7.5, 4.6],
    [5.7, 6.6, 4.1],
    [5.0, 5.8, 3.7],
    [4.2, 5.0, 3.4],
  ];
  tiers.forEach(([rt, rb, h], i) => {
    const body = [];
    addCylinder(body, rt, rb, h, 8, 0, y + h / 2, 0);
    const bmesh = mergedMesh(body, mats.leifeng, true, true);
    if (bmesh) group.add(bmesh);
    const cols = [];
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
      addCylinder(cols, 0.18, 0.2, h, 6, Math.cos(a) * (rb + 0.35), y + h / 2, Math.sin(a) * (rb + 0.35));
    }
    const cm = mergedMesh(cols, mats.wallDark, true, true);
    if (cm) group.add(cm);
    const win = [];
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
      addBox(win, 0.9, h * 0.55, 0.12, Math.cos(a) * (rb + 0.06), y + h * 0.46, Math.sin(a) * (rb + 0.06), -a);
    }
    const wm = mergedMesh(win, mats.wood, false, false);
    if (wm) group.add(wm);
    const ring = [];
    addCylinder(ring, rb + 1.05, rb + 1.15, 0.34, 8, 0, y + h - 0.2, 0);
    const rim = mergedMesh(ring, mats.wallDark, true, true);
    if (rim) group.add(rim);
    const balcony = [];
    addCylinder(balcony, rb + 1.35, rb + 1.5, 0.24, 8, 0, y + h - 0.45, 0);
    addCylinder(balcony, rb + 1.45, rb + 1.55, 0.12, 8, 0, y + h - 0.72, 0);
    const bfm = mergedMesh(balcony, mats.leifeng, true, true);
    if (bfm) group.add(bfm);
    const balRail = [];
    const RR = rb + 1.55;
    for (let k = 0; k < 8; k++) {
      const a0 = (k / 8) * Math.PI * 2 + Math.PI / 8;
      const a1 = ((k + 1) / 8) * Math.PI * 2 + Math.PI / 8;
      addCylinder(balRail, 0.06, 0.07, 0.72, 5, Math.cos(a0) * RR, y + h - 0.08, Math.sin(a0) * RR);
      addBar(balRail, Math.cos(a0) * RR, Math.sin(a0) * RR, Math.cos(a1) * RR, Math.sin(a1) * RR, y + h + 0.22, 0.08, 0.08);
      addBar(balRail, Math.cos(a0) * RR, Math.sin(a0) * RR, Math.cos(a1) * RR, Math.sin(a1) * RR, y + h - 0.08, 0.05, 0.05);
    }
    const brm = mergedMesh(balRail, mats.marbleShade, true, true);
    if (brm) group.add(brm);
    const eaveDark = [];
    const brackets = [];
    const hang = [];
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
      const bx = Math.cos(a) * (rb + 1.05);
      const bz = Math.sin(a) * (rb + 1.05);
      addBox(brackets, 0.92, 0.16, 0.4, bx, y + h - 0.02, bz, -a);
      addBox(brackets, 0.58, 0.18, 0.58, bx, y + h + 0.16, bz, -a);
      addBox(brackets, 0.34, 0.18, 0.74, bx, y + h + 0.36, bz, -a);
      const ex = Math.cos(a) * (rb + 2.5);
      const ez = Math.sin(a) * (rb + 2.5);
      addRod(eaveDark, ex, y + h - 0.03, ez, 0, y + h + 2.15, 0, 0.07, 4);
      addRod(eaveDark, ex, y + h - 0.02, ez, Math.cos(a) * (rb + 3.15), y + h + 0.62, Math.sin(a) * (rb + 3.15), 0.065, 4);
      const lx = Math.cos(a) * (rb + 2.12);
      const lz = Math.sin(a) * (rb + 2.12);
      addRod(eaveDark, lx, y + h + 0.02, lz, lx, y + h - 0.48, lz, 0.025, 4);
      const bulb = new THREE.SphereGeometry(0.19, 8, 6);
      bulb.scale(1, 1.35, 1);
      bulb.translate(lx, y + h - 0.72, lz);
      hang.push(bulb);
    }
    const ebm = mergedMesh(brackets, mats.wallDark, true, true);
    if (ebm) group.add(ebm);
    const edm = mergedMesh(eaveDark, mats.roofDark, true, true);
    if (edm) group.add(edm);
    const hgm = mergedMesh(hang, mats.lanternRed, true, false);
    if (hgm) group.add(hgm);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(rb + 2.5, 2.2 + i * 0.05, 8), mats.roofDark);
    roof.position.y = y + h + 1.05;
    roof.rotation.y = Math.PI / 8;
    roof.castShadow = true;
    group.add(roof);
    const eave = new THREE.Mesh(new THREE.TorusGeometry(rb + 2.2, 0.16, 5, 8), mats.roofDark);
    eave.rotation.x = Math.PI / 2;
    eave.rotation.z = Math.PI / 8;
    eave.position.y = y + h + 0.12;
    group.add(eave);
    y += h + 0.7;
  });

  const spire = [];
  addCylinder(spire, 0.32, 0.55, 3.4, 8, 0, y + 1.9, 0);
  for (let i = 0; i < 7; i++) {
    const rr = 1.02 - i * 0.1;
    addCylinder(spire, rr, rr, 0.13, 8, 0, y + 0.5 + i * 0.43, 0);
  }
  for (let i = 0; i < 4; i++) {
    const rr = 3.1 - i * 0.62;
    addCylinder(spire, rr, rr * 0.88, 0.1, 8, 0, y + 2.95 + i * 0.16, 0);
  }
  const ball = new THREE.SphereGeometry(0.5, 10, 8);
  ball.translate(0, y + 3.75, 0);
  spire.push(ball);
  const tip = new THREE.ConeGeometry(0.18, 0.9, 6);
  tip.translate(0, y + 4.55, 0);
  spire.push(tip);
  const sm = mergedMesh(spire, mats.boatGold, true, false);
  if (sm) group.add(sm);

  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.05), getPlaqueMaterial('雷峰塔'));
  plaque.position.set(0, 3.0, 9.3);
  group.add(plaque);
  group.position.set(x, baseY, z);
  group.scale.setScalar(scale);
  return group;
}

export function createSlenderPagoda({ x = 0, z = 0, baseY = 22, scale = 1 }) {
  const group = new THREE.Group();
  const list = [];
  addCylinder(list, 3.2, 4.0, 2.2, 6, 0, 1.1, 0);
  addCylinder(list, 1.95, 2.3, 24, 6, 0, 14.2, 0);
  for (let i = 0; i < 7; i++) {
    const yy = 3.6 + i * 3.3;
    addCylinder(list, 3.0 - i * 0.16, 3.0 - i * 0.16, 0.3, 6, 0, yy, 0);
    addCylinder(list, 2.65 - i * 0.14, 2.65 - i * 0.14, 0.18, 6, 0, yy + 0.32, 0);
    addCylinder(list, 2.0, 2.0, 0.55, 6, 0, yy + 0.62, 0);
  }
  addCylinder(list, 1.5, 1.8, 1.2, 6, 0, 26.4, 0);
  addCylinder(list, 0.14, 0.34, 5.2, 6, 0, 29.6, 0);
  for (let i = 0; i < 4; i++) {
    addCylinder(list, 0.45, 0.45, 0.1, 6, 0, 28.4 + i * 0.75, 0);
  }
  const sm = mergedMesh(list, mats.pagodaStone, true, true);
  if (sm) group.add(sm);
  group.position.set(x, baseY, z);
  group.scale.setScalar(scale);
  return group;
}

export function createThreePagodas({ points = [] }) {
  const group = new THREE.Group();
  points.forEach(([x, z]) => {
    const g = new THREE.Group();
    const parts = [];
    addCylinder(parts, 1.55, 1.85, 0.8, 8, 0, 0.4, 0);
    addCylinder(parts, 1.05, 1.25, 0.34, 8, 0, 0.92, 0);
    addCylinder(parts, 0.85, 1.0, 2.2, 8, 0, 2.1, 0);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const g0 = new THREE.BoxGeometry(0.34, 0.14, 0.7);
      g0.rotateY(-a);
      g0.translate(Math.cos(a) * 1.3, 0.18, Math.sin(a) * 1.3);
      parts.push(g0);
    }
    const bulb = new THREE.SphereGeometry(1.15, 12, 9);
    bulb.scale(1, 1.15, 1);
    bulb.translate(0, 3.55, 0);
    parts.push(bulb);
    addCylinder(parts, 1.35, 1.05, 0.5, 8, 0, 4.45, 0);
    addCylinder(parts, 0.5, 0.65, 0.34, 8, 0, 4.85, 0);
    const cap = new THREE.ConeGeometry(1.55, 1.5, 8);
    cap.translate(0, 5.25, 0);
    parts.push(cap);
    addCylinder(parts, 0.1, 0.16, 1.2, 6, 0, 6.35, 0);
    for (let i = 0; i < 3; i++) {
      const rr = 0.44 - i * 0.1;
      addCylinder(parts, rr, rr, 0.09, 6, 0, 6.18 + i * 0.18, 0);
    }
    const top = new THREE.SphereGeometry(0.17, 8, 6);
    top.translate(0, 6.98, 0);
    parts.push(top);
    const m = mergedMesh(parts, mats.pagodaStone, true, true);
    if (m) g.add(m);
    const holes = [];
    for (const yy of [2.72, 3.4, 4.08]) {
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + yy;
        addBox(holes, 0.3, 0.34, 0.1, Math.cos(a) * 1.09, yy, Math.sin(a) * 1.09, -a);
      }
    }
    const hm = mergedMesh(holes, mats.wood, false, false);
    if (hm) g.add(hm);
    g.position.set(x, 0.1, z);
    group.add(g);
  });
  return group;
}

export function createGardenBoat({ name = '画舫' } = {}) {
  const group = new THREE.Group();
  const hullParts = [];
  addBox(hullParts, 12.5, 1.1, 4.2, 0, 0.35, 0);
  const bow = new THREE.ConeGeometry(1.7, 3.0, 4);
  bow.rotateZ(-Math.PI / 2);
  bow.rotateY(Math.PI / 4);
  bow.scale(1, 0.55, 1.25);
  bow.translate(7.2, 0.4, 0);
  hullParts.push(bow);
  addBox(hullParts, 11.8, 0.18, 4.6, 0, 1.0, 0);
  addRod(hullParts, -5.4, 1.1, 1.6, -8.6, 0.1, 3.0, 0.07, 5);
  addRod(hullParts, -5.4, 1.1, -1.6, -8.6, 0.1, -3.0, 0.07, 5);
  for (const sx of [-1, 1]) {
    const glow = new THREE.SphereGeometry(0.32, 8, 6);
    glow.scale(1, 1.25, 1);
    glow.translate(sx * 5.2, 3.2, 0);
    hullParts.push(glow);
  }
  addRod(hullParts, 5.2, 3.55, 0, 5.2, 4.1, 0, 0.04, 4);
  addRod(hullParts, -5.2, 3.55, 0, -5.2, 4.1, 0, 0.04, 4);
  const hm = mergedMesh(hullParts, mats.boatRed, true, true);
  if (hm) group.add(hm);

  const cabinParts = [];
  addBox(cabinParts, 8.4, 2.4, 3.4, -0.4, 2.3, 0);
  addBox(cabinParts, 5.6, 1.4, 2.8, -0.4, 4.2, 0);
  for (const sz of [-1, 1]) {
    for (let i = 0; i < 5; i++) {
      addCylinder(cabinParts, 0.09, 0.1, 2.4, 6, -4.4 + i * 2.0, 2.3, sz * 1.78);
      const a0 = -4.4 + i * 2.0;
      const a1 = a0 + 2.0;
      addRod(cabinParts, a0, 1.5, sz * 1.82, a1, 1.5, sz * 1.82, 0.04, 4);
      addRod(cabinParts, a0, 3.6, sz * 1.82, a1, 3.6, sz * 1.82, 0.05, 4);
    }
  }
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addRod(cabinParts, sx * 4.0, 4.35, sz * 1.55, sx * 4.0, 4.7, sz * 1.55, 0.03, 4);
    }
  }
  const cm = mergedMesh(cabinParts, mats.wall, true, true);
  if (cm) group.add(cm);

  const windows = [];
  const winGeo = new THREE.PlaneGeometry(1.5, 1.25);
  for (const sz of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const w = winGeo.clone();
      w.rotateY(sz > 0 ? 0 : Math.PI);
      w.translate(-3.4 + i * 2.0, 2.35, sz * 1.73);
      windows.push(w);
    }
  }
  const wm = mergedMesh(windows, mats.lattice, false, false);
  if (wm) group.add(wm);

  const roof = createRoof({
    width: 10.6,
    depth: 5.2,
    height: 2.2,
    cornerLift: 0.9,
    curve: 1.55,
    ridgeRatio: 0.55,
    hasRidge: true,
    beasts: false,
  });
  roof.position.set(-0.4, 4.15, 0);
  group.add(roof);
  group.userData.type = 'garden';
  return group;
}

export function createSmallBoat({ red = false } = {}) {
  const group = new THREE.Group();
  const parts = [];
  const hull = new THREE.SphereGeometry(1, 10, 6);
  hull.scale(3.2, 0.55, 0.9);
  hull.translate(0, 0.3, 0);
  parts.push(hull);
  addBox(parts, 4.8, 0.16, 1.45, 0, 0.52, 0);
  addBox(parts, 1.9, 1.0, 1.3, -0.55, 1.0, 0);
  const canopy = new THREE.CylinderGeometry(0.85, 0.85, 2.0, 8, 1, true, 0, Math.PI);
  canopy.rotateZ(Math.PI / 2);
  canopy.rotateY(Math.PI / 2);
  canopy.translate(-0.55, 1.05, 0);
  parts.push(canopy);
  addCylinder(parts, 0.04, 0.05, 3.0, 4, 1.7, 1.05, 0.45);
  addRod(parts, 1.5, 1.0, 0.7, 4.1, 0.16, 1.9, 0.045, 4);
  addRod(parts, -1.1, 1.0, -0.7, -3.5, 0.14, -1.9, 0.045, 4);
  for (let i = 0; i < 4; i++) {
    addRod(parts, -1.45 + i * 0.58, 1.18, -0.86, -1.45 + i * 0.58, 1.18, 0.86, 0.025, 4);
  }
  const m = mergedMesh(parts, red ? mats.boatRed : mats.wood, true, true);
  if (m) group.add(m);
  group.userData.type = 'small';
  return group;
}

export function createLakeLife() {
  const group = new THREE.Group();
  const boats = [];
  const defs = [
    { kind: 'garden', rx: 152, rz: 82, cx: 4, cz: 12, phase: 0.4, speed: 0.006, scale: 1.0 },
    { kind: 'garden', rx: 118, rz: 60, cx: -12, cz: 58, phase: 2.5, speed: -0.005, scale: 0.82 },
    { kind: 'small', rx: 74, rz: 34, cx: -56, cz: 8, phase: 1.1, speed: 0.011, scale: 1.0, red: false },
    { kind: 'small', rx: 62, rz: 26, cx: -18, cz: 78, phase: 3.2, speed: -0.013, scale: 0.9, red: true },
  ];
  defs.forEach((d, i) => {
    const b = d.kind === 'garden' ? createGardenBoat({ name: i === 0 ? '画舫' : '游船' }) : createSmallBoat({ red: d.red });
    b.scale.setScalar(d.scale);
    b.userData.def = d;
    group.add(b);
    boats.push(b);
  });
  function update(t) {
    for (const b of boats) {
      const d = b.userData.def;
      const a = t * d.speed + d.phase;
      const x = d.cx + Math.cos(a) * d.rx;
      const z = d.cz + Math.sin(a) * d.rz;
      const tx = -Math.sin(a) * d.rx;
      const tz = Math.cos(a) * d.rz;
      b.position.set(x, 0.08 + Math.sin(t * 1.4 + d.phase) * 0.06, z);
      b.rotation.y = Math.atan2(tx, tz);
      b.rotation.z = Math.sin(t * 1.1 + d.phase) * 0.012;
    }
  }
  const gardenLife = createGardenLife();
  group.add(gardenLife.group);
  const lakeUpdate = update;
  function updateAll(t, dt) {
    lakeUpdate(t);
    gardenLife.update(t, dt || 0.016);
  }
  updateAll(0, 0.016);
  return { group, update: updateAll };
}
