import * as THREE from 'three';
import { mats } from './putuoshanTextures.js';
import { mesh, mergeBoxes } from './psUtil.js';

function samplePath(points, heightFn, spacing) {
  const vecs = points.map(([x, z]) => new THREE.Vector3(x, heightFn(x, z) + 0.28, z));
  const curve = new THREE.CatmullRomCurve3(vecs, false, 'centripetal', 0.5);
  const length = curve.getLength();
  const n = Math.max(2, Math.ceil(length / spacing));
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p = curve.getPointAt(t);
    const tan = curve.getTangentAt(t);
    out.push({ p, tan, yaw: Math.atan2(tan.x, tan.z), t });
  }
  return out;
}

export function createStonePath(points, heightFn, { width = 3.6, spacing = 1.7, lamps = true, curb = true } = {}) {
  const g = new THREE.Group();
  g.name = 'stone-pilgrim-path';
  const samples = samplePath(points, heightFn, spacing);
  const treads = [];
  const risers = [];
  const curbs = [];
  const posts = [];
  const lampsG = [];
  const clearance = [];

  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    const y = s.p.y;
    const tread = new THREE.BoxGeometry(width, 0.26, spacing + 0.32);
    tread.rotateY(s.yaw);
    tread.translate(s.p.x, y, s.p.z);
    treads.push(tread);
    if (i > 0) {
      const prev = samples[i - 1].p;
      const dy = prev.y - y;
      if (dy > 0.16) {
        const r = new THREE.BoxGeometry(width, Math.min(1.6, dy + 0.02), 0.34);
        r.rotateY(s.yaw);
        r.translate(s.p.x, y - dy * 0.5 + 0.02, s.p.z);
        risers.push(r);
      }
    }
    if (curb && i % 2 === 0) {
      const nx = s.tan.z;
      const nz = -s.tan.x;
      const len = Math.hypot(nx, nz) || 1;
      for (const side of [-1, 1]) {
        const c = new THREE.BoxGeometry(0.34, 0.34, spacing * 2.1);
        c.rotateY(s.yaw);
        c.translate(s.p.x + (nx / len) * side * (width * 0.5 + 0.16), y + 0.24, s.p.z + (nz / len) * side * (width * 0.5 + 0.16));
        curbs.push(c);
      }
    }
    if (i % 5 === 0) clearance.push({ x: s.p.x, z: s.p.z, r: width * 0.9 + 2.4 });
    if (lamps && i > 0 && i % 16 === 0) {
      const nx = s.tan.z;
      const nz = -s.tan.x;
      const len = Math.hypot(nx, nz) || 1;
      const lx = s.p.x + (nx / len) * (width * 0.5 + 1.0);
      const lz = s.p.z + (nz / len) * (width * 0.5 + 1.0);
      const gy = heightFn(lx, lz);
      const post = new THREE.CylinderGeometry(0.16, 0.22, 2.9, 6);
      post.translate(lx, gy + 1.45, lz);
      posts.push(post);
      const cap = new THREE.BoxGeometry(0.62, 0.16, 0.62);
      cap.translate(lx, gy + 2.95, lz);
      posts.push(cap);
      const lamp = new THREE.BoxGeometry(0.42, 0.62, 0.42);
      lamp.translate(lx, gy + 2.66, lz);
      lampsG.push(lamp);
    }
  }

  if (treads.length) mesh(g, mergeBoxes(treads), mats.path);
  if (risers.length) mesh(g, mergeBoxes(risers), mats.stoneDark);
  if (curbs.length) mesh(g, mergeBoxes(curbs), mats.stone);
  if (posts.length) mesh(g, mergeBoxes(posts), mats.stoneDark);
  if (lampsG.length) mesh(g, mergeBoxes(lampsG), mats.lamp, false, false);
  return { group: g, clearance, samples };
}

export function createRailFence(points, heightFn, { width = 2.6, height = 1.15 } = {}) {
  const g = new THREE.Group();
  const samples = samplePath(points, heightFn, 2.4);
  const posts = [];
  const rails = [];
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    if (i % 2 === 0) {
      const post = new THREE.CylinderGeometry(0.13, 0.17, height + 0.3, 6);
      post.translate(s.p.x, s.p.y + (height + 0.3) * 0.5, s.p.z);
      posts.push(post);
    }
    if (i > 0) {
      const q = samples[i - 1].p;
      const dx = s.p.x - q.x;
      const dy = s.p.y - q.y;
      const dz = s.p.z - q.z;
      const len = Math.hypot(dx, dy, dz);
      const rail = new THREE.CylinderGeometry(0.075, 0.075, len, 5);
      const mid = new THREE.Vector3((q.x + s.p.x) * 0.5, (q.y + s.p.y) * 0.5 + height, (q.z + s.p.z) * 0.5);
      const dir = new THREE.Vector3(dx, dy, dz).normalize();
      const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      rail.applyQuaternion(quat);
      rail.translate(mid.x, mid.y, mid.z);
      rails.push(rail);
    }
  }
  mesh(g, mergeBoxes(posts), mats.stoneDark);
  mesh(g, mergeBoxes(rails), mats.stone);
  return g;
}
