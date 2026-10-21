import * as THREE from 'three';
import { mergeStaticGroup, mergedMesh } from './geometry.js';
import { makeWaterMaterial } from './materials.js';

const R = (() => {
  let a = 421;
  return () => ((a = (a * 1664525 + 1013904223) >>> 0) / 4294967296);
})();

function smoothstep(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function surfaceTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 512, 512);
  g.addColorStop(0, '#d8a96c');
  g.addColorStop(0.45, '#c9975c');
  g.addColorStop(1, '#e0b477');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 512);
  ctx.lineCap = 'round';
  for (let i = 0; i < 190; i++) {
    const y = R() * 512;
    const amp = 3 + R() * 10;
    ctx.strokeStyle = `rgba(${R() > 0.5 ? '120,82,46' : '245,214,164'},${0.04 + R() * 0.09})`;
    ctx.lineWidth = 0.6 + R() * 1.8;
    ctx.beginPath();
    for (let x = -10; x <= 522; x += 10) {
      const yy = y + Math.sin(x * 0.026 + i * 0.7) * amp + Math.sin(x * 0.085 + i) * 1.3;
      if (x === -10) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
  for (let i = 0; i < 2600; i++) {
    ctx.fillStyle = R() > 0.45 ? 'rgba(244,216,170,0.2)' : 'rgba(114,78,42,0.18)';
    ctx.beginPath();
    ctx.arc(R() * 512, R() * 512, R() * 1.6 + 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(76, 76);
  t.anisotropy = 8;
  return t;
}

function roofTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#c99331';
  ctx.fillRect(0, 0, 128, 128);
  for (let x = 0; x < 128; x += 8) {
    const g = ctx.createLinearGradient(x, 0, x + 8, 0);
    g.addColorStop(0, 'rgba(82,50,16,0.5)');
    g.addColorStop(0.35, 'rgba(255,220,130,0.34)');
    g.addColorStop(1, 'rgba(92,57,18,0.45)');
    ctx.fillStyle = g;
    ctx.fillRect(x, 0, 8, 128);
  }
  for (let y = 0; y < 128; y += 16) {
    ctx.fillStyle = 'rgba(76,46,14,0.22)';
    ctx.fillRect(0, y, 128, 1.5);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(4, 2);
  t.anisotropy = 8;
  return t;
}

function latticeTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#7d3c27';
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = 'rgba(238,204,138,0.8)';
  ctx.lineWidth = 3;
  for (let i = 0; i <= 128; i += 16) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 128);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(128, i);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(238,204,138,0.42)';
  ctx.lineWidth = 2;
  for (let i = -128; i <= 128; i += 32) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 128, 128);
    ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  return t;
}

function plaqueTexture(text) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 96;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#2f1c10';
  ctx.fillRect(0, 0, 256, 96);
  ctx.strokeStyle = '#c9a04c';
  ctx.lineWidth = 5;
  ctx.strokeRect(7, 7, 242, 82);
  ctx.strokeStyle = 'rgba(201,160,76,0.42)';
  ctx.lineWidth = 2;
  ctx.strokeRect(15, 15, 226, 66);
  ctx.fillStyle = '#e8c477';
  ctx.font = '600 48px "Noto Serif CJK SC","Songti SC",serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 51);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

const sandMap = surfaceTexture();
const roofMap = roofTexture();
const latticeMap = latticeTexture();

const M = {
  sand: new THREE.MeshStandardMaterial({ map: sandMap, color: 0xf4e2c6, roughness: 1 }),
  bed: new THREE.MeshStandardMaterial({ color: 0x4d5a45, roughness: 1 }),
  stone: new THREE.MeshStandardMaterial({ color: 0xb39a74, roughness: 0.94 }),
  stoneDark: new THREE.MeshStandardMaterial({ color: 0x8a7455, roughness: 0.96 }),
  plaster: new THREE.MeshStandardMaterial({ color: 0xeee0c2, roughness: 0.92 }),
  red: new THREE.MeshStandardMaterial({ color: 0x9a3f2a, roughness: 0.78 }),
  redDark: new THREE.MeshStandardMaterial({ color: 0x6d2c1f, roughness: 0.8 }),
  timber: new THREE.MeshStandardMaterial({ color: 0x5b3722, roughness: 0.85 }),
  goldRoof: new THREE.MeshStandardMaterial({ map: roofMap, color: 0xf0bc4e, roughness: 0.48, metalness: 0.32, side: THREE.DoubleSide }),
  lattice: new THREE.MeshStandardMaterial({ map: latticeMap, roughness: 0.8 }),
  plaque: new THREE.MeshBasicMaterial({ map: plaqueTexture('月泉阁'), toneMapped: false }),
  reedGreen: new THREE.MeshStandardMaterial({ color: 0x7f8d4b, roughness: 0.94 }),
  reedGold: new THREE.MeshStandardMaterial({ color: 0xc4a35c, roughness: 0.92 }),
  trunk: new THREE.MeshStandardMaterial({ color: 0x6d4e32, roughness: 0.98 }),
  poplar: new THREE.MeshStandardMaterial({ color: 0xd9a52d, roughness: 0.9 }),
  poplarDeep: new THREE.MeshStandardMaterial({ color: 0xb98024, roughness: 0.92 }),
  camel: new THREE.MeshStandardMaterial({ color: 0xb2814c, roughness: 0.92 }),
  camelDark: new THREE.MeshStandardMaterial({ color: 0x7b5330, roughness: 0.94 }),
  blanket: new THREE.MeshStandardMaterial({ color: 0x8e2f24, roughness: 0.8 }),
  blanketGold: new THREE.MeshStandardMaterial({ color: 0xc49543, roughness: 0.65, metalness: 0.18 }),
  rider: new THREE.MeshStandardMaterial({ color: 0x5b3a2b, roughness: 0.9 }),
  footprint: new THREE.MeshStandardMaterial({ color: 0x9c7040, roughness: 1 }),
  distant: new THREE.MeshStandardMaterial({ color: 0xba8d5b, roughness: 1 }),
  distantPale: new THREE.MeshStandardMaterial({ color: 0xd9c39a, roughness: 0.95 }),
  white: new THREE.MeshStandardMaterial({ color: 0xeee3c9, roughness: 0.88 }),
  oasisWater: new THREE.MeshStandardMaterial({ color: 0x6a9483, roughness: 0.4, metalness: 0.05 }),
  flag: new THREE.MeshStandardMaterial({ color: 0xb1382a, roughness: 0.82, side: THREE.DoubleSide }),
  flagGold: new THREE.MeshStandardMaterial({ color: 0xd6a23c, roughness: 0.72, side: THREE.DoubleSide }),
};

const OASIS = { x: -268, z: -432 };

export function groundHeight(x, z) {
  const r = Math.hypot(x / 108, z / 98);
  const valley = 0.9 + Math.sin(x * 0.045 + 1.2) * Math.cos(z * 0.038) * 0.45;
  let h = THREE.MathUtils.lerp(-1.85, valley, smoothstep(0.82, 1.24, r));
  const mask = smoothstep(1.24, 2.45, r);
  const ridge = 0.5 + 0.5 * Math.sin(x * 0.011 + Math.sin(z * 0.009) * 1.7) *
    Math.cos(z * 0.0085 + Math.sin(x * 0.006) * 1.3);
  const ridge2 = 0.5 + 0.5 * Math.sin(x * 0.027 + z * 0.019 + Math.sin(z * 0.014) * 1.2);
  const openSouth = smoothstep(45, 185, z) * (1 - smoothstep(185, 305, Math.abs(x)));
  h += mask * (12 + 36 * ridge + 16 * ridge2) * smoothstep(-0.35, 0.85, ridge) * (1 - 0.56 * openSouth);
  h += mask * Math.sin(x * 0.061 + z * 0.021) * Math.cos(z * 0.052 - x * 0.012) * 2.4 * (1 - 0.5 * openSouth);
  const od = Math.hypot(x - OASIS.x, z - OASIS.z);
  h = THREE.MathUtils.lerp(3.15, h, smoothstep(78, 196, od));
  return h;
}

function crescentPoints() {
  const R0 = 82;
  const R1 = 64;
  const d = 28;
  const a = (d * d + R0 * R0 - R1 * R1) / (2 * d);
  const half = Math.sqrt(Math.max(0, R0 * R0 - a * a));
  const start = Math.atan2(a, half);
  const end = Math.atan2(a, -half);
  const pts = [];
  for (let i = 0; i <= 74; i++) {
    const t = i / 74;
    const ang = start + (end - Math.PI * 2 - start) * t;
    const rr = R0 + Math.sin(ang * 7) * 0.55;
    pts.push(new THREE.Vector2(Math.cos(ang) * rr, Math.sin(ang) * rr));
  }
  const s0 = Math.atan2(a - d, -half);
  const s1 = Math.atan2(a - d, half);
  for (let i = 1; i < 56; i++) {
    const t = i / 56;
    const ang = s0 + (s1 + Math.PI * 2 - s0) * t;
    const rr = R1 + Math.sin(ang * 8) * 0.42;
    pts.push(new THREE.Vector2(Math.cos(ang) * rr, d + Math.sin(ang) * rr));
  }
  return pts;
}

function shapeFromPoints(points) {
  const s = new THREE.Shape();
  points.forEach((p, i) => {
    if (i === 0) s.moveTo(p.x, -p.y);
    else s.lineTo(p.x, -p.y);
  });
  s.closePath();
  return s;
}

function addPart(list, geo, x, y, z, ry = 0, rx = 0, rz = 0) {
  if (ry) geo.rotateY(ry);
  if (rx) geo.rotateX(rx);
  if (rz) geo.rotateZ(rz);
  geo.translate(x, y, z);
  list.push(geo);
  return geo;
}

function box(list, w, h, d, x, y, z, ry = 0) {
  return addPart(list, new THREE.BoxGeometry(w, h, d), x, y, z, ry);
}

function cyl(list, rt, rb, h, seg, x, y, z, rx = 0, rz = 0) {
  return addPart(list, new THREE.CylinderGeometry(rt, rb, h, seg), x, y, z, 0, rx, rz);
}

function hipRoof(list, w, d, h, lift, x, y, z) {
  const hw = w / 2;
  const hd = d / 2;
  const ridge = d * 0.26;
  const verts = [
    [-hw, lift, -hd], [hw, lift, -hd], [hw, lift, hd], [-hw, lift, hd],
    [0, 0, -hd], [0, 0, hd], [-hw, 0, 0], [hw, 0, 0],
    [0, h, -ridge], [0, h, ridge],
  ];
  const idx = [
    0, 4, 8, 4, 1, 8,
    2, 5, 9, 5, 3, 9,
    0, 8, 6, 6, 8, 9, 6, 9, 3,
    1, 7, 8, 7, 2, 9, 7, 9, 8,
  ];
  const pos = [];
  const uv = [];
  idx.forEach((i, k) => {
    pos.push(verts[i][0] + x, verts[i][1] + y, verts[i][2] + z);
    uv.push((verts[i][0] / w + 0.5) * 2, (k % 6) / 6);
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  list.push(g);
}

function eaveHorns(list, w, d, y, x, z) {
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const h = new THREE.BoxGeometry(1.5, 0.24, 0.5);
      h.rotateZ(sx * -0.55);
      h.rotateX(sz * -0.2);
      h.translate(x + sx * (w / 2 - 0.35), y + 0.45, z + sz * (d / 2 - 0.2));
      list.push(h);
    }
  }
}

function createPavilion(parts, cx, cz, baseY) {
  const { stone, red, plaster, timber, lattice } = parts;
  const roof = parts.goldRoof;
  const w = 13.5;
  const d = 10;
  box(stone, w + 6, 1.1, d + 6, cx, baseY + 0.55, cz);
  box(stone, w + 4.2, 0.32, d + 4.2, cx, baseY + 1.18, cz);
  for (let i = 0; i < 6; i++) {
    box(stone, 2.2, 0.2, 0.55, cx, baseY + 0.25 + i * 0.17, cz + d / 2 + 3.1 + (5 - i) * 0.38);
  }
  const fy = baseY + 1.34;
  const colH = 5.3;
  for (const sx of [-1, -0.34, 0.34, 1]) {
    for (const sz of [-1, 0.34, 1]) {
      if (sx === 0.34 && sz === 0) continue;
      const x = cx + sx * (w / 2 - 0.45);
      const z = cz + sz * (d / 2 - 0.4);
      cyl(red, 0.24, 0.28, colH, 8, x, fy + colH / 2, z);
      cyl(stone, 0.42, 0.46, 0.26, 8, x, fy + 0.14, z);
    }
  }
  box(timber, w - 1.1, 0.4, d - 1.1, cx, fy + colH - 0.3, cz);
  box(timber, w + 1.1, 0.34, d + 1.1, cx, fy + colH + 0.06, cz);
  box(plaster, w - 1.4, 3.7, 0.3, cx, fy + 2.0, cz - d / 2 + 0.55);
  box(plaster, 0.3, 3.7, d - 1.4, cx - w / 2 + 0.55, fy + 2.0, cz);
  box(plaster, 0.3, 3.7, d - 1.4, cx + w / 2 - 0.55, fy + 2.0, cz);
  for (const sx of [-1, 1]) {
    box(lattice, 3.4, 2.7, 0.12, cx + sx * 4.2, fy + 2.15, cz - d / 2 + 0.38);
  }
  box(plaster, 4.4, 3.2, 0.22, cx, fy + 1.9, cz + d / 2 - 0.72);
  box(timber, 4.9, 0.3, 0.3, cx, fy + 3.6, cz + d / 2 - 0.72);
  box(timber, 4.9, 0.3, 0.3, cx, fy + 0.3, cz + d / 2 - 0.72);
  for (let i = 0; i < 5; i++) {
    box(timber, 0.12, 2.9, 0.12, cx - 2.0 + i, fy + 1.95, cz + d / 2 - 0.6);
  }

  const upY = fy + colH + 0.6;
  box(timber, w + 5.4, 0.36, d + 5.4, cx, upY, cz);
  hipRoof(roof, w + 5.8, d + 5.8, 2.7, 0.62, cx, upY + 0.18, cz);
  eaveHorns(roof, w + 5.8, d + 5.8, upY + 0.2, cx, cz);

  const sy = upY + 3.05;
  box(timber, w - 0.8, 0.4, d - 0.8, cx, sy, cz);
  box(plaster, w - 2.4, 3.2, 0.26, cx, sy + 1.75, cz - d / 2 + 1.1);
  box(plaster, 0.26, 3.2, d - 2.4, cx - w / 2 + 1.1, sy + 1.75, cz);
  box(plaster, 0.26, 3.2, d - 2.4, cx + w / 2 - 1.1, sy + 1.75, cz);
  for (const sx of [-1, 1]) {
    cyl(red, 0.2, 0.22, 3.4, 8, cx + sx * (w / 2 - 1.1), sy + 1.9, cz + d / 2 - 1.1);
  }
  box(lattice, w - 3.0, 2.3, 0.12, cx, sy + 1.95, cz + d / 2 - 1.15);
  box(timber, w - 2.2, 0.3, 0.3, cx, sy + 3.55, cz + d / 2 - 1.1);
  box(timber, w - 1.8, 0.28, d - 1.8, cx, sy + 0.58, cz);

  const railY = sy + 0.55;
  for (const sx of [-1, 1]) {
    box(red, 0.16, 1.15, d - 3.2, cx + sx * (w / 2 - 0.2), railY + 0.42, cz);
  }
  box(red, w - 2.6, 1.15, 0.16, cx, railY + 0.42, cz + d / 2 - 0.2);

  const upperY = sy + 3.7;
  hipRoof(roof, w + 3.6, d + 3.6, 3.5, 0.8, cx, upperY, cz);
  eaveHorns(roof, w + 3.6, d + 3.6, upperY + 0.02, cx, cz);
  box(red, 0.42, 1.2, 0.42, cx, upperY + 3.2, cz - 1.3);
  box(red, 0.42, 1.2, 0.42, cx, upperY + 3.2, cz + 1.3);
  cyl(stone, 0.38, 0.5, 0.7, 8, cx, upperY + 3.95, cz);

  const plaque = new THREE.PlaneGeometry(4.0, 1.5);
  plaque.translate(cx, fy + 4.15, cz + d / 2 + 0.16);
  const plaqueMesh = new THREE.Mesh(plaque, M.plaque);
  plaqueMesh.castShadow = false;
  plaqueMesh.receiveShadow = false;
  return plaqueMesh;
}

function createPoplar(trunks, foliage, x, z, scale, seed) {
  const y = groundHeight(x, z);
  const h = 7.5 * scale + (seed % 4) * 0.8;
  cyl(trunks, 0.24 * scale, 0.42 * scale, h, 6, x, y + h / 2, z);
  for (let i = 0; i < 3; i++) {
    const a = seed * 2.1 + i * 2.0;
    const bx = x + Math.cos(a) * 1.5 * scale;
    const bz = z + Math.sin(a) * 1.5 * scale;
    cyl(trunks, 0.1 * scale, 0.17 * scale, 3.6 * scale, 5, (x + bx) / 2, y + h * 0.72 + i * 0.25, (z + bz) / 2, 0.55, Math.cos(a) * 0.4);
  }
  const crown = new THREE.IcosahedronGeometry(2.1 * scale, 0);
  crown.scale(1, 1.65 + (seed % 3) * 0.16, 1);
  crown.translate(x, y + h + 0.9 * scale, z);
  foliage.push(crown);
  for (let i = 0; i < 5; i++) {
    const a = seed * 1.7 + i * 1.26;
    const rr = (1.2 + (i % 3) * 0.65) * scale;
    const c2 = new THREE.IcosahedronGeometry((1.15 + (i % 2) * 0.5) * scale, 0);
    c2.translate(x + Math.cos(a) * rr, y + h * (0.73 + (i % 3) * 0.11), z + Math.sin(a) * rr);
    foliage.push(c2);
  }
}

function createReeds(stems, plumes, points) {
  points.forEach((p, i) => {
    const n = 3 + Math.floor(R() * 4);
    const ox = p.x + (R() - 0.5) * 6;
    const oz = p.y + (R() - 0.5) * 6;
    for (let k = 0; k < n; k++) {
      const h = 1.1 + R() * 1.5;
      const x = ox + (R() - 0.5) * 1.3;
      const z = oz + (R() - 0.5) * 1.3;
      const lean = (R() - 0.5) * 0.16;
      cyl(stems, 0.018, 0.03, h, 4, x, h / 2 + 0.1, z, lean, lean * 0.6);
      cyl(plumes, 0.05, 0.11, 0.55, 5, x + lean * h * 0.6, h + 0.34, z, lean, lean * 0.6);
    }
    for (let k = 0; k < 3; k++) {
      const a = R() * Math.PI * 2;
      const g = new THREE.BoxGeometry(0.06, 0.8 + R() * 0.7, 0.02);
      g.rotateZ((R() - 0.5) * 0.9);
      g.rotateY(a);
      g.translate(ox + Math.cos(a) * 0.4, 0.75, oz + Math.sin(a) * 0.4);
      stems.push(g);
    }
  });
}

function createCamel(scale) {
  const group = new THREE.Group();
  const legs = [];
  const add = (geo, material, x, y, z) => {
    const m = new THREE.Mesh(geo, material);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
    return m;
  };
  const body = new THREE.SphereGeometry(1.15, 12, 9);
  body.scale(0.86, 0.92, 1.6);
  add(body, M.camel, 0, 2.05, 0);
  const hump1 = new THREE.SphereGeometry(0.72, 10, 8);
  hump1.scale(1, 1.1, 0.9);
  add(hump1, M.camel, 0, 2.78, -0.55);
  const hump2 = new THREE.SphereGeometry(0.62, 10, 8);
  hump2.scale(1, 1.1, 0.9);
  add(hump2, M.camel, 0, 2.72, 0.5);
  const neck = new THREE.CylinderGeometry(0.25, 0.44, 1.9, 7);
  const neckMesh = add(neck, M.camel, 0, 2.75, 1.35);
  neckMesh.rotation.x = 0.6;
  const head = new THREE.SphereGeometry(0.38, 9, 7);
  head.scale(0.85, 1, 1.35);
  add(head, M.camel, 0, 3.55, 2.15);
  add(new THREE.ConeGeometry(0.1, 0.3, 4), M.camelDark, -0.22, 3.84, 2.08);
  add(new THREE.ConeGeometry(0.1, 0.3, 4), M.camelDark, 0.22, 3.84, 2.08);
  const blanket = new THREE.BoxGeometry(1.7, 0.14, 2.0);
  add(blanket, M.blanket, 0, 2.85, 0.1);
  for (const sz of [-0.75, 0.75]) {
    add(new THREE.BoxGeometry(1.82, 0.34, 0.08), M.blanketGold, 0, 2.72, sz);
  }
  for (const sx of [-0.44, 0.44]) {
    for (const sz of [-0.88, 0.88]) {
      const pivot = new THREE.Group();
      pivot.position.set(sx, 1.62, sz);
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.08, 1.55, 6), M.camelDark);
      leg.position.y = -0.78;
      leg.castShadow = true;
      pivot.add(leg);
      const foot = new THREE.Mesh(new THREE.SphereGeometry(0.15, 6, 5), M.camelDark);
      foot.scale.set(1, 0.45, 1.4);
      foot.position.set(0, -1.52, 0.06);
      pivot.add(foot);
      group.add(pivot);
      legs.push(pivot);
    }
  }
  const saddle = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 7), M.rider);
  saddle.scale.set(0.8, 1.1, 0.75);
  saddle.position.set(0, 3.4, -0.15);
  saddle.castShadow = true;
  group.add(saddle);
  const riderHead = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), M.camelDark);
  riderHead.position.set(0, 4.05, -0.15);
  riderHead.castShadow = true;
  group.add(riderHead);
  group.scale.setScalar(scale);
  return { group, legs };
}

function createFootprints(list) {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(152, 0, 152),
    new THREE.Vector3(136, 0, 124),
    new THREE.Vector3(119, 0, 96),
    new THREE.Vector3(104, 0, 70),
    new THREE.Vector3(93, 0, 46),
    new THREE.Vector3(87, 0, 27),
    new THREE.Vector3(85, 0, 14),
  ], false, 'catmullrom', 0.4);
  const pts = curve.getSpacedPoints(42);
  pts.forEach((p, i) => {
    if (i % 2) return;
    const tan = curve.getTangent(i / (pts.length - 1));
    const nx = -tan.z;
    const nz = tan.x;
    const side = (Math.floor(i / 2) % 2 ? 1 : -1) * 0.42;
    const x = p.x + nx * side;
    const z = p.z + nz * side;
    const y = groundHeight(x, z);
    const g = new THREE.SphereGeometry(0.4, 8, 6);
    g.scale(0.85, 0.13, 1.5);
    g.rotateY(Math.atan2(tan.x, tan.z));
    g.translate(x, y + 0.045, z);
    list.push(g);
  });
}

function createOasis(parts) {
  const y = 3.15;
  const { distant, pale, white, trunks, foliage, red, roof } = parts;
  const cx = OASIS.x;
  const cz = OASIS.z;
  box(distant, 96, 6.5, 2.6, cx, y + 3.25, cz - 32);
  box(distant, 96, 6.5, 2.6, cx, y + 3.25, cz + 32);
  box(distant, 2.6, 6.5, 66, cx - 47, y + 3.25, cz);
  box(distant, 2.6, 6.5, 66, cx + 47, y + 3.25, cz);
  for (let i = -44; i <= 44; i += 6) {
    box(distant, 3.2, 1.7, 2.1, cx + i, y + 7.3, cz - 32);
    box(distant, 3.2, 1.7, 2.1, cx + i, y + 7.3, cz + 32);
  }
  for (let i = -28; i <= 28; i += 6) {
    box(distant, 2.1, 1.7, 3.2, cx - 47, y + 7.3, cz + i);
    box(distant, 2.1, 1.7, 3.2, cx + 47, y + 7.3, cz + i);
  }
  box(distant, 20, 10, 9, cx, y + 5, cz + 34);
  box(distant, 14, 6, 6.5, cx, y + 12, cz + 34);
  box(roof, 24, 0.4, 13, cx, y + 15.1, cz + 34);
  box(roof, 18, 0.3, 9, cx, y + 17.6, cz + 34);
  box(red, 1.1, 9, 1.1, cx - 7, y + 8.5, cz + 34);
  box(red, 1.1, 9, 1.1, cx + 7, y + 8.5, cz + 34);
  for (let i = 0; i < 9; i++) {
    const r = 3.6 - i * 0.3;
    cyl(white, r * 0.78, r, 2.2, 8, cx - 20, y + 2.8 + i * 2.15, cz - 8);
  }
  cyl(white, 0.3, 0.55, 5.5, 8, cx - 20, y + 23.3, cz - 8);
  for (let i = 0; i < 8; i++) {
    box(pale, 5 + (i % 3), 3.2 + (i % 2) * 1.4, 4.5, cx - 24 + (i % 4) * 11, y + 2.1, cz + 3 + Math.floor(i / 4) * 12);
    box(roof, 5.8 + (i % 3), 0.3, 5.2, cx - 24 + (i % 4) * 11, y + 4.0 + (i % 2) * 1.4, cz + 3 + Math.floor(i / 4) * 12);
  }
  const pond = new THREE.CircleGeometry(10, 24);
  pond.rotateX(-Math.PI / 2);
  pond.translate(cx + 18, y + 0.15, cz + 10);
  parts.oasisWater.push(pond);
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const rr = 14 + (i % 4) * 3.5;
    createPoplar(trunks, foliage, cx + Math.cos(a) * rr, cz + Math.sin(a) * rr * 0.7, 0.7 + (i % 3) * 0.12, i + 70);
  }
}

export function buildMingshaScene() {
  const staticRoot = new THREE.Group();
  const buckets = {
    sand: [], bed: [], stone: [], stoneDark: [], plaster: [], red: [], timber: [],
    goldRoof: [], lattice: [], reedGreen: [], reedGold: [], trunk: [], poplar: [],
    poplarDeep: [], footprint: [], distant: [], distantPale: [], white: [],
    oasisWater: [], flag: [], flagGold: [],
  };

  const terrainGeo = new THREE.PlaneGeometry(1700, 1700, 200, 200);
  terrainGeo.rotateX(-Math.PI / 2);
  const tp = terrainGeo.attributes.position;
  for (let i = 0; i < tp.count; i++) {
    tp.setY(i, groundHeight(tp.getX(i), tp.getZ(i)));
  }
  terrainGeo.computeVertexNormals();
  const terrain = new THREE.Mesh(terrainGeo, M.sand);
  terrain.receiveShadow = true;
  staticRoot.add(terrain);

  const cres = crescentPoints();
  const lakeShape = shapeFromPoints(cres);
  const lakeGeo = new THREE.ShapeGeometry(lakeShape, 20);
  lakeGeo.rotateX(-Math.PI / 2);

  const bed = new THREE.Mesh(lakeGeo.clone(), M.bed);
  bed.position.y = -1.22;
  bed.receiveShadow = true;
  staticRoot.add(bed);

  createReeds(buckets.reedGreen, buckets.reedGold, cres);

  const pavilionBase = Math.max(groundHeight(104, -5), -0.05);
  const plaque = createPavilion(buckets, 104, -5, pavilionBase);
  staticRoot.add(plaque);

  const poplarSpots = [
    [119, -76, 1.0], [133, -55, 1.1], [147, -31, 0.95], [157, -4, 1.05],
    [158, 27, 0.9], [150, 54, 1.0], [136, 78, 1.1], [119, 96, 0.95],
    [101, 108, 1.05], [92, 84, 0.9], [114, 62, 0.85],
    [-130, -74, 1.0], [-149, -46, 0.92], [-162, -16, 1.05],
    [-175, 20, 0.9], [-186, 54, 1.0], [-198, 88, 0.94],
    [-76, 132, 0.85], [-54, 140, 0.9], [70, 132, 0.95],
  ];
  poplarSpots.forEach(([x, z, s], i) => createPoplar(buckets.trunk, i % 3 === 0 ? buckets.poplarDeep : buckets.poplar, x, z, s, i + 3));

  createFootprints(buckets.footprint);

  createOasis({
    distant: buckets.distant,
    pale: buckets.distantPale,
    white: buckets.white,
    trunks: buckets.trunk,
    foliage: buckets.poplar,
    red: buckets.red,
    roof: buckets.goldRoof,
    oasisWater: buckets.oasisWater,
  });

  box(buckets.timber, 0.28, 14, 0.28, 91, pavilionBase + 7.2, 8);
  box(buckets.goldRoof, 0.7, 0.4, 0.7, 91, pavilionBase + 14.3, 8);

  for (const key of Object.keys(buckets)) {
    const list = buckets[key];
    if (!list.length) continue;
    const material = M[key === 'goldRoof' ? 'goldRoof' : key];
    if (!material) continue;
    const mesh = mergedMesh(list, material, true, true);
    if (!mesh) continue;
    staticRoot.add(mesh);
  }

  const merged = mergeStaticGroup(staticRoot);

  const waterMaterial = makeWaterMaterial();
  waterMaterial.uniforms.uDeep.value.set(0x3a6e63);
  waterMaterial.uniforms.uShallow.value.set(0x7da88d);
  waterMaterial.uniforms.uSky.value.set(0xe8c18d);
  waterMaterial.uniforms.uSun.value.set(0xffd9a0);
  const water = new THREE.Mesh(lakeGeo, waterMaterial);
  water.name = 'moon-water';
  water.position.y = 0.55;
  water.renderOrder = 1;
  merged.add(water);

  const lifeGroup = new THREE.Group();
  const camelPath = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-150, 0, 120),
    new THREE.Vector3(-122, 0, 92),
    new THREE.Vector3(-108, 0, 60),
    new THREE.Vector3(-106, 0, 26),
    new THREE.Vector3(-118, 0, -8),
    new THREE.Vector3(-142, 0, -34),
    new THREE.Vector3(-174, 0, -46),
    new THREE.Vector3(-202, 0, -24),
    new THREE.Vector3(-208, 0, 16),
    new THREE.Vector3(-196, 0, 58),
    new THREE.Vector3(-174, 0, 92),
    new THREE.Vector3(-160, 0, 116),
  ], true, 'catmullrom', 0.4);

  const camels = [];
  for (let i = 0; i < 6; i++) {
    const c = createCamel(0.95 + (i % 2) * 0.06);
    c.offset = i * 0.026;
    c.phase = i * 1.7;
    camelPath.getPointAt(c.offset, new THREE.Vector3());
    lifeGroup.add(c.group);
    camels.push(c);
  }

  const flagGeo = new THREE.PlaneGeometry(5.2, 2.9, 16, 7);
  flagGeo.translate(2.6, 0, 0);
  const flagBase = Float32Array.from(flagGeo.attributes.position.array);
  const flag = new THREE.Mesh(flagGeo, M.flag);
  flag.position.set(91, pavilionBase + 12.5, 8);
  flag.rotation.y = -0.5;
  flag.castShadow = true;
  lifeGroup.add(flag);

  const flagTrimGeo = new THREE.PlaneGeometry(5.2, 0.22, 16, 1);
  flagTrimGeo.translate(2.6, -1.34, 0.02);
  const flagTrim = new THREE.Mesh(flagTrimGeo, M.flagGold);
  flagTrim.position.copy(flag.position);
  flagTrim.rotation.copy(flag.rotation);
  lifeGroup.add(flagTrim);

  merged.add(lifeGroup);

  const tmp = new THREE.Vector3();
  const tmp2 = new THREE.Vector3();
  const flagPos = flagGeo.attributes.position;

  const life = {
    update(time, dt) {
      waterMaterial.uniforms.uTime.value = time;
      camels.forEach((c) => {
        const t = (time * 0.011 + c.offset) % 1;
        camelPath.getPointAt(t, tmp);
        camelPath.getPointAt((t + 0.004) % 1, tmp2);
        const gy = groundHeight(tmp.x, tmp.z);
        const gy2 = groundHeight(tmp2.x, tmp2.z);
        const dx = tmp2.x - tmp.x;
        const dz = tmp2.z - tmp.z;
        const len = Math.hypot(dx, dz) || 1;
        c.group.position.set(tmp.x, gy + Math.abs(Math.sin(time * 3.2 + c.phase)) * 0.06, tmp.z);
        c.group.rotation.y = Math.atan2(dx, dz);
        const slope = Math.atan2(gy2 - gy, len);
        c.group.rotation.x = THREE.MathUtils.clamp(-slope * 0.7, -0.24, 0.24);
        c.legs.forEach((leg, i) => {
          leg.rotation.x = Math.sin(time * 3.2 + c.phase + (i % 2 ? Math.PI : 0) + (i > 1 ? 0.5 : 0)) * 0.38;
        });
      });
      flagPos.array.set(flagBase);
      for (let i = 0; i < flagPos.count; i++) {
        const x = flagBase[i * 3];
        const y = flagBase[i * 3 + 1];
        const k = Math.max(0, x / 5.2);
        flagPos.setZ(i, (Math.sin(time * 4.6 - x * 1.55 + y * 0.7) * 0.52 + Math.sin(time * 2.3 + x * 2.7) * 0.16) * k);
      }
      flagPos.needsUpdate = true;
      flagGeo.computeVertexNormals();
      flagTrim.position.copy(flag.position);
      flagTrim.rotation.copy(flag.rotation);
    },
  };

  const stats = {
    dunes: 1,
    camels: camels.length,
    reeds: cres.length,
    poplars: poplarSpots.length,
    footprints: 21,
    oasis: 1,
  };

  return {
    group: merged,
    waterMaterial,
    life,
    stats,
    lake: cres.map((p) => [p.x, p.y]),
    camels: camels.map((c) => c.group),
    camelPath,
  };
}
