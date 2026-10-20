import * as THREE from 'three';
import { mats } from './materials.js';
import { trailSamples, platforms } from './terrain.js';

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createIncense(group) {
  const temple = platforms.find((p) => p.name === '三清宫');
  const rand = mulberry32(8113);
  const count = 14;
  const geo = new THREE.PlaneGeometry(1, 1);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uMap: { value: mats.mist.map },
      uColor: { value: new THREE.Color(0xe7eee9) },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec4 p = vec4(position, 1.0);
        #ifdef USE_INSTANCING
          p = instanceMatrix * p;
        #endif
        gl_Position = projectionMatrix * modelViewMatrix * p;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform sampler2D uMap;
      uniform vec3 uColor;
      varying vec2 vUv;
      void main() {
        vec4 tex = texture2D(uMap, vUv);
        float edge = smoothstep(0.0, 0.16, vUv.x) * smoothstep(1.0, 0.84, vUv.x);
        float fade = smoothstep(1.0, 0.72, vUv.y) * smoothstep(0.0, 0.2, vUv.y);
        float pulse = 0.55 + 0.45 * sin(uTime * 0.7 + vUv.y * 5.0);
        gl_FragColor = vec4(uColor, tex.a * edge * fade * 0.9 * pulse);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  mesh.frustumCulled = false;
  mesh.renderOrder = 4;
  group.add(mesh);
  const data = [];
  for (let i = 0; i < count; i++) {
    data.push({
      phase: rand(),
      drift: 0.3 + rand() * 0.7,
      x: (rand() - 0.5) * 1.2,
      z: (rand() - 0.5) * 0.8,
      w: 1.3 + rand() * 1.4,
      h: 3.2 + rand() * 3.0,
      yaw: (rand() - 0.5) * 0.6,
    });
  }
  return { mesh, mat, data };
}

function createPythonMist(group) {
  const rand = mulberry32(8219);
  const count = 13;
  const geo = new THREE.PlaneGeometry(1, 1);
  const mesh = new THREE.InstancedMesh(geo, mats.mist, count);
  mesh.frustumCulled = false;
  mesh.renderOrder = 3;
  group.add(mesh);
  const data = [];
  for (let i = 0; i < count; i++) {
    const a = rand() * Math.PI * 2;
    const d = 22 + rand() * 56;
    data.push({
      x: 113 + Math.cos(a) * d,
      z: 30 + Math.sin(a) * d + 18,
      y: 84 + rand() * 70,
      w: 55 + rand() * 95,
      h: 16 + rand() * 40,
      yaw: rand() * Math.PI,
      phase: rand() * 6.28,
      drift: 1.2 + rand() * 3.2,
    });
  }
  return { mesh, data };
}

function createPrayerRibbons(group) {
  const rand = mulberry32(8311);
  const start = trailSamples[64];
  const count = 30;
  const geo = new THREE.PlaneGeometry(0.36, 0.62);
  geo.translate(0, -0.31, 0);
  const mat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: true });
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  mesh.frustumCulled = false;
  const color = new THREE.Color();
  const palette = [0xb63a2b, 0xe0a12c, 0x2e5f86, 0x40704a, 0xe8e2d2];
  const data = [];
  const yaw = Math.atan2(start.nx || 0, start.nz || 1) + Math.PI * 0.5;
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / 10);
    const k = (i % 10) / 9;
    data.push({
      x: start.x + (start.nx || 0) * (start.width * 0.5 + 0.22) + (start.tx || 0) * (k - 0.5) * 3.0,
      y: start.y + 1.36 - row * 0.22 - Math.sin(k * Math.PI) * 0.12,
      z: start.z + (start.nz || 1) * (start.width * 0.5 + 0.22) + (start.tz || 1) * (k - 0.5) * 3.0,
      phase: rand() * 6.28,
      yaw: yaw + row * 0.03,
      scale: 0.8 + rand() * 0.35,
    });
    mesh.setColorAt(i, color.setHex(palette[i % palette.length]));
  }
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  group.add(mesh);
  return { mesh, data };
}

export function createSanqingLife() {
  const group = new THREE.Group();
  group.name = 'sanqingshan-life';
  const dummy = new THREE.Object3D();
  const temple = platforms.find((p) => p.name === '三清宫');
  const incense = createIncense(group);
  const mist = createPythonMist(group);
  const ribbons = createPrayerRibbons(group);

  function update(time) {
    incense.mat.uniforms.uTime.value = time;
    incense.data.forEach((s, i) => {
      const life = (time * 0.055 * s.drift + s.phase) % 1;
      const sway = Math.sin(time * 0.32 + s.phase * 6.28) * (0.5 + life * 1.6);
      dummy.position.set(temple.x + s.x + sway, temple.y + 2.3 + life * 17, temple.z + 11.6 + s.z + Math.cos(time * 0.22 + s.phase * 5.0) * 0.5);
      dummy.rotation.set(0, s.yaw + Math.sin(time * 0.18 + s.phase) * 0.12, 0);
      dummy.scale.set(s.w * (0.6 + life * 1.5), s.h * (0.45 + life * 0.9), 1);
      dummy.updateMatrix();
      incense.mesh.setMatrixAt(i, dummy.matrix);
    });
    incense.mesh.instanceMatrix.needsUpdate = true;

    mist.data.forEach((m, i) => {
      const x = m.x + Math.sin(time * 0.035 * m.drift + m.phase) * 15;
      const z = m.z + Math.cos(time * 0.028 * m.drift + m.phase) * 8;
      const y = m.y + Math.sin(time * 0.06 + m.phase) * 1.4;
      dummy.position.set(x, y, z);
      dummy.rotation.set(0, m.yaw, 0);
      dummy.scale.set(m.w, m.h, 1);
      dummy.updateMatrix();
      mist.mesh.setMatrixAt(i, dummy.matrix);
    });
    mist.mesh.instanceMatrix.needsUpdate = true;

    ribbons.data.forEach((r, i) => {
      dummy.position.set(r.x, r.y, r.z);
      dummy.rotation.set(Math.sin(time * 2.2 + r.phase) * 0.2, r.yaw, Math.cos(time * 1.8 + r.phase) * 0.16);
      dummy.scale.set(r.scale, 1, 1);
      dummy.updateMatrix();
      ribbons.mesh.setMatrixAt(i, dummy.matrix);
    });
    ribbons.mesh.instanceMatrix.needsUpdate = true;
  }

  update(0);
  return { group, update, parts: { incense: incense.data.length, mist: mist.data.length, ribbons: ribbons.data.length } };
}
