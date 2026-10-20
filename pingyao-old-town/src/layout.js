import * as THREE from 'three';
import { mats } from './materials.js';
import { addBox, mergedMesh, mergeStaticGroup } from './geometry.js';
import { createHill } from './westlakeDetails.js';
import { createWell } from './richProps.js';
import { createPingyaoHouse, createElmTree, createLanternString, createShopStall } from './houses.js';
import { createCityWall, createMarketTower } from './citywall.js';
import { createTownLife } from './townLife.js';

export const SPAWN = { x: 0, z: -158, yaw: Math.PI };
export const BOUNDS = { minX: -170, maxX: 170, minZ: -190, maxZ: 190 };
export const COLLIDERS = { boxes: [], circles: [], names: [] };
export const FP_WORLD = {
  lake: [],
  waterRects: [],
  causeways: [],
  bridges: [],
  islets: [],
  spawn: SPAWN,
  bounds: BOUNDS,
  colliders: COLLIDERS,
};

const HALF_X = 128;
const HALF_Z = 140;
const WALL_H = 10;
const WALL_T = 7;

function addBoxCollider(x, z, w, d, name) {
  COLLIDERS.boxes.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
  COLLIDERS.names.push(name);
}

function addCircleCollider(x, z, r, name) {
  COLLIDERS.circles.push({ x, z, r });
  COLLIDERS.names.push(name);
}

function addHouse(root, spots, def) {
  const h = createPingyaoHouse(def);
  root.add(h.group);
  spots.push(...h.spots);
  addBoxCollider(
    (h.collider.minX + h.collider.maxX) * 0.5,
    (h.collider.minZ + h.collider.maxZ) * 0.5,
    h.collider.maxX - h.collider.minX,
    h.collider.maxZ - h.collider.minZ,
    def.name || '民居'
  );
}

function compound(root, { x, z, w, d, seed }) {
  const wall = [];
  const cap = [];
  const h = 2.75;
  const gap = 3.2;
  addBox(wall, (w - gap) * 0.5, h, 0.5, x - (w + gap) * 0.25, h * 0.5, z + d * 0.5);
  addBox(wall, (w - gap) * 0.5, h, 0.5, x + (w + gap) * 0.25, h * 0.5, z + d * 0.5);
  addBox(wall, w, h, 0.5, x, h * 0.5, z - d * 0.5);
  addBox(wall, 0.5, h, d, x - w * 0.5, h * 0.5, z);
  addBox(wall, 0.5, h, d, x + w * 0.5, h * 0.5, z);
  addBox(cap, w + 0.36, 0.22, 0.9, x, h + 0.08, z - d * 0.5);
  addBox(cap, 0.9, 0.22, d + 0.36, x - w * 0.5, h + 0.08, z);
  addBox(cap, 0.9, 0.22, d + 0.36, x + w * 0.5, h + 0.08, z);
  addBox(cap, w + 0.36, 0.22, 0.9, x, h + 0.08, z + d * 0.5);
  addBox(cap, gap + 0.6, 0.3, 1.1, x, h + 0.22, z + d * 0.5);
  const wm = mergedMesh(wall, mats.greyBrick, true, true);
  if (wm) root.add(wm);
  const cm = mergedMesh(cap, mats.roofGreyDark, true, true);
  if (cm) root.add(cm);
  root.add(createElmTree({ x: x - w * 0.16, z: z - d * 0.12, seed, scale: 1.05 }));
  addCircleCollider(x - w * 0.16, z - d * 0.12, 0.7, '院中榆树');
}

const MAIN_NS = [
  { z: -124, name: '醋坊', storeys: 1, banner: true },
  { z: -106, name: '布庄', storeys: 2 },
  { z: -88, name: '镖局', storeys: 2, banner: true },
  { z: -70, name: '牛肉', storeys: 1 },
  { z: -52, name: '酒坊', storeys: 2, banner: true },
  { z: -34, name: '', storeys: 1 },
  { z: 34, name: '推光漆器', storeys: 2 },
  { z: 52, name: '', storeys: 1 },
  { z: 70, name: '茶楼', storeys: 2, banner: true },
  { z: 88, name: '客栈', storeys: 2 },
  { z: 106, name: '', storeys: 1 },
  { z: 124, name: '客栈', storeys: 2, banner: true },
];

const MAIN_EW = [
  { x: -116, name: '客栈', storeys: 2 },
  { x: -98, name: '', storeys: 1 },
  { x: -82, name: '票号', storeys: 2, banner: true },
  { x: -46, name: '醋坊', storeys: 1 },
  { x: -30, name: '', storeys: 1 },
  { x: 30, name: '布庄', storeys: 2 },
  { x: 46, name: '牛肉', storeys: 1, banner: true },
  { x: 82, name: '酒坊', storeys: 2 },
  { x: 98, name: '', storeys: 1 },
  { x: 116, name: '茶楼', storeys: 2, banner: true },
];

const STREET_LANTERNS = [
  { x1: -7, z1: -112, x2: 7, z2: -112, y: 6.2, count: 5 },
  { x1: -7, z1: -74, x2: 7, z2: -74, y: 6.2, count: 5 },
  { x1: -7, z1: -36, x2: 7, z2: -36, y: 6.2, count: 5 },
  { x1: -7, z1: 36, x2: 7, z2: 36, y: 6.2, count: 5 },
  { x1: -7, z1: 78, x2: 7, z2: 78, y: 6.2, count: 5 },
  { x1: -7, z1: 116, x2: 7, z2: 116, y: 6.2, count: 5 },
  { x1: -112, z1: -7, x2: -112, z2: 7, y: 6.2, count: 5 },
  { x1: -48, z1: -7, x2: -48, z2: 7, y: 6.2, count: 5 },
  { x1: 48, z1: -7, x2: 48, z2: 7, y: 6.2, count: 5 },
  { x1: 112, z1: -7, x2: 112, z2: 7, y: 6.2, count: 5 },
];

const ELMS = [
  [-100, -112], [-48, -104], [104, -116], [56, -78], [-112, 48],
  [110, 92], [-92, 98], [44, 112], [-44, 48], [56, 48],
  [-88, -44], [90, -52], [-142, -82], [142, 76], [-146, 118],
  [146, -120], [-96, -164], [96, 166], [-32, 166], [34, -166],
  [-76, 28], [78, 34], [-14, 100], [14, -96],
];

const WELLS = [
  [30, 29, 1.0], [-31, -63, 1.0], [86, -36, 0.92], [-90, 86, 0.95],
];

const STALLS = [
  { x: -12, z: 62, rot: 0.2, accent: 'rust' },
  { x: 13, z: 62, rot: -0.3, accent: 'indigo' },
  { x: -13, z: 42, rot: 2.8, accent: 'indigo' },
  { x: 12, z: 42, rot: 3.3, accent: 'rust' },
  { x: 14, z: -18, rot: 3.1, accent: 'rust' },
  { x: -14, z: -18, rot: 0.1, accent: 'indigo' },
];

export function buildPingyaoScene() {
  const root = new THREE.Group();
  const spots = [];

  const terrain = new THREE.Mesh(new THREE.PlaneGeometry(2200, 2200), mats.dirt);
  terrain.rotation.x = -Math.PI / 2;
  terrain.position.y = -0.32;
  terrain.receiveShadow = true;
  root.add(terrain);

  const cityGround = new THREE.Mesh(new THREE.PlaneGeometry(HALF_X * 2 + 14, HALF_Z * 2 + 14), mats.stoneLane);
  cityGround.rotation.x = -Math.PI / 2;
  cityGround.position.y = 0;
  cityGround.receiveShadow = true;
  root.add(cityGround);

  const lanes = [];
  const lane = (w, d, x, z) => addBox(lanes, w, 0.09, d, x, 0.045, z);
  lane(15, 280, 0, 0);
  lane(256, 15, 0, 0);
  lane(9, 268, -68, 0);
  lane(9, 268, 68, 0);
  lane(248, 9, 0, -72);
  lane(248, 9, 0, 72);
  lane(6, 260, -112, 0);
  lane(6, 260, 112, 0);
  lane(244, 6, 0, -112);
  lane(244, 6, 0, 112);
  lane(30, 22, 0, 52);
  lane(26, 18, -18, -140);
  lane(26, 18, 18, 140);
  const laneMesh = mergedMesh(lanes, mats.stoneLane, false, true);
  if (laneMesh) root.add(laneMesh);

  const dust = [];
  addBox(dust, 7.4, 0.06, 34, -23, 0.065, -134);
  addBox(dust, 7.4, 0.06, 26, 23, 0.065, 136);
  addBox(dust, 22, 0.06, 6, -134, 0.065, 22);
  addBox(dust, 26, 0.06, 6, 134, 0.065, -22);
  const dustMesh = mergedMesh(dust, mats.rammedEarth, false, true);
  if (dustMesh) root.add(dustMesh);

  const wall = createCityWall({ halfX: HALF_X, halfZ: HALF_Z, height: WALL_H, thickness: WALL_T, gateWidth: 15 });
  root.add(wall.group);
  addBoxCollider(-(HALF_X + 7.5) * 0.5, -HALF_Z, HALF_X - 7.5, WALL_T, '南城墙');
  addBoxCollider((HALF_X + 7.5) * 0.5, -HALF_Z, HALF_X - 7.5, WALL_T, '南城墙');
  addBoxCollider(-(HALF_X + 7.5) * 0.5, HALF_Z, HALF_X - 7.5, WALL_T, '北城墙');
  addBoxCollider((HALF_X + 7.5) * 0.5, HALF_Z, HALF_X - 7.5, WALL_T, '北城墙');
  addBoxCollider(-HALF_X, -(HALF_Z + 7.5) * 0.5, WALL_T, HALF_Z - 7.5, '西城墙');
  addBoxCollider(-HALF_X, (HALF_Z + 7.5) * 0.5, WALL_T, HALF_Z - 7.5, '西城墙');
  addBoxCollider(HALF_X, -(HALF_Z + 7.5) * 0.5, WALL_T, HALF_Z - 7.5, '东城墙');
  addBoxCollider(HALF_X, (HALF_Z + 7.5) * 0.5, WALL_T, HALF_Z - 7.5, '东城墙');

  for (const def of MAIN_NS) {
    for (const side of [-1, 1]) {
      if (side > 0 && (def.z === 34 || def.z === 52 || def.z === 70)) continue;
      if (side < 0 && (def.z === -34 || def.z === -52)) continue;
      const x = side * 21;
      addHouse(root, spots, {
        x,
        z: def.z,
        w: 13.5,
        d: 10,
        rot: side > 0 ? -Math.PI / 2 : Math.PI / 2,
        storeys: def.storeys,
        name: def.name,
        seed: 300 + def.z + side,
        banner: def.banner,
      });
    }
  }

  for (const def of MAIN_EW) {
    for (const side of [-1, 1]) {
      const z = side * 21;
      addHouse(root, spots, {
        x: def.x,
        z,
        w: 13.5,
        d: 10,
        rot: side > 0 ? Math.PI : 0,
        storeys: def.storeys,
        name: def.name,
        seed: 600 + def.x + side,
        banner: def.banner,
      });
    }
  }

  addHouse(root, spots, {
    x: 21, z: 40, w: 15, d: 11, rot: -Math.PI / 2, storeys: 2,
    name: '日昇昌', seed: 910, banner: true,
  });
  addHouse(root, spots, {
    x: -21, z: -44, w: 15, d: 11, rot: Math.PI / 2, storeys: 2,
    name: '镖局', seed: 911, banner: true,
  });
  addHouse(root, spots, {
    x: 21, z: 66, w: 15, d: 11, rot: -Math.PI / 2, storeys: 2,
    name: '客栈', seed: 912, banner: true,
  });

  const market = createMarketTower({ x: 0, z: 52 });
  root.add(market.group);
  market.colliders.forEach((c) => COLLIDERS.boxes.push(c));
  spots.push(...market.spots);

  for (const [x, z, w, d, seed] of [
    [-100, -100, 30, 24, 711], [100, -100, 30, 24, 713],
    [-100, 100, 30, 24, 715], [100, 100, 30, 24, 717],
  ]) {
    compound(root, { x, z, w, d, seed });
  }

  for (let i = 0; i < STREET_LANTERNS.length; i++) {
    const s = STREET_LANTERNS[i];
    const str = createLanternString({ ...s, seed: i * 1.3 + 0.4 });
    root.add(str.group);
    spots.push(...str.spots);
  }

  for (let i = 0; i < STALLS.length; i++) {
    const stall = createShopStall({ ...STALLS[i], seed: i + 1 });
    root.add(stall.group);
    spots.push(...stall.spots);
    addCircleCollider(STALLS[i].x, STALLS[i].z, 1.75, '摊位');
  }

  for (let i = 0; i < ELMS.length; i++) {
    const [x, z] = ELMS[i];
    root.add(createElmTree({ x, z, seed: 900 + i, scale: 0.9 + (i % 4) * 0.07 }));
    addCircleCollider(x, z, 0.7, '榆树');
  }

  for (const [x, z, scale] of WELLS) {
    const well = createWell({ x, z, scale });
    root.add(well);
    addCircleCollider(x, z, 1.25 * scale, '水井');
  }

  const hills = [
    [-300, -230, 220, 130, 48, mats.hillFar, 71],
    [305, -210, 230, 140, 54, mats.hillFar, 73],
    [-320, 180, 240, 150, 42, mats.hill, 75],
    [330, 190, 250, 150, 46, mats.hillFar, 77],
    [-70, 350, 280, 150, 38, mats.hillFar, 79],
    [220, 330, 240, 140, 34, mats.hillFar, 81],
  ];
  for (const [x, z, rx, rz, h, mat, seed] of hills) {
    root.add(createHill({ x, z, rx, rz, h, mat, seed }));
  }

  const merged = mergeStaticGroup(root);
  const life = createTownLife({
    lanternSpots: spots,
    chimneys: [
      [-100, -100], [100, -100], [-100, 100], [100, 100],
      [21, 66], [-21, -44], [30, -52], [-82, 21],
    ],
  });
  merged.add(life.group);

  return {
    group: merged,
    life,
    lanternMaterial: mats.lanternRed,
    glowMaterial: life.glowMaterial,
    spawn: SPAWN,
  };
}

