import * as THREE from 'three';
import { M, UP, add, box, cyl, ball, bar3, archRing, patch, frontAt, topAt } from './yungangCommon.js';
import { terrainHeight } from './terrain.js';

function flameHalo(g, x, y, z, radius, m, count = 18) {
  const ring = new THREE.TorusGeometry(radius, 0.42, 5, 28);
  ring.rotateY(Math.PI / 2);
  ring.translate(x, y, z);
  add(g, ring, m, 0, 0, 0);
  const inner = new THREE.TorusGeometry(radius * 0.78, 0.2, 4, 24);
  inner.rotateY(Math.PI / 2);
  inner.translate(x, y, z);
  add(g, inner, m, 0, 0, 0);
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const dy = Math.sin(a);
    const dz = Math.cos(a);
    const geo = new THREE.ConeGeometry(0.5, 2.2 + (i % 3) * 0.5, 4);
    const o = new THREE.Mesh(geo, m);
    o.position.set(x, y + dy * (radius + 0.9), z + dz * (radius + 0.9));
    o.quaternion.setFromUnitVectors(UP, new THREE.Vector3(0, dy, dz));
    o.castShadow = true;
    g.add(o);
  }
}

export function seatedBuddha(g, x, z, s, baseY, detail = true) {
  const seg = detail ? 16 : 10;
  const headSeg = detail ? 18 : 12;
  box(g, 23 * s, 2.4 * s, 25 * s, M.rockDark, x + 1.5 * s, baseY + 1.2 * s, z);
  box(g, 19 * s, 3.2 * s, 20 * s, M.stoneDark, x + 1.6 * s, baseY + 4.0 * s, z);
  ball(g, 14, M.carve, x + 0.6 * s, baseY + 7.4 * s, z, 9.5 * s, 2.6 * s, 10.5 * s);
  ball(g, seg, M.carve, x + 1.2 * s, baseY + 16.0 * s, z, 6.1 * s, 8.6 * s, 7.4 * s);
  ball(g, seg, M.carve, x + 0.8 * s, baseY + 21.0 * s, z, 8.3 * s, 2.3 * s, 8.2 * s);
  cyl(g, 1.9 * s, 2.4 * s, 3.0 * s, headSeg, M.carve, x - 0.1 * s, baseY + 23.7 * s, z);
  const hy = baseY + 28.2 * s;
  ball(g, headSeg, M.carve, x - 0.4 * s, hy, z, 4.2 * s, 4.7 * s, 3.9 * s);
  ball(g, headSeg, M.carve, x - 0.6 * s, hy + 3.9 * s, z, 2.5 * s, 2.1 * s, 2.5 * s);
  for (const sz of [-1, 1]) {
    ball(g, 8, M.carve, x - 1.0 * s, hy - 0.2 * s, z + sz * 4.0 * s, 1.0 * s, 2.7 * s, 0.8 * s);
    box(g, 0.35 * s, 1.6 * s, 0.6 * s, M.stoneDark, x - 4.5 * s, hy + 0.9 * s, z + sz * 1.55 * s);
    box(g, 0.28 * s, 0.5 * s, 0.45 * s, M.woodDark, x - 4.62 * s, hy - 1.55 * s, z + sz * 1.5 * s);
  }
  ball(g, 8, M.carve, x - 4.55 * s, hy - 0.4 * s, z, 1.1 * s, 1.8 * s, 0.75 * s);
  box(g, 0.4 * s, 0.4 * s, 2.0 * s, M.woodDark, x - 4.78 * s, hy - 1.75 * s, z);
  ball(g, 6, M.gold, x - 4.75 * s, hy + 2.25 * s, z, 0.34 * s, 0.34 * s, 0.34 * s);
  box(g, 0.3 * s, 0.9 * s, 0.5 * s, M.stoneDark, x - 4.7 * s, hy - 3.2 * s, z);
  const hairGeo = new THREE.SphereGeometry(0.68 * s, detail ? 7 : 5, detail ? 5 : 4);
  for (let row = 0; row < (detail ? 7 : 4); row++) {
    const phi = 0.12 + row * 0.17;
    const n = 10 + row * 2;
    for (let i = 0; i < n; i++) {
      const lon = (i / n) * Math.PI * 2;
      const px = x - 0.4 * s + Math.cos(lon) * Math.cos(phi) * 3.75 * s;
      const py = hy + Math.sin(phi) * 4.32 * s;
      const pz = z + Math.sin(lon) * Math.cos(phi) * 3.6 * s;
      if (px < x - 3.2 * s && py < hy + 2.2 * s) continue;
      const o = new THREE.Mesh(hairGeo, M.stoneDark);
      o.position.set(px, py, pz);
      o.castShadow = true;
      g.add(o);
    }
  }
  for (const sz of [-1, 1]) {
    const shoulder = new THREE.Vector3(x + 0.5 * s, baseY + 21.5 * s, z + sz * 6.3 * s);
    const elbow = new THREE.Vector3(x - 3.0 * s, baseY + 13.4 * s, z + sz * 8.2 * s);
    const hand = sz > 0
      ? new THREE.Vector3(x - 6.2 * s, baseY + 17.5 * s, z + 7.0 * s)
      : new THREE.Vector3(x - 6.0 * s, baseY + 8.2 * s, z - 7.4 * s);
    bar3(g, shoulder.x, shoulder.y, shoulder.z, elbow.x, elbow.y, elbow.z, 2.1 * s, M.carve, detail ? 10 : 7);
    bar3(g, elbow.x, elbow.y, elbow.z, hand.x, hand.y, hand.z, 1.35 * s, M.carve, detail ? 9 : 6);
    ball(g, 8, M.carve, hand.x, hand.y, hand.z, 2.0 * s, 1.45 * s, 1.6 * s);
    for (let f = 0; f < 4; f++) {
      const fz = hand.z + (f - 1.5) * 0.55 * s;
      bar3(g, hand.x - 1.6 * s, hand.y + 0.3 * s, fz, hand.x - 3.0 * s, hand.y + (f - 1.5) * 0.4 * s, fz, 0.18 * s, M.carve, 4);
    }
  }
  for (let i = 0; i < 7; i++) {
    const rad = (6.0 + i * 0.32) * s;
    const ring = new THREE.TorusGeometry(rad, 0.16 * s, 4, 16);
    ring.rotateX(Math.PI / 2);
    ring.translate(x + 1.1 * s, baseY + (9.0 + i * 1.55) * s, z);
    add(g, ring, M.stoneDark, 0, 0, 0);
  }
  for (let i = 0; i < 4; i++) {
    box(g, 0.35 * s, 0.3 * s, 12.5 * s, M.stoneDark, x - 7.0 * s, baseY + (5.2 + i * 1.1) * s, z);
  }
  if (detail) flameHalo(g, x + 5.3 * s, hy + 0.4 * s, z, 8.8 * s, M.rockDark, 20);
}

export function standingFigure(g, x, z, s, baseY, halo = true) {
  box(g, 7.5 * s, 1.1 * s, 7.5 * s, M.rockDark, x, baseY + 0.55 * s, z);
  cyl(g, 2.7 * s, 3.8 * s, 16 * s, 10, M.carve, x + 0.6 * s, baseY + 9 * s, z);
  ball(g, 10, M.carve, x + 0.4 * s, baseY + 18 * s, z, 2.5 * s, 4.6 * s, 4.4 * s);
  cyl(g, 1.1 * s, 1.4 * s, 1.6 * s, 10, M.carve, x + 0.2 * s, baseY + 20.4 * s, z);
  const hy = baseY + 23.4 * s;
  ball(g, 12, M.carve, x + 0.1 * s, hy, z, 2.2 * s, 2.7 * s, 2.3 * s);
  ball(g, 10, M.carve, x - 0.1 * s, hy + 2.2 * s, z, 1.4 * s, 1.2 * s, 1.5 * s);
  for (const sz of [-1, 1]) {
    ball(g, 6, M.carve, x - 0.3 * s, hy - 0.1 * s, z + sz * 2.3 * s, 0.5 * s, 1.5 * s, 0.4 * s);
    bar3(g, x + 0.4 * s, baseY + 18 * s, z + sz * 2.6 * s, x - 1.4 * s, baseY + 9.5 * s, z + sz * 3.4 * s, 0.7 * s, M.carve, 6);
  }
  for (let i = 0; i < 4; i++) {
    const ring = new THREE.TorusGeometry((2.8 + i * 0.3) * s, 0.11 * s, 4, 12);
    ring.rotateX(Math.PI / 2);
    ring.translate(x + 0.5 * s, baseY + (5 + i * 2.2) * s, z);
    add(g, ring, M.stoneDark, 0, 0, 0);
  }
  if (halo) {
    const ring = new THREE.TorusGeometry(3.4 * s, 0.24 * s, 4, 20);
    ring.rotateY(Math.PI / 2);
    ring.translate(x + 1.4 * s, hy + 0.2 * s, z);
    add(g, ring, M.rockDark, 0, 0, 0);
  }
}

function nicheFigure(g, x, z, s, baseY) {
  box(g, 3.4 * s, 0.8 * s, 3.4 * s, M.rockDark, x, baseY + 0.4 * s, z);
  cyl(g, 1.5 * s, 2.0 * s, 6.2 * s, 8, M.carve, x + 0.7 * s, baseY + 3.8 * s, z);
  ball(g, 8, M.carve, x + 0.4 * s, baseY + 7.4 * s, z, 1.5 * s, 1.7 * s, 1.6 * s);
  ball(g, 6, M.carve, x + 0.3 * s, baseY + 8.8 * s, z, 0.85 * s, 0.7 * s, 0.9 * s);
  const ring = new THREE.TorusGeometry(2.0 * s, 0.14 * s, 4, 14);
  ring.rotateY(Math.PI / 2);
  ring.translate(x + 1.2 * s, baseY + 7.5 * s, z);
  add(g, ring, M.rockDark, 0, 0, 0);
}

function addBay(g, cfg) {
  const z = cfg.z;
  const half = cfg.half;
  const sill = cfg.sill ?? 3.0;
  const h = cfg.h;
  const depth = cfg.depth ?? 11;
  const f = frontAt(z);
  const top = topAt(z);
  const wallTop = Math.max(top, sill + h + 6);
  const spring = sill + h - half;
  for (const sz of [-1, 1]) {
    const pz = z + sz * (half + 3);
    box(g, 12, wallTop, 6.2, cfg.warm ? M.rockB : M.rockC, f + 6, wallTop / 2, pz);
    box(g, 1.5, wallTop - 4, 1.4, M.rockDark, f - 0.2, (wallTop - 4) / 2 + 2, pz - sz * 2.9);
  }
  box(g, depth + 4, sill, 2 * half + 11, M.stone, f + (depth + 4) / 2, sill / 2, z);
  box(g, 0.8, h + 2, 2 * half, M.caveBack, f + depth + 0.2, sill + h / 2, z);
  for (const sz of [-1, 1]) box(g, depth, h, 0.8, M.caveDark, f + depth / 2, sill + h / 2, z + sz * half);
  box(g, depth, 0.7, 2 * half, M.caveDark, f + depth / 2, sill + h, z);
  if (cfg.arch !== false) {
    archRing(g, f - 0.3, spring, z, half, 0.85, M.rockPale, cfg.archSeg || 14);
    for (const sz of [-1, 1]) box(g, 1.8, spring - sill, 1.2, M.rockPale, f - 0.2, (spring + sill) / 2, z + sz * half);
    box(g, 1.1, 0.5, 2 * half + 4, M.rockDark, f - 0.6, sill - 0.2, z);
  }
  const fillBase = cfg.arch === false ? sill + h - 2 : sill + h;
  if (top > fillBase) box(g, 13, top - fillBase, 2 * half + 12, cfg.warm ? M.rockB : M.rockA, f + 6.5, (top + fillBase) / 2, z);
  const n = cfg.niches || 0;
  for (let i = 0; i < n; i++) {
    const ny = sill + 2.5 + (i % 3) * 2.6;
    const nz = z - half * 0.6 + i * (half * 1.2 / Math.max(1, n - 1));
    box(g, 0.4, 1.8, 1.2, M.caveDark, f + 0.1, ny, nz);
    archRing(g, f - 0.1, ny - 0.5, nz, 0.9, 0.2, M.rockPale, 7);
    if (i % 2 === 0) nicheFigure(g, f + 2.0, nz, 0.32, sill + 0.4);
  }
  if (cfg.kind === 'buddha20') {
    seatedBuddha(g, f + 7.8, z, 1.08, sill + 0.2, true);
    standingFigure(g, f + 8.4, z - 15.5, 0.82, sill + 0.1, true);
    standingFigure(g, f + 9.0, z + 15.0, 0.78, sill + 0.1, true);
  } else if (cfg.kind === 'cave5') {
    seatedBuddha(g, f + depth - 2.4, z - 4.6, 0.45, sill + 0.3, false);
    seatedBuddha(g, f + depth - 2.4, z + 4.6, 0.45, sill + 0.3, false);
    for (let i = 0; i < 5; i++) patch(g, f + 0.6, sill + 2 + i * 2.6, z - half * 0.8 + i * 3.0, 1.6, 2.0, i % 2 ? M.pigmentRed : M.pigmentBlue);
  } else if (cfg.kind === 'cave6') {
    addPagoda(g, f + depth - 3.4, z, sill, 1.0);
    for (let i = 0; i < 6; i++) patch(g, f + depth - 0.8, sill + 2 + (i % 3) * 3.2, z - half + 1.2 + i * 2.4, 1.4, 2.2, i % 3 === 0 ? M.pigmentGreen : i % 3 === 1 ? M.pigmentRed : M.pigmentBlue);
  } else if (cfg.niche !== false) {
    nicheFigure(g, f + depth - 2.0, z, cfg.statue || 0.7, sill + 0.3);
  }
  for (let i = 0; i < 3; i++) {
    const wx = f + 0.1;
    box(g, 0.3, 4 + (i % 2) * 3, 0.5, M.rockDark, wx, sill + 7 + i * 4, z - half * 0.7 + i * half * 0.5);
  }
}

function addPagoda(g, x, z, baseY, s) {
  box(g, 6 * s, 1.2 * s, 6 * s, M.rockDark, x, baseY + 0.6 * s, z);
  for (let level = 0; level < 5; level++) {
    const y = baseY + 2.2 * s + level * 2.6 * s;
    const w = (4.8 - level * 0.45) * s;
    box(g, w, 1.5 * s, w, M.carve, x, y, z);
    const eave = new THREE.ConeGeometry(w * 0.85, 0.9 * s, 4);
    eave.rotateY(Math.PI / 4);
    eave.translate(x, y + 1.1 * s, z);
    add(g, eave, M.rockDark, 0, 0, 0);
    for (const sz of [-1, 1]) {
      box(g, 0.3 * s, 1.1 * s, 0.5 * s, M.caveDark, x - w * 0.5, y, z + sz * w * 0.5);
      box(g, w * 0.7, 0.35 * s, 0.35 * s, M.rockPale, x, y + 0.7 * s, z + sz * w * 0.55);
    }
  }
  cyl(g, 0.25 * s, 0.5 * s, 2.4 * s, 6, M.rockDark, x, baseY + 15.2 * s, z);
  ball(g, 8, M.rockPale, x, baseY + 16.8 * s, z, 0.65 * s, 0.8 * s, 0.65 * s);
}

function addCliffMass(g) {
  for (let z = -252; z <= 258; z += 18) {
    const f = frontAt(z);
    const top = topAt(z);
    box(g, 74, top + 14, 18.5, M.rockC, f + 49, (top + 14) / 2 - 4, z);
    box(g, 62, 10, 17, M.rockB, f + 42, top - 1, z);
  }
  for (let z = -248; z <= 254; z += 9) {
    const f = frontAt(z);
    const top = topAt(z);
    for (let y = 5.6; y < top - 6; y += 6.8) {
      const k = (Math.floor(y / 6.8) + Math.round(z / 9)) % 4;
      const m = k === 0 ? M.rockPale : k === 1 ? M.rockA : k === 2 ? M.rockB : M.rockC;
      box(g, 1.4 + (k % 2) * 0.5, 0.8 + (k % 3) * 0.3, 9.1, m, f - 0.35, y + Math.sin(z * 0.11) * 0.5, z);
    }
  }
  for (let i = 0; i < 34; i++) {
    const z = -238 + i * 14.6;
    const f = frontAt(z);
    const y = 17 + ((i * 13) % 44);
    box(g, 0.35, 2.4 + (i % 4) * 1.6, 0.8 + (i % 3) * 0.5, i % 3 ? M.rockDark : M.moss, f - 0.2, y, z);
  }
  for (let z = -250; z <= 256; z += 22) {
    const f = frontAt(z);
    const top = topAt(z);
    box(g, 2.2, 4.6 + (Math.round(z) % 5), 20, M.rockDark, f + 0.4, top - 1.2, z + 1);
    box(g, 10, 3.2, 8, M.rockB, f - 1.5, top + 1.4, z + 5);
  }
}

export function buildYungangRock(g) {
  addCliffMass(g);
  const bays = [
    { z: -232, half: 6, h: 10 },
    { z: -208, half: 7, h: 13, warm: true },
    { z: -182, half: 6, h: 10 },
    { z: -158, half: 8, h: 15 },
    { z: -132, half: 6, h: 11, warm: true },
    { z: -108, half: 9, h: 17 },
    { z: -82, half: 7, h: 12 },
    { z: -58, half: 5, h: 9, niche: false },
    { z: -20, half: 20, h: 47, depth: 15, kind: 'buddha20', arch: false, niche: false },
    { z: 8, half: 6, h: 11, warm: true },
    { z: 31, half: 5, h: 9 },
    { z: 43, half: 10, h: 22, depth: 12, kind: 'cave5', arch: true },
    { z: 69, half: 10, h: 22, depth: 12, kind: 'cave6', arch: true },
    { z: 95, half: 7, h: 12, warm: true },
    { z: 119, half: 8, h: 15 },
    { z: 144, half: 6, h: 10 },
    { z: 170, half: 7, h: 13, warm: true },
    { z: 195, half: 6, h: 10 },
    { z: 219, half: 7, h: 12 },
    { z: 242, half: 6, h: 9, warm: true },
  ];
  for (const b of bays) addBay(g, b);
  const f20 = frontAt(-20);
  for (let i = 0; i < 8; i++) {
    const z = -42 + i * 6.6;
    box(g, 5.5, 2.0 + (i % 3) * 1.2, 3.4, i % 2 ? M.rockA : M.rockB, f20 - 1.4, 48 + (i % 4) * 2.6, z, 0, (i % 3 - 1) * 0.12);
  }
  for (let i = 0; i < 26; i++) {
    const z = -246 + i * 19.2;
    const f = frontAt(z);
    const y = 35 + ((i * 17) % 38);
    box(g, 0.35, 1.2, 2.0, M.caveDark, f - 0.6, y, z);
    archRing(g, f - 0.7, y - 0.6, z, 1.0, 0.2, M.rockPale, 6);
  }
  const baseY = 3.0;
  for (let z = -246; z <= 250; z += 20) {
    const f = frontAt(z);
    box(g, 16, 3.0, 20, M.stone, f - 8, baseY - 1.5, z);
    box(g, 1.2, 0.4, 20, M.stoneDark, f - 16, baseY + 0.1, z);
  }
  for (const z of [-45, 18, 84, 158, 224]) {
    const f = frontAt(z);
    for (let i = 0; i < 4; i++) {
      box(g, 2.0, 0.42 * (i + 1), 12, M.stone, f - 17 - i * 2.0, 0.21 * (i + 1) - 1.2, z);
      box(g, 0.5, 0.08, 12, M.rockPale, f - 18 - i * 2.0, 0.42 * (i + 1) - 1.2, z);
    }
  }
  for (let i = 0; i < 18; i++) {
    const z = -220 + i * 25;
    const f = frontAt(z);
    const gy = Math.max(2.5, terrainHeight(f - 20, z));
    box(g, 3.2, 5.4, 1.1, M.rockDark, f - 18.5, gy + 2.7, z);
    box(g, 2.2, 1.4, 0.4, M.stoneDark, f - 19.0, gy + 4.3, z);
  }
}
