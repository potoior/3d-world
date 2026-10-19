import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mats } from './materials.js';

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

export function createBalustradeGeometry({
  w,
  d,
  spacing = 2.7,
  height = 1.35,
  gapFront = 0,
  gapBack = 0,
}) {
  const list = [];
  const capGeo = new THREE.SphereGeometry(0.2, 8, 6);
  const run = (x1, z1, x2, z2) => {
    const len = Math.hypot(x2 - x1, z2 - z1);
    const n = Math.max(1, Math.round(len / spacing));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const x = x1 + (x2 - x1) * t;
      const z = z1 + (z2 - z1) * t;
      addBox(list, 0.34, height, 0.34, x, height * 0.5, z);
      const cap = capGeo.clone();
      cap.translate(x, height + 0.12, z);
      list.push(cap);
      if (i === n) continue;
      const xa = x1 + (x2 - x1) * ((i + 1) / n);
      const za = z1 + (z2 - z1) * ((i + 1) / n);
      addBar(list, x, z, xa, za, height - 0.1, 0.2, 0.3);
      addBar(list, x, z, xa, za, height * 0.52, height * 0.62, 0.13);
    }
  };
  const splitFront = gapFront > 0;
  const splitBack = gapBack > 0;
  if (splitBack) {
    run(-w / 2, -d / 2, -gapBack / 2, -d / 2);
    run(gapBack / 2, -d / 2, w / 2, -d / 2);
  } else {
    run(-w / 2, -d / 2, w / 2, -d / 2);
  }
  if (splitFront) {
    run(-w / 2, d / 2, -gapFront / 2, d / 2);
    run(gapFront / 2, d / 2, w / 2, d / 2);
  } else {
    run(-w / 2, d / 2, w / 2, d / 2);
  }
  run(-w / 2, -d / 2, -w / 2, d / 2);
  run(w / 2, -d / 2, w / 2, d / 2);
  return mergeGeometries(list, false);
}

export function createBalustrade(opts) {
  const geo = createBalustradeGeometry(opts);
  const mesh = new THREE.Mesh(geo, mats.marble);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function createStairsGeometry({
  width,
  depth,
  height,
  steps = 12,
  rampWidth = 0,
}) {
  const list = [];
  const stepD = depth / steps;
  const stepH = height / steps;
  for (let i = 0; i < steps; i++) {
    const top = height - i * stepH;
    addBox(list, width, top, stepD * 1.01, 0, top * 0.5, depth * 0.5 - (i + 0.5) * stepD);
  }
  const angle = Math.atan2(height, depth);
  const slopeLen = Math.hypot(height, depth);
  for (const sx of [-1, 1]) {
    const side = new THREE.BoxGeometry(0.6, 1.15, slopeLen + 1.2);
    side.rotateX(angle);
    side.translate(sx * (width * 0.5 + 0.3), height * 0.5 + 0.35, 0);
    list.push(side);
    const newelTop = new THREE.BoxGeometry(1.0, 1.5, 1.0);
    newelTop.translate(sx * (width * 0.5 + 0.3), height + 0.3, -depth * 0.5);
    list.push(newelTop);
    const newelBottom = new THREE.BoxGeometry(1.0, 1.5, 1.0);
    newelBottom.translate(sx * (width * 0.5 + 0.3), 0.75, depth * 0.5);
    list.push(newelBottom);
  }
  if (rampWidth > 0) {
    const ramp = new THREE.BoxGeometry(rampWidth, 0.28, slopeLen + 0.8);
    ramp.rotateX(angle);
    ramp.translate(0, height * 0.5 + 0.12, 0);
    list.push(ramp);
  }
  return mergeGeometries(list, false);
}

export function createStairs(opts) {
  const geo = createStairsGeometry(opts);
  const mesh = new THREE.Mesh(geo, mats.marble);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function createRampSlab({ width, depth, height }) {
  const geo = new THREE.BoxGeometry(width, 0.22, Math.hypot(height, depth));
  geo.rotateX(Math.atan2(height, depth));
  const mesh = new THREE.Mesh(geo, mats.ramp);
  mesh.position.y = height * 0.5 + 0.18;
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  return mesh;
}

export function createTerrace({
  w,
  d,
  h,
  slope,
  gapFront = 0,
  gapBack = 0,
  railings = true,
}) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats.marble);
  body.position.y = h * 0.5;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const band = new THREE.Mesh(new THREE.BoxGeometry(w + 0.9, 1.0, d + 0.9), mats.marbleShade);
  band.position.y = h - 0.5;
  band.castShadow = true;
  band.receiveShadow = true;
  group.add(band);

  if (railings) {
    const rail = createBalustrade({
      w: w + 1.0,
      d: d + 1.0,
      gapFront,
      gapBack,
    });
    rail.position.y = h;
    group.add(rail);
  }

  if (slope > 0) {
    const stairs = createStairs({
      width: Math.max(24, w * 0.22),
      depth: slope,
      height: h,
      steps: Math.max(6, Math.round(h / 0.45)),
      rampWidth: 10,
    });
    stairs.position.z = d * 0.5 + slope * 0.5;
    stairs.position.y = 0;
    group.add(stairs);
  }
  return group;
}

export function createPlinth({ w, d, h, stairs = 3.2, railing = true }) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats.marble);
  body.position.y = h * 0.5;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);
  if (railing) {
    const rail = createBalustrade({ w: w + 0.6, d: d + 0.6, gapFront: w * 0.34 });
    rail.position.y = h;
    group.add(rail);
  }
  if (stairs > 0) {
    const st = createStairs({
      width: w * 0.36,
      depth: stairs,
      height: h,
      steps: Math.max(4, Math.round(h / 0.42)),
      rampWidth: w * 0.12,
    });
    st.position.z = d * 0.5 + stairs * 0.5;
    group.add(st);
  }
  return group;
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
      if (key !== 'position' && key !== 'normal' && key !== 'uv') geo.deleteAttribute(key);
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
