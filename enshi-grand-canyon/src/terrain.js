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

export const peaks = [
  { x: 150, z: 14, h: 160, r: 44, sharp: 2.7 },
  { x: 72, z: -150, h: 182, r: 64, sharp: 2.5 },
  { x: -170, z: -240, h: 212, r: 116, sharp: 2.05 },
  { x: -255, z: -78, h: 132, r: 50, sharp: 2.9 },
  { x: 22, z: -420, h: 240, r: 104, sharp: 2.25 },
  { x: 255, z: -340, h: 216, r: 82, sharp: 2.65 },
  { x: -392, z: -322, h: 190, r: 86, sharp: 2.5 },
  { x: -474, z: -58, h: 158, r: 78, sharp: 2.25 },
  { x: 392, z: -562, h: 202, r: 122, sharp: 2.2 },
  { x: -120, z: -642, h: 208, r: 142, sharp: 2.0 },
  { x: 438, z: -118, h: 152, r: 94, sharp: 2.35 },
  { x: -34, z: -916, h: 232, r: 186, sharp: 1.85 },
  { x: 610, z: -760, h: 196, r: 150, sharp: 2.0 },
  { x: -610, z: -700, h: 188, r: 158, sharp: 2.0 },
];

const ridgeDefs = [
  { pts: [[-80, -30], [-160, -50], [-255, -78], [-336, -168]], h: 112, w: 86 },
  { pts: [[300, 392], [110, 352], [-86, 322], [-292, 276]], h: 62, w: 120 },
  { pts: [[0, -120], [18, -262], [22, -420], [108, -526]], h: 138, w: 96 },
  { pts: [[214, 84], [268, -58], [255, -340], [352, -470]], h: 128, w: 104 },
  { pts: [[-300, 118], [-390, -40], [-392, -322], [-486, -428]], h: 120, w: 108 },
  { pts: [[-620, 250], [-490, 40], [-420, -232]], h: 94, w: 116 },
];

const trenchPath = [[250, -152], [140, -228], [28, -312], [-42, -414], [-98, -524], [-166, -654]];

export const trailPoints = [
  [238, 366, 24],
  [214, 306, 35],
  [188, 248, 47],
  [163, 192, 60],
  [147, 142, 73],
  [137, 96, 86],
  [130, 62, 99],
  [118, 34, 104],
  [92, 4, 111],
  [56, -26, 119],
  [16, -56, 128],
  [-26, -90, 139],
  [-68, -128, 153],
  [-106, -170, 170],
  [-134, -204, 188],
  [-152, -226, 200.65],
];

export const platforms = [
  { name: '后花园', x: 122, z: 54, y: 100.9, r: 8.5 },
  { name: '迷魂台', x: -150, z: -226, y: 200.45, r: 13 },
  { name: '入口观景台', x: 235, z: 361, y: 24.73, r: 8 },
];

const trailCurve = new THREE.CatmullRomCurve3(
  trailPoints.map((p) => new THREE.Vector3(p[0], p[2], p[1])),
  false,
  'centripetal',
  0.5
);

const TRAIL_N = 300;
const trailSamples = trailCurve.getSpacedPoints(TRAIL_N).map((p, i) => {
  const t = i / TRAIL_N;
  let width = 2.5;
  for (const pl of platforms) {
    const d = Math.hypot(p.x - pl.x, p.z - pl.z);
    if (d < pl.r + 8) width = Math.max(width, 2.5 + (pl.r + 2 - d) * 0.55);
  }
  return { x: p.x, y: p.y, z: p.z, t, width: Math.min(width, 10) };
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

function ridgeField(x, z) {
  let best = 0;
  for (const ridge of ridgeDefs) {
    const pts = ridge.pts;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const dx = b[0] - a[0];
      const dz = b[1] - a[1];
      const len2 = dx * dx + dz * dz;
      if (len2 < 0.0001) continue;
      let u = ((x - a[0]) * dx + (z - a[1]) * dz) / len2;
      u = u < 0 ? 0 : u > 1 ? 1 : u;
      const px = a[0] + dx * u;
      const pz = a[1] + dz * u;
      const ddx = x - px;
      const ddz = z - pz;
      const d2 = ddx * ddx + ddz * ddz;
      const lim = ridge.w * ridge.w * 3.4;
      if (d2 > lim) continue;
      const v = ridge.h * Math.exp(-d2 / (ridge.w * ridge.w));
      if (v > best) best = v;
    }
  }
  return best;
}

function peakField(x, z) {
  let best = 0;
  for (const p of peaks) {
    const dx = x - p.x;
    const dz = z - p.z;
    const d2 = dx * dx + dz * dz;
    const lim = p.r * p.r * 5.2;
    if (d2 > lim) continue;
    const v = p.h * Math.exp(-Math.pow(d2 / (p.r * p.r), p.sharp * 0.5));
    if (v > best) best = v;
  }
  return best;
}

function trenchField(x, z) {
  let deepest = 0;
  for (let i = 0; i < trenchPath.length - 1; i++) {
    const a = trenchPath[i];
    const b = trenchPath[i + 1];
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const len2 = dx * dx + dz * dz;
    let u = ((x - a[0]) * dx + (z - a[1]) * dz) / len2;
    u = u < 0 ? 0 : u > 1 ? 1 : u;
    const px = a[0] + dx * u;
    const pz = a[1] + dz * u;
    const d = Math.hypot(x - px, z - pz);
    if (d < 72) {
      const v = (1 - smoothstep(0, 72, d)) * 68;
      if (v > deepest) deepest = v;
    }
  }
  return deepest;
}

export function heightAt(x, z) {
  let h = Math.max(ridgeField(x, z), peakField(x, z));

  const macro = fbm(x * 0.0048 + 11.3, z * 0.0048 - 8.1, 3) - 0.5;
  const detail = fbm(x * 0.019 + 4.7, z * 0.019 + 2.9, 4) - 0.5;
  const fine = fbm(x * 0.075 - 7.3, z * 0.075 + 5.2, 2) - 0.5;
  const shoulder = smoothstep(4, 84, h);
  h += 4.5 + macro * 16 + detail * (4.5 + shoulder * 6.5) + fine * 2.8;

  const crag = fbm(x * 0.043 - 2.1, z * 0.043 + 6.4, 2) - 0.5;
  const crag2 = fbm(x * 0.105 + 8.6, z * 0.105 - 3.2, 2) - 0.5;
  h += crag * shoulder * 12 + crag2 * shoulder * 4.2;

  const strata = Math.sin((h + x * 0.06 + z * 0.03) * 0.42) * shoulder * 2.1;
  h += strata;
  h -= trenchField(x, z);
  if (h < 2) h = 2;

  for (const pl of platforms) {
    const d = Math.hypot(x - pl.x, z - pl.z);
    if (d < pl.r + 10) {
      const blend = smoothstep(pl.r * 0.72, pl.r + 9, d);
      h = pl.y * (1 - blend) + h * blend;
    }
  }

  const near = nearestTrail(x, z);
  if (near.d < 26) {
    const blend = smoothstep(6.5, 24, near.d);
    const bed = near.s.y - 0.2 - Math.min(8, near.d * near.d * 0.028);
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

export function createTerrain(material, size = 2600, segments = 256) {
  const geo = new THREE.PlaneGeometry(size, size, segments, segments);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const cRock = new THREE.Color(0x97a299);
  const cWarm = new THREE.Color(0x9ca692);
  const cDark = new THREE.Color(0x5d6961);
  const cPine = new THREE.Color(0x365940);
  const cMoss = new THREE.Color(0x6b7d57);
  const cHigh = new THREE.Color(0xb8c2b8);
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
    const steep = smoothstep(0.82, 0.32, ny);
    const high = smoothstep(96, 230, y);
    const noise = fbm(x * 0.055 + 20, z * 0.055 - 14, 3);
    const band = fbm(x * 0.011 - 3, z * 0.011 + 9, 2);
    const ledge = smoothstep(0.6, 0.18, steep) * smoothstep(0.35, 0.65, noise);

    tmp.copy(cRock).lerp(cWarm, band * 0.55 + noise * 0.22);
    tmp.lerp(cDark, steep * 0.55);
    tmp.lerp(cMoss, ledge * 0.45 + (1 - high) * 0.1);
    tmp.lerp(cPine, ledge * 0.55);
    tmp.lerp(cHigh, high * 0.25 + steep * high * 0.2);

    const streak = fbm(x * 0.19 + 5, z * 0.19 - 2, 2);
    const jitter = 0.9 + streak * 0.2;
    colors[i * 3] = tmp.r * jitter;
    colors[i * 3 + 1] = tmp.g * jitter;
    colors[i * 3 + 2] = tmp.b * jitter;
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mesh = new THREE.Mesh(geo, material);
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  mesh.name = 'zhangjiajie-quartz-massif';
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
  const count = 54;

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + rand() * 0.06;
    const radius = 1420 + rand() * 1050;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const height = 210 + rand() * 310 + (Math.abs(z) / 1400) * 70;
    const baseR = 210 + rand() * 300;
    const seg = 7 + (rand() * 3 | 0);
    const geo = new THREE.ConeGeometry(baseR, height, seg, 2, false);
    const p = geo.attributes.position;
    for (let v = 0; v < p.count; v++) {
      const px = p.getX(v);
      const py = p.getY(v);
      const pz = p.getZ(v);
      const n = valueNoise(px * 0.012 + i * 13.7, pz * 0.012 - i * 8.2) - 0.5;
      p.setX(v, px * (1 + n * 0.34));
      p.setZ(v, pz * (1 + n * 0.34));
      if (py > -height * 0.49) p.setY(v, py + n * height * 0.15);
    }
    geo.computeVertexNormals();
    geo.rotateY(rand() * Math.PI * 2);
    geo.translate(x, -30 + height * 0.5, z);
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
  addMerged(bucketA, materialA, 'far-ridges-a');
  addMerged(bucketB, materialB, 'far-ridges-b');
  return group;
}
