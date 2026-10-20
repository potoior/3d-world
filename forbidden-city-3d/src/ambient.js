import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { sharedTextures, updateWind } from './materials.js';

const flagPositions = [
  [-52, 150],
  [52, 150],
  [-52, 200],
  [52, 200],
];

function smokeSystem() {
  const emitters = [
    [-26, 9.4, 112],
    [26, 9.4, 112],
    [-24, 9.4, -18],
    [24, 9.4, -18],
    [-30, 3.9, -330],
    [30, 3.9, -330],
    [-16, 3.0, -378],
    [16, 3.0, -378],
  ];
  const per = 18;
  const count = emitters.length * per;
  const pos = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  let k = 0;
  for (const e of emitters) {
    for (let i = 0; i < per; i++) {
      pos[k * 3] = e[0];
      pos[k * 3 + 1] = e[1];
      pos[k * 3 + 2] = e[2];
      seed[k] = i / per + Math.random() * 0.05;
      k++;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uMap: { value: sharedTextures.smokeMap } },
    transparent: true,
    depthWrite: false,
    vertexShader: `
      uniform float uTime;
      attribute float aSeed;
      varying float vAlpha;
      void main() {
        float t = fract(uTime * 0.105 + aSeed);
        float a = aSeed * 6.283 + uTime * 0.22;
        vec3 p = position;
        p.x += sin(a + t * 3.1) * t * 1.9;
        p.z += cos(a * 1.13 + t * 2.4) * t * 1.6;
        p.y += t * 5.4;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp((24.0 + t * 62.0) * (70.0 / -mv.z), 1.0, 96.0);
        vAlpha = sin(t * 3.14159) * 0.5;
      }
    `,
    fragmentShader: `
      uniform sampler2D uMap;
      varying float vAlpha;
      void main() {
        vec4 s = texture2D(uMap, gl_PointCoord);
        gl_FragColor = vec4(0.93, 0.92, 0.88, s.a * vAlpha);
      }
    `,
  });
  const mesh = new THREE.Points(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 3;
  return { mesh, update: (t) => (mat.uniforms.uTime.value = t) };
}

function bannerSystem() {
  const geos = [];
  for (const [x, z] of flagPositions) {
    const g = new THREE.PlaneGeometry(3.2, 3.6, 8, 6);
    g.translate(x, 8.9, z);
    geos.push(g);
  }
  const geo = mergeGeometries(geos, false);
  geos.forEach((g) => g.dispose());
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uMap: { value: sharedTextures.bannerMap } },
    side: THREE.DoubleSide,
    vertexShader: `
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec3 p = position;
        float hang = 1.0 - uv.y;
        float wave = sin(uTime * 2.2 + uv.y * 5.2 + position.x * 0.72 + position.z * 0.4);
        p.z += wave * 0.3 * hang;
        p.x += cos(uTime * 1.7 + uv.y * 4.1 + position.x * 0.5) * 0.12 * hang;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D uMap;
      varying vec2 vUv;
      void main() {
        vec4 c = texture2D(uMap, vUv);
        gl_FragColor = c;
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  return { mesh, update: (t) => (mat.uniforms.uTime.value = t) };
}

function birdSystem() {
  const count = 16;
  const pos = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    seed[i] = i / count + Math.random() * 0.03;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uMap: { value: sharedTextures.birdMap } },
    transparent: true,
    depthWrite: false,
    vertexShader: `
      uniform float uTime;
      attribute float aSeed;
      varying float vAlpha;
      void main() {
        float a = uTime * 0.12 + aSeed * 6.28318;
        float r = 130.0 + aSeed * 110.0;
        vec3 p = vec3(cos(a) * r, 78.0 + sin(a * 2.0 + aSeed * 4.0) * 30.0 + aSeed * 22.0, 55.0 + sin(a) * r * 0.62);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp(26.0 * (220.0 / -mv.z), 2.0, 30.0);
        vAlpha = 0.82;
      }
    `,
    fragmentShader: `
      uniform sampler2D uMap;
      varying float vAlpha;
      void main() {
        vec4 s = texture2D(uMap, gl_PointCoord);
        gl_FragColor = vec4(0.16, 0.15, 0.14, s.a * vAlpha);
      }
    `,
  });
  const mesh = new THREE.Points(geo, mat);
  mesh.frustumCulled = false;
  return { mesh, update: (t) => (mat.uniforms.uTime.value = t) };
}

export function createAmbient() {
  const group = new THREE.Group();
  const smoke = smokeSystem();
  const banners = bannerSystem();
  const birds = birdSystem();
  group.add(smoke.mesh, banners.mesh, birds.mesh);
  return {
    group,
    update(time) {
      updateWind(time);
      smoke.update(time);
      banners.update(time);
      birds.update(time);
    },
  };
}
