import * as THREE from 'three';
import { mergeStaticGroup } from './geometry.js';
const MAT = new Map();
function mat(color, rough = 0.9, metal = 0) {
  const k = color + ':' + rough + ':' + metal;
  if (!MAT.has(k)) MAT.set(k, new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal }));
  return MAT.get(k);
}
function add(g, geo, m, x, y, z, ry = 0) {
  const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.y = ry; o.castShadow = true; o.receiveShadow = true; g.add(o); return o;
}
function box(g, w, h, d, m, x, y, z, ry = 0) { return add(g, new THREE.BoxGeometry(w, h, d), m, x, y, z, ry); }
function roof(g, w, d, h, m, x, y, z) {
  const geo = new THREE.ConeGeometry(Math.max(w, d) * 0.74, h, 4); geo.rotateY(Math.PI / 4); geo.scale(w / Math.max(w, d), 1, d / Math.max(w, d)); add(g, geo, m, x, y + h * 0.5, z);
}
function crane(g, x, z, s, m) {
  box(g, 0.24 * s, 1.5 * s, 0.22 * s, m, x, 0.9 * s, z);
  box(g, 0.7 * s, 0.36 * s, 0.28 * s, m, x + 0.2 * s, 1.6 * s, z);
  box(g, 0.1 * s, 0.5 * s, 0.1 * s, m, x + 0.55 * s, 1.9 * s, z);
  box(g, 0.5 * s, 0.08 * s, 0.08 * s, m, x + 0.75 * s, 1.92 * s, z);
}
export function buildYellowCraneOverlay() {
  const group = new THREE.Group();
  const stone = mat(0xcfc5b0), stoneDark = mat(0x8b806c), red = mat(0x8f2f25), gold = mat(0xbf9346, 0.42, 0.35);
  const tile = mat(0xb78b32, 0.72), wood = mat(0x5b3e28), green = mat(0x3e5d3b);
  const hill = new THREE.ConeGeometry(54, 28, 9); add(group, hill, mat(0x68735a), -78, 14, 116);
  box(group, 40, 3.0, 32, stoneDark, -78, 29, 112);
  box(group, 32, 1.2, 24, stone, -78, 31, 112);
  for (let i = 0; i < 7; i++) box(group, 16 - i * 0.6, 0.35, 1.1, stone, -78, 30.6 + i * 0.55, 126 + i * 1.3);
  const tiers = 5;
  for (let i = 0; i < tiers; i++) {
    const w = 20 - i * 2.1;
    const h = 4.5 - i * 0.3;
    const y = 32.5 + i * 5.0;
    box(group, w, h, w, red, -78, y + h / 2, 112);
    box(group, w + 1.4, 0.4, w + 1.4, wood, -78, y + h + 0.2, 112);
    roof(group, w + 6.5, w + 6.5, 2.8, tile, -78, y + h + 0.4, 112);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      box(group, 0.3, h, 0.3, wood, -78 + sx * (w / 2 - 0.4), y + h / 2, 112 + sz * (w / 2 - 0.4));
    }
    for (const sz of [-1, 1]) {
      box(group, w * 0.5, 1.1, 0.3, gold, -78, y + h - 1.2, 112 + sz * (w / 2 + 0.12));
      box(group, 3.0, 1.2, 0.25, gold, -78, y + h - 2.6, 112 + sz * (w / 2 + 0.14));
    }
    box(group, w * 0.72, 0.16, w + 2.4, wood, -78, y + 0.12, 112);
    for (const sz of [-1, 1]) {
      for (let k = 0; k < 6; k++) box(group, 0.14, 1.0, 0.14, wood, -78 - w * 0.42 + k * w * 0.16, y + 0.65, 112 + sz * (w / 2 + 1.3));
    }
  }
  roof(group, 11, 11, 5, tile, -78, 57.8, 112);
  box(group, 0.4, 5.0, 0.4, gold, -78, 65.0, 112);
  for (let i = 0; i < 3; i++) add(group, new THREE.SphereGeometry(1.0 - i * 0.2, 8, 6), gold, -78, 60.5 + i * 1.2, 112);
  crane(group, -108, 118, 1.7, mat(0xe0d8c5));
  crane(group, -48, 120, 1.4, mat(0xe0d8c5));
  for (let i = 0; i < 6; i++) add(group, new THREE.CylinderGeometry(0.18, 0.3, 8, 5), mat(0x5b432a), -130 + i * 18, 5, 118);
  for (let i = 0; i < 6; i++) add(group, new THREE.ConeGeometry(3.5, 8, 6), green, -130 + i * 18, 16, 118);
  const stele = new THREE.Group(); box(stele, 3.2, 6.5, 0.8, stoneDark, 0, 3.2, 0); box(stele, 2.2, 1.0, 0.15, gold, 0, 5.2, 0.46); stele.position.set(-120, 30, 160); group.add(stele);
  for (let i = 0; i < 8; i++) {
    const p = new THREE.Group(); add(p, new THREE.CylinderGeometry(0.22, 0.34, 1.2, 7), mat(i % 2 ? 0x7d5a32 : 0x3e4c5c), 0, 0.95, 0); add(p, new THREE.SphereGeometry(0.22, 8, 6), mat(0xc79c78), 0, 1.7, 0); p.position.set(-110 + (i % 4) * 9, 31, 145 + Math.floor(i / 4) * 8); group.add(p);
  }
  return mergeStaticGroup(group);
}
