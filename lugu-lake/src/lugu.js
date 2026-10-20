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
function boat(g, x, z, s, wood, dark) {
  const b = new THREE.Group();
  add(b, new THREE.CylinderGeometry(0.04, 1.1 * s, 5.2 * s, 8, 1, true), wood, 0, 0.55 * s, 0).rotation.z = Math.PI;
  box(b, 4.6 * s, 0.22 * s, 1.2 * s, dark, 0, 0.5 * s, 0);
  b.position.set(x, 0.2, z); b.rotation.y = Math.random() * Math.PI; g.add(b); return b;
}
export function buildLuguOverlay() {
  const group = new THREE.Group();
  const stone = mat(0xb8ad92), wood = mat(0x6a4a2e), dark = mat(0x3d2a1c), tile = mat(0x3e4a48), white = mat(0xe4ddcb), gold = mat(0xb08a45, 0.5);
  add(group, new THREE.CylinderGeometry(19, 21, 1.2, 20), mat(0x7c8b5f), -20, 0.55, 20);
  box(group, 12, 4.0, 9, white, -20, 3.0, 20);
  roof(group, 16, 13, 3.0, tile, -20, 5.6, 20);
  box(group, 3.2, 1.8, 0.4, dark, -20, 1.7, 25.0);
  add(group, new THREE.CylinderGeometry(2.2, 2.8, 1.0, 10), stone, -20, 1.1, 8);
  add(group, new THREE.SphereGeometry(2.1, 12, 8), white, -20, 3.6, 8);
  add(group, new THREE.ConeGeometry(1.0, 2.4, 8), gold, -20, 5.6, 8);
  for (let i = 0; i < 7; i++) {
    add(group, new THREE.CylinderGeometry(0.2, 0.3, 5, 5), mat(0x5b432a), -36 + i * 5, 2.5, 34);
    add(group, new THREE.ConeGeometry(2.2, 6, 6), mat(0x46603f), -36 + i * 5, 8, 34);
  }
  const flagMat = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.9 });
  for (let i = 0; i < 12; i++) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.2), flagMat.clone());
    f.material.color.set([0xb63a30, 0xd9c75a, 0x2f5fa8, 0x3d8a55][i % 4]);
    f.position.set(-21 + i * 0.8, 4.0, 29);
    f.rotation.y = -0.4;
    group.add(f);
  }
  const village = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const x = -270 + i * 18;
    box(village, 14, 5.0, 10, wood, x, 2.5, 160);
    roof(village, 17, 13, 2.8, tile, x, 6.0, 160);
    box(village, 4.2, 2.6, 0.35, dark, x, 1.6, 165.3);
    box(village, 6.0, 0.5, 0.5, stone, x, 0.3, 166);
    for (let k = 0; k < 3; k++) box(village, 0.18, 3.8, 0.18, dark, x - 5 + k * 5, 2.0, 165.2);
  }
  box(village, 70, 1.0, 12, stone, -230, 0.3, 175);
  for (let i = 0; i < 4; i++) box(village, 1.2, 0.18, 4.0, wood, -260 + i * 15, 0.8, 172);
  group.add(village);
  for (let i = 0; i < 6; i++) boat(group, -110 + i * 28, 90 + (i % 3) * 10, 0.9 + (i % 2) * 0.2, wood, dark);
  for (let i = 0; i < 8; i++) {
    const p = new THREE.Group(); add(p, new THREE.CylinderGeometry(0.22, 0.34, 1.2, 7), mat(i % 2 ? 0x7d5a32 : 0x3e4c5c), 0, 0.95, 0); add(p, new THREE.SphereGeometry(0.22, 8, 6), mat(0xc79c78), 0, 1.7, 0); p.position.set(-250 + (i % 4) * 13, 0, 168 + Math.floor(i / 4) * 7); group.add(p);
  }
  return mergeStaticGroup(group);
}
