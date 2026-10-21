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

export const riverPoints = [
  [-980, -560], [-820, -500], [-690, -400], [-610, -260], [-600, -110],
  [-640, 40], [-590, 170], [-460, 260], [-300, 305], [-140, 285],
  [-20, 205], [50, 85], [55, -55], [110, -190], [245, -285], [410, -300],
  [525, -210], [555, -70], [530, 80], [585, 230], [720, 350], [900, 420],
  [1080, 440],
];

export const riverCurve = new THREE.CatmullRomCurve3(
  riverPoints.map((p) => new THREE.Vector3(p[0], 0, p[1])),
  false,
  'centripetal',
  0.5
);

const RIVER_N = 420;
const riverSamples = riverCurve.getSpacedPoints(RIVER_N).map((p, i) => ({
  x: p.x,
  z: p.z,
  t: i / RIVER_N,
}));

export { riverSamples };

export const waterLevel = 4.05;

export function riverWidthAt(t) {
  return 19 + Math.sin(t * 31.0 + 1.3) * 4.5 + Math.sin(t * 13.0) * 2.5;
}

export function nearestRiver(x, z) {
  let best = Infinity;
  let bestIndex = 0;
  for (let i = 0; i < riverSamples.length; i += 7) {
    const s = riverSamples[i];
    const dx = x - s.x;
    const dz = z - s.z;
    const d2 = dx * dx + dz * dz;
    if (d2 < best) {
      best = d2;
      bestIndex = i;
    }
  }
  const lo = Math.max(0, bestIndex - 8);
  const hi = Math.min(riverSamples.length - 1, bestIndex + 8);
  for (let i = lo; i <= hi; i++) {
    const s = riverSamples[i];
    const dx = x - s.x;
    const dz = z - s.z;
    const d2 = dx * dx + dz * dz;
    if (d2 < best) {
      best = d2;
      bestIndex = i;
    }
  }
  return { d: Math.sqrt(best), s: riverSamples[bestIndex], i: bestIndex };
}

export function riverDistance(x, z) {
  return nearestRiver(x, z).d;
}

const camp = { x: 110, z: 145, r: 78, level: 7.4 };
const aobaoHill = { x: -330, z: -300, h: 22, r: 150 };

const hillDefs = [
  [-700, -760, 82, 520],
  [-180, -880, 55, 480],
  [520, -760, 62, 500],
  [980, -160, 48, 430],
  [-1040, 260, 58, 470],
  [760, 690, 34, 430],
  [-420, 820, 28, 380],
];

function rollingHills(x, z) {
  let h = 0;
  for (const [hx, hz, amp, rad] of hillDefs) {
    const dx = x - hx;
    const dz = z - hz;
    const d2 = dx * dx + dz * dz;
    if (d2 > rad * rad * 4.2) continue;
    h += amp * Math.exp(-d2 / (rad * rad));
  }
  const adx = x - aobaoHill.x;
  const adz = z - aobaoHill.z;
  h += aobaoHill.h * Math.exp(-(adx * adx + adz * adz) / (aobaoHill.r * aobaoHill.r));
  return h;
}

export function heightAt(x, z) {
  let h = 5.4 + fbm(x * 0.0019 + 3.1, z * 0.0019 - 6.4, 3) * 15;
  const macro = fbm(x * 0.0051 + 11.3, z * 0.0051 - 8.1, 3) - 0.5;
  const detail = fbm(x * 0.019 + 4.7, z * 0.019 + 2.9, 3) - 0.5;
  const fine = fbm(x * 0.073 - 7.3, z * 0.073 + 5.2, 2) - 0.5;
  h += macro * 7.5 + detail * 2.4 + fine * 0.65;
  h += rollingHills(x, z);

  const nr = nearestRiver(x, z);
  const d = nr.d;
  const valley = 1 - smoothstep(8, 135, d);
  if (valley > 0.001) {
    const bank = 2.7 + Math.min(24, d * 0.085) + d * d * 0.00055;
    h = h * (1 - valley * 0.94) + bank * valley * 0.94;
  }

  const campD = Math.hypot(x - camp.x, z - camp.z);
  if (campD < camp.r + 55) {
    const blend = 1 - smoothstep(camp.r * 0.55, camp.r + 50, campD);
    const flat = camp.level + fbm(x * 0.03 + 5, z * 0.03 - 2, 2) * 0.7;
    h = h * (1 - blend * 0.9) + flat * blend * 0.9;
  }

  const aoD = Math.hypot(x - aobaoHill.x, z - aobaoHill.z);
  if (aoD < 16) {
    const top = aobaoHill.h + 6.4;
    h = h * (1 - (1 - aoD / 16) * 0.72) + top * (1 - aoD / 16) * 0.72;
  }

  if (h < 1.2) h = 1.2;
  return h;
}

export function slopeAt(x, z) {
  const e = 2.4;
  const hx = heightAt(x + e, z) - heightAt(x - e, z);
  const hz = heightAt(x, z + e) - heightAt(x, z - e);
  return Math.hypot(hx, hz) / (2 * e);
}

export const campCenter = camp;
export const aobao = { x: aobaoHill.x, z: aobaoHill.z, y: heightAt(aobaoHill.x, aobaoHill.z) };

const trailPointsXZ = [
  [365, 410], [315, 365], [265, 325], [220, 288], [185, 246],
  [160, 208], [150, 175], [164, 146], [192, 124], [225, 102],
  [255, 72], [268, 36], [255, 2], [226, -26], [190, -34],
  [154, -18], [130, 18], [116, 58], [96, 92], [70, 126],
  [40, 158], [4, 184], [-38, 204], [-88, 216],
];
export const trailPoints = trailPointsXZ.map(([x, z]) => [x, heightAt(x, z) + 0.1, z]);

export const trailCurve = new THREE.CatmullRomCurve3(
  trailPoints.map((p) => new THREE.Vector3(p[0], p[1], p[2])),
  false,
  'centripetal',
  0.5
);

export function trailPointAt(t) {
  return trailCurve.getPointAt(Math.max(0, Math.min(1, t)));
}

export function riverPointAt(t) {
  return riverCurve.getPointAt(Math.max(0, Math.min(1, t)));
}

export function trailWidthAt() {
  return 2.7;
}

export function trailDistanceSq(x, z) {
  let best = Infinity;
  for (let i = 0; i < trailPointsXZ.length; i++) {
    const dx = x - trailPointsXZ[i][0];
    const dz = z - trailPointsXZ[i][1];
    const d = dx * dx + dz * dz;
    if (d < best) best = d;
  }
  return best;
}

export function createTerrain(material, size = 1980, segments = 240) {
  const geo = new THREE.PlaneGeometry(size, size, segments, segments);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);

  const cValley = new THREE.Color(0x99a553);
  const cGrass = new THREE.Color(0x6d8b3c);
  const cGreen = new THREE.Color(0x557635);
  const cDeep = new THREE.Color(0x3f5e2d);
  const cGold = new THREE.Color(0xa9a653);
  const cHill = new THREE.Color(0x7b8a4a);
  const cSand = new THREE.Color(0xa9a077);
  const cTrack = new THREE.Color(0x8f8655);
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
    const slope = smoothstep(0.94, 0.55, ny);
    const nr = nearestRiver(x, z).d;
    const patch = fbm(x * 0.021 + 20, z * 0.021 - 14, 3);
    const broad = fbm(x * 0.0058 - 3, z * 0.0058 + 9, 2);
    const dry = fbm(x * 0.011 + 40, z * 0.011 + 7, 2);

    tmp.copy(cGreen).lerp(cGrass, smoothstep(0.28, 0.78, patch));
    tmp.lerp(cValley, smoothstep(0.48, 0.9, broad) * 0.42);
    tmp.lerp(cDeep, smoothstep(0.42, 0.8, patch) * 0.2);
    tmp.lerp(cGold, smoothstep(0.55, 0.92, dry) * 0.36);
    const hillness = smoothstep(16, 70, y);
    tmp.lerp(cHill, hillness * 0.35);
    tmp.lerp(cSand, (1 - smoothstep(10, 30, nr)) * 0.72);
    const campD = Math.hypot(x - camp.x, z - camp.z);
    tmp.lerp(cTrack, (1 - smoothstep(18, 54, campD)) * 0.12);
    tmp.lerp(cDeep, slope * 0.25);
    const jitter = 0.93 + fbm(x * 0.06, z * 0.06, 2) * 0.14;
    colors[i * 3] = tmp.r * jitter;
    colors[i * 3 + 1] = tmp.g * jitter;
    colors[i * 3 + 2] = tmp.b * jitter;
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mesh = new THREE.Mesh(geo, material);
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  mesh.name = 'hulunbuir-grassland';
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

function hillGeometry(rand, radius, height, segments) {
  const geo = new THREE.ConeGeometry(radius, height, segments, 3, false);
  const p = geo.attributes.position;
  for (let v = 0; v < p.count; v++) {
    const px = p.getX(v);
    const py = p.getY(v);
    const pz = p.getZ(v);
    const n = valueNoise(px * 0.006 + rand() * 0.001, pz * 0.006) - 0.5;
    p.setX(v, px * (1 + n * 0.36));
    p.setZ(v, pz * (1 + n * 0.36));
    if (py > -height * 0.48) p.setY(v, py + n * height * 0.16);
  }
  geo.computeVertexNormals();
  return geo;
}

export function createDistantHills(materials) {
  const group = new THREE.Group();
  group.name = 'hulunbuir-distant-hills';
  const rand = mulberry32(7081);
  const buckets = [[], [], []];

  for (let layer = 0; layer < 3; layer++) {
    const count = 48 - layer * 4;
    const baseRadius = 1080 + layer * 430;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + rand() * 0.12;
      const radius = baseRadius + rand() * 360;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const h = (34 + rand() * 52) * (1 + layer * 0.32);
      const base = (180 + rand() * 230) * (1 + layer * 0.16);
      const geo = hillGeometry(rand, base, h, 9 + layer * 3);
      geo.rotateY(rand() * Math.PI * 2);
      geo.translate(x, -16 + h * 0.5, z);
      buckets[layer].push(geo);
    }
  }

  for (let layer = 0; layer < 3; layer++) {
    const merged = mergeSimple(buckets[layer]);
    buckets[layer].forEach((g) => g.dispose());
    const mesh = new THREE.Mesh(merged, materials[layer]);
    mesh.receiveShadow = false;
    mesh.castShadow = false;
    mesh.name = 'distant-hill-layer-' + layer;
    group.add(mesh);
  }
  return group;
}

export function createRiverGeometry() {
  const curveSamples = riverCurve.getSpacedPoints(320);
  const positions = [];
  const uvs = [];
  const indices = [];
  const n = curveSamples.length;
  for (let i = 0; i < n; i++) {
    const p = curveSamples[i];
    const prev = curveSamples[Math.max(0, i - 1)];
    const next = curveSamples[Math.min(n - 1, i + 1)];
    let tx = next.x - prev.x;
    let tz = next.z - prev.z;
    const len = Math.hypot(tx, tz) || 1;
    tx /= len;
    tz /= len;
    const nx = -tz;
    const nz = tx;
    const w = riverWidthAt(i / (n - 1)) * 0.5;
    positions.push(p.x + nx * w, waterLevel, p.z + nz * w);
    positions.push(p.x - nx * w, waterLevel, p.z - nz * w);
    uvs.push(0, i * 0.055, 1, i * 0.055);
    if (i < n - 1) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}
