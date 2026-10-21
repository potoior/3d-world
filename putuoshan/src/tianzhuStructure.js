import * as THREE from 'three';
import { mats } from './materials.js';
import { heightAt } from './terrain.js';
import { Bucket, addBox, addCyl, addRock, chainSpan, colorize, mulberry32, segGeo, addPine } from './tianzhuKit.js';

export const TIANZHU_PEAK = {
  x: 72,
  z: -150,
  baseY: 164,
  topY: 384,
  baseR: 32,
  topR: 11,
};

export function pillarRadiusAt(y) {
  const k = Math.max(0, Math.min(1, (y - TIANZHU_PEAK.baseY) / (TIANZHU_PEAK.topY - TIANZHU_PEAK.baseY)));
  return TIANZHU_PEAK.baseR + (TIANZHU_PEAK.topR - TIANZHU_PEAK.baseR) * k;
}

function createPillar(bucket) {
  const { x, z, baseY, topY, baseR, topR } = TIANZHU_PEAK;
  const h = topY - baseY;
  const rand = mulberry32(90217);
  const geo = new THREE.CylinderGeometry(topR, baseR, h, 26, 38, true);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const px = p.getX(i);
    const py = p.getY(i);
    const pz = p.getZ(i);
    const k = (py + h * 0.5) / h;
    const a = Math.atan2(pz, px);
    const radial = 0.9
      + 0.075 * Math.sin(a * 5 + k * 9)
      + 0.045 * Math.sin(a * 11 - k * 13 + 1.7)
      + 0.035 * Math.sin(k * Math.PI * 4.2 + 0.6)
      + 0.025 * Math.sin(a * 17 + k * 21);
    const dx = Math.sin(k * 2.7) * 3.6 + k * k * 4.2;
    const dz = Math.cos(k * 2.1 + 0.5) * 2.7 - k * 2.0;
    p.setXYZ(i, px * radial + dx, py + Math.sin(a * 6 + k * 14) * 0.6, pz * radial + dz);
  }
  geo.computeVertexNormals();
  colorize(geo, new THREE.Color(0xb5b3a8), 0.24, 9022);
  geo.translate(x, baseY + h * 0.5, z);
  bucket.add(geo, mats.granite);

  const cap = new THREE.CylinderGeometry(topR * 1.18, topR * 0.94, 2.2, 18, 1, false);
  colorize(cap, new THREE.Color(0xc4c1b5), 0.18, 9023);
  cap.translate(x + 2.6, topY + 0.4, z - 1.4);
  bucket.add(cap, mats.graniteLight);

  for (let i = 0; i < 36; i++) {
    const k = 0.06 + rand() * 0.9;
    const y = baseY + h * k;
    const rr = pillarRadiusAt(y) + 0.2;
    const a = rand() * Math.PI * 2;
    const g = new THREE.BoxGeometry(0.2 + rand() * 0.46, 3 + rand() * 14, 0.16 + rand() * 0.12);
    g.rotateZ((rand() - 0.5) * 0.08);
    g.rotateY(Math.PI * 0.5 - a);
    g.translate(x + Math.cos(a) * rr, y, z + Math.sin(a) * rr);
    bucket.add(g, i % 3 === 0 ? mats.graniteDark : mats.stoneDark);
  }

  for (let i = 0; i < 11; i++) {
    const k = 0.15 + rand() * 0.74;
    const y = baseY + h * k;
    const rr = pillarRadiusAt(y) + 0.6;
    const a = rand() * Math.PI * 2;
    const w = 5 + rand() * 7;
    const d = 1.6 + rand() * 2.5;
    const g = new THREE.BoxGeometry(w, 0.55 + rand() * 0.75, d);
    g.rotateZ((rand() - 0.5) * 0.06);
    g.rotateY(Math.PI * 0.5 - a);
    g.translate(x + Math.cos(a) * rr, y, z + Math.sin(a) * rr);
    bucket.add(g, i % 2 ? mats.graniteLight : mats.graniteDark);
    for (let n = 0; n < 3; n++) {
      const moss = new THREE.IcosahedronGeometry(1, 0);
      moss.scale(0.8 + rand() * 1.4, 0.18, 0.5 + rand() * 0.8);
      moss.translate(
        x + Math.cos(a) * (rr - 0.4) + (rand() - 0.5) * w * 0.7,
        y + 0.5,
        z + Math.sin(a) * (rr - 0.4) + (rand() - 0.5) * d * 0.7
      );
      bucket.add(moss, n % 2 ? mats.shrub : mats.shrubLight);
    }
    if (i % 2 === 0 && k < 0.75) {
      addPine(bucket, x + Math.cos(a) * (rr - 0.2), y + 0.55, z + Math.sin(a) * (rr - 0.2), 4 + rand() * 5, a, 9100 + i);
    }
  }

  for (let i = 0; i < 9; i++) {
    const k = 0.12 + rand() * 0.55;
    const y = baseY + h * k;
    const rr = pillarRadiusAt(y) + 1.2;
    const a = rand() * Math.PI * 2;
    addRock(bucket, 1.4 + rand() * 2.8, x + Math.cos(a) * rr, y + 0.4, z + Math.sin(a) * rr, 9300 + i, 0.7, i % 2 ? mats.graniteDark : mats.graniteLight);
  }

  const topRocks = [
    [x + 1.2, topY + 1.8, z - 1.0, 2.6],
    [x - 3.2, topY + 1.4, z + 1.6, 1.9],
    [x + 4.6, topY + 1.3, z + 2.5, 2.1],
  ];
  topRocks.forEach((r, i) => addRock(bucket, r[3], r[0], r[1], r[2], 9500 + i, 0.65, mats.graniteLight));

  for (let i = 0; i < 4; i++) {
    const a = i * 1.57 + 0.3;
    addPine(bucket, x + Math.cos(a) * 4.2, topY + 2.1, z + Math.sin(a) * 4.2, 4.2 + rand() * 3.2, a + Math.PI, 9600 + i);
  }

  addBox(bucket, 1.2, 2.4, 0.6, x + 3.6, topY + 3.1, z + 4.2, 0.28);
  addBox(bucket, 1.7, 0.28, 0.95, x + 3.6, topY + 1.9, z + 4.2, 0.28);

  for (let i = 0; i < 13; i++) {
    const a = rand() * Math.PI * 2;
    const rr = baseR + 10 + rand() * 22;
    const px = x + Math.cos(a) * rr;
    const pz = z + Math.sin(a) * rr;
    addRock(bucket, 2 + rand() * 4.4, px, heightAt(px, pz) + 1.1, pz, 9700 + i, 0.72);
    if (i % 2 === 0) addPine(bucket, px + 2, heightAt(px, pz) + 0.2, pz - 2, 5 + rand() * 4, rand() * 6.2, 9800 + i);
  }
}

function createCliffStairs(bucket) {
  const { x, z, baseY, topY } = TIANZHU_PEAK;
  const rand = mulberry32(4117);
  const count = 30;
  const y0 = baseY + 58;
  const y1 = topY - 24;
  const points = [];
  for (let i = 0; i < count; i++) {
    const k = i / (count - 1);
    const y = y0 + (y1 - y0) * k;
    const a = Math.PI * 0.5 + Math.sin(i * 0.42) * 0.16;
    const rr = pillarRadiusAt(y) + 1.35;
    points.push({
      x: x + Math.cos(a) * rr,
      y,
      z: z + Math.sin(a) * rr,
      a,
      yaw: Math.PI * 0.5 - a,
    });
  }
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    addBox(bucket, 2.9, 0.26, 1.35, p.x, p.y, p.z, p.yaw, 0, 0);
    addBox(bucket, 3.1, 0.2, 1.5, p.x, p.y - 0.28, p.z, p.yaw, 0, 0);
    if (i % 3 === 0) {
      const nx = Math.cos(p.a + Math.PI * 0.5);
      const nz = Math.sin(p.a + Math.PI * 0.5);
      for (const side of [-1, 1]) {
        const px = p.x + nx * side * 1.35;
        const pz = p.z + nz * side * 1.35;
        addCyl(bucket, 0.06, 0.09, 1.15, 5, px, p.y + 0.58, pz);
        bucket.add(segGeo(px, p.y - 1.3, pz, px, p.y, pz, 0.055, 0.075, 4), mats.stoneDark);
      }
    }
    if (i > 0 && i % 2 === 0) {
      const q = points[i - 2];
      const nx = Math.cos(p.a + Math.PI * 0.5);
      const nz = Math.sin(p.a + Math.PI * 0.5);
      for (const side of [-1, 1]) {
        chainSpan(
          bucket,
          q.x + nx * side * 1.35,
          q.y + 1.14,
          q.z + nz * side * 1.35,
          p.x + nx * side * 1.35,
          p.y + 1.14,
          p.z + nz * side * 1.35,
          0.18,
          0.035
        );
      }
    }
    if (i % 5 === 0) {
      addBox(bucket, 0.5, 0.14, 1.9, p.x + 1.3, p.y + 0.2, p.z, p.yaw, 0, 0.16);
    }
  }
  const last = points[points.length - 1];
  addCyl(bucket, 5.2, 5.6, 0.5, 18, last.x - 1.4, y1 + 0.1, last.z + 1.8);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 1.5 - 0.3;
    const px = last.x - 1.4 + Math.cos(a) * 5.1;
    const pz = last.z + 1.8 + Math.sin(a) * 5.1;
    addCyl(bucket, 0.06, 0.08, 1.0, 5, px, y1 + 0.55, pz);
    const b = ((i + 1) / 10) * Math.PI * 1.5 - 0.3;
    if (i < 9) {
      chainSpan(
        bucket,
        px,
        y1 + 1.03,
        pz,
        last.x - 1.4 + Math.cos(b) * 5.1,
        y1 + 1.03,
        last.z + 1.8 + Math.sin(b) * 5.1,
        0.16,
        0.03
      );
    }
  }
  addPine(bucket, last.x + 2.4, y1 + 0.4, last.z - 2.6, 3.4 + rand() * 2.2, 1.2, 9901);
}

function createShenmigu(bucket) {
  const rand = mulberry32(71432);
  const raw = [
    [252, 38], [243, 12], [232, -14], [220, -40], [206, -64],
    [192, -88], [177, -112], [163, -136], [151, -158],
  ];
  const pts = raw.map(([px, pz]) => new THREE.Vector3(px, heightAt(px, pz) + 0.2, pz));
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5);
  const n = 58;
  const frames = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p = curve.getPointAt(t);
    const tan = curve.getTangentAt(t);
    const nx = -tan.z;
    const nz = tan.x;
    frames.push({ p, nx, nz, yaw: Math.atan2(tan.x, tan.z) });
  }

  for (let i = 0; i < frames.length; i += 2) {
    const f = frames[i];
    addBox(bucket, 2.6 + rand() * 1.4, 0.3, 1.2 + rand() * 0.5, f.p.x, f.p.y + 0.08, f.p.z, f.yaw);
    if (i % 6 === 0) {
      addBox(bucket, 3.1, 0.18, 1.5, f.p.x, f.p.y - 0.16, f.p.z, f.yaw);
    }
  }

  for (let i = 3; i < frames.length - 3; i += 2) {
    const f = frames[i];
    for (const side of [-1, 1]) {
      if (side === 1 && rand() < 0.18) continue;
      const dist = 4.8 + rand() * 5.5;
      const px = f.p.x + f.nx * side * dist;
      const pz = f.p.z + f.nz * side * dist;
      const ground = heightAt(px, pz);
      const size = 2.5 + rand() * 4.4;
      const mat = rand() < 0.45 ? mats.graniteLight : (rand() < 0.6 ? mats.graniteDark : mats.rock);
      addRock(bucket, size, px, ground + size * 0.34, pz, 72000 + i * 7 + side + 3, 0.62 + rand() * 0.24, mat);
      if (rand() < 0.55) {
        const sy = ground + size * 0.78;
        addRock(bucket, size * (0.5 + rand() * 0.4), px + (rand() - 0.5) * 2.2, sy, pz + (rand() - 0.5) * 2.2, 72100 + i * 5 + side, 0.6, rand() < 0.5 ? mats.graniteDark : mats.graniteLight);
      }
      if (rand() < 0.42) {
        const moss = new THREE.IcosahedronGeometry(1, 0);
        moss.scale(size * (0.5 + rand() * 0.4), size * 0.14, size * (0.4 + rand() * 0.3));
        moss.translate(px, ground + size * 0.8, pz);
        bucket.add(moss, rand() < 0.5 ? mats.shrub : mats.shrubLight);
      }
      if (rand() < 0.3) {
        addPine(bucket, px + (rand() - 0.5) * 3, ground + size * 0.9, pz + (rand() - 0.5) * 3, 4 + rand() * 4.5, rand() * 6.2, 73000 + i * 3 + side);
      }
    }
    if (i % 8 === 0) {
      const dist = 8 + rand() * 4;
      const left = { x: f.p.x + f.nx * dist, z: f.p.z + f.nz * dist };
      const right = { x: f.p.x - f.nx * dist, z: f.p.z - f.nz * dist };
      const y = Math.max(heightAt(left.x, left.z), heightAt(right.x, right.z)) + 6.5 + rand() * 3;
      const g = new THREE.BoxGeometry(dist * 2.2, 1.4 + rand() * 1.6, 4 + rand() * 3);
      g.rotateY(f.yaw);
      g.translate(f.p.x, y, f.p.z);
      bucket.add(g, rand() < 0.5 ? mats.graniteLight : mats.graniteDark);
      addPine(bucket, f.p.x + 1.5, y + 0.6, f.p.z, 3.4 + rand() * 2, rand() * 6.2, 74000 + i);
    }
  }

  for (let i = 5; i < frames.length - 4; i += 7) {
    const f = frames[i];
    addCyl(bucket, 0.06, 0.09, 1.2, 5, f.p.x + f.nx * 2.4, f.p.y + 0.6, f.p.z + f.nz * 2.4);
    if (i + 7 < frames.length) {
      const q = frames[i + 7];
      chainSpan(
        bucket,
        f.p.x + f.nx * 2.4,
        f.p.y + 1.12,
        f.p.z + f.nz * 2.4,
        q.p.x + q.nx * 2.4,
        q.p.y + 1.12,
        q.p.z + q.nz * 2.4,
        0.3,
        0.035
      );
    }
  }

  const gate = frames[0];
  const gx = gate.p.x + gate.nx * 1.6;
  const gz = gate.p.z + gate.nz * 1.6;
  const gy = heightAt(gx, gz);
  addRock(bucket, 4.8, gx + 4.6, gy + 1.4, gz, 75001, 0.9, mats.graniteDark);
  addRock(bucket, 5.4, gx - 4.4, gy + 1.6, gz + 1.2, 75002, 0.9, mats.graniteLight);
  addBox(bucket, 10.5, 1.5, 2.2, gx, gy + 6.2, gz + 0.6, gate.yaw, 0, 0.04);

  const stones = [];
  addCyl(stones, 3.6, 3.9, 0.35, 16, gx, gy + 0.1, gz + 6);
  stones.forEach((g) => bucket.add(g, mats.stone));
  addBox(bucket, 0.16, 2.0, 0.16, gx - 1.3, gy + 1.1, gz + 6, gate.yaw);
  addBox(bucket, 0.16, 2.0, 0.16, gx + 1.3, gy + 1.1, gz + 6, gate.yaw);

  for (let i = 0; i < 12; i++) {
    const f = frames[Math.min(frames.length - 1, 4 + i * 4)];
    const side = i % 2 ? 1 : -1;
    const px = f.p.x + f.nx * side * (7 + rand() * 4);
    const pz = f.p.z + f.nz * side * (7 + rand() * 4);
    addRock(bucket, 1.6 + rand() * 2.8, px, heightAt(px, pz) + 0.8, pz, 76000 + i, 0.6, mats.rockLight);
  }
}

export function createTianzhuLandform() {
  const bucket = new Bucket();
  createPillar(bucket);
  createCliffStairs(bucket);
  createShenmigu(bucket);
  return bucket.finish('tianzhu-landform');
}
