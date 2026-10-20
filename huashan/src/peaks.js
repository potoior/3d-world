import * as THREE from 'three';
import { mats } from './materials.js';
import { heightAt, trailSamples, platforms, smoothstep } from './terrain.js';
import { mergeGeometryList } from './geometry.js';

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

function colorize(geo, base, variance, seed) {
  const p = geo.attributes.position;
  const colors = new Float32Array(p.count * 3);
  const c = new THREE.Color();
  const rand = mulberry32(seed);
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    const n = 0.84 + rand() * variance;
    c.copy(base).multiplyScalar(n);
    const band = Math.sin(y * 1.7 + p.getX(i) * 0.2) * 0.06;
    colors[i * 3] = Math.max(0, c.r + band);
    colors[i * 3 + 1] = Math.max(0, c.g + band);
    colors[i * 3 + 2] = Math.max(0, c.b + band);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo;
}

function spireGeo(cx, cz, baseY, topY, rBottom, rTop, seed, seg = 10, rings = 8) {
  const h = Math.max(4, topY - baseY);
  const geo = new THREE.CylinderGeometry(rTop, rBottom, h, seg, rings, false);
  const p = geo.attributes.position;
  const rand = mulberry32(seed);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const a = Math.atan2(z, x);
    const k = (y + h * 0.5) / h;
    const wobble = 0.78 + 0.36 * Math.sin(a * 3 + seed * 0.7) + 0.18 * Math.sin(a * 7 - k * 4);
    const notch = 1 - smoothstep(0.36, 0.5, Math.abs(Math.sin(a * 2.5 + seed)) ) * 0.18;
    const radial = wobble * notch;
    p.setX(i, x * radial + Math.sin(k * 7 + a * 2) * rBottom * 0.045);
    p.setZ(i, z * radial + Math.cos(k * 6 - a * 3) * rBottom * 0.045);
    p.setY(i, y + Math.sin(a * 4 + seed) * h * 0.014 + (k > 0.9 ? Math.sin(a * 5 + seed * 2) * h * 0.035 : 0));
  }
  geo.computeVertexNormals();
  geo.translate(cx, baseY + h * 0.5, cz);
  return colorize(geo, new THREE.Color(0xb2a692), 0.2, seed + 9);
}

export const spireSpecs = [
  [-46, -354, 300, 410, 22, 10, 11],
  [-16, -380, 292, 404, 19, 9, 12],
  [-58, -382, 282, 392, 17, 8, 13],
  [-236, -258, 292, 398, 22, 10, 14],
  [-204, -238, 280, 392, 18, 8, 15],
  [140, -300, 282, 382, 19, 8.5, 16],
  [170, -320, 272, 376, 17, 7.5, 17],
  [152, 20, 232, 330, 17, 8, 18],
  [178, 34, 224, 326, 15, 7, 19],
  [44, -166, 252, 356, 16, 7.5, 20],
  [68, -188, 242, 350, 15, 6.5, 21],
  [95, -240, 208, 318, 14, 6, 22],
  [-10, -430, 236, 366, 20, 9, 23],
  [-330, -340, 238, 334, 22, 10, 24],
  [290, -350, 220, 326, 22, 10, 25],
  [100, -420, 194, 292, 15, 6.5, 26],
  [-140, -448, 212, 324, 19, 8.5, 27],
  [430, -390, 188, 330, 26, 11, 28],
  [-460, -430, 196, 344, 26, 11, 29],
  [-540, -170, 176, 300, 20, 8.5, 30],
  [560, -220, 170, 298, 20, 8.5, 31],
  [640, -790, 178, 314, 28, 12, 32],
  [-670, -720, 172, 308, 28, 12, 33],
  [30, -930, 190, 330, 32, 14, 34],
];

export const plankRoute = [
  [74, 332, -300],
  [70, 332, -314],
  [68, 332, -328],
  [64, 332, -342],
  [60, 332, -356],
  [56, 332, -370],
  [52, 332, -384],
  [48, 332, -398],
  [44, 332, -410],
];

export const chainRoute = {
  top: [142, -256],
  bottom: [110, -222],
};

export function createGraniteOutcrops() {
  const group = new THREE.Group();
  group.name = 'granite-cliffs';
  const buckets = [new THREE.Color(0xb3a894), new THREE.Color(0x9b9182), new THREE.Color(0xc6baa6)];
  const lists = [[], [], []];
  spireSpecs.forEach((s, i) => {
    const baseY = Math.max(12, heightAt(s[0], s[1]) - 12);
    const topY = s[3];
    const geo = spireGeo(s[0], s[1], baseY, topY, s[4], s[5], s[6]);
    lists[i % 3].push(geo);
  });
  const materials = [mats.granite, mats.graniteDark, mats.graniteLight];
  lists.forEach((list, i) => {
    if (!list.length) return;
    const geo = mergeGeometryList(list);
    const mesh = new THREE.Mesh(geo, materials[i]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  });
  return group;
}

export function createGongbeiStone() {
  const group = new THREE.Group();
  group.name = 'huashan-sentinel-rock';
  const x = -42;
  const z = -292;
  const top = heightAt(x, z);
  const pedestal = new THREE.CylinderGeometry(4.2, 6.8, 8, 8, 2);
  pedestal.translate(x, top + 2.4, z);
  const rock = new THREE.DodecahedronGeometry(5.4, 1);
  const p = rock.attributes.position;
  const rand = mulberry32(661);
  for (let i = 0; i < p.count; i++) {
    const px = p.getX(i);
    const py = p.getY(i);
    const pz = p.getZ(i);
    const n = 0.78 + rand() * 0.34;
    p.setXYZ(i, px * n * 1.55, py * n * 1.15, pz * n * 0.62);
  }
  rock.computeVertexNormals();
  rock.rotateY(0.72);
  rock.rotateZ(0.34);
  rock.rotateX(-0.18);
  rock.translate(x + 1.4, top + 11.4, z + 0.6);
  colorize(pedestal, new THREE.Color(0xa9a08f), 0.18, 662);
  colorize(rock, new THREE.Color(0xbfb4a1), 0.22, 663);
  const m1 = new THREE.Mesh(mergeGeometryList([pedestal]), mats.graniteDark);
  const m2 = new THREE.Mesh(mergeGeometryList([rock]), mats.graniteLight);
  m1.castShadow = m2.castShadow = true;
  m1.receiveShadow = m2.receiveShadow = true;
  group.add(m1, m2);
  return group;
}

function segmentGeo(ax, ay, az, bx, by, bz, ra, rb, seg = 6) {
  const dx = bx - ax;
  const dy = by - ay;
  const dz = bz - az;
  const len = Math.hypot(dx, dy, dz);
  const geo = new THREE.CylinderGeometry(rb, ra, len, seg, 1, false);
  const q = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(dx / len, dy / len, dz / len)
  );
  geo.applyQuaternion(q);
  geo.translate((ax + bx) * 0.5, (ay + by) * 0.5, (az + bz) * 0.5);
  return geo;
}

function canopyBlob(bucket, x, y, z, r, rand) {
  const geo = new THREE.IcosahedronGeometry(1, 1);
  geo.scale(r * (0.85 + rand() * 0.35), r * (0.2 + rand() * 0.12), r * (0.8 + rand() * 0.35));
  geo.rotateY(rand() * 6.2);
  geo.translate(x + (rand() - 0.5) * r * 0.5, y, z + (rand() - 0.5) * r * 0.5);
  bucket.push(geo);
}

export function createAncientPine() {
  const group = new THREE.Group();
  group.name = 'huashan-ancient-pine';
  const bx = 196;
  const bz = 64;
  const by = heightAt(bx, bz) + 0.4;
  const trunk = [];
  const foliage = [];
  const rand = mulberry32(2024);
  const pts = [
    [bx, by, bz],
    [bx + 2.4, by + 5.8, bz + 1.4],
    [bx + 4.6, by + 10.8, bz + 3.4],
    [bx + 7.8, by + 14.6, bz + 5.2],
    [bx + 12.2, by + 16.2, bz + 6.0],
  ];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    trunk.push(segmentGeo(a[0], a[1], a[2], b[0], b[1], b[2], 0.9 - i * 0.16, 0.74 - i * 0.15, 7));
  }
  const branches = [
    [2, 4, 10.2, 5.6, 2.2],
    [3, 16, 14.2, 7.2, 2.8],
    [4, 24, 15.8, 4.0, 3.2],
    [2, 5.6, 8.6, 8.0, 1.9],
  ];
  for (const [from, bx2, by2, bz2, lift] of branches) {
    const a = pts[from];
    trunk.push(segmentGeo(a[0], a[1], a[2], bx + bx2, by + by2, bz + bz2, 0.5, 0.24, 5));
    canopyBlob(foliage, bx + bx2, by + by2 + lift * 0.25, bz + bz2, 3.6 + rand() * 1.1, rand);
    canopyBlob(foliage, bx + bx2 * 0.8, by + by2 + lift * 0.1, bz + bz2 * 0.75, 2.2 + rand() * 0.9, rand);
  }
  for (let i = 0; i < 5; i++) {
    canopyBlob(foliage, bx + 6 + rand() * 7, by + 14.5 + rand() * 3.4, bz + 1 + rand() * 5, 2.4 + rand() * 1.4, rand);
  }
  const trunkMesh = new THREE.Mesh(mergeGeometryList(trunk), mats.trunk);
  const foliageMesh = new THREE.Mesh(mergeGeometryList(foliage), mats.pineDeep);
  trunkMesh.castShadow = foliageMesh.castShadow = true;
  trunkMesh.receiveShadow = foliageMesh.receiveShadow = true;
  group.add(trunkMesh, foliageMesh);
  return group;
}

function pushBox(list, w, h, d, x, y, z, ry = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (ry) g.rotateY(ry);
  g.translate(x, y, z);
  list.push(g);
}

export function createStoneTrail() {
  const group = new THREE.Group();
  group.name = 'huashan-steep-stairway';
  const topPos = [];
  const topUv = [];
  const topCol = [];
  const steps = [];
  const signsStone = [];
  const parapets = [];
  const landings = [];
  const curbs = [];
  const posts = [];
  const rails = [];
  const n = trailSamples.length;
  let dist = 0;
  const base = new THREE.Color(0xc0b7a4);
  const rand = mulberry32(5150);

  for (let i = 0; i < n; i++) {
    const s = trailSamples[i];
    const a = trailSamples[Math.max(0, i - 1)];
    const b = trailSamples[Math.min(n - 1, i + 1)];
    let tx = b.x - a.x;
    let tz = b.z - a.z;
    const len = Math.hypot(tx, tz) || 1;
    tx /= len;
    tz /= len;
    s.tx = tx;
    s.tz = tz;
    s.nx = -tz;
    s.nz = tx;
    s.yaw = Math.atan2(tx, tz);
    if (i > 0) dist += Math.hypot(s.x - trailSamples[i - 1].x, s.z - trailSamples[i - 1].z);
  }

  for (let i = 0; i < n - 1; i++) {
    const a = trailSamples[i];
    const b = trailSamples[i + 1];
    const aw = a.width * 0.5;
    const bw = b.width * 0.5;
    const ay = a.y + 0.14;
    const by = b.y + 0.14;
    const alx = a.x + a.nx * aw, alz = a.z + a.nz * aw;
    const arx = a.x - a.nx * aw, arz = a.z - a.nz * aw;
    const blx = b.x + b.nx * bw, blz = b.z + b.nz * bw;
    const brx = b.x - b.nx * bw, brz = b.z - b.nz * bw;
    const quad = [alx, ay, alz, blx, by, blz, arx, ay, arz, blx, by, blz, brx, by, brz, arx, ay, arz];
    const u0 = dist * 0.3;
    const u1 = (dist + Math.hypot(b.x - a.x, b.z - a.z)) * 0.3;
    const uv = [0, u0, 0, u1, 1, u0, 0, u1, 1, u1, 1, u0];
    for (let k = 0; k < 6; k++) {
      topPos.push(quad[k * 3], quad[k * 3 + 1], quad[k * 3 + 2]);
      topUv.push(uv[k * 2], uv[k * 2 + 1]);
      const shade = 0.88 + rand() * 0.16;
      topCol.push(base.r * shade, base.g * shade, base.b * shade);
    }

    const segLen = Math.hypot(b.x - a.x, b.z - a.z);
    const inStair = a.t > 0.1 && a.t < 0.985;
    const rise = b.y - a.y;
    if (inStair) {
      const w = Math.max(2.9, a.width * 0.96);
      const stepH = 0.2 + Math.min(0.16, Math.abs(rise) * 0.16);
      pushBox(steps, w, stepH, segLen * 1.12 + 0.1, a.x, a.y + stepH * 0.5 - 0.02, a.z, a.yaw);
      if (i % 6 === 0) {
        for (const side of [1, -1]) {
          const ox = a.nx * side * (w * 0.5 + 0.26);
          const oz = a.nz * side * (w * 0.5 + 0.26);
          pushBox(parapets, 0.42, 0.44, segLen * 3.0 + 0.24, a.x + ox, a.y + 0.26, a.z + oz, a.yaw);
        }
      }
      if (i % 30 === 0) {
        pushBox(landings, w + 3.6, 0.26, 4.8, a.x, a.y + 0.02, a.z, a.yaw);
        for (const side of [1, -1]) {
          const ox = a.nx * side * (w * 0.5 - 0.55);
          const oz = a.nz * side * (w * 0.5 - 0.55);
          pushBox(signsStone, 0.9, 0.34, 0.9, a.x + ox, a.y + 0.95, a.z + oz, a.yaw + 0.2);
        }
      }
      if (i % 3 === 0) {
        pushBox(curbs, 0.24, 0.16, segLen * 1.4, a.x - a.nx * (w * 0.5 - 0.42), a.y + 0.23, a.z - a.nz * (w * 0.5 - 0.42), a.yaw);
      }
    } else if (Math.abs(rise) > 0.2) {
      pushBox(steps, a.width + 0.12, 0.16, 0.86, a.x, a.y + 0.08, a.z, a.yaw);
    }

    if (!inStair && i % 2 === 0 && i > 3 && i < n - 3) {
      for (const side of [1, -1]) {
        const w = 0.28;
        const ox = a.nx * side * (aw + 0.08);
        const oz = a.nz * side * (aw + 0.08);
        pushBox(curbs, w, 0.3, 1.7, a.x + ox, a.y + 0.15, a.z + oz, a.yaw);
      }
    }
  }

  for (let i = 4; i < n - 4; i += 4) {
    const s = trailSamples[i];
    const inStair = s.t > 0.1 && s.t < 0.985;
    if (inStair) continue;
    const half = s.width * 0.5 + 0.18;
    for (const side of [1, -1]) {
      const ox = s.nx * side * half;
      const oz = s.nz * side * half;
      const px = s.x + ox;
      const pz = s.z + oz;
      posts.push([px, s.y + 0.62, pz]);
      if (i + 6 < n - 4) {
        const t = trailSamples[i + 6];
        const hx = t.nx * side * (t.width * 0.5 + 0.18);
        const hz = t.nz * side * (t.width * 0.5 + 0.18);
        const mx = (px + t.x + hx) * 0.5;
        const mz = (pz + t.z + hz) * 0.5;
        const my = (s.y + t.y) * 0.5 + 1.12;
        const len = Math.hypot(t.x + hx - px, t.z + hz - pz);
        pushBox(rails, 0.075, 0.075, len, mx, my, mz, Math.atan2(t.x + hx - px, t.z + hz - pz));
        pushBox(rails, 0.06, 0.06, len, mx, my - 0.4, mz, Math.atan2(t.x + hx - px, t.z + hz - pz));
      }
    }
  }

  const postGeo = [];
  for (const p of posts) {
    const g = new THREE.CylinderGeometry(0.075, 0.11, 1.1, 5);
    g.translate(p[0], p[1], p[2]);
    postGeo.push(g);
  }

  const topGeo = new THREE.BufferGeometry();
  topGeo.setAttribute('position', new THREE.Float32BufferAttribute(topPos, 3));
  topGeo.setAttribute('uv', new THREE.Float32BufferAttribute(topUv, 2));
  topGeo.setAttribute('color', new THREE.Float32BufferAttribute(topCol, 3));
  topGeo.computeVertexNormals();
  const topMesh = new THREE.Mesh(topGeo, mats.path);
  topMesh.receiveShadow = true;
  topMesh.castShadow = false;
  group.add(topMesh);

  const add = (list, mat, name) => {
    if (!list.length) return;
    const m = new THREE.Mesh(mergeGeometryList(list), mat);
    m.name = name;
    m.receiveShadow = true;
    m.castShadow = mat !== mats.path;
    group.add(m);
  };
  add(steps, mats.stone, 'stair-treads');
  add(parapets, mats.stoneDark, 'stair-parapets');
  add(landings, mats.deck, 'stair-landings');
  add(curbs, mats.stone, 'trail-curbs');
  add(signsStone, mats.graniteLight, 'stair-sided-stones');
  add(postGeo, mats.wood, 'trail-posts');
  add(rails, mats.wood, 'trail-rails');
  return group;
}

function addLadder(list, cx, cy, cz, height, yaw, lean = 0.12, width = 0.62) {
  const hx = Math.sin(yaw) * lean * height * 0.5;
  const hz = Math.cos(yaw) * lean * height * 0.5;
  for (const side of [-1, 1]) {
    const ox = Math.cos(yaw) * side * width * 0.5;
    const oz = -Math.sin(yaw) * side * width * 0.5;
    list.push(segmentGeo(cx + ox - hx, cy, cz + oz - hz, cx + ox + hx, cy + height, cz + oz + hz, 0.055, 0.055, 5));
  }
  const rungs = Math.max(4, Math.round(height / 0.42));
  for (let i = 1; i < rungs; i++) {
    const k = i / rungs;
    const y = cy + height * k;
    const shift = (k - 0.5) * lean * height;
    const g = new THREE.CylinderGeometry(0.035, 0.035, width + 0.12, 5, 1, false);
    g.rotateZ(Math.PI * 0.5);
    g.rotateY(yaw);
    g.translate(cx + Math.sin(yaw) * shift, y, cz + Math.cos(yaw) * shift);
    list.push(g);
  }
}

export function createPlankWalkway() {
  const group = new THREE.Group();
  group.name = 'changkong-plank-walkway';
  const rand = mulberry32(9631);
  const curve = new THREE.CatmullRomCurve3(
    plankRoute.map((p) => new THREE.Vector3(p[0], p[1], p[2])),
    false,
    'centripetal',
    0.5
  );
  const length = Math.max(1, curve.getLength());
  const boards = [];
  const iron = [];
  const wood = [];
  const wall = [];
  const darkRock = [];
  const stones = [];
  const signs = [];

  const boardCount = Math.max(150, Math.round(length / 0.42));
  for (let i = 0; i < boardCount; i++) {
    const t = (i + 0.5) / boardCount;
    const p = curve.getPointAt(t);
    const tan = curve.getTangentAt(t);
    const yaw = Math.atan2(tan.x, tan.z);
    const nx = tan.z;
    const nz = -tan.x;
    const shade = 0.84 + rand() * 0.22;
    const g = new THREE.BoxGeometry(1.14 * (0.94 + rand() * 0.08), 0.11, 0.36);
    g.rotateY(yaw + (rand() - 0.5) * 0.035);
    g.translate(p.x, p.y - 0.02, p.z);
    boards.push(g);
    if (i % 3 === 0) {
      const b = new THREE.BoxGeometry(0.16, 0.1, 0.2);
      b.rotateY(yaw);
      b.translate(p.x + nx * 0.5, p.y + 0.06, p.z + nz * 0.5);
      stones.push(b);
      const s = new THREE.BoxGeometry(0.13, 0.1, 0.2);
      s.rotateY(yaw);
      s.translate(p.x - nx * 0.5, p.y + 0.06, p.z - nz * 0.5);
      stones.push(s);
    }
    if (i % 9 === 4) {
      const inwardX = -nx;
      const inwardZ = -nz;
      const beam = new THREE.BoxGeometry(2.2, 0.14, 0.18);
      beam.rotateY(yaw);
      beam.translate(p.x + inwardX * 0.34, p.y - 0.15, p.z + inwardZ * 0.34);
      iron.push(beam);
      const braceA = new THREE.Vector3(p.x + inwardX * 1.18, p.y - 0.25, p.z + inwardZ * 1.18);
      const braceB = new THREE.Vector3(p.x + inwardX * 0.6, p.y - 2.35, p.z + inwardZ * 0.6);
      iron.push(segmentGeo(braceA.x, braceA.y, braceA.z, braceB.x, braceB.y, braceB.z, 0.055, 0.045, 5));
      iron.push(segmentGeo(p.x - nx * 0.55, p.y - 0.18, p.z - nz * 0.55, p.x - nx * 0.55, p.y - 2.7, p.z - nz * 0.55, 0.045, 0.035, 5));
      const anchor = new THREE.BoxGeometry(0.32, 0.32, 0.12);
      anchor.rotateY(yaw);
      anchor.translate(p.x + inwardX * 1.38, p.y + 2.25, p.z + inwardZ * 1.38);
      iron.push(anchor);
      const chain = segmentGeo(p.x + inwardX * 1.4, p.y + 2.25, p.z + inwardZ * 1.4, p.x - nx * 0.5, p.y + 1.2, p.z - nz * 0.5, 0.025, 0.025, 4);
      iron.push(chain);
    }
  }

  const postCount = 15;
  const postPts = [];
  for (let i = 0; i < postCount; i++) {
    const t = (i + 0.5) / postCount;
    const p = curve.getPointAt(t);
    const tan = curve.getTangentAt(t);
    const nx = tan.z;
    const nz = -tan.x;
    const yaw = Math.atan2(tan.x, tan.z);
    const px = p.x - nx * 0.53;
    const pz = p.z - nz * 0.53;
    const post = new THREE.CylinderGeometry(0.045, 0.055, 1.32, 5);
    post.translate(px, p.y + 0.62, pz);
    iron.push(post);
    const cap = new THREE.SphereGeometry(0.07, 6, 4);
    cap.translate(px, p.y + 1.28, pz);
    iron.push(cap);
    postPts.push({ x: px, y: p.y, z: pz, t, yaw });
  }
  for (let i = 0; i < postPts.length - 1; i++) {
    const a = postPts[i];
    const b = postPts[i + 1];
    const steps = 4;
    let px = a.x;
    let py = a.y + 1.18;
    let pz = a.z;
    for (let k = 1; k <= steps; k++) {
      const u = k / steps;
      const nx = a.x + (b.x - a.x) * u;
      const nz = a.z + (b.z - a.z) * u;
      const ny = a.y + (b.y - a.y) * u + 1.18 - Math.sin(u * Math.PI) * 0.11;
      iron.push(segmentGeo(px, py, pz, nx, ny, nz, 0.026, 0.026, 4));
      px = nx;
      py = ny;
      pz = nz;
    }
  }

  for (let i = 0; i < plankRoute.length - 1; i++) {
    const a = new THREE.Vector3(...plankRoute[i]);
    const b = new THREE.Vector3(...plankRoute[i + 1]);
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const segLen = Math.hypot(dx, dz);
    const tanX = dx / (segLen || 1);
    const tanZ = dz / (segLen || 1);
    const inwardX = tanZ;
    const inwardZ = -tanX;
    const yaw = Math.atan2(tanX, tanZ);
    const mx = (a.x + b.x) * 0.5;
    const mz = (a.z + b.z) * 0.5;
    const baseY = 204 + rand() * 12;
    const topY = 338 + rand() * 13;
    const h = topY - baseY;
    const slab = new THREE.BoxGeometry(5.2 + rand() * 2.4, h, segLen * 1.42);
    slab.rotateY(yaw + (rand() - 0.5) * 0.08);
    slab.rotateZ((rand() - 0.5) * 0.035);
    slab.translate(mx + inwardX * 3.35, baseY + h * 0.5, mz + inwardZ * 3.35);
    wall.push(slab);
    const plate = new THREE.BoxGeometry(1.7 + rand() * 1.2, 1.6 + rand() * 2.8, 0.8);
    plate.rotateY(yaw);
    plate.translate(mx + inwardX * 1.3, a.y + 0.5 + rand() * 2.6, mz + inwardZ * 1.3);
    darkRock.push(plate);
  }

  const start = curve.getPointAt(0.01);
  const startTan = curve.getTangentAt(0.01);
  const startYaw = Math.atan2(startTan.x, startTan.z);
  const sx = start.x - startTan.z * 1.9;
  const sz = start.z + startTan.x * 1.9;
  pushBox(wood, 0.12, 2.7, 0.12, sx - 1.1, start.y + 1.35, sz, startYaw);
  pushBox(wood, 0.12, 2.7, 0.12, sx + 1.1, start.y + 1.35, sz, startYaw);
  pushBox(signs, 2.8, 1.45, 0.16, sx, start.y + 2.25, sz, startYaw + Math.PI * 0.5);
  addLadder(iron, start.x + 0.9, start.y - 6.0, start.z - 0.2, 6.6, startYaw + Math.PI * 0.5, 0.08, 0.58);

  const add = (list, mat, name) => {
    if (!list.length) return;
    const m = new THREE.Mesh(mergeGeometryList(list), mat);
    m.name = name;
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
  };
  add(boards, mats.plank, 'plank-deck');
  add(iron, mats.iron, 'plank-chains-and-brackets');
  add(wall, mats.graniteDark, 'changkong-cliff-face');
  add(darkRock, mats.rockLight, 'cliff-buttress-stones');
  add(wood, mats.wood, 'plank-signposts');
  add(signs, mats.sign, 'plank-warning-sign');
  return { group, curve, length };
}

export function createChainRoute() {
  const group = new THREE.Group();
  group.name = 'yaozi-chain-route';
  const rand = mulberry32(7744);
  const top = chainRoute.top;
  const bottom = chainRoute.bottom;
  const points = [];
  const count = 30;
  for (let i = 0; i <= count; i++) {
    const u = i / count;
    const bow = Math.sin(u * Math.PI) * 5.5;
    const x = top[0] + (bottom[0] - top[0]) * u + bow;
    const z = top[1] + (bottom[1] - top[1]) * u - bow * 0.35;
    points.push(new THREE.Vector3(x, heightAt(x, z) + 1.15, z));
  }
  const iron = [];
  const posts = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const segLen = Math.hypot(dx, dz);
    const tx = dx / (segLen || 1);
    const tz = dz / (segLen || 1);
    const nx = tz;
    const nz = -tx;
    const yaw = Math.atan2(tx, tz);
    if (i % 2 === 0) {
      const step = new THREE.BoxGeometry(0.86, 0.1, 0.26 + rand() * 0.1);
      step.rotateY(yaw + (rand() - 0.5) * 0.08);
      step.translate(a.x, a.y + 0.18, a.z);
      iron.push(step);
    }
    if (i % 4 === 0) {
      for (const side of [-1, 1]) {
        const post = new THREE.CylinderGeometry(0.036, 0.045, 1.45, 5);
        post.translate(a.x + nx * side * 0.9, a.y + 0.72, a.z + nz * side * 0.9);
        iron.push(post);
      }
      posts.push({ x: a.x, y: a.y, z: a.z, nx, nz });
    }
    for (const side of [-1, 1]) {
      const ox = nx * side * 0.9;
      const oz = nz * side * 0.9;
      const sag = 0.08 + rand() * 0.06;
      const midY = (a.y + b.y) * 0.5 + 1.28 - sag;
      const segA = segmentGeo(a.x + ox, a.y + 1.3, a.z + oz, (a.x + b.x) * 0.5 + ox, midY, (a.z + b.z) * 0.5 + oz, 0.024, 0.024, 4);
      const segB = segmentGeo((a.x + b.x) * 0.5 + ox, midY, (a.z + b.z) * 0.5 + oz, b.x + ox, b.y + 1.3, b.z + oz, 0.024, 0.024, 4);
      iron.push(segA, segB);
    }
  }
  for (const i of [1, count - 2]) {
    const p = points[i];
    const q = points[Math.min(count, i + 4)];
    const yaw = Math.atan2(q.x - p.x, q.z - p.z);
    addLadder(iron, p.x, p.y - 0.2, p.z, 5.2, yaw, 0.05, 0.62);
  }
  const topP = points[0];
  const signPosts = [];
  pushBox(signPosts, 0.14, 2.2, 0.14, topP.x - 1.0, topP.y + 1.1, topP.z + 0.5, 0.2);
  pushBox(signPosts, 0.14, 2.2, 0.14, topP.x + 1.0, topP.y + 1.1, topP.z + 0.5, 0.2);
  pushBox(signPosts, 2.3, 1.1, 0.12, topP.x, topP.y + 1.8, topP.z + 0.55, 0.2);
  const add = (list, mat, name) => {
    if (!list.length) return;
    const m = new THREE.Mesh(mergeGeometryList(list), mat);
    m.name = name;
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
  };
  add(iron, mats.iron, 'chain-route-iron');
  add(signPosts, mats.sign, 'chain-route-sign');
  return { group, points };
}

export function createPlatforms() {
  const group = new THREE.Group();
  group.name = 'viewing-platforms';
  const deck = [];
  const rings = [];
  const posts = [];
  const rails = [];
  platforms.forEach((pl, index) => {
    const disc = new THREE.CylinderGeometry(pl.r, pl.r + 0.7, 0.5, 30, 1, false);
    disc.translate(pl.x, pl.y + 0.03, pl.z);
    colorize(disc, new THREE.Color(0xaeab9f), 0.16, 700 + index);
    deck.push(disc);
    const ring = new THREE.TorusGeometry(pl.r + 0.1, 0.24, 5, 34);
    ring.rotateX(Math.PI / 2);
    ring.translate(pl.x, pl.y + 0.2, pl.z);
    rings.push(ring);
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      if (index === 0 && Math.sin(a) > 0.65) continue;
      const px = pl.x + Math.cos(a) * (pl.r - 0.1);
      const pz = pl.z + Math.sin(a) * (pl.r - 0.1);
      posts.push([px, pl.y + 0.75, pz]);
      const b = ((i + 1) / 18) * Math.PI * 2;
      const qx = pl.x + Math.cos(b) * (pl.r - 0.1);
      const qz = pl.z + Math.sin(b) * (pl.r - 0.1);
      if (index === 0 && Math.sin(b) > 0.65) continue;
      const mx = (px + qx) * 0.5;
      const mz = (pz + qz) * 0.5;
      const len = Math.hypot(qx - px, qz - pz);
      const yaw = Math.atan2(qx - px, qz - pz);
      pushBox(rails, 0.08, 0.08, len, mx, pl.y + 1.26, mz, yaw);
      pushBox(rails, 0.06, 0.06, len, mx, pl.y + 0.86, mz, yaw);
    }
  });
  const postGeo = [];
  for (const p of posts) {
    const g = new THREE.CylinderGeometry(0.07, 0.1, 1.45, 5);
    g.translate(p[0], p[1], p[2]);
    postGeo.push(g);
  }
  const deckMesh = new THREE.Mesh(mergeGeometryList(deck), mats.deck);
  deckMesh.receiveShadow = true;
  deckMesh.castShadow = true;
  group.add(deckMesh);
  const ringMesh = new THREE.Mesh(mergeGeometryList(rings), mats.stoneDark);
  ringMesh.receiveShadow = true;
  group.add(ringMesh);
  const postMesh = new THREE.Mesh(mergeGeometryList(postGeo), mats.wood);
  postMesh.castShadow = postMesh.receiveShadow = true;
  group.add(postMesh);
  const railMesh = new THREE.Mesh(mergeGeometryList(rails), mats.wood);
  railMesh.castShadow = railMesh.receiveShadow = true;
  group.add(railMesh);
  return group;
}

export function createTrailMarkers() {
  const group = new THREE.Group();
  group.name = 'trail-markers';
  const stones = [];
  const rand = mulberry32(881);
  for (let i = 12; i < trailSamples.length - 10; i += 17) {
    const s = trailSamples[i];
    const side = i % 2 ? 1 : -1;
    const x = s.x + s.nx * side * (s.width * 0.5 + 0.7);
    const z = s.z + s.nz * side * (s.width * 0.5 + 0.7);
    const g = new THREE.DodecahedronGeometry(0.42 + rand() * 0.3, 0);
    g.scale(1, 1.6, 0.9);
    g.rotateY(rand() * 6);
    g.translate(x, s.y + 0.55, z);
    stones.push(g);
  }
  const mesh = new THREE.Mesh(mergeGeometryList(stones), mats.stoneDark);
  mesh.castShadow = mesh.receiveShadow = true;
  group.add(mesh);
  return group;
}
