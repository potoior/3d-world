import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mats } from './materials.js';
import { addBox, addCylinder, mergedMesh } from './geometry.js';
import { getPlaqueMaterial } from './gardenBuild.js';

function rnd(seed, n) {
  const v = Math.sin(seed * 57.13 + n * 41.71) * 43758.5453;
  return v - Math.floor(v);
}

const SHOP_NAMES = ['四方街', '茶马古道', '丽江粑粑', '东巴纸坊', '银器', '客栈', '普洱茶', '蜡染'];

function housePoint(def, lx, lz) {
  return [
    def.x + lx * Math.cos(def.rot) + lz * Math.sin(def.rot),
    def.z - lx * Math.sin(def.rot) + lz * Math.cos(def.rot),
  ];
}

function canalPoint(c, lx, lz) {
  return [
    c.x + lx * Math.cos(c.rot) + lz * Math.sin(c.rot),
    c.z - lx * Math.sin(c.rot) + lz * Math.cos(c.rot),
  ];
}

function addLocalBox(list, def, w, h, d, lx, ly, lz, rz = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (rz) g.rotateZ(rz);
  g.rotateY(def.rot);
  const [x, z] = housePoint(def, lx, lz);
  g.translate(x, ly, z);
  list.push(g);
}

function addLocalSphere(list, def, radius, lx, ly, lz, sx = 1, sy = 1, sz = 1) {
  const g = new THREE.IcosahedronGeometry(radius, 0);
  g.scale(sx, sy, sz);
  g.rotateY(rnd(lx * 3.1 + lz, 2) * 6.28);
  const [x, z] = housePoint(def, lx, lz);
  g.translate(x, ly, z);
  list.push(g);
}

function addCanalBox(list, c, w, h, d, lx, ly, lz) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.rotateY(c.rot);
  const [x, z] = canalPoint(c, lx, lz);
  g.translate(x, ly, z);
  list.push(g);
}

function addBridgeBox(list, b, w, h, d, lx, ly, lz) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.rotateY(b.rot);
  const [x, z] = canalPoint(b, lx, lz);
  g.translate(x, ly, z);
  list.push(g);
}

function archY(t, span, rise, baseY) {
  return baseY + 0.35 + rise * Math.cos(Math.max(-1, Math.min(1, t)) * Math.PI * 0.5);
}

function colored(geo, hex) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const c = new THREE.Color(hex);
  const count = g.attributes.position.count;
  const arr = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(arr, 3));
  return g;
}

function mergeParts(parts) {
  const normalized = parts.map((g) => {
    const out = g.index ? g.toNonIndexed() : g;
    for (const key of Object.keys(out.attributes)) {
      if (key !== 'position' && key !== 'normal' && key !== 'uv' && key !== 'color') out.deleteAttribute(key);
    }
    if (!out.attributes.uv) {
      const count = out.attributes.position.count;
      out.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(count * 2), 2));
    }
    return out;
  });
  return mergeGeometries(normalized, false);
}

function seatedFigure(x, z, rot, seed) {
  const shirt = [0x526a76, 0x6a4d5a, 0x5d6150, 0x4d5f6b, 0x74544a][seed % 5];
  const wrap = [0xdad6c8, 0x8c9caf, 0xb9b2a0][seed % 3];
  const skin = 0xc79b78;
  const parts = [];
  const torso = new THREE.CylinderGeometry(0.19, 0.25, 0.72, 6);
  torso.translate(0, 1.0, 0);
  parts.push(colored(torso, shirt));
  const shawl = new THREE.BoxGeometry(0.52, 0.8, 0.12);
  shawl.rotateY(0.18);
  shawl.translate(0, 1.04, -0.11);
  parts.push(colored(shawl, seed % 2 ? 0x546878 : 0x6f5a50));
  const head = new THREE.SphereGeometry(0.155, 7, 6);
  head.translate(0, 1.52, 0.02);
  parts.push(colored(head, skin));
  const headwrap = new THREE.CylinderGeometry(0.19, 0.2, 0.15, 8);
  headwrap.translate(0, 1.63, 0.01);
  parts.push(colored(headwrap, wrap));
  const knot = new THREE.SphereGeometry(0.075, 5, 4);
  knot.translate(0.16, 1.65, -0.05);
  parts.push(colored(knot, wrap));
  for (const sx of [-1, 1]) {
    const arm = new THREE.BoxGeometry(0.1, 0.5, 0.11);
    arm.rotateZ(sx * 0.18);
    arm.translate(sx * 0.28, 0.98, 0.08);
    parts.push(colored(arm, shirt));
    const hand = new THREE.SphereGeometry(0.065, 5, 4);
    hand.translate(sx * 0.34, 0.73, 0.15);
    parts.push(colored(hand, skin));
    const thigh = new THREE.BoxGeometry(0.16, 0.16, 0.5);
    thigh.translate(sx * 0.12, 0.58, 0.22);
    parts.push(colored(thigh, 0x3d4147));
    const shin = new THREE.BoxGeometry(0.13, 0.46, 0.14);
    shin.translate(sx * 0.12, 0.28, 0.42);
    parts.push(colored(shin, 0x3d4147));
  }
  const geo = mergeParts(parts);
  geo.rotateY(rot);
  geo.translate(x, 0, z);
  return geo;
}

function standingFigure(x, z, rot, seed) {
  const shirt = [0x7d3f36, 0x354f63, 0xc4b28c, 0x5c5144, 0x6b3f4a][seed % 5];
  const skin = 0xd0a27c;
  const parts = [];
  const torso = new THREE.CylinderGeometry(0.18, 0.24, 0.74, 6);
  torso.translate(0, 0.98, 0);
  parts.push(colored(torso, shirt));
  const head = new THREE.SphereGeometry(0.15, 7, 6);
  head.translate(0, 1.51, 0);
  parts.push(colored(head, skin));
  const cap = new THREE.SphereGeometry(0.155, 6, 4, 0, Math.PI * 2, 0, Math.PI * 0.6);
  cap.translate(0, 1.56, 0);
  parts.push(colored(cap, seed % 2 ? 0x3d4d58 : 0xb2a484));
  for (const sx of [-1, 1]) {
    const leg = new THREE.BoxGeometry(0.13, 0.58, 0.15);
    leg.translate(sx * 0.11, 0.29, 0);
    parts.push(colored(leg, 0x3b3f45));
    const arm = new THREE.BoxGeometry(0.1, 0.52, 0.11);
    arm.rotateZ(sx * 0.09);
    arm.translate(sx * 0.28, 1.0, 0);
    parts.push(colored(arm, shirt));
  }
  if (seed % 3 === 0) {
    const pack = new THREE.BoxGeometry(0.32, 0.42, 0.18);
    pack.translate(0, 1.02, -0.23);
    parts.push(colored(pack, 0x5b4734));
  }
  const geo = mergeParts(parts);
  geo.rotateY(rot);
  geo.translate(x, 0, z);
  return geo;
}

function packHorse(x, z, rot) {
  const body = [];
  const blanket = [];
  const load = [];
  const horse = new THREE.SphereGeometry(0.52, 8, 6);
  horse.scale(1.5, 0.82, 0.62);
  horse.translate(0, 1.08, 0);
  body.push(horse);
  const neck = new THREE.CylinderGeometry(0.17, 0.27, 0.78, 7);
  neck.rotateX(-0.58);
  neck.translate(0, 1.5, 0.47);
  body.push(neck);
  const head = new THREE.BoxGeometry(0.26, 0.32, 0.58);
  head.rotateX(-0.18);
  head.translate(0, 1.82, 0.83);
  body.push(head);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const leg = new THREE.CylinderGeometry(0.07, 0.085, 0.9, 5);
      leg.translate(sx * 0.36, 0.45, sz * 0.32);
      body.push(leg);
    }
    const ear = new THREE.ConeGeometry(0.065, 0.2, 4);
    ear.translate(sx * 0.09, 2.01, 0.78);
    body.push(ear);
  }
  const tail = new THREE.ConeGeometry(0.11, 0.7, 5);
  tail.rotateX(0.72);
  tail.translate(0, 1.12, -0.7);
  body.push(tail);
  const saddle = new THREE.BoxGeometry(0.62, 0.1, 0.84);
  saddle.translate(0, 1.5, -0.02);
  blanket.push(saddle);
  for (const sx of [-1, 1]) {
    const pannier = new THREE.CylinderGeometry(0.19, 0.17, 0.46, 7);
    pannier.translate(sx * 0.61, 1.25, -0.1);
    load.push(pannier);
  }
  const place = (g) => {
    g.rotateY(rot);
    g.translate(x, 0, z);
    return g;
  };
  return {
    body: mergeParts(body.map(place)),
    blanket: mergeParts(blanket.map(place)),
    load: mergeParts(load.map(place)),
  };
}

function addTeaTable(wood, dark, terra, x, z, rot, seed) {
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  const put = (list, w, h, d, lx, ly, lz) => {
    const g = new THREE.BoxGeometry(w, h, d);
    g.rotateY(rot);
    g.translate(x + lx * cos + lz * sin, ly, z - lx * sin + lz * cos);
    list.push(g);
  };
  put(wood, 1.12, 0.09, 0.82, 0, 0.56, 0);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) put(dark, 0.1, 0.53, 0.1, sx * 0.45, 0.27, sz * 0.3);
    put(dark, 0.42, 0.06, 0.42, sx * 0.78, 0.38, 0.08);
  }
  const pot = new THREE.SphereGeometry(0.14, 7, 5);
  pot.scale(1, 0.72, 1);
  pot.translate(x, 0.69, z);
  terra.push(pot);
  const lid = new THREE.CylinderGeometry(0.045, 0.045, 0.1, 6);
  lid.translate(x, 0.78, z);
  terra.push(lid);
  for (let i = 0; i < 3; i++) {
    const a = rot + (i / 3) * Math.PI * 2;
    const cup = new THREE.CylinderGeometry(0.045, 0.038, 0.07, 6);
    cup.translate(x + Math.cos(a) * 0.26, 0.64, z - Math.sin(a) * 0.26);
    terra.push(cup);
  }
  if (seed % 2 === 0) {
    const basket = new THREE.CylinderGeometry(0.2, 0.17, 0.34, 7);
    basket.translate(x + 0.95, 0.2, z + 0.45);
    terra.push(basket);
  }
}

function addBasket(terra, wood, x, z, scale = 1) {
  const body = new THREE.CylinderGeometry(0.28 * scale, 0.23 * scale, 0.42 * scale, 8);
  body.translate(x, 0.21 * scale, z);
  terra.push(body);
  const rim = new THREE.TorusGeometry(0.27 * scale, 0.035 * scale, 4, 8);
  rim.rotateX(Math.PI / 2);
  rim.translate(x, 0.42 * scale, z);
  wood.push(rim);
}

export function createOldTownDetail({ canals = [], bridges = [], houses = [], lanternSpots = [] }) {
  const staticGroup = new THREE.Group();
  const dynamicGroup = new THREE.Group();
  const stone = [];
  const wetStone = [];
  const moss = [];
  const blade = [];
  const dark = [];
  const gold = [];
  const rust = [];
  const cloth = [];
  const indigo = [];
  const terra = [];
  const wood = [];
  const tile = [];
  const tileDark = [];
  const snow = [];
  const figures = [];
  const horseBody = [];
  const horseBlanket = [];
  const horseLoad = [];
  const weirs = [];

  for (let ci = 0; ci < canals.length; ci++) {
    const c = canals[ci];
    const n = Math.max(16, Math.round(c.d / 1.65));
    for (let i = 0; i < n; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const z = -c.d * 0.5 + ((i + 0.5) / n) * c.d + (rnd(ci * 7 + 1, i) - 0.5) * 1.15;
      const x = side * (c.w * 0.5 + 0.18 + rnd(ci * 7 + 2, i) * 0.55);
      const g = new THREE.IcosahedronGeometry(0.2 + rnd(ci * 7 + 3, i) * 0.17, 0);
      g.scale(1.35, 0.48 + rnd(ci * 7 + 4, i) * 0.2, 1.0);
      g.rotateY(rnd(ci * 7 + 5, i) * 6.28);
      const [wx, wz] = canalPoint(c, x, z);
      g.translate(wx, 0.05 + rnd(ci * 7 + 6, i) * 0.16, wz);
      wetStone.push(g);
      if (i % 2 === 0) {
        const m = new THREE.IcosahedronGeometry(0.16 + rnd(ci * 7 + 7, i) * 0.12, 0);
        m.scale(1.7, 0.22, 1.25);
        m.rotateY(rnd(ci * 7 + 8, i) * 6.28);
        const [mx, mz] = canalPoint(c, x + side * 0.08, z + 0.2);
        m.translate(mx, 0.3 + rnd(ci * 7 + 9, i) * 0.08, mz);
        moss.push(m);
      }
    }
    const plantN = Math.max(7, Math.round(c.d / 8.5));
    for (let i = 0; i < plantN; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const z = -c.d * 0.47 + ((i + 0.5) / plantN) * c.d * 0.94;
      const [bx, bz] = canalPoint(c, side * (c.w * 0.5 - 0.32), z);
      for (let k = 0; k < 5; k++) {
        const h = 0.45 + rnd(ci * 13 + i, k) * 0.75;
        const g = new THREE.ConeGeometry(0.035, h, 4);
        g.rotateZ((rnd(ci * 13 + i, k + 4) - 0.5) * 0.5);
        g.rotateY(rnd(ci * 13 + i, k + 8) * 6.28);
        g.translate(bx + (rnd(ci * 13 + i, k + 12) - 0.5) * 0.5, 0.02 + h * 0.5, bz + (rnd(ci * 13 + i, k + 16) - 0.5) * 0.5);
        blade.push(g);
      }
    }
    const stepN = Math.max(1, Math.floor(c.d / 55));
    for (let i = 0; i < stepN; i++) {
      const side = i % 2 === 0 ? 1 : -1;
      const z = -c.d * 0.4 + ((i + 0.5) / stepN) * c.d * 0.8;
      for (let k = 0; k < 4; k++) {
        addCanalBox(stone, c, 0.92, 0.11, 0.44, side * (c.w * 0.5 + 0.22 - k * 0.3), 0.27 - k * 0.085, z);
      }
      addCanalBox(stone, c, 0.25, 0.5, 0.5, side * (c.w * 0.5 + 0.55), 0.25, z - 0.5);
      addCanalBox(stone, c, 0.25, 0.5, 0.5, side * (c.w * 0.5 + 0.55), 0.25, z + 0.5);
    }
  }

  const weirDefs = [
    { canal: 0, at: -136 },
    { canal: 0, at: 56 },
    { canal: 0, at: 112 },
    { canal: 1, at: -98 },
    { canal: 1, at: 8 },
    { canal: 2, at: -70 },
  ];
  for (const wdef of weirDefs) {
    const c = canals[wdef.canal];
    if (!c) continue;
    const alongZ = c.d > c.w;
    const lx = alongZ ? 0 : wdef.at - c.x;
    const lz = alongZ ? wdef.at - c.z : 0;
    if (alongZ) {
      addCanalBox(stone, c, c.w + 0.35, 0.32, 0.5, 0, -0.02, lz);
      for (let k = 0; k < 5; k++) {
        addCanalBox(snow, c, c.w * 0.9, 0.035, 0.1, 0, -0.13 + k * 0.045, lz + 0.18 + k * 0.04);
      }
    } else {
      addCanalBox(stone, c, 0.5, 0.32, c.d * 0.94, lx, -0.02, 0);
      for (let k = 0; k < 5; k++) {
        addCanalBox(snow, c, 0.1, 0.035, c.d * 0.88, lx + 0.18 + k * 0.04, -0.13 + k * 0.045, 0);
      }
    }
    const [wx, wz] = canalPoint(c, lx, lz);
    weirs.push({ x: wx, z: wz, alongZ, canal: wdef.canal });
  }

  for (const b of bridges) {
    for (const side of [-1, 1]) {
      const rx = side * (b.width * 0.5 - 0.1);
      for (let i = 0; i <= 10; i++) {
        const t = -1 + (2 * i) / 10;
        const lz = (t * b.span) / 2;
        const yy = archY(t, b.span, b.rise, b.baseY);
        addBridgeBox(stone, b, 0.3, 0.3, 0.3, rx, yy + 1.14, lz);
        if (i < 10) {
          const t2 = -1 + (2 * (i + 1)) / 10;
          const lz2 = (t2 * b.span) / 2;
          const y2 = archY(t2, b.span, b.rise, b.baseY);
          const mid = (lz + lz2) * 0.5;
          const my = (yy + y2) * 0.5 + 0.62;
          addBridgeBox(stone, b, 0.16, 0.18, Math.abs(lz2 - lz) * 0.66, side * (b.width * 0.5 + 0.08), my + 0.24, mid);
          addBridgeBox(stone, b, 0.13, 0.32, Math.abs(lz2 - lz) * 0.3, side * (b.width * 0.5 + 0.1), my, mid);
        }
      }
      for (const s of [-1, 1]) {
        const lx = side * (b.width * 0.5 - 0.1);
        const lz = s * (b.span * 0.5 + 0.65);
        const [wx, wz] = canalPoint(b, lx, lz);
        addCylinder(stone, 0.3, 0.34, 0.55, 7, wx, b.baseY + 0.33, wz);
      }
    }
    const key = new THREE.IcosahedronGeometry(0.42, 0);
    key.scale(0.5, 0.75, 0.42);
    key.rotateY(b.rot);
    const [kx, kz] = canalPoint(b, 0, 0);
    key.translate(kx, b.baseY + 0.62, kz);
    stone.push(key);
  }

  for (let hi = 0; hi < houses.length; hi++) {
    const h = houses[hi];
    const front = h.d * 0.5;
    const baseH = 0.42;
    const wallH = 3.25;
    const upperH = h.storeys > 1 ? 2.45 : 0;
    const top = baseH + wallH + upperH;
    const winY = baseH + (h.storeys > 1 ? wallH + upperH * 0.48 : 1.65);
    const winCount = h.storeys > 1 ? 3 : 2;
    for (const side of [-1, 1]) {
      const cx = side * (h.w * 0.28 + 0.24);
      addLocalBox(rust, h, 0.25, 1.9, 0.055, cx, 2.02, front + 0.115);
      addLocalBox(dark, h, 0.31, 0.09, 0.09, cx, 2.99, front + 0.12);
      for (let k = 0; k < 5; k++) {
        if (k % 2 === 0) addLocalBox(gold, h, 0.14, 0.04, 0.018, cx, 1.35 + k * 0.29, front + 0.15);
        else addLocalBox(gold, h, 0.035, 0.16, 0.018, cx, 1.43 + k * 0.29, front + 0.15);
      }
    }
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        addLocalSphere(gold, h, 0.055, (c - 1) * 0.25, 1.28 + r * 0.28, front + 0.13, 1, 1, 0.6);
      }
    }
    for (let wi = 0; wi < winCount; wi++) {
      const wx = -h.w * 0.24 + (wi * h.w * 0.48) / Math.max(1, winCount - 1);
      addLocalBox(dark, h, h.w * 0.19 + 0.1, 0.08, 0.09, wx, winY + 0.5, front + 0.13);
      addLocalBox(dark, h, h.w * 0.19 + 0.1, 0.08, 0.09, wx, winY - 0.5, front + 0.13);
      addLocalBox(dark, h, 0.07, 1.08, 0.09, wx - h.w * 0.085, winY, front + 0.13);
      addLocalBox(dark, h, 0.07, 1.08, 0.09, wx + h.w * 0.085, winY, front + 0.13);
      for (let k = 1; k <= 4; k++) {
        addLocalBox(dark, h, 0.035, 0.92, 0.085, wx - h.w * 0.075 + (k * h.w * 0.15) / 5, winY, front + 0.095);
      }
      addLocalBox(dark, h, h.w * 0.16, 0.04, 0.085, wx, winY + 0.22, front + 0.095);
      addLocalBox(dark, h, h.w * 0.16, 0.04, 0.085, wx, winY - 0.22, front + 0.095);
    }
    const eaveY = top - 0.02;
    addLocalBox(dark, h, h.w + 1.5, 0.14, 0.16, 0, eaveY - 0.04, front + 0.92);
    const capN = Math.max(12, Math.round(h.w / 0.62));
    for (let i = 0; i < capN; i++) {
      const lx = -h.w * 0.5 - 0.62 + (i / (capN - 1)) * (h.w + 1.24);
      const g = new THREE.CylinderGeometry(0.065, 0.075, 0.34, 5);
      g.rotateX(Math.PI / 2);
      g.rotateY(h.rot);
      const [x, z] = housePoint(h, lx, front + 0.92);
      g.translate(x, eaveY - 0.01, z);
      (hi % 2 === 0 ? tile : tileDark).push(g);
    }
    addLocalBox(dark, h, 0.34, 0.12, 2.2, h.w * 0.5 + 0.05, eaveY - 0.04, 0.1);
    addLocalBox(dark, h, 0.34, 0.12, 2.2, -h.w * 0.5 - 0.05, eaveY - 0.04, 0.1);
    if (hi % 4 === 1) {
      const name = h.name || SHOP_NAMES[hi % SHOP_NAMES.length];
      const board = new THREE.Mesh(new THREE.PlaneGeometry(1.45, 0.45), getPlaqueMaterial(name));
      const [x, z] = housePoint(h, h.w * 0.38, front + 0.58);
      board.position.set(x, 3.1, z);
      board.rotation.y = h.rot;
      staticGroup.add(board);
      addLocalBox(dark, h, 1.55, 0.55, 0.06, h.w * 0.38, 3.1, front + 0.54);
      addLocalBox(dark, h, 0.06, 0.06, 0.5, h.w * 0.38, 3.44, front + 0.34);
    }
    if (hi % 7 === 2) {
      const lineY = Math.min(eaveY - 0.7, 3.15);
      addLocalBox(dark, h, 2.45, 0.055, 0.055, 0, lineY + 0.78, front + 0.95);
      addLocalBox(dark, h, 0.05, 0.95, 0.05, -1.2, lineY + 0.3, front + 0.95);
      addLocalBox(dark, h, 0.05, 0.95, 0.05, 1.2, lineY + 0.3, front + 0.95);
      for (let k = 0; k < 3; k++) {
        const list = (hi + k) % 3 === 0 ? indigo : (hi + k) % 3 === 1 ? cloth : rust;
        addLocalBox(list, h, 0.58, 0.82, 0.045, -0.72 + k * 0.72, lineY + 0.28, front + 0.94);
      }
    }
    if (hi % 9 === 4) {
      const [bx, bz] = housePoint(h, -h.w * 0.3, front + 0.66);
      addBasket(terra, wood, bx, bz, 0.9 + (hi % 3) * 0.12);
    }
  }

  const teaSpots = [
    [-20, 4, 0.3], [9, 3, -0.4], [12, 24, 0.8], [-17, 34, 2.2],
    [44.2, 40, 0.1], [59.4, 108, 3.1], [-51.2, 30, 0.2], [-64.2, -14, 3.0],
  ];
  teaSpots.forEach((t, i) => {
    addTeaTable(wood, dark, terra, t[0], t[1], t[2], i);
    figures.push(seatedFigure(t[0] + Math.cos(t[2]) * 0.72, t[1] - Math.sin(t[2]) * 0.72, t[2] + Math.PI, i));
    if (i % 2 === 0) {
      figures.push(seatedFigure(t[0] - Math.cos(t[2]) * 0.72, t[1] + Math.sin(t[2]) * 0.72, t[2], i + 3));
    }
  });
  const visitorSpots = [[-11, 15, 0.4], [-7, 21, 2.7], [18, 17, 1.2], [22, 8, 3.4], [48, 66, 0.2], [-39, 60, 2.9]];
  visitorSpots.forEach((v, i) => figures.push(standingFigure(v[0], v[1], v[2], i)));
  for (const [hx, hz, hr] of [[43.8, 72, 0.4], [-40, 54, 2.6]]) {
    const horse = packHorse(hx, hz, hr);
    horseBody.push(horse.body);
    horseBlanket.push(horse.blanket);
    horseLoad.push(horse.load);
  }
  for (const [bx, bz, bs] of [[44.6, 6, 1], [59.2, 22, 0.85], [-52.8, 44, 1.1], [-63.2, -48, 0.9], [38.5, 35, 1], [-22, 7, 0.95]]) {
    addBasket(terra, wood, bx, bz, bs);
  }
  figures.push(seatedFigure(-18, 8.5, 0.6, 8));
  figures.push(seatedFigure(10.6, 6.2, 2.4, 9));

  const staticSets = [
    [stone, mats.stone],
    [wetStone, mats.waterStone],
    [moss, mats.rockMoss],
    [blade, mats.blade],
    [dark, mats.naxiWoodDark],
    [gold, mats.gold],
    [rust, mats.rust],
    [cloth, mats.cloth],
    [indigo, mats.indigo],
    [terra, mats.terracotta],
    [wood, mats.naxiWood],
    [tile, mats.tile],
    [tileDark, mats.tileDark],
    [snow, mats.snow],
    [horseBody, mats.horse],
    [horseBlanket, mats.rust],
    [horseLoad, mats.terracotta],
  ];
  for (const [list, material] of staticSets) {
    const mesh = mergedMesh(list, material, true, true);
    if (mesh) staticGroup.add(mesh);
  }
  const figureMesh = new THREE.Mesh(mergeParts(figures), mats.visitor);
  figureMesh.castShadow = true;
  figureMesh.receiveShadow = true;
  staticGroup.add(figureMesh);

  const rippleData = [];
  for (let i = 0; i < 46; i++) {
    rippleData.push({
      mode: 'z',
      x: 49.1 + rnd(91, i) * 5.8,
      min: -158,
      max: 146,
      offset: rnd(92, i) * 304,
      speed: 1.1 + rnd(93, i) * 1.4,
      y: -0.036,
      phase: rnd(94, i) * 6.28,
      size: 0.72 + rnd(95, i) * 0.5,
    });
  }
  for (let i = 0; i < 22; i++) {
    rippleData.push({
      mode: 'x',
      z: 59.6 + rnd(96, i) * 5.2,
      min: -118,
      max: 46,
      offset: rnd(97, i) * 164,
      speed: 0.8 + rnd(98, i) * 0.9,
      y: -0.036,
      phase: rnd(99, i) * 6.28,
      size: 0.68 + rnd(100, i) * 0.5,
    });
  }
  for (let i = 0; i < 16; i++) {
    rippleData.push({
      mode: 'z',
      x: -60.4 + rnd(101, i) * 4.8,
      min: -96,
      max: 56,
      offset: rnd(102, i) * 152,
      speed: 0.7 + rnd(103, i) * 0.8,
      y: -0.036,
      phase: rnd(104, i) * 6.28,
      size: 0.7 + rnd(105, i) * 0.45,
    });
  }
  for (let i = 0; i < 28; i++) {
    const w = weirs[i % Math.max(1, weirs.length)];
    if (!w) break;
    rippleData.push({
      mode: 'weir',
      x: w.x + (rnd(106, i) - 0.5) * 3.4,
      z: w.z + (rnd(107, i) - 0.5) * 0.4,
      y: -0.04,
      phase: rnd(108, i) * 6.28,
      size: 0.35 + rnd(109, i) * 0.35,
      drift: 0.12 + rnd(110, i) * 0.25,
    });
  }
  const rippleGeo = new THREE.RingGeometry(0.2, 0.3, 9);
  rippleGeo.rotateX(-Math.PI / 2);
  const ripples = new THREE.InstancedMesh(rippleGeo, mats.ripple, rippleData.length);
  ripples.frustumCulled = false;
  ripples.renderOrder = 2;
  dynamicGroup.add(ripples);

  const tasselParts = [];
  const cord = new THREE.CylinderGeometry(0.014, 0.014, 0.16, 4);
  cord.translate(0, -0.08, 0);
  tasselParts.push(cord);
  const cap = new THREE.IcosahedronGeometry(0.045, 0);
  cap.translate(0, -0.17, 0);
  tasselParts.push(cap);
  const cone = new THREE.ConeGeometry(0.06, 0.38, 5);
  cone.rotateX(Math.PI);
  cone.translate(0, -0.36, 0);
  tasselParts.push(cone);
  const tassels = new THREE.InstancedMesh(mergeParts(tasselParts), mats.lanternRed, Math.max(1, lanternSpots.length));
  tassels.count = lanternSpots.length;
  tassels.frustumCulled = false;
  tassels.castShadow = false;
  dynamicGroup.add(tassels);

  const petalCount = 78;
  const petalGeo = new THREE.CircleGeometry(0.085, 5);
  petalGeo.rotateX(-Math.PI / 2);
  const petals = new THREE.InstancedMesh(petalGeo, mats.petal, petalCount);
  petals.frustumCulled = false;
  const petalZones = [
    [-30, 20, 24], [44, -30, 15], [60, 88, 15], [-62, -34, 16],
    [10, 110, 20], [-94, 92, 18], [70, 128, 18], [-42, 48, 16],
    [-82, 118, 14], [98, -146, 14],
  ];
  const petalData = [];
  const petalColor = new THREE.Color();
  for (let i = 0; i < petalCount; i++) {
    const zone = petalZones[i % petalZones.length];
    petalData.push({
      x: zone[0] + (rnd(121, i) - 0.5) * zone[2],
      z: zone[1] + (rnd(122, i) - 0.5) * zone[2],
      y: 1.4 + rnd(123, i) * 6.8,
      fall: 0.22 + rnd(124, i) * 0.3,
      sway: 0.24 + rnd(125, i) * 0.42,
      phase: rnd(126, i) * 6.28,
      spin: 0.4 + rnd(127, i) * 0.9,
      scale: 0.7 + rnd(128, i) * 0.6,
    });
    petalColor.setHex(i % 5 === 0 ? 0xf4e7de : i % 3 === 0 ? 0xeeb6bc : 0xe7c6cb);
    petals.setColorAt(i, petalColor);
  }
  petals.instanceColor.needsUpdate = true;
  dynamicGroup.add(petals);

  const dummy = new THREE.Object3D();

  function update(time, dt) {
    const swayTime = time;
    rippleData.forEach((p, i) => {
      let x = p.x;
      let z = p.z;
      let y = p.y;
      let scale = p.size;
      if (p.mode === 'z') {
        z = p.min + ((p.offset + time * p.speed) % (p.max - p.min));
        scale *= 0.55 + 0.45 * Math.sin((time * 0.8 + p.phase) % 6.28);
      } else if (p.mode === 'x') {
        x = p.min + ((p.offset + time * p.speed) % (p.max - p.min));
        scale *= 0.55 + 0.45 * Math.sin((time * 0.8 + p.phase) % 6.28);
      } else {
        y += Math.sin(time * 2.4 + p.phase) * 0.03;
        x += Math.sin(time * 1.3 + p.phase) * p.drift;
        scale *= 0.6 + 0.4 * Math.sin(time * 3.1 + p.phase);
      }
      dummy.position.set(x, y, z);
      dummy.rotation.set(0, time * 0.18 + p.phase, 0);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      ripples.setMatrixAt(i, dummy.matrix);
    });
    ripples.instanceMatrix.needsUpdate = true;

    lanternSpots.forEach((s, i) => {
      const swing = Math.sin(time * 1.05 + s.phase) * 0.17;
      const ox = Math.sin(swing) * 0.52;
      const oy = -Math.cos(swing) * 0.52;
      dummy.position.set(s.x + ox, s.y + oy - 0.58, s.z);
      dummy.rotation.set(swing * 0.38, 0, swing * 1.05 + Math.sin(swayTime * 1.7 + s.phase) * 0.1);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      tassels.setMatrixAt(i, dummy.matrix);
    });
    if (lanternSpots.length) tassels.instanceMatrix.needsUpdate = true;

    petalData.forEach((p, i) => {
      p.y -= p.fall * dt;
      p.x += Math.sin(time * 0.6 + p.phase) * p.sway * dt;
      p.z += Math.cos(time * 0.5 + p.phase * 1.2) * p.sway * 0.7 * dt;
      if (p.y < 0.2) {
        p.y = 7.2 + (i % 4) * 0.5;
        p.x += Math.sin(i * 2.4 + time) * 1.6;
        p.z += Math.cos(i * 1.9 + time) * 1.6;
      }
      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set(Math.sin(time * 1.5 + p.phase) * 0.7, time * p.spin + p.phase, Math.cos(time * 1.2 + p.phase) * 0.6);
      dummy.scale.setScalar(p.scale);
      dummy.updateMatrix();
      petals.setMatrixAt(i, dummy.matrix);
    });
    petals.instanceMatrix.needsUpdate = true;
  }

  return { staticGroup, dynamicGroup, update };
}

