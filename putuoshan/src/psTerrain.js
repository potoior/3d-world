import * as THREE from 'three';
import { mats } from './putuoshanTextures.js';
import { gauss2, smoothstep, lerp, mulberry32 } from './psUtil.js';

export const SEA_LEVEL = 0;
export const SITES = {
  guanyin: { x: 0, z: 340, y: 16 },
  puji: { x: -60, z: 120, y: 8.5 },
  fayu: { x: 180, z: -78, y: 40 },
  huiji: { x: -70, z: -250, y: 112 },
  coast: { x: -300, z: 250, y: 12 },
  luojia: { x: 820, z: 190, y: 0 },
};

function hash2(x, z) {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function valueNoise(x, z) {
  const xi = Math.floor(x);
  const zi = Math.floor(z);
  const xf = x - xi;
  const zf = z - zi;
  const u = xf * xf * (3 - 2 * xf);
  const v = zf * zf * (3 - 2 * zf);
  const a = hash2(xi, zi);
  const b = hash2(xi + 1, zi);
  const c = hash2(xi, zi + 1);
  const d = hash2(xi + 1, zi + 1);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}

export function fbm(x, z, octaves = 4) {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < octaves; i++) {
    sum += valueNoise(x * freq, z * freq) * amp;
    freq *= 2.03;
    amp *= 0.5;
  }
  return sum;
}

export function coastRadius(a) {
  return 455
    + 46 * Math.sin(3 * a + 0.6)
    + 24 * Math.sin(5 * a + 2.3)
    + 13 * Math.sin(9 * a + 1.4)
    + 18 * Math.sin(2 * a - 0.8);
}

function flatten(h, x, z, cx, cz, rx, rz, y, feather = 0.42) {
  const q = Math.max(Math.abs((x - cx) / rx), Math.abs((z - cz) / rz));
  const m = 1 - smoothstep(1 - feather, 1, q);
  return lerp(h, y, m);
}

export function heightAt(x, z) {
  const d = Math.hypot(x, z);
  const a = Math.atan2(z, x);
  const R = coastRadius(a);
  const inland = smoothstep(R + 26, R - 105, d);
  const shape = Math.pow(inland, 0.72);

  let h = shape * 9.0;
  h += 122 * gauss2(x, z, -70, -250, 118);
  h += 64 * gauss2(x, z, 192, -118, 106);
  h += 74 * gauss2(x, z, -238, -48, 96);
  h += 34 * gauss2(x, z, -8, 322, 96);
  h += 26 * gauss2(x, z, 274, 142, 92);
  h += 19 * gauss2(x, z, -304, 182, 82);
  h += (fbm(x * 0.0065 + 3.1, z * 0.0065 - 2.7, 4) - 0.5) * 32 * shape;
  h += (fbm(x * 0.022 - 5.2, z * 0.022 + 7.4, 3) - 0.5) * 8.5 * shape;
  h += (fbm(x * 0.061 + 13, z * 0.061 - 9, 2) - 0.5) * 2.4 * shape;
  h *= shape;
  h -= 4.5 * (1 - inland);

  h = flatten(h, x, z, SITES.puji.x, SITES.puji.z, 116, 128, SITES.puji.y, 0.34);
  h = flatten(h, x, z, SITES.fayu.x, SITES.fayu.z, 80, 78, SITES.fayu.y, 0.4);
  h = flatten(h, x, z, SITES.huiji.x, SITES.huiji.z, 58, 52, SITES.huiji.y, 0.45);
  h = flatten(h, x, z, SITES.guanyin.x, SITES.guanyin.z, 76, 62, SITES.guanyin.y, 0.44);
  h = flatten(h, x, z, -110, 300, 54, 30, 11, 0.5);
  h = flatten(h, x, z, -300, 250, 62, 46, 12, 0.45);

  return h;
}

export function slopeAt(x, z, e = 2.2) {
  const hx = heightAt(x + e, z) - heightAt(x - e, z);
  const hz = heightAt(x, z + e) - heightAt(x, z - e);
  return Math.hypot(hx, hz) / (2 * e);
}

export function isLand(x, z) {
  return heightAt(x, z) > 1.2;
}

export function createTerrain() {
  const size = 1560;
  const segments = 272;
  const geo = new THREE.PlaneGeometry(size, size, segments, segments);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, heightAt(x, z));
  }
  geo.computeVertexNormals();
  const normals = geo.attributes.normal;
  const colors = new Float32Array(pos.count * 3);
  const cSand = new THREE.Color(0xccc1a1);
  const cWet = new THREE.Color(0x777a68);
  const cGrass = new THREE.Color(0x5f7447);
  const cGrassDark = new THREE.Color(0x3e573b);
  const cRock = new THREE.Color(0x909188);
  const cRockLight = new THREE.Color(0xb4b0a3);
  const cHigh = new THREE.Color(0x9aa08a);
  const tmp = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const y = pos.getY(i);
    const ny = normals.getY(i);
    const steep = smoothstep(0.9, 0.48, ny);
    const shore = 1 - smoothstep(1.0, 7.0, y);
    const high = smoothstep(85, 145, y);
    const noise = fbm(x * 0.05 + 19, z * 0.05 - 11, 3);
    const patch = fbm(x * 0.014 - 4, z * 0.014 + 8, 2);
    tmp.copy(cGrass).lerp(cGrassDark, Math.max(0, patch - 0.42) * 0.9);
    tmp.lerp(cHigh, high * 0.65);
    tmp.lerp(cRock, steep * 0.88);
    tmp.lerp(cRockLight, steep * noise * 0.4);
    tmp.lerp(cSand, shore * 0.85);
    tmp.lerp(cWet, shore * (1 - smoothstep(0, 2.4, y)) * 0.7);
    const jitter = 0.9 + fbm(x * 0.19 + 3, z * 0.19 - 7, 2) * 0.2;
    colors[i * 3] = tmp.r * jitter;
    colors[i * 3 + 1] = tmp.g * jitter;
    colors[i * 3 + 2] = tmp.b * jitter;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mesh = new THREE.Mesh(geo, mats.ground);
  mesh.name = 'putuoshan-island';
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  return mesh;
}

export function createDistantIsland() {
  const group = new THREE.Group();
  group.name = 'luojia-island';
  const size = 360;
  const seg = 56;
  const geo = new THREE.PlaneGeometry(size, size, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const cGreen = new THREE.Color(0x566b4c);
  const cDark = new THREE.Color(0x3f5542);
  const cRock = new THREE.Color(0x8d9088);
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const d = Math.hypot(x * 0.9, z * 1.15);
    const inland = smoothstep(168, 92, d);
    let y = inland * 12;
    y += 42 * gauss2(x, z, -22, -16, 66);
    y += 24 * gauss2(x, z, 48, 30, 58);
    y += (fbm(x * 0.03 + 5, z * 0.03 - 2, 3) - 0.5) * 10 * inland;
    y -= 4 * (1 - inland);
    pos.setY(i, y);
    const steep = y > 28 ? 0.5 : 0.1;
    tmp.copy(cGreen).lerp(cDark, Math.max(0, (fbm(x * 0.06, z * 0.06, 2) - 0.35)) * 0.7);
    tmp.lerp(cRock, steep * 0.4 + (1 - inland) * 0.35);
    colors[i * 3] = tmp.r;
    colors[i * 3 + 1] = tmp.g;
    colors[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mats.ground);
  mesh.receiveShadow = false;
  mesh.castShadow = false;
  group.add(mesh);
  return group;
}

export function createFarIslets() {
  const group = new THREE.Group();
  const rand = mulberry32(6701);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + rand() * 0.2;
    const r = 1300 + rand() * 900;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const h = 32 + rand() * 80;
    const rad = 60 + rand() * 130;
    const geo = new THREE.ConeGeometry(rad, h, 7, 3, false);
    const p = geo.attributes.position;
    for (let k = 0; k < p.count; k++) {
      const px = p.getX(k);
      const py = p.getY(k);
      const pz = p.getZ(k);
      const n = valueNoise(px * 0.03 + i * 9, pz * 0.03 - i * 5) - 0.5;
      p.setX(k, px * (1 + n * 0.4));
      p.setZ(k, pz * (1 + n * 0.4));
      if (py < h * 0.4) p.setY(k, py + n * h * 0.2);
    }
    geo.computeVertexNormals();
    geo.translate(x, h * 0.5 - 8, z);
    const m = new THREE.Mesh(geo, mats.rock);
    m.castShadow = false;
    m.receiveShadow = false;
    group.add(m);
  }
  return group;
}
