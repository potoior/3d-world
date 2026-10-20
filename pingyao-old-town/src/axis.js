import * as THREE from 'three';
import { mats } from './materials.js';
import { createHall, createCorridor } from './buildings.js';
import { createBridge } from './gates.js';
import { addBox, mergedMesh, createBalustrade, createStairs } from './geometry.js';
import { createLion, createVat, createIncenseBurner, createSundial, createLantern } from './props.js';

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

  addCentralPath(group, 440, 66);
  addCentralPath(group, 355, 46);

  const taiheGate = createHall({
    w: 46,
    d: 20,
    wallH: 6.2,
    roofH: 7.2,
    eave: 3.2,
    baseH: 1.4,
    baseExtra: 3.2,
    stairs: 4,
    doubleEave: true,
    lowerRoofH: 4.4,
    upperWallH: 5.0,
    upperRoofH: 6.0,
    name: '太和门',
    bays: 7,
    backDoors: true,
    plaqueWidth: 4.0,
  });
  taiheGate.position.set(0, 0, 320);
  group.add(taiheGate);

  for (const sx of [-1, 1]) {
    const lion = createLion(0.95);
    lion.position.set(sx * 13, 0, 334);
    lion.rotation.y = sx > 0 ? -0.25 : 0.25;
    group.add(lion);
    const lantern = createLantern();
    lantern.position.set(sx * 22, 0, 338);
    group.add(lantern);
  }

  for (const sx of [-1, 1]) {
    const corridor = createCorridor({
      length: 130,
      width: 9,
      wallH: 4.8,
      roofH: 4.4,
      eave: 1.9,
      bays: 26,
      baseH: 0.7,
    });
    corridor.rotation.y = Math.PI / 2;
    corridor.position.set(sx * 172, 0, 400);
    group.add(corridor);
  }

  const tiers = [
    { w: 112, d: 160, h: 2.2, y: 0 },
    { w: 100, d: 148, h: 2.2, y: 2.2 },
    { w: 88, d: 136, h: 2.4, y: 4.4 },
  ];
  for (const t of tiers) {
    const body = new THREE.Mesh(new THREE.BoxGeometry(t.w, t.h, t.d), mats.marble);
    body.position.set(0, t.y + t.h / 2, 205);
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);
    const band = new THREE.Mesh(new THREE.BoxGeometry(t.w + 1.0, 0.7, t.d + 1.0), mats.marbleShade);
    band.position.set(0, t.y + t.h - 0.35, 205);
    band.receiveShadow = true;
    group.add(band);
    const rail = createBalustrade({
      w: t.w + 1.2,
      d: t.d + 1.2,
      gapFront: 34,
      gapBack: 34,
      spacing: 2.9,
    });
    rail.position.set(0, t.y + t.h, 205);
    group.add(rail);
  }

  const frontStairs = createStairs({ width: 32, depth: 18, height: 6.8, steps: 34, rampWidth: 9 });
  frontStairs.position.set(0, 0, 285);
  group.add(frontStairs);
  const ramp = new THREE.Mesh(
    new THREE.BoxGeometry(8, 0.12, Math.hypot(18, 6.8)),
    mats.ramp
  );
  ramp.rotation.x = Math.atan2(6.8, 18);
  ramp.position.set(0, 3.52, 294);
  ramp.receiveShadow = true;
  group.add(ramp);
  const backStairs = createStairs({ width: 32, depth: 18, height: 6.8, steps: 34, rampWidth: 9 });
  backStairs.rotation.y = Math.PI;
  backStairs.position.set(0, 0, 125);
  group.add(backStairs);

  const taihe = createHall({
    w: 64,
    d: 38,
    wallH: 9,
    roofH: 9.4,
    eave: 4.2,
    baseH: 1.2,
    baseExtra: 3.4,
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
  taihe.position.set(0, 6.8, 243);
  group.add(taihe);

  const zhonghe = createHall({
    w: 24,
    d: 24,
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
  zhonghe.position.set(0, 6.8, 200);
  group.add(zhonghe);

  const baohe = createHall({
    w: 48,
    d: 26,
    wallH: 8,
    roofH: 8.2,
    eave: 3.6,
    baseH: 1.1,
    baseExtra: 3.0,
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
  baohe.position.set(0, 6.8, 160);
  group.add(baohe);

  const props = [
    [createIncenseBurner(1.2), -26, 6.8, 271],
    [createIncenseBurner(1.2), 26, 6.8, 271],
    [createVat(1.1), -40, 6.8, 225],
    [createVat(1.1), 40, 6.8, 225],
    [createSundial(), 24, 6.8, 250],
    [createIncenseBurner(1.0), -24, 6.8, 178],
    [createIncenseBurner(1.0), 24, 6.8, 178],
  ];
  for (const [obj, x, y, z] of props) {
    obj.position.set(x, y, z);
    group.add(obj);
  }

  for (const sx of [-1, 1]) {
    const hall = createHall({
      w: 42,
      d: 18,
      wallH: 8,
      roofH: 6.4,
      eave: 3.0,
      baseH: 1.5,
      baseExtra: 2.6,
      stairs: 3.2,
      doubleEave: true,
      lowerRoofH: 4.2,
      upperWallH: 5.2,
      upperRoofH: 5.8,
      name: sx < 0 ? '体仁阁' : '弘义阁',
      bays: 9,
      plaqueWidth: 3.4,
    });
    hall.rotation.y = sx * (Math.PI / 2);
    hall.position.set(sx * 122, 0, 242);
    group.add(hall);

    const corridor = createCorridor({
      length: 130,
      width: 9,
      wallH: 4.6,
      roofH: 4.2,
      eave: 1.8,
      bays: 26,
      baseH: 0.7,
    });
    corridor.rotation.y = Math.PI / 2;
    corridor.position.set(sx * 166, 0, 210);
    group.add(corridor);
  }

  const qianqingGate = createHall({
    w: 36,
    d: 16,
    wallH: 5.6,
    roofH: 5.8,
    eave: 2.6,
    baseH: 1.2,
    baseExtra: 2.4,
    stairs: 3.6,
    name: '乾清门',
    bays: 5,
    backDoors: true,
    plaqueWidth: 3.4,
  });
  qianqingGate.position.set(0, 0, 95);
  group.add(qianqingGate);

  for (const sx of [-1, 1]) {
    const lion = createLion(0.8);
    lion.position.set(sx * 11, 0, 108);
    lion.rotation.y = sx > 0 ? -0.25 : 0.25;
    group.add(lion);
  }

  const rearPlatform = new THREE.Mesh(new THREE.BoxGeometry(88, 1.2, 150), mats.marble);
  rearPlatform.position.set(0, 0.6, 0);
  rearPlatform.castShadow = true;
  rearPlatform.receiveShadow = true;
  group.add(rearPlatform);
  const rearBand = new THREE.Mesh(new THREE.BoxGeometry(89, 0.4, 151), mats.marbleShade);
  rearBand.position.set(0, 1.0, 0);
  rearBand.receiveShadow = true;
  group.add(rearBand);
  const rearRail = createBalustrade({ w: 89.2, d: 151.2, gapFront: 24, gapBack: 24, spacing: 2.8 });
  rearRail.position.y = 1.2;
  group.add(rearRail);
  const rearStairs = createStairs({ width: 22, depth: 10, height: 1.2, steps: 6, rampWidth: 7 });
  rearStairs.position.set(0, 0, 75);
  group.add(rearStairs);

  const qianqing = createHall({
    w: 48,
    d: 24,
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
  qianqing.position.set(0, 1.2, 45);
  group.add(qianqing);

  const jiaotai = createHall({
    w: 20,
    d: 20,
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
  jiaotai.position.set(0, 1.2, -2);
  group.add(jiaotai);

  const kunning = createHall({
    w: 42,
    d: 22,
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
  kunning.position.set(0, 1.2, -45);
  group.add(kunning);

  const kunningGate = createHall({
    w: 24,
    d: 8,
    wallH: 4.4,
    roofH: 4.2,
    eave: 1.8,
    baseH: 0.8,
    baseExtra: 1.8,
    stairs: 2.0,
    bays: 3,
    name: '坤宁门',
    backDoors: true,
    plaqueWidth: 3.0,
  });
  kunningGate.position.set(0, 0, -112);
  group.add(kunningGate);

  for (const sx of [-1, 1]) {
    const corridor = createCorridor({
      length: 130,
      width: 8,
      wallH: 4.4,
      roofH: 4.0,
      eave: 1.8,
      bays: 26,
      baseH: 0.6,
    });
    corridor.rotation.y = Math.PI / 2;
    corridor.position.set(sx * 92, 0, 10);
    group.add(corridor);
  }

  addCentralPath(group, 86, 16, 9);
  addCentralPath(group, -84, 18, 9);

  return group;
}
