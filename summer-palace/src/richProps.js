import * as THREE from 'three';
import { mats } from './materials.js';
import { addBox, addCylinder, mergedMesh } from './geometry.js';

function rnd(seed, n) {
  const v = Math.sin(seed * 47.9 + n * 83.1) * 43758.5453;
  return v - Math.floor(v);
}

function bar2d(list, w, h, d, x, y, z, rz = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (rz) g.rotateZ(rz);
  g.translate(x, y, z);
  list.push(g);
}

export function createTaihuRock({ x = 0, z = 0, scale = 1, seed = 1, cave = false, spread = 1 }) {
  const group = new THREE.Group();
  const rocks = [];
  const lips = [];
  const holes = [];
  const moss = [];
  const count = cave ? 10 : 6;
  for (let i = 0; i < count; i++) {
    const tall = i < Math.round(count * 0.55);
    const g = new THREE.DodecahedronGeometry((0.75 + rnd(seed, i) * 0.85) * scale, 0);
    g.scale(
      (0.75 + rnd(seed, i + 4) * 0.7) * spread,
      tall ? 1.8 + rnd(seed, i + 7) * 1.3 : 0.9 + rnd(seed, i + 7) * 0.92,
      0.72 + rnd(seed, i + 11) * 0.8
    );
    g.rotateY(rnd(seed, i + 15) * 6.28);
    g.rotateZ((rnd(seed, i + 19) - 0.5) * 0.42);
    const a = cave ? (i / count) * Math.PI * 2 : rnd(seed, i + 23) * 6.28;
    const r = cave ? (1.55 + rnd(seed, i + 27) * 0.55) * spread : rnd(seed, i + 31) * 1.75 * spread;
    g.translate(
      x + Math.cos(a) * r,
      0.5 + (tall ? 0.9 : 0.28) + rnd(seed, i + 35) * 0.35,
      z + Math.sin(a) * r
    );
    rocks.push(g);
    if (i % 2 === 0) {
      const m = new THREE.IcosahedronGeometry(0.45 + rnd(seed, i + 41) * 0.4, 0);
      m.scale(1.35, 0.25, 1.15);
      m.translate(x + Math.cos(a) * r * 0.9, 0.33, z + Math.sin(a) * r * 0.9);
      moss.push(m);
    }
  }
  for (let i = 0; i < 5; i++) {
    const shard = new THREE.ConeGeometry((0.18 + rnd(seed, i + 81) * 0.22) * scale, (0.8 + rnd(seed, i + 82) * 0.9) * scale, 5);
    shard.rotateZ((rnd(seed, i + 83) - 0.5) * 0.7);
    shard.rotateY(rnd(seed, i + 84) * 6.28);
    shard.translate(x + (rnd(seed, i + 85) - 0.5) * 1.5 * spread, (0.75 + rnd(seed, i + 86) * 0.75) * scale, z + (rnd(seed, i + 87) - 0.5) * 1.5 * spread);
    rocks.push(shard);
  }
  const lichen = [];
  for (let i = 0; i < (cave ? 10 : 6); i++) {
    const l = new THREE.CircleGeometry((0.13 + rnd(seed, i + 91) * 0.22) * scale, 6);
    l.rotateX(-Math.PI / 2 + (rnd(seed, i + 92) - 0.5) * 1.1);
    l.rotateZ(rnd(seed, i + 93) * 6.28);
    l.translate(x + (rnd(seed, i + 94) - 0.5) * 2.1 * spread, (0.55 + rnd(seed, i + 95) * 1.5) * scale, z + (rnd(seed, i + 96) - 0.5) * 2.1 * spread);
    lichen.push(l);
  }
  for (let i = 0; i < 8; i++) {
    const tuft = new THREE.ConeGeometry(0.1 + rnd(seed, i + 97) * 0.1, 0.28 + rnd(seed, i + 98) * 0.3, 4);
    tuft.translate(x + (rnd(seed, i + 99) - 0.5) * 2.2 * spread, 0.35, z + (rnd(seed, i + 100) - 0.5) * 2.2 * spread);
    moss.push(tuft);
  }
  for (let i = 0; i < (cave ? 5 : 3); i++) {
    const hr = (0.2 + rnd(seed, i + 51) * 0.3) * scale;
    const px = x + (rnd(seed, i + 55) - 0.5) * 1.8 * spread;
    const pz = z + (rnd(seed, i + 59) - 0.5) * 1.8 * spread;
    const py = 0.85 + rnd(seed, i + 63) * 1.5;
    const q = new THREE.Quaternion().setFromEuler(
      new THREE.Euler((rnd(seed, i + 67) - 0.5) * 0.5, rnd(seed, i + 71) * 6.28, (rnd(seed, i + 75) - 0.5) * 1.2)
    );
    const lip = new THREE.TorusGeometry(hr, 0.075 * scale, 5, 12);
    lip.applyQuaternion(q);
    lip.translate(px, py, pz);
    lips.push(lip);
    const hole = new THREE.SphereGeometry(hr * 0.9, 8, 6);
    hole.scale(1, 1, 0.16);
    hole.applyQuaternion(q);
    hole.translate(px, py, pz);
    holes.push(hole);
  }
  if (cave) {
    const dark = new THREE.SphereGeometry(1.35 * spread, 12, 8);
    dark.scale(1, 1.25, 0.55);
    dark.translate(x, 1.15, z);
    holes.push(dark);
  }
  const rm = mergedMesh(rocks, mats.rock, true, true);
  if (rm) group.add(rm);
  const lm = mergedMesh(lips, mats.stone, true, true);
  if (lm) group.add(lm);
  const hm = mergedMesh(holes, mats.wood, false, false);
  if (hm) group.add(hm);
  const mm = mergedMesh(moss, mats.rockMoss, true, true);
  if (mm) group.add(mm);
  const lm2 = mergedMesh(lichen, mats.lichen, false, false);
  if (lm2) group.add(lm2);
  group.userData.collider = { x, z, r: (cave ? 2.5 : 1.7) * scale };
  return group;
}

export function createFloweringShrub({ x = 0, z = 0, radius = 1.6, height = 1.7, seed = 1, variant = null }) {
  const group = new THREE.Group();
  const r = rnd(seed, 3);
  const base = new THREE.Group();
  const blobs = [];
  for (let i = 0; i < 10; i++) {
    const rr = radius * (0.34 + rnd(seed, i) * 0.38);
    const b = new THREE.IcosahedronGeometry(rr, 1);
    b.scale(1.15, 0.78, 1.05);
    b.translate(
      x + (rnd(seed, i + 5) - 0.5) * radius * 1.3,
      height * (0.3 + rnd(seed, i + 9) * 0.38),
      z + (rnd(seed, i + 13) - 0.5) * radius * 1.3
    );
    blobs.push(b);
  }
  const bm = mergedMesh(blobs, mats.shrub, true, true);
  if (bm) base.add(bm);
  const flowers = [];
  const petals = [];
  for (let i = 0; i < 22; i++) {
    const f = new THREE.SphereGeometry(0.07 + rnd(seed, i + 21) * 0.09, 6, 4);
    f.scale(1.2, 0.7, 1.2);
    f.translate(
      x + (rnd(seed, i + 25) - 0.5) * radius * 1.55,
      height * (0.42 + rnd(seed, i + 29) * 0.5),
      z + (rnd(seed, i + 33) - 0.5) * radius * 1.55
    );
    flowers.push(f);
    if (i % 4 === 0) {
      const p = new THREE.ConeGeometry(0.05, 0.18, 4);
      p.rotateZ((rnd(seed, i + 41) - 0.5) * 1.2);
      p.translate(
        x + (rnd(seed, i + 42) - 0.5) * radius * 1.6,
        height * (0.48 + rnd(seed, i + 43) * 0.45),
        z + (rnd(seed, i + 44) - 0.5) * radius * 1.6
      );
      petals.push(p);
    }
  }
  const flowerMat = variant || (r > 0.72 ? mats.blossomRose : r > 0.42 ? mats.blossomPale : mats.blossomGold);
  const fm = mergedMesh(flowers, flowerMat, false, false);
  if (fm) base.add(fm);
  const pm = mergedMesh(petals, mats.lichen, false, false);
  if (pm) base.add(pm);
  group.add(base);
  return group;
}

export function createPottedPlant({ x = 0, z = 0, scale = 1, seed = 1, pine = false }) {
  const group = new THREE.Group();
  const pots = [];
  addCylinder(pots, 0.42 * scale, 0.3 * scale, 0.55 * scale, 8, x, 0.28 * scale, z);
  addCylinder(pots, 0.48 * scale, 0.46 * scale, 0.1 * scale, 8, x, 0.57 * scale, z);
  const pm = mergedMesh(pots, mats.terracotta, true, true);
  if (pm) group.add(pm);
  const leaves = [];
  if (pine) {
    const t = new THREE.CylinderGeometry(0.05 * scale, 0.09 * scale, 1.1 * scale, 5);
    t.translate(x, 1.1 * scale, z);
    leaves.push(t);
    for (let i = 0; i < 3; i++) {
      const c = new THREE.ConeGeometry((0.68 - i * 0.14) * scale, 0.55 * scale, 7);
      c.translate(x, (1.15 + i * 0.42) * scale, z);
      leaves.push(c);
    }
  } else {
    const off = (rnd(seed, 1) - 0.5) * 0.3 * scale;
    const t = new THREE.CylinderGeometry(0.04 * scale, 0.07 * scale, 0.95 * scale, 5);
    t.translate(x + off, 1.0 * scale, z);
    leaves.push(t);
    for (let i = 0; i < 7; i++) {
      const s = new THREE.IcosahedronGeometry((0.24 + rnd(seed, i + 4) * 0.17) * scale, 1);
      s.scale(1.1, 0.9, 1);
      s.translate(
        x + off + (rnd(seed, i + 8) - 0.5) * 0.72 * scale,
        (1.15 + rnd(seed, i + 12) * 0.55) * scale,
        z + (rnd(seed, i + 16) - 0.5) * 0.72 * scale
      );
      leaves.push(s);
    }
  }
  const lm = mergedMesh(leaves, pine ? mats.pine : mats.shrub, true, true);
  if (lm) group.add(lm);
  return group;
}

export function createBench({ x = 0, z = 0, rot = 0, length = 2.4 }) {
  const group = new THREE.Group();
  const list = [];
  const wood = [];
  const slab = new THREE.BoxGeometry(length, 0.14, 0.58);
  slab.translate(0, 0.49, 0);
  list.push(slab);
  for (let i = 0; i < 3; i++) addBox(list, length - 0.16, 0.035, 0.15, 0, 0.46 + i * 0.018, -0.2 + i * 0.2);
  for (const sx of [-1, 1]) {
    addBox(list, 0.18, 0.44, 0.48, sx * (length / 2 - 0.26), 0.24, 0);
    addBox(list, 0.26, 0.1, 0.56, sx * (length / 2 - 0.26), 0.06, 0);
    addBox(list, 0.15, 0.06, 0.62, sx * (length / 2 - 0.26), 0.62, 0);
    addBox(wood, 0.09, 0.36, 0.09, sx * (length / 2 - 0.26), 0.79, 0.27);
    addBox(wood, 0.34, 0.08, 0.08, sx * (length / 2 - 0.26), 0.68, 0.18);
  }
  addBox(list, length - 0.5, 0.08, 0.08, 0, 0.16, 0.24);
  addBox(list, length - 0.5, 0.08, 0.08, 0, 0.16, -0.24);
  const m = mergedMesh(list, mats.marble, true, true);
  if (m) group.add(m);
  const wm = mergedMesh(wood, mats.wood, true, true);
  if (wm) group.add(wm);
  group.position.set(x, 0, z);
  group.rotation.y = rot;
  return group;
}

export function createStoneLantern({ x = 0, z = 0, scale = 1 }) {
  const group = new THREE.Group();
  const stone = [];
  addCylinder(stone, 0.38 * scale, 0.5 * scale, 0.26 * scale, 8, x, 0.13 * scale, z);
  addCylinder(stone, 0.3 * scale, 0.37 * scale, 0.12 * scale, 8, x, 0.3 * scale, z);
  addCylinder(stone, 0.1 * scale, 0.15 * scale, 1.0 * scale, 6, x, 0.82 * scale, z);
  addBox(stone, 0.6 * scale, 0.1 * scale, 0.6 * scale, x, 1.36 * scale, z);
  addBox(stone, 0.58 * scale, 0.5 * scale, 0.58 * scale, x, 1.62 * scale, z);
  addBox(stone, 0.46 * scale, 0.06 * scale, 0.46 * scale, x, 1.36 * scale, z);
  const cap = new THREE.ConeGeometry(0.52 * scale, 0.36 * scale, 6);
  cap.rotateY(Math.PI / 6);
  cap.translate(x, 2.05 * scale, z);
  stone.push(cap);
  addCylinder(stone, 0.06 * scale, 0.08 * scale, 0.24 * scale, 6, x, 2.34 * scale, z);
  const finial = new THREE.SphereGeometry(0.1 * scale, 7, 5);
  finial.translate(x, 2.48 * scale, z);
  stone.push(finial);
  for (const a of [0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2]) {
    const dx = Math.cos(a) * 0.29 * scale;
    const dz = Math.sin(a) * 0.29 * scale;
    addBox(stone, 0.18 * scale, 0.1 * scale, 0.06 * scale, x + dx, 1.94 * scale, z + dz);
    addBox(stone, 0.06 * scale, 0.1 * scale, 0.18 * scale, x + dx, 1.94 * scale, z + dz);
  }
  const fm = mergedMesh(stone, mats.stone, true, true);
  if (fm) group.add(fm);
  const dark = [];
  for (const a of [0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2]) {
    addBox(dark, 0.28 * scale, 0.26 * scale, 0.03 * scale, x + Math.cos(a) * 0.29 * scale, 1.62 * scale, z + Math.sin(a) * 0.29 * scale, a);
  }
  const dm = mergedMesh(dark, mats.wood, false, false);
  if (dm) group.add(dm);
  const glow = new THREE.Mesh(new THREE.BoxGeometry(0.34 * scale, 0.24 * scale, 0.34 * scale), mats.lantern);
  glow.position.set(x, 1.6 * scale, z);
  group.add(glow);
  return group;
}

export function createHangingLantern({ x = 0, y = 3.2, z = 0, scale = 1 }) {
  const group = new THREE.Group();
  const rig = [];
  addCylinder(rig, 0.025 * scale, 0.025 * scale, 0.55 * scale, 4, x, y + 0.3 * scale, z);
  addCylinder(rig, 0.2 * scale, 0.24 * scale, 0.1 * scale, 8, x, y, z);
  addCylinder(rig, 0.18 * scale, 0.16 * scale, 0.09 * scale, 8, x, y - 0.68 * scale, z);
  addCylinder(rig, 0.03 * scale, 0.03 * scale, 0.38 * scale, 4, x, y - 0.92 * scale, z);
  const rm = mergedMesh(rig, mats.gold, true, false);
  if (rm) group.add(rm);
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.3 * scale, 12, 9), mats.lanternRed);
  body.scale.set(1, 1.28, 1);
  body.position.set(x, y - 0.42 * scale, z);
  group.add(body);
  const tassel = new THREE.Mesh(new THREE.ConeGeometry(0.07 * scale, 0.35 * scale, 5), mats.lanternRed);
  tassel.rotateX(Math.PI);
  tassel.position.set(x, y - 1.08 * scale, z);
  group.add(tassel);
  return group;
}

export function createWell({ x = 0, z = 0, scale = 1 }) {
  const group = new THREE.Group();
  const stone = [];
  const moss = [];
  addCylinder(stone, 0.86 * scale, 0.94 * scale, 0.78 * scale, 16, x, 0.39 * scale, z);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    addBox(stone, 0.2 * scale, 0.5 * scale, 0.12 * scale, x + Math.cos(a) * 0.9 * scale, 0.4 * scale, z + Math.sin(a) * 0.9 * scale, a);
    if (i % 3 === 0) {
      const m = new THREE.IcosahedronGeometry(0.12 * scale, 0);
      m.scale(1.4, 0.4, 1.1);
      m.translate(x + Math.cos(a) * 0.83 * scale, 0.73 * scale, z + Math.sin(a) * 0.83 * scale);
      moss.push(m);
    }
  }
  const rim = new THREE.TorusGeometry(0.84 * scale, 0.1 * scale, 6, 20);
  rim.rotateX(Math.PI / 2);
  rim.translate(x, 0.8 * scale, z);
  stone.push(rim);
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    addBox(stone, 0.16 * scale, 1.9 * scale, 0.16 * scale, x + dx * 0.85 * scale, 0.95 * scale, z + dz * 0.55 * scale);
    addBox(stone, 0.28 * scale, 0.12 * scale, 0.28 * scale, x + dx * 0.85 * scale, 1.92 * scale, z + dz * 0.55 * scale);
  }
  addBox(stone, 0.18 * scale, 0.16 * scale, 1.35 * scale, x, 1.86 * scale, z);
  const sm = mergedMesh(stone, mats.stone, true, true);
  if (sm) group.add(sm);
  const mm = mergedMesh(moss, mats.rockMoss, false, false);
  if (mm) group.add(mm);
  const water = new THREE.Mesh(new THREE.CircleGeometry(0.74 * scale, 18), mats.blue);
  water.rotation.x = -Math.PI / 2;
  water.position.set(x, 0.63 * scale, z);
  group.add(water);
  const rig = [];
  addCylinder(rig, 0.07 * scale, 0.07 * scale, 0.62 * scale, 5, x, 1.62 * scale, z);
  addCylinder(rig, 0.21 * scale, 0.21 * scale, 0.1 * scale, 10, x, 1.36 * scale, z);
  addCylinder(rig, 0.05 * scale, 0.05 * scale, 0.88 * scale, 5, x, 1.62 * scale, z + 0.55 * scale);
  addCylinder(rig, 0.18 * scale, 0.24 * scale, 0.3 * scale, 8, x, 1.05 * scale, z + 0.55 * scale);
  const rm = mergedMesh(rig, mats.wood, true, false);
  if (rm) group.add(rm);
  return group;
}

export function createReedPatch({ x = 0, z = 0, radius = 1.2, count = 18, seed = 1 }) {
  const group = new THREE.Group();
  const stems = [];
  const leaves = [];
  const heads = [];
  const plumes = [];
  for (let i = 0; i < count; i++) {
    const a = rnd(seed, i) * Math.PI * 2;
    const r = Math.sqrt(rnd(seed, i + 3)) * radius;
    const px = x + Math.cos(a) * r;
    const pz = z + Math.sin(a) * r;
    const h = 0.75 + rnd(seed, i + 7) * 1.05;
    addCylinder(stems, 0.018, 0.025, h, 4, px, 0.18 + h / 2, pz);
    for (let k = 0; k < 2; k++) {
      const leaf = new THREE.ConeGeometry(0.07 + rnd(seed, i + k * 3 + 11) * 0.08, h * (0.62 + k * 0.12), 4);
      leaf.rotateZ((rnd(seed, i + 15) - 0.5) * 0.9);
      leaf.rotateX((rnd(seed, i + 19) - 0.5) * 0.35);
      leaf.translate(px + (rnd(seed, i + k) - 0.5) * 0.12, 0.2 + h * (0.5 + k * 0.12), pz);
      leaves.push(leaf);
    }
    if (i % 3 === 0) {
      addCylinder(heads, 0.035, 0.045, 0.26, 5, px, 0.28 + h, pz);
      const plume = new THREE.SphereGeometry(0.09, 5, 4);
      plume.scale(0.8, 2.2, 0.8);
      plume.translate(px, 0.28 + h, pz);
      plumes.push(plume);
    }
  }
  const sm = mergedMesh(stems, mats.bamboo, true, true);
  if (sm) group.add(sm);
  const lm = mergedMesh(leaves, mats.rockMoss, true, true);
  if (lm) group.add(lm);
  const hm = mergedMesh(heads, mats.wood, false, false);
  if (hm) group.add(hm);
  const pm = mergedMesh(plumes, mats.blossomPale, false, false);
  if (pm) group.add(pm);
  return group;
}

export function createGroundcover({ x = 0, z = 0, radius = 2.2, count = 14, seed = 1 }) {
  const group = new THREE.Group();
  const leaves = [];
  const dark = [];
  const blades = [];
  const flowers = [];
  const litter = [];
  for (let i = 0; i < count; i++) {
    const a = rnd(seed, i) * Math.PI * 2;
    const r = Math.sqrt(rnd(seed, i + 4)) * radius;
    const s = new THREE.IcosahedronGeometry(0.18 + rnd(seed, i + 8) * 0.24, 0);
    s.scale(1.25, 0.3, 1.05);
    s.rotateY(rnd(seed, i + 12) * 6.28);
    s.translate(x + Math.cos(a) * r, 0.12, z + Math.sin(a) * r);
    (i % 3 === 0 ? dark : leaves).push(s);
    if (i % 2 === 0) {
      const bl = new THREE.ConeGeometry(0.04 + rnd(seed, i + 30) * 0.035, 0.3 + rnd(seed, i + 31) * 0.34, 4);
      bl.rotateZ((rnd(seed, i + 32) - 0.5) * 0.6);
      bl.translate(x + Math.cos(a + 0.4) * r, 0.26, z + Math.sin(a + 0.4) * r);
      blades.push(bl);
    }
    if (i % 5 === 0) {
      const f = new THREE.SphereGeometry(0.055 + rnd(seed, i + 40) * 0.04, 5, 4);
      f.translate(x + Math.cos(a + 0.8) * r, 0.3 + rnd(seed, i + 41) * 0.16, z + Math.sin(a + 0.8) * r);
      flowers.push(f);
    }
    if (i % 4 === 0) {
      const l = new THREE.CircleGeometry(0.08 + rnd(seed, i + 50) * 0.06, 5);
      l.rotateX(-Math.PI / 2);
      l.rotateY(rnd(seed, i + 51) * 6.28);
      l.translate(x + Math.cos(a + 1.2) * r, 0.045, z + Math.sin(a + 1.2) * r);
      litter.push(l);
    }
  }
  const lm = mergedMesh(leaves, mats.shrub, false, true);
  if (lm) group.add(lm);
  const dm = mergedMesh(dark, mats.rockMoss, false, true);
  if (dm) group.add(dm);
  const bm = mergedMesh(blades, mats.blade, false, true);
  if (bm) group.add(bm);
  const fm = mergedMesh(flowers, seed % 2 ? mats.blossomPale : mats.blossomGold, false, false);
  if (fm) group.add(fm);
  const tm = mergedMesh(litter, mats.lichen, false, true);
  if (tm) group.add(tm);
  return group;
}

export function createFallenPetals({ x = 0, z = 0, radius = 3.2, count = 34, seed = 1, leaves = false }) {
  const group = new THREE.Group();
  const list = [];
  const leafList = [];
  for (let i = 0; i < count; i++) {
    const a = rnd(seed, i) * Math.PI * 2;
    const r = Math.sqrt(rnd(seed, i + 4)) * radius;
    const g = new THREE.CircleGeometry(0.055 + rnd(seed, i + 8) * 0.06, 5);
    g.rotateX(-Math.PI / 2);
    g.rotateY(rnd(seed, i + 12) * 6.28);
    g.translate(x + Math.cos(a) * r, 0.035 + rnd(seed, i + 16) * 0.012, z + Math.sin(a) * r);
    (leaves && i % 2 === 0 ? leafList : list).push(g);
  }
  const pm = mergedMesh(list, mats.blossom, false, true);
  if (pm) group.add(pm);
  if (leafList.length) {
    const lm = mergedMesh(leafList, mats.rockMoss, false, true);
    if (lm) group.add(lm);
  }
  return group;
}

export function createVineRunner({ x = 0, z = 0, length = 12, height = 3.3, axis = 'x', seed = 1 }) {
  const group = new THREE.Group();
  const list = [];
  const stems = [];
  const flowers = [];
  const n = Math.round(length / 0.7);
  for (let i = 0; i < n; i++) {
    const t = i / Math.max(1, n - 1);
    const px = axis === 'x' ? x - length / 2 + t * length : x;
    const pz = axis === 'x' ? z : z - length / 2 + t * length;
    const top = height + rnd(seed, i) * 0.16;
    addCylinder(stems, 0.018, 0.026, 1.25, 4, px, top - 0.2, pz);
    for (let k = 0; k < 4; k++) {
      const leaf = new THREE.IcosahedronGeometry(0.11 + rnd(seed, i * 3 + k) * 0.17, 0);
      leaf.scale(1.5, 0.5, 0.9);
      leaf.rotateY(rnd(seed, i * 11 + k) * 3.1);
      leaf.translate(
        px + (rnd(seed, i * 5 + k) - 0.5) * 0.44,
        top + (rnd(seed, i * 7 + k) - 0.55) * 1.35,
        pz + (rnd(seed, i * 9 + k) - 0.5) * 0.44
      );
      list.push(leaf);
    }
    if (i % 2 === 0) {
      for (let k = 0; k < 2; k++) {
        const f = new THREE.SphereGeometry(0.06 + rnd(seed, i * 13 + k) * 0.04, 5, 4);
        f.translate(px + (rnd(seed, i * 15 + k) - 0.5) * 0.6, top - 0.25 - k * 0.3, pz + (rnd(seed, i * 17 + k) - 0.5) * 0.25);
        flowers.push(f);
      }
    }
  }
  const m = mergedMesh(list, mats.willow, true, true);
  if (m) group.add(m);
  const sm = mergedMesh(stems, mats.trunk, false, false);
  if (sm) group.add(sm);
  const fm = mergedMesh(flowers, seed % 3 === 0 ? mats.blossomRose : mats.blossomPale, false, false);
  if (fm) group.add(fm);
  return group;
}

export function createSteppingStones({ points = [], radius = 0.34 }) {
  const group = new THREE.Group();
  const list = [];
  const moss = [];
  for (const [x, z] of points) {
    addCylinder(list, radius, radius * 1.08, 0.09, 9, x, 0.055, z);
    addCylinder(list, radius * 0.78, radius * 0.82, 0.02, 9, x + 0.02, 0.105, z - 0.01);
    for (let i = 0; i < 2; i++) {
      const a = (i / 2) * Math.PI * 2 + 0.4;
      const m = new THREE.IcosahedronGeometry(0.08, 0);
      m.scale(1.3, 0.3, 1);
      m.translate(x + Math.cos(a) * radius * 1.1, 0.055, z + Math.sin(a) * radius * 1.1);
      moss.push(m);
    }
  }
  const m = mergedMesh(list, mats.stone, false, true);
  if (m) group.add(m);
  const mm = mergedMesh(moss, mats.rockMoss, false, true);
  if (mm) group.add(mm);
  return group;
}
