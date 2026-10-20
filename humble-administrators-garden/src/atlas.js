import * as THREE from 'three';

const SIZE = 2048;
const canvas = document.createElement('canvas');
canvas.width = SIZE;
canvas.height = SIZE;
const ctx = canvas.getContext('2d');
const texture = new THREE.CanvasTexture(canvas);
texture.colorSpace = THREE.SRGBColorSpace;
texture.anisotropy = 8;
const shared = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false });
const cache = new Map();
let cursorX = 0;
let cursorY = 0;
let rowH = 0;

function alloc(w, h) {
  if (cursorX + w > SIZE) {
    cursorX = 0;
    cursorY += rowH;
    rowH = 0;
  }
  if (cursorY + h > SIZE) return null;
  const cell = [cursorX, cursorY, w, h];
  cursorX += w;
  rowH = Math.max(rowH, h);
  return cell;
}

function materialFor(cell) {
  texture.needsUpdate = true;
  const mat = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false });
  mat.userData.atlasRegion = [
    cell[0] / SIZE,
    1 - (cell[1] + cell[3]) / SIZE,
    (cell[0] + cell[2]) / SIZE,
    1 - cell[1] / SIZE,
  ];
  mat.userData.atlasMaterial = shared;
  return mat;
}

export function plaqueMaterial(text) {
  const key = 'p:' + text;
  if (cache.has(key)) return cache.get(key);
  const cell = alloc(512, 160) || [0, 0, 512, 160];
  const [x, y] = cell;
  ctx.fillStyle = '#2b2620';
  ctx.fillRect(x, y, 512, 160);
  ctx.strokeStyle = '#a89c82';
  ctx.lineWidth = 8;
  ctx.strokeRect(x + 7, y + 7, 498, 146);
  ctx.strokeStyle = 'rgba(200,190,168,0.4)';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 20, y + 20, 472, 120);
  ctx.fillStyle = '#e9e1d0';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const chars = text.split('');
  const size = Math.min(84, 360 / Math.max(1, chars.length));
  ctx.font = size + 'px "Noto Serif CJK SC", "Songti SC", "STSong", serif';
  const total = size * chars.length;
  chars.forEach((ch, i) => {
    ctx.fillText(ch, x + 256 - total / 2 + size * (i + 0.5), y + 82);
  });
  const mat = materialFor(cell);
  cache.set(key, mat);
  return mat;
}

export function coupletMaterial(text) {
  const key = 'c:' + text;
  if (cache.has(key)) return cache.get(key);
  const cell = alloc(128, 512) || [0, 0, 128, 512];
  const [x, y] = cell;
  ctx.fillStyle = '#2a2119';
  ctx.fillRect(x, y, 128, 512);
  ctx.strokeStyle = '#9c6b4d';
  ctx.lineWidth = 7;
  ctx.strokeRect(x + 5, y + 5, 118, 502);
  ctx.strokeStyle = 'rgba(201,171,123,0.42)';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 16, y + 16, 96, 480);
  ctx.fillStyle = '#e4d6b2';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '56px "Noto Serif CJK SC", "Songti SC", "STSong", serif';
  const chars = text.split('');
  const gap = 430 / Math.max(1, chars.length);
  chars.forEach((ch, i) => {
    ctx.fillText(ch, x + 64, y + 52 + gap * (i + 0.5));
  });
  const mat = materialFor(cell);
  cache.set(key, mat);
  return mat;
}
