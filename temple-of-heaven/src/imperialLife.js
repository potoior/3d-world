import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mats } from './materials.js';
import { addCylinder } from './geometry.js';

function lanternGeometry() {
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
  [-26, 7.2, 310.4], [-12, 7.2, 310.4], [12, 7.2, 310.4], [26, 7.2, 310.4],
  [-28, 16.3, 110.4], [-16, 16.3, 110.4], [16, 16.3, 110.4], [28, 16.3, 110.4],
  [-22, 15.3, -27.8], [-10, 15.3, -27.8], [10, 15.3, -27.8], [22, 15.3, -27.8],
  [-18, 10.0, -217.4], [-7, 10.0, -217.4], [7, 10.0, -217.4], [18, 10.0, -217.4],
  [-16, 9.4, -292.0], [-5, 9.4, -292.0], [5, 9.4, -292.0], [16, 9.4, -292.0],
];

function swayLanterns() {
  const group = new THREE.Group();
  const geo = lanternGeometry();
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

function koiGeometry() {
  const body = new THREE.SphereGeometry(0.34, 7, 5);
  body.scale(1, 0.7, 2.3);
  const tail = new THREE.ConeGeometry(0.3, 0.75, 4);
  tail.rotateX(Math.PI / 2);
  tail.translate(0, 0, 0.96);
  const fin = new THREE.ConeGeometry(0.12, 0.45, 3);
  fin.rotateX(-Math.PI / 2);
  fin.translate(0, 0.2, 0.12);
  return mergeGeometries([body, tail, fin], false);
}

function koiSystem() {
  const count = 30;
  const mesh = new THREE.InstancedMesh(koiGeometry(), mats.koi, count);
  mesh.frustumCulled = false;
  const colors = new THREE.Color();
  const data = [];
  const palette = [0xd86b2a, 0xf0e5d2, 0xc9472f, 0x2d3232, 0xe9a23f, 0xf4ede0];
  for (let i = 0; i < count; i++) {
    const east = i < 17;
    data.push({
      cx: east ? 396 + (i % 4) * 4.2 : 220 + (i % 5) * 22,
      cz: east ? 360 + (i % 6) * 24 : 501 + (i % 3) * 4,
      axis: east ? 'z' : 'x',
      len: east ? 68 + (i % 4) * 10 : 52 + (i % 3) * 14,
      speed: 0.16 + (i % 7) * 0.02,
      phase: i * 0.83,
      size: 0.6 + (i % 4) * 0.12,
      depth: -1.0 - (i % 3) * 0.02,
    });
    colors.setHex(palette[i % palette.length]);
    mesh.setColorAt(i, colors);
  }
  mesh.instanceColor.needsUpdate = true;
  const dummy = new THREE.Object3D();
  return {
    mesh,
    update(time) {
      data.forEach((k, i) => {
        const a = time * k.speed + k.phase;
        const u = Math.sin(a);
        const du = Math.cos(a);
        let x = k.cx;
        let z = k.cz;
        let dx = 0;
        let dz = 0;
        if (k.axis === 'z') {
          z += u * k.len;
          dz = du * k.len;
        } else {
          x += u * k.len;
          dx = du * k.len;
        }
        dummy.position.set(x, k.depth, z);
        dummy.rotation.set(Math.sin(time * 2 + i) * 0.04, Math.atan2(dx, dz), 0);
        dummy.scale.setScalar(k.size);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}

function rippleSystem() {
  const count = 18;
  const geo = new THREE.TorusGeometry(1, 0.02, 3, 20);
  geo.rotateX(Math.PI / 2);
  const mesh = new THREE.InstancedMesh(geo, mats.ripple, count);
  mesh.frustumCulled = false;
  const spots = [];
  for (let i = 0; i < count; i++) {
    const east = i < 10;
    spots.push({
      x: east ? 394 + (i % 4) * 5 : 218 + (i % 5) * 21,
      z: east ? 355 + (i % 6) * 25 : 500 + (i % 3) * 4,
      phase: i / count,
      speed: 0.06 + (i % 4) * 0.012,
      max: 1.6 + (i % 3) * 0.5,
    });
  }
  const dummy = new THREE.Object3D();
  return {
    mesh,
    update(time) {
      spots.forEach((r, i) => {
        const p = (time * r.speed + r.phase) % 1;
        const s = 0.18 + p * r.max;
        dummy.position.set(r.x, -1.06, r.z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(s, 1, s);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}

function leafSystem() {
  const count = 70;
  const geo = new THREE.CircleGeometry(0.085, 4);
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.InstancedMesh(geo, mats.blade, count);
  mesh.frustumCulled = false;
  const data = [];
  const zones = [
    [-61, 182], [61, 182], [-57, -260], [57, -260], [-52, 200], [52, 200],
    [0, -408], [-20, -392], [20, -392], [-90, -330], [90, -330],
  ];
  for (let i = 0; i < count; i++) {
    const z = zones[i % zones.length];
    data.push({
      x: z[0] + Math.sin(i * 91.3) * 15,
      z: z[1] + Math.cos(i * 47.9) * 13,
      y: 3 + (i % 9) * 1.3,
      fall: 0.35 + (i % 6) * 0.06,
      sway: 0.3 + (i % 5) * 0.12,
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
          p.y = 6 + (i % 8) * 1.4;
          p.x += Math.sin(time * 0.4 + i) * 1.6;
          p.z += Math.cos(time * 0.37 + i) * 1.6;
        }
        dummy.position.set(p.x, p.y, p.z);
        dummy.rotation.set(Math.sin(time * 1.1 + p.phase) * 0.9, time * p.spin + p.phase, Math.cos(time * 0.9 + p.phase) * 0.7);
        dummy.scale.setScalar(0.75 + (i % 4) * 0.12);
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
  const koi = koiSystem();
  const ripples = rippleSystem();
  const leaves = leafSystem();
  group.add(lanterns.group, koi.mesh, ripples.mesh, leaves.mesh);
  return {
    group,
    update(time, dt) {
      lanterns.update(time);
      koi.update(time);
      ripples.update(time);
      leaves.update(time, dt);
    },
  };
}
