import * as THREE from 'three';
import { mergeStaticGroup } from './geometry.js';

const MAT = new Map();
function mat(color, rough = 0.96) {
  const k = color + ':' + rough;
  if (!MAT.has(k)) MAT.set(k, new THREE.MeshStandardMaterial({ color, roughness: rough }));
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
function cyl(g, rt, rb, h, seg, m, x, y, z, rz = 0) { return add(g, new THREE.CylinderGeometry(rt, rb, h, seg), m, x, y, z, 0).rotation.z = rz; }
function inst(g, geo, m, count, place) {
  const im = new THREE.InstancedMesh(geo, m, count);
  const d = new THREE.Object3D();
  for (let i = 0; i < count; i++) { place(d, i); d.updateMatrix(); im.setMatrixAt(i, d.matrix); }
  im.instanceMatrix.needsUpdate = true;
  im.castShadow = true; im.receiveShadow = true; g.add(im); return im;
}
function buddha(g, x, z, s) {
  const stone = mat(0x9c8064), dark = mat(0x7c624d), robe = mat(0x8b7057);
  box(g, 26 * s, 5 * s, 18 * s, dark, x, 4 * s, z);
  add(g, new THREE.CylinderGeometry(13 * s, 15 * s, 3 * s, 18), mat(0x8a6f56), x, 6.5 * s, z);
  box(g, 18 * s, 13 * s, 12 * s, robe, x, 13 * s, z);
  box(g, 22 * s, 8 * s, 14 * s, stone, x, 9 * s, z + 1 * s);
  add(g, new THREE.SphereGeometry(7.2 * s, 20, 14), stone, x, 28 * s, z);
  box(g, 3.2 * s, 5.5 * s, 2.2 * s, stone, x, 24.6 * s, z + 7 * s);
  box(g, 1.8 * s, 2.2 * s, 1.4 * s, dark, x, 25.2 * s, z + 8.2 * s);
  for (const sx of [-1, 1]) {
    box(g, 1.4 * s, 5.8 * s, 1.2 * s, dark, x + sx * 7.6 * s, 27.5 * s, z + 0.6 * s);
    box(g, 5.6 * s, 2.0 * s, 2.0 * s, stone, x + sx * 5.8 * s, 21.5 * s, z + 4.6 * s);
    box(g, 3.0 * s, 1.5 * s, 4.5 * s, stone, x + sx * 4.2 * s, 19.5 * s, z + 7.2 * s);
  }
  add(g, new THREE.TorusGeometry(7.0 * s, 0.55 * s, 6, 22, Math.PI), mat(0xaa8d6a), x, 28 * s, z - 3.8 * s).rotation.x = Math.PI / 2;
  for (let i = 0; i < 7; i++) {
    for (let j = 0; j < 9; j++) {
      const a = (j / 9) * Math.PI * 2;
      const h = i * 0.55 - 2;
      add(g, new THREE.SphereGeometry(0.55 * s, 6, 5), dark, x + Math.cos(a) * 6.2 * s, 32 * s + h * s, z + Math.sin(a) * 3.2 * s);
    }
  }
  for (let i = 0; i < 7; i++) box(g, 11 * s - i * 0.7 * s, 0.65 * s, 0.7 * s, dark, x, 13 * s + i * 1.25 * s, z + 6.1 * s);
  box(g, 3.4 * s, 2.4 * s, 0.9 * s, mat(0xb18d5c), x, 18.5 * s, z + 7.4 * s);
}
export function buildLeshanOverlay() {
  const group = new THREE.Group();
  const rock = mat(0x8c6b52, 0.99), rockDark = mat(0x674c3a, 0.99);
  box(group, 100, 96, 60, rockDark, 200, 40, -25);
  for (let i = 0; i < 9; i++) box(group, 96 - i * 3, 1.4, 2.2, rock, 200, 8 + i * 9, 6 + i * 0.6);
  buddha(group, 188, 18, 1.0);
  inst(group, new THREE.BoxGeometry(5.4, 0.35, 1.6), mat(0x8d8064), 46, (d, i) => {
    const t = i / 45;
    d.position.set(158 + t * 30, 3 + t * 48, 34 - t * 20);
    d.rotation.y = -0.5;
  });
  for (let i = 0; i < 22; i++) {
    const t = i / 21;
    box(group, 0.18, 1.6, 0.18, mat(0x5e4a38), 155 + t * 32, 4 + t * 49, 36 - t * 20, -0.5);
  }
  const temple = new THREE.Group();
  box(temple, 28, 1.2, 20, rockDark, 0, 0.6, 0);
  box(temple, 18, 6, 12, mat(0x7e3027), 0, 4.2, 0);
  const roof = new THREE.ConeGeometry(13, 4.2, 4); roof.rotateY(Math.PI / 4); add(temple, roof, mat(0x3d4747), 0, 9, 0);
  box(temple, 3.2, 1.0, 0.4, mat(0xb08a45), 0, 5.2, 6.2);
  temple.position.set(128, 68, -50); group.add(temple);
  const pagoda = new THREE.Group();
  for (let i = 0; i < 7; i++) {
    const w = 7 - i * 0.7;
    box(pagoda, w, 3.2, w, mat(0xd6cdbb), 0, 2 + i * 3.1, 0);
    const e = new THREE.ConeGeometry(w * 0.8, 1.1, 4); e.rotateY(Math.PI / 4); add(pagoda, e, mat(0x3d4747), 0, 4.1 + i * 3.1, 0);
  }
  pagoda.position.set(108, 70, -20); group.add(pagoda);
  const boat = new THREE.Group();
  box(boat, 7, 0.5, 2.4, mat(0x5b3e28), 0, 0.7, 0);
  box(boat, 3.0, 0.5, 1.8, mat(0xd8d1bd), 0, 1.1, 0);
  add(boat, new THREE.CylinderGeometry(0.05, 0.9, 1.4, 8, 1, true), mat(0x5b3e28), 0, 0.55, 0).rotation.z = Math.PI;
  boat.position.set(70, 0.3, 30); group.add(boat);
  for (let i = 0; i < 9; i++) {
    const p = new THREE.Group();
    add(p, new THREE.CylinderGeometry(0.22, 0.34, 1.2, 7), mat(i % 2 ? 0x2f5168 : 0x8c3b2e), 0, 0.95, 0);
    add(p, new THREE.SphereGeometry(0.22, 8, 6), mat(0xc79c78), 0, 1.7, 0);
    p.position.set(145 + (i % 4) * 5, 0, 28 + Math.floor(i / 4) * 7); group.add(p);
  }
  for (let i = 0; i < 4; i++) {
    add(group, new THREE.CylinderGeometry(0.06, 0.08, 2.0, 5), mat(0x5b3e28), 135 + i * 4, 1.1, 52);
  }
  const flags = [];
  for (let i = 0; i < 18; i++) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.5), new THREE.MeshStandardMaterial({ color: [0xb63a30, 0xd9c75a, 0x2f5fa8][i % 3], side: THREE.DoubleSide, roughness: 0.9 }));
    f.position.set(132 + i * 1.5, 4.2, 50); group.add(f); flags.push(f);
  }
  const life = {
    update(time) {
      boat.position.y = 0.3 + Math.sin(time * 0.8) * 0.06;
      boat.rotation.z = Math.sin(time * 0.6) * 0.02;
      flags.forEach((f, i) => { f.rotation.y = Math.sin(time * 2 + i) * 0.18; });
    },
  };
  return { group: mergeStaticGroup(group), life };
}
