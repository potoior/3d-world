import * as THREE from 'three';
import { mats, makeWaterMaterial } from './materials.js';
import { createHall, createCorridor } from './buildings.js';
import { createBridge } from './gates.js';
import { addBox, mergedMesh, createBalustrade, createStairs, mergeStaticGroup } from './geometry.js';
import { createTree, createLantern, createIncenseBurner, createVat, createLion } from './props.js';
import { createLingxingGate, createArchway, createStelePavilion, createStele, createCoupletBoard, createTombMound } from './qufuDetail.js';
import { createImperialLife } from './imperialLife.js';

function addPath(group, x, z, w, d, material = mats.marbleShade, y = 0.055) {
  const slab = new THREE.Mesh(new THREE.BoxGeometry(w, 0.11, d), material);
  slab.position.set(x, y, z);
  slab.receiveShadow = true;
  group.add(slab);
  const bands = [];
  for (let p = -d / 2 + 4; p < d / 2 - 2; p += 7.5) {
    addBox(bands, w * 0.94, 0.035, 0.34, x, y + 0.06, z + p);
  }
  const bm = mergedMesh(bands, mats.stone, false, true);
  if (bm) group.add(bm);
}

function addRedWalls(group, runs, height = 6.2) {
  const red = [];
  const caps = [];
  for (const [x, z, w, d] of runs) {
    addBox(red, w, height, d, x, height * 0.5, z);
    addBox(caps, w + 0.7, 0.42, d + 0.7, x, height + 0.12, z);
    addBox(caps, w + 0.35, 0.3, d + 0.35, x, height + 0.42, z);
  }
  const rm = mergedMesh(red, mats.wall, true, true);
  if (rm) group.add(rm);
  const cm = mergedMesh(caps, mats.roofGray, true, false);
  if (cm) group.add(cm);
}

function addRockBorder(group, w, d, x, z, y = 0.18) {
  const list = [];
  addBox(list, w + 2.0, 0.55, 1.4, x, y, z - d / 2 - 0.5);
  addBox(list, w + 2.0, 0.55, 1.4, x, y, z + d / 2 + 0.5);
  addBox(list, 1.4, 0.55, d + 2.0, x - w / 2 - 0.5, y, z);
  addBox(list, 1.4, 0.55, d + 2.0, x + w / 2 + 0.5, y, z);
  const mesh = mergedMesh(list, mats.marbleShade, true, true);
  if (mesh) group.add(mesh);
}

function addPond(group, waterMaterial) {
  const basin = new THREE.Mesh(new THREE.BoxGeometry(92, 0.75, 30), mats.stone);
  basin.position.set(0, -0.28, 287);
  basin.receiveShadow = true;
  group.add(basin);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(86, 25, 24, 8), waterMaterial);
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, 0.12, 287);
  water.renderOrder = 1;
  group.add(water);
  addRockBorder(group, 88, 27, 0, 287, 0.36);
  for (const [x, w] of [[0, 12], [-27, 7], [27, 7]]) {
    const bridge = createBridge({ width: w, span: 34, rise: 1.25 });
    bridge.position.set(x, 0.05, 287);
    group.add(bridge);
  }
}

function addCypress(group, x, z, height, seed, spread = 2.6) {
  const tree = createTree({ height, spread, kind: 'cypress', seed });
  tree.position.set(x, 0, z);
  group.add(tree);
}

function addCypressCluster(group, seed, count, xMin, xMax, zMin, zMax, avoid = []) {
  let s = seed;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  let placed = 0;
  let guard = 0;
  while (placed < count && guard < count * 12) {
    guard++;
    const x = xMin + rnd() * (xMax - xMin);
    const z = zMin + rnd() * (zMax - zMin);
    let ok = true;
    for (const [ax, az, ar] of avoid) {
      if (Math.hypot(x - ax, z - az) < ar) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;
    addCypress(group, x, z, 8.5 + rnd() * 9, seed + placed * 7, 2.1 + rnd() * 1.9);
    placed++;
  }
}

function buildTemple(waterMaterial) {
  const group = new THREE.Group();

  addPath(group, 0, 85, 14, 530, mats.marbleShade);
  addPath(group, 0, 287, 110, 10, mats.marbleShade, 0.052);
  addPath(group, 0, 20, 160, 9, mats.marbleShade, 0.05);

  addPond(group, waterMaterial);

  const gate = createLingxingGate();
  gate.position.set(0, 0, 322);
  group.add(gate);

  for (const sx of [-1, 1]) {
    const lion = createLion(0.95);
    lion.position.set(sx * 30, 0, 334);
    lion.rotation.y = sx > 0 ? -0.3 : 0.3;
    group.add(lion);
  }

  const kuiwen = createHall({
    w: 42, d: 24, wallH: 8.5, roofH: 8, eave: 3.4,
    baseH: 1.3, baseExtra: 4.0, stairs: 3.4,
    doubleEave: true, lowerRoofH: 4.8, upperWallH: 6.2, upperRoofH: 7.0,
    name: '奎文阁', bays: 7, backDoors: true, plaqueWidth: 4.2,
    roofMaterial: mats.roofGreen,
  });
  kuiwen.position.set(0, 0, 218);
  group.add(kuiwen);

  for (const sx of [-1, 1]) {
    for (const z of [190, 158, 126]) {
      const pav = createStelePavilion({ w: 11, d: 9, h: 5.4, steleWidth: 3.0, steleHeight: 4.2, key: '碑亭' + sx + z });
      pav.position.set(sx * 57, 0, z);
      group.add(pav);
    }
    for (const z of [176, 144]) {
      const st = createStele({ width: 2.5, height: 4.6, key: '石碑' + sx + z, depth: 0.65 });
      st.position.set(sx * 82, 0, z);
      st.rotation.y = sx * 0.12;
      group.add(st);
    }
  }

  const dachengGate = createHall({
    w: 40, d: 18, wallH: 6.4, roofH: 7.0, eave: 3.0,
    baseH: 0.4, baseExtra: 0, stairs: 0, railing: false,
    gateway: 8, name: '大成门', bays: 5, backDoors: true, plaqueWidth: 3.8,
    roofMaterial: mats.roofYellow,
  });
  dachengGate.position.set(0, 0, 105);
  group.add(dachengGate);

  for (const sx of [-1, 1]) {
    const corridor = createCorridor({
      length: 152, width: 8.5, wallH: 5.2, roofH: 4.6, eave: 2.0, bays: 26, baseH: 0.65,
      roofMaterial: mats.roofGray,
    });
    corridor.rotation.y = Math.PI / 2;
    corridor.position.set(sx * 104, 0, 22);
    group.add(corridor);
  }

  const xingtan = createHall({
    w: 18, d: 18, wallH: 5.6, roofH: 6.6, eave: 2.8,
    baseH: 1.0, baseExtra: 3.6, stairs: 2.2, pyramid: true,
    name: '杏坛', bays: 3, plaqueWidth: 2.9, roofMaterial: mats.roofYellow,
  });
  xingtan.position.set(0, 0, 27);
  group.add(xingtan);

  for (const sx of [-1, 1]) {
    for (const z of [36, 16]) {
      addCypress(group, sx * 18, z, 10.5, 140 + sx * 3 + z, 2.2);
    }
  }

  const tiers = [
    [118, 80, 0.7, 0.35],
    [111, 73, 0.7, 1.05],
    [104, 66, 0.75, 1.78],
  ];
  for (const [w, d, h, y] of tiers) {
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats.marble);
    body.position.set(0, y, -55);
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);
    const band = new THREE.Mesh(new THREE.BoxGeometry(w + 0.7, 0.28, d + 0.7), mats.marbleShade);
    band.position.set(0, y + h * 0.5 - 0.14, -55);
    band.receiveShadow = true;
    group.add(band);
  }
  const terraceRail = createBalustrade({ w: 105, d: 67, gapFront: 40, gapBack: 30, spacing: 2.8 });
  terraceRail.position.set(0, 2.15, -55);
  group.add(terraceRail);
  const frontStairs = createStairs({ width: 32, depth: 9, height: 2.15, steps: 10, rampWidth: 8 });
  frontStairs.position.set(0, 0, -17.5);
  group.add(frontStairs);

  const dacheng = createHall({
    w: 70, d: 38, wallH: 10, roofH: 10, eave: 4.5,
    baseH: 0.85, baseExtra: 5.0, stairs: 4.0,
    doubleEave: true, upperRatio: 0.72, lowerRoofH: 6.2,
    upperWallH: 7.8, upperRoofH: 8.8,
    name: '大成殿', bays: 9, backDoors: true, plaqueWidth: 5.4,
    roofMaterial: mats.roofYellow,
  });
  dacheng.position.set(0, 2.15, -55);
  group.add(dacheng);

  const coupletA = createCoupletBoard('气备四时与天地日月鬼神合其德', 1.25, 5.8);
  coupletA.position.set(-10.5, 2.15 + 0.85 + 5.1, -35.4);
  group.add(coupletA);
  const coupletB = createCoupletBoard('教垂万世继尧舜禹汤文武作之师', 1.25, 5.8);
  coupletB.position.set(10.5, 2.15 + 0.85 + 5.1, -35.4);
  group.add(coupletB);

  const offering = [];
  addBox(offering, 9, 1.1, 3.4, 0, 2.15 + 0.55, -25);
  addBox(offering, 10.5, 0.3, 4.2, 0, 2.15 + 0.15, -25);
  const om = mergedMesh(offering, mats.marbleShade, true, true);
  if (om) group.add(om);

  for (const sx of [-1, 1]) {
    const burner = createIncenseBurner(1.25);
    burner.position.set(sx * 18, 2.15, -22);
    group.add(burner);
    const vat = createVat(1.05);
    vat.position.set(sx * 38, 2.15, -28);
    group.add(vat);
  }

  const shengji = createHall({
    w: 42, d: 20, wallH: 8, roofH: 8, eave: 3.3,
    baseH: 1.0, baseExtra: 3.0, stairs: 3.0,
    name: '圣迹殿', bays: 7, backDoors: true, plaqueWidth: 4.0,
    roofMaterial: mats.roofGray,
  });
  shengji.position.set(0, 0, -150);
  group.add(shengji);

  for (const sx of [-1, 1]) {
    for (const z of [280, 250, 205, 160, 115, 70, -10, -70, -120, -165]) {
      addCypress(group, sx * 146, z, 11 + ((z + 300) % 7), 300 + sx * 11 + z, 2.4);
    }
    for (const z of [255, 180, 60, -35]) {
      addCypress(group, sx * 86, z, 12.5, 410 + sx * 17 + z, 2.7);
    }
  }
  for (const [x, z] of [[-34, 220], [34, 220], [-55, 25], [55, 25], [0, -145], [-25, -135], [25, -135]]) {
    addCypress(group, x, z, 13, 500 + x + z, 2.5);
  }

  addRedWalls(group, [
    [-178, 75, 1.8, 530],
    [178, 75, 1.8, 530],
    [0, -190, 356, 1.8],
    [-105, 340, 146, 1.8],
    [105, 340, 146, 1.8],
  ], 6.0);

  for (let z = 300; z >= -170; z -= 34) {
    for (const sx of [-1, 1]) {
      const lantern = createLantern();
      lantern.position.set(sx * 12.5, 0, z);
      group.add(lantern);
    }
  }

  return group;
}

function buildMansion() {
  const group = new THREE.Group();

  addPath(group, 330, 90, 10, 490, mats.marbleShade);
  const gate = createHall({
    w: 28, d: 14, wallH: 6.5, roofH: 6.6, eave: 3.0,
    baseH: 0.5, baseExtra: 1.4, stairs: 1.6, gateway: 6,
    name: '孔府', bays: 5, plaqueWidth: 3.6,
    roofMaterial: mats.roofGray,
  });
  gate.position.set(330, 0, 310);
  group.add(gate);
  for (const sx of [-1, 1]) {
    const lion = createLion(0.78);
    lion.position.set(330 + sx * 20, 0, 324);
    lion.rotation.y = sx > 0 ? -0.3 : 0.3;
    group.add(lion);
  }

  const gates = [
    { z: 248, w: 24, d: 12, wallH: 5.8, roofH: 6, eave: 2.6, name: '二门', gateway: 5 },
    { z: 115, w: 18, d: 10, wallH: 5.4, roofH: 5.4, eave: 2.2, name: '重光门', gateway: 4 },
    { z: 58, w: 20, d: 10, wallH: 5.2, roofH: 5.2, eave: 2.2, name: '内宅门', gateway: 4 },
  ];
  for (const g of gates) {
    const hall = createHall({
      w: g.w, d: g.d, wallH: g.wallH, roofH: g.roofH, eave: g.eave,
      baseH: 0.35, baseExtra: 0, stairs: 0, railing: false,
      gateway: g.gateway, name: g.name, bays: 5, plaqueWidth: 3.2,
      roofMaterial: mats.roofGray,
    });
    hall.position.set(330, 0, g.z);
    group.add(hall);
  }

  const halls = [
    { z: 175, w: 40, d: 24, wallH: 8.5, roofH: 8.0, eave: 3.4, name: '大堂', bays: 7, pw: 4.0, roof: mats.roofGreen, baseH: 1.0, be: 3.5, st: 3.2 },
    { z: -5, w: 36, d: 20, wallH: 7.5, roofH: 7.4, eave: 3.2, name: '前上房', bays: 7, pw: 3.8, roof: mats.roofGray, baseH: 0.9, be: 3.0, st: 2.8 },
    { z: -90, w: 34, d: 22, wallH: 8.0, roofH: 8.0, eave: 3.4, name: '后堂楼', bays: 7, pw: 4.0, roof: mats.roofGreen, baseH: 1.1, be: 3.5, st: 3.0, double: true },
  ];
  for (const h of halls) {
    const hall = createHall({
      w: h.w, d: h.d, wallH: h.wallH, roofH: h.roofH, eave: h.eave,
      baseH: h.baseH, baseExtra: h.be, stairs: h.st,
      doubleEave: !!h.double, lowerRoofH: 4.6, upperWallH: 5.8, upperRoofH: 6.6,
      name: h.name, bays: h.bays, backDoors: true, plaqueWidth: h.pw,
      roofMaterial: h.roof,
    });
    hall.position.set(330, 0, h.z);
    group.add(hall);
  }

  for (const sx of [-1, 1]) {
    const corridor = createCorridor({
      length: 390, width: 7, wallH: 4.4, roofH: 4.2, eave: 1.8, bays: 44, baseH: 0.6,
      roofMaterial: mats.roofGray,
    });
    corridor.rotation.y = Math.PI / 2;
    corridor.position.set(330 + sx * 76, 0, 90);
    group.add(corridor);
  }

  addRedWalls(group, [
    [232, 90, 1.8, 500],
    [438, 90, 1.8, 500],
    [281, 340, 100, 1.8],
    [379, 340, 100, 1.8],
    [330, -160, 206, 1.8],
  ], 5.5);

  for (const [x, z] of [[276, 220], [384, 220], [276, 70], [384, 70], [276, -40], [384, -40], [270, 290], [390, 290]]) {
    addCypress(group, x, z, 9.5, 700 + x + z, 2.0);
  }
  for (const [x, z] of [[290, 195], [372, 195], [290, 30], [372, 30]]) {
    const tree = createTree({ height: 8.5, spread: 3.2, kind: 'broad', seed: 800 + x + z });
    tree.position.set(x, 0, z);
    group.add(tree);
  }

  for (let z = 300; z >= -130; z -= 28) {
    for (const sx of [-1, 1]) {
      const lantern = createLantern();
      lantern.position.set(330 + sx * 8.5, 0, z);
      group.add(lantern);
    }
  }

  return group;
}

function buildCemetery() {
  const group = new THREE.Group();

  const forest = new THREE.Mesh(new THREE.PlaneGeometry(900, 520), mats.grass);
  forest.rotation.x = -Math.PI / 2;
  forest.position.set(0, -0.08, -410);
  forest.receiveShadow = true;
  group.add(forest);

  addPath(group, 0, -385, 11, 320, mats.stone, 0.04);

  const arch = createArchway('至圣林');
  arch.position.set(0, 0, -232);
  group.add(arch);

  for (const sx of [-1, 1]) {
    const lion = createLion(0.9);
    lion.position.set(sx * 18, 0, -218);
    lion.rotation.y = sx > 0 ? -0.3 : 0.3;
    group.add(lion);
  }

  const tomb = createTombMound({ radius: 16, height: 7.2, key: '大成至圣文宣王墓' });
  tomb.position.set(0, 0, -445);
  group.add(tomb);

  const enclosure = [];
  const lowWall = [];
  for (const [x, z, w, d] of [[0, -475, 52, 1.6], [-26, -450, 1.6, 50], [26, -450, 1.6, 50], [-17, -425, 18, 1.6], [17, -425, 18, 1.6]]) {
    addBox(lowWall, w, 2.4, d, x, 1.2, z);
    addBox(enclosure, w + 0.5, 0.35, d + 0.5, x, 2.5, z);
  }
  const lwm = mergedMesh(lowWall, mats.stone, true, true);
  if (lwm) group.add(lwm);
  const em = mergedMesh(enclosure, mats.marbleShade, true, false);
  if (em) group.add(em);

  const burner = createIncenseBurner(1.1);
  burner.position.set(0, 0, -416);
  group.add(burner);
  const table = [];
  addBox(table, 7, 0.9, 3, 0, 0.45, -423);
  addBox(table, 8, 0.25, 3.6, 0, 0.12, -423);
  const tm = mergedMesh(table, mats.marbleShade, true, true);
  if (tm) group.add(tm);

  for (let i = 0; i < 10; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const z = -260 - Math.floor(i / 2) * 34;
    const st = createStele({ width: 2.2, height: 4.0, key: '孔林神道碑' + i, depth: 0.55 });
    st.position.set(side * 17, 0, z);
    st.rotation.y = side * 0.06;
    group.add(st);
  }

  const rnd = (() => {
    let s = 911;
    return () => {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
  })();
  const mounds = [
    [-92, -350, 8, 3.4], [105, -375, 7, 3.0], [-150, -455, 10, 4.2],
    [148, -470, 9, 3.8], [-72, -520, 7.5, 3.2], [80, -530, 8.5, 3.6],
    [-215, -390, 8, 3.3], [210, -410, 7, 2.9],
  ];
  for (const [x, z, r, h] of mounds) {
    const m = createTombMound({ radius: r, height: h, key: '孔林先茔' + x });
    m.position.set(x, 0, z);
    m.rotation.y = rnd() * Math.PI * 2;
    group.add(m);
  }

  for (let i = 0; i < 18; i++) {
    const a = rnd() * Math.PI * 2;
    const r = 55 + rnd() * 260;
    const x = Math.cos(a) * r;
    const z = -445 + Math.sin(a) * r * 0.8;
    if (Math.abs(x) < 14 && z > -480) continue;
    const st = createStele({ width: 1.7 + rnd() * 1.2, height: 3.2 + rnd() * 2.4, key: '孔林古碑' + i, depth: 0.45 });
    st.position.set(x, 0, z);
    st.rotation.y = rnd() * Math.PI;
    group.add(st);
  }

  addCypressCluster(group, 1201, 150, -340, 340, -595, -245, [
    [0, -445, 28],
    [0, -330, 14],
    [0, -300, 10],
  ]);

  for (const [x, z] of [[-32, -250], [32, -250], [-30, -300], [30, -300], [-34, -350], [34, -350], [-36, -405], [36, -405], [-32, -465], [32, -465]]) {
    addCypress(group, x, z, 13.5, 1500 + x + z, 2.6);
  }

  return group;
}

function addScatteredTrees(group) {
  const rnd = (() => {
    let s = 733;
    return () => {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
  })();
  for (let i = 0; i < 32; i++) {
    const side = rnd() < 0.5 ? -1 : 1;
    const x = side * (260 + rnd() * 260);
    const z = -130 + rnd() * 500;
    if (x > 180 && z > -170 && z < 360) continue;
    addCypress(group, x, z, 8 + rnd() * 7, 1700 + i, 2.0 + rnd() * 1.6);
  }
}

export function buildQufu() {
  const root = new THREE.Group();
  const waterMaterial = makeWaterMaterial();

  const earth = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2200), mats.earth);
  earth.rotation.x = -Math.PI / 2;
  earth.position.set(0, -0.22, -150);
  earth.receiveShadow = true;
  root.add(earth);

  const templeGround = new THREE.Mesh(new THREE.PlaneGeometry(430, 600), mats.paving);
  templeGround.rotation.x = -Math.PI / 2;
  templeGround.position.set(0, 0, 70);
  templeGround.receiveShadow = true;
  root.add(templeGround);

  const mansionGround = new THREE.Mesh(new THREE.PlaneGeometry(240, 540), mats.paving);
  mansionGround.rotation.x = -Math.PI / 2;
  mansionGround.position.set(330, 0, 90);
  mansionGround.receiveShadow = true;
  root.add(mansionGround);

  root.add(buildTemple(waterMaterial));
  root.add(buildMansion());
  root.add(buildCemetery());
  addScatteredTrees(root);

  const duskLights = [];
  for (const [x, y, z, dist] of [[0, 13, 18, 130], [330, 11, 302, 110], [0, 10, -230, 100]]) {
    const light = new THREE.PointLight(0xffa75c, 0, dist, 1.7);
    light.position.set(x, y, z);
    duskLights.push(light);
  }

  const merged = mergeStaticGroup(root);
  const life = createImperialLife();
  merged.add(life.group);
  for (const light of duskLights) merged.add(light);
  return { group: merged, waterMaterial, life, duskLights };
}

export const buildForbiddenCity = buildQufu;
export const buildQufuScene = buildQufu;
