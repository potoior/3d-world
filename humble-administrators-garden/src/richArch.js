import * as THREE from 'three';
import { mats } from './materials.js';
import { addBox, addCylinder, mergedMesh } from './geometry.js';
import { createRoof } from './roof.js';
import { getPlaqueMaterial } from './gardenBuild.js';
import { coupletMaterial } from './atlas.js';

export function getCoupletMaterial(text) {
  return coupletMaterial(text);
}

function holePath(feature, y) {
  const p = new THREE.Path();
  const r = feature.r;
  const type = feature.type || 'circle';
  if (type === 'fan') {
    p.absarc(feature.u, y - r * 0.18, r, Math.PI, 0, true);
    p.lineTo(feature.u + r, y - r * 0.18);
    p.lineTo(feature.u - r, y - r * 0.18);
    p.closePath();
    return p;
  }
  if (type === 'quatrefoil') {
    for (let i = 0; i <= 40; i++) {
      const a = -(i / 40) * Math.PI * 2;
      const rr = r * (0.76 + 0.24 * Math.cos(a * 4));
      const px = feature.u + Math.cos(a) * rr;
      const py = y + Math.sin(a) * rr;
      if (i === 0) p.moveTo(px, py);
      else p.lineTo(px, py);
    }
    p.closePath();
    return p;
  }
  const sides = type === 'octagon' ? 8 : type === 'hex' ? 6 : type === 'diamond' ? 4 : 0;
  if (sides) {
    for (let i = 0; i <= sides; i++) {
      const a = -(i / sides) * Math.PI * 2 + Math.PI / (type === 'diamond' ? 4 : sides);
      const px = feature.u + Math.cos(a) * r;
      const py = y + Math.sin(a) * r;
      if (i === 0) p.moveTo(px, py);
      else p.lineTo(px, py);
    }
    p.closePath();
    return p;
  }
  p.absarc(feature.u, y, r, 0, Math.PI * 2, true);
  return p;
}

function bar2d(list, w, h, d, x, y, z, rz = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (rz) g.rotateZ(rz);
  g.translate(x, y, z);
  list.push(g);
}

function latticeFor(feature, y, z, thickness) {
  const list = [];
  const r = feature.r;
  const u = feature.u;
  const face = z + Math.sign(z) * (thickness / 2 + 0.015);
  const rings = [];
  for (const sz of [1, -1]) {
    const fz = z + sz * (thickness / 2 + 0.02);
    if (feature.type === 'fan') {
      const rim = new THREE.TorusGeometry(r * 0.92, 0.032, 4, 18, Math.PI);
      rim.translate(u, y - r * 0.18, fz);
      rings.push(rim);
      for (let i = 0; i < 5; i++) {
        const a = Math.PI * (i + 0.5) / 5;
        bar2d(list, 0.045, r * 0.86, 0.05, u + Math.cos(a) * r * 0.42, y - r * 0.18 + Math.sin(a) * r * 0.42, fz, a - Math.PI / 2);
      }
    } else {
      const ring = new THREE.TorusGeometry(r * 0.84, 0.035, 4, 16);
      ring.translate(u, y, fz);
      rings.push(ring);
      const spokes = feature.type === 'octagon' ? 4 : feature.type === 'hex' ? 3 : 6;
      for (let i = 0; i < spokes; i++) {
        const a = (i / spokes) * Math.PI;
        bar2d(list, 0.04, r * 1.6, 0.05, u, y, fz, a);
      }
    }
  }
  return { list, rings };
}

export function createFeatureWall({
  x = 0,
  z = 0,
  rot = 0,
  length = 16,
  height = 3.4,
  thickness = 0.6,
  features = [],
  name = '',
}) {
  const group = new THREE.Group();
  const y0 = height * 0.56;
  const shape = new THREE.Shape();
  shape.moveTo(-length / 2, 0);
  shape.lineTo(length / 2, 0);
  shape.lineTo(length / 2, height);
  shape.lineTo(-length / 2, height);
  shape.closePath();
  for (const f of features) shape.holes.push(holePath(f, y0));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false, curveSegments: 14 });
  geo.translate(0, 0, -thickness / 2);
  const body = new THREE.Mesh(geo, mats.wall);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const base = new THREE.Mesh(new THREE.BoxGeometry(length + 0.18, 0.46, thickness + 0.22), mats.stone);
  base.position.y = 0.23;
  base.receiveShadow = true;
  group.add(base);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(length + 0.34, 0.17, thickness + 0.34), mats.roofDark);
  cap.position.y = height + 0.02;
  group.add(cap);
  const capTop = new THREE.Mesh(new THREE.BoxGeometry(length + 0.1, 0.14, thickness + 0.12), mats.roof);
  capTop.position.y = height + 0.16;
  group.add(capTop);
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(length + 0.22, 0.16, 0.17), mats.trimDark);
  ridge.position.y = height + 0.3;
  group.add(ridge);

  const trims = [];
  for (let i = 0; i < Math.floor(length / 0.7); i++) {
    const px = -length / 2 + 0.35 + i * 0.7;
    addBox(trims, 0.06, 0.1, thickness + 0.36, px, height + 0.11, 0);
    addBox(trims, 0.16, 0.16, thickness + 0.24, px + 0.21, height - 0.18, 0);
  }
  for (let i = 0; i <= Math.round(length / 1.6); i++) {
    const px = -length / 2 + (i * length) / Math.round(length / 1.6);
    for (const side of [-1, 1]) {
      const c = new THREE.CylinderGeometry(0.065, 0.065, thickness + 0.28, 4, 1, true);
      c.rotateX(Math.PI / 2);
      c.translate(px, height + 0.29, side * 0.09);
      trims.push(c);
    }
  }
  const bands = [];
  for (let i = 0; i < Math.floor(length / 0.9); i++) {
    const px = -length / 2 + 0.45 + i * 0.9;
    addBox(bands, 0.22, 0.22, thickness + 0.2, px, 0.32, 0);
    addBox(bands, 0.1, 0.1, thickness + 0.24, px + 0.3, 0.72, 0);
  }
  const bm2 = mergedMesh(bands, mats.stone, false, true);
  if (bm2) group.add(bm2);
  const tm = mergedMesh(trims, mats.trimDark, false, false);
  if (tm) group.add(tm);

  const bars = [];
  const rings = [];
  for (const f of features) {
    if (f.open) {
      for (const sz of [1, -1]) {
        const ring = new THREE.TorusGeometry(f.r + 0.07, 0.075, 6, 28);
        ring.translate(f.u, y0, sz * (thickness / 2 + 0.015));
        rings.push(ring);
      }
      continue;
    }
    const l = latticeFor(f, y0, 0, thickness);
    bars.push(...l.list);
    rings.push(...l.rings);
    const fr = f.r + 0.09;
    const ring = new THREE.TorusGeometry(fr, 0.055, 5, 20);
    ring.translate(f.u, y0, (thickness / 2 + 0.035));
    rings.push(ring);
    const ring2 = new THREE.TorusGeometry(fr, 0.055, 5, 20);
    ring2.translate(f.u, y0, -(thickness / 2 + 0.035));
    rings.push(ring2);
    const mid = new THREE.TorusGeometry(f.r * 0.7, 0.035, 4, 18);
    mid.translate(f.u, y0, 0);
    rings.push(mid);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      addBox(bars, 0.04, f.r * 1.35, 0.04, f.u + Math.cos(a) * f.r * 0.82, y0 + Math.sin(a) * f.r * 0.82, 0);
    }
  }
  const bm = mergedMesh(bars, mats.timber, false, false);
  if (bm) group.add(bm);
  const rm = mergedMesh(rings, mats.stone, false, false);
  if (rm) group.add(rm);

  if (name) {
    const plaque = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.62), getPlaqueMaterial(name));
    plaque.position.set(0, height - 0.42, thickness / 2 + 0.045);
    group.add(plaque);
  }
  group.position.set(x, 0, z);
  group.rotation.y = rot;
  return group;
}

export function createGateway({ x = 0, z = 0, rot = 0, width = 5.2, height = 3.25, name = '', couplets = [] }) {
  const group = new THREE.Group();
  const wallList = [];
  const stoneList = [];
  const trimList = [];
  const pierW = 0.62;
  const depth = 0.78;
  for (const sx of [-1, 1]) {
    addBox(wallList, pierW, height, depth, sx * (width / 2 - pierW / 2), height / 2, 0);
    addBox(stoneList, pierW + 0.16, 0.42, depth + 0.16, sx * (width / 2 - pierW / 2), 0.21, 0);
    addBox(trimList, pierW + 0.28, 0.14, depth + 0.28, sx * (width / 2 - pierW / 2), height + 0.05, 0);
    addBox(trimList, pierW + 0.14, 0.12, depth + 0.14, sx * (width / 2 - pierW / 2), height + 0.18, 0);
  }
  addBox(wallList, width - pierW * 2, 0.52, depth * 0.86, 0, height - 0.26, 0);
  addBox(trimList, width - pierW * 2 + 0.3, 0.14, depth + 0.1, 0, height - 0.04, 0);
  addBox(stoneList, width - pierW * 2, 0.1, 1.0, 0, 0.05, 0);
  const doorTrim = [];
  addBox(doorTrim, width - pierW * 2, 0.18, 0.14, 0, 2.3, depth / 2 + 0.02);
  for (const sx of [-1, 1]) addBox(doorTrim, 0.15, 2.3, 0.14, sx * (width / 2 - pierW), 1.15, depth / 2 + 0.02);
  const wm = mergedMesh(wallList, mats.wall, true, true);
  if (wm) group.add(wm);
  const sm = mergedMesh(stoneList, mats.stone, true, true);
  if (sm) group.add(sm);
  const tm = mergedMesh(trimList, mats.roofDark, true, true);
  if (tm) group.add(tm);
  const dm = mergedMesh(doorTrim, mats.timberRed, false, false);
  if (dm) group.add(dm);

  const roof = createRoof({
    width: width + 2.2,
    depth: 1.9,
    height: 1.0,
    cornerLift: 0.72,
    curve: 1.38,
    ridgeRatio: 0.3,
    hasRidge: true,
    beasts: true,
  });
  roof.position.y = height + 0.2;
  group.add(roof);

  if (name) {
    const plaque = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.53), getPlaqueMaterial(name));
    plaque.position.set(0, height - 0.28, depth / 2 + 0.03);
    group.add(plaque);
  }
  couplets.slice(0, 2).forEach((text, i) => {
    if (!text) return;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 1.75), getCoupletMaterial(text));
    mesh.position.set((i === 0 ? -1 : 1) * (width / 2 - pierW / 2), 1.72, depth / 2 + 0.04);
    group.add(mesh);
  });
  group.position.set(x, 0, z);
  group.rotation.y = rot;
  return group;
}

export function createCornerPier({ x = 0, z = 0, size = 0.9, height = 3.5 }) {
  const group = new THREE.Group();
  const wall = new THREE.Mesh(new THREE.BoxGeometry(size, height, size), mats.wall);
  wall.position.y = height / 2;
  wall.castShadow = true;
  group.add(wall);
  const base = new THREE.Mesh(new THREE.BoxGeometry(size + 0.24, 0.5, size + 0.24), mats.stone);
  base.position.y = 0.25;
  group.add(base);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(size + 0.42, 0.18, size + 0.42), mats.roofDark);
  cap.position.y = height + 0.04;
  group.add(cap);
  const top = new THREE.Mesh(new THREE.BoxGeometry(size + 0.18, 0.15, size + 0.18), mats.roof);
  top.position.y = height + 0.2;
  group.add(top);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(size * 0.24, 8, 6), mats.gold);
  ball.position.y = height + 0.36;
  group.add(ball);
  group.position.set(x, 0, z);
  return group;
}

export function createRidgePair({ x = 0, y = 0, z = 0, rot = 0, ridgeHalf = 3, scale = 1 }) {
  const group = new THREE.Group();
  const dark = [];
  const gold = [];
  for (const sx of [-1, 1]) {
    addBox(dark, 0.42 * scale, 0.3 * scale, 0.6 * scale, sx * ridgeHalf, 0.16 * scale, 0);
    const body = new THREE.BoxGeometry(0.34 * scale, 1.05 * scale, 0.52 * scale);
    body.rotateZ(sx * -0.22);
    body.translate(sx * (ridgeHalf + 0.06 * scale), 0.82 * scale, 0);
    dark.push(body);
    const jaw = new THREE.ConeGeometry(0.26 * scale, 0.72 * scale, 5);
    jaw.rotateZ(sx * -0.9);
    jaw.translate(sx * (ridgeHalf + 0.38 * scale), 1.35 * scale, 0);
    dark.push(jaw);
    const tail = new THREE.ConeGeometry(0.18 * scale, 0.95 * scale, 5);
    tail.rotateZ(sx * 0.55);
    tail.translate(sx * (ridgeHalf - 0.18 * scale), 1.62 * scale, 0);
    dark.push(tail);
    const ball = new THREE.SphereGeometry(0.1 * scale, 7, 5);
    ball.translate(sx * (ridgeHalf + 0.3 * scale), 1.62 * scale, 0);
    gold.push(ball);
  }
  const dm = mergedMesh(dark, mats.roofDark, true, false);
  if (dm) group.add(dm);
  const gm = mergedMesh(gold, mats.gold, true, false);
  if (gm) group.add(gm);
  group.position.set(x, y, z);
  group.rotation.y = rot;
  return group;
}

export function createDougong({ x = 0, y = 0, z = 0, rot = 0, width = 12, bays = 6, scale = 1 }) {
  const group = new THREE.Group();
  const list = [];
  const dark = [];
  const step = width / bays;
  for (let i = 0; i <= bays; i++) {
    const px = -width / 2 + step * i;
    addBox(list, 0.22 * scale, 0.42 * scale, 0.24 * scale, px, 0.16 * scale, 0);
    addBox(list, 0.9 * scale, 0.14 * scale, 0.22 * scale, px, 0.46 * scale, 0);
    addBox(list, 1.2 * scale, 0.13 * scale, 0.2 * scale, px, 0.62 * scale, 0);
    addBox(list, 0.14 * scale, 0.18 * scale, 0.62 * scale, px, 0.5 * scale, 0);
    for (const sx of [-1, 1]) {
      const arm = new THREE.BoxGeometry(0.62 * scale, 0.12 * scale, 0.2 * scale);
      arm.rotateZ(sx * 0.42);
      arm.translate(px + sx * 0.34 * scale, 0.32 * scale, 0);
      dark.push(arm);
    }
  }
  const lm = mergedMesh(list, mats.timberRed, true, false);
  if (lm) group.add(lm);
  const dm = mergedMesh(dark, mats.wallDark, true, false);
  if (dm) group.add(dm);
  group.position.set(x, y, z);
  group.rotation.y = rot;
  return group;
}
