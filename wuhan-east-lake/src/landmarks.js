import * as THREE from 'three';
import { mats } from './materials.js';
import { addBox, addCylinder, addBar, mergedMesh, createStairs } from './geometry.js';
import { createRoof } from './roof.js';
import { createHexPavilion, getPlaqueMaterial } from './gardenBuild.js';
import { terrainHeight, WATER_Y } from './terrain.js';

function greenRoof(opts) {
  const g = createRoof(opts);
  g.traverse((o) => {
    if (o.isMesh && o.material === mats.roof) o.material = mats.roofGreen;
  });
  return g;
}

function plaque(text, w, h, x, y, z, ry = 0) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), getPlaqueMaterial(text));
  m.position.set(x, y, z);
  m.rotation.y = ry;
  return m;
}

function columnRing(list, w, d, y0, h, step) {
  const nx = Math.max(2, Math.round(w / step));
  const nz = Math.max(2, Math.round(d / step));
  for (let i = 0; i <= nx; i++) {
    const x = -w / 2 + (i * w) / nx;
    addCylinder(list, 0.26, 0.3, h, 8, x, y0 + h / 2, d / 2);
    addCylinder(list, 0.26, 0.3, h, 8, x, y0 + h / 2, -d / 2);
  }
  for (let i = 1; i < nz; i++) {
    const z = -d / 2 + (i * d) / nz;
    addCylinder(list, 0.26, 0.3, h, 8, w / 2, y0 + h / 2, z);
    addCylinder(list, 0.26, 0.3, h, 8, -w / 2, y0 + h / 2, z);
  }
}

function latticeSides(group, w, d, y0, h) {
  const geo = new THREE.PlaneGeometry(1, 1);
  for (const [dx, dz, ry, sw] of [
    [0, d / 2 + 0.06, 0, w],
    [0, -d / 2 - 0.06, Math.PI, w],
    [w / 2 + 0.06, 0, Math.PI / 2, d],
    [-w / 2 - 0.06, 0, -Math.PI / 2, d],
  ]) {
    const m = new THREE.Mesh(geo, mats.lattice);
    m.position.set(dx, y0 + h * 0.56, dz);
    m.rotation.y = ry;
    m.scale.set(sw * 0.46, h * 0.5, 1);
    group.add(m);
  }
}

function woodRailRing(list, w, d, y) {
  for (const sz of [-1, 1]) {
    addBox(list, w + 0.4, 0.1, 0.1, 0, y + 0.9, (sz * d) / 2);
    addBox(list, w + 0.4, 0.08, 0.08, 0, y + 0.45, (sz * d) / 2);
  }
  for (const sx of [-1, 1]) {
    addBox(list, 0.1, 0.1, d + 0.4, (sx * w) / 2, y + 0.9, 0);
    addBox(list, 0.08, 0.08, d + 0.4, (sx * w) / 2, y + 0.45, 0);
  }
}

export function createXingyin({ x, z }) {
  const group = new THREE.Group();
  const baseY = terrainHeight(x, z);
  const stone = [];
  addBox(stone, 24, 2.2, 24, 0, 1.1, 0);
  addBox(stone, 19, 1.0, 19, 0, 2.7, 0);
  const sm = mergedMesh(stone, mats.marbleShade, true, true);
  if (sm) group.add(sm);

  const cols = [];
  const tiers = [
    { w: 14, h: 5.0, y: 3.2, rw: 20.5, rh: 3.6 },
    { w: 10, h: 3.8, y: 9.4, rw: 15.5, rh: 3.1 },
    { w: 6.8, h: 3.0, y: 14.6, rw: 11.5, rh: 3.2 },
  ];
  tiers.forEach((t, i) => {
    const body = new THREE.Mesh(new THREE.BoxGeometry(t.w, t.h, t.w), mats.wall);
    body.position.y = t.y + t.h / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);
    latticeSides(group, t.w, t.w, t.y, t.h);
    columnRing(cols, t.w + 0.5, t.w + 0.5, t.y, t.h, 3.4);
    woodRailRing(cols, t.w + 1.4, t.w + 1.4, t.y + 0.1);
    const roof = greenRoof({
      width: t.rw,
      depth: t.rw,
      height: t.rh,
      cornerLift: 1.1 + i * 0.08,
      curve: 1.6,
      ridgeRatio: 0,
      hasRidge: false,
      beasts: false,
    });
    roof.position.y = t.y + t.h - 0.4;
    group.add(roof);
  });
  const cm = mergedMesh(cols, mats.columnRed, true, true);
  if (cm) group.add(cm);

  const trim = [];
  for (const t of tiers) {
    addBox(trim, t.w + 1.2, 0.34, t.w + 1.2, 0, t.y + t.h - 0.2, 0);
    addBox(trim, t.w + 0.8, 0.18, t.w + 0.8, 0, t.y + t.h - 0.55, 0);
  }
  const tm = mergedMesh(trim, mats.wallDark, true, true);
  if (tm) group.add(tm);

  const gold = [];
  const ball = new THREE.SphereGeometry(0.42, 10, 8);
  ball.translate(0, 20.6, 0);
  gold.push(ball);
  addCylinder(gold, 0.1, 0.16, 2.4, 6, 0, 21.9, 0);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const horn = new THREE.ConeGeometry(0.12, 0.8, 4);
      horn.rotateZ(sx * 0.5);
      horn.translate(sx * 0.5, 20.4, sz * 0.5);
      gold.push(horn);
    }
  }
  const gm = mergedMesh(gold, mats.gold, true, false);
  if (gm) group.add(gm);
  group.add(plaque('行吟阁', 3.4, 0.95, 0, 10.9, 7.55));
  group.add(plaque('行吟阁', 3.0, 0.86, -7.55, 10.9, 0, -Math.PI / 2));

  group.position.set(x, baseY - 0.2, z);
  return group;
}

export function createArchBridge({ x0, z0, x1, z1, width = 6, deckY = 3.3, stairRun = 26 }) {
  const group = new THREE.Group();
  const dx = x1 - x0;
  const dz = z1 - z0;
  const len = Math.hypot(dx, dz);
  const H = deckY - 0.35;
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(len, 0);
  shape.lineTo(len, H);
  shape.lineTo(0, H);
  shape.closePath();
  const spans = Math.max(3, Math.round(len / 24));
  for (let i = 0; i < spans; i++) {
    const cx = (i + 0.5) * (len / spans);
    const r = Math.min(len / spans / 2 - 1.5, H - 1.2);
    const hole = new THREE.Path();
    hole.moveTo(cx - r, 0.25);
    hole.lineTo(cx - r, 0.25);
    hole.absarc(cx, 0.25, r, Math.PI, 0, true);
    hole.lineTo(cx + r, 0.25);
    hole.closePath();
    shape.holes.push(hole);
  }
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.7, bevelEnabled: false });
  for (const s of [-1, 1]) {
    const wall = new THREE.Mesh(geo.clone(), mats.marbleShade);
    wall.position.set(0, 0.2, s * width / 2 - (s > 0 ? 0.7 : 0));
    wall.castShadow = true;
    wall.receiveShadow = true;
    group.add(wall);
  }
  geo.dispose();
  const deck = new THREE.Mesh(new THREE.BoxGeometry(len, 0.5, width + 1.2), mats.marbleShade);
  deck.position.set(len / 2, H + 0.05, 0);
  deck.castShadow = true;
  deck.receiveShadow = true;
  group.add(deck);

  if (stairRun > 0) {
    const stepGeo = [];
    const n = 14;
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      const sx = -stairRun + stairRun * (i - 0.5) / n;
      const sh = (H + 0.3) * t;
      addBox(stepGeo, stairRun / n + 0.05, sh, width + 1.2, sx, sh / 2, 0);
    }
    const st = mergedMesh(stepGeo, mats.marbleShade, true, true);
    if (st) group.add(st);
  }

  const rails = [];
  const n = Math.max(4, Math.round(len / 4));
  for (let i = 0; i <= n; i++) {
    const px = (i * len) / n;
    for (const sz of [-1, 1]) {
      addBox(rails, 0.24, 1.15, 0.24, px, H + 0.85, (sz * (width + 0.8)) / 2);
      if (i < n) addBox(rails, len / n, 0.16, 0.16, px + len / n / 2, H + 1.3, (sz * (width + 0.8)) / 2);
    }
  }
  const rm = mergedMesh(rails, mats.marble, true, true);
  if (rm) group.add(rm);

  group.position.set(x0, 0.2, z0);
  group.rotation.y = Math.atan2(-dz, dx);
  return group;
}

export function createHillStairway({ x0, z0, x1, z1, width = 14 }) {
  const group = new THREE.Group();
  const dx = x1 - x0;
  const dz = z1 - z0;
  const dist = Math.hypot(dx, dz);
  const steps = Math.max(24, Math.round(dist / 3));
  const treads = [];
  const rails = [];
  const ny = dz / dist;
  const nx = dx / dist;
  for (let i = 0; i < steps; i++) {
    const t = (i + 0.5) / steps;
    const px = x0 + dx * t;
    const pz = z0 + dz * t;
    const y = terrainHeight(px, pz);
    addBox(treads, dist / steps + 0.3, 0.8, width, px, y + 0.12, pz);
    for (const side of [-1, 1]) {
      const ox = side * width / 2 * (dz / dist);
      const oz = side * width / 2 * (dx / dist);
      addBox(rails, dist / steps + 0.2, 1.05, 0.5, px + ox, y + 0.75, pz + oz);
    }
    if (i % 8 === 0) {
      for (const side of [-1, 1]) {
        const ox = side * width / 2 * (dz / dist);
        const oz = side * width / 2 * (dx / dist);
        addBox(rails, 0.7, 1.7, 0.7, px + ox, y + 1.0, pz + oz);
      }
    }
  }
  const tm = mergedMesh(treads, mats.marbleShade, true, true);
  if (tm) group.add(tm);
  const rm = mergedMesh(rails, mats.marble, true, true);
  if (rm) group.add(rm);

  for (const t of [0.32, 0.63]) {
    const px = x0 + dx * t;
    const pz = z0 + dz * t;
    const y = terrainHeight(px, pz) + 0.75;
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(width + 18, 1.5, 16), mats.marbleShade);
    body.position.y = y - 0.75;
    body.castShadow = true;
    body.receiveShadow = true;
    g.add(body);
    const bal = [];
    for (const sx of [-1, 1]) {
      for (let i = 0; i <= 10; i++) {
        addBox(bal, 0.35, 1.2, 0.35, sx * (width + 18) / 2, y + 0.6, -7 + (i * 14) / 10);
      }
      addBox(bal, 0.35, 1.2, 0.35, sx * (width + 18) / 2, y + 0.6, 7);
      addBox(bal, 0.3, 0.22, 15, sx * (width + 18) / 2, y + 1.15, 0);
    }
    const bm = mergedMesh(bal, mats.marble, true, true);
    if (bm) g.add(bm);
    group.add(g);
  }
  return group;
}

export function createChuTower({ x, z }) {
  const group = new THREE.Group();
  const baseY = terrainHeight(x, z);
  const stone = [];
  addBox(stone, 34, 3.0, 34, 0, 1.5, 0);
  addBox(stone, 28, 2.0, 28, 0, 4.0, 0);
  addBox(stone, 23, 1.4, 23, 0, 5.7, 0);
  const sm = mergedMesh(stone, mats.marbleShade, true, true);
  if (sm) group.add(sm);

  const stairs = createStairs({ width: 9, depth: 6, height: 3.0, steps: 9, rampWidth: 0 });
  stairs.position.set(-17, 0, 0);
  stairs.rotation.y = -Math.PI / 2;
  group.add(stairs);

  const tiers = [
    { w: 17, h: 5.6, y: 6.4, rw: 25, rh: 3.8 },
    { w: 12.5, h: 4.4, y: 12.9, rw: 19, rh: 3.3 },
    { w: 9, h: 3.6, y: 18.6, rw: 14.5, rh: 3.0 },
    { w: 6, h: 3.0, y: 23.6, rw: 11, rh: 3.3 },
  ];
  const cols = [];
  tiers.forEach((t, i) => {
    const body = new THREE.Mesh(new THREE.BoxGeometry(t.w, t.h, t.w), mats.wall);
    body.position.y = t.y + t.h / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);
    latticeSides(group, t.w, t.w, t.y, t.h);
    columnRing(cols, t.w + 0.6, t.w + 0.6, t.y, t.h, 4);
    woodRailRing(cols, t.w + 1.6, t.w + 1.6, t.y - 0.1);
    const roof = greenRoof({
      width: t.rw,
      depth: t.rw,
      height: t.rh,
      cornerLift: 1.5 + i * 0.1,
      curve: 1.62,
      ridgeRatio: 0,
      hasRidge: false,
      beasts: false,
    });
    roof.position.y = t.y + t.h - 0.5;
    group.add(roof);
  });
  const cm = mergedMesh(cols, mats.columnRed, true, true);
  if (cm) group.add(cm);

  const bands = [];
  for (const t of tiers) {
    addBox(bands, t.w + 1.4, 0.4, t.w + 1.4, 0, t.y + t.h - 0.25, 0);
    addBox(bands, t.w + 0.9, 0.2, t.w + 0.9, 0, t.y + t.h - 0.62, 0);
  }
  const bm = mergedMesh(bands, mats.wallDark, true, true);
  if (bm) group.add(bm);

  const gold = [];
  addCylinder(gold, 0.12, 0.2, 4.0, 8, 0, 30.2, 0);
  for (let i = 0; i < 3; i++) {
    const b = new THREE.SphereGeometry(0.5 - i * 0.09, 10, 8);
    b.translate(0, 28.4 + i * 1.0, 0);
    gold.push(b);
  }
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const horn = new THREE.ConeGeometry(0.16, 1.2, 4);
      horn.rotateZ(sx * 0.6);
      horn.translate(sx * 0.7, 31.0, sz * 0.7);
      gold.push(horn);
    }
  }
  const gm = mergedMesh(gold, mats.gold, true, false);
  if (gm) group.add(gm);
  group.add(plaque('楚天台', 3.8, 1.05, 0, 15.0, 9.4));
  group.add(plaque('楚天台', 3.8, 1.05, -9.35, 15.0, 0, -Math.PI / 2));

  group.position.set(x, baseY - 0.5, z);
  return group;
}

export function createChuGate({ x, z, rot = -Math.PI / 2, name = '楚城' }) {
  const group = new THREE.Group();
  const list = [];
  for (const sx of [-7.5, -2.6, 2.6, 7.5]) addCylinder(list, 0.42, 0.5, 8.2, 8, sx, 4.1, 0);
  for (const sx of [-10, 10]) addCylinder(list, 0.3, 0.38, 6.0, 8, sx, 3.0, 0);
  addBox(list, 20, 0.6, 0.8, 0, 7.6, 0);
  addBox(list, 20, 0.3, 0.55, 0, 6.1, 0);
  addBox(list, 6.4, 0.35, 0.55, 0, 5.0, 0);
  addBox(list, 26, 1.2, 2.0, 0, 0.6, 0);
  const cm = mergedMesh(list, mats.columnRed, true, true);
  if (cm) group.add(cm);
  const roof = greenRoof({ width: 21, depth: 4.0, height: 2.5, cornerLift: 0.9, curve: 1.55, ridgeRatio: 0.6, hasRidge: true, beasts: false });
  roof.position.y = 7.9;
  group.add(roof);
  for (const sx of [-10, 10]) {
    const r = greenRoof({ width: 6, depth: 3.2, height: 1.9, cornerLift: 0.6, curve: 1.5, ridgeRatio: 0.5, hasRidge: true, beasts: false });
    r.position.set(sx, 5.9, 0);
    group.add(r);
  }
  group.add(plaque(name, 3.6, 0.85, 0, 6.8, 0.5));
  const wall = [];
  for (const sx of [-1, 1]) {
    addBox(wall, 26, 4.2, 3.2, sx * 26, 2.1, 0);
    for (let i = 0; i < 7; i++) addBox(wall, 2.4, 1.5, 3.4, sx * (26 - 11 + i * 3.6), 4.8, 0);
  }
  const wm = mergedMesh(wall, mats.stone, true, true);
  if (wm) group.add(wm);
  group.position.set(x, terrainHeight(x, z) - 0.2, z);
  group.rotation.y = rot;
  return group;
}

export function createChangtian({ x, z, rot = Math.PI / 2 }) {
  const group = new THREE.Group();
  const stone = [];
  addBox(stone, 34, 1.6, 22, 0, 0.8, 0);
  addBox(stone, 30, 0.5, 18, 0, 1.75, 0);
  const sm = mergedMesh(stone, mats.marbleShade, true, true);
  if (sm) group.add(sm);
  const cols = [];
  const tiers = [
    { w: 25, h: 5.4, d: 13, y: 2.0, rw: 33, rd: 21, rh: 4.0 },
    { w: 18, h: 4.0, d: 9.5, y: 9.8, rw: 26, rd: 17, rh: 4.4 },
  ];
  tiers.forEach((t) => {
    const body = new THREE.Mesh(new THREE.BoxGeometry(t.w, t.h, t.d), mats.wall);
    body.position.y = t.y + t.h / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);
    latticeSides(group, t.w, t.d, t.y, t.h);
    columnRing(cols, t.w + 0.5, t.d + 0.5, t.y, t.h, 4.2);
    const roof = greenRoof({
      width: t.rw,
      depth: t.rd,
      height: t.rh,
      cornerLift: 1.3,
      curve: 1.58,
      ridgeRatio: 0.55,
      hasRidge: true,
      beasts: false,
    });
    roof.position.y = t.y + t.h - 0.35;
    group.add(roof);
    woodRailRing(cols, t.w + 1.4, t.d + 1.4, t.y + 0.1);
  });
  const cm = mergedMesh(cols, mats.columnRed, true, true);
  if (cm) group.add(cm);
  const bands = [];
  for (const t of tiers) addBox(bands, t.w + 1.2, 0.35, t.d + 1.2, 0, t.y + t.h - 0.2, 0);
  const bm = mergedMesh(bands, mats.wallDark, true, true);
  if (bm) group.add(bm);
  group.add(plaque('长天楼', 4.6, 1.0, 0, 11.5, 5.1));
  group.position.set(x, terrainHeight(x, z) - 0.2, z);
  group.rotation.y = rot;
  return group;
}

export function createTingtaoPavilion({ x, z, name = '听涛轩' }) {
  const g = createHexPavilion({ radius: 4.4, wallH: 3.3, roofH: 3.6, baseH: 1.1, name, x: 0, z: 0 });
  g.traverse((o) => {
    if (o.isMesh && o.material === mats.roof) o.material = mats.roofGreen;
    if (o.isMesh && o.material === mats.wallDark) o.material = mats.columnRed;
  });
  const group = new THREE.Group();
  const deck = new THREE.Mesh(new THREE.CylinderGeometry(8.2, 8.8, 1.3, 8), mats.marbleShade);
  deck.position.y = 0.65;
  deck.castShadow = true;
  deck.receiveShadow = true;
  group.add(deck);
  const posts = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    addCylinder(posts, 0.16, 0.2, 2.4, 6, Math.cos(a) * 7.2, 0.2, Math.sin(a) * 7.2);
  }
  const pm = mergedMesh(posts, mats.wood, true, true);
  if (pm) group.add(pm);
  group.add(g);
  group.add(plaque(name, 2.6, 0.72, 0, 3.05, 4.5));
  group.position.set(x, 0.22, z);
  return group;
}

function shorePoint(angle, offset = 16) {
  const cx = -120;
  const cz = -20;
  let prev = 0;
  for (let r = 40; r < 1250; r += 6) {
    const x = cx + Math.cos(angle) * r;
    const z = cz + Math.sin(angle) * r;
    const h = terrainHeight(x, z);
    if (h > 0.55) {
      const rr = r + offset;
      return [cx + Math.cos(angle) * rr, cz + Math.sin(angle) * rr];
    }
    prev = r;
  }
  return [cx + Math.cos(angle) * (prev + offset), cz + Math.sin(angle) * (prev + offset)];
}

export function createLakesideGreenway() {
  const pts = [];
  for (let a = Math.PI * 1.06; a <= Math.PI * 1.86; a += Math.PI / 30) {
    pts.push(shorePoint(a, 14 + 8 * Math.sin(a * 3.1)));
  }
  return createGreenway({ points: pts, width: 4.6, safe: 0.18, rails: true, lamps: true, benches: true });
}

export function createGreenway({ points = [], width = 4, safe = 0, rails = true, lamps = true, benches = true, y = 0 }) {
  const group = new THREE.Group();
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(p[0], 0, p[1])), false, 'catmullrom', 0.4);
  const segs = Math.max(30, points.length * 10);
  const positions = [];
  const uvs = [];
  const indices = [];
  const railList = [];
  const woodList = [];
  const goldList = [];
  const lampList = [];
  const benchList = [];
  let prevSide = 1;
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const p = curve.getPoint(t);
    const tan = curve.getTangent(t);
    const nx = -tan.z;
    const nz = tan.x;
    const ground = y > 0 ? y : Math.max(0.6, terrainHeight(p.x, p.z) + 0.12 + safe);
    const half = width / 2;
    positions.push(p.x + nx * half, ground, p.z + nz * half);
    positions.push(p.x - nx * half, ground, p.z - nz * half);
    uvs.push(t * 28, 0, t * 28, 1);
    if (rails && i % 3 === 0 && i < segs - 3) {
      const t2 = (i + 3) / segs;
      const p2 = curve.getPoint(t2);
      for (const side of [-1, 1]) {
        const px = p.x + nx * half * side;
        const pz = p.z + nz * half * side;
        const qx = p2.x + nx * half * side;
        const qz = p2.z + nz * half * side;
        addBox(railList, 0.14, 1.05, 0.14, px, ground + 0.52, pz);
        if (terrainHeight(px, pz) < 0.2) {
          const drop = ground - Math.max(-5, terrainHeight(px, pz));
          addBox(railList, 0.22, drop, 0.22, px, ground - drop / 2, pz);
        }
        addBar(railList, px, pz, qx, qz, ground + 1.02, 0.12, 0.12);
        addBar(railList, px, pz, qx, qz, ground + 0.55, 0.08, 0.08);
      }
    }
    if (i % 9 === 0 && i < segs && lamps) {
      const side = i % 18 === 0 ? 1 : -1;
      const px = p.x + nx * (half + 1.1) * side;
      const pz = p.z + nz * (half + 1.1) * side;
      const gy = Math.max(0.6, terrainHeight(px, pz) + 0.1);
      addCylinder(goldList, 0.11, 0.16, 3.4, 6, px, gy + 1.7, pz);
      addBox(goldList, 0.55, 0.14, 0.55, px, gy + 3.42, pz);
      addBox(lampList, 0.42, 0.5, 0.42, px, gy + 3.1, pz);
    }
    if (i % 14 === 0 && i < segs + 1 && benches) {
      const side = i % 28 === 0 ? 1 : -1;
      const px = p.x + nx * (half + 1.6) * side;
      const pz = p.z + nz * (half + 1.6) * side;
      const gy = Math.max(0.65, terrainHeight(px, pz) + 0.12);
      const ang = Math.atan2(tan.x, tan.z);
      const seat = new THREE.BoxGeometry(2.4, 0.16, 0.7);
      seat.rotateY(ang);
      seat.translate(px, gy + 0.55, pz);
      benchList.push(seat);
      const back = new THREE.BoxGeometry(2.4, 0.8, 0.12);
      back.rotateY(ang);
      back.translate(px - nx * 0.32 * side, gy + 0.95, pz - nz * 0.32 * side);
      benchList.push(back);
      for (const o of [-0.9, 0.9]) {
        addBox(woodList, 0.12, 0.55, 0.5, px + tan.x * o, gy + 0.28, pz + tan.z * o);
      }
    }
  }
  for (let i = 0; i < segs; i++) {
    const a = i * 2;
    indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const path = new THREE.Mesh(geo, mats.path);
  path.receiveShadow = true;
  group.add(path);
  const rm = mergedMesh(railList, mats.wallDark, true, true);
  if (rm) group.add(rm);
  const gm = mergedMesh(goldList, mats.gold, true, true);
  if (gm) group.add(gm);
  const lm = mergedMesh(lampList, mats.lantern, true, false);
  if (lm) group.add(lm);
  const bm = mergedMesh(benchList, mats.wood, true, true);
  if (bm) group.add(bm);
  const wm = mergedMesh(woodList, mats.wood, true, true);
  if (wm) group.add(wm);
  return group;
}

export function createDock({ x, z, rot = 0, length = 26, width = 5 }) {
  const group = new THREE.Group();
  const wood = [];
  addBox(wood, length, 0.28, width, 0, 0.28, 0);
  for (let i = 0; i < 7; i++) {
    const t = -length / 2 + (i / 6) * length;
    addBox(wood, 0.24, 0.08, width + 0.5, t, 0.46, 0);
  }
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addCylinder(wood, 0.16, 0.2, 1.8, 6, sx * (length / 2 - 0.5), -0.4, sz * (width / 2 - 0.4));
    }
    addBox(wood, 0.14, 0.7, 0.14, sx * (length / 2 - 0.5), 0.75, width / 2 - 0.4);
  }
  const wm = mergedMesh(wood, mats.wood, true, true);
  if (wm) group.add(wm);
  const trim = [];
  for (let i = 0; i < 4; i++) addCylinder(trim, 0.12, 0.16, 2.0, 6, -length / 2 + 2 + i * (length - 4) / 3, 1.15, -width / 2 + 0.3);
  const tm = mergedMesh(trim, mats.wood, true, true);
  if (tm) group.add(tm);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(length * 0.36, 0.12, width + 1.2), mats.white);
  cap.position.set(-length * 0.18, 1.9, 0);
  cap.castShadow = true;
  group.add(cap);
  group.position.set(x, WATER_Y + 0.24, z);
  group.rotation.y = rot;
  return group;
}
