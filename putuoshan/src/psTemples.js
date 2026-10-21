import * as THREE from 'three';
import { mats } from './putuoshanTextures.js';
import { box, cyl } from './psUtil.js';
import { createHall, createGate, createCorridor, createPavilion, createBridge, createPond } from './psHall.js';
import { createPagoda, createIncenseBurner, createLion } from './psProps.js';

function lowWalls(group, runs, h = 3.4, mat = mats.wall) {
  for (const [x, z, w, d] of runs) {
    box(group, mat, w, h, d, x, h * 0.5, z);
    box(group, mats.roofGray, w + 0.6, 0.24, d + 0.6, x, h + 0.12, z);
  }
}

export function createPujiTemple() {
  const g = new THREE.Group();
  g.name = 'puji-temple';

  g.add(createPond({ x: 0, z: 82, w: 94, d: 34, y: 0.18 }));
  for (const x of [-32, 0, 32]) {
    const b = createBridge({ width: 6.4, span: 42, rise: 2.3 });
    b.position.set(x, 0.1, 82);
    g.add(b);
  }

  const gate = createGate({ w: 30, d: 14, wallH: 6.6, roofH: 5.4, name: '天王殿' });
  gate.position.set(0, 0, 37);
  g.add(gate);

  for (const sx of [-1, 1]) {
    const lion = createLion(1.0);
    lion.position.set(sx * 13, 0, 51);
    lion.rotation.y = sx > 0 ? -0.18 : 0.18;
    g.add(lion);
  }

  const main = createHall({
    w: 46,
    d: 28,
    wallH: 9.2,
    roofH: 8.4,
    baseH: 1.5,
    name: '大圆通殿',
    roofMat: mats.roofYellow,
    bays: 7,
    doubleEave: true,
    beasts: true,
    platformExtra: 7,
  });
  main.position.set(0, 0, -25);
  g.add(main);

  const rear = createHall({
    w: 36,
    d: 20,
    wallH: 10.2,
    roofH: 6.4,
    baseH: 1.3,
    name: '藏经楼',
    roofMat: mats.roofGray,
    bays: 5,
    platformExtra: 5,
  });
  rear.position.set(0, 0, -75);
  g.add(rear);

  for (const sx of [-1, 1]) {
    const side = createHall({
      w: 13,
      d: 24,
      wallH: 6.4,
      roofH: 4.4,
      baseH: 0.9,
      name: sx < 0 ? '文殊殿' : '普贤殿',
      roofMat: mats.roofGreen,
      bays: 3,
      platformExtra: 4,
    });
    side.position.set(sx * 72, 0, -22);
    side.rotation.y = sx > 0 ? -Math.PI * 0.5 : Math.PI * 0.5;
    g.add(side);

    const corridor = createCorridor({ length: 64, width: 6.2, wallH: 4.2, roofH: 3.2, bays: 11 });
    corridor.position.set(sx * 55, 0, 2);
    corridor.rotation.y = Math.PI * 0.5;
    g.add(corridor);

    const pav = createPavilion({ size: 8.4, wallH: 4.8, roofH: 3.6, name: '御碑亭', roofMat: mats.roofGray });
    pav.position.set(sx * 55, 0, 66);
    g.add(pav);
  }

  const pagoda = createPagoda({ tiers: 5, radius: 5.6, height: 3.0, name: '多宝塔' });
  pagoda.position.set(62, 0, 48);
  g.add(pagoda);

  const burner = createIncenseBurner(2.2);
  burner.position.set(0, 0, 10);
  g.add(burner);

  lowWalls(g, [
    [-96, 8, 1.2, 120],
    [96, 8, 1.2, 120],
    [-52, -96, 88, 1.2],
    [52, -96, 88, 1.2],
  ], 3.2);

  const smoke = [new THREE.Vector3(0, 10.5, 10)];
  return { group: g, smoke, burner };
}

export function createFayuTemple() {
  const g = new THREE.Group();
  g.name = 'fayu-temple';

  box(g, mats.stone, 106, 9.4, 98, 0, 4.7, -5);
  box(g, mats.stoneDark, 107, 0.35, 99, 0, 9.42, -5);
  box(g, mats.stoneLight, 104, 0.18, 96, 0, 9.6, -5);
  for (let i = 0; i < 12; i++) {
    const h = 1.1 + i * 0.72;
    box(g, mats.stone, 17 - i * 0.2, h, 1.5, 0, h * 0.5, 45 + (12 - i) * 1.25);
    box(g, mats.stoneDark, 17.4 - i * 0.2, 0.1, 1.5, 0, h + 0.04, 45 + (12 - i) * 1.25);
  }
  for (const sx of [-1, 1]) {
    box(g, mats.stoneLight, 0.9, 1.2, 94, sx * 52.5, 10.0, -5);
  }

  const gate = createGate({ w: 27, d: 13, wallH: 6.2, roofH: 5.0, name: '法雨禅寺' });
  gate.position.set(0, 9.4, 45);
  g.add(gate);

  const hall1 = createHall({
    w: 30,
    d: 16,
    wallH: 7.0,
    roofH: 5.4,
    baseH: 1.2,
    name: '天王殿',
    roofMat: mats.roofGray,
    bays: 5,
    platformExtra: 5,
  });
  hall1.position.set(0, 9.4, 18);
  g.add(hall1);

  const hall2 = createHall({
    w: 33,
    d: 19,
    wallH: 8.0,
    roofH: 6.0,
    baseH: 1.3,
    name: '玉佛殿',
    roofMat: mats.roofGreen,
    bays: 5,
    platformExtra: 5,
  });
  hall2.position.set(0, 9.4, -17);
  g.add(hall2);

  const main = createHall({
    w: 40,
    d: 25,
    wallH: 9.0,
    roofH: 7.6,
    baseH: 1.5,
    name: '九龙殿',
    roofMat: mats.roofYellow,
    bays: 7,
    doubleEave: true,
    beasts: true,
    platformExtra: 6,
  });
  main.position.set(0, 9.4, -54);
  g.add(main);

  for (const sx of [-1, 1]) {
    const side = createHall({
      w: 11,
      d: 20,
      wallH: 5.8,
      roofH: 4.0,
      baseH: 0.8,
      name: sx < 0 ? '钟楼' : '鼓楼',
      roofMat: mats.roofGray,
      bays: 3,
      platformExtra: 3,
    });
    side.position.set(sx * 40, 9.4, -18);
    side.rotation.y = sx > 0 ? -Math.PI * 0.5 : Math.PI * 0.5;
    g.add(side);

    const corridor = createCorridor({ length: 46, width: 5.8, wallH: 3.8, roofH: 3.0, bays: 9 });
    corridor.position.set(sx * 30, 9.4, 8);
    corridor.rotation.y = Math.PI * 0.5;
    g.add(corridor);

    box(g, mats.wall, 1.1, 2.8, 84, sx * 49, 10.8, -14);
    box(g, mats.roofGray, 1.7, 0.26, 84, sx * 49, 12.3, -14);
  }

  const screen = new THREE.Group();
  box(screen, mats.stoneDark, 24, 0.7, 3.2, 0, 0.35, 0);
  box(screen, mats.wallDeep, 22, 6.2, 1.2, 0, 3.8, 0);
  box(screen, mats.roofGray, 24, 0.5, 3.0, 0, 7.05, 0);
  for (let i = 0; i < 5; i++) {
    const x = -8 + i * 4;
    box(screen, mats.gold, 2.2, 2.0, 0.12, x, 4.1, 0.66);
    box(screen, mats.wallDeep, 1.2, 1.2, 0.1, x, 4.1, 0.74);
  }
  screen.position.set(0, 9.4, 60);
  g.add(screen);

  const burner = createIncenseBurner(1.7);
  burner.position.set(0, 9.4, 0);
  g.add(burner);

  return { group: g, smoke: [new THREE.Vector3(0, 18.8, 0)], burner };
}

export function createHuijiTemple() {
  const g = new THREE.Group();
  g.name = 'huiji-temple';

  box(g, mats.stone, 86, 0.9, 60, 0, 0.45, 0);
  const gate = createGate({ w: 20, d: 10, wallH: 5.2, roofH: 4.2, name: '慧济禅寺' });
  gate.position.set(0, 0.9, 22);
  g.add(gate);

  const hall = createHall({
    w: 26,
    d: 16,
    wallH: 6.6,
    roofH: 5.2,
    baseH: 1.0,
    name: '大雄宝殿',
    roofMat: mats.roofYellow,
    bays: 5,
    platformExtra: 4,
  });
  hall.position.set(0, 0.9, -6);
  g.add(hall);

  const side = createHall({
    w: 9,
    d: 13,
    wallH: 4.4,
    roofH: 3.2,
    baseH: 0.7,
    name: '观音殿',
    roofMat: mats.roofGreen,
    bays: 3,
    platformExtra: 2,
  });
  side.position.set(-25, 0.9, -5);
  side.rotation.y = Math.PI * 0.5;
  g.add(side);

  for (const sx of [-1, 1]) {
    box(g, mats.wall, 1.0, 2.2, 38, sx * 32, 2.0, -3);
    box(g, mats.roofGray, 1.5, 0.22, 38, sx * 32, 3.2, -3);
  }
  const burner = createIncenseBurner(1.1);
  burner.position.set(0, 0.9, 9);
  g.add(burner);
  return { group: g, smoke: [new THREE.Vector3(0, 7.0, 9)], burner };
}
