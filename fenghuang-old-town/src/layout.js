import * as THREE from 'three';
import { mats, makeWaterMaterial } from './materials.js';
import { addBox, mergedMesh, mergeStaticGroup } from './geometry.js';
import { createStoneBridge, createHill } from './westlakeDetails.js';
import { createPottedPlant } from './richProps.js';
import {
  createTownHouse,
  createCanal,
  createStiltHouse,
  createMooredBoat,
  createWindRainBridge,
  createWanmingPagoda,
  createEastGateTower,
  createCourtyard,
  createStall,
  createLanternString,
  addTree,
} from './town.js';
import { createTownLife } from './townLife.js';

export const CANALS = [
  { x: 52, z: -7.5, w: 20, d: 315, rot: 0 },
  { x: -36.25, z: 62, w: 167.5, d: 7, rot: 0 },
  { x: -58, z: -20.75, w: 6.5, d: 158.5, rot: 0 },
];

export const WATER_RECTS = [
  { minX: 42, maxX: 62, minZ: -165, maxZ: 150 },
  { minX: -120, maxX: 42, minZ: 58.5, maxZ: 65.5 },
  { minX: -61.25, maxX: -54.75, minZ: -100, maxZ: 58.5 },
];

export const BRIDGES = [
  { x: 52, z: -96, rot: Math.PI / 2, span: 21.0, width: 5.2, rise: 1.8, baseY: 0.2 },
  { x: 52, z: -28, rot: Math.PI / 2, span: 22.0, width: 5.4, rise: 2.0, baseY: 0.35, covered: true },
  { x: 52, z: 24, rot: Math.PI / 2, span: 21.0, width: 5.2, rise: 1.8, baseY: 0.2 },
  { x: 52, z: 92, rot: Math.PI / 2, span: 20.4, width: 5.0, rise: 1.7, baseY: 0.2 },
  { x: -86, z: 62, rot: 0, span: 9.2, width: 4.2, rise: 1.3, baseY: 0.2 },
  { x: -18, z: 62, rot: 0, span: 9.2, width: 4.2, rise: 1.3, baseY: 0.2 },
  { x: 20, z: 62, rot: 0, span: 9.2, width: 4.2, rise: 1.3, baseY: 0.2 },
  { x: -58, z: -46, rot: Math.PI / 2, span: 8.8, width: 4.0, rise: 1.25, baseY: 0.2 },
  { x: -58, z: 10, rot: Math.PI / 2, span: 8.8, width: 4.0, rise: 1.25, baseY: 0.2 },
];

export const SPAWN = { x: 38, z: -162, yaw: 0 };
export const BOUNDS = { minX: -165, maxX: 145, minZ: -205, maxZ: 195 };
export const COLLIDERS = { boxes: [], circles: [], names: [] };
export const FP_WORLD = {
  lake: [],
  waterRects: WATER_RECTS,
  causeways: [],
  bridges: BRIDGES,
  islets: [],
  spawn: SPAWN,
  bounds: BOUNDS,
  colliders: COLLIDERS,
};

function addBoxCollider(x, z, w, d, name) {
  COLLIDERS.boxes.push({
    minX: x - w / 2,
    maxX: x + w / 2,
    minZ: z - d / 2,
    maxZ: z + d / 2,
  });
  COLLIDERS.names.push(name);
}

function addCircleCollider(x, z, r, name) {
  COLLIDERS.circles.push({ x, z, r });
  COLLIDERS.names.push(name);
}

const HOUSE_DEFS = [
  { x: -8, z: 47, w: 30, d: 14, rot: Math.PI, storeys: 2, name: '沱江', seed: 11 },
  { x: 24, z: 46, w: 14, d: 12, rot: Math.PI, storeys: 2, name: '姜糖', seed: 12 },
  { x: -36, z: 46, w: 15, d: 12, rot: Math.PI, storeys: 1, name: '蜡染', seed: 13 },
  { x: -31, z: -17, w: 17, d: 11, storeys: 1, name: '银饰', seed: 14 },
  { x: -11, z: -17, w: 17, d: 11, storeys: 2, name: '血粑鸭', seed: 15 },
  { x: 9, z: -17, w: 15, d: 11, storeys: 1, name: '蜡染', seed: 16 },
  { x: 26, z: -17, w: 12, d: 11, seed: 17 },
  { x: -42, z: -2, w: 14, d: 11, rot: Math.PI / 2, storeys: 1, name: '客栈', seed: 18 },
  { x: -42, z: 17, w: 14, d: 11, rot: Math.PI / 2, storeys: 2, name: '苗银', seed: 19 },
  { x: -42, z: 36, w: 12, d: 11, rot: Math.PI / 2, seed: 20 },
  { x: 38, z: -2, w: 14, d: 11, rot: -Math.PI / 2, storeys: 2, name: '客栈', seed: 21 },
  { x: 38, z: 36, w: 13, d: 11, rot: -Math.PI / 2, seed: 22 },

  { x: 33, z: -146, w: 12, d: 9, rot: Math.PI / 2, storeys: 1, name: '银饰', seed: 30 },
  { x: 33, z: -112, w: 13, d: 9, rot: Math.PI / 2, storeys: 2, seed: 31 },
  { x: 33, z: -88, w: 13, d: 9, rot: Math.PI / 2, storeys: 1, name: '蜡染', seed: 32 },
  { x: 33, z: -64, w: 13, d: 9, rot: Math.PI / 2, storeys: 1, seed: 33 },
  { x: 33, z: -42, w: 13, d: 9, rot: Math.PI / 2, storeys: 2, name: '客栈', seed: 34 },
  { x: 33, z: 78, w: 13, d: 9, rot: Math.PI / 2, storeys: 1, name: '血粑鸭', seed: 35 },
  { x: 33, z: 102, w: 13, d: 9, rot: Math.PI / 2, storeys: 2, seed: 36 },
  { x: 33, z: 124, w: 13, d: 9, rot: Math.PI / 2, storeys: 1, name: '姜糖', seed: 37 },
  { x: 33, z: 142, w: 11, d: 9, rot: Math.PI / 2, storeys: 1, seed: 38 },

  { x: 70, z: -146, w: 13, d: 9, rot: -Math.PI / 2, storeys: 1, seed: 40 },
  { x: 70, z: -124, w: 13, d: 9, rot: -Math.PI / 2, storeys: 2, name: '客栈', seed: 41 },
  { x: 70, z: -102, w: 13, d: 9, rot: -Math.PI / 2, storeys: 1, name: '蜡染', seed: 42 },
  { x: 70, z: -80, w: 13, d: 9, rot: -Math.PI / 2, storeys: 1, seed: 43 },
  { x: 70, z: -58, w: 13, d: 9, rot: -Math.PI / 2, storeys: 2, name: '苗银', seed: 44 },
  { x: 70, z: -36, w: 13, d: 9, rot: -Math.PI / 2, storeys: 1, seed: 45 },
  { x: 70, z: -14, w: 13, d: 9, rot: -Math.PI / 2, storeys: 1, name: '银饰', seed: 46 },
  { x: 70, z: 8, w: 13, d: 9, rot: -Math.PI / 2, storeys: 2, seed: 47 },
  { x: 70, z: 32, w: 13, d: 9, rot: -Math.PI / 2, storeys: 1, name: '沱江', seed: 48 },
  { x: 70, z: 84, w: 13, d: 9, rot: -Math.PI / 2, storeys: 1, seed: 49 },
  { x: 70, z: 108, w: 13, d: 9, rot: -Math.PI / 2, storeys: 2, name: '客栈', seed: 50 },
  { x: 70, z: 132, w: 13, d: 9, rot: -Math.PI / 2, storeys: 1, name: '姜糖', seed: 51 },

  { x: -70, z: -90, w: 13, d: 9, rot: Math.PI / 2, storeys: 1, seed: 60 },
  { x: -70, z: -68, w: 13, d: 9, rot: Math.PI / 2, storeys: 2, name: '客栈', seed: 61 },
  { x: -70, z: -46, w: 13, d: 9, rot: Math.PI / 2, storeys: 1, name: '银饰', seed: 62 },
  { x: -70, z: -24, w: 13, d: 9, rot: Math.PI / 2, storeys: 1, seed: 63 },
  { x: -70, z: -2, w: 13, d: 9, rot: Math.PI / 2, storeys: 2, name: '血粑鸭', seed: 64 },
  { x: -70, z: 20, w: 13, d: 9, rot: Math.PI / 2, storeys: 1, name: '蜡染', seed: 65 },
  { x: -70, z: 40, w: 11, d: 9, rot: Math.PI / 2, storeys: 1, seed: 66 },
  { x: -48, z: -90, w: 13, d: 8, rot: -Math.PI / 2, storeys: 1, seed: 67 },
  { x: -48, z: -68, w: 13, d: 8, rot: -Math.PI / 2, storeys: 2, name: '蜡染', seed: 68 },
  { x: -48, z: -46, w: 13, d: 8, rot: -Math.PI / 2, storeys: 1, seed: 69 },
  { x: -48, z: -24, w: 13, d: 8, rot: -Math.PI / 2, storeys: 1, name: '客栈', seed: 70 },

  { x: -90, z: -40, w: 14, d: 10, rot: Math.PI / 2, storeys: 1, seed: 80 },
  { x: -90, z: -12, w: 14, d: 10, rot: Math.PI / 2, storeys: 2, name: '苗银', seed: 81 },
  { x: -90, z: 16, w: 14, d: 10, rot: Math.PI / 2, storeys: 1, seed: 82 },
  { x: -90, z: 44, w: 14, d: 10, rot: Math.PI / 2, storeys: 1, name: '客栈', seed: 83 },
  { x: -112, z: -30, w: 14, d: 10, rot: -Math.PI / 2, storeys: 1, seed: 84 },
  { x: -112, z: 0, w: 14, d: 10, rot: -Math.PI / 2, storeys: 2, name: '姜糖', seed: 85 },
  { x: -112, z: 30, w: 14, d: 10, rot: -Math.PI / 2, storeys: 1, seed: 86 },
  { x: -112, z: 60, w: 14, d: 10, rot: -Math.PI / 2, storeys: 1, name: '银饰', seed: 87 },

  { x: 92, z: -120, w: 14, d: 10, rot: -Math.PI / 2, storeys: 1, seed: 90 },
  { x: 92, z: -90, w: 14, d: 10, rot: -Math.PI / 2, storeys: 2, name: '客栈', seed: 91 },
  { x: 92, z: -60, w: 14, d: 10, rot: -Math.PI / 2, storeys: 1, seed: 92 },
  { x: 92, z: -30, w: 14, d: 10, rot: -Math.PI / 2, storeys: 1, name: '蜡染', seed: 93 },
  { x: 92, z: 0, w: 14, d: 10, rot: -Math.PI / 2, storeys: 2, name: '客栈', seed: 94 },
  { x: 92, z: 30, w: 14, d: 10, rot: -Math.PI / 2, storeys: 1, seed: 95 },
  { x: 92, z: 60, w: 14, d: 10, rot: -Math.PI / 2, storeys: 1, name: '姜糖', seed: 96 },
  { x: 92, z: 96, w: 14, d: 10, rot: -Math.PI / 2, storeys: 1, seed: 97 },
  { x: 92, z: 126, w: 14, d: 10, rot: -Math.PI / 2, storeys: 2, name: '血粑鸭', seed: 98 },

  { x: -30, z: 150, w: 18, d: 11, rot: Math.PI, storeys: 1, seed: 100 },
  { x: -4, z: 152, w: 18, d: 11, rot: Math.PI, storeys: 2, name: '客栈', seed: 101 },
  { x: 22, z: 152, w: 18, d: 11, rot: Math.PI, storeys: 1, name: '蜡染', seed: 102 },
  { x: 43, z: 164, w: 14, d: 10, rot: Math.PI, storeys: 1, seed: 103 },
  { x: -18, z: 86, w: 14, d: 10, rot: Math.PI / 2, storeys: 2, name: '客栈', seed: 104 },
  { x: 15, z: 86, w: 14, d: 10, rot: -Math.PI / 2, storeys: 1, seed: 105 },
  { x: -18, z: 116, w: 14, d: 10, rot: Math.PI / 2, storeys: 1, name: '银饰', seed: 106 },
  { x: 15, z: 116, w: 14, d: 10, rot: -Math.PI / 2, storeys: 2, name: '姜糖', seed: 107 },
  { x: -20, z: -152, w: 16, d: 10, storeys: 1, seed: 108 },
  { x: 12, z: -152, w: 16, d: 10, storeys: 2, name: '客栈', seed: 109 },
];

function addHouse(root, spots, def) {
  const h = createTownHouse(def);
  root.add(h.group);
  spots.push(...h.spots);
  const name = def.name || '民居';
  addBoxCollider(
    (h.collider.minX + h.collider.maxX) * 0.5,
    (h.collider.minZ + h.collider.maxZ) * 0.5,
    h.collider.maxX - h.collider.minX,
    h.collider.maxZ - h.collider.minZ,
    name
  );
}

const WILLOWS = [
  [38.9, -152], [38.9, -110], [38.9, -70], [38.9, -30], [38.9, 12], [38.9, 54],
  [38.9, 100], [38.9, 138],
  [65.1, -132], [65.1, -88], [65.1, -48], [65.1, -8], [65.1, 38], [65.1, 80],
  [65.1, 120], [65.1, 142],
  [-63.5, -88], [-63.5, -58], [-63.5, -28], [-63.5, 2], [-63.5, 32],
  [-52.5, -80], [-52.5, -52], [-52.5, -20],
  [-100, 92], [-80, 70], [86, 72], [78, 150], [-122, 122],
  [110, -160], [-104, -140], [-24, 22], [18, 22],
];

const POTS = [
  [-34, -8], [-34, 40], [27, -8], [27, 40], [-22, -6], [6, 40],
  [39.2, -98], [64.8, -94], [39.2, -30], [64.8, -26], [39.2, 94],
  [64.8, 90], [-40, 60], [-24, 60],
  [-86, 56], [20, 56], [12, 90], [-20, 140],
];

export function buildFenghuangScene() {
  const root = new THREE.Group();
  const waterMaterial = makeWaterMaterial();
  const spots = [];

  const terrain = new THREE.Mesh(new THREE.PlaneGeometry(2200, 2200), mats.grass);
  terrain.rotation.x = -Math.PI / 2;
  terrain.position.y = -0.42;
  terrain.receiveShadow = true;
  root.add(terrain);

  const townGround = new THREE.Mesh(new THREE.PlaneGeometry(330, 470), mats.townPaving);
  townGround.rotation.x = -Math.PI / 2;
  townGround.position.y = 0.0;
  townGround.receiveShadow = true;
  root.add(townGround);

  const lanes = [];
  const laneStrip = (w, d, x, z) => addBox(lanes, w, 0.06, d, x, 0.03, z);
  laneStrip(3.6, 320, 39.6, -7);
  laneStrip(3.0, 320, 63.6, -7);
  laneStrip(68, 54, -4, 14);
  laneStrip(18, 4.6, 38.5, 24);
  laneStrip(164, 5.0, -37, 70.5);
  laneStrip(4.6, 158, -50.5, -21);
  laneStrip(4.2, 158, -65.8, -21);
  laneStrip(9, 158, -6, -92);
  laneStrip(8, 110, -4, 97);
  laneStrip(72, 5, 0, 104);
  laneStrip(9, 32, -2, -176);
  laneStrip(10, 60, 52, -176);
  const laneMesh = mergedMesh(lanes, mats.lane, false, true);
  if (laneMesh) root.add(laneMesh);

  for (const c of CANALS) {
    root.add(createCanal({ ...c, waterMaterial }));
  }

  for (const b of BRIDGES) {
    if (b.covered) continue;
    root.add(createStoneBridge({ ...b, snow: false, name: '' }));
  }

  for (const def of HOUSE_DEFS) addHouse(root, spots, def);

  const stiltDefs = [
    { x: 42.6, z: -150, rot: Math.PI / 2, seed: 301, name: '吊脚楼' },
    { x: 42.6, z: -118, rot: Math.PI / 2, seed: 302, name: '沱江人家' },
    { x: 42.6, z: -76, rot: Math.PI / 2, seed: 303, name: '' },
    { x: 42.6, z: 52, rot: Math.PI / 2, seed: 304, name: '吊脚楼' },
    { x: 42.6, z: 112, rot: Math.PI / 2, seed: 305, name: '客栈' },
    { x: 61.4, z: -136, rot: -Math.PI / 2, seed: 306, name: '' },
    { x: 61.4, z: -104, rot: -Math.PI / 2, seed: 307, name: '姜糖' },
    { x: 61.4, z: -62, rot: -Math.PI / 2, seed: 308, name: '吊脚楼' },
    { x: 61.4, z: 64, rot: -Math.PI / 2, seed: 309, name: '沱江人家' },
    { x: 61.4, z: 124, rot: -Math.PI / 2, seed: 310, name: '' },
  ];
  for (const def of stiltDefs) {
    const h = createStiltHouse(def);
    root.add(h.group);
    spots.push(...h.spots);
    addBoxCollider(
      (h.collider.minX + h.collider.maxX) * 0.5,
      (h.collider.minZ + h.collider.maxZ) * 0.5,
      h.collider.maxX - h.collider.minX,
      h.collider.maxZ - h.collider.minZ,
      '吊脚楼'
    );
  }

  const covered = BRIDGES.find((b) => b.covered);
  const rainBridge = createWindRainBridge(covered);
  root.add(rainBridge.group);
  spots.push(...rainBridge.spots);

  const pagoda = createWanmingPagoda({ x: 114, z: 92 });
  root.add(pagoda.group);
  spots.push(...pagoda.spots);
  addCircleCollider(pagoda.collider.x, pagoda.collider.z, pagoda.collider.r, '万名塔');

  const eastGate = createEastGateTower({ x: 92, z: 152 });
  root.add(eastGate.group);
  spots.push(...eastGate.spots);
  addBoxCollider(eastGate.collider.x, eastGate.collider.z, eastGate.collider.w, eastGate.collider.d, '东门城楼');

  const moored = [
    { x: 46.4, z: -144, rot: 0.12, seed: 401 },
    { x: 57.4, z: -112, rot: -0.16, seed: 402 },
    { x: 46.1, z: 62, rot: 0.08, seed: 403 },
    { x: 57.3, z: 104, rot: -0.1, seed: 404 },
  ];
  for (const b of moored) root.add(createMooredBoat(b).group);

  const courts = [
    { x: -82, z: 120, w: 24, d: 20, rot: 0, seed: 211 },
    { x: 100, z: -152, w: 24, d: 20, rot: 0, seed: 213 },
    { x: -110, z: -76, w: 22, d: 18, rot: 0, seed: 215 },
  ];
  for (const c of courts) {
    const court = createCourtyard(c);
    root.add(court.group);
    for (const col of court.colliders) COLLIDERS.boxes.push(col);
    COLLIDERS.names.push('院落');
    addCircleCollider(c.x - c.w * 0.12, c.z - c.d * 0.05, 0.9, '院中树');
  }

  const stalls = [
    { x: -25, z: 0, rot: 0.35, accent: 'indigo', seed: 221 },
    { x: 14, z: -2, rot: -0.25, accent: 'rust', seed: 222 },
    { x: 18, z: 27, rot: 0.15, accent: 'indigo', seed: 223 },
    { x: -25, z: 30, rot: -0.4, accent: 'rust', seed: 224 },
  ];
  for (const s of stalls) {
    const stall = createStall(s);
    root.add(stall.group);
    addCircleCollider(s.x, s.z, 1.75, '摊位');
  }

  const strings = [
    { x1: -30, z1: 7, x2: 20, z2: 7, y: 6.3, count: 9, seed: 0.4 },
    { x1: -30, z1: 30, x2: 20, z2: 30, y: 6.3, count: 9, seed: 1.9 },
    { x1: 39.4, z1: 42, x2: 64.6, z2: 42, y: 5.6, count: 7, seed: 2.8 },
    { x1: 39.4, z1: -102, x2: 64.6, z2: -102, y: 5.6, count: 7, seed: 3.6 },
    { x1: 39.4, z1: -34, x2: 64.6, z2: -34, y: 5.6, count: 7, seed: 4.4 },
    { x1: 39.4, z1: -128, x2: 64.6, z2: -128, y: 5.6, count: 7, seed: 4.9 },
    { x1: 39.4, z1: 74, x2: 64.6, z2: 74, y: 5.6, count: 7, seed: 5.6 },
    { x1: -18, z1: 66, x2: 16, z2: 66, y: 5.8, count: 6, seed: 5.2 },
  ];
  for (const s of strings) {
    const str = createLanternString(s);
    root.add(str.group);
    spots.push(...str.spots);
  }

  for (let i = 0; i < WILLOWS.length; i++) {
    const [x, z] = WILLOWS[i];
    const scale = 0.88 + (i % 4) * 0.06;
    addTree(root, 'willow', x, z, 300 + i, scale);
    addCircleCollider(x, z, 0.75, '柳树');
  }

  for (let i = 0; i < POTS.length; i++) {
    const [x, z] = POTS[i];
    const pot = createPottedPlant({ x, z, scale: 1.0 + (i % 3) * 0.18, seed: 500 + i });
    root.add(pot);
  }

  const hills = [
    [-230, -140, 170, 100, 42, mats.hill, 71],
    [225, -130, 190, 110, 48, mats.hill, 73],
    [-260, 100, 200, 120, 36, mats.hillFar, 75],
    [255, 120, 210, 120, 40, mats.hillFar, 77],
    [-40, 290, 240, 130, 34, mats.hillFar, 79],
    [180, 280, 200, 110, 30, mats.hillFar, 81],
  ];
  for (const [x, z, rx, rz, h, mat, seed] of hills) {
    root.add(createHill({ x, z, rx, rz, h, mat, seed }));
  }
  const merged = mergeStaticGroup(root);
  const life = createTownLife({ lanternSpots: spots });
  merged.add(life.group);

  return {
    group: merged,
    waterMaterial,
    life,
    lanternMaterial: mats.lanternRed,
    glowMaterial: life.glowMaterial,
    spawn: SPAWN,
  };
}
