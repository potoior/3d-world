import * as THREE from 'three';
import { mats } from './materials.js';
import { addBox, addBar, addCylinder, mergedMesh } from './geometry.js';
import { terrainHeight } from './terrain.js';
import {
  addBench,
  addLamp,
  addMarker,
  addBannerPole,
  addFootBridge,
  addTreeLine,
  addPlaque,
  addShrub,
  addPerson,
  addFisher,
  addLanternString,
  hash,
} from './detailKit.js';

const LINE = [
  [-452, -680], [-446, -640], [-454, -600], [-462, -560],
  [-462, -520], [-444, -480], [-450, -440], [-472, -400],
  [-514, -360], [-532, -320], [-544, -280], [-546, -240],
  [-412, -200], [-418, -160], [-444, -120], [-454, -80],
  [-452, -40], [-462, -8], [-450, 22], [-388, 52],
  [-380, 82], [-366, 120], [-348, 160], [-346, 200],
  [-354, 240], [-360, 280], [-440, 310], [-438, 340],
  [-426, 370], [-392, 400], [-436, 440], [-482, 480],
  [-562, 520], [-650, 560],
];

const MARKERS = [
  [-449, -636, '1 km'], [-534, -324, '2 km'],
  [-445, -164, '3 km'], [-380, 86, '4 km'],
  [-354, 244, '5 km'], [-438, 336, '6 km'],
  [-424, 376, '7 km'], [-476, 476, '8 km'],
  [-648, 556, '9 km'],
];

export function addGreenwayDetails(root) {
  const wood = [];
  const gold = [];
  const lantern = [];
  const red = [];
  const stone = [];
  const paper = [];
  const shrub = [];

  for (const [x, z, text] of MARKERS) {
    let mx = x - 3.9;
    if (terrainHeight(mx, z) < 0.7) mx = x + 3.9;
    addMarker(root, mx, z, text, Math.PI / 2);
  }

  for (let i = 0; i < LINE.length - 1; i++) {
    const [x0, z0] = LINE[i];
    const [x1, z1] = LINE[i + 1];
    const dx = x1 - x0;
    const dz = z1 - z0;
    const len = Math.hypot(dx, dz) || 1;
    const nx = -dz / len;
    const nz = dx / len;
    const n = Math.max(1, Math.round(len / 7));
    for (let k = 0; k < n; k++) {
      const t0 = k / n;
      const t1 = (k + 1) / n;
      for (const side of [-1, 1]) {
        const ax = x0 + dx * t0 + nx * 2.7 * side;
        const az = z0 + dz * t0 + nz * 2.7 * side;
        const bx = x0 + dx * t1 + nx * 2.7 * side;
        const bz = z0 + dz * t1 + nz * 2.7 * side;
        const gy = Math.max(0.62, (terrainHeight(ax, az) + terrainHeight(bx, bz)) / 2 + 0.12);
        addBar(stone, ax, az, bx, bz, gy, 0.16, 0.22);
      }
    }
    const mx = (x0 + x1) / 2 + nx * 4.0;
    const mz = (z0 + z1) / 2 + nz * 4.0;
    const mh = terrainHeight(mx, mz);
    if (mh > 0.9 && i % 2 === 0) addShrub(shrub, mx, mz, mh, 6300 + i, 1.1, 5);
  }

  const signY = Math.max(0.6, terrainHeight(-447, 16));
  addBox(gold, 0.2, 2.5, 0.2, -447, signY + 1.25, 16);
  addPlaque(root, '环湖绿道', 2.8, 0.78, -446.86, signY + 2.1, 16, Math.PI / 2);

  const lamps = [
    [-444, -500], [-530, -300], [-444, -110], [-454, -20],
    [-380, 66], [-352, 148], [-352, 226], [-432, 326],
    [-400, 392], [-470, 468], [-585, 536],
    [-450, -660], [-460, -580], [-456, -460], [-522, -352],
    [-420, -180], [-450, -58], [-457, -4], [-386, 44],
    [-368, 104], [-346, 176], [-344, 236], [-358, 272],
    [-436, 344], [-414, 382], [-444, 430], [-500, 492],
    [-602, 546],
  ];
  for (const [x, z] of lamps) addLamp(gold, lantern, x, z, Math.max(0.6, terrainHeight(x, z)), 1.05);

  const benchSpots = [
    [-458, -430, 0.2], [-512, -370, 0.9], [-440, -220, 1.6],
    [-456, -60, 0.1], [-376, 36, 0.7], [-360, 134, 1.5],
    [-344, 212, 2.2], [-432, 324, 0.4], [-420, 392, 0.8],
    [-492, 490, 1.2],
    [-450, -610, 0.5], [-462, -520, 1.4], [-448, -400, 2.0],
    [-528, -300, 2.7], [-414, -140, 0.2], [-452, -36, 1.1],
    [-386, 72, 2.5], [-356, 156, 0.8], [-348, 220, 1.9],
    [-430, 336, 2.8], [-408, 386, 1.3], [-486, 488, 0.6],
  ];
  for (const [x, z, ry] of benchSpots) addBench(wood, x, z, ry, Math.max(0.65, terrainHeight(x, z) + 0.05));

  for (const [x, z] of [[-450, 14], [-388, 56], [-346, 206], [-430, 332]]) {
    addBannerPole(gold, red, x, z, Math.max(0.6, terrainHeight(x, z)), 5.6);
  }

  addFootBridge(root, -409, 385, 0.85, 10, 3.0);
  addFootBridge(root, -522, 500, -1.1, 12, 3.1);
  addFootBridge(root, -532, -300, -0.45, 9, 2.9);
  addFootBridge(root, -458, -470, 0.3, 8, 2.8);
  addFootBridge(root, -350, 252, 1.25, 9, 2.8);
  addFootBridge(root, -438, 416, -0.7, 10, 3.0);
  addLanternString(gold, paper, -444, -500, -530, -300, Math.max(0.7, terrainHeight(-487, -400)) + 4.6, 12, 0.6);
  addLanternString(gold, paper, -380, 66, -352, 148, Math.max(0.7, terrainHeight(-366, 107)) + 4.4, 8, 0.5);
  addPerson(root, -450, -620, Math.max(0.65, terrainHeight(-450, -620)), 0.2, 6401);
  addPerson(root, -527, -310, Math.max(0.65, terrainHeight(-527, -310)), 1.4, 6402, [mats.redLacquer, mats.blue]);
  addPerson(root, -452, -30, Math.max(0.65, terrainHeight(-452, -30)), -0.4, 6403);
  addPerson(root, -368, 96, Math.max(0.65, terrainHeight(-368, 96)), 2.1, 6404, [mats.blue, mats.white]);
  addPerson(root, -346, 220, Math.max(0.65, terrainHeight(-346, 220)), 0.8, 6405);
  addPerson(root, -430, 336, Math.max(0.65, terrainHeight(-430, 336)), -1.2, 6406, [mats.teal, mats.redLacquer]);
  addPerson(root, -476, 470, Math.max(0.65, terrainHeight(-476, 470)), 2.6, 6407);
  addFisher(root, -540, -248, Math.max(0.55, terrainHeight(-540, -248)) + 0.04, -Math.PI / 2, 6501);
  addFisher(root, -384, 56, Math.max(0.55, terrainHeight(-384, 56)) + 0.04, Math.PI / 2, 6502);
  addPlaque(root, '磨山绿道', 3.2, 0.86, -546, Math.max(0.7, terrainHeight(-546, -248)) + 2.4, -248, Math.PI / 2);
  addBox(gold, 0.2, 2.4, 0.2, -545.8, Math.max(0.7, terrainHeight(-546, -248)) + 1.2, -249.2);
  addBox(gold, 0.2, 2.4, 0.2, -545.8, Math.max(0.7, terrainHeight(-546, -248)) + 1.2, -246.8);

  addTreeLine(
    root,
    LINE.slice(11, 26),
    11,
    34,
    6100,
    'broad'
  );
  addTreeLine(
    root,
    LINE.slice(0, 12),
    13,
    28,
    6200,
    'pine'
  );

  const woods = mergedMesh(wood, mats.wood, true, true);
  if (woods) root.add(woods);
  const golds = mergedMesh(gold, mats.gold, true, true);
  if (golds) root.add(golds);
  const lampMesh = mergedMesh(lantern, mats.lantern, true, false);
  if (lampMesh) root.add(lampMesh);
  const reds = mergedMesh(red, mats.redLacquer, true, true);
  if (reds) root.add(reds);
  const stones = mergedMesh(stone, mats.stone, true, true);
  if (stones) root.add(stones);
  const papers = mergedMesh(paper, mats.paper, true, false);
  if (papers) root.add(papers);
  const shrubs = mergedMesh(shrub, mats.blade, true, true);
  if (shrubs) root.add(shrubs);
}
