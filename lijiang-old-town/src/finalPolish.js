import * as THREE from 'three';
import { mats } from './materials.js';
import { mergedMesh } from './geometry.js';

function rnd(seed, n) {
  const v = Math.sin(seed * 51.37 + n * 29.11) * 43758.5453;
  return v - Math.floor(v);
}

function housePoint(def, lx, lz) {
  return [
    def.x + lx * Math.cos(def.rot) + lz * Math.sin(def.rot),
    def.z - lx * Math.sin(def.rot) + lz * Math.cos(def.rot),
  ];
}

function canalPoint(c, lx, lz) {
  return [
    c.x + lx * Math.cos(c.rot) + lz * Math.sin(c.rot),
    c.z - lx * Math.sin(c.rot) + lz * Math.cos(c.rot),
  ];
}

function archY(t, span, rise, baseY) {
  return baseY + 0.35 + rise * Math.cos(Math.max(-1, Math.min(1, t)) * Math.PI * 0.5);
}

function addLocalBox(list, def, w, h, d, lx, ly, lz, rz = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (rz) g.rotateZ(rz);
  g.rotateY(def.rot);
  const [x, z] = housePoint(def, lx, lz);
  g.translate(x, ly, z);
  list.push(g);
}

function addCanalBox(list, c, w, h, d, lx, ly, lz) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.rotateY(c.rot);
  const [x, z] = canalPoint(c, lx, lz);
  g.translate(x, ly, z);
  list.push(g);
}

function addBridgeBox(list, b, w, h, d, lx, ly, lz) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.rotateY(b.rot);
  const [x, z] = canalPoint(b, lx, lz);
  g.translate(x, ly, z);
  list.push(g);
}

function addBlob(list, radius, x, y, z, sx = 1, sy = 1, sz = 1) {
  const g = new THREE.IcosahedronGeometry(radius, 0);
  g.scale(sx, sy, sz);
  g.rotateY(rnd(x + z, radius) * 6.28);
  g.translate(x, y, z);
  list.push(g);
}

function placed(list, geo, x, y, z, rot) {
  geo.rotateY(rot);
  geo.translate(x, y, z);
  list.push(geo);
}

function addElder(b, x, z, rot, seed) {
  const coat = seed % 2 ? b.indigo : b.rust;
  const legH = 0.54;
  for (const sx of [-1, 1]) {
    placed(b.dark, new THREE.BoxGeometry(0.13, legH, 0.15), x + sx * 0.1, legH * 0.5, z, rot);
  }
  placed(coat, new THREE.CylinderGeometry(0.18, 0.25, 0.82, 7), x, legH + 0.41, z, rot);
  placed(b.cloth, new THREE.BoxGeometry(0.53, 0.72, 0.1), x, legH + 0.44, z, rot);
  placed(b.cloth, new THREE.BoxGeometry(0.45, 0.1, 0.18), x, legH + 0.79, z, rot);
  for (const sx of [-1, 1]) {
    const arm = new THREE.BoxGeometry(0.1, 0.56, 0.12);
    arm.rotateZ(sx * 0.2);
    arm.rotateY(rot);
    arm.translate(x + sx * 0.27, legH + 0.46, z);
    b[seed % 2 ? 'indigo' : 'rust'].push(arm);
    placed(b.terra, new THREE.SphereGeometry(0.062, 5, 4), x + sx * 0.31, legH + 0.2, z, rot);
  }
  const headY = legH + 0.82 + 0.15;
  placed(b.terra, new THREE.SphereGeometry(0.145, 7, 6), x, headY, z, rot);
  placed(b.cloth, new THREE.CylinderGeometry(0.17, 0.18, 0.13, 8), x, headY + 0.1, z, rot);
  const beard = new THREE.ConeGeometry(0.085, 0.24, 5);
  beard.rotateX(Math.PI);
  placed(b.cloth, beard, x, headY - 0.15, z + Math.cos(rot) * 0.11, rot);
  placed(b.wood, new THREE.CylinderGeometry(0.018, 0.024, 1.02, 4), x + Math.cos(rot) * 0.38, 0.51, z - Math.sin(rot) * 0.38, rot);
}

function addVisitor(b, x, z, rot, seed, child = false) {
  const s = child ? 0.68 : 1;
  const coat = seed % 3 === 0 ? b.cloth : seed % 3 === 1 ? b.rust : b.indigo;
  const legH = 0.6 * s;
  for (const sx of [-1, 1]) {
    placed(b.dark, new THREE.BoxGeometry(0.13 * s, legH, 0.15 * s), x + sx * 0.1 * s, legH * 0.5, z, rot);
  }
  placed(coat, new THREE.CylinderGeometry(0.18 * s, 0.24 * s, 0.7 * s, 7), x, legH + 0.35 * s, z, rot);
  for (const sx of [-1, 1]) {
    const arm = new THREE.BoxGeometry(0.1 * s, 0.5 * s, 0.12 * s);
    arm.rotateZ(sx * 0.1);
    arm.rotateY(rot);
    arm.translate(x + sx * 0.27 * s, legH + 0.38 * s, z);
    b[seed % 3 === 0 ? 'cloth' : seed % 3 === 1 ? 'rust' : 'indigo'].push(arm);
  }
  const headY = legH + 0.7 * s + 0.16 * s;
  placed(b.terra, new THREE.SphereGeometry(0.145 * s, 7, 6), x, headY, z, rot);
  placed(b.cloth, new THREE.ConeGeometry(0.26 * s, 0.13 * s, 8), x, headY + 0.13 * s, z, rot);
  placed(seed % 2 ? b.rust : b.dark, new THREE.BoxGeometry(0.3 * s, 0.4 * s, 0.16 * s), x - Math.sin(rot) * 0.2 * s, legH + 0.42 * s, z - Math.cos(rot) * 0.2 * s, rot);
  if (!child) {
    placed(b.dark, new THREE.BoxGeometry(0.16, 0.11, 0.1), x + Math.sin(rot) * 0.2, headY - 0.02, z + Math.cos(rot) * 0.2, rot);
  }
}

function addPackHorse(b, x, z, rot, seed) {
  const body = new THREE.SphereGeometry(0.53, 8, 6);
  body.scale(1.5, 0.82, 0.62);
  body.translate(x, 1.08, z);
  b.horse.push(body);
  const neck = new THREE.CylinderGeometry(0.17, 0.27, 0.78, 7);
  neck.rotateX(-0.58);
  neck.translate(x + Math.sin(rot) * 0.47, 1.5, z + Math.cos(rot) * 0.47);
  b.horse.push(neck);
  const head = new THREE.BoxGeometry(0.26, 0.32, 0.58);
  head.rotateX(-0.18);
  head.rotateY(rot);
  head.translate(x + Math.sin(rot) * 0.83, 1.82, z + Math.cos(rot) * 0.83);
  b.horse.push(head);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const leg = new THREE.CylinderGeometry(0.07, 0.085, 0.9, 5);
      leg.translate(x + sx * 0.36 * Math.cos(rot) + sz * 0.32 * Math.sin(rot), 0.45, z - sx * 0.36 * Math.sin(rot) + sz * 0.32 * Math.cos(rot));
      b.horse.push(leg);
    }
    const ear = new THREE.ConeGeometry(0.065, 0.2, 4);
    placed(b.horse, ear, x + sx * 0.09 * Math.cos(rot) + Math.sin(rot) * 0.78, 2.01, z - sx * 0.09 * Math.sin(rot) + Math.cos(rot) * 0.78, rot);
  }
  const tail = new THREE.ConeGeometry(0.11, 0.7, 5);
  tail.rotateX(0.72);
  placed(b.horse, tail, x - Math.sin(rot) * 0.7, 1.12, z - Math.cos(rot) * 0.7, rot);
  const saddle = new THREE.BoxGeometry(0.62, 0.1, 0.84);
  placed(b.rust, saddle, x, 1.5, z, rot);
  const blanket = new THREE.BoxGeometry(0.88, 0.06, 0.94);
  placed(b.indigo, blanket, x, 1.43, z, rot);
  for (const sx of [-1, 1]) {
    placed(b.terra, new THREE.CylinderGeometry(0.19, 0.17, 0.46, 7), x + sx * 0.61 * Math.cos(rot), 1.25, z - sx * 0.61 * Math.sin(rot), rot);
    placed(b.wood, new THREE.CylinderGeometry(0.2, 0.2, 0.05, 7), x + sx * 0.61 * Math.cos(rot), 1.5, z - sx * 0.61 * Math.sin(rot), rot);
  }
  if (seed % 2 === 0) {
    const bundle = new THREE.CylinderGeometry(0.13, 0.13, 0.9, 6);
    bundle.rotateZ(Math.PI * 0.5);
    placed(b.cloth, bundle, x, 1.75, z - 0.1, rot);
  }
}

function addStool(wood, x, z, rot) {
  placed(wood, new THREE.CylinderGeometry(0.19, 0.18, 0.06, 7), x, 0.42, z, 0);
  for (let i = 0; i < 3; i++) {
    const a = rot + (i / 3) * Math.PI * 2;
    placed(wood, new THREE.CylinderGeometry(0.025, 0.03, 0.42, 4), x + Math.cos(a) * 0.12, 0.21, z + Math.sin(a) * 0.12, 0);
  }
}

function addStackedBaskets(terra, wood, x, z, seed) {
  for (let i = 0; i < 3; i++) {
    const r = (0.29 - i * 0.025) * (0.9 + (seed % 3) * 0.08);
    placed(terra, new THREE.CylinderGeometry(r, r * 0.84, 0.24, 8), x + (i % 2) * 0.05, 0.12 + i * 0.22, z, 0);
    const rim = new THREE.TorusGeometry(r, 0.022, 4, 8);
    rim.rotateX(Math.PI / 2);
    rim.translate(x + (i % 2) * 0.05, 0.24 + i * 0.22, z);
    wood.push(rim);
  }
}

export function createLijiangFinalPolish({ canals = [], bridges = [], houses = [] }) {
  const staticGroup = new THREE.Group();
  const dynamicGroup = new THREE.Group();
  const stone = [];
  const granite = [];
  const moss = [];
  const blade = [];
  const reedHead = [];
  const gold = [];
  const dark = [];
  const rust = [];
  const cloth = [];
  const indigo = [];
  const terra = [];
  const wood = [];
  const horse = [];
  const bannerDefs = [];
  const foamDefs = [];
  const steamDefs = [];
  const stats = { banners: 0, figures: 0, horses: 0, foam: 0, steam: 0, washSteps: 0 };

  const weirDefs = [
    { canal: 0, at: -136 }, { canal: 0, at: 56 }, { canal: 0, at: 112 },
    { canal: 1, at: -98 }, { canal: 1, at: 8 }, { canal: 2, at: -70 },
  ];

  for (let ci = 0; ci < canals.length; ci++) {
    const c = canals[ci];
    const alongZ = c.d > c.w;
    const run = alongZ ? c.d : c.w;
    const span = alongZ ? c.w : c.d;
    const n = Math.max(18, Math.round(run / 2.9));
    for (let i = 0; i < n; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const along = -run * 0.48 + ((i + 0.5) / n) * run * 0.96;
      const lx = alongZ ? side * (span * 0.5 + 0.38) : along;
      const lz = alongZ ? along : side * (span * 0.5 + 0.38);
      const [x, z] = canalPoint(c, lx, lz);
      if (rnd(ci + 30, i) > 0.55) {
        addBlob(moss, 0.14 + rnd(ci + 31, i) * 0.1, x, 0.39, z, 1.65, 0.22, 1.2);
        if (i % 3 === 0) {
          const [bx, bz] = canalPoint(c, lx - side * 0.16, lz + (rnd(ci + 32, i) - 0.5) * 0.8);
          for (let k = 0; k < 3; k++) {
            const h = 0.4 + rnd(ci + 33, i + k) * 0.45;
            const g = new THREE.ConeGeometry(0.035, h, 4);
            g.rotateZ((rnd(ci + 34, i + k) - 0.5) * 0.55);
            g.translate(bx + (rnd(ci + 35, i + k) - 0.5) * 0.28, 0.04 + h * 0.5, bz + (rnd(ci + 36, i + k) - 0.5) * 0.28);
            blade.push(g);
          }
        }
      }
      if (i % 5 === 1) {
        const rx = alongZ ? side * (span * 0.5 - 0.32) : along + (rnd(ci + 40, i) - 0.5) * 0.6;
        const rz = alongZ ? along + (rnd(ci + 40, i) - 0.5) * 0.6 : side * (span * 0.5 - 0.32);
        const [x2, z2] = canalPoint(c, rx, rz);
        for (let k = 0; k < 3; k++) {
          const h = 0.75 + rnd(ci + 41, i + k) * 0.55;
          const ox = (rnd(ci + 42, i + k) - 0.5) * 0.3;
          const oz = (rnd(ci + 43, i + k) - 0.5) * 0.3;
          const stalk = new THREE.CylinderGeometry(0.012, 0.016, h, 3);
          stalk.translate(x2 + ox, h * 0.5 - 0.02, z2 + oz);
          blade.push(stalk);
          const head = new THREE.CylinderGeometry(0.032, 0.038, 0.16, 6);
          head.translate(x2 + ox, h - 0.08, z2 + oz);
          reedHead.push(head);
        }
      }
    }
  }

  for (const wd of weirDefs) {
    const c = canals[wd.canal];
    if (!c) continue;
    const alongZ = c.d > c.w;
    const lx = alongZ ? 0 : wd.at - c.x;
    const lz = alongZ ? wd.at - c.z : 0;
    const [wx, wz] = canalPoint(c, lx, lz);
    const across = alongZ ? c.w : c.d;
    if (wd.canal !== 1) {
      addCanalBox(stone, c, 0.5, 1.0, across + 0.4, lx - (alongZ ? across * 0.5 + 0.2 : 0), 0.5, lz - (alongZ ? 0 : across * 0.5 + 0.2));
      addCanalBox(stone, c, 0.5, 1.0, across + 0.4, lx + (alongZ ? across * 0.5 + 0.2 : 0), 0.5, lz + (alongZ ? 0 : across * 0.5 + 0.2));
      addCanalBox(wood, c, 0.16, 0.16, across + 0.45, lx, 1.02, lz);
    }
    for (let i = 0; i < 10; i++) {
      foamDefs.push({
        x: wx + (rnd(70 + wd.canal, i) - 0.5) * (alongZ ? c.w * 0.9 : 1.3),
        z: wz + (rnd(71 + wd.canal, i) - 0.5) * (alongZ ? 1.3 : c.d * 0.9),
        phase: rnd(72 + wd.canal, i) * 6.28,
        base: 0.11 + rnd(73 + wd.canal, i) * 0.12,
      });
    }
  }
  stats.foam = foamDefs.length;

  const washSpots = [
    { canal: 0, at: -112, side: -1 }, { canal: 0, at: -18, side: 1 },
    { canal: 0, at: 92, side: -1 }, { canal: 2, at: -84, side: 1 },
  ];
  for (let wi = 0; wi < washSpots.length; wi++) {
    const w = washSpots[wi];
    const c = canals[w.canal];
    if (!c) continue;
    const alongZ = c.d > c.w;
    const lx = alongZ ? w.side * (c.w * 0.5 - 0.55) : w.at - c.x;
    const lz = alongZ ? w.at - c.z : w.side * (c.d * 0.5 - 0.55);
    for (let k = 0; k < 4; k++) {
      addCanalBox(stone, c, alongZ ? 1.5 : 1.15, 0.13, alongZ ? 1.15 : 1.5, lx + (alongZ ? w.side * k * 0.3 : 0), 0.2 - k * 0.09, lz + (alongZ ? 0 : w.side * k * 0.3));
    }
    addCanalBox(stone, c, alongZ ? 0.28 : 0.85, 0.5, alongZ ? 0.85 : 0.28, lx, 0.24, lz + (alongZ ? 0.9 : 0));
    addCanalBox(stone, c, alongZ ? 0.28 : 0.85, 0.5, alongZ ? 0.85 : 0.28, lx, 0.24, lz - (alongZ ? 0.9 : 0));
    const [bx, bz] = canalPoint(c, lx, lz);
    placed(wood, new THREE.BoxGeometry(0.62, 0.09, 0.34), bx, 0.4, bz, c.rot + (alongZ ? 0 : Math.PI * 0.5));
    placed(wood, new THREE.CylinderGeometry(0.17, 0.19, 0.3, 7), bx + 0.65, 0.16, bz + 0.3, 0);
    stats.washSteps++;
  }

  for (const b of bridges) {
    for (const side of [-1, 1]) {
      for (let i = 0; i <= 10; i++) {
        const t = -1 + (2 * i) / 10;
        const lz = (t * b.span) / 2;
        const yy = archY(t, b.span, b.rise, b.baseY);
        const lx = side * (b.width * 0.5 - 0.1);
        if (i % 2 === 0) {
          addBridgeBox(granite, b, 0.15, 0.16, 0.15, lx, yy + 1.36, lz);
          addBridgeBox(gold, b, 0.08, 0.12, 0.08, lx, yy + 1.5, lz);
        }
        if (i > 0 && i < 10) {
          addBridgeBox(gold, b, 0.035, 0.24, 0.035, side * (b.width * 0.5 + 0.02), yy + 0.9, lz);
          addBridgeBox(stone, b, 0.035, 0.24, 0.035, side * (b.width * 0.5 + 0.02), yy + 0.9, lz + 0.16);
          addBridgeBox(gold, b, 0.02, 0.1, 0.02, side * (b.width * 0.5 + 0.04), yy + 0.9, lz + 0.08);
        }
      }
      for (const k of [-0.28, 0, 0.28]) {
        const lz = k * b.span;
        const yy = archY(k * 2, b.span, b.rise, b.baseY);
        addBridgeBox(gold, b, 0.05, 0.2, 0.2, side * (b.width * 0.5 + 0.1), yy + 0.56, lz);
        addBridgeBox(gold, b, 0.05, 0.2, 0.05, side * (b.width * 0.5 + 0.1), yy + 0.56, lz + 0.18);
      }
    }
  }

  const teaSpots = [
    [-20, 4, 0.3], [9, 3, -0.4], [12, 24, 0.8], [-17, 34, 2.2],
    [44.2, 40, 0.1], [59.4, 108, 3.1], [-51.2, 30, 0.2], [-64.2, -14, 3.0],
  ];
  teaSpots.forEach((t, i) => {
    steamDefs.push({ x: t[0], z: t[1], y: 0.78, seed: i });
    for (let k = 0; k < 2; k++) {
      const a = t[2] + Math.PI * (0.5 + k);
      addStool(wood, t[0] + Math.cos(a) * 0.82, t[1] - Math.sin(a) * 0.82, a);
    }
    if (i % 2 === 0) {
      placed(terra, new THREE.CylinderGeometry(0.09, 0.09, 0.16, 8), t[0] + Math.cos(t[2]) * 0.38, 0.64, t[1] - Math.sin(t[2]) * 0.38, 0);
      placed(wood, new THREE.CylinderGeometry(0.105, 0.105, 0.03, 8), t[0] + Math.cos(t[2]) * 0.38, 0.73, t[1] - Math.sin(t[2]) * 0.38, 0);
    }
  });

  const shopHouses = houses.filter((h) => h.name);
  for (let hi = 0; hi < shopHouses.length; hi++) {
    const h = shopHouses[hi];
    const front = h.d * 0.5;
    if (hi % 2 === 0) {
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 5; col++) {
          addLocalBox(gold, h, 0.055, 0.055, 0.03, (col - 2) * 0.18, 0.92 + row * 0.25, front + 0.14);
        }
      }
    }
    if (hi % 3 === 0) {
      for (const side of [-1, 1]) {
        const lx = side * (h.w * 0.28 + 0.28);
        addLocalBox(rust, h, 0.22, 1.72, 0.055, lx, 1.95, front + 0.1);
        for (let k = 0; k < 5; k++) {
          addLocalBox(gold, h, 0.11, 0.055, 0.02, lx, 1.26 + k * 0.28, front + 0.14);
          if (k % 2 === 0) addLocalBox(gold, h, 0.04, 0.1, 0.02, lx, 1.34 + k * 0.28, front + 0.14);
        }
      }
    }
    if (hi % 3 === 1) {
      const y = 2.58;
      for (let k = 0; k < 4; k++) addLocalBox(dark, h, h.w * 0.34, 0.035, 0.05, 0, y - 0.18 + k * 0.12, front + 0.09);
      addLocalBox(dark, h, 0.04, 0.46, 0.05, -h.w * 0.15, y, front + 0.09);
      addLocalBox(dark, h, 0.04, 0.46, 0.05, h.w * 0.15, y, front + 0.09);
    }
    if (hi % 4 === 0) {
      const lx = -h.w * 0.5 + 0.7;
      addLocalBox(dark, h, 0.06, 0.06, 1.15, lx, 3.88, front + 0.55);
      addLocalBox(gold, h, 0.1, 0.1, 0.1, lx, 3.82, front + 1.1);
      addLocalBox(gold, h, 0.09, 0.04, 0.09, lx, 3.96, front + 0.05);
      const [bx, bz] = housePoint(h, lx, front + 0.63);
      bannerDefs.push({ x: bx, z: bz, y: 3.84, rot: h.rot + Math.PI * 0.5, phase: rnd(150, hi) * 6.28 });
    }
    if (hi % 11 === 3) {
      addLocalBox(dark, h, 2.55, 0.055, 0.055, 0, 2.35, front + 0.9);
      addLocalBox(dark, h, 0.04, 0.92, 0.04, -1.25, 1.9, front + 0.9);
      addLocalBox(dark, h, 0.04, 0.92, 0.04, 1.25, 1.9, front + 0.9);
      for (let k = 0; k < 3; k++) {
        addLocalBox((hi + k) % 3 === 0 ? indigo : (hi + k) % 3 === 1 ? cloth : rust, h, 0.56, 0.8, 0.04, -0.74 + k * 0.74, 1.9, front + 0.89);
      }
    }
    if (hi % 9 === 5) {
      const [bx, bz] = housePoint(h, -h.w * 0.31, front + 0.62);
      addStackedBaskets(terra, wood, bx, bz, hi);
    }
    const capN = Math.max(10, Math.round(h.w / 0.7));
    const eaveY = 0.42 + 3.25 + (h.storeys > 1 ? 2.45 : 0);
    for (let i = 0; i < capN; i += 2) {
      const lx = -h.w * 0.5 - 0.55 + (i / Math.max(1, capN - 1)) * (h.w + 1.1);
      addLocalBox(dark, h, 0.1, 0.2, 0.06, lx, eaveY - 0.18, front + 1.02);
      addLocalBox(gold, h, 0.04, 0.1, 0.02, lx, eaveY - 0.25, front + 1.06);
    }
  }

  const elderSpots = [
    [-22, 6, 0.8], [11, 5, 2.4], [-38, 59, 1.4], [47, 61, 3.0], [57, 103, 2.2],
  ];
  elderSpots.forEach((p, i) => { addElder({ dark, indigo, rust, cloth, terra, wood }, p[0], p[1], p[2], i); stats.figures++; });
  const visitorSpots = [
    [17, 19, 0.5], [-9, 12, 2.1], [20, 9, 3.3], [49, 70, 0.3], [-36, 63, 2.7],
    [58, 115, 0.1], [-53, 36, 2.9], [4, 98, 1.1], [61, -20, 3.4], [-66, -42, 0.2],
  ];
  visitorSpots.forEach((p, i) => { addVisitor({ dark, indigo, rust, cloth, terra, wood }, p[0], p[1], p[2], i); stats.figures++; });
  addVisitor({ dark, indigo, rust, cloth, terra, wood }, 3, 21, 1.9, 12, true);
  addVisitor({ dark, indigo, rust, cloth, terra, wood }, -15, 23, 2.8, 13, true);
  stats.figures += 2;

  const horseDefs = [
    [45.4, 119, 0.02, 0], [46.3, 110, -0.06, 1], [44.8, 128, 0.1, 2], [8, 30, 2.8, 3],
  ];
  for (const [hx, hz, hr, hs] of horseDefs) {
    addPackHorse({ horse, rust, indigo, terra, wood, cloth }, hx, hz, hr, hs);
    stats.horses++;
  }
  addElder({ dark, indigo, rust, cloth, terra, wood }, 44.1, 126.5, 0.2, 5);
  stats.figures++;

  const staticSets = [
    [stone, mats.stone], [granite, mats.waterStone], [moss, mats.rockMoss],
    [blade, mats.blade], [reedHead, mats.terracotta], [gold, mats.gold],
    [dark, mats.naxiWoodDark], [rust, mats.rust], [cloth, mats.cloth],
    [indigo, mats.indigo], [terra, mats.terracotta], [wood, mats.naxiWood],
    [horse, mats.horse],
  ];
  for (const [list, material] of staticSets) {
    const mesh = mergedMesh(list, material, true, true);
    if (mesh) staticGroup.add(mesh);
  }

  const foamGeo = new THREE.IcosahedronGeometry(0.5, 0);
  const foam = new THREE.InstancedMesh(foamGeo, mats.ripple, foamDefs.length);
  foam.frustumCulled = false;
  foam.renderOrder = 2;
  dynamicGroup.add(foam);

  const bannerGeo = new THREE.PlaneGeometry(0.56, 1.35, 1, 3);
  bannerGeo.translate(0, -0.675, 0);
  const banners = new THREE.InstancedMesh(bannerGeo, mats.cloth, Math.max(1, bannerDefs.length));
  banners.count = bannerDefs.length;
  banners.frustumCulled = false;
  const bannerColor = new THREE.Color();
  bannerDefs.forEach((b, i) => {
    bannerColor.setHex(i % 3 === 0 ? 0x335270 : i % 3 === 1 ? 0x98543a : 0xcbbf9e);
    banners.setColorAt(i, bannerColor);
  });
  if (banners.instanceColor) banners.instanceColor.needsUpdate = true;
  dynamicGroup.add(banners);
  stats.banners = bannerDefs.length;

  const steamCount = steamDefs.length * 7;
  const steamPos = new Float32Array(steamCount * 3);
  const steamSize = new Float32Array(steamCount);
  const steamAlpha = new Float32Array(steamCount);
  const steamData = [];
  for (let i = 0; i < steamCount; i++) {
    const s = steamDefs[i % steamDefs.length];
    steamData.push({ base: s, phase: rnd(200, i) * 6.28, rise: 0.35 + rnd(201, i) * 0.5, drift: 0.12 + rnd(202, i) * 0.3, size: 0.2 + rnd(203, i) * 0.24 });
    steamSize[i] = 12;
  }
  const steamGeo = new THREE.BufferGeometry();
  steamGeo.setAttribute('position', new THREE.BufferAttribute(steamPos, 3));
  steamGeo.setAttribute('aSize', new THREE.BufferAttribute(steamSize, 1));
  steamGeo.setAttribute('aAlpha', new THREE.BufferAttribute(steamAlpha, 1));
  const steamMat = new THREE.ShaderMaterial({
    uniforms: {},
    vertexShader: `
      attribute float aSize;
      attribute float aAlpha;
      varying float vAlpha;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * (260.0 / max(1.0, -mv.z));
        gl_Position = projectionMatrix * mv;
        vAlpha = aAlpha;
      }
    `,
    fragmentShader: `
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - vec2(0.5));
        float a = smoothstep(0.5, 0.08, d) * vAlpha;
        if (a < 0.01) discard;
        gl_FragColor = vec4(0.94, 0.93, 0.88, a * 0.42);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });
  const steam = new THREE.Points(steamGeo, steamMat);
  steam.frustumCulled = false;
  steam.renderOrder = 4;
  dynamicGroup.add(steam);
  stats.steam = steamCount;

  const dummy = new THREE.Object3D();
  function update(time) {
    for (let i = 0; i < foamDefs.length; i++) {
      const f = foamDefs[i];
      const pulse = 0.65 + 0.35 * Math.sin(time * 2.6 + f.phase);
      dummy.position.set(f.x + Math.sin(time * 1.4 + f.phase) * 0.1, 0.02 + Math.sin(time * 1.8 + f.phase) * 0.03, f.z + Math.cos(time * 1.2 + f.phase) * 0.1);
      dummy.rotation.set(0, time * 0.3 + f.phase, 0);
      dummy.scale.set(f.base * pulse * 1.5, f.base * pulse * 0.4, f.base * pulse);
      dummy.updateMatrix();
      foam.setMatrixAt(i, dummy.matrix);
    }
    foam.instanceMatrix.needsUpdate = true;

    bannerDefs.forEach((b, i) => {
      const sway = Math.sin(time * 1.55 + b.phase) * 0.18;
      dummy.position.set(b.x, b.y, b.z);
      dummy.rotation.set(sway * 0.3, b.rot, sway);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      banners.setMatrixAt(i, dummy.matrix);
    });
    if (bannerDefs.length) banners.instanceMatrix.needsUpdate = true;

    const pos = steamGeo.attributes.position;
    const alpha = steamGeo.attributes.aAlpha;
    const size = steamGeo.attributes.aSize;
    for (let i = 0; i < steamCount; i++) {
      const s = steamData[i];
      const k = ((time * s.rise + s.phase) % 3.2) / 3.2;
      const spread = 0.08 + k * 0.34;
      pos.setXYZ(
        i,
        s.base.x + Math.sin(time * 0.7 + s.phase) * spread + s.drift * k,
        s.base.y + k * 1.65,
        s.base.z + Math.cos(time * 0.6 + s.phase) * spread
      );
      alpha.setX(i, Math.sin(k * Math.PI) * (1 - k * 0.35));
      size.setX(i, s.size * (0.7 + k * 0.9));
    }
    pos.needsUpdate = true;
    alpha.needsUpdate = true;
    size.needsUpdate = true;
  }

  return { staticGroup, dynamicGroup, update, stats };
}
