import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mats } from './materials.js';
import { addBox, addCylinder, mergedMesh } from './geometry.js';

function makeMistTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  g.addColorStop(0, 'rgba(248,248,240,0.62)');
  g.addColorStop(0.45, 'rgba(240,244,238,0.32)');
  g.addColorStop(0.78, 'rgba(235,240,236,0.12)');
  g.addColorStop(1, 'rgba(235,240,236,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function makeBoat() {
  const group = new THREE.Group();
  const hull = [];
  const trim = [];
  const roof = [];
  const lantern = [];

  const base = new THREE.BoxGeometry(2.5, 0.62, 7.0);
  base.translate(0, 0.34, 0);
  hull.push(base);
  const bow = new THREE.ConeGeometry(1.22, 1.8, 6);
  bow.rotateX(Math.PI / 2);
  bow.rotateY(Math.PI / 6);
  bow.scale(1, 0.48, 1);
  bow.translate(0, 0.34, 4.15);
  hull.push(bow);
  const stern = new THREE.BoxGeometry(2.0, 0.5, 1.1);
  stern.translate(0, 0.42, -3.5);
  hull.push(stern);
  const deck = new THREE.BoxGeometry(2.2, 0.1, 4.6);
  deck.translate(0, 0.66, -0.8);
  trim.push(deck);

  for (const sx of [-1, 1]) {
    addBox(trim, 0.12, 0.18, 6.2, sx * 1.2, 0.7, 0);
    for (const zz of [-3.2, -1.1, 1.1, 3.2]) {
      addBox(hull, 0.1, 0.5, 0.1, sx * 1.17, 0.95, zz);
      addBox(hull, 0.1, 0.1, 0.52, sx * 1.17, 1.18, zz);
    }
  }
  for (const zz of [-1.7, 0.4, 2.4]) {
    const g = new THREE.CylinderGeometry(0.055, 0.07, 1.65, 5);
    g.translate(0.85, 1.44, zz);
    hull.push(g);
  }
  const canopy = new THREE.BoxGeometry(3.0, 0.16, 4.0);
  canopy.translate(0, 2.32, 0.1);
  roof.push(canopy);
  const canopyTop = new THREE.BoxGeometry(2.5, 0.14, 3.3);
  canopyTop.translate(0, 2.62, 0.1);
  roof.push(canopyTop);
  for (const sx of [-1, 1]) {
    addBox(trim, 0.1, 0.16, 3.5, sx * 1.3, 2.22, 0.1);
  }
  const lanternBody = new THREE.SphereGeometry(0.24, 8, 6);
  lanternBody.scale(1, 1.2, 1);
  lanternBody.translate(0, 2.95, 2.25);
  lantern.push(lanternBody);
  addCylinder(lantern, 0.06, 0.07, 0.42, 5, 0, 2.63, 2.25);

  const hm = mergedMesh(hull, mats.wood, true, true);
  if (hm) group.add(hm);
  const tm = mergedMesh(trim, mats.yurtAccent, true, true);
  if (tm) group.add(tm);
  const rm = mergedMesh(roof, mats.roofDark, true, true);
  if (rm) group.add(rm);
  const lm = mergedMesh(lantern, mats.lanternRed, true, false);
  if (lm) group.add(lm);
  return group;
}

function samplePath(points, t) {
  const total = points.length - 1;
  const f = ((t % 1) + 1) % 1;
  const idx = Math.min(total - 1, Math.floor(f * total));
  const local = f * total - idx;
  const a = points[idx];
  const b = points[idx + 1];
  return {
    x: a[0] + (b[0] - a[0]) * local,
    z: a[1] + (b[1] - a[1]) * local,
    angle: Math.atan2(b[0] - a[0], b[1] - a[1]),
  };
}

function makeDeerFigure(seed) {
  const group = new THREE.Group();
  const body = [];
  const antler = [];
  const dark = [];
  const s = 0.78 + (seed % 3) * 0.08;

  const torso = new THREE.SphereGeometry(0.62 * s, 9, 7);
  torso.scale(0.9, 0.9, 1.65);
  torso.translate(0, 1.08 * s, 0);
  body.push(torso);
  const neck = new THREE.CylinderGeometry(0.16 * s, 0.26 * s, 0.86 * s, 6);
  neck.rotateX(-0.45);
  neck.translate(0, 1.62 * s, 0.72 * s);
  body.push(neck);
  const head = new THREE.BoxGeometry(0.28 * s, 0.32 * s, 0.68 * s);
  head.rotateX(0.18);
  head.translate(0, 1.95 * s, 1.08 * s);
  body.push(head);
  for (const sx of [-1, 1]) {
    const ear = new THREE.ConeGeometry(0.07 * s, 0.28 * s, 4);
    ear.translate(sx * 0.15 * s, 2.15 * s, 1.02 * s);
    body.push(ear);
    for (const sz of [-1, 1]) {
      const leg = new THREE.CylinderGeometry(0.07 * s, 0.09 * s, 0.92 * s, 5);
      leg.translate(sx * 0.32 * s, 0.55 * s, sz * 0.55 * s);
      body.push(leg);
      const hoof = new THREE.CylinderGeometry(0.09 * s, 0.1 * s, 0.12 * s, 5);
      hoof.translate(sx * 0.32 * s, 0.08 * s, sz * 0.55 * s);
      dark.push(hoof);
    }
    addCylinder(antler, 0.035 * s, 0.045 * s, 0.6 * s, 4, sx * 0.12 * s, 2.25 * s, 0.92 * s);
    addCylinder(antler, 0.028 * s, 0.035 * s, 0.46 * s, 4, sx * 0.2 * s, 2.5 * s, 0.95 * s);
    const tine = new THREE.CylinderGeometry(0.022 * s, 0.028 * s, 0.34 * s, 4);
    tine.rotateZ(sx * 0.8);
    tine.translate(sx * 0.32 * s, 2.38 * s, 0.94 * s);
    antler.push(tine);
  }
  const tail = new THREE.ConeGeometry(0.1 * s, 0.28 * s, 5);
  tail.rotateX(-0.7);
  tail.translate(0, 1.25 * s, -0.98 * s);
  body.push(tail);

  const bm = mergedMesh(body, mats.deer, true, true);
  if (bm) group.add(bm);
  const am = mergedMesh(antler, mats.antler, true, true);
  if (am) group.add(am);
  const dm = mergedMesh(dark, mats.antler, false, true);
  if (dm) group.add(dm);
  group.scale.setScalar(1.0);
  return group;
}

function visitorGeometry() {
  const body = new THREE.CylinderGeometry(0.2, 0.3, 0.95, 7);
  body.translate(0, 0.78, 0);
  const head = new THREE.SphereGeometry(0.18, 7, 6);
  head.translate(0, 1.52, 0);
  const hat = new THREE.CylinderGeometry(0.26, 0.26, 0.06, 10);
  hat.translate(0, 1.68, 0);
  const legs = [];
  for (const sx of [-1, 1]) {
    const leg = new THREE.BoxGeometry(0.13, 0.64, 0.17);
    leg.translate(sx * 0.11, 0.32, 0);
    legs.push(leg);
  }
  return mergeGeometries([body, head, hat, ...legs], false);
}

function makeSwingLantern(scale = 1) {
  const group = new THREE.Group();
  const rig = [];
  addCylinder(rig, 0.035, 0.035, 0.9 * scale, 4, 0, 0.45 * scale, 0);
  addCylinder(rig, 0.17, 0.2, 0.08 * scale, 8, 0, 0.0, 0);
  addCylinder(rig, 0.16, 0.22, 0.09 * scale, 8, 0, -0.94 * scale, 0);
  const rigMesh = mergedMesh(rig, mats.gold, false, false);
  if (rigMesh) group.add(rigMesh);

  const red = [];
  const body = new THREE.SphereGeometry(0.36 * scale, 10, 8);
  body.scale(1, 1.28, 1);
  body.translate(0, -0.5 * scale, 0);
  red.push(body);
  addCylinder(red, 0.025, 0.04, 0.42 * scale, 4, 0, -1.18 * scale, 0);
  const redMesh = mergedMesh(red, mats.lanternRed, false, false);
  if (redMesh) group.add(redMesh);
  return group;
}

export function createChengdeLife() {
  const group = new THREE.Group();
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  const boatDefs = [
    { cx: -28, cz: 45, rx: 20, rz: 10, speed: 0.048, phase: 0.4 },
    { cx: -12, cz: 47, rx: 15, rz: 7, speed: -0.036, phase: 2.2 },
    { cx: -34, cz: 36, rx: 11, rz: 6, speed: 0.058, phase: 4.1 },
  ];
  const boats = boatDefs.map((d, i) => {
    const b = makeBoat();
    b.rotation.y = i * 1.4;
    group.add(b);
    return b;
  });

  const flags = [];
  const flagPoles = [];
  const flagDefs = [
    [-3.8, 6.2, 119.7, 0],
    [3.8, 6.2, 119.7, 0],
    [-8, 4.2, 43.6, 0.3],
  ];
  for (const [x, y, z, rot] of flagDefs) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.09, y + 1.2, 5), mats.wood);
    pole.position.set(x, (y + 1.2) / 2, z);
    pole.rotation.y = rot;
    group.add(pole);
    flagPoles.push(pole);

    const geo = new THREE.PlaneGeometry(1.5, 2.8, 3, 9);
    geo.translate(0.75, -1.4, 0);
    const mesh = new THREE.Mesh(geo, mats.flagRed);
    mesh.position.set(x, y, z);
    mesh.rotation.y = rot;
    group.add(mesh);
    const base = geo.attributes.position.array.slice();
    flags.push({ mesh, base, phase: Math.random() * 6.28 });
  }

  const lanterns = [];
  const lanternDefs = [
    [-1.4, 5.7, 119.9, 1.0],
    [1.4, 5.7, 119.9, 1.0],
    [-10.5, 4.6, 62.2, 0.9],
    [-24, 4.2, 42.2, 0.95],
    [-30, 4.2, 42.2, 0.95],
    [-13, 4.9, 31.4, 0.9],
  ];
  for (const [x, y, z, s] of lanternDefs) {
    const l = makeSwingLantern(s);
    l.position.set(x, y, z);
    group.add(l);
    lanterns.push({ node: l, phase: x * 0.37 + z * 0.21, speed: 0.8 + (z % 3) * 0.12 });
  }

  const deerDefs = [
    { path: [[92, 2], [104, 8], [112, 2], [102, -6]], speed: 0.018, phase: 0.1, seed: 1 },
    { path: [[136, 28], [144, 22], [152, 30], [146, 38]], speed: 0.015, phase: 0.6, seed: 2 },
    { path: [[118, 64], [128, 62], [134, 68], [124, 72]], speed: 0.021, phase: 0.2, seed: 3 },
  ];
  const deer = deerDefs.map((d) => {
    const node = makeDeerFigure(d.seed);
    group.add(node);
    return { node, ...d };
  });

  const visitorPaths = [
    [[0, 132], [0, 120], [0, 110], [0, 96], [0, 84]],
    [[-2, 76], [-12, 68], [-24, 61], [-38, 57], [-50, 51]],
    [[4, 72], [16, 68], [30, 64], [46, 62], [64, 62]],
    [[64, 58], [84, 60], [104, 54], [124, 46], [144, 36]],
    [[-20, 76], [-34, 70], [-48, 64], [-60, 56], [-64, 44]],
    [[14, 64], [22, 56], [22, 47], [16, 40]],
  ];
  const visitorCount = 34;
  const visitorGeo = visitorGeometry();
  const visitors = new THREE.InstancedMesh(visitorGeo, mats.visitor, visitorCount);
  visitors.castShadow = true;
  visitors.frustumCulled = false;
  const visitorData = [];
  const palette = [0x5d6f86, 0x9a4c3d, 0x577a5c, 0xb58a56, 0x6b5570, 0xd6c3a2, 0x3f4f5c, 0x8c6f4e];
  for (let i = 0; i < visitorCount; i++) {
    const path = visitorPaths[i % visitorPaths.length];
    visitorData.push({
      path,
      phase: (i * 0.173) % 1,
      speed: i % 3 === 0 ? 0 : 0.006 + (i % 5) * 0.0015,
      size: 0.94 + (i % 4) * 0.035,
      bob: i * 0.71,
    });
    color.setHex(palette[i % palette.length]);
    visitors.setColorAt(i, color);
  }
  visitors.instanceColor.needsUpdate = true;
  group.add(visitors);

  const mistTexture = makeMistTexture();
  const mistMat = new THREE.SpriteMaterial({
    map: mistTexture,
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
    color: 0xf2f4ec,
  });
  const mists = [];
  for (let i = 0; i < 6; i++) {
    const s = new THREE.Sprite(mistMat);
    const x = -62 + (i / 5) * 190;
    const z = -30 + ((i * 43) % 115);
    const sc = 24 + (i % 5) * 9;
    s.position.set(x, 2.6 + (i % 4) * 1.9, z);
    s.scale.set(sc, sc * 0.36, 1);
    group.add(s);
    mists.push({ node: s, x, z, phase: i * 0.73, drift: 0.18 + (i % 4) * 0.06 });
  }

  function update(time, dt) {
    boatDefs.forEach((d, i) => {
      const t = time * d.speed + d.phase;
      const x = d.cx + Math.cos(t) * d.rx;
      const z = d.cz + Math.sin(t) * d.rz;
      const dx = -Math.sin(t) * d.rx;
      const dz = Math.cos(t) * d.rz;
      const b = boats[i];
      b.position.set(x, 0.05 + Math.sin(time * 0.9 + d.phase) * 0.045, z);
      b.rotation.y = Math.atan2(dx, dz);
      b.rotation.z = Math.sin(time * 0.8 + d.phase) * 0.025;
      b.rotation.x = Math.cos(time * 0.7 + d.phase) * 0.018;
    });

    flags.forEach((f) => {
      const pos = f.mesh.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const bx = f.base[i * 3];
        const by = f.base[i * 3 + 1];
        const k = Math.max(0, bx) / 1.5;
        pos.setZ(i, Math.sin(time * 2.6 + bx * 2.4 + by * 0.5 + f.phase) * 0.18 * k);
      }
      pos.needsUpdate = true;
    });

    lanterns.forEach((l) => {
      l.node.rotation.z = Math.sin(time * l.speed + l.phase) * 0.09;
      l.node.rotation.x = Math.cos(time * l.speed * 0.77 + l.phase) * 0.055;
    });

    deer.forEach((d) => {
      const p = samplePath(d.path, time * d.speed + d.phase);
      d.node.position.set(p.x, Math.sin(time * 1.4 + d.phase) * 0.025, p.z);
      d.node.rotation.y = p.angle;
    });

    visitorData.forEach((v, i) => {
      const p = samplePath(v.path, time * v.speed + v.phase);
      dummy.position.set(p.x, Math.abs(Math.sin(time * 3.2 + v.bob)) * 0.035, p.z);
      dummy.rotation.set(0, p.angle, 0);
      dummy.scale.setScalar(v.size);
      dummy.updateMatrix();
      visitors.setMatrixAt(i, dummy.matrix);
    });
    visitors.instanceMatrix.needsUpdate = true;

    mists.forEach((m) => {
      m.node.position.x = m.x + Math.sin(time * 0.035 + m.phase) * 16;
      m.node.position.z = m.z + Math.cos(time * 0.028 + m.phase) * 10;
      m.node.position.y = 2.6 + (Math.sin(time * 0.12 + m.phase) * 0.5 + 0.5) * 2.2;
      m.node.material.rotation = Math.sin(time * 0.02 + m.phase) * 0.2;
    });
  }

  return { group, update, lanternMaterial: mats.lanternRed, flagMaterial: mats.flagRed };
}
