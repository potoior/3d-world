import * as THREE from 'three';
import { mats } from './materials.js';
import { heightAt, lakeDef, templeDef } from './terrain.js';
import {
  Bucket, addBox, addCyl, addRock, addPine, chainSpan, mulberry32,
  darkWoodMat, goldMat, lacquerMat, lanternMat, tileMat, wallMat,
} from './tianzhuKit.js';

function addRoof(bucket, x, y, z, w, d, h, tiers = 2) {
  let cy = y;
  for (let t = 0; t < tiers; t++) {
    const shrink = Math.pow(0.62, t);
    const rh = h * (t === 0 ? 1 : 0.72);
    const g = new THREE.ConeGeometry(1, 1, 4, 1, false);
    g.rotateY(Math.PI * 0.25);
    g.scale(w * 0.78 * shrink, rh, d * 0.78 * shrink);
    g.translate(x, cy + rh * 0.5, z);
    bucket.add(g, tileMat);
    if (t === 0) {
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          const ex = x + sx * w * 0.55;
          const ez = z + sz * d * 0.55;
          const tip = new THREE.CylinderGeometry(0.05, 0.16, 1.6, 4);
          tip.rotateZ(sx * 0.55);
          tip.rotateX(-sz * 0.35);
          tip.translate(ex, cy + rh * 0.18, ez);
          bucket.add(tip, tileMat);
        }
      }
    }
    cy += rh * 0.78;
  }
  addBox(bucket, w * 0.52, 0.26, 0.32, x, cy + 0.1, z, 0, 0, 0, tileMat);
  addCyl(bucket, 0, 0.22, 0.8, 6, x, cy + 0.6, z, 0, 0, goldMat);
}

function addHall(bucket, x, y, z, w, d, wallH, roofH = 3.4) {
  addBox(bucket, w + 2.4, 0.9, d + 2.4, x, y + 0.45, z);
  addBox(bucket, w, wallH, d, x, y + 0.9 + wallH * 0.5, z, 0, 0, 0, wallMat);
  const colH = wallH * 1.06;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addCyl(bucket, 0.32, 0.38, colH, 8, x + sx * (w * 0.5 - 0.55), y + 0.9 + colH * 0.5, z + sz * (d * 0.5 - 0.55), 0, 0, lacquerMat);
    }
  }
  for (let i = -1; i <= 1; i++) {
    addCyl(bucket, 0.24, 0.28, colH, 7, x + i * w * 0.22, y + 0.9 + colH * 0.5, z + d * 0.5 - 0.45, 0, 0, lacquerMat);
  }
  addBox(bucket, w * 0.3, wallH * 0.62, 0.16, x, y + 0.9 + wallH * 0.31, z + d * 0.5 + 0.1, 0, 0, 0, darkWoodMat);
  addBox(bucket, w * 0.16, wallH * 0.56, 0.12, x, y + 0.9 + wallH * 0.3, z + d * 0.5 + 0.19, 0, 0, 0, darkWoodMat);
  addBox(bucket, w * 0.7, 0.18, 0.9, x, y + 0.9 + wallH * 0.7, z + d * 0.5 + 0.35, 0, 0, 0, lacquerMat);
  addRoof(bucket, x, y + 0.9 + wallH, z, w, d, roofH, 2);
  for (const sx of [-1, 1]) {
    addCyl(bucket, 0.22, 0.24, 0.6, 7, x + sx * (w * 0.5 + 0.15), y + 0.9 + wallH * 0.8, z + d * 0.5 + 0.1, 0, 0, lacquerMat);
    const lantern = new THREE.IcosahedronGeometry(0.42, 1);
    lantern.scale(1, 1.35, 1);
    lantern.translate(x + sx * (w * 0.5 + 0.15), y + 0.9 + wallH * 0.62, z + d * 0.5 + 0.1);
    bucket.add(lantern, lanternMat);
  }
}

function addPagoda(bucket, x, z, baseY) {
  addCyl(bucket, 7.2, 8.0, 2.8, 8, x, baseY + 1.4, z);
  let cy = baseY + 2.8;
  for (let i = 0; i < 7; i++) {
    const w = 9.4 - i * 0.92;
    const bodyH = 3.1 - i * 0.14;
    const body = new THREE.CylinderGeometry(w * 0.42, w * 0.47, bodyH, 8);
    body.translate(x, cy + bodyH * 0.5, z);
    bucket.add(body, i % 2 ? wallMat : lacquerMat);
    const eave = new THREE.ConeGeometry(1, 1, 8, 1, false);
    eave.scale(w * 0.72, 1.35, w * 0.72);
    eave.translate(x, cy + bodyH + 0.65, z);
    bucket.add(eave, tileMat);
    addCyl(bucket, w * 0.06, w * 0.07, 0.55, 6, x, cy + bodyH + 1.7, z, 0, 0, goldMat);
    cy += bodyH + 1.05;
  }
  addCyl(bucket, 0, 0.55, 2.6, 8, x, cy + 1.0, z, 0, 0, goldMat);
  addCyl(bucket, 0.08, 0.12, 1.4, 6, x, cy + 2.9, z, 0, 0, goldMat);
  const ring = new THREE.TorusGeometry(1.1, 0.08, 5, 16);
  ring.rotateX(Math.PI * 0.5);
  ring.translate(x, cy + 2.2, z);
  bucket.add(ring, goldMat);
}

function addPavilion(bucket, x, y, z, r, h) {
  addCyl(bucket, r, r + 0.5, 0.4, 8, x, y + 0.2, z);
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI * 0.5 + Math.PI * 0.25;
    addCyl(bucket, 0.11, 0.15, h, 6, x + Math.cos(a) * r * 0.7, y + h * 0.5, z + Math.sin(a) * r * 0.7, 0, 0, darkWoodMat);
  }
  const roof = new THREE.ConeGeometry(1, 1, 4, 1, false);
  roof.rotateY(Math.PI * 0.25);
  roof.scale(r * 1.25, h * 0.62, r * 1.25);
  roof.translate(x, y + h + h * 0.28, z);
  bucket.add(roof, tileMat);
  addCyl(bucket, 0, 0.16, 0.5, 6, x, y + h * 1.42, z, 0, 0, goldMat);
  for (const sx of [-1, 1]) {
    addBox(bucket, r * 1.3, 0.12, 0.4, x, y + 0.45, z + sx * r * 0.55, 0, 0, 0, darkWoodMat);
  }
}

function createLakeShore(bucket) {
  const rand = mulberry32(33517);
  const { x, z, radius, waterY } = lakeDef;
  for (let i = 0; i < 84; i++) {
    const a = (i / 84) * Math.PI * 2 + rand() * 0.06;
    const rr = radius + 4 + rand() * 34;
    const px = x + Math.cos(a) * rr;
    const pz = z + Math.sin(a) * rr;
    const ground = heightAt(px, pz);
    const size = 1.4 + rand() * 4.2;
    addRock(bucket, size, px, ground + size * 0.3, pz, 31000 + i, 0.55 + rand() * 0.3, rand() < 0.5 ? mats.graniteLight : mats.rock);
    if (i % 3 === 0) {
      addRock(bucket, 0.9 + rand() * 2.1, px + (rand() - 0.5) * 8, ground + 0.4, pz + (rand() - 0.5) * 8, 31500 + i, 0.6, mats.rockLight);
    }
    if (i % 4 === 0 && ground > waterY + 0.8) {
      addPine(bucket, px + (rand() - 0.5) * 6, ground, pz + (rand() - 0.5) * 6, 4 + rand() * 5.5, rand() * 6.2, 32000 + i);
    }
    if (i % 2 === 0) {
      const n = 5 + (rand() * 4 | 0);
      for (let k = 0; k < n; k++) {
        const g = new THREE.ConeGeometry(0.16 + rand() * 0.2, 1.8 + rand() * 2.2, 4);
        g.rotateZ((rand() - 0.5) * 0.35);
        g.translate(px + (rand() - 0.5) * 3.4, ground + 0.9, pz + (rand() - 0.5) * 3.4);
        bucket.add(g, rand() < 0.5 ? mats.grass : mats.shrubLight);
      }
    }
  }

  const dockAngle = Math.atan2(300 - z, -385 - x);
  const dx = Math.cos(dockAngle);
  const dz = Math.sin(dockAngle);
  const dockX = x + dx * (radius - 8);
  const dockZ = z + dz * (radius - 8);
  for (let i = 0; i < 8; i++) {
    const t = i / 7;
    const px = x + dx * (radius - 30 + t * 22);
    const pz = z + dz * (radius - 30 + t * 22);
    addBox(bucket, 4.6, 0.22, 3.0, px, waterY + 0.75, pz, -dockAngle, 0, 0, darkWoodMat);
    if (i % 2 === 0) {
      for (const side of [-1, 1]) {
        addCyl(bucket, 0.12, 0.16, 3.4, 6, px + dz * side * 2.05, waterY - 0.4, pz - dx * side * 2.05, 0, 0, darkWoodMat);
      }
    }
  }
  addPavilion(bucket, x + dx * (radius - 14), waterY + 0.85, z + dz * (radius - 14), 4.4, 4.6);

  addBox(bucket, 2.6, 0.34, 7.4, x - 16, waterY + 0.2, z + 14, 0.7, 0, 0.02, darkWoodMat);
  addBox(bucket, 1.7, 0.24, 5.0, x - 16, waterY + 0.46, z + 14, 0.7, 0, 0, darkWoodMat);
  addBox(bucket, 0.25, 0.75, 1.2, x - 16, waterY + 0.86, z + 14, 0.7, 0, 0, darkWoodMat);
  addCyl(bucket, 0.06, 0.08, 2.6, 5, x - 16.6, waterY + 1.2, z + 15.4, 0, 0, darkWoodMat);
  addBox(bucket, 1.6, 0.6, 0.1, x - 17.7, waterY + 1.7, z + 15.4, 0.7, 0, 0, wallMat);

  const pavX = x + dx * (radius - 14);
  const pavZ = z + dz * (radius - 14);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    addRock(bucket, 1.2 + rand() * 2.6, pavX + Math.cos(a) * (9 + rand() * 5), heightAt(pavX + Math.cos(a) * 12, pavZ + Math.sin(a) * 12) + 0.4, pavZ + Math.sin(a) * (9 + rand() * 5), 33000 + i, 0.6);
  }
  addPine(bucket, pavX + 7, heightAt(pavX + 7, pavZ + 5), pavZ + 5, 6.4, 2.4, 33100);
  addPine(bucket, pavX - 8, heightAt(pavX - 8, pavZ - 6), pavZ - 6, 5.2, 5.1, 33101);

  for (let i = 0; i < 6; i++) {
    const a = -0.6 + i * 0.52;
    const px = x + Math.cos(a) * (radius + 46);
    const pz = z + Math.sin(a) * (radius + 46);
    const ground = heightAt(px, pz);
    addPine(bucket, px, ground, pz, 6 + rand() * 5, rand() * 6.2, 33200 + i);
  }
  return { dockX, dockZ, pavX, pavZ };
}

function createTemple(bucket) {
  const rand = mulberry32(52611);
  const { x, z, y, radius } = templeDef;
  addCyl(bucket, radius + 2, radius + 4, 2.2, 30, x, y - 0.5, z);
  addCyl(bucket, radius - 2, radius - 1, 0.35, 28, x, y + 0.55, z);

  for (let i = 0; i < 7; i++) {
    addBox(bucket, 12 - i * 0.35, 0.32, 1.7, x, y + 0.4 - i * 0.18, z + radius + 4 - i * 1.6);
  }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    if (Math.sin(a) > 0.55) continue;
    const px = x + Math.cos(a) * (radius - 2);
    const pz = z + Math.sin(a) * (radius - 2);
    addBox(bucket, 5.4, 1.5, 0.65, px, y + 1.3, pz, -a + Math.PI * 0.5, 0, 0, wallMat);
    addBox(bucket, 5.7, 0.2, 0.9, px, y + 2.12, pz, -a + Math.PI * 0.5);
    if (i % 3 === 0) {
      addCyl(bucket, 0.16, 0.2, 2.6, 6, px, y + 2.1, pz, 0, 0, lacquerMat);
      const lantern = new THREE.IcosahedronGeometry(0.38, 1);
      lantern.translate(px, y + 3.2, pz);
      bucket.add(lantern, lanternMat);
    }
  }

  addHall(bucket, x, y + 0.4, z - 2, 20, 12, 6.2, 3.8);
  addHall(bucket, x, y + 0.4, z - 17, 14, 9, 4.8, 3.2);
  addHall(bucket, x - 20, y + 0.4, z - 1, 8.5, 11, 4.2, 2.8);
  addHall(bucket, x + 20, y + 0.4, z - 1, 8.5, 11, 4.2, 2.8);

  addBox(bucket, 16, 0.3, 10, x, y + 0.65, z + 10);
  for (let i = 0; i < 6; i++) {
    addCyl(bucket, 0.14, 0.18, 4.0, 6, x - 4.4 + i * 1.75, y + 2.4, z + 14.7, 0, 0, lacquerMat);
  }
  addBox(bucket, 12.4, 0.5, 0.7, x, y + 4.5, z + 14.7, 0, 0, 0, lacquerMat);
  addRoof(bucket, x, y + 4.7, z + 14.7, 13, 2.6, 1.6, 1);
  addBox(bucket, 3.2, 1.5, 0.18, x, y + 4.1, z + 15.1, 0, 0, 0, darkWoodMat);
  addBox(bucket, 2.6, 0.9, 0.22, x, y + 4.0, z + 15.2, 0, 0, 0, goldMat);

  addCyl(bucket, 1.6, 2.1, 1.5, 8, x, y + 1.35, z + 8, 0, 0, goldMat);
  addCyl(bucket, 0.36, 0.5, 1.9, 8, x, y + 2.8, z + 8, 0, 0, goldMat);
  addCyl(bucket, 0.16, 0.3, 0.8, 8, x, y + 4.1, z + 8, 0, 0, goldMat);

  addPagoda(bucket, x + 26, z - 14, y + 0.3);

  for (let i = 0; i < 10; i++) {
    addBox(bucket, 2.4, 0.14, 1.5, x, y + 0.72, z + 4 + i * 1.7);
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const px = x + Math.cos(a) * 15;
    const pz = z + Math.sin(a) * 15;
    addBox(bucket, 1.4, 0.7, 1.4, px, y + 1.0, pz, a, 0, 0, wallMat);
    const top = new THREE.ConeGeometry(1.0, 0.8, 4);
    top.rotateY(Math.PI * 0.25);
    top.translate(px, y + 1.55, pz);
    bucket.add(top, tileMat);
    if (i % 2 === 0) {
      addPine(bucket, px + Math.cos(a + 0.5) * 6, y + 0.5, pz + Math.sin(a + 0.5) * 6, 4.4 + rand() * 3.5, rand() * 6.2, 55000 + i);
    }
  }

  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.3;
    const px = x + Math.cos(a) * (radius + 9);
    const pz = z + Math.sin(a) * (radius + 9);
    addPine(bucket, px, heightAt(px, pz), pz, 6 + rand() * 5, rand() * 6.2, 56000 + i);
    addRock(bucket, 1.2 + rand() * 2.4, px + 2, heightAt(px + 2, pz - 2) + 0.5, pz - 2, 57000 + i, 0.7, i % 2 ? mats.rock : mats.rockLight);
  }

  addBox(bucket, 1.1, 2.6, 0.35, x - 3.6, y + 2.0, z + radius - 1.2, 0.2, 0, 0, darkWoodMat);
  return { x, z, y };
}

export function createTianzhuShrines() {
  const bucket = new Bucket();
  const lake = createLakeShore(bucket);
  const temple = createTemple(bucket);
  return { group: bucket.finish('tianzhu-shrines'), lake, temple };
}
