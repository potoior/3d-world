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

function cartGeometry() {
  const parts = [];
  const bed = new THREE.BoxGeometry(1.7, 0.28, 2.9);
  bed.translate(0, 0.95, 0);
  parts.push(colored(bed, 0x7b5838));
  const rail = new THREE.BoxGeometry(1.75, 0.5, 0.12);
  rail.translate(0, 1.25, 1.42);
  parts.push(colored(rail, 0x6a492e));
  const rail2 = rail.clone();
  rail2.translate(0, 0, -2.84);
  parts.push(colored(rail2, 0x6a492e));
  for (const sx of [-1, 1]) {
    const side = new THREE.BoxGeometry(0.1, 0.42, 2.8);
    side.translate(sx * 0.82, 1.2, 0);
    parts.push(colored(side, 0x6a492e));
  }
  const canopy = new THREE.CylinderGeometry(0.95, 1.05, 1.5, 8, 1, true, 0, Math.PI);
  canopy.rotateZ(Math.PI / 2);
  canopy.rotateY(Math.PI / 2);
  canopy.translate(0, 1.62, -0.1);
  parts.push(colored(canopy, 0xcfc2a2));
  const shafts = new THREE.BoxGeometry(0.09, 0.09, 2.1);
  shafts.translate(-0.42, 0.86, 2.3);
  parts.push(colored(shafts, 0x5b422c));
  const shafts2 = shafts.clone();
  shafts2.translate(0.84, 0, 0);
  parts.push(colored(shafts2, 0x5b422c));
  const cargo = new THREE.BoxGeometry(0.62, 0.55, 0.9);
  cargo.translate(-0.45, 1.38, -0.5);
  parts.push(colored(cargo, 0xb59a6a));
  const cargo2 = new THREE.BoxGeometry(0.58, 0.44, 0.75);
  cargo2.rotateY(0.2);
  cargo2.translate(0.42, 1.32, -0.35);
  parts.push(colored(cargo2, 0x8e764e));
  const barrel = new THREE.CylinderGeometry(0.24, 0.26, 0.62, 8);
  barrel.rotateZ(Math.PI / 2);
  barrel.translate(0, 1.4, 0.64);
  parts.push(colored(barrel, 0x7d5c39));
  const driver = new THREE.CylinderGeometry(0.17, 0.21, 0.68, 6);
  driver.translate(0, 1.47, 1.05);
  parts.push(colored(driver, 0x47606b));
  const dHead = new THREE.SphereGeometry(0.14, 6, 5);
  dHead.translate(0, 1.92, 1.05);
  parts.push(colored(dHead, 0xd8ac86));
  const dHat = new THREE.ConeGeometry(0.22, 0.13, 7);
  dHat.translate(0, 2.06, 1.05);
  parts.push(colored(dHat, 0x8d6c45));
  for (const sx of [-1, 1]) {
    const arm = new THREE.BoxGeometry(0.08, 0.42, 0.09);
    arm.rotateX(-0.5);
    arm.translate(sx * 0.22, 1.62, 1.32);
    parts.push(colored(arm, 0x47606b));
  }
  const mule = new THREE.SphereGeometry(0.45, 7, 6);
  mule.scale(0.85, 0.8, 1.7);
  mule.translate(0, 1.05, 3.2);
  parts.push(colored(mule, 0x76614a));
  const neck = new THREE.CylinderGeometry(0.16, 0.22, 0.72, 6);
  neck.rotateX(-0.55);
  neck.translate(0, 1.45, 3.75);
  parts.push(colored(neck, 0x6d5841));
  const head = new THREE.BoxGeometry(0.24, 0.28, 0.55);
  head.translate(0, 1.72, 4.05);
  parts.push(colored(head, 0x76614a));
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const leg = new THREE.CylinderGeometry(0.06, 0.075, 0.9, 5);
      leg.translate(sx * 0.3, 0.45, 3.2 + sz * 0.55);
      parts.push(colored(leg, 0x5a4938));
    }
  }
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

function wheelGeometry() {
  const parts = [];
  const tire = new THREE.CylinderGeometry(0.56, 0.56, 0.13, 14);
  tire.rotateZ(Math.PI / 2);
  parts.push(colored(tire, 0x3f2e20));
  const hub = new THREE.CylinderGeometry(0.14, 0.14, 0.2, 8);
  hub.rotateZ(Math.PI / 2);
  parts.push(colored(hub, 0x59422d));
  for (let i = 0; i < 4; i++) {
    const spoke = new THREE.BoxGeometry(0.085, 1.02, 0.07);
    spoke.rotateX((i / 4) * Math.PI);
    parts.push(colored(spoke, 0x58402a));
  }
  return mergeGeometries(parts, false);
}

function lanternGeometry() {
  const parts = [];
  const body = new THREE.SphereGeometry(0.24, 9, 7);
  body.scale(1, 1.28, 1);
  parts.push(body);
  const capBottom = new THREE.CylinderGeometry(0.15, 0.1, 0.07, 8);
  capBottom.translate(0, -0.28, 0);
  parts.push(capBottom);
  const tassel = new THREE.ConeGeometry(0.07, 0.36, 5);
  tassel.rotateX(Math.PI);
  tassel.translate(0, -0.45, 0);
  parts.push(tassel);
  for (let i = 0; i < 2; i++) {
    const a = (i / 2) * Math.PI * 2;
    const strand = new THREE.CylinderGeometry(0.014, 0.014, 0.38, 4);
    strand.translate(Math.cos(a) * 0.1, -0.68, Math.sin(a) * 0.1);
    parts.push(strand);
  }
  const knot = new THREE.SphereGeometry(0.045, 5, 4);
  knot.translate(0, -0.62, 0);
  parts.push(knot);
  return mergeGeometries(parts, false);
}

const PATHS = [
  { pts: [[-4, -128], [-4, 132]], speed: 1.0 },
  { pts: [[5, 132], [5, -128]], speed: 1.1 },
  { pts: [[-122, -4], [122, -4]], speed: 0.95 },
  { pts: [[122, 5], [-122, 5]], speed: 1.05 },
  { pts: [[-72, -124], [-72, 124]], speed: 0.88 },
  { pts: [[72, 124], [72, -124]], speed: 0.92 },
  { pts: [[-118, 76], [118, 76]], speed: 0.86 },
  { pts: [[-118, -76], [118, -76]], speed: 0.9 },
  { pts: [[-24, 44], [24, 44], [24, 62], [-24, 62], [-24, 44]], speed: 0.78 },
  { pts: [[13, -26], [13, 26]], speed: 0.72 },
];

const CART_PATHS = [
  { pts: [[-10, -104], [-10, 104]], speed: 0.48 },
  { pts: [[10, 104], [10, -104]], speed: 0.44 },
  { pts: [[-104, -10], [104, -10]], speed: 0.5 },
  { pts: [[104, 10], [-104, 10]], speed: 0.46 },
  { pts: [[-62, -94], [-62, 94]], speed: 0.38 },
  { pts: [[78, 94], [78, -94]], speed: 0.41 },
];

function pathData(path) {
  const segs = [];
  let total = 0;
  for (let i = 0; i < path.pts.length - 1; i++) {
    const a = path.pts[i];
    const b = path.pts[i + 1];
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const len = Math.hypot(dx, dz);
    segs.push({ ax: a[0], az: a[1], dx, dz, len, start: total });
    total += len;
  }
  return { segs, total };
}

export function createTownLife({ lanternSpots = [], chimneys = [] }) {
  const group = new THREE.Group();
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  const lant = new THREE.InstancedMesh(lanternGeometry(), mats.lanternRed, lanternSpots.length);
  lant.frustumCulled = false;
  const glow = new THREE.InstancedMesh(new THREE.SphereGeometry(0.55, 8, 6), mats.glow, lanternSpots.length);
  glow.frustumCulled = false;
  glow.renderOrder = 3;
  group.add(glow, lant);

  const people = new THREE.InstancedMesh(personGeometry(), mats.visitor, 30);
  people.frustumCulled = false;
  people.castShadow = true;
  const personData = [];
  const paths = PATHS.map((p) => ({ ...pathData(p), speed: p.speed }));
  for (let i = 0; i < 30; i++) {
    const path = paths[i % paths.length];
    const tint = 0.82 + (i % 6) * 0.058;
    color.setRGB(tint, tint * (0.9 + (i % 4) * 0.025), tint * (0.85 + (i % 3) * 0.05));
    people.setColorAt(i, color);
    personData.push({
      path,
      offset: (i / 30) * path.total + (i % 5) * 2.5,
      speed: 0.74 + (i % 6) * 0.07,
      scale: 0.88 + (i % 5) * 0.045,
      phase: i * 0.71,
    });
  }
  people.instanceColor.needsUpdate = true;
  group.add(people);

  const carts = new THREE.InstancedMesh(cartGeometry(), mats.visitor, 6);
  carts.frustumCulled = false;
  carts.castShadow = true;
  const cartData = [];
  const cartPaths = CART_PATHS.map((p) => ({ ...pathData(p), speed: p.speed }));
  for (let i = 0; i < 6; i++) {
    const path = cartPaths[i % cartPaths.length];
    const tint = 0.82 + (i % 3) * 0.06;
    color.setRGB(tint, tint * 0.92, tint * 0.86);
    carts.setColorAt(i, color);
    cartData.push({
      path,
      offset: (i / 6) * path.total + (i % 3) * 13,
      speed: path.speed,
      phase: i * 1.37,
    });
  }
  carts.instanceColor.needsUpdate = true;
  group.add(carts);

  const wheels = new THREE.InstancedMesh(wheelGeometry(), mats.visitor, cartData.length * 4);
  wheels.frustumCulled = false;
  wheels.castShadow = true;
  group.add(wheels);
  const baseMatrix = new THREE.Matrix4();
  const wheelMatrix = new THREE.Matrix4();

  const birds = new THREE.InstancedMesh(birdGeometry(), mats.bird, 18);
  birds.frustumCulled = false;
  const birdData = [];
  for (let i = 0; i < 18; i++) {
    birdData.push({
      cx: (i % 6) * 34 - 85,
      cz: (i % 5) * 42 - 84,
      r: 28 + (i % 5) * 12,
      y: 28 + (i % 7) * 2.8,
      speed: 0.06 + (i % 5) * 0.011,
      phase: i * 0.83,
      scale: 0.7 + (i % 4) * 0.16,
    });
  }
  group.add(birds);

  const puffCount = Math.max(48, chimneys.length * 14);
  const smokeMat = new THREE.MeshBasicMaterial({
    color: 0xa8a399,
    transparent: true,
    opacity: 0.19,
    depthWrite: false,
  });
  const smoke = new THREE.InstancedMesh(new THREE.SphereGeometry(0.9, 6, 5), smokeMat, puffCount);
  smoke.frustumCulled = false;
  smoke.renderOrder = 2;
  const smokeData = [];
  for (let i = 0; i < puffCount; i++) {
    const c = chimneys[i % Math.max(1, chimneys.length)] || [0, 0];
    smokeData.push({
      x: c[0] + (i % 4) * 0.35,
      z: c[1] + ((i >> 2) % 4) * 0.35,
      base: 7.2 + (i % 5) * 0.5,
      speed: 0.5 + (i % 7) * 0.06,
      phase: (i / puffCount) * 10 + i * 0.37,
      drone: 0.9 + (i % 3) * 0.25,
    });
  }
  group.add(smoke);

  const dustCount = 320;
  const dustPos = new Float32Array(dustCount * 3);
  const dustData = [];
  for (let i = 0; i < dustCount; i++) {
    const x = (Math.random() * 2 - 1) * 128;
    const z = (Math.random() * 2 - 1) * 138;
    const y = 0.2 + Math.random() * 7.4;
    dustPos[i * 3] = x;
    dustPos[i * 3 + 1] = y;
    dustPos[i * 3 + 2] = z;
    dustData.push({ x, y, z, phase: Math.random() * 6.28, speed: 0.18 + Math.random() * 0.24 });
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(
    dustGeo,
    new THREE.PointsMaterial({ color: 0xc8bca2, size: 0.19, transparent: true, opacity: 0.42, depthWrite: false })
  );
  dust.frustumCulled = false;
  group.add(dust);

  function samplePath(path, dist) {
    let seg = path.segs[0];
    for (const s of path.segs) {
      if (dist >= s.start && dist <= s.start + s.len) {
        seg = s;
        break;
      }
    }
    const t = Math.min(1, Math.max(0, (dist - seg.start) / Math.max(0.001, seg.len)));
    return { x: seg.ax + seg.dx * t, z: seg.az + seg.dz * t, yaw: Math.atan2(seg.dx, seg.dz) };
  }

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
      const pos = samplePath(p.path, dist);
      dummy.position.set(pos.x, 0.02 + Math.abs(Math.sin(time * 6 + p.phase)) * 0.035, pos.z);
      dummy.rotation.set(0, pos.yaw, 0);
      dummy.scale.setScalar(p.scale);
      dummy.updateMatrix();
      people.setMatrixAt(i, dummy.matrix);
    });
    people.instanceMatrix.needsUpdate = true;

    cartData.forEach((p, i) => {
      const dist = (time * p.speed + p.offset) % p.path.total;
      const pos = samplePath(p.path, dist);
      const bounce = Math.abs(Math.sin(time * 5 + p.phase)) * 0.02;
      dummy.position.set(pos.x, bounce, pos.z);
      dummy.rotation.set(0, pos.yaw, Math.sin(time * 5 + p.phase) * 0.006);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      carts.setMatrixAt(i, dummy.matrix);
      baseMatrix.makeRotationY(pos.yaw);
      baseMatrix.setPosition(pos.x, bounce, pos.z);
      const spin = dist / 0.56;
      let w = 0;
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          dummy.position.set(sx * 0.92, 0.56, sz * 0.95);
          dummy.rotation.set(spin, 0, 0);
          dummy.scale.setScalar(1);
          dummy.updateMatrix();
          wheelMatrix.multiplyMatrices(baseMatrix, dummy.matrix);
          wheels.setMatrixAt(i * 4 + w, wheelMatrix);
          w++;
        }
      }
    });
    carts.instanceMatrix.needsUpdate = true;
    wheels.instanceMatrix.needsUpdate = true;

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

    smokeData.forEach((p, i) => {
      const cycle = (time * p.speed + p.phase) % 10;
      const life = cycle / 10;
      const y = p.base + life * 9.2;
      const drift = life * 2.7;
      dummy.position.set(p.x + drift * p.drone, y, p.z + Math.sin(time * 0.3 + p.phase) * 0.7);
      dummy.rotation.set(time * 0.1 + p.phase, time * 0.14 + p.phase, 0);
      dummy.scale.setScalar(0.38 + life * 1.5);
      dummy.updateMatrix();
      smoke.setMatrixAt(i, dummy.matrix);
    });
    smoke.instanceMatrix.needsUpdate = true;

    const pos = dust.geometry.attributes.position;
    for (let i = 0; i < dustData.length; i++) {
      const p = dustData[i];
      const sway = Math.sin(time * p.speed + p.phase);
      pos.setX(i, p.x + sway * 1.6);
      pos.setY(i, p.y + Math.sin(time * 0.5 + p.phase) * 0.35);
      pos.setZ(i, p.z + Math.cos(time * p.speed * 0.8 + p.phase) * 1.2);
    }
    pos.needsUpdate = true;
  }

  return { group, update, glowMaterial: mats.glow };
}
