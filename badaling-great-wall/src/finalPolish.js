import * as THREE from 'three';
import { mats } from './materials.js';
import { heightAt, slopeAt, mainCurve, southCurve } from './terrain.js';
import { getWallFrame, WALL_HEIGHT } from './wall.js';
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

function towerWorld(tower, lx, ly, lz) {
  const c = Math.cos(tower.yaw);
  const s = Math.sin(tower.yaw);
  return {
    x: tower.x + lx * c + lz * s,
    y: tower.sizes.baseBottom + ly,
    z: tower.z - lx * s + lz * c,
  };
}

function towerBox(list, tower, w, h, d, lx, ly, lz, extra = 0) {
  const p = towerWorld(tower, lx, ly, lz);
  const g = new THREE.BoxGeometry(w, h, d);
  g.rotateY(tower.yaw + extra);
  g.translate(p.x, p.y, p.z);
  list.push(g);
}

function addRod(list, ax, ay, az, bx, by, bz, radius) {
  const a = new THREE.Vector3(ax, ay, az);
  const b = new THREE.Vector3(bx, by, bz);
  const dir = b.clone().sub(a);
  const len = dir.length();
  if (len < 0.02) return;
  const g = new THREE.CylinderGeometry(radius, radius, len, 4);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()));
  g.translate((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
  list.push(g);
}

function addPlaqueFrames(bronze, towers) {
  for (const tower of towers) {
    const { D, yUpper } = tower.sizes;
    for (const sz of [-1, 1]) {
      const z = sz * (D / 2 + 0.07);
      towerBox(bronze, tower, 2.34, 0.07, 0.07, 0, yUpper + 4.08, z);
      towerBox(bronze, tower, 2.34, 0.07, 0.07, 0, yUpper + 3.36, z);
      towerBox(bronze, tower, 0.07, 0.76, 0.07, -1.13, yUpper + 3.72, z);
      towerBox(bronze, tower, 0.07, 0.76, 0.07, 1.13, yUpper + 3.72, z);
    }
  }
}

function addFlagRopes(iron, wood, towers) {
  for (const tower of towers) {
    if (!tower.flagWorld) continue;
    const { W, D, capY } = tower.sizes;
    const fx = -W / 2 + 1.55;
    const fz = D / 2 - 1.5;
    const top = towerWorld(tower, fx, capY + 5.48, fz);
    const a1 = towerWorld(tower, fx - 1.1, capY + 0.72, fz + 1.0);
    const a2 = towerWorld(tower, fx - 0.9, capY + 0.68, fz - 1.0);
    const low = towerWorld(tower, fx + 0.03, capY + 1.25, fz + 0.03);
    addRod(iron, top.x, top.y, top.z, a1.x, a1.y, a1.z, 0.016);
    addRod(iron, top.x, top.y, top.z, a2.x, a2.y, a2.z, 0.016);
    addRod(iron, top.x, top.y, top.z, low.x, low.y, low.z, 0.014);
    const cleat = towerWorld(tower, fx + 0.24, capY + 0.72, fz);
    towerBox(wood, tower, 0.22, 0.12, 0.42, fx + 0.24, capY + 0.72, fz);
    towerBox(wood, tower, 0.08, 0.08, 0.06, fx + 0.12, capY + 1.76, fz);
    void cleat;
  }
}

function addTowerStairs(stoneWarm, stoneDark, towers) {
  for (const tower of towers) {
    const { W, D, baseH, yUpper } = tower.sizes;
    for (const side of [-1, 1]) {
      const z = side * (D / 2 + 0.22);
      towerBox(stoneWarm, tower, 3.5, 0.1, 0.34, 0, baseH + 0.05, z);
      towerBox(stoneWarm, tower, 3.6, 0.1, 0.36, 0, baseH - 0.06, z + side * 0.34);
      towerBox(stoneDark, tower, 3.7, 0.07, 0.14, 0, baseH - 0.15, z + side * 0.7);
    }
    for (const side of [-1, 1]) {
      const x = side * (W / 2 + 0.24);
      towerBox(stoneWarm, tower, 0.34, 0.1, 2.6, x, baseH + 0.05, 0);
      towerBox(stoneDark, tower, 0.14, 0.07, 2.7, x + side * 0.34, baseH - 0.06, 0);
    }
    void yUpper;
  }
}

function addBraziers(stone, iron, dark, ember, towers) {
  const skip = new Set(['北四楼', '北八楼', '北十楼', '南四楼', '北二楼', '北五楼', '北九楼']);
  const anchors = [];
  for (const tower of towers) {
    if (skip.has(tower.name) || tower.beaconWorld) continue;
    const { W, D, capY } = tower.sizes;
    const lx = W / 2 - 1.8;
    const lz = -D / 2 + 1.8;
    const base = towerWorld(tower, lx, capY + 0.32, lz);
    towerBox(stone, tower, 1.5, 0.2, 1.5, lx, capY + 0.34, lz);
    towerBox(stone, tower, 1.1, 0.26, 1.1, lx, capY + 0.56, lz);
    towerBox(dark, tower, 0.86, 0.24, 0.86, lx, capY + 0.78, lz);
    towerBox(iron, tower, 0.92, 0.08, 0.92, lx, capY + 0.92, lz);
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        towerBox(iron, tower, 0.07, 0.7, 0.07, lx + sx * 0.42, capY + 1.3, lz + sz * 0.42);
      }
    }
    towerBox(iron, tower, 0.9, 0.06, 0.06, lx, capY + 1.64, lz);
    towerBox(ember, tower, 0.68, 0.12, 0.68, lx, capY + 0.99, lz);
    tower.finalBrazierWorld = new THREE.Vector3(base.x, base.y + 0.8, base.z);
    anchors.push(tower.finalBrazierWorld);
  }
  return anchors;
}

function addLooseBricks(warm, shade, samples, rand) {
  for (let i = 9; i < samples.length - 9; i += 23) {
    const s = samples[i];
    const yaw = Math.atan2(s.tx, s.tz);
    for (let k = 0; k < 3; k++) {
      const side = rand() < 0.55 ? 1 : -1;
      const off = 2.5 + rand() * 1.4;
      const t = (rand() - 0.5) * 4.2;
      const x = s.x + s.nx * off * side + s.tx * t;
      const z = s.z + s.nz * off * side + s.tz * t;
      const gy = heightAt(x, z);
      const g = new THREE.BoxGeometry(0.3 + rand() * 0.18, 0.14, 0.18 + rand() * 0.1);
      g.rotateY(yaw + rand() * 0.9);
      g.translate(x, gy + 0.08 + rand() * 0.06, z);
      (rand() < 0.55 ? warm : shade).push(g);
    }
  }
}

function addStrata(cliff, rockLight, stone, warm, curve, ts, rand) {
  for (const t of ts) {
    const frame = getWallFrame(curve, t);
    for (const side of [-1, 1]) {
      if (rand() < 0.3) continue;
      const dist = 8 + rand() * 12;
      const x = frame.x + frame.nx * dist * side + frame.tx * (rand() - 0.5) * 8;
      const z = frame.z + frame.nz * dist * side + frame.tz * (rand() - 0.5) * 8;
      const gy = heightAt(x, z);
      if (gy < 5) continue;
      if (slopeAt(x, z) < 0.16) continue;
      const yaw = Math.atan2(frame.tx, frame.tz) + (rand() - 0.5) * 0.45;
      const layers = 3 + ((rand() * 3) | 0);
      for (let k = 0; k < layers; k++) {
        const w = 2.4 + rand() * 4.2;
        const d = 0.9 + rand() * 1.5;
        const g = new THREE.BoxGeometry(w, 0.24 + rand() * 0.22, d);
        g.rotateY(yaw);
        g.rotateZ((rand() - 0.5) * 0.08);
        g.translate(x + (rand() - 0.5) * 1.4, gy + 0.3 + k * (0.34 + rand() * 0.2), z + (rand() - 0.5) * 1.4);
        if (rand() < 0.65) cliff.push(g);
        else warm.push(g);
      }
      for (let k = 0; k < 14; k++) {
        const a = rand() * Math.PI * 2;
        const r = 1.2 + rand() * 5.2;
        const px = x + Math.cos(a) * r;
        const pz = z + Math.sin(a) * r;
        const py = heightAt(px, pz);
        const sc = 0.16 + rand() * 0.42;
        const g = new THREE.IcosahedronGeometry(sc, 0);
        g.scale(1.35, 0.7, 1.0);
        g.rotateY(rand() * 6.28);
        g.translate(px, py + sc * 0.28, pz);
        (rand() < 0.6 ? stone : rockLight).push(g);
      }
    }
  }
}

function addWallsideFlora(grass, rust, light, curve, ts, rand) {
  for (const t of ts) {
    const frame = getWallFrame(curve, t);
    for (const side of [-1, 1]) {
      const n = 16;
      for (let i = 0; i < n; i++) {
        const dist = 3.0 + rand() * 7.5;
        const x = frame.x + frame.nx * dist * side + frame.tx * (rand() - 0.5) * 14;
        const z = frame.z + frame.nz * dist * side + frame.tz * (rand() - 0.5) * 14;
        const gy = heightAt(x, z);
        if (gy < 4) continue;
        if (rand() < 0.62) {
          for (let k = 0; k < 3; k++) {
            const h = 0.35 + rand() * 0.65;
            const g = new THREE.ConeGeometry(0.05 + rand() * 0.05, h, 3);
            g.rotateZ((rand() - 0.5) * 0.35);
            g.rotateY(rand() * 6.28);
            g.translate(x + (rand() - 0.5) * 0.9, gy + h * 0.45, z + (rand() - 0.5) * 0.9);
            grass.push(g);
          }
        } else {
          const sc = 0.35 + rand() * 0.7;
          const g = new THREE.IcosahedronGeometry(sc, 0);
          g.scale(1.2, 0.75, 1.1);
          g.rotateY(rand() * 6.28);
          g.translate(x, gy + sc * 0.38, z);
          (rand() < 0.5 ? rust : light).push(g);
        }
      }
    }
  }
}

function addViewpointHikers(cloth, dark, wood, bronze, curve, t, count, rand) {
  const frame = getWallFrame(curve, t);
  const y = frame.y + WALL_HEIGHT;
  for (let i = 0; i < count; i++) {
    const offset = (i - (count - 1) / 2) * 1.15;
    const x = frame.x + frame.tx * offset + frame.nx * (0.5 + rand() * 0.4);
    const z = frame.z + frame.tz * offset + frame.nz * (0.5 + rand() * 0.4);
    const yaw = Math.atan2(frame.nx, frame.nz) + Math.PI + (rand() - 0.5) * 0.4;
    const c = Math.cos(yaw);
    const s = Math.sin(yaw);
    const local = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
    const legs = [[-0.14, 0], [0.14, 0]];
    for (const [lx, lz] of legs) {
      const [px, pz] = local(lx, lz);
      addBox(dark, 0.18, 0.74, 0.22, px, y + 0.38, pz, yaw);
    }
    addBox(cloth, 0.44, 0.7, 0.3, x, y + 1.1, z, yaw);
    const [bx, bz] = local(0, -0.26);
    addBox(dark, 0.36, 0.52, 0.2, bx, y + 1.18, bz, yaw);
    addBox(wood, 0.3, 0.12, 0.16, bx, y + 1.47, bz, yaw);
    addCylinder(bronze, 0.11, 0.12, 0.24, 6, x, y + 1.58, z);
    addBox(dark, 0.34, 0.06, 0.34, x, y + 1.72, z, yaw);
    const [px1, pz1] = local(0.34, 0.34);
    addRod(wood, px1, y + 0.1, pz1, px1, y + 1.28, pz1, 0.025);
    const [px2, pz2] = local(-0.34, 0.34);
    addRod(wood, px2, y + 0.1, pz2, px2, y + 1.28, pz2, 0.025);
  }
}

export function addBadalingFinalPolish(root, mainWall, southWall, towers) {
  const rand = mulberry32(66021);
  const stone = [];
  const stoneWarm = [];
  const stoneDark = [];
  const dark = [];
  const iron = [];
  const bronze = [];
  const wood = [];
  const ember = [];
  const warm = [];
  const shade = [];
  const cliff = [];
  const rockLight = [];
  const grass = [];
  const rust = [];
  const autumnLight = [];
  const cloth = [];

  addPlaqueFrames(bronze, towers);
  addFlagRopes(iron, wood, towers);
  addTowerStairs(stoneWarm, stoneDark, towers);
  addBraziers(stone, iron, dark, ember, towers);

  for (const wall of [mainWall, southWall]) {
    addLooseBricks(warm, shade, wall.samples, rand);
  }

  addStrata(cliff, rockLight, stone, warm, mainCurve, [0.19, 0.3, 0.4, 0.5, 0.6, 0.72, 0.84], rand);
  addStrata(cliff, rockLight, stone, warm, southCurve, [0.22, 0.38, 0.56, 0.74, 0.9], rand);
  addWallsideFlora(grass, rust, autumnLight, mainCurve, [0.12, 0.22, 0.34, 0.47, 0.55, 0.64, 0.76, 0.88], rand);
  addWallsideFlora(grass, rust, autumnLight, southCurve, [0.16, 0.32, 0.5, 0.68, 0.86], rand);

  const n8 = towers.find((t) => t.name === '北八楼');
  if (n8) {
    const { W, D, capY } = n8.sizes;
    for (const sx of [-1, 1]) {
      towerBox(wood, n8, 0.14, 3.15, 0.14, sx * (W / 2 + 0.25), capY + 1.9, -D / 2 - 0.4);
      towerBox(stoneDark, n8, 0.4, 0.22, 0.4, sx * (W / 2 + 0.25), capY + 0.35, -D / 2 - 0.4);
    }
  }
  addViewpointHikers(cloth, dark, wood, bronze, mainCurve, 0.497, 3, rand);
  addViewpointHikers(cloth, dark, wood, bronze, mainCurve, 0.242, 2, rand);
  addViewpointHikers(cloth, dark, wood, bronze, southCurve, 0.895, 2, rand);

  const normalize = (list) => list.map((g) => {
    if (!g.index) return g;
    const out = g.toNonIndexed();
    g.dispose();
    return out;
  });
  const meshes = [
    mergedMesh(normalize(stone), mats.stone, true, true),
    mergedMesh(normalize(stoneWarm), mats.stoneWarm, true, true),
    mergedMesh(normalize(stoneDark), mats.stoneDark, true, true),
    mergedMesh(normalize(dark), mats.dark, true, true),
    mergedMesh(normalize(iron), mats.iron, true, true),
    mergedMesh(normalize(bronze), mats.bronze, true, false),
    mergedMesh(normalize(wood), mats.wood, true, true),
    mergedMesh(normalize(ember), mats.ember, false, true),
    mergedMesh(normalize(warm), mats.stoneWarm, true, true),
    mergedMesh(normalize(shade), mats.wallShade, true, true),
    mergedMesh(normalize(cliff), mats.cliff, true, true),
    mergedMesh(normalize(rockLight), mats.rockLight, true, true),
    mergedMesh(normalize(grass), mats.grass, false, true),
    mergedMesh(normalize(rust), mats.autumnRust, false, true),
    mergedMesh(normalize(autumnLight), mats.autumnLight, false, true),
    mergedMesh(normalize(cloth), mats.cloth, true, true),
  ];
  for (const mesh of meshes) if (mesh) root.add(mesh);

  return { braziers: towers.map((t) => t.finalBrazierWorld).filter(Boolean) };
}
