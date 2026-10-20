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
  ctx.fillStyle = '#e6e2d8';
  ctx.fillRect(0, 0, 256, 256);
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, 'rgba(255,255,250,0.34)');
  g.addColorStop(0.6, 'rgba(0,0,0,0.02)');
  g.addColorStop(1, 'rgba(120,120,110,0.16)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  speckle(ctx, 256, 256, 1600, rand, ['#d9d4c9', '#f3efe5', '#c9c4b8', '#d2cdc1'], 0.22);
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
  ctx.fillStyle = '#96948c';
  ctx.fillRect(0, 0, 512, 512);
  const size = 64;
  for (let y = 0; y < 512; y += size) {
    for (let x = 0; x < 512; x += size) {
      const v = 0.86 + rand() * 0.28;
      ctx.fillStyle = `rgb(${(150 * v) | 0},${(148 * v) | 0},${(138 * v) | 0})`;
      ctx.fillRect(x + 1, y + 1, size - 2, size - 2);
      ctx.fillStyle = 'rgba(255,255,245,0.05)';
      ctx.fillRect(x + 2, y + 2, size - 4, 2);
    }
  }
  ctx.strokeStyle = 'rgba(92,84,72,0.55)';
  ctx.lineWidth = 1.2;
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
  ctx.fillStyle = '#5a4634';
  ctx.fillRect(0, 0, 256, 512);
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, 'rgba(190,168,132,0.45)');
  g.addColorStop(1, 'rgba(44,32,22,0.45)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 512);
  ctx.strokeStyle = '#e6dcc4';
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
  ctx.strokeStyle = 'rgba(201,193,174,0.55)';
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
  ctx.fillStyle = '#3a2c20';
  ctx.fillRect(22, bottom + 10, 212, 148);
  ctx.strokeStyle = '#e6dcc4';
  ctx.lineWidth = 3;
  ctx.strokeRect(22, bottom + 10, 212, 148);
  ctx.fillStyle = '#c8bda4';
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
  const size = 256;
  const [c, ctx] = makeCanvas(size, size);
  const rand = mulberry32(77);
  const waves = [];
  for (let o = 0; o < 9; o++) {
    waves.push({
      kx: 1 + ((rand() * 7) | 0),
      ky: 1 + ((rand() * 7) | 0),
      p: rand() * Math.PI * 2,
      a: 1 / (1 + o * 1.15),
    });
  }
  const height = (x, y) => {
    let h = 0;
    for (const w of waves) {
      h += Math.sin(((x * w.kx + y * w.ky) / size) * Math.PI * 2 + w.p) * w.a;
    }
    return h;
  };
  const img = ctx.createImageData(size, size);
  const strength = 2.4;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = height((x + 1) % size, y) - height((x - 1 + size) % size, y);
      const dy = height(x, (y + 1) % size) - height(x, (y - 1 + size) % size);
      const i = (y * size + x) * 4;
      img.data[i] = Math.max(0, Math.min(255, 128 - dx * strength * 34));
      img.data[i + 1] = Math.max(0, Math.min(255, 128 - dy * strength * 34));
      img.data[i + 2] = 255;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return finish(c, { srgb: false });
}

export function makeGrassTexture() {
  const [c, ctx] = makeCanvas(512, 512);
  const rand = mulberry32(303);
  ctx.fillStyle = '#708b58';
  ctx.fillRect(0, 0, 512, 512);
  speckle(ctx, 512, 512, 9000, rand, ['#617c49', '#839d67', '#55703f', '#94a977', '#4c6538'], 0.32);
  for (let i = 0; i < 40; i++) {
    ctx.strokeStyle = `rgba(40,60,28,${0.03 + rand() * 0.05})`;
    ctx.lineWidth = 0.6 + rand() * 1.6;
    ctx.beginPath();
    const x = rand() * 512;
    ctx.moveTo(x, rand() * 512);
    ctx.lineTo(x + rand() * 30 - 15, rand() * 512);
    ctx.stroke();
  }
  return finish(c);
}

export function makeGroundTexture() {
  const [c, ctx] = makeCanvas(512, 512);
  const rand = mulberry32(515);
  ctx.fillStyle = '#c3c4ae';
  ctx.fillRect(0, 0, 512, 512);
  speckle(ctx, 512, 512, 12000, rand, ['#b6b8a0', '#cdceba', '#aeb197', '#d6d6c2', '#a9ac92'], 0.3);
  for (let i = 0; i < 90; i++) {
    ctx.fillStyle = `rgba(${90 + rand() * 50},${110 + rand() * 50},${70 + rand() * 40},${0.03 + rand() * 0.06})`;
    ctx.beginPath();
    ctx.ellipse(rand() * 512, rand() * 512, 8 + rand() * 42, 5 + rand() * 26, rand() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  return finish(c);
}

export function makeSignAtlas() {
  const [c, ctx] = makeCanvas(1024, 192);
  const labels = ['玉女峰', '大王峰'];
  for (let k = 0; k < 2; k++) {
    const ox = k * 512;
    ctx.fillStyle = '#14294f';
    ctx.fillRect(ox, 0, 512, 192);
    const g = ctx.createLinearGradient(0, 0, 0, 192);
    g.addColorStop(0, 'rgba(80,120,190,0.5)');
    g.addColorStop(0.5, 'rgba(10,22,45,0.1)');
    g.addColorStop(1, 'rgba(5,12,28,0.6)');
    ctx.fillStyle = g;
    ctx.fillRect(ox, 0, 512, 192);
    ctx.strokeStyle = '#e0b65a';
    ctx.lineWidth = 12;
    ctx.strokeRect(ox + 8, 8, 496, 176);
    ctx.strokeStyle = '#8a6a2a';
    ctx.lineWidth = 4;
    ctx.strokeRect(ox + 22, 22, 468, 148);
    ctx.fillStyle = '#efc768';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const chars = labels[k].split('');
    const size = Math.min(104, 400 / chars.length);
    ctx.font = `700 ${size}px "Noto Serif CJK SC", "Source Han Serif SC", "STSong", "SimSun", serif`;
    const total = size * chars.length;
    chars.forEach((ch, i) => {
      ctx.fillText(ch, ox + 256 - total / 2 + size * (i + 0.5), 98);
    });
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.anisotropy = 8;
  return t;
}


export function makeTeaPlaqueTexture() {
  const [c, ctx] = makeCanvas(512, 192);
  ctx.fillStyle = '#3c2418';
  ctx.fillRect(0, 0, 512, 192);
  const g = ctx.createLinearGradient(0, 0, 0, 192);
  g.addColorStop(0, 'rgba(180,120,70,0.4)');
  g.addColorStop(0.5, 'rgba(34,20,12,0.25)');
  g.addColorStop(1, 'rgba(18,10,6,0.55)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 192);
  ctx.strokeStyle = '#c79d58';
  ctx.lineWidth = 10;
  ctx.strokeRect(8, 8, 496, 176);
  ctx.strokeStyle = '#8d6634';
  ctx.lineWidth = 4;
  ctx.strokeRect(22, 22, 468, 148);
  ctx.fillStyle = '#e8c477';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 96px "Noto Serif CJK SC", "Source Han Serif SC", "STSong", "SimSun", serif';
  ctx.fillText('大红袍', 256, 100);
  return finish(c, { repeat: false });
}
