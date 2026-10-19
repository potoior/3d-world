import * as THREE from 'three';
import {
  makeRoofTexture,
  makeWallTexture,
  makeMarbleTexture,
  makePavingTexture,
  makeDirtTexture,
  makeLatticeTexture,
  makeFriezeTexture,
  makePlaqueTexture,
  makeRampTexture,
  makeWaterNormalTexture,
  makeDoorTexture,
  makeBannerTexture,
  makeSmokeTexture,
  makeBirdTexture,
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

roofMap.repeat.set(1, 1);
marbleMap.repeat.set(1, 1);
pavingMap.repeat.set(160, 190);
dirtMap.repeat.set(90, 100);

const plaqueCache = new Map();

export const mats = {
  roof: new THREE.MeshStandardMaterial({
    map: roofMap,
    color: 0xffffff,
    roughness: 0.4,
    metalness: 0.2,
    side: THREE.DoubleSide,
  }),
  roofDark: new THREE.MeshStandardMaterial({
    map: roofMap,
    color: 0x7f5a2a,
    roughness: 0.5,
    metalness: 0.3,
    side: THREE.DoubleSide,
  }),
  wall: new THREE.MeshStandardMaterial({
    map: wallMap,
    roughness: 0.92,
    metalness: 0.0,
  }),
  wallDark: new THREE.MeshStandardMaterial({
    color: 0x8c2f24,
    roughness: 0.94,
  }),
  marble: new THREE.MeshStandardMaterial({
    map: marbleMap,
    color: 0xffffff,
    roughness: 0.62,
    metalness: 0.02,
  }),
  marbleShade: new THREE.MeshStandardMaterial({
    map: marbleMap,
    color: 0xdad2c3,
    roughness: 0.7,
  }),
  stone: new THREE.MeshStandardMaterial({
    color: 0x9b9080,
    roughness: 0.88,
  }),
  paving: new THREE.MeshStandardMaterial({
    map: pavingMap,
    color: 0xb4c6d6,
    roughness: 0.9,
    metalness: 0.0,
  }),
  dirt: new THREE.MeshStandardMaterial({
    map: dirtMap,
    color: 0xbac4c8,
    roughness: 1.0,
  }),
  gold: new THREE.MeshStandardMaterial({
    color: 0xe0aa3a,
    roughness: 0.28,
    metalness: 0.85,
  }),
  bronze: new THREE.MeshStandardMaterial({
    color: 0x58452b,
    roughness: 0.42,
    metalness: 0.72,
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
    roughness: 0.7,
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
    roughness: 0.66,
    metalness: 0.06,
  }),
  blossom: new THREE.MeshStandardMaterial({
    color: 0xc9738d,
    roughness: 0.86,
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

export function getPlaqueMaterial(text) {
  if (!plaqueCache.has(text)) {
    plaqueCache.set(
      text,
      new THREE.MeshBasicMaterial({
        map: makePlaqueTexture(text),
        toneMapped: false,
      })
    );
  }
  return plaqueCache.get(text);
}

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
