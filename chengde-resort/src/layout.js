import * as THREE from 'three';
import { mats, makeWaterMaterial } from './materials.js';
import { mergedMesh, mergeStaticGroup } from './geometry.js';
import { createTree } from './props.js';
import { createPavilion, createHexPavilion, createTower } from './gardenBuild.js';
import {
  createCoveredBridge,
  createZigzagBridge,
  createRibbonPath,
  createWillow,
  createBamboo,
  createLotus,
  createShrub,
  createBanana,
  createArchBridge,
} from './gardenDetails.js';
import { createGardenLife } from './richLife.js';
import { createChengdeStatic, createStoneBridge } from './chengdeStatic.js';
import { createChengdeLife } from './chengdeLife.js';
import {
  createStoneLantern,
  createBench,
  createReedPatch,
  createGroundcover,
} from './richProps.js';
import { createDougong, createRidgePair } from './richArch.js';
import { plaqueMaterial, coupletMaterial } from './atlas.js';

export const POND = [
  [10, 52], [0, 53], [-8, 52], [-14, 55], [-18, 62], [-21, 68],
  [-24, 60], [-24, 50], [-32, 49], [-40, 47], [-48, 44], [-55, 38],
  [-58, 32], [-55, 26], [-48, 22], [-40, 20], [-32, 22], [-24, 25],
  [-16, 27], [-8, 28], [0, 29], [8, 30], [16, 32], [22, 36],
  [26, 41], [24, 46], [18, 50], [10, 52],
];

export const EXTRA_PONDS = [{ x: -45, z: 10, r: 5.2 }];
export const SPAWN = { x: 0, z: 130 };
export const BOUNDS = { minX: -180, maxX: 180, minZ: -138, maxZ: 137 };
export const ISLANDS = [
  { x: -27, z: 40, r: 9.7, h: 1.1 },
  { x: -13, z: 27, r: 8.9, h: 1.02 },
  { x: 24, z: 42, r: 3.05, h: 0.78 },
];
export const BRIDGES = [
  { type: 'flat', points: [[-8, 56], [-14, 50], [-18, 46], [-23, 43], [-27, 41]], half: 1.0, height: 0.54 },
  { type: 'flat', points: [[-27, 40], [-24, 36], [-20, 32], [-16, 29], [-13, 27]], half: 1.0, height: 0.54 },
  { type: 'flat', points: [[-38, 45], [-38, 34]], half: 1.25, height: 0.62 },
  { type: 'flat', points: [[-45, 15.6], [-45, 4.4]], half: 1.15, height: 0.56 },
  { type: 'arch', x: 26, z: 36, span: 8.5, width: 2.5, rise: 1.7 },
  { type: 'arch', x: -21, z: 64, span: 13, width: 2.7, rise: 1.15 },
];

export const COLLIDERS = [
  { type: 'box', x: 0, z: 134, w: 16, d: 9, name: '丽正门' },
  { type: 'box', x: 0, z: 112, w: 38, d: 20, name: '澹泊敬诚殿' },
  { type: 'box', x: -32, z: 112, w: 14, d: 28, name: '松鹤斋' },
  { type: 'box', x: 32, z: 112, w: 14, d: 28, name: '云山胜地' },
  { type: 'box', x: 0, z: 95, w: 20, d: 12, name: '四知书屋' },
  { type: 'box', x: 0, z: 80, w: 28, d: 14, name: '烟波致爽' },
  { type: 'box', x: -36, z: 86, w: 12, d: 20, name: '乐寿堂' },
  { type: 'box', x: 36, z: 86, w: 12, d: 20, name: '万壑松风' },
  { type: 'box', x: -58, z: 18, w: 11.4, d: 16.4, name: '文津阁' },
  { type: 'box', x: -13, z: 27, w: 12.4, d: 9.4, name: '烟雨楼' },
  { type: 'circle', x: -23.5, z: 43, r: 3.5, name: '金山亭' },
  { type: 'box', x: -30.5, z: 36.8, w: 6.6, d: 5.4, name: '金山寺' },
  { type: 'circle', x: 24, z: 42, r: 2.7, name: '湖心亭' },
  { type: 'circle', x: 104, z: 26, r: 4.6, name: '蒙古包' },
  { type: 'circle', x: 128, z: 38, r: 4.1, name: '蒙古包' },
  { type: 'circle', x: 118, z: -4, r: 3.8, name: '蒙古包' },
  { type: 'circle', x: 146, z: 16, r: 3.4, name: '蒙古包' },
];

function createPond(material) {
  const shape = new THREE.Shape();
  POND.forEach(([x, z], i) => (i === 0 ? shape.moveTo(x, -z) : shape.lineTo(x, -z)));
  shape.closePath();
  const geo = new THREE.ShapeGeometry(shape, 20);
  geo.rotateX(-Math.PI / 2);
  const water = new THREE.Mesh(geo, material);
  water.position.y = 0.12;
  water.renderOrder = 1;
  const curve = new THREE.CatmullRomCurve3(
    POND.map(([x, z]) => new THREE.Vector3(x, 0, z)),
    true,
    'catmullrom',
    0.4
  );
  const pts = curve.getPoints(120);
  const curb = [];
  const joints = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    const ang = Math.atan2(b.x - a.x, b.z - a.z);
    const g = new THREE.BoxGeometry(0.9, 0.42, len + 0.35);
    g.rotateY(ang);
    g.translate((a.x + b.x) / 2, 0.18, (a.z + b.z) / 2);
    curb.push(g);
    if (i % 3 === 0) {
      const j = new THREE.BoxGeometry(0.94, 0.06, 0.12);
      j.rotateY(ang);
      j.translate(a.x, 0.41, a.z);
      joints.push(j);
    }
  }
  const group = new THREE.Group();
  group.add(water);
  const cm = mergedMesh(curb, mats.stone, true, true);
  if (cm) group.add(cm);
  const jm = mergedMesh(joints, mats.trimDark, false, true);
  if (jm) group.add(jm);
  return group;
}

function createExtraPond(material, x, z, r) {
  const group = new THREE.Group();
  const geo = new THREE.CircleGeometry(r, 36);
  geo.rotateX(-Math.PI / 2);
  const water = new THREE.Mesh(geo, material);
  water.position.set(x, 0.12, z);
  water.renderOrder = 1;
  group.add(water);
  const curb = [];
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    const b = ((i + 1) / 28) * Math.PI * 2;
    const x0 = x + Math.cos(a) * (r + 0.3);
    const z0 = z + Math.sin(a) * (r + 0.3);
    const x1 = x + Math.cos(b) * (r + 0.3);
    const z1 = z + Math.sin(b) * (r + 0.3);
    const g = new THREE.BoxGeometry(0.7, 0.4, Math.hypot(x1 - x0, z1 - z0) + 0.2);
    g.rotateY(Math.atan2(x1 - x0, z1 - z0));
    g.translate((x0 + x1) / 2, 0.2, (z0 + z1) / 2);
    curb.push(g);
  }
  const cm = mergedMesh(curb, mats.stone, true, true);
  if (cm) group.add(cm);
  return group;
}

function addApron(group, x, z, w, d, rot = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, d), mats.path);
  mesh.position.set(x, 0.035, z);
  mesh.rotation.y = rot;
  mesh.receiveShadow = true;
  group.add(mesh);
}

function addRocks(group, x, z, count, seed, spread = 5.5, baseY = 0) {
  const rnd = (n) => {
    const v = Math.sin(seed * 33.7 + n * 71.3) * 43758.5453;
    return v - Math.floor(v);
  };
  const rocks = [];
  const moss = [];
  for (let i = 0; i < count; i++) {
    const tall = i < Math.max(2, Math.round(count * 0.4));
    const geo = new THREE.DodecahedronGeometry(0.8 + rnd(i) * 0.85, 0);
    geo.scale(
      0.85 + rnd(i + 2) * 0.75,
      tall ? 1.9 + rnd(i + 5) * 1.1 : 1.0 + rnd(i + 5) * 0.8,
      0.8 + rnd(i + 8) * 0.7
    );
    geo.rotateY(rnd(i + 23) * 6.28);
    geo.rotateZ((rnd(i + 20) - 0.5) * 0.3);
    geo.translate(
      x + (rnd(i + 11) - 0.5) * spread,
      baseY + 0.55 + (tall ? 0.85 : 0.35) + rnd(i + 13) * 0.35,
      z + (rnd(i + 17) - 0.5) * spread
    );
    rocks.push(geo);
    if (i % 3 === 0) {
      const m = new THREE.IcosahedronGeometry(0.5 + rnd(i + 30) * 0.5, 1);
      m.scale(1.3, 0.28, 1.1);
      m.translate(
        x + (rnd(i + 31) - 0.5) * spread * 0.9,
        baseY + 0.45,
        z + (rnd(i + 32) - 0.5) * spread * 0.9
      );
      moss.push(m);
    }
  }
  const rm = mergedMesh(rocks, mats.rock, true, true);
  if (rm) group.add(rm);
  const mm = mergedMesh(moss, mats.rockMoss, true, true);
  if (mm) group.add(mm);
}

function addPlaque(group, text, x, y, z, w, ry = 0) {
  if (!text) return;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, w * 0.3125),
    plaqueMaterial(text)
  );
  mesh.position.set(x, y, z);
  mesh.rotation.y = ry;
  group.add(mesh);
}

function addCoupletPair(group, a, b, x, y, z, dx, ry = 0) {
  const h = 1.7;
  for (const [text, off] of [[a, -dx], [b, dx]]) {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.36, h),
      coupletMaterial(text)
    );
    mesh.position.set(x + off, y, z);
    mesh.rotation.y = ry;
    group.add(mesh);
  }
}

export function buildGardenScene() {
  const root = new THREE.Group();
  const waterMaterial = makeWaterMaterial();

  const outerGround = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), mats.grass);
  outerGround.rotation.x = -Math.PI / 2;
  outerGround.position.y = -0.08;
  outerGround.receiveShadow = true;
  root.add(outerGround);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(380, 300), mats.grass);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  ground.receiveShadow = true;
  root.add(ground);

  root.add(createPond(waterMaterial));
  root.add(createExtraPond(waterMaterial, -45, 10, 5.2));
  root.add(createChengdeStatic());

  const jinshan = new THREE.Mesh(new THREE.CylinderGeometry(9.85, 10.4, 1.1, 34), mats.stone);
  jinshan.position.set(-27, 0.55, 40);
  jinshan.castShadow = true;
  jinshan.receiveShadow = true;
  root.add(jinshan);
  const jinshanTop = new THREE.Mesh(new THREE.CircleGeometry(9.8, 34), mats.grass);
  jinshanTop.rotation.x = -Math.PI / 2;
  jinshanTop.position.set(-27, 1.105, 40);
  jinshanTop.receiveShadow = true;
  root.add(jinshanTop);

  const yanyuIsland = new THREE.Mesh(new THREE.CylinderGeometry(8.95, 9.5, 1.0, 32), mats.stone);
  yanyuIsland.position.set(-13, 0.5, 27);
  yanyuIsland.castShadow = true;
  yanyuIsland.receiveShadow = true;
  root.add(yanyuIsland);
  const yanyuTop = new THREE.Mesh(new THREE.CircleGeometry(8.9, 32), mats.grass);
  yanyuTop.rotation.x = -Math.PI / 2;
  yanyuTop.position.set(-13, 1.005, 27);
  yanyuTop.receiveShadow = true;
  root.add(yanyuTop);

  const islet = new THREE.Mesh(new THREE.CylinderGeometry(3.0, 3.4, 0.78, 22), mats.stone);
  islet.position.set(24, 0.39, 42);
  islet.castShadow = true;
  islet.receiveShadow = true;
  root.add(islet);
  const isletTop = new THREE.Mesh(new THREE.CircleGeometry(2.95, 22), mats.grass);
  isletTop.rotation.x = -Math.PI / 2;
  isletTop.position.set(24, 0.785, 42);
  isletTop.receiveShadow = true;
  root.add(isletTop);

  root.add(createZigzagBridge({ points: [[-8, 56], [-14, 50], [-18, 46], [-23, 43], [-27, 41]], width: 2.2 }));
  root.add(createZigzagBridge({ points: [[-27, 40], [-24, 36], [-20, 32], [-16, 29], [-13, 27]], width: 2.2 }));
  root.add(createStoneBridge({ x: -38, z: 39.5, length: 11.5, width: 2.5, rise: 0.5 }));
  root.add(createStoneBridge({ x: -45, z: 10, length: 10.5, width: 2.3, rise: 0.32 }));
  root.add(createArchBridge({ span: 8.5, width: 2.5, rise: 1.7, x: 26, z: 36, rot: 0 }));
  root.add(createCoveredBridge({ span: 13, width: 2.7, rise: 1.15, roofH: 1.7, x: -21, z: 64, rot: 0 }));

  addApron(root, 0, 117, 86, 42);
  addApron(root, 0, 137, 26, 12);
  addApron(root, -6, 77, 34, 16);
  addApron(root, -58, 30, 22, 18);
  addApron(root, 30, 66, 26, 12);
  addApron(root, 104, 28, 34, 26);

  const paths = [
    [[0, 138], [0, 128], [0, 118], [0, 106], [0, 94], [0, 84]],
    [[0, 78], [-8, 72], [-16, 65], [-24, 58], [-32, 54], [-40, 50]],
    [[0, 78], [14, 72], [28, 68], [44, 64], [62, 62], [84, 60], [108, 54], [130, 44], [150, 30]],
    [[-6, 60], [-20, 55], [-38, 54], [-52, 48], [-58, 38], [-58, 24]],
    [[-58, 16], [-52, 10], [-45, 6], [-38, 2], [-28, 4]],
    [[28, 66], [24, 58], [24, 48], [22, 44]],
    [[-45, 4], [-36, 8], [-28, 12], [-20, 18], [-12, 22]],
  ];
  for (const pts of paths) root.add(createRibbonPath({ points: pts, width: 2.6 }));

  const jinshanPav = createHexPavilion({
    radius: 2.9, wallH: 2.6, roofH: 2.8, baseH: 0.5, name: '金山亭', x: -23.5, z: 43,
  });
  jinshanPav.position.y = 1.1;
  root.add(jinshanPav);
  const jinshanTemple = createPavilion({
    w: 5.4, d: 4.4, wallH: 2.8, roofH: 2.4, eave: 1.3, baseH: 0.45, bays: 3,
    name: '金山寺', open: true, x: -30.5, z: 36.8, rot: Math.PI,
  });
  jinshanTemple.position.y = 1.1;
  root.add(jinshanTemple);
  addCoupletPair(root, '江天一色无纤尘', '山月半轮照客心', -23.5, 3.0, 45.4, 1.45);

  const yanyu = createTower({
    w: 10, d: 7, lowerH: 3.8, upperH: 3.0, lowerRoofH: 3.0, upperRoofH: 3.2,
    eave: 2.0, baseH: 0.9, name: '烟雨楼', x: -13, z: 27, rot: 0,
  });
  yanyu.position.y = 1.02;
  root.add(yanyu);

  const isletPav = createHexPavilion({
    radius: 2.15, wallH: 2.4, roofH: 2.5, baseH: 0.45, name: '湖心亭', x: 24, z: 42,
  });
  isletPav.position.y = 0.78;
  root.add(isletPav);

  const wenjin = createTower({
    w: 14, d: 9, lowerH: 4.2, upperH: 3.2, lowerRoofH: 3.2, upperRoofH: 3.4,
    eave: 2.2, baseH: 1.0, name: '文津阁', x: -58, z: 18, rot: Math.PI / 2,
  });
  root.add(wenjin);

  const gate = createPavilion({
    w: 14, d: 7, wallH: 4.0, roofH: 3.6, eave: 2.2, baseH: 0.9, bays: 5,
    name: '丽正门', open: true, x: 0, z: 134, rot: 0,
  });
  root.add(gate);

  const mainHall = createPavilion({
    w: 32, d: 15, wallH: 5.0, roofH: 5.0, eave: 3.0, baseH: 1.2, bays: 7,
    name: '澹泊敬诚殿', x: 0, z: 112, rot: 0,
  });
  root.add(mainHall);
  addCoupletPair(root, '云移溪树侵书幌', '风送岩泉润墨池', 0, 3.7, 120.1, 4.0);
  root.add(createDougong({ x: 0, y: 6.3, z: 120.2, rot: 0, width: 31, bays: 9 }));
  root.add(createRidgePair({ x: 0, y: 11.2, z: 112, rot: 0, ridgeHalf: 4.65, scale: 1.15 }));

  const halls = [
    { w: 11, d: 24, name: '松鹤斋', x: -32, z: 112, wallH: 4.0, roofH: 3.4 },
    { w: 11, d: 24, name: '云山胜地', x: 32, z: 112, wallH: 4.0, roofH: 3.4 },
    { w: 18, d: 9, name: '四知书屋', x: 0, z: 95, wallH: 3.6, roofH: 3.2 },
    { w: 26, d: 12, name: '烟波致爽', x: 0, z: 80, wallH: 4.2, roofH: 3.8 },
    { w: 10, d: 18, name: '乐寿堂', x: -36, z: 86, wallH: 3.4, roofH: 3.0 },
    { w: 10, d: 18, name: '万壑松风', x: 36, z: 86, wallH: 3.4, roofH: 3.0 },
  ];
  for (const h of halls) {
    root.add(createPavilion({
      w: h.w, d: h.d, wallH: h.wallH, roofH: h.roofH, eave: 2.0, baseH: 0.8,
      bays: h.w > 16 ? 5 : 3, name: h.name, x: h.x, z: h.z, rot: 0,
    }));
  }
  addCoupletPair(root, '松风清耳目', '鹤影舞阶庭', -32, 3.2, 124.1, 2.1);
  addCoupletPair(root, '云山呈秀色', '胜地纳清晖', 32, 3.2, 124.1, 2.1);

  addRocks(root, -27, 50, 9, 3, 7.0, 0.9);
  addRocks(root, -18, 33, 7, 8, 5.2, 0.9);
  addRocks(root, 20, 44, 3, 12, 2.2, 0.7);
  addRocks(root, -48, 14, 6, 16, 4.6);
  addRocks(root, 38, 56, 5, 21, 4.2);
  addRocks(root, -66, 42, 4, 27, 3.2);
  addRocks(root, 8, 88, 4, 31, 3.4);

  const willows = [
    [-30, 36], [-10, 44], [12, 40], [34, 34], [48, 26], [46, 8],
    [-42, 34], [-58, 30], [-66, 20], [6, 4], [20, 8], [-24, 8],
  ];
  willows.forEach(([x, z], i) => {
    const t = createWillow({ height: 7.5 + (i % 3) * 0.8, spread: 2.5, seed: i + 1 });
    t.position.set(x, 0, z);
    root.add(t);
  });

  const bamboo = [[-68, 28], [-74, 12], [-50, 2], [52, 62], [58, -24], [-24, 92], [24, 92]];
  bamboo.forEach(([x, z], i) => {
    const b = createBamboo({ height: 7.2, radius: 2.2, seed: i + 3 });
    b.position.set(x, 0, z);
    root.add(b);
  });

  const pines = [
    [-6, 88], [8, 88], [-24, 74], [24, 74], [-72, 50], [-76, 30],
    [56, 50], [50, 86], [-48, 90], [64, -64], [146, -30], [156, 8],
    [92, -70], [76, 78], [164, 52], [46, -80], [-90, -20], [-100, 50],
  ];
  pines.forEach(([x, z], i) => {
    const t = createTree({
      height: 8 + (i % 4), spread: 3.0 + (i % 3) * 0.5, kind: 'pine', seed: i + 40,
    });
    t.position.set(x, 0, z);
    root.add(t);
  });

  const shrubs = [
    [18, 58], [-28, 54], [-62, 44], [-72, 36], [-56, 26], [38, 60],
    [54, 54], [72, 58], [-20, 70], [10, 72], [-34, 62], [30, 78],
  ];
  shrubs.forEach(([x, z], i) => {
    const s = createShrub({
      radius: 1.4 + (i % 3) * 0.4, height: 1.4 + (i % 2) * 0.5, seed: i + 7,
    });
    s.position.set(x, 0, z);
    root.add(s);
  });

  const bananas = [[20, 56], [-26, 60], [-48, 46], [-66, 34], [58, 48]];
  bananas.forEach(([x, z], i) => {
    const b = createBanana({ height: 3.2 + (i % 2) * 0.6, seed: i + 5 });
    b.position.set(x, 0, z);
    root.add(b);
  });

  const lotus = [
    [-30, 24, 5.0, 16], [-2, 28, 6.0, 20], [18, 24, 4.5, 15],
    [36, 18, 4.0, 13], [-44, 11, 3.8, 14], [40, -6, 3.5, 11],
    [-36, -8, 3.0, 9], [-12, 12, 3.5, 11], [8, 8, 3.0, 9],
  ];
  lotus.forEach(([x, z, r, c], i) => {
    root.add(createLotus({ x, z, radius: r, count: c, seed: i + 2 }));
  });

  const stoneLanterns = [
    [-7, 122, 1.0], [7, 122, 1.0], [-7, 104, 0.95], [7, 104, 0.95],
    [-22, 58, 0.9], [-42, 55, 0.9], [-58, 40, 0.95], [-29, 60, 0.9],
  ];
  stoneLanterns.forEach(([x, z, s]) => root.add(createStoneLantern({ x, z, scale: s })));

  const benches = [
    [-10, 78, Math.PI / 2, 2.2], [10, 78, Math.PI / 2, 2.2],
    [-34, 58, 0, 2.2], [24, 62, 0, 2.2], [-58, 34, 0, 2.2],
    [100, 28, Math.PI / 2, 2.4],
  ];
  benches.forEach(([x, z, rot, len]) => root.add(createBench({ x, z, rot, length: len })));

  const reeds = [
    [-10, 29, 1.3, 16], [20, 39, 1.1, 14], [-44, 25, 1.2, 15],
    [12, 52, 1.0, 12], [-14, 13, 1.1, 14], [32, 45, 0.95, 12],
  ];
  reeds.forEach(([x, z, r, c], i) => {
    root.add(createReedPatch({ x, z, radius: r, count: c, seed: i + 5 }));
  });

  const covers = [
    [18, 62], [-28, 66], [44, 66], [64, 62], [86, 62], [108, 58],
    [126, 48], [146, 36], [-52, 60], [-64, 50], [-72, 32], [30, 72],
  ];
  covers.forEach(([x, z], i) => {
    root.add(createGroundcover({
      x, z, radius: 1.4 + (i % 3) * 0.4, count: 10 + (i % 4) * 2, seed: i + 11,
    }));
  });

  const merged = mergeStaticGroup(root);
  const life = createGardenLife();
  const chengdeLife = createChengdeLife();
  merged.add(life.group, chengdeLife.group);
  const combinedLife = {
    update(time, dt) {
      life.update(time, dt);
      chengdeLife.update(time, dt);
    },
  };
  return {
    group: merged,
    waterMaterial,
    life: combinedLife,
    lanternMaterial: chengdeLife.lanternMaterial,
    flagMaterial: chengdeLife.flagMaterial,
  };
}
