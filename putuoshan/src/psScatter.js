import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mats } from './putuoshanTextures.js';
import { heightAt, slopeAt, isLand, fbm, SITES } from './psTerrain.js';
import { mulberry32 } from './psUtil.js';

function paint(geo, color) {
  const n = geo.attributes.position.count;
  const arr = new Float32Array(n * 3);
  const c = new THREE.Color(color);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}

function pineGeometry() {
  const parts = [];
  const trunk = new THREE.CylinderGeometry(0.22, 0.38, 3.9, 5, 1);
  trunk.translate(0, 1.95, 0);
  parts.push(paint(trunk, 0x524536));
  const layers = [
    [2.55, 3.0, 3.15, 0x31583d],
    [1.95, 2.6, 4.75, 0x386347],
    [1.35, 2.3, 6.05, 0x436f4d],
    [0.72, 1.7, 7.05, 0x4c7a52],
  ];
  for (const [r, h, y, col] of layers) {
    const cone = new THREE.ConeGeometry(r, h, 7, 1);
    cone.rotateY((r * 7) % 3);
    cone.translate(0, y, 0);
    parts.push(paint(cone, col));
  }
  const geo = mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)), false);
  geo.computeVertexNormals();
  return geo;
}

function rockGeometry() {
  const geo = new THREE.DodecahedronGeometry(1, 0);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const k = 0.8 + ((Math.sin(i * 12.7) + 1) * 0.5) * 0.4;
    p.setXYZ(i, p.getX(i) * k, p.getY(i) * 0.68, p.getZ(i) * k);
  }
  geo.computeVertexNormals();
  return geo;
}

function grassGeometry() {
  const a = new THREE.PlaneGeometry(1.0, 1.4, 1, 2);
  a.translate(0, 0.7, 0);
  const b = a.clone();
  b.rotateY(Math.PI * 0.5);
  const geo = mergeGeometries([a, b], false);
  return geo;
}

function matrixFor(x, y, z, yaw, sx, sy, sz, tilt = 0, tiltDir = 0) {
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.cos(tiltDir) * tilt, yaw, Math.sin(tiltDir) * tilt));
  const m = new THREE.Matrix4();
  m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(sx, sy, sz));
  return m;
}

export function createVegetation(isClear) {
  const group = new THREE.Group();
  group.name = 'island-vegetation';
  const rand = mulberry32(9173);
  const pines = [];
  const shrubs = [];
  const rocks = [];
  const grass = [];
  const pineMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.94, flatShading: true });
  const shrubMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, flatShading: true });
  const rockMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.98, flatShading: true });
  const grassMat = mats.grass;

  let guard = 0;
  while (pines.length < 1100 && guard < 15000) {
    guard++;
    const x = (rand() - 0.5) * 1320;
    const z = (rand() - 0.5) * 1320;
    const y = heightAt(x, z);
    if (y < 3.2 || y > 156) continue;
    if (isClear(x, z, 3.2)) continue;
    const s = slopeAt(x, z);
    if (s > 1.8) continue;
    if (y < 9 && rand() > 0.28) continue;
    const density = fbm(x * 0.015 + 4, z * 0.015 - 8, 3);
    if (density < 0.4 && rand() > 0.4) continue;
    const h = 0.75 + rand() * 0.95;
    const spread = 0.78 + rand() * 0.5;
    const lean = s > 1.1 ? 0.08 + rand() * 0.16 : rand() * 0.05;
    const leanDir = Math.atan2(z, x) + (rand() - 0.5) * 0.7;
    pines.push({ x, y: y - 0.2, z, h, spread, yaw: rand() * 6.28, lean, leanDir, tint: 0.78 + rand() * 0.35 });
  }

  guard = 0;
  while (shrubs.length < 700 && guard < 8000) {
    guard++;
    const x = (rand() - 0.5) * 1300;
    const z = (rand() - 0.5) * 1300;
    const y = heightAt(x, z);
    if (y < 3.6 || y > 152) continue;
    if (isClear(x, z, 2.0)) continue;
    if (slopeAt(x, z) > 1.7) continue;
    shrubs.push({ x, y, z, s: 0.55 + rand() * 1.25, tint: 0.72 + rand() * 0.45, yaw: rand() * 6.28 });
  }

  guard = 0;
  while (rocks.length < 620 && guard < 10000) {
    guard++;
    const x = (rand() - 0.5) * 1360;
    const z = (rand() - 0.5) * 1360;
    const y = heightAt(x, z);
    if (y < -1 || y > 130) continue;
    if (isClear(x, z, 1.8) && y > 3) continue;
    const s = slopeAt(x, z);
    if (y > 12 && s < 0.55 && rand() > 0.22) continue;
    rocks.push({
      x,
      y: y - 0.15,
      z,
      sx: 0.7 + rand() * 2.6,
      sy: 0.5 + rand() * 1.7,
      sz: 0.7 + rand() * 2.4,
      yaw: rand() * 6.28,
      tint: 0.72 + rand() * 0.4,
    });
  }

  guard = 0;
  while (grass.length < 1400 && guard < 10000) {
    guard++;
    const x = (rand() - 0.5) * 1280;
    const z = (rand() - 0.5) * 1280;
    const y = heightAt(x, z);
    if (y < 3.4 || y > 140) continue;
    if (isClear(x, z, 1.2)) continue;
    if (slopeAt(x, z) > 1.1) continue;
    grass.push({ x, y, z, s: 0.5 + rand() * 0.9, yaw: rand() * 6.28, tint: 0.7 + rand() * 0.5 });
  }

  const pineInst = new THREE.InstancedMesh(pineGeometry(), pineMat, pines.length);
  pineInst.name = 'instanced-pines';
  pineInst.castShadow = false;
  pineInst.receiveShadow = true;
  const tmpColor = new THREE.Color();
  pines.forEach((p, i) => {
    pineInst.setMatrixAt(i, matrixFor(p.x, p.y, p.z, p.yaw, p.spread, p.h, p.spread, p.lean, p.leanDir));
    tmpColor.setScalar(p.tint);
    pineInst.setColorAt(i, tmpColor);
  });
  pineInst.instanceMatrix.needsUpdate = true;
  if (pineInst.instanceColor) pineInst.instanceColor.needsUpdate = true;
  group.add(pineInst);

  const shrubInst = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), shrubMat, shrubs.length);
  shrubInst.name = 'instanced-shrubs';
  shrubInst.castShadow = false;
  shrubInst.receiveShadow = true;
  shrubs.forEach((p, i) => {
    shrubInst.setMatrixAt(i, matrixFor(p.x, p.y + p.s * 0.35, p.z, p.yaw, p.s * 1.1, p.s * 0.6, p.s, 0, 0));
    tmpColor.setRGB(0.22 * p.tint + 0.14, 0.4 * p.tint + 0.12, 0.23 * p.tint + 0.1);
    shrubInst.setColorAt(i, tmpColor);
  });
  shrubInst.instanceMatrix.needsUpdate = true;
  if (shrubInst.instanceColor) shrubInst.instanceColor.needsUpdate = true;
  group.add(shrubInst);

  const rockInst = new THREE.InstancedMesh(rockGeometry(), rockMat, rocks.length);
  rockInst.name = 'instanced-rocks';
  rockInst.castShadow = false;
  rockInst.receiveShadow = true;
  rocks.forEach((p, i) => {
    rockInst.setMatrixAt(i, matrixFor(p.x, p.y + p.sy * 0.34, p.z, p.yaw, p.sx, p.sy, p.sz));
    tmpColor.setRGB(0.5 * p.tint + 0.1, 0.5 * p.tint + 0.1, 0.47 * p.tint + 0.1);
    rockInst.setColorAt(i, tmpColor);
  });
  rockInst.instanceMatrix.needsUpdate = true;
  if (rockInst.instanceColor) rockInst.instanceColor.needsUpdate = true;
  group.add(rockInst);

  const grassInst = new THREE.InstancedMesh(grassGeometry(), grassMat, grass.length);
  grassInst.name = 'instanced-grass';
  grassInst.castShadow = false;
  grassInst.receiveShadow = false;
  grass.forEach((p, i) => {
    grassInst.setMatrixAt(i, matrixFor(p.x, p.y - 0.05, p.z, p.yaw, p.s, p.s, p.s));
  });
  grassInst.instanceMatrix.needsUpdate = true;
  group.add(grassInst);

  return {
    group,
    counts: { pines: pines.length, shrubs: shrubs.length, rocks: rocks.length, grass: grass.length },
  };
}

export function createCrowdData(groundAt) {
  const rand = mulberry32(3821);
  const monks = [];
  const pilgrims = [];
  const add = (arr, x, z, yaw, lift = 0) => arr.push({ x, y: groundAt(x, z) + lift, z, yaw: yaw ?? rand() * 6.28 });
  const p = SITES.puji;
  for (let i = 0; i < 26; i++) {
    const a = rand() * Math.PI * 2;
    const r = 8 + rand() * 34;
    add(monks, p.x + Math.cos(a) * r, p.z + Math.sin(a) * r * 0.8);
  }
  for (let i = 0; i < 82; i++) {
    const a = rand() * Math.PI * 2;
    const r = 5 + rand() * 62;
    add(pilgrims, p.x + Math.cos(a) * r, p.z + Math.sin(a) * r * 0.85);
  }
  const g = SITES.guanyin;
  for (let i = 0; i < 16; i++) {
    const a = rand() * Math.PI * 2;
    const r = 30 + rand() * 42;
    add(pilgrims, g.x + Math.cos(a) * r, g.z + Math.sin(a) * r, Math.atan2(g.x - (g.x + Math.cos(a) * r), g.z - (g.z + Math.sin(a) * r)));
  }
  for (let i = 0; i < 6; i++) add(monks, g.x - 22 + i * 8, g.z + 28 + (i % 2) * 4);
  const f = SITES.fayu;
  for (let i = 0; i < 16; i++) {
    const a = rand() * Math.PI * 2;
    const r = 8 + rand() * 34;
    add(pilgrims, f.x + Math.cos(a) * r, f.z + Math.sin(a) * r * 0.7, undefined, 9.4);
  }
  for (let i = 0; i < 10; i++) add(monks, f.x - 18 + i * 4, f.z + 18 + (i % 3) * 6, undefined, 9.4);
  const h = SITES.huiji;
  for (let i = 0; i < 8; i++) add(pilgrims, h.x - 12 + rand() * 24, h.z - 8 + rand() * 22);
  for (let i = 0; i < 4; i++) add(monks, h.x - 6 + i * 4, h.z + 12);

  const walkWays = [
    [-60, 215, -60, 155, 0.012],
    [0, 300, 0, 372, 0.01],
    [-120, 190, -220, 240, 0.008],
    [80, 160, 160, 60, 0.009],
    [-90, 90, -130, -80, 0.007],
  ];
  for (let i = 0; i < 34; i++) {
    const w = walkWays[i % walkWays.length];
    const x = w[0] + (w[2] - w[0]) * rand();
    const z = w[1] + (w[3] - w[1]) * rand();
    pilgrims.push({
      x,
      y: groundAt(x, z),
      z,
      yaw: Math.atan2(w[2] - w[0], w[3] - w[1]),
      walk: [w[0], w[1], w[2], w[3]],
      speed: w[4] * (0.8 + rand() * 0.5),
    });
  }
  return { monks, pilgrims };
}
