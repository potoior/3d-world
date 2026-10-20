import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export function addBox(list, w, h, d, x, y, z, ry = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (ry) g.rotateY(ry);
  g.translate(x, y, z);
  list.push(g);
}

export function addCylinder(list, rt, rb, h, seg, x, y, z) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  g.translate(x, y, z);
  list.push(g);
}

export function addBar(list, ax, az, bx, bz, y, h, t) {
  const dx = bx - ax;
  const dz = bz - az;
  const len = Math.hypot(dx, dz);
  if (len < 0.001) return;
  const g = new THREE.BoxGeometry(t, h, len);
  g.rotateY(Math.atan2(dx, dz));
  g.translate((ax + bx) / 2, y, (az + bz) / 2);
  list.push(g);
}

export function mergedMesh(list, material, cast = true, receive = true) {
  if (!list.length) return null;
  const geo = mergeGeometries(list, false);
  list.forEach((g) => g.dispose());
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  return mesh;
}

export function trapezoidGeometry(w, h, topRatio = 0.66) {
  const b = w * 0.5;
  const t = w * topRatio * 0.5;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      [-b, 0, 0, b, 0, 0, t, h, 0, -t, h, 0],
      3
    )
  );
  geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0.83, 1, 0.17, 1], 2));
  geo.setIndex([0, 1, 2, 0, 2, 3]);
  geo.computeVertexNormals();
  return geo;
}

export function mergeStaticGroup(source) {
  source.updateMatrixWorld(true);
  const buckets = new Map();
  const skipped = [];
  source.traverse((obj) => {
    if (!obj.isMesh) return;
    const mat = obj.material;
    if (Array.isArray(mat) || mat.transparent || mat.isShaderMaterial || !obj.visible) {
      skipped.push(obj);
      return;
    }
    let geo = obj.geometry.clone();
    geo.applyMatrix4(obj.matrixWorld);
    if (geo.index) geo = geo.toNonIndexed();
    for (const key of Object.keys(geo.attributes)) {
      if (key !== 'position' && key !== 'normal' && key !== 'uv' && key !== 'color') geo.deleteAttribute(key);
    }
    if (!geo.attributes.normal) geo.computeVertexNormals();
    if (!geo.attributes.uv) {
      const count = geo.attributes.position.count;
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(count * 2), 2));
    }
    if (!buckets.has(mat)) buckets.set(mat, []);
    buckets.get(mat).push(geo);
  });

  const merged = new THREE.Group();
  for (const [material, list] of buckets) {
    const geo = mergeGeometries(list, false);
    list.forEach((g) => g.dispose());
    if (!geo) continue;
    const mesh = new THREE.Mesh(geo, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    merged.add(mesh);
  }

  for (const obj of skipped) {
    obj.updateWorldMatrix(true, false);
    const matrix = obj.matrixWorld.clone();
    if (obj.parent) obj.parent.remove(obj);
    matrix.decompose(obj.position, obj.quaternion, obj.scale);
    merged.add(obj);
  }
  return merged;
}
