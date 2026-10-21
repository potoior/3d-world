import * as THREE from 'three';
import { makeLabelTexture, makeMistTexture, makeGlowTexture } from './textures.js';
import { mergeGeometryList } from './geometry.js';
import {
  heightAt,
  riverCenter,
  halfWidthAt,
  upperHalfWidth,
  lowerHalfWidth,
  WATER_LOW,
  WATER_HIGH,
  CLIFF_Z,
  smoothstep,
  fbm,
} from './terrain.js';

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

function addBox(list, w, h, d, x, y, z, ry = 0, rx = 0, rz = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (rx) g.rotateX(rx);
  if (rz) g.rotateZ(rz);
  if (ry) g.rotateY(ry);
  g.translate(x, y, z);
  list.push(g);
  return g;
}

function tintGeometry(geo, color, variance = 0.12, rand = Math.random) {
  const count = geo.attributes.position.count;
  if (!geo.attributes.uv) {
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(count * 2), 2));
  }
  if (!geo.attributes.normal) geo.computeVertexNormals();
  const colors = new Float32Array(count * 3);
  const c = new THREE.Color();
  const base = color instanceof THREE.Color ? color : new THREE.Color(color);
  for (let i = 0; i < count; i++) {
    const shade = 0.86 + rand() * variance;
    c.copy(base).multiplyScalar(shade);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo;
}

class Bucket {
  constructor() {
    this.map = new Map();
  }
  add(geo, mat) {
    if (!this.map.has(mat)) this.map.set(mat, []);
    this.map.get(mat).push(geo);
  }
  build(parent) {
    for (const [mat, list] of this.map) {
      if (!list.length) continue;
      const geo = mergeGeometryList(list);
      if (!geo) continue;
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = !mat.userData?.noShadow;
      mesh.receiveShadow = true;
      parent.add(mesh);
    }
    this.map.clear();
  }
}

/* ------------------------------------------------------------------ */
/* textures                                                            */
/* ------------------------------------------------------------------ */

function makeFallTexture(seed, foam) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 1024;
  const ctx = c.getContext('2d');
  const rand = mulberry32(seed);
  ctx.clearRect(0, 0, 512, 1024);

  const g = ctx.createLinearGradient(0, 0, 0, 1024);
  if (foam) {
    g.addColorStop(0, 'rgba(250,244,228,0.15)');
    g.addColorStop(0.5, 'rgba(248,240,220,0.24)');
    g.addColorStop(1, 'rgba(255,250,240,0.5)');
  } else {
    g.addColorStop(0, 'rgba(176,140,84,0.5)');
    g.addColorStop(0.34, 'rgba(154,119,68,0.58)');
    g.addColorStop(0.72, 'rgba(190,155,96,0.56)');
    g.addColorStop(1, 'rgba(214,187,132,0.64)');
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 1024);

  for (let i = 0; i < 560; i++) {
    const x = rand() * 512;
    const y = rand() * 1024;
    const len = 60 + rand() * 340;
    const sway = 6 + rand() * 22;
    const width = foam ? 0.8 + rand() * 5.5 : 1 + rand() * 7;
    const alpha = foam ? 0.06 + rand() * 0.5 : 0.03 + rand() * 0.2;
    ctx.strokeStyle = foam
      ? 'rgba(255,252,242,' + alpha.toFixed(3) + ')'
      : rand() > 0.3
        ? 'rgba(226,199,146,' + alpha.toFixed(3) + ')'
        : 'rgba(92,66,32,' + alpha.toFixed(3) + ')';
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x + sway, y + len * 0.34, x - sway * 0.7, y + len * 0.7, x + sway * 0.4, y + len);
    ctx.stroke();
    if (x < 60) {
      ctx.beginPath();
      ctx.moveTo(x + 512, y);
      ctx.bezierCurveTo(x + 512 + sway, y + len * 0.34, x + 512 - sway * 0.7, y + len * 0.7, x + 512 + sway * 0.4, y + len);
      ctx.stroke();
    }
  }

  for (let i = 0; i < 180; i++) {
    const x = rand() * 512;
    const y = 420 + rand() * 604;
    const r = 1.5 + rand() * 9;
    const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
    const a = (foam ? 0.16 : 0.05) + rand() * (foam ? 0.35 : 0.16);
    rg.addColorStop(0, 'rgba(255,252,244,' + a.toFixed(3) + ')');
    rg.addColorStop(1, 'rgba(255,252,244,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

function makeFoamTexture(seed) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d');
  const rand = mulberry32(seed);
  ctx.clearRect(0, 0, 512, 512);
  for (let i = 0; i < 260; i++) {
    const x = rand() * 512;
    const y = rand() * 512;
    const r = 4 + rand() * 46;
    const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
    const a = 0.02 + rand() * 0.12;
    rg.addColorStop(0, 'rgba(255,250,236,' + a.toFixed(3) + ')');
    rg.addColorStop(0.6, 'rgba(250,240,218,' + (a * 0.5).toFixed(3) + ')');
    rg.addColorStop(1, 'rgba(248,236,210,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  for (let i = 0; i < 520; i++) {
    ctx.strokeStyle = 'rgba(255,252,240,' + (0.04 + rand() * 0.24).toFixed(3) + ')';
    ctx.lineWidth = 0.6 + rand() * 3.4;
    const x = rand() * 512;
    const y = rand() * 512;
    ctx.beginPath();
    ctx.arc(x, y, 2 + rand() * 20, rand() * 6.2, rand() * 6.2 + 1.6);
    ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

function makeSoftDot() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,250,236,0.92)');
  g.addColorStop(0.35, 'rgba(250,240,218,0.45)');
  g.addColorStop(0.72, 'rgba(244,232,206,0.12)');
  g.addColorStop(1, 'rgba(240,226,198,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

console.log('MARK overlay-textures-start');
const mudTexture = makeFallTexture(6127, false);
const foamTexture = makeFallTexture(3381, true);
const splashTexture = makeFoamTexture(7713);
const mistMap = makeMistTexture();
const glowMap = makeGlowTexture();
const softDot = makeSoftDot();

mudTexture.repeat.set(1.15, 1.5);
foamTexture.repeat.set(1.35, 1.8);
splashTexture.repeat.set(2, 2);
mistMap.repeat.set(1.4, 1);
console.log('MARK overlay-textures-done');

/* ------------------------------------------------------------------ */
/* materials                                                           */
/* ------------------------------------------------------------------ */

const rockMat = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.96,
  metalness: 0,
  flatShading: true,
});
const rockDarkMat = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.9,
  metalness: 0.02,
  flatShading: true,
});
const stoneMat = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.95,
  metalness: 0,
});
const woodMat = new THREE.MeshStandardMaterial({
  color: 0x6d4b2c,
  roughness: 0.88,
  metalness: 0,
});
const ironMat = new THREE.MeshStandardMaterial({
  color: 0x3d3a34,
  roughness: 0.62,
  metalness: 0.34,
});
const bannerMat = new THREE.MeshStandardMaterial({
  color: 0xa32c1f,
  roughness: 0.86,
  side: THREE.DoubleSide,
});
const bannerGoldMat = new THREE.MeshStandardMaterial({
  color: 0xd8ad55,
  roughness: 0.6,
  metalness: 0.3,
  side: THREE.DoubleSide,
});
const personMat = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.9,
  metalness: 0,
  flatShading: true,
});
const donkeyMat = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.93,
  metalness: 0,
  flatShading: true,
});
const rockInstMat = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  roughness: 0.97,
  metalness: 0,
  flatShading: true,
});

function tintBox(list, w, h, d, x, y, z, color, rand, ry = 0, rx = 0, rz = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (rx) g.rotateX(rx);
  if (rz) g.rotateZ(rz);
  if (ry) g.rotateY(ry);
  g.translate(x, y, z);
  list.push(tintGeometry(g, color, 0.12, rand));
  return g;
}

/* ------------------------------------------------------------------ */
/* waterfall                                                           */
/* ------------------------------------------------------------------ */

function createCurtainGeometry(width, height, topY, topZ, bulge = 8, lean = 2.4, cols = 44, rows = 38) {
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let j = 0; j <= rows; j++) {
    const v = j / rows;
    const y = topY - height * v;
    const arc = Math.sin(Math.min(1, v * 1.12) * Math.PI * 0.58) * bulge;
    const z = topZ + arc + lean * v * v;
    const taper = 1 + 0.12 * v;
    for (let i = 0; i <= cols; i++) {
      const u = i / cols;
      const x = (u - 0.5) * width * taper;
      const fold = Math.sin(u * 9.4 + v * 4.2) * 0.55 * (0.25 + v) + Math.sin(v * 15.0 + u * 3.1) * 0.22;
      positions.push(x, y + Math.sin(u * 13 + v * 5) * 0.16, z + fold);
      uvs.push(u, v);
    }
  }
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const a = j * (cols + 1) + i;
      const b = a + 1;
      const c = a + cols + 1;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function rainbowColor(t, out) {
  const stops = [
    [0.02, 0x8a4fd8],
    [0.16, 0x4c6fe8],
    [0.32, 0x3fb9e6],
    [0.48, 0x66d474],
    [0.64, 0xf2e05a],
    [0.8, 0xf2a23c],
    [0.97, 0xe4533f],
  ];
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];
    if (t >= a[0] && t <= b[0]) {
      return out.set(a[1]).lerp(new THREE.Color(b[1]), (t - a[0]) / (b[0] - a[0]));
    }
  }
  return out.set(stops[stops.length - 1][1]);
}

function createRainbowGeometry(radius, thickness, arc = 1, seg = 72) {
  const positions = [];
  const colors = [];
  const indices = [];
  const tmp = new THREE.Color();
  for (let j = 0; j <= 1; j++) {
    const r = radius + thickness * j;
    for (let i = 0; i <= seg; i++) {
      const t = 0.035 + (0.93 * i) / seg;
      const theta = Math.PI * (0.03 + (0.94 * i) / seg * arc);
      positions.push(Math.cos(theta) * r, Math.sin(theta) * r, 0);
      rainbowColor(t, tmp);
      colors.push(tmp.r, tmp.g, tmp.b);
    }
  }
  for (let i = 0; i < seg; i++) {
    const a = i;
    const b = i + 1;
    const c = a + seg + 1;
    const d = c + 1;
    indices.push(a, c, b, b, c, d);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  return geo;
}

/* ------------------------------------------------------------------ */
/* mist                                                                */
/* ------------------------------------------------------------------ */

function buildMist(rand) {
  const group = new THREE.Group();
  group.name = 'hukou-mist';
  const layers = [
    { count: 300, size: 22, opacity: 0.24, color: 0xf1e3c6, spread: 98, rise: 6 },
    { count: 330, size: 10, opacity: 0.4, color: 0xf7ecd6, spread: 74, rise: 9 },
    { count: 200, size: 5.2, opacity: 0.55, color: 0xfcf4e4, spread: 58, rise: 13 },
  ];
  const systems = [];
  for (const layer of layers) {
    const positions = new Float32Array(layer.count * 3);
    const seeds = new Float32Array(layer.count * 4);
    for (let i = 0; i < layer.count; i++) {
      positions[i * 3] = (rand() - 0.5) * layer.spread;
      positions[i * 3 + 1] = WATER_LOW + 1 + rand() * 42;
      positions[i * 3 + 2] = CLIFF_Z + 6 + rand() * 48;
      seeds[i * 4] = 0.5 + rand() * 1.6;
      seeds[i * 4 + 1] = rand() * Math.PI * 2;
      seeds[i * 4 + 2] = 0.4 + rand() * 1.6;
      seeds[i * 4 + 3] = rand();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      map: softDot,
      color: layer.color,
      size: layer.size,
      transparent: true,
      opacity: layer.opacity,
      depthWrite: false,
      depthTest: true,
      sizeAttenuation: true,
      blending: THREE.NormalBlending,
      fog: true,
      toneMapped: true,
    });
    const points = new THREE.Points(geo, mat);
    points.renderOrder = 6;
    points.frustumCulled = false;
    group.add(points);
    systems.push({ points, positions, seeds, layer, count: layer.count });

    const basePositions = new Float32Array(layer.count * 3);
    const baseSeeds = new Float32Array(layer.count * 4);
    for (let i = 0; i < layer.count; i++) {
      basePositions[i * 3] = (rand() - 0.5) * layer.spread;
      basePositions[i * 3 + 1] = WATER_LOW + 1 + rand() * 42;
      basePositions[i * 3 + 2] = CLIFF_Z + 6 + rand() * 48;
      baseSeeds[i * 4] = 0.5 + rand() * 1.6;
      baseSeeds[i * 4 + 1] = rand() * Math.PI * 2;
      baseSeeds[i * 4 + 2] = 0.4 + rand() * 1.6;
      baseSeeds[i * 4 + 3] = rand();
    }
  }

  const sheetMat = new THREE.MeshBasicMaterial({
    map: mistMap,
    color: 0xf2e6cc,
    transparent: true,
    opacity: 0.26,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: true,
    toneMapped: true,
  });
  const sheets = [];
  const sheetDefs = [
    [0, 24, -26, 120, 46, 0.26],
    [-18, 34, -36, 96, 54, 0.2],
    [22, 16, -16, 84, 32, 0.22],
  ];
  for (const d of sheetDefs) {
    const mat = sheetMat.clone();
    mat.opacity = d[5];
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(d[3], d[4]), mat);
    mesh.position.set(d[0], d[1], d[2]);
    mesh.renderOrder = 5;
    mesh.userData.baseY = d[1];
    mesh.userData.phase = rand() * 6.2;
    sheets.push(mesh);
    group.add(mesh);
  }

  function update(elapsed, dt) {
    const step = Math.min(0.05, Number.isFinite(dt) ? dt : 0.016);
    for (const sys of systems) {
      const p = sys.positions;
      const s = sys.seeds;
      for (let i = 0; i < sys.count; i++) {
        const i3 = i * 3;
        const i4 = i * 4;
        p[i3 + 1] += s[i4] * sys.layer.rise * step * 0.34;
        p[i3] += Math.sin(elapsed * s[i4 + 2] + s[i4 + 1]) * step * 1.4;
        p[i3 + 2] += Math.cos(elapsed * s[i4 + 2] * 0.8 + s[i4 + 1]) * step * 0.9;
        if (p[i3 + 1] > WATER_LOW + 48) {
          p[i3] = (Math.random() - 0.5) * sys.layer.spread;
          p[i3 + 1] = WATER_LOW + 1 + Math.random() * 4;
          p[i3 + 2] = CLIFF_Z + 6 + Math.random() * 48;
        }
      }
      sys.points.geometry.attributes.position.needsUpdate = true;
    }
    for (const s of sheets) {
      s.position.y = s.userData.baseY + Math.sin(elapsed * 0.35 + s.userData.phase) * 2.2;
      s.material.opacity = 0.2 + Math.sin(elapsed * 0.5 + s.userData.phase) * 0.06;
    }
  }

  return { group, update };
}

/* ------------------------------------------------------------------ */
/* people and donkeys                                                  */
/* ------------------------------------------------------------------ */

function pushCyl(list, rt, rb, h, x, y, z, color, rand, seg = 6, rx = 0, rz = 0, ry = 0) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg, 1, false);
  if (rx) g.rotateX(rx);
  if (rz) g.rotateZ(rz);
  if (ry) g.rotateY(ry);
  g.translate(x, y, z);
  list.push(tintGeometry(g, color, 0.1, rand));
  return g;
}

function createPersonGeometry(shirt, pants, skin, hat, seed) {
  const rand = mulberry32(seed);
  const list = [];
  pushCyl(list, 0.06, 0.055, 0.78, -0.105, 0.39, 0, pants, rand, 5);
  pushCyl(list, 0.06, 0.055, 0.78, 0.105, 0.39, 0, pants, rand, 5);
  tintBox(list, 0.17, 0.1, 0.3, -0.105, 0.05, 0.05, 0x2b2620, rand);
  tintBox(list, 0.17, 0.1, 0.3, 0.105, 0.05, 0.05, 0x2b2620, rand);
  tintBox(list, 0.38, 0.6, 0.24, 0, 1.08, 0, shirt, rand);
  tintBox(list, 0.42, 0.16, 0.27, 0, 0.8, 0, shirt, rand);
  pushCyl(list, 0.055, 0.045, 0.56, -0.25, 1.1, 0, shirt, rand, 5, 0, 0.16);
  pushCyl(list, 0.055, 0.045, 0.56, 0.25, 1.1, 0, shirt, rand, 5, 0, -0.16);
  pushCyl(list, 0.05, 0.048, 0.12, -0.28, 0.84, 0, skin, rand, 5);
  pushCyl(list, 0.05, 0.048, 0.12, 0.28, 0.84, 0, skin, rand, 5);
  pushCyl(list, 0.07, 0.075, 0.1, 0, 1.42, 0, skin, rand, 5);
  const head = new THREE.IcosahedronGeometry(0.155, 1);
  head.translate(0, 1.6, 0);
  list.push(tintGeometry(head, skin, 0.08, rand));
  const brim = new THREE.CylinderGeometry(0.28, 0.28, 0.035, 10);
  brim.translate(0, 1.73, 0);
  list.push(tintGeometry(brim, hat, 0.07, rand));
  const crown = new THREE.CylinderGeometry(0.13, 0.16, 0.14, 9);
  crown.translate(0, 1.8, 0);
  list.push(tintGeometry(crown, hat, 0.07, rand));
  if (rand() > 0.5) {
    tintBox(list, 0.26, 0.34, 0.16, 0, 1.12, -0.19, 0x4a3a2b, rand);
  }
  return mergeGeometryList(list);
}

function createDonkeyGeometry(seed) {
  const rand = mulberry32(seed);
  const list = [];
  const body = new THREE.SphereGeometry(0.42, 7, 5);
  body.scale(1.35, 0.92, 0.82);
  body.translate(0, 1.06, 0);
  list.push(tintGeometry(body, 0x6d5642, 0.14, rand));
  pushCyl(list, 0.06, 0.05, 0.78, -0.34, 0.39, -0.2, 0x4e3c2c, rand, 5);
  pushCyl(list, 0.06, 0.05, 0.78, 0.34, 0.39, -0.2, 0x4e3c2c, rand, 5);
  pushCyl(list, 0.06, 0.05, 0.78, -0.34, 0.39, 0.22, 0x4e3c2c, rand, 5);
  pushCyl(list, 0.06, 0.05, 0.78, 0.34, 0.39, 0.22, 0x4e3c2c, rand, 5);
  pushCyl(list, 0.11, 0.17, 0.72, 0, 1.42, -0.42, 0x6d5642, rand, 6, -0.5);
  tintBox(list, 0.24, 0.3, 0.46, 0, 1.67, -0.72, 0x745a44, rand, 0, -0.16);
  tintBox(list, 0.17, 0.17, 0.2, 0, 1.56, -0.96, 0x8a6d52, rand);
  const earL = new THREE.ConeGeometry(0.055, 0.28, 5);
  earL.translate(-0.08, 1.92, -0.66);
  list.push(tintGeometry(earL, 0x5a4634, 0.1, rand));
  const earR = new THREE.ConeGeometry(0.055, 0.28, 5);
  earR.translate(0.08, 1.92, -0.66);
  list.push(tintGeometry(earR, 0x5a4634, 0.1, rand));
  tintBox(list, 0.58, 0.09, 0.62, 0, 1.46, 0.02, 0xb23a2a, rand);
  tintBox(list, 0.62, 0.05, 0.68, 0, 1.4, 0.02, 0xd7b351, rand);
  tintBox(list, 0.5, 0.12, 0.14, 0, 1.5, -0.24, 0x8e2c22, rand);
  tintBox(list, 0.06, 0.5, 0.06, 0, 1.18, 0.42, 0x33291f, rand, 0, 0.3);
  return mergeGeometryList(list);
}

function addInstancedPeople(root, rand) {
  const variants = [
    { shirt: 0xc03a2c, pants: 0x27313f, hat: 0xeadfc6, seed: 4111, name: 'tourists-a' },
    { shirt: 0x2f5f8a, pants: 0x3b3a36, hat: 0xe6d9bc, seed: 4231, name: 'tourists-b' },
    { shirt: 0xd7a13c, pants: 0x2d3546, hat: 0xe8dcc0, seed: 4363, name: 'tourists-c' },
    { shirt: 0x3d7a55, pants: 0x333a3d, hat: 0xdcd0b4, seed: 4481, name: 'tourists-d' },
    { shirt: 0x8a4a7a, pants: 0x2b2f3b, hat: 0xefe4cc, seed: 4591, name: 'tourists-e' },
  ];
  const terrainSpots = [
    [-84, 64], [-78, 72], [-82, 80], [-70, 60], [-63, 66], [-58, 78],
    [-52, 64], [-48, 74], [-76, 62], [-60, 70], [-55, 84], [-45, 80],
    [48, 80], [54, 88], [62, 78], [70, 92], [76, 84], [58, 96],
    [-46, 30], [-43, 24], [-49, 36], [-51, 40],
  ];
  const caveSpots = [
    [-30.4, 3.2, 13.25, -1.2],
    [-29.2, 8.6, 13.25, -0.6],
    [-31.6, 13.4, 13.25, 0.2],
    [-34.5, 6.4, 13.25, 2.2],
  ];
  const deckY = heightAt(-66, 74) + 0.42;
  const rightY = heightAt(62, 88) + 0.42;
  let spotIndex = 0;
  for (let v = 0; v < variants.length; v++) {
    const variant = variants[v];
    const geom = createPersonGeometry(variant.shirt, variant.pants, 0xc79b74, variant.hat, variant.seed);
    const spots = [];
    const take = v < 4 ? 5 : 4;
    for (let k = 0; k < take; k++) {
      const s = terrainSpots[spotIndex % terrainSpots.length];
      spotIndex++;
      const onLeft = s[0] < 0 && s[1] > 50;
      const onRight = s[0] > 0;
      const y = onLeft ? deckY : onRight ? rightY : heightAt(s[0], s[1]) + 0.12;
      spots.push([s[0], y, s[1], rand() * 6.2, 0.94 + rand() * 0.13]);
    }
    for (let k = 0; k < 2; k++) {
      const c = caveSpots[(v * 2 + k) % caveSpots.length];
      spots.push([c[0], c[2], c[1], c[3] + rand() * 0.5, 0.95 + rand() * 0.1]);
    }
    const mesh = new THREE.InstancedMesh(geom, personMat, spots.length);
    mesh.name = variant.name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < spots.length; i++) {
      const s = spots[i];
      dummy.position.set(s[0], s[1], s[2]);
      dummy.rotation.set(0, s[3], 0);
      dummy.scale.setScalar(s[4]);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    root.add(mesh);
  }
}

function addDonkeys(root, rand) {
  const geom = createDonkeyGeometry(7721);
  const deckY = heightAt(-66, 74) + 0.42;
  const spots = [
    [-80, deckY, 68, 1.2, 1.0],
    [-73, deckY, 76, 2.4, 0.95],
    [-68, deckY, 63, -0.6, 1.05],
    [-58, deckY, 79, 2.9, 0.92],
    [-52, deckY, 69, 0.2, 1.0],
    [-61, deckY, 61, 1.7, 0.9],
    [58, heightAt(62, 88) + 0.42, 90, -1.4, 0.96],
  ];
  const mesh = new THREE.InstancedMesh(geom, donkeyMat, spots.length);
  mesh.name = 'hukou-donkeys';
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const dummy = new THREE.Object3D();
  for (let i = 0; i < spots.length; i++) {
    const s = spots[i];
    dummy.position.set(s[0], s[1], s[2]);
    dummy.rotation.set(0, s[3], 0);
    dummy.scale.setScalar(s[4]);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  root.add(mesh);
}

/* ------------------------------------------------------------------ */
/* rocks and ledges                                                    */
/* ------------------------------------------------------------------ */

function buildLedges(bucket, rand) {
  const palette = [0x8a6a44, 0x9c7b51, 0x6f5537, 0x7d603e, 0xa3835a];
  for (const side of [-1, 1]) {
    for (let z = -96; z < 116; z += 5.5) {
      const w = halfWidthAt(z);
      const level = z < CLIFF_Z ? WATER_HIGH : WATER_LOW;
      for (let layer = 0; layer < 4; layer++) {
        const y = level + 1.4 + layer * 4.3 + rand() * 1.1;
        if (y > 55) continue;
        const x = riverCenter(z) + side * (w + 1.2 + layer * 2.4 + rand() * 2.6);
        const g = new THREE.BoxGeometry(2.4 + rand() * 3.8, 0.8 + rand() * 0.9, 4.2 + rand() * 7.5);
        g.rotateY((rand() - 0.5) * 0.35);
        g.rotateZ((rand() - 0.5) * 0.12);
        g.translate(x, y, z + (rand() - 0.5) * 2);
        bucket.add(tintGeometry(g, palette[(layer + (side > 0 ? 1 : 0)) % palette.length], 0.2, rand), rockMat);
      }
    }
  }
  for (let i = 0; i < 18; i++) {
    const z = CLIFF_Z - 34 + rand() * 34;
    const side = i % 2 ? 1 : -1;
    const x = riverCenter(z) + side * (halfWidthAt(z) - 4 - rand() * 12);
    const g = new THREE.DodecahedronGeometry(1.4 + rand() * 2.4, 0);
    g.scale(1.3, 0.62 + rand() * 0.35, 1.1);
    g.rotateY(rand() * 6.2);
    g.translate(x, WATER_HIGH - 1.2 + rand() * 2.4, z);
    bucket.add(tintGeometry(g, 0x6c5638, 0.22, rand), rockMat);
  }
}

function buildRockInstances(root, rand) {
  const geo = new THREE.DodecahedronGeometry(1, 0);
  const count = 270;
  const mesh = new THREE.InstancedMesh(geo, rockInstMat, count);
  mesh.name = 'hukou-instanced-rocks';
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  const palette = [0x8f7350, 0x9c8058, 0x745b3d, 0xa98b60, 0x655039];
  let i = 0;

  while (i < 150) {
    const side = rand() > 0.5 ? 1 : -1;
    const z = -150 + rand() * 470;
    const w = halfWidthAt(z);
    const x = riverCenter(z) + side * (w + 5 + rand() * 30);
    const h = heightAt(x, z);
    const s = 1.1 + rand() * 3.2;
    dummy.position.set(x, h + s * 0.28, z);
    dummy.rotation.set(rand() * 1.2, rand() * 6.2, rand() * 1.2);
    dummy.scale.set(s * (0.8 + rand() * 0.5), s * (0.55 + rand() * 0.4), s * (0.8 + rand() * 0.5));
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    color.set(palette[i % palette.length]).multiplyScalar(0.86 + rand() * 0.24);
    mesh.setColorAt(i, color);
    i++;
  }
  while (i < 225) {
    const side = rand() > 0.5 ? 1 : -1;
    const z = -110 + rand() * 360;
    const w = halfWidthAt(z);
    const x = riverCenter(z) + side * (w - 2 - rand() * 7);
    const s = 1.2 + rand() * 2.6;
    dummy.position.set(x, WATER_LOW + s * 0.18, z);
    dummy.rotation.set(rand() * 1.2, rand() * 6.2, rand() * 1.2);
    dummy.scale.set(s, s * (0.55 + rand() * 0.3), s);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    color.set(palette[(i + 2) % palette.length]).multiplyScalar(0.8 + rand() * 0.2);
    mesh.setColorAt(i, color);
    i++;
  }
  while (i < count) {
    const side = rand() > 0.5 ? 1 : -1;
    const z = -520 + rand() * 900;
    const w = halfWidthAt(z);
    const x = riverCenter(z) + side * (w + 24 + rand() * 150);
    const h = heightAt(x, z);
    const s = 0.8 + rand() * 2.4;
    dummy.position.set(x, h + s * 0.25, z);
    dummy.rotation.set(rand() * 1.4, rand() * 6.2, rand() * 1.4);
    dummy.scale.set(s, s * 0.6, s);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    color.set(palette[i % palette.length]).multiplyScalar(0.84 + rand() * 0.2);
    mesh.setColorAt(i, color);
    i++;
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  root.add(mesh);
}

/* ------------------------------------------------------------------ */
/* 龙洞 cave                                                          */
/* ------------------------------------------------------------------ */

function buildCave(bucket, glowGroup, rand) {
  const floorTop = 13.25;
  const cx = -38;
  const cz = 7;
  const caveRock = [];
  tintBox(caveRock, 24, 0.75, 30, cx, floorTop - 0.37, cz, 0x6a5238, rand);
  tintBox(caveRock, 5, 16, 32, -47.5, 20.4, cz, 0x5b442f, rand);
  tintBox(caveRock, 24, 15, 4, cx, 20.7, -7.8, 0x604a34, rand);
  tintBox(caveRock, 24, 15, 4, cx, 20.7, 21.8, 0x604a34, rand);
  tintBox(caveRock, 24, 3.0, 32, cx, 27.4, cz, 0x55402c, rand, 0, 0, 0.05);
  tintBox(caveRock, 3.2, 7, 21, -27.8, 25.4, cz, 0x5f4932, rand);
  for (const g of caveRock) bucket.add(g, rockDarkMat);

  const arch = new THREE.TorusGeometry(9.0, 2.0, 8, 22, Math.PI);
  arch.rotateY(Math.PI / 2);
  arch.translate(-27.3, 13.25, cz);
  bucket.add(tintGeometry(arch, 0x7c6141, 0.16, rand), rockMat);

  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * Math.PI * 2;
    const g = new THREE.DodecahedronGeometry(2.0 + rand() * 2.4, 0);
    g.scale(1.2, 0.9, 1.1);
    g.rotateY(rand() * 6.2);
    g.translate(-26.2 + Math.cos(a) * 3.2, 22.6 + Math.sin(a) * 3.4, cz + (rand() - 0.5) * 17);
    bucket.add(tintGeometry(g, 0x806443, 0.18, rand), rockMat);
  }

  for (let i = 0; i < 8; i++) {
    const g = new THREE.DodecahedronGeometry(4.5 + rand() * 4.5, 0);
    g.scale(1.4, 0.9, 1.3);
    g.rotateY(rand() * 6.2);
    g.translate(-38 + (rand() - 0.5) * 14, 31 + rand() * 5, cz + (rand() - 0.5) * 20);
    bucket.add(tintGeometry(g, 0x8a6b47, 0.18, rand), rockMat);
  }

  const rail = [];
  for (let z = -1; z <= 15; z += 2.2) {
    addBox(rail, 0.16, 1.15, 0.16, -25.9, floorTop + 0.58, z);
  }
  addBox(rail, 0.2, 0.14, 17.4, -25.9, floorTop + 1.14, 7);
  addBox(rail, 0.16, 0.1, 17.4, -25.9, floorTop + 0.6, 7);
  for (const g of rail) bucket.add(g, woodMat);

  const lampPositions = [
    [-30.5, 23.4, 0.5],
    [-31.2, 22.6, 12.5],
    [-40.5, 24.2, 3.5],
    [-44.6, 21.6, 11.0],
    [-42.0, 20.3, -2.0],
    [-34.0, 18.2, 16.5],
    [-36.5, 17.4, -2.5],
  ];
  for (let i = 0; i < lampPositions.length; i++) {
    const p = lampPositions[i];
    const mat = new THREE.SpriteMaterial({
      map: glowMap,
      color: 0xffb45f,
      transparent: true,
      opacity: 0.52,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true,
      fog: true,
      toneMapped: true,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.position.set(...p);
    sprite.scale.set(4.6, 4.6, 1);
    sprite.renderOrder = 9;
    glowGroup.add(sprite);
  }
  const lightDefs = [
    [-30.5, 22.4, 5, 26, 40],
    [-40.5, 22.6, 8, 22, 36],
    [-36.5, 18.0, 14, 16, 26],
  ];
  for (const d of lightDefs) {
    const light = new THREE.PointLight(0xffa453, d[3], d[4], 2);
    light.position.set(d[0], d[1], d[2]);
    glowGroup.add(light);
  }
}

/* ------------------------------------------------------------------ */
/* terraces, banners, labels                                           */
/* ------------------------------------------------------------------ */

function addRailing(bucket, x, z0, z1, deckTop, side) {
  const list = [];
  for (let z = z0; z <= z1; z += 2.8) {
    addBox(list, 0.16, 1.2, 0.16, x, deckTop + 0.6, z);
  }
  addBox(list, 0.2, 0.15, z1 - z0 + 0.4, x, deckTop + 1.2, (z0 + z1) / 2);
  addBox(list, 0.14, 0.1, z1 - z0 + 0.4, x, deckTop + 0.62, (z0 + z1) / 2);
  for (const g of list) bucket.add(g, ironMat);
}

function addBanner(bucket, x, y, z, scale = 1) {
  const cloth = new THREE.PlaneGeometry(2.5 * scale, 5.2 * scale, 3, 3);
  const pos = cloth.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const px = pos.getX(i);
    pos.setZ(i, Math.sin(px * 1.7) * 0.22 * scale);
  }
  cloth.computeVertexNormals();
  cloth.rotateY(Math.PI / 2);
  cloth.translate(x, y, z);
  bucket.add(cloth, bannerMat);
  const trim = [];
  addBox(trim, 0.08, 0.12, 2.6 * scale, x, y + 2.55 * scale, z);
  addBox(trim, 0.08, 0.12, 2.6 * scale, x, y - 2.55 * scale, z);
  addBox(trim, 0.08, 5.2 * scale, 0.12, x, y, z - 1.25 * scale);
  addBox(trim, 0.08, 5.2 * scale, 0.12, x, y, z + 1.25 * scale);
  for (const g of trim) bucket.add(g, bannerGoldMat);
}

function buildTerrace(bucket, rand, cx, cz, w, d, riverSide) {
  const deckTop = heightAt(cx, cz) + 0.5;
  const deck = [];
  tintBox(deck, w, 1.0, d, cx, deckTop - 0.5, cz, 0xa38f6b, rand);
  tintBox(deck, w - 2.4, 4.0, d - 2.4, cx, deckTop - 2.7, cz, 0x8a7552, rand);
  tintBox(deck, w - 6, 0.35, d - 6, cx, deckTop + 0.12, cz, 0xb9a47c, rand);
  for (const g of deck) bucket.add(g, stoneMat);
  const edgeX = cx + riverSide * (w / 2 - 0.7);
  addRailing(bucket, edgeX, cz - d / 2 + 1.5, cz + d / 2 - 1.5, deckTop, riverSide);
  addRailing(bucket, cx - (w / 2) + 1, cz - d / 2 + 1, cz - d / 2 + 1, deckTop, riverSide);
  return deckTop;
}

function makeLabel(title, subtitle, x, y, z, scale = 1) {
  const tex = makeLabelTexture(title, subtitle);
  const material = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: true,
    depthWrite: false,
    opacity: 0.95,
    toneMapped: true,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(34 * scale, 10.4 * scale, 1);
  sprite.position.set(x, y, z);
  sprite.renderOrder = 10;
  return sprite;
}

/* ------------------------------------------------------------------ */
/* main overlay                                                        */
/* ------------------------------------------------------------------ */

export function createHukouOverlay() {
  const root = new THREE.Group();
  root.name = 'hukou-signature-overlay';
  const staticGroup = new THREE.Group();
  staticGroup.name = 'hukou-merged-static';
  const dynamicGroup = new THREE.Group();
  dynamicGroup.name = 'hukou-dynamic-water';
  const glowGroup = new THREE.Group();
  glowGroup.name = 'hukou-cave-glow';
  const bucket = new Bucket();
  const rand = mulberry32(20261021);

  console.log('MARK ledges-start');
  buildLedges(bucket, rand);
  console.log('MARK cave-start');
  buildCave(bucket, glowGroup, rand);
  console.log('MARK cave-done');

  const leftDeck = buildTerrace(bucket, rand, -66, 72, 46, 28, 1);
  const rightDeck = buildTerrace(bucket, rand, 62, 88, 36, 24, -1);
  addBanner(bucket, -43.2, leftDeck + 3.4, 61, 0.95);
  addBanner(bucket, -43.2, leftDeck + 3.4, 71, 0.95);
  addBanner(bucket, -43.2, leftDeck + 3.4, 81, 0.95);
  addBanner(bucket, 43.2, rightDeck + 3.2, 82, 0.85);
  addBanner(bucket, 43.2, rightDeck + 3.2, 92, 0.85);

  console.log('MARK bucket-start');
  bucket.build(staticGroup);
  console.log('MARK bucket-done');
  root.add(staticGroup);

  console.log('MARK rocks-start');
  buildRockInstances(root, rand);
  console.log('MARK people-start');
  addInstancedPeople(root, rand);
  console.log('MARK donkeys-start');
  addDonkeys(root, rand);
  console.log('MARK cast-done');
  root.add(glowGroup);

  const mainFallMats = [];
  const mudMat = new THREE.MeshBasicMaterial({
    map: mudTexture,
    color: 0xdcbd8b,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: true,
    toneMapped: true,
  });
  const foamMat = new THREE.MeshBasicMaterial({
    map: foamTexture,
    color: 0xfff2d8,
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: true,
    toneMapped: true,
  });
  const foamMat2 = foamMat.clone();
  foamMat2.opacity = 0.34;
  mainFallMats.push(mudMat, foamMat, foamMat2);

  const curtainDefs = [
    { geo: createCurtainGeometry(78, 31, WATER_HIGH + 0.15, CLIFF_Z - 3.0, 7.6, 2.0), mat: mudMat, order: 4 },
    { geo: createCurtainGeometry(70, 30.4, WATER_HIGH + 0.2, CLIFF_Z - 2.5, 8.8, 2.5), mat: foamMat, order: 5 },
    { geo: createCurtainGeometry(61, 29.6, WATER_HIGH + 0.25, CLIFF_Z - 2.0, 10.0, 2.9), mat: foamMat2, order: 6 },
    { geo: createCurtainGeometry(11, 19, WATER_HIGH - 1.2, CLIFF_Z - 3.5, 6.2, 1.4), mat: foamMat, order: 5, x: -28 },
    { geo: createCurtainGeometry(11, 19, WATER_HIGH - 1.2, CLIFF_Z - 3.5, 6.2, 1.4), mat: foamMat, order: 5, x: 28 },
  ];
  for (const c of curtainDefs) {
    const mesh = new THREE.Mesh(c.geo, c.mat);
    if (c.x) mesh.position.x = c.x;
    mesh.renderOrder = c.order;
    dynamicGroup.add(mesh);
  }

  const crestFoamMat = new THREE.MeshBasicMaterial({
    map: splashTexture,
    color: 0xf9eed4,
    transparent: true,
    opacity: 0.58,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: true,
    toneMapped: true,
  });
  const crestFoam = new THREE.Mesh(new THREE.PlaneGeometry(90, 13), crestFoamMat);
  crestFoam.rotation.x = -Math.PI / 2;
  crestFoam.position.set(0, WATER_HIGH + 0.45, CLIFF_Z - 4);
  crestFoam.renderOrder = 5;
  dynamicGroup.add(crestFoam);

  const baseFoamMat = crestFoamMat.clone();
  baseFoamMat.opacity = 0.7;
  const baseFoam = new THREE.Mesh(new THREE.PlaneGeometry(104, 58), baseFoamMat);
  baseFoam.rotation.x = -Math.PI / 2;
  baseFoam.position.set(0, WATER_LOW + 0.4, CLIFF_Z + 28);
  baseFoam.renderOrder = 4;
  dynamicGroup.add(baseFoam);

  const gorgeFoamMat = crestFoamMat.clone();
  gorgeFoamMat.opacity = 0.3;
  const gorgeFoam = new THREE.Mesh(new THREE.PlaneGeometry(36, 340), gorgeFoamMat);
  gorgeFoam.rotation.x = -Math.PI / 2;
  gorgeFoam.position.set(0, WATER_LOW + 0.34, 165);
  gorgeFoam.renderOrder = 4;
  dynamicGroup.add(gorgeFoam);

  const veilMat = new THREE.MeshBasicMaterial({
    map: mistMap,
    color: 0xf3e5c8,
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: true,
    toneMapped: true,
  });
  const veil = new THREE.Mesh(new THREE.PlaneGeometry(82, 30), veilMat);
  veil.position.set(0, 21, CLIFF_Z + 13);
  veil.renderOrder = 5;
  dynamicGroup.add(veil);

  const mist = buildMist(rand);
  dynamicGroup.add(mist.group);

  const rainbowMat = new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.28,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
    toneMapped: false,
  });
  const rainbow = new THREE.Mesh(createRainbowGeometry(46, 6.2), rainbowMat);
  rainbow.position.set(2, WATER_LOW + 1.5, CLIFF_Z + 31);
  rainbow.renderOrder = 7;
  dynamicGroup.add(rainbow);

  const rainbowMat2 = rainbowMat.clone();
  rainbowMat2.opacity = 0.12;
  const rainbow2 = new THREE.Mesh(createRainbowGeometry(57, 2.6), rainbowMat2);
  rainbow2.position.set(2, WATER_LOW + 1.5, CLIFF_Z + 37);
  rainbow2.renderOrder = 7;
  dynamicGroup.add(rainbow2);

  root.add(dynamicGroup);

  root.add(makeLabel('壶口瀑布', 'HUKOU FALLS · YELLOW RIVER', 0, 57, CLIFF_Z + 4, 1.05));
  root.add(makeLabel('龙洞', 'LONGDONG CAVE', -25.5, 25.8, 7, 0.62));
  root.add(makeLabel('十里龙槽', 'SHILI LONGCAO GORGE', 0, 24, 155, 0.78));
  root.add(makeLabel('黄河', 'YELLOW RIVER', -128, 58, -420, 0.92));
  root.add(makeLabel('观瀑台', 'GUANPU TERRACE', -66, leftDeck + 7.4, 74, 0.62));
  root.add(makeLabel('陕西 · 宜川', 'SHAANXI SIDE', 62, rightDeck + 6.6, 88, 0.56));

  const caveLights = glowGroup.children.filter((c) => c.isPointLight);
  const lanternSprites = glowGroup.children.filter((c) => c.isSprite);

  function update(elapsed, dt) {
    const step = Math.min(0.05, Number.isFinite(dt) ? dt : 0.016);
    mudTexture.offset.y = (mudTexture.offset.y - step * 0.5) % 1;
    foamTexture.offset.y = (foamTexture.offset.y - step * 0.82) % 1;
    splashTexture.offset.y = (splashTexture.offset.y - step * 0.16) % 1;
    splashTexture.offset.x = Math.sin(elapsed * 0.12) * 0.05;
    mudMat.opacity = 0.86 + Math.sin(elapsed * 1.4) * 0.035;
    foamMat.opacity = 0.56 + Math.sin(elapsed * 1.7 + 0.7) * 0.06;
    foamMat2.opacity = 0.31 + Math.sin(elapsed * 1.4 + 1.9) * 0.05;
    crestFoamMat.opacity = 0.52 + Math.sin(elapsed * 1.8) * 0.07;
    baseFoamMat.opacity = 0.64 + Math.sin(elapsed * 1.25 + 0.4) * 0.08;
    gorgeFoamMat.opacity = 0.26 + Math.sin(elapsed * 0.9 + 1.2) * 0.05;
    veilMat.opacity = 0.25 + Math.sin(elapsed * 0.42) * 0.05;
    rainbowMat.opacity = 0.2 + Math.sin(elapsed * 0.4) * 0.09;
    rainbowMat2.opacity = 0.09 + Math.sin(elapsed * 0.33 + 1.4) * 0.04;
    rainbow.rotation.z = Math.sin(elapsed * 0.03) * 0.012;
    rainbow2.rotation.z = Math.sin(elapsed * 0.042 + 0.8) * 0.016;
    for (let i = 0; i < caveLights.length; i++) {
      caveLights[i].intensity = (i === 0 ? 26 : i === 1 ? 22 : 16) * (0.86 + Math.sin(elapsed * 2.2 + i * 2.2) * 0.14);
    }
    for (let i = 0; i < lanternSprites.length; i++) {
      lanternSprites[i].material.opacity = 0.4 + Math.sin(elapsed * 1.7 + i * 1.3) * 0.14;
    }
    mist.update(elapsed, step);
  }

  console.log('MARK overlay-end');
  update(0.2, 0.016);

  return {
    group: root,
    update,
    curtains: curtainDefs,
    mist,
    rainbow,
    rainbowMat,
    caveLights,
    labels: { main: '壶口瀑布' },
  };
}
