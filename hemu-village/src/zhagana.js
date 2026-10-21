import * as THREE from 'three';
import { mergeStaticGroup } from './geometry.js';
import { makeWaterMaterial } from './materials.js';

function rand(seed, n) {
  const x = Math.sin(seed * 127.1 + n * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function smoothstep(a, b, x) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function makeGrassTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 512, 512);
  grad.addColorStop(0, '#71874c');
  grad.addColorStop(0.42, '#7d9254');
  grad.addColorStop(0.72, '#6b8348');
  grad.addColorStop(1, '#7b8d4f');
  g.fillStyle = grad;
  g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 11000; i++) {
    const x = rand(3, i) * 512;
    const y = rand(7, i) * 512;
    const l = 1 + rand(11, i) * 4.5;
    const tone = rand(13, i);
    g.strokeStyle = tone > 0.7 ? 'rgba(174,178,106,0.3)' : tone > 0.38 ? 'rgba(67,88,42,0.33)' : 'rgba(125,143,78,0.22)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + (rand(17, i) - 0.5) * 2.4, y - l);
    g.stroke();
  }
  for (let i = 0; i < 320; i++) {
    g.fillStyle = rand(19, i) > 0.55 ? 'rgba(196,178,102,0.2)' : 'rgba(228,227,206,0.15)';
    g.beginPath();
    g.arc(rand(23, i) * 512, rand(29, i) * 512, 0.6 + rand(31, i) * 1.6, 0, 6.28);
    g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(120, 120);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function makeMistTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(128, 128, 4, 128, 128, 126);
  grad.addColorStop(0, 'rgba(255,255,255,0.5)');
  grad.addColorStop(0.45, 'rgba(250,252,250,0.26)');
  grad.addColorStop(0.72, 'rgba(242,246,244,0.08)');
  grad.addColorStop(1, 'rgba(240,244,242,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 26; i++) {
    const x = 60 + rand(41, i) * 136;
    const y = 60 + rand(43, i) * 136;
    const r = 16 + rand(47, i) * 38;
    const soft = g.createRadialGradient(x, y, 0, x, y, r);
    soft.addColorStop(0, 'rgba(255,255,255,0.09)');
    soft.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = soft;
    g.beginPath();
    g.arc(x, y, r, 0, 6.28);
    g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeSignTexture(title, sub) {
  const c = document.createElement('canvas');
  c.width = 640;
  c.height = 320;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 320);
  grad.addColorStop(0, '#513c29');
  grad.addColorStop(0.5, '#3f2f21');
  grad.addColorStop(1, '#59422d');
  g.fillStyle = grad;
  g.fillRect(0, 0, 640, 320);
  for (let i = 0; i < 140; i++) {
    g.strokeStyle = 'rgba(28,20,13,' + (0.08 + rand(3, i) * 0.16) + ')';
    g.lineWidth = 1 + rand(5, i) * 2.5;
    g.beginPath();
    const y = rand(7, i) * 320;
    g.moveTo(0, y);
    g.bezierCurveTo(180, y + rand(9, i) * 16, 460, y - rand(11, i) * 14, 640, y + rand(13, i) * 8);
    g.stroke();
  }
  g.strokeStyle = 'rgba(190,158,100,0.5)';
  g.lineWidth = 5;
  g.strokeRect(18, 18, 604, 284);
  g.textAlign = 'center';
  g.fillStyle = '#eadfc6';
  g.font = '600 94px "Noto Serif CJK SC", "Songti SC", serif';
  g.fillText(title, 320, 156);
  g.fillStyle = 'rgba(214,196,158,0.78)';
  g.font = '30px "Helvetica Neue", Arial, sans-serif';
  g.fillText(sub, 320, 228);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function addBoxMesh(group, w, h, d, x, y, z, mat, ry = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  if (ry) mesh.rotation.y = ry;
  group.add(mesh);
  return mesh;
}

function addCylinderMesh(group, rt, rb, h, seg, x, y, z, mat, rx = 0, rz = 0) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  mesh.position.set(x, y, z);
  mesh.rotation.x = rx;
  mesh.rotation.z = rz;
  group.add(mesh);
  return mesh;
}

function addBarMesh(group, ax, az, bx, bz, y, h, t, mat) {
  const dx = bx - ax;
  const dz = bz - az;
  const len = Math.hypot(dx, dz);
  if (len < 0.001) return null;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(t, h, len), mat);
  mesh.position.set((ax + bx) / 2, y, (az + bz) / 2);
  mesh.rotation.y = Math.atan2(dx, dz);
  group.add(mesh);
  return mesh;
}

function buildMaterials() {
  const grassTex = makeGrassTexture();
  const rockA = new THREE.MeshStandardMaterial({ color: 0x7b807d, roughness: 0.96, metalness: 0.02, flatShading: true });
  const rockB = new THREE.MeshStandardMaterial({ color: 0x8b8f89, roughness: 0.97, metalness: 0.02, flatShading: true });
  const rockC = new THREE.MeshStandardMaterial({ color: 0x646c6d, roughness: 0.94, metalness: 0.03, flatShading: true });
  const rockD = new THREE.MeshStandardMaterial({ color: 0x9aa099, roughness: 0.98, metalness: 0.01, flatShading: true });
  const snow = new THREE.MeshStandardMaterial({ color: 0xd7dbd6, roughness: 0.86, metalness: 0.0, flatShading: true });
  return {
    grass: new THREE.MeshStandardMaterial({ map: grassTex, color: 0xffffff, roughness: 0.98, metalness: 0 }),
    fieldGreen: new THREE.MeshStandardMaterial({ color: 0x81954c, roughness: 0.98, metalness: 0 }),
    fieldGold: new THREE.MeshStandardMaterial({ color: 0xa9934f, roughness: 0.98, metalness: 0 }),
    fieldDark: new THREE.MeshStandardMaterial({ color: 0x5c6f3b, roughness: 1, metalness: 0 }),
    earth: new THREE.MeshStandardMaterial({ color: 0x8b7a5d, roughness: 1, metalness: 0 }),
    stone: new THREE.MeshStandardMaterial({ color: 0x8d8a80, roughness: 0.95, metalness: 0.02 }),
    stoneDark: new THREE.MeshStandardMaterial({ color: 0x67655e, roughness: 0.98, metalness: 0.02 }),
    stoneLight: new THREE.MeshStandardMaterial({ color: 0xb2aea2, roughness: 0.93, metalness: 0.02 }),
    wall: new THREE.MeshStandardMaterial({ color: 0xd6cdb8, roughness: 0.94, metalness: 0.0 }),
    wallWarm: new THREE.MeshStandardMaterial({ color: 0xc9b99e, roughness: 0.94, metalness: 0.0 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x5a3f2b, roughness: 0.9, metalness: 0.03 }),
    woodLight: new THREE.MeshStandardMaterial({ color: 0x86603d, roughness: 0.9, metalness: 0.02 }),
    woodDark: new THREE.MeshStandardMaterial({ color: 0x3b2b1f, roughness: 0.92, metalness: 0.02 }),
    window: new THREE.MeshStandardMaterial({ color: 0x22211d, roughness: 0.72, metalness: 0.05 }),
    red: new THREE.MeshStandardMaterial({ color: 0x9e3f2c, roughness: 0.9, metalness: 0.0 }),
    blue: new THREE.MeshStandardMaterial({ color: 0x345d93, roughness: 0.9, metalness: 0.0 }),
    yellow: new THREE.MeshStandardMaterial({ color: 0xc5a23c, roughness: 0.9, metalness: 0.0 }),
    white: new THREE.MeshStandardMaterial({ color: 0xe9e5d9, roughness: 0.92, metalness: 0.0 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xb18e45, roughness: 0.58, metalness: 0.35 }),
    barley: new THREE.MeshStandardMaterial({ color: 0xc4a758, roughness: 0.95, metalness: 0.0 }),
    bark: new THREE.MeshStandardMaterial({ color: 0x4f4032, roughness: 0.98, metalness: 0.0 }),
    pine: new THREE.MeshStandardMaterial({ color: 0x2f4b36, roughness: 0.98, metalness: 0.0 }),
    pineLight: new THREE.MeshStandardMaterial({ color: 0x3f5b3b, roughness: 0.98, metalness: 0.0 }),
    golden: new THREE.MeshStandardMaterial({ color: 0xb08a3e, roughness: 0.96, metalness: 0.0 }),
    rockA, rockB, rockC, rockD, snow,
    flagRed: new THREE.MeshStandardMaterial({ color: 0xc4432d, roughness: 0.9, metalness: 0, side: THREE.DoubleSide }),
    flagBlue: new THREE.MeshStandardMaterial({ color: 0x3569a5, roughness: 0.9, metalness: 0, side: THREE.DoubleSide }),
    flagYellow: new THREE.MeshStandardMaterial({ color: 0xd3b348, roughness: 0.9, metalness: 0, side: THREE.DoubleSide }),
    flagGreen: new THREE.MeshStandardMaterial({ color: 0x3f7a51, roughness: 0.9, metalness: 0, side: THREE.DoubleSide }),
    flagWhite: new THREE.MeshStandardMaterial({ color: 0xe8e4d6, roughness: 0.9, metalness: 0, side: THREE.DoubleSide }),
  };
}

function terrainHeight(x, z) {
  const d = Math.sqrt((x / 225) ** 2 + (z / 325) ** 2);
  const rise = smoothstep(1.02, 1.9, d);
  const ripple = Math.sin(x * 0.018 + z * 0.011) * 9 + Math.cos(x * 0.007 - z * 0.016) * 7;
  return rise * (66 + ripple) + smoothstep(1.2, 1.7, d) * Math.sin(x * 0.05) * 4;
}

function createTerrain(mats) {
  const geo = new THREE.PlaneGeometry(1080, 1180, 84, 92);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setY(i, terrainHeight(pos.getX(i), pos.getZ(i)));
  }
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mats.grass);
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  return mesh;
}

function createPeak({ x, z, r, h, seed, mat, snow = 0, tilt = 0 }, snowMat) {
  const geo = new THREE.ConeGeometry(r, h, 10, 9, false);
  geo.translate(0, h / 2, 0);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    let px = pos.getX(i);
    let py = pos.getY(i);
    let pz = pos.getZ(i);
    const t = Math.max(0, Math.min(1, py / h));
    const a = Math.atan2(pz, px);
    const wobble =
      1 +
      0.2 * Math.sin(a * 4 + seed * 1.7) * (1 - t * 0.3) +
      0.12 * Math.sin(a * 9 - seed * 0.9) * (1 - t * 0.6) +
      0.06 * Math.cos(a * 15 + seed * 2.2);
    px *= wobble;
    pz *= wobble;
    const ridge = Math.sin(py * 0.045 + seed * 2.1) * r * 0.045;
    px += ridge;
    pz += ridge * 0.72;
    py += Math.sin(a * 5 + seed) * h * 0.016 * (1 - t);
    pos.setXYZ(i, px, py, pz);
  }
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, -2, z);
  mesh.rotation.y = seed * 0.7;
  mesh.rotation.z = tilt;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  if (snow) {
    const cap = new THREE.Mesh(new THREE.ConeGeometry(r * 0.36, h * 0.2, 8, 4, false), snowMat);
    cap.position.set(x, h * 0.86, z);
    cap.rotation.y = seed;
    cap.castShadow = true;
    return [mesh, cap];
  }
  return [mesh];
}

function createMountains(root, mats) {
  const rockMats = [mats.rockA, mats.rockB, mats.rockC, mats.rockD];
  const big = [
    [-150, 585, 245, 372, 1.2, 1], [85, 620, 220, 338, 2.4, 1],
    [-330, 500, 185, 292, 3.1, 1], [290, 515, 198, 306, 4.2, 1],
    [-455, 330, 170, 246, 5.1, 0], [-470, 80, 165, 232, 6.3, 0],
    [-405, -175, 150, 198, 7.2, 0], [445, 340, 172, 252, 8.1, 0],
    [470, 90, 166, 238, 9.4, 0], [420, -190, 148, 192, 10.6, 0],
    [-245, 250, 118, 164, 11.2, 0], [235, 262, 122, 172, 12.7, 0],
    [-265, 30, 104, 136, 13.5, 0], [272, 20, 108, 146, 14.8, 0],
  ];
  const satellites = [
    [-210, 470, 92, 178, 21], [-60, 505, 100, 206, 22], [185, 520, 96, 190, 23],
    [-390, 205, 82, 152, 24], [385, 205, 86, 158, 25], [-365, -60, 78, 140, 26],
    [378, -70, 80, 144, 27], [-290, 370, 96, 180, 28], [255, 390, 98, 184, 29],
    [-520, 190, 90, 160, 30], [520, 210, 92, 166, 31], [-505, -30, 82, 146, 32],
    [505, -20, 84, 150, 33], [0, 690, 150, 300, 34], [-150, 700, 130, 260, 35],
    [160, 705, 136, 268, 36], [-325, -260, 88, 130, 37], [330, -270, 86, 128, 38],
  ];
  const crags = [
    [-120, 300, 54, 92, 41], [75, 322, 58, 100, 42], [-210, 190, 46, 78, 43],
    [205, 210, 48, 82, 44], [-80, 438, 62, 116, 45], [120, 452, 64, 120, 46],
  ];
  big.forEach(([x, z, r, h, seed, snowy], i) => {
    const mat = rockMats[i % rockMats.length];
    createPeak({ x, z, r, h, seed, mat, snow: snowy, tilt: (rand(seed, 4) - 0.5) * 0.05 }, mats.snow).forEach((m) => root.add(m));
  });
  satellites.forEach(([x, z, r, h, seed], i) => {
    const mat = rockMats[(i + 1) % rockMats.length];
    createPeak({ x, z, r, h, seed, mat, snow: 0 }, mats.snow).forEach((m) => root.add(m));
  });
  crags.forEach(([x, z, r, h, seed]) => {
    createPeak({ x, z, r, h, seed, mat: mats.rockC, snow: 0 }, mats.snow).forEach((m) => root.add(m));
  });
}

function createHouse(root, mats, { x, z, rot = 0, w = 8, d = 7, h = 3.1, floors = 1, seed = 1, warm = false }) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rot;
  addBoxMesh(group, w, 0.5, d, 0, 0.25, 0, mats.stoneDark);
  addBoxMesh(group, w, h, d, 0, 0.5 + h / 2, 0, warm ? mats.wallWarm : mats.wall);
  const stoneBand = 0.8 + rand(seed, 3) * 0.4;
  addBoxMesh(group, w + 0.16, stoneBand, d + 0.16, 0, 0.5 + stoneBand / 2, 0, mats.stone);
  addBoxMesh(group, w + 0.22, 0.34, d + 0.22, 0, 0.5 + h * 0.62, 0, mats.wood);

  let roofY = 0.5 + h;
  let topW = w;
  let topD = d;
  if (floors > 1) {
    topW = w * 0.9;
    topD = d * 0.88;
    addBoxMesh(group, topW, h * 0.82, topD, 0, roofY + h * 0.41, 0, mats.woodLight);
    addBoxMesh(group, topW + 0.2, 0.26, topD + 0.2, 0, roofY + h * 0.82, 0, mats.wood);
    roofY += h * 0.82;
  }

  addBoxMesh(group, topW + 0.9, 0.3, topD + 0.9, 0, roofY + 0.15, 0, mats.woodDark);
  addBoxMesh(group, topW + 0.5, 0.16, topD + 0.5, 0, roofY + 0.38, 0, mats.earth);

  const parapetH = 0.52;
  addBoxMesh(group, topW + 0.9, parapetH, 0.24, 0, roofY + 0.3 + parapetH / 2, -(topD + 0.7) / 2, mats.wall);
  addBoxMesh(group, topW + 0.9, parapetH, 0.24, 0, roofY + 0.3 + parapetH / 2, (topD + 0.7) / 2, mats.wall);
  addBoxMesh(group, 0.24, parapetH, topD + 0.7, -(topW + 0.7) / 2, roofY + 0.3 + parapetH / 2, 0, mats.wall);
  addBoxMesh(group, 0.24, parapetH, topD + 0.7, (topW + 0.7) / 2, roofY + 0.3 + parapetH / 2, 0, mats.wall);

  for (let i = 0; i < 5; i++) {
    const bx = -topW / 2 + (i + 0.5) * (topW / 5);
    addBoxMesh(group, 0.18, 0.18, topD + 1.45, bx, roofY + 0.02, 0, mats.wood);
  }

  const front = -d / 2 - 0.06;
  const winY = 0.5 + h * 0.7;
  const trim = [mats.red, mats.white, mats.blue][Math.floor(rand(seed, 8) * 3)];
  for (let i = 0; i < 2; i++) {
    const wx = (i === 0 ? -1 : 1) * w * 0.24;
    addBoxMesh(group, 1.5, 1.35, 0.18, wx, winY, front, mats.window);
    addBoxMesh(group, 1.8, 0.22, 0.34, wx, winY + 0.78, front - 0.06, trim);
    addBoxMesh(group, 1.8, 0.18, 0.3, wx, winY - 0.78, front - 0.05, mats.woodDark);
    addBoxMesh(group, 0.18, 1.5, 0.32, wx - 0.88, winY, front - 0.04, mats.woodDark);
    addBoxMesh(group, 0.18, 1.5, 0.32, wx + 0.88, winY, front - 0.04, mats.woodDark);
    addBoxMesh(group, 0.08, 1.2, 0.2, wx, winY, front - 0.11, mats.woodLight);
  }
  addBoxMesh(group, 1.2, 2.1, 0.18, 0, 1.45, front, mats.woodDark);
  addBoxMesh(group, 1.7, 0.24, 0.4, 0, 2.62, front - 0.08, trim);
  addBoxMesh(group, 0.18, 2.3, 0.34, -0.72, 1.45, front - 0.05, mats.wood);
  addBoxMesh(group, 0.18, 2.3, 0.34, 0.72, 1.45, front - 0.05, mats.wood);

  if (floors > 1) {
    for (let i = 0; i < 2; i++) {
      const wx = (i === 0 ? -1 : 1) * topW * 0.26;
      addBoxMesh(group, 1.25, 1.0, 0.16, wx, roofY - h * 0.32, -topD / 2 - 0.05, mats.window);
      addBoxMesh(group, 1.5, 0.18, 0.28, wx, roofY - h * 0.32 + 0.6, -topD / 2 - 0.1, trim);
    }
  }

  const sideWin = w / 2 + 0.05;
  addBoxMesh(group, 0.16, 1.0, 1.15, sideWin, winY, 0, mats.window);
  addBoxMesh(group, 0.3, 0.18, 1.4, sideWin + 0.04, winY + 0.6, 0, trim);

  if (rand(seed, 12) > 0.55) {
    addBoxMesh(group, 0.62, 1.7, 0.62, topW * 0.28, roofY + 1.1, topD * 0.24, mats.stone);
    addBoxMesh(group, 0.86, 0.16, 0.86, topW * 0.28, roofY + 1.95, topD * 0.24, mats.stoneDark);
  }
  root.add(group);
}

function createVillage(root, mats) {
  const houses = [
    [-82, 58, 0.08, 8.4, 7.2, 3.1, 1, 11], [-64, 92, -0.1, 7.6, 6.8, 3.0, 1, 12],
    [-92, 118, 0.12, 9.0, 7.6, 3.3, 2, 13], [-56, 134, 0.04, 8.0, 7.0, 3.2, 1, 14],
    [-74, 168, -0.12, 8.6, 7.4, 3.0, 1, 15], [-38, 186, 0.1, 7.4, 6.6, 3.0, 1, 16],
    [34, 60, -0.06, 8.2, 7.0, 3.1, 1, 17], [62, 88, 0.1, 9.2, 7.8, 3.3, 2, 18],
    [90, 112, -0.08, 7.8, 6.8, 3.0, 1, 19], [46, 118, 0.06, 8.4, 7.2, 3.2, 1, 20],
    [72, 146, -0.1, 8.8, 7.4, 3.1, 1, 21], [106, 154, 0.12, 8.0, 6.9, 3.0, 1, 22],
    [32, 170, 0.04, 7.6, 6.7, 3.1, 1, 23], [-24, 214, -0.05, 9.4, 8.0, 3.4, 2, 24],
    [12, 230, 0.08, 8.2, 7.1, 3.1, 1, 25], [50, 210, -0.08, 7.8, 6.8, 3.0, 1, 26],
  ];
  houses.forEach(([x, z, rot, w, d, h, floors, seed]) => {
    createHouse(root, mats, { x, z, rot, w, d, h, floors, seed, warm: seed % 3 === 0 });
  });
  const stone = [
    [-16, 76, 0.9], [-2, 96, 0.7], [-20, 150, 1.1], [18, 132, 0.8],
    [58, 44, 0.6], [-46, 38, 0.8], [20, 40, 0.5], [-100, 84, 0.9],
  ];
  stone.forEach(([x, z, s]) => {
    addBoxMesh(root, 1.6 * s, 0.7 * s, 1.1 * s, x, 0.35 * s, z, mats.stone, rand(x, z) * 3);
    addBoxMesh(root, 1.0 * s, 0.5 * s, 0.8 * s, x + 0.3, 0.85 * s, z + 0.2, mats.stoneLight, rand(z, x) * 3);
    addBoxMesh(root, 0.5 * s, 0.7 * s, 0.6 * s, x + 0.7, 0.9 * s, z - 0.5, mats.stoneDark, rand(x + z, 2) * 3);
  });
}

function createStupas(root, mats) {
  const spots = [[-24, 48, 1], [22, 92, 0.85], [-48, 112, 0.9]];
  spots.forEach(([x, z, s]) => {
    addBoxMesh(root, 3.6 * s, 0.7 * s, 3.6 * s, x, 0.35 * s, z, mats.stoneLight);
    addBoxMesh(root, 2.6 * s, 1.3 * s, 2.6 * s, x, 1.25 * s, z, mats.white);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1.25 * s, 12, 8), mats.white);
    dome.position.set(x, 2.25 * s, z);
    dome.scale.y = 0.9;
    root.add(dome);
    addCylinderMesh(root, 0.26 * s, 0.36 * s, 1.2 * s, 8, x, 3.4 * s, z, mats.white);
    addCylinderMesh(root, 0.05 * s, 0.24 * s, 1.5 * s, 6, x, 4.5 * s, z, mats.gold);
    addCylinderMesh(root, 0.1 * s, 0.16 * s, 0.34 * s, 8, x, 5.35 * s, z, mats.gold);
  });
}

function createConifer(root, mats, x, z, scale, seed) {
  addCylinderMesh(root, 0.16 * scale, 0.26 * scale, 2.4 * scale, 6, x, 1.2 * scale, z, mats.bark);
  const layers = 3;
  for (let i = 0; i < layers; i++) {
    const r = (2.3 - i * 0.52) * scale;
    const h = (3.4 - i * 0.55) * scale;
    const y = (2.4 + i * 1.65) * scale;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), i % 2 ? mats.pineLight : mats.pine);
    cone.position.set(x + (rand(seed, i) - 0.5) * 0.3 * scale, y + h / 2, z + (rand(seed + 3, i) - 0.5) * 0.3 * scale);
    cone.rotation.y = rand(seed + i, 7) * 3;
    cone.castShadow = true;
    cone.receiveShadow = true;
    root.add(cone);
  }
}

function createGoldenTree(root, mats, x, z, scale, seed) {
  addCylinderMesh(root, 0.18 * scale, 0.32 * scale, 3.4 * scale, 6, x, 1.7 * scale, z, mats.bark);
  const crown = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const blob = new THREE.Mesh(new THREE.IcosahedronGeometry((1.0 + rand(seed, i) * 0.7) * scale, 1), mats.golden);
    blob.position.set((rand(seed + 2, i) - 0.5) * 2.2 * scale, (3.0 + rand(seed + 4, i) * 1.9) * scale, (rand(seed + 6, i) - 0.5) * 2.0 * scale);
    blob.scale.y = 0.82;
    blob.castShadow = true;
    crown.add(blob);
  }
  crown.position.set(x, 0, z);
  root.add(crown);
}

function createForest(root, mats) {
  const trees = [];
  for (let i = 0; i < 150; i++) {
    const a = rand(71, i) * Math.PI * 2;
    const r = 245 + rand(73, i) * 150;
    const x = Math.cos(a) * r * 0.92;
    const z = Math.sin(a) * r + 30;
    if (z < -250) continue;
    const scale = 0.75 + rand(79, i) * 0.9;
    trees.push([x, z, scale, 100 + i]);
  }
  for (let i = 0; i < 34; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const x = side * (140 + rand(83, i) * 90);
    const z = -140 + rand(89, i) * 300;
    trees.push([x, z, 0.7 + rand(97, i) * 0.65, 300 + i]);
  }
  trees.forEach(([x, z, s, seed]) => createConifer(root, mats, x, z, s, seed));
  const golden = [
    [-104, 46, 1.2], [-98, 146, 1.0], [-22, 36, 1.1], [24, 46, 0.95],
    [122, 78, 1.05], [118, 170, 1.0], [-116, 92, 0.9], [80, 186, 1.1],
    [-8, 248, 1.15], [66, 34, 0.9], [-118, 196, 1.0],
  ];
  golden.forEach(([x, z, s], i) => createGoldenTree(root, mats, x, z, s, 500 + i));
}

function createTerraces(root, mats) {
  const count = 5;
  for (let i = 0; i < count; i++) {
    const x0 = 118 + i * 27;
    const y = i * 1.65;
    const zc = 40;
    const len = 210 - i * 6;
    const width = 27;
    const mat = i % 3 === 0 ? mats.fieldGold : i % 3 === 1 ? mats.fieldGreen : mats.fieldDark;
    addBoxMesh(root, width, 1.65, len, x0 + width / 2, y - 0.825, zc, mats.earth);
    addBoxMesh(root, width - 1.2, 0.32, len - 2, x0 + width / 2, y + 0.02, zc, mat);
    addBoxMesh(root, 0.7, 2.0, len, x0, y - 0.5, zc, mats.stone);
    for (let k = -8; k <= 8; k++) {
      addBoxMesh(root, width - 2.4, 0.09, 0.34, x0 + width / 2, y + 0.2, zc + k * 12, mats.earth, 0.03);
    }
    for (let k = 0; k < 7; k++) {
      const bx = x0 + 2.5 + rand(i * 10 + k, 3) * (width - 5);
      const bz = zc - len / 2 + 14 + rand(i * 10 + k, 5) * (len - 28);
      addCylinderMesh(root, 0.05, 0.08, 0.9, 5, bx, y + 0.6, bz, mats.barley);
      addCylinderMesh(root, 0.03, 0.08, 0.55, 5, bx + 0.05, y + 1.18, bz, mats.barley);
    }
  }
  for (let i = 0; i < 3; i++) {
    const z = -52 + i * 78;
    addBarMesh(root, 112, z, 260, z + 8, 0.5, 1.0, 0.55, mats.earth);
  }
}

function createRacks(root, mats) {
  const racks = [
    [100, 22, 0.3], [108, 34, 0.5], [126, 96, -0.2], [116, 116, 0.15],
    [-96, 76, 0.4], [-88, 96, -0.3], [18, 196, 0.2], [-30, 176, -0.15],
  ];
  racks.forEach(([x, z, rot], i) => {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = rot;
    addCylinderMesh(g, 0.11, 0.16, 4.4, 6, -1.3, 2.2, -1.1, mats.wood, 0.32, 0.28);
    addCylinderMesh(g, 0.11, 0.16, 4.4, 6, 1.3, 2.2, -1.1, mats.wood, -0.32, -0.28);
    addCylinderMesh(g, 0.11, 0.16, 4.4, 6, -1.3, 2.2, 1.1, mats.wood, -0.32, 0.28);
    addCylinderMesh(g, 0.11, 0.16, 4.4, 6, 1.3, 2.2, 1.1, mats.wood, 0.32, -0.28);
    addBarMesh(g, -2.4, -1.1, 2.4, -1.1, 3.9, 0.22, 0.22, mats.woodLight);
    addBarMesh(g, -2.4, 1.1, 2.4, 1.1, 3.9, 0.22, 0.22, mats.woodLight);
    for (let k = -3; k <= 3; k++) {
      const bx = k * 0.66;
      addCylinderMesh(g, 0.03, 0.05, 0.7, 4, bx, 3.42, -1.1, mats.woodDark);
      const bundle = new THREE.Mesh(new THREE.ConeGeometry(0.26, 1.3, 6), mats.barley);
      bundle.position.set(bx, 2.85, -1.1);
      bundle.rotation.z = Math.PI;
      g.add(bundle);
      addCylinderMesh(g, 0.03, 0.05, 0.7, 4, bx, 3.42, 1.1, mats.woodDark);
      const bundle2 = new THREE.Mesh(new THREE.ConeGeometry(0.24, 1.2, 6), mats.barley);
      bundle2.position.set(bx, 2.9, 1.1);
      bundle2.rotation.z = Math.PI;
      g.add(bundle2);
    }
    root.add(g);
  });
}

function createSign(root, mats, title, sub, x, z, rot, scale = 1) {
  const tex = makeSignTexture(title, sub);
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, metalness: 0.02, side: THREE.DoubleSide });
  const board = new THREE.Mesh(new THREE.PlaneGeometry(8 * scale, 4 * scale), mat);
  board.position.set(x, 5.6 * scale, z);
  board.rotation.y = rot;
  root.add(board);
  addCylinderMesh(root, 0.18, 0.24, 4.0 * scale, 6, x - 2.7 * scale, 2.0 * scale, z + 0.4, mats.wood);
  addCylinderMesh(root, 0.18, 0.24, 4.0 * scale, 6, x + 2.7 * scale, 2.0 * scale, z + 0.4, mats.wood);
  addBarMesh(root, x - 3.4 * scale, z + 0.4, x + 3.4 * scale, z + 0.4, 3.6 * scale, 0.22, 0.22, mats.woodDark);
}

function makeFlagLines() {
  return [
    [-86, 44, 24, 44, 7.2, 0.5], [-84, 96, 30, 96, 8.4, 1.4],
    [-76, 150, 34, 152, 7.8, 2.2], [26, 48, 84, 48, 7.0, 3.1],
    [30, 126, 92, 126, 8.6, 4.0], [-14, 196, 62, 198, 8.0, 4.8],
    [-48, 22, 12, -6, 6.2, 5.6], [8, -48, 58, -70, 5.8, 6.4],
  ];
}

function createPrayerFlags(root, mats) {
  const lines = makeFlagLines();
  const group = new THREE.Group();
  const flags = [];
  const colors = [0xc4432d, 0x3569a5, 0xd3b348, 0x3f7a51, 0xe8e4d6];
  const poleMat = mats.wood;
  lines.forEach(([ax, az, bx, bz, baseY, phase], li) => {
    addCylinderMesh(root, 0.1, 0.16, baseY + 1.2, 6, ax, (baseY + 1.2) / 2, az, poleMat);
    addCylinderMesh(root, 0.1, 0.16, baseY + 1.2, 6, bx, (baseY + 1.2) / 2, bz, poleMat);
    addCylinderMesh(root, 0.04, 0.08, 0.5, 5, ax, baseY + 1.35, az, mats.gold);
    addCylinderMesh(root, 0.04, 0.08, 0.5, 5, bx, baseY + 1.35, bz, mats.gold);
    const n = 15;
    const angle = Math.atan2(-(bz - az), bx - ax);
    for (let i = 0; i < n; i++) {
      const t = (i + 1) / (n + 1);
      const x = ax + (bx - ax) * t;
      const z = az + (bz - az) * t;
      const sag = Math.sin(t * Math.PI) * 1.1;
      const y = baseY - sag - 0.34;
      flags.push({ x, y, z, angle, phase: phase + i * 0.62, color: colors[(i + li) % colors.length] });
    }
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(ax, baseY, az),
      new THREE.Vector3((ax + bx) / 2, baseY - 1.1, (az + bz) / 2),
      new THREE.Vector3(bx, baseY, bz),
    ]);
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x584a38, transparent: true, opacity: 0.6 }));
    group.add(line);
  });

  const geo = new THREE.PlaneGeometry(0.5, 0.68, 1, 2);
  const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0, side: THREE.DoubleSide });
  const mesh = new THREE.InstancedMesh(geo, material, flags.length);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  const dummy = new THREE.Object3D();
  const tint = new THREE.Color();
  flags.forEach((flag, i) => {
    dummy.position.set(flag.x, flag.y, flag.z);
    dummy.rotation.set(0, flag.angle, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    mesh.setColorAt(i, tint.setHex(flag.color));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  group.add(mesh);
  return { group, flags, mesh };
}

function makeRibbon(points, width, y, mat) {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, z]) => new THREE.Vector3(x, y, z)), false, 'catmullrom', 0.28);
  const n = 190;
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p = curve.getPoint(t);
    const tangent = curve.getTangent(t);
    const half = (width * (0.72 + 0.28 * Math.sin(t * Math.PI))) / 2;
    const nx = -tangent.z;
    const nz = tangent.x;
    positions.push(p.x + nx * half, y, p.z + nz * half);
    positions.push(p.x - nx * half, y, p.z - nz * half);
    uvs.push(0, t * 24, 1, t * 24);
    if (i < n) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, mat);
}

const STREAM_POINTS = [
  [28, 330], [16, 286], [4, 238], [-6, 194], [-12, 150], [-10, 108],
  [-4, 66], [4, 24], [6, -18], [0, -62], [-10, -108], [-20, -158],
  [-28, -212], [-34, -268], [-38, -322],
];

const PATH_POINTS = [
  [72, -206], [58, -166], [30, -138], [8, -110], [-4, -70], [-2, -20],
  [10, 24], [22, 62], [20, 104], [10, 150], [-6, 194], [-12, 236],
];

function createStream(mats) {
  const water = makeWaterMaterial();
  water.uniforms.uDeep.value.set(0x2b5c55);
  water.uniforms.uShallow.value.set(0x7fb1a0);
  water.uniforms.uSky.value.set(0xd6e6e2);
  water.userData.day = { deep: 0x2b5c55, shallow: 0x7fb1a0, sky: 0xd6e6e2 };
  water.userData.dusk = { deep: 0x233c45, shallow: 0x5a7d78, sky: 0xd2a98c };
  const mesh = makeRibbon(STREAM_POINTS, 8.8, 0.2, water);
  mesh.receiveShadow = true;
  return { mesh, material: water };
}

function createBridge(root, mats) {
  const cx = 3;
  const cz = -34;
  addBoxMesh(root, 11.5, 0.4, 3.0, cx, 1.3, cz, mats.wood);
  for (let i = 0; i < 14; i++) {
    addBoxMesh(root, 0.16, 0.12, 3.3, cx - 5.2 + i * 0.8, 1.54, cz, mats.woodLight);
  }
  for (const side of [-1, 1]) {
    for (const end of [-1, 1]) {
      addCylinderMesh(root, 0.12, 0.16, 2.5, 6, cx + end * 4.6, 1.75, cz + side * 1.35, mats.wood);
    }
    addBarMesh(root, cx - 4.6, cz + side * 1.35, cx + 4.6, cz + side * 1.35, 2.75, 0.18, 0.18, mats.wood);
    addBarMesh(root, cx - 4.6, cz + side * 1.35, cx + 4.6, cz + side * 1.35, 2.1, 0.12, 0.12, mats.woodLight);
  }
}

function createStreamRocks(root, mats) {
  for (let i = 0; i < 64; i++) {
    const t = i / 63;
    const idx = Math.min(STREAM_POINTS.length - 2, Math.floor(t * (STREAM_POINTS.length - 1)));
    const f = t * (STREAM_POINTS.length - 1) - idx;
    const ax = STREAM_POINTS[idx][0];
    const az = STREAM_POINTS[idx][1];
    const bx = STREAM_POINTS[idx + 1][0];
    const bz = STREAM_POINTS[idx + 1][1];
    const x = ax + (bx - ax) * f;
    const z = az + (bz - az) * f;
    const side = i % 2 === 0 ? 1 : -1;
    const off = 4.5 + rand(111, i) * 2.2;
    const s = 0.5 + rand(113, i) * 1.1;
    addBoxMesh(root, s * 1.6, s * 0.7, s * 1.2, x + side * off, s * 0.25, z + (rand(117, i) - 0.5) * 3, mats.stone, rand(119, i) * 3);
  }
}

function createPath(root, mats) {
  const mesh = makeRibbon(PATH_POINTS, 4.6, 0.06, mats.earth);
  mesh.receiveShadow = true;
  root.add(mesh);
  const mesh2 = makeRibbon([[8, 70], [40, 88], [74, 104], [104, 126]], 3.2, 0.07, mats.earth);
  root.add(mesh2);
  const mesh3 = makeRibbon([[-4, 100], [-42, 116], [-82, 132]], 3.0, 0.07, mats.earth);
  root.add(mesh3);
}

function createYak(mats, scale = 1) {
  const group = new THREE.Group();
  const bodyMat = mats.woodDark;
  const bodyParts = new THREE.Group();

  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 9), bodyMat);
  body.scale.set(1.45, 0.86, 0.76);
  body.position.y = 1.32;
  body.castShadow = true;
  bodyParts.add(body);

  const hump = new THREE.Mesh(new THREE.SphereGeometry(0.62, 10, 8), bodyMat);
  hump.scale.set(1.0, 0.72, 0.85);
  hump.position.set(0, 1.85, 0.28);
  bodyParts.add(hump);

  for (let i = 0; i < 10; i++) {
    const shag = new THREE.Mesh(new THREE.ConeGeometry(0.16 + rand(131, i) * 0.12, 0.8 + rand(137, i) * 0.5, 5), bodyMat);
    shag.position.set((rand(139, i) - 0.5) * 2.2, 0.82, (rand(149, i) - 0.5) * 1.25);
    shag.rotation.z = Math.PI;
    bodyParts.add(shag);
  }
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.1, 0.95, 6), bodyMat);
      leg.position.set(sx * 0.72, 0.48, sz * 0.5);
      leg.castShadow = true;
      bodyParts.add(leg);
    }
  }
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.11, 0.85, 5), bodyMat);
  tail.position.set(0, 1.2, 1.12);
  tail.rotation.x = -0.4;
  bodyParts.add(tail);
  group.add(mergeStaticGroup(bodyParts));

  const headParts = new THREE.Group();
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8), bodyMat);
  skull.scale.set(0.95, 0.95, 1.2);
  headParts.add(skull);
  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.34, 0.62), bodyMat);
  snout.position.set(0, -0.12, -0.55);
  headParts.add(snout);
  for (const side of [-1, 1]) {
    const horn = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.12, 0.85, 6), mats.stoneLight);
    horn.position.set(side * 0.44, 0.42, 0.02);
    horn.rotation.z = side * 1.05;
    horn.rotation.x = 0.45;
    headParts.add(horn);
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.28, 5), bodyMat);
    ear.position.set(side * 0.56, 0.18, -0.12);
    ear.rotation.z = side * 1.3;
    headParts.add(ear);
  }
  const head = mergeStaticGroup(headParts);
  head.position.set(0, 1.48, -1.36);
  group.add(head);

  group.scale.setScalar(scale);
  return { group, head };
}

function createYaks(mats) {
  const group = new THREE.Group();
  const yaks = [];
  const data = [
    [34, -126, 0.9, 0.13, 18, 12, 1.1, 0.4],
    [-54, -102, 0.8, 0.18, 14, 10, 2.2, 0.9],
    [72, -78, 0.75, 0.15, 20, 14, 3.4, 0.6],
    [-96, -58, 0.85, 0.12, 16, 12, 4.6, 1.2],
    [46, 18, 0.8, 0.1, 12, 9, 5.4, 0.3],
    [-64, 24, 0.7, 0.14, 15, 11, 0.7, 1.0],
  ];
  data.forEach(([cx, cz, scale, speed, rx, rz, phase, off]) => {
    const yak = createYak(mats, scale);
    group.add(yak.group);
    yaks.push({ ...yak, cx, cz, rx, rz, speed, phase, off, lastBob: 0 });
  });
  return { group, yaks };
}

function createMist() {
  const tex = makeMistTexture();
  const group = new THREE.Group();
  const puffs = [];
  for (let i = 0; i < 26; i++) {
    const mat = new THREE.SpriteMaterial({
      map: tex,
      color: i % 4 === 0 ? 0xeaf0ec : 0xf2f5f1,
      transparent: true,
      opacity: 0.07 + rand(151, i) * 0.08,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(mat);
    const x = -260 + rand(157, i) * 520;
    const z = -220 + rand(163, i) * 560;
    const y = 9 + rand(167, i) * 48;
    sprite.position.set(x, y, z);
    const scale = 55 + rand(173, i) * 105;
    sprite.scale.set(scale, scale * 0.42, 1);
    sprite.userData.baseX = x;
    sprite.userData.baseY = y;
    sprite.userData.baseZ = z;
    sprite.userData.speed = 0.8 + rand(179, i) * 2.2;
    sprite.userData.phase = rand(181, i) * 6.28;
    group.add(sprite);
    puffs.push(sprite);
  }
  const smokeSpots = [
    [-80, 70, 10], [66, 92, 11], [-54, 140, 10.5], [48, 126, 10],
    [92, 120, 9], [-30, 220, 12], [44, 214, 10],
  ];
  smokeSpots.forEach(([x, z, y], i) => {
    const mat = new THREE.SpriteMaterial({
      map: tex,
      color: 0xe2e6e1,
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.position.set(x, y, z);
    sprite.scale.set(7, 9, 1);
    sprite.userData.baseX = x;
    sprite.userData.baseZ = z;
    sprite.userData.speed = 0.22 + rand(191, i) * 0.16;
    sprite.userData.phase = rand(193, i) * 6.28;
    sprite.userData.smoke = true;
    group.add(sprite);
    puffs.push(sprite);
  });
  return { group, puffs };
}

export function buildZhaganaScene() {
  const mats = buildMaterials();
  const root = new THREE.Group();

  const terrain = createTerrain(mats);
  root.add(terrain);
  createMountains(root, mats);
  createVillage(root, mats);
  createStupas(root, mats);
  createForest(root, mats);
  createTerraces(root, mats);
  createRacks(root, mats);
  createSign(root, mats, '扎尕那', 'ZHAGANA · GANSU', 8, -186, Math.PI, 1.0);
  createSign(root, mats, '仙女滩', 'XIANNÜTAN MEADOW', -54, -112, Math.PI - 0.2, 0.7);
  createBridge(root, mats);
  createStreamRocks(root, mats);
  createPath(root, mats);
  const flags = createPrayerFlags(root, mats);

  const merged = mergeStaticGroup(root);
  const terrainMaterial = mats.grass;
  merged.traverse((mesh) => {
    if (mesh.isMesh && mesh.material === terrainMaterial) mesh.castShadow = false;
  });

  const stream = createStream(mats);
  merged.add(stream.mesh);
  merged.add(flags.group);

  const yaks = createYaks(mats);
  merged.add(yaks.group);

  const mist = createMist();
  merged.add(mist.group);

  const waterMaterials = [stream.material];

  const flagDummy = new THREE.Object3D();
  const life = {
    update(t, dt) {
      flags.flags.forEach((flag, i) => {
        flagDummy.position.set(flag.x, flag.y + Math.sin(t * 2.7 + flag.phase) * 0.07, flag.z);
        flagDummy.rotation.set(Math.sin(t * 3.1 + flag.phase * 1.3) * 0.1, flag.angle, Math.sin(t * 2.3 + flag.phase) * 0.3);
        flagDummy.updateMatrix();
        flags.mesh.setMatrixAt(i, flagDummy.matrix);
      });
      flags.mesh.instanceMatrix.needsUpdate = true;
      for (const yak of yaks.yaks) {
        const a = yak.phase + t * yak.speed;
        const x = yak.cx + Math.cos(a) * yak.rx;
        const z = yak.cz + Math.sin(a) * yak.rz;
        const dx = -Math.sin(a) * yak.rx;
        const dz = Math.cos(a) * yak.rz;
        yak.group.position.set(x, Math.sin(t * 1.7 + yak.phase) * 0.04, z);
        yak.group.rotation.y = Math.atan2(-dx, -dz) + yak.off;
        yak.head.rotation.x = Math.sin(t * 1.15 + yak.phase) * 0.12 - 0.08;
      }
      for (const puff of mist.puffs) {
        const u = puff.userData;
        if (u.smoke) {
          const rise = (t * u.speed * 5 + u.phase * 6) % 24;
          puff.position.set(u.baseX + Math.sin(t * 0.24 + u.phase) * 2.4, 8 + rise, u.baseZ + Math.cos(t * 0.18 + u.phase) * 1.8);
          puff.material.opacity = 0.18 * Math.sin((rise / 24) * Math.PI);
        } else {
          puff.position.set(
            u.baseX + Math.sin(t * 0.045 * u.speed + u.phase) * 38,
            u.baseY + Math.sin(t * 0.11 + u.phase) * 2.6,
            u.baseZ + Math.cos(t * 0.036 * u.speed + u.phase) * 26
          );
        }
      }
      stream.material.uniforms.uTime.value = t;
    },
  };

  return {
    group: merged,
    mats,
    waterMaterials,
    stream,
    flags,
    yaks,
    mist,
    life,
  };
}




