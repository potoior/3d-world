import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mats } from './materials.js';
import { addBox, mergedMesh } from './geometry.js';
import { createTaihuRock } from './richProps.js';
import { createRidgePair } from './richArch.js';

function rnd(seed, n) {
  const v = Math.sin(seed * 61.7 + n * 89.3) * 43758.5453;
  return v - Math.floor(v);
}

function addWaterline(pond, group) {
  const curve = new THREE.CatmullRomCurve3(
    pond.map(([x, z]) => new THREE.Vector3(x, 0, z)),
    true,
    'catmullrom',
    0.4
  );
  const rocks = [];
  const moss = [];
  const pebbles = [];
  const tufts = [];
  const center = new THREE.Vector2(-16, 40);
  const count = 82;
  for (let i = 0; i < count; i++) {
    const t = i / count;
    const p = curve.getPoint(t);
    const tan = curve.getTangent(t);
    const outward = new THREE.Vector2(p.x - center.x, p.z - center.y).normalize();
    if (i % 2 !== 0 && i % 5 !== 0) continue;
    const side = i % 3 === 0 ? 1 : -1;
    const lift = 0.18 + rnd(i, 1) * 0.24;
    if (i % 2 === 0) {
      const r = 0.45 + rnd(i, 2) * 0.9;
      const rock = new THREE.DodecahedronGeometry(r, 0);
      rock.scale(1.1 + rnd(i, 3) * 0.6, 0.7 + rnd(i, 4) * 0.75, 0.9 + rnd(i, 5) * 0.55);
      rock.rotateY(rnd(i, 6) * 6.28);
      rock.translate(p.x + outward.x * (0.9 + rnd(i, 7) * 1.1), lift, p.z + outward.y * (0.9 + rnd(i, 7) * 1.1));
      rocks.push(rock);
      if (i % 4 === 0) {
        const m = new THREE.IcosahedronGeometry(r * 0.62, 0);
        m.scale(1.3, 0.26, 1.1);
        m.translate(p.x + outward.x * (0.9 + rnd(i, 7) * 1.1), lift + r * 0.46, p.z + outward.y * (0.9 + rnd(i, 7) * 1.1));
        moss.push(m);
      }
    } else {
      const pebble = new THREE.IcosahedronGeometry(0.24 + rnd(i, 8) * 0.26, 0);
      pebble.scale(1.45, 0.28, 1.1);
      pebble.rotateY(rnd(i, 9) * 6.28);
      pebble.translate(p.x + outward.x * (0.35 + rnd(i, 10) * 0.5), 0.12, p.z + outward.y * (0.35 + rnd(i, 10) * 0.5));
      pebbles.push(pebble);
    }
    if (i % 3 === 0) {
      for (let k = 0; k < 3; k++) {
        const h = 0.4 + rnd(i * 3 + k, 11) * 0.7;
        const tuft = new THREE.ConeGeometry(0.05 + rnd(i * 3 + k, 12) * 0.05, h, 4);
        tuft.rotateZ((rnd(i * 3 + k, 13) - 0.5) * 0.7);
        tuft.translate(
          p.x + outward.x * (0.7 + rnd(i * 3 + k, 14) * 1.3),
          0.2 + h / 2,
          p.z + outward.y * (0.7 + rnd(i * 3 + k, 14) * 1.3)
        );
        tufts.push(tuft);
      }
    }
    if (i % 7 === 0) {
      const slab = new THREE.BoxGeometry(0.8 + rnd(i, 15) * 0.7, 0.1, 0.55 + rnd(i, 16) * 0.6);
      slab.rotateY(Math.atan2(tan.x, tan.z) + rnd(i, 17) * 0.5);
      slab.translate(p.x + outward.x * 0.18, 0.1, p.z + outward.y * 0.18);
      pebbles.push(slab);
    }
  }
  const rm = mergedMesh(rocks, mats.rock, true, true);
  if (rm) group.add(rm);
  const mm = mergedMesh(moss, mats.rockMoss, true, true);
  if (mm) group.add(mm);
  const pm = mergedMesh(pebbles, mats.stone, false, true);
  if (pm) group.add(pm);
  const tm = mergedMesh(tufts, mats.blade, false, true);
  if (tm) group.add(tm);
}

function addPavingPatches(group) {
  const slabs = [];
  const seams = [];
  const patches = [
    [-6, 58, 1.4, 0.8, 0.2], [-3, 61, 1.1, 1.2, 1.1], [2, 57, 1.3, 0.7, 0.6],
    [-10, 64, 1.2, 1.0, 2.1], [-30, 60, 1.5, 0.9, 0.3], [-34, 57, 1.0, 1.1, 1.4],
    [-58, 26, 1.3, 0.8, 2.4], [-62, 24, 1.1, 1.0, 0.7], [19, 28, 1.2, 0.7, 1.7],
    [23, 26, 1.0, 1.0, 0.4], [96, 76, 1.4, 1.1, 1.0], [102, 72, 1.1, 0.8, 2.2],
    [86, 68, 1.2, 0.9, 0.5], [74, 54, 1.3, 0.8, 1.8], [-52, 58, 1.2, 1.0, 2.6],
    [-22, 64, 1.1, 0.9, 0.9], [-44, 46, 1.2, 0.8, 1.5], [12, 32, 1.0, 0.9, 0.2],
    [38, 42, 1.3, 1.0, 2.0], [-78, 20, 1.2, 0.9, 0.8], [62, 18, 1.1, 1.0, 1.3],
    [54, -12, 1.2, 0.8, 2.5], [-40, -38, 1.3, 0.9, 0.6], [8, -40, 1.1, 0.8, 1.9],
  ];
  let i = 0;
  for (const [x, z, w, d, rot] of patches) {
    const g = new THREE.BoxGeometry(w, 0.05, d);
    g.rotateY(rot);
    g.translate(x, 0.085, z);
    slabs.push(g);
    addBox(seams, w + 0.06, 0.012, 0.03, x, 0.112, z + d / 2, rot);
    addBox(seams, 0.03, 0.012, d + 0.06, x + w / 2, 0.112, z, rot);
    if (i % 3 === 0) {
      addBox(seams, w * 0.5, 0.012, 0.024, x + 0.1, 0.114, z - d * 0.18, rot + 0.5);
    }
    i++;
  }
  const sm = mergedMesh(slabs, mats.path, false, true);
  if (sm) group.add(sm);
  const jm = mergedMesh(seams, mats.trimDark, false, true);
  if (jm) group.add(jm);
}

function addWaterRocks(group) {
  group.add(createTaihuRock({ x: -23, z: 59, scale: 0.9, seed: 501, cave: true, spread: 0.95 }));
  group.add(createTaihuRock({ x: 50, z: 39, scale: 0.82, seed: 503, cave: true, spread: 0.85 }));
}

export function createGardenRefineStatic(pond) {
  const group = new THREE.Group();
  addWaterline(pond, group);
  addPavingPatches(group);
  addWaterRocks(group);
  group.add(createRidgePair({ x: 0, y: 7.45, z: 82, rot: 0, ridgeHalf: 1.08, scale: 0.9 }));
  return group;
}
