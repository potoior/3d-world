import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mats } from './materials.js';

function shadowTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  g.addColorStop(0, 'rgba(0,0,0,0.72)');
  g.addColorStop(0.45, 'rgba(0,0,0,0.34)');
  g.addColorStop(0.78, 'rgba(0,0,0,0.1)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const shadowData = [
  [-6, 53, 15, 9], [-65, 61, 11, 8], [-55, 20, 8, 7], [-31, 54, 7, 5],
  [-27, 40, 5.5, 5.5], [98, 78, 9, 7], [108, 64, 6.5, 6.5], [19, 27, 6, 5],
  [-13, 27, 5, 5], [0, 82, 7, 5], [-60, 50, 4.5, 4.5], [89, 37, 4.5, 4.5],
  [26, 36, 5.5, 4], [-21, 64, 8, 4], [-90, 35, 3, 6], [106, 50, 3, 6],
  [-64, 26, 4.5, 4.5], [-82, -24, 4.5, 4.5], [74, 80, 4, 4], [72, 42, 3.6, 3.6],
  [-38, 55, 3.2, 3.2], [112, 40, 4.2, 4.2], [-48, 68, 3.6, 3.6], [14, 64, 3, 3],
  [-88, 26, 4.5, 4.5], [-86, -30, 4.5, 4.5], [72, -26, 4.5, 4.5], [84, 24, 4.5, 4.5],
  [-66, 68, 4, 4], [62, 70, 4, 4], [20, 70, 4, 4], [-10, -68, 4, 4],
  [64, -66, 4, 4], [92, -30, 4, 4], [-94, 8, 4, 4], [36, 60, 4, 4],
  [-30, 72, 4, 4], [44, 68, 4, 4], [-68, 32, 3, 3], [82, 62, 3, 3],
  [-88, 52, 3, 3], [74, 34, 3, 3], [-58, 34, 2.8, 2.8], [56, 64, 3, 3],
];

function contactShadows() {
  const geo = new THREE.PlaneGeometry(1, 1);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({
    map: shadowTexture(),
    transparent: true,
    opacity: 0.36,
    depthWrite: false,
    color: 0x1e281b,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, shadowData.length);
  mesh.frustumCulled = false;
  mesh.renderOrder = 0.5;
  const dummy = new THREE.Object3D();
  shadowData.forEach(([x, z, sx, sz], i) => {
    dummy.position.set(x, 0.028, z);
    dummy.rotation.set(0, (i * 0.83) % 6.28, 0);
    dummy.scale.set(sx, 1, sz);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

function leafSystem() {
  const count = 64;
  const geo = new THREE.CircleGeometry(0.1, 5);
  geo.rotateX(-Math.PI / 2);
  geo.scale(0.8, 1, 1.45);
  const mesh = new THREE.InstancedMesh(geo, mats.willow, count);
  mesh.frustumCulled = false;
  const zones = [
    [-30, 37], [-10, 41], [12, 38], [32, 33], [46, 26], [-42, 33],
    [-58, 34], [-81, 17], [6, -16], [-20, 7], [-36, 62], [8, 62],
  ];
  const data = [];
  for (let i = 0; i < count; i++) {
    const z = zones[i % zones.length];
    const floating = i % 6 === 0;
    data.push({
      x: z[0] + Math.sin(i * 91.7) * 6,
      z: z[1] + Math.cos(i * 47.3) * 6,
      y: floating ? 0.18 : 1.5 + (i % 9) * 0.9,
      fall: floating ? 0 : 0.22 + (i % 5) * 0.04,
      sway: 0.25 + (i % 4) * 0.09,
      phase: i * 0.73,
      spin: 0.4 + (i % 5) * 0.18,
      floating,
    });
  }
  const dummy = new THREE.Object3D();
  return {
    mesh,
    update(time, dt) {
      data.forEach((p, i) => {
        if (p.floating) {
          p.x += Math.sin(time * 0.24 + p.phase) * 0.05 * dt;
          p.z += Math.cos(time * 0.2 + p.phase * 1.2) * 0.04 * dt;
          p.y = 0.18 + Math.sin(time * 0.8 + p.phase) * 0.006;
        } else {
          p.y -= p.fall * dt;
          p.x += Math.sin(time * 0.62 + p.phase) * p.sway * dt;
          p.z += Math.cos(time * 0.53 + p.phase * 1.4) * p.sway * 0.7 * dt;
          if (p.y < 0.2) {
            p.y = 5 + (i % 8) * 0.9;
            p.x += Math.sin(time * 0.4 + i) * 1.2;
            p.z += Math.cos(time * 0.37 + i) * 1.2;
          }
        }
        dummy.position.set(p.x, p.y, p.z);
        dummy.rotation.set(Math.sin(time * 1.3 + p.phase) * 0.9, time * p.spin + p.phase, Math.cos(time * 1.1 + p.phase) * 0.7);
        dummy.scale.setScalar(0.75 + (i % 4) * 0.12);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}

function butterflyGeometry() {
  const left = new THREE.PlaneGeometry(0.22, 0.18);
  left.rotateX(-Math.PI / 2);
  left.rotateZ(0.35);
  left.translate(-0.11, 0, 0);
  const right = new THREE.PlaneGeometry(0.22, 0.18);
  right.rotateX(-Math.PI / 2);
  right.rotateZ(-0.35);
  right.translate(0.11, 0, 0);
  const body = new THREE.CylinderGeometry(0.025, 0.03, 0.28, 4);
  body.rotateX(Math.PI / 2);
  return mergeGeometries([left, right, body], false);
}

function butterflies() {
  const count = 18;
  const mesh = new THREE.InstancedMesh(butterflyGeometry(), mats.blossomGold, count);
  mesh.frustumCulled = false;
  const data = [];
  for (let i = 0; i < count; i++) {
    data.push({
      cx: -34 + (i % 6) * 13,
      cz: 44 + ((i * 7) % 18),
      r: 1.1 + (i % 4) * 0.45,
      speed: 0.42 + (i % 5) * 0.09,
      phase: i * 0.91,
      y: 0.75 + (i % 4) * 0.28,
    });
  }
  const dummy = new THREE.Object3D();
  return {
    mesh,
    update(time) {
      data.forEach((b, i) => {
        const a = time * b.speed + b.phase;
        const x = b.cx + Math.cos(a) * b.r;
        const z = b.cz + Math.sin(a * 0.82) * b.r;
        const dx = -Math.sin(a) * b.r;
        const dz = Math.cos(a * 0.82) * b.r * 0.82;
        dummy.position.set(x, b.y + Math.sin(time * 1.7 + b.phase) * 0.22, z);
        dummy.rotation.set(Math.sin(time * 11 + b.phase) * 0.5, Math.atan2(dx, dz), Math.sin(time * 9 + b.phase) * 0.28);
        dummy.scale.setScalar(0.8 + (i % 3) * 0.12);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}

function blossomGeometry() {
  const parts = [];
  for (let k = 0; k < 5; k++) {
    const p = new THREE.CircleGeometry(0.075, 5);
    p.rotateX(-Math.PI / 2);
    p.scale(1, 1, 1.35);
    p.translate(Math.cos((k / 5) * Math.PI * 2) * 0.07, 0, Math.sin((k / 5) * Math.PI * 2) * 0.07);
    parts.push(p);
  }
  const core = new THREE.SphereGeometry(0.035, 5, 4);
  parts.push(core);
  return mergeGeometries(parts, false);
}

function floatingBlossoms() {
  const count = 28;
  const mesh = new THREE.InstancedMesh(blossomGeometry(), mats.blossomPale, count);
  mesh.frustumCulled = false;
  const spots = [
    [-30, 24], [-2, 28], [18, 24], [36, 18], [44, 2], [40, -16],
    [-36, -10], [-46, 9], [20, -8], [-2, -33], [-27, 47], [-27, 33],
    [-55, 34], [-12, 45], [-45, 31], [12, 34],
  ];
  const data = [];
  for (let i = 0; i < count; i++) {
    const s = spots[i % spots.length];
    data.push({
      x: s[0] + Math.sin(i * 2.1) * 2.2,
      z: s[1] + Math.cos(i * 1.7) * 1.8,
      phase: i * 0.83,
      speed: 0.025 + (i % 4) * 0.006,
    });
  }
  const dummy = new THREE.Object3D();
  return {
    mesh,
    update(time) {
      data.forEach((b, i) => {
        const dx = Math.cos(time * b.speed + b.phase) * 1.4;
        const dz = Math.sin(time * b.speed * 0.8 + b.phase) * 1.2;
        dummy.position.set(b.x + dx, 0.155 + Math.sin(time * 0.7 + b.phase) * 0.008, b.z + dz);
        dummy.rotation.set(0, time * 0.1 + b.phase, 0);
        dummy.scale.setScalar(0.75 + (i % 4) * 0.12);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}

export function createGardenRefineLife() {
  const group = new THREE.Group();
  const shadows = contactShadows();
  const leaves = leafSystem();
  const flutter = butterflies();
  const blossoms = floatingBlossoms();
  group.add(shadows, leaves.mesh, flutter.mesh, blossoms.mesh);
  return {
    group,
    update(time, dt) {
      leaves.update(time, dt);
      flutter.update(time);
      blossoms.update(time);
    },
  };
}
