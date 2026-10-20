import * as THREE from 'three';
import { createBamboo, createWillow, createBanana, createLotus } from './gardenDetails.js';
import { createTree } from './props.js';
import {
  createTaihuRock,
  createFloweringShrub,
  createPottedPlant,
  createBench,
  createStoneLantern,
  createHangingLantern,
  createWell,
  createReedPatch,
  createGroundcover,
  createFallenPetals,
  createVineRunner,
  createSteppingStones,
} from './richProps.js';
import {
  createFeatureWall,
  createGateway,
  createCornerPier,
  createRidgePair,
  createDougong,
} from './richArch.js';

export const RICH_COLLIDERS = [
  { type: 'box', x: 83, z: 70, w: 16.6, d: 1.1, name: '东园花窗墙' },
  { type: 'box', x: 72, z: 55, w: 1.1, d: 19.0, name: '东园花窗墙' },
  { type: 'box', x: 56.1, z: 68, w: 4.8, d: 1.1, name: '东园月洞门' },
  { type: 'box', x: 63.9, z: 68, w: 4.8, d: 1.1, name: '东园月洞门' },
  { type: 'box', x: -80, z: 42, w: 1.1, d: 15.2, name: '西园花窗墙' },
  { type: 'box', x: 41.7, z: 72, w: 0.82, d: 1.0, name: '东园门' },
  { type: 'box', x: 46.3, z: 72, w: 0.82, d: 1.0, name: '东园门' },
  { type: 'box', x: -74.7, z: 28, w: 0.82, d: 1.0, name: '西园门' },
  { type: 'box', x: -69.3, z: 28, w: 0.82, d: 1.0, name: '西园门' },
  { type: 'circle', x: -64, z: 26, r: 2.4, name: '太湖石' },
  { type: 'circle', x: -82, z: -24, r: 2.7, name: '太湖石' },
  { type: 'circle', x: 74, z: 80, r: 2.3, name: '太湖石' },
  { type: 'circle', x: 72, z: 42, r: 2.0, name: '太湖石' },
  { type: 'circle', x: -28, z: 70, r: 2.0, name: '太湖石' },
  { type: 'circle', x: 112, z: 40, r: 2.4, name: '太湖石' },
  { type: 'circle', x: -38, z: 55, r: 1.7, name: '太湖石' },
];

export function createRichStatic() {
  const group = new THREE.Group();
  const add = (g) => group.add(g);

  add(createFeatureWall({
    x: 83, z: 70, rot: 0, length: 16, height: 3.35, thickness: 0.58,
    features: [
      { u: -4.9, r: 1.06, type: 'circle' },
      { u: 0, r: 1.12, type: 'octagon' },
      { u: 4.9, r: 1.06, type: 'fan' },
    ],
  }));
  add(createFeatureWall({
    x: 72, z: 55, rot: Math.PI / 2, length: 18, height: 3.35, thickness: 0.58,
    features: [
      { u: -5.3, r: 1.06, type: 'quatrefoil' },
      { u: 0, r: 1.15, type: 'hex' },
      { u: 5.3, r: 1.06, type: 'diamond' },
    ],
  }));
  add(createFeatureWall({
    x: 60, z: 68, rot: 0, length: 12, height: 3.5, thickness: 0.66,
    features: [{ u: 0, r: 1.52, type: 'circle', open: true }],
  }));
  add(createFeatureWall({
    x: -80, z: 42, rot: Math.PI / 2, length: 14, height: 3.3, thickness: 0.56,
    features: [
      { u: -3.4, r: 1.0, type: 'diamond' },
      { u: 3.4, r: 1.0, type: 'fan' },
    ],
  }));

  add(createGateway({
    x: 44, z: 72, rot: 0, width: 5.2, height: 3.25, name: '别有洞天',
    couplets: ['竹径通幽处', '花影落清池'],
  }));
  add(createGateway({
    x: -72, z: 28, rot: 0, width: 5.0, height: 3.2, name: '入画',
    couplets: ['一径竹阴云满地', '半帘花影月笼纱'],
  }));

  for (const [x, z] of [[74.6, 70], [91.4, 70], [72, 45.6], [72, 64.4], [53.6, 68], [66.4, 68], [-80, 34.6], [-80, 49.4]]) {
    add(createCornerPier({ x, z, size: 0.84, height: 3.45 }));
  }

  add(createRidgePair({ x: -6, y: 8.62, z: 53, rot: 0, ridgeHalf: 3.02, scale: 1.05 }));
  add(createRidgePair({ x: -65, y: 8.82, z: 61, rot: Math.PI / 2, ridgeHalf: 2.48, scale: 1.0 }));
  add(createRidgePair({ x: -31, y: 7.48, z: 54, rot: 0, ridgeHalf: 1.51, scale: 0.95 }));
  add(createRidgePair({ x: -55, y: 13.95, z: 20, rot: 0, ridgeHalf: 0.8, scale: 0.85 }));
  add(createRidgePair({ x: -21, y: 5.3, z: 64, rot: Math.PI / 2, ridgeHalf: 3.05, scale: 0.95 }));
  add(createRidgePair({ x: 98, y: 7.48, z: 78, rot: 0, ridgeHalf: 1.1, scale: 0.92 }));
  add(createRidgePair({ x: 19, y: 6.58, z: 27, rot: -Math.PI / 2, ridgeHalf: 0.55, scale: 0.82 }));

  add(createDougong({ x: -6, y: 4.12, z: 61.1, rot: 0, width: 20, bays: 8 }));
  add(createDougong({ x: -55, y: 4.9, z: 26.4, rot: 0, width: 11, bays: 5 }));
  add(createDougong({ x: -31, y: 3.96, z: 57.2, rot: 0, width: 9, bays: 5 }));
  add(createDougong({ x: -21, y: 3.18, z: 66.2, rot: Math.PI / 2, width: 12, bays: 7 }));
  add(createDougong({ x: -21, y: 3.18, z: 61.8, rot: Math.PI / 2, width: 12, bays: 7 }));
  add(createDougong({ x: -54.5, y: 4.62, z: 61, rot: Math.PI / 2, width: 16, bays: 7 }));
  add(createDougong({ x: 98, y: 3.84, z: 83.6, rot: 0, width: 10, bays: 5 }));
  add(createDougong({ x: 103.4, y: 3.46, z: 64, rot: -Math.PI / 2, width: 8, bays: 4 }));

  const corridorLanterns = [-34, -24, -14, -4, 12, 20];
  for (const x of corridorLanterns) add(createHangingLantern({ x, y: 2.76, z: 64, scale: 0.92 }));
  for (const x of [-12, -6, 0]) add(createHangingLantern({ x, y: 4.12, z: 60.7, scale: 1.05 }));
  for (const a of [0.2, 2.3, 4.4]) {
    add(createHangingLantern({
      x: -27 + Math.cos(a) * 4.45,
      y: 3.42,
      z: 40 + Math.sin(a) * 4.45,
      scale: 0.9,
    }));
  }
  add(createHangingLantern({ x: -35, y: 3.92, z: 57.2, scale: 0.95 }));
  add(createHangingLantern({ x: -27, y: 3.92, z: 57.2, scale: 0.95 }));
  add(createHangingLantern({ x: -58, y: 4.76, z: 26.2, scale: 1.0 }));
  add(createHangingLantern({ x: -52, y: 4.76, z: 26.2, scale: 1.0 }));

  for (const [x, z, s] of [
    [-6, 60.4, 1.0], [-2, 62, 0.9], [-34, 61, 1.0], [-35, 59, 0.9],
    [-57, 27, 1.05], [22, 53, 0.9], [88, 44, 1.0], [96, 64, 0.95],
    [60, 70, 1.0], [-30, 44, 0.9],
  ]) add(createStoneLantern({ x, z, scale: s }));

  for (const [x, z, rot, len] of [
    [-2, 61, 0, 2.4], [-12, 61, 0, 2.4], [-34, 61, 0, 2.2],
    [14, 52, Math.PI / 2, 2.2], [-58, 28, 0, 2.2], [84, 44, 0, 2.4],
    [94, 64, Math.PI / 2, 2.2], [64, 74, 0, 2.4], [-30, 44, Math.PI / 2, 2.0],
    [-24, 66, 0, 2.2],
  ]) add(createBench({ x, z, rot, length: len }));

  add(createWell({ x: 85, z: 33, scale: 0.92 }));
  add(createWell({ x: -84, z: 32, scale: 0.96 }));
  add(createWell({ x: -58, z: 68, scale: 0.86 }));

  const pots = [
    [-14, 60, 1.0, true], [-12, 60.8, 0.85, false], [-8, 60.8, 1.05, false],
    [-4, 60.8, 0.9, true], [0, 60.8, 1.0, false], [-30, 62, 0.95, false],
    [-18, 62, 0.85, true], [-10, 62, 0.9, false], [0, 62, 1.0, false],
    [12, 66, 0.9, true], [20, 68, 1.0, false], [-40, 62, 0.95, false],
    [-42, 58, 0.85, true], [-60, 26, 1.05, true], [-54, 40, 0.9, false],
    [-58, 44, 0.95, true], [-58, 15, 0.9, false], [-30, 43, 0.75, true],
    [-24, 43, 0.72, false], [80, 70, 1.0, true], [88, 70, 0.9, false],
    [96, 72, 1.0, true], [104, 68, 0.9, false], [92, 44, 0.95, true],
    [84, 40, 0.85, false], [112, 60, 1.0, true], [100, 60, 0.9, false],
  ];
  pots.forEach(([x, z, s, pine], i) => add(createPottedPlant({ x, z, scale: s, seed: i + 3, pine })));

  const shrubs = [
    [16, 57], [-28, 57], [-50, 62], [-74, 40], [58, 54], [76, 50],
    [90, 58], [110, 56], [-84, 22], [24, 60], [-44, 52], [66, 72],
    [96, 44], [-4, 68], [-36, 68], [28, 58], [72, 52], [-14, 62],
  ];
  shrubs.forEach(([x, z], i) => add(createFloweringShrub({ x, z, radius: 1.35 + (i % 3) * 0.35, height: 1.5 + (i % 2) * 0.4, seed: i + 11 })));

  add(createTaihuRock({ x: -64, z: 26, scale: 1.35, seed: 3, spread: 1.05 }));
  add(createTaihuRock({ x: -82, z: -24, scale: 1.55, seed: 7, cave: true, spread: 1.25 }));
  add(createTaihuRock({ x: 74, z: 80, scale: 1.3, seed: 9, cave: true, spread: 1.1 }));
  add(createTaihuRock({ x: -38, z: 55, scale: 1.1, seed: 13, spread: 0.95 }));
  add(createTaihuRock({ x: 72, z: 42, scale: 1.15, seed: 17, spread: 0.9 }));
  add(createTaihuRock({ x: -28, z: 70, scale: 1.1, seed: 21, spread: 0.95 }));
  add(createTaihuRock({ x: 112, z: 40, scale: 1.35, seed: 25, spread: 1.0 }));
  add(createTaihuRock({ x: -25, z: 44, scale: 0.75, seed: 29, spread: 0.7 }));
  add(createTaihuRock({ x: 6, z: 44, scale: 0.8, seed: 31, spread: 0.7 }));

  for (const [x, z, r, c, s] of [
    [-27, 47, 3.0, 10, 32], [-27, 33, 3.0, 10, 34], [-55, 34, 2.5, 9, 36],
    [-48, 27, 2.8, 10, 38], [0, 45, 4.0, 14, 40], [8, 41, 4.0, 14, 42],
    [-35, 42, 3.0, 10, 44], [18, 40, 3.0, 10, 46], [10, 38, 3.0, 10, 48],
  ]) add(createLotus({ x, z, radius: r, count: c, seed: s }));

  for (const [x, z, r, c, s] of [
    [-45, 31, 1.15, 18, 51], [12, 34, 1.0, 15, 53], [-12, 45, 1.2, 20, 55],
    [23, 44, 0.95, 14, 57], [-50, 28, 1.0, 15, 59], [6, 48, 1.1, 17, 61],
    [16, 42, 1.05, 16, 63], [-58, 34, 0.9, 13, 65], [-35, 50, 1.0, 15, 67],
  ]) add(createReedPatch({ x, z, radius: r, count: c, seed: s }));

  const bamboos = [
    [-68, 32], [-78, 14], [74, 34], [82, 62], [94, 50],
    [-88, 52], [-42, 70], [14, 66], [-14, 72], [104, 72],
  ];
  bamboos.forEach(([x, z], i) => add(createBamboo({ height: 7.2 + (i % 3) * 0.5, radius: 2.1 + (i % 2) * 0.4, seed: i + 71 })));

  const willows = [[-36, 62], [-44, 46], [-16, 70], [-62, 38], [36, 28], [-24, 66], [-62, 42], [56, 64], [-14, 62]];
  willows.forEach(([x, z], i) => {
    const t = createWillow({ height: 7.3 + (i % 3) * 0.7, spread: 2.4, seed: i + 101 });
    t.position.set(x, 0, z);
    add(t);
  });

  const bananas = [[16, 60], [-34, 58], [-58, 34], [82, 52], [92, 38], [-70, 36], [64, 66], [104, 42]];
  bananas.forEach(([x, z], i) => {
    const b = createBanana({ height: 3.1 + (i % 2) * 0.5, seed: i + 121 });
    b.position.set(x, 0, z);
    add(b);
  });

  const pines = [[-62, 14], [-68, 22], [78, 18], [96, 28], [70, 62]];
  pines.forEach(([x, z], i) => {
    const t = createTree({ height: 6.2 + (i % 3) * 0.7, spread: 2.4, kind: 'pine', seed: i + 141 });
    t.position.set(x, 0, z);
    add(t);
  });

  const covers = [
    [-2, 58], [8, 56], [-18, 62], [-30, 60], [-40, 62], [-52, 58],
    [-60, 50], [-66, 34], [14, 52], [26, 52], [40, 54], [56, 56],
    [68, 52], [76, 46], [86, 40], [94, 36], [104, 42], [112, 50],
    [70, 68], [80, 66], [-48, 48], [-28, 50], [6, 54], [20, 50],
    [-28, 66], [50, 70], [108, 66], [-70, 46],
  ];
  covers.forEach(([x, z], i) => add(createGroundcover({ x, z, radius: 1.4 + (i % 3) * 0.4, count: 10 + (i % 4) * 2, seed: i + 161 })));

  for (const [x, z, r, c, s] of [
    [18, 56, 4.5, 40, 181], [-27, 58, 4.0, 34, 183], [60, 60, 4.0, 32, 185],
    [-6, 66, 5.0, 44, 187], [88, 56, 4.5, 38, 189], [-52, 44, 3.5, 30, 191],
    [80, 38, 3.5, 30, 193], [34, 58, 4.0, 34, 195],
  ]) add(createFallenPetals({ x, z, radius: r, count: c, seed: s, leaves: true }));

  for (const [x, z, len, axis, s] of [
    [83, 70, 14, 'x', 201], [72, 55, 16, 'z', 203], [60, 68, 10, 'x', 205],
    [119.5, 20, 12, 'z', 207], [119.5, 62, 12, 'z', 209], [40, -81.6, 12, 'x', 211],
    [70, -81.6, 12, 'x', 213], [-80, 42, 12, 'z', 215],
  ]) add(createVineRunner({ x, z, length: len, height: axis === 'z' ? 3.3 : 3.35, axis, seed: s }));

  add(createSteppingStones({ points: [[72, 50], [74, 48], [76, 46], [78, 44], [80, 42]] }));
  add(createSteppingStones({ points: [[-47, 57], [-45, 55], [-43, 53], [-41, 51]] }));
  add(createSteppingStones({ points: [[94, 52], [96, 50], [98, 48], [100, 46]] }));

  return group;
}
