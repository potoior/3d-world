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

export function makeWhiteTexture() {
  const [c, ctx] = makeCanvas(256, 256);
  const rand = mulberry32(61);
  ctx.fillStyle = '#e6dfcf';
  ctx.fillRect(0, 0, 256, 256);
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, 'rgba(255,255,248,0.34)');
  g.addColorStop(0.6, 'rgba(210,200,182,0.08)');
  g.addColorStop(1, 'rgba(150,138,120,0.22)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 26; i++) {
    const x = rand() * 256;
    ctx.strokeStyle = `rgba(120,108,90,${0.015 + rand() * 0.035})`;
    ctx.lineWidth = 0.5 + rand() * 2.4;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.bezierCurveTo(x + rand() * 8 - 4, 90, x + rand() * 12 - 6, 180, x + rand() * 9 - 4, 256);
    ctx.stroke();
  }
  for (let i = 0; i < 30; i++) {
    const x = rand() * 256;
    const y = rand() * 256;
    const w = 8 + rand() * 42;
    const h = 5 + rand() * 26;
    ctx.fillStyle = rand() > 0.45
      ? `rgba(255,252,240,${0.05 + rand() * 0.13})`
      : `rgba(168,150,120,${0.03 + rand() * 0.09})`;
    ctx.beginPath();
    ctx.ellipse(x, y, w, h, rand() * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  const damp = ctx.createLinearGradient(0, 186, 0, 256);
  damp.addColorStop(0, 'rgba(118,104,82,0)');
  damp.addColorStop(1, 'rgba(104,90,70,0.17)');
  ctx.fillStyle = damp;
  ctx.fillRect(0, 186, 256, 70);
  speckle(ctx, 256, 256, 1500, rand, ['#d4cbb8', '#f6f1e5', '#bfb5a1'], 0.18);
  return finish(c);
}

export function makeRedTexture() {
  const [c, ctx] = makeCanvas(256, 256);
  const rand = mulberry32(17);
  ctx.fillStyle = '#9b2d20';
  ctx.fillRect(0, 0, 256, 256);
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, 'rgba(255,150,110,0.18)');
  g.addColorStop(0.55, 'rgba(35,4,2,0.05)');
  g.addColorStop(1, 'rgba(20,2,1,0.22)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 34; i++) {
    const x = rand() * 256;
    ctx.strokeStyle = `rgba(30,4,2,${0.04 + rand() * 0.06})`;
    ctx.lineWidth = 0.6 + rand() * 2;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.bezierCurveTo(x + rand() * 10 - 5, 80, x + rand() * 14 - 7, 175, x + rand() * 10 - 5, 256);
    ctx.stroke();
  }
  for (let i = 0; i < 36; i++) {
    const x = rand() * 256;
    const y = rand() * 256;
    const w = 5 + rand() * 34;
    const h = 3 + rand() * 20;
    ctx.fillStyle = rand() > 0.62
      ? `rgba(224,148,112,${0.025 + rand() * 0.06})`
      : `rgba(44,6,3,${0.035 + rand() * 0.1})`;
    ctx.beginPath();
    ctx.ellipse(x, y, w, h, rand() * 0.7, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let y = 18; y < 256; y += 52) {
    ctx.fillStyle = 'rgba(255,170,130,0.045)';
    ctx.fillRect(0, y, 256, 7);
    ctx.fillStyle = 'rgba(30,3,2,0.06)';
    ctx.fillRect(0, y + 7, 256, 2);
  }
  speckle(ctx, 256, 256, 1800, rand, ['#7d2016', '#b04431', '#c05a42', '#691810'], 0.25);
  return finish(c);
}

export function makeStoneTexture() {
  const [c, ctx] = makeCanvas(512, 512);
  const rand = mulberry32(91);
  ctx.fillStyle = '#8b8171';
  ctx.fillRect(0, 0, 512, 512);
  const rows = 8;
  const rh = 512 / rows;
  for (let r = 0; r < rows; r++) {
    const off = (r % 2) * 32;
    for (let x = -64; x < 512; x += 64) {
      const v = 0.82 + rand() * 0.3;
      ctx.fillStyle = `rgb(${(142 * v) | 0},${(132 * v) | 0},${(116 * v) | 0})`;
      ctx.fillRect(x + off + 2, r * rh + 2, 60, rh - 4);
      ctx.fillStyle = 'rgba(255,250,235,0.07)';
      ctx.fillRect(x + off + 2, r * rh + 2, 60, 3);
    }
  }
  ctx.strokeStyle = 'rgba(72,64,52,0.55)';
  ctx.lineWidth = 2;
  for (let i = 0; i <= rows; i++) {
    ctx.beginPath();
    ctx.moveTo(0, i * rh + 0.5);
    ctx.lineTo(512, i * rh + 0.5);
    ctx.stroke();
  }
  speckle(ctx, 512, 512, 3200, rand, ['#756b5a', '#a79b85', '#635a4a'], 0.2);
  return finish(c);
}

export function makePavingTexture() {
  const [c, ctx] = makeCanvas(512, 512);
  const rand = mulberry32(33);
  ctx.fillStyle = '#928c7c';
  ctx.fillRect(0, 0, 512, 512);
  const size = 56;
  for (let y = 0; y < 512; y += size) {
    for (let x = 0; x < 512; x += size) {
      const v = 0.8 + rand() * 0.36;
      ctx.fillStyle = `rgb(${(150 * v) | 0},${(143 * v) | 0},${(128 * v) | 0})`;
      ctx.fillRect(x + 1, y + 1, size - 2, size - 2);
    }
  }
  ctx.strokeStyle = 'rgba(78,70,56,0.55)';
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
  speckle(ctx, 512, 512, 2400, rand, ['#7d7564', '#c7bfae', '#a29a87'], 0.22);
  return finish(c);
}

export function makeRoofTexture() {
  const [c, ctx] = makeCanvas(256, 256);
  const rand = mulberry32(7);
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#f0c258');
  g.addColorStop(0.45, '#d9a332');
  g.addColorStop(1, '#a8741c');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  for (let x = 0; x < 256; x += 22) {
    const rg = ctx.createLinearGradient(x, 0, x + 22, 0);
    rg.addColorStop(0, 'rgba(88,52,6,0.42)');
    rg.addColorStop(0.2, 'rgba(255,230,150,0.32)');
    rg.addColorStop(0.55, 'rgba(255,238,170,0.2)');
    rg.addColorStop(1, 'rgba(70,40,2,0.44)');
    ctx.fillStyle = rg;
    ctx.fillRect(x, 0, 22, 256);
  }
  for (let y = 0; y < 256; y += 21) {
    ctx.strokeStyle = 'rgba(84,48,4,0.52)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(256, y + 0.5);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,241,182,0.3)';
    ctx.beginPath();
    ctx.moveTo(0, y + 2.5);
    ctx.lineTo(256, y + 2.5);
    ctx.stroke();
  }
  speckle(ctx, 256, 256, 800, rand, ['#9a6716', '#f6d271', '#b58122'], 0.14);
  return finish(c);
}

export function makePlaqueTexture(label) {
  const [c, ctx] = makeCanvas(512, 160);
  const rand = mulberry32(113);
  ctx.fillStyle = '#1c120c';
  ctx.fillRect(0, 0, 512, 160);
  const g = ctx.createLinearGradient(0, 0, 0, 160);
  g.addColorStop(0, 'rgba(70,44,18,0.65)');
  g.addColorStop(0.5, 'rgba(30,18,9,0.2)');
  g.addColorStop(1, 'rgba(12,7,4,0.6)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 160);
  ctx.strokeStyle = '#d9b463';
  ctx.lineWidth = 8;
  ctx.strokeRect(9, 9, 494, 142);
  ctx.strokeStyle = 'rgba(240,206,125,0.55)';
  ctx.lineWidth = 2;
  ctx.strokeRect(24, 24, 464, 112);
  for (const x of [38, 474]) {
    ctx.fillStyle = '#c99a45';
    ctx.beginPath();
    ctx.arc(x, 80, 8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#f0d189';
  ctx.font = 'bold 78px "Noto Serif CJK SC", "Songti SC", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 256, 84);
  ctx.globalAlpha = 0.23;
  for (let i = 0; i < 260; i++) {
    ctx.fillStyle = rand() > 0.5 ? '#f7df9d' : '#5e3a14';
    ctx.fillRect(rand() * 512, rand() * 160, 1 + rand() * 2, 1 + rand() * 2);
  }
  ctx.globalAlpha = 1;
  return finish(c, { repeat: false });
}

export function makeGroundTexture() {
  const [c, ctx] = makeCanvas(512, 512);
  const rand = mulberry32(83);
  ctx.fillStyle = '#978b68';
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 80; i++) {
    const x = rand() * 512;
    const y = rand() * 512;
    const r = 10 + rand() * 46;
    const g = ctx.createRadialGradient(x, y, 1, x, y, r);
    const warm = rand() > 0.4;
    g.addColorStop(0, warm ? 'rgba(145,132,82,0.36)' : 'rgba(105,117,70,0.3)');
    g.addColorStop(1, 'rgba(120,110,80,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  speckle(ctx, 512, 512, 5200, rand, ['#857a55', '#a89a70', '#6f7348', '#b3a477'], 0.25);
  return finish(c);
}
