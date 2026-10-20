import * as THREE from 'three';
import {
  makeBrickTexture,
  makeStoneTexture,
  makeWalkwayTexture,
  makeMountainTexture,
  makeRoofTexture,
  makeMistTexture,
  makeBannerTexture,
  makePlaqueTexture,
  makeSignTexture,
  makeContactTexture,
} from './textures.js';

const brickMap = makeBrickTexture();
const stoneMap = makeStoneTexture();
const walkwayMap = makeWalkwayTexture();
const mountainMap = makeMountainTexture();
const roofMap = makeRoofTexture();
const mistMap = makeMistTexture();
const bannerMap = makeBannerTexture();
const plaqueMap = makePlaqueTexture();
const signMap = makeSignTexture();
const contactMap = makeContactTexture();

brickMap.repeat.set(1, 1);
stoneMap.repeat.set(1, 1);
walkwayMap.repeat.set(1, 1);
mountainMap.repeat.set(46, 46);
roofMap.repeat.set(1, 1);
mistMap.repeat.set(1.6, 1.0);

brickMap.anisotropy = 8;
stoneMap.anisotropy = 8;
walkwayMap.anisotropy = 8;
mountainMap.anisotropy = 8;

export const mats = {
  wall: new THREE.MeshStandardMaterial({
    map: brickMap,
    bumpMap: brickMap,
    bumpScale: 0.26,
    color: 0xd9d2c4,
    vertexColors: true,
    roughness: 0.91,
    metalness: 0.0,
  }),
  wallShade: new THREE.MeshStandardMaterial({
    map: brickMap,
    bumpMap: brickMap,
    bumpScale: 0.27,
    color: 0xa6a298,
    vertexColors: true,
    roughness: 0.93,
  }),
  wallWarm: new THREE.MeshStandardMaterial({
    map: brickMap,
    bumpMap: brickMap,
    bumpScale: 0.22,
    color: 0xc3a98b,
    vertexColors: true,
    roughness: 0.9,
  }),
  stoneWarm: new THREE.MeshStandardMaterial({
    map: stoneMap,
    bumpMap: stoneMap,
    bumpScale: 0.28,
    color: 0xbcae94,
    vertexColors: true,
    roughness: 0.95,
  }),
  iron: new THREE.MeshStandardMaterial({
    color: 0x2c302c,
    roughness: 0.58,
    metalness: 0.65,
  }),
  contact: new THREE.MeshBasicMaterial({
    map: contactMap,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    toneMapped: false,
  }),
  stone: new THREE.MeshStandardMaterial({
    map: stoneMap,
    bumpMap: stoneMap,
    bumpScale: 0.3,
    color: 0xa8a59a,
    vertexColors: true,
    roughness: 0.97,
  }),
  stoneDark: new THREE.MeshStandardMaterial({
    map: stoneMap,
    color: 0x7e7b72,
    roughness: 0.98,
  }),
  walkway: new THREE.MeshStandardMaterial({
    map: walkwayMap,
    bumpMap: walkwayMap,
    bumpScale: 0.18,
    color: 0xb5b0a5,
    vertexColors: true,
    roughness: 0.96,
  }),
  dark: new THREE.MeshStandardMaterial({
    color: 0x101411,
    roughness: 0.98,
    metalness: 0.0,
  }),
  roof: new THREE.MeshStandardMaterial({
    map: roofMap,
    bumpMap: roofMap,
    bumpScale: 0.16,
    color: 0x9aa19a,
    roughness: 0.76,
    metalness: 0.06,
    side: THREE.DoubleSide,
  }),
  terrain: new THREE.MeshStandardMaterial({
    map: mountainMap,
    bumpMap: mountainMap,
    bumpScale: 0.42,
    vertexColors: true,
    roughness: 0.99,
    metalness: 0.0,
  }),
  farA: new THREE.MeshStandardMaterial({
    color: 0x687b80,
    roughness: 1.0,
    flatShading: true,
  }),
  farB: new THREE.MeshStandardMaterial({
    color: 0x829397,
    roughness: 1.0,
    flatShading: true,
  }),
  pineDeep: new THREE.MeshStandardMaterial({ color: 0x2f5c44, roughness: 0.94 }),
  pine: new THREE.MeshStandardMaterial({ color: 0x3f7350, roughness: 0.94 }),
  pineLight: new THREE.MeshStandardMaterial({ color: 0x5f8f5a, roughness: 0.93 }),
  autumn: new THREE.MeshStandardMaterial({ color: 0x9c7237, roughness: 0.95 }),
  autumnLight: new THREE.MeshStandardMaterial({ color: 0xbb8f4c, roughness: 0.95 }),
  autumnRust: new THREE.MeshStandardMaterial({ color: 0xa9632f, roughness: 0.95 }),
  trunk: new THREE.MeshStandardMaterial({ color: 0x51453a, roughness: 0.99 }),
  shrub: new THREE.MeshStandardMaterial({ color: 0x4f8048, roughness: 0.97 }),
  shrubLight: new THREE.MeshStandardMaterial({ color: 0x6a965c, roughness: 0.97 }),
  shrubDry: new THREE.MeshStandardMaterial({ color: 0x8f7f51, roughness: 0.97 }),
  rock: new THREE.MeshStandardMaterial({
    color: 0x8c8e84,
    roughness: 0.98,
    flatShading: true,
  }),
  rockLight: new THREE.MeshStandardMaterial({
    color: 0xa2a59a,
    roughness: 0.98,
    flatShading: true,
  }),
  cliff: new THREE.MeshStandardMaterial({
    color: 0x7f8079,
    roughness: 1.0,
    flatShading: true,
  }),
  wood: new THREE.MeshStandardMaterial({
    color: 0x5d4732,
    roughness: 0.94,
    metalness: 0.0,
  }),
  bronze: new THREE.MeshStandardMaterial({
    color: 0x6f5a36,
    roughness: 0.55,
    metalness: 0.55,
  }),
  banner: new THREE.MeshStandardMaterial({
    map: bannerMap,
    side: THREE.DoubleSide,
    roughness: 0.92,
    color: 0xc9b7a0,
  }),
  plaque: new THREE.MeshStandardMaterial({
    map: plaqueMap,
    roughness: 0.82,
  }),
  sign: new THREE.MeshStandardMaterial({
    map: signMap,
    roughness: 0.92,
    side: THREE.DoubleSide,
  }),
  ember: new THREE.MeshStandardMaterial({
    color: 0x3a160b,
    emissive: 0xff6a22,
    emissiveIntensity: 1.65,
    roughness: 0.85,
  }),
  cloth: new THREE.MeshStandardMaterial({
    color: 0x8e3a2e,
    roughness: 0.95,
  }),
  grass: new THREE.MeshStandardMaterial({
    color: 0x8a8757,
    side: THREE.DoubleSide,
    roughness: 0.98,
  }),
};

export function makeMistMaterial(opacity = 0.5, color = 0xe4ece7) {
  return new THREE.MeshBasicMaterial({
    map: mistMap,
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
    toneMapped: true,
  });
}

export const sharedTextures = {
  brickMap,
  stoneMap,
  walkwayMap,
  mountainMap,
  roofMap,
  mistMap,
  bannerMap,
  plaqueMap,
  signMap,
  contactMap,
};
