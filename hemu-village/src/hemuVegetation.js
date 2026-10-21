import * as THREE from 'three';
import {
  rand, smoothstep, addRod, mergeGeo, mergedMesh,
} from './hemuCore.js';
import { terrainHeight, distanceToRiver } from './hemuTerrain.js';

/* ------------------------- tree geometries ------------------------- */

function buildSpruce(seed) {
  const trunk = [];
  const dark = [];
  const light = [];
  const height = 12.4;
  const t = new THREE.CylinderGeometry(0.11, 0.4, height * 0.78, 8);
  t.translate(0, height * 0.39, 0);
  trunk.push(t);
  for (let i = 0; i < 13; i++) {
    const f = i / 12;
    const r = Math.max(0.28, 2.9 * (1 - f * 0.86));
    const cone = new THREE.ConeGeometry(r, 2.15, 8, 1, true);
    cone.rotateY(rand(seed + 3, i) * 6.28);
    cone.translate((rand(seed + 5, i) - 0.5) * 0.35, 3.0 + f * 8.3, (rand(seed + 7, i) - 0.5) * 0.35);
    (i % 2 ? light : dark).push(cone);
  }
  for (let i = 0; i < 22; i++) {
    const a = rand(seed + 11, i) * 6.28;
    const y = 4.0 + rand(seed + 13, i) * 7.6;
    const len = 1.3 + rand(seed + 17, i) * 1.25;
    const cone = new THREE.ConeGeometry(0.36, len, 5, 1, true);
    cone.rotateZ(1.18 + rand(seed + 19, i) * 0.22);
    cone.rotateY(a);
    const rr = 0.8 + rand(seed + 23, i) * 1.45;
    cone.translate(Math.cos(a) * rr, y, Math.sin(a) * rr);
    (i % 3 === 0 ? light : dark).push(cone);
  }
  return [
    { key: 'trunk', geo: mergeGeo(trunk) },
    { key: 'spruceDark', geo: mergeGeo(dark), tint: 0x2d5238 },
    { key: 'spruceLight', geo: mergeGeo(light), tint: 0x46714a },
  ];
}

function buildLarch(seed) {
  const trunk = [];
  const gold = [];
  const copper = [];
  const height = 13.2;
  const t = new THREE.CylinderGeometry(0.09, 0.33, height * 0.8, 7);
  t.translate(0, height * 0.4, 0);
  trunk.push(t);
  for (let i = 0; i < 11; i++) {
    const f = i / 10;
    const r = Math.max(0.24, 2.45 * (1 - f * 0.82) * (0.88 + 0.12 * Math.sin(i * 2.0)));
    const cone = new THREE.ConeGeometry(r, 2.0, 7, 1, true);
    cone.rotateY(rand(seed + 31, i) * 6.28);
    cone.translate((rand(seed + 33, i) - 0.5) * 0.42, 3.2 + f * 8.4, (rand(seed + 37, i) - 0.5) * 0.42);
    (i % 2 ? copper : gold).push(cone);
  }
  for (let i = 0; i < 18; i++) {
    const a = rand(seed + 41, i) * 6.28;
    const y = 4.3 + rand(seed + 43, i) * 7.1;
    const len = 1.2 + rand(seed + 47, i) * 1.2;
    const cone = new THREE.ConeGeometry(0.32, len, 5, 1, true);
    cone.rotateZ(1.28 + rand(seed + 53, i) * 0.24);
    cone.rotateY(a);
    const rr = 0.8 + rand(seed + 59, i) * 1.4;
    cone.translate(Math.cos(a) * rr, y, Math.sin(a) * rr);
    (i % 3 === 0 ? copper : gold).push(cone);
  }
  return [
    { key: 'trunk', geo: mergeGeo(trunk) },
    { key: 'larchGold', geo: mergeGeo(gold), tint: 0xd39a35 },
    { key: 'larchCopper', geo: mergeGeo(copper), tint: 0xe1b34a },
  ];
}

function buildBirch(seed) {
  const bark = [];
  const branches = [];
  const gold = [];
  const olive = [];
  const height = 10.2;
  const t = new THREE.CylinderGeometry(0.07, 0.23, height * 0.74, 8);
  t.translate(0, height * 0.37, 0);
  bark.push(t);
  for (let i = 0; i < 13; i++) {
    const r = 0.07 + rand(seed + 61, i) * 0.075;
    const band = new THREE.CylinderGeometry(r, r, 0.055, 8);
    band.translate(0, 1.0 + rand(seed + 63, i) * 6.2, 0);
    branches.push(band);
  }
  for (let i = 0; i < 8; i++) {
    const a = rand(seed + 67, i) * 6.28;
    const y = 3.1 + rand(seed + 71, i) * 3.8;
    const len = 1.7 + rand(seed + 73, i) * 1.5;
    addRod(branches, 0, y, 0, Math.cos(a) * len * 0.8, y + len * 0.56, Math.sin(a) * len * 0.8, 0.05, 0.015, 5);
  }
  for (let i = 0; i < 30; i++) {
    const a = rand(seed + 79, i) * 6.28;
    const rr = 0.5 + rand(seed + 83, i) * 2.25;
    const y = 4.6 + rand(seed + 89, i) * 4.5;
    const leaf = new THREE.IcosahedronGeometry(0.5 + rand(seed + 97, i) * 0.52, 0);
    leaf.scale(1.18, 0.78, 1.08);
    leaf.rotateY(rand(seed + 101, i) * 6.28);
    leaf.translate(Math.cos(a) * rr, y, Math.sin(a) * rr);
    (i % 3 === 0 ? olive : gold).push(leaf);
  }
  return [
    { key: 'birchBark', geo: mergeGeo(bark) },
    { key: 'birchGold', geo: mergeGeo(gold), tint: 0xd5ad42 },
    { key: 'birchOlive', geo: mergeGeo(olive), tint: 0xba9738 },
  ];
}

/* --------------------------- forest --------------------------- */

const CLUSTERS = [
  { type: 'birch', cx: -122, cz: -10, rx: 96, rz: 180, count: 170 },
  { type: 'birch', cx: -58, cz: 112, rx: 40, rz: 86, count: 55 },
  { type: 'birch', cx: 44, cz: -184, rx: 58, rz: 44, count: 30 },
  { type: 'larch', cx: -218, cz: 30, rx: 86, rz: 220, count: 90 },
  { type: 'larch', cx: 216, cz: 62, rx: 76, rz: 190, count: 80 },
  { type: 'larch', cx: -72, cz: 292, rx: 106, rz: 76, count: 50 },
  { type: 'larch', cx: 78, cz: -248, rx: 88, rz: 66, count: 40 },
  { type: 'spruce', cx: -312, cz: 16, rx: 92, rz: 262, count: 90 },
  { type: 'spruce', cx: 318, cz: 40, rx: 92, rz: 250, count: 90 },
  { type: 'spruce', cx: -126, cz: 352, rx: 130, rz: 100, count: 50 },
  { type: 'spruce', cx: 162, cz: 352, rx: 130, rz: 90, count: 40 },
  { type: 'spruce', cx: -334, cz: -190, rx: 82, rz: 112, count: 25 },
  { type: 'spruce', cx: 342, cz: -170, rx: 82, rz: 112, count: 25 },
];

function excluded(x, z) {
  if (distanceToRiver(x, z) < 14) return true;
  if (x > 24 && x < 176 && z > -156 && z < 216) return true;
  const dx = (x + 168) / 74;
  const dz = (z + 30) / 94;
  if (dx * dx + dz * dz < 1) return true;
  if (x < -100 && x > -205 && z > 155 && z < 230) return true;
  return false;
}

function makeTrees() {
  const trees = [];
  let seed = 1200;
  for (const cluster of CLUSTERS) {
    let tries = 0;
    let made = 0;
    while (made < cluster.count && tries < cluster.count * 7) {
      tries++;
      seed++;
      const a = rand(seed, tries) * Math.PI * 2;
      const d = Math.sqrt(rand(seed + 3, tries));
      const x = cluster.cx + Math.cos(a) * d * cluster.rx;
      const z = cluster.cz + Math.sin(a) * d * cluster.rz;
      if (excluded(x, z)) continue;
      const s = cluster.type === 'birch'
        ? 0.78 + rand(seed + 7, tries) * 0.52
        : cluster.type === 'larch'
          ? 0.84 + rand(seed + 7, tries) * 0.5
          : 0.82 + rand(seed + 7, tries) * 0.55;
      trees.push({
        type: cluster.type,
        variant: (made + Math.floor(rand(seed + 9, tries) * 2)) % 2,
        x, z, s,
        rot: rand(seed + 11, tries) * 6.28,
        y: terrainHeight(x, z) - 0.3,
      });
      made++;
    }
  }
  return trees;
}

export function createForest(M) {
  const trees = makeTrees();
  const archetypes = {
    spruce: [buildSpruce(101), buildSpruce(202)],
    larch: [buildLarch(301), buildLarch(402)],
    birch: [buildBirch(501), buildBirch(602)],
  };
  const groups = new Map();
  for (const tree of trees) {
    const key = tree.type + '-' + tree.variant;
    if (!groups.has(key)) groups.set(key, { type: tree.type, variant: tree.variant, trees: [] });
    groups.get(key).trees.push(tree);
  }
  const root = new THREE.Group();
  root.name = 'hemu-forest';
  const dummy = new THREE.Object3D();
  const tint = new THREE.Color();
  let instanceTotal = 0;
  for (const { type, variant, trees: list } of groups.values()) {
    const parts = archetypes[type][variant];
    for (const part of parts) {
      if (!part.geo) continue;
      const mesh = new THREE.InstancedMesh(part.geo, M[part.key], list.length);
      mesh.castShadow = false;
      mesh.receiveShadow = true;
      mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
      list.forEach((tree, i) => {
        dummy.position.set(tree.x, tree.y, tree.z);
        dummy.rotation.set(0, tree.rot, 0);
        dummy.scale.setScalar(tree.s);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        if (part.tint) {
          tint.setHex(part.tint);
          tint.offsetHSL((rand(tree.x, i) - 0.5) * 0.028, (rand(tree.z, i) - 0.5) * 0.12, (rand(tree.x + tree.z, i) - 0.5) * 0.1);
          mesh.setColorAt(i, tint);
        }
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      root.add(mesh);
      instanceTotal += list.length;
    }
  }
  return { group: root, count: instanceTotal, trees };
}

/* ------------------------ meadow details ------------------------ */

function addBlade(list, x, y, z, h, seed) {
  const g = new THREE.ConeGeometry(0.052, h, 3, 1, true);
  g.rotateZ((rand(seed, 1) - 0.5) * 0.55);
  g.rotateY(rand(seed, 2) * 6.28);
  g.translate(x + (rand(seed, 3) - 0.5) * 0.5, y + h * 0.45, z + (rand(seed, 4) - 0.5) * 0.5);
  list.push(g);
}

export function createMeadowDetails(M) {
  const group = new THREE.Group();
  group.name = 'hemu-meadow-details';
  const grass = [];
  const gold = [];
  const white = [];
  let seed = 3000;
  let placed = 0;
  let tries = 0;
  while (placed < 2450 && tries < 14000) {
    tries++;
    seed++;
    const x = -290 + rand(seed, 1) * 570;
    const z = -290 + rand(seed, 2) * 640;
    if (distanceToRiver(x, z) < 13) continue;
    if (x > 26 && x < 172 && z > -154 && z < 212 && rand(seed, 3) > 0.44) continue;
    const h = terrainHeight(x, z);
    if (h > 24) continue;
    const count = 3 + Math.floor(rand(seed, 4) * 3);
    for (let k = 0; k < count; k++) {
      addBlade(grass, x, h, z, 0.3 + rand(seed, 5 + k) * 0.52, seed + k * 9);
    }
    if (rand(seed, 6) > 0.48) {
      const sh = 0.35 + rand(seed, 7) * 0.3;
      const stem = new THREE.CylinderGeometry(0.018, 0.026, sh, 4);
      stem.translate(x, h + sh * 0.5, z);
      grass.push(stem);
      const head = new THREE.IcosahedronGeometry(0.07 + rand(seed, 8) * 0.055, 0);
      head.scale(1, 0.65, 1);
      head.translate(x, h + sh + 0.03, z);
      (rand(seed, 9) > 0.5 ? gold : white).push(head);
    }
    placed++;
  }
  const gm = mergedMesh(grass, M.grass, false, true);
  if (gm) group.add(gm);
  const fg = mergedMesh(gold, M.flowerGold, false, true);
  if (fg) group.add(fg);
  const fw = mergedMesh(white, M.flowerWhite, false, true);
  if (fw) group.add(fw);
  return group;
}

export function createFallenLeaves(M) {
  const geo = new THREE.PlaneGeometry(0.2, 0.12);
  geo.rotateX(-Math.PI / 2);
  const count = 2200;
  const mesh = new THREE.InstancedMesh(geo, M.leaf, count);
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  let seed = 9000;
  let n = 0;
  let tries = 0;
  while (n < count && tries < 9000) {
    tries++;
    seed++;
    const x = -235 + rand(seed, 1) * 250;
    const z = -250 + rand(seed, 2) * 460;
    if (distanceToRiver(x, z) < 14) continue;
    if (x > 26 && x < 168 && z > -150 && z < 208) continue;
    const h = terrainHeight(x, z);
    if (h > 20) continue;
    dummy.position.set(x, h + 0.06 + rand(seed, 3) * 0.035, z);
    dummy.rotation.set(0, rand(seed, 4) * 6.28, 0);
    dummy.scale.setScalar(0.65 + rand(seed, 5) * 0.9);
    dummy.updateMatrix();
    mesh.setMatrixAt(n, dummy.matrix);
    color.setHex(rand(seed, 6) > 0.5 ? 0xd6a43b : 0xc0852c);
    color.offsetHSL((rand(seed, 7) - 0.5) * 0.03, 0, (rand(seed, 8) - 0.5) * 0.12);
    mesh.setColorAt(n, color);
    n++;
  }
  mesh.count = n;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  mesh.name = 'hemu-fallen-leaves';
  return mesh;
}
