import * as THREE from 'three';
import { mats } from './materials.js';
import { addBox, addCylinder, addBar, mergedMesh, createStairs, createBalustrade } from './geometry.js';
import { createRoof, createSkirtRoof } from './roof.js';
import { createHall, createCorridor } from './buildings.js';
import { createHangingLantern } from './props.js';

function archPath(cx, halfW, spring, totalH) {
  const p = new THREE.Path();
  const r = halfW;
  p.moveTo(cx - r, 0);
  p.lineTo(cx - r, spring);
  const seg = 16;
  for (let i = 1; i <= seg; i++) {
    const a = Math.PI - (i / seg) * Math.PI;
    p.lineTo(cx + r * Math.cos(a), spring + r * Math.sin(a));
  }
  p.lineTo(cx + r, 0);
  p.closePath();
  return p;
}

function addArchTrim(group, x, spring, r, z, depthSign) {
  const pts = [];
  pts.push(new THREE.Vector3(x - r, 0, z));
  pts.push(new THREE.Vector3(x - r, spring, z));
  for (let i = 1; i <= 12; i++) {
    const a = Math.PI - (i / 12) * Math.PI;
    pts.push(new THREE.Vector3(x + r * Math.cos(a), spring + r * Math.sin(a), z));
  }
  pts.push(new THREE.Vector3(x + r, 0, z));
  const curve = new THREE.CatmullRomCurve3(pts);
  const geo = new THREE.TubeGeometry(curve, 48, 0.32, 6, false);
  const mesh = new THREE.Mesh(geo, mats.marbleShade);
  mesh.castShadow = true;
  group.add(mesh);
  const blocks = [];
  addBox(blocks, 0.8, 1.4, 1.0, x - r, 0.7, z);
  addBox(blocks, 0.8, 1.4, 1.0, x + r, 0.7, z);
  const bm = mergedMesh(blocks, mats.marbleShade, true, true);
  if (bm) group.add(bm);
  const keys = [];
  addBox(keys, 0.8, 0.5, 0.9, x, spring + r + 0.22, z);
  const km = mergedMesh(keys, mats.gold, true, true);
  if (km) group.add(km);
}

function createArchedBase({ w, h, d, openings }) {
  const group = new THREE.Group();
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, 0);
  shape.lineTo(w / 2, 0);
  shape.lineTo(w / 2, h);
  shape.lineTo(-w / 2, h);
  shape.closePath();
  for (const o of openings) {
    shape.holes.push(archPath(o.x, o.w / 2, o.spring, o.spring + o.w / 2));
  }
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: d,
    bevelEnabled: false,
    curveSegments: 4,
  });
  geo.computeVertexNormals();
  const body = new THREE.Mesh(geo, mats.wall);
  body.position.z = -d / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  for (const o of openings) {
    addArchTrim(group, o.x, o.spring, o.w / 2, d / 2 + 0.05, 1);
    addArchTrim(group, o.x, o.spring, o.w / 2, -d / 2 - 0.05, -1);
  }

  const darkFloor = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.9, d * 0.9), mats.stone);
  darkFloor.rotation.x = -Math.PI / 2;
  darkFloor.position.y = 0.03;
  darkFloor.receiveShadow = true;
  group.add(darkFloor);

  const merlons = [];
  const caps = [];
  const step = 3.2;
  for (let x = -w / 2 + 1.6; x <= w / 2 - 1.2; x += step) {
    addBox(merlons, 1.7, 1.3, 0.9, x, h + 0.65, d / 2 - 0.6);
    addBox(merlons, 1.7, 1.3, 0.9, x, h + 0.65, -d / 2 + 0.6);
    addBox(caps, 1.9, 0.22, 1.05, x, h + 1.36, d / 2 - 0.6);
    addBox(caps, 1.9, 0.22, 1.05, x, h + 1.36, -d / 2 + 0.6);
  }
  const mm = mergedMesh(merlons, mats.wallDark, true, true);
  if (mm) group.add(mm);
  const cm = mergedMesh(caps, mats.roofDark, false, false);
  if (cm) group.add(cm);

  const capList = [];
  addBox(capList, w + 0.8, 0.7, d + 0.8, 0, h + 0.05, 0);
  const capMesh = mergedMesh(capList, mats.marbleShade, false, true);
  if (capMesh) group.add(capMesh);

  return group;
}

export function createMeridianGate() {
  const group = new THREE.Group();
  const gateH = 16;
  const gateD = 40;
  const base = createArchedBase({
    w: 140,
    h: gateH,
    d: gateD,
    openings: [
      { x: -42, w: 16, spring: 6.4 },
      { x: 0, w: 22, spring: 7.2 },
      { x: 42, w: 16, spring: 6.4 },
    ],
  });
  group.add(base);

  const stairsL = createStairs({ width: 12, depth: 18, height: gateH, steps: 30 });
  stairsL.position.set(-52, 0, -gateD / 2);
  stairsL.rotation.y = Math.PI;
  group.add(stairsL);
  const stairsR = createStairs({ width: 12, depth: 18, height: gateH, steps: 30 });
  stairsR.position.set(52, 0, -gateD / 2);
  stairsR.rotation.y = Math.PI;
  group.add(stairsR);

  const hall = createHall({
    w: 64,
    d: 24,
    wallH: 6.4,
    roofH: 6.0,
    eave: 3.0,
    baseH: 1.1,
    baseExtra: 3,
    stairs: 0,
    doubleEave: true,
    upperRatio: 0.74,
    upperWallH: 5.0,
    upperRoofH: 5.6,
    lowerRoofH: 4.2,
    name: '午门',
    bays: 9,
    backDoors: false,
    beasts: true,
    plaqueWidth: 4.4,
  });
  hall.position.y = gateH + 0.1;
  group.add(hall);

  for (const sx of [-1, 1]) {
    const wing = createCorridor({
      length: 62,
      width: 12,
      wallH: 4.8,
      roofH: 4.4,
      eave: 1.9,
      bays: 12,
      baseH: 1.2,
    });
    wing.rotation.y = Math.PI / 2;
    wing.position.set(sx * 70, 0.1, gateD / 2 + 30);
    group.add(wing);

    const pavilion = createHall({
      w: 13,
      d: 13,
      wallH: 4.6,
      roofH: 4.8,
      eave: 2.2,
      baseH: 1.2,
      baseExtra: 1.6,
      stairs: 0,
      pyramid: true,
      bays: 3,
      railing: true,
      plaqueWidth: 2.2,
    });
    pavilion.position.set(sx * 70, 0.1, gateD / 2 + 64);
    group.add(pavilion);
  }

  return group;
}

export function createArchGate({
  w = 70,
  h = 12,
  d = 26,
  openings = [{ x: 0, w: 12, spring: 5.5 }],
  hall = {},
  name = '',
}) {
  const group = new THREE.Group();
  group.add(createArchedBase({ w, h, d, openings }));

  const st = createStairs({ width: 12, depth: 16, height: h, steps: 26 });
  st.position.set(-w * 0.3, 0, -d / 2);
  st.rotation.y = Math.PI;
  group.add(st);
  const st2 = createStairs({ width: 12, depth: 16, height: h, steps: 26 });
  st2.position.set(w * 0.3, 0, -d / 2);
  st2.rotation.y = Math.PI;
  group.add(st2);

  const hallGroup = createHall({
    w: hall.w || 42,
    d: hall.d || 18,
    wallH: hall.wallH || 6,
    roofH: hall.roofH || 6.5,
    eave: hall.eave || 2.8,
    baseH: 1.0,
    baseExtra: 2.4,
    stairs: 0,
    doubleEave: hall.doubleEave !== false,
    lowerRoofH: hall.lowerRoofH || 4.0,
    upperWallH: hall.upperWallH || 4.6,
    upperRoofH: hall.upperRoofH || 5.4,
    name,
    bays: hall.bays || 7,
    plaqueWidth: hall.plaqueWidth || 3.8,
  });
  hallGroup.position.y = h + 0.1;
  group.add(hallGroup);
  return group;
}

export function createShenwuGate() {
  return createArchGate({
    w: 96,
    h: 14,
    d: 28,
    openings: [
      { x: -22, w: 11, spring: 5.0 },
      { x: 0, w: 14, spring: 5.8 },
      { x: 22, w: 11, spring: 5.0 },
    ],
    hall: { w: 64, d: 20, wallH: 6, roofH: 6.4, eave: 3, bays: 9 },
    name: '神武门',
  });
}

export function createSideGate(name) {
  return createArchGate({
    w: 48,
    h: 12,
    d: 26,
    openings: [{ x: 0, w: 12, spring: 5.2 }],
    hall: {
      w: 32,
      d: 16,
      wallH: 5.2,
      roofH: 5.4,
      eave: 2.5,
      bays: 5,
      doubleEave: false,
      plaqueWidth: 2.8,
    },
    name,
  });
}

function towerFinial(group, y) {
  const gold = [];
  addCylinder(gold, 0.55, 0.7, 0.4, 10, 0, y + 0.2, 0);
  const ball = new THREE.SphereGeometry(0.48, 10, 8);
  ball.translate(0, y + 0.8, 0);
  gold.push(ball);
  addCylinder(gold, 0.14, 0.2, 1.3, 6, 0, y + 1.65, 0);
  const tip = new THREE.ConeGeometry(0.24, 0.6, 8);
  tip.translate(0, y + 2.5, 0);
  gold.push(tip);
  const mesh = mergedMesh(gold, mats.gold, true, false);
  if (mesh) group.add(mesh);
}

export function createCornerTower() {
  const group = new THREE.Group();
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(25, 1.2, 25), mats.marble);
  plinth.position.y = 0.6;
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  group.add(plinth);

  const bodies = [
    { w: 18, h: 5.2, y: 1.2 },
    { w: 12.5, h: 4.0, y: 8.5 },
    { w: 7.5, h: 2.6, y: 14.6 },
  ];
  for (const b of bodies) {
    const body = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.w), mats.wall);
    body.position.y = b.y + b.h / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);
    const band = new THREE.Mesh(new THREE.BoxGeometry(b.w + 0.5, 0.7, b.w + 0.5), mats.frieze);
    band.position.y = b.y + b.h - 0.25;
    band.castShadow = true;
    group.add(band);
    const geo = new THREE.PlaneGeometry(1, 1);
    for (const [dx, dz, ry] of [
      [0, b.w / 2 + 0.03, 0],
      [0, -b.w / 2 - 0.03, Math.PI],
      [b.w / 2 + 0.03, 0, Math.PI / 2],
      [-b.w / 2 - 0.03, 0, -Math.PI / 2],
    ]) {
      const win = new THREE.Mesh(geo, mats.lattice);
      win.position.set(dx, b.y + b.h * 0.48, dz);
      win.scale.set(b.w * 0.56, b.h * 0.58, 1);
      win.rotation.y = ry;
      group.add(win);
    }
  }

  const skirt1 = createSkirtRoof({
    outerW: 25,
    outerD: 25,
    innerW: 13,
    innerD: 13,
    height: 3.6,
    cornerLift: 1.5,
    curve: 1.48,
  });
  skirt1.position.y = 6.4;
  group.add(skirt1);

  const skirt2 = createSkirtRoof({
    outerW: 18.5,
    outerD: 18.5,
    innerW: 8.2,
    innerD: 8.2,
    height: 2.9,
    cornerLift: 1.2,
    curve: 1.5,
  });
  skirt2.position.y = 12.5;
  group.add(skirt2);

  const rail = createBalustrade({ w: 14.8, d: 14.8, spacing: 2.2, height: 1.05, gapFront: 0 });
  rail.position.y = 10.0;
  group.add(rail);

  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const lantern = createHangingLantern(0.9);
      lantern.position.set(sx * 10.2, 7.9, sz * 10.2);
      group.add(lantern);
    }
  }

  const topRoof = createRoof({
    width: 11.5,
    depth: 11.5,
    height: 4.2,
    cornerLift: 1.1,
    curve: 1.55,
    ridgeRatio: 0,
    hasRidge: false,
    beasts: false,
  });
  topRoof.position.y = 17.2;
  group.add(topRoof);
  towerFinial(group, 17.2 + 4.2);

  return group;
}

export function createWall({ length, height = 10, thickness = 6, axis = 'x' }) {
  const group = new THREE.Group();
  const w = axis === 'x' ? length : thickness;
  const d = axis === 'x' ? thickness : length;
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, height, d), mats.wall);
  body.position.y = height / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const coping = new THREE.Mesh(new THREE.BoxGeometry(w + 0.9, 0.9, d + 0.9), mats.roofDark);
  coping.position.y = height + 0.1;
  coping.castShadow = true;
  group.add(coping);

  const merlons = [];
  const step = 3.4;
  const along = length;
  for (let p = -along / 2 + 1.8; p <= along / 2 - 1.2; p += step) {
    for (const s of [-1, 1]) {
      const off = s * (thickness / 2 - 0.5);
      if (axis === 'x') {
        addBox(merlons, 1.8, 1.2, 0.8, p, height + 1.0, off);
      } else {
        addBox(merlons, 0.8, 1.2, 1.8, off, height + 1.0, p);
      }
    }
  }
  const mm = mergedMesh(merlons, mats.wallDark, true, true);
  if (mm) group.add(mm);
  return group;
}

export function createBridge({ width = 9, span = 32, rise = 1.6, segments = 14 }) {
  const group = new THREE.Group();
  const deck = [];
  const railList = [];
  const segLen = span / segments;
  const curveY = (t) => 0.55 + rise * Math.cos((t * Math.PI) / 2);
  const posts = [];
  for (let i = 0; i < segments; i++) {
    const t0 = -1 + (2 * i) / segments;
    const t1 = -1 + (2 * (i + 1)) / segments;
    const z0 = (t0 * span) / 2;
    const z1 = (t1 * span) / 2;
    const y0 = curveY(t0);
    const y1 = curveY(t1);
    const slope = (y1 - y0) / (z1 - z0);
    const g = new THREE.BoxGeometry(width, 0.42, segLen * 1.03);
    g.rotateX(-Math.atan(slope));
    g.translate(0, (y0 + y1) / 2, (z0 + z1) / 2);
    deck.push(g);
  }
  const deckMesh = mergedMesh(deck, mats.marble, true, true);
  if (deckMesh) group.add(deckMesh);

  const postGeo = new THREE.BoxGeometry(0.3, 1.15, 0.3);
  const capGeo = new THREE.SphereGeometry(0.18, 6, 5);
  for (const sx of [-1, 1]) {
    const x = sx * (width / 2 - 0.15);
    const n = 9;
    for (let i = 0; i <= n; i++) {
      const t = -1 + (2 * i) / n;
      const z = (t * span) / 2;
      const y = curveY(t);
      const post = postGeo.clone();
      post.translate(x, y + 0.57, z);
      railList.push(post);
      const cap = capGeo.clone();
      cap.translate(x, y + 1.2, z);
      railList.push(cap);
      if (i < n) {
        const t2 = -1 + (2 * (i + 1)) / n;
        const z2 = (t2 * span) / 2;
        const y2 = curveY(t2);
        addBar(railList, x, z, x, z2, (y + y2) / 2 + 1.12, 0.16, 0.26);
        addBar(railList, x, z, x, z2, (y + y2) / 2 + 0.5, 0.55, 0.12);
      }
    }
  }
  const railMesh = mergedMesh(railList, mats.marble, true, true);
  if (railMesh) group.add(railMesh);

  for (const sz of [-1, 1]) {
    const abut = new THREE.Mesh(new THREE.BoxGeometry(width + 1.2, 0.8, 3.0), mats.marbleShade);
    abut.position.set(0, 0.3, (sz * (span + 2.4)) / 2);
    abut.castShadow = true;
    abut.receiveShadow = true;
    group.add(abut);
  }

  return group;
}
