import * as THREE from 'three';
import {
  sandTexture,
  cliffTexture,
  stoneTexture,
  woodTexture,
  roofTexture,
  muralTexture,
  foliageTexture,
  leafCardTexture,
  reedTexture,
  smokeTexture,
  dotTexture,
  glowTexture,
} from './textures.js';
import { swayMaterial } from './geo.js';

export function createMaterials() {
  const tex = {
    sand: sandTexture(),
    cliff: cliffTexture(),
    stone: stoneTexture(),
    wood: woodTexture(),
    roof: roofTexture(),
    mural: muralTexture(),
    foliage: foliageTexture(),
    leaf: leafCardTexture(),
    reed: reedTexture(),
    smoke: smokeTexture(),
    dot: dotTexture(),
    glow: glowTexture(),
  };

  const sand = new THREE.MeshStandardMaterial({
    map: tex.sand,
    bumpMap: tex.sand,
    bumpScale: 0.8,
    vertexColors: true,
    roughness: 0.97,
    metalness: 0,
  });

  const crest = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0 });

  const stone = new THREE.MeshStandardMaterial({
    map: tex.stone,
    vertexColors: true,
    roughness: 0.94,
    metalness: 0.02,
  });

  const wood = new THREE.MeshStandardMaterial({
    map: tex.wood,
    vertexColors: true,
    roughness: 0.82,
    metalness: 0.02,
  });

  const roof = new THREE.MeshStandardMaterial({
    map: tex.roof,
    vertexColors: true,
    roughness: 0.86,
    metalness: 0.04,
  });

  const cliff = new THREE.MeshStandardMaterial({
    map: tex.cliff,
    vertexColors: true,
    roughness: 1,
    metalness: 0,
  });

  const dark = new THREE.MeshStandardMaterial({ color: 0x120d09, roughness: 1, metalness: 0 });
  const mural = new THREE.MeshStandardMaterial({
    map: tex.mural,
    roughness: 0.9,
    metalness: 0.03,
    side: THREE.DoubleSide,
  });

  const foliage = new THREE.MeshStandardMaterial({
    map: tex.foliage,
    roughness: 0.92,
    metalness: 0,
    color: 0xffffff,
  });

  const leaf = new THREE.MeshStandardMaterial({
    map: tex.leaf,
    alphaTest: 0.32,
    side: THREE.DoubleSide,
    roughness: 0.85,
    metalness: 0,
  });

  const reed = swayMaterial(
    new THREE.MeshStandardMaterial({
      map: tex.reed,
      alphaTest: 0.38,
      side: THREE.DoubleSide,
      roughness: 0.95,
      metalness: 0,
    }),
    0.16,
    1.35
  );

  const shrub = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0 });
  const rock = new THREE.MeshStandardMaterial({ map: tex.stone, roughness: 0.93, metalness: 0.02 });
  const figure = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0 });
  const camel = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.94, metalness: 0 });
  const cloth = new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.88, metalness: 0 });

  const lantern = new THREE.MeshStandardMaterial({
    color: 0xd97d32,
    emissive: 0xff8f32,
    emissiveIntensity: 1.5,
    roughness: 0.55,
    metalness: 0.02,
  });

  const gold = new THREE.MeshStandardMaterial({
    color: 0xc9a04e,
    metalness: 0.72,
    roughness: 0.34,
  });

  const smoke = new THREE.PointsMaterial({
    map: tex.smoke,
    size: 7,
    transparent: true,
    opacity: 0.34,
    depthWrite: false,
    color: 0xd9cdbb,
    sizeAttenuation: true,
  });

  const haze = new THREE.SpriteMaterial({
    map: tex.glow,
    color: 0xe9a35b,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  return {
    tex,
    sand,
    crest,
    stone,
    wood,
    roof,
    cliff,
    dark,
    mural,
    foliage,
    leaf,
    reed,
    shrub,
    rock,
    figure,
    camel,
    cloth,
    lantern,
    gold,
    smoke,
    haze,
  };
}
