import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export function mesh(parent, geometry, material, cast = true, receive = true) {
  const m = new THREE.Mesh(geometry, material);
  m.castShadow = cast;
  m.receiveShadow = receive;
  parent.add(m);
  return m;
}

export function box(parent, material, w, h, d, x, y, z, ry = 0, rx = 0, rz = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (rx) g.rotateX(rx);
  if (rz) g.rotateZ(rz);
  if (ry) g.rotateY(ry);
  g.translate(x, y, z);
  return mesh(parent, g, material);
}

export function cyl(parent, material, rt, rb, h, seg, x, y, z, ry = 0) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  if (ry) g.rotateY(ry);
  g.translate(x, y, z);
  return mesh(parent, g, material);
}

export function tube(parent, material, points, radius, radial = 5) {
  const curve = new THREE.CatmullRomCurve3(points);
  const geo = new THREE.TubeGeometry(curve, Math.max(5, points.length * 2), radius, radial, false);
  return mesh(parent, geo, material);
}

export function colorize(geo, color, variance = 0.12, seed = 1) {
  const p = geo.attributes.position;
  const colors = new Float32Array(p.count * 3);
  const base = new THREE.Color(color);
  let a = seed >>> 0;
  const rnd = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = 0; i < p.count; i++) {
    const v = 1 + (rnd() - 0.5) * variance;
    colors[i * 3] = base.r * v;
    colors[i * 3 + 1] = base.g * v;
    colors[i * 3 + 2] = base.b * v;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo;
}

export function mergeBoxes(list, dispose = true) {
  if (!list.length) return new THREE.BufferGeometry();
  const prepared = list.map((g) => {
    let geo = g.index ? g.toNonIndexed() : g;
    if (!geo.attributes.uv) {
      const n = geo.attributes.position.count;
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(n * 2), 2));
    }
    return geo;
  });
  const merged = mergeGeometries(prepared, false);
  for (let i = 0; i < prepared.length; i++) {
    if (prepared[i] !== list[i]) prepared[i].dispose();
    if (dispose) list[i].dispose();
  }
  return merged;
}

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

export function gauss2(x, z, cx, cz, sigma) {
  const dx = x - cx;
  const dz = z - cz;
  return Math.exp(-(dx * dx + dz * dz) / (2 * sigma * sigma));
}

export function smoothstep(a, b, x) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}
