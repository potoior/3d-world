import * as THREE from 'three';
import { mergeStaticGroup } from './geometry.js';

const MAT = new Map();
function mat(color, rough = 0.96) {
  const k = color + ':' + rough;
  if (!MAT.has(k)) MAT.set(k, new THREE.MeshStandardMaterial({ color, roughness: rough }));
  return MAT.get(k);
}
function add(g, geo, m, x, y, z, ry = 0) {
  const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.y = ry; o.castShadow = true; o.receiveShadow = true; g.add(o); return o;
}
function box(g, w, h, d, m, x, y, z, ry = 0) { return add(g, new THREE.BoxGeometry(w, h, d), m, x, y, z, ry); }
function inst(g, geo, m, count, place) {
  const im = new THREE.InstancedMesh(geo, m, count); const d = new THREE.Object3D();
  for (let i = 0; i < count; i++) { place(d, i); d.updateMatrix(); im.setMatrixAt(i, d.matrix); }
  im.instanceMatrix.needsUpdate = true; im.castShadow = true; im.receiveShadow = true; g.add(im); return im;
}
function buddha(g, x, z, s, stone, dark) {
  box(g, 9 * s, 2 * s, 7 * s, dark, x, 2 * s, z);
  add(g, new THREE.CylinderGeometry(4.5 * s, 5.2 * s, 1.2 * s, 12), stone, x, 3.1 * s, z);
  box(g, 6.2 * s, 5.0 * s, 4.2 * s, stone, x, 6.2 * s, z);
  add(g, new THREE.SphereGeometry(2.5 * s, 14, 10), stone, x, 12 * s, z);
  for (const sx of [-1, 1]) {
    box(g, 0.65 * s, 3.0 * s, 0.6 * s, dark, x + sx * 3.5 * s, 10.8 * s, z);
    box(g, 2.0 * s, 0.8 * s, 1.2 * s, stone, x + sx * 2.6 * s, 7.8 * s, z + 2.0 * s);
  }
  box(g, 1.3 * s, 1.6 * s, 0.6 * s, dark, x, 11.8 * s, z + 2.3 * s);
  for (let i = 0; i < 4; i++) box(g, 4.8 * s - i * 0.4 * s, 0.4 * s, 0.4 * s, dark, x, 6 * s + i * 0.8 * s, z + 2.5 * s);
}
export function buildLongmenOverlay() {
  const group = new THREE.Group();
  const rock = mat(0x8d725b, 0.99), rockDark = mat(0x67513f, 0.99), stone = mat(0xa38669), warm = mat(0x9b6b47);
  box(group, 40, 52, 260, rockDark, 205, 22, 0);
  box(group, 40, 48, 240, rockDark, -200, 20, 20);
  for (let i = 0; i < 9; i++) box(group, 2.0, 1.0, 240, rock, 182, 4 + i * 5.6, 0);
  const caves = [];
  for (let i = 0; i < 26; i++) {
    const z = -105 + i * 8.2;
    caves.push({ x: 184, y: 8 + (i % 4) * 8, z, s: 0.7 + (i % 3) * 0.2 });
  }
  inst(group, new THREE.BoxGeometry(1.2, 7, 5.2), mat(0x2c241d), caves.length, (d, i) => {
    const c = caves[i]; d.position.set(c.x, c.y, c.z); d.scale.setScalar(c.s);
  });
  inst(group, new THREE.SphereGeometry(1.5, 8, 6), warm, caves.length, (d, i) => {
    const c = caves[i]; d.position.set(c.x - 1.3, c.y - 0.8, c.z); d.scale.set(c.s, c.s * 1.2, c.s);
  });
  buddha(group, 168, 0, 1.9, stone, rockDark);
  buddha(group, 172, -20, 0.9, stone, rockDark);
  buddha(group, 172, 20, 0.9, stone, rockDark);
  box(group, 42, 2.0, 52, rockDark, 168, 2, 0);
  for (let i = 0; i < 7; i++) box(group, 3.8 - i * 0.35, 0.25, 1.1, stone, 168, 0.5 + i * 0.3, 28 + i * 0.8);
  for (let i = 0; i < 9; i++) box(group, 0.2, 1.2, 0.2, mat(0x5b4634), 148 + i * 2.4, 1.2, 26);
  const stele = new THREE.Group();
  box(stele, 2.2, 5.5, 0.6, rockDark, 0, 2.8, 0);
  box(stele, 1.5, 0.7, 0.12, mat(0xc9b27f), 0, 4.2, 0.38);
  stele.position.set(140, 0, 36); group.add(stele);
  for (let i = 0; i < 10; i++) {
    const p = new THREE.Group();
    add(p, new THREE.CylinderGeometry(0.22, 0.34, 1.2, 7), mat(i % 2 ? 0x7d5a32 : 0x3e4c5c), 0, 0.95, 0);
    add(p, new THREE.SphereGeometry(0.22, 8, 6), mat(0xc79c78), 0, 1.7, 0);
    p.position.set(138 + (i % 5) * 5, 0, 20 + Math.floor(i / 5) * 8); group.add(p);
  }
  const pines = [];
  for (let i = 0; i < 14; i++) pines.push([-160 + i * 6, 50 + (i % 3) * 8]);
  inst(group, new THREE.CylinderGeometry(0.16, 0.26, 3.4, 5), mat(0x5b432a), pines.length, (d, i) => {
    d.position.set(pines[i][0], 1.7, pines[i][1]);
  });
  inst(group, new THREE.ConeGeometry(2.4, 5.5, 6), mat(0x435c3b), pines.length, (d, i) => {
    d.position.set(pines[i][0], 5.5, pines[i][1]);
  });
  const smokeMat = new THREE.MeshBasicMaterial({ color: 0xe8e2d2, transparent: true, opacity: 0.14, depthWrite: false, side: THREE.DoubleSide });
  const smokes = [];
  for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(4, 10), smokeMat.clone());
    m.position.set(150 + i * 8, 9 + i, 30); group.add(m); smokes.push(m);
  }
  const life = {
    update(time) {
      smokes.forEach((m, i) => {
        m.position.y = 7 + ((time * 0.35 + i * 2) % 12);
        m.position.x = 150 + i * 8 + Math.sin(time * 0.3 + i) * 2;
        m.material.opacity = 0.06 + 0.08 * Math.sin((time * 0.4 + i) % 3);
      });
    },
  };
  return { group: mergeStaticGroup(group), life };
}
