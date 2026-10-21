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

const highlandDefs = [
  { x: -340, z: -375, h: 306, r: 178, sharp: 1.28 },
  { x: -135, z: -470, h: 238, r: 150, sharp: 1.35 },
  { x: -55, z: -525, h: 206, r: 108, sharp: 1.52 },
  { x: -15, z: -300, h: 172, r: 168, sharp: 1.42 },
  { x: 145, z: -155, h: 104, r: 205, sharp: 1.3 },
  { x: 30, z: -80, h: 54, r: 168, sharp: 1.5 },
];

export const peaks = highlandDefs.map((p) => ({
  x: p.x,
  z: p.z,
  h: p.h,
  r: p.r,
  sharp: p.sharp,
}));

const wetland = { x: 320, z: 130, level: 9.2, radius: 285 };

export const trailPoints = [
  [395, 255, 13.2],
  [368, 198, 12.8],
  [332, 145, 12.4],
  [286, 92, 13.0],
  [240, 34, 18.5],
  [198, -32, 33.0],
  [154, -102, 62.0],
  [100, -176, 108.0],
  [34, -246, 156.0],
  [-44, -300, 202.0],
  [-128, -340, 246.0],
  [-212, -368, 285.0],
  [-292, -374, 315.0],
  [-338, -352, 326.0],
];

export const platforms = [
  { name: '大九湖观景台', x: 352, z: 176, y: 12.6, r: 22 },
  { name: '神农顶', x: -334, z: -364, y: 326, r: 17 },
  { name: '板壁岩', x: -62, z: -520, y: 209, r: 16 },
];

const trailCurve = new THREE.CatmullRomCurve3(
  trailPoints.map((p) => new THREE.Vector3(p[0], p[2], p[1])),
  false,
  'centripetal',
  0.5
);

const TRAIL_N = 320;
const trailSamples = trailCurve.getSpacedPoints(TRAIL_N).map((p, i) => {
  const t = i / TRAIL_N;
  let width = 3.2;
  for (const pl of platforms) {
    const d = Math.hypot(p.x - pl.x, p.z - pl.z);
    if (d < pl.r + 10) width = Math.max(width, 3.2 + (pl.r + 3 - d) * 0.5);
  }
  return { x: p.x, y: p.y, z: p.z, t, width: Math.min(width, 12) };
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

function highlandField(x, z) {
  let best = 0;
  for (const p of highlandDefs) {
    const dx = x - p.x;
    const dz = z - p.z;
    const d2 = dx * dx + dz * dz;
    const lim = p.r * p.r * 5.6;
    if (d2 > lim) continue;
    const v = p.h * Math.exp(-Math.pow(d2 / (p.r * p.r), p.sharp * 0.5));
    if (v > best) best = v;
  }
  return best;
}

export function heightAt(x, z) {
  let h = 18 + fbm(x * 0.0028 + 3.1, z * 0.0028 - 6.4, 3) * 20;
  h += highlandField(x, z);

  const macro = fbm(x * 0.0052 + 11.3, z * 0.0052 - 8.1, 3) - 0.5;
  const detail = fbm(x * 0.021 + 4.7, z * 0.021 + 2.9, 4) - 0.5;
  const fine = fbm(x * 0.082 - 7.3, z * 0.082 + 5.2, 2) - 0.5;
  const shoulder = smoothstep(8, 96, h);
  h += macro * 13 + detail * (3.2 + shoulder * 7.5) + fine * 1.6;

  const basinD = Math.hypot(x - wetland.x, z - wetland.z);
  const basin = 1 - smoothstep(150, 350, basinD);
  if (basin > 0.001) {
    const floor = wetland.level + 0.25 + fbm(x * 0.022 + 8, z * 0.022 - 4, 3) * 1.1;
    h = h * (1 - basin * 0.97) + floor * basin * 0.97;
  }

  const meadow = 1 - smoothstep(270, 520, basinD);
  h = h * (1 - meadow * 0.24) + (16 + fbm(x * 0.02, z * 0.02, 2) * 6) * meadow * 0.24;

  if (h < 3) h = 3;

  for (const pl of platforms) {
    const d = Math.hypot(x - pl.x, z - pl.z);
    if (d < pl.r + 12) {
      const blend = smoothstep(pl.r * 0.7, pl.r + 11, d);
      h = pl.y * (1 - blend) + h * blend;
    }
  }

  const near = nearestTrail(x, z);
  if (near.d < 15) {
    const blend = smoothstep(3.6, 14, near.d);
    const bed = near.s.y - 0.35 - Math.min(2.4, near.d * near.d * 0.035);
    h = bed * (1 - blend) + h * blend;
  }

  return h;
}

export function slopeAt(x, z) {
  const e = 3;
  const hx = heightAt(x + e, z) - heightAt(x - e, z);
  const hz = heightAt(x, z + e) - heightAt(x, z - e);
  return Math.hypot(hx, hz) / (2 * e);
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
  return nearestTrail(x, z).d * nearestTrail(x, z).d;
}

export { trailCurve, trailSamples };

export function createTerrain(material, size = 2600, segments = 240) {
  const geo = new THREE.PlaneGeometry(size, size, segments, segments);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const cMeadow = new THREE.Color(0x8b9b58);
  const cGrass = new THREE.Color(0x627c43);
  const cForest = new THREE.Color(0x33553a);
  const cDeep = new THREE.Color(0x243f2c);
  const cRock = new THREE.Color(0x8b8f82);
  const cHigh = new THREE.Color(0xaeb4a4);
  const cMoss = new THREE.Color(0x6f8250);
  const tmp = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, heightAt(x, z));
  }
  geo.computeVertexNormals();
  const normals = geo.attributes.normal;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const y = pos.getY(i);
    const ny = normals.getY(i);
    const steep = smoothstep(0.9, 0.4, ny);
    const high = smoothstep(170, 318, y);
    const basinD = Math.hypot(x - wetland.x, z - wetland.z);
    const basin = 1 - smoothstep(70, 300, basinD);
    const noise = fbm(x * 0.05 + 20, z * 0.05 - 14, 3);
    const band = fbm(x * 0.012 - 3, z * 0.012 + 9, 2);

    tmp.copy(cForest).lerp(cDeep, noise * 0.55);
    tmp.lerp(cGrass, smoothstep(0.35, 0.72, noise) * 0.42);
    tmp.lerp(cMeadow, basin * (0.55 + noise * 0.35));
    tmp.lerp(cMoss, steep * 0.36);
    tmp.lerp(cRock, steep * high * 0.82 + steep * 0.18);
    tmp.lerp(cHigh, high * (0.32 + steep * 0.24));
    const jitter = 0.9 + band * 0.18;
    colors[i * 3] = tmp.r * jitter;
    colors[i * 3 + 1] = tmp.g * jitter;
    colors[i * 3 + 2] = tmp.b * jitter;
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mesh = new THREE.Mesh(geo, material);
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  mesh.name = 'shennongjia-highland';
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
  const count = 66;

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + rand() * 0.06;
    const radius = 1280 + rand() * 1100;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const zBias = (Math.sin(angle) + 1) * 0.5;
    const height = 230 + rand() * 330 + zBias * 130;
    const baseR = 190 + rand() * 300;
    const seg = 6 + (rand() * 4 | 0);
    const geo = new THREE.ConeGeometry(baseR, height, seg, 2, false);
    const p = geo.attributes.position;
    for (let v = 0; v < p.count; v++) {
      const px = p.getX(v);
      const py = p.getY(v);
      const pz = p.getZ(v);
      const n = valueNoise(px * 0.011 + i * 13.7, pz * 0.011 - i * 8.2) - 0.5;
      p.setX(v, px * (1 + n * 0.32));
      p.setZ(v, pz * (1 + n * 0.32));
      if (py > -height * 0.49) p.setY(v, py + n * height * 0.16);
    }
    geo.computeVertexNormals();
    geo.rotateY(rand() * Math.PI * 2);
    geo.translate(x, -34 + height * 0.5, z);
    (i % 2 ? bucketA : bucketB).push(geo);
  }

  const addMerged = (list, material, name) => {
    if (!list.length) return;
    const merged = mergeSimple(list);
    list.forEach((g) => g.dispose());
    const mesh = new THREE.Mesh(merged, material);
    mesh.receiveShadow = false;
    mesh.castShadow = false;
    mesh.name = name;
    group.add(mesh);
  };
  addMerged(bucketA, materialA, 'distant-blue-ridges-a');
  addMerged(bucketB, materialB, 'distant-blue-ridges-b');
  return group;
}
