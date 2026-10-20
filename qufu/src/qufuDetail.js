import * as THREE from 'three';
import { mats, getPlaqueGeometry, plaqueMaterial, getSteleGeometry, steleMaterial, getCoupletGeometry, coupletMaterial } from './materials.js';
import { addBox, mergedMesh } from './geometry.js';
import { createRoof } from './roof.js';

function box(list, w, h, d, x, y, z, ry = 0) {
  addBox(list, w, h, d, x, y, z, ry);
}

export function createStele({ width = 3, height = 5, key = 'stele', depth = 0.7, base = true }) {
  const group = new THREE.Group();
  const baseH = base ? 0.55 : 0;
  if (base) {
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(width + 1.15, baseH, depth + 1.05), mats.marbleShade);
    plinth.position.y = baseH * 0.5;
    plinth.castShadow = true;
    plinth.receiveShadow = true;
    group.add(plinth);
  }
  const body = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), mats.stone);
  body.position.y = baseH + height * 0.5;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);
  const caps = [];
  box(caps, width + 0.32, 0.24, depth + 0.22, 0, baseH + height + 0.05, 0);
  box(caps, width * 0.72, 0.2, depth + 0.26, 0, baseH + height + 0.24, 0);
  const capMesh = mergedMesh(caps, mats.marbleShade, true, true);
  if (capMesh) group.add(capMesh);
  const face = new THREE.Mesh(getSteleGeometry(key, width * 0.8, height * 0.72), steleMaterial);
  face.position.set(0, baseH + height * 0.53, depth * 0.5 + 0.012);
  group.add(face);
  return group;
}

export function createStelePavilion({ w = 12, d = 10, h = 6, steleWidth = 3.2, steleHeight = 4.6, key = 'pavilion' } = {}) {
  const group = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(w + 2.4, 0.55, d + 2.2), mats.marbleShade);
  base.position.y = 0.275;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);
  const steps = createStairsMini(w * 0.42, 2.2, 0.55);
  steps.position.z = d * 0.5 + 1.1;
  group.add(steps);

  const pillars = [];
  const bases = [];
  const reach = 0.44;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const x = sx * (w / 2 - 0.7);
      const z = sz * (d / 2 - 0.7);
      const g = new THREE.CylinderGeometry(reach, reach * 1.12, h, 8);
      g.translate(x, h * 0.5 + 0.55, z);
      pillars.push(g);
      const b = new THREE.CylinderGeometry(reach * 1.45, reach * 1.65, 0.5, 8);
      b.translate(x, 0.8, z);
      bases.push(b);
    }
  }
  const pm = mergedMesh(pillars, mats.wallDark, true, true);
  if (pm) group.add(pm);
  const bm = mergedMesh(bases, mats.marbleShade, true, true);
  if (bm) group.add(bm);

  const beams = [];
  box(beams, w - 0.4, 0.55, 0.5, 0, h + 0.55, d / 2 - 0.7);
  box(beams, w - 0.4, 0.55, 0.5, 0, h + 0.55, -d / 2 + 0.7);
  box(beams, 0.5, 0.55, d - 0.4, w / 2 - 0.7, h + 0.55, 0);
  box(beams, 0.5, 0.55, d - 0.4, -w / 2 + 0.7, h + 0.55, 0);
  const teal = mergedMesh(beams, mats.teal, true, false);
  if (teal) group.add(teal);

  const roof = createRoof({
    width: w + 3.0,
    depth: d + 3.0,
    height: 3.3,
    cornerLift: 1.4,
    curve: 1.55,
    beasts: false,
    material: mats.roofGray,
  });
  roof.position.y = h + 0.7;
  group.add(roof);

  const stele = createStele({ width: steleWidth, height: steleHeight, key });
  stele.position.y = 0.55;
  group.add(stele);
  return group;
}

function createStairsMini(width, depth, height) {
  const group = new THREE.Group();
  const list = [];
  const steps = 4;
  for (let i = 0; i < steps; i++) {
    const top = height - (i * height) / steps;
    const zc = depth * 0.5 - (i + 0.5) * (depth / steps);
    addBox(list, width, top, depth / steps, 0, top * 0.5, zc);
  }
  const mesh = mergedMesh(list, mats.marbleShade, true, true);
  if (mesh) group.add(mesh);
  return group;
}

export function createLingxingGate() {
  const group = new THREE.Group();
  const stone = [];
  const gold = [];
  const red = [];
  const xs = [-24, -8, 8, 24];
  for (const x of xs) {
    const shaft = new THREE.CylinderGeometry(0.68, 0.82, 11.5, 8);
    shaft.translate(x, 5.75, 0);
    stone.push(shaft);
    addBox(stone, 2.0, 0.7, 2.0, x, 0.35, 0);
    addBox(stone, 1.7, 0.4, 1.7, x, 11.55, 0);
    for (let k = 0; k < 7; k++) {
      addBox(gold, 0.3, 0.3, 0.2, x, 1.7 + k * 1.35, 0.74);
      addBox(gold, 0.2, 0.3, 0.3, x + 0.74, 1.7 + k * 1.35, 0);
    }
  }
  for (const [x, w] of [[0, 15.5], [-16, 15.5], [16, 15.5]]) {
    addBox(red, w, 1.0, 1.1, x, 8.4, 0);
    addBox(red, w * 0.92, 0.5, 0.8, x, 9.15, 0);
    addBox(gold, w, 0.12, 1.2, x, 8.94, 0);
  }
  for (let x = -30; x <= 30; x += 2.4) {
    addBox(stone, 0.5, 0.55, 2.2, x, 0.28, 0);
  }
  const sm = mergedMesh(stone, mats.marble, true, true);
  if (sm) group.add(sm);
  const gm = mergedMesh(gold, mats.gold, true, false);
  if (gm) group.add(gm);
  const rm = mergedMesh(red, mats.wallDark, true, true);
  if (rm) group.add(rm);

  const centerRoof = createRoof({ width: 26, depth: 8.4, height: 3.2, cornerLift: 1.5, beasts: false, material: mats.roofYellow });
  centerRoof.position.y = 9.4;
  group.add(centerRoof);
  for (const sx of [-1, 1]) {
    const sideRoof = createRoof({ width: 16, depth: 7.4, height: 2.6, cornerLift: 1.3, beasts: false, material: mats.roofYellow });
    sideRoof.position.set(sx * 16, 9.4, 0);
    group.add(sideRoof);
  }
  const plaque = new THREE.Mesh(getPlaqueGeometry('棂星门', 4.4), plaqueMaterial);
  plaque.position.set(0, 7.35, 0.62);
  group.add(plaque);
  return group;
}

export function createArchway(text = '至圣林') {
  const group = new THREE.Group();
  const stone = [];
  const red = [];
  const gold = [];
  for (const sx of [-1, 1]) {
    addBox(stone, 1.5, 10.5, 1.5, sx * 8.5, 5.25, 0);
    addBox(stone, 2.3, 0.8, 2.1, sx * 8.5, 0.4, 0);
    addBox(stone, 2.0, 0.5, 1.9, sx * 8.5, 10.55, 0);
  }
  addBox(red, 20, 1.1, 1.2, 0, 8.7, 0);
  addBox(red, 16, 0.8, 1.0, 0, 9.55, 0);
  addBox(gold, 20, 0.14, 1.32, 0, 9.27, 0);
  for (let x = -12; x <= 12; x += 2.3) {
    addBox(red, 0.34, 1.3, 0.34, x, 10.15, 0);
  }
  const sm = mergedMesh(stone, mats.marble, true, true);
  if (sm) group.add(sm);
  const rm = mergedMesh(red, mats.wallDark, true, true);
  if (rm) group.add(rm);
  const gm = mergedMesh(gold, mats.gold, true, false);
  if (gm) group.add(gm);
  const roof = createRoof({ width: 24, depth: 6.0, height: 2.8, cornerLift: 1.3, beasts: false, material: mats.roofGray });
  roof.position.y = 10.9;
  group.add(roof);
  const plaque = new THREE.Mesh(getPlaqueGeometry(text, 4.6), plaqueMaterial);
  plaque.position.set(0, 8.85, 0.67);
  group.add(plaque);
  return group;
}

export function createCoupletBoard(text, width = 1.15, height = 5.4) {
  const group = new THREE.Group();
  const board = new THREE.Mesh(getCoupletGeometry(text, width, height), coupletMaterial);
  board.position.z = 0.06;
  group.add(board);
  const frame = [];
  addBox(frame, width + 0.18, 0.12, 0.12, 0, height * 0.5 + 0.05, 0.04);
  addBox(frame, width + 0.18, 0.12, 0.12, 0, -height * 0.5 - 0.05, 0.04);
  addBox(frame, 0.12, height + 0.2, 0.12, -width * 0.5 - 0.05, 0, 0.04);
  addBox(frame, 0.12, height + 0.2, 0.12, width * 0.5 + 0.05, 0, 0.04);
  const fm = mergedMesh(frame, mats.gold, false, false);
  if (fm) group.add(fm);
  return group;
}

export function createTombMound({ radius = 13, height = 6, key = 'tomb' } = {}) {
  const group = new THREE.Group();
  const moundGeo = new THREE.SphereGeometry(radius, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.5);
  moundGeo.scale(1, height / radius, 1);
  const mound = new THREE.Mesh(moundGeo, mats.grass);
  mound.castShadow = true;
  mound.receiveShadow = true;
  group.add(mound);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.94, 0.5, 6, 30), mats.stone);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.4;
  ring.receiveShadow = true;
  group.add(ring);
  const wall = [];
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    addBox(wall, 1.7, 0.85, 0.6, Math.cos(a) * radius * 1.03, 0.55, Math.sin(a) * radius * 1.03, -a);
  }
  const wm = mergedMesh(wall, mats.stone, true, true);
  if (wm) group.add(wm);
  const stele = createStele({ width: 3.6, height: 6.2, key });
  stele.position.set(0, 0.1, radius * 1.02 + 0.4);
  group.add(stele);
  return group;
}
