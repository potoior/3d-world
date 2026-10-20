import * as THREE from 'three';

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvas(size, h) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = h || size;
  return c;
}

function finish(c, repeatX = 1, repeatY = repeatX) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeatX, repeatY);
  t.anisotropy = 4;
  return t;
}

function shade(hex, amt) {
  const c = new THREE.Color(hex);
  c.offsetHSL(0, 0, amt);
  return '#' + c.getHexString();
}

export function sandTexture() {
  const c = canvas(512);
  const g = c.getContext('2d');
  const r = rng(81);
  const grad = g.createLinearGradient(0, 0, 512, 512);
  grad.addColorStop(0, '#d9b47c');
  grad.addColorStop(0.5, '#cfaa71');
  grad.addColorStop(1, '#dcb981');
  g.fillStyle = grad;
  g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 7000; i++) {
    const x = r() * 512;
    const y = r() * 512;
    const s = 0.4 + r() * 1.6;
    g.fillStyle = r() > 0.52 ? 'rgba(120,83,43,0.22)' : 'rgba(250,226,178,0.26)';
    g.fillRect(x, y, s, s);
  }
  for (let row = 0; row < 26; row++) {
    const y0 = row * 20 + 4;
    g.beginPath();
    for (let x = 0; x <= 512; x += 8) {
      const y = y0 + Math.sin(x * 0.055 + row * 1.7) * 4 + Math.sin(x * 0.019 + row) * 3;
      if (x === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.strokeStyle = 'rgba(118,82,44,0.17)';
    g.lineWidth = 1.3;
    g.stroke();
    g.strokeStyle = 'rgba(255,231,184,0.2)';
    g.lineWidth = 1;
    g.stroke();
  }
  for (let i = 0; i < 36; i++) {
    g.fillStyle = 'rgba(113,76,42,0.15)';
    g.beginPath();
    g.ellipse(r() * 512, r() * 512, 4 + r() * 14, 1 + r() * 3, r() * 3, 0, 6.3);
    g.fill();
  }
  return finish(c, 34);
}

export function cliffTexture() {
  const c = canvas(512);
  const g = c.getContext('2d');
  const r = rng(144);
  g.fillStyle = '#a47d57';
  g.fillRect(0, 0, 512, 512);
  const bands = ['#8e6847', '#b18a60', '#9a7350', '#c09a6c', '#7d6048', '#ad8660'];
  for (let i = 0; i < 26; i++) {
    const y = i * 20 + r() * 8;
    g.fillStyle = bands[i % bands.length];
    g.fillRect(0, y, 512, 4 + r() * 17);
    g.fillStyle = 'rgba(60,42,30,0.13)';
    g.fillRect(0, y + 15, 512, 2);
  }
  for (let i = 0; i < 1900; i++) {
    const x = r() * 512;
    const y = r() * 512;
    g.fillStyle = r() > 0.5 ? 'rgba(72,52,36,0.34)' : 'rgba(224,198,154,0.24)';
    g.beginPath();
    g.ellipse(x, y, 1 + r() * 4, 0.7 + r() * 2.2, r() * 3, 0, 6.3);
    g.fill();
  }
  for (let i = 0; i < 16; i++) {
    g.strokeStyle = 'rgba(58,42,30,0.25)';
    g.lineWidth = 1 + r();
    g.beginPath();
    let x = r() * 512;
    let y = 0;
    g.moveTo(x, y);
    while (y < 512) {
      x += (r() - 0.5) * 14;
      y += 16 + r() * 22;
      g.lineTo(x, y);
    }
    g.stroke();
  }
  return finish(c, 5, 2);
}

export function stoneTexture() {
  const c = canvas(256);
  const g = c.getContext('2d');
  const r = rng(303);
  g.fillStyle = '#9c8b72';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1700; i++) {
    g.fillStyle = r() > 0.5 ? 'rgba(60,52,41,0.25)' : 'rgba(226,213,187,0.28)';
    g.fillRect(r() * 256, r() * 256, 1 + r() * 3, 1 + r() * 3);
  }
  for (let i = 0; i < 12; i++) {
    g.strokeStyle = 'rgba(50,43,33,0.22)';
    g.beginPath();
    g.arc(r() * 256, r() * 256, 8 + r() * 30, 0, 6.3);
    g.stroke();
  }
  return finish(c, 2);
}

export function woodTexture() {
  const c = canvas(256, 512);
  const g = c.getContext('2d');
  const r = rng(512);
  g.fillStyle = '#7b4430';
  g.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 60; i++) {
    const x = r() * 256;
    g.strokeStyle = i % 3 === 0 ? 'rgba(43,20,14,0.3)' : 'rgba(177,101,64,0.23)';
    g.lineWidth = 1 + r() * 3;
    g.beginPath();
    g.moveTo(x, 0);
    for (let y = 0; y <= 512; y += 32) g.lineTo(x + Math.sin(y * 0.02 + i) * 5, y);
    g.stroke();
  }
  for (let i = 0; i < 7; i++) {
    g.strokeStyle = 'rgba(52,24,15,0.42)';
    g.beginPath();
    g.ellipse(r() * 256, r() * 512, 4 + r() * 9, 9 + r() * 22, 0, 0, 6.3);
    g.stroke();
  }
  return finish(c, 1, 2);
}

export function roofTexture() {
  const c = canvas(256);
  const g = c.getContext('2d');
  const r = rng(77);
  g.fillStyle = '#4c4238';
  g.fillRect(0, 0, 256, 256);
  for (let row = 0; row < 12; row++) {
    const y = row * 22;
    for (let col = 0; col < 12; col++) {
      const x = col * 22 + (row % 2) * 11;
      g.fillStyle = (col + row) % 3 === 0 ? '#57493b' : '#463d34';
      g.beginPath();
      g.arc(x, y + 22, 10, Math.PI, 0);
      g.fill();
      g.strokeStyle = 'rgba(28,23,19,0.5)';
      g.stroke();
    }
    g.fillStyle = 'rgba(178,146,100,0.16)';
    g.fillRect(0, y, 256, 2);
  }
  return finish(c, 3, 2);
}

export function muralTexture() {
  const c = canvas(512);
  const g = c.getContext('2d');
  const palettes = [
    ['#7d2e28', '#244f6b', '#c79a4d'],
    ['#27556a', '#8d3a2c', '#c9a45a'],
    ['#5d3260', '#a94b2f', '#d0ad63'],
    ['#2d5a4a', '#8b3b28', '#d8b268'],
  ];
  for (let p = 0; p < 4; p++) {
    const ox = (p % 2) * 256;
    const oy = Math.floor(p / 2) * 256;
    const pal = palettes[p];
    const r = rng(600 + p * 91);
    g.fillStyle = pal[0];
    g.fillRect(ox, oy, 256, 256);
    g.fillStyle = pal[2];
    g.fillRect(ox + 8, oy + 8, 240, 240);
    g.fillStyle = pal[1];
    g.fillRect(ox + 16, oy + 16, 224, 224);
    g.save();
    g.translate(ox + 128, oy + 118);
    for (let ring = 0; ring < 5; ring++) {
      g.strokeStyle = ring % 2 ? pal[2] : '#e2c98e';
      g.lineWidth = ring % 2 ? 7 : 3;
      g.beginPath();
      g.arc(0, 0, 34 + ring * 17, 0, 6.3);
      g.stroke();
    }
    g.fillStyle = '#e6cb91';
    g.beginPath();
    g.arc(0, -32, 19, 0, 6.3);
    g.fill();
    g.beginPath();
    g.ellipse(0, 8, 27, 40, 0, 0, 6.3);
    g.fill();
    g.fillStyle = pal[0];
    g.beginPath();
    g.arc(0, -38, 15, 0, 6.3);
    g.ellipse(0, 2, 21, 33, 0, 0, 6.3);
    g.fill();
    g.fillStyle = '#dfbf7a';
    g.beginPath();
    g.arc(0, 40, 24, 0, 6.3);
    g.fill();
    g.restore();
    g.strokeStyle = 'rgba(228,199,133,0.75)';
    g.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      g.beginPath();
      g.moveTo(ox + 20, oy + 24 + i * 30);
      g.lineTo(ox + 236, oy + 24 + i * 30);
      g.stroke();
    }
    for (let i = 0; i < 35; i++) {
      g.fillStyle = i % 2 ? 'rgba(230,201,139,0.7)' : 'rgba(20,26,30,0.28)';
      g.fillRect(ox + 22 + r() * 210, oy + 22 + r() * 210, 2 + r() * 4, 2 + r() * 4);
    }
    g.fillStyle = 'rgba(28,18,12,0.34)';
    g.fillRect(ox + 5, oy + 5, 246, 6);
    g.fillRect(ox + 5, oy + 245, 246, 6);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function foliageTexture() {
  const c = canvas(256);
  const g = c.getContext('2d');
  const r = rng(919);
  g.fillStyle = '#8b6a24';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2400; i++) {
    const x = r() * 256;
    const y = r() * 256;
    const s = 1 + r() * 5;
    const tones = ['#d9a832', '#e7bd45', '#b98524', '#f0cd64', '#96701f'];
    g.fillStyle = tones[(r() * tones.length) | 0];
    g.globalAlpha = 0.4 + r() * 0.55;
    g.beginPath();
    g.ellipse(x, y, s, s * (0.4 + r() * 0.5), r() * 3, 0, 6.3);
    g.fill();
  }
  g.globalAlpha = 1;
  return finish(c, 2);
}

export function leafCardTexture() {
  const c = canvas(128);
  const g = c.getContext('2d');
  const r = rng(451);
  g.clearRect(0, 0, 128, 128);
  for (let i = 0; i < 34; i++) {
    const x = 18 + r() * 92;
    const y = 16 + r() * 96;
    const a = r() * 6.3;
    const s = 6 + r() * 10;
    g.save();
    g.translate(x, y);
    g.rotate(a);
    g.fillStyle = ['#e2b53c', '#f0cc5c', '#c89627', '#d9a62f'][(r() * 4) | 0];
    g.beginPath();
    g.ellipse(0, 0, s, s * 0.55, 0, 0, 6.3);
    g.fill();
    g.restore();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function reedTexture() {
  const c = canvas(128, 256);
  const g = c.getContext('2d');
  const r = rng(812);
  g.clearRect(0, 0, 128, 256);
  for (let i = 0; i < 26; i++) {
    const x = 8 + r() * 112;
    const h = 100 + r() * 145;
    const sway = (r() - 0.5) * 22;
    g.strokeStyle = ['#9b8a4f', '#b5a363', '#7e743f', '#c2ad6d'][(r() * 4) | 0];
    g.lineWidth = 1 + r() * 1.6;
    g.beginPath();
    g.moveTo(x, 256);
    g.quadraticCurveTo(x + sway * 0.4, 256 - h * 0.55, x + sway, 256 - h);
    g.stroke();
    if (r() > 0.45) {
      g.fillStyle = '#b7a066';
      g.beginPath();
      g.ellipse(x + sway, 256 - h, 2 + r() * 3, 6 + r() * 9, sway * 0.02, 0, 6.3);
      g.fill();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function smokeTexture() {
  const c = canvas(128);
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 2, 64, 64, 62);
  grad.addColorStop(0, 'rgba(255,255,255,0.82)');
  grad.addColorStop(0.35, 'rgba(240,236,228,0.4)');
  grad.addColorStop(1, 'rgba(240,236,228,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function dotTexture() {
  const c = canvas(64);
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 30);
  grad.addColorStop(0, 'rgba(255,240,205,1)');
  grad.addColorStop(0.3, 'rgba(240,214,160,0.7)');
  grad.addColorStop(1, 'rgba(240,214,160,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

export function glowTexture() {
  const c = canvas(128);
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 1, 64, 64, 62);
  grad.addColorStop(0, 'rgba(255,222,150,0.95)');
  grad.addColorStop(0.25, 'rgba(255,168,82,0.55)');
  grad.addColorStop(0.6, 'rgba(255,130,60,0.16)');
  grad.addColorStop(1, 'rgba(255,120,50,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
