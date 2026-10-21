import * as THREE from 'three';
import { mergedMesh } from './geometry.js';

function flagGeometry() {
  const g = new THREE.PlaneGeometry(1.15, 3.4, 2, 5);
  g.translate(0, -1.7, 0);
  return g;
}

function bucketGeometry() {
  const parts = [];
  const body = new THREE.CylinderGeometry(0.25, 0.19, 0.42, 9);
  body.translate(0, 0, 0);
  parts.push(body);
  const rim = new THREE.TorusGeometry(0.25, 0.025, 4, 12);
  rim.rotateX(Math.PI / 2);
  rim.translate(0, 0.21, 0);
  parts.push(rim);
  const hoop = new THREE.TorusGeometry(0.23, 0.018, 4, 12);
  hoop.rotateX(Math.PI / 2);
  hoop.translate(0, -0.08, 0);
  parts.push(hoop);
  const handle = new THREE.TorusGeometry(0.22, 0.018, 4, 10, Math.PI);
  handle.translate(0, 0.24, 0);
  parts.push(handle);
  return mergedMesh(parts, new THREE.MeshStandardMaterial({ color: 0x6d4a2e, roughness: 0.92 }), false, false).geometry;
}

export function createDetailLife({ gates = [], wells = [] }) {
  const group = new THREE.Group();
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  const flagMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.9,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });
  const flagData = [];
  for (const gate of gates) {
    for (const side of [-1, 1]) {
      const lx = side * 7.75;
      const lz = 3.42;
      const wx = gate.x + lx * Math.cos(gate.rot) + lz * Math.sin(gate.rot);
      const wz = gate.z - lx * Math.sin(gate.rot) + lz * Math.cos(gate.rot);
      flagData.push({
        x: wx,
        y: 8.02,
        z: wz,
        yaw: gate.rot,
        phase: (gate.x + gate.z) * 0.013 + side * 1.3,
        color: side > 0 ? 0xa4472f : 0x33516a,
      });
    }
  }
  const flags = new THREE.InstancedMesh(flagGeometry(), flagMat, flagData.length);
  flags.frustumCulled = false;
  flags.castShadow = true;
  for (let i = 0; i < flagData.length; i++) flags.setColorAt(i, color.setHex(flagData[i].color));
  flags.instanceColor.needsUpdate = true;
  group.add(flags);

  const bucketMat = new THREE.MeshStandardMaterial({ color: 0x7a5232, roughness: 0.94 });
  const buckets = new THREE.InstancedMesh(bucketGeometry(), bucketMat, wells.length);
  buckets.frustumCulled = false;
  const wellData = wells.map(([x, z, s], i) => ({ x, z, s: s || 1, phase: i * 1.73 }));
  group.add(buckets);

  function update(time) {
    for (let i = 0; i < flagData.length; i++) {
      const f = flagData[i];
      dummy.position.set(f.x, f.y, f.z);
      dummy.rotation.set(
        Math.sin(time * 1.5 + f.phase) * 0.16,
        f.yaw,
        Math.cos(time * 1.9 + f.phase) * 0.28
      );
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      flags.setMatrixAt(i, dummy.matrix);
    }
    flags.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < wellData.length; i++) {
      const w = wellData[i];
      dummy.position.set(w.x, 1.26 * w.s + Math.sin(time * 1.1 + w.phase) * 0.16, w.z);
      dummy.rotation.set(Math.sin(time * 0.9 + w.phase) * 0.08, time * 0.4 + w.phase, Math.cos(time * 0.75 + w.phase) * 0.06);
      dummy.scale.setScalar(w.s);
      dummy.updateMatrix();
      buckets.setMatrixAt(i, dummy.matrix);
    }
    buckets.instanceMatrix.needsUpdate = true;
  }

  return { group, update, flagCount: flagData.length, bucketCount: wells.length };
}
