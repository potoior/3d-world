import * as THREE from 'three';
import { mats } from './materials.js';
import { addBox, addCylinder, mergedMesh } from './geometry.js';

const feltMat = new THREE.MeshStandardMaterial({ color: 0xf0ece0, roughness: 0.98 });
const feltShadeMat = new THREE.MeshStandardMaterial({ color: 0xd8d2c1, roughness: 0.98 });
const yurtBlueMat = new THREE.MeshStandardMaterial({ color: 0x2b6076, roughness: 0.82 });
const yurtRedMat = new THREE.MeshStandardMaterial({ color: 0xa44434, roughness: 0.82 });
const ropeMat = new THREE.MeshStandardMaterial({ color: 0x3e3327, roughness: 0.95 });
const horseBrownMat = new THREE.MeshStandardMaterial({ color: 0x6d4a2e, roughness: 0.86 });
const horseDarkMat = new THREE.MeshStandardMaterial({ color: 0x2c2119, roughness: 0.9 });
const saddleMat = new THREE.MeshStandardMaterial({ color: 0x8b3f31, roughness: 0.8 });
const blanketMat = new THREE.MeshStandardMaterial({ color: 0xc7a04a, roughness: 0.88 });
const skinMat = new THREE.MeshStandardMaterial({ color: 0xd3ac89, roughness: 0.9 });
const coatBlueMat = new THREE.MeshStandardMaterial({ color: 0x3b556a, roughness: 0.9 });
const coatRedMat = new THREE.MeshStandardMaterial({ color: 0x7a3d34, roughness: 0.9 });
const coatDarkMat = new THREE.MeshStandardMaterial({ color: 0x2f3333, roughness: 0.92 });
const eagleMat = new THREE.MeshStandardMaterial({ color: 0x332d27, roughness: 0.82, side: THREE.DoubleSide });
const beakMat = new THREE.MeshStandardMaterial({ color: 0xb28a45, roughness: 0.7 });

const flagVertexShader = `
  attribute vec3 aColor;
  attribute float aPhase;
  uniform float uTime;
  varying vec3 vColor;
  varying float vShade;
  void main() {
    vColor = aColor;
    vec3 p = position;
    float wave = sin(uTime * 2.4 + aPhase + p.x * 2.2 + p.y * 3.1);
    p.z += wave * (0.05 + max(0.0, 4.0 - p.y) * 0.05);
    p.x += sin(uTime * 1.5 + aPhase * 1.7) * 0.025;
    vShade = 0.82 + 0.18 * wave;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const flagFragmentShader = `
  varying vec3 vColor;
  varying float vShade;
  void main() {
    gl_FragColor = vec4(vColor * vShade, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

function rand(seed, n) {
  const x = Math.sin(seed * 127.1 + n * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function addRod(list, ax, ay, az, bx, by, bz, r = 0.05, seg = 5) {
  const dx = bx - ax;
  const dy = by - ay;
  const dz = bz - az;
  const len = Math.hypot(dx, dy, dz);
  if (len < 0.0001) return;
  const g = new THREE.CylinderGeometry(r, r, len, seg);
  g.translate(0, len / 2, 0);
  const q = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(dx, dy, dz).normalize()
  );
  g.applyQuaternion(q);
  g.translate(ax, ay, az);
  list.push(g);
}

function addBand(list, radius, y, height, count, size, matPush) {
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const g = new THREE.BoxGeometry(size[0], height, size[1]);
    g.rotateY(-a);
    g.translate(Math.cos(a) * radius, y, Math.sin(a) * radius);
    matPush.push(g);
  }
}

export function createYurt({ x = 0, z = 0, rot = 0, scale = 1, trim = 'blue' }) {
  const group = new THREE.Group();
  const felt = [];
  const shade = [];
  const blue = [];
  const red = [];
  const wood = [];
  const ropes = [];

  addCylinder(wood, 5.2, 5.35, 0.28, 30, 0, 0.14, 0);
  const wall = new THREE.CylinderGeometry(4.28, 4.62, 2.85, 30);
  wall.translate(0, 1.78, 0);
  felt.push(wall);
  const roof = new THREE.ConeGeometry(5.05, 2.1, 30);
  roof.translate(0, 4.25, 0);
  shade.push(roof);
  const roofUpper = new THREE.ConeGeometry(2.3, 1.15, 24);
  roofUpper.translate(0, 5.35, 0);
  felt.push(roofUpper);
  const doorGeo = new THREE.BoxGeometry(1.65, 2.25, 0.22);
  doorGeo.translate(0, 1.35, 4.43);
  wood.push(doorGeo);
  const doorTop = new THREE.BoxGeometry(2.1, 0.24, 0.36);
  doorTop.translate(0, 2.55, 4.48);
  wood.push(doorTop);
  const dark = new THREE.BoxGeometry(1.2, 1.85, 0.1);
  dark.translate(0, 1.24, 4.57);
  shade.push(dark);
  addBand(blue, 4.65, 0.86, 0.32, 22, [0.46, 0.09], trim === 'blue' ? blue : red);
  addBand(red, 4.36, 2.62, 0.18, 24, [0.34, 0.08], trim === 'red' ? red : blue);
  const torus = new THREE.TorusGeometry(1.15, 0.11, 6, 20);
  torus.rotateX(Math.PI / 2);
  torus.translate(0, 5.92, 0);
  red.push(torus);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + 0.15;
    addRod(ropes, Math.cos(a) * 1.25, 5.78, Math.sin(a) * 1.25, Math.cos(a) * 5.05, 0.22, Math.sin(a) * 5.05, 0.028, 4);
    addRod(ropes, Math.cos(a) * 4.72, 3.05, Math.sin(a) * 4.72, Math.cos(a) * 5.2, 0.3, Math.sin(a) * 5.2, 0.022, 4);
  }
  for (const [list, material] of [[felt, feltMat], [shade, feltShadeMat], [blue, yurtBlueMat], [red, yurtRedMat], [wood, mats.timber], [ropes, ropeMat]]) {
    const m = mergedMesh(list, material, true, true);
    if (m) group.add(m);
  }
  group.position.set(x, 0, z);
  group.rotation.y = rot;
  group.scale.setScalar(scale);
  return group;
}

export function createHorse({ x = 0, z = 0, rot = 0, scale = 1, dark = false }) {
  const group = new THREE.Group();
  const bodyList = [];
  const darkList = [];
  const saddleList = [];
  const blanketList = [];
  const bodyMat = dark ? horseDarkMat : horseBrownMat;
  const body = new THREE.SphereGeometry(1.0, 12, 9);
  body.scale(1.55, 0.92, 0.72);
  body.translate(0, 1.55, 0.05);
  bodyList.push(body);
  const neck = new THREE.CylinderGeometry(0.3, 0.44, 1.25, 8);
  neck.rotateX(-0.62);
  neck.translate(0, 2.05, 1.02);
  bodyList.push(neck);
  const head = new THREE.SphereGeometry(0.38, 10, 8);
  head.scale(0.8, 0.9, 1.35);
  head.translate(0, 2.55, 1.62);
  bodyList.push(head);
  const muzzle = new THREE.SphereGeometry(0.24, 8, 6);
  muzzle.scale(1.0, 0.72, 1.3);
  muzzle.translate(0, 2.36, 2.05);
  bodyList.push(muzzle);
  for (const sx of [-1, 1]) {
    const ear = new THREE.ConeGeometry(0.1, 0.32, 5);
    ear.translate(sx * 0.16, 2.91, 1.49);
    darkList.push(ear);
    for (const sz of [-0.52, 0.58]) {
      const leg = new THREE.CylinderGeometry(0.12, 0.16, 1.28, 6);
      leg.translate(sx * 0.72, 0.68, sz);
      bodyList.push(leg);
      const hoof = new THREE.CylinderGeometry(0.17, 0.19, 0.16, 6);
      hoof.translate(sx * 0.72, 0.08, sz);
      darkList.push(hoof);
    }
    const stirrup = new THREE.BoxGeometry(0.05, 0.45, 0.05);
    stirrup.translate(sx * 0.9, 1.42, 0.28);
    saddleList.push(stirrup);
    const stirrupIron = new THREE.TorusGeometry(0.13, 0.025, 4, 8);
    stirrupIron.rotateY(Math.PI / 2);
    stirrupIron.translate(sx * 0.93, 1.18, 0.28);
    darkList.push(stirrupIron);
  }
  const mane = new THREE.BoxGeometry(0.13, 0.6, 0.5);
  mane.translate(0, 2.55, 1.06);
  darkList.push(mane);
  const tail = new THREE.ConeGeometry(0.22, 1.15, 6);
  tail.rotateX(0.45);
  tail.translate(0, 1.86, -1.0);
  darkList.push(tail);
  const blanket = new THREE.BoxGeometry(1.15, 0.19, 1.25);
  blanket.rotateX(0.06);
  blanket.translate(0, 2.06, 0.08);
  blanketList.push(blanket);
  const saddle = new THREE.BoxGeometry(0.72, 0.36, 0.88);
  saddle.translate(0, 2.27, 0.08);
  saddleList.push(saddle);
  const pommel = new THREE.BoxGeometry(0.44, 0.22, 0.14);
  pommel.translate(0, 2.5, 0.52);
  saddleList.push(pommel);
  addRod(darkList, 0.16, 2.57, 1.82, 0.28, 2.31, 0.6, 0.018, 4);
  addRod(darkList, -0.16, 2.57, 1.82, -0.28, 2.31, 0.6, 0.018, 4);

  for (const [list, material] of [
    [bodyList, bodyMat],
    [darkList, horseDarkMat],
    [saddleList, saddleMat],
    [blanketList, blanketMat],
  ]) {
    const m = mergedMesh(list, material, true, true);
    if (m) group.add(m);
  }
  group.position.set(x, 0, z);
  group.rotation.y = rot;
  group.scale.setScalar(scale);
  return group;
}

export function createPrayerFlags() {
  const group = new THREE.Group();
  const poles = [];
  const ropeLines = [];
  const flagPositions = [];
  const flagUvs = [];
  const flagColors = [];
  const flagPhases = [];
  const flagIndices = [];
  const palette = [
    new THREE.Color(0x2c6fa4), new THREE.Color(0xe8d26e), new THREE.Color(0xb64b3b),
    new THREE.Color(0x4d8b5c), new THREE.Color(0xeee9da),
  ];
  const lines = [
    { a: [146, 52], b: [194, 64], y: 7.3, sag: 1.15, count: 14 },
    { a: [142, -18], b: [190, -8], y: 7.0, sag: 1.05, count: 14 },
    { a: [182, 12], b: [218, 30], y: 6.4, sag: 0.9, count: 10 },
  ];
  lines.forEach((line, li) => {
    const [ax, az] = line.a;
    const [bx, bz] = line.b;
    addCylinder(poles, 0.1, 0.15, line.y + 0.5, 7, ax, (line.y + 0.5) / 2, az);
    addCylinder(poles, 0.1, 0.15, line.y + 0.5, 7, bx, (line.y + 0.5) / 2, bz);
    for (let i = 0; i < line.count; i++) {
      const t0 = i / line.count;
      const t1 = (i + 1) / line.count;
      const tm = (t0 + t1) / 2;
      const x = ax + (bx - ax) * tm;
      const z = az + (bz - az) * tm;
      const yTop = line.y - line.sag * 4 * tm * (1 - tm);
      const dirX = (bx - ax) / Math.hypot(bx - ax, bz - az);
      const dirZ = (bz - az) / Math.hypot(bx - ax, bz - az);
      const w = 0.44;
      const h = 0.55;
      addRod(ropeLines, ax + (bx - ax) * t0, line.y - line.sag * 4 * t0 * (1 - t0), az + (bz - az) * t0, x - dirX * w / 2, yTop, z - dirZ * w / 2, 0.022, 4);
      const base = flagPositions.length / 3;
      flagPositions.push(
        x - dirX * w / 2, yTop, z - dirZ * w / 2,
        x + dirX * w / 2, yTop, z + dirZ * w / 2,
        x + dirX * w / 2, yTop - h, z + dirZ * w / 2,
        x - dirX * w / 2, yTop - h, z - dirZ * w / 2
      );
      flagUvs.push(0, 1, 1, 1, 1, 0, 0, 0);
      const col = palette[(i + li) % palette.length];
      for (let k = 0; k < 4; k++) {
        flagColors.push(col.r, col.g, col.b);
        flagPhases.push(li * 1.7 + i * 0.63);
      }
      flagIndices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  });
  const pm = mergedMesh(poles, mats.timber, true, true);
  if (pm) group.add(pm);
  const rm = mergedMesh(ropeLines, ropeMat, false, true);
  if (rm) group.add(rm);
  const fg = new THREE.BufferGeometry();
  fg.setAttribute('position', new THREE.Float32BufferAttribute(flagPositions, 3));
  fg.setAttribute('uv', new THREE.Float32BufferAttribute(flagUvs, 2));
  fg.setAttribute('aColor', new THREE.Float32BufferAttribute(flagColors, 3));
  fg.setAttribute('aPhase', new THREE.Float32BufferAttribute(flagPhases, 1));
  fg.setIndex(flagIndices);
  const flagMaterial = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: flagVertexShader,
    fragmentShader: flagFragmentShader,
    side: THREE.DoubleSide,
  });
  const flags = new THREE.Mesh(fg, flagMaterial);
  flags.frustumCulled = false;
  group.add(flags);
  function update(t) {
    flagMaterial.uniforms.uTime.value = t;
  }
  return { group, update };
}

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

function createEagle(scale = 1) {
  const group = new THREE.Group();
  const bodyList = [];
  const body = new THREE.SphereGeometry(0.45, 10, 8);
  body.scale(0.8, 0.72, 1.8);
  bodyList.push(body);
  const head = new THREE.SphereGeometry(0.24, 8, 6);
  head.translate(0, 0.16, 0.85);
  bodyList.push(head);
  const tail = new THREE.ConeGeometry(0.24, 0.72, 5);
  tail.rotateX(-Math.PI / 2);
  tail.translate(0, 0, -1.0);
  bodyList.push(tail);
  const bm = mergedMesh(bodyList, eagleMat, false, false);
  if (bm) group.add(bm);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.26, 5), beakMat);
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, 0.12, 1.08);
  group.add(beak);
  const left = new THREE.Group();
  const right = new THREE.Group();
  left.position.set(-0.25, 0.08, 0.05);
  right.position.set(0.25, 0.08, 0.05);
  const lw = new THREE.Mesh(makeWing(true), eagleMat);
  const rw = new THREE.Mesh(makeWing(false), eagleMat);
  left.add(lw);
  right.add(rw);
  group.add(left, right);
  group.scale.setScalar(scale);
  group.userData.wings = [left, right];
  return group;
}

export function createEagles() {
  const group = new THREE.Group();
  const eagles = [];
  const defs = [
    { cx: 30, cz: 250, rx: 110, rz: 70, alt: 105, speed: 0.09, phase: 0.4, scale: 1.3 },
    { cx: -60, cz: 300, rx: 150, rz: 95, alt: 140, speed: -0.065, phase: 2.2, scale: 1.05 },
    { cx: 100, cz: 210, rx: 85, rz: 58, alt: 125, speed: 0.075, phase: 4.3, scale: 0.9 },
  ];
  defs.forEach((d) => {
    const e = createEagle(d.scale);
    e.userData.def = d;
    group.add(e);
    eagles.push(e);
  });
  function update(t) {
    for (const e of eagles) {
      const d = e.userData.def;
      const a = t * d.speed + d.phase;
      const x = d.cx + Math.cos(a) * d.rx;
      const z = d.cz + Math.sin(a) * d.rz;
      const tx = -Math.sin(a) * d.rx;
      const tz = Math.cos(a) * d.rz;
      e.position.set(x, d.alt + Math.sin(t * 0.55 + d.phase) * 6, z);
      e.rotation.y = Math.atan2(tx, tz);
      e.rotation.z = -Math.cos(a) * 0.18;
      const flap = 0.18 + Math.sin(t * 4.6 + d.phase) * 0.45;
      const [left, right] = e.userData.wings;
      left.rotation.z = flap;
      right.rotation.z = -flap;
    }
  }
  update(0);
  return { group, update };
}

export function createVisitor({ x = 0, z = 0, rot = 0, coat = 'blue' }) {
  const group = new THREE.Group();
  const dark = [];
  const skin = [];
  const cloth = [];
  for (const sx of [-0.16, 0.16]) {
    const leg = new THREE.CylinderGeometry(0.1, 0.13, 0.86, 6);
    leg.translate(sx, 0.43, 0);
    dark.push(leg);
    const boot = new THREE.BoxGeometry(0.24, 0.14, 0.36);
    boot.translate(sx, 0.08, 0.06);
    dark.push(boot);
  }
  const body = new THREE.CylinderGeometry(0.25, 0.34, 0.92, 8);
  body.translate(0, 1.28, 0);
  cloth.push(body);
  for (const sx of [-0.36, 0.36]) {
    const arm = new THREE.CylinderGeometry(0.075, 0.09, 0.76, 5);
    arm.rotateZ(sx > 0 ? -0.16 : 0.16);
    arm.translate(sx, 1.28, 0);
    cloth.push(arm);
  }
  const head = new THREE.SphereGeometry(0.18, 8, 6);
  head.translate(0, 1.94, 0);
  skin.push(head);
  const hat = new THREE.CylinderGeometry(0.2, 0.24, 0.12, 10);
  hat.translate(0, 2.11, 0);
  dark.push(hat);
  const clothMat = coat === 'red' ? coatRedMat : coat === 'dark' ? coatDarkMat : coatBlueMat;
  for (const [list, material] of [[dark, coatDarkMat], [skin, skinMat], [cloth, clothMat]]) {
    const m = mergedMesh(list, material, true, true);
    if (m) group.add(m);
  }
  group.position.set(x, 0, z);
  group.rotation.y = rot;
  return group;
}
