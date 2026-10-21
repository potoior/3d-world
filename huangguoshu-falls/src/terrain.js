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

function fade(t) {
  return t * t * (3 - 2 * t);
}

function hash2(x, z) {
  const h = Math.sin(x * 127.1 + z * 311.7) * 43758.5453123;
  return h - Math.floor(h);
}

function valueNoise(x, z) {
  const xi = Math.floor(x);
  const zi = Math.floor(z);
  const xf = x - xi;
  const zf = z - zi;
  const u = fade(xf);
  const v = fade(zf);
  const a = hash2(xi, zi);
  const b = hash2(xi + 1, zi);
  const c = hash2(xi, zi + 1);
  const d = hash2(xi + 1, zi + 1);
  return (a + (b - a) * u) * (1 - v) + (c + (d - c) * u) * v;
}

export function fbm(x, z, octaves = 4) {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += valueNoise(x * freq, z * freq) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2.03;
  }
  return sum / norm;
}

export function smoothstep(a, b, x) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

export const WATER_LOW = 2.6;
export const WATER_HIGH = 80.2;
export const CLIFF_Z = -150;
export const WORLD_SIZE = 3000;

export function riverCenter(z) {
  return 10 * Math.sin(z * 0.0052) + 5 * Math.sin(z * 0.0135 + 1.2);
}

export function lowerHalfWidth(z) {
  return 78 + 22 * smoothstep(-120, 120, z) + 6 * Math.sin(z * 0.009 + 0.4);
}

export function upperHalfWidth(z) {
  return 53 + 5 * Math.sin(z * 0.012 - 0.8);
}

export function fallFront(z) {
  return 1 - smoothstep(CLIFF_Z - 16, CLIFF_Z - 3, z);
}

function paddyTerrace(x, z, base, d) {
  const lower = z > CLIFF_Z + 20 ? 1 : 0;
  if (!lower) return base;
  const sideBand = smoothstep(48, 74, d) * (1 - smoothstep(230, 330, d));
  if (sideBand < 0.02) return base;
  const plot = fbm(x * 0.017 + 3.2, z * 0.017 - 6.1, 2);
  const step = 4.9 + Math.floor(plot * 3) * 0.85;
  return base * (1 - sideBand * 0.8) + step * sideBand * 0.8;
}

export function heightAt(x, z) {
  const c = riverCenter(z);
  const d = Math.abs(x - c);
  const up = fallFront(z);
  const halfW = lowerHalfWidth(z) * (1 - up) + upperHalfWidth(z) * up;

  let h = 4.15 + up * 76.0;
  h += (fbm(x * 0.0045 + 6.8, z * 0.0045 - 2.4, 3) - 0.5) * (7 + up * 8);
  h += (fbm(x * 0.018 - 4.1, z * 0.018 + 5.7, 3) - 0.5) * 2.8;

  const bank = 1 - smoothstep(halfW - 8, halfW + 26, d);
  const bed = WATER_LOW - 2.35 + up * (WATER_HIGH - WATER_LOW - 2.2);
  h = h * (1 - bank * 0.96) + bed * bank * 0.96;

  const shoulder = smoothstep(halfW + 38, halfW + 220, d);
  h += shoulder * (4.5 + fbm(x * 0.011 - 9.2, z * 0.011 + 3.3, 2) * 7.5);

  const pool = smoothstep(CLIFF_Z + 10, CLIFF_Z + 115, z) * (1 - smoothstep(CLIFF_Z + 150, CLIFF_Z + 275, z));
  const poolBand = pool * (1 - smoothstep(70, 155, d));
  h -= poolBand * 1.1;

  h = paddyTerrace(x, z, h, d);

  const doupotangX = smoothstep(-170, -250, x) * (1 - smoothstep(-400, -480, x));
  const doupotangZ = smoothstep(-580, -620, z);
  h += doupotangX * doupotangZ * 23;

  const stoneGarden =
    smoothstep(170, 230, x) *
    (1 - smoothstep(430, 510, x)) *
    smoothstep(35, 75, z) *
    (1 - smoothstep(255, 320, z));
  h -= stoneGarden * (1.2 + fbm(x * 0.06 + 4.4, z * 0.06 - 2.7, 2) * 1.8);

  if (z < CLIFF_Z - 40) {
    h += (fbm(x * 0.03 + 2.2, z * 0.03 - 8.2, 2) - 0.5) * 2.4;
  }
  if (h < 0.25) h = 0.25;
  return h;
}

export function slopeAt(x, z) {
  const e = 3;
  const hx = heightAt(x + e, z) - heightAt(x - e, z);
  const hz = heightAt(x, z + e) - heightAt(x, z - e);
  return Math.hypot(hx, hz) / (2 * e);
}

const trailXZ = [
  [-168, 468],
  [-176, 408],
  [-184, 348],
  [-194, 290],
  [-206, 234],
  [-214, 180],
  [-214, 130],
  [-204, 86],
  [-188, 46],
  [-170, 12],
  [-152, -20],
  [-136, -50],
  [-124, -78],
  [-118, -102],
];

export const trailPoints = trailXZ.map(([x, z]) => [x, z, heightAt(x, z) + 0.32]);

export const platforms = [
  { name: '观瀑台', x: -118, z: -101, y: heightAt(-118, -101) + 0.3, r: 14 },
  { name: '犀牛潭', x: -152, z: -20, y: heightAt(-152, -20) + 0.3, r: 10 },
  { name: '布依山寨', x: -206, z: 178, y: heightAt(-206, 178) + 0.3, r: 9 },
];

const trailCurve = new THREE.CatmullRomCurve3(
  trailPoints.map((p) => new THREE.Vector3(p[0], p[2], p[1])),
  false,
  'centripetal',
  0.5
);

const TRAIL_N = 340;
const trailSamples = trailCurve.getSpacedPoints(TRAIL_N).map((p, i) => {
  const t = i / TRAIL_N;
  let width = 3.4;
  for (const pl of platforms) {
    const dist = Math.hypot(p.x - pl.x, p.z - pl.z);
    if (dist < pl.r + 8) width = Math.max(width, 3.4 + (pl.r + 1.5 - dist) * 0.5);
  }
  return { x: p.x, y: p.y, z: p.z, t, width: Math.min(width, 11) };
});

function nearestTrail(x, z) {
  let best = Infinity;
  let bestIndex = 0;
  for (let i = 0; i < trailSamples.length; i += 3) {
    const s = trailSamples[i];
    const dx = x - s.x;
    const dz = z - s.z;
    const d2 = dx * dx + dz * dz;
    if (d2 < best) {
      best = d2;
      bestIndex = i;
    }
  }
  const lo = Math.max(0, bestIndex - 4);
  const hi = Math.min(trailSamples.length - 1, bestIndex + 4);
  for (let i = lo; i <= hi; i++) {
    const s = trailSamples[i];
    const dx = x - s.x;
    const dz = z - s.z;
    const d2 = dx * dx + dz * dz;
    if (d2 < best) {
      best = d2;
      bestIndex = i;
    }
  }
  return { d: Math.sqrt(best), s: trailSamples[bestIndex], i: bestIndex };
}

export function trailPointAt(t) {
  return trailCurve.getPointAt(Math.max(0, Math.min(1, t)));
}

export function trailWidthAt(t) {
  const f = Math.max(0, Math.min(1, t)) * (trailSamples.length - 1);
  const i = Math.floor(f);
  const k = f - i;
  const a = trailSamples[Math.min(i, trailSamples.length - 1)];
  const b = trailSamples[Math.min(i + 1, trailSamples.length - 1)];
  return a.width + (b.width - a.width) * k;
}

export function trailGroundAt(t) {
  return trailPointAt(t).y;
}

export function trailDistanceSq(x, z) {
  const near = nearestTrail(x, z);
  return near.d * near.d;
}

export { trailCurve, trailSamples };

export function createTerrain(material, size = WORLD_SIZE, segments = 300) {
  const geo = new THREE.PlaneGeometry(size, size, segments, segments);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const cGrass = new THREE.Color(0x648a45);
  const cLush = new THREE.Color(0x2f5c36);
  const cLime = new THREE.Color(0x9aa790);
  const cWet = new THREE.Color(0x3f6647);
  const cBed = new THREE.Color(0x24463f);
  const cPaddy = new THREE.Color(0x81a24b);
  const cHigh = new THREE.Color(0x365b39);
  const tmp = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    pos.setY(i, heightAt(pos.getX(i), pos.getZ(i)));
  }
  geo.computeVertexNormals();
  const normals = geo.attributes.normal;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const y = pos.getY(i);
    const ny = normals.getY(i);
    const steep = smoothstep(0.88, 0.42, ny);
    const high = smoothstep(42, 82, y);
    const c = riverCenter(z);
    const d = Math.abs(x - c);
    const noise = fbm(x * 0.045 + 12.5, z * 0.045 - 8.8, 3);
    const band = fbm(x * 0.012 - 2.7, z * 0.012 + 4.1, 2);
    const paddy = z > CLIFF_Z + 22 ? smoothstep(70, 110, d) * (1 - smoothstep(260, 360, d)) : 0;

    tmp.copy(cGrass).lerp(cLush, band * 0.65 + noise * 0.22);
    tmp.lerp(cPaddy, paddy * (0.35 + noise * 0.3));
    tmp.lerp(cWet, (1 - high) * 0.16 + paddy * 0.12);
    tmp.lerp(cBed, (y < WATER_LOW + 0.5 ? 0.75 : 0) + (y < WATER_HIGH - 2 && z < CLIFF_Z ? 0.5 : 0));
    tmp.lerp(cLime, steep * (0.38 + noise * 0.2));
    tmp.lerp(cHigh, high * 0.2);
    const streak = fbm(x * 0.16 - 5.2, z * 0.16 + 1.8, 2);
    const jitter = 0.9 + streak * 0.19;
    colors[i * 3] = tmp.r * jitter;
    colors[i * 3 + 1] = tmp.g * jitter;
    colors[i * 3 + 2] = tmp.b * jitter;
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mesh = new THREE.Mesh(geo, material);
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  mesh.name = 'detian-karst-valley-terrain';
  return mesh;
}

function mergeSimple(list) {
  const positions = [];
  const normals = [];
  for (const g of list) {
    const geo = g.index ? g.toNonIndexed() : g;
    const p = geo.attributes.position;
    const n = geo.attributes.normal;
    for (let i = 0; i < p.count; i++) {
      positions.push(p.getX(i), p.getY(i), p.getZ(i));
      normals.push(n.getX(i), n.getY(i), n.getZ(i));
    }
    if (geo !== g) geo.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  out.computeBoundingSphere();
  return out;
}

export function createDistantMountains(materialA, materialB) {
  const group = new THREE.Group();
  const rand = mulberry32(7081);
  const bucketA = [];
  const bucketB = [];
  const count = 64;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + rand() * 0.05;
    const radius = 1280 + rand() * 980;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const height = 150 + rand() * 260;
    const baseR = 120 + rand() * 180;
    const seg = 8 + (rand() * 4 | 0);
    const geo = new THREE.ConeGeometry(baseR, height, seg, 3, false);
    const p = geo.attributes.position;
    for (let v = 0; v < p.count; v++) {
      const px = p.getX(v);
      const py = p.getY(v);
      const pz = p.getZ(v);
      const n = valueNoise(px * 0.012 + i * 13.7, pz * 0.012 - i * 8.2) - 0.5;
      p.setX(v, px * (1 + n * 0.25));
      p.setZ(v, pz * (1 + n * 0.25));
      if (py > -height * 0.49) p.setY(v, py + n * height * 0.09);
    }
    geo.computeVertexNormals();
    geo.rotateY(rand() * Math.PI * 2);
    geo.translate(x, -20 + height * 0.5, z);
    (i % 2 ? bucketA : bucketB).push(geo);
  }
  const addMerged = (list, material, name) => {
    if (!list.length) return;
    const merged = mergeSimple(list);
    list.forEach((g) => g.dispose());
    const mesh = new THREE.Mesh(merged, material);
    mesh.name = name;
    group.add(mesh);
  };
  addMerged(bucketA, materialA, 'detian-far-karst-a');
  addMerged(bucketB, materialB, 'detian-far-karst-b');
  return group;
}
