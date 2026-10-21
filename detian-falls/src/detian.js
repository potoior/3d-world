import * as THREE from 'three';
import { mats, sharedTextures } from './materials.js';
import { mergeStaticGroup, mergeGeometryList } from './geometry.js';
import { makeLabelTexture } from './textures.js';
import {
  heightAt,
  slopeAt,
  fbm,
  smoothstep,
  riverCenter,
  lowerHalfWidth,
  upperHalfWidth,
  WATER_LOW,
  WATER_HIGH,
  CLIFF_Z,
  trailPointAt,
  trailWidthAt,
} from './terrain.js';

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

function addBox(list, w, h, d, x, y, z, ry = 0, rx = 0, rz = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (rx) g.rotateX(rx);
  if (rz) g.rotateZ(rz);
  if (ry) g.rotateY(ry);
  g.translate(x, y, z);
  list.push(g);
  return g;
}

function segGeo(ax, ay, az, bx, by, bz, ra, rb, seg = 6) {
  const dx = bx - ax;
  const dy = by - ay;
  const dz = bz - az;
  const len = Math.hypot(dx, dy, dz) || 1;
  const geo = new THREE.CylinderGeometry(rb, ra, len, seg, 1, false);
  const q = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(dx / len, dy / len, dz / len)
  );
  geo.applyQuaternion(q);
  geo.translate((ax + bx) * 0.5, (ay + by) * 0.5, (az + bz) * 0.5);
  return geo;
}

function tintGeometry(geo, color, variance = 0.12, rand = Math.random) {
  const count = geo.attributes.position.count;
  if (!geo.attributes.uv) {
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(count * 2), 2));
  }
  if (!geo.attributes.normal) geo.computeVertexNormals();
  const colors = new Float32Array(count * 3);
  const c = new THREE.Color();
  const base = color instanceof THREE.Color ? color : new THREE.Color(color);
  for (let i = 0; i < count; i++) {
    const shade = 0.88 + rand() * variance;
    c.copy(base).multiplyScalar(shade);
    colors[i * 3] = Math.max(0, c.r);
    colors[i * 3 + 1] = Math.max(0, c.g);
    colors[i * 3 + 2] = Math.max(0, c.b);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo;
}

class Bucket {
  constructor() {
    this.map = new Map();
  }
  add(geo, mat) {
    if (!geo.attributes.uv) {
      const count = geo.attributes.position.count;
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(count * 2), 2));
    }
    if (!geo.attributes.normal) geo.computeVertexNormals();
    if (!geo.attributes.color) {
      const count = geo.attributes.position.count;
      const colors = new Float32Array(count * 3);
      colors.fill(1);
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    }
    if (!this.map.has(mat)) this.map.set(mat, []);
    this.map.get(mat).push(geo);
    return geo;
  }
  build(group) {
    for (const [mat, list] of this.map) {
      if (!list.length) continue;
      const geo = mergeGeometryList(list);
      if (!geo) continue;
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = !(mat.userData && mat.userData.noShadow);
      mesh.receiveShadow = true;
      group.add(mesh);
    }
  }
}

const rockMat = new THREE.MeshStandardMaterial({
  map: sharedTextures.graniteMap,
  color: 0xd7d4c7,
  vertexColors: true,
  roughness: 1,
  metalness: 0,
  flatShading: true,
});

const karstMat = new THREE.MeshStandardMaterial({
  map: sharedTextures.graniteMap,
  color: 0xd9ddd1,
  vertexColors: true,
  roughness: 0.98,
  metalness: 0,
});

const paddyMat = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.34,
  metalness: 0.06,
  transparent: true,
  opacity: 0.96,
});

const woodMat = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  vertexColors: true,
  roughness: 0.92,
});

const thatchMat = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  vertexColors: true,
  roughness: 0.95,
  flatShading: true,
});

const clothMat = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  vertexColors: true,
  roughness: 0.9,
});

const leafMat = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  vertexColors: true,
  roughness: 0.92,
  side: THREE.DoubleSide,
});

const earthMat = new THREE.MeshStandardMaterial({
  color: 0x8b7c58,
  roughness: 1,
});

const bambooMat = new THREE.MeshStandardMaterial({
  color: 0xa6bd7c,
  roughness: 0.82,
});

const mistTexture = sharedTextures.cloudMap.clone();
mistTexture.needsUpdate = true;

function makeMistMaterial(opacity, color = 0xeef7f2) {
  return new THREE.MeshBasicMaterial({
    map: mistTexture,
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: true,
    toneMapped: true,
  });
}

function makeFallTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 512;
  const ctx = c.getContext('2d');
  const rand = mulberry32(3371);
  ctx.clearRect(0, 0, 256, 512);
  const grd = ctx.createLinearGradient(0, 0, 0, 512);
  grd.addColorStop(0, 'rgba(245,252,250,0.38)');
  grd.addColorStop(0.25, 'rgba(238,249,246,0.5)');
  grd.addColorStop(0.72, 'rgba(230,246,241,0.72)');
  grd.addColorStop(1, 'rgba(226,244,239,0.42)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 260; i++) {
    const x = rand() * 256;
    const w = 0.5 + rand() * 5.2;
    const len = 40 + rand() * 260;
    const y = rand() * 512;
    ctx.strokeStyle = 'rgba(255,255,255,' + (0.1 + rand() * 0.55).toFixed(3) + ')';
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (rand() - 0.5) * 5, y + len);
    ctx.stroke();
  }
  for (let i = 0; i < 45; i++) {
    const x = rand() * 256;
    const y = rand() * 512;
    const r = 3 + rand() * 15;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,0.45)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

const fallTextureBack = makeFallTexture();
fallTextureBack.repeat.set(1.5, 2.6);
const fallTextureMid = makeFallTexture();
fallTextureMid.repeat.set(1.9, 3.1);
const fallTextureFront = makeFallTexture();
fallTextureFront.repeat.set(2.3, 3.7);

function makeFallMaterial(texture, opacity) {
  return new THREE.MeshBasicMaterial({
    map: texture,
    color: 0xf2fbf7,
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: true,
    toneMapped: true,
  });
}

const fallMaterialBack = makeFallMaterial(fallTextureBack, 0.86);
const fallMaterialMid = makeFallMaterial(fallTextureMid, 0.66);
const fallMaterialFront = makeFallMaterial(fallTextureFront, 0.4);

function makeLabel(title, subtitle, x, y, z, scale = 1) {
  const tex = makeLabelTexture(title, subtitle);
  const material = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: true,
    depthWrite: false,
    opacity: 0.92,
    toneMapped: true,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(30 * scale, 9.2 * scale, 1);
  sprite.position.set(x, y, z);
  sprite.renderOrder = 7;
  return sprite;
}

function createCliffGeometry() {
  const nx = 90;
  const ny = 34;
  const x0 = -286;
  const x1 = 286;
  const baseY = 0.4;
  const topY = 75.6;
  const positions = [];
  const colors = [];
  const uvs = [];
  const indices = [];
  const cRock = new THREE.Color(0x8d9184);
  const cWarm = new THREE.Color(0xa59e88);
  const cWet = new THREE.Color(0x5c6e60);
  const cMoss = new THREE.Color(0x647a51);
  const tmp = new THREE.Color();
  const rand = mulberry32(8821);
  for (let ix = 0; ix <= nx; ix++) {
    const u = ix / nx;
    const x = x0 + (x1 - x0) * u;
    for (let iy = 0; iy <= ny; iy++) {
      const v = iy / ny;
      const y = baseY + (topY - baseY) * v;
      const fallMask = 1 - smoothstep(80, 210, Math.abs(x));
      const tier = Math.floor((y + Math.sin(x * 0.055) * 3.4) / 11.5);
      const ledge = Math.sin(tier * 1.7 + x * 0.03) * 1.2;
      const wobble =
        Math.sin(u * 31 + v * 13 + 0.8) * 2.2 +
        Math.sin(v * 47 - u * 9 + 2.2) * 1.4 +
        (fbm(x * 0.055 + 3.1, y * 0.075 - 2.4, 3) - 0.5) * 5;
      const z = CLIFF_Z - 6.5 + (1 - v) * 8.5 + wobble + ledge + fallMask * 2.0;
      positions.push(x, y, z);
      const wet = smoothstep(0.55, 1, v) * fallMask;
      const shade = 0.82 + rand() * 0.2;
      tmp.copy(cRock).lerp(cWarm, 0.24 + 0.28 * Math.sin(y * 0.16 + u * 6));
      tmp.lerp(cWet, wet * 0.55 + (1 - v) * 0.2);
      tmp.lerp(cMoss, smoothstep(0.5, 0.9, v) * (0.18 + rand() * 0.2));
      colors.push(tmp.r * shade, tmp.g * shade, tmp.b * shade);
      uvs.push(u * 9, v * 6);
    }
  }
  for (let ix = 0; ix < nx; ix++) {
    for (let iy = 0; iy < ny; iy++) {
      const a = ix * (ny + 1) + iy;
      const b = (ix + 1) * (ny + 1) + iy;
      const c = (ix + 1) * (ny + 1) + iy + 1;
      const d = ix * (ny + 1) + iy + 1;
      indices.push(a, b, d, b, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function createCurtainGeometry(width, height, baseY, bulge, seed) {
  const cols = 26;
  const rows = 22;
  const positions = [];
  const uvs = [];
  const indices = [];
  const rand = mulberry32(seed);
  for (let iy = 0; iy <= rows; iy++) {
    const v = iy / rows;
    const t = 1 - v;
    for (let ix = 0; ix <= cols; ix++) {
      const u = ix / cols;
      const x = (u - 0.5) * width;
      const y = baseY + height * t;
      const edge = Math.pow(Math.abs(u - 0.5) * 2, 5) * 4.5;
      const z =
        CLIFF_Z + 4.5 +
        Math.pow(v, 1.65) * bulge +
        Math.sin(u * 13 + v * 8 + seed) * 0.5 +
        (rand() - 0.5) * 0.16 -
        edge;
      positions.push(x, y, z);
      uvs.push(u, v);
    }
  }
  for (let iy = 0; iy < rows; iy++) {
    for (let ix = 0; ix < cols; ix++) {
      const a = iy * (cols + 1) + ix;
      const b = a + 1;
      const c = (iy + 1) * (cols + 1) + ix;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function createCrestWater() {
  const positions = [];
  const uvs = [];
  const indices = [];
  const cols = 26;
  const rows = 12;
  for (let iz = 0; iz <= rows; iz++) {
    const v = iz / rows;
    const z = CLIFF_Z - 34 + v * 36;
    for (let ix = 0; ix <= cols; ix++) {
      const u = ix / cols;
      const x = (u - 0.5) * 208;
      const edgeDrop = smoothstep(0.72, 1, v) * 4.2;
      positions.push(x, WATER_HIGH - 0.15 - edgeDrop + Math.sin(u * 18 + v * 4) * 0.12, z);
      uvs.push(u * 3, v * 5);
    }
  }
  for (let iz = 0; iz < rows; iz++) {
    for (let ix = 0; ix < cols; ix++) {
      const a = iz * (cols + 1) + ix;
      const b = a + 1;
      const c = (iz + 1) * (cols + 1) + ix;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function createRainbowGeometry(radius, halfWidth, arc, segments = 88) {
  const bands = 7;
  const positions = [];
  const colors = [];
  const indices = [];
  const c = new THREE.Color();
  const start = Math.PI * (0.5 - arc * 0.5);
  const end = Math.PI * (0.5 + arc * 0.5);
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const a = start + (end - start) * t;
    for (let j = 0; j <= bands; j++) {
      const k = j / bands;
      const rr = radius - halfWidth + k * halfWidth * 2;
      positions.push(Math.cos(a) * rr, Math.sin(a) * rr, 0);
      c.setHSL(0.76 - k * 0.76, 0.78, 0.62);
      colors.push(c.r, c.g, c.b);
    }
  }
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < bands; j++) {
      const a = i * (bands + 1) + j;
      const b = a + 1;
      const c2 = a + bands + 1;
      const d = c2 + 1;
      indices.push(a, c2, b, b, c2, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function createKarstGeometry(cx, cz, r, h, seed, leanA = 0) {
  const base = Math.max(0.4, heightAt(cx, cz)) - 2.2;
  const seg = 16;
  const rings = 10;
  const positions = [];
  const colors = [];
  const uvs = [];
  const indices = [];
  const rand = mulberry32(seed);
  const cLow = new THREE.Color(0x8b9184);
  const cMid = new THREE.Color(0x7b8c72);
  const cHigh = new THREE.Color(0x4f6c4a);
  const cDark = new THREE.Color(0x5e6858);
  const tmp = new THREE.Color();
  const lean = Math.cos(leanA) * r * 0.24;
  const leanZ = Math.sin(leanA) * r * 0.18;
  for (let k = 0; k <= rings; k++) {
    const t = k / rings;
    const y = base + h * (t * t * (3 - 2 * t) * 0.55 + t * 0.45);
    const profile = 1 - 0.8 * Math.pow(t, 0.95);
    for (let j = 0; j < seg; j++) {
      const a = (j / seg) * Math.PI * 2;
      const groove =
        0.92 +
        0.08 * Math.sin(a * 6 + seed * 0.01) +
        0.035 * Math.sin(a * 13 + k * 0.7) +
        0.025 * Math.sin(a * 23 - 0.4);
      const rr = r * profile * groove * (0.94 + rand() * 0.12);
      const px = cx + Math.cos(a) * rr + lean * t * t;
      const pz = cz + Math.sin(a) * rr + leanZ * t * t;
      const py = y + (rand() - 0.5) * h * 0.014;
      positions.push(px, py, pz);
      const green = smoothstep(0.32, 0.82, t);
      tmp.copy(cLow).lerp(cMid, green * 0.9).lerp(cHigh, green * 0.5 + rand() * 0.1);
      const band = 0.91 + 0.09 * Math.sin(t * 27 + a * 0.7);
      tmp.lerp(cDark, (1 - t) * 0.18 + Math.abs(Math.sin(a * 9 + t * 18)) * 0.06);
      const shade = band * (0.94 + rand() * 0.08);
      colors.push(tmp.r * shade, tmp.g * shade, tmp.b * shade);
      uvs.push(j / seg * 4, t * 3);
    }
  }
  for (let k = 0; k < rings; k++) {
    for (let j = 0; j < seg; j++) {
      const j2 = (j + 1) % seg;
      const a = k * seg + j;
      const b = k * seg + j2;
      const c = (k + 1) * seg + j;
      const d = (k + 1) * seg + j2;
      indices.push(a, c, b, b, c, d);
    }
  }
  const topY = base + h;
  positions.push(cx + lean, topY, cz + leanZ);
  colors.push(cHigh.r, cHigh.g, cHigh.b);
  uvs.push(0.5, 0.5);
  const top = positions.length / 3 - 1;
  for (let j = 0; j < seg; j++) {
    const j2 = (j + 1) % seg;
    indices.push(rings * seg + j, top, rings * seg + j2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return { geo, base, topY, x: cx, z: cz, r, h };
}

const PEAKS = [
  [-278, -20, 42, 78, 0.5],
  [-338, 96, 56, 118, 1.4],
  [-286, 238, 40, 88, 2.2],
  [-388, 368, 62, 136, 0.9],
  [-532, 148, 72, 156, 2.8],
  [-486, -166, 58, 128, 1.8],
  [-662, -34, 82, 168, 0.2],
  [-742, 268, 92, 186, 2.5],
  [252, -18, 44, 74, 1.1],
  [326, 132, 58, 118, 2.4],
  [288, 306, 46, 96, 0.4],
  [428, 466, 68, 146, 1.9],
  [548, 218, 74, 162, 0.7],
  [506, -118, 62, 134, 2.9],
  [692, 54, 88, 178, 1.3],
  [764, 318, 96, 194, 2.1],
  [-396, -430, 102, 196, 2.6],
  [-38, -542, 118, 242, 0.8],
  [402, -486, 108, 212, 1.7],
  [-724, -604, 134, 224, 0.3],
  [728, -634, 142, 234, 2.3],
  [-960, 520, 126, 208, 1.5],
  [982, 560, 138, 218, 0.6],
  [-182, -892, 118, 236, 2.7],
  [244, -936, 128, 248, 1.2],
  [-548, 806, 110, 202, 0.9],
  [594, 848, 120, 214, 2.0],
  [-812, -260, 96, 182, 1.6],
  [838, -318, 104, 192, 2.8],
  [-1020, -704, 150, 236, 0.4],
  [1046, -786, 158, 246, 1.8],
];

function buildKarst(bucket, rand) {
  const trees = [];
  for (let i = 0; i < PEAKS.length; i++) {
    const p = PEAKS[i];
    const k = createKarstGeometry(p[0], p[1], p[2], p[3], 6100 + i * 13, p[4]);
    bucket.add(k.geo, karstMat);
    const topCount = 2 + (rand() * 4 | 0);
    for (let t = 0; t < topCount; t++) {
      const a = rand() * Math.PI * 2;
      const rr = p[2] * (0.05 + rand() * 0.22);
      trees.push([p[0] + Math.cos(a) * rr, k.topY - 0.6, p[1] + Math.sin(a) * rr, 1.6 + rand() * 2.4]);
    }
    if (p[2] > 50) {
      for (let l = 0; l < 3; l++) {
        const a = rand() * Math.PI * 2;
        const tt = 0.2 + rand() * 0.36;
        const rr = p[2] * (1 - 0.72 * Math.pow(tt, 0.95)) * 1.01;
        const y = k.base + p[3] * (tt * tt * (3 - 2 * tt) * 0.55 + tt * 0.45);
        const ledge = new THREE.CylinderGeometry(rr * 0.94, rr * 1.08, 0.7 + rand() * 1.4, 9, 1, true, a, 1.2 + rand() * 1.6);
        ledge.translate(p[0], y, p[1]);
        bucket.add(tintGeometry(ledge, 0x6b7d5d, 0.12, rand), rockMat);
      }
    }
  }
  return trees;
}

function addPerson(list, x, y, z, yaw, jacket, hat = true, seed = 1) {
  const rand = mulberry32(seed);
  const body = new THREE.BoxGeometry(0.4, 0.72, 0.28);
  body.rotateY(yaw);
  body.translate(x, y + 1.24, z);
  list.push(tintGeometry(body, jacket, 0.12, rand));
  const legL = new THREE.BoxGeometry(0.14, 0.62, 0.16);
  legL.rotateY(yaw);
  legL.translate(x - Math.cos(yaw) * 0.09, y + 0.66, z + Math.sin(yaw) * 0.09);
  list.push(tintGeometry(legL, 0x393f3a, 0.08, rand));
  const legR = new THREE.BoxGeometry(0.14, 0.62, 0.16);
  legR.rotateY(yaw);
  legR.translate(x + Math.cos(yaw) * 0.09, y + 0.64, z - Math.sin(yaw) * 0.09);
  list.push(tintGeometry(legR, 0x393f3a, 0.08, rand));
  const head = new THREE.IcosahedronGeometry(0.19, 1);
  head.translate(x, y + 1.76, z);
  list.push(tintGeometry(head, 0xc69b74, 0.06, rand));
  if (hat) {
    const brim = new THREE.CylinderGeometry(0.55, 0.62, 0.06, 12);
    brim.translate(x, y + 1.93, z);
    list.push(tintGeometry(brim, 0xcbb67a, 0.08, rand));
    const cone = new THREE.ConeGeometry(0.48, 0.34, 12);
    cone.translate(x, y + 2.06, z);
    list.push(tintGeometry(cone, 0xd7c287, 0.08, rand));
  }
  if (rand() < 0.7) {
    const basket = new THREE.CylinderGeometry(0.22, 0.2, 0.42, 8);
    basket.translate(x - Math.sin(yaw) * 0.34, y + 2.04, z - Math.cos(yaw) * 0.34);
    list.push(tintGeometry(basket, 0x8f7042, 0.14, rand));
  }
}

function addVillager(list, x, y, z, yaw, jacket, seed) {
  const rand = mulberry32(seed);
  const body = new THREE.BoxGeometry(0.42, 0.7, 0.28);
  body.rotateY(yaw);
  body.translate(x, y + 1.22, z);
  list.push(tintGeometry(body, jacket, 0.1, rand));
  const legs = [];
  addBox(legs, 0.15, 0.58, 0.17, x - Math.cos(yaw) * 0.1, y + 0.62, z + Math.sin(yaw) * 0.1, yaw);
  addBox(legs, 0.15, 0.58, 0.17, x + Math.cos(yaw) * 0.1, y + 0.6, z - Math.sin(yaw) * 0.1, yaw);
  for (const g of legs) list.push(tintGeometry(g, 0x323b37, 0.08, rand));
  const head = new THREE.IcosahedronGeometry(0.2, 1);
  head.translate(x, y + 1.76, z);
  list.push(tintGeometry(head, 0xc8a17b, 0.06, rand));
  const brim = new THREE.CylinderGeometry(0.5, 0.58, 0.06, 12);
  brim.translate(x, y + 1.94, z);
  list.push(tintGeometry(brim, 0xd0ba7d, 0.06, rand));
  const cone = new THREE.ConeGeometry(0.44, 0.3, 12);
  cone.translate(x, y + 2.06, z);
  list.push(tintGeometry(cone, 0xdcc78e, 0.06, rand));
}

function addStiltHouse(bucket, rand, cx, cz, yaw, scale = 1) {
  const ground = Math.max(1, heightAt(cx, cz));
  const s = scale;
  const wood = [];
  const thatch = [];
  const wall = [];
  const deckY = ground + 2.1 * s;
  for (const ox of [-3.6, 3.6]) {
    for (const oz of [-2.6, 2.6]) {
      const g = new THREE.CylinderGeometry(0.16 * s, 0.23 * s, 2.5 * s, 6);
      const wx = cx + Math.cos(yaw) * ox * s - Math.sin(yaw) * oz * s;
      const wz = cz + Math.sin(yaw) * ox * s + Math.cos(yaw) * oz * s;
      g.translate(wx, ground + 1.25 * s, wz);
      wood.push(tintGeometry(g, 0x6d553a, 0.12, rand));
    }
  }
  addBox(wood, 8.4 * s, 0.34 * s, 6.2 * s, cx, deckY, cz, yaw);
  for (const side of [-1, 1]) {
    const wx = cx - Math.sin(yaw) * side * 2.7 * s;
    const wz = cz - Math.cos(yaw) * side * 2.7 * s;
    addBox(wall, 7.2 * s, 3.1 * s, 0.16 * s, wx, deckY + 1.7 * s, wz, yaw);
    addBox(wood, 7.4 * s, 0.18 * s, 0.22 * s, wx, deckY + 3.35 * s, wz, yaw);
  }
  const backWx = cx + Math.cos(yaw) * 3.3 * s;
  const backWz = cz + Math.sin(yaw) * 3.3 * s;
  addBox(wall, 0.16 * s, 3.0 * s, 5.2 * s, backWx, deckY + 1.65 * s, backWz, yaw);
  const frontWx = cx - Math.cos(yaw) * 3.3 * s;
  const frontWz = cz - Math.sin(yaw) * 3.3 * s;
  addBox(wall, 0.16 * s, 3.0 * s, 1.8 * s, frontWx, deckY + 1.65 * s, frontWz - 1.7 * s, yaw);
  addBox(wall, 0.16 * s, 3.0 * s, 1.8 * s, frontWx, deckY + 1.65 * s, frontWz + 1.7 * s, yaw);
  addBox(wood, 0.9 * s, 2.0 * s, 0.12 * s, frontWx, deckY + 1.05 * s, frontWz, yaw);

  const roofY = deckY + 4.4 * s;
  const slope = 0.52;
  for (const side of [-1, 1]) {
    const g = new THREE.BoxGeometry(4.9 * s, 0.22 * s, 7.4 * s);
    g.rotateZ(side * slope);
    if (yaw) g.rotateY(yaw);
    const offX = -side * 1.85 * s;
    g.translate(cx + Math.cos(yaw) * offX, roofY, cz + Math.sin(yaw) * offX);
    thatch.push(tintGeometry(g, 0x3d4b43, 0.12, rand));
  }
  const ridge = new THREE.BoxGeometry(0.35 * s, 0.35 * s, 7.7 * s);
  if (yaw) ridge.rotateY(yaw);
  ridge.translate(cx, roofY + 1.24 * s, cz);
  thatch.push(tintGeometry(ridge, 0x2d3934, 0.1, rand));

  for (const g of wood) bucket.add(g, woodMat);
  for (const g of thatch) bucket.add(g, thatchMat);
  for (const g of wall) bucket.add(g, thatchMat);

  if (rand() < 0.7) {
    const lantern = new THREE.SphereGeometry(0.22 * s, 8, 6);
    lantern.scale(1, 1.2, 1);
    lantern.translate(cx - Math.cos(yaw) * 3.55 * s, deckY + 3.1 * s, cz - Math.sin(yaw) * 3.55 * s);
    bucket.add(tintGeometry(lantern, 0xb7402c, 0.08, rand), clothMat);
  }
}

function makeBorderTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 512;
  const ctx = c.getContext('2d');
  const grd = ctx.createLinearGradient(0, 0, 0, 512);
  grd.addColorStop(0, '#c9c6b8');
  grd.addColorStop(0.5, '#a9a99a');
  grd.addColorStop(1, '#8e9183');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 256, 512);
  ctx.strokeStyle = 'rgba(76,66,49,0.5)';
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, 240, 496);
  ctx.fillStyle = '#8f2c22';
  ctx.font = 'bold 67px "Noto Serif CJK SC", "Songti SC", "STSong", serif';
  ctx.textAlign = 'center';
  ctx.fillText('中', 128, 104);
  ctx.fillText('国', 128, 178);
  ctx.fillStyle = '#22241f';
  ctx.font = 'bold 103px "Helvetica Neue", Arial, sans-serif';
  ctx.fillText('53', 128, 300);
  ctx.font = 'bold 27px "Helvetica Neue", Arial, sans-serif';
  ctx.fillText('CHINA', 128, 354);
  ctx.fillStyle = 'rgba(40,42,35,0.72)';
  ctx.font = '22px "Noto Serif CJK SC", "Songti SC", serif';
  ctx.fillText('德 天', 128, 418);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function buildPaddies(bucket, rand) {
  const paddyGeo = [];
  const bunds = [];
  const cGreen = new THREE.Color(0x6f9547);
  const cYoung = new THREE.Color(0x92ad55);
  const cWater = new THREE.Color(0x8aa873);
  const cEarth = new THREE.Color(0x8c7c55);
  for (let z = 30; z < 760; z += 47) {
    for (const side of [-1, 1]) {
      for (let col = 0; col < 2; col++) {
        if (rand() < 0.2) continue;
        const c = riverCenter(z + col * 8);
        const cx = c + side * (lowerHalfWidth(z) + 62 + col * 54 + rand() * 8);
        const cz = z + (rand() - 0.5) * 10;
        const hw = 22 + rand() * 3;
        const hd = 18 + rand() * 2;
        if (Math.abs(cx) > 760) continue;
        const slope = slopeAt(cx, cz);
        if (slope > 1.1) continue;
        const cols = 3;
        const rows = 3;
        const pos = [];
        const colArr = [];
        const uvs = [];
        const idx = [];
        const baseY = heightAt(cx, cz);
        for (let iz = 0; iz <= rows; iz++) {
          for (let ix = 0; ix <= cols; ix++) {
            const px = cx + (ix / cols - 0.5) * hw * 2;
            const pz = cz + (iz / rows - 0.5) * hd * 2;
            const py = Math.max(baseY + 0.08, heightAt(px, pz) + 0.08);
            pos.push(px, py, pz);
            uvs.push(ix / cols, iz / rows);
            const n = fbm(px * 0.09 + 2.2, pz * 0.09 - 4.1, 2);
            const tmp = new THREE.Color().copy(cGreen).lerp(cYoung, n * 0.55).lerp(cWater, 0.18 + rand() * 0.12);
            colArr.push(tmp.r, tmp.g, tmp.b);
          }
        }
        for (let iz = 0; iz < rows; iz++) {
          for (let ix = 0; ix < cols; ix++) {
            const a = iz * (cols + 1) + ix;
            const b = a + 1;
            const cIdx = (iz + 1) * (cols + 1) + ix;
            const d = cIdx + 1;
            idx.push(a, cIdx, b, b, cIdx, d);
          }
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        g.setAttribute('color', new THREE.Float32BufferAttribute(colArr, 3));
        g.setIndex(idx);
        g.computeVertexNormals();
        paddyGeo.push(g);

        const edgeY = baseY + 0.28;
        addBox(bunds, hw * 2 + 0.6, 0.3, 0.45, cx, edgeY, cz - hd, 0);
        addBox(bunds, hw * 2 + 0.6, 0.3, 0.45, cx, edgeY, cz + hd, 0);
        addBox(bunds, 0.45, 0.3, hd * 2, cx - hw, edgeY, cz, 0);
        addBox(bunds, 0.45, 0.3, hd * 2, cx + hw, edgeY, cz, 0);
      }
    }
  }
  const geo = mergeGeometryList(paddyGeo);
  let mesh = null;
  if (geo) {
    mesh = new THREE.Mesh(geo, paddyMat);
    mesh.receiveShadow = true;
    mesh.name = 'detian-rice-paddies';
  }
  for (const g of bunds) bucket.add(tintGeometry(g, cEarth, 0.12, rand), earthMat);
  return mesh;
}

function buildVegetation(rand, karstTrees, bucket) {
  const canopy = [];
  const trunks = [];
  const bambooPoles = [];
  const bambooLeaves = [];
  const shrubs = [];
  const rocks = [];
  const grass = [];

  for (const t of karstTrees) {
    const [x, y, z, r] = t;
    canopy.push([x, y + r * 0.7, z, r * 1.5, r * 1.0, r * 1.4, rand() * 6.2, 0x3f6b42]);
    trunks.push([x, y + r * 0.25, z, 0.18, r * 0.7, 0.18, 0, 0x514536]);
  }

  let attempts = 0;
  while (canopy.length < 380 && attempts < 9000) {
    attempts++;
    const x = (rand() - 0.5) * 1750;
    const z = (rand() - 0.5) * 1750 + 40;
    const y = heightAt(x, z);
    if (y < WATER_LOW + 2.2 || y > 92) continue;
    const c = riverCenter(z);
    if (Math.abs(x - c) < lowerHalfWidth(z) + 18) continue;
    if (z > CLIFF_Z - 10 && z < CLIFF_Z + 130 && Math.abs(x) < 190) continue;
    if (slopeAt(x, z) > 1.65) continue;
    if (Math.abs(x + 150) < 22 && z > -30 && z < 340) continue;
    const height = 3.6 + rand() * 5.4;
    const radius = 1.7 + rand() * 2.5;
    const color = [0x3f6b42, 0x4e7747, 0x5d854c, 0x38603d][(rand() * 4) | 0];
    trunks.push([x, y + height * 0.5, z, 0.2 + radius * 0.04, height, 0.2 + radius * 0.04, rand() * 6.2, 0x594a38]);
    canopy.push([x, y + height + radius * 0.4, z, radius, radius * 0.78, radius, rand() * 6.2, color]);
    if (rand() < 0.6) {
      canopy.push([
        x + (rand() - 0.5) * radius * 1.4,
        y + height + radius * 0.15,
        z + (rand() - 0.5) * radius * 1.4,
        radius * 0.7,
        radius * 0.55,
        radius * 0.7,
        rand() * 6.2,
        color,
      ]);
    }
  }

  for (let i = 0; i < 105; i++) {
    let x = 0;
    let z = 0;
    let y = 0;
    let ok = false;
    for (let tries = 0; tries < 20; tries++) {
      x = (rand() - 0.5) * 1250;
      z = (rand() - 0.5) * 1000 + 100;
      y = heightAt(x, z);
      const c = riverCenter(z);
      if (y > WATER_LOW + 2.5 && y < 42 && Math.abs(x - c) > lowerHalfWidth(z) + 20 && slopeAt(x, z) < 1.5) {
        ok = true;
        break;
      }
    }
    if (!ok) continue;
    const clump = 3 + (rand() * 4 | 0);
    for (let p = 0; p < clump; p++) {
      const a = rand() * Math.PI * 2;
      const rr = rand() * 2.6;
      const px = x + Math.cos(a) * rr;
      const pz = z + Math.sin(a) * rr;
      const h = 5 + rand() * 7;
      bambooPoles.push([px, y + h * 0.5, pz, 0.06 + rand() * 0.04, h, 0.06 + rand() * 0.04, 0, 0x8baa62]);
      const leaves = 2 + (rand() * 3 | 0);
      for (let l = 0; l < leaves; l++) {
        const la = rand() * Math.PI * 2;
        bambooLeaves.push([
          px + Math.cos(la) * (0.5 + rand() * 1.2),
          y + h * (0.55 + rand() * 0.38),
          pz + Math.sin(la) * (0.5 + rand() * 1.2),
          0.38 + rand() * 0.22,
          1.1 + rand() * 0.7,
          0.38,
          la,
          0x4e7a43,
        ]);
      }
    }
  }

  for (let i = 0; i < 720; i++) {
    const x = (rand() - 0.5) * 1500;
    const z = (rand() - 0.5) * 1500 + 60;
    const y = heightAt(x, z);
    if (y < WATER_LOW + 1 || y > 84) continue;
    if (slopeAt(x, z) > 1.8) continue;
    const c = riverCenter(z);
    if (Math.abs(x - c) < lowerHalfWidth(z) + 4) continue;
    const r = 0.5 + rand() * 1.4;
    shrubs.push([x, y + r * 0.3, z, r, r * 0.7, r, rand() * 6.2, rand() < 0.5 ? 0x446c45 : 0x5c814f]);
  }

  for (let i = 0; i < 260; i++) {
    const x = (rand() - 0.5) * 1100;
    const z = (rand() - 0.5) * 1100 + 100;
    const y = heightAt(x, z);
    if (y < WATER_LOW + 0.4 || y > 55) continue;
    const c = riverCenter(z);
    if (Math.abs(x - c) < lowerHalfWidth(z) + 2) continue;
    if (Math.abs(x + 150) < 16 && z > -30 && z < 340) continue;
    const r = 0.4 + rand() * 1.8;
    rocks.push([x, y + r * 0.25, z, r * 1.2, r * 0.7, r, rand() * 6.2, rand() < 0.5 ? 0x8c9185 : 0xa3a698]);
  }

  for (let i = 0; i < 900; i++) {
    const x = (rand() - 0.5) * 1400;
    const z = (rand() - 0.5) * 1400 + 80;
    const y = heightAt(x, z);
    if (y < WATER_LOW + 1.5 || y > 70) continue;
    const c = riverCenter(z);
    if (Math.abs(x - c) < lowerHalfWidth(z) + 6) continue;
    const r = 0.25 + rand() * 0.5;
    grass.push([x, y + r * 0.9, z, r, r * 2.2, r, rand() * 6.2, rand() < 0.5 ? 0x6f8c46 : 0x87a34e]);
  }

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  function makeInstances(geo, mat, data, cast) {
    if (!data.length) return null;
    const mesh = new THREE.InstancedMesh(geo, mat, data.length);
    for (let i = 0; i < data.length; i++) {
      const d = data[i];
      dummy.position.set(d[0], d[1], d[2]);
      dummy.rotation.set(0, d[6], 0);
      dummy.scale.set(d[3], d[4], d[5]);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      color.setHex(d[7]);
      mesh.setColorAt(i, color);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = !!cast;
    mesh.receiveShadow = true;
    return mesh;
  }

  const canopyGeo = new THREE.IcosahedronGeometry(1, 1);
  const trunkGeo = new THREE.CylinderGeometry(0.8, 1, 1, 6);
  trunkGeo.translate(0, 0, 0);
  const bambooGeo = new THREE.CylinderGeometry(0.75, 1, 1, 5);
  const leafGeo = new THREE.PlaneGeometry(1, 1);
  const shrubGeo = new THREE.IcosahedronGeometry(1, 0);
  const rockGeo = new THREE.DodecahedronGeometry(1, 0);
  const grassGeo = (() => {
    const a = new THREE.PlaneGeometry(1, 1);
    a.rotateY(Math.PI / 4);
    const b = new THREE.PlaneGeometry(1, 1);
    b.rotateY(-Math.PI / 4);
    return mergeGeometryList([a, b]);
  })();

  const vegetationMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.94 });
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 });
  const bambooMatInst = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.82 });
  const leafInstMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.9,
    side: THREE.DoubleSide,
  });
  const rockInstMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.99, flatShading: true });
  const grassInstMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.95,
    side: THREE.DoubleSide,
  });

  const group = new THREE.Group();
  group.name = 'detian-instanced-vegetation';
  const meshes = [
    makeInstances(canopyGeo, vegetationMat, canopy, true),
    makeInstances(trunkGeo, trunkMat, trunks, true),
    makeInstances(bambooGeo, bambooMatInst, bambooPoles, true),
    makeInstances(leafGeo, leafInstMat, bambooLeaves, false),
    makeInstances(shrubGeo, vegetationMat, shrubs, false),
    makeInstances(rockGeo, rockInstMat, rocks, true),
    makeInstances(grassGeo, grassInstMat, grass, false),
  ];
  for (const m of meshes) if (m) group.add(m);
  return { group, counts: { trees: trunks.length, bamboo: bambooPoles.length, shrubs: shrubs.length, rocks: rocks.length } };
}

function buildRaftBambooGeometry() {
  const list = [];
  for (let i = 0; i < 11; i++) {
    const x = -1.65 + i * 0.33;
    const g = new THREE.CylinderGeometry(0.14, 0.16, 8.4, 6);
    g.rotateX(Math.PI / 2);
    g.translate(x, 0.14, 0);
    list.push(g);
  }
  for (let i = 0; i < 5; i++) {
    const z = -3.4 + i * 1.7;
    const g = new THREE.BoxGeometry(3.9, 0.12, 0.18);
    g.translate(0, 0.3, z);
    list.push(g);
  }
  const bench = new THREE.BoxGeometry(2.8, 0.2, 0.72);
  bench.translate(0, 0.72, 1.7);
  list.push(bench);
  const seat = new THREE.BoxGeometry(2.8, 0.14, 0.55);
  seat.translate(0, 1.15, 2.02);
  list.push(seat);
  const pole = new THREE.CylinderGeometry(0.06, 0.06, 7.4, 5);
  pole.rotateZ(1.1);
  pole.translate(1.8, 1.4, -0.4);
  list.push(pole);
  return mergeGeometryList(list);
}

function buildRaftPersonGeometry(seed) {
  const list = [];
  const rand = mulberry32(seed);
  addPerson(list, 0, 0, 0, 0, [0x344f62, 0x9a4f35, 0x506b4b][seed % 3], true, seed);
  const pole = new THREE.CylinderGeometry(0.055, 0.055, 5.2, 5);
  pole.rotateZ(0.9);
  pole.translate(0.85, 1.55, 0.15);
  list.push(tintGeometry(pole, 0xb8a477, 0.08, rand));
  return mergeGeometryList(list);
}

function buildMist(rand) {
  const group = new THREE.Group();
  group.name = 'detian-spray-and-mist';
  const matsList = [
    makeMistMaterial(0.22, 0xeff8f4),
    makeMistMaterial(0.17, 0xe8f4ef),
    makeMistMaterial(0.12, 0xf6fbf8),
  ];
  const sprites = [];
  for (let i = 0; i < 24; i++) {
    const spr = new THREE.Sprite(matsList[i % 3]);
    const x = -108 + rand() * 216;
    const y = 5 + rand() * 42;
    const z = CLIFF_Z + 16 + rand() * 118;
    spr.position.set(x, y, z);
    const s = 55 + rand() * 95;
    spr.scale.set(s * 1.7, s * 0.72, 1);
    spr.userData.baseX = x;
    spr.userData.baseY = y;
    spr.userData.baseZ = z;
    spr.userData.phase = rand() * 6.2;
    spr.userData.drift = 4 + rand() * 8;
    spr.userData.lift = 1 + rand() * 3;
    spr.renderOrder = 6;
    group.add(spr);
    sprites.push(spr);
  }

  const mistSheets = [];
  const sheetMat = makeMistMaterial(0.18, 0xf1faf6);
  for (let i = 0; i < 4; i++) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(210 - i * 20, 40 + i * 9), sheetMat);
    mesh.position.set((i - 1.5) * 18, 9 + i * 6, CLIFF_Z + 34 + i * 18);
    mesh.renderOrder = 5;
    mesh.userData.baseY = mesh.position.y;
    mesh.userData.phase = i * 1.2;
    group.add(mesh);
    mistSheets.push(mesh);
  }

  const count = 620;
  const positions = new Float32Array(count * 3);
  const seeds = [];
  for (let i = 0; i < count; i++) {
    const x = -120 + rand() * 240;
    const y = 2 + rand() * 55;
    const z = CLIFF_Z + 8 + rand() * 100;
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
    seeds.push({ x, y, z, phase: rand() * 6.2, rise: 0.6 + rand() * 2.4 });
  }
  const pgeo = new THREE.BufferGeometry();
  pgeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const pmat = new THREE.PointsMaterial({
    map: mistTexture,
    color: 0xf4fbf7,
    size: 4.4,
    transparent: true,
    opacity: 0.36,
    depthWrite: false,
    sizeAttenuation: true,
    blending: THREE.NormalBlending,
  });
  const points = new THREE.Points(pgeo, pmat);
  points.renderOrder = 6;
  group.add(points);

  return {
    group,
    sprites,
    sheets: mistSheets,
    points,
    seeds,
    count,
    update(elapsed) {
      for (const s of sprites) {
        s.position.x = s.userData.baseX + Math.sin(elapsed * 0.19 + s.userData.phase) * s.userData.drift;
        s.position.y = s.userData.baseY + Math.sin(elapsed * 0.32 + s.userData.phase) * s.userData.lift;
        s.position.z = s.userData.baseZ + Math.cos(elapsed * 0.11 + s.userData.phase) * 5;
      }
      for (const s of mistSheets) {
        s.position.y = s.userData.baseY + Math.sin(elapsed * 0.25 + s.userData.phase) * 2.2;
        s.position.x = Math.sin(elapsed * 0.08 + s.userData.phase) * 7;
      }
      const arr = pgeo.attributes.position.array;
      for (let i = 0; i < count; i++) {
        const s = seeds[i];
        const t = elapsed * s.rise + s.phase * 20;
        const k = (t % 72) / 72;
        arr[i * 3] = s.x + Math.sin(elapsed * 0.5 + s.phase) * (2 + k * 10);
        arr[i * 3 + 1] = s.y + k * 38;
        arr[i * 3 + 2] = s.z + Math.cos(elapsed * 0.24 + s.phase) * (3 + k * 8);
      }
      pgeo.attributes.position.needsUpdate = true;
    },
  };
}

export function createDetianOverlay() {
  const root = new THREE.Group();
  root.name = 'detian-signature-overlay';
  const staticGroup = new THREE.Group();
  const dynamicGroup = new THREE.Group();
  dynamicGroup.name = 'detian-dynamic-water-life';
  const bucket = new Bucket();
  const rand = mulberry32(20261021);

  bucket.add(createCliffGeometry(), rockMat);
  const karstTrees = buildKarst(bucket, rand);

  const villageHouses = [
    [142, 74, 0.12, 1.0],
    [168, 118, -0.18, 1.1],
    [152, 176, 0.2, 0.92],
    [184, 224, -0.12, 1.05],
    [138, 278, 0.08, 0.9],
    [-206, 214, 0.24, 0.92],
    [-232, 286, -0.15, 1.0],
  ];
  for (const h of villageHouses) addStiltHouse(bucket, rand, h[0], h[1], h[2], h[3]);

  const villagerSpots = [
    [-116, 10, 1.1, 0x3e5b4a],
    [-126, 34, 2.2, 0x8f3e2b],
    [-110, -34, 1.7, 0x455f77],
    [-142, 158, 0.6, 0x6c5b3d],
    [-154, 171, 2.4, 0x4c6650],
    [116, 58, -1.2, 0x994836],
    [134, 92, 0.8, 0x3c556a],
    [150, 154, -0.5, 0x7c6639],
    [126, 244, 1.8, 0x4c6a50],
    [96, 30, -2.2, 0x8d3f2c],
  ];
  for (let i = 0; i < villagerSpots.length; i++) {
    const v = villagerSpots[i];
    const y = heightAt(v[0], v[1]);
    const person = [];
    addVillager(person, v[0], y, v[1], v[2], v[3], 9300 + i);
    for (const g of person) bucket.add(g, clothMat);
  }

  const borderX = -128;
  const borderZ = 33;
  const borderY = Math.max(2, heightAt(borderX, borderZ));
  const stoneList = [];
  addBox(stoneList, 3.4, 0.5, 2.2, borderX, borderY + 0.25, borderZ);
  addBox(stoneList, 2.3, 3.6, 0.62, borderX, borderY + 2.15, borderZ);
  addBox(stoneList, 3.0, 0.26, 1.4, borderX, borderY + 4.02, borderZ);
  for (const g of stoneList) bucket.add(tintGeometry(g, 0xaaa99a, 0.08, rand), rockMat);

  const borderTex = makeBorderTexture();
  const borderMat = new THREE.MeshStandardMaterial({
    map: borderTex,
    roughness: 0.84,
    metalness: 0,
    side: THREE.DoubleSide,
  });
  const borderPlaque = new THREE.Mesh(new THREE.PlaneGeometry(1.86, 3.18), borderMat);
  borderPlaque.position.set(borderX, borderY + 2.18, borderZ + 0.325);
  borderPlaque.castShadow = false;
  root.add(borderPlaque);

  const paddyMesh = buildPaddies(bucket, rand);
  const vegetation = buildVegetation(rand, karstTrees, bucket);

  bucket.build(staticGroup);
  const mergedStatic = mergeStaticGroup(staticGroup);
  mergedStatic.name = 'detian-merged-static';
  root.add(mergedStatic);
  if (paddyMesh) root.add(paddyMesh);

  const crestMat = new THREE.MeshStandardMaterial({
    color: 0x86c2b5,
    transparent: true,
    opacity: 0.8,
    roughness: 0.12,
    metalness: 0.2,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const crest = new THREE.Mesh(createCrestWater(), crestMat);
  crest.renderOrder = 2;
  crest.name = 'detian-crest-water';
  dynamicGroup.add(crest);

  const curtains = [
    { geo: createCurtainGeometry(152, 68, 3.8, 17, 31), mat: fallMaterialBack, x: -2, z: 0, order: 4 },
    { geo: createCurtainGeometry(54, 62, 4.6, 14, 73), mat: fallMaterialMid, x: -104, z: -2, order: 4 },
    { geo: createCurtainGeometry(42, 64, 4.2, 15, 117), mat: fallMaterialMid, x: 96, z: -3, order: 4 },
    { geo: createCurtainGeometry(98, 66, 3.4, 22, 191), mat: fallMaterialFront, x: 4, z: 1.8, order: 5 },
  ];
  for (const c of curtains) {
    const mesh = new THREE.Mesh(c.geo, c.mat);
    mesh.position.set(c.x, 0, c.z);
    mesh.renderOrder = c.order;
    dynamicGroup.add(mesh);
  }

  const lipFoamMat = new THREE.MeshBasicMaterial({
    map: mistTexture,
    color: 0xf8fffb,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: true,
  });
  const lipFoam = new THREE.Mesh(new THREE.PlaneGeometry(208, 7), lipFoamMat);
  lipFoam.rotation.x = -Math.PI / 2;
  lipFoam.position.set(0, WATER_HIGH + 0.4, CLIFF_Z - 8);
  lipFoam.renderOrder = 5;
  dynamicGroup.add(lipFoam);

  const mist = buildMist(rand);
  dynamicGroup.add(mist.group);

  const rainbowMat = new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.21,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
    toneMapped: false,
  });
  const rainbow = new THREE.Mesh(createRainbowGeometry(83, 4.8, 0.9), rainbowMat);
  rainbow.position.set(6, 7, CLIFF_Z + 74);
  rainbow.renderOrder = 7;
  dynamicGroup.add(rainbow);

  const rainbowMat2 = rainbowMat.clone();
  rainbowMat2.opacity = 0.12;
  const rainbow2 = new THREE.Mesh(createRainbowGeometry(66, 3.2, 0.7), rainbowMat2);
  rainbow2.position.set(-8, 8, CLIFF_Z + 82);
  rainbow2.renderOrder = 7;
  dynamicGroup.add(rainbow2);

  const raftBambooGeo = buildRaftBambooGeometry();
  const raftPersonGeo = buildRaftPersonGeometry(42);
  const rafts = [];
  const raftDefs = [
    { z: 52, offset: -18, phase: 0.3 },
    { z: 110, offset: 16, phase: 1.8 },
    { z: 168, offset: -30, phase: 3.1 },
    { z: 232, offset: 24, phase: 4.6 },
  ];
  for (let i = 0; i < raftDefs.length; i++) {
    const g = new THREE.Group();
    const bamboo = new THREE.Mesh(raftBambooGeo, bambooMat);
    const person = new THREE.Mesh(raftPersonGeo, clothMat);
    bamboo.castShadow = true;
    person.castShadow = true;
    g.add(bamboo, person);
    g.userData.def = raftDefs[i];
    dynamicGroup.add(g);
    rafts.push(g);
  }

  root.add(vegetation.group);
  root.add(dynamicGroup);

  root.add(makeLabel('德天瀑布', 'DETIAN FALLS · CHINA / VIETNAM', 0, 104, CLIFF_Z + 24, 1.06));
  root.add(makeLabel('中越界碑', 'BORDER MARKER 53', borderX, borderY + 8.4, borderZ, 0.66));
  root.add(makeLabel('归春河', 'GUICHUN RIVER', 34, 18, 168, 0.76));
  root.add(makeLabel('竹筏漂流', 'BAMBOO RAFTS', -18, 15, 92, 0.66));
  root.add(makeLabel('喀斯特峰林', 'KARST PEAK FOREST', -392, 168, -350, 0.82));

  let phase = 0;
  const tmpColor = new THREE.Color();

  function update(elapsed, dt) {
    const step = Number.isFinite(dt) ? dt : 0.016;
    phase += step;
    fallTextureBack.offset.y = (fallTextureBack.offset.y - step * 0.38) % 1;
    fallTextureMid.offset.y = (fallTextureMid.offset.y - step * 0.52) % 1;
    fallTextureFront.offset.y = (fallTextureFront.offset.y - step * 0.72) % 1;
    fallTextureBack.offset.x = Math.sin(elapsed * 0.11) * 0.015;
    fallTextureMid.offset.x = Math.sin(elapsed * 0.16 + 1.2) * 0.02;
    fallTextureFront.offset.x = Math.sin(elapsed * 0.2 + 2.4) * 0.026;
    fallMaterialBack.opacity = 0.8 + Math.sin(elapsed * 1.7) * 0.06;
    fallMaterialMid.opacity = 0.61 + Math.sin(elapsed * 1.9 + 1.2) * 0.05;
    fallMaterialFront.opacity = 0.36 + Math.sin(elapsed * 2.2 + 2.4) * 0.04;
    lipFoamMat.opacity = 0.44 + Math.sin(elapsed * 1.3) * 0.07;
    mist.update(elapsed);
    rainbowMat.opacity = 0.15 + Math.sin(elapsed * 0.45) * 0.055;
    rainbowMat2.opacity = 0.08 + Math.sin(elapsed * 0.38 + 1.4) * 0.035;
    rainbow.rotation.z = Math.sin(elapsed * 0.04) * 0.012;
    rainbow2.rotation.z = Math.sin(elapsed * 0.05 + 1.2) * 0.016;
    crestMat.opacity = 0.74 + Math.sin(elapsed * 0.8) * 0.04;

    for (let i = 0; i < rafts.length; i++) {
      const raft = rafts[i];
      const d = raft.userData.def;
      const z = d.z + Math.sin(elapsed * 0.055 + d.phase) * 16;
      const x = riverCenter(z) + d.offset + Math.sin(elapsed * 0.12 + d.phase) * 2.5;
      raft.position.set(x, WATER_LOW + 0.2 + Math.sin(elapsed * 1.1 + d.phase) * 0.055, z);
      raft.rotation.y = Math.sin(elapsed * 0.045 + d.phase) * 0.08;
      raft.rotation.z = Math.sin(elapsed * 0.9 + d.phase) * 0.012;
    }
  }

  update(0.25, 0.016);

  return {
    group: root,
    update,
    rafts,
    curtains,
    mist,
    rainbow,
    rainbow2,
    borderPlaque,
    paddy: paddyMesh,
    vegetation: vegetation.counts,
  };
}
