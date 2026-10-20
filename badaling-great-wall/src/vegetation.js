import * as THREE from 'three';
import { heightAt, slopeAt, fbm, mainSamples, southSamples } from './terrain.js';
import { mergeGeometryList } from './geometry.js';

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function distToSamplesSq(x, z, samples) {
  let best = Infinity;
  for (let i = 0; i < samples.length; i++) {
    const dx = x - samples[i].x;
    const dz = z - samples[i].z;
    const d = dx * dx + dz * dz;
    if (d < best) best = d;
  }
  return best;
}

function wallDistanceSq(x, z) {
  return Math.min(distToSamplesSq(x, z, mainSamples), distToSamplesSq(x, z, southSamples));
}

function makePineFoliage(layers) {
  const list = [];
  for (let i = 0; i < layers; i++) {
    const k = i / layers;
    const coneH = 0.32 + (1 - k) * 0.1;
    const coneR = 0.58 + (1 - k) * 0.58;
    const cy = 0.3 + k * 0.53 + coneH * 0.33;
    const geo = new THREE.ConeGeometry(coneR, coneH, 6, 1, false);
    geo.rotateY(i * 0.35);
    geo.translate(0, cy, 0);
    list.push(geo);
  }
  return mergeGeometryList(list);
}

const BL_H = 8.2;
const BL_S = 2.15;

function makeBroadleafFoliage(blobs, seed) {
  const rand = mulberry32(seed);
  const list = [];
  for (let i = 0; i < blobs; i++) {
    const r = BL_S * (0.42 + rand() * 0.3);
    const geo = new THREE.IcosahedronGeometry(r, 0);
    const px = (rand() - 0.5) * BL_S * 0.9;
    const pz = (rand() - 0.5) * BL_S * 0.9;
    const py = BL_H * (0.58 + rand() * 0.32);
    geo.scale(1.05, 0.8 + rand() * 0.25, 1.0);
    geo.rotateY(rand() * 3);
    geo.translate(px, py, pz);
    list.push(geo);
  }
  return mergeGeometryList(list);
}

function makeRockGeometry() {
  const geo = new THREE.DodecahedronGeometry(1, 0);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const n = Math.sin(pos.getX(i) * 2.3 + pos.getZ(i) * 3.1);
    pos.setXYZ(i,
      pos.getX(i) * (0.92 + n * 0.1),
      pos.getY(i) * (0.86 + n * 0.08),
      pos.getZ(i) * (0.94 - n * 0.08)
    );
  }
  geo.computeVertexNormals();
  return geo;
}

function makeCliffGeometry() {
  const geo = new THREE.DodecahedronGeometry(1, 1);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const n = Math.sin(pos.getX(i) * 2.1 + pos.getZ(i) * 3.7);
    pos.setXYZ(i,
      pos.getX(i) * (0.86 + n * 0.12),
      pos.getY(i) * (0.74 + n * 0.1),
      pos.getZ(i) * (0.82 - n * 0.1)
    );
  }
  geo.computeVertexNormals();
  return geo;
}

function makeGrassGeometry() {
  const a = new THREE.PlaneGeometry(1, 1);
  a.translate(0, 0.5, 0);
  const b = a.clone();
  b.rotateY(Math.PI * 0.5);
  return mergeGeometryList([a, b]);
}

const trunkGeo = (() => {
  const geo = new THREE.CylinderGeometry(0.62, 1, 1, 6, 1, true);
  geo.translate(0, 0.5, 0);
  return geo;
})();

const pineGeo3 = makePineFoliage(3);
const pineGeo4 = makePineFoliage(4);
const broadleafGeo3 = makeBroadleafFoliage(3, 311);
const broadleafGeo4 = makeBroadleafFoliage(4, 733);
const broadleafGeo5 = makeBroadleafFoliage(5, 977);
const shrubGeo = new THREE.IcosahedronGeometry(1, 0);
const rockGeo = makeRockGeometry();
const cliffGeo = makeCliffGeometry();
const grassGeo = makeGrassGeometry();

const foliageMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.94 });
const trunkMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.99 });
const rockMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.98, flatShading: true });
const grassMat = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide, roughness: 0.98 });

const PINE_COLORS = [0x2f5c44, 0x3f7350, 0x5f8f5a, 0x50704c];
const AUTUMN_COLORS = [0x9c7237, 0xbb8f4c, 0xa9632f, 0xc0803a];
const SHRUB_COLORS = [0x4f8048, 0x6a965c, 0x8f7f51, 0x9a6c3c, 0x7d7a4a];
const GRASS_COLORS = [0x8a8757, 0x8f8a58, 0x9b8a5e];
const ROCK_COLORS = [0x8c8e84, 0xa2a59a, 0x968b78];
const CLIFF_COLORS = [0x7f8079, 0x8c8e84, 0x948a78];

function shadeColor(hex, x, z, amount = 0.12) {
  const c = new THREE.Color(hex);
  const n = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
  const f = 1 - amount * 0.5 + (n - Math.floor(n)) * amount;
  return c.multiplyScalar(f);
}

function buildInstanced(items, geo, mat, name, cast, receive = true, cull = true) {
  if (!items.length) return null;
  const mesh = new THREE.InstancedMesh(geo, mat, items.length);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    dummy.position.set(it.x, it.y, it.z);
    dummy.rotation.set(0, it.ry || 0, 0);
    dummy.scale.set(it.sx, it.sy, it.sz);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    if (it.color !== undefined) mesh.setColorAt(i, it.color);
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  mesh.frustumCulled = cull;
  mesh.name = name;
  mesh.computeBoundingSphere();
  return mesh;
}

export function createVegetation() {
  const root = new THREE.Group();
  root.name = 'forest-and-shrub';
  const rand = mulberry32(93071);
  const trunks = [];
  const pine3 = [];
  const pine4 = [];
  const broad3 = [];
  const broad4 = [];
  const broad5 = [];
  const shrubs = [];
  const rocks = [];
  const cliffs = [];
  const grass = [];
  const rockProbe = new THREE.DodecahedronGeometry(1, 0).attributes.position.count;
  const cliffProbe = new THREE.DodecahedronGeometry(1, 1).attributes.position.count;

  let pines = 0;
  let broadleaf = 0;
  let shrubsCount = 0;
  let rocksCount = 0;
  let grassCount = 0;
  let cliffsCount = 0;

  function addPine(x, y, z, height, spread) {
    const variant = rand();
    const rot = rand() * Math.PI * 2;
    const radius = 0.33 + height * 0.014;
    trunks.push({
      x, y: y - 0.55, z, ry: rot,
      sx: radius, sy: height * 0.48, sz: radius,
      color: shadeColor(0x51453a, x, z, 0.18),
    });
    const layers = 3 + (rand() < 0.55 ? 1 : 0);
    const item = {
      x, y, z, ry: rot,
      sx: spread, sy: height, sz: spread,
      color: shadeColor(PINE_COLORS[variant < 0.34 ? 0 : variant < 0.68 ? 1 : variant < 0.9 ? 2 : 3], x, z, 0.26),
    };
    (layers === 4 ? pine4 : pine3).push(item);
    pines++;
  }

  function addBroadleaf(x, y, z, height, spread) {
    const variant = rand();
    const rot = rand() * Math.PI * 2;
    const radius = 0.28 + height * 0.011;
    trunks.push({
      x, y: y - 0.45, z, ry: rot,
      sx: radius, sy: height * 0.55, sz: radius,
      color: shadeColor(0x51453a, x, z, 0.18),
    });
    const blobs = 3 + (rand() * 3 | 0);
    for (let i = 0; i < blobs * 6; i++) rand();
    const item = {
      x, y, z, ry: rot,
      sx: spread / BL_S, sy: height / BL_H, sz: spread / BL_S,
      color: shadeColor(AUTUMN_COLORS[variant < 0.34 ? 0 : variant < 0.64 ? 1 : variant < 0.86 ? 2 : 3], x, z, 0.24),
    };
    if (blobs === 3) broad3.push(item);
    else if (blobs === 4) broad4.push(item);
    else broad5.push(item);
    broadleaf++;
  }

  function addShrub(x, y, z, radius) {
    const v = rand();
    let key;
    if (v < 0.36) key = 0;
    else if (v < 0.62) key = 1;
    else if (v < 0.82) key = 2;
    else key = rand() < 0.6 ? 3 : 4;
    const sx = 1.2 + rand() * 0.45;
    const sy = 0.62 + rand() * 0.35;
    const sz = 1.1 + rand() * 0.4;
    const ry = rand() * Math.PI;
    shrubs.push({
      x, y: y + radius * 0.42, z, ry,
      sx: sx * radius, sy: sy * radius, sz: sz * radius,
      color: shadeColor(SHRUB_COLORS[key], x, z, 0.24),
    });
    shrubsCount++;
  }

  function addGrass(x, y, z, size) {
    const gv = rand();
    const bucket = gv < 0.42 ? 0 : gv < 0.8 ? 1 : 2;
    const rot = rand() * Math.PI;
    const wA = 0.7 + rand() * 0.5;
    const hA = 1.0 + rand() * 0.7;
    const wB = 0.7 + rand() * 0.5;
    const hB = 1.0 + rand() * 0.7;
    const w = size * (wA + wB) * 0.5;
    const h = size * (hA + hB) * 0.5;
    grass.push({
      x, y: y - 0.08, z, ry: rot,
      sx: w, sy: h, sz: w,
      color: shadeColor(GRASS_COLORS[bucket], x, z, 0.2),
    });
    grassCount++;
  }

  function addCliffBand(x, y, z, size) {
    const cv = rand();
    const key = cv < 0.5 ? 0 : cv < 0.82 ? 1 : 2;
    const stretch = 1.4 + rand() * 2.2;
    let s0 = 0.5, s1 = 0.5, s2 = 0.5;
    for (let i = 0; i < cliffProbe; i++) {
      const a = rand();
      const b = rand();
      const c = rand();
      if (i === 0) { s0 = a; s1 = b; s2 = c; }
    }
    const ry = rand() * Math.PI;
    const lift = rand() * 0.25;
    cliffs.push({
      x, y: y + size * (0.22 + lift), z, ry,
      sx: size * stretch * (0.8 + s0 * 0.16),
      sy: size * (0.62 + s1 * 0.4),
      sz: size * (0.7 + s2 * 0.5),
      color: shadeColor(CLIFF_COLORS[key], x, z, 0.2),
    });
    cliffsCount++;
  }

  function addRock(x, y, z, size) {
    const key = rand() < 0.55 ? 0 : 1;
    let s0 = 0.5, s1 = 0.5, s2 = 0.5;
    for (let i = 0; i < rockProbe; i++) {
      const a = rand();
      const b = rand();
      const c = rand();
      if (i === 0) { s0 = a; s1 = b; s2 = c; }
    }
    const ry = rand() * Math.PI;
    const lift = rand() * 0.25;
    rocks.push({
      x, y: y + size * (0.28 + lift * 0.7), z, ry,
      sx: size * (0.7 + s0 * 0.6),
      sy: size * (0.55 + s1 * 0.45),
      sz: size * (0.75 + s2 * 0.5),
      color: shadeColor(ROCK_COLORS[key], x, z, 0.22),
    });
    rocksCount++;
  }

  for (let cluster = 0; cluster < 1400; cluster++) {
    const x = (rand() - 0.5) * 2320;
    const z = (rand() - 0.5) * 2320;
    if (Math.abs(x) > 1160 || Math.abs(z) > 1160) continue;
    const y = heightAt(x, z);
    if (y < 8 || y > 248) continue;
    const d2 = wallDistanceSq(x, z);
    if (d2 < 17 * 17) continue;
    const slope = slopeAt(x, z);
    if (slope > 1.5) continue;
    const density = fbm(x * 0.013 + 3.4, z * 0.013 - 7.9, 3);
    const nearRidge = d2 < 230 * 230 ? 0.16 : 0;
    if (density + nearRidge < 0.41 && rand() > 0.28) continue;

    const count = 1 + (rand() * (density > 0.56 ? 5 : 3) | 0);
    for (let i = 0; i < count; i++) {
      const tx = x + (rand() - 0.5) * 22;
      const tz = z + (rand() - 0.5) * 22;
      if (Math.abs(tx) > 1180 || Math.abs(tz) > 1180) continue;
      if (wallDistanceSq(tx, tz) < 13 * 13) continue;
      const ty = heightAt(tx, tz);
      if (ty < 6 || ty > 252) continue;
      if (slopeAt(tx, tz) > 1.6) continue;
      const r = rand();
      if (r < 0.62) {
        addPine(tx, ty, tz, 7.5 + rand() * 8.5, 1.8 + rand() * 1.4);
      } else {
        addBroadleaf(tx, ty, tz, 5.5 + rand() * 5.6, 1.7 + rand() * 1.2);
      }
    }

    if (rand() < 0.64) {
      const countShrub = 1 + (rand() * 4 | 0);
      for (let i = 0; i < countShrub; i++) {
        const sx = x + (rand() - 0.5) * 34;
        const sz = z + (rand() - 0.5) * 34;
        if (wallDistanceSq(sx, sz) < 8 * 8) continue;
        const sy = heightAt(sx, sz);
        addShrub(sx, sy, sz, 0.6 + rand() * 1.3);
      }
    }
  }

  for (let i = 0; i < 470; i++) {
    const x = (rand() - 0.5) * 2300;
    const z = (rand() - 0.5) * 2300;
    if (Math.abs(x) > 1160 || Math.abs(z) > 1160) continue;
    if (wallDistanceSq(x, z) < 10 * 10) continue;
    const slope = slopeAt(x, z);
    if (slope < 0.42 && rand() > 0.24) continue;
    const y = heightAt(x, z);
    if (y > 250) continue;
    addRock(x, y, z, 1.7 + rand() * 5.4);
  }

  for (let i = 0; i < 210; i++) {
    const useSouth = rand() < 0.22;
    const samples = useSouth ? southSamples : mainSamples;
    const idx = 2 + ((rand() * (samples.length - 5)) | 0);
    const s0 = samples[idx];
    const s1 = samples[idx + 1];
    const dx = s1.x - s0.x;
    const dz = s1.z - s0.z;
    const len = Math.hypot(dx, dz) || 1;
    const side = rand() < 0.5 ? 1 : -1;
    const off = side * (10 + rand() * 28);
    const x = s0.x + (-dz / len) * off + (rand() - 0.5) * 5;
    const z = s0.z + (dx / len) * off + (rand() - 0.5) * 5;
    if (wallDistanceSq(x, z) < 8 * 8) continue;
    const y = heightAt(x, z);
    addRock(x, y, z, 1.9 + rand() * 4.6);
  }

  for (const side of [1, -1]) {
    for (let i = 0; i < 85; i++) {
      const sample = mainSamples[12 + ((rand() * 168) | 0)];
      const offset = side * (17 + rand() * 68);
      const nx = -(sample.z - mainSamples[0].z);
      const nz = sample.x - mainSamples[0].x;
      const len = Math.hypot(nx, nz) || 1;
      const x = sample.x + (nx / len) * offset + (rand() - 0.5) * 12;
      const z = sample.z + (nz / len) * offset + (rand() - 0.5) * 12;
      if (wallDistanceSq(x, z) < 11 * 11) continue;
      const y = heightAt(x, z);
      addPine(x, y, z, 7 + rand() * 8, 1.7 + rand() * 1.5);
    }
  }

  for (let i = 0; i < 420; i++) {
    const useSouth = rand() < 0.26;
    const samples = useSouth ? southSamples : mainSamples;
    const idx = 3 + ((rand() * (samples.length - 8)) | 0);
    const s0 = samples[idx];
    const s1 = samples[idx + 1];
    const dx = s1.x - s0.x;
    const dz = s1.z - s0.z;
    const len = Math.hypot(dx, dz) || 1;
    const side = rand() < 0.5 ? 1 : -1;
    const off = side * (17 + rand() * 48);
    const x = s0.x + (-dz / len) * off + (rand() - 0.5) * 10;
    const z = s0.z + (dx / len) * off + (rand() - 0.5) * 10;
    if (wallDistanceSq(x, z) < 15 * 15) continue;
    const y = heightAt(x, z);
    if (y < 8 || y > 246) continue;
    if (slopeAt(x, z) > 1.7) continue;
    if (rand() < 0.66) {
      addPine(x, y, z, 7 + rand() * 8, 1.7 + rand() * 1.5);
    } else {
      addBroadleaf(x, y, z, 5 + rand() * 5, 1.6 + rand() * 1.2);
    }
  }

  for (let i = 0; i < 420; i++) {
    const useSouth = rand() < 0.3;
    const samples = useSouth ? southSamples : mainSamples;
    const idx = 3 + ((rand() * (samples.length - 8)) | 0);
    const s0 = samples[idx];
    const s1 = samples[idx + 1];
    const dx = s1.x - s0.x;
    const dz = s1.z - s0.z;
    const len = Math.hypot(dx, dz) || 1;
    const side = rand() < 0.5 ? 1 : -1;
    const off = side * (12 + rand() * 24);
    const x = s0.x + (-dz / len) * off + (rand() - 0.5) * 8;
    const z = s0.z + (dx / len) * off + (rand() - 0.5) * 8;
    if (wallDistanceSq(x, z) < 9 * 9) continue;
    const y = heightAt(x, z);
    if (rand() < 0.58) {
      addShrub(x, y, z, 0.6 + rand() * 1.1);
    } else {
      addGrass(x, y, z, 0.45 + rand() * 0.7);
    }
  }

  for (let i = 0; i < 1500; i++) {
    const useSouth = rand() < 0.28;
    const samples = useSouth ? southSamples : mainSamples;
    const idx = 2 + ((rand() * (samples.length - 6)) | 0);
    const s0 = samples[idx];
    const s1 = samples[idx + 1];
    const dx = s1.x - s0.x;
    const dz = s1.z - s0.z;
    const len = Math.hypot(dx, dz) || 1;
    const side = rand() < 0.5 ? 1 : -1;
    const off = side * (10 + rand() * 34);
    const x = s0.x + (-dz / len) * off + (rand() - 0.5) * 9;
    const z = s0.z + (dx / len) * off + (rand() - 0.5) * 9;
    if (wallDistanceSq(x, z) < 6.2 * 6.2) continue;
    const y = heightAt(x, z);
    addGrass(x, y, z, 0.35 + rand() * 0.65);
  }

  for (let i = 0; i < 120; i++) {
    const useSouth = rand() < 0.24;
    const samples = useSouth ? southSamples : mainSamples;
    const idx = 3 + ((rand() * (samples.length - 8)) | 0);
    const s0 = samples[idx];
    const s1 = samples[idx + 1];
    const dx = s1.x - s0.x;
    const dz = s1.z - s0.z;
    const len = Math.hypot(dx, dz) || 1;
    const side = rand() < 0.5 ? 1 : -1;
    const off = side * (22 + rand() * 70);
    const x = s0.x + (-dz / len) * off + (rand() - 0.5) * 18;
    const z = s0.z + (dx / len) * off + (rand() - 0.5) * 18;
    if (wallDistanceSq(x, z) < 18 * 18) continue;
    const y = heightAt(x, z);
    addCliffBand(x, y, z, 2.2 + rand() * 4.8);
  }

  const viewAnchors = [
    { samples: mainSamples, t: 0.062 }, { samples: mainSamples, t: 0.268 },
    { samples: mainSamples, t: 0.522 }, { samples: southSamples, t: 0.92 },
    { samples: mainSamples, t: 0.152 }, { samples: mainSamples, t: 0.392 },
  ];
  for (const anchor of viewAnchors) {
    const idx = Math.min(anchor.samples.length - 3, Math.max(2, Math.round(anchor.t * (anchor.samples.length - 1))));
    const s0 = anchor.samples[idx];
    const s1 = anchor.samples[idx + 1];
    const dx = s1.x - s0.x;
    const dz = s1.z - s0.z;
    const len = Math.hypot(dx, dz) || 1;
    for (const side of [1, -1]) {
      for (let j = 0; j < 15; j++) {
        const off = side * (23 + rand() * 58);
        const x = s0.x + (-dz / len) * off + (rand() - 0.5) * 14;
        const z = s0.z + (dx / len) * off + (rand() - 0.5) * 14;
        if (wallDistanceSq(x, z) < 17 * 17) continue;
        const y = heightAt(x, z);
        if (y < 6 || y > 252 || slopeAt(x, z) > 1.85) continue;
        const r = rand();
        if (r < 0.58) addPine(x, y, z, 6.5 + rand() * 9, 1.6 + rand() * 1.5);
        else addBroadleaf(x, y, z, 5 + rand() * 5.5, 1.5 + rand() * 1.2);
        if (rand() < 0.72) {
          const px = x + (rand() - 0.5) * 11;
          const pz = z + (rand() - 0.5) * 11;
          addShrub(px, heightAt(px, pz), pz, 0.55 + rand() * 1.25);
        }
        if (rand() < 0.5) {
          const gx = x + (rand() - 0.5) * 15;
          const gz = z + (rand() - 0.5) * 15;
          addGrass(gx, heightAt(gx, gz), gz, 0.4 + rand() * 0.6);
        }
      }
    }
  }

  for (let i = 0; i < 210; i++) {
    const useSouth = rand() < 0.3;
    const samples = useSouth ? southSamples : mainSamples;
    const idx = 2 + ((rand() * (samples.length - 6)) | 0);
    const s0 = samples[idx];
    const s1 = samples[idx + 1];
    const dx = s1.x - s0.x;
    const dz = s1.z - s0.z;
    const len = Math.hypot(dx, dz) || 1;
    const side = rand() < 0.5 ? 1 : -1;
    const off = side * (19 + rand() * 46);
    const x = s0.x + (-dz / len) * off + (rand() - 0.5) * 12;
    const z = s0.z + (dx / len) * off + (rand() - 0.5) * 12;
    if (wallDistanceSq(x, z) < 14 * 14) continue;
    const y = heightAt(x, z);
    if (y < 5 || y > 252 || slopeAt(x, z) > 1.9) continue;
    addCliffBand(x, y, z, 2.8 + rand() * 6.2);
    if (rand() < 0.6) addRock(x + (rand() - 0.5) * 8, heightAt(x + (rand() - 0.5) * 7, z + (rand() - 0.5) * 7), z + (rand() - 0.5) * 8, 1.4 + rand() * 3.4);
  }

  for (let i = 0; i < 1200; i++) {
    const useSouth = rand() < 0.27;
    const samples = useSouth ? southSamples : mainSamples;
    const idx = 2 + ((rand() * (samples.length - 6)) | 0);
    const s0 = samples[idx];
    const s1 = samples[idx + 1];
    const dx = s1.x - s0.x;
    const dz = s1.z - s0.z;
    const len = Math.hypot(dx, dz) || 1;
    const side = rand() < 0.5 ? 1 : -1;
    const off = side * (7 + rand() * 30);
    const x = s0.x + (-dz / len) * off + (rand() - 0.5) * 8;
    const z = s0.z + (dx / len) * off + (rand() - 0.5) * 8;
    if (wallDistanceSq(x, z) < 6.5 * 6.5) continue;
    const y = heightAt(x, z);
    addGrass(x, y, z, 0.32 + rand() * 0.62);
    if (rand() < 0.22) {
      const px = x + (rand() - 0.5) * 4;
      const pz = z + (rand() - 0.5) * 4;
      addShrub(px, heightAt(px, pz), pz, 0.45 + rand() * 0.8);
    }
  }

  const meshes = [
    buildInstanced(trunks, trunkGeo, trunkMat, 'tree-trunks', true),
    buildInstanced(pine3, pineGeo3, foliageMat, 'pines-3', true),
    buildInstanced(pine4, pineGeo4, foliageMat, 'pines-4', true),
    buildInstanced(broad3, broadleafGeo3, foliageMat, 'broadleaf-3', true),
    buildInstanced(broad4, broadleafGeo4, foliageMat, 'broadleaf-4', true),
    buildInstanced(broad5, broadleafGeo5, foliageMat, 'broadleaf-5', true),
    buildInstanced(shrubs, shrubGeo, foliageMat, 'shrubs', false),
    buildInstanced(rocks, rockGeo, rockMat, 'rocks', false),
    buildInstanced(cliffs, cliffGeo, rockMat, 'cliff-bands', false),
    buildInstanced(grass, grassGeo, grassMat, 'grass-tufts', false, true, false),
  ];
  meshes.forEach((m) => m && root.add(m));

  return { group: root, counts: { pines, broadleaf, shrubs: shrubsCount, rocks: rocksCount, grass: grassCount, cliffs: cliffsCount } };
}

