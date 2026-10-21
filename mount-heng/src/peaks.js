import * as THREE from 'three';
import { mats, makePlaqueMaterial } from './materials.js';
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
  return colorize(geo, new THREE.Color(0xa9aaa4), 0.2, seed + 9);
}

export const spireSpecs = [
  [137, 8, 62, 181, 8.5, 4.2, 11],
  [158, 26, 72, 194, 7.4, 3.6, 12],
  [126, 34, 80, 168, 5.6, 2.8, 13],
  [150, 44, 74, 156, 4.6, 2.2, 14],
  [18, -398, 96, 258, 15, 6.4, 21],
  [38, -430, 118, 272, 11, 4.8, 22],
  [6, -448, 104, 246, 9, 4.2, 23],
  [252, -320, 100, 233, 12, 5.2, 31],
  [268, -352, 122, 248, 9, 4.0, 32],
  [238, -366, 96, 219, 7.4, 3.5, 33],
  [-388, -302, 88, 206, 12, 5.4, 41],
  [-404, -338, 104, 219, 8.6, 3.8, 42],
  [-476, -42, 66, 172, 9.4, 4.2, 51],
  [-488, -70, 74, 181, 7.2, 3.2, 52],
  [66, -136, 88, 200, 9.6, 4.6, 61],
  [86, -162, 96, 215, 7.4, 3.4, 62],
  [-252, -66, 82, 141, 6.8, 4.4, 71],
  [296, 96, 46, 158, 10.6, 5.2, 81],
  [316, 74, 54, 142, 7.2, 3.6, 82],
  [392, -542, 102, 232, 13, 5.6, 91],
  [-102, -624, 98, 236, 14, 6.0, 101],
];

export function createGraniteOutcrops() {
  const group = new THREE.Group();
  group.name = 'granite-cliffs';
  const buckets = [new THREE.Color(0xa9aaa4), new THREE.Color(0x969994), new THREE.Color(0xb7b4aa)];
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

export function createFeilaiStone() {
  const group = new THREE.Group();
  group.name = 'feilai-stone';
  const x = -255;
  const z = -78;
  const top = heightAt(x, z);
  const pedestal = new THREE.CylinderGeometry(3.2, 5.6, 12, 7, 3);
  pedestal.translate(x, top + 4, z);
  const rock = new THREE.DodecahedronGeometry(8.6, 1);
  const p = rock.attributes.position;
  const rand = mulberry32(661);
  for (let i = 0; i < p.count; i++) {
    const px = p.getX(i);
    const py = p.getY(i);
    const pz = p.getZ(i);
    const n = 0.72 + rand() * 0.5;
    p.setXYZ(i, px * n * 1.15, py * n * 0.95, pz * n * 1.05);
  }
  rock.computeVertexNormals();
  rock.rotateY(0.45);
  rock.rotateZ(0.12);
  rock.translate(x + 0.8, top + 19, z);
  colorize(pedestal, new THREE.Color(0x9b9c96), 0.18, 662);
  colorize(rock, new THREE.Color(0xb0aea4), 0.22, 663);
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

export function createYingkePine() {
  const group = new THREE.Group();
  group.name = 'yingke-pine';
  const bx = 139;
  const bz = 43;
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
  group.name = 'stone-steps-and-path';
  const topPos = [];
  const topUv = [];
  const topCol = [];
  const edges = [];
  const curbs = [];
  const posts = [];
  const rails = [];
  const n = trailSamples.length;
  let dist = 0;
  const base = new THREE.Color(0xb9b4a6);
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
    if (Math.abs(b.y - a.y) > 0.2) {
      pushBox(edges, a.width + 0.12, 0.16, 0.86, a.x, a.y + 0.08, a.z, a.yaw);
    }
    if (i % 2 === 0 && i > 3 && i < n - 3) {
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

  if (edges.length) {
    const m = new THREE.Mesh(mergeGeometryList(edges), mats.stoneDark);
    m.receiveShadow = true;
    group.add(m);
  }
  if (curbs.length) {
    const m = new THREE.Mesh(mergeGeometryList(curbs), mats.stone);
    m.castShadow = m.receiveShadow = true;
    group.add(m);
  }
  if (postGeo.length) {
    const m = new THREE.Mesh(mergeGeometryList(postGeo), mats.wood);
    m.castShadow = m.receiveShadow = true;
    group.add(m);
  }
  if (rails.length) {
    const m = new THREE.Mesh(mergeGeometryList(rails), mats.wood);
    m.castShadow = m.receiveShadow = true;
    group.add(m);
  }
  return group;
}

export function createPlatforms() {
  const group = new THREE.Group();
  group.name = 'viewing-platforms';
  const deck = [];
  const rings = [];
  const posts = [];
  const rails = [];
  const plaques = [];
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
    const plaqueMat = makePlaqueMaterial(pl.name, 'HENGSHAN · ' + Math.round(pl.y + 40) + ' M');
    const plaque = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.06), plaqueMat);
    plaque.position.set(pl.x, pl.y + 2.0, pl.z + pl.r + 0.15);
    plaque.castShadow = false;
    plaques.push(plaque);
    const pole = new THREE.CylinderGeometry(0.07, 0.09, 1.7, 5);
    pole.translate(pl.x, pl.y + 0.95, pl.z + pl.r + 0.05);
    posts.push([pl.x, pl.y + 0.85, pl.z + pl.r + 0.05]);
    plaques[plaques.length - 1].userData.pole = pole;
  });
  const postGeo = [];
  for (const p of posts) {
    const g = new THREE.CylinderGeometry(0.07, 0.1, 1.45, 5);
    g.translate(p[0], p[1], p[2]);
    postGeo.push(g);
  }
  plaques.forEach((m) => {
    if (m.userData.pole) postGeo.push(m.userData.pole);
  });
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
  plaques.forEach((m) => group.add(m));
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
