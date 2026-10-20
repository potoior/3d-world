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

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

function finish(canvas, { srgb = true, repeat = true } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  if (repeat) {
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
  }
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

function speckle(ctx, w, h, count, rand, colors, alpha) {
  ctx.globalAlpha = alpha;
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = colors[(rand() * colors.length) | 0];
    const r = rand() * 1.8 + 0.2;
    ctx.beginPath();
    ctx.arc(rand() * w, rand() * h, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export function makeRoofTexture() {
  const [c, ctx] = makeCanvas(256, 256);
  const rand = mulberry32(17);
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#8c9294');
  g.addColorStop(0.5, '#6e7476');
  g.addColorStop(1, '#565c5e');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const tile = 64;
  for (let x = 0; x < 256; x += tile) {
    const rg = ctx.createLinearGradient(x, 0, x + tile, 0);
    rg.addColorStop(0, 'rgba(25,30,32,0.45)');
    rg.addColorStop(0.18, 'rgba(225,232,232,0.22)');
    rg.addColorStop(0.5, 'rgba(235,240,238,0.34)');
    rg.addColorStop(0.82, 'rgba(210,216,214,0.12)');
    rg.addColorStop(1, 'rgba(20,26,28,0.5)');
    ctx.fillStyle = rg;
    ctx.fillRect(x, 0, tile, 256);
    ctx.strokeStyle = 'rgba(24,30,32,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, 256);
    ctx.stroke();
  }
  for (let y = 0; y < 256; y += 26) {
    ctx.strokeStyle = 'rgba(28,34,36,0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(256, y + 0.5);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(232,238,236,0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y + 2.5);
    ctx.lineTo(256, y + 2.5);
    ctx.stroke();
  }
  speckle(ctx, 256, 256, 700, rand, ['#4e5658', '#aab2b0', '#626a6c'], 0.12);
  return finish(c);
}

export function makeWallTexture() {
  const [c, ctx] = makeCanvas(256, 256);
  const rand = mulberry32(41);
  ctx.fillStyle = '#f4f0e6';
  ctx.fillRect(0, 0, 256, 256);
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, 'rgba(255,255,252,0.42)');
  g.addColorStop(0.6, 'rgba(0,0,0,0.015)');
  g.addColorStop(1, 'rgba(126,126,114,0.12)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  speckle(ctx, 256, 256, 1500, rand, ['#e8e3d7', '#fffdf5', '#dbd5c8', '#e2ddd0'], 0.2);
  for (let i = 0; i < 22; i++) {
    ctx.strokeStyle = `rgba(120,118,108,${0.03 + rand() * 0.05})`;
    ctx.lineWidth = 0.5 + rand() * 1.5;
    ctx.beginPath();
    const x = rand() * 256;
    ctx.moveTo(x, 0);
    ctx.bezierCurveTo(x + rand() * 12 - 6, 80, x + rand() * 16 - 8, 170, x + rand() * 10 - 5, 256);
    ctx.stroke();
  }
  return finish(c);
}

export function makeMarbleTexture() {
  const [c, ctx] = makeCanvas(512, 512);
  const rand = mulberry32(7);
  ctx.fillStyle = '#e6e0d3';
  ctx.fillRect(0, 0, 512, 512);
  const g = ctx.createLinearGradient(0, 0, 512, 512);
  g.addColorStop(0, 'rgba(255,255,250,0.5)');
  g.addColorStop(0.5, 'rgba(214,205,188,0.28)');
  g.addColorStop(1, 'rgba(255,255,248,0.35)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 42; i++) {
    ctx.strokeStyle = `rgba(${110 + rand() * 40},${105 + rand() * 40},${95 + rand() * 35},${0.04 + rand() * 0.09})`;
    ctx.lineWidth = 0.4 + rand() * 2.2;
    ctx.beginPath();
    let x = rand() * 512;
    let y = rand() * 512;
    ctx.moveTo(x, y);
    for (let k = 0; k < 4; k++) {
      x += rand() * 160 - 80;
      y += rand() * 90 - 45;
      ctx.quadraticCurveTo(x + rand() * 50 - 25, y + rand() * 40 - 20, x, y);
    }
    ctx.stroke();
  }
  speckle(ctx, 512, 512, 2400, rand, ['#cfc7b7', '#ffffff', '#bdb3a1'], 0.18);
  return finish(c);
}

export function makePavingTexture() {
  const [c, ctx] = makeCanvas(512, 512);
  const rand = mulberry32(93);
  ctx.fillStyle = '#a3a196';
  ctx.fillRect(0, 0, 512, 512);
  const size = 64;
  for (let y = 0; y < 512; y += size) {
    for (let x = 0; x < 512; x += size) {
      const v = 0.84 + rand() * 0.3;
      ctx.fillStyle = `rgb(${(162 * v) | 0},${(160 * v) | 0},${(150 * v) | 0})`;
      ctx.fillRect(x + 1.5, y + 1.5, size - 3, size - 3);
      ctx.fillStyle = 'rgba(255,255,248,0.04)';
      ctx.fillRect(x + 2, y + 2, size - 4, 2);
    }
  }
  ctx.strokeStyle = 'rgba(94,90,80,0.42)';
  ctx.lineWidth = 1.4;
  for (let i = 0; i <= 512; i += size) {
    ctx.beginPath();
    ctx.moveTo(i + 0.5, 0);
    ctx.lineTo(i + 0.5, 512);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i + 0.5);
    ctx.lineTo(512, i + 0.5);
    ctx.stroke();
  }
  speckle(ctx, 512, 512, 2600, rand, ['#8f8778', '#d6cec0', '#a49b8b'], 0.2);
  return finish(c);
}

export function makeDirtTexture() {
  const [c, ctx] = makeCanvas(512, 512);
  const rand = mulberry32(5);
  ctx.fillStyle = '#89886f';
  ctx.fillRect(0, 0, 512, 512);
  speckle(ctx, 512, 512, 7000, rand, ['#797a60', '#99987d', '#6d6f57', '#a6a58b'], 0.28);
  return finish(c);
}

export function makeLatticeTexture() {
  const [c, ctx] = makeCanvas(256, 512);
  const rand = mulberry32(23);
  ctx.fillStyle = '#4c3f31';
  ctx.fillRect(0, 0, 256, 512);
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, 'rgba(142,120,90,0.5)');
  g.addColorStop(1, 'rgba(34,27,20,0.5)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 512);
  ctx.strokeStyle = '#dfd6c2';
  ctx.lineWidth = 5;
  ctx.strokeRect(8, 8, 240, 496);
  ctx.lineWidth = 2;
  ctx.strokeRect(16, 16, 224, 480);
  const top = 28;
  const bottom = 340;
  ctx.lineWidth = 3;
  for (let x = 24; x <= 232; x += 26) {
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
    ctx.stroke();
  }
  for (let y = top; y <= bottom; y += 26) {
    ctx.beginPath();
    ctx.moveTo(24, y);
    ctx.lineTo(232, y);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(220,211,190,0.55)';
  ctx.lineWidth = 1;
  for (let i = -12; i < 16; i++) {
    ctx.beginPath();
    ctx.moveTo(24 + i * 26, top);
    ctx.lineTo(24 + i * 26 + (bottom - top), bottom);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(24 + i * 26, bottom);
    ctx.lineTo(24 + i * 26 + (bottom - top), top);
    ctx.stroke();
  }
  ctx.fillStyle = '#3b3227';
  ctx.fillRect(22, bottom + 10, 212, 148);
  ctx.strokeStyle = '#dfd6c2';
  ctx.lineWidth = 3;
  ctx.strokeRect(22, bottom + 10, 212, 148);
  ctx.fillStyle = '#d3c9b4';
  for (let y = bottom + 30; y < bottom + 158; y += 28) {
    for (let x = 42; x < 230; x += 28) {
      ctx.beginPath();
      ctx.arc(x, y, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  speckle(ctx, 256, 512, 260, rand, ['#000000', '#6f6450', '#4a4438'], 0.08);
  return finish(c);
}

export function makeLeakWindowTexture() {
  const [c, ctx] = makeCanvas(256, 256);
  ctx.fillStyle = '#f2eee4';
  ctx.fillRect(0, 0, 256, 256);
  const frame = ctx.createLinearGradient(0, 0, 0, 256);
  frame.addColorStop(0, 'rgba(255,255,250,0.25)');
  frame.addColorStop(1, 'rgba(120,118,108,0.18)');
  ctx.fillStyle = frame;
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = '#5f625d';
  ctx.lineWidth = 11;
  ctx.strokeRect(5.5, 5.5, 245, 245);
  ctx.strokeStyle = '#74766f';
  ctx.lineWidth = 4.5;
  ctx.strokeRect(25, 25, 206, 206);
  ctx.beginPath();
  ctx.arc(128, 128, 76, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 3.2;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(128 + Math.cos(a) * 26, 128 + Math.sin(a) * 26);
    ctx.lineTo(128 + Math.cos(a) * 104, 128 + Math.sin(a) * 104);
    ctx.stroke();
  }
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const r = 54;
    if (i === 0) ctx.moveTo(128 + Math.cos(a) * r, 128 + Math.sin(a) * r);
    else ctx.lineTo(128 + Math.cos(a) * r, 128 + Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(238,234,222,0.8)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(128, 128, 88, 0, Math.PI * 2);
  ctx.stroke();
  return finish(c);
}

export function makeFriezeTexture() {
  const [c, ctx] = makeCanvas(512, 128);
  const rand = mulberry32(66);
  ctx.fillStyle = '#1f4a4a';
  ctx.fillRect(0, 0, 512, 128);
  const g = ctx.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0, 'rgba(90,170,160,0.35)');
  g.addColorStop(0.5, 'rgba(10,40,40,0.2)');
  g.addColorStop(1, 'rgba(4,18,18,0.35)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 128);
  for (let x = 0; x < 512; x += 64) {
    ctx.fillStyle = '#123b46';
    ctx.fillRect(x + 6, 18, 52, 92);
    ctx.strokeStyle = '#c9a24c';
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 6, 18, 52, 92);
    ctx.strokeStyle = '#3f7f86';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x + 32, 64, 19, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#d8b25e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x + 32, 64, 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#d8b25e';
    ctx.beginPath();
    ctx.arc(x + 32, 64, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(201,162,76,0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + 62, 10);
    ctx.bezierCurveTo(x + 48, 40, x + 76, 88, x + 62, 118);
    ctx.stroke();
  }
  for (let x = 0; x < 512; x += 16) {
    ctx.fillStyle = x % 32 === 0 ? '#c9a24c' : '#2c6670';
    ctx.fillRect(x, 0, 8, 8);
    ctx.fillRect(x, 120, 8, 8);
  }
  speckle(ctx, 512, 128, 300, rand, ['#000000', '#ffffff', '#b8862b'], 0.06);
  return finish(c);
}

export function makePlaqueTexture(text) {
  const [c, ctx] = makeCanvas(512, 192);
  ctx.fillStyle = '#14294f';
  ctx.fillRect(0, 0, 512, 192);
  const g = ctx.createLinearGradient(0, 0, 0, 192);
  g.addColorStop(0, 'rgba(80,120,190,0.5)');
  g.addColorStop(0.5, 'rgba(10,22,45,0.1)');
  g.addColorStop(1, 'rgba(5,12,28,0.6)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 192);
  ctx.strokeStyle = '#e0b65a';
  ctx.lineWidth = 12;
  ctx.strokeRect(8, 8, 496, 176);
  ctx.strokeStyle = '#8a6a2a';
  ctx.lineWidth = 4;
  ctx.strokeRect(22, 22, 468, 148);
  ctx.fillStyle = '#efc768';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const chars = text.split('');
  const size = Math.min(104, 400 / Math.max(1, chars.length));
  ctx.font = `700 ${size}px "Noto Serif CJK SC", "Source Han Serif SC", "STSong", "SimSun", serif`;
  const total = size * chars.length;
  chars.forEach((ch, i) => {
    ctx.fillText(ch, 256 - total / 2 + size * (i + 0.5), 98);
  });
  return finish(c, { repeat: false });
}

export function makeRampTexture() {
  const [c, ctx] = makeCanvas(256, 512);
  const rand = mulberry32(31);
  ctx.fillStyle = '#ded7c6';
  ctx.fillRect(0, 0, 256, 512);
  speckle(ctx, 256, 512, 1400, rand, ['#c9c0ac', '#f2ecde', '#b8ae99'], 0.2);
  ctx.strokeStyle = 'rgba(120,108,88,0.55)';
  ctx.lineWidth = 7;
  ctx.strokeRect(14, 14, 228, 484);
  ctx.strokeStyle = 'rgba(110,98,80,0.38)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 7; i++) {
    ctx.beginPath();
    const y = 90 + i * 52;
    ctx.moveTo(38, y);
    ctx.bezierCurveTo(80, y - 34, 110, y + 30, 150, y - 6);
    ctx.bezierCurveTo(180, y - 32, 205, y + 26, 222, y - 10);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(90,80,64,0.5)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.ellipse(128, 256, 62, 172, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(128, 256, 34, 110, 0, 0, Math.PI * 2);
  ctx.stroke();
  return finish(c);
}

export function makeWaterNormalTexture() {
  const [c, ctx] = makeCanvas(256, 256);
  const rand = mulberry32(77);
  const img = ctx.createImageData(256, 256);
  for (let i = 0; i < 256 * 256; i++) {
    img.data[i * 4] = 128 + (rand() - 0.5) * 40;
    img.data[i * 4 + 1] = 128 + (rand() - 0.5) * 40;
    img.data[i * 4 + 2] = 255;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return finish(c, { srgb: false });
}

export function makeMeadowTexture() {
  const [c, ctx] = makeCanvas(512, 512);
  const rand = mulberry32(311);
  ctx.fillStyle = '#7f9561';
  ctx.fillRect(0, 0, 512, 512);
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, 'rgba(196,210,150,0.20)');
  g.addColorStop(0.55, 'rgba(66,88,48,0.10)');
  g.addColorStop(1, 'rgba(44,62,34,0.22)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 512);
  speckle(ctx, 512, 512, 5200, rand, ['#6e8652', '#91a66c', '#5c7446', '#a9b884'], 0.28);
  for (let i = 0; i < 1500; i++) {
    const x = rand() * 512;
    const y = rand() * 512;
    ctx.strokeStyle = `rgba(${90 + rand() * 70},${110 + rand() * 60},${55 + rand() * 40},${0.10 + rand() * 0.2})`;
    ctx.lineWidth = 0.6 + rand() * 0.9;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + rand() * 5 - 2.5, y - 4, x + rand() * 8 - 4, y - 7 - rand() * 7);
    ctx.stroke();
  }
  return finish(c);
}

export function makeWoodTexture() {
  const [c, ctx] = makeCanvas(512, 512);
  const rand = mulberry32(451);
  ctx.fillStyle = '#8b6744';
  ctx.fillRect(0, 0, 512, 512);
  const plankH = 64;
  for (let y = 0; y < 512; y += plankH) {
    const v = 0.82 + rand() * 0.34;
    ctx.fillStyle = `rgb(${(132 * v) | 0},${(96 * v) | 0},${(60 * v) | 0})`;
    ctx.fillRect(0, y + 1.5, 512, plankH - 3);
    ctx.strokeStyle = 'rgba(48,31,18,0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(512, y + 0.5);
    ctx.stroke();
    for (let i = 0; i < 14; i++) {
      ctx.strokeStyle = `rgba(${58 + rand() * 30},${40 + rand() * 24},${24 + rand() * 18},${0.12 + rand() * 0.2})`;
      ctx.lineWidth = 0.7 + rand() * 1.4;
      const yy = y + 6 + rand() * (plankH - 12);
      ctx.beginPath();
      ctx.moveTo(0, yy);
      ctx.bezierCurveTo(150, yy + rand() * 6 - 3, 340, yy + rand() * 8 - 4, 512, yy + rand() * 4 - 2);
      ctx.stroke();
    }
    const knots = 1 + ((rand() * 3) | 0);
    for (let k = 0; k < knots; k++) {
      const kx = rand() * 512;
      const ky = y + 10 + rand() * (plankH - 20);
      ctx.strokeStyle = 'rgba(52,33,18,0.45)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(kx, ky, 4 + rand() * 5, 2 + rand() * 3, rand(), 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  return finish(c);
}

export function makeShingleTexture() {
  const [c, ctx] = makeCanvas(256, 256);
  const rand = mulberry32(509);
  ctx.fillStyle = '#7c7563';
  ctx.fillRect(0, 0, 256, 256);
  const w = 42;
  const h = 26;
  for (let row = 0; row < 11; row++) {
    const y = row * h;
    const off = row % 2 ? w * 0.5 : 0;
    for (let x = -w; x < 256 + w; x += w) {
      const v = 0.78 + rand() * 0.42;
      ctx.fillStyle = `rgb(${(122 * v) | 0},${(112 * v) | 0},${(94 * v) | 0})`;
      ctx.fillRect(x + off + 1, y + 1, w - 2, h - 1);
      ctx.strokeStyle = 'rgba(46,42,34,0.5)';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(x + off + 0.5, y + 0.5, w - 1, h);
      ctx.strokeStyle = 'rgba(206,200,178,0.16)';
      ctx.beginPath();
      ctx.moveTo(x + off + 2, y + 2.5);
      ctx.lineTo(x + off + w - 3, y + 2.5);
      ctx.stroke();
    }
  }
  speckle(ctx, 256, 256, 900, rand, ['#5f5a4a', '#a59d86', '#6f6a58'], 0.15);
  return finish(c);
}

export function makeBarkTexture() {
  const [c, ctx] = makeCanvas(256, 512);
  const rand = mulberry32(613);
  ctx.fillStyle = '#5b4330';
  ctx.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 90; i++) {
    const x = rand() * 256;
    ctx.strokeStyle = `rgba(${28 + rand() * 30},${20 + rand() * 24},${13 + rand() * 14},${0.25 + rand() * 0.4})`;
    ctx.lineWidth = 1 + rand() * 5;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.bezierCurveTo(x + rand() * 16 - 8, 130, x + rand() * 20 - 10, 330, x + rand() * 14 - 7, 512);
    ctx.stroke();
  }
  for (let i = 0; i < 480; i++) {
    ctx.fillStyle = `rgba(${90 + rand() * 50},${70 + rand() * 40},${46 + rand() * 30},${0.08 + rand() * 0.16})`;
    ctx.fillRect(rand() * 256, rand() * 512, 1 + rand() * 3, 5 + rand() * 14);
  }
  return finish(c);
}

export function makeBirchTexture() {
  const [c, ctx] = makeCanvas(256, 512);
  const rand = mulberry32(727);
  ctx.fillStyle = '#e8e5d6';
  ctx.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 26; i++) {
    const y = rand() * 512;
    const w = 12 + rand() * 90;
    ctx.fillStyle = `rgba(${24 + rand() * 18},${24 + rand() * 18},${22 + rand() * 16},${0.55 + rand() * 0.35})`;
    ctx.beginPath();
    ctx.ellipse(rand() * 256, y, w * 0.5, 1.5 + rand() * 4.5, rand() * 0.2 - 0.1, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 180; i++) {
    ctx.fillStyle = `rgba(80,78,66,${0.06 + rand() * 0.18})`;
    ctx.fillRect(rand() * 256, rand() * 512, 1 + rand() * 2, 2 + rand() * 8);
  }
  return finish(c);
}

export function makeRockTexture() {
  const [c, ctx] = makeCanvas(256, 256);
  const rand = mulberry32(829);
  ctx.fillStyle = '#848a84';
  ctx.fillRect(0, 0, 256, 256);
  speckle(ctx, 256, 256, 3600, rand, ['#6f766f', '#979d94', '#5f6660', '#a9aca2'], 0.32);
  for (let i = 0; i < 32; i++) {
    ctx.strokeStyle = `rgba(${52 + rand() * 26},${56 + rand() * 26},${52 + rand() * 24},${0.2 + rand() * 0.3})`;
    ctx.lineWidth = 0.6 + rand() * 2.2;
    ctx.beginPath();
    let x = rand() * 256;
    let y = rand() * 256;
    ctx.moveTo(x, y);
    for (let k = 0; k < 3; k++) {
      x += rand() * 60 - 30;
      y += rand() * 40 - 20;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  return finish(c);
}
