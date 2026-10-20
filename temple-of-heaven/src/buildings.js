import * as THREE from 'three';
import { mats, getPlaqueGeometry, plaqueMaterial } from './materials.js';
import { addBox, addCylinder, mergedMesh, createPlinth } from './geometry.js';
import { createRoof, createSkirtRoof } from './roof.js';

function addDougong(group, w, d, y) {
  const teal = [];
  const gold = [];
  const step = 1.7;
  const rich = d >= 14;
  let tick = 0;
  for (let x = -w / 2 + 0.9; x <= w / 2 - 0.9; x += step) {
    for (const sz of [1, -1]) {
      const z = sz * (d / 2 + 0.5);
      addBox(teal, 0.5, 0.42, 0.72, x, y, z);
      addBox(teal, 0.95, 0.2, 0.8, x, y + 0.27, z + sz * 0.05);
      addBox(gold, 0.22, 0.22, 0.26, x, y + 0.02, z + sz * 0.3);
      if (rich && tick % 3 === 0) {
        addBox(teal, 0.72, 0.18, 0.9, x, y + 0.46, z + sz * 0.02);
        addBox(gold, 0.14, 0.34, 0.14, x - 0.26, y + 0.22, z + sz * 0.42);
      }
    }
    tick++;
  }
  for (let z = -d / 2 + 1.2; z <= d / 2 - 1.2; z += step) {
    for (const sx of [1, -1]) {
      const x = sx * (w / 2 + 0.5);
      addBox(teal, 0.72, 0.42, 0.5, x, y, z);
      addBox(teal, 0.8, 0.2, 0.95, x + sx * 0.05, y + 0.27, z);
      addBox(gold, 0.26, 0.22, 0.22, x + sx * 0.3, y + 0.02, z);
      if (rich && tick % 3 === 0) {
        addBox(teal, 0.9, 0.18, 0.72, x + sx * 0.02, y + 0.46, z);
        addBox(gold, 0.14, 0.34, 0.14, x + sx * 0.42, y + 0.22, z - 0.26);
      }
    }
    tick++;
  }
  addBox(gold, w, 0.16, 0.28, 0, y - 0.3, d / 2 + 0.2);
  addBox(gold, w, 0.16, 0.28, 0, y - 0.3, -d / 2 - 0.2);
  addBox(gold, 0.28, 0.16, d, w / 2 + 0.2, y - 0.3, 0);
  addBox(gold, 0.28, 0.16, d, -w / 2 - 0.2, y - 0.3, 0);
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
  const gold = [];
  const wood = [];
  const ringGeo = new THREE.TorusGeometry(0.16, 0.035, 3, 6);
  const studly = d >= 14;
  const center = (bays - 1) / 2;
  const transomH = Math.max(0.5, Math.min(1.15, wallH * 0.2));
  const transomY = baseY + doorH + 0.25 + transomH * 0.5;
  for (let i = 0; i < bays; i++) {
    const x = -w / 2 + bayW * (i + 0.5);
    const zf = d / 2 + 0.18;
    const front = new THREE.Mesh(geo, mats.door);
    front.position.set(x, baseY + doorH / 2 + 0.25, d / 2 + 0.16);
    front.scale.set(doorW, doorH, 1);
    front.castShadow = false;
    group.add(front);
    if (studly) {
      const rows = d >= 18 ? 3 : 2;
      const cols = d >= 18 ? 3 : 2;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          addBox(gold, 0.085, 0.085, 0.06, x + (c - (cols - 1) / 2) * doorW * 0.28, baseY + 0.6 + doorH * (0.16 + r * 0.18), zf);
          if (r === rows - 1) {
            addBox(gold, 0.05, 0.03, 0.075, x + (c - (cols - 1) / 2) * doorW * 0.28, baseY + 0.57 + doorH * (0.16 + r * 0.18), zf + 0.01);
          }
        }
      }
    }
    if (studly) {
      addBox(wood, doorW * 0.018, doorH * 0.9, 0.035, x - doorW * 0.02, baseY + doorH * 0.5 + 0.25, zf);
      addBox(gold, doorW * 0.88, 0.11, 0.05, x, baseY + 0.18, zf);
      addBox(gold, doorW * 0.9, 0.06, 0.045, x, baseY + doorH * 0.93, zf);
      if (d >= 14 && Math.abs(i - center) < 0.6) {
        for (const sx of [-1, 1]) {
          const ring = ringGeo.clone();
          ring.translate(x + sx * doorW * 0.13, baseY + 0.74, zf + 0.035);
          gold.push(ring);
          addBox(gold, 0.22, 0.22, 0.035, x + sx * doorW * 0.13, baseY + 0.74, zf);
          addBox(gold, 0.3, 0.08, 0.06, x + sx * doorW * 0.13, baseY + 0.9, zf + 0.01);
          addBox(gold, 0.08, 0.3, 0.06, x + sx * doorW * 0.13, baseY + 0.74, zf + 0.01);
        }
      }
    }
    const pane = new THREE.Mesh(geo, mats.lattice);
    pane.position.set(x, transomY, d / 2 + 0.13);
    pane.scale.set(doorW * 0.94, transomH, 1);
    group.add(pane);
    if (studly) {
      for (const sx of [-1, 0, 1]) {
        addBox(wood, 0.045, transomH, 0.05, x + sx * doorW * 0.24, transomY, d / 2 + 0.17);
      }
      addBox(wood, doorW * 0.94, 0.05, 0.05, x, transomY, d / 2 + 0.17);
    }
    if (back) {
      const rear = new THREE.Mesh(geo, mats.door);
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
  const gm = mergedMesh(gold, mats.gold, false, false);
  if (gm) group.add(gm);
  const wm = mergedMesh(wood, mats.wood, false, false);
  if (wm) group.add(wm);
  const step = new THREE.Mesh(new THREE.BoxGeometry(w * 0.96, 0.22, 1.1), mats.marbleShade);
  step.position.set(0, baseY + 0.11, d / 2 + 0.55);
  step.receiveShadow = true;
  group.add(step);
}

function addColumns(group, { w, d, baseY, wallH, bays }) {
  const cols = [];
  const bases = [];
  const gold = [];
  const radius = 0.44;
  const bayW = w / bays;
  const rich = d >= 14;
  const drum = (x, z) => {
    addCylinder(cols, radius, radius * 1.06, wallH, 10, x, baseY + 0.24 + wallH / 2, z);
    addCylinder(bases, 0.58, 0.66, 0.42, 8, x, baseY + 0.21, z);
    if (d >= 14) addBox(bases, 0.92, 0.14, 0.92, x, baseY + 0.07, z);
    if (w >= 40 && d >= 24) {
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        addBox(bases, 0.24, 0.16, 0.12, x + Math.cos(a) * 0.59, baseY + 0.34, z + Math.sin(a) * 0.59, a);
      }
    }
    if (d >= 18) addCylinder(gold, 0.61, 0.61, 0.07, 8, x, baseY + 0.45, z);
  };
  for (let i = 0; i <= bays; i++) {
    const x = -w / 2 + i * bayW;
    drum(x, d / 2 + 0.3);
    drum(x, -d / 2 - 0.3);
  }
  const sideBays = Math.max(2, Math.round(d / 7));
  for (let i = 1; i < sideBays; i++) {
    const z = -d / 2 + (i * d) / sideBays;
    drum(w / 2 + 0.3, z);
    drum(-w / 2 - 0.3, z);
  }
  const mesh = mergedMesh(cols, mats.wallDark, true, true);
  if (mesh) group.add(mesh);
  const baseMesh = mergedMesh(bases, mats.marbleShade, true, true);
  if (baseMesh) group.add(baseMesh);
  const gm = mergedMesh(gold, mats.gold, true, false);
  if (gm) group.add(gm);
}

function addSideWindows(group, { w, d, baseY, wallH }) {
  const n = Math.max(1, Math.round(d / 6.5) - 1);
  const winW = Math.min((d / (n + 1)) * 0.56, 2.1);
  const winH = Math.min(wallH * 0.42, 3.0);
  const y = baseY + wallH * 0.56;
  const geo = new THREE.PlaneGeometry(1, 1);
  const frames = [];
  for (const sx of [-1, 1]) {
    for (let i = 1; i <= n; i++) {
      const z = -d / 2 + (i * d) / (n + 1);
      const pane = new THREE.Mesh(geo, mats.lattice);
      pane.position.set(sx * (w / 2 + 0.17), y, z);
      pane.rotation.y = sx * (Math.PI / 2);
      pane.scale.set(winW, winH, 1);
      group.add(pane);
      addBox(frames, 0.13, winH + 0.3, 0.15, sx * (w / 2 + 0.2), y, z - winW / 2 - 0.1);
      addBox(frames, 0.13, winH + 0.3, 0.15, sx * (w / 2 + 0.2), y, z + winW / 2 + 0.1);
      addBox(frames, 0.13, 0.16, winW + 0.4, sx * (w / 2 + 0.2), y + winH / 2 + 0.12, z);
      addBox(frames, 0.13, 0.16, winW + 0.4, sx * (w / 2 + 0.2), y - winH / 2 - 0.12, z);
      addBox(frames, 0.34, 0.13, winW + 0.55, sx * (w / 2 + 0.25), y - winH / 2 - 0.26, z);
      for (const off of [-winW / 3, 0, winW / 3]) {
        addBox(frames, 0.06, winH * 0.92, 0.06, sx * (w / 2 + 0.25), y, z + off);
      }
      for (const off of [-winH / 4, winH / 4]) {
        addBox(frames, 0.06, 0.055, winW * 0.92, sx * (w / 2 + 0.25), y + off, z);
      }
      if (d >= 14) {
        for (const off of [-winW / 6, winW / 6]) {
          addBox(frames, 0.05, winH * 0.86, 0.05, sx * (w / 2 + 0.29), y, z + off);
        }
        addBox(frames, 0.24, 0.12, 0.09, sx * (w / 2 + 0.3), y + winH / 2 + 0.2, z - winW / 2);
        addBox(frames, 0.24, 0.12, 0.09, sx * (w / 2 + 0.3), y + winH / 2 + 0.2, z + winW / 2);
        addBox(frames, 0.3, 0.14, winW + 0.7, sx * (w / 2 + 0.28), y + winH / 2 + 0.28, z);
        addBox(frames, 0.13, 0.42, 0.13, sx * (w / 2 + 0.32), y - winH / 2 - 0.4, z - winW / 2 - 0.18);
        addBox(frames, 0.13, 0.42, 0.13, sx * (w / 2 + 0.32), y - winH / 2 - 0.4, z + winW / 2 + 0.18);
      }
    }
  }
  const fm = mergedMesh(frames, mats.gold, false, false);
  if (fm) group.add(fm);
}

function addBeamBands(group, { w, d, baseY, wallH }) {
  const teal = [];
  const gold = [];
  const blue = [];
  const ys = [baseY + wallH - 1.7, baseY + wallH - 1.35];
  for (const y of ys) {
    addBox(teal, w + 0.55, 0.16, 0.12, 0, y, d / 2 + 0.29);
    addBox(teal, w + 0.55, 0.16, 0.12, 0, y, -d / 2 - 0.29);
    addBox(teal, 0.12, 0.16, d + 0.55, w / 2 + 0.29, y, 0);
    addBox(teal, 0.12, 0.16, d + 0.55, -w / 2 - 0.29, y, 0);
  }
  const y = ys[1] + 0.19;
  addBox(gold, w + 0.6, 0.08, 0.15, 0, y, d / 2 + 0.3);
  addBox(gold, w + 0.6, 0.08, 0.15, 0, y, -d / 2 - 0.3);
  addBox(gold, 0.15, 0.08, d + 0.6, w / 2 + 0.3, y, 0);
  addBox(gold, 0.15, 0.08, d + 0.6, -w / 2 - 0.3, y, 0);
  if (d >= 14) {
    for (let x = -w / 2 + 1; x <= w / 2 - 1; x += 3.4) {
      addBox(blue, 0.7, 0.12, 0.1, x, ys[0] + 0.19, d / 2 + 0.31);
      addBox(blue, 0.7, 0.12, 0.1, x, ys[0] + 0.19, -d / 2 - 0.31);
    }
    for (let x = -w / 2 + 2.4; x <= w / 2 - 1.7; x += 2.4) {
      addBox(gold, 0.34, 0.1, 0.075, x, ys[0] + 0.19, d / 2 + 0.36);
      addBox(gold, 0.34, 0.1, 0.075, x, ys[0] + 0.19, -d / 2 - 0.36);
      if (Math.round(x) % 2 === 0) {
        addBox(blue, 0.22, 0.15, 0.07, x, ys[0] + 0.02, d / 2 + 0.36);
        addBox(blue, 0.22, 0.15, 0.07, x, ys[0] + 0.02, -d / 2 - 0.36);
      }
    }
  }
  const tm = mergedMesh(teal, mats.teal, false, false);
  const gm = mergedMesh(gold, mats.gold, false, false);
  const bm = mergedMesh(blue, mats.blue, false, false);
  if (tm) group.add(tm);
  if (gm) group.add(gm);
  if (bm) group.add(bm);
}

function addPlaque(group, { name, d, y, zOffset = 0.5, width = 3.8 }) {
  if (!name) return;
  const plaque = new THREE.Mesh(getPlaqueGeometry(name, width), plaqueMaterial);
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
  gateway = 0,
}) {
  const group = new THREE.Group();

  if (baseH > 0.05 && gateway <= 0) {
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

  if (gateway > 0) {
    const sideW = (w - gateway) / 2;
    for (const sx of [-1, 1]) {
      const side = new THREE.Mesh(new THREE.BoxGeometry(sideW, wallH, d), mats.wall);
      side.position.set(sx * (gateway / 2 + sideW / 2), baseH + wallH / 2, 0);
      side.castShadow = true;
      side.receiveShadow = true;
      group.add(side);
    }
    const lintelH = Math.max(1.4, wallH * 0.2);
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(gateway, lintelH, d), mats.wall);
    lintel.position.set(0, baseH + wallH - lintelH / 2, 0);
    lintel.castShadow = true;
    lintel.receiveShadow = true;
    group.add(lintel);
  } else {
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, d), mats.wall);
    body.position.y = baseH + wallH / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);
    addDoorRow(group, { w, d, baseY: baseH, wallH, bays, back: backDoors });
  }

  addColumns(group, { w, d, baseY: baseH, wallH, bays });
  addSideWindows(group, { w, d, baseY: baseH, wallH });
  addBeamBands(group, { w, d, baseY: baseH, wallH });

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
    addSideWindows(group, {
      w: upperW,
      d: upperD,
      baseY: upperBase,
      wallH: upperWallH,
    });
    addBeamBands(group, { w: upperW, d: upperD, baseY: upperBase, wallH: upperWallH });
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
