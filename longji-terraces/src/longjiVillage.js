import * as THREE from 'three';
import { M, mat, box, cyl, addMesh, gableRoof, pathStairs } from './longjiKit.js';

export function stiltHouse(g, x, y, z, ry, scale, seed, accent) {
  const h = new THREE.Group();
  h.position.set(x, y, z);
  h.rotation.y = ry;
  h.scale.setScalar(scale);
  const w = 7.0;
  const d = 4.7;
  const postH = 2.2 + (seed % 3) * 0.25;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, postH, 6), M.woodDark);
    p.position.set(sx * w * 0.44, postH * 0.5, sz * d * 0.4);
    p.castShadow = true;
    h.add(p);
  }
  box(h, w + 0.8, 0.22, d + 1.4, M.wood, 0, postH, 0.45);
  box(h, w, 2.2, d, M.plaster, 0, postH + 1.15, 0);
  box(h, w - 0.5, 2.0, d - 0.4, M.woodLight, 0, postH + 3.2, 0);
  for (let i = 0; i < 5; i++) box(h, 0.1, 0.95, 0.1, M.woodDark, -w * 0.43 + i * w * 0.215, postH + 2.7, d * 0.5 + 0.7);
  box(h, w + 0.7, 0.1, 0.1, M.woodDark, 0, postH + 3.15, d * 0.5 + 0.7);
  const shutter = accent === 1 ? M.clothRed : M.clothBlue;
  for (const sx of [-1, 1]) {
    box(h, 1.15, 1.2, 0.08, M.woodDark, sx * 1.55, postH + 1.25, d * 0.5 + 0.03);
    box(h, 1.05, 0.98, 0.05, shutter, sx * 1.55, postH + 1.25, d * 0.5 + 0.08);
  }
  box(h, 1.2, 1.85, 0.1, M.woodDark, 0.2, postH + 0.95, d * 0.5 + 0.06);
  box(h, 0.95, 1.6, 0.08, mat(0x59432b, 0.95), 0.2, postH + 0.85, d * 0.5 + 0.12);
  gableRoof(h, 0, postH + 4.2, 0, w + 2.0, d + 2.0, 2.2 + (seed % 2) * 0.2, 0);
  for (let i = 0; i < 4; i++) {
    const c = i % 2 === 0 ? mat(0xd7b348, 0.9) : mat(0xb4512f, 0.9);
    box(h, 0.34, 0.55, 0.14, c, -2.1 + i * 1.35, postH + 2.55, d * 0.5 + 0.4);
  }
  g.add(h);
}

function villagePlatform(g, cx, cz, topY, w, d, seed, toward) {
  box(g, w, 9, d, M.stoneDark, cx, topY - 4.5, cz);
  box(g, w + 1.5, 0.6, d + 1.5, M.earthDark, cx, topY - 0.2, cz);
  box(g, w + 0.8, 0.5, d + 0.8, M.pathStone, cx, topY + 0.2, cz);
  const ux = toward[0];
  const uz = toward[1];
  const ex = cx + ux * w * 0.42;
  const ez = cz + uz * d * 0.42;
  box(g, 3.2, 0.3, 2.2, M.pathStone, ex + ux * 2, topY - 0.1, ez + uz * 2, Math.atan2(ux, uz));
  pathStairs(g, ex + ux * 2.4, ez + uz * 2.4, topY - 0.2, ex + ux * 17, ez + uz * 17, Math.max(0.4, topY - 13.5), 3.3, 19);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + seed;
    if (i % 2) continue;
    const x = cx + Math.cos(a) * w * 0.42;
    const z = cz + Math.sin(a) * d * 0.4;
    box(g, 0.4, 1.1, 0.4, M.woodDark, x, topY + 0.75, z);
    box(g, 0.3, 0.25, 1.9, M.wood, x, topY + 1.28, z, a);
  }
}

export function buildPingan(g) {
  const cx = -214;
  const cz = 126;
  const topY = 23.5;
  villagePlatform(g, cx, cz, topY, 54, 39, 11, [0.84, -0.53]);
  const defs = [
    [-18, -11, 0.18, 1.05, 0], [-7, 7, -0.4, 1.0, 1], [5, -9, 0.55, 1.08, 0],
    [17, 7, 2.7, 0.96, 1], [0, 15, 3.15, 1.12, 0], [21, -10, -1.7, 0.9, 0],
  ];
  defs.forEach((d, i) => stiltHouse(g, cx + d[0], topY + 0.45, cz + d[1], d[2], d[3], 30 + i * 3, d[4]));
  for (let i = 0; i < 5; i++) {
    const x = cx - 22 + i * 11;
    box(g, 0.32, 2.1, 0.32, M.woodDark, x, topY + 1.4, cz + 17.5);
    box(g, 3.2, 0.28, 0.35, M.wood, x + 1.6, topY + 2.35, cz + 17.5);
    box(g, 1.1, 0.7, 0.08, i % 2 ? M.clothRed : mat(0xd7b348, 0.92), x + 1.6, topY + 1.65, cz + 17.5);
  }
  return [[cx - 31, cz - 18], [cx - 29, cz + 21], [cx + 28, cz + 19], [cx + 31, cz - 17], [cx - 8, cz - 24]];
}

export function buildJinkeng(g) {
  const cx = 232;
  const cz = 145;
  const topY = 23.0;
  villagePlatform(g, cx, cz, topY, 60, 43, 17, [-0.84, -0.55]);
  const defs = [
    [-23, -12, 0.7, 1.02, 1], [-10, 10, -0.2, 1.12, 0], [4, -12, 0.2, 0.94, 1],
    [15, 8, 2.6, 1.06, 0], [26, -6, -1.9, 0.9, 1], [1, 18, 3.05, 1.0, 0],
  ];
  defs.forEach((d, i) => stiltHouse(g, cx + d[0], topY + 0.45, cz + d[1], d[2], d[3], 50 + i * 3, d[4]));
  for (let i = 0; i < 4; i++) {
    const x = cx - 20 + i * 13;
    box(g, 0.34, 2.4, 0.34, M.woodDark, x, topY + 1.5, cz + 19.5);
    box(g, 0.5, 0.5, 0.5, mat(0xd7b348, 0.9), x + 1.5, topY + 2.7, cz + 19.5);
    box(g, 1.4, 0.9, 0.1, i % 2 ? M.clothBlue : M.clothRed, x + 1.5, topY + 1.9, cz + 19.5);
  }
  return [[cx - 34, cz - 20], [cx - 32, cz + 23], [cx + 31, cz + 20], [cx + 35, cz - 19], [cx + 3, cz - 26]];
}

export function createViewpoint(g, x, y, z, ry, scale = 1) {
  const h = new THREE.Group();
  h.position.set(x, y, z);
  h.rotation.y = ry;
  h.scale.setScalar(scale);
  box(h, 16, 0.4, 12, M.wood, 0, 0, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    cyl(h, 0.28, 0.34, 3.2, 6, M.woodDark, sx * 7, -1.6, sz * 5);
    box(h, 0.34, 4.2, 0.34, M.woodDark, sx * 6.2, 2.1, sz * 4.4);
  }
  for (const sz of [-1, 1]) {
    box(h, 13.4, 0.16, 0.16, M.woodDark, 0, 1.15, sz * 5);
    box(h, 13.4, 0.16, 0.16, M.woodDark, 0, 0.65, sz * 5);
    for (let i = 0; i < 7; i++) box(h, 0.12, 1.2, 0.12, M.woodDark, -6 + i * 2, 0.6, sz * 5);
  }
  for (const sx of [-1, 1]) {
    box(h, 0.16, 0.16, 9.4, M.woodDark, sx * 6.2, 1.15, 0);
    for (let i = 0; i < 5; i++) box(h, 0.12, 1.2, 0.12, M.woodDark, sx * 6.2, 0.6, -4 + i * 2);
  }
  box(h, 13.8, 3.0, 10.6, mat(0x5b4731, 0.92), 0, 4.4, 0);
  gableRoof(h, 0, 6.9, 0, 17, 14, 3.0, 0);
  for (let i = 0; i < 3; i++) {
    box(h, 1.1, 0.09, 6.0, M.wood, -4.4 + i * 4.4, 0.12, 0.6);
  }
  box(h, 0.35, 2.2, 0.35, M.woodDark, -7.4, 2.6, -4.2);
  box(h, 0.35, 2.2, 0.35, M.woodDark, 7.4, 2.6, 4.2);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.9), new THREE.MeshStandardMaterial({ color: 0xa93d32, side: THREE.DoubleSide, roughness: 0.9 }));
  flag.position.set(7.4, 5.1, 4.2);
  flag.rotation.y = -0.3;
  h.add(flag);
  g.add(h);
  return h;
}

export function buildQixingGrounds(g) {
  const cx = -176;
  const cz = -82;
  const topY = 1.2;
  const mounds = [];
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 2.4, 56), M.earthDark);
  base.scale.set(64, 1, 57);
  base.position.set(cx, topY - 1.2, cz);
  base.receiveShadow = true;
  base.castShadow = true;
  g.add(base);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + 0.35;
    const r = 42 + (i % 2) * 5;
    const mx = cx + Math.cos(a) * r;
    const mz = cz + Math.sin(a) * r * 0.82;
    const rr = 10.5 + (i % 3) * 2.2;
    const hh = 10 + (i % 3) * 3.2;
    const levels = 4;
    for (let k = 0; k < levels; k++) {
      const t0 = k / levels;
      const t1 = (k + 1) / levels;
      const s0 = 1 - 0.7 * t0;
      const s1 = 1 - 0.7 * t1;
      const y = topY + hh * Math.pow(t0, 1.15);
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(rr * s1, rr * s0, 1.15, 28, 1, true), M.earth);
      ring.position.set(mx, y + 0.55, mz);
      ring.castShadow = true;
      g.add(ring);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(rr * s0, rr * s0, 0.5, 28), M.top[(i + k) % M.top.length]);
      cap.position.set(mx, y + 1.15, mz);
      cap.receiveShadow = true;
      cap.castShadow = true;
      g.add(cap);
    }
    mounds.push({ x: mx, z: mz, r: rr, y: topY + hh, h: hh });
  }
  return { cx, cz, topY, mounds, crescentR: 30 };
}

export function addQixingCrescentWater(water, qx) {
  const segs = 76;
  const base = water.pos.length / 3;
  const R = qx.crescentR;
  const inner = R - 11;
  const open = 2.25;
  for (let i = 0; i <= segs; i++) {
    const a = -open + (2 * open * i) / segs;
    const xo = qx.cx + Math.cos(a) * R;
    const zo = qx.cz + Math.sin(a) * R * 0.72;
    const xi = qx.cx + Math.cos(a) * inner;
    const zi = qx.cz + Math.sin(a) * inner * 0.72;
    water.pos.push(xo, qx.topY + 0.15, zo, xi, qx.topY + 0.15, zi);
    water.uv.push(i / segs, 1, i / segs, 0);
    if (i < segs) {
      const b = base + i * 2;
      water.idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
    }
  }
}

export function buildQixingWaterRings(water, qx) {
  qx.mounds.forEach((m, i) => {
    for (let k = 0; k < 4; k++) {
      const t0 = k / 4;
      const t1 = (k + 1) / 4;
      const r0 = m.r * (1 - 0.7 * t0) - 0.75;
      const r1 = m.r * (1 - 0.7 * t1) + 0.65;
      if (r0 - r1 < 0.7) continue;
      const y = qx.topY + m.h * Math.pow(t0, 1.15) + 1.45;
      const base = water.pos.length / 3;
      const segs = 36;
      for (let j = 0; j <= segs; j++) {
        const a = (j / segs) * Math.PI * 2;
        const s = r0 > 0 ? 1 : 0;
        water.pos.push(m.x + Math.cos(a) * r0, y, m.z + Math.sin(a) * r0, m.x + Math.cos(a) * r1, y, m.z + Math.sin(a) * r1);
        water.uv.push(j / segs, 1, j / segs, 0);
        if (j < segs) {
          const b = base + j * 2;
          water.idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
        }
      }
    }
  });
}

export function buildJiulongGrounds(g, surfaceHeight, m) {
  const r = 0.78;
  const side = 0.08;
  const th = 2.49;
  for (let i = 0; i < 9; i++) {
    const theta = th + (i - 4) * 0.085;
    for (let j = 0; j < 8; j++) {
      const t = 0.5 + j * 0.055;
      const s = 1 - 0.88 * t;
      const w = 1 + Math.sin(theta * 3 + m.phase) * 0.075 + Math.sin(theta * 7 - m.phase * 1.7) * 0.045;
      const x = m.cx + m.rx * s * w * Math.cos(theta);
      const z = m.cz + m.rz * s * w * Math.sin(theta);
      const y = m.h * Math.pow(t, 1.27) + 2.0;
      const cone = new THREE.Mesh(new THREE.ConeGeometry(4.0 + j * 0.3, 10 + (i % 3) * 3, 6), i % 2 ? M.forest : M.leafDeep);
      cone.position.set(x, y + 4.5, z);
      cone.rotation.y = theta;
      cone.scale.z = 1.7;
      cone.castShadow = true;
      cone.receiveShadow = true;
      g.add(cone);
    }
  }
  for (let i = 0; i < 5; i++) {
    const theta = th - 0.32 + i * 0.16;
    const t = 0.64;
    const s = 1 - 0.88 * t;
    const w = 1 + Math.sin(theta * 3 + m.phase) * 0.075;
    const x = m.cx + m.rx * s * w * Math.cos(theta);
    const z = m.cz + m.rz * s * w * Math.sin(theta);
    const y = m.h * Math.pow(t, 1.27);
    const tiger = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), M.forest);
    tiger.scale.set(11, 7, 15);
    tiger.position.set(x, y + 2.5, z);
    tiger.rotation.y = theta;
    tiger.castShadow = true;
    tiger.receiveShadow = true;
    g.add(tiger);
  }
}

export function addBamboo(g, spots, heightAt) {
  spots.forEach(([x, z], idx) => {
    const y = heightAt ? heightAt(x, z) : 0;
    for (let i = 0; i < 7; i++) {
      const ox = ((i * 37 + idx * 13) % 11 - 5) * 0.72;
      const oz = ((i * 53 + idx * 7) % 11 - 5) * 0.72;
      const hh = 8 + ((i * 29 + idx * 11) % 7) * 1.25;
      cyl(g, 0.1, 0.16, hh, 5, i % 2 ? M.bamboo : M.bambooDark, x + ox, y + hh * 0.5, z + oz, 0.05 * (i - 3), 0, 0.04 * (idx % 3 - 1));
      for (let k = 0; k < 3; k++) {
        const crown = new THREE.Mesh(new THREE.ConeGeometry(1.1 + k * 0.25, 2.6, 5), k === 1 ? M.leafDeep : M.leaf);
        crown.position.set(x + ox + (k - 1) * 0.5, y + hh - 0.8 - k * 1.0, z + oz + (1 - k) * 0.45);
        crown.rotation.z = (k - 1) * 0.55;
        crown.castShadow = true;
        g.add(crown);
      }
    }
  });
}

export function createFarmer(x, y, z, ry, seed) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = ry;
  const body = new THREE.Group();
  const coat = seed % 2 ? mat(0x2d3e53, 0.92) : mat(0x5c3e32, 0.92);
  for (const sx of [-1, 1]) box(body, 0.22, 0.92, 0.24, mat(0x2b2d2b, 0.96), sx * 0.17, 0.46, 0);
  box(body, 0.62, 0.95, 0.38, coat, 0, 1.25, 0);
  box(body, 1.25, 0.16, 0.2, coat, 0, 1.55, 0);
  addMesh(body, new THREE.SphereGeometry(0.23, 10, 8), M.skin, 0, 1.92, 0);
  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.62, 0.32, 12), mat(0xc2a76a, 0.9));
  hat.position.set(0, 2.14, 0);
  hat.castShadow = true;
  body.add(hat);
  const armL = new THREE.Group();
  armL.position.set(-0.42, 1.52, 0);
  box(armL, 0.18, 0.85, 0.18, coat, 0, -0.36, 0);
  box(armL, 0.17, 0.2, 0.17, M.skin, 0, -0.82, 0);
  const armR = new THREE.Group();
  armR.position.set(0.42, 1.52, 0);
  box(armR, 0.18, 0.85, 0.18, coat, 0, -0.36, 0);
  box(armR, 0.17, 0.2, 0.17, M.skin, 0, -0.82, 0);
  body.add(armL, armR);
  if (seed % 3 === 0) {
    box(body, 0.55, 0.5, 0.5, mat(0xa07f42, 0.9), -0.52, 1.02, -0.15);
    box(body, 0.06, 0.4, 0.06, M.woodDark, -0.78, 0.6, -0.15);
  }
  g.add(body);
  g.userData = { body, armL, armR, phase: seed * 1.7, baseY: y, baseRy: ry, seed };
  return g;
}
