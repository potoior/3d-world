import * as THREE from 'three';
import { terrainHeight, waterLevelAt, valleyCenter, WATER_Y } from './terrain.js';
import { colliders } from './architectures.js';

const MAT_CACHE = new Map();
function mat(color, rough = 0.95, metal = 0) {
  const key = color + ':' + rough + ':' + metal;
  if (!MAT_CACHE.has(key)) MAT_CACHE.set(key, new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal }));
  return MAT_CACHE.get(key);
}
const woodMat = mat(0x73502f, 0.9);
const woodDark = mat(0x4c3520, 0.93);
const woodWarm = mat(0x8a6238, 0.92);
const ropeMat = mat(0x4a4436, 0.85, 0.12);
const whiteWall = mat(0xeae3d0, 0.95);
const stoneWall = mat(0xa8a08a, 0.98);
const templeRed = mat(0x77291d, 0.9);
const templeMaroon = mat(0x4f1c16, 0.92);
const dark = mat(0x2a2118, 0.88);
const goldMat = mat(0xc59a44, 0.45, 0.45);
const glassMat = mat(0x283a35, 0.5, 0.15);

function Rnd(seed) {
  const x = Math.sin(seed * 12.9898 + 4.71) * 43758.5453;
  return x - Math.floor(x);
}
function add(group, geo, material, x, y, z, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  m.castShadow = true;
  m.receiveShadow = true;
  group.add(m);
  return m;
}
function box(group, w, h, d, material, x, y, z, ry = 0, rz = 0, rx = 0) {
  return add(group, new THREE.BoxGeometry(w, h, d), material, x, y, z, rx, ry, rz);
}
function cylinder(group, rt, rb, h, seg, material, x, y, z, rx = 0, ry = 0, rz = 0) {
  return add(group, new THREE.CylinderGeometry(rt, rb, h, seg), material, x, y, z, rx, ry, rz);
}

function resamplePath(points, step = 2.4) {
  const out = [];
  for (let i = 0; i < points.length - 1; i++) {
    const [ax, az] = points[i];
    const [bx, bz] = points[i + 1];
    const len = Math.hypot(bx - ax, bz - az);
    const n = Math.max(1, Math.ceil(len / step));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      const x = ax + (bx - ax) * t;
      const z = az + (bz - az) * t;
      const wl = waterLevelAt(x, z);
      const ground = terrainHeight(x, z);
      const y = Math.max(ground + 0.62, (wl === null ? WATER_Y : wl) + 0.82);
      out.push({ x, y, z });
    }
  }
  const last = points[points.length - 1];
  out.push({
    x: last[0],
    z: last[1],
    y: Math.max(terrainHeight(last[0], last[1]) + 0.62, (waterLevelAt(last[0], last[1]) ?? WATER_Y) + 0.82),
  });
  return out;
}

const BOARDWALK_POINTS = [
  [96, -92], [89, -66], [82, -34], [78, 2], [76, 40], [79, 78],
  [82, 108], [83, 133], [72, 154], [60, 177], [57, 204], [63, 231],
  [67, 258], [61, 285], [55, 312], [61, 340], [72, 362],
];

function addBoardwalk(group) {
  const pts = resamplePath(BOARDWALK_POINTS, 2.5);
  const width = 3.4;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz) + 0.16;
    const midX = (a.x + b.x) * 0.5;
    const midY = (a.y + b.y) * 0.5;
    const midZ = (a.z + b.z) * 0.5;
    const angle = Math.atan2(dx, dz);
    box(group, width, 0.22, len, i % 4 === 0 ? woodWarm : woodMat, midX, midY, midZ, angle);
    const nx = dz / Math.hypot(dx, dz);
    const nz = -dx / Math.hypot(dx, dz);
    if (i % 3 === 0) {
      for (const side of [-1, 1]) {
        const px = midX + nx * width * 0.5 * side;
        const pz = midZ + nz * width * 0.5 * side;
        cylinder(group, 0.11, 0.14, 2.1, 5, woodDark, px, midY + 1.02, pz);
        box(group, 0.26, 0.12, 0.26, woodWarm, px, midY + 2.06, pz, angle);
      }
    }
    for (const side of [-1, 1]) {
      const ox = nx * width * 0.49 * side;
      const oz = nz * width * 0.49 * side;
      box(group, 0.1, 0.1, len + 0.05, woodDark, midX + ox, midY + 1.08, midZ + oz, angle);
      box(group, 0.08, 0.08, len + 0.05, woodDark, midX + ox, midY + 0.53, midZ + oz, angle);
    }
    if (i % 4 === 0) {
      const g = Math.min(terrainHeight(midX, midZ), midY - 1.0);
      const h = Math.max(0.8, midY - 0.2 - g);
      cylinder(group, 0.13, 0.18, h, 5, woodDark, midX, g + h * 0.5, midZ);
    }
  }
  const deck = pts[Math.floor(pts.length * 0.36)];
  for (const [ox, oz] of [[0, 0], [2.2, 0.2], [4.4, 0.4]]) {
    box(group, 4.6, 0.24, 12.0, woodMat, deck.x + ox, deck.y + 0.01, deck.z + oz);
  }
  for (const side of [-1, 1]) {
    for (let i = 0; i < 5; i++) {
      const z = deck.z - 5 + i * 2.5;
      box(group, 0.11, 1.9, 0.11, woodDark, deck.x - 1.5, deck.y + 0.95, z);
      box(group, 0.11, 1.9, 0.11, woodDark, deck.x + 5.8, deck.y + 0.95, z);
    }
    box(group, 0.1, 0.1, 11.8, woodDark, deck.x - 1.5, deck.y + 1.86, deck.z);
    box(group, 0.1, 0.1, 11.8, woodDark, deck.x + 5.8, deck.y + 1.86, deck.z);
  }
  return { pts, deck };
}

function addHouse(parent, x, z, ry, scale) {
  const g = new THREE.Group();
  const y0 = terrainHeight(x, z) + 0.05;
  g.position.set(x, y0, z);
  g.rotation.y = ry;
  g.scale.setScalar(scale);

  box(g, 19, 1.15, 15, stoneWall, 0, 0.58, 0);
  box(g, 16, 8.4, 12, whiteWall, 0, 5.35, 0);
  box(g, 16.5, 0.8, 12.5, woodDark, 0, 1.55, 0);
  box(g, 16.6, 1.2, 12.6, woodDark, 0, 8.9, 0);
  box(g, 18.2, 0.65, 14.2, woodDark, 0, 9.8, 0);
  box(g, 12, 0.45, 10.5, stoneWall, 0, 10.28, 0);
  box(g, 18.4, 0.85, 0.55, stoneWall, 0, 10.55, 7.05);
  box(g, 18.4, 0.85, 0.55, stoneWall, 0, 10.55, -7.05);
  box(g, 0.55, 0.85, 14.6, stoneWall, 8.95, 10.55, 0);
  box(g, 0.55, 0.85, 14.6, stoneWall, -8.95, 10.55, 0);

  for (const sx of [-7.6, 7.6]) {
    for (const sz of [-5.5, 5.5]) {
      box(g, 0.55, 8.6, 0.55, templeMaroon, sx, 5.4, sz);
      box(g, 0.85, 0.28, 0.85, woodWarm, sx, 9.55, sz);
    }
  }
  for (const sx of [-4.6, 0, 4.6]) {
    box(g, 2.3, 2.1, 0.24, glassMat, sx, 5.8, 6.06);
    box(g, 2.7, 0.24, 0.32, woodDark, sx, 7.0, 6.1);
    box(g, 2.7, 0.24, 0.32, woodDark, sx, 4.6, 6.1);
    box(g, 2.7, 0.9, 0.26, templeRed, sx, 2.6, 6.08);
    box(g, 3.0, 0.16, 0.36, goldMat, sx, 3.1, 6.12);
  }
  box(g, 3.2, 5.4, 0.32, templeMaroon, 0, 3.0, 6.08);
  box(g, 2.4, 4.5, 0.2, glassMat, 0, 3.0, 6.22);
  box(g, 3.8, 0.24, 0.46, goldMat, 0, 5.75, 6.26);
  box(g, 11.5, 0.3, 2.6, woodWarm, 0, 6.55, 7.0);
  for (const sx of [-5.6, -2.8, 0, 2.8, 5.6]) {
    box(g, 0.16, 1.1, 0.16, woodDark, sx, 7.2, 8.2);
  }
  box(g, 11.6, 0.12, 0.12, woodDark, 0, 7.72, 8.2);
  box(g, 0.12, 0.12, 2.5, woodDark, -5.8, 7.72, 7.0);
  box(g, 0.12, 0.12, 2.5, woodDark, 5.8, 7.72, 7.0);

  cylinder(g, 0.11, 0.16, 4.6, 6, woodDark, -7.0, 12.0, -4.4);
  add(g, new THREE.SphereGeometry(0.28, 8, 6), goldMat, -7.0, 14.45, -4.4);
  box(g, 10, 0.9, 1.6, stoneWall, 0, 0.45, -8.6);
  for (let i = 0; i < 8; i++) {
    const w = 0.22 + Rnd(i) * 0.12;
    const h = 1.0 + Rnd(i * 3) * 0.8;
    cylinder(g, w, w, h, 5, woodWarm, 8.6, 1.4 + i * 0.22, -4 + (i % 2) * 0.6, 0, 0, Math.PI / 2);
  }
  cylinder(g, 0.65, 0.8, 3.2, 8, stoneWall, 5.2, 11.4, -3.4);
  cylinder(g, 0.9, 0.9, 0.2, 8, dark, 5.2, 13.05, -3.4);

  parent.add(g);
  colliders.push({ minX: x - 11.5 * scale, maxX: x + 11.5 * scale, minZ: z - 9.5 * scale, maxZ: z + 9.5 * scale });
  return g;
}

function addStupa(parent, x, z, s = 1) {
  const y = terrainHeight(x, z);
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.scale.setScalar(s);
  box(g, 6.4, 1.2, 6.4, stoneWall, 0, 0.6, 0);
  box(g, 5.0, 1.0, 5.0, whiteWall, 0, 1.7, 0);
  box(g, 4.2, 3.6, 4.2, whiteWall, 0, 4.0, 0);
  box(g, 4.6, 0.35, 4.6, goldMat, 0, 5.9, 0);
  add(g, new THREE.SphereGeometry(1.45, 14, 10), whiteWall, 0, 6.9, 0);
  cylinder(g, 0.28, 0.72, 2.4, 8, whiteWall, 0, 8.7, 0);
  for (let i = 0; i < 5; i++) cylinder(g, 0.55 - i * 0.08, 0.55 - i * 0.08, 0.14, 9, goldMat, 0, 9.9 + i * 0.24, 0);
  add(g, new THREE.ConeGeometry(0.24, 1.9, 8), goldMat, 0, 11.5, 0);
  box(g, 1.0, 0.6, 0.16, templeRed, 0, 4.3, 2.16);
  parent.add(g);
  colliders.push({ minX: x - 4 * s, maxX: x + 4 * s, minZ: z - 4 * s, maxZ: z + 4 * s });
}

const flagState = { mesh: null, data: [] };

function addPrayerFlags(parent) {
  const flagLines = [
    [[112, 280, 13.2], [80, 310, 16.4]],
    [[141, 300, 13.0], [94, 336, 15.6]],
    [[118, 352, 12.8], [70, 320, 14.6]],
    [[166, 318, 12.6], [126, 348, 14.4]],
    [[72, 200, 7.4], [18, 222, 16.2]],
  ];
  const curves = [];
  for (const [a, b] of flagLines) {
    const p0 = new THREE.Vector3(a[0], terrainHeight(a[0], a[1]) + a[2], a[1]);
    const p1 = new THREE.Vector3(b[0], terrainHeight(b[0], b[1]) + b[2], b[1]);
    const mid = p0.clone().lerp(p1, 0.5);
    mid.y = Math.min(p0.y, p1.y) - 3.2;
    const curve = new THREE.CatmullRomCurve3([p0, mid, p1]);
    cylinder(parent, 0.16, 0.24, 8.5, 6, woodDark, b[0], terrainHeight(b[0], b[1]) + 4.2, b[1]);
    add(parent, new THREE.CylinderGeometry(0.06, 0.06, 1.4, 5), goldMat, b[0], p1.y + 0.4, b[1]);
    add(parent, new THREE.TubeGeometry(curve, 28, 0.045, 4, false), ropeMat, 0, 0, 0);
    curves.push(curve);
  }

  const perLine = 13;
  const count = perLine * curves.length;
  const geo = new THREE.PlaneGeometry(1.15, 0.76);
  const material = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.9, metalness: 0.02 });
  const im = new THREE.InstancedMesh(geo, material, count);
  im.castShadow = true;
  im.receiveShadow = true;
  im.frustumCulled = false;
  const palette = [
    new THREE.Color(0xc43b2b), new THREE.Color(0xe6c54c), new THREE.Color(0x2f6fb0),
    new THREE.Color(0x3f8a57), new THREE.Color(0xf1ece0),
  ];
  const dummy = new THREE.Object3D();
  let index = 0;
  curves.forEach((curve, li) => {
    const tangent = new THREE.Vector3();
    for (let i = 0; i < perLine; i++) {
      const t = 0.08 + (i / (perLine - 1)) * 0.84;
      const p = curve.getPoint(t);
      curve.getTangent(t, tangent);
      const yaw = Math.atan2(tangent.x, tangent.z) + Math.PI * 0.5;
      const data = { pos: p.clone(), yaw, phase: li * 1.7 + i * 0.72 };
      dummy.position.copy(p).add(new THREE.Vector3(0, -0.46, 0));
      dummy.rotation.set(0, yaw, 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      im.setMatrixAt(index, dummy.matrix);
      im.setColorAt(index, palette[(i + li * 2) % palette.length]);
      flagState.data.push(data);
      index++;
    }
  });
  im.instanceMatrix.needsUpdate = true;
  im.instanceColor.needsUpdate = true;
  parent.add(im);
  flagState.mesh = im;
}

export function buildVillageSystem() {
  const group = new THREE.Group();
  const walk = addBoardwalk(group);

  const houses = [
    [116, 302, -0.18, 0.95],
    [143, 286, 0.22, 0.9],
    [138, 332, -0.3, 0.95],
    [112, 352, 0.18, 0.86],
    [166, 310, 0.35, 0.8],
    [120, 270, -0.08, 0.8],
  ];
  for (const [x, z, ry, s] of houses) addHouse(group, x, z, ry, s);
  addStupa(group, 98, 322, 1.0);
  addStupa(group, 152, 348, 0.78);
  addPrayerFlags(group);

  const dummy = new THREE.Object3D();
  const update = (time) => {
    if (!flagState.mesh) return;
    flagState.data.forEach((d, i) => {
      dummy.position.copy(d.pos);
      dummy.position.y -= 0.46 + Math.sin(time * 1.35 + d.phase) * 0.075;
      dummy.rotation.set(
        Math.sin(time * 2.0 + d.phase) * 0.15,
        d.yaw + Math.sin(time * 1.7 + d.phase) * 0.24,
        Math.sin(time * 2.6 + d.phase) * 0.2
      );
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      flagState.mesh.setMatrixAt(i, dummy.matrix);
    });
    flagState.mesh.instanceMatrix.needsUpdate = true;
  };

  return { group, update, flags: flagState.data.length, houses: houses.length, deck: walk.deck };
}
