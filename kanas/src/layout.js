import * as THREE from 'three';
import { mats, makeWaterMaterial } from './materials.js';
import { mergeStaticGroup } from './geometry.js';
import {
  createKanasMountains,
  createFoothills,
  createShoreline,
  createRiver,
} from './kanasTerrain.js';
import { createBoardwalk, createMeadow, createMist, createScatterRocks } from './kanasLiving.js';
import { createForest } from './kanasTrees.js';
import { createVillage, createSmoke, createEagles, createVisitor } from './kanasVillage.js';

export const LAKE = [
  [-86, -86], [-116, -52], [-126, 0], [-124, 52], [-114, 104], [-94, 150],
  [-64, 184], [-26, 202], [16, 204], [54, 192], [84, 164], [106, 122],
  [116, 72], [118, 20], [108, -34], [84, -76], [48, -102], [6, -112], [-40, -106],
];

export const RIVER = [
  [16, 202], [34, 232], [60, 260], [44, 292], [14, 312], [-10, 336],
  [-6, 366], [22, 384], [54, 398], [66, 426],
];

export const BOARDWALK = [
  [-116, -128], [-80, -138], [-42, -143], [-6, -146], [32, -144], [68, -137], [104, -126],
];

export const CAUSEWAYS = [
  { name: '喀纳斯湖栈道', points: BOARDWALK, width: 3.6, y: 0.45 },
];

export const BRIDGES = [];
export const ISLETS = [];

export const SPAWN = { x: 2, z: -145, yaw: Math.PI };
export const BOUNDS = { minX: -235, maxX: 235, minZ: -225, maxZ: 225 };

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

const VILLAGE_RECT = { minX: 128, maxX: 220, minZ: -34, maxZ: 100 };

const FOREST_CLUSTERS = [
  [-185, -55, 52, 34], [-205, 60, 54, 34], [-175, 150, 48, 28], [-214, -140, 34, 20],
  [206, 120, 44, 24], [220, -45, 36, 20], [162, -118, 32, 18], [208, 190, 36, 18],
  [-80, 215, 34, 18], [70, 225, 34, 18], [135, 228, 28, 14],
  [-80, -195, 34, 18], [60, -192, 30, 16], [190, -175, 28, 14],
  [78, 270, 24, 12], [-60, 300, 24, 12], [96, 360, 24, 12], [-40, 405, 24, 12],
];

function addCircle(x, z, r, name) {
  COLLIDERS.circles.push({ x, z, r });
  COLLIDERS.names.push(name);
}

function addBoxCollider(x, z, w, d, name) {
  COLLIDERS.boxes.push({
    minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2,
  });
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
  const geo = new THREE.ShapeGeometry(makeShape(LAKE), 30);
  geo.rotateX(-Math.PI / 2);
  const bed = new THREE.Mesh(geo.clone(), mats.lakeBed);
  bed.position.y = -0.38;
  bed.receiveShadow = true;
  group.add(bed);
  const water = new THREE.Mesh(geo, waterMaterial);
  water.name = 'kanas-lake-water';
  water.position.y = 0.12;
  water.renderOrder = 1;
  group.add(water);
  group.add(createShoreline(LAKE));
  return group;
}

export function buildKanasScene() {
  const root = new THREE.Group();
  const waterMaterial = makeWaterMaterial();
  waterMaterial.uniforms.uDeep.value.set(0x0d4b58);
  waterMaterial.uniforms.uShallow.value.set(0x46b3a7);
  waterMaterial.uniforms.uSky.value.set(0xbad9de);

  const terrain = new THREE.Mesh(new THREE.PlaneGeometry(2200, 2200), mats.grass);
  terrain.rotation.x = -Math.PI / 2;
  terrain.position.y = -0.14;
  terrain.receiveShadow = true;
  root.add(terrain);

  root.add(createLake(waterMaterial));
  const river = createRiver(RIVER, waterMaterial, 10);
  root.add(river.group);
  root.add(createBoardwalk({ points: BOARDWALK, width: 3.6, y: 0.45 }));
  root.add(createScatterRocks());

  const range = createKanasMountains();
  root.add(range.mesh);
  root.add(createFoothills());

  const village = createVillage();
  root.add(village.group);
  addBoxCollider(154, 12, 13, 11, '木屋');
  addBoxCollider(181, 36, 11, 10, '木屋');
  addBoxCollider(151, 55, 10, 9, '木屋');
  addBoxCollider(198, 8, 9, 8, '木屋');
  village.horses.forEach((h) => addBoxCollider(h.x, h.z, 2.8, 3.8, '马'));

  const visitors = [
    { x: 8, z: -144.2, rot: Math.PI, coat: 'blue', backpack: true },
    { x: -46, z: -142.2, rot: 0.25, coat: 'red' },
    { x: 156, z: 24, rot: 2.1, coat: 'gold' },
    { x: 171, z: -2, rot: -2.2, coat: 'blue' },
    { x: 162, z: -8.5, rot: 0.6, coat: 'dark', backpack: true },
  ];
  visitors.forEach((v) => {
    const person = createVisitor(v);
    person.position.y = v.z < -120 ? 0.45 : 0;
    root.add(person);
    addCircle(v.x, v.z, 0.45, '访客');
  });

  const forest = createForest({
    clusters: FOREST_CLUSTERS,
    isExcluded(x, z) {
      if (insidePoly(x, z, LAKE)) return true;
      if (ringDistance(x, z, LAKE) < 7.5) return true;
      if (x > VILLAGE_RECT.minX && x < VILLAGE_RECT.maxX && z > VILLAGE_RECT.minZ && z < VILLAGE_RECT.maxZ) return true;
      for (const p of river.pts) if (Math.hypot(x - p.x, z - p.z) < 9) return true;
      for (const p of BOARDWALK) if (Math.hypot(x - p[0], z - p[1]) < 7) return true;
      if (Math.hypot(x - SPAWN.x, z - SPAWN.z) < 11) return true;
      return false;
    },
    onTree(x, z) {
      if (Math.hypot(x, z - 40) < 230) addCircle(x, z, 0.55, '泰加林');
    },
  });
  root.add(forest.group);

  root.add(
    createMeadow({
      lake: LAKE,
      riverPts: river.pts,
      boardwalk: BOARDWALK,
      forest: forest.positions,
      village: VILLAGE_RECT,
      bounds: { minX: -225, maxX: 225, minZ: -215, maxZ: 215 },
    })
  );

  const merged = mergeStaticGroup(root);
  const shadowMaterials = new Set([
    mats.spruce, mats.spruceLight, mats.larch, mats.larchLight, mats.birchLeaf,
    mats.logWall, mats.roof, mats.timber, mats.stone, mats.trunk,
  ]);
  merged.traverse((o) => {
    if (o.isMesh) o.castShadow = shadowMaterials.has(o.material);
  });

  const smoke = createSmoke(village.smokeSpots);
  merged.add(smoke.group);
  const mist = createMist();
  merged.add(mist.group);
  const eagles = createEagles();
  merged.add(eagles.group);

  const life = {
    update(t) {
      eagles.update(t);
      smoke.update(t);
      mist.update(t);
    },
  };

  return { group: merged, waterMaterial, life, windowMaterial: mats.windowWarm, forest };
}
