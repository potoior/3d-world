import * as THREE from 'three';
import { mats } from './materials.js';
import { addBox, addBar, mergedMesh } from './geometry.js';
import { createFanPavilion, createWillow } from './gardenDetails.js';
import { createHexPavilion } from './gardenBuild.js';
import { terrainHeight } from './terrain.js';
import {
  addRailLine,
  addBench,
  addPlaque,
  addReeds,
  addShoreRocks,
  addLotusBed,
  addPetalCarpet,
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

  const p2 = createFanPavilion({
    radius: 3.5, wallH: 2.8, roofH: 2.7, baseH: 0.55,
    name: '荷风亭', x: -343, z: 204, rot: -Math.PI / 2,
  });
  p2.position.y = terrainHeight(-343, 204) + 0.02;
  p2.traverse((o) => {
    if (o.isMesh && o.material === mats.roof) o.material = mats.roofGreen;
  });
  root.add(p2);

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
}
