import * as THREE from 'three';
import { makeNormalMap } from './textures.js';

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

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

function finish(canvas, repeat = true, srgb = true) {
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

function makeGrassMap() {
  const [c, ctx] = makeCanvas(256, 256);
  const rand = mulberry32(6111);
  ctx.fillStyle = '#9da56f';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 5200; i++) {
    const x = rand() * 256;
    const y = rand() * 256;
    const h = 1 + rand() * 7;
    const v = rand();
    ctx.strokeStyle = v < 0.45
      ? 'rgba(68,86,40,' + (0.08 + rand() * 0.22).toFixed(3) + ')'
      : 'rgba(218,216,150,' + (0.05 + rand() * 0.18).toFixed(3) + ')';
    ctx.lineWidth = 0.45 + rand() * 0.9;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (rand() - 0.5) * 2.4, y - h);
    ctx.stroke();
  }
  for (let i = 0; i < 700; i++) {
    ctx.fillStyle = 'rgba(120,104,54,' + (0.04 + rand() * 0.1).toFixed(3) + ')';
    ctx.beginPath();
    ctx.arc(rand() * 256, rand() * 256, 0.5 + rand() * 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
  return finish(c);
}

function makeWaterMap() {
  const [c, ctx] = makeCanvas(256, 256);
  const rand = mulberry32(8301);
  ctx.fillStyle = '#698b80';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 260; i++) {
    const y = rand() * 256;
    ctx.strokeStyle = rand() < 0.57
      ? 'rgba(210,232,222,' + (0.04 + rand() * 0.12).toFixed(3) + ')'
      : 'rgba(30,58,62,' + (0.05 + rand() * 0.16).toFixed(3) + ')';
    ctx.lineWidth = 0.5 + rand() * 2.0;
    ctx.beginPath();
    ctx.moveTo(-10, y);
    ctx.bezierCurveTo(70, y + rand() * 9 - 4.5, 170, y + rand() * 9 - 4.5, 266, y + rand() * 5 - 2.5);
    ctx.stroke();
  }
  for (let i = 0; i < 90; i++) {
    ctx.fillStyle = 'rgba(238,232,190,' + (0.025 + rand() * 0.07).toFixed(3) + ')';
    ctx.beginPath();
    ctx.ellipse(rand() * 256, rand() * 256, 4 + rand() * 24, 0.7 + rand() * 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  return finish(c);
}

function makeDoorMap() {
  const [c, ctx] = makeCanvas(160, 224);
  ctx.fillStyle = '#7a3d21';
  ctx.fillRect(0, 0, 160, 224);
  ctx.fillStyle = '#a9512b';
  ctx.fillRect(9, 9, 142, 206);
  ctx.fillStyle = '#1f6d70';
  ctx.fillRect(26, 30, 108, 168);
  ctx.strokeStyle = '#e7c477';
  ctx.lineWidth = 5;
  ctx.strokeRect(20, 24, 120, 180);
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(80, 34);
  ctx.lineTo(80, 194);
  ctx.moveTo(30, 112);
  ctx.lineTo(130, 112);
  ctx.stroke();
  ctx.fillStyle = 'rgba(232,196,118,0.85)';
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.arc(44 + i * 18, 72, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.arc(52 + i * 18, 150, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#d9b15f';
  ctx.beginPath();
  ctx.arc(80, 112, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1d5f63';
  ctx.beginPath();
  ctx.arc(80, 112, 6, 0, Math.PI * 2);
  ctx.fill();
  return finish(c, false);
}

function makeCloudTexture(seed) {
  const [c, ctx] = makeCanvas(512, 320);
  const rand = mulberry32(seed);
  ctx.clearRect(0, 0, 512, 320);
  ctx.globalCompositeOperation = 'source-over';
  const blobs = 22;
  for (let i = 0; i < blobs; i++) {
    const cx = 60 + rand() * 392;
    const cy = 155 + (rand() - 0.5) * 80;
    const rx = 34 + rand() * 100;
    const ry = 18 + rand() * 52;
    const g = ctx.createRadialGradient(cx, cy, 1, cx, cy, rx);
    const bright = 0.42 + rand() * 0.5;
    g.addColorStop(0, 'rgba(255,255,255,' + bright.toFixed(3) + ')');
    g.addColorStop(0.55, 'rgba(255,245,235,' + (bright * 0.62).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(255,240,225,0)');
    ctx.fillStyle = g;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, ry / rx);
    ctx.beginPath();
    ctx.arc(0, 0, rx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.globalCompositeOperation = 'destination-in';
  const mask = ctx.createLinearGradient(0, 0, 0, 320);
  mask.addColorStop(0, 'rgba(0,0,0,0)');
  mask.addColorStop(0.18, 'rgba(0,0,0,0.88)');
  mask.addColorStop(0.76, 'rgba(0,0,0,0.96)');
  mask.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = mask;
  ctx.fillRect(0, 0, 512, 320);
  return finish(c, false);
}

function makeGlowTexture() {
  const [c, ctx] = makeCanvas(256, 256);
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(255,238,196,1)');
  g.addColorStop(0.14, 'rgba(255,215,150,0.78)');
  g.addColorStop(0.38, 'rgba(255,168,96,0.24)');
  g.addColorStop(1, 'rgba(255,140,70,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  return finish(c, false);
}

const grassMap = makeGrassMap();
grassMap.repeat.set(110, 110);
const grassNormal = makeNormalMap(grassMap, 1.6);
grassNormal.repeat.set(110, 110);

const waterMap = makeWaterMap();
waterMap.repeat.set(2.4, 3.4);
const waterNormal = makeNormalMap(waterMap, 1.9);
waterNormal.repeat.set(2.4, 3.4);

const cloudA = makeCloudTexture(4311);
const cloudB = makeCloudTexture(8217);
const cloudC = makeCloudTexture(1907);

export const mats = {
  terrain: new THREE.MeshStandardMaterial({
    map: grassMap,
    normalMap: grassNormal,
    normalScale: new THREE.Vector2(0.55, 0.55),
    vertexColors: true,
    roughness: 1,
    metalness: 0,
  }),
  water: new THREE.MeshStandardMaterial({
    map: waterMap,
    normalMap: waterNormal,
    normalScale: new THREE.Vector2(0.85, 0.85),
    color: 0x88a99d,
    emissive: 0x18302f,
    emissiveIntensity: 0.34,
    roughness: 0.13,
    metalness: 0.32,
    transparent: true,
    opacity: 0.88,
    depthWrite: false,
    side: THREE.DoubleSide,
  }),
  farA: new THREE.MeshStandardMaterial({ color: 0x7f9474, roughness: 1, flatShading: true }),
  farB: new THREE.MeshStandardMaterial({ color: 0x96a37e, roughness: 1, flatShading: true }),
  farC: new THREE.MeshStandardMaterial({ color: 0xb0ad87, roughness: 1, flatShading: true }),

  yurtWall: new THREE.MeshStandardMaterial({ color: 0xf3efe2, roughness: 0.93 }),
  yurtRoof: new THREE.MeshStandardMaterial({ color: 0xf8f3e5, roughness: 0.9 }),
  yurtTrim: new THREE.MeshStandardMaterial({ color: 0xc27236, roughness: 0.85 }),
  yurtTeal: new THREE.MeshStandardMaterial({ color: 0x2d6d70, roughness: 0.85 }),
  yurtDoor: new THREE.MeshStandardMaterial({ map: makeDoorMap(), roughness: 0.86 }),
  rope: new THREE.MeshStandardMaterial({ color: 0x8d7b57, roughness: 0.98 }),
  wood: new THREE.MeshStandardMaterial({ color: 0x745334, roughness: 0.96 }),
  woodDark: new THREE.MeshStandardMaterial({ color: 0x4c3724, roughness: 0.98 }),
  stone: new THREE.MeshStandardMaterial({ color: 0x9b9788, roughness: 1, flatShading: true }),
  stoneDark: new THREE.MeshStandardMaterial({ color: 0x777467, roughness: 1, flatShading: true }),
  stoneLight: new THREE.MeshStandardMaterial({ color: 0xb8b2a1, roughness: 1, flatShading: true }),
  flag: new THREE.MeshStandardMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
    roughness: 0.92,
    metalness: 0,
  }),
  birchTrunk: new THREE.MeshStandardMaterial({ color: 0xe3deca, roughness: 0.92 }),
  birchMark: new THREE.MeshStandardMaterial({ color: 0x50483b, roughness: 0.95 }),
  birchLeaf: new THREE.MeshStandardMaterial({ color: 0x7f9740, roughness: 0.97, flatShading: true }),
  birchLeafGold: new THREE.MeshStandardMaterial({ color: 0xa8a74b, roughness: 0.97, flatShading: true }),
  grass: new THREE.MeshStandardMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
    roughness: 1,
    metalness: 0,
  }),
  flower: new THREE.MeshStandardMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
    roughness: 0.95,
    metalness: 0,
  }),
  horseBody: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.88 }),
  horseMane: new THREE.MeshStandardMaterial({ color: 0x2c2119, roughness: 0.94 }),
  sheepWool: new THREE.MeshStandardMaterial({ color: 0xe9e5d6, roughness: 1 }),
  sheepDark: new THREE.MeshStandardMaterial({ color: 0x4c4339, roughness: 0.98 }),

  cloudWarm: new THREE.SpriteMaterial({
    map: cloudA,
    color: 0xffd8ad,
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
    fog: false,
    toneMapped: true,
  }),
  cloudRose: new THREE.SpriteMaterial({
    map: cloudB,
    color: 0xf3a98a,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
    fog: false,
    toneMapped: true,
  }),
  cloudDark: new THREE.SpriteMaterial({
    map: cloudC,
    color: 0x7e6c74,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    fog: false,
    toneMapped: true,
  }),
  cloudWhite: new THREE.SpriteMaterial({
    map: cloudA,
    color: 0xfff0d6,
    transparent: true,
    opacity: 0.58,
    depthWrite: false,
    fog: false,
    toneMapped: true,
  }),
  glow: new THREE.SpriteMaterial({
    map: makeGlowTexture(),
    color: 0xffd49a,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
    toneMapped: true,
  }),
};

mats.water.userData.noShadow = true;
mats.flag.userData.noShadow = true;
mats.glass = mats.yurtTeal;
mats.ribbon = mats.yurtTrim;
mats.sign = mats.yurtDoor;

export const sharedTextures = { grassMap, waterMap, cloudA, cloudB, cloudC };
