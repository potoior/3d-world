import * as THREE from 'three';
import { addBox, addCylinder, mergedMesh } from './geometry.js';
import { makeWaterMaterial } from './materials.js';

function rand(seed, n) {
  const x = Math.sin(seed * 127.1 + n * 311.7 + 17.31) * 43758.5453;
  return x - Math.floor(x);
}

function smoothstep(a, b, x) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function canvasTexture(w, h, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d'), w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

const PEAKS = [
  { name: '卡瓦格博', x: 0, z: 820, h: 1000, rx: 500, rz: 460, e: 1.28, faces: 4, ridge: 0.19, phase: 0.2 },
  { name: '面茨姆', x: -560, z: 880, h: 790, rx: 390, rz: 340, e: 1.5, faces: 6, ridge: 0.1, phase: 1.1 },
  { name: '吉娃仁安', x: 520, z: 930, h: 760, rx: 380, rz: 340, e: 1.52, faces: 5, ridge: 0.1, phase: 2.4 },
  { name: '布迥松阶吾学', x: -1040, z: 1020, h: 650, rx: 360, rz: 310, e: 1.58, faces: 7, ridge: 0.09, phase: 0.7 },
  { name: '说拉曾归面布', x: 1050, z: 1040, h: 660, rx: 370, rz: 315, e: 1.56, faces: 6, ridge: 0.09, phase: 3.2 },
  { name: '归缅', x: -1470, z: 1130, h: 545, rx: 340, rz: 295, e: 1.62, faces: 5, ridge: 0.08, phase: 1.8 },
  { name: '奶日顶卡', x: 1450, z: 1140, h: 560, rx: 340, rz: 300, e: 1.62, faces: 6, ridge: 0.08, phase: 4.1 },
  { name: '粗归腊卡', x: -260, z: 1050, h: 705, rx: 330, rz: 300, e: 1.54, faces: 5, ridge: 0.1, phase: 2.9 },
  { name: '芒框腊卡', x: 270, z: 1080, h: 720, rx: 335, rz: 300, e: 1.54, faces: 6, ridge: 0.1, phase: 5.2 },
  { name: '乃日丁卡', x: -760, z: 1130, h: 605, rx: 330, rz: 290, e: 1.6, faces: 7, ridge: 0.08, phase: 0.4 },
  { name: '八堆顶', x: 760, z: 1160, h: 615, rx: 330, rz: 290, e: 1.6, faces: 5, ridge: 0.08, phase: 1.5 },
  { name: '甲吾雪山', x: -1200, z: 1230, h: 505, rx: 320, rz: 280, e: 1.65, faces: 6, ridge: 0.07, phase: 3.7 },
  { name: '多克拉卡', x: 1220, z: 1260, h: 515, rx: 320, rz: 280, e: 1.65, faces: 7, ridge: 0.07, phase: 2.1 },
];

const STREAMS = [
  {
    width: 22,
    points: [
      [318, 552], [306, 470], [290, 392], [272, 312], [254, 230], [238, 148],
      [222, 54], [208, -60], [192, -200], [176, -380], [158, -620], [142, -900], [128, -1180],
    ],
  },
  {
    width: 9,
    points: [[292, 390], [330, 320], [342, 238], [326, 150], [296, 60], [264, -30], [242, -130]],
  },
  {
    width: 7,
    points: [[254, 230], [206, 186], [188, 106], [204, 30], [228, -52], [232, -140]],
  },
  {
    width: 7,
    points: [[-502, -8], [-492, -94], [-478, -194], [-458, -300], [-428, -420], [-390, -548]],
  },
];

function distToPolyline(x, z, points) {
  let min = Infinity;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const vx = b[0] - a[0];
    const vz = b[1] - a[1];
    const len2 = vx * vx + vz * vz || 1;
    const t = Math.max(0, Math.min(1, ((x - a[0]) * vx + (z - a[1]) * vz) / len2));
    const dx = x - a[0] - vx * t;
    const dz = z - a[1] - vz * t;
    min = Math.min(min, Math.hypot(dx, dz));
  }
  return min;
}

function nearStream(x, z, margin) {
  for (const stream of STREAMS) {
    if (distToPolyline(x, z, stream.points) < margin) return true;
  }
  return false;
}

function baseHeight(x, z) {
  let h = 4.2;
  h += 1.7 * Math.sin(x * 0.013 + 0.7) * Math.sin(z * 0.011 - 0.4);
  h += 1.15 * Math.sin(x * 0.041 + z * 0.037);
  h += smoothstep(-180, 600, z) * 15;
  const massif = smoothstep(260, 980, z);
  h += massif * (19 * Math.sin(x * 0.018 + z * 0.011) + 7.5 * Math.sin(x * 0.061 - z * 0.032));
  h += massif * 5.5 * Math.sin(x * 0.011 + 1.3) * Math.sin(z * 0.008 + 0.6);
  h += smoothstep(420, 980, Math.abs(x)) * 9 * Math.sin(x * 0.02 + z * 0.01);

  const dv = Math.hypot((x + 330) / 1.05, (z + 150) / 0.82);
  const terrace = 15 + 0.5 * Math.sin(x * 0.05) + 0.3 * Math.cos(z * 0.06);
  h = lerp(h, terrace, smoothstep(150, 42, dv));
  return Math.max(0, h);
}

export function heightAt(x, z) {
  let h = baseHeight(x, z);
  for (const p of PEAKS) {
    const dx = (x - p.x) / p.rx;
    const dz = (z - p.z) / p.rz;
    const r = Math.sqrt(dx * dx + dz * dz);
    if (r >= 1) continue;
    const t = 1 - r;
    const a = Math.atan2(dz, dx);
    const ridge =
      1 +
      p.ridge * Math.cos(a * p.faces + p.phase) * smoothstep(0.03, 0.62, t) +
      0.035 * Math.sin(a * 11 - p.phase);
    let ph = p.h * Math.pow(t, p.e) * ridge;
    ph += p.h * 0.02 * Math.sin(x * 0.085 + z * 0.072) * t * t;
    ph += p.h * 0.01 * Math.sin(x * 0.17 - z * 0.12) * t * t * t;
    h += ph;
  }
  return Math.max(0, h);
}

/* ------------------------------------------------------------------ */
/* textures & materials                                                */
/* ------------------------------------------------------------------ */

function makeDetailTexture() {
  const tex = canvasTexture(512, 512, (g, w, h) => {
    g.fillStyle = '#f4f4ef';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) {
      const v = rand(3, i);
      g.fillStyle = v > 0.55 ? 'rgba(255,255,255,0.22)' : 'rgba(86,92,88,0.12)';
      const r = 0.5 + rand(7, i) * 2.6;
      g.beginPath();
      g.arc(rand(11, i) * w, rand(13, i) * h, r, 0, 6.283);
      g.fill();
    }
    for (let i = 0; i < 220; i++) {
      g.strokeStyle = 'rgba(92,100,98,0.1)';
      g.lineWidth = 1 + rand(17, i) * 2.4;
      g.beginPath();
      const y = rand(19, i) * h;
      g.moveTo(0, y);
      g.bezierCurveTo(w * 0.3, y + (rand(23, i) - 0.5) * 40, w * 0.7, y + (rand(29, i) - 0.5) * 46, w, y + (rand(31, i) - 0.5) * 34);
      g.stroke();
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(72, 72);
  return tex;
}

function makeCloudPuffTexture() {
  return canvasTexture(256, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    for (let i = 0; i < 34; i++) {
      const x = w * (0.12 + rand(41, i) * 0.76);
      const y = h * (0.36 + rand(43, i) * 0.3);
      const r = 12 + rand(47, i) * 34;
      const grad = g.createRadialGradient(x, y, 1, x, y, r);
      grad.addColorStop(0, 'rgba(255,255,255,0.68)');
      grad.addColorStop(0.42, 'rgba(250,252,252,0.33)');
      grad.addColorStop(1, 'rgba(246,250,250,0)');
      g.fillStyle = grad;
      g.beginPath();
      g.arc(x, y, r, 0, 6.283);
      g.fill();
    }
  });
}

function makeSignTexture(title, sub, dark = false) {
  return canvasTexture(512, 172, (g, w, h) => {
    g.fillStyle = dark ? '#1b2526' : '#5c432b';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(228,193,124,0.78)';
    g.lineWidth = 4;
    g.strokeRect(10, 10, w - 20, h - 20);
    for (let i = 0; i < 220; i++) {
      g.fillStyle = rand(83, i) > 0.5 ? 'rgba(255,231,181,0.05)' : 'rgba(24,14,8,0.1)';
      g.fillRect(rand(89, i) * w, rand(97, i) * h, 2 + rand(101, i) * 54, 1);
    }
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#f6e9c8';
    g.font = '600 66px "Noto Serif CJK SC", "Songti SC", serif';
    g.fillText(title, w / 2, 78);
    g.fillStyle = 'rgba(235,211,158,0.78)';
    g.font = '500 20px "Helvetica Neue", Arial, sans-serif';
    g.fillText(sub, w / 2, 130);
  });
}

function makeMaterials() {
  const detail = makeDetailTexture();
  return {
    terrain: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96, metalness: 0.0, map: detail }),
    rock: new THREE.MeshStandardMaterial({ color: 0x736e65, roughness: 0.99, flatShading: true }),
    rockDark: new THREE.MeshStandardMaterial({ color: 0x49463f, roughness: 1.0, flatShading: true }),
    snow: new THREE.MeshStandardMaterial({ color: 0xf5f8f7, roughness: 0.62, metalness: 0.01 }),
    snowBlue: new THREE.MeshStandardMaterial({ color: 0xd3e2ea, roughness: 0.56 }),
    moraine: new THREE.MeshStandardMaterial({ color: 0x6b655b, roughness: 1.0, flatShading: true }),
    moraineDark: new THREE.MeshStandardMaterial({ color: 0x45413b, roughness: 1.0, flatShading: true }),
    ice: new THREE.MeshStandardMaterial({ color: 0x9ddfe6, roughness: 0.18, metalness: 0.08, emissive: 0x1b6171, emissiveIntensity: 0.28 }),
    icePale: new THREE.MeshStandardMaterial({ color: 0xd2f0f2, roughness: 0.16, metalness: 0.06, emissive: 0x1d6674, emissiveIntensity: 0.2 }),
    crevasse: new THREE.MeshStandardMaterial({ color: 0x155a70, roughness: 0.42, emissive: 0x0a3341, emissiveIntensity: 0.32 }),
    gravel: new THREE.MeshStandardMaterial({ color: 0x8c8c7f, roughness: 1.0, flatShading: true }),
    wood: new THREE.MeshStandardMaterial({ color: 0x6f4f33, roughness: 0.92 }),
    woodDark: new THREE.MeshStandardMaterial({ color: 0x44301f, roughness: 0.96 }),
    whitewash: new THREE.MeshStandardMaterial({ color: 0xe9e4d7, roughness: 0.94 }),
    roof: new THREE.MeshStandardMaterial({ color: 0x3d3b34, roughness: 0.88 }),
    stone: new THREE.MeshStandardMaterial({ color: 0x8d8779, roughness: 0.98, flatShading: true }),
    window: new THREE.MeshStandardMaterial({ color: 0x1b252a, roughness: 0.62, emissive: 0xff9f4e, emissiveIntensity: 0.22 }),
    door: new THREE.MeshStandardMaterial({ color: 0x4a3322, roughness: 0.9 }),
    rope: new THREE.MeshStandardMaterial({ color: 0x5b5649, roughness: 0.94 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x7b8384, roughness: 0.46, metalness: 0.58 }),
    grass: new THREE.MeshStandardMaterial({ color: 0x728c46, roughness: 0.94, flatShading: true }),
    field: new THREE.MeshStandardMaterial({ color: 0x6f8b3f, roughness: 0.98 }),
    fieldGold: new THREE.MeshStandardMaterial({ color: 0x9a9a51, roughness: 0.98 }),
    trunk: new THREE.MeshStandardMaterial({ color: 0x4a3423, roughness: 0.98 }),
    needle: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.94, flatShading: true }),
    larch: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.93, flatShading: true }),
    path: new THREE.MeshStandardMaterial({ color: 0xa89a7d, roughness: 0.99 }),
  };
}

/* ------------------------------------------------------------------ */
/* terrain                                                             */
/* ------------------------------------------------------------------ */

function makeTerrain(mats) {
  const geo = new THREE.PlaneGeometry(3800, 3600, 500, 420);
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, 0, 650);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setY(i, heightAt(pos.getX(i), pos.getZ(i)));
  }
  geo.computeVertexNormals();
  const normal = geo.attributes.normal;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  const snow = new THREE.Color(0xf3f7f7);
  const snowBlue = new THREE.Color(0xc3d9e6);
  const snowWarm = new THREE.Color(0xffe4bd);
  const rock = new THREE.Color(0x6d675e);
  const rockWarm = new THREE.Color(0x8c7b67);
  const rockDark = new THREE.Color(0x49453f);
  const forest = new THREE.Color(0x3e5839);
  const forestDark = new THREE.Color(0x2c4431);
  const meadow = new THREE.Color(0x7c974d);
  const meadowGold = new THREE.Color(0xa5a45a);
  const scree = new THREE.Color(0x8a867a);
  const gravel = new THREE.Color(0x99998b);

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const h = pos.getY(i);
    const up = normal.getY(i);
    const patch = 0.5 + 0.5 * Math.sin(x * 0.055 + z * 0.047);
    const strata = 0.5 + 0.5 * Math.sin(h * 0.095 + x * 0.014 + z * 0.01);
    const snowLine = 365 + 34 * Math.sin(x * 0.0058 + 1.1) + 21 * Math.sin(z * 0.008) + 16 * Math.sin(x * 0.021 - z * 0.011);
    const jag = 23 * Math.sin(x * 0.034 + z * 0.021) + 10 * Math.sin(x * 0.092 - z * 0.049);
    if (h > snowLine + jag) {
      c.copy(snow).lerp(snowBlue, patch * 0.34 + (1 - Math.min(1, up)) * 0.35);
      c.lerp(snowWarm, smoothstep(480, 980, h) * 0.28);
      if (up < 0.4) c.lerp(rockDark, smoothstep(0.4, 0.16, up) * 0.78);
      if (patch > 0.74 && h < snowLine + 110) c.lerp(snowBlue, 0.35);
    } else if (h > snowLine - 78 + jag * 0.6) {
      c.copy(rockWarm).lerp(rockDark, strata * 0.48).lerp(snow, patch * 0.62 * smoothstep(0.18, 0.55, up));
      if (up < 0.35) c.lerp(rockDark, 0.4);
    } else if (h > 155) {
      c.copy(rock).lerp(rockWarm, strata * 0.5).lerp(rockDark, patch * 0.3);
      if (up < 0.36) c.lerp(rockDark, 0.5);
      if (h < 245 && patch > 0.62) c.lerp(forestDark, 0.3);
      if (h < 205 && patch > 0.8) c.lerp(forest, 0.25);
    } else if (h > 35) {
      c.copy(scree).lerp(forest, 0.36 + patch * 0.32).lerp(rock, strata * 0.28);
      if (patch > 0.7) c.lerp(forestDark, 0.45);
      if (up < 0.4) c.lerp(rock, 0.46);
    } else {
      c.copy(meadow).lerp(meadowGold, patch * 0.34).lerp(forest, smoothstep(-60, 120, z) * 0.28);
      if (nearStream(x, z, 14)) c.lerp(gravel, 0.58);
      if (up < 0.56) c.lerp(rock, 0.22);
    }
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mesh = new THREE.Mesh(geo, mats.terrain);
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  mesh.name = 'meili-terrain';
  return mesh;
}

/* ------------------------------------------------------------------ */
/* ridge blades — sharp fins that break the terrain silhouette         */
/* ------------------------------------------------------------------ */

function createRidgeBlades(mats) {
  const blades = [
    [-60, 790, 980, 130, 42],
    [55, 835, 1005, 150, 48],
    [-150, 745, 760, 96, 34],
    [170, 760, 790, 105, 36],
    [-335, 860, 780, 110, 38],
    [365, 885, 735, 100, 35],
    [-470, 900, 690, 96, 33],
    [500, 935, 670, 92, 32],
    [-680, 1010, 600, 90, 30],
    [705, 1040, 610, 95, 32],
    [-900, 1080, 555, 82, 28],
    [930, 1110, 545, 80, 27],
    [-1160, 1160, 495, 75, 26],
    [1180, 1185, 505, 78, 27],
    [-245, 995, 640, 80, 27],
    [250, 1020, 655, 84, 28],
  ];
  const rockList = [];
  const snowList = [];
  for (let i = 0; i < blades.length; i++) {
    const [x, z, top, h, w] = blades[i];
    const base = Math.max(heightAt(x, z) - h * 0.34, top - h);
    const rot = rand(201, i) * 6.283;
    const rock = new THREE.ConeGeometry(1, 1, 4, 1);
    rock.rotateY(rot);
    rock.scale(w, h, w * (0.7 + rand(203, i) * 0.5));
    rock.translate(x, base + h * 0.5, z);
    rockList.push(rock);
    const cap = new THREE.ConeGeometry(1, 1, 4, 1);
    cap.rotateY(rot);
    cap.scale(w * 0.42, h * 0.34, w * 0.4);
    cap.translate(x, base + h * 0.82, z);
    snowList.push(cap);
  }
  const group = new THREE.Group();
  const rockMesh = mergedMesh(rockList, mats.rockDark, true, true);
  const snowMesh = mergedMesh(snowList, mats.snow, true, true);
  if (rockMesh) group.add(rockMesh);
  if (snowMesh) group.add(snowMesh);
  return group;
}

/* ------------------------------------------------------------------ */
/* ribbon helpers                                                      */
/* ------------------------------------------------------------------ */

function ribbonGeometry(points, width, yOffset, drape, cross = 6) {
  const curve = new THREE.CatmullRomCurve3(
    points.map(([x, z]) => new THREE.Vector3(x, 0, z)),
    false,
    'catmullrom',
    0.34
  );
  const steps = Math.max(24, Math.min(150, Math.round(curve.getLength() / 11)));
  const pts = curve.getSpacedPoints(steps);
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let i = 0; i <= steps; i++) {
    const p = pts[i];
    const pNext = pts[Math.min(steps, i + 1)];
    const pPrev = pts[Math.max(0, i - 1)];
    const dx = pNext.x - pPrev.x;
    const dz = pNext.z - pPrev.z;
    const len = Math.hypot(dx, dz) || 1;
    const nx = -dz / len;
    const nz = dx / len;
    const t = i / steps;
    const w = width * (0.82 + 0.24 * Math.sin(t * 8.2 + 0.7) + 0.08 * Math.sin(t * 19.0));
    const hs = [];
    for (let j = 0; j <= cross; j++) {
      const f = j / cross;
      const off = (f - 0.5) * w;
      hs.push(heightAt(p.x + nx * off, p.z + nz * off));
    }
    for (let j = 0; j <= cross; j++) {
      const f = j / cross;
      const off = (f - 0.5) * w;
      const x = p.x + nx * off;
      const z = p.z + nz * off;
      const y = drape ? hs[j] + yOffset : Math.max(...hs) + yOffset;
      positions.push(x, y, z);
      uvs.push(f, t);
    }
  }
  for (let i = 0; i < steps; i++) {
    for (let j = 0; j < cross; j++) {
      const a = i * (cross + 1) + j;
      const b = a + cross + 1;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function mergedRibbons(paths, mat, cast, receive, widthScale = 1, yOffset = 0.35, drape = false) {
  const list = [];
  for (const stream of paths) {
    list.push(ribbonGeometry(stream.points, stream.width * widthScale, yOffset, drape));
  }
  return mergedMesh(list, mat, cast, receive);
}

/* ------------------------------------------------------------------ */
/* Mingyong glacier                                                    */
/* ------------------------------------------------------------------ */

function makeGlacier(mats) {
  const group = new THREE.Group();
  const spine = [
    [112, 806, 34], [158, 760, 42], [204, 712, 50], [244, 662, 58],
    [278, 610, 66], [304, 556, 72], [320, 502, 76], [330, 454, 78],
    [334, 412, 76], [334, 376, 70],
  ];
  const points = spine.map(([x, z]) => [x, z]);
  const glacierGeo = ribbonGeometry(points, 76, 2.8, true, 7);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uSun: { value: new THREE.Color(0xffe0b0) },
      uSunDir: { value: new THREE.Vector3(0.7, 0.5, 0.3).normalize() },
      uDeep: { value: new THREE.Color(0x2e7f95) },
      uPale: { value: new THREE.Color(0xe6f7f6) },
      uCrev: { value: new THREE.Color(0x0d4d67) },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vWorld;
      varying vec3 vNormalW;
      void main() {
        vUv = uv;
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xyz;
        vNormalW = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uSun;
      uniform vec3 uSunDir;
      uniform vec3 uDeep;
      uniform vec3 uPale;
      uniform vec3 uCrev;
      varying vec2 vUv;
      varying vec3 vWorld;
      varying vec3 vNormalW;
      void main() {
        float edge = smoothstep(0.0, 0.2, vUv.x) * smoothstep(1.0, 0.8, vUv.x);
        vec3 col = mix(uDeep, uPale, smoothstep(0.12, 0.85, vUv.x));
        float flow = sin(vUv.y * 58.0 + sin(vUv.x * 9.0 + vUv.y * 7.0) * 2.4 - uTime * 0.55);
        float fine = sin(vUv.y * 151.0 + vUv.x * 13.0 - uTime * 1.15);
        float crev = smoothstep(0.74, 0.99, flow * 0.7 + fine * 0.3);
        float band = smoothstep(0.45, 0.9, sin(vUv.y * 17.0 + vUv.x * 5.0 + uTime * 0.08));
        col = mix(col, uCrev, crev * (0.22 + band * 0.28) * edge);
        col = mix(col, vec3(0.96, 1.0, 1.0), (1.0 - abs(vUv.x - 0.5) * 2.0) * 0.22);
        float diff = clamp(dot(normalize(vNormalW), normalize(uSunDir)), 0.0, 1.0);
        col *= 0.66 + diff * 0.52;
        col += uSun * pow(diff, 2.2) * 0.16;
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const glacier = new THREE.Mesh(glacierGeo, material);
  glacier.receiveShadow = true;
  group.add(glacier);

  const snowEdges = [];
  const rows = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    const f = t * (spine.length - 1);
    const i0 = Math.min(spine.length - 2, Math.floor(f));
    const k = f - i0;
    const a = spine[i0];
    const b = spine[i0 + 1];
    const cx = a[0] + (b[0] - a[0]) * k;
    const cz = a[1] + (b[1] - a[1]) * k;
    const width = a[2] + (b[2] - a[2]) * k;
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const len = Math.hypot(dx, dz) || 1;
    rows.push({ x: cx, z: cz, nx: -dz / len, nz: dx / len, w: width * 1.42, y: heightAt(cx, cz) });
  }
  for (const side of [-1, 1]) {
    for (let i = 0; i < rows.length - 1; i++) {
      const a = rows[i];
      const b = rows[i + 1];
      const ax = a.x + a.nx * a.w * side;
      const az = a.z + a.nz * a.w * side;
      const bx = b.x + b.nx * b.w * side;
      const bz = b.z + b.nz * b.w * side;
      const len = Math.hypot(bx - ax, bz - az) + 2;
      const g = new THREE.BoxGeometry(5.4 + rand(301, i + side * 30) * 5, 1.6, len);
      g.rotateY(Math.atan2(bx - ax, bz - az));
      g.translate((ax + bx) / 2, (heightAt(ax, az) + heightAt(bx, bz)) / 2 + 1.4, (az + bz) / 2);
      snowEdges.push(g);
    }
  }
  const edgeMesh = mergedMesh(snowEdges, mats.snow, false, true);
  if (edgeMesh) group.add(edgeMesh);

  const crevs = [];
  for (let i = 0; i < 120; i++) {
    const row = rows[1 + Math.floor(rand(311, i) * (rows.length - 2))];
    const side = (rand(313, i) - 0.5) * row.w * 1.1;
    const x = row.x + row.nx * side;
    const z = row.z + row.nz * side;
    const length = 2.5 + rand(317, i) * 9;
    const g = new THREE.BoxGeometry(0.32 + rand(319, i) * 0.55, 0.16, length);
    g.rotateY(Math.atan2(row.nz, row.nx) + (rand(323, i) - 0.5) * 0.6);
    g.rotateZ((rand(331, i) - 0.5) * 0.16);
    g.translate(x, heightAt(x, z) + 3.2, z);
    crevs.push(g);
  }
  const crevMesh = mergedMesh(crevs, mats.crevasse, false, true);
  if (crevMesh) group.add(crevMesh);

  const seracs = [];
  for (let i = 0; i < 110; i++) {
    const row = rows[Math.floor(rand(337, i) * rows.length)];
    const side = (rand(341, i) - 0.5) * row.w * 1.5;
    const x = row.x + row.nx * side;
    const z = row.z + row.nz * side;
    const h = 3 + rand(347, i) * 13;
    const g = new THREE.ConeGeometry(1, 1, 5);
    g.rotateY(rand(349, i) * 6.28);
    g.scale(1.1 + rand(353, i) * 2.8, h, 1.1 + rand(359, i) * 2.8);
    g.translate(x, heightAt(x, z) + 2.4 + h * 0.5, z);
    seracs.push(g);
  }
  const seracMesh = mergedMesh(seracs, mats.icePale, true, true);
  if (seracMesh) group.add(seracMesh);

  const end = rows[rows.length - 1];
  const caveY = heightAt(end.x, end.z) + 4.5;
  const arch = new THREE.Mesh(
    new THREE.TorusGeometry(8.2, 2.1, 8, 18, Math.PI),
    mats.ice
  );
  arch.position.set(end.x, caveY, end.z);
  arch.rotation.y = Math.PI * 0.02;
  arch.castShadow = true;
  group.add(arch);
  const mouth = new THREE.Mesh(
    new THREE.CircleGeometry(7.2, 22, 0, Math.PI),
    new THREE.MeshBasicMaterial({ color: 0x0a3f55, transparent: true, opacity: 0.88, side: THREE.DoubleSide })
  );
  mouth.position.set(end.x, caveY - 0.2, end.z - 0.6);
  group.add(mouth);

  const moraine = [];
  for (let i = 0; i < 90; i++) {
    const row = rows[Math.floor(rand(367, i) * rows.length)];
    const side = (rand(373, i) > 0.5 ? 1 : -1) * row.w * (1.15 + rand(379, i) * 0.55);
    const x = row.x + row.nx * side;
    const z = row.z + row.nz * side;
    const s = 1 + rand(383, i) * 3.6;
    const g = new THREE.DodecahedronGeometry(1, 0);
    g.scale(s, s * 0.65, s * 1.1);
    g.rotateY(rand(389, i) * 6.28);
    g.translate(x, heightAt(x, z) + s * 0.2, z);
    moraine.push(g);
  }
  const moraineMesh = mergedMesh(moraine, mats.moraineDark, true, true);
  if (moraineMesh) group.add(moraineMesh);

  const pool = new THREE.Mesh(
    new THREE.CircleGeometry(14, 24),
    new THREE.MeshBasicMaterial({ color: 0x4fb7b0, transparent: true, opacity: 0.9 })
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(end.x + 2, heightAt(end.x + 2, end.z - 8) + 0.45, end.z - 10);
  group.add(pool);

  return { group, material, terminus: new THREE.Vector3(end.x + 2, caveY, end.z - 14) };
}

/* ------------------------------------------------------------------ */
/* melt streams & waterfalls                                           */
/* ------------------------------------------------------------------ */

function makeFall(x1, y1, z1, x2, y2, z2, width) {
  const dir = new THREE.Vector3(x2 - x1, y2 - y1, z2 - z1).normalize();
  const side = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
  const positions = [];
  const uvs = [];
  const steps = 14;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = x1 + (x2 - x1) * t;
    const y = y1 + (y2 - y1) * t - Math.sin(t * Math.PI) * 0.8;
    const z = z1 + (z2 - z1) * t;
    const w = width * (0.7 + t * 0.4);
    positions.push(x + side.x * w, y, z + side.z * w, x - side.x * w, y, z - side.z * w);
    uvs.push(0, t * 4, 1, t * 4);
  }
  const indices = [];
  for (let i = 0; i < steps; i++) {
    const a = i * 2;
    indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uSun: { value: new THREE.Color(0xfff2d2) },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uSun;
      varying vec2 vUv;
      void main() {
        float streak = sin(vUv.y * 34.0 - uTime * 8.0 + sin(vUv.x * 11.0) * 2.0) * 0.5 + 0.5;
        float fine = sin(vUv.y * 92.0 - uTime * 14.0 + vUv.x * 19.0) * 0.5 + 0.5;
        float edge = smoothstep(0.5, 0.94, abs(vUv.x * 2.0 - 1.0));
        float foam = smoothstep(0.6, 1.0, streak * 0.7 + fine * 0.3);
        vec3 col = mix(vec3(0.38, 0.78, 0.77), vec3(0.94, 1.0, 0.97), foam * 0.78);
        col = mix(col, vec3(0.95, 1.0, 0.98), edge * 0.6);
        col += uSun * foam * 0.14;
        gl_FragColor = vec4(col, 0.84);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, material);
  mesh.renderOrder = 2;
  const foam = new THREE.Mesh(
    new THREE.SphereGeometry(1, 10, 6),
    new THREE.MeshBasicMaterial({ color: 0xeafaf3, transparent: true, opacity: 0.62, depthWrite: false })
  );
  foam.scale.set(width * 0.75, 0.55, width * 0.32);
  foam.position.set(x2, y2 + 0.4, z2);
  foam.renderOrder = 3;
  return [mesh, foam];
}

function makeWater(mats) {
  const waterMaterial = makeWaterMaterial();
  waterMaterial.uniforms.uDeep.value.set(0x0b5b6d);
  waterMaterial.uniforms.uShallow.value.set(0x5fd2c8);
  waterMaterial.uniforms.uSky.value.set(0xdff4ef);
  waterMaterial.userData.day = { deep: 0x0b5b6d, shallow: 0x5fd2c8, sky: 0xdff4ef };
  waterMaterial.userData.dusk = { deep: 0x083f50, shallow: 0x349b93, sky: 0xd79d82 };

  const group = new THREE.Group();
  const bed = mergedRibbons(STREAMS, mats.gravel, false, true, 1.85, 0.08, false);
  if (bed) group.add(bed);
  const water = mergedRibbons(STREAMS, waterMaterial, false, false, 1, 0.38, false);
  water.renderOrder = 2;
  group.add(water);

  const fall = makeFall(334, heightAt(334, 520) + 8, 520, 334, heightAt(334, 505) + 1.5, 505, 9);
  fall.forEach((m) => group.add(m));

  const foamSpots = [];
  for (let i = 0; i < 26; i++) {
    const stream = STREAMS[i % 4];
    const t = rand(401, i);
    const idx = Math.floor(t * (stream.points.length - 1));
    const a = stream.points[idx];
    const b = stream.points[Math.min(stream.points.length - 1, idx + 1)];
    const k = rand(403, i);
    const x = a[0] + (b[0] - a[0]) * k;
    const z = a[1] + (b[1] - a[1]) * k;
    const g = new THREE.SphereGeometry(0.8 + rand(409, i) * 1.8, 8, 5);
    g.scale(1.6, 0.22, 0.9);
    g.translate(x, heightAt(x, z) + 0.44, z);
    foamSpots.push(g);
  }
  const foamMat = new THREE.MeshBasicMaterial({ color: 0xeafaf3, transparent: true, opacity: 0.45, depthWrite: false });
  const foam = mergedMesh(foamSpots, foamMat, false, false);
  if (foam) {
    foam.renderOrder = 3;
    group.add(foam);
  }

  return { group, waterMaterial, fallMaterials: [fall[0].material] };
}

/* ------------------------------------------------------------------ */
/* Yubeng village                                                      */
/* ------------------------------------------------------------------ */

function addLocalBox(list, w, h, d, lx, ly, lz, x, y, z, ry) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(lx, ly, lz);
  g.rotateY(ry);
  g.translate(x, y, z);
  list.push(g);
}

function createSign(title, sub, x, z, rot, dark = false, lift = 0) {
  const group = new THREE.Group();
  const y = heightAt(x, z) + 4.6 + lift;
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 4.0),
    new THREE.MeshStandardMaterial({ map: makeSignTexture(title, sub, dark), roughness: 0.8, side: THREE.DoubleSide })
  );
  sign.castShadow = true;
  group.add(sign);
  const posts = [];
  addCylinder(posts, 0.16, 0.18, 4.2, 7, -4.2, -2.1, 0);
  addCylinder(posts, 0.16, 0.18, 4.2, 7, 4.2, -2.1, 0);
  const postMesh = mergedMesh(posts, new THREE.MeshStandardMaterial({ color: 0x51412e, roughness: 0.94 }), true, false);
  if (postMesh) group.add(postMesh);
  group.position.set(x, y, z);
  group.rotation.y = rot;
  return group;
}

function makeVillage(mats) {
  const group = new THREE.Group();
  const walls = [];
  const roof = [];
  const timber = [];
  const windows = [];
  const doors = [];
  const stone = [];
  const path = [];
  const fields = [];
  const goldFields = [];
  const furrows = [];
  const houses = [
    [-430, -218, 7.0, 5.2, 4.2, 0.06],
    [-402, -211, 6.0, 5.6, 3.8, -0.08],
    [-372, -220, 7.4, 5.0, 4.6, 0.04],
    [-338, -214, 6.2, 5.2, 4.1, -0.06],
    [-306, -222, 6.8, 5.4, 4.4, 0.1],
    [-270, -214, 6.0, 5.0, 3.9, -0.05],
    [-436, -110, 6.4, 5.2, 4.0, 0.02],
    [-405, -102, 7.0, 5.4, 4.3, -0.03],
    [-374, -114, 6.0, 5.0, 3.7, 0.07],
    [-342, -104, 7.2, 5.6, 4.5, -0.06],
    [-309, -112, 6.2, 5.2, 4.0, 0.05],
    [-276, -104, 6.6, 5.4, 4.2, -0.04],
    [-392, -164, 5.5, 4.6, 3.5, Math.PI / 2],
    [-316, -168, 6.0, 5.0, 3.8, Math.PI / 2],
    [-455, -158, 5.0, 4.5, 3.4, 0.1],
    [-250, -162, 5.4, 4.6, 3.6, -0.1],
  ];
  for (let i = 0; i < houses.length; i++) {
    const [x, z, w, d, h, ry] = houses[i];
    const y = heightAt(x, z) - 0.3;
    addLocalBox(stone, w + 0.5, 0.7, d + 0.5, 0, 0.35, 0, x, y, z, ry);
    addLocalBox(walls, w, h, d, 0, 0.7 + h / 2, 0, x, y, z, ry);
    addLocalBox(timber, w + 0.16, 0.34, d + 0.16, 0, 0.7 + h - 0.18, 0, x, y, z, ry);
    addLocalBox(timber, w + 0.1, 0.2, d + 0.1, 0, 0.7 + h * 0.52, 0, x, y, z, ry);
    addLocalBox(roof, w + 1.1, 0.3, d + 1.1, 0, 0.7 + h + 0.15, 0, x, y, z, ry);
    addLocalBox(roof, w + 0.7, 0.5, 0.24, 0, 0.7 + h + 0.52, d / 2 + 0.43, x, y, z, ry);
    addLocalBox(roof, w + 0.7, 0.5, 0.24, 0, 0.7 + h + 0.52, -d / 2 - 0.43, x, y, z, ry);
    addLocalBox(roof, 0.24, 0.5, d + 0.7, w / 2 + 0.43, 0.7 + h + 0.52, 0, x, y, z, ry);
    addLocalBox(roof, 0.24, 0.5, d + 0.7, -w / 2 - 0.43, 0.7 + h + 0.52, 0, x, y, z, ry);
    const winY = 0.7 + h * 0.62;
    addLocalBox(windows, 0.95, 1.1, 0.11, -w * 0.25, winY, d / 2 + 0.06, x, y, z, ry);
    addLocalBox(windows, 0.95, 1.1, 0.11, w * 0.25, winY, d / 2 + 0.06, x, y, z, ry);
    addLocalBox(timber, 1.16, 0.15, 0.16, -w * 0.25, winY + 0.68, d / 2 + 0.09, x, y, z, ry);
    addLocalBox(timber, 1.16, 0.15, 0.16, w * 0.25, winY + 0.68, d / 2 + 0.09, x, y, z, ry);
    addLocalBox(doors, 1.05, 2.0, 0.13, 0, 1.7, d / 2 + 0.07, x, y, z, ry);
    addLocalBox(timber, 1.4, 0.18, 0.5, 0, 0.85, d / 2 + 0.22, x, y, z, ry);
    addLocalBox(timber, 0.22, 2.3, 0.22, -1.3, 1.4, d / 2 + 0.35, x, y, z, ry);
    addLocalBox(timber, 0.22, 2.3, 0.22, 1.3, 1.4, d / 2 + 0.35, x, y, z, ry);
    addLocalBox(timber, 2.9, 0.18, 0.3, 0, 2.5, d / 2 + 0.35, x, y, z, ry);
  }

  for (let i = 0; i < 14; i++) {
    const x = -454 + i * 15;
    addLocalBox(path, 8.5, 0.14, 3.6, 0, 0.07, 0, x, heightAt(x, -166), -166, 0.01);
  }
  for (let i = 0; i < 6; i++) {
    const x = -462 + i * 18;
    addLocalBox(path, 4.2, 0.14, 9.0, 0, 0.07, 0, x, heightAt(x, -136), -136, 0.02);
  }

  const fieldSpecs = [
    [-458, -278, 42, 34, 0.03, false],
    [-400, -292, 36, 26, -0.02, true],
    [-330, -286, 44, 32, 0.04, false],
    [-262, -278, 34, 26, -0.03, true],
    [-232, -212, 26, 34, 0.02, false],
    [-252, -70, 34, 28, 0.02, true],
  ];
  for (let i = 0; i < fieldSpecs.length; i++) {
    const [x, z, w, d, ry, gold] = fieldSpecs[i];
    const y = heightAt(x, z) + 0.05;
    const list = gold ? goldFields : fields;
    addLocalBox(list, w, 0.18, d, 0, 0.09, 0, x, y, z, ry + Math.PI / 2);
    for (let k = -3; k <= 3; k++) {
      addLocalBox(furrows, 1.2, 0.05, d * 0.82, k * (w / 8), 0.2, 0, x, y, z, ry + Math.PI / 2);
    }
    const sx = x;
    const sz = z;
    addLocalBox(stone, w + 0.8, 0.65, 0.42, 0, 0.33, d / 2 + 0.2, sx, heightAt(sx, sz) - 0.2, sz, ry + Math.PI / 2);
    addLocalBox(stone, w + 0.8, 0.65, 0.42, 0, 0.33, -d / 2 - 0.2, sx, heightAt(sx, sz) - 0.2, sz, ry + Math.PI / 2);
  }

  const stupaX = -238;
  const stupaZ = -238;
  const stupaY = heightAt(stupaX, stupaZ) - 0.2;
  addBox(stone, 7.2, 1.4, 7.2, stupaX, stupaY + 0.7, stupaZ);
  addBox(walls, 5.6, 1.5, 5.6, stupaX, stupaY + 2.1, stupaZ);
  addBox(walls, 4.2, 1.1, 4.2, stupaX, stupaY + 3.4, stupaZ);
  const dome = new THREE.SphereGeometry(2.3, 16, 12);
  dome.translate(stupaX, stupaY + 5.3, stupaZ);
  walls.push(dome);
  const spire = new THREE.ConeGeometry(0.75, 3.4, 10);
  spire.translate(stupaX, stupaY + 8.6, stupaZ);
  const goldList = [spire];
  const gold = new THREE.MeshStandardMaterial({ color: 0xb08a4c, roughness: 0.34, metalness: 0.72 });
  const stupaGold = mergedMesh(goldList, gold, true, false);
  if (stupaGold) group.add(stupaGold);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.3;
    const bx = stupaX + Math.cos(a) * 7.5;
    const bz = stupaZ + Math.sin(a) * 7.5;
    addCylinder(stone, 0.28, 0.36, 2.2, 6, bx, heightAt(bx, bz) + 1.0, bz);
  }

  addBox(stone, 22, 0.12, 4.2, -378, heightAt(-378, -144) + 0.38, -144, 0.02);
  for (let i = 0; i < 7; i++) {
    const px = -394 + i * 5.2;
    addCylinder(timber, 0.14, 0.16, 1.25, 6, px, heightAt(px, -149) + 0.9, -149);
    addCylinder(timber, 0.14, 0.16, 1.25, 6, px, heightAt(px, -139) + 0.9, -139);
  }
  addRodList(timber, -394, heightAt(-394, -149) + 1.5, -149, -357, heightAt(-357, -149) + 1.5, -149, 0.06);
  addRodList(timber, -394, heightAt(-394, -139) + 1.5, -139, -357, heightAt(-357, -139) + 1.5, -139, 0.06);

  const wallMesh = mergedMesh(walls, mats.whitewash, true, true);
  const roofMesh = mergedMesh(roof, mats.roof, true, true);
  const timberMesh = mergedMesh(timber, mats.woodDark, true, true);
  const winMesh = mergedMesh(windows, mats.window, false, false);
  const doorMesh = mergedMesh(doors, mats.door, true, false);
  const stoneMesh = mergedMesh(stone, mats.stone, true, true);
  const pathMesh = mergedMesh(path, mats.path, false, true);
  const fieldMesh = mergedMesh(fields, mats.field, false, true);
  const goldFieldMesh = mergedMesh(goldFields, mats.fieldGold, false, true);
  const furrowMesh = mergedMesh(furrows, mats.wood, false, true);
  [wallMesh, roofMesh, timberMesh, winMesh, doorMesh, stoneMesh, pathMesh, fieldMesh, goldFieldMesh, furrowMesh].forEach((mesh) => {
    if (mesh) group.add(mesh);
  });

  group.add(createSign('雨崩村', 'YUBENG VILLAGE · 3100 M', -468, -198, Math.PI + 0.12, false, 0.8));
  group.add(createSign('明永冰川', 'MINGYONG GLACIER · 2750 M', 410, 392, Math.PI - 0.34, true, 1.0));
  return { group, windowMaterial: mats.window };
}

function addRodList(list, ax, ay, az, bx, by, bz, r = 0.05, seg = 5) {
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

/* ------------------------------------------------------------------ */
/* Tibetan prayer flags                                                */
/* ------------------------------------------------------------------ */

function createPrayerFlags(mats) {
  const palette = [
    new THREE.Color(0x2e6fa8),
    new THREE.Color(0xeee4bd),
    new THREE.Color(0xc64a34),
    new THREE.Color(0x4d925c),
    new THREE.Color(0xe3b83f),
  ];
  const lines = [
    { a: [-452, -246], b: [-244, -250], sag: 1.8, count: 22 },
    { a: [-448, -184], b: [-238, -174], sag: 1.6, count: 22 },
    { a: [-454, -74], b: [-246, -84], sag: 1.5, count: 22 },
    { a: [-414, -264], b: [-408, -50], sag: 1.7, count: 22 },
    { a: [-148, -330], b: [36, -308], sag: 1.6, count: 22 },
    { a: [-118, -418], b: [70, -396], sag: 1.7, count: 24 },
    { a: [212, 132], b: [402, 118], sag: 1.4, count: 20 },
    { a: [190, 52], b: [388, 34], sag: 1.35, count: 20 },
    { a: [396, 452], b: [470, 330], sag: 1.1, count: 16 },
  ];
  const poleList = [];
  const ropeList = [];
  const instances = [];
  const flagColors = [];

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    const [ax, az] = line.a;
    const [bx, bz] = line.b;
    const ha = heightAt(ax, az);
    const hb = heightAt(bx, bz);
    const y = Math.max(ha, hb) + 8.6;
    addCylinder(poleList, 0.11, 0.17, y - ha + 0.8, 7, ax, ha + (y - ha + 0.8) / 2, az);
    addCylinder(poleList, 0.11, 0.17, y - hb + 0.8, 7, bx, hb + (y - hb + 0.8) / 2, bz);
    const len = Math.hypot(bx - ax, bz - az) || 1;
    const dirX = (bx - ax) / len;
    const dirZ = (bz - az) / len;
    const yaw = Math.atan2(-dirZ, dirX);
    const ropePts = [];
    for (let s = 0; s <= 12; s++) {
      const k = s / 12;
      ropePts.push([ax + (bx - ax) * k, y - line.sag * 4 * k * (1 - k), az + (bz - az) * k]);
    }
    for (let s = 0; s < ropePts.length - 1; s++) {
      const p0 = ropePts[s];
      const p1 = ropePts[s + 1];
      addRodList(ropeList, p0[0], p0[1], p0[2], p1[0], p1[1], p1[2], 0.035, 4);
    }
    for (let i = 0; i < line.count; i++) {
      const tm = i / line.count + 1 / line.count * 0.5;
      const x = ax + (bx - ax) * tm;
      const z = az + (bz - az) * tm;
      const yTop = y - line.sag * 4 * tm * (1 - tm) - 0.06;
      instances.push({
        x, y: yTop, z, yaw,
        sx: 0.92 + rand(901 + li, i) * 0.26,
        sy: 0.94 + rand(903 + li, i) * 0.18,
        color: palette[(i + li) % palette.length],
      });
    }
  }

  const flagGeo = new THREE.PlaneGeometry(1.46, 1.02, 4, 3);
  flagGeo.translate(0, -0.51, 0);
  const windTime = { value: 0 };
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.88,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uFlagTime = windTime;
    shader.vertexShader = 'uniform float uFlagTime;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      #ifdef USE_INSTANCING
        vec3 iw = instanceMatrix[3].xyz;
        float ph = iw.x * 0.17 + iw.z * 0.11;
        float loose = clamp(-position.y, 0.0, 1.0);
        float wave = sin(uFlagTime * 2.7 + ph + position.x * 1.7 + position.y * 1.2);
        transformed.z += loose * (wave * 0.46 + 0.17);
        transformed.x += loose * sin(uFlagTime * 1.6 + ph * 1.9) * 0.1;
        transformed.y += loose * sin(uFlagTime * 2.1 + ph) * 0.06;
      #endif`
    );
  };
  material.customProgramCacheKey = () => 'meili-prayer-flags';

  const mesh = new THREE.InstancedMesh(flagGeo, material, instances.length);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  const e = new THREE.Euler();
  for (let i = 0; i < instances.length; i++) {
    const f = instances[i];
    p.set(f.x, f.y, f.z);
    e.set(0, f.yaw, 0);
    q.setFromEuler(e);
    s.set(f.sx, f.sy, 1);
    m.compose(p, q, s);
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, f.color);
    flagColors.push(f.color);
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = true;
  mesh.frustumCulled = false;
  mesh.name = 'meili-prayer-flags';

  const group = new THREE.Group();
  const poleMesh = mergedMesh(poleList, mats.woodDark, true, false);
  const ropeMesh = mergedMesh(ropeList, mats.rope, false, false);
  if (poleMesh) group.add(poleMesh);
  if (ropeMesh) group.add(ropeMesh);
  group.add(mesh);
  return { group, material, flagCount: instances.length, update: (t) => { windTime.value = t; } };
}

/* ------------------------------------------------------------------ */
/* forest, rocks, clouds                                               */
/* ------------------------------------------------------------------ */

function makeSpruceGeometry(mats) {
  const needles = [];
  for (let i = 0; i < 6; i++) {
    const f = i / 5;
    const r = 2.5 * (1 - f * 0.72);
    const cone = new THREE.ConeGeometry(r, 4.1 - f * 1.0, 7);
    cone.rotateY(rand(501, i) * 6.283);
    cone.translate((rand(503, i) - 0.5) * 0.3, 4.0 + i * 1.52, (rand(507, i) - 0.5) * 0.3);
    needles.push(cone);
  }
  const foliage = mergedMesh(needles, mats.needle, false, false).geometry;
  const trunkList = [new THREE.CylinderGeometry(0.14, 0.31, 4.8, 6).translate(0, 2.4, 0)];
  const trunk = mergedMesh(trunkList, mats.trunk, false, false).geometry;
  return { foliage, trunk };
}

function makeLarchGeometry(mats) {
  const lobes = [];
  for (let i = 0; i < 4; i++) {
    const f = i / 3;
    const r = 2.1 * (1 - f * 0.52);
    const cone = new THREE.ConeGeometry(r, 3.6 - f * 0.7, 6);
    cone.rotateY(rand(521, i) * 6.283);
    cone.translate((rand(523, i) - 0.5) * 0.45, 3.3 + i * 1.28, (rand(527, i) - 0.5) * 0.45);
    lobes.push(cone);
  }
  const foliage = mergedMesh(lobes, mats.larch, false, false).geometry;
  const trunkList = [new THREE.CylinderGeometry(0.11, 0.24, 4.1, 6).translate(0, 2.05, 0)];
  const trunk = mergedMesh(trunkList, mats.trunk, false, false).geometry;
  return { foliage, trunk };
}

function windMaterial(mats, cacheKey, amp) {
  const sway = { value: 0 };
  const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.94, flatShading: true });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uSwayTime = sway;
    shader.vertexShader = 'uniform float uSwayTime;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      #ifdef USE_INSTANCING
        vec3 iw = instanceMatrix[3].xyz;
        float sw = sin(uSwayTime * 0.9 + iw.x * 0.055 + iw.z * 0.045);
        transformed.x += sw * max(transformed.y, 0.0) * ${amp.toFixed(4)};
        transformed.z += cos(uSwayTime * 0.67 + iw.x * 0.035) * max(transformed.y, 0.0) * ${(amp * 0.62).toFixed(4)};
      #endif`
    );
  };
  material.customProgramCacheKey = () => cacheKey;
  return { material, sway };
}

function createForest(mats) {
  const spruce = makeSpruceGeometry(mats);
  const larch = makeLarchGeometry(mats);
  const spruceWind = windMaterial(mats, 'meili-spruce-sway', 0.009);
  const larchWind = windMaterial(mats, 'meili-larch-sway', 0.0075);
  const clusters = [
    [-390, -130, 230, 230], [270, -340, 280, 230], [-650, -440, 280, 180], [540, -540, 310, 180],
    [-760, 60, 250, 140], [740, -100, 250, 140], [-430, 260, 210, 105], [450, 250, 180, 95],
    [-930, -150, 235, 110], [900, -180, 235, 110], [-190, -650, 320, 150], [280, -780, 330, 150],
    [-540, -800, 320, 140], [620, -840, 320, 145], [-1000, 240, 250, 85], [980, 210, 250, 85],
  ];
  const positions = [];
  for (let ci = 0; ci < clusters.length; ci++) {
    const [cx, cz, radius, count] = clusters[ci];
    for (let i = 0; i < count; i++) {
      const a = rand(601 + ci, i) * 6.283;
      const d = Math.sqrt(rand(603 + ci, i)) * radius;
      const x = cx + Math.cos(a) * d;
      const z = cz + Math.sin(a) * d;
      if (x > -480 && x < -196 && z > -306 && z < -40) continue;
      if (z > 300 && x > 70 && x < 430) continue;
      if (nearStream(x, z, 9)) continue;
      const h = heightAt(x, z);
      if (h > 340 || h < 1) continue;
      positions.push({ x, z, h, seed: ci * 1000 + i });
    }
  }
  const count = Math.min(positions.length, 1040);
  const geometry = new THREE.InstancedMesh(spruce.foliage, spruceWind.material, count);
  const trunks = new THREE.InstancedMesh(spruce.trunk, mats.trunk, count);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  const e = new THREE.Euler();
  const color = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const t = positions[i];
    const scale = 0.62 + rand(617, t.seed) * 0.86 + smoothstep(150, 320, t.h) * 0.08;
    p.set(t.x, t.h - 0.4, t.z);
    e.set(0, rand(619, t.seed) * 6.283, (rand(623, t.seed) - 0.5) * 0.055);
    q.setFromEuler(e);
    s.set(scale * (0.86 + rand(627, t.seed) * 0.3), scale, scale * (0.86 + rand(629, t.seed) * 0.3));
    m.compose(p, q, s);
    geometry.setMatrixAt(i, m);
    trunks.setMatrixAt(i, m);
    color.setHSL(0.29 + rand(631, t.seed) * 0.045, 0.26 + rand(633, t.seed) * 0.18, 0.15 + rand(637, t.seed) * 0.09);
    geometry.setColorAt(i, color);
  }
  geometry.castShadow = false;
  geometry.receiveShadow = true;
  trunks.castShadow = false;
  geometry.name = 'meili-spruce';
  trunks.name = 'meili-spruce-trunk';

  const larchPositions = [];
  for (let i = 0; i < 900 && larchPositions.length < 200; i++) {
    const x = -620 + rand(641, i) * 1240;
    const z = -760 + rand(643, i) * 700;
    if (x > -480 && x < -196 && z > -306 && z < -40) continue;
    if (nearStream(x, z, 8)) continue;
    const h = heightAt(x, z);
    if (h > 190 || h < 2) continue;
    larchPositions.push({ x, z, h, seed: 9000 + i });
  }
  const larchCount = larchPositions.length;
  const larchMesh = new THREE.InstancedMesh(larch.foliage, larchWind.material, larchCount);
  const larchTrunks = new THREE.InstancedMesh(larch.trunk, mats.trunk, larchCount);
  for (let i = 0; i < larchCount; i++) {
    const t = larchPositions[i];
    const scale = 0.7 + rand(647, t.seed) * 0.7;
    p.set(t.x, t.h - 0.35, t.z);
    e.set(0, rand(649, t.seed) * 6.283, (rand(653, t.seed) - 0.5) * 0.06);
    q.setFromEuler(e);
    s.set(scale * (0.9 + rand(659, t.seed) * 0.25), scale, scale * (0.9 + rand(661, t.seed) * 0.25));
    m.compose(p, q, s);
    larchMesh.setMatrixAt(i, m);
    larchTrunks.setMatrixAt(i, m);
    color.setHSL(0.17 + rand(663, t.seed) * 0.09, 0.32 + rand(667, t.seed) * 0.2, 0.24 + rand(673, t.seed) * 0.12);
    larchMesh.setColorAt(i, color);
  }
  larchMesh.castShadow = false;
  larchMesh.receiveShadow = true;
  larchMesh.name = 'meili-larch';

  const group = new THREE.Group();
  group.add(trunks, geometry, larchTrunks, larchMesh);
  return { group, sway: [spruceWind.sway, larchWind.sway], count: count + larchCount };
}

function createRocks(mats) {
  const group = new THREE.Group();
  const geo = new THREE.DodecahedronGeometry(1, 0);
  const light = new THREE.InstancedMesh(geo, mats.moraine, 360);
  const dark = new THREE.InstancedMesh(geo, mats.moraineDark, 360);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  const e = new THREE.Euler();
  let li = 0;
  let di = 0;
  for (let i = 0; i < 1000 && li + di < 660; i++) {
    let x;
    let z;
    const r = rand(701, i);
    if (r < 0.28) {
      x = 110 + rand(703, i) * 340;
      z = 220 + rand(709, i) * 500;
    } else if (r < 0.52) {
      x = -720 + rand(711, i) * 1440;
      z = -880 + rand(713, i) * 760;
    } else {
      x = (rand(719, i) > 0.5 ? 1 : -1) * (240 + rand(721, i) * 700);
      z = -420 + rand(727, i) * 780;
    }
    if (nearStream(x, z, 5)) continue;
    if (x > -480 && x < -196 && z > -306 && z < -40 && rand(733, i) > 0.12) continue;
    if (z > 330 && x > 70 && x < 430) continue;
    const h = heightAt(x, z);
    if (h > 300) continue;
    const scale = 0.4 + Math.pow(rand(739, i), 2.1) * 5.8;
    p.set(x, h + scale * 0.23, z);
    e.set(rand(743, i) * 3, rand(751, i) * 6.28, rand(757, i) * 3);
    q.setFromEuler(e);
    s.set(scale * (0.8 + rand(761, i) * 0.6), scale * (0.48 + rand(769, i) * 0.55), scale * (0.8 + rand(773, i) * 0.6));
    m.compose(p, q, s);
    if (rand(787, i) > 0.47 && li < 360) light.setMatrixAt(li++, m);
    else if (di < 360) dark.setMatrixAt(di++, m);
  }
  light.count = li;
  dark.count = di;
  light.castShadow = true;
  light.receiveShadow = true;
  dark.castShadow = true;
  dark.receiveShadow = true;
  light.name = 'meili-boulders-light';
  dark.name = 'meili-boulders-dark';
  group.add(light, dark);
  return group;
}

function createCloudSea() {
  const count = 440;
  const positions = new Float32Array(count * 3);
  const size = new Float32Array(count);
  const phase = new Float32Array(count);
  const speed = new Float32Array(count);
  const alpha = new Float32Array(count);
  const colors = new Float32Array(count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const low = i < 360;
    positions[i * 3] = -1900 + rand(801, i) * 3800;
    positions[i * 3 + 1] = low ? 208 + rand(803, i) * 138 : 115 + rand(805, i) * 85;
    positions[i * 3 + 2] = low ? 260 + rand(807, i) * 1420 : -320 + rand(809, i) * 700;
    size[i] = low ? 110 + rand(811, i) * 220 : 60 + rand(813, i) * 110;
    phase[i] = rand(817, i) * 6.283;
    speed[i] = (0.6 + rand(819, i) * 2.4) * (rand(821, i) > 0.42 ? 1 : -1);
    alpha[i] = low ? 0.22 + rand(823, i) * 0.34 : 0.1 + rand(827, i) * 0.2;
    c.setHSL(0.11 + rand(829, i) * 0.03, 0.12 + rand(831, i) * 0.09, 0.86 + rand(833, i) * 0.1);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  geo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
  geo.setAttribute('aSpeed', new THREE.BufferAttribute(speed, 1));
  geo.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1));
  geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uMap: { value: makeCloudPuffTexture() },
      uFogColor: { value: new THREE.Color(0xd5d4c4) },
      uOpacity: { value: 0.92 },
    },
    vertexShader: `
      uniform float uTime;
      attribute float aSize;
      attribute float aPhase;
      attribute float aSpeed;
      attribute float aAlpha;
      attribute vec3 aColor;
      varying float vAlpha;
      varying vec3 vColor;
      varying float vFog;
      void main() {
        vec3 p = position;
        p.x = mod(p.x + uTime * aSpeed + 1900.0, 3800.0) - 1900.0;
        p.y += sin(uTime * 0.09 + aPhase) * 7.0;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = aSize * (420.0 / max(1.0, -mv.z));
        vAlpha = aAlpha;
        vColor = aColor;
        vFog = smoothstep(1500.0, 4300.0, -mv.z);
      }
    `,
    fragmentShader: `
      uniform sampler2D uMap;
      uniform vec3 uFogColor;
      uniform float uOpacity;
      varying float vAlpha;
      varying vec3 vColor;
      varying float vFog;
      void main() {
        vec4 t = texture2D(uMap, gl_PointCoord);
        float a = t.a * vAlpha * uOpacity;
        if (a < 0.008) discard;
        vec3 col = mix(vColor, uFogColor, vFog * 0.7);
        gl_FragColor = vec4(col, a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: true,
  });
  const points = new THREE.Points(geo, material);
  points.frustumCulled = false;
  points.renderOrder = 1;
  return { points, material, update: (t) => { material.uniforms.uTime.value = t; } };
}

/* ------------------------------------------------------------------ */
/* assembly                                                            */
/* ------------------------------------------------------------------ */

export function buildMeiliScene() {
  const mats = makeMaterials();
  const group = new THREE.Group();

  const terrain = makeTerrain(mats);
  group.add(terrain);
  group.add(createRidgeBlades(mats));

  const glacier = makeGlacier(mats);
  group.add(glacier.group);
  const water = makeWater(mats);
  group.add(water.group);
  const village = makeVillage(mats);
  group.add(village.group);

  const flags = createPrayerFlags(mats);
  group.add(flags.group);
  const forest = createForest(mats);
  group.add(forest.group);
  const rocks = createRocks(mats);
  group.add(rocks);
  const clouds = createCloudSea();
  group.add(clouds.points);

  const glacierMaterials = [glacier.material];
  const fallMaterials = water.fallMaterials.slice();
  const life = {
    update(t, dt) {
      flags.update(t);
      clouds.update(t);
      for (const material of glacierMaterials) material.uniforms.uTime.value = t;
      for (const material of fallMaterials) material.uniforms.uTime.value = t;
      for (const sway of forest.sway) sway.value = t;
    },
  };
  life.update(0, 0.016);

  return {
    group,
    heightAt,
    life,
    waterMaterials: [water.waterMaterial],
    glacierMaterials,
    fallMaterials,
    cloudMaterial: clouds.material,
    flagMaterial: flags.material,
    windowMaterial: village.windowMaterial,
    peaks: PEAKS,
    counts: { trees: forest.count, glacierCrevasses: 120, cloudPuffs: 440 },
  };
}

export { PEAKS, STREAMS };

