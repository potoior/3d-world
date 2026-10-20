import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mats } from './materials.js';

function colored(geo, hex) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const c = new THREE.Color(hex);
  const count = g.attributes.position.count;
  const arr = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(arr, 3));
  return g;
}

function personGeometry() {
  const parts = [];
  const torso = new THREE.CylinderGeometry(0.2, 0.25, 0.78, 6);
  torso.translate(0, 0.96, 0);
  parts.push(colored(torso, 0xffffff));
  const head = new THREE.SphereGeometry(0.16, 7, 6);
  head.translate(0, 1.55, 0);
  parts.push(colored(head, 0xd8ac86));
  for (const sx of [-1, 1]) {
    const leg = new THREE.BoxGeometry(0.14, 0.58, 0.15);
    leg.translate(sx * 0.11, 0.29, 0);
    parts.push(colored(leg, 0x3a3d44));
    const arm = new THREE.BoxGeometry(0.1, 0.54, 0.11);
    arm.rotateZ(sx * 0.08);
    arm.translate(sx * 0.29, 1.0, 0);
    parts.push(colored(arm, 0xffffff));
  }
  const hat = new THREE.ConeGeometry(0.25, 0.16, 8);
  hat.translate(0, 1.7, 0);
  parts.push(colored(hat, 0x8d6c45));
  return mergeGeometries(parts, false);
}

function horseGeometry() {
  const parts = [];
  const body = new THREE.SphereGeometry(0.55, 8, 6);
  body.scale(1.45, 0.82, 0.62);
  body.translate(0, 1.12, 0);
  parts.push(body);
  const neck = new THREE.CylinderGeometry(0.18, 0.28, 0.8, 7);
  neck.rotateX(-0.6);
  neck.translate(0, 1.55, 0.48);
  parts.push(neck);
  const head = new THREE.BoxGeometry(0.3, 0.34, 0.62);
  head.rotateX(-0.2);
  head.translate(0, 1.86, 0.86);
  parts.push(head);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const leg = new THREE.CylinderGeometry(0.075, 0.09, 0.95, 6);
      leg.translate(sx * 0.38, 0.47, sz * 0.34);
      parts.push(leg);
    }
    const ear = new THREE.ConeGeometry(0.07, 0.22, 5);
    ear.translate(sx * 0.1, 2.08, 0.8);
    parts.push(ear);
  }
  const tail = new THREE.ConeGeometry(0.12, 0.75, 5);
  tail.rotateX(0.7);
  tail.translate(0, 1.18, -0.72);
  parts.push(tail);
  return mergeGeometries(parts, false);
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

function lanternGeometry() {
  const body = new THREE.SphereGeometry(0.24, 9, 7);
  body.scale(1, 1.28, 1);
  const tassel = new THREE.ConeGeometry(0.07, 0.34, 5);
  tassel.rotateX(Math.PI);
  tassel.translate(0, -0.42, 0);
  return mergeGeometries([body, tassel], false);
}

function leafGeometry() {
  const g = new THREE.CircleGeometry(0.11, 5);
  g.rotateX(-Math.PI / 2);
  return g;
}

const PATHS = [
  { pts: [[-28, 5], [-28, 33], [23, 33], [23, 5]], speed: 1.0 },
  { pts: [[42, -146], [42, 136]], speed: 1.15 },
  { pts: [[61, 136], [61, -146]], speed: 1.05 },
  { pts: [[-112, 70.5], [38, 70.5]], speed: 0.95 },
  { pts: [[-70, -94], [-70, 52]], speed: 0.9 },
  { pts: [[-18, 82], [-18, 138], [16, 138], [16, 82]], speed: 0.85 },
];

function pathData(path) {
  const pts = path.pts;
  const segs = [];
  let total = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const dx = pts[i + 1][0] - pts[i][0];
    const dz = pts[i + 1][1] - pts[i][1];
    const len = Math.hypot(dx, dz);
    segs.push({ ax: pts[i][0], az: pts[i][1], dx, dz, len, start: total });
    total += len;
  }
  return { segs, total };
}

export function createTownLife({ lanternSpots = [], waterwheel = null }) {
  const group = new THREE.Group();
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  const lant = new THREE.InstancedMesh(lanternGeometry(), mats.lanternRed, lanternSpots.length);
  lant.frustumCulled = false;
  lant.castShadow = false;
  const glow = new THREE.InstancedMesh(new THREE.SphereGeometry(0.55, 8, 6), mats.glow, lanternSpots.length);
  glow.frustumCulled = false;
  glow.renderOrder = 3;
  group.add(glow);
  group.add(lant);

  const people = new THREE.InstancedMesh(personGeometry(), mats.visitor, 20);
  people.frustumCulled = false;
  people.castShadow = true;
  const personData = [];
  const paths = PATHS.map((p) => ({ ...pathData(p), speed: p.speed }));
  for (let i = 0; i < 20; i++) {
    const path = paths[i % paths.length];
    const tint = 0.86 + (i % 5) * 0.06;
    color.setRGB(tint, tint * (0.92 + (i % 4) * 0.02), tint * (0.88 + (i % 3) * 0.04));
    people.setColorAt(i, color);
    personData.push({
      path,
      offset: (i / 20) * path.total + (i % 4) * 2.7,
      speed: 0.82 + (i % 6) * 0.09,
      scale: 0.9 + (i % 5) * 0.045,
      phase: i * 0.71,
    });
  }
  people.instanceColor.needsUpdate = true;
  group.add(people);

  const horses = new THREE.InstancedMesh(horseGeometry(), mats.horse, 5);
  horses.frustumCulled = false;
  horses.castShadow = true;
  const horseData = [
    [7, -5.5, 0.7, 0.0],
    [-4, 32.5, 2.3, 0.9],
    [19, 34.5, -1.9, 1.7],
    [27, 2.5, 2.0, 2.4],
    [-25, -4.5, 0.2, 3.2],
  ];
  horseData.forEach((h, i) => {
    color.setHex(i % 3 === 0 ? 0x4a3022 : i % 3 === 1 ? 0x74513a : 0x8a7a66);
    horses.setColorAt(i, color);
  });
  horses.instanceColor.needsUpdate = true;
  group.add(horses);

  const birds = new THREE.InstancedMesh(birdGeometry(), mats.bird, 18);
  birds.frustumCulled = false;
  const birdData = [];
  for (let i = 0; i < 18; i++) {
    birdData.push({
      cx: (i % 5) * 22 - 55,
      cz: 12 + (i % 6) * 20,
      r: 24 + (i % 5) * 10,
      y: 22 + (i % 7) * 2.7,
      speed: 0.07 + (i % 5) * 0.012,
      phase: i * 0.83,
      scale: 0.7 + (i % 4) * 0.16,
    });
  }
  group.add(birds);

  const leafCount = 110;
  const leaves = new THREE.InstancedMesh(leafGeometry(), mats.leaf, leafCount);
  leaves.frustumCulled = false;
  const leafData = [];
  const zones = [
    [-30, 20, 30], [44, -30, 18], [60, 90, 16], [-62, -40, 18],
    [12, 112, 22], [-95, 95, 18], [72, 120, 20], [-45, 50, 16],
  ];
  for (let i = 0; i < leafCount; i++) {
    const z0 = zones[i % zones.length];
    color.setHex(i % 5 === 0 ? 0xc7d27a : i % 4 === 0 ? 0xe0b15e : 0x9fbb63);
    leaves.setColorAt(i, color);
    leafData.push({
      x: z0[0] + (Math.sin(i * 91.7) * 0.5 + 0.5 - 0.5) * z0[2],
      z: z0[1] + (Math.sin(i * 47.3 + 2) * 0.5 + 0.5 - 0.5) * z0[2],
      y: 0.4 + (Math.sin(i * 33.9) * 0.5 + 0.5) * 7.4,
      fall: 0.2 + (i % 7) * 0.03,
      sway: 0.3 + (i % 5) * 0.16,
      phase: i * 0.83,
      spin: 0.5 + (i % 6) * 0.17,
      scale: 0.7 + (i % 4) * 0.12,
    });
  }
  leaves.instanceColor.needsUpdate = true;
  group.add(leaves);

  const flowCount = 54;
  const flow = new THREE.InstancedMesh(leafGeometry(), mats.leaf, flowCount);
  flow.frustumCulled = false;
  const flowData = [];
  for (let i = 0; i < flowCount; i++) {
    const main = i % 3 !== 2;
    color.setHex(i % 4 === 0 ? 0xd8a64f : i % 3 === 0 ? 0x89a95c : 0xe7d38a);
    flow.setColorAt(i, color);
    flowData.push({
      main,
      x: main ? 49 + (i % 6) * 1.1 : -112 + (i * 7.3) % 154,
      z: main ? -160 + (i * 13.7) % 300 : 60 + (i % 4) * 1.1,
      speed: main ? 0.55 + (i % 5) * 0.09 : 0.36 + (i % 4) * 0.07,
      phase: i * 1.7,
    });
  }
  flow.instanceColor.needsUpdate = true;
  group.add(flow);

  function update(time, dt) {
    if (waterwheel) waterwheel.rotation.x -= dt * 0.52;

    lanternSpots.forEach((s, i) => {
      const swing = Math.sin(time * 1.05 + s.phase) * 0.17;
      const ox = Math.sin(swing) * 0.52;
      const oy = -Math.cos(swing) * 0.52;
      dummy.position.set(s.x + ox, s.y + oy, s.z);
      dummy.rotation.set(swing * 0.38, 0, swing);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      lant.setMatrixAt(i, dummy.matrix);
      dummy.position.set(s.x + ox, s.y + oy - 0.05, s.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(1.15);
      dummy.updateMatrix();
      glow.setMatrixAt(i, dummy.matrix);
    });
    lant.instanceMatrix.needsUpdate = true;
    glow.instanceMatrix.needsUpdate = true;

    personData.forEach((p, i) => {
      const dist = (time * p.speed + p.offset) % p.path.total;
      let seg = p.path.segs[0];
      for (const s of p.path.segs) {
        if (dist >= s.start && dist <= s.start + s.len) {
          seg = s;
          break;
        }
      }
      const t = Math.min(1, Math.max(0, (dist - seg.start) / Math.max(0.001, seg.len)));
      const x = seg.ax + seg.dx * t;
      const z = seg.az + seg.dz * t;
      dummy.position.set(x, 0.02 + Math.abs(Math.sin(time * 6 + p.phase)) * 0.035, z);
      dummy.rotation.set(0, Math.atan2(seg.dx, seg.dz), 0);
      dummy.scale.setScalar(p.scale);
      dummy.updateMatrix();
      people.setMatrixAt(i, dummy.matrix);
    });
    people.instanceMatrix.needsUpdate = true;

    horseData.forEach((h, i) => {
      dummy.position.set(h[0], Math.sin(time * 0.8 + h[3]) * 0.025, h[1]);
      dummy.rotation.set(0, h[2], 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      horses.setMatrixAt(i, dummy.matrix);
    });
    horses.instanceMatrix.needsUpdate = true;

    birdData.forEach((b, i) => {
      const t = time * b.speed + b.phase;
      const x = b.cx + Math.cos(t) * b.r;
      const z = b.cz + Math.sin(t) * b.r * 0.72;
      const y = b.y + Math.sin(time * 0.6 + b.phase) * 1.3;
      const dx = -Math.sin(t) * b.r;
      const dz = Math.cos(t) * b.r * 0.72;
      dummy.position.set(x, y, z);
      dummy.rotation.set(0, Math.atan2(dx, dz), Math.sin(time * 2.2 + i) * 0.16);
      dummy.scale.setScalar(b.scale);
      dummy.updateMatrix();
      birds.setMatrixAt(i, dummy.matrix);
    });
    birds.instanceMatrix.needsUpdate = true;

    leafData.forEach((p, i) => {
      p.y -= p.fall * dt;
      p.x += Math.sin(time * 0.55 + p.phase) * p.sway * dt;
      p.z += Math.cos(time * 0.47 + p.phase * 1.3) * p.sway * 0.6 * dt;
      if (p.y < 0.18) {
        p.y = 7.6;
        p.x += Math.sin(i * 3.1 + time) * 1.4;
        p.z += Math.cos(i * 2.7 + time) * 1.4;
      }
      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set(Math.sin(time * 1.2 + p.phase) * 0.5, time * p.spin + p.phase, Math.sin(time * 1.7 + p.phase) * 0.7);
      dummy.scale.setScalar(p.scale);
      dummy.updateMatrix();
      leaves.setMatrixAt(i, dummy.matrix);
    });
    leaves.instanceMatrix.needsUpdate = true;

    flowData.forEach((p, i) => {
      if (p.main) {
        p.z += p.speed * dt * 2.4;
        if (p.z > 146) p.z = -162;
      } else {
        p.x += p.speed * dt * 2.4;
        if (p.x > 46) p.x = -114;
      }
      dummy.position.set(p.x + Math.sin(time * 0.8 + p.phase) * 0.16, -0.025, p.z);
      dummy.rotation.set(0, time * 0.35 + p.phase, 0);
      dummy.scale.setScalar(0.9);
      dummy.updateMatrix();
      flow.setMatrixAt(i, dummy.matrix);
    });
    flow.instanceMatrix.needsUpdate = true;
  }

  return { group, update, glowMaterial: mats.glow };
}
