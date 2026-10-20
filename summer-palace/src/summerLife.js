import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mats } from './materials.js';

function personGeometries() {
  const body = new THREE.CylinderGeometry(0.16, 0.23, 0.92, 6);
  body.translate(0, 0.46, 0);
  const head = new THREE.SphereGeometry(0.14, 7, 5);
  head.translate(0, 1.06, 0);
  return { body, head };
}

function boatGeometries() {
  const hull = new THREE.BoxGeometry(1.7, 0.52, 4.6);
  hull.translate(0, 0.24, 0);
  const bow = new THREE.ConeGeometry(0.82, 1.5, 4);
  bow.rotateX(Math.PI / 2);
  bow.scale(0.95, 1, 0.45);
  bow.translate(0, 0.24, 2.85);
  const stern = new THREE.BoxGeometry(1.4, 0.3, 0.7);
  stern.translate(0, 0.54, -2.2);
  const hullGeo = mergeGeometries([hull, bow, stern], false);
  const canopy = new THREE.BoxGeometry(1.5, 0.22, 2.1);
  canopy.translate(0, 1.15, -0.35);
  const roof = new THREE.ConeGeometry(1.05, 0.55, 4);
  roof.rotateY(Math.PI / 4);
  roof.scale(1.05, 1, 1.3);
  roof.translate(0, 1.6, -0.35);
  const canopyGeo = mergeGeometries([canopy, roof], false);
  const oar = new THREE.BoxGeometry(0.12, 0.08, 2.5);
  oar.rotateY(0.35);
  oar.translate(1.05, 0.42, -0.1);
  return { hullGeo, canopyGeo, oar };
}

function birdGeometry() {
  const body = new THREE.SphereGeometry(0.1, 5, 4);
  body.scale(0.6, 0.55, 1.7);
  const left = new THREE.BoxGeometry(0.8, 0.025, 0.16);
  left.rotateZ(0.32);
  left.translate(-0.36, 0.05, 0);
  const right = new THREE.BoxGeometry(0.8, 0.025, 0.16);
  right.rotateZ(-0.32);
  right.translate(0.36, 0.05, 0);
  return mergeGeometries([body, left, right], false);
}

function makePaths() {
  return [
    { points: [[-88, -14, 0.45], [8, -14, 0.45]], speed: 2.0 },
    { points: [[59, 52, 2.3], [85, 46, 4.7], [112, 40, 2.3]], speed: 1.7 },
    { points: [[-92, -6, 0.9], [-92, 103, 0.9]], speed: 1.8 },
    { points: [[-80, 108, 0.12], [92, 108, 0.12]], speed: 2.2 },
    { points: [[50, 52, 1.5], [85, 46, 4.4], [112, 40, 2.3]], speed: 1.5 },
    { points: [[-76, 108, 0.12], [30, 108, 0.12]], speed: 1.9 },
  ];
}

function pointOnPath(path, t) {
  const pts = path.points;
  let total = 0;
  const lengths = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const dx = pts[i + 1][0] - pts[i][0];
    const dz = pts[i + 1][1] - pts[i][1];
    const dy = pts[i + 1][2] - pts[i][2];
    const len = Math.hypot(dx, dz);
    lengths.push({ len, dy, dx, dz, from: pts[i] });
    total += len;
  }
  const d = t * total;
  let acc = 0;
  for (const s of lengths) {
    if (d <= acc + s.len || s === lengths[lengths.length - 1]) {
      const k = s.len > 0 ? Math.min(1, (d - acc) / s.len) : 0;
      return {
        x: s.from[0] + s.dx * k,
        z: s.from[1] + s.dz * k,
        y: s.from[2] + s.dy * k,
        dx: s.dx,
        dz: s.dz,
      };
    }
    acc += s.len;
  }
  const last = pts[pts.length - 1];
  return { x: last[0], y: last[2], z: last[1], dx: 0, dz: 1 };
}

export function createSummerLife() {
  const group = new THREE.Group();
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  const { body: bodyGeo, head: headGeo } = personGeometries();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.86 });
  const headMat = new THREE.MeshStandardMaterial({ color: 0xe4c5a5, roughness: 0.8 });
  const count = 46;
  const bodies = new THREE.InstancedMesh(bodyGeo, bodyMat, count);
  const heads = new THREE.InstancedMesh(headGeo, headMat, count);
  bodies.frustumCulled = false;
  heads.frustumCulled = false;
  const palette = [0xb9473b, 0x335d7a, 0x6d7d4d, 0xd8c5a2, 0x7a4b35, 0x8a5f86, 0x2f6059, 0xc49a4e];
  const paths = makePaths();
  const people = [];
  for (let i = 0; i < count; i++) {
    const path = paths[i % paths.length];
    people.push({
      path,
      phase: (i * 0.173) % 1,
      speed: 0.022 + (i % 5) * 0.004,
      scale: 0.84 + (i % 4) * 0.07,
      flip: i % 2 === 0 ? 1 : -1,
    });
    color.setHex(palette[i % palette.length]);
    bodies.setColorAt(i, color);
  }
  bodies.instanceColor.needsUpdate = true;
  group.add(bodies, heads);

  const { hullGeo, canopyGeo, oar } = boatGeometries();
  const boats = new THREE.InstancedMesh(hullGeo, mats.wood, 6);
  const canopies = new THREE.InstancedMesh(canopyGeo, mats.lanternRed, 6);
  const oars = new THREE.InstancedMesh(oar, mats.timberRed, 6);
  boats.frustumCulled = false;
  canopies.frustumCulled = false;
  oars.frustumCulled = false;
  const boatData = [
    { cx: -10, cz: 32, rx: 22, rz: 14, speed: 0.05, phase: 0.2 },
    { cx: 18, cz: 44, rx: 26, rz: 18, speed: 0.043, phase: 1.7 },
    { cx: -38, cz: 64, rx: 18, rz: 12, speed: 0.061, phase: 3.2 },
    { cx: 34, cz: 74, rx: 20, rz: 15, speed: 0.047, phase: 4.6 },
    { cx: -58, cz: 44, rx: 14, rz: 10, speed: 0.066, phase: 5.5 },
    { cx: 6, cz: 84, rx: 30, rz: 11, speed: 0.038, phase: 2.6 },
  ];
  group.add(boats, canopies, oars);

  const birdCount = 26;
  const birds = new THREE.InstancedMesh(birdGeometry(), mats.bird, birdCount);
  birds.frustumCulled = false;
  const birdData = [];
  for (let i = 0; i < birdCount; i++) {
    birdData.push({
      cx: -8 + (i % 5) * 13,
      cz: -8 + ((i * 17) % 70),
      r: 24 + (i % 5) * 8,
      y: 25 + (i % 7) * 2.6,
      speed: 0.032 + (i % 5) * 0.006,
      phase: i * 0.94,
      size: 0.66 + (i % 4) * 0.16,
    });
  }
  group.add(birds);

  const rippleCount = 26;
  const rippleGeo = new THREE.TorusGeometry(1, 0.018, 3, 22);
  rippleGeo.rotateX(Math.PI / 2);
  const ripples = new THREE.InstancedMesh(rippleGeo, mats.ripple, rippleCount);
  ripples.frustumCulled = false;
  group.add(ripples);

  const boatPositions = boatData.map((b) => ({ x: b.cx, z: b.cz }));

  function update(time, dt) {
    people.forEach((p, i) => {
      const raw = (time * p.speed + p.phase) % 2;
      const t = raw < 1 ? raw : 2 - raw;
      const pos = pointOnPath(p.path, t);
      const dir = raw < 1 ? 1 : -1;
      const ang = Math.atan2(pos.dx * dir, pos.dz * dir);
      dummy.position.set(pos.x, pos.y, pos.z);
      dummy.rotation.set(0, ang, 0);
      dummy.scale.setScalar(p.scale);
      dummy.updateMatrix();
      bodies.setMatrixAt(i, dummy.matrix);
      dummy.position.y = pos.y + 0.9 * p.scale;
      dummy.updateMatrix();
      heads.setMatrixAt(i, dummy.matrix);
    });
    bodies.instanceMatrix.needsUpdate = true;
    heads.instanceMatrix.needsUpdate = true;

    boatData.forEach((b, i) => {
      const t = time * b.speed + b.phase;
      const x = b.cx + Math.cos(t) * b.rx;
      const z = b.cz + Math.sin(t * 0.82) * b.rz;
      const dx = -Math.sin(t) * b.rx;
      const dz = Math.cos(t * 0.82) * b.rz * 0.82;
      boatPositions[i].x = x;
      boatPositions[i].z = z;
      const bob = Math.sin(time * 1.5 + b.phase) * 0.045;
      dummy.position.set(x, 0.22 + bob, z);
      dummy.rotation.set(Math.sin(time * 1.1 + b.phase) * 0.025, Math.atan2(dx, dz), Math.sin(time * 0.9 + b.phase) * 0.018);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      boats.setMatrixAt(i, dummy.matrix);
      dummy.position.y = 0.22 + bob;
      dummy.updateMatrix();
      canopies.setMatrixAt(i, dummy.matrix);
      dummy.position.set(x + 0.6, 0.48 + bob, z - 0.6);
      dummy.rotation.set(0.16, Math.atan2(dx, dz) + Math.sin(time * 2.2 + i) * 0.22, 0);
      dummy.updateMatrix();
      oars.setMatrixAt(i, dummy.matrix);
    });
    boats.instanceMatrix.needsUpdate = true;
    canopies.instanceMatrix.needsUpdate = true;
    oars.instanceMatrix.needsUpdate = true;

    birdData.forEach((b, i) => {
      const t = time * b.speed + b.phase;
      const x = b.cx + Math.cos(t) * b.r;
      const z = b.cz + Math.sin(t) * b.r * 0.72;
      const y = b.y + Math.sin(time * 0.64 + b.phase) * 1.5;
      const dx = -Math.sin(t) * b.r;
      const dz = Math.cos(t) * b.r * 0.72;
      dummy.position.set(x, y, z);
      dummy.rotation.set(0, Math.atan2(dx, dz), Math.sin(time * 2.3 + i) * 0.16);
      dummy.scale.setScalar(b.size);
      dummy.updateMatrix();
      birds.setMatrixAt(i, dummy.matrix);
    });
    birds.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < rippleCount; i++) {
      const b = boatPositions[i % boatPositions.length];
      const phase = (time * 0.28 + i * 0.17) % 1;
      const s = 0.5 + phase * 2.4;
      dummy.position.set(b.x + Math.sin(i * 2.4) * 2.2, 0.135, b.z + Math.cos(i * 1.9) * 2.0);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(s, 1, s * 0.8);
      dummy.updateMatrix();
      ripples.setMatrixAt(i, dummy.matrix);
    }
    ripples.instanceMatrix.needsUpdate = true;
  }

  return { group, update };
}
