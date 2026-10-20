import * as THREE from 'three';
import { mats, makeWaterMaterial } from './materials.js';
import { addBox, mergedMesh, mergeStaticGroup } from './geometry.js';
import {
  createBogdaRange,
  createRockRidges,
  createShoreline,
  createBoardwalk,
  createMeadow,
  createMist,
  createSpruce,
} from './tianchiNature.js';
import {
  createYurt,
  createHorse,
  createPrayerFlags,
  createEagles,
  createVisitor,
} from './tianchiCulture.js';

export const LAKE = [
  [-92, -72], [-112, -44], [-122, -4], [-121, 44], [-108, 88], [-82, 124],
  [-42, 150], [6, 158], [54, 148], [94, 124], [120, 88], [130, 44],
  [126, -4], [110, -48], [82, -82], [44, -104], [0, -114], [-48, -100],
];

export const BOARDWALK = [
  [-102, -132], [-68, -142], [-34, -148], [2, -150], [38, -147], [72, -139], [104, -126],
];

export const CAUSEWAYS = [
  { name: '天池木栈道', points: BOARDWALK, width: 3.6, y: 0.45 },
];

export const BRIDGES = [];
export const ISLETS = [];

export const SPAWN = { x: 2, z: -150, yaw: Math.PI };
export const BOUNDS = { minX: -248, maxX: 248, minZ: -228, maxZ: 226 };

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

const YURTS = [
  { x: 158, z: 6, rot: -1.75, trim: 'blue' },
  { x: 184, z: 26, rot: -2.4, trim: 'red' },
  { x: 182, z: 56, rot: -2.8, trim: 'blue' },
];

const HORSES = [
  { x: 145, z: -16, rot: 2.4, dark: false },
  { x: 174, z: 49, rot: -0.8, dark: true },
  { x: 204, z: 12, rot: 3.0, dark: false },
  { x: 138, z: 27, rot: 1.2, dark: true },
];

function addCircle(x, z, r, name) {
  COLLIDERS.circles.push({ x, z, r });
  COLLIDERS.names.push(name);
}

function addBoxCollider(x, z, w, d, name) {
  COLLIDERS.boxes.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
  COLLIDERS.names.push(name);
}

function insidePoly(x, z, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0];
    const zi = poly[i][1];
    const xj = poly[j][0];
    const zj = poly[j][1];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

function ringDistance(x, z, poly) {
  let min = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const vx = b[0] - a[0];
    const vz = b[1] - a[1];
    const len2 = vx * vx + vz * vz || 1;
    const t = Math.max(0, Math.min(1, ((x - a[0]) * vx + (z - a[1]) * vz) / len2));
    min = Math.min(min, Math.hypot(x - a[0] - vx * t, z - a[1] - vz * t));
  }
  return min;
}

function rand(seed, n) {
  const x = Math.sin(seed * 127.1 + n * 311.7) * 43758.5453;
  return x - Math.floor(x);
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
  const geo = new THREE.ShapeGeometry(makeShape(LAKE), 28);
  geo.rotateX(-Math.PI / 2);
  const bed = new THREE.Mesh(geo.clone(), mats.lakeBed);
  bed.position.y = -0.35;
  bed.receiveShadow = true;
  group.add(bed);
  const water = new THREE.Mesh(geo, waterMaterial);
  water.position.y = 0.12;
  water.renderOrder = 1;
  group.add(water);
  group.add(createShoreline(LAKE));
  return group;
}

function createForest(root) {
  const clusters = [
    [-172, -42, 52], [-196, 66, 48], [-142, 150, 44], [-58, 190, 42],
    [42, 194, 40], [128, 180, 40], [202, 108, 34], [214, -36, 30],
    [-214, -132, 32], [166, -108, 28], [-98, -160, 26],
  ];
  const forest = [];
  let seed = 40;
  clusters.forEach(([cx, cz, r], ci) => {
    const count = ci < 4 ? 22 : 14;
    for (let i = 0; i < count; i++) {
      seed++;
      const a = rand(seed, i) * Math.PI * 2;
      const d = Math.sqrt(rand(seed + 3, i)) * r;
      const x = cx + Math.cos(a) * d;
      const z = cz + Math.sin(a) * d;
      if (insidePoly(x, z, LAKE)) continue;
      if (ringDistance(x, z, LAKE) < 10) continue;
      if (Math.hypot(x - 170, z - 20) < 48) continue;
      if (Math.hypot(x - 2, z + 150) < 9) continue;
      const height = 7.5 + rand(seed + 5, i) * 9.5;
      const radius = height * (0.2 + rand(seed + 7, i) * 0.06);
      const t = createSpruce({ height, radius, seed: seed * 7 + i });
      t.position.set(x, 0, z);
      t.rotation.y = rand(seed + 11, i) * 6.28;
      root.add(t);
      forest.push([x, z]);
      if (Math.hypot(x, z) < 210) addCircle(x, z, 0.55, '云杉');
    }
  });
  return forest;
}

function createCampfire(root) {
  const stones = [];
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * Math.PI * 2;
    const g = new THREE.IcosahedronGeometry(0.32 + (i % 3) * 0.08, 0);
    g.scale(1.2, 0.7, 1.0);
    g.translate(170 + Math.cos(a) * 1.45, 0.22, 2 + Math.sin(a) * 1.45);
    stones.push(g);
  }
  const logs = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const g = new THREE.CylinderGeometry(0.1, 0.13, 1.45, 5);
    g.rotateZ(1.35);
    g.rotateY(a);
    g.translate(170, 0.18, 2);
    logs.push(g);
  }
  const sm = mergedMesh(stones, mats.rock, true, true);
  if (sm) root.add(sm);
  const lm = mergedMesh(logs, mats.timber, true, true);
  if (lm) root.add(lm);
  addCircle(170, 2, 2.4, '篝火');
}

export function buildTianchiScene() {
  const root = new THREE.Group();
  const waterMaterial = makeWaterMaterial();
  waterMaterial.uniforms.uDeep.value.set(0x0f5c67);
  waterMaterial.uniforms.uShallow.value.set(0x58b7b1);
  waterMaterial.uniforms.uSky.value.set(0xbdd9df);

  const terrain = new THREE.Mesh(new THREE.PlaneGeometry(2200, 2200), mats.grass);
  terrain.rotation.x = -Math.PI / 2;
  terrain.position.y = -0.14;
  terrain.receiveShadow = true;
  root.add(terrain);

  root.add(createLake(waterMaterial));
  root.add(createBoardwalk({ points: BOARDWALK, width: 3.6, y: 0.45 }));
  root.add(createRockRidges());

  YURTS.forEach((y) => {
    root.add(createYurt(y));
    addCircle(y.x, y.z, 5.5, '毡房');
  });

  HORSES.forEach((h) => {
    root.add(createHorse(h));
    addBoxCollider(h.x, h.z, 2.6, 3.6, '马');
  });

  const visitors = [
    { x: 10, z: -149.4, rot: Math.PI, coat: 'blue', y: 0.45 },
    { x: -42, z: -143.2, rot: 0.25, coat: 'red', y: 0.45 },
    { x: 158, z: 14, rot: 2.1, coat: 'dark', y: 0 },
    { x: 96, z: -8, rot: -2.2, coat: 'blue', y: 0 },
  ];
  visitors.forEach((v) => {
    const person = createVisitor(v);
    person.position.y = v.y;
    root.add(person);
  });

  createCampfire(root);

  const forest = createForest(root);
  root.add(createMeadow({ lake: LAKE, boardwalk: BOARDWALK, forest, bounds: BOUNDS }));

  const prayer = createPrayerFlags();
  root.add(prayer.group);
  const mist = createMist();
  root.add(mist.group);

  const merged = mergeStaticGroup(root);

  const range = createBogdaRange();
  merged.add(range.mesh);

  const eagles = createEagles();
  merged.add(eagles.group);

  const life = {
    update(t) {
      eagles.update(t);
      prayer.update(t);
      mist.update(t);
    },
  };

  return { group: merged, waterMaterial, life, lanternMaterial: mats.lantern };
}
