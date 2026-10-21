import * as THREE from 'three';
import { terrainHeight } from './terrain.js';

const snowMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0 });
const ridgeMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 });

function createSnowPeak(cx, cz, radius, height, seed, sharpness = 1) {
  const base = Math.max(4, terrainHeight(cx, cz)) - 6;
  const seg = 34;
  const rings = 17;
  const positions = [];
  const colors = [];
  const uvs = [];
  const indices = [];
  const rock = new THREE.Color(0x697477);
  const rockDark = new THREE.Color(0x4d5a60);
  const rockLight = new THREE.Color(0x879296);
  const snow = new THREE.Color(0xf4f8f8);
  const snowShade = new THREE.Color(0xc6d9e0);
  const c = new THREE.Color();
  for (let k = 0; k <= rings; k++) {
    const t = k / rings;
    const profile = Math.pow(1 - t, 1.15 * sharpness);
    const y = base + height * Math.pow(t, 0.93);
    for (let j = 0; j < seg; j++) {
      const a = (j / seg) * Math.PI * 2;
      const ridge = 1 + 0.16 * Math.sin(a * 3 + seed) + 0.08 * Math.sin(a * 7 - t * 4.2) + 0.045 * Math.sin(a * 13 + seed * 2.3);
      const ringR = radius * profile * ridge * (0.93 + 0.1 * Math.sin(t * 11 + seed));
      const px = cx + Math.cos(a) * ringR;
      const pz = cz + Math.sin(a) * ringR * 0.86;
      const py = y + Math.sin(a * 5 + seed + t * 7) * height * 0.012 * (1 - t);
      positions.push(px, py, pz);
      uvs.push((j / seg) * 3, t * 3);
      const snowLine = 0.42 + 0.08 * Math.sin(a * 4.5 + seed) + 0.05 * Math.sin(t * 15);
      if (t > snowLine) {
        const mixv = Math.min(1, (t - snowLine) / 0.24);
        c.copy(snowShade).lerp(snow, mixv * 0.92 + 0.08);
      } else {
        c.copy(rockDark).lerp(rock, 0.4 + 0.38 * Math.sin(a * 6 + t * 5));
        c.lerp(rockLight, 0.2 * Math.max(0, Math.sin(a * 11 - seed)));
      }
      const shade = 0.88 + 0.12 * Math.sin(a * 2.3 + seed);
      colors.push(c.r * shade, c.g * shade, c.b * shade);
    }
  }
  for (let k = 0; k < rings; k++) {
    for (let j = 0; j < seg; j++) {
      const j2 = (j + 1) % seg;
      const a = k * seg + j;
      const b = k * seg + j2;
      const d = (k + 1) * seg + j;
      const e = (k + 1) * seg + j2;
      indices.push(a, d, b, b, d, e);
    }
  }
  const top = positions.length / 3;
  positions.push(cx, base + height, cz);
  uvs.push(0.5, 0.5);
  colors.push(snow.r, snow.g, snow.b);
  for (let j = 0; j < seg; j++) {
    indices.push(rings * seg + j, top, rings * seg + ((j + 1) % seg));
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, snowMat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function createSnowPeaks() {
  const group = new THREE.Group();
  const defs = [
    [-300, -470, 205, 330, 1.2, 1.0],
    [215, -560, 180, 302, 3.4, 0.95],
    [-20, -680, 245, 388, 5.1, 1.05],
    [420, -380, 158, 252, 2.2, 0.9],
    [-470, -250, 150, 226, 4.7, 0.9],
  ];
  for (const [x, z, r, h, s, sharp] of defs) group.add(createSnowPeak(x, z, r, h, s, sharp));
  return group;
}

export function createDistantRidge() {
  const group = new THREE.Group();
  const positions = [];
  const colors = [];
  const indices = [];
  const c = new THREE.Color();
  const dark = new THREE.Color(0x596a6b);
  const pale = new THREE.Color(0x82918e);
  const snow = new THREE.Color(0xc8d6d8);
  const sides = 150;
  const rings = 4;
  for (let k = 0; k <= rings; k++) {
    const t = k / rings;
    for (let i = 0; i <= sides; i++) {
      const a = (i / sides) * Math.PI * 2;
      const rad = 1080 - t * 260;
      const jag = 1 + 0.08 * Math.sin(a * 7.0 + 1.3) + 0.05 * Math.sin(a * 17.0 - 0.6);
      const top = 116 + 82 * Math.pow(Math.max(0, Math.sin(a * 3.0 + 0.8)), 2) + 42 * Math.sin(a * 11 + 2);
      const y = t * top * jag;
      positions.push(Math.cos(a) * rad, y - 20, Math.sin(a) * rad - 40);
      c.copy(dark).lerp(pale, 0.18 + t * 0.55);
      if (t > 0.68) c.lerp(snow, (t - 0.68) / 0.32 * 0.6);
      colors.push(c.r, c.g, c.b);
    }
  }
  for (let k = 0; k < rings; k++) {
    for (let i = 0; i < sides; i++) {
      const a = k * (sides + 1) + i;
      const b = a + 1;
      const d = (k + 1) * (sides + 1) + i;
      const e = d + 1;
      indices.push(a, d, b, b, d, e);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, ridgeMat);
  mesh.receiveShadow = true;
  group.add(mesh);
  return group;
}
