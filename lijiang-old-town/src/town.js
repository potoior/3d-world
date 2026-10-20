import * as THREE from 'three';
import { mats } from './materials.js';
import { addBox, addCylinder, mergedMesh } from './geometry.js';
import { createRoofGeometry } from './roof.js';
import { getPlaqueMaterial } from './gardenBuild.js';
import { createWillow } from './gardenDetails.js';
import { createPottedPlant } from './richProps.js';
import { createHill } from './westlakeDetails.js';

export const SIGN_NAMES = ['四方街', '茶马古道', '丽江粑粑', '东巴纸坊', '银器', '客栈', '普洱茶', '蜡染'];

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

export function createNaxiHouse({
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
  const stone = [];
  const lattice = [];
  const pots = [];
  const blossoms = [];
  const shrubs = [];
  const goods = [];
  const cloth = [];
  const indigo = [];
  const rust = [];
  const spots = [];

  const baseH = 0.42;
  const wallH = 3.25;
  const upperH = storeys > 1 ? 2.45 : 0;
  const top = baseH + wallH + upperH;
  const rnd = (n) => {
    const v = Math.sin(seed * 71.3 + n * 47.9) * 43758.5453;
    return v - Math.floor(v);
  };

  addBox(stone, w + 0.36, baseH, d + 0.36, 0, baseH * 0.5, 0);
  addBox(wood, w, wallH, d, 0, baseH + wallH * 0.5, 0);
  if (storeys > 1) addBox(white, w - 0.12, upperH, d - 0.12, 0, baseH + wallH + upperH * 0.5, 0);

  const postH = wallH + upperH;
  for (const sx of [-1, 1]) {
    addBox(dark, 0.26, postH, 0.26, sx * (w * 0.5 - 0.18), baseH + postH * 0.5, d * 0.5 - 0.18);
    addBox(dark, 0.26, postH, 0.26, sx * (w * 0.5 - 0.18), baseH + postH * 0.5, -d * 0.5 + 0.18);
  }
  addBox(dark, w + 0.1, 0.2, 0.22, 0, baseH + wallH - 0.1, d * 0.5 + 0.02);
  addBox(dark, w + 0.1, 0.18, 0.22, 0, top - 0.12, d * 0.5 + 0.02);

  if (shop) {
    addBox(dark, w * 0.56, 2.05, 0.14, 0, 1.48, d * 0.5 + 0.04);
    addBox(wood, w * 0.62, 0.82, 0.54, 0, 0.86, d * 0.5 + 0.4);
    for (let i = 0; i < 3; i++) {
      const bx = -w * 0.22 + i * w * 0.22;
      addCylinder(goods, 0.17, 0.21, 0.55 + (i % 2) * 0.2, 8, bx, 0.42, d * 0.5 + 0.56);
    }
  }

  const winY = baseH + (storeys > 1 ? wallH + upperH * 0.48 : 1.65);
  const winCount = storeys > 1 ? 3 : 2;
  for (let i = 0; i < winCount; i++) {
    const wx = -w * 0.24 + (i * w * 0.48) / (winCount - 1);
    addBox(dark, w * 0.19, 1.02, 0.1, wx, winY, d * 0.5 + 0.03);
    addBox(lattice, w * 0.175, 0.94, 0.06, wx, winY, d * 0.5 + 0.09);
  }
  if (storeys > 1) {
    for (const sx of [-1, 1]) {
      addBox(dark, 0.1, 0.95, d * 0.24, sx * (w * 0.5 + 0.01), winY, -d * 0.1);
      addBox(lattice, 0.06, 0.88, d * 0.22, sx * (w * 0.5 + 0.055), winY, -d * 0.1);
    }
  }

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
  const roofH = storeys > 1 ? 2.15 : 1.65;
  const roofGeo = createRoofGeometry({
    width: w + 1.65,
    depth: d + 1.8,
    height: roofH,
    cornerLift: 0.72,
    curve: 1.48,
    ridgeRatio: 0.52,
    segments: 12,
    vSegments: 8,
  });
  const roof = new THREE.Mesh(roofGeo, rnd(7) > 0.55 ? mats.tileDark : mats.tile);
  roof.position.y = roofBase;
  roof.castShadow = true;
  roof.receiveShadow = true;
  group.add(roof);
  addBox(dark, Math.max(2.2, w - d * 0.35), 0.16, 0.18, 0, roofBase + roofH + 0.02, 0);

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
    [wood, mats.naxiWood],
    [dark, mats.naxiWoodDark],
    [white, mats.naxiWall],
    [stone, mats.waterStone],
    [lattice, mats.lattice],
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

export function createCanal({ x = 0, z = 0, w = 9, d = 100, rot = 0, waterMaterial }) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rot;

  const stone = [];
  const bed = new THREE.Mesh(new THREE.BoxGeometry(w + 0.2, 0.4, d + 0.2), mats.lakeBed);
  bed.position.y = -0.56;
  bed.receiveShadow = true;
  group.add(bed);

  const waterGeo = new THREE.PlaneGeometry(w - 0.18, d - 0.18);
  waterGeo.rotateX(-Math.PI / 2);
  const water = new THREE.Mesh(waterGeo, waterMaterial);
  water.position.y = -0.055;
  water.renderOrder = 1;
  group.add(water);

  for (const sx of [-1, 1]) {
    addBox(stone, 0.95, 0.62, d + 0.8, sx * (w * 0.5 + 0.38), -0.05, 0);
    addBox(stone, 1.28, 0.16, d + 0.94, sx * (w * 0.5 + 0.38), 0.31, 0);
    addBox(stone, 0.34, 0.18, d + 0.5, sx * (w * 0.5 + 0.02), 0.08, 0);
  }
  addBox(stone, w + 2.0, 0.7, 0.95, 0, -0.04, d * 0.5 + 0.45);
  addBox(stone, w + 2.0, 0.7, 0.95, 0, -0.04, -d * 0.5 - 0.45);

  for (let i = 0; i < 13; i++) {
    const sz = -d * 0.42 + (i * d * 0.84) / 12;
    const px = (i % 2 === 0 ? -1 : 1) * (w * 0.5 - 0.9);
    const peb = new THREE.SphereGeometry(0.22 + (i % 3) * 0.09, 6, 4);
    peb.scale(1.4, 0.6, 1.1);
    peb.translate(px, -0.38, sz);
    stone.push(peb);
  }
  for (let i = 0; i < Math.max(2, Math.floor(d / 30)); i++) {
    const sz = -d * 0.42 + (i * d * 0.8) / Math.max(1, Math.floor(d / 30) - 1);
    addBox(stone, 0.85, 0.22, 1.5, w * 0.5 + 0.3, 0.18, sz);
    addBox(stone, 0.85, 0.22, 1.5, -w * 0.5 - 0.3, 0.18, sz);
  }

  const sm = mergedMesh(stone, mats.waterStone, true, true);
  if (sm) group.add(sm);
  return group;
}

function wheelMeshes(radius = 3.45) {
  const wood = [];
  const dark = [];
  for (const xoff of [-2.15, 2.15]) {
    const ring = new THREE.TorusGeometry(radius, 0.11, 5, 22);
    ring.rotateY(Math.PI / 2);
    ring.translate(xoff, 0, 0);
    dark.push(ring);
    const inner = new THREE.TorusGeometry(radius * 0.56, 0.075, 4, 18);
    inner.rotateY(Math.PI / 2);
    inner.translate(xoff, 0, 0);
    dark.push(inner);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const spoke = new THREE.BoxGeometry(0.11, radius, 0.11);
      spoke.translate(0, radius * 0.5, 0);
      spoke.rotateX(a);
      spoke.translate(xoff, 0, 0);
      wood.push(spoke);
      const paddle = new THREE.BoxGeometry(0.58, 0.16, 1.0);
      paddle.translate(0, radius - 0.18, 0);
      paddle.rotateX(a);
      paddle.translate(xoff, 0, 0);
      dark.push(paddle);
    }
    const hub = new THREE.CylinderGeometry(0.32, 0.32, 1.35, 10);
    hub.rotateZ(Math.PI / 2);
    hub.translate(xoff, 0, 0);
    wood.push(hub);
  }
  return {
    wood: mergedMesh(wood, mats.naxiWood, true, true),
    dark: mergedMesh(dark, mats.naxiWoodDark, true, true),
  };
}

export function createWaterwheel({ x = 52, z = -128, y = 2.65 }) {
  const frame = [];
  const stone = [];
  const fx = 4.85;
  for (const sx of [-1, 1]) {
    addBox(frame, 0.42, 5.1, 0.42, sx * fx, 2.55, z);
    addBox(frame, 0.32, 4.6, 0.32, sx * fx, 2.3, z + 2.1);
    addBox(frame, 0.32, 4.6, 0.32, sx * fx, 2.3, z - 2.1);
    addBox(frame, 0.24, 0.24, 4.5, sx * fx, 4.5, z + 0.05);
    addBox(stone, 1.6, 0.5, 1.6, sx * fx, 0.25, z);
    addBox(stone, 1.1, 0.36, 1.1, sx * fx, 0.18, z + 2.1);
  }
  addBox(frame, fx * 2, 0.38, 0.4, 0, y + 0.45, z);
  addBox(frame, fx * 2, 0.26, 0.26, 0, y + 1.9, z);
  addBox(frame, 2.2, 0.55, 5.6, 0, 4.62, z);
  addBox(frame, 1.5, 0.16, 5.9, 0, 4.94, z);
  const frameMesh = mergedMesh(frame, mats.naxiWoodDark, true, true);
  const stoneMesh = mergedMesh(stone, mats.waterStone, true, true);
  const staticGroup = new THREE.Group();
  if (frameMesh) staticGroup.add(frameMesh);
  if (stoneMesh) staticGroup.add(stoneMesh);

  const rotating = new THREE.Group();
  rotating.position.set(x, y, z);
  const wm = wheelMeshes(3.45);
  if (wm.wood) rotating.add(wm.wood);
  if (wm.dark) rotating.add(wm.dark);

  const axleMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 11.2, 8), mats.naxiWoodDark);
  axleMesh.rotation.z = Math.PI / 2;
  rotating.add(axleMesh);

  return { staticGroup, rotating };
}

export function createSnowMountain() {
  const group = new THREE.Group();
  const peaks = [
    [-60, -525, 165, 268, 1],
    [-235, -492, 138, 196, 2],
    [105, -515, 152, 232, 3],
    [235, -470, 120, 168, 4],
    [-365, -448, 118, 150, 5],
  ];
  for (const [px, pz, radius, height, seed] of peaks) {
    const geo = new THREE.ConeGeometry(radius, height, 14, 5);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vy = pos.getY(i);
      const vz = pos.getZ(i);
      const edge = Math.hypot(vx / radius, vz / radius);
      const jitter = Math.sin(seed * 17.3 + i * 2.7) * 0.09 * (0.35 + edge);
      pos.setX(i, vx * (1 + jitter));
      pos.setZ(i, vz * (1 + jitter));
      pos.setY(i, vy + Math.sin(i * 1.7 + seed) * height * 0.012);
    }
    geo.computeVertexNormals();
    const rock = new THREE.Mesh(geo, mats.hillFar);
    rock.position.set(px, height * 0.5 - 2, pz);
    rock.castShadow = false;
    rock.receiveShadow = true;
    group.add(rock);

    const capH = height * 0.44;
    const capR = radius * 0.54;
    const cap = new THREE.Mesh(new THREE.ConeGeometry(capR, capH, 14, 2), mats.snow);
    cap.position.set(px, height - capH * 0.5 - 2 + height * 0.012, pz);
    cap.receiveShadow = true;
    group.add(cap);
  }
  group.add(createHill({ x: -120, z: -372, rx: 190, rz: 96, h: 54, mat: mats.hill, seed: 41 }));
  group.add(createHill({ x: 140, z: -350, rx: 165, rz: 88, h: 44, mat: mats.hill, seed: 43 }));
  group.add(createHill({ x: -330, z: -300, rx: 160, rz: 90, h: 38, mat: mats.hill, seed: 45 }));
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
  const wm = mergedMesh(wall, mats.naxiWall, true, true);
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
    [wood, mats.naxiWood],
    [dark, mats.naxiWoodDark],
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
  const pm = mergedMesh(posts, mats.naxiWoodDark, true, true);
  if (pm) group.add(pm);
  const wm = mergedMesh(wire, mats.naxiWoodDark, true, false);
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
