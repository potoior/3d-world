import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const rand = mulberry32(20261021);
export const rr = (a, b) => a + (b - a) * rand();

function makeTexture(w, h, draw, { repeat = true, srgb = true } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  if (repeat) {
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
  }
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

const woodMap = makeTexture(256, 256, (ctx, w, h) => {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#7a5239');
  g.addColorStop(0.5, '#61402c');
  g.addColorStop(1, '#4b3021');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x += 16) {
    const v = 0.85 + rand() * 0.3;
    ctx.fillStyle = `rgba(${(100 * v) | 0},${(64 * v) | 0},${(43 * v) | 0},0.55)`;
    ctx.fillRect(x, 0, 15, h);
    ctx.fillStyle = 'rgba(30,19,12,0.6)';
    ctx.fillRect(x, 0, 1.5, h);
    ctx.fillStyle = 'rgba(224,181,133,0.08)';
    ctx.fillRect(x + 2, 0, 1, h);
  }
  for (let i = 0; i < 90; i++) {
    ctx.strokeStyle = `rgba(34,21,14,${0.03 + rand() * 0.08})`;
    ctx.lineWidth = 0.5 + rand();
    const x = rand() * w;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.bezierCurveTo(x + rr(-4, 4), h * 0.33, x + rr(-6, 6), h * 0.72, x + rr(-3, 3), h);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(24,15,10,0.5)';
  ctx.lineWidth = 2;
  for (let y = 64; y < h; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
});

const roofMap = makeTexture(256, 256, (ctx, w, h) => {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#5b6663');
  g.addColorStop(0.5, '#48514f');
  g.addColorStop(1, '#353c3c');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 18) {
    for (let x = -8; x < w; x += 16) {
      const ox = ((y / 18) % 2) * 8;
      const v = 0.82 + rand() * 0.34;
      ctx.fillStyle = `rgb(${(94 * v) | 0},${(103 * v) | 0},${(101 * v) | 0})`;
      ctx.beginPath();
      ctx.roundRect(x + ox + 1, y + 1, 14, 16, 5);
      ctx.fill();
      ctx.fillStyle = 'rgba(18,23,23,0.55)';
      ctx.fillRect(x + ox + 1, y + 16, 14, 2);
      ctx.fillStyle = 'rgba(215,224,219,0.1)';
      ctx.fillRect(x + ox + 3, y + 3, 10, 1.5);
    }
  }
});

const stoneMap = makeTexture(256, 256, (ctx, w, h) => {
  ctx.fillStyle = '#78776e';
  ctx.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 26) {
    for (let x = -20; x < w; x += 52) {
      const ox = ((y / 26) % 2) * 26;
      const v = 0.72 + rand() * 0.42;
      ctx.fillStyle = `rgb(${(128 * v) | 0},${(125 * v) | 0},${(113 * v) | 0})`;
      ctx.beginPath();
      ctx.roundRect(x + ox + 2, y + 2, 47, 22, 4);
      ctx.fill();
    }
  }
  ctx.strokeStyle = 'rgba(46,48,43,0.65)';
  ctx.lineWidth = 2;
  for (let y = 0; y < h; y += 26) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  for (let i = 0; i < 700; i++) {
    ctx.fillStyle = `rgba(${90 + rand() * 70},${95 + rand() * 65},${82 + rand() * 55},0.15)`;
    ctx.beginPath();
    ctx.arc(rand() * w, rand() * h, rand() * 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
});

const groundMap = makeTexture(256, 256, (ctx, w, h) => {
  ctx.fillStyle = '#687253';
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 1800; i++) {
    const g = 68 + rand() * 72;
    ctx.fillStyle = `rgba(${g * 0.8},${g},${g * 0.64},${0.14 + rand() * 0.2})`;
    ctx.beginPath();
    ctx.arc(rand() * w, rand() * h, rand() * 2.3, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 45; i++) {
    ctx.strokeStyle = `rgba(54,58,42,${0.05 + rand() * 0.1})`;
    ctx.lineWidth = 1 + rand() * 3;
    ctx.beginPath();
    const x = rand() * w;
    ctx.moveTo(x, 0);
    ctx.bezierCurveTo(x + rr(-20, 20), h * 0.4, x + rr(-20, 20), h * 0.7, x + rr(-15, 15), h);
    ctx.stroke();
  }
});

const latticeMap = makeTexture(128, 128, (ctx, w, h) => {
  ctx.fillStyle = '#2c2117';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#9a7654';
  ctx.lineWidth = 3;
  for (let x = 8; x < w; x += 22) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 8; y < h; y += 22) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.strokeStyle = '#bc9066';
  ctx.lineWidth = 1;
  for (let x = 19; x < w; x += 22) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 19; y < h; y += 22) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,198,116,0.2)';
  ctx.fillRect(2, 2, w - 4, h - 4);
});

const glowMap = makeTexture(128, 128, (ctx, w, h) => {
  const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  g.addColorStop(0, 'rgba(255,246,216,1)');
  g.addColorStop(0.16, 'rgba(255,192,98,0.9)');
  g.addColorStop(0.5, 'rgba(255,128,52,0.24)');
  g.addColorStop(1, 'rgba(255,90,40,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}, { repeat: false });

const mistMap = makeTexture(256, 256, (ctx, w, h) => {
  const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  g.addColorStop(0, 'rgba(255,255,255,0.62)');
  g.addColorStop(0.4, 'rgba(240,245,242,0.24)');
  g.addColorStop(0.75, 'rgba(230,238,234,0.06)');
  g.addColorStop(1, 'rgba(230,238,234,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 34; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const r = 18 + rand() * 55;
    const hg = ctx.createRadialGradient(x, y, 0, x, y, r);
    hg.addColorStop(0, 'rgba(255,255,255,0.11)');
    hg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hg;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
}, { repeat: false });

woodMap.repeat.set(1.6, 1.6);
roofMap.repeat.set(1.2, 1.2);
stoneMap.repeat.set(2, 2);
groundMap.repeat.set(120, 170);

export const MATS = {
  wood: new THREE.MeshStandardMaterial({ map: woodMap, color: 0xe0c8b0, roughness: 0.86, metalness: 0.02 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x38271c, roughness: 0.9 }),
  stone: new THREE.MeshStandardMaterial({ map: stoneMap, color: 0xbfbbaf, roughness: 0.95 }),
  roof: new THREE.MeshStandardMaterial({ map: roofMap, color: 0xa9b1ae, roughness: 0.76, metalness: 0.06, side: THREE.DoubleSide }),
  window: new THREE.MeshStandardMaterial({ map: latticeMap, color: 0xffd9a0, emissive: 0xff9b45, emissiveIntensity: 0.12, roughness: 0.68, side: THREE.DoubleSide }),
  lantern: new THREE.MeshStandardMaterial({ color: 0xb8382c, emissive: 0xff5522, emissiveIntensity: 0.5, roughness: 0.55 }),
  leaf: new THREE.MeshStandardMaterial({ color: 0x55744a, roughness: 0.93 }),
  leafDark: new THREE.MeshStandardMaterial({ color: 0x3b5a3a, roughness: 0.95 }),
  trunk: new THREE.MeshStandardMaterial({ color: 0x4a382a, roughness: 0.95 }),
  silver: new THREE.MeshStandardMaterial({ color: 0xd9dee2, roughness: 0.22, metalness: 0.94 }),
  cloth: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88 }),
  paving: new THREE.MeshStandardMaterial({ map: stoneMap, color: 0xa9a79e, roughness: 0.96 }),
  terrain: new THREE.MeshStandardMaterial({ map: groundMap, vertexColors: true, roughness: 0.98, metalness: 0 }),
  terrace: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: THREE.DoubleSide }),
  rice: new THREE.MeshStandardMaterial({ color: 0x8aab51, roughness: 0.9, side: THREE.DoubleSide }),
  banner: new THREE.MeshStandardMaterial({ color: 0x9c2f2b, roughness: 0.82, side: THREE.DoubleSide }),
  paper: new THREE.MeshStandardMaterial({ color: 0xd7b47a, roughness: 0.9, side: THREE.DoubleSide }),
  water: new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uDeep: { value: new THREE.Color(0x2c4f45) },
      uShallow: { value: new THREE.Color(0x648d74) },
      uSky: { value: new THREE.Color(0xbcd2ca) },
      uSun: { value: new THREE.Color(0xfff2d8) },
      uSunDir: { value: new THREE.Vector3(0.35, 0.8, -0.2).normalize() },
    },
    vertexShader: `
      uniform float uTime;
      varying vec3 vWorldPos;
      varying vec3 vNormalW;
      void main() {
        vec3 pos = position;
        pos.y += sin(pos.x * 0.19 + uTime * 1.4) * 0.055 + cos(pos.z * 0.23 + uTime * 0.9) * 0.04;
        vec4 world = modelMatrix * vec4(pos, 1.0);
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
      uniform vec3 uSun;
      uniform vec3 uSunDir;
      varying vec3 vWorldPos;
      varying vec3 vNormalW;
      void main() {
        float w1 = sin(vWorldPos.z * 0.32 + uTime * 1.3 + sin(vWorldPos.x * 0.21));
        float w2 = sin(vWorldPos.z * 0.11 - uTime * 0.8 + vWorldPos.x * 0.07);
        vec3 n = normalize(vNormalW + vec3(w1 * 0.18 + w2 * 0.12, 0.0, w1 * 0.1));
        vec3 viewDir = normalize(cameraPosition - vWorldPos);
        float fres = pow(1.0 - clamp(dot(viewDir, n), 0.0, 1.0), 2.6);
        vec3 base = mix(uDeep, uShallow, 0.4 + 0.22 * w1);
        vec3 col = mix(base, uSky, fres * 0.55);
        vec3 hv = normalize(viewDir + normalize(uSunDir));
        col += uSun * pow(max(dot(n, hv), 0.0), 160.0) * 0.6;
        float ripple = pow(max(sin(vWorldPos.z * 0.9 + uTime * 3.1 + w2 * 2.0), 0.0), 30.0);
        col += vec3(1.0, 0.95, 0.8) * ripple * 0.08;
        gl_FragColor = vec4(col, 0.96);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
  }),
};

export const TEX = { glowMap, mistMap };

export function geoBox(w, h, d, x, y, z, ry = 0, rx = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (rx) g.rotateX(rx);
  if (ry) g.rotateY(ry);
  g.translate(x, y, z);
  return g;
}

export function geoCyl(rt, rb, h, seg, x, y, z, open = false) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg, 1, open);
  g.translate(x, y, z);
  return g;
}

function normalizeGeo(source) {
  const g = source.index ? source.toNonIndexed() : source.clone();
  for (const key of Object.keys(g.attributes)) {
    if (!['position', 'normal', 'uv'].includes(key)) g.deleteAttribute(key);
  }
  if (!g.attributes.normal) g.computeVertexNormals();
  if (!g.attributes.uv) {
    g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  }
  return g;
}

export function mergeParts(list) {
  if (!list.length) return null;
  const normalized = list.map(normalizeGeo);
  const merged = mergeGeometries(normalized, false);
  list.forEach((g) => g.dispose());
  normalized.forEach((g) => g.dispose());
  return merged;
}

export function meshOf(list, material, cast = true, receive = true) {
  const geo = mergeParts(list);
  if (!geo) return null;
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  return mesh;
}

export function pushColored(list, geo, hex) {
  const g = normalizeGeo(geo);
  const c = new THREE.Color(hex);
  const n = g.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(arr, 3));
  list.push(g);
  return g;
}
