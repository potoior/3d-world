import * as THREE from 'three';
import { heightAt, slopeAt, fbm, mainSamples, southSamples } from './terrain.js';
import { mats } from './materials.js';
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

function pushCone(list, radius, height, x, y, z, rot, segments = 7) {
  const geo = new THREE.ConeGeometry(radius, height, segments, 1, false);
  geo.rotateY(rot);
  geo.translate(x, y, z);
  list.push(geo);
}

function pushTrunk(list, radius, height, x, y, z, rot) {
  const geo = new THREE.CylinderGeometry(radius * 0.62, radius, height, 6, 1, false);
  geo.rotateY(rot);
  geo.translate(x, y + height * 0.5, z);
  list.push(geo);
}

function addPine(buckets, trunks, x, y, z, height, spread, rand) {
  const variant = rand();
  const bucket = variant < 0.38 ? buckets.pineDeep : variant < 0.75 ? buckets.pine : buckets.pineLight;
  const rot = rand() * Math.PI * 2;
  pushTrunk(trunks, 0.33 + height * 0.014, height * 0.48, x, y - 0.55, z, rot);

  const layers = 3 + (rand() < 0.55 ? 1 : 0);
  for (let i = 0; i < layers; i++) {
    const k = i / layers;
    const coneH = height * (0.32 + (1 - k) * 0.1);
    const coneR = spread * (0.58 + (1 - k) * 0.58);
    const cy = y + height * (0.3 + k * 0.53) + coneH * 0.33;
    pushCone(bucket, coneR, coneH, x, cy, z, rot + i * 0.35, 7);
  }
}

function addBroadleaf(buckets, trunks, x, y, z, height, spread, rand) {
  const variant = rand();
  const bucket = variant < 0.38 ? buckets.autumn : variant < 0.72 ? buckets.autumnLight : buckets.autumnRust;
  const rot = rand() * Math.PI * 2;
  pushTrunk(trunks, 0.28 + height * 0.011, height * 0.55, x, y - 0.45, z, rot);
  const blobs = 3 + (rand() * 3 | 0);
  for (let i = 0; i < blobs; i++) {
    const r = spread * (0.42 + rand() * 0.3);
    const geo = new THREE.IcosahedronGeometry(r, 0);
    const px = x + (rand() - 0.5) * spread * 0.9;
    const pz = z + (rand() - 0.5) * spread * 0.9;
    const py = y + height * (0.58 + rand() * 0.32);
    geo.scale(1.05, 0.8 + rand() * 0.25, 1.0);
    geo.rotateY(rand() * 3);
    geo.translate(px, py, pz);
    bucket.push(geo);
  }
}

function addShrub(buckets, x, y, z, radius, rand) {
  const bucket = rand() < 0.45 ? buckets.shrub : rand() < 0.68 ? buckets.shrubLight : buckets.shrubDry;
  const geo = new THREE.IcosahedronGeometry(radius, 0);
  geo.scale(1.2 + rand() * 0.45, 0.62 + rand() * 0.35, 1.1 + rand() * 0.4);
  geo.rotateY(rand() * Math.PI);
  geo.translate(x, y + radius * 0.42, z);
  bucket.push(geo);
}

function addGrass(buckets, x, y, z, size, rand) {
  const bucket = rand() < 0.5 ? buckets.grass : buckets.grassDry;
  const rot = rand() * Math.PI;
  for (let k = 0; k < 2; k++) {
    const geo = new THREE.PlaneGeometry(size * (0.7 + rand() * 0.5), size * (1.0 + rand() * 0.7));
    geo.translate(0, size * 0.5, 0);
    geo.rotateY(rot + k * Math.PI * 0.5);
    geo.translate(x, y - 0.08, z);
    bucket.push(geo);
  }
}

function addCliffBand(buckets, x, y, z, size, rand) {
  const bucket = rand() < 0.55 ? buckets.cliff : buckets.rock;
  const geo = new THREE.DodecahedronGeometry(size, 1);
  const p = geo.attributes.position;
  const stretch = 1.4 + rand() * 2.2;
  for (let i = 0; i < p.count; i++) {
    const n = Math.sin(p.getX(i) * 2.1 + p.getZ(i) * 3.7 + rand() * 0.4);
    p.setXYZ(i,
      p.getX(i) * stretch * (0.8 + n * 0.16),
      p.getY(i) * (0.62 + rand() * 0.4),
      p.getZ(i) * (0.7 + rand() * 0.5)
    );
  }
  geo.computeVertexNormals();
  geo.rotateY(rand() * Math.PI);
  geo.translate(x, y + size * (0.22 + rand() * 0.25), z);
  bucket.push(geo);
}

function addRock(buckets, x, y, z, size, rand) {
  const bucket = rand() < 0.55 ? buckets.rock : buckets.rockLight;
  const geo = new THREE.DodecahedronGeometry(size, 0);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const sx = 0.7 + rand() * 0.6;
    const sy = 0.55 + rand() * 0.45;
    const sz = 0.75 + rand() * 0.5;
    pos.setXYZ(i, pos.getX(i) * sx, pos.getY(i) * sy, pos.getZ(i) * sz);
  }
  geo.computeVertexNormals();
  geo.rotateY(rand() * Math.PI);
  geo.translate(x, y + size * 0.28, z);
  bucket.push(geo);
}

function mergeBucket(bucket, material, name) {
  if (!bucket.length) return null;
  const geo = mergeGeometryList(bucket);
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = name;
  return mesh;
}

export function createVegetation() {
  const root = new THREE.Group();
  root.name = 'forest-and-shrub';
  const rand = mulberry32(93071);
  const buckets = {
    pineDeep: [],
    pine: [],
    pineLight: [],
    autumn: [],
    autumnLight: [],
    autumnRust: [],
    shrub: [],
    shrubLight: [],
    shrubDry: [],
    rock: [],
    rockLight: [],
    cliff: [],
    grass: [],
    grassDry: [],
  };
  const trunks = [];

  let pines = 0;
  let broadleaf = 0;
  let shrubs = 0;
  let rocks = 0;
  let grass = 0;
  let cliffs = 0;

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
        addPine(buckets, trunks, tx, ty, tz, 7.5 + rand() * 8.5, 1.8 + rand() * 1.4, rand);
        pines++;
      } else {
        addBroadleaf(buckets, trunks, tx, ty, tz, 5.5 + rand() * 5.6, 1.7 + rand() * 1.2, rand);
        broadleaf++;
      }
    }

    if (rand() < 0.64) {
      const countShrub = 1 + (rand() * 4 | 0);
      for (let i = 0; i < countShrub; i++) {
        const sx = x + (rand() - 0.5) * 34;
        const sz = z + (rand() - 0.5) * 34;
        if (wallDistanceSq(sx, sz) < 8 * 8) continue;
        const sy = heightAt(sx, sz);
        addShrub(buckets, sx, sy, sz, 0.6 + rand() * 1.3, rand);
        shrubs++;
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
    addRock(buckets, x, y, z, 1.7 + rand() * 5.4, rand);
    rocks++;
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
    addRock(buckets, x, y, z, 1.9 + rand() * 4.6, rand);
    rocks++;
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
      addPine(buckets, trunks, x, y, z, 7 + rand() * 8, 1.7 + rand() * 1.5, rand);
      pines++;
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
      addPine(buckets, trunks, x, y, z, 7 + rand() * 8, 1.7 + rand() * 1.5, rand);
      pines++;
    } else {
      addBroadleaf(buckets, trunks, x, y, z, 5 + rand() * 5, 1.6 + rand() * 1.2, rand);
      broadleaf++;
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
      addShrub(buckets, x, y, z, 0.6 + rand() * 1.1, rand);
      shrubs++;
    } else {
      addGrass(buckets, x, y, z, 0.45 + rand() * 0.7, rand);
      grass++;
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
    addGrass(buckets, x, y, z, 0.35 + rand() * 0.65, rand);
    grass++;
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
    addCliffBand(buckets, x, y, z, 2.2 + rand() * 4.8, rand);
    cliffs++;
  }

  const meshes = [
    mergeBucket(trunks, mats.trunk, 'tree-trunks'),
    mergeBucket(buckets.pineDeep, mats.pineDeep, 'pines-deep'),
    mergeBucket(buckets.pine, mats.pine, 'pines-mid'),
    mergeBucket(buckets.pineLight, mats.pineLight, 'pines-light'),
    mergeBucket(buckets.autumn, mats.autumn, 'autumn-trees'),
    mergeBucket(buckets.autumnLight, mats.autumnLight, 'autumn-trees-light'),
    mergeBucket(buckets.autumnRust, mats.autumnRust, 'autumn-trees-rust'),
    mergeBucket(buckets.shrub, mats.shrub, 'shrubs'),
    mergeBucket(buckets.shrubLight, mats.shrubLight, 'shrubs-light'),
    mergeBucket(buckets.shrubDry, mats.shrubDry, 'shrubs-dry'),
    mergeBucket(buckets.rock, mats.rock, 'rocks'),
    mergeBucket(buckets.rockLight, mats.rockLight, 'rocks-light'),
    mergeBucket(buckets.cliff, mats.cliff, 'cliff-bands'),
    mergeBucket(buckets.grass, mats.grass, 'grass-tufts'),
    mergeBucket(buckets.grassDry, mats.grass, 'grass-tufts-dry'),
  ];
  meshes.forEach((m) => m && root.add(m));

  return { group: root, counts: { pines, broadleaf, shrubs, rocks, grass, cliffs } };
}
