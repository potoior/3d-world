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
} from './textures.js';

const stoneMap = makeStoneTexture();
const walkwayMap = makeWalkwayTexture();
const mountainMap = makeMountainTexture();
const mistMap = makeMistTexture();
const cloudMap = makeCloudTexture();
const graniteMap = makeGraniteTexture();
const signMap = makeSignTexture('丹霞山', '赤壁丹崖 · 锦江', 'DANXIA MOUNTAIN');
const glowMap = makeGlowTexture();

walkwayMap.repeat.set(1, 1);
mountainMap.repeat.set(52, 52);
graniteMap.repeat.set(2.2, 3.2);
mistMap.repeat.set(1.4, 1);
cloudMap.wrapS = THREE.ClampToEdgeWrapping;
cloudMap.wrapT = THREE.ClampToEdgeWrapping;

stoneMap.anisotropy = 8;
walkwayMap.anisotropy = 8;
mountainMap.anisotropy = 8;
graniteMap.anisotropy = 8;
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
    color: 0xc8714a,
    roughness: 1.08,
    metalness: 0,
    flatShading: true,
    vertexColors: true,
  }),
  graniteDark: new THREE.MeshStandardMaterial({
    map: graniteMap,
    normalMap: graniteNormal,
    normalScale: new THREE.Vector2(1.35, 1.35),
    color: 0x9b4a32,
    roughness: 1.05,
    flatShading: true,
  }),
  graniteLight: new THREE.MeshStandardMaterial({
    map: graniteMap,
    normalMap: graniteNormal,
    normalScale: new THREE.Vector2(1.1, 1.1),
    color: 0xd98b5b,
    roughness: 1.02,
    flatShading: true,
  }),
  farA: new THREE.MeshStandardMaterial({
    color: 0x7f5954,
    roughness: 1,
    flatShading: true,
  }),
  farB: new THREE.MeshStandardMaterial({
    color: 0xa97868,
    roughness: 1,
    flatShading: true,
  }),
  path: new THREE.MeshStandardMaterial({
    map: walkwayMap,
    normalMap: walkwayNormal,
    normalScale: new THREE.Vector2(0.7, 0.7),
    roughnessMap: walkwayMap,
    color: 0xb6b1a4,
    vertexColors: true,
    roughness: 1.04,
  }),
  stone: new THREE.MeshStandardMaterial({
    map: stoneMap,
    normalMap: stoneNormal,
    normalScale: new THREE.Vector2(0.95, 0.95),
    roughnessMap: stoneMap,
    color: 0xa8a599,
    vertexColors: true,
    roughness: 1.05,
  }),
  stoneDark: new THREE.MeshStandardMaterial({
    map: stoneMap,
    normalMap: stoneNormal,
    normalScale: new THREE.Vector2(1.05, 1.05),
    color: 0x7b7d76,
    roughness: 1.02,
  }),
  deck: new THREE.MeshStandardMaterial({
    map: walkwayMap,
    normalMap: walkwayNormal,
    normalScale: new THREE.Vector2(0.8, 0.8),
    roughnessMap: walkwayMap,
    color: 0xa9a69b,
    vertexColors: true,
    roughness: 1.02,
  }),
  wood: new THREE.MeshStandardMaterial({
    color: 0x5b4735,
    roughness: 0.95,
  }),
  iron: new THREE.MeshStandardMaterial({
    color: 0x3b403c,
    roughness: 0.62,
    metalness: 0.35,
  }),
  ribbon: new THREE.MeshStandardMaterial({
    color: 0x9e3527,
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
  trunk: new THREE.MeshStandardMaterial({ color: 0x53473b, roughness: 0.99 }),
  pineDeep: new THREE.MeshStandardMaterial({ color: 0x1f4a35, roughness: 0.96 }),
  pine: new THREE.MeshStandardMaterial({ color: 0x2d6042, roughness: 0.96 }),
  pineLight: new THREE.MeshStandardMaterial({ color: 0x477a4d, roughness: 0.95 }),
  pineSun: new THREE.MeshStandardMaterial({ color: 0x61874d, roughness: 0.95 }),
  shrub: new THREE.MeshStandardMaterial({ color: 0x3f6b3f, roughness: 0.97 }),
  shrubLight: new THREE.MeshStandardMaterial({ color: 0x67904f, roughness: 0.97 }),
  grass: new THREE.MeshStandardMaterial({
    color: 0x7f8a4e,
    side: THREE.DoubleSide,
    roughness: 0.99,
  }),
  rock: new THREE.MeshStandardMaterial({
    color: 0xa15a40,
    roughness: 0.99,
    flatShading: true,
  }),
  rockLight: new THREE.MeshStandardMaterial({
    color: 0xbd7752,
    roughness: 0.99,
    flatShading: true,
  }),
  cloud: new THREE.MeshBasicMaterial({
    map: cloudMap,
    color: 0xf3f5f2,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: true,
    toneMapped: true,
  }),
  cloudWarm: new THREE.MeshBasicMaterial({
    map: cloudMap,
    color: 0xf6dcc0,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: true,
    toneMapped: true,
  }),
  mist: new THREE.MeshBasicMaterial({
    map: mistMap,
    color: 0xdfe9e7,
    transparent: true,
    opacity: 0.34,
    depthWrite: false,
    side: THREE.DoubleSide,
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
};
