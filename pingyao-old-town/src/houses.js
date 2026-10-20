import * as THREE from 'three';
import { mats, getPlaqueMaterial } from './materials.js';
import { addBox, addCylinder, mergedMesh } from './geometry.js';
import { createRoofGeometry } from './roof.js';

function rnd(seed, n) {
  const v = Math.sin(seed * 71.3 + n * 47.9) * 43758.5453;
  return v - Math.floor(v);
}

export function houseRoof(width, depth, height, lift = 0.34, curve = 1.22, seg = 10, vseg = 7) {
  return createRoofGeometry({
    width,
    depth,
    height,
    cornerLift: lift,
    curve,
    ridgeRatio: 0.5,
    segments: seg,
    vSegments: vseg,
  });
}

function worldPoint(x, z, rot, lx, lz) {
  return [
    x + lx * Math.cos(rot) + lz * Math.sin(rot),
    z - lx * Math.sin(rot) + lz * Math.cos(rot),
  ];
}

function addCloth(list, w, h, x, y, z, rz = 0) {
  const g = new THREE.BoxGeometry(w, h, 0.045);
  if (rz) g.rotateZ(rz);
  g.translate(x, y, z);
  list.push(g);
}

export function createPingyaoHouse({
  x = 0,
  z = 0,
  w = 14,
  d = 10,
  rot = 0,
  storeys = 1,
  name = '',
  seed = 1,
  shop = true,
  lanterns = true,
  banner = false,
}) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rot;

  const brick = [];
  const brickDark = [];
  const stone = [];
  const timber = [];
  const timberDark = [];
  const lattice = [];
  const ridge = [];
  const pots = [];
  const cloth = [];
  const bannerPaper = [];
  const goods = [];
  const spots = [];

  const baseH = 0.5;
  const wallH = 3.35;
  const upperH = storeys > 1 ? 2.75 : 0;
  const top = baseH + wallH + upperH;

  addBox(stone, w + 0.42, baseH, d + 0.42, 0, baseH * 0.5, 0);
  addBox(brick, w, wallH, d, 0, baseH + wallH * 0.5, 0);
  if (storeys > 1) addBox(brick, w - 0.1, upperH, d - 0.1, 0, baseH + wallH + upperH * 0.5, 0);
  for (const sx of [-1, 1]) {
    addBox(brickDark, 0.42, wallH + upperH, 0.46, sx * (w * 0.5 - 0.1), baseH + (wallH + upperH) * 0.5, d * 0.5 - 0.16);
    addBox(brickDark, 0.42, wallH + upperH, 0.46, sx * (w * 0.5 - 0.1), baseH + (wallH + upperH) * 0.5, -d * 0.5 + 0.16);
  }
  addBox(brickDark, w + 0.12, 0.26, 0.22, 0, baseH + wallH - 0.12, d * 0.5 + 0.02);
  if (storeys > 1) addBox(brickDark, w + 0.1, 0.24, 0.22, 0, top - 0.12, d * 0.5 + 0.02);

  if (shop) {
    addBox(timberDark, w * 0.66, 2.35, 0.16, 0, 1.55, d * 0.5 + 0.05);
    addBox(timber, w * 0.72, 0.92, 0.62, 0, 0.9, d * 0.5 + 0.44);
    for (let i = 0; i < 4; i++) {
      addBox(timber, 0.12, 2.24, 0.12, -w * 0.27 + i * w * 0.18, 1.6, d * 0.5 + 0.15);
    }
    for (let i = 0; i < 3; i++) {
      addCylinder(goods, 0.16, 0.2, 0.42 + (i % 2) * 0.22, 7, -w * 0.2 + i * w * 0.2, 0.45, d * 0.5 + 0.64);
    }
    addBox(timberDark, w * 0.5, 0.16, 0.76, 0, 3.0, d * 0.5 + 0.38);
  }

  const winY = baseH + (storeys > 1 ? wallH + upperH * 0.48 : 1.9);
  const winCount = storeys > 1 ? 3 : 2;
  for (let i = 0; i < winCount; i++) {
    const wx = -w * 0.25 + (i * w * 0.5) / (winCount - 1);
    addBox(timberDark, w * 0.2, 1.1, 0.1, wx, winY, d * 0.5 + 0.03);
    addBox(lattice, w * 0.18, 1.0, 0.06, wx, winY, d * 0.5 + 0.09);
  }
  if (storeys > 1) {
    for (const sx of [-1, 1]) {
      addBox(timberDark, 0.1, 1.0, d * 0.24, sx * (w * 0.5 + 0.01), winY, -d * 0.1);
      addBox(lattice, 0.06, 0.92, d * 0.22, sx * (w * 0.5 + 0.055), winY, -d * 0.1);
    }
    addBox(timber, w * 0.88, 0.16, 0.82, 0, baseH + wallH + 0.1, d * 0.5 + 0.4);
    for (let i = 0; i <= 5; i++) {
      addBox(timberDark, 0.1, 0.72, 0.1, -w * 0.4 + (i * w * 0.8) / 5, baseH + wallH + 0.46, d * 0.5 + 0.74);
    }
    addBox(timberDark, w * 0.84, 0.1, 0.12, 0, baseH + wallH + 0.86, d * 0.5 + 0.74);
    for (let i = 0; i < 2; i++) {
      const px = -w * 0.28 + i * w * 0.5;
      addBox(pots, 1.0, 0.28, 0.36, px, baseH + wallH + 0.28, d * 0.5 + 0.8);
      addCloth(i % 2 === 0 ? cloth : bannerPaper, 0.66, 1.05, px + 0.1, baseH + wallH - 0.38, d * 0.5 + 0.84, 0.02);
    }
  }

  const roofBase = top - 0.05;
  const roofH = storeys > 1 ? 2.15 : 1.85;
  const roof = new THREE.Mesh(houseRoof(w + 1.6, d + 1.8, roofH), mats.roofGrey);
  roof.position.y = roofBase;
  roof.castShadow = true;
  roof.receiveShadow = true;
  group.add(roof);
  addBox(ridge, Math.max(2.4, w - 0.4), 0.2, 0.28, 0, roofBase + roofH + 0.03, 0);
  for (const sx of [-1, 1]) {
    addBox(ridge, 0.55, 0.7, 0.7, sx * Math.max(1.15, (w - 0.8) * 0.5), roofBase + roofH + 0.34, 0);
  }

  if (name) {
    const signY = storeys > 1 ? baseH + wallH + 0.55 : 3.05;
    const signW = Math.min(3.2, Math.max(1.7, name.length * 0.62));
    addBox(timberDark, signW + 0.22, signW * 0.3125 + 0.18, 0.12, 0, signY, d * 0.5 + 0.22);
    const plaque = new THREE.Mesh(new THREE.PlaneGeometry(signW, signW * 0.3125), getPlaqueMaterial(name));
    plaque.position.set(0, signY, d * 0.5 + 0.29);
    group.add(plaque);
  }

  if (banner) {
    const bx = w * 0.34;
    addBox(timberDark, 0.12, 4.2, 0.12, bx, 2.1, d * 0.5 + 0.9);
    addBox(timberDark, 0.72, 0.1, 0.1, bx + 0.3, 4.0, d * 0.5 + 0.9);
    addBox(bannerPaper, 0.56, 1.55, 0.05, bx + 0.52, 3.16, d * 0.5 + 0.9);
    addBox(bannerPaper, 0.4, 1.2, 0.04, bx + 0.52, 2.32, d * 0.5 + 0.9);
  }

  if (lanterns) {
    const ly = top - 0.1;
    for (const sx of [-1, 1]) {
      const [wx, wz] = worldPoint(x, z, rot, sx * w * 0.31, d * 0.5 + 0.55);
      spots.push({ x: wx, y: ly, z: wz, phase: rnd(seed, 11 + sx) * Math.PI * 2 });
    }
    if (storeys > 1) {
      const [wx, wz] = worldPoint(x, z, rot, 0, -d * 0.5 - 0.5);
      spots.push({ x: wx, y: ly, z: wz, phase: rnd(seed, 19) * Math.PI * 2 });
    }
  }

  const mods = [
    [brick, mats.greyBrick],
    [brickDark, mats.greyBrickDark],
    [stone, mats.waterStone],
    [timber, mats.naxiWood],
    [timberDark, mats.naxiWoodDark],
    [lattice, mats.lattice],
    [ridge, mats.roofGreyDark],
    [pots, mats.terracotta],
    [cloth, mats.cloth],
    [bannerPaper, mats.bannerPaper],
    [goods, mats.terracotta],
  ];
  for (const [list, mat] of mods) {
    const m = mergedMesh(list, mat, true, true);
    if (m) group.add(m);
  }

  const swap = Math.abs(Math.sin(rot)) > 0.5;
  const cw = (swap ? d : w) + 0.7;
  const cd = (swap ? w : d) + 0.7;
  return {
    group,
    spots,
    collider: { minX: x - cw / 2, maxX: x + cw / 2, minZ: z - cd / 2, maxZ: z + cd / 2 },
  };
}

export function createElmTree({ x = 0, z = 0, seed = 1, scale = 1 }) {
  const group = new THREE.Group();
  const trunk = [];
  const branch = [];
  const leaves = [];
  const darkLeaves = [];
  const h = (6.4 + rnd(seed, 1) * 2.2) * scale;
  addCylinder(trunk, 0.26 * scale, 0.46 * scale, h * 0.52, 7, 0, h * 0.26, 0);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + rnd(seed, i + 2) * 0.7;
    const len = (2.2 + rnd(seed, i + 7) * 1.2) * scale;
    const g = new THREE.CylinderGeometry(0.1 * scale, 0.18 * scale, len, 6);
    g.translate(0, len * 0.5, 0);
    g.rotateZ(Math.cos(a) * 0.68);
    g.rotateX(Math.sin(a) * 0.68);
    g.translate(0, h * 0.38, 0);
    branch.push(g);
  }
  for (let i = 0; i < 18; i++) {
    const a = rnd(seed, i + 11) * Math.PI * 2;
    const r = (0.6 + rnd(seed, i + 17) * 2.9) * scale;
    const py = h * (0.56 + rnd(seed, i + 23) * 0.42);
    const s = (0.6 + rnd(seed, i + 29) * 0.62) * scale;
    const blob = new THREE.IcosahedronGeometry(s, 1);
    blob.scale(1.15, 0.72, 1.1);
    blob.translate(Math.cos(a) * r, py, Math.sin(a) * r);
    if (i % 3 === 0) darkLeaves.push(blob);
    else leaves.push(blob);
  }
  for (const [list, mat] of [[trunk, mats.trunk], [branch, mats.trunk], [leaves, mats.elm], [darkLeaves, mats.elmDark]]) {
    const m = mergedMesh(list, mat, true, true);
    if (m) group.add(m);
  }
  group.position.set(x, 0, z);
  return group;
}

export function createLanternString({ x1, z1, x2, z2, y = 6.0, count = 8, seed = 1 }) {
  const group = new THREE.Group();
  const posts = [];
  addBox(posts, 0.2, y + 0.5, 0.2, x1, (y + 0.5) * 0.5, z1);
  addBox(posts, 0.2, y + 0.5, 0.2, x2, (y + 0.5) * 0.5, z2);
  const dx = x2 - x1;
  const dz = z2 - z1;
  const len = Math.hypot(dx, dz);
  const wireGeo = new THREE.BoxGeometry(0.035, 0.035, len);
  wireGeo.rotateY(Math.atan2(dx, dz));
  wireGeo.translate((x1 + x2) * 0.5, y + 0.38, (z1 + z2) * 0.5);
  posts.push(wireGeo);
  const pm = mergedMesh(posts, mats.naxiWoodDark, true, true);
  if (pm) group.add(pm);
  const spots = [];
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    spots.push({
      x: x1 + dx * t,
      z: z1 + dz * t,
      y: y + 0.34 - Math.sin(t * Math.PI) * 0.25,
      phase: seed + i * 1.37,
    });
  }
  return { group, spots };
}

export function createShopStall({ x = 0, z = 0, rot = 0, accent = 'rust', seed = 1 }) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rot;
  const wood = [];
  const dark = [];
  const goods = [];
  const clothA = [];
  const clothB = [];
  addBox(dark, 0.16, 2.65, 0.16, -1.35, 1.33, -0.95);
  addBox(dark, 0.16, 2.65, 0.16, 1.35, 1.33, -0.95);
  addBox(dark, 0.16, 2.65, 0.16, -1.35, 1.33, 1.0);
  addBox(dark, 0.16, 2.65, 0.16, 1.35, 1.33, 1.0);
  addBox(wood, 3.0, 0.22, 2.15, 0, 0.95, 0);
  addBox(dark, 2.9, 0.72, 0.16, 0, 0.5, 1.0);
  for (let i = 0; i < 5; i++) {
    const g = new THREE.CylinderGeometry(0.16, 0.19, 0.36 + (i % 2) * 0.14, 7);
    g.translate(-1.05 + i * 0.52, 1.24, 0.18);
    goods.push(g);
  }
  for (let i = 0; i < 6; i++) {
    const panel = new THREE.BoxGeometry(0.48, 0.07, 2.5);
    panel.rotateX(0.18);
    panel.translate(-1.45 + (i * 2.9) / 5, 2.75, 0.08);
    ((i % 2 === 0) === (accent === 'indigo') ? clothA : clothB).push(panel);
  }
  const pairs = [
    [wood, mats.naxiWood],
    [dark, mats.naxiWoodDark],
    [goods, mats.terracotta],
    [clothA, accent === 'indigo' ? mats.indigo : mats.rust],
    [clothB, accent === 'indigo' ? mats.cloth : mats.indigo],
  ];
  for (const [list, mat] of pairs) {
    const m = mergedMesh(list, mat, true, true);
    if (m) group.add(m);
  }
  const spots = [
    { x: x - 1.45, y: 2.6, z: z, phase: seed },
    { x: x + 1.45, y: 2.6, z: z, phase: seed + 1.7 },
  ];
  return { group, spots };
}
