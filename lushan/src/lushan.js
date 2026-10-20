import * as THREE from 'three';
import { mergeStaticGroup } from './geometry.js';

const MAT = new Map();
function mat(color, rough = 0.95, metal = 0) {
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
function fallTexture() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(232,246,248,0.3)';
  g.fillRect(0, 0, 64, 256);
  for (let i = 0; i < 80; i++) {
    g.fillStyle = 'rgba(255,255,255,' + (0.2 + Math.random() * 0.45) + ')';
    g.fillRect(Math.random() * 64, Math.random() * 256, 1 + Math.random() * 3, 16 + Math.random() * 70);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1, 3);
  return t;
}
export function buildLushanOverlay() {
  const group = new THREE.Group();
  const rock = mat(0x70766e, 0.98);
  const rockDark = mat(0x4f554f, 0.98);
  const water = new THREE.MeshStandardMaterial({ color: 0x6fa7a2, transparent: true, opacity: 0.7, roughness: 0.2, metalness: 0.1 });
  const tile = mat(0x424f4d, 0.9);
  const wood = mat(0x5b3e28, 0.92);
  const gold = mat(0xb08a45, 0.5, 0.3);
  const tex = fallTexture();
  const fallMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.92, depthWrite: false, side: THREE.DoubleSide });
  const falls = [];
  for (const [x, z, w, h, y] of [[136, 38, 16, 105, 58], [132, 34, 8, 82, 47], [140, 42, 6, 66, 39]]) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(w, h), fallMat.clone());
    f.position.set(x, y, z);
    f.rotation.y = -0.25;
    group.add(f);
    falls.push(f);
  }
  const pool = new THREE.Mesh(new THREE.CircleGeometry(17, 26), water);
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(138, 4.4, 44);
  group.add(pool);
  for (let i = 0; i < 16; i++) {
    const g = new THREE.DodecahedronGeometry(1.6 + (i % 4) * 0.8, 0);
    g.scale(1.5, 0.7, 1.1);
    add(group, g, i % 3 ? rock : rockDark, 122 + (i % 8) * 4.5, 5.2, 32 + Math.floor(i / 8) * 12);
  }
  const pav = new THREE.Group();
  add(pav, new THREE.BoxGeometry(9, 0.8, 7), rockDark, 0, 0.4, 0);
  for (const [x, z] of [[-3, -2.6], [3, -2.6], [-3, 2.6], [3, 2.6]]) add(pav, new THREE.CylinderGeometry(0.25, 0.3, 4.2, 6), wood, x, 2.5, z);
  const roof = new THREE.ConeGeometry(6.4, 2.6, 4);
  roof.rotateY(Math.PI / 4);
  add(pav, roof, tile, 0, 5.8, 0);
  add(pav, new THREE.BoxGeometry(2.6, 0.8, 0.3), gold, 0, 4.1, 3.0);
  pav.position.set(109, 5.1, 54);
  group.add(pav);
  add(group, new THREE.BoxGeometry(2.4, 6.2, 1.2), rockDark, 151, 9, 18);
  add(group, new THREE.BoxGeometry(1.7, 1.0, 0.2), gold, 151, 11.2, 18.7);
  const mistMat = new THREE.MeshBasicMaterial({ color: 0xe8f2f2, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide });
  const mists = [];
  for (let i = 0; i < 5; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(34 + i * 7, 9 + i * 2), mistMat.clone());
    m.position.set(138 + (i - 2) * 7, 8 + i * 4, 50 + i * 3);
    m.rotation.y = -0.25;
    group.add(m);
    mists.push(m);
  }
  const life = {
    update(time) {
      tex.offset.y = -time * 0.4;
      falls[1].material.map.offset.y = -time * 0.55;
      falls[2].material.map.offset.y = -time * 0.7;
      mists.forEach((m, i) => {
        m.position.x = 138 + Math.sin(time * 0.12 + i) * 8 + (i - 2) * 7;
        m.material.opacity = 0.12 + 0.07 * (0.5 + 0.5 * Math.sin(time * 0.22 + i));
      });
    },
  };
  return { group: mergeStaticGroup(group), life };
}
