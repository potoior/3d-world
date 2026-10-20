import * as THREE from 'three';
import {
  makeStoneTexture,
  makeWalkwayTexture,
  makeMountainTexture,
  makeMistTexture,
  makeCloudTexture,
  makeGraniteTexture,
  makeLabelTexture,
  makeNormalMap,
  makeSignTexture,
  makeGlowTexture,
  makeRoofTexture,
  makeSmokeTexture,
  makeInscriptionTexture,
} from './textures.js';

const stoneMap = makeStoneTexture();
const walkwayMap = makeWalkwayTexture();
const mountainMap = makeMountainTexture();
const mistMap = makeMistTexture();
const cloudMap = makeCloudTexture();
const graniteMap = makeGraniteTexture();
const signMap = makeSignTexture('泰山', '十八盘 · 南天门', 'TAISHAN TRAIL');
const glowMap = makeGlowTexture();
const roofMap = makeRoofTexture();
const smokeMap = makeSmokeTexture();
const inscriptionA = makeInscriptionTexture('五岳独尊', 'TAISHAN · 1545 M');
const inscriptionB = makeInscriptionTexture('峻极于天', 'THE EASTERN SACRED PEAK');

walkwayMap.repeat.set(1, 1);
mountainMap.repeat.set(52, 52);
graniteMap.repeat.set(2.2, 3.2);
roofMap.repeat.set(2.4, 2.4);
mistMap.repeat.set(1.4, 1);
cloudMap.wrapS = THREE.ClampToEdgeWrapping;
cloudMap.wrapT = THREE.ClampToEdgeWrapping;

stoneMap.anisotropy = 8;
walkwayMap.anisotropy = 8;
mountainMap.anisotropy = 8;
graniteMap.anisotropy = 8;
roofMap.anisotropy = 4;
cloudMap.anisotropy = 4;

const graniteNormal = makeNormalMap(graniteMap, 2.6);
const stoneNormal = makeNormalMap(stoneMap, 2.2);
const walkwayNormal = makeNormalMap(walkwayMap, 1.8);
const mountainNormal = makeNormalMap(mountainMap, 2.4);

export const mats = {
  terrain: new THREE.MeshStandardMaterial({
    map: mountainMap,
    normalMap: mountainNormal,
    normalScale: new THREE.Vector2(0.85, 0.85),
    vertexColors: true,
    roughness: 1,
    metalness: 0,
  }),
  granite: new THREE.MeshStandardMaterial({
    map: graniteMap,
    normalMap: graniteNormal,
    normalScale: new THREE.Vector2(1.25, 1.25),
    roughnessMap: graniteMap,
    color: 0xd1c6b1,
    roughness: 1.08,
    metalness: 0,
    flatShading: true,
    vertexColors: true,
  }),
  graniteDark: new THREE.MeshStandardMaterial({
    map: graniteMap,
    normalMap: graniteNormal,
    normalScale: new THREE.Vector2(1.35, 1.35),
    color: 0x978e7e,
    roughness: 1.05,
    flatShading: true,
  }),
  graniteLight: new THREE.MeshStandardMaterial({
    map: graniteMap,
    normalMap: graniteNormal,
    normalScale: new THREE.Vector2(1.1, 1.1),
    color: 0xd9cdb7,
    roughness: 1.02,
    flatShading: true,
  }),
  farA: new THREE.MeshStandardMaterial({
    color: 0x77817c,
    roughness: 1,
    flatShading: true,
  }),
  farB: new THREE.MeshStandardMaterial({
    color: 0x9c9c8e,
    roughness: 1,
    flatShading: true,
  }),
  path: new THREE.MeshStandardMaterial({
    map: walkwayMap,
    normalMap: walkwayNormal,
    normalScale: new THREE.Vector2(0.7, 0.7),
    roughnessMap: walkwayMap,
    color: 0xc3b7a1,
    vertexColors: true,
    roughness: 1.04,
  }),
  stone: new THREE.MeshStandardMaterial({
    map: stoneMap,
    normalMap: stoneNormal,
    normalScale: new THREE.Vector2(0.95, 0.95),
    roughnessMap: stoneMap,
    color: 0xb6ac98,
    vertexColors: true,
    roughness: 1.05,
  }),
  stoneDark: new THREE.MeshStandardMaterial({
    map: stoneMap,
    normalMap: stoneNormal,
    normalScale: new THREE.Vector2(1.05, 1.05),
    color: 0x857d6e,
    roughness: 1.02,
  }),
  deck: new THREE.MeshStandardMaterial({
    map: walkwayMap,
    normalMap: walkwayNormal,
    normalScale: new THREE.Vector2(0.8, 0.8),
    roughnessMap: walkwayMap,
    color: 0xb6ab96,
    vertexColors: true,
    roughness: 1.02,
  }),
  wood: new THREE.MeshStandardMaterial({
    color: 0x5d4734,
    roughness: 0.95,
  }),
  iron: new THREE.MeshStandardMaterial({
    color: 0x404039,
    roughness: 0.62,
    metalness: 0.35,
  }),
  ribbon: new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.82,
    side: THREE.DoubleSide,
  }),
  sign: new THREE.MeshStandardMaterial({
    map: signMap,
    roughness: 0.92,
    metalness: 0,
    side: THREE.DoubleSide,
  }),
  sign2: new THREE.MeshStandardMaterial({
    map: signMap,
    roughness: 0.92,
    metalness: 0,
    side: THREE.DoubleSide,
  }),
  glow: new THREE.SpriteMaterial({
    map: glowMap,
    color: 0xffd9a2,
    transparent: true,
    opacity: 0.34,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
    fog: true,
    toneMapped: true,
  }),
  trunk: new THREE.MeshStandardMaterial({ color: 0x584a3c, roughness: 0.99 }),
  pineDeep: new THREE.MeshStandardMaterial({ color: 0x2f4d3b, roughness: 0.96 }),
  pine: new THREE.MeshStandardMaterial({ color: 0x3e6246, roughness: 0.96 }),
  pineLight: new THREE.MeshStandardMaterial({ color: 0x567a51, roughness: 0.95 }),
  pineSun: new THREE.MeshStandardMaterial({ color: 0x677f4f, roughness: 0.95 }),
  shrub: new THREE.MeshStandardMaterial({ color: 0x4b6b43, roughness: 0.97 }),
  shrubLight: new THREE.MeshStandardMaterial({ color: 0x698554, roughness: 0.97 }),
  grass: new THREE.MeshStandardMaterial({
    color: 0x8b8c58,
    side: THREE.DoubleSide,
    roughness: 0.99,
  }),
  rock: new THREE.MeshStandardMaterial({
    color: 0x9a9284,
    roughness: 0.99,
    flatShading: true,
  }),
  rockLight: new THREE.MeshStandardMaterial({
    color: 0xb8ae99,
    roughness: 0.99,
    flatShading: true,
  }),
  cloud: new THREE.MeshBasicMaterial({
    map: cloudMap,
    color: 0xf5f2e9,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: true,
    toneMapped: true,
  }),
  cloudWarm: new THREE.MeshBasicMaterial({
    map: cloudMap,
    color: 0xf7ddbd,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: true,
    toneMapped: true,
  }),
  mist: new THREE.MeshBasicMaterial({
    map: mistMap,
    color: 0xe7e4d8,
    transparent: true,
    opacity: 0.34,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: true,
    toneMapped: true,
  }),
  roof: new THREE.MeshStandardMaterial({
    map: roofMap,
    color: 0xc4ced8,
    roughness: 0.78,
    metalness: 0.08,
    side: THREE.DoubleSide,
  }),
  redWall: new THREE.MeshStandardMaterial({
    color: 0x8e3024,
    roughness: 0.9,
  }),
  redPillar: new THREE.MeshStandardMaterial({
    color: 0xa03a2a,
    roughness: 0.82,
  }),
  gold: new THREE.MeshStandardMaterial({
    color: 0xd2ab55,
    roughness: 0.44,
    metalness: 0.42,
  }),
  bronze: new THREE.MeshStandardMaterial({
    color: 0x6f5c3d,
    roughness: 0.5,
    metalness: 0.55,
  }),
  lantern: new THREE.MeshStandardMaterial({
    color: 0xc53d26,
    emissive: 0x7d1d0e,
    emissiveIntensity: 0.55,
    roughness: 0.72,
  }),
  inscriptionA: new THREE.MeshStandardMaterial({
    map: inscriptionA,
    roughness: 0.95,
    metalness: 0,
    side: THREE.DoubleSide,
  }),
  inscriptionB: new THREE.MeshStandardMaterial({
    map: inscriptionB,
    roughness: 0.95,
    metalness: 0,
    side: THREE.DoubleSide,
  }),
  person: new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.92,
  }),
  bird: new THREE.MeshStandardMaterial({
    color: 0x30363a,
    roughness: 0.9,
  }),
  smoke: new THREE.PointsMaterial({
    map: smokeMap,
    color: 0xe8e1d3,
    size: 13,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.38,
    depthWrite: false,
    alphaTest: 0.01,
    fog: true,
    toneMapped: true,
  }),
};

mats.sign2 = mats.sign;
mats.sign.userData.noShadow = true;
mats.ribbon.userData.noShadow = true;

export function makeMistMaterial(opacity = 0.2, color = 0xeef3f2) {
  return new THREE.MeshBasicMaterial({
    map: mistMap,
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: true,
    toneMapped: true,
  });
}

export function makePlaqueMaterial(title, subtitle) {
  return new THREE.MeshBasicMaterial({
    map: makeLabelTexture(title, subtitle),
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    toneMapped: true,
  });
}

export const sharedTextures = {
  stoneMap,
  walkwayMap,
  mountainMap,
  mistMap,
  cloudMap,
  graniteMap,
  roofMap,
  smokeMap,
};
