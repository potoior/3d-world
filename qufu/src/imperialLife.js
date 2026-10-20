import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mats } from './materials.js';
import { addCylinder } from './geometry.js';

function hangingLanternGeometry() {
  const red = [];
  const gold = [];
  addCylinder(gold, 0.028, 0.028, 0.95, 4, 0, -0.48, 0);
  addCylinder(gold, 0.31, 0.24, 0.13, 8, 0, -0.63, 0);
  const body = new THREE.SphereGeometry(0.36, 10, 8);
  body.scale(1, 1.24, 1);
  body.translate(0, -1.05, 0);
  red.push(body);
  addCylinder(gold, 0.2, 0.27, 0.12, 8, 0, -1.47, 0);
  const tassel = new THREE.ConeGeometry(0.075, 0.44, 5);
  tassel.rotateX(Math.PI);
  tassel.translate(0, -1.79, 0);
  red.push(tassel);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    addCylinder(gold, 0.016, 0.016, 0.34, 3, Math.cos(a) * 0.065, -1.99, Math.sin(a) * 0.065);
    addCylinder(gold, 0.02, 0.02, 0.78, 3, Math.cos(a) * 0.365, -1.05, Math.sin(a) * 0.365);
  }
  return { red: mergeGeometries(red, false), gold: mergeGeometries(gold, false) };
}

const lanternAnchors = [
  [-14, 13.1, -36.2], [-6, 13.1, -36.2], [6, 13.1, -36.2], [14, 13.1, -36.2],
  [-10, 6.8, 114.0], [10, 6.8, 114.0],
  [-6, 6.8, 36.2], [6, 6.8, 36.2],
  [-14, 9.7, 230.2], [14, 9.7, 230.2],
  [316, 6.8, 317], [344, 6.8, 317],
  [316, 9.0, 187.2], [344, 9.0, 187.2],
  [316, 8.7, -78.8], [344, 8.7, -78.8],
  [-6.5, 9.2, -227.8], [6.5, 9.2, -227.8],
];

function swayLanterns() {
  const group = new THREE.Group();
  const geo = hangingLanternGeometry();
  const body = new THREE.InstancedMesh(geo.red, mats.lantern, lanternAnchors.length);
  const trim = new THREE.InstancedMesh(geo.gold, mats.gold, lanternAnchors.length);
  body.castShadow = true;
  body.frustumCulled = false;
  trim.frustumCulled = false;
  group.add(body, trim);
  const dummy = new THREE.Object3D();
  return {
    group,
    update(time) {
      lanternAnchors.forEach(([x, y, z], i) => {
        const phase = i * 1.37;
        dummy.position.set(x, y, z);
        dummy.rotation.set(
          Math.sin(time * 1.15 + phase) * 0.055,
          Math.sin(time * 0.33 + phase) * 0.18,
          Math.cos(time * 0.92 + phase * 1.31) * 0.085
        );
        dummy.scale.setScalar(0.95 + (i % 3) * 0.035);
        dummy.updateMatrix();
        body.setMatrixAt(i, dummy.matrix);
        trim.setMatrixAt(i, dummy.matrix);
      });
      body.instanceMatrix.needsUpdate = true;
      trim.instanceMatrix.needsUpdate = true;
    },
  };
}

function visitorSystem() {
  const count = 34;
  const bodyGeo = new THREE.CylinderGeometry(0.26, 0.38, 1.12, 6);
  bodyGeo.translate(0, 0.9, 0);
  const shoulder = new THREE.SphereGeometry(0.29, 6, 4);
  shoulder.scale(1.25, 0.5, 0.9);
  shoulder.translate(0, 1.42, 0);
  const legL = new THREE.BoxGeometry(0.13, 0.5, 0.15);
  legL.translate(-0.14, 0.28, 0);
  const legR = new THREE.BoxGeometry(0.13, 0.5, 0.15);
  legR.translate(0.14, 0.28, 0);
  const bodyMerged = mergeGeometries([bodyGeo, shoulder, legL, legR], false);
  const headGeo = new THREE.SphereGeometry(0.22, 8, 6);
  headGeo.translate(0, 1.7, 0);
  const cloth = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xc59b7a, roughness: 0.86 });
  const bodies = new THREE.InstancedMesh(bodyMerged, cloth, count);
  const heads = new THREE.InstancedMesh(headGeo, skin, count);
  bodies.castShadow = true;
  heads.castShadow = true;
  bodies.frustumCulled = false;
  heads.frustumCulled = false;
  const colors = [0x354a63, 0x6d3f36, 0x2f4c42, 0x7a6350, 0x8d3b32, 0x4a4657, 0xb0a58e, 0x59433a];
  const palette = new THREE.Color();
  const data = [];
  for (let i = 0; i < count; i++) {
    let path;
    let lane;
    if (i < 15) {
      path = 'temple';
      lane = (i % 3 - 1) * 2.6 + (i % 2 ? 0.5 : -0.5);
    } else if (i < 24) {
      path = 'mansion';
      lane = (i % 3 - 1) * 1.8;
    } else {
      path = 'cemetery';
      lane = (i % 2 ? 1 : -1) * (2.0 + (i % 3) * 1.4);
    }
    data.push({
      path,
      lane,
      speed: 0.008 + (i % 7) * 0.0016,
      phase: i * 0.137,
      scale: 0.82 + (i % 5) * 0.055,
      stride: 2.2 + (i % 5) * 0.3,
    });
    palette.setHex(colors[i % colors.length]);
    bodies.setColorAt(i, palette);
  }
  bodies.instanceColor.needsUpdate = true;
  const group = new THREE.Group();
  group.add(bodies, heads);
  const dummy = new THREE.Object3D();
  return {
    group,
    update(time, dt) {
      data.forEach((p, i) => {
        const t = (time * p.speed + p.phase) % 1;
        let x;
        let z;
        let dx = 0;
        let dz = 0;
        if (p.path === 'temple') {
          z = 330 - t * 500;
          x = p.lane + Math.sin(time * 0.36 + p.phase * 10) * 0.8;
          dz = -1;
        } else if (p.path === 'mansion') {
          z = 322 - t * 460;
          x = 330 + p.lane + Math.sin(time * 0.31 + p.phase * 8) * 0.5;
          dz = -1;
        } else {
          z = -238 - t * 280;
          x = p.lane + Math.sin(time * 0.29 + p.phase * 12) * 1.1;
          dz = -1;
        }
        const bob = Math.abs(Math.sin(time * p.stride + p.phase * 18)) * 0.08;
        dummy.position.set(x, bob, z);
        dummy.rotation.set(0, Math.atan2(dx, dz), 0);
        dummy.scale.setScalar(p.scale);
        dummy.updateMatrix();
        bodies.setMatrixAt(i, dummy.matrix);
        heads.setMatrixAt(i, dummy.matrix);
      });
      bodies.instanceMatrix.needsUpdate = true;
      heads.instanceMatrix.needsUpdate = true;
    },
  };
}

function leafSystem() {
  const count = 90;
  const geo = new THREE.CircleGeometry(0.075, 4);
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.InstancedMesh(geo, mats.blade, count);
  mesh.frustumCulled = false;
  const data = [];
  const zones = [
    [-120, 120], [120, 120], [-150, -20], [150, -20], [-104, 260],
    [104, 260], [-240, -300], [240, -340], [0, -470], [-140, -430], [140, -450],
  ];
  for (let i = 0; i < count; i++) {
    const zone = zones[i % zones.length];
    data.push({
      x: zone[0] + Math.sin(i * 91.3) * 18,
      z: zone[1] + Math.cos(i * 47.9) * 16,
      y: 4 + (i % 10) * 1.4,
      fall: 0.32 + (i % 6) * 0.055,
      sway: 0.28 + (i % 5) * 0.1,
      phase: i * 0.71,
      spin: 0.5 + (i % 4) * 0.24,
    });
  }
  const dummy = new THREE.Object3D();
  return {
    mesh,
    update(time, dt) {
      data.forEach((p, i) => {
        p.y -= p.fall * dt;
        p.x += Math.sin(time * 0.7 + p.phase) * p.sway * dt;
        p.z += Math.cos(time * 0.61 + p.phase * 1.3) * p.sway * 0.7 * dt;
        if (p.y < 0.12) {
          p.y = 7 + (i % 9) * 1.5;
          p.x += Math.sin(time * 0.4 + i) * 1.8;
          p.z += Math.cos(time * 0.37 + i) * 1.8;
        }
        dummy.position.set(p.x, p.y, p.z);
        dummy.rotation.set(Math.sin(time * 1.1 + p.phase) * 0.9, time * p.spin + p.phase, Math.cos(time * 0.9 + p.phase) * 0.7);
        dummy.scale.setScalar(0.7 + (i % 4) * 0.12);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}

export function createImperialLife() {
  const group = new THREE.Group();
  const lanterns = swayLanterns();
  const visitors = visitorSystem();
  const leaves = leafSystem();
  group.add(lanterns.group, visitors.group, leaves.mesh);
  return {
    group,
    update(time, dt) {
      lanterns.update(time);
      visitors.update(time, dt);
      leaves.update(time, dt);
    },
  };
}
