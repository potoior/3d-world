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

function smoothstep(a, b, x) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function profile(t, keys) {
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (t >= a[0] && t <= b[0]) {
      const k = smoothstep(a[0], b[0], t);
      return a[1] + (b[1] - a[1]) * k;
    }
  }
  return keys[keys.length - 1][1];
}

const mainPath = [
  [190, 880],
  [126, 764],
  [8, 650],
  [-118, 520],
  [-160, 382],
  [-86, 246],
  [54, 116],
  [146, -34],
  [150, -182],
  [68, -330],
  [-72, -452],
  [-260, -550],
  [-458, -630],
  [-628, -760],
  [-742, -920],
];

const mainHeights = [
  [0.0, 76],
  [0.08, 103],
  [0.16, 92],
  [0.26, 122],
  [0.36, 139],
  [0.46, 164],
  [0.53, 187],
  [0.59, 176],
  [0.66, 144],
  [0.74, 156],
  [0.83, 131],
  [0.91, 149],
  [1.0, 167],
];

const westPath = [
  [-640, 760],
  [-566, 520],
  [-638, 288],
  [-728, 42],
  [-706, -218],
  [-818, -454],
  [-968, -708],
];
const westHeights = [146, 136, 123, 151, 142, 171, 188];

const eastPath = [
  [556, 820],
  [650, 568],
  [602, 336],
  [692, 76],
  [764, -194],
  [720, -458],
  [904, -736],
];
const eastHeights = [119, 143, 129, 157, 141, 166, 193];

const northPath = [
  [-1120, -940],
  [-786, -1080],
  [-386, -1130],
  [10, -1122],
  [424, -1076],
  [792, -1010],
  [1130, -900],
];
const northHeights = [194, 228, 249, 271, 246, 224, 203];

const farPeaks = [
  { x: -1010, z: -176, h: 227, r: 246 },
  { x: 1010, z: -612, h: 218, r: 306 },
  { x: -878, z: 812, h: 183, r: 224 },
  { x: 944, z: 876, h: 172, r: 252 },
  { x: -344, z: -1086, h: 247, r: 272 },
  { x: 302, z: -1212, h: 272, r: 322 },
  { x: -1262, z: 320, h: 232, r: 356 },
  { x: 1232, z: -108, h: 248, r: 338 },
  { x: -1190, z: -1190, h: 268, r: 330 },
  { x: 1170, z: -1190, h: 280, r: 350 },
];

function toCurve(points) {
  return new THREE.CatmullRomCurve3(
    points.map((p) => new THREE.Vector3(p[0], 0, p[1])),
    false,
    'centripetal',
    0.5
  );
}

const mainCurve = toCurve(mainPath);
const southStart = mainCurve.getPointAt(0.1);
const southPath = [
  [southStart.x, southStart.z],
  [258, 742],
  [426, 654],
  [574, 558],
  [672, 444],
  [690, 328],
];
const southCurve = toCurve(southPath);
const southHeights = [
  [0.0, profile(0.1, mainHeights)],
  [0.22, 96],
  [0.45, 85],
  [0.68, 77],
  [0.85, 83],
  [1.0, 92],
];

const mainSamples = mainCurve.getSpacedPoints(190).map((p, i, arr) => {
  const t = i / (arr.length - 1);
  return { x: p.x, z: p.z, h: profile(t, mainHeights), width: 92 + Math.sin(t * 8.2) * 9 };
});

const southSamples = southCurve.getSpacedPoints(72).map((p, i, arr) => {
  const t = i / (arr.length - 1);
  return { x: p.x, z: p.z, h: profile(t, southHeights), width: 57 + Math.sin(t * 5.2) * 6 };
});

const westSamples = toCurve(westPath).getSpacedPoints(78).map((p, i, arr) => ({
  x: p.x,
  z: p.z,
  h: westHeights[Math.round((i / (arr.length - 1)) * (westHeights.length - 1))],
  width: 142,
}));

const eastSamples = toCurve(eastPath).getSpacedPoints(78).map((p, i, arr) => ({
  x: p.x,
  z: p.z,
  h: eastHeights[Math.round((i / (arr.length - 1)) * (eastHeights.length - 1))],
  width: 136,
}));

const northSamples = toCurve(northPath).getSpacedPoints(86).map((p, i, arr) => ({
  x: p.x,
  z: p.z,
  h: northHeights[Math.round((i / (arr.length - 1)) * (northHeights.length - 1))],
  width: 205,
}));

const ridges = [
  { samples: mainSamples, width: 92 },
  { samples: southSamples, width: 57 },
  { samples: westSamples, width: 142 },
  { samples: eastSamples, width: 136 },
  { samples: northSamples, width: 205 },
];

function ridgeField(x, z) {
  let best = 0;
  for (let r = 0; r < ridges.length; r++) {
    const ridge = ridges[r];
    const s = ridge.samples;
    const w = ridge.width;
    const lim = w * w * 3.2;
    for (let i = 0; i < s.length - 1; i++) {
      const a = s[i];
      const b = s[i + 1];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const len2 = dx * dx + dz * dz;
      if (len2 < 0.0001) continue;
      let u = ((x - a.x) * dx + (z - a.z) * dz) / len2;
      u = u < 0 ? 0 : u > 1 ? 1 : u;
      const px = a.x + dx * u;
      const pz = a.z + dz * u;
      const ddx = x - px;
      const ddz = z - pz;
      const d2 = ddx * ddx + ddz * ddz;
      if (d2 > lim) continue;
      const peak = a.h + (b.h - a.h) * u;
      const value = peak * Math.exp(-d2 / (w * w));
      if (value > best) best = value;
    }
  }
  return best;
}

export function heightAt(x, z) {
  let h = ridgeField(x, z);

  for (let i = 0; i < farPeaks.length; i++) {
    const p = farPeaks[i];
    const dx = x - p.x;
    const dz = z - p.z;
    const d2 = dx * dx + dz * dz;
    const lim = p.r * p.r * 2.8;
    if (d2 < lim) {
      const v = p.h * Math.exp(-d2 / (p.r * p.r));
      if (v > h) h = v;
    }
  }

  const macro = fbm(x * 0.0062 + 11.3, z * 0.0062 - 8.1, 3) - 0.5;
  const detail = fbm(x * 0.021 + 4.7, z * 0.021 + 2.9, 4) - 0.5;
  const fine = fbm(x * 0.082 - 7.3, z * 0.082 + 5.2, 2) - 0.5;

  const shoulder = smoothstep(0, 90, h);
  h += 3.0 + macro * 15.0 + detail * (6.5 + shoulder * 5.8) + fine * 2.4;
  const crag = fbm(x * 0.047 - 2.1, z * 0.047 + 6.4, 2) - 0.5;
  const crag2 = fbm(x * 0.11 + 8.6, z * 0.11 - 3.2, 2) - 0.5;
  h += crag * shoulder * 9.5 + crag2 * shoulder * 3.4;
  if (h < 1.5) h = 1.5;
  return h;
}

export function slopeAt(x, z) {
  const e = 3;
  const hx = heightAt(x + e, z) - heightAt(x - e, z);
  const hz = heightAt(x, z + e) - heightAt(x, z - e);
  return Math.hypot(hx, hz) / (2 * e);
}

export function createTerrain(material, size = 2600, segments = 240) {
  const geo = new THREE.PlaneGeometry(size, size, segments, segments);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const cGrass = new THREE.Color(0x8a8a88);
  const cDry = new THREE.Color(0x968b7e);
  const cPine = new THREE.Color(0x406f49);
  const cRock = new THREE.Color(0x8d9092);
  const cHigh = new THREE.Color(0xa9acae);
  const cAutumn = new THREE.Color(0xa17c58);
  const cWarm = new THREE.Color(0xb19772);
  const cStrata = new THREE.Color(0x89877a);
  const cHollow = new THREE.Color(0x596b55);
  const sunDir = new THREE.Vector3(0.78, 0.36, 0.51).normalize();
  const tmp = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const y = heightAt(x, z);
    pos.setY(i, y);
  }
  geo.computeVertexNormals();
  const normals = geo.attributes.normal;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const y = pos.getY(i);
    const ny = normals.getY(i);
    const steep = smoothstep(0.9, 0.48, ny);
    const high = smoothstep(105, 245, y);
    const noise = fbm(x * 0.045 + 20, z * 0.045 - 14, 3);
    const dry = fbm(x * 0.014 - 3, z * 0.014 + 9, 2);
    const band = Math.sin(y * 0.6 + noise * 7.4 + x * 0.016 - z * 0.011) * 0.5 + 0.5;
    const nx = normals.getX(i);
    const nz = normals.getZ(i);
    const lit = Math.max(0, nx * sunDir.x + ny * sunDir.y + nz * sunDir.z);

    tmp.copy(cGrass).lerp(cDry, dry * 0.4 + noise * 0.18);
    tmp.lerp(cAutumn, Math.max(0, dry - 0.52) * 1.2 + (noise > 0.62 ? (noise - 0.62) * 1.6 : 0));
    tmp.lerp(cPine, (1 - steep) * 0.2 + (1 - high) * 0.11);
    tmp.lerp(cHollow, Math.max(0, 0.5 - dry) * 0.34 * (1 - steep));
    tmp.lerp(band > 0.55 ? cWarm : cStrata, (steep * 0.62 + high * 0.18) * (0.28 + Math.abs(band - 0.5) * 0.5));
    tmp.lerp(cRock, steep * 0.98);
    tmp.lerp(cHigh, high * 0.15 + steep * high * 0.24);
    tmp.lerp(cWarm, lit * 0.08 * (1 - steep * 0.55));

    const jitter = 0.9 + hash2(Math.floor(x * 0.45), Math.floor(z * 0.45)) * 0.2;
    colors[i * 3] = tmp.r * jitter;
    colors[i * 3 + 1] = tmp.g * jitter;
    colors[i * 3 + 2] = tmp.b * jitter;
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mesh = new THREE.Mesh(geo, material);
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  mesh.name = 'yanshan-terrain';
  return mesh;
}

export function createDistantMountains(materialA, materialB) {
  const group = new THREE.Group();
  const rand = mulberry32(7081);
  const bucketA = [];
  const bucketB = [];
  const count = 46;

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + rand() * 0.07;
    const radius = 1480 + rand() * 980;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const height = 175 + rand() * 250 + (Math.abs(z) / 1300) * 55;
    const baseR = 230 + rand() * 330;
    const seg = 7 + (rand() * 3 | 0);
    const geo = new THREE.ConeGeometry(baseR, height, seg, 2, false);
    const p = geo.attributes.position;
    for (let v = 0; v < p.count; v++) {
      const px = p.getX(v);
      const py = p.getY(v);
      const pz = p.getZ(v);
      const n = valueNoise(px * 0.013 + i * 13.7, pz * 0.013 - i * 8.2) - 0.5;
      p.setX(v, px * (1 + n * 0.32));
      p.setZ(v, pz * (1 + n * 0.32));
      if (py > -height * 0.49) p.setY(v, py + n * height * 0.12);
    }
    geo.computeVertexNormals();
    geo.rotateY(rand() * Math.PI * 2);
    geo.translate(x, -22 + height * 0.5, z);
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
  addMerged(bucketA, materialA, 'far-peaks-a');
  addMerged(bucketB, materialB, 'far-peaks-b');
  return group;
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

export { mainCurve, southCurve, mainSamples, southSamples, mainHeights, southHeights };
