import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const TAU = Math.PI * 2;

export function rand(seed, n) {
  const x = Math.sin(seed * 127.1 + n * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

export function smoothstep(a, b, x) {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

export function canvasTexture(w, h, draw, { repeat = 1, srgb = true } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  if (repeat !== 1) tex.repeat.set(repeat, repeat);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function makeMeadowTexture() {
  return canvasTexture(512, 512, (g) => {
    const grad = g.createLinearGradient(0, 0, 512, 512);
    grad.addColorStop(0, '#6f783e');
    grad.addColorStop(0.35, '#8b8548');
    grad.addColorStop(0.68, '#7a7d44');
    grad.addColorStop(1, '#95864a');
    g.fillStyle = grad;
    g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 12000; i++) {
      const x = rand(3, i) * 512;
      const y = rand(7, i) * 512;
      const len = 1.4 + rand(11, i) * 5.4;
      const t = rand(13, i);
      g.strokeStyle = t > 0.78 ? 'rgba(208,184,99,0.36)'
        : t > 0.52 ? 'rgba(151,150,81,0.3)'
          : t > 0.26 ? 'rgba(80,96,48,0.34)' : 'rgba(112,83,48,0.22)';
      g.lineWidth = 0.8 + rand(15, i) * 0.9;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + (rand(17, i) - 0.5) * 2.6, y - len);
      g.stroke();
    }
    for (let i = 0; i < 520; i++) {
      const t = rand(19, i);
      g.fillStyle = t > 0.62 ? 'rgba(220,180,81,0.28)' : t > 0.3 ? 'rgba(176,158,95,0.18)' : 'rgba(61,80,41,0.2)';
      g.beginPath();
      g.arc(rand(23, i) * 512, rand(29, i) * 512, 0.7 + rand(31, i) * 2.1, 0, TAU);
      g.fill();
    }
  }, { repeat: 150 });
}

function makePathTexture() {
  return canvasTexture(256, 256, (g) => {
    g.fillStyle = '#8b7454';
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 4200; i++) {
      const t = rand(47, i);
      g.fillStyle = t > 0.72 ? 'rgba(158,142,110,0.5)' : t > 0.4 ? 'rgba(102,82,54,0.42)' : 'rgba(67,58,40,0.35)';
      g.beginPath();
      g.arc(rand(41, i) * 256, rand(43, i) * 256, 0.4 + rand(53, i) * 1.5, 0, TAU);
      g.fill();
    }
    for (let i = 0; i < 46; i++) {
      g.strokeStyle = 'rgba(66,55,38,0.24)';
      g.lineWidth = 0.7;
      g.beginPath();
      const x = rand(59, i) * 256;
      const y = rand(61, i) * 256;
      g.moveTo(x, y);
      g.lineTo(x + (rand(67, i) - 0.5) * 22, y + (rand(71, i) - 0.5) * 22);
      g.stroke();
    }
  }, { repeat: 80 });
}

function makeWoodTexture() {
  return canvasTexture(256, 512, (g) => {
    const grad = g.createLinearGradient(0, 0, 256, 0);
    grad.addColorStop(0, '#8b6340');
    grad.addColorStop(0.22, '#b58a5c');
    grad.addColorStop(0.5, '#a4774c');
    grad.addColorStop(0.78, '#bc9162');
    grad.addColorStop(1, '#8c603c');
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 512);
    for (let i = 0; i < 120; i++) {
      const x = rand(73, i) * 256;
      g.strokeStyle = 'rgba(74,48,27,' + (0.08 + rand(79, i) * 0.2) + ')';
      g.lineWidth = 0.6 + rand(83, i) * 2.6;
      g.beginPath();
      g.moveTo(x, 0);
      g.bezierCurveTo(x + (rand(89, i) - 0.5) * 18, 150, x + (rand(97, i) - 0.5) * 18, 360, x + (rand(101, i) - 0.5) * 10, 512);
      g.stroke();
    }
  });
}

function makeShingleTexture() {
  return canvasTexture(256, 256, (g) => {
    g.fillStyle = '#6f6657';
    g.fillRect(0, 0, 256, 256);
    const rows = 15;
    for (let r = 0; r < rows; r++) {
      const y = (r / rows) * 256;
      for (let c = 0; c < 9; c++) {
        const x = (c / 9) * 256 + (r % 2 ? 14 : 0);
        const w = 256 / 9 - 2;
        const t = rand(r * 13 + c, 7);
        g.fillStyle = t > 0.66 ? '#8d8270' : t > 0.33 ? '#7b7262' : '#5f594c';
        g.fillRect(x + 1, y + 1, w, 256 / rows - 2);
        g.fillStyle = 'rgba(42,38,30,0.32)';
        g.fillRect(x + 1, y + 256 / rows - 3, w, 2);
      }
    }
  }, { repeat: 2 });
}

function makeBarkTexture() {
  return canvasTexture(128, 256, (g) => {
    g.fillStyle = '#4c3624';
    g.fillRect(0, 0, 128, 256);
    for (let i = 0; i < 90; i++) {
      const x = rand(151, i) * 128;
      g.strokeStyle = rand(157, i) > 0.5 ? 'rgba(31,22,15,0.5)' : 'rgba(116,85,57,0.38)';
      g.lineWidth = 1 + rand(163, i) * 4;
      g.beginPath();
      g.moveTo(x, 0);
      g.bezierCurveTo(x + (rand(167, i) - 0.5) * 12, 80, x + (rand(173, i) - 0.5) * 12, 180, x + (rand(179, i) - 0.5) * 7, 256);
      g.stroke();
    }
  }, { repeat: 2 });
}

function makeBirchTexture() {
  return canvasTexture(128, 256, (g) => {
    g.fillStyle = '#e7e2d2';
    g.fillRect(0, 0, 128, 256);
    for (let i = 0; i < 44; i++) {
      g.fillStyle = rand(197, i) > 0.7 ? 'rgba(170,165,148,0.5)' : 'rgba(44,42,36,0.62)';
      g.beginPath();
      g.ellipse(rand(193, i) * 128, rand(181, i) * 256, 5 + rand(191, i) * 37, 1.2 + rand(199, i) * 2.4, 0, 0, TAU);
      g.fill();
    }
    for (let i = 0; i < 24; i++) {
      g.fillStyle = 'rgba(84,80,68,0.28)';
      g.fillRect(rand(223, i) * 128, rand(227, i) * 256, 2 + rand(229, i) * 9, 1 + rand(233, i) * 2);
    }
  }, { repeat: 2 });
}

function makeRockTexture() {
  return canvasTexture(256, 256, (g) => {
    g.fillStyle = '#85877e';
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 6200; i++) {
      const t = rand(239, i);
      g.fillStyle = t > 0.72 ? 'rgba(150,151,140,0.3)' : t > 0.4 ? 'rgba(96,97,89,0.32)' : 'rgba(63,66,61,0.22)';
      g.beginPath();
      g.arc(rand(241, i) * 256, rand(251, i) * 256, 0.5 + rand(257, i) * 2.5, 0, TAU);
      g.fill();
    }
  });
}

function makeWaterNormal() {
  return canvasTexture(128, 128, (g, w, h) => {
    const img = g.createImageData(w, h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const nx = Math.sin(x * 0.34 + Math.sin(y * 0.11) * 2.4) * 0.46
          + Math.sin(x * 0.13 - y * 0.21) * 0.32
          + Math.sin(y * 0.53 + x * 0.07) * 0.18;
        const ny = Math.cos(y * 0.29 + Math.sin(x * 0.09) * 2.1) * 0.46
          + Math.cos(y * 0.17 + x * 0.23) * 0.3
          + Math.cos(x * 0.47 - y * 0.06) * 0.16;
        img.data[i] = clamp(128 + nx * 110, 0, 255);
        img.data[i + 1] = clamp(128 + ny * 110, 0, 255);
        img.data[i + 2] = 255;
        img.data[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
  }, { srgb: false });
}

export function makeSignTexture(title, sub) {
  return canvasTexture(640, 320, (g) => {
    const grad = g.createLinearGradient(0, 0, 0, 320);
    grad.addColorStop(0, '#5a4129');
    grad.addColorStop(0.5, '#432f1e');
    grad.addColorStop(1, '#60452b');
    g.fillStyle = grad;
    g.fillRect(0, 0, 640, 320);
    for (let i = 0; i < 110; i++) {
      g.strokeStyle = 'rgba(30,20,12,' + (0.08 + rand(3, i) * 0.15) + ')';
      g.lineWidth = 1 + rand(5, i) * 2.4;
      const y = rand(7, i) * 320;
      g.beginPath();
      g.moveTo(0, y);
      g.bezierCurveTo(180, y + rand(9, i) * 14, 460, y - rand(11, i) * 12, 640, y + rand(13, i) * 8);
      g.stroke();
    }
    g.strokeStyle = 'rgba(218,176,102,0.6)';
    g.lineWidth = 5;
    g.strokeRect(18, 18, 604, 284);
    g.textAlign = 'center';
    g.fillStyle = '#f0e4ca';
    g.font = '600 98px "Noto Serif CJK SC", "Songti SC", serif';
    g.fillText(title, 320, 158);
    g.fillStyle = 'rgba(224,199,154,0.82)';
    g.font = '28px "Helvetica Neue", Arial, sans-serif';
    g.fillText(sub, 320, 228);
  }, { srgb: true });
}

const swayTime = { value: 0 };

function withSway(material, amp, freq) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uSwayTime = swayTime;
    shader.vertexShader = 'uniform float uSwayTime;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      float hemuSway = sin(uSwayTime * ${freq.toFixed(2)} + transformed.y * 0.42 + transformed.x * 0.07);
      float hemuAmt = hemuSway * ${amp.toFixed(4)} * max(transformed.y, 0.0);
      transformed.x += hemuAmt;
      transformed.z += hemuAmt * 0.6;`
    );
  };
  material.customProgramCacheKey = () => 'hemuSway' + amp + freq;
  return material;
}

export function updateHemuSway(t) {
  swayTime.value = t;
}

export function buildMaterials() {
  const meadowMap = makeMeadowTexture();
  const pathMap = makePathTexture();
  const woodMap = makeWoodTexture();
  const shingleMap = makeShingleTexture();
  const barkMap = makeBarkTexture();
  const birchMap = makeBirchTexture();
  const rockMap = makeRockTexture();
  const waterNormalMap = makeWaterNormal();

  const M = {
    meadow: new THREE.MeshStandardMaterial({ map: meadowMap, color: 0xd8d2b2, roughness: 1, vertexColors: true }),
    path: new THREE.MeshStandardMaterial({ map: pathMap, color: 0xd2b58a, roughness: 1 }),
    earth: new THREE.MeshStandardMaterial({ color: 0x7a6345, roughness: 1 }),
    riverbed: new THREE.MeshStandardMaterial({ color: 0x3b4b40, roughness: 1 }),
    stone: new THREE.MeshStandardMaterial({ map: rockMap, color: 0xaaa89b, roughness: 0.98 }),
    stoneDark: new THREE.MeshStandardMaterial({ map: rockMap, color: 0x6b6d64, roughness: 1 }),
    log: new THREE.MeshStandardMaterial({ map: woodMap, color: 0xd3ad7d, roughness: 0.93 }),
    logLight: new THREE.MeshStandardMaterial({ map: woodMap, color: 0xe7c494, roughness: 0.92 }),
    timber: new THREE.MeshStandardMaterial({ map: woodMap, color: 0x9a7047, roughness: 0.95 }),
    timberDark: new THREE.MeshStandardMaterial({ map: barkMap, color: 0x6d5036, roughness: 0.96 }),
    roof: new THREE.MeshStandardMaterial({ map: shingleMap, color: 0x9b9383, roughness: 0.9, side: THREE.DoubleSide }),
    roofDark: new THREE.MeshStandardMaterial({ map: shingleMap, color: 0x666a62, roughness: 0.86, side: THREE.DoubleSide }),
    window: new THREE.MeshStandardMaterial({ color: 0x332a1c, emissive: 0xffaf58, emissiveIntensity: 0.55, roughness: 0.5 }),
    door: new THREE.MeshStandardMaterial({ map: woodMap, color: 0x5b3f2a, roughness: 0.94 }),
    hay: new THREE.MeshStandardMaterial({ color: 0xc7a653, roughness: 0.98 }),
    trunk: new THREE.MeshStandardMaterial({ map: barkMap, color: 0x6b5138, roughness: 0.98 }),
    birchBark: new THREE.MeshStandardMaterial({ map: birchMap, color: 0xf0ecdd, roughness: 0.94 }),
    spruceDark: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.94 }),
    spruceLight: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92 }),
    larchGold: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }),
    larchCopper: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }),
    birchGold: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }),
    birchOlive: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92 }),
    grass: withSway(new THREE.MeshStandardMaterial({ color: 0x8b934f, roughness: 0.96 }), 0.02, 1.7),
    flowerGold: withSway(new THREE.MeshStandardMaterial({ color: 0xd8b552, roughness: 0.9 }), 0.022, 1.9),
    flowerWhite: withSway(new THREE.MeshStandardMaterial({ color: 0xeadfbe, roughness: 0.9 }), 0.022, 1.9),
    leaf: new THREE.MeshStandardMaterial({ color: 0xd2a440, roughness: 0.94, side: THREE.DoubleSide }),
    rock: new THREE.MeshStandardMaterial({ map: rockMap, color: 0x8f9188, roughness: 0.98 }),
    rockDark: new THREE.MeshStandardMaterial({ map: rockMap, color: 0x626760, roughness: 1 }),
    moss: new THREE.MeshStandardMaterial({ color: 0x707d4d, roughness: 1 }),
    horseCoat: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.88 }),
    horseDark: new THREE.MeshStandardMaterial({ color: 0x2d231a, roughness: 0.92 }),
    saddle: new THREE.MeshStandardMaterial({ color: 0x89402f, roughness: 0.8 }),
    blanket: new THREE.MeshStandardMaterial({ color: 0xb18a40, roughness: 0.92 }),
    bird: new THREE.MeshStandardMaterial({ color: 0x38322b, roughness: 0.84, side: THREE.DoubleSide }),
    birdBeak: new THREE.MeshStandardMaterial({ color: 0xb58b43, roughness: 0.7 }),
    hillFar: new THREE.MeshStandardMaterial({ color: 0x5e6a55, roughness: 1 }),
  };
  return { M, maps: { meadowMap, pathMap, woodMap, shingleMap, barkMap, birchMap, rockMap, waterNormalMap } };
}

/* -------------------------- geometry utils -------------------------- */

export function addBox(list, w, h, d, x, y, z, ry = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (ry) g.rotateY(ry);
  g.translate(x, y, z);
  list.push(g);
}

export function addCylX(list, len, r, x, y, z, seg = 7) {
  const g = new THREE.CylinderGeometry(r, r, len, seg);
  g.rotateZ(Math.PI / 2);
  g.translate(x, y, z);
  list.push(g);
}

export function addCylZ(list, len, r, x, y, z, seg = 7) {
  const g = new THREE.CylinderGeometry(r, r, len, seg);
  g.rotateX(Math.PI / 2);
  g.translate(x, y, z);
  list.push(g);
}

export function addRod(list, ax, ay, az, bx, by, bz, r1, r2 = r1, seg = 5) {
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

export function mergeGeo(list) {
  if (!list.length) return null;
  const normalized = [];
  for (const source of list) {
    const g = source.index ? source.toNonIndexed() : source;
    for (const key of Object.keys(g.attributes)) {
      if (key !== 'position' && key !== 'normal' && key !== 'uv') g.deleteAttribute(key);
    }
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!g.attributes.uv) {
      const count = g.attributes.position.count;
      g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(count * 2), 2));
    }
    normalized.push(g);
  }
  return mergeGeometries(normalized, false);
}

export function mergedMesh(list, material, cast = true, receive = true) {
  const geo = mergeGeo(list);
  if (!geo) return null;
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  return mesh;
}

export function makeRibbonGeometry(points, widthFn, yFn, uvScale = 16) {
  const curve = new THREE.CatmullRomCurve3(
    points.map((p) => new THREE.Vector3(p[0], 0, p[1])),
    false,
    'catmullrom',
    0.32
  );
  const count = 220;
  const pts = curve.getSpacedPoints(count);
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let i = 0; i < pts.length; i++) {
    const t = i / (pts.length - 1);
    const p = pts[i];
    const tangent = curve.getTangent(t);
    const nx = -tangent.z;
    const nz = tangent.x;
    const w = typeof widthFn === 'function' ? widthFn(t) : widthFn;
    const y = yFn(p.x, p.z, t);
    positions.push(p.x + nx * w * 0.5, y, p.z + nz * w * 0.5);
    positions.push(p.x - nx * w * 0.5, y, p.z - nz * w * 0.5);
    uvs.push(0, t * uvScale, 1, t * uvScale);
    if (i < pts.length - 1) {
      const a = i * 2;
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return { geo, curve, pts };
}
