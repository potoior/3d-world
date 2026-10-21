import * as THREE from 'three';
import { mats, getPlaqueMaterial } from './materials.js';
import { addBox, addCylinder, mergedMesh, createPlinth } from './geometry.js';
import { createRoof, createSkirtRoof } from './roof.js';

function addDougong(group, w, d, y) {
  const teal = [];
  const gold = [];
  const step = 1.7;
  for (let x = -w / 2 + 0.9; x <= w / 2 - 0.9; x += step) {
    for (const sz of [1, -1]) {
      const z = sz * (d / 2 + 0.5);
      addBox(teal, 0.5, 0.42, 0.72, x, y, z);
      addBox(teal, 0.95, 0.2, 0.8, x, y + 0.27, z + sz * 0.05);
      addBox(gold, 0.22, 0.22, 0.26, x, y + 0.02, z + sz * 0.3);
    }
  }
  for (let z = -d / 2 + 1.2; z <= d / 2 - 1.2; z += step) {
    for (const sx of [1, -1]) {
      const x = sx * (w / 2 + 0.5);
      addBox(teal, 0.72, 0.42, 0.5, x, y, z);
      addBox(teal, 0.8, 0.2, 0.95, x + sx * 0.05, y + 0.27, z);
      addBox(gold, 0.26, 0.22, 0.22, x + sx * 0.3, y + 0.02, z);
    }
  }
  const tm = mergedMesh(teal, mats.teal, true, false);
  if (tm) group.add(tm);
  const gm = mergedMesh(gold, mats.gold, true, false);
  if (gm) group.add(gm);
}

function addDoorRow(group, { w, d, baseY, wallH, bays, back = false, scale = 1 }) {
  const bayW = w / bays;
  const doorH = wallH * 0.7 * scale;
  const doorW = bayW * 0.7;
  const geo = new THREE.PlaneGeometry(1, 1);
  for (let i = 0; i < bays; i++) {
    const x = -w / 2 + bayW * (i + 0.5);
    const front = new THREE.Mesh(geo, mats.lattice);
    front.position.set(x, baseY + doorH / 2 + 0.25, d / 2 + 0.16);
    front.scale.set(doorW, doorH, 1);
    front.castShadow = false;
    group.add(front);
    if (back) {
      const rear = new THREE.Mesh(geo, mats.lattice);
      rear.position.set(x, baseY + doorH / 2 + 0.25, -d / 2 - 0.16);
      rear.rotation.y = Math.PI;
      rear.scale.set(doorW, doorH, 1);
      group.add(rear);
    }
  }
  const beam = [];
  addBox(beam, w + 0.4, 0.34, 0.42, 0, baseY + doorH + 0.42, d / 2 + 0.3);
  const bm = mergedMesh(beam, mats.gold, false, false);
  if (bm) group.add(bm);
  const step = new THREE.Mesh(new THREE.BoxGeometry(w * 0.96, 0.22, 1.1), mats.marbleShade);
  step.position.set(0, baseY + 0.11, d / 2 + 0.55);
  step.receiveShadow = true;
  group.add(step);
}

function addColumns(group, { w, d, baseY, wallH, bays }) {
  const cols = [];
  const radius = 0.44;
  const bayW = w / bays;
  for (let i = 0; i <= bays; i++) {
    const x = -w / 2 + i * bayW;
    addCylinder(cols, radius, radius * 1.06, wallH, 10, x, baseY + wallH / 2, d / 2 + 0.3);
    addCylinder(cols, radius, radius * 1.06, wallH, 10, x, baseY + wallH / 2, -d / 2 - 0.3);
  }
  const sideBays = Math.max(2, Math.round(d / 7));
  for (let i = 1; i < sideBays; i++) {
    const z = -d / 2 + (i * d) / sideBays;
    addCylinder(cols, radius, radius * 1.06, wallH, 10, w / 2 + 0.3, baseY + wallH / 2, z);
    addCylinder(cols, radius, radius * 1.06, wallH, 10, -w / 2 - 0.3, baseY + wallH / 2, z);
  }
  const mesh = mergedMesh(cols, mats.wallDark, true, true);
  if (mesh) group.add(mesh);
}

function addPlaque(group, { name, d, y, zOffset = 0.5, width = 3.8 }) {
  if (!name) return;
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(width, width * 0.375), getPlaqueMaterial(name));
  plaque.position.set(0, y, d / 2 + zOffset);
  group.add(plaque);
  const frame = [];
  addBox(frame, width + 0.24, 0.14, 0.24, 0, y + width * 0.19, d / 2 + zOffset + 0.02);
  addBox(frame, width + 0.24, 0.14, 0.24, 0, y - width * 0.19, d / 2 + zOffset + 0.02);
  addBox(frame, 0.14, width * 0.375 + 0.24, 0.24, -width / 2 - 0.06, y, d / 2 + zOffset + 0.02);
  addBox(frame, 0.14, width * 0.375 + 0.24, 0.24, width / 2 + 0.06, y, d / 2 + zOffset + 0.02);
  const fm = mergedMesh(frame, mats.gold, false, false);
  if (fm) group.add(fm);
}

function addFinial(group, y) {
  const gold = [];
  addCylinder(gold, 0.9, 1.1, 0.5, 10, 0, y + 0.25, 0);
  const ball = new THREE.SphereGeometry(0.7, 12, 10);
  ball.translate(0, y + 1.05, 0);
  gold.push(ball);
  addCylinder(gold, 0.22, 0.32, 2.0, 8, 0, y + 2.2, 0);
  const tip = new THREE.ConeGeometry(0.34, 0.8, 8);
  tip.translate(0, y + 3.4, 0);
  gold.push(tip);
  const mesh = mergedMesh(gold, mats.gold, true, false);
  if (mesh) group.add(mesh);
}

export function createHall({
  w = 30,
  d = 18,
  wallH = 7,
  roofH = 8,
  eave = 3.2,
  baseH = 1.0,
  baseExtra = 3,
  stairs = 4,
  doubleEave = false,
  upperRatio = 0.72,
  upperWallH = 5.2,
  upperRoofH = 6.4,
  lowerRoofH = 5.2,
  pyramid = false,
  name = '',
  bays = 7,
  backDoors = false,
  railing = true,
  beasts = true,
  plaqueWidth = 3.8,
}) {
  const group = new THREE.Group();

  if (baseH > 0.05) {
    const baseW = w + baseExtra * 2;
    const baseD = d + baseExtra * 2;
    group.add(
      createPlinth({
        w: baseW,
        d: baseD,
        h: baseH,
        stairs,
        railing,
      })
    );
  }

  const body = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, d), mats.wall);
  body.position.y = baseH + wallH / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  addColumns(group, { w, d, baseY: baseH, wallH, bays });
  addDoorRow(group, { w, d, baseY: baseH, wallH, bays, back: backDoors });

  const frieze = new THREE.Mesh(new THREE.BoxGeometry(w + 0.9, 1.15, d + 0.9), mats.frieze);
  frieze.position.y = baseH + wallH - 0.35;
  frieze.castShadow = true;
  frieze.receiveShadow = true;
  group.add(frieze);

  addDougong(group, w, d, baseH + wallH + 0.45);

  if (doubleEave) {
    const upperW = w * upperRatio;
    const upperD = d * upperRatio;
    const innerW = upperW + 0.4;
    const innerD = upperD + 0.4;
    const skirt = createSkirtRoof({
      outerW: w + eave * 2,
      outerD: d + eave * 2,
      innerW,
      innerD,
      height: lowerRoofH,
      cornerLift: 1.7,
      curve: 1.5,
    });
    skirt.position.y = baseH + wallH;
    group.add(skirt);

    const upperBase = baseH + wallH + lowerRoofH * 0.82;
    const upperBody = new THREE.Mesh(new THREE.BoxGeometry(upperW, upperWallH, upperD), mats.wall);
    upperBody.position.y = upperBase + upperWallH / 2;
    upperBody.castShadow = true;
    upperBody.receiveShadow = true;
    group.add(upperBody);

    addColumns(group, {
      w: upperW,
      d: upperD,
      baseY: upperBase,
      wallH: upperWallH,
      bays: Math.max(3, Math.round(bays * upperRatio)),
    });
    addDoorRow(group, {
      w: upperW,
      d: upperD,
      baseY: upperBase,
      wallH: upperWallH,
      bays: Math.max(3, Math.round(bays * upperRatio)),
      back: false,
      scale: 0.9,
    });

    const upperFrieze = new THREE.Mesh(
      new THREE.BoxGeometry(upperW + 0.8, 1.0, upperD + 0.8),
      mats.frieze
    );
    upperFrieze.position.y = upperBase + upperWallH - 0.3;
    upperFrieze.castShadow = true;
    group.add(upperFrieze);

    addDougong(group, upperW, upperD, upperBase + upperWallH + 0.4);

    const upperRoof = createRoof({
      width: upperW + eave * 1.7,
      depth: upperD + eave * 1.7,
      height: upperRoofH,
      cornerLift: 2.0,
      curve: 1.6,
      beasts,
    });
    upperRoof.position.y = upperBase + upperWallH;
    group.add(upperRoof);

    addPlaque(group, {
      name,
      d: upperD,
      y: upperBase + upperWallH - 1.1,
      zOffset: 0.45,
      width: plaqueWidth,
    });
  } else {
    const roof = createRoof({
      width: w + eave * 2,
      depth: d + eave * 2,
      height: roofH,
      cornerLift: pyramid ? 1.5 : 2.0,
      curve: 1.6,
      ridgeRatio: pyramid ? 0 : 0.55,
      hasRidge: !pyramid,
      beasts: pyramid ? false : beasts,
    });
    roof.position.y = baseH + wallH;
    group.add(roof);
    if (pyramid) {
      addFinial(group, baseH + wallH + roofH);
    } else {
      addPlaque(group, {
        name,
        d,
        y: baseH + wallH - 1.0,
        zOffset: 0.5,
        width: plaqueWidth,
      });
    }
  }

  return group;
}

export function createCorridor({
  length = 40,
  width = 8,
  wallH = 4.4,
  roofH = 4.2,
  eave = 1.8,
  bays = 10,
  baseH = 0.6,
  name = '',
  railing = false,
}) {
  return createHall({
    w: length,
    d: width,
    wallH,
    roofH,
    eave,
    baseH,
    baseExtra: 1.4,
    stairs: 0,
    name,
    bays,
    railing,
    beasts: false,
    plaqueWidth: 2.6,
  });
}

export function createTerraceGroup({ tiers, centerZ = 0 }) {
  const group = new THREE.Group();
  tiers.forEach((t, i) => {
    const terrace = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(t.w, t.h, t.d), mats.marble);
    body.position.y = t.y + t.h / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    terrace.add(body);
    const band = new THREE.Mesh(
      new THREE.BoxGeometry(t.w + 0.8, 0.7, t.d + 0.8),
      mats.marbleShade
    );
    band.position.y = t.y + t.h - 0.35;
    band.receiveShadow = true;
    terrace.add(band);
    group.add(terrace);
  });
  return group;
}
