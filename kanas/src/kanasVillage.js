import * as THREE from 'three';
import { mats } from './materials.js';
import { addBox, addBar, mergedMesh } from './geometry.js';
import { rand } from './kanasTerrain.js';

function addLogX(list, len, r, x, y, z) {
  const g = new THREE.CylinderGeometry(r, r, len, 7);
  g.rotateZ(Math.PI / 2);
  g.translate(x, y, z);
  list.push(g);
}

function addLogZ(list, len, r, x, y, z) {
  const g = new THREE.CylinderGeometry(r, r, len, 7);
  g.rotateX(Math.PI / 2);
  g.translate(x, y, z);
  list.push(g);
}

function addRod(list, ax, ay, az, bx, by, bz, r1, r2 = r1, seg = 5) {
  const dx = bx - ax;
  const dy = by - ay;
  const dz = bz - az;
  const len = Math.hypot(dx, dy, dz);
  if (len < 0.0001) return;
  const g = new THREE.CylinderGeometry(r2, r1, len, seg);
  g.translate(0, len / 2, 0);
  const q = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(dx, dy, dz).normalize()
  );
  g.applyQuaternion(q);
  g.translate(ax, ay, az);
  list.push(g);
}

export function createCabin({ x, z, rot = 0, w = 8, d = 6.5, wallH = 2.9, smokeSpots }) {
  const group = new THREE.Group();
  const logs = [];
  const planks = [];
  const roofs = [];
  const roofsDark = [];
  const stones = [];
  const windows = [];
  const doors = [];
  const wood = [];
  const ridgeH = d * 0.3;
  const rowH = 0.3;
  const rows = Math.max(6, Math.round(wallH / rowH));
  for (let i = 0; i < rows; i++) {
    const y = 0.24 + i * rowH;
    const jitter = (rand(401 + i, 1) - 0.5) * 0.03;
    addLogX(logs, w + 0.7, 0.145, 0, y, -d / 2 + jitter);
    addLogX(logs, w + 0.7, 0.145, 0, y, d / 2 - jitter);
    addLogZ(logs, d + 0.7, 0.145, -w / 2 + jitter, y, 0);
    addLogZ(logs, d + 0.7, 0.145, w / 2 - jitter, y, 0);
  }
  const nStone = Math.max(5, Math.round(w / 1.4));
  for (let i = 0; i < nStone; i++) {
    const t = i / (nStone - 1);
    const sx = -w / 2 + t * w;
    addBox(stones, 0.8, 0.34, 0.7, sx, 0.16, d / 2 + 0.1);
    addBox(stones, 0.8, 0.34, 0.7, sx, 0.16, -d / 2 - 0.1);
  }
  for (const side of [-1, 1]) {
    addBox(stones, 0.7, 0.34, d, side * (w / 2 + 0.1), 0.16, 0);
  }

  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, 0);
  shape.lineTo(w / 2, 0);
  shape.lineTo(0, ridgeH);
  shape.closePath();
  const gableGeo = new THREE.ShapeGeometry(shape);
  const gableFront = gableGeo.clone();
  gableFront.translate(0, wallH, d / 2 + 0.02);
  planks.push(gableFront);
  const gableBack = gableGeo.clone();
  gableBack.rotateY(Math.PI);
  gableBack.translate(0, wallH, -d / 2 - 0.02);
  planks.push(gableBack);

  const overhang = 0.7;
  const halfD = d / 2 + overhang;
  const slopeLen = Math.hypot(halfD, ridgeH);
  const angle = Math.atan2(ridgeH, halfD);
  for (const side of [1, -1]) {
    const slab = new THREE.BoxGeometry(w + 1.6, 0.18, slopeLen);
    slab.rotateX(side * angle);
    slab.translate(0, wallH + ridgeH / 2 + 0.08, (side * halfD) / 2);
    roofs.push(slab);
  }
  addBox(roofsDark, w + 1.8, 0.12, 0.26, 0, wallH + ridgeH + 0.12, 0);
  for (let i = 0; i < 7; i++) {
    addBox(roofsDark, 0.12, 0.1, d + 1.4, -w / 2 + 0.4 + i * ((w - 0.8) / 6), wallH + 0.1, 0);
  }

  const doorX = w * 0.16;
  addBox(doors, 1.15, 2.0, 0.16, doorX, 1.12, d / 2 + 0.16);
  addBox(wood, 1.45, 0.14, 0.28, doorX, 2.2, d / 2 + 0.22);
  addBox(wood, 0.12, 2.24, 0.28, doorX - 0.68, 1.12, d / 2 + 0.22);
  addBox(wood, 0.12, 2.24, 0.28, doorX + 0.68, 1.12, d / 2 + 0.22);
  for (const [wx, wz, wr] of [
    [-w * 0.28, d / 2 + 0.13, 0],
    [w / 2 + 0.13, -d * 0.18, Math.PI / 2],
  ]) {
    addBox(wood, 0.98, 0.82, 0.12, wx, 1.62, wz, wr);
    addBox(windows, 0.74, 0.58, 0.15, wx, 1.62, wz, wr);
    addBox(wood, 0.06, 0.6, 0.16, wx, 1.62, wz + 0.01, wr);
    addBox(wood, 0.76, 0.06, 0.16, wx, 1.62, wz + 0.01, wr);
  }

  for (const side of [-1, 1]) {
    addBox(wood, 0.16, 2.1, 0.16, doorX + side * 0.95, 1.05, d / 2 + 1.15);
  }
  addBox(roofsDark, 2.6, 0.12, 1.6, doorX, 2.25, d / 2 + 0.65);

  const chimneyX = -w * 0.3;
  const chimneyZ = -d * 0.16;
  for (let i = 0; i < 7; i++) {
    const s = 0.62 - i * 0.025;
    addBox(stones, s, 0.36, s, chimneyX + (rand(421 + i, 2) - 0.5) * 0.06, 0.3 + i * 0.36, chimneyZ);
  }
  const chimneyTop = 0.3 + 6 * 0.36 + 0.25;
  addBox(stones, 0.74, 0.16, 0.74, chimneyX, chimneyTop, chimneyZ);

  for (let i = 0; i < 15; i++) {
    const row = (i / 5) | 0;
    const col = i % 5;
    const lx = w / 2 + 0.75 + col * 0.31;
    const g = new THREE.CylinderGeometry(0.13, 0.13, 1.5, 5);
    g.rotateZ(Math.PI / 2);
    g.translate(lx, 0.16 + row * 0.24, -d / 2 + 0.9);
    logs.push(g);
  }

  for (const [list, material, cast] of [
    [logs, mats.logWall, true],
    [planks, mats.timber, true],
    [roofs, mats.roof, true],
    [roofsDark, mats.roofDark, true],
    [stones, mats.stone, true],
    [windows, mats.windowWarm, false],
    [doors, mats.timberDark, false],
    [wood, mats.plankDark, true],
  ]) {
    const m = mergedMesh(list, material, cast, true);
    if (m) group.add(m);
  }
  if (smokeSpots) {
    smokeSpots.push({
      x: x + Math.cos(rot) * chimneyX + Math.sin(rot) * chimneyZ,
      y: chimneyTop + 0.2,
      z: z - Math.sin(rot) * chimneyX + Math.cos(rot) * chimneyZ,
    });
  }
  group.position.set(x, 0, z);
  group.rotation.y = rot;
  return group;
}

export function createFence(points, { height = 1.15, postGap = 2.6, gap = null } = {}) {
  const posts = [];
  const rails = [];
  for (let i = 0; i < points.length - 1; i++) {
    const [ax, az] = points[i];
    const [bx, bz] = points[i + 1];
    const len = Math.hypot(bx - ax, bz - az);
    if (len < 0.01) continue;
    if (gap) {
      const dx = (bx - ax) / len;
      const dz = (bz - az) / len;
      const t0 = ((gap.x - ax) * dx + (gap.z - az) * dz) / len;
      if (t0 > 0 && t0 < 1) {
        const gl = gap.width || 3;
        const gx = ax + dx * len * t0;
        const gz = az + dz * len * t0;
        const a2x = gx - dx * gl * 0.5;
        const a2z = gz - dz * gl * 0.5;
        const b2x = gx + dx * gl * 0.5;
        const b2z = gz + dz * gl * 0.5;
        buildFenceRun(posts, rails, ax, az, a2x, a2z, height, postGap);
        buildFenceRun(posts, rails, b2x, b2z, bx, bz, height, postGap);
        continue;
      }
    }
    buildFenceRun(posts, rails, ax, az, bx, bz, height, postGap);
  }
  const group = new THREE.Group();
  const pm = mergedMesh(posts, mats.plankDark, true, true);
  if (pm) group.add(pm);
  const rm = mergedMesh(rails, mats.plank, true, true);
  if (rm) group.add(rm);
  return group;
}

function buildFenceRun(posts, rails, ax, az, bx, bz, height, postGap) {
  const len = Math.hypot(bx - ax, bz - az);
  if (len < 0.1) return;
  const n = Math.max(1, Math.round(len / postGap));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = ax + (bx - ax) * t;
    const z = az + (bz - az) * t;
    addBox(posts, 0.18, height + 0.2, 0.18, x, (height + 0.2) * 0.5, z);
  }
  addBar(rails, ax, az, bx, bz, height, 0.1, 0.12);
  addBar(rails, ax, az, bx, bz, height * 0.55, 0.08, 0.09);
}

export function createVillage() {
  const group = new THREE.Group();
  const smokeSpots = [];
  const houses = [
    { x: 154, z: 12, rot: -0.35, w: 9.0, d: 7.0, wallH: 3.0 },
    { x: 181, z: 36, rot: 0.55, w: 7.6, d: 6.2, wallH: 2.8 },
    { x: 151, z: 55, rot: -0.15, w: 7.2, d: 5.8, wallH: 2.7 },
    { x: 198, z: 8, rot: 1.05, w: 6.4, d: 5.2, wallH: 2.5 },
  ];
  houses.forEach((h) => group.add(createCabin({ ...h, smokeSpots })));

  group.add(
    createFence(
      [
        [132, -2], [132, 74], [214, 74], [214, -2], [132, -2],
      ],
      { height: 1.12, postGap: 2.8, gap: { x: 132, z: 30, width: 5 } }
    )
  );
  group.add(
    createFence(
      [
        [138, -28], [176, -28], [176, -4], [138, -4], [138, -28],
      ],
      { height: 1.05, postGap: 2.5, gap: { x: 138, z: -16, width: 4.5 } }
    )
  );
  group.add(
    createFence(
      [
        [188, 70], [222, 70], [222, 98], [188, 98], [188, 70],
      ],
      { height: 1.0, postGap: 2.6, gap: { x: 206, z: 70, width: 4 } }
    )
  );

  const path = [];
  const route = [
    [132, 30], [146, 28], [154, 22], [166, 32], [181, 42], [191, 20],
    [151, 49], [163, 58], [188, 76],
  ];
  for (let i = 0; i < route.length - 1; i++) {
    addBar(path, route[i][0], route[i][1], route[i + 1][0], route[i + 1][1], 0.03, 0.03, 1.8);
  }
  const pm = mergedMesh(path, mats.timberDark, false, true);
  if (pm) group.add(pm);

  const horses = [
    { x: 145, z: -14, rot: 1.1, coat: 0 },
    { x: 160, z: -20, rot: 2.3, coat: 1 },
    { x: 169, z: -10, rot: 0.2, coat: 2 },
    { x: 207, z: 48, rot: -1.2, coat: 0 },
    { x: 142, z: 66, rot: 2.8, coat: 1 },
  ];
  horses.forEach((h) => group.add(createHorse(h)));

  return { group, smokeSpots, horses };
}

const smokeVertexShader = `
  attribute vec3 aOrigin;
  attribute float aPhase;
  uniform float uTime;
  varying vec2 vUv;
  varying float vFade;
  void main() {
    vUv = uv;
    float c = fract(uTime * 0.055 + aPhase);
    float rise = c * 10.5;
    float grow = 1.0 + c * 3.2;
    vec3 p = aOrigin + vec3(
      position.x * grow + sin(uTime * 0.6 + aPhase * 6.28) * 0.35,
      position.y * grow + rise,
      position.z * grow
    );
    vFade = smoothstep(0.0, 0.12, c) * (1.0 - c);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const smokeFragmentShader = `
  uniform vec3 uColor;
  varying vec2 vUv;
  varying float vFade;
  void main() {
    float d = length(vUv - vec2(0.5));
    float a = smoothstep(0.5, 0.05, d);
    gl_FragColor = vec4(uColor, a * vFade * 0.24);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export function createHorse({ x = 0, z = 0, rot = 0, scale = 1, coat = 0 }) {
  const group = new THREE.Group();
  const bodyList = [];
  const darkList = [];
  const saddleList = [];
  const blanketList = [];
  const tackList = [];
  const metalList = [];
  const bodyMat = coat === 1 ? mats.horseDark : coat === 2 ? mats.horseCream : mats.horseBrown;

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
  const blaze = new THREE.BoxGeometry(0.12, 0.5, 0.1);
  blaze.translate(0, 2.7, 1.9);
  darkList.push(blaze);
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
    metalList.push(stirrupIron);
    const bag = new THREE.BoxGeometry(0.26, 0.38, 0.42);
    bag.translate(sx * 0.7, 1.78, -0.28);
    blanketList.push(bag);
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
  const blanketTrim = new THREE.BoxGeometry(1.22, 0.06, 1.32);
  blanketTrim.rotateX(0.06);
  blanketTrim.translate(0, 2.15, 0.08);
  tackList.push(blanketTrim);
  const saddle = new THREE.BoxGeometry(0.72, 0.36, 0.88);
  saddle.translate(0, 2.27, 0.08);
  saddleList.push(saddle);
  const pommel = new THREE.BoxGeometry(0.44, 0.22, 0.14);
  pommel.translate(0, 2.5, 0.52);
  saddleList.push(pommel);
  const cantle = new THREE.BoxGeometry(0.48, 0.18, 0.12);
  cantle.translate(0, 2.5, -0.4);
  saddleList.push(cantle);
  for (const sx of [-1, 1]) {
    const cheek = new THREE.BoxGeometry(0.035, 0.02, 0.62);
    cheek.translate(sx * 0.17, 2.62, 1.84);
    tackList.push(cheek);
    const nose = new THREE.BoxGeometry(0.44, 0.035, 0.035);
    nose.translate(0, 2.28, 2.12);
    tackList.push(nose);
    addRod(tackList, sx * 0.18, 2.6, 1.92, sx * 0.34, 2.34, 0.62, 0.018, 0.018, 4);
  }
  for (const [list, material] of [
    [bodyList, bodyMat],
    [darkList, mats.horseDark],
    [saddleList, mats.saddle],
    [blanketList, mats.blanket],
    [tackList, mats.tack],
    [metalList, mats.metal],
  ]) {
    const m = mergedMesh(list, material, true, true);
    if (m) group.add(m);
  }
  group.position.set(x, 0, z);
  group.rotation.y = rot;
  group.scale.setScalar(scale);
  return group;
}

export function createSmoke(spots) {
  const positions = [];
  const uvs = [];
  const origins = [];
  const phases = [];
  const indices = [];
  spots.forEach((spot, si) => {
    for (let i = 0; i < 5; i++) {
      const base = positions.length / 3;
      const phase = i / 5 + rand(501 + si, i) * 0.12;
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
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(0xd9d8d0) } },
    vertexShader: smokeVertexShader,
    fragmentShader: smokeFragmentShader,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, material);
  mesh.name = 'kanas-smoke';
  mesh.frustumCulled = false;
  mesh.renderOrder = 3;
  const group = new THREE.Group();
  group.add(mesh);
  function update(t) {
    material.uniforms.uTime.value = t;
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
  const bm = mergedMesh(bodyList, mats.eagle, false, false);
  if (bm) group.add(bm);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.26, 5), mats.beak);
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, 0.12, 1.08);
  group.add(beak);
  const left = new THREE.Group();
  const right = new THREE.Group();
  left.position.set(-0.25, 0.08, 0.05);
  right.position.set(0.25, 0.08, 0.05);
  left.add(new THREE.Mesh(makeWing(true), mats.eagle));
  right.add(new THREE.Mesh(makeWing(false), mats.eagle));
  group.add(left, right);
  group.scale.setScalar(scale);
  group.userData.wings = [left, right];
  return group;
}

export function createEagles() {
  const group = new THREE.Group();
  group.name = 'kanas-eagles';
  const eagles = [];
  const defs = [
    { cx: 20, cz: 70, rx: 150, rz: 105, alt: 118, speed: 0.075, phase: 0.4, scale: 1.35 },
    { cx: -40, cz: 130, rx: 185, rz: 120, alt: 155, speed: -0.055, phase: 2.2, scale: 1.1 },
    { cx: 110, cz: 20, rx: 105, rz: 78, alt: 132, speed: 0.065, phase: 4.3, scale: 0.95 },
    { cx: 30, cz: 250, rx: 220, rz: 140, alt: 178, speed: -0.04, phase: 5.4, scale: 0.85 },
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
      e.position.set(x, d.alt + Math.sin(t * 0.5 + d.phase) * 7, z);
      e.rotation.y = Math.atan2(tx, tz);
      e.rotation.z = -Math.cos(a) * 0.16;
      const flap = 0.16 + Math.sin(t * 4.4 + d.phase) * 0.42;
      const [left, right] = e.userData.wings;
      left.rotation.z = flap;
      right.rotation.z = -flap;
    }
  }
  update(0);
  return { group, update };
}

export function createVisitor({ x = 0, z = 0, rot = 0, coat = 'blue', backpack = false }) {
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
  if (backpack) {
    const pack = new THREE.BoxGeometry(0.48, 0.6, 0.26);
    pack.translate(0, 1.36, -0.3);
    cloth.push(pack);
  }
  const head = new THREE.SphereGeometry(0.18, 8, 6);
  head.translate(0, 1.94, 0);
  skin.push(head);
  const hat = new THREE.CylinderGeometry(0.2, 0.24, 0.12, 10);
  hat.translate(0, 2.11, 0);
  dark.push(hat);
  const clothMat = coat === 'red' ? mats.coatRed : coat === 'dark' ? mats.coatDark : coat === 'gold' ? mats.coatGold : mats.coatBlue;
  for (const [list, material] of [
    [dark, mats.coatDark],
    [skin, mats.skin],
    [cloth, clothMat],
  ]) {
    const m = mergedMesh(list, material, true, true);
    if (m) group.add(m);
  }
  group.position.set(x, 0, z);
  group.rotation.y = rot;
  return group;
}
