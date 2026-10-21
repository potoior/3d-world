import * as THREE from 'three';
import { mergeStaticGroup, mergedMesh } from './geometry.js';
import { makeWaterMaterial } from './materials.js';

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const lerp = THREE.MathUtils.lerp;

let seed = 9173;
function rand() {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
}

const OASIS = { x: -190, z: 118, y: 2.35 };
const THERMO = { x: 180, z: 96 };

function makeRockTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, '#d8c0a4');
  g.addColorStop(0.5, '#c9aa8e');
  g.addColorStop(1, '#dcc6ac');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 4200; i++) {
    const warm = rand() > 0.5;
    ctx.fillStyle = warm
      ? `rgba(255,226,190,${0.05 + rand() * 0.12})`
      : `rgba(88,46,28,${0.04 + rand() * 0.13})`;
    const r = 0.4 + rand() * 2.2;
    ctx.beginPath();
    ctx.arc(rand() * 512, rand() * 512, r, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 140; i++) {
    let cx = rand() * 512;
    let cy = rand() * 512;
    ctx.strokeStyle = `rgba(76,38,22,${0.06 + rand() * 0.1})`;
    ctx.lineWidth = 0.5 + rand() * 1.6;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    for (let k = 0; k < 6; k++) {
      cx += (rand() - 0.35) * 22;
      cy += (rand() - 0.3) * 26;
      ctx.lineTo(cx, cy);
    }
    ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(74, 74);
  t.anisotropy = 8;
  return t;
}

function makeSignTexture(title, sub, accent = '#e8b667') {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#2a160d';
  ctx.fillRect(0, 0, 512, 256);
  const g = ctx.createLinearGradient(0, 0, 512, 256);
  g.addColorStop(0, 'rgba(120,52,26,0.55)');
  g.addColorStop(1, 'rgba(42,20,10,0.2)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 256);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 7;
  ctx.strokeRect(12, 12, 488, 232);
  ctx.strokeStyle = 'rgba(232,182,103,0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(26, 26, 460, 204);
  ctx.fillStyle = '#f5d9a6';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '600 84px "Noto Serif CJK SC","Songti SC",serif';
  ctx.fillText(title, 256, 108);
  ctx.fillStyle = 'rgba(240,196,128,0.82)';
  ctx.font = '500 35px "Noto Serif CJK SC","Songti SC",serif';
  ctx.fillText(sub, 256, 192);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

const rockMap = makeRockTexture();

const M = {
  rock: new THREE.MeshStandardMaterial({ map: rockMap, vertexColors: true, roughness: 1, metalness: 0 }),
  distant: new THREE.MeshStandardMaterial({ map: rockMap, color: 0xb9724f, roughness: 1 }),
  boulder: new THREE.MeshStandardMaterial({ color: 0x9a4a2c, roughness: 1 }),
  adobe: new THREE.MeshStandardMaterial({ color: 0xd3ac7a, roughness: 0.96 }),
  adobeLight: new THREE.MeshStandardMaterial({ color: 0xe4c79b, roughness: 0.95 }),
  adobeShade: new THREE.MeshStandardMaterial({ color: 0xa97c50, roughness: 0.98 }),
  wood: new THREE.MeshStandardMaterial({ color: 0x6e4528, roughness: 0.88 }),
  woodDark: new THREE.MeshStandardMaterial({ color: 0x452715, roughness: 0.9 }),
  stone: new THREE.MeshStandardMaterial({ color: 0x9a7457, roughness: 0.95 }),
  stoneLight: new THREE.MeshStandardMaterial({ color: 0xc29f7b, roughness: 0.93 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x2f1b12, roughness: 0.9 }),
  goldStaff: new THREE.MeshStandardMaterial({ color: 0xe8b14c, roughness: 0.34, metalness: 0.22 }),
  goldBand: new THREE.MeshStandardMaterial({ color: 0xa82b18, roughness: 0.42, metalness: 0.15 }),
  mercury: new THREE.MeshStandardMaterial({
    color: 0xff4a20,
    emissive: 0xff3a12,
    emissiveIntensity: 1.1,
    roughness: 0.35,
  }),
  cream: new THREE.MeshStandardMaterial({ color: 0xf2d9ad, roughness: 0.82 }),
  leaf: new THREE.MeshStandardMaterial({ color: 0x3f7a32, roughness: 0.94 }),
  leafLight: new THREE.MeshStandardMaterial({ color: 0x6f9a43, roughness: 0.93 }),
  vine: new THREE.MeshStandardMaterial({ color: 0x3e5a2b, roughness: 0.96 }),
  grape: new THREE.MeshStandardMaterial({ color: 0x5e2f66, roughness: 0.72 }),
  grapeLight: new THREE.MeshStandardMaterial({ color: 0x7d3a73, roughness: 0.7 }),
  poplar: new THREE.MeshStandardMaterial({ color: 0x2f6b32, roughness: 0.95 }),
  poplarLight: new THREE.MeshStandardMaterial({ color: 0x56893b, roughness: 0.94 }),
  trunk: new THREE.MeshStandardMaterial({ color: 0x6c4b31, roughness: 0.98 }),
  teal: new THREE.MeshStandardMaterial({ color: 0x216f6a, roughness: 0.82 }),
  blue: new THREE.MeshStandardMaterial({ color: 0x2b567c, roughness: 0.82 }),
  redDoor: new THREE.MeshStandardMaterial({ color: 0x9b2e22, roughness: 0.82 }),
  flagRed: new THREE.MeshStandardMaterial({ color: 0xb52f25, roughness: 0.85, side: THREE.DoubleSide }),
  flagGold: new THREE.MeshStandardMaterial({ color: 0xe0a13c, roughness: 0.82, side: THREE.DoubleSide }),
  flagTeal: new THREE.MeshStandardMaterial({ color: 0x247d77, roughness: 0.84, side: THREE.DoubleSide }),
  flagPurple: new THREE.MeshStandardMaterial({ color: 0x6a366e, roughness: 0.84, side: THREE.DoubleSide }),
  camel: new THREE.MeshStandardMaterial({ color: 0xb88a56, roughness: 0.92 }),
  camelDark: new THREE.MeshStandardMaterial({ color: 0x7a5532, roughness: 0.94 }),
  blanket: new THREE.MeshStandardMaterial({ color: 0x8f2c22, roughness: 0.8 }),
  blanketGold: new THREE.MeshStandardMaterial({ color: 0xd6a84b, roughness: 0.68, metalness: 0.08 }),
  grass: new THREE.MeshStandardMaterial({ color: 0x5d8739, roughness: 1 }),
};

function addPart(list, geo, x, y, z, ry = 0, rx = 0, rz = 0) {
  if (ry) geo.rotateY(ry);
  if (rx) geo.rotateX(rx);
  if (rz) geo.rotateZ(rz);
  geo.translate(x, y, z);
  list.push(geo);
  return geo;
}

class Builder {
  constructor() {
    this.groups = new Map();
  }
  ensure(mat) {
    if (!this.groups.has(mat)) this.groups.set(mat, []);
    return this.groups.get(mat);
  }
  add(mat, geo) {
    this.ensure(mat).push(geo);
  }
  box(mat, w, h, d, x, y, z, ry = 0, rx = 0, rz = 0) {
    return addPart(this.ensure(mat), new THREE.BoxGeometry(w, h, d), x, y, z, ry, rx, rz);
  }
  cyl(mat, rt, rb, h, seg, x, y, z, rx = 0, rz = 0) {
    return addPart(this.ensure(mat), new THREE.CylinderGeometry(rt, rb, h, seg), x, y, z, 0, rx, rz);
  }
  sphere(mat, r, x, y, z, sx = 1, sy = 1, sz = 1) {
    const g = new THREE.SphereGeometry(r, 10, 8);
    g.scale(sx, sy, sz);
    g.translate(x, y, z);
    this.ensure(mat).push(g);
    return g;
  }
  cone(mat, r, h, seg, x, y, z) {
    return addPart(this.ensure(mat), new THREE.ConeGeometry(r, h, seg), x, y, z);
  }
  icosa(mat, r, x, y, z, sx = 1, sy = 1, sz = 1) {
    const g = new THREE.IcosahedronGeometry(r, 0);
    g.scale(sx, sy, sz);
    g.translate(x, y, z);
    this.ensure(mat).push(g);
    return g;
  }
  build(root) {
    for (const [mat, list] of this.groups) {
      const mesh = mergedMesh(list, mat, true, true);
      if (mesh) root.add(mesh);
    }
    this.groups.clear();
  }
}

export function terrainInfo(x, z) {
  let h = 0.32 + Math.sin(x * 0.014 + 0.6) * Math.cos(z * 0.011 - 0.3) * 0.46 +
    Math.sin(x * 0.043 + z * 0.031) * 0.17;
  const crestZ = -244 + Math.sin(x * 0.0048 + 0.7) * 30 + Math.sin(x * 0.011 + 2.3) * 13 +
    Math.sin(x * 0.023) * 4.2;
  const footZ = -36 + Math.sin(x * 0.009 + 0.2) * 12;
  const backZ = crestZ - 260;
  let gully = 0;
  if (z < footZ && z > backZ - 130) {
    const crest = 124 + 48 * Math.sin(x * 0.0031 + 1.15) + 22 * Math.sin(x * 0.0069 + 0.2) +
      11 * Math.sin(x * 0.016 + 2.6);
    let u;
    if (z >= crestZ) {
      u = clamp01((footZ - z) / Math.max(1, footZ - crestZ));
      u = Math.pow(u, 0.62);
    } else {
      u = 1 - 0.42 * clamp01((crestZ - z) / 260);
    }
    const wob = Math.sin(z * 0.011 + Math.sin(x * 0.008) * 2.2);
    const g1 = Math.pow(0.5 + 0.5 * Math.cos(x * 0.06 + wob * 2.0 + 0.8), 7);
    const g2 = Math.pow(0.5 + 0.5 * Math.cos(x * 0.137 - wob * 2.8 + 2.1), 9);
    const g3 = Math.pow(0.5 + 0.5 * Math.cos(x * 0.026 + wob * 1.2 + 1.6), 4);
    gully = clamp01(g1 * 0.72 + g2 * 0.5 + g3 * 0.18);
    const face = z >= crestZ ? 1 : 0.42;
    const erosion = gully * 0.52 * face;
    const spur = 0.5 + 0.5 * Math.sin(x * 0.012 + z * 0.007);
    let mh = crest * u * (1 - erosion) * (0.8 + 0.2 * spur);
    mh += Math.sin(z * 0.09 + x * 0.015) * 0.85 * u;
    mh += Math.max(0, Math.sin(x * 0.03 + z * 0.01)) * 6.5 * u * (1 - gully);
    h += mh;
  } else if (z <= backZ - 130) {
    h += 22 + Math.sin(x * 0.004 + 0.5) * 13;
  }

  const canyonCenter = 20 * Math.sin(z * 0.0105 + 0.4) + 7 * Math.sin(z * 0.031 + 1.1);
  const canyonWidth = 24 + 7 * Math.sin(z * 0.017);
  const canyon = Math.exp(-Math.pow((x - canyonCenter) / canyonWidth, 2));
  const cut = Math.max(0, (h - 2.6) * 0.94 * canyon);
  h -= cut;

  const od = Math.hypot((x - OASIS.x) / 1.08, z - OASIS.z);
  const oasisMask = 1 - smooth(112, 194, od);
  h = lerp(h, OASIS.y + Math.sin(x * 0.15) * Math.cos(z * 0.13) * 0.08, oasisMask);
  return { h, gully, canyon, od };
}

export function groundHeight(x, z) {
  return terrainInfo(x, z).h;
}

function buildTerrain(root) {
  const geo = new THREE.PlaneGeometry(1900, 1900, 244, 244);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const low = new THREE.Color(0xa84828);
  const mid = new THREE.Color(0xd25c2d);
  const high = new THREE.Color(0xef8b47);
  const pale = new THREE.Color(0xffc07a);
  const dark = new THREE.Color(0x6a2718);
  const plain = new THREE.Color(0xc98a5c);
  const grass = new THREE.Color(0x5d8739);
  const grassDeep = new THREE.Color(0x3d6329);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const info = terrainInfo(x, z);
    const h = info.h;
    pos.setY(i, h);
    const e = clamp01((h - 2) / 150);
    c.copy(low).lerp(mid, smooth(0.03, 0.42, e)).lerp(high, smooth(0.4, 0.92, e));
    const band = 0.5 + 0.5 * Math.sin(h * 0.22 + Math.sin(x * 0.02) * 2.2 + z * 0.006);
    c.lerp(pale, band * 0.15 * e);
    c.lerp(dark, band * 0.2 * (1 - e * 0.45));
    c.lerp(dark, info.gully * 0.45);
    c.lerp(dark, Math.min(0.32, info.canyon * 0.34));
    if (h < 9) c.lerp(plain, 0.42 * (1 - h / 9));
    const oasis = 1 - smooth(112, 194, info.od);
    if (oasis > 0 && h < 7) {
      c.lerp(grass, oasis * 0.86);
      c.lerp(grassDeep, oasis * band * 0.22);
    }
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, M.rock);
  mesh.receiveShadow = true;
  mesh.name = 'flaming-terrain';

  const B = new Builder();
  for (let i = 0; i < 110; i++) {
    const x = -640 + rand() * 1280;
    const z = -140 + rand() * 460;
    const gy = groundHeight(x, z);
    if (gy > 42 || gy < -1) continue;
    const s = 1.1 + rand() * 3.6;
    B.icosa(M.boulder, s, x, gy + s * 0.35, z, 1.4, 0.7, 1.1);
  }
  for (let i = 0; i < 7; i++) {
    const x = -780 + i * 250 + rand() * 60;
    const z = -810 + rand() * 120;
    B.cone(M.distant, 150 + rand() * 120, 130 + rand() * 150, 6, x, 60, z);
  }
  B.build(root);
  return mesh;
}

function addSign(root, texture, x, y, z, w, h, ry = 0) {
  const mat = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.position.set(x, y, z);
  mesh.rotation.y = ry;
  mesh.castShadow = false;
  root.add(mesh);
  const B = new Builder();
  const scale = w / 10;
  B.cyl(M.woodDark, 0.24 * scale, 0.3 * scale, h * 0.9, 6, x - w * 0.34, y - h * 0.45, z - 0.15, 0, 0);
  B.cyl(M.woodDark, 0.24 * scale, 0.3 * scale, h * 0.9, 6, x + w * 0.34, y - h * 0.45, z - 0.15, 0, 0);
  B.build(root);
}

function createOasisFields(root) {
  const B = new Builder();
  const patches = [
    [-238, 145, 21, 15, 0.2], [-164, 142, 18, 13, -0.1], [-212, 178, 24, 16, 0.35],
    [-146, 218, 17, 12, 0.15], [-250, 226, 19, 13, -0.2], [-112, 160, 14, 10, 0.25],
    [-270, 180, 15, 11, 0.1], [-118, 226, 15, 10, -0.3],
  ];
  patches.forEach(([x, z, rx, rz, rot]) => {
    const gy = groundHeight(x, z);
    const g = new THREE.CircleGeometry(1, 18);
    g.rotateX(-Math.PI / 2);
    g.scale(rx, 1, rz);
    g.rotateY(rot);
    g.translate(x, gy + 0.075, z);
    B.add(M.grass, g);
  });
  B.build(root);
}

function createPond(root, waterMaterials) {
  const pondGeo = new THREE.CircleGeometry(24, 44);
  pondGeo.rotateX(-Math.PI / 2);
  pondGeo.scale(1.45, 1, 0.9);
  const mat = makeWaterMaterial();
  mat.uniforms.uDeep.value.set(0x1f5a55);
  mat.uniforms.uShallow.value.set(0x4f8f74);
  mat.uniforms.uSky.value.set(0xf0c48d);
  mat.uniforms.uSun.value.set(0xffd9a0);
  const water = new THREE.Mesh(pondGeo, mat);
  water.position.set(OASIS.x - 8, OASIS.y + 0.18, OASIS.z - 2);
  water.renderOrder = 1;
  root.add(water);
  waterMaterials.push(mat);

  const B = new Builder();
  for (let i = 0; i < 46; i++) {
    const a = (i / 46) * Math.PI * 2;
    const x = OASIS.x - 8 + Math.cos(a) * 35.5;
    const z = OASIS.z - 2 + Math.sin(a) * 22.1;
    const gy = groundHeight(x, z);
    B.icosa(M.stoneLight, 0.7 + rand() * 0.8, x, gy + 0.3, z, 1.5, 0.7, 1.2);
  }
  B.build(root);
}

function createKarez(root, waterMaterials) {
  const pts = [
    [-326, -26], [-306, 4], [-284, 36], [-262, 68], [-238, 94], [-214, 108], [-200, 114],
  ];
  const curve = new THREE.CatmullRomCurve3(
    pts.map(([x, z]) => new THREE.Vector3(x, groundHeight(x, z) + 0.18, z)),
    false,
    'catmullrom',
    0.3
  );
  const sample = curve.getSpacedPoints(70);
  const verts = [];
  const uvs = [];
  const indices = [];
  const width = 3.1;
  for (let i = 0; i < sample.length; i++) {
    const p = sample[i];
    const q = sample[Math.min(sample.length - 1, i + 1)];
    const r = sample[Math.max(0, i - 1)];
    const dx = q.x - r.x;
    const dz = q.z - r.z;
    const len = Math.hypot(dx, dz) || 1;
    const nx = -dz / len;
    const nz = dx / len;
    verts.push(p.x - nx * width * 0.5, p.y, p.z - nz * width * 0.5);
    verts.push(p.x + nx * width * 0.5, p.y, p.z + nz * width * 0.5);
    uvs.push(0, i / 5, 1, i / 5);
    if (i < sample.length - 1) {
      const a = i * 2;
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const mat = makeWaterMaterial();
  mat.uniforms.uDeep.value.set(0x205d5c);
  mat.uniforms.uShallow.value.set(0x5a9a7e);
  mat.uniforms.uSky.value.set(0xeebd86);
  const water = new THREE.Mesh(geo, mat);
  water.renderOrder = 1;
  root.add(water);
  waterMaterials.push(mat);

  const B = new Builder();
  for (let i = 0; i < sample.length; i += 2) {
    const p = sample[i];
    const q = sample[Math.min(sample.length - 1, i + 2)];
    if (p.distanceTo(q) < 0.01) continue;
    const dx = q.x - p.x;
    const dz = q.z - p.z;
    const len = Math.hypot(dx, dz);
    const ang = Math.atan2(dx, dz);
    B.box(M.stone, 0.55, 0.55, len + 0.3, p.x + (-dz / len) * 1.75, p.y + 0.12, p.z + (dx / len) * 1.75, ang, 0, 0);
    B.box(M.stone, 0.55, 0.55, len + 0.3, p.x - (-dz / len) * 1.75, p.y + 0.12, p.z - (dx / len) * 1.75, ang, 0, 0);
  }
  const shaftIndices = [12, 24, 36, 48, 58, 66];
  shaftIndices.forEach((idx, k) => {
    const p = sample[idx];
    if (!p) return;
    const gy = groundHeight(p.x, p.z);
    B.cyl(M.adobeShade, 3.6, 4.7, 1.15, 12, p.x, gy + 0.45, p.z);
    B.cyl(M.stoneLight, 1.55, 1.55, 0.28, 12, p.x, gy + 1.08, p.z);
    B.cyl(M.dark, 1.25, 1.25, 0.12, 12, p.x, gy + 1.22, p.z);
    if (k % 2 === 0) {
      B.box(M.wood, 0.22, 2.8, 0.22, p.x + 2.9, gy + 1.6, p.z);
      B.box(M.wood, 0.22, 2.8, 0.22, p.x - 2.9, gy + 1.6, p.z);
      B.box(M.wood, 6.2, 0.2, 0.2, p.x, gy + 3.0, p.z);
    }
  });
  const gy0 = groundHeight(pts[0][0], pts[0][1]);
  B.box(M.stone, 6.2, 5.6, 2.2, pts[0][0], gy0 + 2.8, pts[0][1]);
  B.box(M.stoneLight, 5.0, 0.7, 2.6, pts[0][0], gy0 + 5.7, pts[0][1]);
  B.box(M.dark, 2.4, 3.3, 0.3, pts[0][0], gy0 + 2.35, pts[0][1] + 1.18);
  B.build(root);
  addSign(root, makeSignTexture('坎儿井', 'KAREZ · 地下雪水'), pts[0][0] + 5.9, gy0 + 4.3, pts[0][1] + 2.4, 7.5, 3.75, 0.35);
}

function createThermometer(root) {
  const gy = groundHeight(THERMO.x, THERMO.z);
  const B = new Builder();
  B.cyl(M.stone, 15.5, 17.0, 1.3, 24, THERMO.x, gy + 0.65, THERMO.z);
  B.cyl(M.stoneLight, 12.6, 13.2, 0.3, 24, THERMO.x, gy + 1.38, THERMO.z);
  const baseY = gy + 1.4;
  const staffH = 80;
  B.cyl(M.goldStaff, 2.25, 2.55, staffH, 18, THERMO.x, baseY + staffH * 0.5, THERMO.z);
  [12, 29, 46, 63].forEach((y) => {
    B.cyl(M.goldBand, 2.48, 2.48, 1.25, 18, THERMO.x, baseY + y, THERMO.z);
  });
  B.sphere(M.goldStaff, 2.9, THERMO.x, baseY + staffH + 1.2, THERMO.z, 1, 1.15, 1);
  B.cone(M.goldBand, 1.4, 3.4, 10, THERMO.x, baseY + staffH + 4.4, THERMO.z);
  B.sphere(M.goldStaff, 0.55, THERMO.x, baseY + staffH + 6.4, THERMO.z);
  const frontZ = THERMO.z + 2.35;
  B.box(M.dark, 1.5, 59, 0.55, THERMO.x, baseY + 37, frontZ);
  B.box(M.mercury, 0.72, 55, 0.5, THERMO.x, baseY + 36, frontZ + 0.3);
  B.sphere(M.mercury, 2.15, THERMO.x, baseY + 4.9, frontZ + 0.3, 1, 1.05, 1);
  for (let i = 0; i < 11; i++) {
    const y = baseY + 13 + i * 5.2;
    B.box(M.cream, 1.5 + (i % 5 === 0 ? 0.9 : 0), 0.24, 0.16, THERMO.x - 3.2, y, frontZ + 0.2);
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    B.cyl(M.woodDark, 0.18, 0.24, 4.2, 6, THERMO.x + Math.cos(a) * 10.3, baseY + 2.1, THERMO.z + Math.sin(a) * 10.3);
    B.box(M.cream, 1.6, 1.1, 0.12, THERMO.x + Math.cos(a) * 10.3, baseY + 4.6, THERMO.z + Math.sin(a) * 10.3, -a + Math.PI / 2);
  }
  B.build(root);
  addSign(
    root,
    makeSignTexture('金箍棒', '火焰山 · 地表 89℃'),
    THERMO.x - 18,
    gy + 5.2,
    THERMO.z + 12,
    12.5,
    6.25,
    0.18
  );
}

function createHouse(B, x, z, w, d, h, ry, style = 0) {
  const gy = groundHeight(x, z);
  B.box(M.adobe, w, h, d, x, gy + h * 0.5, z, ry);
  B.box(M.adobeShade, w + 0.85, 0.45, d + 0.85, x, gy + h + 0.12, z, ry);
  B.box(M.adobeLight, w - 1.4, 0.38, d - 1.4, x, gy + h + 0.38, z, ry);
  const c = Math.cos(ry);
  const s = Math.sin(ry);
  const frontZ = d * 0.5 + 0.18;
  const fx = x + s * frontZ;
  const fz = z + c * frontZ;
  const doorMat = style % 3 === 0 ? M.teal : style % 3 === 1 ? M.blue : M.redDoor;
  B.box(doorMat, 2.0, 3.0, 0.22, fx, gy + 1.5, fz, ry);
  B.box(M.woodDark, 2.6, 0.3, 0.32, fx, gy + 3.12, fz, ry);
  for (const side of [-1, 1]) {
    const wx = x + s * frontZ + c * side * (w * 0.28);
    const wz = z + c * frontZ - s * side * (w * 0.28);
    B.box(M.dark, 1.25, 1.15, 0.16, wx, gy + 3.9, wz, ry);
    B.box(M.wood, 1.55, 0.16, 0.24, wx, gy + 4.55, wz, ry);
  }
  for (let i = 0; i < 4; i++) {
    const lx = -w * 0.3 + i * w * 0.2;
    B.box(M.woodDark, 0.24, 0.24, d + 1.1, x + c * lx, gy + h - 0.35, z - s * lx, ry);
  }
  if (style === 1) {
    B.box(M.adobeShade, w * 0.85, 0.22, 3.2, x + s * (frontZ + 1.4), gy + 3.35, z + c * (frontZ + 1.4), ry);
    for (const side of [-0.35, 0.35]) {
      const px = x + s * (frontZ + 2.7) + c * side * w;
      const pz = z + c * (frontZ + 2.7) - s * side * w;
      B.cyl(M.wood, 0.16, 0.2, 3.3, 6, px, gy + 1.65, pz);
    }
  }
  if (style === 2) {
    B.box(M.adobeShade, w * 0.7, 2.6, d * 0.7, x, gy + h + 1.55, z, ry);
    B.box(M.adobeLight, w * 0.76, 0.3, d * 0.76, x, gy + h + 2.95, z, ry);
    B.box(M.dark, 0.9, 1.1, 0.16, x + s * (d * 0.35 + 0.1), gy + h + 1.7, z + c * (d * 0.35 + 0.1), ry);
  }
}

function createChunche(B, x, z, s = 1) {
  const gy = groundHeight(x, z);
  const w = 8 * s;
  const h = 8.5 * s;
  const d = 7 * s;
  B.box(M.adobeShade, w, h, d, x, gy + h * 0.5, z);
  B.box(M.adobeLight, w + 0.7, 0.35, d + 0.7, x, gy + h + 0.1, z);
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      B.box(M.dark, 0.85 * s, 0.85 * s, 0.14, x - w * 0.3 + col * w * 0.2, gy + 1.55 * s + row * 1.55 * s, z + d * 0.5 + 0.03);
      B.box(M.dark, 0.14, 0.85 * s, 0.85 * s, x + w * 0.5 + 0.03, gy + 1.55 * s + row * 1.55 * s, z - d * 0.3 + col * d * 0.2);
    }
  }
}

function createMosque(B, x, z) {
  const gy = groundHeight(x, z);
  B.box(M.adobe, 11, 6.2, 10, x, gy + 3.1, z);
  B.box(M.adobeShade, 12, 0.5, 11, x, gy + 6.4, z);
  B.cyl(M.adobeLight, 5.4, 5.4, 1.2, 18, x, gy + 6.9, z);
  const dome = new THREE.SphereGeometry(5.1, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5);
  dome.scale(1, 1.15, 1);
  dome.translate(x, gy + 7.4, z);
  B.add(M.teal, dome);
  B.cyl(M.goldStaff, 0.18, 0.3, 2.1, 8, x, gy + 13.4, z);
  B.sphere(M.goldStaff, 0.42, x, gy + 14.3, z);
  B.box(M.dark, 2.2, 3.2, 0.2, x, gy + 1.6, z + 5.05);
  B.box(M.woodDark, 3.2, 0.3, 0.5, x, gy + 3.35, z + 5.1);
  B.cyl(M.adobe, 1.7, 2.05, 17, 16, x + 9.5, gy + 8.5, z - 2);
  B.cyl(M.adobeLight, 2.15, 2.15, 0.5, 16, x + 9.5, gy + 17.1, z - 2);
  B.sphere(M.teal, 1.75, x + 9.5, gy + 18.1, z - 2, 1, 1.5, 1);
  B.cyl(M.goldStaff, 0.12, 0.18, 1.6, 8, x + 9.5, gy + 20.3, z - 2);
}

function createVillage(root) {
  const B = new Builder();
  const houses = [
    [-252, 160, 18, 14, 7.5, 0.06, 0],
    [-224, 180, 15, 13, 6.6, -0.1, 1],
    [-193, 184, 17, 12, 7.0, 0.05, 2],
    [-161, 178, 14, 12, 6.2, 0.12, 0],
    [-134, 156, 16, 13, 7.2, 0.18, 1],
    [-142, 88, 14, 12, 6.4, -0.15, 2],
    [-181, 78, 17, 13, 7.0, 0.04, 0],
    [-220, 84, 15, 12, 6.5, 0.1, 1],
    [-251, 112, 16, 13, 7.4, -0.05, 2],
    [-116, 124, 13, 11, 6.0, 0.2, 0],
  ];
  houses.forEach(([x, z, w, d, h, ry, style]) => createHouse(B, x, z, w, d, h, ry, style));
  createChunche(B, -254, 198, 1.0);
  createChunche(B, -146, 200, 0.9);
  createMosque(B, -121, 94);
  for (let i = 0; i < 3; i++) {
    const x = -178 + i * 17;
    const z = 145;
    const gy = groundHeight(x, z);
    B.box(M.stone, 5.2, 0.55, 2.4, x, gy + 0.28, z);
    B.box(M.wood, 4.0, 0.18, 0.25, x, gy + 1.15, z + 1.0);
    B.box(M.wood, 4.0, 0.18, 0.25, x, gy + 1.15, z - 1.0);
  }
  B.build(root);
}

function createTrellises(root) {
  const B = new Builder();
  const zs = [184, 204, 224, 244, 264];
  const x0 = -282;
  const x1 = -120;
  zs.forEach((z, row) => {
    for (let x = x0; x <= x1; x += 7.2) {
      const gy = groundHeight(x, z);
      B.cyl(M.wood, 0.16, 0.22, 4.8, 6, x, gy + 2.4, z);
    }
    const gy = groundHeight((x0 + x1) * 0.5, z);
    B.box(M.wood, x1 - x0 + 1.2, 0.2, 0.24, (x0 + x1) * 0.5, gy + 4.72, z);
    B.box(M.wood, x1 - x0 + 1.2, 0.16, 0.18, (x0 + x1) * 0.5, gy + 4.45, z - 1.05);
    B.box(M.wood, x1 - x0 + 1.2, 0.16, 0.18, (x0 + x1) * 0.5, gy + 4.45, z + 1.05);
    for (let x = x0 + 0.8; x <= x1 - 0.8; x += 1.35) {
      const g2 = groundHeight(x, z);
      B.icosa(row % 2 ? M.leaf : M.leafLight, 0.7 + rand() * 0.34, x, g2 + 4.16 + rand() * 0.4, z + (rand() - 0.5) * 3.0, 2.1, 0.62, 1.7);
      if (rand() > 0.42) {
        B.icosa(M.leaf, 0.55 + rand() * 0.25, x + (rand() - 0.5) * 1.3, g2 + 3.6 + rand() * 0.7, z + (rand() - 0.5) * 2.8, 1.1, 1.5, 1.1);
      }
    }
    for (let x = x0 + 1.5; x <= x1 - 1; x += 2.35) {
      const g2 = groundHeight(x, z);
      if (rand() > 0.35) {
        const gx = x + (rand() - 0.5) * 1.2;
        const gz = z + (rand() - 0.5) * 1.7;
        B.icosa(M.grape, 0.3 + rand() * 0.15, gx, g2 + 3.55 + rand() * 0.45, gz, 0.8, 1.25, 0.8);
        B.icosa(M.grapeLight, 0.2 + rand() * 0.1, gx + 0.18, g2 + 3.9, gz + 0.16, 0.8, 1.1, 0.8);
      }
    }
    for (let x = x0; x <= x1; x += 3.6) {
      const g3 = groundHeight(x, z + 0.8);
      B.box(M.vine, 0.08, 0.08, 1.1, x, g3 + 4.42, z + 0.55, 0.1);
    }
  });
  B.build(root);
}

function createPoplar(B, x, z, s, light) {
  const gy = groundHeight(x, z);
  const h = (15 + rand() * 6) * s;
  B.cyl(M.trunk, 0.5 * s, 0.82 * s, h, 7, x, gy + h * 0.5, z);
  const mat = light ? M.poplarLight : M.poplar;
  for (let i = 0; i < 6; i++) {
    const t = i / 6;
    const r = (3.2 - t * 1.5) * s;
    B.icosa(mat, r, x + (rand() - 0.5) * 1.2 * s, gy + h * (0.36 + t * 0.14), z + (rand() - 0.5) * 1.2 * s, 0.78, 1.65, 0.78);
  }
  B.icosa(mat, 1.7 * s, x, gy + h * 1.02, z, 0.8, 1.8, 0.8);
}

function createPoplars(root) {
  const B = new Builder();
  const spots = [];
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const r = 46 + (i % 4) * 7;
    spots.push([OASIS.x + Math.cos(a) * r * 1.2, OASIS.z + Math.sin(a) * r * 0.9, 0.8 + (i % 3) * 0.12]);
  }
  for (let i = 0; i < 10; i++) {
    spots.push([-300 + i * 9 + rand() * 4, 172 + rand() * 8, 0.75 + rand() * 0.3]);
    spots.push([-286 + i * 11, 34 + rand() * 8, 0.7 + rand() * 0.3]);
  }
  for (let i = 0; i < 8; i++) {
    spots.push([-320 + i * 17, 128 + (i % 2) * 20, 0.8 + rand() * 0.2]);
  }
  spots.forEach(([x, z, s], i) => createPoplar(B, x, z, s, i % 3 === 0));
  B.build(root);
}

function createFlags(root, dynamic) {
  const B = new Builder();
  const specs = [
    { x: 226, z: 84, top: 19, w: 6.0, h: 3.4, mat: M.flagRed },
    { x: 142, z: 174, top: 16, w: 5.2, h: 3.0, mat: M.flagGold },
    { x: -147, z: 174, top: 15, w: 5.0, h: 2.9, mat: M.flagTeal },
    { x: -238, z: 206, top: 17, w: 5.6, h: 3.2, mat: M.flagPurple },
  ];
  const flags = [];
  specs.forEach((spec, index) => {
    const gy = groundHeight(spec.x, spec.z);
    B.cyl(M.woodDark, 0.2, 0.34, spec.top + 1.5, 8, spec.x, gy + (spec.top + 1.5) * 0.5, spec.z);
    B.sphere(M.goldStaff, 0.32, spec.x, gy + spec.top + 1.7, spec.z);
    B.box(M.stone, 2.1, 0.55, 2.1, spec.x, gy + 0.27, spec.z);
    const geo = new THREE.PlaneGeometry(spec.w, spec.h, 16, 7);
    geo.translate(spec.w * 0.5, 0, 0);
    const mesh = new THREE.Mesh(geo, spec.mat);
    mesh.position.set(spec.x, gy + spec.top - spec.h * 0.5, spec.z);
    mesh.rotation.y = -0.45 + index * 0.22;
    mesh.castShadow = true;
    dynamic.add(mesh);
    flags.push({
      mesh,
      geo,
      base: Float32Array.from(geo.attributes.position.array),
      w: spec.w,
      speed: 3.9 + index * 0.35,
      phase: index * 1.7,
    });
  });
  B.build(root);
  return flags;
}

function createCamel(scale = 1) {
  const group = new THREE.Group();
  const B = new Builder();
  B.sphere(M.camel, 1.15, 0, 2.05, 0, 0.86, 0.92, 1.6);
  B.sphere(M.camel, 0.72, 0, 2.78, -0.55, 1, 1.1, 0.9);
  B.sphere(M.camel, 0.62, 0, 2.72, 0.5, 1, 1.1, 0.9);
  const neck = new THREE.CylinderGeometry(0.25, 0.44, 1.9, 7);
  neck.rotateX(0.6);
  neck.translate(0, 2.75, 1.35);
  B.add(M.camel, neck);
  B.sphere(M.camel, 0.38, 0, 3.55, 2.15, 0.85, 1, 1.35);
  B.cone(M.camelDark, 0.1, 0.3, 4, -0.22, 3.84, 2.08);
  B.cone(M.camelDark, 0.1, 0.3, 4, 0.22, 3.84, 2.08);
  B.box(M.blanket, 1.7, 0.14, 2.0, 0, 2.85, 0.1);
  B.box(M.blanketGold, 1.82, 0.34, 0.08, 0, 2.72, -0.75);
  B.box(M.blanketGold, 1.82, 0.34, 0.08, 0, 2.72, 0.75);
  B.sphere(M.blanket, 0.55, 0, 3.4, -0.15, 0.8, 1.1, 0.75);
  B.sphere(M.camelDark, 0.22, 0, 4.05, -0.15);
  B.build(group);
  const legs = [];
  for (const sx of [-0.44, 0.44]) {
    for (const sz of [-0.88, 0.88]) {
      const pivot = new THREE.Group();
      pivot.position.set(sx, 1.62, sz);
      const parts = [];
      addPart(parts, new THREE.CylinderGeometry(0.1, 0.08, 1.55, 6), 0, -0.78, 0);
      const foot = new THREE.SphereGeometry(0.15, 6, 5);
      foot.scale(1, 0.45, 1.4);
      addPart(parts, foot, 0, -1.52, 0.06);
      const leg = mergedMesh(parts, M.camelDark, true, true);
      pivot.add(leg);
      group.add(pivot);
      legs.push(pivot);
    }
  }
  group.scale.setScalar(scale);
  return { group, legs };
}

function createHeat() {
  const group = new THREE.Group();
  const uniforms = { uTime: { value: 0 } };
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms,
    vertexShader: `
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec3 p = position;
        p.y += sin(p.x * 0.018 + uTime * 1.3) * 1.4;
        p.x += sin(p.y * 0.07 + uTime * 0.8) * 0.8;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        float n = sin(vUv.x * 46.0 + uTime * 2.6 + sin(vUv.y * 9.0 + uTime * 1.4) * 3.0);
        n += 0.65 * sin(vUv.x * 91.0 - uTime * 3.8 + vUv.y * 4.0);
        n += 0.35 * sin(vUv.x * 18.0 + uTime * 1.1);
        float edge = smoothstep(0.0, 0.2, vUv.y) * smoothstep(1.0, 0.8, vUv.y);
        edge *= smoothstep(0.0, 0.13, vUv.x) * smoothstep(1.0, 0.87, vUv.x);
        float a = smoothstep(0.45, 1.0, n) * 0.075 * edge;
        vec3 col = mix(vec3(1.0, 0.42, 0.16), vec3(1.0, 0.82, 0.55), vUv.y);
        gl_FragColor = vec4(col, a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const specs = [
    [0, 18, 228, 620, 54, 0.0],
    [-95, 22, 132, 520, 48, 0.14],
    [86, 17, 38, 550, 50, -0.13],
    [0, 12, -58, 480, 42, 0.07],
  ];
  specs.forEach(([x, y, z, w, h, ry]) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h, 32, 8), mat);
    mesh.position.set(x, y, z);
    mesh.rotation.y = ry;
    mesh.renderOrder = 4;
    group.add(mesh);
  });

  const count = 220;
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = -280 + rand() * 560;
    positions[i * 3 + 1] = rand() * 34;
    positions[i * 3 + 2] = -90 + rand() * 340;
    seeds[i] = rand();
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  pGeo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  const pMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms,
    vertexShader: `
      uniform float uTime;
      attribute float aSeed;
      varying float vFade;
      void main() {
        vec3 p = position;
        p.y = mod(p.y + uTime * (1.1 + aSeed * 1.7), 34.0);
        p.x += sin(uTime * 0.9 + aSeed * 20.0) * 2.2;
        p.z += cos(uTime * 0.7 + aSeed * 17.0) * 2.0;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp((1.8 + aSeed * 2.6) * (220.0 / max(1.0, -mv.z)), 1.0, 9.0);
        vFade = smoothstep(0.0, 3.0, p.y) * (1.0 - smoothstep(27.0, 34.0, p.y));
      }
    `,
    fragmentShader: `
      varying float vFade;
      void main() {
        float d = length(gl_PointCoord - vec2(0.5));
        float a = smoothstep(0.5, 0.05, d) * vFade * 0.24;
        gl_FragColor = vec4(1.0, 0.66, 0.34, a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const points = new THREE.Points(pGeo, pMat);
  points.renderOrder = 5;
  group.add(points);
  return { group, uniforms };
}

export function buildFlamingScene() {
  const staticRoot = new THREE.Group();
  const waterMaterials = [];

  const terrain = buildTerrain(staticRoot);
  createPond(staticRoot, waterMaterials);
  createOasisFields(staticRoot);
  createKarez(staticRoot, waterMaterials);
  createThermometer(staticRoot);
  createVillage(staticRoot);
  createTrellises(staticRoot);
  createPoplars(staticRoot);

  const dynamic = new THREE.Group();
  const flags = createFlags(staticRoot, dynamic);

  addSign(
    staticRoot,
    makeSignTexture('葡萄沟', 'GRAPE VALLEY · 葡萄长廊'),
    -196,
    groundHeight(-196, 168) + 4.6,
    168,
    9.5,
    4.75,
    0.05
  );

  const merged = mergeStaticGroup(staticRoot);
  merged.add(terrain);
  const lifeGroup = new THREE.Group();
  lifeGroup.name = 'flaming-life';
  merged.add(lifeGroup);
  lifeGroup.add(dynamic);

  const camelPath = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-128, 0, 250),
    new THREE.Vector3(-40, 0, 244),
    new THREE.Vector3(52, 0, 228),
    new THREE.Vector3(146, 0, 204),
    new THREE.Vector3(232, 0, 162),
    new THREE.Vector3(270, 0, 96),
    new THREE.Vector3(248, 0, 28),
    new THREE.Vector3(168, 0, -2),
    new THREE.Vector3(82, 0, 24),
    new THREE.Vector3(12, 0, 74),
    new THREE.Vector3(-38, 0, 132),
    new THREE.Vector3(-84, 0, 196),
  ], true, 'catmullrom', 0.4);

  const camels = [];
  for (let i = 0; i < 6; i++) {
    const c = createCamel(0.98 + (i % 2) * 0.07);
    c.offset = i * 0.028;
    c.phase = i * 1.55;
    lifeGroup.add(c.group);
    camels.push(c);
  }

  const heat = createHeat();
  lifeGroup.add(heat.group);

  const tmp = new THREE.Vector3();
  const tmp2 = new THREE.Vector3();
  const flagPositions = flags.map((f) => f.geo.attributes.position);

  const life = {
    update(time, dt) {
      heat.uniforms.uTime.value = time;
      waterMaterials.forEach((mat) => {
        mat.uniforms.uTime.value = time;
      });
      M.mercury.emissiveIntensity = 0.85 + Math.sin(time * 2.1) * 0.32;
      flags.forEach((f) => {
        const pos = f.geo.attributes.position;
        pos.array.set(f.base);
        for (let i = 0; i < pos.count; i++) {
          const x = f.base[i * 3];
          const y = f.base[i * 3 + 1];
          const k = Math.max(0, x / f.w);
          pos.setZ(i, (Math.sin(time * f.speed - x * 1.65 + y * 0.55 + f.phase) * 0.52 +
            Math.sin(time * f.speed * 0.52 + x * 3.1 + f.phase) * 0.14) * k);
          pos.setY(i, y + Math.sin(time * 1.3 + x * 0.8 + f.phase) * 0.08 * k);
        }
        pos.needsUpdate = true;
        f.geo.computeVertexNormals();
      });
      camels.forEach((c, i) => {
        const t = (time * 0.0095 + c.offset) % 1;
        camelPath.getPointAt(t, tmp);
        camelPath.getPointAt((t + 0.004) % 1, tmp2);
        const gy = groundHeight(tmp.x, tmp.z);
        const gy2 = groundHeight(tmp2.x, tmp2.z);
        const dx = tmp2.x - tmp.x;
        const dz = tmp2.z - tmp.z;
        const len = Math.hypot(dx, dz) || 1;
        c.group.position.set(tmp.x, gy + Math.abs(Math.sin(time * 3.1 + c.phase)) * 0.06, tmp.z);
        c.group.rotation.y = Math.atan2(dx, dz);
        const slope = Math.atan2(gy2 - gy, len);
        c.group.rotation.x = THREE.MathUtils.clamp(-slope * 0.7, -0.2, 0.2);
        c.legs.forEach((leg, k) => {
          leg.rotation.x = Math.sin(time * 3.1 + c.phase + (k % 2 ? Math.PI : 0) + (k > 1 ? 0.5 : 0)) * 0.36;
        });
      });
    },
  };

  const stats = {
    ridges: 1,
    gullies: 3,
    thermometer: 1,
    trellisRows: 5,
    karezShafts: 6,
    camels: camels.length,
    flags: flags.length,
    houses: 10,
    poplars: 46,
    heat: 1,
  };

  return {
    group: merged,
    waterMaterials,
    life,
    stats,
    camels: camels.map((c) => c.group),
    flags: flags.map((f) => f.mesh),
    heat: heat.group,
  };
}
