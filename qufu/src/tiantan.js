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
function roof(g, r, h, m, x, y, z, seg = 8) { add(g, new THREE.ConeGeometry(r, h, seg), m, x, y + h * 0.5, z); }
export function buildTiantanOverlay() {
  const group = new THREE.Group();
  const marble = mat(0xdad4c4, 0.88), marbleDark = mat(0xb8b19f, 0.92), blue = mat(0x2d5b8f, 0.55, 0.25), gold = mat(0xc49a45, 0.4, 0.4), red = mat(0x8f2f25), wood = mat(0x5b3e28), green = mat(0x3f5c3a);
  // 祈年殿
  const hall = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const w = 34 - i * 5;
    add(hall, new THREE.CylinderGeometry(w * 0.5, w * 0.56, 1.6, 8), marble, 0, 0.8 + i * 1.6, 0);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      add(hall, new THREE.CylinderGeometry(0.22, 0.28, 1.1, 6), marbleDark, Math.cos(a) * w * 0.43, 1.4 + i * 1.6, Math.sin(a) * w * 0.43);
    }
  }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    add(hall, new THREE.CylinderGeometry(0.28, 0.34, 8.5, 6), red, Math.cos(a) * 10.5, 8.0, Math.sin(a) * 10.5);
  }
  add(hall, new THREE.CylinderGeometry(10.2, 10.6, 8.4, 16), red, 0, 8.0, 0);
  for (let i = 0; i < 3; i++) {
    const r = 14.5 - i * 3.2;
    const y = 12.6 + i * 4.4;
    add(hall, new THREE.CylinderGeometry(r * 0.72, r, 2.0, 16), blue, 0, y, 0);
    roof(hall, r * 1.02, 6.2 - i * 1.1, blue, 0, y + 1.0, 0, 16);
    add(hall, new THREE.CylinderGeometry(r * 0.9, r * 0.92, 0.45, 16), gold, 0, y + 0.45, 0);
  }
  add(hall, new THREE.CylinderGeometry(0.35, 0.55, 5.2, 8), gold, 0, 29.5, 0);
  for (let i = 0; i < 3; i++) add(hall, new THREE.SphereGeometry(0.8 - i * 0.15, 8, 6), gold, 0, 30.5 + i * 0.9, 0);
  box(hall, 6.0, 2.0, 0.5, gold, 0, 9.0, 10.65);
  box(hall, 2.6, 1.2, 0.3, gold, 0, 7.0, 10.7);
  hall.position.set(-120, 0, -120); group.add(hall);
  for (let i = 0; i < 6; i++) box(group, 10 - i * 1.1, 0.55, 1.2, marble, -120, 0.3 + i * 0.5, -96 + i * 1.2);
  // 圜丘坛
  const altar = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const r = 26 - i * 5;
    add(altar, new THREE.CylinderGeometry(r, r + 1.2, 1.6, 28), marble, 0, 0.8 + i * 1.6, 0);
    for (let k = 0; k < 28; k++) {
      const a = (k / 28) * Math.PI * 2;
      add(altar, new THREE.CylinderGeometry(0.2, 0.25, 1.2, 5), marbleDark, Math.cos(a) * (r - 0.8), 1.5 + i * 1.6, Math.sin(a) * (r - 0.8));
    }
  }
  add(altar, new THREE.CylinderGeometry(1.8, 2.2, 0.4, 12), marbleDark, 0, 5.0, 0);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    box(altar, 3.2, 0.6, 8, marble, Math.cos(a) * 22, 0.3, Math.sin(a) * 22, -a);
  }
  altar.position.set(-200, 0, -40); group.add(altar);
  // 丹陛桥
  box(group, 12, 1.2, 74, marble, -160, 0.6, -80, -0.18);
  for (let i = 0; i < 10; i++) box(group, 12, 0.4, 1.2, marbleDark, -160, 1.25, -113 + i * 7.4, -0.18);
  // 红墙与门
  for (const [x, z, w, d] of [[-160, -180, 120, 5], [-160, 20, 120, 5], [-225, -80, 5, 205], [-95, -80, 5, 205]]) box(group, w, 6, d, red, x, 3, z);
  for (const [x, z] of [[-160, -178], [-160, 18], [-222, -80], [-98, -80]]) {
    box(group, 12, 8, 8, red, x, 4, z);
    roof(group, 8, 3, blue, x, 8, z, 4);
  }
  for (let i = 0; i < 18; i++) {
    const x = -220 + (i % 6) * 24, z = -160 + Math.floor(i / 6) * 90;
    add(group, new THREE.CylinderGeometry(0.35, 0.55, 9, 5), mat(0x5b432a), x, 4.5, z);
    add(group, new THREE.ConeGeometry(3.4, 10, 6), green, x, 13, z);
  }
  for (let i = 0; i < 8; i++) {
    const p = new THREE.Group(); add(p, new THREE.CylinderGeometry(0.22, 0.34, 1.2, 7), mat(i % 2 ? 0x7d5a32 : 0x3e4c5c), 0, 0.95, 0); add(p, new THREE.SphereGeometry(0.22, 8, 6), mat(0xc79c78), 0, 1.7, 0); p.position.set(-150 + (i % 4) * 8, 0, -88 + Math.floor(i / 4) * 9); group.add(p);
  }
  return mergeStaticGroup(group);
}
