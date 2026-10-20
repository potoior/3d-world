import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const tmpColor = new THREE.Color();
const tmpMatrix = new THREE.Matrix4();
const tmpQuat = new THREE.Quaternion();
const tmpEuler = new THREE.Euler();
const tmpVec = new THREE.Vector3();
const up = new THREE.Vector3(0, 1, 0);

export function paint(geo, color) {
  const n = geo.attributes.position.count;
  const arr = new Float32Array(n * 3);
  tmpColor.set(color);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = tmpColor.r;
    arr[i * 3 + 1] = tmpColor.g;
    arr[i * 3 + 2] = tmpColor.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}

function place(geo, x, y, z, rx, ry, rz) {
  if (rx || ry || rz) {
    tmpEuler.set(rx || 0, ry || 0, rz || 0);
    tmpQuat.setFromEuler(tmpEuler);
    tmpMatrix.makeRotationFromQuaternion(tmpQuat);
    geo.applyMatrix4(tmpMatrix);
  }
  geo.translate(x || 0, y || 0, z || 0);
  return geo;
}

export function box(w, h, d, color, x, y, z, ry, rx, rz) {
  const g = new THREE.BoxGeometry(w, h, d);
  paint(g, color);
  return place(g, x, y, z, rx, ry, rz);
}

export function cyl(rt, rb, h, seg, color, x, y, z, rx, ry, rz) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg, 1);
  paint(g, color);
  return place(g, x, y, z, rx, ry, rz);
}

export function sph(r, color, x, y, z, sx, sy, sz, seg = 8) {
  const g = new THREE.SphereGeometry(r, seg, Math.max(5, seg >> 1));
  paint(g, color);
  g.scale(sx || 1, sy || 1, sz || 1);
  g.translate(x || 0, y || 0, z || 0);
  return g;
}

export function ico(r, color, x, y, z, detail = 0) {
  const g = new THREE.IcosahedronGeometry(r, detail);
  paint(g, color);
  g.translate(x || 0, y || 0, z || 0);
  return g;
}

export function cone(r, h, seg, color, x, y, z, rx, ry, rz) {
  const g = new THREE.ConeGeometry(r, h, seg, 1);
  paint(g, color);
  return place(g, x, y, z, rx, ry, rz);
}

export function merge(parts) {
  if (!parts.length) return null;
  return mergeGeometries(parts, false);
}

export function mesh(geo, material, cast = true, receive = true) {
  const m = new THREE.Mesh(geo, material);
  m.castShadow = cast;
  m.receiveShadow = receive;
  return m;
}

export function beam(a, b, r, color, seg = 5) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const dz = b[2] - a[2];
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.001;
  const g = new THREE.CylinderGeometry(r, r, len, seg, 1);
  paint(g, color);
  tmpVec.set(dx / len, dy / len, dz / len);
  tmpQuat.setFromUnitVectors(up, tmpVec);
  tmpMatrix.makeRotationFromQuaternion(tmpQuat);
  g.applyMatrix4(tmpMatrix);
  g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  return g;
}

export function instanced(geo, material, items, cast = true, receive = true) {
  const m = new THREE.InstancedMesh(geo, material, items.length);
  const o = new THREE.Object3D();
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    o.position.set(it.p[0], it.p[1], it.p[2]);
    o.rotation.set(it.r ? it.r[0] : 0, it.r ? it.r[1] : 0, it.r ? it.r[2] : 0);
    const s = it.s === undefined ? 1 : it.s;
    if (Array.isArray(s)) o.scale.set(s[0], s[1], s[2]);
    else o.scale.setScalar(s);
    o.updateMatrix();
    m.setMatrixAt(i, o.matrix);
    if (it.c !== undefined) m.setColorAt(i, tmpColor.set(it.c));
  }
  m.instanceMatrix.needsUpdate = true;
  if (m.instanceColor) m.instanceColor.needsUpdate = true;
  m.castShadow = cast;
  m.receiveShadow = receive;
  m.frustumCulled = false;
  return m;
}

export function ribbon(points, width, color, yFn, xoff = 0, zoff = 0) {
  if (points.length < 2) return null;
  const pos = [];
  const col = [];
  const idx = [];
  const uv = [];
  const c = new THREE.Color(color);
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const a = points[Math.max(0, i - 1)];
    const b = points[Math.min(points.length - 1, i + 1)];
    let dx = b[0] - a[0];
    let dz = b[1] - a[1];
    const len = Math.hypot(dx, dz) || 1;
    dx /= len;
    dz /= len;
    const nx = -dz * width * 0.5;
    const nz = dx * width * 0.5;
    const x = p[0] + xoff;
    const z = p[1] + zoff;
    const y = yFn ? yFn(x, z) : 0;
    pos.push(x + nx, y, z + nz, x - nx, y, z - nz);
    col.push(c.r, c.g, c.b, c.r, c.g, c.b);
    uv.push(0, i * 0.2, 1, i * 0.2);
    if (i < points.length - 1) {
      const k = i * 2;
      idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export function swayMaterial(material, strength = 0.14, speed = 1.4) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uSwayTime = { value: 0 };
    material.userData.shader = shader;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uSwayTime;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        float bend = uv.y * uv.y;
        transformed.x += sin(uSwayTime * ${speed.toFixed(2)} + position.x * 0.6 + position.z * 0.4) * bend * ${strength.toFixed(3)};
        transformed.z += cos(uSwayTime * ${(speed * 0.8).toFixed(2)} + position.z * 0.5) * bend * ${(strength * 0.6).toFixed(3)};`
      );
  };
  return material;
}

export function updateSway(material, time) {
  const shader = material.userData && material.userData.shader;
  if (shader && shader.uniforms.uSwayTime) shader.uniforms.uSwayTime.value = time;
}

export function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
