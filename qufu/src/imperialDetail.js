import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mats } from './materials.js';
import { addBox, mergedMesh } from './geometry.js';
import { createDrainGrate } from './props.js';

function reliefPanel(list, x, y, z, ry, w = 3.6, h = 1.0) {
  const g = new THREE.BoxGeometry(w, h, 0.13);
  if (ry) g.rotateY(ry);
  g.translate(x, y, z);
  list.push(g);
  const border = [
    [w + 0.1, 0.09, 0.2, 0, h / 2 - 0.04],
    [w + 0.1, 0.09, 0.2, 0, -h / 2 + 0.04],
    [0.09, h + 0.1, 0.2, -w / 2 + 0.04, 0],
    [0.09, h + 0.1, 0.2, w / 2 - 0.04, 0],
  ];
  for (const [bw, bh, bd, ox, oy] of border) {
    const b = new THREE.BoxGeometry(bw, bh, bd);
    if (ry) b.rotateY(ry);
    b.translate(
      x + Math.cos(ry) * ox + Math.sin(ry) * 0.02,
      y + oy,
      z - Math.sin(ry) * ox + Math.cos(ry) * 0.02
    );
    list.push(b);
  }
  const diamond = new THREE.BoxGeometry(0.52, 0.52, 0.08);
  diamond.rotateZ(Math.PI / 4);
  if (ry) diamond.rotateY(ry);
  diamond.translate(x + Math.sin(ry) * 0.08, y, z + Math.cos(ry) * 0.08);
  list.push(diamond);
  for (const s of [-1, 1]) {
    const curl = new THREE.SphereGeometry(0.2, 6, 4);
    curl.scale(1.5, 0.5, 0.35);
    if (ry) curl.rotateY(ry);
    curl.translate(
      x + Math.cos(ry) * s * 0.95 + Math.sin(ry) * 0.07,
      y,
      z - Math.sin(ry) * s * 0.95 + Math.cos(ry) * 0.07
    );
    list.push(curl);
  }
}

function addTerraceCarvings(group) {
  const panels = [];
  const runFront = (halfW, y, z, skip) => {
    for (let x = -halfW + 4; x <= halfW - 4; x += 8.2) {
      if (Math.abs(x) < skip) continue;
      reliefPanel(panels, x, y, z + 0.56, 0);
    }
  };
  const runSide = (x, halfD, y, zc, rySign) => {
    for (let z = -halfD + 8; z <= halfD - 8; z += 9.4) {
      reliefPanel(panels, x, y, zc + z, rySign, 3.4, 0.95);
    }
  };
  runFront(70, 1.15, 126, 23);
  runFront(64, 3.32, 120, 23);
  runFront(58, 5.5, 114, 23);
  runSide(70.56, 108, 1.15, 18, Math.PI / 2);
  runSide(-70.56, 108, 1.15, 18, Math.PI / 2);
  runSide(64.56, 102, 3.32, 18, Math.PI / 2);
  runSide(-64.56, 102, 3.32, 18, Math.PI / 2);
  runSide(58.56, 96, 5.5, 18, Math.PI / 2);
  runSide(-58.56, 96, 5.5, 18, Math.PI / 2);
  runFront(52.2, 0.62, -207, 12);
  runFront(52.2, 0.62, -337, 12);
  runSide(52.56, 65, 0.62, -272, Math.PI / 2);
  runSide(-52.56, 65, 0.62, -272, Math.PI / 2);
  const mesh = mergedMesh(panels, mats.marbleShade, false, true);
  if (mesh) group.add(mesh);
}

function addPavingVariation(group) {
  const slabs = [];
  const seams = [];
  const spots = [
    [430, -5.2], [430, 4.4], [418, 1.1], [406, -3.4], [392, 5.2],
    [372, -4.6], [356, 3.8], [344, -1.2], [330, 4.9], [312, -3.8],
    [214, 4.2], [200, -4.8], [188, 1.4], [168, -3.2], [152, 4.5],
    [-150, -4.3], [-164, 3.6], [-184, -1.1], [-204, 4.4], [-244, -4.1],
    [-262, 3.3], [-286, -1.5], [-306, 4.7], [-328, -3.9],
    [-58, 10], [62, 16], [-92, -12], [96, -20], [44, 64], [-44, 84],
  ];
  let i = 0;
  for (const [z, x] of spots) {
    const w = 1.1 + ((i * 7) % 5) * 0.16;
    const d = 1.0 + ((i * 5) % 4) * 0.18;
    const g = new THREE.BoxGeometry(w, 0.055, d);
    g.rotateY(((i * 11) % 7) * 0.11);
    g.translate(x, 0.095, z);
    slabs.push(g);
    addBox(seams, w + 0.06, 0.012, 0.035, x, 0.125, z + d / 2, ((i * 11) % 7) * 0.11);
    addBox(seams, 0.035, 0.012, d + 0.06, x + w / 2, 0.125, z, ((i * 11) % 7) * 0.11);
    i++;
  }
  const sm = mergedMesh(slabs, mats.stone, false, true);
  if (sm) group.add(sm);
  const jm = mergedMesh(seams, mats.ash, false, true);
  if (jm) group.add(jm);
}

function addDrainage(group) {
  const spots = [
    [-71.6, 126.8], [71.6, 126.8], [-65.6, 120.8], [65.6, 120.8],
    [-59.6, 114.8], [59.6, 114.8], [-53.0, -206.2], [53.0, -206.2],
    [-53.0, -337.6], [53.0, -337.6], [7.4, 442], [-7.4, 442],
    [7.4, 352], [-7.4, 352], [-14.5, 208], [14.5, 208],
  ];
  for (const [x, z] of spots) {
    const grate = createDrainGrate(1.15, 0.8);
    grate.position.set(x, 0.015, z);
    group.add(grate);
  }
}

export function createImperialStatic() {
  const group = new THREE.Group();
  addTerraceCarvings(group);
  addPavingVariation(group);
  addDrainage(group);
  return group;
}
