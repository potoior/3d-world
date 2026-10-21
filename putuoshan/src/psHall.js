import * as THREE from 'three';
import { mats, makePlaqueMaterial } from './putuoshanTextures.js';
import { mesh, box, cyl, mergeBoxes } from './psUtil.js';
import { createRoof } from './psRoof.js';

export function createHall({
  w = 30,
  d = 16,
  wallH = 7,
  roofH = 6,
  baseH = 1.2,
  name = '',
  roofMat = mats.roofGray,
  bays = 5,
  doubleEave = false,
  steps = true,
  plaque = true,
  platformExtra = 5,
  doorPanel = true,
  sideDetail = true,
}) {
  const g = new THREE.Group();
  const baseW = w + platformExtra;
  const baseD = d + platformExtra;

  box(g, mats.stone, baseW, baseH, baseD, 0, baseH * 0.5, 0);
  box(g, mats.stoneDark, baseW + 0.55, 0.22, baseD + 0.55, 0, baseH + 0.08, 0);
  box(g, mats.stoneLight, w + 0.2, 0.32, d + 0.2, 0, baseH + 0.22, 0);

  if (steps) {
    const sw = Math.min(w * 0.52, 17);
    const sd = Math.max(2.4, baseH * 1.35);
    const n = Math.max(3, Math.round(baseH / 0.28));
    for (let i = 0; i < n; i++) {
      const t = (i + 1) / n;
      const h = baseH * t;
      const depth = sd / n;
      box(g, mats.stone, sw, h, depth, 0, h * 0.5, d * 0.5 + platformExtra * 0.5 + (n - i - 0.5) * depth);
      box(g, mats.stoneDark, sw + 0.35, 0.1, depth + 0.03, 0, h + 0.03, d * 0.5 + platformExtra * 0.5 + (n - i - 0.5) * depth);
    }
  }

  box(g, mats.wall, w, wallH, d, 0, baseH + wallH * 0.5, 0);
  box(g, mats.wallDeep, w + 0.2, 0.6, d + 0.2, 0, baseH + 0.38, 0);
  box(g, mats.stoneDark, w + 0.55, 0.55, d + 0.55, 0, baseH + 0.72, 0);

  const bayW = w / bays;
  const colH = wallH * 1.03;
  const colR = Math.max(0.28, Math.min(0.46, w * 0.012));
  for (let i = 0; i <= bays; i++) {
    const x = -w * 0.5 + i * bayW;
    for (const sz of [-1, 1]) {
      cyl(g, mats.wood, colR, colR * 1.1, colH, 9, x, baseH + colH * 0.5, sz * (d * 0.5 + 0.58));
      cyl(g, mats.stoneDark, colR * 1.55, colR * 1.7, 0.34, 8, x, baseH + 0.17, sz * (d * 0.5 + 0.58));
    }
  }
  const sideBays = Math.max(2, Math.round(d / 6.5));
  for (let i = 1; i < sideBays; i++) {
    const z = -d * 0.5 + (i * d) / sideBays;
    for (const sx of [-1, 1]) {
      cyl(g, mats.wood, colR, colR * 1.1, colH, 9, sx * (w * 0.5 + 0.58), baseH + colH * 0.5, z);
      cyl(g, mats.stoneDark, colR * 1.55, colR * 1.7, 0.34, 8, sx * (w * 0.5 + 0.58), baseH + 0.17, z);
    }
  }

  if (doorPanel) {
    const doorW = Math.min(w * 0.5, 15);
    const doorH = wallH * 0.62;
    box(g, mats.door, doorW, doorH, 0.22, 0, baseH + doorH * 0.5 + 0.2, d * 0.5 + 0.14);
    box(g, mats.gold, doorW + 0.26, 0.13, 0.13, 0, baseH + doorH + 0.3, d * 0.5 + 0.25);
    box(g, mats.gold, doorW + 0.26, 0.1, 0.12, 0, baseH + 0.24, d * 0.5 + 0.25);
    box(g, mats.gold, 0.17, doorH + 0.2, 0.14, -doorW * 0.5 - 0.1, baseH + doorH * 0.5 + 0.2, d * 0.5 + 0.24);
    box(g, mats.gold, 0.17, doorH + 0.2, 0.14, doorW * 0.5 + 0.1, baseH + doorH * 0.5 + 0.2, d * 0.5 + 0.24);
    box(g, mats.goldDark, 0.1, doorH * 0.92, 0.1, 0, baseH + doorH * 0.5 + 0.2, d * 0.5 + 0.27);
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 4; c++) {
        box(g, mats.brass, 0.11, 0.11, 0.09, (c - 1.5) * doorW * 0.16, baseH + 0.72 + r * doorH * 0.18, d * 0.5 + 0.27);
      }
    }
  }

  if (sideDetail) {
    const winW = Math.min(2.4, bayW * 0.52);
    const winH = wallH * 0.42;
    for (let i = 0; i < bays; i++) {
      const x = -w * 0.5 + bayW * (i + 0.5);
      if (Math.abs(x) < w * 0.28 && doorPanel) continue;
      box(g, mats.lattice, winW, winH, 0.14, x, baseH + wallH * 0.56, d * 0.5 + 0.12);
      box(g, mats.gold, winW + 0.25, 0.1, 0.08, x, baseH + wallH * 0.56 + winH * 0.5, d * 0.5 + 0.2);
      box(g, mats.gold, winW + 0.25, 0.1, 0.08, x, baseH + wallH * 0.56 - winH * 0.5, d * 0.5 + 0.2);
      box(g, mats.gold, 0.09, winH, 0.08, x - winW * 0.5, baseH + wallH * 0.56, d * 0.5 + 0.2);
      box(g, mats.gold, 0.09, winH, 0.08, x + winW * 0.5, baseH + wallH * 0.56, d * 0.5 + 0.2);
      for (let k = -1; k <= 1; k++) {
        box(g, mats.gold, 0.055, winH * 0.94, 0.06, x + k * winW * 0.25, baseH + wallH * 0.56, d * 0.5 + 0.22);
      }
      for (const yy of [-0.18, 0.18]) {
        box(g, mats.gold, winW * 0.94, 0.055, 0.06, x, baseH + wallH * 0.56 + winH * yy, d * 0.5 + 0.22);
      }
    }
    for (const sx of [-1, 1]) {
      box(g, mats.lattice, 0.15, wallH * 0.44, d * 0.56, sx * (w * 0.5 + 0.12), baseH + wallH * 0.56, 0);
      for (let k = 0; k < 5; k++) {
        box(g, mats.gold, 0.07, wallH * 0.4, 0.08, sx * (w * 0.5 + 0.2), baseH + wallH * 0.56, -d * 0.24 + k * d * 0.12);
      }
      box(g, mats.gold, 0.08, 0.08, d * 0.58, sx * (w * 0.5 + 0.2), baseH + wallH * 0.56, 0);
    }
  }

  box(g, mats.teal, w + 0.7, 0.28, d + 0.7, 0, baseH + wallH - 0.7, 0);
  box(g, mats.gold, w + 0.78, 0.1, d + 0.78, 0, baseH + wallH - 0.48, 0);
  box(g, mats.teal, w + 0.4, 0.22, d + 0.4, 0, baseH + wallH - 1.25, 0);
  box(g, mats.gold, w + 0.5, 0.08, d + 0.5, 0, baseH + wallH - 1.07, 0);

  const dougong = [];
  for (let x = -w * 0.5 + 1; x <= w * 0.5 - 1; x += 1.9) {
    for (const sz of [-1, 1]) {
      const z = sz * (d * 0.5 + 0.72);
      dougong.push(new THREE.BoxGeometry(0.55, 0.4, 0.95).translate(x, baseH + wallH - 0.24, z));
      dougong.push(new THREE.BoxGeometry(1.05, 0.16, 0.75).translate(x, baseH + wallH + 0.05, z + sz * 0.05));
    }
  }
  for (let z = -d * 0.5 + 1.4; z <= d * 0.5 - 1.4; z += 1.9) {
    for (const sx of [-1, 1]) {
      const x = sx * (w * 0.5 + 0.72);
      dougong.push(new THREE.BoxGeometry(0.95, 0.4, 0.55).translate(x, baseH + wallH - 0.24, z));
      dougong.push(new THREE.BoxGeometry(0.75, 0.16, 1.05).translate(x, baseH + wallH + 0.05, z));
    }
  }
  mesh(g, mergeBoxes(dougong), mats.teal, true, false);

  const eaveY = baseH + wallH;
  if (doubleEave) {
    const lowerY = baseH + wallH * 0.66;
    const lowerH = roofH * 0.52;
    const lower = createRoof({
      width: w + 7,
      depth: d + 7,
      height: lowerH,
      cornerLift: Math.max(2.2, w * 0.09),
      curve: 1.65,
      material: roofMat,
      ridge: false,
      beasts: false,
    });
    lower.position.y = lowerY;
    g.add(lower);

    const upperW = w * 0.76;
    const upperD = d * 0.66;
    const upperWallH = wallH * 0.55;
    const upperBase = lowerY + lowerH * 0.35;
    box(g, mats.wall, upperW, upperWallH, upperD, 0, upperBase + upperWallH * 0.5, 0);
    box(g, mats.gold, upperW + 0.4, 0.18, upperD + 0.4, 0, upperBase + upperWallH - 0.35, 0);
    box(g, mats.teal, upperW + 0.5, 0.24, upperD + 0.5, 0, upperBase + upperWallH - 0.1, 0);
    const upper = createRoof({
      width: upperW + 6,
      depth: upperD + 6,
      height: roofH * 0.82,
      cornerLift: Math.max(2.0, w * 0.07),
      curve: 1.6,
      material: roofMat,
      ridge: true,
      beasts: true,
    });
    upper.position.y = upperBase + upperWallH;
    g.add(upper);
  } else {
    const roof = createRoof({
      width: w + 6,
      depth: d + 6,
      height: roofH,
      cornerLift: Math.max(2.0, w * 0.085),
      curve: 1.62,
      material: roofMat,
      ridge: true,
      beasts: true,
    });
    roof.position.y = eaveY;
    g.add(roof);
  }

  if (plaque && name) {
    const pw = Math.min(5.4, Math.max(2.4, name.length * 0.95));
    const ph = pw * 0.31;
    const plaqueMesh = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), makePlaqueMaterial(name));
    plaqueMesh.position.set(0, baseH + wallH * 0.8, d * 0.5 + 0.8);
    g.add(plaqueMesh);
    box(g, mats.gold, pw + 0.3, 0.14, 0.2, 0, baseH + wallH * 0.8 + ph * 0.5, d * 0.5 + 0.84);
    box(g, mats.gold, pw + 0.3, 0.14, 0.2, 0, baseH + wallH * 0.8 - ph * 0.5, d * 0.5 + 0.84);
    box(g, mats.gold, 0.14, ph + 0.28, 0.2, -pw * 0.5, baseH + wallH * 0.8, d * 0.5 + 0.84);
    box(g, mats.gold, 0.14, ph + 0.28, 0.2, pw * 0.5, baseH + wallH * 0.8, d * 0.5 + 0.84);
  }
  return g;
}

export function createGate({ w = 26, d = 12, wallH = 6.2, roofH = 5.2, name = '', roofMat = mats.roofGray }) {
  const g = new THREE.Group();
  box(g, mats.stone, w + 8, 1.0, d + 8, 0, 0.5, 0);
  box(g, mats.stoneDark, w + 8.6, 0.2, d + 8.6, 0, 1.08, 0);
  for (const sx of [-1, 1]) {
    box(g, mats.wall, w * 0.36, wallH, d, sx * w * 0.32, 1.0 + wallH * 0.5, 0);
  }
  box(g, mats.wall, w * 0.28, wallH * 0.55, d, 0, 1.0 + wallH * 0.275, 0);
  box(g, mats.wood, w * 0.28, wallH * 0.5, 0.22, 0, 1.0 + wallH * 0.25, d * 0.5 + 0.12);
  for (let i = 0; i < 4; i++) {
    const x = (i / 3 - 0.5) * w * 0.9;
    for (const sz of [-1, 1]) {
      cyl(g, mats.wood, 0.42, 0.47, wallH, 9, x, 1.0 + wallH * 0.5, sz * (d * 0.5 + 0.5));
    }
  }
  box(g, mats.gold, w * 0.94, 0.16, 0.35, 0, 1.0 + wallH - 0.9, d * 0.5 + 0.62);
  box(g, mats.teal, w * 0.98, 0.3, 0.5, 0, 1.0 + wallH - 0.6, d * 0.5 + 0.62);
  const roof = createRoof({
    width: w + 7,
    depth: d + 7,
    height: roofH,
    cornerLift: Math.max(2.2, w * 0.09),
    material: roofMat,
    ridge: true,
  });
  roof.position.y = 1.0 + wallH;
  g.add(roof);
  if (name) {
    const pw = Math.min(4.8, Math.max(2.2, name.length * 0.9));
    const plaqueMesh = new THREE.Mesh(new THREE.PlaneGeometry(pw, pw * 0.31), makePlaqueMaterial(name));
    plaqueMesh.position.set(0, 1.0 + wallH * 0.78, d * 0.5 + 0.7);
    g.add(plaqueMesh);
  }
  return g;
}

export function createCorridor({ length = 70, width = 6.4, wallH = 4.2, roofH = 3.2, bays = 12, roofMat = mats.roofGray }) {
  const g = new THREE.Group();
  box(g, mats.stone, length + 1.4, 0.8, width + 2.2, 0, 0.4, 0);
  for (let i = 0; i <= bays; i++) {
    const x = -length * 0.5 + (i * length) / bays;
    for (const sz of [-1, 1]) {
      cyl(g, mats.wood, 0.26, 0.3, wallH, 8, x, 0.8 + wallH * 0.5, sz * (width * 0.5 + 0.28));
    }
  }
  for (const sz of [-1, 1]) {
    box(g, mats.wall, length, wallH * 0.7, 0.35, 0, 0.8 + wallH * 0.35, sz * width * 0.5);
  }
  box(g, mats.lattice, length * 0.94, wallH * 0.42, 0.14, 0, 0.8 + wallH * 0.52, width * 0.5 + 0.22);
  box(g, mats.teal, length + 0.5, 0.26, width + 0.5, 0, 0.8 + wallH - 0.4, 0);
  box(g, mats.gold, length + 0.6, 0.08, width + 0.6, 0, 0.8 + wallH - 0.18, 0);
  const roof = createRoof({
    width: length + 2.4,
    depth: width + 3.4,
    height: roofH,
    cornerLift: 1.6,
    material: roofMat,
    ridge: false,
  });
  roof.position.y = 0.8 + wallH;
  g.add(roof);
  return g;
}

export function createPavilion({ size = 9, wallH = 5.0, roofH = 4.0, name = '', roofMat = mats.roofGray }) {
  const g = new THREE.Group();
  box(g, mats.stone, size + 2.6, 0.9, size + 2.6, 0, 0.45, 0);
  box(g, mats.stoneDark, size + 3.1, 0.18, size + 3.1, 0, 0.96, 0);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      cyl(g, mats.wood, 0.32, 0.38, wallH, 8, sx * size * 0.36, 0.9 + wallH * 0.5, sz * size * 0.36);
    }
  }
  box(g, mats.teal, size * 0.86, 0.3, size * 0.86, 0, 0.9 + wallH - 0.2, 0);
  box(g, mats.gold, size * 0.9, 0.1, size * 0.9, 0, 0.9 + wallH + 0.02, 0);
  const roof = createRoof({
    width: size + 3.6,
    depth: size + 3.6,
    height: roofH,
    cornerLift: 2.4,
    material: roofMat,
    ridge: false,
  });
  roof.position.y = 0.9 + wallH;
  g.add(roof);
  if (name) {
    const plaqueMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.82), makePlaqueMaterial(name));
    plaqueMesh.position.set(0, 0.9 + wallH * 0.72, size * 0.5 + 0.42);
    g.add(plaqueMesh);
  }
  return g;
}

export function createBridge({ width = 6.2, span = 36, rise = 2.2 }) {
  const g = new THREE.Group();
  const n = 14;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const z = (t - 0.5) * span;
    const y = Math.sin(t * Math.PI) * rise;
    const seg = span / n + 0.2;
    box(g, mats.stone, width, 0.34, seg, 0, y, z);
    box(g, mats.stoneDark, width + 0.25, 0.1, seg + 0.03, 0, y + 0.22, z);
    for (const sx of [-1, 1]) {
      box(g, mats.stoneLight, 0.28, 0.85, 0.34, sx * (width * 0.5 - 0.18), y + 0.55, z - seg * 0.35);
      box(g, mats.stoneLight, 0.2, 0.34, seg, sx * (width * 0.5 - 0.18), y + 1.0, z);
    }
  }
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      box(g, mats.stoneLight, 1.0, 1.1, 1.0, sx * width * 0.45, 0.4, sz * span * 0.5);
    }
  }
  return g;
}

export function createPond({ x = 0, z = 0, w = 92, d = 34, y = 0.2 }) {
  const g = new THREE.Group();
  box(g, mats.stone, w + 3.4, 0.9, d + 3.4, x, y - 0.5, z);
  box(g, mats.stoneDark, w + 4.2, 0.24, d + 4.2, x, y - 0.08, z);
  box(g, mats.stoneLight, w + 5.0, 0.5, 1.5, x, y + 0.2, z - d * 0.5 - 1.1);
  box(g, mats.stoneLight, w + 5.0, 0.5, 1.5, x, y + 0.2, z + d * 0.5 + 1.1);
  box(g, mats.stoneLight, 1.5, 0.5, d + 4.0, x - w * 0.5 - 1.1, y + 0.2, z);
  box(g, mats.stoneLight, 1.5, 0.5, d + 4.0, x + w * 0.5 + 1.1, y + 0.2, z);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(w, d, 18, 8), mats.waterPond);
  water.rotation.x = -Math.PI / 2;
  water.position.set(x, y + 0.2, z);
  water.receiveShadow = true;
  g.add(water);
  for (let i = 0; i < 22; i++) {
    const px = x - w * 0.44 + ((i * 37) % 100) / 100 * w * 0.88;
    const pz = z - d * 0.38 + ((i * 61) % 100) / 100 * d * 0.76;
    const pad = new THREE.CylinderGeometry(0.7 + (i % 4) * 0.16, 0.8 + (i % 3) * 0.14, 0.06, 9);
    pad.translate(px, y + 0.24, pz);
    mesh(g, pad, mats.shrub, false, true);
  }
  return g;
}
