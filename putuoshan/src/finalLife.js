import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mats } from './materials.js';
import { heightAt, trailSamples } from './terrain.js';

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

function segGeo(ax, ay, az, bx, by, bz, ra, rb, seg = 4) {
  const dx = bx - ax;
  const dy = by - ay;
  const dz = bz - az;
  const len = Math.hypot(dx, dy, dz) || 1;
  const geo = new THREE.CylinderGeometry(rb, ra, len, seg, 1, false);
  geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(dx / len, dy / len, dz / len)
  ));
  geo.translate((ax + bx) * 0.5, (ay + by) * 0.5, (az + bz) * 0.5);
  return geo;
}

function createMistLife(group) {
  const rand = mulberry32(64211);
  const count = 15;
  const data = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    data.push({
      x: 270 + (-166 - 270) * t + (rand() - 0.5) * 110,
      z: -150 + (-654 + 150) * t + (rand() - 0.5) * 90,
      y: 34 + rand() * 50 + Math.sin(t * 6) * 12,
      w: 150 + rand() * 280,
      h: 38 + rand() * 90,
      yaw: 0.05 + (rand() - 0.5) * 0.4,
      phase: rand() * 6.28,
      drift: 1.4 + rand() * 2.6,
    });
  }
  const geo = new THREE.PlaneGeometry(1, 1);
  const mesh = new THREE.InstancedMesh(geo, mats.mist, count);
  mesh.frustumCulled = false;
  mesh.renderOrder = 3;
  group.add(mesh);
  return { mesh, data };
}

function createSunShafts(group) {
  const rand = mulberry32(70113);
  const count = 8;
  const data = [];
  for (let i = 0; i < count; i++) {
    data.push({
      x: 360 + i * 32,
      y: 190 + (i % 3) * 28,
      z: 220 + (i % 4) * 34,
      w: 18 + (i % 4) * 10,
      h: 230 + (i % 5) * 42,
      yaw: -1.92 + (i % 3) * 0.025,
      phase: rand() * 6.28,
    });
  }
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(0xffd6a0) },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
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
      uniform vec3 uColor;
      varying vec2 vUv;
      void main() {
        float edge = smoothstep(1.0, 0.1, abs(vUv.x - 0.5) * 2.0);
        float band = smoothstep(0.0, 0.28, vUv.y) * smoothstep(1.0, 0.5, vUv.y);
        float wave = 0.72 + 0.28 * sin(uTime * 0.42 + vUv.y * 4.0);
        gl_FragColor = vec4(uColor, edge * band * 0.13 * wave);
      }
    `,
  });
  const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), mat, count);
  mesh.frustumCulled = false;
  mesh.renderOrder = 4;
  group.add(mesh);
  return { mesh, data, mat };
}

function createFlagLines(group) {
  const palette = [0xb63a2b, 0xe0a12c, 0x2e5f86, 0x40704a, 0xe8e2d2];
  const runs = [
    { a: [128, heightAt(128, 62) + 4.2, 62], b: [146, heightAt(146, 52) + 4.6, 52], n: 22 },
    { a: [228, heightAt(228, 368) + 3.8, 368], b: [244, heightAt(244, 354) + 4.1, 354], n: 18 },
  ];
  const flags = [];
  runs.forEach((run) => {
    for (let i = 0; i < run.n; i++) {
      const t = (i + 0.5) / run.n;
      flags.push({
        x: run.a[0] + (run.b[0] - run.a[0]) * t,
        y: run.a[1] + (run.b[1] - run.a[1]) * t - Math.sin(t * Math.PI) * 0.55,
        z: run.a[2] + (run.b[2] - run.a[2]) * t,
        phase: i * 0.52,
        yaw: Math.atan2(run.b[0] - run.a[0], run.b[2] - run.a[2]) + Math.PI * 0.5,
        sx: 0.9 + (i % 3) * 0.08,
      });
    }
  });
  const geo = new THREE.PlaneGeometry(0.52, 0.68);
  geo.translate(0, -0.34, 0);
  const mat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: true });
  const mesh = new THREE.InstancedMesh(geo, mat, flags.length);
  mesh.frustumCulled = false;
  const color = new THREE.Color();
  flags.forEach((f, i) => {
    mesh.setColorAt(i, color.setHex(palette[i % palette.length]));
  });
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  group.add(mesh);
  return { mesh, flags };
}

function birdGeometry() {
  const positions = [
    0, 0, 0.85, -0.18, 0, 0.1, 0.18, 0, 0.1,
    0, 0, 0.85, 0.18, 0, 0.1, 0, 0, -0.7,
    -0.18, 0, 0.1, -2.8, 0, 0.05, -0.28, 0, -0.4,
    0.18, 0, 0.1, 0.28, 0, -0.4, 2.8, 0, 0.05,
  ];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  return geo;
}

function createRaptors(group) {
  const rand = mulberry32(79231);
  const count = 5;
  const geo = birdGeometry();
  const phases = new Float32Array(count);
  for (let i = 0; i < count; i++) phases[i] = rand() * 6.28;
  geo.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phases, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    transparent: false,
    side: THREE.DoubleSide,
    vertexShader: `
      attribute float aPhase;
      uniform float uTime;
      void main() {
        vec3 p = position;
        float flap = sin(uTime * 3.2 + aPhase);
        p.y += abs(p.x) * flap * 0.55;
        vec4 m = vec4(p, 1.0);
        #ifdef USE_INSTANCING
          m = instanceMatrix * m;
        #endif
        gl_Position = projectionMatrix * modelViewMatrix * m;
      }
    `,
    fragmentShader: `
      void main() {
        gl_FragColor = vec4(0.16, 0.14, 0.12, 1.0);
      }
    `,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  mesh.frustumCulled = false;
  const data = [];
  for (let i = 0; i < count; i++) {
    data.push({
      cx: 180 + (i % 3) * 90,
      cz: -60 - (i % 4) * 70,
      r: 70 + (i % 4) * 26,
      y: 142 + (i % 4) * 18,
      speed: 0.032 + (i % 3) * 0.008,
      phase: i * 1.17,
      size: 1.0 + (i % 3) * 0.22,
    });
  }
  group.add(mesh);
  return { mesh, data, mat };
}

function monkeyGeometry() {
  const parts = [];
  const body = new THREE.SphereGeometry(0.26, 7, 5);
  body.scale(0.92, 1.18, 0.82);
  body.translate(0, 0.52, 0);
  parts.push(body);
  const head = new THREE.SphereGeometry(0.16, 7, 5);
  head.translate(0, 0.9, 0.05);
  parts.push(head);
  for (const side of [-1, 1]) {
    parts.push(segGeo(side * 0.18, 0.6, 0, side * 0.34, 0.42, 0.17, 0.06, 0.045, 4));
    parts.push(segGeo(side * 0.13, 0.36, 0, side * 0.15, 0.05, 0, 0.055, 0.04, 4));
    const ear = new THREE.SphereGeometry(0.06, 5, 4);
    ear.translate(side * 0.15, 0.93, 0.02);
    parts.push(ear);
  }
  parts.push(segGeo(0, 0.46, -0.18, 0.05, 0.52, -0.8, 0.055, 0.03, 4));
  parts.push(segGeo(0.05, 0.52, -0.8, -0.12, 0.33, -1.18, 0.035, 0.018, 4));
  return mergeGeometries(parts, false);
}

function createMonkeys(group) {
  const rand = mulberry32(82377);
  const count = 4;
  const mesh = new THREE.InstancedMesh(monkeyGeometry(), mats.trunk, count);
  mesh.frustumCulled = false;
  const idx = 206;
  const s = trailSamples[idx];
  const bx = s.x + (s.nx || 0) * (s.width * 0.5 + 2.5);
  const bz = s.z + (s.nz || 1) * (s.width * 0.5 + 2.5);
  const data = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + 0.4;
    const x = bx + Math.cos(a) * (0.7 + rand() * 0.8);
    const z = bz + Math.sin(a) * (0.7 + rand() * 0.8);
    data.push({
      x,
      z,
      y: Math.max(heightAt(x, z), s.y - 0.6) + 0.12 + (i % 2) * 0.22,
      yaw: a + Math.PI * 0.5,
      phase: rand() * 6.28,
      scale: 0.72 + rand() * 0.28,
    });
  }
  group.add(mesh);
  return { mesh, data };
}

export function createHuangshanFinalLife() {
  const group = new THREE.Group();
  group.name = 'tianzhu-final-life';
  const dummy = new THREE.Object3D();
  const mist = createMistLife(group);
  const shafts = createSunShafts(group);
  const flags = createFlagLines(group);
  const raptors = createRaptors(group);
  const monkeys = createMonkeys(group);

  function update(time) {
    mist.data.forEach((m, i) => {
      const x = m.x + Math.sin(time * 0.02 * m.drift + m.phase) * 22;
      const z = m.z + Math.cos(time * 0.015 * m.drift + m.phase) * 10;
      const y = m.y + Math.sin(time * 0.06 + m.phase) * 1.8;
      dummy.position.set(x, y, z);
      dummy.rotation.set(0, m.yaw, 0);
      dummy.scale.set(m.w, m.h, 1);
      dummy.updateMatrix();
      mist.mesh.setMatrixAt(i, dummy.matrix);
    });
    mist.mesh.instanceMatrix.needsUpdate = true;

    shafts.mat.uniforms.uTime.value = time;
    shafts.data.forEach((s, i) => {
      dummy.position.set(s.x, s.y + Math.sin(time * 0.09 + s.phase) * 2.2, s.z);
      dummy.rotation.set(0, s.yaw, Math.sin(time * 0.1 + s.phase) * 0.02);
      dummy.scale.set(s.w, s.h, 1);
      dummy.updateMatrix();
      shafts.mesh.setMatrixAt(i, dummy.matrix);
    });
    shafts.mesh.instanceMatrix.needsUpdate = true;

    flags.flags.forEach((f, i) => {
      dummy.position.set(f.x, f.y, f.z);
      dummy.rotation.set(Math.sin(time * 2.7 + f.phase) * 0.26, f.yaw, Math.cos(time * 2.2 + f.phase) * 0.17);
      dummy.scale.set(f.sx, 1, 1);
      dummy.updateMatrix();
      flags.mesh.setMatrixAt(i, dummy.matrix);
    });
    flags.mesh.instanceMatrix.needsUpdate = true;

    raptors.mat.uniforms.uTime.value = time;
    raptors.data.forEach((b, i) => {
      const t = time * b.speed + b.phase;
      const x = b.cx + Math.cos(t) * b.r;
      const z = b.cz + Math.sin(t) * b.r * 0.7;
      const y = b.y + Math.sin(time * 0.36 + b.phase) * 4.0;
      const dx = -Math.sin(t) * b.r;
      const dz = Math.cos(t) * b.r * 0.7;
      dummy.position.set(x, y, z);
      dummy.rotation.set(Math.sin(time * 1.6 + i) * 0.16, Math.atan2(dx, dz), Math.sin(time * 1.2 + i) * 0.12);
      dummy.scale.setScalar(b.size);
      dummy.updateMatrix();
      raptors.mesh.setMatrixAt(i, dummy.matrix);
    });
    raptors.mesh.instanceMatrix.needsUpdate = true;

    monkeys.data.forEach((m, i) => {
      dummy.position.set(m.x, m.y + Math.sin(time * 2.2 + m.phase) * 0.05, m.z);
      dummy.rotation.set(0, m.yaw + Math.sin(time * 0.7 + m.phase) * 0.25, Math.sin(time * 1.9 + m.phase) * 0.04);
      dummy.scale.setScalar(m.scale);
      dummy.updateMatrix();
      monkeys.mesh.setMatrixAt(i, dummy.matrix);
    });
    monkeys.mesh.instanceMatrix.needsUpdate = true;
  }

  update(0);
  return { group, update };
}
