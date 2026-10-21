import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { caveMaterials as M } from './scene.js';
import { riverX } from './scene.js';

function box(list, w, h, d, x, y, z, ry = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (ry) g.rotateY(ry);
  g.translate(x, y, z);
  list.push(g);
}

export function walkMainX(z) {
  return 27 + 2.6 * Math.sin(z * 0.045);
}

export function walkRiverX(z) {
  return riverX(z) + 14.5;
}

function buildPath(root, points, width, lampStep, lampSide) {
  const wood = [];
  const stone = [];
  const metal = [];
  const lamps = [];
  const anchors = [];
  const deckY = 0.46;
  let distance = 0;
  let nextLamp = 5;
  let lampIndex = 0;

  for (let i = 0; i < points.length - 1; i++) {
    const [ax, az] = points[i];
    const [bx, bz] = points[i + 1];
    const dx = bx - ax;
    const dz = bz - az;
    const len = Math.hypot(dx, dz);
    if (len < 0.05) continue;
    const mx = (ax + bx) / 2;
    const mz = (az + bz) / 2;
    const ang = Math.atan2(dx, dz);
    const nx = Math.cos(ang);
    const nz = -Math.sin(ang);

    box(wood, width, 0.22, len + 0.12, mx, deckY, mz, ang);
    box(stone, 0.28, 0.46, len + 0.1, mx + nx * (width * 0.5 + 0.05), 0.35, mz + nz * (width * 0.5 + 0.05), ang);
    box(stone, 0.28, 0.46, len + 0.1, mx - nx * (width * 0.5 + 0.05), 0.35, mz - nz * (width * 0.5 + 0.05), ang);

    const rungCount = Math.max(1, Math.round(len / 2.5));
    for (let r = 0; r <= rungCount; r++) {
      const t = r / rungCount;
      const px = ax + dx * t;
      const pz = az + dz * t;
      for (const side of [-1, 1]) {
        const ox = px + nx * side * (width * 0.5 + 0.05);
        const oz = pz + nz * side * (width * 0.5 + 0.05);
        box(metal, 0.075, 1.08, 0.075, ox, 1.02, oz);
      }
    }
    for (const side of [-1, 1]) {
      const ox = nx * side * (width * 0.5 + 0.05);
      const oz = nz * side * (width * 0.5 + 0.05);
      box(metal, 0.065, 0.065, len + 0.05, mx + ox, 1.52, mz + oz, ang);
      box(metal, 0.045, 0.045, len + 0.05, mx + ox, 0.68, mz + oz, ang);
    }

    distance += len;
    if (distance >= nextLamp) {
      nextLamp += lampStep;
      const side = lampIndex % 2 === 0 ? 1 : -1;
      const ox = nx * side * (width * 0.5 + 0.55);
      const oz = nz * side * (width * 0.5 + 0.55);
      const lx = bx + ox;
      const lz = bz + oz;
      box(metal, 0.12, 2.1, 0.12, lx, 1.5, lz);
      box(metal, 0.44, 0.07, 0.07, lx, 2.58, lz, ang);
      const gx = lx + Math.cos(ang) * 0.2 * lampSide;
      const gz = lz - Math.sin(ang) * 0.2 * lampSide;
      box(lamps, 0.4, 0.5, 0.3, gx, 2.34, gz, ang);
      anchors.push(new THREE.Vector3(gx, 2.34, gz));
      lampIndex++;
    }
  }

  const add = (list, mat) => {
    if (!list.length) return;
    const geo = mergeGeometries(list.map((g) => g.toNonIndexed()), false);
    list.forEach((g) => g.dispose());
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    root.add(mesh);
  };
  add(wood, M.wood);
  add(stone, M.rock);
  add(metal, M.metal);
  add(lamps, M.lamp);
  return anchors;
}

export function buildWalkways(root) {
  const mainPoints = [];
  for (let z = 140; z >= -22; z -= 6) mainPoints.push([walkMainX(z), z]);
  mainPoints.push([22, -28]);

  const riverPoints = [];
  for (let z = 98; z >= -48; z -= 6) riverPoints.push([walkRiverX(z), z]);

  const bridgePoints = [];
  const zBridge = 26;
  const xA = walkMainX(zBridge);
  const xB = walkRiverX(zBridge);
  for (let i = 0; i <= 9; i++) {
    const t = i / 9;
    bridgePoints.push([xA + (xB - xA) * t, zBridge]);
  }

  const anchors = [];
  anchors.push(...buildPath(root, mainPoints, 4.3, 20, 1));
  anchors.push(...buildPath(root, riverPoints, 3.6, 18, -1));
  anchors.push(...buildPath(root, bridgePoints, 3.3, 99, 1));
  return anchors;
}
