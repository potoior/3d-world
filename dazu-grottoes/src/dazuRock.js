import * as THREE from 'three';
import { M, UP, add, box, cyl, ball, bar3, archRing, patch, frontAt, topAt, ringY } from './dazuCommon.js';
import { terrainHeight } from './terrain.js';
import { makePlaqueTexture } from './textures.js';

function faceDetail(g, x, y, z, s, skin = M.carve) {
  for (const sz of [-1, 1]) {
    ball(g, 6, M.rockDark, x - 3.3 * s, y + 0.65 * s, z + sz * 1.35 * s, 0.62 * s, 0.18 * s, 0.32 * s);
    ball(g, 5, M.rockDark, x - 4.0 * s, y + 1.35 * s, z + sz * 1.55 * s, 0.4 * s, 0.11 * s, 0.7 * s);
  }
  bar3(g, x - 3.75 * s, y + 0.95 * s, z, x - 4.5 * s, y + 0.05 * s, z, 0.28 * s, skin, 5);
  ball(g, 6, M.rockDark, x - 4.2 * s, y + 0.45 * s, z + 0.95 * s, 0.32 * s, 0.12 * s, 0.16 * s);
  ball(g, 6, M.rockDark, x - 4.2 * s, y + 0.45 * s, z - 0.95 * s, 0.32 * s, 0.12 * s, 0.16 * s);
  box(g, 0.1 * s, 0.26 * s, 1.4 * s, M.rockDark, x - 4.12 * s, y - 1.15 * s, z);
  ball(g, 6, M.gold, x - 4.05 * s, y + 2.3 * s, z, 0.26 * s, 0.26 * s, 0.26 * s);
}

function flameHalo(g, x, y, z, radius, m, count = 20) {
  ringY(g, x, y, z, radius, 0.42, m, 28);
  ringY(g, x + 0.15, y, z, radius * 0.78, 0.2, m, 22);
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const dy = Math.sin(a);
    const dz = Math.cos(a);
    const geo = new THREE.ConeGeometry(0.55, 2.4 + (i % 3) * 0.55, 4);
    const o = new THREE.Mesh(geo, m);
    o.position.set(x + 0.2, y + dy * (radius + 0.95), z + dz * (radius + 0.95));
    o.quaternion.setFromUnitVectors(UP, new THREE.Vector3(0, dy, dz));
    o.castShadow = true;
    g.add(o);
  }
}

function lotus(g, x, y, z, r, s) {
  cyl(g, r * 0.72, r * 0.9, 1.2 * s, 12, M.stoneDark, x, y, z);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const petal = new THREE.SphereGeometry(1, 7, 4);
    petal.scale(2.1 * s, 0.55 * s, 0.8 * s);
    const o = new THREE.Mesh(petal, i % 2 ? M.carveWarm : M.carve);
    o.position.set(x - 0.3 * s, y + 0.55 * s + Math.sin(a * 2) * 0.25 * s, z + Math.cos(a) * r * 0.9);
    o.rotation.x = -a;
    o.castShadow = true;
    g.add(o);
  }
}

export function seatedBuddha(g, x, z, s, baseY, detail = true) {
  const seg = detail ? 15 : 10;
  const headSeg = detail ? 17 : 12;
  box(g, 21 * s, 2.2 * s, 23 * s, M.rockDark, x + 1.4 * s, baseY + 1.1 * s, z);
  box(g, 17 * s, 3.0 * s, 18 * s, M.stoneDark, x + 1.5 * s, baseY + 3.6 * s, z);
  ball(g, 14, M.carve, x + 0.5 * s, baseY + 6.8 * s, z, 9.0 * s, 2.4 * s, 9.6 * s);
  ball(g, seg, M.carve, x + 1.1 * s, baseY + 14.8 * s, z, 5.9 * s, 8.2 * s, 7.0 * s);
  ball(g, seg, M.carve, x + 0.7 * s, baseY + 19.4 * s, z, 8.0 * s, 2.2 * s, 7.9 * s);
  cyl(g, 1.8 * s, 2.3 * s, 2.8 * s, headSeg, M.carve, x - 0.1 * s, baseY + 21.8 * s, z);
  const hy = baseY + 26.1 * s;
  ball(g, headSeg, M.carve, x - 0.3 * s, hy, z, 4.1 * s, 4.5 * s, 3.8 * s);
  ball(g, headSeg, M.carve, x - 0.45 * s, hy + 3.7 * s, z, 2.4 * s, 2.0 * s, 2.4 * s);
  for (const sz of [-1, 1]) ball(g, 8, M.carve, x - 0.9 * s, hy - 0.2 * s, z + sz * 3.9 * s, 0.95 * s, 2.5 * s, 0.75 * s);
  faceDetail(g, x - 0.3 * s, hy, z, s);
  ball(g, 8, M.carve, x - 4.4 * s, hy - 0.4 * s, z, 1.0 * s, 1.7 * s, 0.72 * s);
  const hairGeo = new THREE.SphereGeometry(0.64 * s, detail ? 6 : 5, detail ? 4 : 3);
  for (let row = 0; row < (detail ? 6 : 3); row++) {
    const phi = 0.16 + row * 0.2;
    const n = 9 + row * 2;
    for (let i = 0; i < n; i++) {
      const lon = (i / n) * Math.PI * 2;
      const px = x - 0.3 * s + Math.cos(lon) * Math.cos(phi) * 3.7 * s;
      const py = hy + Math.sin(phi) * 4.2 * s;
      const pz = z + Math.sin(lon) * Math.cos(phi) * 3.55 * s;
      if (px < x - 3.0 * s && py < hy + 2.1 * s) continue;
      const o = new THREE.Mesh(hairGeo, M.stoneDark);
      o.position.set(px, py, pz);
      o.castShadow = true;
      g.add(o);
    }
  }
  for (const sz of [-1, 1]) {
    const shoulder = new THREE.Vector3(x + 0.4 * s, baseY + 20.2 * s, z + sz * 6.1 * s);
    const elbow = new THREE.Vector3(x - 2.8 * s, baseY + 12.6 * s, z + sz * 8.0 * s);
    const hand = sz > 0
      ? new THREE.Vector3(x - 5.8 * s, baseY + 16.4 * s, z + 6.7 * s)
      : new THREE.Vector3(x - 5.6 * s, baseY + 7.8 * s, z - 7.1 * s);
    bar3(g, shoulder.x, shoulder.y, shoulder.z, elbow.x, elbow.y, elbow.z, 1.95 * s, M.carve, detail ? 9 : 7);
    bar3(g, elbow.x, elbow.y, elbow.z, hand.x, hand.y, hand.z, 1.28 * s, M.carve, detail ? 8 : 6);
    ball(g, 8, M.carve, hand.x, hand.y, hand.z, 1.9 * s, 1.35 * s, 1.5 * s);
    for (let f = 0; f < 4; f++) {
      const fz = hand.z + (f - 1.5) * 0.52 * s;
      bar3(g, hand.x - 1.5 * s, hand.y + 0.28 * s, fz, hand.x - 2.8 * s, hand.y + (f - 1.5) * 0.36 * s, fz, 0.17 * s, M.carve, 4);
    }
  }
  for (let i = 0; i < 6; i++) {
    const ring = new THREE.TorusGeometry((5.9 + i * 0.34) * s, 0.15 * s, 4, 16);
    ring.rotateX(Math.PI / 2);
    ring.translate(x + 1.0 * s, baseY + (8.8 + i * 1.55) * s, z);
    add(g, ring, M.stoneDark, 0, 0, 0);
  }
  for (let i = 0; i < 3; i++) box(g, 0.32 * s, 0.28 * s, 11.8 * s, M.stoneDark, x - 6.6 * s, baseY + (5.0 + i * 1.15) * s, z);
  if (detail) flameHalo(g, x + 5.0 * s, hy + 0.5 * s, z, 8.4 * s, M.rockDark, 20);
}

export function standingFigure(g, x, z, s, baseY, halo = true) {
  box(g, 7.0 * s, 1.1 * s, 7.0 * s, M.rockDark, x, baseY + 0.55 * s, z);
  cyl(g, 2.6 * s, 3.6 * s, 15 * s, 10, M.carve, x + 0.6 * s, baseY + 8.6 * s, z);
  ball(g, 10, M.carve, x + 0.4 * s, baseY + 17.0 * s, z, 2.5 * s, 4.4 * s, 4.2 * s);
  cyl(g, 1.1 * s, 1.35 * s, 1.6 * s, 10, M.carve, x + 0.2 * s, baseY + 19.3 * s, z);
  const hy = baseY + 22.1 * s;
  ball(g, 12, M.carve, x + 0.1 * s, hy, z, 2.15 * s, 2.6 * s, 2.25 * s);
  ball(g, 10, M.carve, x - 0.1 * s, hy + 2.1 * s, z, 1.35 * s, 1.15 * s, 1.45 * s);
  faceDetail(g, x + 0.1 * s, hy, z, 0.47 * s);
  for (const sz of [-1, 1]) {
    ball(g, 6, M.carve, x - 0.3 * s, hy - 0.1 * s, z + sz * 2.25 * s, 0.48 * s, 1.45 * s, 0.38 * s);
    bar3(g, x + 0.4 * s, baseY + 17 * s, z + sz * 2.5 * s, x - 1.4 * s, baseY + 9.2 * s, z + sz * 3.3 * s, 0.68 * s, M.carve, 6);
    for (let k = 0; k < 3; k++) bar3(g, x + 0.5 * s, baseY + (10 + k * 2.3) * s, z + sz * 2.8 * s, x + 0.4 * s, baseY + (10 + k * 2.3) * s, z + sz * 4.0 * s, 0.2 * s, M.carveWarm, 4);
  }
  for (let i = 0; i < 4; i++) {
    const ring = new THREE.TorusGeometry((2.7 + i * 0.3) * s, 0.11 * s, 4, 12);
    ring.rotateX(Math.PI / 2);
    ring.translate(x + 0.5 * s, baseY + (4.7 + i * 2.1) * s, z);
    add(g, ring, M.stoneDark, 0, 0, 0);
  }
  if (halo) {
    ringY(g, x + 1.2 * s, hy + 0.2 * s, z, 3.3 * s, 0.24 * s, M.rockDark, 20);
    ringY(g, x + 1.25 * s, hy + 0.2 * s, z, 2.5 * s, 0.12 * s, M.gold, 16);
  }
}

function nicheFigure(g, x, z, s, baseY) {
  box(g, 3.2 * s, 0.8 * s, 3.2 * s, M.rockDark, x, baseY + 0.4 * s, z);
  cyl(g, 1.4 * s, 1.9 * s, 6.0 * s, 8, M.carve, x + 0.7 * s, baseY + 3.7 * s, z);
  ball(g, 8, M.carve, x + 0.4 * s, baseY + 7.2 * s, z, 1.45 * s, 1.65 * s, 1.55 * s);
  ball(g, 6, M.carve, x + 0.3 * s, baseY + 8.55 * s, z, 0.82 * s, 0.68 * s, 0.88 * s);
  if (s > 0.5) {
    faceDetail(g, x + 0.4 * s, baseY + 7.2 * s, z, 0.36 * s);
    ringY(g, x + 1.0 * s, baseY + 7.4 * s, z, 2.0 * s, 0.13 * s, M.rockDark, 14);
  }
}

export function thousandHand(g, x, z, s, baseY) {
  const wall = x + 0.8;
  lotus(g, wall - 2.2 * s, baseY + 0.6 * s, z, 7.0 * s, s);
  flameHalo(g, wall + 0.35, baseY + 17.5 * s, z, 12.5 * s, M.rockDark, 28);
  ringY(g, wall + 0.1, baseY + 17.5 * s, z, 10.2 * s, 0.28 * s, M.gold, 28);
  ringY(g, wall + 0.05, baseY + 17.5 * s, z, 8.1 * s, 0.16 * s, M.pigmentRed, 24);
  ball(g, 16, M.carve, x - 1.9 * s, baseY + 6.4 * s, z, 6.2 * s, 1.9 * s, 8.4 * s);
  ball(g, 16, M.carve, x - 1.2 * s, baseY + 12.6 * s, z, 4.4 * s, 6.4 * s, 5.7 * s);
  ball(g, 14, M.carve, x - 0.9 * s, baseY + 17.7 * s, z, 5.9 * s, 1.6 * s, 5.8 * s);
  cyl(g, 1.5 * s, 1.9 * s, 2.2 * s, 12, M.carve, x - 1.5 * s, baseY + 20.3 * s, z);
  const hy = baseY + 23.6 * s;
  ball(g, 16, M.carve, x - 1.7 * s, hy, z, 3.1 * s, 3.5 * s, 3.0 * s);
  ball(g, 14, M.carve, x - 1.8 * s, hy + 3.0 * s, z, 1.9 * s, 1.5 * s, 1.9 * s);
  faceDetail(g, x - 1.7 * s, hy, z, 0.74 * s);
  for (const sz of [-1, 1]) ball(g, 8, M.carve, x - 2.0 * s, hy - 0.1 * s, z + sz * 3.0 * s, 0.7 * s, 1.9 * s, 0.55 * s);
  ringY(g, x - 1.8 * s, hy + 2.4 * s, z, 2.5 * s, 0.25 * s, M.gold, 18);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const px = x - 1.7 * s + Math.cos(a) * 1.9 * s;
    const pz = z + Math.sin(a) * 1.8 * s;
    ball(g, 8, M.gold, px, hy + 3.6 * s, pz, 0.72 * s, 0.88 * s, 0.72 * s);
    faceDetail(g, px, hy + 3.6 * s, pz, 0.17 * s);
  }
  for (let i = 0; i < 24; i++) {
    for (const side of [-1, 1]) {
      const t = i / 23;
      const ang = (-0.62 + t * 1.24) * Math.PI;
      const dirY = Math.sin(ang);
      const dirZ = Math.cos(ang) * side;
      const len = (7.2 + (i % 4) * 1.15) * s;
      const pivotX = x - 2.2 * s;
      const pivotY = baseY + 15.6 * s;
      const elbowX = pivotX - 1.1 * s;
      const handX = pivotX - (1.5 + (i % 3) * 0.7) * s;
      const ey = pivotY + dirY * len * 0.58;
      const ez = z + dirZ * len * 0.58;
      const hy2 = pivotY + dirY * len;
      const hz = z + dirZ * len;
      bar3(g, pivotX, pivotY, z + dirZ * 1.4 * s, elbowX, ey, ez, 0.36 * s, M.gold, 6);
      bar3(g, elbowX, ey, ez, handX, hy2, hz, 0.27 * s, M.gold, 5);
      ball(g, 7, M.gold, handX, hy2, hz, 0.92 * s, 0.72 * s, 0.62 * s);
      for (let f = 0; f < 4; f++) {
        const fo = (f - 1.5) * 0.26 * s;
        bar3(g, handX - 0.35 * s, hy2 + fo, hz, handX - 0.95 * s, hy2 + fo * 1.5, hz, 0.09 * s, M.gold, 4);
      }
    }
  }
  for (let i = 0; i < 5; i++) {
    const ring = new THREE.TorusGeometry((4.0 + i * 0.42) * s, 0.13 * s, 4, 18);
    ring.rotateX(Math.PI / 2);
    ring.translate(x - 1.2 * s, baseY + (7.6 + i * 1.55) * s, z);
    add(g, ring, M.pigmentRed, 0, 0, 0);
  }
  box(g, 0.6 * s, 5.0 * s, 2.2 * s, M.pigmentGreen, x - 3.7 * s, baseY + 12.0 * s, z - 3.3 * s);
  box(g, 0.6 * s, 5.0 * s, 2.2 * s, M.pigmentBlue, x - 3.7 * s, baseY + 12.0 * s, z + 3.3 * s);
}

export function recliningBuddha(g, x, z, s, baseY) {
  const len = 29 * s;
  box(g, 8.0 * s, 1.2 * s, len + 8 * s, M.rockDark, x + 0.4 * s, baseY + 0.6 * s, z);
  box(g, 10.0 * s, 1.4 * s, len + 10 * s, M.stoneDark, x + 0.8 * s, baseY + 1.9 * s, z);
  ball(g, 18, M.carve, x - 0.5 * s, baseY + 4.5 * s, z, 3.2 * s, 2.8 * s, len * 0.42);
  ball(g, 16, M.carve, x - 2.2 * s, baseY + 3.0 * s, z - len * 0.5, 3.6 * s, 2.2 * s, 4.4 * s);
  cyl(g, 2.2 * s, 2.7 * s, 4.0 * s, 12, M.carve, x - 2.2 * s, baseY + 5.4 * s, z - len * 0.55);
  const headZ = z - len * 0.6;
  ball(g, 18, M.carve, x - 2.3 * s, baseY + 6.2 * s, headZ, 3.4 * s, 3.7 * s, 3.2 * s);
  cyl(g, 0.9 * s, 1.1 * s, 1.4 * s, 10, M.carve, x - 2.2 * s, baseY + 9.6 * s, headZ);
  faceDetail(g, x - 2.3 * s, baseY + 6.2 * s, headZ, 0.72 * s);
  const hairGeo = new THREE.SphereGeometry(0.55 * s, 6, 4);
  for (let row = 0; row < 5; row++) {
    const phi = 0.2 + row * 0.2;
    const n = 10 + row * 2;
    for (let i = 0; i < n; i++) {
      const lon = (i / n) * Math.PI * 2;
      const o = new THREE.Mesh(hairGeo, M.stoneDark);
      o.position.set(x - 2.3 * s + Math.cos(lon) * Math.cos(phi) * 3.0 * s, baseY + 6.2 * s + Math.sin(phi) * 3.5 * s, headZ + Math.sin(lon) * Math.cos(phi) * 2.9 * s);
      o.castShadow = true;
      g.add(o);
    }
  }
  ball(g, 12, M.carve, x - 4.0 * s, baseY + 3.9 * s, z - len * 0.35, 2.5 * s, 1.5 * s, 7.5 * s);
  bar3(g, x - 4.0 * s, baseY + 4.1 * s, z - len * 0.2, x - 4.2 * s, baseY + 4.3 * s, z + len * 0.16, 0.8 * s, M.carve, 7);
  for (let i = 0; i < 8; i++) {
    const rz = z - len * 0.42 + i * len * 0.11;
    bar3(g, x - 5.4 * s, baseY + 3.1 * s, rz, x - 1.1 * s, baseY + 5.6 * s, rz, 0.28 * s, M.carveWarm, 5);
  }
  for (const sz of [-1, 1]) {
    ball(g, 8, M.carve, x - 4.2 * s, baseY + 2.0 * s, z + len * 0.5 + sz * 2.0 * s, 1.2 * s, 1.0 * s, 2.2 * s);
    for (let f = 0; f < 4; f++) bar3(g, x - 4.4 * s, baseY + 1.9 * s, z + len * 0.56 + sz * 0.35 * s + f * 0.7 * s, x - 6.0 * s, baseY + 1.6 * s, z + len * 0.6 + sz * 0.3 * s + f * 0.7 * s, 0.2 * s, M.carve, 4);
  }
  flameHalo(g, x + 3.8 * s, baseY + 10.3 * s, headZ, 8.5 * s, M.rockDark, 22);
  for (let i = 0; i < 5; i++) patch(g, x - 3.4 * s, baseY + 5.4 * s, z + len * (i - 2) * 0.13, 1.8 * s, 1.2 * s, i % 2 ? M.pigmentRed : M.pigmentGreen);
}

export function wheelOfLife(g, x, z, s, baseY) {
  const cy = baseY + 10.5 * s;
  const cx = x + 0.2;
  ringY(g, cx, cy, z, 8.6 * s, 0.62 * s, M.rockDark, 32);
  ringY(g, cx - 0.1, cy, z, 7.5 * s, 0.32 * s, M.carve, 28);
  ringY(g, cx - 0.15, cy, z, 2.1 * s, 0.28 * s, M.gold, 18);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
    const ey = cy + Math.sin(a) * 7.4 * s;
    const ez = z + Math.cos(a) * 7.4 * s;
    bar3(g, cx - 0.15, cy, z, cx - 0.15, ey, ez, 0.2 * s, M.rockDark, 5);
    const ry = cy + Math.sin(a) * 5.8 * s;
    const rz = z + Math.cos(a) * 5.8 * s;
    const mat = [M.pigmentRed, M.pigmentGreen, M.pigmentBlue][i % 3];
    ball(g, 7, M.carve, cx - 0.55, ry + 1.1 * s, rz, 0.7 * s, 0.8 * s, 0.7 * s);
    cyl(g, 0.5 * s, 0.7 * s, 1.7 * s, 7, mat, cx - 0.5, ry - 0.35 * s, rz);
    box(g, 1.8 * s, 0.35 * s, 1.3 * s, mat, cx - 0.4, ry - 1.3 * s, rz);
  }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    box(g, 0.36 * s, 0.5 * s, 0.7 * s, i % 3 ? M.stoneDark : M.gold, cx - 0.4, cy + Math.sin(a) * 8.6 * s, z + Math.cos(a) * 8.6 * s);
  }
  ball(g, 12, M.rockDark, cx - 0.7, cy + 11.8 * s, z, 3.2 * s, 2.6 * s, 3.4 * s);
  faceDetail(g, cx - 0.7, cy + 11.8 * s, z, 0.7 * s, M.rockDark);
  for (const sz of [-1, 1]) {
    ball(g, 7, M.rockDark, cx - 0.7, cy + 13.2 * s, z + sz * 2.1 * s, 0.55 * s, 1.3 * s, 0.55 * s);
    bar3(g, cx - 0.7, cy + 10.2 * s, z + sz * 3.2 * s, cx - 0.7, cy + 8.0 * s, z + sz * 7.2 * s, 0.55 * s, M.rockDark, 6);
  }
  for (let i = 0; i < 4; i++) patch(g, cx - 0.9, cy - 5.5 * s + i * 1.5 * s, z + 4.8 * s, 1.4 * s, 1.1 * s, i % 2 ? M.pigmentRed : M.pigmentBlue);
}

export function huayanThree(g, x, z, s, baseY) {
  box(g, 8.0 * s, 2.2 * s, 22 * s, M.stoneDark, x + 1.0 * s, baseY + 1.1 * s, z);
  standingFigure(g, x - 0.4 * s, z - 6.3 * s, s * 0.78, baseY + 2.1 * s, true);
  standingFigure(g, x - 1.1 * s, z, s * 1.0, baseY + 2.1 * s, true);
  standingFigure(g, x - 0.4 * s, z + 6.3 * s, s * 0.78, baseY + 2.1 * s, true);
  for (let i = 0; i < 3; i++) patch(g, x + 2.5 * s, baseY + 2.2 * s, z - 6.3 * s + i * 6.3 * s, 1.5 * s, 1.1 * s, i === 1 ? M.pigmentRed : M.pigmentGreen);
}

export function yuanjueCave(g, x, z, s, baseY) {
  for (let i = 0; i < 3; i++) seatedBuddha(g, x + 1.6 * s, z - 5.2 * s + i * 5.2 * s, 0.46 * s, baseY + 0.4 * s, i === 1);
  for (let i = 0; i < 6; i++) {
    const sz = i < 3 ? -1 : 1;
    nicheFigure(g, x - 0.8 * s, z + sz * (7.0 + (i % 3) * 2.0) * s, 0.52 * s, baseY + 1.2 * s);
  }
  for (let i = 0; i < 3; i++) patch(g, x - 5.4 * s, baseY + 7 + i * 2.4 * s, z - 7.2 * s, 1.2 * s, 1.7 * s, i % 2 ? M.pigmentBlue : M.pigmentRed);
}

function inscription(g, text, x, y, z, w, h) {
  const material = new THREE.MeshStandardMaterial({ map: makePlaqueTexture(text), roughness: 0.8, metalness: 0.04 });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
  mesh.rotation.y = -Math.PI / 2;
  mesh.position.set(x, y, z);
  g.add(mesh);
  box(g, 0.42, h + 0.55, w + 0.55, M.gold, x + 0.25, y, z);
}

function rockStrata(g, f, z, half, sill, h) {
  for (let i = 0; i < 7; i++) {
    const y = sill + 1.6 + i * (h / 8);
    box(g, 1.1, 0.35 + (i % 3) * 0.15, half * 2 - 0.8, i % 3 ? M.rockPale : M.rockDark, f + 0.35, y, z);
  }
  for (let i = 0; i < 5; i++) box(g, 0.3, h * 0.6, 0.5, M.caveDark, f + 0.1, sill + h * 0.45, z - half * 0.8 + i * half * 0.4);
}

function addBay(g, cfg) {
  const z = cfg.z;
  const half = cfg.half;
  const sill = cfg.sill ?? 3.0;
  const h = cfg.h;
  const depth = cfg.depth ?? 11;
  const f = frontAt(z);
  const top = topAt(z);
  const wallTop = Math.max(top, sill + h + 5);
  for (const sz of [-1, 1]) {
    const pz = z + sz * (half + 3.2);
    box(g, 12, wallTop, 6.2, cfg.warm ? M.rockB : M.rockC, f + 6, wallTop / 2, pz);
    box(g, 1.4, wallTop - 4, 1.5, M.rockDark, f - 0.2, (wallTop - 4) / 2 + 2, pz - sz * 2.9);
  }
  box(g, depth + 4, sill, 2 * half + 11, M.stone, f + (depth + 4) / 2, sill / 2, z);
  box(g, 0.8, h + 2, 2 * half, M.caveBack, f + depth + 0.2, sill + h / 2, z);
  for (const sz of [-1, 1]) box(g, depth, h, 0.8, M.caveDark, f + depth / 2, sill + h / 2, z + sz * half);
  box(g, depth, 0.8, 2 * half, M.caveDark, f + depth / 2, sill + h, z);
  for (const sz of [-1, 1]) box(g, 1.0, h + 1.2, 1.4, M.rockPale, f - 0.15, sill + h / 2, z + sz * (half + 0.4));
  box(g, 1.2, 0.9, 2 * half + 2.6, M.rockPale, f - 0.25, sill + h + 0.35, z);
  if (cfg.arch !== false) {
    archRing(g, f - 0.3, sill + h - half * 0.55, z, half * 0.78, 0.8, M.rockPale, cfg.archSeg || 16);
    for (const sz of [-1, 1]) box(g, 1.8, h - half * 0.5, 1.2, M.rockPale, f - 0.2, (sill + h - half * 0.5 + sill) / 2, z + sz * half * 0.78);
  }
  const fillBase = sill + h + 0.8;
  if (top > fillBase) box(g, 13, top - fillBase, 2 * half + 12, cfg.warm ? M.rockB : M.rockA, f + 6.5, (top + fillBase) / 2, z);
  rockStrata(g, f, z, half, sill, h);
  const n = cfg.niches ?? 0;
  for (let i = 0; i < n; i++) {
    const ny = sill + 2.8 + (i % 3) * 2.8;
    const nz = z - half * 0.62 + i * (half * 1.24 / Math.max(1, n - 1));
    box(g, 0.5, 2.0, 1.4, M.caveDark, f + 0.1, ny, nz);
    archRing(g, f - 0.15, ny - 0.6, nz, 1.0, 0.22, M.rockPale, 8);
    if (i % 2 === 0) nicheFigure(g, f + 2.1, nz, 0.33, sill + 0.4);
  }
  if (cfg.kind === 'thousand') {
    thousandHand(g, f + depth - 2.0, z, 1.0, sill + 0.4);
    for (const sz of [-1, 1]) standingFigure(g, f + depth - 2.2, z + sz * 23, 0.58, sill + 0.3, true);
    inscription(g, '千手观音', f - 0.55, sill + h + 1.8, z, 6.0, 1.8);
  } else if (cfg.kind === 'nirvana') {
    recliningBuddha(g, f + depth - 4.2, z + 1.0, 0.92, sill + 0.4);
    inscription(g, '释迦涅槃', f - 0.55, sill + h + 1.9, z, 6.2, 1.8);
  } else if (cfg.kind === 'wheel') {
    wheelOfLife(g, f + depth - 2.6, z, 1.0, sill + 1.3);
    inscription(g, '六道轮回', f - 0.55, sill + h + 1.5, z, 5.4, 1.6);
  } else if (cfg.kind === 'huayan') {
    huayanThree(g, f + depth - 2.6, z, 0.82, sill + 0.5);
    inscription(g, '华严三圣', f - 0.55, sill + h + 1.5, z, 5.4, 1.6);
  } else if (cfg.kind === 'yuanjue') {
    yuanjueCave(g, f + depth - 3.0, z, 1.0, sill + 0.4);
    inscription(g, '圆觉洞', f - 0.55, sill + h + 1.4, z, 4.4, 1.4);
  } else if (cfg.niche !== false) {
    const st = cfg.statue || 0.62;
    seatedBuddha(g, f + depth - 2.3, z, st, sill + 0.35, st > 0.62);
  }
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
  for (let i = 0; i < 40; i++) {
    const z = -240 + i * 12.2;
    const f = frontAt(z);
    const y = 16 + ((i * 13) % 44);
    box(g, 0.35, 2.4 + (i % 4) * 1.6, 0.8 + (i % 3) * 0.5, i % 3 ? M.rockDark : M.moss, f - 0.2, y, z);
  }
  for (let z = -250; z <= 256; z += 22) {
    const f = frontAt(z);
    const top = topAt(z);
    box(g, 2.2, 4.6 + (Math.abs(Math.round(z)) % 5), 20, M.rockDark, f + 0.4, top - 1.2, z + 1);
    box(g, 10, 3.2, 8, M.rockB, f - 1.5, top + 1.4, z + 5);
  }
  const f0 = frontAt(0);
  box(g, 12, 4.4, 66, M.rockC, f0 + 7, 53.5, 0);
  box(g, 17, 3.0, 72, M.rockB, f0 + 10, 57.0, 0);
  for (let i = 0; i < 8; i++) box(g, 4.5, 2.2 + (i % 3), 3.4, i % 2 ? M.rockA : M.rockB, f0 - 1.10, 49 + (i % 4) * 2.6, -34 + i * 9.4, 0, (i % 3 - 1) * 0.1);
  for (let i = 0; i < 30; i++) {
    const z = -246 + i * 16.6;
    const f = frontAt(z);
    const y = 34 + ((i * 17) % 38);
    box(g, 0.35, 1.2, 2.0, M.caveDark, f - 0.6, y, z);
    archRing(g, f - 0.7, y - 0.6, z, 1.0, 0.2, M.rockPale, 6);
  }
  for (let z = -246; z <= 250; z += 20) {
    const f = frontAt(z);
    box(g, 16, 3.0, 20, M.stone, f - 8, 1.5, z);
    box(g, 1.2, 0.4, 20, M.stoneDark, f - 16, 3.1, z);
  }
  for (const z of [-112, -36, 30, 88, 142, 200]) {
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

export function buildDazuRock(g) {
  addCliffMass(g);
  const bays = [
    { z: -228, half: 7, h: 11, niches: 3 },
    { z: -205, half: 8, h: 13, warm: true, niches: 4 },
    { z: -182, half: 7, h: 11, niches: 3 },
    { z: -160, half: 13, h: 16, depth: 16, kind: 'yuanjue', arch: false, niche: false },
    { z: -125, half: 9, h: 14, niches: 5 },
    { z: -70, half: 31, h: 21, depth: 17, kind: 'nirvana', arch: false, niche: false },
    { z: -35, half: 6, h: 10, niches: 3 },
    { z: 0, half: 31, h: 41, depth: 13, kind: 'thousand', arch: false, niche: false },
    { z: 34, half: 4, h: 9, niches: 2 },
    { z: 55, half: 18, h: 25, depth: 9, kind: 'wheel', arch: true, niche: false },
    { z: 80, half: 7, h: 11, niches: 3 },
    { z: 110, half: 17, h: 27, depth: 9, kind: 'huayan', arch: true, niche: false },
    { z: 140, half: 8, h: 12, niches: 4 },
    { z: 165, half: 12, h: 16, niches: 5 },
    { z: 195, half: 7, h: 10, warm: true, niches: 3 },
    { z: 222, half: 8, h: 12, niches: 4 },
    { z: 244, half: 6, h: 9, niches: 2 },
  ];
  for (const b of bays) addBay(g, b);
  inscription(g, '北山造像', frontAt(-205) - 0.55, 18.2, -205, 5.2, 1.6);
  inscription(g, '宝顶山', frontAt(-125) - 0.55, 18.4, -125, 4.2, 1.4);
}

