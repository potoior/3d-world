import * as THREE from 'three';
import { mats } from './materials.js';
import { heightAt } from './terrain.js';
import { WALL_HEIGHT, getWallFrame } from './wall.js';
import { makeLabelTexture } from './textures.js';

function archHole(cx, halfW, spring, base = 0) {
  const p = new THREE.Path();
  p.moveTo(cx - halfW, base);
  p.lineTo(cx + halfW, base);
  p.lineTo(cx + halfW, spring);
  p.absarc(cx, spring, halfW, 0, Math.PI, false);
  p.lineTo(cx - halfW, base);
  return p;
}

function scaleUV(geo, s) {
  const uv = geo.attributes.uv;
  if (!uv) return;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, uv.getX(i) * s, uv.getY(i) * s);
  }
  uv.needsUpdate = true;
}

function makeWallGeo(width, height, thickness, openings) {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0);
  shape.lineTo(width / 2, 0);
  shape.lineTo(width / 2, height);
  shape.lineTo(-width / 2, height);
  shape.lineTo(-width / 2, 0);
  for (const o of openings) {
    shape.holes.push(archHole(o.x, o.halfW, o.spring, o.base));
  }
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: false,
    curveSegments: 3,
    steps: 1,
  });
  scaleUV(geo, 0.2);
  return geo;
}

function addLocalBox(group, material, w, h, d, x, y, z, ry = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.rotation.y = ry;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function addTowerMerlons(group, width, depth, yTop) {
  const ph = 0.62;
  const t = 0.52;
  addLocalBox(group, mats.wallShade, width - 0.1, ph, t, 0, yTop + ph / 2, depth / 2 - t / 2);
  addLocalBox(group, mats.wallShade, width - 0.1, ph, t, 0, yTop + ph / 2, -depth / 2 + t / 2);
  addLocalBox(group, mats.wallShade, t, ph, depth - 0.1, width / 2 - t / 2, yTop + ph / 2, 0);
  addLocalBox(group, mats.wallShade, t, ph, depth - 0.1, -width / 2 + t / 2, yTop + ph / 2, 0);

  const step = 1.58;
  const mw = 0.7;
  const mh = 0.88;
  const md = 0.52;
  const my = yTop + ph + mh / 2;
  for (let x = -width / 2 + 0.78; x <= width / 2 - 0.78; x += step) {
    addLocalBox(group, mats.wallShade, mw, mh, md, x, my, depth / 2 - md / 2);
    addLocalBox(group, mats.wallShade, mw, mh, md, x, my, -depth / 2 + md / 2);
  }
  for (let z = -depth / 2 + 1.55; z <= depth / 2 - 1.55; z += step) {
    addLocalBox(group, mats.wallShade, md, mh, mw, width / 2 - md / 2, my, z);
    addLocalBox(group, mats.wallShade, md, mh, mw, -width / 2 + md / 2, my, z);
  }

  const cornerH = 1.24;
  const cy = yTop + cornerH / 2 - 0.06;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addLocalBox(group, mats.stone, 0.92, cornerH, 0.92, sx * (width / 2 - 0.24), cy, sz * (depth / 2 - 0.24));
      addLocalBox(group, mats.stoneDark, 1.08, 0.16, 1.08, sx * (width / 2 - 0.24), yTop + cornerH - 0.04, sz * (depth / 2 - 0.24));
    }
  }
}

export function createTowerAt(curve, t, options = {}) {
  const {
    name = '敌楼',
    subtitle = '',
    roof = false,
    label = true,
    scale = 1,
    labelColor = '#eef4ef',
    beacon = false,
    flag = true,
  } = options;

  const frame = getWallFrame(curve, t);
  const W = 12.4 * scale;
  const D = 9.6 * scale;
  const upperH = 6.25;
  const wallT = 1.0;
  const walkTop = frame.y + WALL_HEIGHT;

  const yaw = frame.yaw;
  const nx = frame.nx;
  const nz = frame.nz;
  let groundMin = frame.y;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const cx = frame.x + nx * (W / 2) * sx + frame.tx * (D / 2) * sz;
      const cz = frame.z + nz * (W / 2) * sx + frame.tz * (D / 2) * sz;
      groundMin = Math.min(groundMin, heightAt(cx, cz));
    }
  }

  const baseBottom = groundMin - 3.0;
  const baseH = walkTop - baseBottom;
  const group = new THREE.Group();
  group.name = name;
  group.position.set(frame.x, baseBottom, frame.z);
  group.rotation.y = yaw;

  const footprintW = W + 1.5;
  const footprintD = D + 1.2;
  addLocalBox(group, mats.stoneDark, footprintW + 1.4, 1.15, footprintD + 1.4, 0, 0.575, 0);
  addLocalBox(group, mats.stone, footprintW + 0.8, 1.0, footprintD + 0.8, 0, 1.65, 0);
  const solidH = baseH - 2.1;
  addLocalBox(group, mats.stone, footprintW, solidH, footprintD, 0, 2.15 + solidH / 2, 0);
  addLocalBox(group, mats.wall, W + 0.1, 1.0, D + 0.1, 0, baseH - 0.5, 0);
  addLocalBox(group, mats.stone, W + 0.55, 0.3, D + 0.55, 0, baseH + 0.03, 0);

  const yUpper = baseH + 0.18;

  const frontGeo = makeWallGeo(W, upperH, wallT, [
    { x: 0, halfW: 1.3, spring: 2.28, base: 0.03 },
    { x: -4.55, halfW: 0.24, spring: 2.16, base: 1.25 },
    { x: 4.55, halfW: 0.24, spring: 2.16, base: 1.25 },
    { x: -3.35, halfW: 0.4, spring: 4.72, base: 4.1 },
    { x: 3.35, halfW: 0.4, spring: 4.72, base: 4.1 },
  ]);
  const front = new THREE.Mesh(frontGeo, mats.wall);
  front.position.set(0, yUpper, D / 2 - wallT);
  front.castShadow = true;
  front.receiveShadow = true;
  group.add(front);

  const back = new THREE.Mesh(frontGeo.clone(), mats.wall);
  back.position.set(0, yUpper, -D / 2);
  back.castShadow = true;
  back.receiveShadow = true;
  group.add(back);

  const sideOpenings = [
    { x: -2.75, halfW: 0.31, spring: 2.16, base: 1.28 },
    { x: 2.75, halfW: 0.31, spring: 2.16, base: 1.28 },
    { x: -2.75, halfW: 0.34, spring: 4.72, base: 4.12 },
    { x: 2.75, halfW: 0.34, spring: 4.72, base: 4.12 },
  ];
  const sideGeo = makeWallGeo(D, upperH, wallT, sideOpenings);
  sideGeo.rotateY(Math.PI / 2);
  const sideR = new THREE.Mesh(sideGeo, mats.wall);
  sideR.position.set(W / 2 - wallT, yUpper, 0);
  sideR.castShadow = true;
  sideR.receiveShadow = true;
  group.add(sideR);

  const sideLGeo = makeWallGeo(D, upperH, wallT, sideOpenings);
  sideLGeo.rotateY(Math.PI / 2);
  const sideL = new THREE.Mesh(sideLGeo, mats.wall);
  sideL.position.set(-W / 2, yUpper, 0);
  sideL.castShadow = true;
  sideL.receiveShadow = true;
  group.add(sideL);

  addLocalBox(group, mats.walkway, W - 2.0, 0.24, D - 1.9, 0, yUpper + 0.12, 0);
  addLocalBox(group, mats.stoneDark, 3.4, 0.18, 1.2, 0, yUpper + 0.08, D / 2 - 0.58);
  addLocalBox(group, mats.stoneDark, 3.4, 0.18, 1.2, 0, yUpper + 0.08, -D / 2 + 0.58);
  for (const sx of [-1, 1]) {
    addLocalBox(group, mats.dark, 0.98, 1.32, 0.05, sx * 3.35, yUpper + 4.55, D / 2 - 1.06);
    addLocalBox(group, mats.dark, 0.98, 1.32, 0.05, sx * 3.35, yUpper + 4.55, -D / 2 + 1.06);
    addLocalBox(group, mats.dark, 0.6, 1.12, 0.05, sx * 4.55, yUpper + 1.82, D / 2 - 1.06);
    addLocalBox(group, mats.dark, 0.6, 1.12, 0.05, sx * 4.55, yUpper + 1.82, -D / 2 + 1.06);
    addLocalBox(group, mats.stone, 0.72, 0.12, 0.3, sx * 4.55, yUpper + 1.2, D / 2 + 0.02);
    addLocalBox(group, mats.stone, 0.72, 0.12, 0.3, sx * 4.55, yUpper + 1.2, -D / 2 - 0.02);
    addLocalBox(group, mats.stone, 1.12, 0.13, 0.32, sx * 3.35, yUpper + 4.03, D / 2 + 0.02);
    addLocalBox(group, mats.stone, 1.12, 0.13, 0.32, sx * 3.35, yUpper + 4.03, -D / 2 - 0.02);
  }
  for (const sz of [-1, 1]) {
    for (const hy of [1.82, 4.56]) {
      addLocalBox(group, mats.dark, 0.05, hy > 3 ? 1.3 : 1.12, 0.92, W / 2 - 1.06, yUpper + hy, sz * 2.75);
      addLocalBox(group, mats.dark, 0.05, hy > 3 ? 1.3 : 1.12, 0.92, -W / 2 + 1.06, yUpper + hy, sz * 2.75);
    }
    addLocalBox(group, mats.stone, 0.32, 0.13, 1.02, W / 2 + 0.02, yUpper + 1.2, sz * 2.75);
    addLocalBox(group, mats.stone, 0.32, 0.13, 1.02, -W / 2 - 0.02, yUpper + 1.2, sz * 2.75);
    addLocalBox(group, mats.stone, 0.32, 0.13, 1.02, W / 2 + 0.02, yUpper + 4.04, sz * 2.75);
    addLocalBox(group, mats.stone, 0.32, 0.13, 1.02, -W / 2 - 0.02, yUpper + 4.04, sz * 2.75);
  }
  addLocalBox(group, mats.stoneDark, W + 0.42, 0.26, D + 0.42, 0, yUpper + 3.86, 0);
  addLocalBox(group, mats.stoneDark, W - 1.8, 0.18, D - 1.8, 0, yUpper + 3.95, 0);
  for (let bx = -2.4; bx <= 2.4; bx += 1.6) {
    addLocalBox(group, mats.wood, 0.26, 0.24, D - 1.7, bx, yUpper + 3.88, 0);
  }
  addLocalBox(group, mats.wood, W - 2.2, 0.2, 0.3, 0, yUpper + 4.14, -D / 2 + 1.3);
  addLocalBox(group, mats.wood, W - 2.2, 0.2, 0.3, 0, yUpper + 4.14, D / 2 - 1.3);
  addLocalBox(group, mats.stone, W - 2.2, 0.11, D - 2.0, 0, yUpper + 0.26, 0);
  addLocalBox(group, mats.wood, 1.9, 0.16, 0.9, 0, yUpper + 1.9, -D / 2 + 2.1);
  addLocalBox(group, mats.stone, 0.3, 0.7, 0.3, -2.9, yUpper + 4.45, -D / 2 + 1.2);
  addLocalBox(group, mats.stone, 0.3, 0.7, 0.3, 2.9, yUpper + 4.45, -D / 2 + 1.2);

  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addLocalBox(group, mats.stone, 0.74, upperH, 0.74, sx * (W / 2 - 0.18), yUpper + upperH / 2, sz * (D / 2 - 0.18));
    }
  }

  const capY = yUpper + upperH;
  addLocalBox(group, mats.stoneDark, W + 0.5, 0.3, D + 0.5, 0, capY + 0.03, 0);
  addLocalBox(group, mats.walkway, W - 1.5, 0.16, D - 1.5, 0, capY + 0.24, 0);
  addTowerMerlons(group, W, D, capY + 0.26);

  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addLocalBox(group, mats.stone, 1.02, 0.46, 1.02, sx * (W / 2 - 0.2), yUpper + 0.24, sz * (D / 2 - 0.2));
      addLocalBox(group, mats.stoneDark, 0.22, 0.9, 0.22, sx * (W / 2 - 0.52), yUpper + 3.12, sz * (D / 2 - 0.18));
      addLocalBox(group, mats.stoneDark, 0.18, 0.62, 0.18, sx * (W / 2 - 0.18), yUpper + 2.3, sz * (D / 2 - 0.55));
      addLocalBox(group, mats.dark, 0.1, 0.34, 0.16, sx * (W / 2 - 0.95), yUpper + 5.25, sz * (D / 2 - 0.5));
    }
  }

  const plaqueFront = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 0.66), mats.plaque);
  plaqueFront.position.set(0, yUpper + 3.72, D / 2 + 0.015);
  group.add(plaqueFront);
  const plaqueBack = plaqueFront.clone();
  plaqueBack.position.z = -D / 2 - 0.015;
  plaqueBack.rotation.y = Math.PI;
  group.add(plaqueBack);

  if (roof) {
    const cone = new THREE.ConeGeometry(Math.max(W, D) * 0.6, 2.1, 4, 1, false);
    cone.rotateY(Math.PI / 4);
    cone.scale(1, 1, D / W);
    const roofMesh = new THREE.Mesh(cone, mats.roof);
    roofMesh.position.set(0, capY + 0.34 + 1.05, 0);
    roofMesh.castShadow = true;
    roofMesh.receiveShadow = true;
    group.add(roofMesh);
    addLocalBox(group, mats.stoneDark, 0.4, 0.36, 0.4, 0, capY + 0.34 + 2.18, 0);
  }

  const flagAnchor = { x: 0, y: 0, z: 0 };
  if (flag) {
    const fx = -W / 2 + 1.55;
    const fz = D / 2 - 1.5;
    addLocalBox(group, mats.wood, 0.2, 5.0, 0.2, fx, capY + 0.26 + 2.5, fz);
    addLocalBox(group, mats.bronze, 0.34, 0.16, 0.34, fx, capY + 5.34, fz);
    flagAnchor.x = fx;
    flagAnchor.z = fz;
    flagAnchor.y = capY + 4.55;
  }

  let beaconAnchor = null;
  if (beacon) {
    const bx = W / 2 - 2.15;
    const bz = D / 2 - 2.05;
    addLocalBox(group, mats.stone, 1.5, 0.34, 1.5, bx, capY + 0.36, bz);
    addLocalBox(group, mats.stoneDark, 1.1, 0.42, 1.1, bx, capY + 0.68, bz);
    addLocalBox(group, mats.dark, 0.86, 0.2, 0.86, bx, capY + 0.94, bz);
    addLocalBox(group, mats.wood, 1.0, 0.18, 0.18, bx, capY + 0.9, bz, 0.5);
    addLocalBox(group, mats.wood, 0.18, 0.18, 1.0, bx, capY + 0.9, bz, 0.5);
    addLocalBox(group, mats.ember, 0.7, 0.14, 0.7, bx, capY + 1.0, bz);
    beaconAnchor = { x: bx, y: capY + 1.28, z: bz };
  }

  const toWorld = (lx, ly, lz) => new THREE.Vector3(
    frame.x + lx * Math.cos(yaw) + lz * Math.sin(yaw),
    baseBottom + ly,
    frame.z - lx * Math.sin(yaw) + lz * Math.cos(yaw)
  );
  const flagWorld = flag ? toWorld(flagAnchor.x, flagAnchor.y, flagAnchor.z) : null;
  const beaconWorld = beaconAnchor ? toWorld(beaconAnchor.x, beaconAnchor.y, beaconAnchor.z) : null;

  const labelY = baseBottom + capY + 3.8;
  let sprite = null;
  if (label) {
    const texture = makeLabelTexture(name, subtitle);
    const mat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
      color: labelColor,
    });
    sprite = new THREE.Sprite(mat);
    const aspect = 512 / 160;
    const h = 8.6;
    sprite.scale.set(h * aspect, h, 1);
    sprite.position.set(frame.x, labelY, frame.z);
    sprite.renderOrder = 5;
  }

  return {
    group,
    sprite,
    name,
    subtitle,
    t,
    x: frame.x,
    z: frame.z,
    y: frame.y,
    walkTop,
    top: capY,
    labelY,
    yaw,
    frame,
    flagWorld,
    beaconWorld,
    roofY: baseBottom + capY + (roof ? 2.4 : 0.3),
  };
}
