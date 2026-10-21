import * as THREE from 'three';
import {
  makeGraniteTexture,
  makeStoneTexture,
  makeWalkwayTexture,
  makeRoofTexture,
  makeMistTexture,
  makeCloudTexture,
  makeGlowTexture,
  makeNormalMap,
  makePlaqueTexture,
  makeBannerTexture,
} from './textures.js';

function seeded(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvasTexture(canvas, { srgb = true, repeat = true, anisotropy = 8 } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  if (repeat) {
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
  }
  t.anisotropy = anisotropy;
  t.needsUpdate = true;
  return t;
}

function makeIslandGroundTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const ctx = c.getContext('2d');
  const rand = seeded(70213);
  ctx.fillStyle = '#7d8164';
  ctx.fillRect(0, 0, 512, 512);

  const tones = ['#707a55', '#65734e', '#898867', '#5e6d4c', '#918c6e', '#7f8263', '#59684b'];
  for (let i = 0; i < 320; i++) {
    const x = rand() * 512;
    const y = rand() * 512;
    const r = 8 + rand() * 54;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, tones[(rand() * tones.length) | 0]);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.12 + rand() * 0.16;
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.globalAlpha = 1;

  for (let i = 0; i < 210; i++) {
    ctx.fillStyle = `rgba(150,150,136,${0.03 + rand() * 0.1})`;
    ctx.beginPath();
    ctx.ellipse(rand() * 512, rand() * 512, 2 + rand() * 15, 1 + rand() * 7, rand() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 3800; i++) {
    const v = 0.55 + rand() * 0.6;
    const tone = rand() < 0.5 ? [99, 112, 77] : [128, 130, 104];
    ctx.fillStyle = `rgba(${(tone[0] * v) | 0},${(tone[1] * v) | 0},${(tone[2] * v) | 0},${0.1 + rand() * 0.22})`;
    ctx.fillRect(rand() * 512, rand() * 512, 1 + rand() * 2.6, 1 + rand() * 2.6);
  }
  for (let i = 0; i < 46; i++) {
    ctx.strokeStyle = `rgba(52,58,45,${0.05 + rand() * 0.12})`;
    ctx.lineWidth = 0.8 + rand() * 2.4;
    ctx.beginPath();
    let x = rand() * 512;
    let y = rand() * 512;
    ctx.moveTo(x, y);
    for (let k = 0; k < 5; k++) {
      x += rand() * 46 - 23;
      y += 8 + rand() * 26;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  return canvasTexture(c);
}

function makeFoamTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext('2d');
  const rand = seeded(8134);
  ctx.clearRect(0, 0, 512, 256);
  for (let i = 0; i < 80; i++) {
    const y = 30 + rand() * 196;
    const x = rand() * 512;
    const w = 30 + rand() * 150;
    const g = ctx.createLinearGradient(x, y, x + w, y);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.35, `rgba(255,255,255,${0.1 + rand() * 0.28})`);
    g.addColorStop(0.7, `rgba(242,250,250,${0.08 + rand() * 0.22})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x + w * 0.5, y, w * 0.5, 2 + rand() * 7, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.08 + rand() * 0.34})`;
    ctx.beginPath();
    ctx.arc(rand() * 512, rand() * 256, 0.4 + rand() * 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  return canvasTexture(c);
}

function makeSmokeTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const rand = seeded(9917);
  ctx.clearRect(0, 0, 128, 128);
  for (let i = 0; i < 18; i++) {
    const x = 38 + rand() * 52;
    const y = 34 + rand() * 60;
    const r = 12 + rand() * 30;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(242,240,232,${0.07 + rand() * 0.09})`);
    g.addColorStop(1, 'rgba(238,236,227,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  return canvasTexture(c, { repeat: false, anisotropy: 1 });
}

export const ptextures = {
  ground: makeIslandGroundTexture(),
  granite: makeGraniteTexture(),
  stone: makeStoneTexture(),
  walkway: makeWalkwayTexture(),
  roof: makeRoofTexture(),
  mist: makeMistTexture(),
  cloud: makeCloudTexture(),
  glow: makeGlowTexture(),
  foam: makeFoamTexture(),
  smoke: makeSmokeTexture(),
  banner: makeBannerTexture(),
};

ptextures.ground.repeat.set(34, 34);
ptextures.granite.repeat.set(2.4, 3.6);
ptextures.stone.repeat.set(2.0, 2.0);
ptextures.walkway.repeat.set(1, 1);
ptextures.roof.repeat.set(1, 1);
ptextures.mist.repeat.set(1.5, 1);
ptextures.cloud.wrapS = THREE.ClampToEdgeWrapping;
ptextures.cloud.wrapT = THREE.ClampToEdgeWrapping;
ptextures.foam.wrapS = THREE.RepeatWrapping;
ptextures.foam.wrapT = THREE.ClampToEdgeWrapping;
ptextures.glow.wrapS = THREE.ClampToEdgeWrapping;
ptextures.glow.wrapT = THREE.ClampToEdgeWrapping;

const groundNormal = makeNormalMap(ptextures.ground, 1.7);
const graniteNormal = makeNormalMap(ptextures.granite, 2.4);
const stoneNormal = makeNormalMap(ptextures.stone, 2.0);
const walkwayNormal = makeNormalMap(ptextures.walkway, 1.7);
const roofNormal = makeNormalMap(ptextures.roof, 1.3);

groundNormal.repeat.copy(ptextures.ground.repeat);
graniteNormal.repeat.copy(ptextures.granite.repeat);
stoneNormal.repeat.copy(ptextures.stone.repeat);
walkwayNormal.repeat.copy(ptextures.walkway.repeat);
roofNormal.repeat.copy(ptextures.roof.repeat);

export const mats = {
  ground: new THREE.MeshStandardMaterial({
    map: ptextures.ground,
    normalMap: groundNormal,
    normalScale: new THREE.Vector2(0.8, 0.8),
    vertexColors: true,
    roughness: 1,
    metalness: 0,
  }),
  granite: new THREE.MeshStandardMaterial({
    map: ptextures.granite,
    normalMap: graniteNormal,
    normalScale: new THREE.Vector2(1.15, 1.15),
    color: 0xc0bcae,
    roughness: 1.0,
    metalness: 0,
    flatShading: true,
    vertexColors: true,
  }),
  graniteDark: new THREE.MeshStandardMaterial({
    map: ptextures.granite,
    normalMap: graniteNormal,
    normalScale: new THREE.Vector2(1.25, 1.25),
    color: 0x85867f,
    roughness: 1.0,
    flatShading: true,
  }),
  graniteLight: new THREE.MeshStandardMaterial({
    map: ptextures.granite,
    normalMap: graniteNormal,
    normalScale: new THREE.Vector2(1.05, 1.05),
    color: 0xd2ccbd,
    roughness: 0.97,
    flatShading: true,
  }),
  stone: new THREE.MeshStandardMaterial({
    map: ptextures.stone,
    normalMap: stoneNormal,
    normalScale: new THREE.Vector2(0.9, 0.9),
    roughnessMap: ptextures.stone,
    color: 0xa7a294,
    roughness: 1.03,
    vertexColors: true,
  }),
  stoneDark: new THREE.MeshStandardMaterial({
    map: ptextures.stone,
    normalMap: stoneNormal,
    normalScale: new THREE.Vector2(1.0, 1.0),
    color: 0x74756e,
    roughness: 1.02,
  }),
  stoneLight: new THREE.MeshStandardMaterial({
    map: ptextures.stone,
    normalMap: stoneNormal,
    color: 0xcfc8b6,
    roughness: 0.96,
  }),
  path: new THREE.MeshStandardMaterial({
    map: ptextures.walkway,
    normalMap: walkwayNormal,
    normalScale: new THREE.Vector2(0.75, 0.75),
    roughnessMap: ptextures.walkway,
    color: 0xb2ac9d,
    vertexColors: true,
    roughness: 1.03,
  }),
  roofGray: new THREE.MeshStandardMaterial({
    map: ptextures.roof,
    normalMap: roofNormal,
    color: 0x555e59,
    roughness: 0.86,
    metalness: 0.04,
  }),
  roofGreen: new THREE.MeshStandardMaterial({
    map: ptextures.roof,
    normalMap: roofNormal,
    color: 0x3f6255,
    roughness: 0.8,
    metalness: 0.08,
  }),
  roofYellow: new THREE.MeshStandardMaterial({
    map: ptextures.roof,
    normalMap: roofNormal,
    color: 0xc0922f,
    roughness: 0.62,
    metalness: 0.22,
  }),
  roofDark: new THREE.MeshStandardMaterial({
    map: ptextures.roof,
    normalMap: roofNormal,
    color: 0x3d4542,
    roughness: 0.9,
  }),
  wall: new THREE.MeshStandardMaterial({
    color: 0x9a3a28,
    roughness: 0.86,
    metalness: 0.02,
  }),
  wallDeep: new THREE.MeshStandardMaterial({
    color: 0x75271e,
    roughness: 0.9,
  }),
  wallWarm: new THREE.MeshStandardMaterial({
    color: 0xb05a35,
    roughness: 0.88,
  }),
  wood: new THREE.MeshStandardMaterial({
    color: 0x4b3323,
    roughness: 0.82,
    metalness: 0.03,
  }),
  woodLight: new THREE.MeshStandardMaterial({
    color: 0x6c4b30,
    roughness: 0.8,
  }),
  door: new THREE.MeshStandardMaterial({
    color: 0x5d2119,
    roughness: 0.62,
    metalness: 0.08,
  }),
  lattice: new THREE.MeshStandardMaterial({
    color: 0x2d241c,
    roughness: 0.78,
  }),
  gold: new THREE.MeshStandardMaterial({
    color: 0xc7a252,
    roughness: 0.34,
    metalness: 0.82,
    emissive: 0x2b1e07,
    emissiveIntensity: 0.14,
  }),
  goldDark: new THREE.MeshStandardMaterial({
    color: 0x8d6d2f,
    roughness: 0.46,
    metalness: 0.7,
  }),
  teal: new THREE.MeshStandardMaterial({
    color: 0x2f5a52,
    roughness: 0.64,
    metalness: 0.18,
  }),
  bronze: new THREE.MeshStandardMaterial({
    color: 0x8d6a3f,
    roughness: 0.42,
    metalness: 0.72,
    emissive: 0x1d1206,
    emissiveIntensity: 0.18,
  }),
  bronzeLight: new THREE.MeshStandardMaterial({
    color: 0xb08a51,
    roughness: 0.36,
    metalness: 0.78,
    emissive: 0x291a08,
    emissiveIntensity: 0.16,
  }),
  bronzePatina: new THREE.MeshStandardMaterial({
    color: 0x58705d,
    roughness: 0.72,
    metalness: 0.42,
  }),
  brass: new THREE.MeshStandardMaterial({
    color: 0x9a7738,
    roughness: 0.5,
    metalness: 0.68,
  }),
  trunk: new THREE.MeshStandardMaterial({ color: 0x584a3b, roughness: 0.98 }),
  pineDeep: new THREE.MeshStandardMaterial({
    color: 0x274834,
    roughness: 0.94,
    vertexColors: true,
    flatShading: true,
  }),
  shrub: new THREE.MeshStandardMaterial({ color: 0x3e6441, roughness: 0.95, flatShading: true }),
  shrubLight: new THREE.MeshStandardMaterial({ color: 0x5c7f4f, roughness: 0.95, flatShading: true }),
  grass: new THREE.MeshStandardMaterial({
    color: 0x7f8755,
    roughness: 1,
    side: THREE.DoubleSide,
  }),
  rock: new THREE.MeshStandardMaterial({
    color: 0x8c8f88,
    roughness: 0.98,
    flatShading: true,
  }),
  rockLight: new THREE.MeshStandardMaterial({
    color: 0xaaa79b,
    roughness: 0.98,
    flatShading: true,
  }),
  waterPond: new THREE.MeshStandardMaterial({
    color: 0x24585a,
    roughness: 0.18,
    metalness: 0.28,
    transparent: true,
    opacity: 0.88,
  }),
  lamp: new THREE.MeshStandardMaterial({
    color: 0xf5d79a,
    emissive: 0xffbb66,
    emissiveIntensity: 1.1,
    roughness: 0.6,
  }),
  cloud: new THREE.MeshBasicMaterial({
    map: ptextures.cloud,
    color: 0xf1f5f2,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: true,
  }),
  cloudWarm: new THREE.MeshBasicMaterial({
    map: ptextures.cloud,
    color: 0xf7ddc4,
    transparent: true,
    opacity: 0.66,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: true,
  }),
  mist: new THREE.MeshBasicMaterial({
    map: ptextures.mist,
    color: 0xe9f2ef,
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: true,
  }),
  foam: new THREE.MeshBasicMaterial({
    map: ptextures.foam,
    color: 0xf3fbfa,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: true,
  }),
};

mats.rock.userData.noShadow = false;
mats.cloud.userData.noShadow = true;
mats.cloudWarm.userData.noShadow = true;
mats.foam.userData.noShadow = true;

export function makePlaqueMaterial(text) {
  return new THREE.MeshStandardMaterial({
    map: makePlaqueTexture(text),
    roughness: 0.58,
    metalness: 0.12,
    emissive: 0x24180a,
    emissiveIntensity: 0.24,
  });
}

export function makeBannerMaterial() {
  return new THREE.MeshStandardMaterial({
    map: ptextures.banner,
    roughness: 0.82,
    metalness: 0.04,
    side: THREE.DoubleSide,
  });
}

export function makeSignMaterial(title, sub, foot) {
  return new THREE.MeshStandardMaterial({
    map: ptextures.banner,
    color: 0xd9c9a3,
    roughness: 0.9,
    side: THREE.DoubleSide,
  });
}
