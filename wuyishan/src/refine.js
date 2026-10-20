import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mats } from './materials.js';
import { mergedMesh } from './geometry.js';
import { peakDefs } from './peaks.js';
import { terrainHeight, riverCenter, riverHalfWidth, WATER_Y } from './terrain.js';

let seed = 4517;
function rnd() {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
}

const tmpColor = new THREE.Color();

function tint(geo, hex) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const c = new THREE.Color(hex);
  const n = g.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}

function plane(list, w, h, x, y, z, ry, rx = 0) {
  const g = new THREE.PlaneGeometry(w, h);
  if (rx) g.rotateX(rx);
  g.rotateY(ry);
  g.translate(x, y, z);
  list.push(g);
}

function box(list, w, h, d, x, y, z, ry = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (ry) g.rotateY(ry);
  g.translate(x, y, z);
  list.push(g);
}

function cyl(list, rt, rb, h, seg, x, y, z) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  g.translate(x, y, z);
  list.push(g);
}

function peakRadius(def, t) {
  return def.r * (1 - 0.78 * Math.pow(t, 1.25)) * 0.98;
}

function peakY(def, t) {
  return def.base + def.h * (t * t * (3 - 2 * t) * 0.72 + t * 0.28);
}

function riverPeaks() {
  return peakDefs.filter((d) => Math.abs(d.x - riverCenter(d.z)) < 330 && d.r > 13 && d.h > 48);
}

function addStriations(strips, d) {
  const toRiver = Math.atan2(riverCenter(d.z) - d.x, 0);
  const count = 3 + ((rnd() * 5) | 0);
  for (let i = 0; i < count; i++) {
    const a = toRiver + (rnd() - 0.5) * 1.15;
    const t = 0.12 + rnd() * 0.4;
    const rr = peakRadius(d, t) * (1.005 + rnd() * 0.02);
    const h = d.h * (0.14 + rnd() * 0.24);
    const w = 0.6 + rnd() * 2.4;
    const y = peakY(d, t);
    plane(strips, w, h, d.x + Math.sin(a) * rr, y, d.z + Math.cos(a) * rr, a);
    if (rnd() < 0.35) {
      plane(strips, w * 0.5, h * 0.6, d.x + Math.sin(a + 0.06) * rr, y - h * 0.22, d.z + Math.cos(a + 0.06) * rr, a);
    }
  }
}

function addCave(caves, d, stalactites, moss) {
  const a = Math.atan2(riverCenter(d.z) - d.x, 0) + (rnd() - 0.5) * 0.9;
  const t = 0.1 + rnd() * 0.12;
  const rr = peakRadius(d, t) * 0.92;
  const w = 2.4 + rnd() * 5.5;
  const h = 1.8 + rnd() * 4.0;
  const x = d.x + Math.sin(a) * rr;
  const z = d.z + Math.cos(a) * rr;
  const y = peakY(d, t) + h * 0.35;
  const g = new THREE.SphereGeometry(1, 7, 5);
  g.scale(w, h, 0.9);
  g.rotateY(a);
  g.translate(x, y, z);
  caves.push(g);
  for (let i = 0; i < 3; i++) {
    const c = new THREE.ConeGeometry(0.22 + rnd() * 0.3, 0.8 + rnd() * 1.6, 4);
    c.rotateX(Math.PI);
    c.translate(x + (rnd() - 0.5) * w * 0.8, y + h * 0.95, z + (rnd() - 0.5) * 1.2);
    stalactites.push(c);
  }
  for (let i = 0; i < 3; i++) {
    plane(moss, 1.2 + rnd() * 2.2, 0.9 + rnd() * 1.4, x + (rnd() - 0.5) * w * 1.4, Math.max(WATER_Y + 0.2, y - h * 0.9), z + 0.8, a + Math.PI + (rnd() - 0.5) * 0.5, 0.3);
  }
}

function addVines(vines, d) {
  const n = 1 + ((rnd() * 3) | 0);
  for (let i = 0; i < n; i++) {
    const a = Math.atan2(riverCenter(d.z) - d.x, 0) + (rnd() - 0.5) * 1.4;
    const t = 0.24 + rnd() * 0.3;
    const rr = peakRadius(d, t) * 1.012;
    const x = d.x + Math.sin(a) * rr;
    const z = d.z + Math.cos(a) * rr;
    const len = 3.5 + rnd() * 7;
    const y = peakY(d, t) - len * 0.35;
    for (let k = 0; k < 3; k++) {
      const g = new THREE.PlaneGeometry(0.12 + rnd() * 0.16, len * (0.7 + rnd() * 0.4));
      g.rotateY(a + Math.PI / 2 + (rnd() - 0.5) * 0.4);
      g.translate(x + (rnd() - 0.5) * 0.7, y - len * 0.18, z + (rnd() - 0.5) * 0.7);
      vines.push(g);
    }
    for (let k = 0; k < 4; k++) {
      plane(vines, 0.55 + rnd() * 0.5, 0.75 + rnd() * 0.7, x + (rnd() - 0.5) * 1.6, y - rnd() * len * 0.7, z + (rnd() - 0.5) * 1.6, a + (rnd() - 0.5) * 1.2, 0.15);
    }
  }
}

function addPeakLedge(stone, bamboo, leaves, d) {
  const a = Math.atan2(riverCenter(d.z) - d.x, 0) + (rnd() - 0.5) * 1.1;
  const t = 0.2 + rnd() * 0.32;
  const rr = peakRadius(d, t) * 1.01;
  const x = d.x + Math.sin(a) * rr;
  const z = d.z + Math.cos(a) * rr;
  const y = peakY(d, t);
  const arc = 0.8 + rnd() * 1.0;
  const g = new THREE.CylinderGeometry(rr * 0.9, rr * 1.03, 0.5 + d.h * 0.004, 6, 1, true, a - arc / 2, arc);
  g.translate(d.x, y, d.z);
  stone.push(g);
  const n = 2 + ((rnd() * 4) | 0);
  for (let i = 0; i < n; i++) {
    const aa = a + (rnd() - 0.5) * arc;
    const bx = d.x + Math.sin(aa) * rr * 0.98;
    const bz = d.z + Math.cos(aa) * rr * 0.98;
    const h = 2.4 + rnd() * 3.4;
    cyl(bamboo, 0.035, 0.06, h, 4, bx, y + h * 0.5, bz);
    for (let k = 0; k < 3; k++) {
      plane(leaves, 0.35, 0.9, bx + (rnd() - 0.5) * 0.9, y + h - 0.3 - k * 0.5, bz + (rnd() - 0.5) * 0.9, rnd() * Math.PI, 0.35);
    }
  }
}

export const CHIMNEY_SPOTS = [];

function addVillageProps(root) {
  const wood = [];
  const cloth = [];
  const stone = [];
  const straw = [];
  const lantern = [];
  const leaf = [];
  for (let i = 0; i < 6; i++) {
    const z = 398 + i * 39 + rnd() * 12;
    const edge = riverCenter(z) + riverHalfWidth(z);
    const x = edge + 24 + rnd() * 34;
    const base = terrainHeight(x, z);
    if (base < 0.8) continue;
    const len = 7 + rnd() * 6;
    const ry = -Math.PI / 2 + (rnd() - 0.5) * 0.5;
    const h = base + 3.1;
    for (const s of [-1, 1]) {
      cyl(wood, 0.06, 0.08, 3.2, 5, x + Math.cos(ry) * len * 0.5 * s, base + 1.6, z - Math.sin(ry) * len * 0.5 * s);
    }
    box(wood, 0.05, 0.05, len, x, h, z, ry);
    for (let c = 0; c < 5; c++) {
      const u = (c / 4 - 0.5) * len * 0.86;
      const cx = x + Math.cos(ry) * u;
      const cz = z - Math.sin(ry) * u;
      const cw = 0.55 + rnd() * 0.4;
      const ch = 0.8 + rnd() * 0.6;
      const g = new THREE.PlaneGeometry(cw, ch);
      g.rotateY(ry + Math.PI / 2);
      g.translate(cx, h - ch * 0.5 - 0.05, cz);
      cloth.push(g);
    }
    if (i < 4) {
      const cx = x + 2.2;
      const cz = z + 1.8;
      const roofY = base + 6.2;
      box(stone, 0.55, 1.5, 0.55, cx, roofY, cz);
      box(stone, 0.75, 0.14, 0.75, cx, roofY + 0.8, cz);
      CHIMNEY_SPOTS.push({ x: cx, y: roofY + 0.9, z: cz, s: 0.9 + rnd() * 0.4 });
    }
    if (rnd() < 0.5) {
      for (let v = 0; v < 4; v++) {
        const vx = x + (rnd() - 0.5) * 10;
        const vz = z + (rnd() - 0.5) * 8;
        const vh = 2.4 + rnd() * 2.4;
        cyl(wood, 0.04, 0.05, vh, 4, vx, base + vh * 0.5, vz);
        leaf.push(new THREE.PlaneGeometry(0.5, 1.2).rotateY(rnd() * 3).translate(vx, base + vh, vz));
      }
    }
  }
  const zs = [300, 340, 420, 505, 545, 605];
  for (const z of zs) {
    const edge = riverCenter(z) + riverHalfWidth(z);
    const x = edge + 20 + rnd() * 12;
    const base = Math.max(0.9, terrainHeight(x, z));
    if (rnd() < 0.55) {
      box(wood, 1.4, 0.9, 1.0, x, base + 0.45, z, rnd() * 2);
      box(wood, 1.3, 0.1, 0.9, x, base + 0.92, z, rnd() * 2);
      box(straw, 1.2, 0.2, 0.8, x, base + 1.0, z, rnd() * 2);
    }
    if (rnd() < 0.5) {
      cyl(wood, 0.4, 0.48, 0.75, 8, x + 2, base + 0.38, z + 1.5);
      cyl(straw, 0.46, 0.46, 0.1, 8, x + 2, base + 0.78, z + 1.5);
    }
    if (rnd() < 0.4) {
      const l = new THREE.BoxGeometry(0.32, 0.46, 0.32);
      l.translate(x - 1.4, base + 2.4, z + 1);
      lantern.push(l);
      cyl(wood, 0.05, 0.06, 2.4, 4, x - 1.4, base + 1.2, z + 1);
    }
  }
  const wm = mergedMesh(wood, mats.wood, true, true);
  const cm = mergedMesh(cloth, mats.boat, true, true);
  const sm = mergedMesh(stone, mats.stone, true, true);
  const stm = mergedMesh(straw, mats.straw, true, true);
  const lm = mergedMesh(lantern, mats.lantern, false, false);
  const lfm = mergedMesh(leaf, mats.leaf, false, true);
  for (const m of [wm, cm, sm, stm, lm, lfm]) if (m) root.add(m);
}

export const LOTUS_SPOTS = [];
export const RIPPLE_SPOTS = [];

function addBambooStatic(bamboo, leaves, x, z, count = 8, scale = 1) {
  const base = terrainHeight(x, z);
  if (base < 0.8) return;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + rnd();
    const rad = rnd() * 2.2 * scale;
    const bx = x + Math.cos(a) * rad;
    const bz = z + Math.sin(a) * rad;
    const h = (4.5 + rnd() * 5.5) * scale;
    cyl(bamboo, 0.04, 0.075, h, 4, bx, base + h * 0.5, bz);
    for (let k = 0; k < 3; k++) {
      plane(leaves, 0.4 * scale, 1.0 * scale, bx + (rnd() - 0.5) * 1.4, base + h - 0.4 - rnd() * 1.4, bz + (rnd() - 0.5) * 1.4, rnd() * Math.PI, 0.4 + rnd() * 0.3);
    }
  }
}

function addShoals(root) {
  const moss = [];
  for (let z = -880; z <= 900; z += 23) {
    const c = riverCenter(z);
    const w = riverHalfWidth(z);
    for (const side of [-1, 1]) {
      if (rnd() > 0.42) continue;
      const x = c + side * (w - 7 - rnd() * 11);
      const h = terrainHeight(x, z);
      if (h > WATER_Y - 0.05 || h < WATER_Y - 1.6) continue;
      const rr = 2.2 + rnd() * 5.4;
      const g = new THREE.IcosahedronGeometry(rr, 0);
      g.scale(1.7, 0.16, 0.85);
      g.rotateY(rnd() * 6.28);
      g.translate(x, WATER_Y - 0.02, z + (rnd() - 0.5) * 6);
      tint(g, rnd() < 0.5 ? 0xb7ad8b : 0xc7be9d);
      const m = new THREE.Mesh(g, mats.rice);
      m.receiveShadow = true;
      root.add(m);
      if (rnd() < 0.55) {
        for (let k = 0; k < 3; k++) {
          plane(moss, 1.2 + rnd() * 2.2, 0.8 + rnd() * 1.3, x + (rnd() - 0.5) * rr * 1.6, WATER_Y + 0.06, z + (rnd() - 0.5) * rr, rnd() * 3.14, -Math.PI / 2);
        }
      }
      RIPPLE_SPOTS.push({ x, z, r: rr });
      if (rnd() < 0.55) {
        LOTUS_SPOTS.push({ x: x + (rnd() - 0.5) * rr, z: z + (rnd() - 0.5) * rr * 0.8, flower: rnd() < 0.45, s: 0.7 + rnd() * 0.8 });
      }
    }
  }
  const mm = mergedMesh(moss, mats.leaf, false, true);
  if (mm) root.add(mm);
}

export function buildRefineDetails(root) {
  const strips = [];
  const caves = [];
  const stalactites = [];
  const moss = [];
  const vines = [];
  const stone = [];
  const bamboo = [];
  const leaves = [];
  for (const d of riverPeaks()) {
    if (rnd() < 0.85) addStriations(strips, d);
    if (rnd() < 0.55) addCave(caves, d, stalactites, moss);
    if (rnd() < 0.6) addVines(vines, d);
    if (rnd() < 0.5) addPeakLedge(stone, bamboo, leaves, d);
  }
  const sm = mergedMesh(strips, mats.cliff, false, true);
  const cm = mergedMesh(caves, mats.boat, false, false);
  const tm = mergedMesh(stalactites, mats.stone, false, false);
  const mm = mergedMesh(moss, mats.leaf, false, true);
  const vm = mergedMesh(vines, mats.leaf, false, true);
  const lm = mergedMesh(stone, mats.stone, true, true);
  const bm = mergedMesh(bamboo, mats.bamboo, true, true);
  const lfm = mergedMesh(leaves, mats.leaf, false, true);
  for (const m of [sm, cm, tm, mm, vm, lm, bm, lfm]) if (m) root.add(m);
  addReflections(root);
  addShoals(root);
  addVillageProps(root);
  addShoreTeaProps(root);
}

function addShoreTeaProps(root) {
  const stone = [];
  const wood = [];
  const straw = [];
  const leaf = [];
  const z0 = 486;
  const c = riverCenter(z0);
  const w = riverHalfWidth(z0);
  for (let i = 0; i < 7; i++) {
    const z = z0 - 42 + i * 13;
    const x = c + w + 18 + (i % 3) * 7;
    const base = terrainHeight(x, z);
    if (base < 1) continue;
    if (i % 2 === 0) {
      box(stone, 1.8, 1.2, 1.0, x, base + 0.6, z, rnd() * 0.4);
      box(stone, 2.2, 0.18, 1.3, x, base + 1.25, z, rnd() * 0.4);
    } else {
      cyl(wood, 0.46, 0.52, 0.82, 8, x, base + 0.42, z);
      cyl(straw, 0.52, 0.52, 0.1, 8, x, base + 0.86, z);
      for (let k = 0; k < 4; k++) {
        const bx = x + (rnd() - 0.5) * 3.2;
        const bz = z + (rnd() - 0.5) * 2.4;
        const bh = 0.6 + rnd() * 0.5;
        plane(leaf, 0.4, bh, bx, base + bh * 0.5, bz, rnd() * 3.14, 0.2);
      }
    }
  }
  for (const [arr, mat] of [[stone, mats.stone], [wood, mats.wood], [straw, mats.straw], [leaf, mats.leaf]]) {
    const m = mergedMesh(arr, mat, true, true);
    if (m) root.add(m);
  }
}


let reflectTex = null;
function makeReflectionTexture() {
  if (reflectTex) return reflectTex;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 256;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 128, 4, 64, 128, 126);
  grd.addColorStop(0, 'rgba(20,52,45,0.62)');
  grd.addColorStop(0.55, 'rgba(24,58,50,0.32)');
  grd.addColorStop(1, 'rgba(26,60,52,0)');
  g.fillStyle = grd;
  g.save();
  g.translate(64, 128);
  g.scale(1, 0.62);
  g.beginPath();
  g.arc(0, 0, 126, 0, Math.PI * 2);
  g.fill();
  g.restore();
  reflectTex = new THREE.CanvasTexture(c);
  reflectTex.colorSpace = THREE.SRGBColorSpace;
  return reflectTex;
}

function addReflections(root) {
  const geos = [];
  for (const d of riverPeaks()) {
    const dist = Math.abs(d.x - riverCenter(d.z));
    if (dist < 30 || dist > 235) continue;
    const side = Math.sign(riverCenter(d.z) - d.x) || 1;
    const length = Math.min(34, 12 + d.h * 0.09);
    const width = Math.min(38, d.r * 1.25);
    const cx = d.x + side * (d.r * 0.55 + length * 0.28);
    const cz = d.z + (rnd() - 0.5) * d.r * 0.5;
    const g = new THREE.PlaneGeometry(width, length);
    g.rotateX(-Math.PI / 2);
    g.rotateY(Math.PI / 2);
    g.translate(cx, WATER_Y + 0.062, cz);
    geos.push(g);
  }
  if (!geos.length) return;
  const geo = mergeGeometries(geos, false);
  geos.forEach((g) => g.dispose());
  const mat = new THREE.MeshBasicMaterial({
    map: makeReflectionTexture(),
    color: 0xa9c6bb,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 2;
  mesh.frustumCulled = false;
  root.add(mesh);
}

function makeSmokeMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    transparent: true,
    depthWrite: false,
    vertexShader: `
      uniform float uTime;
      attribute vec3 aBase;
      attribute float aSeed;
      attribute float aSize;
      varying float vAlpha;
      void main() {
        float life = fract(uTime * 0.11 + aSeed);
        vec3 p = aBase;
        p.y += life * 11.0;
        p.x += sin(uTime * 0.55 + aSeed * 19.0 + life * 4.0) * (0.5 + life * 2.2);
        p.z += cos(uTime * 0.42 + aSeed * 23.0 + life * 3.2) * (0.4 + life * 1.8);
        vAlpha = smoothstep(0.0, 0.12, life) * (1.0 - life);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = aSize * (1.0 + life * 1.8) * (300.0 / max(1.0, -mv.z));
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      varying float vAlpha;
      void main() {
        vec2 d = gl_PointCoord - 0.5;
        float r = dot(d, d);
        if (r > 0.25) discard;
        float a = smoothstep(0.25, 0.02, r) * vAlpha * 0.2;
        gl_FragColor = vec4(0.82, 0.84, 0.82, a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
}

function lotusGeometry() {
  const parts = [];
  const pad = new THREE.CylinderGeometry(0.52, 0.52, 0.035, 10);
  parts.push(tint(pad, 0x4e7247));
  const under = new THREE.CylinderGeometry(0.28, 0.34, 0.06, 8);
  under.translate(0, -0.02, 0);
  parts.push(tint(under, 0x395a3a));
  const stem = new THREE.CylinderGeometry(0.025, 0.04, 0.28, 4);
  stem.translate(0, 0.16, 0);
  parts.push(tint(stem, 0x62824a));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const petal = new THREE.ConeGeometry(0.11, 0.34, 4);
    petal.rotateZ(0.55);
    petal.rotateY(a);
    petal.translate(Math.cos(a) * 0.11, 0.36, Math.sin(a) * 0.11);
    parts.push(tint(petal, i % 2 ? 0xe8b7c2 : 0xf0cbd3));
  }
  const heart = new THREE.SphereGeometry(0.07, 6, 4);
  heart.translate(0, 0.4, 0);
  parts.push(tint(heart, 0xe6c25d));
  const geo = mergeGeometries(parts, false);
  parts.forEach((g) => g.dispose());
  return geo;
}

function cormorantGeometry() {
  const parts = [];
  const body = new THREE.SphereGeometry(0.28, 7, 5);
  body.scale(1.7, 0.82, 0.95);
  parts.push(body);
  const neck = new THREE.CylinderGeometry(0.055, 0.085, 0.62, 5);
  neck.rotateZ(-0.18);
  neck.translate(0.36, 0.35, 0);
  parts.push(neck);
  const head = new THREE.SphereGeometry(0.11, 6, 4);
  head.translate(0.47, 0.69, 0);
  parts.push(head);
  const beak = new THREE.ConeGeometry(0.05, 0.3, 4);
  beak.rotateZ(-Math.PI / 2);
  beak.translate(0.68, 0.67, 0);
  parts.push(beak);
  for (const sz of [-1, 1]) {
    const wing = new THREE.BoxGeometry(0.55, 0.04, 0.3);
    wing.rotateZ(-0.2);
    wing.translate(-0.02, 0.12, sz * 0.24);
    parts.push(wing);
  }
  const geo = mergeGeometries(parts, false);
  parts.forEach((g) => g.dispose());
  return geo;
}

function fishGeometry() {
  const parts = [];
  const body = new THREE.SphereGeometry(0.2, 6, 4);
  body.scale(2.2, 0.7, 0.8);
  parts.push(body);
  const tail = new THREE.ConeGeometry(0.18, 0.42, 4);
  tail.rotateZ(Math.PI / 2);
  tail.translate(-0.5, 0, 0);
  parts.push(tail);
  const fin = new THREE.ConeGeometry(0.08, 0.2, 4);
  fin.rotateX(Math.PI / 2);
  fin.translate(0, 0.13, 0);
  parts.push(fin);
  const geo = mergeGeometries(parts, false);
  parts.forEach((g) => g.dispose());
  return geo;
}

export function createRefineLife() {
  const group = new THREE.Group();
  const dummy = new THREE.Object3D();

  const leafGeo = new THREE.PlaneGeometry(0.16, 0.62);
  leafGeo.rotateX(-Math.PI / 2);
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x8e9c56, roughness: 0.86, side: THREE.DoubleSide });
  const leaves = new THREE.InstancedMesh(leafGeo, leafMat, 150);
  leaves.frustumCulled = false;
  group.add(leaves);
  const leafData = [];
  for (let i = 0; i < 150; i++) {
    leafData.push({
      z0: rnd() * 2000,
      off: (rnd() - 0.5) * 78,
      speed: 2.4 + rnd() * 5.6,
      rot: rnd() * Math.PI * 2,
      spin: (rnd() - 0.5) * 0.8,
      phase: rnd() * 10,
      scale: 0.65 + rnd() * 0.9,
    });
  }

  const lotusSpots = LOTUS_SPOTS.slice(0, 46);
  const lotus = new THREE.InstancedMesh(
    lotusGeometry(),
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: THREE.DoubleSide }),
    Math.max(1, lotusSpots.length)
  );
  lotus.frustumCulled = false;
  group.add(lotus);
  const lotusData = lotusSpots.map((s) => ({ ...s, phase: rnd() * 9, spin: (rnd() - 0.5) * 0.35 }));

  const cormorants = new THREE.InstancedMesh(
    cormorantGeometry(),
    new THREE.MeshStandardMaterial({ color: 0x222a29, roughness: 0.66 }),
    9
  );
  cormorants.castShadow = false;
  cormorants.frustumCulled = false;
  group.add(cormorants);
  const birdData = [];
  for (let i = 0; i < 9; i++) {
    const z = -360 + i * 155 + rnd() * 60;
    birdData.push({
      z,
      off: (rnd() - 0.5) * 46,
      phase: rnd() * 12,
      speed: 0.45 + rnd() * 0.5,
      scale: 0.8 + rnd() * 0.5,
      dive: rnd() < 0.5,
    });
  }

  const fish = new THREE.InstancedMesh(
    fishGeometry(),
    new THREE.MeshStandardMaterial({ color: 0x45605c, roughness: 0.5 }),
    22
  );
  fish.frustumCulled = false;
  group.add(fish);
  const fishData = [];
  for (let i = 0; i < 22; i++) {
    const z = -720 + rnd() * 1450;
    fishData.push({
      z,
      off: (rnd() - 0.5) * 50,
      period: 7 + rnd() * 8,
      phase: rnd(),
      dir: rnd() < 0.5 ? -1 : 1,
      scale: 0.7 + rnd() * 0.7,
    });
  }

  const smokeMat = makeSmokeMaterial();
  const smokePos = [];
  const smokeSeed = [];
  const smokeSize = [];
  for (const c of CHIMNEY_SPOTS) {
    for (let i = 0; i < 20; i++) {
      smokePos.push(c.x + (rnd() - 0.5) * 0.4, c.y + rnd() * 0.3, c.z + (rnd() - 0.5) * 0.4);
      smokeSeed.push(rnd());
      smokeSize.push((2.8 + rnd() * 3.4) * c.s);
    }
  }
  const smokeGeo = new THREE.BufferGeometry();
  smokeGeo.setAttribute('position', new THREE.Float32BufferAttribute(smokePos, 3));
  smokeGeo.setAttribute('aBase', new THREE.Float32BufferAttribute(smokePos, 3));
  smokeGeo.setAttribute('aSeed', new THREE.Float32BufferAttribute(smokeSeed, 1));
  smokeGeo.setAttribute('aSize', new THREE.Float32BufferAttribute(smokeSize, 1));
  const smoke = new THREE.Points(smokeGeo, smokeMat);
  smoke.frustumCulled = false;
  group.add(smoke);

  function updateLeaves(time) {
    for (let i = 0; i < leafData.length; i++) {
      const d = leafData[i];
      const z = ((d.z0 + time * d.speed) % 2000) - 1000;
      const x = riverCenter(z) + d.off + Math.sin(time * 0.35 + d.phase) * 1.2;
      dummy.position.set(x, WATER_Y + 0.035 + Math.sin(time * 0.7 + d.phase) * 0.012, z);
      dummy.rotation.set(0, d.rot + time * d.spin, 0);
      dummy.scale.setScalar(d.scale);
      dummy.updateMatrix();
      leaves.setMatrixAt(i, dummy.matrix);
    }
    leaves.instanceMatrix.needsUpdate = true;
  }

  function updateLotus(time) {
    for (let i = 0; i < lotusData.length; i++) {
      const d = lotusData[i];
      dummy.position.set(d.x, WATER_Y + 0.045 + Math.sin(time * 0.8 + d.phase) * 0.035, d.z);
      dummy.rotation.set(0, d.phase + time * d.spin, 0);
      dummy.scale.setScalar(d.s);
      dummy.updateMatrix();
      lotus.setMatrixAt(i, dummy.matrix);
    }
    lotus.instanceMatrix.needsUpdate = true;
  }

  function updateBirds(time) {
    for (let i = 0; i < birdData.length; i++) {
      const d = birdData[i];
      const x = riverCenter(d.z + Math.sin(time * 0.12 + d.phase) * 10) + d.off + Math.sin(time * 0.25 + d.phase) * 7;
      let y = WATER_Y + 0.24 + Math.sin(time * d.speed + d.phase) * 0.06;
      if (d.dive) {
        const u = Math.sin(time * 0.18 + d.phase);
        y -= Math.max(0, u - 0.55) * 2.4;
      }
      dummy.position.set(x, y, d.z + Math.sin(time * 0.12 + d.phase) * 10);
      dummy.rotation.set(0, d.phase + Math.sin(time * 0.2 + d.phase) * 0.5, Math.sin(time * d.speed + d.phase) * 0.04);
      dummy.scale.setScalar(d.scale);
      dummy.updateMatrix();
      cormorants.setMatrixAt(i, dummy.matrix);
    }
    cormorants.instanceMatrix.needsUpdate = true;
  }

  function updateFish(time) {
    for (let i = 0; i < fishData.length; i++) {
      const d = fishData[i];
      const u = ((time / d.period + d.phase) % 1);
      if (u < 0.16) {
        const t = u / 0.16;
        const baseZ = d.z + t * 3.2 * d.dir;
        const x = riverCenter(baseZ) + d.off + Math.sin(t * Math.PI) * 1.1;
        const y = WATER_Y + 0.03 + Math.sin(t * Math.PI) * (1.1 + d.scale * 0.7);
        dummy.position.set(x, y, baseZ);
        dummy.rotation.set(0, d.dir * Math.PI / 2, -0.4 + Math.sin(t * Math.PI) * 0.8);
        dummy.scale.setScalar(d.scale);
      } else {
        dummy.position.set(0, -30, 0);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.setScalar(0);
      }
      dummy.updateMatrix();
      fish.setMatrixAt(i, dummy.matrix);
    }
    fish.instanceMatrix.needsUpdate = true;
  }

  updateLeaves(0);
  updateLotus(0);
  updateBirds(0);
  updateFish(0);

  return {
    group,
    update(time) {
      smokeMat.uniforms.uTime.value = time;
      updateLeaves(time);
      updateLotus(time);
      updateBirds(time);
      updateFish(time);
    },
  };
}
