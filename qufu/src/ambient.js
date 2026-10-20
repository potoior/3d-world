import * as THREE from 'three';
import { sharedTextures, updateWind } from './materials.js';

function smokeSystem() {
  const emitters = [
    [-18, 5.2, -22],
    [18, 5.2, -22],
    [0, 3.6, 40],
    [0, 3.4, -412],
    [330, 3.2, 178],
    [-330, 3.0, 148],
  ];
  const per = 22;
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
        float t = fract(uTime * 0.095 + aSeed);
        float a = aSeed * 6.283 + uTime * 0.2;
        vec3 p = position;
        p.x += sin(a + t * 3.1) * t * 2.1;
        p.z += cos(a * 1.13 + t * 2.4) * t * 1.8;
        p.y += t * 6.2;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp((22.0 + t * 68.0) * (70.0 / -mv.z), 1.0, 98.0);
        vAlpha = sin(t * 3.14159) * 0.46;
      }
    `,
    fragmentShader: `
      uniform sampler2D uMap;
      varying float vAlpha;
      void main() {
        vec4 s = texture2D(uMap, gl_PointCoord);
        gl_FragColor = vec4(0.94, 0.92, 0.86, s.a * vAlpha);
      }
    `,
  });
  const mesh = new THREE.Points(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 3;
  return { mesh, update: (t) => (mat.uniforms.uTime.value = t) };
}

function birdSystem() {
  const count = 22;
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
        float a = uTime * 0.105 + aSeed * 6.28318;
        float r = 120.0 + aSeed * 150.0;
        float cz = mix(20.0, -320.0, aSeed);
        vec3 p = vec3(cos(a) * r + 30.0, 74.0 + sin(a * 2.0 + aSeed * 4.0) * 26.0 + aSeed * 26.0, cz + sin(a) * r * 0.66);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp(27.0 * (240.0 / -mv.z), 2.0, 32.0);
        vAlpha = 0.8;
      }
    `,
    fragmentShader: `
      uniform sampler2D uMap;
      varying float vAlpha;
      void main() {
        vec4 s = texture2D(uMap, gl_PointCoord);
        gl_FragColor = vec4(0.15, 0.14, 0.13, s.a * vAlpha);
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
  const birds = birdSystem();
  group.add(smoke.mesh, birds.mesh);
  return {
    group,
    update(time) {
      updateWind(time);
      smoke.update(time);
      birds.update(time);
    },
  };
}
