import * as THREE from 'three';
import { mergeStaticGroup } from './geometry.js';

const MAT_CACHE = new Map();
function mat(color, rough = 0.95, metal = 0) {
  const key = color + ':' + rough + ':' + metal;
  if (!MAT_CACHE.has(key)) MAT_CACHE.set(key, new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal }));
  return MAT_CACHE.get(key);
}

function add(group, geo, material, x, y, z, ry = 0) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.rotation.y = ry;
  m.castShadow = true;
  m.receiveShadow = true;
  group.add(m);
  return m;
}

function box(group, w, h, d, material, x, y, z, ry = 0) {
  return add(group, new THREE.BoxGeometry(w, h, d), material, x, y, z, ry);
}

function instanced(group, geo, material, count, place, colors = null) {
  const im = new THREE.InstancedMesh(geo, material, count);
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
  group.add(im);
  return im;
}

function roof(group, w, d, h, material, x, y, z) {
  const g = new THREE.ConeGeometry(Math.max(w, d) * 0.74, h, 4);
  g.rotateY(Math.PI / 4);
  g.scale(w / Math.max(w, d), 1, d / Math.max(w, d));
  add(group, g, material, x, y + h * 0.5, z);
}

function person(group, x, z, color, scale = 1) {
  const g = new THREE.Group();
  add(g, new THREE.CylinderGeometry(0.22 * scale, 0.34 * scale, 1.15 * scale, 7), mat(color), 0, 0.95 * scale, 0);
  add(g, new THREE.SphereGeometry(0.22 * scale, 8, 6), mat(0xc79c78), 0, 1.7 * scale, 0);
  add(g, new THREE.BoxGeometry(0.34 * scale, 0.6 * scale, 0.26 * scale), mat(0x2e3338), 0, 0.38 * scale, 0);
  g.position.set(x, 0, z);
  group.add(g);
  return g;
}

export function buildDujiangyanOverlay() {
  const group = new THREE.Group();
  const stone = mat(0x8b8b7d, 0.98);
  const stoneDark = mat(0x5f6159, 0.98);
  const wood = mat(0x6d4b2d, 0.9);
  const woodDark = mat(0x4b3421, 0.92);
  const roofMat = mat(0x3d4a4a, 0.86);
  const red = mat(0x8c2f24, 0.84);
  const white = mat(0xd8d1bd, 0.94);
  const gold = mat(0xb08a45, 0.48, 0.35);
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x76a9a8, transparent: true, opacity: 0.55, roughness: 0.15, metalness: 0.1 });

  const dikeMat = stone;
  box(group, 220, 3.2, 9, dikeMat, 80, 0.8, 120);
  box(group, 220, 3.0, 8, stoneDark, 80, 0.7, -112);
  box(group, 10, 3.6, 205, dikeMat, 13, 0.9, 0);
  box(group, 10, 3.4, 205, dikeMat, 147, 0.9, 0);

  const fish = new THREE.Mesh(new THREE.CapsuleGeometry(11, 46, 5, 10), stone);
  fish.rotation.z = Math.PI / 2;
  fish.scale.set(1, 1, 0.72);
  fish.position.set(80, 1.4, 0);
  fish.castShadow = true;
  fish.receiveShadow = true;
  group.add(fish);
  box(group, 18, 2.2, 22, stoneDark, 80, 1.1, 26);
  box(group, 18, 2.2, 22, stoneDark, 80, 1.1, -26);
  instanced(group, new THREE.BoxGeometry(1.8, 0.42, 1.15), stone, 180, (d, i) => {
    const a = (i % 60) / 60 * Math.PI * 2;
    const r = 10 + Math.floor(i / 60) * 1.6;
    d.position.set(80 + Math.cos(a) * r * 2.6, 0.22 + (i % 4) * 0.4, Math.sin(a) * r);
    d.rotation.set(0, -a, 0);
  });

  const bridge = new THREE.Group();
  const deck = [];
  for (let i = 0; i < 58; i++) {
    const x = 14 + i * 2.35;
    deck.push([x, 3.4 + Math.sin((i / 57) * Math.PI) * 1.4, 80]);
  }
  instanced(bridge, new THREE.BoxGeometry(2.2, 0.18, 4.2), wood, deck.length, (d, i) => {
    const [x, y, z] = deck[i];
    d.position.set(x, y, z);
    d.rotation.z = Math.cos((i / 57) * Math.PI) * 0.05;
  });
  for (const side of [-2.3, 2.3]) {
    for (const x of [14, 150]) {
      box(bridge, 2.6, 7.2, 2.6, woodDark, x, 3.6, 80 + side);
      roof(bridge, 4.2, 4.2, 2.4, roofMat, x, 7.4, 80 + side);
    }
    for (let i = 0; i <= 20; i++) {
      const x = 14 + i * 6.8;
      const y = 3.4 + Math.sin((i / 20) * Math.PI) * 1.4;
      box(bridge, 0.12, 1.0, 0.12, woodDark, x, y + 0.65, 80 + side);
    }
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(14, 7.2, 80 + side),
      new THREE.Vector3(82, 4.1, 80 + side),
      new THREE.Vector3(150, 7.2, 80 + side),
    ]);
    add(bridge, new THREE.TubeGeometry(curve, 32, 0.055, 5, false), mat(0x3a3a36, 0.7, 0.4), 0, 0, 0);
  }
  group.add(bridge);

  const temple = new THREE.Group();
  box(temple, 34, 1.4, 28, stone, -28, 0.7, 108);
  box(temple, 23, 6.2, 15, red, -28, 4.4, 108);
  box(temple, 20, 1.0, 12, white, -28, 2.2, 108);
  roof(temple, 29, 21, 5.2, roofMat, -28, 8.2, 108);
  roof(temple, 15, 12, 3.2, roofMat, -28, 12.4, 108);
  for (const x of [-39, -28, -17]) {
    box(temple, 1.0, 6.4, 0.55, woodDark, x, 4.4, 116.0);
    box(temple, 3.8, 0.28, 0.65, gold, x, 7.0, 116.1);
  }
  box(temple, 4.4, 1.4, 1.2, gold, -28, 6.1, 116.2);
  box(temple, 5.6, 0.7, 1.0, woodDark, -28, 2.7, 119);
  for (let i = 0; i < 6; i++) box(temple, 8 - i * 0.5, 0.28, 1.1, stone, -28, 0.2 + i * 0.22, 121 + i * 0.7);
  box(temple, 30, 1.1, 1.1, stoneDark, -28, 1.2, 122);
  add(temple, new THREE.CylinderGeometry(1.6, 1.9, 1.8, 10), stoneDark, -28, 2.2, 114);
  for (let i = 0; i < 3; i++) add(temple, new THREE.CylinderGeometry(0.06, 0.06, 1.8, 5), mat(0x4b3825), -28 + (i - 1) * 0.5, 3.8, 114);
  group.add(temple);

  const hall = new THREE.Group();
  box(hall, 24, 1.0, 18, stone, 172, 0.5, -58);
  box(hall, 16, 5.0, 11, red, 172, 3.5, -58);
  roof(hall, 21, 15, 4.2, roofMat, 172, 6.8, -58);
  box(hall, 3.2, 1.2, 0.7, gold, 172, 5.0, -51.4);
  group.add(hall);

  const boat = new THREE.Group();
  add(boat, new THREE.CylinderGeometry(0.02, 1.4, 2.4, 8, 1, true), wood, 0, 0.9, 0);
  box(boat, 4.6, 0.25, 1.8, woodDark, 0, 0.9, 0);
  box(boat, 1.8, 0.35, 1.4, wood, 0, 1.2, 0);
  boat.position.set(45, 0.55, 40);
  group.add(boat);

  const flagPositions = [];
  for (let i = 0; i < 14; i++) flagPositions.push({ x: -46 + i * 2.2, y: 10.5 + Math.sin(i) * 0.35, z: 96, p: i * 0.7 });
  const flagGeo = new THREE.PlaneGeometry(0.9, 0.6);
  const flagMat = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.9 });
  const flags = instanced(group, flagGeo, flagMat, flagPositions.length, (d, i) => {
    const f = flagPositions[i];
    d.position.set(f.x, f.y, f.z);
    d.rotation.y = -0.3;
  }, [new THREE.Color(0xb63a30), new THREE.Color(0xd9c75a), new THREE.Color(0x2f5fa8), new THREE.Color(0x3d8a55)]);

  const reeds = instanced(group, new THREE.ConeGeometry(0.14, 2.4, 5), mat(0x6f7d45), 110, (d, i) => {
    const side = i % 2 ? 1 : -1;
    d.position.set(20 + (i % 18) * 7, 1.1, side > 0 ? -70 + Rnd(i) * 160 : -70 + Rnd(i + 50) * 160);
    d.scale.set(0.7 + Rnd(i + 3) * 0.8, 0.7 + Rnd(i + 9) * 0.7, 1);
  });

  for (let i = 0; i < 10; i++) person(group, 20 + i * 13, 78 + (i % 2) * 3, i % 2 ? 0x8c3b2e : 0x2f5168, 0.95);
  for (let i = 0; i < 5; i++) person(group, -38 + i * 5, 120 + (i % 2) * 2, 0x8a4a34, 0.9);
  instanced(group, new THREE.DodecahedronGeometry(0.9, 0), stone, 90, (d, i) => {
    d.position.set(20 + (i % 30) * 4.4, 0.35, -105 + Math.floor(i / 30) * 70 + Rnd(i) * 12);
    d.scale.set(0.7 + Rnd(i + 2), 0.4 + Rnd(i + 4) * 0.4, 0.8 + Rnd(i + 7));
  });

  const dummy = new THREE.Object3D();
  const life = {
    update(time) {
      bridge.rotation.z = Math.sin(time * 0.55) * 0.003;
      boat.position.y = 0.55 + Math.sin(time * 0.9) * 0.06;
      boat.rotation.z = Math.sin(time * 0.7) * 0.02;
      flagPositions.forEach((f, i) => {
        dummy.position.set(f.x, f.y + Math.sin(time * 1.5 + f.p) * 0.1, f.z);
        dummy.rotation.set(0, -0.3 + Math.sin(time * 2.0 + f.p) * 0.2, Math.sin(time * 2.8 + f.p) * 0.08);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        flags.setMatrixAt(i, dummy.matrix);
      });
      flags.instanceMatrix.needsUpdate = true;
    },
  };

  const merged = mergeStaticGroup(group);
  return { group: merged, life, stats: { bridge: 1, temple: 1, fishMouth: 1, reeds: 110 } };
}

function Rnd(seed) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}
