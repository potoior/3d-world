import * as THREE from 'three';
import {
  makeRoofTexture,
  makeWallTexture,
  makeMarbleTexture,
  makePavingTexture,
  makeDirtTexture,
  makeLatticeTexture,
  makeFriezeTexture,
  drawPlaque,
  makeRampTexture,
  makeWaterNormalTexture,
  makeDoorTexture,
  makeBannerTexture,
  makeSmokeTexture,
  makeBirdTexture,
  makeRoofNormalTexture,
  makeWallNormalTexture,
  makeMarbleNormalTexture,
  makePavingNormalTexture,
  makeStoneNormalTexture,
  makeRoughnessTexture,
  makePatinaTexture,
} from './textures.js';

const roofMap = makeRoofTexture();
const wallMap = makeWallTexture();
const marbleMap = makeMarbleTexture();
const pavingMap = makePavingTexture();
const dirtMap = makeDirtTexture();
const latticeMap = makeLatticeTexture();
const friezeMap = makeFriezeTexture();
const rampMap = makeRampTexture();
const waterNormalMap = makeWaterNormalTexture();
const doorMap = makeDoorTexture();
const bannerMap = makeBannerTexture();
const smokeMap = makeSmokeTexture();
const birdMap = makeBirdTexture();
const roofNormalMap = makeRoofNormalTexture();
const wallNormalMap = makeWallNormalTexture();
const marbleNormalMap = makeMarbleNormalTexture();
const pavingNormalMap = makePavingNormalTexture();
const stoneNormalMap = makeStoneNormalTexture();
const wallRoughMap = makeRoughnessTexture(7, 202, 46);
const stoneRoughMap = makeRoughnessTexture(17, 198, 52);
const metalRoughMap = makeRoughnessTexture(29, 168, 70);
const patinaMap = makePatinaTexture();
patinaMap.repeat.set(2, 2);

roofMap.repeat.set(1, 1);
roofNormalMap.repeat.set(1, 1);
wallNormalMap.repeat.set(1, 1);
marbleMap.repeat.set(1, 1);
marbleNormalMap.repeat.set(1, 1);
pavingMap.repeat.set(160, 190);
pavingNormalMap.repeat.set(160, 190);
stoneNormalMap.repeat.set(4, 4);
stoneRoughMap.repeat.set(6, 6);
dirtMap.repeat.set(90, 100);

const PLAQUE_ATLAS_W = 2048;
const PLAQUE_ATLAS_H = 2048;
const PLAQUE_COLS = 5;
const PLAQUE_ROWS = 6;
const PLAQUE_CELL_W = Math.floor(PLAQUE_ATLAS_W / PLAQUE_COLS);
const PLAQUE_CELL_H = Math.floor(PLAQUE_ATLAS_H / PLAQUE_ROWS);
const PLAQUE_W = PLAQUE_CELL_W;
const PLAQUE_H = Math.round((PLAQUE_CELL_W * 192) / 512);
const plaqueCanvas = document.createElement('canvas');
plaqueCanvas.width = PLAQUE_ATLAS_W;
plaqueCanvas.height = PLAQUE_ATLAS_H;
const plaqueCtx = plaqueCanvas.getContext('2d');
plaqueCtx.fillStyle = '#0d1a30';
plaqueCtx.fillRect(0, 0, PLAQUE_ATLAS_W, PLAQUE_ATLAS_H);
const plaqueAtlas = new THREE.CanvasTexture(plaqueCanvas);
plaqueAtlas.colorSpace = THREE.SRGBColorSpace;
plaqueAtlas.anisotropy = 8;
plaqueAtlas.needsUpdate = true;
const plaqueMaterial = new THREE.MeshBasicMaterial({ map: plaqueAtlas, toneMapped: false });
const plaqueCache = new Map();
let plaqueCount = 0;

export const mats = {
  roof: new THREE.MeshStandardMaterial({
    map: roofMap,
    normalMap: roofNormalMap,
    normalScale: new THREE.Vector2(0.62, 0.62),
    roughnessMap: metalRoughMap,
    color: 0xffffff,
    roughness: 0.56,
    metalness: 0.2,
    side: THREE.DoubleSide,
  }),
  roofDark: new THREE.MeshStandardMaterial({
    map: roofMap,
    normalMap: roofNormalMap,
    normalScale: new THREE.Vector2(0.7, 0.7),
    roughnessMap: metalRoughMap,
    color: 0x7f5a2a,
    roughness: 0.62,
    metalness: 0.3,
    side: THREE.DoubleSide,
  }),
  wall: new THREE.MeshStandardMaterial({
    map: wallMap,
    normalMap: wallNormalMap,
    normalScale: new THREE.Vector2(0.5, 0.7),
    roughnessMap: wallRoughMap,
    roughness: 0.96,
    metalness: 0.0,
  }),
  wallDark: new THREE.MeshStandardMaterial({
    map: wallMap,
    normalMap: wallNormalMap,
    normalScale: new THREE.Vector2(0.4, 0.55),
    color: 0xa03a2c,
    roughness: 0.92,
  }),
  marble: new THREE.MeshStandardMaterial({
    map: marbleMap,
    normalMap: marbleNormalMap,
    normalScale: new THREE.Vector2(0.3, 0.3),
    roughnessMap: stoneRoughMap,
    color: 0xffffff,
    roughness: 0.7,
    metalness: 0.02,
  }),
  marbleShade: new THREE.MeshStandardMaterial({
    map: marbleMap,
    normalMap: marbleNormalMap,
    normalScale: new THREE.Vector2(0.45, 0.45),
    roughnessMap: stoneRoughMap,
    color: 0xdad2c3,
    roughness: 0.78,
  }),
  stone: new THREE.MeshStandardMaterial({
    color: 0x9b9080,
    normalMap: stoneNormalMap,
    normalScale: new THREE.Vector2(0.65, 0.65),
    roughnessMap: stoneRoughMap,
    roughness: 0.94,
  }),
  paving: new THREE.MeshStandardMaterial({
    map: pavingMap,
    normalMap: pavingNormalMap,
    normalScale: new THREE.Vector2(0.9, 0.9),
    roughnessMap: stoneRoughMap,
    color: 0xb4c6d6,
    roughness: 0.94,
    metalness: 0.0,
  }),
  dirt: new THREE.MeshStandardMaterial({
    map: dirtMap,
    normalMap: stoneNormalMap,
    normalScale: new THREE.Vector2(0.5, 0.5),
    color: 0xbac4c8,
    roughness: 1.0,
  }),
  gold: new THREE.MeshStandardMaterial({
    color: 0xe0aa3a,
    roughness: 0.28,
    metalness: 0.85,
  }),
  bronze: new THREE.MeshStandardMaterial({
    map: patinaMap,
    color: 0xa7a88e,
    normalMap: stoneNormalMap,
    normalScale: new THREE.Vector2(0.25, 0.25),
    roughnessMap: metalRoughMap,
    roughness: 0.56,
    metalness: 0.66,
  }),
  copper: new THREE.MeshStandardMaterial({
    color: 0x6f5840,
    roughness: 0.38,
    metalness: 0.8,
  }),
  teal: new THREE.MeshStandardMaterial({
    color: 0x1d4a4a,
    roughness: 0.72,
  }),
  blue: new THREE.MeshStandardMaterial({
    color: 0x254869,
    roughness: 0.7,
  }),
  wood: new THREE.MeshStandardMaterial({
    color: 0x3a2118,
    roughness: 0.78,
  }),
  lattice: new THREE.MeshStandardMaterial({
    map: latticeMap,
    bumpMap: latticeMap,
    bumpScale: 0.018,
    roughness: 0.74,
    metalness: 0.1,
  }),
  frieze: new THREE.MeshStandardMaterial({
    map: friezeMap,
    roughness: 0.68,
    metalness: 0.1,
  }),
  ramp: new THREE.MeshStandardMaterial({
    map: rampMap,
    roughness: 0.68,
  }),
  blade: new THREE.MeshStandardMaterial({
    color: 0x4f7f3f,
    roughness: 0.82,
  }),
  pine: new THREE.MeshStandardMaterial({
    color: 0x2f6b3e,
    roughness: 0.88,
  }),
  trunk: new THREE.MeshStandardMaterial({
    color: 0x4a3423,
    roughness: 0.95,
  }),
  rock: new THREE.MeshStandardMaterial({
    color: 0x77766c,
    roughness: 0.95,
  }),
  lantern: new THREE.MeshStandardMaterial({
    color: 0xc23a26,
    roughness: 0.6,
    emissive: 0x3a0603,
    emissiveIntensity: 0.5,
  }),
  door: new THREE.MeshStandardMaterial({
    map: doorMap,
    bumpMap: doorMap,
    bumpScale: 0.028,
    roughnessMap: metalRoughMap,
    roughness: 0.7,
    metalness: 0.06,
  }),
  blossom: new THREE.MeshStandardMaterial({
    color: 0xc9738d,
    roughness: 0.86,
  }),
  grass: new THREE.MeshStandardMaterial({
    color: 0x5c6a45,
    roughness: 1.0,
  }),
  vatWater: new THREE.MeshStandardMaterial({
    color: 0x274b47,
    roughness: 0.18,
    metalness: 0.35,
  }),
  banner: new THREE.MeshStandardMaterial({
    map: bannerMap,
    roughness: 0.82,
    side: THREE.DoubleSide,
  }),
  ash: new THREE.MeshStandardMaterial({
    color: 0x49443a,
    roughness: 1.0,
  }),
  koi: new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.5,
    metalness: 0.05,
  }),
  ripple: new THREE.MeshBasicMaterial({
    color: 0xdfeef0,
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
    side: THREE.DoubleSide,
  }),
};

const windUniform = { value: 0 };

function applyWind(material, amount) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uWind = windUniform;
    shader.vertexShader = 'uniform float uWind;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      float windAmp = smoothstep(1.2, 10.0, transformed.y) * ${amount.toFixed(3)};
      transformed.x += sin(uWind * 0.7 + position.x * 0.19 + position.z * 0.14) * windAmp;
      transformed.z += cos(uWind * 0.54 + position.x * 0.16 - position.z * 0.11) * windAmp * 0.72;`
    );
  };
  material.customProgramCacheKey = () => 'wind' + amount;
}

applyWind(mats.pine, 0.13);
applyWind(mats.blade, 0.17);

export function updateWind(time) {
  windUniform.value = time;
}

export function getPlaqueGeometry(text, width) {
  let cell = plaqueCache.get(text);
  if (!cell) {
    const index = plaqueCount++ % (PLAQUE_COLS * PLAQUE_ROWS);
    const col = index % PLAQUE_COLS;
    const row = Math.floor(index / PLAQUE_COLS);
    const x = col * PLAQUE_CELL_W;
    const y = row * PLAQUE_CELL_H + Math.floor((PLAQUE_CELL_H - PLAQUE_H) / 2);
    drawPlaque(plaqueCtx, text, x, y, PLAQUE_W, PLAQUE_H);
    plaqueAtlas.needsUpdate = true;
    const pad = 0.5;
    cell = {
      u0: (x + pad) / PLAQUE_ATLAS_W,
      u1: (x + PLAQUE_W - pad) / PLAQUE_ATLAS_W,
      v0: 1 - (y + PLAQUE_H - pad) / PLAQUE_ATLAS_H,
      v1: 1 - (y + pad) / PLAQUE_ATLAS_H,
    };
    plaqueCache.set(text, cell);
  }
  const geo = new THREE.PlaneGeometry(width, width * 0.375);
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    const u = uv.getX(i);
    const v = uv.getY(i);
    uv.setXY(i, cell.u0 + u * (cell.u1 - cell.u0), cell.v0 + v * (cell.v1 - cell.v0));
  }
  uv.needsUpdate = true;
  return geo;
}

export { plaqueMaterial };

export function makeWaterMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uDeep: { value: new THREE.Color(0x173744) },
      uShallow: { value: new THREE.Color(0x4c7980) },
      uSky: { value: new THREE.Color(0xacc9d6) },
      uSun: { value: new THREE.Color(0xfff0c8) },
      uSunDir: { value: new THREE.Vector3(0.4, 0.8, 0.3).normalize() },
      uNormalMap: { value: waterNormalMap },
    },
    vertexShader: `
      uniform float uTime;
      varying vec3 vWorldPos;
      varying vec3 vNormalW;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec3 pos = position;
        pos.z += sin(pos.x * 0.12 + uTime * 0.7) * 0.06;
        pos.z += cos(pos.y * 0.16 + uTime * 0.5) * 0.05;
        vec4 world = modelMatrix * vec4(pos, 1.0);
        vWorldPos = world.xyz;
        vNormalW = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uDeep;
      uniform vec3 uShallow;
      uniform vec3 uSky;
      uniform vec3 uSun;
      uniform vec3 uSunDir;
      uniform sampler2D uNormalMap;
      varying vec3 vWorldPos;
      varying vec3 vNormalW;
      varying vec2 vUv;
      void main() {
        vec2 uv1 = vWorldPos.xz * 0.05 + vec2(uTime * 0.012, uTime * 0.008);
        vec2 uv2 = vWorldPos.xz * 0.021 - vec2(uTime * 0.006, uTime * 0.011);
        vec3 n1 = texture2D(uNormalMap, uv1).rgb * 2.0 - 1.0;
        vec3 n2 = texture2D(uNormalMap, uv2).rgb * 2.0 - 1.0;
        vec3 n = normalize(vNormalW + vec3(n1.x + n2.x, 0.0, n1.y + n2.y) * 0.35);
        vec3 viewDir = normalize(cameraPosition - vWorldPos);
        float fres = pow(1.0 - clamp(dot(viewDir, n), 0.0, 1.0), 2.4);
        vec3 base = mix(uDeep, uShallow, 0.35 + 0.3 * n.x);
        vec3 col = mix(base, uSky, fres * 0.75);
        vec3 hv = normalize(viewDir + normalize(uSunDir));
        float spec = pow(max(dot(n, hv), 0.0), 70.0);
        col += uSun * spec * 0.5;
        float sparkle = pow(max(sin(vWorldPos.x * 0.7 + uTime * 1.3) * sin(vWorldPos.z * 0.5 - uTime * 0.9), 0.0), 18.0);
        col += vec3(1.0, 0.94, 0.8) * sparkle * 0.12;
        gl_FragColor = vec4(col, 0.94);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
  });
}

export const sharedTextures = {
  roofMap,
  wallMap,
  marbleMap,
  pavingMap,
  dirtMap,
  latticeMap,
  friezeMap,
  waterNormalMap,
  doorMap,
  bannerMap,
  smokeMap,
  birdMap,
};
