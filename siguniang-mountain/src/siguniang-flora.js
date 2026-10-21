import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  heightAt,
  inPool,
  makeFlowerTexture,
  rand,
  streamDistance,
} from './siguniang-util.js';

const AVOID = [
  [0, -1200, 80],
  [680, -260, 58],
  [-380, -500, 62],
  [420, -650, 72],
  [780, -1150, 90],
  [-120, 40, 45],
];

function nearView(x, z) {
  for (const [vx, vz, r] of AVOID) {
    if (Math.hypot(x - vx, z - vz) < r) return true;
  }
  return false;
}

function terrainSlope(x, z) {
  const e = 7;
  const hx = heightAt(x + e, z) - heightAt(x - e, z);
  const hz = heightAt(x, z + e) - heightAt(x, z - e);
  return Math.hypot(hx, hz) / (2 * e);
}

function makeConiferGeometry() {
  const parts = [];
  const trunk = new THREE.CylinderGeometry(0.16, 0.28, 2.8, 6, 1);
  trunk.translate(0, 1.4, 0);
  parts.push(trunk);
  for (let i = 0; i < 4; i++) {
    const r = 2.05 * (1 - i * 0.2);
    const hh = 3.7 * (1 - i * 0.1);
    const cone = new THREE.ConeGeometry(r, hh, 8, 1, true);
    cone.translate(0, 2.15 + i * 2.06 + hh * 0.5, 0);
    parts.push(cone);
  }
  const geo = mergeGeometries(parts, false);
  parts.forEach((g) => g.dispose());
  return geo;
}

function makeTuftGeometry() {
  const pos = [];
  const col = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + rand(41, i) * 0.7;
    const lean = 0.16 + rand(43, i) * 0.3;
    const h = 0.5 + rand(47, i) * 0.95;
    const w = 0.05 + rand(53, i) * 0.045;
    const dx = Math.cos(a);
    const dz = Math.sin(a);
    pos.push(-dz * w, 0, dx * w, dz * w, 0, -dx * w, dx * lean, h, dz * lean);
    const shade = 0.78 + rand(59, i) * 0.35;
    for (let k = 0; k < 3; k++) col.push(shade, shade * 1.03, shade * 0.9);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.computeVertexNormals();
  return geo;
}

export function createForest(mats) {
  const group = new THREE.Group();
  const geo = makeConiferGeometry();
  const maxConifer = 3300;
  const maxLarch = 1050;
  const conifers = new THREE.InstancedMesh(geo, mats.pine, maxConifer);
  const larches = new THREE.InstancedMesh(geo, mats.larch, maxLarch);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  const e = new THREE.Euler();
  const color = new THREE.Color();
  let nc = 0;
  let nl = 0;
  let attempts = 0;

  while ((nc < maxConifer || nl < maxLarch) && attempts < 34000) {
    attempts++;
    const x = -1650 + rand(1001, attempts) * 3300;
    const z = -1020 + rand(1007, attempts) * 2320;
    const h = heightAt(x, z);
    if (h < 9 || h > 214) continue;
    if (inPool(x, z, 1.45)) continue;
    if (streamDistance(x, z) < 48 && z < 330) continue;
    if (nearView(x, z)) continue;
    if (terrainSlope(x, z) > 1.18) continue;
    const isLarch = nl < maxLarch && h > 24 && h < 178 && streamDistance(x, z) > 58 &&
      rand(1013, attempts) > 0.62 && (z > -320 || x > 220);
    if (!isLarch && nc >= maxConifer) continue;
    const target = isLarch ? larches : conifers;
    const idx = isLarch ? nl++ : nc++;
    const scale = (isLarch ? 1.05 : 0.9) + rand(1019, attempts) * (isLarch ? 0.7 : 1.05);
    p.set(x, h - 0.15, z);
    e.set(0, rand(1021, attempts) * Math.PI * 2, 0);
    q.setFromEuler(e);
    s.set(scale * (0.82 + rand(1027, attempts) * 0.3), scale, scale * (0.82 + rand(1031, attempts) * 0.3));
    m.compose(p, q, s);
    target.setMatrixAt(idx, m);
    if (isLarch) {
      const t = rand(1033, attempts);
      color.setHSL(0.09 + t * 0.035, 0.56 + t * 0.16, 0.36 + rand(1037, attempts) * 0.14);
    } else {
      const t = rand(1039, attempts);
      color.setHSL(0.32 + t * 0.045, 0.26 + t * 0.18, 0.16 + rand(1041, attempts) * 0.12);
    }
    target.setColorAt(idx, color);
  }

  conifers.count = nc;
  larches.count = nl;
  conifers.castShadow = true;
  conifers.receiveShadow = true;
  larches.castShadow = true;
  larches.receiveShadow = true;
  if (conifers.instanceColor) conifers.instanceColor.needsUpdate = true;
  if (larches.instanceColor) larches.instanceColor.needsUpdate = true;
  group.add(conifers, larches);
  return { group, count: nc + nl, conifers: nc, larches: nl };
}

export function createRocks(mats) {
  const count = 560;
  const mesh = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), mats.rock, count);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  const e = new THREE.Euler();
  const color = new THREE.Color();
  let n = 0;
  let attempts = 0;
  while (n < count && attempts < 6000) {
    attempts++;
    const x = -1300 + rand(1201, attempts) * 2600;
    const z = -900 + rand(1211, attempts) * 1900;
    const h = heightAt(x, z);
    if (h > 300 || inPool(x, z, 1.1) || nearView(x, z)) continue;
    const sd = streamDistance(x, z);
    if (sd < 5) continue;
    const size = (sd < 24 ? 0.5 : 0.8) + rand(1217, attempts) * (sd < 24 ? 3.2 : 5.4);
    p.set(x, h + size * 0.22 - 0.25, z);
    e.set(rand(1223, attempts) * 0.6, rand(1229, attempts) * Math.PI * 2, rand(1231, attempts) * 0.6);
    q.setFromEuler(e);
    s.set(
      size * (0.8 + rand(1237, attempts) * 0.7),
      size * (0.6 + rand(1249, attempts) * 0.55),
      size * (0.8 + rand(1259, attempts) * 0.7)
    );
    m.compose(p, q, s);
    mesh.setMatrixAt(n, m);
    const t = rand(1277, attempts);
    color.setHSL(0.1 + t * 0.03, 0.05 + t * 0.08, 0.27 + rand(1279, attempts) * 0.2);
    mesh.setColorAt(n, color);
    n++;
  }
  mesh.count = n;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return mesh;
}

export function createMeadow(mats) {
  const group = new THREE.Group();
  const count = 7200;
  const tuft = new THREE.InstancedMesh(makeTuftGeometry(), mats.grass, count);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  const e = new THREE.Euler();
  const color = new THREE.Color();
  let n = 0;
  let attempts = 0;
  while (n < count && attempts < 26000) {
    attempts++;
    const x = -520 + rand(1301, attempts) * 1040;
    const z = -660 + rand(1307, attempts) * 1040;
    const h = heightAt(x, z);
    if (h > 36 || inPool(x, z, 1.08)) continue;
    const sd = streamDistance(x, z);
    if (sd < 3.4) continue;
    const scale = 0.55 + rand(1319, attempts) * 0.95;
    p.set(x, h - 0.05, z);
    e.set(0, rand(1321, attempts) * Math.PI * 2, (rand(1327, attempts) - 0.5) * 0.16);
    q.setFromEuler(e);
    s.set(scale, scale * (0.8 + rand(1329, attempts) * 0.65), scale);
    m.compose(p, q, s);
    tuft.setMatrixAt(n, m);
    const t = rand(1361, attempts);
    color.setHSL(0.16 + t * 0.06, 0.34 + rand(1367, attempts) * 0.2, 0.3 + rand(1373, attempts) * 0.16);
    tuft.setColorAt(n, color);
    n++;
  }
  tuft.count = n;
  tuft.receiveShadow = true;
  if (tuft.instanceColor) tuft.instanceColor.needsUpdate = true;
  group.add(tuft);

  const flowerCount = 3600;
  const fpos = new Float32Array(flowerCount * 3);
  const fcol = new Float32Array(flowerCount * 3);
  const fc = new THREE.Color();
  let fn = 0;
  attempts = 0;
  while (fn < flowerCount && attempts < 16000) {
    attempts++;
    const x = -450 + rand(1401, attempts) * 900;
    const z = -610 + rand(1407, attempts) * 900;
    const h = heightAt(x, z);
    if (h > 27 || inPool(x, z, 1.1)) continue;
    if (streamDistance(x, z) < 4.5) continue;
    fpos[fn * 3] = x;
    fpos[fn * 3 + 1] = h + 0.45 + rand(1411, attempts) * 0.55;
    fpos[fn * 3 + 2] = z;
    const t = rand(1417, attempts);
    fc.setHSL(t < 0.4 ? 0.14 : t < 0.7 ? 0.02 : 0.72, 0.5 + rand(1423, attempts) * 0.2, 0.58 + rand(1429, attempts) * 0.18);
    fcol[fn * 3] = fc.r;
    fcol[fn * 3 + 1] = fc.g;
    fcol[fn * 3 + 2] = fc.b;
    fn++;
  }
  const fgeo = new THREE.BufferGeometry();
  fgeo.setAttribute('position', new THREE.BufferAttribute(fpos, 3));
  fgeo.setAttribute('color', new THREE.BufferAttribute(fcol, 3));
  const flowers = new THREE.Points(fgeo, new THREE.PointsMaterial({
    map: makeFlowerTexture(),
    size: 1.15,
    transparent: true,
    alphaTest: 0.18,
    depthWrite: false,
    vertexColors: true,
    sizeAttenuation: true,
  }));
  group.add(flowers);
  return { group, grass: n, flowers: fn };
}
