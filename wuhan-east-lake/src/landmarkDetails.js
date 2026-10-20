import * as THREE from 'three';
import { mats } from './materials.js';
import { addBox, addBar, addCylinder, mergedMesh, createBalustrade } from './geometry.js';
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
  addLatticePanel,
  addPlankRun,
  addBollard,
  addColumnBase,
  addLanternString,
  addPerson,
  addFisher,
  addShrub,
  addMarker,
  addFootBridge,
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
      const fine = Math.round(t.w / 0.5);
      for (let i = 0; i <= fine; i++) {
        const px = -half + (i * half * 2) / fine;
        addBox(red, 0.045, 0.8, 0.045, px, by + 0.46, sz * half);
      }
    }
    for (const sx of [-1, 1]) {
      for (let i = 1; i < n; i++) {
        const pz = -half + (i * half * 2) / n;
        addBox(red, 0.11, 0.95, 0.11, sx * half, by + 0.5, pz);
      }
      const fine = Math.round(t.w / 0.5);
      for (let i = 0; i <= fine; i++) {
        const pz = -half + (i * half * 2) / fine;
        addBox(red, 0.045, 0.8, 0.045, sx * half, by + 0.46, pz);
      }
      addBox(red, 0.08, 0.08, half * 2, sx * half, by + 1.02, 0);
    }
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const r = t.w / 2 + 0.9;
      addBox(gold, 0.42, 0.34, 0.42, Math.cos(a) * r, t.y + t.h - 1.0, Math.sin(a) * r);
    }
    const eave = t.w / 2 + 1.45;
    for (const sz of [-1, 1]) {
      for (let i = -6; i <= 6; i++) {
        addBox(gold, 0.13, 0.24, 0.42, (i * eave) / 6, t.y + t.h - 0.34, sz * eave);
      }
      addBox(red, t.w + 2.9, 0.13, 0.16, 0, t.y + t.h - 0.13, sz * eave);
    }
    for (const sx of [-1, 1]) {
      for (let i = -5; i <= 5; i++) {
        addBox(gold, 0.42, 0.24, 0.13, sx * eave, t.y + t.h - 0.34, (i * eave) / 5);
      }
      addBox(red, 0.16, 0.13, t.w + 2.9, sx * eave, t.y + t.h - 0.13, 0);
    }
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const bell = new THREE.SphereGeometry(0.16, 7, 5);
      bell.scale(0.9, 1.2, 0.9);
      bell.translate(Math.cos(a) * (t.w / 2 + 0.75), t.y + t.h - 0.68, Math.sin(a) * (t.w / 2 + 0.75));
      gold.push(bell);
    }
    for (let i = 0; i < 2; i++) {
      const ring = new THREE.TorusGeometry(0.34 - i * 0.08, 0.045, 5, 12);
      ring.rotateX(Math.PI / 2);
      ring.translate(0, t.y + t.h + 0.22 + i * 0.18, 0);
      gold.push(ring);
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
  addLatticePanel(g, 0, 6.1, 7.58, 3.2, 2.3, 0);
  addLatticePanel(g, 0, 12.1, 5.58, 2.4, 1.9, 0);
  addLatticePanel(g, -7.58, 6.1, 0, 3.2, 2.3, -Math.PI / 2);
  addPlaque(g, '行吟阁', 3.2, 0.9, 0, 10.9, 7.55, 0);
  addPlaque(g, '行吟阁', 3.0, 0.86, -7.55, 10.9, 0, -Math.PI / 2);
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

  const deck = [];
  const cap = [];
  const paper = [];
  addPlankRun(deck, -380, 4.6, -354, 5.2, WATER_Y + 0.5, 2.7, 20, 0.1);
  for (let i = 0; i < 6; i++) {
    const px = -379 + i * 5;
    const pz = 4.6 + (px + 379) * 0.023;
    addBollard(deck, cap, px, pz + 1.45, WATER_Y + 0.34, 0.8);
    addBollard(deck, cap, px, pz - 1.45, WATER_Y + 0.34, 0.8);
  }
  addLanternString(cap, paper, -378, 6.4, -356, 6.6, WATER_Y + 2.5, 6, 0.42);
  addFisher(root, -373, 3.0, WATER_Y + 0.36, Math.PI / 2, 4401);
  addFisher(root, -359, 6.2, WATER_Y + 0.36, Math.PI / 2, 4402);
  addPerson(root, -386, 1.2, baseY + 3.0, 0.5, 4403);
  addPerson(root, -377, -1.0, baseY + 3.0, -1.4, 4404, [mats.redLacquer, mats.blue]);
  for (const [px, pz, s] of [[-403, 9, 4501], [-394, -27, 4502], [-361, -25, 4503], [-362, 15, 4504], [-407, -7, 4505]]) {
    const h = terrainHeight(px, pz);
    if (h < 0.5) continue;
    const w = createWillow({ height: 6.8 + (s % 3), spread: 2.5, seed: s });
    w.position.set(px, h, pz);
    w.rotation.y = s;
    root.add(w);
  }
  const shrub = [];
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + 0.15;
    const rr = 17 + hash(4600, i) * 5;
    const px = x + Math.cos(a) * rr;
    const pz = z + Math.sin(a) * rr;
    const h = terrainHeight(px, pz);
    if (h < 0.5) continue;
    addShrub(shrub, px, pz, h, 4600 + i, 1.1, 4);
  }
  const dm = mergedMesh(deck, mats.plank, true, true);
  if (dm) root.add(dm);
  const cm2 = mergedMesh(cap, mats.gold, true, false);
  if (cm2) root.add(cm2);
  const pm2 = mergedMesh(paper, mats.paper, true, false);
  if (pm2) root.add(pm2);
  const sm2 = mergedMesh(shrub, mats.blade, true, true);
  if (sm2) root.add(sm2);
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
  const wood = [];
  const paper = [];

  const ring = createBalustrade({ w: 27, d: 27, gapFront: 7 });
  ring.position.set(x, baseY + 6.35, z);
  ring.rotation.y = -Math.PI / 2;
  root.add(ring);
  const lowerRing = createBalustrade({ w: 33, d: 33, gapFront: 9 });
  lowerRing.position.set(x, baseY + 2.95, z);
  root.add(lowerRing);

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
  for (const [px, pz] of [[586, -126], [614, -126], [590, -104], [610, -104], [500, -124], [522, -127], [546, -129], [568, -123]]) {
    addBannerPole(gold, red, px, pz, terrainHeight(px, pz), px > 495 ? 5.0 : 6.2);
  }

  const towerTiers = [
    { w: 17, y: 6.4, h: 5.6, rw: 25 },
    { w: 12.5, y: 12.9, h: 4.4, rw: 19 },
    { w: 9, y: 18.6, h: 3.6, rw: 14.5 },
    { w: 6, y: 23.6, h: 3.0, rw: 11 },
  ];
  for (let ti = 0; ti < towerTiers.length; ti++) {
    const t = towerTiers[ti];
    const w = t.w + 0.6;
    const y = baseY - 0.5 + t.y;
    const nx = Math.max(2, Math.round(w / 4));
    for (let i = 0; i <= nx; i++) {
      const px = x - w / 2 + (i * w) / nx;
      for (const sz of [-1, 1]) addColumnBase(stone, px, y, z + (sz * w) / 2, 0.3);
      for (const sx of [-1, 1]) addColumnBase(stone, x + (sx * w) / 2, y, z - w / 2 + (i * w) / nx, 0.3);
    }
    const ey = baseY - 0.5 + t.y + t.h - 0.34;
    const eave = t.rw / 2 - 1.1;
    for (const sz of [-1, 1]) {
      for (let i = -7; i <= 7; i++) {
        addBox(gold, 0.14, 0.26, 0.44, x + (i * eave) / 7, ey, z + sz * eave);
      }
      addBox(red, t.rw - 2.0, 0.14, 0.2, x, ey + 0.22, z + sz * eave);
    }
    for (const sx of [-1, 1]) {
      for (let i = -6; i <= 6; i++) {
        addBox(gold, 0.44, 0.26, 0.14, x + sx * eave, ey, z + (i * eave) / 6);
      }
      addBox(red, 0.2, 0.14, t.rw - 2.0, x + sx * eave, ey + 0.22, z);
    }
  }

  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    const px = 505 + 80 * t;
    const pz = -120 + 10 * t;
    const gy = terrainHeight(px, pz);
    for (const side of [-1, 1]) {
      const ox = side * -0.124 * 6.2;
      const oz = side * 0.992 * 6.2;
      addBox(stone, 0.42, 1.15, 0.42, px + ox, gy + 0.58, pz + oz);
      if (i % 3 === 0) {
        addLamp(gold, lantern, px + ox * 1.5, pz + oz * 1.5, gy, 0.82);
      }
    }
    if (i < 12) {
      const qx = 505 + 80 * ((i + 1) / 12);
      const qz = -120 + 10 * ((i + 1) / 12);
      for (const side of [-1, 1]) {
        const ox = side * -0.124 * 6.2;
        const oz = side * 0.992 * 6.2;
        addBar(gold, px + ox, pz + oz, qx + ox, qz + oz, (gy + terrainHeight(qx, qz)) / 2 + 1.18, 0.09, 0.09);
      }
    }
  }

  for (const [px, pz, ry] of [[592, -142, 0], [608, -142, Math.PI], [596, -136, 0.7]]) {
    addBench(wood, px, pz, ry, deckTop + 0.02);
  }
  for (const [px, pz] of [[590, -143], [610, -143], [590, -135], [610, -135]]) {
    addLamp(gold, lantern, px, pz, deckTop, 0.74);
  }
  addMarker(root, 589, -119, '磨山', 0);
  addLanternString(gold, paper, 592, -142, 608, -142, deckTop + 2.7, 5, 0.35);
  addPerson(root, 598, -138, deckTop, 2.6, 8501);
  addPerson(root, 605, -141, deckTop, -0.8, 8502, [mats.redLacquer, mats.white]);
  addPerson(root, 512, -125, terrainHeight(512, -125), 0.4, 8503);
  addPerson(root, 548, -128, terrainHeight(548, -128), -0.3, 8504, [mats.blue, mats.teal]);

  for (let i = 0; i < 26; i++) {
    const a = hash(8600, i) * Math.PI * 2;
    const rr = 34 + Math.sqrt(hash(8600, i + 3)) * 70;
    const px = x + Math.cos(a) * rr;
    const pz = z + Math.sin(a) * rr;
    const h = terrainHeight(px, pz);
    if (h < 4 || lakeField(px, pz) < 5) continue;
    if (px > 570 && px < 630 && pz > -152 && pz < -82) continue;
    const t = createTree({ height: 8 + hash(8600, i + 7) * 6, spread: 2.6 + hash(8600, i + 9) * 1.4, kind: i % 4 === 0 ? 'broad' : 'pine', seed: 8600 + i });
    t.position.set(px, h - 0.12, pz);
    t.rotation.y = hash(8600, i + 11) * 6.28;
    root.add(t);
  }
  const outcrop = [];
  for (let i = 0; i < 16; i++) {
    const a = hash(8700, i) * Math.PI * 2;
    const rr = 23 + hash(8700, i + 4) * 18;
    const px = x + Math.cos(a) * rr;
    const pz = z + Math.sin(a) * rr;
    const ty = terrainHeight(px, pz);
    if (ty < 2) continue;
    addShoreRocks(outcrop, px, pz, 8700 + i, 2, 2.0, 0.95);
  }
  const om = mergedMesh(outcrop, mats.rock, true, true);
  if (om) root.add(om);
  const shrubs = [];
  for (let i = 0; i < 22; i++) {
    const a = hash(8800, i) * Math.PI * 2;
    const rr = 20 + hash(8800, i + 6) * 30;
    const px = x + Math.cos(a) * rr;
    const pz = z + Math.sin(a) * rr;
    const ty = terrainHeight(px, pz);
    if (ty < 2) continue;
    addShrub(shrubs, px, pz, ty, 8800 + i, 0.9, 5);
  }
  const shm = mergedMesh(shrubs, mats.blade, true, true);
  if (shm) root.add(shm);

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
  const wm = mergedMesh(wood, mats.plank, true, true);
  if (wm) root.add(wm);
  const pm = mergedMesh(paper, mats.paper, true, false);
  if (pm) root.add(pm);
}

export function addCherryDetails(root) {
  const clusters = [
    [-322, 738, 74, 55], [-382, 700, 52, 40], [-262, 792, 58, 43],
    [-398, 776, 45, 36], [-248, 690, 38, 30], [-370, 744, 30, 26],
    [-300, 760, 34, 28], [-238, 738, 28, 24],
  ];
  for (let i = 0; i < 68; i++) {
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
  const stone = [];
  const paper = [];
  const shrub = [];
  const lanternSpots = [
    [-400, 688], [-356, 682], [-310, 718], [-276, 760],
    [-268, 808], [-306, 836], [-358, 816], [-402, 760], [-318, 744],
    [-422, 710], [-390, 660], [-344, 656], [-302, 684], [-258, 726],
    [-244, 778], [-286, 826], [-336, 846], [-386, 806],
  ];
  for (const [x, z] of lanternSpots) addLamp(gold, lantern, x, z, Math.max(0.8, terrainHeight(x, z)), 0.86);

  for (const [x, z, ry] of [
    [-396, 700, 0.4], [-350, 690, 1.1], [-282, 748, 2.0],
    [-282, 806, 2.7], [-335, 830, -0.5], [-394, 776, 0.9],
    [-412, 726, 0.6], [-366, 668, 1.4], [-318, 702, 2.4],
    [-262, 752, 2.9], [-300, 818, -0.8], [-354, 834, 0.2],
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

  const loop = [
    [-420, 690], [-380, 678], [-342, 700], [-302, 730],
    [-270, 770], [-260, 810], [-300, 842], [-352, 822],
    [-392, 782], [-420, 742],
  ];
  for (let i = 0; i < loop.length - 1; i++) {
    const [x0, z0] = loop[i];
    const [x1, z1] = loop[i + 1];
    const dx = x1 - x0;
    const dz = z1 - z0;
    const len = Math.hypot(dx, dz) || 1;
    const nx = -dz / len;
    const nz = dx / len;
    const n = Math.max(1, Math.round(len / 5));
    for (let k = 0; k < n; k++) {
      const t0 = k / n;
      const t1 = (k + 1) / n;
      for (const side of [-1, 1]) {
        const ax = x0 + dx * t0 + nx * 1.65 * side;
        const az = z0 + dz * t0 + nz * 1.65 * side;
        const bx = x0 + dx * t1 + nx * 1.65 * side;
        const bz = z0 + dz * t1 + nz * 1.65 * side;
        const gy = Math.max(0.7, (terrainHeight(ax, az) + terrainHeight(bx, bz)) / 2 + 0.11);
        addBar(stone, ax, az, bx, bz, gy, 0.17, 0.24);
      }
    }
  }
  addMarker(root, -398, 676, '0.5 km', 0.9);
  addMarker(root, -292, 838, '1 km', 2.2);
  addFootBridge(root, -300, 676, 0.35, 8, 2.7);
  addFootBridge(root, -244, 748, -0.6, 9, 2.8);
  addLanternString(gold, paper, -400, 688, -356, 682, terrainHeight(-378, 685) + 4.2, 7, 0.55);
  addLanternString(gold, paper, -306, 836, -358, 816, terrainHeight(-332, 826) + 4.0, 6, 0.5);
  addLanternString(gold, paper, -268, 808, -276, 760, terrainHeight(-272, 784) + 4.1, 6, 0.5);
  addPerson(root, -360, 700, terrainHeight(-360, 700), 1.1, 9501);
  addPerson(root, -310, 736, terrainHeight(-310, 736), -0.7, 9502, [mats.redLacquer, mats.cherry]);
  addPerson(root, -330, 818, terrainHeight(-330, 818), 2.4, 9503);
  addPerson(root, -282, 792, terrainHeight(-282, 792), -1.9, 9504, [mats.blue, mats.white]);
  addPerson(root, -388, 770, terrainHeight(-388, 770), 0.3, 9505);
  for (const [px, pz] of [[-356, 690], [-320, 742], [-278, 798], [-338, 834]]) {
    addShrub(shrub, px + 2.6, pz + 1.2, terrainHeight(px + 2.6, pz + 1.2), px + pz, 1.0, 4);
  }

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
  addPetalCarpet(petal, -370, 744, 30, 90, 9403, 'path');
  addPetalCarpet(petal, -300, 760, 30, 90, 9404, 'path');
  addPetalCarpet(petal, -238, 738, 22, 60, 9405, 'ground');
  addPetalCarpet(petal, -300, 676, 12, 36, 9406, 'path');

  const gmesh = mergedMesh(gold, mats.gold, true, true);
  if (gmesh) root.add(gmesh);
  const lmesh = mergedMesh(lantern, mats.lantern, true, false);
  if (lmesh) root.add(lmesh);
  const wmesh = mergedMesh(wood, mats.wood, true, true);
  if (wmesh) root.add(wmesh);
  const smesh = mergedMesh(stone, mats.stone, true, true);
  if (smesh) root.add(smesh);
  const pam = mergedMesh(paper, mats.paper, true, false);
  if (pam) root.add(pam);
  const shm = mergedMesh(shrub, mats.blade, true, true);
  if (shm) root.add(shm);
  const pmesh = mergedMesh(petal, mats.cherryLight, false, true);
  if (pmesh) root.add(pmesh);
}
