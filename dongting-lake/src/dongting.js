import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mats, makeWaterMaterial, getPlaqueMaterial } from './materials.js';
import {
  mergeStaticGroup,
  mergedMesh,
  addBox,
  addCylinder,
  createBalustrade,
  createStairs,
} from './geometry.js';
import { createRoof, createSkirtRoof } from './roof.js';
import { createPavilion, createHexPavilion } from './gardenBuild.js';
import { createWillow, createBamboo, createShrub } from './gardenDetails.js';
import { createHill, createStoneBridge } from './westlakeDetails.js';
import { createTree } from './props.js';

const CACHE = new Map();
function mat(color, rough = 0.95, metal = 0) {
  const key = `${color}:${rough}:${metal}`;
  if (!CACHE.has(key)) {
    CACHE.set(key, new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal }));
  }
  return CACHE.get(key);
}

function add(g, geo, material, x = 0, y = 0, z = 0, ry = 0) {
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(x, y, z);
  mesh.rotation.y = ry;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  g.add(mesh);
  return mesh;
}

function box(g, w, h, d, m, x, y, z, ry = 0) {
  return add(g, new THREE.BoxGeometry(w, h, d), m, x, y, z, ry);
}

function cyl(g, rt, rb, h, seg, m, x, y, z) {
  return add(g, new THREE.CylinderGeometry(rt, rb, h, seg), m, x, y, z);
}

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a * 1664525 + 1013904223) >>> 0;
    return a / 4294967296;
  };
}

const timeUniform = { value: 0 };

function swayMaterial(material, amp, freq, bend = 0.06) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uSwayTime = timeUniform;
    shader.vertexShader = 'uniform float uSwayTime;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      vec3 swayBase = vec3(0.0);
      #ifdef USE_INSTANCING
        swayBase = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
      #endif
      float swayPhase = swayBase.x * 0.19 + swayBase.z * 0.23;
      float swayH = max(transformed.y, 0.0);
      float swayWave = sin(uSwayTime * ${freq.toFixed(2)} + swayPhase) + 0.42 * sin(uSwayTime * ${(freq * 1.73).toFixed(2)} + swayPhase * 1.7);
      float swayAmt = swayWave * ${amp.toFixed(4)} * swayH * swayH * ${bend.toFixed(4)};
      transformed.x += swayAmt;
      transformed.z += swayAmt * 0.55;
      transformed.y += sin(uSwayTime * ${(freq * 0.82).toFixed(2)} + swayPhase) * ${(amp * 0.18).toFixed(4)} * swayH;`
    );
  };
  material.customProgramCacheKey = () => `dt-sway-${amp}-${freq}-${bend}`;
  return material;
}

const reedMat = swayMaterial(
  new THREE.MeshStandardMaterial({ color: 0xb9a46c, roughness: 0.96, side: THREE.DoubleSide }),
  0.02,
  1.35,
  0.12
);
const plumeMat = swayMaterial(
  new THREE.MeshStandardMaterial({ color: 0xd2c193, roughness: 0.94, side: THREE.DoubleSide }),
  0.021,
  1.5,
  0.14
);
const padMat = swayMaterial(
  new THREE.MeshStandardMaterial({ color: 0x5c8154, roughness: 0.88, side: THREE.DoubleSide }),
  0.008,
  0.9,
  0.02
);
const flowerMat = swayMaterial(
  new THREE.MeshStandardMaterial({ color: 0xecc6cd, roughness: 0.76, side: THREE.DoubleSide }),
  0.011,
  1.1,
  0.05
);
const teaMat = new THREE.MeshStandardMaterial({ color: 0x50713f, roughness: 0.96 });
const teaRowMat = new THREE.MeshStandardMaterial({ color: 0x6b8650, roughness: 0.95 });
const cinnabar = mat(0x963f2e, 0.72, 0.02);
const timber = mats.timber;
const towerTile = mats.roof.clone();
towerTile.color.set(0xd7a55e);
towerTile.roughness = 0.55;
towerTile.metalness = 0.08;
const townTile = mats.roofDark.clone();
townTile.color.set(0x454c4a);
townTile.roughness = 0.8;
const wallWhite = mats.wall;
const stoneBase = mats.marbleShade;
const stonePave = mats.paving;
const darkWood = mats.wood;

const HEADLAND = [
  [-780, 545], [-700, 462], [-622, 408], [-544, 352], [-470, 304], [-400, 258],
  [-332, 214], [-268, 178], [-210, 146], [-158, 116], [-116, 86], [-83, 58],
  [-58, 34], [-45, 13], [-31, 17], [-24, 39], [-37, 74], [-58, 108],
  [-88, 141], [-128, 174], [-176, 208], [-230, 240], [-290, 274], [-354, 312],
  [-422, 354], [-494, 400], [-570, 450], [-650, 504], [-730, 562], [-780, 590],
];
const HEADLAND_TOP = 3.7;
const HEADLAND_PATH = [
  [-744, 552], [-684, 490], [-620, 438], [-556, 392], [-492, 350], [-430, 312],
  [-370, 278], [-312, 246], [-258, 216], [-208, 188], [-162, 160], [-124, 132],
  [-92, 106], [-68, 82], [-52, 58], [-43, 34],
];
const TOWER = { x: 40, z: -10, y: 3.5 };
const JUNSHAN = { x: 150, z: -172, rx: 88, rz: 70, h: 3.4 };

function shapeFrom(points) {
  const shape = new THREE.Shape();
  points.forEach(([x, z], i) => {
    if (i === 0) shape.moveTo(x, -z);
    else shape.lineTo(x, -z);
  });
  shape.closePath();
  return shape;
}

function landMass(points, height, material) {
  const geo = new THREE.ExtrudeGeometry(shapeFrom(points), {
    depth: height,
    bevelEnabled: false,
    curveSegments: 1,
  });
  geo.rotateX(-Math.PI / 2);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function landCap(points, height, material) {
  const geo = new THREE.ShapeGeometry(shapeFrom(points), 1);
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.y = height + 0.025;
  mesh.receiveShadow = true;
  return mesh;
}

function pathStrip(g, points, width, y, material) {
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    box(g, width, 0.16, len + 1.2, material, (a[0] + b[0]) / 2, y + 0.08, (a[1] + b[1]) / 2, Math.atan2(b[0] - a[0], b[1] - a[1]));
  }
}

function polygonCenter(points) {
  let x = 0;
  let z = 0;
  for (const p of points) {
    x += p[0];
    z += p[1];
  }
  return [x / points.length, z / points.length];
}

function radialTexture(stops) {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [offset, color] of stops) grad.addColorStop(offset, color);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function mistPatch(dynamic, texture, x, z, y, sx, sz, opacity, speed, phase) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(sx, sz),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, y, z);
  mesh.renderOrder = 3;
  dynamic.add(mesh);
  return { mesh, baseX: x, baseZ: z, speed, phase, opacity };
}

function scatterAlongPolygon(points, count, offsetMin, offsetMax, seed, place) {
  const r = rng(seed);
  const center = polygonCenter(points);
  let total = 0;
  const segs = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    total += len;
    segs.push({ a, b, len });
  }
  for (let n = 0; n < count; n++) {
    let t = r() * total;
    let seg = segs[0];
    for (const s of segs) {
      if (t <= s.len) {
        seg = s;
        break;
      }
      t -= s.len;
    }
    const k = Math.min(1, t / (seg.len || 1));
    const x = seg.a[0] + (seg.b[0] - seg.a[0]) * k;
    const z = seg.a[1] + (seg.b[1] - seg.a[1]) * k;
    let nx = -(seg.b[1] - seg.a[1]);
    let nz = seg.b[0] - seg.a[0];
    const len = Math.hypot(nx, nz) || 1;
    nx /= len;
    nz /= len;
    if ((x - center[0]) * nx + (z - center[1]) * nz < 0) {
      nx = -nx;
      nz = -nz;
    }
    const off = offsetMin + r() * (offsetMax - offsetMin);
    place(x + nx * off, z + nz * off, r, nx, nz);
  }
}

function instanced(g, geo, material, count, place, cast = false) {
  const mesh = new THREE.InstancedMesh(geo, material, count);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    place(dummy, i);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = cast;
  mesh.receiveShadow = true;
  g.add(mesh);
  return mesh;
}

function reedClusterGeometry() {
  const parts = [];
  const r = rng(8123);
  for (let i = 0; i < 6; i++) {
    const h = 1.55 + r() * 0.95;
    const geo = new THREE.PlaneGeometry(0.15, h, 1, 3);
    const pos = geo.attributes.position;
    for (let k = 0; k < pos.count; k++) {
      const y = pos.getY(k);
      const v = (y + h / 2) / h;
      pos.setX(k, pos.getX(k) * (1 - v * 0.72));
      pos.setZ(k, y * y * 0.055);
    }
    geo.rotateY(r() * Math.PI);
    geo.translate((r() - 0.5) * 0.34, h * 0.5, (r() - 0.5) * 0.34);
    parts.push(geo);
  }
  const merged = mergeGeometries(parts, false);
  parts.forEach((g) => g.dispose());
  merged.computeVertexNormals();
  return merged;
}

function plumeGeometry() {
  const parts = [];
  const r = rng(4381);
  for (let i = 0; i < 3; i++) {
    const g = new THREE.ConeGeometry(0.055, 0.42 + r() * 0.22, 5, 1, true);
    g.rotateZ((r() - 0.5) * 0.3);
    g.translate((r() - 0.5) * 0.2, 1.82 + r() * 0.55, (r() - 0.5) * 0.2);
    parts.push(g);
  }
  const merged = mergeGeometries(parts, false);
  parts.forEach((g) => g.dispose());
  return merged;
}

function lotusPadGeometry() {
  const geo = new THREE.CircleGeometry(0.62, 12);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const d = Math.hypot(x, y) / 0.62;
    pos.setZ(i, (1 - d * d) * 0.07 + 0.01);
  }
  geo.rotateX(-Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

function lotusFlowerGeometry() {
  const parts = [];
  for (let layer = 0; layer < 2; layer++) {
    const n = layer === 0 ? 7 : 5;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + layer * 0.32;
      const petal = new THREE.ConeGeometry(0.11, 0.34, 4, 1, false);
      petal.scale(1, 1, 0.42);
      petal.rotateX(-0.82 - layer * 0.3);
      petal.rotateY(a);
      petal.translate(Math.cos(a) * 0.11, 0.24 + layer * 0.07, Math.sin(a) * 0.11);
      parts.push(petal);
    }
  }
  const core = new THREE.CylinderGeometry(0.07, 0.09, 0.16, 7);
  core.translate(0, 0.2, 0);
  parts.push(core);
  const merged = mergeGeometries(parts, false);
  parts.forEach((g) => g.dispose());
  return merged;
}

function gooseGeometry() {
  const parts = [];
  const body = new THREE.SphereGeometry(0.3, 9, 6);
  body.scale(0.62, 0.55, 2.1);
  parts.push(body);
  const neck = new THREE.CylinderGeometry(0.07, 0.12, 0.55, 6);
  neck.rotateX(Math.PI / 2);
  neck.translate(0, 0.05, 0.68);
  parts.push(neck);
  const head = new THREE.SphereGeometry(0.1, 6, 4);
  head.translate(0, 0.08, 0.97);
  parts.push(head);
  const tail = new THREE.ConeGeometry(0.16, 0.55, 4);
  tail.rotateX(Math.PI / 2);
  tail.translate(0, 0.02, -0.72);
  parts.push(tail);
  for (const side of [-1, 1]) {
    const wing = new THREE.PlaneGeometry(1.48, 0.56, 4, 1);
    wing.rotateX(-Math.PI / 2);
    wing.translate(side * 0.92, 0.05, 0.06);
    parts.push(wing);
  }
  const merged = mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)), false);
  parts.forEach((g) => g.dispose());
  merged.computeVertexNormals();
  return merged;
}

const gooseMat = new THREE.MeshStandardMaterial({
  color: 0x3b4245,
  roughness: 0.86,
  side: THREE.DoubleSide,
});
gooseMat.onBeforeCompile = (shader) => {
  shader.uniforms.uSwayTime = timeUniform;
  shader.vertexShader = 'uniform float uSwayTime;\n' + shader.vertexShader;
  shader.vertexShader = shader.vertexShader.replace(
    '#include <begin_vertex>',
    `#include <begin_vertex>
    #ifdef USE_INSTANCING
      float goosePhase = instanceMatrix[3][0] * 0.37 + instanceMatrix[3][2] * 0.29;
      float wingSpan = smoothstep(0.32, 1.65, abs(transformed.x));
      float flap = sin(uSwayTime * 4.4 + goosePhase) * 0.72;
      transformed.y += abs(transformed.x) * flap * wingSpan;
      transformed.z += abs(transformed.x) * flap * 0.18;
    #endif`
  );
};
gooseMat.customProgramCacheKey = () => 'dt-goose';

function craneGeometry() {
  const parts = [];
  const body = new THREE.SphereGeometry(0.24, 8, 5);
  body.scale(0.85, 0.72, 1.55);
  body.translate(0, 0.95, 0);
  parts.push(body);
  const neck = new THREE.CylinderGeometry(0.045, 0.07, 0.95, 5);
  neck.rotateX(0.22);
  neck.translate(0, 1.44, 0.2);
  parts.push(neck);
  const head = new THREE.SphereGeometry(0.09, 6, 4);
  head.translate(0, 1.92, 0.31);
  parts.push(head);
  const beak = new THREE.ConeGeometry(0.035, 0.28, 4);
  beak.rotateX(Math.PI / 2);
  beak.translate(0, 1.9, 0.54);
  parts.push(beak);
  for (const side of [-1, 1]) {
    const leg = new THREE.CylinderGeometry(0.022, 0.022, 0.82, 4);
    leg.translate(side * 0.08, 0.41, -0.02);
    parts.push(leg);
  }
  const merged = mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)), false);
  parts.forEach((g) => g.dispose());
  merged.computeVertexNormals();
  return merged;
}

function boatHullGeometry(length = 7, width = 2.4) {
  const rings = 18;
  const profile = [
    [-1, 1], [-0.9, 0.92], [-0.66, 0.32], [-0.28, 0.03],
    [0, 0], [0.28, 0.03], [0.66, 0.32], [0.9, 0.92], [1, 1],
  ];
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let i = 0; i <= rings; i++) {
    const t = i / rings;
    const z = (t - 0.5) * length;
    const narrow = Math.pow(Math.sin(Math.PI * t), 0.52);
    const half = width * 0.5 * narrow + 0.05;
    const sheer = 0.34 + 0.36 * Math.pow(Math.abs(t - 0.5) * 2, 3.2);
    profile.forEach(([px, py], j) => {
      positions.push(px * half, py > 0.5 ? sheer - (1 - py) * 0.16 : -0.3 + py * 0.3, z);
      uvs.push((j / (profile.length - 1)) * 1.5, t * 2.4);
    });
  }
  const row = profile.length;
  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < row - 1; j++) {
      const a = i * row + j;
      const b = a + 1;
      const c = a + row;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function makeBoat({ sail = 0xeee2c8, scale = 1, cormorant = true, mast = true }) {
  const g = new THREE.Group();
  const hullMat = mat(0x5d4128, 0.86);
  const trimMat = mat(0x2f2015, 0.82);
  const hull = new THREE.Mesh(boatHullGeometry(7.2, 2.35), hullMat);
  hull.castShadow = true;
  hull.receiveShadow = true;
  g.add(hull);
  box(g, 5.2, 0.1, 1.58, trimMat, 0, 0.27, 0);
  for (const sz of [-1, 1]) {
    box(g, 6.1, 0.11, 0.13, trimMat, 0, 0.53, sz * 1.04, 0);
  }
  box(g, 2.3, 0.95, 1.55, hullMat, -0.55, 0.75, 0);
  const cabinRoof = new THREE.ConeGeometry(1.45, 0.62, 4);
  cabinRoof.rotateY(Math.PI / 4);
  cabinRoof.scale(1.0, 1, 0.72);
  add(g, cabinRoof, mat(0x3f3428, 0.9), -0.55, 1.5, 0);
  if (mast) {
    cyl(g, 0.055, 0.09, 4.6, 6, trimMat, 1.35, 2.3, -0.15);
    box(g, 2.2, 0.08, 0.08, trimMat, 0.45, 3.75, -0.15);
    const cloth = new THREE.PlaneGeometry(2.4, 3.4, 4, 5);
    const p = cloth.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      p.setZ(i, Math.sin((x + 1.2) * 1.4) * 0.2 + Math.sin((y + 1.7) * 0.9) * 0.08);
    }
    cloth.computeVertexNormals();
    const sailMesh = new THREE.Mesh(cloth, new THREE.MeshStandardMaterial({
      color: sail,
      roughness: 0.88,
      side: THREE.DoubleSide,
    }));
    sailMesh.position.set(0.9, 3.15, -0.15);
    sailMesh.rotation.y = Math.PI / 2;
    sailMesh.castShadow = true;
    g.add(sailMesh);
  }
  box(g, 1.1, 0.06, 0.06, trimMat, 0.2, 0.9, 1.1, 0.3);
  add(g, new THREE.SphereGeometry(0.13, 6, 4), mats.lanternRed, -1.55, 1.0, 0.15);
  if (cormorant) {
    const bird = new THREE.Group();
    add(bird, new THREE.SphereGeometry(0.16, 7, 5), mat(0x1f2424, 0.9), 0, 0.25, 0);
    cyl(bird, 0.035, 0.06, 0.4, 5, mat(0x1f2424, 0.9), 0, 0.52, 0.05);
    add(bird, new THREE.SphereGeometry(0.075, 6, 4), mat(0x1f2424, 0.9), 0, 0.72, 0.05);
    bird.position.set(2.15, 0.36, 0.24);
    bird.rotation.y = -0.7;
    g.add(bird);
  }
  g.scale.setScalar(scale);
  return mergeStaticGroup(g);
}

function hipRoof(g, w, d, h, m, x, y, z, extra = 0.5) {
  const geo = new THREE.ConeGeometry(Math.max(w, d) * 0.72, h, 4);
  geo.rotateY(Math.PI / 4);
  geo.scale(w / Math.max(w, d), 1, d / Math.max(w, d));
  add(g, geo, m, x, y + h * 0.5, z);
  box(g, w + extra, 0.16, d + extra, mats.roofDark, x, y + 0.03, z);
}

function townHouse(root, x, y, z, rot, w, d, h, kind, seed) {
  const g = new THREE.Group();
  const r = rng(seed);
  const baseH = kind === 2 ? h * 0.46 : h;
  box(g, w + 0.7, 0.4, d + 0.7, stoneBase, 0, 0.2, 0);
  box(g, w, baseH, d, wallWhite, 0, 0.4 + baseH / 2, 0);
  const beams = [];
  for (const sx of [-1, 1]) {
    addBox(beams, 0.22, baseH, 0.22, sx * (w / 2 - 0.08), 0.4 + baseH / 2, d / 2 - 0.05);
    addBox(beams, 0.22, baseH, 0.22, sx * (w / 2 - 0.08), 0.4 + baseH / 2, -d / 2 + 0.05);
    addBox(beams, 0.2, 0.2, d, sx * (w / 2 - 0.05), 0.4 + baseH - 0.15, 0);
  }
  addBox(beams, w, 0.2, 0.2, 0, 0.4 + baseH - 0.15, d / 2 - 0.05);
  addBox(beams, w, 0.15, 0.2, 0, 0.55, d / 2 - 0.05);
  const bm = mergedMesh(beams, darkWood, true, true);
  if (bm) g.add(bm);
  const winGeo = new THREE.PlaneGeometry(w * 0.95, baseH * 0.5);
  const lattice = new THREE.Mesh(winGeo, mats.lattice);
  lattice.position.set(0, 0.4 + baseH * 0.55, d / 2 + 0.06);
  lattice.scale.set(1, 1, 1);
  g.add(lattice);
  box(g, w * 0.22, baseH * 0.72, 0.12, darkWood, 0, 0.4 + baseH * 0.36, d / 2 + 0.1);
  hipRoof(g, w + 1.6, d + 1.6, kind === 2 ? h * 0.42 : h * 0.62, townTile, 0, 0.4 + baseH, 0, 0.4);
  if (kind === 2) {
    const upperH = h * 0.44;
    const uw = w * 0.78;
    const ud = d * 0.76;
    box(g, uw, upperH, ud, wallWhite, 0, 0.4 + baseH + 0.15 + upperH / 2, 0);
    const rail = createBalustrade({ w: uw + 1.2, d: ud + 1.2, gapFront: uw * 0.4 });
    rail.position.y = 0.4 + baseH + 0.15;
    g.add(rail);
    hipRoof(g, uw + 1.6, ud + 1.6, h * 0.38, townTile, 0, 0.4 + baseH + 0.15 + upperH, 0, 0.4);
  }
  for (let i = 0; i < 2; i++) {
    const lx = (i ? 1 : -1) * w * 0.32;
    add(g, new THREE.SphereGeometry(0.16, 7, 5), mats.lanternRed, lx, 2.65 + r() * 0.2, d / 2 + 0.55);
  }
  g.position.set(x, y, z);
  g.rotation.y = rot;
  root.add(g);
  return g;
}

function dock(root, x, z, rot, len = 16, width = 3.2) {
  const g = new THREE.Group();
  const planks = [];
  for (let i = 0; i < Math.round(len / 0.8); i++) {
    addBox(planks, width, 0.12, 0.7, 0, 0.62, -len / 2 + i * 0.8);
  }
  for (let i = 0; i < 5; i++) {
    for (const sx of [-1, 1]) {
      addCylinder(planks, 0.11, 0.13, 2.4, 6, sx * (width / 2 - 0.2), -0.55, -len / 2 + (i / 4) * len);
    }
  }
  const pm = mergedMesh(planks, mats.timber, true, true);
  if (pm) g.add(pm);
  cyl(g, 0.07, 0.09, 2.2, 6, darkWood, width / 2 - 0.4, 1.5, -len / 2 + 1.2);
  add(g, new THREE.SphereGeometry(0.2, 7, 5), mats.lanternRed, width / 2 - 0.4, 2.7, -len / 2 + 1.2);
  g.position.set(x, 0.1, z);
  g.rotation.y = rot;
  root.add(g);
}

function yueyangTower(root) {
  const g = new THREE.Group();
  box(g, 33, 1.4, 26, stoneBase, 0, 0.7, 0);
  box(g, 32.8, 0.16, 25.8, stonePave, 0, 1.48, 0);
  const rail = createBalustrade({ w: 33, d: 26, gapFront: 9 });
  rail.position.y = 1.5;
  g.add(rail);
  const stairs = createStairs({ width: 8.2, depth: 3.4, height: 1.5, steps: 7, rampWidth: 0 });
  stairs.position.set(0, 0, 14.6);
  g.add(stairs);

  const baseY = 1.5;
  const lowerH = 4.9;
  const lowerW = 22;
  const lowerD = 15;
  box(g, lowerW, lowerH, 0.34, wallWhite, 0, baseY + lowerH / 2, -lowerD / 2 + 0.17);
  for (const sx of [-1, 1]) {
    box(g, 0.34, lowerH, lowerD, wallWhite, sx * (lowerW / 2 - 0.17), baseY + lowerH / 2, 0);
  }
  const lowerCols = [];
  for (let i = 0; i <= 5; i++) {
    const px = -lowerW / 2 + (lowerW / 5) * i;
    addCylinder(lowerCols, 0.22, 0.25, lowerH + 0.3, 8, px, baseY + (lowerH + 0.3) / 2, lowerD / 2 + 0.28);
    addCylinder(lowerCols, 0.22, 0.25, lowerH + 0.3, 8, px, baseY + (lowerH + 0.3) / 2, -lowerD / 2 - 0.28);
    if (i > 0) {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(1.55, lowerH * 0.58), mats.lattice);
      win.position.set(-lowerW / 2 + (lowerW / 5) * (i - 0.5), baseY + lowerH * 0.42, lowerD / 2 + 0.02);
      g.add(win);
    }
  }
  for (let i = 1; i < 4; i++) {
    const pz = -lowerD / 2 + (lowerD / 4) * i;
    for (const sx of [-1, 1]) {
      addCylinder(lowerCols, 0.2, 0.23, lowerH + 0.3, 8, sx * (lowerW / 2 + 0.28), baseY + (lowerH + 0.3) / 2, pz);
    }
  }
  const lc = mergedMesh(lowerCols, cinnabar, true, true);
  if (lc) g.add(lc);
  const beams = [];
  addBox(beams, lowerW + 1.4, 0.42, lowerD + 1.4, 0, baseY + lowerH - 0.2, 0);
  addBox(beams, lowerW + 1.0, 0.22, lowerD + 1.0, 0, baseY + lowerH - 1.1, 0);
  const bm = mergedMesh(beams, cinnabar, true, true);
  if (bm) g.add(bm);

  const lowerRoof = createSkirtRoof({
    outerW: lowerW + 8,
    outerD: lowerD + 6.5,
    innerW: lowerW - 1.2,
    innerD: lowerD - 1.2,
    height: 2.6,
    cornerLift: 1.65,
    curve: 1.55,
  });
  lowerRoof.position.y = baseY + lowerH;
  lowerRoof.traverse((o) => {
    if (o.isMesh && o.material === mats.roof) o.material = towerTile;
  });
  g.add(lowerRoof);

  const midY = baseY + lowerH + 2.6 * 0.8;
  const midH = 3.7;
  const midW = 15.8;
  const midD = 10.8;
  box(g, midW, midH, midD, wallWhite, 0, midY + midH / 2, 0);
  const midRail = createBalustrade({ w: midW + 3.2, d: midD + 3.2, gapFront: 4 });
  midRail.position.y = midY;
  g.add(midRail);
  const midCols = [];
  for (let i = 0; i <= 4; i++) {
    const px = -midW / 2 + (midW / 4) * i;
    addCylinder(midCols, 0.18, 0.2, midH + 0.2, 8, px, midY + midH / 2, midD / 2 + 0.2);
    addCylinder(midCols, 0.18, 0.2, midH + 0.2, 8, px, midY + midH / 2, -midD / 2 - 0.2);
    if (i > 0) {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(1.3, midH * 0.55), mats.lattice);
      win.position.set(-midW / 2 + (midW / 4) * (i - 0.5), midY + midH * 0.5, midD / 2 + 0.02);
      g.add(win);
    }
  }
  const mc = mergedMesh(midCols, cinnabar, true, true);
  if (mc) g.add(mc);
  box(g, midW + 1.0, 0.34, midD + 1.0, cinnabar, 0, midY + midH - 0.18, 0);

  const midRoof = createSkirtRoof({
    outerW: midW + 7,
    outerD: midD + 5.6,
    innerW: midW - 1.0,
    innerD: midD - 1.0,
    height: 2.2,
    cornerLift: 1.45,
    curve: 1.52,
  });
  midRoof.position.y = midY + midH;
  midRoof.traverse((o) => {
    if (o.isMesh && o.material === mats.roof) o.material = towerTile;
  });
  g.add(midRoof);

  const topY = midY + midH + 2.2 * 0.8;
  const topH = 3.2;
  const topW = 10.6;
  const topD = 7.4;
  box(g, topW, topH, topD, wallWhite, 0, topY + topH / 2, 0);
  const topRail = createBalustrade({ w: topW + 2.8, d: topD + 2.8, gapFront: 3 });
  topRail.position.y = topY;
  g.add(topRail);
  const topCols = [];
  for (let i = 0; i <= 3; i++) {
    const px = -topW / 2 + (topW / 3) * i;
    addCylinder(topCols, 0.15, 0.17, topH + 0.2, 8, px, topY + topH / 2, topD / 2 + 0.18);
    addCylinder(topCols, 0.15, 0.17, topH + 0.2, 8, px, topY + topH / 2, -topD / 2 - 0.18);
  }
  const tc = mergedMesh(topCols, cinnabar, true, true);
  if (tc) g.add(tc);
  box(g, topW + 0.8, 0.28, topD + 0.8, cinnabar, 0, topY + topH - 0.15, 0);
  const topWin = new THREE.Mesh(new THREE.PlaneGeometry(topW * 0.98, topH * 0.52), mats.lattice);
  topWin.position.set(0, topY + topH * 0.5, topD / 2 + 0.02);
  g.add(topWin);

  const roof = createRoof({
    width: topW + 5,
    depth: topD + 4,
    height: 3.7,
    cornerLift: 2.0,
    curve: 1.68,
    ridgeRatio: 0.55,
    hasRidge: true,
    beasts: false,
  });
  roof.position.y = topY + topH;
  roof.traverse((o) => {
    if (o.isMesh && o.material === mats.roof) o.material = towerTile;
  });
  g.add(roof);

  const finial = [];
  const orb = new THREE.SphereGeometry(0.36, 10, 8);
  orb.translate(0, topY + topH + 4.25, 0);
  finial.push(orb);
  addCylinder(finial, 0.1, 0.14, 1.5, 6, 0, topY + topH + 5.15, 0);
  const tip = new THREE.ConeGeometry(0.18, 0.65, 6);
  tip.translate(0, topY + topH + 6.15, 0);
  finial.push(tip);
  const fm = mergedMesh(finial, mats.gold, true, false);
  if (fm) g.add(fm);

  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.44), getPlaqueMaterial('岳阳楼'));
  plaque.position.set(0, baseY + 3.65, lowerD / 2 + 0.06);
  g.add(plaque);
  const plaqueTop = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 1.1), getPlaqueMaterial('巴陵胜状'));
  plaqueTop.position.set(0, topY + topH * 0.58, topD / 2 + 0.04);
  g.add(plaqueTop);

  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    add(g, new THREE.SphereGeometry(0.2, 7, 5), mats.lanternRed,
      Math.cos(a) * (midW / 2 + 0.7), midY + 0.65, Math.sin(a) * (midD / 2 + 0.7));
  }
  for (const sx of [-1, 1]) {
    add(g, new THREE.SphereGeometry(0.22, 8, 6), mats.lanternRed, sx * 3.6, topY + 0.75, topD / 2 + 1.0);
  }

  g.position.set(TOWER.x, TOWER.y, TOWER.z);
  root.add(g);
  return g;
}

function cityGate(root, x, z, rot, label) {
  const g = new THREE.Group();
  const wallH = 5.4;
  const span = 15;
  const open = 4.2;
  const side = (span - open) / 2;
  const wallMat = mat(0x8f8674, 0.94);
  box(g, side, wallH, 3.4, wallMat, -(open + side) / 2, wallH / 2, 0);
  box(g, side, wallH, 3.4, wallMat, (open + side) / 2, wallH / 2, 0);
  box(g, open, 1.6, 3.4, wallMat, 0, wallH - 0.8, 0);
  box(g, span, 0.4, 3.8, stoneBase, 0, wallH - 0.2, 0);
  for (let i = 0; i < 7; i++) {
    box(g, 0.7, 0.85, 0.6, wallMat, -span / 2 + 0.45 + i * 2.15, wallH + 0.45, 1.45);
    box(g, 0.7, 0.85, 0.6, wallMat, -span / 2 + 0.45 + i * 2.15, wallH + 0.45, -1.45);
  }
  const gateDoor = new THREE.Mesh(new THREE.PlaneGeometry(open - 0.6, wallH - 1.9), mats.lattice);
  gateDoor.position.set(0, (wallH - 1.9) / 2 + 0.2, 1.72);
  g.add(gateDoor);
  const gr = createRoof({
    width: span + 2.5,
    depth: 5.8,
    height: 2.2,
    cornerLift: 1.0,
    curve: 1.5,
    ridgeRatio: 0.55,
    hasRidge: true,
    beasts: false,
  });
  gr.position.y = wallH + 1.2;
  gr.traverse((o) => {
    if (o.isMesh && o.material === mats.roof) o.material = townTile;
  });
  g.add(gr);
  if (label) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.0), getPlaqueMaterial(label));
    p.position.set(0, wallH + 0.55, 1.96);
    g.add(p);
  }
  g.position.set(x, HEADLAND_TOP, z);
  g.rotation.y = rot;
  root.add(g);
}

function archway(root, x, z, rot, label) {
  const g = new THREE.Group();
  for (const sx of [-1, 1]) {
    box(g, 0.9, 5.4, 0.9, cinnabar, sx * 3.4, 2.7, 0);
    box(g, 1.5, 0.5, 1.5, stoneBase, sx * 3.4, 0.25, 0);
  }
  box(g, 8.4, 0.8, 1.1, cinnabar, 0, 5.1, 0);
  const r = createRoof({
    width: 10.2,
    depth: 3.4,
    height: 1.6,
    cornerLift: 0.9,
    curve: 1.5,
    ridgeRatio: 0.55,
    hasRidge: true,
    beasts: false,
  });
  r.position.y = 5.5;
  r.traverse((o) => {
    if (o.isMesh && o.material === mats.roof) o.material = townTile;
  });
  g.add(r);
  if (label) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.12), getPlaqueMaterial(label));
    p.position.set(0, 4.1, 0.58);
    g.add(p);
  }
  g.position.set(x, HEADLAND_TOP, z);
  g.rotation.y = rot;
  root.add(g);
}

function islandWall(root) {
  const cx = TOWER.x;
  const cz = TOWER.z;
  const rx = 34;
  const rz = 28;
  const wallMat = mat(0x948b77, 0.94);
  const segs = 20;
  const a0 = -1.45;
  const a1 = 1.45;
  for (let i = 0; i < segs; i++) {
    const t0 = a0 + ((a1 - a0) * i) / segs;
    const t1 = a0 + ((a1 - a0) * (i + 1)) / segs;
    if (Math.abs((t0 + t1) / 2) < 0.22) continue;
    const x0 = cx + Math.sin(t0) * rx;
    const z0 = cz + Math.cos(t0) * rz;
    const x1 = cx + Math.sin(t1) * rx;
    const z1 = cz + Math.cos(t1) * rz;
    const len = Math.hypot(x1 - x0, z1 - z0) + 0.45;
    const a = (t0 + t1) / 2;
    box(root, len, 2.5, 1.3, wallMat, (x0 + x1) / 2, TOWER.y + 1.25, (z0 + z1) / 2, a);
    for (let k = 0; k < 4; k++) {
      const tt = t0 + ((t1 - t0) * (k + 0.5)) / 4;
      box(root, 0.72, 0.72, 1.2, wallMat, cx + Math.sin(tt) * rx, TOWER.y + 2.86, cz + Math.cos(tt) * rz, a);
    }
  }
  for (const side of [-1, 1]) {
    const t = side * 0.23;
    const px = cx + Math.sin(t) * rx;
    const pz = cz + Math.cos(t) * rz;
    box(root, 2.2, 4.1, 2.2, wallMat, px, TOWER.y + 2.05, pz, t);
    add(root, new THREE.SphereGeometry(0.22, 7, 5), mats.lanternRed, px, TOWER.y + 3.3, pz + 1.0);
  }
  box(root, 13, 0.9, 1.4, stoneBase, cx, TOWER.y + 4.35, cz + rz + 0.2, 0);
}

function junshanPolygon() {
  const pts = [];
  const r = rng(9127);
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2;
    const wobble = 1 + Math.sin(i * 2.1 + 0.4) * 0.045 + (r() - 0.5) * 0.07;
    pts.push([JUNSHAN.x + Math.cos(a) * JUNSHAN.rx * wobble, JUNSHAN.z + Math.sin(a) * JUNSHAN.rz * wobble]);
  }
  return pts;
}

function buildJunshan(staticRoot, instRoot, stats) {
  const pts = junshanPolygon();
  staticRoot.add(landMass(pts, 4.4, mat(0x707c54, 1)));
  staticRoot.add(landCap(pts, JUNSHAN.h, mats.grass));

  const hillX = 130;
  const hillZ = -188;
  const baseY = JUNSHAN.h;
  const tiers = [
    { r: 47, h: 0.9 },
    { r: 35, h: 0.9 },
    { r: 23, h: 0.9 },
  ];
  tiers.forEach((tier, i) => {
    const y = baseY + tier.h * i;
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(tier.r, tier.r * 1.04, tier.h, 30), i % 2 ? teaRowMat : teaMat);
    mesh.position.set(hillX, y + tier.h / 2, hillZ);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    staticRoot.add(mesh);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(tier.r + 0.25, tier.r + 0.25, 0.18, 30, 1, true), mats.stone);
    rim.position.set(hillX, y + 0.05, hillZ);
    staticRoot.add(rim);
  });
  const cap = new THREE.Mesh(new THREE.CircleGeometry(23, 30), teaRowMat);
  cap.rotation.x = -Math.PI / 2;
  cap.position.set(hillX, baseY + 2.72, hillZ);
  cap.receiveShadow = true;
  staticRoot.add(cap);

  const bushGeo = new THREE.IcosahedronGeometry(0.62, 0);
  bushGeo.scale(1.1, 0.68, 1.05);
  const bushCount = 248;
  instanced(instRoot, bushGeo, teaMat, bushCount, (d, i) => {
    const tier = i % 3;
    const ring = Math.floor(i / 3);
    const perRing = tier === 0 ? 42 : tier === 1 ? 26 : 14;
    const rr = ring % 4;
    const rad = tier === 0 ? 28 + rr * 4.6 : tier === 1 ? 17 + rr * 4.0 : 7 + rr * 3.7;
    const a = ((i * 2.399) % (Math.PI * 2)) + rr * 0.21;
    d.position.set(hillX + Math.cos(a) * rad, baseY + 0.5 + tier * 0.9, hillZ + Math.sin(a) * rad);
    const s = 0.78 + ((i * 37) % 9) * 0.05;
    d.scale.set(s, s * (0.82 + (i % 5) * 0.06), s);
    d.rotation.y = a * 1.7;
  }, false);
  stats.tea = bushCount;

  const hillPav = createHexPavilion({ radius: 3.2, wallH: 2.6, roofH: 3.0, baseH: 0.55, name: '望湖亭' });
  hillPav.position.set(hillX - 1, baseY + 2.7, hillZ + 1);
  staticRoot.add(hillPav);

  const temple = createPavilion({
    w: 12.5, d: 8.6, wallH: 3.8, roofH: 3.2, eave: 2.0, baseH: 0.75,
    bays: 3, name: '湘妃祠', open: true, rail: true,
  });
  temple.position.set(176, JUNSHAN.h, -148);
  temple.rotation.y = -0.35;
  staticRoot.add(temple);

  const bambooSpots = [
    [96, -140, 7.2], [112, -124, 6.4], [202, -186, 7.6], [192, -205, 6.8],
    [118, -205, 6.6], [214, -158, 6.2], [88, -170, 6.8], [178, -214, 7.1],
    [204, -132, 5.8], [130, -120, 5.6], [74, -158, 6.0], [160, -102, 5.4],
  ];
  for (let i = 0; i < bambooSpots.length; i++) {
    const [x, z, h] = bambooSpots[i];
    const b = createBamboo({ height: h, radius: 2.1, seed: 610 + i });
    b.position.set(x, JUNSHAN.h, z);
    staticRoot.add(b);
  }
  stats.bamboo = bambooSpots.length * 14;

  const treeSpots = [
    [92, -158, 1.0, 11], [110, -136, 0.9, 12], [208, -176, 1.0, 13],
    [186, -200, 0.85, 14], [150, -108, 0.9, 15], [66, -186, 0.8, 16],
  ];
  treeSpots.forEach(([x, z, s, seed]) => {
    const t = createWillow({ height: 7.2, spread: 2.6, seed });
    t.position.set(x, JUNSHAN.h, z);
    t.scale.setScalar(s);
    staticRoot.add(t);
  });
  const pines = [
    [80, -132, 1.0], [214, -146, 0.85], [196, -196, 0.9], [104, -190, 0.8],
    [142, -118, 0.9], [60, -164, 0.75],
  ];
  pines.forEach(([x, z, s], i) => {
    const t = createTree({ height: 8.2, spread: 3.0, kind: 'pine', seed: 730 + i });
    t.position.set(x, JUNSHAN.h, z);
    t.scale.setScalar(s);
    staticRoot.add(t);
  });
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + 0.3;
    const sh = createShrub({ radius: 1.9, height: 1.6, seed: 880 + i });
    sh.position.set(JUNSHAN.x + Math.cos(a) * 62, JUNSHAN.h, JUNSHAN.z + Math.sin(a) * 48);
    staticRoot.add(sh);
  }

  const path = [
    [188, -118], [184, -132], [180, -146], [174, -160], [162, -174], [148, -184], [132, -186],
  ];
  pathStrip(staticRoot, path, 3.0, JUNSHAN.h, mats.path);
  const dockGroup = new THREE.Group();
  dock(dockGroup, 202, -116, 2.0, 13, 3.0);
  staticRoot.add(dockGroup);

  const rocks = [];
  scatterAlongPolygon(pts, 70, 0.5, 4.2, 4471, (x, z, r) => {
    rocks.push([x, z, 0.7 + r() * 1.4, r() * 6.28]);
  });
  const rockGeo = new THREE.DodecahedronGeometry(1, 0);
  instanced(instRoot, rockGeo, mats.rock, rocks.length, (d, i) => {
    const [x, z, s, a] = rocks[i];
    d.position.set(x, 0.35 + (i % 3) * 0.22, z);
    d.scale.set(s * 1.25, s * 0.8, s);
    d.rotation.set(a, a * 1.7, a * 0.4);
  }, false);

  return { pts };
}

function smallIslet(g, x, z, rx, rz, h) {
  const bank = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.1, h + 1.6, 30), mats.stone);
  bank.scale.set(rx, 1, rz);
  bank.position.set(x, (h - 1.6) / 2, z);
  bank.castShadow = true;
  bank.receiveShadow = true;
  g.add(bank);
  const top = new THREE.Mesh(new THREE.CircleGeometry(1, 32), mats.grass);
  top.rotation.x = -Math.PI / 2;
  top.scale.set(rx * 0.985, rz * 0.985, 1);
  top.position.set(x, h, z);
  top.receiveShadow = true;
  g.add(top);
}

export function buildDongtingScene() {
  const root = new THREE.Group();
  const staticRoot = new THREE.Group();
  const instRoot = new THREE.Group();
  const farRoot = new THREE.Group();
  const dynamic = new THREE.Group();
  root.add(dynamic);
  const stats = {
    yueyang: 1,
    islands: 4,
    tea: 0,
    bamboo: 0,
    houses: 0,
    boats: 0,
    birds: 0,
    cranes: 0,
    reeds: 0,
    lotus: 0,
    willows: 0,
    pines: 0,
  };

  const waterMaterial = makeWaterMaterial();
  waterMaterial.uniforms.uDeep.value.set(0x2a4650);
  waterMaterial.uniforms.uShallow.value.set(0x78939a);
  waterMaterial.uniforms.uSky.value.set(0xcfd8d6);

  const bed = new THREE.Mesh(new THREE.PlaneGeometry(3600, 3000), mats.lakeBed);
  bed.rotation.x = -Math.PI / 2;
  bed.position.set(0, -2.8, -380);
  bed.receiveShadow = true;
  staticRoot.add(bed);

  const lakeGeo = new THREE.PlaneGeometry(3400, 2900, 112, 88);
  lakeGeo.rotateX(-Math.PI / 2);
  const lake = new THREE.Mesh(lakeGeo, waterMaterial);
  lake.position.set(0, 0.12, -380);
  lake.renderOrder = 1;
  root.add(lake);

  staticRoot.add(landMass(HEADLAND, 4.8, mat(0x6d7952, 1)));
  staticRoot.add(landCap(HEADLAND, HEADLAND_TOP, mats.grass));
  pathStrip(staticRoot, HEADLAND_PATH, 6.4, HEADLAND_TOP, mats.path);

  const topBank = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.07, 5.6, 52), mats.stone);
  topBank.scale.set(34, 1, 28);
  topBank.position.set(TOWER.x, (TOWER.y - 5.6 / 2), TOWER.z);
  topBank.castShadow = true;
  topBank.receiveShadow = true;
  staticRoot.add(topBank);
  const topCap = new THREE.Mesh(new THREE.CircleGeometry(1, 52), stonePave);
  topCap.rotation.x = -Math.PI / 2;
  topCap.scale.set(34, 28, 1);
  topCap.position.set(TOWER.x, TOWER.y + 0.03, TOWER.z);
  topCap.receiveShadow = true;
  staticRoot.add(topCap);

  yueyangTower(staticRoot);
  islandWall(staticRoot);
  const pavA = createHexPavilion({ radius: 2.8, wallH: 2.5, roofH: 2.8, baseH: 0.5, name: '仙梅亭' });
  pavA.position.set(19, TOWER.y, 7);
  pavA.rotation.y = 0.35;
  staticRoot.add(pavA);
  const pavB = createHexPavilion({ radius: 2.8, wallH: 2.5, roofH: 2.8, baseH: 0.5, name: '三醉亭' });
  pavB.position.set(61, TOWER.y, 7);
  pavB.rotation.y = -0.35;
  staticRoot.add(pavB);

  cityGate(staticRoot, -88, 99, 2.16, '岳阳门');
  archway(staticRoot, -402, 326, 2.16, '巴陵胜状');
  const bridge = createStoneBridge({ x: -12.5, z: 6, rot: 1.95, span: 59.2, width: 5.8, rise: 0.8 });
  bridge.position.y = 3.15;
  staticRoot.add(bridge);

  const willowSpots = [
    [-82, 68, 0.95], [-108, 92, 1.0], [-144, 122, 0.9], [-180, 152, 1.05],
    [-222, 185, 0.92], [-266, 218, 1.0], [-312, 250, 0.88], [-358, 282, 1.02],
    [-410, 318, 0.94], [-468, 358, 1.0], [-528, 404, 0.9], [-592, 454, 1.04],
    [-660, 508, 0.92], [-716, 550, 0.96], [-342, 246, 0.82], [-188, 174, 0.86],
  ];
  willowSpots.forEach(([x, z, s], i) => {
    const t = createWillow({ height: 7.2 + (i % 3) * 0.7, spread: 2.5, seed: 210 + i });
    t.position.set(x, HEADLAND_TOP, z);
    t.scale.setScalar(s);
    staticRoot.add(t);
    stats.willows++;
  });
  const pineSpots = [
    [-120, 110, 0.95], [-156, 140, 0.8], [-198, 174, 0.9], [-242, 204, 0.82],
    [-290, 240, 0.95], [-338, 272, 0.8], [-388, 306, 0.88], [-440, 344, 0.84],
    [-496, 384, 0.92], [-558, 430, 0.82], [-626, 480, 0.9], [-236, 186, 0.72],
    [-366, 290, 0.76], [-518, 398, 0.78],
  ];
  pineSpots.forEach(([x, z, s], i) => {
    const t = createTree({ height: 8.6 + (i % 3) * 0.8, spread: 3.0, kind: 'pine', seed: 320 + i });
    t.position.set(x, HEADLAND_TOP, z);
    t.scale.setScalar(s);
    staticRoot.add(t);
    stats.pines++;
  });
  for (let i = 0; i < 18; i++) {
    const p = HEADLAND_PATH[Math.min(HEADLAND_PATH.length - 1, 2 + (i % 12))];
    const side = i % 2 ? 1 : -1;
    const sh = createShrub({ radius: 1.5 + (i % 3) * 0.35, height: 1.4, seed: 520 + i });
    sh.position.set(p[0] + side * (10 + (i % 4) * 2), HEADLAND_TOP, p[1] - 8 + (i % 5) * 3);
    staticRoot.add(sh);
  }

  const townSpots = [
    [-121, 130, 8.5, 6.2, 3.5, 0], [-150, 150, 10, 7.2, 3.9, 1],
    [-180, 172, 7.4, 5.6, 3.2, 0], [-214, 196, 12.5, 9.0, 7.4, 2],
    [-246, 218, 8.2, 6.0, 3.4, 0], [-278, 240, 9.2, 6.6, 3.6, 1],
    [-310, 262, 7.6, 5.8, 3.2, 0], [-344, 286, 10.2, 7.2, 4.0, 0],
    [-380, 312, 7.2, 5.4, 3.2, 0], [-420, 342, 11, 8.2, 4.4, 1],
    [-464, 374, 8.0, 6.0, 3.4, 0], [-510, 408, 9.0, 7.0, 3.6, 0],
    [-560, 446, 8.2, 6.2, 3.2, 0], [-616, 488, 9.4, 7.0, 3.5, 0],
    [-674, 532, 7.8, 6.0, 3.2, 0],
  ];
  const nx = 0.56;
  const nz = 0.83;
  townSpots.forEach(([x, z, w, d, h, kind], i) => {
    const side = i <= 8 ? 1 : -1;
    townHouse(staticRoot, x + nx * side * 9.5, HEADLAND_TOP, z + nz * side * 9.5, 0.6, w, d, h, kind, 1000 + i);
    stats.houses++;
  });

  const pathPoints = [];
  for (let i = 0; i < 12; i++) {
    const t = i / 11;
    const idx = t * (HEADLAND_PATH.length - 1);
    const i0 = Math.floor(idx);
    const i1 = Math.min(HEADLAND_PATH.length - 1, i0 + 1);
    const k = idx - i0;
    pathPoints.push([
      HEADLAND_PATH[i0][0] * (1 - k) + HEADLAND_PATH[i1][0] * k,
      HEADLAND_PATH[i0][1] * (1 - k) + HEADLAND_PATH[i1][1] * k,
    ]);
  }
  pathPoints.forEach((p, i) => {
    const side = i % 2 ? 1 : -1;
    const lx = p[0] + nx * side * 4.8;
    const lz = p[1] + nz * side * 4.8;
    cyl(staticRoot, 0.09, 0.12, 3.3, 6, darkWood, lx, HEADLAND_TOP + 1.65, lz);
    box(staticRoot, 0.7, 0.08, 0.7, darkWood, lx, HEADLAND_TOP + 3.3, lz, 0.6);
    add(staticRoot, new THREE.SphereGeometry(0.23, 8, 6), mats.lanternRed, lx, HEADLAND_TOP + 2.85, lz);
  });

  const dockSpots = [[-187, 220], [-291, 278], [-409, 344]];
  dockSpots.forEach(([dx, dz], i) => {
    dock(staticRoot, dx, dz, 0.6, 17 - i * 1.2, 3.1);
    for (let k = 0; k < 4; k++) {
      box(staticRoot, 4.6, 0.3, 1.0, stoneBase, dx - nx * (3.6 + k * 0.9), HEADLAND_TOP - 0.45 - k * 0.9, dz - nz * (3.6 + k * 0.9), 0.6);
    }
  });

  const jun = buildJunshan(staticRoot, instRoot, stats);
  smallIslet(staticRoot, 246, -231, 45, 35, 2.9);
  smallIslet(staticRoot, 61, -235, 41, 33, 2.7);
  const pavC = createHexPavilion({ radius: 3.0, wallH: 2.5, roofH: 2.8, baseH: 0.5, name: '朗吟亭' });
  pavC.position.set(246, 2.9, -231);
  pavC.rotation.y = 0.4;
  staticRoot.add(pavC);
  const isletTree = createWillow({ height: 6.8, spread: 2.4, seed: 911 });
  isletTree.position.set(228, 2.9, -238);
  staticRoot.add(isletTree);
  const isletPine = createTree({ height: 7.5, spread: 2.8, kind: 'pine', seed: 912 });
  isletPine.position.set(61, 2.7, -238);
  staticRoot.add(isletPine);

  const reedSpots = [];
  const addReeds = (x, z, y, scale, rot) => reedSpots.push({ x, z, y, scale, rot });
  const rr = rng(7311);
  scatterAlongPolygon(HEADLAND, 620, 0.5, 4.6, 7711, (x, z, r) => {
    const bank = r() < 0.28;
    addReeds(x, z, bank ? HEADLAND_TOP - 0.15 : -0.22, 0.85 + r() * 0.8, r() * 6.28);
  });
  scatterAlongPolygon(jun.pts, 430, 0.4, 3.8, 8811, (x, z, r) => {
    addReeds(x, z, -0.16, 0.8 + r() * 0.85, r() * 6.28);
  });
  const reedPatches = [
    [272, 318, 46, 330], [-86, 330, 38, 240], [356, 132, 34, 210],
    [40, -210, 30, 160], [-290, 460, 40, 230], [190, 60, 24, 140],
    [58, 438, 30, 170], [330, 428, 26, 130],
  ];
  reedPatches.forEach(([cx, cz, rad, count], pi) => {
    for (let i = 0; i < count; i++) {
      const a = rr() * Math.PI * 2;
      const d = Math.sqrt(rr()) * rad;
      addReeds(cx + Math.cos(a) * d, cz + Math.sin(a) * d * 0.72, -0.2, 0.9 + rr() * 0.9, rr() * 6.28);
    }
  });
  const reedGeo = reedClusterGeometry();
  const reedMesh = new THREE.InstancedMesh(reedGeo, reedMat, reedSpots.length);
  const dummy = new THREE.Object3D();
  const reedTint = new THREE.Color();
  const reedPalette = [0xc3ad75, 0xb39c66, 0xa8925f, 0xcbb985, 0x9c8b5c];
  reedSpots.forEach((s, i) => {
    dummy.position.set(s.x, s.y, s.z);
    dummy.rotation.set(0, s.rot, 0);
    dummy.scale.set((0.7 + (i % 4) * 0.16) * s.scale, s.scale, (0.7 + (i % 3) * 0.2) * s.scale);
    dummy.updateMatrix();
    reedMesh.setMatrixAt(i, dummy.matrix);
    reedMesh.setColorAt(i, reedTint.setHex(reedPalette[i % reedPalette.length]));
  });
  reedMesh.instanceMatrix.needsUpdate = true;
  if (reedMesh.instanceColor) reedMesh.instanceColor.needsUpdate = true;
  reedMesh.castShadow = false;
  reedMesh.receiveShadow = false;
  instRoot.add(reedMesh);
  const plumeMesh = new THREE.InstancedMesh(plumeGeometry(), plumeMat, Math.floor(reedSpots.length * 0.62));
  for (let i = 0; i < plumeMesh.count; i++) {
    const s = reedSpots[i * 1.6 | 0];
    dummy.position.set(s.x, s.y + 0.3, s.z);
    dummy.rotation.set(0, s.rot + 1.2, 0);
    dummy.scale.setScalar(s.scale * (0.9 + (i % 3) * 0.12));
    dummy.updateMatrix();
    plumeMesh.setMatrixAt(i, dummy.matrix);
  }
  plumeMesh.instanceMatrix.needsUpdate = true;
  plumeMesh.receiveShadow = false;
  instRoot.add(plumeMesh);
  stats.reeds = reedSpots.length;

  const lotusBeds = [
    [258, 282, 56, 420], [-96, 318, 40, 270], [348, 72, 46, 260],
    [88, -58, 28, 140], [208, -118, 34, 170], [-8, 158, 26, 120],
    [150, 420, 42, 280], [350, 360, 26, 130],
  ];
  const padSpots = [];
  const lr = rng(5567);
  lotusBeds.forEach(([cx, cz, rad, count]) => {
    for (let i = 0; i < count; i++) {
      const a = lr() * Math.PI * 2;
      const d = Math.sqrt(lr()) * rad;
      padSpots.push([cx + Math.cos(a) * d, cz + Math.sin(a) * d * 0.78, lr() * 6.28, 0.7 + lr() * 0.8]);
    }
  });
  const padMesh = new THREE.InstancedMesh(lotusPadGeometry(), padMat, padSpots.length);
  const padTint = new THREE.Color();
  const padPalette = [0x6c8a59, 0x5f8050, 0x79905b, 0x8a9464, 0x55784d];
  padSpots.forEach((s, i) => {
    dummy.position.set(s[0], 0.17, s[1]);
    dummy.rotation.set(0, s[2], 0);
    dummy.scale.setScalar(s[3]);
    dummy.updateMatrix();
    padMesh.setMatrixAt(i, dummy.matrix);
    padMesh.setColorAt(i, padTint.setHex(padPalette[i % padPalette.length]));
  });
  padMesh.instanceMatrix.needsUpdate = true;
  if (padMesh.instanceColor) padMesh.instanceColor.needsUpdate = true;
  padMesh.receiveShadow = false;
  instRoot.add(padMesh);
  const flowerIdx = [];
  padSpots.forEach((s, i) => {
    if (i % 5 === 0) flowerIdx.push(i);
  });
  const flowerMesh = new THREE.InstancedMesh(lotusFlowerGeometry(), flowerMat, flowerIdx.length);
  flowerIdx.forEach((idx, i) => {
    const s = padSpots[idx];
    dummy.position.set(s[0] + 0.12, 0.22, s[1] + 0.08);
    dummy.rotation.set(0, s[2] + i * 0.7, 0);
    dummy.scale.setScalar(1.45 + (i % 4) * 0.16);
    dummy.updateMatrix();
    flowerMesh.setMatrixAt(i, dummy.matrix);
  });
  flowerMesh.instanceMatrix.needsUpdate = true;
  flowerMesh.receiveShadow = false;
  instRoot.add(flowerMesh);
  stats.lotus = padSpots.length;

  const goosenDefs = [
    { cx: 110, cz: 210, rx: 66, rz: 36, h: 29, speed: 0.045, phase: 0.4, count: 11, scale: 1.8 },
    { cx: 30, cz: -240, rx: 130, rz: 70, h: 54, speed: 0.018, phase: 2.2, count: 13, scale: 1.5 },
    { cx: -200, cz: -350, rx: 150, rz: 80, h: 76, speed: -0.012, phase: 4.1, count: 11, scale: 1.7 },
    { cx: 260, cz: -60, rx: 100, rz: 60, h: 62, speed: 0.022, phase: 1.1, count: 9, scale: 1.4 },
    { cx: 120, cz: 40, rx: 55, rz: 30, h: 34, speed: 0.038, phase: 3.3, count: 9, scale: 2.0 },
    { cx: 235, cz: 372, rx: 34, rz: 18, h: 24, speed: 0.05, phase: 5.1, count: 8, scale: 2.3 },
  ];
  const gooseData = [];
  goosenDefs.forEach((f, fi) => {
    for (let i = 0; i < f.count; i++) {
      const rank = Math.ceil(i / 2);
      const side = i === 0 ? 0 : i % 2 ? 1 : -1;
      gooseData.push({
        f,
        rank,
        side,
        lat: side * rank * 3.15 + (fi % 2 ? 0.4 : -0.3),
        back: rank * 4.15,
        scale: f.scale * (0.9 + ((i * 7 + fi) % 5) * 0.05),
        bank: -side * 0.12,
      });
    }
  });
  const gooseMesh = new THREE.InstancedMesh(gooseGeometry(), gooseMat, gooseData.length);
  gooseMesh.frustumCulled = false;
  gooseMesh.castShadow = false;
  gooseMesh.receiveShadow = false;
  instRoot.add(gooseMesh);
  stats.birds = gooseData.length;

  const craneSpots = [
    [302, 266, 0.3], [316, 252, 1.8], [287, 290, 3.1], [325, 282, 5.2],
    [-68, 295, 0.6], [-55, 307, 2.2], [-83, 312, 4.4],
    [158, -112, 1.1], [174, -121, 3.4], [144, -106, 5.6],
    [34, 24, 0.2], [50, 17, 2.7],
  ];
  const craneMesh = new THREE.InstancedMesh(craneGeometry(), mat(0xe8e3d5, 0.85), craneSpots.length);
  craneSpots.forEach(([x, z, a], i) => {
    dummy.position.set(x, 0.14, z);
    dummy.rotation.set(0, a, 0);
    dummy.scale.setScalar(0.95 + (i % 3) * 0.12);
    dummy.updateMatrix();
    craneMesh.setMatrixAt(i, dummy.matrix);
  });
  craneMesh.instanceMatrix.needsUpdate = true;
  craneMesh.castShadow = false;
  instRoot.add(craneMesh);
  stats.cranes = craneSpots.length;

  const boatDefs = [
    { cx: 250, cz: 130, rx: 86, rz: 46, phase: 0.3, speed: 0.023, scale: 1.6, sail: 0xeee2c8, cormorant: true },
    { cx: 20, cz: 92, rx: 56, rz: 30, phase: 2.5, speed: -0.021, scale: 1.25, sail: 0xdfcbaa, cormorant: false },
    { cx: 330, cz: -42, rx: 70, rz: 38, phase: 4.1, speed: 0.017, scale: 1.5, sail: 0xc96d50, cormorant: true },
    { cx: 130, cz: -180, rx: 56, rz: 30, phase: 1.2, speed: -0.014, scale: 1.15, sail: 0xf2e8d2, cormorant: false },
    { cx: -140, cz: 28, rx: 52, rz: 26, phase: 3.0, speed: 0.02, scale: 1.35, sail: 0xe4d5b4, cormorant: true },
    { cx: 382, cz: 306, rx: 42, rz: 20, phase: 1.9, speed: -0.018, scale: 1.1, sail: 0xf0e3c8, cormorant: false },
    { cx: -62, cz: 306, rx: 48, rz: 24, phase: 0.7, speed: 0.016, scale: 1.2, sail: 0xdccaa8, cormorant: true },
  ];
  const boats = boatDefs.map((def) => {
    const boat = makeBoat({ sail: def.sail, scale: def.scale, cormorant: def.cormorant, mast: true });
    boat.userData.def = def;
    dynamic.add(boat);
    return boat;
  });
  const mooredA = makeBoat({ scale: 1.0, sail: 0xe8dcc2, cormorant: false, mast: true });
  mooredA.position.set(-181, 0.3, 238);
  mooredA.rotation.y = 0.6;
  staticRoot.add(mooredA);
  const mooredB = makeBoat({ scale: 0.82, sail: 0xd8c9ad, cormorant: true, mast: false });
  mooredB.position.set(196, 0.3, -104);
  mooredB.rotation.y = 2.2;
  staticRoot.add(mooredB);
  stats.boats = boats.length + 2;

  const mistTex = radialTexture([
    [0, 'rgba(246,250,248,0.78)'],
    [0.38, 'rgba(230,240,236,0.42)'],
    [1, 'rgba(224,236,232,0)'],
  ]);
  const mists = [];
  const mistDefs = [
    [-620, -660, 7, 300, 120, 0.14], [-360, -720, 9, 360, 130, 0.16],
    [-60, -680, 8, 300, 110, 0.13], [220, -740, 10, 380, 140, 0.16],
    [520, -670, 7, 320, 120, 0.13], [-820, -560, 6, 260, 100, 0.1],
    [760, -600, 7, 300, 110, 0.11], [-260, -480, 5, 240, 100, 0.1],
    [150, -210, 5, 210, 90, 0.16], [230, -160, 4, 160, 70, 0.12],
    [-340, 230, 4, 180, 80, 0.09], [260, 300, 2.8, 160, 70, 0.08],
  ];
  mistDefs.forEach(([x, z, y, sx, sz, op], i) => {
    mists.push(mistPatch(dynamic, mistTex, x, z, y, sx, sz, op, 0.035 + (i % 3) * 0.012, i * 0.9));
  });

  const farShore = [
    [-1500, -980], [1500, -980], [1500, -1180], [-1500, -1180],
  ];
  farRoot.add(landMass(farShore, 2.0, mats.hillFar));
  const hills = [
    [-1020, -930, 300, 150, 78], [-720, -980, 340, 170, 108], [-400, -1010, 380, 180, 126],
    [-40, -980, 330, 170, 92], [320, -1000, 380, 190, 132], [700, -960, 330, 160, 104],
    [1050, -920, 280, 130, 78], [-1280, -830, 220, 110, 62], [1280, -830, 230, 120, 66],
  ];
  hills.forEach(([x, z, rx, rz, h], i) => {
    const hill = createHill({ x, z, rx, rz, h, mat: mats.hillFar, seed: 1300 + i });
    farRoot.add(hill);
  });
  const midHills = [
    [-780, -560, 300, 120, 54], [-420, -620, 330, 140, 68], [-60, -650, 300, 130, 52],
    [380, -620, 340, 150, 74], [780, -560, 280, 120, 50],
  ];
  midHills.forEach(([x, z, rx, rz, h], i) => {
    const hill = createHill({ x, z, rx, rz, h, mat: mats.hill, seed: 1500 + i });
    farRoot.add(hill);
  });
  const far = mergeStaticGroup(farRoot);
  far.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = false;
      o.receiveShadow = false;
    }
  });
  root.add(far);

  const merged = mergeStaticGroup(staticRoot);
  root.add(merged);
  root.add(instRoot);

  const tmp = new THREE.Object3D();
  function updateGeese(time) {
    gooseData.forEach((g, i) => {
      const f = g.f;
      const a = time * f.speed + f.phase;
      const cx = f.cx + Math.cos(a) * f.rx;
      const cz = f.cz + Math.sin(a) * f.rz;
      const sign = Math.sign(f.speed) || 1;
      let fx = -Math.sin(a) * f.rx * sign;
      let fz = Math.cos(a) * f.rz * sign;
      const fl = Math.hypot(fx, fz) || 1;
      fx /= fl;
      fz /= fl;
      const rx = fz;
      const rz = -fx;
      const px = cx + rx * g.lat - fx * g.back;
      const pz = cz + rz * g.lat - fz * g.back;
      const py = f.h + Math.sin(time * 0.45 + f.phase) * 2.2 + (g.rank % 2) * 0.35;
      tmp.position.set(px, py, pz);
      tmp.rotation.set(0, Math.atan2(fx, fz), g.bank);
      tmp.scale.setScalar(g.scale);
      tmp.updateMatrix();
      gooseMesh.setMatrixAt(i, tmp.matrix);
    });
    gooseMesh.instanceMatrix.needsUpdate = true;
  }

  const life = {
    update(time, dt) {
      timeUniform.value = time;
      waterMaterial.uniforms.uTime.value = time;
      boats.forEach((b) => {
        const d = b.userData.def;
        const a = time * d.speed + d.phase;
        const sign = Math.sign(d.speed) || 1;
        const x = d.cx + Math.cos(a) * d.rx;
        const z = d.cz + Math.sin(a) * d.rz;
        b.position.set(x, 0.12 + Math.sin(time * 0.9 + d.phase) * 0.07, z);
        b.rotation.y = Math.atan2(-Math.sin(a) * d.rx * sign, Math.cos(a) * d.rz * sign);
        b.rotation.z = Math.sin(time * 0.8 + d.phase) * 0.022;
        b.rotation.x = Math.sin(time * 0.62 + d.phase) * 0.014;
      });
      updateGeese(time);
      mists.forEach((m, i) => {
        m.mesh.position.x = m.baseX + Math.sin(time * m.speed + m.phase) * 22;
        m.mesh.position.z = m.baseZ + Math.cos(time * m.speed * 0.7 + m.phase) * 10;
        m.mesh.material.opacity = m.opacity * (0.72 + 0.28 * (0.5 + 0.5 * Math.sin(time * 0.11 + m.phase)));
      });
      mats.lanternRed.emissiveIntensity = 0.55 + Math.sin(time * 1.7) * 0.08;
    },
  };

  life.update(0, 0.016);

  return {
    group: root,
    waterMaterial,
    life,
    stats,
    lanternMaterial: mats.lanternRed,
    islands: [[TOWER.x, TOWER.z], [JUNSHAN.x, JUNSHAN.z], [246, -231], [61, -235]],
  };
}





