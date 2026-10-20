import * as THREE from 'three';
import { mats } from './materials.js';
import { heightAt, slopeAt } from './terrain.js';
import { WALL_HEIGHT } from './wall.js';
import { addBox, addCylinder, mergedMesh } from './geometry.js';

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function localBox(list, w, h, d, x, y, z, ry = 0, rx = 0, rz = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (rx) g.rotateX(rx);
  if (rz) g.rotateZ(rz);
  if (ry) g.rotateY(ry);
  g.translate(x, y, z);
  list.push(g);
}

function localCylinder(list, rt, rb, h, seg, x, y, z, rx = 0, rz = 0) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  if (rx) g.rotateX(rx);
  if (rz) g.rotateZ(rz);
  g.translate(x, y, z);
  list.push(g);
}

function addWallCaps(list, samples, rain) {
  let accum = 1.2;
  for (let i = 1; i < samples.length - 1; i++) {
    const a = samples[i - 1];
    const b = samples[i];
    accum += Math.hypot(b.x - a.x, b.z - a.z);
    if (accum < 2.6) continue;
    accum = 0;
    const s = samples[i];
    const yaw = Math.atan2(s.tx, s.tz);
    const off = 2.44 - 0.24;
    const px = s.x + s.nx * off;
    const pz = s.z + s.nz * off;
    localBox(list, 0.86, 0.12, 1.68, px, s.top + 1.93, pz, yaw, (rain - 0.5) * 0.035, (rain - 0.5) * 0.035);
  }
}

function addArrowLoops(dark, stone, samples) {
  let accum = 1.2;
  for (let i = 1; i < samples.length - 1; i++) {
    const a = samples[i - 1];
    const b = samples[i];
    accum += Math.hypot(b.x - a.x, b.z - a.z);
    if (accum < 2.6) continue;
    accum = 0;
    const s = samples[i];
    const yaw = Math.atan2(s.tx, s.tz);
    const px = s.x + s.nx * 2.44;
    const pz = s.z + s.nz * 2.44;
    addBox(dark, 0.16, 0.44, 0.07, px + s.nx * 0.01, s.top + 1.52, pz + s.nz * 0.01, yaw);
    addBox(stone, 0.44, 0.12, 0.22, px + s.nx * 0.01, s.top + 1.76, pz + s.nz * 0.01, yaw);
  }
}

function addDrainage(dark, stone, samples) {
  for (let i = 9; i < samples.length - 9; i += 12) {
    const s = samples[i];
    const yaw = Math.atan2(s.tx, s.tz);
    const h = Math.max(1.6, s.top - s.baseTop - 0.9);
    addBox(dark, 0.14, h, 0.08, s.x + s.nx * 2.87, s.baseTop + h * 0.5 + 0.4, s.z + s.nz * 2.87, yaw);
    addBox(stone, 0.44, 0.2, 0.52, s.x + s.nx * 2.98, s.baseTop - 0.05, s.z + s.nz * 2.98, yaw);
  }
}

function addButtresses(stone, warm, samples, rand) {
  for (let i = 18; i < samples.length - 18; i += 34) {
    const s = samples[i];
    const yaw = Math.atan2(s.tx, s.tz);
    const x = s.x + s.nx * 4.2;
    const z = s.z + s.nz * 4.2;
    const gy = heightAt(x, z);
    const h = Math.max(2.2, s.baseTop - gy + 1.1);
    addBox(stone, 2.4, h, 2.2, x, gy + h * 0.5 - 0.5, z, yaw);
    addBox(stone, 1.7, h * 0.72, 1.4, x + s.nx * 0.34, gy + h * 0.36 - 0.3, z + s.nz * 0.34, yaw);
    addBox(warm, 0.38, 0.4, 0.28, x + s.nx * 0.62, gy + 0.4, z + s.nz * 0.62, yaw);
    if (rand() < 0.5) {
      addBox(stone, 0.9, 0.3, 0.8, x + s.tx * 1.3, gy + 0.18, z + s.tz * 1.3, yaw + 0.2);
    }
  }
}

function addWallStairs(stone, dark, samples) {
  for (let i = 3; i < samples.length - 3; i += 3) {
    const a = samples[i - 1];
    const b = samples[i + 1];
    const rise = Math.abs(b.top - a.top);
    if (rise < 0.16) continue;
    const s = samples[i];
    const yaw = Math.atan2(s.tx, s.tz);
    addBox(stone, 4.0, 0.08, 0.42, s.x, s.top + 0.08, s.z, yaw);
    addBox(dark, 4.0, 0.05, 0.1, s.x - s.nx * 1.85, s.top + 0.9, s.z - s.nz * 1.85, yaw);
  }
}

function addGuardChains(iron, wood, samples) {
  for (let i = 14; i < samples.length - 18; i += 26) {
    const s = samples[i];
    const yaw = Math.atan2(s.tx, s.tz);
    const off = -(2.44 - 0.7);
    for (let k = 0; k < 5; k++) {
      const t = k / 4;
      const px = s.x + s.tx * t * 7.0 + s.nx * off;
      const pz = s.z + s.tz * t * 7.0 + s.nz * off;
      const py = s.top + 0.52 + Math.sin(t * Math.PI) * -0.07;
      localCylinder(iron, 0.035, 0.045, 0.86, 5, px, py, pz);
      if (k < 4) {
        const nx = s.x + s.tx * (t + 0.25) * 7.0 + s.nx * off;
        const nz = s.z + s.tz * (t + 0.25) * 7.0 + s.nz * off;
        const ny = s.top + 0.52 + Math.sin((t + 0.25) * Math.PI) * -0.07;
        const g = new THREE.TorusGeometry(0.16, 0.028, 4, 8);
        g.rotateY(yaw);
        g.translate((px + nx) * 0.5, (py + ny) * 0.5, (pz + nz) * 0.5);
        iron.push(g);
      }
    }
    addBox(wood, 0.18, 0.22, 0.18, s.x + s.nx * off, s.top + 0.2, s.z + s.nz * off, yaw);
  }
}

function addInnerPatches(warm, dark, samples) {
  for (let i = 20; i < samples.length - 20; i += 29) {
    const s = samples[i];
    const yaw = Math.atan2(s.tx, s.tz);
    const h = 1.0 + Math.abs(Math.sin(i * 2.1)) * 1.4;
    const w = 0.9 + Math.abs(Math.cos(i * 1.3)) * 0.8;
    addBox(warm, 0.07, h, w, s.x - s.nx * 2.88, s.baseTop + (s.top - s.baseTop) * 0.45, s.z - s.nz * 2.88, yaw);
    addBox(dark, 0.06, 0.08, w * 0.72, s.x - s.nx * 2.92, s.baseTop + (s.top - s.baseTop) * 0.45 + h * 0.38, s.z - s.nz * 2.92, yaw);
  }
}

function addTowerDetails(towers, rand) {
  const wood = [];
  const stone = [];
  const iron = [];
  const ember = [];
  for (const tower of towers) {
    const { W, D, yUpper, capY } = tower.sizes;
    const halfW = W * 0.5;
    const halfD = D * 0.5;
    for (let x = -halfW + 0.9; x <= halfW - 0.9; x += 1.45) {
      localBox(wood, 0.24, 0.24, 0.55, x, capY - 0.28, halfD + 0.08);
      localBox(wood, 0.24, 0.24, 0.55, x, capY - 0.28, -halfD - 0.08);
    }
    for (let z = -halfD + 0.9; z <= halfD - 0.9; z += 1.45) {
      localBox(wood, 0.55, 0.24, 0.24, halfW + 0.08, capY - 0.28, z);
      localBox(wood, 0.55, 0.24, 0.24, -halfW - 0.08, capY - 0.28, z);
    }
    localBox(stone, 0.42, 0.54, 0.34, 0, yUpper + 3.58, halfD + 0.08);
    localBox(stone, 0.42, 0.54, 0.34, 0, yUpper + 3.58, -halfD - 0.08);
    localBox(stone, 0.34, 0.54, 0.42, halfW + 0.08, yUpper + 3.58, 0);
    localBox(stone, 0.34, 0.54, 0.42, -halfW - 0.08, yUpper + 3.58, 0);
    localBox(stone, 0.4, 0.2, 0.9, 0, yUpper + 0.14, halfD + 0.15);
    localBox(stone, 0.4, 0.2, 0.9, 0, yUpper + 0.14, -halfD - 0.15);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      localBox(stone, 0.72, 0.16, 0.9, Math.cos(a) * (halfW + 0.06), capY + 0.34, Math.sin(a) * (halfD + 0.06), a);
    }
    if (tower.roof) {
      const r = Math.max(W, D) * 0.58;
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2 + Math.PI / 12;
        const len = Math.hypot(r * 0.82, 1.92);
        const gRoof = new THREE.BoxGeometry(0.13, 0.14, len);
        gRoof.rotateX(Math.atan2(1.92, r * 0.82));
        gRoof.rotateY(a);
        gRoof.translate(Math.cos(a) * r * 0.42, capY + 1.28, Math.sin(a) * r * 0.42);
        stone.push(gRoof);
      }
    }
    if (tower.name === '北二楼' || tower.name === '北五楼' || tower.name === '北九楼') {
      const bx = halfW - 2.0;
      const bz = -halfD + 2.0;
      localCylinder(iron, 0.5, 0.38, 0.42, 8, bx, capY + 0.52, bz);
      localCylinder(ember, 0.38, 0.3, 0.16, 7, bx, capY + 0.62, bz);
      for (const sx of [-1, 1]) {
        localBox(iron, 0.08, 0.5, 0.08, bx + sx * 0.36, capY + 0.3, bz);
      }
    }
    if (tower.flagWorld) {
      const fx = -halfW + 1.55;
      const fz = halfD - 1.5;
      localCylinder(iron, 0.035, 0.035, 4.2, 5, fx, capY + 2.45, fz);
      const ring = new THREE.TorusGeometry(0.17, 0.025, 4, 8);
      ring.rotateX(Math.PI / 2);
      ring.translate(fx, capY + 0.55, fz);
      iron.push(ring);
      localBox(wood, 0.34, 0.12, 0.34, fx, capY + 0.32, fz);
    }
  }
  return { wood, stone, iron, ember };
}

function addTerrainDetail(stone, warm, blade, shrub, pine, rand) {
  for (let i = 0; i < 90; i++) {
    const x = (rand() - 0.5) * 1900;
    const z = (rand() - 0.5) * 1900;
    const y = heightAt(x, z);
    if (y < 8 || y > 250) continue;
    if (slopeAt(x, z) < 0.45) continue;
    const yaw = rand() * Math.PI;
    const s = 1.2 + rand() * 3.8;
    for (let k = 0; k < 3; k++) {
      addBox(stone, s * (1.4 + k * 0.25), 0.34 + k * 0.08, s * (0.6 + k * 0.14), x + (rand() - 0.5) * 1.6, y + 0.2 + k * 0.3, z + (rand() - 0.5) * 1.6, yaw + (rand() - 0.5) * 0.4);
    }
  }
  for (let i = 0; i < 260; i++) {
    const x = (rand() - 0.5) * 1600;
    const z = (rand() - 0.5) * 1600;
    const y = heightAt(x, z);
    if (y < 8 || y > 250) continue;
    const s = 0.35 + rand() * 0.75;
    const g = new THREE.IcosahedronGeometry(s, 0);
    g.scale(1.3, 0.65, 1.0);
    g.rotateY(rand() * 6.28);
    g.translate(x, y + s * 0.3, z);
    stone.push(g);
    if (rand() < 0.3) addBox(warm, s * 0.8, s * 0.3, s * 0.6, x + 0.4, y + 0.18, z - 0.3, rand() * 3);
  }
  for (let i = 0; i < 380; i++) {
    const x = (rand() - 0.5) * 1400;
    const z = (rand() - 0.5) * 1400;
    const y = heightAt(x, z);
    if (y < 7 || y > 252) continue;
    for (let k = 0; k < 3; k++) {
      const h = 0.55 + rand() * 0.85;
      const g = new THREE.ConeGeometry(0.08 + rand() * 0.05, h, 3);
      g.rotateZ((rand() - 0.5) * 0.3);
      g.translate(x + (rand() - 0.5) * 1.1, y + h * 0.45, z + (rand() - 0.5) * 1.1);
      blade.push(g);
    }
  }
  for (let i = 0; i < 70; i++) {
    const x = (rand() - 0.5) * 1300;
    const z = (rand() - 0.5) * 1300;
    const y = heightAt(x, z);
    if (y < 8 || y > 240) continue;
    const s = 0.7 + rand() * 1.3;
    const g = new THREE.IcosahedronGeometry(s, 0);
    g.scale(1.2, 0.7, 1.1);
    g.translate(x, y + s * 0.4, z);
    shrub.push(g);
  }
  for (let i = 0; i < 54; i++) {
    const x = (rand() - 0.5) * 1200;
    const z = (rand() - 0.5) * 1200;
    const y = heightAt(x, z);
    if (y < 8 || y > 240) continue;
    const h = 3.2 + rand() * 4.2;
    addCylinder(pine, 0.08, 0.16, h * 0.42, 5, x, y + h * 0.21, z);
    for (let k = 0; k < 3; k++) {
      const r = 0.8 * (1 - k * 0.2);
      const c = new THREE.ConeGeometry(r, h * 0.34, 6);
      c.translate(x, y + h * (0.35 + k * 0.17), z);
      pine.push(c);
    }
  }
}

function addHikers(dark, cloth, trunk, samples, rand) {
  for (let i = 0; i < 14; i++) {
    const idx = 12 + ((rand() * (samples.length - 24)) | 0);
    const s = samples[idx];
    const side = rand() < 0.5 ? -1 : 1;
    const x = s.x + s.nx * (1.0 + rand() * 0.55) * side + s.tx * (rand() - 0.5) * 6;
    const z = s.z + s.nz * (1.0 + rand() * 0.55) * side + s.tz * (rand() - 0.5) * 6;
    const y = s.top;
    const yaw = Math.atan2(s.tx, s.tz) + Math.PI * 0.5;
    addBox(dark, 0.2, 0.76, 0.24, x - 0.13, y + 0.4, z, yaw);
    addBox(dark, 0.2, 0.76, 0.24, x + 0.13, y + 0.4, z, yaw);
    addBox(cloth, 0.5, 0.72, 0.32, x, y + 1.12, z, yaw);
    addBox(cloth, 0.15, 0.56, 0.18, x + 0.32, y + 1.12, z, yaw);
    addBox(cloth, 0.15, 0.56, 0.18, x - 0.32, y + 1.12, z, yaw);
    addCylinder(trunk, 0.12, 0.13, 0.26, 6, x, y + 1.58, z);
    addBox(dark, 0.38, 0.07, 0.38, x, y + 1.73, z, yaw);
  }
}

export function addBadalingRefinement(root, mainWall, southWall, towers) {
  const rand = mulberry32(91837);
  const stone = [];
  const warm = [];
  const dark = [];
  const iron = [];
  const wood = [];
  const blade = [];
  const shrub = [];
  const pine = [];
  const cloth = [];
  const trunk = [];
  const ember = [];

  for (const wall of [mainWall, southWall]) {
    addWallCaps(warm, wall.samples, rand());
    addArrowLoops(dark, stone, wall.samples);
    addDrainage(dark, stone, wall.samples);
    addButtresses(stone, warm, wall.samples, rand);
    addWallStairs(stone, dark, wall.samples);
    addGuardChains(iron, wood, wall.samples);
    addInnerPatches(warm, dark, wall.samples);
  }
  const towerParts = addTowerDetails(towers, rand);
  stone.push(...towerParts.stone);
  iron.push(...towerParts.iron);
  wood.push(...towerParts.wood);
  ember.push(...towerParts.ember);
  addTerrainDetail(stone, warm, blade, shrub, pine, rand);
  addHikers(dark, cloth, trunk, mainWall.samples, rand);
  addHikers(dark, cloth, trunk, southWall.samples, rand);

  const normalize = (list) => list.map((g) => {
    if (!g.index) return g;
    const out = g.toNonIndexed();
    g.dispose();
    return out;
  });
  const meshes = [
    mergedMesh(normalize(stone), mats.stone, true, true),
    mergedMesh(normalize(warm), mats.stoneWarm, true, true),
    mergedMesh(normalize(dark), mats.dark, true, true),
    mergedMesh(normalize(iron), mats.iron, true, true),
    mergedMesh(normalize(wood), mats.wood, true, true),
    mergedMesh(normalize(blade), mats.grass, false, true),
    mergedMesh(normalize(shrub), mats.autumnRust, false, true),
    mergedMesh(normalize(pine), mats.pine, true, true),
    mergedMesh(normalize(cloth), mats.wallWarm, true, true),
    mergedMesh(normalize(trunk), mats.wood, true, true),
    mergedMesh(normalize(ember), mats.ember, false, true),
  ];
  for (const mesh of meshes) if (mesh) root.add(mesh);
  const group = new THREE.Group();
  group.name = 'badaling-refinement-statics';
  for (const mesh of meshes) {
    if (mesh && mesh.parent === root) root.remove(mesh);
    if (mesh) group.add(mesh);
  }
  root.add(group);
  return group;
}
