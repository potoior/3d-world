import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mats } from './materials.js';

let seed = 6143;
function rnd() {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
}

function box(list, w, h, d, x, y, z, ry = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (ry) g.rotateY(ry);
  g.translate(x, y, z);
  list.push(g);
}

function cyl(list, rt, rb, h, seg, x, y, z) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  g.translate(x, y, z);
  list.push(g);
}

function tint(geo, hex) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const c = new THREE.Color(hex);
  const n = g.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}

export const MONK_WHEEL_SPOTS = [];
export const YAK_CARAVAN = [];
export const EAVE_BELLS = [];

for (let i = 0; i < 5; i++) {
  MONK_WHEEL_SPOTS.push({ x: 103 + i * 10.8, y: 44.16, z: 165.6, phase: i * 1.7 });
}
for (let i = 0; i < 3; i++) {
  MONK_WHEEL_SPOTS.push({ walk: true, phase: i * 2.1, radius: 18 + i * 2.2 });
}
for (let i = 0; i < 3; i++) {
  YAK_CARAVAN.push({ lane: i, phase: i * 0.29, scale: 0.86 + i * 0.05, speed: 0.016 + i * 0.0015 });
}

const bellRows = [
  [62, 168, 13.1, 96.45, 78.72, 6],
  [-175, -92, 18.2, 90.45, 78.72, 5],
  [-50, 38, 19.6, 116.45, 74.72, 4],
  [64, 178, 16.2, 54.75, 95.62, 6],
];
for (const [x0, x1, step, y, z, n] of bellRows) {
  for (let i = 0; i < n; i++) {
    const x = n === 1 ? (x0 + x1) * 0.5 : x0 + ((x1 - x0) * i) / (n - 1);
    EAVE_BELLS.push({ x, y, z, phase: rnd() * 9, s: 0.85 + rnd() * 0.35 });
  }
}

function addManiPile(stone, x, z, count, size) {
  for (let i = 0; i < count; i++) {
    const a = rnd() * Math.PI * 2;
    const rad = rnd() * size * 1.5;
    const s = size * (0.38 + rnd() * 0.34);
    const g = new THREE.IcosahedronGeometry(s, 0);
    g.scale(1.25, 0.62 + rnd() * 0.2, 0.9);
    g.rotateY(rnd() * 3);
    g.translate(x + Math.cos(a) * rad, s * 0.42 + (i % 3) * s * 0.32, z + Math.sin(a) * rad);
    stone.push(g);
  }
}

function addYakStation(wood, stone, copper, straw, x, z, ry) {
  box(stone, 3.4, 0.72, 0.92, x, 0.36, z, ry);
  box(copper, 2.9, 0.08, 0.58, x, 0.64, z, ry);
  for (const s of [-1, 1]) {
    box(wood, 0.16, 1.2, 0.16, x + Math.cos(ry) * s * 1.7, 0.6, z - Math.sin(ry) * s * 1.7, ry);
  }
  box(wood, 3.5, 0.13, 0.13, x, 1.16, z, ry);
  for (let i = 0; i < 6; i++) {
    const u = (i / 5 - 0.5) * 2.6;
    const g = new THREE.ConeGeometry(0.18, 0.55, 5);
    g.rotateZ((rnd() - 0.5) * 0.4);
    g.translate(x + Math.cos(ry) * u, 0.92 + rnd() * 0.2, z - Math.sin(ry) * u);
    straw.push(g);
  }
}

export function buildPolishDetails() {
  const root = new THREE.Group();
  const stone = [];
  const wood = [];
  const copper = [];
  const straw = [];
  const ochre = [];

  addManiPile(stone, 112, 294, 12, 0.8);
  addManiPile(stone, 176, 226, 9, 0.65);
  addManiPile(stone, 76, 262, 8, 0.58);
  addYakStation(wood, stone, copper, straw, 98, 250, 0.12);
  addYakStation(wood, stone, copper, straw, 154, 242, -0.36);

  for (const [x, z] of [[76, 169], [80, 169.9], [84, 170.8]]) {
    cyl(copper, 0.34, 0.42, 0.78, 9, x, 44.55, z);
    cyl(wood, 0.37, 0.37, 0.08, 9, x, 44.98, z);
    cyl(wood, 0.34, 0.34, 0.05, 9, x, 44.16, z);
  }
  for (let i = 0; i < 8; i++) {
    const x = 186.4;
    const z = 130 + i * 3.7;
    cyl(wood, 0.17, 0.2, 1.0, 5, x, 44.7, z);
    cyl(wood, 0.16, 0.18, 0.9, 5, x + 0.24, 44.65, z);
    cyl(ochre, 0.18, 0.18, 0.06, 5, x + 0.08, 45.18, z);
  }

  const defs = [
    [stone, mats.stoneDark],
    [wood, mats.wood],
    [copper, mats.copper],
    [straw, mats.ochre],
    [ochre, mats.ochre],
  ];
  for (const [list, mat] of defs) {
    if (!list.length) continue;
    const geo = mergeGeometries(list, false);
    list.forEach((g) => g.dispose());
    if (!geo) continue;
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
  }
  return root;
}

function monkGeometry() {
  const parts = [];
  const robe = new THREE.CylinderGeometry(0.22, 0.42, 1.02, 7);
  robe.translate(0, 0.51, 0);
  parts.push(tint(robe, 0x6e1b13));
  const skirt = new THREE.CylinderGeometry(0.43, 0.48, 0.22, 7);
  skirt.translate(0, 0.12, 0);
  parts.push(tint(skirt, 0x51120d));
  const sash = new THREE.CylinderGeometry(0.26, 0.35, 0.2, 7);
  sash.translate(0, 0.86, 0);
  parts.push(tint(sash, 0xc18a30));
  const shoulder = new THREE.CylinderGeometry(0.2, 0.27, 0.36, 7);
  shoulder.translate(0, 1.16, 0);
  parts.push(tint(shoulder, 0x7a2016));
  const head = new THREE.SphereGeometry(0.16, 7, 5);
  head.translate(0, 1.52, 0);
  parts.push(tint(head, 0xb3855e));
  const earL = new THREE.SphereGeometry(0.035, 5, 4);
  earL.translate(-0.15, 1.52, 0);
  parts.push(tint(earL, 0xa9774f));
  const earR = earL.clone();
  earR.translate(0.3, 0, 0);
  parts.push(tint(earR, 0xa9774f));
  const arm = new THREE.CylinderGeometry(0.06, 0.07, 0.55, 5);
  arm.rotateZ(-0.16);
  arm.translate(0.26, 0.9, 0.02);
  parts.push(tint(arm, 0x6e1b13));
  const beads = new THREE.TorusGeometry(0.18, 0.022, 4, 9);
  beads.rotateX(1.25);
  beads.translate(0, 1.24, 0.09);
  parts.push(tint(beads, 0x5a3a1d));
  const geo = mergeGeometries(parts, false);
  parts.forEach((g) => g.dispose());
  return geo;
}

function yakGeometry() {
  const parts = [];
  const body = new THREE.SphereGeometry(1, 7, 5);
  body.scale(1.0, 0.9, 1.9);
  body.translate(0, 1.48, 0);
  parts.push(tint(body, 0x26211c));
  const hump = new THREE.SphereGeometry(0.58, 6, 4);
  hump.scale(1.0, 0.8, 1.1);
  hump.translate(0, 2.08, 0.72);
  parts.push(tint(hump, 0x201c18));
  const head = new THREE.SphereGeometry(0.55, 6, 4);
  head.scale(0.9, 0.82, 1.0);
  head.translate(0, 1.78, 1.55);
  parts.push(tint(head, 0x2c2620));
  for (const sx of [-1, 1]) {
    const horn = new THREE.ConeGeometry(0.09, 0.8, 5);
    horn.rotateX(0.72);
    horn.rotateZ(sx * 0.28);
    horn.translate(sx * 0.33, 2.12, 1.78);
    parts.push(tint(horn, 0xd9cfb2));
    const ear = new THREE.ConeGeometry(0.08, 0.26, 4);
    ear.rotateZ(sx * 0.9);
    ear.translate(sx * 0.48, 1.92, 1.58);
    parts.push(tint(ear, 0x2c2620));
  }
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const leg = new THREE.CylinderGeometry(0.12, 0.15, 1.3, 5);
      leg.translate(sx * 0.5, 0.65, sz * 0.98);
      parts.push(tint(leg, 0x211d19));
    }
  }
  const tail = new THREE.CylinderGeometry(0.05, 0.1, 1.2, 4);
  tail.translate(0, 1.16, -1.5);
  parts.push(tint(tail, 0x211d19));
  const bell = new THREE.SphereGeometry(0.12, 6, 4);
  bell.translate(0, 1.24, 1.74);
  parts.push(tint(bell, 0xf3c860));
  const geo = mergeGeometries(parts, false);
  parts.forEach((g) => g.dispose());
  return geo;
}

function bellGeometry() {
  const parts = [];
  const ring = new THREE.TorusGeometry(0.09, 0.022, 4, 7);
  ring.rotateX(Math.PI / 2);
  ring.translate(0, -0.02, 0);
  parts.push(ring);
  const body = new THREE.CylinderGeometry(0.09, 0.17, 0.34, 7);
  body.translate(0, -0.23, 0);
  parts.push(body);
  const lip = new THREE.CylinderGeometry(0.18, 0.18, 0.05, 7);
  lip.translate(0, -0.42, 0);
  parts.push(lip);
  const clapper = new THREE.SphereGeometry(0.055, 5, 4);
  clapper.translate(0, -0.48, 0);
  parts.push(clapper);
  return mergeGeometries(parts, false);
}

export function createPolishAmbient() {
  const group = new THREE.Group();
  const dummy = new THREE.Object3D();
  const figureMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });

  const monks = new THREE.InstancedMesh(monkGeometry(), figureMat, MONK_WHEEL_SPOTS.length);
  monks.castShadow = true;
  monks.frustumCulled = false;
  group.add(monks);

  const yaks = new THREE.InstancedMesh(yakGeometry(), figureMat, YAK_CARAVAN.length);
  yaks.castShadow = true;
  yaks.frustumCulled = false;
  group.add(yaks);

  const bells = new THREE.InstancedMesh(bellGeometry(), mats.goldBright, EAVE_BELLS.length);
  bells.castShadow = true;
  bells.frustumCulled = false;
  group.add(bells);

  function updateMonks(time) {
    for (let i = 0; i < MONK_WHEEL_SPOTS.length; i++) {
      const m = MONK_WHEEL_SPOTS[i];
      if (m.walk) {
        const a = m.phase + time * 0.052;
        const x = 127 + Math.cos(a) * m.radius;
        const z = 141 + Math.sin(a) * m.radius * 0.66;
        const dx = -Math.sin(a) * m.radius;
        const dz = Math.cos(a) * m.radius * 0.66;
        dummy.position.set(x, 44.15 + Math.abs(Math.sin(time * 2.4 + m.phase)) * 0.04, z);
        dummy.rotation.set(0, Math.atan2(dx, dz), 0);
      } else {
        const bow = 0.08 + Math.sin(time * 1.1 + m.phase) * 0.22;
        dummy.position.set(m.x, m.y + 0.01, m.z);
        dummy.rotation.set(bow, 0, 0);
      }
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      monks.setMatrixAt(i, dummy.matrix);
    }
    monks.instanceMatrix.needsUpdate = true;
  }

  function updateYaks(time) {
    for (let i = 0; i < YAK_CARAVAN.length; i++) {
      const y = YAK_CARAVAN[i];
      const u = (time * y.speed + y.phase) % 1;
      const s = u < 0.5 ? u * 2 : 2 - u * 2;
      const z = 296 - s * 84;
      const x = 106 + y.lane * 15 + Math.sin(s * Math.PI) * 2.6;
      const dir = u < 0.5 ? -1 : 1;
      dummy.position.set(x, 0.06 + Math.abs(Math.sin(time * 1.7 + y.phase * 6)) * 0.035, z);
      dummy.rotation.set(0, dir < 0 ? Math.PI : 0, Math.sin(time * 1.1 + y.phase * 4) * 0.015);
      dummy.scale.setScalar(y.scale);
      dummy.updateMatrix();
      yaks.setMatrixAt(i, dummy.matrix);
    }
    yaks.instanceMatrix.needsUpdate = true;
  }

  function updateBells(time) {
    for (let i = 0; i < EAVE_BELLS.length; i++) {
      const b = EAVE_BELLS[i];
      const a = Math.sin(time * 1.7 + b.phase) * 0.16 + Math.sin(time * 3.1 + b.phase * 2) * 0.04;
      dummy.position.set(b.x, b.y, b.z);
      dummy.rotation.set(a * 0.7, 0, a);
      dummy.scale.setScalar(b.s);
      dummy.updateMatrix();
      bells.setMatrixAt(i, dummy.matrix);
    }
    bells.instanceMatrix.needsUpdate = true;
  }

  updateMonks(0);
  updateYaks(0);
  updateBells(0);
  return {
    group,
    update(time) {
      updateMonks(time);
      updateYaks(time);
      updateBells(time);
    },
  };
}
