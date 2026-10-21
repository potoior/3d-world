import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mergeStaticGroup } from './geometry.js';
import { colliders } from './architectures.js';
import { terrainHeight } from './terrain.js';
import { makePlaqueTexture } from './textures.js';
import { UP, add, box, cyl, ball, bar3 } from './yungangCommon.js';

const CX = 430;
const CZ = 0;
const BASE_Y = 8.6;
const H = 167;
const TH_EAST = Math.PI - 0.30;
const TH_WEST = Math.PI + 0.36;
const TH0 = Math.PI - 0.88;
const TH1 = Math.PI + 0.88;

const CACHE = new Map();
function mat(color, rough = 0.96, extra = null) {
  const key = color + ':' + rough + ':' + (extra ? JSON.stringify(extra) : '');
  if (!CACHE.has(key)) {
    CACHE.set(key, new THREE.MeshStandardMaterial({ color, roughness: rough, ...(extra || {}) }));
  }
  return CACHE.get(key);
}

const M = {
  rockPale: mat(0xb79c7b, 0.98),
  rockWarm: mat(0xa07a5d, 0.99),
  rockDark: mat(0x6c5341, 0.99),
  rockShade: mat(0x7e624b, 0.99),
  caveDark: mat(0x241a13, 1),
  caveBack: mat(0x34251b, 1),
  earth: mat(0x8d7154, 0.99),
  stone: mat(0xa89a80, 0.97),
  stoneDark: mat(0x736a5a, 0.98),
  wood: mat(0x6b4a2d, 0.9),
  woodDark: mat(0x49331f, 0.93),
  woodRed: mat(0x74372a, 0.88),
  roof: mat(0x3d4c43, 0.8, { metalness: 0.1, side: THREE.DoubleSide }),
  roofEdge: mat(0x536457, 0.78, { metalness: 0.14 }),
  gold: mat(0xb78b3f, 0.42, { metalness: 0.4 }),
  skin: mat(0xc59a6b, 0.9),
  clay: mat(0xc49b70, 0.94),
  clayRed: mat(0x944637, 0.94),
  clayGreen: mat(0x56705a, 0.94),
  clayBlue: mat(0x45626f, 0.94),
  hair: mat(0x3d3a37, 0.92),
  pine: mat(0x3c553e, 0.95),
  pineLight: mat(0x4a6347, 0.95),
  trunk: mat(0x4a3826, 0.97),
  clothA: mat(0x4e4034, 0.95),
  clothB: mat(0x3e4b50, 0.95),
  clothC: mat(0x6b5438, 0.95),
  lantern: mat(0xa53425, 0.5, { emissive: 0x4a1007, emissiveIntensity: 1.35 }),
};

function mergeParts(parts) {
  const norm = parts.map((source) => {
    let g = source.index ? source.toNonIndexed() : source.clone();
    for (const key of Object.keys(g.attributes)) {
      if (key !== 'position' && key !== 'normal' && key !== 'uv') g.deleteAttribute(key);
    }
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!g.attributes.uv) {
      g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    }
    return g;
  });
  const geo = mergeGeometries(norm, false);
  parts.forEach((p) => p.dispose());
  norm.forEach((g) => g.dispose());
  return geo;
}

function makeInstanced(geo, material, items, group, cast = true, receive = true) {
  if (!items.length) return null;
  const mesh = new THREE.InstancedMesh(geo, material, items.length);
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  items.forEach((item, i) => {
    mesh.setMatrixAt(i, item.matrix);
    if (item.color) mesh.setColorAt(i, item.color);
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  group.add(mesh);
  return mesh;
}

const dummy = new THREE.Object3D();
const tmpQ = new THREE.Quaternion();

function matrixAt(pos, quat, scale) {
  dummy.position.copy(pos);
  dummy.quaternion.copy(quat || new THREE.Quaternion());
  dummy.scale.copy(scale || new THREE.Vector3(1, 1, 1));
  dummy.updateMatrix();
  return dummy.matrix.clone();
}

function smooth(t) {
  const v = t < 0 ? 0 : t > 1 ? 1 : t;
  return v * v * (3 - 2 * v);
}

function radiusFactor(t) {
  const tt = Math.max(0, Math.min(1, t));
  const dome = tt < 0.78 ? 1 : Math.pow(Math.max(0, Math.cos(((tt - 0.78) / 0.22) * Math.PI * 0.5)), 0.62);
  const bulge = 0.9 + 0.16 * Math.sin(Math.min(1, tt / 0.85) * Math.PI * 0.9);
  return Math.max(0.015, bulge * dome);
}

function radiusAt(t) {
  const rf = radiusFactor(t);
  return { rx: 92 * rf, rz: 178 * rf, rf };
}

function wobble(a, t) {
  return 1 + 0.035 * Math.sin(a * 7 + t * 9.3) + 0.018 * Math.sin(a * 17 - t * 23.1) + 0.011 * Math.sin(a * 31 + t * 41.7);
}

function surfaceAt(theta, y, out = 0) {
  const t = Math.max(0.002, Math.min(0.988, (y - BASE_Y) / H));
  const { rx, rz } = radiusAt(t);
  const w = wobble(theta, t);
  const px = CX + rx * w * Math.cos(theta);
  const pz = CZ + rz * w * Math.sin(theta);
  let nx = Math.cos(theta) / (rx * w);
  let nz = Math.sin(theta) / (rz * w);
  const nl = Math.hypot(nx, nz) || 1;
  nx /= nl;
  nz /= nl;
  const p = new THREE.Vector3(px + nx * out, y, pz + nz * out);
  return { p, n: new THREE.Vector3(nx, 0, nz), t };
}

function quatFromNormal(n) {
  return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
}

function xNoise(a, t) {
  return 0.5 + 0.5 * Math.sin(a * 23 + t * 17) * Math.cos(a * 7 - t * 9);
}

function buildMassif(group) {
  const SEG = 152;
  const RINGS = 46;
  const positions = [];
  const colors = [];
  const indices = [];
  const cA = new THREE.Color(0x9b7054);
  const cB = new THREE.Color(0xb18a68);
  const cPale = new THREE.Color(0xb8aa8b);
  const cDark = new THREE.Color(0x6f5340);
  const cGreen = new THREE.Color(0x777b58);

  for (let r = 0; r <= RINGS; r++) {
    const t = (r / RINGS) * 0.988;
    const y = BASE_Y + t * H;
    const { rx, rz } = radiusAt(t);
    for (let s = 0; s < SEG; s++) {
      const a = (s / SEG) * Math.PI * 2;
      const w = wobble(a, t);
      const px = CX + rx * w * Math.cos(a);
      const pz = CZ + rz * w * Math.sin(a);
      positions.push(px, y, pz);
      const strata = 0.5 + 0.5 * Math.sin(y * 0.47 + Math.sin(a * 2.4) * 1.3 + t * 5.0);
      const grit = 0.5 + 0.5 * Math.sin(a * 41 + y * 1.9) * Math.cos(a * 13 - y * 0.7);
      const c = cA.clone().lerp(cB, strata * 0.82);
      c.lerp(cPale, 0.06 + 0.2 * smooth(grit - 0.45));
      c.lerp(cDark, 0.12 * (1 - strata));
      c.lerp(cGreen, 0.07 * smooth((xNoise(a, t) - 0.55) * 3));
      const v = 0.9 + 0.12 * Math.sin(a * 9 + y * 0.23);
      colors.push(c.r * v, c.g * v, c.b * v);
    }
  }
  const topIndex = positions.length / 3;
  positions.push(CX, BASE_Y + H + 5.5, CZ);
  colors.push(cA.r * 0.9, cA.g * 0.9, cA.b * 0.9);

  for (let r = 0; r < RINGS; r++) {
    for (let s = 0; s < SEG; s++) {
      const a = r * SEG + s;
      const b = r * SEG + ((s + 1) % SEG);
      const c = (r + 1) * SEG + s;
      const d = (r + 1) * SEG + ((s + 1) % SEG);
      indices.push(a, c, b, b, c, d);
    }
  }
  const last = RINGS * SEG;
  for (let s = 0; s < SEG; s++) {
    indices.push(last + s, topIndex, last + ((s + 1) % SEG));
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.995, metalness: 0 });
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);

  const skirt = [];
  for (let i = 0; i < 68; i++) {
    const a = (i / 68) * Math.PI * 2;
    const t = 0.015;
    const { rx, rz } = radiusAt(t);
    const w = wobble(a, t);
    const px = CX + rx * w * Math.cos(a);
    const pz = CZ + rz * w * Math.sin(a);
    const g = new THREE.BoxGeometry(10 + (i % 4) * 3, 5 + (i % 3) * 2.4, 9 + (i % 5) * 2);
    g.rotateY(-a + (i % 3) * 0.4);
    g.translate(px, BASE_Y - 1.4 + (i % 2) * 1.4, pz);
    skirt.push(g);
    if (i % 2 === 0) {
      const g2 = new THREE.BoxGeometry(7, 10 + (i % 4) * 4, 6);
      g2.rotateY(-a + 0.3);
      g2.translate(px * 0.995 + Math.cos(a) * 2, BASE_Y + 5, pz * 0.995 + Math.sin(a) * 2);
      skirt.push(g2);
    }
  }
  const skirtMesh = new THREE.Mesh(mergeParts(skirt), M.rockWarm);
  skirtMesh.castShadow = true;
  skirtMesh.receiveShadow = true;
  group.add(skirtMesh);

  const ribs = [];
  for (let i = 0; i < 46; i++) {
    const a = TH0 + (i / 45) * (TH1 - TH0);
    const y = BASE_Y + 12 + ((i * 37) % 140);
    const { p, n } = surfaceAt(a, y, 0.2);
    const g = new THREE.BoxGeometry(1.0 + (i % 3) * 0.5, 3.4 + (i % 5) * 2.4, 7 + (i % 4) * 4);
    g.rotateY(-a + 0.04 * ((i % 3) - 1));
    g.translate(p.x, p.y, p.z);
    ribs.push(g);
    const g2 = new THREE.BoxGeometry(0.5, 1.2 + (i % 3) * 0.9, 4 + (i % 3) * 2.4);
    g2.rotateY(-a);
    g2.translate(p.x + n.x * 0.4, p.y + 1.4, p.z + n.z * 0.4);
    ribs.push(g2);
  }
  const ribMesh = new THREE.Mesh(mergeParts(ribs), M.rockPale);
  ribMesh.castShadow = true;
  ribMesh.receiveShadow = true;
  group.add(ribMesh);
}

/* ------------------------------------------------------------------ */
/* Caves                                                               */
/* ------------------------------------------------------------------ */

function makeArchShape() {
  const s = new THREE.Shape();
  s.moveTo(-0.5, 0);
  s.lineTo(-0.5, 0.5);
  s.absarc(0, 0.5, 0.5, Math.PI, 0, true);
  s.lineTo(0.5, 0);
  s.lineTo(-0.5, 0);
  return new THREE.ShapeGeometry(s, 14);
}

function makeArchRim() {
  const parts = [];
  const ring = new THREE.TorusGeometry(0.5, 0.06, 5, 24, Math.PI);
  ring.translate(0, 0.5, 0);
  parts.push(ring);
  for (const sx of [-1, 1]) {
    const jamb = new THREE.BoxGeometry(0.12, 0.5, 0.14);
    jamb.translate(sx * 0.5, 0.25, 0);
    parts.push(jamb);
    const foot = new THREE.BoxGeometry(0.2, 0.12, 0.24);
    foot.translate(sx * 0.52, 0.06, 0.02);
    parts.push(foot);
  }
  const sill = new THREE.BoxGeometry(1.22, 0.07, 0.26);
  sill.translate(0, 0.035, 0.04);
  parts.push(sill);
  const lintel = new THREE.BoxGeometry(1.16, 0.08, 0.2);
  lintel.translate(0, 1.0, 0.04);
  parts.push(lintel);
  return mergeParts(parts);
}

function makeSeatedFigure() {
  const parts = [];
  const base = new THREE.BoxGeometry(0.54, 0.07, 0.36);
  base.translate(0, 0.035, 0);
  parts.push(base);
  const body = new THREE.CylinderGeometry(0.14, 0.24, 0.42, 9);
  body.translate(0, 0.33, 0);
  parts.push(body);
  const head = new THREE.SphereGeometry(0.125, 9, 7);
  head.translate(0, 0.64, 0);
  parts.push(head);
  const bun = new THREE.SphereGeometry(0.065, 7, 5);
  bun.translate(0, 0.745, 0);
  parts.push(bun);
  const halo = new THREE.TorusGeometry(0.205, 0.018, 4, 14);
  halo.translate(0, 0.64, -0.03);
  parts.push(halo);
  return mergeParts(parts);
}

function makePilgrimBody() {
  const parts = [];
  const robe = new THREE.CylinderGeometry(0.2, 0.34, 1.16, 8);
  robe.translate(0, 0.62, 0);
  parts.push(robe);
  const shoulder = new THREE.SphereGeometry(0.19, 7, 5);
  shoulder.scale(1.15, 0.55, 0.8);
  shoulder.translate(0, 1.2, 0);
  parts.push(shoulder);
  const hat = new THREE.ConeGeometry(0.3, 0.22, 8);
  hat.translate(0, 1.83, 0);
  parts.push(hat);
  return mergeParts(parts);
}

function bigCaveSkip(theta, y) {
  const dE = Math.abs(theta - TH_EAST);
  const dW = Math.abs(theta - TH_WEST);
  if (dE < 0.19 && y > 26 && y < 112) return true;
  if (dW < 0.14 && y > 34 && y < 104) return true;
  return false;
}

function buildCaves(group) {
  const mouthGeo = makeArchShape();
  const rimGeo = makeArchRim();
  const mouths = [];
  const rims = [];
  const statues = [];
  const mouthMat = new THREE.MeshStandardMaterial({ color: 0x241a13, roughness: 1, metalness: 0, side: THREE.DoubleSide });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xb49a78, roughness: 0.97, metalness: 0 });

  const rows = [
    { y: 22, n: 9 },
    { y: 34, n: 10 },
    { y: 46, n: 11 },
    { y: 58, n: 12 },
    { y: 70, n: 12 },
    { y: 82, n: 11 },
    { y: 94, n: 10 },
    { y: 106, n: 8 },
    { y: 118, n: 6 },
  ];
  const span = TH1 - TH0;
  let seed = 13;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const palette = [0xc79d71, 0xb98b60, 0xcfae83, 0xd0b48b, 0xb48362];

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    for (let j = 0; j < row.n; j++) {
      const theta = TH0 + span * ((j + 0.5) / row.n) + (rand() - 0.5) * 0.035;
      const y = row.y + (rand() - 0.5) * 2.6;
      if (bigCaveSkip(theta, y)) continue;
      if (rand() < 0.06) continue;
      const w = 3.5 + rand() * 4.6 + (r === 2 || r === 3 ? 1.4 : 0);
      const h = 4.6 + rand() * 4.4 + (r === 2 || r === 3 ? 1.2 : 0);
      const s = surfaceAt(theta, y + h * 0.5, 0.62);
      const q = quatFromNormal(s.n);
      mouths.push({ matrix: matrixAt(s.p, q, new THREE.Vector3(w, h, 1)) });
      const rp = s.p.clone().addScaledVector(s.n, 0.32);
      rims.push({ matrix: matrixAt(rp, q, new THREE.Vector3(w + 0.5, h + 0.34, 1)) });
      if (h > 7.4 && rand() < 0.86) {
        const sp = surfaceAt(theta, y + 0.15, 0.96);
        const ss = h * 0.5;
        statues.push({
          matrix: matrixAt(sp.p, q, new THREE.Vector3(ss, ss, ss)),
          color: new THREE.Color(palette[(r + j) % palette.length]),
        });
      }
    }
  }

  for (let i = 0; i < 34; i++) {
    const theta = TH0 + span * rand();
    const y = BASE_Y + 16 + rand() * 116;
    if (bigCaveSkip(theta, y)) continue;
    const w = 1.4 + rand() * 1.5;
    const h = 2.2 + rand() * 2.0;
    const s = surfaceAt(theta, y, 0.5);
    const q = quatFromNormal(s.n);
    mouths.push({ matrix: matrixAt(s.p, q, new THREE.Vector3(w, h, 1)) });
    rims.push({ matrix: matrixAt(s.p.clone().addScaledVector(s.n, 0.2), q, new THREE.Vector3(w + 0.28, h + 0.2, 1)) });
  }

  makeInstanced(mouthGeo, mouthMat, mouths, group, false, true);
  makeInstanced(rimGeo, rimMat, rims, group, false, true);
  makeInstanced(makeSeatedFigure(), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92 }), statues, group, true, true);
  return { mouthGeo, rimGeo, mouthMat, rimMat };
}

/* ------------------------------------------------------------------ */
/* Monumental clay sculpture                                           */
/* ------------------------------------------------------------------ */

function giantBuddha(g, x, baseY, z, s, robe, skin) {
  box(g, 30 * s, 2.4 * s, 24 * s, M.stoneDark, x + 2 * s, baseY + 1.2 * s, z);
  box(g, 24 * s, 2.7 * s, 19 * s, M.rockPale, x + 2 * s, baseY + 3.6 * s, z);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    ball(g, 6, M.clayRed, x + 2 * s + Math.cos(a) * 8.6 * s, baseY + 4.6 * s, z + Math.sin(a) * 6.8 * s, 1.9 * s, 0.72 * s, 1.2 * s);
  }
  ball(g, 16, robe, x + 2 * s, baseY + 8.3 * s, z, 10.2 * s, 3.5 * s, 8.4 * s);
  ball(g, 10, skin, x - 6.2 * s, baseY + 8.1 * s, z - 5.2 * s, 1.9 * s, 1.0 * s, 1.5 * s);
  ball(g, 10, skin, x - 6.2 * s, baseY + 8.1 * s, z + 5.2 * s, 1.9 * s, 1.0 * s, 1.5 * s);
  cyl(g, 5.6 * s, 7.9 * s, 10.4 * s, 16, robe, x + 1.1 * s, baseY + 16.0 * s, z);
  ball(g, 16, robe, x + 0.9 * s, baseY + 20.6 * s, z, 7.2 * s, 3.6 * s, 7.8 * s);
  ball(g, 12, skin, x - 3.2 * s, baseY + 19.4 * s, z, 2.1 * s, 3.6 * s, 3.3 * s);
  cyl(g, 1.8 * s, 2.3 * s, 2.8 * s, 12, skin, x - 0.5 * s, baseY + 24.3 * s, z);
  const hy = baseY + 29.2 * s;
  ball(g, 20, skin, x - 0.8 * s, hy, z, 4.1 * s, 4.8 * s, 3.8 * s);
  ball(g, 16, skin, x - 0.9 * s, hy + 3.9 * s, z, 2.6 * s, 2.2 * s, 2.5 * s);
  for (const sz of [-1, 1]) {
    ball(g, 8, skin, x - 1.1 * s, hy - 0.5 * s, z + sz * 3.8 * s, 0.9 * s, 2.6 * s, 0.75 * s);
    ball(g, 8, M.hair, x - 4.55 * s, hy + 1.15 * s, z + sz * 1.35 * s, 0.24 * s, 0.42 * s, 0.85 * s);
    ball(g, 7, M.hair, x - 4.6 * s, hy + 1.85 * s, z + sz * 1.5 * s, 0.16 * s, 0.14 * s, 0.75 * s);
  }
  ball(g, 8, skin, x - 4.9 * s, hy + 0.2 * s, z, 0.62 * s, 1.5 * s, 0.5 * s);
  ball(g, 7, M.hair, x - 5.0 * s, hy - 0.9 * s, z, 0.2 * s, 0.24 * s, 1.25 * s);
  ball(g, 7, M.hair, x - 4.45 * s, hy + 2.65 * s, z, 0.1 * s, 0.24 * s, 0.95 * s);

  const hairGeo = new THREE.SphereGeometry(0.72 * s, 6, 4);
  for (let row = 0; row < 6; row++) {
    const phi = 0.12 + row * 0.18;
    const n = 10 + row * 2;
    for (let i = 0; i < n; i++) {
      const lon = (i / n) * Math.PI * 2;
      const px = x - 0.8 * s + Math.cos(lon) * Math.cos(phi) * 3.8 * s;
      const py = hy + Math.sin(phi) * 4.55 * s;
      const pz = z + Math.sin(lon) * Math.cos(phi) * 3.6 * s;
      if (px < x - 2.8 * s && py < hy + 2.4 * s) continue;
      const o = new THREE.Mesh(hairGeo, M.hair);
      o.position.set(px, py, pz);
      o.castShadow = true;
      g.add(o);
    }
  }

  for (const sz of [-1, 1]) {
    const shoulder = new THREE.Vector3(x - 0.2 * s, baseY + 20.6 * s, z + sz * 6.4 * s);
    const elbow = new THREE.Vector3(x - 4.4 * s, baseY + 13.6 * s, z + sz * 8.4 * s);
    const hand = sz > 0
      ? new THREE.Vector3(x - 8.6 * s, baseY + 16.6 * s, z + 6.4 * s)
      : new THREE.Vector3(x - 8.4 * s, baseY + 8.4 * s, z - 7.0 * s);
    bar3(g, shoulder.x, shoulder.y, shoulder.z, elbow.x, elbow.y, elbow.z, 2.0 * s, robe, 10);
    bar3(g, elbow.x, elbow.y, elbow.z, hand.x, hand.y, hand.z, 1.3 * s, skin, 9);
    ball(g, 10, skin, hand.x, hand.y, hand.z, 2.0 * s, 1.3 * s, 1.6 * s);
    for (let f = 0; f < 4; f++) {
      const fz = hand.z + (f - 1.5) * 0.58 * s;
      bar3(g, hand.x - 1.5 * s, hand.y + 0.3 * s, fz, hand.x - 2.9 * s, hand.y + (f - 1.5) * 0.4 * s, fz, 0.17 * s, skin, 4);
    }
  }

  for (let i = 0; i < 8; i++) {
    const rad = (5.6 + i * 0.34) * s;
    const ring = new THREE.TorusGeometry(rad, 0.16 * s, 4, 18);
    ring.rotateX(Math.PI / 2);
    ring.translate(x + 1.0 * s, baseY + (6.6 + i * 1.65) * s, z);
    add(g, ring, i % 2 ? M.clayRed : M.clayGreen, 0, 0, 0);
  }
  box(g, 0.4 * s, 0.4 * s, 15.5 * s, M.gold, x - 7.2 * s, baseY + 13.0 * s, z);
  for (const sz of [-1, 1]) {
    box(g, 0.3 * s, 0.32 * s, 10 * s, M.clayGreen, x - 7.35 * s, baseY + (10.2 + (sz + 1) * 1.2) * s, z);
  }

  const halo = new THREE.TorusGeometry(10.4 * s, 0.3 * s, 5, 44);
  halo.rotateY(Math.PI / 2);
  halo.translate(x + 1.8 * s, hy + 0.6 * s, z);
  add(g, halo, M.gold, 0, 0, 0);
  const inner = new THREE.TorusGeometry(8.2 * s, 0.13 * s, 4, 36);
  inner.rotateY(Math.PI / 2);
  inner.translate(x + 1.5 * s, hy + 0.6 * s, z);
  add(g, inner, M.clayRed, 0, 0, 0);
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2;
    const dy = Math.sin(a);
    const dz = Math.cos(a);
    const cone = new THREE.ConeGeometry(0.42 * s, 1.9 * s, 4);
    const o = new THREE.Mesh(cone, M.gold);
    o.position.set(x + 2.2 * s, hy + 0.6 * s + dy * 11.2 * s, z + dz * 11.2 * s);
    o.quaternion.setFromUnitVectors(UP, new THREE.Vector3(0, dy, dz));
    o.castShadow = true;
    g.add(o);
  }
}

function standingAttendant(g, x, baseY, z, s, robe, skin) {
  box(g, 7.0 * s, 1.1 * s, 7.0 * s, M.stoneDark, x, baseY + 0.55 * s, z);
  cyl(g, 2.4 * s, 3.4 * s, 14.5 * s, 10, robe, x + 0.4 * s, baseY + 8.2 * s, z);
  ball(g, 12, robe, x + 0.2 * s, baseY + 15.4 * s, z, 2.6 * s, 4.2 * s, 4.5 * s);
  cyl(g, 1.0 * s, 1.3 * s, 1.5 * s, 10, skin, x + 0.1 * s, baseY + 18.0 * s, z);
  const hy = baseY + 21.0 * s;
  ball(g, 14, skin, x - 0.1 * s, hy, z, 2.1 * s, 2.6 * s, 2.2 * s);
  ball(g, 10, skin, x - 0.2 * s, hy + 2.3 * s, z, 1.1 * s, 1.0 * s, 1.2 * s);
  ball(g, 8, M.hair, x - 0.3 * s, hy + 2.9 * s, z, 0.75 * s, 0.65 * s, 0.8 * s);
  for (const sz of [-1, 1]) {
    ball(g, 6, skin, x - 0.4 * s, hy - 0.2 * s, z + sz * 2.1 * s, 0.45 * s, 1.4 * s, 0.4 * s);
    bar3(g, x + 0.2 * s, baseY + 15.6 * s, z + sz * 2.5 * s, x - 1.2 * s, baseY + 9.0 * s, z + sz * 3.1 * s, 0.62 * s, robe, 6);
    box(g, 0.14 * s, 8.5 * s, 0.34 * s, M.clayGreen, x - 3.0 * s, baseY + 11.5 * s, z + sz * 1.6 * s, 0, sz * 0.12);
  }
  const ring = new THREE.TorusGeometry(3.3 * s, 0.22 * s, 4, 24);
  ring.rotateY(Math.PI / 2);
  ring.translate(x + 1.1 * s, hy + 0.3 * s, z);
  add(g, ring, M.gold, 0, 0, 0);
  for (let i = 0; i < 4; i++) {
    const rr = new THREE.TorusGeometry((2.7 + i * 0.32) * s, 0.1 * s, 4, 14);
    rr.rotateX(Math.PI / 2);
    rr.translate(x + 0.4 * s, baseY + (5 + i * 2.3) * s, z);
    add(g, rr, i % 2 ? M.clayGreen : M.clayRed, 0, 0, 0);
  }
}

function buildShrines(g, mouthGeo, rimGeo, mouthMat, rimMat) {
  const eBase = surfaceAt(TH_EAST, 28, 0.55);
  const eCenter = surfaceAt(TH_EAST, 50, 0.1);
  const eq = quatFromNormal(eCenter.n);
  const eMouth = new THREE.Mesh(mouthGeo, mouthMat);
  eMouth.position.copy(eBase.p);
  eMouth.quaternion.copy(eq);
  eMouth.scale.set(31, 46, 1);
  g.add(eMouth);
  const eRim = new THREE.Mesh(rimGeo, rimMat);
  eRim.position.copy(eBase.p.clone().addScaledVector(eCenter.n, 0.35));
  eRim.quaternion.copy(eq);
  eRim.scale.set(32, 46.6, 1);
  g.add(eRim);

  const eLow = surfaceAt(TH_EAST, 31, 0);
  giantBuddha(g, eLow.p.x - 3.2, 31, eLow.p.z, 0.95, M.clayRed, M.skin);
  const tangent = new THREE.Vector3(-Math.sin(TH_EAST), 0, Math.cos(TH_EAST)).normalize();
  for (const sz of [-1, 1]) {
    const ap = eCenter.p.clone().addScaledVector(tangent, sz * 13.2).addScaledVector(eCenter.n, 2.2);
    standingAttendant(g, ap.x, 30, ap.z, 0.64, sz > 0 ? M.clayGreen : M.clayBlue, M.skin);
  }

  const px = eCenter.p.x - 17.0;
  const pz = eCenter.p.z;
  for (const sz of [-1, 1]) {
    for (const dz of [17.5, 25.5]) {
      box(g, 1.05, 47, 1.05, M.woodRed, px, 53.5, pz + sz * dz);
      box(g, 1.5, 0.6, 1.5, M.stoneDark, px, 30.3, pz + sz * dz);
      box(g, 0.65, 2.1, 0.65, M.lantern, px - 0.7, 47.5, pz + sz * dz);
    }
    box(g, 5.0, 0.42, 12.0, M.wood, px, 60.0, pz + sz * 21.5);
    box(g, 0.22, 1.15, 12.0, M.woodDark, px - 2.4, 60.8, pz + sz * 21.5);
  }
  box(g, 1.35, 1.05, 54.0, M.woodDark, px, 74.6, pz);
  box(g, 1.2, 0.72, 50.0, M.woodRed, px, 62.4, pz);
  for (const sx of [-1, 1]) {
    const roof = new THREE.BoxGeometry(10.5, 0.48, 61.0);
    roof.rotateZ(sx * 0.30);
    roof.translate(px + sx * 4.4, 80.6, pz);
    add(g, roof, M.roof, 0, 0, 0);
    const edge = new THREE.BoxGeometry(11.1, 0.3, 62.0);
    edge.rotateZ(sx * 0.30);
    edge.translate(px + sx * 4.5, 80.1, pz);
    add(g, edge, M.roofEdge, 0, 0, 0);
  }
  box(g, 0.8, 0.85, 62.0, M.roofEdge, px, 82.1, pz);
  for (const sz of [-1, 1]) {
    const tip = new THREE.BoxGeometry(1.2, 0.4, 4.4);
    tip.rotateX(sz * -0.34);
    tip.rotateZ(0.12);
    tip.translate(px + 2.8, 81.4, pz + sz * 31.0);
    add(g, tip, M.roofEdge, 0, 0, 0);
  }
  const plaqueMat = new THREE.MeshStandardMaterial({ map: makePlaqueTexture('麦积山石窟'), roughness: 0.78, metalness: 0.06 });
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(7.8, 2.4), plaqueMat);
  plaque.rotation.y = -Math.PI / 2;
  plaque.position.set(px - 0.72, 69.2, pz);
  g.add(plaque);
  box(g, 0.28, 3.0, 8.4, M.gold, px - 0.4, 69.2, pz);

  const wBase = surfaceAt(TH_WEST, 36, 0.55);
  const wCenter = surfaceAt(TH_WEST, 51, 0.1);
  const wq = quatFromNormal(wCenter.n);
  const wMouth = new THREE.Mesh(mouthGeo, mouthMat);
  wMouth.position.copy(wBase.p);
  wMouth.quaternion.copy(wq);
  wMouth.scale.set(21, 31, 1);
  g.add(wMouth);
  const wRim = new THREE.Mesh(rimGeo, rimMat);
  wRim.position.copy(wBase.p.clone().addScaledVector(wCenter.n, 0.35));
  wRim.quaternion.copy(wq);
  wRim.scale.set(21.8, 31.5, 1);
  g.add(wRim);
  const wLow = surfaceAt(TH_WEST, 40, 0);
  giantBuddha(g, wLow.p.x - 2.4, 40, wLow.p.z, 0.62, M.clayGreen, M.skin);
  const wt = new THREE.Vector3(-Math.sin(TH_WEST), 0, Math.cos(TH_WEST)).normalize();
  for (const sz of [-1, 1]) {
    const ap = wCenter.p.clone().addScaledVector(wt, sz * 8.4).addScaledVector(wCenter.n, 1.8);
    standingAttendant(g, ap.x, 39, ap.z, 0.42, M.clayRed, M.skin);
  }
}

/* ------------------------------------------------------------------ */
/* Plank walkways                                                      */
/* ------------------------------------------------------------------ */

function deckMatrix(a, b, width, thick, gap = 0.97) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len = Math.hypot(dx, dz);
  dummy.position.set((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  dummy.rotation.set(0, Math.atan2(dx, dz), 0);
  dummy.scale.set(width, thick, len * gap);
  dummy.updateMatrix();
  return dummy.matrix.clone();
}

function barMatrix(a, b, thick, width = thick) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  const len = Math.hypot(dx, dy, dz) || 0.001;
  tmpQ.setFromUnitVectors(UP, new THREE.Vector3(dx / len, dy / len, dz / len));
  return matrixAt(
    new THREE.Vector3((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2),
    tmpQ,
    new THREE.Vector3(width, len, thick)
  );
}

function walkwayGap(theta, y) {
  if (Math.abs(theta - TH_EAST) < 0.195 && y > 30 && y < 110) return true;
  if (Math.abs(theta - TH_WEST) < 0.15 && y > 34 && y < 106) return true;
  return false;
}

function buildWalkways(g) {
  const decks = [];
  const posts = [];
  const rails = [];
  const braces = [];
  const lanterns = [];
  const levels = [26, 42, 58, 74, 90, 104];

  for (let li = 0; li < levels.length; li++) {
    const y = levels[li];
    const segs = 78;
    let prev = null;
    let prevOuter = null;
    let count = 0;
    for (let k = 0; k <= segs; k++) {
      const theta = TH0 + 0.02 + ((TH1 - TH0 - 0.04) * k) / segs;
      if (walkwayGap(theta, y)) {
        prev = null;
        prevOuter = null;
        continue;
      }
      const s = surfaceAt(theta, y, 3.45);
      const p = s.p;
      const outer = p.clone().addScaledVector(s.n, 1.35);
      const inner = p.clone().addScaledVector(s.n, -0.55);
      if (prev) {
        decks.push({ matrix: deckMatrix(prev, p, 2.55, 0.3) });
        const oa = prevOuter.clone();
        const ob = outer.clone();
        oa.y += 1.55;
        ob.y += 1.55;
        rails.push({ matrix: deckMatrix(oa, ob, 0.17, 0.22, 0.99) });
        if (count % 2 === 0) {
          posts.push({ matrix: matrixAt(outer.clone().setY(y + 0.9), null, new THREE.Vector3(0.22, 1.5, 0.22)) });
        }
        if (count % 2 === 0) {
          const low = surfaceAt(theta, Math.max(BASE_Y + 2, y - 5.2), 0.55);
          braces.push({ matrix: barMatrix(inner, low.p, 0.22, 0.22) });
          const foot = new THREE.Vector3(p.x, y - 0.16, p.z);
          const low2 = surfaceAt(theta, Math.max(BASE_Y + 1.5, y - 7.4), 4.7);
          braces.push({ matrix: barMatrix(foot, low2.p, 0.2, 0.2) });
        }
      }
      if (count % 8 === 0) {
        lanterns.push({
          matrix: matrixAt(outer.clone().setY(y + 2.25), null, new THREE.Vector3(0.32, 0.4, 0.32)),
          phase: k * 0.7 + li,
          pos: outer.clone().setY(y + 2.25),
        });
      }
      prev = p;
      prevOuter = outer;
      count++;
    }
  }

  makeInstanced(new THREE.BoxGeometry(1, 1, 1), M.wood, decks, g, true, true);
  makeInstanced(new THREE.BoxGeometry(1, 1, 1), M.woodDark, posts, g, true, true);
  makeInstanced(new THREE.BoxGeometry(1, 1, 1), M.woodDark, rails, g, true, true);
  makeInstanced(new THREE.BoxGeometry(1, 1, 1), M.woodDark, braces, g, true, true);
  const lanternMesh = makeInstanced(new THREE.SphereGeometry(1, 8, 6), M.lantern, lanterns, g, false, false);

  for (let li = 0; li < levels.length - 1; li++) {
    for (const theta of [TH0 + 0.035, TH1 - 0.035]) {
      const y0 = levels[li];
      const y1 = levels[li + 1];
      const s = surfaceAt(theta, (y0 + y1) * 0.5, 3.9);
      const tangent = new THREE.Vector3(-Math.sin(theta), 0, Math.cos(theta)).normalize();
      for (const side of [-1, 1]) {
        const a = s.p.clone().addScaledVector(tangent, side * 0.55);
        const b = a.clone();
        a.y = y0 + 0.2;
        b.y = y1;
        bar3(g, a.x, a.y, a.z, b.x, b.y, b.z, 0.075, M.woodDark, 5);
      }
      const rungs = Math.round((y1 - y0) / 0.62);
      for (let i = 0; i <= rungs; i++) {
        const yy = y0 + ((y1 - y0) * i) / rungs;
        box(g, 0.1, 0.1, 1.35, M.woodDark, s.p.x, yy, s.p.z, -theta);
      }
    }
  }
  return { lanternMesh, lanterns };
}

/* ------------------------------------------------------------------ */
/* Flags                                                               */
/* ------------------------------------------------------------------ */

function buildFlags(g) {
  const flagGeo = new THREE.PlaneGeometry(1.05, 1.5);
  flagGeo.translate(0, -0.75, 0);
  const flagMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, side: THREE.DoubleSide });
  const count = 23;
  const data = [];
  const colors = [0xa83a2c, 0xc9a13c, 0x3f6f86, 0x4d7a55, 0xd9d2ba];
  const rope = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const theta = TH0 + 0.10 + (TH1 - TH0 - 0.20) * t;
    const s = surfaceAt(theta, 95.5 - Math.sin(t * Math.PI) * 2.4, 5.4);
    const pos = s.p.clone();
    data.push({ pos, phase: i * 0.63, base: pos.clone(), yaw: Math.atan2(s.n.x, s.n.z) });
    if (i > 0) rope.push(s.p.clone());
  }
  for (let i = 1; i < rope.length; i++) {
    bar3(g, rope[i - 1].x, rope[i - 1].y, rope[i - 1].z, rope[i].x, rope[i].y, rope[i].z, 0.035, M.woodDark, 4);
  }
  const mesh = new THREE.InstancedMesh(flagGeo, flagMat, count);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  const col = new THREE.Color();
  for (let i = 0; i < count; i++) {
    col.setHex(colors[i % colors.length]);
    mesh.setColorAt(i, col);
    dummy.position.copy(data[i].pos);
    dummy.rotation.set(0, Math.atan2(-Math.cos(TH0 + 0.5), Math.sin(TH0 + 0.5)), 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  g.add(mesh);
  return { mesh, data };
}

/* ------------------------------------------------------------------ */
/* Pine forest                                                         */
/* ------------------------------------------------------------------ */

function makePineGeometries() {
  const trunk = new THREE.CylinderGeometry(0.16, 0.3, 4.4, 6);
  trunk.translate(0, 2.2, 0);
  const cones = [];
  const tiers = [
    [2.5, 3.4, 3.5],
    [1.9, 3.0, 5.0],
    [1.3, 2.6, 6.35],
    [0.7, 1.9, 7.5],
  ];
  for (const [r, h, y] of tiers) {
    const cone = new THREE.ConeGeometry(r, h, 7);
    cone.translate(0, y, 0);
    cones.push(cone);
  }
  return { trunk, foliage: mergeParts(cones) };
}

function buildForest(group) {
  const { trunk, foliage } = makePineGeometries();
  const trunks = [];
  const leaves = [];
  let seed = 1977;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const place = (x, z, scale) => {
    const y = terrainHeight(x, z);
    if (y < 0.4) return;
    const q = new THREE.Quaternion().setFromAxisAngle(UP, rand() * Math.PI * 2);
    const m = matrixAt(new THREE.Vector3(x, y, z), q, new THREE.Vector3(scale, scale, scale));
    trunks.push({ matrix: m });
    leaves.push({ matrix: m });
  };
  for (let i = 0; i < 150; i++) {
    const x = 170 + rand() * 165;
    const z = -340 + rand() * 680;
    if (x > 236 && Math.abs(z - 84) < 26) continue;
    place(x, z, 0.75 + rand() * 1.05);
  }
  for (let i = 0; i < 120; i++) {
    const x = 510 + rand() * 165;
    const z = -430 + rand() * 860;
    place(x, z, 0.85 + rand() * 1.25);
  }
  for (let i = 0; i < 26; i++) {
    const a = rand() * Math.PI * 2;
    const x = CX + Math.cos(a) * (52 + rand() * 18);
    const z = CZ + Math.sin(a) * (100 + rand() * 30);
    const y = terrainHeight(x, z);
    if (y < 1) continue;
    const q = new THREE.Quaternion().setFromAxisAngle(UP, rand() * Math.PI * 2);
    const m = matrixAt(new THREE.Vector3(x, y, z), q, new THREE.Vector3(0.8 + rand() * 0.8, 0.8 + rand() * 0.8, 0.8 + rand() * 0.8));
    trunks.push({ matrix: m });
    leaves.push({ matrix: m });
  }
  makeInstanced(trunk, M.trunk, trunks, group, true, true);
  makeInstanced(foliage, M.pine, leaves, group, true, true);
}

/* ------------------------------------------------------------------ */
/* Misty Qinling ridges                                                */
/* ------------------------------------------------------------------ */

function buildRidge(x0, width, zSpan, amp, seed, lowHex, highHex) {
  const geo = new THREE.PlaneGeometry(width, zSpan, 34, 92);
  geo.rotateX(-Math.PI * 0.5);
  const pos = geo.attributes.position;
  const colors = [];
  const low = new THREE.Color(lowHex);
  const high = new THREE.Color(highHex);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i) / width + 0.5;
    const z = pos.getZ(i);
    const line = 0.55 + 0.27 * Math.sin(z * 0.0028 + seed) + 0.16 * Math.sin(z * 0.0071 + seed * 2.1) + 0.09 * Math.sin(z * 0.0157 + seed * 3.7);
    const taper = 0.58 + 0.42 * Math.sin(u * Math.PI);
    const h = Math.max(0, amp * line * taper);
    pos.setY(i, h + 1.5);
    c.copy(low).lerp(high, smooth(h / (amp * 0.9)));
    colors.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 });
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.x = x0 + width / 2;
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  return mesh;
}

function buildRidges(group) {
  group.add(buildRidge(600, 560, 3100, 155, 1.7, 0x5d7861, 0x91a5a2));
  group.add(buildRidge(880, 820, 3500, 215, 4.1, 0x6a8688, 0xa2b3b6));
  group.add(buildRidge(1180, 1040, 3900, 270, 8.3, 0x7f96a2, 0xbac6c8));
}

/* ------------------------------------------------------------------ */
/* Path, gate and pilgrims                                             */
/* ------------------------------------------------------------------ */

function buildPath(group) {
  const pts = [];
  for (let i = 0; i <= 18; i++) {
    const t = i / 18;
    const x = 232 + 112 * t;
    const z = 104 - 40 * t + 11 * Math.sin(t * 3.1);
    const y = terrainHeight(x, z) + 0.16;
    pts.push(new THREE.Vector3(x, y, z));
  }
  const positions = [];
  const indices = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const l = Math.hypot(dx, dz) || 1;
    const sx = (-dz / l) * 3.6;
    const sz = (dx / l) * 3.6;
    positions.push(p.x + sx, p.y, p.z + sz, p.x - sx, p.y, p.z - sz);
    if (i < pts.length - 1) {
      const k = i * 2;
      indices.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, M.stone);
  mesh.receiveShadow = true;
  group.add(mesh);

  const gate = pts[0];
  for (const sz of [-1, 1]) {
    box(group, 0.9, 6.2, 0.9, M.woodRed, gate.x, gate.y + 3.1, gate.z + sz * 4.4);
    box(group, 1.5, 0.9, 1.5, M.stoneDark, gate.x, gate.y + 0.45, gate.z + sz * 4.4);
  }
  box(group, 1.0, 0.8, 10.2, M.woodDark, gate.x, gate.y + 6.3, gate.z);
  for (const sx of [-1, 1]) {
    const roof = new THREE.BoxGeometry(3.4, 0.3, 11.2);
    roof.rotateZ(sx * 0.36);
    roof.translate(gate.x + sx * 1.5, gate.y + 7.2, gate.z);
    add(group, roof, M.roof, 0, 0, 0);
  }
  const plaqueMat = new THREE.MeshStandardMaterial({ map: makePlaqueTexture('麦积山石窟'), roughness: 0.8, metalness: 0.05 });
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 1.9), plaqueMat);
  plaque.rotation.y = -Math.PI / 2;
  plaque.position.set(gate.x - 0.52, gate.y + 5.1, gate.z);
  group.add(plaque);
  box(group, 0.24, 2.4, 5.8, M.gold, gate.x - 0.32, gate.y + 5.1, gate.z);
  return pts;
}

function buildPilgrims(group, pathPts) {
  const bodyGeo = makePilgrimBody();
  const headGeo = new THREE.SphereGeometry(0.19, 9, 7);
  headGeo.translate(0, 1.52, 0);
  const bodies = [];
  const heads = [];
  const data = [];
  const baseColors = [0x4e4034, 0x3e4b50, 0x6b5438, 0x5a3c32, 0x435347];
  const total = 28;
  for (let i = 0; i < total; i++) {
    const t = 0.05 + 0.9 * (i / (total - 1));
    const p = samplePath(pathPts, t);
    const side = ((i % 3) - 1) * 1.6;
    const pos = p.pos.clone();
    pos.x += p.side.x * side;
    pos.z += p.side.z * side;
    pos.y = terrainHeight(pos.x, pos.z) + 0.08;
    const q = new THREE.Quaternion().setFromAxisAngle(UP, p.yaw);
    const sc = 0.9 + (i % 4) * 0.06;
    const m = matrixAt(pos, q, new THREE.Vector3(sc, sc, sc));
    bodies.push({ matrix: m.clone(), color: new THREE.Color(baseColors[i % baseColors.length]) });
    heads.push({ matrix: m.clone() });
    data.push({ t, side, sc, phase: i * 0.83, moving: i < 14, pos });
  }
  const bodyMesh = new THREE.InstancedMesh(bodyGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 }), total);
  const headMesh = new THREE.InstancedMesh(headGeo, new THREE.MeshStandardMaterial({ color: 0xb98c60, roughness: 0.9 }), total);
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  headMesh.castShadow = true;
  bodies.forEach((b, i) => {
    bodyMesh.setMatrixAt(i, b.matrix);
    bodyMesh.setColorAt(i, b.color);
    headMesh.setMatrixAt(i, heads[i].matrix);
  });
  bodyMesh.instanceMatrix.needsUpdate = true;
  if (bodyMesh.instanceColor) bodyMesh.instanceColor.needsUpdate = true;
  headMesh.instanceMatrix.needsUpdate = true;
  group.add(bodyMesh);
  group.add(headMesh);
  return { bodyMesh, headMesh, data, pathPts };
}

function samplePath(pts, t) {
  const f = Math.max(0, Math.min(1, t)) * (pts.length - 1);
  const i = Math.min(pts.length - 2, Math.floor(f));
  const frac = f - i;
  const a = pts[i];
  const b = pts[i + 1];
  const pos = new THREE.Vector3().lerpVectors(a, b, frac);
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const l = Math.hypot(dx, dz) || 1;
  const side = new THREE.Vector3(-dz / l, 0, dx / l);
  return { pos, yaw: Math.atan2(dx, dz), side };
}

/* ------------------------------------------------------------------ */
/* Mist                                                                */
/* ------------------------------------------------------------------ */

function makeMistTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 224;
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 0, 224);
  grd.addColorStop(0, 'rgba(255,255,255,0)');
  grd.addColorStop(0.38, 'rgba(255,255,255,0.62)');
  grd.addColorStop(0.62, 'rgba(255,255,255,0.72)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 512, 224);
  g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 46; i++) {
    const x = (Math.sin(i * 71.3) * 0.5 + 0.5) * 512;
    const y = (Math.sin(i * 33.7 + 1.3) * 0.5 + 0.5) * 224;
    const r = 30 + (i % 8) * 16;
    const rg = g.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, 'rgba(0,0,0,0.42)');
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rg;
    g.fillRect(0, 0, 512, 224);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildMist(group) {
  const tex = makeMistTexture();
  const defs = [
    { x: 318, y: 15, z: 20, w: 360, h: 58, o: 0.3, sp: 0.3 },
    { x: 330, y: 36, z: -105, w: 300, h: 48, o: 0.24, sp: 0.24 },
    { x: 345, y: 60, z: 120, w: 320, h: 54, o: 0.2, sp: 0.36 },
    { x: 365, y: 88, z: -40, w: 280, h: 44, o: 0.16, sp: 0.2 },
    { x: 560, y: 58, z: 40, w: 620, h: 90, o: 0.24, sp: 0.14 },
    { x: 760, y: 86, z: -150, w: 820, h: 120, o: 0.22, sp: 0.1 },
    { x: 980, y: 120, z: 130, w: 1000, h: 150, o: 0.2, sp: 0.08 },
  ];
  const list = [];
  for (const d of defs) {
    const m = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: d.o,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false,
      toneMapped: false,
      color: 0xe6e9df,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(d.w, d.h), m);
    mesh.rotation.y = -Math.PI / 2;
    mesh.position.set(d.x, d.y, d.z);
    mesh.renderOrder = 4;
    group.add(mesh);
    list.push({ mesh, x: d.x, z: d.z, y: d.y, o: d.o, sp: d.sp, phase: list.length * 1.7 });
  }
  return list;
}

/* ------------------------------------------------------------------ */
/* Animated life                                                       */
/* ------------------------------------------------------------------ */

function makeLife(flags, walk, mist, pilgrims) {
  const flagMesh = flags.mesh;
  const flagData = flags.data;
  const lanternMesh = walk.lanternMesh;
  const lanternData = walk.lanterns;
  const bodyMesh = pilgrims.bodyMesh;
  const headMesh = pilgrims.headMesh;
  const pData = pilgrims.data;
  const pathPts = pilgrims.pathPts;
  const tmpQ2 = new THREE.Quaternion();
  const tmpPos = new THREE.Vector3();

  return {
    update(time) {
      for (let i = 0; i < flagData.length; i++) {
        const d = flagData[i];
        dummy.position.copy(d.pos);
        dummy.rotation.set(Math.sin(time * 1.9 + d.phase) * 0.18, d.yaw, Math.sin(time * 2.5 + d.phase) * 0.15);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        flagMesh.setMatrixAt(i, dummy.matrix);
      }
      flagMesh.instanceMatrix.needsUpdate = true;

      if (lanternMesh) {
        for (let i = 0; i < lanternData.length; i++) {
          const d = lanternData[i];
          dummy.position.set(d.pos.x + Math.sin(time * 1.2 + d.phase) * 0.06, d.pos.y + Math.sin(time * 1.5 + d.phase) * 0.08, d.pos.z + Math.cos(time * 1.1 + d.phase) * 0.05);
          dummy.rotation.set(Math.sin(time * 1.3 + d.phase) * 0.08, 0, Math.cos(time * 1.6 + d.phase) * 0.08);
          dummy.scale.set(0.32, 0.4, 0.32);
          dummy.updateMatrix();
          lanternMesh.setMatrixAt(i, dummy.matrix);
        }
        lanternMesh.instanceMatrix.needsUpdate = true;
      }

      for (let i = 0; i < mist.length; i++) {
        const d = mist[i];
        const x = d.x + Math.sin(time * 0.05 + d.phase) * 7;
        d.mesh.position.x = x;
        d.mesh.position.z = d.z + Math.sin(time * 0.033 + d.phase * 1.3) * 15;
        d.mesh.position.y = d.y + Math.sin(time * 0.045 + d.phase) * 1.8;
        d.mesh.material.opacity = d.o * (0.78 + 0.22 * Math.sin(time * 0.09 + d.phase));
      }

      for (let i = 0; i < pData.length; i++) {
        const d = pData[i];
        if (!d.moving) continue;
        const t = (d.t + time * 0.0035 + d.phase * 0.002) % 1;
        const sp = samplePath(pathPts, t);
        tmpPos.copy(sp.pos);
        tmpPos.x += sp.side.x * d.side;
        tmpPos.z += sp.side.z * d.side;
        tmpPos.y = terrainHeight(tmpPos.x, tmpPos.z) + 0.08;
        tmpQ2.setFromAxisAngle(UP, sp.yaw);
        dummy.position.copy(tmpPos);
        dummy.quaternion.copy(tmpQ2);
        dummy.scale.set(d.sc, d.sc, d.sc);
        dummy.updateMatrix();
        bodyMesh.setMatrixAt(i, dummy.matrix);
        headMesh.setMatrixAt(i, dummy.matrix);
      }
      bodyMesh.instanceMatrix.needsUpdate = true;
      headMesh.instanceMatrix.needsUpdate = true;
    },
  };
}

/* ------------------------------------------------------------------ */
/* Entry                                                               */
/* ------------------------------------------------------------------ */

export function buildMaijishanOverlay() {
  const group = new THREE.Group();
  console.log('MJ massif');
  buildMassif(group);
  console.log('MJ caves');
  const caves = buildCaves(group);
  console.log('MJ shrines');
  buildShrines(group, caves.mouthGeo, caves.rimGeo, caves.mouthMat, caves.rimMat);
  console.log('MJ walkways');
  const walk = buildWalkways(group);
  console.log('MJ flags');
  const flags = buildFlags(group);
  console.log('MJ forest');
  buildForest(group);
  console.log('MJ ridges');
  buildRidges(group);
  console.log('MJ path');
  const pathPts = buildPath(group);
  console.log('MJ pilgrims');
  const pilgrims = buildPilgrims(group, pathPts);
  console.log('MJ mist');
  const mist = buildMist(group);

  colliders.push({ name: '麦积山崖壁', minX: 336, maxX: 540, minZ: -192, maxZ: 192 });
  colliders.push({ name: '麦积山东崖大佛', minX: 316, maxX: 348, minZ: 34, maxZ: 78 });

  const life = makeLife(flags, walk, mist, pilgrims);
  life.update(0);

  console.log('MJ merge start', group.children.length);
  const merged = mergeStaticGroup(group);
  console.log('MJ merge done', merged.children.length);
  return {
    group: merged,
    life,
    flags,
    mist,
    pilgrims,
    cliffs: { center: [CX, BASE_Y, CZ], height: H },
  };
}
