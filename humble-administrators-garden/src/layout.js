import * as THREE from 'three';
import { mats, makeWaterMaterial } from './materials.js';
import { addBox, addCylinder, mergedMesh, mergeStaticGroup } from './geometry.js';
import { createTree } from './props.js';
import { createPavilion, createHexPavilion, createTower, createWalkway } from './gardenBuild.js';
import {
  createCoveredBridge,
  createZigzagBridge,
  createGardenWall,
  createMoonGateWall,
  createRibbonPath,
  createWillow,
  createBamboo,
  createLotus,
  createFanPavilion,
  createBoatPavilion,
  createShrub,
  createBanana,
  createArchBridge,
} from './gardenDetails.js';
import { createRichStatic } from './richPlacement.js';
import { createGardenLife } from './richLife.js';
import { createGardenRefineStatic } from './gardenRefine.js';
import { createGardenRefineLife } from './gardenRefineLife.js';

export const POND = [
  [10, 52],
  [0, 53],
  [-8, 52],
  [-14, 55],
  [-18, 62],
  [-21, 68],
  [-24, 60],
  [-24, 50],
  [-32, 49],
  [-40, 47],
  [-48, 44],
  [-55, 38],
  [-58, 32],
  [-55, 26],
  [-48, 22],
  [-40, 20],
  [-32, 22],
  [-24, 25],
  [-16, 27],
  [-8, 28],
  [0, 29],
  [8, 30],
  [16, 32],
  [22, 36],
  [26, 41],
  [24, 46],
  [18, 50],
  [10, 52],
];

function createPond(material) {
  const shape = new THREE.Shape();
  POND.forEach(([x, z], i) => {
    if (i === 0) shape.moveTo(x, -z);
    else shape.lineTo(x, -z);
  });
  shape.closePath();
  const geo = new THREE.ShapeGeometry(shape, 20);
  geo.rotateX(-Math.PI / 2);
  const water = new THREE.Mesh(geo, material);
  water.position.y = 0.12;
  water.renderOrder = 1;

  const curve = new THREE.CatmullRomCurve3(POND.map(([x, z]) => new THREE.Vector3(x, 0, z)), true, 'catmullrom', 0.4);
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

function addApron(group, x, z, w, d, rot = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, d), mats.path);
  mesh.position.set(x, 0.035, z);
  mesh.rotation.y = rot;
  mesh.receiveShadow = true;
  group.add(mesh);
}

function addRockCluster(group, x, z, count, seed, spread = 5.5, baseY = 0) {
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
  const rockMesh = mergedMesh(rocks, mats.rock, true, true);
  if (rockMesh) group.add(rockMesh);
  const mossMesh = mergedMesh(moss, mats.rockMoss, true, true);
  if (mossMesh) group.add(mossMesh);
}

export function buildGardenScene() {
  const root = new THREE.Group();
  const waterMaterial = makeWaterMaterial();

  const outerGround = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), mats.grass);
  outerGround.rotation.x = -Math.PI / 2;
  outerGround.position.y = -0.08;
  outerGround.receiveShadow = true;
  root.add(outerGround);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(260, 220), mats.path);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  ground.receiveShadow = true;
  root.add(ground);

  const grassPatches = [];
  const patchDefs = [
    [-78, 58, 30, 18],
    [80, 60, 26, 16],
    [-86, -40, 24, 20],
    [82, -40, 24, 18],
    [12, -66, 28, 14],
    [-30, 68, 20, 12],
    [-62, 30, 16, 12],
    [60, 32, 14, 10],
    [-58, -24, 14, 12],
    [50, 34, 10, 8],
    [-14, 42, 10, 7],
    [56, -34, 10, 7],
    [-52, 44, 16, 10],
    [20, 62, 16, 9],
    [-88, 18, 10, 14],
    [72, -8, 10, 14],
  ];
  for (const [x, z, rx, rz] of patchDefs) {
    const g = new THREE.CircleGeometry(1, 24);
    g.rotateX(-Math.PI / 2);
    g.scale(rx, 1, rz);
    g.translate(x, 0.005, z);
    grassPatches.push(g);
  }
  const gm = mergedMesh(grassPatches, mats.grass, false, true);
  if (gm) root.add(gm);

  root.add(createPond(waterMaterial));

  const island = new THREE.Mesh(new THREE.CylinderGeometry(6.0, 6.5, 0.9, 30), mats.stone);
  island.position.set(-27, 0.45, 40);
  island.castShadow = true;
  island.receiveShadow = true;
  root.add(island);
  const islandTop = new THREE.Mesh(new THREE.CircleGeometry(5.95, 30), mats.grass);
  islandTop.rotation.x = -Math.PI / 2;
  islandTop.position.set(-27, 0.91, 40);
  islandTop.receiveShadow = true;
  root.add(islandTop);
  const islandPav = createHexPavilion({ radius: 3.8, wallH: 2.7, roofH: 3.1, baseH: 0.55, name: '荷风四面亭', x: -27, z: 40 });
  islandPav.position.y = 0.9;
  root.add(islandPav);

  const northIsland = new THREE.Mesh(new THREE.CylinderGeometry(8.8, 9.4, 1.0, 32), mats.stone);
  northIsland.position.set(-13, 0.5, 27);
  northIsland.castShadow = true;
  northIsland.receiveShadow = true;
  root.add(northIsland);
  const northTop = new THREE.Mesh(new THREE.CircleGeometry(8.75, 32), mats.grass);
  northTop.rotation.x = -Math.PI / 2;
  northTop.position.set(-13, 1.01, 27);
  northTop.receiveShadow = true;
  root.add(northTop);

  const islet = new THREE.Mesh(new THREE.CylinderGeometry(3.0, 3.4, 0.75, 22), mats.stone);
  islet.position.set(24, 0.38, 42);
  root.add(islet);
  const isletTop = new THREE.Mesh(new THREE.CircleGeometry(2.95, 22), mats.grass);
  isletTop.rotation.x = -Math.PI / 2;
  isletTop.position.set(24, 0.76, 42);
  root.add(isletTop);

  root.add(createZigzagBridge({
    points: [
      [-8, 56],
      [-14, 50],
      [-18, 46],
      [-23, 43],
      [-27, 41],
    ],
    width: 2.2,
  }));
  root.add(createZigzagBridge({
    points: [
      [-27, 40],
      [-24, 36],
      [-20, 32],
      [-16, 29],
      [-13, 27],
    ],
    width: 2.2,
  }));
  root.add(createArchBridge({ span: 8.5, width: 2.5, rise: 1.7, x: 26, z: 36, rot: 0 }));
  root.add(createCoveredBridge({ span: 13, width: 2.7, rise: 1.15, roofH: 1.7, x: -21, z: 64, rot: 0 }));

  addApron(root, -6, 55, 30, 20);
  addApron(root, -65, 61, 28, 20);
  addApron(root, -55, 20, 25, 22);
  addApron(root, 20, 27, 17, 15);
  addApron(root, -31, 54, 18, 14);
  addApron(root, 0, 82, 26, 12);
  addApron(root, -52, 57, 14, 14);

  const paths = [
    [[0, 84], [-1, 74], [-4, 64], [-6, 56], [-6, 46]],
    [[0, 50], [18, 48], [34, 44], [48, 38], [60, 40]],
    [[62, 42], [64, 30], [62, 18], [58, 6], [54, -8], [48, -20], [40, -28], [30, -33], [18, -36], [8, -38]],
    [[8, -42], [-6, -44], [-20, -44], [-34, -44], [-46, -46]],
    [[-2, 74], [-20, 66], [-38, 60], [-52, 54], [-62, 46], [-68, 38], [-74, 32]],
    [[-80, 28], [-82, 16], [-80, 4], [-82, -8], [-80, -20], [-74, -32], [-66, -40], [-58, -45]],
    [[-68, 22], [-62, 28], [-54, 32]],
    [[-69, 4], [-65, -2], [-62, -4]],
    [[-46, 30], [-40, 36], [-34, 40]],
    [[30, 40], [40, 36], [48, 34]],
  ];
  for (const pts of paths) {
    root.add(createRibbonPath({ points: pts, width: 2.5 }));
  }

  root.add(createMoonGateWall({ length: 22, height: 3.5, thickness: 0.7, radius: 1.55, x: -30, z: -82 }));
  root.add(createMoonGateWall({ length: 22, height: 3.5, thickness: 0.7, radius: 1.55, x: -103, z: 10, rot: Math.PI / 2 }));
  root.add(createGardenWall({ length: 63, height: 3.4, x: -72.5, z: -82, windows: [-20, -4, 12] }));
  root.add(createGardenWall({ length: 123, height: 3.4, x: 42.5, z: -82, windows: [-45, -24, -2, 22, 44] }));
  root.add(createGardenWall({ length: 150, height: 3.4, axis: 'z', x: -104, z: -5, windows: [-54, -30, 34, 56] }));
  root.add(createGardenWall({ length: 150, height: 3.4, axis: 'z', x: 120, z: -5, windows: [-52, -26, 0, 26, 50] }));
  root.add(createGardenWall({ length: 118, height: 3.2, x: -61, z: 84, windows: [-20, 18] }));
  root.add(createGardenWall({ length: 118, height: 3.2, x: 61, z: 84, windows: [-18, 20] }));

  const yuanxiang = createPavilion({
    w: 22,
    d: 11,
    wallH: 3.5,
    roofH: 4.0,
    eave: 2.8,
    baseH: 0.85,
    bays: 5,
    name: '远香堂',
    open: true,
    rail: true,
    x: -6,
    z: 53,
    rot: Math.PI,
  });
  root.add(yuanxiang);

  const sanshiliu = createPavilion({
    w: 18,
    d: 9,
    wallH: 3.8,
    roofH: 3.9,
    eave: 2.3,
    baseH: 0.8,
    bays: 5,
    name: '卅六鸳鸯馆',
    x: -65,
    z: 61,
    rot: Math.PI / 2,
  });
  root.add(sanshiliu);

  const jianshan = createTower({
    w: 13,
    d: 9,
    lowerH: 4.0,
    upperH: 3.0,
    lowerRoofH: 3.0,
    upperRoofH: 3.4,
    eave: 2.2,
    baseH: 0.9,
    name: '见山楼',
    x: -55,
    z: 20,
    rot: 0,
  });
  root.add(jianshan);

  root.add(createBoatPavilion({ x: -31, z: 54, rot: 0, name: '香洲' }));
  const xiaocanglang = createPavilion({
    w: 6,
    d: 5,
    wallH: 2.5,
    roofH: 2.4,
    eave: 1.4,
    baseH: 0.5,
    bays: 3,
    name: '小沧浪',
    open: true,
    x: -60,
    z: 50,
    rot: Math.PI / 2,
  });
  root.add(xiaocanglang);
  root.add(createFanPavilion({ radius: 3.4, wallH: 2.6, roofH: 2.7, baseH: 0.5, name: '与谁同坐轩', x: -60, z: 47, rot: Math.PI / 2 }));

  const yiliang = createPavilion({
    w: 6.5,
    d: 6.5,
    wallH: 2.5,
    roofH: 2.8,
    eave: 1.5,
    baseH: 2.0,
    bays: 3,
    name: '宜两亭',
    pyramid: true,
    open: true,
    x: -52,
    z: 57,
  });
  root.add(yiliang);

  const xuexiang = createPavilion({
    w: 7.2,
    d: 7.2,
    wallH: 2.5,
    roofH: 2.8,
    eave: 1.7,
    baseH: 1.0,
    bays: 3,
    name: '雪香云蔚亭',
    pyramid: true,
    open: true,
    x: -13,
    z: 27,
  });
  xuexiang.position.y = 1.0;
  root.add(xuexiang);

  const wuzhu = createPavilion({
    w: 8,
    d: 6,
    wallH: 2.8,
    roofH: 2.9,
    eave: 1.7,
    baseH: 0.6,
    bays: 3,
    name: '梧竹幽居',
    open: true,
    x: 19,
    z: 27,
    rot: -Math.PI / 2,
  });
  root.add(wuzhu);

  const lanxue = createPavilion({
    w: 12,
    d: 8,
    wallH: 3.2,
    roofH: 3.4,
    eave: 1.8,
    baseH: 0.6,
    bays: 3,
    name: '兰雪堂',
    x: 98,
    z: 78,
  });
  root.add(lanxue);
  const furong = createPavilion({
    w: 8,
    d: 8,
    wallH: 2.7,
    roofH: 2.9,
    eave: 1.6,
    baseH: 0.55,
    bays: 3,
    name: '芙蓉榭',
    open: true,
    x: 108,
    z: 64,
    rot: -Math.PI / 2,
  });
  root.add(furong);
  const tianquan = createHexPavilion({ radius: 3.2, wallH: 2.6, roofH: 2.9, baseH: 0.5, name: '天泉亭', x: 89, z: 37 });
  root.add(tianquan);

  const gateHouse = createPavilion({
    w: 10,
    d: 6,
    wallH: 3.2,
    roofH: 3.4,
    eave: 1.8,
    baseH: 0.7,
    bays: 3,
    name: '拙政园',
    x: 0,
    z: 82,
    rot: 0,
  });
  root.add(gateHouse);

  root.add(createWalkway({ length: 70, width: 3.0, height: 3.0, roofH: 2.1, x: -90, z: 35, rot: Math.PI / 2 }));
  root.add(createWalkway({ length: 60, width: 2.9, height: 2.9, roofH: 2.0, gapX: 5.5, gapW: 7, x: -8, z: 64, rot: 0 }));
  root.add(createWalkway({ length: 64, width: 3.0, height: 3.0, roofH: 2.1, x: 106, z: 50, rot: Math.PI / 2 }));
  root.add(createWalkway({ length: 24, width: 2.8, height: 2.8, roofH: 2.0, x: -75, z: 20, rot: 0 }));
  root.add(createWalkway({ length: 22, width: 2.8, height: 2.8, roofH: 2.0, x: 75, z: 30, rot: Math.PI / 2 }));

  addRockCluster(root, -1, -15, 10, 3, 6.8, 0.9);
  addRockCluster(root, -71, -20, 8, 8, 6.5);
  addRockCluster(root, -76, 3, 6, 12, 4.8);
  addRockCluster(root, 61, 42, 6, 15, 6.0);
  addRockCluster(root, -53, -44, 8, 21, 6.0);
  addRockCluster(root, 40, 30, 5, 27, 4.2);
  addRockCluster(root, -38, 33, 5, 31, 4.2);
  addRockCluster(root, -21, 7, 3, 35, 2.4, 0.9);
  addRockCluster(root, 27, 10, 3, 41, 2.8, 0.75);

  const willows = [
    [-30, 37],
    [-10, 41],
    [12, 38],
    [32, 33],
    [46, 26],
    [56, 10],
    [56, -10],
    [46, -28],
    [20, -32],
    [-42, 33],
    [-58, 34],
    [-81, 17],
    [6, -16],
    [-20, 7],
  ];
  willows.forEach(([x, z], i) => {
    const t = createWillow({ height: 7.5 + (i % 3) * 0.8, spread: 2.5, seed: i + 1 });
    t.position.set(x, 0, z);
    root.add(t);
  });

  const bamboo = [
    [78, 40],
    [78, -50],
    [-90, -40],
    [-92, 44],
    [58, -58],
    [-62, 62],
    [88, 20],
    [-94, 64],
  ];
  bamboo.forEach(([x, z], i) => {
    const b = createBamboo({ height: 7.5, radius: 2.3, seed: i + 3 });
    b.position.set(x, 0, z);
    root.add(b);
  });

  const trees = [
    [-88, 26, 'pine'],
    [-86, -30, 'broad'],
    [72, -26, 'broad'],
    [84, 24, 'pine'],
    [-66, 68, 'broad'],
    [62, 70, 'pine'],
    [20, 70, 'broad'],
    [-10, -68, 'pine'],
    [64, -66, 'pine'],
    [92, -30, 'broad'],
    [-94, 8, 'broad'],
    [36, 60, 'broad'],
    [-44, -62, 'pine'],
    [26, -48, 'pine'],
    [80, -30, 'pine'],
    [-30, 72, 'broad'],
    [44, 68, 'broad'],
  ];
  trees.forEach(([x, z, kind], i) => {
    const t = createTree({ height: 8 + (i % 4), spread: 3.0 + (i % 3) * 0.5, kind, seed: i + 40 });
    t.position.set(x, 0, z);
    root.add(t);
  });

  let beltSeed = 5;
  const beltRnd = () => {
    beltSeed = (beltSeed * 16807) % 2147483647;
    return beltSeed / 2147483647;
  };
  for (let i = 0; i < 34; i++) {
    let x;
    let z;
    const side = i % 4;
    if (side === 0) {
      x = -115 + beltRnd() * 230;
      z = -92 - beltRnd() * 14;
    } else if (side === 1) {
      x = -115 - beltRnd() * 12;
      z = -85 + beltRnd() * 175;
    } else if (side === 2) {
      x = 115 + beltRnd() * 12;
      z = -85 + beltRnd() * 175;
    } else {
      x = -115 + beltRnd() * 230;
      z = 94 + beltRnd() * 14;
    }
    const t = createTree({
      height: 7 + beltRnd() * 6,
      spread: 2.6 + beltRnd() * 1.8,
      kind: beltRnd() > 0.45 ? 'pine' : 'broad',
      seed: i + 200,
    });
    t.position.set(x, 0, z);
    root.add(t);
  }

  const shrubs = [
    [18, 55],
    [-28, 52],
    [-62, 42],
    [-74, 36],
    [-84, 20],
    [-84, -6],
    [-62, -34],
    [-38, -40],
    [12, -44],
    [36, -38],
    [54, -28],
    [68, 22],
    [70, 50],
    [-22, 66],
    [34, 50],
    [-42, 36],
    [-24, 43],
    [55, 35],
    [-60, 50],
    [9, 46],
  ];
  shrubs.forEach(([x, z], i) => {
    const s = createShrub({ radius: 1.4 + (i % 3) * 0.4, height: 1.4 + (i % 2) * 0.5, seed: i + 7 });
    s.position.set(x, 0, z);
    root.add(s);
  });

  const bananas = [
    [20, 54],
    [-27, 58],
    [-46, -42],
    [-74, 38],
    [58, 47],
  ];
  bananas.forEach(([x, z], i) => {
    const b = createBanana({ height: 3.2 + (i % 2) * 0.6, seed: i + 5 });
    b.position.set(x, 0, z);
    root.add(b);
  });

  root.add(createLotus({ x: -30, z: 24, radius: 5, count: 16, seed: 2 }));
  root.add(createLotus({ x: -2, z: 28, radius: 6, count: 20, seed: 5 }));
  root.add(createLotus({ x: 18, z: 24, radius: 4.5, count: 15, seed: 8 }));
  root.add(createLotus({ x: 36, z: 18, radius: 4, count: 13, seed: 11 }));
  root.add(createLotus({ x: 44, z: 2, radius: 4, count: 13, seed: 14 }));
  root.add(createLotus({ x: 40, z: -16, radius: 3.5, count: 11, seed: 17 }));
  root.add(createLotus({ x: -36, z: -10, radius: 3.5, count: 11, seed: 20 }));
  root.add(createLotus({ x: -46, z: 9, radius: 3, count: 9, seed: 23 }));
  root.add(createLotus({ x: 20, z: -8, radius: 4, count: 12, seed: 26 }));
  root.add(createLotus({ x: -2, z: -33, radius: 2.5, count: 7, seed: 29 }));

  const lanterns = [
    [10, 52],
    [-23, 50],
    [-2, 70],
  ];
  for (const [x, z] of lanterns) {
    const parts = [];
    addCylinder(parts, 0.34, 0.42, 0.28, 6, x, 0.14, z);
    addCylinder(parts, 0.1, 0.14, 1.15, 6, x, 0.85, z);
    addBox(parts, 0.56, 0.5, 0.56, x, 1.63, z);
    const cap = new THREE.ConeGeometry(0.46, 0.3, 4);
    cap.rotateY(Math.PI / 4);
    cap.translate(x, 2.03, z);
    parts.push(cap);
    addBox(parts, 0.34, 0.18, 0.34, x, 1.22, z);
    const sm = mergedMesh(parts, mats.stone, true, true);
    if (sm) root.add(sm);
    const glow = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.3, 0.38), mats.lantern);
    glow.position.set(x, 1.62, z);
    root.add(glow);
  }

  root.add(createGardenRefineStatic(POND));
  root.add(createRichStatic());
  const merged = mergeStaticGroup(root);
  const life = createGardenLife();
  const refineLife = createGardenRefineLife();
  merged.add(life.group, refineLife.group);
  const combinedLife = {
    update(time, dt) {
      life.update(time, dt);
      refineLife.update(time, dt);
    },
  };
  return { group: merged, waterMaterial, life: combinedLife, lanternMaterial: mats.lantern };
}
