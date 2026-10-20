import * as THREE from 'three';
import {
  makeWhiteTexture,
  makeRedTexture,
  makeStoneTexture,
  makePavingTexture,
  makeRoofTexture,
  makeGroundTexture,
  makePlaqueTexture,
} from './textures.js';

const whiteMap = makeWhiteTexture();
const redMap = makeRedTexture();
const stoneMap = makeStoneTexture();
const pavingMap = makePavingTexture();
const roofMap = makeRoofTexture();
const groundMap = makeGroundTexture();

whiteMap.repeat.set(6, 3.2);
redMap.repeat.set(5.2, 2.8);
stoneMap.repeat.set(4.4, 3.6);
pavingMap.repeat.set(9, 9);
roofMap.repeat.set(1, 1);
groundMap.repeat.set(70, 70);

export const mats = {
  white: new THREE.MeshStandardMaterial({
    map: whiteMap,
    color: 0xf3ecdd,
    roughness: 0.95,
    metalness: 0,
  }),
  whiteShade: new THREE.MeshStandardMaterial({
    map: whiteMap,
    color: 0xd9cfba,
    roughness: 0.96,
  }),
  red: new THREE.MeshStandardMaterial({
    map: redMap,
    color: 0xfff2ea,
    roughness: 0.94,
    metalness: 0,
  }),
  redShade: new THREE.MeshStandardMaterial({
    map: redMap,
    color: 0xd8b6aa,
    roughness: 0.96,
  }),
  trim: new THREE.MeshStandardMaterial({
    color: 0x2a1a12,
    roughness: 0.82,
    metalness: 0.06,
  }),
  trimRed: new THREE.MeshStandardMaterial({
    color: 0x541a13,
    roughness: 0.86,
  }),
  gold: new THREE.MeshStandardMaterial({
    color: 0xe0b44e,
    roughness: 0.27,
    metalness: 0.86,
  }),
  goldBright: new THREE.MeshStandardMaterial({
    color: 0xffd36a,
    roughness: 0.16,
    metalness: 0.92,
    emissive: 0x2c1a03,
    emissiveIntensity: 0.55,
  }),
  roof: new THREE.MeshStandardMaterial({
    map: roofMap,
    color: 0xffe9ad,
    roughness: 0.23,
    metalness: 0.74,
    emissive: 0x171003,
    emissiveIntensity: 0.4,
    side: THREE.DoubleSide,
  }),
  roofDark: new THREE.MeshStandardMaterial({
    color: 0x6d4419,
    roughness: 0.44,
    metalness: 0.62,
  }),
  teal: new THREE.MeshStandardMaterial({
    color: 0x2a1c14,
    roughness: 0.88,
  }),
  stone: new THREE.MeshStandardMaterial({
    map: stoneMap,
    color: 0xb3a894,
    roughness: 0.96,
  }),
  stoneDark: new THREE.MeshStandardMaterial({
    map: stoneMap,
    color: 0x8a7f6c,
    roughness: 0.98,
  }),
  paving: new THREE.MeshStandardMaterial({
    map: pavingMap,
    color: 0xc6bca8,
    roughness: 0.95,
  }),
  ground: new THREE.MeshStandardMaterial({
    map: groundMap,
    color: 0xb3a77e,
    roughness: 1,
  }),
  window: new THREE.MeshStandardMaterial({
    color: 0x100e0c,
    roughness: 0.34,
    metalness: 0.22,
  }),
  windowFrame: new THREE.MeshStandardMaterial({
    color: 0xeff0e9,
    roughness: 0.74,
  }),
  wood: new THREE.MeshStandardMaterial({
    color: 0x4a2416,
    roughness: 0.8,
  }),
  ochre: new THREE.MeshStandardMaterial({
    color: 0xb98b3d,
    roughness: 0.8,
  }),
  foliage: new THREE.MeshStandardMaterial({
    color: 0x3d6040,
    roughness: 0.96,
  }),
  foliageDark: new THREE.MeshStandardMaterial({
    color: 0x2c4832,
    roughness: 0.98,
  }),
  trunk: new THREE.MeshStandardMaterial({
    color: 0x4d3a27,
    roughness: 0.98,
  }),
  rock: new THREE.MeshStandardMaterial({
    map: stoneMap,
    color: 0x8b816e,
    roughness: 1,
  }),
  lantern: new THREE.MeshStandardMaterial({
    color: 0xffbd68,
    emissive: 0xff7a1e,
    emissiveIntensity: 1.35,
    roughness: 0.55,
    metalness: 0.08,
  }),
  copper: new THREE.MeshStandardMaterial({
    color: 0x8a4b25,
    roughness: 0.42,
    metalness: 0.72,
  }),
  robe: new THREE.MeshStandardMaterial({
    color: 0x6e1b13,
    roughness: 0.93,
  }),
  robeGold: new THREE.MeshStandardMaterial({
    color: 0xb27a22,
    roughness: 0.88,
  }),
  skin: new THREE.MeshStandardMaterial({
    color: 0xb3855e,
    roughness: 0.9,
  }),
  snow: new THREE.MeshStandardMaterial({
    color: 0xf0f3f2,
    roughness: 0.74,
    metalness: 0.02,
  }),
  fieldGreen: new THREE.MeshStandardMaterial({
    color: 0x6d7b41,
    roughness: 1,
  }),
  fieldGold: new THREE.MeshStandardMaterial({
    color: 0xa38b4c,
    roughness: 1,
  }),
  fieldBrown: new THREE.MeshStandardMaterial({
    color: 0x7c6845,
    roughness: 1,
  }),
  bannerRed: new THREE.MeshStandardMaterial({
    color: 0x9e2a1c,
    roughness: 0.88,
    side: THREE.DoubleSide,
  }),
};

export function makePlaqueMaterial(label) {
  const map = makePlaqueTexture(label);
  return new THREE.MeshStandardMaterial({
    map,
    color: 0xffffff,
    roughness: 0.5,
    metalness: 0.32,
    emissive: 0x1b0f03,
    emissiveIntensity: 0.35,
  });
}

export function makeSkyMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      topColor: { value: new THREE.Color(0x0c4f9e) },
      horizonColor: { value: new THREE.Color(0xa9cdf0) },
      bottomColor: { value: new THREE.Color(0xd9cfb8) },
      sunColor: { value: new THREE.Color(0xfff2d0) },
      sunDir: { value: new THREE.Vector3(0.5, 0.65, 0.4).normalize() },
    },
    side: THREE.BackSide,
    depthWrite: false,
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 horizonColor;
      uniform vec3 bottomColor;
      uniform vec3 sunColor;
      uniform vec3 sunDir;
      varying vec3 vWorldPosition;
      void main() {
        vec3 dir = normalize(vWorldPosition);
        float h = dir.y;
        vec3 col = mix(bottomColor, horizonColor, smoothstep(-0.2, 0.06, h));
        col = mix(col, topColor, smoothstep(0.0, 0.68, h));
        float sd = max(dot(dir, normalize(sunDir)), 0.0);
        col += sunColor * pow(sd, 900.0) * 1.6;
        col += sunColor * pow(sd, 16.0) * 0.14;
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
}

export const skyUniforms = {
  top: { value: new THREE.Color(0x0c4f9e) },
  horizon: { value: new THREE.Color(0xa9cdf0) },
  bottom: { value: new THREE.Color(0xd9cfb8) },
  sun: { value: new THREE.Color(0xfff2d0) },
  sunDir: { value: new THREE.Vector3(0.5, 0.65, 0.4).normalize() },
};
