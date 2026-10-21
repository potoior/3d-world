import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  CENTER,
  WATER_Y,
  clamp,
  isLand,
  lakeInfo,
  makeLakeCurve,
  rand,
  terrainHeight,
} from './sayramTerrain.js';

function addInstanced(root, geo, material, count, layer = 0, cast = false) {
  const im = new THREE.InstancedMesh(geo, material, count);
  im.castShadow = cast;
  im.receiveShadow = true;
  im.layers.set(layer);
  root.add(im);
  return im;
}

function distanceToPolyline(x, z, pts) {
  let min = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const vx = b[0] - a[0];
    const vz = b[1] - a[1];
    const len2 = vx * vx + vz * vz || 1;
    const t = clamp(((x - a[0]) * vx + (z - a[1]) * vz) / len2, 0, 1);
    const dx = x - a[0] - vx * t;
    const dz = z - a[1] - vz * t;
    const d = dx * dx + dz * dz;
    if (d < min) min = d;
  }
  return Math.sqrt(min);
}

export function createScatter(roadPts) {
  const root = new THREE.Group();
  root.name = 'sayram-rocks-and-pines';

  const rockMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.96 });
  const rockCol = new THREE.Color();
  const dummy = new THREE.Object3D();

  const shorePts = makeLakeCurve().getSpacedPoints(300);
  const boulderGeo = new THREE.DodecahedronGeometry(1, 0);
  const boulders = addInstanced(root, boulderGeo, rockMat, 210, 0, true);
  for (let i = 0; i < 210; i++) {
    const p = shorePts[Math.floor(rand(11 + i, 1) * shorePts.length) % shorePts.length];
    const dx = p.x - CENTER.x;
    const dz = p.z - CENTER.y;
    const len = Math.hypot(dx, dz) || 1;
    const off = 1.5 + rand(11 + i, 2) * 11;
    const side = rand(11 + i, 3) < 0.17 ? -1 : 1;
    const x = p.x + (dx / len) * off * side;
    const z = p.z + (dz / len) * off * side;
    const s = 0.45 + rand(11 + i, 4) * 1.65;
    const g = terrainHeight(x, z);
    dummy.position.set(x, Math.max(g + s * 0.2, WATER_Y + s * 0.15), z);
    dummy.rotation.set(rand(11 + i, 5) * 0.5, rand(11 + i, 6) * Math.PI * 2, rand(11 + i, 7) * 0.4);
    dummy.scale.set(s * (0.9 + rand(11 + i, 8) * 0.8), s * (0.45 + rand(11 + i, 9) * 0.5), s);
    dummy.updateMatrix();
    boulders.setMatrixAt(i, dummy.matrix);
    const v = 0.32 + rand(11 + i, 10) * 0.28;
    rockCol.setRGB(v, v * 1.02, v * 0.98);
    boulders.setColorAt(i, rockCol);
  }
  boulders.instanceMatrix.needsUpdate = true;
  boulders.instanceColor.needsUpdate = true;

  const pebbleGeo = new THREE.IcosahedronGeometry(0.42, 0);
  const pebbles = addInstanced(root, pebbleGeo, rockMat, 900, 1, false);
  for (let i = 0; i < 900; i++) {
    const p = shorePts[Math.floor(rand(901 + i, 1) * shorePts.length) % shorePts.length];
    const dx = p.x - CENTER.x;
    const dz = p.z - CENTER.y;
    const len = Math.hypot(dx, dz) || 1;
    const off = 0.2 + rand(901 + i, 2) * 6.2;
    const x = p.x + (dx / len) * off;
    const z = p.z + (dz / len) * off;
    const s = 0.16 + rand(901 + i, 3) * 0.5;
    dummy.position.set(x, terrainHeight(x, z) + s * 0.22, z);
    dummy.rotation.set(rand(901 + i, 4) * 0.6, rand(901 + i, 5) * Math.PI * 2, 0);
    dummy.scale.set(s * 1.3, s * 0.55, s);
    dummy.updateMatrix();
    pebbles.setMatrixAt(i, dummy.matrix);
    const v = 0.34 + rand(901 + i, 6) * 0.32;
    rockCol.setRGB(v, v * 1.01, v * 0.96);
    pebbles.setColorAt(i, rockCol);
  }
  pebbles.instanceMatrix.needsUpdate = true;
  pebbles.instanceColor.needsUpdate = true;

  const meadowRockGeo = new THREE.DodecahedronGeometry(1, 0);
  const meadowRocks = addInstanced(root, meadowRockGeo, rockMat, 70, 0, true);
  for (let i = 0; i < 70; i++) {
    let x = 0;
    let z = 0;
    let ok = false;
    for (let k = 0; k < 20; k++) {
      x = -680 + rand(3001 + i * 17 + k, 1) * 1360;
      z = -380 + rand(3001 + i * 17 + k, 2) * 840;
      if (isLand(x, z, 15) && distanceToPolyline(x, z, roadPts) > 16) {
        ok = true;
        break;
      }
    }
    if (!ok) continue;
    const s = 0.5 + rand(3001 + i, 3) * 1.8;
    dummy.position.set(x, terrainHeight(x, z) + s * 0.2, z);
    dummy.rotation.set(rand(3001 + i, 4) * 0.3, rand(3001 + i, 5) * Math.PI * 2, 0);
    dummy.scale.set(s * 1.2, s * 0.55, s);
    dummy.updateMatrix();
    meadowRocks.setMatrixAt(i, dummy.matrix);
    const v = 0.34 + rand(3001 + i, 6) * 0.25;
    rockCol.setRGB(v, v, v * 0.94);
    meadowRocks.setColorAt(i, rockCol);
  }
  meadowRocks.instanceMatrix.needsUpdate = true;
  meadowRocks.instanceColor.needsUpdate = true;

  const trunkGeo = new THREE.CylinderGeometry(0.16, 0.31, 1, 6);
  trunkGeo.translate(0, 0.5, 0);
  const crownParts = [];
  const c1 = new THREE.ConeGeometry(1.5, 3.1, 7);
  c1.translate(0, 2.3, 0);
  const c2 = new THREE.ConeGeometry(1.12, 2.7, 7);
  c2.translate(0, 3.7, 0);
  const c3 = new THREE.ConeGeometry(0.72, 2.2, 7);
  c3.translate(0, 5.0, 0);
  crownParts.push(c1, c2, c3);
  const crownGeo = mergeGeometries(crownParts, false);

  const trunkMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.96 });
  const crownMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.92,
    flatShading: true,
  });

  const treeCount = 260;
  const trunks = addInstanced(root, trunkGeo, trunkMat, treeCount, 0, false);
  const crowns = addInstanced(root, crownGeo, crownMat, treeCount, 0, false);
  const treeColor = new THREE.Color();
  let n = 0;
  let tries = 0;
  while (n < treeCount && tries < treeCount * 40) {
    tries++;
    const x = -950 + rand(5001 + tries, 1) * 1900;
    const z = -500 + rand(5001 + tries, 2) * 1020;
    const frontier = z < -315 || Math.abs(x) > 470 || (z > 355 && Math.abs(x) > 260);
    if (!frontier) continue;
    if (!isLand(x, z, 18)) continue;
    if (distanceToPolyline(x, z, roadPts) < 18) continue;
    const s = 0.65 + rand(5001 + tries, 3) * 0.95;
    const g = terrainHeight(x, z);
    dummy.position.set(x, g, z);
    dummy.rotation.set(0, rand(5001 + tries, 4) * Math.PI * 2, 0);
    dummy.scale.set(s * (0.8 + rand(5001 + tries, 5) * 0.4), s, s);
    dummy.updateMatrix();
    trunks.setMatrixAt(n, dummy.matrix);
    crowns.setMatrixAt(n, dummy.matrix);
    treeColor.setHex([0x244d36, 0x2f5d3d, 0x3b6b43, 0x1f4631, 0x456f47][n % 5]);
    crowns.setColorAt(n, treeColor);
    treeColor.setHex(0x5c4630);
    trunks.setColorAt(n, treeColor);
    n++;
  }
  trunks.count = n;
  crowns.count = n;
  trunks.instanceMatrix.needsUpdate = true;
  crowns.instanceMatrix.needsUpdate = true;
  crowns.instanceColor.needsUpdate = true;
  trunks.instanceColor.needsUpdate = true;

  return root;
}
