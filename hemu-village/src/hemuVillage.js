import * as THREE from 'three';
import { rand, makeSignTexture } from './hemuCore.js';
import { terrainHeight, riverCenterX } from './hemuTerrain.js';
import { StaticBuilder, localMatrix, addCabin, addGranary } from './hemuCabin.js';

function addFence(B, points, { height = 1.15, gap = 0 } = {}) {
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.max(1, Math.round(len / 2.7));
    const ang = Math.atan2(b[0] - a[0], b[1] - a[1]);
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      const x = a[0] + (b[0] - a[0]) * t;
      const z = a[1] + (b[1] - a[1]) * t;
      const y = terrainHeight(x, z);
      B.box('timberDark', 0.16, height, 0.16, x, y + height / 2, z);
      B.box('timberDark', 0.34, 0.1, 0.34, x, y + height + 0.04, z);
    }
    const steps = Math.max(1, Math.ceil(len / 2.4));
    for (let k = 0; k < steps; k++) {
      if (gap > 0 && k === Math.floor(steps / 2)) continue;
      const t0 = k / steps;
      const t1 = (k + 1) / steps;
      const x0 = a[0] + (b[0] - a[0]) * t0;
      const z0 = a[1] + (b[1] - a[1]) * t0;
      const x1 = a[0] + (b[0] - a[0]) * t1;
      const z1 = a[1] + (b[1] - a[1]) * t1;
      const y = (terrainHeight(x0, z0) + terrainHeight(x1, z1)) / 2;
      B.rod('timber', x0, y + height * 0.94, z0, x1, y + height * 0.94, z1, 0.07, 0.07, 5);
      B.rod('timber', x0, y + height * 0.5, z0, x1, y + height * 0.5, z1, 0.055, 0.055, 5);
    }
  }
}

function addHayRack(B, x, z, rot) {
  const world = localMatrix(x, z, rot);
  const y0 = 0;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      B.box('timberDark', 0.18, 3.7, 0.18, sx * 1.7, 1.85, sz * 0.8, 0, world);
    }
  }
  B.box('timber', 3.9, 0.18, 0.18, 0, 3.1, -0.8, 0, world);
  B.box('timber', 3.9, 0.18, 0.18, 0, 3.1, 0.8, 0, world);
  B.box('timber', 0.18, 0.18, 1.9, -1.7, 2.3, 0, 0, world);
  B.box('timber', 0.18, 0.18, 1.9, 1.7, 2.3, 0, 0, world);
  for (let i = 0; i < 7; i++) {
    const hx = -1.5 + i * 0.5;
    B.cone('hay', 0.38, 1.7, hx, 2.15, 0.65, 6, world);
    B.cone('hay', 0.34, 1.5, hx, 2.05, -0.65, 6, world);
  }
  for (let i = 0; i < 6; i++) {
    B.rod('hay', -1.7, 2.3 + i * 0.12, -0.8, 1.7, 2.3 + i * 0.12, -0.8, 0.035, 0.035, 4, world);
  }
}

function addBridge(B, cx, cz) {
  const world = localMatrix(cx, cz, 0, 0);
  const width = 5.0;
  const span = 27;
  B.box('timberDark', span, 0.36, 0.36, 0, 0.75, -width * 0.34, 0, world);
  B.box('timberDark', span, 0.36, 0.36, 0, 0.75, width * 0.34, 0, world);
  for (let i = 0; i < 29; i++) {
    const px = -span / 2 + 0.5 + i * (span - 1) / 28;
    B.box('timber', 0.56, 0.14, width, px, 1.0 + Math.cos((px / span) * Math.PI) * 0.12, 0, 0, world);
  }
  for (const side of [-1, 1]) {
    for (let i = 0; i < 9; i++) {
      const px = -span / 2 + 1.0 + i * (span - 2) / 8;
      const py = 1.0 + Math.cos((px / span) * Math.PI) * 0.12;
      B.box('timberDark', 0.16, 1.25, 0.16, px, py + 0.62, side * (width / 2 - 0.1), 0, world);
      if (i < 8) {
        const nx = -span / 2 + 1.0 + (i + 1) * (span - 2) / 8;
        const ny = 1.0 + Math.cos((nx / span) * Math.PI) * 0.12;
        const zz = side * (width / 2 - 0.1);
        B.rod('timber', px, py + 1.16, zz, nx, ny + 1.16, zz, 0.06, 0.06, 5, world);
        B.rod('timber', px, py + 0.6, zz, nx, ny + 0.6, zz, 0.045, 0.045, 5, world);
      }
    }
    B.box('stone', 2.8, 1.5, width + 2.2, side * (span / 2 - 0.5), 0.45, 0, 0, world);
  }
  for (let i = 0; i < 5; i++) {
    B.box('stone', 1.2 + rand(90 + i, 2), 0.7, 1.1, -span / 2 + 1.4 + i * 1.2, -0.02, width * 0.2, 0, world);
  }
}

function addLookout(B) {
  const x = -168;
  const z = -30;
  const rot = 0.1;
  const base = terrainHeight(x, z);
  const world = localMatrix(x, z, rot, base);
  const deckY = 3.6;
  for (const sx of [-1, 0, 1]) {
    for (const sz of [-1, 1]) {
      B.box('timberDark', 0.26, deckY + 1.6, 0.26, sx * 6.8, (deckY + 1.6) / 2, sz * 4.1, 0, world);
      B.box('stone', 1.0, 0.5, 1.0, sx * 6.8, 0.22, sz * 4.1, 0, world);
    }
  }
  B.box('timberDark', 14.4, 0.32, 0.34, 0, deckY - 0.1, -4.1, 0, world);
  B.box('timberDark', 14.4, 0.32, 0.34, 0, deckY - 0.1, 4.1, 0, world);
  B.box('timberDark', 0.34, 0.32, 8.6, -6.8, deckY - 0.1, 0, 0, world);
  for (let i = 0; i < 17; i++) {
    B.box('timber', 0.82, 0.12, 8.6, -6.55 + i * 0.82, deckY, 0, 0, world);
    if (i % 2 === 0) B.box('timberDark', 0.1, 0.06, 8.6, -6.55 + i * 0.82 + 0.43, deckY - 0.08, 0, 0, world);
  }
  const rail = (x0, z0, x1, z1) => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const n = Math.max(1, Math.round(len / 2.3));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      B.box('timberDark', 0.18, 1.2, 0.18, x0 + (x1 - x0) * t, deckY + 0.6, z0 + (z1 - z0) * t, 0, world);
    }
    B.box('timber', Math.abs(x1 - x0) + 0.2, 0.14, Math.abs(z1 - z0) + 0.2, (x0 + x1) / 2, deckY + 1.2, (z0 + z1) / 2, 0, world);
  };
  rail(-6.8, -4.1, 6.8, -4.1);
  rail(-6.8, 4.1, 6.8, 4.1);
  rail(-6.8, -4.1, -6.8, 4.1);
  rail(6.8, -4.1, 6.8, -1.9);
  rail(6.8, 1.9, 6.8, 4.1);
  for (let i = 0; i < 10; i++) {
    B.box('timber', 0.58, 0.26, 4.0, 7.5 + i * 0.52, deckY - 0.32 - i * 0.33, 0, 0, world);
    if (i % 2 === 0) {
      B.box('timberDark', 0.14, 0.9, 0.14, 7.5 + i * 0.52, deckY - 0.3 - i * 0.33 + 0.45, 2.05, 0, world);
      B.box('timberDark', 0.14, 0.9, 0.14, 7.5 + i * 0.52, deckY - 0.3 - i * 0.33 + 0.45, -2.05, 0, world);
    }
  }
  B.box('timber', 6.2, 0.12, 1.1, 0, deckY + 1.4, -3.2, 0, world);
  B.box('timberDark', 0.18, 0.9, 0.18, -2.8, deckY + 0.45, -3.2, 0, world);
  B.box('timberDark', 0.18, 0.9, 0.18, 2.8, deckY + 0.45, -3.2, 0, world);
  return { x, z, base, deckY, rot };
}

const HOUSES = [
  [46, -126, 0.25, 8.6, 6.8, 2.9], [72, -132, -0.2, 7.4, 6.2, 2.8], [104, -122, 0.1, 9.2, 7.2, 3.0],
  [56, -92, 0.5, 7.8, 6.4, 2.8], [90, -96, -0.3, 8.8, 7.0, 3.0], [129, -86, 0.2, 7.0, 6.0, 2.7],
  [42, -48, -0.15, 9.0, 7.0, 3.0], [74, -54, 0.35, 8.2, 6.6, 2.9], [108, -46, -0.25, 9.8, 7.6, 3.1],
  [140, -24, 0.15, 7.6, 6.2, 2.8], [48, -6, 0.08, 8.4, 6.8, 2.9], [82, -2, -0.3, 9.4, 7.2, 3.1],
  [115, 8, 0.22, 8.0, 6.4, 2.9], [146, 28, -0.12, 9.0, 7.0, 3.0], [40, 44, 0.3, 7.4, 6.2, 2.8],
  [68, 50, -0.18, 8.8, 7.0, 3.0], [100, 62, 0.15, 9.6, 7.4, 3.1], [134, 72, -0.28, 8.2, 6.6, 2.9],
  [58, 96, 0.1, 8.0, 6.4, 2.8], [92, 104, -0.2, 9.0, 7.0, 3.0], [126, 118, 0.24, 8.6, 6.8, 2.9],
  [48, 144, 0.16, 9.2, 7.2, 3.0], [82, 152, -0.24, 8.4, 6.6, 2.9], [118, 162, 0.2, 7.8, 6.2, 2.8],
  [142, 150, -0.1, 8.8, 7.0, 3.0],
];

const GRANARIES = [
  [66, -116, 0.4], [124, -100, -0.2], [58, 74, 0.2], [136, 40, -0.4],
];

function signBoard(title, sub, x, z, y, rot, w, h) {
  const tex = makeSignTexture(title, sub);
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, metalness: 0.02, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.position.set(x, y, z);
  mesh.rotation.y = rot;
  mesh.castShadow = true;
  return mesh;
}

export function createVillageBundle(M) {
  const B = new StaticBuilder();
  const smokeSpots = [];
  HOUSES.forEach(([x, z, rot, w, d, wallH], i) => {
    smokeSpots.push(...addCabin(B, { x, z, rot, w, d, wallH, seed: 40 + i * 13 }));
  });
  GRANARIES.forEach(([x, z, rot], i) => {
    smokeSpots.push(...addGranary(B, { x, z, rot, seed: 300 + i }));
  });

  addFence(B, [[122, -142], [162, -142], [162, -66], [122, -66], [122, -142]], { gap: 1 });
  addFence(B, [[140, 4], [192, 4], [192, 86], [140, 86], [140, 4]], { gap: 1 });
  addFence(B, [[40, 118], [112, 118], [112, 192], [40, 192], [40, 118]], { gap: 1 });
  addFence(B, [[-54, -100], [-54, -58], [-16, -58], [-16, -100], [-54, -100]], { gap: 1 });
  addFence(B, [[24, 78], [24, 12], [36, 12], [36, 78], [24, 78]], { gap: 1 });
  addFence(B, [[110, -18], [160, -18], [160, 46], [110, 46], [110, -18]], { gap: 1 });

  addHayRack(B, 110, 20, 0.2);
  addHayRack(B, 154, 102, -0.4);
  addHayRack(B, 70, 174, 0.8);
  addHayRack(B, 34, -142, -0.2);

  addBridge(B, riverCenterX(-112), -112);
  addBridge(B, riverCenterX(42), 42);

  const lookout = addLookout(B);

  const signDefs = [
    { title: '禾木村', sub: 'HEMU VILLAGE · XINJIANG', x: 30, z: -126, y: terrainHeight(30, -126) + 5.4, rot: Math.PI, w: 8.2, h: 4.1, postX: 3.1, postY: 3.0, postZ: 0.15 },
    { title: '观景台', sub: 'LOOKOUT POINT', x: lookout.x + 7.2, z: lookout.z, y: lookout.base + lookout.deckY + 2.35, rot: Math.PI / 2, w: 3.6, h: 1.8, postX: 0.1, postY: 1.0, postZ: 1.5 },
    { title: '禾木河', sub: 'HEMU RIVER', x: 25, z: -8, y: terrainHeight(25, -8) + 4.1, rot: Math.PI * 0.72, w: 4.2, h: 2.1, postX: 1.6, postY: 2.2, postZ: 0.1 },
  ];
  const signs = new THREE.Group();
  signs.name = 'hemu-signs';
  signDefs.forEach((s) => {
    signs.add(signBoard(s.title, s.sub, s.x, s.z, s.y, s.rot, s.w, s.h));
    const w = localMatrix(s.x, s.z, s.rot);
    B.box('timberDark', 0.22, s.y - terrainHeight(s.x, s.z), 0.22, -s.postX, -(s.y - terrainHeight(s.x, s.z)) / 2 + s.postY, s.postZ, 0, w);
    B.box('timberDark', 0.22, s.y - terrainHeight(s.x, s.z), 0.22, s.postX, -(s.y - terrainHeight(s.x, s.z)) / 2 + s.postY, s.postZ, 0, w);
  });

  const group = new THREE.Group();
  group.name = 'hemu-village';
  B.flush(M, group);
  group.add(signs);
  return { group, smokeSpots, signs, lookout };
}
