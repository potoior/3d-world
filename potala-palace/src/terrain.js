import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mats } from './materials.js';
import { addBox, addCylinder } from './geometry.js';
import { STAIRS } from './route.js';

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function addSlopeBox(list, seg, offset, w, h, lift) {
  const ax = seg.a[0];
  const az = seg.a[1];
  const bx = seg.b[0];
  const bz = seg.b[1];
  const dx = bx - ax;
  const dz = bz - az;
  const len = Math.hypot(dx, dz);
  const dy = seg.y1 - seg.y0;
  const theta = Math.atan2(dx, dz);
  const px = -dz / len;
  const pz = dx / len;
  const g = new THREE.BoxGeometry(w, h, len + 1.2);
  g.rotateX(-Math.atan2(dy, len));
  g.rotateY(theta);
  g.translate(
    (ax + bx) / 2 + px * offset,
    (seg.y0 + seg.y1) / 2 + lift,
    (az + bz) / 2 + pz * offset
  );
  list.push(g);
}

function buildStairs(stone, dark, pale, wood, lantern, copper, gold) {
  for (let si = 0; si < STAIRS.length; si++) {
    const seg = STAIRS[si];
    const dx = seg.b[0] - seg.a[0];
    const dz = seg.b[1] - seg.a[1];
    const len = Math.hypot(dx, dz);
    const theta = Math.atan2(dx, dz);
    const steps = Math.max(3, Math.round(len / 1.5));
    const rise = (seg.y1 - seg.y0) / steps;
    for (let i = 0; i < steps; i++) {
      const t = (i + 0.5) / steps;
      const x = seg.a[0] + dx * t;
      const z = seg.a[1] + dz * t;
      const top = seg.y0 + (seg.y1 - seg.y0) * ((i + 1) / steps);
      addBox(stone, 9.2, 0.7 + rise, 1.62, x, top - (0.7 + rise) / 2, z, theta);
      if (i % 2 === 0) {
        addBox(dark, 9.6, 0.12, 0.3, x, top + 0.04, z, theta);
      }
    }
    addSlopeBox(dark, seg, -4.75, 0.85, 1.5, 0.8);
    addSlopeBox(dark, seg, 4.75, 0.85, 1.5, 0.8);
    addSlopeBox(pale, seg, -4.75, 1.1, 0.18, 1.62);
    addSlopeBox(pale, seg, 4.75, 1.1, 0.18, 1.62);
    addSlopeBox(dark, seg, 0, 10.2, 3.4, -1.75);
    addSlopeBox(dark, seg, -3.95, 0.24, 0.07, 0.02);
    addSlopeBox(dark, seg, 3.95, 0.24, 0.07, 0.02);
    const midX = (seg.a[0] + seg.b[0]) / 2;
    const midZ = (seg.a[1] + seg.b[1]) / 2;
    const midY = (seg.y0 + seg.y1) / 2;
    addBox(dark, 8.6, Math.max(1.5, midY - 0.4), 2.2, midX, (midY - 0.4) / 2, midZ, theta);
    addBox(pale, 11, 1.1, 11, seg.b[0], seg.y1 - 0.4, seg.b[1]);
    addBox(dark, 10.6, 0.07, 0.3, seg.b[0], seg.y1 + 0.14, seg.b[1], theta);
    addBox(dark, 0.3, 0.07, 10.6, seg.b[0], seg.y1 + 0.14, seg.b[1], theta);
    const px = -dz / len;
    const pz = dx / len;
    for (const side of [-1, 1]) {
      if ((si + (side > 0 ? 1 : 0)) % 2) continue;
      const lx = seg.b[0] + px * side * 4.85;
      const lz = seg.b[1] + pz * side * 4.85;
      const by = seg.y1 + 0.15;
      addCylinder(wood, 0.09, 0.13, 2.7, 6, lx, by + 1.35, lz);
      addBox(copper, 0.44, 0.1, 0.44, lx, by + 2.72, lz);
      addCylinder(lantern, 0.27, 0.33, 0.58, 8, lx, by + 3.02, lz);
      addBox(gold, 0.52, 0.08, 0.52, lx, by + 3.34, lz);
      addCylinder(copper, 0.05, 0.2, 0.3, 6, lx, by + 3.55, lz);
      addBox(dark, 0.6, 0.28, 0.6, lx, by + 0.14, lz);
    }
  }
}

export function hillHeight(x, z) {
  const layers = [
    [440, 260, 12, 0],
    [415, 235, 12, 12],
    [390, 210, 10, 24],
    [405, 200, 10, 34],
  ];
  let y = 0;
  for (const [w, d, h, base] of layers) {
    if (Math.abs(x) < w / 2 && Math.abs(z + 5) < d / 2) y = base + h;
  }
  return y;
}

function buildHill(root) {
  const stone = [];
  const dark = [];
  const pale = [];
  const rock = [];
  const green = [];
  const wood = [];
  const lantern = [];
  const copper = [];
  const gold = [];
  const layers = [
    [440, 260, 12, 0],
    [415, 235, 12, 12],
    [390, 210, 10, 24],
    [405, 200, 10, 34],
  ];
  for (const [w, d, h, base] of layers) {
    addBox(stone, w, h, d, 0, base + h / 2, -5);
    addBox(dark, w + 2, 0.45, d + 2, 0, base + h, -5);
  }
  const cy = [];
  const cyLayers = [
    [134, 94, 14, 0],
    [126, 86, 14, 14],
    [118, 78, 10, 28],
    [111, 72, 6, 38],
  ];
  for (const [w, d, h, base] of cyLayers) {
    addBox(stone, w, h, d, 127, base + h / 2, 141);
    addBox(dark, w + 1.4, 0.35, d + 1.4, 127, base + h, 141);
  }
  addBox(pale, 112, 0.4, 72, 127, 44.1, 141);

  const rand = rng(19);
  for (let i = 0; i < 46; i++) {
    const side = rand() > 0.5 ? 1 : -1;
    const x = side * (195 + rand() * 105);
    const z = -105 + rand() * 205;
    const s = 7 + rand() * 17;
    const g = new THREE.DodecahedronGeometry(s, 0);
    g.scale(1 + rand() * 0.8, 0.7 + rand() * 0.9, 1 + rand() * 0.5);
    g.rotateY(rand() * 3);
    g.translate(x, 4 + rand() * 24, z);
    rock.push(g);
  }
  for (let i = 0; i < 22; i++) {
    const x = -150 + rand() * 300;
    const z = -120 + rand() * 120;
    const top = hillHeight(x, z);
    if (top < 22) continue;
    const g = new THREE.CylinderGeometry(3 + rand() * 5, 4 + rand() * 6, 2.5, 7);
    g.scale(1, 1, 0.45 + rand() * 0.4);
    g.translate(x, top + 0.7, z);
    green.push(g);
  }
  addBox(green, 350, 1.6, 24, 0, 44.4, -87);
  buildStairs(stone, dark, pale, wood, lantern, copper, gold);

  const stoneMesh = new THREE.Mesh(mergeGeometries(stone, false), mats.stone);
  stoneMesh.castShadow = true;
  stoneMesh.receiveShadow = true;
  root.add(stoneMesh);
  const darkMesh = new THREE.Mesh(mergeGeometries(dark, false), mats.stoneDark);
  darkMesh.castShadow = true;
  darkMesh.receiveShadow = true;
  root.add(darkMesh);
  const paleMesh = new THREE.Mesh(mergeGeometries(pale, false), mats.paving);
  paleMesh.castShadow = true;
  paleMesh.receiveShadow = true;
  root.add(paleMesh);
  const rockMesh = new THREE.Mesh(mergeGeometries(rock, false), mats.rock);
  rockMesh.castShadow = true;
  rockMesh.receiveShadow = true;
  root.add(rockMesh);
  const greenMesh = new THREE.Mesh(mergeGeometries(green, false), mats.foliageDark);
  greenMesh.castShadow = true;
  greenMesh.receiveShadow = true;
  root.add(greenMesh);
  for (const [list, mat] of [
    [wood, mats.wood],
    [lantern, mats.lantern],
    [copper, mats.copper],
    [gold, mats.goldBright],
  ]) {
    if (!list.length) continue;
    const m = new THREE.Mesh(mergeGeometries(list, false), mat);
    m.castShadow = true;
    m.receiveShadow = true;
    root.add(m);
  }
}

function addTree(trunks, pine, broad, x, y, z, s, kind) {
  addCylinder(trunks, 0.34 * s, 0.52 * s, 5.2 * s, 6, x, y + 2.6 * s, z);
  if (kind === 'pine') {
    for (let i = 0; i < 3; i++) {
      const r = (3.6 - i * 0.8) * s;
      const h = (5.6 - i * 0.9) * s;
      const g = new THREE.ConeGeometry(r, h, 7);
      g.translate(x, y + (4.2 + i * 2.9) * s, z);
      pine.push(g);
    }
  } else {
    const g = new THREE.DodecahedronGeometry(3.4 * s, 0);
    g.scale(1.2, 1.05, 1.1);
    g.translate(x, y + 6.3 * s, z);
    broad.push(g);
    const h = new THREE.DodecahedronGeometry(2.2 * s, 0);
    h.translate(x + 1.7 * s, y + 5.1 * s, z - 1.2 * s);
    broad.push(h);
  }
}

function buildTrees(root) {
  const trunks = [];
  const pine = [];
  const broad = [];
  const rand = rng(47);
  for (let i = 0; i < 120; i++) {
    const a = rand() * Math.PI * 2;
    const r = 285 + rand() * 230;
    const x = Math.cos(a) * r;
    const z = -70 + Math.sin(a) * r * 0.85;
    if (z > 150 && z < 395 && Math.abs(x) < 205) continue;
    addTree(trunks, pine, broad, x, 0, z, 0.8 + rand() * 0.9, rand() > 0.35 ? 'pine' : 'broad');
  }
  for (let i = 0; i < 34; i++) {
    const x = -235 + rand() * 470;
    const z = -175 + rand() * 70;
    addTree(trunks, pine, broad, x, 42, z, 0.55 + rand() * 0.5, rand() > 0.4 ? 'pine' : 'broad');
  }
  for (let i = 0; i < 52; i++) {
    const a = rand() * Math.PI * 2;
    const r = 208 + rand() * 92;
    const x = Math.cos(a) * r;
    const z = -70 + Math.sin(a) * r * 0.9;
    if (z > 118 && z < 400 && Math.abs(x) < 218) continue;
    addTree(trunks, pine, broad, x, 0, z, 0.55 + rand() * 0.75, rand() > 0.45 ? 'pine' : 'broad');
  }
  for (let i = 0; i < 26; i++) {
    const side = rand() > 0.5 ? 1 : -1;
    const x = side * (335 + rand() * 265);
    const z = 330 + rand() * 190;
    addTree(trunks, pine, broad, x, 0, z, 0.7 + rand() * 0.8, rand() > 0.5 ? 'pine' : 'broad');
  }
  for (let i = 0; i < 28; i++) {
    const x = -360 + rand() * 720;
    const z = 390 + rand() * 430;
    addTree(trunks, pine, broad, x, 0, z, 0.7 + rand() * 0.8, 'broad');
  }
  const trunkMesh = new THREE.Mesh(mergeGeometries(trunks, false), mats.trunk);
  trunkMesh.castShadow = true;
  root.add(trunkMesh);
  const pineMesh = new THREE.Mesh(mergeGeometries(pine, false), mats.foliageDark);
  pineMesh.castShadow = true;
  pineMesh.receiveShadow = true;
  root.add(pineMesh);
  const broadParts = broad.map((g) => (g.index ? g.toNonIndexed() : g));
  const broadMesh = new THREE.Mesh(mergeGeometries(broadParts, false), mats.foliage);
  broadMesh.castShadow = true;
  broadMesh.receiveShadow = true;
  root.add(broadMesh);
}

function vertexColorCone(radius, height, segments, base, top, snow) {
  const g = new THREE.ConeGeometry(radius, height, segments, 1, false).toNonIndexed();
  const pos = g.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const y = (pos.getY(i) + height / 2) / height;
    c.copy(base).lerp(top, Math.min(1, y * 1.5));
    if (y > 0.66) c.lerp(snow, Math.min(1, (y - 0.66) / 0.3) * 0.9);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return g;
}

function buildMountains(root) {
  const list = [];
  const rand = rng(73);
  const base = new THREE.Color(0x6b6350);
  const top = new THREE.Color(0x8a8172);
  const snow = new THREE.Color(0xf2f1e8);
  for (let i = 0; i < 62; i++) {
    const a = (i / 62) * Math.PI * 2 + rand() * 0.08;
    const r = 1850 + rand() * 1250;
    const h = 250 + rand() * 430;
    const rad = 300 + rand() * 440;
    const g = vertexColorCone(rad, h, 5 + (rand() * 3 | 0), base, top, snow);
    g.scale(1.1 + rand() * 0.7, 1, 0.8 + rand() * 0.8);
    g.rotateY(rand() * 3);
    g.translate(Math.cos(a) * r, -30 + h / 2, Math.sin(a) * r);
    list.push(g);
  }
  for (let i = 0; i < 20; i++) {
    const a = rand() * Math.PI * 2;
    const r = 1050 + rand() * 600;
    const h = 90 + rand() * 185;
    const g = vertexColorCone(240 + rand() * 260, h, 5, new THREE.Color(0x5c6347), new THREE.Color(0x7b7458), new THREE.Color(0xc9c0a8));
    g.scale(1.3, 1, 0.7);
    g.translate(Math.cos(a) * r, -20 + h / 2, Math.sin(a) * r);
    list.push(g);
  }
  for (let i = 0; i < 22; i++) {
    const a = rand() * Math.PI * 2;
    const r = 1450 + rand() * 1050;
    const h = 420 + rand() * 620;
    const g = vertexColorCone(
      150 + rand() * 230, h, 6 + (rand() * 3 | 0),
      new THREE.Color(0x59564e), new THREE.Color(0x817d72), new THREE.Color(0xf7f6ee)
    );
    g.scale(0.9 + rand() * 0.7, 1, 0.65 + rand() * 0.5);
    g.rotateY(rand() * 3);
    g.translate(Math.cos(a) * r, -35 + h / 2, Math.sin(a) * r);
    list.push(g);
  }
  for (let i = 0; i < 16; i++) {
    const a = rand() * Math.PI * 2;
    const r = 1250 + rand() * 600;
    const h = 120 + rand() * 210;
    const g = vertexColorCone(
      260 + rand() * 240, h, 5,
      new THREE.Color(0x5e5d48), new THREE.Color(0x7b765c), new THREE.Color(0xd8d2bd)
    );
    g.scale(1.25, 1, 0.65);
    g.translate(Math.cos(a) * r, -25 + h / 2, Math.sin(a) * r);
    list.push(g);
  }
  const geo = mergeGeometries(list, false);
  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 1,
    flatShading: true,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = false;
  root.add(mesh);

  const caps = [];
  for (let i = 0; i < 12; i++) {
    const a = rand() * Math.PI * 2;
    const r = 2450 + rand() * 900;
    const h = 330 + rand() * 460;
    const g = new THREE.ConeGeometry(150 + rand() * 210, h, 7, 1, false);
    g.scale(1.25, 1, 0.7);
    g.rotateY(rand() * 3);
    g.translate(Math.cos(a) * r, -20 + h / 2, Math.sin(a) * r);
    caps.push(g);
  }
  const capMesh = new THREE.Mesh(mergeGeometries(caps, false), mats.snow);
  capMesh.receiveShadow = false;
  root.add(capMesh);
}

function buildValley(root) {
  const green = [];
  const gold = [];
  const brown = [];
  const houses = [];
  const roofs = [];
  const windows = [];
  const rand = rng(211);
  for (let i = 0; i < 58; i++) {
    const x = -1050 + rand() * 2100;
    const z = 420 + rand() * 1020;
    if (Math.abs(x) < 300 && z < 720) continue;
    const w = 70 + rand() * 170;
    const d = 40 + rand() * 100;
    const ry = (rand() - 0.5) * 0.24;
    const list = i % 3 === 0 ? green : i % 3 === 1 ? gold : brown;
    addBox(list, w, 0.22, d, x, -0.16, z, ry);
    if (i % 2 === 0) {
      addBox(list, 3.2, 0.4, d + 2, x - w / 2 + 2.4, -0.02, z, ry);
    }
  }
  for (let c = 0; c < 12; c++) {
    const cx = -900 + rand() * 1800;
    const cz = 470 + rand() * 880;
    if (Math.abs(cx) < 290 && cz < 760) continue;
    const n = 3 + (rand() * 5 | 0);
    for (let h = 0; h < n; h++) {
      const x = cx + (rand() - 0.5) * 150;
      const z = cz + (rand() - 0.5) * 120;
      const w = 6 + rand() * 6;
      const d = 5 + rand() * 5;
      const hh = 3.6 + rand() * 3.6;
      const ry = (rand() - 0.5) * 0.3;
      addBox(houses, w, hh, d, x, hh / 2, z, ry);
      addBox(roofs, w + 1.1, 0.34, d + 1.1, x, hh + 0.17, z, ry);
      addBox(houses, w + 0.35, 0.7, d + 0.35, x, hh + 0.62, z, ry);
      addBox(windows, 1.0, 1.0, 0.12, x + Math.sin(ry) * (d / 2 + 0.05), hh * 0.58, z + Math.cos(ry) * (d / 2 + 0.05), ry);
      if (rand() > 0.55) {
        addBox(houses, w * 0.55, hh * 0.55, d * 0.6, x, hh + hh * 0.27, z, ry);
        addBox(roofs, w * 0.6, 0.28, d * 0.66, x, hh + hh * 0.56, z, ry);
      }
      if (rand() > 0.5) {
        addBox(green, 16, 0.2, 12, x + 14, -0.1, z + 9, ry);
        addBox(roofs, 0.3, 1.7, 12, x + 6.4, 0.85, z + 9, ry);
      }
    }
  }
  for (const [list, mat] of [
    [green, mats.fieldGreen],
    [gold, mats.fieldGold],
    [brown, mats.fieldBrown],
    [houses, mats.white],
    [roofs, mats.trim],
    [windows, mats.window],
  ]) {
    if (!list.length) continue;
    const mesh = new THREE.Mesh(mergeGeometries(list, false), mat);
    mesh.castShadow = list === houses || list === roofs;
    mesh.receiveShadow = true;
    root.add(mesh);
  }
}

export function buildTerrain(root) {
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(7600, 7600), mats.ground);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.35;
  ground.receiveShadow = true;
  root.add(ground);

  buildValley(root);
  buildMountains(root);
  buildHill(root);
  buildTrees(root);
}
