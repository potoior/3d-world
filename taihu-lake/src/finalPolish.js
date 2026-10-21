import * as THREE from 'three';
import { mats } from './materials.js';
import { mergedMesh } from './geometry.js';

function rnd(seed, n) {
  const v = Math.sin(seed * 83.17 + n * 47.53) * 43758.5453;
  return v - Math.floor(v);
}

function box(list, w, h, d, x, y, z, ry = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (ry) g.rotateY(ry);
  g.translate(x, y, z);
  list.push(g);
  return g;
}

function cyl(list, rt, rb, h, seg, x, y, z) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  g.translate(x, y, z);
  list.push(g);
  return g;
}

function archY(t, rise) {
  return 0.55 + rise * Math.cos(Math.max(-1, Math.min(1, t)) * Math.PI * 0.5);
}

class Bucket {
  constructor() {
    this.map = new Map();
  }
  add(geo, mat) {
    if (!this.map.has(mat)) this.map.set(mat, []);
    this.map.get(mat).push(geo);
  }
  finish(name) {
    const group = new THREE.Group();
    group.name = name;
    for (const [mat, list] of this.map) {
      const mesh = mergedMesh(list, mat, true, true);
      if (mesh) group.add(mesh);
    }
    return group;
  }
}

function bridgeMatrix(b) {
  const m = new THREE.Matrix4().makeRotationY(b.rot);
  m.setPosition(b.x, 0, b.z);
  return m;
}

function createBridgeStonework(bucket, bridges) {
  bridges.forEach((b, bi) => {
    const matrix = bridgeMatrix(b);
    const stone = [];
    const joint = [];
    const moss = [];
    const steps = [];
    for (const side of [-1, 1]) {
      const px = side * (b.width * 0.5 + 0.18);
      const segments = 14;
      for (let i = 0; i < segments; i++) {
        const t0 = -1 + (2 * i) / segments;
        const t1 = -1 + (2 * (i + 1)) / segments;
        const z0 = (t0 * b.span) / 2;
        const z1 = (t1 * b.span) / 2;
        const y0 = archY(t0, b.rise) - 0.28;
        const y1 = archY(t1, b.rise) - 0.28;
        const dz = z1 - z0;
        const dy = y1 - y0;
        const g = new THREE.BoxGeometry(0.2, 0.42, Math.hypot(dz, dy) * 0.9);
        g.rotateX(-Math.atan2(dy, dz));
        g.translate(px, (y0 + y1) * 0.5, (z0 + z1) * 0.5);
        stone.push(g);
        if (i < segments - 1) box(joint, 0.22, 0.4, 0.055, px, y1, z1);
      }
      box(stone, 0.27, 0.58, 0.5, px, archY(0, b.rise) - 0.18, 0);
      for (let k = 0; k < 8; k++) {
        const m = new THREE.IcosahedronGeometry(0.16 + rnd(bi + 11, k + side * 7) * 0.2, 0);
        m.scale(1.8, 0.55, 1.25);
        m.rotateY(rnd(bi + 21, k) * 6.28);
        m.translate(
          px + side * (0.08 + rnd(bi + 31, k) * 0.12),
          0.34 + rnd(bi + 41, k) * 0.38,
          (rnd(bi + 51, k) - 0.5) * b.span * 0.76
        );
        moss.push(m);
      }
      for (const end of [-1, 1]) {
        for (let k = 0; k < 3; k++) {
          const z = end * (b.span * 0.5 + 0.86 - k * 0.5);
          const y = 0.52 + k * 0.15;
          box(steps, b.width * 0.86, 0.045, 0.1, 0, y + 0.12, z + end * 0.32);
          box(joint, b.width * 0.84, 0.018, 0.045, 0, y + 0.155, z + end * 0.31);
        }
      }
    }
    stone.forEach((g) => {
      g.applyMatrix4(matrix);
      bucket.add(g, mats.stone);
    });
    joint.forEach((g) => {
      g.applyMatrix4(matrix);
      bucket.add(g, mats.wallDark);
    });
    moss.forEach((g) => {
      g.applyMatrix4(matrix);
      bucket.add(g, mats.rockMoss);
    });
    steps.forEach((g) => {
      g.applyMatrix4(matrix);
      bucket.add(g, mats.pagodaStone);
    });
  });
}

function createBlossomPolish(bucket, bridges) {
  const spots = [
    { x: -47, z: -62, y: 1.15, h: 5.6 },
    { x: -21, z: -85, y: 1.15, h: 5.6 },
    { x: 12, z: 22, y: 0.95, h: 5.6 },
    { x: -36, z: 96, y: 1.05, h: 5.6 },
    { x: -44, z: 111, y: 1.05, h: 5.6 },
    { x: 36, z: 62, y: 0.8, h: 5.6 },
  ];
  bridges.forEach((b, i) => {
    const side = i % 2 === 0 ? 1 : -1;
    spots.push({
      x: b.x + side * (b.width * 0.5 + 4.2),
      z: b.z + (i % 3 - 1) * 4.2,
      y: 0.08,
      h: 5.2,
    });
  });
  spots.forEach((s, si) => {
    for (let k = 0; k < 14; k++) {
      const g = new THREE.IcosahedronGeometry(0.08 + rnd(si + 901, k) * 0.11, 0);
      g.scale(1.15, 0.62, 1.05);
      const a = rnd(si + 911, k) * Math.PI * 2;
      const rr = Math.sqrt(rnd(si + 921, k)) * 2.4;
      g.translate(
        s.x + Math.cos(a) * rr,
        s.y + s.h * (0.54 + rnd(si + 931, k) * 0.32),
        s.z + Math.sin(a) * rr * 0.85
      );
      bucket.add(g, si % 3 === 0 ? mats.snow : si % 3 === 1 ? mats.blossom : mats.peachDeep);
    }
  });
}

function createLeifengEavePolish(bucket, leifeng) {
  const stone = [];
  const gold = [];
  let y = 3.4;
  const tiers = [
    [8.5, 5.4],
    [7.5, 4.6],
    [6.6, 4.1],
    [5.8, 3.7],
    [5.0, 3.4],
  ];
  tiers.forEach(([rb, h]) => {
    const top = y + h;
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const g = new THREE.CylinderGeometry(0.085, 0.085, 0.18, 6);
      g.rotateX(Math.PI / 2);
      g.rotateY(Math.PI / 2 - a);
      g.translate(Math.cos(a) * (rb + 2.42), top + 0.13, Math.sin(a) * (rb + 2.42));
      stone.push(g);
    }
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      const px = Math.cos(a) * (rb + 3.15);
      const pz = Math.sin(a) * (rb + 3.15);
      const ball = new THREE.SphereGeometry(0.11, 6, 5);
      ball.translate(px, top + 0.68, pz);
      gold.push(ball);
      const tip = new THREE.ConeGeometry(0.08, 0.26, 5);
      tip.translate(px, top + 0.9, pz);
      gold.push(tip);
    }
    y = top + 0.7;
  });
  const m = new THREE.Matrix4().makeTranslation(leifeng.x, leifeng.baseY, leifeng.z);
  stone.forEach((g) => {
    g.applyMatrix4(m);
    bucket.add(g, mats.roofDark);
  });
  gold.forEach((g) => {
    g.applyMatrix4(m);
    bucket.add(g, mats.boatGold);
  });
}

function createSantanPolish(bucket, santan) {
  santan.forEach(([x, z], ti) => {
    for (const [radius, scale, yy] of [[1.5, 1, 0.3], [1.12, 0.72, 0.42]]) {
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2 + ti * 0.1;
        const g = new THREE.ConeGeometry(0.16 * scale, 0.55 * scale, 4);
        g.rotateX(Math.PI * 0.5);
        g.rotateY(Math.PI * 0.5 - a);
        g.translate(x + Math.cos(a) * radius, yy, z + Math.sin(a) * radius);
        bucket.add(g, mats.pagodaStone);
      }
    }
    for (const yy of [2.72, 3.4, 4.08]) {
      for (let i = 0; i < 5; i++) {
        if ((i + Math.round(yy * 10)) % 2) continue;
        const a = (i / 5) * Math.PI * 2 + yy + ti * 0.2;
        const glow = new THREE.SphereGeometry(0.075, 6, 5);
        glow.translate(x + Math.cos(a) * 1.13, yy, z + Math.sin(a) * 1.13);
        bucket.add(glow, mats.lantern);
      }
    }
    const ring = new THREE.TorusGeometry(1.22, 0.05, 4, 18);
    ring.rotateX(Math.PI / 2);
    ring.translate(x, 2.28, z);
    bucket.add(ring, mats.wood);
  });
}

function createPavilionPolish(bucket) {
  const rail = [];
  const infill = [];
  const wood = [];
  const stone = [];
  for (const [px, py, pz, radius] of [[-17, 1.15, -65, 5.6], [-55, 1.15, -74, 4.8]]) {
    for (let i = 0; i < 10; i++) {
      const a0 = (i / 10) * Math.PI * 2;
      const a1 = ((i + 1) / 10) * Math.PI * 2;
      const x0 = px + Math.cos(a0) * radius;
      const z0 = pz + Math.sin(a0) * radius;
      const x1 = px + Math.cos(a1) * radius;
      const z1 = pz + Math.sin(a1) * radius;
      const len = Math.hypot(x1 - x0, z1 - z0);
      const yaw = Math.atan2(x1 - x0, z1 - z0);
      box(rail, 0.1, 0.1, len, (x0 + x1) * 0.5, py + 0.84, (z0 + z1) * 0.5, yaw);
      box(rail, 0.07, 0.07, len, (x0 + x1) * 0.5, py + 0.5, (z0 + z1) * 0.5, yaw);
      for (let k = 1; k < 4; k++) {
        const t = k / 4;
        cyl(infill, 0.025, 0.035, 0.3, 4, x0 + (x1 - x0) * t, py + 0.67, z0 + (z1 - z0) * t);
      }
    }
  }
  const hx = 8;
  const hz = 26;
  const hy = 1.55;
  cyl(stone, 0.62, 0.62, 0.07, 12, hx - 1.1, hy + 0.62, hz - 0.4);
  cyl(wood, 0.07, 0.09, 0.6, 6, hx - 1.1, hy + 0.3, hz - 0.4);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    cyl(wood, 0.13, 0.15, 0.36, 6, hx - 1.1 + Math.cos(a) * 1.05, hy + 0.18, hz - 0.4 + Math.sin(a) * 1.05);
  }
  rail.forEach((g) => bucket.add(g, mats.stone));
  infill.forEach((g) => bucket.add(g, mats.marbleShade));
  wood.forEach((g) => bucket.add(g, mats.wood));
  stone.forEach((g) => bucket.add(g, mats.stone));
}

function addFigure(bucket, x, y, z, ry, scale, seed) {
  const coat = [mats.wall, mats.timber, mats.boatRed, mats.stone][seed % 4];
  const body = new THREE.BoxGeometry(0.3 * scale, 0.64 * scale, 0.22 * scale);
  body.rotateY(ry);
  body.translate(x, y + 1.1 * scale, z);
  bucket.add(body, coat);
  const head = new THREE.IcosahedronGeometry(0.14 * scale, 0);
  head.translate(x, y + 1.55 * scale, z);
  bucket.add(head, mats.marbleShade);
  for (const side of [-1, 1]) {
    const leg = new THREE.BoxGeometry(0.09 * scale, 0.46 * scale, 0.11 * scale);
    leg.rotateY(ry);
    leg.translate(x + side * 0.085 * scale, y + 0.26 * scale, z);
    bucket.add(leg, mats.wood);
  }
  if (seed % 3 === 0) {
    const pack = new THREE.BoxGeometry(0.22 * scale, 0.3 * scale, 0.15 * scale);
    pack.rotateY(ry);
    pack.translate(x - Math.sin(ry) * 0.17 * scale, y + 1.16 * scale, z - Math.cos(ry) * 0.17 * scale);
    bucket.add(pack, mats.boatRed);
  }
}

function createVisitorPolish(bucket) {
  const spots = [
    [8, 1.55, 26, 5, 1.6],
    [-42, 1.65, 99, 6, 1.7],
    [-17, 1.75, -65, 3, 1.3],
    [-55, 1.75, -74, 3, 1.2],
  ];
  spots.forEach(([cx, cy, cz, count, radius], si) => {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + si * 0.7;
      const x = cx + Math.cos(a) * radius * (0.45 + rnd(si + 1201, i) * 0.4);
      const z = cz + Math.sin(a) * radius * (0.45 + rnd(si + 1211, i) * 0.4);
      addFigure(bucket, x, cy, z, a + Math.PI, 0.86 + rnd(si + 1221, i) * 0.15, si + i);
    }
  });
}

export function createWestLakeFinalStatic({
  bridges = [],
  santan = [],
  leifeng = { x: 46, z: 220, baseY: 30.5 },
} = {}) {
  const bucket = new Bucket();
  createBridgeStonework(bucket, bridges);
  createBlossomPolish(bucket, bridges);
  createLeifengEavePolish(bucket, leifeng);
  createSantanPolish(bucket, santan);
  createPavilionPolish(bucket);
  createVisitorPolish(bucket);
  return bucket.finish('westlake-final-static');
}
