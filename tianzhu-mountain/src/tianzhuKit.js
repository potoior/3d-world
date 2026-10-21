import * as THREE from 'three';
import { mats } from './materials.js';

export const tileMat = new THREE.MeshStandardMaterial({
  color: 0x39434b,
  roughness: 0.78,
  metalness: 0.06,
  flatShading: true,
});
export const wallMat = new THREE.MeshStandardMaterial({ color: 0xd8cfba, roughness: 0.97 });
export const lacquerMat = new THREE.MeshStandardMaterial({ color: 0x772b24, roughness: 0.7 });
export const goldMat = new THREE.MeshStandardMaterial({ color: 0xb28d4f, roughness: 0.5, metalness: 0.32 });
export const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x493526, roughness: 0.94 });
export const lanternMat = new THREE.MeshStandardMaterial({
  color: 0xa63b2b,
  roughness: 0.55,
  emissive: 0x451109,
  emissiveIntensity: 0.7,
});

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function colorize(geo, base, variance, seed) {
  const p = geo.attributes.position;
  const colors = new Float32Array(p.count * 3);
  const c = new THREE.Color();
  const rand = mulberry32(seed);
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    const n = 0.82 + rand() * variance;
    c.copy(base).multiplyScalar(n);
    const band = Math.sin(y * 0.85 + p.getX(i) * 0.12) * 0.055;
    colors[i * 3] = Math.max(0, c.r + band);
    colors[i * 3 + 1] = Math.max(0, c.g + band);
    colors[i * 3 + 2] = Math.max(0, c.b + band);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo;
}

export class Bucket {
  constructor() {
    this.map = new Map();
  }
  add(geo, mat) {
    if (!this.map.has(mat)) this.map.set(mat, []);
    this.map.get(mat).push(geo);
  }
  finish(name) {
    const group = new THREE.Group();
    group.name = name;
    for (const [mat, list] of this.map) {
      if (!list.length) continue;
      const geo = mergeList(list);
      if (!geo) continue;
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = !mat.userData?.noShadow;
      mesh.receiveShadow = true;
      group.add(mesh);
    }
    return group;
  }
}

function mergeList(list) {
  const prepared = list.map((g) => (g.index ? g.toNonIndexed() : g));
  const merged = mergePrepared(prepared);
  prepared.forEach((g, i) => {
    g.dispose();
    if (g !== list[i]) list[i].dispose();
  });
  return merged;
}

function mergePrepared(list) {
  const positions = [];
  const normals = [];
  const uvs = [];
  const colors = [];
  let hasUv = true;
  let hasColor = true;
  for (const g of list) {
    const p = g.attributes.position;
    const n = g.attributes.normal;
    const uv = g.attributes.uv;
    const col = g.attributes.color;
    if (!uv) hasUv = false;
    if (!col) hasColor = false;
    for (let i = 0; i < p.count; i++) {
      positions.push(p.getX(i), p.getY(i), p.getZ(i));
      normals.push(n.getX(i), n.getY(i), n.getZ(i));
      if (uv) uvs.push(uv.getX(i), uv.getY(i));
      if (col) colors.push(col.getX(i), col.getY(i), col.getZ(i));
    }
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  if (hasUv) out.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  if (hasColor) out.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  out.computeBoundingSphere();
  return out;
}

function pushGeo(list, geo, mat) {
  if (list && typeof list.add === 'function') list.add(geo, mat);
  else list.push(geo);
  return geo;
}

export function addBox(list, w, h, d, x, y, z, ry = 0, rx = 0, rz = 0, mat = mats.stone) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (rx) g.rotateX(rx);
  if (rz) g.rotateZ(rz);
  if (ry) g.rotateY(ry);
  g.translate(x, y, z);
  return pushGeo(list, g, mat);
}

export function addCyl(list, rt, rb, h, seg, x, y, z, rx = 0, rz = 0, mat = mats.stone) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg, 1, false);
  if (rx) g.rotateX(rx);
  if (rz) g.rotateZ(rz);
  g.translate(x, y, z);
  return pushGeo(list, g, mat);
}

export function segGeo(ax, ay, az, bx, by, bz, ra, rb, seg = 5) {
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

export function addRock(bucket, size, x, y, z, seed, squash = 0.8, mat = null) {
  const geo = new THREE.DodecahedronGeometry(size, 0);
  const p = geo.attributes.position;
  const rand = mulberry32(seed);
  for (let i = 0; i < p.count; i++) {
    const k = 0.7 + rand() * 0.62;
    p.setXYZ(i, p.getX(i) * k, p.getY(i) * squash * (0.74 + rand() * 0.52), p.getZ(i) * k);
  }
  geo.computeVertexNormals();
  geo.rotateY(rand() * 6.2);
  geo.translate(x, y, z);
  bucket.add(geo, mat || (rand() < 0.5 ? mats.graniteLight : mats.graniteDark));
  return geo;
}

export function chainSpan(bucket, ax, ay, az, bx, by, bz, sag = 0.3, radius = 0.045) {
  let px = ax;
  let py = ay;
  let pz = az;
  const steps = 4;
  for (let i = 1; i <= steps; i++) {
    const k = i / steps;
    const nx = ax + (bx - ax) * k;
    const nz = az + (bz - az) * k;
    const ny = ay + (by - ay) * k - Math.sin(k * Math.PI) * sag;
    bucket.add(segGeo(px, py, pz, nx, ny, nz, radius, radius, 4), mats.iron);
    px = nx;
    py = ny;
    pz = nz;
  }
}

export function addPine(bucket, x, y, z, h, leanDir, seed) {
  const rand = mulberry32(seed);
  const lean = h * (0.16 + rand() * 0.22);
  const tx = Math.cos(leanDir) * lean;
  const tz = Math.sin(leanDir) * lean;
  const topX = x + tx;
  const topZ = z + tz;
  bucket.add(segGeo(x, y - 0.5, z, x + tx * 0.32, y + h * 0.5, z + tz * 0.32, 0.28 + h * 0.012, 0.16 + h * 0.006, 6), mats.trunk);
  bucket.add(segGeo(x + tx * 0.32, y + h * 0.5, z + tz * 0.32, topX, y + h * 0.94, topZ, 0.16 + h * 0.006, 0.07, 5), mats.trunk);

  const pads = [mats.pineDeep, mats.pine, mats.pineLight, mats.pineSun];
  const tiers = 4;
  for (let i = 0; i < tiers; i++) {
    const k = i / (tiers - 1);
    const cx = x + tx * (0.38 + k * 0.6);
    const cz = z + tz * (0.38 + k * 0.6);
    const cy = y + h * (0.5 + k * 0.4);
    const a = leanDir + Math.PI + (rand() - 0.5) * 1.7;
    const reach = h * (0.16 + rand() * 0.16) * (1.08 - k * 0.36);
    const ex = cx + Math.cos(a) * reach;
    const ez = cz + Math.sin(a) * reach;
    bucket.add(segGeo(cx, cy, cz, ex, cy + (rand() - 0.35) * 0.55, ez, 0.07, 0.025, 4), mats.trunk);
    for (let n = 0; n < 4; n++) {
      const pad = new THREE.IcosahedronGeometry(1, 0);
      const r = reach * (0.55 + rand() * 0.45);
      pad.scale(r, r * (0.2 + rand() * 0.12), r * (0.7 + rand() * 0.4));
      pad.rotateY(rand() * 6.2);
      pad.translate(
        ex + (rand() - 0.5) * reach * 0.7,
        cy + (rand() - 0.25) * 0.8,
        ez + (rand() - 0.5) * reach * 0.7
      );
      bucket.add(pad, pads[(i + n) % pads.length]);
    }
    if (i === 1 || i === 3) {
      const bx = cx + Math.cos(a + 1.1) * reach * 0.8;
      const bz = cz + Math.sin(a + 1.1) * reach * 0.8;
      bucket.add(segGeo(cx, cy - 0.15, cz, bx, cy - 0.6, bz, 0.045, 0.018, 4), mats.trunk);
      for (let n = 0; n < 2; n++) {
        const pad = new THREE.IcosahedronGeometry(1, 0);
        const r = reach * (0.35 + rand() * 0.3);
        pad.scale(r, r * 0.22, r * 0.8);
        pad.rotateY(rand() * 6.2);
        pad.translate(bx, cy - 0.55, bz);
        bucket.add(pad, pads[(i + n + 1) % pads.length]);
      }
    }
  }
  for (let n = 0; n < 3; n++) {
    const pad = new THREE.IcosahedronGeometry(1, 0);
    const r = h * (0.09 + rand() * 0.06);
    pad.scale(r, r * 0.3, r * 0.8);
    pad.rotateY(rand() * 6.2);
    pad.translate(
      topX + (rand() - 0.5) * h * 0.1,
      y + h * (0.94 + rand() * 0.05),
      topZ + (rand() - 0.5) * h * 0.1
    );
    bucket.add(pad, pads[n % pads.length]);
  }
}
