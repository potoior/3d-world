import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { sharedTextures, makePlaqueTexture, makeLabelTexture } from './textures.js';

const TAU = Math.PI * 2;

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function addBox(list, w, h, d, x, y, z, ry = 0, rx = 0, rz = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (rx) g.rotateX(rx);
  if (rz) g.rotateZ(rz);
  if (ry) g.rotateY(ry);
  g.translate(x, y, z);
  list.push(g);
  return g;
}

function addCyl(list, rt, rb, h, seg, x, y, z, rx = 0, rz = 0) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg, 1, false);
  if (rx) g.rotateX(rx);
  if (rz) g.rotateZ(rz);
  g.translate(x, y, z);
  list.push(g);
  return g;
}

function segGeo(ax, ay, az, bx, by, bz, ra, rb, seg = 5) {
  const dx = bx - ax;
  const dy = by - ay;
  const dz = bz - az;
  const len = Math.hypot(dx, dy, dz) || 1;
  const geo = new THREE.CylinderGeometry(rb, ra, len, seg, 1, false);
  geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(dx / len, dy / len, dz / len)
  ));
  geo.translate((ax + bx) * 0.5, (ay + by) * 0.5, (az + bz) * 0.5);
  return geo;
}

function matrixFor(x, y, z, yaw = 0, scale = 1) {
  const m = new THREE.Matrix4();
  m.compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)),
    new THREE.Vector3(scale, scale, scale)
  );
  return m;
}

class Bucket {
  constructor() { this.map = new Map(); }
  add(geo, mat) {
    if (!this.map.has(mat)) this.map.set(mat, []);
    this.map.get(mat).push(geo);
  }
  finish(name) {
    const group = new THREE.Group();
    group.name = name;
    for (const [mat, list] of this.map) {
      if (!list.length) continue;
      const geo = mergeGeometries(list.map((g) => (g.index ? g.toNonIndexed() : g)), false);
      list.forEach((g) => g.dispose());
      if (!geo) continue;
      geo.computeBoundingSphere();
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = !mat.userData?.noShadow;
      mesh.receiveShadow = true;
      group.add(mesh);
    }
    return group;
  }
}

class Local {
  constructor() { this.map = new Map(); }
  add(geo, mat) {
    if (!this.map.has(mat)) this.map.set(mat, []);
    this.map.get(mat).push(geo);
  }
  commit(bucket, matrix) {
    for (const [mat, list] of this.map) {
      for (const geo of list) {
        geo.applyMatrix4(matrix);
        bucket.add(geo, mat);
      }
    }
    this.map.clear();
  }
}

function goldTileTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 256, 0);
  grad.addColorStop(0, '#9c6a1f');
  grad.addColorStop(0.18, '#e0b455');
  grad.addColorStop(0.4, '#c8912f');
  grad.addColorStop(0.62, '#f1c96f');
  grad.addColorStop(0.82, '#b97e25');
  grad.addColorStop(1, '#8d5c17');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  for (let x = 0; x < 256; x += 16) {
    g.fillStyle = 'rgba(70,42,8,0.55)';
    g.fillRect(x, 0, 2, 256);
    g.fillStyle = 'rgba(255,232,160,0.32)';
    g.fillRect(x + 3, 0, 2, 256);
    g.fillStyle = 'rgba(120,76,18,0.16)';
    g.fillRect(x + 8, 0, 5, 256);
  }
  for (let y = 0; y < 256; y += 22) {
    g.fillStyle = 'rgba(64,38,7,0.42)';
    g.fillRect(0, y, 256, 2);
    g.fillStyle = 'rgba(255,226,150,0.18)';
    g.fillRect(0, y + 3, 256, 1);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

function wallTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d');
  const rand = mulberry32(893);
  g.fillStyle = '#89332a';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 800; i++) {
    const a = 0.025 + rand() * 0.08;
    g.fillStyle = rand() < 0.5 ? `rgba(62,20,16,${a})` : `rgba(196,105,80,${a * 0.55})`;
    g.fillRect(rand() * 256, rand() * 256, 1 + rand() * 14, 1 + rand() * 3);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

function buildMaterials() {
  const goldMap = goldTileTexture();
  const wallMap = wallTexture();
  return {
    gold: new THREE.MeshStandardMaterial({
      map: goldMap, color: 0xf3cf7c, metalness: 0.72, roughness: 0.34,
      emissive: 0x3a2105, emissiveIntensity: 0.32, side: THREE.DoubleSide,
    }),
    goldDark: new THREE.MeshStandardMaterial({
      map: goldMap, color: 0xb97d25, metalness: 0.7, roughness: 0.44,
      emissive: 0x221204, emissiveIntensity: 0.24,
    }),
    goldLight: new THREE.MeshStandardMaterial({
      color: 0xf7d98e, metalness: 0.76, roughness: 0.26,
      emissive: 0x4a2a08, emissiveIntensity: 0.5,
    }),
    wall: new THREE.MeshStandardMaterial({ map: wallMap, color: 0xa44837, roughness: 0.78 }),
    wallDark: new THREE.MeshStandardMaterial({ color: 0x5f241c, roughness: 0.82 }),
    column: new THREE.MeshStandardMaterial({ color: 0x6f2820, roughness: 0.7 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x4d3424, roughness: 0.9 }),
    woodRed: new THREE.MeshStandardMaterial({ color: 0x3f1713, roughness: 0.86 }),
    stone: new THREE.MeshStandardMaterial({ map: sharedTextures.stoneMap, color: 0xc9c4b4, roughness: 0.95 }),
    stoneDark: new THREE.MeshStandardMaterial({ map: sharedTextures.stoneMap, color: 0x817f75, roughness: 0.98 }),
    iron: new THREE.MeshStandardMaterial({ color: 0x353b39, roughness: 0.58, metalness: 0.4 }),
    lantern: new THREE.MeshBasicMaterial({ color: 0xffc16a }),
  };
}

function roofGeometry(w, d, h, lift = 1.1, sag = 0.16, segU = 14, segV = 4) {
  const a = w * 0.5;
  const b = d * 0.5;
  const ra = Math.max(0.35, w * 0.24);
  const pos = [];
  const uv = [];
  const idx = [];
  let base = 0;
  const faces = [
    [-a, b, a, b, -ra, 0, ra, 0],
    [a, -b, -a, -b, ra, 0, -ra, 0],
    [a, b, a, -b, ra, 0, ra, 0],
    [-a, -b, -a, b, -ra, 0, -ra, 0],
  ];
  for (const f of faces) {
    for (let iv = 0; iv <= segV; iv++) {
      const v = iv / segV;
      for (let iu = 0; iu <= segU; iu++) {
        const u = iu / segU;
        const edgeT = Math.abs(u * 2 - 1);
        const eaveY = lift * Math.pow(edgeT, 6) - sag * (1 - edgeT * edgeT);
        const yy = eaveY + (h - eaveY) * Math.pow(v, 0.72);
        const px = f[0] + (f[2] - f[0]) * u;
        const pz = f[1] + (f[3] - f[1]) * u;
        const qx = f[4] + (f[6] - f[4]) * u;
        const qz = f[5] + (f[7] - f[5]) * u;
        const flare = 1 + (1 - v) * 0.02;
        pos.push((px + (qx - px) * v) * flare, yy, (pz + (qz - pz) * v) * flare);
        uv.push(u * Math.max(2, w * 0.32), v * 2.2);
      }
    }
    for (let iv = 0; iv < segV; iv++) {
      for (let iu = 0; iu < segU; iu++) {
        const i0 = base + iv * (segU + 1) + iu;
        idx.push(i0, i0 + 1, i0 + segU + 1, i0 + 1, i0 + segU + 2, i0 + segU + 1);
      }
    }
    base += (segU + 1) * (segV + 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

function octRoofGeometry(radius, h, lift = 1.0, segA = 24, segR = 5) {
  const pos = [];
  const uv = [];
  const idx = [];
  for (let ir = 0; ir <= segR; ir++) {
    const t = ir / segR;
    for (let ia = 0; ia <= segA; ia++) {
      const a = (ia / segA) * TAU;
      const edge = Math.pow(Math.abs(Math.cos(a * 4)), 6);
      const r = radius * (1 - Math.pow(t, 0.92) * 0.975) * (1 + 0.03 * Math.pow(1 - t, 3));
      pos.push(Math.cos(a) * r, h * Math.pow(t, 0.8) + lift * edge * Math.pow(1 - t, 4), Math.sin(a) * r);
      uv.push((ia / segA) * 8, t * 2.4);
    }
  }
  for (let ir = 0; ir < segR; ir++) {
    for (let ia = 0; ia < segA; ia++) {
      const i0 = ir * (segA + 1) + ia;
      idx.push(i0, i0 + segA + 1, i0 + 1, i0 + 1, i0 + segA + 1, i0 + segA + 2);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

function roofAt(L, M, w, d, h, baseY, lift) {
  const geo = roofGeometry(w, d, h, lift);
  geo.translate(0, baseY, 0);
  L.add(geo, M.gold);
  return baseY + h;
}

function addBalustrade(L, M, w, d, y, gap = 5) {
  const posts = [];
  const rails = [];
  const t = 0.16;
  const step = 1.8;
  const hx = w * 0.5 - 0.15;
  const hz = d * 0.5 - 0.15;
  for (let x = -hx; x <= hx + 0.01; x += step) {
    if (Math.abs(x) < gap * 0.5) continue;
    addBox(posts, t, 0.95, t, x, y + 0.48, hz);
    addBox(posts, t, 0.95, t, x, y + 0.48, -hz);
  }
  for (let z = -hz + 0.9; z < hz - 0.4; z += step) {
    addBox(posts, t, 0.95, t, hx, y + 0.48, z);
    addBox(posts, t, 0.95, t, -hx, y + 0.48, z);
  }
  addBox(rails, 0.13, 0.13, d, hx, y + 1.02, 0);
  addBox(rails, 0.13, 0.13, d, -hx, y + 1.02, 0);
  addBox(rails, w - gap, 0.13, 0.13, gap * 0.5, y + 1.02, hz);
  addBox(rails, w - gap, 0.13, 0.13, -gap * 0.5, y + 1.02, hz);
  addBox(rails, w, 0.13, 0.13, 0, y + 1.02, -hz);
  posts.forEach((g) => L.add(g, M.stone));
  rails.forEach((g) => L.add(g, M.stoneDark));
}

function addLanterns(L, M, xs, z, y) {
  for (const px of xs) {
    const g = new THREE.SphereGeometry(0.26, 6, 5);
    g.scale(1, 1.25, 1);
    g.translate(px, y, z);
    L.add(g, M.lantern);
    boxTo(L, M.wood, 0.05, 0.5, 0.05, px, y + 0.36, z);
  }
}

function boxTo(L, mat, w, h, d, x, y, z, ry = 0, rx = 0, rz = 0) {
  const list = [];
  addBox(list, w, h, d, x, y, z, ry, rx, rz);
  L.add(list[0], mat);
}

function cylTo(L, mat, rt, rb, h, seg, x, y, z, rx = 0, rz = 0) {
  const list = [];
  addCyl(list, rt, rb, h, seg, x, y, z, rx, rz);
  L.add(list[0], mat);
}
function addHall(L, M) {
  const w = 20;
  const d = 14;
  const wallH = 3.8;
  L.add((() => { const g = new THREE.BoxGeometry(w, 1.4, d); g.translate(0, 0.7, 0); return g; })(), M.stone);
  L.add((() => { const g = new THREE.BoxGeometry(w + 0.65, 0.18, d + 0.65); g.translate(0, 1.44, 0); return g; })(), M.stoneDark);
  for (let i = 0; i < 3; i++) boxTo(L, M.stone, w * 0.34, 0.26, 1.15 - i * 0.22, 0, 0.13, d * 0.5 + 0.6 + i * 0.55);
  addBalustrade(L, M, w, d, 1.4, 5);
  const bw = w * 0.6;
  const bd = d * 0.56;
  const by = 1.4;
  const walls = [];
  addBox(walls, bw, wallH, bd, 0, by + wallH * 0.5, 0);
  walls.forEach((g) => L.add(g, M.wall));
  const cap = [];
  addBox(cap, bw + 0.3, 0.34, bd + 0.3, 0, by + wallH, 0);
  cap.forEach((g) => L.add(g, M.wallDark));
  for (let i = -2; i <= 2; i++) {
    const px = (i / 2) * (bw * 0.44);
    cylTo(L, M.column, 0.17, 0.2, wallH, 6, px, by + wallH * 0.5, bd * 0.5 + 0.9);
    cylTo(L, M.column, 0.17, 0.2, wallH, 6, px, by + wallH * 0.5, -bd * 0.5 - 0.9);
  }
  const doors = [];
  addBox(doors, 2.5, 2.5, 0.16, 0, by + 1.25, bd * 0.5 + 0.09);
  addBox(doors, 1.9, 0.12, 0.12, 0, by + 2.5, bd * 0.5 + 0.2);
  doors.forEach((g) => L.add(g, M.woodRed));
  const win = [];
  addBox(win, 1.1, 1.25, 0.12, -bw * 0.28, by + 2.0, bd * 0.5 + 0.06);
  addBox(win, 1.1, 1.25, 0.12, bw * 0.28, by + 2.0, bd * 0.5 + 0.06);
  win.forEach((g) => L.add(g, M.woodRed));
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * TAU;
    boxTo(L, M.goldDark, 0.34, 0.34, 0.5, Math.cos(a) * bw * 0.53, by + wallH + 0.35, Math.sin(a) * bd * 0.53, -a);
  }
  const ly = by + wallH + 0.5;
  roofAt(L, M, w * 0.96, d * 0.94, 2.7, ly, 1.25);
  const uy = ly + 1.95;
  const uw = bw * 0.68;
  const ud = bd * 0.68;
  const uwall = [];
  addBox(uwall, uw, 2.2, ud, 0, uy + 1.1, 0);
  uwall.forEach((g) => L.add(g, M.wall));
  const ucap = [];
  addBox(ucap, uw + 0.24, 0.3, ud + 0.24, 0, uy + 2.2, 0);
  ucap.forEach((g) => L.add(g, M.wallDark));
  const uwin = [];
  addBox(uwin, 1.0, 1.1, 0.1, -uw * 0.28, uy + 1.2, ud * 0.5 + 0.06);
  addBox(uwin, 1.0, 1.1, 0.1, uw * 0.28, uy + 1.2, ud * 0.5 + 0.06);
  uwin.forEach((g) => L.add(g, M.woodRed));
  const topY = roofAt(L, M, w * 0.64, d * 0.6, 2.15, uy + 2.25, 1.0);
  const ridge = [];
  addBox(ridge, w * 0.34, 0.34, 0.36, 0, topY, 0);
  addBox(ridge, 0.34, 0.55, 0.34, -w * 0.17, topY + 0.25, 0);
  addBox(ridge, 0.34, 0.55, 0.34, w * 0.17, topY + 0.25, 0);
  ridge.forEach((g) => L.add(g, M.goldLight));
  addLanterns(L, M, [-bw * 0.36, 0, bw * 0.36], bd * 0.5 + 1.3, by + 3.2);
}

function addPavilion(L, M, scale = 1) {
  const w = 10 * scale;
  const d = 10 * scale;
  L.add((() => { const g = new THREE.BoxGeometry(w, 0.95, d); g.translate(0, 0.47, 0); return g; })(), M.stone);
  addBalustrade(L, M, w, d, 0.95, 3.6 * scale);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      cylTo(L, M.column, 0.18, 0.22, 3.5 * scale, 6, sx * w * 0.27, 0.95 + 1.75 * scale, sz * d * 0.27);
    }
  }
  const body = [];
  addBox(body, w * 0.5, 0.75, d * 0.5, 0, 0.95 + 0.38, -d * 0.02);
  body.forEach((g) => L.add(g, M.wall));
  const band = [];
  addBox(band, w * 0.5 + 0.24, 0.22, d * 0.5 + 0.24, 0, 1.9 * scale, -d * 0.02);
  band.forEach((g) => L.add(g, M.wallDark));
  const roofH = 2.5 * scale;
  roofAt(L, M, w * 0.94, d * 0.94, roofH, 1.95, 0.8 * scale);
  const uy = 1.95 + roofH * 0.82;
  const uw = w * 0.58;
  const uwall = [];
  addBox(uwall, uw, 1.5 * scale, uw, 0, uy + 0.75 * scale, 0);
  uwall.forEach((g) => L.add(g, M.wall));
  const top2 = roofAt(L, M, w * 0.7, d * 0.7, roofH * 0.72, uy + 1.5 * scale, 0.6 * scale);
  boxTo(L, M.goldLight, 0.28, 0.5, 0.28, 0, top2 + 0.2, 0);
  addLanterns(L, M, [-w * 0.28, w * 0.28], d * 0.3, 1.9 * scale);
}

function addOctPavilion(L, M, scale = 1) {
  const r = 5.4 * scale;
  const g = new THREE.CylinderGeometry(r, r + 0.45, 1.0, 8);
  g.translate(0, 0.5, 0);
  L.add(g, M.stone);
  const ring = new THREE.TorusGeometry(r - 0.1, 0.16, 4, 30);
  ring.rotateX(Math.PI / 2);
  ring.translate(0, 1.02, 0);
  L.add(ring, M.stoneDark);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    cylTo(L, M.column, 0.17, 0.2, 3.6 * scale, 6, Math.cos(a) * r * 0.64, 1 + 1.8 * scale, Math.sin(a) * r * 0.64);
    boxTo(L, M.wall, 0.55, 0.7, 0.14, Math.cos(a) * r * 0.64, 1.5 * scale, Math.sin(a) * r * 0.64, -a + Math.PI * 0.5);
  }
  const body = [];
  for (let i = 0; i < 8; i++) {
    if (i === 0) continue;
    const a0 = (i / 8) * TAU;
    addBox(body, 2.2 * scale, 1.0 * scale, 0.14, Math.cos(a0) * r * 0.47, 1.9 * scale, Math.sin(a0) * r * 0.47, -a0 + Math.PI * 0.5);
  }
  body.forEach((g2) => L.add(g2, M.wall));
  const top1 = 3.85 * scale;
  const roof = octRoofGeometry(r * 0.98, 2.9 * scale, 1.05 * scale, 24, 5);
  roof.translate(0, top1, 0);
  L.add(roof, M.gold);
  const ring2 = new THREE.TorusGeometry(r * 0.98, 0.13, 4, 32);
  ring2.rotateX(Math.PI / 2);
  ring2.translate(0, top1 + 0.15, 0);
  L.add(ring2, M.goldDark);
  const upRoof = octRoofGeometry(r * 0.55, 1.7 * scale, 0.5 * scale, 16, 4);
  upRoof.translate(0, top1 + 1.55 * scale, 0);
  L.add(upRoof, M.gold);
  boxTo(L, M.goldLight, 0.3, 0.65, 0.3, 0, top1 + 3.2 * scale, 0);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    boxTo(L, M.goldDark, 0.16, 0.45, 0.16, Math.cos(a) * r * 0.98, top1 + 0.35, Math.sin(a) * r * 0.98, -a);
  }
  addLanterns(L, M, [-r * 0.45, 0, r * 0.45], r * 0.45, 3.3);
}

function addGate(L, M) {
  const w = 12;
  L.add((() => { const g = new THREE.BoxGeometry(w, 1.0, 6); g.translate(0, 0.5, 0); return g; })(), M.stone);
  for (const sx of [-1, 1]) {
    boxTo(L, M.stoneDark, 1.7, 5.6, 1.7, sx * 3.3, 3.7, 0);
    boxTo(L, M.stone, 0.3, 0.35, 2.2, sx * 3.3, 0.7, 1.6);
  }
  const pillars = [];
  addBox(pillars, 9.2, 1.2, 2.4, 0, 6.6, 0);
  addBox(pillars, 7.2, 0.35, 1.8, 0, 5.9, 0);
  pillars.forEach((g) => L.add(g, M.stoneDark));
  roofAt(L, M, 12.5, 4.6, 1.9, 7.2, 0.9);
  const ridge = [];
  addBox(ridge, 6.5, 0.32, 0.34, 0, 9.15, 0);
  ridge.forEach((g) => L.add(g, M.goldLight));
  addLanterns(L, M, [-3.3, 3.3], 1.4, 4.8);
}

function addBridge(L, M, a, b, width = 2.4) {
  const ax = a[0], ay = a[1], az = a[2];
  const bx = b[0], by = b[1], bz = b[2];
  const midx = (ax + bx) * 0.5;
  const midz = (az + bz) * 0.5;
  const midy = (ay + by) * 0.5 + 1.3;
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(ax, ay, az),
    new THREE.Vector3(midx, midy, midz),
    new THREE.Vector3(bx, by, bz),
  ], false, 'centripetal', 0.5);
  const deck = [];
  const rails = [];
  const posts = [];
  const n = 26;
  for (let i = 0; i < n; i++) {
    const p = curve.getPointAt(i / n);
    const q = curve.getPointAt((i + 1) / n);
    const dx = q.x - p.x;
    const dz = q.z - p.z;
    const dy = q.y - p.y;
    const len = Math.hypot(dx, dz);
    const yaw = Math.atan2(dx, dz);
    const pitch = -Math.atan2(dy, len);
    addBox(deck, width, 0.22, len * 1.08, (p.x + q.x) * 0.5, (p.y + q.y) * 0.5, (p.z + q.z) * 0.5, yaw, pitch, 0);
  }
  for (let i = 0; i <= n; i += 2) {
    const p = curve.getPointAt(i / n);
    const t = curve.getTangentAt(i / n);
    const nx = t.z;
    const nz = -t.x;
    const yaw = Math.atan2(t.x, t.z);
    for (const s of [-1, 1]) {
      addBox(posts, 0.09, 1.0, 0.09, p.x + nx * width * 0.5 * s, p.y + 0.55, p.z + nz * width * 0.5 * s);
      addBox(rails, 0.1, 0.1, 2.1, p.x + nx * width * 0.5 * s, p.y + 1.02, p.z + nz * width * 0.5 * s, yaw);
    }
  }
  deck.forEach((g) => L.add(g, M.wood));
  posts.forEach((g) => L.add(g, M.woodRed));
  rails.forEach((g) => L.add(g, M.woodRed));
  return curve;
}

function addPlaque(root, text, x, y, z, yaw, w = 2.6, h = 0.82) {
  const tex = makePlaqueTexture(text);
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.72, metalness: 0.15 });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.position.set(x, y, z);
  mesh.rotation.y = yaw;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  root.add(mesh);
  return mesh;
}

function addLabel(root, title, sub, x, y, z, scale = 1) {
  const mat = new THREE.SpriteMaterial({
    map: makeLabelTexture(title, sub),
    transparent: true,
    depthWrite: false,
    depthTest: true,
    opacity: 0.9,
  });
  const spr = new THREE.Sprite(mat);
  spr.scale.set(30 * scale, 9.4 * scale, 1);
  spr.position.set(x, y, z);
  spr.renderOrder = 5;
  root.add(spr);
  return spr;
}

export { Bucket, Local, matrixFor, addBox, addCyl, boxTo, cylTo, segGeo, buildMaterials };
export { addHall, addPavilion, addOctPavilion, addGate, addBridge, addPlaque, addLabel, roofAt, addLanterns };
