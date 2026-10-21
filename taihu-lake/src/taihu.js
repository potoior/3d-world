import * as THREE from 'three';
import { mats, makeWaterMaterial, getPlaqueMaterial } from './materials.js';
import { mergeStaticGroup, mergedMesh } from './geometry.js';
import { createPavilion, createHexPavilion } from './gardenBuild.js';
import { createPeachTree, createHill } from './westlakeDetails.js';
import { createWillow, createShrub } from './gardenDetails.js';

const CACHE = new Map();
function mat(color, rough = 0.95, metal = 0) {
  const k = color + ':' + rough + ':' + metal;
  if (!CACHE.has(k)) CACHE.set(k, new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal }));
  return CACHE.get(k);
}
function add(g, geo, m, x = 0, y = 0, z = 0, ry = 0) {
  const o = new THREE.Mesh(geo, m);
  o.position.set(x, y, z);
  o.rotation.y = ry;
  o.castShadow = true;
  o.receiveShadow = true;
  g.add(o);
  return o;
}
function box(g, w, h, d, m, x, y, z, ry = 0) {
  return add(g, new THREE.BoxGeometry(w, h, d), m, x, y, z, ry);
}
function cylinder(g, rt, rb, h, seg, m, x, y, z, ry = 0) {
  return add(g, new THREE.CylinderGeometry(rt, rb, h, seg), m, x, y, z, ry);
}
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a * 1664525 + 1013904223) >>> 0;
    return a / 4294967296;
  };
}

function shapeFrom(points) {
  const shape = new THREE.Shape();
  points.forEach(([x, z], i) => {
    if (i === 0) shape.moveTo(x, -z);
    else shape.lineTo(x, -z);
  });
  shape.closePath();
  return shape;
}
function landMass(points, height, material) {
  const geo = new THREE.ExtrudeGeometry(shapeFrom(points), {
    depth: height,
    bevelEnabled: false,
    curveSegments: 1,
  });
  geo.rotateX(-Math.PI / 2);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
function landCap(points, height, material) {
  const geo = new THREE.ShapeGeometry(shapeFrom(points), 1);
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.y = height + 0.025;
  mesh.receiveShadow = true;
  return mesh;
}
function pathStrip(g, points, width, y, material) {
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    box(g, width, 0.18, len + 1.2, material, (a[0] + b[0]) / 2, y + 0.09, (a[1] + b[1]) / 2, Math.atan2(b[0] - a[0], b[1] - a[1]));
  }
}

const HEADLAND = [
  [-780, 545], [-700, 462], [-622, 408], [-544, 352], [-470, 304], [-400, 258],
  [-332, 214], [-268, 178], [-210, 146], [-158, 116], [-116, 86], [-83, 58],
  [-58, 34], [-45, 13], [-31, 17], [-24, 39], [-37, 74], [-58, 108],
  [-88, 141], [-128, 174], [-176, 208], [-230, 240], [-290, 274], [-354, 312],
  [-422, 354], [-494, 400], [-570, 450], [-650, 504], [-730, 562], [-780, 590],
];
const HEADLAND_TOP = 3.7;
const HEADLAND_PATH = [
  [-748, 548], [-690, 485], [-628, 434], [-562, 388], [-500, 348], [-438, 311],
  [-378, 276], [-320, 245], [-264, 216], [-212, 188], [-166, 160], [-126, 132],
  [-94, 106], [-70, 82], [-54, 58], [-46, 34],
];

const ISLANDS = [
  { x: 150, z: -172, rx: 58, rz: 46, h: 3.4 },
  { x: 246, z: -231, rx: 45, rz: 35, h: 2.8 },
  { x: 61, z: -235, rx: 41, rz: 33, h: 2.7 },
];
const TIP_ISLET = { x: 40, z: -10, rx: 27, rz: 20, h: 3.5 };

function islet(g, x, z, rx, rz, h, grassMat = mats.grass) {
  const bank = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.12, h + 1.4, 34), mats.stone);
  bank.scale.set(rx, 1, rz);
  bank.position.set(x, (h - 1.4) / 2, z);
  bank.castShadow = true;
  bank.receiveShadow = true;
  g.add(bank);
  const top = new THREE.Mesh(new THREE.CircleGeometry(1, 36), grassMat);
  top.rotation.x = -Math.PI / 2;
  top.scale.set(rx * 0.985, rz * 0.985, 1);
  top.position.set(x, h, z);
  top.receiveShadow = true;
  g.add(top);
  const r = rng(Math.round(x * 7 + z * 13) + 9);
  for (let i = 0; i < 22; i++) {
    const a = r() * Math.PI * 2;
    const s = 0.9 + r() * 1.9;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), mats.rock);
    rock.position.set(x + Math.cos(a) * rx * (0.94 + r() * 0.1), h * 0.25 + r() * 0.45, z + Math.sin(a) * rz * (0.94 + r() * 0.1));
    rock.scale.set(1.2, 0.75 + r() * 0.5, 0.9);
    rock.rotation.set(r() * 2, r() * 3, r() * 2);
    rock.castShadow = true;
    rock.receiveShadow = true;
    g.add(rock);
  }
}

function boulderLine(g, points, topY, seed, count = 90) {
  const r = rng(seed);
  let total = 0;
  const segs = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    segs.push(len);
    total += len;
  }
  for (let i = 0; i < count; i++) {
    let d = r() * total;
    let k = 0;
    while (k < segs.length - 1 && d > segs[k]) {
      d -= segs[k];
      k++;
    }
    const a = points[k];
    const b = points[k + 1] || points[k];
    const t = Math.min(1, d / Math.max(0.01, segs[k]));
    const x = a[0] + (b[0] - a[0]) * t;
    const z = a[1] + (b[1] - a[1]) * t;
    const s = 0.7 + r() * 1.7;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), r() > 0.55 ? mats.rock : mats.rockMoss);
    rock.position.set(x, topY - 0.3 + r() * 0.35, z);
    rock.scale.set(1.1 + r() * 0.7, 0.65 + r() * 0.5, 0.9 + r() * 0.5);
    rock.rotation.set(r() * 2.4, r() * 3.2, r() * 2.4);
    rock.castShadow = true;
    rock.receiveShadow = true;
    g.add(rock);
  }
}

function taihuStone(g, x, y, z, s, seed, material = mats.rock) {
  const r = rng(seed);
  const root = new THREE.Group();
  root.position.set(x, y, z);
  const lumps = 4 + Math.floor(r() * 4);
  for (let i = 0; i < lumps; i++) {
    const rr = s * (0.38 + r() * 0.5);
    const geo = new THREE.IcosahedronGeometry(rr, 1);
    geo.scale(0.8 + r() * 0.7, 1.0 + r() * 1.2, 0.7 + r() * 0.7);
    const m = new THREE.Mesh(geo, i % 4 === 3 ? mat(0x6f7268, 0.99) : material);
    m.position.set((r() - 0.5) * s * 0.9, s * 0.35 + r() * s * 1.35, (r() - 0.5) * s * 0.9);
    m.rotation.set(r() * 3, r() * 3, r() * 3);
    m.castShadow = true;
    m.receiveShadow = true;
    root.add(m);
  }
  for (let i = 0; i < 2 + Math.floor(r() * 3); i++) {
    const hole = new THREE.Mesh(new THREE.TorusGeometry(s * (0.16 + r() * 0.2), s * 0.07, 5, 10), mat(0x555b54, 0.99));
    hole.position.set((r() - 0.5) * s * 0.9, s * (0.55 + r() * 1.1), s * (0.25 + r() * 0.15));
    hole.rotation.set(r() * 3, r() * 3, r() * 3);
    hole.castShadow = true;
    root.add(hole);
  }
  g.add(root);
  return root;
}

function archBridge(p1, p2, options = {}) {
  const width = options.width || 6.4;
  const rise = options.rise || 0.9;
  const arches = options.arches || 3;
  const deck = options.deck || 4.35;
  const g = new THREE.Group();
  const dx = p2[0] - p1[0];
  const dz = p2[1] - p1[1];
  const span = Math.hypot(dx, dz);
  g.position.set((p1[0] + p2[0]) / 2, 0, (p1[1] + p2[1]) / 2);
  g.rotation.y = Math.atan2(dx, dz);
  const segs = 26;
  for (let i = 0; i < segs; i++) {
    const t0 = -1 + (2 * i) / segs;
    const t1 = -1 + (2 * (i + 1)) / segs;
    const z0 = (t0 * span) / 2;
    const z1 = (t1 * span) / 2;
    const y0 = deck + Math.cos(t0 * Math.PI * 0.5) * rise;
    const y1 = deck + Math.cos(t1 * Math.PI * 0.5) * rise;
    const slab = new THREE.BoxGeometry(width, 0.38, Math.abs(z1 - z0) * 1.08);
    slab.rotateX(-Math.atan2(y1 - y0, z1 - z0));
    slab.translate(0, (y0 + y1) / 2, (z0 + z1) / 2);
    add(g, slab, mats.causeway);
    for (const side of [-1, 1]) {
      box(g, 0.22, 0.85, 0.22, mats.stone, side * (width / 2 - 0.1), (y0 + y1) / 2 + 0.55, (z0 + z1) / 2);
      box(g, 0.14, 0.14, Math.abs(z1 - z0) * 1.05, mats.stone, side * (width / 2 - 0.1), (y0 + y1) / 2 + 0.98, (z0 + z1) / 2);
    }
  }
  for (const side of [-1, 1]) {
    box(g, 0.3, 0.65, span * 0.98, mats.stone, side * (width / 2 + 0.06), deck + rise * 0.62 - 0.18, 0);
  }
  const bay = span / arches;
  for (let i = 0; i < arches; i++) {
    const cz = -span / 2 + bay * (i + 0.5);
    const radius = Math.min(bay * 0.42, deck - 0.65);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.26, 6, 18, Math.PI), mats.stone);
    ring.rotation.y = Math.PI / 2;
    ring.position.set(0, 0.55, cz);
    ring.castShadow = true;
    ring.receiveShadow = true;
    g.add(ring);
    if (i > 0) {
      box(g, width * 0.94, deck * 0.82, bay * 0.19, mats.stone, 0, deck * 0.41, -span / 2 + bay * i);
    }
  }
  for (const end of [-1, 1]) {
    for (let k = 0; k < 4; k++) {
      box(g, width * 0.92, 0.3, 1.1, mats.causeway, 0, deck - 0.3 - k * 0.32, end * (span / 2 + 0.45 + k * 0.9));
    }
  }
  return g;
}

function pagoda(x, y, z, scale = 1) {
  const g = new THREE.Group();
  cylinder(g, 5.4, 6.4, 1.2, 8, mats.marbleShade, 0, 0.6, 0);
  cylinder(g, 4.6, 5.0, 0.5, 8, mats.stone, 0, 1.4, 0);
  let cy = 1.7;
  const radii = [3.5, 3.15, 2.8, 2.45, 2.15];
  radii.forEach((rad, i) => {
    const h = 3.0 - i * 0.15;
    cylinder(g, rad, rad + 0.18, h, 8, mats.wall, 0, cy + h / 2, 0);
    cylinder(g, rad + 0.45, rad + 0.55, 0.28, 8, mats.wallDark, 0, cy + h * 0.55, 0);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
      box(g, 0.55, h * 0.5, 0.12, mats.wood, Math.cos(a) * (rad + 0.06), cy + h * 0.46, Math.sin(a) * (rad + 0.06), -a);
    }
    const roof = new THREE.Mesh(new THREE.ConeGeometry(rad + 1.75, 1.75, 8), mats.roofDark);
    roof.position.set(0, cy + h + 0.55, 0);
    roof.rotation.y = Math.PI / 8;
    roof.castShadow = true;
    g.add(roof);
    const eave = new THREE.Mesh(new THREE.TorusGeometry(rad + 1.55, 0.12, 5, 8), mats.roofDark);
    eave.rotation.x = Math.PI / 2;
    eave.rotation.z = Math.PI / 8;
    eave.position.set(0, cy + h + 0.08, 0);
    g.add(eave);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 7, 5), mats.lanternRed);
      bulb.position.set(Math.cos(a) * (rad + 1.15), cy + h - 0.28, Math.sin(a) * (rad + 1.15));
      g.add(bulb);
    }
    cy += h + 0.92;
  });
  cylinder(g, 0.16, 0.42, 4.1, 8, mats.copper, 0, cy + 1.8, 0);
  for (let i = 0; i < 5; i++) {
    cylinder(g, 0.85 - i * 0.12, 0.85 - i * 0.12, 0.12, 8, mats.copper, 0, cy + 0.9 + i * 0.35, 0);
  }
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.36, 10, 8), mats.boatGold);
  ball.position.set(0, cy + 3.55, 0);
  g.add(ball);
  g.position.set(x, y, z);
  g.scale.setScalar(scale);
  return g;
}

function lighthouse(x, y, z) {
  const g = new THREE.Group();
  const white = mat(0xf1eee2, 0.72);
  const red = mat(0xa8443a, 0.72);
  const glass = new THREE.MeshStandardMaterial({
    color: 0xfff1bf,
    roughness: 0.25,
    metalness: 0.05,
    emissive: 0xffce72,
    emissiveIntensity: 1.15,
  });
  cylinder(g, 7.2, 8.2, 1.8, 12, mats.rock, 0, 0.9, 0);
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.8, 1.2, 10), mats.stone);
  plinth.position.y = 2.1;
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  g.add(plinth);
  cylinder(g, 1.75, 2.85, 15.2, 16, white, 0, 10.3, 0);
  for (const [yy, rr] of [[5.0, 2.72], [9.9, 2.31], [14.4, 1.94]]) {
    cylinder(g, rr, rr + 0.12, 0.95, 16, red, 0, yy, 0);
  }
  const gallery = new THREE.Mesh(new THREE.CylinderGeometry(2.95, 2.85, 0.42, 18), mats.stone);
  gallery.position.y = 18.1;
  gallery.castShadow = true;
  g.add(gallery);
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    cylinder(g, 0.035, 0.035, 1.0, 4, mats.wallDark, Math.cos(a) * 2.85, 18.8, Math.sin(a) * 2.85);
  }
  const topRail = new THREE.Mesh(new THREE.TorusGeometry(2.85, 0.045, 4, 30), mats.wallDark);
  topRail.rotation.x = Math.PI / 2;
  topRail.position.y = 19.3;
  g.add(topRail);
  cylinder(g, 1.65, 1.8, 2.6, 12, glass, 0, 19.5, 0);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    box(g, 0.08, 2.55, 0.16, mats.wallDark, Math.cos(a) * 1.7, 19.5, Math.sin(a) * 1.7, -a);
  }
  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.5, 2.0, 12), red);
  roof.position.y = 21.8;
  roof.castShadow = true;
  g.add(roof);
  cylinder(g, 0.09, 0.12, 1.8, 6, mats.copper, 0, 23.6, 0);
  const finial = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), mats.boatGold);
  finial.position.y = 24.5;
  g.add(finial);
  for (const side of [-1, 1]) {
    box(g, 0.9, 1.2, 0.12, mats.wood, side * 2.05, 9.3, 1.65, -0.3);
  }
  cylinder(g, 0.34, 0.4, 2.0, 6, mats.wood, 2.3, 3.2, 2.0);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 0.72), getPlaqueMaterial('鼋头渚灯塔'));
  sign.position.set(0, 4.0, 4.55);
  g.add(sign);
  g.position.set(x, y, z);
  return { group: g, glass };
}

function makeSail(w, h, color) {
  const geo = new THREE.PlaneGeometry(w, h, 4, 5);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const px = pos.getX(i);
    const py = pos.getY(i);
    const u = px / w + 0.5;
    const v = py / h + 0.5;
    pos.setZ(i, Math.sin(u * Math.PI) * 0.55 + Math.sin(v * Math.PI) * 0.14);
  }
  geo.computeVertexNormals();
  const sail = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    color, roughness: 0.92, side: THREE.DoubleSide,
  }));
  sail.castShadow = true;
  const group = new THREE.Group();
  group.add(sail);
  for (let i = 1; i < 4; i++) {
    box(group, w * 0.9, 0.07, 0.07, mats.wood, 0, -h / 2 + (h * i) / 4, 0.28);
  }
  group.rotation.y = Math.PI / 2;
  return group;
}

function fishingBoat(sailColor) {
  const g = new THREE.Group();
  const hull = mat(0x5d432e, 0.88);
  const hullDark = mat(0x3d2d20, 0.9);
  box(g, 8.0, 0.9, 2.7, hull, 0, 0.55, 0);
  box(g, 8.6, 0.28, 3.0, mat(0x9b7a4f, 0.85), 0, 1.02, 0);
  box(g, 6.6, 0.45, 2.25, hullDark, 0, 0.15, 0);
  const bow = new THREE.Mesh(new THREE.ConeGeometry(1.35, 2.4, 4), hull);
  bow.rotation.z = -Math.PI / 2;
  bow.rotation.x = Math.PI / 4;
  bow.position.set(4.6, 0.55, 0);
  bow.scale.set(1, 1, 0.78);
  bow.castShadow = true;
  g.add(bow);
  box(g, 2.4, 1.15, 1.9, mat(0x8a6a45, 0.9), -1.7, 1.65, 0);
  box(g, 2.9, 0.18, 2.25, mats.roofDark, -1.7, 2.28, 0);
  for (const side of [-1, 1]) {
    box(g, 2.3, 0.42, 0.1, mat(0x3a2b1c, 0.9), -1.7, 1.8, side * 0.96);
  }
  cylinder(g, 0.09, 0.13, 8.8, 6, mats.wood, 0.7, 5.35, 0);
  const sail = makeSail(4.6, 6.2, sailColor);
  sail.position.set(0.7, 6.5, 0.1);
  g.add(sail);
  const pennant = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial({
    color: 0xa83c2e, side: THREE.DoubleSide, roughness: 0.85,
  }));
  pennant.geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1.4, -0.24, 0, 1.25, -0.72, 0], 3));
  pennant.geometry.computeVertexNormals();
  pennant.position.set(0.7, 9.65, 0);
  g.add(pennant);
  for (const side of [-1, 1]) {
    box(g, 0.12, 0.12, 3.1, mats.wood, -3.5, 0.95, side * 1.6, 0.25);
    const oar = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.13, 4.3), mats.wood);
    oar.position.set(-3.2, 0.55, side * 2.0);
    oar.rotation.y = side * 0.45;
    oar.castShadow = true;
    g.add(oar);
  }
  const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 6), mats.lanternRed);
  lantern.position.set(-3.2, 2.45, 0);
  g.add(lantern);
  g.userData.lantern = lantern;
  return g;
}

function makeBird() {
  const g = new THREE.Group();
  const white = new THREE.MeshStandardMaterial({ color: 0xf3f0e4, roughness: 0.8, side: THREE.DoubleSide });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 6), white);
  body.scale.set(0.65, 0.55, 2.0);
  body.castShadow = true;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 7, 5), white);
  head.position.set(0, 0.06, 0.48);
  g.add(head);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.28, 5), mat(0xc9a45b, 0.8));
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, 0.04, 0.7);
  g.add(beak);
  const left = new THREE.Group();
  const right = new THREE.Group();
  for (const root of [left, right]) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.035, 0.34), white);
    wing.position.x = 0.62;
    wing.castShadow = true;
    root.add(wing);
    g.add(root);
  }
  right.rotation.z = Math.PI;
  return { group: g, left, right };
}

function radialTexture(stops) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  stops.forEach(([p, color]) => grad.addColorStop(p, color));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function archway(g, x, y, z, rot, text) {
  const p = new THREE.Group();
  p.position.set(x, y, z);
  p.rotation.y = rot;
  for (const side of [-1, 1]) {
    cylinder(p, 0.3, 0.4, 4.7, 8, mats.wallDark, side * 2.75, 2.35, 0);
    cylinder(p, 0.5, 0.55, 0.35, 8, mats.stone, side * 2.75, 0.17, 0);
  }
  box(p, 6.7, 0.38, 0.62, mats.wallDark, 0, 4.72, 0);
  box(p, 5.0, 1.02, 0.5, mats.wood, 0, 5.43, 0);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(4.1, 1.25, 4), mats.roofDark);
  roof.position.set(0, 6.28, 0);
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  p.add(roof);
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 0.78), getPlaqueMaterial(text));
  plaque.position.set(0, 5.43, 0.27);
  p.add(plaque);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.2, 7, 5), mats.lanternRed);
  bulb.position.set(0, 4.35, 0);
  p.add(bulb);
  g.add(p);
}

function reedField(g, count, seed) {
  const r = rng(seed);
  const stems = [];
  const plumes = [];
  const edges = [HEADLAND.slice(0, 15), HEADLAND.slice(15).reverse()];
  for (let i = 0; i < count; i++) {
    const points = edges[i % 2];
    const k = Math.floor(r() * (points.length - 1));
    const a = points[k];
    const b = points[k + 1];
    const t = r();
    const x = a[0] + (b[0] - a[0]) * t;
    const z = a[1] + (b[1] - a[1]) * t;
    const tx = b[0] - a[0];
    const tz = b[1] - a[1];
    const len = Math.hypot(tx, tz) || 1;
    const side = i % 2 === 0 ? 1 : -1;
    const off = 1.5 + r() * 5.5;
    const px = x + (-tz / len) * off * side;
    const pz = z + (tx / len) * off * side;
    const h = 1.3 + r() * 1.65;
    const stem = new THREE.CylinderGeometry(0.025, 0.06, h, 4);
    stem.rotateZ((r() - 0.5) * 0.24);
    stem.translate(px, h / 2 + 0.12, pz);
    stems.push(stem);
    const plume = new THREE.ConeGeometry(0.1 + r() * 0.07, 0.52 + r() * 0.32, 4);
    plume.rotateZ((r() - 0.5) * 0.3);
    plume.translate(px, h + 0.2, pz);
    plumes.push(plume);
  }
  const sm = mergedMesh(stems, mat(0x6f8750, 0.96), true, false);
  const pm = mergedMesh(plumes, mat(0xb6a978, 0.9), true, false);
  if (sm) g.add(sm);
  if (pm) g.add(pm);
}

function mistPatch(dynamic, texture, x, z, y, sx, sz, opacity, speed, phase) {
  const mat = new THREE.MeshBasicMaterial({
    map: texture,
    color: 0xe0ebe5,
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, y, z);
  mesh.renderOrder = 3;
  dynamic.add(mesh);
  return { mesh, baseX: x, speed, phase };
}

export function buildTaihuScene() {
  const root = new THREE.Group();
  const staticRoot = new THREE.Group();
  const dynamic = new THREE.Group();
  root.add(dynamic);
  const stats = {
    islands: 3,
    cherryTrees: 0,
    willows: 0,
    boats: 0,
    birds: 0,
    reeds: 0,
    stones: 0,
    bridges: 0,
    pavilions: 0,
  };

  mats.peach.color.set(0xe89aa6);
  mats.peachDeep.color.set(0xd98696);
  const waterMaterial = makeWaterMaterial();
  waterMaterial.uniforms.uDeep.value.set(0x24524d);
  waterMaterial.uniforms.uShallow.value.set(0x6f9a7c);
  waterMaterial.uniforms.uSky.value.set(0xc9d9cf);

  const lakeBed = new THREE.Mesh(new THREE.PlaneGeometry(2300, 2100), mat(0x4d5844, 1));
  lakeBed.rotation.x = -Math.PI / 2;
  lakeBed.position.set(0, -2.6, -120);
  lakeBed.receiveShadow = true;
  staticRoot.add(lakeBed);

  const lakeGeo = new THREE.PlaneGeometry(2100, 1900, 96, 72);
  lakeGeo.rotateX(-Math.PI / 2);
  const lake = new THREE.Mesh(lakeGeo, waterMaterial);
  lake.position.set(0, 0.12, -120);
  lake.renderOrder = 1;
  root.add(lake);

  const landMat = mat(0x6c7b52, 1);
  staticRoot.add(landMass(HEADLAND, HEADLAND_TOP, landMat));
  staticRoot.add(landCap(HEADLAND, HEADLAND_TOP, mats.grass));
  boulderLine(staticRoot, HEADLAND, HEADLAND_TOP, 41, 130);

  const center = [];
  for (let i = 0; i < 15; i++) {
    const a = HEADLAND[i];
    const b = HEADLAND[15 + (14 - i)];
    center.push([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]);
  }
  pathStrip(staticRoot, center, 7.2, HEADLAND_TOP, mats.path);
  for (let i = 1; i < 13; i += 2) {
    const p = center[i];
    for (const side of [-1, 1]) {
      const lantern = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 1.1, 6), mats.stone);
      lantern.position.set(p[0] + side * 4.4, HEADLAND_TOP + 0.65, p[1]);
      staticRoot.add(lantern);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.3, 4), mats.roofDark);
      cap.position.set(p[0] + side * 4.4, HEADLAND_TOP + 1.3, p[1]);
      staticRoot.add(cap);
    }
  }

  const treeSpots = [];
  for (let i = 2; i < 13; i++) {
    const p = center[i];
    const q = center[i + 1] || center[i];
    const tx = q[0] - p[0];
    const tz = q[1] - p[1];
    const len = Math.hypot(tx, tz) || 1;
    for (const side of [-1, 1]) {
      if ((i + (side > 0 ? 1 : 0)) % 3 === 0) continue;
      const off = 10 + (i % 4) * 2.2;
      treeSpots.push([p[0] + (-tz / len) * off * side, p[1] + (tx / len) * off * side, 0.72 + (i % 3) * 0.1]);
    }
  }
  treeSpots.push([-530, 330, 0.9], [-476, 300, 1.05], [-422, 286, 0.82], [-374, 257, 1.0], [-318, 236, 0.8], [-262, 198, 0.95], [-236, 218, 0.86], [-196, 174, 0.78], [-178, 156, 0.9], [-156, 142, 0.84], [-136, 122, 0.92], [-112, 104, 0.8], [-92, 86, 0.86], [-214, 202, 0.96], [-190, 186, 0.88], [-166, 172, 1.02], [-142, 154, 0.86], [-118, 138, 0.94], [-96, 120, 0.88], [-78, 100, 0.82]);
  treeSpots.forEach(([x, z, s], i) => {
    const tree = createPeachTree({ height: 5.8 + (i % 4) * 0.7, spread: 2.0 + (i % 3) * 0.28, seed: 220 + i });
    tree.position.set(x, HEADLAND_TOP, z);
    tree.scale.setScalar(s);
    staticRoot.add(tree);
    stats.cherryTrees++;
  });
  for (const [x, z, s, seed] of [[-158, 118, 1.0, 320], [-206, 168, 0.9, 321], [-276, 214, 0.95, 322], [-108, 90, 0.8, 323], [-336, 246, 0.85, 324]]) {
    const tree = createWillow({ height: 6.8, spread: 2.5, seed });
    tree.position.set(x, HEADLAND_TOP, z);
    tree.scale.setScalar(s);
    staticRoot.add(tree);
    stats.willows++;
  }
  for (const [x, z, r, seed] of [[-456, 330, 2.2, 11], [-308, 260, 1.9, 12], [-232, 214, 2.0, 13], [-148, 146, 1.8, 14], [-512, 372, 2.0, 15]]) {
    const shrub = createShrub({ radius: r, height: 1.4 + (seed % 3) * 0.3, seed });
    shrub.position.set(x, HEADLAND_TOP, z);
    staticRoot.add(shrub);
  }

  for (const [x, z, s, seed] of [[-115, 126, 2.7, 61], [-84, 91, 2.1, 62], [-176, 158, 2.4, 63], [-244, 218, 2.0, 64], [-386, 288, 2.2, 65], [-52, 40, 1.9, 66], [-318, 250, 1.7, 67]]) {
    taihuStone(staticRoot, x, HEADLAND_TOP, z, s, seed);
    stats.stones++;
  }

  const hall = createPavilion({
    w: 17, d: 10.5, wallH: 3.5, roofH: 3.5, eave: 2.2, baseH: 0.85,
    bays: 4, name: '澄澜堂', open: true, rail: true,
  });
  hall.position.set(-360, HEADLAND_TOP, 274);
  hall.rotation.y = 0.7;
  staticRoot.add(hall);
  stats.pavilions++;

  const lakeside = createHexPavilion({ radius: 3.5, wallH: 2.7, roofH: 3.0, baseH: 0.55, name: '长春亭' });
  lakeside.position.set(-220, HEADLAND_TOP, 193);
  lakeside.rotation.y = 0.35;
  staticRoot.add(lakeside);
  stats.pavilions++;

  const lookout = createHexPavilion({ radius: 2.8, wallH: 2.5, roofH: 2.7, baseH: 0.5, name: '澄碧亭' });
  lookout.position.set(-92, HEADLAND_TOP, 122);
  staticRoot.add(lookout);
  stats.pavilions++;

  archway(staticRoot, -448, HEADLAND_TOP, 328, 0.55, '太湖佳绝处');
  archway(staticRoot, -669, HEADLAND_TOP, 481, 0.55, '鼋头渚');

  const light = lighthouse(-42, HEADLAND_TOP, 27);
  staticRoot.add(light.group);

  reedField(staticRoot, 340, 77);
  stats.reeds = 340;

  islet(staticRoot, TIP_ISLET.x, TIP_ISLET.z, TIP_ISLET.rx, TIP_ISLET.rz, TIP_ISLET.h);
  const tipPav = createHexPavilion({ radius: 3.1, wallH: 2.5, roofH: 2.8, baseH: 0.5, name: '会仙亭' });
  tipPav.position.set(TIP_ISLET.x + 3, TIP_ISLET.h, TIP_ISLET.z - 2);
  staticRoot.add(tipPav);
  stats.pavilions++;
  const tipTree = createPeachTree({ height: 5.2, spread: 2.0, seed: 810 });
  tipTree.position.set(TIP_ISLET.x - 10, TIP_ISLET.h, TIP_ISLET.z + 4);
  staticRoot.add(tipTree);
  stats.cherryTrees++;
  taihuStone(staticRoot, TIP_ISLET.x - 12, TIP_ISLET.h, TIP_ISLET.z - 8, 1.8, 811);
  stats.stones++;

  ISLANDS.forEach((s, i) => {
    islet(staticRoot, s.x, s.z, s.rx, s.rz, s.h);
    if (i === 0) {
      staticRoot.add(pagoda(s.x, s.h, s.z, 0.95));
      const tree = createPeachTree({ height: 5.4, spread: 2.1, seed: 820 });
      tree.position.set(s.x - 30, s.h, s.z + 15);
      staticRoot.add(tree);
      stats.cherryTrees++;
      taihuStone(staticRoot, s.x + 26, s.h, s.z + 12, 2.2, 821);
      stats.stones++;
    } else if (i === 1) {
      const pav = createHexPavilion({ radius: 3.0, wallH: 2.5, roofH: 2.7, baseH: 0.5, name: '仙岛亭' });
      pav.position.set(s.x, s.h, s.z);
      pav.rotation.y = 1.1;
      staticRoot.add(pav);
      stats.pavilions++;
      const tree = createWillow({ height: 6.2, spread: 2.3, seed: 831 });
      tree.position.set(s.x - 16, s.h, s.z + 6);
      staticRoot.add(tree);
      stats.willows++;
    } else {
      const pav = createPavilion({
        w: 8.5, d: 6.5, wallH: 2.8, roofH: 2.8, eave: 1.6, baseH: 0.5,
        bays: 3, name: '三山祠', open: true, rail: true,
      });
      pav.position.set(s.x, s.h, s.z);
      pav.rotation.y = -0.7;
      staticRoot.add(pav);
      stats.pavilions++;
      const tree = createPeachTree({ height: 5.0, spread: 1.9, seed: 841 });
      tree.position.set(s.x + 18, s.h, s.z + 5);
      staticRoot.add(tree);
      stats.cherryTrees++;
    }
    for (let k = 0; k < 3; k++) {
      const a = k * 2.1 + i;
      const shrub = createShrub({ radius: 1.3, height: 1.4, seed: 850 + i * 7 + k });
      shrub.position.set(s.x + Math.cos(a) * s.rx * 0.55, s.h, s.z + Math.sin(a) * s.rz * 0.55);
      staticRoot.add(shrub);
    }
  });

  staticRoot.add(archBridge([-40, 17], [15, -5], { width: 5.8, rise: 0.8, arches: 3, deck: 4.3 }));
  staticRoot.add(archBridge([190, -195], [214, -218], { width: 5.2, rise: 0.6, arches: 2, deck: 4.4 }));
  staticRoot.add(archBridge([105, -198], [82, -222], { width: 5.0, rise: 0.6, arches: 2, deck: 4.2 }));
  stats.bridges = 3;

  const farShore = [
    [-1050, -930], [1050, -930], [1050, -690], [880, -720], [720, -680],
    [560, -730], [400, -690], [240, -740], [80, -700], [-80, -750],
    [-240, -705], [-400, -745], [-560, -700], [-720, -740], [-880, -690],
    [-1050, -730],
  ];
  staticRoot.add(landMass(farShore, 1.8, mat(0x8e9b8b, 1)));
  staticRoot.add(landCap(farShore, 1.8, mats.hillFar));

  const hills = [
    [-760, -760, 240, 120, 74], [-460, -820, 270, 140, 88], [-150, -790, 210, 120, 64],
    [170, -830, 280, 150, 92], [480, -790, 250, 130, 78], [780, -720, 220, 110, 58],
    [-930, -660, 200, 110, 55], [920, -640, 190, 100, 48],
  ];
  hills.forEach(([x, z, rx, rz, h], i) => {
    const hill = createHill({ x, z, rx, rz, h, mat: mats.hillFar, seed: 900 + i });
    hill.position.y = 1.2;
    staticRoot.add(hill);
  });
  [[-520, -420, 120, 80, 26], [430, -380, 110, 70, 24], [620, -230, 90, 60, 18], [-680, -280, 100, 65, 20]].forEach(([x, z, rx, rz, h], i) => {
    const hill = createHill({ x, z, rx, rz, h, mat: mats.hillFar, seed: 940 + i });
    staticRoot.add(hill);
  });

  const mistTexture = radialTexture([
    [0, 'rgba(244,249,245,0.7)'],
    [0.42, 'rgba(226,238,230,0.36)'],
    [1, 'rgba(220,234,226,0)'],
  ]);
  const mists = [];
  ISLANDS.forEach((s, i) => {
    for (let k = 0; k < 3; k++) {
      mists.push(mistPatch(dynamic, mistTexture, s.x + (k - 1) * s.rx * 0.7, s.z + 20, 2.0 + k * 1.3, s.rx * (2.0 + k * 0.5), s.rz * 1.7, 0.18 + k * 0.035, 0.05 + k * 0.02, i + k * 1.7));
    }
  });
  for (let i = 0; i < 7; i++) {
    mists.push(mistPatch(dynamic, mistTexture, -700 + i * 230, -610 - (i % 2) * 60, 4.5 + (i % 3), 260, 120, 0.16, 0.018, i));
  }
  mists.push(mistPatch(dynamic, mistTexture, -30, 60, 2.2, 180, 90, 0.12, 0.03, 3.4));

  const boatDefs = [
    { cx: 115, cz: 55, rx: 65, rz: 25, phase: 0.2, speed: 0.010, scale: 1.55, sail: 0xf0e6ce },
    { cx: 225, cz: -55, rx: 70, rz: 30, phase: 2.4, speed: -0.008, scale: 1.35, sail: 0xe2d2ab },
    { cx: 25, cz: -75, rx: 55, rz: 28, phase: 4.1, speed: 0.013, scale: 1.25, sail: 0xc96d50 },
    { cx: 350, cz: -320, rx: 60, rz: 24, phase: 1.2, speed: -0.006, scale: 1.85, sail: 0xf3ebd8 },
    { cx: -130, cz: -260, rx: 70, rz: 30, phase: 3.0, speed: 0.007, scale: 1.5, sail: 0xdfc99d },
    { cx: -105, cz: 63, rx: 4, rz: 2, phase: 1.7, speed: 0.003, scale: 1.3, sail: 0xe8ddc4 },
  ];
  const boats = boatDefs.map((def) => {
    const boat = fishingBoat(def.sail);
    boat.scale.setScalar(def.scale);
    boat.userData.def = def;
    dynamic.add(boat);
    return boat;
  });
  stats.boats = boats.length;

  const birdDefs = [];
  for (let i = 0; i < 16; i++) {
    birdDefs.push({
      cx: -220 + ((i * 137) % 540),
      cz: -20 - ((i * 83) % 300),
      rx: 28 + (i % 5) * 13,
      rz: 16 + (i % 4) * 9,
      h: 16 + (i % 6) * 3.2,
      speed: 0.07 + (i % 5) * 0.012,
      phase: i * 0.73,
      scale: 1.2 + (i % 4) * 0.16,
    });
  }
  const birds = birdDefs.map((def) => {
    const bird = makeBird();
    bird.group.scale.setScalar(def.scale);
    bird.group.userData.def = def;
    dynamic.add(bird.group);
    return bird;
  });
  stats.birds = birds.length;

  const petalCount = 190;
  const petalPos = new Float32Array(petalCount * 3);
  const petalBase = [];
  const petalR = rng(5150);
  for (let i = 0; i < petalCount; i++) {
    const x = -620 + petalR() * 560;
    const z = 40 + petalR() * 380;
    const y = 4 + petalR() * 15;
    petalPos[i * 3] = x;
    petalPos[i * 3 + 1] = y;
    petalPos[i * 3 + 2] = z;
    petalBase.push({ x, z, phase: petalR() * 6.28, speed: 0.28 + petalR() * 0.34, drift: 1.2 + petalR() * 2.2 });
  }
  const petalGeo = new THREE.BufferGeometry();
  petalGeo.setAttribute('position', new THREE.BufferAttribute(petalPos, 3));
  const petalMat = new THREE.PointsMaterial({
    map: radialTexture([[0, 'rgba(255,246,249,1)'], [0.35, 'rgba(247,203,213,0.9)'], [1, 'rgba(247,203,213,0)']]),
    color: 0xf6c9d2,
    size: 0.62,
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const petals = new THREE.Points(petalGeo, petalMat);
  petals.frustumCulled = false;
  petals.renderOrder = 4;
  dynamic.add(petals);

  root.add(mergeStaticGroup(staticRoot));

  const life = {
    update(time, dt) {
      waterMaterial.uniforms.uTime.value = time;
      boats.forEach((b) => {
        const d = b.userData.def;
        const a = time * d.speed + d.phase;
        const dir = Math.sign(d.speed) || 1;
        const x = d.cx + Math.cos(a) * d.rx;
        const z = d.cz + Math.sin(a) * d.rz;
        b.position.set(x, 0.12 + Math.sin(time * 1.5 + d.phase) * 0.08, z);
        b.rotation.y = Math.atan2(-Math.sin(a) * d.rx * dir, Math.cos(a) * d.rz * dir);
        b.rotation.z = Math.sin(time * 1.1 + d.phase) * 0.018;
        b.rotation.x = Math.sin(time * 0.9 + d.phase) * 0.012;
      });
      birds.forEach((bird) => {
        const d = bird.group.userData.def;
        const a = time * d.speed + d.phase;
        const x = d.cx + Math.cos(a) * d.rx;
        const z = d.cz + Math.sin(a) * d.rz;
        const y = d.h + Math.sin(time * 0.5 + d.phase) * 2.3;
        bird.group.position.set(x, y, z);
        bird.group.rotation.y = Math.atan2(-Math.sin(a) * d.rx, Math.cos(a) * d.rz);
        const flap = Math.sin(time * 5.2 + d.phase) * 0.55;
        bird.left.rotation.z = flap;
        bird.right.rotation.z = Math.PI - flap;
      });
      const pa = petalGeo.attributes.position;
      for (let i = 0; i < petalCount; i++) {
        const b = petalBase[i];
        const y = pa.getY(i) - dt * b.speed;
        const yy = y < 2.4 ? 17 + (i % 5) : y;
        pa.setY(i, yy);
        pa.setX(i, b.x + Math.sin(time * 0.7 + b.phase) * b.drift + Math.sin(time * 1.7 + b.phase) * 0.5);
        pa.setZ(i, b.z + Math.cos(time * 0.55 + b.phase) * b.drift * 0.6);
      }
      pa.needsUpdate = true;
      mists.forEach((m, i) => {
        m.mesh.position.x = m.baseX + Math.sin(time * m.speed + m.phase) * 16;
        m.mesh.position.z += Math.sin(time * 0.03 + i) * 0.006;
        m.mesh.material.opacity = 0.13 + 0.05 * (0.5 + 0.5 * Math.sin(time * 0.16 + m.phase));
      });
      light.glass.emissiveIntensity = 0.9 + Math.sin(time * 1.3) * 0.18;
    },
  };

  life.update(0, 0.016);
  return {
    group: root,
    waterMaterial,
    life,
    stats,
    lanternMaterial: light.glass,
    islands: ISLANDS.map((s) => [s.x, s.z]),
  };
}



