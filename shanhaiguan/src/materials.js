import * as THREE from 'three';
import {
  makeRammedEarthTexture,
  makeBrickTexture,
  makeStoneTexture,
  makeWalkwayTexture,
  makeSandTexture,
  makeRoofTexture,
  makeWoodTexture,
  makePlaqueTexture,
  makeLabelTexture,
  makeBannerTexture,
  makeSignTexture,
  makeMistTexture,
  makeContactTexture,
} from './textures.js';

const earthMap = makeRammedEarthTexture();
const brickMap = makeBrickTexture();
const stoneMap = makeStoneTexture();
const walkwayMap = makeWalkwayTexture();
const sandMap = makeSandTexture();
const roofMap = makeRoofTexture();
const woodMap = makeWoodTexture();
const bannerMap = makeBannerTexture();
const signMap = makeSignTexture('嘉峪关', 'JIAYUGUAN PASS');
const fogMap = makeMistTexture();
const contactMap = makeContactTexture();

earthMap.repeat.set(1, 1);
brickMap.repeat.set(1, 1);
stoneMap.repeat.set(1, 1);
walkwayMap.repeat.set(1, 1);
sandMap.repeat.set(58, 58);
roofMap.repeat.set(1, 1);
woodMap.repeat.set(1, 1);

export const sharedTextures = {
  plaqueGuanghua: makePlaqueTexture('光化楼'),
  plaqueRouyuan: makePlaqueTexture('柔远楼'),
  plaqueJiayu: makePlaqueTexture('嘉峪关'),
  plaqueChaozong: makePlaqueTexture('朝宗'),
  labelGuanghua: makeLabelTexture('光化楼', 'GUANGHUA TOWER'),
  labelRouyuan: makeLabelTexture('柔远楼', 'ROUYUAN TOWER'),
  bannerMap,
  signMap,
  fogMap,
  contactMap,
};

export const mats = {
  earth: new THREE.MeshStandardMaterial({
    map: earthMap,
    bumpMap: earthMap,
    bumpScale: 0.4,
    color: 0xd0a878,
    vertexColors: true,
    roughness: 0.98,
  }),
  earthDark: new THREE.MeshStandardMaterial({
    map: earthMap,
    bumpMap: earthMap,
    bumpScale: 0.36,
    color: 0xa57c52,
    vertexColors: true,
    roughness: 0.99,
  }),
  brick: new THREE.MeshStandardMaterial({
    map: brickMap,
    bumpMap: brickMap,
    bumpScale: 0.3,
    color: 0xc09a76,
    vertexColors: true,
    roughness: 0.94,
  }),
  stone: new THREE.MeshStandardMaterial({
    map: stoneMap,
    bumpMap: stoneMap,
    bumpScale: 0.34,
    color: 0xb3a58e,
    vertexColors: true,
    roughness: 0.97,
  }),
  stoneDark: new THREE.MeshStandardMaterial({
    map: stoneMap,
    color: 0x7d7263,
    roughness: 0.98,
  }),
  walkway: new THREE.MeshStandardMaterial({
    map: walkwayMap,
    bumpMap: walkwayMap,
    bumpScale: 0.2,
    color: 0xc0b297,
    vertexColors: true,
    roughness: 0.97,
  }),
  roof: new THREE.MeshStandardMaterial({
    map: roofMap,
    bumpMap: roofMap,
    bumpScale: 0.18,
    color: 0x7d8787,
    roughness: 0.7,
    metalness: 0.08,
    side: THREE.DoubleSide,
  }),
  wood: new THREE.MeshStandardMaterial({
    map: woodMap,
    bumpMap: woodMap,
    bumpScale: 0.14,
    color: 0x9e7450,
    roughness: 0.9,
  }),
  column: new THREE.MeshStandardMaterial({
    color: 0x8e2f22,
    roughness: 0.72,
  }),
  door: new THREE.MeshStandardMaterial({
    color: 0x4c2018,
    roughness: 0.82,
  }),
  iron: new THREE.MeshStandardMaterial({
    color: 0x2b2c28,
    roughness: 0.46,
    metalness: 0.7,
  }),
  gold: new THREE.MeshStandardMaterial({
    color: 0xc79d4d,
    roughness: 0.42,
    metalness: 0.58,
  }),
  lantern: new THREE.MeshStandardMaterial({
    color: 0xb8382a,
    emissive: 0x5e1209,
    emissiveIntensity: 0.7,
    roughness: 0.6,
  }),
  dark: new THREE.MeshStandardMaterial({
    color: 0x231d18,
    roughness: 0.96,
  }),
  white: new THREE.MeshStandardMaterial({
    color: 0xd9cfb9,
    roughness: 0.9,
  }),
  cloth: new THREE.MeshStandardMaterial({
    map: bannerMap,
    side: THREE.DoubleSide,
    color: 0xffffff,
    roughness: 0.92,
  }),
  plaqueGuanghua: new THREE.MeshStandardMaterial({
    map: sharedTextures.plaqueGuanghua,
    roughness: 0.7,
    metalness: 0.1,
  }),
  plaqueRouyuan: new THREE.MeshStandardMaterial({
    map: sharedTextures.plaqueRouyuan,
    roughness: 0.7,
    metalness: 0.1,
  }),
  plaqueJiayu: new THREE.MeshStandardMaterial({
    map: sharedTextures.plaqueJiayu,
    roughness: 0.7,
    metalness: 0.1,
  }),
  plaqueChaozong: new THREE.MeshStandardMaterial({
    map: sharedTextures.plaqueChaozong,
    roughness: 0.7,
    metalness: 0.1,
  }),
  sign: new THREE.MeshStandardMaterial({
    map: signMap,
    roughness: 0.86,
  }),
  terrain: new THREE.MeshStandardMaterial({
    map: sandMap,
    bumpMap: sandMap,
    bumpScale: 0.22,
    vertexColors: true,
    roughness: 1.0,
  }),
  farRock: new THREE.MeshStandardMaterial({
    color: 0x7b7470,
    roughness: 1.0,
    flatShading: true,
  }),
  farSnow: new THREE.MeshStandardMaterial({
    color: 0xe4e9ea,
    roughness: 0.74,
    flatShading: true,
  }),
  rock: new THREE.MeshStandardMaterial({
    color: 0x8a755b,
    roughness: 0.98,
    flatShading: true,
    vertexColors: true,
  }),
  dryGrass: new THREE.MeshStandardMaterial({
    color: 0x9a8552,
    roughness: 0.95,
    side: THREE.DoubleSide,
    vertexColors: true,
  }),
  camel: new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.92,
  }),
  raven: new THREE.MeshStandardMaterial({
    color: 0x141414,
    roughness: 0.8,
  }),
  person: new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.9,
  }),
  contact: new THREE.MeshBasicMaterial({
    map: contactMap,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
    toneMapped: false,
  }),
};
