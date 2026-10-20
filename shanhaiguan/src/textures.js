import * as THREE from 'three';

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

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function finish(texture, repeat = true) {
  texture.wrapS = repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  texture.wrapT = repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

function speckle(ctx, w, h, count, rand, colors, alpha = 0.18, maxR = 1.8) {
  for (let i = 0; i < count; i++) {
    ctx.globalAlpha = alpha * (0.35 + rand() * 0.65);
    ctx.fillStyle = colors[(rand() * colors.length) | 0];
    ctx.beginPath();
    ctx.arc(rand() * w, rand() * h, 0.4 + rand() * maxR, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function mottle(ctx, w, h, rand, count, colors, alpha = 0.07) {
  for (let i = 0; i < count; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const r = 12 + rand() * 52;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, colors[(rand() * colors.length) | 0]);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = alpha;
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.globalAlpha = 1;
}

export function makeRammedEarthTexture() {
  const w = 512;
  const h = 512;
  const c = canvas(w, h);
  const ctx = c.getContext('2d');
  const rand = mulberry32(9113);
  ctx.fillStyle = '#ad8056';
  ctx.fillRect(0, 0, w, h);
  mottle(ctx, w, h, rand, 70, ['#c49a6b', '#8f6844', '#b58a5c', '#7f5c3e'], 0.12);

  let y = 0;
  while (y < h) {
    const layer = 20 + rand() * 13;
    const tone = 0.84 + rand() * 0.3;
    ctx.globalAlpha = 0.24;
    ctx.fillStyle = tone > 1 ? '#d3aa78' : '#8b6543';
    ctx.fillRect(0, y, w, layer * 0.46);
    ctx.globalAlpha = 0.34;
    ctx.fillStyle = '#6f5238';
    ctx.fillRect(0, y + layer - 2, w, 2 + rand() * 2);
    ctx.globalAlpha = 1;
    for (let i = 0; i < 26; i++) {
      ctx.globalAlpha = 0.06 + rand() * 0.1;
      ctx.fillStyle = rand() > 0.5 ? '#e1bb8a' : '#6d4d33';
      ctx.beginPath();
      ctx.ellipse(rand() * w, y + rand() * layer, 2 + rand() * 7, 1 + rand() * 2.2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    y += layer;
  }
  for (let i = 0; i < 34; i++) {
    ctx.strokeStyle = 'rgba(82,58,39,' + (0.08 + rand() * 0.16) + ')';
    ctx.lineWidth = 0.6 + rand() * 1.2;
    ctx.beginPath();
    let x = rand() * w;
    let yy = rand() * h;
    ctx.moveTo(x, yy);
    for (let k = 0; k < 5; k++) {
      x += (rand() - 0.5) * 16;
      yy += 7 + rand() * 15;
      ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
  speckle(ctx, w, h, 900, rand, ['#6f5238', '#d7b084', '#8b6543'], 0.16, 1.5);
  ctx.globalAlpha = 1;
  return finish(new THREE.CanvasTexture(c));
}

export function makeBrickTexture() {
  const w = 512;
  const h = 512;
  const c = canvas(w, h);
  const ctx = c.getContext('2d');
  const rand = mulberry32(2287);
  ctx.fillStyle = '#8a715a';
  ctx.fillRect(0, 0, w, h);
  const bw = 62;
  const bh = 24;
  for (let row = 0; row < h / bh; row++) {
    const offset = row % 2 ? bw * 0.5 : 0;
    for (let col = -1; col < w / bw + 1; col++) {
      const x = col * bw + offset;
      const y = row * bh;
      const v = 0.82 + rand() * 0.34;
      ctx.fillStyle = `rgb(${(146 * v) | 0},${(119 * v) | 0},${(93 * v) | 0})`;
      ctx.fillRect(x + 1, y + 1, bw - 2, bh - 2);
      ctx.fillStyle = 'rgba(217,188,154,0.16)';
      ctx.fillRect(x + 2, y + 2, bw - 4, 2);
      ctx.fillStyle = 'rgba(57,42,31,0.28)';
      ctx.fillRect(x + 2, y + bh - 3, bw - 4, 2);
    }
  }
  mottle(ctx, w, h, rand, 36, ['#c7a57f', '#6b523d'], 0.08);
  speckle(ctx, w, h, 700, rand, ['#5d4837', '#d3b58f', '#7d614a'], 0.19, 1.4);
  return finish(new THREE.CanvasTexture(c));
}

export function makeStoneTexture() {
  const w = 512;
  const h = 512;
  const c = canvas(w, h);
  const ctx = c.getContext('2d');
  const rand = mulberry32(5511);
  ctx.fillStyle = '#5b564c';
  ctx.fillRect(0, 0, w, h);
  const rows = 9;
  for (let r = 0; r < rows; r++) {
    const y = (r / rows) * h;
    const rh = h / rows;
    let x = -rand() * 40;
    while (x < w) {
      const sw = 38 + rand() * 62;
      const v = 0.72 + rand() * 0.46;
      ctx.fillStyle = `rgb(${(139 * v) | 0},${(130 * v) | 0},${(116 * v) | 0})`;
      ctx.beginPath();
      ctx.moveTo(x + 2, y + 2 + rand() * 3);
      ctx.lineTo(x + sw - 3, y + 1);
      ctx.lineTo(x + sw - 1, y + rh - 3);
      ctx.lineTo(x + 3, y + rh - 1 - rand() * 3);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(47,43,37,0.55)';
      ctx.lineWidth = 2;
      ctx.stroke();
      x += sw;
    }
  }
  mottle(ctx, w, h, rand, 40, ['#b9ad95', '#49443b'], 0.09);
  speckle(ctx, w, h, 900, rand, ['#443f36', '#c9bfa9', '#6e695e'], 0.18, 1.5);
  return finish(new THREE.CanvasTexture(c));
}

export function makeWalkwayTexture() {
  const w = 512;
  const h = 512;
  const c = canvas(w, h);
  const ctx = c.getContext('2d');
  const rand = mulberry32(3377);
  ctx.fillStyle = '#8e8778';
  ctx.fillRect(0, 0, w, h);
  const bw = 52;
  const bh = 26;
  for (let row = 0; row < h / bh; row++) {
    const offset = row % 2 ? bw * 0.5 : 0;
    for (let col = -1; col < w / bw + 1; col++) {
      const x = col * bw + offset;
      const y = row * bh;
      const v = 0.78 + rand() * 0.36;
      ctx.fillStyle = `rgb(${(148 * v) | 0},${(140 * v) | 0},${(123 * v) | 0})`;
      ctx.fillRect(x + 1, y + 1, bw - 2, bh - 2);
    }
  }
  mottle(ctx, w, h, rand, 48, ['#b4a98f', '#625d50'], 0.12);
  speckle(ctx, w, h, 1200, rand, ['#5d594d', '#bdb399', '#7c7667'], 0.16, 1.2);
  return finish(new THREE.CanvasTexture(c));
}

export function makeSandTexture() {
  const w = 512;
  const h = 512;
  const c = canvas(w, h);
  const ctx = c.getContext('2d');
  const rand = mulberry32(8811);
  ctx.fillStyle = '#b09368';
  ctx.fillRect(0, 0, w, h);
  mottle(ctx, w, h, rand, 80, ['#c9ad7e', '#8c704c', '#b89b6d', '#a08358'], 0.13);
  speckle(ctx, w, h, 2600, rand, ['#7b6243', '#d3ba8a', '#9b7e55', '#e0c99a', '#685238'], 0.26, 2.1);
  for (let i = 0; i < 120; i++) {
    ctx.fillStyle = 'rgba(120,101,74,' + (0.1 + rand() * 0.16) + ')';
    ctx.beginPath();
    ctx.ellipse(rand() * w, rand() * h, 1 + rand() * 3, 0.6 + rand() * 2, rand() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  return finish(new THREE.CanvasTexture(c));
}

export function makeRoofTexture() {
  const w = 512;
  const h = 512;
  const c = canvas(w, h);
  const ctx = c.getContext('2d');
  const rand = mulberry32(4127);
  ctx.fillStyle = '#4c5354';
  ctx.fillRect(0, 0, w, h);
  const tw = 26;
  for (let x = 0; x < w; x += tw) {
    const g = ctx.createLinearGradient(x, 0, x + tw, 0);
    g.addColorStop(0, '#343b3d');
    g.addColorStop(0.36, '#697173');
    g.addColorStop(0.58, '#7f8888');
    g.addColorStop(1, '#303739');
    ctx.fillStyle = g;
    ctx.fillRect(x, 0, tw, h);
    ctx.fillStyle = 'rgba(20,26,28,0.52)';
    ctx.fillRect(x + tw - 2, 0, 2, h);
  }
  for (let y = 0; y < h; y += 22) {
    ctx.fillStyle = 'rgba(25,31,33,0.35)';
    ctx.fillRect(0, y, w, 2);
  }
  mottle(ctx, w, h, rand, 30, ['#a4acab', '#333a3c'], 0.07);
  speckle(ctx, w, h, 500, rand, ['#252b2c', '#a2aaa8'], 0.14, 1.2);
  return finish(new THREE.CanvasTexture(c));
}

export function makeWoodTexture() {
  const w = 256;
  const h = 256;
  const c = canvas(w, h);
  const ctx = c.getContext('2d');
  const rand = mulberry32(7711);
  ctx.fillStyle = '#6c4a30';
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 150; i++) {
    ctx.strokeStyle = 'rgba(' + (rand() > 0.5 ? '45,28,16' : '150,108,70') + ',' + (0.08 + rand() * 0.16) + ')';
    ctx.lineWidth = 0.6 + rand() * 1.6;
    ctx.beginPath();
    let y = rand() * h;
    ctx.moveTo(0, y);
    for (let x = 0; x < w; x += 16) {
      y += (rand() - 0.5) * 3.4;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  speckle(ctx, w, h, 220, rand, ['#3f2a19', '#a97b4f'], 0.15, 1.1);
  return finish(new THREE.CanvasTexture(c));
}

export function makePlaqueTexture(text) {
  const w = 512;
  const h = 192;
  const c = canvas(w, h);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#221a14';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#b78b42';
  ctx.lineWidth = 10;
  ctx.strokeRect(7, 7, w - 14, h - 14);
  ctx.strokeStyle = 'rgba(210,165,82,0.5)';
  ctx.lineWidth = 2;
  ctx.strokeRect(19, 19, w - 38, h - 38);
  ctx.fillStyle = '#e3bd6a';
  ctx.font = '700 104px "Noto Serif CJK SC", "Songti SC", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, h / 2 + 4);
  ctx.globalAlpha = 0.18;
  for (let i = 0; i < 220; i++) {
    ctx.fillStyle = i % 2 ? '#000' : '#e8c781';
    ctx.fillRect(Math.random() * w, Math.random() * h, 1, 1);
  }
  ctx.globalAlpha = 1;
  return finish(new THREE.CanvasTexture(c), false);
}

export function makeLabelTexture(title, subtitle) {
  const w = 256;
  const h = 512;
  const c = canvas(w, h);
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(23,18,13,0.5)';
  ctx.fillRect(32, 38, w - 64, 330);
  ctx.strokeStyle = 'rgba(216,180,106,0.62)';
  ctx.lineWidth = 3;
  ctx.strokeRect(32, 38, w - 64, 330);
  ctx.fillStyle = '#f0dfb6';
  ctx.font = '600 74px "Noto Serif CJK SC", "Songti SC", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const chars = title.split('');
  chars.forEach((ch, i) => ctx.fillText(ch, w / 2, 110 + i * 82));
  ctx.fillStyle = 'rgba(232,213,172,0.76)';
  ctx.font = '22px "Helvetica Neue", Arial, sans-serif';
  ctx.fillText(subtitle, w / 2, 402);
  return finish(new THREE.CanvasTexture(c), false);
}

export function makeBannerTexture() {
  const w = 256;
  const h = 384;
  const c = canvas(w, h);
  const ctx = c.getContext('2d');
  const rand = mulberry32(6611);
  ctx.fillStyle = '#a5372b';
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 0.16;
  for (let i = 0; i < 60; i++) {
    ctx.fillStyle = rand() > 0.5 ? '#3f110d' : '#e3a15f';
    ctx.beginPath();
    ctx.arc(rand() * w, rand() * h, 3 + rand() * 15, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = '#d9b26c';
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, w - 16, h - 16);
  ctx.fillStyle = '#efd39a';
  ctx.font = '700 76px "Noto Serif CJK SC", "Songti SC", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('关', w / 2, h / 2 - 22);
  ctx.font = '600 34px "Noto Serif CJK SC", "Songti SC", serif';
  ctx.fillText('嘉峪', w / 2, h / 2 + 76);
  return finish(new THREE.CanvasTexture(c), false);
}

export function makeSignTexture(title, subtitle) {
  const w = 512;
  const h = 256;
  const c = canvas(w, h);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#d8c9a7';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#5d4328';
  ctx.lineWidth = 10;
  ctx.strokeRect(8, 8, w - 16, h - 16);
  ctx.fillStyle = '#3b2a1b';
  ctx.font = '700 74px "Noto Serif CJK SC", "Songti SC", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, w / 2, 88);
  ctx.font = '500 30px "Helvetica Neue", Arial, sans-serif';
  ctx.letterSpacing = '4px';
  ctx.fillText(subtitle, w / 2, 166);
  ctx.strokeStyle = 'rgba(93,67,40,0.4)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(90, 135);
  ctx.lineTo(w - 90, 135);
  ctx.stroke();
  return finish(new THREE.CanvasTexture(c), false);
}

export function makeMistTexture() {
  const w = 256;
  const h = 256;
  const c = canvas(w, h);
  const ctx = c.getContext('2d');
  const rand = mulberry32(4419);
  const g = ctx.createRadialGradient(w / 2, h / 2, 8, w / 2, h / 2, w / 2);
  g.addColorStop(0, 'rgba(255,255,255,0.6)');
  g.addColorStop(0.42, 'rgba(255,255,255,0.3)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 24; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const r = 20 + rand() * 60;
    const gg = ctx.createRadialGradient(x, y, 0, x, y, r);
    gg.addColorStop(0, 'rgba(255,255,255,0.09)');
    gg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gg;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  return finish(new THREE.CanvasTexture(c), false);
}

export function makeContactTexture() {
  const w = 128;
  const h = 128;
  const c = canvas(w, h);
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2);
  g.addColorStop(0, 'rgba(41,30,20,0.55)');
  g.addColorStop(0.55, 'rgba(41,30,20,0.22)');
  g.addColorStop(1, 'rgba(41,30,20,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  return finish(new THREE.CanvasTexture(c), false);
}
