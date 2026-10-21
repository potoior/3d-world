import * as THREE from 'three';
import { mats, makeWaterMaterial } from './materials.js';
import { addBox, addBar, mergedMesh, mergeStaticGroup } from './geometry.js';
import { createStoneBridge, createHill } from './westlakeDetails.js';
import { createPottedPlant } from './richProps.js';
import { createLotus } from './gardenDetails.js';
import {
  createHuizhouHouse,
  createWaterLane,
  createCourtyard,
  createStall,
  createLanternString,
  createAncientTree,
  createWatersideSteps,
  createPainterEasel,
  addTree,
} from './town.js';
import { createTownLife } from './townLife.js';

export const WATER_LANES = [
  { x: 52, z: -4, w: 4.6, d: 300, rot: 0 },
  { x: -58, z: -14, w: 3.6, d: 170, rot: 0 },
];

export const MOON_POND = { x: -8, z: 10, rx: 15, rz: 9 };
export const SOUTH_LAKE = { x: 12, z: -205, rx: 132, rz: 42 };

export function halfMoonPolygon({ x, z, rx, rz, segments = 44 }) {
  const pts = [];
  for (let i = 0; i <= segments; i++) {
    const a = (Math.PI * i) / segments;
    pts.push([x + rx * Math.cos(a), z + rz * Math.sin(a)]);
  }
  return pts;
}

export function lakePolygon({ x, z, rx, rz, segments = 72 }) {
  const pts = [];
  for (let i = 0; i < segments; i++) {
    const a = (Math.PI * 2 * i) / segments;
    const wobble = 1 + Math.sin(a * 3 + 0.8) * 0.045 + Math.sin(a * 7 - 1.2) * 0.018;
    pts.push([x + Math.cos(a) * rx * wobble, z + Math.sin(a) * rz * wobble]);
  }
  return pts;
}

const MOON_POLY = halfMoonPolygon(MOON_POND);
const LAKE_POLY = lakePolygon(SOUTH_LAKE);

export const WATER_RECTS = [
  { minX: 49.6, maxX: 54.4, minZ: -155, maxZ: 147 },
  { minX: -59.9, maxX: -56.1, minZ: -100, maxZ: 72 },
  { minX: SOUTH_LAKE.x - SOUTH_LAKE.rx, maxX: SOUTH_LAKE.x + SOUTH_LAKE.rx, minZ: SOUTH_LAKE.z - SOUTH_LAKE.rz, maxZ: SOUTH_LAKE.z + SOUTH_LAKE.rz },
];

export const BRIDGES = [
  { x: 52, z: -96, rot: Math.PI / 2, span: 10.5, width: 4.6, rise: 1.5, baseY: 0.2 },
  { x: 52, z: -28, rot: Math.PI / 2, span: 10.5, width: 4.6, rise: 1.5, baseY: 0.2 },
  { x: 52, z: 24, rot: Math.PI / 2, span: 10.5, width: 4.6, rise: 1.5, baseY: 0.2 },
  { x: 52, z: 92, rot: Math.PI / 2, span: 10.5, width: 4.6, rise: 1.5, baseY: 0.2 },
  { x: -58, z: -46, rot: Math.PI / 2, span: 8.8, width: 4.0, rise: 1.25, baseY: 0.2 },
  { x: -58, z: 10, rot: Math.PI / 2, span: 8.8, width: 4.0, rise: 1.25, baseY: 0.2 },
  { x: -8, z: 10, rot: 0, span: 21, width: 3.6, rise: 1.35, baseY: 0.2 },
  { x: 45, z: -164, rot: 0, span: 18, width: 4.6, rise: 1.6, baseY: 0.2 },
];

export const SPAWN = { x: 36, z: -157, yaw: 0.45 };
export const BOUNDS = { minX: -165, maxX: 145, minZ: -252, maxZ: 195 };
export const COLLIDERS = { boxes: [], circles: [], names: [] };
export const FP_WORLD = {
  lake: MOON_POLY,
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
  { x: -8, z: 47, w: 30, d: 14, rot: Math.PI, storeys: 2, name: '乐叙堂', seed: 11 },
  { x: 24, z: 46, w: 14, d: 12, rot: Math.PI, storeys: 2, name: '茶庄', seed: 12 },
  { x: -36, z: 46, w: 15, d: 12, rot: Math.PI, storeys: 1, name: '宣纸坊', seed: 13 },
  { x: -31, z: -17, w: 17, d: 11, storeys: 1, name: '徽墨', seed: 14 },
  { x: -11, z: -17, w: 17, d: 11, storeys: 2, name: '徽州饼', seed: 15 },
  { x: 9, z: -17, w: 15, d: 11, storeys: 1, name: '布坊', seed: 16 },
  { x: 26, z: -17, w: 12, d: 11, seed: 17 },
  { x: -42, z: -2, w: 14, d: 11, rot: Math.PI / 2, storeys: 1, name: '客栈', seed: 18 },
  { x: -42, z: 17, w: 14, d: 11, rot: Math.PI / 2, storeys: 2, name: '徽商故里', seed: 19 },
  { x: -42, z: 36, w: 12, d: 11, rot: Math.PI / 2, seed: 20 },
  { x: 38, z: -2, w: 14, d: 11, rot: -Math.PI / 2, storeys: 2, name: '客栈', seed: 21 },
  { x: 38, z: 36, w: 13, d: 11, rot: -Math.PI / 2, seed: 22 },

  { x: 41, z: -146, w: 12, d: 9, rot: Math.PI / 2, storeys: 1, name: '徽墨', seed: 30 },
  { x: 41, z: -112, w: 13, d: 9, rot: Math.PI / 2, storeys: 2, seed: 31 },
  { x: 41, z: -88, w: 13, d: 9, rot: Math.PI / 2, storeys: 1, name: '宣纸坊', seed: 32 },
  { x: 41, z: -64, w: 13, d: 9, rot: Math.PI / 2, storeys: 1, seed: 33 },
  { x: 41, z: -42, w: 13, d: 9, rot: Math.PI / 2, storeys: 2, name: '客栈', seed: 34 },
  { x: 41, z: 78, w: 13, d: 9, rot: Math.PI / 2, storeys: 1, name: '徽州饼', seed: 35 },
  { x: 41, z: 102, w: 13, d: 9, rot: Math.PI / 2, storeys: 2, seed: 36 },
  { x: 41, z: 124, w: 13, d: 9, rot: Math.PI / 2, storeys: 1, name: '茶庄', seed: 37 },
  { x: 41, z: 142, w: 11, d: 9, rot: Math.PI / 2, storeys: 1, seed: 38 },

  { x: 66, z: -146, w: 13, d: 9, rot: -Math.PI / 2, storeys: 1, seed: 40 },
  { x: 66, z: -124, w: 13, d: 9, rot: -Math.PI / 2, storeys: 2, name: '客栈', seed: 41 },
  { x: 66, z: -102, w: 13, d: 9, rot: -Math.PI / 2, storeys: 1, name: '布坊', seed: 42 },
  { x: 66, z: -80, w: 13, d: 9, rot: -Math.PI / 2, storeys: 1, seed: 43 },
  { x: 66, z: -58, w: 13, d: 9, rot: -Math.PI / 2, storeys: 2, name: '徽商故里', seed: 44 },
  { x: 66, z: -36, w: 13, d: 9, rot: -Math.PI / 2, storeys: 1, seed: 45 },
  { x: 66, z: -14, w: 13, d: 9, rot: -Math.PI / 2, storeys: 1, name: '徽墨', seed: 46 },
  { x: 66, z: 8, w: 13, d: 9, rot: -Math.PI / 2, storeys: 2, seed: 47 },
  { x: 66, z: 32, w: 13, d: 9, rot: -Math.PI / 2, storeys: 1, name: '南湖书院', seed: 48 },
  { x: 66, z: 84, w: 13, d: 9, rot: -Math.PI / 2, storeys: 1, seed: 49 },
  { x: 66, z: 108, w: 13, d: 9, rot: -Math.PI / 2, storeys: 2, name: '客栈', seed: 50 },
  { x: 66, z: 132, w: 13, d: 9, rot: -Math.PI / 2, storeys: 1, name: '茶庄', seed: 51 },

  { x: -70, z: -90, w: 13, d: 9, rot: Math.PI / 2, storeys: 1, seed: 60 },
  { x: -70, z: -68, w: 13, d: 9, rot: Math.PI / 2, storeys: 2, name: '客栈', seed: 61 },
  { x: -70, z: -46, w: 13, d: 9, rot: Math.PI / 2, storeys: 1, name: '徽墨', seed: 62 },
  { x: -70, z: -24, w: 13, d: 9, rot: Math.PI / 2, storeys: 1, seed: 63 },
  { x: -70, z: -2, w: 13, d: 9, rot: Math.PI / 2, storeys: 2, name: '徽州饼', seed: 64 },
  { x: -70, z: 20, w: 13, d: 9, rot: Math.PI / 2, storeys: 1, name: '布坊', seed: 65 },
  { x: -70, z: 40, w: 11, d: 9, rot: Math.PI / 2, storeys: 1, seed: 66 },
  { x: -48, z: -90, w: 13, d: 8, rot: -Math.PI / 2, storeys: 1, seed: 67 },
  { x: -48, z: -68, w: 13, d: 8, rot: -Math.PI / 2, storeys: 2, name: '宣纸坊', seed: 68 },
  { x: -48, z: -46, w: 13, d: 8, rot: -Math.PI / 2, storeys: 1, seed: 69 },
  { x: -48, z: -24, w: 13, d: 8, rot: -Math.PI / 2, storeys: 1, name: '客栈', seed: 70 },

  { x: -90, z: -40, w: 14, d: 10, rot: Math.PI / 2, storeys: 1, seed: 80 },
  { x: -90, z: -12, w: 14, d: 10, rot: Math.PI / 2, storeys: 2, name: '徽商故里', seed: 81 },
  { x: -90, z: 16, w: 14, d: 10, rot: Math.PI / 2, storeys: 1, seed: 82 },
  { x: -90, z: 44, w: 14, d: 10, rot: Math.PI / 2, storeys: 1, name: '客栈', seed: 83 },
  { x: -112, z: -30, w: 14, d: 10, rot: -Math.PI / 2, storeys: 1, seed: 84 },
  { x: -112, z: 0, w: 14, d: 10, rot: -Math.PI / 2, storeys: 2, name: '茶庄', seed: 85 },
  { x: -112, z: 30, w: 14, d: 10, rot: -Math.PI / 2, storeys: 1, seed: 86 },
  { x: -112, z: 60, w: 14, d: 10, rot: -Math.PI / 2, storeys: 1, name: '徽墨', seed: 87 },

  { x: 92, z: -120, w: 14, d: 10, rot: -Math.PI / 2, storeys: 1, seed: 90 },
  { x: 92, z: -90, w: 14, d: 10, rot: -Math.PI / 2, storeys: 2, name: '客栈', seed: 91 },
  { x: 92, z: -60, w: 14, d: 10, rot: -Math.PI / 2, storeys: 1, seed: 92 },
  { x: 92, z: -30, w: 14, d: 10, rot: -Math.PI / 2, storeys: 1, name: '布坊', seed: 93 },
  { x: 92, z: 0, w: 14, d: 10, rot: -Math.PI / 2, storeys: 2, name: '客栈', seed: 94 },
  { x: 92, z: 30, w: 14, d: 10, rot: -Math.PI / 2, storeys: 1, seed: 95 },
  { x: 92, z: 60, w: 14, d: 10, rot: -Math.PI / 2, storeys: 1, name: '茶庄', seed: 96 },
  { x: 92, z: 96, w: 14, d: 10, rot: -Math.PI / 2, storeys: 1, seed: 97 },
  { x: 92, z: 126, w: 14, d: 10, rot: -Math.PI / 2, storeys: 2, name: '徽州饼', seed: 98 },

  { x: -30, z: 150, w: 18, d: 11, rot: Math.PI, storeys: 1, seed: 100 },
  { x: -4, z: 152, w: 18, d: 11, rot: Math.PI, storeys: 2, name: '客栈', seed: 101 },
  { x: 22, z: 152, w: 18, d: 11, rot: Math.PI, storeys: 1, name: '宣纸坊', seed: 102 },
  { x: 43, z: 164, w: 14, d: 10, rot: Math.PI, storeys: 1, seed: 103 },
  { x: -18, z: 86, w: 14, d: 10, rot: Math.PI / 2, storeys: 2, name: '客栈', seed: 104 },
  { x: 15, z: 86, w: 14, d: 10, rot: -Math.PI / 2, storeys: 1, seed: 105 },
  { x: -18, z: 116, w: 14, d: 10, rot: Math.PI / 2, storeys: 1, name: '徽墨', seed: 106 },
  { x: 15, z: 116, w: 14, d: 10, rot: -Math.PI / 2, storeys: 2, name: '茶庄', seed: 107 },
  { x: -20, z: -152, w: 16, d: 10, storeys: 1, seed: 108 },
  { x: 12, z: -152, w: 16, d: 10, storeys: 2, name: '客栈', seed: 109 },
];

function addHouse(root, spots, def) {
  const h = createHuizhouHouse(def);
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
  [46, -152], [46, -110], [46, -70], [46, -30], [46, 12], [46, 54], [46, 100], [46, 138],
  [59, -132], [59, -88], [59, -48], [59, -8], [59, 38], [59, 80], [59, 120], [59, 142],
  [-63.5, -88], [-63.5, -58], [-63.5, -28], [-63.5, 2], [-63.5, 32],
  [-52.5, -80], [-52.5, -52], [-52.5, -20],
  [-25, 7], [9, 7], [-21, 20], [13, 20],
  [-118, -160], [-88, -162], [-58, -162], [-30, -162], [-2, -163],
  [26, -162], [58, -162], [88, -161], [118, -160],
  [-120, 122], [-100, 92], [-80, 70], [86, 72], [78, 150],
  [110, -160], [-104, -140], [-24, 22], [18, 22],
];

const ANCIENT_TREES = [
  [-28, 27, 301, 1.0], [18, 27, 302, 0.95], [-100, -151, 303, 1.15],
  [76, -151, 304, 1.05], [-122, 122, 305, 1.1], [104, 118, 306, 0.95],
];

const POTS = [
  [-34, -8], [-34, 40], [27, -8], [27, 40], [-25, -6], [10, 40],
  [45.8, -98], [58.2, -94], [45.8, -30], [58.2, -26], [45.8, 94],
  [58.2, 90], [-40, 60], [-24, 60],
  [-86, 56], [20, 56], [12, 90], [-20, 140],
];

function pointsToShape(points, scale = 1) {
  const shape = new THREE.Shape();
  points.forEach(([px, pz], i) => {
    const x = px * scale;
    const y = -pz * scale;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  });
  shape.closePath();
  return shape;
}

function makeWaterBody(points, waterMaterial, bedY = -0.58) {
  const group = new THREE.Group();
  const bedGeo = new THREE.ShapeGeometry(pointsToShape(points, 1.015));
  bedGeo.rotateX(-Math.PI / 2);
  const bed = new THREE.Mesh(bedGeo, mats.lakeBed);
  bed.position.y = bedY;
  bed.receiveShadow = true;
  group.add(bed);

  const waterGeo = new THREE.ShapeGeometry(pointsToShape(points, 0.995));
  waterGeo.rotateX(-Math.PI / 2);
  const water = new THREE.Mesh(waterGeo, waterMaterial);
  water.position.y = -0.055;
  water.renderOrder = 1;
  group.add(water);

  const stone = [];
  const moss = [];
  const joints = [];
  for (let i = 0; i < points.length - 1; i += 2) {
    const [ax, az] = points[i];
    const [bx, bz] = points[Math.min(points.length - 1, i + 2)];
    addBar(stone, ax, az, bx, bz, 0.02, 0.56, 0.9);
    addBar(moss, ax, az, bx, bz, 0.2, 0.1, 0.2);
    addBar(joints, ax, az, bx, bz, 0.32, 0.04, 1.02);
  }
  const sm = mergedMesh(stone, mats.waterStone, true, true);
  if (sm) group.add(sm);
  const mm = mergedMesh(moss, mats.moss, true, true);
  if (mm) group.add(mm);
  const jm = mergedMesh(joints, mats.pavingJoint, false, true);
  if (jm) group.add(jm);
  return group;
}

export function buildHongcunScene() {
  const root = new THREE.Group();
  const waterMaterial = makeWaterMaterial();
  const spots = [];

  const terrain = new THREE.Mesh(new THREE.PlaneGeometry(2200, 2200), mats.grass);
  terrain.rotation.x = -Math.PI / 2;
  terrain.position.y = -0.42;
  terrain.receiveShadow = true;
  root.add(terrain);

  const townGround = new THREE.Mesh(new THREE.PlaneGeometry(360, 500), mats.townPaving);
  townGround.rotation.x = -Math.PI / 2;
  townGround.position.y = 0.0;
  townGround.receiveShadow = true;
  root.add(townGround);

  const lanes = [];
  const laneStrip = (w, d, x, z) => addBox(lanes, w, 0.06, d, x, 0.03, z);
  laneStrip(6.0, 320, 42.5, -7);
  laneStrip(5.6, 320, 61.4, -7);
  laneStrip(6, 46, -29, 14);
  laneStrip(6, 46, 13, 14);
  laneStrip(44, 5, -8, -2);
  laneStrip(44, 5, -8, 34);
  laneStrip(164, 5.0, -37, 70.5);
  laneStrip(4.6, 158, -50.5, -21);
  laneStrip(4.2, 158, -65.8, -21);
  laneStrip(9, 158, -6, -92);
  laneStrip(8, 110, -4, 97);
  laneStrip(72, 5, 0, 104);
  laneStrip(9, 32, -2, -176);
  laneStrip(10, 60, 52, -176);
  laneStrip(250, 8, 8, -158);
  const laneMesh = mergedMesh(lanes, mats.lane, false, true);
  if (laneMesh) root.add(laneMesh);

  const joints = [];
  for (let z = -150; z <= 145; z += 8) {
    addBox(joints, 5.8, 0.02, 0.08, 42.5, 0.066, z);
    addBox(joints, 5.4, 0.02, 0.08, 61.4, 0.066, z);
  }
  for (let z = -6; z <= 34; z += 8) {
    addBox(joints, 5.8, 0.02, 0.08, -29, 0.066, z);
    addBox(joints, 5.8, 0.02, 0.08, 13, 0.066, z);
  }
  for (let x = -108; x <= 38; x += 8) addBox(joints, 0.08, 0.02, 4.8, x, 0.066, 70.5);
  for (let x = -110; x <= 128; x += 9) addBox(joints, 0.08, 0.02, 7.5, x, 0.066, -158);
  const jointMesh = mergedMesh(joints, mats.pavingJoint, false, true);
  if (jointMesh) root.add(jointMesh);

  for (const c of WATER_LANES) root.add(createWaterLane({ ...c, waterMaterial }));
  root.add(makeWaterBody(MOON_POLY, waterMaterial));
  root.add(makeWaterBody(LAKE_POLY, waterMaterial));

  for (const b of BRIDGES) root.add(createStoneBridge({ ...b, snow: false, name: '' }));

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
    { x: -31, z: 0, rot: 0.35, accent: 'indigo', seed: 221 },
    { x: 20, z: 0, rot: -0.25, accent: 'rust', seed: 222 },
    { x: 21, z: 31, rot: 0.15, accent: 'indigo', seed: 223 },
    { x: -31, z: 31, rot: -0.4, accent: 'rust', seed: 224 },
  ];
  for (const s of stalls) {
    const stall = createStall(s);
    root.add(stall.group);
    addCircleCollider(s.x, s.z, 1.75, '摊位');
  }

  const strings = [
    { x1: -33, z1: 5, x2: -33, z2: 33, y: 6.3, count: 5, seed: 0.4 },
    { x1: 17, z1: 5, x2: 17, z2: 33, y: 6.3, count: 5, seed: 1.9 },
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

  for (let i = 0; i < WILLOWS.length; i++) {
    const [x, z] = WILLOWS[i];
    const scale = 0.88 + (i % 4) * 0.06;
    addTree(root, 'willow', x, z, 300 + i, scale);
    addCircleCollider(x, z, 0.75, '柳树');
  }

  for (let i = 0; i < ANCIENT_TREES.length; i++) {
    const [x, z, seed, scale] = ANCIENT_TREES[i];
    const tree = createAncientTree({ x, z, seed, scale, height: 11.5 });
    root.add(tree);
    addCircleCollider(x, z, 1.15, '古树');
  }

  for (let i = 0; i < POTS.length; i++) {
    const [x, z] = POTS[i];
    const pot = createPottedPlant({ x, z, scale: 1.0 + (i % 3) * 0.18, seed: 500 + i });
    root.add(pot);
  }

  root.add(createLotus({ x: -10, z: 15, radius: 5.2, count: 16, seed: 701 }));
  root.add(createLotus({ x: 1, z: 14, radius: 3.1, count: 9, seed: 702 }));
  root.add(createLotus({ x: -74, z: -184, radius: 10, count: 18, seed: 703 }));
  root.add(createLotus({ x: 62, z: -188, radius: 12, count: 20, seed: 704 }));
  root.add(createLotus({ x: 112, z: -206, radius: 8, count: 12, seed: 705 }));

  root.add(createWatersideSteps({ x: -8, z: 19.6, rot: Math.PI, width: 4.4 }));
  root.add(createWatersideSteps({ x: 30, z: -164.5, rot: Math.PI, width: 5.0 }));
  root.add(createWatersideSteps({ x: 54.4, z: -42, rot: -Math.PI / 2, width: 3.2 }));
  root.add(createWatersideSteps({ x: -60.5, z: 24, rot: Math.PI / 2, width: 2.8 }));

  const easels = [
    [-18, -2, 0.25, 801], [2, -3, -0.2, 802], [13, 22, 2.75, 803],
    [0, -156, 0.1, 804], [42, -156, -0.15, 805],
  ];
  for (const [x, z, rot, seed] of easels) {
    root.add(createPainterEasel({ x, z, rot, seed }));
    addCircleCollider(x, z, 0.55, '画架');
  }

  const hills = [
    [-230, -140, 170, 100, 42, mats.hill, 71],
    [225, -130, 190, 110, 48, mats.hill, 73],
    [-260, 100, 200, 120, 36, mats.hillFar, 75],
    [255, 120, 210, 120, 40, mats.hillFar, 77],
    [-40, 290, 240, 130, 34, mats.hillFar, 79],
    [180, 280, 200, 110, 30, mats.hillFar, 81],
    [-90, -340, 260, 120, 36, mats.hillFar, 83],
    [190, -330, 230, 110, 32, mats.hillFar, 85],
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
    moonPond: MOON_POND,
    southLake: SOUTH_LAKE,
  };
}
