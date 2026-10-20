import * as THREE from 'three';
import { mats } from './materials.js';

export const WATER_Y = 0.55;
const WORLD = 2700;
const CELLS = 250;

export function riverCenter(z) {
  return 58 * Math.sin(z * 0.0125) + 96 * Math.sin(z * 0.0042 + 0.7) + 30 * Math.sin(z * 0.027 + 1.2);
}

export function riverHalfWidth(z) {
  return 50 + 10 * Math.sin(z * 0.008 + 2.1) + 5 * Math.sin(z * 0.019 - 0.4);
}

function smooth(t) {
  const v = t < 0 ? 0 : t > 1 ? 1 : t;
  return v * v * (3 - 2 * v);
}

function gauss(x, z, cx, cz, sx, sz, amp) {
  const dx = (x - cx) / sx;
  const dz = (z - cz) / sz;
  return amp * Math.exp(-(dx * dx + dz * dz));
}

export function terrainHeight(x, z) {
  const c = riverCenter(z);
  const d = Math.abs(x - c);
  const w = riverHalfWidth(z);
  if (d < w) {
    const t = smooth((w - d) / w);
    return -0.85 - 3.2 * t;
  }
  const t = smooth((d - w) / 9);
  let h = -0.85 + 2.45 * t;
  h += 0.5 * Math.sin(x * 0.012 + z * 0.009) * smooth((d - w) / 40);
  h += 0.35 * Math.sin(x * 0.041 - z * 0.026 + 1.2) * smooth((d - w) / 55);
  h += Math.max(0, d - w - 32) * 0.035;
  h += gauss(x, z, -520, -450, 210, 260, 22);
  h += gauss(x, z, 610, 350, 250, 300, 16);
  h += gauss(x, z, 430, -680, 230, 220, 18);
  h += gauss(x, z, -480, 620, 250, 230, 12);
  return Math.min(85, h);
}

export function isWater(x, z, margin = 0) {
  return terrainHeight(x, z) < WATER_Y + margin;
}

export function landAt(x, z) {
  return terrainHeight(x, z) - WATER_Y;
}

export function createTerrain() {
  const geo = new THREE.PlaneGeometry(WORLD, WORLD, CELLS, CELLS);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setY(i, terrainHeight(pos.getX(i), pos.getZ(i)));
  }
  geo.computeVertexNormals();
  const nrm = geo.attributes.normal;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  const grass = new THREE.Color(0x7f8b58);
  const lush = new THREE.Color(0x5e7646);
  const sand = new THREE.Color(0xc7b992);
  const wet = new THREE.Color(0x9c9d77);
  const bed = new THREE.Color(0x567a6d);
  const rock = new THREE.Color(0x9b6046);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const slope = 1 - nrm.getY(i);
    const moist = 0.5 + 0.5 * Math.sin(x * 0.008 + z * 0.006);
    c.copy(grass).lerp(lush, moist * 0.7);
    if (y < 2.4) {
      c.copy(wet).lerp(sand, smooth((0.7 - y) * 0.7)).lerp(grass, smooth(y / 2.4));
    }
    if (y < -0.2) c.copy(bed);
    c.lerp(rock, smooth(slope * 1.35) * 0.62);
    const v = 0.9 + 0.1 * Math.sin(x * 0.19) * Math.cos(z * 0.16);
    colors[i * 3] = c.r * v;
    colors[i * 3 + 1] = c.g * v;
    colors[i * 3 + 2] = c.b * v;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mesh = new THREE.Mesh(geo, mats.ground);
  mesh.receiveShadow = true;
  return mesh;
}

export function createWater() {
  const rows = 250;
  const cols = 12;
  const z0 = -1120;
  const z1 = 1120;
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let i = 0; i <= rows; i++) {
    const z = z0 + ((z1 - z0) * i) / rows;
    const c = riverCenter(z);
    const w = riverHalfWidth(z) + 7.5;
    for (let j = 0; j <= cols; j++) {
      const t = j / cols - 0.5;
      const off = t * 2 * w;
      positions.push(c + off, 0, z);
      uvs.push(j / cols, i / rows);
    }
  }
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const a = i * (cols + 1) + j;
      const b = a + 1;
      const c2 = a + cols + 1;
      const d = c2 + 1;
      indices.push(a, c2, b, b, c2, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function makeMistTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 192;
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 0, 192);
  grd.addColorStop(0, 'rgba(255,255,255,0)');
  grd.addColorStop(0.45, 'rgba(255,255,255,0.85)');
  grd.addColorStop(0.72, 'rgba(255,255,255,0.5)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 512, 192);
  g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 38; i++) {
    const x = Math.sin(i * 91.7) * 0.5 + 0.5;
    const y = Math.sin(i * 31.3 + 1.7) * 0.5 + 0.5;
    const r = 28 + (i % 7) * 13;
    const rg = g.createRadialGradient(x * 512, y * 192, 0, x * 512, y * 192, r);
    rg.addColorStop(0, 'rgba(0,0,0,0.35)');
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rg;
    g.fillRect(0, 0, 512, 192);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

let mistTex = null;

export function createMist() {
  const group = new THREE.Group();
  if (!mistTex) mistTex = makeMistTexture();
  const mat = new THREE.MeshBasicMaterial({
    map: mistTex,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
    toneMapped: false,
  });
  const bands = [
    [-120, 26, 1180, 72, 0.34, 0.9],
    [-320, 52, 1420, 112, 0.28, 1.2],
    [-560, 88, 1640, 150, 0.22, 1.5],
    [-780, 132, 1840, 190, 0.17, 1.8],
    [180, 38, 1280, 88, 0.26, 1.1],
    [440, 74, 1520, 130, 0.2, 1.4],
  ];
  const layers = [];
  for (const [z, y, w, h, o, drift] of bands) {
    const m = mat.clone();
    m.opacity = o;
    m.color.set(0xf1f0e7);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
    mesh.position.set(0, y, z);
    mesh.renderOrder = 3;
    mesh.userData.baseX = 0;
    mesh.userData.baseY = y;
    mesh.userData.drift = drift;
    mesh.userData.phase = z * 0.01;
    layers.push(mesh);
    group.add(mesh);
  }
  group.userData.layers = layers;
  group.userData.update = (time) => {
    for (const m of layers) {
      const d = m.userData;
      m.position.x = Math.sin(time * 0.018 * d.drift + d.phase) * 55;
      m.position.y = d.baseY + Math.sin(time * 0.05 + d.phase) * 3.5;
      m.material.opacity = Math.max(0.08, (0.16 + 0.13 * d.drift) * (0.82 + 0.18 * Math.sin(time * 0.04 + d.phase)));
    }
  };
  return group;
}
