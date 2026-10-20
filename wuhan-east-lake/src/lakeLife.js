import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mats } from './materials.js';
import { addBox, mergedMesh } from './geometry.js';
import { terrainHeight, WATER_Y } from './terrain.js';
import { hash } from './detailKit.js';
import { LAKE_RING } from './lakeData.js';

function boatGeometry() {
  const dark = [];
  const light = [];
  const body = new THREE.CylinderGeometry(1.2, 1.45, 1.05, 7);
  body.scale(3.2, 1, 1);
  body.translate(0, 0.38, 0);
  dark.push(body);
  const deck = new THREE.BoxGeometry(5.8, 0.16, 2.1);
  deck.translate(0, 0.96, 0);
  light.push(deck);
  const rim = new THREE.TorusGeometry(1.31, 0.06, 5, 14);
  rim.rotateX(Math.PI / 2);
  rim.scale(3.05, 1.02, 1);
  rim.translate(0, 0.9, 0);
  dark.push(rim);
  for (let i = 0; i < 8; i++) {
    addBox(dark, 0.055, 0.05, 2.05, -2.5 + i * 0.78, 0.87, 0);
  }
  for (const sx of [-1.75, 0.35]) {
    for (const sz of [-0.88, 0.88]) addBox(dark, 0.075, 1.08, 0.075, sx, 1.48, sz);
  }
  addBox(light, 2.4, 0.07, 0.07, -0.7, 2.04, 0.88);
  addBox(light, 2.4, 0.07, 0.07, -0.7, 2.04, -0.88);
  const cab = new THREE.BoxGeometry(2.2, 1.15, 1.75);
  cab.translate(-0.7, 1.5, 0);
  light.push(cab);
  const roof = new THREE.ConeGeometry(1.55, 0.8, 4);
  roof.rotateY(Math.PI / 4);
  roof.translate(-0.7, 2.35, 0);
  dark.push(roof);
  const mast = new THREE.CylinderGeometry(0.055, 0.075, 2.3, 5);
  mast.translate(1.9, 2.0, 0);
  dark.push(mast);
  const oars = [];
  for (const sz of [-1, 1]) {
    const o = new THREE.BoxGeometry(0.07, 0.07, 3.1);
    o.rotateY(sz * 0.28);
    o.translate(0.6, 1.1, sz * 1.15);
    oars.push(o);
    const blade = new THREE.BoxGeometry(0.24, 0.035, 0.55);
    blade.rotateY(sz * 0.28);
    blade.translate(0.15, 1.1, sz * 2.25);
    oars.push(blade);
  }
  const hull = mergedMesh([...dark, ...oars], mats.wood, true, true).geometry;
  const canopy = mergedMesh(light, mats.white, true, true).geometry;
  return { hull, canopy };
}

function makeBoats() {
  const defs = [
    [-120, -460, 0.4, 1.0], [80, -80, 2.1, 0.9],
    [250, 270, 1.2, 1.1], [-250, 430, 2.8, 0.85],
    [430, -290, 3.6, 0.95], [-160, 120, 1.6, 0.75],
    [320, 150, 0.2, 0.7], [-300, 60, 2.2, 0.65],
    [-80, -240, 1.4, 0.9], [180, 40, 2.7, 0.78],
    [-320, 220, 0.8, 0.85], [440, 60, 3.1, 0.7],
  ].filter(([x, z]) => terrainHeight(x, z) < WATER_Y - 0.05);
  const { hull, canopy } = boatGeometry();
  const group = new THREE.Group();
  const h = new THREE.InstancedMesh(hull, mats.wood, defs.length);
  const c = new THREE.InstancedMesh(canopy, mats.white, defs.length);
  for (const m of [h, c]) {
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.castShadow = true;
    m.receiveShadow = true;
    m.frustumCulled = false;
    group.add(m);
  }
  const wakes = [];
  for (const [x, z, rot, scale] of defs) {
    const fx = Math.cos(rot);
    const fz = -Math.sin(rot);
    for (const side of [-1, 1]) {
      const g = new THREE.PlaneGeometry(14 * scale, 2.8 * scale);
      g.rotateX(-Math.PI / 2);
      g.rotateY(rot);
      g.translate(x - fx * 8 * scale - fz * side * 1.5 * scale, WATER_Y + 0.035, z - fz * 8 * scale + fx * side * 1.5 * scale);
      wakes.push(g);
    }
  }
  const wake = mergedMesh(wakes, mats.wake, false, false);
  if (wake) {
    wake.renderOrder = 2;
    group.add(wake);
  }
  return { group, meshes: [h, c], defs };
}

function petalTexture() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d');
  const grad = ctx.createRadialGradient(32, 28, 2, 32, 32, 28);
  grad.addColorStop(0, 'rgba(255,236,240,0.95)');
  grad.addColorStop(0.45, 'rgba(250,196,212,0.9)');
  grad.addColorStop(1, 'rgba(242,170,192,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(32, 32, 27, 20, 0.5, 0, Math.PI * 2);
  ctx.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makePetals() {
  const count = 460;
  const bases = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  const clusters = [
    [-330, 150, 22, WATER_Y + 0.35],
    [-322, 738, 76, 0],
    [-280, 790, 40, 0],
    [180, 130, 26, WATER_Y + 0.35],
    [-380, 20, 18, WATER_Y + 0.35],
    [-370, 744, 32, 0],
    [-300, 760, 32, 0],
    [-238, 738, 24, 0],
    [-340, 190, 18, WATER_Y + 0.35],
    [-356, 120, 16, WATER_Y + 0.35],
  ];
  for (let i = 0; i < count; i++) {
    const c = clusters[i % clusters.length];
    const a = hash(12000, i * 3) * Math.PI * 2;
    const r = Math.sqrt(hash(12000, i * 5 + 1)) * c[2];
    const x = c[0] + Math.cos(a) * r;
    const z = c[1] + Math.sin(a) * r;
    const y = c[3] > 0 ? c[3] : Math.max(1, terrainHeight(x, z) + 1.2 + hash(12000, i + 7) * 3.2);
    bases[i * 3] = x;
    bases[i * 3 + 1] = y;
    bases[i * 3 + 2] = z;
    seeds[i] = hash(12000, i + 11);
  }
  const geo = new THREE.PlaneGeometry(1.75, 1.12);
  const mat = new THREE.MeshBasicMaterial({
    map: petalTexture(),
    color: 0xf6c8d6,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  for (let i = 0; i < count; i++) {
    const s = seeds[i];
    dummy.position.set(bases[i * 3], bases[i * 3 + 1], bases[i * 3 + 2]);
    dummy.rotation.set(s * 1.8, s * 5.2, s * 2.4);
    dummy.scale.setScalar(0.85 + s * 0.6);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.renderOrder = 2;
  return { mesh, bases, seeds, count };
}

function makeFlags() {
  const geos = [];
  const towerY = terrainHeight(600, -110) + 6.4;
  const spots = [
    [586, -121, towerY, 6.8], [614, -121, towerY, 6.8],
    [586, -99, towerY, 6.8], [614, -99, towerY, 6.8],
    [458, -152, terrainHeight(458, -152), 5.4],
    [478, -127, terrainHeight(478, -127), 5.4],
  ];
  for (let i = 0; i < spots.length; i++) {
    const [x, z, gy, h] = spots[i];
    const g = new THREE.PlaneGeometry(3.1, 1.85, 10, 4);
    g.translate(1.75, 0, 0);
    g.rotateY(i % 2 ? 0.2 : -0.15);
    g.translate(x, gy + h - 1.35, z);
    const n = g.attributes.position.count;
    const ph = new Float32Array(n);
    ph.fill(i * 0.37);
    g.setAttribute('aPhase', new THREE.Float32BufferAttribute(ph, 1));
    geos.push(g);
  }
  const geo = mergeGeometries(geos, false);
  geos.forEach((g) => g.dispose());
  const uniforms = { uTime: { value: 0 } };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.DoubleSide,
    vertexShader: `
      attribute float aPhase;
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec3 p = position;
        float w = uv.x;
        p.z += sin(uTime * 2.6 + aPhase * 6.28 + p.x * 0.55) * 0.34 * w;
        p.y += sin(uTime * 1.9 + aPhase * 4.1 + p.x * 0.4) * 0.14 * w;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      void main() {
        vec3 c = mix(vec3(0.52, 0.12, 0.09), vec3(0.78, 0.24, 0.17), vUv.y * 0.7 + 0.25);
        gl_FragColor = vec4(c, 1.0);
      }
    `,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  return { mesh, uniforms };
}

function foamTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 32;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 128, 32);
  for (let i = 0; i < 70; i++) {
    const x = (i * 47 % 128) + (i % 3) * 1.7;
    const y = 10 + (i * 13 % 13);
    const r = 1.2 + (i * 7 % 5) * 0.75;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3.2);
    g.addColorStop(0, 'rgba(244,251,249,0.55)');
    g.addColorStop(1, 'rgba(228,244,241,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y, r * 3.2, r * 1.1, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
}

function makeShoreFoam() {
  const n = LAKE_RING.length / 2;
  const geo = new THREE.PlaneGeometry(1, 1);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({
    map: foamTexture(),
    color: 0xf2fbf8,
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, n);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const x = LAKE_RING[i * 2];
    const z = LAKE_RING[i * 2 + 1];
    const dx = LAKE_RING[j * 2] - x;
    const dz = LAKE_RING[j * 2 + 1] - z;
    const len = Math.hypot(dx, dz) || 1;
    dummy.position.set(x + dx * 0.5, WATER_Y + 0.045, z + dz * 0.5);
    dummy.rotation.set(0, Math.atan2(-dz, dx), 0);
    dummy.scale.set(len * 1.08, 1, 3.1 + hash(15000, i) * 2.2);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.frustumCulled = false;
  mesh.renderOrder = 3;
  return mesh;
}

function makeKites() {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xb43d2c, roughness: 0.7, side: THREE.DoubleSide });
  const defs = [
    [-140, 82, -320, 0.4], [210, 118, 140, 1.8], [-260, 96, 390, 3.4],
    [360, 74, -120, 5.1], [-20, 104, -250, 2.6], [120, 126, 260, 4.2],
    [-360, 88, 80, 0.9],
  ];
  const list = [];
  for (const [x, y, z, phase] of defs) {
    const g = new THREE.Group();
    const parts = [];
    const body = new THREE.CircleGeometry(1.25, 4);
    body.rotateZ(Math.PI / 4);
    parts.push(body);
    for (let i = 0; i < 5; i++) {
      addBox(parts, 0.5 - i * 0.06, 0.5 - i * 0.06, 0.05, 0, -1.4 - i * 0.55, 0);
    }
    const bm = mergedMesh(parts, mat, false, false);
    if (bm) g.add(bm);
    g.position.set(x, y, z);
    g.userData = { x, y, z, phase };
    group.add(g);
    list.push(g);
  }
  return { group, list };
}

function makeBirds() {
  const group = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: 0x4e5c60, side: THREE.DoubleSide, transparent: true, opacity: 0.7 });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute([
    -1, 0, 0, 0, 0.32, 0, 0, 0, 0,
    1, 0, 0, 0, 0.32, 0, 0, 0, 0,
  ], 3));
  const count = 36;
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  for (let i = 0; i < count; i++) {
    const scale = 1.3 + hash(13000, i) * 1.5;
    dummy.position.set((hash(13000, i + 3) - 0.5) * 520, 20 + hash(13000, i + 7) * 70, (hash(13000, i + 11) - 0.5) * 430);
    dummy.rotation.set(0, hash(13000, i + 17) * 6.28, 0);
    dummy.scale.set(scale, scale, scale);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.frustumCulled = false;
  group.add(mesh);
  group.position.set(120, 92, -20);
  return group;
}

function makeSparkle() {
  const count = 340;
  const pos = new Float32Array(count * 3);
  const baseY = new Float32Array(count);
  const seeds = new Float32Array(count);
  let n = 0;
  for (let i = 0; i < count * 3 && n < count; i++) {
    const x = -520 + hash(14000, i * 3) * 1100;
    const z = -420 + hash(14000, i * 5 + 1) * 950;
    if (terrainHeight(x, z) > WATER_Y - 0.02) continue;
    pos[n * 3] = x;
    pos[n * 3 + 1] = WATER_Y + 0.12;
    pos[n * 3 + 2] = z;
    baseY[n] = WATER_Y + 0.12;
    seeds[n] = hash(14000, i + 7);
    n++;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xfff3d2, size: 1.6, transparent: true, opacity: 0.42,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.renderOrder = 2;
  return { points, geo, mat, count: n, baseY, seeds };
}

function makeFloatingLanterns() {
  const paper = [];
  const gold = [];
  const n = LAKE_RING.length / 2;
  for (let i = 2; i < n; i += 9) {
    const x = LAKE_RING[i * 2] * 0.93;
    const z = LAKE_RING[i * 2 + 1] * 0.93;
    if (terrainHeight(x, z) > WATER_Y - 0.1) continue;
    const g = new THREE.SphereGeometry(0.2, 7, 5);
    g.scale(1.15, 0.7, 1.15);
    g.translate(x, WATER_Y + 0.13, z);
    paper.push(g);
    const ring = new THREE.TorusGeometry(0.22, 0.035, 4, 10);
    ring.rotateX(Math.PI / 2);
    ring.translate(x, WATER_Y + 0.12, z);
    gold.push(ring);
    const tip = new THREE.ConeGeometry(0.1, 0.16, 6);
    tip.translate(x, WATER_Y + 0.28, z);
    paper.push(tip);
  }
  const group = new THREE.Group();
  const pm = mergedMesh(paper, mats.paper, false, false);
  if (pm) group.add(pm);
  const gm = mergedMesh(gold, mats.gold, false, false);
  if (gm) group.add(gm);
  return group;
}

export function createLakeLife() {
  const group = new THREE.Group();
  const boats = makeBoats();
  group.add(boats.group);
  group.add(makeShoreFoam());
  const petals = makePetals();
  group.add(petals.mesh);
  const flags = makeFlags();
  group.add(flags.mesh);
  const kites = makeKites();
  group.add(kites.group);
  const birds = makeBirds();
  group.add(birds);
  const sparkle = makeSparkle();
  group.add(sparkle.points);
  group.add(makeFloatingLanterns());
  group.userData = { boats, petals, flags, kites, birds, sparkle };
  return group;
}

const dummy = new THREE.Object3D();

export function updateLakeLife(extras, time) {
  const u = extras.userData;
  if (u.boats && u.boats.defs.length) {
    const { meshes, defs } = u.boats;
    for (let i = 0; i < defs.length; i++) {
      const [x, z, rot, scale] = defs[i];
      const ph = i * 1.37;
      dummy.position.set(x, WATER_Y - 0.22 + Math.sin(time * 0.85 + ph) * 0.07, z);
      dummy.rotation.set(Math.sin(time * 0.6 + ph) * 0.02, rot + Math.sin(time * 0.12 + ph) * 0.05, Math.sin(time * 0.72 + ph) * 0.025);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      for (const m of meshes) m.setMatrixAt(i, dummy.matrix);
    }
    for (const m of meshes) m.instanceMatrix.needsUpdate = true;
  }
  if (u.petals) {
    const { mesh, bases, seeds } = u.petals;
    for (let i = 0; i < seeds.length; i++) {
      const s = seeds[i];
      const bx = bases[i * 3];
      const by = bases[i * 3 + 1];
      const bz = bases[i * 3 + 2];
      dummy.position.set(
        bx + Math.sin(time * 0.32 + s * 11) * 4.2 + Math.sin(time * 0.11 + s * 4) * 3,
        by + Math.sin(time * 0.65 + s * 8) * 0.65,
        bz + Math.cos(time * 0.27 + s * 9) * 4.2
      );
      dummy.rotation.set(s * 1.8 + Math.sin(time * 0.5 + s * 7) * 0.7, s * 5.2 + time * 0.18, s * 2.4 + Math.cos(time * 0.42 + s * 5) * 0.6);
      dummy.scale.setScalar(0.85 + s * 0.6);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }
  if (u.flags) u.flags.uniforms.uTime.value = time;
  if (u.kites) {
    for (const k of u.kites.list) {
      const d = k.userData;
      k.position.y = d.y + Math.sin(time * 0.5 + d.phase) * 3.5;
      k.rotation.y = Math.sin(time * 0.24 + d.phase) * 0.35;
      k.rotation.z = Math.sin(time * 0.65 + d.phase) * 0.12;
    }
  }
  if (u.birds) {
    u.birds.rotation.y = Math.sin(time * 0.05) * 0.5;
    u.birds.position.y = 92 + Math.sin(time * 0.2) * 3;
  }
  if (u.sparkle) {
    const p = u.sparkle.geo.attributes.position;
    for (let i = 0; i < u.sparkle.count; i++) {
      p.setY(i, u.sparkle.baseY[i] + Math.sin(time * 1.4 + u.sparkle.seeds[i] * 9) * 0.07);
    }
    p.needsUpdate = true;
    u.sparkle.mat.opacity = 0.34 + Math.abs(Math.sin(time * 0.7)) * 0.22;
  }
}
