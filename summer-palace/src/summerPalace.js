import * as THREE from 'three';
import { mats } from './materials.js';
import { addBox, addCylinder, addBar, mergedMesh, createStairs, createBalustrade } from './geometry.js';
import { createRoof } from './roof.js';
import { plaqueMaterial, coupletMaterial } from './atlas.js';
import { createArchBridge, createLotus, createWillow } from './gardenDetails.js';
import { createHangingLantern, createStoneLantern, createTaihuRock, createBench } from './richProps.js';
import { createTree } from './props.js';

export const MOUNTAIN = { x: -8, z: -58, w: 170, d: 106 };

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function smoothstep(a, b, x) {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function terrainLocal(lx, lz) {
  const q = Math.sqrt((lx / 74) ** 2 + (lz / 46) ** 2);
  let h = 32 * Math.exp(-q * q * 1.55);
  h += 4.2 * Math.exp(-(((lx + 30) / 24) ** 2) - (((lz + 8) / 16) ** 2));
  h *= 1 - smoothstep(0.6, 1.02, q);
  h = lerp(h, 27.2, 1 - smoothstep(7.5, 14, Math.hypot(lx, lz)));
  h = lerp(h, 12.6, 1 - smoothstep(7, 13, Math.hypot(lx, lz - 22)));
  h = lerp(h, 22.4, 1 - smoothstep(6, 11, Math.hypot(lx - 18, lz + 16)));
  return Math.max(0, h);
}

export function heightAt(x, z) {
  return terrainLocal(x - MOUNTAIN.x, z - MOUNTAIN.z);
}

export function addPlaque(group, text, x, y, z, w, ry = 0) {
  if (!text) return;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 0.3125), plaqueMaterial(text));
  mesh.position.set(x, y, z);
  mesh.rotation.y = ry;
  group.add(mesh);
}

export function addCouplet(group, text, x, y, z, ry = 0, h = 1.7) {
  if (!text) return;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.36, h), coupletMaterial(text));
  mesh.position.set(x, y, z);
  mesh.rotation.y = ry;
  group.add(mesh);
}

export function addCoupletPair(group, a, b, x, y, z, ry = 0, dx = 1.2) {
  addCouplet(group, a, x - dx, y, z, ry);
  addCouplet(group, b, x + dx, y, z, ry);
}

export function createMountain() {
  const group = new THREE.Group();
  const geo = new THREE.PlaneGeometry(MOUNTAIN.w, MOUNTAIN.d, 120, 74);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setY(i, terrainLocal(pos.getX(i), pos.getZ(i)));
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mats.mountain);
  mesh.position.set(MOUNTAIN.x, 0, MOUNTAIN.z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);

  const rocks = [];
  const shrubs = [];
  const rnd = (n) => {
    const v = Math.sin(n * 41.7 + 3.1) * 43758.5453;
    return v - Math.floor(v);
  };
  for (let i = 0; i < 48; i++) {
    const lx = (rnd(i) - 0.5) * 128;
    const lz = (rnd(i + 20) - 0.5) * 76;
    const y = terrainLocal(lx, lz);
    if (y < 2.6) continue;
    const s = 0.9 + rnd(i + 40) * 2.7;
    const r = new THREE.DodecahedronGeometry(s, 0);
    r.scale(1.1, 0.8 + rnd(i + 60) * 1.0, 0.95);
    r.rotateY(rnd(i + 80) * 6.28);
    r.translate(MOUNTAIN.x + lx, y + s * 0.35, MOUNTAIN.z + lz);
    rocks.push(r);
    if (i % 2 === 0) {
      const b = new THREE.IcosahedronGeometry(1.0 + rnd(i + 150) * 1.2, 1);
      b.scale(1.25, 0.5, 1.15);
      b.translate(MOUNTAIN.x + lx, y + 0.35, MOUNTAIN.z + lz);
      shrubs.push(b);
    }
  }
  const rm = mergedMesh(rocks, mats.cliff, true, true);
  if (rm) group.add(rm);
  const sm = mergedMesh(shrubs, mats.shrub, true, true);
  if (sm) group.add(sm);

  const wallList = [];
  for (let lx = -66; lx <= 54; lx += 6.5) {
    const lz = 39 - Math.abs(lx) * 0.055;
    const y = terrainLocal(lx, lz);
    addBox(wallList, 6.6, 2.6 + y * 0.12, 0.9, MOUNTAIN.x + lx, y + 1.3, MOUNTAIN.z + lz);
    addBox(wallList, 6.8, 0.24, 1.12, MOUNTAIN.x + lx, y + 2.7, MOUNTAIN.z + lz);
  }
  const wm = mergedMesh(wallList, mats.wallRed, true, true);
  if (wm) group.add(wm);
  const capList = [];
  for (let lx = -66; lx <= 54; lx += 13) {
    const lz = 39 - Math.abs(lx) * 0.055;
    const y = terrainLocal(lx, lz);
    addBox(capList, 13.1, 0.18, 1.35, MOUNTAIN.x + lx + 3.25, y + 2.86, MOUNTAIN.z + lz);
  }
  const cm = mergedMesh(capList, mats.roofGold, true, false);
  if (cm) group.add(cm);
  return group;
}

function polyRoofGeometry(R, H, sides = 8, segU = 6, segV = 7) {
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
        const lift = 0.55 * Math.pow(Math.abs(u * 2 - 1), 5) * Math.pow(v, 3);
        const r = R * v;
        positions.push(Math.cos(a) * r, H * Math.pow(1 - v, 1.55) + lift, Math.sin(a) * r);
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

function addOctRoof(group, R, H, y, sides = 8) {
  const mesh = new THREE.Mesh(polyRoofGeometry(R, H, sides), mats.roofGold);
  mesh.position.y = y;
  mesh.castShadow = true;
  group.add(mesh);

  const dark = [];
  const gold = [];
  const step = (Math.PI * 2) / sides;
  for (let k = 0; k < sides; k++) {
    const a = k * step;
    const pts = [];
    for (let i = 0; i <= 8; i++) {
      const v = i / 8;
      pts.push(new THREE.Vector3(Math.cos(a) * R * v, H * Math.pow(1 - v, 1.55), Math.sin(a) * R * v));
    }
    dark.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.14, 4, false));
    const tip = new THREE.ConeGeometry(0.13, 0.34, 5);
    tip.translate(Math.cos(a) * R, 0.1, Math.sin(a) * R);
    gold.push(tip);
    const bell = new THREE.SphereGeometry(0.09, 6, 4);
    bell.translate(Math.cos(a) * (R + 0.12), -0.24, Math.sin(a) * (R + 0.12));
    gold.push(bell);
  }
  const dm = mergedMesh(dark, mats.roofDark, true, false);
  if (dm) {
    dm.position.y = y;
    group.add(dm);
  }
  const gm = mergedMesh(gold, mats.gold, false, false);
  if (gm) {
    gm.position.y = y;
    group.add(gm);
  }
}

function octTier(group, { y, radius, wallH, roofH, tier = 1 }) {
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.02, wallH, 8), mats.wallRed);
  wall.position.y = y + wallH / 2;
  wall.castShadow = true;
  wall.receiveShadow = true;
  group.add(wall);

  const cols = [];
  const beams = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    addCylinder(cols, 0.19, 0.22, wallH, 8, Math.cos(a) * (radius + 0.12), y + wallH / 2, Math.sin(a) * (radius + 0.12));
    addBox(beams, 0.34, 0.3, 0.34, Math.cos(a) * radius, y + wallH - 0.28, Math.sin(a) * radius, a);
  }
  const cm = mergedMesh(cols, mats.timberRed, true, true);
  if (cm) group.add(cm);
  const bm = mergedMesh(beams, mats.painting, true, false);
  if (bm) group.add(bm);

  const lattice = [];
  const geo = new THREE.PlaneGeometry(1, 1);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const win = new THREE.Mesh(geo, mats.lattice);
    win.position.set(
      Math.cos(a + Math.PI / 8) * (radius + 0.06),
      y + wallH * 0.5,
      Math.sin(a + Math.PI / 8) * (radius + 0.06)
    );
    win.rotation.y = -(a + Math.PI / 8) + Math.PI / 2;
    win.scale.set(radius * 0.68, wallH * 0.62, 1);
    group.add(win);
    addBox(
      lattice,
      0.08,
      wallH * 0.7,
      0.12,
      Math.cos(a + Math.PI / 8) * (radius + 0.13),
      y + wallH * 0.5,
      Math.sin(a + Math.PI / 8) * (radius + 0.13),
      -(a + Math.PI / 8) + Math.PI / 2
    );
  }
  const lm = mergedMesh(lattice, mats.wallDark, false, false);
  if (lm) group.add(lm);

  const floor = new THREE.Mesh(new THREE.CylinderGeometry(radius + 1.55, radius + 1.7, 0.34, 8), mats.marbleShade);
  floor.position.y = y - 0.17;
  floor.rotation.y = Math.PI / 8;
  floor.castShadow = true;
  group.add(floor);

  const rails = [];
  for (let i = 0; i < 8; i++) {
    const a0 = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const a1 = ((i + 1) / 8) * Math.PI * 2 + Math.PI / 8;
    const x0 = Math.cos(a0) * (radius + 1.45);
    const z0 = Math.sin(a0) * (radius + 1.45);
    const x1 = Math.cos(a1) * (radius + 1.45);
    const z1 = Math.sin(a1) * (radius + 1.45);
    addBox(rails, 0.18, 0.9, 0.18, x0, y + 0.45, z0);
    addBar(rails, x0, z0, x1, z1, y + 0.9, 0.1, 0.12);
  }
  const rm = mergedMesh(rails, mats.marble, true, true);
  if (rm) group.add(rm);
  addOctRoof(group, radius + 2.4, roofH, y + wallH, 8);

  if (tier === 1) {
    addPlaque(group, '佛香阁', 0, y + wallH - 0.55, radius + 0.36, 2.4);
    addCoupletPair(group, '云移莲势出', '塔影雁行高', 0, y + wallH * 0.56, radius + 0.38, 0, 1.04);
  }
}

export function createFoxiangGe(x, z) {
  const group = new THREE.Group();
  const baseY = heightAt(x, z);
  const platform = new THREE.Mesh(new THREE.CylinderGeometry(15.5, 17, 2.6, 8), mats.marble);
  platform.position.y = baseY + 1.3;
  platform.rotation.y = Math.PI / 8;
  platform.castShadow = true;
  platform.receiveShadow = true;
  group.add(platform);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(16, 16.1, 0.3, 8), mats.marbleShade);
  band.position.y = baseY + 2.55;
  band.rotation.y = Math.PI / 8;
  group.add(band);

  const steps = [];
  for (let i = 0; i < 8; i++) {
    addBox(steps, 12 - i * 0.7, 0.4, 1.2, 0, baseY + 0.2 + i * 0.3, 17.2 - i * 0.55);
  }
  const sm = mergedMesh(steps, mats.marbleShade, true, true);
  if (sm) group.add(sm);

  const y0 = baseY + 2.6;
  octTier(group, { y: y0, radius: 9.2, wallH: 5.4, roofH: 3.5, tier: 1 });
  octTier(group, { y: y0 + 8.9, radius: 7.7, wallH: 4.7, roofH: 3.2, tier: 2 });
  octTier(group, { y: y0 + 15.8, radius: 6.2, wallH: 4.2, roofH: 3.0, tier: 3 });

  const tipY = y0 + 22.9;
  const gold = [];
  addCylinder(gold, 0.28, 0.5, 1.1, 8, 0, tipY + 0.55, 0);
  const ball = new THREE.SphereGeometry(0.62, 12, 9);
  ball.translate(0, tipY + 1.55, 0);
  gold.push(ball);
  const spire = new THREE.ConeGeometry(0.34, 3.2, 8);
  spire.translate(0, tipY + 3.1, 0);
  gold.push(spire);
  for (const r of [0.9, 0.68, 0.46]) {
    const ring = new THREE.TorusGeometry(r, 0.09, 5, 14);
    ring.rotateX(Math.PI / 2);
    ring.translate(0, tipY + 2.1, 0);
    gold.push(ring);
  }
  const gm = mergedMesh(gold, mats.gold, true, false);
  if (gm) group.add(gm);

  const terrace = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    addCylinder(terrace, 0.16, 0.2, 1.1, 6, Math.cos(a) * 15.9, baseY + 3.15, Math.sin(a) * 15.9);
    addBox(terrace, 0.3, 0.18, 0.3, Math.cos(a) * 15.9, baseY + 3.75, Math.sin(a) * 15.9);
  }
  const tm = mergedMesh(terrace, mats.marble, true, false);
  if (tm) group.add(tm);

  for (const a of [0.4, 2.3, 4.4, 5.7]) {
    const lantern = createHangingLantern({
      x: Math.cos(a) * 12.5,
      y: baseY + 6.8,
      z: Math.sin(a) * 12.5,
      scale: 1.1,
    });
    group.add(lantern);
  }

  group.position.set(x, 0, z);
  return group;
}

export function createPalace({
  x = 0,
  z = 0,
  y = 0,
  rot = 0,
  w = 26,
  d = 14,
  wallH = 5.2,
  roofH = 5.2,
  eave = 3.0,
  baseH = 1.1,
  bays = 5,
  name = '',
  roofMat = mats.roofGold,
  wallMat = mats.wallRed,
  couplets = [],
  railing = true,
}) {
  const group = new THREE.Group();
  const bw = w + 4.4;
  const bd = d + 4.4;
  const base = new THREE.Mesh(new THREE.BoxGeometry(bw, baseH, bd), mats.marbleShade);
  base.position.y = baseH / 2;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);
  const edge = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.35, 0.18, bd + 0.35), mats.marble);
  edge.position.y = baseH - 0.02;
  edge.receiveShadow = true;
  group.add(edge);
  const st = createStairs({ width: w * 0.4, depth: 2.8, height: baseH, steps: 5, rampWidth: 0 });
  st.position.set(0, 0, bd / 2);
  group.add(st);
  if (railing) {
    const rail = createBalustrade({ w: bw + 0.5, d: bd + 0.5, gapFront: w * 0.46 });
    rail.position.y = baseH;
    group.add(rail);
  }

  const body = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, d), wallMat);
  body.position.y = baseH + wallH / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const bayW = w / bays;
  const cols = [];
  const drums = [];
  for (let i = 0; i <= bays; i++) {
    const px = -w / 2 + i * bayW;
    addCylinder(cols, 0.2, 0.24, wallH, 8, px, baseH + wallH / 2, d / 2 + 0.22);
    addCylinder(cols, 0.2, 0.24, wallH, 8, px, baseH + wallH / 2, -d / 2 - 0.22);
    addCylinder(drums, 0.31, 0.36, 0.18, 8, px, baseH + 0.09, d / 2 + 0.22);
    addCylinder(drums, 0.31, 0.36, 0.18, 8, px, baseH + 0.09, -d / 2 - 0.22);
  }
  const cm = mergedMesh(cols, mats.timberRed, true, true);
  if (cm) group.add(cm);
  const dm = mergedMesh(drums, mats.stone, true, true);
  if (dm) group.add(dm);

  const lattice = [];
  const geo = new THREE.PlaneGeometry(1, 1);
  for (let i = 0; i < bays; i++) {
    const px = -w / 2 + bayW * (i + 0.5);
    const door = new THREE.Mesh(geo, mats.lattice);
    door.position.set(px, baseH + wallH * 0.42, d / 2 + 0.1);
    door.scale.set(bayW * 0.76, wallH * 0.64, 1);
    group.add(door);
    for (const off of [-0.28, 0, 0.28]) {
      addBox(lattice, 0.07, wallH * 0.6, 0.06, px + bayW * off, baseH + wallH * 0.42, d / 2 + 0.16);
    }
  }
  const lm = mergedMesh(lattice, mats.wallDark, false, false);
  if (lm) group.add(lm);

  const beams = [];
  addBox(beams, w + 0.9, 0.34, d + 0.9, 0, baseH + wallH - 0.42, 0);
  addBox(beams, w + 0.7, 0.2, d + 0.7, 0, baseH + wallH * 0.72, 0);
  addBox(beams, w + 0.7, 0.32, d + 0.7, 0, baseH + 0.16, 0);
  const bm = mergedMesh(beams, mats.painting, true, true);
  if (bm) group.add(bm);

  const brackets = [];
  for (let i = 0; i <= bays * 2; i++) {
    const px = -w / 2 + (i * w) / (bays * 2);
    addBox(brackets, 0.2, 0.35, 0.26, px, baseH + wallH - 0.1, d / 2 + 0.22);
    addBox(brackets, 0.8, 0.12, 0.24, px, baseH + wallH + 0.1, d / 2 + 0.22);
    addBox(brackets, 1.0, 0.11, 0.22, px, baseH + wallH + 0.24, d / 2 + 0.22);
  }
  const bkm = mergedMesh(brackets, mats.timberRed, true, false);
  if (bkm) group.add(bkm);

  const roof = createRoof({
    width: w + eave * 2,
    depth: d + eave * 2,
    height: roofH,
    cornerLift: 1.75,
    curve: 1.55,
    ridgeRatio: 0.58,
    hasRidge: true,
    beasts: true,
  });
  roof.position.y = baseH + wallH;
  roof.traverse((o) => {
    if (o.isMesh && o.material === mats.roof) o.material = roofMat;
  });
  group.add(roof);

  if (name) addPlaque(group, name, 0, baseH + wallH - 0.7, d / 2 + 0.4, 2.8);
  if (couplets.length) addCoupletPair(group, couplets[0], couplets[1], 0, baseH + wallH * 0.55, d / 2 + 0.42, 0, w * 0.26);

  group.position.set(x, y, z);
  group.rotation.y = rot;
  return group;
}

export function createLongCorridor(x, z, length = 108) {
  const group = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(length, 0.42, 5.6), mats.marbleShade);
  base.position.y = 0.21;
  base.receiveShadow = true;
  group.add(base);
  const floor = [];
  for (let px = -length / 2 + 0.8; px < length / 2; px += 1.2) {
    addBox(floor, 0.06, 0.02, 4.9, px, 0.43, 0);
  }
  const fm = mergedMesh(floor, mats.stone, false, true);
  if (fm) group.add(fm);

  const posts = [];
  const rails = [];
  const beams = [];
  const n = Math.round(length / 4.2);
  for (let i = 0; i <= n; i++) {
    const px = -length / 2 + (i * length) / n;
    for (const sz of [-1, 1]) {
      addCylinder(posts, 0.16, 0.2, 3.8, 8, px, 2.32, sz * 2.1);
      addBox(rails, 0.08, 0.1, 1.05, px, 3.9, sz * 2.1);
      addBox(rails, 0.24, 0.14, 0.28, px, 4.24, sz * 2.1);
      if (i < n) {
        addBar(rails, px, -2.1, px + length / n, -2.1, 1.1, 0.1, 0.12);
        addBar(rails, px, 2.1, px + length / n, 2.1, 1.1, 0.1, 0.12);
        addBar(rails, px, -2.1, px + length / n, -2.1, 3.6, 0.12, 0.16);
        addBar(rails, px, 2.1, px + length / n, 2.1, 3.6, 0.12, 0.16);
      }
    }
  }
  for (let i = 0; i < n; i++) {
    const px = -length / 2 + ((i + 0.5) * length) / n;
    addBox(beams, length / n, 0.16, 4.7, px, 4.15, 0);
    addBox(beams, length / n, 0.12, 4.4, px, 3.62, 0);
    for (const sz of [-1, 1]) {
      addBox(beams, length / n - 0.15, 0.55, 0.08, px, 3.85, sz * 2.13);
    }
  }
  const pm = mergedMesh(posts, mats.timberRed, true, true);
  if (pm) group.add(pm);
  const rm = mergedMesh(rails, mats.timberRed, true, true);
  if (rm) group.add(rm);
  const bm = mergedMesh(beams, mats.painting, true, false);
  if (bm) group.add(bm);

  const roof = createRoof({
    width: length + 2.2,
    depth: 6.8,
    height: 1.8,
    cornerLift: 0.65,
    curve: 1.32,
    ridgeRatio: 0.18,
    hasRidge: true,
    beasts: false,
  });
  roof.position.y = 4.3;
  roof.traverse((o) => {
    if (o.isMesh && o.material === mats.roof) o.material = mats.roofGold;
  });
  group.add(roof);

  const lanterns = [];
  for (let px = -length / 2 + 4; px < length / 2; px += 8) {
    lanterns.push(px);
  }
  for (const px of lanterns) {
    group.add(createHangingLantern({ x: px, y: 3.45, z: 1.5, scale: 0.82 }));
  }
  for (const [px, label] of [
    [-39, '山水'], [-15, '花鸟'], [9, '人物'], [33, '楼阁'],
  ]) {
    addPlaque(group, label, px, 3.12, 2.46, 1.0);
  }
  group.position.set(x, 0, z);
  return group;
}

export function createSeventeenBridge(ax, az, bx, bz) {
  const group = new THREE.Group();
  const dx = bx - ax;
  const dz = bz - az;
  const length = Math.hypot(dx, dz);
  const width = 7.6;
  const deckY = (t) => 1.9 + 2.7 * Math.sin(Math.PI * t);

  const shape = new THREE.Shape();
  shape.moveTo(-length / 2, 0);
  shape.lineTo(length / 2, 0);
  shape.lineTo(length / 2, deckY(1) - 0.28);
  const count = 17;
  for (let i = count - 1; i >= 0; i--) {
    const t = (i + 0.5) / count;
    shape.lineTo(-length / 2 + length * t, deckY(t) - 0.28);
  }
  shape.closePath();
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    const edge = Math.min(t, 1 - t);
    const r = 0.68 + Math.min(0.62, edge * 2.6);
    const cx = -length / 2 + length * t;
    const hole = new THREE.Path();
    hole.absarc(cx, 0.16, r, 0, Math.PI, false);
    shape.holes.push(hole);
  }
  const wallGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.55, bevelEnabled: false, curveSegments: 8 });
  for (const side of [-1, 1]) {
    const wall = new THREE.Mesh(wallGeo.clone(), mats.stone);
    wall.position.z = side * (width / 2 - 0.27);
    wall.castShadow = true;
    wall.receiveShadow = true;
    group.add(wall);
  }
  wallGeo.dispose();

  const deck = [];
  const joints = [];
  const piers = [];
  const segs = 40;
  for (let i = 0; i < segs; i++) {
    const t0 = i / segs;
    const t1 = (i + 1) / segs;
    const x0 = -length / 2 + length * t0;
    const x1 = -length / 2 + length * t1;
    const y0 = deckY(t0);
    const y1 = deckY(t1);
    const g = new THREE.BoxGeometry(x1 - x0 + 0.06, 0.26, width);
    g.rotateZ(-Math.atan2(y1 - y0, x1 - x0));
    g.translate((x0 + x1) / 2, (y0 + y1) / 2 - 0.13, 0);
    deck.push(g);
  }
  const dm = mergedMesh(deck, mats.stone, true, true);
  if (dm) group.add(dm);

  const rails = [];
  const lions = [];
  for (const sz of [-1, 1]) {
    const n = 22;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const px = -length / 2 + length * t;
      const py = deckY(t);
      addBox(rails, 0.24, 0.84, 0.24, px, py + 0.42, sz * (width / 2 - 0.16));
      addBox(rails, 0.34, 0.14, 0.34, px, py + 0.9, sz * (width / 2 - 0.16));
      if (i < n) {
        const t2 = (i + 1) / n;
        const px2 = -length / 2 + length * t2;
        const py2 = deckY(t2);
        addBar(rails, px, sz * (width / 2 - 0.16), px2, sz * (width / 2 - 0.16), (py + py2) / 2 + 0.72, 0.13, 0.18);
      }
      if (i % 3 === 1) {
        const s = 0.55;
        addBox(lions, 0.36, 0.18, 0.36, px, py + 0.98, sz * (width / 2 - 0.16));
        const body = new THREE.SphereGeometry(0.2, 7, 5);
        body.scale(1, 1.15, 0.8);
        body.translate(px, py + 1.22, sz * (width / 2 - 0.16));
        lions.push(body);
        const head = new THREE.SphereGeometry(0.14, 7, 5);
        head.translate(px, py + 1.45, sz * (width / 2 - 0.16));
        lions.push(head);
      }
    }
  }
  const rm = mergedMesh(rails, mats.marble, true, true);
  if (rm) group.add(rm);
  const lm = mergedMesh(lions, mats.stone, true, true);
  if (lm) group.add(lm);

  for (let i = 0; i <= 34; i++) {
    const t = i / 34;
    const px = -length / 2 + length * t;
    addBox(joints, 0.1, 0.02, width - 0.2, px, deckY(t) + 0.015, 0);
  }
  const jm = mergedMesh(joints, mats.trimDark, false, false);
  if (jm) group.add(jm);

  for (let i = 0; i < 18; i++) {
    const t = (i + 0.5) / 17;
    const px = -length / 2 + length * t;
    const r = 0.68 + Math.min(0.62, Math.min(t, 1 - t) * 2.6);
    addBox(piers, 0.55, Math.max(0.6, deckY(t) - r - 0.2), width - 0.9, px, Math.max(0.3, (deckY(t) - r) * 0.5), 0);
  }
  const pmm = mergedMesh(piers, mats.stone, true, true);
  if (pmm) group.add(pmm);

  for (const sx of [-1, 1]) {
    const t = sx < 0 ? 0 : 1;
    const px = sx * (length / 2 + 1.4);
    const pedestal = [];
    addBox(pedestal, 1.0, 0.7, 1.0, px, 1.1, 0);
    const bigBody = new THREE.SphereGeometry(0.5, 8, 6);
    bigBody.scale(1, 1.15, 0.85);
    bigBody.translate(px, 2.0, 0);
    pedestal.push(bigBody);
    const bigHead = new THREE.SphereGeometry(0.34, 8, 6);
    bigHead.translate(px, 2.55, 0);
    pedestal.push(bigHead);
    const bm = mergedMesh(pedestal, mats.stone, true, true);
    if (bm) group.add(bm);
  }

  group.position.set((ax + bx) / 2, 0, (az + bz) / 2);
  group.rotation.y = Math.atan2(-dz, dx);
  return group;
}

export function createMarbleBoat(x, z, rot = 0) {
  const group = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.BoxGeometry(23, 2.4, 8.4), mats.marble);
  hull.position.y = 1.0;
  hull.castShadow = true;
  group.add(hull);
  const bow = new THREE.Mesh(new THREE.ConeGeometry(4.2, 5.2, 4), mats.marble);
  bow.rotation.z = -Math.PI / 2;
  bow.rotation.y = Math.PI / 4;
  bow.scale.set(1, 1, 0.62);
  bow.position.set(13.4, 1.2, 0);
  bow.castShadow = true;
  group.add(bow);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(20, 0.3, 7.2), mats.marbleShade);
  deck.position.y = 2.3;
  group.add(deck);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(14, 3.0, 5.4), mats.wallRed);
  cabin.position.set(-1.2, 3.9, 0);
  cabin.castShadow = true;
  group.add(cabin);
  const cols = [];
  for (let i = 0; i <= 6; i++) {
    const px = -7.8 + i * 2.35;
    for (const sz of [-1, 1]) addCylinder(cols, 0.16, 0.19, 3.0, 8, px, 3.9, sz * 2.85);
  }
  const cm = mergedMesh(cols, mats.timberRed, true, true);
  if (cm) group.add(cm);

  const roof = createRoof({
    width: 18,
    depth: 8,
    height: 3.0,
    cornerLift: 1.2,
    curve: 1.4,
    ridgeRatio: 0.55,
    hasRidge: true,
    beasts: true,
  });
  roof.position.set(-1.2, 5.4, 0);
  roof.traverse((o) => {
    if (o.isMesh && o.material === mats.roof) o.material = mats.roofGold;
  });
  group.add(roof);
  addPlaque(group, '石舫', -1.2, 5.0, 2.92, 2.2);

  const wheels = [];
  for (const sx of [-1, 1]) {
    const wheel = new THREE.CylinderGeometry(2.0, 2.0, 0.38, 16);
    wheel.rotateZ(Math.PI / 2);
    wheel.translate(-5.5, 0.9, sx * 4.5);
    wheels.push(wheel);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      addBox(wheels, 0.12, 3.6, 0.16, -5.5, 0.9 + Math.sin(a) * 1.7, sx * 4.5 + Math.cos(a) * 1.7);
    }
  }
  const wm = mergedMesh(wheels, mats.marbleShade, true, true);
  if (wm) group.add(wm);

  const details = [];
  for (let i = 0; i < 6; i++) {
    addBox(details, 0.45, 0.7, 0.45, 10.4, 2.4, -2.6 + i * 1.0);
  }
  const dm = mergedMesh(details, mats.marble, true, true);
  if (dm) group.add(dm);

  group.position.set(x, 0, z);
  group.rotation.y = rot;
  return group;
}

export function createSuzhouStreet() {
  const group = new THREE.Group();
  const floorList = [];
  for (let i = 0; i < 9; i++) {
    const z = -54 + i * 5.2;
    addBox(floorList, 10, 0.22, 5.4, -111, 0.12, z);
  }
  const fm = mergedMesh(floorList, mats.path, false, true);
  if (fm) group.add(fm);

  for (let i = 0; i < 8; i++) {
    const z = -56 + i * 5.1;
    const w = 8.4;
    const d = 4.0;
    const shop = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, 4.2, d), mats.wallRed);
    body.position.y = 2.35;
    body.castShadow = true;
    shop.add(body);
    const upper = new THREE.Mesh(new THREE.BoxGeometry(w - 0.7, 2.2, d - 0.5), mats.wallVermilion);
    upper.position.y = 5.55;
    upper.castShadow = true;
    shop.add(upper);
    const roof = createRoof({
      width: w + 1.4,
      depth: d + 1.4,
      height: 1.6,
      cornerLift: 0.55,
      curve: 1.35,
      ridgeRatio: 0.35,
      hasRidge: true,
      beasts: false,
    });
    roof.position.y = 6.65;
    shop.add(roof);
    const door = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.7, 2.2), mats.lattice);
    door.position.set(0, 1.55, d / 2 + 0.03);
    shop.add(door);
    addPlaque(shop, ['茶', '绸', '扇', '药', '书', '酒', '糕', '灯'][i], 0, 3.7, d / 2 + 0.06, 1.1);
    shop.position.set(-106.2, 0, z);
    shop.rotation.y = Math.PI / 2;
    group.add(shop);
  }

  const canal = new THREE.Mesh(new THREE.PlaneGeometry(8, 48), mats.blue);
  canal.rotation.x = -Math.PI / 2;
  canal.position.set(-99.5, 0.08, -34);
  canal.receiveShadow = true;
  group.add(canal);

  for (let i = 0; i < 7; i++) {
    group.add(createHangingLantern({ x: -99.8, y: 3.0, z: -55 + i * 6.3, scale: 0.86 }));
  }
  for (const z of [-48, -34]) {
    const bridge = createArchBridge({ span: 6.2, width: 5.4, rise: 1.1, x: -99.5, z, rot: 0 });
    group.add(bridge);
  }
  const rocks = [];
  for (let i = 0; i < 5; i++) {
    const r = new THREE.DodecahedronGeometry(1.1 + i * 0.18, 0);
    r.translate(-119 + i * 1.8, 1.0, -14 - (i % 2) * 2.2);
    rocks.push(r);
  }
  const rm = mergedMesh(rocks, mats.cliff, true, true);
  if (rm) group.add(rm);
  return group;
}

export function createNanhuIsland(x, z, radius = 17) {
  const group = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius + 0.9, 1.3, 48), mats.stone);
  base.position.set(x, 0.65, z);
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);
  const top = new THREE.Mesh(new THREE.CircleGeometry(radius - 0.1, 48), mats.grass);
  top.rotation.x = -Math.PI / 2;
  top.position.set(x, 1.31, z);
  top.receiveShadow = true;
  group.add(top);
  const paving = new THREE.Mesh(new THREE.CircleGeometry(9.5, 32), mats.path);
  paving.rotation.x = -Math.PI / 2;
  paving.position.set(x, 1.325, z);
  paving.receiveShadow = true;
  group.add(paving);

  group.add(createPalace({
    x, z, y: 1.32, w: 20, d: 11, wallH: 4.8, roofH: 4.6, baseH: 0.9,
    name: '涵虚堂', roofMat: mats.roofGold, couplets: ['湖光浮碧落', '山色入虚堂'],
  }));
  group.add(createPalace({
    x: x - 12, z: z + 7, y: 1.32, rot: Math.PI / 2, w: 9, d: 6.4,
    wallH: 3.4, roofH: 3.2, baseH: 0.6, name: '月波楼', roofMat: mats.roofGreen, railing: false,
  }));
  group.add(createPalace({
    x: x + 12, z: z - 6, y: 1.32, rot: -Math.PI / 2, w: 8, d: 6,
    wallH: 3.2, roofH: 3.0, baseH: 0.6, name: '鉴远亭', roofMat: mats.roofGold, railing: false,
  }));

  for (const [px, pz, s] of [[x - 12, z - 9, 1.3], [x + 9, z + 8, 1.0], [x + 2, z - 12, 0.9]]) {
    const rock = createTaihuRock({ x: px, z: pz, scale: s, seed: px + pz });
    rock.position.y = 1.3;
    group.add(rock);
  }
  for (const [px, pz] of [[x - 14, z - 2], [x + 14, z + 2], [x - 3, z + 13], [x + 4, z - 13]]) {
    const w = createWillow({ height: 7.2, spread: 2.4, seed: px * 0.3 + pz });
    w.position.set(px, 1.3, pz);
    group.add(w);
  }
  for (const [px, pz] of [[x - 8, z + 10], [x + 8, z + 10], [x - 13, z - 5]]) {
    group.add(createStoneLantern({ x: px, z: pz, scale: 0.9 }));
  }
  return group;
}

export function createCauseway() {
  const group = new THREE.Group();
  const segs = [];
  const tops = [];
  const centers = [];
  for (let i = 0; i < 6; i++) {
    const z0 = -8 + i * 21;
    const z1 = z0 + 15;
    centers.push((z0 + z1) / 2);
    const g = new THREE.BoxGeometry(9, 0.9, 15);
    g.translate(-92, 0.45, (z0 + z1) / 2);
    segs.push(g);
    const t = new THREE.BoxGeometry(8.2, 0.1, 15);
    t.translate(-92, 0.91, (z0 + z1) / 2);
    tops.push(t);
  }
  const sm = mergedMesh(segs, mats.stone, true, true);
  if (sm) group.add(sm);
  const tm = mergedMesh(tops, mats.grass, false, true);
  if (tm) group.add(tm);

  for (let i = 0; i < 5; i++) {
    const z = 10 + i * 21;
    group.add(createArchBridge({ span: 6.2, width: 10, rise: 1.25, x: -92, z, rot: 0 }));
    group.add(createHangingLantern({ x: -92, y: 2.5, z, scale: 0.82 }));
  }

  centers.forEach((z, i) => {
    const willow = createWillow({ height: 7.8 + (i % 2) * 0.7, spread: 2.7, seed: i + 31 });
    willow.position.set(-92 + (i % 2 ? 2.4 : -2.6), 0.9, z);
    group.add(willow);
    const tree = createTree({ height: 7.4, spread: 2.6, kind: i % 2 ? 'pine' : 'broad', seed: i + 80 });
    tree.position.set(-92 + (i % 2 ? -2.2 : 2.4), 0.9, z + 4);
    group.add(tree);
  });
  return group;
}

export function createLakeRocks() {
  const group = new THREE.Group();
  for (const [x, z, s, seed] of [
    [-70, 6, 1.2, 3], [-58, 12, 0.9, 9], [22, 98, 1.1, 15],
    [72, 92, 1.3, 21], [104, 68, 1.0, 27], [-28, 96, 0.8, 33],
  ]) {
    const r = createTaihuRock({ x, z, scale: s, seed, cave: seed % 2 === 0 });
    group.add(r);
  }
  return group;
}

export function createShoreDetails() {
  const group = new THREE.Group();
  for (const [x, z, r, c, s] of [
    [-52, 8, 6, 20, 2], [-26, 4, 8, 26, 5], [4, 2, 7, 22, 8],
    [30, 4, 6, 18, 11], [58, 10, 5, 16, 14], [82, 22, 6, 19, 17],
    [-70, 28, 7, 24, 20], [-68, 62, 6, 18, 23], [-20, 100, 7, 22, 26],
    [16, 98, 6, 20, 29], [50, 84, 5, 16, 32], [88, 76, 6, 18, 35],
    [40, 45, 4, 14, 38], [47, 61, 4, 13, 41], [-43, 35, 4, 13, 44],
  ]) {
    group.add(createLotus({ x, z, radius: r, count: c, seed: s }));
  }
  return group;
}
