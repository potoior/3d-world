import * as THREE from 'three';
import { mats } from './materials.js';
import { heightAt, trailSamples, platforms } from './terrain.js';
import { spireSpecs } from './peaks.js';
import { mergeGeometryList } from './geometry.js';

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

function smooth(a, b, x) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function box(list, w, h, d, x, y, z, ry = 0, rx = 0, rz = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (rx) g.rotateX(rx);
  if (rz) g.rotateZ(rz);
  if (ry) g.rotateY(ry);
  g.translate(x, y, z);
  list.push(g);
}

function cyl(list, rt, rb, h, seg, x, y, z, rx = 0, rz = 0) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  if (rx) g.rotateX(rx);
  if (rz) g.rotateZ(rz);
  g.translate(x, y, z);
  list.push(g);
}

function sphere(list, r, x, y, z, ws = 7, hs = 5) {
  const g = new THREE.SphereGeometry(r, ws, hs);
  g.translate(x, y, z);
  list.push(g);
}

function placed(list, geo, x, y, z, yaw) {
  if (yaw) geo.rotateY(yaw);
  geo.translate(x, y, z);
  list.push(geo);
}

function frameAt(index) {
  const n = trailSamples.length;
  const s = trailSamples[Math.max(0, Math.min(n - 1, index))];
  const a = trailSamples[Math.max(0, index - 1)];
  const b = trailSamples[Math.min(n - 1, index + 1)];
  let tx = b.x - a.x;
  let tz = b.z - a.z;
  const len = Math.hypot(tx, tz) || 1;
  tx /= len;
  tz /= len;
  return { s, tx, tz, nx: -tz, nz: tx, yaw: Math.atan2(tx, tz) };
}

function segGeo(ax, ay, az, bx, by, bz, ra, rb, seg = 5) {
  const dx = bx - ax;
  const dy = by - ay;
  const dz = bz - az;
  const len = Math.hypot(dx, dy, dz) || 1;
  const g = new THREE.CylinderGeometry(rb, ra, len, seg);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx / len, dy / len, dz / len));
  g.applyQuaternion(q);
  g.translate((ax + bx) * 0.5, (ay + by) * 0.5, (az + bz) * 0.5);
  return g;
}

function roofY(vx, vz, h) {
  const zf = Math.abs(vz);
  const xf = Math.abs(vx);
  let y = h * (1 - Math.pow(zf, 1.18));
  y *= 1 - smooth(0.52, 0.99, xf) * 0.72;
  y += 0.55 * smooth(0.4, 1, xf) * Math.pow(zf, 1.8) * 1.15;
  y += h * 0.045 * Math.pow(xf, 3.2) * (1 - zf * 0.35);
  return y;
}

function addRoofFinish(bucket, x, y, z, yaw, w, d, h) {
  const roof = [];
  const gold = [];
  const wood = [];
  const zs = [0.18, 0.34, 0.48, 0.6, 0.7];
  for (const side of [-1, 1]) {
    for (const zz of zs) {
      const vz = zz * side;
      for (let i = 0; i < 12; i++) {
        const vx0 = -1 + i / 6;
        const vx1 = -1 + (i + 1) / 6;
        const lx = (vx0 + vx1) * 0.25 * w;
        const yy = roofY((vx0 + vx1) * 0.5, vz, h);
        const slope = (roofY(vx1, vz, h) - roofY(vx0, vz, h)) / ((vx1 - vx0) * w * 0.5);
        box(roof, (w / 12) * 1.03, 0.06, 0.12, lx, yy + 0.05, vz * d * 0.5, 0, 0, -Math.atan(slope));
      }
    }
    for (let i = 0; i <= 16; i++) {
      const vx = -1 + i / 8;
      const yy = roofY(vx, side, h);
      cyl(roof, 0.075, 0.095, 0.16, 6, vx * w * 0.5, yy + 0.02, side * (d * 0.5 + 0.05), Math.PI * 0.5, 0);
      if (i % 4 === 0) cyl(gold, 0.07, 0.07, 0.09, 6, vx * w * 0.5, yy - 0.01, side * (d * 0.5 + 0.15), Math.PI * 0.5, 0);
    }
    box(wood, w * 0.94, 0.11, 0.13, 0, 0.18, side * (d * 0.5 + 0.08));
  }
  cyl(roof, 0.13, 0.16, w * 0.78, 8, 0, h + 0.09, 0, 0, Math.PI * 0.5);
  for (const sx of [-1, 1]) cyl(gold, 0.1, 0.13, 0.34, 6, sx * w * 0.39, h + 0.18, 0, 0, sx * Math.PI * 0.42);
  const place = (g) => {
    if (yaw) g.rotateY(yaw);
    g.translate(x, y, z);
  };
  roof.forEach(place);
  gold.forEach(place);
  wood.forEach(place);
  roof.forEach((g) => bucket.add(g, mats.roof));
  gold.forEach((g) => bucket.add(g, mats.gold));
  wood.forEach((g) => bucket.add(g, mats.wood));
}

function addBrackets(bucket, x, y, z, yaw, w, count) {
  const gold = [];
  const wood = [];
  for (let i = 0; i < count; i++) {
    const lx = -w * 0.5 + 0.7 + (i / Math.max(1, count - 1)) * (w - 1.4);
    box(wood, 1.0, 0.12, 0.2, lx, 0.1, 0);
    box(gold, 0.9, 0.1, 0.16, lx, 0.25, 0);
    box(gold, 0.18, 0.2, 0.5, lx - 0.3, 0.32, 0.12, 0.5);
    box(gold, 0.18, 0.2, 0.5, lx + 0.3, 0.32, 0.12, -0.5);
    box(wood, 0.16, 0.42, 0.16, lx, -0.2, 0.1);
    box(gold, 0.22, 0.09, 0.22, lx, 0.42, 0.05);
  }
  const place = (g) => {
    if (yaw) g.rotateY(yaw);
    g.translate(x, y, z);
  };
  gold.forEach(place);
  wood.forEach(place);
  gold.forEach((g) => bucket.add(g, mats.gold));
  wood.forEach((g) => bucket.add(g, mats.wood));
}

function addDoor(bucket, x, y, z, yaw, w, h, studded = true) {
  const door = [];
  const gold = [];
  const dark = [];
  for (const side of [-1, 1]) {
    box(door, w * 0.46, h, 0.09, side * w * 0.235, h * 0.5, 0);
    box(gold, w * 0.03, h * 0.86, 0.025, side * w * 0.025, h * 0.5, 0.06);
    if (studded) {
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 3; c++) {
          sphere(gold, 0.055, side * w * 0.235 + (c - 1) * w * 0.13, h * (0.22 + r * 0.16), 0.07, 5, 4);
        }
      }
    }
    sphere(gold, 0.09, side * w * 0.07, h * 0.48, 0.08, 6, 4);
    box(gold, 0.05, 0.24, 0.03, side * w * 0.07, h * 0.38, 0.08);
  }
  box(dark, w + 0.35, 0.16, 0.3, 0, 0.08, 0);
  box(gold, w + 0.2, 0.1, 0.22, 0, h + 0.08, 0);
  for (const sx of [-1, 1]) box(gold, 0.12, h + 0.18, 0.24, sx * (w * 0.5 + 0.1), h * 0.5, 0);
  const place = (g) => {
    if (yaw) g.rotateY(yaw);
    g.translate(x, y, z);
  };
  door.forEach(place);
  gold.forEach(place);
  dark.forEach(place);
  door.forEach((g) => bucket.add(g, mats.wood));
  gold.forEach((g) => bucket.add(g, mats.gold));
  dark.forEach((g) => bucket.add(g, mats.stoneDark));
}

function addCenser(bucket, x, y, z, s = 1) {
  const bronze = [];
  const gold = [];
  cyl(bronze, 0.82 * s, 0.58 * s, 0.8 * s, 10, 0, 0.78 * s, 0);
  cyl(bronze, 0.92 * s, 0.86 * s, 0.18 * s, 10, 0, 1.24 * s, 0);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.5;
    cyl(bronze, 0.1 * s, 0.14 * s, 0.62 * s, 5, Math.cos(a) * 0.5 * s, 0.31 * s, Math.sin(a) * 0.5 * s);
  }
  for (const side of [-1, 1]) {
    const g = new THREE.TorusGeometry(0.3 * s, 0.05 * s, 4, 8, Math.PI);
    g.rotateZ(Math.PI * 0.5);
    g.translate(side * 0.84 * s, 1.18 * s, 0);
    bronze.push(g);
  }
  box(gold, 1.5 * s, 0.07 * s, 0.14 * s, 0, 1.27 * s, 0);
  for (const ox of [-0.26, 0, 0.26]) cyl(gold, 0.018, 0.018, 0.42 * s, 3, ox * s, 1.56 * s, 0);
  const place = (g) => g.translate(x, y, z);
  bronze.forEach(place);
  gold.forEach(place);
  bronze.forEach((g) => bucket.add(g, mats.bronze));
  gold.forEach((g) => bucket.add(g, mats.gold));
}

function addPlaqueFrame(bucket, x, y, z, yaw, w, h) {
  const gold = [];
  const dark = [];
  box(dark, w + 0.35, h + 0.3, 0.12, 0, 0, 0);
  box(gold, w + 0.45, 0.09, 0.18, 0, h * 0.5 + 0.2, 0);
  box(gold, w + 0.45, 0.09, 0.18, 0, -h * 0.5 - 0.2, 0);
  box(gold, 0.1, h + 0.4, 0.18, -w * 0.5 - 0.2, 0, 0);
  box(gold, 0.1, h + 0.4, 0.18, w * 0.5 + 0.2, 0, 0);
  const place = (g) => {
    if (yaw) g.rotateY(yaw);
    g.translate(x, y, z);
  };
  dark.forEach(place);
  gold.forEach(place);
  dark.forEach((g) => bucket.add(g, mats.wood));
  gold.forEach((g) => bucket.add(g, mats.gold));
}

function addStele(bucket, x, y, z, yaw, w = 1.1, h = 2.4) {
  const stone = [];
  const dark = [];
  const gold = [];
  box(dark, w, h, 0.44, 0, h * 0.5 + 0.2, 0);
  box(stone, w + 0.6, 0.28, 0.9, 0, 0.14, 0);
  box(stone, w + 0.3, 0.2, 0.6, 0, h + 0.2, 0);
  for (let i = 0; i < 4; i++) box(gold, w * 0.6, 0.06, 0.03, 0, h * (0.42 + i * 0.11), 0.24);
  const place = (g) => {
    if (yaw) g.rotateY(yaw);
    g.translate(x, y, z);
  };
  stone.forEach(place);
  dark.forEach(place);
  gold.forEach(place);
  stone.forEach((g) => bucket.add(g, mats.stone));
  dark.forEach((g) => bucket.add(g, mats.stoneDark));
  gold.forEach((g) => bucket.add(g, mats.gold));
}

function addPine(bucket, x, z, h, lean, rand) {
  const y = heightAt(x, z);
  const tx = Math.cos(lean) * h * 0.24;
  const tz = Math.sin(lean) * h * 0.24;
  bucket.add(segGeo(x, y - 0.5, z, x + tx * 0.4, y + h * 0.55, z + tz * 0.4, 0.32 + h * 0.01, 0.18, 5), mats.trunk);
  bucket.add(segGeo(x + tx * 0.4, y + h * 0.55, z + tz * 0.4, x + tx, y + h * 0.94, z + tz, 0.18, 0.07, 4), mats.trunk);
  for (let i = 0; i < 3; i++) {
    const k = i / 2;
    const cx = x + tx * (0.4 + k * 0.6);
    const cz = z + tz * (0.4 + k * 0.6);
    const cy = y + h * (0.6 + k * 0.3);
    for (let n = 0; n < 4; n++) {
      const a = rand() * 6.28;
      const rr = h * (0.13 + rand() * 0.12);
      const cone = new THREE.ConeGeometry(h * (0.14 + rand() * 0.1), h * 0.1, 5, 1, true);
      cone.rotateX(Math.PI * 0.5 + (rand() - 0.5) * 0.5);
      cone.rotateY(a);
      cone.translate(cx + Math.cos(a) * rr, cy + rand() * 0.4, cz + Math.sin(a) * rr);
      bucket.add(cone, rand() < 0.35 ? mats.pineLight : mats.pine);
    }
  }
  const tip = new THREE.ConeGeometry(h * 0.15, h * 0.16, 5, 1, true);
  tip.translate(x + tx, y + h * 0.98, z + tz);
  bucket.add(tip, mats.pineDeep);
}

function addRestingPorter(bucket, x, y, z, yaw, rand, loaded) {
  const wood = [];
  const cloth = [];
  const skin = [];
  const dark = [];
  box(dark, 0.15, 0.5, 0.16, -0.1, 0.3, 0);
  box(dark, 0.15, 0.5, 0.16, 0.1, 0.3, 0);
  box(cloth, 0.38, 0.62, 0.25, 0, 0.92, 0);
  box(cloth, 0.12, 0.5, 0.14, -0.25, 0.93, 0, 0, 0, 0.12);
  box(cloth, 0.12, 0.5, 0.14, 0.25, 0.93, 0, 0, 0, -0.12);
  sphere(skin, 0.16, 0, 1.42, 0, 7, 5);
  const hat = new THREE.ConeGeometry(0.27, 0.15, 8);
  hat.translate(0, 1.6, 0);
  cloth.push(hat);
  if (loaded) {
    cyl(wood, 0.035, 0.035, 1.85, 5, 0, 1.18, 0.08, 0, Math.PI * 0.5);
    for (const side of [-1, 1]) {
      cyl(wood, 0.19, 0.15, 0.27, 6, side * 0.8, 0.94, 0.08);
      cyl(wood, 0.012, 0.012, 0.34, 3, side * 0.8, 1.14, 0.08);
    }
  }
  const place = (g) => {
    if (yaw) g.rotateY(yaw);
    g.translate(x, y, z);
  };
  wood.forEach(place);
  cloth.forEach(place);
  skin.forEach(place);
  dark.forEach(place);
  wood.forEach((g) => bucket.add(g, mats.wood));
  cloth.forEach((g) => bucket.add(g, mats.redWall));
  skin.forEach((g) => bucket.add(g, mats.stone));
  dark.forEach((g) => bucket.add(g, mats.iron));
}

function chainSpan(bucket, ax, ay, az, bx, by, bz, sag) {
  let px = ax;
  let py = ay;
  let pz = az;
  for (let i = 1; i <= 4; i++) {
    const k = i / 4;
    const nx = ax + (bx - ax) * k;
    const nz = az + (bz - az) * k;
    const ny = ay + (by - ay) * k - Math.sin(k * Math.PI) * sag;
    bucket.add(segGeo(px, py, pz, nx, ny, nz, 0.032, 0.032, 4), mats.iron);
    px = nx;
    py = ny;
    pz = nz;
  }
}

class Bucket {
  constructor() { this.map = new Map(); }
  add(geo, mat) {
    if (!this.map.has(mat)) this.map.set(mat, []);
    this.map.get(mat).push(geo);
  }
  finish(name) {
    const group = new THREE.Group();
    group.name = name;
    for (const [mat, list] of this.map) {
      const geo = mergeGeometryList(list);
      if (!geo) continue;
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = !mat.userData?.noShadow;
      mesh.receiveShadow = true;
      group.add(mesh);
    }
    return group;
  }
}

export function createMountTaiFinalPolish() {
  const bucket = new Bucket();
  const staticGroup = new THREE.Group();
  staticGroup.name = 'taishan-final-polish';
  const dynamicGroup = new THREE.Group();
  dynamicGroup.name = 'taishan-final-animation';
  const summit = platforms[3];
  const gateFrame = frameAt(Math.round(0.905 * (trailSamples.length - 1)));
  const gate = gateFrame.s;
  const gateYaw = Math.atan2(-gateFrame.tx, -gateFrame.tz);
  const stats = { roofTiles: 0, brackets: 0, doors: 0, censers: 0, steles: 0, strata: 0, chains: 0, nosings: 0, signs: 0, pines: 0, porters: 0, hikers: 0, birds: 0, ribbons: 0, bells: 0 };

  addRoofFinish(bucket, gate.x, gate.y + 7.15, gate.z, gateYaw, 16.4, 4.6, 2.3);
  addRoofFinish(bucket, summit.x + 8.0, summit.y + 4.71, summit.z - 7.0, 0, 14.6, 8.5, 3.2);
  addRoofFinish(bucket, summit.x + 16.6, summit.y + 3.41, summit.z - 8.6, -0.1, 7.2, 5.7, 2.1);
  stats.roofTiles += 3;

  addBrackets(bucket, summit.x + 8.0, summit.y + 4.62, summit.z - 3.38, 0, 12.4, 5);
  addBrackets(bucket, gate.x, gate.y + 6.06, gate.z, gateYaw, 13.2, 6);
  stats.brackets += 11;

  addDoor(bucket, summit.x + 8.0, summit.y + 0.7, summit.z - 3.66, 0, 3.4, 2.7);
  addDoor(bucket, gate.x + Math.sin(gateYaw) * 1.6, gate.y + 0.1, gate.z + Math.cos(gateYaw) * 1.6, gateYaw, 5.2, 4.1);
  stats.doors += 2;

  addPlaqueFrame(bucket, summit.x + 8.0, summit.y + 5.2, summit.z - 3.27, 0, 3.6, 1.28);
  const gatePlaqueY = gate.y + 6.42;
  addPlaqueFrame(bucket, gate.x + Math.sin(gateYaw) * 1.66, gatePlaqueY, gate.z + Math.cos(gateYaw) * 1.66, gateYaw, 3.4, 1.2);

  const redList = bucket.map.get(mats.redWall) || (bucket.map.set(mats.redWall, []), bucket.map.get(mats.redWall));
  const coupletGold = bucket.map.get(mats.gold) || (bucket.map.set(mats.gold, []), bucket.map.get(mats.gold));
  for (const side of [-1, 1]) {
    const cx = summit.x + 8.0 + side * 2.7;
    const cz = summit.z - 3.6;
    box(redList, 0.3, 2.0, 0.07, cx, summit.y + 2.55, cz);
    for (let k = 0; k < 5; k++) box(coupletGold, 0.13, 0.06, 0.03, cx, summit.y + 1.96 + k * 0.3, cz - 0.06);
  }

  addCenser(bucket, gate.x - gateFrame.nx * 4.6, gate.y + 0.2, gate.z - gateFrame.nz * 4.6, 0.9);
  addCenser(bucket, summit.x + 17.0, summit.y + 0.12, summit.z - 6.0, 0.8);
  addCenser(bucket, summit.x - 1.0, summit.y + 0.12, summit.z - 8.6, 0.7);
  stats.censers += 3;

  for (const [x, z, w, h, yaw] of [
    [summit.x - 9.2, summit.z - 1.0, 1.0, 2.3, 0.2],
    [summit.x + 20.6, summit.z - 0.2, 0.9, 2.1, -0.1],
    [gate.x - gateFrame.nx * 5.6, gate.z - gateFrame.nz * 5.6, 1.1, 2.4, gateYaw + 0.1],
    [gate.x + gateFrame.nx * 5.9, gate.z + gateFrame.nz * 5.9, 1.0, 2.2, gateYaw - 0.1],
  ]) {
    addStele(bucket, x, heightAt(x, z) + 0.1, z, yaw, w, h);
    stats.steles++;
  }

  const rand = mulberry32(9021);
  for (let si = 0; si < 8; si++) {
    const s = spireSpecs[si];
    const [cx, cz, , topY, rBottom] = s;
    const baseY = Math.max(12, heightAt(cx, cz) - 12);
    const hh = Math.max(8, topY - baseY);
    for (let i = 0; i < 4; i++) {
      const a = rand() * Math.PI * 2;
      const rad = rBottom * (0.8 + rand() * 0.14);
      const g = new THREE.BoxGeometry(2.4 + rand() * 3.2, 0.3 + rand() * 0.25, 1.4 + rand() * 1.4);
      g.rotateY(a + 0.2);
      g.translate(cx + Math.cos(a) * rad, baseY + hh * (0.24 + i * 0.17), cz + Math.sin(a) * rad);
      bucket.add(g, i % 2 ? mats.graniteLight : mats.graniteDark);
      stats.strata++;
    }
    for (let i = 0; i < 2; i++) {
      const a = rand() * Math.PI * 2;
      const rad = rBottom * (0.84 + rand() * 0.1);
      let px = cx + Math.cos(a) * rad;
      let pz = cz + Math.sin(a) * rad;
      let py = baseY + hh * (0.28 + rand() * 0.35);
      for (let k = 0; k < 3; k++) {
        const nx = px + Math.cos(a + 0.4) * (0.6 + rand() * 0.8);
        const nz = pz + Math.sin(a + 0.4) * (0.6 + rand() * 0.8);
        const ny = py + 0.8 + rand() * 1.2;
        bucket.add(segGeo(px, py, pz, nx, ny, nz, 0.06, 0.05, 4), mats.stoneDark);
        px = nx;
        py = ny;
        pz = nz;
      }
    }
  }

  const insA = [];
  const insB = [];
  for (const [t, side, w, h, mat] of [[0.72, 1, 3.4, 1.5, insA], [0.86, -1, 3.0, 1.3, insB], [0.94, 1, 2.6, 1.2, insA]]) {
    const f = frameAt(Math.round(t * (trailSamples.length - 1)));
    const off = f.s.width * 0.5 + 2.2;
    const x = f.s.x + f.nx * side * off;
    const z = f.s.z + f.nz * side * off;
    const yaw = Math.atan2(-f.nx * side, -f.nz * side);
    const y = heightAt(x, z) + 0.2;
    const darkList = bucket.map.get(mats.stoneDark) || (bucket.map.set(mats.stoneDark, []), bucket.map.get(mats.stoneDark));
    box(darkList, w + 0.5, h + 0.5, 0.65, x, y + h * 0.5, z, yaw);
    const plane = new THREE.PlaneGeometry(w, h);
    plane.rotateY(yaw);
    plane.translate(x + Math.sin(yaw) * 0.34, y + h * 0.5 + 0.1, z + Math.cos(yaw) * 0.34);
    mat.push(plane);
  }
  if (insA.length) bucket.add(mergeGeometryList(insA), mats.inscriptionA);
  if (insB.length) bucket.add(mergeGeometryList(insB), mats.inscriptionB);

  const stone = bucket.map.get(mats.stone) || (bucket.map.set(mats.stone, []), bucket.map.get(mats.stone));
  const stoneDark = bucket.map.get(mats.stoneDark) || (bucket.map.set(mats.stoneDark, []), bucket.map.get(mats.stoneDark));
  const wood = bucket.map.get(mats.wood) || (bucket.map.set(mats.wood, []), bucket.map.get(mats.wood));
  const gold = bucket.map.get(mats.gold) || (bucket.map.set(mats.gold, []), bucket.map.get(mats.gold));
  const iron = bucket.map.get(mats.iron) || (bucket.map.set(mats.iron, []), bucket.map.get(mats.iron));

  for (let i = 0; i < trailSamples.length - 1; i++) {
    const a = trailSamples[i];
    const b = trailSamples[i + 1];
    if (a.t <= 0.355 || a.t >= 0.945) continue;
    const segLen = Math.hypot(b.x - a.x, b.z - a.z);
    const rise = Math.abs(b.y - a.y);
    const stepH = 0.2 + Math.min(0.16, rise * 0.16);
    const yaw = Math.atan2(b.x - a.x, b.z - a.z);
    box(stone, a.width * 0.98, 0.075, 0.18, a.x, a.y + stepH - 0.01, a.z, yaw);
    stats.nosings++;
    if (i % 2 === 0) {
      for (const side of [-1, 1]) {
        const nx = -Math.cos(yaw) * side;
        const nz = Math.sin(yaw) * side;
        box(stoneDark, 0.26, 0.2, segLen * 2.1 + 0.2, a.x + nx * (a.width * 0.5 + 0.12), a.y + 0.3, a.z + nz * (a.width * 0.5 + 0.12), yaw);
      }
    }
  }

  for (let i = 6; i < trailSamples.length - 6; i += 10) {
    const a = trailSamples[i];
    if (a.t <= 0.36 || a.t >= 0.94) continue;
    const yaw = Math.atan2(trailSamples[Math.min(trailSamples.length - 1, i + 1)].x - trailSamples[i - 1].x, trailSamples[Math.min(trailSamples.length - 1, i + 1)].z - trailSamples[i - 1].z);
    for (const side of [-1, 1]) {
      const nx = -Math.cos(yaw) * side;
      const nz = Math.sin(yaw) * side;
      const px = a.x + nx * (a.width * 0.5 + 0.16);
      const pz = a.z + nz * (a.width * 0.5 + 0.16);
      cyl(iron, 0.055, 0.085, 1.05, 5, px, a.y + 0.66, pz);
      sphere(iron, 0.075, px, a.y + 1.2, pz, 5, 4);
      if (i + 10 < trailSamples.length - 6 && trailSamples[i + 10].t < 0.94) {
        const nb = trailSamples[i + 10];
        const yaw2 = Math.atan2(trailSamples[Math.min(trailSamples.length - 1, i + 11)].x - trailSamples[i + 9].x, trailSamples[Math.min(trailSamples.length - 1, i + 11)].z - trailSamples[i + 9].z);
        const nx2 = -Math.cos(yaw2) * side;
        const nz2 = Math.sin(yaw2) * side;
        chainSpan(bucket, px, a.y + 1.15, pz, nb.x + nx2 * (nb.width * 0.5 + 0.16), nb.y + 1.15, nb.z + nz2 * (nb.width * 0.5 + 0.16), 0.2);
        stats.chains++;
      }
    }
  }

  for (const [t, side] of [[0.405, 1], [0.56, -1], [0.685, 1], [0.82, -1], [0.885, 1]]) {
    const f = frameAt(Math.round(t * (trailSamples.length - 1)));
    const s = f.s;
    const off = s.width * 0.5 + 1.1;
    const x = s.x + f.nx * side * off;
    const z = s.z + f.nz * side * off;
    const y = s.y;
    cyl(wood, 0.09, 0.12, 2.3, 6, x, y + 1.15, z);
    box(wood, 1.7, 0.9, 0.16, x + f.nx * side * 0.5, y + 1.95, z + f.nz * side * 0.5, f.yaw + Math.PI * 0.5);
    for (let k = 0; k < 3; k++) box(gold, 1.2, 0.06, 0.03, x + f.nx * side * 0.5, y + 1.72 + k * 0.2, z + f.nz * side * 0.5 - 0.1, f.yaw + Math.PI * 0.5);
    stats.signs++;
  }

  const randP = mulberry32(6117);
  for (const [x, z, h] of [[-148, -196, 7.2], [-92, -232, 6.4], [-166, -250, 8.2], [-48, -274, 5.8], [52, -212, 6.8], [128, 34, 7.4]]) {
    addPine(bucket, x, z, h, randP() * 6.28, randP);
    stats.pines++;
  }
  for (const [t, side, loaded] of [[0.46, 1, true], [0.63, -1, true], [0.79, 1, false], [0.9, -1, true], [0.52, -1, false], [0.74, 1, false], [0.92, 1, false]]) {
    const f = frameAt(Math.round(t * (trailSamples.length - 1)));
    const s = f.s;
    const x = s.x + f.nx * side * (s.width * 0.5 + 0.95);
    const z = s.z + f.nz * side * (s.width * 0.5 + 0.95);
    addRestingPorter(bucket, x, s.y - 0.15, z, f.yaw, randP, loaded);
    if (loaded) stats.porters++;
    else stats.hikers++;
  }
  for (let i = 0; i < 8; i++) {
    const bx = -60 + (randP() - 0.5) * 180;
    const bz = -190 + (randP() - 0.5) * 160;
    const by = 296 + randP() * 44;
    const a = randP() * 6.2;
    box(iron, 0.7, 0.04, 0.14, bx - Math.cos(a) * 0.3, by, bz - Math.sin(a) * 0.3, a, 0, 0.32);
    box(iron, 0.7, 0.04, 0.14, bx + Math.cos(a) * 0.3, by, bz + Math.sin(a) * 0.3, a, 0, -0.32);
    stats.birds++;
  }

  const ribbonRacks = [];
  for (const [t, side] of [[0.42, -1], [0.68, 1], [0.86, -1]]) {
    const f = frameAt(Math.round(t * (trailSamples.length - 1)));
    const s = f.s;
    const off = s.width * 0.5 + 1.35;
    const x = s.x + f.nx * side * off;
    const z = s.z + f.nz * side * off;
    const yaw = f.yaw + Math.PI * 0.5;
    const half = 1.7;
    for (const k of [-1, 1]) {
      const px = x + Math.cos(yaw) * k * half;
      const pz = z - Math.sin(yaw) * k * half;
      cyl(wood, 0.07, 0.1, 2.35, 5, px, s.y + 1.2, pz);
      cyl(gold, 0.11, 0.11, 0.1, 6, px, s.y + 2.4, pz);
    }
    bucket.add(segGeo(x + Math.cos(yaw) * half, s.y + 2.32, z - Math.sin(yaw) * half, x - Math.cos(yaw) * half, s.y + 2.32, z + Math.sin(yaw) * half, 0.055, 0.055, 5), mats.wood);
    ribbonRacks.push({ x, y: s.y + 2.28, z, yaw, width: half * 2, count: 28 });
    stats.ribbons += 28;
  }

  staticGroup.add(bucket.finish('taishan-polish-static'));

  const ribbonGeo = new THREE.PlaneGeometry(0.15, 1, 1, 4);
  ribbonGeo.translate(0, -0.5, 0);
  const ribbonItems = [];
  const ribbonRand = mulberry32(7742);
  const ribbonMat = mats.ribbon;
  const ribbons = new THREE.InstancedMesh(ribbonGeo, ribbonMat, stats.ribbons);
  ribbons.name = 'shibapan-prayer-ribbons';
  ribbons.frustumCulled = false;
  ribbons.castShadow = false;
  const rColor = new THREE.Color();
  const palette = [0xa83224, 0xc0442c, 0xd4a33f, 0xb26a2a, 0x9a2d22, 0xcf8a35];
  let ri = 0;
  for (const rack of ribbonRacks) {
    for (let i = 0; i < rack.count; i++) {
      const u = rack.count === 1 ? 0 : i / (rack.count - 1);
      ribbonItems.push({
        x: rack.x + Math.cos(rack.yaw) * (u - 0.5) * rack.width,
        y: rack.y,
        z: rack.z - Math.sin(rack.yaw) * (u - 0.5) * rack.width,
        yaw: rack.yaw,
        phase: ribbonRand() * 6.28,
        amp: 0.1 + ribbonRand() * 0.17,
        len: 0.55 + ribbonRand() * 0.55,
      });
      rColor.setHex(palette[(ribbonRand() * palette.length) | 0]);
      ribbons.setColorAt(ri++, rColor);
    }
  }
  if (ribbons.instanceColor) ribbons.instanceColor.needsUpdate = true;
  dynamicGroup.add(ribbons);

  const bells = [];
  for (let i = 0; i < 6; i++) {
    const lx = -5.0 + i * 2.0;
    bells.push({ x: gate.x + Math.cos(gateYaw) * lx, y: gate.y + 6.85, z: gate.z - Math.sin(gateYaw) * lx, yaw: gateYaw });
  }
  for (let i = 0; i < 6; i++) {
    const lx = -4.4 + i * 1.76;
    bells.push({ x: summit.x + 8.0 + lx, y: summit.y + 4.48, z: summit.z - 3.25, yaw: 0 });
  }
  const bellParts = [];
  cyl(bellParts, 0.17, 0.24, 0.34, 8, 0, -0.18, 0);
  const rim = new THREE.TorusGeometry(0.24, 0.035, 4, 8);
  rim.rotateX(Math.PI * 0.5);
  rim.translate(0, -0.35, 0);
  bellParts.push(rim);
  sphere(bellParts, 0.05, 0, -0.42, 0, 5, 4);
  cyl(bellParts, 0.015, 0.015, 0.12, 3, 0, 0.01, 0);
  const bellGeo = mergeGeometryList(bellParts);
  const bellMesh = new THREE.InstancedMesh(bellGeo, mats.bronze, bells.length);
  bellMesh.name = 'eave-wind-bells';
  bellMesh.frustumCulled = false;
  dynamicGroup.add(bellMesh);
  stats.bells = bells.length;

  const rayParts = [];
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * Math.PI * 2 + 0.2;
    const spread = 0.035 + (i % 3) * 0.012;
    const r0 = 60;
    const r1 = 430 + (i % 4) * 70;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const p0x = ca * r0 - sa * spread * r0;
    const p0y = sa * r0 + ca * spread * r0;
    const p1x = ca * r0 + sa * spread * r0;
    const p1y = sa * r0 - ca * spread * r0;
    const p2x = ca * r1 + sa * spread * r1;
    const p2y = sa * r1 - ca * spread * r1;
    const p3x = ca * r1 - sa * spread * r1;
    const p3y = sa * r1 + ca * spread * r1;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([p0x, p0y, 0, p1x, p1y, 0, p2x, p2y, 0, p0x, p0y, 0, p2x, p2y, 0, p3x, p3y, 0], 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0], 2));
    rayParts.push(g);
  }
  const rayGeo = mergeGeometryList(rayParts);
  const rayMat = new THREE.MeshBasicMaterial({ color: 0xffd7a0, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false, toneMapped: true });
  const rays = new THREE.Mesh(rayGeo, rayMat);
  rays.name = 'sunrise-rays';
  rays.position.set(1160, 350, 86);
  rays.lookAt(new THREE.Vector3(-74, 270, -292));
  rays.renderOrder = 5;
  dynamicGroup.add(rays);

  const cloudParts = [];
  const cloudRand = mulberry32(8851);
  for (let i = 0; i < 12; i++) {
    const t = i / 11;
    const cx = -112 + (t - 0.5) * 190 + (cloudRand() - 0.5) * 30;
    const cz = -170 - t * 120 + (cloudRand() - 0.5) * 32;
    const cy = 218 + cloudRand() * 34 + t * 10;
    const g = new THREE.PlaneGeometry(90 + cloudRand() * 150, 26 + cloudRand() * 36);
    g.rotateY(cloudRand() * Math.PI);
    g.rotateX(-Math.PI * 0.5 + (cloudRand() - 0.5) * 0.35);
    g.translate(cx, cy, cz);
    cloudParts.push(g);
  }
  const cloudMesh = new THREE.Mesh(mergeGeometryList(cloudParts), mats.mist);
  cloudMesh.name = 'nantian-low-cloud-bands';
  cloudMesh.renderOrder = 3;
  dynamicGroup.add(cloudMesh);

  const dummy = new THREE.Object3D();
  function update(elapsed) {
    for (let i = 0; i < ribbonItems.length; i++) {
      const it = ribbonItems[i];
      const sway = Math.sin(elapsed * 2.05 + it.phase) * it.amp;
      dummy.position.set(it.x, it.y, it.z);
      dummy.rotation.set(0, it.yaw + Math.cos(elapsed * 1.3 + it.phase) * 0.18, sway);
      dummy.scale.set(1, it.len, 1);
      dummy.updateMatrix();
      ribbons.setMatrixAt(i, dummy.matrix);
    }
    ribbons.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < bells.length; i++) {
      const b = bells[i];
      const swing = Math.sin(elapsed * 1.35 + i * 0.9) * 0.15;
      dummy.position.set(b.x, b.y, b.z);
      dummy.rotation.set(swing, b.yaw, Math.cos(elapsed * 1.1 + i * 0.7) * 0.1);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      bellMesh.setMatrixAt(i, dummy.matrix);
    }
    bellMesh.instanceMatrix.needsUpdate = true;

    rays.rotation.z = Math.sin(elapsed * 0.05) * 0.035;
    rayMat.opacity = 0.075 + Math.sin(elapsed * 0.32) * 0.025 + Math.sin(elapsed * 0.11) * 0.012;
  }

  return { staticGroup, dynamicGroup, stats, update };
}
