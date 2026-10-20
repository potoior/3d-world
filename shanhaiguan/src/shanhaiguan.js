import * as THREE from 'three';
import { mergeStaticGroup } from './geometry.js';
const MAT = new Map();
function mat(color, rough = 0.92, metal = 0) {
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
export function buildShanhaiguanOverlay() {
  const group = new THREE.Group();
  const stone = mat(0x8b806c), dark = mat(0x4f4639), brick = mat(0x8f7b60), roofMat = mat(0x3d4747), red = mat(0x8e3429), gold = mat(0xb08a45, 0.5);
  const seaMat = new THREE.MeshStandardMaterial({ color: 0x3f7f8c, transparent: true, opacity: 0.82, roughness: 0.2, metalness: 0.15 });
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(520, 260, 1, 1), seaMat);
  sea.rotation.x = -Math.PI / 2; sea.position.set(80, 0.2, -205); group.add(sea);
  box(group, 520, 1.2, 10, mat(0xc8b58a), 80, 0.55, -76);
  for (let i = 0; i < 24; i++) box(group, 8.2, 3.4, 1.2, brick, 96, 1.7, -80 - i * 3.3);
  for (let i = 0; i < 24; i++) {
    box(group, 8.2, 1.1, 0.5, dark, 96, 3.5, -80 - i * 3.3);
    if (i % 3 === 0) box(group, 2.0, 1.0, 0.4, dark, 92.6, 3.5, -80 - i * 3.3);
  }
  const tower = new THREE.Group();
  box(tower, 22, 10, 14, brick, 0, 5, 0);
  for (let i = 0; i < 2; i++) {
    box(tower, 16 - i * 2, 3.2, 10 - i * 1.5, red, 0, 10 + i * 3.2, 0);
    roof(tower, 22 - i * 3, 17 - i * 2, 3.4, roofMat, 0, 12.8 + i * 3.2, 0);
  }
  box(tower, 8.0, 1.6, 0.4, gold, 0, 11.0, 7.1);
  box(tower, 3.0, 6.0, 0.5, dark, 0, 5.0, 7.2);
  tower.position.set(96, 0, -160); group.add(tower);
  for (let i = 0; i < 6; i++) box(group, 12 - i * 1.4, 0.4, 1.2, stone, 96, 0.4 + i * 0.55, -150 + i * 1.2);
  const flags = [];
  for (let i = 0; i < 12; i++) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.4), new THREE.MeshStandardMaterial({ color: [0xb63a30, 0xd9c75a, 0x2f5fa8][i % 3], side: THREE.DoubleSide, roughness: 0.9 }));
    f.position.set(82 + i * 2.4, 6.0, -150); group.add(f); flags.push(f);
  }
  const gulls = [];
  for (let i = 0; i < 10; i++) {
    const g = new THREE.Group();
    box(g, 1.4, 0.08, 0.1, mat(0xf0ede4), 0, 0, 0);
    box(g, 0.8, 0.08, 0.1, mat(0xf0ede4), -0.7, 0.1, 0.1);
    g.position.set(20 + i * 15, 14 + (i % 4) * 3, -120 - (i % 5) * 8); group.add(g); gulls.push(g);
  }
  for (let i = 0; i < 3; i++) {
    const b = new THREE.Group(); box(b, 6, 0.5, 2, mat(0x5b3e28), 0, 0.7, 0); box(b, 2.6, 0.5, 1.5, mat(0xe0d8c5), 0, 1.1, 0); b.position.set(50 + i * 18, 0.4, -100 - i * 12); group.add(b);
  }
  const life = {
    update(time) {
      sea.position.z = -205 + Math.sin(time * 0.1) * 1.2;
      flags.forEach((f, i) => { f.rotation.y = Math.sin(time * 2.2 + i) * 0.18; });
      gulls.forEach((g, i) => { g.position.x += Math.sin(time * 0.4 + i) * 0.02; g.position.y = 14 + (i % 4) * 3 + Math.sin(time * 0.8 + i) * 1.2; });
    },
  };
  return { group: mergeStaticGroup(group), life };
}
