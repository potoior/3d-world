import * as THREE from 'three';
import { makeWaterMaterial } from './materials.js';
import { mergeStaticGroup } from './geometry.js';

const R = (() => { let a = 19; return () => ((a = (a * 1664525 + 1013904223) >>> 0) / 4294967296); })();
const MAT = new Map();
function mat(color, rough = 0.94, metal = 0) {
  const k = color + ':' + rough + ':' + metal;
  if (!MAT.has(k)) MAT.set(k, new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal }));
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
function roof(g, w, d, h, m, x, y, z) {
  const geo = new THREE.ConeGeometry(Math.max(w, d) * 0.72, h, 4); geo.rotateY(Math.PI / 4); geo.scale(w / Math.max(w, d), 1, d / Math.max(w, d));
  add(g, geo, m, x, y + h * 0.5, z);
}
export function buildQiandaoScene() {
  const group = new THREE.Group();
  const base = new THREE.Group();
  const dynamic = new THREE.Group();
  group.add(dynamic);
  const stats = { islands: 34, trees: 360, boats: 7, egrets: 18, houses: 10, teaRows: 9 };
  const waterMaterial = makeWaterMaterial();
  waterMaterial.uniforms.uDeep.value.set(0x0c4f54);
  waterMaterial.uniforms.uShallow.value.set(0x3d9d86);
  waterMaterial.uniforms.uSky.value.set(0xb9d8d0);

  const ground = add(base, new THREE.PlaneGeometry(1200, 1000, 1, 1), mat(0x6f8a57, 1), 0, -1.2, -80);
  ground.rotation.x = -Math.PI / 2;

  const lakeGeo = new THREE.PlaneGeometry(760, 560, 64, 48); lakeGeo.rotateX(-Math.PI / 2);
  const lake = new THREE.Mesh(lakeGeo, waterMaterial); lake.position.set(0, 0.15, -60); lake.renderOrder = 1; base.add(lake);

  const islandMat = mat(0x71835a, 1), earth = mat(0x6d5d45, 1), grass = mat(0x66894d, 1);
  const islands = [
    [-230, 60, 34], [-150, -20, 26], [-90, -95, 44], [10, -140, 22], [90, -80, 30],
    [180, -150, 38], [255, -40, 26], [190, 50, 34], [95, 90, 20], [-25, 55, 18],
    [-285, -95, 24], [-200, -160, 20], [-10, -205, 28], [135, -205, 20], [300, 100, 22],
    [-320, 125, 18], [55, -25, 12], [145, 15, 14], [-120, 105, 16], [235, 135, 15],
    [-55, -40, 10], [65, -175, 12], [-255, -20, 14], [25, 130, 12], [320, -125, 18],
    [-360, 30, 16], [175, 100, 11], [-180, 130, 12], [115, -125, 9], [-5, -100, 8],
    [265, -205, 14], [-300, -180, 12], [45, 180, 10], [-95, 175, 8],
  ];
  const treeSpots = [];
  islands.forEach(([x, z, r], i) => {
    add(base, new THREE.CylinderGeometry(r * 1.02, r * 1.25, 3.2, 12), earth, x, -0.5, z, R() * 3);
    add(base, new THREE.CylinderGeometry(r, r * 1.03, 1.2, 12), grass, x, 1.15, z, R() * 3);
    if (i < 14) {
      const n = Math.max(5, Math.floor(r * 0.7));
      for (let k = 0; k < n; k++) {
        const a = R() * Math.PI * 2, rad = Math.sqrt(R()) * r * 0.78;
        treeSpots.push([x + Math.cos(a) * rad, z + Math.sin(a) * rad, 0.7 + R() * 0.7, i]);
      }
    }
  });
  const trunkGeo = new THREE.CylinderGeometry(0.22, 0.36, 4.2, 5);
  const crownGeo = new THREE.ConeGeometry(2.5, 8.8, 7);
  inst(base, trunkGeo, mat(0x5a432c), treeSpots.length, (d, i) => {
    const [x, z, s] = treeSpots[i]; d.position.set(x, 1.75 * s + 1.1, z); d.scale.setScalar(s);
  });
  inst(base, crownGeo, mat(0x3d673d, 1), treeSpots.length, (d, i) => {
    const [x, z, s] = treeSpots[i]; d.position.set(x, 6.1 * s + 1.1, z); d.scale.set(s, s * (0.85 + (i % 5) * 0.06), s);
  });
  inst(base, new THREE.IcosahedronGeometry(1.1, 0), mat(0x6b8a45, 1), 220, (d, i) => {
    const isl = islands[i % islands.length]; const a = R() * 6.283, rad = Math.sqrt(R()) * isl[2] * 0.85;
    d.position.set(isl[0] + Math.cos(a) * rad, 1.8, isl[1] + Math.sin(a) * rad); d.scale.set(0.8 + R(), 0.55 + R() * 0.4, 0.8 + R());
  });

  const main = [-90, -95, 44];
  add(base, new THREE.ConeGeometry(36, 30, 9), mat(0x5f7d4f, 1), main[0], 15.5, main[1], 0.4);
  add(base, new THREE.CylinderGeometry(6.5, 7.2, 1.0, 8), mat(0xb7ac95), main[0], 30.4, main[1]);
  const pav = new THREE.Group();
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2;
    add(pav, new THREE.CylinderGeometry(0.28, 0.34, 5.4, 6), mat(0x9b3b2e), Math.cos(a) * 4.2, 2.7, Math.sin(a) * 4.2);
  }
  roof(pav, 11, 11, 4.4, mat(0x384746), 0, 5.2, 0);
  add(pav, new THREE.ConeGeometry(0.6, 1.4, 6), mat(0xc29a50, 0.5), 0, 10.3, 0);
  pav.position.set(main[0], 30.8, main[1]); base.add(pav);
  for (let i = 0; i < 7; i++) box(base, 1.4, 0.5, 1.2, mat(0xb7ac95), main[0] + 12 - i * 1.5, 29.6 - i * 0.75, main[1] + 8 + i * 1.2);
  for (let i = 0; i < 6; i++) box(base, 0.14, 1.2, 0.14, mat(0x6b5338), main[0] - 8 + i * 3.2, 30.9, main[1] + 7.4);

  const tea = [-230, 60, 34];
  for (let i = 0; i < 9; i++) {
    const geo = new THREE.RingGeometry(9 + i * 3.4, 11.2 + i * 3.4, 26, 1, Math.PI * 0.08, Math.PI * 1.25);
    geo.rotateX(-Math.PI / 2);
    const ring = new THREE.Mesh(geo, mat(i % 2 ? 0x4f7d46 : 0x6e9a4d, 1)); ring.position.set(tea[0], 1.78 + i * 0.12, tea[1]); ring.receiveShadow = true; base.add(ring);
  }

  const town = [255, 70];
  for (let i = 0; i < 10; i++) {
    const x = town[0] + (i % 5) * 13, z = town[1] + Math.floor(i / 5) * 15;
    box(base, 9, 7, 8, mat(0xe4dccd), x, 4.1, z, (i % 2) * 0.04);
    roof(group, 11.5, 10.5, 2.6, mat(0x394846), x, 7.7, z);
    for (let k = 0; k < 3; k++) box(base, 1.2, 1.8, 0.2, mat(0x4a3828), x - 3 + k * 3, 4.6, z + 4.1);
    box(base, 0.18, 2.2, 0.18, mat(0x6b5338), x - 4, 9.2, z - 4);
  }
  box(base, 60, 0.8, 9, mat(0x9b8664), town[0] + 26, 0.9, town[1] - 3);
  for (let i = 0; i < 12; i++) box(base, 0.25, 1.4, 0.25, mat(0x6b5338), town[0] + 4 + i * 4.4, 1.7, town[1] - 7.1);

  const bridge = new THREE.Group();
  for (let i = 0; i < 9; i++) {
    const x = -18 + i * 4.5, y = 2.8 + Math.sin(i / 8 * Math.PI) * 4.2;
    box(bridge, 4.8, 0.7, 5.4, mat(0xb2a78f), x, y, 0);
    for (const sz of [-2.7, 2.7]) box(bridge, 0.16, 1.1, 0.16, mat(0x6b5338), x, y + 1.0, sz);
  }
  bridge.position.set(40, 0, 120); base.add(bridge);

  const boats = [];
  for (let i = 0; i < 7; i++) {
    const b = new THREE.Group();
    add(b, new THREE.BoxGeometry(9, 1.1, 3.4), mat(0x8b6a42), 0, 0.6, 0);
    add(b, new THREE.BoxGeometry(5.2, 1.2, 2.6), mat(0xe2d8c2), -0.6, 1.7, 0);
    box(b, 2.5, 0.25, 3.0, mat(0x3c4c4a), 1.2, 1.4, 0);
    b.position.set(-180 + i * 62, 0.35, 140 - (i % 3) * 45); b.rotation.y = R() * 6.28; group.add(b); boats.push(b);
  }

  const egretGeo = new THREE.BufferGeometry();
  egretGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, -1.5, 0.3, 0, 0, 0.12, 0.4, 0, 0, 0, 1.5, 0.3, 0, 0, 0.12, 0.4], 3));
  egretGeo.computeVertexNormals();
  const egrets = inst(dynamic, egretGeo, new THREE.MeshStandardMaterial({ color: 0xf4f0e4, side: THREE.DoubleSide, roughness: 0.8 }), 18, (d, i) => {
    d.position.set(-220 + R() * 500, 20 + R() * 24, -180 + R() * 300); d.scale.setScalar(0.7 + R() * 0.5);
  });

  const flags = [];
  for (let i = 0; i < 10; i++) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.8), new THREE.MeshStandardMaterial({ color: [0x2f5fa8, 0xd9c75a, 0xb63a30][i % 3], side: THREE.DoubleSide, roughness: 0.9 }));
    f.position.set(town[0] + 4 + i * 4.4, 4.4, town[1] - 7); group.add(f); flags.push(f);
  }
  group.add(mergeStaticGroup(base));
  const life = {
    update(time) {
      waterMaterial.uniforms.uTime.value = time;
      boats.forEach((b, i) => {
        b.position.x = -200 + ((time * 1.4 + i * 62) % 420); b.position.z = 120 - (i % 3) * 45 + Math.sin(time * 0.6 + i) * 3;
        b.position.y = 0.35 + Math.sin(time * 1.5 + i) * 0.08; b.rotation.y = Math.sin(time * 0.15 + i) * 0.3 + (i % 2 ? Math.PI : 0);
      });
      flags.forEach((f, i) => { f.rotation.y = Math.sin(time * 2.2 + i) * 0.2; });
      const dummy = new THREE.Object3D();
      for (let i = 0; i < 18; i++) {
        const a = time * 0.09 + i * 0.7;
        dummy.position.set(Math.cos(a) * (70 + i * 7), 24 + Math.sin(time * 0.5 + i) * 5, -40 + Math.sin(a) * (55 + i * 5));
        dummy.rotation.set(0, -a + Math.PI / 2, 0); dummy.scale.setScalar(0.9); dummy.updateMatrix(); egrets.setMatrixAt(i, dummy.matrix);
      }
      egrets.instanceMatrix.needsUpdate = true;
    },
  };
  return { group, waterMaterial, life, stats, lake: islands.map(([x, z]) => [x, z]) };
}
