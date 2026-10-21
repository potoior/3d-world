import * as THREE from 'three';
import { mergeStaticGroup } from './geometry.js';

function rand(seed, n) {
  const x = Math.sin(seed * 127.1 + n * 311.7 + 17.31) * 43758.5453;
  return x - Math.floor(x);
}

function smoothstep(a, b, x) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function canvasTexture(w, h, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d'), w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function addRod(root, material, a, b, radius = 0.08, segments = 6) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  if (len < 0.0001) return;
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, len, segments), material);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  root.add(mesh);
}

function makeGroundTexture() {
  return canvasTexture(512, 512, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#91897b');
    grad.addColorStop(0.45, '#a0998a');
    grad.addColorStop(1, '#81796c');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 14000; i++) {
      const x = rand(5, i) * w;
      const y = rand(9, i) * h;
      const s = 0.6 + rand(13, i) * 2.4;
      const tone = rand(17, i);
      g.fillStyle = tone > 0.76 ? 'rgba(220,212,193,0.34)' : tone > 0.45 ? 'rgba(118,108,95,0.40)' : 'rgba(178,170,155,0.32)';
      g.beginPath();
      g.arc(x, y, s, 0, 6.283);
      g.fill();
    }
    for (let i = 0; i < 160; i++) {
      g.strokeStyle = 'rgba(228,222,205,0.24)';
      g.lineWidth = 0.8 + rand(23, i) * 1.6;
      g.beginPath();
      const x = rand(29, i) * w;
      const y = rand(31, i) * h;
      g.moveTo(x, y);
      g.lineTo(x + (rand(37, i) - 0.5) * 26, y + (rand(41, i) - 0.5) * 16);
      g.stroke();
    }
  });
}

function makeCloudTexture() {
  return canvasTexture(512, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    for (let i = 0; i < 34; i++) {
      const x = w * (0.08 + rand(3, i) * 0.84);
      const y = h * (0.34 + rand(7, i) * 0.34);
      const r = 24 + rand(11, i) * 62;
      const grad = g.createRadialGradient(x, y, 1, x, y, r);
      grad.addColorStop(0, 'rgba(255,255,255,0.72)');
      grad.addColorStop(0.48, 'rgba(245,249,252,0.38)');
      grad.addColorStop(1, 'rgba(238,246,252,0)');
      g.fillStyle = grad;
      g.beginPath();
      g.arc(x, y, r, 0, 6.283);
      g.fill();
    }
  });
}

function makeGlowTexture() {
  return canvasTexture(256, 256, (g, w, h) => {
    const grad = g.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2);
    grad.addColorStop(0, 'rgba(255,246,214,0.95)');
    grad.addColorStop(0.24, 'rgba(255,214,142,0.62)');
    grad.addColorStop(0.55, 'rgba(255,170,94,0.20)');
    grad.addColorStop(1, 'rgba(255,150,80,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
  });
}

function makeSignTexture(title, sub) {
  return canvasTexture(512, 168, (g, w, h) => {
    g.fillStyle = '#182029';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#c8a765';
    g.lineWidth = 4;
    g.strokeRect(9, 9, w - 18, h - 18);
    g.textAlign = 'center';
    g.fillStyle = '#f3ead7';
    g.font = '600 62px "Noto Serif CJK SC", "Songti SC", serif';
    g.fillText(title, w / 2, 86);
    g.fillStyle = '#c8a765';
    g.font = '500 20px "Helvetica Neue", Arial, sans-serif';
    g.fillText(sub, w / 2, 128);
  });
}

function makeSnowflakeTexture() {
  return canvasTexture(64, 64, (g, w, h) => {
    const grad = g.createRadialGradient(32, 32, 1, 32, 32, 30);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.4, 'rgba(240,248,252,0.8)');
    grad.addColorStop(1, 'rgba(230,242,250,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
  });
}

function createMaterials() {
  return {
    rock: new THREE.MeshStandardMaterial({ color: 0x6a5e51, roughness: 0.96, metalness: 0.02 }),
    rockDark: new THREE.MeshStandardMaterial({ color: 0x443b34, roughness: 0.98 }),
    rockLight: new THREE.MeshStandardMaterial({ color: 0x918472, roughness: 0.94 }),
    snow: new THREE.MeshStandardMaterial({ color: 0xf2f6f5, roughness: 0.7, metalness: 0.01 }),
    snowBlue: new THREE.MeshStandardMaterial({ color: 0xd3e5ea, roughness: 0.62, metalness: 0.02 }),
    ice: new THREE.MeshStandardMaterial({ color: 0xaddbe4, roughness: 0.3, metalness: 0.08, emissive: 0x1f4c59, emissiveIntensity: 0.28 }),
    icePale: new THREE.MeshStandardMaterial({ color: 0xd9f1f4, roughness: 0.22, metalness: 0.06, emissive: 0x1c4a56, emissiveIntensity: 0.2 }),
    crevass: new THREE.MeshStandardMaterial({ color: 0x2a6376, roughness: 0.55, emissive: 0x10333d, emissiveIntensity: 0.25 }),
    moraine: new THREE.MeshStandardMaterial({ color: 0x6b6257, roughness: 1 }),
    moraineDark: new THREE.MeshStandardMaterial({ color: 0x49423b, roughness: 1 }),
    tentOrange: new THREE.MeshStandardMaterial({ color: 0xd9772f, roughness: 0.82 }),
    tentYellow: new THREE.MeshStandardMaterial({ color: 0xe4b53a, roughness: 0.8 }),
    tentRed: new THREE.MeshStandardMaterial({ color: 0xb44733, roughness: 0.84 }),
    tentBlue: new THREE.MeshStandardMaterial({ color: 0x2e708e, roughness: 0.82 }),
    tentTeal: new THREE.MeshStandardMaterial({ color: 0x3d8d82, roughness: 0.82 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x25282a, roughness: 0.9 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x8b9296, roughness: 0.45, metalness: 0.65 }),
    rope: new THREE.MeshStandardMaterial({ color: 0x6d6a60, roughness: 0.9 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x8c6e4b, roughness: 0.92 }),
    sumSnow: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, emissive: 0xffcf8a, emissiveIntensity: 0.06 }),
  };
}

function createMountain(root, mats, options) {
  const {
    cx = 0,
    cz = 340,
    peakY = 500,
    baseX = 370,
    baseZ = 310,
    segments = 20,
    levels = 18,
    seed = 1,
    snowLine = 0.62,
    palette = null,
    offsetTopX = 0,
    offsetTopZ = 0,
  } = options;
  const P = palette || mats;
  const buckets = new Map();
  function push(mat, a, b, c) {
    let arr = buckets.get(mat);
    if (!arr) {
      arr = [];
      buckets.set(mat, arr);
    }
    arr.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  }
  function faceMaterial(t, angle, n) {
    const band = Math.sin(t * 39 + Math.sin(angle * 5.0 + seed) * 1.9 + seed * 0.7) * 0.5 + 0.5;
    const gully = (Math.sin(angle * 11 + t * 8 + seed * 1.3) + 1) * 0.5;
    const north = smoothstep(-0.15, 0.85, -Math.sin(angle));
    if (t > 0.87) return P.snow;
    if (t > snowLine && band > 0.34) return n > 0.34 ? P.snow : P.snowBlue;
    if (t > snowLine - 0.07 && band > 0.72) return P.snowBlue;
    if (t > 0.28 && gully > 0.8 && band > 0.42) return P.snowBlue;
    if (t > 0.42 && north > 0.62 && n < 0.45 && band < 0.45) return n < 0.2 ? P.rockDark : P.rock;
    if (t < 0.14) return n > 0.6 ? P.rockLight : P.rockDark;
    if (n > 0.76) return P.rockLight;
    if (n < 0.24) return P.rockDark;
    return P.rock;
  }
  const rings = [];
  for (let l = 0; l < levels; l++) {
    const t = l / levels;
    const y = peakY * Math.pow(t, 1.06);
    const radiusFactor = Math.pow(1 - t, 0.84);
    const ring = [];
    for (let s = 0; s < segments; s++) {
      const angle = (s / segments) * Math.PI * 2;
      const north = Math.max(0, -Math.sin(angle));
      let rf = radiusFactor;
      rf *= 1 + 0.105 * Math.sin(angle * 5 + seed * 1.7) + 0.055 * Math.sin(angle * 9 + seed * 2.3) + 0.035 * Math.sin(angle * 3 - seed);
      rf *= 1 + 0.14 * Math.sin(t * Math.PI) * Math.sin(angle * 2 + 0.45);
      rf *= 1 + north * 0.11 * smoothstep(0.02, 0.58, t) * (1 - smoothstep(0.7, 1, t));
      rf *= 1 + (rand(seed * 3 + s, l) - 0.5) * 0.055;
      const topBlend = smoothstep(0.72, 1, t);
      const px = cx + Math.cos(angle) * baseX * rf + offsetTopX * topBlend;
      const pz = cz + Math.sin(angle) * baseZ * rf + offsetTopZ * topBlend;
      const py = Math.max(0, y + (rand(seed * 7 + s, l) - 0.5) * 8 * (1 - t) + Math.sin(t * 10 + angle * 3) * 3.2 * (1 - t));
      ring.push(new THREE.Vector3(px, py, pz));
    }
    rings.push(ring);
  }
  for (let l = 0; l < levels - 1; l++) {
    const t = l / levels;
    for (let s = 0; s < segments; s++) {
      const s2 = (s + 1) % segments;
      const a = rings[l][s];
      const b = rings[l][s2];
      const c = rings[l + 1][s2];
      const d = rings[l + 1][s];
      const angle = ((s + 0.5) / segments) * Math.PI * 2;
      const n = rand(seed * 13 + s, l * 5 + 3);
      const mat = faceMaterial(t, angle, n);
      push(mat, a, c, b);
      push(mat, a, d, c);
    }
  }
  const apex = new THREE.Vector3(cx + offsetTopX, peakY, cz + offsetTopZ);
  for (let s = 0; s < segments; s++) {
    const s2 = (s + 1) % segments;
    const a = rings[levels - 1][s];
    const b = rings[levels - 1][s2];
    push(P.snow, a, apex, b);
  }
  for (const [material, positions] of buckets) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
  }
}

function createGlacier(root, mats) {
  const spine = [
    [-8, -285, 48],
    [-18, -220, 58],
    [-30, -150, 68],
    [-24, -78, 78],
    [-10, -4, 88],
    [8, 68, 98],
    [24, 138, 108],
    [34, 202, 116],
  ];
  const N = 52;
  const rows = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const f = t * (spine.length - 1);
    const i0 = Math.min(spine.length - 2, Math.floor(f));
    const k = f - i0;
    const a = spine[i0];
    const b = spine[i0 + 1];
    const cx = a[0] + (b[0] - a[0]) * k;
    const cz = a[1] + (b[1] - a[1]) * k;
    const width = a[2] + (b[2] - a[2]) * k;
    const wobble = Math.sin(t * 11.3 + 0.7) * 0.08 + Math.sin(t * 23.1) * 0.035;
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const len = Math.hypot(dx, dz) || 1;
    const nx = -dz / len;
    const nz = dx / len;
    const lift = 0.62 + Math.sin(t * 18) * 0.18 + t * 0.5;
    rows.push({
      c: new THREE.Vector3(cx, lift, cz),
      n: new THREE.Vector3(nx, 0, nz),
      w: width * (1 + wobble),
    });
  }
  const positions = [];
  for (let i = 0; i < N; i++) {
    const a = rows[i];
    const b = rows[i + 1];
    const al = a.c.clone().addScaledVector(a.n, -a.w * 0.5);
    const ar = a.c.clone().addScaledVector(a.n, a.w * 0.5);
    const bl = b.c.clone().addScaledVector(b.n, -b.w * 0.5);
    const br = b.c.clone().addScaledVector(b.n, b.w * 0.5);
    positions.push(al.x, al.y, al.z, bl.x, bl.y, bl.z, br.x, br.y, br.z);
    positions.push(al.x, al.y, al.z, br.x, br.y, br.z, ar.x, ar.y, ar.z);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mats.ice);
  mesh.receiveShadow = true;
  root.add(mesh);

  for (let i = 0; i < 46; i++) {
    const t = rand(61, i);
    const row = rows[Math.floor(t * (rows.length - 1))];
    const side = (rand(67, i) - 0.5) * row.w * 0.72;
    const x = row.c.x + row.n.x * side;
    const z = row.c.z + row.n.z * side;
    const length = 2.6 + rand(71, i) * 9;
    const line = new THREE.Mesh(new THREE.BoxGeometry(0.28 + rand(73, i) * 0.45, 0.2, length), mats.crevass);
    line.position.set(x, row.c.y + 0.16, z);
    line.rotation.y = Math.atan2(row.n.z, row.n.x) + (rand(79, i) - 0.5) * 0.6;
    line.rotation.z = (rand(83, i) - 0.5) * 0.18;
    root.add(line);
  }

  for (let i = 0; i < 40; i++) {
    const row = rows[Math.floor(rand(97, i) * (rows.length - 1))];
    const side = (rand(101, i) - 0.5) * row.w * 0.8;
    const h = 2.4 + rand(103, i) * 9;
    const r = 0.8 + rand(107, i) * 2.2;
    const pinnacle = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 4), rand(109, i) > 0.5 ? mats.icePale : mats.ice);
    pinnacle.position.set(row.c.x + row.n.x * side, row.c.y + h * 0.5, row.c.z + row.n.z * side);
    pinnacle.scale.set(r, h, r);
    pinnacle.rotation.y = rand(113, i) * Math.PI;
    pinnacle.rotation.z = (rand(127, i) - 0.5) * 0.26;
    pinnacle.castShadow = true;
    root.add(pinnacle);
  }

  for (let i = 0; i < 9; i++) {
    const z = -205 + i * 22 + rand(131, i) * 8;
    const x = -82 + rand(137, i) * 160;
    const h = 3 + rand(139, i) * 6;
    const block = new THREE.Mesh(new THREE.BoxGeometry(5 + rand(149, i) * 7, h, 4 + rand(151, i) * 5), mats.ice);
    block.position.set(x, h * 0.42, z);
    block.rotation.y = rand(157, i) * Math.PI;
    block.rotation.z = (rand(163, i) - 0.5) * 0.12;
    root.add(block);
  }
}

function createRockField(root, mats) {
  for (let i = 0; i < 360; i++) {
    const side = rand(173, i) > 0.5 ? 1 : -1;
    const band = rand(179, i);
    const z = -700 + rand(181, i) * 920;
    const x = side * (90 + band * 235 + rand(191, i) * 48);
    if (z > 150 && Math.abs(x) < 190) continue;
    const s = 0.7 + Math.pow(rand(193, i), 2.2) * 8;
    const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), rand(197, i) > 0.72 ? mats.rockLight : rand(199, i) > 0.4 ? mats.moraine : mats.moraineDark);
    mesh.position.set(x, s * 0.38, z);
    mesh.scale.set(s * (0.8 + rand(211, i) * 0.7), s * (0.55 + rand(223, i) * 0.65), s * (0.8 + rand(227, i) * 0.7));
    mesh.rotation.set(rand(229, i) * 3, rand(233, i) * 3, rand(239, i) * 3);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
  }
  const boulders = [
    [-48, -274, 3.6],
    [36, -286, 2.6],
    [-160, -246, 4.4],
    [150, -252, 3.2],
    [-126, -140, 2.8],
    [138, -120, 3.4],
    [-92, -58, 2.2],
    [96, -44, 2.9],
  ];
  boulders.forEach(([x, z, s], i) => {
    const mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), i % 2 ? mats.moraine : mats.moraineDark);
    mesh.position.set(x, s * 0.42, z);
    mesh.scale.set(s, s * 0.75, s * 1.1);
    mesh.rotation.set(rand(241, i) * 3, rand(251, i) * 3, rand(257, i) * 3);
    mesh.castShadow = true;
    root.add(mesh);
  });
}

function createDomeTent(root, mats, x, z, radius, material, rot = 0) {
  radius *= 1.26;
  const group = new THREE.Group();
  const dome = new THREE.Mesh(new THREE.SphereGeometry(radius, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), material);
  dome.scale.set(1, 0.78, 1.14);
  dome.position.y = 0.15;
  dome.castShadow = true;
  dome.receiveShadow = true;
  group.add(dome);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.015, radius * 1.06, 0.32, 14), mats.dark);
  base.position.y = 0.12;
  group.add(base);
  const door = new THREE.Mesh(new THREE.BoxGeometry(radius * 0.72, radius * 0.66, 0.18), mats.dark);
  door.position.set(0, radius * 0.42, radius * 1.1);
  group.add(door);
  for (const sx of [-1, 1]) {
    addRod(group, mats.rope, new THREE.Vector3(sx * radius * 0.72, radius * 0.72, radius * 0.65), new THREE.Vector3(sx * radius * 1.35, 0.06, radius * 1.8), 0.035, 4);
    addRod(group, mats.rope, new THREE.Vector3(sx * radius * 0.72, radius * 0.72, -radius * 0.65), new THREE.Vector3(sx * radius * 1.35, 0.06, -radius * 1.8), 0.035, 4);
  }
  group.position.set(x, 0, z);
  group.rotation.y = rot;
  root.add(group);
}

function createCamp(root, mats) {
  const tents = [
    [-92, -238, 2.7, mats.tentOrange, 0.35],
    [-64, -246, 3.1, mats.tentYellow, -0.2],
    [-36, -236, 2.5, mats.tentBlue, 0.5],
    [-8, -252, 2.2, mats.tentRed, -0.4],
    [24, -243, 3.2, mats.tentOrange, 0.2],
    [58, -250, 2.6, mats.tentTeal, -0.55],
    [94, -240, 3.0, mats.tentYellow, 0.1],
    [-72, -205, 2.3, mats.tentBlue, 0.75],
    [-30, -198, 2.7, mats.tentOrange, -0.3],
    [18, -204, 2.4, mats.tentRed, 0.4],
    [58, -212, 2.8, mats.tentYellow, -0.15],
    [104, -206, 2.2, mats.tentBlue, 0.9],
    [-114, -218, 2.5, mats.tentTeal, -0.65],
    [126, -226, 2.4, mats.tentOrange, 0.25],
  ];
  tents.forEach(([x, z, r, m, rot]) => createDomeTent(root, mats, x, z, r, m, rot));

  const big = new THREE.Group();
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(4.9, 4.9, 11.2, 14, 1, false, 0, Math.PI), mats.tentYellow);
  roof.rotation.z = Math.PI * 0.5;
  roof.position.set(0, 0.2, 0);
  roof.castShadow = true;
  roof.receiveShadow = true;
  big.add(roof);
  const floor = new THREE.Mesh(new THREE.BoxGeometry(11.4, 0.5, 9.8), mats.dark);
  floor.position.y = 0.12;
  big.add(floor);
  const door = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.4, 0.2), mats.dark);
  door.position.set(0, 1.3, 4.35);
  big.add(door);
  big.position.set(-2, 0, -224);
  root.add(big);

  const crates = [
    [-50, -222, 2.2], [-44, -224, 1.5], [46, -230, 2.0], [72, -228, 1.6],
    [10, -226, 1.9], [-16, -232, 1.4], [88, -218, 2.1],
  ];
  crates.forEach(([x, z, s], i) => {
    const box = new THREE.Mesh(new THREE.BoxGeometry(s, s * 0.8, s * 1.1), i % 3 === 0 ? mats.wood : mats.metal);
    box.position.set(x, s * 0.4, z);
    box.rotation.y = rand(263, i) * 0.8;
    box.castShadow = true;
    root.add(box);
  });

  const panels = [
    [-140, -228, 0.4], [142, -235, -0.5], [-136, -196, 0.7], [138, -190, -0.65],
  ];
  panels.forEach(([x, z, rot], i) => {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(8, 0.22, 4), new THREE.MeshStandardMaterial({ color: 0x1e3b58, roughness: 0.3, metalness: 0.5 }));
    panel.position.set(x, 2.2, z);
    panel.rotation.set(-0.5, rot, 0);
    panel.castShadow = true;
    root.add(panel);
    addRod(root, mats.metal, new THREE.Vector3(x - 2.5, 0, z), new THREE.Vector3(x - 2.5, 2.1, z), 0.12, 5);
    addRod(root, mats.metal, new THREE.Vector3(x + 2.5, 0, z), new THREE.Vector3(x + 2.5, 2.1, z), 0.12, 5);
  });

  const sign = new THREE.Mesh(new THREE.PlaneGeometry(12, 3.9), new THREE.MeshStandardMaterial({ map: makeSignTexture('珠峰大本营', 'EVEREST BASE CAMP · 5150 M'), roughness: 0.8, side: THREE.DoubleSide }));
  sign.position.set(0, 4.6, -262);
  sign.rotation.y = Math.PI;
  root.add(sign);
  addRod(root, mats.metal, new THREE.Vector3(-4.4, 0, -261.8), new THREE.Vector3(-4.4, 4.4, -261.8), 0.15, 6);
  addRod(root, mats.metal, new THREE.Vector3(4.4, 0, -261.8), new THREE.Vector3(4.4, 4.4, -261.8), 0.15, 6);

  const barrelMat = new THREE.MeshStandardMaterial({ color: 0x3f5e58, roughness: 0.6, metalness: 0.35 });
  for (let i = 0; i < 12; i++) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 1.9, 10), i % 3 === 0 ? mats.tentRed : barrelMat);
    b.position.set(-30 + rand(269, i) * 70, 0.95, -240 + rand(271, i) * 18);
    b.castShadow = true;
    root.add(b);
  }
}

function createPrayerFlags(root, mats) {
  const flagColors = [0x2f6fae, 0xf0e8d2, 0xc23c32, 0x2f8b55, 0xe2b23a];
  const flagMats = flagColors.map((color) => new THREE.MeshStandardMaterial({ color, roughness: 0.72, side: THREE.DoubleSide }));
  const group = new THREE.Group();
  const flags = [];
  const lines = [
    [-118, -258, 118, -258, 9.4],
    [-128, -238, 128, -238, 9.0],
    [-120, -216, 120, -216, 8.6],
    [-108, -192, 108, -192, 8.2],
    [-92, -270, -150, -214, 8.8],
    [92, -270, 150, -214, 8.8],
  ];
  const poleMat = mats.metal;
  let colorIndex = 0;
  for (const [x1, z1, x2, z2, height] of lines) {
    addRod(root, poleMat, new THREE.Vector3(x1, 0, z1), new THREE.Vector3(x1, height, z1), 0.15, 7);
    addRod(root, poleMat, new THREE.Vector3(x2, 0, z2), new THREE.Vector3(x2, height, z2), 0.15, 7);
    const finial1 = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 6), mats.tentYellow);
    finial1.position.set(x1, height + 0.12, z1);
    root.add(finial1);
    const finial2 = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 6), mats.tentYellow);
    finial2.position.set(x2, height + 0.12, z2);
    root.add(finial2);
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    const rotY = Math.atan2(-dz, dx);
    const count = 26;
    const sag = 2.3;
    const ropePoints = [];
    for (let i = 0; i <= 14; i++) {
      const k = i / 14;
      const y = height - 0.35 - sag * 4 * k * (1 - k);
      const px = x1 + dx * k;
      const pz = z1 + dz * k;
      ropePoints.push(new THREE.Vector3(px, y, pz));
    }
    for (let i = 0; i < ropePoints.length - 1; i++) addRod(root, mats.rope, ropePoints[i], ropePoints[i + 1], 0.045, 4);
    for (let i = 1; i < count; i++) {
      const k = i / count;
      const px = x1 + dx * k;
      const pz = z1 + dz * k;
      const py = height - 0.35 - sag * 4 * k * (1 - k);
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(2.05, 1.5, 2, 1), flagMats[colorIndex % flagMats.length]);
      colorIndex++;
      flag.position.set(px, py - 0.8, pz);
      flag.rotation.y = rotY;
      flag.castShadow = true;
      group.add(flag);
      flags.push({ mesh: flag, baseY: flag.rotation.y, phase: rand(277, colorIndex) * Math.PI * 2, baseX: flag.rotation.x });
    }
  }
  return { group, flags };
}

function createYak(mats, x, z, rot, scale, phase) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 9), mats.dark);
  body.scale.set(1.35, 0.95, 2.15);
  body.position.y = 1.75;
  body.castShadow = true;
  group.add(body);
  const hump = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), mats.dark);
  hump.scale.set(0.78, 0.62, 0.95);
  hump.position.set(0, 2.48, 0.26);
  hump.castShadow = true;
  group.add(hump);
  const shag = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.55, 1.0, 12, 1, true), mats.moraineDark);
  shag.position.y = 1.18;
  shag.scale.z = 1.5;
  shag.castShadow = true;
  group.add(shag);
  const head = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), mats.dark);
  head.scale.set(0.56, 0.6, 0.84);
  head.position.set(0, 1.9, -2.05);
  head.castShadow = true;
  group.add(head);
  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.4, 0.7), mats.moraineDark);
  snout.position.set(0, 1.72, -2.66);
  group.add(snout);
  for (const sx of [-1, 1]) {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.85, 5), mats.snow);
    horn.position.set(sx * 0.42, 2.28, -1.82);
    horn.rotation.z = sx * 0.85;
    horn.rotation.x = -0.35;
    group.add(horn);
    for (const sz of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.11, 1.15, 6), mats.dark);
      leg.position.set(sx * 0.62, 0.58, sz * 0.92);
      leg.castShadow = true;
      group.add(leg);
    }
  }
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.11, 1.5, 5), mats.dark);
  tail.position.set(0, 1.55, 2.18);
  tail.rotation.x = -0.35;
  group.add(tail);
  group.position.set(x, 0, z);
  group.rotation.y = rot;
  group.scale.setScalar(scale);
  group.userData = { phase, baseX: x, baseZ: z, radius: 6 + rand(281, phase * 10) * 8, speed: 0.05 + rand(283, phase * 10) * 0.05 };
  return group;
}

function createYaks(mats) {
  const group = new THREE.Group();
  const list = [
    [-142, -176, 0.6, 1.15, 1],
    [96, -176, -0.7, 1.05, 2],
    [-126, -128, 2.4, 0.95, 3],
    [112, -132, -2.2, 1.1, 4],
    [156, -186, 1.1, 1.0, 5],
  ];
  const yaks = list.map(([x, z, rot, scale, phase]) => {
    const yak = createYak(mats, x, z, rot, scale, phase);
    group.add(yak);
    return yak;
  });
  return { group, yaks };
}

function createClimber(mats, color, x, y, z, rot, scale, phase) {
  const group = new THREE.Group();
  const jacket = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });
  const legMat = new THREE.MeshStandardMaterial({ color: 0x1d2329, roughness: 0.85 });
  const packMat = new THREE.MeshStandardMaterial({ color: 0x2e3b44, roughness: 0.8 });
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.72, 7), jacket);
  torso.position.y = 1.05;
  torso.castShadow = true;
  group.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 8, 6), mats.snow);
  head.position.y = 1.56;
  group.add(head);
  const hood = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), jacket);
  hood.scale.set(1, 0.9, 0.9);
  hood.position.set(0, 1.58, 0.04);
  group.add(hood);
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.55, 0.26), packMat);
  pack.position.set(0, 1.1, 0.23);
  group.add(pack);
  for (const sx of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.72, 5), legMat);
    leg.position.set(sx * 0.12, 0.44, 0);
    group.add(leg);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.62, 5), jacket);
    arm.position.set(sx * 0.28, 1.04, 0);
    arm.rotation.z = sx * 0.16;
    group.add(arm);
  }
  const axe = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.25, 4), mats.metal);
  axe.position.set(0.34, 0.8, -0.02);
  axe.rotation.z = 0.18;
  group.add(axe);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 4), new THREE.MeshStandardMaterial({ color: 0xfff1c2, emissive: 0xffcf7a, emissiveIntensity: 1.6 }));
  lamp.position.set(0, 1.57, -0.2);
  group.add(lamp);
  group.position.set(x, y, z);
  group.rotation.y = rot;
  group.scale.setScalar(scale);
  group.userData = { phase, baseY: y, baseX: x, baseZ: z };
  return group;
}

function createClimbers(mats) {
  const group = new THREE.Group();
  const list = [
    [0xdc5a2e, -42, 0.3, -118, 0.8, 1.7, 1],
    [0xe1a52f, 34, 0.3, -88, -0.6, 1.65, 2],
    [0xb83b2f, -12, 0.75, -34, 0.3, 1.7, 3],
    [0x2e7fa3, 52, 0.6, 18, -1.1, 1.55, 4],
    [0xdc5a2e, 6, 500.5, 338, 1.4, 1.35, 5],
  ];
  const climbers = list.map(([color, x, y, z, rot, scale, phase]) => {
    const c = createClimber(mats, color, x, y, z, rot, scale, phase);
    group.add(c);
    return c;
  });
  return { group, climbers };
}

function createClouds() {
  const texture = makeCloudTexture();
  const mats = [0.26, 0.4, 0.55].map((opacity) => new THREE.SpriteMaterial({ map: texture, transparent: true, opacity, depthWrite: false, color: 0xf1f6fa }));
  const warm = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0.34, depthWrite: false, color: 0xffe4c3 });
  const group = new THREE.Group();
  const clouds = [];
  for (let i = 0; i < 42; i++) {
    const low = i < 30;
    const material = low ? (rand(293, i) > 0.55 ? mats[Math.floor(rand(307, i) * 3)] : warm) : mats[Math.floor(rand(311, i) * 3)];
    const sprite = new THREE.Sprite(material);
    const x = -620 + rand(313, i) * 1240;
    const y = low ? 88 + rand(317, i) * 105 : 250 + rand(331, i) * 170;
    const z = low ? 90 + rand(337, i) * 520 : 250 + rand(347, i) * 330;
    const w = low ? 170 + rand(349, i) * 260 : 90 + rand(353, i) * 150;
    sprite.position.set(x, y, z);
    sprite.scale.set(w, w * 0.42, 1);
    group.add(sprite);
    clouds.push({ sprite, speed: (0.7 + rand(359, i) * 1.6) * (rand(367, i) > 0.5 ? 1 : -1), baseY: y, phase: rand(373, i) * 6.28, range: 640 });
  }
  return { group, clouds };
}

function createSnowfall() {
  const count = 700;
  const positions = new Float32Array(count * 3);
  const speeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = -330 + rand(379, i) * 660;
    positions[i * 3 + 1] = rand(383, i) * 340;
    positions[i * 3 + 2] = -260 + rand(389, i) * 520;
    speeds[i] = 4 + rand(397, i) * 12;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    map: makeSnowflakeTexture(),
    size: 1.4,
    transparent: true,
    opacity: 0.62,
    depthWrite: false,
    sizeAttenuation: true,
    color: 0xf3f8fb,
  });
  const points = new THREE.Points(geo, material);
  return { points, speeds, positions, count };
}

function createGlow() {
  const material = new THREE.SpriteMaterial({ map: makeGlowTexture(), color: 0xffd79f, transparent: true, opacity: 0.88, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending });
  const sprite = new THREE.Sprite(material);
  sprite.position.set(0, 515, 390);
  sprite.scale.set(560, 560, 1);
  sprite.renderOrder = 2;
  return { sprite, material };
}

function buildEverestScene() {
  const root = new THREE.Group();
  const mats = createMaterials();

  const groundTexture = makeGroundTexture();
  groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
  groundTexture.repeat.set(90, 90);
  groundTexture.anisotropy = 8;
  const groundMat = new THREE.MeshStandardMaterial({ map: groundTexture, color: 0xffffff, roughness: 1 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(2600, 2600), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.2, 240);
  ground.receiveShadow = true;
  root.add(ground);

  createMountain(root, mats, { cx: 0, cz: 345, peakY: 505, baseX: 380, baseZ: 315, segments: 22, levels: 19, seed: 1.4, snowLine: 0.61, offsetTopX: -8, offsetTopZ: -12 });
  createMountain(root, mats, { cx: -305, cz: 430, peakY: 300, baseX: 185, baseZ: 175, segments: 15, levels: 13, seed: 4.2, snowLine: 0.66 });
  createMountain(root, mats, { cx: 318, cz: 470, peakY: 268, baseX: 172, baseZ: 166, segments: 14, levels: 12, seed: 7.7, snowLine: 0.68 });
  createMountain(root, mats, { cx: -560, cz: 850, peakY: 330, baseX: 300, baseZ: 260, segments: 13, levels: 11, seed: 9.1, snowLine: 0.58 });
  createMountain(root, mats, { cx: 560, cz: 910, peakY: 300, baseX: 290, baseZ: 250, segments: 13, levels: 11, seed: 12.3, snowLine: 0.6 });
  createMountain(root, mats, { cx: 20, cz: 1180, peakY: 380, baseX: 360, baseZ: 300, segments: 14, levels: 12, seed: 15.8, snowLine: 0.55 });

  createGlacier(root, mats);
  createRockField(root, mats);
  createCamp(root, mats);

  const flags = createPrayerFlags(root, mats);
  const yaks = createYaks(mats);
  const climbers = createClimbers(mats);
  const clouds = createClouds();
  const snowfall = createSnowfall();
  const glow = createGlow();

  const merged = mergeStaticGroup(root);
  merged.traverse((mesh) => {
    if (mesh.isMesh && mesh.material === groundMat) mesh.castShadow = false;
  });
  merged.add(flags.group);
  merged.add(yaks.group);
  merged.add(climbers.group);
  merged.add(clouds.group);
  merged.add(snowfall.points);
  merged.add(glow.sprite);

  const life = {
    update(t, dt) {
      for (const flag of flags.flags) {
        const wave = Math.sin(t * 2.3 + flag.phase) * 0.16;
        flag.mesh.rotation.y = flag.baseY + wave;
        flag.mesh.rotation.x = flag.baseX + Math.sin(t * 3.1 + flag.phase * 0.7) * 0.06;
      }
      for (const yak of yaks.yaks) {
        const d = yak.userData;
        const a = t * d.speed + d.phase;
        yak.position.x = d.baseX + Math.cos(a) * d.radius;
        yak.position.z = d.baseZ + Math.sin(a) * d.radius * 0.55;
        yak.rotation.y = -a + Math.PI * 0.5;
        yak.position.y = Math.abs(Math.sin(t * 2.2 + d.phase)) * 0.06;
      }
      for (const c of climbers.climbers) {
        c.position.y = c.userData.baseY + Math.sin(t * 2.0 + c.userData.phase) * 0.09;
        c.rotation.z = Math.sin(t * 1.6 + c.userData.phase) * 0.035;
      }
      for (const cloud of clouds.clouds) {
        cloud.sprite.position.x += cloud.speed * dt;
        if (cloud.sprite.position.x > cloud.range) cloud.sprite.position.x -= cloud.range * 2;
        if (cloud.sprite.position.x < -cloud.range) cloud.sprite.position.x += cloud.range * 2;
        cloud.sprite.position.y = cloud.baseY + Math.sin(t * 0.16 + cloud.phase) * 4;
      }
      const p = snowfall.positions;
      for (let i = 0; i < snowfall.count; i++) {
        p[i * 3 + 1] -= snowfall.speeds[i] * dt;
        p[i * 3] += Math.sin(t * 0.5 + i) * dt * 1.2;
        if (p[i * 3 + 1] < 0.5) {
          p[i * 3 + 1] = 330;
          p[i * 3] = -330 + rand(401, i + t) * 660;
        }
      }
      snowfall.points.geometry.attributes.position.needsUpdate = true;
      glow.material.opacity = 0.78 + Math.sin(t * 0.55) * 0.08;
      glow.sprite.scale.setScalar(548 + Math.sin(t * 0.4) * 14);
    },
  };

  return {
    group: merged,
    waterMaterials: [],
    life,
    mats,
    glow,
  };
}

export { buildEverestScene };


