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

// Laojun Mountain: one knife-edge granite spine, with the golden temple
// complex on the crest, the Shili Huaping cliff wall to the east and a deep
// cloud-filled gorge between the two.
export const peaks = [
  { x: -8, z: -120, h: 236, r: 58, sharp: 3.05 },
  { x: 40, z: -330, h: 278, r: 43, sharp: 3.4 },
  { x: -58, z: -96, h: 228, r: 27, sharp: 3.7 },
  { x: 18, z: -196, h: 238, r: 33, sharp: 3.2 },
  { x: 12, z: -12, h: 214, r: 38, sharp: 3.0 },
  { x: -40, z: 92, h: 196, r: 52, sharp: 2.7 },
  { x: 32, z: 214, h: 160, r: 46, sharp: 2.6 },
  { x: 96, z: 352, h: 116, r: 68, sharp: 2.2 },
  { x: 168, z: 474, h: 78, r: 92, sharp: 1.9 },
  { x: 168, z: 134, h: 184, r: 42, sharp: 3.1 },
  { x: 198, z: -40, h: 196, r: 48, sharp: 3.5 },
  { x: 220, z: -218, h: 210, r: 54, sharp: 3.7 },
  { x: 236, z: -404, h: 224, r: 58, sharp: 3.6 },
  { x: 252, z: -592, h: 206, r: 62, sharp: 3.3 },
  { x: -168, z: -268, h: 188, r: 66, sharp: 2.35 },
  { x: -256, z: -462, h: 198, r: 88, sharp: 2.2 },
  { x: -118, z: 292, h: 148, r: 72, sharp: 2.25 },
  { x: -310, z: -72, h: 162, r: 96, sharp: 2.0 },
  { x: 348, z: -678, h: 188, r: 106, sharp: 2.0 },
  { x: -340, z: -690, h: 176, r: 120, sharp: 1.95 },
  { x: 420, z: -212, h: 168, r: 118, sharp: 1.9 },
  { x: -426, z: -324, h: 180, r: 110, sharp: 1.95 },
];

const ridgeDefs = [
  { pts: [[-36, 610], [-4, 470], [5, 330], [-6, 190], [-16, 42], [-6, -104], [15, -252], [38, -398], [70, -548]], h: 172, w: 58 },
  { pts: [[-15, -96], [10, -240], [35, -400], [66, -548]], h: 208, w: 33 },
  { pts: [[-8, -86], [-40, -94], [-78, -100], [-112, -116]], h: 148, w: 27 },
  { pts: [[150, 190], [180, 52], [200, -112], [218, -286], [234, -454], [254, -606]], h: 158, w: 48 },
  { pts: [[-30, 520], [-120, 404], [-206, 296], [-292, 204]], h: 86, w: 104 },
  { pts: [[110, 500], [226, 402], [330, 306], [430, 202]], h: 72, w: 118 },
  { pts: [[-150, -40], [-236, -168], [-268, -354], [-292, -522]], h: 94, w: 106 },
  { pts: [[280, -110], [352, -268], [382, -430], [410, -590]], h: 92, w: 118 },
];

const trenchPath = [[112, 344], [126, 216], [136, 84], [146, -70], [158, -240], [172, -402], [190, -560]];

export const trailPoints = [
  [150, 620, 38],
  [142, 548, 62],
  [124, 474, 86],
  [104, 402, 108],
  [86, 338, 124],
  [68, 278, 140],
  [53, 222, 158],
  [43, 168, 174],
  [32, 112, 190],
  [18, 52, 203],
  [4, -8, 212],
  [-6, -66, 219],
  [-10, -120, 226],
  [-4, -174, 232],
  [8, -224, 240],
  [22, -274, 250],
  [40, -330, 262],
  [52, -390, 254],
  [64, -452, 238],
  [78, -518, 216],
  [92, -598, 192],
];

export const platforms = [
  { key: 'jinding', name: '金顶道观群', x: -8, z: -120, y: 226.0, r: 31 },
  { key: 'yuhuang', name: '玉皇顶', x: 40, z: -330, y: 262.0, r: 17 },
  { key: 'liangbao', name: '亮宝台', x: -58, z: -96, y: 214.0, r: 12 },
  { key: 'shili', name: '十里画屏', x: 184, z: -236, y: 191.0, r: 10 },
  { key: 'nantianmen', name: '南天门', x: 53, z: 222, y: 158.0, r: 9 },
  { key: 'zhongtianmen', name: '中天门', x: 86, z: 338, y: 124.0, r: 9 },
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
  let width = 2.6;
  for (const pl of platforms) {
    const d = Math.hypot(p.x - pl.x, p.z - pl.z);
    if (d < pl.r + 9) width = Math.max(width, 2.6 + (pl.r + 3 - d) * 0.42);
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
    if (d < 86) {
      const v = (1 - smoothstep(0, 86, d)) * 74;
      if (v > deepest) deepest = v;
    }
  }
  return deepest;
}

export function heightAt(x, z) {
  let h = Math.max(ridgeField(x, z), peakField(x, z));

  const macro = fbm(x * 0.0046 + 11.3, z * 0.0046 - 8.1, 3) - 0.5;
  const detail = fbm(x * 0.019 + 4.7, z * 0.019 + 2.9, 4) - 0.5;
  const fine = fbm(x * 0.075 - 7.3, z * 0.075 + 5.2, 2) - 0.5;
  const shoulder = smoothstep(4, 84, h);
  h += 4.5 + macro * 15 + detail * (4.5 + shoulder * 6) + fine * 2.6;

  const crag = fbm(x * 0.043 - 2.1, z * 0.043 + 6.4, 2) - 0.5;
  const crag2 = fbm(x * 0.105 + 8.6, z * 0.105 - 3.2, 2) - 0.5;
  h += crag * shoulder * 12 + crag2 * shoulder * 4.0;

  const strata = Math.sin((h + x * 0.06 + z * 0.03) * 0.42) * shoulder * 2.0;
  h += strata;
  h -= trenchField(x, z);
  if (h < 2) h = 2;

  for (const pl of platforms) {
    const d = Math.hypot(x - pl.x, z - pl.z);
    if (d < pl.r + 11) {
      const blend = smoothstep(pl.r * 0.7, pl.r + 10, d);
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

export function createTerrain(material, size = 2800, segments = 256) {
  const geo = new THREE.PlaneGeometry(size, size, segments, segments);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const cRock = new THREE.Color(0x8e9394);
  const cWarm = new THREE.Color(0xa99c88);
  const cDark = new THREE.Color(0x5e6765);
  const cPine = new THREE.Color(0x38533f);
  const cMoss = new THREE.Color(0x697152);
  const cHigh = new THREE.Color(0xb7c1c3);
  const cSnow = new THREE.Color(0xdbe4e5);
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
    const steep = smoothstep(0.84, 0.28, ny);
    const high = smoothstep(120, 240, y);
    const noise = fbm(x * 0.055 + 20, z * 0.055 - 14, 3);
    const band = fbm(x * 0.011 - 3, z * 0.011 + 9, 2);
    const ledge = smoothstep(0.6, 0.18, steep) * smoothstep(0.35, 0.65, noise);
    const snowLine = smoothstep(0.54, 0.28, steep) * smoothstep(150, 236, y) * smoothstep(0.34, 0.62, fbm(x * 0.04 - 8, z * 0.04 + 12, 3));

    tmp.copy(cRock).lerp(cWarm, band * 0.5 + noise * 0.22);
    tmp.lerp(cDark, steep * 0.62);
    tmp.lerp(cMoss, ledge * 0.34 + (1 - high) * 0.08);
    tmp.lerp(cPine, ledge * 0.5);
    tmp.lerp(cHigh, high * 0.2 + steep * high * 0.12);
    tmp.lerp(cSnow, snowLine * 0.72);

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
  mesh.name = 'laojun-granite-massif';
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
    const angle = (i / count) * Math.PI * 2 + rand() * 0.06;
    const radius = 1500 + rand() * 1150;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const height = 230 + rand() * 340 + (Math.abs(z) / 1400) * 70;
    const baseR = 220 + rand() * 320;
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
    geo.translate(x, -40 + height * 0.5, z);
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
