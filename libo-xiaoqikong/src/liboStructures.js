import * as THREE from 'three';
import { mats } from './materials.js';
import { mulberry32, riverCenter, riverWidth, BRIDGE, BOARDWALK, CASCADE_Z, makeRockGeometry } from './liboTerrain.js';

function box(parent, w, h, d, material, x, y, z, ry = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.rotation.y = ry;
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function cyl(parent, rt, rb, h, seg, material, x, y, z) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function addBar(parent, ax, az, bx, bz, y, h, t, material) {
  const dx = bx - ax;
  const dz = bz - az;
  const len = Math.hypot(dx, dz);
  if (len < 0.001) return null;
  const m = new THREE.Mesh(new THREE.BoxGeometry(t, h, len), material);
  m.position.set((ax + bx) * 0.5, y, (az + bz) * 0.5);
  m.rotation.y = Math.atan2(dx, dz);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

export function createSevenArchBridge() {
  const g = new THREE.Group();
  const { x, z, span, width, rise, baseY } = BRIDGE;
  g.position.set(x, 0, z);
  const stone = mats.stone;
  const trim = new THREE.MeshStandardMaterial({ color: 0xb6b7a5, roughness: 0.9 });
  const deckTopAt = (wx) => baseY + 0.35 + rise * Math.cos((wx / (span * 0.5)) * Math.PI * 0.5);
  const bays = 7;
  const bayW = span / bays;
  const opening = bayW - 1.25;
  const spring = 0.18;

  for (let b = 0; b < bays; b++) {
    const cx = -span * 0.5 + (b + 0.5) * bayW;
    const top = deckTopAt(cx) - 0.32;
    const archRise = Math.max(0.34, Math.min(1.35, top - spring - 0.28));
    const rx = opening * 0.5;
    const shape = new THREE.Shape();
    shape.moveTo(-bayW * 0.5, 0.02);
    shape.lineTo(bayW * 0.5, 0.02);
    shape.lineTo(bayW * 0.5, top);
    shape.lineTo(-bayW * 0.5, top);
    shape.closePath();
    const hole = new THREE.Path();
    hole.moveTo(-rx, -0.15);
    hole.lineTo(-rx, spring);
    for (let i = 0; i <= 18; i++) {
      const a = Math.PI - (i / 18) * Math.PI;
      hole.lineTo(Math.cos(a) * rx, spring + Math.sin(a) * archRise);
    }
    hole.lineTo(rx, -0.15);
    hole.closePath();
    shape.holes.push(hole);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: width, bevelEnabled: false, steps: 1, curveSegments: 6 });
    geo.translate(0, 0, -width * 0.5);
    const panel = new THREE.Mesh(geo, stone);
    panel.position.x = cx;
    panel.castShadow = true;
    panel.receiveShadow = true;
    g.add(panel);

    for (const sz of [-1, 1]) {
      for (let i = 0; i < 16; i++) {
        const a = Math.PI - ((i + 0.5) / 16) * Math.PI;
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.3, 0.5), trim);
        m.position.set(cx + Math.cos(a) * (rx + 0.11), spring + Math.sin(a) * (archRise + 0.1), sz * (width * 0.5 + 0.03));
        m.rotation.z = a - Math.PI * 0.5;
        m.castShadow = true;
        g.add(m);
      }
    }
  }

  for (let i = 0; i < 40; i++) {
    const wx = -span * 0.5 + (i + 0.5) * (span / 40);
    const top = deckTopAt(wx);
    const slab = new THREE.Mesh(new THREE.BoxGeometry(span / 40 + 0.04, 0.34, width + 0.5), stone);
    slab.position.set(wx, top - 0.17, 0);
    slab.castShadow = true;
    slab.receiveShadow = true;
    g.add(slab);
  }

  for (const sz of [-1, 1]) {
    for (let i = 0; i < 38; i++) {
      const wx = -span * 0.5 + (i + 0.5) * (span / 38);
      const top = deckTopAt(wx);
      const m = new THREE.Mesh(new THREE.BoxGeometry(span / 38 + 0.02, 0.72, 0.3), stone);
      m.position.set(wx, top + 0.36, sz * (width * 0.5 + 0.13));
      m.castShadow = true;
      m.receiveShadow = true;
      g.add(m);
      if (i % 5 === 0) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.02, 0.48), trim);
        post.position.set(wx, top + 0.53, sz * (width * 0.5 + 0.13));
        post.castShadow = true;
        g.add(post);
      }
      if (i % 4 === 1) {
        const patch = new THREE.Mesh(new THREE.BoxGeometry(0.5 + (i % 3) * 0.16, 0.08, 0.34), mats.moss);
        patch.position.set(wx, top + 0.74, sz * (width * 0.5 + 0.13));
        g.add(patch);
      }
    }
  }
  return g;
}

export function createBoardwalk() {
  const g = new THREE.Group();
  const rand = mulberry32(404);
  for (let i = 0; i < BOARDWALK.length - 1; i++) {
    const [ax, az] = BOARDWALK[i];
    const [bx, bz] = BOARDWALK[i + 1];
    const len = Math.hypot(bx - ax, bz - az);
    const ang = Math.atan2(bx - ax, bz - az);
    const nx = (bz - az) / len;
    const nz = -(bx - ax) / len;
    const n = Math.max(1, Math.round(len / 0.82));
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n;
      const px = ax + (bx - ax) * t;
      const pz = az + (bz - az) * t;
      const m = new THREE.Mesh(new THREE.BoxGeometry(3.05 + (k % 3) * 0.05, 0.12, 0.72), k % 5 === 0 ? mats.timberRed : mats.timber);
      m.position.set(px, 0.43, pz);
      m.rotation.y = ang + (rand() - 0.5) * 0.012;
      m.castShadow = true;
      m.receiveShadow = true;
      g.add(m);
    }
    if (i % 2 === 0) {
      for (const side of [-1, 1]) {
        const px = ax + nx * side * 1.48;
        const pz = az + nz * side * 1.48;
        const px2 = bx + nx * side * 1.48;
        const pz2 = bz + nz * side * 1.48;
        box(g, 0.17, 1.02, 0.17, mats.wood, px, 0.93, pz);
        addBar(g, px, pz, px2, pz2, 1.34, 0.12, 0.12, mats.wood);
        addBar(g, px, pz, px2, pz2, 0.86, 0.09, 0.1, mats.wood);
      }
      box(g, 0.24, 0.52, 0.24, mats.wood, ax, 0.17, az);
    }
    if (i % 9 === 4) box(g, 0.32, 0.32, 3.4, mats.timberRed, ax, 0.26, az, ang);
  }
  for (let i = 0; i < BOARDWALK.length; i += 6) {
    box(g, 0.4, 0.4, 0.4, mats.moss, BOARDWALK[i][0] + 1.1, 0.18, BOARDWALK[i][1]);
  }
  return g;
}

export function createStonePath(points, width = 2.6) {
  const g = new THREE.Group();
  for (let i = 0; i < points.length - 1; i++) {
    const [ax, az] = points[i];
    const [bx, bz] = points[i + 1];
    const len = Math.hypot(bx - ax, bz - az);
    const n = Math.max(1, Math.round(len / 1.4));
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n;
      const m = new THREE.Mesh(new THREE.BoxGeometry(width, 0.1, 1.2), k % 3 === 0 ? mats.paving : mats.causeway);
      m.position.set(ax + (bx - ax) * t, 0.06, az + (bz - az) * t);
      m.rotation.y = Math.atan2(bx - ax, bz - az);
      m.receiveShadow = true;
      m.castShadow = true;
      g.add(m);
    }
  }
  return g;
}

export function createYaoHouse(def, colliders) {
  const { x, z, rot, w, d, seed, storeys = 1 } = def;
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rot;
  const rand = mulberry32(seed);
  const floorY = 1.3;
  const wallH = 2.35 + storeys * 0.5;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) box(g, 0.24, floorY, 0.24, mats.timber, sx * (w * 0.38), floorY * 0.5, sz * (d * 0.34));
  }
  for (let i = 1; i <= 2; i++) {
    box(g, 0.18, floorY, 0.18, mats.timber, -w * 0.38 + i * w * 0.25, floorY * 0.5, d * 0.34);
    box(g, 0.18, floorY, 0.18, mats.timber, -w * 0.38 + i * w * 0.25, floorY * 0.5, -d * 0.34);
  }
  box(g, w, 0.22, d, mats.timberRed, 0, floorY, 0);
  box(g, w - 0.35, wallH, d - 0.35, mats.timber, 0, floorY + wallH * 0.5 + 0.1, 0);
  box(g, w - 0.2, 0.28, d - 0.2, mats.wood, 0, floorY + 0.16, 0);
  for (let i = 0; i < 6; i++) {
    const px = -w * 0.4 + (i + 0.5) * (w * 0.8 / 6);
    box(g, 0.05, wallH * 0.92, 0.06, mats.wood, px, floorY + wallH * 0.54, d * 0.5 - 0.14);
  }
  for (const sx of [-1, 1]) {
    box(g, 1.0, 0.9, 0.08, mats.leak, sx * w * 0.22, floorY + wallH * 0.62, d * 0.5 - 0.12);
    box(g, 0.72, 1.65, 0.1, mats.wood, sx * w * 0.36, floorY + 0.9, d * 0.5 - 0.1);
    box(g, 0.15, 1.3, 0.15, mats.timber, sx * w * 0.47, floorY + 0.7, d * 0.5 + 0.1);
  }
  box(g, w + 0.9, 0.14, 0.9, mats.wood, 0, floorY + 0.05, d * 0.5 + 0.35);
  for (let i = 0; i < 5; i++) {
    box(g, 0.09, 0.75, 0.09, mats.wood, -w * 0.4 + i * w * 0.2, floorY + 0.5, d * 0.5 + 0.74);
  }
  box(g, w + 0.8, 0.08, 0.1, mats.wood, 0, floorY + 0.88, d * 0.5 + 0.74);

  const roofBase = floorY + wallH + 0.25;
  const rise = 1.1 + storeys * 0.18;
  const slope = Math.atan2(rise, d * 0.5 + 0.45);
  for (const sz of [-1, 1]) {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(w + 1.3, 0.16, Math.hypot(rise, d * 0.5 + 0.45) + 0.4), mats.roofDark);
    slab.position.set(0, roofBase + rise * 0.5, sz * (d * 0.25 + 0.2));
    slab.rotation.x = sz * slope;
    slab.castShadow = true;
    slab.receiveShadow = true;
    g.add(slab);
  }
  box(g, w + 1.4, 0.18, 0.3, mats.tileDark, 0, roofBase + rise + 0.02, 0);
  for (let i = 0; i < 5; i++) {
    const lx = -w * 0.35 + i * w * 0.175;
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), mats.lanternRed);
    l.position.set(lx, floorY + 1.0, d * 0.5 + 0.4);
    l.scale.y = 1.4;
    g.add(l);
  }
  for (let i = 0; i < 3; i++) {
    box(g, 1.3, 0.2, 0.5, mats.timberRed, (rand() - 0.5) * w * 0.6, floorY + 0.6, d * 0.5 + 0.6);
  }
  if (colliders) {
    colliders.boxes.push({ minX: x - w * 0.6, maxX: x + w * 0.6, minZ: z - d * 0.6, maxZ: z + d * 0.6 });
    colliders.names.push('瑶寨吊脚楼');
  }
  return g;
}

export function createDrumTower(x, z, colliders) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  box(g, 9, 0.7, 9, mats.stone, 0, 0.35, 0);
  box(g, 6.4, 0.5, 6.4, mats.paving, 0, 0.9, 0);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) cyl(g, 0.22, 0.3, 6.4, 7, mats.timber, sx * 2.5, 4.1, sz * 2.5);
  }
  box(g, 5.6, 0.35, 5.6, mats.timber, 0, 7.35, 0);
  box(g, 4.8, 2.2, 4.8, mats.timber, 0, 8.6, 0);
  for (const [tier, yy, rr] of [[0, 9.9, 5.0], [1, 12.1, 4.0], [2, 14.1, 3.0]]) {
    box(g, rr * 1.2, 0.22, rr * 1.2, mats.timberRed, 0, yy, 0);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(rr, 1.7, 4), mats.roofDark);
    cone.position.set(0, yy + 1.05, 0);
    cone.rotation.y = Math.PI / 4;
    cone.castShadow = true;
    g.add(cone);
  }
  const finial = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.8, 6), mats.gold);
  finial.position.set(0, 16.2, 0);
  g.add(finial);
  if (colliders) {
    colliders.circles.push({ x, z, r: 4.6 });
    colliders.names.push('瑶寨鼓楼');
  }
  return g;
}

export function addCascades(staticRoot) {
  for (let i = 0; i < CASCADE_Z.length; i++) {
    const z = CASCADE_Z[i];
    const w = riverWidth(z) + 2;
    const c = riverCenter(z);
    box(staticRoot, w, 0.9, 1.1, mats.waterStone, c, 0.2, z);
    for (let k = 0; k < 5; k++) {
      box(staticRoot, w * 0.16, 0.28 + k * 0.09, 0.7, mats.moss, c - w * 0.36 + k * w * 0.18, 0.55, z - 0.6);
    }
  }
}

export function addVillage(staticRoot, colliders) {
  const houses = [
    { x: 74, z: 142, rot: -0.25, w: 9, d: 7, storeys: 1, seed: 301 },
    { x: 90, z: 152, rot: 0.12, w: 8, d: 6.5, storeys: 2, seed: 302 },
    { x: 66, z: 158, rot: 0.42, w: 10, d: 7, storeys: 1, seed: 303 },
    { x: 82, z: 170, rot: -0.12, w: 9, d: 7, storeys: 1, seed: 304 },
    { x: 101, z: 176, rot: 0.3, w: 8, d: 6, storeys: 2, seed: 305 },
    { x: 62, z: 184, rot: -0.36, w: 9, d: 7, storeys: 1, seed: 306 },
    { x: 86, z: 198, rot: 0.05, w: 10, d: 7.5, storeys: 1, seed: 307 },
    { x: 108, z: 202, rot: -0.22, w: 8.5, d: 6.5, storeys: 2, seed: 308 },
    { x: 72, z: 214, rot: 0.32, w: 9.5, d: 7, storeys: 1, seed: 309 },
  ];
  for (const h of houses) staticRoot.add(createYaoHouse(h, colliders));
  staticRoot.add(createDrumTower(84, 168, colliders));
  staticRoot.add(createStonePath([[50, 138], [64, 144], [72, 158], [82, 168], [92, 184], [96, 200]], 2.4));
  staticRoot.add(createStonePath([[34, 44], [46, 62], [56, 92], [62, 124], [70, 144]], 2.8));
  staticRoot.add(createStonePath([[-10, 126], [-34, 132], [-56, 132], [-72, 132]], 2.4));
  staticRoot.add(createStonePath([[-30, 40], [-16, 28], [-4, 10], [0, -18]], 2.4));
  const rand = mulberry32(773);
  for (let i = 0; i < 18; i++) {
    const px = 60 + rand() * 55;
    const pz = 138 + rand() * 88;
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.42, 0.8, 8), mats.terracotta);
    drum.position.set(px, 0.4, pz);
    staticRoot.add(drum);
  }
}

export function addRocksNearFalls(staticRoot) {
  const rand = mulberry32(919);
  for (const z of [-48, -40, -34]) {
    for (let i = 0; i < 8; i++) {
      const x = riverCenter(z) + riverWidth(z) * 0.5 + (rand() - 0.5) * 9;
      const m = new THREE.Mesh(makeRockGeometry(910 + i + z, 0), rand() > 0.45 ? mats.moss : mats.waterStone);
      m.position.set(x, 0.1, z + (rand() - 0.5) * 7);
      const s = 0.7 + rand() * 2.2;
      m.scale.set(s, s * 0.8, s);
      m.rotation.y = rand() * 6.28;
      m.castShadow = true;
      m.receiveShadow = true;
      staticRoot.add(m);
    }
  }
}
