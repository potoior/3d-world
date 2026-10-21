import * as THREE from 'three';
import { mats } from './materials.js';
import { addBox, addCylinder, mergedMesh } from './geometry.js';

export function createLion(scale = 1) {
  const group = new THREE.Group();
  const pedestal = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.2, 3.6), mats.marbleShade);
  pedestal.position.y = 1.1;
  pedestal.castShadow = true;
  pedestal.receiveShadow = true;
  group.add(pedestal);

  const bronze = [];
  const body = new THREE.SphereGeometry(1.0, 12, 10);
  body.scale(1.0, 1.05, 1.35);
  body.translate(0, 3.2, -0.2);
  bronze.push(body);
  const chest = new THREE.SphereGeometry(0.78, 10, 8);
  chest.translate(0, 3.5, 0.85);
  bronze.push(chest);
  const head = new THREE.SphereGeometry(0.62, 12, 10);
  head.scale(0.95, 1.0, 0.9);
  head.translate(0, 4.45, 1.15);
  bronze.push(head);
  const mane = new THREE.TorusGeometry(0.62, 0.2, 8, 14);
  mane.rotateX(Math.PI / 2);
  mane.translate(0, 4.35, 1.0);
  bronze.push(mane);
  for (const sx of [-1, 1]) {
    const ear = new THREE.ConeGeometry(0.14, 0.32, 6);
    ear.translate(sx * 0.42, 4.95, 1.0);
    bronze.push(ear);
    const eye = new THREE.SphereGeometry(0.07, 6, 5);
    eye.translate(sx * 0.24, 4.6, 1.66);
    bronze.push(eye);
    for (const sz of [-1, 1]) {
      const leg = new THREE.CylinderGeometry(0.16, 0.2, 1.4, 8);
      leg.translate(sx * 0.55, 2.9 - 0.35, sz * 0.55 - 0.15);
      bronze.push(leg);
    }
  }
  const tail = new THREE.CylinderGeometry(0.09, 0.13, 1.3, 6);
  tail.rotateX(-0.5);
  tail.translate(0, 3.7, -1.65);
  bronze.push(tail);
  const mesh = mergedMesh(bronze, mats.bronze, true, true);
  if (mesh) group.add(mesh);

  group.scale.setScalar(scale);
  return group;
}

export function createVat(scale = 1) {
  const group = new THREE.Group();
  const gold = [];
  addCylinder(gold, 1.0, 0.85, 1.25, 18, 0, 0.72, 0);
  const rim = new THREE.TorusGeometry(1.0, 0.12, 6, 20);
  rim.rotateX(Math.PI / 2);
  rim.translate(0, 1.35, 0);
  gold.push(rim);
  for (const sx of [-1, 1]) {
    const handle = new THREE.TorusGeometry(0.28, 0.08, 6, 10, Math.PI);
    handle.rotateY(Math.PI / 2);
    handle.rotateZ(Math.PI / 2);
    handle.translate(sx * 1.02, 1.05, 0);
    gold.push(handle);
  }
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    addCylinder(gold, 0.12, 0.16, 0.35, 6, Math.cos(a) * 0.55, 0.18, Math.sin(a) * 0.55);
  }
  const mesh = mergedMesh(gold, mats.gold, true, true);
  if (mesh) group.add(mesh);
  group.scale.setScalar(scale);
  return group;
}

export function createIncenseBurner(scale = 1) {
  const group = new THREE.Group();
  const gold = [];
  addCylinder(gold, 0.62, 0.8, 1.0, 12, 0, 1.1, 0);
  addCylinder(gold, 0.72, 0.62, 0.22, 12, 0, 1.7, 0);
  const lid = new THREE.ConeGeometry(0.78, 0.85, 12);
  lid.translate(0, 2.22, 0);
  gold.push(lid);
  const knob = new THREE.SphereGeometry(0.16, 8, 6);
  knob.translate(0, 2.72, 0);
  gold.push(knob);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    addCylinder(gold, 0.09, 0.13, 0.7, 6, Math.cos(a) * 0.42, 0.35, Math.sin(a) * 0.42);
  }
  for (const sx of [-1, 1]) {
    const handle = new THREE.TorusGeometry(0.2, 0.06, 6, 10, Math.PI);
    handle.rotateY(Math.PI / 2);
    handle.rotateZ(Math.PI / 2);
    handle.translate(sx * 0.75, 1.55, 0);
    gold.push(handle);
  }
  const mesh = mergedMesh(gold, mats.copper, true, true);
  if (mesh) group.add(mesh);
  group.scale.setScalar(scale);
  return group;
}

export function createSundial() {
  const group = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.5, 1.4), mats.marbleShade);
  base.position.y = 0.75;
  base.castShadow = true;
  group.add(base);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.16, 28), mats.marble);
  disc.rotation.x = 0.42;
  disc.rotation.z = -0.12;
  disc.position.y = 2.05;
  disc.castShadow = true;
  group.add(disc);
  const gnomon = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.7, 0.5), mats.bronze);
  gnomon.position.y = 2.6;
  gnomon.rotation.x = -0.35;
  gnomon.castShadow = true;
  group.add(gnomon);
  return group;
}

export function createTree({ height = 9, spread = 3.4, kind = 'pine', seed = 1 } = {}) {
  const group = new THREE.Group();
  const trunkGeo = new THREE.CylinderGeometry(0.28, 0.48, height * 0.55, 7);
  const trunk = new THREE.Mesh(trunkGeo, mats.trunk);
  trunk.position.y = height * 0.275;
  trunk.castShadow = true;
  group.add(trunk);

  const rnd = (n) => {
    const x = Math.sin(seed * 91.7 + n * 47.3) * 43758.5453;
    return x - Math.floor(x);
  };
  const foliage = [];
  if (kind === 'pine') {
    const layers = 4;
    for (let i = 0; i < layers; i++) {
      const r = spread * (1 - i * 0.17);
      const cone = new THREE.ConeGeometry(r, height * 0.35, 8);
      cone.translate((rnd(i) - 0.5) * 0.5, height * (0.45 + i * 0.15), (rnd(i + 9) - 0.5) * 0.5);
      foliage.push(cone);
    }
  } else {
    for (let i = 0; i < 6; i++) {
      const r = spread * (0.5 + rnd(i) * 0.5);
      const blob = new THREE.IcosahedronGeometry(r, 1);
      blob.scale(1, 0.8, 1);
      blob.translate(
        (rnd(i) - 0.5) * spread * 1.3,
        height * (0.55 + rnd(i + 3) * 0.34),
        (rnd(i + 6) - 0.5) * spread * 1.3
      );
      foliage.push(blob);
    }
  }
  const mesh = mergedMesh(foliage, kind === 'pine' ? mats.pine : mats.blade, true, true);
  if (mesh) group.add(mesh);
  return group;
}

export function createRock() {
  const geo = new THREE.IcosahedronGeometry(1.4, 0);
  const mesh = new THREE.Mesh(geo, mats.rock);
  mesh.scale.set(1.4, 0.9, 1.1);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const group = new THREE.Group();
  mesh.position.y = 0.8;
  group.add(mesh);
  return group;
}

export function createLantern() {
  const group = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 3.6, 6), mats.wood);
  pole.position.y = 1.8;
  pole.castShadow = true;
  group.add(pole);
  const capTop = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.22, 0.18, 8), mats.gold);
  capTop.position.y = 3.35;
  group.add(capTop);
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), mats.lantern);
  body.scale.set(1, 1.25, 1);
  body.position.y = 3.02;
  body.castShadow = true;
  group.add(body);
  const capBot = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 0.14, 8), mats.gold);
  capBot.position.y = 2.66;
  group.add(capBot);
  return group;
}

export function createBrazier() {
  const group = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 0.3, 10), mats.marbleShade);
  base.position.y = 0.15;
  group.add(base);
  const gold = [];
  addCylinder(gold, 0.65, 0.9, 0.8, 12, 0, 0.75, 0);
  const bowl = new THREE.SphereGeometry(0.85, 12, 8, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5);
  bowl.translate(0, 1.15, 0);
  gold.push(bowl);
  const mesh = mergedMesh(gold, mats.bronze, true, true);
  if (mesh) group.add(mesh);
  return group;
}
