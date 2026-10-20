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
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const rivet = new THREE.SphereGeometry(0.045, 4, 3);
    rivet.translate(Math.cos(a) * 1.005, 1.36, Math.sin(a) * 1.005);
    gold.push(rivet);
  }
  const band = new THREE.TorusGeometry(0.88, 0.055, 4, 20);
  band.rotateX(Math.PI / 2);
  band.translate(0, 0.58, 0);
  gold.push(band);
  const mesh = mergedMesh(gold, mats.gold, true, true);
  if (mesh) group.add(mesh);
  const water = new THREE.Mesh(new THREE.CylinderGeometry(0.86, 0.86, 0.035, 18), mats.vatWater);
  water.position.y = 1.2;
  water.receiveShadow = true;
  group.add(water);
  const pads = [];
  for (let i = 0; i < 3; i++) {
    const pad = new THREE.CircleGeometry(0.16 + i * 0.03, 7);
    pad.rotateX(-Math.PI / 2);
    pad.translate(Math.cos(i * 2.1) * 0.48, 1.225, Math.sin(i * 2.1) * 0.48);
    pads.push(pad);
  }
  const pm = mergedMesh(pads, mats.blade, false, true);
  if (pm) group.add(pm);
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
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const slit = new THREE.BoxGeometry(0.1, 0.025, 0.16);
    slit.rotateY(a);
    slit.translate(Math.cos(a) * 0.66, 1.86, Math.sin(a) * 0.66);
    gold.push(slit);
  }
  const mesh = mergedMesh(gold, mats.copper, true, true);
  if (mesh) group.add(mesh);
  const ash = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.04, 12), mats.ash);
  ash.position.y = 0.045;
  ash.scale.set(1.2, 1, 1.2);
  group.add(ash);
  const sticks = [];
  for (let i = 0; i < 4; i++) {
    addCylinder(sticks, 0.012, 0.014, 0.52 + i * 0.04, 4, (i - 1.5) * 0.14, 0.27, (i % 2 - 0.5) * 0.12);
  }
  const sm = mergedMesh(sticks, mats.wood, false, false);
  if (sm) group.add(sm);
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
  const rnd = (n) => {
    const x = Math.sin(seed * 91.7 + n * 47.3) * 43758.5453;
    return x - Math.floor(x);
  };
  const trunkParts = [];
  const lean = (rnd(31) - 0.5) * 0.2;
  const trunkGeo = new THREE.CylinderGeometry(0.2, 0.52, height * 0.64, 7);
  trunkGeo.rotateZ(lean);
  trunkGeo.translate(0, height * 0.32, 0);
  trunkParts.push(trunkGeo);
  const branchCount = kind === 'cypress' ? 1 : 3;
  for (let i = 0; i < branchCount; i++) {
    const a = rnd(i + 40) * Math.PI * 2;
    const len = height * (0.2 + rnd(i + 50) * 0.16);
    const bg = new THREE.CylinderGeometry(0.05, 0.13, len, 5);
    bg.rotateZ(0.55 + rnd(i + 60) * 0.35);
    bg.rotateY(a);
    bg.translate(Math.cos(a) * len * 0.22, height * (0.5 + rnd(i + 70) * 0.18), Math.sin(a) * len * 0.22);
    trunkParts.push(bg);
  }
  const trunk = mergedMesh(trunkParts, mats.trunk, true, true);
  if (trunk) group.add(trunk);

  const foliage = [];
  if (kind === 'cypress') {
    const layers = 7;
    for (let i = 0; i < layers; i++) {
      const r = spread * (0.82 - i * 0.075) * (0.9 + rnd(i) * 0.2);
      const cone = new THREE.ConeGeometry(r, height * 0.23, 7);
      cone.rotateZ((rnd(i + 12) - 0.5) * 0.09);
      cone.translate((rnd(i + 3) - 0.5) * 0.35, height * (0.3 + i * 0.072), (rnd(i + 9) - 0.5) * 0.35);
      foliage.push(cone);
    }
    const tip = new THREE.ConeGeometry(spread * 0.16, height * 0.2, 6);
    tip.translate(0, height * 0.96, 0);
    foliage.push(tip);
  } else if (kind === 'pine') {
    const layers = 6;
    for (let i = 0; i < layers; i++) {
      const r = spread * (1 - i * 0.13) * (0.85 + rnd(i + 20) * 0.3);
      const cone = new THREE.ConeGeometry(r, height * 0.25, 8);
      cone.rotateZ((rnd(i + 31) - 0.5) * 0.12);
      cone.translate((rnd(i) - 0.5) * 0.9, height * (0.42 + i * 0.11), (rnd(i + 9) - 0.5) * 0.9);
      foliage.push(cone);
    }
    for (let i = 0; i < 2; i++) {
      const r = spread * (0.35 + rnd(i + 60) * 0.25);
      let blob = new THREE.IcosahedronGeometry(r, 0);
      blob.scale(1.15, 0.55, 1.15);
      blob.translate((rnd(i + 61) - 0.5) * spread * 1.4, height * (0.55 + rnd(i + 62) * 0.3), (rnd(i + 63) - 0.5) * spread * 1.4);
      foliage.push(blob);
    }
  } else {
    for (let i = 0; i < 5; i++) {
      const r = spread * (0.42 + rnd(i) * 0.55);
      const blob = new THREE.IcosahedronGeometry(r, 1);
      blob.scale(1, 0.78, 1);
      blob.translate(
        (rnd(i) - 0.5) * spread * 1.45,
        height * (0.5 + rnd(i + 3) * 0.38),
        (rnd(i + 6) - 0.5) * spread * 1.45
      );
      foliage.push(blob);
    }
  }
  for (let i = 0; i < foliage.length; i++) {
    if (foliage[i].index) {
      const flat = foliage[i].toNonIndexed();
      foliage[i].dispose();
      foliage[i] = flat;
    }
  }
  const mesh = mergedMesh(foliage, kind === 'pine' ? mats.pine : mats.blade, true, true);
  if (mesh) group.add(mesh);
  return group;
}

export function createRock() {
  const geo = new THREE.IcosahedronGeometry(1.4, 1);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const n = Math.sin(x * 5.1 + y * 3.7 + z * 6.3) * 0.5 + 0.5;
    const k = 0.78 + n * 0.4;
    pos.setXYZ(i, x * k, y * (0.7 + n * 0.45), z * k);
  }
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mats.rock);
  mesh.scale.set(1.4, 0.9, 1.1);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const group = new THREE.Group();
  mesh.position.y = 0.8;
  group.add(mesh);
  const chip = new THREE.Mesh(new THREE.IcosahedronGeometry(0.62, 0), mats.rock);
  chip.scale.set(1.3, 0.62, 0.9);
  chip.position.set(0.85, 0.35, 0.55);
  chip.rotation.y = 0.8;
  chip.castShadow = true;
  group.add(chip);
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
  const trim = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    addBox(trim, 0.038, 1.0, 0.038, Math.cos(a) * 0.395, 3.02, Math.sin(a) * 0.395, a);
  }
  const ring = new THREE.TorusGeometry(0.21, 0.025, 3, 10);
  ring.rotateX(Math.PI / 2);
  ring.translate(0, 2.6, 0);
  trim.push(ring);
  const tassel = new THREE.ConeGeometry(0.08, 0.42, 6);
  tassel.rotateX(Math.PI);
  tassel.translate(0, 2.4, 0);
  trim.push(tassel);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.26;
    addBox(trim, 0.02, 0.36, 0.02, Math.cos(a) * 0.06, 2.2, Math.sin(a) * 0.06);
  }
  const finial = new THREE.SphereGeometry(0.09, 6, 5);
  finial.translate(0, 3.52, 0);
  trim.push(finial);
  const tm = mergedMesh(trim, mats.gold, false, false);
  if (tm) group.add(tm);
  return group;
}

export function createShrub(scale = 1, seed = 1) {
  const group = new THREE.Group();
  const list = [];
  const rnd = (n) => {
    const x = Math.sin(seed * 37.1 + n * 91.7) * 43758.5453;
    return x - Math.floor(x);
  };
  for (let i = 0; i < 4; i++) {
    const r = 0.55 + rnd(i) * 0.45;
    const blob = new THREE.IcosahedronGeometry(r, 0);
    blob.scale(1, 0.72, 1);
    blob.translate((rnd(i + 3) - 0.5) * 1.3, 0.55 + rnd(i + 6) * 0.5, (rnd(i + 9) - 0.5) * 1.3);
    list.push(blob);
  }
  const mesh = mergedMesh(list, mats.blossom, true, true);
  if (mesh) group.add(mesh);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.18, 0.6, 5), mats.trunk);
  stem.position.y = 0.3;
  group.add(stem);
  group.scale.setScalar(scale);
  return group;
}

export function createFlagpole(height = 11.5) {
  const group = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.55, 1.5), mats.marbleShade);
  base.position.y = 0.27;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.15, height, 8), mats.wood);
  pole.position.y = height * 0.5 + 0.4;
  pole.castShadow = true;
  group.add(pole);
  const cross = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.14, 0.14), mats.wood);
  cross.position.y = height * 0.92 + 0.4;
  cross.castShadow = true;
  group.add(cross);
  const gold = [];
  const tip = new THREE.ConeGeometry(0.18, 0.6, 6);
  tip.translate(0, height + 0.7, 0);
  gold.push(tip);
  const ball = new THREE.SphereGeometry(0.16, 6, 5);
  ball.translate(0, height + 0.42, 0);
  gold.push(ball);
  const gm = mergedMesh(gold, mats.gold, true, false);
  if (gm) group.add(gm);
  return group;
}

export function createHangingLantern(scale = 1) {
  const group = new THREE.Group();
  const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.2, 5), mats.wood);
  rope.position.y = -0.6;
  group.add(rope);
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 8), mats.lantern);
  body.scale.set(1, 1.25, 1);
  body.position.y = -1.45;
  body.castShadow = true;
  group.add(body);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.16, 0.14, 8), mats.gold);
  cap.position.y = -1.04;
  group.add(cap);
  const tassel = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.5, 5), mats.gold);
  tassel.position.y = -2.0;
  group.add(tassel);
  const strands = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    addBox(strands, 0.018, 0.4, 0.018, Math.cos(a) * 0.07, -2.24, Math.sin(a) * 0.07);
  }
  const sm = mergedMesh(strands, mats.gold, false, false);
  if (sm) group.add(sm);
  group.scale.setScalar(scale);
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

export function createCrane(scale = 1) {
  const group = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.45, 1.1), mats.marbleShade);
  base.position.y = 0.225;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);
  const bronze = [];
  for (const sx of [-1, 1]) {
    addCylinder(bronze, 0.035, 0.045, 0.9, 5, sx * 0.11, 0.9, 0);
  }
  const body = new THREE.SphereGeometry(0.36, 8, 6);
  body.scale(1.55, 0.9, 0.82);
  body.translate(0, 1.48, 0);
  bronze.push(body);
  const neckPts = [
    new THREE.Vector3(0.28, 1.6, 0),
    new THREE.Vector3(0.58, 1.94, 0.03),
    new THREE.Vector3(0.52, 2.28, 0.05),
    new THREE.Vector3(0.66, 2.42, 0.06),
  ];
  bronze.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(neckPts), 8, 0.055, 5, false));
  const head = new THREE.SphereGeometry(0.1, 6, 5);
  head.translate(0.68, 2.45, 0.06);
  bronze.push(head);
  const beak = new THREE.ConeGeometry(0.055, 0.34, 5);
  beak.rotateZ(-Math.PI / 2);
  beak.translate(0.92, 2.43, 0.06);
  bronze.push(beak);
  const tail = new THREE.ConeGeometry(0.16, 0.6, 5);
  tail.rotateZ(Math.PI / 2.2);
  tail.translate(-0.52, 1.5, 0);
  bronze.push(tail);
  const mesh = mergedMesh(bronze, mats.bronze, true, true);
  if (mesh) group.add(mesh);
  group.scale.setScalar(scale);
  return group;
}

export function createDrainGrate(width = 2.0, depth = 0.9) {
  const group = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.BoxGeometry(width, 0.14, depth), mats.stone);
  frame.position.y = 0.07;
  frame.receiveShadow = true;
  group.add(frame);
  const slots = [];
  for (let i = 0; i < 5; i++) {
    addBox(slots, width * 0.12, 0.04, depth * 0.66, (i - 2) * width * 0.16, 0.135, 0);
  }
  const sm = mergedMesh(slots, mats.ash, false, true);
  if (sm) group.add(sm);
  return group;
}
