import * as THREE from 'three';
import { mergeGeometryList } from './geometry.js';
import { heightAt, trailSamples, platforms, fbm } from './terrain.js';
import { sharedTextures } from './materials.js';
import { makeLabelTexture, makeGlowTexture } from './textures.js';

function rand32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(v, a, b) {
  return v < a ? a : v > b ? b : v;
}

function smoothstep(a, b, x) {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

function addGeo(bucket, geo, mat) {
  if (!bucket.has(mat)) bucket.set(mat, []);
  bucket.get(mat).push(geo);
}

const STRATA = [
  0xa8342a, 0xc9432c, 0xe25a2f, 0xee7a35, 0xf39a3e,
  0xf3b94b, 0xefc94a, 0xf6dc86, 0xfbe8bd, 0xe9c7a8,
  0xd98f97, 0xb85f7e, 0x8b7f68, 0xa3a05c, 0x839a74, 0x6d9294,
].map((hex) => new THREE.Color(hex));

const strataMat = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.94,
  metalness: 0,
});
const strataFlatMat = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.96,
  metalness: 0,
  flatShading: true,
});
const timberMat = new THREE.MeshStandardMaterial({ color: 0x8a5b34, roughness: 0.86 });
const plankMat = new THREE.MeshStandardMaterial({ color: 0xb27a45, roughness: 0.9 });
const railMat = new THREE.MeshStandardMaterial({ color: 0x4a2f1e, roughness: 0.7, metalness: 0.12 });
const stoneMat = new THREE.MeshStandardMaterial({ color: 0xb39a7a, roughness: 1, flatShading: true });
const roadMat = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.88,
  metalness: 0.02,
});
const roadLineMat = new THREE.MeshStandardMaterial({ color: 0xe8bf74, roughness: 0.7 });
const rockMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.98, flatShading: true });
const shrubMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true });
const personMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0 });
const busMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.18 });
const snowMat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.92, metalness: 0 });

function strataColor(y, x, z, out, seedBias = 0) {
  const warp = (fbm(x * 0.018 + 4.1, z * 0.018 - 2.3, 3) - 0.5) * 9.5;
  const tilt = x * 0.055 + z * 0.023;
  const coord = (y + tilt + warp) * 0.145 + seedBias;
  const idx = Math.floor(coord);
  const frac = coord - idx;
  const n = STRATA.length;
  const a = STRATA[((idx % n) + n) % n];
  const b = STRATA[(((idx + 1) % n) + n) % n];
  out.copy(a).lerp(b, smoothstep(0.82, 1.0, frac) * 0.68);
  out.offsetHSL(0, 0.1, 0.01);
  const grain = 0.9 + fbm(x * 0.09 + 9, z * 0.09 - 4, 2) * 0.2;
  out.multiplyScalar(grain);
  return out;
}

function paintedHill(spec) {
  const {
    x, z, height, rBottom, rTop, seed,
    seg = 64, rings = 28, sx = 1, sz = 1,
    sink = 10, leanX = 0, leanZ = 0, flatTop = false,
  } = spec;
  const baseY = Math.max(1.5, heightAt(x, z) - sink);
  const ringCount = Math.max(12, rings);
  const positions = [];
  const colors = [];
  const indices = [];
  const color = new THREE.Color();

  for (let i = 0; i <= ringCount; i++) {
    const f = i / ringCount;
    const y = baseY + height * f;
    const taper = Math.pow(f, 0.72);
    let radius = rBottom + (rTop - rBottom) * taper;
    radius *= 1 + 0.025 * Math.sin(f * 19 + seed * 0.7);
    for (let j = 0; j < seg; j++) {
      const a = (j / seg) * Math.PI * 2;
      const flute = 1
        + 0.062 * Math.sin(a * 9 + seed * 0.4) * (0.25 + f * 0.75)
        + 0.04 * Math.sin(a * 4 - seed * 0.9)
        + 0.028 * Math.sin(a * 17 + f * 7 + seed);
      const shoulder = 1 + 0.12 * Math.sin(a * 2.4 + seed * 1.3) * (1 - f * 0.55);
      const rr = radius * flute * shoulder;
      const px = x + Math.cos(a) * rr * sx + leanX * f * f;
      const pz = z + Math.sin(a) * rr * sz + leanZ * f * f;
      const ripple = Math.sin(a * 6 + f * 14 + seed) * (0.35 + height * 0.0025);
      const py = y + ripple;
      positions.push(px, py, pz);
      strataColor(py, px, pz, color, seed * 0.013);
      colors.push(color.r, color.g, color.b);
    }
  }

  for (let i = 0; i < ringCount; i++) {
    for (let j = 0; j < seg; j++) {
      const k = (j + 1) % seg;
      const a = i * seg + j;
      const b = i * seg + k;
      const c = (i + 1) * seg + k;
      const d = (i + 1) * seg + j;
      indices.push(a, b, c, a, c, d);
    }
  }

  const topY = baseY + height;
  const cx = x + leanX;
  const cz = z + leanZ;
  const ci = positions.length / 3;
  positions.push(cx, topY + 0.15, cz);
  const topColor = flatTop ? new THREE.Color(0xc69c68) : new THREE.Color(0xe3b070);
  colors.push(topColor.r, topColor.g, topColor.b);
  const start = ringCount * seg;
  for (let j = 0; j < seg; j++) {
    const k = (j + 1) % seg;
    indices.push(start + j, start + k, ci);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return { geo, topY, baseY };
}
function paintedFin(spec) {
  const {
    x, z, height, width, thick, yaw = 0,
    seed = 1, sink = 8, lean = 0,
  } = spec;
  const baseY = Math.max(1, heightAt(x, z) - sink);
  const cols = 18;
  const rows = Math.max(10, Math.round(height / 5));
  const positions = [];
  const colors = [];
  const indices = [];
  const color = new THREE.Color();
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);

  for (let side = 0; side < 2; side++) {
    for (let i = 0; i <= cols; i++) {
      const u = i / cols;
      const lx = (u - 0.5) * width;
      const ridge = Math.pow(Math.max(0, 1 - Math.pow(Math.abs(u - 0.5) * 2, 2)), 0.62);
      for (let j = 0; j <= rows; j++) {
        const v = j / rows;
        const yy = baseY + height * ridge * v;
        const t = thick * ridge * (0.22 + 0.78 * (1 - v));
        const wobble = Math.sin(u * 17 + seed) * 0.5 * ridge;
        const lz = (side ? 1 : -1) * t * 0.5 + wobble;
        const px = x + lx * cos - lz * sin + lean * v * v;
        const pz = z + lx * sin + lz * cos;
        positions.push(px, yy, pz);
        strataColor(yy, px, pz, color, seed * 0.017);
        colors.push(color.r, color.g, color.b);
      }
    }
  }

  const stride = (cols + 1) * (rows + 1);
  for (let side = 0; side < 2; side++) {
    const off = side * stride;
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const a = off + i * (rows + 1) + j;
        const b = off + (i + 1) * (rows + 1) + j;
        const c = off + (i + 1) * (rows + 1) + j + 1;
        const d = off + i * (rows + 1) + j + 1;
        if (side === 0) indices.push(a, b, c, a, c, d);
        else indices.push(a, c, b, a, d, c);
      }
    }
  }
  for (let i = 0; i < cols; i++) {
    const a = i * (rows + 1) + rows;
    const b = (i + 1) * (rows + 1) + rows;
    const c = stride + (i + 1) * (rows + 1) + rows;
    const d = stride + i * (rows + 1) + rows;
    indices.push(a, b, c, a, c, d);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return { geo, topY: baseY + height, baseY };
}

function colorGeo(geo, hex) {
  const c = new THREE.Color(hex);
  const count = geo.attributes.position.count;
  const arr = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}

function pushBox(list, w, h, d, x, y, z, ry = 0, color = null) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (ry) g.rotateY(ry);
  g.translate(x, y, z);
  if (color != null) colorGeo(g, color);
  list.push(g);
  return g;
}

function pushCyl(list, rt, rb, h, seg, x, y, z, color = null) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  g.translate(x, y, z);
  if (color != null) colorGeo(g, color);
  list.push(g);
  return g;
}

function segmentGeo(ax, ay, az, bx, by, bz, ra, rb, seg = 5) {
  const dx = bx - ax;
  const dy = by - ay;
  const dz = bz - az;
  const len = Math.hypot(dx, dy, dz) || 1;
  const geo = new THREE.CylinderGeometry(rb, ra, len, seg, 1, false);
  geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(dx / len, dy / len, dz / len)
  ));
  geo.translate((ax + bx) * 0.5, (ay + by) * 0.5, (az + bz) * 0.5);
  return geo;
}

function makeBoardwalk() {
  const timber = [];
  const planks = [];
  const rails = [];
  const supports = [];
  const n = trailSamples.length;
  const i0 = Math.floor(n * 0.1);
  const i1 = Math.floor(n * 0.72);
  const step = 2;

  for (let i = i0; i < i1; i += step) {
    const a = trailSamples[i];
    const b = trailSamples[Math.min(i1, i + step)];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz) || 1;
    const yaw = Math.atan2(dx, dz);
    const nx = -dz / len;
    const nz = dx / len;
    const mx = (a.x + b.x) * 0.5;
    const mz = (a.z + b.z) * 0.5;
    const my = (a.y + b.y) * 0.5 + 0.22;
    const width = 3.7;
    pushBox(planks, width, 0.16, len + 0.24, mx, my, mz, yaw);
    pushBox(timber, 0.22, 0.3, len + 0.2, mx + nx * (width * 0.5), my - 0.1, mz + nz * (width * 0.5), yaw);
    pushBox(timber, 0.22, 0.3, len + 0.2, mx - nx * (width * 0.5), my - 0.1, mz - nz * (width * 0.5), yaw);

    if (i % 4 === 0) {
      for (const side of [-1, 1]) {
        const px = a.x + nx * side * (width * 0.5 + 0.16);
        const pz = a.z + nz * side * (width * 0.5 + 0.16);
        pushCyl(rails, 0.075, 0.1, 1.25, 5, px, a.y + 0.84, pz);
        const ground = heightAt(px, pz);
        if (a.y - ground > 0.6) {
          pushCyl(supports, 0.1, 0.15, Math.min(16, a.y - ground + 0.2), 5, px, (a.y + ground) * 0.5, pz);
        }
      }
    }
    if (i % 8 === 0) {
      const p0 = trailSamples[i];
      const p1 = trailSamples[Math.min(i1, i + 8)];
      for (const side of [-1, 1]) {
        const ox = nx * side * (width * 0.5 + 0.16);
        const oz = nz * side * (width * 0.5 + 0.16);
        const length = Math.hypot(p1.x - p0.x, p1.z - p0.z) || 1;
        pushBox(rails, 0.075, 0.075, length, (p0.x + p1.x) * 0.5 + ox, (p0.y + p1.y) * 0.5 + 1.44, (p0.z + p1.z) * 0.5 + oz, Math.atan2(p1.x - p0.x, p1.z - p0.z));
      }
    }
  }
  return { timber, planks, rails, supports };
}

function makePlatform(spec) {
  const { x, z, y, r } = spec;
  const deck = [];
  const posts = [];
  const rails = [];
  const roofs = [];

  pushCyl(deck, r, r + 0.65, 0.42, 24, x, y + 0.21, z);
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    if (Math.abs(a - Math.PI * 0.32) < 0.36) continue;
    const px = x + Math.cos(a) * (r - 0.08);
    const pz = z + Math.sin(a) * (r - 0.08);
    pushCyl(posts, 0.075, 0.105, 1.22, 5, px, y + 0.85, pz);
    const b = ((i + 1) / 24) * Math.PI * 2;
    if (Math.abs(b - Math.PI * 0.32) < 0.36) continue;
    const qx = x + Math.cos(b) * (r - 0.08);
    const qz = z + Math.sin(b) * (r - 0.08);
    const len = Math.hypot(qx - px, qz - pz);
    const yaw = Math.atan2(qx - px, qz - pz);
    pushBox(rails, 0.075, 0.075, len, (px + qx) * 0.5, y + 1.44, (pz + qz) * 0.5, yaw);
    pushBox(rails, 0.06, 0.06, len, (px + qx) * 0.5, y + 1.04, (pz + qz) * 0.5, yaw);
  }

  if (r > 11) {
    for (const [ox, oz] of [[-r * 0.62, -r * 0.55], [r * 0.62, -r * 0.55], [r * 0.62, r * 0.5], [-r * 0.62, r * 0.5]]) {
      pushCyl(posts, 0.11, 0.14, 4.2, 6, x + ox, y + 2.3, z + oz);
    }
    for (let i = 0; i < 4; i++) {
      pushBox(roofs, r * 1.5, 0.18, 0.16, x, y + 4.35, z - r * 0.55 + i * r * 0.35, 0);
    }
    for (const side of [-1, 1]) {
      pushBox(roofs, 0.16, 0.18, r * 1.35, x + side * r * 0.68, y + 4.35, z, 0);
    }
    pushCyl(roofs, r * 0.98, r * 1.02, 0.24, 6, x, y + 4.5, z);
  }

  return { deck, posts, rails, roofs };
}
function makeRoad() {
  const pts = [];
  for (let i = 0; i <= 26; i++) {
    const x = -1080 + (i / 26) * 2160;
    const z = 280 + Math.sin(x * 0.0042) * 36 + Math.cos(x * 0.011 + 1.2) * 16;
    pts.push(new THREE.Vector3(x, heightAt(x, z) + 0.45, z));
  }
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5);
  const samples = curve.getSpacedPoints(280);
  const positions = [];
  const colors = [];
  const indices = [];
  const halfRoad = 5.2;
  const halfShoulder = 9.2;
  const asphalt = new THREE.Color(0x3c3734);
  const shoulder = new THREE.Color(0xb18d67);

  for (let i = 0; i < samples.length; i++) {
    const p = samples[i];
    const a = samples[Math.max(0, i - 1)];
    const b = samples[Math.min(samples.length - 1, i + 1)];
    let tx = b.x - a.x;
    let tz = b.z - a.z;
    const len = Math.hypot(tx, tz) || 1;
    tx /= len;
    tz /= len;
    const nx = -tz;
    const nz = tx;
    const verts = [
      [p.x + nx * halfShoulder, p.y - 0.04, p.z + nz * halfShoulder, shoulder],
      [p.x + nx * halfRoad, p.y + 0.02, p.z + nz * halfRoad, asphalt],
      [p.x - nx * halfRoad, p.y + 0.02, p.z - nz * halfRoad, asphalt],
      [p.x - nx * halfShoulder, p.y - 0.04, p.z - nz * halfShoulder, shoulder],
    ];
    for (const [vx, vy, vz, col] of verts) {
      positions.push(vx, vy, vz);
      colors.push(col.r, col.g, col.b);
    }
    if (i < samples.length - 1) {
      const k = i * 4;
      const next = k + 4;
      indices.push(k, k + 1, next + 1, k, next + 1, next);
      indices.push(k + 1, k + 2, next + 2, k + 1, next + 2, next + 1);
      indices.push(k + 2, k + 3, next + 3, k + 2, next + 3, next + 2);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, roadMat);
  mesh.receiveShadow = true;
  mesh.name = 'shuttle-road';

  const dashes = [];
  for (let i = 6; i < samples.length - 6; i += 8) {
    const p = samples[i];
    const a = samples[i - 1];
    const b = samples[i + 1];
    const yaw = Math.atan2(b.x - a.x, b.z - a.z);
    pushBox(dashes, 0.42, 0.05, 3.6, p.x, p.y + 0.09, p.z, yaw);
  }

  const posts = [];
  for (let i = 4; i < samples.length - 4; i += 14) {
    const p = samples[i];
    const a = samples[i - 1];
    const b = samples[i + 1];
    const tx = b.x - a.x;
    const tz = b.z - a.z;
    const len = Math.hypot(tx, tz) || 1;
    const nx = -tz / len;
    const nz = tx / len;
    const side = i % 28 === 4 ? 1 : -1;
    pushCyl(posts, 0.065, 0.09, 1.0, 4, p.x + nx * side * (halfShoulder + 0.3), p.y + 0.5, p.z + nz * side * (halfShoulder + 0.3));
  }

  return { mesh, curve, samples, dashes, posts };
}

function buildSnowRange() {
  const rand = rand32(5501);
  const geos = [];
  const rockLow = new THREE.Color(0x5f6378);
  const rockHigh = new THREE.Color(0x9c8f9e);
  const snow = new THREE.Color(0xf3f6fb);
  const snowShade = new THREE.Color(0xbfd0e4);

  for (let i = 0; i < 46; i++) {
    const angle = -Math.PI * 1.04 + (i / 46) * Math.PI * 2.08;
    const radius = 2550 + rand() * 1500;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius - 240;
    const height = 300 + rand() * 430;
    const baseR = 300 + rand() * 360;
    const geo = new THREE.ConeGeometry(baseR, height, 9, 6, false);
    const p = geo.attributes.position;
    const colors = new Float32Array(p.count * 3);
    const snowline = 0.48 + rand() * 0.14;
    for (let v = 0; v < p.count; v++) {
      const px = p.getX(v);
      const py = p.getY(v);
      const pz = p.getZ(v);
      const t = (py + height * 0.5) / height;
      const n = fbm(px * 0.004 + i * 9.3, pz * 0.004 - i * 2.7, 3) - 0.5;
      const k = 1 + n * 0.36;
      p.setX(v, px * k);
      p.setZ(v, pz * k);
      p.setY(v, py + n * height * 0.08);
      const c = new THREE.Color();
      if (t > snowline + n * 0.12) {
        c.copy(snow).lerp(snowShade, smoothstep(1.0, snowline, t) * 0.34);
      } else {
        c.copy(rockLow).lerp(rockHigh, smoothstep(0, snowline, t));
      }
      colors[v * 3] = c.r;
      colors[v * 3 + 1] = c.g;
      colors[v * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    geo.translate(x, 26 + height * 0.5, z);
    geos.push(geo);
  }

  const mesh = new THREE.Mesh(mergeGeometryList(geos), snowMat);
  mesh.name = 'qilian-snow-range';
  mesh.receiveShadow = false;
  mesh.castShadow = false;
  return mesh;
}

function buildDistantRidges() {
  const rand = rand32(8831);
  const geos = [];
  for (let i = 0; i < 34; i++) {
    const angle = (i / 34) * Math.PI * 2 + rand() * 0.08;
    const radius = 1650 + rand() * 850;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius - 180;
    const height = 150 + rand() * 250;
    const baseR = 260 + rand() * 260;
    const geo = new THREE.ConeGeometry(baseR, height, 8, 5, false);
    const p = geo.attributes.position;
    const colors = new Float32Array(p.count * 3);
    const color = new THREE.Color();
    for (let v = 0; v < p.count; v++) {
      const px = p.getX(v);
      const py = p.getY(v);
      const t = (py + height * 0.5) / height;
      const n = fbm(px * 0.006 + i * 5.7, p.getZ(v) * 0.006 - i * 1.3, 3) - 0.5;
      p.setX(v, px * (1 + n * 0.42));
      p.setZ(v, p.getZ(v) * (1 + n * 0.42));
      strataColor(80 + t * 220, x + px, z + p.getZ(v), color, i * 0.07);
      color.multiplyScalar(0.7 + t * 0.15);
      colors[v * 3] = color.r;
      colors[v * 3 + 1] = color.g;
      colors[v * 3 + 2] = color.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    geo.translate(x, 8 + height * 0.5, z);
    geos.push(geo);
  }
  const mesh = new THREE.Mesh(mergeGeometryList(geos), strataFlatMat);
  mesh.name = 'distant-painted-ridges';
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return mesh;
}

function personGeometry() {
  const parts = [];
  pushBox(parts, 0.16, 0.72, 0.19, -0.12, 0.36, 0, 0, 0x303847);
  pushBox(parts, 0.16, 0.72, 0.19, 0.12, 0.36, 0, 0, 0x303847);
  pushBox(parts, 0.44, 0.64, 0.28, 0, 1.04, 0, 0, 0xf1e9d8);
  pushBox(parts, 0.3, 0.42, 0.18, 0, 1.12, 0.2, 0, 0x7b4a2b);
  const head = new THREE.IcosahedronGeometry(0.16, 1);
  head.translate(0, 1.53, 0);
  colorGeo(head, 0xd7a178);
  parts.push(head);
  pushCyl(parts, 0.2, 0.22, 0.08, 8, 0, 1.66, 0, 0xe8d7b8);
  return mergeGeometryList(parts);
}

function busGeometry() {
  const parts = [];
  pushBox(parts, 7.4, 2.6, 2.7, 0, 1.9, 0, 0, 0xf2ede2);
  pushBox(parts, 7.5, 0.95, 2.76, 0, 2.5, 0, 0, 0x2c3d48);
  pushBox(parts, 6.8, 0.35, 2.62, 0, 0.66, 0, 0, 0x9a4b32);
  pushBox(parts, 1.1, 0.9, 2.78, -2.6, 1.35, 0, 0, 0x2c3d48);
  pushBox(parts, 1.1, 0.9, 2.78, 2.6, 1.35, 0, 0, 0x2c3d48);
  for (const wx of [-2.3, 2.3]) {
    for (const wz of [-1.28, 1.28]) {
      const wheel = new THREE.CylinderGeometry(0.48, 0.48, 0.3, 10);
      wheel.rotateX(Math.PI * 0.5);
      wheel.translate(wx, 0.52, wz);
      colorGeo(wheel, 0x1c1b1a);
      parts.push(wheel);
    }
  }
  return mergeGeometryList(parts);
}

function createPeople(platformSpecs) {
  const rand = rand32(7711);
  const geo = personGeometry();
  const count = 36;
  const mesh = new THREE.InstancedMesh(geo, personMat, count);
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  const tints = [0xffffff, 0xf3cfa3, 0xd9e7ee, 0xf0c6ba, 0xcfd9b3];
  let n = 0;
  for (const pl of platformSpecs) {
    const num = Math.round(9 + pl.r * 0.7);
    for (let i = 0; i < num && n < count; i++) {
      const a = rand() * Math.PI * 2;
      const d = 1.2 + rand() * (pl.r - 2.2);
      dummy.position.set(pl.x + Math.cos(a) * d, pl.y + 0.44, pl.z + Math.sin(a) * d);
      dummy.rotation.set(0, rand() * Math.PI * 2, 0);
      dummy.scale.setScalar(0.92 + rand() * 0.22);
      dummy.updateMatrix();
      mesh.setMatrixAt(n, dummy.matrix);
      color.setHex(tints[n % tints.length]);
      mesh.setColorAt(n, color);
      n++;
    }
  }
  for (let i = 0; i < 10 && n < count; i++) {
    const idx = Math.floor(trailSamples.length * (0.16 + (i / 10) * 0.44));
    const s = trailSamples[Math.min(trailSamples.length - 1, idx)];
    const side = i % 2 ? 1 : -1;
    dummy.position.set(s.x + (s.nx || 0) * side * 0.9, s.y + 0.44, s.z + (s.nz || 1) * side * 0.9);
    dummy.rotation.set(0, rand() * Math.PI * 2, 0);
    dummy.scale.setScalar(0.95 + rand() * 0.18);
    dummy.updateMatrix();
    mesh.setMatrixAt(n, dummy.matrix);
    color.setHex(tints[n % tints.length]);
    mesh.setColorAt(n, color);
    n++;
  }
  mesh.count = n;
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = 'instanced-tourists';
  return mesh;
}

function createRocks(anchors) {
  const rand = rand32(6177);
  const geo = new THREE.DodecahedronGeometry(1, 0);
  const count = 150;
  const mesh = new THREE.InstancedMesh(geo, rockMat, count);
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  const palette = [0x9c4b32, 0xc0683a, 0xb6814e, 0x7d3f2e, 0xd0955f, 0x8a5b45];
  for (let i = 0; i < count; i++) {
    let x;
    let z;
    if (i < 110 && anchors.length) {
      const a = anchors[i % anchors.length];
      const ang = rand() * Math.PI * 2;
      const d = a.r * (0.9 + rand() * 0.55);
      x = a.x + Math.cos(ang) * d;
      z = a.z + Math.sin(ang) * d;
    } else {
      x = (rand() - 0.5) * 1650;
      z = -120 + (rand() - 0.5) * 1200;
    }
    const size = 0.6 + rand() * 2.4;
    dummy.position.set(x, heightAt(x, z) + size * 0.25, z);
    dummy.rotation.set(rand() * 0.6, rand() * Math.PI * 2, rand() * 0.5);
    dummy.scale.set(size * (0.8 + rand() * 0.5), size * (0.5 + rand() * 0.5), size * (0.8 + rand() * 0.5));
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    color.setHex(palette[i % palette.length]);
    color.multiplyScalar(0.82 + rand() * 0.3);
    mesh.setColorAt(i, color);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = 'instanced-eroded-rocks';
  return mesh;
}

function createShrubs() {
  const rand = rand32(3191);
  const geo = new THREE.IcosahedronGeometry(1, 0);
  const count = 260;
  const mesh = new THREE.InstancedMesh(geo, shrubMat, count);
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  const palette = [0x707a43, 0x5c6a3b, 0x8a8a52, 0x4d5e38, 0x9c8f5f];
  let n = 0;
  for (let attempt = 0; attempt < 1200 && n < count; attempt++) {
    const x = (rand() - 0.5) * 1800;
    const z = -120 + (rand() - 0.5) * 1300;
    const y = heightAt(x, z);
    if (y > 92 || y < 3) continue;
    const s = 0.5 + rand() * 1.25;
    dummy.position.set(x, y + s * 0.26, z);
    dummy.rotation.set(0, rand() * Math.PI * 2, 0);
    dummy.scale.set(s * (0.9 + rand() * 0.5), s * 0.45, s * (0.9 + rand() * 0.5));
    dummy.updateMatrix();
    mesh.setMatrixAt(n, dummy.matrix);
    color.setHex(palette[n % palette.length]);
    color.multiplyScalar(0.85 + rand() * 0.3);
    mesh.setColorAt(n, color);
    n++;
  }
  mesh.count = n;
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = 'instanced-desert-shrubs';
  return mesh;
}
function balloonEnvelope(R, H, seed) {
  const rand = rand32(seed);
  const gores = 20;
  const rows = 24;
  const positions = [];
  const colors = [];
  const indices = [];
  const color = new THREE.Color();
  const tint = 0.9 + rand() * 0.2;

  for (let i = 0; i <= rows; i++) {
    const v = i / rows;
    const profile = Math.sin(Math.PI * Math.pow(v, 0.82));
    const radius = R * (0.08 + 0.92 * profile);
    const y = (v - 0.5) * H;
    for (let j = 0; j < gores; j++) {
      const a = (j / gores) * Math.PI * 2;
      positions.push(Math.cos(a) * radius, y, Math.sin(a) * radius);
      const band = Math.floor(v * 5.5);
      const base = STRATA[(j * 3 + band * 5 + seed) % STRATA.length];
      color.copy(base).multiplyScalar(tint * (0.9 + Math.sin(v * Math.PI) * 0.18));
      colors.push(color.r, color.g, color.b);
    }
  }
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < gores; j++) {
      const k = (j + 1) % gores;
      const a = i * gores + j;
      const b = i * gores + k;
      const c = (i + 1) * gores + k;
      const d = (i + 1) * gores + j;
      indices.push(a, b, c, a, c, d);
    }
  }
  const top = positions.length / 3;
  positions.push(0, H * 0.5 + 0.12, 0);
  colors.push(0.95, 0.9, 0.8);
  const bottom = positions.length / 3;
  positions.push(0, -H * 0.5 - 0.12, 0);
  colors.push(0.35, 0.16, 0.12);
  const topStart = rows * gores;
  for (let j = 0; j < gores; j++) {
    const k = (j + 1) % gores;
    indices.push(topStart + j, topStart + k, top);
    indices.push(j, bottom, k);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function createBalloon(scale, seed, x, y, z) {
  const group = new THREE.Group();
  group.name = 'hot-air-balloon';
  const envMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.72,
    metalness: 0.05,
    side: THREE.DoubleSide,
  });
  const env = new THREE.Mesh(balloonEnvelope(1, 1.32, seed), envMat);
  env.castShadow = true;
  env.receiveShadow = false;
  group.add(env);

  const rig = [];
  pushBox(rig, 0.74, 0.5, 0.62, 0, -1.23, 0, 0, 0x8a5a32);
  pushBox(rig, 0.82, 0.1, 0.7, 0, -0.94, 0, 0, 0x4b2f1b);
  for (const [ox, oz] of [[-0.32, -0.27], [0.32, -0.27], [0.32, 0.27], [-0.32, 0.27]]) {
    const rope = segmentGeo(ox * 0.7, -0.61, oz * 0.7, ox, -0.96, oz, 0.012, 0.012, 3);
    colorGeo(rope, 0x3a2a1c);
    rig.push(rope);
  }
  const rigMesh = new THREE.Mesh(mergeGeometryList(rig), busMat);
  rigMesh.castShadow = true;
  group.add(rigMesh);

  const burner = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeGlowTexture(),
    color: 0xffb45c,
    transparent: true,
    opacity: 0.65,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
  }));
  burner.position.set(0, -0.88, 0);
  burner.scale.set(1.1, 1.1, 1);
  group.add(burner);

  group.position.set(x, y, z);
  group.scale.setScalar(scale);
  group.userData.base = new THREE.Vector3(x, y, z);
  group.userData.phase = seed * 1.7;
  return group;
}

function makeFlags(platformSpec) {
  const root = new THREE.Group();
  root.name = 'rainbow-flags';
  const mats = [];
  const poles = [];
  const colors = [0xd93f30, 0xef8a2e, 0xf1c84b, 0x4f9d86, 0x4d78b5, 0xd05a84];
  const count = 7;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + 0.18;
    const px = platformSpec.x + Math.cos(a) * (platformSpec.r - 0.5);
    const pz = platformSpec.z + Math.sin(a) * (platformSpec.r - 0.5);
    const py = platformSpec.y + 0.55;
    pushCyl(poles, 0.06, 0.08, 3.6, 5, px, py + 1.9, pz);
    const geo = new THREE.PlaneGeometry(3.6, 2.25, 16, 8);
    geo.translate(1.8, 0, 0);
    const phase = new Float32Array(geo.attributes.position.count).fill(i * 1.37 + 0.6);
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(colors[i % colors.length]) },
      },
      side: THREE.DoubleSide,
      vertexShader: `
        attribute float aPhase;
        uniform float uTime;
        varying vec2 vUv;
        void main() {
          vec3 p = position;
          float w = clamp(p.x / 3.6, 0.0, 1.0);
          p.z += sin(p.x * 2.1 - uTime * 3.4 + aPhase) * (0.08 + 0.34 * w);
          p.z += sin(p.y * 2.6 + uTime * 2.1 + aPhase) * 0.06 * w;
          p.y += sin(p.x * 1.4 - uTime * 2.2 + aPhase) * 0.07 * w;
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying vec2 vUv;
        void main() {
          vec3 col = uColor * (0.68 + vUv.y * 0.46);
          col *= 0.9 + sin(vUv.x * 18.0) * 0.04;
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(px, py + 3.2, pz);
    mesh.rotation.y = -a + Math.PI * 0.5;
    mesh.castShadow = true;
    root.add(mesh);
    mats.push(mat);
  }
  const poleMesh = new THREE.Mesh(mergeGeometryList(poles), railMat);
  poleMesh.castShadow = true;
  root.add(poleMesh);
  return { group: root, mats };
}
function createCloudLayer(root) {
  const rand = rand32(2207);
  const clouds = [];
  const defs = [
    [-680, 168, -180, 660, 150], [360, 178, -280, 760, 165],
    [-120, 152, 260, 600, 130], [760, 192, 90, 720, 150],
    [-460, 206, -520, 820, 170], [120, 220, -680, 900, 180],
    [420, 158, 380, 640, 135], [-820, 185, 320, 700, 150],
    [80, 200, -60, 520, 120], [610, 215, -430, 700, 150],
  ];
  for (let i = 0; i < defs.length; i++) {
    const d = defs[i];
    const mat = new THREE.SpriteMaterial({
      map: sharedTextures.cloudMap,
      color: i % 3 === 0 ? 0xffd9b8 : 0xf7ece2,
      transparent: true,
      opacity: 0.15 + rand() * 0.13,
      depthWrite: false,
      depthTest: true,
      fog: true,
    });
    const spr = new THREE.Sprite(mat);
    spr.position.set(d[0], d[1], d[2]);
    spr.scale.set(d[3], d[4], 1);
    spr.renderOrder = 2;
    spr.userData.baseX = d[0];
    spr.userData.baseY = d[1];
    spr.userData.drift = 12 + rand() * 22;
    spr.userData.phase = rand() * Math.PI * 2;
    root.add(spr);
    clouds.push(spr);
  }

  const mist = [];
  for (let i = 0; i < 7; i++) {
    const mat = new THREE.SpriteMaterial({
      map: sharedTextures.mistMap,
      color: i % 2 ? 0xffd9c0 : 0xe8d8cf,
      transparent: true,
      opacity: 0.09 + rand() * 0.07,
      depthWrite: false,
      depthTest: true,
      fog: true,
    });
    const spr = new THREE.Sprite(mat);
    const x = -720 + rand() * 1440;
    const z = -360 + rand() * 720;
    spr.position.set(x, 20 + rand() * 28, z);
    spr.scale.set(420 + rand() * 360, 90 + rand() * 60, 1);
    spr.renderOrder = 3;
    spr.userData.baseX = x;
    spr.userData.baseY = spr.position.y;
    spr.userData.drift = 8 + rand() * 16;
    spr.userData.phase = rand() * Math.PI * 2;
    root.add(spr);
    mist.push(spr);
  }
  return { clouds, mist };
}

function makeLabel(title, subtitle, x, y, z, scale = 1) {
  const tex = makeLabelTexture(title, subtitle);
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: true,
    depthWrite: false,
    opacity: 0.88,
    toneMapped: true,
  });
  const spr = new THREE.Sprite(mat);
  spr.scale.set(34 * scale, 10.6 * scale, 1);
  spr.position.set(x, y, z);
  spr.renderOrder = 6;
  return spr;
}

function finishBucket(bucket, root, name) {
  for (const [mat, list] of bucket) {
    const geo = mergeGeometryList(list);
    if (!geo) continue;
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = !mat.userData?.noShadow;
    mesh.receiveShadow = true;
    mesh.name = name;
    root.add(mesh);
  }
}

export function createZhangye() {
  const root = new THREE.Group();
  root.name = 'zhangye-signature-overlay';
  const bucket = new Map();
  const rand = rand32(90210);

  const hillSpecs = [
    { x: -40, z: -215, height: 156, rBottom: 90, rTop: 22, seed: 11, seg: 96, rings: 40, sx: 2.6, sz: 0.58, sink: 14 },
    { x: 138, z: -286, height: 126, rBottom: 70, rTop: 18, seed: 17, seg: 88, rings: 36, sx: 2.1, sz: 0.56, sink: 12 },
    { x: -256, z: -326, height: 138, rBottom: 78, rTop: 20, seed: 19, seg: 84, rings: 36, sx: 1.9, sz: 0.62, sink: 12 },
    { x: -342, z: -138, height: 108, rBottom: 56, rTop: 16, seed: 23, seg: 72, rings: 32, sx: 1.18, sz: 0.94, sink: 11 },
    { x: -478, z: -256, height: 128, rBottom: 68, rTop: 18, seed: 29, seg: 76, rings: 34, sx: 1.25, sz: 0.82, sink: 12 },
    { x: 356, z: -196, height: 116, rBottom: 60, rTop: 15, seed: 31, seg: 76, rings: 32, sx: 1.2, sz: 0.9, sink: 10 },
    { x: 468, z: -328, height: 138, rBottom: 72, rTop: 18, seed: 37, seg: 78, rings: 34, sx: 1.35, sz: 0.8, sink: 12 },
    { x: 258, z: -430, height: 146, rBottom: 80, rTop: 20, seed: 41, seg: 82, rings: 36, sx: 1.6, sz: 0.7, sink: 13 },
    { x: -6, z: -476, height: 158, rBottom: 94, rTop: 24, seed: 43, seg: 88, rings: 38, sx: 1.9, sz: 0.72, sink: 14 },
    { x: 232, z: 10, height: 66, rBottom: 31, rTop: 9, seed: 47, seg: 56, rings: 24, sx: 1.1, sz: 1.0, sink: 8 },
    { x: -148, z: -58, height: 76, rBottom: 35, rTop: 10, seed: 53, seg: 58, rings: 26, sx: 1.15, sz: 0.9, sink: 9 },
    { x: 54, z: -92, height: 62, rBottom: 27, rTop: 8, seed: 59, seg: 52, rings: 22, sx: 1.2, sz: 0.82, sink: 7 },
  ];

  const hillTops = [];
  for (const spec of hillSpecs) {
    const res = paintedHill(spec);
    addGeo(bucket, res.geo, strataMat);
    hillTops.push({ spec, res });
  }

  const finStart = { x: 172, z: -268 };
  const finEnd = { x: 372, z: -150 };
  const finYaw = Math.atan2(finEnd.x - finStart.x, finEnd.z - finStart.z);
  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    const x = finStart.x + (finEnd.x - finStart.x) * t + (rand() - 0.5) * 16;
    const z = finStart.z + (finEnd.z - finStart.z) * t + (rand() - 0.5) * 16;
    const res = paintedFin({
      x, z,
      height: 66 + rand() * 58 + Math.sin(t * Math.PI) * 24,
      width: 30 + rand() * 26,
      thick: 3.2 + rand() * 3.6,
      yaw: finYaw + 0.18 + (rand() - 0.5) * 0.3,
      seed: 300 + i * 13,
      sink: 8,
      lean: (rand() - 0.5) * 8,
    });
    addGeo(bucket, res.geo, strataMat);
  }

  const road = makeRoad();
  const snow = buildSnowRange();
  root.add(snow);
  root.add(buildDistantRidges());

  const boardwalk = makeBoardwalk();
  const addMesh = (geo, mat, name) => {
    if (!geo) return null;
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = name;
    root.add(mesh);
    return mesh;
  };
  addMesh(mergeGeometryList(boardwalk.timber), timberMat, 'boardwalk-stringers');
  addMesh(mergeGeometryList(boardwalk.planks), plankMat, 'boardwalk-deck');
  addMesh(mergeGeometryList(boardwalk.rails), railMat, 'boardwalk-rails');
  addMesh(mergeGeometryList(boardwalk.supports), timberMat, 'boardwalk-posts');

  const platformSpecs = [
    { ...platforms[0], y: platforms[0].y + 0.1 },
    { ...platforms[1], y: platforms[1].y + 0.1 },
  ];
  for (const p of platformSpecs) {
    const parts = makePlatform(p);
    addMesh(mergeGeometryList(parts.deck), plankMat, 'platform-decks');
    addMesh(mergeGeometryList(parts.posts), timberMat, 'platform-posts');
    addMesh(mergeGeometryList(parts.rails), railMat, 'platform-rails');
    addMesh(mergeGeometryList(parts.roofs), timberMat, 'platform-canopies');
  }

  root.add(road.mesh);
  const dashMesh = new THREE.Mesh(mergeGeometryList(road.dashes), roadLineMat);
  dashMesh.receiveShadow = true;
  root.add(dashMesh);
  const roadPosts = new THREE.Mesh(mergeGeometryList(road.posts), stoneMat);
  roadPosts.castShadow = true;
  root.add(roadPosts);

  const people = createPeople(platformSpecs);
  root.add(people);
  const anchors = hillSpecs.map((s) => ({ x: s.x, z: s.z, r: s.rBottom }));
  root.add(createRocks(anchors));
  root.add(createShrubs());
  finishBucket(bucket, root, 'merged-painted-hills');

  const balloons = [
    createBalloon(17, 3, 258, 222, -18),
    createBalloon(10.5, 7, -318, 248, -252),
  ];
  balloons.forEach((b) => root.add(b));

  const flags = makeFlags(platformSpecs[0]);
  root.add(flags.group);

  const cloudLayer = createCloudLayer(root);

  const busMesh = new THREE.InstancedMesh(busGeometry(), busMat, 3);
  const busDummy = new THREE.Object3D();
  const busColor = new THREE.Color();
  const busData = [
    { u: 0.12, speed: 0.012 },
    { u: 0.46, speed: 0.009 },
    { u: 0.78, speed: 0.011 },
  ];
  const busTints = [0xffffff, 0xeef2e8, 0xffe7cf];
  busData.forEach((b, i) => {
    busColor.setHex(busTints[i]);
    busMesh.setColorAt(i, busColor);
    const p = road.curve.getPointAt(b.u);
    const tan = road.curve.getTangentAt(b.u);
    busDummy.position.set(p.x, p.y + 1.05, p.z);
    busDummy.rotation.set(0, Math.atan2(-tan.z, tan.x), 0);
    busDummy.scale.setScalar(1);
    busDummy.updateMatrix();
    busMesh.setMatrixAt(i, busDummy.matrix);
  });
  busMesh.instanceMatrix.needsUpdate = true;
  busMesh.castShadow = true;
  busMesh.receiveShadow = true;
  busMesh.name = 'instanced-shuttle-buses';
  root.add(busMesh);

  const labels = [];
  const qicaiTop = hillTops[0].res.topY;
  labels.push(makeLabel('七彩屏', 'SEVEN-COLOUR SCREEN', -40, qicaiTop + 24, -215, 1.05));
  labels.push(makeLabel('刀山火海', 'DAO MOUNTAIN · FIRE SEA', 272, 196, -210, 0.95));
  labels.push(makeLabel('七彩栈道', 'RAINBOW BOARDWALK', platformSpecs[0].x + 2, platformSpecs[0].y + 11, platformSpecs[0].z, 0.82));
  labels.forEach((l) => root.add(l));

  const lanternTex = makeGlowTexture();
  const lanternMat = new THREE.SpriteMaterial({
    map: lanternTex,
    color: 0xffb85e,
    transparent: true,
    opacity: 0.62,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
  });
  const lanterns = [];
  for (let i = 0; i < 12; i++) {
    const idx = Math.floor(trailSamples.length * (0.13 + i * 0.046));
    const s0 = trailSamples[Math.min(trailSamples.length - 1, idx)];
    const s1 = trailSamples[Math.min(trailSamples.length - 1, idx + 2)];
    const dx = s1.x - s0.x;
    const dz = s1.z - s0.z;
    const len = Math.hypot(dx, dz) || 1;
    const side = i % 2 ? 1 : -1;
    const spr = new THREE.Sprite(lanternMat);
    spr.position.set(s0.x - (dz / len) * side * 2.3, s0.y + 2.15, s0.z + (dx / len) * side * 2.3);
    spr.scale.set(1.5, 1.5, 1);
    spr.renderOrder = 5;
    root.add(spr);
    lanterns.push(spr);
  }
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI * 0.5 + 0.4;
    const spr = new THREE.Sprite(lanternMat);
    spr.position.set(platformSpecs[0].x + Math.cos(a) * 7.2, platformSpecs[0].y + 4.9, platformSpecs[0].z + Math.sin(a) * 7.2);
    spr.scale.set(2.2, 2.2, 1);
    spr.renderOrder = 5;
    root.add(spr);
    lanterns.push(spr);
  }

  const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeGlowTexture(),
    color: 0xffc37c,
    transparent: true,
    opacity: 0.18,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
  }));
  sunGlow.position.set(-960, 320, 440);
  sunGlow.scale.set(620, 350, 1);
  sunGlow.renderOrder = 1;
  root.add(sunGlow);

  const views = {
    overview: { p: [430, 270, 630], t: [-5, 142, -238] },
    qicai: { p: [112, 152, 286], t: [-32, 122, -215] },
    daoshan: { p: [432, 176, 176], t: [246, 132, -238] },
    platform: { p: [230, 145, 220], t: [122, 116, 54] },
    dusk: { p: [652, 214, 548], t: [-16, 120, -226] },
  };

  const notes = {
    overview: ['张掖七彩丹霞 · 甘肃·彩虹山', '祁连山下的彩色丘陵层层铺展，赤、橙、黄、白、青灰在山脊上交织，夕阳把沟壑照成燃烧的纹路'],
    qicai: ['七彩屏', '如展开的屏风，红、橙、金、白、紫灰的岩层向同一方向倾斜，风雨在坡面刻出细密的沟槽'],
    daoshan: ['刀山火海', '刃脊状的山梁一排排刺向天空，赤红与橙金在低角度光线里像火光流动'],
    platform: ['七彩栈道 · 观景台', '木栈道沿山脊蜿蜒，观景台悬在彩色丘陵之上，脚下是层叠的色带与远处的雪峰'],
    dusk: ['暮色彩虹山', '太阳贴近祁连雪线，山体由金红转为紫褐，热气球停在最后的暖光里'],
  };

  const tmpPos = new THREE.Vector3();
  function update(elapsed, dt = 0.016) {
    flags.mats.forEach((mat) => {
      mat.uniforms.uTime.value = elapsed;
    });

    for (const c of cloudLayer.clouds) {
      c.position.x = c.userData.baseX + Math.sin(elapsed * 0.015 + c.userData.phase) * c.userData.drift;
      c.position.y = c.userData.baseY + Math.sin(elapsed * 0.11 + c.userData.phase) * 2.4;
    }
    for (const m of cloudLayer.mist) {
      m.position.x = m.userData.baseX + Math.sin(elapsed * 0.022 + m.userData.phase) * m.userData.drift;
      m.position.y = m.userData.baseY + Math.sin(elapsed * 0.15 + m.userData.phase) * 1.5;
    }

    if (lanternMat) lanternMat.opacity = 0.56 + Math.sin(elapsed * 2.3) * 0.05;

    for (const b of balloons) {
      const base = b.userData.base;
      const ph = b.userData.phase;
      b.position.set(
        base.x + Math.sin(elapsed * 0.085 + ph) * 12,
        base.y + Math.sin(elapsed * 0.5 + ph) * 2.8,
        base.z + Math.cos(elapsed * 0.065 + ph) * 9
      );
      b.rotation.y = elapsed * 0.055 + ph;
      b.rotation.z = Math.sin(elapsed * 0.32 + ph) * 0.025;
    }

    for (let i = 0; i < busData.length; i++) {
      const b = busData[i];
      b.u = (b.u + dt * b.speed) % 1;
      road.curve.getPointAt(b.u, tmpPos);
      const tan = road.curve.getTangentAt(b.u);
      busDummy.position.set(tmpPos.x, tmpPos.y + 1.05, tmpPos.z);
      busDummy.rotation.set(0, Math.atan2(-tan.z, tan.x), 0);
      busDummy.updateMatrix();
      busMesh.setMatrixAt(i, busDummy.matrix);
    }
    busMesh.instanceMatrix.needsUpdate = true;
  }

  update(0, 0);

  return {
    group: root,
    views,
    notes,
    labels,
    road,
    balloons,
    flags,
    lanterns,
    clouds: cloudLayer,
    busMesh,
    hillTops,
    update,
  };
}
