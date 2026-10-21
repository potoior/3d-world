import * as THREE from 'three';
import { mergeStaticGroup } from './geometry.js';

export const SPAWN = { x: 0, z: 138, yaw: 0 };
export const BOUNDS = { minX: -150, maxX: 150, minZ: -160, maxZ: 170 };
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

const MATS = new Map();
function mat(color, rough = 0.95, metal = 0) {
  const key = color + ':' + rough + ':' + metal;
  if (!MATS.has(key)) {
    MATS.set(key, new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal }));
  }
  return MATS.get(key);
}

const C = {
  earth: 0xb27c4f,
  earthLight: 0xc89a68,
  earthPale: 0xd8ae7b,
  earthDark: 0x875738,
  earthDeep: 0x68432d,
  roof: 0x9d6a45,
  roofLight: 0xbe8759,
  timber: 0x60412b,
  timberDark: 0x39271b,
  window: 0x2a2019,
  stone: 0xb99a72,
  lane: 0xc2a076,
  sand: 0xd4b183,
  dust: 0x9c7754,
  mtn: 0x8b6a55,
  mtnFar: 0xa2836d,
  shrub: 0x6d7a47,
};

function rnd(seed, n = 0) {
  const v = Math.sin(seed * 91.7 + n * 47.3 + 13.1) * 43758.5453;
  return v - Math.floor(v);
}

function mesh(g, geo, m, x, y, z, ry = 0, rx = 0, rz = 0) {
  const o = new THREE.Mesh(geo, m);
  o.position.set(x, y, z);
  o.rotation.set(rx, ry, rz);
  o.castShadow = true;
  o.receiveShadow = true;
  g.add(o);
  return o;
}

function box(g, w, h, d, m, x, y, z, ry = 0) {
  return mesh(g, new THREE.BoxGeometry(w, h, d), m, x, y, z, ry);
}

function addCollider(x, z, w, d, ry, name) {
  const c = Math.abs(Math.cos(ry));
  const s = Math.abs(Math.sin(ry));
  const hw = (w * c + d * s) * 0.5;
  const hd = (w * s + d * c) * 0.5;
  COLLIDERS.boxes.push({ minX: x - hw, maxX: x + hw, minZ: z - hd, maxZ: z + hd });
  COLLIDERS.names.push(name);
}

function addCircle(x, z, r, name) {
  COLLIDERS.circles.push({ x, z, r });
  COLLIDERS.names.push(name);
}

function smallDome(g, x, y, z, r, color = C.earthPale) {
  const geo = new THREE.SphereGeometry(r, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.52);
  const dome = mesh(g, geo, mat(color, 0.86), x, y, z);
  dome.scale.y = 0.72;
  return dome;
}

function earthHouse(root, def) {
  const { x, z, w = 13, d = 12, h = 4.2, ry = 0, seed = 1 } = def;
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  const bodyMat = mat(rnd(seed, 1) > 0.55 ? C.earth : C.earthLight, 0.98);
  const trimMat = mat(C.earthDark, 0.97);
  const roofMat = mat(rnd(seed, 2) > 0.5 ? C.roof : C.roofLight, 0.96);
  const timberMat = mat(C.timber, 0.92);
  const darkMat = mat(C.window, 0.95);

  box(g, w + 0.5, 0.32, d + 0.5, trimMat, 0, 0.16, 0);
  box(g, w, h, d, bodyMat, 0, h * 0.5 + 0.3, 0);
  box(g, w + 0.18, 0.24, d + 0.18, roofMat, 0, h + 0.36, 0);
  const ph = 0.72;
  box(g, w + 0.32, ph, 0.3, trimMat, 0, h + 0.66, d * 0.5 + 0.01);
  box(g, w + 0.32, ph, 0.3, trimMat, 0, h + 0.66, -d * 0.5 - 0.01);
  box(g, 0.3, ph, d + 0.32, trimMat, -w * 0.5 - 0.01, h + 0.66, 0);
  box(g, 0.3, ph, d + 0.32, trimMat, w * 0.5 + 0.01, h + 0.66, 0);

  const bays = Math.max(2, Math.round(w / 4.2));
  for (let i = 0; i < bays; i++) {
    const bx = -w * 0.5 + (i + 0.5) * (w / bays);
    box(g, 1.15, 1.3, 0.09, darkMat, bx, h * 0.62, d * 0.5 + 0.05);
    box(g, 1.42, 0.12, 0.2, timberMat, bx, h * 0.62 + 0.72, d * 0.5 + 0.08);
    box(g, 0.12, 1.4, 0.18, timberMat, bx, h * 0.62, d * 0.5 + 0.07);
  }
  const doorX = (bays % 2 === 0 ? -1 : 1) * w * 0.18;
  box(g, 1.55, 2.25, 0.16, timberMat, doorX, 1.42, d * 0.5 + 0.08);
  box(g, 1.24, 2.02, 0.1, darkMat, doorX, 1.36, d * 0.5 + 0.17);
  box(g, 0.12, 1.9, 0.2, mat(C.timberDark, 0.9), doorX, 1.35, d * 0.5 + 0.22);

  const beamCount = Math.max(3, Math.round(w / 2.7));
  for (let i = 0; i <= beamCount; i++) {
    const bx = -w * 0.5 + (i / beamCount) * w;
    box(g, 0.18, 0.18, 0.85, timberMat, bx, h + 0.18, d * 0.5 + 0.18);
  }
  if (def.balcony) {
    box(g, w * 0.52, 0.18, 1.35, timberMat, 0, h * 0.52, d * 0.5 + 0.68);
    for (let i = 0; i < 6; i++) {
      box(g, 0.08, 0.82, 0.08, timberMat, -w * 0.24 + i * w * 0.096, h * 0.52 + 0.48, d * 0.5 + 1.28);
    }
    box(g, w * 0.55, 0.1, 0.12, timberMat, 0, h * 0.52 + 0.9, d * 0.5 + 1.28);
    box(g, w * 0.68, 0.12, 1.55, mat(C.roof, 0.94), 0, h * 0.52 + 1.3, d * 0.5 + 0.72);
  }
  if (def.dome) {
    box(g, 2.9, 1.0, 2.9, bodyMat, w * 0.22, h + 0.9, -d * 0.18);
    smallDome(g, w * 0.22, h + 1.35, -d * 0.18, 1.65, C.earthPale);
  }
  if (def.chimney) {
    box(g, 0.55, 1.65, 0.55, trimMat, -w * 0.26, h + 1.2, -d * 0.22);
  }
  const clutter = Math.floor(rnd(seed, 9) * 4);
  for (let i = 0; i < clutter; i++) {
    const cx = (rnd(seed, 12 + i) - 0.5) * w * 0.65;
    const cz = (rnd(seed, 30 + i) - 0.5) * d * 0.55;
    box(g, 0.6 + rnd(seed, 40 + i) * 0.7, 0.6, 0.5, trimMat, cx, h + 0.8, cz, rnd(seed, 50 + i) * 3);
  }
  root.add(g);
  addCollider(x, z, w, d, ry, def.name || '生土民居');
  return g;
}

const RESERVED = [
  { minX: -90, maxX: -3, minZ: -90, maxZ: 30 },
  { minX: 42, maxX: 106, minZ: -90, maxZ: -3 },
  { minX: 13, maxX: 47, minZ: 0, maxZ: 29 },
  { minX: 26, maxX: 104, minZ: 94, maxZ: 132 },
  { minX: -18, maxX: 18, minZ: 26, maxZ: 100 },
  { minX: -9, maxX: 9, minZ: -12, maxZ: 158 },
  { minX: -132, maxX: 132, minZ: 49, maxZ: 61 },
  { minX: -112, maxX: 112, minZ: 101, maxZ: 109 },
];

function reserved(x, z, w, d) {
  const hw = w * 0.5 + 1.8;
  const hd = d * 0.5 + 1.8;
  for (const r of RESERVED) {
    if (x + hw > r.minX && x - hw < r.maxX && z + hd > r.minZ && z - hd < r.maxZ) return true;
  }
  return false;
}

function buildHouses(root) {
  let seed = 100;
  const rows = [
    { x: -24, zs: [8, 23, 38, 53, 68, 83, 98, 113, 128], w: 13, d: 14, h: 4.3, ry: Math.PI / 2 },
    { x: 24, zs: [8, 23, 38, 53, 68, 83, 98, 113, 128], w: 13, d: 14, h: 4.3, ry: -Math.PI / 2 },
    { x: -50, zs: [-24, -8, 8, 24, 40, 56, 72, 88, 104, 120, 136], w: 12, d: 13, h: 3.8, ry: Math.PI / 2 },
    { x: 50, zs: [32, 48, 64, 80, 96, 112, 128], w: 12, d: 13, h: 3.8, ry: -Math.PI / 2 },
    { x: -82, zs: [-92, -74, -56, -38, -20, -2, 16, 34, 52, 70, 88, 106, 124, 142], w: 11, d: 13, h: 3.6, ry: Math.PI / 2 },
    { x: 82, zs: [24, 40, 56, 72, 88], w: 11, d: 13, h: 3.6, ry: -Math.PI / 2 },
    { x: -118, zs: [-100, -80, -60, -40, -20, 0, 20, 40, 60, 80, 100, 120, 140], w: 11, d: 14, h: 3.4, ry: Math.PI / 2 },
    { x: 118, zs: [-100, -80, -60, -40, -20, 0, 20, 40, 60, 80, 100, 120, 140], w: 11, d: 14, h: 3.4, ry: -Math.PI / 2 },
  ];
  for (const row of rows) {
    row.zs.forEach((z, i) => {
      if (reserved(row.x, z, row.w, row.d)) return;
      seed += 3;
      const h = row.h + (rnd(seed, 4) - 0.5) * 1.5;
      earthHouse(root, {
        x: row.x + (rnd(seed, 5) - 0.5) * 1.2,
        z,
        w: row.w + (rnd(seed, 6) - 0.5) * 2.4,
        d: row.d + (rnd(seed, 7) - 0.5) * 2.2,
        h,
        ry: row.ry,
        seed,
        balcony: rnd(seed, 8) > 0.72,
        dome: rnd(seed, 9) > 0.84,
        chimney: rnd(seed, 10) > 0.5,
        name: '生土民居',
      });
    });
  }

  const backRows = [
    { z: -116, xs: [-126, -102, -78, -54, -30, 30, 54, 78, 102, 126], w: 19, d: 17, h: 4.4 },
    { z: -146, xs: [-120, -94, -68, -42, -16, 16, 42, 68, 94, 120], w: 20, d: 18, h: 5.0 },
    { z: 152, xs: [-126, -102, -78, -54, -30, 30, 54, 78, 102, 126], w: 19, d: 16, h: 4.0 },
  ];
  for (const row of backRows) {
    row.xs.forEach((x) => {
      if (reserved(x, row.z, row.w, row.d)) return;
      seed += 4;
      earthHouse(root, {
        x,
        z: row.z + (rnd(seed, 2) - 0.5) * 3,
        w: row.w,
        d: row.d,
        h: row.h + (rnd(seed, 3) - 0.5) * 1.8,
        ry: 0,
        seed,
        balcony: false,
        dome: rnd(seed, 8) > 0.62,
        chimney: true,
        name: '生土民居',
      });
    });
  }
}

function buildGround(root) {
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(2200, 2200), mat(C.sand, 1.0));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.28;
  ground.receiveShadow = true;
  root.add(ground);

  const town = new THREE.Mesh(new THREE.PlaneGeometry(340, 360), mat(C.dust, 0.99));
  town.rotation.x = -Math.PI / 2;
  town.position.set(0, -0.08, 5);
  town.receiveShadow = true;
  root.add(town);

  const laneMat = mat(C.lane, 0.98);
  const sandMat = mat(C.sand, 1.0);
  const lane = (w, d, x, z, m = laneMat) => box(root, w, 0.08, d, m, x, 0.015, z);
  lane(14, 188, 0, 66);
  lane(246, 11, 0, 55, sandMat);
  lane(220, 9, 0, 105, sandMat);
  lane(6, 260, -60, 20);
  lane(6, 240, 60, 46);
  lane(200, 6, 0, 15);
  lane(236, 6, 0, -15);
  lane(220, 6, 0, 86);
  lane(84, 34, -46, 13, sandMat);
  lane(60, 16, 72, 2, sandMat);

  const plaza = new THREE.Mesh(new THREE.PlaneGeometry(88, 76), mat(0xc9a97a, 0.98));
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.set(-46, 0.0, -28);
  plaza.receiveShadow = true;
  root.add(plaza);

  for (let i = 0; i < 34; i++) {
    const x = (rnd(i, 1) - 0.5) * 300;
    const z = (rnd(i, 2) - 0.5) * 330;
    box(root, 1.5 + rnd(i, 3) * 5, 0.035, 0.5 + rnd(i, 4) * 1.2, mat(0x8c6848, 0.99), x, 0.06, z, rnd(i, 5) * 3.14);
  }
}

function buildMountains(root) {
  const near = mat(C.mtn, 0.99);
  const far = mat(C.mtnFar, 1.0);
  const ridges = [
    [-330, -300, 160, 60, 9], [-180, -340, 190, 78, 8], [-20, -330, 210, 92, 7],
    [160, -355, 230, 86, 8], [330, -315, 180, 66, 9], [-410, -80, 170, 54, 9],
    [410, -110, 190, 60, 9], [-380, 190, 190, 48, 9], [390, 170, 210, 58, 9],
    [-210, 390, 230, 42, 9], [80, 410, 250, 50, 8], [300, 370, 210, 44, 9],
  ];
  for (let i = 0; i < ridges.length; i++) {
    const [x, z, r, h, seg] = ridges[i];
    const m = i % 3 === 0 ? far : near;
    const cone = mesh(root, new THREE.ConeGeometry(r, h, seg), m, x, h * 0.5 - 3, z, rnd(i, 8) * 3.14);
    cone.scale.z = 0.42;
    cone.castShadow = false;
  }
}

function buildWalls(root) {
  const m = mat(C.earthDark, 0.98);
  const light = mat(C.earthLight, 0.97);
  for (const [x, z, w, d, h] of [
    [-138, -132, 58, 2, 5.5], [138, -132, 58, 2, 5.5],
    [-138, 142, 58, 2, 4.6], [138, 142, 58, 2, 4.6],
  ]) {
    box(root, w, h, d, m, x, h * 0.5, z);
    box(root, w + 0.4, 0.35, d + 0.5, light, x, h + 0.12, z);
  }
  const gates = [[-70, 142], [72, 142], [-70, -132], [72, -132]];
  for (const [x, z] of gates) {
    box(root, 5.5, 5, 2.8, light, x, 2.5, z);
    box(root, 2.2, 3.4, 3.0, mat(C.window, 0.96), x, 1.7, z);
  }
}

export function buildKashgarScene() {
  const root = new THREE.Group();
  buildGround(root);
  buildMountains(root);
  buildHouses(root);
  buildWalls(root);

  const merged = mergeStaticGroup(root);
  const lanes = mat(C.lane, 0.98);
  return {
    group: merged,
    spawn: SPAWN,
    colliders: COLLIDERS,
    bounds: BOUNDS,
    lanternMaterial: mat(0xff8a3c, 0.5),
    glowMaterial: null,
    laneMaterial: lanes,
  };
}
