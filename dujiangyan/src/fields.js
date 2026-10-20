import * as THREE from 'three';
import { mats } from './materials.js';
import { mergedMesh } from './geometry.js';
import { terrainHeight, riverCenter, riverHalfWidth, WATER_Y } from './terrain.js';

let seed = 8123;
function rnd() {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
}

const ZONES = [
  [95, 470, 190, 190],
  [155, 760, 130, 130],
  [-170, -470, 150, 150],
  [-155, 210, 110, 120],
  [120, 900, 110, 110],
];

function fieldColor() {
  const c = new THREE.Color();
  const r = rnd();
  if (r < 0.4) c.set(0x7c9a4f);
  else if (r < 0.7) c.set(0x95a45c);
  else if (r < 0.88) c.set(0xa9a768);
  else c.set(0x668846);
  return c;
}

export function createPaddies() {
  const root = new THREE.Group();
  const bunds = [];
  const tufts = [];
  for (const [cx, cz, rx, rz] of ZONES) {
    for (let i = 0; i < 26; i++) {
      const x = cx + (rnd() - 0.5) * rx;
      const z = cz + (rnd() - 0.5) * rz;
      const c = riverCenter(z);
      const edge = Math.abs(x - c) - riverHalfWidth(z);
      if (edge < 13 || edge > 190) continue;
      const h = terrainHeight(x, z);
      if (h < 0.8) continue;
      const w = 12 + rnd() * 22;
      const d = 10 + rnd() * 24;
      const geo = new THREE.PlaneGeometry(w, d);
      geo.rotateX(-Math.PI / 2);
      geo.rotateY((rnd() - 0.5) * 0.5);
      geo.translate(x, h + 0.09, z);
      const pos = geo.attributes.position;
      const col = fieldColor();
      const arr = new Float32Array(pos.count * 3);
      for (let v = 0; v < pos.count; v++) {
        arr[v * 3] = col.r;
        arr[v * 3 + 1] = col.g;
        arr[v * 3 + 2] = col.b;
      }
      geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
      const mesh = new THREE.Mesh(geo, mats.rice);
      mesh.receiveShadow = true;
      root.add(mesh);
      const bw = 0.35;
      for (const sx of [-1, 1]) {
        const b = new THREE.BoxGeometry(w + 0.5, 0.32, bw);
        b.translate(x, h + 0.13, z + sx * d * 0.5);
        bunds.push(b);
      }
      for (const sz of [-1, 1]) {
        const b = new THREE.BoxGeometry(bw, 0.32, d + 0.5);
        b.translate(x + sz * w * 0.5, h + 0.13, z);
        bunds.push(b);
      }
      for (let t = 0; t < 5; t++) {
        const tx = x + (rnd() - 0.5) * w * 0.76;
        const tz = z + (rnd() - 0.5) * d * 0.76;
        const th = 0.55 + rnd() * 0.5;
        const g1 = new THREE.PlaneGeometry(0.3, th);
        g1.rotateY(rnd() * Math.PI);
        g1.translate(tx, h + th * 0.5 + 0.1, tz);
        tufts.push(g1);
        const g2 = new THREE.PlaneGeometry(0.3, th);
        g2.rotateY(rnd() * Math.PI + Math.PI / 2);
        g2.translate(tx, h + th * 0.5 + 0.1, tz);
        tufts.push(g2);
      }
    }
  }
  const bm = mergedMesh(bunds, mats.stone, false, true);
  const tm = mergedMesh(tufts, mats.leaf, false, true);
  if (bm) root.add(bm);
  if (tm) root.add(tm);
  return root;
}

export function createReeds() {
  const blades = [];
  const stones = [];
  for (let z = -900; z <= 900; z += 7) {
    for (const side of [-1, 1]) {
      if (rnd() > 0.35) continue;
      const w = riverHalfWidth(z);
      const x = riverCenter(z) + side * (w + 3 + rnd() * 5);
      const h = terrainHeight(x, z);
      if (h < 0.3 || h > 1.9) continue;
      const base = Math.max(WATER_Y + 0.1, h);
      const n = 3 + ((rnd() * 5) | 0);
      for (let b = 0; b < n; b++) {
        const bh = 0.8 + rnd() * 1.6;
        const g = new THREE.ConeGeometry(0.06, bh, 3);
        g.rotateZ((rnd() - 0.5) * 0.45);
        g.translate(x + (rnd() - 0.5) * 2.8, base + bh * 0.45, z + (rnd() - 0.5) * 2.8);
        blades.push(g);
      }
      if (rnd() < 0.035) {
        const s = 0.7 + rnd() * 1.8;
        const rock = new THREE.IcosahedronGeometry(s, 0);
        rock.scale(1.5, 0.65, 1.2);
        rock.translate(x + 0.4, base + s * 0.18, z - 0.3);
        stones.push(rock);
      }
    }
  }
  const root = new THREE.Group();
  const bm = mergedMesh(blades, mats.reed, false, true);
  const sm = mergedMesh(stones, mats.stone, true, true);
  if (bm) root.add(bm);
  if (sm) root.add(sm);
  return root;
}

export function createRockGarden() {
  const rocks = [];
  for (let i = 0; i < 70; i++) {
    const z = -850 + rnd() * 1700;
    const side = rnd() < 0.5 ? -1 : 1;
    const d = riverHalfWidth(z) + 6 + rnd() * 24;
    const x = riverCenter(z) + side * d;
    const base = terrainHeight(x, z);
    if (base < 0.7) continue;
    const s = 1 + rnd() * 4.5;
    const g = new THREE.IcosahedronGeometry(s, 0);
    g.scale(1.2, 0.72, 1.0);
    g.rotateY(rnd() * 6.28);
    g.translate(x, base + s * 0.22, z);
    rocks.push(g);
  }
  return mergedMesh(rocks, mats.stone, true, true);
}

export function createBuffalo() {
  const root = new THREE.Group();
  const dark = [];
  const horn = [];
  for (let i = 0; i < 11; i++) {
    const [cx, cz, rx, rz] = ZONES[i % ZONES.length];
    const x = cx + (rnd() - 0.5) * rx * 0.8;
    const z = cz + (rnd() - 0.5) * rz * 0.8;
    const c = riverCenter(z);
    if (Math.abs(x - c) < riverHalfWidth(z) + 16) continue;
    const base = terrainHeight(x, z);
    if (base < 1.2) continue;
    const rot = rnd() * Math.PI * 2;
    const s = 0.82 + rnd() * 0.3;
    const put = (arr, g, ox, oy, oz, sx = 1, sy = 1, sz = 1) => {
      g.scale(sx * s, sy * s, sz * s);
      g.rotateY(rot);
      g.translate(x + ox * s, base + oy * s, z + oz * s);
      arr.push(g);
    };
    put(dark, new THREE.SphereGeometry(1, 8, 6), 0, 1.45, 0, 2.15, 1.02, 1.1);
    put(dark, new THREE.SphereGeometry(0.62, 7, 5), 1.55, 1.72, 0, 1.0, 0.86, 1.16);
    put(dark, new THREE.BoxGeometry(0.5, 0.35, 0.72), 2.05, 1.66, 0);
    put(horn, new THREE.ConeGeometry(0.1, 0.85, 5), 1.8, 2.24, 0.38);
    put(horn, new THREE.ConeGeometry(0.1, 0.85, 5), 1.8, 2.24, -0.38);
    for (const ox of [-0.95, 0.95]) {
      for (const oz of [-0.5, 0.5]) {
        put(dark, new THREE.CylinderGeometry(0.12, 0.16, 1.35, 5), ox, 0.68, oz);
      }
    }
    put(dark, new THREE.CylinderGeometry(0.05, 0.08, 1.2, 4), -1.5, 1.3, 0);
  }
  const dm = mergedMesh(dark, mats.boat, true, true);
  const hm = mergedMesh(horn, mats.straw, true, false);
  if (dm) root.add(dm);
  if (hm) root.add(hm);
  return root;
}

export function createFieldPaths() {
  const list = [];
  const color = new THREE.Color(0x8d7f5d);
  const ribbon = (points, width) => {
    for (let i = 0; i < points.length - 1; i++) {
      const [ax, az] = points[i];
      const [bx, bz] = points[i + 1];
      const dx = bx - ax;
      const dz = bz - az;
      const len = Math.hypot(dx, dz) || 1;
      const nx = (-dz / len) * width * 0.5;
      const nz = (dx / len) * width * 0.5;
      const y = (x, z) => terrainHeight(x, z) + 0.16;
      const pos = [
        ax + nx, y(ax + nx, az + nz), az + nz,
        ax - nx, y(ax - nx, az - nz), az - nz,
        bx + nx, y(bx + nx, bz + nz), bz + nz,
        bx - nx, y(bx - nx, bz - nz), bz - nz,
      ];
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setIndex([0, 1, 2, 2, 1, 3]);
      const cols = new Float32Array(12);
      for (let v = 0; v < 4; v++) {
        cols[v * 3] = color.r;
        cols[v * 3 + 1] = color.g;
        cols[v * 3 + 2] = color.b;
      }
      g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
      list.push(g);
    }
  };
  ribbon([[150, 404], [128, 430], [112, 458], [88, 480]], 3.2);
  ribbon([[92, 532], [104, 514], [118, 496], [126, 480]], 2.6);
  ribbon([[-172, -386], [-146, -408], [-128, -434], [-118, -462]], 3.0);
  ribbon([[178, 712], [154, 732], [132, 752], [118, 772]], 2.8);
  const m = mergedMesh(list, mats.rice, false, true);
  return m || new THREE.Group();
}
