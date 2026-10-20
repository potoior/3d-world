import * as THREE from 'three';

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

function hash2(x, z) {
  const h = Math.sin(x * 127.1 + z * 311.7) * 43758.5453123;
  return h - Math.floor(h);
}

function fade(t) {
  return t * t * (3 - 2 * t);
}

function valueNoise(x, z) {
  const xi = Math.floor(x);
  const zi = Math.floor(z);
  const xf = x - xi;
  const zf = z - zi;
  const u = fade(xf);
  const v = fade(zf);
  const a = hash2(xi, zi);
  const b = hash2(xi + 1, zi);
  const c = hash2(xi, zi + 1);
  const d = hash2(xi + 1, zi + 1);
  return (a + (b - a) * u) * (1 - v) + (c + (d - c) * u) * v;
}

export function fbm(x, z, octaves = 4) {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += valueNoise(x * freq, z * freq) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2.03;
  }
  return sum / norm;
}

function smoothstep(a, b, x) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export function heightAt(x, z) {
  const macro = fbm(x * 0.0042 + 3.4, z * 0.0042 - 1.8, 3) - 0.5;
  const detail = fbm(x * 0.021 - 7.1, z * 0.021 + 4.3, 3) - 0.5;
  const fine = fbm(x * 0.085 + 2.2, z * 0.085 - 5.6, 2) - 0.5;
  const dist = Math.hypot(x, z);
  const flat = smoothstep(118, 360, dist);
  let h = 0.55 + macro * 10.5 * flat + detail * (2.6 + flat * 5.4) + fine * 0.8;
  const channel = Math.exp(-Math.pow((z + 0.34 * x + 150) / 62, 2));
  h -= channel * (1.0 + flat * 1.6);
  if (h < 0.12) h = 0.12;
  return h;
}

export function slopeAt(x, z) {
  const e = 3;
  const hx = heightAt(x + e, z) - heightAt(x - e, z);
  const hz = heightAt(x, z + e) - heightAt(x, z - e);
  return Math.hypot(hx, hz) / (2 * e);
}

export function createTerrain(material, size = 3400, segments = 260) {
  const geo = new THREE.PlaneGeometry(size, size, segments, segments);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const cSand = new THREE.Color(0xb99a6d);
  const cPale = new THREE.Color(0xcdb184);
  const cGravel = new THREE.Color(0x8f7959);
  const cDark = new THREE.Color(0x756248);
  const cDry = new THREE.Color(0xa38b5f);
  const cSalt = new THREE.Color(0xc9c0a4);
  const tmp = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, heightAt(x, z));
  }
  geo.computeVertexNormals();
  const normals = geo.attributes.normal;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const y = pos.getY(i);
    const steep = smoothstep(0.92, 0.55, normals.getY(i));
    const n = fbm(x * 0.036 + 12.5, z * 0.036 - 9.2, 3);
    const patch = fbm(x * 0.011 - 2.7, z * 0.011 + 7.1, 2);
    const gravel = smoothstep(0.54, 0.72, n);
    const dry = smoothstep(0.46, 0.7, patch);
    const salt = smoothstep(0.68, 0.86, fbm(x * 0.06 + 4.4, z * 0.06 - 1.2, 2));
    const channel = Math.exp(-Math.pow((z + 0.34 * x + 150) / 70, 2));
    tmp.copy(cSand).lerp(cPale, 0.26 + n * 0.3);
    tmp.lerp(cDry, dry * 0.42);
    tmp.lerp(cGravel, gravel * 0.7 + steep * 0.45);
    tmp.lerp(cDark, Math.max(0, n - 0.67) * 2.2);
    tmp.lerp(cSalt, salt * 0.2 + channel * 0.16);
    const jitter = 0.92 + hash2(Math.floor(x * 0.48), Math.floor(z * 0.48)) * 0.16;
    colors[i * 3] = tmp.r * jitter;
    colors[i * 3 + 1] = tmp.g * jitter;
    colors[i * 3 + 2] = tmp.b * jitter;
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mesh = new THREE.Mesh(geo, material);
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  mesh.name = 'jiayuguan-gobi-terrain';
  return mesh;
}

function mergeSimple(list) {
  const positions = [];
  const normals = [];
  for (const g of list) {
    const geo = g.index ? g.toNonIndexed() : g;
    const p = geo.attributes.position;
    const n = geo.attributes.normal;
    for (let i = 0; i < p.count; i++) {
      positions.push(p.getX(i), p.getY(i), p.getZ(i));
      normals.push(n.getX(i), n.getY(i), n.getZ(i));
    }
    if (geo !== g) geo.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  out.computeBoundingSphere();
  return out;
}

function deformCone(geo, seed, amount = 0.24) {
  const p = geo.attributes.position;
  for (let v = 0; v < p.count; v++) {
    const px = p.getX(v);
    const py = p.getY(v);
    const pz = p.getZ(v);
    const n = valueNoise(px * 0.014 + seed * 13.7, pz * 0.014 - seed * 8.2) - 0.5;
    p.setX(v, px * (1 + n * amount));
    p.setZ(v, pz * (1 + n * amount));
    if (py > -0.49) p.setY(v, py + n * 0.12);
  }
  geo.computeVertexNormals();
}

export function createQilianMountains(rockMaterial, snowMaterial) {
  const group = new THREE.Group();
  const rand = mulberry32(6207);
  const rockBucket = [];
  const snowBucket = [];

  const addPeak = (x, z, height, baseR, seed, snowRatio) => {
    const seg = 8 + ((rand() * 4) | 0);
    const geo = new THREE.ConeGeometry(baseR, height, seg, 4, false);
    deformCone(geo, seed, 0.26);
    geo.translate(x, height * 0.5 - 26, z);
    rockBucket.push(geo);
    if (snowRatio > 0) {
      const sh = height * snowRatio;
      const snow = new THREE.ConeGeometry(baseR * (1 - snowRatio) * 0.92, sh * 1.02, seg, 2, false);
      deformCone(snow, seed + 0.7, 0.16);
      snow.translate(x, height - 26 - sh * 0.47, z);
      snowBucket.push(snow);
    }
  };

  for (let i = 0; i < 30; i++) {
    const x = -1900 + (i / 29) * 3800 + (rand() - 0.5) * 150;
    const z = -930 - rand() * 760 - Math.abs(x) * 0.16;
    const h = 330 + rand() * 370 + (1 - Math.abs(x) / 1900) * 120;
    const r = 250 + rand() * 320;
    addPeak(x, z, h, r, i + 2.3, 0.24 + rand() * 0.14);
  }
  for (let i = 0; i < 14; i++) {
    const angle = (i / 14) * Math.PI * 2;
    const x = Math.cos(angle) * (1950 + rand() * 500);
    const z = Math.sin(angle) * (1950 + rand() * 500);
    const h = 230 + rand() * 260;
    addPeak(x, z, h, 260 + rand() * 260, i + 12.7, 0.12 + rand() * 0.1);
  }

  const addMerged = (list, material, name) => {
    if (!list.length) return;
    const merged = mergeSimple(list);
    list.forEach((g) => g.dispose());
    const mesh = new THREE.Mesh(merged, material);
    mesh.receiveShadow = false;
    mesh.castShadow = false;
    mesh.name = name;
    group.add(mesh);
  };
  addMerged(rockBucket, rockMaterial, 'qilian-rock');
  addMerged(snowBucket, snowMaterial, 'qilian-snow');
  return group;
}

export const groundAt = heightAt;
