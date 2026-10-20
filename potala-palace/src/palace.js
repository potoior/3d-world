import * as THREE from 'three';
import { mats, makePlaqueMaterial } from './materials.js';
import { addBox, addCylinder, trapezoidGeometry } from './geometry.js';
import { createRoof } from './roof.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const L = {
  white: [],
  whiteShade: [],
  red: [],
  redShade: [],
  trim: [],
  trimRed: [],
  gold: [],
  stone: [],
  stoneDark: [],
  paving: [],
  window: [],
  frame: [],
  wood: [],
  ochre: [],
  goldBright: [],
  lantern: [],
  copper: [],
  robe: [],
  robeGold: [],
  skin: [],
  foliage: [],
  plaqueWhite: [],
  plaqueRed: [],
  plaqueGold: [],
  plaqueCourt: [],
};

const plaqueMaterials = {
  plaqueWhite: makePlaqueMaterial('白 宫'),
  plaqueRed: makePlaqueMaterial('红 宫'),
  plaqueGold: makePlaqueMaterial('金 顶'),
  plaqueCourt: makePlaqueMaterial('德 阳 厦'),
};

function addTrap(list, x, y, z, w, h, ry, offset) {
  const nx = Math.sin(ry);
  const nz = Math.cos(ry);
  const g = trapezoidGeometry(w, h, 0.66);
  if (ry) g.rotateY(ry);
  g.translate(x + nx * offset, y, z + nz * offset);
  list.push(g);
}

function addWin(x, y, z, w, h, ry, frameList) {
  const nx = Math.sin(ry);
  const nz = Math.cos(ry);
  addTrap(L.trim, x, y, z, w * 1.34, h * 1.24, ry, 0.012);
  addTrap(frameList, x, y, z, w * 1.16, h * 1.12, ry, 0.055);
  addTrap(L.window, x, y, z, w, h, ry, 0.115);
  const lintel = new THREE.BoxGeometry(w * 1.44, 0.38, 0.36);
  if (ry) lintel.rotateY(ry);
  lintel.translate(x + nx * 0.14, y + h + 0.22, z + nz * 0.14);
  L.trim.push(lintel);
  const gilt = new THREE.BoxGeometry(w * 1.3, 0.09, 0.42);
  if (ry) gilt.rotateY(ry);
  gilt.translate(x + nx * 0.17, y + h + 0.47, z + nz * 0.17);
  L.goldBright.push(gilt);
  const sill = new THREE.BoxGeometry(w * 1.44, 0.28, 0.42);
  if (ry) sill.rotateY(ry);
  sill.translate(x + nx * 0.16, y - 0.25, z + nz * 0.16);
  L.trim.push(sill);
  const cap = new THREE.BoxGeometry(w * 1.3, 0.1, 0.5);
  if (ry) cap.rotateY(ry);
  cap.translate(x + nx * 0.19, y - 0.08, z + nz * 0.19);
  L.ochre.push(cap);
  const barV = new THREE.BoxGeometry(w * 0.07, h * 0.9, 0.05);
  if (ry) barV.rotateY(ry);
  barV.translate(x + nx * 0.2, y + h * 0.5, z + nz * 0.2);
  L.wood.push(barV);
  const barH = new THREE.BoxGeometry(w * 0.84, 0.07, 0.05);
  if (ry) barH.rotateY(ry);
  barH.translate(x + nx * 0.2, y + h * 0.64, z + nz * 0.2);
  L.wood.push(barH);
}

function frontGrid(x0, x1, z, rows, w, h, cols, frameList, ry = 0, gaps = null) {
  const step = cols > 1 ? (x1 - x0) / (cols - 1) : 0;
  for (const y of rows) {
    for (let i = 0; i < cols; i++) {
      const x = x0 + step * i;
      if (gaps && gaps.some((g) => Math.abs(x - g[0]) < g[1] + w * 0.6)) continue;
      addWin(x, y, z, w, h, ry, frameList);
    }
  }
}

function sideGrid(x, z0, z1, rows, w, h, cols, frameList, ry = Math.PI / 2, gaps = null) {
  const step = cols > 1 ? (z1 - z0) / (cols - 1) : 0;
  for (const y of rows) {
    for (let i = 0; i < cols; i++) {
      const z = z0 + step * i;
      if (gaps && gaps.some((g) => Math.abs(z - g[0]) < g[1] + w * 0.6)) continue;
      addWin(x, y, z, w, h, ry, frameList);
    }
  }
}

function band(list, w, h, d, x, y, z, ry = 0) {
  addBox(list, w, h, d, x, y, z, ry);
}

function addPlaque(list, x, y, z, w, h, ry = 0) {
  addBox(L.gold, w + 0.42, h + 0.36, 0.12, x, y, z, ry);
  const g = new THREE.BoxGeometry(w, h, 0.18);
  if (ry) g.rotateY(ry);
  g.translate(x + Math.sin(ry) * 0.11, y, z + Math.cos(ry) * 0.11);
  list.push(g);
}

function addDoor(x, y, z, w, h, ry = 0) {
  const nx = Math.sin(ry);
  const nz = Math.cos(ry);
  addBox(L.stone, w * 1.3, 0.26, 1.5, x + nx * 0.7, y + 0.13, z + nz * 0.7, ry);
  addBox(L.trim, w + 1.1, h + 0.8, 0.42, x + nx * 0.05, y + h / 2, z + nz * 0.05, ry);
  addBox(L.trimRed, w, h, 0.26, x + nx * 0.22, y + h / 2, z + nz * 0.22, ry);
  addBox(L.gold, 0.16, h * 0.9, 0.3, x + nx * 0.31, y + h / 2, z + nz * 0.31, ry);
  for (let c = -1; c <= 1; c++) {
    for (let r = 0; r < 4; r++) {
      const u = c * w * 0.28;
      addBox(
        L.goldBright, 0.16, 0.16, 0.12,
        x + Math.cos(ry) * u + nx * 0.36,
        y + h * (0.22 + r * 0.19),
        z - Math.sin(ry) * u + nz * 0.36,
        ry
      );
    }
  }
  addBox(L.gold, w + 0.9, 0.22, 0.34, x + nx * 0.28, y + h + 0.55, z + nz * 0.28, ry);
}

function addBeamRun(ax, az, bx, bz, y, step = 2.55) {
  const dx = bx - ax;
  const dz = bz - az;
  const len = Math.hypot(dx, dz);
  const n = Math.max(2, Math.round(len / step));
  const ry = Math.atan2(dx, dz);
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const x = ax + dx * t;
    const z = az + dz * t;
    addBox(L.ochre, 0.58, 0.72, 0.62, x, y, z, ry);
    addBox(L.trim, 0.68, 0.13, 0.18, x, y - 0.42, z, ry);
    addBox(L.goldBright, 0.2, 0.2, 0.12, x, y + 0.16, z, ry);
  }
}

function addLantern(x, y, z, s = 1) {
  addCylinder(L.wood, 0.1 * s, 0.14 * s, 2.9 * s, 6, x, y + 1.45 * s, z);
  addBox(L.trim, 0.42 * s, 0.13 * s, 0.42 * s, x, y + 2.94 * s, z);
  addCylinder(L.lantern, 0.29 * s, 0.35 * s, 0.62 * s, 8, x, y + 3.28 * s, z);
  addBox(L.trim, 0.55 * s, 0.09 * s, 0.55 * s, x, y + 3.64 * s, z);
  addCylinder(L.copper, 0.05 * s, 0.22 * s, 0.34 * s, 6, x, y + 3.86 * s, z);
  addBox(L.ochre, 0.62 * s, 0.34 * s, 0.62 * s, x, y + 0.17 * s, z);
}

function addOilLamp(x, y, z, s = 1) {
  addCylinder(L.copper, 0.3 * s, 0.17 * s, 0.24 * s, 8, x, y + 0.12 * s, z);
  addCylinder(L.lantern, 0.09 * s, 0.15 * s, 0.26 * s, 6, x, y + 0.36 * s, z);
}

function addPlanter(x, y, z, s = 1) {
  addCylinder(L.ochre, 0.36 * s, 0.48 * s, 0.72 * s, 8, x, y + 0.36 * s, z);
  addCylinder(L.trim, 0.43 * s, 0.43 * s, 0.1 * s, 8, x, y + 0.72 * s, z);
  const g = new THREE.DodecahedronGeometry(0.72 * s, 0);
  g.scale(1.0, 1.25, 1.0);
  g.translate(x, y + 1.45 * s, z);
  L.foliage.push(g);
}

function addBench(x, y, z, len, ry = 0) {
  const tx = Math.cos(ry);
  const tz = -Math.sin(ry);
  const nx = Math.sin(ry);
  const nz = Math.cos(ry);
  addBox(L.wood, len, 0.13, 0.58, x, y + 0.55, z, ry);
  addBox(L.wood, len, 0.52, 0.11, x - nx * 0.26, y + 0.86, z - nz * 0.26, ry);
  for (const s of [-0.4, 0.4]) {
    addBox(L.stoneDark, 0.3, 0.5, 0.46, x + tx * len * s, y + 0.25, z + tz * len * s, ry);
  }
}

function addFigure(x, y, z, s = 1, ry = 0) {
  addCylinder(L.robe, 0.24 * s, 0.43 * s, 1.02 * s, 7, x, y + 0.51 * s, z);
  addCylinder(L.robeGold, 0.27 * s, 0.34 * s, 0.24 * s, 7, x, y + 0.84 * s, z);
  addCylinder(L.robe, 0.23 * s, 0.3 * s, 0.42 * s, 7, x, y + 1.2 * s, z);
  const head = new THREE.SphereGeometry(0.16 * s, 8, 6);
  head.translate(x + Math.sin(ry) * 0.03, y + 1.52 * s, z + Math.cos(ry) * 0.03);
  L.skin.push(head);
  addCylinder(L.robeGold, 0.17 * s, 0.2 * s, 0.12 * s, 6, x, y + 1.66 * s, z);
  addBox(L.robe, 0.09 * s, 0.5 * s, 0.16 * s, x + Math.cos(ry) * 0.32 * s, y + 1.08 * s, z - Math.sin(ry) * 0.32 * s, ry);
}

function addGoldFinial(x, y, z, s = 1) {
  addCylinder(L.gold, 0.38 * s, 0.46 * s, 5.6 * s, 8, x, y + 2.8 * s, z);
  const ball = new THREE.SphereGeometry(0.85 * s, 10, 8);
  ball.translate(x, y + 5.9 * s, z);
  L.gold.push(ball);
  const tip = new THREE.ConeGeometry(0.5 * s, 2.2 * s, 6);
  tip.translate(x, y + 7.4 * s, z);
  L.gold.push(tip);
  const jewel = new THREE.SphereGeometry(0.36 * s, 8, 6);
  jewel.translate(x, y + 8.6 * s, z);
  L.gold.push(jewel);
}

function parapet(list, w, d, x, y, z, h = 1.3, t = 0.55) {
  band(list, w, h, t, x, y + h / 2, z + d / 2 - t / 2);
  band(list, w, h, t, x, y + h / 2, z - d / 2 + t / 2);
  band(list, t, h, d, x + w / 2 - t / 2, y + h / 2, z);
  band(list, t, h, d, x - w / 2 + t / 2, y + h / 2, z);
}

function buildMasses() {
  addBox(L.white, 138, 42, 136, 113, 75, 10);
  addBox(L.white, 102, 36, 134, -131, 72, 11);
  addBox(L.red, 102, 62, 126, -7, 85, 11);
  addBox(L.whiteShade, 112, 6, 8, -8, 57, 78);
  addBox(L.redShade, 104, 0.8, 128, -7, 116, 11);
  addBox(L.whiteShade, 140, 0.7, 138, 113, 96, 10);
  addBox(L.whiteShade, 104, 0.7, 136, -131, 90, 11);

  const weRows = [];
  for (let i = 0; i < 8; i++) weRows.push(57.4 + i * 4.55);
  frontGrid(52, 174, 78.25, weRows, 4.1, 3.0, 13, L.frame, 0, [[82, 4.5], [160, 3.5]]);
  sideGrid(182.25, -46, 66, weRows, 3.9, 2.9, 7, L.frame);
  for (const y of weRows) {
    band(L.trim, 138.4, 0.22, 0.34, 113, y + 3.55, 78.12);
    band(L.trim, 0.34, 0.22, 136.4, 182.12, y + 3.55, 10);
  }
  band(L.trim, 139, 1.8, 0.5, 113, 95.1, 78.2);
  band(L.goldBright, 139.4, 0.16, 0.56, 113, 94.1, 78.2);
  band(L.goldBright, 139.4, 0.16, 0.56, 113, 96.1, 78.2);
  addBeamRun(44.4, 78.44, 181.6, 78.44, 93.4);
  addBeamRun(182.34, -57, 182.34, 77, 93.4);

  const wwRows = [];
  for (let i = 0; i < 7; i++) wwRows.push(57.4 + i * 4.4);
  frontGrid(-174, -88, 78.25, wwRows, 4.1, 3.0, 9, L.frame);
  sideGrid(-182.25, -46, 64, wwRows, 3.9, 2.9, 6, L.frame);
  for (const y of wwRows) {
    band(L.trim, 102.4, 0.22, 0.34, -131, y + 3.55, 78.12);
    band(L.trim, 0.34, 0.22, 134.4, -182.12, y + 3.55, 11);
  }
  band(L.trim, 103, 1.6, 0.5, -131, 89.2, 78.2);
  band(L.goldBright, 103.4, 0.15, 0.56, -131, 88.3, 78.2);
  addBeamRun(-181.6, 78.44, -80.4, 78.44, 87.8);
  addBeamRun(-182.34, -57, -182.34, 75, 87.8);

  const rRows = [];
  for (let i = 0; i < 13; i++) rRows.push(59.3 + i * 3.92);
  frontGrid(-52, 38, 74.2, rRows, 4.15, 2.82, 9, L.frame, 0, [[-7, 5.6]]);
  sideGrid(44.2, -40, 62, [92.4, 96.4, 100.4, 104.4, 108.0], 3.9, 2.7, 6, L.frame);
  sideGrid(-58.2, -40, 60, [90.4, 94.4, 98.4, 102.4, 108.0], 3.9, 2.7, 6, L.frame, -Math.PI / 2);
  for (let i = 0; i < 14; i++) {
    const y = 57.7 + i * 3.92;
    band(L.trimRed, 102.3, 0.2, 0.3, -7, y, 74.12);
    band(L.trimRed, 0.3, 0.2, 127.3, 44.12, y, 11);
    band(L.trimRed, 0.3, 0.2, 127.3, -58.12, y, 11);
  }
  addBeamRun(-57.6, 74.38, 43.6, 74.38, 111.3);
  addBeamRun(44.34, -57, 44.34, 77, 111.3);
  addBeamRun(-58.34, -57, -58.34, 75, 111.3);

  addBox(L.trim, 13, 10, 0.7, -7, 69, 74.55);
  addBox(L.gold, 15, 0.7, 2.4, -7, 74.6, 75.2);
  addBox(L.trimRed, 113, 3.4, 0.7, 113, 58.1, 78.55);
  addBox(L.trimRed, 104, 3.4, 0.7, -131, 58.1, 78.55);

  addBox(L.whiteShade, 76, 1.5, 6, 113, 96.5, 77.6);
  addBox(L.whiteShade, 86, 1.5, 6, -131, 90.5, 77.6);
  parapet(L.whiteShade, 140, 138, 113, 96.2, 10, 1.1, 0.5);
  parapet(L.whiteShade, 104, 136, -131, 90.2, 11, 1.1, 0.5);
  parapet(L.trim, 106, 130, -7, 116.2, 11, 1.15, 0.6);
}

function buildRoofs(root) {
  const roofs = [
    [-7, 116, 20, 92, 58, 11, 2.4],
    [-38, 116, 46, 32, 24, 7.5, 1.6],
    [26, 116, 46, 30, 22, 7, 1.5],
    [-7, 107, 70, 38, 18, 6.5, 1.4],
    [88, 96.4, 12, 34, 26, 7.5, 1.7],
    [140, 96.4, 12, 25, 20, 6.2, 1.4],
    [-132, 90.4, 8, 30, 24, 6.8, 1.5],
    [93, 52, 180, 38, 14, 5.2, 1.2],
    [166, 52, 180, 38, 14, 5.2, 1.2],
  ];
  for (const [x, y, z, w, d, h, lift] of roofs) {
    const r = createRoof({
      width: w,
      depth: d,
      height: h,
      cornerLift: lift,
      curve: 1.62,
      ridgeRatio: 0.5,
      beasts: true,
      hasRidge: true,
      fascia: true,
    });
    r.position.set(x, y, z);
    root.add(r);
    addGoldFinial(x, y + h + 0.4, z, w > 60 ? 1.05 : 0.7);
  }
  addGoldFinial(113, 97, -18, 0.6);
  addGoldFinial(-131, 91, -24, 0.6);
}

function buildCourtyard() {
  addBox(L.white, 18, 9, 62, 73, 48.5, 143);
  addBox(L.white, 18, 9, 62, 181, 48.5, 143);
  addBox(L.whiteShade, 20, 0.8, 64, 73, 53.3, 143);
  addBox(L.whiteShade, 20, 0.8, 64, 181, 53.3, 143);
  parapet(L.whiteShade, 20, 64, 73, 53.2, 143, 1, 0.45);
  parapet(L.whiteShade, 20, 64, 181, 53.2, 143, 1, 0.45);
  addBox(L.white, 43, 8, 12, 93.5, 48, 180);
  addBox(L.white, 45, 8, 12, 165.5, 48, 180);
  addBox(L.whiteShade, 45, 0.8, 14, 93.5, 52.3, 180);
  addBox(L.whiteShade, 47, 0.8, 14, 165.5, 52.3, 180);
  band(L.trim, 18.4, 2.2, 0.6, 73, 46, 112.2);
  band(L.trim, 18.4, 2.2, 0.6, 181, 46, 112.2);
  band(L.trim, 43.4, 2, 0.6, 93.5, 45.8, 174.1);
  band(L.trim, 45.4, 2, 0.6, 165.5, 45.8, 174.1);

  sideGrid(82.25, 120, 166, [46.5, 50.2], 3.2, 2.3, 5, L.frame, Math.PI / 2, [[143, 3.4]]);
  sideGrid(171.75, 120, 166, [46.5, 50.2], 3.2, 2.3, 5, L.frame, -Math.PI / 2, [[143, 3.4]]);
  frontGrid(80, 107, 173.75, [46.6, 50.2], 3.2, 2.3, 3, L.frame, Math.PI);
  frontGrid(152, 179, 173.75, [46.6, 50.2], 3.2, 2.3, 3, L.frame, Math.PI);

  addBox(L.trim, 30, 7.4, 0.7, 127, 47.7, 96.2);
  addBox(L.gold, 33, 0.6, 2.2, 127, 51.6, 96.8);

  addBox(L.whiteShade, 3.5, 1.7, 76, 83.5, 44.85, 142);
  addBox(L.whiteShade, 3.5, 1.7, 76, 170.5, 44.85, 142);
  addBox(L.whiteShade, 12, 1.7, 3.5, 78, 44.85, 108);
  addBox(L.whiteShade, 12, 1.7, 3.5, 176, 44.85, 108);

  addCylinder(L.wood, 0.35, 0.45, 16, 8, 84, 52, 112);
  addCylinder(L.wood, 0.35, 0.45, 16, 8, 170, 52, 112);
  addCylinder(L.wood, 0.35, 0.45, 16, 8, 84, 52, 168);
  addCylinder(L.wood, 0.35, 0.45, 16, 8, 170, 52, 168);
  addCylinder(L.wood, 0.4, 0.5, 16, 8, 104, 7.5, 344);
  addCylinder(L.wood, 0.4, 0.5, 16, 8, 172, 7.5, 344);
  addCylinder(L.wood, 0.45, 0.55, 30, 8, 238, 12, 78);

  addDoor(82.2, 44.2, 143, 5.4, 6.4, Math.PI / 2);
  addPlaque(L.plaqueCourt, 83.0, 52.6, 143, 5.2, 1.5, Math.PI / 2);
  addDoor(171.8, 44.2, 143, 5.4, 6.4, -Math.PI / 2);
  addPlaque(L.plaqueCourt, 171.1, 52.6, 143, 5.2, 1.5, -Math.PI / 2);
  addDoor(127, 44.2, 96.4, 8.4, 7.2, Math.PI);
  addPlaque(L.plaqueCourt, 127, 53.2, 95.6, 6.4, 1.7, Math.PI);

  addBench(91, 44, 118, 4.2, Math.PI / 2);
  addBench(91, 44, 160, 4.2, Math.PI / 2);
  addBench(163, 44, 120, 4.2, -Math.PI / 2);
  addBench(163, 44, 162, 4.2, -Math.PI / 2);
  addLantern(84, 44, 110, 0.8);
  addLantern(169.5, 44, 110, 0.8);
  addLantern(84, 44, 172, 0.8);
  addLantern(169.5, 44, 172, 0.8);
  addPlanter(86, 44, 114, 0.9);
  addPlanter(168, 44, 114, 0.9);
  addPlanter(86, 44, 168, 0.9);
  addPlanter(168, 44, 168, 0.9);
  addOilLamp(98, 44, 110, 1);
  addOilLamp(156, 44, 110, 1);
  addOilLamp(127, 44, 100, 1.15);
  addFigure(104, 44, 126, 1.0, Math.PI);
  addFigure(150, 44, 148, 0.96, -2.4);
  addFigure(118, 44, 158, 0.9, 0.8);
  addFigure(160, 44, 128, 1.02, -0.6);
  addFigure(138, 44, 166, 0.92, Math.PI);
  addFigure(92, 44, 150, 0.94, 1.4);
}

function buildDetails() {
  addBox(L.white, 290, 8, 9, -85, 40, 94);
  addBox(L.white, 260, 10, 9, -90, 31, 100);
  addBox(L.white, 230, 8, 9, -95, 21, 106);
  addBox(L.trim, 291, 1.2, 10, -85, 43.4, 94);
  addBox(L.trim, 261, 1.1, 10, -90, 35.5, 100);
  addBox(L.trim, 231, 1, 10, -95, 24.6, 106);

  for (let i = 0; i < 5; i++) {
    const x = -215 + i * 56;
    addWin(x, 37.5, 98.7, 4.2, 3.2, 0, L.frame);
    addWin(x, 28, 104.7, 4.2, 3.2, 0, L.frame);
    addWin(x, 19, 110.7, 4.2, 3.2, 0, L.frame);
  }

  addBox(L.trim, 16, 9.5, 1, 127, 59, 78.6);
  addBox(L.gold, 18, 0.7, 2.8, 127, 64, 79.2);
  addBox(L.redShade, 11, 6.2, 0.8, 127, 58, 79.1);
  addBox(L.gold, 4, 3.2, 0.6, 127, 58.6, 79.6);

  addBox(L.trim, 106, 3.2, 0.7, -7, 112.8, 74.3);
  addBox(L.gold, 108, 0.45, 1.3, -7, 114.1, 74.5);
  band(L.trim, 0.7, 3.2, 127, 44.2, 112.8, 11);
  band(L.trim, 0.7, 3.2, 127, -58.2, 112.8, 11);

  addBox(L.trimRed, 7, 8, 1, 113, 60, 78.7);
  addBox(L.trimRed, 7, 8, 1, -131, 60, 78.7);
  addBox(L.trimRed, 7, 8, 1, 73, 48, 112.7);
  addBox(L.trimRed, 7, 8, 1, 181, 48, 112.7);

  addBox(L.whiteShade, 128, 1.2, 4, 127, 44.65, 96);
  addBox(L.whiteShade, 4, 1.2, 18, 62, 44.65, 87);
  addBox(L.whiteShade, 4, 1.2, 18, 184, 44.65, 87);

  addDoor(82, 54.2, 78.35, 7, 8.6, 0);
  addPlaque(L.plaqueWhite, 82, 64.6, 79.0, 6.4, 1.9, 0);
  addDoor(160, 54.2, 78.35, 5, 6.4, 0);
  addPlaque(L.plaqueWhite, 160, 62.2, 79.0, 4.4, 1.4, 0);
  addDoor(-7, 64.2, 74.85, 10.5, 9.4, 0);
  addPlaque(L.plaqueWhite, 127, 65.0, 79.4, 6.4, 1.7, 0);
  addPlaque(L.plaqueRed, -7, 75.9, 75.5, 7, 2.0, 0);
  addPlaque(L.plaqueGold, -7, 115.4, 74.8, 5.6, 1.6, 0);

  addBox(L.whiteShade, 15, 1.1, 0.5, 61.5, 54.55, 95.5);
  addBox(L.whiteShade, 89, 1.1, 0.5, 139.5, 54.55, 95.5);
  addBox(L.whiteShade, 0.5, 1.1, 17, 56.3, 54.55, 86.5);
  addBox(L.whiteShade, 0.5, 1.1, 17, 183.7, 54.55, 86.5);
  band(L.goldBright, 15, 0.1, 0.62, 61.5, 55.16, 95.5);
  band(L.goldBright, 89, 0.1, 0.62, 139.5, 55.16, 95.5);
  band(L.goldBright, 0.62, 0.1, 17, 56.3, 55.16, 86.5);
  band(L.goldBright, 0.62, 0.1, 17, 183.7, 55.16, 86.5);

  addLantern(68, 54, 93, 0.82);
  addLantern(177, 54, 93, 0.82);
  addLantern(74, 54, 79.8, 0.72);
  addLantern(90, 54, 79.8, 0.72);
  addBench(104, 54, 92, 4.4, 0);
  addBench(145, 54, 92, 4.4, 0);
  addPlanter(60, 54, 80, 1.0);
  addPlanter(180, 54, 80, 1.0);
  addOilLamp(82, 54, 97.2, 1.15);
  addFigure(112, 54, 88, 1.0, -0.7);
  addFigure(154, 54, 90, 0.94, -2.1);
  addFigure(96, 54, 84, 0.9, 0.5);
}

function meshFrom(list, material, cast = true, receive = true) {
  if (!list.length) return null;
  const geo = mergeGeometries(list, false);
  list.forEach((g) => g.dispose());
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  return mesh;
}

export function buildPalace() {
  const group = new THREE.Group();
  buildMasses();
  buildCourtyard();
  buildRoofs(group);
  buildDetails();

  const defs = [
    [L.white, mats.white],
    [L.whiteShade, mats.whiteShade],
    [L.red, mats.red],
    [L.redShade, mats.redShade],
    [L.trim, mats.trim],
    [L.trimRed, mats.trimRed],
    [L.gold, mats.gold],
    [L.stone, mats.stone],
    [L.stoneDark, mats.stoneDark],
    [L.paving, mats.paving],
    [L.window, mats.window],
    [L.frame, mats.windowFrame],
    [L.wood, mats.wood],
    [L.ochre, mats.ochre],
    [L.goldBright, mats.goldBright],
    [L.lantern, mats.lantern],
    [L.copper, mats.copper],
    [L.robe, mats.robe],
    [L.robeGold, mats.robeGold],
    [L.skin, mats.skin],
    [L.foliage, mats.foliage],
    [L.plaqueWhite, plaqueMaterials.plaqueWhite],
    [L.plaqueRed, plaqueMaterials.plaqueRed],
    [L.plaqueGold, plaqueMaterials.plaqueGold],
    [L.plaqueCourt, plaqueMaterials.plaqueCourt],
  ];
  for (const [list, mat] of defs) {
    const mesh = meshFrom(list, mat);
    if (mesh) group.add(mesh);
  }
  return group;
}
