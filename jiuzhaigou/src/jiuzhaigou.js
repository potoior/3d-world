import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mergeStaticGroup } from './geometry.js';
import { LAKES, LAKE_BY_ID, terrainHeight, valleyCenter, waterLevelAt, WATER_Y } from './terrain.js';
import { buildWaterSystem } from './jiuzhaiWater.js';
import { buildVillageSystem } from './jiuzhaiVillage.js';

function Rnd(seed) {
  const x = Math.sin(seed * 12.9898 + 4.71) * 43758.5453;
  return x - Math.floor(x);
}
function smooth(t) {
  const v = t < 0 ? 0 : t > 1 ? 1 : t;
  return v * v * (3 - 2 * v);
}

function ellipseDist(x, z, lake) {
  const dx = (x - lake.cx) / (lake.rx * 1.14);
  const dz = (z - lake.cz) / (lake.rz * 1.14);
  return Math.sqrt(dx * dx + dz * dz);
}
function nearAnyLake(x, z, margin = 1.14) {
  for (const lake of LAKES) {
    const dx = (x - lake.cx) / (lake.rx * margin);
    const dz = (z - lake.cz) / (lake.rz * margin);
    if (dx * dx + dz * dz < 1) return true;
  }
  return false;
}
function inVillage(x, z) {
  return x > 88 && x < 194 && z > 246 && z < 376;
}
function inBoardwalk(x, z) {
  const pts = [[96, -92], [82, -34], [76, 40], [83, 133], [60, 177], [63, 231], [61, 285], [72, 362]];
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i];
    const [bx, bz] = pts[i + 1];
    const dx = bx - ax;
    const dz = bz - az;
    const len2 = dx * dx + dz * dz;
    let t = ((x - ax) * dx + (z - az) * dz) / len2;
    t = Math.max(0, Math.min(1, t));
    const px = ax + dx * t;
    const pz = az + dz * t;
    if (Math.hypot(x - px, z - pz) < 6) return true;
  }
  return false;
}

function coniferFoliageGeometry() {
  const parts = [];
  const defs = [[0.35, 0.42, 0.4], [0.26, 0.34, 0.63], [0.17, 0.3, 0.85]];
  for (const [r, h, y] of defs) {
    const g = new THREE.ConeGeometry(r, h, 8);
    g.translate(0, y, 0);
    parts.push(g);
  }
  const merged = mergeGeometries(parts, false);
  parts.forEach((g) => g.dispose());
  return merged;
}
function broadleafFoliageGeometry() {
  const parts = [];
  const defs = [[0.34, 0.19, 0.72, 0.1], [0.27, 0.16, 0.86, -0.08], [0.24, 0.15, 0.62, -0.14], [0.2, 0.13, 0.78, 0.2]];
  for (const [r, sy, y, ox] of defs) {
    const g = new THREE.IcosahedronGeometry(r, 0);
    g.scale(1.05, sy / r, 1.0);
    g.translate(ox, y, ox * 0.5);
    parts.push(g);
  }
  const merged = mergeGeometries(parts, false);
  parts.forEach((g) => g.dispose());
  return merged;
}
function trunkGeometry() {
  const g = new THREE.CylinderGeometry(0.055, 0.1, 0.62, 6);
  g.translate(0, 0.31, 0);
  return g;
}

export function createForest() {
  const conifers = [];
  const broadleafs = [];
  const ca = 0;
  for (let i = 0; i < 5200; i++) {
    const x = -620 + Rnd(i * 2.13) * 1240;
    const z = -500 + Rnd(i * 5.71 + 2) * 1080;
    if (nearAnyLake(x, z, 1.18) || inVillage(x, z) || inBoardwalk(x, z)) continue;
    const vc = Math.abs(x - valleyCenter(z));
    if (vc < 48) continue;
    const h = terrainHeight(x, z);
    if (h < WATER_Y + 0.75 || h > 164) continue;
    const slope = Math.abs(terrainHeight(x + 3, z) - terrainHeight(x - 3, z)) + Math.abs(terrainHeight(x, z + 3) - terrainHeight(x, z - 3));
    if (slope > 9.5) continue;
    if (vc > 520) continue;
    const isConifer = Rnd(i * 7.77) < (h > 26 ? 0.64 : 0.46);
    if (isConifer && conifers.length < 900) {
      conifers.push({ x, z, h, seed: i });
    } else if (!isConifer && broadleafs.length < 760) {
      broadleafs.push({ x, z, h, seed: i });
    }
    if (conifers.length >= 900 && broadleafs.length >= 760) break;
  }
  return { conifers, broadleafs };
}

function buildTreeInstances(group, info) {
  const coniferGeo = coniferFoliageGeometry();
  const broadGeo = broadleafFoliageGeometry();
  const trunkGeo = trunkGeometry();
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x58452f, roughness: 0.96, metalness: 0 });
  const coniferMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.93, metalness: 0 });
  const broadMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, metalness: 0 });
  const total = info.conifers.length + info.broadleafs.length;
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, total);
  const coniferMesh = new THREE.InstancedMesh(coniferGeo, coniferMat, info.conifers.length);
  const broadMesh = new THREE.InstancedMesh(broadGeo, broadMat, info.broadleafs.length);
  trunks.castShadow = true;
  trunks.receiveShadow = true;
  coniferMesh.castShadow = true;
  coniferMesh.receiveShadow = true;
  broadMesh.castShadow = true;
  broadMesh.receiveShadow = true;
  coniferMesh.frustumCulled = false;
  broadMesh.frustumCulled = false;
  trunks.frustumCulled = false;
  const coniferPalette = [0x244b38, 0x2e5c40, 0x3b6a45, 0x4d7449, 0x6d7338].map((c) => new THREE.Color(c));
  const broadPalette = [0x9b3426, 0xb64d25, 0xc66b25, 0xd39a2e, 0xbfb441, 0x7c8539, 0x4f6f3b].map((c) => new THREE.Color(c));
  const trunkPalette = [0x58452f, 0x4a3a27, 0x6a5136].map((c) => new THREE.Color(c));
  const dummy = new THREE.Object3D();
  let ti = 0;
  info.conifers.forEach((p, i) => {
    const height = 6.5 + Rnd(p.seed * 3.7) * 9.2;
    const width = height * (0.19 + Rnd(p.seed * 8.1) * 0.09);
    const yaw = Rnd(p.seed * 5.3) * Math.PI * 2;
    dummy.position.set(p.x, p.h, p.z);
    dummy.rotation.set(0, yaw, 0);
    dummy.scale.set(width, height, width);
    dummy.updateMatrix();
    coniferMesh.setMatrixAt(i, dummy.matrix);
    coniferMesh.setColorAt(i, coniferPalette[(p.seed + (p.h > 50 ? 3 : 0)) % coniferPalette.length]);
    dummy.scale.set(1.05 + height * 0.055, height, 1.05 + height * 0.055);
    dummy.updateMatrix();
    trunks.setMatrixAt(ti, dummy.matrix);
    trunks.setColorAt(ti, trunkPalette[ti % trunkPalette.length]);
    ti++;
  });
  info.broadleafs.forEach((p, i) => {
    const height = 5.4 + Rnd(p.seed * 4.9) * 7.4;
    const width = height * (0.54 + Rnd(p.seed * 6.3) * 0.16);
    const yaw = Rnd(p.seed * 2.7) * Math.PI * 2;
    dummy.position.set(p.x, p.h, p.z);
    dummy.rotation.set(0, yaw, 0);
    dummy.scale.set(width, height, width);
    dummy.updateMatrix();
    broadMesh.setMatrixAt(i, dummy.matrix);
    broadMesh.setColorAt(i, broadPalette[(p.seed * 3 + (p.h < 24 ? 2 : 0)) % broadPalette.length]);
    dummy.scale.set(1.1 + height * 0.06, height, 1.1 + height * 0.06);
    dummy.updateMatrix();
    trunks.setMatrixAt(ti, dummy.matrix);
    trunks.setColorAt(ti, trunkPalette[ti % trunkPalette.length]);
    ti++;
  });
  coniferMesh.instanceMatrix.needsUpdate = true;
  broadMesh.instanceMatrix.needsUpdate = true;
  trunks.instanceMatrix.needsUpdate = true;
  if (coniferMesh.instanceColor) coniferMesh.instanceColor.needsUpdate = true;
  if (broadMesh.instanceColor) broadMesh.instanceColor.needsUpdate = true;
  if (trunks.instanceColor) trunks.instanceColor.needsUpdate = true;
  group.add(trunks, coniferMesh, broadMesh);
  return { trunks: total, conifers: info.conifers.length, broadleafs: info.broadleafs.length };
}

function buildShrubs(group) {
  const geo = new THREE.IcosahedronGeometry(1, 0);
  const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.98, metalness: 0 });
  const count = 1500;
  const mesh = new THREE.InstancedMesh(geo, material, count);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  const palette = [0x8e3a24, 0xa94d24, 0xb36b2a, 0x8c7a34, 0x5f743a, 0x49673b, 0xa28a3f].map((c) => new THREE.Color(c));
  const dummy = new THREE.Object3D();
  let n = 0;
  for (let i = 0; i < 5200 && n < count; i++) {
    const x = -600 + Rnd(i * 3.19) * 1200;
    const z = -470 + Rnd(i * 7.31 + 5) * 1040;
    if (nearAnyLake(x, z, 1.06) || inVillage(x, z) || inBoardwalk(x, z)) continue;
    const vc = Math.abs(x - valleyCenter(z));
    if (vc < 34) continue;
    const h = terrainHeight(x, z);
    if (h < WATER_Y + 0.25 || h > 140) continue;
    const s = 0.45 + Rnd(i * 11.3) * 1.7;
    dummy.position.set(x, h + s * 0.16, z);
    dummy.rotation.set(Rnd(i) * 0.4, Rnd(i * 2.1) * Math.PI * 2, Rnd(i * 3.7) * 0.3);
    dummy.scale.set(s * (1.2 + Rnd(i * 5) * 0.8), s * 0.7, s);
    dummy.updateMatrix();
    mesh.setMatrixAt(n, dummy.matrix);
    mesh.setColorAt(n, palette[(i * 3) % palette.length]);
    n++;
  }
  mesh.count = n;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  group.add(mesh);
  return n;
}

function buildRocks(group) {
  const geo = new THREE.IcosahedronGeometry(1, 1);
  const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.98, metalness: 0 });
  const count = 430;
  const mesh = new THREE.InstancedMesh(geo, material, count);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  const palette = [0x7c8278, 0x6c7269, 0x8b8b79, 0x9b9179, 0x5e665d].map((c) => new THREE.Color(c));
  const dummy = new THREE.Object3D();
  let n = 0;
  for (let i = 0; i < count; i++) {
    const lake = LAKES[(i * 3 + 1) % LAKES.length];
    const a = Rnd(i * 4.3) * Math.PI * 2;
    const rim = 1.0 + Rnd(i * 6.7) * 0.22;
    const x = lake.cx + Math.cos(a) * lake.rx * rim;
    const z = lake.cz + Math.sin(a) * lake.rz * rim;
    const ground = terrainHeight(x, z);
    const s = 0.5 + Rnd(i * 8.9) * 2.2;
    dummy.position.set(x, Math.max(ground, lake.y - 0.25) + s * 0.18, z);
    dummy.rotation.set(Rnd(i) * 0.5, Rnd(i * 2.3) * Math.PI * 2, Rnd(i * 3.1) * 0.4);
    dummy.scale.set(s * (1.2 + Rnd(i * 4.2) * 0.6), s * (0.5 + Rnd(i * 5.1) * 0.35), s);
    dummy.updateMatrix();
    mesh.setMatrixAt(n, dummy.matrix);
    mesh.setColorAt(n, palette[i % palette.length]);
    n++;
  }
  mesh.count = n;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  group.add(mesh);
  return n;
}

function buildReeds(group) {
  const geo = new THREE.ConeGeometry(0.06, 1, 4);
  geo.translate(0, 0.5, 0);
  const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.94, metalness: 0, side: THREE.DoubleSide });
  const count = 1300;
  const mesh = new THREE.InstancedMesh(geo, material, count);
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  const palette = [0xa79b63, 0xbcae6d, 0x8a8d52, 0xc3b47a, 0x7c8a4e].map((c) => new THREE.Color(c));
  const dummy = new THREE.Object3D();
  let n = 0;
  for (let i = 0; i < 4600 && n < count; i++) {
    const lake = LAKES[i % LAKES.length];
    const a = Rnd(i * 3.77) * Math.PI * 2;
    const rim = 0.96 + Rnd(i * 5.19) * 0.13;
    const x = lake.cx + Math.cos(a) * lake.rx * rim;
    const z = lake.cz + Math.sin(a) * lake.rz * rim;
    const ground = terrainHeight(x, z);
    if (ground > lake.y + 2.4) continue;
    const base = Math.max(ground, lake.y - 0.08);
    const h = 0.65 + Rnd(i * 7.13) * 1.9;
    dummy.position.set(x + (Rnd(i) - 0.5) * 1.8, base, z + (Rnd(i * 2) - 0.5) * 1.8);
    dummy.rotation.set((Rnd(i * 3) - 0.5) * 0.3, Rnd(i * 4) * 6.28, (Rnd(i * 5) - 0.5) * 0.35);
    dummy.scale.set(0.7 + Rnd(i * 6) * 1.1, h, 0.7 + Rnd(i * 8) * 1.1);
    dummy.updateMatrix();
    mesh.setMatrixAt(n, dummy.matrix);
    mesh.setColorAt(n, palette[i % palette.length]);
    n++;
  }
  mesh.count = n;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  group.add(mesh);
  return n;
}

function createBirds() {
  const group = new THREE.Group();
  const birdGeoParts = [];
  const body = new THREE.BoxGeometry(0.18, 0.12, 0.55);
  birdGeoParts.push(body);
  for (const side of [-1, 1]) {
    const wing = new THREE.BoxGeometry(0.9, 0.04, 0.22);
    wing.rotateZ(side * 0.34);
    wing.translate(side * 0.46, 0.02, 0);
    birdGeoParts.push(wing);
  }
  const birdGeo = mergeGeometries(birdGeoParts, false);
  birdGeoParts.forEach((g) => g.dispose());
  const birdMat = new THREE.MeshStandardMaterial({ color: 0x26302f, roughness: 0.8, transparent: true, opacity: 0.88, side: THREE.DoubleSide });
  const count = 9;
  const mesh = new THREE.InstancedMesh(birdGeo, birdMat, count);
  mesh.frustumCulled = false;
  const birdData = [];
  for (let i = 0; i < count; i++) {
    birdData.push({ phase: i * 0.9, radius: 80 + Rnd(i * 7) * 120, y: 58 + Rnd(i * 5.3) * 46, scale: 1.0 + Rnd(i * 3.1) * 1.4 });
  }
  group.add(mesh);
  const dummy = new THREE.Object3D();
  const update = (time) => {
    birdData.forEach((u, i) => {
      const a = time * 0.055 + u.phase;
      dummy.position.set(-60 + Math.cos(a) * u.radius, u.y + Math.sin(time * 0.3 + u.phase) * 3.2, -10 + Math.sin(a) * u.radius * 0.55);
      dummy.rotation.set(Math.sin(time * 0.5 + u.phase) * 0.12, -a + Math.PI * 0.5, Math.sin(time * 2.4 + u.phase) * 0.24);
      dummy.scale.setScalar(u.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  };
  update(0);
  return { group, update, count };
}

export function buildJiuzhaigouOverlay(fog) {
  const group = new THREE.Group();
  const water = buildWaterSystem(fog);
  group.add(water.group);
  const village = buildVillageSystem();
  group.add(village.group);

  const info = createForest();
  const trees = buildTreeInstances(group, info);
  const shrubs = buildShrubs(group);
  const rocks = buildRocks(group);
  const reeds = buildReeds(group);
  const birds = createBirds();
  group.add(birds.group);

  const merged = mergeStaticGroup(group);
  const life = {
    update(time, envMix = 0) {
      water.update(time, envMix);
      village.update(time);
      birds.update(time);
    },
  };

  return {
    group: merged,
    life,
    waterMaterial: water.primary,
    stats: {
      lakes: LAKES.length,
      trees,
      shrubs,
      rocks,
      reeds,
      flags: village.flags,
      houses: village.houses,
      birds: birds.count,
      waterfalls: water.waterfallMaterials.length,
      mists: water.mists.length,
    },
  };
}
