import * as THREE from 'three';
import { mats, makePlaqueMaterial } from './materials.js';
import { heightAt, trailSamples, platforms } from './terrain.js';
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
    const band = Math.sin(y * 0.52 + p.getX(i) * 0.06) * 0.07;
    const n = 0.84 + rand() * variance;
    c.copy(base).multiplyScalar(n);
    colors[i * 3] = Math.max(0, c.r + band);
    colors[i * 3 + 1] = Math.max(0, c.g + band);
    colors[i * 3 + 2] = Math.max(0, c.b + band);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo;
}

function pillarGeo(cx, cz, baseY, topY, rBottom, rTop, leanX, leanZ, seed, seg = 11, rings = 10) {
  const h = Math.max(8, topY - baseY);
  const geo = new THREE.CylinderGeometry(rTop, rBottom, h, seg, rings, false);
  const p = geo.attributes.position;
  const rand = mulberry32(seed);
  const n0 = rand() * 9.7;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const a = Math.atan2(z, x);
    const k = Math.max(0, Math.min(1, (y + h * 0.5) / h));
    const wobble = 1 + 0.075 * Math.sin(a * 3 + n0) + 0.042 * Math.sin(a * 7 - k * 5.2 + n0 * 0.5);
    const shelf = 1 - 0.045 * Math.max(0, Math.sin(k * 23 + n0));
    const radial = wobble * shelf;
    p.setX(i, x * radial + leanX * Math.pow(k, 1.35));
    p.setZ(i, z * radial + leanZ * Math.pow(k, 1.35));
    p.setY(i, y + (k > 0.9 ? Math.sin(a * 4 + n0) * h * 0.012 : 0));
  }
  geo.computeVertexNormals();
  geo.translate(cx, baseY + h * 0.5, cz);
  return colorize(geo, new THREE.Color(0xadaea7), 0.2, seed + 31);
}

function rockGeo(size, x, y, z, seed, squash = 0.8) {
  const geo = new THREE.DodecahedronGeometry(size, 0);
  const p = geo.attributes.position;
  const rand = mulberry32(seed);
  for (let i = 0; i < p.count; i++) {
    p.setXYZ(i,
      p.getX(i) * (0.72 + rand() * 0.52),
      p.getY(i) * squash * (0.76 + rand() * 0.5),
      p.getZ(i) * (0.75 + rand() * 0.46));
  }
  geo.computeVertexNormals();
  geo.rotateY(rand() * 6.28);
  geo.translate(x, y, z);
  return geo;
}

class Bucket {
  constructor() { this.map = new Map(); }
  add(geo, mat) {
    if (!this.map.has(mat)) this.map.set(mat, []);
    this.map.get(mat).push(geo);
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
          const color = new Float32Array(count * 3);
          color.fill(1);
          item.setAttribute('color', new THREE.Float32BufferAttribute(color, 3));
        }
        if (!item.attributes.uv) {
          const count = item.attributes.position.count;
          item.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(count * 2), 2));
        }
        for (const key of Object.keys(item.attributes)) {
          if (key !== 'position' && key !== 'normal' && key !== 'uv' && key !== 'color') item.deleteAttribute(key);
        }
      }
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

function bucketNeedle(bucket, x, y, z, r, rand, light) {
  const geo = new THREE.ConeGeometry(r * (0.55 + rand() * 0.45), r * 0.52, 5, 1, true);
  geo.rotateX(Math.PI * 0.5 + (rand() - 0.5) * 0.5);
  geo.rotateY(rand() * 6.28);
  geo.translate(x, y, z);
  bucket.add(geo, light ? mats.pineLight : (rand() < 0.38 ? mats.pineDeep : mats.pine));
}

function windPine(bucket, x, z, h, rand, leanDir = 3.55) {
  const y = heightAt(x, z);
  const lean = h * (0.26 + rand() * 0.24);
  const tx = Math.cos(leanDir) * lean;
  const tz = Math.sin(leanDir) * lean;
  const topX = x + tx;
  const topZ = z + tz;
  bucket.add(segGeo(x, y - 0.5, z, x + tx * 0.3, y + h * 0.5, z + tz * 0.3, 0.28 + h * 0.012, 0.17 + h * 0.005, 5), mats.trunk);
  bucket.add(segGeo(x + tx * 0.3, y + h * 0.5, z + tz * 0.3, topX, y + h * 0.92, topZ, 0.17, 0.07, 4), mats.trunk);
  for (let i = 0; i < 5; i++) {
    const k = i / 4;
    const cx = x + tx * (0.35 + k * 0.62);
    const cz = z + tz * (0.35 + k * 0.62);
    const cy = y + h * (0.5 + k * 0.38);
    const a = leanDir + Math.PI + (rand() - 0.5) * 1.2;
    const reach = h * (0.18 + rand() * 0.17);
    const ex = cx + Math.cos(a) * reach;
    const ez = cz + Math.sin(a) * reach;
    bucket.add(segGeo(cx, cy, cz, ex, cy - 0.15, ez, 0.07, 0.025, 4), mats.trunk);
    for (let n = 0; n < 5; n++) {
      bucketNeedle(bucket, ex + (rand() - 0.5) * 1.3, cy + (rand() - 0.2) * 0.9, ez + (rand() - 0.5) * 1.3,
        h * (0.1 + rand() * 0.07), rand, rand() < 0.4);
    }
  }
  for (let n = 0; n < 5; n++) {
    bucketNeedle(bucket, topX + (rand() - 0.5) * h * 0.13, y + h * (0.92 + rand() * 0.07), topZ + (rand() - 0.5) * h * 0.13,
      h * (0.09 + rand() * 0.05), rand, rand() < 0.5);
  }
}

function addStrata(bucket, cx, cz, baseY, topY, rBottom, rTop, leanX, leanZ, seed, levels = 8) {
  const rand = mulberry32(seed);
  const h = topY - baseY;
  for (let i = 0; i < levels; i++) {
    const k = 0.1 + (i / (levels - 1)) * 0.78;
    const y = baseY + h * k;
    const r = rBottom + (rTop - rBottom) * k;
    const ox = leanX * Math.pow(k, 1.35);
    const oz = leanZ * Math.pow(k, 1.35);
    for (let n = 0; n < 3; n++) {
      const a = rand() * Math.PI * 2;
      const w = r * (0.42 + rand() * 0.45);
      addBox(bucket.list(mats.graniteDark),
        w, 0.13 + rand() * 0.16, 0.34 + rand() * 0.3,
        cx + ox + Math.cos(a) * (r + 0.16), y + (rand() - 0.5) * 0.5, cz + oz + Math.sin(a) * (r + 0.16),
        -a + Math.PI * 0.5);
    }
    for (let n = 0; n < 2; n++) {
      const a = rand() * Math.PI * 2;
      const ch = h * (0.05 + rand() * 0.13);
      addBox(bucket.list(mats.stoneDark),
        0.09 + rand() * 0.1, ch, 0.13,
        cx + ox + Math.cos(a) * (r + 0.18), y - ch * 0.2, cz + oz + Math.sin(a) * (r + 0.18),
        -a + Math.PI * 0.5);
    }
    if (i % 2 === 0) {
      const a = rand() * Math.PI * 2;
      const moss = new THREE.IcosahedronGeometry(0.55 + rand() * 1.15, 0);
      moss.scale(1.5 + rand(), 0.22, 1.1 + rand() * 0.6);
      moss.rotateY(rand() * 6.28);
      moss.translate(cx + ox + Math.cos(a) * (r + 0.2), y + 0.16, cz + oz + Math.sin(a) * (r + 0.2));
      bucket.add(moss, i % 4 === 0 ? mats.shrubLight : mats.shrub);
    }
  }
}

function addHeroPines(bucket, cx, cz, baseY, topY, rBottom, seed, rTop = rBottom * 0.5, leanX = 0, leanZ = 0) {
  const rand = mulberry32(seed);
  for (let i = 0; i < 4; i++) {
    const a = rand() * Math.PI * 2;
    const k = 0.35 + rand() * 0.4;
    const r = rBottom + (rTop - rBottom) * k;
    const x = cx + leanX * Math.pow(k, 1.35) + Math.cos(a) * r * 0.96;
    const z = cz + leanZ * Math.pow(k, 1.35) + Math.sin(a) * r * 0.96;
    const y = baseY + (topY - baseY) * k;
    const h = 3.2 + rand() * 4.2;
    const lean = h * (0.26 + rand() * 0.25);
    const tx = Math.cos(rand() * 6.28) * lean;
    const tz = Math.sin(rand() * 6.28) * lean;
    bucket.add(segGeo(x, y - 0.3, z, x + tx * 0.35, y + h * 0.55, z + tz * 0.35, 0.2 + h * 0.012, 0.12, 4), mats.trunk);
    bucket.add(segGeo(x + tx * 0.35, y + h * 0.55, z + tz * 0.35, x + tx, y + h * 0.94, z + tz, 0.12, 0.05, 4), mats.trunk);
    for (let n = 0; n < 7; n++) {
      bucketNeedle(bucket, x + tx + (rand() - 0.5) * h * 0.22, y + h * (0.65 + rand() * 0.35), z + tz + (rand() - 0.5) * h * 0.22,
        h * (0.11 + rand() * 0.07), rand, rand() < 0.42);
    }
  }
}

function createGiantPython(bucket) {
  const bx = 90;
  const bz = 30;
  const base = heightAt(bx, bz) - 2.5;
  const top = 208;
  const leanX = 8.5;
  const leanZ = 2.4;
  bucket.add(pillarGeo(bx, bz, base, top, 7.2, 2.1, leanX, leanZ, 7101, 12, 12), mats.granite);
  const headX = bx + leanX;
  const headZ = bz + leanZ;
  const head = rockGeo(5.8, 0, 0, 0, 7112, 0.86);
  head.scale(1.32, 1.02, 1.35);
  head.rotateY(0.5);
  head.rotateZ(0.12);
  head.translate(headX, top - 2.8, headZ);
  bucket.add(head, mats.graniteLight);
  const jaw = rockGeo(3.3, 0, 0, 0, 7114, 0.7);
  jaw.rotateY(-0.4);
  jaw.translate(headX + 1.1, top - 5.0, headZ + 1.4);
  bucket.add(jaw, mats.graniteDark);
  addStrata(bucket, bx, bz, base, top - 3, 7.2, 2.1, leanX, leanZ, 7120, 10);
  addHeroPines(bucket, bx, bz, base, top - 6, 7.2, 7131, 2.1, leanX, leanZ);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const rr = 9 + (i % 2) * 4;
    bucket.add(rockGeo(1.1 + (i % 3) * 0.7,
      bx + Math.cos(a) * rr, heightAt(bx + Math.cos(a) * rr, bz + Math.sin(a) * rr) + 0.3,
      bz + Math.sin(a) * rr, 7140 + i, 0.55), mats.rock);
  }
  windPine(bucket, bx + 10, bz + 7, 7.2, mulberry32(7150), 3.4);
  windPine(bucket, bx - 8, bz - 2, 5.8, mulberry32(7151), 2.9);
}

function createGoddess(bucket) {
  const spots = [
    { x: 78, z: -150, top: 286, rb: 5.8, rt: 2.02, leanX: -2.6, leanZ: 1.4, seed: 7201 },
    { x: 68, z: -157, top: 262, rb: 4.4, rt: 1.7, leanX: 1.6, leanZ: -1.1, seed: 7202 },
    { x: 88, z: -142, top: 266, rb: 4.1, rt: 1.65, leanX: -1.2, leanZ: 2.2, seed: 7203 },
  ];
  for (const s of spots) {
    const base = heightAt(s.x, s.z) - 3;
    bucket.add(pillarGeo(s.x, s.z, base, s.top, s.rb, s.rt, s.leanX, s.leanZ, s.seed, 10, 10), mats.granite);
    addStrata(bucket, s.x, s.z, base, s.top - 1, s.rb, s.rt, s.leanX, s.leanZ, s.seed + 20, 7);
    addHeroPines(bucket, s.x, s.z, base, s.top - 4, s.rb, s.seed + 30, s.rt, s.leanX, s.leanZ);
  }
  const hx = 78 - 2.6;
  const hz = -150 + 1.4;
  const head = rockGeo(4.2, 0, 0, 0, 7210, 0.92);
  head.scale(1.06, 1.38, 0.92);
  head.rotateY(-0.28);
  head.translate(hx, 284, hz);
  bucket.add(head, mats.graniteLight);
  const hair = rockGeo(2.3, 0, 0, 0, 7211, 0.7);
  hair.scale(1.1, 0.8, 0.9);
  hair.translate(hx - 1.5, 287, hz - 0.9);
  bucket.add(hair, mats.graniteDark);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const rr = 8 + (i % 2) * 5;
    bucket.add(rockGeo(0.9 + (i % 3) * 0.6,
      78 + Math.cos(a) * rr, heightAt(78 + Math.cos(a) * rr, -150 + Math.sin(a) * rr) + 0.2,
      -150 + Math.sin(a) * rr, 7220 + i, 0.52), mats.graniteLight);
  }
  windPine(bucket, 70, -142, 6.4, mulberry32(7230), 3.2);
  windPine(bucket, 88, -158, 6.0, mulberry32(7231), 3.7);
}

function createYujingSummit(bucket, root) {
  const x = -170;
  const z = -240;
  const y = heightAt(x, z);
  const deck = new THREE.CylinderGeometry(6.2, 6.8, 0.6, 24);
  deck.translate(x, y + 0.25, z);
  bucket.add(deck, mats.stone);
  addBox(bucket.list(mats.stoneDark), 1.1, 3.0, 0.58, x + 1.4, y + 1.8, z + 2.1, 0.2);
  addBox(bucket.list(mats.stoneDark), 1.6, 0.26, 1.0, x + 1.4, y + 0.36, z + 2.1, 0.2);
  const posts = [];
  const chains = [];
  for (let i = 0; i < 15; i++) {
    const a = -0.2 + (i / 14) * Math.PI * 1.35;
    const px = x + Math.cos(a) * 6.2;
    const pz = z + Math.sin(a) * 6.2;
    addCyl(posts, 0.06, 0.09, 1.15, 5, px, y + 0.95, pz);
    if (i < 14) {
      const b = -0.2 + ((i + 1) / 14) * Math.PI * 1.35;
      const qx = x + Math.cos(b) * 6.2;
      const qz = z + Math.sin(b) * 6.2;
      for (let k = 0; k < 3; k++) {
        const t0 = k / 3;
        const t1 = (k + 1) / 3;
        const ax = px + (qx - px) * t0;
        const az = pz + (qz - pz) * t0;
        const bx = px + (qx - px) * t1;
        const bz = pz + (qz - pz) * t1;
        const ay = y + 1.48 - Math.sin(t0 * Math.PI) * 0.14;
        const by = y + 1.48 - Math.sin(t1 * Math.PI) * 0.14;
        chains.push(segGeo(ax, ay, az, bx, by, bz, 0.032, 0.032, 4));
      }
    }
  }
  posts.forEach((g) => bucket.add(g, mats.wood));
  chains.forEach((g) => bucket.add(g, mats.iron));
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.86), makePlaqueMaterial('玉京峰', 'YUJING PEAK · 1819 M'));
  plaque.position.set(x + 1.4, y + 2.6, z + 2.45);
  plaque.rotation.y = 0.2;
  root.add(plaque);
  windPine(bucket, x - 9, z + 5, 6.6, mulberry32(7240), 3.4);
  windPine(bucket, x + 10, z - 4, 5.6, mulberry32(7241), 3.0);
}

function roofGeo(w, d, h, lift) {
  const rings = [
    { hw: w * 0.5, hd: d * 0.5, y: 0, lift },
    { hw: w * 0.45, hd: d * 0.42, y: h * 0.52, lift: lift * 0.22 },
    { hw: w * 0.085, hd: d * 0.05, y: h, lift: 0 },
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

function createTemple(bucket, root) {
  const p = platforms.find((pl) => pl.name === '三清宫');
  const x = p.x;
  const z = p.z;
  const y = p.y;
  addBox(bucket.list(mats.stone), 27, 1.1, 19, x, y + 0.55, z);
  for (let i = 0; i < 4; i++) {
    addBox(bucket.list(mats.stoneDark), 9 - i * 0.8, 0.28, 1.1, x, y + 0.14 + i * 0.22, z + 10 + i * -0.9);
  }
  addBox(bucket.list(mats.stoneDark), 14.5, 0.7, 9.6, x, y + 1.35, z);
  addBox(bucket.list(mats.plaster), 13.4, 3.8, 8.6, x, y + 3.4, z);
  for (const sx of [-5.9, -2.0, 2.0, 5.9]) {
    addCyl(bucket.list(mats.ribbon), 0.22, 0.25, 4.0, 8, x + sx, y + 3.4, z + 4.25);
  }
  addBox(bucket.list(mats.wood), 2.6, 2.8, 0.24, x, y + 2.9, z + 4.38);
  addBox(bucket.list(mats.ribbon), 0.16, 2.7, 0.12, x - 1.35, y + 2.9, z + 4.5);
  addBox(bucket.list(mats.ribbon), 0.16, 2.7, 0.12, x + 1.35, y + 2.9, z + 4.5);
  for (const sx of [-4.2, 4.2]) {
    addBox(bucket.list(mats.wood), 1.6, 1.15, 0.1, x + sx, y + 3.2, z + 4.36);
    addBox(bucket.list(mats.stoneDark), 1.8, 0.12, 0.2, x + sx, y + 2.6, z + 4.38);
    addBox(bucket.list(mats.stoneDark), 0.12, 1.2, 0.2, x + sx - 0.8, y + 3.2, z + 4.38);
    addBox(bucket.list(mats.stoneDark), 0.12, 1.2, 0.2, x + sx + 0.8, y + 3.2, z + 4.38);
  }
  for (const sx of [-6.8, 6.8]) {
    addBox(bucket.list(mats.wood), 0.4, 0.5, 0.5, x + sx, y + 5.2, z + 4.4);
    addBox(bucket.list(mats.wood), 0.7, 0.22, 0.7, x + sx, y + 5.55, z + 4.4);
  }
  const lower = roofGeo(19.5, 13.2, 3.6, 0.9);
  lower.translate(x, y + 5.5, z);
  bucket.add(lower, mats.tile);
  addBox(bucket.list(mats.wood), 15.5, 0.32, 0.3, x, y + 5.5, z + 6.6);
  addBox(bucket.list(mats.wood), 15.5, 0.32, 0.3, x, y + 5.5, z - 6.6);
  addBox(bucket.list(mats.wood), 0.3, 0.32, 10.5, x + 9.6, y + 5.5, z);
  addBox(bucket.list(mats.wood), 0.3, 0.32, 10.5, x - 9.6, y + 5.5, z);
  for (const sx of [-9.5, 9.5]) {
    for (const sz of [-6.4, 6.4]) {
      addBox(bucket.list(mats.tileDark), 1.5, 0.42, 0.36, x + sx, y + 6.25, z + sz, 0.6);
    }
  }
  addBox(bucket.list(mats.plaster), 7.2, 2.0, 4.6, x, y + 7.4, z);
  for (const sx of [-3.2, 3.2]) {
    addCyl(bucket.list(mats.ribbon), 0.16, 0.18, 2.1, 7, x + sx, y + 7.4, z + 2.35);
  }
  const upper = roofGeo(11.2, 7.4, 2.8, 0.55);
  upper.translate(x, y + 8.3, z);
  bucket.add(upper, mats.tileDark);
  addBox(bucket.list(mats.tileDark), 4.8, 0.34, 0.34, x, y + 10.95, z);
  addBox(bucket.list(mats.tileDark), 0.5, 0.5, 0.5, x, y + 11.15, z);
  addBox(bucket.list(mats.tileDark), 0.42, 0.8, 0.42, x - 2.4, y + 11.0, z);
  addBox(bucket.list(mats.tileDark), 0.42, 0.8, 0.42, x + 2.4, y + 11.0, z);
  addCyl(bucket.list(mats.stoneDark), 0.9, 1.2, 1.1, 10, x, y + 1.65, z + 11.6);
  addCyl(bucket.list(mats.stoneDark), 1.3, 1.4, 0.18, 10, x, y + 2.25, z + 11.6);
  addCyl(bucket.list(mats.iron), 0.1, 0.16, 0.7, 6, x, y + 2.55, z + 11.6);
  for (const sx of [-7.6, 7.6]) {
    addBox(bucket.list(mats.stoneDark), 0.7, 0.55, 0.7, x + sx, y + 1.95, z + 8.7);
    addBox(bucket.list(mats.stoneDark), 0.5, 0.75, 0.5, x + sx, y + 2.55, z + 8.7);
  }
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(3.1, 1.05), makePlaqueMaterial('三清宫', 'SANQING PALACE · TAOIST TEMPLE'));
  plaque.position.set(x, y + 5.95, z + 6.7);
  plaque.rotation.y = 0;
  root.add(plaque);
  windPine(bucket, x - 11, z + 8, 7.2, mulberry32(7250), 3.1);
  windPine(bucket, x + 12, z + 6, 6.4, mulberry32(7251), 3.6);
}

function frameAt(i) {
  const n = trailSamples.length;
  const s = trailSamples[Math.max(0, Math.min(n - 1, i))];
  const a = trailSamples[Math.max(0, i - 1)];
  const b = trailSamples[Math.min(n - 1, i + 1)];
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len = Math.hypot(dx, dz) || 1;
  const tx = dx / len;
  const tz = dz / len;
  return { s, tx, tz, nx: -tz, nz: tx, yaw: Math.atan2(tx, tz), len };
}

function chainSpan(list, ax, ay, az, bx, by, bz, sag = 0.24) {
  let px = ax;
  let py = ay;
  let pz = az;
  for (let i = 1; i <= 4; i++) {
    const k = i / 4;
    const nx = ax + (bx - ax) * k;
    const nz = az + (bz - az) * k;
    const ny = ay + (by - ay) * k - Math.sin(k * Math.PI) * sag;
    list.push(segGeo(px, py, pz, nx, ny, nz, 0.032, 0.032, 4));
    px = nx;
    py = ny;
    pz = nz;
  }
}

function createPlankRoad(bucket) {
  const planks = [];
  const beams = [];
  const bolts = [];
  const posts = [];
  const chains = [];
  const locks = [];
  const ribbons = [];
  const brackets = [];
  const start = 46;
  const end = 102;
  for (let i = start; i < end; i++) {
    const a = trailSamples[i];
    const b = trailSamples[i + 1];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz) || 1;
    const yaw = Math.atan2(dx, dz);
    const w = Math.max(2.0, a.width * 0.92);
    const mx = (a.x + b.x) * 0.5;
    const mz = (a.z + b.z) * 0.5;
    const my = (a.y + b.y) * 0.5;
    addBox(planks, w, 0.12, len * 1.08, mx, my + 0.24, mz, yaw);
    if (i % 2 === 0) {
      addBox(beams, w * 1.03, 0.16, len * 1.02, mx, my + 0.11, mz, yaw);
      const nx = -dz / len;
      const nz = dx / len;
      for (const side of [-1, 1]) {
        addBox(bolts, 0.07, 0.045, 0.07, mx + nx * side * w * 0.39, my + 0.32, mz + nz * side * w * 0.39);
        if (i % 6 === 0) {
          const ex = mx + nx * side * (w * 0.5 + 0.5);
          const ez = mz + nz * side * (w * 0.5 + 0.5);
          brackets.push(segGeo(ex, my + 0.16, ez, ex + nx * side * 0.9, my - 2.3, ez + nz * side * 0.9, 0.075, 0.045, 4));
        }
      }
    }
  }
  for (let i = start; i <= end - 6; i += 6) {
    const a = frameAt(i);
    const b = frameAt(i + 6);
    for (const side of [-1, 1]) {
      const ax = a.s.x + a.nx * side * (a.s.width * 0.5 + 0.2);
      const az = a.s.z + a.nz * side * (a.s.width * 0.5 + 0.2);
      const bx = b.s.x + b.nx * side * (b.s.width * 0.5 + 0.2);
      const bz = b.s.z + b.nz * side * (b.s.width * 0.5 + 0.2);
      addCyl(posts, 0.055, 0.08, 1.18, 5, ax, a.s.y + 0.76, az);
      chainSpan(chains, ax, a.s.y + 1.28, az, bx, b.s.y + 1.28, bz, 0.28);
      if (i % 12 === 0) {
        const lx = (ax + bx) * 0.5;
        const lz = (az + bz) * 0.5;
        addBox(locks, 0.18, 0.24, 0.08, lx, a.s.y + 1.06, lz, a.yaw);
        addBox(ribbons, 0.1, 0.42, 0.02, lx, a.s.y + 0.78, lz, a.yaw + 0.2);
      }
    }
  }
  const f = frameAt(64);
  const sx = f.s.x + f.nx * (f.s.width * 0.5 + 2.3);
  const sz = f.s.z + f.nz * (f.s.width * 0.5 + 2.3);
  addBox(posts, 0.16, 2.4, 0.16, sx - 0.9, f.s.y + 1.2, sz - 0.05, f.yaw);
  addBox(posts, 0.16, 2.4, 0.16, sx + 0.9, f.s.y + 1.2, sz + 0.05, f.yaw);
  addBox(beams, 2.3, 1.0, 0.14, sx, f.s.y + 1.95, sz, f.yaw + Math.PI * 0.5);
  planks.forEach((g) => bucket.add(g, mats.wood));
  beams.forEach((g) => bucket.add(g, mats.wood));
  bolts.forEach((g) => bucket.add(g, mats.iron));
  posts.forEach((g) => bucket.add(g, mats.wood));
  chains.forEach((g) => bucket.add(g, mats.iron));
  locks.forEach((g) => bucket.add(g, mats.iron));
  ribbons.forEach((g) => bucket.add(g, mats.ribbon));
  brackets.forEach((g) => bucket.add(g, mats.iron));
}

function createSignboards(bucket) {
  const spots = [
    { i: 10, side: 1, off: 2.6 },
    { i: 122, side: -1, off: 2.5 },
    { i: 246, side: 1, off: 2.4 },
  ];
  for (const spot of spots) {
    const f = frameAt(spot.i);
    const x = f.s.x + f.nx * spot.side * (f.s.width * 0.5 + spot.off);
    const z = f.s.z + f.nz * spot.side * (f.s.width * 0.5 + spot.off);
    const y = f.s.y;
    addBox(bucket.list(mats.wood), 0.15, 2.4, 0.15, x - 0.75, y + 1.2, z, f.yaw);
    addBox(bucket.list(mats.wood), 0.15, 2.4, 0.15, x + 0.75, y + 1.2, z, f.yaw);
    addBox(bucket.list(mats.sign), 2.0, 1.1, 0.13, x, y + 2.0, z, f.yaw + Math.PI * 0.5);
    addBox(bucket.list(mats.stoneDark), 0.55, 0.55, 0.55, x + f.tx * 1.4, y + 0.28, z + f.tz * 1.4, f.yaw);
  }
}

export function createSanqingStatic() {
  const bucket = new Bucket();
  const root = new THREE.Group();
  root.name = 'sanqingshan-hero-detail';
  createGiantPython(bucket);
  createGoddess(bucket);
  createYujingSummit(bucket, root);
  createTemple(bucket, root);
  createPlankRoad(bucket);
  createSignboards(bucket);
  root.add(bucket.finish('sanqingshan-merged-hero'));
  return root;
}
