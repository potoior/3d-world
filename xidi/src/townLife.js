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

function duckGeometry() {
  const parts = [];
  const body = new THREE.SphereGeometry(0.34, 8, 6);
  body.scale(1.35, 0.72, 0.82);
  body.translate(0, 0.18, 0);
  parts.push(colored(body, 0xf3f1e8));
  const neck = new THREE.CylinderGeometry(0.09, 0.13, 0.34, 6);
  neck.rotateX(-0.3);
  neck.translate(0, 0.48, 0.18);
  parts.push(colored(neck, 0xf3f1e8));
  const head = new THREE.SphereGeometry(0.14, 7, 6);
  head.translate(0, 0.66, 0.27);
  parts.push(colored(head, 0x4a6b52));
  const beak = new THREE.ConeGeometry(0.075, 0.22, 5);
  beak.rotateX(Math.PI / 2);
  beak.translate(0, 0.64, 0.46);
  parts.push(colored(beak, 0xd9a640));
  const tail = new THREE.ConeGeometry(0.13, 0.3, 5);
  tail.rotateX(-Math.PI / 2.4);
  tail.translate(0, 0.2, -0.38);
  parts.push(colored(tail, 0xe8e5da));
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

function rippleGeometry() {
  const g = new THREE.RingGeometry(0.52, 0.68, 18);
  g.rotateX(-Math.PI / 2);
  return g;
}

function smokeGeometry() {
  const g = new THREE.IcosahedronGeometry(0.62, 1);
  g.scale(1.0, 0.85, 1.0);
  return g;
}

const PATHS = [
  { pts: [[-31, 0], [-31, 33], [-24, 38], [8, 38], [17, 33], [17, 0], [8, -4], [-22, -4], [-31, 0]], speed: 0.9 },
  { pts: [[42, -146], [42, 136]], speed: 1.15 },
  { pts: [[61, 136], [61, -146]], speed: 1.05 },
  { pts: [[-112, 70.5], [38, 70.5]], speed: 0.95 },
  { pts: [[-70, -94], [-70, 52]], speed: 0.9 },
  { pts: [[-18, 82], [-18, 138], [16, 138], [16, 82]], speed: 0.85 },
  { pts: [[-144, -158], [132, -158]], speed: 0.8 },
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

const DUCK_AREAS = [
  { cx: -8, cz: 15, rx: 10, rz: 6, speed: 0.11, count: 7, seed: 11 },
  { cx: 12, cz: -196, rx: 78, rz: 24, speed: 0.045, count: 9, seed: 37 },
];

const SMOKE_COLUMNS = [
  [-28, 24, 5.6], [18, 24, 5.9], [66, 40, 6.2], [-70, 20, 5.9], [-20, 120, 5.8],
];

export function createTownLife({ lanternSpots = [] }) {
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

  const people = new THREE.InstancedMesh(personGeometry(), mats.visitor, 22);
  people.frustumCulled = false;
  people.castShadow = true;
  const personData = [];
  const paths = PATHS.map((p) => ({ ...pathData(p), speed: p.speed }));
  for (let i = 0; i < 22; i++) {
    const path = paths[i % paths.length];
    const tint = 0.82 + (i % 5) * 0.07;
    color.setRGB(tint, tint * (0.94 + (i % 4) * 0.015), tint * (0.86 + (i % 3) * 0.04));
    people.setColorAt(i, color);
    personData.push({
      path,
      offset: (i / 22) * path.total + (i % 4) * 2.7,
      speed: 0.78 + (i % 6) * 0.09,
      scale: 0.9 + (i % 5) * 0.045,
      phase: i * 0.71,
    });
  }
  people.instanceColor.needsUpdate = true;
  group.add(people);

  const painters = new THREE.InstancedMesh(personGeometry(), mats.visitor, 5);
  painters.frustumCulled = false;
  painters.castShadow = true;
  const painterData = [
    [-17.4, -1.1, 0.25], [2.6, -2.1, -0.2], [12.3, 21.2, 2.75],
    [-0.6, -155.1, 0.1], [41.3, -155.2, -0.15],
  ];
  painterData.forEach((p, i) => {
    color.setHex(i % 2 === 0 ? 0xd8ccb4 : 0x9fb0b4);
    painters.setColorAt(i, color);
  });
  painters.instanceColor.needsUpdate = true;
  group.add(painters);

  const duckCount = DUCK_AREAS.reduce((n, a) => n + a.count, 0);
  const ducks = new THREE.InstancedMesh(duckGeometry(), mats.duck, duckCount);
  ducks.frustumCulled = false;
  ducks.castShadow = false;
  const duckData = [];
  let di = 0;
  for (const area of DUCK_AREAS) {
    for (let i = 0; i < area.count; i++) {
      color.setHex(i % 4 === 0 ? 0xe8e2cf : i % 4 === 1 ? 0x8d7a5c : 0xf3f1e8);
      ducks.setColorAt(di, color);
      duckData.push({
        area,
        angle: (i / area.count) * Math.PI * 2 + area.seed,
        r: 0.35 + ((i * 0.37) % 0.6),
        speed: area.speed * (0.8 + (i % 4) * 0.12),
        phase: i * 1.3 + area.seed,
        scale: 0.8 + (i % 4) * 0.09,
      });
      di++;
    }
  }
  ducks.instanceColor.needsUpdate = true;
  group.add(ducks);

  const birds = new THREE.InstancedMesh(birdGeometry(), mats.bird, 18);
  birds.frustumCulled = false;
  const birdData = [];
  for (let i = 0; i < 18; i++) {
    birdData.push({
      cx: (i % 5) * 24 - 58,
      cz: 10 + (i % 6) * 20,
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
    [-110, -157, 24], [80, -158, 22],
  ];
  for (let i = 0; i < leafCount; i++) {
    const z0 = zones[i % zones.length];
    color.setHex(i % 5 === 0 ? 0xc7d27a : i % 4 === 0 ? 0xe0b15e : 0x9fbb63);
    leaves.setColorAt(i, color);
    leafData.push({
      x: z0[0] + Math.sin(i * 91.7) * z0[2] * 0.5,
      z: z0[1] + Math.sin(i * 47.3 + 2) * z0[2] * 0.5,
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
    const pond = i % 3 !== 2;
    color.setHex(i % 4 === 0 ? 0xd8a64f : i % 3 === 0 ? 0x89a95c : 0xe7d38a);
    flow.setColorAt(i, color);
    flowData.push({
      pond,
      cx: pond ? -8 : 12,
      cz: pond ? 15 : -196,
      rx: pond ? 8.5 : 72,
      rz: pond ? 4.8 : 22,
      angle: i * 1.37,
      speed: (pond ? 0.16 : 0.035) * (0.7 + (i % 4) * 0.16),
      rr: 0.35 + ((i * 0.41) % 0.62),
      phase: i * 1.7,
    });
  }
  flow.instanceColor.needsUpdate = true;
  group.add(flow);

  const rippleCount = 22;
  const ripples = new THREE.InstancedMesh(rippleGeometry(), mats.ripple, rippleCount);
  ripples.frustumCulled = false;
  ripples.renderOrder = 2;
  const rippleData = [];
  for (let i = 0; i < rippleCount; i++) {
    const pond = i % 3 !== 2;
    rippleData.push({
      cx: pond ? -8 : 12,
      cz: pond ? 15 : -196,
      rx: pond ? 9.5 : 76,
      rz: pond ? 5.4 : 23,
      angle: i * 0.91,
      rr: 0.25 + ((i * 0.53) % 0.7),
      phase: i * 0.37,
      speed: 0.32 + (i % 4) * 0.05,
    });
  }
  group.add(ripples);

  const smokePerColumn = 7;
  const smokeCount = SMOKE_COLUMNS.length * smokePerColumn;
  const smoke = new THREE.InstancedMesh(smokeGeometry(), mats.smoke, smokeCount);
  smoke.frustumCulled = false;
  smoke.renderOrder = 4;
  const smokeData = [];
  SMOKE_COLUMNS.forEach(([x, z, y], ci) => {
    for (let i = 0; i < smokePerColumn; i++) {
      smokeData.push({
        x, z, baseY: y,
        phase: (i / smokePerColumn + ci * 0.17) % 1,
        drift: ci * 1.3 + i * 0.8,
        scale: 0.65 + (i % 3) * 0.2,
      });
    }
  });
  group.add(smoke);

  function update(time, dt) {
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

    painterData.forEach((p, i) => {
      dummy.position.set(p[0], 0.02, p[1]);
      dummy.rotation.set(0, p[2], Math.sin(time * 0.35 + i) * 0.018);
      dummy.scale.setScalar(0.94 + (i % 2) * 0.06);
      dummy.updateMatrix();
      painters.setMatrixAt(i, dummy.matrix);
    });
    painters.instanceMatrix.needsUpdate = true;

    duckData.forEach((d, i) => {
      d.angle += d.speed * dt;
      const a = d.angle;
      const x = d.area.cx + Math.cos(a) * d.area.rx * d.r;
      const z = d.area.cz + Math.sin(a) * d.area.rz * d.r;
      const dx = -Math.sin(a) * d.area.rx;
      const dz = Math.cos(a) * d.area.rz;
      dummy.position.set(x, 0.0 + Math.sin(time * 2.1 + d.phase) * 0.025, z);
      dummy.rotation.set(0, Math.atan2(dx, dz), Math.sin(time * 1.3 + d.phase) * 0.05);
      dummy.scale.setScalar(d.scale);
      dummy.updateMatrix();
      ducks.setMatrixAt(i, dummy.matrix);
    });
    ducks.instanceMatrix.needsUpdate = true;

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
      p.angle += p.speed * dt;
      const x = p.cx + Math.cos(p.angle) * p.rx * p.rr;
      const z = p.cz + Math.sin(p.angle) * p.rz * p.rr;
      dummy.position.set(x + Math.sin(time * 0.8 + p.phase) * 0.12, -0.025, z);
      dummy.rotation.set(0, time * 0.35 + p.phase, 0);
      dummy.scale.setScalar(0.9);
      dummy.updateMatrix();
      flow.setMatrixAt(i, dummy.matrix);
    });
    flow.instanceMatrix.needsUpdate = true;

    rippleData.forEach((p, i) => {
      const cycle = (time * p.speed + p.phase) % 1;
      const x = p.cx + Math.cos(p.angle) * p.rx * p.rr;
      const z = p.cz + Math.sin(p.angle) * p.rz * p.rr;
      dummy.position.set(x, -0.035, z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(0.6 + cycle * 2.6);
      dummy.updateMatrix();
      ripples.setMatrixAt(i, dummy.matrix);
    });
    ripples.instanceMatrix.needsUpdate = true;

    smokeData.forEach((s, i) => {
      const t = (time * 0.12 + s.phase) % 1;
      dummy.position.set(
        s.x + Math.sin(t * 5.4 + s.drift) * (0.3 + t * 1.5),
        s.baseY + t * 8.2,
        s.z + Math.cos(t * 4.1 + s.drift) * (0.2 + t * 1.1)
      );
      dummy.rotation.set(0, t * 2.4 + s.drift, 0);
      dummy.scale.setScalar(s.scale * (1 + t * 2.3));
      dummy.updateMatrix();
      smoke.setMatrixAt(i, dummy.matrix);
    });
    smoke.instanceMatrix.needsUpdate = true;
  }

  return { group, update, glowMaterial: mats.glow };
}
