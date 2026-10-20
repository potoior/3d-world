import * as THREE from 'three';
import { mats, getPlaqueMaterial } from './materials.js';
import { addBox, addCylinder, addBar, mergedMesh } from './geometry.js';

function rnd(seed, n) {
  const v = Math.sin(seed * 43.7 + n * 91.3) * 43758.5453;
  return v - Math.floor(v);
}

function wallRuns(halfX, halfZ, gateWidth) {
  const runs = [];
  for (const sign of [-1, 1]) {
    for (const [a, b] of [[-halfX, -gateWidth * 0.5], [gateWidth * 0.5, halfX]]) {
      if (b - a > 0.1) runs.push({ axis: 'x', sign, a, b, center: (a + b) * 0.5, len: b - a });
    }
    for (const [a, b] of [[-halfZ, -gateWidth * 0.5], [gateWidth * 0.5, halfZ]]) {
      if (b - a > 0.1) runs.push({ axis: 'z', sign, a, b, center: (a + b) * 0.5, len: b - a });
    }
  }
  return runs;
}

function addWallCourses(list, caps, walkJoints, halfX, halfZ, wallH, wallT, gateWidth) {
  let seedN = 0;
  const r = () => rnd(911, seedN++);
  const runs = wallRuns(halfX, halfZ, gateWidth);
  for (const run of runs) {
    const isX = run.axis === 'x';
    const outer = isX ? run.sign * (halfZ + wallT * 0.5 + 0.025) : run.sign * (halfX + wallT * 0.5 + 0.025);
    const inner = isX ? run.sign * (halfZ - wallT * 0.5 + 0.3) : run.sign * (halfX - wallT * 0.5 + 0.3);
    for (let y = 1.35; y < wallH - 0.2; y += 0.56) {
      addBox(list, isX ? run.len : 0.045, 0.032, isX ? 0.045 : run.len,
        isX ? run.center : outer, y, isX ? outer : run.center);
      const step = 2.4;
      const count = Math.floor(run.len / step);
      for (let i = 0; i < count; i++) {
        if (r() > 0.43) continue;
        const t = run.a + step * (i + 0.5) + (r() - 0.5) * 0.9;
        addBox(list, isX ? 0.032 : 0.04, 0.45, isX ? 0.04 : 0.032,
          isX ? t : outer, y + 0.25, isX ? outer : t);
      }
    }
    const walkY = wallH + 0.15;
    const walkW = wallT - 1.4;
    const n = Math.max(3, Math.floor(run.len / 1.9));
    for (let i = 0; i < n; i++) {
      const t = run.a + (run.len * (i + 0.5)) / n;
      addBox(walkJoints, isX ? 0.05 : walkW, 0.018, isX ? walkW : 0.05,
        isX ? t : inner, walkY, isX ? inner : t);
    }
    const m = Math.max(2, Math.floor(run.len / 2.7));
    const merlonOuter = isX ? run.sign * (halfZ + wallT * 0.5 - 0.38) : run.sign * (halfX + wallT * 0.5 - 0.38);
    for (let i = 0; i <= m; i++) {
      const t = run.a + (run.len * i) / m;
      addBox(caps, isX ? 1.16 : 0.94, 0.12, isX ? 0.94 : 1.16,
        isX ? t : merlonOuter, wallH + 1.63, isX ? merlonOuter : t);
      addBox(caps, isX ? 0.78 : 0.6, 0.09, isX ? 0.6 : 0.78,
        isX ? t : merlonOuter, wallH + 1.73, isX ? merlonOuter : t);
    }
  }
}

function addGateDoors(group, gate, wallH) {
  const g = new THREE.Group();
  g.position.set(gate.x, 0, gate.z);
  g.rotation.y = gate.rot;
  const dark = [];
  const gold = [];
  const stone = [];
  const poles = [];
  const studR = 0.082;
  for (const side of [-1, 1]) {
    const open = side * 1.22;
    const base = new THREE.BoxGeometry(6.7, 5.15, 0.22);
    base.translate(-side * 3.35, 0, 0);
    base.rotateY(-side * open);
    base.translate(side * 7.25, 2.58, 0.70);
    dark.push(base);
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 6; col++) {
        const lx = -side * (1.0 + col * 0.94);
        const ly = -1.88 + row * 1.22;
        const s = new THREE.SphereGeometry(studR, 6, 4);
        s.translate(lx, ly, 0.14);
        s.rotateY(-side * open);
        s.translate(side * 7.25, 2.58, 0.70);
        gold.push(s);
      }
    }
    for (const yy of [-1.35, 1.35]) {
      const b = new THREE.BoxGeometry(6.3, 0.2, 0.3);
      b.translate(-side * 3.35, yy, 0.08);
      b.rotateY(-side * open);
      b.translate(side * 7.25, 2.58, 0.70);
      dark.push(b);
    }
    const ring = new THREE.TorusGeometry(0.19, 0.035, 5, 12);
    ring.translate(-side * 3.0, -0.15, 0.22);
    ring.rotateY(-side * open);
    ring.translate(side * 7.25, 2.58, 0.70);
    gold.push(ring);
  }
  addBox(stone, 15.5, 0.24, 0.6, 0, 0.12, 0.35);
  addBox(stone, 0.55, 5.7, 0.7, -7.35, 2.85, 0.25);
  addBox(stone, 0.55, 5.7, 0.7, 7.35, 2.85, 0.25);
  addBox(stone, 15.4, 0.52, 0.62, 0, 5.92, 0.25);
  addBox(dark, 13.8, 0.26, 0.5, 0, 5.63, 0.42);
  addBox(stone, 2.85, 0.95, 0.22, 0, 6.55, 0.55);
  for (const side of [-1, 1]) {
    addCylinder(poles, 0.09, 0.15, 8.2, 6, side * 8.35, 4.1, 3.4);
    addBox(poles, 1.5, 0.12, 0.12, side * 7.8, 8.1, 3.4);
    addBox(poles, 0.12, 0.22, 0.12, side * 8.35, 8.24, 3.4);
  }
  for (const [arr, mat] of [[dark, mats.naxiWoodDark], [gold, mats.gold], [stone, mats.waterStone], [poles, mats.timberRed]]) {
    const m = mergedMesh(arr, mat, true, true);
    if (m) g.add(m);
  }
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(2.55, 0.84), getPlaqueMaterial(gate.name));
  plaque.position.set(0, 6.55, 0.68);
  g.add(plaque);
  const lamp = [];
  for (const sx of [-1, 1]) {
    addCylinder(lamp, 0.05, 0.05, 0.55, 5, sx * 6.3, 5.1, 0.72);
    const body = new THREE.SphereGeometry(0.22, 8, 6);
    body.scale(1, 1.25, 1);
    body.translate(sx * 6.3, 4.72, 0.72);
    lamp.push(body);
  }
  const lm = mergedMesh(lamp, mats.lanternRed, false, false);
  if (lm) g.add(lm);
  group.add(g);
}

function addWatchBeams(group, watch) {
  const g = new THREE.Group();
  g.position.set(watch.x, 0, watch.z);
  g.rotation.y = watch.rot;
  const wood = [];
  for (const sy of [0, 1]) {
    const y = watch.wallH + 3.18 + sy * 0.22;
    addBox(wood, 6.5, 0.16, 0.16, 0, y, 3.0);
    addBox(wood, 6.5, 0.16, 0.16, 0, y, -3.0);
    addBox(wood, 0.16, 0.16, 6.5, 3.0, y, 0);
    addBox(wood, 0.16, 0.16, 6.5, -3.0, y, 0);
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    addBox(wood, 0.16, 0.8, 0.16, Math.cos(a) * 2.8, watch.wallH + 2.8, Math.sin(a) * 2.8);
    addBox(wood, 0.7, 0.14, 0.14, Math.cos(a) * 2.55, watch.wallH + 3.42, Math.sin(a) * 2.55, -a);
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    addBox(wood, 0.1, 0.72, 0.1, Math.cos(a) * 2.3, watch.wallH + 3.75, Math.sin(a) * 2.3);
  }
  const m = mergedMesh(wood, mats.timberRed, true, true);
  if (m) g.add(m);
  group.add(g);
}

function addStreetJoints(list, curbs) {
  const lanes = [
    { w: 15, d: 280, x: 0, z: 0, axis: 'z' },
    { w: 256, d: 15, x: 0, z: 0, axis: 'x' },
    { w: 9, d: 268, x: -68, z: 0, axis: 'z' },
    { w: 9, d: 268, x: 68, z: 0, axis: 'z' },
    { w: 248, d: 9, x: 0, z: -72, axis: 'x' },
    { w: 248, d: 9, x: 0, z: 72, axis: 'x' },
    { w: 6, d: 260, x: -112, z: 0, axis: 'z' },
    { w: 6, d: 260, x: 112, z: 0, axis: 'z' },
    { w: 244, d: 6, x: 0, z: -112, axis: 'x' },
    { w: 244, d: 6, x: 0, z: 112, axis: 'x' },
  ];
  for (const l of lanes) {
    const n = Math.floor((l.axis === 'z' ? l.d : l.w) / 2.15);
    for (let i = 1; i < n; i++) {
      const t = -0.5 + i / n;
      if (l.axis === 'z') {
        addBox(list, l.w - 0.25, 0.018, 0.055, l.x, 0.1, l.z + t * l.d);
      } else {
        addBox(list, 0.055, 0.018, l.d - 0.25, l.x + t * l.w, 0.1, l.z);
      }
    }
    if (l.w >= 9) {
      for (const s of [-1, 1]) {
        if (l.axis === 'z') {
          addBox(curbs, 0.36, 0.16, l.d - 0.6, l.x + s * (l.w * 0.5 - 0.18), 0.09, l.z);
        } else {
          addBox(curbs, l.w - 0.6, 0.16, 0.36, l.x, 0.09, l.z + s * (l.d * 0.5 - 0.18));
        }
      }
    }
  }
  for (const [x, z, w, d] of [[0, 52, 32, 24], [-18, -140, 28, 20], [18, 140, 28, 20]]) {
    for (let i = 0; i < Math.floor(w / 2.4); i++) {
      addBox(list, 0.05, 0.018, d - 1.0, x - w * 0.5 + 1.2 + i * 2.4, 0.1, z);
    }
    for (let i = 0; i < Math.floor(d / 2.4); i++) {
      addBox(list, w - 1.0, 0.018, 0.05, x, 0.1, z - d * 0.5 + 1.2 + i * 2.4);
    }
  }
}

function addWells(group, wells) {
  const stone = [];
  const wood = [];
  const water = [];
  for (const [x0, z0, scale] of wells) {
    const x = x0;
    const z = z0;
    addBox(stone, 2.0 * scale, 0.5, 0.78 * scale, x + 1.45 * scale, 0.25, z + 0.15, 0.2);
    addBox(stone, 1.75 * scale, 0.16, 0.55 * scale, x + 1.45 * scale, 0.45, z + 0.15, 0.2);
    addCylinder(stone, 0.48 * scale, 0.56 * scale, 0.45 * scale, 10, x - 1.35 * scale, 0.22, z + 0.55);
    addCylinder(stone, 0.34 * scale, 0.4 * scale, 0.5 * scale, 10, x - 1.35 * scale, 0.68, z + 0.55);
    addBox(stone, 1.75 * scale, 0.12, 0.45 * scale, x, 0.07, z + 1.0 * scale);
    addBox(stone, 0.16 * scale, 0.72 * scale, 0.16 * scale, x - 0.78 * scale, 0.36, z + 1.05 * scale);
    addBox(stone, 0.16 * scale, 0.72 * scale, 0.16 * scale, x + 0.78 * scale, 0.36, z + 1.05 * scale);
    addCylinder(wood, 0.06 * scale, 0.07 * scale, 0.5 * scale, 5, x, 1.55 * scale, z);
    addBox(wood, 0.55 * scale, 0.06 * scale, 0.06 * scale, x, 1.44 * scale, z + 0.27 * scale);
    addBox(wood, 0.55 * scale, 0.06 * scale, 0.06 * scale, x, 1.44 * scale, z - 0.27 * scale);
    const disc = new THREE.CircleGeometry(0.68 * scale, 16);
    disc.rotateX(-Math.PI / 2);
    disc.translate(x, 0.69, z);
    water.push(disc);
  }
  const sm = mergedMesh(stone, mats.stone, true, true);
  if (sm) group.add(sm);
  const wm = mergedMesh(wood, mats.naxiWoodDark, true, true);
  if (wm) group.add(wm);
  const wa = mergedMesh(water, mats.blue, false, true);
  if (wa) group.add(wa);
}

function addCourtyard(group, { x, z, w, d, seed }) {
  const stone = [];
  const wood = [];
  const cloth = [];
  const pots = [];
  const roof = [];
  const r = rnd(seed, 5);
  const sx = x + w * 0.12;
  const sz = z + d * 0.24;
  addBox(stone, 5.8, 2.15, 0.4, sx, 1.08, sz);
  addBox(roof, 6.4, 0.22, 0.9, sx, 2.27, sz);
  addBox(roof, 6.0, 0.18, 0.72, sx, 2.44, sz);
  addBox(stone, 0.5, 0.35, 0.5, sx - 3.0, 0.17, sz);
  addBox(stone, 0.5, 0.35, 0.5, sx + 3.0, 0.17, sz);

  addCylinder(stone, 1.05, 1.12, 0.18, 10, x - 1.0, 0.72, z - 1.2);
  addCylinder(stone, 0.34, 0.4, 0.72, 8, x - 1.0, 0.36, z - 1.2);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    addCylinder(stone, 0.26, 0.3, 0.48, 7, x - 1.0 + Math.cos(a) * 1.9, 0.24, z - 1.2 + Math.sin(a) * 1.9);
  }
  for (const [dx, dz] of [[-4.2, -3.4], [4.0, -3.6]]) {
    addCylinder(stone, 0.62, 0.72, 0.95, 10, x + dx, 0.47, z + dz);
    addCylinder(stone, 0.68, 0.68, 0.12, 10, x + dx, 1.0, z + dz);
  }
  for (let i = 0; i < 7; i++) {
    const a = rnd(seed, i + 8) * 6.3;
    const rd = 2.4 + rnd(seed, i + 11) * 4.2;
    const px = x + 5.5 + Math.cos(a) * rd * 0.5;
    const pz = z - 4 + Math.sin(a) * rd * 0.4;
    const s = 0.65 + rnd(seed, i + 15) * 0.35;
    const g = new THREE.SphereGeometry(0.36 * s, 6, 5);
    g.scale(1, 1.35, 0.85);
    g.translate(px, 0.45 * s, pz);
    pots.push(g);
  }
  for (let i = 0; i < 3; i++) {
    addCylinder(pots, 0.24, 0.3, 0.36, 7, x - 6.5 + i * 0.75, 0.18, z + 3.6);
    const leaf = new THREE.IcosahedronGeometry(0.3, 0);
    leaf.scale(1.1, 1.7, 1.1);
    leaf.translate(x - 6.5 + i * 0.75, 0.7, z + 3.6);
    pots.push(leaf);
  }
  for (let i = 0; i < 4; i++) {
    addCylinder(pots, 0.12, 0.15, 0.5 + i * 0.05, 6, x - 7.0 + i * 0.34, 0.25, z - 1.2);
  }
  addBox(wood, 1.6, 0.5, 0.9, x + 5.6, 0.25, z + 1.4);
  addBox(wood, 1.5, 0.16, 0.8, x + 5.6, 0.58, z + 1.4);
  addCylinder(wood, 0.06, 0.06, 3.2, 5, x - 6.3, 1.6, z - 6.2);
  addCylinder(wood, 0.06, 0.06, 3.2, 5, x + 6.3, 1.6, z - 6.2);
  addBar(wood, x - 6.3, z - 6.2, x + 6.3, z - 6.2, 3.08, 0.05, 0.05);
  for (let i = 0; i < 5; i++) {
    const cx = x - 5.5 + i * 2.7;
    addBox(cloth, 1.55, 1.0, 0.045, cx, 2.5, z - 6.2);
    addBox(cloth, 1.55, 0.14, 0.06, cx, 3.0, z - 6.2);
  }
  for (const [arr, mat] of [[stone, mats.stone], [wood, mats.naxiWoodDark], [cloth, mats.cloth], [pots, mats.terracotta], [roof, mats.roofGreyDark]]) {
    const m = mergedMesh(arr, mat, true, true);
    if (m) group.add(m);
  }
}

export function createCloseDetail(config) {
  const {
    halfX = 128, halfZ = 140, wallH = 10, wallT = 7, gateWidth = 15,
    gates = [], watches = [], wells = [], compounds = [],
  } = config;
  const group = new THREE.Group();
  const courses = [];
  const caps = [];
  const walkJoints = [];
  addWallCourses(courses, caps, walkJoints, halfX, halfZ, wallH, wallT, gateWidth);
  const cm = mergedMesh(courses, mats.greyBrickDark, false, true);
  if (cm) group.add(cm);
  const capm = mergedMesh(caps, mats.roofGreyDark, true, true);
  if (capm) group.add(capm);
  const wjm = mergedMesh(walkJoints, mats.greyBrickDark, false, true);
  if (wjm) group.add(wjm);
  for (const g of gates) addGateDoors(group, g, wallH);
  for (const w of watches) addWatchBeams(group, w);
  const joints = [];
  const curbs = [];
  addStreetJoints(joints, curbs);
  const jm = mergedMesh(joints, mats.greyBrickDark, false, true);
  if (jm) group.add(jm);
  const cbm = mergedMesh(curbs, mats.stone, false, true);
  if (cbm) group.add(cbm);
  addWells(group, wells);
  for (const c of compounds) addCourtyard(group, c);
  return { group, wells };
}

