import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { geoBox, geoCyl, mergeParts, pushColored } from './xijiangMaterials.js';

export function curvedRoofGeometry(width, depth, rise, overhang, segX = 4, segZ = 3) {
  const pos = [];
  const uv = [];
  const idx = [];
  const halfW = width / 2 + overhang;
  const halfD = depth / 2 + overhang;
  for (const side of [-1, 1]) {
    const start = pos.length / 3;
    for (let iz = 0; iz <= segZ; iz++) {
      const v = iz / segZ;
      const z = side * v * halfD;
      for (let ix = 0; ix <= segX; ix++) {
        const u = ix / segX;
        const x = (u - 0.5) * 2 * halfW;
        const ex = Math.pow(Math.abs(x) / halfW, 4);
        const y = rise * (1 - Math.pow(v, 1.28)) + ex * v * 0.62;
        pos.push(x, y, z);
        uv.push(u * width * 0.22, v * depth * 0.3);
      }
    }
    for (let iz = 0; iz < segZ; iz++) {
      for (let ix = 0; ix < segX; ix++) {
        const a = start + iz * (segX + 1) + ix;
        const b = a + 1;
        const c = a + segX + 1;
        const d = c + 1;
        if (side > 0) idx.push(a, c, b, b, c, d);
        else idx.push(a, b, c, b, d, c);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export function houseGeometries() {
  const wood = [];
  const dark = [];
  const stone = [];
  const roof = [];
  const win = [];
  const lantern = [];
  const W = 8.2;
  const D = 6.0;
  stone.push(geoBox(W + 0.6, 3.6, D + 0.6, 0, -1.2, 0));
  for (let i = 0; i < 2; i++) {
    stone.push(geoBox(2.3 - i * 0.25, 0.3, 0.55, 0, 0.45 - i * 0.28, 3.5 + i * 0.5));
  }
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      wood.push(geoBox(0.44, 2.0, 0.44, sx * 3.65, 1.45, sz * 2.5));
    }
    wood.push(geoBox(0.36, 2.0, 0.36, sx * 1.2, 1.45, 2.55));
  }
  wood.push(geoBox(W - 0.2, 0.28, 0.34, 0, 2.25, 2.52));
  wood.push(geoBox(W - 0.2, 0.28, 0.34, 0, 2.25, -2.52));
  wood.push(geoBox(0.34, 0.28, D - 0.2, 3.62, 2.25, 0));
  wood.push(geoBox(0.34, 0.28, D - 0.2, -3.62, 2.25, 0));
  wood.push(geoBox(W - 0.5, 3.1, D - 0.5, 0, 3.35, 0));
  wood.push(geoBox(W + 0.35, 3.9, D + 0.2, 0, 6.35, 0));
  wood.push(geoBox(W + 1.5, 0.24, D + 2.9, 0, 4.55, 0.9));
  wood.push(geoBox(W + 1.9, 0.22, 0.32, 0, 4.72, D / 2 + 1.9));
  wood.push(geoBox(0.3, 0.22, D + 2.6, W / 2 + 1.35, 4.72, 0.7));
  wood.push(geoBox(0.3, 0.22, D + 2.6, -W / 2 - 1.35, 4.72, 0.7));
  for (const x of [-3.9, -1.3, 1.3, 3.9]) {
    wood.push(geoBox(0.15, 1.0, 0.15, x, 5.18, D / 2 + 1.86));
    wood.push(geoBox(0.15, 1.0, 0.15, x, 5.18, -D / 2 - 0.65));
  }
  wood.push(geoBox(W + 1.6, 0.14, 0.14, 0, 5.78, D / 2 + 1.86));
  wood.push(geoBox(W + 0.9, 0.34, 0.3, 0, 8.45, D / 2 + 0.15));
  wood.push(geoBox(W + 0.9, 0.34, 0.3, 0, 8.45, -D / 2 - 0.15));
  for (const sx of [-1, 1]) {
    wood.push(geoBox(0.42, 8.6, 0.42, sx * (W / 2 + 0.15), 4.9, D / 2 + 0.17));
    wood.push(geoBox(0.42, 8.6, 0.42, sx * (W / 2 + 0.15), 4.9, -D / 2 - 0.17));
    dark.push(geoBox(0.55, 0.42, 0.55, sx * (W / 2 + 0.1), 8.85, D / 2 + 0.2));
  }
  wood.push(geoBox(W + 0.7, 0.38, 0.45, 0, 4.48, D / 2 + 0.05));
  wood.push(geoBox(W + 0.7, 0.38, 0.45, 0, 4.48, -D / 2 - 0.05));
  const roofGeo = curvedRoofGeometry(W + 1.4, D + 1.8, 2.5, 0.55, 4, 3);
  roofGeo.translate(0, 8.62, 0);
  roof.push(roofGeo);
  roof.push(geoBox(W + 2.9, 0.34, 0.42, 0, 11.14, 0));
  roof.push(geoBox(W + 3.0, 0.16, 0.3, 0, 11.05, 0));
  const front = D / 2 + 0.13;
  for (const x of [-2.55, 0, 2.55]) {
    const p = new THREE.PlaneGeometry(1.55, 1.42);
    p.translate(x, 6.5, front);
    win.push(p);
  }
  const door = new THREE.PlaneGeometry(1.55, 2.25);
  door.translate(0, 3.03, D / 2 - 0.23);
  win.push(door);
  for (const sx of [-1, 1]) {
    for (const z of [-1.55, 1.55]) {
      const p = new THREE.PlaneGeometry(1.35, 1.2);
      p.rotateY(sx * Math.PI / 2);
      p.translate(sx * (W / 2 + 0.19), 6.55, z);
      win.push(p);
    }
  }
  for (const sx of [-1, 1]) {
    const body = new THREE.OctahedronGeometry(0.34, 0);
    body.scale(1, 1.25, 1);
    body.translate(sx * 2.9, 7.75, D / 2 + 1.32);
    lantern.push(body);
    lantern.push(geoBox(0.04, 0.6, 0.04, sx * 2.9, 8.35, D / 2 + 1.32));
  }
  return {
    wood: mergeParts(wood),
    dark: mergeParts(dark),
    stone: mergeParts(stone),
    roof: mergeParts(roof),
    window: mergeParts(win),
    lantern: mergeParts(lantern),
  };
}

export function personGeometries() {
  const body = [];
  const silver = [];
  pushColored(body, geoCyl(0.22, 0.27, 0.78, 6, 0, 1.12, 0), 0x2e3f5c);
  pushColored(body, new THREE.SphereGeometry(0.16, 7, 6).translate(0, 1.64, 0), 0xc89c78);
  for (const sx of [-1, 1]) {
    pushColored(body, geoBox(0.15, 0.62, 0.16, sx * 0.12, 0.34, 0), 0x1f2837);
    pushColored(body, geoBox(0.11, 0.56, 0.12, sx * 0.31, 1.14, 0), 0x2b3d59);
  }
  pushColored(body, geoCyl(0.28, 0.44, 0.62, 7, 0, 0.72, 0), 0x26344d);
  const crown = geoCyl(0.2, 0.23, 0.12, 8, 0, 1.83, 0);
  silver.push(crown);
  const spike = geoCyl(0.02, 0.05, 0.24, 5, 0, 1.99, 0);
  silver.push(spike);
  for (const sx of [-1, 1]) {
    silver.push(geoCyl(0.025, 0.025, 0.32, 4, sx * 0.24, 1.75, 0));
  }
  const necklace = new THREE.TorusGeometry(0.19, 0.028, 5, 12);
  necklace.rotateX(Math.PI / 2);
  necklace.translate(0, 1.52, 0.04);
  silver.push(necklace);
  return { body: mergeParts(body), silver: mergeParts(silver) };
}

export function treeGeometries() {
  const trunk = [];
  trunk.push(geoCyl(0.18, 0.32, 2.8, 6, 0, 1.4, 0));
  trunk.push(geoCyl(0.09, 0.16, 2.2, 5, 0.55, 2.5, 0.1).rotateZ(-0.35));
  const canopyA = [];
  const canopyB = [];
  const a = new THREE.IcosahedronGeometry(1.65, 0);
  a.scale(1.05, 0.92, 1.0);
  a.translate(0, 4.25, 0);
  canopyA.push(a);
  const b = new THREE.IcosahedronGeometry(1.18, 0);
  b.scale(1.05, 0.9, 1.0);
  b.translate(0.85, 3.5, 0.25);
  canopyB.push(b);
  const c = new THREE.IcosahedronGeometry(1.0, 0);
  c.scale(1.05, 0.9, 1.05);
  c.translate(-0.75, 3.65, -0.5);
  canopyB.push(c);
  return { trunk: mergeParts(trunk), canopyA: mergeParts(canopyA), canopyB: mergeParts(canopyB) };
}
