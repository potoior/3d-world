import * as THREE from 'three';
import { mats } from './materials.js';
import { mergedMesh } from './geometry.js';
import { makePeakGeometry } from './peaks.js';
import { terrainHeight, riverCenter, riverHalfWidth, WATER_Y } from './terrain.js';

const XINGPING = { z: 486, dockX0: 76, dockX1: 30 };
export const colliders = [];

function addHouse(root, x, z, rot, w, d, floors) {
  const y = terrainHeight(x, z) - 0.1;
  const cr = Math.max(w, d) * 0.58;
  colliders.push({ name: '兴坪民居', minX: x - cr, maxX: x + cr, minZ: z - cr, maxZ: z + cr });
  const wall = [];
  const roof = [];
  const wood = [];
  const stone = [];
  const lamp = [];
  const put = (arr, geo) => {
    geo.rotateY(rot);
    geo.translate(x, y, z);
    arr.push(geo);
  };
  const found = new THREE.BoxGeometry(w + 0.55, 0.9, d + 0.55);
  found.translate(0, -0.38, 0);
  put(stone, found);
  const h1 = 3.1;
  let bw = w;
  let bd = d;
  let by = y;
  for (let f = 0; f < floors; f++) {
    const bh = f === 0 ? h1 : 2.7;
    const box = new THREE.BoxGeometry(bw, bh, bd);
    box.translate(0, by - y + bh / 2, 0);
    put(wall, box);
    const slab = new THREE.BoxGeometry(bw + 0.5, 0.22, bd + 0.5);
    slab.translate(0, by - y + bh - 0.1, 0);
    put(wood, slab);
    by += bh;
    if (f === 0 && floors > 1) {
      bw *= 0.92;
      bd *= 0.9;
    }
  }
  const roofY = by - y;
  for (const sx of [-1, 1]) {
    const slope = new THREE.BoxGeometry(bw * 0.65, 0.24, bd * 1.16);
    slope.rotateZ(sx * 0.52);
    slope.translate(sx * bw * 0.235, roofY + 0.82, 0);
    put(roof, slope);
  }
  const ridge = new THREE.BoxGeometry(0.42, 0.32, bd * 1.2);
  ridge.translate(0, roofY + 1.5, 0);
  put(roof, ridge);
  for (const sz of [-1, 1]) {
    const tip = new THREE.BoxGeometry(0.72, 0.4, 0.55);
    tip.rotateX(sz * 0.22);
    tip.translate(0, roofY + 1.62, sz * bd * 0.59);
    put(roof, tip);
  }
  for (const sx of [-1, 1]) {
    const eave = new THREE.BoxGeometry(bw * 0.34, 0.16, bd * 1.2);
    eave.rotateZ(sx * -0.16);
    eave.translate(sx * bw * 0.56, roofY + 0.18, 0);
    put(roof, eave);
  }
  const door = new THREE.BoxGeometry(1.15, 2.1, 0.18);
  door.translate(0, 1.05, -bd / 2 - 0.02);
  put(wood, door);
  const lintel = new THREE.BoxGeometry(1.5, 0.16, 0.22);
  lintel.translate(0, 2.2, -bd / 2 - 0.04);
  put(wood, lintel);
  for (const sx of [-1, 1]) {
    const win = new THREE.BoxGeometry(1.0, 1.0, 0.15);
    win.translate(sx * bw * 0.26, h1 + 1.35, -bd / 2 - 0.02);
    put(wood, win);
    const lampG = new THREE.BoxGeometry(0.42, 0.58, 0.42);
    lampG.translate(sx * bw * 0.34, roofY - 0.45, -bd / 2 - 0.38);
    put(lamp, lampG);
  }
  if (floors > 1) {
    for (let i = 0; i < 4; i++) {
      const post = new THREE.BoxGeometry(0.13, 1.0, 0.13);
      post.translate((i / 3 - 0.5) * bw * 0.86, h1 + 0.55, -bd / 2 - 0.6);
      put(wood, post);
    }
    const rail = new THREE.BoxGeometry(bw * 0.88, 0.12, 0.16);
    rail.translate(0, h1 + 1.05, -bd / 2 - 0.6);
    put(wood, rail);
  }
  const wm = mergedMesh(wall, mats.wall, true, true);
  const rm = mergedMesh(roof, mats.roof, true, true);
  const dm = mergedMesh(wood, mats.wood, true, true);
  const sm = mergedMesh(stone, mats.stone, true, true);
  const lm = mergedMesh(lamp, mats.lantern, false, false);
  if (wm) root.add(wm);
  if (sm) root.add(sm);
  if (rm) root.add(rm);
  if (dm) root.add(dm);
  if (lm) root.add(lm);
}

function addVillage(root, z0, z1, side, count) {
  let s = z0 * 3.1 + side * 7;
  const rand = () => {
    const v = Math.sin(s * 12.9898) * 43758.5453;
    s += 1.7;
    return v - Math.floor(v);
  };
  for (let i = 0; i < count; i++) {
    const z = z0 + ((z1 - z0) * (i + rand() * 0.6)) / count;
    const w = riverHalfWidth(z);
    const edge = riverCenter(z) + side * w;
    const x = edge + side * (24 + rand() * 85);
    const h = terrainHeight(x, z);
    if (h < 0.7) continue;
    if (side === 1 && Math.abs(z - 486) < 11 && x < 138) continue;
    const floors = rand() < 0.45 ? 2 : 1;
    addHouse(root, x, z, -side * Math.PI / 2 + (rand() - 0.5) * 0.45, 7.5 + rand() * 4, 5.8 + rand() * 2.5, floors);
  }
}

function createDock() {
  const root = new THREE.Group();
  const wood = [];
  const stone = [];
  const z = XINGPING.z;
  const x0 = XINGPING.dockX0;
  const x1 = XINGPING.dockX1;
  const len = x0 - x1;
  const deckY = (x) => 1.12 + ((x - x1) / len) * 0.84;
  for (let i = 0; i < 22; i++) {
    const g = new THREE.BoxGeometry(len / 21.5, 0.16, 5.8);
    const x = x1 + (i + 0.5) * (len / 22);
    g.translate(x, deckY(x), z);
    wood.push(g);
  }
  for (let i = 0; i < 5; i++) {
    for (const sz of [-1, 1]) {
      const x = x1 + 1.5 + i * (len - 3) / 4;
      const top = deckY(x);
      const p = new THREE.CylinderGeometry(0.18, 0.22, top + 0.5, 5);
      p.translate(x, top / 2 - 0.2, z + sz * 2.7);
      wood.push(p);
    }
  }
  const deck = new THREE.BoxGeometry(7.5, 0.3, 7.5);
  deck.translate(x0 + 2.5, terrainHeight(x0 + 2.5, z) + 0.12, z);
  stone.push(deck);
  const wm = mergedMesh(wood, mats.wood, true, true);
  const sm = mergedMesh(stone, mats.stone, true, true);
  if (wm) root.add(wm);
  if (sm) root.add(sm);
  return root;
}

export function createXingping() {
  const root = new THREE.Group();
  addVillage(root, 382, 640, 1, 23);
  addVillage(root, 690, 850, 1, 8);
  addVillage(root, -540, -330, -1, 12);
  addVillage(root, 170, 310, -1, 7);
  root.add(createDock());
  addDockDetails(root);
  addStaticBoat(root, 18, 470, 0.22, 0.92);
  addStaticBoat(root, 12, 500, -0.35, 1.0);
  addStaticBoat(root, 21, 450, 0.5, 0.84);
  addBambooPatch(root, 84, 512, 9, 1.05);
  addBambooPatch(root, 92, 546, 7, 0.9);
  const steps = [];
  for (let i = 0; i < 5; i++) {
    const g = new THREE.BoxGeometry(7 - i * 1.1, 0.34, 0.9);
    g.translate(XINGPING.dockX0 + 2 - i * 0.7, 1.6 - i * 0.23, XINGPING.z + 4.2 + i * 0.85);
    steps.push(g);
  }
  const sm = mergedMesh(steps, mats.stone, true, true);
  if (sm) root.add(sm);
  return root;
}

function addPagoda(root, x, y, z) {
  const stone = [];
  const base = new THREE.CylinderGeometry(3.0, 3.6, 1.4, 8);
  base.translate(x, y + 0.7, z);
  stone.push(base);
  for (let i = 0; i < 5; i++) {
    const r = 2.2 - i * 0.32;
    const body = new THREE.CylinderGeometry(r * 0.8, r, 2.3, 8);
    body.translate(x, y + 1.8 + i * 2.3, z);
    stone.push(body);
    const eave = new THREE.ConeGeometry(r * 1.35, 0.9, 8);
    eave.translate(x, y + 3.2 + i * 2.3, z);
    stone.push(eave);
  }
  const tip = new THREE.ConeGeometry(0.34, 2.0, 6);
  tip.translate(x, y + 14.0, z);
  stone.push(tip);
  const m = mergedMesh(stone, mats.stone, true, true);
  if (m) root.add(m);
}

export function createElephantHill() {
  const root = new THREE.Group();
  const z = 252;
  const c = riverCenter(z);
  const w = riverHalfWidth(z);
  const archX = c - w - 4;
  const base = Math.max(0.5, terrainHeight(archX - 25, z));
  const ring = new THREE.TorusGeometry(16, 7.2, 10, 24, Math.PI);
  ring.rotateY(0.92);
  ring.translate(archX, WATER_Y - 0.35, z);
  const arch = new THREE.Mesh(ring, mats.karst);
  const col = new Float32Array(ring.attributes.position.count * 3);
  for (let i = 0; i < ring.attributes.position.count; i++) {
    const t = i / ring.attributes.position.count;
    col[i * 3] = 0.5 + 0.1 * Math.sin(t * 61);
    col[i * 3 + 1] = 0.55 + 0.1 * Math.sin(t * 43);
    col[i * 3 + 2] = 0.48 + 0.08 * Math.sin(t * 37);
  }
  ring.setAttribute('color', new THREE.BufferAttribute(col, 3));
  arch.name = 'elephantArch';
  arch.castShadow = true;
  arch.receiveShadow = true;
  root.add(arch);
  colliders.push({ name: '象鼻山', minX: c - w - 70, maxX: c - w + 5, minZ: z - 30, maxZ: z + 55 });
  const body = new THREE.Mesh(makePeakGeometry(c - w - 41, z + 12, 43, 92, base, 0x7f8a7d, 10, 7), mats.karst);
  body.castShadow = true;
  root.add(body);
  const head = new THREE.Mesh(makePeakGeometry(archX - 12, z + 8, 22, 54, base, 0x899385, 8, 5), mats.karst);
  head.castShadow = true;
  root.add(head);
  addPagoda(root, c - w - 44, base + 71, z + 10);
  const rubble = [];
  const moss = [];
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    const rad = 21 + ((i * 13) % 9);
    const rx = archX + Math.cos(a) * rad * 1.25;
    const rz = z + Math.sin(a) * rad;
    const rh = terrainHeight(rx, rz);
    if (rh < -0.6) continue;
    const rs = 0.8 + ((i * 17) % 23) / 9;
    const g = new THREE.IcosahedronGeometry(rs, 0);
    g.scale(1.3, 0.75, 1.05);
    g.rotateY(i * 1.3);
    g.translate(rx, Math.max(WATER_Y + 0.1, rh) + rs * 0.2, rz);
    rubble.push(g);
  }
  for (let i = 0; i < 16; i++) {
    const th = 0.16 + (i / 15) * (Math.PI - 0.32);
    const rad = 22.4 + (i % 3) * 0.5;
    const ox = Math.cos(th) * rad;
    const oy = Math.sin(th) * rad;
    const px = archX + ox * Math.cos(0.92);
    const pz = z - ox * Math.sin(0.92);
    const py = WATER_Y - 0.35 + oy;
    const g = new THREE.PlaneGeometry(1.1 + (i % 4) * 0.35, 2.0 + (i % 3) * 0.7);
    g.rotateY(Math.atan2(Math.cos(th), -Math.sin(th)) + (i % 3) * 0.3);
    g.rotateX(0.3 + (i % 4) * 0.2);
    g.translate(px, py, pz);
    moss.push(g);
  }
  const rbm = mergedMesh(rubble, mats.stone, true, true);
  const msm = mergedMesh(moss, mats.leaf, false, true);
  if (rbm) root.add(rbm);
  if (msm) root.add(msm);
  addElephantTrees(root);
  addPlatform(root, 158, 250, 0.69, 0);
  addBambooPatch(root, 150, 232, 7, 0.9);
  colliders.push({ name: '象鼻山观景台', minX: 152, maxX: 164, minZ: 244, maxZ: 256 });
  return root;
}

export function createNineHorseCliff() {
  const root = new THREE.Group();
  const z = -105;
  const c = riverCenter(z);
  const w = riverHalfWidth(z);
  const x = c - w - 10;
  const base = terrainHeight(x - 15, z);
  const geo = new THREE.PlaneGeometry(124, 132, 18, 12);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const px = pos.getX(i);
    const py = pos.getY(i);
    const d = Math.sin(px * 0.17 + py * 0.09) * 3.4 + Math.sin(px * 0.51 - py * 0.13) * 1.4;
    pos.setZ(i, d);
  }
  geo.computeVertexNormals();
  geo.rotateY(Math.PI / 2);
  geo.translate(x, base + 66, z);
  colliders.push({ name: '九马画山', minX: x - 14, maxX: x + 14, minZ: z - 66, maxZ: z + 66 });
  const face = new THREE.Mesh(geo, mats.cliff);
  face.name = 'nineHorseFace';
  face.castShadow = true;
  face.receiveShadow = true;
  root.add(face);
  const b1 = new THREE.Mesh(makePeakGeometry(x - 50, z - 72, 45, 118, base, 0x778675, 9, 6), mats.karst);
  const b2 = new THREE.Mesh(makePeakGeometry(x - 58, z + 58, 38, 96, base, 0x879184, 9, 6), mats.karst);
  b1.castShadow = true;
  b2.castShadow = true;
  root.add(b1, b2);
  addPlatform(root, 36, -108, Math.PI / 2, 1);
  addBambooPatch(root, 30, -136, 8, 1.0);
  addBambooPatch(root, 28, -78, 6, 0.85);
  addBambooPatch(root, -112, -158, 7, 0.95);
  const rubble = [];
  for (let i = 0; i < 24; i++) {
    const rz = -156 + i * 4.6 + (i % 3) * 1.4;
    const rx = -102 - (i % 4) * 1.8;
    const s = 0.9 + ((i * 37) % 23) / 9;
    const g = new THREE.IcosahedronGeometry(s, 0);
    g.scale(1.3, 0.7, 1.05);
    g.rotateY(i * 1.7);
    g.translate(rx, Math.max(0.8, terrainHeight(rx, rz)) + s * 0.18, rz);
    rubble.push(g);
  }
  const rm = mergedMesh(rubble, mats.stone, true, true);
  if (rm) root.add(rm);
  colliders.push({ name: '九马画山观景台', minX: 30, maxX: 42, minZ: -114, maxZ: -102 });
  return root;
}

function addDockDetails(root) {
  const wood = [];
  const stone = [];
  const lantern = [];
  const rope = [];
  const z = XINGPING.z;
  const x0 = XINGPING.dockX0;
  const x1 = XINGPING.dockX1;
  const len = x0 - x1;
  const deckY = (x) => 1.12 + ((x - x1) / len) * 0.84;
  for (let i = 0; i < 12; i++) {
    const x = x1 + 1 + i * (len - 2) / 11;
    const y = deckY(x) - 0.22;
    const beam = new THREE.BoxGeometry(0.32, 0.26, 6.4);
    beam.translate(x, y, z);
    wood.push(beam);
  }
  for (const x of [34, 47, 61, 73]) {
    for (const sz of [-1, 1]) {
      const top = deckY(x);
      const post = new THREE.CylinderGeometry(0.16, 0.2, 1.15, 6);
      post.translate(x, top + 0.48, z + sz * 3.05);
      wood.push(post);
      const cap = new THREE.SphereGeometry(0.19, 6, 4);
      cap.translate(x, top + 1.06, z + sz * 3.05);
      wood.push(cap);
      for (let r = 0; r < 2; r++) {
        const ring = new THREE.TorusGeometry(0.24, 0.035, 4, 8);
        ring.rotateX(Math.PI / 2);
        ring.translate(x, top + 0.78 - r * 0.12, z + sz * 3.05);
        rope.push(ring);
      }
    }
  }
  for (const x of [38, 58, 74]) {
    const top = deckY(x);
    const post = new THREE.CylinderGeometry(0.07, 0.1, 2.5, 5);
    post.translate(x, top + 1.25, z + 3.35);
    wood.push(post);
    const arm = new THREE.BoxGeometry(0.62, 0.08, 0.08);
    arm.translate(x - 0.28, top + 2.42, z + 3.35);
    wood.push(arm);
    const lamp = new THREE.BoxGeometry(0.32, 0.46, 0.32);
    lamp.translate(x - 0.55, top + 2.16, z + 3.35);
    lantern.push(lamp);
    const cap = new THREE.ConeGeometry(0.28, 0.16, 4);
    cap.translate(x - 0.55, top + 2.44, z + 3.35);
    lantern.push(cap);
  }
  const edge = new THREE.BoxGeometry(len + 0.6, 0.28, 0.36);
  edge.translate((x0 + x1) / 2, 1.03, z + 3.0);
  stone.push(edge);
  const posts = [[74, 491], [68, 493], [80, 493]];
  for (const [x, zz] of posts) {
    const p = new THREE.CylinderGeometry(0.13, 0.17, 2.8, 6);
    p.translate(x, 2.3, zz);
    wood.push(p);
  }
  const canopy = new THREE.BoxGeometry(9, 0.2, 4.6);
  canopy.translate(73.5, 3.62, 492);
  stone.push(canopy);
  const wm = mergedMesh(wood, mats.wood, true, true);
  const sm = mergedMesh(stone, mats.stone, true, true);
  const lm = mergedMesh(lantern, mats.lantern, false, false);
  const rm = mergedMesh(rope, mats.straw, false, false);
  if (wm) root.add(wm);
  if (sm) root.add(sm);
  if (lm) root.add(lm);
  if (rm) root.add(rm);
}

function addBambooPatch(root, x, z, count = 10, scale = 1) {
  const poles = [];
  const leaves = [];
  const base = terrainHeight(x, z);
  if (base < 0.8) return;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + Math.sin(i * 7.1);
    const rad = (i % 3) * 0.9 * scale;
    const h = (5 + ((i * 37) % 60) / 10) * scale;
    const px = x + Math.cos(a) * rad;
    const pz = z + Math.sin(a) * rad;
    const pole = new THREE.CylinderGeometry(0.045, 0.08, h, 4, 3);
    pole.rotateZ((Math.sin(i * 3.3) * 0.08));
    pole.translate(px, base + h * 0.5, pz);
    poles.push(pole);
    for (let l = 0; l < 3; l++) {
      const lf = new THREE.PlaneGeometry(0.42 * scale, 1.0 * scale);
      lf.rotateY(i * 1.7 + l * 1.2);
      lf.rotateX(0.5 + l * 0.16);
      lf.translate(px + Math.sin(i + l) * 0.8, base + h - 0.4 - l * 0.7, pz + Math.cos(i + l) * 0.8);
      leaves.push(lf);
    }
  }
  const pm = mergedMesh(poles, mats.bamboo, true, true);
  const lm = mergedMesh(leaves, mats.leaf, false, true);
  if (pm) root.add(pm);
  if (lm) root.add(lm);
}

function addPlatform(root, x, z, rot, signIndex) {
  const wood = [];
  const stone = [];
  const lantern = [];
  const y = terrainHeight(x, z) + 0.1;
  const put = (arr, g) => {
    g.rotateY(rot);
    g.translate(x, y, z);
    arr.push(g);
  };
  for (let i = 0; i < 14; i++) {
    const g = new THREE.BoxGeometry(0.55, 0.16, 5.4);
    g.translate((i - 6.5) * 0.58, 1.05, 0);
    put(wood, g);
  }
  for (let i = 0; i < 4; i++) {
    const g = new THREE.BoxGeometry(8.4, 0.3, 0.34);
    g.translate(0, 0.86 + i * 0.001, -2.4 + i * 1.6);
    put(stone, g);
  }
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const p = new THREE.CylinderGeometry(0.14, 0.18, 1.4, 5);
      p.translate(sx * 3.9, 1.65, sz * 2.5);
      put(wood, p);
    }
    const rail = new THREE.BoxGeometry(0.16, 0.12, 5.1);
    rail.translate(sx * 3.9, 2.28, 0);
    put(wood, rail);
  }
  const railBack = new THREE.BoxGeometry(8.0, 0.12, 0.16);
  railBack.translate(0, 2.28, -2.5);
  put(wood, railBack);
  for (const sx of [-1, 1]) {
    const lp = new THREE.CylinderGeometry(0.07, 0.09, 2.5, 5);
    lp.translate(sx * 3.4, 2.05, 2.2);
    put(wood, lp);
    const lamp = new THREE.BoxGeometry(0.3, 0.42, 0.3);
    lamp.translate(sx * 3.4, 3.18, 2.2);
    put(lantern, lamp);
  }
  const signGeo = new THREE.PlaneGeometry(3.1, 1.16);
  const suv = signGeo.attributes.uv;
  for (let i = 0; i < suv.count; i++) suv.setX(i, suv.getX(i) * 0.5 + signIndex * 0.5);
  signGeo.translate(0, 2.7, -2.62);
  signGeo.rotateY(rot);
  signGeo.translate(x, y, z);
  const sign = new THREE.Mesh(signGeo, mats.sign);
  sign.castShadow = false;
  root.add(sign);
  const wm = mergedMesh(wood, mats.wood, true, true);
  const sm = mergedMesh(stone, mats.stone, true, true);
  const lm = mergedMesh(lantern, mats.lantern, false, false);
  if (wm) root.add(wm);
  if (sm) root.add(sm);
  if (lm) root.add(lm);
}

function addStaticBoat(root, x, z, rot, scale = 1) {
  const hull = [];
  const wood = [];
  const roof = [];
  const lantern = [];
  const birds = [];
  const base = WATER_Y + 0.2;
  const put = (arr, g, ox, oy, oz) => {
    g.translate(ox, oy, oz);
    g.rotateY(rot);
    g.translate(x, 0, z);
    arr.push(g);
  };
  const body = new THREE.SphereGeometry(1, 9, 6);
  body.scale(1.25 * scale, 0.6 * scale, 3.9 * scale);
  put(hull, body, 0, base + 0.18, 0);
  const deck = new THREE.BoxGeometry(2.0 * scale, 0.14, 6.2 * scale);
  put(wood, deck, 0, base + 0.62, 0);
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const pole = new THREE.CylinderGeometry(0.06, 0.08, 1.7, 4);
      put(wood, pole, sx * 0.95 * scale, base + 1.55, (i - 1) * 1.7 * scale);
    }
  }
  const cabin = new THREE.BoxGeometry(2.5 * scale, 0.18, 3.5 * scale);
  put(roof, cabin, 0, base + 2.42, 0.15 * scale);
  const ridge = new THREE.BoxGeometry(0.22, 0.2, 3.7 * scale);
  put(roof, ridge, 0, base + 2.56, 0.15 * scale);
  const lamp = new THREE.BoxGeometry(0.28, 0.4, 0.28);
  put(lantern, lamp, 0, base + 1.34, -2.6 * scale);
  const post = new THREE.CylinderGeometry(0.05, 0.06, 1.1, 4);
  put(wood, post, 0, base + 0.8, -2.6 * scale);
  for (const sx of [-0.7, 0.7]) {
    const bd = new THREE.SphereGeometry(0.2, 6, 4);
    bd.scale(1.7, 0.8, 0.9);
    put(birds, bd, sx * scale, base + 1.08, -2.3 * scale);
    const neck = new THREE.CylinderGeometry(0.05, 0.08, 0.55, 4);
    put(birds, neck, sx * scale, base + 1.38, -2.1 * scale);
    const head = new THREE.SphereGeometry(0.1, 5, 4);
    put(birds, head, sx * scale, base + 1.66, -1.95 * scale);
    const beak = new THREE.ConeGeometry(0.045, 0.25, 4);
    beak.rotateX(-Math.PI / 2);
    put(birds, beak, sx * scale, base + 1.66, -1.77 * scale);
  }
  const hm = mergedMesh(hull, mats.boat, true, true);
  const wm = mergedMesh(wood, mats.wood, true, true);
  const rm = mergedMesh(roof, mats.roof, true, true);
  const lm = mergedMesh(lantern, mats.lantern, false, false);
  const bm = mergedMesh(birds, mats.bird, false, false);
  for (const m of [hm, wm, rm, lm, bm]) if (m) root.add(m);
}

function addElephantTrees(root) {
  const trunks = [];
  const crowns = [];
  const spots = [[12, 288], [8, 238], [26, 302], [38, 318], [34, 220], [58, 300]];
  for (const [x, z] of spots) {
    const base = terrainHeight(x, z);
    if (base < 1.1) continue;
    const h = 6 + ((x + z) % 5);
    const tr = new THREE.CylinderGeometry(0.2, 0.36, h * 0.56, 5);
    tr.translate(x, base + h * 0.28, z);
    trunks.push(tr);
    for (let b = 0; b < 3; b++) {
      const cr = new THREE.IcosahedronGeometry(1.9 + (b % 2) * 0.7, 0);
      cr.scale(1.2, 0.76, 1.15);
      cr.translate(x + Math.sin(b * 2.1) * 1.3, base + h * 0.58 + b * 1.2, z + Math.cos(b * 1.7) * 1.3);
      crowns.push(cr);
    }
  }
  const tm = mergedMesh(trunks, mats.trunk, true, true);
  const cm = mergedMesh(crowns, mats.broad, true, true);
  if (tm) root.add(tm);
  if (cm) root.add(cm);
}
