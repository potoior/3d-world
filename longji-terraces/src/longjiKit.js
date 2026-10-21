import * as THREE from 'three';

const MAT = new Map();
export function mat(color, rough = 0.92, metal = 0, extra = null) {
  const key = color + ':' + rough + ':' + metal + ':' + (extra ? JSON.stringify(extra) : '');
  if (!MAT.has(key)) MAT.set(key, new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...(extra || {}) }));
  return MAT.get(key);
}

export const M = {
  wood: mat(0x5a4530, 0.94), woodLight: mat(0x8a6a45, 0.9), woodDark: mat(0x3e3022, 0.96),
  stone: mat(0x868270, 0.98), stoneDark: mat(0x686558, 1), pathStone: mat(0x9a9682, 0.97),
  roofTile: mat(0x404745, 0.9), roofRidge: mat(0x2c3130, 0.86), plaster: mat(0xa89d82, 0.95),
  clothRed: mat(0x9a3d32, 0.9), clothBlue: mat(0x33475d, 0.92), gold: mat(0xc79a4c, 0.62, 0.18),
  bamboo: mat(0x76924a, 0.9), bambooDark: mat(0x557238, 0.94), leaf: mat(0x4c6d3a, 0.95),
  leafDeep: mat(0x38552f, 0.96), forest: mat(0x3f5b35, 0.97), earth: mat(0x745b3e, 1),
  earthDark: mat(0x5f4a33, 1), skin: mat(0xc59a74, 0.86),
  top: [mat(0x6f8a4f, 0.97), mat(0x7d9858, 0.97), mat(0x607d46, 0.98), mat(0x879a61, 0.97)],
  wall: [mat(0x7b6447, 0.99), mat(0x6c563d, 0.99), mat(0x887253, 0.98)],
};

export function addMesh(g, geo, m, x, y, z, rx = 0, ry = 0, rz = 0) {
  const o = new THREE.Mesh(geo, m);
  o.position.set(x, y, z);
  o.rotation.set(rx, ry, rz);
  o.castShadow = true;
  o.receiveShadow = true;
  g.add(o);
  return o;
}

export function box(g, w, h, d, m, x, y, z, ry = 0, rx = 0, rz = 0) {
  return addMesh(g, new THREE.BoxGeometry(w, h, d), m, x, y, z, rx, ry, rz);
}

export function cyl(g, rt, rb, h, seg, m, x, y, z, rx = 0, ry = 0, rz = 0) {
  return addMesh(g, new THREE.CylinderGeometry(rt, rb, h, seg), m, x, y, z, rx, ry, rz);
}

export function gableRoof(g, x, y, z, w, d, h, ry, roofMat = M.roofTile) {
  const slope = Math.atan2(h, d * 0.5);
  const len = Math.hypot(h, d * 0.5) * 1.06;
  for (const s of [-1, 1]) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(w, 0.16, len), roofMat);
    panel.position.set(x, y + h * 0.48, z + s * d * 0.245);
    panel.rotation.set(s * slope, ry, 0);
    panel.castShadow = true;
    panel.receiveShadow = true;
    g.add(panel);
  }
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.24, 0.36), M.roofRidge);
  ridge.position.set(x, y + h * 0.98, z);
  ridge.rotation.y = ry;
  ridge.castShadow = true;
  g.add(ridge);
}

export function pathStairs(g, x1, z1, y1, x2, z2, y2, width, count) {
  const ry = Math.atan2(x2 - x1, z2 - z1);
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    box(g, width, 0.36, 1.55, M.pathStone, x1 + (x2 - x1) * t, y1 + (y2 - y1) * t - 0.18, z1 + (z2 - z1) * t, ry);
  }
}

export function makeMistTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 256, 128);
  for (let i = 0; i < 40; i++) {
    const x = 24 + Math.random() * 208;
    const y = 42 + Math.random() * 48;
    const r = 16 + Math.random() * 46;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, 'rgba(248,251,248,0.32)');
    grad.addColorStop(0.55, 'rgba(238,246,243,0.14)');
    grad.addColorStop(1, 'rgba(238,246,243,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
