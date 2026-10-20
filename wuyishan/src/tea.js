import * as THREE from 'three';
import { mats } from './materials.js';
import { mergedMesh } from './geometry.js';
import { makeTeaPlaqueTexture } from './textures.js';
import { terrainHeight, riverCenter, riverHalfWidth, WATER_Y } from './terrain.js';
import { colliders } from './architectures.js';

let seed = 90210;
function rnd() {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
}

const ZONES = [
  { side: -1, cz: 520, span: 310, rows: 7, offset: 17, gap: 7.4 },
  { side: -1, cz: 70, span: 230, rows: 6, offset: 19, gap: 7.8 },
  { side: 1, cz: -420, span: 220, rows: 6, offset: 20, gap: 8.0 },
  { side: -1, cz: 850, span: 170, rows: 5, offset: 22, gap: 8.4 },
];

function terraceStrip(list, x, z, width, y, side) {
  const nx = x + width * 0.5;
  const nz = z + 0.1;
  const px = x - width * 0.5;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([
    px, terrainHeight(px, z) + 0.1, z,
    nx, terrainHeight(nx, z) + 0.1, z,
    nx, terrainHeight(nx, nz) + 0.1, nz,
    px, terrainHeight(px, nz) + 0.1, nz,
  ], 3));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  list.push(g);
  const wall = new THREE.BoxGeometry(0.38, 0.72, 3.6);
  wall.translate(x + side * width * 0.5, terrainHeight(x, z) + 0.3, z + 0.5);
  return wall;
}

function addFarmer(parts, x, z, yaw, scale) {
  const base = terrainHeight(x, z) + 0.08;
  const body = new THREE.CylinderGeometry(0.22 * scale, 0.34 * scale, 0.92 * scale, 6);
  body.rotateY(yaw);
  body.translate(x, base + 0.56 * scale, z);
  parts.robe.push(body);
  const head = new THREE.SphereGeometry(0.2 * scale, 6, 5);
  head.translate(x, base + 1.18 * scale, z);
  parts.skin.push(head);
  const hat = new THREE.ConeGeometry(0.48 * scale, 0.3 * scale, 9);
  hat.translate(x, base + 1.38 * scale, z);
  parts.straw.push(hat);
  for (const s of [-1, 1]) {
    const arm = new THREE.CylinderGeometry(0.05 * scale, 0.06 * scale, 0.62 * scale, 4);
    arm.rotateZ(s * 0.75);
    arm.translate(x + s * 0.27 * scale, base + 0.92 * scale, z + 0.1);
    parts.robe.push(arm);
  }
  const basket = new THREE.CylinderGeometry(0.22 * scale, 0.28 * scale, 0.3 * scale, 7);
  basket.rotateY(yaw);
  basket.translate(x + 0.46 * scale, base + 0.18 * scale, z + 0.16);
  parts.basket.push(basket);
  const hoop = new THREE.TorusGeometry(0.24 * scale, 0.025, 4, 8);
  hoop.rotateX(Math.PI / 2);
  hoop.translate(x + 0.46 * scale, base + 0.34 * scale, z + 0.16);
  parts.basket.push(hoop);
}

function pavilionSpot() {
  const z = 556;
  const x = riverCenter(z) - riverHalfWidth(z) - 31;
  return { x, z, y: terrainHeight(x, z) };
}

function addPavilion(root) {
  const { x, z, y } = pavilionSpot();
  const wood = [];
  const stone = [];
  const roof = [];
  const straw = [];
  const cloth = [];
  stone.push(new THREE.BoxGeometry(7.6, 0.6, 6.4).translate(x, y + 0.22, z));
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const post = new THREE.CylinderGeometry(0.16, 0.2, 3.4, 6);
      post.translate(x + sx * 2.85, y + 2.1, z + sz * 2.35);
      wood.push(post);
      const base = new THREE.CylinderGeometry(0.28, 0.32, 0.3, 7);
      base.translate(x + sx * 2.85, y + 0.65, z + sz * 2.35);
      stone.push(base);
    }
  }
  for (const sx of [-1, 1]) {
    const rail = new THREE.BoxGeometry(0.12, 0.12, 4.9);
    rail.translate(x + sx * 2.85, y + 1.55, z);
    wood.push(rail);
    for (let i = -2; i <= 2; i++) {
      const bal = new THREE.BoxGeometry(0.08, 0.82, 0.08);
      bal.translate(x + sx * 2.85, y + 1.12, z + i * 1.1);
      wood.push(bal);
    }
  }
  const backRail = new THREE.BoxGeometry(5.8, 0.12, 0.12);
  backRail.translate(x, y + 1.55, z - 2.35);
  wood.push(backRail);
  const roofGeo = new THREE.ConeGeometry(5.1, 2.0, 4);
  roofGeo.rotateY(Math.PI / 4);
  roofGeo.translate(x, y + 4.3, z);
  roof.push(roofGeo);
  const ridge = new THREE.BoxGeometry(0.26, 0.3, 0.26);
  ridge.translate(x, y + 5.4, z);
  roof.push(ridge);
  const eave = new THREE.CylinderGeometry(3.5, 3.55, 0.18, 4);
  eave.rotateY(Math.PI / 4);
  eave.translate(x, y + 3.34, z);
  roof.push(eave);
  const plaque = new THREE.PlaneGeometry(2.5, 0.94);
  plaque.translate(x, y + 2.9, z - 2.44);
  const plaqueMesh = new THREE.Mesh(plaque, new THREE.MeshStandardMaterial({ map: makeTeaPlaqueTexture(), roughness: 0.8, side: THREE.DoubleSide }));
  root.add(plaqueMesh);
  for (let i = 0; i < 6; i++) {
    const basket = new THREE.CylinderGeometry(0.34, 0.42, 0.46, 8);
    basket.translate(x - 2.2 + (i % 3) * 0.9, y + 0.75 + (i > 2 ? 0.46 : 0), z + 1.5 + Math.floor(i / 3) * 0.1);
    straw.push(basket);
    const rim = new THREE.TorusGeometry(0.36, 0.04, 4, 9);
    rim.rotateX(Math.PI / 2);
    rim.translate(x - 2.2 + (i % 3) * 0.9, y + 1.0 + (i > 2 ? 0.46 : 0), z + 1.5);
    straw.push(rim);
  }
  const table = new THREE.CylinderGeometry(0.62, 0.62, 0.12, 10);
  table.translate(x, y + 1.22, z);
  wood.push(table);
  for (let i = 0; i < 4; i++) {
    const leg = new THREE.CylinderGeometry(0.06, 0.07, 0.9, 4);
    leg.translate(x + Math.cos(i * 1.57) * 0.4, y + 0.78, z + Math.sin(i * 1.57) * 0.4);
    wood.push(leg);
  }
  const kettle = new THREE.SphereGeometry(0.3, 7, 5);
  kettle.scale(1.0, 0.82, 1.0);
  kettle.translate(x, y + 1.5, z);
  cloth.push(kettle);
  for (const [arr, mat] of [[wood, mats.wood], [stone, mats.stone], [roof, mats.roof], [straw, mats.straw], [cloth, mats.bird]]) {
    const m = mergedMesh(arr, mat, true, true);
    if (m) root.add(m);
  }
  colliders.push({ name: '茶亭', minX: x - 3.9, maxX: x + 3.9, minZ: z - 3.3, maxZ: z + 3.3 });
}

function addStonePath(root, ribbon) {
  const pts = [];
  for (let z = 650; z >= 445; z -= 5) {
    const off = 11 + 7 * Math.sin((z - 445) * 0.035) + 2 * Math.sin(z * 0.11);
    const d = riverHalfWidth(z) + off;
    pts.push([riverCenter(z) - d, z]);
  }
  ribbon(pts, 2.6);
  const { x, z } = pavilionSpot();
  ribbon([[x + 2.6, z - 1.5], [x + 4.2, z - 5], [x + 2.8, z - 10], [x - 1.2, z - 15]], 2.1);
}

export function createTeaTerraces() {
  const root = new THREE.Group();
  const soil = [];
  const walls = [];
  const bushes = [];
  const paving = [];
  const frames = [];
  const farmerParts = { robe: [], skin: [], straw: [], basket: [] };
  const steps = [];
  for (const zone of ZONES) {
    const step = 3.6;
    const stripWidth = zone.gap * 0.72;
    for (let row = 0; row < zone.rows; row++) {
      for (let z = zone.cz - zone.span / 2; z < zone.cz + zone.span / 2; z += step) {
        const d = riverHalfWidth(z) + zone.offset + row * zone.gap;
        const x = riverCenter(z) + zone.side * d;
        const y = terrainHeight(x, z);
        if (y < 1.1) continue;
        const w = terraceStrip(soil, x, z, stripWidth, y, zone.side);
        walls.push(w);
        const gw = stripWidth * 0.62;
        const gx0 = x - gw * 0.5;
        const gx1 = x + gw * 0.5;
        const gz1 = z + 0.08;
        const band = new THREE.BufferGeometry();
        band.setAttribute('position', new THREE.Float32BufferAttribute([
          gx0, terrainHeight(gx0, z) + 0.16, z,
          gx1, terrainHeight(gx1, z) + 0.16, z,
          gx1, terrainHeight(gx1, gz1) + 0.16, gz1,
          gx0, terrainHeight(gx0, gz1) + 0.16, gz1,
        ], 3));
        band.setIndex([0, 1, 2, 0, 2, 3]);
        bushes.push(band);
        if (rnd() < 0.86) {
          for (let b = 0; b < 3; b++) {
            const bx = x + (rnd() - 0.5) * stripWidth * 0.8;
            const bz = z + (rnd() - 0.5) * step;
            const bh = 0.54 + rnd() * 0.32;
            const bush = new THREE.IcosahedronGeometry(bh, 0);
            bush.scale(1.3, 0.68, 1.15);
            bush.rotateY(rnd() * 6.28);
            bush.translate(bx, terrainHeight(bx, bz) + bh * 0.66, bz);
            bushes.push(bush);
          }
        }
      }
    }
    for (let f = 0; f < 3; f++) {
      const z = zone.cz - zone.span * 0.3 + f * zone.span * 0.3;
      const d = riverHalfWidth(z) + zone.offset + (1 + f) * zone.gap;
      const x = riverCenter(z) + zone.side * d;
      if (terrainHeight(x, z) > 1.1) addFarmer(farmerParts, x, z, zone.side > 0 ? Math.PI / 2 : -Math.PI / 2, 0.95 + rnd() * 0.2);
    }
  }
  addStonePath(root, (points, width) => {
    for (let i = 0; i < points.length - 1; i++) {
      const [ax, az] = points[i];
      const [bx, bz] = points[i + 1];
      const dx = bx - ax;
      const dz = bz - az;
      const len = Math.hypot(dx, dz) || 1;
      const nx = (-dz / len) * width * 0.5;
      const nz = (dx / len) * width * 0.5;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute([
        ax + nx, terrainHeight(ax + nx, az + nz) + 0.16, az + nz,
        ax - nx, terrainHeight(ax - nx, az - nz) + 0.16, az - nz,
        bx + nx, terrainHeight(bx + nx, bz + nz) + 0.16, bz + nz,
        bx - nx, terrainHeight(bx - nx, bz - nz) + 0.16, bz - nz,
      ], 3));
      g.setIndex([0, 1, 2, 2, 1, 3]);
      paving.push(g);
    }
  });
  const terraceMat = mats.teaSoil;
  const sm = mergedMesh(soil, terraceMat, false, true);
  const wm = mergedMesh(walls, mats.stone, false, true);
  const bm = mergedMesh(bushes, mats.tea, false, true);
  const pm = mergedMesh(paving, mats.paving, false, true);
  for (const m of [sm, wm, bm, pm]) if (m) root.add(m);
  const fm = mergedMesh(farmerParts.robe, mats.teaCloth, true, true);
  const skm = mergedMesh(farmerParts.skin, mats.skin, true, true);
  const stm = mergedMesh(farmerParts.straw, mats.straw, true, false);
  const bkm = mergedMesh(farmerParts.basket, mats.straw, true, false);
  for (const m of [fm, skm, stm, bkm]) if (m) root.add(m);
  addPavilion(root);
  return root;
}

export function createTeaFlags() {
  const group = new THREE.Group();
  const count = 20;
  const geo = new THREE.PlaneGeometry(0.84, 1.15);
  geo.translate(0.42, -0.58, 0);
  const flags = new THREE.InstancedMesh(geo, mats.teaFlag, count);
  flags.frustumCulled = false;
  group.add(flags);
  const data = [];
  const dummy = new THREE.Object3D();
  const zones = [
    { side: -1, z: 620, row: 1 },
    { side: -1, z: 580, row: 2 },
    { side: -1, z: 520, row: 3 },
    { side: -1, z: 470, row: 2 },
    { side: -1, z: 430, row: 1 },
  ];
  for (let i = 0; i < count; i++) {
    const z = zones[i % zones.length].z + (i % 4) * 9 - 12;
    const d = riverHalfWidth(z) + 20 + zones[i % zones.length].row * 7.4;
    const x = riverCenter(z) - d;
    data.push({
      x,
      y: terrainHeight(x, z) + 2.35,
      z,
      phase: i * 1.13,
      yaw: -0.8 + (i % 5) * 0.32,
    });
  }
  const poles = [];
  for (const d of data) {
    const pole = new THREE.CylinderGeometry(0.035, 0.05, 2.5, 4);
    pole.translate(d.x, d.y - 1.16, d.z);
    poles.push(pole);
  }
  const pm = mergedMesh(poles, mats.wood, true, false);
  if (pm) group.add(pm);
  function update(time) {
    for (let i = 0; i < data.length; i++) {
      const d = data[i];
      dummy.position.set(d.x, d.y, d.z);
      dummy.rotation.set(0, d.yaw + Math.sin(time * 1.35 + d.phase) * 0.14, Math.sin(time * 2.1 + d.phase) * 0.055);
      const flutter = 0.88 + 0.14 * Math.sin(time * 2.8 + d.phase);
      dummy.scale.set(flutter, 1, 1);
      dummy.updateMatrix();
      flags.setMatrixAt(i, dummy.matrix);
    }
    flags.instanceMatrix.needsUpdate = true;
  }
  update(0);
  group.userData.update = update;
  return group;
}
