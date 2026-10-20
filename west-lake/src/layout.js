import * as THREE from 'three';
import { mats, makeWaterMaterial } from './materials.js';
import { addBox, addCylinder, mergedMesh, mergeStaticGroup } from './geometry.js';
import { createTree } from './props.js';
import { createPavilion, createHexPavilion, createWalkway } from './gardenBuild.js';
import {
  createWillow,
  createLotus,
  createShrub,
  createZigzagBridge,
  createRibbonPath,
  createBanana,
} from './gardenDetails.js';
import {
  createCauseway,
  createStoneBridge,
  createIslet,
  createHill,
  createPeachTree,
  createLeifengPagoda,
  createSlenderPagoda,
  createThreePagodas,
  createLakeLife,
} from './westlakeDetails.js';
import {
  createCausewayDetail,
  createLeifengDetail,
  createSantanDetail,
  createGushanDetail,
  createShoreMist,
} from './fineDetail.js';
import { createWestLakeRefineStatic, createWestLakeRefineLife } from './refineDetail.js';

export const LAKE = [
  [-178, -44], [-172, -82], [-150, -112], [-110, -128], [-58, -134], [-6, -130],
  [52, -122], [108, -102], [148, -70], [168, -22], [166, 32], [150, 84],
  [120, 126], [74, 155], [16, 168], [-46, 164], [-100, 148], [-142, 118],
  [-170, 79], [-184, 30], [-186, -12],
];

export const SUDI = [
  [-108, -128], [-114, -94], [-119, -56], [-123, -18], [-125, 20],
  [-129, 58], [-133, 94], [-136, 122],
];

export const BAIDI = [
  [136, -112], [122, -106], [102, -99], [79, -93], [55, -87], [34, -81], [14, -77],
];

export const CAUSEWAYS = [
  { name: '苏堤', points: SUDI, width: 9.5, y: 0.55 },
  { name: '白堤', points: BAIDI, width: 7.5, y: 0.55 },
];

const suCurve = new THREE.CatmullRomCurve3(SUDI.map((p) => new THREE.Vector3(p[0], 0, p[1])), false, 'catmullrom', 0.25);
const baiCurve = new THREE.CatmullRomCurve3(BAIDI.map((p) => new THREE.Vector3(p[0], 0, p[1])), false, 'catmullrom', 0.25);

function bridgeOn(curve, t, span, width, rise, snow, name) {
  const p = curve.getPoint(t);
  const tan = curve.getTangent(t);
  return {
    x: p.x, z: p.z, rot: Math.atan2(tan.x, tan.z),
    span, width, rise, baseY: 0.2, snow, name,
  };
}

export const BRIDGES = [
  bridgeOn(baiCurve, 0.095, 18, 7.5, 2.5, true, '断桥残雪'),
  bridgeOn(baiCurve, 0.63, 10, 7.0, 1.5, false, '锦带桥'),
  ...([0.13, 0.29, 0.45, 0.61, 0.77, 0.9].map((t, i) =>
    bridgeOn(suCurve, t, 12, 8.6, 1.9 + (i % 3) * 0.15, false, ['映波桥', '锁澜桥', '望山桥', '压堤桥', '东浦桥', '跨虹桥'][i])
  )),
];

export const ISLETS = [
  { x: -30, z: -72, rx: 46, rz: 27, h: 1.15, name: '孤山' },
  { x: 8, z: 26, rx: 11, rz: 9, h: 0.95, name: '湖心亭' },
  { x: -42, z: 104, rx: 27, rz: 18, h: 1.05, name: '三潭印月' },
  { x: 34, z: 60, rx: 7, rz: 5.5, h: 0.8, name: '阮公墩' },
];

export const SPAWN = { x: 122, z: -106, yaw: Math.PI * 0.5 };
export const BOUNDS = { minX: -262, maxX: 262, minZ: -282, maxZ: 302 };

export const COLLIDERS = { boxes: [], circles: [], names: [] };
export const FP_WORLD = {
  lake: LAKE,
  causeways: CAUSEWAYS,
  bridges: BRIDGES,
  islets: ISLETS,
  spawn: SPAWN,
  bounds: BOUNDS,
  colliders: COLLIDERS,
};

function addCircle(x, z, r, name) {
  COLLIDERS.circles.push({ x, z, r });
  COLLIDERS.names.push(name);
}

function addBoxCollider(x, z, w, d, name) {
  COLLIDERS.boxes.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
  COLLIDERS.names.push(name);
}

function makeShape(points) {
  const shape = new THREE.Shape();
  points.forEach(([x, z], i) => {
    if (i === 0) shape.moveTo(x, -z);
    else shape.lineTo(x, -z);
  });
  shape.closePath();
  return shape;
}

function createLake(waterMaterial) {
  const group = new THREE.Group();
  const geo = new THREE.ShapeGeometry(makeShape(LAKE), 24);
  geo.rotateX(-Math.PI / 2);
  const bed = new THREE.Mesh(geo.clone(), mats.lakeBed);
  bed.position.y = -0.35;
  bed.receiveShadow = true;
  group.add(bed);
  const water = new THREE.Mesh(geo, waterMaterial);
  water.position.y = 0.12;
  water.renderOrder = 1;
  group.add(water);

  const curve = new THREE.CatmullRomCurve3(LAKE.map(([x, z]) => new THREE.Vector3(x, 0, z)), true, 'catmullrom', 0.4);
  const pts = curve.getPoints(150);
  const bank = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    const g = new THREE.BoxGeometry(1.8, 0.5, len + 1.0);
    g.rotateY(Math.atan2(b.x - a.x, b.z - a.z));
    g.translate((a.x + b.x) / 2, 0.08, (a.z + b.z) / 2);
    bank.push(g);
  }
  const bm = mergedMesh(bank, mats.stone, true, true);
  if (bm) group.add(bm);
  return group;
}

function bridgeNear(x, z, margin = 3) {
  for (const b of BRIDGES) {
    const dx = x - b.x;
    const dz = z - b.z;
    const lx = dx * Math.cos(b.rot) - dz * Math.sin(b.rot);
    const lz = dx * Math.sin(b.rot) + dz * Math.cos(b.rot);
    if (Math.abs(lx) < b.width * 0.5 + 1.5 && Math.abs(lz) < b.span * 0.5 + margin) return true;
  }
  return false;
}

function placeTree(root, kind, x, z, seed, scale = 1, y = 0) {
  let t;
  if (kind === 'willow') t = createWillow({ height: 7.4 + (seed % 3) * 0.9, spread: 2.5, seed });
  else if (kind === 'peach') t = createPeachTree({ height: 5.6 + (seed % 3) * 0.6, spread: 2.0 + (seed % 2) * 0.3, seed });
  else t = createTree({ height: 8 + (seed % 4), spread: 2.8 + (seed % 3) * 0.4, kind: 'pine', seed });
  t.position.set(x, y, z);
  t.scale.setScalar(scale);
  root.add(t);
  if (kind !== 'pine') addCircle(x, z, kind === 'willow' ? 0.75 : 0.55, kind === 'willow' ? '柳树' : '桃树');
}

function lineTrees(root, curve, width, count, seed) {
  const pts = curve.getSpacedPoints(count);
  let n = seed;
  pts.forEach((p, i) => {
    const t = i / (pts.length - 1);
    const tan = curve.getTangent(t);
    const nx = -tan.z;
    const nz = tan.x;
    for (const side of [-1, 1]) {
      if (i % 4 === 3 && side > 0) continue;
      const off = width * 0.5 - 1.2;
      const x = p.x + nx * side * off;
      const z = p.z + nz * side * off;
      if (bridgeNear(x, z, 3.2)) continue;
      if (i % 3 === 1 && side > 0) {
        placeTree(root, 'peach', x, z, n++, 0.9);
      } else {
        placeTree(root, 'willow', x, z, n++, 1.0);
      }
    }
  });
}

function shoreTrees(root) {
  const curve = new THREE.CatmullRomCurve3(
    LAKE.map(([x, z]) => new THREE.Vector3(x, 0, z)), true, 'catmullrom', 0.3
  );
  const pts = curve.getSpacedPoints(54);
  const c = new THREE.Vector3(0, 0, 10);
  let seed = 30;
  pts.forEach((p, i) => {
    if (i % 2 === 1) return;
    const dx = p.x - c.x;
    const dz = p.z - c.z;
    const d = Math.hypot(dx, dz) || 1;
    const off = 7 + (i % 5) * 2.5;
    const x = p.x + (dx / d) * off;
    const z = p.z + (dz / d) * off;
    if (Math.hypot(x - SPAWN.x, z - SPAWN.z) < 18) return;
    if (i % 3 === 0) placeTree(root, 'peach', x, z, seed++, 0.95);
    else placeTree(root, 'willow', x, z, seed++, 1.0 + (i % 2) * 0.1);
  });
}

export function buildWestLakeScene() {
  const root = new THREE.Group();
  const waterMaterial = makeWaterMaterial();

  const terrain = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), mats.grass);
  terrain.rotation.x = -Math.PI / 2;
  terrain.position.y = -0.12;
  terrain.receiveShadow = true;
  root.add(terrain);
  root.add(createLake(waterMaterial));

  for (const c of CAUSEWAYS) {
    root.add(createCauseway({ points: c.points, width: c.width, y: c.y }));
    root.add(createCausewayDetail({ points: c.points, width: c.width, y: c.y, name: c.name }));
    lineTrees(root, new THREE.CatmullRomCurve3(c.points.map((p) => new THREE.Vector3(p[0], 0, p[1])), false, 'catmullrom', 0.25), c.width, c.name === '苏堤' ? 28 : 18, c.name === '苏堤' ? 10 : 60);
  }
  for (const b of BRIDGES) {
    root.add(createStoneBridge({ x: b.x, z: b.z, rot: b.rot, span: b.span, width: b.width, rise: b.rise, snow: b.snow, name: b.name }));
  }

  for (const s of ISLETS) {
    root.add(createIslet({ x: s.x, z: s.z, rx: s.rx, rz: s.rz, h: s.h }));
    if (s.name === '三潭印月') root.add(createSantanDetail(s));
    else if (s.name === '孤山') root.add(createGushanDetail(s));
  }

  const hillDefs = [
    [46, 220, 104, 70, 34, mats.hill, 2],
    [150, -190, 86, 60, 28, mats.hill, 4],
    [-30, -80, 32, 20, 7, mats.hill, 6],
    [-236, -176, 120, 80, 46, mats.hillFar, 8],
    [-18, -268, 150, 86, 38, mats.hillFar, 10],
    [220, -176, 118, 74, 42, mats.hillFar, 12],
    [286, 42, 110, 100, 36, mats.hillFar, 14],
    [180, 250, 160, 90, 40, mats.hillFar, 16],
    [-90, 292, 190, 92, 32, mats.hillFar, 18],
    [-282, 110, 120, 90, 44, mats.hillFar, 20],
    [-356, -34, 180, 110, 56, mats.hillFar, 22],
    [28, -372, 210, 120, 48, mats.hillFar, 24],
    [368, 188, 190, 120, 50, mats.hillFar, 26],
  ];
  hillDefs.forEach(([x, z, rx, rz, h, mat, seed]) => {
    root.add(createHill({ x, z, rx, rz, h, mat, seed }));
  });
  addCircle(-30, -80, 17, '孤山山体');
  addCircle(46, 220, 34, '雷峰塔山体');
  addCircle(150, -190, 26, '宝石山');

  root.add(createLeifengPagoda({ x: 46, z: 220, baseY: 30.5 }));
  root.add(createLeifengDetail({ x: 46, z: 220, baseY: 30.5 }));
  root.add(createSlenderPagoda({ x: 148, z: -188, baseY: 25.6 }));
  root.add(createThreePagodas({ points: [[-69, 110], [-43, 127], [-17, 110]] }));
  addCircle(46, 220, 10, '雷峰塔');
  addCircle(148, -188, 4.5, '保俶塔');
  addCircle(-69, 110, 2.2, '三潭石塔');
  addCircle(-43, 127, 2.2, '三潭石塔');
  addCircle(-17, 110, 2.2, '三潭石塔');

  const faceTo = (x, z) => Math.atan2(-x, -z);
  const pavDefs = [
    { x: 8, z: 26, y: 0.95, kind: 'hex', radius: 3.3, name: '湖心亭', r: 4.2 },
    { x: 34, z: 60, y: 0.8, kind: 'hex', radius: 2.6, name: '阮公墩', r: 3.4 },
    { x: -42, z: 99, y: 1.05, kind: 'pav', w: 11, d: 7, name: '三潭印月', rot: Math.PI, cw: 13, cd: 9 },
    { x: -17, z: -65, y: 1.15, kind: 'pav', w: 10, d: 6.5, name: '放鹤亭', rot: 0.35, cw: 12, cd: 8 },
    { x: -55, z: -74, y: 1.15, kind: 'pav', w: 8.5, d: 6, name: '西湖天下景', rot: 2.6, cw: 10, cd: 7 },
    { x: -150, z: -140, kind: 'pav', w: 12, d: 8, name: '平湖秋月', rot: faceTo(-150, -140), cw: 14, cd: 10 },
    { x: -206, z: -40, kind: 'pav', w: 11, d: 7.5, name: '曲院风荷', rot: faceTo(-206, -40), cw: 13, cd: 9 },
    { x: -162, z: 110, kind: 'pav', w: 10, d: 7, name: '柳浪闻莺', rot: faceTo(-162, 110), cw: 12, cd: 9 },
    { x: -58, z: 182, kind: 'pav', w: 11, d: 7.5, name: '花港观鱼', rot: faceTo(-58, 182), cw: 13, cd: 9 },
    { x: 100, z: -138, kind: 'pav', w: 12, d: 8, name: '湖滨晴雨', rot: faceTo(100, -138), cw: 14, cd: 10 },
    { x: 130, z: 150, kind: 'pav', w: 9, d: 6.5, name: '长桥公园', rot: faceTo(130, 150), cw: 11, cd: 8 },
  ];
  for (const p of pavDefs) {
    let g;
    if (p.kind === 'hex') {
      g = createHexPavilion({ radius: p.radius, wallH: 2.7, roofH: 3.0, baseH: 0.6, name: p.name });
    } else {
      g = createPavilion({
        w: p.w, d: p.d, wallH: 3.1, roofH: 3.4, eave: 1.8, baseH: 0.6,
        bays: 3, name: p.name, open: true, rail: true, x: 0, z: 0, rot: 0,
      });
    }
    g.position.set(p.x, p.y || 0, p.z);
    if (p.rot) g.rotation.y = p.rot;
    root.add(g);
    if (p.kind === 'hex') addCircle(p.x, p.z, p.r, p.name);
    else addBoxCollider(p.x, p.z, p.cw, p.cd, p.name);
  }

  root.add(createZigzagBridge({ points: [[-56, 96], [-49, 99], [-42, 99], [-35, 101], [-28, 104]], width: 2.2 }));

  shoreTrees(root);
  placeTree(root, 'willow', -34, -62, 300, 1.1, 1.15);
  placeTree(root, 'willow', -8, -73, 301, 1.0, 1.15);
  placeTree(root, 'peach', -47, -62, 302, 0.9, 1.15);
  placeTree(root, 'peach', -21, -85, 303, 0.9, 1.15);
  placeTree(root, 'pine', -40, -88, 304, 1.0, 1.15);
  placeTree(root, 'willow', 4, 22, 310, 0.9, 0.95);
  placeTree(root, 'peach', 12, 22, 311, 0.85, 0.95);
  placeTree(root, 'pine', 6, 31, 312, 0.8, 0.95);
  placeTree(root, 'willow', -48, 98, 320, 0.95, 1.05);
  placeTree(root, 'peach', -36, 96, 321, 0.9, 1.05);
  placeTree(root, 'peach', -44, 111, 322, 0.9, 1.05);
  placeTree(root, 'willow', -33, 109, 323, 0.85, 1.05);
  placeTree(root, 'willow', 33, 58, 330, 0.8, 0.8);
  placeTree(root, 'peach', 36, 62, 331, 0.75, 0.8);

  const dq = BRIDGES[0];
  const dc = Math.cos(dq.rot);
  const ds = Math.sin(dq.rot);
  [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([sx, sz], i) => {
    const lx = sx * (dq.width * 0.5 + 1.4);
    const lz = sz * (dq.span * 0.5 + 2.2);
    const x = dq.x + lx * dc + lz * ds;
    const z = dq.z - lx * ds + lz * dc;
    placeTree(root, i % 2 === 0 ? 'willow' : 'peach', x, z, 340 + i, 0.82, 0.55);
  });

  const lotusBeds = [
    [-14, 52, 7, 26], [58, -6, 6, 22], [-92, 18, 6, 20], [-66, 68, 7, 24],
    [-18, -112, 5, 18], [86, -70, 5, 18], [122, 38, 6, 20], [-134, 62, 5, 18],
    [28, 122, 6, 22], [-98, 122, 5, 18], [18, -18, 4, 14], [-152, -18, 4, 14],
    [-63, 119, 5.5, 20], [-25, 113, 5, 18], [-45, 128, 4.5, 16],
    [-12, -96, 4.5, 16], [-49, -91, 4, 14], [-6, -60, 3.5, 12],
  ];
  lotusBeds.forEach(([x, z, r, c], i) => {
    root.add(createLotus({ x, z, radius: r, count: c, seed: i + 2 }));
  });

  root.add(createWestLakeRefineStatic({
    bridges: BRIDGES,
    lotusBeds,
    lake: LAKE,
    leifeng: { x: 46, z: 220, baseY: 30.5 },
    santan: [[-69, 110], [-43, 127], [-17, 110]],
  }));

  const shrubs = [
    [-140, -128], [-164, -104], [-196, -26], [-172, 92], [-112, 142],
    [-36, 156], [26, 146], [88, 132], [136, 92], [150, 36],
    [132, -84], [70, -112], [-84, -108], [-20, -120], [106, -124],
  ];
  shrubs.forEach(([x, z], i) => {
    const s = createShrub({ radius: 1.5 + (i % 3) * 0.5, height: 1.5 + (i % 2) * 0.5, seed: i + 12 });
    s.position.set(x, 0, z);
    root.add(s);
  });

  const banana = [[-148, -128], [-152, 102], [96, -126], [-54, 170]];
  banana.forEach(([x, z], i) => {
    const b = createBanana({ height: 3.0 + (i % 2) * 0.6, seed: i + 5 });
    b.position.set(x, 0, z);
    root.add(b);
  });

  root.add(createShoreMist(LAKE, [[-69, 110], [-43, 127], [-17, 110]]));
  const merged = mergeStaticGroup(root);
  const life = createLakeLife();
  const refineLife = createWestLakeRefineLife({
    boats: life.boats,
    lotusBeds,
    santan: [[-69, 110], [-43, 127], [-17, 110]],
    leifeng: { x: 46, z: 220, baseY: 30.5 },
  });
  const baseLifeUpdate = life.update;
  life.update = (t, dt) => {
    baseLifeUpdate(t, dt);
    refineLife.update(t, dt);
  };
  merged.add(life.group);
  merged.add(refineLife.group);
  return { group: merged, waterMaterial, life, lanternMaterial: mats.lantern };
}
