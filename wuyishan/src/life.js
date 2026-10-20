import * as THREE from 'three';
import { mats } from './materials.js';
import { mergedMesh } from './geometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { riverCenter, WATER_Y } from './terrain.js';

function makeRaft(scale = 1) {
  const group = new THREE.Group();
  const raft = [];
  const figure = [];
  const hat = [];
  const robes = [];
  const baskets = [];
  const birds = [];
  for (let i = 0; i < 13; i++) {
    const x = (i - 6) * 0.21;
    const len = 8.6 + Math.sin(i * 1.7) * 0.22;
    const pole = new THREE.CylinderGeometry(0.095, 0.12, len, 5);
    pole.rotateX(Math.PI / 2);
    pole.translate(x, 0, 0);
    raft.push(pole);
  }
  for (const z of [-3.1, -1.55, 0, 1.55, 3.1]) {
    const bar = new THREE.BoxGeometry(2.95, 0.13, 0.24);
    bar.translate(0, 0.13, z);
    raft.push(bar);
  }
  for (const z of [-1.55, 0, 1.55]) {
    for (const ix of [-4, -1, 3, 5]) {
      const ring = new THREE.TorusGeometry(0.145, 0.026, 3, 6);
      ring.rotateX(Math.PI / 2);
      ring.translate(ix * 0.21, 0.22, z);
      raft.push(ring);
    }
  }
  const bow = new THREE.BoxGeometry(2.6, 0.12, 1.5);
  bow.rotateX(-0.35);
  bow.translate(0, 0.22, -4.7);
  raft.push(bow);
  const stern = new THREE.BoxGeometry(2.5, 0.12, 0.9);
  stern.rotateX(0.24);
  stern.translate(0, 0.2, 4.45);
  raft.push(stern);
  for (const sx of [-1, 1]) {
    const rail = new THREE.BoxGeometry(0.1, 0.24, 1.5);
    rail.translate(sx * 1.26, 0.34, -2.1);
    raft.push(rail);
    const up = new THREE.CylinderGeometry(0.03, 0.04, 2.1, 4);
    up.rotateZ(sx * 0.32);
    up.translate(sx * 1.05, 0.9, -4.0);
    raft.push(up);
  }
  const perch = new THREE.CylinderGeometry(0.045, 0.05, 2.5, 4);
  perch.rotateZ(Math.PI / 2);
  perch.translate(0, 0.72, -2.5);
  raft.push(perch);
  const body = new THREE.CylinderGeometry(0.28, 0.4, 1.15, 6);
  body.translate(0.5, 0.92, 1.7);
  figure.push(body);
  for (const sx of [-0.16, 0.16]) {
    const leg = new THREE.CylinderGeometry(0.055, 0.07, 0.55, 4);
    leg.translate(0.5 + sx, 0.3, 1.7);
    figure.push(leg);
  }
  const head = new THREE.SphereGeometry(0.24, 7, 5);
  head.translate(0.5, 1.62, 1.7);
  figure.push(head);
  const arm = new THREE.CylinderGeometry(0.07, 0.08, 1.3, 5);
  arm.rotateZ(-0.7);
  arm.translate(-0.15, 1.15, 1.4);
  figure.push(arm);
  const oar = new THREE.CylinderGeometry(0.045, 0.06, 4.2, 5);
  oar.rotateZ(1.05);
  oar.translate(-1.25, 0.52, 1.2);
  raft.push(oar);
  const cone = new THREE.ConeGeometry(0.55, 0.42, 9);
  cone.translate(0.5, 1.86, 1.7);
  hat.push(cone);
  const passengerSpots = [
    [-0.65, 0.82, -1.35],
    [0.05, 0.82, -0.15],
    [0.7, 0.82, 1.05],
  ];
  for (const [px, py, pz] of passengerSpots) {
    const robe = new THREE.CylinderGeometry(0.25, 0.38, 0.85, 6);
    robe.translate(px, py, pz);
    robes.push(robe);
    const head = new THREE.SphereGeometry(0.2, 6, 5);
    head.translate(px, py + 0.65, pz);
    figure.push(head);
    const straw = new THREE.ConeGeometry(0.46, 0.34, 8);
    straw.translate(px, py + 0.88, pz);
    hat.push(straw);
    const bag = new THREE.CylinderGeometry(0.16, 0.12, 0.34, 6);
    bag.translate(px + 0.34, py - 0.05, pz + 0.22);
    baskets.push(bag);
  }
  for (const sx of [-0.75, 0.05, 0.76]) {
    const bd = new THREE.SphereGeometry(0.2, 6, 4);
    bd.scale(1.7, 0.8, 0.9);
    bd.translate(sx, 0.52, -2.4);
    birds.push(bd);
    const neck = new THREE.CylinderGeometry(0.05, 0.08, 0.55, 4);
    neck.translate(sx, 0.82, -2.2);
    birds.push(neck);
    const bh = new THREE.SphereGeometry(0.1, 5, 4);
    bh.translate(sx, 1.1, -2.05);
    birds.push(bh);
    const beak = new THREE.ConeGeometry(0.045, 0.25, 4);
    beak.rotateX(-Math.PI / 2);
    beak.translate(sx, 1.1, -1.87);
    birds.push(beak);
  }
  const rm = mergedMesh(raft, mats.raft, true, true);
  const fm = mergedMesh(figure, mats.boat, true, true);
  const hm = mergedMesh(hat, mats.straw, true, false);
  const rbm = mergedMesh(robes, mats.teaCloth, true, true);
  const bkm = mergedMesh(baskets, mats.straw, true, false);
  const bm = mergedMesh(birds, mats.bird, false, false);
  if (rm) group.add(rm);
  if (fm) group.add(fm);
  if (hm) group.add(hm);
  if (rbm) group.add(rbm);
  if (bkm) group.add(bkm);
  if (bm) group.add(bm);
  group.scale.setScalar(scale);
  return group;
}

function makeRaftGeometry() {
  const group = makeRaft(1);
  group.updateMatrixWorld(true);
  const geos = [];
  group.traverse((obj) => {
    if (!obj.isMesh) return;
    let g = obj.geometry.clone();
    g.applyMatrix4(obj.matrixWorld);
    if (g.index) g = g.toNonIndexed();
    for (const key of Object.keys(g.attributes)) {
      if (key !== 'position' && key !== 'normal' && key !== 'uv') g.deleteAttribute(key);
    }
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!g.attributes.uv) {
      g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    }
    const col = obj.material.color || new THREE.Color(0xffffff);
    const n = g.attributes.position.count;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      arr[i * 3] = col.r;
      arr[i * 3 + 1] = col.g;
      arr[i * 3 + 2] = col.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    geos.push(g);
  });
  const geo = mergeGeometries(geos, false);
  geos.forEach((g) => g.dispose());
  return geo;
}

export function createRafts() {
  const root = new THREE.Group();
  const list = [];
  const defs = [
    [410, 42, 0.6, 1.0],
    [345, -30, 1.8, 0.86],
    [215, 36, 3.4, 1.06],
    [70, -38, 5.1, 0.92],
    [-185, 26, 0.9, 0.9],
    [-430, -24, 2.5, 1.0],
    [735, 34, 4.2, 0.82],
  ];
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.86 });
  const mesh = new THREE.InstancedMesh(makeRaftGeometry(), mat, defs.length + 1);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  root.add(mesh);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < defs.length; i++) {
    const [z0, off, phase, scale] = defs[i];
    list.push({ mesh, index: i, z0, off, phase, scale, moored: false });
  }
  const moored = { mesh, index: defs.length, z0: 486, off: 30 - riverCenter(486), phase: 0, scale: 1.12, moored: true };
  list.push(moored);
  for (const r of list) {
    dummy.position.set(riverCenter(r.z0) + r.off, WATER_Y + 0.12, r.z0);
    dummy.rotation.set(0, Math.PI / 2, 0);
    dummy.scale.setScalar(r.scale);
    dummy.updateMatrix();
    mesh.setMatrixAt(r.index, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  root.userData.rafts = list;
  return root;
}

export function createEgrets() {
  const group = new THREE.Group();
  const bodyParts = [];
  const torso = new THREE.SphereGeometry(0.3, 7, 5);
  torso.scale(1.0, 0.9, 2.1);
  bodyParts.push(torso);
  const neck = new THREE.CylinderGeometry(0.055, 0.09, 1.15, 5);
  neck.rotateX(0.55);
  neck.translate(0, 0.18, 0.72);
  bodyParts.push(neck);
  const head = new THREE.SphereGeometry(0.11, 6, 4);
  head.translate(0, 0.44, 1.16);
  bodyParts.push(head);
  const beak = new THREE.ConeGeometry(0.05, 0.42, 4);
  beak.rotateX(Math.PI / 2);
  beak.translate(0, 0.43, 1.44);
  bodyParts.push(beak);
  for (const sx of [-1, 1]) {
    const leg = new THREE.CylinderGeometry(0.018, 0.024, 0.72, 4);
    leg.translate(sx * 0.1, -0.42, -0.35);
    bodyParts.push(leg);
  }
  const bodyGeo = mergeParts(bodyParts);
  const wingGeo = new THREE.BufferGeometry();
  wingGeo.setAttribute('position', new THREE.Float32BufferAttribute([
    0, 0, -0.35, 2.65, 0.08, -0.05, 0.15, 0, 0.34,
    0, 0, -0.35, 2.35, -0.04, -0.65, 2.65, 0.08, -0.05,
  ], 3));
  wingGeo.computeVertexNormals();
  const wingMat = mats.egret.clone();
  wingMat.side = THREE.DoubleSide;
  const count = 22;
  const bodies = new THREE.InstancedMesh(bodyGeo, mats.egret, count);
  const leftWings = new THREE.InstancedMesh(wingGeo, wingMat, count);
  const rightWings = new THREE.InstancedMesh(wingGeo, wingMat, count);
  for (const m of [bodies, leftWings, rightWings]) {
    m.frustumCulled = false;
    m.castShadow = false;
    group.add(m);
  }
  const data = [];
  for (let i = 0; i < count; i++) {
    data.push({
      z0: -760 + i * 72 + (i % 5) * 13,
      off: (Math.sin(i * 7.7) * 0.5) * 62,
      h: 30 + (i % 7) * 11 + Math.sin(i * 3.1) * 7,
      phase: i * 1.37,
      speed: 0.22 + (i % 4) * 0.05,
      scale: 1.3 + (i % 3) * 0.35,
      dir: i % 4 === 0 ? -1 : 1,
    });
  }
  const dummy = new THREE.Object3D();
  function update(time) {
    for (let i = 0; i < data.length; i++) {
      const d = data[i];
      const z = d.z0 + Math.sin(time * d.speed + d.phase) * 34;
      const x = riverCenter(z) + d.off + Math.sin(time * 0.23 + d.phase * 1.7) * 9;
      const y = d.h + Math.sin(time * 0.55 + d.phase) * 3.2;
      const tangent = riverCenter(z + d.dir * 3) - riverCenter(z - d.dir * 3);
      const yaw = Math.atan2(tangent, d.dir * 6);
      const flap = Math.sin(time * 3.4 + d.phase) * 0.62;
      dummy.position.set(x, y, z);
      dummy.rotation.set(0, yaw, 0);
      dummy.scale.setScalar(d.scale);
      dummy.updateMatrix();
      bodies.setMatrixAt(i, dummy.matrix);
      dummy.rotation.set(0, yaw, flap);
      dummy.updateMatrix();
      leftWings.setMatrixAt(i, dummy.matrix);
      dummy.rotation.set(0, yaw, Math.PI - flap);
      dummy.updateMatrix();
      rightWings.setMatrixAt(i, dummy.matrix);
    }
    bodies.instanceMatrix.needsUpdate = true;
    leftWings.instanceMatrix.needsUpdate = true;
    rightWings.instanceMatrix.needsUpdate = true;
  }
  update(0);
  group.userData.update = update;
  return group;
}

function mergeParts(parts) {
  const geos = parts.map((g) => (g.index ? g.toNonIndexed() : g));
  const geo = mergeGeometries(geos, false);
  geos.forEach((g) => g.dispose());
  parts.forEach((g) => g.dispose());
  return geo;
}

export function updateRafts(rafts, time) {
  const dummy = new THREE.Object3D();
  for (const r of rafts) {
    if (r.moored) {
      dummy.position.set(riverCenter(r.z0) + r.off, WATER_Y + 0.12 + Math.sin(time * 0.8) * 0.03, r.z0);
      dummy.rotation.set(0, Math.PI / 2, Math.sin(time * 0.5) * 0.008);
    } else {
      const z = r.z0 + Math.sin(time * 0.035 + r.phase) * 15;
      const x = riverCenter(z) + r.off;
      dummy.position.set(x, WATER_Y + 0.12 + Math.sin(time * 0.8 + r.phase) * 0.045, z);
      dummy.rotation.set(0, Math.PI / 2 + Math.atan2(riverCenter(z + 2) - riverCenter(z - 2), 4) * 0.8, Math.sin(time * 0.55 + r.phase) * 0.012);
    }
    dummy.scale.setScalar(r.scale);
    dummy.updateMatrix();
    r.mesh.setMatrixAt(r.index, dummy.matrix);
  }
  rafts[0].mesh.instanceMatrix.needsUpdate = true;
}
