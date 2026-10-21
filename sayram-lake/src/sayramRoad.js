import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  CENTER,
  ROAD_OFFSET,
  ROAD_WIDTH,
  clamp,
  makeLakeCurve,
  terrainHeight,
} from './sayramTerrain.js';

function roadMaterial(color, rough = 0.9, metal = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
}

function addInstanced(root, geo, material, count, place, layer = 0, cast = false) {
  const im = new THREE.InstancedMesh(geo, material, count);
  const d = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    place(d, i);
    d.updateMatrix();
    im.setMatrixAt(i, d.matrix);
  }
  im.instanceMatrix.needsUpdate = true;
  im.castShadow = cast;
  im.receiveShadow = true;
  im.layers.set(layer);
  root.add(im);
  return im;
}

export function createRoadCurve() {
  const pts = makeLakeCurve().getSpacedPoints(240);
  const roadPts = pts.map((p) => {
    const dx = p.x - CENTER.x;
    const dz = p.z - CENTER.y;
    const len = Math.hypot(dx, dz) || 1;
    return new THREE.Vector3(p.x + (dx / len) * ROAD_OFFSET, 0, p.z + (dz / len) * ROAD_OFFSET);
  });
  return new THREE.CatmullRomCurve3(roadPts, true, 'catmullrom', 0.2);
}

export function createRoadPolyline() {
  return createRoadCurve().getSpacedPoints(320).map((p) => [p.x, p.z]);
}

function ribbonGeometry(curve, width, samples, yOffset, closed = true) {
  const pos = [];
  const uv = [];
  const idx = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const p = curve.getPointAt(closed ? t % 1 : t);
    const tan = curve.getTangentAt(closed ? t % 1 : t);
    const nx = -tan.z;
    const nz = tan.x;
    const len = Math.hypot(nx, nz) || 1;
    const ox = (nx / len) * width * 0.5;
    const oz = (nz / len) * width * 0.5;
    const y = terrainHeight(p.x, p.z) + yOffset;
    pos.push(p.x + ox, y, p.z + oz);
    pos.push(p.x - ox, y, p.z - oz);
    uv.push(0, t * samples * 0.16, 1, t * samples * 0.16);
  }
  for (let i = 0; i < samples; i++) {
    const a = i * 2;
    const b = (i + 1) * 2;
    idx.push(a, b, a + 1, a + 1, b, b + 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

export function createRoad() {
  const root = new THREE.Group();
  const curve = createRoadCurve();
  const roadMat = roadMaterial(0x2b3239, 0.94);
  const lineMat = roadMaterial(0xe8e5d8, 0.75);
  const road = new THREE.Mesh(ribbonGeometry(curve, ROAD_WIDTH, 420, 0.16), roadMat);
  road.receiveShadow = true;
  root.add(road);

  for (const side of [-1, 1]) {
    const pts = curve.getSpacedPoints(420);
    const pos = [];
    const idx = [];
    const off = side * (ROAD_WIDTH * 0.5 + 0.58);
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const tan = curve.getTangentAt((i / pts.length) % 1);
      const nx = -tan.z;
      const nz = tan.x;
      const len = Math.hypot(nx, nz) || 1;
      for (const w of [-0.16, 0.16]) {
        const ox = (nx / len) * (off + w);
        const oz = (nz / len) * (off + w);
        pos.push(p.x + ox, terrainHeight(p.x + ox, p.z + oz) + 0.2, p.z + oz);
      }
      if (i > 0) {
        const a = (i - 1) * 2;
        idx.push(a, i * 2, a + 1, a + 1, i * 2, i * 2 + 1);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    const line = new THREE.Mesh(g, lineMat);
    line.receiveShadow = true;
    root.add(line);
  }

  addInstanced(
    root,
    new THREE.BoxGeometry(0.22, 0.025, 4.6),
    lineMat,
    190,
    (d, i) => {
      const p = curve.getPointAt((i / 190) % 1);
      const tan = curve.getTangentAt((i / 190) % 1);
      d.position.set(p.x, terrainHeight(p.x, p.z) + 0.2, p.z);
      d.rotation.set(0, Math.atan2(tan.x, tan.z), 0);
    },
    0,
    false
  );

  addInstanced(
    root,
    new THREE.BoxGeometry(0.18, 0.9, 0.18),
    roadMaterial(0xd9d5c4, 0.7),
    96,
    (d, i) => {
      const t = (i / 96) % 1;
      const p = curve.getPointAt(t);
      const tan = curve.getTangentAt(t);
      const nx = -tan.z;
      const nz = tan.x;
      const len = Math.hypot(nx, nz) || 1;
      const off = ROAD_WIDTH * 0.5 + 1.35;
      const x = p.x + (nx / len) * off;
      const z = p.z + (nz / len) * off;
      d.position.set(x, terrainHeight(x, z) + 0.45, z);
      d.rotation.set(0, Math.atan2(tan.x, tan.z), 0);
    },
    1,
    false
  );

  const railPts = [];
  for (let i = 0; i < 130; i++) {
    const t = (i / 130) % 1;
    const p = curve.getPointAt(t);
    const tan = curve.getTangentAt(t);
    const nx = -tan.z;
    const nz = tan.x;
    const len = Math.hypot(nx, nz) || 1;
    const off = ROAD_WIDTH * 0.5 + 1.35;
    const x = p.x + (nx / len) * off;
    const z = p.z + (nz / len) * off;
    railPts.push(new THREE.Vector3(x, terrainHeight(x, z) + 0.92, z));
  }
  const railCurve = new THREE.CatmullRomCurve3(railPts, true, 'catmullrom', 0.18);
  const rail = new THREE.Mesh(
    ribbonGeometry(railCurve, 0.12, 280, 0.92, true),
    roadMaterial(0x777b78, 0.55, 0.3)
  );
  rail.layers.set(1);
  root.add(rail);

  return { group: root, curve };
}

export function createBoardwalk() {
  const root = new THREE.Group();
  const shorePts = [];
  const pts = makeLakeCurve().getSpacedPoints(140);
  for (const p of pts) {
    if (p.x > -338 && p.x < -44 && p.z > 86) {
      const dx = p.x - CENTER.x;
      const dz = p.z - CENTER.y;
      const len = Math.hypot(dx, dz) || 1;
      shorePts.push(new THREE.Vector3(p.x + (dx / len) * 10, 0, p.z + (dz / len) * 10));
    }
  }
  if (shorePts.length < 4) return root;
  const curve = new THREE.CatmullRomCurve3(shorePts, false, 'catmullrom', 0.25);
  const list = [];
  const count = 76;
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const p = curve.getPointAt(t);
    const tan = curve.getTangentAt(t);
    const y = terrainHeight(p.x, p.z) + 0.38;
    const g = new THREE.BoxGeometry(2.1, 0.16, 1.15);
    g.rotateY(Math.atan2(tan.x, tan.z));
    g.translate(p.x, y, p.z);
    list.push(g);
  }
  for (let i = 0; i < 26; i++) {
    const t = i / 25;
    const p = curve.getPointAt(t);
    const y = terrainHeight(p.x, p.z);
    const tan = curve.getTangentAt(t);
    const nx = -tan.z;
    const nz = tan.x;
    const len = Math.hypot(nx, nz) || 1;
    for (const side of [-0.7, 0.7]) {
      const g = new THREE.CylinderGeometry(0.09, 0.11, 0.9, 5);
      g.translate(p.x + (nx / len) * side, y + 0.12, p.z + (nz / len) * side);
      list.push(g);
    }
  }
  const merged = mergeGeometries(
    list.map((g) => (g.index ? g.toNonIndexed() : g)),
    false
  );
  if (merged) {
    const mesh = new THREE.Mesh(merged, roadMaterial(0x7d5a38, 0.88));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
  }
  return root;
}
