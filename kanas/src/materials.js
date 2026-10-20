import * as THREE from 'three';
import {
  makeWoodTexture,
  makeShingleTexture,
  makeMeadowTexture,
  makeBarkTexture,
  makeBirchTexture,
  makeRockTexture,
  makeWaterNormalTexture,
} from './textures.js';

const woodMap = makeWoodTexture();
const shingleMap = makeShingleTexture();
const meadowMap = makeMeadowTexture();
const barkMap = makeBarkTexture();
const birchMap = makeBirchTexture();
const rockMap = makeRockTexture();
const waterNormalMap = makeWaterNormalTexture();

woodMap.repeat.set(1, 1);
shingleMap.repeat.set(2, 2);
meadowMap.repeat.set(130, 130);
barkMap.repeat.set(1, 2);
birchMap.repeat.set(1, 2);
rockMap.repeat.set(1, 1);

const swayTime = { value: 0 };

function withSway(material, amp, freq) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uSwayTime = swayTime;
    shader.vertexShader = 'uniform float uSwayTime;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      vec4 swayWorld = modelMatrix * vec4(transformed, 1.0);
      float swayWave = sin(uSwayTime * ${freq.toFixed(2)} + swayWorld.x * 0.21 + swayWorld.z * 0.17);
      float swayAmt = swayWave * ${amp.toFixed(4)} * max(transformed.y, 0.0);
      transformed.x += swayAmt;
      transformed.z += swayAmt * 0.62;`
    );
  };
  material.customProgramCacheKey = () => 'sway' + amp + freq;
  return material;
}

export function updateFoliageSway(t) {
  swayTime.value = t;
}

export const mats = {
  grass: new THREE.MeshStandardMaterial({
    map: meadowMap,
    color: 0xa8b884,
    roughness: 1.0,
    metalness: 0,
  }),
  lakeBed: new THREE.MeshStandardMaterial({
    color: 0x26463f,
    roughness: 1.0,
  }),
  rock: new THREE.MeshStandardMaterial({
    map: rockMap,
    color: 0x93988f,
    roughness: 0.98,
  }),
  rockDark: new THREE.MeshStandardMaterial({
    map: rockMap,
    color: 0x59635e,
    roughness: 1.0,
  }),
  rockMoss: new THREE.MeshStandardMaterial({
    color: 0x6d7f54,
    roughness: 1.0,
  }),
  snow: new THREE.MeshStandardMaterial({
    color: 0xf1f5f4,
    roughness: 0.9,
  }),
  plank: new THREE.MeshStandardMaterial({
    map: woodMap,
    color: 0xe2c08f,
    roughness: 0.92,
  }),
  plankDark: new THREE.MeshStandardMaterial({
    map: woodMap,
    color: 0x9c7046,
    roughness: 0.95,
  }),
  timber: new THREE.MeshStandardMaterial({
    map: woodMap,
    color: 0xcfa97a,
    roughness: 0.9,
  }),
  timberDark: new THREE.MeshStandardMaterial({
    map: barkMap,
    color: 0x6f5540,
    roughness: 0.94,
  }),
  logWall: new THREE.MeshStandardMaterial({
    map: woodMap,
    color: 0xf0dcbc,
    roughness: 0.93,
  }),
  roof: new THREE.MeshStandardMaterial({
    map: shingleMap,
    color: 0xbfb8a5,
    roughness: 0.86,
    side: THREE.DoubleSide,
  }),
  roofDark: new THREE.MeshStandardMaterial({
    map: shingleMap,
    color: 0x6b736d,
    roughness: 0.8,
    side: THREE.DoubleSide,
  }),
  stone: new THREE.MeshStandardMaterial({
    map: rockMap,
    color: 0x9aa097,
    roughness: 0.96,
  }),
  windowWarm: new THREE.MeshStandardMaterial({
    color: 0x392f21,
    roughness: 0.55,
    emissive: 0xffb45e,
    emissiveIntensity: 0.35,
  }),
  spruce: withSway(
    new THREE.MeshStandardMaterial({ color: 0x2c5540, roughness: 0.92 }),
    0.006,
    1.05
  ),
  spruceLight: withSway(
    new THREE.MeshStandardMaterial({ color: 0x3d7050, roughness: 0.9 }),
    0.0065,
    1.05
  ),
  larch: withSway(
    new THREE.MeshStandardMaterial({ color: 0x7c8f3e, roughness: 0.9 }),
    0.006,
    1.22
  ),
  larchLight: withSway(
    new THREE.MeshStandardMaterial({ color: 0x96a34c, roughness: 0.88 }),
    0.007,
    1.22
  ),
  birchBark: new THREE.MeshStandardMaterial({
    map: birchMap,
    color: 0xe9e6d9,
    roughness: 0.92,
  }),
  birchLeaf: withSway(
    new THREE.MeshStandardMaterial({ color: 0x86a64d, roughness: 0.88 }),
    0.008,
    1.4
  ),
  trunk: new THREE.MeshStandardMaterial({
    map: barkMap,
    color: 0x5d4632,
    roughness: 0.98,
  }),
  blade: withSway(
    new THREE.MeshStandardMaterial({ color: 0x718f4c, roughness: 0.92 }),
    0.012,
    1.7
  ),
  stem: new THREE.MeshStandardMaterial({ color: 0x54713f, roughness: 0.94 }),
  flowerWhite: withSway(
    new THREE.MeshStandardMaterial({ color: 0xf2eeda, roughness: 0.86 }),
    0.016,
    1.9
  ),
  flowerGold: withSway(
    new THREE.MeshStandardMaterial({ color: 0xe4b94b, roughness: 0.84 }),
    0.016,
    1.9
  ),
  flowerViolet: withSway(
    new THREE.MeshStandardMaterial({ color: 0x9b7fb7, roughness: 0.86 }),
    0.016,
    1.9
  ),
  flowerBlue: withSway(
    new THREE.MeshStandardMaterial({ color: 0x6f8dc0, roughness: 0.86 }),
    0.016,
    1.9
  ),
  horseBrown: new THREE.MeshStandardMaterial({ color: 0x6f4b2d, roughness: 0.86 }),
  horseDark: new THREE.MeshStandardMaterial({ color: 0x2c221a, roughness: 0.9 }),
  horseCream: new THREE.MeshStandardMaterial({ color: 0x9a7a50, roughness: 0.86 }),
  saddle: new THREE.MeshStandardMaterial({ color: 0x833d30, roughness: 0.78 }),
  blanket: new THREE.MeshStandardMaterial({ color: 0xb48a3f, roughness: 0.9 }),
  tack: new THREE.MeshStandardMaterial({ color: 0x2f2620, roughness: 0.82 }),
  metal: new THREE.MeshStandardMaterial({ color: 0x8a8a80, roughness: 0.42, metalness: 0.7 }),
  skin: new THREE.MeshStandardMaterial({ color: 0xd3ac89, roughness: 0.9 }),
  coatBlue: new THREE.MeshStandardMaterial({ color: 0x3b556a, roughness: 0.9 }),
  coatRed: new THREE.MeshStandardMaterial({ color: 0x7a3d34, roughness: 0.9 }),
  coatDark: new THREE.MeshStandardMaterial({ color: 0x2f3333, roughness: 0.92 }),
  coatGold: new THREE.MeshStandardMaterial({ color: 0x8a6a34, roughness: 0.9 }),
  eagle: new THREE.MeshStandardMaterial({
    color: 0x332d27,
    roughness: 0.82,
    side: THREE.DoubleSide,
  }),
  beak: new THREE.MeshStandardMaterial({ color: 0xb28a45, roughness: 0.7 }),
  mist: new THREE.MeshBasicMaterial({ color: 0xdde9ec }),
  moss: new THREE.MeshStandardMaterial({ color: 0x738453, roughness: 1 }),
};

export function makeWaterMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uDeep: { value: new THREE.Color(0x0d4b58) },
      uShallow: { value: new THREE.Color(0x49b2a6) },
      uSky: { value: new THREE.Color(0xbad9de) },
      uSun: { value: new THREE.Color(0xfff2d8) },
      uSunDir: { value: new THREE.Vector3(0.4, 0.8, 0.3).normalize() },
      uNormalMap: { value: waterNormalMap },
      uFlow: { value: 1.0 },
      uBand: { value: 1.0 },
    },
    vertexShader: `
      uniform float uTime;
      varying vec3 vWorldPos;
      varying vec3 vNormalW;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec3 pos = position;
        pos.y += sin(pos.x * 0.21 + uTime * 0.8) * 0.035;
        pos.y += cos(pos.z * 0.27 + uTime * 0.62) * 0.03;
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
      uniform float uFlow;
      uniform float uBand;
      varying vec3 vWorldPos;
      varying vec3 vNormalW;
      varying vec2 vUv;
      void main() {
        float t = uTime * uFlow;
        vec2 uv1 = vWorldPos.xz * 0.037 + vec2(t * 0.012, t * 0.018);
        vec2 uv2 = vWorldPos.xz * 0.019 - vec2(t * 0.009, t * 0.014);
        vec2 uv3 = vWorldPos.xz * 0.096 + vec2(-t * 0.023, t * 0.019);
        vec2 uv4 = vWorldPos.xz * 0.24 + vec2(t * 0.041, -t * 0.029);
        vec3 n1 = texture2D(uNormalMap, uv1).rgb * 2.0 - 1.0;
        vec3 n2 = texture2D(uNormalMap, uv2).rgb * 2.0 - 1.0;
        vec3 n3 = texture2D(uNormalMap, uv3).rgb * 2.0 - 1.0;
        vec3 n4 = texture2D(uNormalMap, uv4).rgb * 2.0 - 1.0;
        vec3 n = normalize(vNormalW + vec3(n1.x + n2.x + n3.x * 0.6 + n4.x * 0.32, 0.0, n1.y + n2.y + n3.y * 0.6 + n4.y * 0.32) * 0.42);
        float band = sin(vWorldPos.x * 0.026 + vWorldPos.z * 0.017 + sin(vWorldPos.z * 0.007) * 2.2);
        float fine = sin(vWorldPos.x * 0.09 - vWorldPos.z * 0.052 + t * 0.12);
        float depthMix = 0.43 + band * 0.16 * uBand;
        vec3 base = mix(uDeep, uShallow, depthMix);
        float stripe = smoothstep(0.16, 0.62, fine * 0.5 + 0.5);
        base = mix(base, uShallow * 1.05, stripe * 0.28 * uBand);
        float shallowEdge = smoothstep(0.7, 1.0, sin(vWorldPos.z * 0.011 - vWorldPos.x * 0.004) * 0.5 + 0.5);
        base = mix(base, uShallow * 1.12, shallowEdge * 0.22);
        vec3 viewDir = normalize(cameraPosition - vWorldPos);
        float fres = pow(1.0 - clamp(dot(viewDir, n), 0.0, 1.0), 2.6);
        vec3 col = mix(base, uSky, fres * 0.5);
        vec3 hv = normalize(viewDir + normalize(uSunDir));
        float spec = pow(max(dot(n, hv), 0.0), 180.0);
        col += uSun * spec * 0.6;
        float ripple = sin(vWorldPos.x * 1.9 + vWorldPos.z * 0.7 + t * 2.4) * sin(vWorldPos.z * 2.3 - t * 1.7);
        float glint = pow(max(ripple, 0.0), 30.0);
        col += vec3(1.0, 0.97, 0.88) * glint * 0.11;
        gl_FragColor = vec4(col, 0.97);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
  });
}

export const sharedTextures = {
  woodMap,
  shingleMap,
  meadowMap,
  barkMap,
  birchMap,
  rockMap,
  waterNormalMap,
};
