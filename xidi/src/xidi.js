import * as THREE from 'three';
import { mergeStaticGroup } from './geometry.js';
const MAT = new Map();
function mat(color, rough = 0.92) {
  const k = color + ':' + rough;
  if (!MAT.has(k)) MAT.set(k, new THREE.MeshStandardMaterial({ color, roughness: rough }));
  return MAT.get(k);
}
function add(g, geo, m, x, y, z, ry = 0) {
  const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.y = ry; o.castShadow = true; o.receiveShadow = true; g.add(o); return o;
}
function box(g, w, h, d, m, x, y, z, ry = 0) { return add(g, new THREE.BoxGeometry(w, h, d), m, x, y, z, ry); }
function roof(g, w, d, h, m, x, y, z) {
  const geo = new THREE.ConeGeometry(Math.max(w, d) * 0.72, h, 4); geo.rotateY(Math.PI / 4); geo.scale(w / Math.max(w, d), 1, d / Math.max(w, d)); add(g, geo, m, x, y + h * 0.5, z);
}
export function buildXidiOverlay() {
  const group = new THREE.Group();
  const stone = mat(0xb9b19f), stoneDark = mat(0x7f7665), white = mat(0xe5dfd0), tile = mat(0x3e4a48), wood = mat(0x5b3e28), green = mat(0x3f5c3a), gold = mat(0xb08a45, 0.5);
  const p = new THREE.Group();
  box(p, 22, 1.0, 4.5, stoneDark, 0, 0.5, 0);
  for (const x of [-9, -3.2, 3.2, 9]) box(p, 1.2, 10.5, 1.2, stone, x, 5.2, 0);
  for (const y of [4.2, 7.4, 10.2]) box(p, 20, 0.7, 1.8, stone, 0, y, 0);
  box(p, 7.2, 2.6, 1.4, stone, 0, 8.8, 0);
  box(p, 4.4, 1.3, 0.3, gold, 0, 8.8, 0.9);
  box(p, 12, 0.5, 2.2, tile, 0, 11.0, 0);
  for (const x of [-9, -3.2, 3.2, 9]) {
    add(p, new THREE.ConeGeometry(1.2, 1.8, 4), tile, x, 11.6, 0);
  }
  p.position.set(30, 0, 40); group.add(p);
  const hall = new THREE.Group();
  box(hall, 24, 1.2, 18, stone, 0, 0.6, 0);
  box(hall, 15, 5.5, 10, white, 0, 3.4, 0);
  roof(hall, 19, 14, 3.2, tile, 0, 6.8, 0);
  box(hall, 4.6, 2.8, 0.4, wood, 0, 1.8, 5.3);
  box(hall, 6.2, 0.6, 0.2, gold, 0, 3.3, 5.6);
  for (const x of [-5, 5]) box(hall, 0.4, 5.2, 0.4, wood, x, 3.2, 5.2);
  box(hall, 10, 1.2, 0.4, stoneDark, 0, 0.6, 8.5);
  hall.position.set(-90, 0, -36); group.add(hall);
  for (let i = 0; i < 4; i++) {
    const x = -40 + i * 18;
    box(group, 12, 6, 10, white, x, 3, -80 + (i % 2) * 4);
    roof(group, 15, 13, 2.6, tile, x, 6.3, -80 + (i % 2) * 4);
    box(group, 3.6, 2.6, 0.35, wood, x, 1.7, -74.8 + (i % 2) * 4);
  }
  for (let i = 0; i < 12; i++) {
    const x = -60 + i * 8;
    box(group, 7.0, 0.18, 0.7, stone, x, 0.1, 30 + (i % 3) * 0.6);
  }
  add(group, new THREE.CylinderGeometry(0.45, 0.7, 10, 6), mat(0x5b432a), 70, 5, 70);
  add(group, new THREE.ConeGeometry(6, 12, 7), green, 70, 15, 70);
  add(group, new THREE.CylinderGeometry(7, 8, 0.6, 16), mat(0x6e8f7a), -10, 0.3, 70);
  for (let i = 0; i < 7; i++) {
    const p2 = new THREE.Group(); add(p2, new THREE.CylinderGeometry(0.22, 0.34, 1.2, 7), mat(i % 2 ? 0x7d5a32 : 0x3e4c5c), 0, 0.95, 0); add(p2, new THREE.SphereGeometry(0.22, 8, 6), mat(0xc79c78), 0, 1.7, 0); p2.position.set(10 + (i % 4) * 7, 0, 34 + Math.floor(i / 4) * 8); group.add(p2);
  }
  for (let i = 0; i < 3; i++) {
    const x = 60 + i * 12;
    box(group, 9, 4.5, 8, white, x, 2.2, -30 + i * 5);
    roof(group, 12, 11, 2.2, tile, x, 5.0, -30 + i * 5);
  }
  return mergeStaticGroup(group);
}
