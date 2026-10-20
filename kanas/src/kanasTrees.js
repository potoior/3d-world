import * as THREE from 'three';
import { mats } from './materials.js';
import { mergedMesh } from './geometry.js';
import { rand } from './kanasTerrain.js';

function addRod(list, ax, ay, az, bx, by, bz, r1, r2 = r1, seg = 5) {
  const dx = bx - ax;
  const dy = by - ay;
  const dz = bz - az;
  const len = Math.hypot(dx, dy, dz);
  if (len < 0.0001) return;
  const g = new THREE.CylinderGeometry(r2, r1, len, seg);
  g.translate(0, len / 2, 0);
  const q = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(dx, dy, dz).normalize()
  );
  g.applyQuaternion(q);
  g.translate(ax, ay, az);
  list.push(g);
}

export function createSpruce({ height = 12, radius = 2.8, seed = 1 } = {}) {
  const group = new THREE.Group();
  const trunk = [];
  const bark = [];
  const dark = [];
  const light = [];
  const trunkH = height * 0.7;
  const t = new THREE.CylinderGeometry(height * 0.015, height * 0.045, trunkH, 8);
  t.translate(0, trunkH * 0.5, 0);
  trunk.push(t);
  for (let i = 0; i < 11; i++) {
    const a = rand(seed + 3, i) * 6.28;
    const g = new THREE.BoxGeometry(0.07, height * 0.075, 0.045);
    g.translate(
      Math.cos(a) * height * 0.028,
      height * (0.1 + i * 0.045),
      Math.sin(a) * height * 0.028
    );
    g.rotateY(a);
    bark.push(g);
  }
  for (let i = 0; i < 9; i++) {
    const f = i / 8;
    const r = Math.max(0.35, radius * (1 - f * 0.83));
    const cone = new THREE.ConeGeometry(r, height * 0.17, 8, 1, true);
    cone.rotateY(rand(seed + 7, i) * 6.28);
    cone.translate(
      (rand(seed + 11, i) - 0.5) * 0.3,
      height * (0.25 + f * 0.7),
      (rand(seed + 13, i) - 0.5) * 0.3
    );
    (i % 2 === 0 ? dark : light).push(cone);
  }
  for (let i = 0; i < 16; i++) {
    const a = rand(seed + 17, i) * 6.28;
    const y = height * (0.38 + rand(seed + 19, i) * 0.54);
    const len = height * 0.1;
    const cone = new THREE.ConeGeometry(radius * 0.11, len, 5, 1, true);
    cone.rotateZ(1.05 + rand(seed + 23, i) * 0.34);
    cone.rotateY(a);
    const rr = radius * (0.32 + rand(seed + 27, i) * 0.3);
    cone.translate(Math.cos(a) * rr, y, Math.sin(a) * rr);
    (i % 3 === 0 ? dark : light).push(cone);
  }
  for (const [list, material] of [
    [trunk, mats.trunk],
    [bark, mats.timberDark],
    [dark, mats.spruce],
    [light, mats.spruceLight],
  ]) {
    const m = mergedMesh(list, material, true, true);
    if (m) group.add(m);
  }
  return group;
}

export function createLarch({ height = 13, radius = 2.4, seed = 1 } = {}) {
  const group = new THREE.Group();
  const trunk = [];
  const bark = [];
  const gold = [];
  const pale = [];
  const trunkH = height * 0.78;
  const t = new THREE.CylinderGeometry(height * 0.012, height * 0.036, trunkH, 7);
  t.translate(0, trunkH * 0.5, 0);
  trunk.push(t);
  for (let i = 0; i < 8; i++) {
    const a = rand(seed + 4, i) * 6.28;
    const g = new THREE.BoxGeometry(0.055, height * 0.07, 0.035);
    g.translate(Math.cos(a) * height * 0.022, height * (0.12 + i * 0.06), Math.sin(a) * height * 0.022);
    bark.push(g);
  }
  for (let i = 0; i < 8; i++) {
    const f = i / 7;
    const r = Math.max(0.28, radius * (1 - f * 0.7) * (0.82 + 0.18 * Math.sin(i * 2.1)));
    const cone = new THREE.ConeGeometry(r, height * 0.16, 7, 1, true);
    cone.rotateY(rand(seed + 8, i) * 6.28);
    cone.translate(
      (rand(seed + 12, i) - 0.5) * 0.4,
      height * (0.3 + f * 0.64),
      (rand(seed + 14, i) - 0.5) * 0.4
    );
    (i % 2 === 0 ? gold : pale).push(cone);
  }
  for (let i = 0; i < 14; i++) {
    const a = rand(seed + 18, i) * 6.28;
    const y = height * (0.44 + rand(seed + 20, i) * 0.46);
    const cone = new THREE.ConeGeometry(radius * 0.09, height * 0.14, 5, 1, true);
    cone.rotateZ(1.35 + rand(seed + 22, i) * 0.3);
    cone.rotateY(a);
    const rr = radius * (0.36 + rand(seed + 24, i) * 0.28);
    cone.translate(Math.cos(a) * rr, y, Math.sin(a) * rr);
    (i % 3 === 0 ? gold : pale).push(cone);
  }
  for (const [list, material] of [
    [trunk, mats.trunk],
    [bark, mats.timberDark],
    [gold, mats.larch],
    [pale, mats.larchLight],
  ]) {
    const m = mergedMesh(list, material, true, true);
    if (m) group.add(m);
  }
  return group;
}

export function createBirch({ height = 10, radius = 1.7, seed = 1 } = {}) {
  const group = new THREE.Group();
  const bark = [];
  const marks = [];
  const leaves = [];
  const branches = [];
  const trunkH = height * 0.72;
  const t = new THREE.CylinderGeometry(height * 0.012, height * 0.026, trunkH, 8);
  t.translate(0, trunkH * 0.5, 0);
  bark.push(t);
  for (let i = 0; i < 13; i++) {
    const r = height * (0.015 + rand(seed + 5, i) * 0.007);
    const band = new THREE.CylinderGeometry(r, r, height * 0.012, 8);
    band.translate(0, height * (0.1 + rand(seed + 7, i) * 0.55), 0);
    marks.push(band);
  }
  for (let i = 0; i < 6; i++) {
    const a = rand(seed + 9, i) * 6.28;
    const y = height * (0.4 + rand(seed + 11, i) * 0.32);
    const len = height * (0.16 + rand(seed + 13, i) * 0.12);
    addRod(branches, 0, y, 0, Math.cos(a) * len * 0.72, y + len * 0.55, Math.sin(a) * len * 0.72, 0.035, 0.018, 5);
  }
  for (let i = 0; i < 20; i++) {
    const a = rand(seed + 15, i) * 6.28;
    const rr = radius * (0.16 + rand(seed + 17, i) * 0.64);
    const y = height * (0.52 + rand(seed + 19, i) * 0.4);
    const leaf = new THREE.IcosahedronGeometry(radius * (0.15 + rand(seed + 21, i) * 0.1), 0);
    leaf.scale(1.15, 0.9, 1.1);
    leaf.rotateY(rand(seed + 23, i) * 6.28);
    leaf.translate(Math.cos(a) * rr, y, Math.sin(a) * rr);
    leaves.push(leaf);
  }
  for (const [list, material] of [
    [bark, mats.birchBark],
    [marks, mats.timberDark],
    [branches, mats.birchBark],
    [leaves, mats.birchLeaf],
  ]) {
    const m = mergedMesh(list, material, true, true);
    if (m) group.add(m);
  }
  return group;
}

export function createForest({ clusters, isExcluded, onTree }) {
  const group = new THREE.Group();
  const positions = [];
  let seed = 40;
  clusters.forEach(([cx, cz, r, count], ci) => {
    for (let i = 0; i < count; i++) {
      seed++;
      const a = rand(seed, i) * Math.PI * 2;
      const d = Math.sqrt(rand(seed + 3, i)) * r;
      const x = cx + Math.cos(a) * d;
      const z = cz + Math.sin(a) * d;
      if (isExcluded(x, z)) continue;
      const roll = rand(seed + 5, i);
      let tree;
      if (roll < 0.56) {
        const height = 8.5 + rand(seed + 7, i) * 8.5;
        tree = createSpruce({ height, radius: height * 0.21, seed: seed * 7 + i });
      } else if (roll < 0.86) {
        const height = 9 + rand(seed + 7, i) * 7.5;
        tree = createLarch({ height, radius: height * 0.18, seed: seed * 7 + i });
      } else {
        const height = 7 + rand(seed + 7, i) * 5.5;
        tree = createBirch({ height, radius: height * 0.15, seed: seed * 7 + i });
      }
      tree.position.set(x, 0, z);
      tree.rotation.y = rand(seed + 11, i) * 6.28;
      group.add(tree);
      positions.push([x, z]);
      if (onTree) onTree(x, z);
    }
  });
  return { group, positions };
}
