import * as THREE from 'three';
import { mats } from './materials.js';
import { addCylinder, mergedMesh } from './geometry.js';
import { LAKE_RING } from './lakeData.js';

export const WATER_Y = 0.15;
export const WORLD_W = 4200;
export const WORLD_D = 3600;
export const WORLD_CX = 620;
export const WORLD_CZ = -100;

const RING = LAKE_RING;
const RN = RING.length / 2;
const CELL = 240;
const edgeCells = new Map();
const COVE = { cx: -400, cz: -8, rx: 46, rz: 30 };
const ISLAND = { cx: -382, cz: -8, r: 22 };
const ISLETS = [
  [128, 152, 30, 2.6],
  [-205, 288, 24, 2.2],
  [420, 108, 26, 2.4],
];

function cellKey(cx, cz) {
  return cx + ',' + cz;
}

(function indexEdges() {
  for (let i = 0; i < RN; i++) {
    const j = (i + 1) % RN;
    const x1 = RING[i * 2];
    const z1 = RING[i * 2 + 1];
    const x2 = RING[j * 2];
    const z2 = RING[j * 2 + 1];
    const c0 = Math.floor(Math.min(x1, x2) / CELL) - 1;
    const c1 = Math.floor(Math.max(x1, x2) / CELL) + 1;
    const r0 = Math.floor(Math.min(z1, z2) / CELL) - 1;
    const r1 = Math.floor(Math.max(z1, z2) / CELL) + 1;
    for (let cx = c0; cx <= c1; cx++) {
      for (let cz = r0; cz <= r1; cz++) {
        const k = cellKey(cx, cz);
        let a = edgeCells.get(k);
        if (!a) {
          a = [];
          edgeCells.set(k, a);
        }
        a.push(i);
      }
    }
  }
})();

function pointInRing(x, z) {
  let inside = false;
  for (let i = 0, j = RN - 1; i < RN; j = i++) {
    const xi = RING[i * 2];
    const zi = RING[i * 2 + 1];
    const xj = RING[j * 2];
    const zj = RING[j * 2 + 1];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

function ringDistance(x, z) {
  const cx = Math.floor(x / CELL);
  const cz = Math.floor(z / CELL);
  let best = 1e9;
  for (let ox = -1; ox <= 1; ox++) {
    for (let oz = -1; oz <= 1; oz++) {
      const list = edgeCells.get(cellKey(cx + ox, cz + oz));
      if (!list) continue;
      for (let n = 0; n < list.length; n++) {
        const i = list[n];
        const j = (i + 1) % RN;
        const x1 = RING[i * 2];
        const z1 = RING[i * 2 + 1];
        const x2 = RING[j * 2];
        const z2 = RING[j * 2 + 1];
        const dx = x2 - x1;
        const dz = z2 - z1;
        const l2 = dx * dx + dz * dz;
        let t = l2 > 1e-8 ? ((x - x1) * dx + (z - z1) * dz) / l2 : 0;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const px = x1 + dx * t - x;
        const pz = z1 + dz * t - z;
        const d2 = px * px + pz * pz;
        if (d2 < best) best = d2;
      }
    }
  }
  return best > 1e8 ? 999 : Math.sqrt(best);
}

export function lakeField(x, z) {
  const sp = pointInRing(x, z) ? -ringDistance(x, z) : ringDistance(x, z);
  const dx = (x - COVE.cx) / COVE.rx;
  const dz = (z - COVE.cz) / COVE.rz;
  const sc = (Math.sqrt(dx * dx + dz * dz) - 1) * COVE.rz;
  return Math.min(sp, sc);
}

function gauss(x, z, cx, cz, sx, sz, amp) {
  const dx = (x - cx) / sx;
  const dz = (z - cz) / sz;
  return amp * Math.exp(-(dx * dx + dz * dz));
}

function smoothstep(x, a, b) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

const HILLS = [
  [980, -520, 300, 240, 72],
  [330, -760, 360, 230, 48],
  [-1180, 260, 340, 300, 76],
  [-980, -650, 380, 260, 54],
  [120, 760, 420, 240, 22],
  [-700, -820, 300, 230, 30],
  [-320, 800, 260, 200, 8],
];

const MOSHAN = [
  [720, -90, 150, 140, 80],
  [850, -30, 180, 170, 45],
  [600, -300, 140, 120, 20],
];

function landBase(x, z) {
  let h = 2.4;
  h += 1.5 * Math.sin(x * 0.0058 + 0.6) * Math.cos(z * 0.0049 - 0.4);
  h += 0.7 * Math.sin(x * 0.017 + 2.1) * Math.sin(z * 0.014 + 0.8);
  h += 0.25 * Math.sin(x * 0.052 + z * 0.037);
  for (const [cx, cz, sx, sz, amp] of HILLS) h += gauss(x, z, cx, cz, sx, sz, amp);
  for (const [cx, cz, sx, sz, amp] of MOSHAN) h += gauss(x, z, cx, cz, sx, sz, amp);
  return h;
}

export function terrainHeight(x, z) {
  const sd = lakeField(x, z);
  let h;
  if (sd < 0) {
    const d = -sd;
    h = -0.55 - 1.0 * Math.min(1, d / 10) - 9 * smoothstep(d, 10, 160) - 9 * smoothstep(d, 120, 600);
    h += 0.35 * Math.sin(x * 0.021 + z * 0.017) * smoothstep(d, 6, 60);
  } else {
    const base = landBase(x, z);
    const t = smoothstep(sd, 0, 70);
    h = 0.18 + (base - 0.18) * Math.pow(t, 0.72);
  }
  const chu = gauss(x, z, 486, -118, 50, 36, 7.5);
  if (chu > 0) h = Math.max(h, chu);
  const r = Math.hypot(x - ISLAND.cx, z - ISLAND.cz);
  if (r < ISLAND.r + 1) {
    const t = Math.max(0, Math.min(1, (ISLAND.r - r) / 14));
    const island = -0.6 + 3.3 * t * t * (3 - 2 * t);
    h = Math.max(h, island);
  }
  for (const [cx, cz, rad, amp] of ISLETS) {
    const d = Math.hypot(x - cx, z - cz);
    if (d < rad) {
      const t = Math.max(0, Math.min(1, (rad - d) / 12));
      const islet = -0.6 + (amp + 0.6) * t * t * (3 - 2 * t);
      h = Math.max(h, islet);
    }
  }
  return h;
}

export function isWater(x, z, margin = 0) {
  return terrainHeight(x, z) < WATER_Y + margin;
}

export function createTerrain() {
  const geo = new THREE.PlaneGeometry(WORLD_W, WORLD_D, 320, 280);
  geo.rotateX(-Math.PI / 2);
  geo.translate(WORLD_CX, 0, WORLD_CZ);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setY(i, terrainHeight(pos.getX(i), pos.getZ(i)));
  }
  geo.computeVertexNormals();
  const nrm = geo.attributes.normal;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  const grass = new THREE.Color(0x7b8475);
  const lush = new THREE.Color(0x747c70);
  const sand = new THREE.Color(0xd9d1bb);
  const wet = new THREE.Color(0xa8a28e);
  const rock = new THREE.Color(0x8c8f83);
  const bed = new THREE.Color(0x3f5a50);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const slope = 1 - nrm.getY(i);
    const moist = 0.5 + 0.5 * Math.sin(x * 0.009 + z * 0.007);
    c.copy(grass).lerp(lush, moist * 0.6);
    if (y < 2.3) {
      const t = smoothstep(y, 0.2, 2.3);
      c.copy(wet)
        .lerp(sand, smoothstep(y, -0.1, 0.55))
        .lerp(grass, t);
    }
    if (y < -0.3) c.copy(bed);
    c.lerp(rock, smoothstep(slope, 0.42, 0.8) * 0.55);
    c.lerp(rock, smoothstep(y, 55, 110) * 0.22);
    const v = 0.92 + 0.08 * Math.sin(x * 0.21) * Math.cos(z * 0.18);
    colors[i * 3] = c.r * v;
    colors[i * 3 + 1] = c.g * v;
    colors[i * 3 + 2] = c.b * v;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mesh = new THREE.Mesh(geo, mats.ground);
  mesh.receiveShadow = true;
  return mesh;
}

export function createWater() {
  const shape = new THREE.Shape();
  shape.moveTo(RING[0], RING[1]);
  for (let i = 1; i < RN; i++) shape.lineTo(RING[i * 2], RING[i * 2 + 1]);
  shape.closePath();
  const geo = new THREE.ShapeGeometry(shape);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getY(i);
    pos.setXYZ(i, x, 0, z);
  }
  const nrm = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) nrm[i * 3 + 1] = 1;
  geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  geo.computeBoundingSphere();
  return geo;
}

export function createCoveWater() {
  const geo = new THREE.CircleGeometry(1, 64);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) * COVE.rx;
    const z = pos.getY(i) * COVE.rz;
    pos.setXYZ(i, x + COVE.cx, 0, z + COVE.cz);
  }
  geo.rotateX(0);
  const nrm = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) nrm[i * 3 + 1] = 1;
  geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  geo.computeBoundingSphere();
  return geo;
}

export function makeMountain(x, z, r, h, mat) {
  const geo = new THREE.ConeGeometry(r, h, 9, 3);
  geo.rotateY(x * 0.013 + z * 0.02);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, h * 0.28 - 20, z);
  return mesh;
}

export function createFarMountains() {
  const mat = new THREE.MeshStandardMaterial({ color: 0x9fb0b3, roughness: 1 });
  const group = new THREE.Group();
  const list = [
    [-1500, -1000, 520, 400],
    [-1550, 350, 480, 300],
    [-900, -1450, 620, 360],
    [300, -1700, 700, 320],
    [1350, -1000, 520, 380],
    [1750, 250, 560, 330],
    [1350, 1000, 600, 280],
  ];
  for (const [x, z, r, h] of list) group.add(makeMountain(x, z, r, h, mat));
  return group;
}

export function createSkyline() {
  const list = [];
  let seed = 33;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const place = (x, z, scale) => {
    if (terrainHeight(x, z) < 1.5) return;
    const h = (34 + rnd() * 110) * scale;
    const w = (14 + rnd() * 24) * scale;
    const d = (14 + rnd() * 24) * scale;
    const base = terrainHeight(x, z);
    const g = new THREE.BoxGeometry(w, h, d);
    g.translate(x, base + h / 2 - 2, z);
    list.push(g);
    if (rnd() > 0.75) {
      const top = new THREE.BoxGeometry(w * 0.5, h * 0.16, d * 0.5);
      top.translate(x, base + h + h * 0.07, z);
      list.push(top);
    }
  };
  for (let i = 0; i < 34; i++) place(-1480 + rnd() * 1050, -960 - rnd() * 300, 0.72 + rnd() * 0.42);
  for (let i = 0; i < 16; i++) place(-1460 - rnd() * 30, -500 + rnd() * 700, 0.6 + rnd() * 0.5);
  for (let i = 0; i < 24; i++) place(-520 + rnd() * 1320, -1290 - rnd() * 190, 0.42 + rnd() * 0.34);
  const city = mergedMesh(list, mats.city, false, false);
  const group = new THREE.Group();
  if (city) group.add(city);
  const spire = [];
  addCylinder(spire, 2.0, 3.0, 170, 8, -1310, terrainHeight(-1310, -1180) + 85, -1180);
  const sm = mergedMesh(spire, mats.city, false, false);
  if (sm) group.add(sm);
  return group;
}

function hash2(x, z) {
  const v = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return v - Math.floor(v);
}

export function createShoreReeds() {
  const blades = [];
  const rocks = [];
  for (let i = 0; i < RN; i++) {
    const j = (i + 1) % RN;
    const x1 = RING[i * 2];
    const z1 = RING[i * 2 + 1];
    const x2 = RING[j * 2];
    const z2 = RING[j * 2 + 1];
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    if (len < 0.01) continue;
    const steps = Math.max(1, Math.round(len / 9));
    const nx = -dz / len;
    const nz = dx / len;
    for (let s = 0; s < steps; s++) {
      const t = (s + 0.5) / steps;
      const px = x1 + dx * t;
      const pz = z1 + dz * t;
      const r = hash2(px, pz);
      if (r > 0.55) continue;
      let ox = nx * (2 + r * 5);
      let oz = nz * (2 + r * 5);
      if (lakeField(px + ox, pz + oz) < 0) {
        ox = -ox;
        oz = -oz;
      }
      const cx = px + ox + (hash2(px + 3, pz) - 0.5) * 4;
      const cz = pz + oz + (hash2(px, pz + 5) - 0.5) * 4;
      const base = terrainHeight(cx, cz);
      if (base < 0.16 || base > 1.25) continue;
      if (lakeField(cx, cz) < 0) continue;
      const n = 4 + ((r * 31) | 0) % 5;
      for (let b = 0; b < n; b++) {
        const a = hash2(cx + b, cz) * 6.28;
        const rad = hash2(cx, cz + b) * 1.4;
        const bh = 1.0 + hash2(cx + b * 2, cz) * 1.5;
        const g = new THREE.ConeGeometry(0.05, bh, 3);
        g.rotateZ((hash2(cx, cz + b * 3) - 0.5) * 0.35);
        g.translate(cx + Math.cos(a) * rad, base + bh * 0.5, cz + Math.sin(a) * rad);
        blades.push(g);
      }
      if (r < 0.012) {
        const rs = 0.7 + r * 24;
        const rock = new THREE.IcosahedronGeometry(rs, 0);
        rock.scale(1.4, 0.7, 1.1);
        rock.translate(cx + 0.6, base + rs * 0.2, cz - 0.5);
        rocks.push(rock);
      }
    }
  }
  const group = new THREE.Group();
  const reeds = mergedMesh(blades, mats.reed, false, true);
  if (reeds) group.add(reeds);
  const stones = mergedMesh(rocks, mats.rock, true, true);
  if (stones) group.add(stones);
  return group;
}

export function createIslandRocks(spots) {
  const list = [];
  for (const [cx, cz, count, spread, size] of spots) {
    for (let i = 0; i < count; i++) {
      const a = hash2(cx + i, cz) * 6.28;
      const rad = spread * (0.55 + hash2(cx, cz + i) * 0.6);
      const s = size * (0.6 + hash2(cx + i * 3, cz) * 0.9);
      const x = cx + Math.cos(a) * rad;
      const z = cz + Math.sin(a) * rad;
      const g = new THREE.IcosahedronGeometry(s, 0);
      g.scale(1.5, 0.8, 1.2);
      g.rotateY(a);
      g.translate(x, Math.max(0.2, terrainHeight(x, z)) + s * 0.3, z);
      list.push(g);
    }
  }
  return mergedMesh(list, mats.rock, true, true);
}
