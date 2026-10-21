import * as THREE from 'three';
import { mats, sharedTextures } from './materials.js';
import { mergeStaticGroup, mergeGeometryList } from './geometry.js';
import { makeLabelTexture, makeGlowTexture } from './textures.js';
import {
  heightAt,
  slopeAt,
  fbm,
  smoothstep,
  riverCenter,
  lowerHalfWidth,
  upperHalfWidth,
  WATER_LOW,
  WATER_HIGH,
  CLIFF_Z,
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

function segGeo(ax, ay, az, bx, by, bz, ra, rb, seg = 6) {
  const dx = bx - ax;
  const dy = by - ay;
  const dz = bz - az;
  const len = Math.hypot(dx, dy, dz) || 1;
  const geo = new THREE.CylinderGeometry(rb, ra, len, seg, 1, false);
  const q = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(dx / len, dy / len, dz / len)
  );
  geo.applyQuaternion(q);
  geo.translate((ax + bx) * 0.5, (ay + by) * 0.5, (az + bz) * 0.5);
  return geo;
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
    colors[i * 3] = Math.max(0, c.r);
    colors[i * 3 + 1] = Math.max(0, c.g);
    colors[i * 3 + 2] = Math.max(0, c.b);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo;
}

class Bucket {
  constructor() {
    this.map = new Map();
  }
  add(geo, mat) {
    if (!geo.attributes.uv) {
      const count = geo.attributes.position.count;
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(count * 2), 2));
    }
    if (!geo.attributes.normal) geo.computeVertexNormals();
    if (!geo.attributes.color) {
      const count = geo.attributes.position.count;
      const colors = new Float32Array(count * 3);
      colors.fill(1);
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    }
    if (!this.map.has(mat)) this.map.set(mat, []);
    this.map.get(mat).push(geo);
    return geo;
  }
  build(group) {
    for (const [mat, list] of this.map) {
      if (!list.length) continue;
      const geo = mergeGeometryList(list);
      if (!geo) continue;
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = !(mat.userData && mat.userData.noShadow);
      mesh.receiveShadow = true;
      group.add(mesh);
    }
  }
}

const limestoneMat = new THREE.MeshStandardMaterial({
  map: sharedTextures.graniteMap,
  color: 0xc9c7b5,
  vertexColors: true,
  roughness: 0.96,
  metalness: 0,
  flatShading: true,
});

const wetRockMat = new THREE.MeshStandardMaterial({
  map: sharedTextures.graniteMap,
  color: 0x8b9788,
  vertexColors: true,
  roughness: 0.34,
  metalness: 0.12,
  flatShading: true,
});

const caveRockMat = new THREE.MeshStandardMaterial({
  color: 0x4a5247,
  vertexColors: true,
  roughness: 0.48,
  metalness: 0.08,
  flatShading: true,
});

const mossMat = new THREE.MeshStandardMaterial({
  map: sharedTextures.graniteMap,
  color: 0x6f8b4e,
  vertexColors: true,
  roughness: 1,
});

const woodMat = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  vertexColors: true,
  roughness: 0.9,
});

const roofMat = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  vertexColors: true,
  roughness: 0.78,
  flatShading: true,
});

const stoneBuildMat = new THREE.MeshStandardMaterial({
  map: sharedTextures.stoneMap,
  color: 0xb5b4a2,
  vertexColors: true,
  roughness: 0.98,
});

const clothMat = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  vertexColors: true,
  roughness: 0.9,
});

const leafMat = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  vertexColors: true,
  roughness: 0.92,
  side: THREE.DoubleSide,
});

const earthMat = new THREE.MeshStandardMaterial({
  color: 0x7d6c4e,
  roughness: 1,
});

const bambooMat = new THREE.MeshStandardMaterial({
  color: 0xa6c07a,
  roughness: 0.82,
});

const lanternMat = new THREE.MeshStandardMaterial({
  color: 0xffb55e,
  emissive: 0xff8a35,
  emissiveIntensity: 2.6,
  roughness: 0.5,
});

const glowMat = new THREE.SpriteMaterial({
  map: makeGlowTexture(),
  color: 0xffb066,
  transparent: true,
  opacity: 0.55,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  fog: true,
  toneMapped: false,
});

const mistTexture = sharedTextures.cloudMap.clone();
mistTexture.needsUpdate = true;

const fallTextures = [];
const fallMaterials = [];

function makeMistMaterial(opacity, color = 0xeef7f2) {
  return new THREE.MeshBasicMaterial({
    map: mistTexture,
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: true,
    toneMapped: true,
  });
}

function makeFallTexture(seed, streakCount = 300) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 512;
  const ctx = c.getContext('2d');
  const rand = mulberry32(seed);
  ctx.clearRect(0, 0, 256, 512);
  const grd = ctx.createLinearGradient(0, 0, 0, 512);
  grd.addColorStop(0, 'rgba(246,253,251,0.5)');
  grd.addColorStop(0.16, 'rgba(240,251,247,0.62)');
  grd.addColorStop(0.58, 'rgba(231,247,242,0.78)');
  grd.addColorStop(0.88, 'rgba(224,244,239,0.64)');
  grd.addColorStop(1, 'rgba(230,248,243,0.26)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 256, 512);
  for (let i = 0; i < streakCount; i++) {
    const x = rand() * 256;
    const w = 0.4 + rand() * 4.6;
    const len = 50 + rand() * 300;
    const y = rand() * 512;
    ctx.strokeStyle = 'rgba(255,255,255,' + (0.08 + rand() * 0.62).toFixed(3) + ')';
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (rand() - 0.5) * 6, y + len);
    ctx.stroke();
  }
  for (let i = 0; i < 52; i++) {
    const x = rand() * 256;
    const y = rand() * 512;
    const r = 3 + rand() * 17;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,0.5)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

function makeFallMaterial(texture, opacity, color = 0xf2fbf7) {
  return new THREE.MeshBasicMaterial({
    map: texture,
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: true,
    toneMapped: true,
  });
}

function addFallLayer(backRepeat, midRepeat, frontRepeat) {
  const t0 = makeFallTexture(3100 + fallTextures.length * 17, 320);
  t0.repeat.set(backRepeat[0], backRepeat[1]);
  const t1 = makeFallTexture(7100 + fallTextures.length * 23, 360);
  t1.repeat.set(midRepeat[0], midRepeat[1]);
  const t2 = makeFallTexture(9900 + fallTextures.length * 29, 300);
  t2.repeat.set(frontRepeat[0], frontRepeat[1]);
  fallTextures.push(t0, t1, t2);
  fallMaterials.push(makeFallMaterial(t0, 0.88), makeFallMaterial(t1, 0.68), makeFallMaterial(t2, 0.44, 0xf6fdfa));
  return fallMaterials.slice(-3);
}

function makeLabel(title, subtitle, x, y, z, scale = 1) {
  const tex = makeLabelTexture(title, subtitle);
  const material = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: true,
    depthWrite: false,
    opacity: 0.94,
    toneMapped: true,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(34 * scale, 10.4 * scale, 1);
  sprite.position.set(x, y, z);
  sprite.renderOrder = 8;
  return sprite;
}

function createMainCliff() {
  const nx = 96;
  const ny = 44;
  const x0 = -188;
  const x1 = 188;
  const y0 = 0.8;
  const y1 = 90;
  const positions = [];
  const colors = [];
  const uvs = [];
  const indices = [];
  const cRock = new THREE.Color(0x707467);
  const cWarm = new THREE.Color(0x847a63);
  const cWet = new THREE.Color(0x3f4f43);
  const cMoss = new THREE.Color(0x3c5d35);
  const cDark = new THREE.Color(0x2f3a30);
  const tmp = new THREE.Color();
  const rand = mulberry32(88213);
  for (let ix = 0; ix <= nx; ix++) {
    const u = ix / nx;
    const x = x0 + (x1 - x0) * u;
    for (let iy = 0; iy <= ny; iy++) {
      const v = iy / ny;
      const y = y0 + (y1 - y0) * v;
      const fallMask = 1 - smoothstep(76, 154, Math.abs(x));
      const tier = Math.floor((y + Math.sin(x * 0.052) * 3.6) / 9.8);
      const ledge = Math.sin(tier * 1.63 + x * 0.031) * 1.4;
      const wobble =
        Math.sin(u * 33 + v * 15 + 0.8) * 2.3 +
        Math.sin(v * 51 - u * 11 + 2.2) * 1.6 +
        (fbm(x * 0.052 + 3.1, y * 0.072 - 2.4, 3) - 0.5) * 6;
      const caveMask =
        (1 - smoothstep(54, 78, Math.abs(x))) *
        smoothstep(27, 34, y) *
        (1 - smoothstep(61, 68, y));
      const z = CLIFF_Z - 7.5 + (1 - v) * 8 + wobble + ledge + fallMask * 2.2 - caveMask * 27;
      positions.push(x, y, z);
      const wet = smoothstep(0.18, 0.86, v) * fallMask;
      const shade = 0.8 + rand() * 0.24;
      tmp.copy(cRock).lerp(cWarm, 0.22 + 0.3 * Math.sin(y * 0.17 + u * 6.4));
      tmp.lerp(cWet, wet * 0.68 + (1 - v) * 0.16);
      tmp.lerp(cMoss, smoothstep(0.48, 0.92, v) * (0.22 + rand() * 0.26));
      tmp.lerp(cDark, caveMask * 0.5 + smoothstep(0.1, 0, v) * 0.18);
      colors.push(tmp.r * shade, tmp.g * shade, tmp.b * shade);
      uvs.push(u * 10, v * 7);
    }
  }
  for (let ix = 0; ix < nx; ix++) {
    for (let iy = 0; iy < ny; iy++) {
      const a = ix * (ny + 1) + iy;
      const b = (ix + 1) * (ny + 1) + iy;
      const c = (ix + 1) * (ny + 1) + iy + 1;
      const d = ix * (ny + 1) + iy + 1;
      indices.push(a, b, d, b, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function createCurtainGeometry(width, height, baseY, bulge, seed, z0 = CLIFF_Z + 7) {
  const cols = 30;
  const rows = 26;
  const positions = [];
  const uvs = [];
  const indices = [];
  const rand = mulberry32(seed);
  for (let iy = 0; iy <= rows; iy++) {
    const v = iy / rows;
    const t = 1 - v;
    for (let ix = 0; ix <= cols; ix++) {
      const u = ix / cols;
      const x = (u - 0.5) * width;
      const y = baseY + height * t;
      const edge = Math.pow(Math.abs(u - 0.5) * 2, 5) * 5.2;
      const z =
        z0 +
        Math.pow(v, 1.62) * bulge +
        Math.sin(u * 15 + v * 9 + seed) * 0.58 +
        (rand() - 0.5) * 0.18 -
        edge;
      positions.push(x, y, z);
      uvs.push(u, v);
    }
  }
  for (let iy = 0; iy < rows; iy++) {
    for (let ix = 0; ix < cols; ix++) {
      const a = iy * (cols + 1) + ix;
      const b = a + 1;
      const c = (iy + 1) * (cols + 1) + ix;
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

function createCrestWater(zStart, zEnd, y, width, rows = 14, cols = 30) {
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let iz = 0; iz <= rows; iz++) {
    const v = iz / rows;
    const z = zStart + (zEnd - zStart) * v;
    for (let ix = 0; ix <= cols; ix++) {
      const u = ix / cols;
      const x = (u - 0.5) * width;
      const edgeDrop = smoothstep(0.74, 1, v) * 3.2;
      positions.push(x, y - edgeDrop + Math.sin(u * 20 + v * 5) * 0.14, z);
      uvs.push(u * 3, v * 5);
    }
  }
  for (let iz = 0; iz < rows; iz++) {
    for (let ix = 0; ix < cols; ix++) {
      const a = iz * (cols + 1) + ix;
      const b = a + 1;
      const c = (iz + 1) * (cols + 1) + ix;
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

function createRainbowGeometry(radius, halfWidth, arc, segments = 96) {
  const bands = 8;
  const positions = [];
  const colors = [];
  const indices = [];
  const c = new THREE.Color();
  const start = Math.PI * (0.5 - arc * 0.5);
  const end = Math.PI * (0.5 + arc * 0.5);
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const a = start + (end - start) * t;
    for (let j = 0; j <= bands; j++) {
      const k = j / bands;
      const rr = radius - halfWidth + k * halfWidth * 2;
      positions.push(Math.cos(a) * rr, Math.sin(a) * rr, 0);
      c.setHSL(0.75 - k * 0.75, 0.8, 0.62);
      colors.push(c.r, c.g, c.b);
    }
  }
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < bands; j++) {
      const a = i * (bands + 1) + j;
      const b = a + 1;
      const c2 = a + bands + 1;
      const d = c2 + 1;
      indices.push(a, c2, b, b, c2, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}
function createCaveShell(bucket, rand, glowGroup) {
  const x0 = -68;
  const x1 = 68;
  const zBack = CLIFF_Z - 38;
  const zFront = CLIFF_Z - 9;
  const yFloor = 34.4;
  const yCeil = 58.5;
  const cDark = new THREE.Color(0x3b443b);
  const cWet = new THREE.Color(0x566458);
  const cEdge = new THREE.Color(0x6a725c);
  const tmp = new THREE.Color();

  function grid(nx, nz, pointFn, colorFn, uvScale = 3) {
    const positions = [];
    const colors = [];
    const uvs = [];
    const indices = [];
    for (let i = 0; i <= nx; i++) {
      const u = i / nx;
      for (let j = 0; j <= nz; j++) {
        const v = j / nz;
        const p = pointFn(u, v);
        positions.push(p[0], p[1], p[2]);
        const c = colorFn(u, v, p);
        colors.push(c.r, c.g, c.b);
        uvs.push(u * uvScale, v * uvScale);
      }
    }
    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < nz; j++) {
        const a = i * (nz + 1) + j;
        const b = a + 1;
        const c = (i + 1) * (nz + 1) + j;
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  const back = grid(
    22,
    14,
    (u, v) => {
      const x = x0 + (x1 - x0) * u;
      const y = yFloor + (yCeil - yFloor) * v;
      const z = zBack + Math.sin(u * 15 + v * 7) * 1.8 + (fbm(x * 0.12, y * 0.12, 2) - 0.5) * 3.2;
      return [x, y, z];
    },
    (u, v) => {
      tmp.copy(cDark).lerp(cWet, 0.25 + Math.sin(v * 12 + u * 5) * 0.18);
      tmp.lerp(cEdge, smoothstep(0.72, 1, v) * 0.28);
      return tmp;
    }
  );
  bucket.add(back, caveRockMat);

  const left = grid(
    14,
    12,
    (u, v) => {
      const z = zBack + (zFront - zBack) * u;
      const y = yFloor + (yCeil - yFloor) * v;
      const x = x0 + Math.sin(u * 9 + v * 5) * 2.1 + v * 0.5;
      return [x, y, z];
    },
    (u, v) => {
      tmp.copy(cDark).lerp(cWet, 0.2 + Math.sin(u * 11 + v * 7) * 0.14);
      return tmp;
    }
  );
  bucket.add(left, caveRockMat);

  const right = left.clone();
  right.scale(-1, 1, 1);
  bucket.add(right, caveRockMat);

  const ceiling = grid(
    18,
    14,
    (u, v) => {
      const x = x0 + (x1 - x0) * u;
      const z = zBack + (zFront - zBack) * v;
      const y = yCeil - Math.sin(v * Math.PI) * 3.8 + Math.sin(u * 17 + v * 8) * 1.2;
      return [x, y, z];
    },
    (u, v) => {
      tmp.copy(cDark).lerp(cWet, 0.18 + Math.sin(u * 13 + v * 9) * 0.14);
      return tmp;
    }
  );
  bucket.add(ceiling, caveRockMat);

  const floor = grid(
    18,
    12,
    (u, v) => {
      const x = x0 + (x1 - x0) * u;
      const z = zBack + (zFront - zBack) * v;
      const y = yFloor - 0.4 + Math.sin(u * 13 + v * 7) * 0.34 + (fbm(x * 0.16, z * 0.16, 2) - 0.5) * 0.6;
      return [x, y, z];
    },
    (u, v) => {
      tmp.copy(cDark).lerp(cWet, 0.34 + Math.sin(u * 15 + v * 9) * 0.2);
      return tmp;
    }
  );
  bucket.add(floor, caveRockMat);

  const caveBoxes = [];
  addBox(caveBoxes, 138, 5.4, 2.4, 0, 59.8, zFront - 0.6);
  addBox(caveBoxes, 138, 3.4, 2.2, 0, 32.4, zFront - 0.6);
  for (const px of [-28, 28]) {
    addBox(caveBoxes, 5.6, 27, 2.4, px, 46, zFront - 0.4);
  }
  addBox(caveBoxes, 46, 2.1, 0.32, 0, 36.2, zFront - 2.2);
  addBox(caveBoxes, 26, 2.1, 0.32, 0, 36.2, zFront - 2.2);
  for (const g of caveBoxes) bucket.add(tintGeometry(g, 0x454f45, 0.16, rand), caveRockMat);

  const walk = new THREE.BoxGeometry(130, 0.55, 21);
  walk.translate(0, 35.1, zBack + 12.5);
  bucket.add(tintGeometry(walk, 0x807d6b, 0.12, rand), stoneBuildMat);

  for (let i = 0; i < 22; i++) {
    const x = -58 + rand() * 116;
    const z = zBack + 3 + rand() * 25;
    const len = 1.2 + rand() * 4.6;
    const cone = new THREE.ConeGeometry(0.35 + rand() * 0.45, len, 5);
    cone.rotateX(Math.PI);
    cone.translate(x, yCeil - 2.4 - len * 0.5, z);
    bucket.add(tintGeometry(cone, 0x3d473e, 0.16, rand), caveRockMat);
  }

  for (let i = 0; i < 7; i++) {
    const x = -48 + rand() * 96;
    const z = zBack + 4 + rand() * 19;
    const h = 0.7 + rand() * 1.7;
    const cone = new THREE.ConeGeometry(0.4 + rand() * 0.6, h, 6);
    cone.translate(x, 35.4 + h * 0.5, z);
    bucket.add(tintGeometry(cone, 0x4b5548, 0.14, rand), caveRockMat);
  }

  const rail = [];
  for (let x = -62; x <= 62; x += 4.4) {
    addBox(rail, 0.22, 1.4, 0.22, x, 36.4, zFront - 3.2);
  }
  addBox(rail, 126, 0.16, 0.2, 0, 37.1, zFront - 3.2);
  addBox(rail, 126, 0.12, 0.16, 0, 36.1, zFront - 3.2);
  for (const g of rail) bucket.add(tintGeometry(g, 0x5a513c, 0.14, rand), woodMat);

  for (const x of [-52, -26, 0, 26, 52]) {
    const lantern = new THREE.SphereGeometry(0.34, 10, 8);
    lantern.scale(1, 1.25, 1);
    lantern.translate(x, 43.2, zBack + 1.3);
    bucket.add(tintGeometry(lantern, 0xd88b42, 0.1, rand), lanternMat);
    const sprite = new THREE.Sprite(glowMat.clone());
    sprite.position.set(x, 43.2, zBack + 2.2);
    sprite.scale.set(9, 9, 1);
    sprite.material.opacity = 0.34 + rand() * 0.16;
    glowGroup.add(sprite);
  }

  const lightA = new THREE.PointLight(0xffa45c, 26, 56, 1.5);
  lightA.position.set(-34, 45, zBack + 9);
  glowGroup.add(lightA);
  const lightB = new THREE.PointLight(0xffa45c, 22, 52, 1.5);
  lightB.position.set(36, 44, zBack + 9);
  glowGroup.add(lightB);
  const lightC = new THREE.PointLight(0x9fc8cc, 20, 64, 1.3);
  lightC.position.set(0, 48, zBack + 24);
  glowGroup.add(lightC);

  return { lightA, lightB, lightC };
}

function createDoupotangCliff() {
  const nx = 64;
  const ny = 22;
  const x0 = -382;
  const x1 = -230;
  const y0 = 79.2;
  const y1 = 105.2;
  const positions = [];
  const colors = [];
  const uvs = [];
  const indices = [];
  const cRock = new THREE.Color(0x747666);
  const cWarm = new THREE.Color(0x877b62);
  const cWet = new THREE.Color(0x425043);
  const cMoss = new THREE.Color(0x405f36);
  const tmp = new THREE.Color();
  const rand = mulberry32(55117);
  for (let ix = 0; ix <= nx; ix++) {
    const u = ix / nx;
    const x = x0 + (x1 - x0) * u;
    for (let iy = 0; iy <= ny; iy++) {
      const v = iy / ny;
      const y = y0 + (y1 - y0) * v;
      const fallMask = 1 - smoothstep(55, 68, Math.abs(x + 306));
      const wobble =
        Math.sin(u * 27 + v * 13) * 1.7 + (fbm(x * 0.08 + 2.2, y * 0.08 - 3.6, 3) - 0.5) * 4.2;
      const z = -604 + (1 - v) * 5 + wobble + fallMask * 1.8;
      positions.push(x, y, z);
      const shade = 0.8 + rand() * 0.24;
      tmp.copy(cRock).lerp(cWarm, 0.2 + 0.3 * Math.sin(y * 0.24 + u * 8));
      tmp.lerp(cWet, fallMask * 0.5 + (1 - v) * 0.18);
      tmp.lerp(cMoss, smoothstep(0.62, 1, v) * (0.22 + rand() * 0.2));
      colors.push(tmp.r * shade, tmp.g * shade, tmp.b * shade);
      uvs.push(u * 8, v * 5);
    }
  }
  for (let ix = 0; ix < nx; ix++) {
    for (let iy = 0; iy < ny; iy++) {
      const a = ix * (ny + 1) + iy;
      const b = (ix + 1) * (ny + 1) + iy;
      const c = (ix + 1) * (ny + 1) + iy + 1;
      const d = ix * (ny + 1) + iy + 1;
      indices.push(a, b, d, b, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}
function createSpire(bucket, rand, cx, cz, radius, height, seed) {
  const seg = 10;
  const rings = 8;
  const positions = [];
  const colors = [];
  const uvs = [];
  const indices = [];
  const base = Math.max(1.2, heightAt(cx, cz)) - 1.4;
  const cLow = new THREE.Color(0x8d907d);
  const cMid = new THREE.Color(0x778a6b);
  const cHigh = new THREE.Color(0x4f6d43);
  const cWet = new THREE.Color(0x5d7058);
  const tmp = new THREE.Color();
  const r = mulberry32(seed);
  for (let k = 0; k <= rings; k++) {
    const t = k / rings;
    const y = base + height * (t * t * (3 - 2 * t) * 0.5 + t * 0.5);
    const profile = 1 - 0.72 * Math.pow(t, 0.92);
    for (let j = 0; j < seg; j++) {
      const a = (j / seg) * Math.PI * 2;
      const groove =
        0.84 +
        0.13 * Math.sin(a * 5 + seed * 0.01) +
        0.06 * Math.sin(a * 11 + k * 0.9) +
        0.04 * Math.sin(a * 19 - 0.5);
      const rr = radius * profile * groove * (0.92 + r() * 0.18);
      positions.push(cx + Math.cos(a) * rr, y + (r() - 0.5) * height * 0.02, cz + Math.sin(a) * rr);
      const green = smoothstep(0.28, 0.82, t);
      tmp.copy(cLow).lerp(cMid, green * 0.9).lerp(cHigh, green * 0.7 + r() * 0.12);
      tmp.lerp(cWet, (1 - t) * 0.25 + Math.abs(Math.sin(a * 8 + t * 17)) * 0.08);
      const shade = 0.9 + r() * 0.14;
      colors.push(tmp.r * shade, tmp.g * shade, tmp.b * shade);
      uvs.push((j / seg) * 3, t * 3);
    }
  }
  for (let k = 0; k < rings; k++) {
    for (let j = 0; j < seg; j++) {
      const j2 = (j + 1) % seg;
      const a = k * seg + j;
      const b = k * seg + j2;
      const c = (k + 1) * seg + j;
      const d = (k + 1) * seg + j2;
      indices.push(a, c, b, b, c, d);
    }
  }
  const topY = base + height;
  positions.push(cx, topY, cz);
  colors.push(cHigh.r, cHigh.g, cHigh.b);
  uvs.push(0.5, 0.5);
  const top = positions.length / 3 - 1;
  for (let j = 0; j < seg; j++) {
    indices.push(rings * seg + j, top, rings * seg + ((j + 1) % seg));
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  bucket.add(geo, limestoneMat);

  const mossCap = new THREE.IcosahedronGeometry(Math.max(0.8, radius * 0.7), 0);
  mossCap.scale(1, 0.45, 1);
  mossCap.translate(cx, topY + 0.15, cz);
  bucket.add(tintGeometry(mossCap, 0x557a42, 0.18, rand), mossMat);

  return { x: cx, z: cz, topY, r: radius };
}

function buildStoneForest(bucket, rand) {
  const spires = [];
  const spots = [
    [252, 108, 3.2, 16], [276, 138, 4.1, 21], [304, 118, 2.8, 13],
    [326, 154, 3.6, 18], [352, 128, 2.5, 12], [374, 164, 4.2, 23],
    [398, 202, 3.1, 17], [342, 188, 2.7, 15], [310, 206, 3.8, 20],
    [282, 178, 2.4, 11], [416, 168, 2.9, 16], [438, 220, 3.4, 19],
    [388, 242, 2.6, 13], [350, 232, 3.1, 18], [296, 238, 2.2, 10],
    [262, 206, 2.9, 14], [424, 124, 3.7, 20], [456, 190, 2.4, 12],
    [230, 150, 2.1, 9], [466, 250, 3.0, 15], [318, 260, 2.3, 12],
  ];
  for (let i = 0; i < spots.length; i++) {
    const s = spots[i];
    spires.push(createSpire(bucket, rand, s[0], s[1], s[2], s[3], 8100 + i * 17));
  }

  const pools = [];
  const poolSpots = [
    [280, 160, 15, 10], [318, 180, 21, 13], [356, 148, 13, 9],
    [390, 210, 18, 12], [332, 222, 14, 9], [300, 120, 10, 7],
    [430, 176, 12, 8], [264, 184, 9, 6],
  ];
  for (const p of poolSpots) {
    const y = heightAt(p[0], p[1]) + 0.18;
    const disc = new THREE.CircleGeometry(1, 30);
    disc.rotateX(-Math.PI / 2);
    disc.scale(p[2], 1, p[3]);
    disc.translate(p[0], y, p[1]);
    pools.push(disc);
  }
  const poolGeo = mergeGeometryList(pools);
  const poolMat = new THREE.MeshStandardMaterial({
    color: 0x5aa78f,
    roughness: 0.16,
    metalness: 0.24,
    transparent: true,
    opacity: 0.76,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const poolMesh = new THREE.Mesh(poolGeo, poolMat);
  poolMesh.renderOrder = 2;
  poolMesh.name = 'tianxingqiao-water-gardens';
  poolMesh.receiveShadow = true;

  const stones = [];
  for (let i = 0; i < 34; i++) {
    const s = spires[(i * 3) % spires.length];
    const a = rand() * Math.PI * 2;
    const rr = 5 + rand() * 13;
    const x = s.x + Math.cos(a) * rr;
    const z = s.z + Math.sin(a) * rr;
    const y = heightAt(x, z) + 0.2;
    const h = 0.3 + rand() * 0.4;
    const g = new THREE.CylinderGeometry(0.9 + rand() * 0.8, 1.2 + rand() * 1.1, h, 7);
    g.translate(x, y + h * 0.5, z);
    stones.push(tintGeometry(g, 0x8f907d, 0.14, rand));
  }
  for (const g of stones) bucket.add(g, stoneBuildMat);

  const bridgeX = 286;
  const bridgeZ = 196;
  const bridge = [];
  for (let i = 0; i < 15; i++) {
    const t = i / 14;
    const x = bridgeX - 21 + t * 42;
    const y = heightAt(x, bridgeZ) + 1.2 + Math.sin(t * Math.PI) * 4.4;
    const g = new THREE.BoxGeometry(3.2, 0.6, 3.4);
    g.rotateZ(Math.cos(t * Math.PI) * 0.34);
    g.translate(x, y, bridgeZ);
    bridge.push(tintGeometry(g, 0x9a9987, 0.1, rand));
  }
  for (const g of bridge) bucket.add(g, stoneBuildMat);

  return { spires, poolMesh, poolMat };
}
function addPavilion(bucket, rand, x, z, yaw = 0, s = 1, baseY = null) {
  const ground = baseY == null ? Math.max(1.2, heightAt(x, z)) : baseY;
  const timber = [];
  const roof = [];
  const stone = [];
  const podium = new THREE.CylinderGeometry(5.6 * s, 6.1 * s, 0.9 * s, 8);
  podium.rotateY(yaw);
  podium.translate(x, ground + 0.45 * s, z);
  stone.push(tintGeometry(podium, 0x9c9b89, 0.1, rand));
  const deck = new THREE.BoxGeometry(9.4 * s, 0.26 * s, 9.4 * s);
  deck.rotateY(yaw);
  deck.translate(x, ground + 0.95 * s, z);
  stone.push(tintGeometry(deck, 0xa8a592, 0.08, rand));

  for (let i = 0; i < 6; i++) {
    const a = yaw + (i / 6) * Math.PI * 2;
    const px = x + Math.cos(a) * 3.9 * s;
    const pz = z + Math.sin(a) * 3.9 * s;
    const col = new THREE.CylinderGeometry(0.21 * s, 0.25 * s, 4.2 * s, 7);
    col.translate(px, ground + 3.0 * s, pz);
    timber.push(tintGeometry(col, 0x7c3f2c, 0.1, rand));
  }
  const ring = new THREE.TorusGeometry(3.9 * s, 0.16 * s, 5, 8);
  ring.rotateX(Math.PI / 2);
  ring.rotateY(yaw);
  ring.translate(x, ground + 5.05 * s, z);
  timber.push(tintGeometry(ring, 0x5e3024, 0.08, rand));

  for (let i = 0; i < 6; i++) {
    const a = yaw + (i / 6) * Math.PI * 2;
    const px = x + Math.cos(a) * 3.9 * s;
    const pz = z + Math.sin(a) * 3.9 * s;
    const g = new THREE.BoxGeometry(2.4 * s, 0.14 * s, 0.16 * s);
    g.rotateY(a + Math.PI / 2);
    g.translate(px, ground + 4.85 * s, pz);
    timber.push(tintGeometry(g, 0x6d3728, 0.08, rand));
  }

  const roofGeo = new THREE.ConeGeometry(6.7 * s, 2.1 * s, 8, 1, true);
  roofGeo.rotateY(yaw);
  roofGeo.translate(x, ground + 6.4 * s, z);
  roof.push(tintGeometry(roofGeo, 0x303a35, 0.1, rand));
  const roof2 = new THREE.ConeGeometry(3.2 * s, 1.3 * s, 8, 1, true);
  roof2.rotateY(yaw + Math.PI / 8);
  roof2.translate(x, ground + 8.0 * s, z);
  roof.push(tintGeometry(roof2, 0x28322e, 0.08, rand));
  const finial = new THREE.CylinderGeometry(0.12 * s, 0.2 * s, 1.0 * s, 6);
  finial.translate(x, ground + 8.9 * s, z);
  roof.push(tintGeometry(finial, 0x8c6a38, 0.08, rand));

  for (let i = 0; i < 8; i++) {
    const a = yaw + (i / 8) * Math.PI * 2;
    const ex = x + Math.cos(a) * 6.1 * s;
    const ez = z + Math.sin(a) * 6.1 * s;
    const eave = new THREE.BoxGeometry(2.3 * s, 0.16 * s, 0.48 * s);
    eave.rotateY(a + Math.PI / 2);
    eave.rotateZ(0.22);
    eave.translate(ex, ground + 6.9 * s, ez);
    roof.push(tintGeometry(eave, 0x38443c, 0.1, rand));
  }

  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const px = x + Math.cos(a) * 5.05 * s;
    const pz = z + Math.sin(a) * 5.05 * s;
    const post = new THREE.CylinderGeometry(0.12 * s, 0.14 * s, 1.35 * s, 5);
    post.translate(px, ground + 1.65 * s, pz);
    timber.push(tintGeometry(post, 0x70402f, 0.09, rand));
  }
  const hand = new THREE.TorusGeometry(5.05 * s, 0.11 * s, 4, 10);
  hand.rotateX(Math.PI / 2);
  hand.translate(x, ground + 2.3 * s, z);
  timber.push(tintGeometry(hand, 0x5c3227, 0.08, rand));

  const lantern = new THREE.SphereGeometry(0.3 * s, 8, 6);
  lantern.scale(1, 1.25, 1);
  lantern.translate(x + Math.cos(yaw) * 2.7 * s, ground + 5.6 * s, z + Math.sin(yaw) * 2.7 * s);
  roof.push(tintGeometry(lantern, 0xb8402c, 0.12, rand));

  for (const g of stone) bucket.add(g, stoneBuildMat);
  for (const g of timber) bucket.add(g, woodMat);
  for (const g of roof) bucket.add(g, roofMat);
}

function addBuyiHouse(bucket, rand, x, z, yaw, s = 1) {
  const ground = Math.max(1.2, heightAt(x, z));
  const wall = [];
  const roof = [];
  const stone = [];
  addBox(stone, 8.8 * s, 0.6 * s, 6.6 * s, x, ground + 0.3 * s, z, yaw);
  addBox(wall, 7.8 * s, 3.4 * s, 0.24 * s, x - Math.sin(yaw) * 2.7 * s, ground + 2.2 * s, z - Math.cos(yaw) * 2.7 * s, yaw);
  addBox(wall, 7.8 * s, 3.4 * s, 0.24 * s, x + Math.sin(yaw) * 2.7 * s, ground + 2.2 * s, z + Math.cos(yaw) * 2.7 * s, yaw);
  addBox(wall, 0.24 * s, 3.4 * s, 5.0 * s, x + Math.cos(yaw) * 3.8 * s, ground + 2.2 * s, z + Math.sin(yaw) * 3.8 * s, yaw);
  addBox(wall, 0.24 * s, 3.4 * s, 5.0 * s, x - Math.cos(yaw) * 3.8 * s, ground + 2.2 * s, z - Math.sin(yaw) * 3.8 * s, yaw);
  addBox(stone, 1.6 * s, 2.2 * s, 0.3 * s, x - Math.cos(yaw) * 3.82 * s, ground + 1.35 * s, z - Math.sin(yaw) * 3.82 * s, yaw);
  for (const side of [-1, 1]) {
    const g = new THREE.BoxGeometry(5.6 * s, 0.24 * s, 8.4 * s);
    g.rotateZ(side * 0.48);
    g.rotateY(yaw);
    g.translate(x + Math.cos(yaw) * side * 2.3 * s, ground + 4.35 * s, z + Math.sin(yaw) * side * 2.3 * s);
    roof.push(tintGeometry(g, 0x35403a, 0.1, rand));
  }
  addBox(roof, 0.3 * s, 0.3 * s, 8.6 * s, x, ground + 5.5 * s, z, yaw);
  for (const g of wall) bucket.add(tintGeometry(g, 0xa79f86, 0.1, rand), woodMat);
  for (const g of roof) bucket.add(g, roofMat);
  for (const g of stone) bucket.add(tintGeometry(g, 0x8f8e7e, 0.1, rand), stoneBuildMat);
}

function addBuyiPerson(list, x, y, z, yaw, jacket, seed, headscarf = true) {
  const rand = mulberry32(seed);
  const body = new THREE.BoxGeometry(0.44, 0.76, 0.3);
  body.rotateY(yaw);
  body.translate(x, y + 1.26, z);
  list.push(tintGeometry(body, jacket, 0.1, rand));
  const skirt = new THREE.CylinderGeometry(0.3, 0.46, 0.54, 7);
  skirt.rotateY(yaw);
  skirt.translate(x, y + 0.78, z);
  list.push(tintGeometry(skirt, 0x2d3f5c, 0.1, rand));
  for (const side of [-1, 1]) {
    const leg = new THREE.BoxGeometry(0.14, 0.42, 0.16);
    leg.rotateY(yaw);
    leg.translate(x + Math.cos(yaw) * side * 0.1, y + 0.36, z - Math.sin(yaw) * side * 0.1);
    list.push(tintGeometry(leg, 0x252a2b, 0.06, rand));
    const arm = new THREE.BoxGeometry(0.11, 0.62, 0.14);
    arm.rotateZ(side * 0.12);
    arm.rotateY(yaw);
    arm.translate(x + Math.cos(yaw) * side * 0.28, y + 1.26, z - Math.sin(yaw) * side * 0.28);
    list.push(tintGeometry(arm, jacket, 0.08, rand));
  }
  const head = new THREE.IcosahedronGeometry(0.2, 1);
  head.translate(x, y + 1.8, z);
  list.push(tintGeometry(head, 0xc39a72, 0.06, rand));
  if (headscarf) {
    const scarf = new THREE.CylinderGeometry(0.23, 0.27, 0.18, 8);
    scarf.translate(x, y + 1.94, z);
    list.push(tintGeometry(scarf, 0xe5e9df, 0.05, rand));
    const knot = new THREE.BoxGeometry(0.16, 0.24, 0.08);
    knot.rotateY(yaw);
    knot.translate(x - Math.sin(yaw) * 0.22, y + 1.79, z - Math.cos(yaw) * 0.22);
    list.push(tintGeometry(knot, 0xdfe5da, 0.05, rand));
  }
  if (rand() < 0.6) {
    const basket = new THREE.CylinderGeometry(0.22, 0.2, 0.4, 8);
    basket.translate(x - Math.sin(yaw) * 0.36, y + 1.1, z - Math.cos(yaw) * 0.36);
    list.push(tintGeometry(basket, 0x926f3e, 0.12, rand));
  }
}

function createFernGeometry() {
  const positions = [];
  const uvs = [];
  const indices = [];
  const fronds = 7;
  const segments = 5;
  for (let f = 0; f < fronds; f++) {
    const a = (f / fronds) * Math.PI * 2 + 0.2;
    const dx = Math.cos(a);
    const dz = Math.sin(a);
    const px = -dz;
    const pz = dx;
    const len = 0.85 + (f % 3) * 0.16;
    const base = positions.length / 3;
    for (let s = 0; s <= segments; s++) {
      const t = s / segments;
      const out = Math.sin(t * 1.15) * len;
      const y = Math.sin(t * Math.PI * 0.86) * len * 0.68 + t * 0.08;
      const w = Math.sin(t * Math.PI) * 0.15 + 0.012;
      const cx = dx * out;
      const cz = dz * out;
      positions.push(cx + px * w, y, cz + pz * w);
      positions.push(cx - px * w, y, cz - pz * w);
      uvs.push(0, t, 1, t);
    }
    for (let s = 0; s < segments; s++) {
      const i0 = base + s * 2;
      const i1 = i0 + 1;
      const i2 = i0 + 2;
      const i3 = i0 + 3;
      indices.push(i0, i2, i1, i1, i2, i3);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}
function buildVegetation(rand) {
  const canopy = [];
  const trunks = [];
  const ferns = [];
  const moss = [];
  const shrubs = [];
  const rocks = [];
  const grass = [];
  const bambooPoles = [];
  const bambooLeaves = [];

  let attempts = 0;
  while (canopy.length < 300 && attempts < 9000) {
    attempts++;
    const x = (rand() - 0.5) * 1880;
    const z = (rand() - 0.5) * 1880 + 80;
    const y = heightAt(x, z);
    if (y < WATER_LOW + 2.6 || y > 124) continue;
    const c = riverCenter(z);
    if (Math.abs(x - c) < lowerHalfWidth(z) + 20) continue;
    if (z > CLIFF_Z - 30 && z < CLIFF_Z + 120 && Math.abs(x) < 196) continue;
    if (slopeAt(x, z) > 1.75) continue;
    const h = 4.2 + rand() * 7.2;
    const r = 2.0 + rand() * 3.4;
    const color = [0x2f5c36, 0x3f7040, 0x4f8146, 0x28513a, 0x5c8c48][(rand() * 5) | 0];
    trunks.push([x, y + h * 0.5, z, 0.22 + r * 0.055, h, 0.22 + r * 0.055, rand() * 6.2, 0x4b3d2d]);
    canopy.push([x, y + h + r * 0.35, z, r, r * 0.72, r, rand() * 6.2, color]);
    if (rand() < 0.7) {
      canopy.push([
        x + (rand() - 0.5) * r * 1.2,
        y + h + r * 0.08,
        z + (rand() - 0.5) * r * 1.2,
        r * 0.68,
        r * 0.5,
        r * 0.68,
        rand() * 6.2,
        color,
      ]);
    }
  }

  let fernTries = 0;
  while (ferns.length < 920 && fernTries < 9000) {
    fernTries++;
    const x = (rand() - 0.5) * 1180;
    const z = (rand() - 0.5) * 1060 + 40;
    const y = heightAt(x, z);
    if (y < WATER_LOW + 0.7 || y > 120) continue;
    const c = riverCenter(z);
    if (Math.abs(x - c) < lowerHalfWidth(z) + 1.5) continue;
    if (slopeAt(x, z) > 2.1) continue;
    const s = 0.8 + rand() * 1.8;
    ferns.push([x, y + 0.05, z, s, s * (0.8 + rand() * 0.6), s, rand() * 6.2, rand() < 0.45 ? 0x4f7d3c : 0x6c9047]);
  }

  for (let i = 0; i < 760; i++) {
    const x = (rand() - 0.5) * 1280;
    const z = (rand() - 0.5) * 1160 + 40;
    const y = heightAt(x, z);
    if (y < WATER_LOW + 0.4 || y > 122) continue;
    const c = riverCenter(z);
    if (Math.abs(x - c) < lowerHalfWidth(z) + 0.8) continue;
    if (slopeAt(x, z) > 2.4) continue;
    const s = 0.35 + rand() * 1.3;
    moss.push([x, y + 0.06, z, s * (1.2 + rand()), s * 0.22, s * (1.2 + rand()), rand() * 6.2, rand() < 0.5 ? 0x4b713e : 0x5f8547]);
  }

  for (let i = 0; i < 280; i++) {
    const side = rand() < 0.5 ? -1 : 1;
    const x = side * (68 + rand() * 118);
    const y = 8 + rand() * 76;
    const u = (x + 188) / 376;
    const v = y / 90;
    const fallMask = 1 - smoothstep(76, 154, Math.abs(x));
    const tier = Math.floor((y + Math.sin(x * 0.052) * 3.6) / 9.8);
    const ledge = Math.sin(tier * 1.63 + x * 0.031) * 1.4;
    const wobble =
      Math.sin(u * 33 + v * 15 + 0.8) * 2.3 +
      Math.sin(v * 51 - u * 11 + 2.2) * 1.6 +
      (fbm(x * 0.052 + 3.1, y * 0.072 - 2.4, 3) - 0.5) * 6;
    const z = CLIFF_Z - 7.5 + (1 - v) * 8 + wobble + ledge + fallMask * 2.2 + 1.6;
    const s = 0.45 + rand() * 1.15;
    moss.push([x, y, z, s * (1.1 + rand()), s * 0.45, s * (1.1 + rand()), rand() * 6.2, rand() < 0.45 ? 0x3f6636 : 0x557a40]);
  }

  for (let i = 0; i < 130; i++) {
    const side = rand() < 0.5 ? -1 : 1;
    const x = side * (78 + rand() * 104);
    const y = 12 + rand() * 68;
    const u = (x + 188) / 376;
    const v = y / 90;
    const fallMask = 1 - smoothstep(76, 154, Math.abs(x));
    const tier = Math.floor((y + Math.sin(x * 0.052) * 3.6) / 9.8);
    const ledge = Math.sin(tier * 1.63 + x * 0.031) * 1.4;
    const wobble =
      Math.sin(u * 33 + v * 15 + 0.8) * 2.3 +
      Math.sin(v * 51 - u * 11 + 2.2) * 1.6 +
      (fbm(x * 0.052 + 3.1, y * 0.072 - 2.4, 3) - 0.5) * 6;
    const z = CLIFF_Z - 7.5 + (1 - v) * 8 + wobble + ledge + fallMask * 2.2 + 2.0;
    const r = 0.7 + rand() * 1.4;
    shrubs.push([x, y + r * 0.3, z, r, r * 0.55, r, rand() * 6.2, rand() < 0.5 ? 0x355f34 : 0x49723b]);
  }

  for (let i = 0; i < 340; i++) {
    const x = (rand() - 0.5) * 1550;
    const z = (rand() - 0.5) * 1450 + 60;
    const y = heightAt(x, z);
    if (y < WATER_LOW + 1 || y > 118) continue;
    const c = riverCenter(z);
    if (Math.abs(x - c) < lowerHalfWidth(z) + 4) continue;
    if (slopeAt(x, z) > 2) continue;
    const r = 0.5 + rand() * 1.7;
    shrubs.push([x, y + r * 0.35, z, r, r * 0.68, r, rand() * 6.2, rand() < 0.5 ? 0x3d673c : 0x557d43]);
  }

  for (let i = 0; i < 180; i++) {
    const x = (rand() - 0.5) * 1160;
    const z = (rand() - 0.5) * 1060 + 80;
    const y = heightAt(x, z);
    if (y < WATER_LOW + 0.3 || y > 108) continue;
    const c = riverCenter(z);
    if (Math.abs(x - c) < lowerHalfWidth(z) + 2) continue;
    const r = 0.35 + rand() * 1.6;
    rocks.push([x, y + r * 0.22, z, r * 1.25, r * 0.7, r, rand() * 6.2, rand() < 0.5 ? 0x878c7e : 0x9d9f8e]);
  }

  for (let i = 0; i < 1000; i++) {
    const x = (rand() - 0.5) * 1320;
    const z = (rand() - 0.5) * 1220 + 60;
    const y = heightAt(x, z);
    if (y < WATER_LOW + 1 || y > 112) continue;
    const c = riverCenter(z);
    if (Math.abs(x - c) < lowerHalfWidth(z) + 3) continue;
    const r = 0.22 + rand() * 0.46;
    grass.push([x, y + r * 0.9, z, r, r * 2.0, r, rand() * 6.2, rand() < 0.5 ? 0x63883f : 0x7b9c48]);
  }

  for (let i = 0; i < 150; i++) {
    let x = 0;
    let z = 0;
    let y = 0;
    let ok = false;
    for (let tries = 0; tries < 24; tries++) {
      x = (rand() - 0.5) * 760;
      z = (rand() - 0.5) * 700 + 120;
      y = heightAt(x, z);
      const c = riverCenter(z);
      if (y > WATER_LOW + 1.6 && y < 92 && Math.abs(x - c) > lowerHalfWidth(z) + 14 && slopeAt(x, z) < 1.7) {
        ok = true;
        break;
      }
    }
    if (!ok) continue;
    const clump = 2 + (rand() * 3 | 0);
    for (let p = 0; p < clump; p++) {
      const a = rand() * Math.PI * 2;
      const rr = rand() * 2.4;
      const px = x + Math.cos(a) * rr;
      const pz = z + Math.sin(a) * rr;
      const h = 6 + rand() * 8;
      bambooPoles.push([px, y + h * 0.5, pz, 0.07 + rand() * 0.04, h, 0.07 + rand() * 0.04, 0, 0x829f57]);
      const leaves = 2 + (rand() * 3 | 0);
      for (let l = 0; l < leaves; l++) {
        const la = rand() * Math.PI * 2;
        bambooLeaves.push([
          px + Math.cos(la) * (0.5 + rand() * 1.3),
          y + h * (0.52 + rand() * 0.4),
          pz + Math.sin(la) * (0.5 + rand() * 1.3),
          0.42 + rand() * 0.26,
          1.2 + rand() * 0.9,
          0.42,
          la,
          0x477238,
        ]);
      }
    }
  }

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  function makeInstances(geo, mat, data, cast) {
    if (!data.length) return null;
    const mesh = new THREE.InstancedMesh(geo, mat, data.length);
    for (let i = 0; i < data.length; i++) {
      const d = data[i];
      dummy.position.set(d[0], d[1], d[2]);
      dummy.rotation.set(0, d[6], 0);
      dummy.scale.set(d[3], d[4], d[5]);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      color.setHex(d[7]);
      mesh.setColorAt(i, color);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = !!cast;
    mesh.receiveShadow = true;
    return mesh;
  }

  const canopyGeo = new THREE.IcosahedronGeometry(1, 1);
  const trunkGeo = new THREE.CylinderGeometry(0.8, 1, 1, 6);
  const fernGeo = createFernGeometry();
  const mossGeo = new THREE.IcosahedronGeometry(1, 0);
  const shrubGeo = new THREE.IcosahedronGeometry(1, 0);
  const rockGeo = new THREE.DodecahedronGeometry(1, 0);
  const bambooGeo = new THREE.CylinderGeometry(0.75, 1, 1, 5);
  const leafGeo = new THREE.PlaneGeometry(1, 1);
  const grassGeo = (() => {
    const a = new THREE.PlaneGeometry(1, 1);
    a.rotateY(Math.PI / 4);
    const b = new THREE.PlaneGeometry(1, 1);
    b.rotateY(-Math.PI / 4);
    return mergeGeometryList([a, b]);
  })();

  const canopyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 });
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.96 });
  const fernMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, side: THREE.DoubleSide });
  const mossInstMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 });
  const shrubMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.96 });
  const rockInstMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.99, flatShading: true });
  const grassInstMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.98, side: THREE.DoubleSide });
  const bambooInstMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.82 });
  const leafInstMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, side: THREE.DoubleSide });

  const group = new THREE.Group();
  group.name = 'huangguoshu-instanced-vegetation';
  const meshes = [
    makeInstances(canopyGeo, canopyMat, canopy, true),
    makeInstances(trunkGeo, trunkMat, trunks, true),
    makeInstances(fernGeo, fernMat, ferns, false),
    makeInstances(mossGeo, mossInstMat, moss, false),
    makeInstances(shrubGeo, shrubMat, shrubs, false),
    makeInstances(rockGeo, rockInstMat, rocks, true),
    makeInstances(grassGeo, grassInstMat, grass, false),
    makeInstances(bambooGeo, bambooInstMat, bambooPoles, true),
    makeInstances(leafGeo, leafInstMat, bambooLeaves, false),
  ];
  for (const m of meshes) if (m) group.add(m);
  return {
    group,
    counts: {
      trees: trunks.length,
      ferns: ferns.length,
      moss: moss.length,
      bamboo: bambooPoles.length,
      shrubs: shrubs.length,
      rocks: rocks.length,
    },
  };
}

function buildMist(rand) {
  const group = new THREE.Group();
  group.name = 'huangguoshu-spray-and-mist';
  const matsList = [
    makeMistMaterial(0.24, 0xeff9f4),
    makeMistMaterial(0.18, 0xe6f4ee),
    makeMistMaterial(0.13, 0xf7fcf9),
  ];
  const sprites = [];
  const defs = [];
  for (let i = 0; i < 26; i++) {
    defs.push([-118 + rand() * 236, 4 + rand() * 50, CLIFF_Z + 20 + rand() * 128, 62 + rand() * 104, 0.27 + rand() * 0.08]);
  }
  for (let i = 0; i < 11; i++) {
    defs.push([-372 + rand() * 128, 78 + rand() * 23, -590 + rand() * 68, 34 + rand() * 46, 0.16 + rand() * 0.06]);
  }
  for (let i = 0; i < 9; i++) {
    defs.push([-58 + rand() * 116, 36 + rand() * 15, CLIFF_Z - 32 + rand() * 20, 18 + rand() * 24, 0.19 + rand() * 0.06]);
  }
  for (let i = 0; i < defs.length; i++) {
    const d = defs[i];
    const spr = new THREE.Sprite(matsList[i % 3]);
    spr.position.set(d[0], d[1], d[2]);
    const s = d[3];
    spr.scale.set(s * (1.5 + rand() * 0.7), s * (0.55 + rand() * 0.3), 1);
    spr.userData.baseX = d[0];
    spr.userData.baseY = d[1];
    spr.userData.baseZ = d[2];
    spr.userData.phase = rand() * 6.2;
    spr.userData.drift = 3 + rand() * 7;
    spr.userData.lift = 1 + rand() * 2.4;
    spr.userData.opacity = d[4];
    spr.material = spr.material.clone();
    spr.material.opacity = d[4];
    spr.renderOrder = 6;
    group.add(spr);
    sprites.push(spr);
  }

  const mistSheets = [];
  for (let i = 0; i < 5; i++) {
    const sheetMat = makeMistMaterial(0.15, 0xf1faf6);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(240 - i * 26, 42 + i * 10), sheetMat);
    mesh.position.set((i - 2) * 20, 10 + i * 7, CLIFF_Z + 32 + i * 17);
    mesh.renderOrder = 5;
    mesh.userData.baseY = mesh.position.y;
    mesh.userData.phase = i * 1.2;
    group.add(mesh);
    mistSheets.push(mesh);
  }

  const count = 1240;
  const positions = new Float32Array(count * 3);
  const seeds = [];
  for (let i = 0; i < count; i++) {
    let x;
    let y;
    let z;
    if (i < 760) {
      x = -132 + rand() * 264;
      y = 2 + rand() * 58;
      z = CLIFF_Z + 12 + rand() * 112;
    } else if (i < 1020) {
      x = -374 + rand() * 136;
      y = 78 + rand() * 28;
      z = -588 + rand() * 72;
    } else {
      x = -60 + rand() * 120;
      y = 34 + rand() * 18;
      z = CLIFF_Z - 34 + rand() * 28;
    }
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
    seeds.push({ x, y, z, phase: rand() * 6.2, rise: 0.6 + rand() * 2.2, amp: 1 + rand() * 9 });
  }
  const pgeo = new THREE.BufferGeometry();
  pgeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const pmat = new THREE.PointsMaterial({
    map: mistTexture,
    color: 0xf4fbf7,
    size: 5.2,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
    sizeAttenuation: true,
    blending: THREE.NormalBlending,
  });
  const points = new THREE.Points(pgeo, pmat);
  points.renderOrder = 6;
  group.add(points);

  return {
    group,
    sprites,
    sheets: mistSheets,
    points,
    seeds,
    count,
    update(elapsed) {
      for (const s of sprites) {
        const flicker = 0.72 + 0.28 * Math.sin(elapsed * 0.35 + s.userData.phase);
        s.material.opacity = s.userData.opacity * flicker;
        s.position.x = s.userData.baseX + Math.sin(elapsed * 0.17 + s.userData.phase) * s.userData.drift;
        s.position.y = s.userData.baseY + Math.sin(elapsed * 0.29 + s.userData.phase) * s.userData.lift;
        s.position.z = s.userData.baseZ + Math.cos(elapsed * 0.1 + s.userData.phase) * 5;
      }
      for (const s of mistSheets) {
        s.position.y = s.userData.baseY + Math.sin(elapsed * 0.22 + s.userData.phase) * 2.4;
        s.position.x = Math.sin(elapsed * 0.07 + s.userData.phase) * 8;
      }
      const arr = pgeo.attributes.position.array;
      for (let i = 0; i < count; i++) {
        const s = seeds[i];
        const t = elapsed * s.rise + s.phase * 14;
        const k = (t % 64) / 64;
        arr[i * 3] = s.x + Math.sin(elapsed * 0.44 + s.phase) * s.amp * (0.25 + k);
        arr[i * 3 + 1] = s.y + k * 34;
        arr[i * 3 + 2] = s.z + Math.cos(elapsed * 0.21 + s.phase) * s.amp * 0.55;
      }
      pgeo.attributes.position.needsUpdate = true;
    },
  };
}
export function createHuangguoshuOverlay() {
  const root = new THREE.Group();
  root.name = 'huangguoshu-signature-overlay';
  const staticGroup = new THREE.Group();
  const dynamicGroup = new THREE.Group();
  dynamicGroup.name = 'huangguoshu-dynamic-water-life';
  const glowGroup = new THREE.Group();
  glowGroup.name = 'huangguoshu-cave-glow';
  const bucket = new Bucket();
  const rand = mulberry32(20261021);

  bucket.add(createMainCliff(), limestoneMat);
  bucket.add(createDoupotangCliff(), limestoneMat);
  createCaveShell(bucket, rand, glowGroup);

  const stoneForest = buildStoneForest(bucket, rand);
  for (let i = 0; i < 18; i++) {
    const x = -396 + rand() * 166;
    const z = -552 + rand() * 48;
    const y = heightAt(x, z);
    const r = 1.1 + rand() * 2.6;
    const g = new THREE.DodecahedronGeometry(r, 0);
    g.scale(1.25, 0.58 + rand() * 0.22, 0.9 + rand() * 0.3);
    g.rotateY(rand() * 6.2);
    g.translate(x, y + r * 0.24, z);
    bucket.add(tintGeometry(g, 0x7c8878, 0.18, rand), wetRockMat);
  }
  addPavilion(bucket, rand, -150, 12, 0.42, 1.12);
  addPavilion(bucket, rand, 132, 76, -0.62, 0.95);
  addPavilion(bucket, rand, -242, -536, 2.7, 0.78);
  addPavilion(bucket, rand, 342, 262, -0.9, 0.7);

  const houses = [
    [188, 268, 0.32, 1.0],
    [214, 294, -0.2, 1.08],
    [228, 252, 0.18, 0.92],
    [172, 306, -0.42, 0.96],
  ];
  for (const h of houses) addBuyiHouse(bucket, rand, h[0], h[1], h[2], h[3]);

  const villagerSpots = [
    [-111, -89, 1.0, 0x33405c],
    [-119, -96, 2.1, 0x28344a],
    [-104, -99, 1.4, 0x3f4d67],
    [-127, -78, 0.4, 0x5b3c35],
    [-139, 8, 1.7, 0x31455f],
    [-146, 20, 2.4, 0x3c3f50],
    [196, 246, -1.1, 0x404d66],
    [209, 270, 0.5, 0x2f3d57],
    [224, 282, -0.3, 0x5a3b34],
    [184, 292, 1.8, 0x37465f],
    [336, 248, -0.8, 0x33405c],
    [128, 92, 0.9, 0x2e4058],
  ];
  for (let i = 0; i < villagerSpots.length; i++) {
    const v = villagerSpots[i];
    const y = heightAt(v[0], v[1]);
    const person = [];
    addBuyiPerson(person, v[0], y, v[1], v[2], v[3], 12300 + i * 31, i % 3 !== 0);
    for (const g of person) bucket.add(g, clothMat);
  }

  const deck = [];
  const deckY = heightAt(-116, -97) + 0.4;
  addBox(deck, 28, 0.7, 20, -116, deckY, -97, 0.12);
  addBox(deck, 28, 0.18, 0.4, -116, deckY + 1.05, -107.2, 0.12);
  addBox(deck, 0.4, 0.18, 20, -130, deckY + 1.05, -97, 0.12);
  for (let i = 0; i < 9; i++) {
    addBox(deck, 0.22, 1.1, 0.22, -128 + i * 3.1, deckY + 0.55, -107.2, 0.12);
  }
  for (const g of deck) bucket.add(tintGeometry(g, 0x999786, 0.1, rand), stoneBuildMat);

  bucket.build(staticGroup);
  const mergedStatic = mergeStaticGroup(staticGroup);
  mergedStatic.name = 'huangguoshu-merged-static';
  root.add(mergedStatic);
  root.add(stoneForest.poolMesh);

  const vegetation = buildVegetation(rand);
  root.add(vegetation.group);

  const upperVillage = [];
  for (let i = 0; i < 18; i++) {
    const x = 166 + rand() * 82;
    const z = 238 + rand() * 82;
    const y = heightAt(x, z);
    const g = new THREE.CylinderGeometry(0.12 + rand() * 0.08, 0.16 + rand() * 0.1, 3.2 + rand() * 2.6, 5);
    g.translate(x, y + 1.7, z);
    upperVillage.push(tintGeometry(g, 0x6c5137, 0.12, rand));
  }
  const villageFence = [];
  for (const g of upperVillage) villageFence.push(g);
  const fenceMesh = mergeGeometryList(villageFence);
  if (fenceMesh) {
    const fence = new THREE.Mesh(fenceMesh, woodMat);
    fence.castShadow = true;
    fence.receiveShadow = true;
    root.add(fence);
  }

  root.add(glowGroup);
  return assembleDynamic(root, dynamicGroup, glowGroup, bucket, rand, vegetation, stoneForest);
}
function assembleDynamic(root, dynamicGroup, glowGroup, bucket, rand, vegetation, stoneForest) {
  const mainFallMats = addFallLayer([1.45, 2.9], [2.0, 3.5], [2.7, 4.5]);
  const doupFallMats = addFallLayer([1.05, 1.7], [1.45, 2.15], [1.95, 2.8]);

  const crestMat = new THREE.MeshStandardMaterial({
    color: 0x8fd0c1,
    transparent: true,
    opacity: 0.82,
    roughness: 0.1,
    metalness: 0.24,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const crest = new THREE.Mesh(createCrestWater(CLIFF_Z - 36, CLIFF_Z + 5, WATER_HIGH - 0.1, 124, 18, 34), crestMat);
  crest.renderOrder = 2;
  crest.name = 'huangguoshu-crest-water';
  dynamicGroup.add(crest);

  const doupCrest = new THREE.Mesh(createCrestWater(-630, -594, 101.1, 118, 12, 28), crestMat.clone());
  doupCrest.material.opacity = 0.78;
  doupCrest.renderOrder = 2;
  doupCrest.name = 'doupotang-crest-water';
  dynamicGroup.add(doupCrest);

  const curtainDefs = [
    { geo: createCurtainGeometry(120, 77.8, 2.6, 18, 31), mat: mainFallMats[0], x: 0, z: 0, order: 4 },
    { geo: createCurtainGeometry(96, 76.4, 2.6, 22, 73), mat: mainFallMats[1], x: -3, z: 0.7, order: 5 },
    { geo: createCurtainGeometry(68, 74.2, 2.8, 26, 117), mat: mainFallMats[2], x: 6, z: 1.4, order: 6 },
    { geo: createCurtainGeometry(21, 64, 3.4, 19, 151), mat: mainFallMats[1], x: -84, z: 0, order: 5 },
    { geo: createCurtainGeometry(17, 58, 3.8, 16, 191), mat: mainFallMats[1], x: 89, z: 0, order: 5 },
  ];
  for (const c of curtainDefs) {
    const mesh = new THREE.Mesh(c.geo, c.mat);
    mesh.position.set(c.x, 0, c.z);
    mesh.renderOrder = c.order;
    dynamicGroup.add(mesh);
  }

  const doupCurtains = [
    { geo: createCurtainGeometry(114, 21, 80.4, 6.5, 411, -596), mat: doupFallMats[0], order: 4 },
    { geo: createCurtainGeometry(92, 20.4, 80.5, 8, 457, -595), mat: doupFallMats[1], order: 5 },
    { geo: createCurtainGeometry(66, 19.4, 80.7, 9.5, 499, -594), mat: doupFallMats[2], order: 6 },
  ];
  for (const c of doupCurtains) {
    const mesh = new THREE.Mesh(c.geo, c.mat);
    mesh.renderOrder = c.order;
    dynamicGroup.add(mesh);
  }

  const lipFoamMat = new THREE.MeshBasicMaterial({
    map: mistTexture,
    color: 0xf8fffb,
    transparent: true,
    opacity: 0.54,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: true,
  });
  const lipFoam = new THREE.Mesh(new THREE.PlaneGeometry(230, 9), lipFoamMat);
  lipFoam.rotation.x = -Math.PI / 2;
  lipFoam.position.set(0, WATER_HIGH + 0.42, CLIFF_Z - 8);
  lipFoam.renderOrder = 5;
  dynamicGroup.add(lipFoam);

  const doupFoam = new THREE.Mesh(new THREE.PlaneGeometry(132, 13), lipFoamMat.clone());
  doupFoam.material.opacity = 0.46;
  doupFoam.rotation.x = -Math.PI / 2;
  doupFoam.position.set(-306, 101.4, -603);
  doupFoam.renderOrder = 5;
  dynamicGroup.add(doupFoam);

  const doupPoolMat = new THREE.MeshStandardMaterial({
    color: 0x64b39a,
    roughness: 0.16,
    metalness: 0.22,
    transparent: true,
    opacity: 0.8,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const doupPool = new THREE.Mesh(new THREE.CircleGeometry(1, 54), doupPoolMat);
  doupPool.rotation.x = -Math.PI / 2;
  doupPool.scale.set(77, 52, 1);
  doupPool.position.set(-306, 80.72, -563);
  doupPool.renderOrder = 2;
  dynamicGroup.add(doupPool);
  const doupFoamPool = new THREE.Mesh(new THREE.PlaneGeometry(150, 74), makeMistMaterial(0.4, 0xf0fbf6));
  doupFoamPool.rotation.x = -Math.PI / 2;
  doupFoamPool.position.set(-306, 80.82, -581);
  doupFoamPool.renderOrder = 4;
  dynamicGroup.add(doupFoamPool);

  const mist = buildMist(rand);
  dynamicGroup.add(mist.group);

  const rainbowMat = new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.23,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
    toneMapped: false,
  });
  const rainbow = new THREE.Mesh(createRainbowGeometry(108, 5.6, 0.93), rainbowMat);
  rainbow.position.set(12, 6, CLIFF_Z + 102);
  rainbow.renderOrder = 7;
  dynamicGroup.add(rainbow);

  const rainbowMat2 = rainbowMat.clone();
  rainbowMat2.opacity = 0.1;
  const rainbow2 = new THREE.Mesh(createRainbowGeometry(84, 3.6, 0.78), rainbowMat2);
  rainbow2.position.set(-6, 8, CLIFF_Z + 112);
  rainbow2.renderOrder = 7;
  dynamicGroup.add(rainbow2);

  root.add(dynamicGroup);

  root.add(makeLabel('黄果树瀑布', 'HUANGGUOSHU FALLS · GUIZHOU', 0, 106, CLIFF_Z + 4, 1.12));
  root.add(makeLabel('水帘洞', 'WATER CURTAIN CAVE', -88, 56, CLIFF_Z + 8, 0.66));
  root.add(makeLabel('犀牛潭', 'RHINOCEROS POOL', 86, 15, CLIFF_Z + 78, 0.6));
  root.add(makeLabel('陡坡塘', 'DOUPOTANG CASCADE', -306, 113, -596, 0.82));
  root.add(makeLabel('天星桥', 'TIANXINGQIAO STONE FOREST', 336, 36, 172, 0.72));
  root.add(makeLabel('观瀑亭', 'VIEWING PAVILION', -154, 28, 18, 0.5));
  root.add(makeLabel('布依山寨', 'BUYI VILLAGE', 200, 36, 278, 0.56));

  const caveLights = glowGroup.children.filter((c) => c.isPointLight);
  const lanternSprites = glowGroup.children.filter((c) => c.isSprite);

  function update(elapsed, dt) {
    const step = Number.isFinite(dt) ? dt : 0.016;
    for (let i = 0; i < fallTextures.length; i++) {
      const tex = fallTextures[i];
      const layer = i % 3;
      tex.offset.y = (tex.offset.y - step * (0.36 + layer * 0.17)) % 1;
      tex.offset.x = Math.sin(elapsed * (0.09 + layer * 0.03) + i * 1.3) * (0.012 + layer * 0.008);
    }
    for (let i = 0; i < fallMaterials.length; i++) {
      const layer = i % 3;
      const base = layer === 0 ? 0.86 : layer === 1 ? 0.66 : 0.42;
      fallMaterials[i].opacity = base + Math.sin(elapsed * (1.6 + layer * 0.28) + i * 1.1) * 0.06;
    }
    lipFoamMat.opacity = 0.48 + Math.sin(elapsed * 1.35) * 0.08;
    doupFoam.material.opacity = 0.4 + Math.sin(elapsed * 1.1 + 1.4) * 0.06;
    crestMat.opacity = 0.76 + Math.sin(elapsed * 0.75) * 0.05;
    doupCrest.material.opacity = 0.73 + Math.sin(elapsed * 0.66 + 2.1) * 0.05;
    doupPoolMat.opacity = 0.76 + Math.sin(elapsed * 0.8 + 0.4) * 0.03;
    doupFoamPool.material.opacity = 0.35 + Math.sin(elapsed * 0.9 + 1.1) * 0.06;
    rainbowMat.opacity = 0.16 + Math.sin(elapsed * 0.42) * 0.06;
    rainbowMat2.opacity = 0.08 + Math.sin(elapsed * 0.36 + 1.5) * 0.035;
    rainbow.rotation.z = Math.sin(elapsed * 0.035) * 0.014;
    rainbow2.rotation.z = Math.sin(elapsed * 0.046 + 1.1) * 0.018;
    if (stoneForest.poolMat) stoneForest.poolMat.opacity = 0.72 + Math.sin(elapsed * 0.5) * 0.035;
    for (let i = 0; i < caveLights.length; i++) {
      const l = caveLights[i];
      l.intensity = (i === 0 ? 26 : i === 1 ? 22 : 20) * (0.88 + Math.sin(elapsed * 2.1 + i * 2.4) * 0.12);
    }
    for (let i = 0; i < lanternSprites.length; i++) {
      const s = lanternSprites[i];
      s.material.opacity = 0.36 + Math.sin(elapsed * 1.7 + i * 1.5) * 0.12;
    }
    mist.update(elapsed);
  }

  update(0.2, 0.016);

  return {
    group: root,
    update,
    curtains: curtainDefs,
    doupCurtains,
    mist,
    rainbow,
    rainbow2,
    crest,
    doupCrest,
    caveLights,
    vegetation: vegetation.counts,
    stoneForest,
  };
}
