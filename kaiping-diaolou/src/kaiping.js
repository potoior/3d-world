import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mats, makeWaterMaterial, sharedTextures } from './materials.js';
import { addBox, addCylinder, addBar, mergedMesh, mergeStaticGroup } from './geometry.js';
import { createRoofGeometry } from './roof.js';
import { createHill } from './westlakeDetails.js';
import { createLotus } from './gardenDetails.js';
import { createReedPatch } from './richProps.js';
import { getPlaqueMaterial } from './gardenBuild.js';

const POND = { x: 0, z: 58, rx: 46, rz: 25 };
const SPAWN = { x: -60, z: 100, yaw: -0.8 };
const BOUNDS = { minX: -235, maxX: 235, minZ: -195, maxZ: 215 };
const COLLIDERS = { boxes: [], circles: [], names: [] };

function ellipsePolygon({ x, z, rx, rz, segments = 64 }) {
  const pts = [];
  for (let i = 0; i < segments; i++) {
    const a = (Math.PI * 2 * i) / segments;
    const wobble = 1 + Math.sin(a * 3 + 0.7) * 0.035 + Math.sin(a * 5 - 1.4) * 0.02;
    pts.push([x + Math.cos(a) * rx * wobble, z + Math.sin(a) * rz * wobble]);
  }
  return pts;
}

const POND_POLY = ellipsePolygon(POND);

export const KAIPING_FP_WORLD = {
  lake: POND_POLY,
  waterRects: [],
  causeways: [],
  bridges: [],
  islets: [],
  spawn: SPAWN,
  bounds: BOUNDS,
  colliders: COLLIDERS,
};

const tileGreen = new THREE.MeshStandardMaterial({
  map: sharedTextures.roofMap,
  color: 0x8ca58e,
  roughness: 0.72,
  metalness: 0.06,
  side: THREE.DoubleSide,
});

const M = {
  render: new THREE.MeshStandardMaterial({ map: sharedTextures.wallMap, color: 0xd9d0b6, roughness: 0.95 }),
  renderPale: new THREE.MeshStandardMaterial({ map: sharedTextures.wallMap, color: 0xe4ddc8, roughness: 0.95 }),
  renderGrey: new THREE.MeshStandardMaterial({ map: sharedTextures.wallMap, color: 0xc2c2ae, roughness: 0.96 }),
  renderWarm: new THREE.MeshStandardMaterial({ map: sharedTextures.wallMap, color: 0xd2bfa0, roughness: 0.95 }),
  stone: mats.stone,
  stoneDark: new THREE.MeshStandardMaterial({ color: 0x767466, roughness: 0.96 }),
  brick: mats.brick,
  plaster: mats.plaster,
  trim: mats.trimDark,
  cream: new THREE.MeshStandardMaterial({ color: 0xd9d1bc, roughness: 0.9 }),
  wood: mats.huizhouWood,
  woodDark: mats.huizhouWoodDark,
  gold: mats.gold,
  dark: new THREE.MeshStandardMaterial({ color: 0x232824, roughness: 0.8 }),
  glass: new THREE.MeshStandardMaterial({ color: 0x304640, roughness: 0.32, metalness: 0.25 }),
  shutter: new THREE.MeshStandardMaterial({ color: 0x405b45, roughness: 0.82 }),
  tile: tileGreen,
  roof: mats.tileDark,
  red: mats.lanternRed,
  earth: new THREE.MeshStandardMaterial({ map: sharedTextures.townPavingMap, color: 0xb8ad91, roughness: 0.98 }),
  lane: mats.lane,
  soil: new THREE.MeshStandardMaterial({ color: 0x6d6248, roughness: 1.0 }),
  paddyWater: new THREE.MeshStandardMaterial({ color: 0x596b50, roughness: 0.3, metalness: 0.08 }),
  rice: new THREE.MeshStandardMaterial({ color: 0x5f8a45, roughness: 0.95 }),
  riceLight: new THREE.MeshStandardMaterial({ color: 0x7da65b, roughness: 0.95 }),
  leaf: new THREE.MeshStandardMaterial({ color: 0x3e6a45, roughness: 0.94 }),
  leafLight: new THREE.MeshStandardMaterial({ color: 0x557f4f, roughness: 0.94 }),
  bark: new THREE.MeshStandardMaterial({ color: 0x594834, roughness: 0.98 }),
  bird: new THREE.MeshStandardMaterial({ color: 0xf2f0e6, roughness: 0.85 }),
  beak: new THREE.MeshStandardMaterial({ color: 0xd9a34c, roughness: 0.7 }),
  birdLeg: new THREE.MeshStandardMaterial({ color: 0x38342c, roughness: 0.8 }),
  flag: new THREE.MeshStandardMaterial({ color: 0xb32722, roughness: 0.82, side: THREE.DoubleSide }),
  visitor: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }),
};

const glowMaterial = new THREE.MeshBasicMaterial({
  color: 0xffb35c,
  transparent: true,
  opacity: 0.06,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  toneMapped: false,
});

function addBoxCollider(x, z, w, d, name) {
  COLLIDERS.boxes.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
  COLLIDERS.names.push(name);
}

function addCircleCollider(x, z, r, name) {
  COLLIDERS.circles.push({ x, z, r });
  COLLIDERS.names.push(name);
}

function addBalustrade(lists, w, d, y, spacing = 1.3) {
  const run = (x1, z1, x2, z2) => {
    const len = Math.hypot(x2 - x1, z2 - z1);
    const n = Math.max(1, Math.round(len / spacing));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const px = x1 + (x2 - x1) * t;
      const pz = z1 + (z2 - z1) * t;
      addBox(lists.cream, 0.26, 0.76, 0.26, px, y + 0.38, pz);
      if (i < n) {
        const nx = x1 + (x2 - x1) * ((i + 1) / n);
        const nz = z1 + (z2 - z1) * ((i + 1) / n);
        addBar(lists.cream, px, pz, nx, nz, y + 0.66, 0.12, 0.16);
      }
    }
  };
  run(-w / 2, -d / 2, w / 2, -d / 2);
  run(-w / 2, d / 2, w / 2, d / 2);
  run(-w / 2, -d / 2, -w / 2, d / 2);
  run(w / 2, -d / 2, w / 2, d / 2);
}

function addFrontWindow(lists, x, y, z, ww, wh, arched = false) {
  addBox(lists.dark, ww, wh, 0.12, x, y, z);
  addBox(lists.trim, ww + 0.3, 0.13, 0.24, x, y + wh / 2 + 0.06, z);
  addBox(lists.trim, ww + 0.3, 0.16, 0.3, x, y - wh / 2 - 0.06, z);
  for (const s of [-1, 1]) addBox(lists.trim, 0.12, wh + 0.24, 0.2, x + s * (ww / 2 + 0.06), y, z);
  if (arched) {
    const half = new THREE.CircleGeometry(ww / 2, 12, 0, Math.PI);
    half.translate(x, y + wh / 2 + 0.02, z + 0.04);
    lists.darkParts.push(half);
    const ring = new THREE.RingGeometry(ww / 2, ww / 2 + 0.13, 14, 1, 0, Math.PI);
    ring.translate(x, y + wh / 2 + 0.02, z + 0.07);
    lists.trimParts.push(ring);
  }
  addBox(lists.glass, ww * 0.42, wh * 0.86, 0.05, x - ww * 0.25, y, z + 0.07);
  addBox(lists.glass, ww * 0.42, wh * 0.86, 0.05, x + ww * 0.25, y, z + 0.07);
  for (const s of [-1, 1]) addBox(lists.shutter, ww * 0.4, wh * 0.92, 0.07, x + s * (ww / 2 + 0.28), y, z + 0.09);
}

function addSideWindow(lists, side, z, y, ww, wh) {
  const x = side * 0.5;
  addBox(lists.dark, 0.12, wh, ww, x, y, z);
  addBox(lists.trim, 0.24, 0.13, ww + 0.3, x, y + wh / 2 + 0.06, z);
  addBox(lists.trim, 0.3, 0.16, ww + 0.3, x, y - wh / 2 - 0.06, z);
  addBox(lists.glass, 0.05, wh * 0.86, ww * 0.8, x + side * 0.07, y, z);
}

function addPediment(group, w, y, z, height, material) {
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, 0);
  shape.lineTo(w / 2, 0);
  shape.lineTo(0, height);
  shape.lineTo(-w / 2, 0);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.38, bevelEnabled: false });
  geo.translate(0, y, z);
  const mesh = new THREE.Mesh(geo, material);
  group.add(mesh);
}

function createDiaolou(def) {
  const { x, z, w = 9, d = 9, storeys = 5, top = 'baroque', name = '' } = def;
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = def.rot || 0;

  const lists = {
    stone: [], stoneDark: [], brick: [], render: [], cream: [], trim: [],
    dark: [], glass: [], shutter: [], red: [], gold: [], darkParts: [], trimParts: [],
  };

  const plinthH = 1.0;
  const baseH = 4.15;
  const floorH = 3.55;

  addBox(lists.stone, w + 2.8, plinthH, d + 2.8, 0, plinthH / 2, 0);
  addBox(lists.stoneDark, w + 3.0, 0.16, d + 3.0, 0, plinthH + 0.02, 0);
  addBox(lists.brick, w, baseH, d, 0, plinthH + baseH / 2, 0);
  addBox(lists.trim, w + 0.28, 0.24, d + 0.28, 0, plinthH + baseH - 0.1, 0);
  addBox(lists.stoneDark, w + 2.2, 0.14, d + 2.2, 0, 0.11, 0);

  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addBox(lists.render, 0.7, baseH, 0.7, sx * (w / 2 - 0.25), plinthH + baseH / 2, sz * (d / 2 - 0.25));
    }
  }

  for (const side of [-1, 1]) {
    for (let i = -1; i <= 1; i++) {
      addBox(lists.dark, 0.26, 0.72, 0.1, i * (w * 0.24), plinthH + baseH * 0.43, side * (d / 2 + 0.04));
      addBox(lists.dark, 0.1, 0.72, 0.26, side * (w / 2 + 0.04), plinthH + baseH * 0.43, i * (d * 0.24));
    }
  }

  addBox(lists.dark, 1.65, 3.1, 0.18, 0, plinthH + 1.55, d / 2 + 0.05);
  addBox(lists.trim, 1.95, 0.2, 0.32, 0, plinthH + 3.14, d / 2 + 0.08);
  addBox(lists.stoneDark, 2.0, 0.15, 0.8, 0, 0.16, d / 2 + 0.45);

  let y = plinthH + baseH;
  for (let floor = 0; floor < storeys - 1; floor++) {
    addBox(lists.render, w, floorH, d, 0, y + floorH / 2, 0);
    addBox(lists.trim, w + 0.34, 0.24, d + 0.34, 0, y + 0.12, 0);
    addBox(lists.cream, w + 0.2, 0.18, d + 0.2, 0, y + floorH - 0.1, 0);
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        addBox(lists.cream, 0.44, floorH, 0.44, sx * (w / 2 - 0.2), y + floorH / 2, sz * (d / 2 - 0.2));
      }
      addBox(lists.cream, 0.34, floorH, 0.34, sx * (w / 2 - 0.2), y + floorH / 2, 0);
    }

    const winY = y + floorH * 0.52;
    const arched = floor >= 1;
    for (const side of [-1, 1]) {
      for (let i = -1; i <= 1; i += 2) {
        addFrontWindow(lists, i * w * 0.24, winY, side * (d / 2 + 0.05), 0.78, 1.3, arched);
      }
    }
    for (const side of [-1, 1]) {
      addSideWindow(lists, side, -d * 0.18, winY, 0.72, 1.22);
      addSideWindow(lists, side, d * 0.18, winY, 0.72, 1.22);
    }

    if (floor > 0) {
      addBox(lists.stone, w * 0.86, 0.2, 1.05, 0, y + 0.55, d / 2 + 0.55);
      for (let i = 0; i <= 6; i++) {
        addBox(lists.cream, 0.1, 0.66, 0.1, -w * 0.4 + (i * w * 0.8) / 6, y + 0.98, d / 2 + 1.02);
      }
      addBox(lists.cream, w * 0.82, 0.11, 0.15, 0, y + 1.31, d / 2 + 1.02);
    }
    y += floorH;
  }

  const bodyTop = y;
  addBox(lists.stone, w + 1.15, 0.4, d + 1.15, 0, bodyTop + 0.2, 0);
  y = bodyTop + 0.4;
  addBalustrade(lists, w + 0.9, d + 0.9, y);

  const colH = 2.45;
  const colX = w / 2 - 0.72;
  const colZ = d / 2 - 0.72;
  const colPositions = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) colPositions.push([sx * colX, sz * colZ]);
  colPositions.push([0, colZ], [0, -colZ], [colX, 0], [-colX, 0]);
  for (const [cx, cz] of colPositions) {
    addCylinder(lists.cream, 0.21, 0.25, colH, 10, cx, y + colH / 2, cz);
    addBox(lists.cream, 0.56, 0.16, 0.56, cx, y + colH - 0.05, cz);
    addBox(lists.cream, 0.58, 0.16, 0.58, cx, y + 0.06, cz);
  }
  addBox(lists.trim, w + 0.3, 0.46, d + 0.3, 0, y + colH + 0.2, 0);
  addBox(lists.cream, w + 0.1, 0.38, d + 0.1, 0, y + colH + 0.6, 0);
  addBox(lists.gold, w + 0.22, 0.1, d + 0.22, 0, y + colH + 0.82, 0);

  const topBase = y + colH + 0.9;
  let roofH = 0;
  if (top === 'chinese' || top === 'hybrid') {
    roofH = 2.45;
    const roofGeo = createRoofGeometry({
      width: w + 2.5, depth: d + 2.5, height: roofH,
      cornerLift: 1.05, curve: 1.55, ridgeRatio: 0.5, segments: 16, vSegments: 9,
    });
    const roof = new THREE.Mesh(roofGeo, tileGreen);
    roof.position.y = topBase;
    group.add(roof);
    addBox(lists.trim, w + 2.5, 0.16, d + 2.5, 0, topBase + 0.1, 0);
    if (top === 'hybrid') {
      for (const sx of [-1, 1]) {
        addBox(lists.render, 1.1, 1.3, 1.1, sx * (w / 2 - 0.2), topBase + 0.9, d / 2 - 0.2);
        const mini = createRoofGeometry({ width: 1.7, depth: 1.7, height: 0.85, cornerLift: 0.45, curve: 1.5, ridgeRatio: 0.2, segments: 8, vSegments: 5 });
        const miniMesh = new THREE.Mesh(mini, tileGreen);
        miniMesh.position.set(sx * (w / 2 - 0.2), topBase + 1.55, d / 2 - 0.2);
        group.add(miniMesh);
      }
    }
  } else {
    addBox(lists.cream, w * 0.92, 0.36, d * 0.92, 0, topBase + 0.18, 0);
    const pedH = top === 'roman' ? 1.15 : 1.45;
    addPediment(group, w * 0.78, topBase + 0.36, d * 0.44, pedH, M.cream);
    addBox(lists.gold, w * 0.8, 0.09, 0.18, 0, topBase + 0.4, d * 0.44 + 0.2);
    const drumY = topBase + 0.3;
    addCylinder(lists.cream, 1.15, 1.35, 1.25, 12, 0, drumY + 0.62, 0);
    const dome = new THREE.SphereGeometry(1.28, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    dome.translate(0, drumY + 1.24, 0);
    const domeMesh = new THREE.Mesh(dome, tileGreen);
    group.add(domeMesh);
    addCylinder(lists.gold, 0.11, 0.11, 1.2, 8, 0, drumY + 2.55, 0);
    for (const sx of [-1, 1]) {
      addCylinder(lists.cream, 0.46, 0.6, 0.9, 8, sx * (w / 2 - 0.28), topBase + 0.45, -d / 2 + 0.28);
      const urn = new THREE.SphereGeometry(0.42, 10, 7);
      urn.translate(sx * (w / 2 - 0.28), topBase + 1.1, -d / 2 + 0.28);
      lists.trimParts.push(urn);
    }
  }

  const height = topBase + Math.max(roofH, 3.1);
  addCylinder(lists.gold, 0.09, 0.09, 3.0, 6, 0, height + 1.1, 0);

  if (name) {
    const plaque = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 0.85), getPlaqueMaterial(name));
    plaque.position.set(0, plinthH + baseH + 0.65, d / 2 + 0.1);
    group.add(plaque);
    const back = plaque.clone();
    back.position.z = -d / 2 - 0.1;
    back.rotation.y = Math.PI;
    group.add(back);
  }

  const materials = [
    [lists.stone, M.stone], [lists.stoneDark, M.stoneDark], [lists.brick, M.brick],
    [lists.render, M.render], [lists.cream, M.cream], [lists.trim, M.trim],
    [lists.dark, M.dark], [lists.glass, M.glass], [lists.shutter, M.shutter],
    [lists.red, M.red], [lists.gold, M.gold], [lists.darkParts, M.dark], [lists.trimParts, M.trim],
  ];
  for (const [list, mat] of materials) {
    const mesh = mergedMesh(list, mat, true, true);
    if (mesh) group.add(mesh);
  }

  addBoxCollider(x, z, w + 3.2, d + 3.2, name || '碉楼');
  return { group, height, flagAnchor: { x, y: height + 2.6, z }, name };
}

function createQilou(def) {
  const { x, z, w = 18, d = 12, storeys = 2, name = '', tint = 0 } = def;
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  const facade = [M.render, M.renderPale, M.renderGrey, M.renderWarm][tint % 4];
  const lists = {
    stone: [], stoneDark: [], facade: [], cream: [], trim: [],
    dark: [], glass: [], shutter: [], red: [], gold: [], darkParts: [], trimParts: [],
  };

  const gh = 4.15;
  const uh = 3.15;
  const top = gh + (storeys - 1) * uh;

  addBox(lists.stone, w + 0.4, 0.72, d + 0.4, 0, 0.36, 0);
  addBox(lists.facade, w, gh, d - 0.9, 0, gh / 2, -0.45);
  addBox(lists.dark, w * 0.64, 2.7, 0.16, 0, 1.72, d / 2 - 0.47);
  addBox(lists.glass, w * 0.56, 2.38, 0.06, 0, 1.7, d / 2 - 0.36);
  addBox(lists.trim, w * 0.72, 0.18, 0.26, 0, 3.15, d / 2 - 0.35);

  const bays = Math.max(2, Math.round(w / 3.4));
  for (let i = 0; i <= bays; i++) {
    const cx = -w / 2 + (i * w) / bays;
    addCylinder(lists.cream, 0.22, 0.27, gh, 10, cx, gh / 2, d / 2 + 1.25);
    addBox(lists.cream, 0.58, 0.17, 0.58, cx, gh - 0.08, d / 2 + 1.25);
    addBox(lists.stoneDark, 0.7, 0.24, 0.7, cx, 0.12, d / 2 + 1.25);
    if (i < bays) {
      const mx = cx + w / bays / 2;
      addBox(lists.red, 0.34, 0.44, 0.34, mx, gh - 0.54, d / 2 + 1.05);
      addBox(lists.dark, 0.05, 0.22, 0.05, mx, gh - 0.23, d / 2 + 1.05);
    }
  }
  addBox(lists.trim, w + 0.3, 0.44, d + 2.7, 0, gh + 0.22, 0.62);
  addBox(lists.cream, w + 0.24, 0.25, d + 2.6, 0, gh + 0.56, 0.62);

  addBox(lists.facade, w, top - gh, d, 0, gh + (top - gh) / 2, 0);
  let fy = gh;
  for (let f = 0; f < storeys - 1; f++) {
    const y = fy + uh / 2;
    addBox(lists.trim, w + 0.2, 0.18, d + 0.2, 0, fy + uh - 0.09, 0);
    for (let i = 0; i < bays; i++) {
      const cx = -w / 2 + (w / bays) * (i + 0.5);
      addFrontWindow(lists, cx, y, d / 2 + 0.06, 1.0, 1.45, true);
    }
    for (const side of [-1, 1]) addSideWindow(lists, side, 0, y, 1.0, 1.3);
    fy += uh;
  }

  addBox(lists.trim, w + 0.15, 0.36, d + 0.15, 0, top + 0.18, 0);
  addBox(lists.facade, w + 0.08, 0.85, 0.35, 0, top + 0.78, d / 2 - 0.1);
  addBox(lists.cream, w + 0.08, 0.16, 0.52, 0, top + 1.16, d / 2 - 0.1);
  for (const sx of [-1, 1]) {
    addBox(lists.facade, 1.1, 1.3, 0.55, sx * (w / 2 - 0.75), top + 1.0, d / 2 - 0.12);
  }
  addPediment(group, w * 0.34, top + 1.2, d / 2 - 0.35, 1.05, M.cream);

  if (name) {
    const plaque = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.8), getPlaqueMaterial(name));
    plaque.position.set(0, gh + 0.08, d / 2 + 0.08);
    group.add(plaque);
  }

  const materials = [
    [lists.stone, M.stone], [lists.stoneDark, M.stoneDark], [lists.facade, facade],
    [lists.cream, M.cream], [lists.trim, M.trim], [lists.dark, M.dark],
    [lists.glass, M.glass], [lists.shutter, M.shutter], [lists.red, M.red],
    [lists.gold, M.gold], [lists.darkParts, M.dark], [lists.trimParts, M.trim],
  ];
  for (const [list, mat] of materials) {
    const mesh = mergedMesh(list, mat, true, true);
    if (mesh) group.add(mesh);
  }

  addBoxCollider(x, z, w + 0.8, d + 3.0, name || '骑楼');
  return group;
}

function createBanyan({ x, z, scale = 1, seed = 1 }) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.scale.setScalar(scale);
  const bark = [];
  const leavesA = [];
  const leavesB = [];
  const rnd = (n) => {
    const v = Math.sin(seed * 91.7 + n * 43.1) * 43758.5453;
    return v - Math.floor(v);
  };

  addCylinder(bark, 0.75, 1.45, 7.2, 9, 0, 3.6, 0);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + rnd(i) * 0.4;
    const r = 2.3 + rnd(i + 1) * 2.8;
    const bx = Math.cos(a) * r;
    const bz = Math.sin(a) * r;
    const b = new THREE.CylinderGeometry(0.2, 0.52, 4.4 + rnd(i + 2) * 2.0, 6);
    b.rotateZ(Math.cos(a) * 0.55);
    b.rotateX(Math.sin(a) * 0.55);
    b.translate(bx * 0.5, 5.8, bz * 0.5);
    bark.push(b);
    addCylinder(bark, 0.08, 0.18, 4.8 + rnd(i + 8) * 2.2, 5, bx * 0.76, 4.0, bz * 0.76);
  }

  for (let i = 0; i < 22; i++) {
    const a = rnd(i + 19) * Math.PI * 2;
    const r = 1.4 + rnd(i + 23) * 5.8;
    const blob = new THREE.IcosahedronGeometry(1.6 + rnd(i + 31) * 1.7, 1);
    blob.scale(1.3, 0.68, 1.25);
    blob.translate(Math.cos(a) * r, 8.0 + rnd(i + 37) * 4.4, Math.sin(a) * r);
    if (i % 3 === 0) leavesB.push(blob);
    else leavesA.push(blob);
  }

  const bm = mergedMesh(bark, M.bark, true, true);
  if (bm) group.add(bm);
  const l1 = mergedMesh(leavesA, M.leaf, true, true);
  if (l1) group.add(l1);
  const l2 = mergedMesh(leavesB, M.leafLight, true, true);
  if (l2) group.add(l2);
  return group;
}

function createPaddyField({ x, z, w, d, rot = 0, seed = 1 }) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rot;
  const soil = [];
  const water = [];
  const riceA = [];
  const riceB = [];
  const bund = [];

  addBox(soil, w, 0.22, d, 0, 0.06, 0);
  addBox(water, w - 1.4, 0.05, d - 1.4, 0, 0.18, 0);
  addBox(bund, w, 0.34, 0.6, 0, 0.17, d / 2);
  addBox(bund, w, 0.34, 0.6, 0, 0.17, -d / 2);
  addBox(bund, 0.6, 0.34, d, -w / 2, 0.17, 0);
  addBox(bund, 0.6, 0.34, d, w / 2, 0.17, 0);

  const rows = Math.max(5, Math.floor((w - 2) / 1.25));
  const rnd = (n) => {
    const v = Math.sin(seed * 33.7 + n * 11.3) * 43758.5453;
    return v - Math.floor(v);
  };
  for (let i = 0; i < rows; i++) {
    const rx = -w / 2 + 1.0 + (i * (w - 2)) / Math.max(1, rows - 1);
    const segs = 4;
    for (let s = 0; s < segs; s++) {
      const z0 = -d / 2 + 0.9 + (s * (d - 1.8)) / segs;
      const len = (d - 1.8) / segs - 0.45;
      const h = 0.34 + rnd(i * 7 + s) * 0.22;
      addBox(i % 2 ? riceA : riceB, 0.34, h, len, rx, 0.24 + h / 2, z0 + len / 2);
    }
  }

  const sm = mergedMesh(soil, M.soil, true, true);
  if (sm) group.add(sm);
  const wm = mergedMesh(water, M.paddyWater, true, true);
  if (wm) group.add(wm);
  const bm = mergedMesh(bund, M.soil, true, true);
  if (bm) group.add(bm);
  const ra = mergedMesh(riceA, M.rice, true, true);
  if (ra) group.add(ra);
  const rb = mergedMesh(riceB, M.riceLight, true, true);
  if (rb) group.add(rb);
  return group;
}

function pointsToShape(points, scale = 1) {
  const shape = new THREE.Shape();
  points.forEach(([px, pz], i) => {
    const px2 = px * scale;
    const pz2 = -pz * scale;
    if (i === 0) shape.moveTo(px2, pz2);
    else shape.lineTo(px2, pz2);
  });
  shape.closePath();
  return shape;
}

function makePond(points, waterMaterial, bedY = -0.4) {
  const group = new THREE.Group();
  const bedGeo = new THREE.ShapeGeometry(pointsToShape(points, 1.01));
  bedGeo.rotateX(-Math.PI / 2);
  const bed = new THREE.Mesh(bedGeo, mats.lakeBed);
  bed.position.y = bedY;
  bed.receiveShadow = true;
  group.add(bed);

  const waterGeo = new THREE.ShapeGeometry(pointsToShape(points, 0.995));
  waterGeo.rotateX(-Math.PI / 2);
  const water = new THREE.Mesh(waterGeo, waterMaterial);
  water.position.y = -0.03;
  water.renderOrder = 1;
  group.add(water);

  const stone = [];
  const moss = [];
  for (let i = 0; i < points.length; i += 2) {
    const a = points[i];
    const b = points[(i + 2) % points.length];
    addBar(stone, a[0], a[1], b[0], b[1], 0.02, 0.5, 0.85);
    addBar(moss, a[0], a[1], b[0], b[1], 0.2, 0.08, 0.18);
  }
  const sm = mergedMesh(stone, M.stone, true, true);
  if (sm) group.add(sm);
  const mm = mergedMesh(moss, mats.moss, true, true);
  if (mm) group.add(mm);
  return group;
}

function createStandingEgret({ x, z, rot = 0, scale = 1 }) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rot;
  group.scale.setScalar(scale);
  const white = [];
  const beak = [];
  const legs = [];

  const body = new THREE.SphereGeometry(0.22, 10, 7);
  body.scale(0.78, 1.0, 1.55);
  body.translate(0, 0.88, 0);
  white.push(body);
  addCylinder(white, 0.055, 0.09, 0.82, 6, 0, 1.38, -0.03);
  const head = new THREE.SphereGeometry(0.13, 10, 7);
  head.translate(0, 1.82, 0.02);
  white.push(head);
  const bk = new THREE.ConeGeometry(0.045, 0.42, 6);
  bk.rotateX(Math.PI / 2);
  bk.translate(0, 1.8, 0.29);
  beak.push(bk);
  for (const sx of [-1, 1]) {
    addCylinder(legs, 0.025, 0.035, 0.76, 5, sx * 0.08, 0.38, 0);
    addBox(legs, 0.18, 0.03, 0.05, sx * 0.08, 0.02, 0.06);
  }
  const wm = mergedMesh(white, M.bird, true, true);
  if (wm) group.add(wm);
  const bm = mergedMesh(beak, M.beak, false, true);
  if (bm) group.add(bm);
  const lm = mergedMesh(legs, M.birdLeg, false, true);
  if (lm) group.add(lm);
  return group;
}

function coloredBox(w, h, d, x, y, z, color) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return colorGeometry(g, color);
}

function coloredSphere(r, x, y, z, color, sx = 1, sy = 1, sz = 1) {
  const g = new THREE.SphereGeometry(r, 10, 8);
  g.scale(sx, sy, sz);
  g.translate(x, y, z);
  return colorGeometry(g, color);
}

function colorGeometry(geo, color) {
  const c = new THREE.Color(color);
  const count = geo.attributes.position.count;
  const arr = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}

function makePersonGeometry() {
  const parts = [];
  const trouser = 0x3f4b56;
  const shirt = 0xc9c2aa;
  const skin = 0xc99b75;
  const hat = 0x9c8659;
  parts.push(coloredBox(0.18, 0.78, 0.2, -0.13, 0.39, 0, trouser));
  parts.push(coloredBox(0.18, 0.78, 0.2, 0.13, 0.39, 0, trouser));
  parts.push(coloredBox(0.56, 0.78, 0.28, 0, 1.08, 0, shirt));
  parts.push(coloredBox(0.14, 0.66, 0.16, -0.36, 1.1, 0, shirt));
  parts.push(coloredBox(0.14, 0.66, 0.16, 0.36, 1.1, 0, shirt));
  parts.push(coloredSphere(0.19, 0, 1.66, 0, skin, 0.9, 1.05, 0.9));
  const hatGeo = new THREE.ConeGeometry(0.4, 0.16, 12);
  hatGeo.translate(0, 1.86, 0);
  parts.push(colorGeometry(hatGeo, hat));
  return mergeGeometries(parts, false);
}

function makeBirdBodyGeometry() {
  const white = [];
  const beak = [];
  const legs = [];
  const body = new THREE.SphereGeometry(0.23, 10, 7);
  body.scale(0.8, 0.85, 1.85);
  white.push(body);
  const neck = new THREE.CylinderGeometry(0.05, 0.09, 0.6, 6);
  neck.rotateX(-0.35);
  neck.translate(0, 0.26, 0.34);
  white.push(neck);
  const head = new THREE.SphereGeometry(0.14, 10, 7);
  head.translate(0, 0.56, 0.47);
  white.push(head);
  const bk = new THREE.ConeGeometry(0.05, 0.42, 6);
  bk.rotateX(Math.PI / 2);
  bk.translate(0, 0.54, 0.77);
  beak.push(bk);
  for (const sx of [-1, 1]) {
    const leg = new THREE.CylinderGeometry(0.018, 0.025, 0.55, 4);
    leg.rotateX(1.2);
    leg.translate(sx * 0.07, -0.18, -0.32);
    legs.push(leg);
  }
  return {
    white: mergeGeometries(white, false),
    beak: mergeGeometries(beak, false),
    legs: mergeGeometries(legs, false),
  };
}

function makeSmokeTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 62);
  g.addColorStop(0, 'rgba(238,238,228,0.85)');
  g.addColorStop(0.42, 'rgba(226,226,216,0.42)');
  g.addColorStop(1, 'rgba(210,210,200,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createLife({ condensers, flagAnchors, lanternSpots }) {
  const group = new THREE.Group();
  const personGeo = makePersonGeometry();
  const personMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
  const pathDefs = [
    [[-62, 72], [-42, 92], [-4, 98], [42, 90], [64, 62], [46, 34], [0, 28], [-44, 40], [-62, 72]],
    [[-92, -59], [-30, -60], [34, -60], [96, -59]],
    [[-76, -18], [-38, 8], [0, 18], [34, 4], [66, -22]],
    [[-72, 80], [-110, 68], [-150, 80], [-182, 58]],
    [[74, 58], [110, 78], [148, 66], [172, 44]],
  ];
  const paths = pathDefs.map((p) => {
    const curve = new THREE.CatmullRomCurve3(p.map(([px, pz]) => new THREE.Vector3(px, 0, pz)), true, 'catmullrom', 0.25);
    return { curve, length: curve.getLength() };
  });
  const personCount = 26;
  const people = new THREE.InstancedMesh(personGeo, personMat, personCount);
  people.frustumCulled = false;
  people.castShadow = true;
  const personData = [];
  const tone = new THREE.Color();
  for (let i = 0; i < personCount; i++) {
    const path = paths[i % paths.length];
    const tint = 0.82 + (i % 5) * 0.045;
    tone.setRGB(tint, tint * 0.98, tint * 0.94);
    people.setColorAt(i, tone);
    personData.push({
      path,
      offset: (i / personCount) * path.length + (i % 4) * 2.3,
      speed: 0.72 + (i % 6) * 0.08,
      bob: i * 0.77,
      scale: 0.94 + (i % 4) * 0.04,
    });
  }
  people.instanceColor.needsUpdate = true;
  group.add(people);

  const birdGeo = makeBirdBodyGeometry();
  const birdCount = 10;
  const bodies = new THREE.InstancedMesh(birdGeo.white, M.bird, birdCount);
  const beaks = new THREE.InstancedMesh(birdGeo.beak, M.beak, birdCount);
  const legs = new THREE.InstancedMesh(birdGeo.legs, M.birdLeg, birdCount);
  [bodies, beaks, legs].forEach((m) => {
    m.frustumCulled = false;
    m.castShadow = false;
    group.add(m);
  });

  const wingGeoRight = new THREE.PlaneGeometry(1.35, 0.55, 1, 1);
  wingGeoRight.rotateX(-Math.PI / 2);
  wingGeoRight.translate(0.68, 0, 0);
  const wingGeoLeft = wingGeoRight.clone();
  wingGeoLeft.scale(-1, 1, 1);
  const wingsR = new THREE.InstancedMesh(wingGeoRight, M.bird, birdCount);
  const wingsL = new THREE.InstancedMesh(wingGeoLeft, M.bird, birdCount);
  [wingsR, wingsL].forEach((m) => {
    m.frustumCulled = false;
    m.castShadow = false;
    group.add(m);
  });

  const flocks = [
    { cx: -8, cz: 58, r: 50, h: 15, count: 5, speed: 0.115, phase: 0.2 },
    { cx: -140, cz: 42, r: 30, h: 11, count: 3, speed: 0.16, phase: 2.1 },
    { cx: 145, cz: 58, r: 26, h: 10, count: 2, speed: 0.18, phase: 4.2 },
  ];
  const birdData = [];
  for (const flock of flocks) {
    for (let i = 0; i < flock.count; i++) {
      birdData.push({
        ...flock,
        angle: flock.phase + (i / flock.count) * Math.PI * 2,
        flap: 5.6 + (i % 3) * 0.9,
        offset: i * 1.7,
        yOff: (i % 4) * 0.7,
      });
    }
  }

  const smokeTex = makeSmokeTexture();
  const smokeMat = new THREE.MeshBasicMaterial({
    map: smokeTex,
    transparent: true,
    opacity: 0.34,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const smokePer = 7;
  const smokeCount = condensers.length * smokePer;
  const smoke = new THREE.InstancedMesh(new THREE.PlaneGeometry(2, 2), smokeMat, smokeCount);
  smoke.frustumCulled = false;
  smoke.renderOrder = 3;
  group.add(smoke);
  const smokeData = [];
  for (let ci = 0; ci < condensers.length; ci++) {
    const c = condensers[ci];
    for (let i = 0; i < smokePer; i++) {
      smokeData.push({
        ox: c.x, oy: c.y, oz: c.z,
        phase: (i / smokePer + ci * 0.19) % 1,
        spin: ci * 1.7 + i * 0.61,
      });
    }
  }

  const flags = [];
  const flagDefs = flagAnchors.slice(0, 5);
  for (let i = 0; i < flagDefs.length; i++) {
    const f = flagDefs[i];
    const geo = new THREE.PlaneGeometry(2.2, 1.25, 10, 4);
    geo.translate(1.1, 0, 0);
    const mesh = new THREE.Mesh(geo, M.flag);
    mesh.position.set(f.x, f.y - 0.6, f.z);
    mesh.rotation.y = i % 2 ? Math.PI * 0.5 : 0;
    group.add(mesh);
    flags.push({ mesh, base: geo.attributes.position.array.slice(), phase: i * 1.3 });
  }

  const glowGeo = new THREE.SphereGeometry(0.42, 8, 6);
  const glows = new THREE.InstancedMesh(glowGeo, glowMaterial, Math.max(1, lanternSpots.length));
  glows.frustumCulled = false;
  glows.renderOrder = 4;
  group.add(glows);

  const dummy = new THREE.Object3D();
  const qYaw = new THREE.Quaternion();
  const qFlap = new THREE.Quaternion();
  const axisY = new THREE.Vector3(0, 1, 0);
  const axisZ = new THREE.Vector3(0, 0, 1);
  const pos = new THREE.Vector3();
  const tan = new THREE.Vector3();

  function update(time, dt) {
    for (let i = 0; i < personData.length; i++) {
      const p = personData[i];
      const u = ((p.offset + time * p.speed) % p.path.length) / p.path.length;
      p.path.curve.getPointAt(u, pos);
      p.path.curve.getTangentAt(u, tan);
      dummy.position.set(pos.x, Math.abs(Math.sin(time * 5.4 + p.bob)) * 0.045, pos.z);
      dummy.rotation.set(0, Math.atan2(tan.x, tan.z), 0);
      dummy.scale.setScalar(p.scale);
      dummy.updateMatrix();
      people.setMatrixAt(i, dummy.matrix);
    }
    people.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < birdData.length; i++) {
      const b = birdData[i];
      const a = b.angle + time * b.speed;
      const px = b.cx + Math.cos(a) * b.r;
      const pz = b.cz + Math.sin(a) * b.r;
      const py = b.h + b.yOff + Math.sin(time * 0.8 + b.offset) * 1.3;
      const yaw = -a;
      const flap = Math.sin(time * b.flap + b.offset) * 0.55 + 0.08;
      qYaw.setFromAxisAngle(axisY, yaw);
      dummy.position.set(px, py, pz);
      dummy.quaternion.copy(qYaw);
      dummy.scale.setScalar(1.25);
      dummy.updateMatrix();
      bodies.setMatrixAt(i, dummy.matrix);
      beaks.setMatrixAt(i, dummy.matrix);
      legs.setMatrixAt(i, dummy.matrix);

      qFlap.setFromAxisAngle(axisZ, flap);
      dummy.quaternion.multiplyQuaternions(qYaw, qFlap);
      dummy.updateMatrix();
      wingsR.setMatrixAt(i, dummy.matrix);
      qFlap.setFromAxisAngle(axisZ, -flap);
      dummy.quaternion.multiplyQuaternions(qYaw, qFlap);
      dummy.updateMatrix();
      wingsL.setMatrixAt(i, dummy.matrix);
    }
    bodies.instanceMatrix.needsUpdate = true;
    beaks.instanceMatrix.needsUpdate = true;
    legs.instanceMatrix.needsUpdate = true;
    wingsR.instanceMatrix.needsUpdate = true;
    wingsL.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < smokeData.length; i++) {
      const s = smokeData[i];
      const p = (s.phase + time * 0.05) % 1;
      const rise = p * 23;
      const wobble = Math.sin(time * 0.5 + s.spin) * (0.6 + p * 2.6);
      dummy.position.set(s.ox + wobble, s.oy + rise, s.oz + Math.cos(time * 0.42 + s.spin) * p * 1.8);
      if (api.camera) dummy.quaternion.copy(api.camera.quaternion);
      else dummy.rotation.set(0, s.spin, 0);
      const sc = 1.0 + p * 5.2;
      dummy.scale.set(sc, sc, sc);
      dummy.updateMatrix();
      smoke.setMatrixAt(i, dummy.matrix);
    }
    smoke.instanceMatrix.needsUpdate = true;

    for (const f of flags) {
      const attr = f.mesh.geometry.attributes.position;
      const arr = attr.array;
      for (let i = 0; i < attr.count; i++) {
        const bx = f.base[i * 3];
        const by = f.base[i * 3 + 1];
        const wave = Math.sin(time * 3.2 + bx * 2.9 + by * 1.2 + f.phase) * 0.22 * (bx / 2.2);
        arr[i * 3 + 2] = wave;
      }
      attr.needsUpdate = true;
      f.mesh.geometry.computeVertexNormals();
    }

    for (let i = 0; i < lanternSpots.length; i++) {
      const l = lanternSpots[i];
      const pulse = 0.9 + Math.sin(time * 2.2 + i * 0.7) * 0.13;
      dummy.position.set(l.x, l.y, l.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(pulse);
      dummy.updateMatrix();
      glows.setMatrixAt(i, dummy.matrix);
    }
    glows.instanceMatrix.needsUpdate = true;
  }

  const api = { group, camera: null, update };
  return api;
}

export function buildKaipingScene() {
  const root = new THREE.Group();
  const waterMaterial = makeWaterMaterial();
  const flagAnchors = [];
  const condensers = [];
  const lanternSpots = [];

  const terrain = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400), mats.grass);
  terrain.rotation.x = -Math.PI / 2;
  terrain.position.y = -0.52;
  terrain.receiveShadow = true;
  root.add(terrain);

  const village = new THREE.Mesh(new THREE.PlaneGeometry(460, 340), M.earth);
  village.rotation.x = -Math.PI / 2;
  village.position.set(0, -0.1, -12);
  village.receiveShadow = true;
  root.add(village);

  const lanes = [];
  addBox(lanes, 264, 0.08, 14, 0, 0.02, -56);
  addBox(lanes, 9, 0.08, 96, 0, 0.025, 0);
  addBox(lanes, 220, 0.07, 6, 0, 0.02, -92);
  addBox(lanes, 7, 0.07, 72, -74, 0.02, 24);
  addBox(lanes, 7, 0.07, 64, 76, 0.02, 22);
  addBox(lanes, 6, 0.07, 88, -108, 0.02, 54);
  addBox(lanes, 6, 0.07, 74, 116, 0.02, 52);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    addBox(lanes, 7, 0.06, 18, Math.cos(a) * 54, 0.02, 58 + Math.sin(a) * 32);
  }
  const laneMesh = mergedMesh(lanes, M.lane, false, true);
  if (laneMesh) root.add(laneMesh);

  const paddies = [
    { x: -126, z: -8, w: 54, d: 44, rot: 0.05, seed: 11 },
    { x: -126, z: 42, w: 54, d: 36, rot: -0.04, seed: 12 },
    { x: -126, z: 86, w: 54, d: 30, rot: 0.03, seed: 13 },
    { x: -180, z: 32, w: 46, d: 112, rot: 0.01, seed: 14 },
    { x: 122, z: -8, w: 48, d: 36, rot: -0.05, seed: 21 },
    { x: 122, z: 34, w: 48, d: 38, rot: 0.04, seed: 22 },
    { x: 122, z: 80, w: 48, d: 34, rot: -0.03, seed: 23 },
    { x: 176, z: 36, w: 44, d: 108, rot: 0.02, seed: 24 },
    { x: -62, z: 151, w: 56, d: 38, rot: 0.03, seed: 31 },
    { x: 0, z: 151, w: 56, d: 38, rot: -0.02, seed: 32 },
    { x: 62, z: 151, w: 56, d: 38, rot: 0.04, seed: 33 },
  ];
  for (const p of paddies) root.add(createPaddyField(p));

  root.add(makePond(POND_POLY, waterMaterial));

  for (const l of [
    { x: -28, z: 66, radius: 5.4, count: 16, seed: 701 },
    { x: 18, z: 72, radius: 4.0, count: 12, seed: 702 },
    { x: 34, z: 50, radius: 3.2, count: 9, seed: 703 },
    { x: -12, z: 47, radius: 2.8, count: 8, seed: 704 },
  ]) root.add(createLotus(l));

  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * Math.PI * 2 + 0.25;
    const x = Math.cos(a) * (48 + (i % 2) * 3);
    const z = 58 + Math.sin(a) * (27 + (i % 2) * 2);
    root.add(createReedPatch({ x, z, radius: 1.4, count: 16, seed: 810 + i }));
  }

  const towers = [
    { x: -32, z: 4, w: 9.5, d: 9.5, storeys: 5, top: 'baroque', name: '云幻楼', rot: 0.08 },
    { x: 8, z: -10, w: 9.0, d: 9.0, storeys: 4, top: 'chinese', name: '铭石楼', rot: -0.06 },
    { x: -54, z: -26, w: 8.6, d: 8.6, storeys: 4, top: 'hybrid', name: '叶生居庐', rot: 0.16 },
    { x: 34, z: 14, w: 8.8, d: 8.8, storeys: 4, top: 'roman', name: '官生居庐', rot: -0.14 },
    { x: 72, z: -10, w: 10.6, d: 10.6, storeys: 7, top: 'hybrid', name: '瑞石楼', rot: 0.04 },
  ];
  for (const def of towers) {
    const tower = createDiaolou(def);
    root.add(tower.group);
    flagAnchors.push(tower.flagAnchor);
    condensers.push({ x: def.x, y: tower.height + 1.6, z: def.z });
  }

  const arcadeNames = ['侨乡茶楼', '隆记商号', '万福押', '同安客栈', '广裕银号', '春和堂', '南洋咖啡', '义兴号', '联安旅店'];
  for (let i = 0; i < 9; i++) {
    const x = -88 + i * 22;
    const storeys = i % 3 === 0 ? 3 : 2;
    const q = createQilou({ x, z: -70, w: 20, d: 12, storeys, name: arcadeNames[i], tint: i });
    root.add(q);
    for (let b = 0; b < 6; b++) {
      lanternSpots.push({ x: x - 10 + b * 3.8, y: 3.45, z: -57.08 });
    }
    if (i === 4) condensers.push({ x, y: 15.5, z: -70 });
  }
  for (const a of [-88, -22, 44]) {
    addBoxCollider(a + 10, -62.8, 20, 0.8, '廊柱');
  }

  const banyans = [
    { x: -70, z: 46, scale: 1.14, seed: 91 },
    { x: 62, z: 36, scale: 1.02, seed: 92 },
    { x: -104, z: 116, scale: 1.0, seed: 93 },
    { x: 102, z: 118, scale: 1.08, seed: 94 },
    { x: -24, z: -118, scale: 0.96, seed: 95 },
    { x: 154, z: -44, scale: 0.9, seed: 96 },
  ];
  for (const b of banyans) {
    root.add(createBanyan(b));
    addCircleCollider(b.x, b.z, 1.3 * b.scale, '榕树');
  }

  const stands = [
    [-40, 74, 0.4, 1.0], [24, 79, 2.5, 1.0], [46, 54, -1.1, 0.94],
    [-48, 42, 1.9, 1.04], [-114, 66, 0.2, 1.0], [128, 62, 2.9, 1.02],
  ];
  for (const [x, z, rot, scale] of stands) root.add(createStandingEgret({ x, z, rot, scale }));

  const hills = [
    [-330, -160, 240, 150, 52, mats.hill, 71],
    [320, -140, 250, 160, 58, mats.hill, 73],
    [-360, 130, 260, 170, 44, mats.hillFar, 75],
    [350, 150, 270, 170, 48, mats.hillFar, 77],
    [-80, 360, 310, 170, 40, mats.hillFar, 79],
    [220, 350, 260, 150, 36, mats.hillFar, 81],
    [-140, -390, 300, 160, 42, mats.hillFar, 83],
    [250, -380, 280, 150, 38, mats.hillFar, 85],
  ];
  for (const [x, z, rx, rz, h, mat, seed] of hills) {
    root.add(createHill({ x, z, rx, rz, h, mat, seed }));
  }

  const merged = mergeStaticGroup(root);
  const life = createLife({ condensers, flagAnchors, lanternSpots });
  merged.add(life.group);

  return {
    group: merged,
    waterMaterial,
    life,
    lanternMaterial: mats.lanternRed,
    glowMaterial,
    spawn: SPAWN,
    pond: POND,
  };
}
