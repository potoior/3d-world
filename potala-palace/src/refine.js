import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mats } from './materials.js';

let seed = 7719;
function rnd() {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
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

function sphere(list, r, x, y, z, sx = 1, sy = 1, sz = 1) {
  const g = new THREE.SphereGeometry(r, 7, 5);
  g.scale(sx, sy, sz);
  g.translate(x, y, z);
  list.push(g);
}

const WHITE_JOINTS = { list: [], z: 78.44, x0: 46, x1: 181, y0: 55.2, y1: 94.6, ry: 0 };
const RED_JOINTS = { list: [], z: 74.46, x0: -57, x1: 43, y0: 56.4, y1: 113.6, ry: 0 };

function masonryFace(def, materialList, course = 2.15, offset = 0) {
  let row = 0;
  for (let y = def.y0; y <= def.y1; y += course, row++) {
    let x = def.x0;
    while (x < def.x1) {
      const len = Math.min(def.x1 - x, 2.1 + rnd() * 5.4);
      const gap = 0.1 + rnd() * 0.34;
      box(materialList, len, 0.055, 0.07, x + len * 0.5, y, def.z + offset);
      x += len + gap;
    }
    let vx = def.x0 + (row % 2 ? 1.3 : 3.2) + rnd() * 1.4;
    while (vx < def.x1) {
      box(materialList, 0.055, course * (0.72 + rnd() * 0.24), 0.07, vx, y + course * 0.5, def.z + offset);
      vx += 2.8 + rnd() * 5.6;
    }
  }
}

function addDrips(list, count, z, x0, x1, y0, y1) {
  for (let i = 0; i < count; i++) {
    const x = x0 + rnd() * (x1 - x0);
    const y = y0 + rnd() * (y1 - y0);
    const len = 0.7 + rnd() * 2.6;
    const w = 0.09 + rnd() * 0.2;
    box(list, w, len, 0.055, x, y - len * 0.5, z + rnd() * 0.03);
    if (rnd() < 0.45) {
      box(list, w * 1.8, 0.08, 0.06, x + (rnd() - 0.5) * 0.16, y - len, z + 0.01);
    }
  }
}

function addWeatherPatches(list, count, z, x0, x1, y0, y1) {
  for (let i = 0; i < count; i++) {
    const w = 0.35 + rnd() * 1.8;
    const h = 0.2 + rnd() * 0.9;
    box(list, w, h, 0.035, x0 + rnd() * (x1 - x0), y0 + rnd() * (y1 - y0), z + 0.02);
  }
}

function addWindowSurrounds(list, z, x0, x1, rows, cols, w, h) {
  for (const y of rows) {
    for (let i = 0; i < cols; i++) {
      const x = x0 + (i / (cols - 1)) * (x1 - x0);
      box(list, w + 0.9, 0.14, 0.11, x, y + h * 0.5, z);
      box(list, w + 0.9, 0.14, 0.11, x, y - h * 0.5, z);
      box(list, 0.14, h, 0.11, x - w * 0.5 - 0.38, y, z);
      box(list, 0.14, h, 0.11, x + w * 0.5 + 0.38, y, z);
      if (rnd() < 0.55) {
        box(list, w + 1.1, 0.12, 0.42, x, y + h * 0.5 + 0.48, z + 0.12);
      }
    }
  }
}

function addDoorFrame(wood, trim, gold, x, y, z, w, h, ry = 0) {
  const nx = Math.sin(ry);
  const nz = Math.cos(ry);
  for (const s of [-1, 1]) {
    const u = s * (w * 0.5 + 0.42);
    box(wood, 0.38, h + 1.1, 0.5, x + Math.cos(ry) * u + nx * 0.22, y + h * 0.5, z - Math.sin(ry) * u + nz * 0.22, ry);
    box(trim, 0.18, h + 0.8, 0.58, x + Math.cos(ry) * (u - s * 0.24) + nx * 0.28, y + h * 0.5, z - Math.sin(ry) * (u - s * 0.24) + nz * 0.28, ry);
    for (let i = 0; i < 4; i++) {
      box(gold, 0.12, 0.12, 0.12, x + Math.cos(ry) * u + nx * 0.34, y + 0.65 + i * (h - 1.3) / 3, z - Math.sin(ry) * u + nz * 0.34, ry);
    }
  }
  box(wood, w + 1.6, 0.42, 0.62, x + nx * 0.22, y + h + 0.55, z + nz * 0.22, ry);
  box(trim, w + 1.9, 0.16, 0.72, x + nx * 0.28, y + h + 0.83, z + nz * 0.28, ry);
  box(gold, w + 1.35, 0.1, 0.78, x + nx * 0.3, y + h + 1.0, z + nz * 0.3, ry);
  box(trim, w + 0.2, 0.22, 0.9, x + nx * 0.34, y + 0.1, z + nz * 0.34, ry);
}

function addBalcony(wood, ochre, gold, ax, az, bx, bz, y, gap = 0) {
  const dx = bx - ax;
  const dz = bz - az;
  const len = Math.hypot(dx, dz);
  const n = Math.max(2, Math.round(len / 2.5));
  const ry = Math.atan2(dx, dz);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    if (gap && Math.abs(t - 0.5) < gap) continue;
    const x = ax + dx * t;
    const z = az + dz * t;
    box(wood, 0.26, 1.2, 0.26, x, y + 0.6, z, ry);
    sphere(gold, 0.2, x, y + 1.3, z);
  }
  const seg = (t0, t1) => {
    const x0 = ax + dx * t0;
    const z0 = az + dz * t0;
    const x1 = ax + dx * t1;
    const z1 = az + dz * t1;
    const ml = Math.hypot(x1 - x0, z1 - z0);
    box(ochre, 0.2, 0.16, ml, (x0 + x1) / 2, y + 1.18, (z0 + z1) / 2, Math.atan2(x1 - x0, z1 - z0));
    box(ochre, 0.14, 0.11, ml, (x0 + x1) / 2, y + 0.55, (z0 + z1) / 2, Math.atan2(x1 - x0, z1 - z0));
    box(gold, 0.26, 0.08, ml, (x0 + x1) / 2, y + 1.31, (z0 + z1) / 2, Math.atan2(x1 - x0, z1 - z0));
  };
  if (gap) {
    seg(0, 0.5 - gap);
    seg(0.5 + gap, 1);
  } else {
    seg(0, 1);
  }
}

export const WHEEL_ROW = [];
for (let i = 0; i < 11; i++) {
  WHEEL_ROW.push({ x: 102 + i * 5.2, y: 44.16, z: 169.2 });
}

export const LAMP_NICHES = [];
for (let i = 0; i < 10; i++) {
  LAMP_NICHES.push({ x: 58 + i * 12.2, y: 55.2, z: 78.7 });
}
for (let i = 0; i < 6; i++) {
  LAMP_NICHES.push({ x: 91 + i * 4.3, y: 44.2, z: 176.6, ry: Math.PI });
}

export const INCENSE_SPOTS = [
  { x: 118, y: 44.2, z: 130 },
  { x: 151, y: 44.2, z: 157 },
  { x: 110, y: 54.2, z: 86 },
];

function addYak(dark, horn, x, y, z, ry, s) {
  const tx = (ox, oz) => [x + Math.cos(ry) * ox * s - Math.sin(ry) * oz * s, z + Math.sin(ry) * ox * s + Math.cos(ry) * oz * s];
  const body = [x, y + 1.55 * s, z];
  const g = new THREE.SphereGeometry(1, 7, 5);
  g.scale(2.0 * s, 0.92 * s, 1.05 * s);
  g.rotateY(ry);
  g.translate(body[0], body[1], body[2]);
  dark.push(g);
  const hx = tx(1.5, 0);
  const head = new THREE.SphereGeometry(0.55 * s, 6, 4);
  head.scale(0.9, 0.82, 1.0);
  head.translate(hx[0], y + 1.72 * s, hx[1]);
  dark.push(head);
  for (const sz of [-1, 1]) {
    const hp = tx(1.75, sz * 0.34);
    const cone = new THREE.ConeGeometry(0.1 * s, 0.9 * s, 5);
    cone.rotateZ(-0.75);
    cone.translate(hp[0], y + 2.05 * s, hp[1]);
    horn.push(cone);
    const lp = tx(1.72, sz * 0.62);
    const ear = new THREE.ConeGeometry(0.09 * s, 0.3 * s, 4);
    ear.rotateX(sz * 0.8);
    ear.translate(lp[0], y + 1.87 * s, lp[1]);
    dark.push(ear);
  }
  for (const ox of [-0.95, 0.95]) {
    for (const oz of [-0.52, 0.52]) {
      const p = tx(ox, oz);
      cyl(dark, 0.13 * s, 0.16 * s, 1.35 * s, 5, p[0], y + 0.67 * s, p[1]);
    }
  }
  const tail = tx(-1.5, 0.04);
  cyl(dark, 0.06 * s, 0.11 * s, 1.25 * s, 4, tail[0], y + 1.05 * s, tail[1]);
}

export function buildRefineDetails() {
  const root = new THREE.Group();
  const dark = [];
  const pale = [];
  const red = [];
  const wood = [];
  const ochre = [];
  const gold = [];
  const stone = [];
  const copper = [];
  const lantern = [];
  const foliage = [];

  masonryFace(WHITE_JOINTS, dark);
  masonryFace(RED_JOINTS, red, 2.55);
  addDrips(pale, 100, 78.52, 50, 178, 57, 93);
  addDrips(pale, 50, 78.52, -178, -84, 58, 88);
  addDrips(pale, 40, 74.52, -54, 40, 58, 112);
  addWeatherPatches(dark, 40, 78.5, 50, 178, 58, 92);
  addWeatherPatches(dark, 26, 78.5, -180, -84, 58, 88);

  const weRows = [];
  for (let i = 0; i < 8; i++) weRows.push(57.4 + i * 4.55);
  addWindowSurrounds(dark, 78.5, 52, 174, weRows, 13, 4.1, 3.0);
  const rRows = [];
  for (let i = 0; i < 13; i++) rRows.push(59.3 + i * 3.92);
  addWindowSurrounds(red, 74.52, -52, 38, rRows, 9, 4.15, 2.82);

  for (const row of weRows) {
    for (let i = 0; i < 13; i++) {
      const x = 52 + (i / 12) * 122;
      if (Math.abs(x - 82) < 5 || Math.abs(x - 160) < 4) continue;
      box(wood, 5.7, 0.22, 0.34, x, row + 3.42, 78.58);
      box(ochre, 0.16, 0.5, 0.14, x - 2.55, row + 3.25, 78.68);
      box(ochre, 0.16, 0.5, 0.14, x + 2.55, row + 3.25, 78.68);
    }
  }
  for (const row of rRows) {
    for (let i = 0; i < 9; i++) {
      const x = -52 + (i / 8) * 90;
      if (Math.abs(x + 7) < 6) continue;
      box(wood, 5.6, 0.2, 0.3, x, row + 3.28, 74.62);
      box(ochre, 0.14, 0.44, 0.13, x - 2.4, row + 3.12, 74.7);
      box(ochre, 0.14, 0.44, 0.13, x + 2.4, row + 3.12, 74.7);
    }
  }

  addDoorFrame(wood, red, gold, 82, 54.2, 78.35, 7, 8.6, 0);
  addDoorFrame(wood, red, gold, 160, 54.2, 78.35, 5, 6.4, 0);
  addDoorFrame(wood, red, gold, -7, 64.2, 74.85, 10.5, 9.4, 0);
  addDoorFrame(wood, red, gold, 127, 44.2, 96.4, 8.4, 7.2, Math.PI);
  addDoorFrame(wood, red, gold, 82.2, 44.2, 143, 5.4, 6.4, Math.PI / 2);
  addDoorFrame(wood, red, gold, 171.8, 44.2, 143, 5.4, 6.4, -Math.PI / 2);

  addBalcony(wood, ochre, gold, 55, 78.1, 170, 78.1, 96.55, 0.12);
  addBalcony(wood, ochre, gold, -180, 78.1, -84, 78.1, 90.55, 0.14);
  addBalcony(wood, ochre, gold, -54, 73.8, 40, 73.8, 116.55, 0.18);
  addBalcony(wood, ochre, gold, 60, 95.3, 182, 95.3, 54.85, 0.08);

  for (const w of WHEEL_ROW) {
    cyl(wood, 0.12, 0.18, 1.55, 6, w.x, w.y + 0.78, w.z);
    cyl(copper, 0.4, 0.48, 0.18, 8, w.x, w.y + 0.12, w.z);
    box(gold, 0.08, 1.0, 0.08, w.x - 0.48, w.y + 1.5, w.z);
    box(gold, 0.08, 1.0, 0.08, w.x + 0.48, w.y + 1.5, w.z);
    box(wood, 1.18, 0.16, 0.26, w.x, w.y + 2.02, w.z);
    box(gold, 1.28, 0.09, 0.32, w.x, w.y + 2.14, w.z);
  }

  for (const n of LAMP_NICHES) {
    const ry = n.ry || 0;
    const nx = Math.sin(ry);
    const nz = Math.cos(ry);
    box(dark, 1.05, 1.35, 0.16, n.x + nx * 0.1, n.y + 0.7, n.z + nz * 0.1, ry);
    box(dark, 0.22, 1.5, 0.3, n.x + nx * 0.16, n.y + 0.75, n.z + nz * 0.16, ry);
    box(lantern, 0.48, 0.18, 0.1, n.x + nx * 0.2, n.y + 0.56, n.z + nz * 0.2, ry);
    cyl(copper, 0.15, 0.1, 0.16, 6, n.x + nx * 0.24, n.y + 0.47, n.z + nz * 0.24);
  }

  addYak(dark, pale, 128, 44.9, -86, 0.4, 1.0);
  addYak(dark, pale, 168, 44.9, -88, -0.8, 0.9);
  addYak(dark, pale, -176, 44.9, -84, 2.5, 0.86);

  for (const s of INCENSE_SPOTS) {
    cyl(copper, 0.52, 0.67, 0.34, 9, s.x, s.y + 0.42, s.z);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      cyl(copper, 0.06, 0.09, 0.5, 5, s.x + Math.cos(a) * 0.38, s.y + 0.25, s.z + Math.sin(a) * 0.38);
    }
    cyl(copper, 0.12, 0.2, 0.55, 6, s.x, s.y + 0.82, s.z);
    for (let i = 0; i < 5; i++) {
      const a = i * 1.34;
      cyl(wood, 0.018, 0.026, 0.65, 4, s.x + Math.cos(a) * 0.16, s.y + 1.18, s.z + Math.sin(a) * 0.16);
    }
    const orb = new THREE.SphereGeometry(0.16, 6, 4);
    orb.translate(s.x, s.y + 1.55, s.z);
    foliage.push(orb);
  }

  for (const [x, y, z, w, d, h] of [
    [-7, 116, 20, 92, 58, 11],
    [-38, 116, 46, 32, 24, 7.5],
    [26, 116, 46, 30, 22, 7],
    [-7, 107, 70, 38, 18, 6.5],
    [88, 96.4, 12, 34, 26, 7.5],
    [140, 96.4, 12, 25, 20, 6.2],
    [-132, 90.4, 8, 30, 24, 6.8],
  ]) {
    const rh = Math.max(0, (w - d) * 0.25);
    for (const s of [-1, 1]) {
      const bell = new THREE.ConeGeometry(0.17, 0.5, 5);
      bell.rotateZ(s * -0.2);
      bell.translate(x + s * (w * 0.5 + 0.2), y + h * 0.08, z + d * 0.5);
      gold.push(bell);
      if (rh > 1) {
        const orb = new THREE.SphereGeometry(0.19, 6, 4);
        orb.translate(x + s * rh * 0.9, y + h + 0.48, z);
        gold.push(orb);
      }
    }
  }

  const defs = [
    [dark, mats.stoneDark],
    [pale, mats.whiteShade],
    [red, mats.trimRed],
    [wood, mats.wood],
    [ochre, mats.ochre],
    [gold, mats.goldBright],
    [stone, mats.stone],
    [copper, mats.copper],
    [lantern, mats.lantern],
    [foliage, mats.foliageDark],
  ];
  for (const [list, mat] of defs) {
    if (!list.length) continue;
    const geo = mergeGeometries(list, false);
    list.forEach((g) => g.dispose());
    if (!geo) continue;
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
  }
  return root;
}

function makeSmokeMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
    vertexShader: `
      uniform float uTime;
      attribute float aSeed;
      attribute vec3 aBase;
      attribute float aSize;
      varying float vAlpha;
      void main() {
        float life = fract(uTime * 0.14 + aSeed);
        vec3 p = aBase;
        p.y += life * 7.2;
        p.x += sin(uTime * 0.75 + aSeed * 21.0 + life * 5.5) * (0.28 + life * 1.15);
        p.z += cos(uTime * 0.62 + aSeed * 17.0 + life * 4.2) * (0.24 + life * 0.95);
        vAlpha = smoothstep(0.0, 0.1, life) * (1.0 - life);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = aSize * (1.0 + life * 1.6) * (260.0 / max(1.0, -mv.z));
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      varying float vAlpha;
      void main() {
        vec2 d = gl_PointCoord - 0.5;
        float r = dot(d, d);
        if (r > 0.25) discard;
        float a = smoothstep(0.25, 0.02, r) * vAlpha * 0.24;
        gl_FragColor = vec4(0.86, 0.84, 0.8, a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
}

function makeGlowMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uDusk: { value: 0 } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      uniform float uTime;
      uniform float uDusk;
      attribute vec3 aBase;
      attribute float aSeed;
      varying float vAlpha;
      void main() {
        vec3 p = aBase;
        float flick = 0.72 + 0.22 * sin(uTime * 5.7 + aSeed * 31.0) + 0.12 * sin(uTime * 16.0 + aSeed * 7.0);
        vAlpha = (0.12 + 0.88 * uDusk) * flick;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = (2.2 + 4.4 * uDusk) * flick * (210.0 / max(1.0, -mv.z));
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      varying float vAlpha;
      void main() {
        vec2 d = gl_PointCoord - 0.5;
        float r = dot(d, d);
        if (r > 0.25) discard;
        float a = smoothstep(0.25, 0.0, r);
        gl_FragColor = vec4(1.0, 0.63, 0.24, a * vAlpha * 0.42);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
}

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

function pilgrimGeometry() {
  const parts = [];
  const body = new THREE.CylinderGeometry(0.25, 0.46, 1.05, 7);
  body.translate(0, 0.52, 0);
  parts.push(tint(body, 0x7a1d14));
  const sash = new THREE.CylinderGeometry(0.29, 0.36, 0.24, 7);
  sash.translate(0, 0.86, 0);
  parts.push(tint(sash, 0xb67c24));
  const head = new THREE.SphereGeometry(0.18, 7, 5);
  head.translate(0, 1.52, 0);
  parts.push(tint(head, 0xa9774f));
  const hat = new THREE.ConeGeometry(0.27, 0.24, 7);
  hat.translate(0, 1.72, 0);
  parts.push(tint(hat, 0x9a3122));
  const arm = new THREE.BoxGeometry(0.12, 0.62, 0.15);
  arm.translate(0.3, 0.88, 0.04);
  parts.push(tint(arm, 0x6f1a12));
  const geo = mergeGeometries(parts, false);
  parts.forEach((g) => g.dispose());
  return geo;
}

export function createRefineAmbient() {
  const group = new THREE.Group();

  const smokeMat = makeSmokeMaterial();
  const smokePos = [];
  const smokeSeed = [];
  const smokeSize = [];
  for (const s of INCENSE_SPOTS) {
    for (let i = 0; i < 26; i++) {
      smokePos.push(s.x + (rnd() - 0.5) * 0.24, s.y + 1.45 + rnd() * 0.35, s.z + (rnd() - 0.5) * 0.24);
      smokeSeed.push(rnd());
      smokeSize.push(2.6 + rnd() * 3.2);
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

  const glowMat = makeGlowMaterial();
  const glowPos = [];
  const glowSeed = [];
  for (const n of LAMP_NICHES) {
    glowPos.push(n.x + Math.sin(n.ry || 0) * 0.32, n.y + 0.58, n.z + Math.cos(n.ry || 0) * 0.32);
    glowSeed.push(rnd());
  }
  for (const s of INCENSE_SPOTS) {
    glowPos.push(s.x, s.y + 1.52, s.z);
    glowSeed.push(rnd());
  }
  const glowGeo = new THREE.BufferGeometry();
  glowGeo.setAttribute('position', new THREE.Float32BufferAttribute(glowPos, 3));
  glowGeo.setAttribute('aBase', new THREE.Float32BufferAttribute(glowPos, 3));
  glowGeo.setAttribute('aSeed', new THREE.Float32BufferAttribute(glowSeed, 1));
  const glow = new THREE.Points(glowGeo, glowMat);
  glow.frustumCulled = false;
  group.add(glow);

  const drumGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.78, 10);
  const bandGeo = new THREE.CylinderGeometry(0.375, 0.375, 0.1, 10);
  const drums = new THREE.InstancedMesh(drumGeo, mats.copper, WHEEL_ROW.length);
  const bands = new THREE.InstancedMesh(bandGeo, mats.goldBright, WHEEL_ROW.length);
  drums.castShadow = true;
  bands.castShadow = true;
  drums.frustumCulled = false;
  bands.frustumCulled = false;
  group.add(drums, bands);

  const pilgrims = new THREE.InstancedMesh(
    pilgrimGeometry(),
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }),
    10
  );
  pilgrims.castShadow = true;
  pilgrims.frustumCulled = false;
  group.add(pilgrims);
  const people = [];
  for (let i = 0; i < 10; i++) {
    people.push({
      phase: (i / 10) * Math.PI * 2 + rnd() * 0.3,
      speed: 0.055 + rnd() * 0.035,
      rx: 27 + rnd() * 7,
      rz: 17 + rnd() * 5,
      scale: 0.92 + rnd() * 0.2,
    });
  }

  const dummy = new THREE.Object3D();
  function updateWheels(time) {
    for (let i = 0; i < WHEEL_ROW.length; i++) {
      const w = WHEEL_ROW[i];
      dummy.position.set(w.x, w.y + 1.34, w.z);
      dummy.rotation.set(0, time * 0.9 + i * 0.45, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      drums.setMatrixAt(i, dummy.matrix);
      dummy.position.y = w.y + 1.58;
      dummy.updateMatrix();
      bands.setMatrixAt(i, dummy.matrix);
    }
    drums.instanceMatrix.needsUpdate = true;
    bands.instanceMatrix.needsUpdate = true;
  }
  function updatePeople(time) {
    for (let i = 0; i < people.length; i++) {
      const p = people[i];
      const a = p.phase + time * p.speed;
      const x = 127 + Math.cos(a) * p.rx;
      const z = 141 + Math.sin(a) * p.rz;
      const dx = -Math.sin(a) * p.rx;
      const dz = Math.cos(a) * p.rz;
      dummy.position.set(x, 44.15 + Math.abs(Math.sin(time * 2.6 + p.phase)) * 0.055, z);
      dummy.rotation.set(0, Math.atan2(dx, dz), 0);
      dummy.scale.setScalar(p.scale);
      dummy.updateMatrix();
      pilgrims.setMatrixAt(i, dummy.matrix);
    }
    pilgrims.instanceMatrix.needsUpdate = true;
  }
  updateWheels(0);
  updatePeople(0);

  return {
    group,
    update(time, dusk = 0) {
      smokeMat.uniforms.uTime.value = time;
      glowMat.uniforms.uTime.value = time;
      glowMat.uniforms.uDusk.value = dusk;
      updateWheels(time);
      updatePeople(time);
    },
  };
}
