import * as THREE from 'three';
import { mats, makePlaqueMaterial } from './materials.js';
import { heightAt, trailSamples, platforms, smoothstep } from './terrain.js';
import { mergeGeometryList } from './geometry.js';

function frameAt(index) {
  const n = trailSamples.length;
  const s = trailSamples[Math.max(0, Math.min(n - 1, index))];
  const a = trailSamples[Math.max(0, index - 1)];
  const b = trailSamples[Math.min(n - 1, index + 1)];
  let tx = b.x - a.x;
  let tz = b.z - a.z;
  const len = Math.hypot(tx, tz) || 1;
  tx /= len;
  tz /= len;
  return { s, tx, tz, nx: -tz, nz: tx, yaw: Math.atan2(tx, tz) };
}

function localBox(list, w, h, d, lx, ly, lz, ox, oy, oz, yaw = 0, rx = 0, rz = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (rx) g.rotateX(rx);
  if (rz) g.rotateZ(rz);
  g.translate(lx, ly, lz);
  if (yaw) g.rotateY(yaw);
  g.translate(ox, oy, oz);
  list.push(g);
}

function localCyl(list, rt, rb, h, seg, lx, ly, lz, ox, oy, oz, yaw = 0, rx = 0, rz = 0) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg, 1, false);
  if (rx) g.rotateX(rx);
  if (rz) g.rotateZ(rz);
  g.translate(lx, ly, lz);
  if (yaw) g.rotateY(yaw);
  g.translate(ox, oy, oz);
  list.push(g);
}

function localSphere(list, r, lx, ly, lz, ox, oy, oz, yaw = 0, ws = 8, hs = 6) {
  const g = new THREE.SphereGeometry(r, ws, hs);
  g.translate(lx, ly, lz);
  if (yaw) g.rotateY(yaw);
  g.translate(ox, oy, oz);
  list.push(g);
}

function ellipsoid(list, r, sx, sy, sz, lx, ly, lz, ox, oy, oz, yaw = 0) {
  const g = new THREE.SphereGeometry(r, 12, 9);
  g.scale(sx, sy, sz);
  g.translate(lx, ly, lz);
  if (yaw) g.rotateY(yaw);
  g.translate(ox, oy, oz);
  list.push(g);
}

function bone(list, ax, ay, az, bx, by, bz, ra, rb, seg = 6) {
  const dx = bx - ax;
  const dy = by - ay;
  const dz = bz - az;
  const len = Math.hypot(dx, dy, dz) || 1;
  const g = new THREE.CylinderGeometry(rb, ra, len, seg, 1, false);
  const q = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(dx / len, dy / len, dz / len)
  );
  g.applyQuaternion(q);
  g.translate((ax + bx) * 0.5, (ay + by) * 0.5, (az + bz) * 0.5);
  list.push(g);
}

function roofGeometry(w, d, h, lift = 0.5, segX = 14, segZ = 9) {
  const pos = [];
  const uv = [];
  const idx = [];
  for (let iz = 0; iz <= segZ; iz++) {
    const vz = (iz / segZ) * 2 - 1;
    for (let ix = 0; ix <= segX; ix++) {
      const vx = (ix / segX) * 2 - 1;
      const zf = Math.abs(vz);
      const xf = Math.abs(vx);
      let y = h * (1 - Math.pow(zf, 1.18));
      y *= 1 - smoothstep(0.52, 0.99, xf) * 0.72;
      y += lift * smoothstep(0.4, 1, xf) * Math.pow(zf, 1.8) * 1.15;
      y += h * 0.045 * Math.pow(xf, 3.2) * (1 - zf * 0.35);
      pos.push(vx * w * 0.5, y, vz * d * 0.5);
      uv.push(ix / segX, iz / segZ);
    }
  }
  for (let iz = 0; iz < segZ; iz++) {
    for (let ix = 0; ix < segX; ix++) {
      const a = iz * (segX + 1) + ix;
      const b = a + 1;
      const c = a + segX + 1;
      const e = c + 1;
      idx.push(a, c, b, b, c, e);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

function addRoof(parts, ox, oy, oz, yaw, w, d, h, lift = 0.55, roofKey = 'roof') {
  const g = roofGeometry(w, d, h, lift);
  g.rotateY(yaw);
  g.translate(ox, oy, oz);
  parts[roofKey].push(g);
  localBox(parts.gold, w * 0.56, 0.16, 0.24, 0, h + 0.04, 0, ox, oy, oz, yaw);
  for (const side of [-1, 1]) {
    localBox(parts[roofKey], 0.42, 0.24, 0.42, side * w * 0.285, h + 0.08, 0, ox, oy, oz, yaw);
    localCyl(parts[roofKey], 0.09, 0.14, 0.65, 6, side * w * 0.285, h + 0.28, 0, ox, oy, oz, yaw, 0, side * 0.45);
  }
  for (const [lx, lz] of [[-w / 2, -d / 2], [-w / 2, d / 2], [w / 2, -d / 2], [w / 2, d / 2]]) {
    localCyl(parts.gold, 0.04, 0.09, 0.55, 5, lx, 0.24, lz, ox, oy, oz, yaw, 0, lx > 0 ? -0.7 : 0.7);
  }
}

function addCenser(parts, x, y, z, scale = 1) {
  localCyl(parts.bronze, 1.05 * scale, 0.72 * scale, 0.95 * scale, 12, 0, 0.95 * scale, 0, x, y, z);
  localCyl(parts.bronze, 1.14 * scale, 1.08 * scale, 0.22 * scale, 12, 0, 1.5 * scale, 0, x, y, z);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI * 0.25;
    localCyl(parts.bronze, 0.12 * scale, 0.17 * scale, 0.85 * scale, 6, Math.cos(a) * 0.62 * scale, 0.4 * scale, Math.sin(a) * 0.62 * scale, x, y, z);
  }
  for (const side of [-1, 1]) {
    const g = new THREE.TorusGeometry(0.42 * scale, 0.07 * scale, 5, 10, Math.PI);
    g.rotateZ(Math.PI * 0.5);
    g.rotateY(side > 0 ? 0 : Math.PI);
    g.translate(side * 1.03 * scale, 1.45 * scale, 0);
    g.rotateY(0);
    g.translate(x, y, z);
    parts.bronze.push(g);
  }
  localBox(parts.gold, 1.9 * scale, 0.08 * scale, 0.18 * scale, 0, 1.54 * scale, 0, x, y, z);
}

function addGate(parts, x, y, z, yaw, w, h, plaque, plaqueW, roofKey = 'roof') {
  const colH = h;
  for (const side of [-1, 1]) {
    for (const dz of [-1.55, 1.55]) {
      localBox(parts.stone, 1.55, 0.46, 1.35, side * w * 0.5, 0.23, dz, x, y, z, yaw);
      localCyl(parts.pillar, 0.26, 0.32, colH, 8, side * w * 0.5, colH * 0.5 + 0.35, dz, x, y, z);
      localCyl(parts.gold, 0.34, 0.38, 0.2, 8, side * w * 0.5, colH + 0.36, dz, x, y, z);
    }
  }
  localBox(parts.pillar, w + 0.9, 0.42, 0.34, 0, colH + 0.12, 1.55, x, y, z, yaw);
  localBox(parts.pillar, w + 0.9, 0.42, 0.34, 0, colH + 0.12, -1.55, x, y, z, yaw);
  localBox(parts.pillar, w + 1.3, 0.46, 0.4, 0, colH + 0.76, 1.55, x, y, z, yaw);
  localBox(parts.pillar, w + 1.3, 0.46, 0.4, 0, colH + 0.76, -1.55, x, y, z, yaw);
  localBox(parts.gold, w + 1.8, 0.16, 0.5, 0, colH + 1.08, 0, x, y, z, yaw);
  addRoof(parts, x, y + colH + 1.15, z, yaw, w + 3.2, 4.6, 2.3, 0.6, roofKey);
  for (const side of [-1, 1]) {
    localCyl(parts.wood, 0.03, 0.03, 0.7, 4, side * (w * 0.5 - 0.55), colH - 0.2, 1.9, x, y, z, yaw);
    localSphere(parts.lantern, 0.28, side * (w * 0.5 - 0.55), colH - 0.72, 1.9, x, y, z, yaw, 8, 6);
    localCyl(parts.gold, 0.12, 0.15, 0.12, 6, side * (w * 0.5 - 0.55), colH - 0.44, 1.9, x, y, z, yaw);
  }
  if (plaque) {
    const mat = makePlaqueMaterial(plaque, plaqueW || 'EMEISHAN');
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.2), mat);
    const fx = Math.sin(yaw) * 1.77;
    const fz = Math.cos(yaw) * 1.77;
    plane.position.set(x + fx, y + colH + 0.42, z + fz);
    plane.rotation.y = yaw;
    plane.renderOrder = 4;
    parts.extras.push(plane);
  }
}

function addHall(parts, x, y, z, yaw, w, d, wallH, roofH, opts = {}) {
  const baseH = opts.baseH ?? 0.55;
  localBox(parts.stone, w + 1.1, baseH, d + 1.1, 0, baseH * 0.5, 0, x, y, z, yaw);
  localBox(parts.redWall, w, wallH, d, 0, baseH + wallH * 0.5, 0, x, y, z, yaw);
  const front = d * 0.5 + 0.02;
  localBox(parts.wood, w * 0.34, wallH * 0.66, 0.16, 0, baseH + wallH * 0.33, front, x, y, z, yaw);
  localBox(parts.gold, w * 0.38, 0.18, 0.22, 0, baseH + wallH * 0.7, front + 0.02, x, y, z, yaw);
  const cols = opts.columns ?? 4;
  for (let i = 0; i < cols; i++) {
    const lx = -w * 0.5 + 0.5 + (i / (cols - 1)) * (w - 1);
    localCyl(parts.pillar, 0.18, 0.23, wallH, 7, lx, baseH + wallH * 0.5, front + 0.26, x, y, z, yaw);
  }
  if (opts.sideColumns) {
    for (const side of [-1, 1]) {
      localCyl(parts.pillar, 0.17, 0.21, wallH, 7, side * (w * 0.5 + 0.28), baseH + wallH * 0.5, 0, x, y, z, yaw);
    }
  }
  addRoof(parts, x, y + baseH + wallH + 0.06, z, yaw, w + 2.2, d + 1.9, roofH, 0.62, opts.roofKey || 'roof');
  for (const side of [-1, 1]) {
    localSphere(parts.lantern, 0.24, side * (w * 0.5 - 0.7), baseH + wallH - 0.38, front + 0.48, x, y, z, yaw, 8, 6);
  }
}

function addRack(parts, x, y, z, yaw, width, height = 2.3) {
  for (const side of [-1, 1]) {
    localCyl(parts.wood, 0.09, 0.12, height, 6, side * width * 0.5, height * 0.5, 0, x, y, z, yaw);
    localCyl(parts.gold, 0.13, 0.13, 0.12, 6, side * width * 0.5, height, 0, x, y, z, yaw);
  }
  localCyl(parts.wood, 0.08, 0.08, width + 0.2, 6, 0, height - 0.08, 0, x, y, z, yaw, 0, Math.PI * 0.5);
}

function addStele(parts, x, y, z, yaw, w = 1.0, h = 2.3) {
  localBox(parts.stoneDark, w, h, 0.42, 0, h * 0.5 + 0.18, 0, x, y, z, yaw);
  localBox(parts.stone, w + 0.5, 0.26, 0.86, 0, 0.13, 0, x, y, z, yaw);
  localBox(parts.stoneDark, w + 0.28, 0.18, 0.58, 0, h + 0.18, 0, x, y, z, yaw);
  localBox(parts.gold, w * 0.62, 0.07, 0.03, 0, h * 0.62, 0.225, x, y, z, yaw);
  localBox(parts.gold, w * 0.46, 0.07, 0.03, 0, h * 0.45, 0.225, x, y, z, yaw);
}

function addLanternPost(parts, x, y, z, side, yaw) {
  localCyl(parts.wood, 0.08, 0.12, 2.5, 6, 0, 1.25, 0, x, y, z);
  localBox(parts.wood, 0.7, 0.08, 0.08, side * 0.3, 2.42, 0, x, y, z, yaw);
  localSphere(parts.lantern, 0.3, side * 0.62, 2.08, 0, x, y, z, 0, 8, 6);
  localCyl(parts.gold, 0.1, 0.14, 0.16, 6, side * 0.62, 2.38, 0, x, y, z);
  localCyl(parts.gold, 0.04, 0.04, 0.3, 4, side * 0.62, 2.62, 0, x, y, z);
}

function addInscriptionRock(parts, x, y, z, yaw, width, height, material) {
  localBox(parts.stoneDark, width + 0.5, height + 0.5, 0.7, 0, height * 0.5, 0, x, y, z, yaw);
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  plane.position.set(x + Math.sin(yaw) * 0.37, y + height * 0.5 + 0.15, z + Math.cos(yaw) * 0.37);
  plane.rotation.y = yaw;
  parts.extras.push(plane);
}

function addBellTower(parts, x, y, z, yaw, scale = 1) {
  const s = scale;
  localBox(parts.stone, 5.2 * s, 0.7 * s, 5.2 * s, 0, 0.35 * s, 0, x, y, z, yaw);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      localCyl(parts.pillar, 0.24 * s, 0.3 * s, 5.2 * s, 8, sx * 1.9 * s, 2.95 * s, sz * 1.9 * s, x, y, z, yaw);
    }
  }
  localBox(parts.redWall, 3.6 * s, 0.4 * s, 3.6 * s, 0, 5.1 * s, 0, x, y, z, yaw);
  addRoof(parts, x, y + 5.3 * s, z, yaw, 6.4 * s, 6.4 * s, 2.2 * s, 0.7, 'roof');
  const cy = y + 4.55 * s;
  localCyl(parts.bronze, 0.95 * s, 1.18 * s, 1.55 * s, 14, 0, cy, 0, x, y, z, yaw);
  localCyl(parts.bronze, 1.14 * s, 1.0 * s, 0.26 * s, 14, 0, cy + 0.9 * s, 0, x, y, z, yaw);
  localSphere(parts.bronze, 0.24 * s, 0, cy - 1.05 * s, 0, x, y, z, yaw, 8, 6);
  localCyl(parts.gold, 0.06 * s, 0.06 * s, 1.1 * s, 5, 0, cy - 1.55 * s, 0, x, y, z, yaw);
  localBox(parts.gold, 1.1 * s, 0.12 * s, 0.12 * s, 0, cy + 1.06 * s, 0, x, y, z, yaw);
}

function addSamantabhadra(parts, x, y, z, scale = 1) {
  const s = scale;
  for (let i = 0; i < 4; i++) {
    const r = (15.2 - i * 2.5) * s;
    const yy = y + i * 1.25 * s;
    localCyl(parts.stone, r, r + 0.55 * s, 1.25 * s, 12, 0, 0.62 * s, 0, x, yy, z);
    const ring = new THREE.TorusGeometry(r * 0.94, 0.075 * s, 4, 28);
    ring.rotateX(Math.PI / 2);
    ring.translate(x, yy + 1.27 * s, z);
    parts.goldDark.push(ring);
  }
  for (let i = 0; i < 6; i++) {
    localBox(parts.stone, 5.6 * s, 0.34 * s, 1.15 * s, 0, 0.17 * s, (16.1 - i * 1.05) * s, x, y, z);
  }
  const baseY = y + 5.15 * s;
  localCyl(parts.goldDark, 4.3 * s, 5.5 * s, 1.5 * s, 12, 0, 0.75 * s, 0, x, baseY, z);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    ellipsoid(parts.goldBright, 0.82 * s, 1, 0.55, 1.5, Math.cos(a) * 4.4 * s, 1.55 * s, Math.sin(a) * 4.4 * s, x, baseY, z, a);
  }
  const eY = baseY + 3.3 * s;
  ellipsoid(parts.gold, 2.9 * s, 1.25, 0.95, 1.75, 0, 0, 0, x, eY, z, 0);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      bone(parts.gold, x + sx * 1.7 * s, eY - 0.2 * s, z + sz * 2.1 * s, x + sx * 2.0 * s, baseY + 1.7 * s, z + sz * 2.5 * s, 0.55 * s, 0.72 * s, 8);
    }
  }
  localSphere(parts.gold, 2.2 * s, 0, 0.25 * s, 3.3 * s, x, eY, z, 0, 12, 9);
  for (const sx of [-1, 1]) {
    ellipsoid(parts.gold, 0.9 * s, 0.42, 1.15, 1.1, sx * 2.0 * s, 0.55 * s, 3.1 * s, x, eY, z, sx * 0.3);
    bone(parts.goldBright, x + sx * 0.9 * s, eY - 0.1 * s, z + 4.5 * s, x + sx * 1.1 * s, eY - 1.9 * s, z + 5.4 * s, 0.14 * s, 0.04 * s, 6);
  }
  bone(parts.gold, x, eY - 0.2 * s, z + 4.8 * s, x, eY - 2.2 * s, z + 6.1 * s, 0.45 * s, 0.23 * s, 8);
  bone(parts.gold, x, eY - 2.2 * s, z + 6.1 * s, x - 0.35 * s, eY - 4.4 * s, z + 6.0 * s, 0.23 * s, 0.09 * s, 7);
  for (let i = 0; i < 3; i++) {
    for (const sx of [-1, 1]) {
      bone(parts.goldBright, x + sx * 1.6 * s, eY + 3.6 * s, z + 0.3 * s, x + sx * (1.4 + i * 0.55) * s, eY + 1.9 * s, z + 2.9 * s, 0.2 * s, 0.1 * s, 6);
    }
  }
  const bodyY = eY + 4.2 * s;
  localCyl(parts.goldBright, 2.2 * s, 2.9 * s, 4.2 * s, 10, 0, 0, 0, x, bodyY, z);
  ellipsoid(parts.goldBright, 2.1 * s, 1.3, 0.75, 1, 0, 2.35 * s, 0, x, bodyY, z, 0);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      bone(parts.goldBright, x + sx * 1.1 * s, bodyY + 0.7 * s, z + sz * 0.4 * s, x + sx * 2.3 * s, bodyY + 2.0 * s, z + sz * 1.2 * s, 0.34 * s, 0.2 * s, 6);
      bone(parts.goldBright, x + sx * 0.9 * s, bodyY + 0.1 * s, z + 0.3 * s, x + sx * 2.7 * s, bodyY + 1.0 * s, z + 0.7 * s, 0.3 * s, 0.17 * s, 6);
    }
  }
  const headY = bodyY + 3.3 * s;
  const headOffsets = [[0, 0.6, 0.25, 1.15], [-1.15, 0.2, 0.1, 0.86], [1.15, 0.2, 0.1, 0.86], [-0.55, 0.05, -0.75, 0.9], [0.55, 0.05, -0.75, 0.9]];
  for (const [hx, hy, hz, hs] of headOffsets) {
    localSphere(parts.goldBright, 0.78 * hs * s, hx * s, hy * s, hz * s, x, headY, z, 0, 10, 8);
    localCyl(parts.gold, 0.52 * hs * s, 0.8 * hs * s, 0.46 * s, 9, hx * s, (hy + 0.82 * hs) * s, hz * s, x, headY, z);
    localCyl(parts.goldBright, 0.08 * s, 0.16 * s, 0.34 * s, 5, hx * s, (hy + 1.15 * hs) * s, hz * s, x, headY, z);
  }
  const halo = new THREE.TorusGeometry(2.5 * s, 0.16 * s, 8, 30);
  halo.translate(x, headY + 0.8 * s, z - 0.9 * s);
  parts.goldBright.push(halo);
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(6.2 * s, 2.0 * s), makePlaqueMaterial('十方普贤', 'SAMANTABHADRA'));
  plaque.position.set(x, baseY + 3.15 * s, z + 15.9 * s);
  plaque.rotation.y = 0;
  plaque.renderOrder = 4;
  parts.extras.push(plaque);
}

export function createArchitecture() {
  const group = new THREE.Group();
  group.name = 'emeishan-architecture';
  const parts = {
    stone: [], stoneDark: [], redWall: [], pillar: [], roof: [], wood: [],
    gold: [], goldBright: [], goldDark: [], goldRoof: [], bronze: [], lantern: [], extras: [],
  };
  const smokeEmitters = [];
  const ribbonRacks = [];
  const stats = { gates: 0, halls: 0, steles: 0, censers: 0, lanterns: 0, inscriptions: 0, bells: 0 };

  const gateDefs = [
    { t: 0.018, w: 12.5, h: 5.4, name: '报国寺', plaque: '报国寺', sub: 'BAOGUO TEMPLE' },
    { t: 0.37, w: 11.2, h: 5.0, name: '万年寺', plaque: '万年寺', sub: 'WANNIAN TEMPLE' },
    { t: 0.61, w: 7.4, h: 4.2, name: '雷洞坪', plaque: null, sub: null },
    { t: 0.905, w: 12.2, h: 5.8, name: '金顶', plaque: '金顶', sub: 'GOLDEN SUMMIT' },
  ];
  for (const gd of gateDefs) {
    const idx = Math.round(gd.t * (trailSamples.length - 1));
    const f = frameAt(idx);
    const s = f.s;
    const facing = Math.atan2(-f.tx, -f.tz);
    const named = gd.plaque;
    addGate(parts, s.x, s.y + 0.05, s.z, facing, gd.w, gd.h, named, gd.sub, gd.name === '金顶' ? 'goldRoof' : 'roof');
    stats.gates++;
    if (named) stats.lanterns += 2;
    if (gd.name === '报国寺' || gd.name === '万年寺' || gd.name === '金顶') {
      const off = gd.w * 0.5 + 2.1;
      const rx = s.x + f.nx * off;
      const rz = s.z + f.nz * off;
      addRack(parts, rx, s.y + 0.05, rz, facing + Math.PI * 0.5, 3.4, 2.4);
      ribbonRacks.push({ x: rx, y: s.y + 2.32, z: rz, yaw: facing + Math.PI * 0.5, width: 3.1, count: 18 });
      addStele(parts, s.x - f.nx * off, s.y + 0.05, s.z - f.nz * off, facing + 0.1);
      stats.steles++;
      addCenser(parts, s.x - f.nx * (off - 0.4), s.y + 0.18, s.z - f.nz * (off - 0.4), 0.9);
      smokeEmitters.push({ x: s.x - f.nx * (off - 0.4), y: s.y + 1.6, z: s.z - f.nz * (off - 0.4), scale: 1.0 });
      stats.censers++;
    }
  }

  const temple = platforms[0];
  addHall(parts, temple.x - 12.0, temple.y, temple.z + 1.0, Math.PI * 0.5, 14.0, 7.0, 4.5, 3.4, { columns: 6, sideColumns: true });
  addHall(parts, temple.x + 12.0, temple.y, temple.z + 10.0, -Math.PI * 0.5, 8.5, 5.2, 3.5, 2.6, { columns: 4 });
  addHall(parts, temple.x + 12.0, temple.y, temple.z - 11.0, -Math.PI * 0.5, 8.5, 5.2, 3.5, 2.6, { columns: 4 });
  addHall(parts, temple.x - 2.0, temple.y, temple.z - 16.0, 0, 11.0, 5.4, 3.8, 2.8, { columns: 5 });
  stats.halls += 4;
  addBellTower(parts, temple.x + 15.0, temple.y, temple.z + 2.0, -0.3, 0.9);
  stats.bells++;
  addCenser(parts, temple.x + 2.0, heightAt(temple.x + 2.0, temple.z + 12.0) + 0.15, temple.z + 12.0, 1.25);
  smokeEmitters.push({ x: temple.x + 2.0, y: heightAt(temple.x + 2.0, temple.z + 12.0) + 1.9, z: temple.z + 12.0, scale: 1.45 });
  stats.censers++;
  for (const [sx, sz, yaw] of [[temple.x - 15.0, temple.z + 12.5, 0.1], [temple.x + 15.5, temple.z - 2.5, -0.2]]) {
    addRack(parts, sx, heightAt(sx, sz), sz, yaw, 3.2, 2.5);
    ribbonRacks.push({ x: sx, y: heightAt(sx, sz) + 2.4, z: sz, yaw, width: 2.9, count: 18 });
    addStele(parts, sx - 3.1, heightAt(sx - 3.1, sz + 1.2), sz + 1.2, yaw + 0.15, 0.95, 2.2);
    stats.steles++;
  }

  const monastery = platforms[1];
  addHall(parts, monastery.x - 12.0, monastery.y, monastery.z + 1.0, Math.PI * 0.5, 11.0, 6.0, 4.0, 3.0, { columns: 5, sideColumns: true });
  addHall(parts, monastery.x + 12.0, monastery.y, monastery.z - 7.0, -Math.PI * 0.5, 7.5, 4.6, 3.2, 2.4, { columns: 4 });
  stats.halls += 2;
  addCenser(parts, monastery.x + 1.0, heightAt(monastery.x + 1.0, monastery.z + 9.0) + 0.12, monastery.z + 9.0, 1.0);
  smokeEmitters.push({ x: monastery.x + 1.0, y: heightAt(monastery.x + 1.0, monastery.z + 9.0) + 1.7, z: monastery.z + 9.0, scale: 1.2 });
  stats.censers++;
  addBellTower(parts, monastery.x - 14.0, monastery.y, monastery.z - 8.0, 0.2, 0.8);
  stats.bells++;

  const summit = platforms[3];
  addSamantabhadra(parts, summit.x, summit.y + 0.05, summit.z, 1.0);
  addHall(parts, summit.x - 17.0, summit.y, summit.z - 3.0, Math.PI * 0.5, 11.0, 6.0, 3.8, 2.9, { columns: 5, roofKey: 'goldRoof' });
  addHall(parts, summit.x + 17.0, summit.y, summit.z - 3.0, -Math.PI * 0.5, 11.0, 6.0, 3.8, 2.9, { columns: 5, roofKey: 'goldRoof' });
  addHall(parts, summit.x, summit.y, summit.z - 18.0, 0, 12.5, 6.2, 4.0, 3.1, { columns: 5, sideColumns: true, roofKey: 'goldRoof' });
  stats.halls += 3;
  addCenser(parts, summit.x, summit.y + 0.1, summit.z + 13.0, 1.1);
  smokeEmitters.push({ x: summit.x, y: summit.y + 1.8, z: summit.z + 13.0, scale: 1.4 });
  stats.censers++;
  for (const [sx, sz, yaw] of [[summit.x - 13.0, summit.z + 8.0, 0.3], [summit.x + 13.0, summit.z + 8.0, -0.3]]) {
    addRack(parts, sx, summit.y, sz, yaw, 3.0, 2.5);
    ribbonRacks.push({ x: sx, y: summit.y + 2.42, z: sz, yaw, width: 2.7, count: 16 });
    addStele(parts, sx + 0.4, summit.y, sz - 2.2, yaw + 0.1, 0.85, 2.0);
    stats.steles++;
  }
  addStele(parts, summit.x - 6.0, summit.y, summit.z + 20.0, 0.2, 1.2, 2.6);
  stats.steles++;

  const sunrise = platforms[4];
  addInscriptionRock(parts, sunrise.x + 7.5, heightAt(sunrise.x + 7.5, sunrise.z + 1.2) + 0.1, sunrise.z + 1.2, Math.PI + 0.28, 5.2, 2.1, mats.inscriptionA);
  stats.inscriptions++;
  addStele(parts, sunrise.x - 6.4, heightAt(sunrise.x - 6.4, sunrise.z + 2.2), sunrise.z + 2.2, 0.3, 1.0, 2.2);
  stats.steles++;
  addBellTower(parts, sunrise.x + 11.0, heightAt(sunrise.x + 11.0, sunrise.z - 3.0), sunrise.z - 3.0, 0.0, 0.62);
  stats.bells++;

  for (const [t, side, matIdx] of [[0.52, 1, 1], [0.735, -1, 0]]) {
    const f = frameAt(Math.round(t * (trailSamples.length - 1)));
    const s = f.s;
    const off = s.width * 0.5 + 3.4;
    const x = s.x + f.nx * side * off;
    const z = s.z + f.nz * side * off;
    const facing = Math.atan2(-f.nx * side, -f.nz * side);
    addInscriptionRock(parts, x, heightAt(x, z) + 0.2, z, facing, 4.6, 1.9, matIdx ? mats.inscriptionB : mats.inscriptionA);
    stats.inscriptions++;
  }

  const lanternTs = [0.43, 0.49, 0.55, 0.66, 0.72, 0.78, 0.84, 0.89];
  for (let i = 0; i < lanternTs.length; i++) {
    const f = frameAt(Math.round(lanternTs[i] * (trailSamples.length - 1)));
    const s = f.s;
    const side = i % 2 ? 1 : -1;
    const off = s.width * 0.5 + 0.95;
    addLanternPost(parts, s.x + f.nx * side * off, s.y + 0.08, s.z + f.nz * side * off, side, f.yaw);
    stats.lanterns++;
  }

  const materialMap = {
    stone: mats.stone,
    stoneDark: mats.stoneDark,
    redWall: mats.redWall,
    pillar: mats.redWall,
    roof: mats.roof,
    wood: mats.wood,
    gold: mats.goldBright,
    goldBright: mats.goldBright,
    goldDark: mats.gold,
    goldRoof: mats.goldRoof,
    bronze: mats.bronze,
    lantern: mats.lantern,
  };
  for (const [key, list] of Object.entries(materialMap)) {
    if (!parts[key].length) continue;
    const mesh = new THREE.Mesh(mergeGeometryList(parts[key]), list);
    mesh.name = 'emeishan-' + key;
    mesh.castShadow = key !== 'roof' && key !== 'goldRoof';
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  for (const extra of parts.extras) group.add(extra);

  return { group, smokeEmitters, ribbonRacks, stats };
}
