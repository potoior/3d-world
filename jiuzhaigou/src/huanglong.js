import * as THREE from 'three';
import { mergeStaticGroup } from './geometry.js';
import { terrainHeight, WATER_Y } from './terrain.js';

const CX = -105;
const CZ = 310;

const MAT_CACHE = new Map();
function mat(color, rough = 0.95, metal = 0) {
  const key = color + ':' + rough + ':' + metal;
  if (!MAT_CACHE.has(key)) MAT_CACHE.set(key, new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal }));
  return MAT_CACHE.get(key);
}

const travertine = mat(0xd7cba6, 0.97);
const travertinePale = mat(0xe8dfc1, 0.95);
const travertineWarm = mat(0xc2a878, 0.98);
const mineralBand = mat(0xb99a62, 0.95);
const mossMat = mat(0x6d7f4d, 1);
const rockMat = mat(0x7b8279, 0.98);
const woodMat = mat(0x6d4a2b, 0.9);
const woodDark = mat(0x49311d, 0.93);
const ropeMat = mat(0x3d3a32, 0.85, 0.15);
const whiteWall = mat(0xefe9d8, 0.93);
const templeRed = mat(0x76291f, 0.88);
const templeMaroon = mat(0x511b17, 0.9);
const goldMat = mat(0xc69a44, 0.42, 0.5);
const windowMat = mat(0x2b2118, 0.8);
const trunkMat = mat(0x4b3724, 0.97);
const coniferA = mat(0x284534, 0.95);
const coniferB = mat(0x365b43, 0.94);
const coniferC = mat(0x486d4b, 0.92);
const snowMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0 });

function rampY(lx) {
  const t = Math.max(0, Math.min(1, (165 - lx) / 330));
  return 2.0 + Math.pow(t, 1.18) * 46;
}

function add(group, geo, material, x, y, z, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  m.castShadow = true;
  m.receiveShadow = true;
  group.add(m);
  return m;
}

function box(group, w, h, d, material, x, y, z, ry = 0, rz = 0) {
  return add(group, new THREE.BoxGeometry(w, h, d), material, x, y, z, 0, ry, rz);
}

function cylinder(group, rt, rb, h, seg, material, x, y, z, scaleZ = 1) {
  const m = add(group, new THREE.CylinderGeometry(rt, rb, h, seg), material, x, y, z);
  m.scale.z = scaleZ;
  return m;
}

function pyramidRoof(group, w, d, h, material, x, y, z) {
  const g = new THREE.ConeGeometry(Math.max(w, d) * 0.74, h, 4);
  g.rotateY(Math.PI / 4);
  g.scale(w / Math.max(w, d), 1, d / Math.max(w, d));
  add(group, g, material, x, y + h * 0.5, z);
}

function Rnd(seed) {
  const x = Math.sin(seed * 12.9898 + 4.71) * 43758.5453;
  return x - Math.floor(x);
}

function watt(x) {
  return CX + x;
}
function woz(z) {
  return CZ + z;
}

function makeRippleNormalTexture() {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const g = c.getContext('2d');
  const img = g.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const dx = 0.55 * Math.cos((u * 7.0 + v * 3.0) * Math.PI * 2) + 0.3 * Math.cos((u * 13.0 - v * 3.0) * Math.PI * 2);
      const dy = 0.55 * Math.cos((v * 8.0 - u * 2.0) * Math.PI * 2) + 0.3 * Math.cos((v * 15.0 + u * 4.0) * Math.PI * 2);
      const i = (y * size + x) * 4;
      img.data[i] = 128 + dx * 52;
      img.data[i + 1] = 128 + dy * 52;
      img.data[i + 2] = 255;
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2.5, 2.5);
  return tex;
}

function makeCloudTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 192;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 512, 192);
  const blobs = [
    [116, 108, 76, 0.82], [190, 86, 64, 0.9], [258, 100, 82, 0.86],
    [326, 88, 58, 0.72], [388, 106, 62, 0.6], [70, 118, 42, 0.46],
    [456, 120, 38, 0.36], [286, 64, 42, 0.46],
  ];
  for (const [x, y, r, a] of blobs) {
    const rg = g.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, 'rgba(255,255,255,' + a + ')');
    rg.addColorStop(0.52, 'rgba(255,255,255,' + a * 0.56 + ')');
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rg;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const poolNormal = makeRippleNormalTexture();
const poolMaterials = [
  new THREE.MeshPhysicalMaterial({
    color: 0x2eb8a5, emissive: 0x064c42, emissiveIntensity: 0.22, transparent: true, opacity: 0.82,
    roughness: 0.08, metalness: 0.08, clearcoat: 1, clearcoatRoughness: 0.08,
    normalMap: poolNormal, normalScale: new THREE.Vector2(0.42, 0.42), depthWrite: false, side: THREE.DoubleSide,
  }),
  new THREE.MeshPhysicalMaterial({
    color: 0x1f9078, emissive: 0x063c33, emissiveIntensity: 0.2, transparent: true, opacity: 0.84,
    roughness: 0.09, metalness: 0.06, clearcoat: 1, clearcoatRoughness: 0.09,
    normalMap: poolNormal, normalScale: new THREE.Vector2(0.38, 0.38), depthWrite: false, side: THREE.DoubleSide,
  }),
  new THREE.MeshPhysicalMaterial({
    color: 0x55c8c0, emissive: 0x0a514c, emissiveIntensity: 0.24, transparent: true, opacity: 0.8,
    roughness: 0.07, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.07,
    normalMap: poolNormal, normalScale: new THREE.Vector2(0.46, 0.46), depthWrite: false, side: THREE.DoubleSide,
  }),
];

const waterfallTime = { value: 0 };
function makeWaterfallMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: waterfallTime },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        float flow = sin(vUv.y * 22.0 - uTime * 4.2 + sin(vUv.x * 14.0) * 1.7);
        float fine = sin(vUv.y * 61.0 - uTime * 7.4 + sin(vUv.x * 47.0) * 2.3);
        float streak = sin(vUv.x * 83.0 + sin(vUv.y * 12.0) * 1.8) * 0.5 + 0.5;
        float sheet = smoothstep(-0.75, 0.95, flow) * 0.52 + smoothstep(-0.35, 1.0, fine) * 0.27;
        float edge = smoothstep(0.0, 0.09, vUv.x) * (1.0 - smoothstep(0.91, 1.0, vUv.x));
        edge *= smoothstep(0.0, 0.05, vUv.y) * (1.0 - smoothstep(0.92, 1.0, vUv.y));
        float alpha = edge * (0.22 + sheet * (0.42 + streak * 0.34));
        vec3 col = mix(vec3(0.66, 0.88, 0.87), vec3(0.96, 1.0, 0.98), sheet);
        gl_FragColor = vec4(col, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}
function createSnowMountain(cx, cz, radius, height, seed) {
  const base = terrainHeight(cx, cz) - 4;
  const seg = 28;
  const rings = 13;
  const positions = [];
  const colors = [];
  const uvs = [];
  const indices = [];
  const rock = new THREE.Color(0x6f777b);
  const rockDark = new THREE.Color(0x555f66);
  const rockLight = new THREE.Color(0x8b9295);
  const snow = new THREE.Color(0xf1f6f8);
  const snowShade = new THREE.Color(0xc7d7de);
  const c = new THREE.Color();
  for (let k = 0; k <= rings; k++) {
    const t = k / rings;
    const profile = Math.pow(1 - t, 1.18);
    const ringR = radius * profile * (0.9 + 0.12 * Math.sin(t * 9.5 + seed));
    const y = base + height * Math.pow(t, 0.94);
    for (let j = 0; j < seg; j++) {
      const a = (j / seg) * Math.PI * 2;
      const ridge = 1 + 0.12 * Math.sin(a * 3 + seed) + 0.06 * Math.sin(a * 7 - t * 4.2) + 0.035 * Math.sin(a * 13 + seed * 2);
      const px = cx + Math.cos(a) * ringR * ridge;
      const pz = cz + Math.sin(a) * ringR * ridge;
      const py = y + Math.sin(a * 5 + seed + t * 7) * height * 0.01 * (1 - t);
      positions.push(px, py, pz);
      uvs.push(j / seg * 3, t * 3);
      const snowLine = 0.47 + 0.09 * Math.sin(a * 4.5 + seed) + 0.045 * Math.sin(t * 15);
      if (t > snowLine) {
        const mixv = Math.min(1, (t - snowLine) / 0.22);
        c.copy(snowShade).lerp(snow, mixv * 0.9 + 0.1);
      } else {
        c.copy(rockDark).lerp(rock, 0.45 + 0.35 * Math.sin(a * 6 + t * 5));
        c.lerp(rockLight, 0.22 * Math.max(0, Math.sin(a * 11 - seed)));
      }
      const shade = 0.9 + 0.1 * Math.sin(a * 2.3 + seed);
      colors.push(c.r * shade, c.g * shade, c.b * shade);
    }
  }
  for (let k = 0; k < rings; k++) {
    for (let j = 0; j < seg; j++) {
      const j2 = (j + 1) % seg;
      const a = k * seg + j;
      const b = k * seg + j2;
      const d = (k + 1) * seg + j;
      const e = (k + 1) * seg + j2;
      indices.push(a, d, b, b, d, e);
    }
  }
  const top = positions.length / 3;
  positions.push(cx, base + height, cz);
  uvs.push(0.5, 0.5);
  colors.push(snow.r, snow.g, snow.b);
  for (let j = 0; j < seg; j++) {
    indices.push(rings * seg + j, top, rings * seg + ((j + 1) % seg));
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, snowMat);
}

function addSnowPeaks(group) {
  const peaks = [
    [-400, 26, 178, 302, 1.2],
    [-338, -170, 126, 232, 3.4],
    [-505, 146, 142, 252, 5.1],
  ];
  for (const [x, z, r, h, s] of peaks) {
    const m = createSnowMountain(x, z, r, h, s);
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
  }
}
function makeGround(group) {
  const x0 = CX - 178;
  const x1 = CX + 168;
  const z0 = CZ - 138;
  const z1 = CZ + 138;
  const nx = 54;
  const nz = 38;
  const positions = [];
  const colors = [];
  const uvs = [];
  const indices = [];
  const c = new THREE.Color();
  const cream = new THREE.Color(0xd8cca8);
  const gold = new THREE.Color(0xbea472);
  const green = new THREE.Color(0x6c7f4e);
  const pale = new THREE.Color(0xece4cb);
  for (let iz = 0; iz <= nz; iz++) {
    const v = iz / nz;
    const z = z0 + (z1 - z0) * v;
    const lz = z - CZ;
    for (let ix = 0; ix <= nx; ix++) {
      const u = ix / nx;
      const x = x0 + (x1 - x0) * u;
      const lx = x - CX;
      const ripple = Math.sin(lx * 0.075 + lz * 0.12) * 0.24 + Math.sin(lx * 0.21 - lz * 0.16) * 0.11;
      const edge = Math.min(1, Math.min(u, 1 - u) * 9 + 0.15);
      const y = rampY(lx) - 0.72 + ripple * edge;
      positions.push(x, y, z);
      uvs.push(u * 5, v * 4);
      const band = 0.5 + 0.5 * Math.sin(lx * 0.115 + lz * 0.08);
      c.copy(cream).lerp(gold, band * 0.38);
      if (lz > 76 || lz < -94) c.lerp(green, 0.12 + 0.1 * Math.sin(lx * 0.13));
      if (lx > 125) c.lerp(pale, 0.34);
      if (lx < -132) c.lerp(green, 0.1);
      colors.push(c.r, c.g, c.b);
    }
  }
  for (let iz = 0; iz < nz; iz++) {
    for (let ix = 0; ix < nx; ix++) {
      const a = iz * (nx + 1) + ix;
      const b = a + 1;
      const d = a + nx + 1;
      const e = d + 1;
      indices.push(a, d, b, b, d, e);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const groundMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 });
  const ground = new THREE.Mesh(geo, groundMat);
  ground.receiveShadow = true;
  ground.castShadow = false;
  group.add(ground);

  for (let i = 0; i < 56; i++) {
    const lx = -172 + Rnd(i * 3.1) * 330;
    const lz = -132 + Rnd(i * 7.7 + 2) * 264;
    const s = 0.6 + Rnd(i * 11.3) * 2.4;
    const g = new THREE.IcosahedronGeometry(s, 0);
    g.scale(1.35, 0.55, 1.1);
    add(group, g, i % 5 === 0 ? mossMat : rockMat, watt(lx), rampY(lx) - 0.55 + s * 0.2, woz(lz), 0, Rnd(i) * 6.28, 0);
  }
  for (let i = 0; i < 12; i++) {
    const lx = -148 + i * 24;
    const lz = 82 + Math.sin(i * 0.9) * 8;
    const g = new THREE.BoxGeometry(15, 0.5, 3.2);
    g.rotateY(Math.sin(i * 1.3) * 0.4);
    add(group, g, travertineWarm, watt(lx), rampY(lx) - 0.48, woz(lz), 0, 0, 0);
  }
}
const TIERS = [
  { lx: -128, lz: 2, r: 35, rz: 24 },
  { lx: -98, lz: -7, r: 34, rz: 23 },
  { lx: -68, lz: 6, r: 33, rz: 23 },
  { lx: -38, lz: -5, r: 32, rz: 22 },
  { lx: -8, lz: 7, r: 32, rz: 22 },
  { lx: 22, lz: -7, r: 31, rz: 21 },
  { lx: 52, lz: 5, r: 30, rz: 21 },
  { lx: 82, lz: -5, r: 29, rz: 20 },
  { lx: 112, lz: 4, r: 29, rz: 19 },
];

const SIDE_POOLS = [
  { lx: -86, lz: -66, r: 20, rz: 14 },
  { lx: -30, lz: 63, r: 18, rz: 13 },
  { lx: 28, lz: -62, r: 17, rz: 12 },
  { lx: 72, lz: 60, r: 16, rz: 11 },
  { lx: 8, lz: 68, r: 15, rz: 11 },
];

const poolTiers = [];

function makePool(group, def, index) {
  const ty = rampY(def.lx);
  const wx = watt(def.lx);
  const wz = woz(def.lz);
  const sz = def.rz / def.r;
  const shelf = cylinder(group, def.r, def.r + 2.2, 6.2, 40, index % 2 ? travertinePale : travertine, wx, ty - 3.1, wz, sz);
  shelf.castShadow = true;
  shelf.receiveShadow = true;

  const ringGeo = new THREE.RingGeometry(def.r * 0.865, def.r * 0.99, 48);
  ringGeo.rotateX(-Math.PI / 2);
  const ring = add(group, ringGeo, index % 3 === 0 ? mineralBand : travertineWarm, wx, ty + 0.035, wz);
  ring.scale.z = sz;

  const rimGeo = new THREE.TorusGeometry(def.r * 0.85, 0.48, 5, 44);
  rimGeo.rotateX(Math.PI / 2);
  const rim = add(group, rimGeo, index % 2 ? travertinePale : travertineWarm, wx, ty + 0.22, wz);
  rim.scale.z = sz;

  const waterGeo = new THREE.CircleGeometry(1, 48);
  waterGeo.rotateX(-Math.PI / 2);
  const water = new THREE.Mesh(waterGeo, poolMaterials[index % poolMaterials.length]);
  water.position.set(wx, ty + 0.15, wz);
  water.scale.set(def.r * 0.835, 1, def.rz * 0.835);
  water.renderOrder = 2;
  water.receiveShadow = true;
  group.add(water);

  poolTiers.push({ lx: def.lx, lz: def.lz, r: def.r, rz: def.rz, y: ty, water });
  return ty;
}

function addPools(group) {
  TIERS.forEach((def, i) => makePool(group, def, i));
  SIDE_POOLS.forEach((def, i) => makePool(group, def, i + 3));
}
function addWaterfalls(group) {
  const picks = [2, 4, 6, 7, 8];
  for (const i of picks) {
    const t = poolTiers[i];
    const lower = i + 1 < TIERS.length ? rampY(TIERS[i + 1].lx) : WATER_Y;
    const top = t.y + 0.12;
    const height = Math.max(2.4, top - lower + 1.2);
    const width = t.rz * 1.22;
    const geo = new THREE.PlaneGeometry(width, height, 8, 12);
    const mesh = new THREE.Mesh(geo, makeWaterfallMaterial());
    mesh.rotation.y = Math.PI / 2;
    mesh.position.set(watt(t.lx) + t.r * 0.81, lower + height * 0.5 - 0.55, woz(t.lz));
    mesh.renderOrder = 3;
    group.add(mesh);
  }
  const mainW = poolTiers[8];
  const mainTop = mainW.y + 0.1;
  const mainH = mainTop - WATER_Y + 0.5;
  const geo = new THREE.PlaneGeometry(18, mainH, 8, 12);
  const main = new THREE.Mesh(geo, makeWaterfallMaterial());
  main.rotation.y = Math.PI / 2;
  main.position.set(watt(mainW.lx) + mainW.r * 0.94, WATER_Y + mainH * 0.5, woz(mainW.lz));
  main.renderOrder = 3;
  group.add(main);
}
function addTemple(group) {
  const lx = -96;
  const lz = 58;
  const x = watt(lx);
  const z = woz(lz);
  const y0 = rampY(lx) - 0.35;

  box(group, 34, 3.2, 25, travertinePale, x, y0 + 1.6, z);
  box(group, 30, 0.5, 21, travertineWarm, x, y0 + 3.35, z);
  for (let i = 0; i < 7; i++) {
    box(group, 11 - i * 0.4, 0.42, 1.4, travertine, x, y0 + 0.22 + i * 0.43, z + 13.2 + i * 1.3);
  }

  box(group, 19, 9, 13, whiteWall, x, y0 + 7.8, z);
  box(group, 20, 1.7, 14, templeRed, x, y0 + 13.0, z);
  box(group, 22, 0.7, 16, templeMaroon, x, y0 + 14.1, z);
  pyramidRoof(group, 24, 18, 4.4, goldMat, x, y0 + 14.4, z);
  box(group, 8, 0.6, 7, templeRed, x, y0 + 18.6, z);
  box(group, 6, 3.2, 5, whiteWall, x, y0 + 20.3, z);
  pyramidRoof(group, 8, 7, 2.8, goldMat, x, y0 + 21.9, z);
  cylinder(group, 0.22, 0.34, 3.0, 7, goldMat, x, y0 + 25.2, z);
  add(group, new THREE.SphereGeometry(0.46, 8, 6), goldMat, x, y0 + 26.9, z);

  for (const sx of [-15.5, 15.5]) {
    box(group, 9.5, 6.4, 11, whiteWall, x + sx, y0 + 6.5, z - 1.2);
    box(group, 10.2, 0.55, 12, templeMaroon, x + sx, y0 + 9.9, z - 1.2);
    pyramidRoof(group, 11.5, 13, 2.6, goldMat, x + sx, y0 + 10.2, z - 1.2);
    box(group, 2.4, 2.6, 0.35, windowMat, x + sx, y0 + 6.6, z + 4.4);
    box(group, 2.9, 0.3, 0.5, goldMat, x + sx, y0 + 8.0, z + 4.4);
  }

  for (const sx of [-6.2, -2.1, 2.1, 6.2]) {
    box(group, 0.55, 6.2, 0.55, templeRed, x + sx, y0 + 7.0, z + 6.65);
    box(group, 3.0, 2.8, 0.32, windowMat, x + sx, y0 + 7.9, z + 6.35);
    box(group, 3.6, 0.3, 0.48, goldMat, x + sx, y0 + 9.4, z + 6.4);
    box(group, 3.6, 0.26, 0.48, goldMat, x + sx, y0 + 6.4, z + 6.4);
  }
  box(group, 3.6, 4.2, 0.5, windowMat, x, y0 + 5.4, z + 6.6);
  box(group, 4.4, 0.4, 0.7, goldMat, x, y0 + 7.6, z + 6.7);

  for (let i = 0; i < 9; i++) {
    const px = x - 7.2 + i * 1.8;
    cylinder(group, 0.42, 0.42, 1.25, 10, goldMat, px, y0 + 4.2, z + 8.6);
    box(group, 0.1, 1.1, 0.1, templeMaroon, px, y0 + 4.2, z + 9.1);
  }
  for (const sx of [-9.5, 9.5]) {
    cylinder(group, 0.5, 0.62, 5.2, 8, templeRed, x + sx, y0 + 5.9, z + 9.4);
    box(group, 1.1, 0.3, 1.1, goldMat, x + sx, y0 + 8.5, z + 9.4);
  }
}
function addBoardwalk(group) {
  const lz = 118;
  const z = woz(lz);
  const segments = 38;
  let px = 154;
  let py = rampY(px) + 2.15;
  for (let i = 1; i <= segments; i++) {
    const nx = 154 - (308 * i) / segments;
    const ny = rampY(nx) + 2.15;
    const dx = nx - px;
    const dy = ny - py;
    const len = Math.hypot(dx, dy);
    const midX = watt((px + nx) * 0.5);
    const midY = (py + ny) * 0.5;
    const angle = Math.atan2(dy, dx);
    box(group, len + 0.12, 0.22, 2.9, i % 3 === 0 ? woodDark : woodMat, midX, midY, z, 0, angle);
    if (i % 3 === 0) {
      for (const side of [-1.22, 1.22]) {
        box(group, len + 0.1, 0.1, 0.1, woodDark, midX, midY + 2.0, z + side, 0, angle);
        box(group, len + 0.1, 0.08, 0.08, woodDark, midX, midY + 1.08, z + side, 0, angle);
      }
    }
    if (i % 4 === 0 || i === 1) {
      for (const side of [-1.22, 1.22]) {
        box(group, 0.16, 2.3, 0.16, woodDark, watt(nx), ny + 1.12, z + side);
        box(group, 0.25, 0.12, 0.25, woodMat, watt(nx), ny + 2.28, z + side);
      }
    }
    px = nx;
    py = ny;
  }

  const people = [
    [104, 0x8f3a2e, 0.95], [36, 0x2f5268, 1.02], [-26, 0xa07038, 0.92], [-88, 0x3f6b58, 0.97],
  ];
  people.forEach(([lx, color, scale], i) => {
    const base = rampY(lx) + 2.26;
    const x = watt(lx);
    const zz = z + (i % 2 ? 0.5 : -0.5);
    cylinder(group, 0.19 * scale, 0.3 * scale, 1.2 * scale, 7, mat(color), x, base + 0.6 * scale, zz);
    add(group, new THREE.SphereGeometry(0.2 * scale, 8, 6), mat(0xc79c78), x, base + 1.38 * scale, zz);
    box(group, 0.32 * scale, 0.55 * scale, 0.25 * scale, mat(0x2e3338), x, base + 0.28 * scale, zz);
  });
}
function addConifer(group, x, z, h, seed) {
  const base = rampY(x - CX) - 0.66;
  const tone = [coniferA, coniferB, coniferC][seed % 3];
  cylinder(group, 0.16, 0.26, h * 0.34, 6, trunkMat, x, base + h * 0.17, z);
  const tiers = [
    [h * 0.25, h * 0.42, h * 0.45],
    [h * 0.19, h * 0.34, h * 0.63],
    [h * 0.13, h * 0.28, h * 0.8],
  ];
  for (const [radius, height, center] of tiers) {
    const cone = new THREE.ConeGeometry(radius, height, 7);
    add(group, cone, tone, x, base + center, z, 0, (seed % 7) * 0.42, 0);
  }
}

function addForest(group) {
  let placed = 0;
  let guard = 0;
  while (placed < 104 && guard < 900) {
    guard++;
    const lx = -175 + Rnd(guard * 1.73) * 338;
    const lz = -132 + Rnd(guard * 4.91 + 3) * 264;
    let blocked = false;
    for (const t of [...TIERS, ...SIDE_POOLS]) {
      const dx = (lx - t.lx) / (t.r + 11);
      const dz = (lz - t.lz) / (t.rz + 11);
      if (dx * dx + dz * dz < 1) {
        blocked = true;
        break;
      }
    }
    if (Math.abs(lx + 96) < 27 && Math.abs(lz - 58) < 22) blocked = true;
    if (Math.abs(lz - 118) < 10 && lx > -158) blocked = true;
    if (blocked) continue;
    const h = 7.2 + Rnd(guard * 9.3) * 8.6;
    addConifer(group, watt(lx), woz(lz), h, placed);
    placed++;
  }
  for (let i = 0; i < 26; i++) {
    const lx = -168 + Rnd(i * 3.7 + 1) * 324;
    const lz = -126 + Rnd(i * 8.1 + 5) * 252;
    const s = 1.0 + Rnd(i * 2.3) * 2.6;
    const g = new THREE.ConeGeometry(s * 0.7, s * 1.5, 6);
    add(group, g, i % 2 ? coniferB : mossMat, watt(lx), rampY(lx) - 0.2, woz(lz), 0, Rnd(i) * 5, 0);
  }
}
const prayerFlagState = { mesh: null, data: [] };

function addPrayerFlags(group) {
  const templeY = rampY(-96) - 0.35;
  const sx = watt(-96);
  const sz = woz(58);
  const lines = [
    [new THREE.Vector3(sx, templeY + 20.5, sz + 4), new THREE.Vector3(watt(10), rampY(10) + 19, woz(88))],
    [new THREE.Vector3(sx, templeY + 20.5, sz - 2), new THREE.Vector3(watt(-168), rampY(-168) + 18, woz(92))],
    [new THREE.Vector3(sx + 4, templeY + 19.5, sz - 5), new THREE.Vector3(watt(-82), rampY(-82) + 17, woz(-40))],
  ];
  const curves = lines.map(([a, b]) => {
    const mid = a.clone().lerp(b, 0.5);
    mid.y = Math.min(a.y, b.y) - 3.6;
    const curve = new THREE.CatmullRomCurve3([a, mid, b]);
    const poleHeight = b.y - (rampY(b.x - CX) - 0.7);
    cylinder(group, 0.16, 0.24, poleHeight, 6, woodDark, b.x, rampY(b.x - CX) - 0.7 + poleHeight * 0.5, b.z);
    add(group, new THREE.TubeGeometry(curve, 26, 0.05, 4, false), ropeMat, 0, 0, 0);
    add(group, new THREE.CylinderGeometry(0.06, 0.06, 1.3, 5), goldMat, b.x, b.y + 0.55, b.z);
    return curve;
  });

  const perLine = 15;
  const count = perLine * curves.length;
  const geo = new THREE.PlaneGeometry(1.0, 0.68);
  const material = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.9, metalness: 0.02 });
  const im = new THREE.InstancedMesh(geo, material, count);
  im.castShadow = true;
  im.receiveShadow = true;
  const palette = [
    new THREE.Color(0xc0392b), new THREE.Color(0xe3c34a), new THREE.Color(0x2f6fb0),
    new THREE.Color(0x3d8a55), new THREE.Color(0xf2eee2),
  ];
  const dummy = new THREE.Object3D();
  let index = 0;
  curves.forEach((curve, li) => {
    const tangent = new THREE.Vector3();
    for (let i = 0; i < perLine; i++) {
      const t = 0.06 + (i / (perLine - 1)) * 0.86;
      const p = curve.getPoint(t);
      curve.getTangent(t, tangent);
      const yaw = Math.atan2(tangent.x, tangent.z) + Math.PI * 0.5;
      const data = { pos: p.clone(), yaw, phase: li * 1.7 + i * 0.72, speed: 1.5 + (i % 4) * 0.17 };
      dummy.position.copy(p).add(new THREE.Vector3(0, -0.42, 0));
      dummy.rotation.set(0, yaw, 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      im.setMatrixAt(index, dummy.matrix);
      im.setColorAt(index, palette[(i + li * 2) % palette.length]);
      prayerFlagState.data.push(data);
      index++;
    }
  });
  im.instanceMatrix.needsUpdate = true;
  im.instanceColor.needsUpdate = true;
  group.add(im);
  prayerFlagState.mesh = im;
}
const cloudState = [];

function addClouds(group) {
  const tex = makeCloudTexture();
  const defs = [
    [-430, 218, 60, 270, 96, 0.52, -0.12],
    [-300, 178, 120, 210, 74, 0.46, 0.08],
    [-500, 248, 210, 235, 82, 0.42, -0.2],
    [-360, 152, -10, 180, 64, 0.4, 0.05],
    [-210, 142, 190, 150, 54, 0.32, -0.16],
    [-120, 118, 70, 130, 46, 0.26, 0.12],
    [-525, 190, 300, 190, 62, 0.34, -0.06],
    [-250, 230, -90, 205, 70, 0.36, 0.16],
  ];
  defs.forEach(([x, y, z, w, h, o, yaw], i) => {
    const material = new THREE.MeshBasicMaterial({
      map: tex, transparent: true, opacity: o, depthWrite: false,
      side: THREE.DoubleSide, toneMapped: false, fog: false,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
    mesh.position.set(x, y, z);
    mesh.rotation.y = yaw;
    mesh.renderOrder = 6;
    group.add(mesh);
    cloudState.push({ mesh, base: new THREE.Vector3(x, y, z), phase: i * 1.37, drift: 5 + (i % 3) * 2.5 });
  });
}
export function buildHuanglongOverlay() {
  const group = new THREE.Group();
  addSnowPeaks(group);
  makeGround(group);
  addPools(group);
  addWaterfalls(group);
  addTemple(group);
  addBoardwalk(group);
  addForest(group);
  addPrayerFlags(group);
  addClouds(group);

  const dummy = new THREE.Object3D();
  const life = {
    update(time) {
      waterfallTime.value = time;
      poolNormal.offset.x = 0.08 + Math.sin(time * 0.07) * 0.04;
      poolNormal.offset.y = -time * 0.045;
      if (prayerFlagState.mesh) {
        prayerFlagState.data.forEach((d, i) => {
          dummy.position.copy(d.pos);
          dummy.position.y -= 0.42 + Math.sin(time * 1.35 + d.phase) * 0.08;
          dummy.rotation.set(
            Math.sin(time * 2.0 + d.phase) * 0.14,
            d.yaw + Math.sin(time * 1.7 + d.phase) * 0.22,
            Math.sin(time * 2.6 + d.phase) * 0.18
          );
          dummy.scale.setScalar(1);
          dummy.updateMatrix();
          prayerFlagState.mesh.setMatrixAt(i, dummy.matrix);
        });
        prayerFlagState.mesh.instanceMatrix.needsUpdate = true;
      }
      for (const c of cloudState) {
        c.mesh.position.x = c.base.x + Math.sin(time * 0.018 + c.phase) * c.drift * 2.2;
        c.mesh.position.y = c.base.y + Math.sin(time * 0.11 + c.phase) * 2.2;
        c.mesh.position.z = c.base.z + Math.cos(time * 0.014 + c.phase) * c.drift;
      }
    },
  };

  const merged = mergeStaticGroup(group);
  return {
    group: merged,
    life,
    stats: {
      terraces: TIERS.length + SIDE_POOLS.length,
      pools: poolTiers.length,
      boardwalk: 38,
      conifers: 104,
      prayerFlags: prayerFlagState.data.length,
      snowPeaks: 3,
      temple: 1,
    },
  };
}
