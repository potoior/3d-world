import * as THREE from 'three';
import { mats } from './materials.js';
import { addBox, addBar, addCylinder, mergedMesh } from './geometry.js';
import { createFanPavilion, createWillow } from './gardenDetails.js';
import { createHexPavilion } from './gardenBuild.js';
import { terrainHeight } from './terrain.js';
import {
  addRailLine,
  addBench,
  addLamp,
  addPlaque,
  addReeds,
  addShoreRocks,
  addLotusBed,
  addPetalCarpet,
  addLatticePanel,
  addPlankRun,
  addBollard,
  addColumnBase,
  addLanternString,
  addPerson,
  addFisher,
  addShrub,
  addMarker,
  hash,
} from './detailKit.js';

const Q = [
  [-353, 86], [-347, 106], [-342, 128], [-340, 150],
  [-339, 172], [-340, 192], [-345, 212], [-350, 222],
];

export function addTingtaoDetails(root) {
  const stone = [];
  const rail = [];
  const gold = [];
  const lantern = [];
  const wood = [];
  const reed = [];
  const rock = [];
  const petal = [];
  const deck = [];
  const cap = [];
  const paper = [];
  const shrub = [];
  const R = Q.map(([x, z]) => [x + 1.05, z]);

  for (let i = 0; i < Q.length - 1; i++) {
    const [x0, z0] = Q[i];
    const [x1, z1] = Q[i + 1];
    const y0 = Math.max(0.35, terrainHeight(x0, z0));
    const y1 = Math.max(0.35, terrainHeight(x1, z1));
    addBar(stone, x0, z0, x1, z1, (y0 + y1) / 2 + 0.28, 0.72, 1.9);
    addBar(stone, x0, z0, x1, z1, (y0 + y1) / 2 + 0.66, 0.12, 3.3);
  }

  addRailLine(rail, gold, lantern, R, { step: 2.8, side: 1, offset: 0, lampEvery: 6, lampOffset: 1.6, lampScale: 0.92 });

  const benches = [
    [-344, 100, Math.PI / 2], [-342, 144, Math.PI / 2],
    [-342, 184, Math.PI / 2], [-347, 207, Math.PI / 2],
  ];
  for (const [x, z, ry] of benches) addBench(wood, x, z, ry, Math.max(0.5, terrainHeight(x, z) + 0.05));

  const p1 = createHexPavilion({
    radius: 3.2, wallH: 2.7, roofH: 3.1, baseH: 0.8,
    name: '听涛水榭', x: -347, z: 122, rot: 0.35,
  });
  p1.position.y = terrainHeight(-347, 122) + 0.02;
  p1.traverse((o) => {
    if (o.isMesh && o.material === mats.roof) o.material = mats.roofGreen;
  });
  root.add(p1);

  const p1s = [];
  const p1g = [];
  const p1p = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    addColumnBase(p1s, Math.cos(a) * 3.2, 0.8, Math.sin(a) * 3.2, 0.26);
  }
  for (let i = 1; i < 6; i++) {
    const a0 = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const a1 = ((i + 1) / 6) * Math.PI * 2 + Math.PI / 6;
    const x0 = Math.cos(a0) * 3.2;
    const z0 = Math.sin(a0) * 3.2;
    const x1 = Math.cos(a1) * 3.2;
    const z1 = Math.sin(a1) * 3.2;
    const len = Math.hypot(x1 - x0, z1 - z0);
    for (let k = 1; k < 7; k++) {
      const t = k / 7;
      addBox(p1g, 0.045, 0.72, 0.045, x0 + (x1 - x0) * t, 1.28, z0 + (z1 - z0) * t);
    }
    addBox(p1g, 0.09, 0.09, len, (x0 + x1) / 2, 1.7, (z0 + z1) / 2, Math.atan2(x1 - x0, z1 - z0));
  }
  addLatticePanel(p1, 0, 2.0, 3.16, 3.6, 1.9, 0);
  addLatticePanel(p1, -2.74, 2.0, -1.58, 3.2, 1.8, -Math.PI / 3);
  addLatticePanel(p1, 2.74, 2.0, -1.58, 3.2, 1.8, Math.PI / 3);
  for (const [lx, lz] of [[2.2, 2.2], [-2.2, 2.2], [3.0, 0], [-3.0, 0]]) {
    addCylinder(p1g, 0.025, 0.025, 0.42, 4, lx, 3.16, lz);
    const b = new THREE.SphereGeometry(0.16, 7, 5);
    b.scale(0.9, 1.2, 0.9);
    b.translate(lx, 2.9, lz);
    p1p.push(b);
  }
  const p1sm = mergedMesh(p1s, mats.stone, true, true);
  if (p1sm) p1.add(p1sm);
  const p1gm = mergedMesh(p1g, mats.gold, true, true);
  if (p1gm) p1.add(p1gm);
  const p1pm = mergedMesh(p1p, mats.paper, true, false);
  if (p1pm) p1.add(p1pm);

  const p2 = createFanPavilion({
    radius: 3.5, wallH: 2.8, roofH: 2.7, baseH: 0.55,
    name: '荷风亭', x: -343, z: 204, rot: -Math.PI / 2,
  });
  p2.position.y = terrainHeight(-343, 204) + 0.02;
  p2.traverse((o) => {
    if (o.isMesh && o.material === mats.roof) o.material = mats.roofGreen;
  });
  root.add(p2);

  const p2g = [];
  for (let i = 0; i <= 4; i++) {
    const a = (i / 4) * Math.PI;
    const px = Math.cos(a) * 3.8 - 343;
    const pz = Math.sin(a) * 3.8 + 204;
    addColumnBase(stone, px, Math.max(0.35, terrainHeight(px, pz)) + 0.55, pz, 0.26);
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI;
    const x = Math.cos(a) * 3.8 - 343;
    const z = Math.sin(a) * 3.8 + 204;
    addCylinder(p2g, 0.025, 0.025, 0.42, 4, x, terrainHeight(-343, 204) + 3.12, z);
    const b = new THREE.SphereGeometry(0.16, 7, 5);
    b.scale(0.9, 1.2, 0.9);
    b.translate(x, terrainHeight(-343, 204) + 2.86, z);
    lantern.push(b);
  }
  addPlaque(root, '荷风亭', 2.2, 0.62, -343, terrainHeight(-343, 204) + 2.9, 207.6, 0);
  const p2gm = mergedMesh(p2g, mats.gold, true, true);
  if (p2gm) root.add(p2gm);

  addBox(stone, 0.26, 2.4, 0.26, -344, Math.max(0.5, terrainHeight(-344, 94)) + 1.2, 94);
  addBox(stone, 0.26, 2.4, 0.26, -344, Math.max(0.5, terrainHeight(-344, 94)) + 1.2, 97.2);
  addPlaque(root, '听涛', 2.5, 0.7, -343.86, Math.max(0.5, terrainHeight(-344, 95.5)) + 2.05, 95.6, Math.PI / 2);

  for (const [x, z, s] of [
    [-350, 96, 2200], [-347, 132, 2300], [-345, 164, 2400],
    [-346, 198, 2500], [-352, 217, 2600],
  ]) {
    const h = terrainHeight(x, z);
    if (h < 0.35) continue;
    const w = createWillow({ height: 7 + (s % 3), spread: 2.7, seed: s });
    w.position.set(x, h, z);
    w.rotation.y = s;
    root.add(w);
  }

  for (const [x, z, s] of [
    [-335, 104, 3100], [-333, 136, 3200], [-333, 170, 3300],
    [-335, 198, 3400], [-339, 218, 3500],
  ]) {
    addReeds(reed, x, z, s, 14, 1.7);
    addShoreRocks(rock, x, z, s + 5, 4, 4.2, 0.95);
  }

  addLotusBed(root, -324, 118, 7.2, 28, 4101);
  addLotusBed(root, -320, 158, 6.4, 24, 4102);
  addLotusBed(root, -326, 190, 5.6, 22, 4103);
  addLotusBed(root, -315, 138, 4.8, 18, 4104);

  addPetalCarpet(petal, -340, 150, 18, 90, 4200, 'water');
  addPetalCarpet(petal, -345, 185, 15, 60, 4201, 'ground');

  for (let i = 0; i < Q.length - 1; i++) {
    const [x0, z0] = Q[i];
    const [x1, z1] = Q[i + 1];
    const len = Math.hypot(x1 - x0, z1 - z0);
    const gy = Math.max(0.4, (terrainHeight(x0, z0) + terrainHeight(x1, z1)) / 2 + 0.74);
    addPlankRun(deck, x0 + 1.05, z0, x1 + 1.05, z1, gy, 2.5, Math.max(5, Math.round(len / 0.95)), 0.08);
    for (let k = 0; k < 2; k++) {
      const t = k / 1;
      const px = x0 + (x1 - x0) * t + 1.05;
      const pz = z0 + (z1 - z0) * t;
      const by = Math.max(0.4, terrainHeight(px, pz) + 0.5);
      addBollard(deck, cap, px - 1.65, pz, by, 0.72);
      addBollard(deck, cap, px + 1.65, pz, by, 0.72);
    }
    if (i % 2 === 0) {
      addLamp(gold, lantern, x0 - 1.4, z0 + 3, Math.max(0.4, terrainHeight(x0 - 1.4, z0 + 3)), 0.78);
    }
  }
  addLanternString(cap, paper, -351.9, 86, -338.9, 190, Math.max(0.5, terrainHeight(-345, 140)) + 4.4, 10, 0.55);
  addLanternString(cap, paper, -338.9, 190, -349, 222, Math.max(0.5, terrainHeight(-344, 206)) + 4.2, 5, 0.45);

  for (const [x, z, s] of [
    [-331, 94, 3601], [-330, 130, 3602], [-329, 164, 3603], [-332, 198, 3604],
    [-337, 226, 3605], [-344, 244, 3606], [-349, 74, 3607],
  ]) {
    addReeds(reed, x, z, s, 16, 1.9);
    addShoreRocks(rock, x, z, s + 5, 5, 4.8, 1.0);
  }
  addLotusBed(root, -326, 100, 5.4, 22, 4301);
  addLotusBed(root, -322, 142, 6.0, 24, 4302);
  addLotusBed(root, -319, 176, 5.2, 20, 4303);
  addLotusBed(root, -330, 214, 5.0, 18, 4304);
  addMarker(root, -345, 80, '听涛', 0.1);
  addMarker(root, -341, 232, '荷风', -0.2);
  addPlaque(root, '碧潭观鱼', 2.0, 0.56, -338.8, Math.max(0.5, terrainHeight(-338, 152)) + 2.9, 152, -Math.PI / 2);
  for (let i = 0; i < 12; i++) {
    const z = 88 + i * 12;
    addShrub(shrub, -349 + (i % 2) * 2, z, Math.max(0.35, terrainHeight(-348, z)), 4700 + i, 1.0, 4);
  }
  addFisher(root, -337, 112, Math.max(0.35, terrainHeight(-337, 112)) + 0.06, Math.PI / 2, 4801);
  addFisher(root, -336, 174, Math.max(0.35, terrainHeight(-336, 174)) + 0.06, Math.PI / 2, 4802);
  addPerson(root, -343, 116, Math.max(0.5, terrainHeight(-343, 116)), 0.1, 4803);
  addPerson(root, -342, 160, Math.max(0.5, terrainHeight(-342, 160)), 3.0, 4804, [mats.blue, mats.white]);
  addPerson(root, -346, 196, Math.max(0.5, terrainHeight(-346, 196)), -0.2, 4805, [mats.redLacquer, mats.teal]);

  const stones = mergedMesh(stone, mats.marbleShade, true, true);
  if (stones) root.add(stones);
  const rails = mergedMesh(rail, mats.wallDark, true, true);
  if (rails) root.add(rails);
  const golds = mergedMesh(gold, mats.gold, true, true);
  if (golds) root.add(golds);
  const lamps = mergedMesh(lantern, mats.lantern, true, false);
  if (lamps) root.add(lamps);
  const woods = mergedMesh(wood, mats.wood, true, true);
  if (woods) root.add(woods);
  const reeds = mergedMesh(reed, mats.reed, false, true);
  if (reeds) root.add(reeds);
  const rocks = mergedMesh(rock, mats.rock, true, true);
  if (rocks) root.add(rocks);
  const petals = mergedMesh(petal, mats.cherryLight, false, true);
  if (petals) root.add(petals);
  const decks = mergedMesh(deck, mats.plank, true, true);
  if (decks) root.add(decks);
  const caps = mergedMesh(cap, mats.gold, true, false);
  if (caps) root.add(caps);
  const papers = mergedMesh(paper, mats.paper, true, false);
  if (papers) root.add(papers);
  const shrubs = mergedMesh(shrub, mats.blade, true, true);
  if (shrubs) root.add(shrubs);
}
