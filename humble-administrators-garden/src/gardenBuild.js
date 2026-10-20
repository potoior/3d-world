import * as THREE from 'three';
import { mats } from './materials.js';
import { addBox, addCylinder, mergedMesh, createStairs } from './geometry.js';
import { createRoof, createSkirtRoof } from './roof.js';
import { plaqueMaterial } from './atlas.js';

export function getPlaqueMaterial(text) {
  return plaqueMaterial(text);
}

function addPlaque(group, text, y, z, width = 2.6) {
  if (!text) return;
  const mat = getPlaqueMaterial(text);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, width * 0.3125), mat);
  mesh.position.set(0, y, z);
  mesh.castShadow = false;
  group.add(mesh);
  const frame = [];
  addBox(frame, width + 0.14, 0.1, 0.1, 0, y + width * 0.156, z + 0.01);
  addBox(frame, width + 0.14, 0.1, 0.1, 0, y - width * 0.156, z + 0.01);
  addBox(frame, 0.1, width * 0.3125 + 0.14, 0.1, -width / 2 - 0.04, y, z + 0.01);
  addBox(frame, 0.1, width * 0.3125 + 0.14, 0.1, width / 2 + 0.04, y, z + 0.01);
  const fm = mergedMesh(frame, mats.wallDark, false, false);
  if (fm) group.add(fm);
}

function addWoodRail(group, w, d, y, gap = 0) {
  const list = [];
  const run = (x1, z1, x2, z2) => {
    const len = Math.hypot(x2 - x1, z2 - z1);
    const n = Math.max(1, Math.round(len / 1.8));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const x = x1 + (x2 - x1) * t;
      const z = z1 + (z2 - z1) * t;
      addBox(list, 0.16, 1.0, 0.16, x, y + 0.5, z);
    }
    for (let i = 0; i < n; i++) {
      const xa = x1 + (x2 - x1) * (i / n);
      const za = z1 + (z2 - z1) * (i / n);
      const xb = x1 + (x2 - x1) * ((i + 1) / n);
      const zb = z1 + (z2 - z1) * ((i + 1) / n);
      const g = new THREE.BoxGeometry(0.1, 0.1, Math.hypot(xb - xa, zb - za));
      g.rotateY(Math.atan2(xb - xa, zb - za));
      g.translate((xa + xb) / 2, y + 0.95, (za + zb) / 2);
      list.push(g);
    }
  };
  run(-w / 2, -d / 2, w / 2, -d / 2);
  run(-w / 2, -d / 2, -w / 2, d / 2);
  run(w / 2, -d / 2, w / 2, d / 2);
  if (gap > 0) {
    run(-w / 2, d / 2, -gap / 2, d / 2);
    run(gap / 2, d / 2, w / 2, d / 2);
  } else {
    run(-w / 2, d / 2, w / 2, d / 2);
  }
  const mesh = mergedMesh(list, mats.wallDark, true, true);
  if (mesh) group.add(mesh);
}

export function createPavilion({
  w = 14,
  d = 9,
  wallH = 3.6,
  roofH = 3.8,
  eave = 2.2,
  baseH = 0.7,
  bays = 4,
  name = '',
  pyramid = false,
  rail = false,
  open = false,
  roofMat = mats.roof,
  x = 0,
  z = 0,
  rot = 0,
}) {
  const group = new THREE.Group();
  const bw = w + 2.4;
  const bd = d + 2.4;

  const base = new THREE.Mesh(new THREE.BoxGeometry(bw, baseH, bd), mats.marbleShade);
  base.position.y = baseH / 2;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);
  const edge = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.3, 0.16, bd + 0.3), mats.marble);
  edge.position.y = baseH - 0.02;
  edge.receiveShadow = true;
  group.add(edge);
  const st = createStairs({ width: w * 0.42, depth: 2.4, height: baseH, steps: 5, rampWidth: 0 });
  st.position.set(0, 0, bd / 2);
  group.add(st);

  if (open) {
    const back = new THREE.Mesh(new THREE.BoxGeometry(w, wallH * 0.96, 0.3), mats.wall);
    back.position.set(0, baseH + wallH * 0.48, -d / 2 + 0.15);
    back.castShadow = true;
    back.receiveShadow = true;
    group.add(back);
    for (const sx of [-1, 1]) {
      const side = new THREE.Mesh(new THREE.BoxGeometry(0.3, wallH * 0.92, d * 0.78), mats.wall);
      side.position.set(sx * (w / 2 - 0.15), baseH + wallH * 0.46, -d * 0.08);
      side.castShadow = true;
      side.receiveShadow = true;
      group.add(side);
    }
  } else {
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, d), mats.wall);
    body.position.y = baseH + wallH / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);
  }

  const cols = [];
  const drums = [];
  const bayW = w / bays;
  for (let i = 0; i <= bays; i++) {
    const px = -w / 2 + i * bayW;
    addCylinder(cols, 0.17, 0.19, wallH, 8, px, baseH + wallH / 2, d / 2 + 0.16);
    addCylinder(cols, 0.17, 0.19, wallH, 8, px, baseH + wallH / 2, -d / 2 - 0.16);
    addCylinder(drums, 0.25, 0.29, 0.16, 8, px, baseH + 0.08, d / 2 + 0.16);
    addCylinder(drums, 0.25, 0.29, 0.16, 8, px, baseH + 0.08, -d / 2 - 0.16);
  }
  const sideBays = Math.max(2, Math.round(d / 4.5));
  for (let i = 1; i < sideBays; i++) {
    const pz = -d / 2 + (i * d) / sideBays;
    addCylinder(cols, 0.17, 0.19, wallH, 8, w / 2 + 0.16, baseH + wallH / 2, pz);
    addCylinder(cols, 0.17, 0.19, wallH, 8, -w / 2 - 0.16, baseH + wallH / 2, pz);
    addCylinder(drums, 0.25, 0.29, 0.16, 8, w / 2 + 0.16, baseH + 0.08, pz);
    addCylinder(drums, 0.25, 0.29, 0.16, 8, -w / 2 - 0.16, baseH + 0.08, pz);
  }
  const colMesh = mergedMesh(cols, mats.wallDark, true, true);
  if (colMesh) group.add(colMesh);
  const dm = mergedMesh(drums, mats.stone, true, true);
  if (dm) group.add(dm);
  const inlay = [];
  for (let px = -bw / 2 + 1; px < bw / 2; px += 1.1) addBox(inlay, 0.035, 0.016, bd - 0.4, px, baseH + 0.008, 0);
  for (let pz = -bd / 2 + 1; pz < bd / 2; pz += 1.1) addBox(inlay, bw - 0.4, 0.016, 0.035, 0, baseH + 0.008, pz);
  const im = mergedMesh(inlay, mats.stone, false, true);
  if (im) group.add(im);

  const frame = [];
  addBox(frame, w + 0.5, 0.28, d + 0.5, 0, baseH + wallH - 0.2, 0);
  addBox(frame, w + 0.5, 0.18, d + 0.5, 0, baseH + wallH * 0.68, 0);
  addBox(frame, w + 0.4, 0.3, d + 0.4, 0, baseH + 0.15, 0);
  const fm = mergedMesh(frame, mats.wallDark, true, true);
  if (fm) group.add(fm);

  const doorH = wallH * 0.62;
  const doorW = bayW * 0.74;
  const geo = new THREE.PlaneGeometry(1, 1);
  for (let i = 0; i < bays; i++) {
    const door = new THREE.Mesh(geo, mats.lattice);
    door.position.set(-w / 2 + bayW * (i + 0.5), baseH + doorH / 2 + 0.25, open ? -d / 2 + 0.34 : d / 2 + 0.06);
    door.scale.set(doorW, doorH, 1);
    if (open) door.rotation.y = Math.PI;
    group.add(door);
  }
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 2; i++) {
      const win = new THREE.Mesh(geo, mats.lattice);
      win.position.set(sx * (w / 2 + 0.06), baseH + doorH * 0.6, -d / 4 + i * (d / 2));
      win.rotation.y = sx * Math.PI / 2;
      win.scale.set(d * 0.32, doorH * 0.7, 1);
      group.add(win);
    }
  }

  if (rail || open) addWoodRail(group, w + 1.2, d + 1.2, baseH, open ? w * 0.38 : 0);

  const roof = createRoof({
    width: w + eave * 2,
    depth: d + eave * 2,
    height: roofH,
    cornerLift: 1.45,
    curve: 1.6,
    ridgeRatio: pyramid ? 0 : 0.55,
    hasRidge: !pyramid,
    beasts: false,
  });
  roof.position.y = baseH + wallH;
  if (roofMat) {
    roof.traverse((o) => {
      if (o.isMesh && o.material === mats.roof) o.material = roofMat;
    });
  }
  group.add(roof);

  if (pyramid) {
    const gold = [];
    const ball = new THREE.SphereGeometry(0.28, 10, 8);
    ball.translate(0, roofH + 0.5, 0);
    gold.push(ball);
    addCylinder(gold, 0.09, 0.13, 1.1, 6, 0, roofH + 1.25, 0);
    const tip = new THREE.ConeGeometry(0.16, 0.4, 6);
    tip.translate(0, roofH + 2.0, 0);
    gold.push(tip);
    const gm = mergedMesh(gold, mats.copper, true, false);
    if (gm) {
      gm.position.y = baseH + wallH;
      group.add(gm);
    }
  } else {
    addPlaque(group, name, baseH + wallH - 0.8, d / 2 + 0.35, 2.4);
  }

  group.position.set(x, 0, z);
  group.rotation.y = rot;
  return group;
}

function hexRoofGeometry(R, H, sides = 6, segU = 8, segV = 8) {
  const positions = [];
  const uvs = [];
  const indices = [];
  const step = (Math.PI * 2) / sides;
  for (let k = 0; k < sides; k++) {
    const a0 = k * step;
    const base = positions.length / 3;
    for (let j = 0; j <= segV; j++) {
      const v = j / segV;
      for (let i = 0; i <= segU; i++) {
        const u = i / segU;
        const a = a0 + u * step;
        const lift = 0.65 * Math.pow(Math.abs(u * 2 - 1), 5) * Math.pow(v, 3);
        const r = R * v;
        const y = H * Math.pow(1 - v, 1.55) + lift;
        positions.push(Math.cos(a) * r, y, Math.sin(a) * r);
        uvs.push((Math.cos(a) * r) / 1.3, (v * H) / 1.3);
      }
    }
    for (let j = 0; j < segV; j++) {
      for (let i = 0; i < segU; i++) {
        const a = base + j * (segU + 1) + i;
        const b = a + 1;
        const c = a + segU + 1;
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function addHexRidges(group, R, H, sides = 6) {
  const list = [];
  const step = (Math.PI * 2) / sides;
  for (let k = 0; k < sides; k++) {
    const a = k * step;
    const pts = [];
    for (let i = 0; i <= 8; i++) {
      const v = i / 8;
      pts.push(new THREE.Vector3(Math.cos(a) * R * v, H * Math.pow(1 - v, 1.55), Math.sin(a) * R * v));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    list.push(new THREE.TubeGeometry(curve, 14, 0.16, 4, false));
  }
  const mesh = mergedMesh(list, mats.roofDark, true, false);
  if (mesh) group.add(mesh);
}

export function createHexPavilion({
  radius = 4.6,
  wallH = 2.9,
  roofH = 3.4,
  baseH = 0.7,
  name = '',
  x = 0,
  z = 0,
  rot = 0,
}) {
  const group = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(radius + 1.1, radius + 1.35, baseH, 6), mats.marbleShade);
  base.position.y = baseH / 2;
  base.rotation.y = Math.PI / 6;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  const cols = [];
  const n = 6;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.PI / 6;
    addCylinder(cols, 0.16, 0.18, wallH, 8, Math.cos(a) * radius, baseH + wallH / 2, Math.sin(a) * radius);
  }
  const cm = mergedMesh(cols, mats.wallDark, true, true);
  if (cm) group.add(cm);

  const rail = [];
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2 + Math.PI / 6;
    const a1 = ((i + 1) / n) * Math.PI * 2 + Math.PI / 6;
    const x0 = Math.cos(a0) * radius;
    const z0 = Math.sin(a0) * radius;
    const x1 = Math.cos(a1) * radius;
    const z1 = Math.sin(a1) * radius;
    if (i === 0) continue;
    const g = new THREE.BoxGeometry(0.09, 0.09, Math.hypot(x1 - x0, z1 - z0));
    g.rotateY(Math.atan2(x1 - x0, z1 - z0));
    g.translate((x0 + x1) / 2, baseH + 0.85, (z0 + z1) / 2);
    rail.push(g);
  }
  const rm = mergedMesh(rail, mats.wallDark, true, true);
  if (rm) group.add(rm);

  const roof = new THREE.Mesh(hexRoofGeometry(radius + 2.1, roofH), mats.roof);
  roof.position.y = baseH + wallH;
  roof.castShadow = true;
  group.add(roof);
  const ridgeGroup = new THREE.Group();
  addHexRidges(ridgeGroup, radius + 2.1, roofH);
  ridgeGroup.position.y = baseH + wallH;
  group.add(ridgeGroup);
  const eave = [];
  const tips = [];
  const R = radius + 2.1;
  for (let k = 0; k < 6; k++) {
    const a0 = (k / 6) * Math.PI * 2;
    const a1 = ((k + 1) / 6) * Math.PI * 2;
    for (let j = 1; j < 8; j++) {
      const t = j / 8;
      const x = Math.cos(a0) + (Math.cos(a1) - Math.cos(a0)) * t;
      const z = Math.sin(a0) + (Math.sin(a1) - Math.sin(a0)) * t;
      const lenR = Math.hypot(x, z);
      const ang = Math.atan2(x, z);
      const cap = new THREE.CylinderGeometry(0.08, 0.08, 0.2, 6);
      cap.rotateX(Math.PI / 2);
      cap.rotateY(ang);
      cap.translate((x / lenR) * R, 0.02, (z / lenR) * R);
      eave.push(cap);
    }
    const tip = new THREE.ConeGeometry(0.11, 0.3, 5);
    tip.translate(Math.cos(a0) * R, 0.2, Math.sin(a0) * R);
    tips.push(tip);
  }
  const em = mergedMesh(eave, mats.roofDark, false, false);
  if (em) {
    em.position.y = baseH + wallH;
    group.add(em);
  }
  const tm = mergedMesh(tips, mats.gold, false, false);
  if (tm) {
    tm.position.y = baseH + wallH;
    group.add(tm);
  }

  const gold = [];
  const ball = new THREE.SphereGeometry(0.3, 10, 8);
  ball.translate(0, baseH + wallH + roofH + 0.4, 0);
  gold.push(ball);
  addCylinder(gold, 0.1, 0.12, 1.3, 6, 0, baseH + wallH + roofH + 1.2, 0);
  const gm = mergedMesh(gold, mats.copper, true, false);
  if (gm) group.add(gm);

  group.position.set(x, 0, z);
  group.rotation.y = rot;
  return group;
}

export function createTower({
  w = 13,
  d = 9,
  lowerH = 4.4,
  upperH = 3.2,
  lowerRoofH = 3.2,
  upperRoofH = 3.4,
  eave = 2.2,
  baseH = 0.8,
  name = '',
  x = 0,
  z = 0,
  rot = 0,
}) {
  const group = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(w + 3, baseH, d + 3), mats.marbleShade);
  base.position.y = baseH / 2;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);
  const st = createStairs({ width: w * 0.4, depth: 2.6, height: baseH, steps: 5, rampWidth: 0 });
  st.position.set(0, 0, (d + 3) / 2);
  group.add(st);

  const lower = new THREE.Mesh(new THREE.BoxGeometry(w, lowerH, d), mats.wall);
  lower.position.y = baseH + lowerH / 2;
  lower.castShadow = true;
  lower.receiveShadow = true;
  group.add(lower);

  const cols = [];
  const bays = 4;
  for (let i = 0; i <= bays; i++) {
    const px = -w / 2 + (i * w) / bays;
    addCylinder(cols, 0.16, 0.18, lowerH, 8, px, baseH + lowerH / 2, d / 2 + 0.15);
    addCylinder(cols, 0.16, 0.18, lowerH, 8, px, baseH + lowerH / 2, -d / 2 - 0.15);
  }
  const cm = mergedMesh(cols, mats.wallDark, true, true);
  if (cm) group.add(cm);

  const doorGeo = new THREE.PlaneGeometry(1, 1);
  for (let i = 0; i < bays; i++) {
    const door = new THREE.Mesh(doorGeo, mats.lattice);
    door.position.set(-w / 2 + (w / bays) * (i + 0.5), baseH + lowerH * 0.4, d / 2 + 0.05);
    door.scale.set((w / bays) * 0.72, lowerH * 0.62, 1);
    group.add(door);
  }

  const skirt = createSkirtRoof({
    outerW: w + eave * 2,
    outerD: d + eave * 2,
    innerW: w * 0.74,
    innerD: d * 0.74,
    height: lowerRoofH,
    cornerLift: 1.2,
    curve: 1.5,
  });
  skirt.position.y = baseH + lowerH;
  group.add(skirt);

  const upperBase = baseH + lowerH + lowerRoofH * 0.8;
  const uw = w * 0.72;
  const ud = d * 0.72;
  const upper = new THREE.Mesh(new THREE.BoxGeometry(uw, upperH, ud), mats.wall);
  upper.position.y = upperBase + upperH / 2;
  upper.castShadow = true;
  upper.receiveShadow = true;
  group.add(upper);
  addWoodRail(group, uw + 2.2, ud + 2.2, upperBase - 1.0);

  const wins = [];
  for (const sx of [-1, 1]) {
    const win = new THREE.Mesh(doorGeo, mats.lattice);
    win.position.set(sx * (uw / 2 + 0.05), upperBase + upperH * 0.55, 0);
    win.rotation.y = (sx * Math.PI) / 2;
    win.scale.set(ud * 0.56, upperH * 0.55, 1);
    group.add(win);
  }
  const uf = [];
  addBox(uf, uw + 0.4, 0.24, ud + 0.4, 0, upperBase + upperH - 0.18, 0);
  const ufm = mergedMesh(uf, mats.wallDark, true, true);
  if (ufm) group.add(ufm);

  const roof = createRoof({
    width: uw + eave * 1.8,
    depth: ud + eave * 1.8,
    height: upperRoofH,
    cornerLift: 1.35,
    curve: 1.58,
    ridgeRatio: 0.55,
    hasRidge: true,
    beasts: false,
  });
  roof.position.y = upperBase + upperH;
  group.add(roof);
  addPlaque(group, name, upperBase + upperH - 0.65, ud / 2 + 0.3, 2.3);

  group.position.set(x, 0, z);
  group.rotation.y = rot;
  return group;
}

export function createWalkway({ length = 30, width = 3.2, height = 3.1, roofH = 2.3, eave = 0.9, gapX = 0, gapW = 0, x = 0, z = 0, rot = 0 }) {
  const group = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(length, 0.3, width + 0.8), mats.marbleShade);
  base.position.y = 0.15;
  base.receiveShadow = true;
  group.add(base);

  const posts = [];
  const n = Math.max(2, Math.round(length / 3));
  for (let i = 0; i <= n; i++) {
    const px = -length / 2 + (i * length) / n;
    if (gapW > 0 && Math.abs(px - gapX) < gapW / 2 + 0.1) continue;
    addCylinder(posts, 0.12, 0.14, height, 6, px, height / 2, width / 2);
    addCylinder(posts, 0.12, 0.14, height, 6, px, height / 2, -width / 2);
  }
  for (const sz of [-1, 1]) {
    const spans = gapW > 0
      ? [[-length / 2, gapX - gapW / 2], [gapX + gapW / 2, length / 2]]
      : [[-length / 2, length / 2]];
    for (const [a, b] of spans) {
      if (b - a < 0.1) continue;
      const g = new THREE.BoxGeometry(b - a, 0.12, 0.12);
      g.translate((a + b) / 2, height - 0.1, sz * (width / 2));
      posts.push(g);
      const r = new THREE.BoxGeometry(b - a, 0.08, 0.08);
      r.translate((a + b) / 2, 0.75, sz * (width / 2));
      posts.push(r);
      for (let px = a + 0.3; px < b - 0.2; px += 0.78) {
        addBox(posts, 0.045, 0.62, 0.045, px, 0.43, sz * (width / 2));
      }
      for (let px = a + 0.3; px < b - 0.2; px += 1.4) {
        addBox(posts, 0.2, 0.08, 0.2, px, height - 0.32, sz * (width / 2));
        addBox(posts, 0.08, 0.2, 0.2, px, height - 0.48, sz * (width / 2));
      }
    }
  }
  const pm = mergedMesh(posts, mats.wallDark, true, true);
  if (pm) group.add(pm);
  const floor = [];
  for (let px = -length / 2 + 0.6; px < length / 2; px += 1.15) {
    addBox(floor, 0.05, 0.018, width + 0.66, px, 0.305, 0);
  }
  const fm = mergedMesh(floor, mats.stone, false, true);
  if (fm) group.add(fm);

  const roof = createRoof({
    width: length + eave * 2,
    depth: width + eave * 2,
    height: roofH,
    cornerLift: 0.7,
    curve: 1.5,
    ridgeRatio: 0.6,
    hasRidge: true,
    beasts: false,
  });
  roof.position.y = height;
  group.add(roof);
  group.position.set(x, 0, z);
  group.rotation.y = rot;
  return group;
}
