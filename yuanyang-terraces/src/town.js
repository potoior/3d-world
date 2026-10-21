import * as THREE from 'three';
import { mats } from './materials.js';
import { addBox, addCylinder, mergedMesh } from './geometry.js';
import { createRoofGeometry } from './roof.js';
import { getPlaqueMaterial } from './gardenBuild.js';
import { createWillow } from './gardenDetails.js';
import { createPottedPlant } from './richProps.js';
import { createHill } from './westlakeDetails.js';

export const SIGN_NAMES = ['月沼', '南湖', '承志堂', '树人堂', '乐叙堂', '汪氏宗祠', '画桥', '水圳', '徽墨', '宣纸', '客栈', '茶庄'];

function worldPoint(x, z, rot, lx, lz) {
  return [
    x + lx * Math.cos(rot) + lz * Math.sin(rot),
    z - lx * Math.sin(rot) + lz * Math.cos(rot),
  ];
}

function addCloth(list, w, h, x, y, z, rz = 0) {
  const g = new THREE.BoxGeometry(w, h, 0.045);
  if (rz) g.rotateZ(rz);
  g.translate(x, y, z);
  list.push(g);
}

function addFlowerBox({ pots, blossoms, shrubs, x, y, z }) {
  addBox(pots, 1.1, 0.26, 0.36, x, y, z);
  for (let i = 0; i < 4; i++) {
    const b = new THREE.IcosahedronGeometry(0.19 + (i % 2) * 0.05, 0);
    b.translate(x - 0.38 + i * 0.25, y + 0.2, z + ((i % 2) - 0.5) * 0.08);
    if (i % 3 === 0) shrubs.push(b);
    else blossoms.push(b);
  }
}

export function createHuizhouHouse({
  x = 0,
  z = 0,
  w = 12,
  d = 8,
  rot = 0,
  storeys = 1,
  name = '',
  seed = 1,
  lanterns = true,
  balcony = true,
  shop = true,
}) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rot;

  const wood = [];
  const dark = [];
  const white = [];
  const brick = [];
  const stone = [];
  const moss = [];
  const lattice = [];
  const roofRows = [];
  const pots = [];
  const blossoms = [];
  const shrubs = [];
  const goods = [];
  const cloth = [];
  const indigo = [];
  const rust = [];
  const spots = [];

  const baseH = 0.42;
  const wallH = 3.15;
  const upperH = storeys > 1 ? 2.35 : 0;
  const top = baseH + wallH + upperH;
  const rnd = (n) => {
    const v = Math.sin(seed * 71.3 + n * 47.9) * 43758.5453;
    return v - Math.floor(v);
  };

  addBox(stone, w + 0.36, baseH, d + 0.36, 0, baseH * 0.5, 0);
  addBox(white, w, wallH, d, 0, baseH + wallH * 0.5, 0);
  if (storeys > 1) addBox(white, w - 0.12, upperH, d - 0.12, 0, baseH + wallH + upperH * 0.5, 0);
  addBox(moss, w + 0.42, 0.07, d + 0.42, 0, baseH + 0.025, 0);

  const postH = wallH + upperH;
  for (const sx of [-1, 1]) {
    addBox(dark, 0.24, postH, 0.24, sx * (w * 0.5 - 0.16), baseH + postH * 0.5, d * 0.5 - 0.16);
    addBox(dark, 0.24, postH, 0.24, sx * (w * 0.5 - 0.16), baseH + postH * 0.5, -d * 0.5 + 0.16);
    addBox(wood, 0.12, postH - 0.4, 0.1, sx * (w * 0.5 - 0.35), baseH + postH * 0.5, d * 0.5 + 0.02);
  }
  addBox(dark, w + 0.1, 0.18, 0.22, 0, baseH + wallH - 0.1, d * 0.5 + 0.02);
  addBox(dark, w + 0.1, 0.16, 0.22, 0, top - 0.12, d * 0.5 + 0.02);

  if (shop) {
    addBox(dark, w * 0.54, 1.95, 0.14, 0, 1.44, d * 0.5 + 0.04);
    addBox(wood, w * 0.6, 0.8, 0.5, 0, 0.84, d * 0.5 + 0.38);
    for (let i = 0; i < 3; i++) {
      const bx = -w * 0.22 + i * w * 0.22;
      addCylinder(goods, 0.16, 0.2, 0.52 + (i % 2) * 0.2, 8, bx, 0.42, d * 0.5 + 0.54);
    }
  }

  const winY = baseH + (storeys > 1 ? wallH + upperH * 0.48 : 1.65);
  const winCount = storeys > 1 ? 3 : 2;
  for (let i = 0; i < winCount; i++) {
    const wx = -w * 0.24 + (i * w * 0.48) / (winCount - 1);
    addBox(dark, w * 0.19, 1.02, 0.1, wx, winY, d * 0.5 + 0.03);
    addBox(lattice, w * 0.175, 0.94, 0.06, wx, winY, d * 0.5 + 0.09);
    addBox(wood, w * 0.205, 0.08, 0.16, wx, winY - 0.54, d * 0.5 + 0.1);
  }
  if (storeys > 1) {
    for (const sx of [-1, 1]) {
      addBox(dark, 0.1, 0.95, d * 0.24, sx * (w * 0.5 + 0.01), winY, -d * 0.1);
      addBox(lattice, 0.06, 0.88, d * 0.22, sx * (w * 0.5 + 0.055), winY, -d * 0.1);
    }
  }

  const gateW = Math.min(2.7, w * 0.38);
  for (const sx of [-1, 1]) {
    addBox(brick, 0.34, 2.6, 0.26, sx * gateW * 0.5, baseH + 1.3, d * 0.5 + 0.14);
    addBox(roofRows, 0.5, 0.13, 0.46, sx * gateW * 0.5, baseH + 2.64, d * 0.5 + 0.14);
  }
  addBox(brick, gateW + 0.34, 0.34, 0.3, 0, baseH + 2.52, d * 0.5 + 0.14);
  addBox(brick, gateW * 0.78, 0.26, 0.28, 0, baseH + 2.8, d * 0.5 + 0.1);
  addBox(roofRows, gateW * 0.94, 0.11, 0.5, 0, baseH + 2.96, d * 0.5 + 0.1);
  addBox(stone, gateW * 0.9, 0.13, 0.62, 0, 0.065, d * 0.5 + 0.42);

  if (balcony && storeys > 1) {
    addBox(wood, w * 0.9, 0.16, 0.86, 0, baseH + wallH + 0.1, d * 0.5 + 0.42);
    for (let i = 0; i <= 5; i++) {
      const bx = -w * 0.42 + (i * w * 0.84) / 5;
      addBox(dark, 0.1, 0.72, 0.1, bx, baseH + wallH + 0.46, d * 0.5 + 0.78);
    }
    addBox(dark, w * 0.86, 0.1, 0.12, 0, baseH + wallH + 0.86, d * 0.5 + 0.78);
    addFlowerBox({ pots, blossoms, shrubs, x: -w * 0.28, y: baseH + wallH + 0.26, z: d * 0.5 + 0.84 });
    addFlowerBox({ pots, blossoms, shrubs, x: w * 0.26, y: baseH + wallH + 0.26, z: d * 0.5 + 0.84 });
    const c1 = rnd(3) > 0.5 ? indigo : rust;
    addCloth(c1, 0.72, 1.15, -w * 0.04, baseH + wallH - 0.5, d * 0.5 + 0.82, 0.03);
    addCloth(cloth, 0.58, 1.0, w * 0.13, baseH + wallH - 0.42, d * 0.5 + 0.83, -0.02);
  }

  const roofBase = top - 0.06;
  const roofH = storeys > 1 ? 2.05 : 1.62;
  const roofGeo = createRoofGeometry({
    width: w + 1.65,
    depth: d + 1.8,
    height: roofH,
    cornerLift: 0.62,
    curve: 1.5,
    ridgeRatio: 0.52,
    segments: 12,
    vSegments: 8,
  });
  const roof = new THREE.Mesh(roofGeo, rnd(7) > 0.55 ? mats.tileDark : mats.tile);
  roof.position.y = roofBase;
  roof.castShadow = true;
  roof.receiveShadow = true;
  group.add(roof);
  addBox(dark, Math.max(2.2, w - d * 0.35), 0.15, 0.18, 0, roofBase + roofH + 0.02, 0);

  for (const sz of [-1, 1]) {
    addBox(roofRows, w + 1.42, 0.09, 0.26, 0, roofBase + 0.18, sz * (d * 0.5 + 0.78));
    addBox(roofRows, w * 0.9, 0.07, 0.17, 0, roofBase + roofH * 0.54, sz * (d * 0.5 + 0.78) * 0.56);
    addBox(roofRows, w * 0.7, 0.06, 0.14, 0, roofBase + roofH * 0.82, sz * (d * 0.5 + 0.78) * 0.28);
  }

  for (let i = 0; i <= 4; i++) {
    const bx = -w * 0.4 + (i * w * 0.8) / 4;
    addBox(dark, 0.15, 0.32, 0.58, bx, top - 0.62, d * 0.5 + 0.28);
    addBox(dark, 0.15, 0.32, 0.58, bx, top - 0.62, -d * 0.5 - 0.28);
  }

  const gableSteps = [
    [-0.5, -0.16, 0.32],
    [-0.16, 0.16, 0.74],
    [0.16, 0.5, 0.32],
  ];
  for (const sx of [-1, 1]) {
    for (const [z0, z1, rise] of gableSteps) {
      const segD = (z1 - z0) * d;
      const zc = ((z0 + z1) * 0.5) * d;
      const hStep = roofH * rise + 0.28;
      addBox(white, 0.34, hStep, segD + 0.05, sx * (w * 0.5 + 0.14), top + hStep * 0.5 - 0.22, zc);
      addBox(roofRows, 0.5, 0.12, segD + 0.16, sx * (w * 0.5 + 0.14), top + hStep - 0.18, zc);
    }
  }

  if (name) {
    const signY = storeys > 1 ? baseH + wallH + 0.52 : 2.82;
    const signW = Math.min(3.1, Math.max(1.9, name.length * 0.62));
    addBox(dark, signW + 0.18, signW * 0.3125 + 0.16, 0.1, 0, signY, d * 0.5 + 0.2);
    const plaque = new THREE.Mesh(new THREE.PlaneGeometry(signW, signW * 0.3125), getPlaqueMaterial(name));
    plaque.position.set(0, signY, d * 0.5 + 0.26);
    group.add(plaque);
  }

  if (lanterns) {
    const ly = top - 0.12;
    for (const sx of [-1, 1]) {
      const [wx, wz] = worldPoint(x, z, rot, sx * w * 0.31, d * 0.5 + 0.6);
      spots.push({ x: wx, y: ly, z: wz, phase: rnd(11 + sx) * Math.PI * 2 });
    }
    if (storeys > 1) {
      const [wx, wz] = worldPoint(x, z, rot, 0, -d * 0.5 - 0.55);
      spots.push({ x: wx, y: ly, z: wz, phase: rnd(19) * Math.PI * 2 });
    }
  }

  const mods = [
    [wood, mats.huizhouWood],
    [dark, mats.huizhouWoodDark],
    [white, mats.plaster],
    [brick, mats.brick],
    [stone, mats.waterStone],
    [moss, mats.moss],
    [lattice, mats.lattice],
    [roofRows, mats.tileDark],
    [pots, mats.terracotta],
    [blossoms, mats.blossom],
    [shrubs, mats.shrub],
    [goods, mats.terracotta],
    [cloth, mats.cloth],
    [indigo, mats.indigo],
    [rust, mats.rust],
  ];
  for (const [list, mat] of mods) {
    const m = mergedMesh(list, mat, true, true);
    if (m) group.add(m);
  }

  const swap = Math.abs(Math.sin(rot)) > 0.5;
  const cw = (swap ? d : w) + 0.6;
  const cd = (swap ? w : d) + 0.6;
  return {
    group,
    spots,
    collider: { minX: x - cw / 2, maxX: x + cw / 2, minZ: z - cd / 2, maxZ: z + cd / 2 },
  };
}

export function createWaterLane({ x = 0, z = 0, w = 4.2, d = 100, rot = 0, waterMaterial }) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rot;

  const stone = [];
  const moss = [];
  const joints = [];
  const bed = new THREE.Mesh(new THREE.BoxGeometry(w + 0.2, 0.4, d + 0.2), mats.lakeBed);
  bed.position.y = -0.56;
  bed.receiveShadow = true;
  group.add(bed);

  const waterGeo = new THREE.PlaneGeometry(w - 0.16, d - 0.16);
  waterGeo.rotateX(-Math.PI / 2);
  const water = new THREE.Mesh(waterGeo, waterMaterial);
  water.position.y = -0.055;
  water.renderOrder = 1;
  group.add(water);

  for (const sx of [-1, 1]) {
    addBox(stone, 0.72, 0.58, d + 0.7, sx * (w * 0.5 + 0.3), -0.04, 0);
    addBox(stone, 1.02, 0.15, d + 0.82, sx * (w * 0.5 + 0.3), 0.29, 0);
    addBox(stone, 0.28, 0.16, d + 0.4, sx * (w * 0.5 + 0.02), 0.09, 0);
    addBox(moss, 0.16, 0.1, d + 0.3, sx * (w * 0.5 + 0.03), 0.16, 0);
    for (let i = 0; i < Math.floor(d / 6); i++) {
      addBox(joints, 1.0, 0.025, 0.09, sx * (w * 0.5 + 0.3), 0.372, -d * 0.48 + i * 6);
    }
  }
  addBox(stone, w + 1.5, 0.66, 0.8, 0, -0.03, d * 0.5 + 0.38);
  addBox(stone, w + 1.5, 0.66, 0.8, 0, -0.03, -d * 0.5 - 0.38);

  for (let i = 0; i < 12; i++) {
    const sz = -d * 0.42 + (i * d * 0.84) / 11;
    const px = (i % 2 === 0 ? -1 : 1) * (w * 0.5 - 0.7);
    const peb = new THREE.SphereGeometry(0.18 + (i % 3) * 0.07, 6, 4);
    peb.scale(1.35, 0.55, 1.0);
    peb.translate(px, -0.38, sz);
    stone.push(peb);
  }
  for (let i = 0; i < Math.max(2, Math.floor(d / 34)); i++) {
    const sz = -d * 0.42 + (i * d * 0.8) / Math.max(1, Math.floor(d / 34) - 1);
    addBox(stone, 0.72, 0.2, 1.35, w * 0.5 + 0.24, 0.17, sz);
    addBox(stone, 0.72, 0.2, 1.35, -w * 0.5 - 0.24, 0.17, sz);
  }

  const sm = mergedMesh(stone, mats.waterStone, true, true);
  if (sm) group.add(sm);
  const mm = mergedMesh(moss, mats.moss, true, true);
  if (mm) group.add(mm);
  const jm = mergedMesh(joints, mats.pavingJoint, false, true);
  if (jm) group.add(jm);
  return group;
}

export function createAncientTree({ x = 0, z = 0, seed = 1, scale = 1, height = 11 }) {
  const group = new THREE.Group();
  const rnd = (n) => {
    const v = Math.sin(seed * 29.7 + n * 61.3) * 43758.5453;
    return v - Math.floor(v);
  };
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.95, height * 0.56, 9), mats.trunk);
  trunk.position.y = height * 0.28;
  trunk.castShadow = true;
  group.add(trunk);
  const branches = [];
  const crown = [];
  for (let i = 0; i < 5; i++) {
    const a = rnd(i) * Math.PI * 2;
    const b = new THREE.CylinderGeometry(0.12, 0.28, height * 0.38, 6);
    b.rotateZ((rnd(i + 4) - 0.5) * 1.1);
    b.rotateY(a);
    b.translate(Math.cos(a) * height * 0.16, height * 0.62, Math.sin(a) * height * 0.16);
    branches.push(b);
  }
  for (let i = 0; i < 15; i++) {
    const r = 1.4 + rnd(i + 8) * 1.5;
    const blob = new THREE.IcosahedronGeometry(r, 1);
    blob.scale(1.15, 0.72, 1.1);
    blob.translate((rnd(i + 14) - 0.5) * 6.2, height * (0.7 + rnd(i + 21) * 0.26), (rnd(i + 27) - 0.5) * 6.2);
    crown.push(blob);
  }
  const bm = mergedMesh(branches, mats.trunk, true, true);
  if (bm) group.add(bm);
  const cm = mergedMesh(crown, mats.willow, true, true);
  if (cm) group.add(cm);
  group.position.set(x, 0, z);
  group.scale.setScalar(scale);
  return group;
}

export function createWatersideSteps({ x = 0, z = 0, rot = 0, width = 4.2, steps = 5 }) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rot;
  const stone = [];
  const moss = [];
  for (let i = 0; i < steps; i++) {
    const y = 0.12 - i * 0.18;
    const depth = (steps - i) * 0.46;
    addBox(stone, width, 0.18, depth, 0, y, depth * 0.5);
    if (i < 2) addBox(moss, width * 0.92, 0.05, 0.2, 0, y + 0.11, depth - 0.1);
  }
  for (const sx of [-1, 1]) addBox(stone, 0.34, 0.7, steps * 0.5, sx * (width * 0.5 + 0.2), 0.18, steps * 0.25);
  const sm = mergedMesh(stone, mats.waterStone, true, true);
  if (sm) group.add(sm);
  const mm = mergedMesh(moss, mats.moss, true, true);
  if (mm) group.add(mm);
  return group;
}

export function createPainterEasel({ x = 0, z = 0, rot = 0, seed = 1 }) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rot;
  const wood = [];
  const canvas = [];
  for (const sx of [-1, 1]) {
    const leg = new THREE.BoxGeometry(0.06, 1.45, 0.06);
    leg.rotateX(0.24);
    leg.rotateZ(sx * 0.18);
    leg.translate(sx * 0.28, 0.72, 0);
    wood.push(leg);
  }
  const back = new THREE.BoxGeometry(0.06, 1.4, 0.06);
  back.rotateX(-0.3);
  back.translate(0, 0.7, 0.28);
  wood.push(back);
  addBox(wood, 0.9, 0.07, 0.12, 0, 1.05, 0);
  const board = new THREE.BoxGeometry(0.88, 0.64, 0.035);
  board.rotateX(-0.16);
  board.translate(0, 1.22, -0.03);
  canvas.push(board);
  const wm = mergedMesh(wood, mats.huizhouWood, true, true);
  if (wm) group.add(wm);
  const cm = mergedMesh(canvas, mats.cloth, true, true);
  if (cm) group.add(cm);
  return group;
}

export function createCourtyard({ x = 0, z = 0, w = 20, d = 16, rot = 0, seed = 1 }) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rot;
  const wall = [];
  const cap = [];
  const gap = 3.4;
  const h = 2.7;
  addBox(wall, (w - gap) * 0.5, h, 0.42, -(w + gap) * 0.25, h * 0.5, d * 0.5);
  addBox(wall, (w - gap) * 0.5, h, 0.42, (w + gap) * 0.25, h * 0.5, d * 0.5);
  addBox(wall, w, h, 0.42, 0, h * 0.5, -d * 0.5);
  addBox(wall, 0.42, h, d, -w * 0.5, h * 0.5, 0);
  addBox(wall, 0.42, h, d, w * 0.5, h * 0.5, 0);
  addBox(cap, (w - gap) * 0.5, 0.24, 0.72, -(w + gap) * 0.25, h + 0.04, d * 0.5);
  addBox(cap, (w - gap) * 0.5, 0.24, 0.72, (w + gap) * 0.25, h + 0.04, d * 0.5);
  addBox(cap, w + 0.3, 0.24, 0.72, 0, h + 0.04, -d * 0.5);
  addBox(cap, 0.72, 0.24, d + 0.3, -w * 0.5, h + 0.04, 0);
  addBox(cap, 0.72, 0.24, d + 0.3, w * 0.5, h + 0.04, 0);
  addBox(cap, gap + 0.5, 0.26, 0.9, 0, h + 0.26, d * 0.5);

  const roofGeo = createRoofGeometry({
    width: gap + 2.4,
    depth: 2.6,
    height: 1.15,
    cornerLift: 0.45,
    curve: 1.45,
    ridgeRatio: 0.4,
    segments: 8,
    vSegments: 5,
  });
  const gateRoof = new THREE.Mesh(roofGeo, mats.tileDark);
  gateRoof.position.set(0, h + 0.3, d * 0.5 + 0.3);
  group.add(gateRoof);
  const wm = mergedMesh(wall, mats.plaster, true, true);
  if (wm) group.add(wm);
  const cm = mergedMesh(cap, mats.tile, true, true);
  if (cm) group.add(cm);

  const tree = createWillow({ height: 7.2, spread: 2.4, seed });
  tree.position.set(-w * 0.16, 0, -d * 0.12);
  group.add(tree);
  const pot = createPottedPlant({ x: w * 0.26, z: d * 0.18, scale: 1.15, seed: seed + 2 });
  group.add(pot);

  const halfW = w * 0.5 + 0.35;
  const halfD = d * 0.5 + 0.35;
  const colliders = [
    { minX: x - halfW, maxX: x - gap * 0.5, minZ: z + halfD - 0.3, maxZ: z + halfD + 0.3 },
    { minX: x + gap * 0.5, maxX: x + halfW, minZ: z + halfD - 0.3, maxZ: z + halfD + 0.3 },
    { minX: x - halfW, maxX: x + halfW, minZ: z - halfD - 0.3, maxZ: z - halfD + 0.3 },
    { minX: x - halfW - 0.3, maxX: x - halfW + 0.3, minZ: z - halfD, maxZ: z + halfD },
    { minX: x + halfW - 0.3, maxX: x + halfW + 0.3, minZ: z - halfD, maxZ: z + halfD },
  ];
  return { group, colliders };
}

export function createStall({ x = 0, z = 0, rot = 0, accent = 'indigo', seed = 1 }) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rot;
  const wood = [];
  const dark = [];
  const goods = [];
  const clothA = [];
  const clothB = [];
  addBox(dark, 0.16, 2.65, 0.16, -1.35, 1.33, -0.95);
  addBox(dark, 0.16, 2.65, 0.16, 1.35, 1.33, -0.95);
  addBox(dark, 0.16, 2.65, 0.16, -1.35, 1.33, 1.0);
  addBox(dark, 0.16, 2.65, 0.16, 1.35, 1.33, 1.0);
  addBox(wood, 3.0, 0.22, 2.15, 0, 0.95, 0);
  addBox(dark, 2.9, 0.72, 0.16, 0, 0.5, 1.0);
  for (let i = 0; i < 5; i++) {
    const g = new THREE.CylinderGeometry(0.16, 0.19, 0.36 + (i % 2) * 0.14, 7);
    g.translate(-1.05 + i * 0.52, 1.24, 0.18);
    goods.push(g);
  }
  const stripes = 6;
  for (let i = 0; i < stripes; i++) {
    const sx = -1.45 + (i * 2.9) / (stripes - 1);
    const panel = new THREE.BoxGeometry(0.48, 0.07, 2.5);
    panel.rotateX(0.18);
    panel.translate(sx, 2.75, 0.08);
    const list = (i % 2 === 0) === (accent === 'indigo') ? clothA : clothB;
    list.push(panel);
  }
  const matsUsed = [
    [wood, mats.huizhouWood],
    [dark, mats.huizhouWoodDark],
    [goods, mats.terracotta],
    [clothA, accent === 'indigo' ? mats.indigo : mats.rust],
    [clothB, accent === 'indigo' ? mats.cloth : mats.indigo],
  ];
  for (const [list, mat] of matsUsed) {
    const m = mergedMesh(list, mat, true, true);
    if (m) group.add(m);
  }
  return { group, collider: { x, z, r: 1.9 } };
}

export function createLanternString({ x1, z1, x2, z2, y = 6.0, count = 8, seed = 1 }) {
  const group = new THREE.Group();
  const posts = [];
  const wire = [];
  addBox(posts, 0.2, y + 0.5, 0.2, x1, (y + 0.5) * 0.5, z1);
  addBox(posts, 0.2, y + 0.5, 0.2, x2, (y + 0.5) * 0.5, z2);
  addBox(posts, 0.16, 0.16, 0.16, x1, y + 0.35, z1);
  addBox(posts, 0.16, 0.16, 0.16, x2, y + 0.35, z2);
  const dx = x2 - x1;
  const dz = z2 - z1;
  const len = Math.hypot(dx, dz);
  const wireGeo = new THREE.BoxGeometry(0.035, 0.035, len);
  wireGeo.rotateY(Math.atan2(dx, dz));
  wireGeo.translate((x1 + x2) * 0.5, y + 0.38, (z1 + z2) * 0.5);
  wire.push(wireGeo);
  const pm = mergedMesh(posts, mats.huizhouWoodDark, true, true);
  if (pm) group.add(pm);
  const wm = mergedMesh(wire, mats.huizhouWoodDark, true, false);
  if (wm) group.add(wm);
  const spots = [];
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    spots.push({
      x: x1 + dx * t,
      z: z1 + dz * t,
      y: y + 0.34 - Math.sin(t * Math.PI) * 0.25,
      phase: seed + i * 1.37,
    });
  }
  return { group, spots };
}

export function addTree(root, kind, x, z, seed, scale = 1) {
  if (kind === 'willow') {
    const t = createWillow({ height: 7.2 + (seed % 3) * 0.8, spread: 2.5, seed });
    t.position.set(x, 0, z);
    t.scale.setScalar(scale);
    root.add(t);
  } else {
    const t = createPottedPlant({ x, z, scale: scale * 1.8, seed, pine: true });
    root.add(t);
  }
}
