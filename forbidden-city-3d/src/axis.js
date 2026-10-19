import * as THREE from 'three';
import { mats } from './materials.js';
import { createHall, createCorridor } from './buildings.js';
import { createBridge } from './gates.js';
import { addBox, mergedMesh, createBalustrade, createStairs } from './geometry.js';
import { createLion, createVat, createIncenseBurner, createSundial, createLantern, createTree, createFlagpole } from './props.js';

function createRiverStrip({ x0, x1, z0, width, amplitude, frequency, segments = 70 }) {
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const x = x0 + (x1 - x0) * t;
    const zc = z0 + Math.sin(x * frequency) * amplitude;
    positions.push(x, 0, zc - width / 2);
    positions.push(x, 0, zc + width / 2);
    uvs.push(t * 20, 0);
    uvs.push(t * 20, 1);
  }
  for (let i = 0; i < segments; i++) {
    const a = i * 2;
    const b = a + 1;
    const c = a + 2;
    const d = a + 3;
    indices.push(a, b, c, b, d, c);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function addRiverBanks(group) {
  const list = [];
  const segs = 34;
  for (let i = 0; i < segs; i++) {
    const t0 = i / segs;
    const t1 = (i + 1) / segs;
    const x0 = -150 + 300 * t0;
    const x1 = -150 + 300 * t1;
    const z0 = 395 + Math.sin(x0 * 0.021) * 4.5;
    const z1 = 395 + Math.sin(x1 * 0.021) * 4.5;
    const dx = x1 - x0;
    const dz = z1 - z0;
    const len = Math.hypot(dx, dz);
    const angle = Math.atan2(dx, dz);
    for (const side of [-1, 1]) {
      const g = new THREE.BoxGeometry(0.9, 0.75, len + 0.2);
      g.rotateY(angle);
      g.translate((x0 + x1) / 2, 0.34, (z0 + z1) / 2 + side * 9.0);
      list.push(g);
    }
  }
  const mesh = mergedMesh(list, mats.marbleShade, true, true);
  if (mesh) group.add(mesh);
}

function addCentralPath(group, z, length, w = 11) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, 0.07, length), mats.marbleShade);
  mesh.position.set(0, 0.035, z);
  mesh.receiveShadow = true;
  group.add(mesh);
  const bands = [];
  for (let p = -length / 2 + 12; p < length / 2 - 6; p += 18) {
    addBox(bands, w * 0.94, 0.035, 0.72, 0, 0.078, z + p);
  }
  const gutter = [];
  addBox(gutter, 0.42, 0.13, length, -(w / 2 + 0.28), 0.065, z);
  addBox(gutter, 0.42, 0.13, length, w / 2 + 0.28, 0.065, z);
  for (let p = -length / 2 + 8; p < length / 2 - 4; p += 11) {
    addBox(gutter, 0.9, 0.16, 0.9, -(w / 2 + 0.6), 0.075, z + p);
    addBox(gutter, 0.9, 0.16, 0.9, w / 2 + 0.6, 0.075, z + p);
  }
  const bm = mergedMesh(bands, mats.marbleShade, false, true);
  if (bm) group.add(bm);
  const gm = mergedMesh(gutter, mats.stone, false, true);
  if (gm) group.add(gm);
}

export function buildAxis(waterMaterial) {
  const group = new THREE.Group();

  const river = new THREE.Mesh(
    createRiverStrip({ x0: -150, x1: 150, z0: 395, width: 16, amplitude: 4.5, frequency: 0.021 }),
    waterMaterial
  );
  river.position.y = 0.09;
  group.add(river);
  addRiverBanks(group);

  const bridgePositions = [-74, -38, 0, 38, 74];
  const bridgeWidths = [8, 9.5, 14, 9.5, 8];
  bridgePositions.forEach((x, i) => {
    const bridge = createBridge({ width: bridgeWidths[i], span: 34, rise: i === 2 ? 2.1 : 1.6 });
    bridge.position.set(x, 0, 395);
    group.add(bridge);
  });

  addCentralPath(group, 440, 72, 13);
  addCentralPath(group, 350, 78, 13);

  const taiheGate = createHall({
    w: 58,
    d: 26,
    wallH: 6.6,
    roofH: 7.6,
    eave: 3.6,
    baseH: 0.2,
    baseExtra: 0,
    stairs: 0,
    railing: false,
    gateway: 8,
    doubleEave: true,
    lowerRoofH: 4.6,
    upperWallH: 5.2,
    upperRoofH: 6.4,
    name: '太和门',
    bays: 7,
    backDoors: true,
    plaqueWidth: 4.2,
  });
  taiheGate.position.set(0, 0, 295.5);
  group.add(taiheGate);

  for (const sx of [-1, 1]) {
    const lion = createLion(1.0);
    lion.position.set(sx * 17, 0, 315);
    lion.rotation.y = sx > 0 ? -0.25 : 0.25;
    group.add(lion);
    const lantern = createLantern();
    lantern.position.set(sx * 27, 0, 320);
    group.add(lantern);
  }

  for (const sx of [-1, 1]) {
    const corridor = createCorridor({
      length: 92,
      width: 9,
      wallH: 4.8,
      roofH: 4.4,
      eave: 1.9,
      bays: 20,
      baseH: 0.7,
    });
    corridor.rotation.y = Math.PI / 2;
    corridor.position.set(sx * 178, 0, 427);
    group.add(corridor);
  }

  const tiers = [
    { w: 140, d: 216, h: 2.2, y: 0 },
    { w: 128, d: 204, h: 2.2, y: 2.2 },
    { w: 116, d: 192, h: 2.4, y: 4.4 },
  ];
  for (const t of tiers) {
    const body = new THREE.Mesh(new THREE.BoxGeometry(t.w, t.h, t.d), mats.marble);
    body.position.set(0, t.y + t.h / 2, 18);
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);
    const band = new THREE.Mesh(new THREE.BoxGeometry(t.w + 1.0, 0.7, t.d + 1.0), mats.marbleShade);
    band.position.set(0, t.y + t.h - 0.35, 18);
    band.receiveShadow = true;
    group.add(band);
    const rail = createBalustrade({
      w: t.w + 1.2,
      d: t.d + 1.2,
      gapFront: 40,
      gapBack: 40,
      spacing: 2.9,
    });
    rail.position.set(0, t.y + t.h, 18);
    group.add(rail);
  }

  const frontStairs = createStairs({ width: 38, depth: 18, height: 6.8, steps: 34, rampWidth: 9 });
  frontStairs.rotation.y = Math.PI;
  frontStairs.position.set(0, 0, 123);
  group.add(frontStairs);
  const ramp = new THREE.Mesh(
    new THREE.BoxGeometry(8, 0.12, Math.hypot(18, 6.8)),
    mats.ramp
  );
  ramp.rotation.x = -Math.atan2(6.8, 18);
  ramp.position.set(0, 3.52, 123);
  ramp.receiveShadow = true;
  group.add(ramp);
  const backStairs = createStairs({ width: 38, depth: 18, height: 6.8, steps: 34, rampWidth: 9 });
  backStairs.position.set(0, 0, -87);
  group.add(backStairs);

  const taihe = createHall({
    w: 66,
    d: 40,
    wallH: 9,
    roofH: 9.4,
    eave: 4.2,
    baseH: 1.2,
    baseExtra: 4.0,
    stairs: 4.5,
    doubleEave: true,
    upperRatio: 0.71,
    lowerRoofH: 6.0,
    upperWallH: 7.2,
    upperRoofH: 8.2,
    name: '太和殿',
    bays: 11,
    backDoors: true,
    plaqueWidth: 5.0,
  });
  taihe.position.set(0, 6.8, 87);
  group.add(taihe);

  const zhonghe = createHall({
    w: 22,
    d: 22,
    wallH: 6.4,
    roofH: 7.6,
    eave: 3.6,
    baseH: 1.0,
    baseExtra: 2.8,
    stairs: 3.2,
    pyramid: true,
    name: '中和殿',
    bays: 5,
    plaqueWidth: 3.0,
  });
  zhonghe.position.set(0, 6.8, 20);
  group.add(zhonghe);

  const baohe = createHall({
    w: 52,
    d: 28,
    wallH: 8,
    roofH: 8.2,
    eave: 3.6,
    baseH: 1.1,
    baseExtra: 3.6,
    stairs: 3.8,
    doubleEave: true,
    upperRatio: 0.72,
    lowerRoofH: 5.0,
    upperWallH: 6.0,
    upperRoofH: 7.0,
    name: '保和殿',
    bays: 9,
    backDoors: true,
    plaqueWidth: 4.2,
  });
  baohe.position.set(0, 6.8, -45);
  group.add(baohe);

  const props = [
    [createIncenseBurner(1.2), -26, 6.8, 112],
    [createIncenseBurner(1.2), 26, 6.8, 112],
    [createVat(1.1), -40, 6.8, 55],
    [createVat(1.1), 40, 6.8, 55],
    [createSundial(), 24, 6.8, 78],
    [createIncenseBurner(1.0), -24, 6.8, -18],
    [createIncenseBurner(1.0), 24, 6.8, -18],
  ];
  for (const [obj, x, y, z] of props) {
    obj.position.set(x, y, z);
    group.add(obj);
  }

  for (const sx of [-1, 1]) {
    const hall = createHall({
      w: 58,
      d: 40,
      wallH: 8,
      roofH: 6.6,
      eave: 3.2,
      baseH: 1.5,
      baseExtra: 2.8,
      stairs: 3.2,
      doubleEave: true,
      lowerRoofH: 4.2,
      upperWallH: 5.2,
      upperRoofH: 5.8,
      name: sx > 0 ? '体仁阁' : '弘义阁',
      bays: 9,
      plaqueWidth: 3.4,
    });
    hall.rotation.y = sx * (Math.PI / 2);
    hall.position.set(sx * 103, 0, sx > 0 ? 184.6 : 194.5);
    group.add(hall);

    const corridor = createCorridor({
      length: 138,
      width: 9,
      wallH: 4.6,
      roofH: 4.2,
      eave: 1.8,
      bays: 26,
      baseH: 0.7,
    });
    corridor.rotation.y = Math.PI / 2;
    corridor.position.set(sx * 170, 0, 195);
    group.add(corridor);
  }

  const redWalls = [];
  const wallCaps = [];
  const wallRun = (x, z, len, axis = 'z') => {
    const w = axis === 'x' ? len : 2.2;
    const d = axis === 'x' ? 2.2 : len;
    addBox(redWalls, w, 5.6, d, x, 2.8, z);
    addBox(wallCaps, w + 0.6, 0.5, d + 0.6, x, 5.75, z);
  };
  for (const sx of [-1, 1]) {
    wallRun(sx * 132, 200, 140);
    wallRun(sx * 132, -250, 130);
    wallRun(sx * 103, 270, 62, 'x');
    wallRun(sx * 103, 130, 62, 'x');
    wallRun(sx * 96, -116, 54, 'x');
  }
  const rwm = mergedMesh(redWalls, mats.wall, true, true);
  if (rwm) group.add(rwm);
  const wcm = mergedMesh(wallCaps, mats.roofDark, false, false);
  if (wcm) group.add(wcm);

  const sideGates = [
    ['中左门', 78.0, 88.1, 50, 24],
    ['中右门', -83.6, 93.4, 50, 24],
    ['后左门', 77.6, -47.5, 50, 24],
    ['后右门', -84.0, -41.4, 50, 24],
    ['昭德门', 61.0, 291.3, 48, 26],
    ['贞度门', -65.7, 295.7, 48, 26],
    ['协和门', 104.4, 374.6, 52, 32],
    ['熙和门', -111.1, 385.2, 52, 32],
  ];
  for (const [name, x, z, w, d] of sideGates) {
    const gate = createHall({
      w,
      d,
      wallH: 5.2,
      roofH: 5.4,
      eave: 2.4,
      baseH: 0.9,
      baseExtra: 2.0,
      stairs: 0,
      name,
      bays: 5,
      plaqueWidth: 2.6,
    });
    gate.rotation.y = Math.PI / 2;
    gate.position.set(x, 0, z);
    group.add(gate);
  }

  const qianqingGate = createHall({
    w: 38,
    d: 20,
    wallH: 5.8,
    roofH: 6.0,
    eave: 2.8,
    baseH: 0.2,
    baseExtra: 0,
    stairs: 0,
    railing: false,
    gateway: 7,
    name: '乾清门',
    bays: 5,
    backDoors: true,
    plaqueWidth: 3.4,
  });
  qianqingGate.position.set(0, 0, -136.4);
  group.add(qianqingGate);

  for (const sx of [-1, 1]) {
    const lion = createLion(0.8);
    lion.position.set(sx * 13, 0, -118);
    lion.rotation.y = sx > 0 ? -0.25 : 0.25;
    group.add(lion);
  }

  const rearPlatform = new THREE.Mesh(new THREE.BoxGeometry(104, 1.2, 130), mats.marble);
  rearPlatform.position.set(0, 0.6, -272);
  rearPlatform.castShadow = true;
  rearPlatform.receiveShadow = true;
  group.add(rearPlatform);
  const rearBand = new THREE.Mesh(new THREE.BoxGeometry(105, 0.4, 131), mats.marbleShade);
  rearBand.position.set(0, 1.0, -272);
  rearBand.receiveShadow = true;
  group.add(rearBand);
  const rearRail = createBalustrade({ w: 105.2, d: 131.2, gapFront: 26, gapBack: 26, spacing: 2.8 });
  rearRail.position.set(0, 1.2, -272);
  group.add(rearRail);
  const rearStairs = createStairs({ width: 24, depth: 10, height: 1.2, steps: 6, rampWidth: 7 });
  rearStairs.rotation.y = Math.PI;
  rearStairs.position.set(0, 0, -202);
  group.add(rearStairs);
  const rearStairsN = createStairs({ width: 20, depth: 10, height: 1.2, steps: 6, rampWidth: 6 });
  rearStairsN.position.set(0, 0, -342);
  group.add(rearStairsN);

  const qianqing = createHall({
    w: 50,
    d: 28,
    wallH: 8,
    roofH: 8,
    eave: 3.6,
    baseH: 1.1,
    baseExtra: 3.0,
    stairs: 3.4,
    doubleEave: true,
    upperRatio: 0.72,
    lowerRoofH: 5.0,
    upperWallH: 6.2,
    upperRoofH: 7.0,
    name: '乾清宫',
    bays: 9,
    backDoors: true,
    plaqueWidth: 4.4,
  });
  qianqing.position.set(0, 1.2, -234.7);
  group.add(qianqing);

  const jiaotai = createHall({
    w: 21,
    d: 21,
    wallH: 5.4,
    roofH: 6.2,
    eave: 2.8,
    baseH: 0.9,
    baseExtra: 2.4,
    stairs: 2.8,
    pyramid: true,
    name: '交泰殿',
    bays: 5,
    plaqueWidth: 2.8,
  });
  jiaotai.position.set(0, 1.2, -274);
  group.add(jiaotai);

  const kunning = createHall({
    w: 48,
    d: 24,
    wallH: 7.4,
    roofH: 7.4,
    eave: 3.4,
    baseH: 1.1,
    baseExtra: 2.8,
    stairs: 3.2,
    doubleEave: true,
    upperRatio: 0.72,
    lowerRoofH: 4.6,
    upperWallH: 5.6,
    upperRoofH: 6.4,
    name: '坤宁宫',
    bays: 7,
    backDoors: true,
    plaqueWidth: 4.0,
  });
  kunning.position.set(0, 1.2, -307.1);
  group.add(kunning);

  const kunningGate = createHall({
    w: 20,
    d: 10,
    wallH: 4.4,
    roofH: 4.2,
    eave: 1.8,
    baseH: 0.15,
    baseExtra: 0,
    stairs: 0,
    railing: false,
    gateway: 6,
    bays: 3,
    name: '坤宁门',
    backDoors: true,
    plaqueWidth: 3.0,
  });
  kunningGate.position.set(0, 0, -343.9);
  group.add(kunningGate);

  for (const sx of [-1, 1]) {
    const corridor = createCorridor({
      length: 122,
      width: 8,
      wallH: 4.4,
      roofH: 4.0,
      eave: 1.8,
      bays: 24,
      baseH: 0.6,
    });
    corridor.rotation.y = Math.PI / 2;
    corridor.position.set(sx * 74, 0, -272);
    group.add(corridor);
  }

  addCentralPath(group, 204, 132, 13);
  addCentralPath(group, -170, 44, 10);
  addCentralPath(group, -272, 124, 9);

  for (const [zc, len, off, y] of [
    [420, 50, 8.4, 0],
    [355, 60, 8.4, 0],
    [204, 126, 8.4, 0],
    [-170, 42, 8.4, 0],
    [-272, 122, 42, 1.2],
  ]) {
    for (let z = zc - len / 2 + 8; z <= zc + len / 2 - 6; z += 21) {
      for (const sx of [-1, 1]) {
        const lantern = createLantern();
        lantern.position.set(sx * off, y, z);
        group.add(lantern);
      }
    }
  }

  for (const [x, z] of [[-52, 150], [52, 150], [-52, 200], [52, 200]]) {
    const pole = createFlagpole(11.5);
    pole.position.set(x, 0, z);
    group.add(pole);
  }

  const cypressRows = [
    [-61, 148], [-61, 182], [-61, 216],
    [61, 148], [61, 182], [61, 216],
    [-57, -224], [-57, -260], [-57, -296],
    [57, -224], [57, -260], [57, -296],
  ];
  let seed = 3;
  for (const [x, z] of cypressRows) {
    const tree = createTree({ height: 11.5, spread: 2.15, kind: 'cypress', seed: seed++ });
    tree.position.set(x, 0, z);
    group.add(tree);
  }

  const extraProps = [
    [createVat(1.15), -24, 0, 350],
    [createVat(1.15), 24, 0, 350],
    [createVat(1.0), -34, 1.2, -215],
    [createVat(1.0), 34, 1.2, -215],
    [createVat(1.0), -34, 1.2, -300],
    [createVat(1.0), 34, 1.2, -300],
    [createIncenseBurner(1.15), -30, 1.2, -330],
    [createIncenseBurner(1.15), 30, 1.2, -330],
  ];
  for (const [obj, x, y, z] of extraProps) {
    obj.position.set(x, y, z);
    group.add(obj);
  }

  return group;
}
