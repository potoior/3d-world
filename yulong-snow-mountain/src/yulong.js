import * as THREE from 'three';
import { addBox, addCylinder, mergedMesh, mergeStaticGroup } from './geometry.js';
import { makeWaterMaterial } from './materials.js';

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
  texture.anisotropy = 8;
  return texture;
}

const PEAKS = [
  { x: 30, z: 805, h: 720, rx: 575, rz: 500, e: 1.42 },
  { x: -430, z: 845, h: 430, rx: 365, rz: 335, e: 1.6 },
  { x: 475, z: 885, h: 470, rx: 385, rz: 345, e: 1.55 },
  { x: -205, z: 1090, h: 400, rx: 425, rz: 375, e: 1.62 },
  { x: 265, z: 1140, h: 435, rx: 435, rz: 385, e: 1.56 },
  { x: -885, z: 1135, h: 330, rx: 505, rz: 435, e: 1.7 },
  { x: 905, z: 1175, h: 355, rx: 505, rz: 435, e: 1.7 },
  { x: -660, z: 710, h: 245, rx: 335, rz: 305, e: 1.8 },
  { x: 710, z: 750, h: 265, rx: 345, rz: 315, e: 1.8 },
];

export function heightAt(x, z) {
  let h = 0.3 + 0.9 * Math.sin(x * 0.021 + 0.7) * Math.sin(z * 0.016 - 0.4) + 0.45 * Math.sin(x * 0.061 + z * 0.043);
  h += smoothstep(130, 680, z) * 11;
  for (const p of PEAKS) {
    const dx = (x - p.x) / p.rx;
    const dz = (z - p.z) / p.rz;
    const d = Math.sqrt(dx * dx + dz * dz);
    if (d < 1) h += p.h * Math.pow(1 - d, p.e);
  }
  const massif = smoothstep(300, 720, z);
  h += massif * (9 * Math.sin(x * 0.039 + z * 0.017) + 4.5 * Math.sin(x * 0.098 - z * 0.031));
  h += massif * 7 * Math.sin(x * 0.017 + 1.2) * Math.sin(z * 0.012 + 0.4);
  return Math.max(0, h);
}

function makePoolPoly(cx, cz, rx, rz, seed, count = 30) {
  const pts = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const wob = 1 + 0.12 * Math.sin(a * 3 + seed) + 0.06 * Math.sin(a * 5 - seed * 1.4) + 0.035 * Math.cos(a * 7 + seed);
    pts.push([cx + Math.cos(a) * rx * wob, cz + Math.sin(a) * rz * wob]);
  }
  return pts;
}

const POOLS = [
  { poly: makePoolPoly(-170, -62, 54, 37, 1.4), level: 13.6 },
  { poly: makePoolPoly(-207, -145, 64, 45, 3.1), level: 9.6 },
  { poly: makePoolPoly(-176, -232, 73, 52, 5.7), level: 6.1 },
  { poly: makePoolPoly(-214, -326, 86, 61, 8.2), level: 2.7 },
];

function pointInPoly(x, z, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0];
    const zi = poly[i][1];
    const xj = poly[j][0];
    const zj = poly[j][1];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

function insideAnyPool(x, z, margin = 0) {
  for (const p of POOLS) {
    if (margin === 0) {
      if (pointInPoly(x, z, p.poly)) return true;
    } else {
      let min = Infinity;
      for (let i = 0; i < p.poly.length; i++) {
        const a = p.poly[i];
        const b = p.poly[(i + 1) % p.poly.length];
        const vx = b[0] - a[0];
        const vz = b[1] - a[1];
        const len2 = vx * vx + vz * vz || 1;
        const t = Math.max(0, Math.min(1, ((x - a[0]) * vx + (z - a[1]) * vz) / len2));
        min = Math.min(min, Math.hypot(x - a[0] - vx * t, z - a[1] - vz * t));
      }
      if (min < margin) return true;
    }
  }
  return false;
}

function makeShape(poly, scale = 1) {
  const shape = new THREE.Shape();
  poly.forEach(([x, z], i) => {
    const px = x * scale;
    const pz = z * scale;
    if (i === 0) shape.moveTo(px, -pz);
    else shape.lineTo(px, -pz);
  });
  shape.closePath();
  return shape;
}

function flatPolyGeometry(poly, y, scale = 1) {
  const geo = new THREE.ShapeGeometry(makeShape(poly, scale), 1);
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, y, 0);
  return geo;
}

function ringGeometry(poly, innerScale, outerScale, y) {
  const shape = makeShape(poly, outerScale);
  const hole = new THREE.Path();
  poly.forEach(([x, z], i) => {
    const px = x * innerScale;
    const pz = z * innerScale;
    if (i === 0) hole.moveTo(px, -pz);
    else hole.lineTo(px, -pz);
  });
  hole.closePath();
  shape.holes.push(hole);
  const geo = new THREE.ShapeGeometry(shape, 1);
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, y, 0);
  return geo;
}

function makeMeadowTexture() {
  const tex = canvasTexture(512, 512, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#789a48');
    grad.addColorStop(0.42, '#89a957');
    grad.addColorStop(0.72, '#6f8f43');
    grad.addColorStop(1, '#829f4d');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) {
      const x = rand(3, i) * w;
      const y = rand(7, i) * h;
      const l = 1 + rand(11, i) * 5.5;
      const tone = rand(13, i);
      g.strokeStyle = tone > 0.7 ? 'rgba(200,207,132,0.38)' : tone > 0.36 ? 'rgba(83,108,48,0.44)' : 'rgba(151,168,83,0.3)';
      g.lineWidth = 0.8 + rand(15, i);
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + (rand(17, i) - 0.5) * 3.6, y - l);
      g.stroke();
    }
    for (let i = 0; i < 260; i++) {
      g.fillStyle = rand(19, i) > 0.55 ? 'rgba(225,207,104,0.32)' : 'rgba(240,239,214,0.24)';
      g.beginPath();
      g.arc(rand(23, i) * w, rand(29, i) * h, 0.7 + rand(31, i) * 1.8, 0, 6.283);
      g.fill();
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(20, 20);
  return tex;
}

function makeTravertineTexture() {
  const tex = canvasTexture(512, 512, (g, w, h) => {
    g.fillStyle = '#ebe6d6';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 120; i++) {
      g.strokeStyle = rand(41, i) > 0.5 ? 'rgba(255,255,248,0.34)' : 'rgba(157,168,148,0.19)';
      g.lineWidth = 1 + rand(43, i) * 4;
      g.beginPath();
      const y = rand(47, i) * h;
      g.moveTo(0, y);
      g.bezierCurveTo(w * 0.3, y + (rand(49, i) - 0.5) * 30, w * 0.66, y + (rand(53, i) - 0.5) * 34, w, y + (rand(59, i) - 0.5) * 24);
      g.stroke();
    }
    for (let i = 0; i < 1800; i++) {
      g.fillStyle = rand(61, i) > 0.5 ? 'rgba(200,214,198,0.18)' : 'rgba(255,255,250,0.34)';
      g.beginPath();
      g.arc(rand(67, i) * w, rand(71, i) * h, 0.6 + rand(73, i) * 2.6, 0, 6.283);
      g.fill();
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 8);
  return tex;
}

function makeCloudTexture() {
  return canvasTexture(512, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    for (let i = 0; i < 42; i++) {
      const x = w * (0.06 + rand(3, i) * 0.88);
      const y = h * (0.32 + rand(7, i) * 0.36);
      const r = 22 + rand(11, i) * 68;
      const grad = g.createRadialGradient(x, y, 1, x, y, r);
      grad.addColorStop(0, 'rgba(255,255,255,0.74)');
      grad.addColorStop(0.5, 'rgba(247,250,250,0.34)');
      grad.addColorStop(1, 'rgba(238,246,248,0)');
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
    grad.addColorStop(0, 'rgba(255,249,222,0.98)');
    grad.addColorStop(0.22, 'rgba(255,220,150,0.68)');
    grad.addColorStop(0.52, 'rgba(255,178,96,0.2)');
    grad.addColorStop(1, 'rgba(255,150,80,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
  });
}

function makeSnowTexture() {
  return canvasTexture(64, 64, (g, w, h) => {
    const grad = g.createRadialGradient(32, 32, 1, 32, 32, 30);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.45, 'rgba(240,248,252,0.82)');
    grad.addColorStop(1, 'rgba(230,242,250,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
  });
}

function makeFlowerTexture() {
  return canvasTexture(64, 64, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      g.fillStyle = 'rgba(255,250,224,0.95)';
      g.beginPath();
      g.ellipse(32 + Math.cos(a) * 9, 32 + Math.sin(a) * 9, 6, 4.2, a, 0, 6.283);
      g.fill();
    }
    g.fillStyle = 'rgba(242,196,76,0.95)';
    g.beginPath();
    g.arc(32, 32, 5, 0, 6.283);
    g.fill();
  });
}

function makeSignTexture(title, sub, dark = false) {
  return canvasTexture(512, 172, (g, w, h) => {
    g.fillStyle = dark ? '#1b2526' : '#64472d';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(228,193,124,0.78)';
    g.lineWidth = 4;
    g.strokeRect(10, 10, w - 20, h - 20);
    for (let i = 0; i < 220; i++) {
      g.fillStyle = rand(83, i) > 0.5 ? 'rgba(255,231,181,0.05)' : 'rgba(24,14,8,0.1)';
      g.fillRect(rand(89, i) * w, rand(97, i) * h, 2 + rand(101, i) * 54, 1);
    }
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#f6e9c8';
    g.font = '600 66px "Noto Serif CJK SC", "Songti SC", serif';
    g.fillText(title, w / 2, 78);
    g.fillStyle = 'rgba(235,211,158,0.78)';
    g.font = '500 20px "Helvetica Neue", Arial, sans-serif';
    g.fillText(sub, w / 2, 130);
  });
}

function makeMaterials() {
  return {
    rock: new THREE.MeshStandardMaterial({ color: 0x746f65, roughness: 0.98, flatShading: true }),
    rockDark: new THREE.MeshStandardMaterial({ color: 0x49463f, roughness: 1, flatShading: true }),
    snow: new THREE.MeshStandardMaterial({ color: 0xf5f8f7, roughness: 0.58, metalness: 0.01 }),
    snowBlue: new THREE.MeshStandardMaterial({ color: 0xcfdfe8, roughness: 0.52 }),
    ice: new THREE.MeshStandardMaterial({ color: 0x8fd4dc, roughness: 0.18, metalness: 0.1, emissive: 0x1c6a78, emissiveIntensity: 0.32 }),
    icePale: new THREE.MeshStandardMaterial({ color: 0xc7eef0, roughness: 0.16, metalness: 0.08, emissive: 0x1b5d68, emissiveIntensity: 0.24 }),
    crevass: new THREE.MeshStandardMaterial({ color: 0x1a6076, roughness: 0.42, emissive: 0x0d3a48, emissiveIntensity: 0.3 }),
    moraine: new THREE.MeshStandardMaterial({ color: 0x6a6257, roughness: 1, flatShading: true }),
    moraineDark: new THREE.MeshStandardMaterial({ color: 0x453f38, roughness: 1, flatShading: true }),
    travertine: new THREE.MeshStandardMaterial({ map: makeTravertineTexture(), color: 0xffffff, roughness: 0.9 }),
    travertineWarm: new THREE.MeshStandardMaterial({ color: 0xe7dfc9, roughness: 0.94 }),
    bed: new THREE.MeshStandardMaterial({ color: 0x6fc4bd, roughness: 0.8, emissive: 0x0f5353, emissiveIntensity: 0.24 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x7c5b3a, roughness: 0.92 }),
    woodDark: new THREE.MeshStandardMaterial({ color: 0x4b3827, roughness: 0.95 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x818b8c, roughness: 0.44, metalness: 0.62 }),
    rope: new THREE.MeshStandardMaterial({ color: 0x5d584b, roughness: 0.94 }),
    fur: new THREE.MeshStandardMaterial({ color: 0x2c2720, roughness: 0.98, flatShading: true }),
    shag: new THREE.MeshStandardMaterial({ color: 0x453a2d, roughness: 1, flatShading: true }),
    horn: new THREE.MeshStandardMaterial({ color: 0xd6cdb3, roughness: 0.72 }),
    grass: new THREE.MeshStandardMaterial({ color: 0x7d9b4d, roughness: 0.92, flatShading: true }),
    flower: new THREE.PointsMaterial({ map: makeFlowerTexture(), size: 0.78, transparent: true, alphaTest: 0.15, depthWrite: false, vertexColors: true, sizeAttenuation: true }),
    bird: new THREE.MeshBasicMaterial({ color: 0x2e3434, side: THREE.DoubleSide }),
  };
}

function buildTerrain() {
  const geo = new THREE.PlaneGeometry(3000, 2600, 320, 260);
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, 0, 620);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setY(i, heightAt(pos.getX(i), pos.getZ(i)));
  }
  geo.computeVertexNormals();
  const normal = geo.attributes.normal;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  const snow = new THREE.Color(0xf3f7f7);
  const snowBlue = new THREE.Color(0xc3d9e5);
  const snowWarm = new THREE.Color(0xffe8ca);
  const rock = new THREE.Color(0x706a61);
  const rockWarm = new THREE.Color(0x8b7c69);
  const rockDark = new THREE.Color(0x4c4843);
  const forest = new THREE.Color(0x435f3e);
  const forestDark = new THREE.Color(0x344b36);
  const meadow = new THREE.Color(0x7c9a4c);
  const meadowWarm = new THREE.Color(0xa8a95b);
  const scree = new THREE.Color(0x8d8879);
  const travertine = new THREE.Color(0xb9bfa5);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const h = pos.getY(i);
    const up = normal.getY(i);
    const patch = 0.5 + 0.5 * Math.sin(x * 0.058 + z * 0.047);
    const strata = 0.5 + 0.5 * Math.sin(h * 0.11 + x * 0.013 + z * 0.01);
    const snowLine = 242 + 38 * Math.sin(x * 0.0058 + 1.2) + 22 * Math.sin(z * 0.008) + 18 * Math.sin(x * 0.021 - z * 0.011);
    const jag = 24 * Math.sin(x * 0.033 + z * 0.021) + 11 * Math.sin(x * 0.091 - z * 0.049);
    if (h > snowLine + jag) {
      c.copy(snow).lerp(snowBlue, patch * 0.42).lerp(snowWarm, smoothstep(430, 760, h) * 0.32);
      if (up < 0.42) c.lerp(rockDark, smoothstep(0.42, 0.2, up) * 0.72);
      if (patch > 0.72 && h < snowLine + 95) c.lerp(snowBlue, 0.4);
    } else if (h > snowLine - 44 + jag * 0.6) {
      c.copy(rockWarm).lerp(rockDark, strata * 0.5).lerp(snow, patch * 0.52);
      if (up > 0.66) c.lerp(snow, 0.3);
    } else if (h > 145) {
      c.copy(rock).lerp(rockWarm, strata * 0.52).lerp(rockDark, patch * 0.3);
      if (up < 0.36) c.lerp(rockDark, 0.48);
      if (h < 215 && patch > 0.62) c.lerp(forestDark, 0.25);
    } else if (h > 24) {
      c.copy(scree).lerp(forest, 0.36 + patch * 0.3).lerp(rock, strata * 0.3);
      if (patch > 0.7) c.lerp(forestDark, 0.42);
      if (up < 0.4) c.lerp(rock, 0.48);
    } else if (h > 8) {
      c.copy(forest).lerp(forestDark, patch * 0.55).lerp(meadow, smoothstep(8, 2, h) * 0.5);
    } else {
      c.copy(meadow).lerp(meadowWarm, patch * 0.32).lerp(forest, smoothstep(-40, 80, z) * 0.2);
      if (x < -60 && z > -430 && z < 40) c.lerp(travertine, 0.28);
      if (up < 0.55) c.lerp(rock, 0.3);
    }
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.97, metalness: 0, flatShading: false });
  const mesh = new THREE.Mesh(geo, material);
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  mesh.name = 'yulong-terrain';
  return mesh;
}

function sideGeometry(poly, topScale, bottomScale, topY, bottomY) {
  const positions = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const at = [a[0] * topScale, a[1] * topScale];
    const bt = [b[0] * topScale, b[1] * topScale];
    const ab = [a[0] * bottomScale, a[1] * bottomScale];
    const bb = [b[0] * bottomScale, b[1] * bottomScale];
    positions.push(
      at[0], topY, at[1], ab[0], bottomY, ab[1], bt[0], topY, bt[1],
      bt[0], topY, bt[1], ab[0], bottomY, ab[1], bb[0], bottomY, bb[1]
    );
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  return geo;
}

function createBlueMoon(mats, waterMaterial) {
  const group = new THREE.Group();
  const beds = [];
  const rims = [];
  const aprons = [];
  const sides = [];
  const waterMeshes = [];
  POOLS.forEach((pool, index) => {
    const base = Math.min(pool.level - 2.8, Math.max(0.35, heightAt(pool.poly[0][0], pool.poly[0][1]) + 0.1));
    beds.push(flatPolyGeometry(pool.poly, pool.level - 0.38, 1.03));
    rims.push(ringGeometry(pool.poly, 1.01, 1.15, pool.level + 0.24));
    aprons.push(ringGeometry(pool.poly, 1.15, 1.48, pool.level + 0.06));
    aprons.push(ringGeometry(pool.poly, 1.48, 1.82, pool.level - 0.26));
    sides.push(sideGeometry(pool.poly, 1.47, 1.56, pool.level + 0.05, base));
    sides.push(sideGeometry(pool.poly, 1.82, 1.9, pool.level - 0.27, base - 0.25));
    const water = new THREE.Mesh(flatPolyGeometry(pool.poly, pool.level, 1.0), waterMaterial);
    water.renderOrder = 2;
    waterMeshes.push(water);
    group.add(water);
    const inner = new THREE.Mesh(flatPolyGeometry(pool.poly, pool.level + 0.025, 0.87), new THREE.MeshBasicMaterial({ color: 0x8fe4d8, transparent: true, opacity: 0.15, depthWrite: false }));
    inner.renderOrder = 3;
    group.add(inner);
    if (index === 0) {
      const shallow = new THREE.Mesh(flatPolyGeometry(pool.poly, pool.level + 0.035, 0.55), new THREE.MeshBasicMaterial({ color: 0xb8f2e5, transparent: true, opacity: 0.2, depthWrite: false }));
      shallow.renderOrder = 4;
      group.add(shallow);
    }
  });
  const bedMesh = mergedMesh(beds, mats.bed, false, false);
  if (bedMesh) group.add(bedMesh);
  const rimMesh = mergedMesh(rims, mats.travertine, false, true);
  if (rimMesh) group.add(rimMesh);
  const apronMesh = mergedMesh(aprons, mats.travertineWarm, false, true);
  if (apronMesh) group.add(apronMesh);
  const sideMesh = mergedMesh(sides, mats.travertine, true, true);
  if (sideMesh) group.add(sideMesh);

  const stoneInst = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), mats.travertine, 150);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  const e = new THREE.Euler();
  let n = 0;
  POOLS.forEach((pool, pi) => {
    for (let i = 0; i < 38 && n < 150; i++, n++) {
      const idx = Math.floor(rand(301 + pi, i) * pool.poly.length);
      const a = pool.poly[idx];
      const b = pool.poly[(idx + 1) % pool.poly.length];
      const t = rand(307 + pi, i);
      const x = (a[0] + (b[0] - a[0]) * t) * (1.2 + rand(311 + pi, i) * 0.55);
      const z = (a[1] + (b[1] - a[1]) * t) * (1.2 + rand(313 + pi, i) * 0.55);
      p.set(x, pool.level + 0.15 + rand(317 + pi, i) * 1.7, z);
      e.set(rand(319 + pi, i) * 2, rand(323 + pi, i) * 6.28, rand(331 + pi, i) * 2);
      q.setFromEuler(e);
      s.set(0.5 + rand(337 + pi, i) * 2.2, 0.35 + rand(347 + pi, i) * 1.1, 0.5 + rand(349 + pi, i) * 2.1);
      m.compose(p, q, s);
      stoneInst.setMatrixAt(n, m);
    }
  });
  stoneInst.castShadow = false;
  stoneInst.receiveShadow = true;
  group.add(stoneInst);

  const falls = [];
  const fallA = makeFall(-196, 11.4, -96, -212, 7.2, -124, 13);
  const fallB = makeFall(-206, 7.6, -182, -190, 4.1, -205, 15);
  fallA.forEach((mesh) => group.add(mesh));
  fallB.forEach((mesh) => group.add(mesh));
  falls.push(fallA, fallB);
  return { group, waterMeshes, falls };
}

function makeFall(x1, y1, z1, x2, y2, z2, width) {
  const dir = new THREE.Vector3(x2 - x1, y2 - y1, z2 - z1).normalize();
  const side = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
  const positions = [];
  const uvs = [];
  const steps = 12;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = x1 + (x2 - x1) * t;
    const y = y1 + (y2 - y1) * t - Math.sin(t * Math.PI) * 0.7;
    const z = z1 + (z2 - z1) * t;
    const w = width * (0.7 + t * 0.35);
    positions.push(x + side.x * w, y, z + side.z * w, x - side.x * w, y, z - side.z * w);
    uvs.push(0, t * 4, 1, t * 4);
  }
  const indices = [];
  for (let i = 0; i < steps; i++) {
    const a = i * 2;
    indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uSun: { value: new THREE.Color(0xfff2d2) },
      uSunDir: { value: new THREE.Vector3(0.4, 0.8, 0.3).normalize() },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uSun;
      varying vec2 vUv;
      void main() {
        float streak = sin(vUv.y * 36.0 - uTime * 9.0 + sin(vUv.x * 12.0) * 2.0) * 0.5 + 0.5;
        float fine = sin(vUv.y * 90.0 - uTime * 15.0 + vUv.x * 20.0) * 0.5 + 0.5;
        float edge = smoothstep(0.5, 0.94, abs(vUv.x * 2.0 - 1.0));
        float foam = smoothstep(0.62, 1.0, streak * 0.7 + fine * 0.3);
        vec3 col = mix(vec3(0.42, 0.84, 0.82), vec3(0.94, 1.0, 0.97), foam * 0.75);
        col = mix(col, vec3(0.95, 1.0, 0.98), edge * 0.62);
        col += uSun * foam * 0.14;
        gl_FragColor = vec4(col, 0.84);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, material);
  mesh.renderOrder = 2;
  const foamMaterial = new THREE.MeshBasicMaterial({ color: 0xeafaf3, transparent: true, opacity: 0.62, depthWrite: false });
  const foam = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6), foamMaterial);
  foam.scale.set(width * 0.72, 0.55, width * 0.3);
  foam.position.set(x2, y2 + 0.35, z2);
  foam.renderOrder = 3;
  return [mesh, foam];
}

function createRidgeBlades(root, mats) {
  const rockList = [];
  const snowList = [];
  const blades = [
    [30, 800, 660, 175, 22, 42, 0.1],
    [-36, 790, 620, 150, 19, 36, -0.3],
    [92, 775, 590, 138, 18, 33, 0.5],
    [-102, 780, 575, 126, 17, 31, -0.55],
    [-160, 748, 505, 108, 15, 28, -0.85],
    [160, 752, 510, 112, 15, 29, 0.9],
    [-228, 790, 520, 122, 18, 34, -1.1],
    [238, 795, 535, 128, 18, 34, 1.1],
    [4, 764, 560, 118, 14, 25, 0.0],
    [-70, 842, 620, 100, 13, 24, -0.3],
    [118, 846, 610, 104, 13, 24, 0.3],
    [-350, 850, 430, 105, 20, 38, -1.4],
    [380, 880, 460, 118, 21, 40, 1.35],
    [-520, 900, 380, 92, 22, 42, -1.65],
    [540, 930, 410, 100, 22, 42, 1.6],
    [-170, 940, 400, 90, 24, 44, -0.9],
    [205, 970, 425, 96, 24, 44, 0.85],
  ];
  for (const [x, z, y, h, w, d, rot] of blades) {
    const base = Math.max(heightAt(x, z) - 45, y);
    const rock = new THREE.ConeGeometry(1, 1, 4, 1);
    rock.rotateY(rot);
    rock.scale(w, h, d);
    rock.translate(x, base + h * 0.5, z);
    rockList.push(rock);
    const cap = new THREE.ConeGeometry(1, 1, 4, 1);
    cap.rotateY(rot);
    cap.scale(w * 0.5, h * 0.46, d * 0.52);
    cap.translate(x, base + h * 0.79, z);
    snowList.push(cap);
  }
  const rockMesh = mergedMesh(rockList, mats.rockDark, true, true);
  if (rockMesh) root.add(rockMesh);
  const snowMesh = mergedMesh(snowList, mats.snow, true, true);
  if (snowMesh) root.add(snowMesh);
}

function createGlacier(root, mats) {
  const spine = [
    [58, 232, 26], [48, 278, 34], [34, 326, 43], [44, 374, 54],
    [60, 424, 68], [46, 474, 82], [28, 524, 96], [34, 574, 106], [44, 626, 114],
  ];
  const N = 56;
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
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const len = Math.hypot(dx, dz) || 1;
    const nx = -dz / len;
    const nz = dx / len;
    const wob = 0.9 + 0.12 * Math.sin(t * 13.0 + 0.7) + 0.05 * Math.sin(t * 29.0);
    const y = heightAt(cx, cz) + 3.2 + Math.sin(t * 18) * 0.9;
    rows.push({ c: new THREE.Vector3(cx, y, cz), n: new THREE.Vector3(nx, 0, nz), w: width * wob });
  }
  const pos = [];
  const uvs = [];
  for (let i = 0; i < N; i++) {
    const a = rows[i];
    const b = rows[i + 1];
    const al = a.c.clone().addScaledVector(a.n, -a.w * 0.5);
    const ar = a.c.clone().addScaledVector(a.n, a.w * 0.5);
    const bl = b.c.clone().addScaledVector(b.n, -b.w * 0.5);
    const br = b.c.clone().addScaledVector(b.n, b.w * 0.5);
    pos.push(al.x, al.y, al.z, bl.x, bl.y, bl.z, br.x, br.y, br.z);
    pos.push(al.x, al.y, al.z, br.x, br.y, br.z, ar.x, ar.y, ar.z);
    uvs.push(0, i * 0.5, 0, (i + 1) * 0.5, 1, (i + 1) * 0.5);
    uvs.push(0, i * 0.5, 1, (i + 1) * 0.5, 1, i * 0.5);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.computeVertexNormals();
  const ice = new THREE.MeshStandardMaterial({
    color: 0xa8e3e8, roughness: 0.2, metalness: 0.08,
    emissive: 0x1d6774, emissiveIntensity: 0.28, transparent: true, opacity: 0.96,
  });
  const glacier = new THREE.Mesh(geo, ice);
  glacier.receiveShadow = true;
  root.add(glacier);

  const snowEdges = [];
  for (const side of [-1, 1]) {
    const pts = [];
    for (let i = 0; i <= N; i += 2) {
      const r = rows[i];
      const edge = r.c.clone().addScaledVector(r.n, side * r.w * 0.58);
      pts.push(edge);
    }
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const g = new THREE.BoxGeometry(7 + rand(401, i + side * 50) * 4, 1.2, a.distanceTo(b) + 2);
      g.rotateY(Math.atan2(b.x - a.x, b.z - a.z));
      g.translate((a.x + b.x) / 2, (a.y + b.y) / 2 - 0.4, (a.z + b.z) / 2);
      snowEdges.push(g);
    }
  }
  const edgeMesh = mergedMesh(snowEdges, mats.snow, false, true);
  if (edgeMesh) root.add(edgeMesh);

  const crevs = [];
  for (let i = 0; i < 74; i++) {
    const row = rows[Math.floor(rand(411, i) * (rows.length - 1))];
    const side = (rand(419, i) - 0.5) * row.w * 0.8;
    const x = row.c.x + row.n.x * side;
    const z = row.c.z + row.n.z * side;
    const length = 2.4 + rand(421, i) * 9;
    const g = new THREE.BoxGeometry(0.35 + rand(431, i) * 0.55, 0.18, length);
    g.rotateY(Math.atan2(row.n.z, row.n.x) + (rand(433, i) - 0.5) * 0.7);
    g.rotateZ((rand(439, i) - 0.5) * 0.14);
    g.translate(x, row.c.y + 0.14, z);
    crevs.push(g);
  }
  const crevMesh = mergedMesh(crevs, mats.crevass, false, true);
  if (crevMesh) root.add(crevMesh);

  const pinnacleGeo = new THREE.ConeGeometry(1, 1, 5);
  const pillarInst = new THREE.InstancedMesh(pinnacleGeo, mats.icePale, 70);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  const e = new THREE.Euler();
  for (let i = 0; i < 70; i++) {
    const row = rows[Math.floor(rand(443, i) * (rows.length - 1))];
    const side = (rand(449, i) - 0.5) * row.w * 0.9;
    const h = 3 + rand(457, i) * 11;
    p.set(row.c.x + row.n.x * side, row.c.y + h * 0.5, row.c.z + row.n.z * side);
    e.set((rand(461, i) - 0.5) * 0.1, rand(463, i) * 6.28, (rand(467, i) - 0.5) * 0.24);
    q.setFromEuler(e);
    s.set(1.2 + rand(479, i) * 2.8, h, 1.2 + rand(487, i) * 2.8);
    m.compose(p, q, s);
    pillarInst.setMatrixAt(i, m);
  }
  pillarInst.castShadow = true;
  root.add(pillarInst);

  const erraticList = [];
  for (let i = 0; i < 34; i++) {
    const row = rows[Math.floor(rand(491, i) * (rows.length - 1))];
    const side = (rand(499, i) > 0.5 ? 1 : -1) * row.w * (0.62 + rand(503, i) * 0.25);
    const size = 1.2 + rand(509, i) * 4.4;
    const g = new THREE.DodecahedronGeometry(1, 0);
    g.scale(size, size * 0.7, size * 1.2);
    g.rotateX(rand(521, i) * 3);
    g.rotateY(rand(523, i) * 3);
    g.translate(row.c.x + row.n.x * side, row.c.y + size * 0.22, row.c.z + row.n.z * side);
    erraticList.push(g);
  }
  const erraticMesh = mergedMesh(erraticList, mats.moraineDark, true, true);
  if (erraticMesh) root.add(erraticMesh);
}

function createGlacierStation(root, mats) {
  const gx = 205;
  const gz = 292;
  const gy = heightAt(gx, gz);
  const deck = [];
  const rails = [];
  const posts = [];
  for (let i = 0; i < 8; i++) {
    addBox(deck, 4.1, 0.24, 26, gx + 16 + i * 4.4, gy + 0.85, gz + 3);
  }
  for (const side of [-1, 1]) {
    for (let i = 0; i < 10; i++) {
      addBox(posts, 0.18, 1.3, 0.18, gx + 16 + (side > 0 ? 30 : 0), gy + 1.6, gz - 10 + i * 3);
    }
    addBox(rails, 31, 0.11, 0.13, gx + 31, gy + 2.2, gz - 10);
    addBox(rails, 31, 0.11, 0.13, gx + 31, gy + 2.2, gz + 13);
  }
  const deckMesh = mergedMesh(deck, mats.wood, true, true);
  const postMesh = mergedMesh(posts, mats.woodDark, true, true);
  const railMesh = mergedMesh(rails, mats.metal, true, false);
  if (deckMesh) root.add(deckMesh);
  if (postMesh) root.add(postMesh);
  if (railMesh) root.add(railMesh);

  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(13, 4.3),
    new THREE.MeshStandardMaterial({ map: makeSignTexture('冰川公园', 'GLACIER PARK · 4506 M', true), roughness: 0.76, side: THREE.DoubleSide })
  );
  sign.position.set(gx + 30, gy + 5.5, gz + 16);
  sign.rotation.y = -0.25;
  sign.castShadow = true;
  root.add(sign);
  const signPosts = [];
  addCylinder(signPosts, 0.18, 0.18, 5.4, 7, gx + 25, gy + 2.7, gz + 16);
  addCylinder(signPosts, 0.18, 0.18, 5.4, 7, gx + 35, gy + 2.7, gz + 16);
  const postM = mergedMesh(signPosts, mats.metal, true, false);
  if (postM) root.add(postM);

  const hikers = [];
  for (const [x, z, color] of [[gx + 18, gz + 4, 0xc65a37], [gx + 23, gz + 8, 0x2f6c8e], [gx + 28, gz - 2, 0xd9a63a]]) {
    const body = new THREE.ConeGeometry(0.5, 2.3, 6);
    body.translate(x, gy + 2.5, z);
    hikers.push(body);
  }
  const hikerMesh = mergedMesh(hikers, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 }), true, false);
  if (hikerMesh) root.add(hikerMesh);
}

function createForest(mats) {
  const trunkList = [];
  const trunk = new THREE.CylinderGeometry(0.12, 0.28, 4.4, 6);
  trunk.translate(0, 2.2, 0);
  trunkList.push(trunk);
  const trunkGeo = mergedMesh(trunkList, mats.woodDark, false, false).geometry;
  const needles = [];
  for (let i = 0; i < 6; i++) {
    const f = i / 5;
    const r = 2.4 * (1 - f * 0.72);
    const cone = new THREE.ConeGeometry(r, 4.0 - f * 1.0, 6);
    cone.rotateY(rand(601, i) * 6.28);
    cone.translate((rand(603, i) - 0.5) * 0.3, 4.0 + i * 1.55, (rand(607, i) - 0.5) * 0.3);
    needles.push(cone);
  }
  const needleGeo = mergedMesh(needles, mats.rock, false, false).geometry;

  const sway = { value: 0 };
  const needleMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.93, flatShading: true });
  needleMat.onBeforeCompile = (shader) => {
    shader.uniforms.uSwayTime = sway;
    shader.vertexShader = 'uniform float uSwayTime;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      #ifdef USE_INSTANCING
        vec3 iw = instanceMatrix[3].xyz;
        float sw = sin(uSwayTime * 0.85 + iw.x * 0.055 + iw.z * 0.045);
        transformed.x += sw * max(transformed.y, 0.0) * 0.0085;
        transformed.z += cos(uSwayTime * 0.63 + iw.x * 0.035) * max(transformed.y, 0.0) * 0.005;
      #endif`
    );
  };
  needleMat.customProgramCacheKey = () => 'yulong-tree-sway';

  const clusters = [
    [-430, -260, 150, 52], [-520, -20, 140, 50], [-390, 175, 128, 44],
    [-575, -120, 150, 42], [-330, 330, 100, 40], [-610, 350, 130, 34],
    [470, -235, 145, 52], [565, 5, 145, 50], [485, 225, 130, 44],
    [660, 115, 140, 38], [390, 365, 105, 40], [630, -350, 120, 32],
    [-270, 375, 92, 32], [-80, 430, 100, 26], [255, 400, 100, 30],
    [350, 470, 112, 28], [-470, 455, 120, 28], [-720, 120, 120, 26],
    [760, 235, 140, 26], [-350, 80, 90, 22], [320, 150, 84, 20],
  ];
  const positions = [];
  for (let ci = 0; ci < clusters.length; ci++) {
    const [cx, cz, radius, count] = clusters[ci];
    for (let i = 0; i < count; i++) {
      const a = rand(611 + ci, i) * 6.283;
      const d = Math.sqrt(rand(613 + ci, i)) * radius;
      const x = cx + Math.cos(a) * d;
      const z = cz + Math.sin(a) * d;
      if (insideAnyPool(x, z, 14)) continue;
      if (x > -90 && x < 330 && z > -430 && z < -70) continue;
      const h = heightAt(x, z);
      if (h > 310) continue;
      positions.push({ x, z, h, seed: ci * 100 + i });
    }
  }
  const count = positions.length;
  const foliage = new THREE.InstancedMesh(needleGeo, needleMat, count);
  const trunks = new THREE.InstancedMesh(trunkGeo, mats.woodDark, count);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  const e = new THREE.Euler();
  const color = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const t = positions[i];
    const scale = 0.72 + rand(617, t.seed) * 0.72 + smoothstep(120, 300, t.h) * 0.1;
    p.set(t.x, t.h - 0.35, t.z);
    e.set(0, rand(619, t.seed) * 6.283, (rand(623, t.seed) - 0.5) * 0.05);
    q.setFromEuler(e);
    s.set(scale * (0.85 + rand(627, t.seed) * 0.28), scale, scale * (0.85 + rand(629, t.seed) * 0.28));
    m.compose(p, q, s);
    foliage.setMatrixAt(i, m);
    trunks.setMatrixAt(i, m);
    color.setHSL(0.29 + rand(631, t.seed) * 0.04, 0.28 + rand(633, t.seed) * 0.16, 0.17 + rand(637, t.seed) * 0.09);
    foliage.setColorAt(i, color);
  }
  foliage.castShadow = false;
  foliage.receiveShadow = true;
  trunks.castShadow = false;
  foliage.name = 'yulong-spruce';
  return { group: (() => { const g = new THREE.Group(); g.add(trunks, foliage); return g; })(), sway, count };
}

function createRockField(mats) {
  const group = new THREE.Group();
  const geo = new THREE.DodecahedronGeometry(1, 0);
  const light = new THREE.InstancedMesh(geo, mats.moraine, 290);
  const dark = new THREE.InstancedMesh(geo, mats.moraineDark, 290);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  const e = new THREE.Euler();
  let li = 0;
  let di = 0;
  for (let i = 0; i < 700; i++) {
    let x;
    let z;
    const r = rand(701, i);
    if (r < 0.3) {
      x = -70 + rand(703, i) * 260;
      z = 190 + rand(709, i) * 330;
    } else if (r < 0.48) {
      x = (rand(711, i) > 0.5 ? 1 : -1) * (320 + rand(713, i) * 430);
      z = -420 + rand(719, i) * 720;
    } else {
      x = -520 + rand(721, i) * 1000;
      z = -460 + rand(727, i) * 760;
    }
    if (insideAnyPool(x, z, 4)) continue;
    if (x > -90 && x < 330 && z > -430 && z < -70 && rand(733, i) > 0.16) continue;
    const h = heightAt(x, z);
    if (h > 245) continue;
    const scale = 0.45 + Math.pow(rand(739, i), 2) * 5.2;
    p.set(x, h + scale * 0.3, z);
    e.set(rand(743, i) * 3, rand(751, i) * 6.28, rand(757, i) * 3);
    q.setFromEuler(e);
    s.set(scale * (0.8 + rand(761, i) * 0.6), scale * (0.5 + rand(769, i) * 0.55), scale * (0.8 + rand(773, i) * 0.6));
    m.compose(p, q, s);
    if (rand(787, i) > 0.46 && li < 290) light.setMatrixAt(li++, m);
    else if (di < 290) dark.setMatrixAt(di++, m);
  }
  light.count = li;
  dark.count = di;
  light.castShadow = true;
  light.receiveShadow = true;
  dark.castShadow = true;
  dark.receiveShadow = true;
  group.add(light, dark);
  return group;
}

function createMeadowDetail(mats) {
  const group = new THREE.Group();
  const bladeLists = [];
  for (let i = 0; i < 4; i++) {
    const geo = new THREE.ConeGeometry(0.07, 0.8 + rand(801, i) * 0.5, 3);
    geo.rotateZ((rand(803, i) - 0.5) * 0.5);
    geo.translate((rand(807, i) - 0.5) * 0.35, 0.42, (rand(809, i) - 0.5) * 0.35);
    bladeLists.push(geo);
  }
  const bladeGeo = mergedMesh(bladeLists, mats.grass, false, false).geometry;
  const sway = { value: 0 };
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.94, flatShading: true });
  bladeMat.onBeforeCompile = (shader) => {
    shader.uniforms.uSwayTime = sway;
    shader.vertexShader = 'uniform float uSwayTime;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      #ifdef USE_INSTANCING
        vec3 iw = instanceMatrix[3].xyz;
        transformed.x += sin(uSwayTime * 1.7 + iw.x * 0.2 + iw.z * 0.13) * max(transformed.y, 0.0) * 0.055;
      #endif`
    );
  };
  bladeMat.customProgramCacheKey = () => 'yulong-grass-sway';
  const count = 1500;
  const grass = new THREE.InstancedMesh(bladeGeo, bladeMat, count);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  const e = new THREE.Euler();
  const color = new THREE.Color();
  let n = 0;
  for (let i = 0; i < 4200 && n < count; i++) {
    let x;
    let z;
    if (rand(811, i) > 0.32) {
      x = -50 + rand(813, i) * 400;
      z = -470 + rand(817, i) * 420;
    } else {
      x = -480 + rand(821, i) * 900;
      z = -480 + rand(823, i) * 500;
    }
    if (insideAnyPool(x, z, 5)) continue;
    const h = heightAt(x, z);
    if (h > 12) continue;
    const scale = 0.75 + rand(827, i) * 1.5;
    p.set(x, h, z);
    e.set(0, rand(829, i) * 6.28, 0);
    q.setFromEuler(e);
    s.set(scale, scale * (0.8 + rand(839, i) * 0.8), scale);
    m.compose(p, q, s);
    grass.setMatrixAt(n, m);
    color.setHSL(0.23 + rand(841, i) * 0.06, 0.3 + rand(843, i) * 0.2, 0.25 + rand(847, i) * 0.12);
    grass.setColorAt(n, color);
    n++;
  }
  grass.count = n;
  grass.receiveShadow = true;
  group.add(grass);

  const flowerCount = 760;
  const positions = new Float32Array(flowerCount * 3);
  const colors = new Float32Array(flowerCount * 3);
  const c = new THREE.Color();
  let fn = 0;
  for (let i = 0; i < 2600 && fn < flowerCount; i++) {
    const x = -40 + rand(851, i) * 380;
    const z = -470 + rand(853, i) * 410;
    if (insideAnyPool(x, z, 4)) continue;
    const h = heightAt(x, z);
    if (h > 10) continue;
    positions[fn * 3] = x;
    positions[fn * 3 + 1] = h + 0.45 + rand(857, i) * 0.35;
    positions[fn * 3 + 2] = z;
    c.setHSL(rand(859, i) > 0.6 ? 0.13 : rand(861, i) > 0.5 ? 0.16 : 0.58, 0.55, 0.72);
    colors[fn * 3] = c.r;
    colors[fn * 3 + 1] = c.g;
    colors[fn * 3 + 2] = c.b;
    fn++;
  }
  const fg = new THREE.BufferGeometry();
  fg.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  fg.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const flowers = new THREE.Points(fg, mats.flower);
  flowers.frustumCulled = false;
  group.add(flowers);
  return { group, sway };
}

function addRod(list, ax, ay, az, bx, by, bz, r = 0.05, seg = 5) {
  const dx = bx - ax;
  const dy = by - ay;
  const dz = bz - az;
  const len = Math.hypot(dx, dy, dz);
  if (len < 0.0001) return;
  const g = new THREE.CylinderGeometry(r, r, len, seg);
  g.translate(0, len / 2, 0);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx, dy, dz).normalize());
  g.applyQuaternion(q);
  g.translate(ax, ay, az);
  list.push(g);
}

function createWalkway(mats) {
  const points = [
    [-108, -372], [-98, -300], [-104, -226], [-98, -148], [-86, -78], [-78, -18],
  ];
  const curve = new THREE.CatmullRomCurve3(points.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'catmullrom', 0.28);
  const count = 96;
  const planks = [];
  const posts = [];
  const rails = [];
  const width = 3.2;
  const pts = curve.getSpacedPoints(count);
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const t = curve.getTangent(i / (pts.length - 1));
    const nx = -t.z;
    const nz = t.x;
    const y = heightAt(p.x, p.z) + 0.42;
    const g = new THREE.BoxGeometry(width, 0.16, 1.55);
    g.rotateY(Math.atan2(nx, nz));
    g.translate(p.x, y, p.z);
    planks.push(g);
    if (i % 6 === 0) {
      for (const side of [-1, 1]) {
        addBox(posts, 0.16, 1.05, 0.16, p.x + nx * side * (width / 2 + 0.15), y + 0.5, p.z + nz * side * (width / 2 + 0.15));
      }
    }
    if (i % 2 === 0 && i + 2 < pts.length && i % 6 < 6) {
      const p2 = pts[Math.min(i + 2, pts.length - 1)];
      const t2 = curve.getTangent(Math.min(1, (i + 2) / (pts.length - 1)));
      for (const side of [-1, 1]) {
        const x1 = p.x + nx * side * (width / 2 + 0.15);
        const z1 = p.z + nz * side * (width / 2 + 0.15);
        const x2 = p2.x - t2.z * side * (width / 2 + 0.15);
        const z2 = p2.z + t2.x * side * (width / 2 + 0.15);
        const y1 = heightAt(p.x, p.z) + 1.2;
        const y2 = heightAt(p2.x, p2.z) + 1.2;
        addRod(rails, x1, y1, z1, x2, y2, z2, 0.055, 4);
      }
    }
  }
  const deckY = heightAt(-74, -222) + 0.55;
  for (let i = 0; i < 7; i++) {
    addBox(planks, 3.8, 0.18, 24, -72 + i * 3.8, deckY, -222);
  }
  for (let i = 0; i < 7; i++) {
    for (const side of [-1, 1]) {
      addBox(posts, 0.18, 1.3, 0.18, -72 + i * 3.8, deckY + 0.65, -222 + side * 12);
    }
  }
  addBox(rails, 26, 0.11, 0.12, -61, deckY + 1.26, -234);
  addBox(rails, 26, 0.11, 0.12, -61, deckY + 1.26, -210);

  const group = new THREE.Group();
  const plankMesh = mergedMesh(planks, mats.wood, true, true);
  const postMesh = mergedMesh(posts, mats.woodDark, true, true);
  const railMesh = mergedMesh(rails, mats.metal, true, false);
  if (plankMesh) group.add(plankMesh);
  if (postMesh) group.add(postMesh);
  if (railMesh) group.add(railMesh);
  return group;
}

function createSign(title, sub, x, z, rot, dark = false, lift = 0) {
  const group = new THREE.Group();
  const y = heightAt(x, z) + 4.4 + lift;
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 4.0),
    new THREE.MeshStandardMaterial({ map: makeSignTexture(title, sub, dark), roughness: 0.8, side: THREE.DoubleSide })
  );
  sign.position.set(0, 0, 0);
  sign.castShadow = true;
  group.add(sign);
  const posts = [];
  addCylinder(posts, 0.16, 0.18, 4.0, 7, -4.2, -2.0, 0);
  addCylinder(posts, 0.16, 0.18, 4.0, 7, 4.2, -2.0, 0);
  const postMesh = mergedMesh(posts, new THREE.MeshStandardMaterial({ color: 0x574633, roughness: 0.94 }), true, false);
  if (postMesh) group.add(postMesh);
  group.position.set(x, y, z);
  group.rotation.y = rot;
  return group;
}

function createPrayerFlags() {
  const palette = [
    new THREE.Color(0x2d6fa8), new THREE.Color(0xe9dfb0), new THREE.Color(0xc54832),
    new THREE.Color(0x4d925c), new THREE.Color(0xe3b83f),
  ];
  const lines = [
    { a: [8, -286], b: [196, -272], sag: 1.5, count: 26 },
    { a: [24, -352], b: [214, -334], sag: 1.6, count: 26 },
    { a: [-34, -214], b: [142, -202], sag: 1.3, count: 22 },
    { a: [-118, -182], b: [-44, -246], sag: 1.1, count: 16 },
    { a: [168, 244], b: [252, 258], sag: 1.0, count: 16 },
    { a: [88, -204], b: [234, -190], sag: 1.2, count: 20 },
  ];
  const poleList = [];
  const ropeList = [];
  const positions = [];
  const colors = [];
  const phases = [];
  const tops = [];
  const indices = [];
  let vi = 0;
  lines.forEach((line, li) => {
    const [ax, az] = line.a;
    const [bx, bz] = line.b;
    const ha = heightAt(ax, az);
    const hb = heightAt(bx, bz);
    const y = Math.max(ha, hb) + 8.4;
    addCylinder(poleList, 0.1, 0.16, y - ha + 0.8, 7, ax, ha + (y - ha + 0.8) / 2, az);
    addCylinder(poleList, 0.1, 0.16, y - hb + 0.8, 7, bx, hb + (y - hb + 0.8) / 2, bz);
    const dirX = (bx - ax) / Math.hypot(bx - ax, bz - az);
    const dirZ = (bz - az) / Math.hypot(bx - ax, bz - az);
    const ropePts = [];
    for (let s = 0; s <= 10; s++) {
      const k = s / 10;
      ropePts.push([ax + (bx - ax) * k, y - line.sag * 4 * k * (1 - k), az + (bz - az) * k]);
    }
    for (let s = 0; s < ropePts.length - 1; s++) {
      const p0 = ropePts[s];
      const p1 = ropePts[s + 1];
      addRod(ropeList, p0[0], p0[1], p0[2], p1[0], p1[1], p1[2], 0.035, 4);
    }
    for (let i = 0; i < line.count; i++) {
      const t0 = i / line.count;
      const tm = (t0 + 1 / line.count * 0.5);
      const x = ax + (bx - ax) * tm;
      const z = az + (bz - az) * tm;
      const yTop = y - line.sag * 4 * tm * (1 - tm) - 0.08;
      const w = 1.35;
      const h = 0.95;
      const lx = x - dirX * w / 2;
      const rx = x + dirX * w / 2;
      const lz = z - dirZ * w / 2;
      const rz = z + dirZ * w / 2;
      positions.push(lx, yTop, lz, rx, yTop, rz, rx, yTop - h, rz, lx, yTop - h, lz);
      const col = palette[(i + li) % palette.length];
      for (let k = 0; k < 4; k++) {
        colors.push(col.r, col.g, col.b);
        phases.push(li * 1.7 + i * 0.63);
        tops.push(k < 2 ? 1 : 0);
      }
      indices.push(vi, vi + 1, vi + 2, vi, vi + 2, vi + 3);
      vi += 4;
    }
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('aColor', new THREE.Float32BufferAttribute(colors, 3));
  geo.setAttribute('aPhase', new THREE.Float32BufferAttribute(phases, 1));
  geo.setAttribute('aTop', new THREE.Float32BufferAttribute(tops, 1));
  geo.setIndex(indices);
  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      uniform float uTime;
      attribute vec3 aColor;
      attribute float aPhase;
      attribute float aTop;
      varying vec3 vColor;
      varying float vShade;
      void main() {
        vec3 p = position;
        float loose = 1.0 - aTop;
        float wave = sin(uTime * 2.5 + aPhase + p.x * 0.33 + p.y * 0.55);
        p.z += loose * (wave * 0.55 + 0.12);
        p.x += loose * sin(uTime * 1.4 + aPhase * 1.7) * 0.18;
        p.y += loose * sin(uTime * 1.9 + aPhase) * 0.12;
        vColor = aColor;
        vShade = 0.7 + 0.3 * aTop;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vShade;
      void main() {
        gl_FragColor = vec4(vColor * vShade, 0.96);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, material);
  mesh.frustumCulled = false;
  mesh.castShadow = true;
  const group = new THREE.Group();
  const poleMesh = mergedMesh(poleList, new THREE.MeshStandardMaterial({ color: 0x777d7d, roughness: 0.55, metalness: 0.45 }), true, false);
  const ropeMesh = mergedMesh(ropeList, new THREE.MeshStandardMaterial({ color: 0x5c584d, roughness: 0.94 }), false, false);
  if (poleMesh) group.add(poleMesh);
  if (ropeMesh) group.add(ropeMesh);
  group.add(mesh);
  return { group, update: (t) => { material.uniforms.uTime.value = t; } };
}

function buildYakGeometry(mats) {
  const fur = [];
  const shag = [];
  const horn = [];
  const body = new THREE.SphereGeometry(1, 12, 9);
  body.scale(1.35, 0.95, 2.15);
  body.translate(0, 1.75, 0);
  fur.push(body);
  const hump = new THREE.SphereGeometry(1, 10, 8);
  hump.scale(0.8, 0.62, 0.98);
  hump.translate(0, 2.45, 0.28);
  fur.push(hump);
  const head = new THREE.SphereGeometry(1, 10, 8);
  head.scale(0.56, 0.6, 0.84);
  head.translate(0, 1.92, -2.08);
  fur.push(head);
  const snout = new THREE.BoxGeometry(0.56, 0.4, 0.72);
  snout.translate(0, 1.74, -2.68);
  fur.push(snout);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const leg = new THREE.CylinderGeometry(0.14, 0.11, 1.15, 6);
      leg.translate(sx * 0.64, 0.58, sz * 0.92);
      fur.push(leg);
    }
  }
  const tail = new THREE.CylinderGeometry(0.06, 0.12, 1.5, 5);
  tail.rotateX(-0.35);
  tail.translate(0, 1.55, 2.18);
  fur.push(tail);
  const skirt = new THREE.CylinderGeometry(1.35, 1.55, 1.05, 12, 1, true);
  skirt.scale(1, 1, 1.5);
  skirt.translate(0, 1.16, 0);
  shag.push(skirt);
  for (const sx of [-1, 1]) {
    const h = new THREE.ConeGeometry(0.1, 0.85, 5);
    h.rotateZ(sx * 0.85);
    h.rotateX(-0.35);
    h.translate(sx * 0.42, 2.28, -1.84);
    horn.push(h);
    const ear = new THREE.ConeGeometry(0.12, 0.34, 4);
    ear.rotateZ(sx * 1.3);
    ear.translate(sx * 0.6, 2.06, -1.86);
    shag.push(ear);
  }
  const furMesh = mergedMesh(fur, mats.fur, true, true);
  const shagMesh = mergedMesh(shag, mats.shag, true, true);
  const hornMesh = mergedMesh(horn, mats.horn, true, false);
  return [furMesh, shagMesh, hornMesh];
}

function createYaks(mats) {
  const geoms = buildYakGeometry(mats);
  const group = new THREE.Group();
  const yaks = [];
  const list = [
    [124, -292, 1.12, 0.7, 0.42, 7],
    [194, -254, 1.0, 2.1, 0.33, 6],
    [66, -385, 0.92, 4.2, 0.28, 5],
    [252, -356, 1.05, 5.3, 0.36, 8],
    [28, -344, 0.86, 1.2, 0, 0],
    [214, -162, 0.95, 3.4, 0, 0],
  ];
  list.forEach(([x, z, scale, phase, speed, radius], i) => {
    const g = new THREE.Group();
    geoms.forEach((mesh) => {
      if (!mesh) return;
      const clone = new THREE.Mesh(mesh.geometry, mesh.material);
      clone.castShadow = true;
      clone.receiveShadow = true;
      g.add(clone);
    });
    g.position.set(x, heightAt(x, z), z);
    g.scale.setScalar(scale);
    g.rotation.y = rand(901, i) * 6.28;
    group.add(g);
    yaks.push({ group: g, baseX: x, baseZ: z, phase, speed, radius, scale });
  });
  return {
    group,
    update(t) {
      for (const y of yaks) {
        if (y.radius > 0) {
          const a = t * y.speed + y.phase;
          const x = y.baseX + Math.cos(a) * y.radius;
          const z = y.baseZ + Math.sin(a) * y.radius * 0.55;
          y.group.position.set(x, heightAt(x, z), z);
          y.group.rotation.y = -a + Math.PI * 0.5;
          y.group.position.y += Math.abs(Math.sin(t * 1.8 + y.phase)) * 0.04;
        } else {
          y.group.rotation.z = Math.sin(t * 0.5 + y.phase) * 0.012;
        }
        const headBob = Math.sin(t * 1.2 + y.phase) * 0.025;
        y.group.rotation.x = headBob;
      }
    },
  };
}

function createClouds() {
  const texture = makeCloudTexture();
  const mats = [
    new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0.3, depthWrite: false, color: 0xf4f3ea }),
    new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0.42, depthWrite: false, color: 0xfff1dd }),
    new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0.23, depthWrite: false, color: 0xdfeaf0 }),
  ];
  const group = new THREE.Group();
  const clouds = [];
  for (let i = 0; i < 28; i++) {
    const low = i < 18;
    const sprite = new THREE.Sprite(mats[Math.floor(rand(921, i) * mats.length)]);
    const x = -700 + rand(929, i) * 1400;
    const y = low ? 145 + rand(931, i) * 165 : 330 + rand(937, i) * 230;
    const z = low ? 430 + rand(941, i) * 520 : 700 + rand(947, i) * 560;
    const w = low ? 190 + rand(953, i) * 290 : 150 + rand(967, i) * 230;
    sprite.position.set(x, y, z);
    sprite.scale.set(w, w * 0.38, 1);
    group.add(sprite);
    clouds.push({ sprite, baseX: x, baseY: y, speed: (0.7 + rand(971, i) * 1.8) * (rand(977, i) > 0.45 ? 1 : -1), phase: rand(983, i) * 6.28 });
  }
  return {
    group,
    update(t, dt) {
      for (const c of clouds) {
        c.sprite.position.x += c.speed * dt;
        if (c.sprite.position.x > 760) c.sprite.position.x = -760;
        if (c.sprite.position.x < -760) c.sprite.position.x = 760;
        c.sprite.position.y = c.baseY + Math.sin(t * 0.12 + c.phase) * 7;
      }
    },
  };
}

function createSnowfall() {
  const count = 650;
  const positions = new Float32Array(count * 3);
  const speeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = -560 + rand(991, i) * 1120;
    positions[i * 3 + 1] = 90 + rand(997, i) * 620;
    positions[i * 3 + 2] = 180 + rand(1009, i) * 850;
    speeds[i] = 3 + rand(1013, i) * 10;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    map: makeSnowTexture(), size: 1.4, transparent: true, opacity: 0.55,
    depthWrite: false, sizeAttenuation: true, color: 0xf3f9fc,
  });
  const points = new THREE.Points(geo, material);
  points.frustumCulled = false;
  return { points, positions, speeds, count };
}

function createGlow() {
  const material = new THREE.SpriteMaterial({ map: makeGlowTexture(), color: 0xffd9a0, transparent: true, opacity: 0.82, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending });
  const sprite = new THREE.Sprite(material);
  sprite.position.set(690, 520, 890);
  sprite.scale.set(620, 620, 1);
  sprite.renderOrder = 2;
  return { sprite, material };
}

export function buildYulongScene() {
  const mats = makeMaterials();
  const staticRoot = new THREE.Group();

  const terrain = buildTerrain();
  const terrainMaterial = terrain.material;
  staticRoot.add(terrain);
  createRidgeBlades(staticRoot, mats);
  createGlacier(staticRoot, mats);
  createGlacierStation(staticRoot, mats);
  staticRoot.add(createWalkway(mats));
  staticRoot.add(createSign('蓝月谷', 'BLUE MOON VALLEY · 2800 M', -70, -8, Math.PI, false, 1.2));
  staticRoot.add(createSign('甘海子', 'GANHAIZI MEADOW · 3100 M', 46, -404, Math.PI, false, 0.8));
  staticRoot.add(createSign('玉龙雪山', 'JADE DRAGON SNOW MOUNTAIN · 5596 M', 306, -292, Math.PI - 0.14, true, 1.4));

  const dynamic = new THREE.Group();
  const instanced = [];
  staticRoot.traverse((obj) => {
    if (obj.isInstancedMesh) instanced.push(obj);
  });
  instanced.forEach((obj) => {
    obj.updateWorldMatrix(true, false);
    const matrix = obj.matrixWorld.clone();
    if (obj.parent) obj.parent.remove(obj);
    matrix.decompose(obj.position, obj.quaternion, obj.scale);
    dynamic.add(obj);
  });

  const merged = mergeStaticGroup(staticRoot);
  merged.traverse((mesh) => {
    if (mesh.isMesh && mesh.material === terrainMaterial) {
      mesh.castShadow = false;
      mesh.receiveShadow = true;
    }
  });
  dynamic.add(merged);

  const poolWater = makeWaterMaterial();
  poolWater.uniforms.uDeep.value.set(0x0b6c7b);
  poolWater.uniforms.uShallow.value.set(0x5bd9c9);
  poolWater.uniforms.uSky.value.set(0xe2f7f2);
  poolWater.userData.day = { deep: 0x0b6c7b, shallow: 0x5bd9c9, sky: 0xe2f7f2 };
  poolWater.userData.dusk = { deep: 0x0a4654, shallow: 0x3aa39c, sky: 0xdca88b };

  const blueMoon = createBlueMoon(mats, poolWater);
  dynamic.add(blueMoon.group);

  const forest = createForest(mats);
  dynamic.add(forest.group);
  dynamic.add(createRockField(mats));
  const meadow = createMeadowDetail(mats);
  dynamic.add(meadow.group);

  const flags = createPrayerFlags();
  dynamic.add(flags.group);
  const yaks = createYaks(mats);
  dynamic.add(yaks.group);

  const clouds = createClouds();
  dynamic.add(clouds.group);
  const snowfall = createSnowfall();
  dynamic.add(snowfall.points);
  const glow = createGlow();
  dynamic.add(glow.sprite);

  const waterMaterials = [poolWater];
  blueMoon.falls.forEach((fall) => {
    if (fall[0] && fall[0].material) waterMaterials.push(fall[0].material);
  });

  const life = {
    update(t, dt) {
      const step = dt || 0.016;
      flags.update(t);
      yaks.update(t);
      clouds.update(t, step);
      forest.sway.value = t;
      meadow.sway.value = t;
      for (const fall of blueMoon.falls) {
        if (fall[0] && fall[0].material.uniforms) fall[0].material.uniforms.uTime.value = t;
      }
      const p = snowfall.positions;
      for (let i = 0; i < snowfall.count; i++) {
        p[i * 3 + 1] -= snowfall.speeds[i] * step;
        p[i * 3] += Math.sin(t * 0.4 + i * 0.7) * step * 1.1;
        if (p[i * 3 + 1] < 105) {
          p[i * 3 + 1] = 700;
          p[i * 3] = -560 + rand(1021, i + Math.floor(t)) * 1120;
          p[i * 3 + 2] = 180 + rand(1031, i + Math.floor(t)) * 850;
        }
      }
      snowfall.points.geometry.attributes.position.needsUpdate = true;
      glow.material.opacity = 0.72 + Math.sin(t * 0.45) * 0.08;
      glow.sprite.scale.setScalar(614 + Math.sin(t * 0.33) * 14);
    },
  };

  life.update(0, 0.016);

  return {
    group: dynamic,
    waterMaterials,
    life,
    heightAt,
    pools: POOLS,
  };
}

export { POOLS };
