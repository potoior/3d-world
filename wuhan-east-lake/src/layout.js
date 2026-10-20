import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mats, makeWaterMaterial } from './materials.js';
import { addBox, mergedMesh, mergeStaticGroup } from './geometry.js';
import { createTree, createRock } from './props.js';
import { createPavilion } from './gardenBuild.js';
import { createWillow, createBamboo, createLotus } from './gardenDetails.js';
import { LAKE_RING } from './lakeData.js';
import {
  WATER_Y,
  terrainHeight,
  lakeField,
  createTerrain,
  createWater,
  createCoveWater,
  createFarMountains,
  createSkyline,
  createShoreReeds,
  createIslandRocks,
} from './terrain.js';
import {
  createXingyin,
  createArchBridge,
  createHillStairway,
  createChuTower,
  createChuGate,
  createChangtian,
  createTingtaoPavilion,
  createGreenway,
  createDock,
} from './landmarks.js';
import { addTingtaoDetails } from './tingtaoDetails.js';
import { addGreenwayDetails } from './greenwayDetails.js';
import { addWaterDetails } from './waterDetails.js';
import { addXingyinDetails, addMoshanDetails, addCherryDetails } from './landmarkDetails.js';
import { createLakeLife } from './lakeLife.js';
import { createInstancedForest } from './instancedTrees.js';
import { addPerson, addFisher, addShrub } from './detailKit.js';

const ISLAND = { x: -382, z: -8 };
const ISLAND_BASE = terrainHeight(ISLAND.x, ISLAND.z);
const DECK_TOP = ISLAND_BASE + 3.0;

function createWaterFir({ height = 12, seed = 1 }) {
  const group = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.28, height, 6), mats.trunk);
  trunk.position.y = height / 2;
  trunk.castShadow = true;
  group.add(trunk);
  const cones = [];
  for (let i = 0; i < 4; i++) {
    const r = 1.9 * (1 - i * 0.18);
    const c = new THREE.ConeGeometry(r, height * 0.34, 7);
    c.translate((i % 2 ? 0.15 : -0.15), height * (0.38 + i * 0.17), 0);
    cones.push(c);
  }
  const cm = mergedMesh(cones, mats.pine, true, true);
  if (cm) group.add(cm);
  return group;
}

function createCherry({ height = 7, spread = 3.2, seed = 1 }) {
  const group = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.36, height * 0.52, 7), mats.trunk);
  trunk.position.y = height * 0.26;
  trunk.castShadow = true;
  group.add(trunk);
  const rnd = (n) => {
    const v = Math.sin(seed * 63.1 + n * 37.7) * 43758.5453;
    return v - Math.floor(v);
  };
  const blobs = [];
  for (let i = 0; i < 8; i++) {
    const r = spread * (0.56 + rnd(i) * 0.52);
    const blob = new THREE.IcosahedronGeometry(r, 1);
    blob.scale(1.16, 0.73, 1.16);
    blob.translate(
      (rnd(i + 5) - 0.5) * spread * 2.0,
      height * (0.53 + rnd(i + 9) * 0.35),
      (rnd(i + 13) - 0.5) * spread * 2.0
    );
    blobs.push(blob);
  }
  const mesh = mergedMesh(blobs, seed % 3 === 0 ? mats.cherryLight : mats.cherry, true, true);
  if (mesh) group.add(mesh);
  return group;
}

function createBoat({ hull = mats.wood, scale = 1, canopy = mats.white }) {
  const group = new THREE.Group();
  const dark = [];
  const light = [];
  const body = new THREE.CylinderGeometry(1.25, 1.5, 1.15, 7);
  body.scale(3.4, 1, 1);
  body.translate(0, 0.4, 0);
  dark.push(body);
  const cab = new THREE.BoxGeometry(2.4, 1.3, 1.8);
  cab.translate(-0.6, 1.55, 0);
  light.push(cab);
  const deck = new THREE.BoxGeometry(6.2, 0.18, 2.2);
  deck.translate(0, 1.02, 0);
  light.push(deck);
  const cr = new THREE.ConeGeometry(1.55, 0.85, 4);
  cr.rotateY(Math.PI / 4);
  cr.translate(-0.6, 2.55, 0);
  dark.push(cr);
  const mast = new THREE.CylinderGeometry(0.06, 0.08, 2.4, 5);
  mast.translate(1.9, 2.1, 0);
  dark.push(mast);
  const dm = mergedMesh(dark, hull, true, true);
  if (dm) group.add(dm);
  const lm = mergedMesh(light, canopy, true, true);
  if (lm) group.add(lm);
  group.scale.setScalar(scale);
  return group;
}

function createWakes(boats) {
  const geos = [];
  for (const [x, z, rot, scale] of boats) {
    const fx = Math.cos(rot);
    const fz = -Math.sin(rot);
    for (const side of [-1, 1]) {
      const g = new THREE.PlaneGeometry(16 * scale, 3.2 * scale);
      g.rotateX(-Math.PI / 2);
      g.rotateY(rot);
      g.translate(x - fx * 9 * scale - fz * side * 1.6 * scale, WATER_Y + 0.03, z - fz * 9 * scale + fx * side * 1.6 * scale);
      geos.push(g);
    }
  }
  const mesh = mergedMesh(geos, mats.wake, false, false);
  if (mesh) mesh.renderOrder = 2;
  return mesh;
}

function createBirds() {
  const group = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: 0x536164, side: THREE.DoubleSide, transparent: true, opacity: 0.66 });
  const geos = [];
  let seed = 11;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = 0; i < 16; i++) {
    const g = new THREE.BufferGeometry();
    const s = 1.5 + rnd() * 1.4;
    g.setAttribute('position', new THREE.Float32BufferAttribute([-s, 0, 0, 0, s * 0.35, 0, 0, 0, 0, s, 0, 0, 0, s * 0.35, 0, 0, 0, 0], 3));
    g.translate((rnd() - 0.5) * 700, 85 + rnd() * 80, -500 + rnd() * 500);
    geos.push(g);
  }
  const mesh = mergedMesh(geos, mat, false, false);
  if (mesh) group.add(mesh);
  return group;
}

function addShoreTrees(root, rnd) {
  const n = LAKE_RING.length / 2;
  for (let i = 0; i < n; i += 2) {
    const j = (i + 1) % n;
    const x1 = LAKE_RING[i * 2];
    const z1 = LAKE_RING[i * 2 + 1];
    const x2 = LAKE_RING[j * 2];
    const z2 = LAKE_RING[j * 2 + 1];
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.hypot(dx, dz) || 1;
    const midX = (x1 + x2) / 2;
    const midZ = (z1 + z2) / 2;
    const nx = -dz / len;
    const nz = dx / len;
    const off = 16 + rnd() * 55;
    let x = midX + nx * off;
    let z = midZ + nz * off;
    if (lakeField(x, z) < 7) {
      x = midX - nx * off;
      z = midZ - nz * off;
    }
    if (lakeField(x, z) < 7) continue;
    const h = terrainHeight(x, z);
    if (h < 1.1 || h > 85) continue;
    if (Math.hypot(x - ISLAND.x, z - ISLAND.z) < 48) continue;
    let t;
    if (rnd() < 0.24) t = createWillow({ height: 7 + rnd() * 3, spread: 2.6, seed: i + 900 });
    else if (rnd() < 0.52) t = createTree({ height: 7 + rnd() * 6, spread: 2.6 + rnd() * 1.6, kind: 'pine', seed: i + 700 });
    else t = createTree({ height: 8 + rnd() * 7, spread: 2.8 + rnd() * 2, kind: 'broad', seed: i + 1400 });
    t.position.set(x, h - 0.1, z);
    t.rotation.y = rnd() * 6.28;
    root.add(t);
  }
}

function collectMoshanForest(defs, rnd) {
  for (let i = 0; i < 170; i++) {
    const a = rnd() * Math.PI * 2;
    const r = 35 + Math.sqrt(rnd()) * 300;
    const x = 680 + Math.cos(a) * r;
    const z = -90 + Math.sin(a) * r * 0.92;
    const h = terrainHeight(x, z);
    if (h < 4 || h > 130) continue;
    if (lakeField(x, z) < 6) continue;
    if (Math.hypot(x - 600, z + 110) < 52) continue;
    if (x > 480 && x < 610 && z > -155 && z < -85) continue;
    let kind;
    let height;
    let spread;
    let seed;
    if (rnd() < 0.2) {
      kind = 'willow';
      height = 8 + rnd() * 3;
      spread = 2.8;
      seed = i + 1200;
    } else if (rnd() < 0.55) {
      kind = 'fir';
      height = 9 + rnd() * 6;
      spread = 2.4;
      seed = i + 1300;
    } else {
      kind = 'broad';
      height = 8 + rnd() * 8;
      spread = 2.8 + rnd() * 2.2;
      seed = i + 1400;
    }
    defs.push({ kind, x, z, h, height, spread, seed, rot: rnd() * 6.28 });
  }
}

function addCherryGarden(root, rnd) {
  const clusters = [
    [-322, 738, 78, 58],
    [-382, 700, 55, 42],
    [-262, 792, 62, 46],
    [-398, 776, 48, 38],
    [-248, 690, 42, 32],
  ];
  let idx = 0;
  for (const [cx, cz, rx, rz] of clusters) {
    for (let i = 0; i < 32; i++) {
      const a = rnd() * Math.PI * 2;
      const r = Math.sqrt(rnd());
      const x = cx + Math.cos(a) * rx * r;
      const z = cz + Math.sin(a) * rz * r;
      const h = terrainHeight(x, z);
      if (h < 1.4) continue;
      if (lakeField(x, z) < 10) continue;
      const c = createCherry({ height: 6 + rnd() * 4.5, spread: 2.6 + rnd() * 1.9, seed: idx + 2000 });
      c.position.set(x, h - 0.1, z);
      c.rotation.y = rnd() * 6.28;
      root.add(c);
      idx++;
    }
  }
  for (let i = 0; i < 18; i++) {
    const x = -400 + rnd() * 170;
    const z = 650 + rnd() * 160;
    const h = terrainHeight(x, z);
    if (h < 2) continue;
    const b = createBamboo({ height: 6 + rnd() * 3, radius: 1.5, seed: i + 2600 });
    b.position.set(x, h, z);
    root.add(b);
  }
}

export function buildEastLakeScene() {
  const root = new THREE.Group();
  const waterMaterial = makeWaterMaterial();
  root.add(createTerrain());

  const lakeGeo = createWater();
  const coveGeo = createCoveWater();
  coveGeo.translate(0, 0.01, 0);
  const water = new THREE.Mesh(mergeGeometries([lakeGeo, coveGeo], false), waterMaterial);
  lakeGeo.dispose();
  coveGeo.dispose();
  water.position.y = WATER_Y;
  water.renderOrder = 1;
  root.add(water);

  root.add(createFarMountains());
  root.add(createSkyline());
  root.add(createShoreReeds());

  const islandRocks = createIslandRocks([
    [-382, -8, 12, 20, 1.3],
    [128, 152, 8, 18, 1.0],
    [-205, 288, 7, 18, 0.9],
    [420, 108, 8, 18, 1.1],
  ]);
  if (islandRocks) root.add(islandRocks);

  root.add(createXingyin({ x: ISLAND.x, z: ISLAND.z }));
  root.add(createArchBridge({ x0: -448, z0: -8, x1: -394, z1: -8, width: 5.6, deckY: DECK_TOP - 0.15 }));

  root.add(createChangtian({ x: -404, z: 74, rot: Math.PI / 2 }));
  root.add(createTingtaoPavilion({ x: -372, z: 150, name: '听涛轩' }));
  const tingtaoGate = createChuGate({ x: -450, z: 97, rot: -Math.PI / 2, name: '听涛' });
  tingtaoGate.scale.setScalar(0.62);
  root.add(tingtaoGate);

  root.add(createGreenway({
    points: [
      [-452, -680], [-446, -640], [-454, -600], [-462, -560],
      [-462, -520], [-444, -480], [-450, -440], [-472, -400],
      [-514, -360], [-532, -320], [-544, -280], [-546, -240],
      [-412, -200], [-418, -160], [-444, -120], [-454, -80],
      [-452, -40], [-462, -8], [-450, 22], [-388, 52],
      [-380, 82], [-366, 120], [-348, 160], [-346, 200],
      [-354, 240], [-360, 280], [-440, 310], [-438, 340],
      [-426, 370], [-392, 400], [-436, 440], [-482, 480],
      [-562, 520], [-650, 560],
    ],
    width: 4.8,
    safe: 0.18,
    rails: true,
    lamps: true,
    benches: true,
  }));

  root.add(createHillStairway({ x0: 505, z0: -120, x1: 585, z1: -110, width: 12 }));
  root.add(createChuTower({ x: 600, z: -110 }));
  root.add(createChuGate({ x: 468, z: -139, rot: Math.PI / 2 }));
  root.add(createGreenway({
    points: [
      [486, -140], [505, -148], [518, -150], [530, -142],
      [546, -128], [566, -118], [590, -112],
    ],
    width: 4.0,
    safe: 0.16,
    rails: false,
    lamps: true,
    benches: false,
  }));

  const cherryPavY = terrainHeight(-322, 738);
  const cherryPav = createPavilion({
    w: 11,
    d: 8,
    wallH: 3.2,
    roofH: 3.4,
    eave: 2.0,
    baseH: 0.9,
    bays: 3,
    name: '樱园',
    x: -322,
    z: 738,
    rot: Math.PI,
  });
  cherryPav.position.y = cherryPavY;
  root.add(createGreenway({
    points: [
      [-420, 690], [-380, 678], [-342, 700], [-302, 730],
      [-270, 770], [-260, 810], [-300, 842], [-352, 822],
      [-392, 782], [-420, 742],
    ],
    width: 3.0,
    safe: 0.12,
    rails: false,
    lamps: true,
    benches: true,
  }));
  root.add(createGreenway({
    points: [
      [-322, 738], [-280, 712], [-246, 672], [-220, 628],
    ],
    width: 2.6,
    safe: 0.12,
    rails: false,
    lamps: false,
    benches: false,
  }));
  cherryPav.traverse((o) => {
    if (o.isMesh && o.material === mats.roof) o.material = mats.roofGreen;
  });
  root.add(cherryPav);

  root.add(createDock({ x: -367, z: 4, rot: 0.2 }));
  root.add(createDock({ x: 376, z: -63, rot: -0.5, length: 30 }));
  root.add(createDock({ x: -46, z: 84, rot: 1.4, length: 24 }));

  const rnd = (() => {
    let s = 12345;
    return () => {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
  })();

  addShoreTrees(root, rnd);
  const forestDefs = [];
  collectMoshanForest(forestDefs, rnd);
  addCherryGarden(root, rnd);
  for (const [cx, cz, rad] of [[128, 152, 30], [-205, 288, 24], [420, 108, 26]]) {
    for (let i = 0; i < 14; i++) {
      const a = rnd() * Math.PI * 2;
      const r = Math.sqrt(rnd()) * rad * 0.72;
      const x = cx + Math.cos(a) * r;
      const z = cz + Math.sin(a) * r;
      const h = terrainHeight(x, z);
      if (h < 0.7) continue;
      const t = rnd() < 0.35
        ? createWillow({ height: 6 + rnd() * 2.5, spread: 2.4, seed: x + z })
        : createTree({ height: 6 + rnd() * 4, spread: 2.4 + rnd() * 1.4, kind: rnd() < 0.4 ? 'pine' : 'broad', seed: x - z });
      t.position.set(x, h - 0.1, z);
      t.rotation.y = rnd() * 6.28;
      root.add(t);
    }
  }

  for (const y of [
    [-408, 20, 7],
    [-330, 80, 6],
    [-180, 300, 7],
    [40, 520, 7],
    [260, -350, 8],
  ]) {
    if (terrainHeight(y[0], y[1]) < -0.6) {
      const lotus = createLotus({ x: y[0], z: y[1], radius: y[2], count: 18, seed: y[0] });
      lotus.position.y = WATER_Y - 0.05;
      root.add(lotus);
    }
  }

  const boatDefs = [
    [-100, -500, 0.4, 1.0],
    [80, -100, 2.1, 0.85],
    [240, 300, 1.2, 1.1],
    [-250, 450, 2.8, 0.8],
    [420, -300, 3.6, 0.95],
  ];
  for (const [x, z, rot, scale] of boatDefs) {
    if (terrainHeight(x, z) < -1.2) {
      const boat = createBoat({ scale });
      boat.position.set(x, WATER_Y - 0.28, z);
      boat.rotation.y = rot;
      root.add(boat);
    }
  }

  for (const [x, z, kind] of [
    [-430, 40, 'willow'], [-416, 112, 'willow'], [-392, 196, 'pine'],
    [-356, 40, 'willow'], [-370, 110, 'broad'], [-350, 210, 'willow'],
    [-260, 660, 'broad'], [-200, 700, 'broad'], [-170, 760, 'pine'],
  ]) {
    const h = terrainHeight(x, z);
    if (h < 0.8) continue;
    const t = kind === 'willow'
      ? createWillow({ height: 7 + rnd() * 3, spread: 2.6, seed: x + z })
      : createTree({ height: 8 + rnd() * 4, spread: 2.8 + rnd(), kind, seed: x - z });
    t.position.set(x, h, z);
    root.add(t);
  }

  addXingyinDetails(root);
  addMoshanDetails(root);
  addTingtaoDetails(root);
  addGreenwayDetails(root);
  addCherryDetails(root);
  addWaterDetails(root);

  for (const [px, pz, ry, seed] of [
    [-440, -600, 0.2, 7101], [-460, -340, 1.3, 7102],
    [-430, -146, 0.7, 7103], [-450, 8, 2.2, 7104],
    [-386, 62, 1.1, 7105], [-352, 152, 2.6, 7106],
    [-346, 216, 0.4, 7107], [-432, 328, -0.6, 7108],
    [-416, 386, 1.6, 7109], [-488, 482, 2.9, 7110],
  ]) {
    const gy = Math.max(0.7, terrainHeight(px, pz));
    addPerson(root, px, pz, gy, ry, seed, seed % 2 ? [mats.blue, mats.white] : [mats.redLacquer, mats.teal]);
  }
  addFisher(root, -407, 18, Math.max(0.6, terrainHeight(-407, 18)) + 0.04, Math.PI / 2, 7201);
  addFisher(root, 334, -48, Math.max(0.6, terrainHeight(334, -48)) + 0.04, -Math.PI / 2, 7202);
  addFisher(root, 96, 126, Math.max(0.6, terrainHeight(96, 126)) + 0.04, -Math.PI / 2, 7203);
  const shrubs = [];
  for (const [px, pz, seed] of [
    [-394, 46, 7301], [-426, 104, 7302], [-360, 188, 7303],
    [-330, 92, 7304], [-300, 700, 7305], [-350, 810, 7306],
    [492, -156, 7307], [548, -98, 7308], [620, -150, 7309],
  ]) {
    const gy = terrainHeight(px, pz);
    if (gy < 0.8) continue;
    addShrub(shrubs, px, pz, gy, seed, 1.4, 6);
  }
  const shrubMesh = mergedMesh(shrubs, mats.blade, true, true);
  if (shrubMesh) root.add(shrubMesh);

  const extras = new THREE.Group();
  const wake = createWakes(boatDefs);
  if (wake) extras.add(wake);
  extras.add(createInstancedForest(forestDefs));
  const life = createLakeLife();
  extras.add(life);
  extras.userData.life = life;

  const rockSpots = [
    [468, -120, 2.2], [486, -150, 1.8], [-430, 20, 1.8], [-360, 22, 1.6],
    [-410, 64, 1.8], [520, -110, 2.0], [-390, 250, 1.8], [600, -260, 2.0],
    [-398, 16, 1.5], [-366, 42, 1.5], [572, -146, 1.7], [624, -78, 1.9],
    [-326, 214, 1.6], [432, 122, 1.6], [118, 142, 1.5], [-208, 278, 1.5],
  ];
  for (const [x, z, s] of rockSpots) {
    const rock = createRock();
    rock.scale.setScalar(s);
    rock.position.set(x, Math.max(0.3, terrainHeight(x, z)), z);
    root.add(rock);
  }

  return { group: mergeStaticGroup(root), extras, waterMaterial };
}
