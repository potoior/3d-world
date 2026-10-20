import * as THREE from 'three';
import { mats } from './materials.js';
import { mergedMesh } from './geometry.js';
import { terrainHeight, riverCenter, riverHalfWidth, WATER_Y } from './terrain.js';

let seed = 20261019;

function rnd() {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
}

export function makePeakGeometry(x, z, r, h, base, tone, seg = 9, rings = 7) {
  const lean = (rnd() - 0.5) * r * 0.7;
  const leanZ = (rnd() - 0.5) * r * 0.5;
  const positions = [];
  const colors = [];
  const indices = [];
  const cLow = new THREE.Color(tone).lerp(new THREE.Color(0xc09170), 0.34);
  const cMid = new THREE.Color(tone).lerp(new THREE.Color(0x7c4835), 0.32);
  const cTop = new THREE.Color(0x64784c);
  const tmp = new THREE.Color();
  for (let k = 0; k <= rings; k++) {
    const t = k / rings;
    const y = base + h * t * t * (3 - 2 * t) * 0.72 + h * t * 0.28;
    const profile = 1 - 0.62 * Math.pow(t, 1.85) + 0.05 * Math.sin(t * Math.PI * 8.0);
    for (let j = 0; j < seg; j++) {
      const a = (j / seg) * Math.PI * 2;
      const groove = 0.9 + 0.1 * Math.sin(a * 5 + tone * 0.01) + 0.05 * Math.sin(a * 11 + k) + 0.028 * Math.sin(a * 17 + 0.4);
      const rr = r * profile * groove * (0.9 + rnd() * 0.2) * (1 + 0.028 * Math.sin(t * Math.PI * 7));
      const px = x + Math.cos(a) * rr + lean * t * t;
      const pz = z + Math.sin(a) * rr + leanZ * t * t;
      const py = y + (rnd() - 0.5) * h * 0.018;
      positions.push(px, py, pz);
      const green = t > 0.45 ? (t - 0.45) / 0.55 : 0;
      tmp.copy(cLow).lerp(cMid, Math.min(1, green * 1.6)).lerp(cTop, green * 0.5);
      const stripe = 1 + 0.085 * Math.sin(a * 19 + 0.7) + 0.05 * Math.sin(a * 8 - k * 0.65);
      const band = 0.88 + 0.12 * Math.sin(t * 30 + a * 0.55) + 0.035 * Math.sin(t * 77);
      const shade = (0.93 + 0.07 * Math.sin(a * 3 + k * 1.7)) * stripe * band;
      colors.push(tmp.r * shade, tmp.g * shade, tmp.b * shade);
    }
  }
  for (let k = 0; k < rings; k++) {
    for (let j = 0; j < seg; j++) {
      const j2 = (j + 1) % seg;
      const a = k * seg + j;
      const b = k * seg + j2;
      const c = (k + 1) * seg + j;
      const d = (k + 1) * seg + j2;
      indices.push(a, c, b, b, c, d);
    }
  }
  const topY = base + h;
  positions.push(x + lean, topY, z + leanZ);
  colors.push(cTop.r, cTop.g, cTop.b);
  const top = positions.length / 3 - 1;
  for (let j = 0; j < seg; j++) {
    const j2 = (j + 1) % seg;
    indices.push(rings * seg + j, top, rings * seg + j2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

export function makeDanxiaGeometry(x, z, r, h, base, tone, seg = 14, rings = 10) {
  const lean = (rnd() - 0.5) * r * 0.32;
  const leanZ = (rnd() - 0.5) * r * 0.22;
  const positions = [];
  const colors = [];
  const indices = [];
  const cLow = new THREE.Color(tone).lerp(new THREE.Color(0xc29474), 0.28);
  const cMid = new THREE.Color(tone).lerp(new THREE.Color(0x7a4434), 0.26);
  const cTop = new THREE.Color(0x687b4c);
  const tmp = new THREE.Color();
  for (let k = 0; k <= rings; k++) {
    const t = k / rings;
    const y = base + h * t;
    const ledge = 0.055 * Math.sin(t * Math.PI * 15.0) + 0.03 * Math.sin(t * Math.PI * 31.0);
    const profile = 1 - 0.3 * Math.pow(t, 2.25) + ledge;
    for (let j = 0; j < seg; j++) {
      const a = (j / seg) * Math.PI * 2;
      const groove = 0.94 + 0.06 * Math.sin(a * 5 + tone * 0.01) + 0.035 * Math.sin(a * 11 + k);
      const rr = r * profile * groove * (0.96 + rnd() * 0.08);
      const px = x + Math.cos(a) * rr + lean * t;
      const pz = z + Math.sin(a) * rr + leanZ * t;
      const py = y + (rnd() - 0.5) * h * 0.008;
      positions.push(px, py, pz);
      const green = t > 0.72 ? (t - 0.72) / 0.28 : 0;
      tmp.copy(cLow).lerp(cMid, 0.3 + 0.35 * Math.sin(t * 17.0) * 0.5).lerp(cTop, green * 0.72);
      const stripe = 0.9 + 0.1 * Math.sin(t * 46 + a * 0.25) + 0.05 * Math.sin(a * 13 + k);
      const shade = stripe * (0.93 + 0.07 * Math.sin(a * 3 + k * 1.7));
      colors.push(tmp.r * shade, tmp.g * shade, tmp.b * shade);
    }
  }
  for (let k = 0; k < rings; k++) {
    for (let j = 0; j < seg; j++) {
      const j2 = (j + 1) % seg;
      const a = k * seg + j;
      const b = k * seg + j2;
      const c = (k + 1) * seg + j;
      const d = (k + 1) * seg + j2;
      indices.push(a, c, b, b, c, d);
    }
  }
  const topY = base + h;
  positions.push(x + lean, topY, z + leanZ);
  colors.push(cTop.r, cTop.g, cTop.b);
  const top = positions.length / 3 - 1;
  for (let j = 0; j < seg; j++) {
    const j2 = (j + 1) % seg;
    indices.push(rings * seg + j, top, rings * seg + j2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

export const peakDefs = [];

const RESERVED = [
  [55, 250, 110],
  [-130, -105, 105],
  [105, 470, 150],
  [205, 770, 80],
  [-170, -480, 85],
];

function blocked(x, z, r) {
  for (const [cx, cz, rad] of RESERVED) {
    if (Math.hypot(x - cx, z - cz) < rad + r * 0.55) return true;
  }
  return false;
}

export function createPeaks() {
  const root = new THREE.Group();
  const defs = [];
  peakDefs.length = 0;
  const tones = [0xa06449, 0xa96d50, 0x95593f, 0xb07658, 0x8e4f3a];
  const add = (x, z, r, h, tone) => {
    const base = Math.max(0.4, terrainHeight(x, z)) - 2;
    const geo = makePeakGeometry(x, z, r, h, base, tone);
    const mesh = new THREE.Mesh(geo, mats.karst);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
    defs.push({ x, z, r, h, base, tone });
  };
  for (let z = -1040; z <= 1040; z += 23) {
    for (const side of [-1, 1]) {
      if (rnd() < 0.19) continue;
      const d = riverHalfWidth(z) + 62 + Math.pow(rnd(), 1.35) * 440;
      const x = riverCenter(z) + side * d;
      const h = 62 + Math.pow(rnd(), 1.2) * 220;
      const r = 15 + rnd() * 40;
      if (blocked(x, z, r)) continue;
      if (terrainHeight(x, z) < 0.6) continue;
      const tone = tones[(z + 10000) % tones.length | 0];
      const n = rnd() < 0.38 ? 2 : 1;
      add(x, z, r, h, tone);
      for (let s = 1; s < n; s++) {
        const a = rnd() * Math.PI * 2;
        add(x + Math.cos(a) * r * 1.15, z + Math.sin(a) * r * 1.15, r * 0.55, h * (0.45 + rnd() * 0.35), tone);
      }
    }
  }
  for (let i = 0; i < 70; i++) {
    const a = (i / 70) * Math.PI * 2;
    const rad = 900 + rnd() * 320;
    const x = Math.cos(a) * rad;
    const z = Math.sin(a) * rad;
    add(x, z, 28 + rnd() * 65, 100 + rnd() * 190, tones[i % tones.length]);
  }
  addPeakDetails(root, defs);
  peakDefs.push(...defs);
  return root;
}

function addPeakDetails(root, defs) {
  const ledges = [];
  const caves = [];
  const plants = [];
  for (const d of defs) {
    if (Math.abs(d.x - riverCenter(d.z)) > 330) continue;
    if (d.r < 15 || d.h < 58) continue;
    const count = d.r > 32 ? 2 : 1;
    for (let i = 0; i < count; i++) {
      const t = 0.24 + rnd() * 0.36;
      const a0 = rnd() * Math.PI * 2;
      const arc = 0.7 + rnd() * 1.2;
      const rr = d.r * (1 - 0.6 * Math.pow(t, 1.2)) * (0.96 + rnd() * 0.12);
      const y = d.base + d.h * (t * t * (3 - 2 * t) * 0.72 + t * 0.28);
      const l = new THREE.CylinderGeometry(rr * 0.94, rr * 1.1, 0.55 + d.h * 0.003, 7, 1, true, a0, arc);
      l.translate(d.x, y, d.z);
      ledges.push(l);
    }
    if (rnd() < 0.72) {
      const ca = rnd() * Math.PI * 2;
      const cy = d.base + d.h * (0.12 + rnd() * 0.14);
      const cr = d.r * (1 - 0.6 * Math.pow(0.16, 1.2));
      const cave = new THREE.SphereGeometry(d.r * (0.2 + rnd() * 0.16), 6, 4);
      cave.scale(1.5, 0.9, 0.7);
      cave.translate(d.x + Math.cos(ca) * cr * 0.86, cy, d.z + Math.sin(ca) * cr * 0.86);
      caves.push(cave);
    }
    const vines = 1 + ((rnd() * 2) | 0);
    for (let v = 0; v < vines; v++) {
      const a = rnd() * Math.PI * 2;
      const t = 0.3 + rnd() * 0.32;
      const rr = d.r * (1 - 0.6 * Math.pow(t, 1.2)) * 1.01;
      const len = 3 + rnd() * 6;
      const y = d.base + d.h * (t * t * (3 - 2 * t) * 0.72 + t * 0.28) - len * 0.4;
      const pl = new THREE.PlaneGeometry(0.28 + rnd() * 0.5, len);
      pl.rotateY(Math.PI / 2 - a);
      pl.translate(d.x + Math.cos(a) * rr, y, d.z + Math.sin(a) * rr);
      plants.push(pl);
    }
    const fernCount = 3 + ((rnd() * 4) | 0);
    const a0 = rnd() * Math.PI * 2;
    for (let f = 0; f < fernCount; f++) {
      const a = a0 + (f / fernCount) * Math.PI * 1.6;
      const rr = d.r * (0.92 + rnd() * 0.1);
      const s = 0.8 + rnd() * 1.4;
      const pl = new THREE.PlaneGeometry(1.5 * s, 1.1 * s);
      pl.rotateY(Math.PI / 2 - a + (rnd() - 0.5) * 0.6);
      pl.rotateX(0.55 + rnd() * 0.35);
      pl.translate(d.x + Math.cos(a) * rr, d.base + 0.35 + rnd() * 0.5, d.z + Math.sin(a) * rr);
      plants.push(pl);
    }
  }
  const lm = mergedMesh(ledges, mats.stone, true, true);
  const cm = mergedMesh(caves, mats.boat, true, false);
  const pm = mergedMesh(plants, mats.leaf, false, true);
  if (lm) root.add(lm);
  if (cm) root.add(cm);
  if (pm) root.add(pm);
}

function bambooClump(x, z) {
  const g = new THREE.Group();
  const base = terrainHeight(x, z);
  const poles = [];
  const leaves = [];
  const count = 8 + ((rnd() * 7) | 0);
  for (let i = 0; i < count; i++) {
    const a = rnd() * Math.PI * 2;
    const rad = rnd() * 2.8;
    const h = 5 + rnd() * 7;
    const geo = new THREE.CylinderGeometry(0.045, 0.075, h, 4, 3);
    geo.rotateZ((rnd() - 0.5) * 0.12);
    geo.rotateX((rnd() - 0.5) * 0.12);
    geo.translate(x + Math.cos(a) * rad, base + h / 2, z + Math.sin(a) * rad);
    poles.push(geo);
    for (let l = 0; l < 4; l++) {
      const lf = new THREE.PlaneGeometry(0.5, 1.15);
      lf.rotateY(rnd() * Math.PI);
      lf.rotateX(0.45 + rnd() * 0.5);
      lf.translate(x + Math.cos(a) * rad + (rnd() - 0.5) * 1.7, base + h - 0.3 - rnd() * 1.7, z + Math.sin(a) * rad + (rnd() - 0.5) * 1.7);
      leaves.push(lf);
    }
  }
  const pm = mergedMesh(poles, mats.bamboo, true, true);
  const lm = mergedMesh(leaves, mats.leaf, true, true);
  if (pm) g.add(pm);
  if (lm) g.add(lm);
  return g;
}

export function createBamboo() {
  const root = new THREE.Group();
  for (let z = -900; z <= 920; z += 31) {
    for (const side of [-1, 1]) {
      if (rnd() < 0.32) continue;
      const d = riverHalfWidth(z) + 9 + rnd() * 48;
      const x = riverCenter(z) + side * d;
      if (terrainHeight(x, z) < 1.1) continue;
      if (blocked(x, z, 10)) continue;
      root.add(bambooClump(x + (rnd() - 0.5) * 10, z + (rnd() - 0.5) * 13));
    }
  }
  return root;
}

export function createTrees() {
  const root = new THREE.Group();
  const trunks = [];
  const crowns = [];
  for (let z = -880; z <= 900; z += 27) {
    for (const side of [-1, 1]) {
      if (rnd() < 0.55) continue;
      const d = riverHalfWidth(z) + 12 + rnd() * 120;
      const x = riverCenter(z) + side * d;
      const base = terrainHeight(x, z);
      if (base < 1 || blocked(x, z, 6)) continue;
      const h = 5 + rnd() * 7;
      const tr = new THREE.CylinderGeometry(0.18, 0.34, h * 0.55, 5);
      tr.translate(x, base + h * 0.27, z);
      trunks.push(tr);
      const nm = rnd() < 0.25 ? 1 : 3;
      for (let b = 0; b < nm; b++) {
        const rr = 1.8 + rnd() * 2.2;
        const cr = new THREE.IcosahedronGeometry(rr, 0);
        cr.scale(1.1, 0.78, 1.1);
        cr.translate(x + (rnd() - 0.5) * 2.4, base + h * 0.52 + b * 1.4, z + (rnd() - 0.5) * 2.4);
        crowns.push(cr);
      }
    }
  }
  const tm = mergedMesh(trunks, mats.trunk, true, true);
  const cm = mergedMesh(crowns, mats.broad, true, true);
  if (tm) root.add(tm);
  if (cm) root.add(cm);
  return root;
}

export function createPines() {
  const root = new THREE.Group();
  const trunks = [];
  const crowns = [];
  for (let i = 0; i < 120; i++) {
    const z = -950 + rnd() * 1900;
    const side = rnd() < 0.5 ? -1 : 1;
    const d = riverHalfWidth(z) + 90 + rnd() * 420;
    const x = riverCenter(z) + side * d;
    const base = terrainHeight(x, z);
    if (base < 2 || blocked(x, z, 4)) continue;
    const h = 6 + rnd() * 8;
    const tr = new THREE.CylinderGeometry(0.14, 0.26, h * 0.4, 4);
    tr.translate(x, base + h * 0.2, z);
    trunks.push(tr);
    for (let k = 0; k < 3; k++) {
      const c = new THREE.ConeGeometry(2.1 - k * 0.45, h * 0.38, 6);
      c.translate(x, base + h * (0.35 + k * 0.2), z);
      crowns.push(c);
    }
  }
  const tm = mergedMesh(trunks, mats.trunk, true, true);
  const cm = mergedMesh(crowns, mats.pine, true, true);
  if (tm) root.add(tm);
  if (cm) root.add(cm);
  return root;
}
