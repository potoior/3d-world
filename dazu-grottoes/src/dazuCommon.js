import * as THREE from 'three';
import { riverCenter, riverHalfWidth } from './terrain.js';

const MATS = new Map();
export function mat(color, rough = 0.96, extra = null) {
  const key = color + ':' + rough + ':' + (extra ? JSON.stringify(extra) : '');
  if (!MATS.has(key)) MATS.set(key, new THREE.MeshStandardMaterial({ color, roughness: rough, ...(extra || {}) }));
  return MATS.get(key);
}

export const M = {
  rockA: mat(0xad7f5c, 0.99),
  rockB: mat(0x9b6b4b, 0.99),
  rockC: mat(0x87573d, 0.99),
  rockPale: mat(0xc49b75, 0.98),
  rockDark: mat(0x5f3f2d, 0.99),
  caveDark: mat(0x261b14, 1),
  caveBack: mat(0x38261b, 1),
  carve: mat(0xc6a17a, 0.97),
  carveWarm: mat(0xbc9070, 0.97),
  clay: mat(0xa9765a, 0.98),
  stone: mat(0xa79980, 0.97),
  stoneDark: mat(0x736754, 0.98),
  wood: mat(0x67462c, 0.9),
  woodDark: mat(0x452e1d, 0.92),
  woodRed: mat(0x7c352a, 0.86),
  roof: mat(0x38443f, 0.8, { metalness: 0.12, side: THREE.DoubleSide }),
  roofEdge: mat(0x4c5b50, 0.78, { metalness: 0.16 }),
  gold: mat(0xc29845, 0.4, { metalness: 0.42 }),
  bronze: mat(0x625d44, 0.64, { metalness: 0.24 }),
  pigmentRed: mat(0x8f3c32, 0.95),
  pigmentGreen: mat(0x4d6c55, 0.95),
  pigmentBlue: mat(0x3f6074, 0.95),
  pigmentWhite: mat(0xd8cbb2, 0.96),
  moss: mat(0x5d6c45, 0.98),
  pine: mat(0x3e5239, 0.94),
  trunk: mat(0x4a3624, 0.97),
  visitorA: mat(0x554436, 0.95),
  visitorB: mat(0x3e4c52, 0.95),
  visitorC: mat(0x6d5435, 0.95),
  monk: mat(0x6f5a40, 0.97),
  lantern: mat(0x9d3227, 0.55, { emissive: 0x3c0b06, emissiveIntensity: 1.2 }),
};

export const UP = new THREE.Vector3(0, 1, 0);

export function add(g, geo, m, x, y, z) {
  const o = new THREE.Mesh(geo, m);
  o.position.set(x, y, z);
  o.castShadow = true;
  o.receiveShadow = true;
  g.add(o);
  return o;
}

export function box(g, w, h, d, m, x, y, z, ry = 0, rz = 0) {
  const geo = new THREE.BoxGeometry(w, h, d);
  if (rz) geo.rotateZ(rz);
  if (ry) geo.rotateY(ry);
  geo.translate(x, y, z);
  return add(g, geo, m, 0, 0, 0);
}

export function cyl(g, rt, rb, h, seg, m, x, y, z, ry = 0) {
  const geo = new THREE.CylinderGeometry(rt, rb, h, seg);
  if (ry) geo.rotateY(ry);
  geo.translate(x, y, z);
  return add(g, geo, m, 0, 0, 0);
}

export function ball(g, seg, m, x, y, z, sx, sy, sz) {
  const geo = new THREE.SphereGeometry(1, seg, Math.max(4, seg - 2));
  geo.scale(sx, sy, sz);
  geo.translate(x, y, z);
  return add(g, geo, m, 0, 0, 0);
}

export function bar3(g, ax, ay, az, bx, by, bz, r, m, seg = 6, rb = null) {
  const dx = bx - ax;
  const dy = by - ay;
  const dz = bz - az;
  const len = Math.hypot(dx, dy, dz);
  if (len < 0.001) return;
  const geo = new THREE.CylinderGeometry(rb === null ? r : rb, r, len, seg);
  const o = new THREE.Mesh(geo, m);
  o.position.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
  o.quaternion.setFromUnitVectors(UP, new THREE.Vector3(dx / len, dy / len, dz / len));
  o.castShadow = true;
  o.receiveShadow = true;
  g.add(o);
}

export function archRing(g, x, ySpring, z, radius, tube, m, segments = 12) {
  const geo = new THREE.TorusGeometry(radius, tube, 5, segments, Math.PI);
  geo.rotateY(Math.PI / 2);
  geo.translate(x, ySpring, z);
  return add(g, geo, m, 0, 0, 0);
}

export function patch(g, x, y, z, w, h, m, tilt = 0) {
  const geo = new THREE.PlaneGeometry(w, h);
  geo.rotateY(-Math.PI / 2);
  if (tilt) geo.rotateX(tilt);
  geo.translate(x, y, z);
  const o = new THREE.Mesh(geo, m);
  o.receiveShadow = true;
  g.add(o);
  return o;
}

export function ringY(g, x, y, z, radius, tube, m, segments = 20, rotZ = 0) {
  const geo = new THREE.TorusGeometry(radius, tube, 5, segments);
  geo.rotateY(Math.PI / 2);
  if (rotZ) geo.rotateZ(rotZ);
  geo.translate(x, y, z);
  return add(g, geo, m, 0, 0, 0);
}

export function frontAt(z) {
  return riverCenter(z) + riverHalfWidth(z) + 27;
}

export function topAt(z) {
  return 74 + 7.5 * Math.sin(z * 0.021 + 0.9) + 3.6 * Math.sin(z * 0.057 - 0.4);
}
