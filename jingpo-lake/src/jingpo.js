import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makeWaterMaterial } from './materials.js';

/* 镜泊湖 — 火山堰塞湖 · 吊水楼瀑布 · 地下森林 · 朝鲜族村落 */

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const R = mulberry32(20261021);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

function hash2(x, y) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}
function vnoise(x, y) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi);
  const b = hash2(xi + 1, yi);
  const c = hash2(xi, yi + 1);
  const d = hash2(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y) {
  let v = 0;
  let amp = 0.5;
  let f = 1;
  for (let i = 0; i < 4; i++) {
    v += amp * vnoise(x * f, y * f);
    f *= 2.03;
    amp *= 0.5;
  }
  return v;
}

const LAND = {
  lake: { rx: 352, rz: 238, cz: -8 },
  village: { x: 295, z: 185 },
  crater: { x: -420, z: -160, r: 86 },
  pool: { x: 110, z: -318, r: 68 },
};

function lakeEdge(a) {
  return 1 + 0.055 * Math.sin(3 * a + 0.7) + 0.032 * Math.sin(5 * a + 2.1) + 0.022 * Math.sin(8 * a - 0.4);
}
function lakeD(x, z) {
  const nx = x / LAND.lake.rx;
  const nz = (z - LAND.lake.cz) / LAND.lake.rz;
  const a = Math.atan2(nz, nx);
  return Math.hypot(nx, nz) / lakeEdge(a);
}

function heightAt(x, z) {
  const d = lakeD(x, z);
  let h;
  if (d < 1) {
    h = -2.6 - (1 - d) * 3.2;
  } else {
    const e = Math.min(2.6, d - 1);
    const shore = Math.min(1, e / 0.24);
    h = -2.6 + shore * 4.0;
    const hills = smooth(0.1, 0.82, e);
    h += hills * (fbm(x * 0.0105 + 5.2, z * 0.0105 - 3.1) * 17 + fbm(x * 0.034, z * 0.034) * 4.2);
    h += smooth(-40, -390, z) * (17 + fbm(x * 0.0062, z * 0.0062) * 34);
    const ring = Math.hypot(x / 545, (z + 70) / 455);
    h += smooth(1.02, 1.72, ring) * (20 + fbm(x * 0.008 + 2, z * 0.008) * 36);
  }

  const dp = Math.hypot(x - LAND.pool.x, z - LAND.pool.z);
  if (dp < LAND.pool.r + 26) {
    const k = 1 - smooth(LAND.pool.r * 0.48, LAND.pool.r + 24, dp);
    h = h * (1 - k) + (-23.8 + fbm(x * 0.06, z * 0.06) * 1.4) * k;
  }
  if (x > 48 && x < 172 && z < -236 && z > -274) {
    const cx = 1 - Math.abs(x - 110) / 62;
    if (cx > 0) h = Math.min(h, -24.4);
  }
  if (z < -258 && z > -390 && x > 50 && x < 172) {
    const cx = 1 - Math.abs(x - 110) / 66;
    if (cx > 0) h = Math.min(h, -23.6 + (1 - cx) * 3);
  }

  const cd = Math.hypot(x - LAND.crater.x, z - LAND.crater.z);
  if (cd < LAND.crater.r + 36) {
    const bowl = 1 - smooth(LAND.crater.r * 0.34, LAND.crater.r, cd);
    const rim = Math.exp(-Math.pow((cd - (LAND.crater.r - 5)) / 13.5, 2));
    h = h * (1 - bowl) + (-9 + fbm(x * 0.055, z * 0.055) * 2.6) * bowl;
    h += rim * 27;
  }

  const dv = Math.hypot(x - LAND.village.x, z - LAND.village.z);
  if (dv < 80) {
    const k = 1 - smooth(39, 78, dv);
    h = h * (1 - k) + (0.65 + fbm(x * 0.06, z * 0.06) * 0.35) * k;
  }
  return h;
}

const MAT = new Map();
function mat(color, rough = 0.95, metal = 0, extra = null) {
  const key = color + ':' + rough + ':' + metal + (extra ? ':' + JSON.stringify(extra) : '');
  if (!MAT.has(key)) {
    MAT.set(key, new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...(extra || {}) }));
  }
  return MAT.get(key);
}

const terrainMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1.0, metalness: 0 });
const mountainMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.98, metalness: 0, flatShading: true });
const basaltMat = new THREE.MeshStandardMaterial({ color: 0x4b4741, roughness: 0.93, metalness: 0.03, flatShading: true });
const villageMats = {
  plaster: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.94 }),
  wood: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88 }),
  straw: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1.0 }),
  stone: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1.0 }),
};

function tint(geo, color, variance = 0.1) {
  const count = geo.attributes.position.count;
  if (!geo.attributes.uv) {
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(count * 2), 2));
  }
  if (!geo.attributes.normal) geo.computeVertexNormals();
  const colors = new Float32Array(count * 3);
  const base = color instanceof THREE.Color ? color : new THREE.Color(color);
  const c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const shade = 0.9 + R() * variance;
    c.copy(base).multiplyScalar(shade);
    colors[i * 3] = Math.min(1, c.r);
    colors[i * 3 + 1] = Math.min(1, c.g);
    colors[i * 3 + 2] = Math.min(1, c.b);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo;
}

function normalize(geo) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  for (const key of Object.keys(g.attributes)) {
    if (key !== 'position' && key !== 'normal' && key !== 'uv' && key !== 'color') g.deleteAttribute(key);
  }
  if (!g.attributes.normal) g.computeVertexNormals();
  if (!g.attributes.uv) {
    const count = g.attributes.position.count;
    g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(count * 2), 2));
  }
  if (!g.attributes.color) {
    const count = g.attributes.position.count;
    const colors = new Float32Array(count * 3);
    colors.fill(1);
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  }
  return g;
}

function boxGeo(w, h, d, x = 0, y = 0, z = 0, ry = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (ry) g.rotateY(ry);
  g.translate(x, y, z);
  return g;
}
function cylGeo(rt, rb, h, seg, x = 0, y = 0, z = 0, rz = 0) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  if (rz) g.rotateZ(rz);
  g.translate(x, y, z);
  return g;
}
function coneGeo(r, h, seg, x = 0, y = 0, z = 0, ry = 0, rx = 0) {
  const g = new THREE.ConeGeometry(r, h, seg);
  if (rx) g.rotateX(rx);
  if (ry) g.rotateY(ry);
  g.translate(x, y, z);
  return g;
}

class Bucket {
  constructor() {
    this.map = new Map();
  }
  add(geo, material, color = 0xffffff, variance = 0.1) {
    tint(geo, color, variance);
    const g = normalize(geo);
    if (!this.map.has(material)) this.map.set(material, []);
    this.map.get(material).push(g);
  }
  build(group) {
    for (const [material, list] of this.map) {
      if (!list.length) continue;
      const geo = mergeGeometries(list, false);
      list.forEach((g) => g.dispose());
      if (!geo) continue;
      const mesh = new THREE.Mesh(geo, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    }
    this.map.clear();
  }
}

function instanced(group, geo, material, count, place, colors = null) {
  const im = new THREE.InstancedMesh(geo, material, count);
  const d = new THREE.Object3D();
  const c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    d.position.set(0, 0, 0);
    d.rotation.set(0, 0, 0);
    d.scale.set(1, 1, 1);
    place(d, i);
    d.updateMatrix();
    im.setMatrixAt(i, d.matrix);
    if (colors) {
      c.set(colors[i % colors.length]);
      im.setColorAt(i, c);
    }
  }
  im.instanceMatrix.needsUpdate = true;
  if (im.instanceColor) im.instanceColor.needsUpdate = true;
  im.castShadow = true;
  im.receiveShadow = true;
  group.add(im);
  return im;
}

export function buildJingpoScene() {
  const group = new THREE.Group();
  const staticGroup = new THREE.Group();
  const dynamic = new THREE.Group();
  group.add(staticGroup, dynamic);

  const waterMaterial = makeWaterMaterial();
  waterMaterial.uniforms.uDeep.value.set(0x123f46);
  waterMaterial.uniforms.uShallow.value.set(0x4b8174);
  waterMaterial.uniforms.uSky.value.set(0xb7cec4);

  const outline = [];
  const shape = new THREE.Shape();
  const N = 96;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const r = lakeEdge(a);
    const x = Math.cos(a) * LAND.lake.rx * r;
    let z = LAND.lake.cz + Math.sin(a) * LAND.lake.rz * r;
    if (z < -210 && x > 50 && x < 172) {
      z = Math.max(z, -236 + Math.abs(x - 111) * 0.2);
    }
    outline.push([x, z]);
    if (i === 0) shape.moveTo(x, -z);
    else shape.lineTo(x, -z);
  }
  shape.closePath();
  const lakeGeo = new THREE.ShapeGeometry(shape, 18);
  lakeGeo.rotateX(-Math.PI / 2);
  const lake = new THREE.Mesh(lakeGeo, waterMaterial);
  lake.position.y = 0.06;
  lake.renderOrder = 2;
  lake.receiveShadow = false;
  staticGroup.add(lake);

  const bed = new THREE.Mesh(lakeGeo.clone(), mat(0x21342f, 1));
  bed.position.y = -2.1;
  bed.receiveShadow = true;
  staticGroup.add(bed);

  const poolWaterGeo = new THREE.PlaneGeometry(190, 190, 1, 1);
  poolWaterGeo.rotateX(-Math.PI / 2);
  const poolWater = new THREE.Mesh(poolWaterGeo, waterMaterial);
  poolWater.position.set(110, -23.15, -300);
  poolWater.renderOrder = 2;
  staticGroup.add(poolWater);

  const terrainGeo = new THREE.PlaneGeometry(1720, 1520, 172, 152);
  terrainGeo.rotateX(-Math.PI / 2);
  const tp = terrainGeo.attributes.position;
  for (let i = 0; i < tp.count; i++) {
    tp.setY(i, heightAt(tp.getX(i), tp.getZ(i)));
  }
  terrainGeo.computeVertexNormals();
  const tn = terrainGeo.attributes.normal;
  const tcol = new Float32Array(tp.count * 3);
  const grassA = new THREE.Color(0x66704a);
  const grassB = new THREE.Color(0x8b7d4a);
  const dry = new THREE.Color(0x9b7642);
  const autumn = new THREE.Color(0x8d4f2b);
  const rockC = new THREE.Color(0x625f55);
  const bedC = new THREE.Color(0x26352f);
  const tmpC = new THREE.Color();
  for (let i = 0; i < tp.count; i++) {
    const x = tp.getX(i);
    const z = tp.getZ(i);
    const y = tp.getY(i);
    const d = lakeD(x, z);
    const slope = 1 - tn.getY(i);
    if (d < 1.01) {
      tmpC.copy(bedC);
    } else if (y > 78 || slope > 0.52) {
      tmpC.copy(rockC).multiplyScalar(0.86 + fbm(x * 0.06, z * 0.06) * 0.24);
    } else {
      const n = fbm(x * 0.022 + 9, z * 0.022 - 4);
      tmpC.copy(grassA).lerp(grassB, smooth(0.25, 0.75, n));
      if (n > 0.63) tmpC.lerp(autumn, smooth(0.63, 0.88, n) * 0.55);
      if (n < 0.3) tmpC.lerp(dry, 0.35);
      if (slope > 0.28) tmpC.lerp(rockC, smooth(0.28, 0.52, slope) * 0.8);
      if (y > 40) tmpC.lerp(rockC, smooth(40, 82, y) * 0.7);
    }
    const shade = 0.88 + fbm(x * 0.08, z * 0.08) * 0.22;
    tcol[i * 3] = tmpC.r * shade;
    tcol[i * 3 + 1] = tmpC.g * shade;
    tcol[i * 3 + 2] = tmpC.b * shade;
  }
  terrainGeo.setAttribute('color', new THREE.BufferAttribute(tcol, 3));
  const terrain = new THREE.Mesh(terrainGeo, terrainMat);
  terrain.receiveShadow = true;
  terrain.castShadow = false;
  staticGroup.add(terrain);

  function mountainGeo(cx, cz, radius, height, stretch = 1, seed = 1) {
    const geo = new THREE.ConeGeometry(radius, height, 22, 9, false);
    const p = geo.attributes.position;
    const c = new THREE.Color();
    const colors = new Float32Array(p.count * 3);
    const low = new THREE.Color(0x415138);
    const mid = new THREE.Color(0x5d6047);
    const high = new THREE.Color(0x706c60);
    const warm = new THREE.Color(0x8e5b33);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      const z = p.getZ(i);
      const t = (y + height / 2) / height;
      const ang = Math.atan2(z, x);
      const n = fbm(Math.cos(ang) * 2.4 + seed, Math.sin(ang) * 2.4 - seed);
      const scale = 1 + (n - 0.5) * 0.28 * (1 - t * 0.55);
      p.setX(i, x * scale * stretch);
      p.setZ(i, z * scale);
      p.setY(i, y + (fbm(x * 0.02 + seed, z * 0.02) - 0.5) * height * 0.06);
      c.copy(low).lerp(mid, smooth(0.25, 0.66, t));
      c.lerp(high, smooth(0.56, 0.92, t));
      c.lerp(warm, (1 - t) * n * 0.28);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    geo.translate(cx, height / 2 - 12, cz);
    return normalize(geo);
  }

  const mountainParts = [];
  const rimPeaks = [
    [-560, -430, 210, 168, 1.05], [-405, -482, 238, 190, 1.0], [-248, -512, 258, 214, 1.05],
    [-92, -535, 272, 232, 1.1], [78, -545, 282, 246, 1.0], [248, -522, 262, 210, 1.05],
    [412, -480, 232, 176, 1.0], [548, -418, 208, 146, 1.05], [650, -300, 186, 124, 1.0],
    [700, -140, 176, 112, 1.05], [-640, -250, 196, 132, 1.0], [-672, -70, 178, 116, 1.05],
    [612, 105, 168, 100, 1.0], [-588, 120, 168, 102, 1.05],
  ];
  rimPeaks.forEach(([x, z, r, h, s], i) => mountainParts.push(mountainGeo(x, z, r, h, s, i + 1.7)));
  const maogong = [
    [-238, -406, 96, 92, 1.25], [-158, -414, 108, 118, 1.3], [-66, -420, 110, 132, 1.35],
    [26, -424, 104, 152, 1.3], [96, -414, 88, 108, 1.1], [158, -404, 96, 122, 1.2],
    [238, -394, 88, 88, 1.15],
  ];
  maogong.forEach(([x, z, r, h, s], i) => mountainParts.push(mountainGeo(x, z, r, h, s, 30 + i * 2.1)));
  const mountains = new THREE.Mesh(mergeGeometries(mountainParts, false), mountainMat);
  mountainParts.forEach((g) => g.dispose());
  mountains.castShadow = true;
  mountains.receiveShadow = true;
  staticGroup.add(mountains);

  const columnGeo = new THREE.CylinderGeometry(1, 1.08, 1, 6, 1);
  columnGeo.translate(0, 0.5, 0);
  const columnSpots = [];
  for (let i = 0; i < 92; i++) {
    const x = 58 + R() * 104;
    const top = 0.6 + (R() - 0.5) * 1.2;
    const h = 20 + R() * 9;
    columnSpots.push([x, top - h, -270 - R() * 10, 1.05 + R() * 1.3, h]);
  }
  for (let i = 0; i < 54; i++) {
    const a = (i / 54) * Math.PI * 2 + R() * 0.05;
    const rr = LAND.crater.r - 3 + R() * 8;
    const x = LAND.crater.x + Math.cos(a) * rr;
    const z = LAND.crater.z + Math.sin(a) * rr;
    columnSpots.push([x, heightAt(x, z) - 1.5, z, 1.2 + R() * 1.6, 3 + R() * 7]);
  }
  instanced(staticGroup, columnGeo, basaltMat, columnSpots.length, (d, i) => {
    const [x, y, z, w, h] = columnSpots[i];
    d.position.set(x, y, z);
    d.scale.set(w, h, w * (1.1 + R() * 0.5));
    d.rotation.y = R() * Math.PI;
    d.rotation.z = (R() - 0.5) * 0.05;
  }, [0x4f4a43, 0x565049, 0x45423c, 0x5d574e]);

  const fallBlock = new THREE.Mesh(boxGeo(122, 26, 46, 110, -12.6, -292), basaltMat);
  fallBlock.castShadow = true;
  fallBlock.receiveShadow = true;
  staticGroup.add(fallBlock);

  const tubeParts = new THREE.Group();
  const tubeBuckets = new Bucket();
  tubeBuckets.add(boxGeo(4.5, 13, 4.5, -6, 6.5, 0), villageMats.stone, 0x504b43);
  tubeBuckets.add(boxGeo(4.5, 13, 4.5, 6, 6.5, 0), villageMats.stone, 0x504b43);
  tubeBuckets.add(boxGeo(16, 4.2, 5, 0, 14.5, 0), villageMats.stone, 0x4b463e);
  tubeBuckets.build(tubeParts);
  tubeParts.position.set(LAND.crater.x + 34, heightAt(LAND.crater.x + 34, LAND.crater.z + 70) - 4, LAND.crater.z + 70);
  tubeParts.rotation.y = -0.55;
  staticGroup.add(tubeParts);

  const rockSpots = [];
  for (let i = 0; i < 840; i++) {
    let x;
    let z;
    if (i < 520) {
      const a = R() * Math.PI * 2;
      const r = lakeEdge(a) * (0.985 + R() * 0.12);
      x = Math.cos(a) * LAND.lake.rx * r;
      z = LAND.lake.cz + Math.sin(a) * LAND.lake.rz * r;
      if (x > 74 && x < 146 && z < -232) {
        x = x < 110 ? 40 + R() * 26 : 154 + R() * 28;
      }
    } else if (i < 680) {
      x = 38 + R() * 146;
      z = -260 - R() * 78;
      if (x > 74 && x < 146 && z > -284) {
        x = x < 110 ? 40 + R() * 26 : 154 + R() * 28;
      }
    } else {
      const a = R() * Math.PI * 2;
      const rr = LAND.crater.r * (0.55 + R() * 0.5);
      x = LAND.crater.x + Math.cos(a) * rr;
      z = LAND.crater.z + Math.sin(a) * rr;
    }
    rockSpots.push({ x, z, y: heightAt(x, z), s: 0.45 + R() * 1.8 });
  }
  instanced(staticGroup, new THREE.DodecahedronGeometry(1, 0), mat(0x767268, 0.98), rockSpots.length, (d, i) => {
    const r = rockSpots[i];
    d.position.set(r.x, r.y + r.s * 0.18, r.z);
    d.scale.set(r.s * (0.8 + R() * 1.4), r.s * (0.35 + R() * 0.55), r.s * (0.8 + R() * 1.2));
    d.rotation.set(R() * 2.4, R() * 6.28, R() * 2.4);
  }, [0x7d796e, 0x6a665d, 0x8a8478, 0x5f5c54]);

  const pineSpots = [];
  const birchSpots = [];
  const shrubSpots = [];
  const addTree = (x, z, s, list) => {
    const y = heightAt(x, z);
    if (y < -1.5) return;
    list.push({ x, z, y, s, rot: R() * Math.PI * 2 });
  };
  function blocked(x, z, pad = 1) {
    if (x > 48 && x < 178 && z < -232) return true;
    if (Math.hypot(x - LAND.village.x, z - LAND.village.z) < 62 * pad) return true;
    if (Math.hypot(x - LAND.pool.x, z - LAND.pool.z) < 76 * pad) return true;
    if (Math.hypot(x - (LAND.crater.x + 34), z - (LAND.crater.z + 70)) < 20) return true;
    return false;
  }
  for (let i = 0; i < 2100; i++) {
    const a = R() * Math.PI * 2;
    const dd = 1.025 + R() * 0.52;
    const r = lakeEdge(a) * dd;
    const x = Math.cos(a) * LAND.lake.rx * r;
    const z = LAND.lake.cz + Math.sin(a) * LAND.lake.rz * r;
    if (blocked(x, z)) continue;
    if (R() < 0.56) addTree(x, z, 0.62 + R() * 0.85, pineSpots);
    else addTree(x, z, 0.58 + R() * 0.78, birchSpots);
  }
  for (let i = 0; i < 620; i++) {
    const x = -560 + R() * 1120;
    const z = -560 + R() * 300;
    if (blocked(x, z)) continue;
    if (Math.hypot(x - LAND.crater.x, z - LAND.crater.z) < LAND.crater.r + 26) continue;
    const h = heightAt(x, z);
    if (h < 2 || h > 92) continue;
    if (R() < 0.68) addTree(x, z, 0.7 + R() * 1.0, pineSpots);
    else addTree(x, z, 0.6 + R() * 0.8, birchSpots);
  }
  for (let i = 0; i < 500; i++) {
    const a = R() * Math.PI * 2;
    const rr = Math.sqrt(R()) * (LAND.crater.r - 9);
    const x = LAND.crater.x + Math.cos(a) * rr;
    const z = LAND.crater.z + Math.sin(a) * rr;
    if (R() < 0.52) addTree(x, z, 0.7 + R() * 0.9, birchSpots);
    else addTree(x, z, 0.78 + R() * 0.95, pineSpots);
  }
  for (let i = 0; i < 40; i++) {
    const a = R() * Math.PI * 2;
    const rr = 68 + R() * 30;
    addTree(LAND.village.x + Math.cos(a) * rr, LAND.village.z + Math.sin(a) * rr, 0.55 + R() * 0.6, birchSpots);
  }
  for (let i = 0; i < 1650; i++) {
    const a = R() * Math.PI * 2;
    const r = lakeEdge(a) * (1.01 + R() * 0.7);
    const x = Math.cos(a) * LAND.lake.rx * r;
    const z = LAND.lake.cz + Math.sin(a) * LAND.lake.rz * r;
    if (blocked(x, z, 0.8)) continue;
    shrubSpots.push({ x, z, y: heightAt(x, z), s: 0.5 + R() * 1.1, rot: R() * 6.28 });
  }

  const pineTrunkGeo = new THREE.CylinderGeometry(0.16, 0.34, 4.6, 6);
  pineTrunkGeo.translate(0, 2.3, 0);
  const pineFoliageGeo = mergeGeometries([
    coneGeo(2.55, 4.6, 7, 0, 5.6, 0),
    coneGeo(2.0, 4.2, 7, 0, 8.2, 0),
    coneGeo(1.25, 3.5, 7, 0, 10.4, 0),
  ], false);

  instanced(dynamic, pineTrunkGeo, mat(0x4a382a, 0.96), pineSpots.length, (d, i) => {
    const t = pineSpots[i];
    d.position.set(t.x, t.y, t.z);
    d.scale.setScalar(t.s);
    d.rotation.y = t.rot;
  });
  instanced(dynamic, pineFoliageGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 }), pineSpots.length, (d, i) => {
    const t = pineSpots[i];
    d.position.set(t.x, t.y, t.z);
    d.scale.set(t.s * (0.9 + (i % 5) * 0.05), t.s * (0.92 + (i % 7) * 0.035), t.s * (0.9 + (i % 4) * 0.045));
    d.rotation.y = t.rot;
  }, [0x2c4630, 0x355037, 0x243d2b, 0x3c5739, 0x2f4a34]);

  const birchTrunkGeo = new THREE.CylinderGeometry(0.11, 0.22, 6.6, 6);
  birchTrunkGeo.translate(0, 3.3, 0);
  instanced(dynamic, birchTrunkGeo, mat(0xc8c2ae, 0.9), birchSpots.length, (d, i) => {
    const t = birchSpots[i];
    d.position.set(t.x, t.y, t.z);
    d.scale.setScalar(t.s);
    d.rotation.z = (R() - 0.5) * 0.06;
  });
  const birchCanopyGeo = new THREE.IcosahedronGeometry(1, 1);
  instanced(dynamic, birchCanopyGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, flatShading: true }), birchSpots.length, (d, i) => {
    const t = birchSpots[i];
    d.position.set(t.x, t.y + 7.0 * t.s, t.z);
    d.scale.set(t.s * (1.8 + (i % 3) * 0.25), t.s * (2.3 + (i % 5) * 0.22), t.s * (1.8 + (i % 4) * 0.2));
    d.rotation.set(R() * 0.4, t.rot, R() * 0.4);
  }, [0xc99a35, 0xb9772c, 0xd1ac45, 0xa8492b, 0xcf8740, 0xb2612c]);

  instanced(dynamic, new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.96, flatShading: true }), shrubSpots.length, (d, i) => {
    const t = shrubSpots[i];
    d.position.set(t.x, t.y + 0.4 * t.s, t.z);
    d.scale.set(t.s * 1.25, t.s * 0.72, t.s * 1.15);
    d.rotation.set(R() * 0.5, t.rot, R() * 0.5);
  }, [0x6c7440, 0x83502f, 0x9a7434, 0x5b6538, 0x8a5a31]);

  const vb = new Bucket();
  const houses = [
    [-32, -24, 0.18, 1.0], [-11, -27, -0.05, 0.95], [11, -27, 0.06, 1.05], [33, -22, 0.2, 0.9],
    [-35, 5, 1.52, 0.95], [-13, 2, 1.6, 1.08], [12, 1, 1.52, 0.92], [36, 7, 1.7, 1.0],
    [-2, 30, 2.95, 0.88],
  ];
  houses.forEach(([ox, oz, ry, scale], hi) => {
    const cx = LAND.village.x + ox * scale;
    const cz = LAND.village.z + oz * scale;
    const base = heightAt(cx, cz) - 0.1;
    const M = new THREE.Matrix4().makeRotationY(ry);
    M.setPosition(cx, base, cz);
    const part = (geo, material, color, variance = 0.08) => {
      geo.applyMatrix4(M);
      vb.add(geo, material, color, variance);
    };
    part(boxGeo(9.2, 0.9, 7.8, 0, 0.45, 0), villageMats.stone, 0x8a8578, 0.1);
    part(boxGeo(8.4, 3.5, 6.8, 0, 2.55, 0), villageMats.plaster, 0xe4ddcc, 0.05);
    for (const x of [-4.0, -1.4, 1.4, 4.0]) {
      part(boxGeo(0.28, 3.5, 0.3, x, 2.55, 3.42), villageMats.wood, 0x4c3727);
      part(boxGeo(0.28, 3.5, 0.3, x, 2.55, -3.42), villageMats.wood, 0x4c3727);
    }
    part(boxGeo(8.8, 0.26, 0.3, 0, 1.05, 3.44), villageMats.wood, 0x533c29);
    part(boxGeo(8.8, 0.26, 0.3, 0, 4.15, 3.44), villageMats.wood, 0x4b3625);
    part(boxGeo(8.8, 0.26, 0.3, 0, 1.05, -3.44), villageMats.wood, 0x533c29);
    part(boxGeo(8.8, 0.26, 0.3, 0, 4.15, -3.44), villageMats.wood, 0x4b3625);
    part(boxGeo(1.45, 2.55, 0.18, -0.2, 1.75, 3.48), villageMats.wood, 0x362418);
    part(boxGeo(1.7, 0.16, 0.22, -0.2, 3.1, 3.5), villageMats.wood, 0x6b4a2f);
    for (const x of [-2.9, 2.5]) {
      part(boxGeo(1.5, 1.35, 0.16, x, 2.65, 3.48), villageMats.wood, 0x2e2117);
      part(boxGeo(1.6, 0.09, 0.2, x, 2.65, 3.55), villageMats.plaster, 0xd9d0bb, 0.04);
      part(boxGeo(0.08, 1.4, 0.2, x, 2.65, 3.55), villageMats.plaster, 0xd9d0bb, 0.04);
    }
    part(cylGeo(0.17, 0.17, 9.2, 6, 0, 7.25, 0, Math.PI / 2), villageMats.wood, 0x4b3524);
    const roof = new THREE.ConeGeometry(6.7, 3.0, 4);
    roof.rotateY(Math.PI / 4);
    roof.scale(1.03, 1, 0.79);
    roof.translate(0, 5.9, 0);
    part(roof, villageMats.straw, 0x9b7942, 0.12);
    part(boxGeo(9.9, 0.22, 8.2, 0, 4.32, 0), villageMats.straw, 0x8f6d3b, 0.1);
    part(boxGeo(1.0, 2.5, 1.0, -3.1, 6.1, -1.9), villageMats.stone, 0x7b7264, 0.08);
    part(boxGeo(2.2, 0.2, 1.3, 2.4, 4.45, 3.9), villageMats.wood, 0x5c422d);
    if (hi === 5) {
      part(boxGeo(3.2, 1.0, 2.0, 0.2, 0.55, 4.4), villageMats.stone, 0x8c8678, 0.06);
    }
  });

  const woodFence = (x1, z1, x2, z2, posts) => {
    for (let i = 0; i <= posts; i++) {
      const t = i / posts;
      const x = x1 + (x2 - x1) * t;
      const z = z1 + (z2 - z1) * t;
      const y = heightAt(x, z);
      vb.add(boxGeo(0.22, 1.5, 0.22, x, y + 0.7, z), villageMats.wood, 0x5d422b, 0.08);
    }
    const mx = (x1 + x2) / 2;
    const mz = (z1 + z2) / 2;
    const len = Math.hypot(x2 - x1, z2 - z1);
    const y = heightAt(mx, mz);
    for (const off of [0.5, 1.05]) {
      vb.add(boxGeo(len, 0.13, 0.14, mx, y + off, mz, Math.atan2(x2 - x1, z2 - z1) - Math.PI / 2), villageMats.wood, 0x654a30, 0.08);
    }
  };
  woodFence(253, 148, 337, 148, 13);
  woodFence(253, 148, 253, 218, 11);
  woodFence(337, 148, 337, 218, 11);
  woodFence(283, 218, 337, 218, 9);

  for (let i = 0; i < 4; i++) {
    const x = 244 + i * 12;
    const z = 226 + (i % 2) * 12;
    for (let k = 0; k < 9; k++) {
      vb.add(boxGeo(9.5, 0.35, 1.2, x, heightAt(x, z + k * 1.5) + 0.25, z + k * 1.5), villageMats.stone, 0x584b38, 0.1);
      vb.add(boxGeo(8.8, 0.6, 0.9, x, heightAt(x, z + k * 1.5) + 0.62, z + k * 1.5), villageMats.straw, 0x6a7a3c, 0.18);
    }
  }

  const gateBase = heightAt(273, 152);
  [-2.6, 2.6].forEach((dx) => {
    vb.add(boxGeo(0.65, 4.6, 0.65, 273 + dx, gateBase + 2.3, 152), villageMats.wood, 0x4a3322, 0.08);
  });
  vb.add(boxGeo(7.2, 0.55, 0.8, 273, gateBase + 4.9, 152), villageMats.wood, 0x593d27, 0.08);
  const gateRoof = new THREE.ConeGeometry(4.6, 1.5, 4);
  gateRoof.rotateY(Math.PI / 4);
  gateRoof.scale(1.1, 1, 0.55);
  gateRoof.translate(273, gateBase + 6.0, 152);
  vb.add(gateRoof, villageMats.straw, 0x8e6c3c, 0.1);
  vb.add(boxGeo(3.4, 0.75, 0.16, 273, gateBase + 5.65, 152.4), villageMats.wood, 0x3c2a1c, 0.05);
  vb.build(staticGroup);

  const jarSpots = [];
  for (let i = 0; i < 34; i++) {
    const h = houses[i % houses.length];
    const cx = LAND.village.x + h[0] * h[3] + (R() - 0.5) * 12;
    const cz = LAND.village.z + h[1] * h[3] + 5 + R() * 5;
    jarSpots.push({ x: cx, z: cz, y: heightAt(cx, cz), s: 0.7 + R() * 0.7 });
  }
  instanced(staticGroup, new THREE.SphereGeometry(0.55, 10, 7), mat(0x3b2a20, 0.72), jarSpots.length, (d, i) => {
    const j = jarSpots[i];
    d.position.set(j.x, j.y + 0.35 * j.s, j.z);
    d.scale.set(j.s, j.s * 1.05, j.s);
  });

  const persimmonParts = new Bucket();
  const fruits = [];
  [[345, 165], [250, 178], [282, 132]].forEach(([x, z], i) => {
    const y = heightAt(x, z);
    persimmonParts.add(cylGeo(0.22, 0.4, 4.2, 6, x, y + 2.1, z), villageMats.wood, 0x4d3827);
    persimmonParts.add(new THREE.IcosahedronGeometry(2.4, 1).translate(x, y + 5.4, z), villageMats.straw, i % 2 ? 0xa8552a : 0xb4682d, 0.12);
    for (let k = 0; k < 16; k++) {
      const a = R() * Math.PI * 2;
      const rr = 1.2 + R() * 1.4;
      fruits.push([x + Math.cos(a) * rr, y + 4.8 + R() * 1.8, z + Math.sin(a) * rr]);
    }
  });
  persimmonParts.build(staticGroup);
  instanced(staticGroup, new THREE.SphereGeometry(0.18, 6, 5), mat(0xd06a24, 0.6), fruits.length, (d, i) => {
    d.position.set(fruits[i][0], fruits[i][1], fruits[i][2]);
  });

  /* dock */
  for (let i = 0; i < 14; i++) {
    vb.add(boxGeo(2.8, 0.16, 1.2, 252, 0.55, 246 + i * 2.4), villageMats.wood, 0x76583a, 0.06);
  }
  for (let i = 0; i < 7; i++) {
    vb.add(cylGeo(0.12, 0.15, 1.7, 6, 250.8, 0.35, 246 + i * 2.4), villageMats.wood, 0x4c3727);
    vb.add(cylGeo(0.12, 0.15, 1.7, 6, 253.2, 0.35, 246 + i * 2.4), villageMats.wood, 0x4c3727);
  }
  vb.build(staticGroup);

  /* fishing boats */
  const boatPieces = [];
  const boatPart = (geo, color, variance = 0.08) => {
    tint(geo, color, variance);
    boatPieces.push(normalize(geo));
  };
  boatPart(boxGeo(7.4, 1.0, 2.5, 0, 0.55, 0), 0x6b4a2e);
  boatPart(boxGeo(5.2, 0.6, 1.9, -0.5, 0.12, 0), 0x543a25);
  boatPart(coneGeo(1.25, 2.6, 6, 4.35, 0.55, 0, 0, -Math.PI / 2), 0x6f4d30);
  boatPart(boxGeo(6.5, 0.16, 2.25, 0, 1.1, 0), 0x9a7a4c);
  boatPart(boxGeo(2.2, 1.35, 1.7, -1.4, 1.85, 0), 0xd6cdb6);
  boatPart(boxGeo(2.7, 0.16, 2.05, -1.4, 2.58, 0), 0x3a3934);
  boatPart(cylGeo(0.07, 0.09, 3.6, 5, 1.5, 2.8, 0), 0x4b3624);
  boatPart(boxGeo(2.6, 0.35, 0.5, 1.3, 2.2, 0.8), 0x4b3a2a);
  boatPart(boxGeo(2.2, 0.35, 0.5, 1.3, 2.2, -0.8), 0x4b3a2a);
  const boatGeo = mergeGeometries(boatPieces, false);
  boatPieces.forEach((g) => g.dispose());
  const boatMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 });
  const boatBases = [
    [-190, 55, 24, 14, 0.2], [-105, -48, 20, 12, 1.4], [-20, 34, 26, 15, 2.6],
    [82, -38, 22, 13, 3.9], [160, 20, 18, 11, 5.0], [222, 74, 20, 12, 0.8],
    [-238, -16, 18, 10, 2.2], [34, -110, 24, 12, 4.2], [-88, 118, 20, 13, 5.6],
    [130, 128, 18, 10, 1.1], [-292, 72, 16, 10, 3.2], [8, 142, 20, 11, 4.8],
  ];
  const boats = new THREE.InstancedMesh(boatGeo, boatMat, boatBases.length);
  boats.castShadow = true;
  boats.receiveShadow = true;
  boats.frustumCulled = false;
  dynamic.add(boats);

  /* waterfall shader */
  function makeFallMaterial(color, foam, speed, opacity) {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(color) },
        uFoam: { value: new THREE.Color(foam) },
        uSpeed: { value: speed },
        uOpacity: { value: opacity },
      },
      vertexShader: `
        uniform float uTime;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec3 p = position;
          p.z += sin(uv.y * 26.0 + uTime * 3.0) * 0.32;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColor;
        uniform vec3 uFoam;
        uniform float uSpeed;
        uniform float uOpacity;
        varying vec2 vUv;
        void main() {
          float y = vUv.y;
          float band = sin(vUv.x * 72.0 + sin(y * 9.0 + uTime * 1.6) * 2.6 + uTime * 4.2) * 0.5 + 0.5;
          float streak = pow(band, 3.0);
          float flow = fract(y * 1.7 - uTime * uSpeed + sin(vUv.x * 13.0) * 0.05);
          float foam = smoothstep(0.82, 0.08, y);
          vec3 col = mix(uColor, uFoam, clamp(streak * 0.5 + foam * 0.55 + flow * 0.12, 0.0, 1.0));
          float edge = smoothstep(0.0, 0.1, vUv.x) * smoothstep(1.0, 0.9, vUv.x);
          float alpha = (0.68 + streak * 0.22 + foam * 0.2) * edge * uOpacity;
          gl_FragColor = vec4(col, alpha);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
  }
  const fallMat = makeFallMaterial(0xc4e4dc, 0xffffff, 0.62, 1.0);
  const fallMat2 = makeFallMaterial(0xb9ddd4, 0xffffff, 0.46, 0.62);
  fallMat2.blending = THREE.AdditiveBlending;
  const fallGeo = new THREE.PlaneGeometry(48, 28, 22, 18);
  const fall = new THREE.Mesh(fallGeo, fallMat);
  fall.position.set(110, -11.1, -260.5);
  staticGroup.add(fall);
  const fall2 = new THREE.Mesh(new THREE.PlaneGeometry(31, 27, 16, 16), fallMat2);
  fall2.position.set(92, -10.8, -260.0);
  staticGroup.add(fall2);

  const lipGeo = new THREE.PlaneGeometry(62, 5, 8, 4);
  lipGeo.rotateX(-Math.PI / 2);
  const lip = new THREE.Mesh(lipGeo, waterMaterial);
  lip.position.set(110, 0.45, -258.5);
  staticGroup.add(lip);

  /* particles: spray, mist, village smoke */
  const sprayMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(0xeef4e9) }, uOpacity: { value: 0.5 } },
    vertexShader: `
      attribute float aScale;
      attribute float aPhase;
      uniform float uTime;
      varying float vA;
      void main() {
        vec3 p = position;
        float cycle = fract(uTime * 0.42 + aPhase);
        p.y += cycle * 9.5;
        p.x += sin(aPhase * 31.0 + uTime * 1.9) * cycle * 3.4;
        p.z += cos(aPhase * 19.0 + uTime * 1.5) * cycle * 2.4;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = aScale * (300.0 / max(1.0, -mv.z));
        gl_Position = projectionMatrix * mv;
        vA = (1.0 - cycle) * (0.35 + 0.65 * aPhase);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying float vA;
      void main() {
        float d = length(gl_PointCoord - vec2(0.5));
        if (d > 0.5) discard;
        float a = smoothstep(0.5, 0.04, d) * vA * uOpacity;
        gl_FragColor = vec4(uColor, a);
      }
    `,
    transparent: true,
    depthWrite: false,
  });
  const sprayCount = 460;
  const sprayPos = new Float32Array(sprayCount * 3);
  const sprayScale = new Float32Array(sprayCount);
  const sprayPhase = new Float32Array(sprayCount);
  for (let i = 0; i < sprayCount; i++) {
    const a = R() * Math.PI * 2;
    const rr = Math.sqrt(R()) * 24;
    sprayPos[i * 3] = 110 + Math.cos(a) * rr;
    sprayPos[i * 3 + 1] = -23.0 + R() * 3;
    sprayPos[i * 3 + 2] = -276 + Math.sin(a) * rr * 0.7;
    sprayScale[i] = 1.2 + R() * 3.2;
    sprayPhase[i] = R();
  }
  const sprayGeo = new THREE.BufferGeometry();
  sprayGeo.setAttribute('position', new THREE.BufferAttribute(sprayPos, 3));
  sprayGeo.setAttribute('aScale', new THREE.BufferAttribute(sprayScale, 1));
  sprayGeo.setAttribute('aPhase', new THREE.BufferAttribute(sprayPhase, 1));
  const spray = new THREE.Points(sprayGeo, sprayMat);
  spray.frustumCulled = false;
  dynamic.add(spray);

  const mistMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(0xe4ebe3) }, uOpacity: { value: 0.19 } },
    vertexShader: `
      attribute float aScale;
      attribute float aPhase;
      uniform float uTime;
      varying float vA;
      void main() {
        vec3 p = position;
        p.x += sin(uTime * 0.045 + aPhase * 6.0) * 26.0;
        p.z += cos(uTime * 0.036 + aPhase * 4.0) * 18.0;
        p.y += sin(uTime * 0.14 + aPhase * 2.0) * 2.4;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = aScale * (430.0 / max(1.0, -mv.z));
        gl_Position = projectionMatrix * mv;
        vA = 0.45 + 0.55 * sin(uTime * 0.18 + aPhase * 9.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying float vA;
      void main() {
        float d = length(gl_PointCoord - vec2(0.5));
        if (d > 0.5) discard;
        float a = smoothstep(0.5, 0.02, d) * vA * uOpacity;
        gl_FragColor = vec4(uColor, a);
      }
    `,
    transparent: true,
    depthWrite: false,
  });
  const mistCount = 700;
  const mistPos = new Float32Array(mistCount * 3);
  const mistScale = new Float32Array(mistCount);
  const mistPhase = new Float32Array(mistCount);
  for (let i = 0; i < mistCount; i++) {
    if (i < 160) {
      mistPos[i * 3] = 82 + (R() - 0.5) * 110;
      mistPos[i * 3 + 1] = -20 + R() * 20;
      mistPos[i * 3 + 2] = -282 + (R() - 0.5) * 80;
      mistScale[i] = 26 + R() * 52;
    } else {
      const a = R() * Math.PI * 2;
      const rr = Math.sqrt(R()) * 0.9;
      mistPos[i * 3] = Math.cos(a) * LAND.lake.rx * rr;
      mistPos[i * 3 + 1] = 2 + R() * 16;
      mistPos[i * 3 + 2] = LAND.lake.cz + Math.sin(a) * LAND.lake.rz * rr;
      mistScale[i] = 18 + R() * 36;
    }
    mistPhase[i] = R();
  }
  const mistGeo = new THREE.BufferGeometry();
  mistGeo.setAttribute('position', new THREE.BufferAttribute(mistPos, 3));
  mistGeo.setAttribute('aScale', new THREE.BufferAttribute(mistScale, 1));
  mistGeo.setAttribute('aPhase', new THREE.BufferAttribute(mistPhase, 1));
  const mist = new THREE.Points(mistGeo, mistMat);
  mist.frustumCulled = false;
  mist.renderOrder = 3;
  dynamic.add(mist);

  const smokeMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(0xcfd4ca) }, uOpacity: { value: 0.2 } },
    vertexShader: `
      attribute float aScale;
      attribute float aPhase;
      uniform float uTime;
      varying float vA;
      void main() {
        vec3 p = position;
        float cycle = fract(uTime * 0.075 + aPhase);
        p.y += cycle * 17.0;
        p.x += sin(aPhase * 20.0 + uTime * 0.5) * cycle * 5.5;
        p.z += cos(aPhase * 13.0 + uTime * 0.4) * cycle * 4.0;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = aScale * (1.0 + cycle * 2.2) * (240.0 / max(1.0, -mv.z));
        gl_Position = projectionMatrix * mv;
        vA = (1.0 - cycle) * 0.7;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying float vA;
      void main() {
        float d = length(gl_PointCoord - vec2(0.5));
        if (d > 0.5) discard;
        float a = smoothstep(0.5, 0.05, d) * vA * uOpacity;
        gl_FragColor = vec4(uColor, a);
      }
    `,
    transparent: true,
    depthWrite: false,
  });
  const smokeCount = 110;
  const smokePos = new Float32Array(smokeCount * 3);
  const smokeScale = new Float32Array(smokeCount);
  const smokePhase = new Float32Array(smokeCount);
  for (let i = 0; i < smokeCount; i++) {
    const h = houses[i % houses.length];
    smokePos[i * 3] = LAND.village.x + h[0] * h[3] - 3.1 + (R() - 0.5) * 1.6;
    smokePos[i * 3 + 1] = heightAt(LAND.village.x + h[0] * h[3], LAND.village.z + h[1] * h[3]) + 7.5;
    smokePos[i * 3 + 2] = LAND.village.z + h[1] * h[3] - 1.9 + (R() - 0.5) * 1.6;
    smokeScale[i] = 1.2 + R() * 2.6;
    smokePhase[i] = R();
  }
  const smokeGeo = new THREE.BufferGeometry();
  smokeGeo.setAttribute('position', new THREE.BufferAttribute(smokePos, 3));
  smokeGeo.setAttribute('aScale', new THREE.BufferAttribute(smokeScale, 1));
  smokeGeo.setAttribute('aPhase', new THREE.BufferAttribute(smokePhase, 1));
  const smoke = new THREE.Points(smokeGeo, smokeMat);
  smoke.frustumCulled = false;
  dynamic.add(smoke);

  /* birds */
  const birdGeo = new THREE.BufferGeometry();
  birdGeo.setAttribute('position', new THREE.Float32BufferAttribute([
    0, 0, 0, -1.7, 0.34, 0, 0, 0.13, 0.42,
    0, 0, 0, 1.7, 0.34, 0, 0, 0.13, 0.42,
  ], 3));
  birdGeo.computeVertexNormals();
  const birdCount = 26;
  const birds = new THREE.InstancedMesh(birdGeo, new THREE.MeshStandardMaterial({ color: 0xe9e4d6, side: THREE.DoubleSide, roughness: 0.8 }), birdCount);
  birds.frustumCulled = false;
  dynamic.add(birds);
  const birdBase = [];
  for (let i = 0; i < birdCount; i++) {
    birdBase.push({ r: 90 + R() * 180, y: 26 + R() * 34, phase: R() * 6.28, speed: 0.045 + R() * 0.05, s: 0.7 + R() * 0.6 });
  }

  const dummy = new THREE.Object3D();

  const life = {
    update(time) {
      waterMaterial.uniforms.uTime.value = time;
      fallMat.uniforms.uTime.value = time;
      fallMat2.uniforms.uTime.value = time;
      sprayMat.uniforms.uTime.value = time;
      mistMat.uniforms.uTime.value = time;
      smokeMat.uniforms.uTime.value = time;

      boatBases.forEach((b, i) => {
        const [bx, bz, rx, rz, phase] = b;
        const a = time * 0.05 + phase;
        dummy.position.set(
          bx + Math.sin(a) * rx,
          0.18 + Math.sin(time * 1.15 + phase) * 0.09,
          bz + Math.cos(a * 0.82) * rz
        );
        dummy.rotation.set(Math.sin(time * 0.9 + phase) * 0.018, phase + Math.sin(a) * 0.42, Math.sin(time * 1.3 + phase) * 0.022);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        boats.setMatrixAt(i, dummy.matrix);
      });
      boats.instanceMatrix.needsUpdate = true;

      birdBase.forEach((b, i) => {
        const a = time * b.speed + b.phase;
        dummy.position.set(Math.cos(a) * b.r, b.y + Math.sin(time * 0.7 + b.phase) * 2.8, LAND.lake.cz + Math.sin(a) * b.r * 0.62);
        dummy.rotation.set(0, -a + Math.PI / 2, Math.sin(time * 4.0 + b.phase) * 0.28);
        dummy.scale.setScalar(b.s);
        dummy.updateMatrix();
        birds.setMatrixAt(i, dummy.matrix);
      });
      birds.instanceMatrix.needsUpdate = true;
    },
  };

  const views = {
    overview: { p: [10, 196, 640], t: [10, 2, -55] },
    diaoshuilou: { p: [110, 36, -205], t: [110, -10, -268] },
    forest: { p: [-420, 116, -12], t: [-420, -8, -164] },
    village: { p: [226, 28, 292], t: [300, 6, 178] },
    dusk: { p: [432, 104, 352], t: [-70, 1, -155] },
  };
  const notes = {
    overview: ['镜泊湖 · 全景', '火山堰塞湖横卧群山，毛公山临水如卧，秋林与薄雾铺展至天际'],
    diaoshuilou: ['吊水楼瀑布', '熔岩断崖之上，湖水跌落深潭，水声如雷，雾霭终年不散'],
    forest: ['地下森林', '火山口底古木参天，白桦与红松自熔岩缝隙间拔地而起'],
    village: ['朝鲜族村落', '白墙草顶依湖而居，酱缸与柿树点缀着秋日的庭院'],
    dusk: ['镜泊暮色', '落日熔金，湖面浮起薄雾，渔舟与归鸟缓缓隐入群山'],
  };

  const stats = {
    pines: pineSpots.length,
    birches: birchSpots.length,
    shrubs: shrubSpots.length,
    rocks: rockSpots.length,
    boats: boatBases.length,
    houses: houses.length,
    birds: birdCount,
  };

  return {
    group,
    waterMaterial,
    life,
    stats,
    views,
    notes,
    lake: outline,
    heightAt,
    overlay: { boats, mist, spray, smoke, birds, fallMat, fallMat2, basaltMat },
  };
}
