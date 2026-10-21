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

export const WATER_LOW = 12;
export const WATER_HIGH = 42;
export const DROP = WATER_HIGH - WATER_LOW;
export const CLIFF_Z = -60;
export const WORLD_SIZE = 3000;

export function riverCenter(z) {
  return 5.5 * Math.sin(z * 0.0031) + 2.6 * Math.sin(z * 0.0105 + 0.8);
}

export function upperHalfWidth(z) {
  const t = smoothstep(CLIFF_Z - 920, CLIFF_Z - 6, z);
  return 148 - 120 * t + 4.5 * Math.sin(z * 0.008 + 0.4);
}

export function lowerHalfWidth(z) {
  return 27 + 6 * smoothstep(CLIFF_Z, 620, z) + 2.2 * Math.sin(z * 0.012);
}

export function halfWidthAt(z) {
  return z < CLIFF_Z ? upperHalfWidth(z) : lowerHalfWidth(z);
}

export function levelAt(z) {
  return WATER_LOW + DROP * (1 - smoothstep(CLIFF_Z - 1.6, CLIFF_Z + 1.6, z));
}

function plateauAt(x, z) {
  let p = 62 + (fbm(x * 0.0034 + 4.1, z * 0.0034 - 2.7, 4) - 0.5) * 16;
  p += (fbm(x * 0.017 - 3.2, z * 0.017 + 8.4, 3) - 0.5) * 4.6;
  const gully = Math.abs(fbm(x * 0.0052 + 11.3, z * 0.0052 - 7.1, 3) - 0.5);
  p -= smoothstep(0.14, 0.015, gully) * 8.5;
  const shelf = smoothstep(80, 170, Math.abs(z - 40)) * (fbm(x * 0.011 + 2.4, z * 0.011 - 6.2, 2) - 0.5) * 5;
  return p + shelf;
}

export function heightAt(x, z) {
  const c = riverCenter(z);
  const d = Math.abs(x - c);
  const w = halfWidthAt(z);
  const bed = levelAt(z) - 3.0;
  const plateau = plateauAt(x, z);
  const edge = smoothstep(w + 1.5, w + 22, d);
  let h = bed * (1 - edge) + plateau * edge;

  const bench = Math.sin(edge * Math.PI * 3.0) * (1 - edge) * edge;
  h += bench * 2.7;

  const flute = fbm(x * 0.09 + 2.2, z * 0.09 - 1.1, 2) - 0.5;
  const cliffBand = smoothstep(w + 3, w + 12, d) * (1 - smoothstep(w + 18, w + 40, d));
  h += flute * cliffBand * 3.4;

  const caveMask =
    smoothstep(-51, -45, x) *
    (1 - smoothstep(-31, -25, x)) *
    smoothstep(-10, -4, z) *
    (1 - smoothstep(18, 24, z));
  h = h * (1 - caveMask) + (12.55 + flute * 0.3) * caveMask;

  if (h < 1) h = 1;
  return h;
}

export function slopeAt(x, z) {
  const e = 3;
  const hx = heightAt(x + e, z) - heightAt(x - e, z);
  const hz = heightAt(x, z + e) - heightAt(x, z - e);
  return Math.hypot(hx, hz) / (2 * e);
}

const trailXZ = [
  [-52, 168],
  [-55, 146],
  [-58, 124],
  [-62, 104],
  [-66, 86],
  [-70, 68],
  [-67, 52],
  [-61, 40],
  [-55, 31],
  [-49, 24],
  [-45, 19],
];

export const trailPoints = trailXZ.map(([x, z]) => [x, z, heightAt(x, z) + 0.3]);

export const platforms = [
  { name: '观瀑台', x: -66, z: 74, y: heightAt(-66, 74) + 0.3, r: 18 },
  { name: '龙洞', x: -38, z: 7, y: 13.2, r: 11 },
  { name: '陕西台', x: 62, z: 88, y: heightAt(62, 88) + 0.3, r: 15 },
];

const trailCurve = new THREE.CatmullRomCurve3(
  trailPoints.map((p) => new THREE.Vector3(p[0], p[2], p[1])),
  false,
  'centripetal',
  0.5
);

const TRAIL_N = 360;
const trailSamples = trailCurve.getSpacedPoints(TRAIL_N).map((p, i) => {
  const t = i / TRAIL_N;
  let width = 4.2;
  for (const pl of platforms) {
    const dist = Math.hypot(p.x - pl.x, p.z - pl.z);
    if (dist < pl.r + 9) width = Math.max(width, 4.2 + (pl.r + 1.5 - dist) * 0.5);
  }
  return { x: p.x, y: p.y, z: p.z, t, width: Math.min(width, 13) };
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

export function createTerrain(material, size = WORLD_SIZE, segments = 340) {
  const geo = new THREE.PlaneGeometry(size, size, segments, segments);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);

  const cLoess = new THREE.Color(0xb08a58);
  const cPale = new THREE.Color(0xd2b37f);
  const cDryGrass = new THREE.Color(0x8d8a52);
  const cGully = new THREE.Color(0x775433);
  const cCliff = new THREE.Color(0x9d7445);
  const cWet = new THREE.Color(0x5c4630);
  const cBed = new THREE.Color(0x6f5636);
  const cSediment = new THREE.Color(0xa8864f);
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
    const level = levelAt(z);
    const noise = fbm(x * 0.045 + 12.5, z * 0.045 - 8.8, 3);
    const band = fbm(x * 0.012 - 2.7, z * 0.012 + 4.1, 2);
    const strata = 0.5 + 0.5 * Math.sin(y * 0.55 + noise * 2.4);

    tmp.copy(cLoess).lerp(cPale, band * 0.55 + noise * 0.22);
    tmp.lerp(cDryGrass, (1 - steep) * band * 0.24);
    tmp.lerp(cGully, noise * 0.2 + (1 - band) * 0.12);
    tmp.lerp(cCliff, steep * 0.52);
    tmp.lerp(cSediment, smoothstep(level + 6, level + 0.4, y) * 0.5);
    tmp.lerp(cWet, smoothstep(level + 2.6, level - 1.4, y) * 0.66);
    tmp.lerp(cBed, y < level + 0.2 ? 0.7 : 0);
    tmp.multiplyScalar(0.88 + strata * 0.2 + noise * 0.05);

    colors[i * 3] = tmp.r;
    colors[i * 3 + 1] = tmp.g;
    colors[i * 3 + 2] = tmp.b;
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mesh = new THREE.Mesh(geo, material);
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  mesh.name = 'hukou-loess-terrain';
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
  const count = 56;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + rand() * 0.08;
    const radius = 1250 + rand() * 1050;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const height = 90 + rand() * 190;
    const baseR = 130 + rand() * 210;
    const topR = baseR * (0.64 + rand() * 0.16);
    const seg = 7 + (rand() * 4 | 0);
    const geo = new THREE.CylinderGeometry(topR, baseR, height, seg, 3, false);
    const p = geo.attributes.position;
    for (let v = 0; v < p.count; v++) {
      const px = p.getX(v);
      const py = p.getY(v);
      const pz = p.getZ(v);
      const n = valueNoise(px * 0.014 + i * 13.7, pz * 0.014 - i * 8.2) - 0.5;
      p.setX(v, px * (1 + n * 0.28));
      p.setZ(v, pz * (1 + n * 0.28));
      p.setY(v, py + n * height * 0.1);
    }
    geo.computeVertexNormals();
    geo.rotateY(rand() * Math.PI * 2);
    geo.translate(x, -8 + height * 0.5, z);
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
  addMerged(bucketA, materialA, 'hukou-far-mesa-a');
  addMerged(bucketB, materialB, 'hukou-far-mesa-b');
  return group;
}
