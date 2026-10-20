import * as THREE from 'three';
import { mats } from './materials.js';
import { addBox, addCylinder, mergedMesh } from './geometry.js';
import { terrainHeight, WATER_Y } from './terrain.js';
import { addBench, addPerson, addPlaque, hash } from './detailKit.js';

const wetRockMaterial = new THREE.MeshStandardMaterial({
  color: 0x46514b,
  roughness: 0.3,
  metalness: 0.14,
});

function makeFoamMaterial() {
  const material = mats.wake.clone();
  material.color.setHex(0xeefaf5);
  material.opacity = 0.28;
  material.side = THREE.DoubleSide;
  return material;
}

function toWorld(x, z, lx, lz, rot) {
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  return [x + lx * c + lz * s, z - lx * s + lz * c];
}

function addWetShore(wet, moss, foam, seed, x, z, count) {
  for (let i = 0; i < count; i++) {
    const a = hash(seed, i) * Math.PI * 2;
    const r = 1.0 + hash(seed, i + 5) * 3.4;
    const px = x + Math.cos(a) * r;
    const pz = z + Math.sin(a) * r;
    const s = 0.7 + hash(seed, i + 9) * 1.5;
    const h = terrainHeight(px, pz);
    const y = Math.max(h, WATER_Y - 0.2) + s * 0.12;
    const g = new THREE.IcosahedronGeometry(s, 1);
    g.scale(1.45, 0.62, 1.08);
    g.rotateY(a * 0.7 + hash(seed, i + 13) * 2.2);
    g.translate(px, y, pz);
    wet.push(g);
    if (h > WATER_Y - 0.1 && hash(seed, i + 17) > 0.42) {
      const cap = new THREE.SphereGeometry(s * (0.35 + hash(seed, i + 19) * 0.3), 6, 3, 0, Math.PI * 2, 0, Math.PI * 0.42);
      cap.scale(1.2, 0.22, 1.0);
      cap.rotateY(hash(seed, i + 23) * 6.28);
      cap.translate(px, y + s * 0.36, pz);
      moss.push(cap);
    }
    if (h < WATER_Y + 0.22) {
      const ring = new THREE.RingGeometry(s * 0.9, s * 1.38, 20, 1);
      ring.rotateX(-Math.PI / 2);
      ring.translate(px, WATER_Y + 0.04, pz);
      foam.push(ring);
    }
  }
}

function addLotusCluster(leaves, stems, pink, white, centers, pods, seed, x, z, radius, count) {
  for (let i = 0; i < count; i++) {
    const a = hash(seed, i) * Math.PI * 2;
    const r = Math.sqrt(hash(seed, i + 3)) * radius;
    const px = x + Math.cos(a) * r;
    const pz = z + Math.sin(a) * r;
    const leafR = 0.4 + hash(seed, i + 6) * 0.34;
    const leafY = WATER_Y + 0.08 + leafR * 0.16;
    const leaf = new THREE.SphereGeometry(leafR, 10, 4, 0, Math.PI * 2, 0, Math.PI * 0.34);
    leaf.scale(1.0, 0.24, 1.0);
    leaf.rotateY(hash(seed, i + 11) * 6.28);
    leaf.translate(px, leafY, pz);
    leaves.push(leaf);
    const waterBase = WATER_Y - 0.06;
    addCylinder(stems, 0.018, 0.026, leafY - waterBase, 5, px, (leafY + waterBase) * 0.5, pz);
    if (i % 2 === 0) {
      const stemH = 0.62 + hash(seed, i + 14) * 0.55;
      const top = waterBase + stemH;
      addCylinder(stems, 0.017, 0.022, stemH, 5, px + 0.07, waterBase + stemH * 0.5, pz - 0.05);
      if (i % 6 === 0) {
        const bud = new THREE.SphereGeometry(0.1, 6, 4);
        bud.scale(0.62, 1.65, 0.62);
        bud.rotateZ((hash(seed, i + 18) - 0.5) * 0.25);
        bud.translate(px + 0.07, top + 0.12, pz - 0.05);
        pink.push(bud);
        const sepal = new THREE.ConeGeometry(0.11, 0.16, 5);
        sepal.translate(px + 0.07, top + 0.01, pz - 0.05);
        pods.push(sepal);
      } else if (i % 4 === 0) {
        const pod = new THREE.CylinderGeometry(0.1, 0.07, 0.14, 7);
        pod.translate(px + 0.07, top + 0.04, pz - 0.05);
        pods.push(pod);
        const disc = new THREE.CircleGeometry(0.09, 7);
        disc.rotateX(-Math.PI / 2);
        disc.translate(px + 0.07, top + 0.12, pz - 0.05);
        centers.push(disc);
      } else {
        const petals = 8;
        const tone = i % 8 === 0 ? white : pink;
        for (let k = 0; k < petals; k++) {
          const pa = (k / petals) * Math.PI * 2 + hash(seed, i + 21) * 0.5;
          const petal = new THREE.SphereGeometry(0.09, 5, 4);
          petal.scale(0.58, 1.42, 0.34);
          petal.rotateX(0.55);
          petal.rotateY(pa);
          petal.translate(px + 0.07 + Math.cos(pa) * 0.06, top + 0.1, pz - 0.05 + Math.sin(pa) * 0.06);
          tone.push(petal);
        }
        const core = new THREE.SphereGeometry(0.07, 6, 4);
        core.translate(px + 0.07, top + 0.12, pz - 0.05);
        centers.push(core);
      }
    }
  }
}

function addCattails(stems, leaves, catkins, seed, x, z, count) {
  for (let i = 0; i < count; i++) {
    const a = hash(seed, i) * Math.PI * 2;
    const r = 0.6 + hash(seed, i + 3) * 2.2;
    const px = x + Math.cos(a) * r;
    const pz = z + Math.sin(a) * r;
    const h = terrainHeight(px, pz);
    if (h > WATER_Y + 0.75) continue;
    const base = Math.max(h, WATER_Y - 0.16);
    const height = 1.35 + hash(seed, i + 7) * 1.0;
    addCylinder(stems, 0.018, 0.03, height, 5, px, base + height * 0.5, pz);
    const catkin = new THREE.CylinderGeometry(0.055, 0.045, 0.26, 6);
    catkin.translate(px, base + height + 0.02, pz);
    catkins.push(catkin);
    for (let k = 0; k < 3; k++) {
      const blade = new THREE.ConeGeometry(0.035, 0.9 + hash(seed, i + 13) * 0.8, 3);
      blade.rotateZ((hash(seed, i + k + 17) - 0.5) * 0.5);
      blade.rotateY(a + k * 1.9);
      blade.translate(px + Math.cos(a + k * 2.1) * 0.2, base + 0.55, pz + Math.sin(a + k * 2.1) * 0.2);
      leaves.push(blade);
    }
  }
}

function addEaveTiles(list, cx, z, y, halfX, halfZ, rot, step) {
  const sides = [
    { ax: -halfX, az: -halfZ, bx: halfX, bz: -halfZ },
    { ax: -halfX, az: halfZ, bx: halfX, bz: halfZ },
    { ax: -halfX, az: -halfZ, bx: -halfX, bz: halfZ },
    { ax: halfX, az: -halfZ, bx: halfX, bz: halfZ },
  ];
  for (const s of sides) {
    const len = Math.hypot(s.bx - s.ax, s.bz - s.az);
    const n = Math.max(2, Math.round(len / step));
    const ang = Math.atan2(s.bx - s.ax, s.bz - s.az);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const lx = s.ax + (s.bx - s.ax) * t;
      const lz = s.az + (s.bz - s.az) * t;
      const [wx, wz] = toWorld(cx, z, lx, lz, rot);
      addBox(list, 0.2, 0.16, 0.34, wx, y, wz, rot + ang);
    }
  }
}

function addHexEave(list, cx, z, y, radius, rot, count) {
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + rot;
    addBox(list, 0.42, 0.13, 0.2, cx + Math.cos(a) * radius, y, z + Math.sin(a) * radius, -a);
  }
}

function addHangingLantern(gold, lantern, x, y, z, scale = 1) {
  addCylinder(gold, 0.018, 0.018, 0.34 * scale, 4, x, y + 0.3 * scale, z);
  addCylinder(gold, 0.12 * scale, 0.14 * scale, 0.06 * scale, 6, x, y + 0.12 * scale, z);
  const body = new THREE.SphereGeometry(0.17 * scale, 7, 5);
  body.scale(0.88, 1.25, 0.88);
  body.translate(x, y - 0.08 * scale, z);
  lantern.push(body);
  addCylinder(gold, 0.1 * scale, 0.11 * scale, 0.04 * scale, 6, x, y - 0.3 * scale, z);
}

export function addEastLakeFinalPolish(root) {
  const wet = [];
  const moss = [];
  const foam = [];
  const leaves = [];
  const stems = [];
  const pink = [];
  const white = [];
  const centers = [];
  const pods = [];
  const reedLeaves = [];
  const catkins = [];
  const tile = [];
  const gold = [];
  const lantern = [];
  const wood = [];
  const blossom = [];
  const cherry = [];
  const blade = [];

  const wetSpots = [
    [-336, 96], [-332, 134], [-335, 176], [-340, 212],
    [-360, 30], [-384, 18], [-300, 250], [470, 160],
    [-198, 306], [408, 140], [160, 190], [-322, 246],
  ];
  wetSpots.forEach(([x, z], i) => addWetShore(wet, moss, foam, 31000 + i * 17, x, z, 5 + (i % 3)));

  for (const [x, z, r, c] of [
    [-324, 124, 5.2, 14], [-320, 164, 4.8, 13],
    [-334, 198, 4.4, 11], [112, 158, 4.6, 12],
    [406, 146, 4.2, 10],
  ]) {
    addLotusCluster(leaves, stems, pink, white, centers, pods, 32000 + x + z, x, z, r, c);
  }

  for (const [x, z, s] of [
    [-340, 104], [-336, 148], [-342, 190],
    [-320, 228], [96, 172], [420, 154], [-204, 286],
  ]) {
    addCattails(stems, reedLeaves, catkins, 33000 + s, x, z, 7);
  }

  addEaveTiles(tile, -404, 74, 8.52, 16.4, 10.4, Math.PI / 2, 1.5);
  const chuBase = terrainHeight(600, -110) - 0.5;
  for (const [rw, yy] of [[25, 6.4 + 5.6 - 0.52], [19, 12.9 + 4.4 - 0.52], [14.5, 18.6 + 3.6 - 0.52], [11, 23.6 + 3.0 - 0.52]]) {
    addEaveTiles(tile, 600, -110, chuBase + yy, rw * 0.5 - 0.45, rw * 0.5 - 0.45, 0, 1.35);
  }
  addHexEave(tile, -372, 150, 4.62, 5.3, 0.1, 24);
  addHexEave(tile, -343, 204, 4.06, 4.35, 0.1, 18);

  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.2;
    addHangingLantern(gold, lantern, -372 + Math.cos(a) * 4.9, 3.85, 150 + Math.sin(a) * 4.9, 0.95);
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.5;
    addHangingLantern(gold, lantern, -343 + Math.cos(a) * 3.9, 3.4, 204 + Math.sin(a) * 3.9, 0.8);
  }
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const lx = Math.cos(a) * 9.6;
    const lz = Math.sin(a) * 6.4;
    const [wx, wz] = toWorld(-404, 74, lx, lz, Math.PI / 2);
    addHangingLantern(gold, lantern, wx, 8.05, wz, 0.9);
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.2;
    addHangingLantern(gold, lantern, 600 + Math.cos(a) * 6.0, 75.65, -110 + Math.sin(a) * 6.0, 0.95);
  }

  for (const [x, z, ry] of [[-414, 68, 0], [-394, 80, Math.PI]]) {
    addBench(wood, x, z, ry, terrainHeight(-404, 74) + 1.82);
  }
  addBench(wood, 600, -132, Math.PI / 2, terrainHeight(600, -110) + 6.82);

  const changtianY = terrainHeight(-404, 74) + 1.82;
  for (const [x, z, ry, seed, colors] of [
    [-410, 72, 0.4, 34101, [mats.blue, mats.white]],
    [-401, 77, 2.3, 34102, [mats.redLacquer, mats.teal]],
    [-407, 81, -1.1, 34103, [mats.teal, mats.blue]],
    [-395, 69, 1.9, 34104, [mats.white, mats.redLacquer]],
  ]) {
    addPerson(root, x, z, changtianY, ry, seed, colors);
  }
  const chuDeck = terrainHeight(600, -110) + 6.82;
  addPerson(root, 594, -131, chuDeck, 2.4, 34105, [mats.redLacquer, mats.white]);
  addPerson(root, 607, -127, chuDeck, -0.9, 34106, [mats.blue, mats.teal]);

  for (const [x, z, text, ry] of [[-436, 76, '长天楼', Math.PI / 2], [588, -158, '楚天台', 0.15]]) {
    const gy = Math.max(0.7, terrainHeight(x, z));
    addBox(wood, 0.18, 2.4, 0.18, x - Math.cos(ry) * 1.1, gy + 1.2, z + Math.sin(ry) * 1.1);
    addBox(wood, 0.18, 2.4, 0.18, x + Math.cos(ry) * 1.1, gy + 1.2, z - Math.sin(ry) * 1.1);
    addBox(gold, 2.5, 0.12, 0.28, x, gy + 2.26, z, ry);
    addPlaque(root, text, 2.3, 0.6, x, gy + 1.76, z, ry);
  }

  const CYCLE = [
    [-420, 690], [-380, 678], [-342, 700], [-302, 730],
    [-270, 770], [-260, 810], [-300, 842], [-352, 822],
    [-392, 782], [-420, 742],
  ];
  for (let i = 0; i < CYCLE.length - 1; i++) {
    const [x0, z0] = CYCLE[i];
    const [x1, z1] = CYCLE[i + 1];
    const dx = x1 - x0;
    const dz = z1 - z0;
    const len = Math.hypot(dx, dz) || 1;
    const nx = -dz / len;
    const nz = dx / len;
    const n = Math.max(2, Math.round(len / 3.0));
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n;
      for (const side of [-1, 1]) {
        const off = (3.7 + hash(35000 + i, k) * 1.8) * side;
        const px = x0 + dx * t + nx * off;
        const pz = z0 + dz * t + nz * off;
        const gy = terrainHeight(px, pz);
        if (gy < 1.4) continue;
        for (let b = 0; b < 3; b++) {
          const s = 0.16 + hash(35000 + i, k * 7 + b) * 0.14;
          const g = new THREE.IcosahedronGeometry(s, 0);
          g.scale(1.25, 0.72, 1.25);
          g.translate(px + (hash(35100, k + b) - 0.5) * 0.8, gy + 0.18 + s * 0.4, pz + (hash(35200, k + b) - 0.5) * 0.8);
          blossom.push(g);
          if (b % 2 === 0) {
            const f = new THREE.IcosahedronGeometry(s * 0.84, 0);
            f.scale(1.2, 0.68, 1.2);
            f.translate(px + (hash(35300, k + b) - 0.5) * 0.7, gy + 0.34 + s * 0.4, pz + (hash(35400, k + b) - 0.5) * 0.7);
            cherry.push(f);
          }
        }
        const h = 0.4 + hash(35500 + i, k + side) * 0.4;
        const cone = new THREE.ConeGeometry(0.05, h, 3);
        cone.rotateZ((hash(35600, k) - 0.5) * 0.4);
        cone.translate(px, gy + h * 0.45, pz);
        blade.push(cone);
      }
    }
  }

  const foamMaterial = makeFoamMaterial();
  const addMerged = (list, material, cast = true, receive = true) => {
    const mesh = mergedMesh(list, material, cast, receive);
    if (mesh) root.add(mesh);
    return mesh;
  };

  addMerged(wet, wetRockMaterial, true, true);
  addMerged(moss, mats.blade, false, true);
  const foamMesh = addMerged(foam, foamMaterial, false, false);
  if (foamMesh) {
    foamMesh.renderOrder = 3;
    foamMesh.frustumCulled = false;
  }
  addMerged(leaves, mats.lotus, true, true);
  addMerged(stems, mats.bamboo, false, true);
  addMerged(pink, mats.cherryLight, false, true);
  addMerged(white, mats.white, false, true);
  addMerged(centers, mats.gold, false, false);
  addMerged(pods, mats.bamboo, false, true);
  addMerged(reedLeaves, mats.reed, false, true);
  addMerged(catkins, mats.trunk, false, true);
  addMerged(tile, mats.roofDark, true, true);
  addMerged(gold, mats.gold, true, false);
  addMerged(lantern, mats.lantern, true, false);
  addMerged(wood, mats.wood, true, true);
  addMerged(blossom, mats.blossom, false, true);
  addMerged(cherry, mats.cherry, false, true);
  addMerged(blade, mats.blade, false, true);

  return { foamMaterial };
}
