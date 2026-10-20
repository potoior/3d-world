import * as THREE from 'three';
import { mats } from './materials.js';
import { mergedMesh } from './geometry.js';
import { riverCenter, WATER_Y } from './terrain.js';

function makeRaft(scale = 1) {
  const group = new THREE.Group();
  const raft = [];
  const figure = [];
  const hat = [];
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
  const bm = mergedMesh(birds, mats.bird, false, false);
  if (rm) group.add(rm);
  if (fm) group.add(fm);
  if (hm) group.add(hm);
  if (bm) group.add(bm);
  group.scale.setScalar(scale);
  return group;
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
  for (const [z0, off, phase, scale] of defs) {
    const r = makeRaft(scale);
    r.position.set(riverCenter(z0) + off, WATER_Y + 0.12, z0);
    root.add(r);
    list.push({ group: r, z0, off, phase, scale });
  }
  const moored = makeRaft(1.12);
  moored.position.set(30, WATER_Y + 0.12, 486);
  moored.rotation.y = Math.PI / 2;
  root.add(moored);
  root.userData.rafts = list;
  return root;
}

export function createBirds() {
  const group = new THREE.Group();
  const geos = [];
  let s = 97;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  for (let i = 0; i < 46; i++) {
    const sc = 1.1 + rand() * 1.6;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([
      -sc, 0, 0, 0, sc * 0.32, 0.1, 0, 0.2, 0,
      sc, 0, 0, 0, sc * 0.32, 0.1, 0, 0.2, 0,
    ], 3));
    g.translate((rand() - 0.5) * 820, 48 + rand() * 130, -560 + rand() * 900);
    geos.push(g);
  }
  const mat = new THREE.MeshBasicMaterial({ color: 0x3f4b47, side: THREE.DoubleSide, transparent: true, opacity: 0.7 });
  const m = mergedMesh(geos, mat, false, false);
  if (m) group.add(m);
  return group;
}

export function updateRafts(rafts, time) {
  for (const r of rafts) {
    const z = r.z0 + Math.sin(time * 0.035 + r.phase) * 15;
    const x = riverCenter(z) + r.off;
    r.group.position.set(x, WATER_Y + 0.12 + Math.sin(time * 0.8 + r.phase) * 0.045, z);
    r.group.rotation.y = Math.PI / 2 + Math.atan2(riverCenter(z + 2) - riverCenter(z - 2), 4) * 0.8;
    r.group.rotation.z = Math.sin(time * 0.55 + r.phase) * 0.012;
  }
}
