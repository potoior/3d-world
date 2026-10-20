import * as THREE from 'three';
import { mats } from './materials.js';
import { GROUND, WALL_HEIGHT } from './fortress.js';
import { heightAt } from './terrain.js';
import { buildCamelGeometry, buildHorseGeometry, buildPersonGeometry, buildRavenGeometry } from './models.js';
import { FLAGS } from './decor.js';

const CAMEL_ROUTE = [
  [148, 74], [196, 46], [214, -12], [196, -72], [150, -112],
  [104, -88], [92, -36], [126, 8], [160, 44],
];

function routePoint(distance) {
  let total = 0;
  const segs = [];
  for (let i = 0; i < CAMEL_ROUTE.length; i++) {
    const a = CAMEL_ROUTE[i];
    const b = CAMEL_ROUTE[(i + 1) % CAMEL_ROUTE.length];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    segs.push({ a, b, len, total });
    total += len;
  }
  let d = distance % total;
  if (d < 0) d += total;
  for (const s of segs) {
    if (d <= s.total + s.len) {
      const u = (d - s.total) / s.len;
      return {
        x: s.a[0] + (s.b[0] - s.a[0]) * u,
        z: s.a[1] + (s.b[1] - s.a[1]) * u,
        yaw: Math.atan2(s.b[0] - s.a[0], s.b[1] - s.a[1]),
      };
    }
  }
  return { x: CAMEL_ROUTE[0][0], z: CAMEL_ROUTE[0][1], yaw: 0 };
}

function makeFlagCloth(flag) {
  const geo = new THREE.PlaneGeometry(3.2, 3.7, 10, 6);
  geo.translate(1.6, -1.85, 0);
  const mesh = new THREE.Mesh(geo, mats.cloth);
  mesh.position.set(flag.x, flag.y + 9.25, flag.z);
  mesh.rotation.y = flag.yaw;
  mesh.castShadow = true;
  const base = geo.attributes.position.array.slice();
  return { mesh, geo, base, phase: Math.random() * 6.28 };
}

function makeDust() {
  const count = 520;
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() * 2 - 1) * 240;
    positions[i * 3 + 1] = 0.4 + Math.random() * 13;
    positions[i * 3 + 2] = (Math.random() * 2 - 1) * 170;
    seeds[i] = Math.random();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(0xd7bd92) },
    },
    transparent: true,
    depthWrite: false,
    vertexShader: `
      uniform float uTime;
      attribute float aSeed;
      varying float vFade;
      void main() {
        vec3 p = position;
        float ph = aSeed * 6.2831;
        p.x += sin(uTime * 0.32 + ph) * (2.5 + aSeed * 4.0) + uTime * 0.6;
        p.z += cos(uTime * 0.27 + ph * 1.7) * (2.0 + aSeed * 3.5);
        p.y += sin(uTime * 0.55 + ph * 2.3) * 0.9;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp((2.2 + aSeed * 5.5) * (260.0 / max(1.0, -mv.z)), 0.8, 18.0);
        vFade = 0.35 + 0.65 * aSeed;
        vFade *= smoothstep(190.0, 80.0, length(p.xz));
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      varying float vFade;
      void main() {
        float d = length(gl_PointCoord - vec2(0.5));
        float a = smoothstep(0.5, 0.06, d) * 0.32 * vFade;
        gl_FragColor = vec4(uColor, a);
      }
    `,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.renderOrder = 4;
  return { points, mat };
}

export function createLife() {
  const group = new THREE.Group();
  group.name = 'jiayuguan-animation';
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  const flags = FLAGS.map(makeFlagCloth);
  for (const f of flags) group.add(f.mesh);

  const camelGeo = buildCamelGeometry();
  const camels = new THREE.InstancedMesh(camelGeo, mats.camel, 5);
  camels.name = 'camel-caravan';
  camels.castShadow = true;
  camels.receiveShadow = true;
  camels.frustumCulled = false;
  group.add(camels);

  const horseGeo = buildHorseGeometry();
  const horses = new THREE.InstancedMesh(horseGeo, mats.camel, 2);
  horses.name = 'pass-horses';
  horses.castShadow = true;
  horses.receiveShadow = true;
  group.add(horses);
  const horseBases = [
    { x: 118, z: -22, yaw: 1.9, phase: 0.4 },
    { x: 146, z: 34, yaw: -2.2, phase: 2.4 },
  ];

  const personGeo = buildPersonGeometry();
  const people = new THREE.InstancedMesh(personGeo, mats.person, 14);
  people.name = 'visitors-and-watchmen';
  people.castShadow = true;
  people.receiveShadow = true;
  people.frustumCulled = false;
  group.add(people);
  const personBases = [
    { x: 112, z: 13, yaw: 2.2, y: 0, phase: 0.1, c: 0xcfc6b1 },
    { x: 119, z: -8, yaw: -1.4, y: 0, phase: 1.2, c: 0x9d5b43 },
    { x: 128, z: 3, yaw: 2.9, y: 0, phase: 2.1, c: 0x5b6f87 },
    { x: 105, z: 30, yaw: 1.0, y: 0, phase: 3.4, c: 0xc7b28c },
    { x: 133, z: -25, yaw: -2.0, y: 0, phase: 4.0, c: 0x7b4c3c },
    { x: 96, z: 44, yaw: 2.6, y: 0, phase: 5.1, c: 0x8b8f86 },
    { x: 151, z: 51, yaw: -1.1, y: 0, phase: 2.8, c: 0xb8a47d },
    { x: 108, z: -42, yaw: 0.5, y: 0, phase: 0.9, c: 0x6e7c8d },
    { x: 44, z: 58, yaw: 1.8, y: 1, phase: 1.7, c: 0x7a2f28 },
    { x: -44, z: 58, yaw: -1.8, y: 1, phase: 3.1, c: 0x7a2f28 },
    { x: 58, z: -58, yaw: 1.2, y: 1, phase: 4.4, c: 0x5d2a24 },
    { x: -58, z: -58, yaw: -1.2, y: 1, phase: 5.6, c: 0x5d2a24 },
    { x: 86, z: 30, yaw: 1.5, y: 1, phase: 2.6, c: 0x6d3a2d },
    { x: -86, z: -30, yaw: -1.5, y: 1, phase: 0.3, c: 0x6d3a2d },
  ];
  personBases.forEach((p, i) => {
    color.set(p.c);
    people.setColorAt(i, color);
  });
  people.instanceColor.needsUpdate = true;

  const ravenGeo = buildRavenGeometry();
  const ravens = new THREE.InstancedMesh(ravenGeo, mats.raven, 8);
  ravens.name = 'ravens';
  ravens.frustumCulled = false;
  group.add(ravens);

  const dust = makeDust();
  group.add(dust.points);

  const flagPos = new THREE.Vector3();
  let lastElapsed = 0;

  function update(elapsed, dt) {
    const step = Math.min(0.05, dt || 0.016);
    const time = elapsed;
    lastElapsed += step;

    for (const flag of flags) {
      const pos = flag.geo.attributes.position;
      const base = flag.base;
      for (let i = 0; i < pos.count; i++) {
        const x = base[i * 3];
        const y = base[i * 3 + 1];
        const t = x / 3.2;
        const wave = Math.sin(time * 3.1 + flag.phase + x * 1.7 + y * 0.9) * 0.34 * t;
        const lift = Math.sin(time * 2.3 + flag.phase + y * 1.4) * 0.08 * t;
        pos.setXYZ(i, x, y + lift, wave);
      }
      pos.needsUpdate = true;
    }

    const d = time * 2.1;
    for (let i = 0; i < 5; i++) {
      const p = routePoint(d - i * 5.4);
      const g = heightAt(p.x, p.z);
      dummy.position.set(p.x, g + Math.sin(time * 2.4 + i) * 0.11, p.z);
      dummy.rotation.set(0, p.yaw + Math.sin(time * 1.7 + i) * 0.035, Math.sin(time * 2.1 + i * 0.8) * 0.022);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      camels.setMatrixAt(i, dummy.matrix);
    }
    camels.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < horseBases.length; i++) {
      const h = horseBases[i];
      const g = heightAt(h.x, h.z);
      dummy.position.set(h.x, g + Math.sin(time * 1.6 + h.phase) * 0.04, h.z);
      dummy.rotation.set(0, h.yaw + Math.sin(time * 0.9 + h.phase) * 0.05, 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      horses.setMatrixAt(i, dummy.matrix);
    }
    horses.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < personBases.length; i++) {
      const p = personBases[i];
      const g = p.y ? GROUND + WALL_HEIGHT + 0.24 : heightAt(p.x, p.z);
      const walk = p.y ? 0 : Math.sin(time * 0.7 + p.phase) * 0.37;
      dummy.position.set(p.x + walk, g + Math.sin(time * 1.9 + p.phase) * 0.025, p.z);
      dummy.rotation.set(0, p.yaw + Math.sin(time * 0.45 + p.phase) * 0.25, 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      people.setMatrixAt(i, dummy.matrix);
    }
    people.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < 8; i++) {
      const a = time * 0.16 + i * 0.79;
      const radius = 88 + (i % 3) * 34;
      const x = Math.cos(a) * radius;
      const z = Math.sin(a) * radius;
      const y = 46 + Math.sin(time * 0.5 + i * 1.7) * 12 + (i % 2) * 8;
      dummy.position.set(x, y, z);
      dummy.rotation.set(
        Math.sin(time * 0.8 + i) * 0.22,
        -a + Math.PI / 2,
        Math.sin(time * 4.2 + i * 1.3) * 0.65
      );
      dummy.scale.setScalar(0.8 + (i % 3) * 0.12);
      dummy.updateMatrix();
      ravens.setMatrixAt(i, dummy.matrix);
    }
    ravens.instanceMatrix.needsUpdate = true;

    dust.mat.uniforms.uTime.value = time;
  }

  update(0, 0);
  return { group, update, flags, camels, horses, people, ravens };
}
