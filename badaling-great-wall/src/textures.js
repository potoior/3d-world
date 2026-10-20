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

function finish(canvas, { srgb = true, repeat = true, anisotropy = 8 } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  if (repeat) {
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
  }
  t.anisotropy = anisotropy;
  t.needsUpdate = true;
  return t;
}

function speckle(ctx, w, h, count, rand, colors, alpha = 0.2, maxR = 1.6) {
  ctx.globalAlpha = alpha;
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = colors[(rand() * colors.length) | 0];
    const r = rand() * maxR + 0.2;
    ctx.beginPath();
    ctx.arc(rand() * w, rand() * h, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function mottle(ctx, w, h, rand, count, colors, alpha = 0.08) {
  ctx.globalAlpha = alpha;
  for (let i = 0; i < count; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const r = 8 + rand() * 54;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, colors[(rand() * colors.length) | 0]);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.globalAlpha = 1;
}

export function makeBrickTexture() {
  const [c, ctx] = makeCanvas(512, 512);
  const rand = mulberry32(1207);
  ctx.fillStyle = '#57544c';
  ctx.fillRect(0, 0, 512, 512);

  const course = 22.4;
  const bw = 45.6;
  const tones = [
    [128, 122, 111], [113, 109, 101], [141, 133, 120], [101, 99, 93],
    [121, 112, 99], [109, 106, 99], [147, 138, 124], [95, 94, 88],
  ];
  for (let row = 0; row < 23; row++) {
    const y = row * course;
    const shift = row % 2 === 0 ? 0 : bw * 0.5;
    for (let col = -1; col < 13; col++) {
      const x = col * bw + shift;
      const t = tones[(rand() * tones.length) | 0];
      const v = 0.82 + rand() * 0.3;
      ctx.fillStyle = `rgb(${(t[0] * v) | 0},${(t[1] * v) | 0},${(t[2] * v) | 0})`;
      ctx.fillRect(x + 1.8, y + 1.8, bw - 3.6, course - 3.6);
      ctx.fillStyle = `rgba(228,217,196,${0.05 + rand() * 0.09})`;
      ctx.fillRect(x + 2.5, y + 2.6, bw - 5, 1.8);
      ctx.fillStyle = 'rgba(28,25,21,0.2)';
      ctx.fillRect(x + 2.5, y + course - 4.2, bw - 5, 2.2);
      if (rand() < 0.3) {
        ctx.fillStyle = 'rgba(35,31,26,0.16)';
        ctx.fillRect(x + 2 + rand() * 10, y + 2 + rand() * 10, 6 + rand() * 14, 3 + rand() * 6);
      }
      if (rand() < 0.16) {
        ctx.strokeStyle = `rgba(40,36,30,${0.16 + rand() * 0.18})`;
        ctx.lineWidth = 0.7 + rand();
        ctx.beginPath();
        const cx = x + 6 + rand() * 34;
        const cy = y + 4 + rand() * 10;
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + rand() * 8 - 4, cy + 6 + rand() * 7);
        ctx.lineTo(cx + rand() * 15 - 7.5, cy + 13 + rand() * 6);
        ctx.stroke();
      }
    }
  }

  ctx.strokeStyle = 'rgba(43,39,33,0.42)';
  ctx.lineWidth = 1.9;
  for (let row = 0; row <= 23; row++) {
    const y = row * course + 0.5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }

  for (let i = 0; i < 34; i++) {
    const x = rand() * 512;
    const w = 2 + rand() * 12;
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    const dark = rand() < 0.6;
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.5, dark ? `rgba(52,49,42,${0.06 + rand() * 0.1})` : `rgba(206,196,172,${0.04 + rand() * 0.06})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x, 0, w, 512);
  }

  mottle(ctx, 512, 512, rand, 95, ['#646b5c', '#aca797', '#56554e', '#b6b0a0', '#6c7264'], 0.07);
  speckle(ctx, 512, 512, 2400, rand, ['#55534c', '#a29c8d', '#bab3a4', '#6b7063', '#837d6f'], 0.18, 1.7);

  ctx.globalAlpha = 0.16;
  for (let i = 0; i < 42; i++) {
    ctx.fillStyle = rand() < 0.5 ? '#52694a' : '#aaa58f';
    ctx.beginPath();
    const x = rand() * 512;
    const y = rand() * 512;
    ctx.ellipse(x, y, 5 + rand() * 22, 3 + rand() * 10, rand() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  for (let i = 0; i < 260; i++) {
    const row = (rand() * 23) | 0;
    const col = (rand() * 13) | 0;
    const shift = row % 2 === 0 ? 0 : bw * 0.5;
    const x = col * bw + shift;
    const y = row * course;
    const edge = rand();
    ctx.strokeStyle = edge < 0.5 ? `rgba(42,38,32,${0.2 + rand() * 0.25})` : `rgba(220,210,188,${0.12 + rand() * 0.18})`;
    ctx.lineWidth = 0.6 + rand() * 1.4;
    ctx.beginPath();
    if (edge < 0.34) {
      ctx.moveTo(x + 3, y + 3 + rand() * 4);
      ctx.lineTo(x + bw - 3 - rand() * 8, y + 3 + rand() * 5);
    } else if (edge < 0.7) {
      ctx.moveTo(x + 3 + rand() * 8, y + 3);
      ctx.lineTo(x + 3 + rand() * 7, y + course - 3);
    } else {
      ctx.moveTo(x + 6 + rand() * 26, y + 4);
      ctx.lineTo(x + 4 + rand() * 28, y + 8 + rand() * 10);
      ctx.lineTo(x + 9 + rand() * 25, y + course - 4);
    }
    ctx.stroke();
  }

  for (let i = 0; i < 26; i++) {
    const x = rand() * 512;
    const y = 300 + rand() * 210;
    const r = 12 + rand() * 38;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(58,72,48,${0.08 + rand() * 0.1})`);
    g.addColorStop(1, 'rgba(58,72,48,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.globalAlpha = 0.14;
  for (let i = 0; i < 18; i++) {
    const x = rand() * 512;
    const w = 4 + rand() * 16;
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, 'rgba(238,236,226,0)');
    g.addColorStop(0.5, 'rgba(238,236,226,0.5)');
    g.addColorStop(1, 'rgba(238,236,226,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x, 230 + rand() * 80, w, 130 + rand() * 110);
  }
  ctx.globalAlpha = 1;
  return finish(c);
}

export function makeStoneTexture() {
  const [c, ctx] = makeCanvas(512, 512);
  const rand = mulberry32(411);
  ctx.fillStyle = '#4b4a44';
  ctx.fillRect(0, 0, 512, 512);
  const bh = 58;
  const tones = [
    [126, 123, 114], [110, 108, 101], [136, 131, 120], [98, 97, 92],
    [120, 113, 102], [112, 110, 104], [143, 137, 125],
  ];
  for (let row = 0; row < 9; row++) {
    const y = row * bh;
    let x = row % 2 ? -34 : -12;
    while (x < 512) {
      const w = 66 + rand() * 58;
      const t = tones[(rand() * tones.length) | 0];
      const v = 0.8 + rand() * 0.34;
      ctx.fillStyle = `rgb(${(t[0] * v) | 0},${(t[1] * v) | 0},${(t[2] * v) | 0})`;
      ctx.fillRect(x + 2, y + 2, w - 4, bh - 4);
      ctx.fillStyle = `rgba(232,224,206,${0.05 + rand() * 0.08})`;
      ctx.fillRect(x + 3, y + 3, w - 6, 2);
      ctx.fillStyle = 'rgba(24,23,20,0.2)';
      ctx.fillRect(x + 3, y + bh - 5, w - 6, 2.6);
      if (rand() < 0.5) {
        ctx.strokeStyle = `rgba(54,52,46,${0.08 + rand() * 0.12})`;
        ctx.lineWidth = 0.8 + rand();
        for (let k = 0; k < 3; k++) {
          const cx = x + 8 + rand() * (w - 20);
          const cy = y + 8 + rand() * (bh - 20);
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + 5 + rand() * 12, cy + 2 + rand() * 6);
          ctx.stroke();
        }
      }
      x += w;
    }
  }
  mottle(ctx, 512, 512, rand, 110, ['#555b50', '#928a79', '#67675d', '#aaa18f', '#717467'], 0.09);
  speckle(ctx, 512, 512, 3200, rand, ['#48463e', '#8e8779', '#aca391', '#62655a'], 0.17, 2.1);
  ctx.globalAlpha = 0.1;
  for (let i = 0; i < 24; i++) {
    ctx.fillStyle = rand() < 0.5 ? '#5a634e' : '#b3a88e';
    ctx.beginPath();
    ctx.ellipse(rand() * 512, rand() * 512, 6 + rand() * 20, 3 + rand() * 9, rand() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  for (let i = 0; i < 70; i++) {
    const y = rand() * 512;
    const bend = 2 + rand() * 7;
    ctx.strokeStyle = rand() < 0.6 ? `rgba(52,50,43,${0.16 + rand() * 0.2})` : `rgba(206,196,172,${0.1 + rand() * 0.14})`;
    ctx.lineWidth = 0.7 + rand() * 1.8;
    ctx.beginPath();
    ctx.moveTo(-10, y);
    ctx.bezierCurveTo(140, y + bend, 350, y - bend, 522, y + rand() * bend * 0.6);
    ctx.stroke();
  }
  for (let i = 0; i < 220; i++) {
    const row = (rand() * 9) | 0;
    let x = (rand() * 512) | 0;
    const y = row * bh;
    const w = 20 + rand() * 40;
    ctx.strokeStyle = rand() < 0.55 ? `rgba(40,38,32,${0.18 + rand() * 0.24})` : `rgba(222,214,194,${0.1 + rand() * 0.16})`;
    ctx.lineWidth = 0.6 + rand() * 1.2;
    ctx.beginPath();
    if (rand() < 0.5) {
      ctx.moveTo(x, y + 4 + rand() * 40);
      ctx.lineTo(x + w, y + 4 + rand() * 40);
    } else {
      ctx.moveTo(x, y + 4);
      ctx.lineTo(x + rand() * 3 - 1.5, y + bh - 4);
    }
    ctx.stroke();
  }
  for (let i = 0; i < 26; i++) {
    const x = rand() * 512;
    const y = 300 + rand() * 212;
    const r = 10 + rand() * 32;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(186,166,116,${0.08 + rand() * 0.1})`);
    g.addColorStop(1, 'rgba(186,166,116,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  return finish(c);
}

export function makeWalkwayTexture() {
  const [c, ctx] = makeCanvas(512, 512);
  const rand = mulberry32(932);
  ctx.fillStyle = '#5c584f';
  ctx.fillRect(0, 0, 512, 512);
  const size = 56;
  const tones = [[127, 123, 114], [114, 111, 104], [140, 135, 123], [103, 101, 95]];
  for (let y = 0; y < 512; y += size) {
    const shift = (y / size) % 2 === 0 ? 0 : size * 0.5;
    for (let x = -size; x < 576; x += size) {
      const xx = x + shift;
      const t = tones[(rand() * tones.length) | 0];
      const v = 0.82 + rand() * 0.3;
      ctx.fillStyle = `rgb(${(t[0] * v) | 0},${(t[1] * v) | 0},${(t[2] * v) | 0})`;
      ctx.fillRect(xx + 1.6, y + 1.6, size - 3.2, size - 3.2);
      ctx.fillStyle = 'rgba(238,230,210,0.07)';
      ctx.fillRect(xx + 2, y + 2, size - 4, 2);
      ctx.fillStyle = 'rgba(34,31,26,0.17)';
      ctx.fillRect(xx + 2, y + size - 4, size - 4, 2.4);
      if (rand() < 0.14) {
        ctx.strokeStyle = `rgba(48,44,37,${0.15 + rand() * 0.15})`;
        ctx.lineWidth = 1 + rand();
        ctx.beginPath();
        const cx = xx + 8 + rand() * (size - 16);
        const cy = y + 8 + rand() * (size - 16);
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + rand() * 12 - 6, cy + 5 + rand() * 9);
        ctx.stroke();
      }
    }
  }
  mottle(ctx, 512, 512, rand, 100, ['#6c705f', '#a39a86', '#727669', '#b9ae96'], 0.08);
  speckle(ctx, 512, 512, 3600, rand, ['#605d53', '#a49e8f', '#b8b09e', '#54544b'], 0.17, 1.9);

  for (let i = 0; i < 90; i++) {
    const y = ((rand() * 9) | 0) * size;
    const x = rand() * 512;
    ctx.strokeStyle = rand() < 0.7 ? `rgba(46,43,37,${0.18 + rand() * 0.22})` : `rgba(226,218,198,${0.1 + rand() * 0.14})`;
    ctx.lineWidth = 0.6 + rand() * 1.1;
    ctx.beginPath();
    if (rand() < 0.5) {
      ctx.moveTo(x, y + 3);
      ctx.lineTo(x + 10 + rand() * 34, y + 3 + rand() * 3);
    } else {
      ctx.moveTo(x, y + 3);
      ctx.lineTo(x + rand() * 4 - 2, y + size - 3);
    }
    ctx.stroke();
  }
  for (let i = 0; i < 22; i++) {
    const x = ((rand() * 9) | 0) * size;
    const y = ((rand() * 9) | 0) * size;
    ctx.fillStyle = `rgba(${rand() < 0.5 ? '150,146,132' : '88,86,78'},${0.08 + rand() * 0.08})`;
    ctx.fillRect(x + 4, y + 4, size * (0.4 + rand() * 0.5), size * (0.3 + rand() * 0.5));
  }
  for (let i = 0; i < 38; i++) {
    const x = rand() * 512;
    const y = rand() * 512;
    const r = 16 + rand() * 54;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(52,58,48,${0.05 + rand() * 0.08})`);
    g.addColorStop(1, 'rgba(52,58,48,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  return finish(c);
}

export function makeMountainTexture() {
  const [c, ctx] = makeCanvas(512, 512);
  const rand = mulberry32(777);
  ctx.fillStyle = '#a9a9a7';
  ctx.fillRect(0, 0, 512, 512);

  const g = ctx.createLinearGradient(0, 0, 512, 512);
  g.addColorStop(0, 'rgba(98,102,94,0.34)');
  g.addColorStop(0.45, 'rgba(150,148,142,0.14)');
  g.addColorStop(1, 'rgba(84,89,83,0.32)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 512);

  mottle(ctx, 512, 512, rand, 210, ['#7e837b', '#9b9a93', '#8a8e85', '#b1b0a8', '#747a72', '#8c8a83'], 0.13);
  speckle(ctx, 512, 512, 7500, rand, ['#798079', '#999992', '#b2b1aa', '#858c84', '#a4a59f', '#737a74'], 0.2, 2.5);

  for (let i = 0; i < 52; i++) {
    ctx.strokeStyle = `rgba(55,56,47,${0.05 + rand() * 0.13})`;
    ctx.lineWidth = 0.8 + rand() * 2.4;
    ctx.beginPath();
    let x = rand() * 512;
    let y = rand() * 512;
    ctx.moveTo(x, y);
    for (let k = 0; k < 5; k++) {
      x += rand() * 70 - 35;
      y += 8 + rand() * 30;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  for (let i = 0; i < 36; i++) {
    ctx.strokeStyle = `rgba(214,203,176,${0.035 + rand() * 0.055})`;
    ctx.lineWidth = 1 + rand() * 3;
    ctx.beginPath();
    const y = rand() * 512;
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(150, y + rand() * 30 - 15, 350, y + rand() * 30 - 15, 512, y + rand() * 24 - 12);
    ctx.stroke();
  }
  for (let i = 0; i < 30; i++) {
    ctx.fillStyle = `rgba(66,63,51,${0.05 + rand() * 0.09})`;
    ctx.beginPath();
    ctx.ellipse(rand() * 512, rand() * 512, 4 + rand() * 16, 2 + rand() * 7, rand() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 34; i++) {
    const y = rand() * 512;
    const h = 2 + rand() * 11;
    ctx.fillStyle = rand() < 0.6 ? `rgba(70,72,62,${0.06 + rand() * 0.1})` : `rgba(196,178,142,${0.04 + rand() * 0.07})`;
    ctx.beginPath();
    ctx.moveTo(0, y + rand() * 6);
    ctx.bezierCurveTo(150, y - 6 + rand() * 12, 360, y + 4 + rand() * 8, 512, y + rand() * 8);
    ctx.lineTo(512, y + h + rand() * 5);
    ctx.bezierCurveTo(350, y + h + 6 + rand() * 10, 160, y + h - 4 + rand() * 9, 0, y + h + rand() * 4);
    ctx.closePath();
    ctx.fill();
  }
  const warm = ctx.createLinearGradient(0, 480, 512, 0);
  warm.addColorStop(0, 'rgba(230,196,146,0.09)');
  warm.addColorStop(0.55, 'rgba(230,196,146,0)');
  warm.addColorStop(1, 'rgba(84,92,88,0.12)');
  ctx.fillStyle = warm;
  ctx.fillRect(0, 0, 512, 512);
  return finish(c);
}

export function makeRoofTexture() {
  const [c, ctx] = makeCanvas(256, 256);
  const rand = mulberry32(302);
  ctx.fillStyle = '#505754';
  ctx.fillRect(0, 0, 256, 256);
  for (let x = 0; x < 256; x += 20) {
    const g = ctx.createLinearGradient(x, 0, x + 20, 0);
    g.addColorStop(0, 'rgba(18,23,22,0.42)');
    g.addColorStop(0.4, 'rgba(133,143,137,0.26)');
    g.addColorStop(1, 'rgba(15,20,19,0.48)');
    ctx.fillStyle = g;
    ctx.fillRect(x, 0, 20, 256);
  }
  for (let y = 0; y < 256; y += 19) {
    ctx.strokeStyle = 'rgba(24,30,28,0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(256, y + 0.5);
    ctx.stroke();
  }
  speckle(ctx, 256, 256, 1000, rand, ['#39423e', '#76807a', '#252c2a'], 0.14, 1.6);
  return finish(c);
}

export function makeMistTexture() {
  const [c, ctx] = makeCanvas(512, 256);
  const rand = mulberry32(55);
  ctx.clearRect(0, 0, 512, 256);
  for (let i = 0; i < 85; i++) {
    const x = rand() * 512;
    const y = 54 + rand() * 148;
    const r = 28 + rand() * 92;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const a = 0.025 + rand() * 0.055;
    g.addColorStop(0, `rgba(238,243,240,${a})`);
    g.addColorStop(1, 'rgba(238,243,240,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  for (let i = 0; i < 20; i++) {
    ctx.strokeStyle = `rgba(245,248,245,${0.02 + rand() * 0.04})`;
    ctx.lineWidth = 8 + rand() * 18;
    ctx.beginPath();
    const y = 80 + rand() * 110;
    ctx.moveTo(-40, y);
    ctx.bezierCurveTo(160, y - 22 + rand() * 44, 330, y - 28 + rand() * 50, 552, y - 10 + rand() * 20);
    ctx.stroke();
  }
  return finish(c, { repeat: true });
}

export function makeLabelTexture(title, subtitle) {
  const [c, ctx] = makeCanvas(512, 160);
  ctx.clearRect(0, 0, 512, 160);
  ctx.fillStyle = 'rgba(16,24,21,0.66)';
  const r = 8;
  const x = 10;
  const y = 28;
  const w = 492;
  const h = 104;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(207,224,213,0.4)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = 'rgba(198,218,205,0.85)';
  ctx.fillRect(32, 51, 3, 58);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#eef4ef';
  ctx.font = '600 36px "Noto Serif CJK SC", "Source Han Serif SC", "Songti SC", "SimSun", serif';
  ctx.fillText(title, 54, 74);
  if (subtitle) {
    ctx.fillStyle = 'rgba(208,222,212,0.55)';
    ctx.font = '15px "Helvetica Neue", Arial, sans-serif';
    ctx.letterSpacing = '2px';
    ctx.fillText(subtitle, 55, 108);
  }
  return finish(c, { repeat: false });
}

export function makeBannerTexture() {
  const [c, ctx] = makeCanvas(256, 128);
  const rand = mulberry32(812);
  const g = ctx.createLinearGradient(0, 0, 256, 128);
  g.addColorStop(0, '#8f2f24');
  g.addColorStop(0.5, '#a83a28');
  g.addColorStop(1, '#7c271f');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 128);
  ctx.strokeStyle = 'rgba(224,184,92,0.85)';
  ctx.lineWidth = 5;
  ctx.strokeRect(9, 9, 238, 110);
  ctx.strokeStyle = 'rgba(224,184,92,0.45)';
  ctx.lineWidth = 2;
  ctx.strokeRect(21, 20, 214, 88);
  ctx.fillStyle = 'rgba(236,205,131,0.9)';
  ctx.beginPath();
  ctx.arc(128, 62, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#7d2a20';
  ctx.font = '600 42px "Noto Serif CJK SC", "Songti SC", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('明', 128, 65);
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = `rgba(60,20,14,${0.04 + rand() * 0.07})`;
    ctx.fillRect(rand() * 256, rand() * 128, 10 + rand() * 40, 2 + rand() * 6);
  }
  return finish(c, { repeat: false });
}

export function makePlaqueTexture(text = '八达岭') {
  const [c, ctx] = makeCanvas(512, 160);
  ctx.fillStyle = '#3d3f3a';
  ctx.fillRect(0, 0, 512, 160);
  const g = ctx.createLinearGradient(0, 0, 0, 160);
  g.addColorStop(0, 'rgba(166,164,150,0.35)');
  g.addColorStop(1, 'rgba(24,26,23,0.4)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 160);
  ctx.strokeStyle = 'rgba(205,193,157,0.8)';
  ctx.lineWidth = 4;
  ctx.strokeRect(10, 10, 492, 140);
  ctx.strokeStyle = 'rgba(205,193,157,0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(22, 22, 468, 116);
  ctx.fillStyle = '#e2d6b6';
  ctx.font = '600 62px "Noto Serif CJK SC", "Songti SC", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 83);
  return finish(c, { repeat: false });
}

export function makeSignTexture() {
  const [c, ctx] = makeCanvas(512, 256);
  ctx.fillStyle = '#5b4a35';
  ctx.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 90; i++) {
    ctx.strokeStyle = `rgba(36,27,18,${0.04 + (i % 7) * 0.012})`;
    ctx.beginPath();
    const y = i * 3;
    ctx.moveTo(0, y);
    ctx.lineTo(512, y + Math.sin(i) * 2);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(214,199,160,0.5)';
  ctx.lineWidth = 3;
  ctx.strokeRect(18, 18, 476, 220);
  ctx.fillStyle = '#e6dcc2';
  ctx.font = '600 52px "Noto Serif CJK SC", "Songti SC", serif';
  ctx.textAlign = 'center';
  ctx.fillText('八达岭', 256, 88);
  ctx.font = '600 30px "Noto Serif CJK SC", "Songti SC", serif';
  ctx.fillStyle = 'rgba(230,220,194,0.85)';
  ctx.fillText('北 八 楼 · 好 汉 坡', 256, 148);
  ctx.font = '20px "Helvetica Neue", Arial, sans-serif';
  ctx.fillStyle = 'rgba(224,212,180,0.6)';
  ctx.fillText('BADALING  ·  888 M', 256, 196);
  return finish(c, { repeat: false });
}

export function makeContactTexture() {
  const [c, ctx] = makeCanvas(128, 128);
  const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  g.addColorStop(0, 'rgba(0,0,0,0.5)');
  g.addColorStop(0.45, 'rgba(0,0,0,0.26)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return finish(c, { repeat: false });
}

export const sharedTextures = {
  brick: makeBrickTexture,
  stone: makeStoneTexture,
  walkway: makeWalkwayTexture,
  mountain: makeMountainTexture,
  roof: makeRoofTexture,
  mist: makeMistTexture,
  contact: makeContactTexture,
};
