import * as THREE from 'three';
import { mats, sharedTextures } from './materials.js';
import { mergeStaticGroup, mergeGeometryList } from './geometry.js';
import { makeLabelTexture } from './textures.js';
import { heightAt } from './terrain.js';

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
  const colors = new Float32Array(count * 3);
  const c = new THREE.Color();
  const base = color instanceof THREE.Color ? color : new THREE.Color(color);
  for (let i = 0; i < count; i++) {
    const shade = 0.9 + rand() * variance;
    c.copy(base).multiplyScalar(shade);
    colors[i * 3] = Math.max(0, c.r);
    colors[i * 3 + 1] = Math.max(0, c.g);
    colors[i * 3 + 2] = Math.max(0, c.b);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  if (!geo.attributes.normal) geo.computeVertexNormals();
  return geo;
}

class Bucket {
  constructor() {
    this.map = new Map();
  }
  add(geo, mat) {
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

function makeWaterTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  const rand = mulberry32(2301);
  const grd = ctx.createLinearGradient(0, 0, 0, 256);
  grd.addColorStop(0, '#5d9a95');
  grd.addColorStop(0.45, '#347c7b');
  grd.addColorStop(1, '#2b666f');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 90; i++) {
    const y = rand() * 256;
    const len = 18 + rand() * 90;
    const x = rand() * 256;
    ctx.strokeStyle = 'rgba(220,245,240,' + (0.04 + rand() * 0.14).toFixed(3) + ')';
    ctx.lineWidth = 0.7 + rand() * 1.8;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x + len * 0.3, y - 4, x + len * 0.7, y + 4, x + len, y);
    ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(5, 3);
  t.anisotropy = 4;
  return t;
}

function makeFallTexture() {
  const t = sharedTextures.cloudMap.clone();
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1.4, 3.2);
  t.needsUpdate = true;
  return t;
}

const rockMat = new THREE.MeshStandardMaterial({
  map: sharedTextures.graniteMap,
  color: 0xffffff,
  vertexColors: true,
  roughness: 1,
  metalness: 0,
  flatShading: true,
});

const plateauMat = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  vertexColors: true,
  roughness: 1,
  metalness: 0,
  flatShading: true,
});

const waterTexture = makeWaterTexture();
const waterMat = new THREE.MeshStandardMaterial({
  map: waterTexture,
  color: 0x9fc6bd,
  transparent: true,
  opacity: 0.8,
  roughness: 0.18,
  metalness: 0.22,
  depthWrite: false,
  side: THREE.DoubleSide,
});

const fallTexture = makeFallTexture();
const fallMat = new THREE.MeshBasicMaterial({
  map: fallTexture,
  color: 0xe8f3ef,
  transparent: true,
  opacity: 0.66,
  depthWrite: false,
  side: THREE.DoubleSide,
  fog: true,
  toneMapped: true,
});

const cloudTexture = sharedTextures.cloudMap.clone();
cloudTexture.wrapS = THREE.RepeatWrapping;
cloudTexture.wrapT = THREE.ClampToEdgeWrapping;
cloudTexture.needsUpdate = true;

function makeCloudMaterial(opacity, color = 0xf4f7f4) {
  return new THREE.MeshBasicMaterial({
    map: cloudTexture,
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: true,
    toneMapped: true,
  });
}

function makeLabel(title, subtitle, x, y, z, scale = 1) {
  const tex = makeLabelTexture(title, subtitle);
  const material = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: true,
    depthWrite: false,
    opacity: 0.9,
    toneMapped: true,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(28 * scale, 8.8 * scale, 1);
  sprite.position.set(x, y, z);
  sprite.renderOrder = 6;
  return sprite;
}

function addPine(trunks, foliage, x, y, z, height, seed) {
  const rand = mulberry32(seed);
  const angle = rand() * Math.PI * 2;
  const lean = height * (0.08 + rand() * 0.2);
  const tx = Math.cos(angle) * lean;
  const tz = Math.sin(angle) * lean;
  const midY = y + height * 0.52;
  const topY = y + height * 0.93;
  trunks.push(segGeo(x, y - 0.4, z, x + tx * 0.4, midY, z + tz * 0.4, 0.24 + height * 0.013, 0.16 + height * 0.007, 5));
  trunks.push(segGeo(x + tx * 0.4, midY, z + tz * 0.4, x + tx, topY, z + tz, 0.16 + height * 0.007, 0.075, 5));
  const tiers = 3;
  for (let i = 0; i < tiers; i++) {
    const k = i / (tiers - 1);
    const cx = x + tx * (0.42 + k * 0.58);
    const cz = z + tz * (0.42 + k * 0.58);
    const cy = y + height * (0.56 + k * 0.31);
    const r = height * (0.22 - k * 0.05) * (0.82 + rand() * 0.3);
    const blob = new THREE.IcosahedronGeometry(1, 0);
    blob.scale(r * 1.2, r * 0.26, r);
    blob.rotateY(rand() * 6.2);
    blob.translate(cx, cy, cz);
    foliage.push(blob);
    if (rand() < 0.7) {
      const b2 = new THREE.IcosahedronGeometry(1, 0);
      b2.scale(r * 0.65, r * 0.22, r * 0.62);
      b2.rotateY(rand() * 6.2);
      b2.translate(cx + (rand() - 0.5) * r, cy - r * 0.1, cz + (rand() - 0.5) * r);
      foliage.push(b2);
    }
  }
}

function addHiker(bucket, x, y, z, yaw, jacket, seed) {
  const rand = mulberry32(seed);
  const body = new THREE.BoxGeometry(0.34, 0.62, 0.24);
  body.rotateY(yaw);
  body.translate(x, y + 1.14, z);
  tintGeometry(body, jacket, 0.1, rand);
  bucket.add(body, rockMat);
  const legs = [];
  addBox(legs, 0.13, 0.56, 0.15, x - Math.cos(yaw) * 0.08, y + 0.56, z + Math.sin(yaw) * 0.08, yaw);
  addBox(legs, 0.13, 0.56, 0.15, x + Math.cos(yaw) * 0.08, y + 0.54, z - Math.sin(yaw) * 0.08, yaw);
  legs.forEach((g) => bucket.add(tintGeometry(g, 0x3a403c, 0.1, rand), rockMat));
  const head = new THREE.IcosahedronGeometry(0.16, 0);
  head.translate(x, y + 1.6, z);
  bucket.add(tintGeometry(head, 0xc9a37d, 0.08, rand), rockMat);
  if (rand() < 0.6) {
    const pack = new THREE.BoxGeometry(0.28, 0.36, 0.2);
    pack.rotateY(yaw);
    pack.translate(x - Math.sin(yaw) * 0.19, y + 1.16, z - Math.cos(yaw) * 0.19);
    bucket.add(tintGeometry(pack, 0x9e3527, 0.12, rand), rockMat);
  }
}

function buildMassif(bucket, trunks, foliage, cfg) {
  const { xFace, zStart, zEnd, baseY, topY, depth, seed } = cfg;
  const rand = mulberry32(seed);
  const nz = Math.max(24, Math.round((zEnd - zStart) / 9));
  const ny = 20;
  const pos = [];
  const col = [];
  const uv = [];
  const idx = [];
  const cBase = new THREE.Color(0xb9b9aa);
  const cWarm = new THREE.Color(0xcfc4a9);
  const cDark = new THREE.Color(0x74796f);
  const tmp = new THREE.Color();

  for (let iz = 0; iz <= nz; iz++) {
    const v = iz / nz;
    const z = zStart + (zEnd - zStart) * v;
    for (let iy = 0; iy <= ny; iy++) {
      const u = iy / ny;
      const y = baseY + (topY - baseY) * u + Math.sin(v * 13 + seed) * 0.35;
      const band = Math.sin(y * 0.31 + v * 2.2 + seed * 0.01);
      const wobble = Math.sin(u * 17 + v * 9 + seed) * 1.8 + Math.sin(v * 29 - u * 4 + seed * 0.3) * 1.2;
      const x = xFace - 2.4 - wobble * 0.9 + band * 0.55;
      pos.push(x, y, z);
      const shade = 0.82 + rand() * 0.16 + band * 0.06;
      tmp.copy(cBase).lerp(cWarm, 0.3 + 0.24 * Math.sin(y * 0.13 + seed)).lerp(cDark, (1 - u) * 0.22);
      col.push(tmp.r * shade, tmp.g * shade, tmp.b * shade);
      uv.push(v * 9, u * 6);
    }
  }
  for (let iz = 0; iz < nz; iz++) {
    for (let iy = 0; iy < ny; iy++) {
      const a = iz * (ny + 1) + iy;
      const b = (iz + 1) * (ny + 1) + iy;
      const c = (iz + 1) * (ny + 1) + iy + 1;
      const d = iz * (ny + 1) + iy + 1;
      idx.push(a, b, d, b, c, d);
    }
  }
  const faceGeo = new THREE.BufferGeometry();
  faceGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  faceGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  faceGeo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  faceGeo.setIndex(idx);
  faceGeo.computeVertexNormals();
  bucket.add(faceGeo, rockMat);

  const core = new THREE.BoxGeometry(depth, topY - baseY, zEnd - zStart);
  core.translate(xFace + depth * 0.5, (baseY + topY) * 0.5, (zStart + zEnd) * 0.5);
  bucket.add(tintGeometry(core, cDark, 0.1, rand), rockMat);

  const tnx = 12;
  const tPos = [];
  const tCol = [];
  const tUv = [];
  const tIdx = [];
  const cGrass = new THREE.Color(0x68794e);
  const cMoss = new THREE.Color(0x84906a);
  const cStone = new THREE.Color(0x9b9c8d);
  for (let iz = 0; iz <= nz; iz++) {
    const v = iz / nz;
    const z = zStart + (zEnd - zStart) * v;
    for (let ix = 0; ix <= tnx; ix++) {
      const k = ix / tnx;
      const x = xFace + k * depth;
      const y = topY + 0.45 + Math.sin(x * 0.055 + z * 0.035 + seed) * 0.45 + (1 - k) * 0.25;
      tPos.push(x, y, z);
      const noise = 0.5 + 0.5 * Math.sin(x * 0.09 - z * 0.06 + seed * 0.4);
      tmp.copy(cGrass).lerp(cMoss, noise * 0.6).lerp(cStone, 0.18 + (k > 0.85 ? 0.2 : 0));
      tCol.push(tmp.r, tmp.g, tmp.b);
      tUv.push(v * 7, k * 4);
    }
  }
  for (let iz = 0; iz < nz; iz++) {
    for (let ix = 0; ix < tnx; ix++) {
      const a = iz * (tnx + 1) + ix;
      const b = a + 1;
      const c = a + tnx + 1;
      const d = c + 1;
      tIdx.push(a, c, b, b, c, d);
    }
  }
  const topGeo = new THREE.BufferGeometry();
  topGeo.setAttribute('position', new THREE.Float32BufferAttribute(tPos, 3));
  topGeo.setAttribute('uv', new THREE.Float32BufferAttribute(tUv, 2));
  topGeo.setAttribute('color', new THREE.Float32BufferAttribute(tCol, 3));
  topGeo.setIndex(tIdx);
  topGeo.computeVertexNormals();
  bucket.add(topGeo, plateauMat);

  const levels = 7;
  for (let l = 0; l < levels; l++) {
    const y = baseY + (topY - baseY) * (0.12 + (l / levels) * 0.72);
    const segs = 6 + (rand() * 4 | 0);
    for (let s = 0; s < segs; s++) {
      const zc = zStart + ((s + 0.5) / segs) * (zEnd - zStart);
      const segLen = ((zEnd - zStart) / segs) * (0.72 + rand() * 0.2);
      const protrude = 1.4 + rand() * 2.5;
      const thick = 0.6 + rand() * 1.5;
      const g = new THREE.BoxGeometry(protrude * 2.2, thick, segLen);
      g.translate(xFace - 1.6, y + (rand() - 0.5) * 1.2, zc);
      const tone = new THREE.Color().copy(cBase).lerp(cWarm, rand() * 0.55).lerp(cDark, rand() * 0.16);
      bucket.add(tintGeometry(g, tone, 0.1, rand), rockMat);
    }
  }

  for (let i = 0; i < 18; i++) {
    const z = zStart + rand() * (zEnd - zStart);
    const x = xFace - 4 - rand() * 10;
    const y = heightAt(x, z) + 1.2 + rand() * 1.8;
    const g = new THREE.DodecahedronGeometry(2.2 + rand() * 5.4, 0);
    g.scale(1.1, 0.8 + rand() * 0.5, 1.05);
    g.rotateY(rand() * 6.2);
    g.translate(x, y, z);
    bucket.add(tintGeometry(g, cBase, 0.18, rand), rockMat);
  }

  for (let i = 0; i < 46; i++) {
    const z = zStart + 14 + rand() * (zEnd - zStart - 28);
    const x = xFace + 8 + rand() * (depth - 24);
    const y = topY + 0.55;
    addPine(trunks, foliage, x, y, z, 6 + rand() * 8, seed + 300 + i);
  }
}

function buildGorgeWall(bucket, cfg) {
  const { xStart, xEnd, yBase, yTop, z, facing, seed } = cfg;
  const rand = mulberry32(seed);
  const nx = 30;
  const ny = 16;
  const pos = [];
  const col = [];
  const uv = [];
  const idx = [];
  const cWet = new THREE.Color(0x5e6c63);
  const cMoss = new THREE.Color(0x4e6349);
  const cRock = new THREE.Color(0x8b8d80);
  const tmp = new THREE.Color();
  for (let ix = 0; ix <= nx; ix++) {
    const u = ix / nx;
    const x = xStart + (xEnd - xStart) * u;
    for (let iy = 0; iy <= ny; iy++) {
      const v = iy / ny;
      const y = yBase + (yTop - yBase) * v;
      const wobble = Math.sin(u * 25 + v * 13 + seed) * 1.8 + Math.sin(v * 37 - u * 7) * 1.1;
      const zz = z + facing * (1.8 + wobble);
      pos.push(x, y, zz);
      const shade = 0.72 + rand() * 0.18;
      tmp.copy(cRock).lerp(cMoss, 0.35 + 0.35 * Math.sin(u * 8 + v * 15 + seed)).lerp(cWet, 0.2 + v * 0.2);
      col.push(tmp.r * shade, tmp.g * shade, tmp.b * shade);
      uv.push(u * 8, v * 7);
    }
  }
  for (let ix = 0; ix < nx; ix++) {
    for (let iy = 0; iy < ny; iy++) {
      const a = ix * (ny + 1) + iy;
      const b = (ix + 1) * (ny + 1) + iy;
      const c = (ix + 1) * (ny + 1) + iy + 1;
      const d = ix * (ny + 1) + iy + 1;
      if (facing > 0) idx.push(a, b, d, b, c, d);
      else idx.push(a, d, b, b, d, c);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  bucket.add(g, rockMat);
}

function createPillar(bucket, trunks, foliage) {
  const x = 575;
  const z = -175;
  const baseY = Math.max(14, heightAt(x, z) - 3);
  const topY = 238;
  const h = topY - baseY;
  const rand = mulberry32(5518);
  const profile = [
    [0, 0], [12.5, 2], [11.4, 12], [9.2, 44], [7.7, 88], [6.4, 132],
    [5.6, 172], [6.1, 206], [7.4, 226], [5.2, 236], [0, 239],
  ];
  const points = profile.map((p) => new THREE.Vector2(p[0], p[1]));
  const geo = new THREE.LatheGeometry(points, 18);
  const p = geo.attributes.position;
  const cLight = new THREE.Color(0xbebbad);
  const cWarm = new THREE.Color(0xc9b797);
  const cDark = new THREE.Color(0x7c8278);
  const colors = new Float32Array(p.count * 3);
  const tmp = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const px = p.getX(i);
    const py = p.getY(i);
    const pz = p.getZ(i);
    const a = Math.atan2(pz, px);
    const k = py / h;
    const wobble = 1 + 0.055 * Math.sin(a * 3 + k * 8 + 0.4) + 0.035 * Math.sin(a * 7 - k * 5);
    p.setX(i, px * wobble + Math.sin(k * 9 + a * 2) * 0.7);
    p.setZ(i, pz * wobble + Math.cos(k * 8 - a * 3) * 0.7);
    const band = Math.sin(py * 0.42 + a * 0.6);
    tmp.copy(cLight).lerp(cWarm, 0.32 + band * 0.22).lerp(cDark, (1 - k) * 0.2 + Math.abs(band) * 0.06);
    colors[i * 3] = tmp.r;
    colors[i * 3 + 1] = tmp.g;
    colors[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  geo.translate(x, baseY, z);
  bucket.add(geo, rockMat);

  for (let i = 0; i < 12; i++) {
    const k = 0.1 + (i / 12) * 0.8;
    const y = baseY + h * k;
    const r = 11.4 * (1 - k * 0.6) + 0.4;
    const ring = new THREE.CylinderGeometry(r * 1.02, r * 1.14, 0.8 + rand() * 1.4, 18, 1, false);
    ring.translate(x, y, z);
    bucket.add(tintGeometry(ring, cWarm, 0.1, rand), rockMat);
  }

  for (let i = 0; i < 9; i++) {
    const a = rand() * Math.PI * 2;
    const r = 3 + rand() * 4;
    addPine(trunks, foliage, x + Math.cos(a) * r, topY - 0.6, z + Math.sin(a) * r, 2.8 + rand() * 4.4, 7700 + i);
  }
  for (let i = 0; i < 16; i++) {
    const a = rand() * Math.PI * 2;
    const r = 7 + rand() * 5;
    const y = baseY + 2 + rand() * 3;
    const g = new THREE.DodecahedronGeometry(1.1 + rand() * 2.1, 0);
    g.scale(1.1, 0.75, 1);
    g.rotateY(rand() * 6.2);
    g.translate(x + Math.cos(a) * r, y, z + Math.sin(a) * r);
    bucket.add(tintGeometry(g, cLight, 0.16, rand), rockMat);
  }
  return { x, z, baseY, topY };
}

export function createEnshiOverlay() {
  const root = new THREE.Group();
  root.name = 'enshi-signature-overlay';
  const staticGroup = new THREE.Group();
  staticGroup.name = 'enshi-static';
  const dynamicGroup = new THREE.Group();
  dynamicGroup.name = 'enshi-dynamic';
  const bucket = new Bucket();
  const trunks = [];
  const foliage = [];
  const rand = mulberry32(9917);

  const north = { xFace: 650, zStart: -300, zEnd: 80, baseY: 0, topY: 178, depth: 380, seed: 3101 };
  const south = { xFace: 680, zStart: 220, zEnd: 520, baseY: 0, topY: 152, depth: 340, seed: 3201 };
  buildMassif(bucket, trunks, foliage, north);
  buildMassif(bucket, trunks, foliage, south);
  buildGorgeWall(bucket, { xStart: 648, xEnd: 1020, yBase: 10, yTop: 170, z: 80, facing: 1, seed: 4101 });
  buildGorgeWall(bucket, { xStart: 680, xEnd: 1020, yBase: 10, yTop: 148, z: 220, facing: -1, seed: 4102 });

  const pillar = createPillar(bucket, trunks, foliage);

  const topNorth = north.topY + 0.7;
  const corridor = [];
  const corridorPosts = [];
  const corridorRails = [];
  for (let z = -268; z <= 58; z += 6) {
    const y = topNorth + Math.sin(z * 0.03) * 0.4;
    addBox(corridor, 4.8, 0.38, 5.9, north.xFace + 2.6, y + 0.2, z);
    for (const side of [-1, 1]) {
      addBox(corridorPosts, 0.12, 1.2, 0.12, north.xFace + 2.6 + side * 2.2, y + 0.95, z);
    }
    if (z + 6 <= 58) {
      for (const side of [-1, 1]) {
        addBox(corridorRails, 0.1, 0.1, 6.1, north.xFace + 2.6 + side * 2.2, y + 1.5, z + 3);
        addBox(corridorRails, 0.08, 0.08, 6.1, north.xFace + 2.6 + side * 2.2, y + 1.12, z + 3);
      }
    }
  }
  corridor.forEach((g) => bucket.add(tintGeometry(g, 0xa7a799, 0.12, rand), plateauMat));
  corridorPosts.forEach((g) => bucket.add(tintGeometry(g, 0x4f4638, 0.1, rand), mats.iron));
  corridorRails.forEach((g) => bucket.add(tintGeometry(g, 0x5f5a4e, 0.1, rand), mats.iron));

  const walkway = [];
  const walkPosts = [];
  const walkRails = [];
  const walkBeams = [];
  for (let z = -288; z <= 48; z += 5) {
    const y = 110 + Math.sin(z * 0.022) * 2.2;
    addBox(walkway, 3.8, 0.22, 5.2, north.xFace - 4.1, y, z);
    addBox(walkBeams, 0.22, 0.24, 5.2, north.xFace - 2.4, y - 0.14, z);
    if ((z + 288) % 10 === 0) {
      for (const side of [-1, 1]) {
        addBox(walkPosts, 0.12, 1.25, 0.12, north.xFace - 4.1 + side * 1.75, y + 0.8, z);
      }
    }
    if (z + 5 <= 48) {
      for (const side of [-1, 1]) {
        addBox(walkRails, 0.09, 0.09, 5.2, north.xFace - 4.1 + side * 1.75, y + 1.36, z + 2.5);
        addBox(walkRails, 0.07, 0.07, 5.2, north.xFace - 4.1 + side * 1.75, y + 1.0, z + 2.5);
      }
    }
    walkBeams.push(segGeo(north.xFace + 0.5, y - 1.5, z, north.xFace - 4.2, y - 0.1, z, 0.14, 0.1, 5));
  }
  walkway.forEach((g) => bucket.add(tintGeometry(g, 0x8d7458, 0.12, rand), mats.wood));
  walkBeams.forEach((g) => bucket.add(tintGeometry(g, 0x5b4d3c, 0.1, rand), mats.iron));
  walkPosts.forEach((g) => bucket.add(tintGeometry(g, 0x4d4438, 0.1, rand), mats.wood));
  walkRails.forEach((g) => bucket.add(tintGeometry(g, 0x575247, 0.1, rand), mats.iron));

  const jackets = [0x586f4f, 0x9e3527, 0x3d5f73, 0x8a6b3f, 0x5f5573];
  for (let i = 0; i < 9; i++) {
    const z = -238 + i * 34;
    const y = topNorth + Math.sin(z * 0.03) * 0.4 + 0.45;
    addHiker(bucket, north.xFace + 1.2 + (i % 2) * 1.8, y, z, 1.2 + i * 0.4, jackets[i % jackets.length], 8800 + i);
  }
  for (let i = 0; i < 5; i++) {
    const z = -244 + i * 58;
    const y = 110 + Math.sin(z * 0.022) * 2.2 + 0.15;
    addHiker(bucket, north.xFace - 4.2, y, z, 1.1 + i * 0.7, jackets[(i + 2) % jackets.length], 8900 + i);
  }

  const towerDefs = [
    { x: 618, y: 170, z: 110 },
    { x: 1012, y: 176, z: 110 },
  ];
  for (let t = 0; t < towerDefs.length; t++) {
    const d = towerDefs[t];
    const ground = Math.max(4, heightAt(d.x, d.z));
    const column = new THREE.CylinderGeometry(9, 13, d.y - ground, 10, 4, false);
    column.translate(d.x, ground + (d.y - ground) * 0.5, d.z);
    bucket.add(tintGeometry(column, 0x8c9085, 0.14, rand), rockMat);
    const plat = new THREE.BoxGeometry(20, 2.6, 17);
    plat.translate(d.x, d.y, d.z);
    bucket.add(tintGeometry(plat, 0x6f7168, 0.08, rand), mats.stoneDark);
    const roof = new THREE.BoxGeometry(18, 0.8, 15);
    roof.translate(d.x, d.y + 8.5, d.z);
    bucket.add(tintGeometry(roof, 0x445a56, 0.08, rand), mats.iron);
    for (const ox of [-7, 7]) {
      for (const oz of [-6, 6]) {
        addBox(walkBeams, 0.35, 8, 0.35, d.x + ox, d.y + 4.4, d.z + oz);
      }
    }
  }

  const cableA = new THREE.Vector3(618, 170, 110);
  const cableB = new THREE.Vector3(1012, 176, 110);
  const cableMid = new THREE.Vector3(815, 144, 110);
  const cableCurve = new THREE.CatmullRomCurve3([cableA, cableMid, cableB], false, 'centripetal');
  for (const offset of [-2.6, 2.6]) {
    const pts = cableCurve.getPoints(58);
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      bucket.add(segGeo(a.x, a.y, a.z + offset, b.x, b.y, b.z + offset, 0.11, 0.11, 4), mats.cable);
    }
  }

  const cabinBodyGeo = (() => {
    const parts = [];
    addBox(parts, 4.2, 3.0, 3.4, 0, -4.4, 0);
    addBox(parts, 4.7, 0.35, 3.9, 0, -2.75, 0);
    addBox(parts, 0.16, 4.4, 0.16, -1.6, -1.2, 0);
    addBox(parts, 0.16, 4.4, 0.16, 1.6, -1.2, 0);
    addBox(parts, 3.2, 0.2, 0.2, 0, 0.15, 0);
    return mergeGeometryList(parts);
  })();
  const cabinGlassGeo = (() => {
    const parts = [];
    addBox(parts, 3.9, 1.45, 3.5, 0, -4.15, 0);
    return mergeGeometryList(parts);
  })();

  const cabins = [];
  for (let i = 0; i < 4; i++) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(cabinBodyGeo, mats.cabin);
    const glass = new THREE.Mesh(cabinGlassGeo, mats.cabinGlass);
    body.castShadow = true;
    glass.castShadow = false;
    g.add(body, glass);
    g.userData.offset = 0.08 + i * 0.24;
    dynamicGroup.add(g);
    cabins.push(g);
  }

  const waterGeo = new THREE.PlaneGeometry(350, 120, 24, 8);
  waterGeo.rotateX(-Math.PI / 2);
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.position.set(830, 17.5, 150);
  water.renderOrder = 2;
  water.name = 'enshi-gorge-water';
  dynamicGroup.add(water);

  const falls = [];
  const fallDefs = [
    [1002, 90, 140, 14, 146],
    [1002, 92, 162, 20, 150],
    [1002, 88, 184, 11, 142],
    [958, 84, 84, 16, 132],
  ];
  for (let i = 0; i < fallDefs.length; i++) {
    const f = fallDefs[i];
    const geo = new THREE.PlaneGeometry(f[3], f[4]);
    const mesh = new THREE.Mesh(geo, fallMat);
    mesh.rotation.y = i === 3 ? 0 : -Math.PI / 2;
    mesh.position.set(f[0], f[1], f[2]);
    mesh.renderOrder = 4;
    dynamicGroup.add(mesh);
    falls.push(mesh);
  }

  const mistMat = makeCloudMaterial(0.24, 0xe9f3f0);
  const mists = [];
  for (let i = 0; i < 7; i++) {
    const spr = new THREE.Sprite(mistMat);
    spr.position.set(830 + (i - 3) * 42, 26 + (i % 2) * 18, 150 + (i % 3 - 1) * 22);
    spr.scale.set(120 + i * 12, 46 + i * 6, 1);
    spr.userData.baseX = spr.position.x;
    spr.userData.baseY = spr.position.y;
    spr.userData.phase = i * 1.3;
    dynamicGroup.add(spr);
    mists.push(spr);
  }

  const cloudMats = [makeCloudMaterial(0.22), makeCloudMaterial(0.16, 0xf0f4f1)];
  const clouds = [];
  const cloudDefs = [
    [570, 52, -120, 260, 95, 0],
    [760, 66, -250, 340, 120, 1],
    [700, 46, 300, 300, 104, 0],
    [880, 58, 380, 320, 110, 1],
    [840, 42, 30, 260, 90, 1],
    [520, 88, -300, 240, 86, 0],
  ];
  for (let i = 0; i < cloudDefs.length; i++) {
    const d = cloudDefs[i];
    const spr = new THREE.Sprite(cloudMats[d[5]]);
    spr.position.set(d[0], d[1], d[2]);
    spr.scale.set(d[3], d[4], 1);
    spr.userData.baseX = d[0];
    spr.userData.baseY = d[1];
    spr.userData.drift = 5 + i * 1.4;
    spr.userData.phase = i * 0.9;
    spr.renderOrder = 3;
    dynamicGroup.add(spr);
    clouds.push(spr);
  }

  bucket.add(mergeGeometryList(trunks), mats.trunk);
  bucket.add(mergeGeometryList(foliage), mats.pineDeep);
  bucket.build(staticGroup);
  const mergedStatic = mergeStaticGroup(staticGroup);
  mergedStatic.name = 'enshi-merged-static';
  root.add(mergedStatic);

  root.add(dynamicGroup);

  root.add(makeLabel('七星寨', 'QIXINGZHAI CLIFF CORRIDOR', 720, 214, -130, 0.95));
  root.add(makeLabel('一炷香', 'YIZHUXIANG PILLAR', 575, 270, -175, 0.9));
  root.add(makeLabel('云龙地缝', 'YUNLONG GORGE', 836, 132, 150, 0.85));
  root.add(makeLabel('绝壁栈道', 'CLIFFSIDE PLANK WALKWAY', 628, 144, -232, 0.72));
  root.add(makeLabel('七星寨索道', 'CABLE CAR', 815, 190, 110, 0.72));

  let waterPhase = 0;
  const tmpPos = new THREE.Vector3();
  const tmpTan = new THREE.Vector3();

  function update(elapsed, dt) {
    const step = Number.isFinite(dt) ? dt : 0.016;
    waterPhase += step;
    waterTexture.offset.x = (waterTexture.offset.x + step * 0.035) % 1;
    waterTexture.offset.y = (waterTexture.offset.y + step * 0.012) % 1;
    fallTexture.offset.y = (fallTexture.offset.y - step * 0.42) % 1;
    water.position.y = 17.5 + Math.sin(elapsed * 0.8) * 0.12;

    for (let i = 0; i < falls.length; i++) {
      falls[i].material.opacity = 0.58 + Math.sin(elapsed * 1.7 + i) * 0.08;
    }
    for (const m of mists) {
      m.position.x = m.userData.baseX + Math.sin(elapsed * 0.07 + m.userData.phase) * 16;
      m.position.y = m.userData.baseY + Math.sin(elapsed * 0.16 + m.userData.phase) * 2.5;
    }
    for (const c of clouds) {
      c.position.x = c.userData.baseX + Math.sin(elapsed * 0.014 + c.userData.phase) * c.userData.drift * 3;
      c.position.y = c.userData.baseY + Math.sin(elapsed * 0.02 + c.userData.phase) * 2.2;
    }

    for (let i = 0; i < cabins.length; i++) {
      const cabin = cabins[i];
      let t = (elapsed * 0.012 + cabin.userData.offset) % 1;
      if (t < 0) t += 1;
      cableCurve.getPointAt(t, tmpPos);
      cableCurve.getTangentAt(t, tmpTan);
      cabin.position.copy(tmpPos);
      cabin.rotation.y = Math.atan2(tmpTan.x, tmpTan.z);
      cabin.rotation.z = Math.sin(elapsed * 0.7 + i) * 0.025;
    }
  }

  update(0.2, 0.016);

  return {
    group: root,
    update,
    water,
    falls,
    cabins,
    clouds,
    pillar,
    views: {
      overview: { p: [-300, 296, 760], t: [760, 120, 80] },
      qixingzhai: { p: [470, 232, -120], t: [665, 180, -100] },
      yizhuxiang: { p: [350, 176, -330], t: [575, 138, -175] },
      yunlong: { p: [220, 112, 150], t: [880, 78, 150] },
      dusk: { p: [-260, 258, 680], t: [760, 116, 60] },
    },
  };
}
