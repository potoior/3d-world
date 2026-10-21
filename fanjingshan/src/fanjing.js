import * as THREE from 'three';
import { mats, makePlaqueMaterial } from './materials.js';
import { heightAt } from './terrain.js';
import { mergeGeometryList, mergeStaticGroup } from './geometry.js';

const HERO = { x: 16.5, z: -101, top: 238 };
const MUSHROOM = { x: -95, z: -35 };
const SCROLLS = { x: -170, z: -40 };
const CABLE_FROM = new THREE.Vector3(248, 50, 348);
const CABLE_TO = new THREE.Vector3(48, 174, -96);
const CABLE_NODES = [0, 0.2, 0.42, 0.64, 0.84, 1];
const CABLE_SIDE = 3.0;

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

function addBox(list, w, h, d, x, y, z, ry = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (ry) g.rotateY(ry);
  g.translate(x, y, z);
  list.push(g);
  return g;
}

function addCyl(list, rt, rb, h, seg, x, y, z) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg, 1, false);
  g.translate(x, y, z);
  list.push(g);
  return g;
}

function segGeo(ax, ay, az, bx, by, bz, ra, rb, seg = 5) {
  const dx = bx - ax;
  const dy = by - ay;
  const dz = bz - az;
  const len = Math.hypot(dx, dy, dz) || 1;
  const geo = new THREE.CylinderGeometry(rb, ra, len, seg, 1, false);
  geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(dx / len, dy / len, dz / len)
  ));
  geo.translate((ax + bx) * 0.5, (ay + by) * 0.5, (az + bz) * 0.5);
  return geo;
}

function colorize(geo, base, variance, seed) {
  const p = geo.attributes.position;
  const colors = new Float32Array(p.count * 3);
  const c = new THREE.Color();
  const rand = mulberry32(seed);
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    const grain = Math.sin(y * 0.63 + p.getX(i) * 0.07) * 0.055;
    const n = 0.86 + rand() * variance;
    c.copy(base).multiplyScalar(n);
    colors[i * 3] = Math.max(0, c.r + grain);
    colors[i * 3 + 1] = Math.max(0, c.g + grain);
    colors[i * 3 + 2] = Math.max(0, c.b + grain);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo;
}

function pillarGeo(cx, cz, baseY, topY, rBottom, rTop, leanX, leanZ, seed, seg = 12, rings = 14) {
  const h = Math.max(6, topY - baseY);
  const geo = new THREE.CylinderGeometry(rTop, rBottom, h, seg, rings, false);
  const p = geo.attributes.position;
  const rand = mulberry32(seed);
  const phase = rand() * Math.PI * 2;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const a = Math.atan2(z, x);
    const k = Math.max(0, Math.min(1, (y + h * 0.5) / h));
    const wobble = 1 + 0.085 * Math.sin(a * 3 + phase) + 0.035 * Math.sin(a * 7 - k * 5.4 + phase);
    const shelf = 1 - 0.032 * Math.max(0, Math.sin(k * 19 + phase));
    p.setX(i, x * wobble * shelf + leanX * Math.pow(k, 1.25));
    p.setZ(i, z * wobble * shelf + leanZ * Math.pow(k, 1.25));
    if (k > 0.86) p.setY(i, y + Math.sin(a * 4 + phase) * h * 0.012);
  }
  geo.computeVertexNormals();
  geo.translate(cx, baseY + h * 0.5, cz);
  return colorize(geo, new THREE.Color(0xcbb6a7), 0.17, seed + 29);
}

function rockGeo(size, x, y, z, seed, squash = 0.8) {
  const geo = new THREE.DodecahedronGeometry(size, 0);
  const p = geo.attributes.position;
  const rand = mulberry32(seed);
  for (let i = 0; i < p.count; i++) {
    p.setXYZ(i,
      p.getX(i) * (0.72 + rand() * 0.5),
      p.getY(i) * squash * (0.78 + rand() * 0.46),
      p.getZ(i) * (0.74 + rand() * 0.48));
  }
  geo.computeVertexNormals();
  geo.rotateY(rand() * 6.28);
  geo.translate(x, y, z);
  return geo;
}

function roofGeo(w, d, h, lift) {
  const rings = [
    { hw: w * 0.5, hd: d * 0.5, y: 0, lift },
    { hw: w * 0.43, hd: d * 0.4, y: h * 0.5, lift: lift * 0.2 },
    { hw: w * 0.07, hd: d * 0.045, y: h, lift: 0 },
  ];
  const ringPoints = rings.map((ring) => {
    const pts = [
      [ring.hw, ring.hd], [0, ring.hd], [-ring.hw, ring.hd], [-ring.hw, 0],
      [-ring.hw, -ring.hd], [0, -ring.hd], [ring.hw, -ring.hd], [ring.hw, 0],
    ];
    return pts.map(([px, pz], i) => new THREE.Vector3(px, ring.y + (i % 2 === 0 ? ring.lift : 0), pz));
  });
  const pos = [];
  const uv = [];
  for (let r = 0; r < rings.length - 1; r++) {
    for (let i = 0; i < 8; i++) {
      const a = ringPoints[r][i];
      const b = ringPoints[r][(i + 1) % 8];
      const c = ringPoints[r + 1][(i + 1) % 8];
      const d2 = ringPoints[r + 1][i];
      pos.push(...a.toArray(), ...b.toArray(), ...c.toArray());
      uv.push(i / 8 * 3, 0, (i + 1) / 8 * 3, 0, (i + 1) / 8 * 3, 1);
      pos.push(...a.toArray(), ...c.toArray(), ...d2.toArray());
      uv.push(i / 8 * 3, 0, (i + 1) / 8 * 3, 1, i / 8 * 3, 1);
    }
  }
  const topCenter = new THREE.Vector3(0, rings[2].y, 0);
  for (let i = 0; i < 8; i++) {
    const a = ringPoints[2][i];
    const b = ringPoints[2][(i + 1) % 8];
    pos.push(...a.toArray(), ...b.toArray(), ...topCenter.toArray());
    uv.push(0.5, 0.5, 0.5, 0.5, 0.5, 0.5);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.computeVertexNormals();
  return geo;
}

class Bucket {
  constructor() {
    this.map = new Map();
  }
  add(geo, mat) {
    if (!this.map.has(mat)) this.map.set(mat, []);
    this.map.get(mat).push(geo);
    return geo;
  }
  list(mat) {
    if (!this.map.has(mat)) this.map.set(mat, []);
    return this.map.get(mat);
  }
  finish(name) {
    const group = new THREE.Group();
    group.name = name;
    for (const [mat, list] of this.map) {
      for (const item of list) {
        if (!item.attributes.color) {
          const count = item.attributes.position.count;
          item.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(count * 3).fill(1), 3));
        }
        if (!item.attributes.uv) {
          const count = item.attributes.position.count;
          item.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(count * 2), 2));
        }
        for (const key of Object.keys(item.attributes)) {
          if (key !== 'position' && key !== 'normal' && key !== 'uv' && key !== 'color') item.deleteAttribute(key);
        }
      }
      const merged = mergeGeometryList(list);
      if (!merged) continue;
      const mesh = new THREE.Mesh(merged, mat);
      mesh.castShadow = !mat.userData?.noShadow;
      mesh.receiveShadow = true;
      group.add(mesh);
    }
    return group;
  }
}

const graniteWarm = mats.granite.clone();
graniteWarm.color.set(0xc7a996);
graniteWarm.normalScale.set(1.15, 1.15);
const granitePale = mats.graniteLight.clone();
granitePale.color.set(0xd6c9bd);
const strataDark = mats.graniteDark.clone();
strataDark.color.set(0x8f847d);
const leafDark = mats.pineDeep.clone();
leafDark.color.set(0x234534);
const leafBlue = mats.pine.clone();
leafBlue.color.set(0x2d5542);
const furGold = new THREE.MeshStandardMaterial({ color: 0xc58a34, roughness: 0.92 });
const furPale = new THREE.MeshStandardMaterial({ color: 0xe0bb74, roughness: 0.9 });
const monkeyFace = new THREE.MeshStandardMaterial({ color: 0x8aa6ae, roughness: 0.86 });
const monkeyDark = new THREE.MeshStandardMaterial({ color: 0x3a2d21, roughness: 0.95 });
const gold = new THREE.MeshStandardMaterial({ color: 0xc9a64d, roughness: 0.42, metalness: 0.55 });
const cabinBody = new THREE.MeshStandardMaterial({ color: 0xd9d4c6, roughness: 0.72, metalness: 0.08 });
const cabinGlass = new THREE.MeshStandardMaterial({
  color: 0x37525a,
  roughness: 0.25,
  metalness: 0.35,
  transparent: true,
  opacity: 0.72,
});
const cableIron = new THREE.MeshStandardMaterial({ color: 0x2f3534, roughness: 0.52, metalness: 0.6 });

function addStrata(bucket, cx, cz, baseY, topY, rBottom, rTop, leanX, leanZ, seed, levels = 10) {
  const rand = mulberry32(seed);
  const h = topY - baseY;
  for (let i = 0; i < levels; i++) {
    const k = 0.08 + (i / (levels - 1)) * 0.82;
    const y = baseY + h * k;
    const r = rBottom + (rTop - rBottom) * k;
    const ox = leanX * Math.pow(k, 1.25);
    const oz = leanZ * Math.pow(k, 1.25);
    for (let n = 0; n < 3; n++) {
      const a = rand() * Math.PI * 2;
      addBox(bucket.list(strataDark),
        r * (0.45 + rand() * 0.5), 0.16 + rand() * 0.2, 0.3 + rand() * 0.32,
        cx + ox + Math.cos(a) * (r + 0.16), y + (rand() - 0.5) * 0.7, cz + oz + Math.sin(a) * (r + 0.16),
        -a + Math.PI * 0.5);
    }
  }
}

function addFir(bucket, x, z, h, seed, leanDir = -1) {
  const rand = mulberry32(seed);
  const base = heightAt(x, z) - 0.4;
  const lean = h * (0.015 + rand() * 0.04);
  const tx = Math.cos(leanDir) * lean;
  const tz = Math.sin(leanDir) * lean;
  bucket.add(segGeo(x, base, z, x + tx, base + h * 0.72, z + tz, 0.38 + h * 0.014, 0.12 + h * 0.004, 6), mats.trunk);
  const tiers = 7;
  for (let i = 0; i < tiers; i++) {
    const k = i / (tiers - 1);
    const r = h * (0.19 - k * 0.145);
    const cy = base + h * (0.19 + k * 0.72);
    const cx = x + tx * (0.2 + k * 0.8);
    const cz = z + tz * (0.2 + k * 0.8);
    const geo = new THREE.ConeGeometry(r, h * 0.24, 8, 1, false);
    geo.rotateY(rand() * 6.28);
    geo.translate(cx, cy, cz);
    bucket.add(geo, i % 3 === 0 ? leafBlue : leafDark);
  }
  const top = new THREE.ConeGeometry(h * 0.035, h * 0.12, 7, 1, false);
  top.translate(x + tx, base + h * 0.93, z + tz);
  bucket.add(top, leafDark);
}

function addPlaque(root, title, subtitle, x, y, z, w, h, ry = 0) {
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(w, h), makePlaqueMaterial(title, subtitle));
  plaque.position.set(x, y, z);
  plaque.rotation.y = ry;
  plaque.renderOrder = 4;
  root.add(plaque);
  return plaque;
}

function addTemple(bucket, root, cx, cy, cz, name, subtitle) {
  addBox(bucket.list(mats.stone), 9.4, 0.7, 7.0, cx, cy + 0.35, cz);
  addBox(bucket.list(strataDark), 10.2, 0.26, 7.7, cx, cy + 0.82, cz);
  addBox(bucket.list(mats.plaster), 6.8, 3.3, 4.6, cx, cy + 2.6, cz);
  for (const sx of [-2.9, -1.0, 1.0, 2.9]) {
    addCyl(bucket.list(mats.ribbon), 0.16, 0.18, 3.4, 8, cx + sx, cy + 2.7, cz + 2.35);
  }
  addBox(bucket.list(mats.wood), 1.9, 2.4, 0.18, cx, cy + 2.25, cz + 2.48);
  addBox(bucket.list(mats.ribbon), 0.12, 2.3, 0.1, cx - 1.0, cy + 2.3, cz + 2.57);
  addBox(bucket.list(mats.ribbon), 0.12, 2.3, 0.1, cx + 1.0, cy + 2.3, cz + 2.57);
  for (const sx of [-2.1, 2.1]) {
    addBox(bucket.list(mats.wood), 1.2, 0.9, 0.08, cx + sx, cy + 2.75, cz + 2.45);
  }
  const lower = roofGeo(9.9, 7.5, 2.9, 0.75);
  lower.translate(cx, cy + 4.3, cz);
  bucket.add(lower, mats.tile);
  addBox(bucket.list(mats.wood), 8.1, 0.24, 0.22, cx, cy + 4.34, cz + 3.4);
  addBox(bucket.list(mats.wood), 8.1, 0.24, 0.22, cx, cy + 4.34, cz - 3.4);
  addBox(bucket.list(mats.plaster), 4.1, 1.35, 2.9, cx, cy + 6.1, cz);
  const upper = roofGeo(5.4, 4.2, 1.8, 0.34);
  upper.translate(cx, cy + 6.78, cz);
  bucket.add(upper, mats.tileDark);
  addCyl(bucket.list(gold), 0.12, 0.2, 1.0, 8, cx, cy + 8.53, cz);
  addBox(bucket.list(gold), 0.62, 0.12, 0.12, cx, cy + 8.85, cz);
  addPlaque(root, name, subtitle, cx, cy + 3.55, cz + 2.62, 2.6, 0.88);
}

function createHeroPeak(bucket, root) {
  const base = heightAt(HERO.x, HERO.z) - 4;
  const split = 168;
  bucket.add(pillarGeo(HERO.x, HERO.z, base, split + 6, 15.5, 10.8, 0, 0, 9101, 14, 16), graniteWarm);
  addStrata(bucket, HERO.x, HERO.z, base, split + 2, 15.5, 10.8, 0, 0, 9110, 12);

  const leftX = HERO.x - 8.5;
  const rightX = HERO.x + 8.5;
  bucket.add(pillarGeo(leftX, HERO.z, split - 4, HERO.top, 8.2, 5.9, -0.8, -0.2, 9121, 12, 14), graniteWarm);
  bucket.add(pillarGeo(rightX, HERO.z, split - 4, HERO.top, 8.0, 5.8, 0.8, 0.2, 9131, 12, 14), graniteWarm);
  addStrata(bucket, leftX, HERO.z, split, HERO.top - 2, 8.2, 5.9, -0.8, -0.2, 9140, 9);
  addStrata(bucket, rightX, HERO.z, split, HERO.top - 2, 8.0, 5.8, 0.8, 0.2, 9150, 9);

  for (const [x, seed] of [[leftX, 9160], [rightX, 9170]]) {
    bucket.add(rockGeo(5.0, x, HERO.top - 0.8, HERO.z, seed, 0.32), granitePale);
    addBox(bucket.list(strataDark), 10.6, 0.5, 8.4, x, HERO.top - 0.55, HERO.z);
  }
  addTemple(bucket, root, leftX, HERO.top, HERO.z, '释迦殿', 'SAKYAMUNI HALL');
  addTemple(bucket, root, rightX, HERO.top, HERO.z, '弥勒殿', 'MAITREYA HALL');

  const bridgeY = HERO.top - 1.2;
  addBox(bucket.list(mats.stone), 8.9, 0.42, 2.7, HERO.x, bridgeY, HERO.z);
  addBox(bucket.list(strataDark), 9.3, 0.18, 3.0, HERO.x, bridgeY - 0.28, HERO.z);
  for (const side of [-1, 1]) {
    addBox(bucket.list(mats.wood), 8.9, 0.12, 0.12, HERO.x, bridgeY + 1.12, HERO.z + side * 1.28);
    for (const x of [-3.4, -1.1, 1.1, 3.4]) {
      addCyl(bucket.list(mats.iron), 0.06, 0.075, 1.16, 6, HERO.x + x, bridgeY + 0.6, HERO.z + side * 1.28);
    }
    bucket.add(segGeo(HERO.x - 4.2, bridgeY + 0.36, HERO.z + side * 1.28,
      HERO.x + 4.2, bridgeY + 0.36, HERO.z + side * 1.28, 0.035, 0.035, 4), mats.iron);
  }
  for (let i = 0; i < 9; i++) {
    const a = Math.PI * (i / 9);
    const b = Math.PI * ((i + 1) / 9);
    bucket.add(segGeo(
      HERO.x + Math.cos(a) * 4.3, bridgeY - 1.35 + Math.sin(a) * 1.2, HERO.z,
      HERO.x + Math.cos(b) * 4.3, bridgeY - 1.35 + Math.sin(b) * 1.2, HERO.z,
      0.28, 0.28, 5), mats.stone);
  }
  addStrata(bucket, HERO.x, HERO.z, bridgeY - 2.2, bridgeY + 0.2, 3.4, 3.4, 0, 0, 9180, 3);
  addPlaque(root, '红云金顶', 'HONGYUN JINDING · 2336 M', HERO.x, HERO.top + 18, HERO.z + 8.5, 7.2, 2.1, 0.1);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.4;
    const rr = 18 + (i % 2) * 5;
    bucket.add(rockGeo(1.4 + (i % 3) * 0.5,
      HERO.x + Math.cos(a) * rr, heightAt(HERO.x + Math.cos(a) * rr, HERO.z + Math.sin(a) * rr) + 0.4,
      HERO.z + Math.sin(a) * rr, 9190 + i, 0.55), mats.rock);
  }
}

function createMushroom(bucket, root) {
  const base = heightAt(MUSHROOM.x, MUSHROOM.z) - 1.5;
  bucket.add(rockGeo(7.2, MUSHROOM.x, base + 1.2, MUSHROOM.z, 9211, 0.48), graniteWarm);
  bucket.add(pillarGeo(MUSHROOM.x, MUSHROOM.z, base + 0.6, base + 11.5, 3.4, 2.25, 0.5, -0.4, 9212, 10, 9), graniteWarm);
  addStrata(bucket, MUSHROOM.x, MUSHROOM.z, base + 1, base + 10.5, 3.4, 2.3, 0.5, -0.4, 9214, 7);
  const cap = rockGeo(7.6, 0, 0, 0, 9220, 0.4);
  cap.scale(1.65, 1, 1.42);
  cap.rotateY(0.6);
  cap.translate(MUSHROOM.x + 0.6, base + 12.7, MUSHROOM.z - 0.3);
  bucket.add(cap, granitePale);
  const under = rockGeo(6.5, 0, 0, 0, 9222, 0.18);
  under.scale(1.5, 1, 1.3);
  under.translate(MUSHROOM.x + 0.5, base + 11.6, MUSHROOM.z - 0.2);
  bucket.add(under, strataDark);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const rr = 9 + (i % 3) * 3;
    bucket.add(rockGeo(1.1 + (i % 3) * 0.8,
      MUSHROOM.x + Math.cos(a) * rr, heightAt(MUSHROOM.x + Math.cos(a) * rr, MUSHROOM.z + Math.sin(a) * rr) + 0.3,
      MUSHROOM.z + Math.sin(a) * rr, 9230 + i, 0.52), i % 2 ? mats.rock : granitePale);
  }
  addPlaque(root, '蘑菇石', 'MUSHROOM ROCK', MUSHROOM.x, base + 19, MUSHROOM.z + 3.5, 5.6, 1.64);
}

function createScrolls(bucket, root) {
  const base = heightAt(SCROLLS.x, SCROLLS.z) - 2;
  const rand = mulberry32(9311);
  let y = base;
  let w = 17;
  let d = 11;
  for (let i = 0; i < 26; i++) {
    const h = 0.65 + rand() * 0.8;
    const ox = (rand() - 0.5) * (1.1 + i * 0.12);
    const oz = (rand() - 0.5) * 0.9;
    const ry = (rand() - 0.5) * 0.05;
    addBox(bucket.list(i % 4 === 0 ? strataDark : granitePale),
      w, h, d, SCROLLS.x + ox, y + h * 0.5, SCROLLS.z + oz, ry);
    if (i % 3 === 0) {
      addBox(bucket.list(strataDark), w * 1.01, 0.1, d * 1.01, SCROLLS.x + ox, y + h + 0.04, SCROLLS.z + oz, ry);
    }
    y += h + 0.06;
    w *= 0.955;
    d *= 0.975;
  }
  bucket.add(rockGeo(9.5, SCROLLS.x, base + 1.1, SCROLLS.z, 9312, 0.55), graniteWarm);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const rr = 11 + (i % 3) * 4;
    bucket.add(rockGeo(1.2 + (i % 4) * 0.6,
      SCROLLS.x + Math.cos(a) * rr, heightAt(SCROLLS.x + Math.cos(a) * rr, SCROLLS.z + Math.sin(a) * rr) + 0.3,
      SCROLLS.z + Math.sin(a) * rr, 9320 + i, 0.5), i % 2 ? mats.rock : granitePale);
  }
  addPlaque(root, '万卷书', 'TEN THOUSAND SCROLLS', SCROLLS.x, base + 31, SCROLLS.z + 5.5, 6.6, 1.9);
}

function addFlight(bucket, from, to, steps, width, seed) {
  const rand = mulberry32(seed);
  const dx = to[0] - from[0];
  const dz = to[2] - from[2];
  const run = Math.hypot(dx, dz) || 1;
  const yaw = Math.atan2(dx, dz);
  const posts = [];
  for (let i = 0; i < steps; i++) {
    const k = (i + 0.5) / steps;
    const x = from[0] + dx * k;
    const z = from[2] + dz * k;
    const y = from[1] + (to[1] - from[1]) * k;
    addBox(bucket.list(mats.stone), width, 0.34, (run / steps) * 1.35, x, y, z, yaw);
    if (i % 2 === 0) {
      addBox(bucket.list(strataDark), width * 1.04, 0.1, (run / steps) * 1.05, x, y + 0.17, z, yaw);
    }
    if (i % 6 === 0) {
      const nx = Math.cos(yaw);
      const nz = -Math.sin(yaw);
      for (const side of [-1, 1]) {
        posts.push([x + nx * side * (width * 0.5 + 0.22), y + 0.8, z + nz * side * (width * 0.5 + 0.22), side]);
      }
    }
  }
  for (let i = 0; i < posts.length; i++) {
    const p = posts[i];
    addCyl(bucket.list(mats.iron), 0.06, 0.09, 1.5, 5, p[0], p[1], p[2]);
    const q = posts[i + 1];
    if (q && q[3] === p[3]) {
      const n = 4;
      for (let s = 0; s < n; s++) {
        const t0 = s / n;
        const t1 = (s + 1) / n;
        const ax = p[0] + (q[0] - p[0]) * t0;
        const az = p[2] + (q[2] - p[2]) * t0;
        const bx = p[0] + (q[0] - p[0]) * t1;
        const bz = p[2] + (q[2] - p[2]) * t1;
        const ay = p[1] + 0.93 + (q[1] - p[1]) * t0 - Math.sin(t0 * Math.PI) * 0.3;
        const by = p[1] + 0.93 + (q[1] - p[1]) * t1 - Math.sin(t1 * Math.PI) * 0.3;
        bucket.add(segGeo(ax, ay, az, bx, by, bz, 0.032, 0.032, 4), mats.iron);
      }
    }
  }
  for (let i = 0; i < 8; i++) {
    const k = rand();
    const side = i % 2 ? 1 : -1;
    const nx = Math.cos(yaw);
    const nz = -Math.sin(yaw);
    const x = from[0] + dx * k + nx * side * (width * 0.5 - 0.4);
    const z = from[2] + dz * k + nz * side * (width * 0.5 - 0.4);
    const y = from[1] + (to[1] - from[1]) * k + 0.35;
    addBox(bucket.list(mats.ribbon), 0.13, 0.5 + rand() * 0.22, 0.025, x, y + 0.3, z, yaw + 0.2);
  }
}

function createPilgrimSteps(bucket) {
  addFlight(bucket, [45, heightAt(45, -64) + 0.2, -64], [34, 150, -85], 48, 2.5, 9411);
  addFlight(bucket, [34, 150.4, -85], [22, 196, -95], 36, 2.35, 9412);
  addFlight(bucket, [22, 196.4, -95], [14, 233.6, -99], 30, 2.2, 9413);
}

function createAltar(bucket, root) {
  const ax = 42;
  const az = -72;
  const ay = heightAt(ax, az) - 0.4;
  addBox(bucket.list(mats.stone), 7.4, 0.65, 5.2, ax, ay + 0.32, az);
  addBox(bucket.list(strataDark), 7.9, 0.22, 5.7, ax, ay + 0.76, az);
  addCyl(bucket.list(strataDark), 0.95, 1.2, 1.3, 10, ax, ay + 1.5, az - 0.3);
  addCyl(bucket.list(gold), 1.05, 1.12, 0.18, 12, ax, ay + 2.2, az - 0.3);
  addCyl(bucket.list(strataDark), 0.25, 0.36, 0.18, 8, ax, ay + 2.34, az - 0.3);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    addCyl(bucket.list(mats.wood), 0.025, 0.03, 1.0 + (i % 2) * 0.25, 4,
      ax + Math.cos(a) * 0.35, ay + 2.8, az - 0.3 + Math.sin(a) * 0.3);
  }
  addBox(bucket.list(mats.ribbon), 5.8, 0.1, 0.1, ax, ay + 3.0, az + 1.6);
  for (const sx of [-2.5, 2.5]) {
    addCyl(bucket.list(mats.stoneDark), 0.06, 0.08, 2.5, 5, ax + sx, ay + 1.7, az + 1.6);
  }
  for (let i = 0; i < 12; i++) {
    const sx = -2.3 + i * 0.42;
    addBox(bucket.list(i % 2 ? mats.ribbon : gold), 0.28, 0.62, 0.025, ax + sx, ay + 2.66, az + 1.62);
  }
  addPlaque(root, '承恩寺 · 香火', 'INCENSE OFFERING', ax, ay + 4.4, az + 2.05, 4.6, 1.34);
}

function createMonkey(bucket, x, z, scale, yaw, seed) {
  const y = heightAt(x, z);
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  const local = (lx, ly, lz) => [x + cos * lx + sin * lz, y + ly, z - sin * lx + cos * lz];
  let p = local(0, 1.2 * scale, 0);
  const body = new THREE.SphereGeometry(0.56 * scale, 7, 6);
  body.scale(1, 1.32, 0.82);
  body.translate(...p);
  bucket.add(body, furGold);
  p = local(0, 2.02 * scale, 0.04 * scale);
  const head = new THREE.SphereGeometry(0.37 * scale, 7, 6);
  head.scale(1.02, 0.95, 1);
  head.translate(...p);
  bucket.add(head, furGold);
  p = local(0, 2.03 * scale, 0.29 * scale);
  const face = new THREE.SphereGeometry(0.27 * scale, 7, 6);
  face.scale(1.05, 1.18, 0.46);
  face.translate(...p);
  bucket.add(face, monkeyFace);
  for (const ex of [-0.15, 0.15]) {
    p = local(ex * scale, 2.1 * scale, 0.42 * scale);
    const eye = new THREE.SphereGeometry(0.045 * scale, 5, 4);
    eye.translate(...p);
    bucket.add(eye, monkeyDark);
    p = local(ex * 1.34 * scale, 2.07 * scale, 0.03 * scale);
    const ear = new THREE.SphereGeometry(0.1 * scale, 6, 5);
    ear.translate(...p);
    bucket.add(ear, furPale);
  }
  for (const side of [-1, 1]) {
    let a = local(side * 0.46 * scale, 1.58 * scale, 0.08 * scale);
    let b = local(side * 0.72 * scale, 0.85 * scale, 0.34 * scale);
    bucket.add(segGeo(a[0], a[1], a[2], b[0], b[1], b[2], 0.09 * scale, 0.055 * scale, 5), furGold);
    b = local(side * 0.7 * scale, 0.52 * scale, 0.32 * scale);
    bucket.add(segGeo(a[0], a[1] - 0.05, a[2], b[0], b[1], b[2], 0.075 * scale, 0.05 * scale, 5), monkeyDark);
    a = local(side * 0.26 * scale, 0.75 * scale, 0.02 * scale);
    b = local(side * 0.34 * scale, 0.22 * scale, 0.18 * scale);
    bucket.add(segGeo(a[0], a[1], a[2], b[0], b[1], b[2], 0.12 * scale, 0.075 * scale, 5), furGold);
  }
  let prev = local(0, 0.85 * scale, -0.42 * scale);
  for (let i = 1; i <= 5; i++) {
    const k = i / 5;
    const next = local(Math.sin(k * 3.1 + seed) * 0.4 * scale, (0.85 - k * 0.55) * scale, (-0.42 - k * 0.62) * scale);
    bucket.add(segGeo(prev[0], prev[1], prev[2], next[0], next[1], next[2], 0.055 * scale, 0.04 * scale, 4), furPale);
    prev = next;
  }
  bucket.add(rockGeo(1.0 * scale, x, y + 0.18 * scale, z, seed + 3, 0.5), mats.rock);
}

const cablePerp = new THREE.Vector3(CABLE_TO.z - CABLE_FROM.z, 0, -(CABLE_TO.x - CABLE_FROM.x)).normalize();
const cableNodePositions = CABLE_NODES.map((t) => new THREE.Vector3().lerpVectors(CABLE_FROM, CABLE_TO, t));

function cableSample(t, side, sag = 2.6) {
  const clamped = Math.max(0.0001, Math.min(0.9999, t));
  let index = 0;
  for (let i = 0; i < CABLE_NODES.length - 1; i++) {
    if (clamped >= CABLE_NODES[i] && clamped <= CABLE_NODES[i + 1]) {
      index = i;
      break;
    }
  }
  const a = cableNodePositions[index];
  const b = cableNodePositions[index + 1];
  const u = (clamped - CABLE_NODES[index]) / (CABLE_NODES[index + 1] - CABLE_NODES[index]);
  const p = new THREE.Vector3().lerpVectors(a, b, u);
  p.y -= Math.sin(u * Math.PI) * sag;
  p.addScaledVector(cablePerp, side * CABLE_SIDE);
  return p;
}

function createCableway(bucket, root) {
  for (let i = 0; i < cableNodePositions.length - 1; i++) {
    for (const side of [-1, 1]) {
      let prev = cableSample(CABLE_NODES[i] + 0.0001, side);
      for (let s = 1; s <= 10; s++) {
        const t = CABLE_NODES[i] + (CABLE_NODES[i + 1] - CABLE_NODES[i]) * (s / 10);
        const next = cableSample(Math.min(t, CABLE_NODES[i + 1] - 0.0001), side);
        bucket.add(segGeo(prev.x, prev.y, prev.z, next.x, next.y, next.z, 0.06, 0.06, 4), cableIron);
        prev = next;
      }
    }
  }
  for (let i = 1; i < cableNodePositions.length - 1; i++) {
    const node = cableNodePositions[i];
    const ground = heightAt(node.x, node.z);
    const height = Math.max(8, node.y - ground);
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        addBox(bucket.list(cableIron), 0.5, height, 0.5, node.x + sx * 2.1, ground + height * 0.5, node.z + sz * 2.1);
      }
    }
    for (let k = 0; k < 4; k++) {
      const y = ground + height * ((k + 1) / 5);
      addBox(bucket.list(cableIron), 4.8, 0.18, 0.2, node.x, y, node.z - 2.1);
      addBox(bucket.list(cableIron), 4.8, 0.18, 0.2, node.x, y, node.z + 2.1);
      addBox(bucket.list(cableIron), 0.2, 0.18, 4.8, node.x - 2.1, y, node.z);
      addBox(bucket.list(cableIron), 0.2, 0.18, 4.8, node.x + 2.1, y, node.z);
    }
    addBox(bucket.list(cableIron), 10.5, 0.6, 1.0, node.x, node.y + 0.35, node.z);
    addBox(bucket.list(cableIron), 1.0, 0.6, 10.5, node.x, node.y + 0.35, node.z);
    for (const side of [-1, 1]) {
      addCyl(bucket.list(cableIron), 0.52, 0.52, 0.3, 10,
        node.x + cablePerp.x * side * CABLE_SIDE, node.y + 0.1, node.z + cablePerp.z * side * CABLE_SIDE);
    }
  }
  const station = (pos, label) => {
    const ground = heightAt(pos.x, pos.z);
    addBox(bucket.list(mats.wood), 13, 0.8, 9, pos.x, Math.max(ground + 1.2, pos.y - 3), pos.z);
    for (const sx of [-4.5, 4.5]) {
      for (const sz of [-3, 3]) {
        addCyl(bucket.list(strataDark), 0.3, 0.4, Math.max(3, pos.y - ground), 6, pos.x + sx, ground + (pos.y - ground) * 0.5, pos.z + sz);
      }
    }
    const roof = roofGeo(15, 11, 4.5, 0.8);
    roof.translate(pos.x, pos.y + 4.2, pos.z);
    bucket.add(roof, mats.tileDark);
    addBox(bucket.list(mats.plaster), 8, 3, 5, pos.x, pos.y + 1.5, pos.z);
    addPlaque(root, label, 'FANJINGSHAN CABLEWAY', pos.x, pos.y + 2.8, pos.z + 2.6, 5.2, 1.52);
  };
  station(CABLE_FROM, '索道上站');
  station(CABLE_TO, '索道下站');
}

function createFirsAndMonkeys(bucket) {
  const firs = [
    [55, -58, 21], [64, -46, 16], [-7, -128, 19], [34, -128, 17],
    [-110, -78, 24], [-78, -22, 18], [-142, -30, 22], [-62, -92, 16],
    [78, -102, 15], [-126, -88, 20],
  ];
  firs.forEach(([x, z, h], i) => addFir(bucket, x, z, h, 9500 + i, i * 1.7));
  createMonkey(bucket, -24, -52, 1.0, 0.7, 9601);
  createMonkey(bucket, -84, -28, 0.9, -0.5, 9602);
  createMonkey(bucket, 48, -64, 0.8, 2.2, 9603);
  createMonkey(bucket, -52, -78, 0.72, 1.2, 9604);
}

function createCloudWisps(group) {
  const rand = mulberry32(9711);
  const count = 26;
  const geo = new THREE.PlaneGeometry(1, 1);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uMap: { value: mats.mist.map },
      uColor: { value: new THREE.Color(0xeef4f2) },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec4 p = vec4(position, 1.0);
        #ifdef USE_INSTANCING
          p = instanceMatrix * p;
        #endif
        gl_Position = projectionMatrix * modelViewMatrix * p;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform sampler2D uMap;
      uniform vec3 uColor;
      varying vec2 vUv;
      void main() {
        vec4 tex = texture2D(uMap, vUv);
        float edge = smoothstep(0.0, 0.2, vUv.x) * smoothstep(1.0, 0.8, vUv.x);
        float fade = smoothstep(1.0, 0.55, vUv.y) * smoothstep(0.0, 0.32, vUv.y);
        float breathe = 0.42 + 0.24 * sin(uTime * 0.26 + vUv.x * 4.0);
        gl_FragColor = vec4(uColor, tex.a * edge * fade * breathe);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  mesh.frustumCulled = false;
  mesh.renderOrder = 3;
  group.add(mesh);
  const data = [];
  for (let i = 0; i < count; i++) {
    const hero = i < 17;
    const cx = hero ? HERO.x : (i % 2 ? MUSHROOM.x : SCROLLS.x);
    const cz = hero ? HERO.z : (i % 2 ? MUSHROOM.z : SCROLLS.z);
    const a = rand() * Math.PI * 2;
    const d = (hero ? 24 : 18) + rand() * (hero ? 58 : 34);
    data.push({
      x: cx + Math.cos(a) * d,
      z: cz + Math.sin(a) * d,
      y: (hero ? 142 : 112) + rand() * (hero ? 86 : 34),
      w: 24 + rand() * 52,
      h: 8 + rand() * 22,
      yaw: rand() * Math.PI,
      phase: rand() * 6.28,
      drift: 0.3 + rand() * 0.7,
    });
  }
  return { mesh, mat, data };
}

function createIncense(group) {
  const rand = mulberry32(9811);
  const count = 30;
  const geo = new THREE.PlaneGeometry(1, 1);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uMap: { value: mats.mist.map },
      uColor: { value: new THREE.Color(0xe9eee6) },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec4 p = vec4(position, 1.0);
        #ifdef USE_INSTANCING
          p = instanceMatrix * p;
        #endif
        gl_Position = projectionMatrix * modelViewMatrix * p;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform sampler2D uMap;
      uniform vec3 uColor;
      varying vec2 vUv;
      void main() {
        vec4 tex = texture2D(uMap, vUv);
        float edge = smoothstep(0.0, 0.22, vUv.x) * smoothstep(1.0, 0.78, vUv.x);
        float fade = smoothstep(1.0, 0.5, vUv.y) * smoothstep(0.0, 0.25, vUv.y);
        float pulse = 0.48 + 0.28 * sin(uTime * 0.8 + vUv.y * 6.0);
        gl_FragColor = vec4(uColor, tex.a * edge * fade * pulse);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  mesh.frustumCulled = false;
  mesh.renderOrder = 4;
  group.add(mesh);
  const altarY = heightAt(42, -72);
  const origins = [
    { x: 42, y: altarY + 2.7, z: -72, rise: 22, spread: 1.1 },
    { x: 8.5, y: HERO.top + 5.2, z: -101, rise: 15, spread: 0.75 },
    { x: 24.5, y: HERO.top + 5.2, z: -101, rise: 13, spread: 0.7 },
  ];
  const data = [];
  for (let i = 0; i < count; i++) {
    const o = origins[i % origins.length];
    data.push({
      ox: (rand() - 0.5) * o.spread,
      oz: (rand() - 0.5) * o.spread,
      baseX: o.x,
      baseY: o.y,
      baseZ: o.z,
      rise: o.rise,
      drift: 0.5 + rand() * 0.8,
      phase: rand(),
      w: 1.4 + rand() * 2.0,
      h: 4.0 + rand() * 5.5,
      yaw: (rand() - 0.5) * 0.8,
    });
  }
  return { mesh, mat, data };
}

const ribbonAnchors = [];
(function buildRibbonAnchors() {
  const flights = [
    [[45, 92, -64], [34, 150, -85]],
    [[34, 150, -85], [22, 196, -95]],
    [[22, 196, -95], [14, 234, -99]],
  ];
  for (const [a, b] of flights) {
    for (let i = 0; i < 11; i++) {
      const k = (i + 0.5) / 11;
      const side = i % 2 ? 1 : -1;
      ribbonAnchors.push({
        x: a[0] + (b[0] - a[0]) * k + side * 1.05,
        y: a[1] + (b[1] - a[1]) * k + 1.35,
        z: a[2] + (b[2] - a[2]) * k,
      });
    }
  }
  for (let i = 0; i < 12; i++) {
    ribbonAnchors.push({ x: 39.7 + i * 0.4, y: heightAt(42, -72) + 3.45, z: -70.36 });
  }
})();

function createRibbons(group) {
  const rand = mulberry32(9911);
  const count = ribbonAnchors.length;
  const geo = new THREE.PlaneGeometry(0.34, 0.6);
  geo.translate(0, -0.3, 0);
  const mat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: true });
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  mesh.frustumCulled = false;
  const color = new THREE.Color();
  const palette = [0xb4372a, 0xe0a12c, 0x2f5f87, 0x3f7049, 0xe9e3d3, 0xd2543f];
  const data = [];
  for (let i = 0; i < count; i++) {
    data.push({
      ...ribbonAnchors[i],
      phase: rand() * 6.28,
      yaw: rand() * 6.28,
      scale: 0.8 + rand() * 0.42,
    });
    mesh.setColorAt(i, color.setHex(palette[i % palette.length]));
  }
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  group.add(mesh);
  return { mesh, data };
}

function createCabin() {
  const cabin = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(3.0, 2.2, 3.0), cabinBody);
  body.position.y = -2.35;
  body.castShadow = true;
  body.receiveShadow = true;
  cabin.add(body);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(3.08, 1.05, 3.08), cabinGlass);
  glass.position.y = -2.2;
  cabin.add(glass);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(3.35, 0.24, 3.35), cableIron);
  roof.position.y = -1.18;
  cabin.add(roof);
  const base = new THREE.Mesh(new THREE.BoxGeometry(3.15, 0.18, 3.15), cableIron);
  base.position.y = -3.5;
  cabin.add(base);
  for (const x of [-1.0, 1.0]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.2, 0.12), cableIron);
    arm.position.set(x, -0.55, 0);
    cabin.add(arm);
  }
  const grip = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.16, 0.16), cableIron);
  grip.position.y = 0.02;
  cabin.add(grip);
  return cabin;
}

function createLife() {
  const group = new THREE.Group();
  group.name = 'fanjingshan-life';
  const clouds = createCloudWisps(group);
  const incense = createIncense(group);
  const ribbons = createRibbons(group);
  const cabins = [];
  const phases = [0.12, 0.38, 0.62, 0.86];
  for (let i = 0; i < 4; i++) {
    const cabin = createCabin();
    cabin.userData.phase = phases[i];
    cabin.userData.side = i % 2 ? -1 : 1;
    cabin.userData.dir = i < 2 ? 1 : -1;
    group.add(cabin);
    cabins.push(cabin);
  }
  const dummy = new THREE.Object3D();
  const tangent = new THREE.Vector3();
  const cableSpeed = 0.012;
  let timeCursor = 0;

  function update(time, dt) {
    timeCursor = time;
    clouds.mat.uniforms.uTime.value = time;
    incense.mat.uniforms.uTime.value = time;

    clouds.data.forEach((c, i) => {
      const sway = Math.sin(time * 0.018 * (1 + c.drift) + c.phase) * 14;
      dummy.position.set(c.x + sway, c.y + Math.sin(time * 0.05 + c.phase) * 2.2, c.z + Math.cos(time * 0.014 + c.phase) * 9);
      dummy.rotation.set(0, c.yaw + Math.sin(time * 0.01 + c.phase) * 0.12, 0);
      dummy.scale.set(c.w, c.h, 1);
      dummy.updateMatrix();
      clouds.mesh.setMatrixAt(i, dummy.matrix);
    });
    clouds.mesh.instanceMatrix.needsUpdate = true;

    incense.data.forEach((s, i) => {
      const life = (time * 0.05 * s.drift + s.phase) % 1;
      const sway = Math.sin(time * 0.34 + s.phase * 6.28) * (0.38 + life * 1.5);
      dummy.position.set(
        s.baseX + s.ox + sway,
        s.baseY + life * s.rise,
        s.baseZ + s.oz + Math.cos(time * 0.23 + s.phase * 5.0) * 0.55
      );
      dummy.rotation.set(0, s.yaw + Math.sin(time * 0.2 + s.phase) * 0.16, 0);
      dummy.scale.set(s.w * (0.55 + life * 1.35), s.h * (0.4 + life * 0.95), 1);
      dummy.updateMatrix();
      incense.mesh.setMatrixAt(i, dummy.matrix);
    });
    incense.mesh.instanceMatrix.needsUpdate = true;

    ribbons.data.forEach((r, i) => {
      dummy.position.set(r.x, r.y, r.z);
      dummy.rotation.set(Math.sin(time * 2.4 + r.phase) * 0.22, r.yaw, Math.cos(time * 2.0 + r.phase) * 0.18);
      dummy.scale.set(r.scale, 1, 1);
      dummy.updateMatrix();
      ribbons.mesh.setMatrixAt(i, dummy.matrix);
    });
    ribbons.mesh.instanceMatrix.needsUpdate = true;

    cabins.forEach((cabin) => {
      const cycle = (time * cableSpeed * cabin.userData.dir + cabin.userData.phase + 10) % 1;
      const t = cycle;
      const p = cableSample(t, cabin.userData.side);
      const q = cableSample(Math.min(0.9999, t + 0.002), cabin.userData.side);
      tangent.copy(q).sub(p);
      const yaw = Math.atan2(tangent.x, tangent.z);
      cabin.position.copy(p);
      cabin.position.y -= 0.15;
      cabin.rotation.set(Math.sin(time * 0.9 + cabin.userData.phase * 7) * 0.018, yaw, Math.cos(time * 0.75 + cabin.userData.phase * 5) * 0.014);
    });
  }

  update(0, 0);
  return {
    group,
    update,
    parts: {
      clouds: clouds.data.length,
      incense: incense.data.length,
      ribbons: ribbons.data.length,
      cabins: cabins.length,
    },
  };
}

export function createFanjingOverlay() {
  const bucket = new Bucket();
  const decorations = new THREE.Group();
  decorations.name = 'fanjing-plaques';
  const staticRoot = new THREE.Group();
  staticRoot.name = 'fanjing-static-source';

  createHeroPeak(bucket, decorations);
  createMushroom(bucket, decorations);
  createScrolls(bucket, decorations);
  createPilgrimSteps(bucket);
  createAltar(bucket, decorations);
  createCableway(bucket, decorations);
  createFirsAndMonkeys(bucket);

  staticRoot.add(bucket.finish('fanjing-static-bucket'));
  staticRoot.add(decorations);
  const merged = mergeStaticGroup(staticRoot);
  merged.name = 'fanjing-merged-static';

  const group = new THREE.Group();
  group.name = 'fanjingshan-overlay';
  group.add(merged);
  const life = createLife();
  group.add(life.group);

  return {
    group,
    merged,
    life: life.group,
    createLifeUpdate: life.update,
    parts: life.parts,
    landmarks: {
      hongyun: { x: HERO.x, y: HERO.top, z: HERO.z },
      mushroom: { x: MUSHROOM.x, y: heightAt(MUSHROOM.x, MUSHROOM.z), z: MUSHROOM.z },
      wanduan: { x: SCROLLS.x, y: heightAt(SCROLLS.x, SCROLLS.z), z: SCROLLS.z },
    },
    update: (elapsed, dt) => life.update(elapsed, dt),
  };
}



