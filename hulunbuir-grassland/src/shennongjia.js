import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { heightAt, trailCurve, trailDistanceSq } from './terrain.js';
import { mergeStaticGroup } from './geometry.js';
import { mats } from './materials.js';
import { makeMistTexture, makeNormalMap } from './textures.js';

function rand32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

function finishTexture(canvas, { repeat = true, srgb = true } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  if (repeat) {
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
  }
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

function makeWoodTexture() {
  const [c, ctx] = makeCanvas(256, 256);
  const rand = rand32(5127);
  ctx.fillStyle = '#5d452f';
  ctx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 32) {
    const v = 0.82 + rand() * 0.26;
    ctx.fillStyle = `rgb(${(132 * v) | 0},${(100 * v) | 0},${(66 * v) | 0})`;
    ctx.fillRect(1, y + 1, 254, 29);
    for (let i = 0; i < 14; i++) {
      ctx.strokeStyle = `rgba(54,36,22,${0.05 + rand() * 0.1})`;
      ctx.lineWidth = 0.6 + rand() * 1.2;
      ctx.beginPath();
      const yy = y + 4 + rand() * 23;
      ctx.moveTo(0, yy);
      ctx.bezierCurveTo(80, yy + rand() * 4 - 2, 170, yy + rand() * 4 - 2, 256, yy);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(238,220,186,0.16)';
    ctx.fillRect(1, y + 1, 254, 1.5);
    ctx.fillStyle = 'rgba(27,20,13,0.34)';
    ctx.fillRect(1, y + 29, 254, 2);
  }
  return finishTexture(c);
}

function makeWaterTexture() {
  const [c, ctx] = makeCanvas(256, 256);
  const rand = rand32(8301);
  ctx.fillStyle = '#6a9392';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 170; i++) {
    const y = rand() * 256;
    ctx.strokeStyle = rand() < 0.5
      ? `rgba(214,236,229,${0.05 + rand() * 0.1})`
      : `rgba(38,72,76,${0.05 + rand() * 0.12})`;
    ctx.lineWidth = 0.6 + rand() * 2.2;
    ctx.beginPath();
    ctx.moveTo(-10, y);
    ctx.bezierCurveTo(70, y + rand() * 8 - 4, 170, y + rand() * 8 - 4, 266, y + rand() * 5 - 2.5);
    ctx.stroke();
  }
  for (let i = 0; i < 60; i++) {
    ctx.fillStyle = `rgba(226,242,234,${0.03 + rand() * 0.08})`;
    ctx.beginPath();
    ctx.ellipse(rand() * 256, rand() * 256, 4 + rand() * 18, 1 + rand() * 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  return finishTexture(c);
}

function makeSignTexture(title, sub, foot) {
  const [c, ctx] = makeCanvas(512, 256);
  ctx.fillStyle = '#4f3c29';
  ctx.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 100; i++) {
    ctx.strokeStyle = `rgba(30,20,12,${0.03 + (i % 8) * 0.012})`;
    ctx.beginPath();
    ctx.moveTo(0, i * 2.6);
    ctx.lineTo(512, i * 2.6 + Math.sin(i) * 2);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(214,199,160,0.45)';
  ctx.lineWidth = 3;
  ctx.strokeRect(17, 16, 478, 224);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ece2c8';
  ctx.font = '600 50px "Noto Serif CJK SC", "Songti SC", "SimSun", serif';
  ctx.fillText(title, 256, 92);
  ctx.font = '600 27px "Noto Serif CJK SC", "Songti SC", serif';
  ctx.fillStyle = '#c8d6c1';
  ctx.fillText(sub, 256, 146);
  ctx.font = '19px "Helvetica Neue", Arial, sans-serif';
  ctx.fillStyle = 'rgba(230,219,190,0.62)';
  ctx.fillText(foot, 256, 194);
  return finishTexture(c, { repeat: false });
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

function addCyl(list, rt, rb, h, seg, x, y, z, rx = 0, rz = 0) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  if (rx) g.rotateX(rx);
  if (rz) g.rotateZ(rz);
  g.translate(x, y, z);
  list.push(g);
  return g;
}

function addCone(list, r, h, seg, x, y, z, ry = 0) {
  const g = new THREE.ConeGeometry(r, h, seg);
  if (ry) g.rotateY(ry);
  g.translate(x, y, z);
  list.push(g);
  return g;
}

function addRock(list, size, x, y, z, rand, squash = 0.7) {
  const g = new THREE.DodecahedronGeometry(size, 0);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    p.setXYZ(
      i,
      p.getX(i) * (0.72 + rand() * 0.5),
      p.getY(i) * squash * (0.78 + rand() * 0.42),
      p.getZ(i) * (0.76 + rand() * 0.46)
    );
  }
  g.computeVertexNormals();
  g.rotateY(rand() * 6.2);
  g.translate(x, y, z);
  list.push(g);
  return g;
}

function addAlignedBox(list, w, h, d, ax, ay, az, bx, by, bz) {
  const dx = bx - ax;
  const dy = by - ay;
  const dz = bz - az;
  const len = Math.hypot(dx, dy, dz) || 0.01;
  const g = new THREE.BoxGeometry(w, h, len + d);
  const q = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(dx / len, dy / len, dz / len)
  );
  g.applyQuaternion(q);
  g.translate((ax + bx) * 0.5, (ay + by) * 0.5, (az + bz) * 0.5);
  list.push(g);
  return g;
}

class Bucket {
  constructor() {
    this.map = new Map();
  }
  add(geo, mat) {
    if (!this.map.has(mat)) this.map.set(mat, []);
    this.map.get(mat).push(geo);
  }
  finish(name, parent) {
    const group = new THREE.Group();
    group.name = name;
    for (const [mat, list] of this.map) {
      const prepared = list.map((g) => (g.index ? g.toNonIndexed() : g));
      const geo = mergeGeometries(prepared, false);
      prepared.forEach((g) => g.dispose());
      list.forEach((g) => {
        if (g.index) g.dispose();
      });
      if (!geo) continue;
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    }
    parent.add(group);
    return group;
  }
}

const woodMap = makeWoodTexture();
woodMap.repeat.set(2.4, 2.4);
const waterMap = makeWaterTexture();
waterMap.repeat.set(3.2, 3.2);
const waterNormal = makeNormalMap(waterMap, 2.1);
waterNormal.repeat.set(3.2, 3.2);
const signSummit = makeSignTexture('神农顶', 'SHENNONGDING · 3106.2 M', 'HUBEI · ROOF OF CENTRAL CHINA');
const signBanbi = makeSignTexture('板壁岩', 'BANBIYAN ROCK SLABS', 'SHENNONGJIA · HUBEI');
const signWetland = makeSignTexture('大九湖', 'DAJIUHU WETLAND', 'SHENNONGJIA · 1700 M');

const overlayMats = {
  wood: new THREE.MeshStandardMaterial({ map: woodMap, color: 0xb08a5f, roughness: 0.92, metalness: 0 }),
  woodDark: new THREE.MeshStandardMaterial({ color: 0x5a432e, roughness: 0.95 }),
  stone: new THREE.MeshStandardMaterial({ color: 0x9a9d90, roughness: 1, flatShading: true }),
  stoneDark: new THREE.MeshStandardMaterial({ color: 0x6f746b, roughness: 1, flatShading: true }),
  stoneLight: new THREE.MeshStandardMaterial({ color: 0xb7b8a9, roughness: 1, flatShading: true }),
  moss: new THREE.MeshStandardMaterial({ color: 0x5a7442, roughness: 1, flatShading: true }),
  conifer: new THREE.MeshStandardMaterial({ color: 0x2b4b37, roughness: 0.98, flatShading: true }),
  coniferLight: new THREE.MeshStandardMaterial({ color: 0x3d6042, roughness: 0.98, flatShading: true }),
  broadleaf: new THREE.MeshStandardMaterial({ color: 0x4d6d38, roughness: 0.98, flatShading: true }),
  broadleafLight: new THREE.MeshStandardMaterial({ color: 0x6d8645, roughness: 0.97, flatShading: true }),
  broadleafGold: new THREE.MeshStandardMaterial({ color: 0x8a8a45, roughness: 0.97, flatShading: true }),
  birch: new THREE.MeshStandardMaterial({ color: 0xcfc9ad, roughness: 0.94 }),
  reed: new THREE.MeshStandardMaterial({ color: 0x7f8a4e, roughness: 1, flatShading: true }),
  reedWarm: new THREE.MeshStandardMaterial({ color: 0xa79452, roughness: 1, flatShading: true }),
  flower: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, side: THREE.DoubleSide }),
  grass: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: THREE.DoubleSide }),
  water: new THREE.MeshStandardMaterial({
    map: waterMap,
    normalMap: waterNormal,
    normalScale: new THREE.Vector2(0.42, 0.42),
    color: 0x8fb6b0,
    emissive: 0x0c2224,
    emissiveIntensity: 0.25,
    roughness: 0.14,
    metalness: 0.18,
    transparent: true,
    opacity: 0.62,
    depthWrite: false,
    side: THREE.DoubleSide,
  }),
  fur: new THREE.MeshStandardMaterial({ color: 0xc99a47, roughness: 0.92 }),
  furLight: new THREE.MeshStandardMaterial({ color: 0xe0b86c, roughness: 0.9 }),
  face: new THREE.MeshStandardMaterial({ color: 0xa9c3cd, roughness: 0.88 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x2d2c25, roughness: 0.9 }),
  bird: new THREE.MeshBasicMaterial({ color: 0x2c3532, side: THREE.DoubleSide }),
  signSummit: new THREE.MeshStandardMaterial({ map: signSummit, roughness: 0.9, side: THREE.DoubleSide }),
  signBanbi: new THREE.MeshStandardMaterial({ map: signBanbi, roughness: 0.9, side: THREE.DoubleSide }),
  signWetland: new THREE.MeshStandardMaterial({ map: signWetland, roughness: 0.9, side: THREE.DoubleSide }),
};
function bBox(bucket, w, h, d, x, y, z, ry, mat, rx = 0, rz = 0) {
  const arr = [];
  addBox(arr, w, h, d, x, y, z, ry, rx, rz);
  bucket.add(arr[0], mat);
}

function bCyl(bucket, rt, rb, h, seg, x, y, z, mat, rx = 0, rz = 0) {
  const arr = [];
  addCyl(arr, rt, rb, h, seg, x, y, z, rx, rz);
  bucket.add(arr[0], mat);
}

function bCone(bucket, r, h, seg, x, y, z, ry, mat) {
  const arr = [];
  addCone(arr, r, h, seg, x, y, z, ry);
  bucket.add(arr[0], mat);
}

function bRock(bucket, size, x, y, z, rand, mat, squash = 0.7) {
  const arr = [];
  addRock(arr, size, x, y, z, rand, squash);
  bucket.add(arr[0], mat);
}

function bAligned(bucket, w, h, len, ax, ay, az, bx, by, bz, mat) {
  const arr = [];
  addAlignedBox(arr, w, h, len, ax, ay, az, bx, by, bz);
  bucket.add(arr[0], mat);
}

function conifer(bucket, x, z, h, rand) {
  const y = heightAt(x, z);
  bCyl(bucket, h * 0.018, h * 0.042, h * 0.62, 6, x, y + h * 0.31, z, mats.trunk);
  const tiers = 4;
  for (let i = 0; i < tiers; i++) {
    const k = i / (tiers - 1);
    const r = h * (0.2 - k * 0.115);
    const cy = y + h * (0.46 + k * 0.17);
    const mat = i === tiers - 1 ? overlayMats.coniferLight : (rand() < 0.28 ? overlayMats.coniferLight : overlayMats.conifer);
    bCone(bucket, r, h * 0.34, 7, x + (rand() - 0.5) * h * 0.05, cy, z + (rand() - 0.5) * h * 0.05, rand() * 6.2, mat);
  }
  bCone(bucket, h * 0.045, h * 0.2, 6, x, y + h * 0.99, z, rand() * 6.2, overlayMats.coniferLight);
}

function broadleaf(bucket, x, z, h, rand, birchLike) {
  const y = heightAt(x, z);
  const trunkMat = birchLike ? overlayMats.birch : mats.trunk;
  bCyl(bucket, h * 0.022, h * 0.045, h * 0.52, 6, x, y + h * 0.26, z, trunkMat);
  if (birchLike) {
    for (let i = 0; i < 4; i++) {
      bBox(bucket, h * 0.062, 0.12, h * 0.062, x, y + h * (0.16 + i * 0.11), z, rand() * 3, overlayMats.dark);
    }
  }
  const crowns = 3 + (rand() * 2 | 0);
  for (let i = 0; i < crowns; i++) {
    const a = rand() * 6.2;
    const rr = h * (0.08 + rand() * 0.2);
    const size = h * (0.16 + rand() * 0.14);
    const g = new THREE.IcosahedronGeometry(size, 0);
    g.scale(1.15, 0.78 + rand() * 0.24, 1.05);
    g.rotateY(rand() * 6.2);
    g.translate(x + Math.cos(a) * rr, y + h * (0.62 + rand() * 0.3), z + Math.sin(a) * rr);
    const roll = rand();
    const mat = roll < 0.16 ? overlayMats.broadleafGold : (roll < 0.55 ? overlayMats.broadleafLight : overlayMats.broadleaf);
    bucket.add(g, mat);
  }
}

function buildForest(bucket) {
  const rand = rand32(20250);
  const clusters = [
    [120, -110, 235],
    [-120, -255, 205],
    [-330, -200, 180],
    [300, -245, 165],
    [45, 55, 155],
    [-455, -520, 155],
    [455, 30, 170],
    [-190, 90, 185],
  ];
  let placed = 0;
  let attempts = 0;
  while (placed < 215 && attempts < 2400) {
    attempts++;
    let x;
    let z;
    if (rand() < 0.78) {
      const c = clusters[(rand() * clusters.length) | 0];
      const a = rand() * Math.PI * 2;
      const rr = Math.sqrt(rand()) * c[2];
      x = c[0] + Math.cos(a) * rr;
      z = c[1] + Math.sin(a) * rr;
    } else {
      x = (rand() - 0.5) * 1280;
      z = (rand() - 0.5) * 1480 - 120;
    }
    const dWet = Math.hypot(x - 320, z - 130);
    if (dWet < 238) continue;
    if (trailDistanceSq(x, z) < 90) continue;
    if (Math.hypot(x + 62, z + 520) < 52) continue;
    if (Math.hypot(x + 334, z + 364) < 30) continue;
    const y = heightAt(x, z);
    if (y < 24 || y > 282) continue;
    const h = 7 + rand() * 12;
    const pick = rand();
    if (pick < 0.56) conifer(bucket, x, z, h, rand);
    else broadleaf(bucket, x, z, h, rand, pick > 0.9);
    if (rand() < 0.55) {
      const s = 1.2 + rand() * 2.2;
      const g = new THREE.IcosahedronGeometry(s, 0);
      g.scale(1.25, 0.62, 1.2);
      g.translate(x + (rand() - 0.5) * 4, y + 0.5, z + (rand() - 0.5) * 4);
      bucket.add(g, rand() < 0.5 ? overlayMats.broadleaf : overlayMats.moss);
    }
    placed++;
  }

  for (let i = 0; i < 16; i++) {
    const x = (rand() - 0.5) * 900;
    const z = (rand() - 0.5) * 900 - 160;
    if (Math.hypot(x - 320, z - 130) < 260) continue;
    const y = heightAt(x, z);
    const len = 3 + rand() * 5;
    const a = rand() * 6.2;
    bCyl(bucket, 0.22, 0.32, len, 5, x, y + 0.24, z, mats.trunk, Math.PI * 0.5, a);
  }
  return placed;
}

function buildSummit(bucket, staticRoot) {
  const sx = -334;
  const sz = -364;
  const sy = heightAt(sx, sz);
  bCyl(bucket, 14.6, 15.4, 0.7, 30, sx, sy + 0.15, sz, overlayMats.stone);
  bCyl(bucket, 10.5, 10.8, 0.14, 26, sx, sy + 0.55, sz, overlayMats.stoneLight);
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2;
    if (a > 2.5 && a < 3.65) continue;
    const px = sx + Math.cos(a) * 13.9;
    const pz = sz + Math.sin(a) * 13.9;
    bBox(bucket, 0.12, 1.05, 0.12, px, sy + 1.1, pz, 0, overlayMats.woodDark);
  }
  for (let i = 0; i < 25; i++) {
    const a0 = (i / 25) * Math.PI * 2;
    const a1 = ((i + 1) / 25) * Math.PI * 2;
    if (a0 > 2.5 && a0 < 3.65) continue;
    bAligned(
      bucket,
      0.09,
      0.09,
      0.2,
      sx + Math.cos(a0) * 13.9,
      sy + 1.62,
      sz + Math.sin(a0) * 13.9,
      sx + Math.cos(a1) * 13.9,
      sy + 1.62,
      sz + Math.sin(a1) * 13.9,
      overlayMats.woodDark
    );
  }

  const cairn = 8;
  for (let i = 0; i < cairn; i++) {
    const size = 1.75 - i * 0.17;
    bRock(bucket, size, sx - 2.5, sy + 0.8 + i * 0.54, sz - 1.8, rand32(800 + i), i % 2 ? overlayMats.stoneDark : overlayMats.stone, 0.45);
  }

  bBox(bucket, 0.18, 2.9, 0.18, sx + 5.2, sy + 1.45, sz + 8.4, 0.55, overlayMats.woodDark);
  bBox(bucket, 0.18, 2.9, 0.18, sx + 8.6, sy + 1.45, sz + 6.9, 0.55, overlayMats.woodDark);
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 2.4), overlayMats.signSummit);
  plaque.position.set(sx + 6.9, sy + 2.7, sz + 7.65);
  plaque.rotation.y = 0.55;
  plaque.castShadow = true;
  staticRoot.add(plaque);

  for (let i = 0; i < 14; i++) {
    const a = rand32(1900 + i)() * Math.PI * 2;
    const d = 19 + rand32(2900 + i)() * 18;
    const x = sx + Math.cos(a) * d;
    const z = sz + Math.sin(a) * d;
    const h = 3 + rand32(3300 + i)() * 4;
    conifer(bucket, x, z, h, rand32(4100 + i));
  }
}

function buildBoardwalkCurve(bucket, points, closed, width = 3.0, rail = true) {
  const curve = new THREE.CatmullRomCurve3(
    points.map((p) => new THREE.Vector3(p[0], p[1], p[2])),
    closed,
    'centripetal',
    0.4
  );
  const n = Math.max(32, Math.round(curve.getLength() / 5.4));
  const samples = curve.getSpacedPoints(n);
  const segments = closed ? n : n - 1;
  for (let i = 0; i < segments; i++) {
    const a = samples[i];
    const b = samples[(i + 1) % samples.length];
    bAligned(bucket, width, 0.18, 0.12, a.x, a.y + 0.12, a.z, b.x, b.y + 0.12, b.z, overlayMats.wood);
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz) || 1;
    const nx = -dz / len;
    const nz = dx / len;
    if (rail && i % 2 === 0) {
      for (const side of [-1, 1]) {
        const px = a.x + nx * side * (width * 0.5 - 0.08);
        const pz = a.z + nz * side * (width * 0.5 - 0.08);
        bBox(bucket, 0.11, 1.18, 0.11, px, a.y + 0.68, pz, 0, overlayMats.woodDark);
        bAligned(
          bucket,
          0.075,
          0.075,
          0.1,
          px,
          a.y + 1.22,
          pz,
          b.x + nx * side * (width * 0.5 - 0.08),
          b.y + 1.22,
          b.z + nz * side * (width * 0.5 - 0.08),
          overlayMats.woodDark
        );
      }
    }
  }
  return curve;
}

function buildTrailBoardwalk(bucket) {
  const n = 180;
  const samples = trailCurve.getSpacedPoints(n);
  for (let i = 0; i < n - 1; i++) {
    const a = samples[i];
    const b = samples[i + 1];
    bAligned(bucket, 2.7, 0.16, 0.08, a.x, a.y + 0.11, a.z, b.x, b.y + 0.11, b.z, overlayMats.wood);
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz) || 1;
    const nx = -dz / len;
    const nz = dx / len;
    if (i % 3 === 0) {
      for (const side of [-1, 1]) {
        const px = a.x + nx * side * 1.28;
        const pz = a.z + nz * side * 1.28;
        bBox(bucket, 0.1, 1.05, 0.1, px, a.y + 0.62, pz, 0, overlayMats.woodDark);
      }
    }
    if (i % 3 === 0) {
      for (const side of [-1, 1]) {
        bAligned(
          bucket,
          0.07,
          0.07,
          0.08,
          a.x + nx * side * 1.28,
          a.y + 1.05,
          a.z + nz * side * 1.28,
          b.x + nx * side * 1.28,
          b.y + 1.05,
          b.z + nz * side * 1.28,
          overlayMats.woodDark
        );
      }
    }
  }
}

const ponds = [
  { x: 300, z: 82, rx: 64, rz: 42, rot: 0.18 },
  { x: 392, z: 152, rx: 46, rz: 32, rot: -0.4 },
  { x: 246, z: 176, rx: 40, rz: 26, rot: 0.5 },
  { x: 346, z: 44, rx: 33, rz: 23, rot: 0.1 },
  { x: 432, z: 92, rx: 27, rz: 19, rot: 0.7 },
];
const waterLevel = 11.25;

function inPond(x, z, margin = 0.9) {
  for (const p of ponds) {
    const c = Math.cos(-p.rot);
    const s = Math.sin(-p.rot);
    const dx = x - p.x;
    const dz = z - p.z;
    const lx = dx * c - dz * s;
    const lz = dx * s + dz * c;
    if ((lx * lx) / (p.rx * p.rx) + (lz * lz) / (p.rz * p.rz) < margin) return true;
  }
  return false;
}

function buildWetland(bucket, dynamic, staticRoot) {
  const rand = rand32(7077);
  for (const p of ponds) {
    const geo = new THREE.CircleGeometry(1, 56);
    geo.rotateX(-Math.PI / 2);
    geo.scale(p.rx, 1, p.rz);
    geo.rotateY(p.rot);
    const mesh = new THREE.Mesh(geo, overlayMats.water);
    mesh.position.set(p.x, waterLevel, p.z);
    mesh.receiveShadow = true;
    mesh.renderOrder = 1;
    mesh.name = 'dajiuhu-water';
    dynamic.add(mesh);
  }

  for (const p of ponds) {
    for (let i = 0; i < 22; i++) {
      const a = rand() * Math.PI * 2;
      const rr = 1.02 + rand() * 0.14;
      const x = p.x + Math.cos(a) * p.rx * rr;
      const z = p.z + Math.sin(a) * p.rz * rr;
      const y = Math.max(heightAt(x, z), waterLevel - 0.15) + 0.2;
      bRock(bucket, 0.7 + rand() * 1.8, x, y, z, rand, rand() < 0.5 ? overlayMats.stone : overlayMats.moss, 0.5);
    }
    for (let i = 0; i < 46; i++) {
      const a = rand() * Math.PI * 2;
      const rr = 1.0 + rand() * 0.13;
      const x = p.x + Math.cos(a) * p.rx * rr;
      const z = p.z + Math.sin(a) * p.rz * rr;
      const y = Math.max(heightAt(x, z), waterLevel + 0.05);
      const h = 1.0 + rand() * 1.8;
      const mat = rand() < 0.28 ? overlayMats.reedWarm : overlayMats.reed;
      for (let k = 0; k < 2; k++) {
        bCone(bucket, 0.055 + rand() * 0.035, h * (0.8 + rand() * 0.4), 3, x + (rand() - 0.5) * 0.35, y + h * 0.42, z + (rand() - 0.5) * 0.35, rand() * 6.2, mat);
      }
    }
  }

  const loop = [
    [402, 12.05, 252], [446, 12.0, 206], [472, 11.95, 156], [462, 11.95, 104],
    [420, 11.9, 58], [356, 11.9, 28], [290, 11.9, 26], [234, 11.9, 62],
    [211, 11.9, 122], [222, 11.9, 182], [270, 11.95, 230], [338, 12.0, 254],
  ];
  buildBoardwalkCurve(bucket, loop, true, 2.8, true);

  const pavX = 492;
  const pavZ = 160;
  bCyl(bucket, 6.4, 6.8, 0.55, 16, pavX, waterLevel + 0.35, pavZ, overlayMats.wood);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    bBox(bucket, 0.18, 3.0, 0.18, pavX + Math.cos(a) * 5.3, waterLevel + 2.0, pavZ + Math.sin(a) * 5.3, 0, overlayMats.woodDark);
  }
  bCone(bucket, 7.4, 2.8, 8, pavX, waterLevel + 5.0, pavZ, Math.PI / 8, overlayMats.woodDark);
  bCone(bucket, 0.6, 0.9, 6, pavX, waterLevel + 6.8, pavZ, 0, overlayMats.woodDark);

  const sx = 352;
  const sz = 206;
  const sy = heightAt(sx, sz);
  bBox(bucket, 0.18, 2.5, 0.18, sx - 2.3, sy + 1.25, sz, 0.1, overlayMats.woodDark);
  bBox(bucket, 0.18, 2.5, 0.18, sx + 2.3, sy + 1.25, sz, 0.1, overlayMats.woodDark);
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 2.2), overlayMats.signWetland);
  plaque.position.set(sx, sy + 2.4, sz + 0.04);
  plaque.rotation.y = 0.1;
  plaque.castShadow = true;
  staticRoot.add(plaque);
}

function buildBanbiyan(bucket, staticRoot) {
  const bx = -62;
  const bz = -520;
  const rand = rand32(4242);
  for (let i = 0; i < 17; i++) {
    const a = rand() * Math.PI * 2;
    const d = 3 + rand() * 22;
    const x = bx + Math.cos(a) * d;
    const z = bz + Math.sin(a) * d;
    const gy = heightAt(x, z);
    const w = 2.6 + rand() * 4.6;
    const h = 7 + rand() * 15;
    const dep = 0.8 + rand() * 1.4;
    const ry = rand() * Math.PI * 2;
    const tilt = (rand() - 0.5) * 0.2;
    const mat = i % 3 === 0 ? overlayMats.stoneLight : (i % 3 === 1 ? overlayMats.stone : overlayMats.stoneDark);
    bBox(bucket, w, h, dep, x, gy + h * 0.46, z, ry, mat, tilt);
    for (let k = 0; k < 3; k++) {
      bBox(bucket, w * (0.6 + rand() * 0.5), 0.16 + rand() * 0.18, dep * (0.9 + rand() * 0.3), x, gy + h * (0.22 + k * 0.28), z, ry, overlayMats.stoneDark, tilt);
    }
    for (let k = 0; k < 2; k++) {
      const g = new THREE.IcosahedronGeometry(0.5 + rand() * 1.1, 0);
      g.scale(1.5, 0.22, 0.9);
      g.rotateY(ry);
      g.translate(x + (rand() - 0.5) * w * 0.7, gy + 0.8 + rand() * h * 0.5, z + (rand() - 0.5) * dep);
      bucket.add(g, rand() < 0.5 ? overlayMats.moss : overlayMats.broadleaf);
    }
  }
  for (let i = 0; i < 15; i++) {
    const a = rand() * Math.PI * 2;
    const d = 12 + rand() * 18;
    const x = bx + Math.cos(a) * d;
    const z = bz + Math.sin(a) * d;
    bRock(bucket, 1.2 + rand() * 3.2, x, heightAt(x, z) + 0.4, z, rand, rand() < 0.5 ? overlayMats.stone : overlayMats.moss, 0.6);
  }

  const sx = bx + 9;
  const sz = bz + 22;
  const sy = heightAt(sx, sz);
  bBox(bucket, 0.18, 2.5, 0.18, sx - 2.3, sy + 1.25, sz, 0.25, overlayMats.woodDark);
  bBox(bucket, 0.18, 2.5, 0.18, sx + 2.3, sy + 1.25, sz, 0.25, overlayMats.woodDark);
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 2.2), overlayMats.signBanbi);
  plaque.position.set(sx, sy + 2.4, sz + 0.08);
  plaque.rotation.y = 0.25;
  plaque.castShadow = true;
  staticRoot.add(plaque);

  const spur = [
    [-128, 246, -340], [-112, 239, -382], [-96, 230, -424], [-80, 220, -464], [-56, 212, -492],
  ];
  buildBoardwalkCurve(bucket, spur, false, 2.4, true);
  for (let i = 0; i < 10; i++) {
    const a = rand() * Math.PI * 2;
    const d = 24 + rand() * 14;
    const x = bx + Math.cos(a) * d;
    const z = bz + Math.sin(a) * d;
    conifer(bucket, x, z, 4 + rand() * 6, rand);
  }
}

function buildMeadowPlants(staticRoot) {
  const rand = rand32(6060);
  const petals = [
    new THREE.Color(0xf2d45a), new THREE.Color(0xf7f2e6), new THREE.Color(0xca8bd6),
    new THREE.Color(0xe66f66), new THREE.Color(0xffb14d), new THREE.Color(0xa9c7e8),
  ];
  const bladeColors = [
    new THREE.Color(0x6f8748), new THREE.Color(0x879757), new THREE.Color(0x58733f),
    new THREE.Color(0xa0a965), new THREE.Color(0x748c4d),
  ];
  const fPos = [];
  const fCol = [];
  const gPos = [];
  const gCol = [];

  function addFlower(x, z, y) {
    const size = 0.34 + rand() * 0.34;
    const color = petals[(rand() * petals.length) | 0];
    for (const rot of [rand() * 6.2, rand() * 6.2 + Math.PI * 0.5]) {
      const c = Math.cos(rot);
      const s = Math.sin(rot);
      const dx = c * size * 0.5;
      const dz = s * size * 0.5;
      fPos.push(
        x - dx, y, z - dz, x + dx, y, z + dz, x + dx, y + size, z + dz,
        x - dx, y, z - dz, x + dx, y + size, z + dz, x - dx, y + size, z - dz
      );
      for (let k = 0; k < 6; k++) fCol.push(color.r, color.g, color.b);
    }
  }

  function addBlade(x, z, y) {
    const h = 0.38 + rand() * 0.62;
    const w = 0.07 + rand() * 0.09;
    const a = rand() * 6.2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const color = bladeColors[(rand() * bladeColors.length) | 0];
    gPos.push(
      x - c * w, y, z - s * w,
      x + c * w, y, z + s * w,
      x + (rand() - 0.5) * 0.2, y + h, z + (rand() - 0.5) * 0.2
    );
    for (let k = 0; k < 3; k++) gCol.push(color.r, color.g, color.b);
  }

  for (let i = 0; i < 1100; i++) {
    let x;
    let z;
    if (rand() < 0.8) {
      const a = rand() * Math.PI * 2;
      const d = Math.sqrt(rand()) * 325;
      x = 320 + Math.cos(a) * d;
      z = 130 + Math.sin(a) * d;
      if (inPond(x, z, 1.03)) continue;
    } else {
      const a = rand() * Math.PI * 2;
      const d = Math.sqrt(rand()) * 44;
      if (d < 15) continue;
      x = -334 + Math.cos(a) * d;
      z = -364 + Math.sin(a) * d;
    }
    addFlower(x, z, heightAt(x, z) + 0.06);
  }

  for (let i = 0; i < 2600; i++) {
    let x;
    let z;
    const roll = rand();
    if (roll < 0.73) {
      const a = rand() * Math.PI * 2;
      const d = Math.sqrt(rand()) * 340;
      x = 320 + Math.cos(a) * d;
      z = 130 + Math.sin(a) * d;
      if (inPond(x, z, 1.02)) continue;
    } else if (roll < 0.88) {
      const a = rand() * Math.PI * 2;
      const d = Math.sqrt(rand()) * 58;
      if (d < 15) continue;
      x = -334 + Math.cos(a) * d;
      z = -364 + Math.sin(a) * d;
    } else {
      x = (rand() - 0.5) * 900;
      z = (rand() - 0.5) * 900 - 140;
      if (trailDistanceSq(x, z) < 8) continue;
      const y = heightAt(x, z);
      if (y < 30 || y > 250) continue;
    }
    addBlade(x, z, heightAt(x, z) + 0.02);
  }

  const flowerGeo = new THREE.BufferGeometry();
  flowerGeo.setAttribute('position', new THREE.Float32BufferAttribute(fPos, 3));
  flowerGeo.setAttribute('color', new THREE.Float32BufferAttribute(fCol, 3));
  flowerGeo.computeVertexNormals();
  const flowerMesh = new THREE.Mesh(flowerGeo, overlayMats.flower);
  flowerMesh.castShadow = false;
  flowerMesh.receiveShadow = true;
  staticRoot.add(flowerMesh);

  const grassGeo = new THREE.BufferGeometry();
  grassGeo.setAttribute('position', new THREE.Float32BufferAttribute(gPos, 3));
  grassGeo.setAttribute('color', new THREE.Float32BufferAttribute(gCol, 3));
  grassGeo.computeVertexNormals();
  const grassMesh = new THREE.Mesh(grassGeo, overlayMats.grass);
  grassMesh.castShadow = false;
  grassMesh.receiveShadow = true;
  staticRoot.add(grassMesh);

  return { flowers: fPos.length / 18, blades: gPos.length / 9 };
}

function makeMonkey(x, z, scale, seed) {
  const rand = rand32(seed);
  const y = heightAt(x, z);
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.rotation.y = rand() * Math.PI * 2;
  group.scale.setScalar(scale);

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), overlayMats.fur);
  body.scale.set(0.9, 1.28, 0.78);
  body.position.y = 0.62;
  body.castShadow = true;
  group.add(body);

  const chest = new THREE.Mesh(new THREE.SphereGeometry(0.27, 8, 6), overlayMats.furLight);
  chest.scale.set(0.9, 1.05, 0.7);
  chest.position.set(0, 0.68, 0.18);
  group.add(chest);

  const head = new THREE.Group();
  head.position.set(0, 1.25, 0.02);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), overlayMats.fur);
  skull.castShadow = true;
  head.add(skull);
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.21, 10, 8), overlayMats.face);
  face.scale.set(1, 1.16, 0.56);
  face.position.set(0, -0.01, 0.21);
  head.add(face);
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.033, 6, 5), overlayMats.dark);
    eye.position.set(sx * 0.085, 0.06, 0.33);
    head.add(eye);
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.075, 6, 5), overlayMats.furLight);
    ear.scale.set(0.55, 1, 0.5);
    ear.position.set(sx * 0.29, 0.04, 0);
    head.add(ear);
  }
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 5), overlayMats.dark);
  nose.position.set(0, -0.03, 0.35);
  head.add(nose);
  group.add(head);

  for (const sx of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.52, 6), overlayMats.fur);
    arm.position.set(sx * 0.39, 0.68, 0.05);
    arm.rotation.z = sx * 0.5;
    arm.castShadow = true;
    group.add(arm);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.46, 6), overlayMats.fur);
    leg.position.set(sx * 0.18, 0.12, 0);
    leg.rotation.z = sx * 0.16;
    leg.castShadow = true;
    group.add(leg);
  }

  const tailCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.55, -0.28),
    new THREE.Vector3(0.16, 0.28, -0.72),
    new THREE.Vector3(0.05, 0.52, -1.05),
    new THREE.Vector3(-0.18, 0.26, -1.22),
  ]);
  const tail = new THREE.Mesh(new THREE.TubeGeometry(tailCurve, 12, 0.035, 5, false), overlayMats.fur);
  tail.castShadow = true;
  group.add(tail);

  return { group, head, baseY: y, baseRot: group.rotation.y, phase: rand() * 6.2 };
}

function buildMonkeys(dynamic) {
  const defs = [
    [-38, -500, 0.95, 101],
    [-86, -537, 0.86, 102],
    [-30, -531, 0.78, 103],
    [144, -140, 0.9, 104],
    [-60, -512, 1.02, 105],
  ];
  const monkeys = defs.map((d) => {
    const state = makeMonkey(d[0], d[1], d[2], d[3]);
    dynamic.add(state.group);
    return state;
  });
  return monkeys;
}

function buildBirds(dynamic) {
  const rand = rand32(9110);
  const flocks = [
    { cx: 90, cz: -90, cy: 128, r: 135, speed: 0.09, count: 6 },
    { cx: -180, cz: -290, cy: 176, r: 115, speed: 0.07, count: 6 },
    { cx: 345, cz: 95, cy: 72, r: 125, speed: 0.08, count: 5 },
  ];
  const birds = [];
  for (const flock of flocks) {
    for (let i = 0; i < flock.count; i++) {
      const group = new THREE.Group();
      const body = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.66, 5), overlayMats.bird);
      body.rotation.x = Math.PI / 2;
      group.add(body);

      const wingGeo = new THREE.PlaneGeometry(1.05, 0.34);
      wingGeo.rotateX(-Math.PI / 2);
      wingGeo.translate(0.52, 0, 0);
      const wingL = new THREE.Mesh(wingGeo, overlayMats.bird);
      const wingR = new THREE.Mesh(wingGeo, overlayMats.bird);
      wingR.scale.x = -1;
      group.add(wingL, wingR);
      group.scale.setScalar(1.35 + rand() * 0.5);

      dynamic.add(group);
      birds.push({
        group,
        wingL,
        wingR,
        phase: rand() * Math.PI * 2,
        cx: flock.cx,
        cz: flock.cz,
        cy: flock.cy,
        radius: flock.r * (0.78 + rand() * 0.35),
        speed: flock.speed * (0.85 + rand() * 0.3),
        yOff: (rand() - 0.5) * 22,
      });
    }
  }
  return birds;
}

function buildMist(dynamic) {
  const mistMap = makeMistTexture();
  mistMap.repeat.set(1.25, 1);
  const rand = rand32(5005);
  const banks = [];
  const tints = [0xe4ece7, 0xdde8e6, 0xeef2ec];

  for (let i = 0; i < 16; i++) {
    const w = 170 + rand() * 330;
    const h = 55 + rand() * 110;
    const geo = new THREE.PlaneGeometry(w, h);
    const mat = new THREE.MeshBasicMaterial({
      map: mistMap,
      color: tints[i % tints.length],
      transparent: true,
      opacity: 0.15 + rand() * 0.15,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: true,
    });
    const mesh = new THREE.Mesh(geo, mat);
    const a = rand() * Math.PI * 2;
    const d = 90 + rand() * 560;
    const x = Math.cos(a) * d + 20;
    const z = Math.sin(a) * d - 150;
    const y = 24 + rand() * 130;
    mesh.position.set(x, y, z);
    mesh.rotation.y = rand() * Math.PI * 2;
    mesh.renderOrder = 3;
    mesh.userData = { baseX: x, baseY: y, baseRot: mesh.rotation.y, phase: rand() * 6.2, speed: 0.05 + rand() * 0.12, drift: 14 + rand() * 34 };
    dynamic.add(mesh);
    banks.push(mesh);
  }

  for (let i = 0; i < 5; i++) {
    const geo = new THREE.PlaneGeometry(210 + rand() * 150, 120 + rand() * 80);
    const mat = new THREE.MeshBasicMaterial({
      map: mistMap,
      color: 0xe8f0ec,
      transparent: true,
      opacity: 0.1 + rand() * 0.12,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: true,
    });
    const mesh = new THREE.Mesh(geo, mat);
    const a = rand() * Math.PI * 2;
    const d = 30 + rand() * 230;
    const x = 320 + Math.cos(a) * d;
    const z = 130 + Math.sin(a) * d;
    const y = waterLevel + 1.2 + rand() * 5.5;
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = rand() * 6.2;
    mesh.position.set(x, y, z);
    mesh.renderOrder = 3;
    mesh.userData = { baseX: x, baseY: y, baseRot: mesh.rotation.z, phase: rand() * 6.2, speed: 0.06 + rand() * 0.1, drift: 10 + rand() * 22, flat: true };
    dynamic.add(mesh);
    banks.push(mesh);
  }
  return banks;
}

export function createShennongjiaOverlay() {
  const group = new THREE.Group();
  group.name = 'shennongjia-signature';

  const staticRoot = new THREE.Group();
  staticRoot.name = 'shennongjia-static';
  const dynamic = new THREE.Group();
  dynamic.name = 'shennongjia-dynamic';
  const bucket = new Bucket();

  const trees = buildForest(bucket);
  buildSummit(bucket, staticRoot);
  buildTrailBoardwalk(bucket);
  buildWetland(bucket, dynamic, staticRoot);
  buildBanbiyan(bucket, staticRoot);
  const plants = buildMeadowPlants(staticRoot);
  bucket.finish('merged-forest-boardwalk-rocks', staticRoot);

  const merged = mergeStaticGroup(staticRoot);
  merged.name = 'shennongjia-merged-static';
  group.add(merged);

  const monkeys = buildMonkeys(dynamic);
  const birds = buildBirds(dynamic);
  const mist = buildMist(dynamic);
  group.add(dynamic);

  const birdPos = new THREE.Vector3();

  function update(elapsed) {
    const t = elapsed;
    overlayMats.water.map.offset.x = t * 0.0035;
    overlayMats.water.map.offset.y = t * 0.0012;
    overlayMats.water.normalMap.offset.x = t * 0.011;
    overlayMats.water.normalMap.offset.y = t * 0.007;

    for (const m of monkeys) {
      m.group.position.y = m.baseY + Math.sin(t * 1.15 + m.phase) * 0.05;
      m.group.rotation.y = m.baseRot + Math.sin(t * 0.45 + m.phase) * 0.26;
      m.head.rotation.y = Math.sin(t * 0.8 + m.phase) * 0.5;
      m.head.rotation.x = Math.sin(t * 0.6 + m.phase * 1.7) * 0.12;
    }

    for (const b of birds) {
      const a = t * b.speed + b.phase;
      b.group.position.x = b.cx + Math.cos(a) * b.radius;
      b.group.position.z = b.cz + Math.sin(a) * b.radius;
      b.group.position.y = b.cy + b.yOff + Math.sin(t * 0.7 + b.phase * 1.8) * 6;
      birdPos.set(-Math.sin(a), 0, Math.cos(a));
      b.group.rotation.y = Math.atan2(birdPos.x, birdPos.z);
      const flap = Math.sin(t * 9 + b.phase) * 0.62;
      b.wingL.rotation.z = flap;
      b.wingR.rotation.z = -flap;
    }

    for (const bank of mist) {
      const u = bank.userData;
      bank.position.x = u.baseX + Math.sin(t * u.speed + u.phase) * u.drift;
      bank.position.y = u.baseY + Math.sin(t * u.speed * 0.7 + u.phase * 1.3) * 1.4;
      if (u.flat) bank.rotation.z = u.baseRot + Math.sin(t * u.speed * 0.5 + u.phase) * 0.1;
      else bank.rotation.y = u.baseRot + Math.sin(t * u.speed * 0.4 + u.phase) * 0.06;
    }
  }

  return {
    group,
    update,
    static: merged,
    monkeys,
    birds,
    mist,
    counts: {
      trees,
      flowers: plants.flowers,
      grassBlades: plants.blades,
      ponds: ponds.length,
      monkeys: monkeys.length,
      birds: birds.length,
      mistBanks: mist.length,
    },
  };
}





