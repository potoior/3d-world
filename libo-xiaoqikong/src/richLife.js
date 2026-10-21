import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mats } from './materials.js';

function koiGeometry() {
  const body = new THREE.SphereGeometry(0.13, 7, 5);
  body.scale(1, 0.72, 2.15);
  const tail = new THREE.ConeGeometry(0.12, 0.26, 4);
  tail.rotateX(Math.PI / 2);
  tail.translate(0, 0, 0.36);
  const fin = new THREE.ConeGeometry(0.06, 0.18, 3);
  fin.rotateX(-Math.PI / 2);
  fin.translate(0, 0.09, 0.05);
  return mergeGeometries([body, tail, fin], false);
}

function duckGeometry() {
  const body = new THREE.SphereGeometry(0.25, 8, 6);
  body.scale(1.15, 0.8, 1.6);
  const neck = new THREE.CylinderGeometry(0.07, 0.09, 0.24, 6);
  neck.translate(0, 0.22, 0.24);
  const head = new THREE.SphereGeometry(0.11, 7, 5);
  head.translate(0, 0.38, 0.31);
  const beak = new THREE.ConeGeometry(0.055, 0.16, 5);
  beak.rotateX(Math.PI / 2);
  beak.translate(0, 0.36, 0.44);
  return mergeGeometries([body, neck, head, beak], false);
}

function birdGeometry() {
  const body = new THREE.SphereGeometry(0.1, 5, 4);
  body.scale(0.7, 0.6, 1.7);
  const left = new THREE.BoxGeometry(0.72, 0.025, 0.16);
  left.rotateZ(0.28);
  left.translate(-0.34, 0.05, 0);
  const right = new THREE.BoxGeometry(0.72, 0.025, 0.16);
  right.rotateZ(-0.28);
  right.translate(0.34, 0.05, 0);
  return mergeGeometries([body, left, right], false);
}

export function createGardenLife() {
  const group = new THREE.Group();
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  const koiDefs = [
    [-35, 32, 5.0, 2.8, 0.16, 0.2],
    [-8, 39, 6.5, 3.4, -0.13, 1.4],
    [10, 38, 4.2, 2.8, 0.11, 2.1],
    [18, 40, 3.2, 2.2, -0.09, 2.7],
    [-40, 31, 3.8, 2.6, 0.14, 3.0],
    [0, 38, 4.5, 2.6, -0.12, 4.1],
    [-18, 38, 4.5, 2.8, 0.2, 4.8],
    [-45, 31, 3.2, 2.0, -0.17, 5.4],
  ];
  const koiCount = 28;
  const koi = new THREE.InstancedMesh(koiGeometry(), mats.koi, koiCount);
  koi.castShadow = true;
  koi.frustumCulled = false;
  const koiData = [];
  for (let i = 0; i < koiCount; i++) {
    const d = koiDefs[i % koiDefs.length];
    koiData.push({
      cx: d[0], cz: d[1], rx: d[2] * (0.55 + (i % 5) * 0.12), rz: d[3] * (0.55 + (i % 4) * 0.14),
      speed: d[4] * (0.7 + (i % 7) * 0.09), phase: d[5] + i * 1.73, depth: 0.10 + (i % 4) * 0.008,
      size: 0.7 + (i % 6) * 0.11,
    });
    const c = i % 5;
    if (c === 0) color.setHex(0xd86b2a);
    else if (c === 1) color.setHex(0xe8dcc9);
    else if (c === 2) color.setHex(0xc94a32);
    else if (c === 3) color.setHex(0x2f3433);
    else color.setHex(0xf0b064);
    koi.setColorAt(i, color);
  }
  koi.instanceColor.needsUpdate = true;
  group.add(koi);

  const duckDefs = [
    { cx: -10, cz: 43, rx: 3.4, rz: 2.1, speed: 0.055, phase: 0.3 },
    { cx: -13, cz: 45, rx: 2.6, rz: 1.7, speed: 0.048, phase: 2.4 },
    { cx: 18, cz: 40, rx: 2.2, rz: 1.5, speed: 0.07, phase: 4.1 },
    { cx: 10, cz: 42, rx: 2.5, rz: 1.7, speed: 0.06, phase: 1.2 },
  ];
  const ducks = new THREE.InstancedMesh(duckGeometry(), mats.duck, duckDefs.length);
  ducks.castShadow = true;
  ducks.frustumCulled = false;
  duckDefs.forEach((d, i) => {
    color.setHex(i % 2 === 0 ? 0xe7ddc9 : 0xcbbd9f);
    ducks.setColorAt(i, color);
  });
  ducks.instanceColor.needsUpdate = true;
  group.add(ducks);

  const petals = [];
  const petalZones = [
    [-6, 60, 17], [18, 58, 12], [-27, 58, 10], [60, 58, 12],
    [-52, 40, 9], [88, 56, 14], [-70, 34, 8],
  ];
  for (let i = 0; i < 90; i++) {
    const zone = petalZones[i % petalZones.length];
    petals.push({
      x: zone[0] + (Math.sin(i * 91.7) * 0.5 + 0.5 - 0.5) * zone[2],
      z: zone[1] + (Math.sin(i * 47.3 + 2) * 0.5 + 0.5 - 0.5) * zone[2],
      y: 0.5 + (Math.sin(i * 33.9) * 0.5 + 0.5) * 5.2,
      fall: 0.24 + (i % 7) * 0.035,
      sway: 0.4 + (i % 5) * 0.23,
      phase: i * 0.83,
      spin: 0.5 + (i % 6) * 0.2,
    });
  }
  const petalGeo = new THREE.CircleGeometry(0.085, 5);
  petalGeo.rotateX(-Math.PI / 2);
  const petalMesh = new THREE.InstancedMesh(petalGeo, mats.petal, petals.length);
  petalMesh.frustumCulled = false;
  petals.forEach((p, i) => {
    color.setHex(i % 4 === 0 ? 0xf5eef0 : i % 3 === 0 ? 0xe7b5bc : 0xf0cfd4);
    petalMesh.setColorAt(i, color);
  });
  petalMesh.instanceColor.needsUpdate = true;
  group.add(petalMesh);

  const birdCount = 16;
  const birds = new THREE.InstancedMesh(birdGeometry(), mats.bird, birdCount);
  birds.frustumCulled = false;
  const birdData = [];
  for (let i = 0; i < birdCount; i++) {
    birdData.push({
      cx: -10 + (i % 4) * 18,
      cz: 30 + ((i * 13) % 40),
      r: 26 + (i % 5) * 9,
      y: 24 + (i % 6) * 3.2,
      speed: 0.045 + (i % 5) * 0.008,
      phase: i * 0.94,
      size: 0.65 + (i % 4) * 0.17,
    });
  }
  group.add(birds);

  const rippleCount = 14;
  const rippleGeo = new THREE.TorusGeometry(1, 0.014, 3, 22);
  rippleGeo.rotateX(Math.PI / 2);
  const ripples = new THREE.InstancedMesh(rippleGeo, mats.ripple, rippleCount);
  ripples.frustumCulled = false;
  const rippleData = [];
  for (let i = 0; i < rippleCount; i++) {
    const d = koiDefs[i % koiDefs.length];
    rippleData.push({
      x: d[0] + Math.sin(i * 2.1) * d[2] * 0.55,
      z: d[1] + Math.cos(i * 1.7) * d[3] * 0.55,
      phase: i / rippleCount,
      speed: 0.09 + (i % 4) * 0.018,
      max: 1.8 + (i % 3) * 0.5,
    });
  }
  group.add(ripples);

  function update(time, dt) {
    koiData.forEach((k, i) => {
      const t = time * k.speed + k.phase;
      const x = k.cx + Math.cos(t) * k.rx;
      const z = k.cz + Math.sin(t) * k.rz;
      const dx = -Math.sin(t) * k.rx;
      const dz = Math.cos(t) * k.rz;
      dummy.position.set(x, k.depth + Math.sin(time * 1.4 + k.phase) * 0.018, z);
      dummy.rotation.set(0, Math.atan2(dx, dz), 0);
      dummy.scale.setScalar(k.size);
      dummy.updateMatrix();
      koi.setMatrixAt(i, dummy.matrix);
    });
    koi.instanceMatrix.needsUpdate = true;

    duckDefs.forEach((d, i) => {
      const t = time * d.speed + d.phase;
      const x = d.cx + Math.cos(t) * d.rx;
      const z = d.cz + Math.sin(t) * d.rz;
      const dx = -Math.sin(t) * d.rx;
      const dz = Math.cos(t) * d.rz;
      dummy.position.set(x, 0.27 + Math.sin(time * 1.6 + d.phase) * 0.025, z);
      dummy.rotation.set(0, Math.atan2(dx, dz), Math.sin(time * 1.1 + d.phase) * 0.05);
      dummy.scale.setScalar(0.94 + (i % 2) * 0.1);
      dummy.updateMatrix();
      ducks.setMatrixAt(i, dummy.matrix);
    });
    ducks.instanceMatrix.needsUpdate = true;

    petals.forEach((p, i) => {
      p.y -= p.fall * dt;
      p.x += Math.sin(time * 0.55 + p.phase) * p.sway * dt;
      p.z += Math.cos(time * 0.47 + p.phase * 1.3) * p.sway * 0.6 * dt;
      if (p.y < 0.22) {
        p.y = 5.4;
        p.x += Math.sin(i * 3.1 + time) * 1.8;
        p.z += Math.cos(i * 2.7 + time) * 1.8;
      }
      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set(0, time * p.spin + p.phase, Math.sin(time * 1.2 + p.phase) * 0.7);
      dummy.scale.setScalar(0.8 + (i % 4) * 0.1);
      dummy.updateMatrix();
      petalMesh.setMatrixAt(i, dummy.matrix);
    });
    petalMesh.instanceMatrix.needsUpdate = true;

    birdData.forEach((b, i) => {
      const t = time * b.speed + b.phase;
      const x = b.cx + Math.cos(t) * b.r;
      const z = b.cz + Math.sin(t) * b.r * 0.72;
      const y = b.y + Math.sin(time * 0.6 + b.phase) * 1.4;
      const dx = -Math.sin(t) * b.r;
      const dz = Math.cos(t) * b.r * 0.72;
      dummy.position.set(x, y, z);
      dummy.rotation.set(0, Math.atan2(dx, dz), Math.sin(time * 2.2 + i) * 0.14);
      dummy.scale.setScalar(b.size);
      dummy.updateMatrix();
      birds.setMatrixAt(i, dummy.matrix);
    });
    birds.instanceMatrix.needsUpdate = true;

    rippleData.forEach((r, i) => {
      const p = (time * r.speed + r.phase) % 1;
      const s = 0.2 + p * r.max;
      dummy.position.set(r.x, 0.15, r.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(s, 1, s);
      dummy.updateMatrix();
      ripples.setMatrixAt(i, dummy.matrix);
    });
    ripples.instanceMatrix.needsUpdate = true;
  }

  return { group, update };
}
