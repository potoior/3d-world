import * as THREE from 'three';
import { mats } from './materials.js';
import { addBox, addCylinder, addBar, mergedMesh } from './geometry.js';
import { terrainHeight, WATER_Y, lakeField } from './terrain.js';
import {
  addBench,
  addLamp,
  addMarker,
  addPerson,
  addPlaque,
  addReeds,
  addShoreRocks,
  addPetalCarpet,
  addBuoy,
  hash,
} from './detailKit.js';

const CORE = [
  [-353, 86], [-347, 106], [-342, 128], [-340, 150],
  [-339, 172], [-340, 192], [-345, 212], [-350, 222],
];

const CYCLE = [
  [-420, 690], [-380, 678], [-342, 700], [-302, 730],
  [-270, 770], [-260, 810], [-300, 842], [-352, 822],
  [-392, 782], [-420, 742],
];

const GREEN = [
  [-446, -640], [-462, -560], [-444, -480], [-472, -400],
  [-532, -320], [-546, -240], [-412, -200], [-444, -120],
  [-454, -80], [-462, -8], [-388, 52], [-366, 120],
  [-348, 160], [-346, 200], [-360, 280], [-438, 340],
  [-392, 400], [-482, 480], [-650, 560],
];

function addBlade(list, x, z, gy, seed, height) {
  for (let i = 0; i < 3; i++) {
    const a = hash(seed, i) * Math.PI * 2;
    const r = 0.12 + hash(seed, i + 4) * 0.42;
    const h = height * (0.55 + hash(seed, i + 8) * 0.7);
    const g = new THREE.ConeGeometry(0.055 + hash(seed, i + 3) * 0.04, h, 3);
    g.rotateZ((hash(seed, i + 11) - 0.5) * 0.38);
    g.rotateY(a);
    g.translate(x + Math.cos(a) * r, gy + h * 0.46, z + Math.sin(a) * r);
    list.push(g);
  }
}

function addGrassLine(list, pts, offset, step, seed, size) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, z0] = pts[i];
    const [x1, z1] = pts[i + 1];
    const dx = x1 - x0;
    const dz = z1 - z0;
    const len = Math.hypot(dx, dz) || 1;
    const nx = -dz / len;
    const nz = dx / len;
    const n = Math.max(1, Math.round(len / step));
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n;
      for (const side of [-1, 1]) {
        const off = (offset + hash(seed + i, k) * 1.5) * side;
        const x = x0 + dx * t + nx * off;
        const z = z0 + dz * t + nz * off;
        const gy = terrainHeight(x, z);
        if (gy < 1.0 || lakeField(x, z) < 7) continue;
        addBlade(list, x, z, gy, seed + i * 31 + k * 7 + side, size);
      }
    }
  }
}

function addPathEdge(list, pts, offset) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, z0] = pts[i];
    const [x1, z1] = pts[i + 1];
    const dx = x1 - x0;
    const dz = z1 - z0;
    const len = Math.hypot(dx, dz) || 1;
    const nx = -dz / len;
    const nz = dx / len;
    const n = Math.max(1, Math.round(len / 4.2));
    for (let k = 0; k < n; k++) {
      const t0 = k / n;
      const t1 = (k + 1) / n;
      for (const side of [-1, 1]) {
        const ax = x0 + dx * t0 + nx * offset * side;
        const az = z0 + dz * t0 + nz * offset * side;
        const bx = x0 + dx * t1 + nx * offset * side;
        const bz = z0 + dz * t1 + nz * offset * side;
        const gy = Math.max(0.55, (terrainHeight(ax, az) + terrainHeight(bx, bz)) / 2 + 0.1);
        addBar(list, ax, az, bx, bz, gy, 0.15, 0.2);
      }
    }
  }
}

function addFlowerBed(root, stone, blade, blossom, cherry, x, z, rx, rz, seed) {
  const n = 20;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const px = x + Math.cos(a) * rx;
    const pz = z + Math.sin(a) * rz;
    const gy = terrainHeight(px, pz);
    if (gy < 1.0) continue;
    addBox(stone, 0.46, 0.3, 0.42, px, gy + 0.15, pz, a);
  }
  for (let i = 0; i < 24; i++) {
    const a = hash(seed, i) * Math.PI * 2;
    const r = Math.sqrt(hash(seed, i + 3));
    const px = x + Math.cos(a) * rx * 0.82 * r;
    const pz = z + Math.sin(a) * rz * 0.82 * r;
    const gy = terrainHeight(px, pz);
    if (gy < 1.0) continue;
    const s = 0.22 + hash(seed, i + 7) * 0.2;
    const b = new THREE.IcosahedronGeometry(s, 0);
    b.scale(1.2, 0.75, 1.2);
    b.translate(px, gy + 0.32 + s * 0.4, pz);
    blossom.push(b);
    if (i % 3 === 0) {
      const f = new THREE.IcosahedronGeometry(s * 0.82, 0);
      f.scale(1.3, 0.7, 1.3);
      f.translate(px + 0.16, gy + 0.56, pz - 0.12);
      cherry.push(f);
    }
    addBlade(blade, px, pz, gy + 0.15, seed + i, 0.55);
  }
}

function addSign(root, wood, gold, x, z, text, ry) {
  const gy = Math.max(0.7, terrainHeight(x, z));
  addBox(wood, 0.18, 2.5, 0.18, x - Math.cos(ry) * 1.2, gy + 1.25, z + Math.sin(ry) * 1.2);
  addBox(wood, 0.18, 2.5, 0.18, x + Math.cos(ry) * 1.2, gy + 1.25, z - Math.sin(ry) * 1.2);
  addBox(gold, 2.7, 0.12, 0.3, x, gy + 2.34, z, ry);
  addPlaque(root, text, 2.5, 0.62, x, gy + 1.82, z, ry);
}

function addEaveBells(gold, lantern, x, z, y, r, count, seed) {
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + seed;
    const px = x + Math.cos(a) * r;
    const pz = z + Math.sin(a) * r;
    addCylinder(gold, 0.025, 0.025, 0.36, 4, px, y - 0.18, pz);
    const b = new THREE.SphereGeometry(0.14, 7, 5);
    b.scale(0.85, 1.25, 0.85);
    b.translate(px, y - 0.42, pz);
    lantern.push(b);
  }
}

function addDockDressing(wood, gold, white, lantern, x, z, rot) {
  const gy = WATER_Y + 0.42;
  for (let i = 0; i < 5; i++) {
    const t = i / 4;
    const px = x + Math.cos(rot) * (t - 0.5) * 9;
    const pz = z + Math.sin(rot) * (t - 0.5) * 9;
    addBox(wood, 0.34, 0.14, 0.26, px, gy + 0.14, pz, rot);
    if (i % 2 === 0) {
      const ring = new THREE.TorusGeometry(0.25, 0.05, 5, 12);
      ring.rotateX(Math.PI / 2);
      ring.translate(px + 0.35, gy + 0.11, pz - 0.3);
      white.push(ring);
    }
  }
  addCylinder(gold, 0.055, 0.07, 1.8, 6, x, gy + 0.9, z);
  const lamp = new THREE.SphereGeometry(0.2, 7, 5);
  lamp.scale(0.9, 1.2, 0.9);
  lamp.translate(x, gy + 1.85, z);
  lantern.push(lamp);
}

export function addEastLakeRefinement(root) {
  const stone = [];
  const gold = [];
  const wood = [];
  const lantern = [];
  const paper = [];
  const rock = [];
  const reed = [];
  const blade = [];
  const cherry = [];
  const blossom = [];
  const white = [];
  const petal = [];
  const plank = [];

  for (const [x, z, seed] of [
    [-336, 102, 101], [-334, 130, 102], [-332, 160, 103], [-334, 190, 104],
    [-338, 218, 105], [-330, 240, 106], [-380, -30, 107], [-348, 34, 108],
    [-300, 268, 109], [82, 148, 110], [150, 172, 111], [232, 258, 112],
    [382, 132, 113], [420, 152, 114], [-160, 318, 115], [-220, 270, 116],
    [300, -92, 117], [-352, 60, 118], [-366, 18, 119], [470, 156, 120],
  ]) {
    addReeds(reed, x, z, seed, 9, 1.5);
    addShoreRocks(rock, x, z, seed + 40, 4, 4.4, 0.92);
    addBlade(blade, x + 1.4, z + 0.6, Math.max(WATER_Y, terrainHeight(x + 1.4, z + 0.6)), seed + 8, 1.15);
  }

  for (const [x, z, r] of [
    [-330, 116, 4.4], [-328, 146, 3.8], [-331, 178, 4.0],
    [-336, 208, 3.6], [104, 142, 4.0], [164, 184, 3.8],
    [400, 138, 3.6], [-198, 296, 4.0], [-314, 252, 3.4],
  ]) {
    if (terrainHeight(x, z) > WATER_Y - 0.02) continue;
    for (let i = 0; i < 7; i++) {
      const a = hash(x + z, i) * Math.PI * 2;
      const rr = r * (0.4 + hash(x + z, i + 4) * 0.6);
      const px = x + Math.cos(a) * rr;
      const pz = z + Math.sin(a) * rr;
      const f = new THREE.SphereGeometry(0.16, 6, 5);
      f.scale(0.8, 1.35, 0.8);
      f.translate(px, WATER_Y + 0.54, pz);
      cherry.push(f);
    }
  }

  addPetalCarpet(petal, -336, 152, 26, 90, 11200, 'water');
  addPetalCarpet(petal, -318, 764, 64, 220, 11201, 'path');
  addPetalCarpet(petal, -366, 704, 34, 100, 11202, 'ground');

  for (const [x, z] of [[-367, 4], [376, -63], [-46, 84]]) {
    addDockDressing(wood, gold, white, lantern, x, z, 0.2);
  }

  for (let i = 0; i < CORE.length - 1; i++) {
    const [x0, z0] = CORE[i];
    const [x1, z1] = CORE[i + 1];
    const dx = x1 - x0;
    const dz = z1 - z0;
    const len = Math.hypot(dx, dz) || 1;
    const nx = -dz / len;
    const nz = dx / len;
    const n = Math.max(1, Math.round(len / 1.05));
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      const px = x0 + dx * t + nx * 1.62;
      const pz = z0 + dz * t + nz * 1.62;
      const gy = Math.max(0.36, terrainHeight(px, pz));
      addBox(gold, 0.07, 0.9, 0.07, px, gy + 0.56, pz);
      if (k % 3 === 0) {
        addBox(gold, 0.09, 0.08, 0.9, px, gy + 1.0, pz, Math.atan2(dx, dz));
      }
    }
  }

  addEaveBells(gold, lantern, -347, 122, 5.55, 3.7, 8, 0.2);
  addEaveBells(gold, lantern, -343, 204, 4.18, 4.0, 6, 0.7);
  addEaveBells(gold, lantern, -322, 738, 22.0, 6.8, 8, 0.4);
  addEaveBells(gold, lantern, -404, 74, 8.75, 8.2, 10, 0.1);
  addEaveBells(gold, lantern, 600, -110, 76.6, 12.6, 12, 0.3);

  for (const [x, z, ry] of [
    [-351, 96, 1.4], [-345, 138, 1.5], [-344, 176, 1.6],
    [-347, 210, 1.2], [-330, 104, -1.4], [-328, 158, -1.5],
    [-360, 710, 0.4], [-286, 750, 2.1], [-310, 824, 2.6],
  ]) addBench(wood, x, z, ry, Math.max(0.55, terrainHeight(x, z) + 0.05));

  for (const [x, z, text, ry] of [
    [-356, 78, '听涛', 0.15], [-334, 236, '荷风', -0.2],
    [-410, 686, '樱园', 0.9], [-264, 812, '绿道', 2.2],
    [-458, -8, '环湖绿道', -0.1], [486, -142, '楚天台', 0.4],
  ]) addSign(root, wood, gold, x, z, text, ry);

  for (const [x, z, text] of [
    [-412, 706, '0.5 km'], [-276, 826, '1 km'], [-348, 676, '0.5 km'],
    [-448, -60, '3 km'], [-360, 264, '5 km'], [-426, 384, '7 km'],
  ]) addMarker(root, x, z, text, 0.3);

  for (const [x, z] of [[-340, 100], [-337, 158], [-338, 206], [-320, 232]]) {
    if (terrainHeight(x, z) < WATER_Y - 0.05) addBuoy(lantern, white, x, z, 0.9);
  }

  for (const [x, z, rx, rz, seed] of [
    [-372, 758, 7.5, 4.2, 12101], [-308, 790, 6.4, 3.8, 12102],
    [-338, 712, 6.8, 3.4, 12103], [-282, 730, 5.6, 3.2, 12104],
    [-392, 726, 5.2, 3.0, 12105], [-350, 842, 6.0, 3.2, 12106],
    [-448, 350, 6.4, 3.0, 12107], [-420, 398, 5.4, 2.8, 12108],
    [-470, 486, 5.8, 3.0, 12109],
  ]) addFlowerBed(root, stone, blade, blossom, cherry, x, z, rx, rz, seed);

  addGrassLine(blade, CYCLE, 2.25, 3.2, 12200, 0.95);
  addGrassLine(blade, CYCLE, 3.6, 4.4, 12300, 0.7);
  addGrassLine(blade, GREEN, 3.4, 4.8, 12400, 0.85);
  addGrassLine(blade, GREEN, 5.2, 6.0, 12500, 0.62);
  addPathEdge(stone, CYCLE, 1.75);
  addPathEdge(stone, GREEN.slice(11, 20), 3.15);

  for (const [x, z, gy, ry, seed, colors] of [
    [-343, 118, Math.max(0.5, terrainHeight(-343, 118)), 0.1, 12601, [mats.blue, mats.white]],
    [-341, 149, Math.max(0.5, terrainHeight(-341, 149)), 2.9, 12602, [mats.redLacquer, mats.teal]],
    [-346, 194, Math.max(0.5, terrainHeight(-346, 194)), -0.3, 12603, [mats.teal, mats.blue]],
    [-349, 224, Math.max(0.5, terrainHeight(-349, 224)), 1.1, 12604, [mats.white, mats.redLacquer]],
    [-350, 94, Math.max(0.5, terrainHeight(-350, 94)), 2.2, 12605, [mats.blue, mats.redLacquer]],
    [-398, 692, Math.max(0.8, terrainHeight(-398, 692)), 0.7, 12606, [mats.cherry, mats.white]],
    [-324, 744, Math.max(0.8, terrainHeight(-324, 744)), -1.3, 12607, [mats.blue, mats.white]],
    [-292, 810, Math.max(0.8, terrainHeight(-292, 810)), 2.1, 12608, [mats.redLacquer, mats.teal]],
    [-362, 826, Math.max(0.8, terrainHeight(-362, 826)), 0.2, 12609, [mats.teal, mats.white]],
    [-416, 744, Math.max(0.8, terrainHeight(-416, 744)), 1.6, 12610, [mats.blue, mats.cherry]],
    [-452, -24, Math.max(0.65, terrainHeight(-452, -24)), 1.4, 12611, [mats.redLacquer, mats.blue]],
    [-440, 342, Math.max(0.65, terrainHeight(-440, 342)), 2.6, 12612, [mats.white, mats.blue]],
  ]) addPerson(root, x, z, gy, ry, seed, colors);

  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    const x = 507 + t * 76;
    const z = -119 + t * 9;
    const gy = terrainHeight(x, z);
    addBlade(blade, x - 7.2, z + 1.2, gy, 12700 + i, 0.9);
    addBlade(blade, x + 7.0, z - 1.2, gy, 12720 + i, 0.75);
  }

  for (const [list, mat, cast, receive] of [
    [stone, mats.marbleShade, true, true],
    [gold, mats.gold, true, true],
    [wood, mats.wood, true, true],
    [lantern, mats.lantern, true, false],
    [paper, mats.paper, true, false],
    [rock, mats.rock, true, true],
    [reed, mats.reed, false, true],
    [blade, mats.blade, false, true],
    [cherry, mats.cherry, false, true],
    [blossom, mats.blossom, false, true],
    [white, mats.white, true, true],
    [petal, mats.cherryLight, false, true],
    [plank, mats.plank, true, true],
  ]) {
    const mesh = mergedMesh(list, mat, cast, receive);
    if (mesh) root.add(mesh);
  }
}
