import * as THREE from 'three';
import { mats } from './materials.js';
import { heightAt } from './terrain.js';
import { mergeGeometryList } from './geometry.js';

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function addBox(list, w, h, d, x, y, z, ry = 0, rz = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (rz) g.rotateZ(rz);
  if (ry) g.rotateY(ry);
  g.translate(x, y, z);
  list.push(g);
  return g;
}

function segGeo(ax, ay, az, bx, by, bz, ra, rb, seg = 5) {
  const dx = bx - ax;
  const dy = by - ay;
  const dz = bz - az;
  const len = Math.hypot(dx, dy, dz) || 1;
  const geo = new THREE.CylinderGeometry(rb, ra, len, seg, 1, false);
  const q = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(dx / len, dy / len, dz / len)
  );
  geo.applyQuaternion(q);
  geo.translate((ax + bx) * 0.5, (ay + by) * 0.5, (az + bz) * 0.5);
  return geo;
}

function rockColumn(x, z, baseY, topY, radius, seed) {
  const rand = mulberry32(seed);
  const h = Math.max(6, topY - baseY);
  const geo = new THREE.CylinderGeometry(radius * 0.72, radius, h, 9, 8, false);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const px = p.getX(i);
    const py = p.getY(i);
    const pz = p.getZ(i);
    const a = Math.atan2(pz, px);
    const k = (py + h * 0.5) / h;
    const wobble = 0.86 + 0.15 * Math.sin(a * 3 + seed) + 0.08 * Math.sin(a * 7 - k * 5);
    const ledge = 1 + 0.05 * Math.sin((py + h * 0.5) * 0.6 + seed);
    p.setX(i, px * wobble * ledge);
    p.setZ(i, pz * wobble * ledge);
    p.setY(i, py + (rand() - 0.5) * 0.4);
  }
  geo.computeVertexNormals();
  geo.translate(x, baseY + h * 0.5, z);
  return geo;
}

class Bucket {
  constructor() {
    this.map = new Map();
  }
  add(geo, mat) {
    if (!this.map.has(mat)) this.map.set(mat, []);
    this.map.get(mat).push(geo);
  }
  finish(name) {
    const group = new THREE.Group();
    group.name = name;
    for (const [mat, list] of this.map) {
      const geo = mergeGeometryList(list);
      if (!geo) continue;
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = !mat.userData || !mat.userData.noShadow;
      mesh.receiveShadow = true;
      group.add(mesh);
    }
    return group;
  }
}

function addSign(bucket, x, y, z, ry, w = 3.4, h = 1.7) {
  const posts = [];
  addBox(posts, 0.18, 2.8, 0.18, x - w * 0.34, y + 1.4, z, ry);
  addBox(posts, 0.18, 2.8, 0.18, x + w * 0.34, y + 1.4, z, ry);
  posts.forEach((g) => bucket.add(g, mats.wood));
  const board = new THREE.BoxGeometry(w, h, 0.16);
  board.rotateY(ry);
  board.translate(x, y + 2.25, z);
  bucket.add(board, mats.sign);
}

function addArch(bucket, cx, cy, cz, span, rise, thickness, width, seed) {
  const rand = mulberry32(seed);
  const count = 30;
  for (let i = 0; i <= count; i++) {
    const u = i / count;
    const x = cx + (u - 0.5) * span;
    const y = cy + Math.sin(Math.PI * u) * rise;
    const slope = (rise * Math.PI * Math.cos(Math.PI * u)) / span;
    const angle = Math.atan(slope);
    const len = (span / count) * 1.9;
    const th = thickness * (0.78 + rand() * 0.36);
    const w = width * (0.88 + rand() * 0.24);
    const g = new THREE.BoxGeometry(len, th, w);
    g.rotateZ(angle);
    g.rotateY((rand() - 0.5) * 0.05);
    g.translate(x + (rand() - 0.5) * 1.4, y + (rand() - 0.5) * 1.2, cz + (rand() - 0.5) * 1.4);
    bucket.add(g, i % 4 === 0 ? mats.graniteLight : i % 3 === 0 ? mats.graniteDark : mats.granite);
  }
  for (let i = 0; i < 14; i++) {
    const u = 0.12 + rand() * 0.76;
    const x = cx + (u - 0.5) * span;
    const y = cy + Math.sin(Math.PI * u) * rise - thickness * 0.5;
    const g = new THREE.DodecahedronGeometry(1.2 + rand() * 2.4, 0);
    g.scale(1.2, 0.8 + rand() * 0.5, 1.1);
    g.rotateY(rand() * 6.2);
    g.translate(x, y - rand() * 2.5, cz + (rand() - 0.5) * width * 0.7);
    bucket.add(g, i % 2 ? mats.graniteDark : mats.granite);
  }
}

function addChainRail(bucket, ax, ay, az, bx, by, bz, sag = 0.35) {
  const steps = 5;
  let px = ax;
  let py = ay;
  let pz = az;
  for (let i = 1; i <= steps; i++) {
    const k = i / steps;
    const nx = ax + (bx - ax) * k;
    const nz = az + (bz - az) * k;
    const ny = ay + (by - ay) * k - Math.sin(k * Math.PI) * sag;
    bucket.add(segGeo(px, py, pz, nx, ny, nz, 0.035, 0.035, 4), mats.iron);
    px = nx;
    py = ny;
    pz = nz;
  }
}

function addHiker(bucket, x, y, z, yaw, jacket, seed) {
  const rand = mulberry32(seed);
  const body = new THREE.BoxGeometry(0.38, 0.66, 0.26);
  body.rotateY(yaw);
  body.translate(x, y + 1.18, z);
  bucket.add(body, jacket);
  const legs = [];
  addBox(legs, 0.14, 0.58, 0.16, x - Math.cos(yaw) * 0.09, y + 0.58, z + Math.sin(yaw) * 0.09, yaw);
  addBox(legs, 0.14, 0.58, 0.16, x + Math.cos(yaw) * 0.09, y + 0.56, z - Math.sin(yaw) * 0.09, yaw);
  legs.forEach((g) => bucket.add(g, mats.iron));
  const head = new THREE.IcosahedronGeometry(0.17, 0);
  head.translate(x, y + 1.63, z);
  bucket.add(head, mats.monkeyFace);
  if (rand() < 0.6) {
    const pack = new THREE.BoxGeometry(0.3, 0.4, 0.22);
    pack.rotateY(yaw);
    pack.translate(x - Math.sin(yaw) * 0.2, y + 1.18, z - Math.cos(yaw) * 0.2);
    bucket.add(pack, mats.ribbon);
  }
}

function addMonkey(bucket, x, y, z, yaw, scale) {
  const body = new THREE.IcosahedronGeometry(0.5 * scale, 1);
  body.scale(0.78, 1.25, 0.7);
  body.translate(x, y + 0.72 * scale, z);
  bucket.add(body, mats.monkey);
  const head = new THREE.IcosahedronGeometry(0.3 * scale, 1);
  head.scale(1, 0.95, 0.9);
  head.translate(x, y + 1.4 * scale, z + 0.03 * scale);
  bucket.add(head, mats.monkey);
  const face = new THREE.IcosahedronGeometry(0.17 * scale, 1);
  face.scale(0.9, 0.8, 0.45);
  face.translate(x, y + 1.4 * scale, z + 0.24 * scale);
  bucket.add(face, mats.monkeyFace);
  const arms = [
    [x - 0.34 * scale, y + 1.05 * scale, z, x - 0.55 * scale, y + 0.52 * scale, z + 0.08 * scale],
    [x + 0.34 * scale, y + 1.05 * scale, z, x + 0.52 * scale, y + 0.6 * scale, z - 0.05 * scale],
  ];
  for (const a of arms) {
    bucket.add(segGeo(a[0], a[1], a[2], a[3], a[4], a[5], 0.09 * scale, 0.06 * scale, 4), mats.monkey);
  }
  let tx = x;
  let ty = y + 0.5 * scale;
  let tz = z - 0.28 * scale;
  for (let i = 0; i < 4; i++) {
    const nx = tx + Math.sin(yaw + i * 0.7) * 0.34 * scale;
    const ny = ty + 0.18 * scale + (i === 3 ? 0.16 * scale : 0);
    const nz = tz - Math.cos(yaw + i * 0.7) * 0.3 * scale;
    bucket.add(segGeo(tx, ty, tz, nx, ny, nz, 0.08 * scale, 0.04 * scale, 4), mats.monkey);
    tx = nx;
    ty = ny;
    tz = nz;
  }
}

function buildBirdFlock(seed, center, radius, altitude, count, speed) {
  const rand = mulberry32(seed);
  const wings = [];
  for (let i = 0; i < count; i++) {
    const x = (rand() - 0.5) * 46;
    const y = (rand() - 0.5) * 12;
    const z = (rand() - 0.5) * 38;
    const a = rand() * Math.PI * 2;
    const span = 1.1 + rand() * 0.6;
    addBox(wings, span, 0.05, 0.16, x - Math.cos(a) * span * 0.42, y, z - Math.sin(a) * span * 0.42, a, 0.3);
    addBox(wings, span, 0.05, 0.16, x + Math.cos(a) * span * 0.42, y, z + Math.sin(a) * span * 0.42, a, -0.3);
    const body = new THREE.BoxGeometry(0.28, 0.1, 0.5);
    body.rotateY(a);
    body.translate(x, y, z);
    wings.push(body);
  }
  const mesh = new THREE.Mesh(mergeGeometryList(wings), mats.iron);
  mesh.castShadow = false;
  const group = new THREE.Group();
  group.name = 'soaring-birds';
  group.add(mesh);
  group.position.set(center[0], altitude, center[1]);
  return { group, center, radius, altitude, speed, phase: rand() * 6.2 };
}

export function createLandmarks() {
  const staticGroup = new THREE.Group();
  staticGroup.name = 'zhangjiajie-landmarks';
  const bucket = new Bucket();
  const dynamicGroup = new THREE.Group();
  dynamicGroup.name = 'landmarks-animated';

  const bridgeZ = -470;
  const bridgeSpring = 208;
  const bridgeRise = 34;
  addArch(bucket, 0, bridgeSpring, bridgeZ, 88, bridgeRise, 13, 14, 7701);
  const groundL = heightAt(-42, bridgeZ);
  const groundR = heightAt(44, bridgeZ);
  bucket.add(rockColumn(-45, bridgeZ, groundL - 5, bridgeSpring + 5, 12, 7702), mats.graniteDark);
  bucket.add(rockColumn(45, bridgeZ, groundR - 5, bridgeSpring + 5, 11.5, 7703), mats.granite);

  const walk = [];
  const railPosts = [];
  const steps = 16;
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const x = -44 + u * 88;
    const y = bridgeSpring + Math.sin(Math.PI * u) * bridgeRise + 6.9;
    const slope = (bridgeRise * Math.PI * Math.cos(Math.PI * u)) / 88;
    addBox(walk, 5.9, 0.5, 10.4, x, y, bridgeZ, 0, Math.atan(slope));
  }
  walk.forEach((g) => bucket.add(g, mats.deck));
  for (let i = 0; i <= steps; i += 2) {
    const u = i / steps;
    const x = -44 + u * 88;
    const y = bridgeSpring + Math.sin(Math.PI * u) * bridgeRise + 7.2;
    for (const side of [-1, 1]) {
      addBox(railPosts, 0.1, 1.2, 0.1, x, y + 0.6, bridgeZ + side * 5.15);
    }
    if (i < steps) {
      const u2 = (i + 2) / steps;
      const x2 = -44 + u2 * 88;
      const y2 = bridgeSpring + Math.sin(Math.PI * u2) * bridgeRise + 7.2;
      for (const side of [-1, 1]) {
        addChainRail(bucket, x, y + 1.15, bridgeZ + side * 5.15, x2, y2 + 1.15, bridgeZ + side * 5.15, 0.18);
      }
    }
  }
  railPosts.forEach((g) => bucket.add(g, mats.iron));
  addSign(bucket, 30, bridgeSpring + 6.4, bridgeZ + 16, 0.15, 3.2, 1.5);
  addHiker(bucket, -18, bridgeSpring + 7.6, bridgeZ + 2.2, 0.3, mats.pineDeep, 901);
  addHiker(bucket, 4, bridgeSpring + 8.6, bridgeZ - 1.8, 2.7, mats.ribbon, 902);
  addHiker(bucket, 23, bridgeSpring + 8.2, bridgeZ + 2.4, 3.4, mats.wood, 903);
  addMonkey(bucket, 47.5, bridgeSpring + 3.4, bridgeZ + 6, 0.4, 1.25);
  addMonkey(bucket, 44.5, bridgeSpring + 3.2, bridgeZ + 2, 2.2, 0.9);
  addMonkey(bucket, -46, bridgeSpring + 3.0, bridgeZ - 3.6, 1.1, 1.05);

  const elevatorX = 298;
  const elevatorZ = -420;
  const elevatorBase = heightAt(elevatorX, elevatorZ) + 1;
  const elevatorTop = 288;
  bucket.add(rockColumn(elevatorX + 27, elevatorZ - 9, heightAt(elevatorX + 27, elevatorZ - 9) - 8, elevatorTop + 24, 19, 7720), mats.graniteDark);
  bucket.add(rockColumn(elevatorX + 36, elevatorZ + 16, heightAt(elevatorX + 36, elevatorZ + 16) - 8, elevatorTop + 8, 13, 7721), mats.granite);

  const frame = [];
  const elevations = 12;
  const eh = elevatorTop - elevatorBase;
  for (const ox of [-6.2, 6.2]) {
    for (const oz of [-4.8, 4.8]) {
      addBox(frame, 0.34, eh, 0.34, elevatorX + ox, elevatorBase + eh * 0.5, elevatorZ + oz);
    }
  }
  for (let i = 0; i <= elevations; i++) {
    const y = elevatorBase + (eh * i) / elevations;
    addBox(frame, 13.0, 0.26, 0.26, elevatorX, y, elevatorZ - 4.8);
    addBox(frame, 13.0, 0.26, 0.26, elevatorX, y, elevatorZ + 4.8);
    addBox(frame, 0.26, 0.26, 10.0, elevatorX - 6.2, y, elevatorZ);
    addBox(frame, 0.26, 0.26, 10.0, elevatorX + 6.2, y, elevatorZ);
  }
  addBox(frame, 30, 2.6, 20, elevatorX + 2, elevatorTop + 1.3, elevatorZ);
  addBox(frame, 24, 0.6, 16, elevatorX + 2, elevatorBase - 0.2, elevatorZ);
  addBox(frame, 26, 0.42, 18, elevatorX + 2, elevatorTop + 4.4, elevatorZ);
  addBox(frame, 0.8, 4.0, 0.8, elevatorX - 8, elevatorTop + 2.6, elevatorZ - 6);
  addBox(frame, 0.8, 4.0, 0.8, elevatorX + 12, elevatorTop + 2.6, elevatorZ - 6);
  frame.forEach((g) => bucket.add(g, mats.iron));
  frame.length = 0;
  addSign(bucket, elevatorX - 2, elevatorTop + 2.5, elevatorZ + 11.2, 0, 3.8, 1.7);
  addSign(bucket, elevatorX - 1, elevatorBase + 0.2, elevatorZ + 10.5, 0, 3.4, 1.5);

  const glassPanels = [];
  for (const oz of [-4.8, 4.8]) {
    const panel = new THREE.BoxGeometry(12.4, eh, 0.08);
    panel.translate(elevatorX, elevatorBase + eh * 0.5, elevatorZ + oz);
    glassPanels.push(panel);
  }
  for (const ox of [-6.2, 6.2]) {
    const panel = new THREE.BoxGeometry(0.08, eh, 9.6);
    panel.translate(elevatorX + ox, elevatorBase + eh * 0.5, elevatorZ);
    glassPanels.push(panel);
  }
  const glassShaft = new THREE.Mesh(mergeGeometryList(glassPanels), mats.glass);
  glassShaft.castShadow = false;
  glassShaft.receiveShadow = false;
  glassShaft.renderOrder = 3;
  staticGroup.add(glassShaft);

  const cabinPanel = [];
  addBox(cabinPanel, 9.4, 4.2, 7.2, 0, 0, 0);
  addBox(cabinPanel, 9.8, 0.5, 7.6, 0, 2.3, 0);
  addBox(cabinPanel, 0.4, 7.0, 0.4, -4.2, 4.6, -3.0);
  addBox(cabinPanel, 0.4, 7.0, 0.4, 4.2, 4.6, -3.0);
  addBox(cabinPanel, 8.2, 0.3, 0.4, 0, 8.0, -3.0);
  const cabinBody = new THREE.Mesh(mergeGeometryList(cabinPanel), mats.elevator);
  cabinBody.castShadow = true;
  const cabinGlassPanels = [];
  addBox(cabinGlassPanels, 8.6, 2.5, 7.35, 0, 0.5, 0);
  const cabinGlass = new THREE.Mesh(mergeGeometryList(cabinGlassPanels), mats.cabinGlass);
  cabinGlass.castShadow = false;
  const elevatorCabin = new THREE.Group();
  elevatorCabin.name = 'bailong-elevator-cabin';
  elevatorCabin.add(cabinBody, cabinGlass);
  elevatorCabin.position.set(elevatorX, elevatorBase + 7, elevatorZ);
  dynamicGroup.add(elevatorCabin);

  const walkwayY = 238;
  const walkwayZ = -398;
  const walkwayStart = 320;
  const walkwayEnd = 366;
  const walkwayGlass = [];
  for (let i = 0; i < 8; i++) {
    const panel = new THREE.BoxGeometry(5.5, 0.12, 4.0);
    panel.translate(walkwayStart + 3 + i * 5.4, walkwayY, walkwayZ);
    walkwayGlass.push(panel);
  }
  const walkwayDeck = new THREE.Mesh(mergeGeometryList(walkwayGlass), mats.glass);
  walkwayDeck.castShadow = false;
  walkwayDeck.renderOrder = 3;
  staticGroup.add(walkwayDeck);
  const walkwayFrame = [];
  addBox(walkwayFrame, walkwayEnd - walkwayStart + 2, 0.24, 0.2, (walkwayStart + walkwayEnd) * 0.5, walkwayY - 0.1, walkwayZ - 2.05);
  addBox(walkwayFrame, walkwayEnd - walkwayStart + 2, 0.24, 0.2, (walkwayStart + walkwayEnd) * 0.5, walkwayY - 0.1, walkwayZ + 2.05);
  for (let i = 0; i <= 8; i++) {
    const x = walkwayStart + i * ((walkwayEnd - walkwayStart) / 8);
    for (const side of [-1, 1]) {
      addBox(walkwayFrame, 0.12, 1.25, 0.12, x, walkwayY + 0.65, walkwayZ + side * 2.0);
      addBox(walkwayFrame, 0.08, 0.08, 4.0, x, walkwayY - 0.15, walkwayZ);
    }
    if (i < 8) {
      const x2 = walkwayStart + (i + 1) * ((walkwayEnd - walkwayStart) / 8);
      addChainRail(bucket, x, walkwayY + 1.18, walkwayZ - 2.0, x2, walkwayY + 1.18, walkwayZ - 2.0, 0.12);
      addChainRail(bucket, x, walkwayY + 1.18, walkwayZ + 2.0, x2, walkwayY + 1.18, walkwayZ + 2.0, 0.12);
    }
  }
  addBox(walkwayFrame, 0.4, 42, 0.4, walkwayEnd, walkwayY - 21, walkwayZ - 2.0, 0, 0.12);
  addBox(walkwayFrame, 0.4, 42, 0.4, walkwayEnd, walkwayY - 21, walkwayZ + 2.0, 0, 0.12);
  walkwayFrame.forEach((g) => bucket.add(g, mats.iron));

  addSign(bucket, walkwayEnd - 4, walkwayY + 0.4, walkwayZ + 3.4, -0.1, 2.8, 1.3);

  const towerDefs = [
    { x: 348, z: -330, top: 310 },
    { x: 180, z: -470, top: 286 },
    { x: 20, z: -565, top: 278 },
    { x: -158, z: -690, top: 330 },
  ];
  for (let i = 0; i < towerDefs.length; i++) {
    const t = towerDefs[i];
    const base = heightAt(t.x, t.z);
    const h = t.top - base;
    bucket.add(rockColumn(t.x, t.z, base - 4, base + 10, 6.5, 7800 + i), mats.stoneDark);
    addBox(frame, 1.4, h, 1.4, t.x, base + h * 0.5 + 8, t.z);
    addBox(frame, 7.0, 0.7, 0.7, t.x, t.top - 2, t.z);
    addBox(frame, 0.7, 0.7, 5.0, t.x, t.top - 2, t.z);
    addBox(frame, 2.2, 0.5, 2.2, t.x, t.top + 0.4, t.z);
    for (let k = 0; k < 4; k++) {
      const y = base + 18 + k * (h - 20) * 0.26;
      addBox(frame, 3.4, 0.22, 0.22, t.x, y, t.z);
      addBox(frame, 0.22, 0.22, 3.4, t.x, y, t.z);
    }
  }
  frame.forEach((g) => bucket.add(g, mats.iron));
  frame.length = 0;

  const cablePts = [
    new THREE.Vector3(348, 310, -330),
    new THREE.Vector3(180, 286, -470),
    new THREE.Vector3(20, 278, -565),
    new THREE.Vector3(-158, 330, -690),
  ];
  const curveA = new THREE.CatmullRomCurve3(cablePts, false, 'centripetal');
  const curveB = new THREE.CatmullRomCurve3(
    cablePts.map((p) => new THREE.Vector3(p.x, p.y - 3.2, p.z - 7.5)),
    false,
    'centripetal'
  );
  for (const curve of [curveA, curveB]) {
    const pts = curve.getPoints(46);
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      bucket.add(segGeo(a.x, a.y, a.z, b.x, b.y, b.z, 0.11, 0.11, 4), mats.cable);
    }
  }

  const cabBodyParts = [];
  addBox(cabBodyParts, 4.2, 3.0, 3.4, 0, -4.6, 0);
  addBox(cabBodyParts, 4.7, 0.35, 3.9, 0, -2.95, 0);
  addBox(cabBodyParts, 0.18, 4.5, 0.18, -1.6, -1.4, 0);
  addBox(cabBodyParts, 0.18, 4.5, 0.18, 1.6, -1.4, 0);
  addBox(cabBodyParts, 3.2, 0.22, 0.22, 0, 0.25, 0);
  const cableBodyGeo = mergeGeometryList(cabBodyParts);
  const cabGlassParts = [];
  addBox(cabGlassParts, 3.9, 1.5, 3.5, 0, -4.3, 0);
  const cableGlassGeo = mergeGeometryList(cabGlassParts);
  const cableBodyMesh = new THREE.InstancedMesh(cableBodyGeo, mats.cabin, 4);
  const cableGlassMesh = new THREE.InstancedMesh(cableGlassGeo, mats.cabinGlass, 4);
  cableBodyMesh.castShadow = false;
  cableGlassMesh.castShadow = false;
  dynamicGroup.add(cableBodyMesh, cableGlassMesh);
  const cableCars = [
    { curve: curveA, speed: 0.012, offset: 0.05 },
    { curve: curveA, speed: 0.012, offset: 0.38 },
    { curve: curveB, speed: -0.011, offset: 0.62 },
    { curve: curveB, speed: -0.011, offset: 0.9 },
  ];

  const flagSpots = [
    [-38, 249, -461, 0.5, 0],
    [-24, 250, -457, 0.9, 0],
    [12, 250, -457, 1.1, 1],
    [30, 248, -461, 1.4, 0],
    [44, 244, -466, 1.8, 1],
    [276, 248, -405, 0.4, 0],
    [288, 249, -402, 0.8, 1],
    [318, 240, -390, 1.2, 0],
    [334, 241, -388, 1.6, 0],
    [350, 240, -393, 2.1, 1],
  ];
  const flagGeo = new THREE.PlaneGeometry(2.2, 1.3);
  flagGeo.translate(1.15, 0, 0);
  const flagRed = [];
  const flagGold = [];
  const flagData = [];
  const flagPoles = [];
  for (let i = 0; i < flagSpots.length; i++) {
    const f = flagSpots[i];
    addBox(flagPoles, 0.09, 5.2, 0.09, f[0], f[1] + 2.0, f[2]);
    flagData.push({ x: f[0], y: f[1] + 4.1, z: f[2], yaw: f[3], phase: i * 0.7, gold: f[4] === 1 });
    if (f[4] === 1) flagGold.push(i);
    else flagRed.push(i);
  }
  flagPoles.forEach((g) => bucket.add(g, mats.iron));
  const redMesh = new THREE.InstancedMesh(flagGeo, mats.ribbon, flagRed.length);
  const goldMesh = new THREE.InstancedMesh(flagGeo, mats.flagGold, flagGold.length);
  redMesh.castShadow = false;
  goldMesh.castShadow = false;
  dynamicGroup.add(redMesh, goldMesh);

  addMonkey(bucket, 318, elevatorBase + 0.6, elevatorZ + 12.5, 2.4, 1.1);
  addMonkey(bucket, 324, elevatorBase + 0.4, elevatorZ + 9.5, 0.8, 0.85);
  addHiker(bucket, 348, walkwayY + 0.1, walkwayZ + 1.2, 1.2, mats.pineLight, 905);
  addHiker(bucket, 358, walkwayY + 0.1, walkwayZ - 1.3, 4.1, mats.ribbon, 906);

  staticGroup.add(bucket.finish('landmarks-static-merged'));

  const flockA = buildBirdFlock(6101, [40, -430], 250, 268, 9, 0.055);
  const flockB = buildBirdFlock(6102, [-240, -190], 320, 300, 7, -0.038);
  dynamicGroup.add(flockA.group, flockB.group);

  const tmpMat = new THREE.Matrix4();
  const tmpPos = new THREE.Vector3();
  const tmpQuat = new THREE.Quaternion();
  const tmpEuler = new THREE.Euler();
  const tmpScale = new THREE.Vector3(1, 1, 1);

  function update(elapsed) {
    const k = 0.5 - 0.5 * Math.cos(elapsed * 0.24);
    elevatorCabin.position.y = elevatorBase + 7 + k * (elevatorTop - elevatorBase - 18);

    for (let i = 0; i < cableCars.length; i++) {
      const car = cableCars[i];
      let t = (elapsed * car.speed + car.offset) % 1;
      if (t < 0) t += 1;
      car.curve.getPointAt(t, tmpPos);
      const tan = car.curve.getTangentAt(t);
      const yaw = Math.atan2(tan.x, tan.z);
      tmpEuler.set(0, yaw, Math.sin(elapsed * 0.8 + i) * 0.025);
      tmpQuat.setFromEuler(tmpEuler);
      tmpMat.compose(tmpPos, tmpQuat, tmpScale);
      cableBodyMesh.setMatrixAt(i, tmpMat);
      cableGlassMesh.setMatrixAt(i, tmpMat);
    }
    cableBodyMesh.instanceMatrix.needsUpdate = true;
    cableGlassMesh.instanceMatrix.needsUpdate = true;

    for (const list of [flagRed, flagGold]) {
      for (let j = 0; j < list.length; j++) {
        const f = flagData[list[j]];
        const wave = Math.sin(elapsed * 3.1 + f.phase) * 0.22;
        tmpPos.set(f.x, f.y + Math.sin(elapsed * 2.4 + f.phase) * 0.12, f.z);
        tmpEuler.set(0, f.yaw + wave, Math.sin(elapsed * 2.7 + f.phase) * 0.3);
        tmpQuat.setFromEuler(tmpEuler);
        tmpMat.compose(tmpPos, tmpQuat, tmpScale);
        if (list === flagRed) redMesh.setMatrixAt(j, tmpMat);
        else goldMesh.setMatrixAt(j, tmpMat);
      }
    }
    redMesh.instanceMatrix.needsUpdate = true;
    goldMesh.instanceMatrix.needsUpdate = true;

    for (const flock of [flockA, flockB]) {
      const a = elapsed * flock.speed + flock.phase;
      flock.group.position.set(
        flock.center[0] + Math.cos(a) * flock.radius,
        flock.altitude + Math.sin(elapsed * 0.33 + flock.phase) * 9,
        flock.center[1] + Math.sin(a) * flock.radius * 0.72
      );
      flock.group.rotation.y = -a * 1.3;
      flock.group.rotation.z = Math.sin(elapsed * 0.5 + flock.phase) * 0.05;
    }
  }

  return {
    staticGroup,
    dynamicGroup,
    update,
    elevator: { x: elevatorX, z: elevatorZ, base: elevatorBase, top: elevatorTop },
    bridge: { x: 0, z: bridgeZ, top: bridgeSpring + bridgeRise },
    walkway: { x: walkwayEnd, z: walkwayZ, y: walkwayY },
  };
}
