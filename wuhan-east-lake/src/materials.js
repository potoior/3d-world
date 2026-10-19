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
  makeGrassTexture,
  makeGroundTexture,
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
const grassMap = makeGrassTexture();
const groundMap = makeGroundTexture();
grassMap.repeat.set(70, 60);
groundMap.repeat.set(120, 100);

roofMap.repeat.set(1, 1);
marbleMap.repeat.set(1, 1);
pavingMap.repeat.set(160, 190);
dirtMap.repeat.set(90, 100);

const plaqueCache = new Map();

export const mats = {
  roof: new THREE.MeshStandardMaterial({
    map: roofMap,
    color: 0xa8bfba,
    roughness: 0.72,
    metalness: 0.08,
    side: THREE.DoubleSide,
  }),
  roofGreen: new THREE.MeshStandardMaterial({
    map: roofMap,
    color: 0x57836a,
    roughness: 0.34,
    metalness: 0.24,
    side: THREE.DoubleSide,
  }),
  columnRed: new THREE.MeshStandardMaterial({
    color: 0xa23f2d,
    roughness: 0.58,
    metalness: 0.02,
  }),
  redLacquer: new THREE.MeshStandardMaterial({
    color: 0x8f2f24,
    roughness: 0.5,
  }),
  ground: new THREE.MeshStandardMaterial({
    map: groundMap,
    vertexColors: true,
    roughness: 1.0,
  }),
  reed: new THREE.MeshStandardMaterial({
    color: 0xb0ab86,
    roughness: 0.92,
    side: THREE.DoubleSide,
  }),
  wake: new THREE.MeshBasicMaterial({
    color: 0xeaf6f4,
    transparent: true,
    opacity: 0.34,
    depthWrite: false,
  }),
  white: new THREE.MeshStandardMaterial({
    color: 0xe9e4d7,
    roughness: 0.72,
  }),
  roofDark: new THREE.MeshStandardMaterial({
    map: roofMap,
    color: 0x4b5a58,
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
    color: 0x5c3b2b,
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
    color: 0xcfc6b2,
    roughness: 0.7,
  }),
  stone: new THREE.MeshStandardMaterial({
    color: 0x9d978a,
    roughness: 0.88,
  }),
  paving: new THREE.MeshStandardMaterial({
    map: pavingMap,
    roughness: 0.9,
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
    map: grassMap,
    color: 0xffffff,
    roughness: 1.0,
  }),
  path: new THREE.MeshStandardMaterial({
    map: pavingMap,
    color: 0xcfcabe,
    roughness: 0.92,
  }),
  willow: new THREE.MeshStandardMaterial({
    color: 0x8ba06b,
    roughness: 0.9,
  }),
  bamboo: new THREE.MeshStandardMaterial({
    color: 0x6d8b55,
    roughness: 0.88,
  }),
  lotus: new THREE.MeshStandardMaterial({
    color: 0x5c7c54,
    roughness: 0.85,
    side: THREE.DoubleSide,
  }),
  cherry: new THREE.MeshStandardMaterial({
    color: 0xf1bccb,
    roughness: 0.78,
  }),
  cherryLight: new THREE.MeshStandardMaterial({
    color: 0xf9dce3,
    roughness: 0.75,
  }),
  city: new THREE.MeshStandardMaterial({
    color: 0xb3bec2,
    roughness: 0.9,
  }),
  sand: new THREE.MeshStandardMaterial({
    color: 0xc9c0aa,
    roughness: 0.95,
  }),
  blossom: new THREE.MeshStandardMaterial({
    color: 0xd8a6a4,
    roughness: 0.8,
  }),
  copper: new THREE.MeshStandardMaterial({
    color: 0x6f5840,
    roughness: 0.38,
    metalness: 0.8,
  }),
  teal: new THREE.MeshStandardMaterial({
    color: 0x3a2c22,
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
    color: 0x718e5a,
    roughness: 0.82,
  }),
  pine: new THREE.MeshStandardMaterial({
    color: 0x56785c,
    roughness: 0.88,
  }),
  trunk: new THREE.MeshStandardMaterial({
    color: 0x5b4330,
    roughness: 0.95,
  }),
  rock: new THREE.MeshStandardMaterial({
    color: 0x86857a,
    roughness: 0.95,
  }),
  lantern: new THREE.MeshStandardMaterial({
    color: 0xc23a26,
    roughness: 0.6,
    emissive: 0x3a0603,
    emissiveIntensity: 0.5,
  }),
};

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
      uDeep: { value: new THREE.Color(0x2e5050) },
      uShallow: { value: new THREE.Color(0x4f7f80) },
      uSky: { value: new THREE.Color(0x9dbccb) },
      uTop: { value: new THREE.Color(0x6f9697) },
      uHorizon: { value: new THREE.Color(0xb9cbc8) },
      uSun: { value: new THREE.Color(0xfff0c8) },
      uSunDir: { value: new THREE.Vector3(0.4, 0.8, 0.3).normalize() },
      uNormalMap: { value: waterNormalMap },
      fogColor: { value: new THREE.Color(0xd4e2dc) },
      fogNear: { value: 720 },
      fogFar: { value: 3000 },
    },
    vertexShader: `
      uniform float uTime;
      varying vec3 vWorldPos;
      varying vec3 vNormalW;
      varying vec2 vUv;
      #include <fog_pars_vertex>
      void main() {
        vUv = uv;
        vec3 pos = position;
        pos.z += sin(pos.x * 0.12 + uTime * 0.7) * 0.06;
        pos.z += cos(pos.y * 0.16 + uTime * 0.5) * 0.05;
        vec4 world = modelMatrix * vec4(pos, 1.0);
        vWorldPos = world.xyz;
        vNormalW = normalize(mat3(modelMatrix) * normal);
        vec4 mvPosition = viewMatrix * world;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uDeep;
      uniform vec3 uShallow;
      uniform vec3 uSky;
      uniform vec3 uTop;
      uniform vec3 uHorizon;
      uniform vec3 uSun;
      uniform vec3 uSunDir;
      uniform sampler2D uNormalMap;
      #include <fog_pars_fragment>
      varying vec3 vWorldPos;
      varying vec3 vNormalW;
      varying vec2 vUv;
      void main() {
        vec2 uv1 = vWorldPos.xz * 0.055 + vec2(uTime * 0.016, uTime * 0.011);
        vec2 uv2 = vWorldPos.xz * 0.019 - vec2(uTime * 0.007, uTime * 0.013);
        vec2 uv3 = vWorldPos.xz * 0.13 + vec2(-uTime * 0.02, uTime * 0.018);
        vec3 n1 = texture2D(uNormalMap, uv1).rgb * 2.0 - 1.0;
        vec3 n2 = texture2D(uNormalMap, uv2).rgb * 2.0 - 1.0;
        vec3 n3 = texture2D(uNormalMap, uv3).rgb * 2.0 - 1.0;
        vec3 ripple = vec3(n1.x * 0.55 + n2.x * 0.4 + n3.x * 0.18, 0.0, n1.y * 0.55 + n2.y * 0.4 + n3.y * 0.18);
        vec3 n = normalize(vec3(ripple.x, 1.0, ripple.z));
        vec3 viewDir = normalize(cameraPosition - vWorldPos);
        float fres = pow(1.0 - clamp(dot(viewDir, n), 0.0, 1.0), 3.2);
        vec3 refl = reflect(-viewDir, n);
        vec3 skyRef = mix(uHorizon, uTop, smoothstep(0.0, 0.55, max(refl.y, 0.0)));
        float sunGlow = pow(max(dot(refl, normalize(uSunDir)), 0.0), 10.0);
        skyRef += uSun * sunGlow * 0.22;
        vec3 base = mix(uDeep, uShallow, 0.4 + 0.22 * n1.x + 0.1 * n2.x);
        base += vec3(0.015, 0.035, 0.03) * smoothstep(0.1, 0.8, n3.x);
        vec3 col = mix(base, skyRef, 0.28 + 0.56 * fres);
        vec3 hv = normalize(viewDir + normalize(uSunDir));
        float spec = pow(max(dot(n, hv), 0.0), 160.0);
        col += uSun * spec * 0.9;
        float sparkle = pow(max(sin(vWorldPos.x * 0.7 + uTime * 1.3) * sin(vWorldPos.z * 0.5 - uTime * 0.9), 0.0), 24.0);
        col += vec3(1.0, 0.95, 0.82) * sparkle * 0.1;
        gl_FragColor = vec4(col, 0.97);
        #include <fog_fragment>
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
    fog: true,
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
