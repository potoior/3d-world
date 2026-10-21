import * as THREE from 'three';
import { mergeStaticGroup } from './geometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const TAU = Math.PI * 2;

function rng(seed) {
  let s = Math.abs(Math.floor(seed)) % 2147483647 || 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

const MAT = new Map();
function mat(color, rough = 0.95, side = THREE.FrontSide) {
  const key = color + ':' + rough + ':' + side;
  if (!MAT.has(key)) MAT.set(key, new THREE.MeshStandardMaterial({ color, roughness: rough, side }));
  return MAT.get(key);
}

const M = {
  earth: mat(0x8a7352, 0.99),
  wetEarth: mat(0x655238, 0.96, THREE.DoubleSide),
  bund: mat(0x77613f, 1.0),
  grass: mat(0x6f7d46, 0.97),
  forest: mat(0x35503a, 0.98),
  forestLight: mat(0x48613f, 0.98),
  ridge: mat(0x40533f, 0.99),
  ridgeFar: mat(0x51605a, 1.0),
  valley: mat(0x344433, 1.0),
  stone: mat(0x7c7568, 0.94),
  mud: mat(0xb0925f, 0.97),
  mudDark: mat(0x8d7148, 0.98),
  wood: mat(0x4c3826, 0.9),
  straw: mat(0xb08b50, 1.0),
  strawDark: mat(0x8b6b3d, 1.0),
  path: mat(0xa08a63, 0.98),
  palmTrunk: mat(0x6b4f31, 0.95),
  palmLeaf: mat(0x3e683d, 0.9, THREE.DoubleSide),
  rock: mat(0x6d6659, 0.98),
};

function addMesh(parent, geo, material, x, y, z, ry = 0) {
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(x, y, z);
  mesh.rotation.y = ry;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function box(parent, w, h, d, material, x, y, z, ry = 0) {
  return addMesh(parent, new THREE.BoxGeometry(w, h, d), material, x, y, z, ry);
}

function cyl(parent, rt, rb, h, seg, material, x, y, z) {
  return addMesh(parent, new THREE.CylinderGeometry(rt, rb, h, seg), material, x, y, z);
}

function cone(parent, r, h, seg, material, x, y, z, ry = 0) {
  return addMesh(parent, new THREE.ConeGeometry(r, h, seg), material, x, y, z, ry);
}

function addMerged(parent, list, material, cast = true, receive = true) {
  if (!list.length) return null;
  const normalized = list.map((source) => {
    let g = source.index ? source.toNonIndexed() : source.clone();
    for (const key of Object.keys(g.attributes)) {
      if (key !== 'position' && key !== 'normal' && key !== 'uv') g.deleteAttribute(key);
    }
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!g.attributes.uv) {
      const count = g.attributes.position.count;
      g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(count * 2), 2));
    }
    return g;
  });
  const geo = mergeGeometries(normalized, false);
  list.forEach((g) => g.dispose());
  normalized.forEach((g) => g.dispose());
  if (!geo) return null;
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  parent.add(mesh);
  return mesh;
}

function ringGeometry({
  cx, cz, rot = 0, aspectX = 1, aspectZ = 1,
  rIn, rOut, yIn, yOut, segs = 110, phase = 0, wobble = 1.1,
  arc0 = 0, arc1 = TAU,
}) {
  const pos = [];
  const uv = [];
  const idx = [];
  const cr = Math.cos(rot);
  const sr = Math.sin(rot);
  const radiusAt = (a, r) => r + Math.sin(a * 3 + phase) * wobble + Math.sin(a * 7 + phase * 1.7 + 0.8) * wobble * 0.45;
  const point = (a, r, y) => {
    const rr = radiusAt(a, r);
    const lx = Math.cos(a) * rr * aspectX;
    const lz = Math.sin(a) * rr * aspectZ;
    return [cx + lx * cr - lz * sr, y, cz + lx * sr + lz * cr];
  };
  for (let j = 0; j <= segs; j++) {
    const a = arc0 + (arc1 - arc0) * (j / segs);
    const pi = point(a, rIn, yIn);
    const po = point(a, rOut, yOut);
    pos.push(pi[0], pi[1], pi[2], po[0], po[1], po[2]);
    uv.push(j / segs, 0, j / segs, 1);
  }
  for (let j = 0; j < segs; j++) {
    const a = j * 2;
    const b = a + 1;
    const c = a + 2;
    const d = a + 3;
    idx.push(a, c, b, b, c, d);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

function buildTerraceField(opts) {
  const {
    cx, cz, r0, bands, width, y0, drop,
    aspectX = 1, aspectZ = 1, rot = 0, wobble = 1.1, phase = 0, segs = 110,
  } = opts;
  const earth = [];
  const risers = [];
  const bunds = [];
  const water = [];
  const common = { cx, cz, rot, aspectX, aspectZ, wobble, phase, segs };
  earth.push(ringGeometry({ ...common, rIn: 0, rOut: r0 + 0.4, yIn: y0, yOut: y0 }));
  for (let i = 0; i < bands; i++) {
    const y = y0 - i * drop;
    const rIn = r0 + i * width;
    const rOut = rIn + width;
    earth.push(ringGeometry({ ...common, rIn: rIn - 0.2, rOut: rOut + 0.2, yIn: y, yOut: y }));
    if (i > 0) {
      risers.push(ringGeometry({ ...common, rIn: rIn - 0.55, rOut: rIn + 0.25, yIn: y - 0.25, yOut: y + drop + 0.25 }));
    }
    bunds.push(ringGeometry({ ...common, rIn: rOut - 1.15, rOut: rOut - 0.05, yIn: y + 0.18, yOut: y + 0.55 }));
    if (i < bands - 1) {
      water.push(ringGeometry({ ...common, rIn: rIn + 0.9, rOut: rOut - 1.35, yIn: y + 0.2, yOut: y + 0.2 }));
    }
  }
  return { earth, risers, bunds, water, cx, cz, r0, y0, aspectX, aspectZ, rot };
}

function addPine(parent, x, y, z, scale, seed) {
  const r = rng(seed);
  const h = (5.5 + r() * 4.5) * scale;
  cyl(parent, 0.16 * scale, 0.28 * scale, h * 0.62, 5, M.wood, x, y + h * 0.31, z);
  cone(parent, 1.65 * scale, h * 0.62, 7, r() > 0.5 ? M.forest : M.forestLight, x, y + h * 0.58, z);
  cone(parent, 1.32 * scale, h * 0.55, 7, r() > 0.5 ? M.forestLight : M.forest, x, y + h * 0.82, z);
  cone(parent, 0.9 * scale, h * 0.42, 7, M.forest, x, y + h * 1.04, z);
}

function addPalm(parent, x, z, scale, seed) {
  const r = rng(seed);
  const h = (7 + r() * 4.5) * scale;
  const lean = (r() - 0.5) * 1.8;
  for (let i = 0; i < 3; i++) {
    const t = i / 3;
    cyl(parent, (0.26 - t * 0.05) * scale, (0.38 - t * 0.05) * scale, h / 3 + 0.15, 6, M.palmTrunk, x + lean * t, h * (t + 0.16), z + lean * 0.35 * t);
  }
  const topX = x + lean * 0.9;
  const topZ = z + lean * 0.3;
  const topY = h * 1.04;
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * TAU + r() * 0.3;
    const frond = new THREE.ConeGeometry(0.62 * scale, (3.6 + r() * 1.4) * scale, 4, 1, true);
    frond.scale(1, 0.18, 1);
    frond.rotateZ(Math.PI / 2);
    frond.rotateY(a);
    frond.rotateX(-0.18 - r() * 0.28);
    frond.translate(topX + Math.cos(a) * 1.6 * scale, topY - 0.15, topZ + Math.sin(a) * 1.6 * scale);
    const mesh = new THREE.Mesh(frond, M.palmLeaf);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
  }
  addMesh(parent, new THREE.SphereGeometry(0.44 * scale, 6, 5), M.palmTrunk, topX, topY - 0.1, topZ);
}

function addMushroomHouse(parent, x, z, w, d, wallH, rot, seed, smokeOrigins, colliders) {
  const r = rng(seed);
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rot;
  parent.add(g);
  box(g, w + 1.3, 0.7, d + 1.3, M.stone, 0, 0.35, 0);
  box(g, w, wallH, d, M.mud, 0, 0.7 + wallH * 0.5, 0);
  box(g, w + 0.18, 0.32, d + 0.18, M.wood, 0, 0.7 + wallH * 0.52, 0);
  box(g, w * 0.36, wallH * 0.62, 0.24, M.wood, 0, 0.7 + wallH * 0.31, d * 0.5 + 0.14);
  box(g, w * 0.2, wallH * 0.26, 0.2, M.mudDark, -w * 0.28, 0.7 + wallH * 0.62, d * 0.5 + 0.12);
  box(g, w * 0.2, wallH * 0.26, 0.2, M.mudDark, w * 0.28, 0.7 + wallH * 0.62, d * 0.5 + 0.12);

  const wallTop = 0.7 + wallH;
  const roofW = Math.max(w, d) * 1.34;
  const eave = new THREE.ConeGeometry(1, 1, 4);
  eave.rotateY(Math.PI / 4);
  eave.scale(roofW * 0.72, 1.5, roofW * 0.72 * (d / w) + 0.9);
  const eaveMesh = new THREE.Mesh(eave, M.strawDark);
  eaveMesh.position.set(0, wallTop + 0.62, 0);
  eaveMesh.castShadow = true;
  eaveMesh.receiveShadow = true;
  g.add(eaveMesh);

  const capH = 2.4 + r() * 1.1;
  const cap = new THREE.ConeGeometry(1, 1, 4);
  cap.rotateY(Math.PI / 4);
  cap.scale(roofW * 0.56, capH, roofW * 0.56 * (d / w) + 0.55);
  const capMesh = new THREE.Mesh(cap, M.straw);
  capMesh.position.set(0, wallTop + 1.25 + capH * 0.5, 0);
  capMesh.castShadow = true;
  capMesh.receiveShadow = true;
  g.add(capMesh);

  box(g, 0.7, 1.7, 0.7, M.wood, w * 0.22, wallTop + 1.2, -d * 0.12);
  const smokeLocal = new THREE.Vector3(w * 0.22, wallTop + 2.1, -d * 0.12);
  smokeLocal.applyAxisAngle(new THREE.Vector3(0, 1, 0), rot);
  smokeOrigins.push([x + smokeLocal.x, smokeLocal.y, z + smokeLocal.z]);

  colliders.circles.push({ x, z, r: Math.max(w, d) * 0.58 + 0.8 });
  colliders.names.push('蘑菇房');
}

function addHill(parent, x, z, rx, rz, h, material, baseY = -150, seed = 1) {
  const r = rng(seed);
  const geo = new THREE.SphereGeometry(1, 24, 16);
  geo.scale(rx, h, rz);
  addMesh(parent, geo, material, x, baseY - h * 0.28, z, r() * TAU);
}

function addForestOnField(parent, field, count, seed, hillH = 14) {
  const r = rng(seed);
  const hillR = field.r0 * 0.9;
  const hillY = field.y0 - hillH * 0.28;
  for (let i = 0; i < count; i++) {
    const a = r() * TAU;
    const rr = Math.sqrt(r()) * hillR * 0.86;
    const lx = Math.cos(a) * rr * field.aspectX;
    const lz = Math.sin(a) * rr * field.aspectZ;
    const cr = Math.cos(field.rot);
    const sr = Math.sin(field.rot);
    const x = field.cx + lx * cr - lz * sr;
    const z = field.cz + lx * sr + lz * cr;
    const y = hillY + hillH * Math.sqrt(Math.max(0, 1 - (rr / hillR) * (rr / hillR)));
    addPine(parent, x, y - 0.3, z, 0.8 + r() * 0.7, seed + i * 7);
  }
}

function makePaddyWater() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uDeep: { value: new THREE.Color(0x23403f) },
      uShallow: { value: new THREE.Color(0x4f7070) },
      uSky: { value: new THREE.Color(0xaec8d8) },
      uRose: { value: new THREE.Color(0xdd9a8e) },
      uGold: { value: new THREE.Color(0xf7c27c) },
      uSun: { value: new THREE.Color(0xffd9a4) },
      uSunDir: { value: new THREE.Vector3(0.8, 0.18, -0.12).normalize() },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    vertexShader: `
      varying vec3 vWorldPos;
      varying vec3 vNormalW;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorldPos = world.xyz;
        vNormalW = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uDeep;
      uniform vec3 uShallow;
      uniform vec3 uSky;
      uniform vec3 uRose;
      uniform vec3 uGold;
      uniform vec3 uSun;
      uniform vec3 uSunDir;
      varying vec3 vWorldPos;
      varying vec3 vNormalW;
      varying vec2 vUv;
      void main() {
        vec3 n = normalize(vNormalW);
        vec3 v = normalize(cameraPosition - vWorldPos);
        float fres = pow(1.0 - clamp(dot(v, n), 0.0, 1.0), 2.1);
        float waveA = sin(vWorldPos.x * 0.033 + vWorldPos.z * 0.021 + uTime * 0.34);
        float waveB = sin(vWorldPos.x * -0.017 + vWorldPos.z * 0.041 - uTime * 0.27 + 1.9);
        float wave = waveA * 0.5 + waveB * 0.5;
        n = normalize(n + vec3(waveA * 0.035, 0.0, waveB * 0.035));
        float pinkBand = smoothstep(0.12, 0.95, sin(vWorldPos.x * 0.008 + vWorldPos.z * 0.011 + uTime * 0.05) * 0.5 + 0.5);
        float goldBand = smoothstep(0.28, 1.0, sin(vWorldPos.z * 0.012 - vWorldPos.x * 0.006 - uTime * 0.042 + 2.1) * 0.5 + 0.5);
        vec3 refl = mix(uSky, uRose, 0.28 + pinkBand * 0.45);
        refl = mix(refl, uGold, goldBand * 0.6);
        vec3 base = mix(uDeep, uShallow, 0.22 + 0.36 * (wave * 0.5 + 0.5));
        vec3 col = mix(base, refl, 0.58 + fres * 0.38);
        vec3 hv = normalize(v + normalize(uSunDir));
        float spec = pow(max(dot(n, hv), 0.0), 140.0);
        float glint = pow(max(sin(vWorldPos.x * 0.47 + vWorldPos.z * 0.39 + uTime * 1.7), 0.0), 28.0);
        col += uGold * spec * 0.9;
        col += uSun * glint * 0.16;
        col += uRose * pinkBand * 0.08;
        gl_FragColor = vec4(col, 0.9);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
}

const CLOUD_FRAG = `
  uniform float uTime;
  uniform vec2 uShift;
  uniform vec3 uTintA;
  uniform vec3 uTintB;
  varying vec2 vUv;
  varying vec3 vWorldPos;
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.54;
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p = p * 2.03 + vec2(1.7, 9.2);
      a *= 0.5;
    }
    return v;
  }
  void main() {
    vec2 p = vWorldPos.xz * 0.0024 + uShift;
    float n = fbm(p * 2.0 + vec2(uTime * 0.0035, uTime * 0.0016));
    float n2 = fbm(p * 4.6 + vec2(4.2, 1.3) - vec2(uTime * 0.0022, 0.0));
    float cloud = smoothstep(0.36, 0.78, n + n2 * 0.22);
    float edge = smoothstep(0.0, 0.2, vUv.x) * smoothstep(1.0, 0.8, vUv.x)
               * smoothstep(0.0, 0.2, vUv.y) * smoothstep(1.0, 0.8, vUv.y);
    float alpha = cloud * edge * 0.52;
    vec3 col = mix(uTintA, uTintB, n * 0.9 + 0.1);
    col += vec3(0.18, 0.11, 0.07) * smoothstep(0.65, 0.95, n);
    gl_FragColor = vec4(col, alpha);
  }
`;

function makeCloudLayer(shift, tintA, tintB) {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uShift: { value: new THREE.Vector2(shift[0], shift[1]) },
      uTintA: { value: new THREE.Color(tintA) },
      uTintB: { value: new THREE.Color(tintB) },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vWorldPos;
      void main() {
        vUv = uv;
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorldPos = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: CLOUD_FRAG,
  });
  const geo = new THREE.PlaneGeometry(2800, 2100);
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, material);
  mesh.renderOrder = 3;
  return mesh;
}

function makeSmoke(origins) {
  const count = origins.length * 14;
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  const sizes = new Float32Array(count);
  const r = rng(9182);
  let k = 0;
  for (const o of origins) {
    for (let i = 0; i < 14; i++) {
      positions[k * 3] = o[0];
      positions[k * 3 + 1] = o[1];
      positions[k * 3 + 2] = o[2];
      seeds[k] = r();
      sizes[k] = 16 + r() * 26;
      k++;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    transparent: true,
    depthWrite: false,
    vertexShader: `
      uniform float uTime;
      attribute float aSeed;
      attribute float aSize;
      varying float vFade;
      void main() {
        float life = fract(uTime * 0.055 + aSeed);
        vec3 p = position;
        p.y += life * (13.0 + aSeed * 9.0);
        p.x += sin(aSeed * 41.0 + uTime * 0.28 + life * 4.0) * (0.8 + life * 2.7);
        p.z += cos(aSeed * 23.0 + uTime * 0.23 + life * 3.2) * (0.7 + life * 2.2);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = aSize * (0.7 + life * 1.6) * (90.0 / max(1.0, -mv.z));
        vFade = smoothstep(0.0, 0.1, life) * (1.0 - life);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      varying float vFade;
      void main() {
        float d = length(gl_PointCoord - vec2(0.5));
        float a = smoothstep(0.5, 0.05, d) * vFade * 0.34;
        gl_FragColor = vec4(vec3(0.9, 0.87, 0.81), a);
      }
    `,
  });
  const points = new THREE.Points(geo, material);
  points.frustumCulled = false;
  points.renderOrder = 4;
  return points;
}

export const FP_WORLD = {
  lake: [],
  waterRects: [],
  causeways: [],
  bridges: [],
  islets: [],
  spawn: { x: 8, z: 238, yaw: 0 },
  bounds: { minX: -148, maxX: 148, minZ: 96, maxZ: 286 },
  colliders: { boxes: [], circles: [], names: [] },
};

export const SPAWN = FP_WORLD.spawn;
export const BOUNDS = FP_WORLD.bounds;

export function buildYuanyangScene() {
  const staticGroup = new THREE.Group();
  const smokeOrigins = [];
  const colliders = FP_WORLD.colliders;
  colliders.boxes.length = 0;
  colliders.circles.length = 0;
  colliders.names.length = 0;

  const valley = new THREE.Mesh(new THREE.PlaneGeometry(3200, 3200), M.valley);
  valley.rotation.x = -Math.PI / 2;
  valley.position.set(0, -152, -260);
  valley.receiveShadow = true;
  staticGroup.add(valley);

  const fields = [];
  const duoyishu = buildTerraceField({
    cx: 300, cz: -160, r0: 38, bands: 42, width: 5.0, y0: 22, drop: 2.75,
    aspectX: 1.06, aspectZ: 0.92, rot: -0.18, wobble: 1.3, phase: 0.7, segs: 118,
  });
  const bada = buildTerraceField({
    cx: -360, cz: -220, r0: 46, bands: 45, width: 6.1, y0: 34, drop: 2.55,
    aspectX: 0.96, aspectZ: 1.08, rot: 0.24, wobble: 1.5, phase: 2.4, segs: 122,
  });
  const laohuzui = buildTerraceField({
    cx: 280, cz: -760, r0: 42, bands: 39, width: 6.0, y0: 16, drop: 3.3,
    aspectX: 1.12, aspectZ: 0.9, rot: -0.05, wobble: 1.2, phase: 4.1, segs: 110,
  });
  const villageEdge = buildTerraceField({
    cx: -40, cz: 6, r0: 118, bands: 12, width: 7.2, y0: -5, drop: 2.1,
    aspectX: 1.15, aspectZ: 0.72, rot: 0.06, wobble: 1.4, phase: 1.2, segs: 104,
  });
  fields.push(duoyishu, bada, laohuzui, villageEdge);

  const waterGeos = [];
  for (const field of fields) {
    addMerged(staticGroup, field.earth, M.earth);
    addMerged(staticGroup, field.risers, M.wetEarth);
    addMerged(staticGroup, field.bunds, M.bund);
    waterGeos.push(...field.water);
  }

  addHill(staticGroup, 300, -160, 31, 27, 14, M.grass, 22, 3);
  addHill(staticGroup, -360, -220, 39, 43, 17, M.grass, 34, 7);
  addHill(staticGroup, 280, -760, 34, 28, 13, M.grass, 16, 11);
  addForestOnField(staticGroup, duoyishu, 26, 101, 14);
  addForestOnField(staticGroup, bada, 30, 203, 17);
  addForestOnField(staticGroup, laohuzui, 24, 307, 13);

  addHill(staticGroup, -820, -1240, 440, 330, 400, M.ridgeFar, -150, 21);
  addHill(staticGroup, -300, -1450, 540, 390, 500, M.ridgeFar, -150, 22);
  addHill(staticGroup, 330, -1400, 520, 360, 470, M.ridgeFar, -150, 23);
  addHill(staticGroup, 880, -1160, 420, 310, 360, M.ridgeFar, -150, 24);
  addHill(staticGroup, -1200, -560, 390, 300, 310, M.ridge, -150, 25);
  addHill(staticGroup, 1140, -480, 370, 290, 300, M.ridge, -150, 26);

  box(staticGroup, 312, 36, 238, M.wetEarth, 0, -18, 168);
  box(staticGroup, 306, 0.45, 232, M.grass, 0, 0.22, 168);
  box(staticGroup, 194, 0.5, 10, M.path, 0, 0.45, 214);
  box(staticGroup, 10, 0.5, 186, M.path, -18, 0.45, 170);
  box(staticGroup, 10, 0.5, 186, M.path, 42, 0.45, 170);
  box(staticGroup, 136, 0.52, 9, M.path, -32, 0.46, 130);
  box(staticGroup, 112, 0.52, 9, M.path, 48, 0.46, 182);

  const houseDefs = [
    [-118, 158, 10, 9, 3.4, 0.10], [-86, 146, 9, 8, 3.2, -0.20], [-54, 154, 11, 9, 3.8, 0.15],
    [-20, 146, 9, 8, 3.1, 0.00], [16, 148, 10, 9, 3.4, -0.12], [52, 150, 9, 8, 3.2, 0.20],
    [88, 160, 11, 9, 3.7, -0.10], [120, 176, 9, 8, 3.1, 0.15],
    [-118, 196, 9, 8, 3.2, 0.20], [-84, 190, 10, 9, 3.5, -0.15], [-118, 238, 10, 9, 3.4, 0.10],
    [-84, 244, 9, 8, 3.1, -0.10], [-50, 260, 10, 9, 3.3, 0.15], [52, 192, 9, 8, 3.1, 0.10],
    [84, 204, 10, 9, 3.5, -0.15], [54, 246, 9, 8, 3.2, 0.20], [88, 252, 10, 9, 3.4, -0.10],
    [120, 236, 9, 8, 3.1, 0.15], [28, 266, 9, 8, 3.1, -0.20], [-8, 270, 9, 8, 3.2, 0.10],
  ];
  houseDefs.forEach((h, i) => {
    addMushroomHouse(staticGroup, h[0], h[1], h[2], h[3], h[4], h[5], 500 + i, smokeOrigins, colliders);
  });

  box(staticGroup, 22, 0.9, 22, M.stone, 2, 0.55, 214);
  cyl(staticGroup, 2.4, 3.0, 1.1, 12, M.stone, 2, 1.15, 214);
  cyl(staticGroup, 0.36, 0.46, 7.5, 8, M.wood, 2, 5.0, 214);
  box(staticGroup, 4.6, 0.3, 0.3, M.wood, 2, 8.0, 214);
  box(staticGroup, 0.3, 0.3, 4.6, M.wood, 2, 7.2, 214);

  const palmSpots = [
    [-140, 150, 1.0], [-102, 130, 0.9], [-70, 124, 1.15], [-30, 126, 0.95], [30, 128, 1.05],
    [70, 128, 0.9], [112, 140, 1.1], [142, 170, 0.95], [-140, 190, 1.0], [142, 210, 1.05],
    [-138, 258, 0.95], [138, 266, 1.0], [-2, 180, 0.85], [26, 224, 0.9], [-64, 214, 1.0], [110, 216, 0.9],
  ];
  palmSpots.forEach((p, i) => {
    addPalm(staticGroup, p[0], p[1], p[2], 800 + i);
    colliders.circles.push({ x: p[0], z: p[1], r: 1.0 });
    colliders.names.push('棕榈');
  });

  const r = rng(421);
  for (let i = 0; i < 46; i++) {
    const x = -146 + r() * 292;
    const z = 104 + r() * 170;
    const clear = Math.abs(x) < 24 && z > 190 && z < 246;
    if (clear) continue;
    addPine(staticGroup, x, 0.4, z, 0.55 + r() * 0.5, 1200 + i);
    colliders.circles.push({ x, z, r: 0.7 });
    colliders.names.push('松树');
  }
  for (let i = 0; i < 34; i++) {
    const x = -230 + r() * 460;
    const z = 290 + r() * 120;
    addPine(staticGroup, x, -1, z, 0.8 + r() * 0.8, 1500 + i);
  }

  const rockSpots = [
    [438, -480, 24, 30, 34], [466, -520, 18, 46, 26], [404, -516, 15, 22, 20],
    [-520, -520, 22, 30, 28], [380, -990, 28, 42, 34],
  ];
  for (const [x, z, rx, ry, rz] of rockSpots) {
    const geo = new THREE.DodecahedronGeometry(1, 0);
    geo.scale(rx, ry, rz);
    addMesh(staticGroup, geo, M.rock, x, -46 + ry * 0.2, z, r() * TAU);
  }

  const merged = mergeStaticGroup(staticGroup);
  const root = new THREE.Group();
  root.add(merged);

  const waterMaterial = makePaddyWater();
  const waterMesh = addMerged(root, waterGeos, waterMaterial, false, false);
  if (waterMesh) {
    waterMesh.renderOrder = 2;
    waterMesh.frustumCulled = false;
  }

  const cloudLayers = [];
  const cloudDefs = [
    [-44, [-0.4, 0.2], 0xf0c8b4, 0xfae3cb],
    [-62, [0.3, -0.6], 0xe7c3b3, 0xf6ddc6],
    [-80, [1.1, 0.4], 0xd9b7ab, 0xefd3bd],
    [-98, [-0.9, 1.3], 0xcfb1a9, 0xe6cbb9],
  ];
  for (const [y, shift, a, b] of cloudDefs) {
    const layer = makeCloudLayer(shift, a, b);
    layer.position.set(0, y, -330);
    layer.scale.set(1, 1, 1);
    root.add(layer);
    cloudLayers.push(layer.material);
  }

  const smoke = makeSmoke(smokeOrigins);
  root.add(smoke);

  const life = {
    update(time) {
      waterMaterial.uniforms.uTime.value = time;
      smoke.material.uniforms.uTime.value = time;
      cloudLayers.forEach((m, i) => {
        m.uniforms.uTime.value = time + i * 17.0;
      });
    },
  };

  return {
    group: root,
    waterMaterial,
    life,
    cloudLayers,
    smoke,
    fields,
    lanternMaterial: null,
    glowMaterial: null,
    spawn: FP_WORLD.spawn,
  };
}
