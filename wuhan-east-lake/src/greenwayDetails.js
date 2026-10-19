import * as THREE from 'three';
import { mats } from './materials.js';
import { addBox, addCylinder, mergedMesh } from './geometry.js';
import { terrainHeight } from './terrain.js';
import {
  addBench,
  addLamp,
  addMarker,
  addBannerPole,
  addFootBridge,
  addTreeLine,
  addPlaque,
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
  [-354, 244, '5 km'],
];

export function addGreenwayDetails(root) {
  const wood = [];
  const gold = [];
  const lantern = [];
  const red = [];

  for (const [x, z, text] of MARKERS) {
    let mx = x - 3.9;
    if (terrainHeight(mx, z) < 0.7) mx = x + 3.9;
    addMarker(root, mx, z, text, Math.PI / 2);
  }

  const signY = Math.max(0.6, terrainHeight(-447, 16));
  addBox(gold, 0.2, 2.5, 0.2, -447, signY + 1.25, 16);
  addPlaque(root, '环湖绿道', 2.8, 0.78, -446.86, signY + 2.1, 16, Math.PI / 2);

  const lamps = [
    [-444, -500], [-530, -300], [-444, -110], [-454, -20],
    [-380, 66], [-352, 148], [-352, 226], [-432, 326],
    [-400, 392], [-470, 468], [-585, 536],
  ];
  for (const [x, z] of lamps) addLamp(gold, lantern, x, z, Math.max(0.6, terrainHeight(x, z)), 1.05);

  const benchSpots = [
    [-458, -430, 0.2], [-512, -370, 0.9], [-440, -220, 1.6],
    [-456, -60, 0.1], [-376, 36, 0.7], [-360, 134, 1.5],
    [-344, 212, 2.2], [-432, 324, 0.4], [-420, 392, 0.8],
    [-492, 490, 1.2],
  ];
  for (const [x, z, ry] of benchSpots) addBench(wood, x, z, ry, Math.max(0.65, terrainHeight(x, z) + 0.05));

  for (const [x, z] of [[-450, 14], [-388, 56], [-346, 206], [-430, 332]]) {
    addBannerPole(gold, red, x, z, Math.max(0.6, terrainHeight(x, z)), 5.6);
  }

  addFootBridge(root, -409, 385, 0.85, 10, 3.0);
  addFootBridge(root, -522, 500, -1.1, 12, 3.1);
  addFootBridge(root, -532, -300, -0.45, 9, 2.9);

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
}
