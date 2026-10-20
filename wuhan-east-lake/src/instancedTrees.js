import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const TRUNK = new THREE.Color(0x5b4330);
const PINE = new THREE.Color(0x56785c);
const BLADE = new THREE.Color(0x718e5a);
const WILLOW = new THREE.Color(0x8ba06b);

const treeMaterial = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.88,
  metalness: 0.02,
});

function hash(seed, n) {
  const v = Math.sin(seed * 91.7 + n * 47.3) * 43758.5453;
  return v - Math.floor(v);
}

function paint(geo, color) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const count = g.attributes.position.count;
  const arr = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    arr[i * 3] = color.r;
    arr[i * 3 + 1] = color.g;
    arr[i * 3 + 2] = color.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}

function trunkGeo(height, radius = 0.28) {
  const g = new THREE.CylinderGeometry(radius, radius * 1.7, height * 0.55, 7);
  g.translate(0, height * 0.275, 0);
  return paint(g, TRUNK);
}

function coneGeo(r, h, y, x, z, color) {
  const g = new THREE.ConeGeometry(r, h, 8);
  g.translate(x, y, z);
  return paint(g, color);
}

function pineGeometry() {
  const h = 10;
  const parts = [trunkGeo(h)];
  for (let i = 0; i < 4; i++) {
    parts.push(coneGeo(3.4 * (1 - i * 0.17), h * 0.35, h * (0.45 + i * 0.15), 0, 0, PINE));
  }
  const geo = mergeGeometries(parts, false);
  parts.forEach((g) => g.dispose());
  return geo;
}

function broadGeometry() {
  const h = 10;
  const parts = [trunkGeo(h)];
  for (let i = 0; i < 6; i++) {
    const r = 3.4 * (0.5 + hash(1400, i) * 0.5);
    const g = new THREE.IcosahedronGeometry(r, 0);
    g.scale(1, 0.8, 1);
    g.translate((hash(1400, i + 1) - 0.5) * 4.4, h * (0.55 + hash(1400, i + 3) * 0.34), (hash(1400, i + 6) - 0.5) * 4.4);
    parts.push(paint(g, BLADE));
  }
  const geo = mergeGeometries(parts, false);
  parts.forEach((g) => g.dispose());
  return geo;
}

function firGeometry() {
  const h = 10;
  const parts = [trunkGeo(h, 0.22)];
  for (let i = 0; i < 4; i++) {
    parts.push(coneGeo(1.9 * (1 - i * 0.18), h * 0.34, h * (0.38 + i * 0.17), i % 2 ? 0.15 : -0.15, 0, PINE));
  }
  const geo = mergeGeometries(parts, false);
  parts.forEach((g) => g.dispose());
  return geo;
}

function willowGeometry() {
  const h = 8;
  const parts = [trunkGeo(h, 0.24)];
  for (let i = 0; i < 8; i++) {
    const r = 0.55 + hash(1200, i) * 0.75;
    const g = new THREE.IcosahedronGeometry(r, 0);
    g.scale(0.75, 1.6, 0.75);
    g.translate((hash(1200, i + 8) - 0.5) * 4.4, h * (0.55 + hash(1200, i + 3) * 0.28), (hash(1200, i + 15) - 0.5) * 4.4);
    parts.push(paint(g, WILLOW));
  }
  for (let i = 0; i < 6; i++) {
    const g = new THREE.CylinderGeometry(0.05, 0.12, h * 0.38, 5);
    g.rotateZ((hash(1200, i + 22) - 0.5) * 0.35);
    g.translate((hash(1200, i + 30) - 0.5) * 5, h * 0.55, (hash(1200, i + 37) - 0.5) * 5);
    parts.push(paint(g, WILLOW));
  }
  const geo = mergeGeometries(parts, false);
  parts.forEach((g) => g.dispose());
  return geo;
}

const BASE = {
  pine: { height: 10, spread: 3.4 },
  broad: { height: 10, spread: 3.4 },
  fir: { height: 10, spread: 2.4 },
  willow: { height: 8, spread: 2.8 },
};

const builders = {
  pine: pineGeometry,
  broad: broadGeometry,
  fir: firGeometry,
  willow: willowGeometry,
};

export function createInstancedForest(defs) {
  const group = new THREE.Group();
  const counts = {};
  for (const def of defs) counts[def.kind] = (counts[def.kind] || 0) + 1;
  const meshes = {};
  for (const kind of Object.keys(counts)) {
    const mesh = new THREE.InstancedMesh(builders[kind](), treeMaterial, counts[kind]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    meshes[kind] = { mesh, index: 0 };
    group.add(mesh);
  }
  const dummy = new THREE.Object3D();
  const tint = new THREE.Color();
  for (let i = 0; i < defs.length; i++) {
    const def = defs[i];
    const slot = meshes[def.kind];
    const base = BASE[def.kind];
    const sy = def.height / base.height;
    const sxz = sy * (def.spread / base.spread);
    dummy.position.set(def.x, def.h - 0.1, def.z);
    dummy.rotation.set(0, def.rot, 0);
    dummy.scale.set(sxz, sy, sxz);
    dummy.updateMatrix();
    slot.mesh.setMatrixAt(slot.index, dummy.matrix);
    const v = 0.86 + hash(def.seed, 3) * 0.14;
    tint.setRGB(v, v, v);
    slot.mesh.setColorAt(slot.index, tint);
    slot.index++;
  }
  for (const kind of Object.keys(meshes)) {
    const mesh = meshes[kind].mesh;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }
  return group;
}
