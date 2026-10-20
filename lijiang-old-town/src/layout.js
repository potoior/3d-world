import * as THREE from 'three';
import { mats, makeWaterMaterial } from './materials.js';
import { addBox, mergedMesh, mergeStaticGroup } from './geometry.js';
import { createStoneBridge, createHill } from './westlakeDetails.js';
import { createPottedPlant } from './richProps.js';
import {
  createNaxiHouse,
  createCanal,
  createWaterwheel,
  createSnowMountain,
  createCourtyard,
  createStall,
  createLanternString,
  addTree,
} from './town.js';
import { createTownLife } from './townLife.js';
import { createOldTownDetail } from './oldTownDetail.js';

export const CANALS = [
  { x: 52, z: -7.5, w: 9, d: 315, rot: 0 },
  { x: -36.25, z: 62, w: 167.5, d: 7, rot: 0 },
  { x: -58, z: -20.75, w: 6.5, d: 158.5, rot: 0 },
];

export const WATER_RECTS = [
  { minX: 47.5, maxX: 56.5, minZ: -165, maxZ: 150 },
  { minX: -120, maxX: 47.5, minZ: 58.5, maxZ: 65.5 },
  { minX: -61.25, maxX: -54.75, minZ: -100, maxZ: 58.5 },
];

export const BRIDGES = [
  { x: 52, z: -96, rot: Math.PI / 2, span: 10.5, width: 4.6, rise: 1.5, baseY: 0.2 },
  { x: 52, z: -28, rot: Math.PI / 2, span: 10.5, width: 4.6, rise: 1.5, baseY: 0.2 },
  { x: 52, z: 24, rot: Math.PI / 2, span: 10.5, width: 4.8, rise: 1.5, baseY: 0.2 },
  { x: 52, z: 92, rot: Math.PI / 2, span: 10.5, width: 4.6, rise: 1.5, baseY: 0.2 },
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
  { x: -8, z: 47, w: 30, d: 14, rot: Math.PI, storeys: 2, name: '四方街', seed: 11 },
  { x: 24, z: 46, w: 14, d: 12, rot: Math.PI, storeys: 2, name: '普洱茶', seed: 12 },
  { x: -36, z: 46, w: 15, d: 12, rot: Math.PI, storeys: 1, name: '东巴纸坊', seed: 13 },
  { x: -31, z: -17, w: 17, d: 11, storeys: 1, name: '银器', seed: 14 },
  { x: -11, z: -17, w: 17, d: 11, storeys: 2, name: '丽江粑粑', seed: 15 },
  { x: 9, z: -17, w: 15, d: 11, storeys: 1, name: '蜡染', seed: 16 },
  { x: 26, z: -17, w: 12, d: 11, seed: 17 },
  { x: -42, z: -2, w: 14, d: 11, rot: Math.PI / 2, storeys: 1, name: '客栈', seed: 18 },
  { x: -42, z: 17, w: 14, d: 11, rot: Math.PI / 2, storeys: 2, name: '茶马古道', seed: 19 },
  { x: -42, z: 36, w: 12, d: 11, rot: Math.PI / 2, seed: 20 },
  { x: 38, z: -2, w: 14, d: 11, rot: -Math.PI / 2, storeys: 2, name: '客栈', seed: 21 },
  { x: 38, z: 36, w: 13, d: 11, rot: -Math.PI / 2, seed: 22 },

  { x: 41, z: -146, w: 12, d: 9, rot: Math.PI / 2, storeys: 1, name: '银器', seed: 30 },
  { x: 41, z: -112, w: 13, d: 9, rot: Math.PI / 2, storeys: 2, seed: 31 },
  { x: 41, z: -88, w: 13, d: 9, rot: Math.PI / 2, storeys: 1, name: '东巴纸坊', seed: 32 },
  { x: 41, z: -64, w: 13, d: 9, rot: Math.PI / 2, storeys: 1, seed: 33 },
  { x: 41, z: -42, w: 13, d: 9, rot: Math.PI / 2, storeys: 2, name: '客栈', seed: 34 },
  { x: 41, z: 78, w: 13, d: 9, rot: Math.PI / 2, storeys: 1, name: '丽江粑粑', seed: 35 },
  { x: 41, z: 102, w: 13, d: 9, rot: Math.PI / 2, storeys: 2, seed: 36 },
  { x: 41, z: 124, w: 13, d: 9, rot: Math.PI / 2, storeys: 1, name: '普洱茶', seed: 37 },
  { x: 41, z: 142, w: 11, d: 9, rot: Math.PI / 2, storeys: 1, seed: 38 },

  { x: 66, z: -146, w: 13, d: 9, rot: -Math.PI / 2, storeys: 1, seed: 40 },
  { x: 66, z: -124, w: 13, d: 9, rot: -Math.PI / 2, storeys: 2, name: '客栈', seed: 41 },
  { x: 66, z: -102, w: 13, d: 9, rot: -Math.PI / 2, storeys: 1, name: '蜡染', seed: 42 },
  { x: 66, z: -80, w: 13, d: 9, rot: -Math.PI / 2, storeys: 1, seed: 43 },
  { x: 66, z: -58, w: 13, d: 9, rot: -Math.PI / 2, storeys: 2, name: '茶马古道', seed: 44 },
  { x: 66, z: -36, w: 13, d: 9, rot: -Math.PI / 2, storeys: 1, seed: 45 },
  { x: 66, z: -14, w: 13, d: 9, rot: -Math.PI / 2, storeys: 1, name: '银器', seed: 46 },
  { x: 66, z: 8, w: 13, d: 9, rot: -Math.PI / 2, storeys: 2, seed: 47 },
  { x: 66, z: 32, w: 13, d: 9, rot: -Math.PI / 2, storeys: 1, name: '四方街', seed: 48 },
  { x: 66, z: 84, w: 13, d: 9, rot: -Math.PI / 2, storeys: 1, seed: 49 },
  { x: 66, z: 108, w: 13, d: 9, rot: -Math.PI / 2, storeys: 2, name: '客栈', seed: 50 },
  { x: 66, z: 132, w: 13, d: 9, rot: -Math.PI / 2, storeys: 1, name: '普洱茶', seed: 51 },

  { x: -70, z: -90, w: 13, d: 9, rot: Math.PI / 2, storeys: 1, seed: 60 },
  { x: -70, z: -68, w: 13, d: 9, rot: Math.PI / 2, storeys: 2, name: '客栈', seed: 61 },
  { x: -70, z: -46, w: 13, d: 9, rot: Math.PI / 2, storeys: 1, name: '银器', seed: 62 },
  { x: -70, z: -24, w: 13, d: 9, rot: Math.PI / 2, storeys: 1, seed: 63 },
  { x: -70, z: -2, w: 13, d: 9, rot: Math.PI / 2, storeys: 2, name: '丽江粑粑', seed: 64 },
  { x: -70, z: 20, w: 13, d: 9, rot: Math.PI / 2, storeys: 1, name: '蜡染', seed: 65 },
  { x: -70, z: 40, w: 11, d: 9, rot: Math.PI / 2, storeys: 1, seed: 66 },
  { x: -48, z: -90, w: 13, d: 8, rot: -Math.PI / 2, storeys: 1, seed: 67 },
  { x: -48, z: -68, w: 13, d: 8, rot: -Math.PI / 2, storeys: 2, name: '东巴纸坊', seed: 68 },
  { x: -48, z: -46, w: 13, d: 8, rot: -Math.PI / 2, storeys: 1, seed: 69 },
  { x: -48, z: -24, w: 13, d: 8, rot: -Math.PI / 2, storeys: 1, name: '客栈', seed: 70 },

  { x: -90, z: -40, w: 14, d: 10, rot: Math.PI / 2, storeys: 1, seed: 80 },
  { x: -90, z: -12, w: 14, d: 10, rot: Math.PI / 2, storeys: 2, name: '茶马古道', seed: 81 },
  { x: -90, z: 16, w: 14, d: 10, rot: Math.PI / 2, storeys: 1, seed: 82 },
  { x: -90, z: 44, w: 14, d: 10, rot: Math.PI / 2, storeys: 1, name: '客栈', seed: 83 },
  { x: -112, z: -30, w: 14, d: 10, rot: -Math.PI / 2, storeys: 1, seed: 84 },
  { x: -112, z: 0, w: 14, d: 10, rot: -Math.PI / 2, storeys: 2, name: '普洱茶', seed: 85 },
  { x: -112, z: 30, w: 14, d: 10, rot: -Math.PI / 2, storeys: 1, seed: 86 },
  { x: -112, z: 60, w: 14, d: 10, rot: -Math.PI / 2, storeys: 1, name: '银器', seed: 87 },

  { x: 92, z: -120, w: 14, d: 10, rot: -Math.PI / 2, storeys: 1, seed: 90 },
  { x: 92, z: -90, w: 14, d: 10, rot: -Math.PI / 2, storeys: 2, name: '客栈', seed: 91 },
  { x: 92, z: -60, w: 14, d: 10, rot: -Math.PI / 2, storeys: 1, seed: 92 },
  { x: 92, z: -30, w: 14, d: 10, rot: -Math.PI / 2, storeys: 1, name: '蜡染', seed: 93 },
  { x: 92, z: 0, w: 14, d: 10, rot: -Math.PI / 2, storeys: 2, name: '客栈', seed: 94 },
  { x: 92, z: 30, w: 14, d: 10, rot: -Math.PI / 2, storeys: 1, seed: 95 },
  { x: 92, z: 60, w: 14, d: 10, rot: -Math.PI / 2, storeys: 1, name: '普洱茶', seed: 96 },
  { x: 92, z: 96, w: 14, d: 10, rot: -Math.PI / 2, storeys: 1, seed: 97 },
  { x: 92, z: 126, w: 14, d: 10, rot: -Math.PI / 2, storeys: 2, name: '丽江粑粑', seed: 98 },

  { x: -30, z: 150, w: 18, d: 11, rot: Math.PI, storeys: 1, seed: 100 },
  { x: -4, z: 152, w: 18, d: 11, rot: Math.PI, storeys: 2, name: '客栈', seed: 101 },
  { x: 22, z: 152, w: 18, d: 11, rot: Math.PI, storeys: 1, name: '东巴纸坊', seed: 102 },
  { x: 43, z: 164, w: 14, d: 10, rot: Math.PI, storeys: 1, seed: 103 },
  { x: -18, z: 86, w: 14, d: 10, rot: Math.PI / 2, storeys: 2, name: '客栈', seed: 104 },
  { x: 15, z: 86, w: 14, d: 10, rot: -Math.PI / 2, storeys: 1, seed: 105 },
  { x: -18, z: 116, w: 14, d: 10, rot: Math.PI / 2, storeys: 1, name: '银器', seed: 106 },
  { x: 15, z: 116, w: 14, d: 10, rot: -Math.PI / 2, storeys: 2, name: '普洱茶', seed: 107 },
  { x: -20, z: -152, w: 16, d: 10, storeys: 1, seed: 108 },
  { x: 12, z: -152, w: 16, d: 10, storeys: 2, name: '客栈', seed: 109 },
];

function addHouse(root, spots, def) {
  const h = createNaxiHouse(def);
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
  [46, -152], [46, -110], [46, -70], [46, -30], [46, 12], [46, 54],
  [46, 100], [46, 138],
  [59, -132], [59, -88], [59, -48], [59, -8], [59, 38], [59, 80],
  [59, 120], [59, 142],
  [-63.5, -88], [-63.5, -58], [-63.5, -28], [-63.5, 2], [-63.5, 32],
  [-52.5, -80], [-52.5, -52], [-52.5, -20],
  [-100, 92], [-80, 70], [86, 72], [78, 150], [-122, 122],
  [110, -160], [-104, -140], [-24, 22], [18, 22],
];

const POTS = [
  [-34, -8], [-34, 40], [27, -8], [27, 40], [-22, -6], [6, 40],
  [45.8, -98], [58.2, -94], [45.8, -30], [58.2, -26], [45.8, 94],
  [58.2, 90], [-40, 60], [-24, 60],
  [-86, 56], [20, 56], [12, 90], [-20, 140],
];

export function buildLijiangScene() {
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
  laneStrip(6.0, 320, 42.5, -7);
  laneStrip(5.6, 320, 61.4, -7);
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
    root.add(createStoneBridge({ ...b, snow: false, name: '' }));
  }

  for (const def of HOUSE_DEFS) addHouse(root, spots, def);

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
    { x1: 45, z1: 42, x2: 59.5, z2: 42, y: 5.2, count: 4, seed: 2.8 },
    { x1: 45, z1: -102, x2: 59.5, z2: -102, y: 5.2, count: 4, seed: 3.6 },
    { x1: 45, z1: -34, x2: 59.5, z2: -34, y: 5.2, count: 4, seed: 4.4 },
    { x1: -18, z1: 66, x2: 16, z2: 66, y: 5.8, count: 6, seed: 5.2 },
  ];
  for (const s of strings) {
    const str = createLanternString(s);
    root.add(str.group);
    spots.push(...str.spots);
  }

  const detail = createOldTownDetail({
    canals: CANALS,
    bridges: BRIDGES,
    houses: HOUSE_DEFS,
    lanternSpots: spots,
  });
  root.add(detail.staticGroup);

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
  root.add(createSnowMountain());

  const wheel = createWaterwheel({ x: 52, z: -128 });
  root.add(wheel.staticGroup);

  const merged = mergeStaticGroup(root);
  merged.add(wheel.rotating);
  const life = createTownLife({ lanternSpots: spots, waterwheel: wheel.rotating });
  const baseLifeUpdate = life.update;
  life.update = (time, dt) => {
    baseLifeUpdate(time, dt);
    detail.update(time, dt);
  };
  merged.add(life.group);
  merged.add(detail.dynamicGroup);

  return {
    group: merged,
    waterMaterial,
    life,
    waterwheel: wheel.rotating,
    lanternMaterial: mats.lanternRed,
    glowMaterial: life.glowMaterial,
    spawn: SPAWN,
  };
}
