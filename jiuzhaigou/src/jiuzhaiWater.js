import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { LAKES, LAKE_BY_ID, terrainHeight, valleyCenter, waterLevelAt, WATER_Y } from './terrain.js';

const MAT_CACHE = new Map();
function mat(color, rough = 0.95, metal = 0) {
  const key = color + ':' + rough + ':' + metal;
  if (!MAT_CACHE.has(key)) MAT_CACHE.set(key, new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal }));
  return MAT_CACHE.get(key);
}

const travertine = mat(0xd8cda8, 0.97);
const travertinePale = mat(0xe9dfc2, 0.95);
const travertineWarm = mat(0xc2a678, 0.98);
const mineralBand = mat(0xb8995f, 0.95);
const rockMat = mat(0x7c837a, 0.98);
const logMat = mat(0x5c4a34, 0.96);
const logDark = mat(0x403529, 0.98);
const foamMat = new THREE.MeshBasicMaterial({ color: 0xeaf4ef, transparent: true, opacity: 0.42, depthWrite: false, side: THREE.DoubleSide });

function Rnd(seed) {
  const x = Math.sin(seed * 12.9898 + 4.71) * 43758.5453;
  return x - Math.floor(x);
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
function box(group, w, h, d, material, x, y, z, ry = 0, rz = 0, rx = 0) {
  return add(group, new THREE.BoxGeometry(w, h, d), material, x, y, z, rx, ry, rz);
}
function cylinder(group, rt, rb, h, seg, material, x, y, z, rx = 0, ry = 0, rz = 0) {
  return add(group, new THREE.CylinderGeometry(rt, rb, h, seg), material, x, y, z, rx, ry, rz);
}

function makeRippleNormal() {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const img = g.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const dx = 0.55 * Math.cos((u * 7 + v * 3) * Math.PI * 2) + 0.3 * Math.cos((u * 13 - v * 3) * Math.PI * 2);
      const dy = 0.55 * Math.cos((v * 8 - u * 2) * Math.PI * 2) + 0.3 * Math.cos((v * 15 + u * 4) * Math.PI * 2);
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
  tex.repeat.set(2.2, 2.2);
  return tex;
}
const rippleNormal = makeRippleNormal();

const LAKE_PALETTES = {
  upper: { deep: 0x0e6074, mid: 0x159389, shallow: 0x6ed2b8, accent: 0x9dcf6c, opacity: 0.93, band: 0.45, sparkle: 0.9 },
  wuhua: { deep: 0x075762, mid: 0x0aa192, shallow: 0x6fe3c1, accent: 0xe0a83c, opacity: 0.91, band: 1.0, sparkle: 1.15 },
  pearl: { deep: 0x7ea78a, mid: 0x9ec9a5, shallow: 0xd8e8c8, accent: 0xe4c47a, opacity: 0.64, band: 0.5, sparkle: 1.5 },
  shu1: { deep: 0x125e61, mid: 0x1e9383, shallow: 0x6bcdae, accent: 0xa8b85f, opacity: 0.84, band: 0.7, sparkle: 0.8 },
  shu2: { deep: 0x155d69, mid: 0x208f88, shallow: 0x71cdb7, accent: 0xb6a354, opacity: 0.84, band: 0.75, sparkle: 0.8 },
  shu3: { deep: 0x1a5c68, mid: 0x278d83, shallow: 0x7ac7ae, accent: 0xbfa253, opacity: 0.84, band: 0.8, sparkle: 0.8 },
  shu4: { deep: 0x1f5f64, mid: 0x2c8c7b, shallow: 0x83c5a0, accent: 0xc6a75a, opacity: 0.84, band: 0.85, sparkle: 0.8 },
};

const LAKE_VERT = `
  varying vec3 vWorldPos;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorldPos = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;
const LAKE_FRAG = `
  uniform float uTime;
  uniform vec3 uDeep;
  uniform vec3 uMid;
  uniform vec3 uShallow;
  uniform vec3 uAccent;
  uniform vec3 uSky;
  uniform vec3 uSun;
  uniform vec3 uSunDir;
  uniform sampler2D uNormalMap;
  uniform float uOpacity;
  uniform float uBand;
  uniform float uSparkle;
  uniform vec3 fogColor;
  uniform float fogNear;
  uniform float fogFar;
  varying vec3 vWorldPos;
  varying vec2 vUv;

  void main() {
    vec2 p = vWorldPos.xz;
    vec2 uv1 = p * 0.036 + vec2(uTime * 0.009, uTime * 0.014);
    vec2 uv2 = p * 0.012 - vec2(uTime * 0.005, uTime * 0.008);
    vec2 uv3 = p * 0.105 + vec2(uTime * 0.018, -uTime * 0.013);
    vec3 n1 = texture2D(uNormalMap, uv1).rgb * 2.0 - 1.0;
    vec3 n2 = texture2D(uNormalMap, uv2).rgb * 2.0 - 1.0;
    vec3 n3 = texture2D(uNormalMap, uv3).rgb * 2.0 - 1.0;
    vec2 rip = n1.xy * 0.46 + n2.xy * 0.3 + n3.xy * 0.24;
    vec3 n = normalize(vec3(rip.x, 1.0, rip.y));

    float b1 = 0.5 + 0.5 * sin(p.x * 0.052 + p.y * 0.034 + sin(p.y * 0.049) * 1.8);
    float b2 = 0.5 + 0.5 * sin(p.x * 0.025 - p.y * 0.057 + 2.1);
    float b3 = 0.5 + 0.5 * sin(length(p - vec2(0.0, 30.0)) * 0.11 + atan(p.x, p.y) * 2.4);
    vec3 base = mix(uDeep, uMid, b2 * 0.7);
    base = mix(base, uShallow, b1 * 0.46);
    base = mix(base, uAccent, smoothstep(0.5, 0.88, b3) * uBand * 0.92);
    base = mix(base, uShallow * 1.08, smoothstep(0.62, 0.98, length(vUv - 0.5) * 2.0) * 0.3);

    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    float fres = pow(1.0 - clamp(dot(viewDir, n), 0.0, 1.0), 2.4);
    vec3 refl = reflect(-viewDir, n);
    vec3 skyRef = mix(uSky * 0.92, uSky * 1.3, smoothstep(-0.05, 0.65, refl.y));
    float glow = pow(max(dot(refl, normalize(uSunDir)), 0.0), 12.0);
    skyRef += uSun * glow * 0.28;
    float reflAmt = 0.07 + fres * 0.36;
    vec3 col = mix(base * 1.02, mix(skyRef, base, 0.3), reflAmt);
    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(vec3(lum), col, 1.16);
    vec3 hv = normalize(viewDir + normalize(uSunDir));
    col += uSun * pow(max(dot(n, hv), 0.0), 260.0) * uSparkle;
    float g1 = pow(max(sin(p.x * 0.81 + uTime * 2.0) * sin(p.y * 0.57 - uTime * 1.4), 0.0), 42.0);
    float g2 = pow(max(sin(p.x * 1.37 - uTime * 1.1 + p.y * 0.43), 0.0), 58.0);
    col += vec3(1.0, 0.96, 0.8) * (g1 * 0.18 + g2 * 0.1) * uSparkle;
    float shore = smoothstep(0.82, 1.0, length(vUv - 0.5) * 2.0);
    float foamN = 0.5 + 0.5 * sin(p.x * 0.7 + uTime * 0.7) * sin(p.y * 0.53 - uTime * 0.55);
    col = mix(col, vec3(0.9, 0.96, 0.93), shore * (0.2 + foamN * 0.24));
    float fog = smoothstep(fogNear, fogFar, length(cameraPosition - vWorldPos));
    col = mix(col, fogColor, fog);
    gl_FragColor = vec4(col, uOpacity + shore * 0.1);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

function makeLakeMaterial(id, fog) {
  const p = LAKE_PALETTES[id] || LAKE_PALETTES.wuhua;
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uDeep: { value: new THREE.Color(p.deep) },
      uMid: { value: new THREE.Color(p.mid) },
      uShallow: { value: new THREE.Color(p.shallow) },
      uAccent: { value: new THREE.Color(p.accent) },
      uSky: { value: new THREE.Color(0xb9d8d2) },
      uSun: { value: new THREE.Color(0xfff0cf) },
      uSunDir: { value: new THREE.Vector3(0.4, 0.8, 0.25).normalize() },
      uNormalMap: { value: rippleNormal },
      uOpacity: { value: p.opacity },
      uBand: { value: p.band },
      uSparkle: { value: p.sparkle },
      fogColor: { value: fog.color },
      fogNear: { value: fog.near },
      fogFar: { value: fog.far },
    },
    vertexShader: LAKE_VERT,
    fragmentShader: LAKE_FRAG,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

function lakeGeometry(def, seed = 1, segments = 112) {
  const positions = [0, 0, 0];
  const uvs = [0.5, 0.5];
  const indices = [];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    const wave = 1 + 0.055 * Math.sin(a * 5 + seed) + 0.035 * Math.sin(a * 9 - seed * 1.7) + 0.018 * Math.sin(a * 17 + 0.6);
    const x = Math.cos(a) * def.rx * wave;
    const z = Math.sin(a) * def.rz * wave;
    positions.push(x, 0, z);
    uvs.push(x / def.rx * 0.5 + 0.5, z / def.rz * 0.5 + 0.5);
    if (i < segments - 1) indices.push(0, i + 1, i + 2);
    else indices.push(0, i + 1, 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function lakeRingGeometry(def, seed, inner = 0.93, outer = 1.13, segments = 96) {
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    const wave = 1 + 0.055 * Math.sin(a * 5 + seed) + 0.035 * Math.sin(a * 9 - seed * 1.7) + 0.018 * Math.sin(a * 17 + 0.6);
    for (const r of [inner, outer]) {
      const m = r / 0.93 * wave;
      positions.push(Math.cos(a) * def.rx * m, 0, Math.sin(a) * def.rz * m);
      uvs.push((r - inner) / (outer - inner), i / segments);
    }
    const a0 = i * 2;
    const b0 = a0 + 1;
    const a1 = ((i + 1) % segments) * 2;
    const b1 = a1 + 1;
    indices.push(a0, a1, b0, b0, a1, b1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
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

function makeWaterfallMaterial(fog) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 0.9 },
      fogColor: { value: fog.color },
      fogNear: { value: fog.near },
      fogFar: { value: fog.far },
    },
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
    fragmentShader: `
      uniform float uTime;
      uniform float uOpacity;
      uniform vec3 fogColor;
      uniform float fogNear;
      uniform float fogFar;
      varying vec2 vUv;
      varying vec3 vWorldPos;
      void main() {
        float flow = sin(vUv.y * 23.0 - uTime * 4.6 + sin(vUv.x * 15.0) * 1.9);
        float fine = sin(vUv.y * 67.0 - uTime * 8.2 + sin(vUv.x * 43.0) * 2.5);
        float streak = sin(vUv.x * 91.0 + sin(vUv.y * 13.0) * 1.7) * 0.5 + 0.5;
        float sheet = smoothstep(-0.8, 0.95, flow) * 0.5 + smoothstep(-0.4, 1.0, fine) * 0.28;
        float edge = smoothstep(0.0, 0.075, vUv.x) * (1.0 - smoothstep(0.925, 1.0, vUv.x));
        edge *= smoothstep(0.0, 0.045, vUv.y) * (1.0 - smoothstep(0.94, 1.0, vUv.y));
        float alpha = edge * (0.24 + sheet * (0.44 + streak * 0.32)) * uOpacity;
        vec3 col = mix(vec3(0.68, 0.9, 0.89), vec3(0.98, 1.0, 0.99), sheet);
        float fog = smoothstep(fogNear, fogFar, length(cameraPosition - vWorldPos));
        col = mix(col, fogColor, fog);
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

function waterfallGeometry(w, h, segW = 36, segH = 12, bend = 0) {
  const geo = new THREE.PlaneGeometry(w, h, segW, segH);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const t = (y + h / 2) / h;
    pos.setZ(i, Math.sin(t * Math.PI) * bend + Math.sin(x * 0.06 + t * 5.0) * 0.22 * (0.3 + t));
  }
  geo.computeVertexNormals();
  return geo;
}

function addFallenLogs(group, def, seed, count) {
  for (let i = 0; i < count; i++) {
    const a = Rnd(seed + i * 4.1) * Math.PI * 2;
    const rr = 0.15 + Rnd(seed + i * 7.7) * 0.72;
    const x = def.cx + Math.cos(a) * def.rx * rr;
    const z = def.cz + Math.sin(a) * def.rz * rr;
    const yaw = Rnd(seed + i * 9.3) * Math.PI * 2;
    const len = 4 + Rnd(seed + i * 5.9) * 14;
    const rad = 0.16 + Rnd(seed + i * 3.3) * 0.42;
    const y = def.y - 0.12 - Rnd(seed + i * 8.1) * 0.38;
    const g = new THREE.CylinderGeometry(rad * 0.72, rad, len, 7);
    g.rotateZ(Math.PI / 2);
    g.rotateY(yaw);
    g.translate(x, y, z);
    group.add(new THREE.Mesh(g, i % 3 === 0 ? logDark : logMat));
    const branches = 1 + ((Rnd(seed + i * 6.2) * 3) | 0);
    for (let b = 0; b < branches; b++) {
      const t = -0.42 + (b / Math.max(1, branches - 1)) * 0.84;
      const bx = x + Math.cos(yaw) * len * t;
      const bz = z - Math.sin(yaw) * len * t;
      const bh = 1.2 + Rnd(seed + i * 11.7 + b) * 2.6;
      const bg = new THREE.CylinderGeometry(rad * 0.16, rad * 0.3, bh, 5);
      bg.rotateZ((Rnd(seed + i * 2.7 + b) - 0.5) * 1.3);
      bg.translate(bx, y + bh * 0.22, bz);
      group.add(new THREE.Mesh(bg, logDark));
    }
  }
  for (let i = 0; i < 7; i++) {
    const a = Rnd(seed + 40 + i * 3.9) * Math.PI * 2;
    const rr = 0.2 + Rnd(seed + i * 8.3) * 0.6;
    const x = def.cx + Math.cos(a) * def.rx * rr;
    const z = def.cz + Math.sin(a) * def.rz * rr;
    const rad = 0.18 + Rnd(seed + i * 5.1) * 0.3;
    const h = 2.5 + Rnd(seed + i * 9.7) * 6.5;
    const g = new THREE.CylinderGeometry(rad * 0.6, rad, h, 6);
    g.translate(x, def.y - 0.6 + h * 0.5, z);
    group.add(new THREE.Mesh(g, logDark));
    const top = new THREE.CylinderGeometry(rad * 0.2, rad * 0.58, 1.6, 5);
    top.rotateZ((Rnd(seed + i) - 0.5) * 0.5);
    top.translate(x, def.y - 0.6 + h + 0.5, z);
    group.add(new THREE.Mesh(top, logDark));
  }
}

export function buildWaterSystem(fog) {
  const group = new THREE.Group();
  const waterMaterials = [];
  const waterfallMaterials = [];
  const mists = [];
  const foamGeos = [];
  const state = { group, waterMaterials, waterfallMaterials, mists, primary: null };

  LAKES.forEach((def, index) => {
    const material = makeLakeMaterial(def.id, fog);
    waterMaterials.push(material);
    if (def.id === 'wuhua') state.primary = material;
    const water = new THREE.Mesh(lakeGeometry(def, index * 1.7 + 1), material);
    water.position.set(def.cx, def.y, def.cz);
    water.renderOrder = 2;
    water.receiveShadow = true;
    group.add(water);

    const ring = new THREE.Mesh(lakeRingGeometry(def, index * 1.7 + 1), index % 2 ? travertinePale : travertine);
    ring.position.set(def.cx, def.y + 0.045, def.cz);
    ring.receiveShadow = true;
    group.add(ring);

    const rim = new THREE.Mesh(lakeRingGeometry(def, index * 1.7 + 1, 1.06, 1.2), index % 3 === 0 ? mineralBand : travertineWarm);
    rim.position.set(def.cx, def.y - 0.12, def.cz);
    rim.receiveShadow = true;
    group.add(rim);

    if (def.id === 'wuhua' || def.id === 'upper') addFallenLogs(group, def, index * 31 + 7, def.id === 'wuhua' ? 24 : 10);
  });

  const wuhua = LAKE_BY_ID.wuhua;
  for (let i = 0; i < 34; i++) {
    const a = Rnd(300 + i * 2.3) * Math.PI * 2;
    const rr = 0.35 + Rnd(400 + i * 3.1) * 0.58;
    const x = wuhua.cx + Math.cos(a) * wuhua.rx * rr;
    const z = wuhua.cz + Math.sin(a) * wuhua.rz * rr;
    const w = 2 + Rnd(500 + i) * 7;
    const d = 1.2 + Rnd(600 + i) * 4;
    const g = new THREE.PlaneGeometry(w, d);
    g.rotateX(-Math.PI / 2);
    g.rotateY(Rnd(700 + i) * 6.28);
    g.translate(x, wuhua.y + 0.055, z);
    foamGeos.push(g);
  }

  const upper = LAKE_BY_ID.upper;
  const fallTop = upper.y;
  const fallBottom = LAKE_BY_ID.wuhua.y;
  const fallH = fallTop - fallBottom + 1.4;
  const fallZ = -102;
  const fallW = 104;
  const mainMat = makeWaterfallMaterial(fog);
  mainMat.uniforms.uOpacity.value = 0.92;
  waterfallMaterials.push(mainMat);
  const mainFall = new THREE.Mesh(waterfallGeometry(fallW, fallH, 42, 18, 3.2), mainMat);
  mainFall.position.set(0, fallBottom + fallH * 0.5 - 0.5, fallZ);
  mainFall.renderOrder = 3;
  group.add(mainFall);

  for (const [off, w, z, op] of [[-48, 30, fallZ + 1.2, 0.7], [46, 34, fallZ + 1.0, 0.7], [-22, 18, fallZ + 2.4, 0.5], [18, 22, fallZ + 2.2, 0.5]]) {
    const m = makeWaterfallMaterial(fog);
    m.uniforms.uOpacity.value = op;
    waterfallMaterials.push(m);
    const fall = new THREE.Mesh(waterfallGeometry(w, fallH * (0.86 + Rnd(off) * 0.12), 18, 12, 1.6), m);
    fall.position.set(off, fallBottom + fallH * 0.5 - 0.6, z);
    fall.renderOrder = 3;
    group.add(fall);
  }

  box(group, fallW + 10, 1.1, 4.2, travertinePale, 0, fallTop + 0.05, fallZ - 4.6);
  box(group, fallW + 18, 1.7, 5.2, travertineWarm, 0, fallTop + 0.55, fallZ - 6.2);
  for (let i = 0; i < 9; i++) {
    const x = -fallW * 0.48 + (i / 8) * fallW * 0.96;
    box(group, 6.5, 0.5, 7 + Rnd(i) * 3, travertine, x, fallTop + 0.72, fallZ - 9 - Rnd(i * 3) * 7, Rnd(i * 5) * 1.6);
  }
  for (let i = 0; i < 7; i++) {
    const w = fallW * (0.35 + Rnd(900 + i) * 0.6);
    const g = new THREE.PlaneGeometry(w, 5 + Rnd(i * 4) * 7);
    g.rotateX(-Math.PI / 2);
    g.translate((Rnd(i * 7) - 0.5) * 50, fallBottom + 0.1, fallZ + 5 + Rnd(i * 9) * 18);
    foamGeos.push(g);
  }

  const shu = LAKES.filter((l) => l.kind === 'terrace');
  for (let i = 0; i < shu.length - 1; i++) {
    const a = shu[i];
    const b = shu[i + 1];
    const z = (a.cz + b.cz) * 0.5;
    const width = Math.min(a.rx, b.rx) * 1.6;
    const top = a.y + 0.15;
    const bottom = b.y - 0.1;
    const h = Math.max(0.45, top - bottom);
    box(group, width, h + 0.7, 3.4, i % 2 ? travertinePale : travertineWarm, (a.cx + b.cx) * 0.5, bottom + (h + 0.7) * 0.5 - 0.3, z);
    const m = makeWaterfallMaterial(fog);
    m.uniforms.uOpacity.value = 0.52;
    waterfallMaterials.push(m);
    const fall = new THREE.Mesh(waterfallGeometry(width * 0.82, h + 0.7, 20, 5, 0.25), m);
    fall.position.set((a.cx + b.cx) * 0.5, bottom + (h + 0.7) * 0.5, z + 1.9);
    fall.renderOrder = 3;
    group.add(fall);
  }

  const pearl = LAKE_BY_ID.pearl;
  for (let i = 0; i < 7; i++) {
    const z = 126 + i * 8.2;
    const w = 30 + Rnd(i * 3.1) * 22;
    box(group, w, 0.18, 1.1, i % 2 ? travertinePale : mineralBand, pearl.cx + (Rnd(i * 4.7) - 0.5) * 16, pearl.y + 0.02, z);
    const foam = new THREE.PlaneGeometry(w * 0.9, 2.4);
    foam.rotateX(-Math.PI / 2);
    foam.translate(pearl.cx + (Rnd(i * 4.7) - 0.5) * 16, pearl.y + 0.09, z + 1.5);
    foamGeos.push(foam);
  }
  for (let i = 0; i < 20; i++) {
    const g = new THREE.PlaneGeometry(1.4 + Rnd(i) * 4.5, 0.5 + Rnd(i * 2) * 1.6);
    g.rotateX(-Math.PI / 2);
    g.rotateY(Rnd(i * 4) * 6.28);
    g.translate(pearl.cx + (Rnd(i * 7) - 0.5) * 70, pearl.y + 0.07, pearl.cz + (Rnd(i * 9) - 0.5) * 36);
    foamGeos.push(g);
  }

  if (foamGeos.length) {
    const geo = mergeGeometries(foamGeos, false);
    foamGeos.forEach((g) => g.dispose());
    const mesh = new THREE.Mesh(geo, foamMat);
    mesh.renderOrder = 1;
    group.add(mesh);
  }

  const cloudTex = makeCloudTexture();
  const mistDefs = [
    [0, 3.6, -91, 90, 20, 0.44],
    [-38, 4.5, -88, 58, 16, 0.34],
    [40, 4.2, -90, 62, 17, 0.34],
    [0, 6.4, -104, 118, 26, 0.28],
    [-20, 2.8, 34, 70, 13, 0.17],
    [10, 2.4, 190, 64, 12, 0.15],
    [0, 24, -280, 180, 42, 0.2],
    [0, 48, -470, 280, 68, 0.16],
  ];
  for (let i = 0; i < mistDefs.length; i++) {
    const [x, y, z, w, h, o] = mistDefs[i];
    const m = new THREE.MeshBasicMaterial({
      map: cloudTex, transparent: true, opacity: o, depthWrite: false,
      side: THREE.DoubleSide, fog: false, toneMapped: false,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
    mesh.position.set(x, y, z);
    mesh.renderOrder = 5;
    group.add(mesh);
    mists.push({ mesh, base: new THREE.Vector3(x, y, z), phase: i * 1.37, drift: 3 + (i % 3) * 2.2, opacity: o });
  }

  state.update = (time, envMix = 0) => {
    for (const m of waterMaterials) {
      m.uniforms.uTime.value = time;
      m.uniforms.fogNear.value = fog.near;
      m.uniforms.fogFar.value = fog.far;
      m.uniforms.fogColor.value.copy(fog.color);
      m.uniforms.uSun.value.setRGB(1.0, 0.94 - envMix * 0.18, 0.81 - envMix * 0.35);
      m.uniforms.uSky.value.setRGB(0.72 - envMix * 0.22, 0.84 - envMix * 0.2, 0.82 - envMix * 0.18);
    }
    for (const m of waterfallMaterials) {
      m.uniforms.uTime.value = time;
      m.uniforms.fogNear.value = fog.near;
      m.uniforms.fogFar.value = fog.far;
      m.uniforms.fogColor.value.copy(fog.color);
    }
    for (const c of mists) {
      c.mesh.position.x = c.base.x + Math.sin(time * 0.05 + c.phase) * c.drift * 2.4;
      c.mesh.position.y = c.base.y + Math.sin(time * 0.16 + c.phase) * 0.8;
      c.mesh.position.z = c.base.z + Math.cos(time * 0.04 + c.phase) * c.drift;
      c.mesh.material.opacity = c.opacity * (0.82 + 0.18 * Math.sin(time * 0.3 + c.phase));
    }
  };
  return state;
}
