import * as THREE from 'three';
import { mats, getPlaqueMaterial } from './materials.js';
import { addBox, addCylinder, mergedMesh } from './geometry.js';
import { houseRoof } from './houses.js';

function pavilion(list, roofs, { width, depth, baseY, height, name, plaqueList }) {
  addBox(list.plaster, width - 0.5, height, depth - 0.5, 0, baseY + height * 0.5, 0);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addBox(list.timber, 0.34, height, 0.34, sx * (width * 0.5 - 0.28), baseY + height * 0.5, sz * (depth * 0.5 - 0.28));
    }
  }
  addBox(list.dark, width - 0.4, 0.22, 0.24, 0, baseY + height - 0.05, depth * 0.5);
  const roof = new THREE.Mesh(houseRoof(width + 1.9, depth + 2.0, 2.0, 0.5, 1.2), mats.roofGrey);
  roof.position.y = baseY + height;
  roof.castShadow = true;
  roof.receiveShadow = true;
  roofs.push(roof);
  addBox(list.dark, Math.max(1.8, width - 1.0), 0.22, 0.24, 0, baseY + height + 2.0, 0);
  if (name && plaqueList) {
    const plaque = new THREE.Mesh(new THREE.PlaneGeometry(2.36, 0.74), getPlaqueMaterial(name));
    plaque.position.set(0, baseY + height - 0.55, depth * 0.5 + 0.34);
    plaqueList.push(plaque);
  }
}

function gateTower({ x, z, rot, wallH, name }) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rot;
  const list = { timber: [], dark: [], plaster: [] };
  const roofs = [];
  const plaques = [];
  addBox(list.plaster, 19, 3.4, 12, 0, wallH + 1.7, 0);
  addBox(list.dark, 19.4, 0.34, 12.4, 0, wallH + 3.35, 0);
  addBox(list.dark, 19.2, 0.3, 12.2, 0, wallH + 0.2, 0);
  addBox(list.timber, 13.5, 0.3, 8.2, 0, wallH + 3.55, 0);
  pavilion(list, roofs, { width: 13.5, depth: 8.2, baseY: wallH + 3.6, height: 3.5, name, plaqueList: plaques });
  addBox(list.timber, 8.4, 0.26, 5.4, 0, wallH + 7.1, 0);
  pavilion(list, roofs, { width: 8.4, depth: 5.4, baseY: wallH + 7.15, height: 2.4 });
  for (const sx of [-1, 1]) addBox(list.dark, 0.5, 3.8, 0.5, sx * 5.8, wallH + 5.2, 3.7);
  addBox(list.dark, 12, 0.22, 0.26, 0, wallH + 7.0, 3.9);
  for (const [arr, mat] of [
    [list.timber, mats.timberRed],
    [list.dark, mats.naxiWoodDark],
    [list.plaster, mats.plaster],
  ]) {
    const m = mergedMesh(arr, mat, true, true);
    if (m) group.add(m);
  }
  roofs.forEach((r) => group.add(r));
  plaques.forEach((p) => group.add(p));
  return group;
}

function cornerTower(x, z, wallH) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  const brick = [];
  const stone = [];
  const dark = [];
  addBox(stone, 13.6, 0.9, 13.6, 0, wallH + 0.45, 0);
  addBox(brick, 12.8, 4.2, 12.8, 0, wallH + 2.95, 0);
  addBox(dark, 13.2, 0.34, 13.2, 0, wallH + 5.2, 0);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    addBox(brick, 1.1, 1.15, 1.1, Math.cos(a) * 5.6, wallH + 5.95, Math.sin(a) * 5.6);
  }
  for (const [arr, mat] of [[brick, mats.greyBrick], [stone, mats.waterStone], [dark, mats.roofGreyDark]]) {
    const m = mergedMesh(arr, mat, true, true);
    if (m) group.add(m);
  }
  const roof = new THREE.Mesh(houseRoof(14.4, 14.4, 2.2, 0.45, 1.22, 9, 6), mats.roofGrey);
  roof.position.y = wallH + 5.3;
  roof.castShadow = true;
  roof.receiveShadow = true;
  group.add(roof);
  return group;
}

function watchTower({ x, z, wallH, rot }) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rot;
  const brick = [];
  const dark = [];
  addBox(brick, 5.4, 3.2, 5.4, 0, wallH + 1.6, 0);
  addBox(dark, 5.8, 0.28, 5.8, 0, wallH + 3.32, 0);
  const bm = mergedMesh(brick, mats.greyBrick, true, true);
  if (bm) group.add(bm);
  const dm = mergedMesh(dark, mats.roofGreyDark, true, true);
  if (dm) group.add(dm);
  const roof = new THREE.Mesh(houseRoof(6.2, 6.2, 1.5, 0.35, 1.2, 7, 5), mats.roofGrey);
  roof.position.y = wallH + 3.44;
  roof.castShadow = true;
  group.add(roof);
  return group;
}

export function createCityWall({ halfX = 128, halfZ = 140, height = 10, thickness = 7, gateWidth = 15 }) {
  const group = new THREE.Group();
  const brick = [];
  const dark = [];
  const stone = [];
  const walk = [];
  const H = height;
  const T = thickness;
  const openTop = 5.8;

  const run = (isX, sign) => {
    const half = isX ? halfX : halfZ;
    const pieces = [[-half, -gateWidth * 0.5], [gateWidth * 0.5, half]];
    for (const [a, b] of pieces) {
      const len = b - a;
      if (len <= 0) continue;
      const c = (a + b) * 0.5;
      const ax = isX ? c : sign * halfX;
      const az = isX ? sign * halfZ : c;
      const useW = isX ? len : T;
      const useD = isX ? T : len;
      addBox(stone, useW, 1.0, useD, ax, 0.5, az);
      addBox(brick, useW, H - 1.0, useD, ax, 1.0 + (H - 1.0) * 0.5, az);
      addBox(walk, Math.max(0.5, useW - 1.2), 0.14, Math.max(0.5, useD - 1.2), ax, H + 0.07, az);
      const outer = isX ? sign * (halfZ + T * 0.5 - 0.38) : sign * (halfX + T * 0.5 - 0.38);
      const inner = isX ? sign * (halfZ - T * 0.5 + 0.24) : sign * (halfX - T * 0.5 + 0.24);
      addBox(dark, isX ? len : 0.5, 0.62, isX ? 0.5 : len, isX ? ax : outer, H + 0.31, isX ? outer : az);
      addBox(dark, isX ? len : 0.42, 0.45, isX ? 0.42 : len, isX ? ax : inner, H + 0.22, isX ? inner : az);
      const n = Math.max(2, Math.floor(len / 2.7));
      for (let i = 0; i <= n; i++) {
        const t = a + (len * i) / n;
        addBox(brick, 1.0, 1.15, 0.78, isX ? t : outer, H + 1.0, isX ? outer : t);
        if (i < n) {
          const gt = a + (len * (i + 0.5)) / n;
          addBox(dark, isX ? 1.0 : 0.2, 0.28, isX ? 0.2 : 1.0, isX ? gt : outer, H + 0.58, isX ? outer : gt);
        }
      }
    }
    addBox(brick, isX ? gateWidth : T, H - openTop, isX ? T : gateWidth, isX ? 0 : sign * halfX, openTop + (H - openTop) * 0.5, isX ? sign * halfZ : 0);
    addBox(dark, isX ? gateWidth + 1.4 : T + 0.5, 0.68, isX ? T + 0.5 : gateWidth + 1.4, isX ? 0 : sign * halfX, openTop + 0.32, isX ? sign * halfZ : 0);
    for (const side of [-1, 1]) {
      addBox(stone, isX ? 0.8 : 0.55, openTop, isX ? 0.55 : 0.8,
        isX ? side * (gateWidth * 0.5 + 0.4) : sign * (halfX + T * 0.5 + 0.12),
        openTop * 0.5,
        isX ? sign * (halfZ + T * 0.5 + 0.12) : side * (gateWidth * 0.5 + 0.4));
    }
    addBox(stone, isX ? gateWidth + 2.0 : 0.55, 0.72, isX ? 0.55 : gateWidth + 2.0,
      isX ? 0 : sign * (halfX + T * 0.5 + 0.12), openTop + 0.12, isX ? sign * (halfZ + T * 0.5 + 0.12) : 0);
  };

  run(true, 1);
  run(true, -1);
  run(false, 1);
  run(false, -1);

  const rampAngle = Math.atan2(H - 0.6, 15);
  const slopeLen = Math.hypot(H - 0.6, 15);
  const rampDefs = [
    { x: -24, z: -halfZ + T * 0.5 + 7.5, ry: 0, sign: 1 },
    { x: 24, z: halfZ - T * 0.5 - 7.5, ry: Math.PI, sign: -1 },
    { x: halfX - T * 0.5 - 7.5, z: 24, ry: -Math.PI / 2, sign: 1 },
    { x: -halfX + T * 0.5 + 7.5, z: -24, ry: Math.PI / 2, sign: -1 },
  ];
  for (const r of rampDefs) {
    const g = new THREE.BoxGeometry(4.8, 0.5, slopeLen);
    g.rotateX(rampAngle * r.sign);
    g.rotateY(r.ry);
    g.translate(r.x, (H - 0.6) * 0.5 + 0.25, r.z);
    walk.push(g);
    const side1 = new THREE.BoxGeometry(0.5, 0.8, slopeLen);
    side1.rotateX(rampAngle * r.sign);
    side1.rotateY(r.ry);
    side1.translate(r.x + Math.cos(r.ry) * 2.6, (H - 0.6) * 0.5 + 0.35, r.z - Math.sin(r.ry) * 2.6);
    stone.push(side1);
    const side2 = side1.clone();
    side2.translate(-Math.cos(r.ry) * 5.2, 0, Math.sin(r.ry) * 5.2);
    stone.push(side2);
  }

  for (const [arr, mat] of [
    [brick, mats.greyBrick],
    [dark, mats.greyBrickDark],
    [stone, mats.waterStone],
    [walk, mats.stoneLane],
  ]) {
    const m = mergedMesh(arr, mat, true, true);
    if (m) group.add(m);
  }

  const gates = [
    { x: 0, z: -halfZ, rot: Math.PI, name: '迎薰门' },
    { x: 0, z: halfZ, rot: 0, name: '拱极门' },
    { x: halfX, z: 0, rot: Math.PI / 2, name: '亲翰门' },
    { x: -halfX, z: 0, rot: -Math.PI / 2, name: '凤仪门' },
  ];
  for (const g of gates) group.add(gateTower({ ...g, wallH: H }));
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) group.add(cornerTower(sx * halfX, sz * halfZ, H));
  }
  const watches = [
    [-64, -halfZ, Math.PI], [64, -halfZ, Math.PI],
    [-64, halfZ, 0], [64, halfZ, 0],
    [halfX, -70, Math.PI / 2], [halfX, 70, Math.PI / 2],
    [-halfX, -70, -Math.PI / 2], [-halfX, 70, -Math.PI / 2],
  ];
  for (const [x, z, rot] of watches) group.add(watchTower({ x, z, wallH: H, rot }));
  const watchDetails = watches.map(([x, z, rot]) => ({ x, z, rot, wallH: H }));

  return { group, gates, watches: watchDetails };
}

export function createMarketTower({ x = 0, z = 52 }) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  const stone = [];
  const timber = [];
  const dark = [];
  const plaster = [];
  const roofs = [];
  const plaques = [];
  addBox(stone, 13, 0.9, 13, 0, 0.45, 0);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addBox(stone, 1.4, 5.1, 1.4, sx * 4.6, 3.0, sz * 4.6);
      addBox(timber, 0.4, 4.4, 0.4, sx * 4.6, 2.9, sz * 4.6);
    }
  }
  addBox(dark, 10.6, 0.6, 10.6, 0, 5.6, 0);
  addBox(timber, 11, 0.35, 11, 0, 5.95, 0);
  pavilion({ timber, dark, plaster }, roofs, {
    width: 10.4, depth: 10.4, baseY: 6.15, height: 3.4, name: '市楼', plaqueList: plaques,
  });
  addBox(timber, 6.4, 0.26, 0.26, 0, 9.4, 5.5);
  for (const sx of [-1, 1]) addBox(timber, 0.26, 3.2, 0.26, sx * 5.1, 7.8, 5.1);
  for (const [arr, mat] of [
    [stone, mats.waterStone],
    [timber, mats.timberRed],
    [dark, mats.naxiWoodDark],
    [plaster, mats.plaster],
  ]) {
    const m = mergedMesh(arr, mat, true, true);
    if (m) group.add(m);
  }
  roofs.forEach((r) => group.add(r));
  plaques.forEach((p) => group.add(p));
  const colliders = [];
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      colliders.push({ minX: x + sx * 4.6 - 1, maxX: x + sx * 4.6 + 1, minZ: z + sz * 4.6 - 1, maxZ: z + sz * 4.6 + 1 });
    }
  }
  return { group, colliders, spots: [
    { x: x - 5.1, y: 9.2, z: z + 5.4, phase: 0.7 },
    { x: x + 5.1, y: 9.2, z: z + 5.4, phase: 2.1 },
  ] };
}
