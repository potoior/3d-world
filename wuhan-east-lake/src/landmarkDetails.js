import * as THREE from 'three';
import { mats } from './materials.js';
import { addBox, addCylinder, mergedMesh, createBalustrade } from './geometry.js';
import { createTree, createRock } from './props.js';
import { createWillow, createBamboo } from './gardenDetails.js';
import { createHexPavilion } from './gardenBuild.js';
import { createGreenway } from './landmarks.js';
import { terrainHeight, WATER_Y, lakeField } from './terrain.js';
import {
  addBench,
  addLamp,
  addPlaque,
  addBannerPole,
  addShoreRocks,
  addLotusBed,
  addPetalCarpet,
  addCherryTree,
  hash,
} from './detailKit.js';

export function addXingyinDetails(root) {
  const x = -382;
  const z = -8;
  const baseY = terrainHeight(x, z) - 0.2;
  const g = new THREE.Group();
  const red = [];
  const gold = [];
  const lantern = [];
  const stone = [];
  const tiers = [
    { w: 14, y: 3.2, h: 5.0 },
    { w: 10, y: 9.4, h: 3.8 },
    { w: 6.8, y: 14.6, h: 3.0 },
  ];
  for (let ti = 0; ti < tiers.length; ti++) {
    const t = tiers[ti];
    const by = t.y + t.h - 0.42;
    addBox(stone, t.w + 2.7, 0.18, t.w + 2.7, 0, by, 0);
    const half = (t.w + 2.7) / 2;
    const n = Math.max(4, Math.round(t.w / 1.1));
    for (const sz of [-1, 1]) {
      for (let i = 0; i <= n; i++) {
        const px = -half + (i * half * 2) / n;
        addBox(red, 0.11, 0.95, 0.11, px, by + 0.5, sz * half);
        addBox(red, 0.08, 0.08, half * 2, 0, by + 1.02, sz * half);
        addBox(red, 0.07, 0.07, half * 2, 0, by + 0.55, sz * half);
      }
    }
    for (const sx of [-1, 1]) {
      for (let i = 1; i < n; i++) {
        const pz = -half + (i * half * 2) / n;
        addBox(red, 0.11, 0.95, 0.11, sx * half, by + 0.5, pz);
      }
      addBox(red, 0.08, 0.08, half * 2, sx * half, by + 1.02, 0);
    }
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const r = t.w / 2 + 0.9;
      addBox(gold, 0.42, 0.34, 0.42, Math.cos(a) * r, t.y + t.h - 1.0, Math.sin(a) * r);
    }
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const lx = sx * (t.w / 2 + 0.55);
        const lz = sz * (t.w / 2 + 0.55);
        const b = new THREE.SphereGeometry(0.3, 8, 6);
        b.scale(0.9, 1.2, 0.9);
        b.translate(lx, t.y + t.h - 1.5, lz);
        lantern.push(b);
        addCylinder(gold, 0.19, 0.23, 0.12, 6, lx, t.y + t.h - 1.18, lz);
        addCylinder(gold, 0.04, 0.05, 0.5, 5, lx, t.y + t.h - 1.95, lz);
      }
    }
  }
  addPlaque(g, '行吟阁', 3.4, 0.95, 0, 10.9, -7.55, Math.PI);
  addPlaque(g, '行吟阁', 3.2, 0.9, 7.55, 10.9, 0, Math.PI / 2);
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.TorusGeometry(0.3 - i * 0.05, 0.05, 6, 12);
    ring.rotateX(Math.PI / 2);
    ring.translate(0, 21.6 + i * 0.22, 0);
    gold.push(ring);
  }
  const gourd = new THREE.SphereGeometry(0.26, 8, 6);
  gourd.scale(0.8, 1.35, 0.8);
  gourd.translate(0, 22.5, 0);
  gold.push(gourd);

  const rm = mergedMesh(red, mats.redLacquer, true, true);
  if (rm) g.add(rm);
  const gm = mergedMesh(gold, mats.gold, true, false);
  if (gm) g.add(gm);
  const lm = mergedMesh(lantern, mats.lantern, true, false);
  if (lm) g.add(lm);
  const sm = mergedMesh(stone, mats.marbleShade, true, true);
  if (sm) g.add(sm);
  g.position.set(x, baseY, z);
  root.add(g);

  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.2;
    const rr = 21 + (i % 3) * 2.2;
    const px = x + Math.cos(a) * rr;
    const pz = z + Math.sin(a) * rr;
    const h = terrainHeight(px, pz);
    if (h < 0.5) continue;
    const w = createWillow({ height: 6.4 + (i % 3), spread: 2.4, seed: 4000 + i });
    w.position.set(px, h, pz);
    w.rotation.y = a;
    root.add(w);
  }
  const rock = [];
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + 0.35;
    const rr = 23 + hash(4300, i) * 6;
    addShoreRocks(rock, x + Math.cos(a) * rr, z + Math.sin(a) * rr, 4300 + i, 2, 2.2, 0.85);
  }
  const rocks = mergedMesh(rock, mats.rock, true, true);
  if (rocks) root.add(rocks);

  const wood = [];
  const dl = [];
  addBox(wood, 0.18, 1.0, 0.18, -380, WATER_Y + 0.9, 6.6);
  addBox(wood, 0.18, 1.0, 0.18, -370, WATER_Y + 0.9, 6.6);
  addBox(wood, 0.18, 1.0, 0.18, -360, WATER_Y + 0.9, 6.4);
  addBox(wood, 24, 0.1, 0.1, -370, WATER_Y + 1.35, 6.6);
  for (const [px, pz] of [[-379, 5], [-355, 2.5], [-368, 8]]) {
    addCylinder(wood, 0.14, 0.18, 0.7, 6, px, WATER_Y + 0.5, pz);
  }
  addCylinder(dl, 0.06, 0.08, 1.7, 6, -379, WATER_Y + 1.55, 5);
  addBox(dl, 0.32, 0.4, 0.32, -379, WATER_Y + 2.3, 5);
  addCylinder(dl, 0.06, 0.08, 1.7, 6, -355, WATER_Y + 1.55, 2.5);
  addBox(dl, 0.32, 0.4, 0.32, -355, WATER_Y + 2.3, 2.5);
  const dWood = mergedMesh(wood, mats.wood, true, true);
  if (dWood) root.add(dWood);
  const dLamp = mergedMesh(dl, mats.lantern, true, false);
  if (dLamp) root.add(dLamp);
}

export function addMoshanDetails(root) {
  const x = 600;
  const z = -110;
  const baseY = terrainHeight(x, z);
  const deckTop = baseY + 6.8;
  const stone = [];
  const gold = [];
  const red = [];
  const lantern = [];

  const ring = createBalustrade({ w: 27, d: 27, gapFront: 7 });
  ring.position.set(x, baseY + 6.35, z);
  ring.rotation.y = -Math.PI / 2;
  root.add(ring);

  addBox(stone, 22, 0.62, 12, x, deckTop - 0.31, -139);
  addBox(stone, 9, 0.5, 7, x, deckTop - 0.3, -128);
  for (const [px, pz] of [[591, -144], [609, -144], [591, -133], [609, -133]]) {
    const ty = terrainHeight(px, pz);
    const h = Math.max(1, deckTop - ty - 0.6);
    addBox(stone, 1.1, h, 1.1, px, ty + h / 2, pz);
  }
  const deckBal = createBalustrade({ w: 22, d: 12, gapFront: 8 });
  deckBal.position.set(x, deckTop, -139);
  root.add(deckBal);
  addBox(gold, 0.22, 1.4, 0.22, 609, deckTop + 0.7, -144);
  const tube = new THREE.CylinderGeometry(0.12, 0.18, 1.8, 8);
  tube.rotateX(0.5);
  tube.translate(609, deckTop + 1.65, -144);
  gold.push(tube);
  addCylinder(gold, 0.32, 0.36, 0.14, 10, 609, deckTop + 1.45, -144);

  for (const [px, pz] of [[586, -121], [614, -121], [586, -99], [614, -99]]) {
    addBannerPole(gold, red, px, pz, baseY + 6.4, 6.8);
  }
  for (const [px, pz] of [[458, -152], [478, -127]]) {
    addBannerPole(gold, red, px, pz, terrainHeight(px, pz), 5.4);
  }

  for (let i = 0; i < 90; i++) {
    const a = hash(8100, i) * Math.PI * 2;
    const rr = 38 + Math.sqrt(hash(8100, i + 3)) * 130;
    const px = x + Math.cos(a) * rr;
    const pz = z + Math.sin(a) * rr * 1.05;
    const h = terrainHeight(px, pz);
    if (h < 3 || h > 112 || lakeField(px, pz) < 5) continue;
    if (px > 570 && px < 630 && pz > -152 && pz < -82) continue;
    if (px > 500 && px < 620 && pz > -165 && pz < -85) continue;
    const t = createTree({ height: 9 + hash(8100, i + 7) * 7, spread: 2.8 + hash(8100, i + 11) * 1.8, kind: 'pine', seed: 8100 + i });
    t.position.set(px, h - 0.15, pz);
    t.rotation.y = hash(8100, i + 13) * 6.28;
    root.add(t);
  }

  const rocks = [];
  for (let i = 0; i < 22; i++) {
    const a = hash(8200, i) * Math.PI * 2;
    const rr = 28 + Math.sqrt(hash(8200, i + 5)) * 42;
    const px = x + Math.cos(a) * rr;
    const pz = z + Math.sin(a) * rr;
    const ty = terrainHeight(px, pz);
    if (ty < 2) continue;
    const r = createRock();
    const s = 1.1 + hash(8200, i + 9) * 2.2;
    r.scale.setScalar(s);
    r.position.set(px, ty, pz);
    r.rotation.y = a;
    rocks.push(r);
  }
  for (const r of rocks) root.add(r);

  addLotusBed(root, 530, -184, 6, 20, 8301);
  addLotusBed(root, 490, -170, 4.5, 16, 8302);

  const sm = mergedMesh(stone, mats.marbleShade, true, true);
  if (sm) root.add(sm);
  const gm = mergedMesh(gold, mats.gold, true, true);
  if (gm) root.add(gm);
  const rm = mergedMesh(red, mats.redLacquer, true, true);
  if (rm) root.add(rm);
  const lm = mergedMesh(lantern, mats.lantern, true, false);
  if (lm) root.add(lm);
}

export function addCherryDetails(root) {
  const clusters = [
    [-322, 738, 74, 55], [-382, 700, 52, 40], [-262, 792, 58, 43],
    [-398, 776, 45, 36], [-248, 690, 38, 30],
  ];
  for (let i = 0; i < 42; i++) {
    const c = clusters[i % clusters.length];
    for (let tries = 0; tries < 4; tries++) {
      const a = hash(9200, i * 5 + tries) * Math.PI * 2;
      const r = Math.sqrt(hash(9200, i * 7 + tries));
      const x = c[0] + Math.cos(a) * c[2] * r;
      const z = c[1] + Math.sin(a) * c[3] * r;
      const h = terrainHeight(x, z);
      if (h < 1.4 || lakeField(x, z) < 10) continue;
      if (Math.hypot(x + 322, z - 738) < 11) continue;
      const tree = addCherryTree(9200 + i, 6.2 + hash(9200, i + 3) * 4.4, 2.6 + hash(9200, i + 6) * 1.8);
      tree.position.set(x, h - 0.1, z);
      tree.rotation.y = hash(9200, i + 9) * 6.28;
      root.add(tree);
      break;
    }
  }

  const gold = [];
  const lantern = [];
  const wood = [];
  const lanternSpots = [
    [-400, 688], [-356, 682], [-310, 718], [-276, 760],
    [-268, 808], [-306, 836], [-358, 816], [-402, 760], [-318, 744],
  ];
  for (const [x, z] of lanternSpots) addLamp(gold, lantern, x, z, Math.max(0.8, terrainHeight(x, z)), 0.86);

  for (const [x, z, ry] of [
    [-396, 700, 0.4], [-350, 690, 1.1], [-282, 748, 2.0],
    [-282, 806, 2.7], [-335, 830, -0.5], [-394, 776, 0.9],
  ]) addBench(wood, x, z, ry, Math.max(0.8, terrainHeight(x, z) + 0.05));

  const pav = createHexPavilion({
    radius: 3.1, wallH: 2.6, roofH: 3.0, baseH: 0.7,
    name: '樱亭', x: -286, z: 706, rot: 0.7,
  });
  pav.position.y = terrainHeight(-286, 706) + 0.02;
  pav.traverse((o) => {
    if (o.isMesh && o.material === mats.roof) o.material = mats.roofGreen;
  });
  root.add(pav);

  root.add(createGreenway({
    points: [[-432, 700], [-404, 664], [-368, 646], [-330, 652], [-300, 676]],
    width: 2.4, safe: 0.12, rails: false, lamps: false, benches: false,
  }));

  for (let i = 0; i < 7; i++) {
    const x = -418 + hash(9300, i) * 150;
    const z = 664 + hash(9300, i + 4) * 150;
    const h = terrainHeight(x, z);
    if (h < 2) continue;
    const b = createBamboo({ height: 6 + hash(9300, i + 8) * 3, radius: 1.4, seed: 9300 + i });
    b.position.set(x, h, z);
    root.add(b);
  }

  const petal = [];
  addPetalCarpet(petal, -322, 738, 82, 260, 9400, 'path');
  addPetalCarpet(petal, -368, 790, 40, 110, 9401, 'path');
  addPetalCarpet(petal, -286, 706, 18, 60, 9402, 'ground');

  const gmesh = mergedMesh(gold, mats.gold, true, true);
  if (gmesh) root.add(gmesh);
  const lmesh = mergedMesh(lantern, mats.lantern, true, false);
  if (lmesh) root.add(lmesh);
  const wmesh = mergedMesh(wood, mats.wood, true, true);
  if (wmesh) root.add(wmesh);
  const pmesh = mergedMesh(petal, mats.cherryLight, false, true);
  if (pmesh) root.add(pmesh);
}
