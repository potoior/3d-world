import * as THREE from 'three';
import { MATS, TEX, rand, rr, geoBox, geoCyl, mergeParts, meshOf, pushColored } from './xijiangMaterials.js';
import { houseGeometries, personGeometries, treeGeometries, curvedRoofGeometry } from './xijiangParts.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const hash = (x, z) => {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

export function riverX(z) {
  return 10 * Math.sin(z * 0.011) + 6 * Math.sin(z * 0.027 + 1.2) + 3 * Math.sin(z * 0.063 + 0.4);
}
export function riverHalf(z) {
  return 13.5 + 2.2 * Math.sin(z * 0.019 + 1.1) + 1.1 * Math.sin(z * 0.047 - 0.6);
}
export const SQUARE = { x: riverX(70) + 34, z: 70, r: 25 };
export const BRIDGE_Z = -28;
export const SECOND_BRIDGE_Z = 158;

export function terrainHeight(x, z) {
  const rx = riverX(z);
  const half = riverHalf(z);
  const d = Math.abs(x - rx);
  let h;
  if (d < half) {
    h = -1.3 + 0.25 * Math.sin(z * 0.08 + x * 0.11);
  } else {
    const t = d - half;
    h = 0.072 * t + 0.00108 * t * t;
    h += Math.sin(x * 0.037 + z * 0.019) * (0.9 + t * 0.006);
    h += Math.sin(x * 0.091 - z * 0.043) * (0.35 + t * 0.0022);
    h += (hash(Math.floor(x * 0.35), Math.floor(z * 0.35)) - 0.5) * 0.5;
  }
  const back = smooth(-300, -520, z) * (90 + 25 * Math.sin(x * 0.011 + 0.8) + 16 * Math.sin(x * 0.027)) *
    smooth(0, 48, d - half);
  h += back;
  const sd = Math.hypot((x - SQUARE.x) / (SQUARE.r + 6), (z - SQUARE.z) / (SQUARE.r + 8));
  const sw = 1 - smooth(0.66, 1.02, sd);
  if (sw > 0) h = h * (1 - sw) + (1.62 + 0.04 * Math.sin(x * 0.3)) * sw;
  return h;
}

function makeTerrain() {
  const g = new THREE.PlaneGeometry(720, 980, 146, 204);
  g.rotateX(-Math.PI / 2);
  g.translate(0, 0, -70);
  const pos = g.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const y = terrainHeight(x, z);
    pos.setY(i, y);
    const n = hash(Math.floor(x * 0.18), Math.floor(z * 0.18));
    const n2 = hash(Math.floor(x * 0.7), Math.floor(z * 0.7));
    const d = Math.abs(x - riverX(z)) - riverHalf(z);
    let r;
    let gg;
    let b;
    if (d < 0) {
      r = 0.23 + n * 0.06;
      gg = 0.3 + n * 0.06;
      b = 0.26 + n * 0.05;
    } else if (d < 8) {
      r = 0.44 + n * 0.12;
      gg = 0.43 + n * 0.12;
      b = 0.34 + n * 0.1;
    } else {
      const green = 0.34 + n * 0.18 + n2 * 0.06 - smooth(45, 125, y) * 0.09;
      r = green * (0.72 + n2 * 0.2);
      gg = green * (0.95 + n2 * 0.1);
      b = green * (0.55 + n * 0.2);
    }
    c.setRGB(r, gg, b);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, MATS.terrain);
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  return mesh;
}

function makeRiver() {
  const pos = [];
  const uv = [];
  const idx = [];
  const N = 240;
  const z0 = -360;
  const z1 = 360;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const z = z0 + (z1 - z0) * t;
    const cx = riverX(z);
    const half = riverHalf(z) - 0.35;
    pos.push(cx - half, 0.12, z, cx + half, 0.12, z);
    uv.push(0, t * 40, 1, t * 40);
  }
  for (let i = 0; i < N; i++) {
    const a = i * 2;
    const b = a + 1;
    const c = a + 2;
    const d = a + 3;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, MATS.water);
  mesh.renderOrder = 2;
  return mesh;
}

function ribbonGeometry(points, width, yOffset = 0.06) {
  const pos = [];
  const uv = [];
  const idx = [];
  for (let i = 0; i < points.length; i++) {
    const [x, z] = points[i];
    const p = points[Math.min(points.length - 1, i + 1)];
    const q = points[Math.max(0, i - 1)];
    let dx = p[0] - q[0];
    let dz = p[1] - q[1];
    const len = Math.hypot(dx, dz) || 1;
    dx /= len;
    dz /= len;
    const nx = -dz;
    const nz = dx;
    const y = terrainHeight(x, z) + yOffset;
    pos.push(x - nx * width * 0.5, y, z - nz * width * 0.5, x + nx * width * 0.5, y, z + nz * width * 0.5);
    uv.push(0, i * 0.55, 1, i * 0.55);
  }
  for (let i = 0; i < points.length - 1; i++) {
    const a = i * 2;
    idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function makePaths() {
  const parts = [];
  for (const side of [-1, 1]) {
    const pts = [];
    for (let z = -310; z <= 310; z += 8) {
      const x = riverX(z) + side * (riverHalf(z) + 4.2 + 1.2 * Math.sin(z * 0.05));
      pts.push([x, z]);
    }
    parts.push(ribbonGeometry(pts, side > 0 ? 5.2 : 4.4, 0.1));
  }
  const laneZ = [-142, -58, 34, 126, 216];
  for (const side of [-1, 1]) {
    for (const lz of laneZ) {
      const pts = [];
      const start = riverX(lz) + side * (riverHalf(lz) + 5);
      for (let i = 0; i <= 24; i++) {
        const t = i / 24;
        const x = start + side * t * 148;
        const z = lz + Math.sin(t * 4.5 + lz * 0.02) * 5.5;
        pts.push([x, z]);
      }
      parts.push(ribbonGeometry(pts, 3.6, 0.12));
    }
  }
  for (const z of [BRIDGE_Z, SECOND_BRIDGE_Z]) {
    const pts = [];
    for (let x = -34; x <= 34; x += 4) pts.push([x, z + Math.sin(x * 0.1) * 0.5]);
    parts.push(ribbonGeometry(pts, 7.5, 0.14));
  }
  const mesh = meshOf(parts, MATS.paving, false, true);
  return mesh;
}

function makeRocks() {
  const geo = new THREE.DodecahedronGeometry(1, 0);
  const count = 360;
  const mesh = new THREE.InstancedMesh(geo, MATS.stone, count);
  mesh.frustumCulled = false;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const z = rr(-330, 330);
    const side = rand() < 0.5 ? -1 : 1;
    const x = riverX(z) + side * (riverHalf(z) + rr(-1.5, 2.2));
    const s = rr(0.35, 1.5);
    dummy.position.set(x, terrainHeight(x, z) + rr(-0.25, 0.15), z);
    dummy.rotation.set(rr(0, 3), rr(0, 6.28), rr(0, 3));
    dummy.scale.set(s * rr(0.9, 1.6), s * rr(0.45, 0.9), s * rr(0.9, 1.5));
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    const v = rr(0.68, 0.94);
    color.setRGB(v, v * 0.98, v * 0.92);
    mesh.setColorAt(i, color);
  }
  mesh.instanceColor.needsUpdate = true;
  return mesh;
}

function isExcluded(x, z) {
  const sd = Math.hypot((x - SQUARE.x) / (SQUARE.r + 8), (z - SQUARE.z) / (SQUARE.r + 10));
  if (sd < 1.05) return true;
  const rx = riverX(z);
  if (Math.abs(z - BRIDGE_Z) < 11 && Math.abs(x - rx) < 35) return true;
  if (Math.abs(z - SECOND_BRIDGE_Z) < 9 && Math.abs(x - rx) < 31) return true;
  const lanes = [-142, -58, 34, 126, 216];
  for (const lz of lanes) {
    if (Math.abs(z - lz) < 6.5 && Math.abs(x - rx) < 160) return true;
  }
  if (x > 148 && z < -45) return true;
  return false;
}

function buildHouses(root, refs) {
  const spots = [];
  for (const side of [-1, 1]) {
    for (let row = 0; row < 13; row++) {
      for (let z = -282; z <= 282; z += 16.3) {
        const zz = z + rr(-4.5, 4.5);
        const dist = riverHalf(zz) + 15 + row * 10.6 + rr(-3.2, 3.2);
        const xx = riverX(zz) + side * dist;
        if (isExcluded(xx, zz)) continue;
        const h = terrainHeight(xx, zz);
        if (h > 105 || h < -0.6) continue;
        const s = rr(0.82, 1.22);
        spots.push({
          x: xx,
          y: h - 0.55,
          z: zz,
          rot: (side > 0 ? -Math.PI / 2 : Math.PI / 2) + rr(-0.18, 0.18) + (row > 10 ? rr(-0.12, 0.12) : 0),
          sx: s,
          sy: rr(0.9, 1.18),
          sz: s * rr(0.9, 1.08),
        });
      }
    }
  }
  const geos = houseGeometries();
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  const defs = [
    ['wood', geos.wood, MATS.wood, 0.055],
    ['dark', geos.dark, MATS.dark, 0.02],
    ['stone', geos.stone, MATS.stone, 0.03],
    ['roof', geos.roof, MATS.roof, 0.035],
    ['window', geos.window, MATS.window, 0.02],
    ['lantern', geos.lantern, MATS.lantern, 0],
  ];
  for (const [key, geo, mat, variance] of defs) {
    const mesh = new THREE.InstancedMesh(geo, mat, spots.length);
    mesh.frustumCulled = false;
    mesh.castShadow = key !== 'window' && key !== 'lantern';
    mesh.receiveShadow = key !== 'window' && key !== 'lantern';
    mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    for (let i = 0; i < spots.length; i++) {
      const sp = spots[i];
      dummy.position.set(sp.x, sp.y, sp.z);
      dummy.rotation.set(0, sp.rot, 0);
      dummy.scale.set(sp.sx, sp.sy, sp.sz);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      if (key === 'lantern') {
        const v = rr(0.82, 1.05);
        color.setRGB(v, v * 0.9, v * 0.82);
      } else if (key === 'window') {
        const v = rr(0.82, 1.05);
        color.setRGB(v, v * 0.94, v * 0.84);
      } else {
        const v = 1 - variance + rand() * variance * 2;
        color.setRGB(v, v * rr(0.95, 1.02), v * rr(0.88, 0.98));
      }
      mesh.setColorAt(i, color);
    }
    mesh.instanceColor.needsUpdate = true;
    root.add(mesh);
    refs[key] = mesh;
  }
  refs.spots = spots;
  return spots;
}

function coneRoof(list, r, h, seg, x, y, z) {
  const g = new THREE.CylinderGeometry(r * 0.18, r, h, seg, 1, false);
  g.translate(x, y, z);
  list.push(g);
}

function buildDrumTower(root, refs) {
  const wood = [];
  const dark = [];
  const stone = [];
  const roof = [];
  const lantern = [];
  const banners = [];
  const x = SQUARE.x - 1;
  const z = SQUARE.z - 19;
  const y = terrainHeight(x, z);
  stone.push(geoCyl(9.4, 10.2, 1.8, 8, x, y + 0.9, z));
  stone.push(geoCyl(8.2, 8.8, 1.2, 8, x, y + 2.2, z));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    wood.push(geoCyl(0.34, 0.4, 4.2, 6, x + Math.cos(a) * 7.2, y + 4.6, z + Math.sin(a) * 7.2));
  }
  wood.push(geoCyl(7.6, 7.6, 0.5, 8, x, y + 6.4, z));
  for (let tier = 0; tier < 9; tier++) {
    const r = 7.0 - tier * 0.62;
    const yy = y + 6.6 + tier * 3.15;
    wood.push(geoCyl(r * 0.9, r, 2.35, 8, x, yy + 1.18, z));
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      wood.push(geoCyl(0.14, 0.14, 2.2, 4, x + Math.cos(a) * (r * 0.92), yy + 1.1, z + Math.sin(a) * (r * 0.92)));
    }
    wood.push(geoCyl(r + 0.45, r + 0.45, 0.16, 8, x, yy + 2.3, z));
    coneRoof(roof, r + 1.45, 1.55, 8, x, yy + 3.05, z);
    dark.push(geoCyl(r + 1.55, r + 1.55, 0.12, 8, x, yy + 2.28, z));
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      const lx = x + Math.cos(a) * (r + 0.95);
      const lz = z + Math.sin(a) * (r + 0.95);
      const bodyL = new THREE.OctahedronGeometry(0.26, 0);
      bodyL.scale(1, 1.2, 1);
      bodyL.translate(lx, yy + 2.55, lz);
      lantern.push(bodyL);
    }
  }
  const topY = y + 6.6 + 9 * 3.15;
  roof.push(geoCyl(0.55, 1.15, 3.3, 8, x, topY + 1.8, z));
  roof.push(geoCyl(0.16, 0.36, 4.4, 6, x, topY + 5.1, z));
  for (let i = 0; i < 3; i++) {
    const r = 1.25 - i * 0.25;
    roof.push(geoCyl(r, r + 0.35, 0.16, 8, x, topY + 2.5 + i * 1.1, z));
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    banners.push(geoBox(0.12, 7.5, 1.9, x + Math.cos(a) * 7.8, y + 11, z + Math.sin(a) * 7.8, a));
  }
  root.add(meshOf([...wood], MATS.wood));
  root.add(meshOf([...dark], MATS.dark));
  root.add(meshOf([...stone], MATS.stone));
  root.add(meshOf([...roof], MATS.roof));
  root.add(meshOf([...lantern], MATS.lantern));
  root.add(meshOf([...banners], MATS.banner));
  refs.tower = { x, z, y };
}

function buildBridge(root, z, scale = 1) {
  const wood = [];
  const dark = [];
  const stone = [];
  const roof = [];
  const lantern = [];
  const cx = riverX(z);
  const L = 43 * scale;
  const W = 8.4 * scale;
  const deckY = 4.15;
  stone.push(geoBox(L * 0.88, 1.1, W + 2.2, cx, deckY - 0.75, z));
  wood.push(geoBox(L, 0.28, W, cx, deckY, z));
  wood.push(geoBox(L + 1.6, 0.32, W + 1.2, cx, deckY + 0.02, z));
  for (const sx of [-1, 1]) {
    stone.push(geoCyl(2.1 * scale, 2.5 * scale, 5.2, 8, cx + sx * (W + 3.4), deckY - 2.4, z));
    stone.push(geoCyl(2.4 * scale, 2.9 * scale, 5.4, 8, cx + sx * 12 * scale, deckY - 2.9, z));
  }
  for (let i = -5; i <= 5; i++) {
    const px = cx + i * (L / 11);
    for (const sz of [-1, 1]) {
      wood.push(geoCyl(0.32, 0.38, 5.5, 6, px, deckY + 2.75, z + sz * (W / 2 - 0.45)));
      wood.push(geoCyl(0.22, 0.22, 1.15, 5, px, deckY + 1.0, z + sz * (W / 2 - 0.25)));
    }
    wood.push(geoBox(0.28, 0.28, W - 0.6, px, deckY + 5.35, z));
    wood.push(geoBox(0.24, 0.24, W - 0.5, px, deckY + 1.65, z));
  }
  for (const sz of [-1, 1]) {
    wood.push(geoBox(L, 0.22, 0.3, cx, deckY + 1.25, z + sz * (W / 2 - 0.25)));
    wood.push(geoBox(L, 0.16, 0.22, cx, deckY + 0.8, z + sz * (W / 2 - 0.25)));
    for (let i = -5; i <= 5; i++) {
      const px = cx + i * (L / 11);
      wood.push(geoBox(0.16, 1.25, 0.16, px, deckY + 0.62, z + sz * (W / 2 - 0.25)));
    }
  }
  const roofGeo = curvedRoofGeometry(L + 2.5, W + 3.0, 3.1, 0.7, 10, 3);
  roofGeo.translate(cx, deckY + 5.5, z);
  roof.push(roofGeo);
  roof.push(geoBox(L + 4.6, 0.34, 0.42, cx, deckY + 8.62, z));
  for (let i = -1; i <= 1; i++) {
    const px = cx + i * L * 0.31;
    const base = deckY + 5.5;
    for (let tier = 0; tier < 2; tier++) {
      const r = (4.4 - tier * 1.0) * scale;
      wood.push(geoCyl(r * 0.9, r, 1.8, 8, px, base + 0.9 + tier * 2.4, z));
      coneRoof(roof, r + 0.9, 1.35, 8, px, base + 2.55 + tier * 2.4, z);
    }
    coneRoof(roof, 0.5, 2.2, 8, px, base + 5.3, z);
  }
  for (let i = -4; i <= 4; i++) {
    const px = cx + i * (L / 9);
    for (const sz of [-1, 1]) {
      const bodyL = new THREE.OctahedronGeometry(0.24, 0);
      bodyL.scale(1, 1.25, 1);
      bodyL.translate(px, deckY + 4.7, z + sz * (W / 2 - 0.1));
      lantern.push(bodyL);
    }
  }
  root.add(meshOf(wood, MATS.wood));
  dark.push(geoBox(L + 1.8, 0.22, 0.34, cx, deckY + 8.72, z + W / 2 + 1.4));
  dark.push(geoBox(L + 1.8, 0.22, 0.34, cx, deckY + 8.72, z - W / 2 - 1.4));
  for (const m of [meshOf(wood, MATS.wood), meshOf(dark, MATS.dark), meshOf(stone, MATS.stone), meshOf(roof, MATS.roof), meshOf(lantern, MATS.lantern)]) {
    if (m) root.add(m);
  }
  return { cx, z, L, W, deckY };
}

function buildSquare(root, refs) {
  const g = new THREE.CircleGeometry(SQUARE.r + 2.5, 56);
  g.rotateX(-Math.PI / 2);
  const ground = new THREE.Mesh(g, MATS.paving);
  ground.position.set(SQUARE.x, 1.69, SQUARE.z);
  ground.receiveShadow = true;
  root.add(ground);
  const stone = [];
  const wood = [];
  const roof = [];
  const banners = [];
  const sx = SQUARE.x - 6;
  const sz = SQUARE.z + 15;
  const sy = 1.72;
  stone.push(geoBox(22, 1.3, 12, sx, sy + 0.4, sz));
  stone.push(geoBox(24, 0.45, 14, sx, sy + 0.18, sz));
  wood.push(geoBox(11, 0.22, 7, sx, sy + 1.1, sz));
  for (const px of [-4.2, 0, 4.2]) {
    wood.push(geoCyl(0.28, 0.32, 5.7, 6, sx + px, sy + 3.85, sz - 1.8));
  }
  for (const sx2 of [-1, 1]) {
    wood.push(geoBox(0.22, 0.22, 7.4, sx + sx2 * 4.8, sy + 6.6, sz + 1.4));
  }
  const roofGeo = curvedRoofGeometry(13, 8.6, 2.1, 0.6, 4, 2);
  roofGeo.translate(sx, sy + 6.7, sz);
  roof.push(roofGeo);
  const backdrop = geoBox(13, 3.8, 0.35, sx, sy + 3.1, sz - 4.2);
  banners.push(backdrop);
  for (let i = 0; i < 7; i++) {
    const b = geoBox(0.5, 3.0, 0.08, sx - 5.4 + i * 1.8, sy + 3.2, sz - 4.0);
    banners.push(b);
  }
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 8; col++) {
      wood.push(geoBox(1.35, 0.18, 0.42, sx - 7 + col * 2.0, sy + 1.1, sz + 4.2 + row * 1.6));
      wood.push(geoBox(1.35, 0.42, 0.16, sx - 7 + col * 2.0, sy + 0.92, sz + 4.2 + row * 1.6));
    }
  }
  root.add(meshOf(stone, MATS.stone));
  root.add(meshOf(wood, MATS.wood));
  root.add(meshOf(roof, MATS.roof));
  root.add(meshOf(banners, MATS.banner));
  refs.stage = { x: sx, z: sz, y: sy };
}

export const TERRACE_BANDS = [];

function buildTerraces(root) {
  const pos = [];
  const col = [];
  const idx = [];
  const c = new THREE.Color();
  const z0 = -258;
  const z1 = -54;
  const segs = 34;
  for (let band = 0; band < 14; band++) {
    const baseX = 152 + band * 12.5;
    const level = terrainHeight(baseX, -160) + 1.2 + band * 0.2;
    const start = pos.length / 3;
    for (let i = 0; i <= segs; i++) {
      const z = z0 + (z1 - z0) * (i / segs);
      const cx = baseX + 6.5 * Math.sin(z * 0.021 + band * 1.7) + 3 * Math.sin(z * 0.06);
      const y = level + 0.3 * Math.sin(z * 0.033 + band);
      const w = 9.4;
      pos.push(cx - w / 2, y, z, cx + w / 2, y, z);
      const wet = (band + i) % 5 === 0;
      const gold = (band + i) % 7 === 0;
      if (wet) c.setHex(0x6d9186);
      else if (gold) c.setHex(0xb3a24f);
      else c.setHex(0x839f4f);
      const v = 0.88 + hash(band, i) * 0.24;
      col.push(c.r * v, c.g * v, c.b * v, c.r * v, c.g * v, c.b * v);
      TERRACE_BANDS.push({ x: cx, z, y, band, w });
    }
    for (let i = 0; i < segs; i++) {
      const a = start + i * 2;
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
    const rstart = pos.length / 3;
    for (let i = 0; i <= segs; i++) {
      const z = z0 + (z1 - z0) * (i / segs);
      const cx = baseX + 6.5 * Math.sin(z * 0.021 + band * 1.7) + 3 * Math.sin(z * 0.06);
      const y = level + 0.3 * Math.sin(z * 0.033 + band);
      const x = cx - 4.7;
      pos.push(x, y, z, x - 0.9, y - 2.7, z);
      c.setHex(0x6e5d40);
      const v = 0.85 + hash(band + 9, i) * 0.25;
      col.push(c.r * v, c.g * v, c.b * v, c.r * v * 0.8, c.g * v * 0.8, c.b * v * 0.8);
    }
    for (let i = 0; i < segs; i++) {
      const a = rstart + i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, MATS.terrace);
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  root.add(mesh);

  const riceGeo = [];
  const p1 = new THREE.PlaneGeometry(1.8, 1.15);
  p1.translate(0, 0.55, 0);
  riceGeo.push(p1);
  const p2 = new THREE.PlaneGeometry(1.8, 1.15);
  p2.rotateY(Math.PI / 2);
  p2.translate(0, 0.55, 0);
  riceGeo.push(p2);
  const geo = mergeParts(riceGeo);
  const count = 2300;
  const rice = new THREE.InstancedMesh(geo, MATS.rice, count);
  rice.frustumCulled = false;
  rice.castShadow = false;
  rice.receiveShadow = false;
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const spot = TERRACE_BANDS[(rand() * TERRACE_BANDS.length) | 0];
    const x = spot.x + rr(-spot.w / 2, spot.w / 2);
    const z = spot.z + rr(-1.4, 1.4);
    dummy.position.set(x, spot.y, z);
    dummy.rotation.set(0, rr(0, 6.28), 0);
    const s = rr(0.6, 1.25);
    dummy.scale.set(s, s * rr(0.8, 1.2), s);
    dummy.updateMatrix();
    rice.setMatrixAt(i, dummy.matrix);
    const v = rr(0.7, 1.1);
    color.setRGB(v * 0.85, v, v * 0.55);
    rice.setColorAt(i, color);
  }
  rice.instanceColor.needsUpdate = true;
  root.add(rice);
}

function buildTrees(root) {
  const geos = treeGeometries();
  const count = 760;
  const trunks = new THREE.InstancedMesh(geos.trunk, MATS.trunk, count);
  const canA = new THREE.InstancedMesh(geos.canopyA, MATS.leaf, count);
  const canB = new THREE.InstancedMesh(geos.canopyB, MATS.leafDark, count);
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  let n = 0;
  let guard = 0;
  while (n < count && guard < 5000) {
    guard++;
    const x = rr(-315, 315);
    const z = rr(-340, 320);
    const d = Math.abs(x - riverX(z)) - riverHalf(z);
    if (d < 9) continue;
    const sq = Math.hypot((x - SQUARE.x) / (SQUARE.r + 4), (z - SQUARE.z) / (SQUARE.r + 6));
    if (sq < 1) continue;
    if (x > 140 && z < -40) continue;
    const h = terrainHeight(x, z);
    if (h < 1 || h > 130) continue;
    const nearVillage = d < 175;
    if (nearVillage && rand() > 0.3) continue;
    const s = rr(0.7, 1.65);
    dummy.position.set(x, h - 0.3, z);
    dummy.rotation.set(0, rr(0, 6.28), 0);
    dummy.scale.set(s * rr(0.85, 1.2), s * rr(0.85, 1.25), s * rr(0.85, 1.2));
    dummy.updateMatrix();
    trunks.setMatrixAt(n, dummy.matrix);
    canA.setMatrixAt(n, dummy.matrix);
    canB.setMatrixAt(n, dummy.matrix);
    const v = rr(0.72, 1.12);
    color.setRGB(v, v * rr(0.94, 1.06), v * rr(0.82, 0.96));
    canA.setColorAt(n, color);
    canB.setColorAt(n, color);
    n++;
  }
  for (const m of [trunks, canA, canB]) {
    m.count = n;
    m.frustumCulled = false;
    m.castShadow = true;
    m.receiveShadow = true;
    root.add(m);
  }
  canA.instanceColor.needsUpdate = true;
  canB.instanceColor.needsUpdate = true;
}

function buildPeople(root, refs) {
  const geos = personGeometries();
  const entries = [];
  const stage = refs.stage;
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < 9; i++) {
      entries.push({
        x: stage.x - 7.2 + i * 1.8,
        z: stage.z - 1.4 + row * 1.7,
        y: stage.y + 1.12,
        rot: Math.PI + rr(-0.12, 0.12),
        singer: true,
      });
    }
  }
  for (let i = 0; i < 68; i++) {
    const z = rr(-260, 260);
    const side = rand() < 0.5 ? -1 : 1;
    const x = riverX(z) + side * (riverHalf(z) + rr(3.5, 8.5));
    entries.push({ x, z, y: terrainHeight(x, z) + 0.05, rot: rr(0, 6.28), singer: false });
  }
  for (let i = 0; i < 22; i++) {
    const a = rr(0, 6.28);
    const r = rr(4, SQUARE.r - 4);
    const x = SQUARE.x + Math.cos(a) * r;
    const z = SQUARE.z + Math.sin(a) * r;
    entries.push({ x, z, y: 1.72, rot: rr(0, 6.28), singer: false });
  }
  for (let i = 0; i < 12; i++) {
    const z = i % 2 ? -142 : 126;
    const x = riverX(z) + (i % 2 ? 1 : -1) * rr(40, 140);
    entries.push({ x, z: z + rr(-4, 4), y: terrainHeight(x, z) + 0.05, rot: rr(0, 6.28), singer: false });
  }
  const body = new THREE.InstancedMesh(geos.body, MATS.cloth, entries.length);
  const silver = new THREE.InstancedMesh(geos.silver, MATS.silver, entries.length);
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    dummy.position.set(e.x, e.y, e.z);
    dummy.rotation.set(0, e.rot, 0);
    const s = e.singer ? rr(0.96, 1.05) : rr(0.9, 1.08);
    dummy.scale.set(s, s, s);
    dummy.updateMatrix();
    body.setMatrixAt(i, dummy.matrix);
    silver.setMatrixAt(i, dummy.matrix);
    if (e.singer) color.setRGB(rr(0.75, 1), rr(0.55, 0.75), rr(0.6, 0.9));
    else color.setRGB(rr(0.55, 1), rr(0.55, 0.95), rr(0.55, 1));
    body.setColorAt(i, color);
    silver.setColorAt(i, color.setRGB(1, 1, 1));
  }
  body.instanceColor.needsUpdate = true;
  silver.instanceColor.needsUpdate = true;
  for (const m of [body, silver]) {
    m.frustumCulled = false;
    m.castShadow = true;
    m.receiveShadow = true;
    root.add(m);
  }
  refs.people = { body, silver, entries };
  const sparkPos = [];
  for (const e of entries) {
    if (!e.singer) continue;
    for (let i = 0; i < 4; i++) {
      sparkPos.push(e.x + rr(-0.4, 0.4), e.y + rr(1.6, 2.1), e.z + rr(-0.35, 0.35));
    }
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.Float32BufferAttribute(sparkPos, 3));
  const sm = new THREE.PointsMaterial({ color: 0xfff0c4, size: 0.42, map: TEX.glowMap, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const sparks = new THREE.Points(sg, sm);
  root.add(sparks);
  refs.sparks = sparks;
}

function buildLamps(root, refs) {
  const spots = [];
  for (const side of [-1, 1]) {
    for (let z = -276; z <= 276; z += 13) {
      const x = riverX(z) + side * (riverHalf(z) + 2.4);
      spots.push({ x, z, y: terrainHeight(x, z), s: rr(0.85, 1.15) });
    }
  }
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const x = SQUARE.x + Math.cos(a) * (SQUARE.r - 3);
    const z = SQUARE.z + Math.sin(a) * (SQUARE.r - 3);
    spots.push({ x, z, y: 1.72, s: 1.05 });
  }
  for (const z of [BRIDGE_Z, SECOND_BRIDGE_Z]) {
    const cx = riverX(z);
    for (const sx of [-1, 1]) {
      spots.push({ x: cx + sx * 23, z, y: terrainHeight(cx + sx * 23, z), s: 1.1 });
    }
  }
  const lanternGeo = new THREE.OctahedronGeometry(0.32, 0);
  lanternGeo.scale(1, 1.28, 1);
  const body = new THREE.InstancedMesh(lanternGeo, MATS.lantern, spots.length);
  const postGeo = geoCyl(0.12, 0.16, 3.3, 5, 0, 1.65, 0);
  const posts = new THREE.InstancedMesh(postGeo, MATS.dark, spots.length);
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  for (let i = 0; i < spots.length; i++) {
    const s = spots[i];
    dummy.position.set(s.x, s.y + 3.55, s.z);
    dummy.rotation.set(0, rr(0, 6.28), 0);
    dummy.scale.setScalar(s.s);
    dummy.updateMatrix();
    body.setMatrixAt(i, dummy.matrix);
    dummy.position.set(s.x, s.y, s.z);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    posts.setMatrixAt(i, dummy.matrix);
    body.setColorAt(i, color.setRGB(rr(0.85, 1.05), rr(0.72, 0.9), rr(0.65, 0.8)));
  }
  body.instanceColor.needsUpdate = true;
  for (const m of [body, posts]) {
    m.frustumCulled = false;
    m.castShadow = true;
    m.receiveShadow = true;
    root.add(m);
  }
  const positions = [];
  const phases = [];
  for (const s of spots) {
    positions.push(s.x, s.y + 3.55, s.z);
    phases.push(rr(0, 6.28));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('aPhase', new THREE.Float32BufferAttribute(phases, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uNight: { value: 0 }, uMap: { value: TEX.glowMap } },
    vertexShader: `
      attribute float aPhase;
      uniform float uTime;
      varying float vFlicker;
      varying float vPhase;
      void main() {
        vPhase = aPhase;
        vFlicker = 0.78 + 0.22 * sin(uTime * 3.2 + aPhase) + 0.08 * sin(uTime * 11.0 + aPhase * 4.0);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = min(54.0, (34.0 + 10.0 * sin(aPhase * 3.0)) * (300.0 / max(1.0, -mv.z)));
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform float uNight;
      uniform sampler2D uMap;
      varying float vFlicker;
      varying float vPhase;
      void main() {
        vec4 t = texture2D(uMap, gl_PointCoord);
        float a = t.a * (0.05 + uNight * 0.95) * vFlicker;
        vec3 col = vec3(1.0, 0.68, 0.32) * (0.8 + uNight * 0.7);
        gl_FragColor = vec4(col * t.rgb, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const glow = new THREE.Points(g, mat);
  glow.frustumCulled = false;
  root.add(glow);
  refs.lampGlow = glow;
  refs.lampMaterial = mat;
}

function buildSmoke(root, refs, spots) {
  const count = 340;
  const pos = [];
  const phase = [];
  const speed = [];
  const size = [];
  for (let i = 0; i < count; i++) {
    const sp = spots[(rand() * spots.length) | 0];
    const sy = Math.sin(sp.rot) * -1.5;
    const cx = Math.cos(sp.rot) * -1.5;
    pos.push(sp.x + cx * sp.sx, sp.y + 9.3 * sp.sy, sp.z + sy * sp.sx);
    phase.push(rand());
    speed.push(rr(0.035, 0.075));
    size.push(rr(2.2, 5.4));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aPhase', new THREE.Float32BufferAttribute(phase, 1));
  g.setAttribute('aSpeed', new THREE.Float32BufferAttribute(speed, 1));
  g.setAttribute('aSize', new THREE.Float32BufferAttribute(size, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uMap: { value: TEX.mistMap }, uNight: { value: 0 } },
    vertexShader: `
      attribute float aPhase;
      attribute float aSpeed;
      attribute float aSize;
      uniform float uTime;
      varying float vAlpha;
      void main() {
        float life = fract(aPhase + uTime * aSpeed);
        vec3 p = position;
        p.y += life * 17.0;
        p.x += sin(uTime * 0.24 + aPhase * 16.0) * (1.0 + life * 3.6);
        p.z += cos(uTime * 0.19 + aPhase * 21.0) * (1.0 + life * 2.6);
        vAlpha = sin(life * 3.14159) * (1.0 - life * 0.55);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = min(110.0, aSize * (0.7 + life * 2.4) * (300.0 / max(1.0, -mv.z)));
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform sampler2D uMap;
      uniform float uNight;
      varying float vAlpha;
      void main() {
        vec4 t = texture2D(uMap, gl_PointCoord);
        gl_FragColor = vec4(vec3(0.72, 0.76, 0.72), t.a * vAlpha * (0.22 + uNight * 0.1));
      }
    `,
    transparent: true,
    depthWrite: false,
  });
  const smoke = new THREE.Points(g, mat);
  smoke.frustumCulled = false;
  root.add(smoke);
  refs.smoke = smoke;
  refs.smokeMaterial = mat;
}

function buildMist(root, refs) {
  const count = 74;
  const pos = [];
  const phase = [];
  const size = [];
  for (let i = 0; i < count; i++) {
    const z = rr(-320, 320);
    const x = riverX(z) + rr(-70, 70);
    pos.push(x, rr(2.5, 30), z);
    phase.push(rand());
    size.push(rr(45, 120));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aPhase', new THREE.Float32BufferAttribute(phase, 1));
  g.setAttribute('aSize', new THREE.Float32BufferAttribute(size, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uMap: { value: TEX.mistMap }, uNight: { value: 0 } },
    vertexShader: `
      attribute float aPhase;
      attribute float aSize;
      uniform float uTime;
      varying float vAlpha;
      void main() {
        vec3 p = position;
        p.x += sin(uTime * 0.035 + aPhase * 12.0) * 14.0;
        p.z += cos(uTime * 0.027 + aPhase * 9.0) * 10.0;
        p.y += sin(uTime * 0.05 + aPhase * 5.0) * 1.2;
        vAlpha = 0.5 + 0.5 * sin(uTime * 0.08 + aPhase * 6.28);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = min(190.0, aSize * (300.0 / max(1.0, -mv.z)));
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform sampler2D uMap;
      uniform float uNight;
      varying float vAlpha;
      void main() {
        vec4 t = texture2D(uMap, gl_PointCoord);
        gl_FragColor = vec4(vec3(0.86, 0.9, 0.88), t.a * vAlpha * (0.1 + uNight * 0.035));
      }
    `,
    transparent: true,
    depthWrite: false,
  });
  const mist = new THREE.Points(g, mat);
  mist.frustumCulled = false;
  root.add(mist);
  refs.mist = mist;
  refs.mistMaterial = mat;
}

function buildFlags(root, refs) {
  const flags = [];
  const spots = [];
  const stage = refs.stage;
  for (let i = 0; i < 8; i++) {
    spots.push({ x: stage.x - 9 + i * 2.6, z: stage.z + 1.2, y: stage.y + 6.6, rot: 0, s: 0.8 });
  }
  const tower = refs.tower;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    spots.push({ x: tower.x + Math.cos(a) * 9.5, z: tower.z + Math.sin(a) * 9.5, y: tower.y + 8.5, rot: a, s: 1.1 });
  }
  for (const z of [BRIDGE_Z, SECOND_BRIDGE_Z]) {
    const cx = riverX(z);
    for (const sx of [-1, 1]) {
      spots.push({ x: cx + sx * 22, z: z + 5, y: 11.5, rot: sx * 0.5, s: 1.2 });
    }
  }
  for (const sp of spots) {
    const g = new THREE.PlaneGeometry(2.4 * sp.s, 1.5 * sp.s, 5, 3);
    g.translate(1.5 * sp.s, -0.75 * sp.s, 0);
    g.rotateY(sp.rot);
    g.translate(sp.x, sp.y, sp.z);
    flags.push(g);
  }
  const geo = mergeParts(flags);
  const mat = MATS.banner.clone();
  const uTime = { value: 0 };
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uTime;
    shader.vertexShader = 'uniform float uTime;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      transformed.x += sin(uTime * 2.4 + position.x * 0.42 + position.z * 0.31) * 0.18;
      transformed.z += cos(uTime * 1.9 + position.x * 0.3 - position.z * 0.4) * 0.13;`
    );
  };
  mat.customProgramCacheKey = () => 'xijiang-flags';
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  root.add(mesh);
  refs.flags = mesh;
  refs.flagUniform = uTime;
}

function buildMountains(root) {
  const parts = [];
  const mat = new THREE.MeshStandardMaterial({ color: 0x5c7468, roughness: 1, flatShading: true });
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2;
    const r = rr(470, 620);
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r - 80;
    const h = rr(70, 190);
    const rad = rr(90, 170);
    const g = new THREE.ConeGeometry(rad, h, 7, 2);
    g.translate(x, h * 0.5 - 8, z);
    parts.push(g);
  }
  const mesh = meshOf(parts, mat, false, false);
  root.add(mesh);
}

const fpRiver = [];
for (let z = -330; z <= 330; z += 6) {
  fpRiver.push([riverX(z) - riverHalf(z) - 0.8, z]);
}
for (let z = 330; z >= -330; z -= 6) {
  fpRiver.push([riverX(z) + riverHalf(z) + 0.8, z]);
}

export const FP_WORLD = {
  lake: fpRiver,
  waterRects: [],
  causeways: [],
  bridges: [
    { x: riverX(BRIDGE_Z), z: BRIDGE_Z, rot: Math.PI / 2, span: 43, width: 8.4, rise: 1.0, baseY: 3.3 },
    { x: riverX(SECOND_BRIDGE_Z), z: SECOND_BRIDGE_Z, rot: Math.PI / 2, span: 34, width: 6.6, rise: 0.9, baseY: 3.25 },
  ],
  islets: [],
  spawn: { x: riverX(150) + riverHalf(150) + 6.5, z: 150, yaw: 0.1 },
  bounds: { minX: -245, maxX: 245, minZ: -300, maxZ: 300 },
  colliders: {
    boxes: [
      { minX: SQUARE.x - 17, maxX: SQUARE.x + 5, minZ: SQUARE.z + 9, maxZ: SQUARE.z + 21 },
    ],
    circles: [
      { x: SQUARE.x - 1, z: SQUARE.z - 19, r: 10.4 },
    ],
  },
  ground: terrainHeight,
};

export function buildXijiangScene() {
  const group = new THREE.Group();
  const refs = {};
  group.add(makeTerrain());
  group.add(makeRiver());
  group.add(makePaths());
  group.add(makeRocks());
  buildHouses(group, refs);
  buildTerraces(group);
  buildTrees(group);
  buildDrumTower(group, refs);
  refs.mainBridge = buildBridge(group, BRIDGE_Z, 1);
  refs.secondBridge = buildBridge(group, SECOND_BRIDGE_Z, 0.78);
  buildSquare(group, refs);
  buildPeople(group, refs);
  buildLamps(group, refs);
  buildSmoke(group, refs, refs.spots);
  buildMist(group, refs);
  buildFlags(group, refs);
  buildMountains(group);

  const waterMaterial = MATS.water;
  refs.life = {
    update(time, dt, envMix) {
      waterMaterial.uniforms.uTime.value = time;
      if (refs.lampMaterial) {
        refs.lampMaterial.uniforms.uTime.value = time;
        refs.lampMaterial.uniforms.uNight.value = envMix;
      }
      if (refs.smokeMaterial) {
        refs.smokeMaterial.uniforms.uTime.value = time;
        refs.smokeMaterial.uniforms.uNight.value = envMix;
      }
      if (refs.mistMaterial) {
        refs.mistMaterial.uniforms.uTime.value = time;
        refs.mistMaterial.uniforms.uNight.value = envMix;
      }
      if (refs.flagUniform) refs.flagUniform.value = time;
      MATS.window.emissiveIntensity = 0.08 + envMix * 1.55;
      MATS.lantern.emissiveIntensity = 0.32 + envMix * 2.1;
      if (refs.sparks) refs.sparks.material.opacity = 0.2 + envMix * 0.65;
      waterMaterial.uniforms.uDeep.value.setHex(0x2c4f45).lerp(new THREE.Color(0x213441), envMix);
      waterMaterial.uniforms.uShallow.value.setHex(0x648d74).lerp(new THREE.Color(0x3f5961), envMix);
      waterMaterial.uniforms.uSky.value.setHex(0xbcd2ca).lerp(new THREE.Color(0xc89c7a), envMix);
    },
  };
  return {
    group,
    waterMaterial,
    lanternMaterial: MATS.lantern,
    windowMaterial: MATS.window,
    life: refs.life,
    refs,
    spots: refs.spots,
  };
}
