import * as THREE from 'three';
import { mats } from './materials.js';
import { mergedMesh } from './geometry.js';
import { terrainHeight, riverCenter, riverHalfWidth, WATER_Y } from './terrain.js';

let seed = 7103;
function rnd() {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
}

function sandColor(g, hex) {
  const c = new THREE.Color(hex);
  const n = g.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const v = 0.9 + rnd() * 0.16;
    arr[i * 3] = c.r * v;
    arr[i * 3 + 1] = c.g * v;
    arr[i * 3 + 2] = c.b * v;
  }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
}

export function createShoreDetails() {
  const root = new THREE.Group();
  const rocks = [];
  const sand = [];
  const pads = [];
  const reeds = [];
  const foam = [];
  const plants = [];
  for (let z = -1040; z <= 1040; z += 6.5) {
    const c = riverCenter(z);
    const w = riverHalfWidth(z);
    for (const side of [-1, 1]) {
      const x = c + side * (w + 1 + rnd() * 7);
      const h = terrainHeight(x, z);
      if (h > 0.2 && h < 1.7) {
        const s = 0.55 + rnd() * 2.1;
        const g = new THREE.IcosahedronGeometry(s, 0);
        g.scale(1.35, 0.62, 1.05);
        g.rotateY(rnd() * 6.28);
        g.translate(x + (rnd() - 0.5) * 2, h + s * 0.15, z + (rnd() - 0.5) * 2);
        rocks.push(g);
      }
      if (h > WATER_Y + 0.05 && h < 0.9 && rnd() < 0.16) {
        const rr = 2 + rnd() * 4.5;
        const g = new THREE.CylinderGeometry(rr * 0.7, rr, 0.18, 9);
        g.scale(1.6, 1, 0.7);
        g.rotateY(rnd() * 6.28);
        g.translate(x + side * (rnd() * 4), WATER_Y + 0.04, z + (rnd() - 0.5) * 5);
        sandColor(g, rnd() < 0.5 ? 0xb9ad8b : 0xc5b996);
        sand.push(g);
      }
      if (h < WATER_Y + 1.3 && rnd() < 0.42) {
        const n = 2 + ((rnd() * 4) | 0);
        for (let b = 0; b < n; b++) {
          const bh = 0.9 + rnd() * 1.8;
          const g = new THREE.ConeGeometry(0.055, bh, 3);
          g.rotateZ((rnd() - 0.5) * 0.5);
          g.translate(x + (rnd() - 0.5) * 3.2, Math.max(WATER_Y + 0.12, h) + bh * 0.45, z + (rnd() - 0.5) * 3.2);
          reeds.push(g);
        }
      }
      const waterEdge = c + side * (w - 1.5);
      if (terrainHeight(waterEdge, z) < WATER_Y + 0.3 && rnd() < 0.33) {
        const n = 2 + ((rnd() * 3) | 0);
        for (let p = 0; p < n; p++) {
          const pr = 0.35 + rnd() * 0.9;
          const g = new THREE.CircleGeometry(pr, 7);
          g.rotateX(-Math.PI / 2);
          g.rotateZ(rnd() * 6.28);
          const px = waterEdge - side * (1 + rnd() * 5);
          g.translate(px + (rnd() - 0.5) * 2.5, WATER_Y + 0.035, z + (rnd() - 0.5) * 4);
          sandColor(g, rnd() < 0.6 ? 0x4f7448 : 0x6e8a55);
          pads.push(g);
        }
      }
      if (rnd() < 0.34) {
        const fx = c + side * (w + 1.2 + rnd() * 3.5);
        const fw = 0.6 + rnd() * 1.1;
        const fl = 2.5 + rnd() * 4;
        const g = new THREE.PlaneGeometry(fw, fl);
        g.rotateX(-Math.PI / 2);
        g.translate(fx, WATER_Y + 0.055, z + (rnd() - 0.5) * 2);
        foam.push(g);
      }
      if (h > 0.9 && h < 2.3 && rnd() < 0.55) {
        for (let v = 0; v < 3; v++) {
          const g = new THREE.PlaneGeometry(1.0 + rnd() * 1.1, 0.7 + rnd() * 0.8);
          g.rotateY(rnd() * 3.14);
          g.rotateX(0.9 + rnd() * 0.35);
          g.translate(x + (rnd() - 0.5) * 5, h + 0.25, z + (rnd() - 0.5) * 5);
          plants.push(g);
        }
      }
    }
  }
  const rm = mergedMesh(rocks, mats.stone, true, true);
  const sm = mergedMesh(sand, mats.rice, false, true);
  const pm = mergedMesh(pads, mats.rice, false, true);
  const gm = mergedMesh(reeds, mats.reed, false, true);
  const fm = mergedMesh(foam, mats.wake, false, false);
  const lm = mergedMesh(plants, mats.leaf, false, true);
  for (const m of [rm, sm, pm, gm, fm, lm]) if (m) root.add(m);
  return root;
}
