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
  g.addColorStop(0, '#eda93b');
  g.addColorStop(0.5, '#d58c22');
  g.addColorStop(1, '#b36818');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const tile = 64;
  for (let x = 0; x < 256; x += tile) {
    const rg = ctx.createLinearGradient(x, 0, x + tile, 0);
    rg.addColorStop(0, 'rgba(70,40,4,0.42)');
    rg.addColorStop(0.18, 'rgba(255,224,140,0.22)');
    rg.addColorStop(0.5, 'rgba(255,230,160,0.38)');
    rg.addColorStop(0.82, 'rgba(255,214,120,0.12)');
    rg.addColorStop(1, 'rgba(60,34,2,0.45)');
    ctx.fillStyle = rg;
    ctx.fillRect(x, 0, tile, 256);
    ctx.strokeStyle = 'rgba(80,46,6,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, 256);
    ctx.stroke();
  }
  for (let y = 0; y < 256; y += 26) {
    ctx.strokeStyle = 'rgba(88,52,8,0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(256, y + 0.5);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,225,150,0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y + 2.5);
    ctx.lineTo(256, y + 2.5);
    ctx.stroke();
  }
  speckle(ctx, 256, 256, 700, rand, ['#8a5a12', '#f2c768', '#a06a1a'], 0.12);
  return finish(c);
}

export function makeWallTexture() {
  const [c, ctx] = makeCanvas(256, 256);
  const rand = mulberry32(41);
  ctx.fillStyle = '#b83a24';
  ctx.fillRect(0, 0, 256, 256);
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, 'rgba(255,190,150,0.13)');
  g.addColorStop(0.6, 'rgba(0,0,0,0.02)');
  g.addColorStop(1, 'rgba(70,10,4,0.14)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  speckle(ctx, 256, 256, 1600, rand, ['#8f2f22', '#b84b36', '#c25a42', '#7f2a1f'], 0.28);
  for (let i = 0; i < 22; i++) {
    ctx.strokeStyle = `rgba(60,12,6,${0.03 + rand() * 0.05})`;
    ctx.lineWidth = 0.5 + rand() * 1.5;
    ctx.beginPath();
    const x = rand() * 256;
    ctx.moveTo(x, 0);
    ctx.bezierCurveTo(x + rand() * 12 - 6, 80, x + rand() * 16 - 8, 170, x + rand() * 10 - 5, 256);
    ctx.stroke();
  }
  const damp = ctx.createLinearGradient(0, 170, 0, 256);
  damp.addColorStop(0, 'rgba(52,18,10,0)');
  damp.addColorStop(1, 'rgba(42,16,10,0.32)');
  ctx.fillStyle = damp;
  ctx.fillRect(0, 170, 256, 86);
  for (let i = 0; i < 28; i++) {
    const x = rand() * 256;
    ctx.fillStyle = `rgba(225,205,178,${0.03 + rand() * 0.06})`;
    ctx.fillRect(x, 120 + rand() * 100, 1 + rand() * 2, 14 + rand() * 52);
  }
  speckle(ctx, 256, 256, 420, rand, ['#6b1a10', '#d18464', '#8a3324'], 0.14);
  return finish(c);
}

export function makeMarbleTexture() {
  const [c, ctx] = makeCanvas(512, 512);
  const rand = mulberry32(7);
  ctx.fillStyle = '#efe9dc';
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
  const S = 256;
  const [c, ctx] = makeCanvas(S, S);
  const rand = mulberry32(93);
  ctx.fillStyle = '#9c9a93';
  ctx.fillRect(0, 0, S, S);
  const size = 32;
  for (let y = 0; y < S; y += size) {
    for (let x = 0; x < S; x += size) {
      const v = 0.86 + rand() * 0.28;
      ctx.fillStyle = `rgb(${(160 * v) | 0},${(157 * v) | 0},${(148 * v) | 0})`;
      ctx.fillRect(x + 1, y + 1, size - 2, size - 2);
      ctx.fillStyle = 'rgba(255,255,245,0.05)';
      ctx.fillRect(x + 2, y + 2, size - 4, 2);
    }
  }
  ctx.strokeStyle = 'rgba(92,84,72,0.55)';
  ctx.lineWidth = 1.2;
  for (let i = 0; i <= S; i += size) {
    ctx.beginPath();
    ctx.moveTo(i + 0.5, 0);
    ctx.lineTo(i + 0.5, S);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i + 0.5);
    ctx.lineTo(S, i + 0.5);
    ctx.stroke();
  }
  speckle(ctx, S, S, 900, rand, ['#8e8b82', '#d4d0c7', '#a3a097'], 0.2);
  return finish(c);
}

export function makeDirtTexture() {
  const S = 256;
  const [c, ctx] = makeCanvas(S, S);
  const rand = mulberry32(5);
  ctx.fillStyle = '#938b7b';
  ctx.fillRect(0, 0, S, S);
  speckle(ctx, S, S, 2200, rand, ['#8b8169', '#a89c84', '#7f7862', '#b3a68c'], 0.28);
  return finish(c);
}

function hash2(x, y, seed) {
  const v = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
  return v - Math.floor(v);
}

function normalTexture(size, heightAt, strength = 2.4) {
  const [c, ctx] = makeCanvas(size, size);
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const h = heightAt(x, y);
      const hx = heightAt((x + 1) % size, y);
      const hy = heightAt(x, (y + 1) % size);
      const nx = (h - hx) * strength;
      const ny = (h - hy) * strength;
      const len = Math.hypot(nx, ny, 1) || 1;
      const i = (y * size + x) * 4;
      img.data[i] = ((nx / len) * 0.5 + 0.5) * 255;
      img.data[i + 1] = ((ny / len) * 0.5 + 0.5) * 255;
      img.data[i + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return finish(c, { srgb: false });
}

export function makeRoofNormalTexture() {
  return normalTexture(256, (x, y) => {
    const col = ((x % 64) + 64) % 64;
    const row = ((y % 26) + 26) % 26;
    const crown = 1 - Math.abs(col - 32) / 32;
    const rib = Math.max(0, 1 - Math.abs(row - 8) / 7);
    return 0.34 + crown * 0.42 + rib * 0.13 + hash2(x, y, 2) * 0.09;
  }, 2.6);
}

export function makeWallNormalTexture() {
  return normalTexture(256, (x, y) => {
    const streak = Math.sin(x * 0.19 + Math.sin(x * 0.043) * 2.1) * 0.5 + 0.5;
    const grain = hash2(x >> 1, y, 8) * 0.5 + hash2(x, y >> 2, 4) * 0.5;
    return 0.42 + streak * 0.08 + grain * 0.16;
  }, 1.5);
}

export function makeMarbleNormalTexture() {
  return normalTexture(256, (x, y) => {
    const vein = Math.abs(Math.sin(x * 0.041 + y * 0.017 + Math.sin(y * 0.06) * 1.8));
    return 0.47 + vein * 0.05 + hash2(x, y, 13) * 0.1;
  }, 1.1);
}

export function makePavingNormalTexture() {
  return normalTexture(256, (x, y) => {
    const gx = Math.min(x % 32, 32 - (x % 32));
    const gy = Math.min(y % 32, 32 - (y % 32));
    const stone = Math.min(1, Math.min(gx, gy) / 2.2);
    return 0.28 + stone * 0.44 + hash2(x >> 1, y >> 1, 21) * 0.11;
  }, 1.8);
}

export function makeStoneNormalTexture() {
  return normalTexture(256, (x, y) => {
    return 0.34 + hash2(x >> 1, y >> 1, 31) * 0.3 + hash2(x, y, 37) * 0.15;
  }, 1.4);
}

export function makeRoughnessTexture(seed = 5, base = 196, span = 40) {
  const S = 256;
  const [c, ctx] = makeCanvas(S, S);
  const img = ctx.createImageData(S, S);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const blot = hash2(x >> 3, y >> 3, seed) * 0.55 + hash2(x >> 1, y >> 1, seed + 2) * 0.3;
      const v = base + (blot - 0.42) * span;
      const i = (y * S + x) * 4;
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return finish(c, { srgb: false });
}

export function makeLatticeTexture() {
  const [c, ctx] = makeCanvas(256, 512);
  const rand = mulberry32(23);
  ctx.fillStyle = '#202c2a';
  ctx.fillRect(0, 0, 256, 512);
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, 'rgba(70,95,88,0.5)');
  g.addColorStop(1, 'rgba(8,12,11,0.5)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 512);
  ctx.strokeStyle = '#c79a3c';
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
  ctx.strokeStyle = 'rgba(201,154,60,0.55)';
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
  ctx.fillStyle = '#17322e';
  ctx.fillRect(22, bottom + 10, 212, 148);
  ctx.strokeStyle = '#c79a3c';
  ctx.lineWidth = 3;
  ctx.strokeRect(22, bottom + 10, 212, 148);
  ctx.fillStyle = '#d3a548';
  for (let y = bottom + 30; y < bottom + 158; y += 28) {
    for (let x = 42; x < 230; x += 28) {
      ctx.beginPath();
      ctx.arc(x, y, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  speckle(ctx, 256, 512, 260, rand, ['#000000', '#8a6a2a', '#3c514a'], 0.08);
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

export function drawPlaque(ctx, text, x, y, w, h) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(w / 512, h / 192);
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
  ctx.restore();
}

export function makePlaqueTexture(text) {
  const [c, ctx] = makeCanvas(512, 192);
  drawPlaque(ctx, text, 0, 0, 512, 192);
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

export function makeDoorTexture() {
  const [c, ctx] = makeCanvas(256, 512);
  const rand = mulberry32(121);
  ctx.fillStyle = '#8d281b';
  ctx.fillRect(0, 0, 256, 512);
  const g = ctx.createLinearGradient(0, 0, 256, 512);
  g.addColorStop(0, 'rgba(255,150,110,0.16)');
  g.addColorStop(0.55, 'rgba(70,8,4,0.12)');
  g.addColorStop(1, 'rgba(255,120,80,0.1)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 26; i++) {
    ctx.strokeStyle = `rgba(60,8,4,${0.05 + rand() * 0.07})`;
    ctx.lineWidth = 0.6 + rand() * 1.4;
    const x = rand() * 256;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.bezierCurveTo(x + rand() * 8 - 4, 160, x + rand() * 10 - 5, 340, x + rand() * 8 - 4, 512);
    ctx.stroke();
  }
  ctx.fillStyle = '#57110c';
  ctx.fillRect(124, 0, 8, 512);
  ctx.strokeStyle = '#d1a03c';
  ctx.lineWidth = 7;
  ctx.strokeRect(9, 9, 238, 494);
  ctx.strokeStyle = '#8f6822';
  ctx.lineWidth = 3;
  ctx.strokeRect(23, 23, 210, 466);
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 5; col++) {
      const x = 46 + col * 41 + (col > 1 ? 4 : 0);
      const y = 66 + row * 44;
      const rg = ctx.createRadialGradient(x - 2, y - 2, 1, x, y, 8);
      rg.addColorStop(0, '#ffe6a0');
      rg.addColorStop(0.6, '#c99733');
      rg.addColorStop(1, '#6e4a12');
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(x, y, 6.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.strokeStyle = '#d8ac4a';
  ctx.lineWidth = 7;
  for (const sx of [1, -1]) {
    ctx.beginPath();
    ctx.arc(128 + sx * 15, 286, 13, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = '#17322e';
  ctx.fillRect(36, 390, 184, 74);
  ctx.strokeStyle = '#c99733';
  ctx.lineWidth = 4;
  ctx.strokeRect(36, 390, 184, 74);
  speckle(ctx, 256, 512, 240, rand, ['#5e160e', '#b4563c', '#e0b45e'], 0.09);
  return finish(c);
}

export function makeBannerTexture() {
  const [c, ctx] = makeCanvas(256, 512);
  ctx.fillStyle = '#9c2218';
  ctx.fillRect(0, 0, 256, 512);
  const g = ctx.createLinearGradient(0, 0, 256, 0);
  g.addColorStop(0, 'rgba(60,6,4,0.4)');
  g.addColorStop(0.4, 'rgba(255,150,90,0.14)');
  g.addColorStop(1, 'rgba(60,6,4,0.4)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 512);
  ctx.strokeStyle = '#e0b45a';
  ctx.lineWidth = 12;
  ctx.strokeRect(14, 14, 228, 484);
  ctx.strokeStyle = '#f0cf80';
  ctx.lineWidth = 3;
  ctx.strokeRect(32, 32, 192, 448);
  ctx.strokeStyle = 'rgba(230,186,96,0.7)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  for (let i = 0; i <= 10; i++) {
    const y = 70 + i * 37;
    const x = 128 + Math.sin(i * 0.9) * 54;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.fillStyle = '#f2d487';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 150px "Noto Serif CJK SC", "STSong", "SimSun", serif';
  ctx.fillText('令', 128, 270);
  return finish(c, { repeat: false });
}

export function makeSmokeTexture() {
  const [c, ctx] = makeCanvas(128, 128);
  const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 62);
  g.addColorStop(0, 'rgba(255,255,250,0.9)');
  g.addColorStop(0.35, 'rgba(235,235,228,0.45)');
  g.addColorStop(0.7, 'rgba(210,212,208,0.14)');
  g.addColorStop(1, 'rgba(200,200,200,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return finish(c, { repeat: false });
}

export function makeBirdTexture() {
  const [c, ctx] = makeCanvas(64, 64);
  ctx.strokeStyle = 'rgba(32,30,28,0.92)';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(6, 34);
  ctx.quadraticCurveTo(20, 22, 32, 33);
  ctx.quadraticCurveTo(44, 22, 58, 34);
  ctx.stroke();
  return finish(c, { repeat: false });
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
