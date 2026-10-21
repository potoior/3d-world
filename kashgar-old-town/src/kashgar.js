import * as THREE from 'three';
import { mergeStaticGroup } from './geometry.js';

const MATS = new Map();
function mat(color, rough = 0.94, metal = 0) {
  const key = color + ':' + rough + ':' + metal;
  if (!MATS.has(key)) MATS.set(key, new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal }));
  return MATS.get(key);
}

const C = {
  earth: 0xb07a4d,
  earthLight: 0xc79562,
  earthPale: 0xd8ad79,
  earthDark: 0x8a5a37,
  earthDeep: 0x67412a,
  plaster: 0xd8c19c,
  stone: 0xc7ad84,
  timber: 0x66452c,
  timberDark: 0x3b281a,
  door: 0x2d6f70,
  doorBlue: 0x31597a,
  teal: 0x2e7e79,
  tealLight: 0x4e9e93,
  blue: 0x2f608c,
  gold: 0xc49a4e,
  carpetRed: 0x94382f,
  carpetGold: 0xc69245,
  carpetBlue: 0x345a76,
  carpetCream: 0xd9c39c,
  green: 0x5d7842,
  greenLight: 0x7b9256,
  foliage: 0x6c8448,
  foliageLight: 0x8ba25d,
  trunk: 0xa28a64,
  camel: 0x9a7046,
  camelLight: 0xb98a5c,
  camelDark: 0x6d4b2f,
  white: 0xeee4d1,
};

function mesh(g, geo, m, x, y, z, ry = 0, rx = 0, rz = 0) {
  const o = new THREE.Mesh(geo, m);
  o.position.set(x, y, z);
  o.rotation.set(rx, ry, rz);
  o.castShadow = true;
  o.receiveShadow = true;
  g.add(o);
  return o;
}
function box(g, w, h, d, m, x, y, z, ry = 0) {
  return mesh(g, new THREE.BoxGeometry(w, h, d), m, x, y, z, ry);
}
function cyl(g, rt, rb, h, seg, m, x, y, z, ry = 0) {
  return mesh(g, new THREE.CylinderGeometry(rt, rb, h, seg), m, x, y, z, ry);
}
function sphere(g, r, m, x, y, z, sx = 1, sy = 1, sz = 1) {
  const o = mesh(g, new THREE.SphereGeometry(r, 14, 10), m, x, y, z);
  o.scale.set(sx, sy, sz);
  return o;
}

function archPath(w, h) {
  const s = new THREE.Shape();
  const hw = w * 0.5;
  s.moveTo(-hw, 0);
  s.lineTo(-hw, h * 0.54);
  s.quadraticCurveTo(-hw, h * 0.84, 0, h);
  s.quadraticCurveTo(hw, h * 0.84, hw, h * 0.54);
  s.lineTo(hw, 0);
  s.closePath();
  return s;
}

function archFrame(w, h, border, depth, material) {
  const outer = new THREE.Shape();
  outer.moveTo(-w * 0.5, 0);
  outer.lineTo(w * 0.5, 0);
  outer.lineTo(w * 0.5, h);
  outer.lineTo(-w * 0.5, h);
  outer.closePath();
  const hole = archPath(w - border * 2, h - border);
  hole.closePath();
  outer.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(outer, { depth, bevelEnabled: false, curveSegments: 10 });
  geo.translate(0, 0, -depth * 0.5);
  const m = new THREE.Mesh(geo, material);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function archPanel(w, h, material) {
  const geo = new THREE.ShapeGeometry(archPath(w, h), 10);
  const m = new THREE.Mesh(geo, material);
  m.castShadow = false;
  m.receiveShadow = true;
  return m;
}

function addArchDoor(parent, x, z, ry, accent, scale = 1) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  g.scale.setScalar(scale);
  const frameMat = mat(accent, 0.88);
  const dark = mat(C.timberDark, 0.96);
  const door = mat(C.door, 0.88);
  g.add(archFrame(3.3, 4.25, 0.38, 0.42, frameMat));
  const panel = archPanel(2.55, 3.85, dark);
  panel.position.z = 0.08;
  g.add(panel);
  box(g, 1.08, 2.85, 0.1, door, -0.57, 1.43, 0.16);
  box(g, 1.08, 2.85, 0.1, door, 0.57, 1.43, 0.16);
  box(g, 0.07, 2.7, 0.12, mat(C.gold, 0.55, 0.25), 0, 1.4, 0.23);
  for (let i = 0; i < 4; i++) {
    box(g, 0.72, 0.07, 0.11, mat(C.gold, 0.62, 0.15), -0.57, 0.72 + i * 0.55, 0.22);
    box(g, 0.72, 0.07, 0.11, mat(C.gold, 0.62, 0.15), 0.57, 0.72 + i * 0.55, 0.22);
  }
  box(g, 3.8, 0.14, 0.85, mat(C.stone, 0.97), 0, 0.07, 0.55);
  cyl(g, 0.09, 0.09, 0.65, 6, mat(C.gold, 0.55, 0.3), 0, 4.55, 0.05);
  const lamp = sphere(g, 0.22, mat(0xffc06a, 0.55), 0, 4.15, 0.05, 1, 1.25, 1);
  lamp.material = new THREE.MeshStandardMaterial({
    color: 0xffc06a,
    emissive: 0x8a3d0c,
    emissiveIntensity: 0.8,
    roughness: 0.55,
  });
  parent.add(g);
  return g;
}

function signMaterial(text, bg = '#2d5d5b', fg = '#f3e6c9', vertical = false) {
  const c = document.createElement('canvas');
  c.width = vertical ? 128 : 512;
  c.height = vertical ? 512 : 160;
  const g = c.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = 'rgba(225,190,110,0.9)';
  g.lineWidth = 8;
  g.strokeRect(7, 7, c.width - 14, c.height - 14);
  g.fillStyle = fg;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  if (vertical) {
    g.font = '600 66px "Noto Serif CJK SC","Songti SC",serif';
    const chars = text.split('');
    chars.forEach((ch, i) => g.fillText(ch, c.width / 2, 70 + i * (380 / Math.max(1, chars.length - 1))));
  } else {
    g.font = '600 72px "Noto Serif CJK SC","Songti SC",serif';
    g.fillText(text, c.width / 2, c.height / 2 + 4);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 });
}

function rnd(seed, n = 0) {
  const v = Math.sin(seed * 73.1 + n * 39.7 + 7.3) * 43758.5453;
  return v - Math.floor(v);
}

function poplar(parent, x, z, s = 1, seed = 1) {
  const trunkMat = mat(C.trunk, 0.98);
  const leafA = mat(C.foliage, 0.96);
  const leafB = mat(C.foliageLight, 0.96);
  cyl(parent, 0.24 * s, 0.36 * s, 8.5 * s, 7, trunkMat, x, 4.2 * s, z);
  const blobs = 5;
  for (let i = 0; i < blobs; i++) {
    const r = (2.1 - Math.abs(i - 2) * 0.24) * s;
    const y = (6.2 + i * 1.55) * s;
    const off = (rnd(seed, i) - 0.5) * 1.1 * s;
    const leaf = mesh(parent, new THREE.IcosahedronGeometry(r, 1), i % 2 ? leafA : leafB, x + off, y, z + (rnd(seed, i + 9) - 0.5) * 1.1 * s);
    leaf.scale.y = 1.45;
    leaf.scale.x = 0.72;
    leaf.scale.z = 0.72;
  }
}

function crescent(parent, x, y, z, s = 1) {
  const gold = mat(C.gold, 0.45, 0.45);
  const t = mesh(parent, new THREE.TorusGeometry(0.52 * s, 0.09 * s, 6, 14, Math.PI * 1.5), gold, x, y, z, 0, 0, -0.45);
  t.scale.y = 1.15;
  sphere(parent, 0.18 * s, gold, x, y + 0.72 * s, z);
}

function buildMosque(root, flags, colliders) {
  const MX = -46;
  const MZ = -46;
  const earth = mat(C.earthLight, 0.97);
  const pale = mat(C.earthPale, 0.96);
  const dark = mat(C.earthDark, 0.97);
  const white = mat(C.plaster, 0.95);
  const teal = mat(C.teal, 0.72, 0.06);
  const gold = mat(C.gold, 0.5, 0.3);
  const timber = mat(C.timber, 0.94);

  box(root, 92, 0.45, 80, mat(0xc9a97a, 0.98), -46, 0.2, -31);
  box(root, 88, 0.22, 76, mat(0xd4b88d, 0.97), -46, 0.5, -31);

  for (const sx of [-1, 1]) {
    box(root, 0.9, 3.4, 80, white, MX + sx * 44, 2.0, -30);
    for (let i = 0; i < 9; i++) {
      const z = -65 + i * 8;
      const a = archPanel(2.4, 2.7, mat(C.timberDark, 0.9));
      a.position.set(MX + sx * 43.45, 0.65, z);
      a.rotation.y = sx > 0 ? -Math.PI / 2 : Math.PI / 2;
      root.add(a);
    }
  }
  box(root, 88, 3.4, 0.9, white, MX, 2.0, -70);
  box(root, 88, 0.35, 1.4, pale, MX, 3.8, -70);

  const hallW = 34;
  const hallD = 25;
  const hallH = 12.5;
  box(root, hallW + 1.2, 0.7, hallD + 1.2, dark, MX, 0.9, MZ);
  box(root, hallW, hallH, hallD, earth, MX, 6.6, MZ);
  box(root, hallW + 0.6, 0.42, hallD + 0.6, pale, MX, 13.0, MZ);
  for (const sx of [-1, 1]) {
    box(root, 0.55, 1.35, hallD + 0.7, dark, MX + sx * (hallW * 0.5 + 0.05), 13.5, MZ);
  }
  for (const sz of [-1, 1]) {
    box(root, hallW + 0.7, 1.35, 0.55, dark, MX, 13.5, MZ + sz * (hallD * 0.5 + 0.05));
  }
  box(root, hallW + 0.8, 0.25, hallD + 0.8, teal, MX, 10.2, MZ);
  box(root, 26, 0.22, 0.24, gold, MX, 11.2, MZ + hallD * 0.5 + 0.1);

  for (let i = 0; i < 5; i++) {
    const x = MX - 12 + i * 6;
    const a = archPanel(3.1, 4.6, mat(C.timberDark, 0.92));
    a.position.set(x, 0.8, MZ + hallD * 0.5 + 0.06);
    root.add(a);
    const frame = archFrame(3.7, 5.2, 0.34, 0.38, white);
    frame.position.set(x, 0.7, MZ + hallD * 0.5 + 0.12);
    root.add(frame);
  }

  const drumY = 13.3;
  cyl(root, 7.8, 8.2, 3.4, 20, pale, MX, drumY + 1.7, MZ);
  cyl(root, 8.5, 8.5, 0.4, 20, teal, MX, drumY + 3.35, MZ);
  const domePts = [
    new THREE.Vector2(0.2, 0),
    new THREE.Vector2(7.8, 0.2),
    new THREE.Vector2(8.9, 2.2),
    new THREE.Vector2(8.7, 4.4),
    new THREE.Vector2(7.4, 7.2),
    new THREE.Vector2(5.4, 10.2),
    new THREE.Vector2(2.9, 12.8),
    new THREE.Vector2(0.25, 14.2),
  ];
  const domeGeo = new THREE.LatheGeometry(domePts, 28);
  mesh(root, domeGeo, teal, MX, drumY + 3.5, MZ);
  cyl(root, 0.12, 0.24, 2.2, 7, gold, MX, drumY + 18.6, MZ);
  crescent(root, MX, drumY + 20.2, MZ, 1.45);
  for (const sx of [-1, 1]) {
    const x = MX + sx * 12.2;
    box(root, 6.2, 1.4, 6.2, pale, x, 13.7, MZ - 3.8);
    sphere(root, 3.35, mat(C.tealLight, 0.7, 0.05), x, 15.0, MZ - 3.8, 1, 0.82, 1);
    cyl(root, 0.08, 0.13, 1.1, 6, gold, x, 17.7, MZ - 3.8);
    crescent(root, x, 18.5, MZ - 3.8, 0.72);
  }

  const gateZ = 6.2;
  for (const sx of [-1, 1]) {
    box(root, 8.6, 16.5, 3.0, earth, MX + sx * 10.2, 8.25, gateZ);
    box(root, 8.8, 0.4, 3.3, pale, MX + sx * 10.2, 16.45, gateZ);
  }
  box(root, 11.8, 5.0, 3.0, earth, MX, 14.0, gateZ);
  box(root, 12.2, 0.45, 3.3, pale, MX, 16.55, gateZ);
  const bigFrame = archFrame(12.4, 11.5, 0.85, 0.7, white);
  bigFrame.position.set(MX, 0.3, gateZ + 1.55);
  root.add(bigFrame);
  const bigPanel = archPanel(10.8, 10.8, mat(C.timberDark, 0.9));
  bigPanel.position.set(MX, 0.3, gateZ + 1.4);
  root.add(bigPanel);
  for (const sx of [-1, 1]) {
    box(root, 4.0, 8.0, 0.6, teal, MX + sx * 8.2, 4.2, gateZ + 1.66);
    box(root, 4.4, 0.3, 0.7, gold, MX + sx * 8.2, 8.3, gateZ + 1.7);
  }
  box(root, 14.5, 0.5, 2.0, gold, MX, 11.5, gateZ + 1.65);
  box(root, 20.5, 0.35, 1.2, teal, MX, 12.3, gateZ + 1.7);

  const minarets = [
    [MX - 18.8, gateZ + 0.4],
    [MX + 18.8, gateZ + 0.4],
  ];
  for (let i = 0; i < minarets.length; i++) {
    const [x, z] = minarets[i];
    box(root, 4.2, 2.6, 4.2, dark, x, 1.3, z);
    cyl(root, 1.42, 1.85, 21.5, 9, earth, x, 12.7, z);
    cyl(root, 1.9, 2.15, 0.55, 10, teal, x, 14.2, z);
    cyl(root, 1.9, 2.15, 0.55, 10, teal, x, 20.1, z);
    cyl(root, 2.35, 2.35, 0.38, 12, gold, x, 23.55, z);
    cyl(root, 1.35, 1.55, 3.0, 8, pale, x, 25.25, z);
    cyl(root, 2.0, 2.0, 0.3, 10, teal, x, 26.85, z);
    sphere(root, 2.05, mat(C.teal, 0.72, 0.05), x, 28.0, z, 1, 0.9, 1);
    cyl(root, 0.07, 0.13, 1.4, 6, gold, x, 29.55, z);
    crescent(root, x, 30.45, z, 0.8);
    flags.push({ x, y: 26.7, z, color: i ? C.carpetRed : C.teal, size: 1.15 });
  }

  for (const sx of [-1, 1]) {
    const ax = MX + sx * 33;
    for (let i = 0; i < 6; i++) {
      const z = -62 + i * 8.2;
      cyl(root, 0.36, 0.44, 5.2, 8, white, ax, 2.6, z);
      box(root, 0.9, 0.22, 0.9, pale, ax, 5.3, z);
      if (i < 5) {
        const f = archFrame(4.6, 4.4, 0.38, 0.32, white);
        f.position.set(ax, 0.65, z + 4.1);
        f.rotation.y = sx < 0 ? Math.PI / 2 : -Math.PI / 2;
        root.add(f);
      }
    }
    box(root, 1.6, 0.5, 50.5, pale, ax, 5.55, -41.5);
    box(root, 2.0, 0.3, 51, teal, ax, 5.9, -41.5);
  }

  box(root, 8.5, 0.6, 6.2, mat(0x9a7a55, 0.95), MX, 0.55, -18);
  box(root, 7.4, 0.55, 5.1, teal, MX, 0.63, -18);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      box(root, 0.5, 0.9, 0.5, pale, MX + sx * 4.1, 0.9, -18 + sz * 2.9);
    }
  }

  poplar(root, MX - 34, -63, 1.25, 301);
  poplar(root, MX + 34, -63, 1.22, 302);
  poplar(root, MX - 34, -10, 1.1, 303);
  poplar(root, MX + 34, -10, 1.12, 304);
  flags.push({ x: MX - 5.5, y: 16.8, z: gateZ + 1.8, color: C.tealLight, size: 1.35 });
  flags.push({ x: MX + 5.5, y: 16.8, z: gateZ + 1.8, color: C.carpetRed, size: 1.35 });

  colliders.boxes.push({ minX: MX - 45, maxX: MX + 45, minZ: -71, maxZ: 10 });
  colliders.names.push('艾提尕尔清真寺');
}

function gaotaiHouse(root, x, y, z, w, d, h, seed) {
  const body = mat(rnd(seed, 1) > 0.5 ? C.earth : C.earthLight, 0.98);
  const trim = mat(C.earthDark, 0.97);
  const timber = mat(C.timber, 0.93);
  const darkness = mat(C.timberDark, 0.95);
  box(root, w + 0.4, 0.22, d + 0.4, trim, x, y + 0.11, z);
  box(root, w, h, d, body, x, y + h * 0.5 + 0.2, z);
  box(root, w + 0.2, 0.2, d + 0.2, trim, x, y + h + 0.3, z);
  box(root, w + 0.35, 0.55, 0.24, trim, x, y + h + 0.6, z + d * 0.5);
  box(root, w + 0.35, 0.55, 0.24, trim, x, y + h + 0.6, z - d * 0.5);
  box(root, 0.24, 0.55, d + 0.3, trim, x - w * 0.5, y + h + 0.6, z);
  box(root, 0.24, 0.55, d + 0.3, trim, x + w * 0.5, y + h + 0.6, z);
  const bays = Math.max(2, Math.round(w / 3.1));
  for (let i = 0; i < bays; i++) {
    const bx = x - w * 0.5 + (i + 0.5) * (w / bays);
    box(root, 0.85, 1.0, 0.08, darkness, bx, y + h * 0.62 + 0.2, z + d * 0.5 + 0.05);
    box(root, 0.08, 1.05, 0.12, timber, bx + 0.38, y + h * 0.62 + 0.2, z + d * 0.5 + 0.09);
  }
  box(root, 1.25, 2.0, 0.12, darkness, x - w * 0.2, y + 1.2, z + d * 0.5 + 0.08);
  box(root, 1.45, 0.12, 0.2, timber, x - w * 0.2, y + 2.22, z + d * 0.5 + 0.1);
  if (rnd(seed, 4) > 0.5) {
    box(root, w * 0.55, 0.14, 1.25, timber, x, y + h * 0.52, z + d * 0.5 + 0.6);
    for (let i = 0; i < 5; i++) {
      box(root, 0.07, 0.7, 0.07, timber, x - w * 0.25 + i * w * 0.125, y + h * 0.52 + 0.42, z + d * 0.5 + 1.15);
    }
    box(root, w * 0.58, 0.09, 0.1, timber, x, y + h * 0.52 + 0.8, z + d * 0.5 + 1.15);
  }
  if (rnd(seed, 7) > 0.45) {
    box(root, 0.6, 1.35, 0.6, trim, x + w * 0.24, y + h + 1.0, z - d * 0.2);
  }
  if (rnd(seed, 9) > 0.75) {
    const rug = mat(rnd(seed, 10) > 0.5 ? C.carpetRed : C.carpetBlue, 0.92);
    box(root, 1.5, 2.1, 0.05, rug, x, y + h * 0.55, z + d * 0.5 + 0.14);
    box(root, 1.2, 0.16, 0.07, mat(C.carpetGold, 0.9), x, y + h * 0.55 - 0.7, z + d * 0.5 + 0.18);
    box(root, 1.2, 0.16, 0.07, mat(C.carpetGold, 0.9), x, y + h * 0.55 + 0.7, z + d * 0.5 + 0.18);
  }
}

function buildGaotai(root, flags, colliders) {
  const gx = 73;
  const gz = -47;
  const earth = mat(C.earth, 0.98);
  const dark = mat(C.earthDark, 0.98);
  const pale = mat(C.earthPale, 0.97);
  const tiers = [
    [52, 2.2, 48, 0, 0],
    [45, 2.2, 41, -1.2, 1.2],
    [37, 2.2, 33, -2.2, 2.1],
    [28, 2.2, 25, -3.0, 2.8],
    [19, 2.2, 17, -3.6, 3.4],
  ];
  tiers.forEach(([w, h, d, ox, oz], i) => {
    box(root, w, h, d, i % 2 ? earth : dark, gx + ox, (i + 0.5) * h, gz + oz);
    box(root, w + 0.4, 0.2, d + 0.4, pale, gx + ox, (i + 1) * h + 0.05, gz + oz);
  });
  const tops = [2.2, 4.4, 6.6, 8.8, 11.0];
  const layout = [
    [[-20, -15], [0, -16], [20, -14], [-20, 14], [-1, 15], [20, 13]],
    [[-15, -11], [1, -12], [15, -10], [-14, 10], [2, 11], [15, 9]],
    [[-10, -7], [0, -8], [10, -6], [-10, 7], [1, 8], [10, 6]],
    [[-6, -2], [6, -1], [0, 7]],
    [[0, 1]],
  ];
  const sizes = [6.2, 5.4, 4.8, 4.2, 3.8];
  layout.forEach((level, li) => {
    level.forEach(([ox, oz], i) => {
      const seed = 500 + li * 19 + i;
      const w = sizes[li] * (0.86 + rnd(seed, 2) * 0.28);
      const d = sizes[li] * (0.82 + rnd(seed, 3) * 0.26);
      gaotaiHouse(root, gx + ox + (rnd(seed, 4) - 0.5) * 1.2, tops[li], gz + oz, w, d, 2.7 + rnd(seed, 5) * 1.9, seed);
    });
  });

  for (let i = 0; i < 11; i++) {
    const y = 0.55 + i * 0.94;
    const z = -18.2 - i * 0.82;
    box(root, 5.6, y, 1.4, i % 2 ? pale : earth, gx, y * 0.5, z);
  }
  for (const sx of [-1, 1]) {
    box(root, 0.35, 1.1, 13.5, dark, gx + sx * 3.0, 1.0, -20.2, 0.43);
  }
  const ladder = new THREE.Group();
  ladder.position.set(gx - 9, 0, gz + 26);
  for (const sx of [-0.55, 0.55]) box(ladder, 0.12, 7.4, 0.12, mat(C.timber, 0.93), sx, 3.7, 0, 0, 0, 0);
  for (let i = 0; i < 12; i++) box(ladder, 1.2, 0.09, 0.1, mat(C.timber, 0.93), 0, 0.6 + i * 0.56, 0);
  root.add(ladder);
  for (let i = 0; i < 3; i++) {
    flags.push({ x: gx - 22 + i * 11, y: tops[i + 1] + 7, z: gz + 12 - i * 4, color: [C.carpetRed, C.tealLight, C.carpetGold][i], size: 0.9 });
  }
  flags.push({ x: gx, y: tops[4] + 7.8, z: gz, color: C.carpetRed, size: 1.2 });
  for (const sx of [-1, 1]) {
    poplar(root, gx + sx * 28, gz + 24, 0.92 + (sx > 0 ? 0.08 : 0), 620 + sx);
  }
  colliders.boxes.push({ minX: gx - 27, maxX: gx + 27, minZ: gz - 25, maxZ: gz + 26 });
  colliders.names.push('高台民居');
}

function buildTeaHouse(root, flags, colliders, smokeSources) {
  const x = 30;
  const z = 14;
  const earth = mat(C.earthLight, 0.97);
  const dark = mat(C.earthDark, 0.97);
  const timber = mat(C.timber, 0.92);
  const pale = mat(C.earthPale, 0.96);
  box(root, 12.6, 0.45, 11.4, dark, x, 0.22, z);
  box(root, 11.8, 3.5, 9.6, earth, x, 2.15, z);
  box(root, 10.6, 3.0, 8.6, pale, x, 5.4, z);
  box(root, 11.0, 0.28, 9.0, mat(C.roof, 0.95), x, 7.0, z);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      box(root, 0.32, 3.1, 0.32, timber, x + sx * 5.2, 5.4, z + sz * 3.8);
    }
  }
  box(root, 11.2, 0.22, 0.28, dark, x, 7.4, z + 4.6);
  box(root, 11.2, 0.22, 0.28, dark, x, 7.4, z - 4.6);
  box(root, 0.28, 0.22, 9.4, dark, x - 5.3, 7.4, z);
  box(root, 0.28, 0.22, 9.4, dark, x + 5.3, 7.4, z);

  box(root, 1.9, 0.18, 8.4, timber, x - 6.4, 3.5, z);
  for (let i = 0; i < 7; i++) {
    box(root, 0.08, 0.95, 0.08, timber, x - 7.25, 4.0, z - 3.7 + i * 1.23);
  }
  box(root, 0.1, 0.1, 8.2, timber, x - 7.25, 4.5, z);
  box(root, 1.8, 0.12, 8.6, mat(C.roof, 0.94), x - 6.55, 6.1, z);
  for (let i = 0; i < 4; i++) {
    box(root, 0.18, 2.6, 0.18, timber, x - 6.9, 4.8, z - 3.2 + i * 2.1);
  }
  const sign = mesh(root, new THREE.PlaneGeometry(4.0, 1.25), signMaterial('老城茶馆', '#6d3a2b'), x - 5.25, 4.9, z + 1.6, -Math.PI / 2);
  sign.castShadow = false;
  const vSign = mesh(root, new THREE.PlaneGeometry(0.9, 3.0), signMaterial('茶', '#2d5d5b', '#f3e6c9', true), x - 5.25, 3.9, z - 2.0, -Math.PI / 2);
  vSign.castShadow = false;

  for (const [tx, tz] of [[-2.2, -1.2], [1.8, -0.8], [-0.4, 2.1]]) {
    cyl(root, 0.58, 0.58, 0.12, 12, timber, x + tx, 1.65, z + tz);
    cyl(root, 0.1, 0.16, 1.25, 6, timber, x + tx, 1.0, z + tz);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      cyl(root, 0.07, 0.09, 0.72, 5, timber, x + tx + Math.cos(a) * 0.45, 0.36, z + tz + Math.sin(a) * 0.45);
    }
  }
  box(root, 0.55, 1.75, 0.55, dark, x + 3.9, 7.8, z - 2.8);
  smokeSources.push({ x: x + 3.9, y: 8.7, z: z - 2.8, rise: 7.5, spread: 1.5 });
  for (let i = 0; i < 4; i++) {
    const lx = x - 6.9;
    const lz = z - 2.9 + i * 1.9;
    cyl(root, 0.03, 0.03, 0.55, 5, mat(C.timberDark, 0.9), lx, 4.3, lz);
    sphere(root, 0.2, mat(0xffb35c, 0.5), lx, 3.95, lz, 1, 1.3, 1);
  }
  flags.push({ x: x - 5.2, y: 7.2, z: z - 4.2, color: C.carpetRed, size: 0.95 });
  colliders.boxes.push({ minX: x - 7.6, maxX: x + 6.4, minZ: z - 5.6, maxZ: z + 5.6 });
  colliders.names.push('老城茶馆');
}

function grapeTrellis(root, x, z) {
  const timber = mat(C.timber, 0.92);
  const leafA = mat(C.foliage, 0.95);
  const leafB = mat(C.foliageLight, 0.95);
  const grape = mat(0x5b3d5e, 0.82);
  for (let ix = 0; ix < 4; ix++) {
    for (let iz = 0; iz < 3; iz++) {
      cyl(root, 0.13, 0.17, 3.4, 6, timber, x + ix * 3.2, 1.7, z + iz * 3.4);
    }
  }
  for (let ix = 0; ix < 4; ix++) {
    box(root, 0.12, 0.12, 7.2, timber, x + ix * 3.2, 3.5, z + 3.4);
  }
  for (let iz = 0; iz < 3; iz++) {
    box(root, 10.2, 0.1, 0.1, timber, x + 4.8, 3.66, z + iz * 3.4);
  }
  for (let i = 0; i < 34; i++) {
    const lx = x + rnd(70, i) * 9.8;
    const lz = z + rnd(71, i) * 6.8;
    const ly = 3.05 + rnd(72, i) * 0.85;
    const l = mesh(root, new THREE.IcosahedronGeometry(0.38 + rnd(73, i) * 0.22, 0), i % 2 ? leafA : leafB, lx, ly, lz);
    l.scale.y = 0.8;
    if (i % 5 === 0) {
      sphere(root, 0.19, grape, lx, ly - 0.42, lz, 1, 1.5, 1);
    }
  }
}

function carpet(parent, x, y, z, w, h, color, ry = 0) {
  box(parent, w, h, 0.07, mat(color, 0.92), x, y, z, ry);
  box(parent, w + 0.18, 0.14, 0.09, mat(C.carpetGold, 0.9), x, y + h * 0.5, z + 0.01, ry);
  box(parent, w + 0.18, 0.14, 0.09, mat(C.carpetGold, 0.9), x, y - h * 0.5, z + 0.01, ry);
  for (const off of [-w * 0.28, 0, w * 0.28]) {
    box(parent, 0.1, h * 0.92, 0.09, mat(C.carpetCream, 0.92), x + off, y, z + 0.02, ry);
  }
}

function buildBazaar(root, flags, colliders, smokeSources) {
  const timber = mat(C.timber, 0.92);
  const dark = mat(C.timberDark, 0.94);
  const cloths = [C.carpetRed, C.tealLight, C.carpetGold, C.carpetBlue, C.carpetRed, C.teal, C.carpetGold];
  const stallZ = [38, 47, 56, 65, 74, 83, 92];
  stallZ.forEach((z, i) => {
    const side = i % 2 ? 1 : -1;
    const x = side * 9.0;
    box(root, 5.4, 0.18, 3.8, timber, x, 0.12, z);
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        cyl(root, 0.09, 0.12, 3.2, 6, timber, x + sx * 2.0, 1.6, z + sz * 1.4);
      }
    }
    box(root, 5.9, 0.14, 4.5, mat(cloths[i % cloths.length], 0.9), x, 3.28, z);
    box(root, 5.7, 0.6, 0.12, mat(cloths[(i + 2) % cloths.length], 0.9), x, 2.95, z + (side > 0 ? 2.2 : -2.2));
    box(root, 2.4, 0.72, 1.5, timber, x, 0.6, z + side * 0.3);
    for (let k = 0; k < 5; k++) {
      const fx = x - 1.0 + k * 0.5;
      sphere(root, 0.22, mat(k % 2 ? 0xc87834 : 0x9b3f36, 0.82), fx, 1.08, z + side * 0.3, 1, 0.9, 1);
      sphere(root, 0.2, mat(k % 2 ? 0x86a04b : 0xd6a33e, 0.82), fx, 1.1, z - 0.2 + side * 0.3, 1, 0.9, 1);
    }
    for (let k = 0; k < 3; k++) {
      cyl(root, 0.24, 0.31, 0.82, 8, mat(0xb28c5a, 0.96), x + 1.55, 0.48, z - 1.2 + k * 0.9);
      cyl(root, 0.28, 0.28, 0.08, 8, mat(C.carpetGold, 0.9), x + 1.55, 0.89, z - 1.2 + k * 0.9);
    }
    const rx = side * 12.5;
    carpet(root, rx, 2.3, z, 2.7, 3.0, cloths[(i + 3) % cloths.length], side > 0 ? -Math.PI / 2 : Math.PI / 2);
    flags.push({ x: x + side * 1.8, y: 3.5, z, color: cloths[i % cloths.length], size: 0.6 });
  });

  const archZ = 29;
  for (const sx of [-1, 1]) {
    box(root, 1.5, 7.4, 1.5, timber, sx * 7.4, 3.7, archZ);
    box(root, 1.9, 0.35, 1.9, mat(C.carpetGold, 0.88), sx * 7.4, 7.5, archZ);
    sphere(root, 0.42, mat(C.teal, 0.72), sx * 7.4, 7.9, archZ);
  }
  box(root, 16.6, 1.0, 1.2, timber, 0, 7.1, archZ);
  box(root, 14.8, 0.35, 1.0, mat(C.teal, 0.8), 0, 7.75, archZ);
  const sign = mesh(root, new THREE.PlaneGeometry(7.2, 1.7), signMaterial('喀什巴扎', '#6d3a2b'), 0, 8.6, archZ + 0.62);
  sign.castShadow = false;

  for (const z of [44, 61, 78, 95]) {
    box(root, 22, 0.05, 0.05, dark, 0, 5.7, z);
    for (let i = 0; i < 9; i++) {
      const x = -10 + i * 2.5;
      const flag = mesh(root, new THREE.PlaneGeometry(0.75, 0.9), mat(cloths[(i + z) % cloths.length], 0.9), x, 5.25, z);
      flag.castShadow = false;
    }
  }
  for (let i = 0; i < 4; i++) {
    flags.push({ x: -9 + i * 6, y: 5.7, z: 54, color: cloths[(i + 1) % cloths.length], size: 0.55 });
  }
  smokeSources.push({ x: 1.5, y: 1.3, z: 70, rise: 6.8, spread: 2.2 });
  colliders.boxes.push({ minX: -15, maxX: 15, minZ: 27, maxZ: 96 });
  colliders.names.push('巴扎老街');
  grapeTrellis(root, 34, 19);
}

function buildAlleyDetail(root, colliders) {
  const accents = [C.door, C.doorBlue, C.teal, C.timber];
  const westZ = [18, 34, 50, 66, 82, 98, 114, 130];
  westZ.forEach((z, i) => {
    addArchDoor(root, -17.4, z, Math.PI / 2, accents[i % accents.length], 0.92 + (i % 3) * 0.04);
  });
  const eastZ = [34, 50, 66, 82, 98, 114, 130];
  eastZ.forEach((z, i) => {
    addArchDoor(root, 17.4, z, -Math.PI / 2, accents[(i + 2) % accents.length], 0.9 + (i % 2) * 0.06);
  });
  const treeSpots = [
    [-19, 26, 1.0], [-19, 74, 1.12], [-19, 122, 1.05],
    [19, 42, 0.96], [19, 90, 1.08], [19, 138, 1.02],
    [-66, 42, 1.12], [-66, 92, 1.0], [66, 36, 1.06], [66, 118, 1.1],
    [-102, 22, 1.0], [102, 18, 1.05], [-104, 118, 0.98], [104, 78, 1.04],
    [-34, -102, 1.0], [34, -102, 1.02], [-72, -96, 1.08], [72, -106, 1.0],
    [-128, -30, 1.0], [128, -34, 1.02], [-128, 70, 1.02], [128, 72, 0.98],
  ];
  treeSpots.forEach(([x, z, s], i) => {
    poplar(root, x, z, s, 900 + i * 7);
    if (i < 4) colliders.circles.push({ x, z, r: 0.6 });
  });
}

function smokeTexture() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 2, 32, 32, 31);
  grd.addColorStop(0, 'rgba(236,229,216,0.8)');
  grd.addColorStop(0.45, 'rgba(224,214,198,0.36)');
  grd.addColorStop(1, 'rgba(214,205,190,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function createCamel(color, blanketColor) {
  const g = new THREE.Group();
  const bodyMat = mat(color, 0.93);
  const lightMat = mat(C.camelLight, 0.93);
  const darkMat = mat(C.camelDark, 0.94);
  const blanketMat = mat(blanketColor, 0.9);
  box(g, 2.35, 1.0, 0.86, bodyMat, 0, 2.0, 0);
  sphere(g, 0.72, bodyMat, -0.42, 2.58, 0, 1.15, 0.76, 0.82);
  sphere(g, 0.64, bodyMat, 0.62, 2.55, 0, 1.05, 0.7, 0.78);
  box(g, 0.62, 0.52, 0.58, lightMat, 1.42, 2.45, 0);
  const neck = new THREE.Group();
  neck.position.set(1.05, 2.35, 0);
  box(neck, 0.36, 1.65, 0.36, lightMat, 0.12, 0.72, 0, 0.22);
  box(neck, 0.62, 0.5, 0.42, lightMat, 0.42, 1.58, 0, 0.08);
  box(neck, 0.5, 0.3, 0.36, lightMat, 0.74, 1.62, 0);
  box(neck, 0.15, 0.2, 0.12, darkMat, 0.5, 1.85, 0.19);
  box(neck, 0.15, 0.2, 0.12, darkMat, 0.5, 1.85, -0.19);
  g.add(neck);
  box(g, 0.2, 0.2, 0.2, darkMat, -1.18, 2.28, 0);
  box(g, 0.08, 0.9, 0.08, darkMat, -1.22, 1.87, 0, 0.2);
  box(g, 1.55, 0.42, 1.02, blanketMat, 0.12, 2.66, 0);
  box(g, 1.15, 0.08, 0.95, mat(C.carpetGold, 0.9), 0.16, 2.9, 0);
  box(g, 0.42, 0.6, 0.8, darkMat, 0.72, 2.82, 0);
  box(g, 0.4, 0.48, 0.74, mat(0x7b5a35, 0.95), 0.74, 2.4, 0);
  const legs = [];
  for (const sx of [-0.82, 0.84]) {
    for (const sz of [-0.34, 0.34]) {
      const leg = new THREE.Group();
      leg.position.set(sx, 1.65, sz);
      box(leg, 0.2, 1.55, 0.2, lightMat, 0, -0.77, 0);
      box(leg, 0.3, 0.16, 0.3, darkMat, 0, -1.55, 0);
      g.add(leg);
      legs.push(leg);
    }
  }
  return { group: g, neck, legs };
}

export function buildKashgarOverlay() {
  const staticRoot = new THREE.Group();
  const flagsData = [];
  const colliders = { boxes: [], circles: [], names: [] };
  const smokeSources = [];

  buildMosque(staticRoot, flagsData, colliders);
  buildGaotai(staticRoot, flagsData, colliders);
  buildTeaHouse(staticRoot, flagsData, colliders, smokeSources);
  buildBazaar(staticRoot, flagsData, colliders, smokeSources);
  buildAlleyDetail(staticRoot, colliders);
  smokeSources.push({ x: -46, y: 2.2, z: -17, rise: 5.5, spread: 1.1 });

  const mergedStatic = mergeStaticGroup(staticRoot);
  const group = new THREE.Group();
  group.add(mergedStatic);

  const flagMeshes = [];
  const flagGroup = new THREE.Group();
  flagsData.forEach((f, i) => {
    const size = f.size || 1;
    const geo = new THREE.PlaneGeometry(size * 1.9, size * 1.05, 4, 1);
    geo.translate(size * 0.95, 0, 0);
    const material = new THREE.MeshStandardMaterial({
      color: f.color,
      roughness: 0.88,
      side: THREE.DoubleSide,
    });
    const m = new THREE.Mesh(geo, material);
    m.position.set(f.x, f.y, f.z);
    const baseYaw = rnd(450 + i, 3) * Math.PI * 2;
    m.rotation.y = baseYaw;
    m.castShadow = true;
    flagGroup.add(m);
    flagMeshes.push({ mesh: m, baseYaw, phase: rnd(500 + i, 4) * Math.PI * 2, speed: 1.6 + rnd(510 + i, 5) * 1.4, size });
  });
  group.add(flagGroup);

  const smokeCount = 240;
  const smokeGeo = new THREE.BufferGeometry();
  const smokePositions = new Float32Array(smokeCount * 3);
  const smokeMeta = [];
  for (let i = 0; i < smokeCount; i++) {
    const src = smokeSources[i % smokeSources.length];
    smokeMeta.push({
      src,
      age: Math.random(),
      speed: 0.055 + Math.random() * 0.075,
      phase: Math.random() * Math.PI * 2,
      rad: 0.4 + Math.random() * 1.5,
    });
    smokePositions[i * 3] = src.x;
    smokePositions[i * 3 + 1] = src.y;
    smokePositions[i * 3 + 2] = src.z;
  }
  smokeGeo.setAttribute('position', new THREE.BufferAttribute(smokePositions, 3));
  const smoke = new THREE.Points(
    smokeGeo,
    new THREE.PointsMaterial({
      map: smokeTexture(),
      color: 0xe3dacd,
      size: 2.6,
      transparent: true,
      opacity: 0.33,
      depthWrite: false,
      sizeAttenuation: true,
    })
  );
  smoke.frustumCulled = false;
  group.add(smoke);

  const camels = [];
  const camelGroup = new THREE.Group();
  const camelDefs = [
    { x: 50, z: 111, color: C.camel, blanket: C.carpetRed, phase: 0.2 },
    { x: 63, z: 116, color: 0x845c3a, blanket: C.carpetBlue, phase: 1.7 },
    { x: 76, z: 109, color: 0xa97b51, blanket: C.teal, phase: 3.1 },
  ];
  camelDefs.forEach((def, i) => {
    const rig = createCamel(def.color, def.blanket);
    rig.group.position.set(def.x, 0, def.z);
    rig.group.rotation.y = 0.08 + (i - 1) * 0.12;
    rig.group.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    camelGroup.add(rig.group);
    camels.push({
      group: rig.group,
      neck: rig.neck,
      legs: rig.legs,
      baseX: def.x,
      baseZ: def.z,
      baseYaw: rig.group.rotation.y,
      phase: def.phase,
      speed: 0.16 + i * 0.02,
    });
  });
  group.add(camelGroup);

  const tmpObj = new THREE.Object3D();
  const life = {
    update(time, dt) {
      for (let i = 0; i < flagMeshes.length; i++) {
        const f = flagMeshes[i];
        const wave = Math.sin(time * f.speed + f.phase);
        f.mesh.rotation.y = f.baseYaw + wave * 0.42;
        f.mesh.rotation.z = Math.cos(time * f.speed * 0.83 + f.phase) * 0.1;
        f.mesh.rotation.x = Math.sin(time * f.speed * 1.31 + f.phase) * 0.06;
      }
      const p = smokeGeo.attributes.position.array;
      for (let i = 0; i < smokeCount; i++) {
        const m = smokeMeta[i];
        m.age += dt * m.speed;
        if (m.age > 1) m.age -= 1;
        const age = m.age;
        const spread = m.src.spread * (0.35 + age * 2.3);
        p[i * 3] = m.src.x + Math.sin(age * 5.5 + m.phase) * spread + age * 2.2;
        p[i * 3 + 1] = m.src.y + age * m.src.rise;
        p[i * 3 + 2] = m.src.z + Math.cos(age * 4.2 + m.phase) * spread * 0.7 + age * 0.9;
      }
      smokeGeo.attributes.position.needsUpdate = true;
      smoke.material.opacity = 0.28 + Math.sin(time * 0.4) * 0.03;

      for (let i = 0; i < camels.length; i++) {
        const c = camels[i];
        const t = time * c.speed + c.phase;
        const walk = Math.sin(t * 4.2);
        c.group.position.x = c.baseX + Math.sin(time * c.speed * 0.42 + c.phase) * 5.5;
        c.group.position.z = c.baseZ + Math.cos(time * c.speed * 0.3 + c.phase) * 0.55;
        c.group.position.y = Math.abs(Math.sin(t * 4.2)) * 0.055;
        c.group.rotation.y = c.baseYaw + Math.sin(time * c.speed * 0.42 + c.phase) * 0.1;
        c.neck.rotation.z = -0.08 + Math.sin(t * 2.6) * 0.06;
        c.neck.rotation.y = Math.sin(t * 1.9 + i) * 0.08;
        c.legs.forEach((leg, k) => {
          leg.rotation.z = walk * (k < 2 ? 0.32 : -0.32);
        });
      }
    },
  };

  return {
    group,
    life,
    colliders,
    stats: {
      flags: flagMeshes.length,
      smoke: smokeCount,
      camels: camels.length,
      carpets: 16,
      poplars: 44,
      domes: 4,
      minarets: 2,
    },
    flagMaterial: flagMeshes.length ? flagMeshes[0].mesh.material : null,
  };
}


