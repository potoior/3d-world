import * as THREE from 'three';
import { POOLS, STREAM_POINTS } from './layout.js';

export function rand(seed, n) {
  const x = Math.sin(seed * 127.1 + n * 311.7 + 19.73) * 43758.5453;
  return x - Math.floor(x);
}

export function smoothstep(a, b, x) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export function canvasTexture(w, h, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d'), w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

export const PEAKS = [
  { name: '大峰', x: -720, z: 880, h: 375, rx: 380, rz: 340, e: 1.42, ridges: 9, phase: 0.4, spike: 0.02 },
  { name: '二峰', x: -300, z: 910, h: 475, rx: 350, rz: 330, e: 1.32, ridges: 8, phase: 1.7, spike: 0.04 },
  { name: '三峰', x: 180, z: 900, h: 560, rx: 365, rz: 335, e: 1.24, ridges: 10, phase: 2.6, spike: 0.07 },
  { name: '幺妹峰', x: 680, z: 880, h: 650, rx: 405, rz: 350, e: 1.06, ridges: 11, phase: 0.9, spike: 0.14 },
];

export function streamDistance(x, z) {
  let min = Infinity;
  for (let i = 0; i < STREAM_POINTS.length - 1; i++) {
    const a = STREAM_POINTS[i];
    const b = STREAM_POINTS[i + 1];
    const vx = b[0] - a[0];
    const vz = b[1] - a[1];
    const len2 = vx * vx + vz * vz || 1;
    const t = Math.max(0, Math.min(1, ((x - a[0]) * vx + (z - a[1]) * vz) / len2));
    const d = Math.hypot(x - a[0] - vx * t, z - a[1] - vz * t);
    if (d < min) min = d;
  }
  return min;
}

export function pointInPoly(x, z, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0];
    const zi = poly[i][1];
    const xj = poly[j][0];
    const zj = poly[j][1];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

export function poolInfo(x, z) {
  let best = null;
  for (const p of POOLS) {
    const dx = (x - p.cx) / p.rx;
    const dz = (z - p.cz) / p.rz;
    const d = Math.sqrt(dx * dx + dz * dz);
    if (!best || d < best.d) best = { p, d };
  }
  return best;
}

export function inPool(x, z, margin = 1) {
  for (const p of POOLS) {
    const dx = (x - p.cx) / (p.rx * margin);
    const dz = (z - p.cz) / (p.rz * margin);
    if (dx * dx + dz * dz < 1) return true;
    if (pointInPoly(x, z, p.poly)) return true;
  }
  return false;
}

export function heightAt(x, z) {
  let h = 1.7 + 13.0 * smoothstep(-680, 520, z);
  h += 0.000072 * (x - 40) * (x - 40);
  h += 0.55 * Math.sin(x * 0.019 + 1.1) * Math.sin(z * 0.014 - 0.35);
  h += 0.34 * Math.sin(x * 0.047 + z * 0.039);
  h += 0.2 * Math.sin(x * 0.11 - z * 0.07);

  h += 82 * Math.exp(-(Math.pow((x + 850) / 470, 2) + Math.pow((z - 120) / 700, 2)));
  h += 104 * Math.exp(-(Math.pow((x - 900) / 470, 2) + Math.pow((z - 180) / 720, 2)));
  h += 40 * Math.exp(-(Math.pow((x + 330) / 250, 2) + Math.pow((z - 160) / 420, 2)));
  h += 34 * Math.exp(-(Math.pow((x - 410) / 270, 2) + Math.pow((z - 260) / 430, 2)));

  const massif = smoothstep(300, 940, z);
  h += massif * (88 + 20 * Math.sin(x * 0.0031 + 0.6) + 14 * Math.sin(x * 0.0074 - 1.1));

  for (const p of PEAKS) {
    const dx = (x - p.x) / p.rx;
    const dz = (z - p.z) / p.rz;
    const d = Math.sqrt(dx * dx + dz * dz);
    if (d < 1.02) {
      const k = Math.max(0, 1 - d);
      const a = Math.atan2(dz, dx);
      const ridge = 1 + 0.105 * Math.sin(a * p.ridges + p.phase) + 0.045 * Math.sin(a * (p.ridges * 2.17) - p.phase);
      h += p.h * Math.pow(k, p.e) * ridge;
      h += p.h * p.spike * Math.exp(-(d / 0.235) * (d / 0.235));
    }
  }

  h += 255 * smoothstep(1060, 1470, z) * (0.86 + 0.14 * Math.sin(x * 0.004));
  h += 300 * Math.exp(-(Math.pow((x + 1010) / 520, 2) + Math.pow((z - 1150) / 460, 2)));
  h += 335 * Math.exp(-(Math.pow((x - 1080) / 540, 2) + Math.pow((z - 1180) / 470, 2)));
  h += 190 * Math.exp(-(Math.pow((x + 80) / 620, 2) + Math.pow((z - 1400) / 380, 2)));

  h += smoothstep(165, 470, h) * (8.5 * Math.sin(x * 0.032 + z * 0.024) + 5.4 * Math.sin(x * 0.072 - z * 0.057));

  const sd = streamDistance(x, z);
  if (sd < 19 && z < 760) h -= (1 - smoothstep(5.5, 19, sd)) * 2.6;

  const pi = poolInfo(x, z);
  if (pi && pi.d < 1.5) {
    const k = 1 - smoothstep(0.82, 1.3, pi.d);
    h = THREE.MathUtils.lerp(h, pi.p.level - 1.0, k);
  }

  return Math.max(0, h);
}

export function makeTerrainTexture() {
  return canvasTexture(256, 256, (g, w, h) => {
    const img = g.createImageData(w, h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const n =
          Math.sin(x * 0.37 + Math.sin(y * 0.13) * 3.1) * 0.5 +
          Math.sin(y * 0.53 - Math.cos(x * 0.17) * 2.7) * 0.32 +
          Math.sin((x + y) * 0.11) * 0.18;
        const v = Math.round(216 + n * 20);
        const i = (y * w + x) * 4;
        img.data[i] = v;
        img.data[i + 1] = v;
        img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
  });
}

export function makeFlowerTexture() {
  return canvasTexture(64, 64, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const cx = w / 2 + Math.cos(a) * 9;
      const cy = h / 2 + Math.sin(a) * 9;
      const grad = g.createRadialGradient(cx, cy, 1, cx, cy, 11);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(0.55, 'rgba(255,255,255,0.92)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grad;
      g.beginPath();
      g.arc(cx, cy, 11, 0, Math.PI * 2);
      g.fill();
    }
    const core = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, 6);
    core.addColorStop(0, 'rgba(255,236,150,1)');
    core.addColorStop(1, 'rgba(255,236,150,0)');
    g.fillStyle = core;
    g.beginPath();
    g.arc(w / 2, h / 2, 6, 0, Math.PI * 2);
    g.fill();
  });
}

export function makeCloudTexture() {
  return canvasTexture(256, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) {
      const a = rand(71, i) * Math.PI * 2;
      const r = rand(73, i) * 82;
      const cx = w / 2 + Math.cos(a) * r;
      const cy = h / 2 + Math.sin(a) * r * 0.4;
      const rad = 34 + rand(79, i) * 54;
      const grad = g.createRadialGradient(cx, cy, 1, cx, cy, rad);
      grad.addColorStop(0, 'rgba(255,255,255,0.42)');
      grad.addColorStop(0.55, 'rgba(248,250,250,0.19)');
      grad.addColorStop(1, 'rgba(245,248,250,0)');
      g.fillStyle = grad;
      g.beginPath();
      g.arc(cx, cy, rad, 0, Math.PI * 2);
      g.fill();
    }
    for (let i = 0; i < 8; i++) {
      const cx = 40 + rand(83, i) * 176;
      const cy = 116 + rand(89, i) * 34;
      const rad = 18 + rand(97, i) * 28;
      const grad = g.createRadialGradient(cx, cy, 1, cx, cy, rad);
      grad.addColorStop(0, 'rgba(255,255,255,0.32)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grad;
      g.beginPath();
      g.arc(cx, cy, rad, 0, Math.PI * 2);
      g.fill();
    }
  });
}

export function makeLeafTexture() {
  return canvasTexture(64, 64, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = 'rgba(232,176,63,1)';
    g.beginPath();
    g.moveTo(w / 2, 6);
    g.quadraticCurveTo(w - 8, h * 0.42, w / 2, h - 5);
    g.quadraticCurveTo(8, h * 0.42, w / 2, 6);
    g.fill();
    g.strokeStyle = 'rgba(140,92,26,0.7)';
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(w / 2, 9);
    g.lineTo(w / 2, h - 8);
    g.stroke();
  });
}

export function makeMaterials() {
  const detail = makeTerrainTexture();
  detail.wrapS = detail.wrapT = THREE.RepeatWrapping;
  detail.repeat.set(95, 84);
  return {
    terrain: new THREE.MeshStandardMaterial({
      map: detail,
      color: 0xffffff,
      vertexColors: true,
      roughness: 0.97,
      metalness: 0,
    }),
    rock: new THREE.MeshStandardMaterial({ color: 0x6e675d, roughness: 0.99, flatShading: true }),
    rockDark: new THREE.MeshStandardMaterial({ color: 0x413e39, roughness: 1, flatShading: true }),
    cliff: new THREE.MeshStandardMaterial({ color: 0x514b42, roughness: 1, flatShading: true }),
    snow: new THREE.MeshStandardMaterial({ color: 0xf4f8f7, roughness: 0.56, metalness: 0.01, flatShading: true }),
    snowBlue: new THREE.MeshStandardMaterial({ color: 0xcfe0e8, roughness: 0.5, flatShading: true }),
    wood: new THREE.MeshStandardMaterial({ color: 0x6d4f34, roughness: 0.94 }),
    woodDark: new THREE.MeshStandardMaterial({ color: 0x3f2f22, roughness: 0.96 }),
    rope: new THREE.MeshStandardMaterial({ color: 0x51483a, roughness: 0.95 }),
    stone: new THREE.MeshStandardMaterial({ color: 0x918b7c, roughness: 0.98, flatShading: true }),
    white: new THREE.MeshStandardMaterial({ color: 0xf0ece0, roughness: 0.9 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xb98a36, roughness: 0.34, metalness: 0.7 }),
    fur: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.99, flatShading: true }),
    horn: new THREE.MeshStandardMaterial({ color: 0xcabf9f, roughness: 0.7 }),
    pine: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.96, flatShading: true }),
    larch: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.94, flatShading: true }),
    grass: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, flatShading: true, side: THREE.DoubleSide }),
    bird: new THREE.MeshBasicMaterial({ color: 0x252a29, side: THREE.DoubleSide }),
  };
}
