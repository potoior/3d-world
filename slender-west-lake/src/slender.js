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
  const geo = new THREE.ConeGeometry(Math.max(w, d) * 0.72, h, 4); geo.rotateY(Math.PI / 4); geo.scale(w / Math.max(w, d), 1, d / Math.max(w, d)); add(g, geo, m, x, y + h * 0.5, z);
}
export function buildSlenderOverlay() {
  const group = new THREE.Group();
  const stone = mat(0xc9c1ad), stoneDark = mat(0x8f8674), red = mat(0x8e3429), tile = mat(0xc49b3f, 0.72), wood = mat(0x5b3e28), white = mat(0xe7e3d6), gold = mat(0xb08a45, 0.5, 0.3);
  box(group, 48, 1.4, 8, stone, 45, 0.7, -78);
  for (let i = 0; i < 3; i++) box(group, 7, 3.2, 6.4, stoneDark, 25 + i * 20, -0.4, -78);
  const pav = [[45, 5.8, 1.5], [24, 4.6, 1.0], [66, 4.6, 1.0], [33, 4.9, 1.1], [57, 4.9, 1.1]];
  pav.forEach(([x, h, s]) => {
    box(group, 8.5 * s, h * 0.45, 7.2 * s, red, x, h * 0.22, -78);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(group, 0.28, h * 0.45, 0.28, wood, x + sx * 3.6 * s, h * 0.22, -78 + sz * 3.0 * s);
    roof(group, 10.5 * s, 9.2 * s, 3.0 * s, tile, x, h * 0.45, -78);
    add(group, new THREE.SphereGeometry(0.32 * s, 8, 6), gold, x, h * 0.45 + 3.0 * s, -78);
  });
  for (const sz of [-1, 1]) {
    for (let i = 0; i < 12; i++) box(group, 0.14, 1.0, 0.14, wood, 23 + i * 4, 1.5, -78 + sz * 3.4);
    box(group, 46, 0.12, 0.16, wood, 45, 2.0, -78 + sz * 3.4);
  }
  const pagoda = new THREE.Group();
  add(pagoda, new THREE.CylinderGeometry(7, 8, 2.2, 8), stoneDark, 0, 1.1, 0);
  for (let i = 0; i < 4; i++) {
    const w = 7.2 - i * 1.2;
    add(pagoda, new THREE.CylinderGeometry(w * 0.62, w * 0.7, 3.2 - i * 0.3, 8), white, 0, 3.5 + i * 2.4, 0);
  }
  add(pagoda, new THREE.SphereGeometry(3.1, 12, 8), white, 0, 13.4, 0);
  add(pagoda, new THREE.ConeGeometry(1.35, 3.4, 8), gold, 0, 16.5, 0);
  pagoda.position.set(105, 0.2, -112); group.add(pagoda);
  const garden = new THREE.Group();
  box(garden, 30, 1.0, 22, stone, 0, 0.5, 0);
  box(garden, 18, 5.2, 10, white, 0, 3.1, 0);
  roof(garden, 22, 14, 3.6, tile, 0, 6.4, 0);
  box(garden, 3.6, 2.4, 0.4, wood, 0, 1.6, 5.3);
  box(garden, 5.2, 0.6, 0.6, gold, 0, 3.0, 5.5);
  for (let i = 0; i < 4; i++) add(garden, new THREE.DodecahedronGeometry(1.4 + i * 0.3, 0), stoneDark, -8 + i * 5, 2.2, 10 + (i % 2) * 2);
  garden.position.set(150, 0.2, 10); group.add(garden);
  for (let i = 0; i < 18; i++) {
    add(group, new THREE.CylinderGeometry(0.14, 0.24, 6, 5), mat(0x5b432a), -150 + i * 12, 3, 150);
    add(group, new THREE.ConeGeometry(2.6, 7, 6), mat(0x6d8a4d), -150 + i * 12, 9, 150);
  }
  const boats = [];
  for (let i = 0; i < 4; i++) {
    const b = new THREE.Group();
    box(b, 5.4, 0.35, 1.8, mat(0x5b3e28), 0, 0.45, 0);
    box(b, 2.2, 0.35, 1.4, white, 0, 0.85, 0);
    b.position.set(10 + i * 28, 0.2, -30 + i * 8); group.add(b); boats.push(b);
  }
  for (let i = 0; i < 9; i++) {
    const p = new THREE.Group(); add(p, new THREE.CylinderGeometry(0.22, 0.34, 1.2, 7), mat(i % 2 ? 0x7d5a32 : 0x3e4c5c), 0, 0.95, 0); add(p, new THREE.SphereGeometry(0.22, 8, 6), mat(0xc79c78), 0, 1.7, 0); p.position.set(30 + (i % 5) * 9, 0, -66 + Math.floor(i / 5) * 6); group.add(p);
  }
  return { group: mergeStaticGroup(group), life: { update(time) { boats.forEach((b, i) => { b.position.y = 0.2 + Math.sin(time * 0.7 + i) * 0.04; }); } } };
}
