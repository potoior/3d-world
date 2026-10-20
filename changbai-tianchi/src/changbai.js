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
function box(g, w, h, d, m, x, y, z, ry = 0) { return add(g, new THREE.BoxGeometry(w, h, d), m, x, y, z, ry); }
function instanced(g, geo, m, count, place, colors = null) {
  const im = new THREE.InstancedMesh(geo, m, count);
  const d = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    place(d, i);
    d.updateMatrix();
    im.setMatrixAt(i, d.matrix);
    if (colors) im.setColorAt(i, colors[i % colors.length]);
  }
  im.instanceMatrix.needsUpdate = true;
  if (colors) im.instanceColor.needsUpdate = true;
  im.castShadow = true;
  im.receiveShadow = true;
  g.add(im);
  return im;
}
function fallTexture() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(220,242,245,0.25)';
  g.fillRect(0, 0, 64, 256);
  for (let i = 0; i < 90; i++) {
    const x = Math.random() * 64;
    const w = 1 + Math.random() * 4;
    g.fillStyle = 'rgba(255,255,255,' + (0.18 + Math.random() * 0.45) + ')';
    g.fillRect(x, Math.random() * 256, w, 20 + Math.random() * 90);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1, 2.6);
  return t;
}
function deer(g, x, z, scale, m) {
  const p = new THREE.Group();
  box(p, 1.5, 0.8, 0.7, m, 0, 1.15, 0);
  box(p, 0.55, 0.95, 0.45, m, 0, 1.75, 0.65);
  box(p, 0.42, 0.45, 0.52, mat(0x6d4f34), 0, 1.95, 1.0);
  box(p, 0.16, 0.6, 0.16, m, 0, 2.35, 0.76);
  for (const sx of [-0.3, 0.3]) {
    box(p, 0.12, 0.85, 0.12, m, sx, 2.55, 0.76);
    box(p, 0.1, 0.4, 0.1, mat(0x8b6b45), sx * 1.3, 2.9, 0.76);
  }
  for (const sx of [-0.52, 0.52]) for (const sz of [-0.28, 0.3]) box(p, 0.13, 1.0, 0.13, m, sx, 0.5, sz);
  p.position.set(x, 0, z);
  p.rotation.y = Math.random() * Math.PI;
  p.scale.setScalar(scale);
  g.add(p);
  return p;
}
export function buildChangbaiOverlay() {
  const group = new THREE.Group();
  const rock = mat(0x666a63, 0.99);
  const rockDark = mat(0x444a46, 0.99);
  const snow = mat(0xe7edf0, 0.75);
  const birch = mat(0xd8d4c7, 0.9);
  const leaf = mat(0x687c49, 0.95);
  const deerMat = mat(0x8a6a48, 0.95);

  box(group, 170, 12, 60, rockDark, 10, 5.5, 196);
  for (let i = 0; i < 16; i++) {
    const h = 42 + (i % 4) * 9;
    const x = -75 + i * 11;
    add(group, new THREE.ConeGeometry(16 + (i % 3) * 4, h, 6), rock, x, h * 0.5, 195 + (i % 2) * 8);
    add(group, new THREE.ConeGeometry(5.5, h * 0.2, 6), snow, x, h * 0.9, 195 + (i % 2) * 8);
  }
  box(group, 26, 3, 22, rock, 26, 1.5, 158);
  for (let i = 0; i < 7; i++) box(group, 17 - i * 1.8, 1.0, 3.2, rockDark, 26, 0.6 + i * 0.5, 168 + i * 2.6);

  const tex = fallTexture();
  const fallMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.92, depthWrite: false, side: THREE.DoubleSide });
  const fall = new THREE.Mesh(new THREE.PlaneGeometry(24, 62), fallMat);
  fall.position.set(26, 34, 186);
  group.add(fall);
  const fall2 = new THREE.Mesh(new THREE.PlaneGeometry(9, 45), fallMat.clone());
  fall2.position.set(-16, 24, 188);
  fall2.material.opacity = 0.7;
  group.add(fall2);
  const pool = new THREE.Mesh(new THREE.CircleGeometry(22, 28), new THREE.MeshStandardMaterial({ color: 0x7db4b5, transparent: true, opacity: 0.72, roughness: 0.2, metalness: 0.1 }));
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(26, 0.52, 162);
  group.add(pool);

  const springMat = new THREE.MeshStandardMaterial({ color: 0x79b8b0, transparent: true, opacity: 0.8, roughness: 0.2 });
  for (const [x, z, r] of [[-88, -108, 6], [-74, -118, 4.5], [-102, -122, 3.6]]) {
    const p = new THREE.Mesh(new THREE.CircleGeometry(r, 18), springMat);
    p.rotation.x = -Math.PI / 2;
    p.position.set(x, 0.5, z);
    group.add(p);
    add(group, new THREE.TorusGeometry(r * 0.86, 0.35, 6, 18), rockDark, x, 0.3, z).rotation.x = Math.PI / 2;
  }

  box(group, 210, 0.2, 0.16, mat(0x6b4f32), 2, 1.05, -152);
  instanced(group, new THREE.CylinderGeometry(0.1, 0.12, 1.0, 6), mat(0x5a432c), 44, (d, i) => {
    d.position.set(-100 + i * 4.7, 0.6, -152);
  });

  const spots = [];
  for (let i = 0; i < 26; i++) spots.push([-180 + Math.random() * 90, -40 + Math.random() * 120, 0.8 + Math.random() * 0.8]);
  for (let i = 0; i < 18; i++) spots.push([110 + Math.random() * 80, -80 + Math.random() * 100, 0.7 + Math.random() * 0.7]);
  instanced(group, new THREE.CylinderGeometry(0.2, 0.32, 7, 6), birch, spots.length, (d, i) => {
    const [x, z, s] = spots[i];
    d.position.set(x, 3.5 * s, z);
    d.scale.setScalar(s);
  });
  instanced(group, new THREE.ConeGeometry(2.1, 6.5, 6), leaf, spots.length, (d, i) => {
    const [x, z, s] = spots[i];
    d.position.set(x, 7.2 * s, z);
    d.scale.setScalar(s);
  });

  const deerGroup = [];
  for (let i = 0; i < 4; i++) deerGroup.push(deer(group, -140 + i * 26, 40 + (i % 2) * 18, 0.9 + (i % 2) * 0.15, deerMat));

  const steamGeo = new THREE.BufferGeometry();
  const steamPos = new Float32Array(150 * 3);
  for (let i = 0; i < 150; i++) {
    steamPos[i * 3] = -88 + (Math.random() - 0.5) * 26;
    steamPos[i * 3 + 1] = Math.random() * 16;
    steamPos[i * 3 + 2] = -114 + (Math.random() - 0.5) * 22;
  }
  steamGeo.setAttribute('position', new THREE.BufferAttribute(steamPos, 3));
  const steam = new THREE.Points(steamGeo, new THREE.PointsMaterial({ color: 0xe8f0ec, size: 1.5, transparent: true, opacity: 0.28, depthWrite: false }));
  group.add(steam);

  const sprayGeo = new THREE.BufferGeometry();
  const sprayPos = new Float32Array(120 * 3);
  for (let i = 0; i < 120; i++) {
    sprayPos[i * 3] = 26 + (Math.random() - 0.5) * 24;
    sprayPos[i * 3 + 1] = Math.random() * 5;
    sprayPos[i * 3 + 2] = 163 + (Math.random() - 0.5) * 12;
  }
  sprayGeo.setAttribute('position', new THREE.BufferAttribute(sprayPos, 3));
  const spray = new THREE.Points(sprayGeo, new THREE.PointsMaterial({ color: 0xe6f5f4, size: 1.0, transparent: true, opacity: 0.5, depthWrite: false }));
  group.add(spray);

  const life = {
    update(time, dt) {
      tex.offset.y = -time * 0.35;
      fall2.material.map.offset.y = -time * 0.48;
      const sp = steam.geometry.attributes.position;
      for (let i = 0; i < sp.count; i++) {
        let y = sp.getY(i) + dt * (1.1 + (i % 5) * 0.12);
        if (y > 17) y = 0;
        sp.setY(i, y);
      }
      sp.needsUpdate = true;
      const pp = spray.geometry.attributes.position;
      for (let i = 0; i < pp.count; i++) {
        let y = pp.getY(i) + dt * (1.8 + (i % 3) * 0.2);
        if (y > 6) y = 0;
        pp.setY(i, y);
      }
      pp.needsUpdate = true;
      deerGroup.forEach((d, i) => { d.position.y = Math.sin(time * 0.8 + i) * 0.02; });
    },
  };
  return { group: mergeStaticGroup(group), life, stats: { waterfall: 2, steam: 150, deer: 4 } };
}
