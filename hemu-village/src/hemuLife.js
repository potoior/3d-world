import * as THREE from 'three';
import { rand, mergeGeo } from './hemuCore.js';
import { terrainHeight, riverCenterX } from './hemuTerrain.js';

/* ----------------------------- horses ----------------------------- */

function buildHorseParts() {
  const coat = [];
  const dark = [];
  const saddle = [];
  const blanket = [];
  const body = new THREE.SphereGeometry(1.0, 12, 9);
  body.scale(1.5, 0.88, 0.72);
  body.translate(0, 1.56, 0.04);
  coat.push(body);
  const neck = new THREE.CylinderGeometry(0.3, 0.44, 1.25, 8);
  neck.rotateX(-0.62);
  neck.translate(0, 2.04, 1.02);
  coat.push(neck);
  const head = new THREE.SphereGeometry(0.38, 10, 8);
  head.scale(0.8, 0.9, 1.35);
  head.translate(0, 2.54, 1.62);
  coat.push(head);
  const muzzle = new THREE.SphereGeometry(0.24, 8, 6);
  muzzle.scale(1.0, 0.72, 1.3);
  muzzle.translate(0, 2.35, 2.04);
  coat.push(muzzle);
  for (const sx of [-1, 1]) {
    const ear = new THREE.ConeGeometry(0.1, 0.32, 5);
    ear.translate(sx * 0.16, 2.9, 1.49);
    dark.push(ear);
    for (const sz of [-0.52, 0.58]) {
      const leg = new THREE.CylinderGeometry(0.12, 0.16, 1.28, 6);
      leg.translate(sx * 0.72, 0.68, sz);
      coat.push(leg);
      const hoof = new THREE.CylinderGeometry(0.17, 0.19, 0.16, 6);
      hoof.translate(sx * 0.72, 0.08, sz);
      dark.push(hoof);
    }
    const stirrup = new THREE.BoxGeometry(0.05, 0.45, 0.05);
    stirrup.translate(sx * 0.9, 1.42, 0.28);
    saddle.push(stirrup);
  }
  const mane = new THREE.BoxGeometry(0.13, 0.6, 0.5);
  mane.translate(0, 2.55, 1.06);
  dark.push(mane);
  const tail = new THREE.ConeGeometry(0.22, 1.15, 6);
  tail.rotateX(0.45);
  tail.translate(0, 1.86, -1.0);
  dark.push(tail);
  const blanketMesh = new THREE.BoxGeometry(1.15, 0.19, 1.25);
  blanketMesh.rotateX(0.06);
  blanketMesh.translate(0, 2.05, 0.08);
  blanket.push(blanketMesh);
  const blanketTrim = new THREE.BoxGeometry(1.22, 0.06, 1.32);
  blanketTrim.translate(0, 2.14, 0.08);
  blanket.push(blanketTrim);
  const saddleMesh = new THREE.BoxGeometry(0.72, 0.36, 0.88);
  saddleMesh.translate(0, 2.26, 0.08);
  saddle.push(saddleMesh);
  const pommel = new THREE.BoxGeometry(0.44, 0.22, 0.14);
  pommel.translate(0, 2.49, 0.52);
  saddle.push(pommel);
  const cantle = new THREE.BoxGeometry(0.48, 0.18, 0.12);
  cantle.translate(0, 2.49, -0.4);
  saddle.push(cantle);
  return {
    coat: mergeGeo(coat),
    dark: mergeGeo(dark),
    saddle: mergeGeo(saddle),
    blanket: mergeGeo(blanket),
  };
}

const HORSE_DEFS = [
  { cx: 58, cz: -160, rx: 15, rz: 11, speed: 0.055, phase: 0.4, scale: 1.0, coat: 0x6f4b2d },
  { cx: 58, cz: -160, rx: 15, rz: 11, speed: 0.055, phase: 2.3, scale: 0.96, coat: 0x8a6238 },
  { cx: 58, cz: -160, rx: 15, rz: 11, speed: 0.055, phase: 4.1, scale: 1.04, coat: 0x4f3724 },
  { cx: 58, cz: -160, rx: 15, rz: 11, speed: 0.055, phase: 5.5, scale: 0.92, coat: 0x9a7448 },
  { cx: 62, cz: -154, rx: 19, rz: 13, speed: -0.045, phase: 1.1, scale: 1.02, coat: 0x76502f },
  { cx: 62, cz: -154, rx: 19, rz: 13, speed: -0.045, phase: 3.4, scale: 0.66, coat: 0x6a472a },
  { cx: 92, cz: 198, rx: 17, rz: 12, speed: 0.05, phase: 0.8, scale: 1.0, coat: 0x5d4029 },
  { cx: 92, cz: 198, rx: 17, rz: 12, speed: 0.05, phase: 2.7, scale: 0.94, coat: 0x8b6439 },
  { cx: 92, cz: 198, rx: 17, rz: 12, speed: 0.05, phase: 4.6, scale: 1.05, coat: 0x6f4b2d },
  { cx: 98, cz: 192, rx: 21, rz: 14, speed: -0.04, phase: 1.5, scale: 0.9, coat: 0x513724 },
  { cx: 98, cz: 192, rx: 21, rz: 14, speed: -0.04, phase: 3.8, scale: 0.98, coat: 0x9a7448 },
  { cx: 98, cz: 192, rx: 21, rz: 14, speed: -0.04, phase: 5.9, scale: 0.62, coat: 0x6a472a },
];

export function createHerd(M) {
  const parts = buildHorseParts();
  const count = HORSE_DEFS.length;
  const coat = new THREE.InstancedMesh(parts.coat, M.horseCoat, count);
  const dark = new THREE.InstancedMesh(parts.dark, M.horseDark, count);
  const saddle = new THREE.InstancedMesh(parts.saddle, M.saddle, count);
  const blanket = new THREE.InstancedMesh(parts.blanket, M.blanket, count);
  const meshes = [coat, dark, saddle, blanket];
  const color = new THREE.Color();
  for (let i = 0; i < count; i++) {
    color.setHex(HORSE_DEFS[i].coat);
    color.offsetHSL((rand(i + 1, 3) - 0.5) * 0.03, 0, (rand(i + 1, 5) - 0.5) * 0.06);
    coat.setColorAt(i, color);
  }
  for (const mesh of meshes) {
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    mesh.name = 'hemu-horses';
  }
  if (coat.instanceColor) coat.instanceColor.needsUpdate = true;
  const group = new THREE.Group();
  group.name = 'hemu-herd';
  group.add(...meshes);
  const horses = HORSE_DEFS.map((d) => ({ ...d, x: d.cx, z: d.cz, y: terrainHeight(d.cx, d.cz), yaw: 0 }));
  const dummy = new THREE.Object3D();
  let time = 0;
  function update(t, dt) {
    time = t;
    for (let i = 0; i < horses.length; i++) {
      const h = horses[i];
      const a = h.phase + t * h.speed;
      const x = h.cx + Math.cos(a) * h.rx;
      const z = h.cz + Math.sin(a) * h.rz;
      const tx = -Math.sin(a) * h.rx;
      const tz = Math.cos(a) * h.rz;
      const y = terrainHeight(x, z) + Math.abs(Math.sin(t * 2.3 + h.phase)) * 0.035;
      const yaw = Math.atan2(tx, tz) + Math.PI * 0.5;
      h.x = x; h.z = z; h.y = y; h.yaw = yaw;
      dummy.position.set(x, y, z);
      dummy.rotation.set(0, yaw, Math.sin(t * 2.1 + h.phase) * 0.018);
      dummy.scale.setScalar(h.scale);
      dummy.updateMatrix();
      coat.setMatrixAt(i, dummy.matrix);
      dark.setMatrixAt(i, dummy.matrix);
      saddle.setMatrixAt(i, dummy.matrix);
      blanket.setMatrixAt(i, dummy.matrix);
    }
    for (const mesh of meshes) mesh.instanceMatrix.needsUpdate = true;
  }
  update(0, 0);
  return { group, horses, update, meshes };
}

/* ----------------------------- birds ----------------------------- */

function makeWing(mirror) {
  const sign = mirror ? -1 : 1;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array([
    0, 0, -0.22,
    0, 0, 0.26,
    sign * 2.35, 0.05, 0.16,
    sign * 1.05, 0.02, -0.42,
  ]);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setIndex([0, 1, 2, 0, 2, 3]);
  geo.computeVertexNormals();
  return geo;
}

function buildBirdBody() {
  const list = [];
  const body = new THREE.SphereGeometry(0.45, 10, 8);
  body.scale(0.8, 0.72, 1.8);
  list.push(body);
  const head = new THREE.SphereGeometry(0.24, 8, 6);
  head.translate(0, 0.16, 0.85);
  list.push(head);
  const tail = new THREE.ConeGeometry(0.24, 0.72, 5);
  tail.rotateX(-Math.PI / 2);
  tail.translate(0, 0, -1.0);
  list.push(tail);
  const beak = new THREE.ConeGeometry(0.08, 0.26, 5);
  beak.rotateX(Math.PI / 2);
  beak.translate(0, 0.12, 1.06);
  list.push(beak);
  return mergeGeo(list);
}

const BIRD_DEFS = [
  { cx: 20, cz: 70, rx: 170, rz: 120, alt: 132, speed: 0.07, phase: 0.4, scale: 1.4 },
  { cx: -40, cz: 140, rx: 205, rz: 135, alt: 168, speed: -0.052, phase: 2.2, scale: 1.15 },
  { cx: 120, cz: 30, rx: 125, rz: 90, alt: 146, speed: 0.062, phase: 4.3, scale: 0.98 },
  { cx: 20, cz: 260, rx: 240, rz: 150, alt: 192, speed: -0.042, phase: 5.4, scale: 0.88 },
  { cx: -110, cz: 200, rx: 160, rz: 110, alt: 158, speed: 0.058, phase: 3.1, scale: 1.05 },
  { cx: 60, cz: -100, rx: 180, rz: 120, alt: 150, speed: -0.05, phase: 1.4, scale: 1.0 },
];

export function createBirds(M) {
  const count = BIRD_DEFS.length;
  const body = new THREE.InstancedMesh(buildBirdBody(), M.bird, count);
  const left = new THREE.InstancedMesh(makeWing(true), M.bird, count);
  const right = new THREE.InstancedMesh(makeWing(false), M.bird, count);
  const meshes = [body, left, right];
  for (const mesh of meshes) {
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.frustumCulled = false;
    mesh.name = 'hemu-birds';
  }
  const group = new THREE.Group();
  group.name = 'hemu-bird-flock';
  group.add(body, left, right);
  const birds = BIRD_DEFS.map((d) => ({ ...d, x: d.cx, y: d.alt, z: d.cz }));
  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const base = new THREE.Matrix4();
  const local = new THREE.Matrix4();
  const wingPos = new THREE.Vector3();
  const wingQuat = new THREE.Quaternion();
  const wingScale = new THREE.Vector3(1, 1, 1);
  function update(t) {
    for (let i = 0; i < birds.length; i++) {
      const d = birds[i];
      const a = t * d.speed + d.phase;
      const x = d.cx + Math.cos(a) * d.rx;
      const z = d.cz + Math.sin(a) * d.rz;
      const tx = -Math.sin(a) * d.rx;
      const tz = Math.cos(a) * d.rz;
      const y = d.alt + Math.sin(t * 0.5 + d.phase) * 7;
      birds[i].x = x; birds[i].y = y; birds[i].z = z;
      pos.set(x, y, z);
      quat.setFromEuler(new THREE.Euler(-Math.cos(a) * 0.1, Math.atan2(tx, tz), -Math.cos(a) * 0.16));
      scale.setScalar(d.scale);
      base.compose(pos, quat, scale);
      body.setMatrixAt(i, base);
      const flap = 0.16 + Math.sin(t * 4.2 + d.phase) * 0.46;
      for (const [mesh, sign] of [[left, 1], [right, -1]]) {
        wingPos.set(sign * 0.24, 0.08, 0.05);
        wingQuat.setFromAxisAngle(new THREE.Vector3(0, 0, 1), sign * flap);
        local.compose(wingPos, wingQuat, wingScale);
        local.premultiply(base);
        mesh.setMatrixAt(i, local);
      }
    }
    for (const mesh of meshes) mesh.instanceMatrix.needsUpdate = true;
  }
  update(0);
  return { group, birds, update };
}

/* ----------------------------- smoke ----------------------------- */

const SMOKE_VERT = `
  attribute vec3 aOrigin;
  attribute float aPhase;
  uniform float uTime;
  varying vec2 vUv;
  varying float vFade;
  void main() {
    vUv = uv;
    float c = fract(uTime * 0.045 + aPhase);
    float rise = c * 15.0;
    float grow = 1.0 + c * 4.2;
    vec3 p = aOrigin + vec3(
      position.x * grow + sin(uTime * 0.42 + aPhase * 6.28) * 0.9,
      position.y * grow + rise,
      position.z * grow + cos(uTime * 0.33 + aPhase * 5.1) * 0.7
    );
    vFade = smoothstep(0.0, 0.12, c) * (1.0 - c) * 0.9;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const SMOKE_FRAG = `
  uniform vec3 uColor;
  varying vec2 vUv;
  varying float vFade;
  void main() {
    float d = length(vUv - vec2(0.5));
    float a = smoothstep(0.5, 0.04, d);
    gl_FragColor = vec4(uColor, a * vFade * 0.28);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export function createSmoke(spots) {
  const positions = [];
  const uvs = [];
  const origins = [];
  const phases = [];
  const indices = [];
  spots.forEach((spot, si) => {
    for (let i = 0; i < 7; i++) {
      const base = positions.length / 3;
      const phase = i / 7 + rand(501 + si, i) * 0.11;
      positions.push(-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0);
      uvs.push(0, 0, 1, 0, 1, 1, 0, 1);
      for (let k = 0; k < 4; k++) {
        origins.push(spot.x, spot.y, spot.z);
        phases.push(phase);
      }
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute('aOrigin', new THREE.Float32BufferAttribute(origins, 3));
  geo.setAttribute('aPhase', new THREE.Float32BufferAttribute(phases, 1));
  geo.setIndex(indices);
  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(0xdad8ce) } },
    vertexShader: SMOKE_VERT,
    fragmentShader: SMOKE_FRAG,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, material);
  mesh.name = 'hemu-smoke';
  mesh.frustumCulled = false;
  mesh.renderOrder = 3;
  const group = new THREE.Group();
  group.add(mesh);
  function update(t) {
    material.uniforms.uTime.value = t;
  }
  return { group, mesh, material, update, count: spots.length };
}

/* ------------------------------ mist ------------------------------ */

const MIST_VERT = `
  attribute float aPhase;
  uniform float uTime;
  uniform float uAmp;
  varying vec2 vUv;
  varying float vFade;
  void main() {
    vUv = uv;
    vec3 p = position;
    p.x += sin(uTime * 0.045 + aPhase) * uAmp;
    p.z += cos(uTime * 0.031 + aPhase * 1.4) * uAmp * 0.4;
    p.y += sin(uTime * 0.075 + aPhase * 1.9) * 1.5;
    vFade = 0.7 + 0.3 * sin(uTime * 0.09 + aPhase);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const MIST_FRAG = `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying vec2 vUv;
  varying float vFade;
  void main() {
    float d = length(vUv - vec2(0.5));
    float a = smoothstep(0.54, 0.03, d);
    a *= smoothstep(0.0, 0.2, vUv.y) * smoothstep(1.0, 0.76, vUv.y);
    gl_FragColor = vec4(uColor, a * uOpacity * vFade);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

function buildMistMesh(quads, name, color, opacity, amp) {
  const positions = [];
  const uvs = [];
  const phases = [];
  const indices = [];
  quads.forEach(([x, y, z, w, h], i) => {
    const base = positions.length / 3;
    const phase = i * 1.73 + rand(701, i) * 4;
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
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: opacity },
      uAmp: { value: amp },
    },
    vertexShader: MIST_VERT,
    fragmentShader: MIST_FRAG,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, material);
  mesh.name = name;
  mesh.frustumCulled = false;
  mesh.renderOrder = 2;
  return { mesh, material };
}

export function createMist() {
  const group = new THREE.Group();
  group.name = 'hemu-mist';
  const low = [];
  for (let i = 0; i < 14; i++) {
    const z = -260 + i * 42;
    const x = riverCenterX(z) + (rand(711, i) - 0.5) * 24;
    low.push([x, 4.5 + rand(713, i) * 4.5, z, 105 + rand(717, i) * 95, 16 + rand(719, i) * 15]);
  }
  const high = [
    [-420, 76, 420, 500, 90], [20, 96, 500, 540, 110], [440, 84, 480, 500, 100],
    [-760, 104, 560, 560, 120], [780, 104, 600, 560, 120], [-220, 62, 360, 420, 80],
    [300, 70, 390, 430, 86], [60, 120, 680, 620, 130],
  ];
  const lo = buildMistMesh(low, 'hemu-mist-low', 0xe2ece9, 0.19, 22);
  const hi = buildMistMesh(high, 'hemu-mist-high', 0xe8f0ef, 0.13, 32);
  group.add(lo.mesh, hi.mesh);
  const materials = [lo.material, hi.material];
  function update(t) {
    lo.material.uniforms.uTime.value = t;
    hi.material.uniforms.uTime.value = t;
  }
  return { group, low: lo.mesh, high: hi.mesh, materials, update };
}

export function createLife({ M, smokeSpots, herd, birds, mist }) {
  let smoke = null;
  if (smokeSpots && smokeSpots.length) smoke = createSmoke(smokeSpots);
  return {
    smoke,
    herd,
    birds,
    mist,
    update(t, dt) {
      if (smoke) smoke.update(t);
      if (mist) mist.update(t);
      if (herd) herd.update(t, dt);
      if (birds) birds.update(t);
    },
  };
}
