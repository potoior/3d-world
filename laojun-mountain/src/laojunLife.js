import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { sharedTextures } from './materials.js';
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

function paint(geo, color) {
  const p = geo.attributes.position;
  const arr = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    arr[i * 3] = color.r;
    arr[i * 3 + 1] = color.g;
    arr[i * 3 + 2] = color.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}

function hikerParts() {
  const clothes = [];
  const details = [];
  const coat = new THREE.Color(0xffffff);
  const dark = new THREE.Color(0x2f3230);
  const skin = new THREE.Color(0xc9a384);
  const packCol = new THREE.Color(0x4a3527);
  const body = new THREE.BoxGeometry(0.34, 0.62, 0.24);
  body.translate(0, 1.13, 0);
  clothes.push(paint(body, coat));
  const hat = new THREE.ConeGeometry(0.19, 0.3, 5);
  hat.translate(0, 1.78, 0);
  clothes.push(paint(hat, coat));
  const pack = new THREE.BoxGeometry(0.28, 0.4, 0.18);
  pack.translate(0, 1.18, -0.2);
  clothes.push(paint(pack, packCol));
  const head = new THREE.IcosahedronGeometry(0.155, 0);
  head.translate(0, 1.59, 0.01);
  details.push(paint(head, skin));
  for (const s of [-1, 1]) {
    const leg = new THREE.BoxGeometry(0.12, 0.52, 0.14);
    leg.translate(s * 0.08, 0.28, 0);
    details.push(paint(leg, dark));
    const arm = new THREE.BoxGeometry(0.1, 0.44, 0.11);
    arm.translate(s * 0.24, 1.15, 0.02);
    details.push(paint(arm, coat));
  }
  const pole = new THREE.CylinderGeometry(0.024, 0.024, 1.0, 4);
  pole.rotateZ(0.18);
  pole.translate(0.34, 0.7, 0.06);
  details.push(paint(pole, dark));
  return {
    clothes: mergeGeometries(clothes.map((g) => (g.index ? g.toNonIndexed() : g)), false),
    details: mergeGeometries(details.map((g) => (g.index ? g.toNonIndexed() : g)), false),
  };
}

function mistLife(group) {
  const rand = mulberry32(5561);
  const count = 46;
  const data = [];
  const geo = new THREE.PlaneGeometry(1, 1);
  const mat = new THREE.MeshBasicMaterial({
    map: sharedTextures.mistMap,
    color: 0xe9f0ef,
    transparent: true,
    opacity: 0.24,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: true,
    toneMapped: true,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  mesh.frustumCulled = false;
  mesh.renderOrder = 3;
  for (let i = 0; i < count; i++) {
    const lane = i % 3;
    data.push({
      x: -40 + rand() * 380 + lane * 40,
      y: 44 + rand() * 88 + lane * 18,
      z: 160 - rand() * 840,
      w: 120 + rand() * 300,
      h: 36 + rand() * 90,
      yaw: rand() * 1.4 - 0.4,
      phase: rand() * 6.28,
      drift: 1.5 + rand() * 3.4,
    });
  }
  group.add(mesh);
  return { mesh, data };
}

export function createLaojunLife(options) {
  const { ribbonAnchors = [], walkCurve, bridgeCurve } = options;
  const group = new THREE.Group();
  group.name = 'laojun-life';
  const rand = mulberry32(88421);
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  const ribbonGeo = new THREE.PlaneGeometry(0.3, 0.92);
  ribbonGeo.translate(0, -0.46, 0);
  const ribbonMat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: true, fog: true });
  const ribbons = new THREE.InstancedMesh(ribbonGeo, ribbonMat, ribbonAnchors.length);
  ribbons.name = 'prayer-ribbons';
  ribbons.frustumCulled = false;
  const palette = [0xb12f24, 0xd54832, 0xdca23a, 0xe8dcc2, 0x9d201c, 0xe0b450];
  ribbonAnchors.forEach((a, i) => {
    ribbons.setColorAt(i, color.setHex(palette[(a.kind + i) % palette.length]));
  });
  if (ribbons.instanceColor) ribbons.instanceColor.needsUpdate = true;
  group.add(ribbons);

  const parts = hikerParts();
  const clothesMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82 });
  const detailMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
  const total = 46;
  const clothes = new THREE.InstancedMesh(parts.clothes, clothesMat, total);
  const detail = new THREE.InstancedMesh(parts.details, detailMat, total);
  clothes.name = 'pilgrims-clothes';
  detail.name = 'pilgrims-detail';
  clothes.frustumCulled = false;
  detail.frustumCulled = false;
  clothes.castShadow = true;
  const coats = [0xb14838, 0x355d78, 0x476a4c, 0x82603f, 0x8e3a52, 0x4d4f55];
  const people = [];
  for (let i = 0; i < total; i++) {
    let mode = 'trail';
    if (i >= 26 && i < 36) mode = 'platform';
    else if (i >= 36 && i < 42) mode = 'walk';
    else if (i >= 42) mode = 'bridge';
    people.push({
      mode,
      t: (i / total + 0.07) % 1,
      lateral: (rand() - 0.5) * 1.4,
      speed: 0.0028 + rand() * 0.0034,
      scale: 0.9 + rand() * 0.14,
      phase: rand() * 6.28,
      x: 0, y: 0, z: 0, yaw: 0,
    });
    clothes.setColorAt(i, color.setHex(coats[i % coats.length]));
  }
  const angle = rand() * 6.28;
  for (let i = 26; i < 36; i++) {
    const a = ((i - 26) / 10) * Math.PI * 2 + angle;
    const p = platformsJinding();
    people[i].x = p.x + Math.cos(a) * (12 + (i % 3) * 3.2);
    people[i].z = p.z + Math.sin(a) * (12 + (i % 3) * 3.2);
    people[i].y = p.y + 0.15;
    people[i].yaw = -a;
  }
  for (let i = 36; i < 42; i++) {
    const p = walkCurve.getPointAt(0.12 + (i - 36) * 0.13);
    people[i].x = p.x;
    people[i].y = p.y + 0.2;
    people[i].z = p.z;
    people[i].yaw = i * 0.8;
  }
  for (let i = 42; i < total; i++) {
    const p = bridgeCurve.getPointAt(0.2 + (i - 42) * 0.18);
    people[i].x = p.x;
    people[i].y = p.y + 0.2;
    people[i].z = p.z;
    people[i].yaw = 0.5 + i;
  }
  clothes.instanceColor.needsUpdate = true;
  group.add(clothes, detail);

  const mist = mistLife(group);

  function poseTrail(p, time) {
    const t = (p.t + time * p.speed * 0.08) % 1;
    const i0 = Math.min(trailSamples.length - 1, Math.floor(t * (trailSamples.length - 1)));
    const s = trailSamples[i0];
    const s2 = trailSamples[Math.min(trailSamples.length - 1, i0 + 1)];
    let tx = s2.x - s.x;
    let tz = s2.z - s.z;
    const len = Math.hypot(tx, tz) || 1;
    tx /= len;
    tz /= len;
    const nx = -tz;
    const nz = tx;
    return {
      x: s.x + nx * p.lateral,
      y: s.y + 0.16,
      z: s.z + nz * p.lateral,
      yaw: Math.atan2(tx, tz),
    };
  }

  function update(time) {
    ribbonAnchors.forEach((a, i) => {
      const gust = Math.sin(time * 1.7 + i * 0.73) * 0.4 + Math.sin(time * 0.6 + a.z * 0.02) * 0.2;
      dummy.position.set(a.x, a.y, a.z);
      dummy.rotation.set(Math.sin(time * 2.0 + i) * 0.12, a.yaw + gust, Math.sin(time * 2.4 + i * 0.4) * 0.2);
      dummy.scale.set(0.82 + Math.sin(time * 2.7 + i) * 0.08, 0.95 + Math.sin(time * 1.9 + i * 0.3) * 0.1, 1);
      dummy.updateMatrix();
      ribbons.setMatrixAt(i, dummy.matrix);
    });
    ribbons.instanceMatrix.needsUpdate = true;

    people.forEach((p, i) => {
      let pos;
      if (p.mode === 'trail') pos = poseTrail(p, time);
      else pos = { x: p.x, y: p.y, z: p.z, yaw: p.yaw + Math.sin(time * 0.5 + p.phase) * 0.25 };
      const bob = Math.sin(time * 3.4 + p.phase) * 0.025;
      dummy.position.set(pos.x, pos.y + bob, pos.z);
      dummy.rotation.set(0, pos.yaw, Math.sin(time * 3.4 + p.phase) * 0.02);
      dummy.scale.setScalar(p.scale);
      dummy.updateMatrix();
      clothes.setMatrixAt(i, dummy.matrix);
      detail.setMatrixAt(i, dummy.matrix);
    });
    clothes.instanceMatrix.needsUpdate = true;
    detail.instanceMatrix.needsUpdate = true;

    mist.data.forEach((m, i) => {
      dummy.position.set(
        m.x + Math.sin(time * 0.018 * m.drift + m.phase) * 26,
        m.y + Math.sin(time * 0.05 + m.phase) * 1.6,
        m.z + Math.cos(time * 0.012 * m.drift + m.phase) * 18
      );
      dummy.rotation.set(-0.2, m.yaw, 0);
      dummy.scale.set(m.w, m.h, 1);
      dummy.updateMatrix();
      mist.mesh.setMatrixAt(i, dummy.matrix);
    });
    mist.mesh.instanceMatrix.needsUpdate = true;
  }

  update(0);
  return { group, update, ribbons, clothes, detail, mist };
}

function platformsJinding() {
  return { x: -8, y: 226.0, z: -120 };
}
