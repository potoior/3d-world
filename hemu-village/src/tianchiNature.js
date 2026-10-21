import * as THREE from 'three';
import { mats } from './materials.js';
import { addBox, addCylinder, addBar, mergedMesh } from './geometry.js';

const rockMat = new THREE.MeshStandardMaterial({ color: 0x747a76, roughness: 0.98 });
const rockDarkMat = new THREE.MeshStandardMaterial({ color: 0x525d5e, roughness: 1.0 });
const snowMat = new THREE.MeshStandardMaterial({ color: 0xf2f6f6, roughness: 0.88 });
const plankMat = new THREE.MeshStandardMaterial({ color: 0x7b5a3a, roughness: 0.92 });
const plankDarkMat = new THREE.MeshStandardMaterial({ color: 0x5a402a, roughness: 0.95 });
const flowerWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf1eee0, roughness: 0.86 });
const flowerGoldMat = new THREE.MeshStandardMaterial({ color: 0xe0b74f, roughness: 0.84 });
const flowerVioletMat = new THREE.MeshStandardMaterial({ color: 0x9a7db4, roughness: 0.86 });
const stemMat = new THREE.MeshStandardMaterial({ color: 0x557341, roughness: 0.95 });

const mistVertexShader = `
  attribute float aPhase;
  uniform float uTime;
  varying vec2 vUv;
  varying float vFade;
  void main() {
    vUv = uv;
    vec3 p = position;
    p.x += sin(uTime * 0.045 + aPhase) * 18.0;
    p.y += sin(uTime * 0.07 + aPhase * 1.9) * 2.2;
    vFade = 0.72 + 0.28 * sin(uTime * 0.11 + aPhase);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const mistFragmentShader = `
  uniform vec3 uColor;
  varying vec2 vUv;
  varying float vFade;
  void main() {
    float d = length(vUv - vec2(0.5));
    float a = smoothstep(0.52, 0.06, d);
    a *= smoothstep(0.0, 0.22, vUv.y) * smoothstep(1.0, 0.76, vUv.y);
    gl_FragColor = vec4(uColor, a * 0.2 * vFade);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

function rand(seed, n) {
  const x = Math.sin(seed * 127.1 + n * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function smoothstep(a, b, x) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function insidePoly(x, z, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0];
    const zi = poly[i][1];
    const xj = poly[j][0];
    const zj = poly[j][1];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

function ringDistance(x, z, poly) {
  let min = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const vx = b[0] - a[0];
    const vz = b[1] - a[1];
    const len2 = vx * vx + vz * vz || 1;
    const t = Math.max(0, Math.min(1, ((x - a[0]) * vx + (z - a[1]) * vz) / len2));
    min = Math.min(min, Math.hypot(x - a[0] - vx * t, z - a[1] - vz * t));
  }
  return min;
}

export function createBogdaRange() {
  const width = 2300;
  const depth = 1400;
  const geo = new THREE.PlaneGeometry(width, depth, 180, 110);
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, 0, 760);

  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const peaks = [
    { x: -520, z: 660, h: 215, rx: 270, rz: 235 },
    { x: -250, z: 585, h: 275, rx: 225, rz: 230 },
    { x: 20, z: 625, h: 340, rx: 250, rz: 260 },
    { x: 285, z: 595, h: 295, rx: 235, rz: 235 },
    { x: 540, z: 690, h: 235, rx: 270, rz: 250 },
    { x: -790, z: 850, h: 180, rx: 320, rz: 280 },
    { x: 820, z: 860, h: 195, rx: 330, rz: 280 },
  ];
  const c = new THREE.Color();
  const rockLow = new THREE.Color(0x536265);
  const rockMid = new THREE.Color(0x737b78);
  const rockWarm = new THREE.Color(0x827c72);
  const snow = new THREE.Color(0xe7edee);
  const snowBlue = new THREE.Color(0xc9dce4);
  const glacier = new THREE.Color(0xb7d2dc);

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const foot = smoothstep(170, 430, z);
    const und = 0.5 + 0.5 * Math.sin(x * 0.006 + Math.sin(z * 0.004) * 1.7);
    let h = foot * (58 + und * 52);
    for (const p of peaks) {
      const gx = (x - p.x) / p.rx;
      const gz = (z - p.z) / p.rz;
      h += p.h * Math.exp(-(gx * gx + gz * gz) * 1.55);
    }
    h += foot * (13 * Math.sin(x * 0.036 + z * 0.019) + 7 * Math.sin(x * 0.091 - z * 0.034));
    h = Math.max(0, h * foot);
    pos.setY(i, h - 2.2);

    const snowLine = 118 + 20 * Math.sin(x * 0.008 + 0.7) + 13 * Math.sin(z * 0.011);
    const jag = 13 * Math.sin(x * 0.043 + z * 0.027) + 6 * Math.sin(x * 0.12 - z * 0.05);
    const strata = 0.5 + 0.5 * Math.sin(h * 0.13 + x * 0.017);
    const patch = 0.5 + 0.5 * Math.sin(x * 0.06 + z * 0.045);
    if (h > snowLine + jag) {
      c.copy(snow).lerp(snowBlue, patch * 0.45);
      if (patch > 0.72 && h < snowLine + 70) c.lerp(glacier, 0.55);
    } else if (h > snowLine - 28 + jag * 0.5) {
      c.copy(rockMid).lerp(rockWarm, strata * 0.6).lerp(snow, patch * 0.42);
    } else {
      c.copy(rockLow).lerp(rockMid, strata * 0.55);
      if (h > 90) c.lerp(rockWarm, 0.28);
    }
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.98,
    metalness: 0,
    flatShading: true,
  });
  const mesh = new THREE.Mesh(geo, material);
  mesh.receiveShadow = false;
  mesh.castShadow = false;
  return { mesh, material };
}

export function createRockRidges() {
  const group = new THREE.Group();
  const rocks = [];
  const caps = [];
  const clusters = [
    [-212, -18, 24], [-232, 58, 34], [-196, 132, 28], [-160, -126, 20],
    [196, -92, 24], [228, 52, 30], [206, 118, 26], [150, -142, 18],
    [-128, 188, 22], [118, 196, 20], [22, 226, 26],
  ];
  clusters.forEach(([cx, cz, size], ci) => {
    const count = 7 + (ci % 4);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + rand(ci + 3, i) * 0.5;
      const r = size * (0.2 + rand(ci + 7, i) * 0.6);
      const x = cx + Math.cos(a) * r;
      const z = cz + Math.sin(a) * r * 0.7;
      const s = 2.2 + rand(ci + 11, i) * 4.2;
      const g = new THREE.IcosahedronGeometry(s, 0);
      g.scale(1.10, 0.78 + rand(ci, i) * 0.4, 0.92);
      g.rotateY(rand(ci + 13, i) * 6.28);
      g.rotateX((rand(ci + 17, i) - 0.5) * 0.24);
      g.translate(x, s * 0.42, z);
      rocks.push(g);
      if (i % 3 === 0) {
        const cap = new THREE.IcosahedronGeometry(s * 0.72, 0);
        cap.scale(1.0, 0.24, 0.92);
        cap.rotateY(rand(ci + 19, i) * 6.28);
        cap.translate(x - s * 0.12, s * 0.82, z);
        caps.push(cap);
      }
    }
  });
  const rm = mergedMesh(rocks, rockDarkMat, true, true);
  if (rm) group.add(rm);
  const cm = mergedMesh(caps, snowMat, false, true);
  if (cm) group.add(cm);
  return group;
}

export function createShoreline(lake) {
  const group = new THREE.Group();
  const curve = new THREE.CatmullRomCurve3(
    lake.map(([x, z]) => new THREE.Vector3(x, 0, z)), true, 'catmullrom', 0.34
  );
  const pts = curve.getSpacedPoints(210);
  const stones = [];
  const gravel = [];
  let seed = 11;
  pts.forEach((p, i) => {
    if (i % 2 === 0) {
      const ox = p.x;
      const oz = p.z - 18;
      const d = Math.hypot(ox, oz) || 1;
      const nx = ox / d;
      const nz = oz / d;
      const off = -1.2 + rand(seed, i) * 6.5;
      const s = 0.55 + rand(seed + 2, i) * 1.55;
      const g = new THREE.IcosahedronGeometry(s, 0);
      g.scale(1.25, 0.72, 1.0);
      g.rotateY(rand(seed + 4, i) * 6.28);
      g.translate(p.x + nx * off, s * 0.34 - 0.12, p.z + nz * off);
      stones.push(g);
    }
    for (let k = 0; k < 3; k++) {
      const a = rand(seed + 8, i * 5 + k) * 6.28;
      const off = 0.5 + rand(seed + 12, i * 5 + k) * 4.5;
      const g = new THREE.IcosahedronGeometry(0.12 + rand(seed + 3, i * 7 + k) * 0.28, 0);
      g.scale(1.3, 0.55, 1.0);
      g.translate(
        p.x + Math.cos(a) * off,
        0.05 + rand(seed + 6, i * 3 + k) * 0.12,
        p.z + Math.sin(a) * off
      );
      gravel.push(g);
    }
  });
  const sm = mergedMesh(stones, rockMat, true, true);
  if (sm) group.add(sm);
  const gm = mergedMesh(gravel, rockDarkMat, false, true);
  if (gm) group.add(gm);

  const positions = [];
  const foamPositions = [];
  const uvs = [];
  const foamUvs = [];
  const indices = [];
  const foamIndices = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const ox = p.x;
    const oz = p.z - 18;
    const d = Math.hypot(ox, oz) || 1;
    const nx = -ox / d;
    const nz = -oz / d;
    positions.push(p.x + nx * 0.4, 0.16, p.z + nz * 0.4);
    positions.push(p.x + nx * 8.5, 0.14, p.z + nz * 8.5);
    uvs.push(0, 0, 1, 1);
    foamPositions.push(p.x - nx * 0.2, 0.17, p.z - nz * 0.2);
    foamPositions.push(p.x + nx * 1.5, 0.16, p.z + nz * 1.5);
    foamUvs.push(0, 0, 1, 1);
  }
  for (let i = 0; i < pts.length; i++) {
    const a = i * 2;
    const b = ((i + 1) % pts.length) * 2;
    indices.push(a, b, a + 1, a + 1, b, b + 1);
    foamIndices.push(a, b, a + 1, a + 1, b, b + 1);
  }
  const shallowGeo = new THREE.BufferGeometry();
  shallowGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  shallowGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  shallowGeo.setIndex(indices);
  shallowGeo.computeVertexNormals();
  const shallowMat = new THREE.MeshBasicMaterial({
    color: 0x74cfc8,
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const shallow = new THREE.Mesh(shallowGeo, shallowMat);
  shallow.renderOrder = 1;
  group.add(shallow);

  const foamGeo = new THREE.BufferGeometry();
  foamGeo.setAttribute('position', new THREE.Float32BufferAttribute(foamPositions, 3));
  foamGeo.setAttribute('uv', new THREE.Float32BufferAttribute(foamUvs, 2));
  foamGeo.setIndex(foamIndices);
  foamGeo.computeVertexNormals();
  const foamMat = new THREE.MeshBasicMaterial({
    color: 0xeaf7f4,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const foam = new THREE.Mesh(foamGeo, foamMat);
  foam.renderOrder = 2;
  group.add(foam);
  return group;
}

export function createBoardwalk({ points, width = 3.4, y = 0.45 }) {
  const group = new THREE.Group();
  const curve = new THREE.CatmullRomCurve3(
    points.map((p) => new THREE.Vector3(p[0], 0, p[1])), false, 'catmullrom', 0.25
  );
  const len = curve.getLength();
  const planks = [];
  const beams = [];
  const posts = [];
  const rails = [];
  const count = Math.max(20, Math.round(len / 0.92));
  const pts = curve.getSpacedPoints(count);
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const segLen = Math.hypot(b.x - a.x, b.z - a.z);
    const ang = Math.atan2(b.x - a.x, b.z - a.z);
    const pm = new THREE.BoxGeometry(width, 0.14, segLen * 0.9);
    pm.rotateY(ang);
    pm.translate((a.x + b.x) / 2, y - 0.07 + rand(31, i) * 0.015, (a.z + b.z) / 2);
    planks.push(pm);
    if (i % 2 === 0) {
      const beam = new THREE.BoxGeometry(0.24, 0.22, segLen + 0.2);
      beam.rotateY(ang);
      beam.translate((a.x + b.x) / 2, y - 0.25, (a.z + b.z) / 2);
      beams.push(beam);
    }
  }
  const step = Math.max(2, Math.round(len / 11));
  for (let i = 0; i <= count; i += step) {
    const j = Math.min(i, pts.length - 1);
    const p = pts[j];
    const t = curve.getTangent(j / (pts.length - 1));
    const nx = -t.z;
    const nz = t.x;
    for (const side of [-1, 1]) {
      const x = p.x + nx * side * (width / 2 + 0.18);
      const z = p.z + nz * side * (width / 2 + 0.18);
      addBox(posts, 0.2, 1.35, 0.2, x, y + 0.52, z);
      addBox(posts, 0.36, 0.1, 0.36, x, y + 1.2, z);
    }
    if (i + step <= count) {
      const p2 = pts[Math.min(i + step, pts.length - 1)];
      for (const side of [-1, 1]) {
        const x1 = p.x + nx * side * (width / 2 + 0.18);
        const z1 = p.z + nz * side * (width / 2 + 0.18);
        const t2 = curve.getTangent(Math.min(1, (i + step) / (pts.length - 1)));
        const x2 = p2.x - t2.z * side * (width / 2 + 0.18);
        const z2 = p2.z + t2.x * side * (width / 2 + 0.18);
        addBar(rails, x1, z1, x2, z2, y + 1.12, 0.1, 0.13);
        addBar(rails, x1, z1, x2, z2, y + 0.66, 0.08, 0.09);
      }
    }
  }
  const dm = mergedMesh(planks, plankMat, true, true);
  if (dm) group.add(dm);
  const bm = mergedMesh(beams, plankDarkMat, true, true);
  if (bm) group.add(bm);
  const pm = mergedMesh(posts, plankDarkMat, true, true);
  if (pm) group.add(pm);
  const rm = mergedMesh(rails, plankMat, true, true);
  if (rm) group.add(rm);
  return group;
}

export function createMeadow({ lake, boardwalk, forest, bounds }) {
  const group = new THREE.Group();
  const blades = [];
  const flowers = { white: [], gold: [], violet: [] };
  const stems = [];
  const flowerMats = [
    ['white', flowerWhiteMat],
    ['gold', flowerGoldMat],
    ['violet', flowerVioletMat],
  ];
  let placed = 0;
  let tries = 0;
  while (placed < 560 && tries < 4200) {
    tries++;
    const x = bounds.minX + rand(101, tries) * (bounds.maxX - bounds.minX);
    const z = bounds.minZ + rand(107, tries) * (bounds.maxZ - bounds.minZ);
    if (insidePoly(x, z, lake)) continue;
    if (ringDistance(x, z, lake) < 6.5) continue;
    let nearBoard = false;
    for (const p of boardwalk) if (Math.hypot(x - p[0], z - p[1]) < 7) nearBoard = true;
    if (nearBoard) continue;
    let nearForest = false;
    for (const p of forest) if (Math.hypot(x - p[0], z - p[1]) < 4.5) nearForest = true;
    if (nearForest) continue;
    if (Math.hypot(x - 170, z - 16) < 44) continue;
    const h = 0.32 + rand(113, tries) * 0.55;
    for (let k = 0; k < 4; k++) {
      const g = new THREE.ConeGeometry(0.045, h * (0.7 + rand(127, tries + k) * 0.5), 3);
      g.rotateZ((rand(131, tries + k) - 0.5) * 0.5);
      g.rotateY(rand(137, tries + k) * 6.28);
      g.translate(
        x + (rand(139, tries + k) - 0.5) * 0.45,
        h * 0.36,
        z + (rand(149, tries + k) - 0.5) * 0.45
      );
      blades.push(g);
    }
    if (rand(151, tries) > 0.46) {
      const which = flowerMats[(rand(157, tries) * 3) | 0];
      const stem = new THREE.CylinderGeometry(0.018, 0.025, 0.42, 4);
      stem.translate(x, 0.21, z);
      stems.push(stem);
      const head = new THREE.IcosahedronGeometry(0.075 + rand(163, tries) * 0.045, 0);
      head.scale(1, 0.7, 1);
      head.translate(x, 0.44, z);
      flowers[which[0]].push(head);
    }
    placed++;
  }
  const bm = mergedMesh(blades, mats.blade, false, true);
  if (bm) group.add(bm);
  const sm = mergedMesh(stems, stemMat, false, true);
  if (sm) group.add(sm);
  for (const [key, material] of flowerMats) {
    const fm = mergedMesh(flowers[key], material, false, true);
    if (fm) group.add(fm);
  }
  return group;
}

export function createMist() {
  const group = new THREE.Group();
  const quads = [
    [-300, 92, 280, 300, 66], [-80, 132, 350, 340, 78], [180, 108, 300, 320, 70],
    [430, 150, 390, 360, 86], [-500, 160, 470, 380, 90], [20, 76, 205, 260, 48],
    [-190, 68, 210, 220, 42], [270, 64, 230, 240, 44], [520, 110, 330, 280, 60],
    [-630, 125, 420, 300, 72],
  ];
  const positions = [];
  const uvs = [];
  const phases = [];
  const indices = [];
  quads.forEach(([x, y, z, w, h], i) => {
    const base = positions.length / 3;
    const phase = i * 1.73 + rand(201, i) * 4;
    positions.push(x - w / 2, y - h / 2, z, x + w / 2, y - h / 2, z);
    positions.push(x + w / 2, y + h / 2, z, x - w / 2, y + h / 2, z);
    uvs.push(0, 0, 1, 0, 1, 1, 0, 1);
    for (let k = 0; k < 4; k++) phases.push(phase);
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute('aPhase', new THREE.Float32BufferAttribute(phases, 1));
  geo.setIndex(indices);
  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(0xe4eef4) } },
    vertexShader: mistVertexShader,
    fragmentShader: mistFragmentShader,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, material);
  mesh.renderOrder = 4;
  group.add(mesh);
  function update(t) {
    material.uniforms.uTime.value = t;
  }
  return { group, update };
}

export function createSpruce({ height = 12, radius = 3.1, seed = 1 } = {}) {
  const group = new THREE.Group();
  const trunkList = [];
  const bark = [];
  const needles = [];
  const trunk = new THREE.CylinderGeometry(height * 0.022, height * 0.045, height * 0.62, 8);
  trunk.translate(0, height * 0.31, 0);
  trunkList.push(trunk);
  for (let i = 0; i < 7; i++) {
    const g = new THREE.BoxGeometry(0.1, height * 0.09, 0.18);
    const a = rand(seed + 3, i) * 6.28;
    g.translate(Math.cos(a) * height * 0.038, height * (0.18 + i * 0.055), Math.sin(a) * height * 0.038);
    bark.push(g);
  }
  for (let i = 0; i < 6; i++) {
    const f = i / 5;
    const r = radius * (1 - f * 0.68);
    const cone = new THREE.ConeGeometry(r, height * 0.24, 9);
    cone.rotateY(rand(seed + 7, i) * 6.28);
    cone.translate(
      (rand(seed + 11, i) - 0.5) * 0.32,
      height * (0.4 + i * 0.105),
      (rand(seed + 13, i) - 0.5) * 0.32
    );
    needles.push(cone);
  }
  for (let i = 0; i < 12; i++) {
    const a = rand(seed + 17, i) * 6.28;
    const y = height * (0.46 + rand(seed + 19, i) * 0.42);
    const g = new THREE.ConeGeometry(radius * 0.14, height * 0.16, 5);
    g.rotateZ(1.12 + rand(seed + 23, i) * 0.28);
    g.rotateY(a);
    g.translate(Math.cos(a) * radius * 0.5, y, Math.sin(a) * radius * 0.5);
    needles.push(g);
  }
  for (const [list, material] of [[trunkList, mats.trunk], [bark, mats.timber], [needles, mats.pine]]) {
    const m = mergedMesh(list, material, true, true);
    if (m) group.add(m);
  }
  return group;
}
