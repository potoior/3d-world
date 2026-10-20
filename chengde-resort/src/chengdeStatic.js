import * as THREE from 'three';
import { mats } from './materials.js';
import { addBox, addCylinder, mergedMesh } from './geometry.js';
import { createTree } from './props.js';

function rnd(seed, n) {
  const v = Math.sin(seed * 43.17 + n * 71.31) * 43758.5453;
  return v - Math.floor(v);
}

function addRope(list, ax, ay, az, bx, by, bz, radius = 0.035) {
  const dx = bx - ax;
  const dy = by - ay;
  const dz = bz - az;
  const len = Math.hypot(dx, dy, dz);
  const g = new THREE.CylinderGeometry(radius, radius, len, 4);
  g.translate(0, len / 2, 0);
  const q = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(dx, dy, dz).normalize()
  );
  g.applyQuaternion(q);
  g.translate(ax, ay, az);
  list.push(g);
}

export function createStoneBridge({
  x = 0,
  z = 0,
  length = 10,
  width = 2.6,
  rise = 0.55,
  rot = 0,
}) {
  const group = new THREE.Group();
  const deck = [];
  const joints = [];
  const piers = [];
  const segs = 12;
  const curveY = (t) => 0.32 + rise * Math.cos((t * Math.PI) / 2);
  for (let i = 0; i < segs; i++) {
    const t0 = -1 + (2 * i) / segs;
    const t1 = -1 + (2 * (i + 1)) / segs;
    const z0 = (t0 * length) / 2;
    const z1 = (t1 * length) / 2;
    const y0 = curveY(t0);
    const y1 = curveY(t1);
    const g = new THREE.BoxGeometry(width, 0.28, (z1 - z0) * 1.04);
    g.rotateX(-Math.atan2(y1 - y0, z1 - z0));
    g.translate(0, (y0 + y1) / 2, (z0 + z1) / 2);
    deck.push(g);
    if (i % 2 === 0) {
      addBox(joints, width + 0.05, 0.035, 0.09, 0, curveY(t0) + 0.152, z0);
      for (const sx of [-1, 1]) {
        addBox(joints, 0.06, 0.2, 0.1, sx * (width / 2 + 0.015), curveY(t0) + 0.02, z0);
      }
    }
  }
  const dm = mergedMesh(deck, mats.stone, true, true);
  if (dm) group.add(dm);
  const jm = mergedMesh(joints, mats.trimDark, false, true);
  if (jm) group.add(jm);

  const rails = [];
  for (const sx of [-1, 1]) {
    for (let i = 0; i <= 8; i++) {
      const t = -1 + (2 * i) / 8;
      const zz = (t * length) / 2;
      const yy = curveY(t);
      addBox(rails, 0.17, 0.95, 0.17, sx * (width / 2 - 0.08), yy + 0.52, zz);
      addBox(rails, 0.3, 0.14, 0.3, sx * (width / 2 - 0.08), yy + 1.02, zz);
      addBox(rails, 0.12, 0.18, 0.32, sx * (width / 2 - 0.08), yy + 0.85, zz);
    }
    for (let i = 0; i < 8; i++) {
      const t0 = -1 + (2 * i) / 8;
      const t1 = -1 + (2 * (i + 1)) / 8;
      const zz0 = (t0 * length) / 2;
      const zz1 = (t1 * length) / 2;
      const yy = (curveY(t0) + curveY(t1)) / 2;
      const g = new THREE.BoxGeometry(0.1, 0.13, Math.hypot(zz1 - zz0, 0.02) + 0.05);
      g.translate(sx * (width / 2 - 0.08), yy + 0.95, (zz0 + zz1) / 2);
      rails.push(g);
    }
  }
  for (const pz of [-length * 0.28, length * 0.28]) {
    addBox(piers, width * 0.9, 0.9, 0.7, 0, 0.02, pz);
  }
  const rm = mergedMesh(rails, mats.marble, true, true);
  if (rm) group.add(rm);
  const pm = mergedMesh(piers, mats.stone, true, true);
  if (pm) group.add(pm);

  group.position.set(x, 0, z);
  group.rotation.y = rot;
  return group;
}

function addWallRun(wall, x1, z1, x2, z2, height = 4.2, thickness = 1.1) {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const len = Math.hypot(dx, dz);
  const ang = Math.atan2(dx, dz);
  const cx = (x1 + x2) / 2;
  const cz = (z1 + z2) / 2;
  addBox(wall, thickness, height, len + 0.4, cx, height / 2, cz, ang);
  addBox(wall, thickness + 0.26, 0.22, len + 0.2, cx, height + 0.02, cz, ang);
  addBox(wall, thickness + 0.4, 0.14, len + 0.6, cx, height + 0.18, cz, ang);
  const n = Math.max(2, Math.floor(len / 2.6));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const px = x1 + dx * t;
    const pz = z1 + dz * t;
    addBox(wall, thickness * 0.82, 0.68, 0.62, px, height + 0.5, pz, ang);
  }
}

function createLongWall() {
  const group = new THREE.Group();
  const wall = [];
  const trim = [];
  addWallRun(wall, -190, -148, -8, -148);
  addWallRun(wall, 8, -148, 190, -148);
  addWallRun(wall, -190, -148, -190, 142);
  addWallRun(wall, 190, -148, 190, 142);

  for (const [x, z] of [[-190, -148], [190, -148], [-190, 142], [190, 142], [-60, -148], [60, -148]]) {
    addBox(wall, 6.6, 8.4, 6.6, x, 4.2, z);
    addBox(wall, 7.3, 0.35, 7.3, x, 8.5, z);
    addBox(wall, 8.2, 0.2, 8.2, x, 8.72, z);
    addBox(wall, 5.4, 2.2, 5.4, x, 9.75, z);
    const cap = new THREE.ConeGeometry(4.6, 1.9, 4);
    cap.rotateY(Math.PI / 4);
    cap.translate(x, 11.75, z);
    trim.push(cap);
  }
  const wm = mergedMesh(wall, mats.stone, true, true);
  if (wm) group.add(wm);
  const tm = mergedMesh(trim, mats.roofDark, true, true);
  if (tm) group.add(tm);
  return group;
}

function createMountainRidge() {
  const group = new THREE.Group();
  const near = [];
  const far = [];
  const peaks = 22;
  for (let i = 0; i < peaks; i++) {
    const x = -250 + (i / (peaks - 1)) * 500 + (rnd(3, i) - 0.5) * 22;
    const z = -196 - rnd(4, i) * 52;
    const h = 30 + rnd(5, i) * 58 + (i % 3) * 10;
    const r = 26 + rnd(6, i) * 36;
    const geo = new THREE.ConeGeometry(r, h, 6 + (i % 3));
    geo.scale(1.7, 1, 0.85);
    geo.rotateY(rnd(7, i) * 6.28);
    geo.translate(x, h * 0.42 - 2, z);
    near.push(geo);
    if (i % 2 === 0) {
      const g2 = new THREE.ConeGeometry(r * 0.7, h * 0.62, 5);
      g2.scale(1.5, 1, 0.8);
      g2.translate(x + 24, h * 0.3 - 2, z - 34);
      far.push(g2);
    }
  }
  for (let i = 0; i < 9; i++) {
    const z = -120 + i * 12;
    const x = 214 + rnd(9, i) * 42;
    const h = 26 + rnd(10, i) * 34;
    const geo = new THREE.ConeGeometry(20 + rnd(11, i) * 18, h, 5);
    geo.scale(1.2, 1, 1.6);
    geo.translate(x, h * 0.4, z);
    near.push(geo);
  }
  const nm = mergedMesh(near, mats.mountain, true, false);
  if (nm) group.add(nm);
  const fm = mergedMesh(far, mats.mountainFar, true, false);
  if (fm) group.add(fm);

  const trees = [];
  for (let i = 0; i < 26; i++) {
    const t = createTree({
      height: 7 + rnd(12, i) * 5,
      spread: 2.2 + rnd(13, i) * 1.1,
      kind: i % 3 === 0 ? 'broad' : 'pine',
      seed: i + 900,
    });
    t.position.set(-170 + rnd(14, i) * 340, 1.4 + rnd(15, i) * 4, -158 - rnd(16, i) * 18);
    trees.push(t);
  }
  trees.forEach((t) => group.add(t));
  return group;
}

function createYurt({ x = 0, z = 0, scale = 1, seed = 1, rot = 0 }) {
  const group = new THREE.Group();
  const cloth = [];
  const accent = [];
  const ropes = [];
  const r = 4.0;
  const wallH = 2.35;

  addCylinder(cloth, r, r * 1.03, wallH, 20, 0, wallH / 2, 0);
  const roof = new THREE.ConeGeometry(r * 1.17, 2.15, 20);
  roof.translate(0, wallH + 1.05, 0);
  cloth.push(roof);
  const crown = new THREE.CylinderGeometry(0.46, 0.55, 0.22, 10);
  crown.translate(0, wallH + 2.1, 0);
  accent.push(crown);

  const band = new THREE.TorusGeometry(r * 1.01, 0.11, 5, 28);
  band.rotateX(Math.PI / 2);
  band.translate(0, wallH - 0.06, 0);
  accent.push(band);
  const band2 = new THREE.TorusGeometry(r * 1.02, 0.055, 4, 28);
  band2.rotateX(Math.PI / 2);
  band2.translate(0, 0.42, 0);
  accent.push(band2);

  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    addRope(
      ropes,
      Math.cos(a) * r * 0.98,
      wallH - 0.05,
      Math.sin(a) * r * 0.98,
      Math.cos(a) * 0.34,
      wallH + 1.95,
      Math.sin(a) * 0.34,
      0.032
    );
    const a2 = a + Math.PI / 10;
    addBox(
      accent,
      0.44,
      0.42,
      0.08,
      Math.cos(a2) * (r + 0.03),
      1.5,
      Math.sin(a2) * (r + 0.03),
      a2
    );
  }

  addBox(accent, 1.65, 1.9, 0.22, 0, 0.98, r + 0.02);
  addBox(accent, 1.38, 1.62, 0.12, 0, 0.92, r + 0.1);
  addBox(accent, 2.0, 0.16, 0.55, 0, 1.98, r + 0.08);

  const cm = mergedMesh(cloth, mats.yurt, true, true);
  if (cm) group.add(cm);
  const am = mergedMesh(accent, mats.yurtAccent, true, true);
  if (am) group.add(am);
  const rm = mergedMesh(ropes, mats.rope, false, false);
  if (rm) group.add(rm);

  const pole = new THREE.CylinderGeometry(0.055, 0.075, 7.2, 5);
  pole.translate(r + 1.8, 3.6, 0);
  const pm = new THREE.Mesh(pole, mats.wood);
  group.add(pm);

  group.position.set(x, 0, z);
  group.rotation.y = rot;
  group.scale.setScalar(scale);
  return group;
}


function createHorse({ x = 0, z = 0, rot = 0, scale = 1, pale = false }) {
  const group = new THREE.Group();
  const bodyList = [];
  const darkList = [];
  const saddle = [];
  const s = scale;

  const body = new THREE.SphereGeometry(1, 10, 8);
  body.scale(1.05 * s, 0.92 * s, 2.1 * s);
  body.translate(0, 2.15 * s, 0);
  bodyList.push(body);
  const chest = new THREE.SphereGeometry(0.82 * s, 8, 6);
  chest.scale(1, 1, 1.2);
  chest.translate(0, 2.3 * s, 1.2 * s);
  bodyList.push(chest);

  const neck = new THREE.CylinderGeometry(0.34 * s, 0.52 * s, 1.35 * s, 7);
  neck.rotateX(-0.55);
  neck.translate(0, 3.05 * s, 1.7 * s);
  bodyList.push(neck);
  const head = new THREE.BoxGeometry(0.48 * s, 0.58 * s, 1.08 * s);
  head.rotateX(0.15);
  head.translate(0, 3.55 * s, 2.35 * s);
  bodyList.push(head);
  for (const sx of [-1, 1]) {
    const ear = new THREE.ConeGeometry(0.1 * s, 0.38 * s, 5);
    ear.translate(sx * 0.16 * s, 3.95 * s, 2.15 * s);
    bodyList.push(ear);
    for (const sz of [-1, 1]) {
      const leg = new THREE.CylinderGeometry(0.13 * s, 0.16 * s, 1.6 * s, 6);
      leg.translate(sx * 0.58 * s, 1.0 * s, sz * 0.72 * s);
      bodyList.push(leg);
      const hoof = new THREE.CylinderGeometry(0.17 * s, 0.18 * s, 0.18 * s, 6);
      hoof.translate(sx * 0.58 * s, 0.13 * s, sz * 0.72 * s);
      darkList.push(hoof);
    }
  }
  const tail = new THREE.CylinderGeometry(0.12 * s, 0.2 * s, 1.5 * s, 5);
  tail.rotateX(0.7);
  tail.translate(0, 2.2 * s, -2.05 * s);
  darkList.push(tail);

  addBox(saddle, 1.5 * s, 0.16 * s, 1.4 * s, 0, 2.83 * s, 0.1 * s);
  addBox(saddle, 0.9 * s, 0.34 * s, 0.55 * s, 0, 2.98 * s, -0.15 * s);
  const strap = new THREE.TorusGeometry(0.92 * s, 0.06 * s, 4, 18);
  strap.rotateY(Math.PI / 2);
  strap.translate(0, 2.2 * s, 0);
  saddle.push(strap);

  const bm = mergedMesh(bodyList, pale ? mats.horsePale : mats.horse, true, true);
  if (bm) group.add(bm);
  const dm = mergedMesh(darkList, mats.wood, true, true);
  if (dm) group.add(dm);
  const sm = mergedMesh(saddle, mats.yurtAccent, true, true);
  if (sm) group.add(sm);

  group.position.set(x, 0, z);
  group.rotation.y = rot;
  return group;
}

function createGrassMeadow() {
  const group = new THREE.Group();
  const blades = [];
  for (let i = 0; i < 520; i++) {
    const x = 62 + rnd(21, i) * 116;
    const z = -92 + rnd(22, i) * 180;
    if (x > 176 || z > 96) continue;
    const h = 0.28 + rnd(23, i) * 0.55;
    const g = new THREE.ConeGeometry(0.055 + rnd(24, i) * 0.055, h, 3);
    g.rotateZ((rnd(25, i) - 0.5) * 0.5);
    g.rotateY(rnd(26, i) * 6.28);
    g.translate(x, h / 2, z);
    blades.push(g);
  }
  const bm = mergedMesh(blades, mats.blade, false, true);
  if (bm) group.add(bm);
  return group;
}

function createPineForest() {
  const group = new THREE.Group();
  const defs = [];
  for (let i = 0; i < 46; i++) {
    const x = 66 + rnd(31, i) * 110;
    const z = -92 + rnd(32, i) * 176;
    if (x > 172 || z > 88 || (x < 92 && z > 20 && z < 62)) continue;
    defs.push([x, z, 6.4 + rnd(33, i) * 5.2, 2.1 + rnd(34, i) * 1.4, i]);
  }
  defs.forEach(([x, z, h, sp, i]) => {
    const t = createTree({ height: h, spread: sp, kind: 'pine', seed: i + 700 });
    t.position.set(x, 0, z);
    group.add(t);
  });
  return group;
}

export function createChengdeStatic() {
  const group = new THREE.Group();
  group.add(createMountainRidge());
  group.add(createLongWall());
  group.add(createGrassMeadow());
  group.add(createPineForest());

  const yurts = [
    [104, 26, 1.0, 1.0, 0.2],
    [128, 38, 0.9, 2.1, -0.4],
    [118, -4, 0.82, 3.3, 0.5],
    [146, 16, 0.72, 4.2, 0.1],
  ];
  for (const [x, z, s, seed, rot] of yurts) {
    group.add(createYurt({ x, z, scale: s, seed, rot }));
  }

  const horses = [
    [88, -26, 0.55, 0.62, false],
    [93, -20, 0.9, 0.58, true],
    [82, -14, 1.5, 0.56, false],
    [150, 42, 2.2, 0.6, true],
    [158, 34, 2.8, 0.55, false],
  ];
  for (const [x, z, rot, s, pale] of horses) {
    group.add(createHorse({ x, z, rot, scale: s, pale }));
  }

  group.add(createStoneBridge({ x: -38, z: 39.5, length: 11, width: 2.5, rise: 0.5, rot: 0 }));

  const meadowPines = [
    [72, 74], [98, 78], [132, 70], [162, 58], [170, 22],
    [76, -54], [112, -62], [152, -50], [166, -20], [58, -74],
  ];
  meadowPines.forEach(([x, z], i) => {
    const t = createTree({ height: 6.2 + (i % 4), spread: 2.6, kind: 'pine', seed: 500 + i });
    t.position.set(x, 0, z);
    group.add(t);
  });

  return group;
}
