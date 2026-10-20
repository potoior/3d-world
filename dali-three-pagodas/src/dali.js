import * as THREE from 'three';
import { mergeStaticGroup } from './geometry.js';

const MAT = new Map();
function mat(color, rough = 0.92, metal = 0) {
  const k = color + ':' + rough + ':' + metal;
  if (!MAT.has(k)) MAT.set(k, new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal }));
  return MAT.get(k);
}
function add(g, geo, m, x, y, z, ry = 0) {
  const o = new THREE.Mesh(geo, m);
  o.position.set(x, y, z);
  o.rotation.y = ry;
  o.castShadow = true;
  o.receiveShadow = true;
  g.add(o);
  return o;
}
function box(g, w, h, d, m, x, y, z, ry = 0) { return add(g, new THREE.BoxGeometry(w, h, d), m, x, y, z, ry); }
function roof(g, w, d, h, m, x, y, z) {
  const geo = new THREE.ConeGeometry(Math.max(w, d) * 0.74, h, 4);
  geo.rotateY(Math.PI / 4);
  geo.scale(w / Math.max(w, d), 1, d / Math.max(w, d));
  add(g, geo, m, x, y + h * 0.5, z);
}
function pagoda(g, x, z, levels, baseY, scale, square, stone, tile, gold) {
  const p = new THREE.Group();
  box(p, 10 * scale, 1.1 * scale, 10 * scale, stone, 0, 0.55 * scale, 0);
  const tiers = levels;
  for (let i = 0; i < tiers; i++) {
    const t = i / tiers;
    const w = (7.6 - t * 4.7) * scale;
    const h = (3.6 - t * 1.05) * scale;
    const y = 1.1 * scale + i * 2.05 * scale + h * 0.5;
    const seg = square ? 4 : 8;
    const body = new THREE.CylinderGeometry(w * 0.46, w * 0.52, h, seg);
    if (square) body.rotateY(Math.PI / 4);
    add(p, body, stone, 0, y, 0);
    const eave = new THREE.CylinderGeometry(w * 0.76, w * 0.55, 0.34 * scale, seg);
    if (square) eave.rotateY(Math.PI / 4);
    add(p, eave, tile, 0, y + h * 0.5 + 0.12 * scale, 0);
    for (let k = 0; k < seg; k++) {
      const a = (k / seg) * Math.PI * 2 + (square ? Math.PI / 4 : 0);
      const rr = w * 0.66;
      const bell = new THREE.SphereGeometry(0.23 * scale, 6, 5);
      bell.translate(Math.cos(a) * rr, y + h * 0.5 - 0.12 * scale, Math.sin(a) * rr);
      p.add(new THREE.Mesh(bell, gold));
    }
  }
  const topY = 1.1 * scale + tiers * 2.05 * scale + 0.3 * scale;
  add(p, new THREE.CylinderGeometry(0.34 * scale, 0.52 * scale, 5.5 * scale, 8), gold, 0, topY + 2.7 * scale, 0);
  for (let i = 0; i < 4; i++) add(p, new THREE.SphereGeometry((0.55 - i * 0.09) * scale, 8, 6), gold, 0, topY + 1.2 * scale + i * 0.8 * scale, 0);
  add(p, new THREE.ConeGeometry(0.28 * scale, 1.1 * scale, 8), gold, 0, topY + 5.8 * scale, 0);
  p.position.set(x, baseY, z);
  g.add(p);
  return p;
}
function hall(g, x, z, w, d, h, wall, tile, wood) {
  box(g, w, h, d, wall, x, h * 0.5, z);
  roof(g, w + 2, d + 2, 3.2, tile, x, h + 1.6, z);
  box(g, w * 0.36, 1.5, 0.7, wood, x, h * 0.5, z + d * 0.5 + 0.36);
  box(g, w * 0.2, 1.0, 0.2, mat(0xb08a45, 0.5, 0.3), x, h * 0.72, z + d * 0.5 + 0.75);
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 4; i++) box(g, 0.55, h, 0.55, wood, x + sx * (w * 0.37 - i * 0.1), h * 0.5, z + d * 0.5 + 0.2);
  }
}
export function buildDaliOverlay() {
  const group = new THREE.Group();
  const stone = mat(0xd7d0bf, 0.95);
  const stoneDark = mat(0xa99f8b, 0.96);
  const tile = mat(0x485554, 0.88);
  const gold = mat(0xbe9143, 0.42, 0.35);
  const red = mat(0x8e3429, 0.84);
  const white = mat(0xe4ded0, 0.95);
  const wood = mat(0x5b3e28, 0.92);

  box(group, 86, 6.5, 34, stoneDark, -40, 3.2, 220);
  box(group, 70, 1.2, 26, stone, -40, 6.6, 220);
  for (let i = 0; i < 9; i++) box(group, 46, 0.5, 1.2, stone, -40, 0.3 + i * 0.62, 236 + i * 1.2);
  pagoda(group, -40, 226, 9, 7.2, 1.55, true, stone, tile, gold);
  pagoda(group, -72, 214, 7, 7.0, 1.05, false, stone, tile, gold);
  pagoda(group, -8, 214, 7, 7.0, 1.05, false, stone, tile, gold);
  hall(group, -40, 246, 26, 12, 7, red, tile, wood);
  hall(group, -40, 262, 18, 10, 5.5, white, tile, wood);
  for (const x of [-84, -40, 4]) {
    for (let i = 0; i < 3; i++) {
      const t = new THREE.CylinderGeometry(0.45, 0.75, 9, 6);
      add(group, t, mat(0x4d5a3b), x + (i - 1) * 4.2, 11, 252 + Math.abs(i - 1) * 3);
    }
  }

  const gate = new THREE.Group();
  box(gate, 42, 11, 16, mat(0x8a7860), 0, 5.5, 0);
  box(gate, 12, 8, 17, mat(0x4b3523), 0, 4, 0);
  roof(gate, 18, 16, 3.2, tile, 0, 11.5, 0);
  roof(gate, 46, 18, 4.4, tile, 0, 13.5, 0);
  for (const x of [-18, 18]) {
    box(gate, 13, 12, 14, mat(0x8a7860), x, 6, 0);
    roof(gate, 16, 15, 3.2, tile, x, 12.2, 0);
  }
  gate.position.set(170, 0, 220);
  gate.rotation.y = -0.18;
  group.add(gate);

  for (let i = 0; i < 8; i++) {
    const x = 130 + (i % 4) * 13;
    const z = 240 + Math.floor(i / 4) * 15;
    box(group, 10, 5, 9, white, x, 2.5, z);
    roof(group, 12, 11, 2.4, tile, x, 6.2, z);
    box(group, 4, 2.6, 0.3, wood, x, 2.0, z + 4.6);
  }

  const snow = mat(0xe8ecef, 0.72);
  const mountain = mat(0x6f776f, 0.98);
  for (const [x, z, h] of [[-250, 300, 120], [-160, 320, 155], [-70, 340, 135], [30, 350, 170]]) {
    add(group, new THREE.ConeGeometry(h * 0.75, h, 7), mountain, x, h * 0.5 - 1, z);
    add(group, new THREE.ConeGeometry(h * 0.24, h * 0.3, 7), snow, x, h * 0.86, z);
  }

  const boat = new THREE.Group();
  add(boat, new THREE.CylinderGeometry(0.03, 1.2, 2.2, 8, 1, true), mat(0x6b4a2d), 0, 0.85, 0);
  box(boat, 4.2, 0.22, 1.7, mat(0x4b3523), 0, 0.86, 0);
  box(boat, 1.7, 0.36, 1.4, mat(0xd8d1bd), 0, 1.15, 0);
  boat.position.set(80, 0.2, 120);
  group.add(boat);
  for (let i = 0; i < 7; i++) {
    const x = -105 + i * 9;
    const p = new THREE.Group();
    add(p, new THREE.CylinderGeometry(0.2, 0.32, 1.2, 7), mat(i % 2 ? 0x2f5168 : 0x8c3b2e), 0, 0.95, 0);
    add(p, new THREE.SphereGeometry(0.2, 8, 6), mat(0xc79c78), 0, 1.7, 0);
    p.position.set(x, 0, 196 + (i % 2) * 8);
    p.rotation.y = i * 0.8;
    group.add(p);
  }
  return mergeStaticGroup(group);
}
