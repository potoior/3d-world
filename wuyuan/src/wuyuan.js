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
function inst(g, geo, m, count, place, colors = null) {
  const im = new THREE.InstancedMesh(geo, m, count); const d = new THREE.Object3D();
  for (let i = 0; i < count; i++) { place(d, i); d.updateMatrix(); im.setMatrixAt(i, d.matrix); if (colors) im.setColorAt(i, colors[i % colors.length]); }
  im.instanceMatrix.needsUpdate = true; if (colors) im.instanceColor.needsUpdate = true; im.castShadow = true; im.receiveShadow = true; g.add(im); return im;
}
export function buildWuyuanOverlay() {
  const group = new THREE.Group();
  const stone = mat(0xb7ae98), stoneDark = mat(0x847a67), white = mat(0xe6dfd0), tile = mat(0x3e4a48), wood = mat(0x5b3e28), gold = mat(0xc49a45, 0.6), green = mat(0x5f7d42);
  const rapeseedMat = mat(0xe6c33f, 0.86);
  inst(group, new THREE.IcosahedronGeometry(0.45, 0), rapeseedMat, 1200, (d, i) => {
    const x = -190 + (i % 40) * 5.2;
    const z = 45 + Math.floor(i / 40) * 4.4;
    d.position.set(x, 0.45 + (i % 3) * 0.12, z);
    d.scale.set(0.8 + (i % 4) * 0.1, 0.8 + (i % 3) * 0.1, 0.8);
  });
  for (let i = 0; i < 5; i++) {
    const x = 8 + i * 13;
    box(group, 12, 4.6, 9, white, x, 2.3, -42);
    roof(group, 15, 12, 2.4, tile, x, 5.8, -42);
    for (let k = 0; k < 4; k++) {
      box(group, 0.16, 2.4, 0.16, wood, x - 4 + k * 2.7, 7.2, -37.5);
      box(group, 0.16, 2.4, 0.16, wood, x - 4 + k * 2.7, 7.2, -46.5);
    }
    box(group, 10, 0.18, 0.18, wood, x, 8.4, -37.5);
    box(group, 10, 0.18, 0.18, wood, x, 8.4, -46.5);
    for (let k = 0; k < 3; k++) {
      const c = [0xb63a30, 0xd9a63a, 0xddb24a][k];
      box(group, 3.0, 0.6, 1.2, mat(c), x - 3 + k * 3, 7.0, -37.3);
    }
  }
  const bridge = new THREE.Group();
  box(bridge, 48, 1.0, 5.0, stone, 0, 0.6, 0);
  for (let i = 0; i < 5; i++) box(bridge, 4.2, 2.2, 4.2, stoneDark, -20 + i * 10, -0.4, 0);
  for (let i = 0; i < 9; i++) {
    for (const sz of [-1, 1]) box(bridge, 0.28, 3.4, 0.28, wood, -20 + i * 5, 2.8, sz * 2.2);
    box(bridge, 5, 0.25, 4.8, tile, -20 + i * 5, 4.6, 0);
    box(bridge, 0.18, 0.8, 0.18, wood, -20 + i * 5, 5.1, 2.2);
  }
  for (const sz of [-1, 1]) box(bridge, 48, 0.16, 0.16, wood, 0, 4.2, sz * 2.2);
  bridge.position.set(30, 0.3, -92); group.add(bridge);
  for (let i = 0; i < 8; i++) {
    const x = 70 + (i % 4) * 12;
    const z = 60 + Math.floor(i / 4) * 14;
    add(group, new THREE.CylinderGeometry(0.35, 0.55, 8, 5), mat(0x5b432a), x, 4, z);
    add(group, new THREE.ConeGeometry(4.0, 9, 7), green, x, 12, z);
  }
  for (let i = 0; i < 6; i++) {
    const x = -150 + (i % 3) * 16;
    const z = 90 + Math.floor(i / 3) * 18;
    box(group, 8, 0.18, 6, wood, x, 0.6, z);
    box(group, 0.18, 1.2, 0.18, wood, x - 3, 1.2, z - 2);
    box(group, 0.18, 1.2, 0.18, wood, x + 3, 1.2, z - 2);
  }
  for (let i = 0; i < 8; i++) {
    const p = new THREE.Group(); add(p, new THREE.CylinderGeometry(0.22, 0.34, 1.2, 7), mat(i % 2 ? 0x7d5a32 : 0x3e4c5c), 0, 0.95, 0); add(p, new THREE.SphereGeometry(0.22, 8, 6), mat(0xc79c78), 0, 1.7, 0); p.position.set(-20 + (i % 4) * 12, 0, 20 + Math.floor(i / 4) * 8); group.add(p);
  }
  const flags = [];
  for (let i = 0; i < 10; i++) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.4), new THREE.MeshStandardMaterial({ color: [0xb63a30, 0xd9c75a, 0x2f5fa8][i % 3], side: THREE.DoubleSide, roughness: 0.9 }));
    f.position.set(70 + i * 3, 5.2, 58); group.add(f); flags.push(f);
  }
  const life = { update(time) { flags.forEach((f, i) => { f.rotation.y = Math.sin(time * 2 + i) * 0.18; }); } };
  return { group: mergeStaticGroup(group), life };
}
