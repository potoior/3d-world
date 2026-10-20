import * as THREE from 'three';
import { mats } from './materials.js';
import { addBox, addBar, mergedMesh } from './geometry.js';
import { rand } from './kanasTerrain.js';

const mistVertexShader = `
  attribute float aPhase;
  uniform float uTime;
  varying vec2 vUv;
  varying float vFade;
  void main() {
    vUv = uv;
    vec3 p = position;
    p.x += sin(uTime * 0.05 + aPhase) * 22.0;
    p.z += cos(uTime * 0.033 + aPhase * 1.4) * 9.0;
    p.y += sin(uTime * 0.08 + aPhase * 1.9) * 1.6;
    vFade = 0.66 + 0.34 * sin(uTime * 0.1 + aPhase);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const mistFragmentShader = `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying vec2 vUv;
  varying float vFade;
  void main() {
    float d = length(vUv - vec2(0.5));
    float a = smoothstep(0.54, 0.04, d);
    a *= smoothstep(0.0, 0.2, vUv.y) * smoothstep(1.0, 0.78, vUv.y);
    gl_FragColor = vec4(uColor, a * uOpacity * vFade);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export function createBoardwalk({ points, width = 3.4, y = 0.45 }) {
  const group = new THREE.Group();
  const curve = new THREE.CatmullRomCurve3(
    points.map((p) => new THREE.Vector3(p[0], 0, p[1])),
    false,
    'catmullrom',
    0.25
  );
  const len = curve.getLength();
  const planks = [];
  const beams = [];
  const posts = [];
  const rails = [];
  const lamps = [];
  const lampGlass = [];
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
  const lampStride = Math.max(5, Math.round(len / 6));
  for (let i = lampStride; i < count; i += lampStride) {
    const p = pts[i];
    const t = curve.getTangent(i / (pts.length - 1));
    const nx = -t.z;
    const nz = t.x;
    const side = i % (lampStride * 2) === 0 ? 1 : -1;
    const x = p.x + nx * side * (width / 2 + 0.55);
    const z = p.z + nz * side * (width / 2 + 0.55);
    addBox(lamps, 0.14, 1.9, 0.14, x, y + 0.95, z);
    addBox(lamps, 0.34, 0.1, 0.34, x, y + 2.0, z);
    const glass = new THREE.BoxGeometry(0.26, 0.32, 0.26);
    glass.translate(x, y + 1.78, z);
    lampGlass.push(glass);
  }
  const dm = mergedMesh(planks, mats.plank, true, true);
  if (dm) group.add(dm);
  const bm = mergedMesh(beams, mats.plankDark, true, true);
  if (bm) group.add(bm);
  const pm = mergedMesh(posts, mats.plankDark, true, true);
  if (pm) group.add(pm);
  const rm = mergedMesh(rails, mats.plank, true, true);
  if (rm) group.add(rm);
  const lm = mergedMesh(lamps, mats.timberDark, true, true);
  if (lm) group.add(lm);
  const lg = mergedMesh(lampGlass, mats.windowWarm, false, true);
  if (lg) group.add(lg);
  return group;
}

export function createMeadow({ lake, riverPts, boardwalk, forest, village, bounds }) {
  const group = new THREE.Group();
  const blades = [];
  const flowers = { white: [], gold: [], violet: [], blue: [] };
  const stems = [];
  const flowerMats = [
    ['white', mats.flowerWhite],
    ['gold', mats.flowerGold],
    ['violet', mats.flowerViolet],
    ['blue', mats.flowerBlue],
  ];
  let placed = 0;
  let tries = 0;
  const riverEvery = riverPts.filter((_, i) => i % 2 === 0);
  const inLake = (x, z) => {
    let inside = false;
    for (let i = 0, j = lake.length - 1; i < lake.length; j = i++) {
      const xi = lake[i][0];
      const zi = lake[i][1];
      const xj = lake[j][0];
      const zj = lake[j][1];
      if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
    }
    return inside;
  };
  while (placed < 660 && tries < 5600) {
    tries++;
    const x = bounds.minX + rand(101, tries) * (bounds.maxX - bounds.minX);
    const z = bounds.minZ + rand(107, tries) * (bounds.maxZ - bounds.minZ);
    if (x > village.minX && x < village.maxX && z > village.minZ && z < village.maxZ) continue;
    if (inLake(x, z)) continue;
    let nearWater = false;
    for (const p of lake) if (Math.hypot(x - p[0], z - p[1]) < 9) nearWater = true;
    for (const p of riverEvery) if (Math.hypot(x - p.x, z - p.z) < 11) nearWater = true;
    if (nearWater) continue;
    let nearBoard = false;
    for (const p of boardwalk) if (Math.hypot(x - p[0], z - p[1]) < 7) nearBoard = true;
    if (nearBoard) continue;
    let nearForest = false;
    for (const p of forest) if (Math.hypot(x - p[0], z - p[1]) < 4.0) nearForest = true;
    if (nearForest) continue;

    const h = 0.34 + rand(113, tries) * 0.58;
    for (let k = 0; k < 4; k++) {
      const g = new THREE.ConeGeometry(0.045, h * (0.7 + rand(127, tries + k) * 0.5), 3);
      g.rotateZ((rand(131, tries + k) - 0.5) * 0.5);
      g.rotateY(rand(137, tries + k) * 6.28);
      g.translate(
        x + (rand(139, tries + k) - 0.5) * 0.55,
        h * 0.36,
        z + (rand(149, tries + k) - 0.5) * 0.55
      );
      blades.push(g);
    }
    if (rand(151, tries) > 0.34) {
      const which = flowerMats[(rand(157, tries) * 4) | 0];
      const sh = 0.36 + rand(159, tries) * 0.24;
      const stem = new THREE.CylinderGeometry(0.016, 0.024, sh, 4);
      stem.translate(x, sh * 0.5, z);
      stems.push(stem);
      const head = new THREE.IcosahedronGeometry(0.075 + rand(163, tries) * 0.05, 0);
      head.scale(1, 0.68, 1);
      head.translate(x, sh + 0.04, z);
      flowers[which[0]].push(head);
      if (rand(167, tries) > 0.55) {
        const head2 = new THREE.IcosahedronGeometry(0.06 + rand(171, tries) * 0.035, 0);
        head2.translate(x + 0.09, sh - 0.03, z + 0.05);
        flowers[which[0]].push(head2);
      }
    }
    placed++;
  }
  const bm = mergedMesh(blades, mats.blade, false, true);
  if (bm) group.add(bm);
  const sm = mergedMesh(stems, mats.stem, false, true);
  if (sm) group.add(sm);
  for (const [key, material] of flowerMats) {
    const fm = mergedMesh(flowers[key], material, false, true);
    if (fm) group.add(fm);
  }
  return group;
}

export function createMist() {
  const group = new THREE.Group();
  const low = [
    [-120, 4.5, 10, 240, 24], [120, 5.2, 40, 210, 22], [0, 7, 150, 300, 30],
    [-70, 6, 210, 260, 26], [90, 6.4, 230, 240, 24], [-10, 9, 290, 300, 34],
    [40, 8, 350, 280, 30], [-140, 10, 300, 260, 32], [150, 9, 130, 200, 24],
  ];
  const high = [
    [-360, 62, 420, 420, 90], [40, 86, 480, 480, 120], [380, 70, 440, 420, 100],
    [-620, 92, 500, 460, 110], [640, 88, 520, 460, 110], [-120, 48, 330, 360, 70],
    [260, 54, 360, 360, 76],
  ];
  const positions = [];
  const uvs = [];
  const phases = [];
  const indices = [];
  const pushQuads = (list, scaleY) => {
    list.forEach(([x, y, z, w, h], i) => {
      const base = positions.length / 3;
      const phase = i * 1.73 + rand(201, i) * 4;
      positions.push(x - w / 2, y - h / 2 * scaleY, z, x + w / 2, y - h / 2 * scaleY, z);
      positions.push(x + w / 2, y + h / 2 * scaleY, z, x - w / 2, y + h / 2 * scaleY, z);
      uvs.push(0, 0, 1, 0, 1, 1, 0, 1);
      for (let k = 0; k < 4; k++) phases.push(phase);
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    });
  };
  pushQuads(low, 1);
  pushQuads(high, 1);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute('aPhase', new THREE.Float32BufferAttribute(phases, 1));
  geo.setIndex(indices);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(0xe4eef2) },
      uOpacity: { value: 0.2 },
    },
    vertexShader: mistVertexShader,
    fragmentShader: mistFragmentShader,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, material);
  mesh.name = 'kanas-mist';
  mesh.frustumCulled = false;
  mesh.renderOrder = 4;
  group.add(mesh);
  function update(t) {
    material.uniforms.uTime.value = t;
  }
  return { group, update };
}

export function createScatterRocks() {
  const group = new THREE.Group();
  const rocks = [];
  const caps = [];
  const clusters = [
    [-180, 130, 20], [190, 170, 18], [-160, -100, 16], [205, -70, 18],
    [-40, 240, 16], [120, 280, 18], [30, 120, 12], [-210, 20, 16],
  ];
  clusters.forEach(([cx, cz, size], ci) => {
    const count = 6 + (ci % 4);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + rand(ci + 3, i) * 0.6;
      const r = size * (0.2 + rand(ci + 7, i) * 0.62);
      const x = cx + Math.cos(a) * r;
      const z = cz + Math.sin(a) * r * 0.8;
      const s = 1.4 + rand(ci + 11, i) * 3.2;
      const g = new THREE.IcosahedronGeometry(s, 0);
      g.scale(1.12, 0.74 + rand(ci, i) * 0.4, 0.94);
      g.rotateY(rand(ci + 13, i) * 6.28);
      g.rotateX((rand(ci + 17, i) - 0.5) * 0.26);
      g.translate(x, s * 0.38, z);
      rocks.push(g);
      if (i % 3 === 0) {
        const cap = new THREE.IcosahedronGeometry(s * 0.7, 0);
        cap.scale(1.0, 0.22, 0.9);
        cap.rotateY(rand(ci + 19, i) * 6.28);
        cap.translate(x - s * 0.1, s * 0.72, z);
        caps.push(cap);
      }
    }
  });
  const rm = mergedMesh(rocks, mats.rock, true, true);
  if (rm) group.add(rm);
  const cm = mergedMesh(caps, mats.rockMoss, false, true);
  if (cm) group.add(cm);
  return group;
}
