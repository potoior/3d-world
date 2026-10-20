import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export function addBox(list, w, h, d, x, y, z, ry = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (ry) g.rotateY(ry);
  g.translate(x, y, z);
  list.push(g);
  return g;
}

export function addOrientedBox(list, w, h, d, cx, cy, cz, quaternion) {
  const g = new THREE.BoxGeometry(w, h, d);
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(cx, cy, cz),
    quaternion,
    new THREE.Vector3(1, 1, 1)
  );
  g.applyMatrix4(m);
  list.push(g);
  return g;
}

export function addCylinder(list, rt, rb, h, seg, x, y, z) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  g.translate(x, y, z);
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

export function mergeStaticGroup(source) {
  source.updateMatrixWorld(true);
  const buckets = new Map();
  const skipped = [];

  source.traverse((obj) => {
    if (!obj.isMesh) return;
    if (obj.isInstancedMesh) {
      skipped.push(obj);
      return;
    }
    const mat = obj.material;
    if (Array.isArray(mat) || mat.transparent || mat.isShaderMaterial || !obj.visible) {
      skipped.push(obj);
      return;
    }
    let geo = obj.geometry.clone();
    geo.applyMatrix4(obj.matrixWorld);
    if (geo.index) geo = geo.toNonIndexed();
    for (const key of Object.keys(geo.attributes)) {
      if (key !== 'position' && key !== 'normal' && key !== 'uv' && key !== 'color') {
        geo.deleteAttribute(key);
      }
    }
    if (!geo.attributes.normal) geo.computeVertexNormals();
    const count = geo.attributes.position.count;
    if (!geo.attributes.uv) {
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(count * 2), 2));
    }
    if (!geo.attributes.color) {
      const color = new Float32Array(count * 3);
      color.fill(1);
      geo.setAttribute('color', new THREE.Float32BufferAttribute(color, 3));
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

export function mergeGeometryList(list) {
  if (!list.length) return null;
  const prepared = list.map((g) => (g.index ? g.toNonIndexed() : g));
  const geo = mergeGeometries(prepared, false);
  for (let i = 0; i < prepared.length; i++) {
    prepared[i].dispose();
    if (prepared[i] !== list[i]) list[i].dispose();
  }
  return geo;
}
