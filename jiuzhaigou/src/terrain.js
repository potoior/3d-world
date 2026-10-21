import * as THREE from 'three';

export const WATER_Y = 0.9;
const WORLD = 1900;
const CELLS = 224;

export const LAKES = [
  { id: 'upper', cx: 4, cz: -196, rx: 82, rz: 74, y: 13.35, depth: 1.9, kind: 'upper' },
  { id: 'wuhua', cx: 0, cz: 34, rx: 66, rz: 92, y: 1.18, depth: 3.1, kind: 'wuhua' },
  { id: 'pearl', cx: -2, cz: 142, rx: 50, rz: 27, y: 1.02, depth: 0.55, kind: 'shoal' },
  { id: 'shu1', cx: -8, cz: 196, rx: 42, rz: 36, y: 0.86, depth: 1.5, kind: 'terrace' },
  { id: 'shu2', cx: 12, cz: 252, rx: 37, rz: 31, y: 0.7, depth: 1.4, kind: 'terrace' },
  { id: 'shu3', cx: -12, cz: 305, rx: 32, rz: 27, y: 0.54, depth: 1.3, kind: 'terrace' },
  { id: 'shu4', cx: 10, cz: 356, rx: 28, rz: 23, y: 0.38, depth: 1.2, kind: 'terrace' },
];
export const LAKE_BY_ID = Object.fromEntries(LAKES.map((l) => [l.id, l]));

export function valleyCenter(z) {
  return 11 * Math.sin(z * 0.0062 + 0.2) + 5.5 * Math.sin(z * 0.021 - 1.1);
}
export function riverCenter(z) { return valleyCenter(z); }
export function riverHalfWidth(z) {
  return 112 + 16 * Math.sin(z * 0.0048 + 1.7) + 8 * Math.sin(z * 0.013 - 0.4);
}

function smooth(t) {
  const v = t < 0 ? 0 : t > 1 ? 1 : t;
  return v * v * (3 - 2 * v);
}
function smoothstep(a, b, x) {
  if (a === b) return x < a ? 0 : 1;
  return smooth((x - a) / (b - a));
}
function gauss(x, z, cx, cz, sx, sz, amp) {
  const dx = (x - cx) / sx;
  const dz = (z - cz) / sz;
  return amp * Math.exp(-(dx * dx + dz * dz));
}

export function valleyFloor(z) {
  const upper = 1 - smoothstep(-142, -84, z);
  let base = 1.65 + 12.55 * upper;
  base -= 0.22 * smoothstep(165, 390, z);
  return base;
}

export function lakeMask(x, z, lake, inner = 0.74, outer = 1.14) {
  const dx = (x - lake.cx) / lake.rx;
  const dz = (z - lake.cz) / lake.rz;
  const nd = dx * dx + dz * dz;
  return { nd, mask: 1 - smoothstep(inner, outer, nd) };
}

export function terrainHeight(x, z) {
  const c = valleyCenter(z);
  const d = Math.abs(x - c);
  const w = riverHalfWidth(z);
  const floor = valleyFloor(z);
  let h;
  if (d < w) {
    h = floor - 0.28 - 0.3 * Math.cos((x - c) * 0.024 + z * 0.017);
  } else {
    const t = smooth((d - w) / 86);
    h = floor - 0.18 + t * 11 + Math.pow(t, 1.55) * 36;
    h += smooth((d - w) / 430) * 138;
  }
  h += Math.sin(x * 0.018 + z * 0.011) * 0.8 * smooth((d - w) / 90);
  h += Math.sin(x * 0.053 - z * 0.036 + 1.4) * 0.42 * smooth((d - w) / 130);
  h += gauss(x, z, -330, -300, 165, 250, 104);
  h += gauss(x, z, 350, -250, 190, 280, 96);
  h += gauss(x, z, -360, 120, 170, 280, 72);
  h += gauss(x, z, 380, 210, 180, 260, 68);
  h += gauss(x, z, 60, -610, 340, 200, 120);
  for (const lake of LAKES) {
    const { nd, mask } = lakeMask(x, z, lake);
    if (mask > 0.001) {
      const bed = lake.y - lake.depth + 0.5 * Math.min(1, nd);
      h = h * (1 - mask) + bed * mask;
    }
  }
  return Math.min(238, h);
}

export function waterLevelAt(x, z) {
  for (const lake of LAKES) {
    const dx = (x - lake.cx) / lake.rx;
    const dz = (z - lake.cz) / lake.rz;
    if (dx * dx + dz * dz < 1.03) return lake.y;
  }
  return null;
}
export function isWater(x, z, margin = 0) {
  const wl = waterLevelAt(x, z);
  if (wl !== null) return terrainHeight(x, z) < wl + margin;
  return false;
}
export function landAt(x, z) {
  const wl = waterLevelAt(x, z);
  return terrainHeight(x, z) - (wl === null ? WATER_Y : wl);
}

function makeGroundTexture() {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.fillStyle = '#8d8d78';
  g.fillRect(0, 0, size, size);
  for (let i = 0; i < 2600; i++) {
    const x = (Math.sin(i * 37.31) * 0.5 + 0.5) * size;
    const y = (Math.cos(i * 21.77) * 0.5 + 0.5) * size;
    const r = 0.6 + (i % 7) * 0.7;
    const a = 0.035 + (i % 9) * 0.012;
    g.fillStyle = i % 5 === 0 ? `rgba(212,205,168,${a})` : i % 3 === 0 ? `rgba(68,84,58,${a})` : `rgba(120,102,64,${a})`;
    g.beginPath();
    g.ellipse(x, y, r * 2.2, r, i * 0.7, 0, Math.PI * 2);
    g.fill();
  }
  for (let i = 0; i < 90; i++) {
    const x = (Math.sin(i * 13.7) * 0.5 + 0.5) * size;
    const y = (Math.cos(i * 7.9) * 0.5 + 0.5) * size;
    g.strokeStyle = `rgba(56,64,43,${0.05 + (i % 5) * 0.018})`;
    g.lineWidth = 0.7 + (i % 3) * 0.6;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + 9, y + 13, x + 4, y + 27);
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(150, 150);
  return tex;
}

let groundTexture = null;

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
  const bed = new THREE.Color(0x7e9b83);
  const bedWarm = new THREE.Color(0xb3a878);
  const shore = new THREE.Color(0xbcb58d);
  const grass = new THREE.Color(0x6f8550);
  const meadow = new THREE.Color(0x8b9256);
  const litter = new THREE.Color(0x9a7644);
  const forest = new THREE.Color(0x40583f);
  const rock = new THREE.Color(0x777d72);
  const rockDark = new THREE.Color(0x5c645e);
  const snow = new THREE.Color(0xdde6e4);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const slope = 1 - nrm.getY(i);
    const wl = waterLevelAt(x, z);
    const waterY = wl === null ? WATER_Y : wl;
    const n = 0.5 + 0.5 * Math.sin(x * 0.031 + z * 0.019) * Math.cos(x * 0.014 - z * 0.027);
    const n2 = 0.5 + 0.5 * Math.sin(x * 0.11 - z * 0.083 + 2.1);
    c.copy(grass).lerp(meadow, n * 0.7);
    if (y < waterY + 0.7) {
      c.copy(shore).lerp(bedWarm, n * 0.4);
      if (y < waterY - 0.15) c.copy(bed).lerp(bedWarm, n2 * 0.55);
    } else if (y < waterY + 3.4) {
      c.lerp(litter, smooth((waterY + 3.4 - y) / 3) * 0.45);
    }
    if (y > 22) c.lerp(forest, smooth((y - 22) / 26) * 0.55);
    if (y > 56) c.lerp(rock, smooth((y - 56) / 58) * 0.72);
    if (y > 112) c.copy(rockDark).lerp(rock, 0.4 + n * 0.35);
    if (y > 186) c.lerp(snow, smooth((y - 186) / 38) * 0.9);
    c.lerp(rock, smooth(slope * 1.75) * 0.32);
    const v = 0.92 + 0.08 * Math.sin(x * 0.17) * Math.cos(z * 0.14);
    colors[i * 3] = c.r * v;
    colors[i * 3 + 1] = c.g * v;
    colors[i * 3 + 2] = c.b * v;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  if (!groundTexture) groundTexture = makeGroundTexture();
  const mat = new THREE.MeshStandardMaterial({ map: groundTexture, vertexColors: true, roughness: 1, metalness: 0 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  return mesh;
}

function makeMistTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 192;
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 0, 192);
  grd.addColorStop(0, 'rgba(255,255,255,0)');
  grd.addColorStop(0.45, 'rgba(255,255,255,0.8)');
  grd.addColorStop(0.72, 'rgba(255,255,255,0.46)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 512, 192);
  g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 38; i++) {
    const x = Math.sin(i * 91.7) * 0.5 + 0.5;
    const y = Math.sin(i * 31.3 + 1.7) * 0.5 + 0.5;
    const r = 28 + (i % 7) * 13;
    const rg = g.createRadialGradient(x * 512, y * 192, 0, x * 512, y * 192, r);
    rg.addColorStop(0, 'rgba(0,0,0,0.32)');
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rg;
    g.fillRect(x * 512 - r, y * 192 - r, r * 2, r * 2);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createMist() {
  const group = new THREE.Group();
  const tex = makeMistTexture();
  const defs = [
    [-20, 24, -120, 260, 54, 0.36],
    [90, 15, 40, 300, 46, 0.24],
    [-40, 10, 190, 280, 38, 0.22],
    [0, 34, -380, 430, 80, 0.3],
    [0, 58, -560, 520, 108, 0.22],
    [60, 20, 300, 240, 40, 0.18],
  ];
  for (const [x, y, z, w, h, o] of defs) {
    const m = new THREE.MeshBasicMaterial({
      map: tex, transparent: true, opacity: o, depthWrite: false,
      side: THREE.DoubleSide, fog: false, toneMapped: false,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
    mesh.position.set(x, y, z);
    mesh.renderOrder = 3;
    group.add(mesh);
  }
  return group;
}
