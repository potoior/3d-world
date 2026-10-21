import * as THREE from 'three';
import { mats, makePlaqueMaterial } from './putuoshanTextures.js';
import { mesh, box, cyl, mergeBoxes, mulberry32, colorize } from './psUtil.js';

export function createPagoda({ tiers = 5, radius = 6.4, height = 3.0, name = '' } = {}) {
  const g = new THREE.Group();
  cyl(g, mats.stone, radius + 2.4, radius + 3.2, 1.6, 20, 0, 0.8, 0);
  cyl(g, mats.stoneDark, radius + 1.4, radius + 1.8, 0.5, 20, 0, 1.75, 0);
  let y = 2.0;
  for (let i = 0; i < tiers; i++) {
    const r = radius - i * (radius * 0.1);
    const h = height - i * 0.18;
    cyl(g, i % 2 ? mats.wallDeep : mats.wall, r * 0.94, r, h, 8, 0, y + h * 0.5, 0, Math.PI / 8);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
      box(g, mats.lattice, 0.5, h * 0.58, 0.12, Math.cos(a) * (r + 0.02), y + h * 0.48, Math.sin(a) * (r + 0.02), Math.PI * 0.5 - a);
    }
    const roof = new THREE.ConeGeometry(1, 1, 8);
    roof.scale(r * 1.3, 1.55 + i * 0.06, r * 1.3);
    roof.translate(0, y + h + 0.62, 0);
    mesh(g, roof, mats.roofGray);
    const ring = new THREE.TorusGeometry(r * 1.16, 0.08, 4, 16);
    ring.rotateX(Math.PI * 0.5);
    ring.translate(0, y + h + 0.12, 0);
    mesh(g, ring, mats.gold, false, false);
    y += h + 1.0;
  }
  cyl(g, mats.gold, 0.06, 0.5, 2.8, 8, 0, y + 1.0, 0);
  cyl(g, mats.gold, 0, 0.62, 1.0, 8, 0, y + 2.9, 0);
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.TorusGeometry(0.55 - i * 0.1, 0.07, 4, 12);
    ring.rotateX(Math.PI * 0.5);
    ring.translate(0, y + 1.7 + i * 0.34, 0);
    mesh(g, ring, mats.gold, false, false);
  }
  if (name) {
    const plaque = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.7), makePlaqueMaterial(name));
    plaque.position.set(0, 2.7, radius + 0.55);
    g.add(plaque);
  }
  return g;
}

export function createIncenseBurner(scale = 1) {
  const g = new THREE.Group();
  const s = scale;
  cyl(g, mats.stoneDark, 2.4 * s, 2.8 * s, 0.4 * s, 12, 0, 0.2 * s, 0);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.5;
    cyl(g, mats.bronzePatina, 0.28 * s, 0.36 * s, 1.6 * s, 7, Math.cos(a) * 1.35 * s, 1.05 * s, Math.sin(a) * 1.35 * s);
  }
  const body = new THREE.LatheGeometry([
    [1.1, 0], [2.0, 0.4], [2.35, 1.2], [2.2, 2.0], [1.7, 2.55], [1.35, 2.8],
  ].map((p) => new THREE.Vector2(p[0] * s, p[1] * s + 0.5 * s)), 20);
  mesh(g, body, mats.bronze);
  for (const sx of [-1, 1]) {
    const handle = new THREE.TorusGeometry(0.55 * s, 0.11 * s, 5, 10, Math.PI);
    handle.rotateY(Math.PI * 0.5);
    handle.translate(sx * 2.2 * s, 3.0 * s, 0);
    mesh(g, handle, mats.bronzeLight);
  }
  const lid = new THREE.ConeGeometry(1.9 * s, 1.25 * s, 16, 1, true);
  lid.translate(0, 3.9 * s, 0);
  mesh(g, lid, mats.bronzeLight);
  cyl(g, mats.gold, 0.18 * s, 0.42 * s, 1.0 * s, 8, 0, 4.85 * s, 0);
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.TorusGeometry((0.62 - i * 0.13) * s, 0.05 * s, 4, 10);
    ring.rotateX(Math.PI * 0.5);
    ring.translate(0, (4.15 + i * 0.25) * s, 0);
    mesh(g, ring, mats.gold, false, false);
  }
  g.userData.top = 5.4 * s;
  return g;
}

export function createLion(scale = 1) {
  const g = new THREE.Group();
  const s = scale;
  box(g, mats.stoneDark, 2.0 * s, 0.8 * s, 2.8 * s, 0, 0.4 * s, 0);
  const body = new THREE.SphereGeometry(1, 10, 7);
  body.scale(0.75 * s, 0.95 * s, 1.15 * s);
  body.translate(0, 1.55 * s, -0.15 * s);
  mesh(g, body, mats.stoneLight);
  const head = new THREE.SphereGeometry(0.85 * s, 10, 8);
  head.translate(0, 2.55 * s, 0.55 * s);
  mesh(g, head, mats.stoneLight);
  const mane = new THREE.IcosahedronGeometry(0.95 * s, 0);
  mane.scale(1.1, 1.0, 0.75);
  mane.translate(0, 2.52 * s, 0.2 * s);
  mesh(g, mane, mats.stoneDark);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      cyl(g, mats.stoneLight, 0.17 * s, 0.2 * s, 0.65 * s, 6, sx * 0.55 * s, 0.78 * s, sz * 0.75 * s);
    }
  }
  const ball = new THREE.SphereGeometry(0.4 * s, 8, 6);
  ball.translate(0.85 * s, 0.7 * s, 0.9 * s);
  mesh(g, ball, mats.stoneLight);
  return g;
}

export function createSeaStack({ radius = 12, height = 58, seed = 1 } = {}) {
  const g = new THREE.Group();
  const rand = mulberry32(seed);
  const geo = new THREE.CylinderGeometry(radius * 0.32, radius, height, 12, 14, false);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const k = (y + height * 0.5) / height;
    const a = Math.atan2(z, x);
    const r = 0.82 + 0.18 * Math.sin(a * 3 + k * 7) + 0.1 * Math.sin(a * 7 - k * 9);
    p.setXYZ(i, x * r + Math.sin(k * 3) * radius * 0.14, y, z * r + Math.cos(k * 2.4) * radius * 0.1);
  }
  geo.computeVertexNormals();
  colorize(geo, new THREE.Color(0x9d9c92), 0.18, seed);
  geo.translate(0, height * 0.5 - 8, 0);
  mesh(g, geo, mats.granite);
  for (let i = 0; i < 5; i++) {
    const k = 0.12 + rand() * 0.7;
    const y = -8 + height * k;
    const rr = radius * (1.05 - k * 0.58) + 1.5;
    const ledge = new THREE.CylinderGeometry(rr * 0.92, rr, 1.2 + rand() * 2.4, 9);
    ledge.translate(0, y, 0);
    colorize(ledge, new THREE.Color(i % 2 ? 0xb3ada0 : 0x8a8b82), 0.16, seed + i);
    mesh(g, ledge, i % 2 ? mats.graniteLight : mats.graniteDark);
  }
  for (let i = 0; i < 4; i++) {
    const rock = new THREE.DodecahedronGeometry(2.2 + rand() * 2.6, 0);
    rock.scale(1, 0.7, 1);
    rock.translate((rand() - 0.5) * radius * 0.5, height - 7 + rand() * 2, (rand() - 0.5) * radius * 0.5);
    mesh(g, rock, mats.graniteLight);
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const cone = new THREE.ConeGeometry(1.6 + rand() * 1.1, 3.4 + rand() * 2.4, 6);
    cone.translate(Math.cos(a) * radius * 0.22, height - 4.5, Math.sin(a) * radius * 0.22);
    mesh(g, cone, mats.pineDeep);
  }
  return g;
}

export function createBalancedRock({ scale = 1 } = {}) {
  const g = new THREE.Group();
  const s = scale;
  const base = new THREE.DodecahedronGeometry(7.5 * s, 1);
  const p = base.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const k = 1 + Math.sin(i * 2.7) * 0.12;
    p.setXYZ(i, p.getX(i) * k, p.getY(i) * 0.8, p.getZ(i) * k);
  }
  base.computeVertexNormals();
  base.translate(0, 4.2 * s, 0);
  colorize(base, new THREE.Color(0xa8a498), 0.18, 71);
  mesh(g, base, mats.granite);
  const top = new THREE.DodecahedronGeometry(6.2 * s, 1);
  const q = top.attributes.position;
  for (let i = 0; i < q.count; i++) {
    const k = 1 + Math.cos(i * 1.9) * 0.1;
    q.setXYZ(i, q.getX(i) * k * 1.05, q.getY(i) * 0.52, q.getZ(i) * k);
  }
  top.computeVertexNormals();
  top.translate(0, 13.2 * s, 0.6 * s);
  colorize(top, new THREE.Color(0xb8b2a2), 0.16, 72);
  mesh(g, top, mats.graniteLight);
  box(g, mats.graniteDark, 4.2 * s, 1.4 * s, 3.0 * s, 0, 9.0 * s, 0);
  return g;
}

export function createSteleSign(text) {
  const g = new THREE.Group();
  box(g, mats.stoneDark, 4.6, 0.5, 2.2, 0, 0.25, 0);
  box(g, mats.stoneLight, 3.2, 4.6, 0.55, 0, 2.6, 0);
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.82), makePlaqueMaterial(text));
  plaque.position.set(0, 3.0, 0.29);
  g.add(plaque);
  return g;
}

export function createPineSilhouette(seed = 1) {
  const g = new THREE.Group();
  const rand = mulberry32(seed);
  const h = 6 + rand() * 4;
  const trunk = new THREE.CylinderGeometry(0.22, 0.34, h, 5);
  trunk.translate(0, h * 0.5, 0);
  mesh(g, trunk, mats.trunk);
  for (let i = 0; i < 4; i++) {
    const r = 2.6 - i * 0.45;
    const cone = new THREE.ConeGeometry(r, 2.8, 6);
    cone.translate((rand() - 0.5) * 0.5, h * 0.58 + i * h * 0.11, (rand() - 0.5) * 0.5);
    mesh(g, cone, mats.pineDeep);
  }
  return g;
}

export function mergeSimple(list) {
  return mergeBoxes(list);
}
