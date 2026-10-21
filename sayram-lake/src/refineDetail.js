import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mats } from './materials.js';
import { mergedMesh } from './geometry.js';

function rnd(seed, n) {
  const v = Math.sin(seed * 71.37 + n * 43.91) * 43758.5453;
  return v - Math.floor(v);
}

function box(list, w, h, d, x, y, z, ry = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (ry) g.rotateY(ry);
  g.translate(x, y, z);
  list.push(g);
}

function cyl(list, rt, rb, h, seg, x, y, z) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  g.translate(x, y, z);
  list.push(g);
}

function rod(list, ax, ay, az, bx, by, bz, r = 0.06, seg = 4) {
  const dx = bx - ax;
  const dy = by - ay;
  const dz = bz - az;
  const len = Math.hypot(dx, dy, dz);
  if (len < 0.001) return;
  const g = new THREE.CylinderGeometry(r, r, len, seg);
  g.translate(0, len / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(dx, dy, dz).normalize()
  ));
  g.translate(ax, ay, az);
  list.push(g);
}

function flush(group, list, material, cast = true) {
  if (!list.length) return;
  const m = mergedMesh(list, material, cast, true);
  if (m) group.add(m);
}

function figure(list, x, y, z, ry, scale, seed) {
  const r = rnd(seed, 1);
  const body = new THREE.BoxGeometry(0.32 * scale, 0.68 * scale, 0.22 * scale);
  body.rotateY(ry);
  body.translate(x, y + 1.14 * scale, z);
  list.body.push(body);
  const head = new THREE.IcosahedronGeometry(0.15 * scale, 0);
  head.translate(x + Math.sin(ry) * 0.02, y + 1.6 * scale, z + Math.cos(ry) * 0.02);
  list.head.push(head);
  for (const s of [-1, 1]) {
    const leg = new THREE.BoxGeometry(0.1 * scale, 0.5 * scale, 0.12 * scale);
    leg.translate(x + s * 0.09 * scale, y + 0.28 * scale, z);
    list.leg.push(leg);
  }
  if (r > 0.58) {
    box(list.pack, 0.24 * scale, 0.34 * scale, 0.16 * scale, x - Math.sin(ry) * 0.18 * scale, y + 1.2 * scale, z - Math.cos(ry) * 0.18 * scale, ry);
  }
  if (r > 0.84) {
    const um = new THREE.ConeGeometry(0.46 * scale, 0.2 * scale, 8);
    um.translate(x + 0.2 * scale, y + 2.0 * scale, z + 0.16 * scale);
    list.pack.push(um);
    rod(list.pack, x + 0.2 * scale, y + 1.6 * scale, z + 0.16 * scale, x + 0.2 * scale, y + 2.0 * scale, z + 0.16 * scale, 0.016, 4);
  }
}

function flushFigures(group, lists) {
  flush(group, lists.body, mats.wall);
  flush(group, lists.leg, mats.wood);
  flush(group, lists.head, mats.marbleShade);
  flush(group, lists.pack, mats.boatRed);
}

function cherryTree(seed) {
  const group = new THREE.Group();
  const h = 4.6 + rnd(seed, 1) * 1.5;
  const trunk = [];
  cyl(trunk, 0.14, 0.27, h * 0.6, 6, 0, h * 0.3, 0);
  for (let i = 0; i < 4; i++) {
    const a = rnd(seed, i + 4) * 6.28;
    rod(trunk, 0, h * 0.52, 0, Math.cos(a) * 1.6, h * 0.72 + rnd(seed, i + 9) * 0.6, Math.sin(a) * 1.6, 0.07, 4);
  }
  flush(group, trunk, mats.trunk);
  const light = [];
  const deep = [];
  for (let i = 0; i < 9; i++) {
    const r = 0.55 + rnd(seed, i + 20) * 0.65;
    const g = new THREE.IcosahedronGeometry(r, 1);
    g.scale(1.2, 0.72, 1.15);
    g.translate((rnd(seed, i + 30) - 0.5) * 3.4, h * (0.62 + rnd(seed, i + 40) * 0.3), (rnd(seed, i + 50) - 0.5) * 3.4);
    (i % 3 === 0 ? deep : light).push(g);
  }
  flush(group, light, mats.blossom);
  flush(group, deep, mats.peachDeep);
  return group;
}

function createCausewayBridgeDetail(bridges) {
  const group = new THREE.Group();
  for (const b of bridges) {
    const g = new THREE.Group();
    const stone = [];
    const dark = [];
    const moss = [];
    const wood = [];
    const lantern = [];
    const glow = [];
    for (const end of [-1, 1]) {
      const z0 = end * (b.span * 0.5 + 0.1);
      for (let s = 0; s < 4; s++) {
        box(stone, b.width * 0.94, 0.18, 0.42, 0, 0.48 - s * 0.18, z0 + end * (s + 0.5) * 0.42);
        if (end > 0) box(dark, b.width * 0.98, 0.05, 0.05, 0, 0.6, z0 + s * 0.42);
      }
    }
    for (const side of [-1, 1]) {
      for (let i = 0; i <= 12; i++) {
        const t = -1 + (2 * i) / 12;
        const z = (t * b.span) / 2;
        const y = 0.55 + b.rise * Math.cos(Math.max(-1, Math.min(1, t)) * Math.PI * 0.5);
        box(dark, 0.05, 0.4, 0.05, side * (b.width * 0.5 - 0.01), y + 0.68, z);
        if (i % 3 === 0) {
          box(dark, 0.34, 0.1, 0.34, side * (b.width * 0.5 - 0.08), y + 1.12, z);
          box(moss, 0.26, 0.12, 0.3, side * (b.width * 0.5 - 0.08), y + 0.28, z + 0.2);
        }
      }
      for (const end of [-1, 1]) {
        const z = end * (b.span * 0.5 + 0.55);
        const px = side * (b.width * 0.5 + 0.6);
        cyl(wood, 0.07, 0.09, 1.5, 6, px, 1.05, z);
        box(lantern, 0.36, 0.46, 0.36, px, 1.92, z);
        box(lantern, 0.52, 0.08, 0.52, px, 2.2, z);
        const bulb = new THREE.SphereGeometry(0.16, 7, 5);
        bulb.scale(1, 1.2, 1);
        bulb.translate(px, 1.92, z);
        glow.push(bulb);
      }
    }
    flush(g, stone, mats.stone);
    flush(g, dark, mats.wallDark);
    flush(g, moss, mats.shrub);
    flush(g, wood, mats.wood);
    flush(g, lantern, mats.wallDark);
    flush(g, glow, mats.lanternRed, false);
    g.position.set(b.x, 0, b.z);
    g.rotation.y = b.rot;
    group.add(g);
  }
  return group;
}

function createLeifengRefine(x, z, baseY) {
  const group = new THREE.Group();
  const tiles = [];
  const brackets = [];
  const rails = [];
  const mounts = [];
  const stone = [];
  const visitors = { body: [], head: [], leg: [], pack: [] };
  let y = 3.4;
  const tiers = [
    [7.1, 8.5, 5.4],
    [6.4, 7.5, 4.6],
    [5.7, 6.6, 4.1],
    [5.0, 5.8, 3.7],
    [4.2, 5.0, 3.4],
  ];
  tiers.forEach(([rt, rb, h], i) => {
    const top = y + h;
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
      rod(tiles, Math.cos(a) * (rb + 2.45), top + 0.12, Math.sin(a) * (rb + 2.45), Math.cos(a) * 0.45, top + 2.24, Math.sin(a) * 0.45, 0.055, 4);
      for (let s = 1; s < 4; s++) {
        const f = s / 4;
        const rr = (rb + 2.45) * (1 - f) + 0.45 * f;
        box(tiles, 0.16, 0.09, 0.5, Math.cos(a) * rr, top + 0.12 + 2.12 * f, Math.sin(a) * rr, -a);
      }
      const ba = a + Math.PI / 8;
      box(brackets, 0.72, 0.14, 0.36, Math.cos(ba) * (rb + 0.9), top - 0.02, Math.sin(ba) * (rb + 0.9), -ba);
      box(brackets, 0.5, 0.16, 0.5, Math.cos(ba) * (rb + 0.98), top + 0.16, Math.sin(ba) * (rb + 0.98), -ba);
      cyl(mounts, 0.025, 0.025, 0.55, 4, Math.cos(a) * (rb + 2.1), top - 0.22, Math.sin(a) * (rb + 2.1));
      if (i < 3) {
        const rr = rb + 1.55;
        for (let s = 0; s < 3; s++) {
          const ra = a + (s - 1) * 0.12;
          cyl(rails, 0.045, 0.045, 0.62, 5, Math.cos(ra) * rr, top + 0.25, Math.sin(ra) * rr);
        }
      }
    }
    y = top + 0.7;
  });
  for (const end of [-1, 1]) {
    for (let s = 0; s < 5; s++) {
      box(stone, 4.8 - s * 0.06, 0.34, 0.62, 0, 0.25 + s * 0.42, end * (12.7 - s * 0.62));
    }
  }
  for (let k = 0; k < 26; k++) {
    const a = rnd(901, k) * Math.PI * 2;
    const r = 13.6 + rnd(901, k + 30) * 4.2;
    const vx = Math.cos(a) * r;
    const vz = Math.sin(a) * r;
    if (k % 3 === 0) figure(visitors, vx, 2.45, vz, Math.atan2(-vx, -vz), 0.9 + rnd(901, k + 60) * 0.16, 920 + k);
  }
  flush(group, tiles, mats.roofDark);
  flush(group, brackets, mats.wallDark);
  flush(group, rails, mats.marbleShade);
  flush(group, mounts, mats.boatGold);
  flush(group, stone, mats.stone);
  flushFigures(group, visitors);
  group.position.set(x, baseY, z);
  return group;
}

function createSantanTowers(points) {
  const group = new THREE.Group();
  for (const [x, z] of points) {
    const stone = [];
    const wood = [];
    cyl(stone, 1.75, 1.9, 0.24, 8, x, 0.12, z);
    cyl(stone, 1.5, 1.62, 0.16, 8, x, 0.3, z);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      box(wood, 0.3, 0.34, 0.12, x + Math.cos(a) * 1.14, 2.72, z + Math.sin(a) * 1.14, -a);
      box(wood, 0.24, 0.28, 0.1, x + Math.cos(a) * 1.12, 3.5, z + Math.sin(a) * 1.12, -a);
      box(wood, 0.18, 0.2, 0.08, x + Math.cos(a) * 1.1, 4.18, z + Math.sin(a) * 1.1, -a);
    }
    cyl(stone, 1.14, 1.24, 0.1, 8, x, 2.44, z);
    cyl(stone, 0.92, 1.0, 0.1, 8, x, 4.42, z);
    flush(group, stone, mats.pagodaStone);
    flush(group, wood, mats.wood);
  }
  return group;
}

function createGushanRefine() {
  const group = new THREE.Group();
  const rails = [];
  const stone = [];
  const wood = [];
  const banner = [];
  const visitors = { body: [], head: [], leg: [], pack: [] };
  const hx = 8;
  const hz = 26;
  const hy = 0.95;
  for (let k = 0; k < 8; k++) {
    const a0 = (k / 8) * Math.PI * 2;
    const a1 = ((k + 1) / 8) * Math.PI * 2;
    const r = 4.35;
    cyl(rails, 0.1, 0.12, 0.95, 6, hx + Math.cos(a0) * r, hy + 0.48, hz + Math.sin(a0) * r);
    rod(rails, hx + Math.cos(a0) * r, hy + 0.86, hz + Math.sin(a0) * r, hx + Math.cos(a1) * r, hy + 0.86, hz + Math.sin(a1) * r, 0.045, 4);
  }
  for (const [px, py, pz, r] of [[-17, 1.15, -65, 5.6], [-55, 1.15, -74, 4.8]]) {
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2;
      cyl(rails, 0.08, 0.1, 0.8, 5, px + Math.cos(a) * r, py + 0.4, pz + Math.sin(a) * r);
    }
    box(stone, 2.1, 0.2, 1.0, px, py + 0.1, pz + r + 1.6);
  }
  for (const [bx, bz] of [[-13, -61], [-20, -69], [6, 22], [11, 31]]) {
    cyl(wood, 0.09, 0.12, 4.2, 6, bx, 1.05 + 2.1, bz);
    const flag = new THREE.BoxGeometry(0.9, 1.5, 0.03);
    flag.translate(bx + 0.47, 4.45, bz);
    banner.push(flag);
  }
  for (let i = 0; i < 12; i++) {
    const a = rnd(1101, i) * Math.PI * 2;
    const r = 6 + rnd(1101, i + 20) * 9;
    const px = -30 + Math.cos(a) * r;
    const pz = -72 + Math.sin(a) * r;
    const g = new THREE.IcosahedronGeometry(0.7 + rnd(1101, i + 40) * 1.5, 0);
    g.scale(1.4, 0.7, 1.1);
    g.rotateY(rnd(1101, i + 60) * 6.28);
    g.translate(px, 1.3 + rnd(1101, i + 80) * 0.5, pz);
    stone.push(g);
  }
  for (let i = 0; i < 9; i++) {
    const a = rnd(1201, i) * Math.PI * 2;
    figure(visitors, -24 + Math.cos(a) * 10, 1.15, -70 + Math.sin(a) * 6, a + Math.PI, 0.88 + rnd(1201, i + 4) * 0.14, 1210 + i);
  }
  flush(group, rails, mats.stone);
  flush(group, stone, mats.pagodaStone);
  flush(group, wood, mats.wood);
  flush(group, banner, mats.boatRed);
  flushFigures(group, visitors);
  return group;
}

function createShoreRefine(lake, lotusBeds) {
  const group = new THREE.Group();
  const stems = [];
  const leaves = [];
  const pads = [];
  const flowers = [];
  const pods = [];
  const curve = new THREE.CatmullRomCurve3(
    lake.map(([x, z]) => new THREE.Vector3(x, 0, z)), true, 'catmullrom', 0.35
  );
  const pts = curve.getSpacedPoints(86);
  pts.forEach((p, i) => {
    if (i % 2 === 1) return;
    const dx = p.x;
    const dz = p.z - 10;
    const d = Math.hypot(dx, dz) || 1;
    const off = 1.2 + rnd(1301, i) * 2.4;
    const bx = p.x - (dx / d) * off;
    const bz = p.z - (dz / d) * off;
    const count = 8 + Math.floor(rnd(1301, i + 5) * 8);
    for (let k = 0; k < count; k++) {
      const a = rnd(1301, i * 7 + k) * Math.PI * 2;
      const r = rnd(1301, i * 11 + k) * 1.5;
      const h = 0.8 + rnd(1301, i * 13 + k) * 1.15;
      const px = bx + Math.cos(a) * r;
      const pz = bz + Math.sin(a) * r;
      cyl(stems, 0.015, 0.022, h, 4, px, 0.18 + h / 2, pz);
      const leaf = new THREE.ConeGeometry(0.06 + rnd(1301, i + k) * 0.06, h * 0.8, 4);
      leaf.rotateZ((rnd(1301, i + k + 3) - 0.5) * 0.8);
      leaf.translate(px, 0.2 + h * 0.6, pz);
      leaves.push(leaf);
    }
  });
  lotusBeds.forEach(([x, z, r], i) => {
    for (let k = 0; k < 7; k++) {
      const a = rnd(1401, i * 9 + k) * Math.PI * 2;
      const rr = Math.sqrt(rnd(1401, i * 5 + k)) * r * 0.8;
      const px = x + Math.cos(a) * rr;
      const pz = z + Math.sin(a) * rr;
      const pad = new THREE.CircleGeometry(0.35 + rnd(1401, i + k) * 0.35, 8);
      pad.rotateX(-Math.PI / 2);
      pad.translate(px, 0.3, pz);
      pads.push(pad);
      if (k % 2 === 0) {
        const f = new THREE.SphereGeometry(0.13, 6, 5);
        f.scale(0.9, 1.5, 0.9);
        f.translate(px, 0.6 + rnd(1401, i + k + 3) * 0.16, pz);
        flowers.push(f);
      }
      if (k % 3 === 0) {
        const pod = new THREE.ConeGeometry(0.11, 0.22, 6);
        pod.translate(px + 0.2, 0.62, pz - 0.1);
        pods.push(pod);
      }
    }
  });
  flush(group, stems, mats.willow);
  flush(group, leaves, mats.shrub);
  flush(group, pads, mats.lotus);
  flush(group, flowers, mats.blossom);
  flush(group, pods, mats.peachDeep);
  return group;
}

export function createWestLakeRefineStatic({ bridges = [], lotusBeds = [], lake = [], leifeng = { x: 46, z: 220, baseY: 30.5 }, santan = [] } = {}) {
  const group = new THREE.Group();
  group.name = 'westlake-second-detail';
  group.add(createCausewayBridgeDetail(bridges));
  group.add(createLeifengRefine(leifeng.x, leifeng.z, leifeng.baseY));
  group.add(createSantanTowers(santan));
  group.add(createGushanRefine());
  group.add(createShoreRefine(lake, lotusBeds));
  for (let i = 0; i < 9; i++) {
    const bridge = bridges[i % bridges.length];
    const side = i % 2 === 0 ? 1 : -1;
    const c = cherryTree(1500 + i);
    c.position.set(bridge.x + side * (bridge.width * 0.5 + 4.2), 0.08, bridge.z + (i % 3 - 1) * 4.2);
    group.add(c);
  }
  return group;
}

function bellGeometry() {
  const bell = new THREE.ConeGeometry(0.17, 0.3, 6, 1, true);
  bell.translate(0, -0.2, 0);
  const clapper = new THREE.SphereGeometry(0.055, 6, 5);
  clapper.translate(0, -0.4, 0);
  return mergeGeometries([bell, clapper], false);
}

export function createWestLakeRefineLife({ boats = [], lotusBeds = [], santan = [], leifeng = { x: 46, z: 220, baseY: 30.5 } } = {}) {
  const group = new THREE.Group();
  group.name = 'westlake-second-life';
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  const wakeGeo = new THREE.RingGeometry(0.74, 1.0, 14, 1, 0, Math.PI * 1.35);
  wakeGeo.rotateX(-Math.PI / 2);
  const wakeMat = new THREE.MeshBasicMaterial({
    color: 0xdcefe7, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide,
  });
  const puffs = 7;
  const wakes = new THREE.InstancedMesh(wakeGeo, wakeMat, Math.max(1, boats.length * puffs));
  wakes.frustumCulled = false;
  wakes.renderOrder = 2;
  group.add(wakes);

  const petalCount = 120;
  const petalGeo = new THREE.CircleGeometry(0.095, 5);
  petalGeo.rotateX(-Math.PI / 2);
  const petals = new THREE.InstancedMesh(petalGeo, mats.petal, petalCount);
  petals.frustumCulled = false;
  const petalData = [];
  const petalZones = lotusBeds.length ? lotusBeds : [[0, 20, 30]];
  for (let i = 0; i < petalCount; i++) {
    const zone = petalZones[i % petalZones.length];
    const a = rnd(1601, i) * Math.PI * 2;
    const r = Math.sqrt(rnd(1601, i + 20)) * (zone[2] + 8);
    petalData.push({
      x: zone[0] + Math.cos(a) * r,
      z: zone[1] + Math.sin(a) * r,
      y: 0.18 + rnd(1601, i + 40) * 0.05,
      drift: 0.12 + rnd(1601, i + 60) * 0.2,
      phase: rnd(1601, i + 80) * 6.28,
      spin: 0.2 + rnd(1601, i + 100) * 0.5,
    });
    color.setHex(i % 3 === 0 ? 0xa8b56f : i % 5 === 0 ? 0xe9b9bf : 0xf1d7d9);
    petals.setColorAt(i, color);
  }
  petals.instanceColor.needsUpdate = true;
  group.add(petals);

  const lanternGeo = mergeGeometries([
    new THREE.CylinderGeometry(0.26, 0.32, 0.09, 8),
    (() => {
      const s = new THREE.SphereGeometry(0.21, 8, 6);
      s.scale(1, 1.25, 1);
      s.translate(0, 0.2, 0);
      return s;
    })(),
    (() => {
      const c = new THREE.ConeGeometry(0.2, 0.17, 8);
      c.translate(0, 0.39, 0);
      return c;
    })(),
  ], false);
  const lanternPositions = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + 0.3;
    const r = 112 + (i % 4) * 12;
    lanternPositions.push({
      cx: 0, cz: 14, rx: r, rz: r * 0.52, phase: a, speed: 0.012 + (i % 3) * 0.002,
    });
  }
  for (const [x, z] of santan) {
    lanternPositions.push({ cx: x, cz: z, rx: 0.9, rz: 0.7, phase: rnd(1701, x) * 6.28, speed: 0.05 });
  }
  const lanterns = new THREE.InstancedMesh(lanternGeo, mats.lanternRed, lanternPositions.length);
  lanterns.frustumCulled = false;
  group.add(lanterns);

  const padCount = 90;
  const padGeo = new THREE.CircleGeometry(0.52, 9);
  padGeo.rotateX(-Math.PI / 2);
  const pads = new THREE.InstancedMesh(padGeo, mats.lotus, padCount);
  pads.frustumCulled = false;
  const padData = [];
  for (let i = 0; i < padCount; i++) {
    const bed = petalZones[i % petalZones.length];
    const a = rnd(1801, i) * Math.PI * 2;
    const r = Math.sqrt(rnd(1801, i + 20)) * bed[2] * 0.85;
    padData.push({ x: bed[0] + Math.cos(a) * r, z: bed[1] + Math.sin(a) * r, phase: rnd(1801, i + 40) * 6.28 });
  }
  group.add(pads);

  const tierYs = [];
  let ty = 3.4;
  for (const h of [5.4, 4.6, 4.1, 3.7, 3.4]) {
    tierYs.push(ty);
    ty += h + 0.7;
  }
  const bells = new THREE.InstancedMesh(bellGeometry(), mats.boatGold, 40);
  bells.frustumCulled = false;
  group.add(bells);
  const bellData = [];
  tierYs.forEach((by, i) => {
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
      const rb = [8.5, 7.5, 6.6, 5.8, 5.0][i];
      bellData.push({
        x: leifeng.x + Math.cos(a) * (rb + 2.1),
        y: leifeng.baseY + by + [5.4, 4.6, 4.1, 3.7, 3.4][i] - 0.18,
        z: leifeng.z + Math.sin(a) * (rb + 2.1),
        phase: k * 0.8 + i * 0.5,
      });
    }
  });

  function update(time) {
    if (boats.length) {
      let idx = 0;
      for (const b of boats) {
        const d = b.userData.def;
        for (let k = 0; k < puffs; k++) {
          const lag = 0.55 + k * 0.42;
          const a = (time - lag) * d.speed + d.phase;
          const x = d.cx + Math.cos(a) * d.rx;
          const z = d.cz + Math.sin(a) * d.rz;
          const tx = -Math.sin(a) * d.rx;
          const tz = Math.cos(a) * d.rz;
          const scale = (0.55 + k * 0.28) * d.scale;
          dummy.position.set(x, 0.145, z);
          dummy.rotation.set(0, Math.atan2(tx, tz), 0);
          dummy.scale.set(scale, 1, scale * 0.72);
          dummy.updateMatrix();
          wakes.setMatrixAt(idx, dummy.matrix);
          const fade = 1 - k / (puffs + 1);
          color.setRGB(0.72 + fade * 0.2, 0.86 + fade * 0.1, 0.82 + fade * 0.1);
          wakes.setColorAt(idx, color);
          idx++;
        }
      }
      while (idx < wakes.count) {
        dummy.position.set(0, -5, 0);
        dummy.scale.setScalar(0.001);
        dummy.updateMatrix();
        wakes.setMatrixAt(idx++, dummy.matrix);
      }
      wakes.instanceMatrix.needsUpdate = true;
      if (wakes.instanceColor) wakes.instanceColor.needsUpdate = true;
    }

    petalData.forEach((p, i) => {
      const x = p.x + Math.sin(time * p.drift + p.phase) * 3.2;
      const z = p.z + Math.cos(time * p.drift * 0.8 + p.phase) * 2.2;
      dummy.position.set(x, p.y + Math.sin(time * 0.9 + p.phase) * 0.02, z);
      dummy.rotation.set(0, time * p.spin + p.phase, 0);
      dummy.scale.set(1, 1, 0.7 + (i % 3) * 0.2);
      dummy.updateMatrix();
      petals.setMatrixAt(i, dummy.matrix);
    });
    petals.instanceMatrix.needsUpdate = true;

    lanternPositions.forEach((l, i) => {
      const a = time * l.speed + l.phase;
      const x = l.cx + Math.cos(a) * l.rx;
      const z = l.cz + Math.sin(a) * l.rz;
      dummy.position.set(x, 0.16 + Math.sin(time * 0.7 + l.phase) * 0.035, z);
      dummy.rotation.set(0, -a, Math.sin(time * 0.5 + l.phase) * 0.05);
      dummy.scale.setScalar(0.9 + (i % 3) * 0.08);
      dummy.updateMatrix();
      lanterns.setMatrixAt(i, dummy.matrix);
    });
    lanterns.instanceMatrix.needsUpdate = true;

    padData.forEach((p, i) => {
      dummy.position.set(p.x + Math.sin(time * 0.35 + p.phase) * 0.08, 0.29 + Math.sin(time * 0.8 + p.phase) * 0.018, p.z + Math.cos(time * 0.3 + p.phase) * 0.08);
      dummy.rotation.set(0, p.phase + Math.sin(time * 0.25 + p.phase) * 0.15, 0);
      dummy.scale.setScalar(0.85 + (i % 4) * 0.07);
      dummy.updateMatrix();
      pads.setMatrixAt(i, dummy.matrix);
    });
    pads.instanceMatrix.needsUpdate = true;

    bellData.forEach((b, i) => {
      dummy.position.set(b.x, b.y, b.z);
      dummy.rotation.set(Math.sin(time * 1.5 + b.phase) * 0.16, 0, Math.cos(time * 1.2 + b.phase) * 0.24);
      dummy.scale.setScalar(0.92 + (i % 3) * 0.06);
      dummy.updateMatrix();
      bells.setMatrixAt(i, dummy.matrix);
    });
    bells.instanceMatrix.needsUpdate = true;
  }

  update(0);
  return { group, update };
}

