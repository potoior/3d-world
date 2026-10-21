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
  makeLeakWindowTexture,
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
const leakMap = makeLeakWindowTexture();

roofMap.repeat.set(1, 1);
marbleMap.repeat.set(1, 1);
pavingMap.repeat.set(160, 190);
dirtMap.repeat.set(90, 100);

const plaqueCache = new Map();
const swayTime = { value: 0 };

function withSway(material, amp, freq) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uSwayTime = swayTime;
    shader.vertexShader = 'uniform float uSwayTime;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      vec4 swayWorld = modelMatrix * vec4(transformed, 1.0);
      float swayWave = sin(uSwayTime * ${freq.toFixed(2)} + swayWorld.x * 0.34 + swayWorld.z * 0.27);
      float swayAmt = swayWave * ${amp.toFixed(4)} * max(transformed.y, 0.0);
      transformed.x += swayAmt;
      transformed.z += swayAmt * 0.55;`
    );
  };
  material.customProgramCacheKey = () => 'sway' + amp + freq;
  return material;
}

export function updateFoliageSway(t) {
  swayTime.value = t;
}

export const mats = {
  roof: new THREE.MeshStandardMaterial({
    map: roofMap,
    color: 0xd6dad7,
    roughness: 0.82,
    metalness: 0.04,
    side: THREE.DoubleSide,
  }),
  roofDark: new THREE.MeshStandardMaterial({
    map: roofMap,
    color: 0x3d4242,
    roughness: 0.62,
    metalness: 0.16,
    side: THREE.DoubleSide,
  }),
  wall: new THREE.MeshStandardMaterial({
    map: wallMap,
    color: 0xfbf8ee,
    roughness: 0.95,
    metalness: 0.0,
  }),
  wallDark: new THREE.MeshStandardMaterial({
    color: 0x5b4233,
    roughness: 0.92,
  }),
  marble: new THREE.MeshStandardMaterial({
    map: marbleMap,
    color: 0xe9e5d9,
    roughness: 0.78,
    metalness: 0.02,
  }),
  marbleShade: new THREE.MeshStandardMaterial({
    map: marbleMap,
    color: 0xc4c0b3,
    roughness: 0.86,
  }),
  stone: new THREE.MeshStandardMaterial({
    color: 0xa5a399,
    roughness: 0.9,
  }),
  paving: new THREE.MeshStandardMaterial({
    map: pavingMap,
    color: 0xc8c8be,
    roughness: 0.94,
    metalness: 0.0,
  }),
  dirt: new THREE.MeshStandardMaterial({
    map: dirtMap,
    roughness: 1.0,
  }),
  gold: new THREE.MeshStandardMaterial({
    color: 0x8f8468,
    roughness: 0.3,
    metalness: 0.85,
  }),
  bronze: new THREE.MeshStandardMaterial({
    color: 0x58452b,
    roughness: 0.42,
    metalness: 0.72,
  }),
  grass: new THREE.MeshStandardMaterial({
    map: dirtMap,
    color: 0x93a979,
    roughness: 1.0,
  }),
  path: new THREE.MeshStandardMaterial({
    map: pavingMap,
    color: 0xd9d8cd,
    roughness: 0.94,
  }),
  willow: new THREE.MeshStandardMaterial({
    color: 0x86a75f,
    roughness: 0.9,
  }),
  bamboo: new THREE.MeshStandardMaterial({
    color: 0x6e9254,
    roughness: 0.9,
  }),
  lotus: new THREE.MeshStandardMaterial({
    color: 0x5f8c58,
    roughness: 0.86,
    side: THREE.DoubleSide,
  }),
  blossom: new THREE.MeshStandardMaterial({
    color: 0xe7b8bd,
    roughness: 0.8,
  }),
  copper: new THREE.MeshStandardMaterial({
    color: 0x574c3c,
    roughness: 0.5,
    metalness: 0.55,
  }),
  teal: new THREE.MeshStandardMaterial({
    color: 0x3a2c22,
    roughness: 0.75,
  }),
  timber: new THREE.MeshStandardMaterial({
    color: 0x5a4130,
    roughness: 0.86,
  }),
  timberRed: new THREE.MeshStandardMaterial({
    color: 0x7a4a3b,
    roughness: 0.8,
  }),
  trimDark: new THREE.MeshStandardMaterial({
    color: 0x333a39,
    roughness: 0.72,
  }),
  shrub: new THREE.MeshStandardMaterial({
    color: 0x5f824d,
    roughness: 0.94,
  }),
  banana: new THREE.MeshStandardMaterial({
    color: 0x65a052,
    roughness: 0.82,
    side: THREE.DoubleSide,
  }),
  rockMoss: new THREE.MeshStandardMaterial({
    color: 0x89906f,
    roughness: 0.98,
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
  leak: new THREE.MeshStandardMaterial({
    map: leakMap,
    roughness: 0.9,
    side: THREE.DoubleSide,
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
    color: 0x6b9455,
    roughness: 0.86,
  }),
  pine: new THREE.MeshStandardMaterial({
    color: 0x3d7250,
    roughness: 0.9,
  }),
  trunk: new THREE.MeshStandardMaterial({
    color: 0x5a4430,
    roughness: 0.95,
  }),
  rock: new THREE.MeshStandardMaterial({
    color: 0x9b998d,
    roughness: 0.97,
  }),
  lantern: new THREE.MeshStandardMaterial({
    color: 0xd8cbb0,
    roughness: 0.65,
    emissive: 0x40392a,
    emissiveIntensity: 0.4,
  }),
  lanternRed: new THREE.MeshStandardMaterial({
    color: 0xb74a3a,
    roughness: 0.6,
    emissive: 0x6a1d12,
    emissiveIntensity: 0.55,
  }),
  terracotta: new THREE.MeshStandardMaterial({
    color: 0x945c40,
    roughness: 0.88,
  }),
  petal: new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.82,
    side: THREE.DoubleSide,
  }),
  koi: new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.55,
    metalness: 0.05,
  }),
  duck: new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.72,
  }),
  bird: new THREE.MeshStandardMaterial({
    color: 0x353d3c,
    roughness: 0.8,
    side: THREE.DoubleSide,
  }),
  ripple: new THREE.MeshBasicMaterial({
    color: 0xdfeee7,
    transparent: true,
    opacity: 0.17,
    depthWrite: false,
    side: THREE.DoubleSide,
  }),
  hill: new THREE.MeshStandardMaterial({
    color: 0x617d64,
    roughness: 1.0,
  }),
  hillFar: new THREE.MeshStandardMaterial({
    color: 0x8b9c95,
    roughness: 1.0,
  }),
  lakeBed: new THREE.MeshStandardMaterial({
    color: 0x32463f,
    roughness: 1.0,
  }),
  causeway: new THREE.MeshStandardMaterial({
    color: 0xb9b7a9,
    roughness: 0.95,
  }),
  peach: new THREE.MeshStandardMaterial({
    color: 0xe7b7b8,
    roughness: 0.88,
  }),
  peachDeep: new THREE.MeshStandardMaterial({
    color: 0xdf9fa6,
    roughness: 0.88,
  }),
  snow: new THREE.MeshStandardMaterial({
    color: 0xf1f0e8,
    roughness: 0.9,
  }),
  leifeng: new THREE.MeshStandardMaterial({
    color: 0xb98a63,
    roughness: 0.86,
  }),
  pagodaStone: new THREE.MeshStandardMaterial({
    color: 0xa8a69a,
    roughness: 0.94,
  }),
  boatRed: new THREE.MeshStandardMaterial({
    color: 0x8a4438,
    roughness: 0.78,
  }),
  boatGold: new THREE.MeshStandardMaterial({
    color: 0xb08a4c,
    roughness: 0.5,
    metalness: 0.4,
  }),
};

withSway(mats.willow, 0.012, 1.25);
withSway(mats.bamboo, 0.0085, 1.6);
withSway(mats.banana, 0.018, 1.1);
withSway(mats.lotus, 0.026, 1.45);

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
      uDeep: { value: new THREE.Color(0x355a4d) },
      uShallow: { value: new THREE.Color(0x6f9980) },
      uSky: { value: new THREE.Color(0xc4d6cc) },
      uSun: { value: new THREE.Color(0xfff6df) },
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
        vec2 uv3 = vWorldPos.xz * 0.115 + vec2(-uTime * 0.021, uTime * 0.017);
        vec2 uv4 = vWorldPos.xz * 0.29 + vec2(uTime * 0.038, -uTime * 0.026);
        vec3 n1 = texture2D(uNormalMap, uv1).rgb * 2.0 - 1.0;
        vec3 n2 = texture2D(uNormalMap, uv2).rgb * 2.0 - 1.0;
        vec3 n3 = texture2D(uNormalMap, uv3).rgb * 2.0 - 1.0;
        vec3 n4 = texture2D(uNormalMap, uv4).rgb * 2.0 - 1.0;
        vec3 n = normalize(vNormalW + vec3(n1.x + n2.x + n3.x * 0.55 + n4.x * 0.3, 0.0, n1.y + n2.y + n3.y * 0.55 + n4.y * 0.3) * 0.34);
        vec3 viewDir = normalize(cameraPosition - vWorldPos);
        float fres = pow(1.0 - clamp(dot(viewDir, n), 0.0, 1.0), 2.8);
        vec3 base = mix(uDeep, uShallow, 0.42 + 0.26 * n.x);
        vec3 col = mix(base, uSky, fres * 0.52);
        vec3 hv = normalize(viewDir + normalize(uSunDir));
        float spec = pow(max(dot(n, hv), 0.0), 150.0);
        col += uSun * spec * 0.55;
        float sparkle = pow(max(sin(vWorldPos.x * 1.7 + sin(vWorldPos.z * 0.23) * 2.0 + uTime * 2.1) * sin(vWorldPos.z * 1.27 - uTime * 1.4), 0.0), 26.0);
        float glint = pow(max(sin(vWorldPos.x * 0.37 - vWorldPos.z * 0.61 + uTime * 1.7), 0.0), 34.0);
        col += vec3(1.0, 0.96, 0.85) * (sparkle * 0.16 + glint * 0.08);
        gl_FragColor = vec4(col, 0.965);
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
};
