import * as THREE from 'three';
import { addBox, addBar, addCylinder, mergedMesh, mergeStaticGroup } from './geometry.js';
import { makeWaterMaterial } from './materials.js';
import { MILK_LAKE, WUSE_LAKE, BOARDWALK, MILK_WALK, STREAM } from './layout.js';

function rand(seed, n) {
  const x = Math.sin(seed * 127.1 + n * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function smoothstep(a, b, x) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function insidePoly(x, z, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0];
    const zi = poly[i][1];
    const xj = poly[j][0];
    const zj = poly[j][1];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

function ringDistance(x, z, poly) {
  let min = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const vx = b[0] - a[0];
    const vz = b[1] - a[1];
    const len2 = vx * vx + vz * vz || 1;
    const t = Math.max(0, Math.min(1, ((x - a[0]) * vx + (z - a[1]) * vz) / len2));
    min = Math.min(min, Math.hypot(x - a[0] - vx * t, z - a[1] - vz * t));
  }
  return min;
}

function shapeFromPoly(poly) {
  const shape = new THREE.Shape();
  poly.forEach(([x, z], i) => {
    if (i === 0) shape.moveTo(x, -z);
    else shape.lineTo(x, -z);
  });
  shape.closePath();
  return shape;
}

function setShapeUV(geo) {
  const pos = geo.attributes.position;
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
  }
  const uvs = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uvs[i * 2] = (pos.getX(i) - minX) / Math.max(1, maxX - minX);
    uvs[i * 2 + 1] = (pos.getZ(i) - minZ) / Math.max(1, maxZ - minZ);
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
}

function makeGrassTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 512, 512);
  grad.addColorStop(0, '#7f9c55');
  grad.addColorStop(0.45, '#8aa85c');
  grad.addColorStop(1, '#738f4d');
  g.fillStyle = grad;
  g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 9000; i++) {
    const x = rand(3, i) * 512;
    const y = rand(7, i) * 512;
    const l = 1 + rand(11, i) * 5;
    const tone = rand(13, i);
    g.strokeStyle = tone > 0.66 ? 'rgba(196,205,132,0.34)' : tone > 0.33 ? 'rgba(92,116,58,0.42)' : 'rgba(142,160,84,0.28)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + (rand(17, i) - 0.5) * 3, y - l);
    g.stroke();
  }
  for (let i = 0; i < 240; i++) {
    g.fillStyle = rand(19, i) > 0.5 ? 'rgba(218,198,110,0.22)' : 'rgba(237,236,214,0.18)';
    g.beginPath();
    g.arc(rand(23, i) * 512, rand(29, i) * 512, 0.7 + rand(31, i) * 1.7, 0, 6.28);
    g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(70, 70);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function makeBedTexture(kind) {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(256, 256, 8, 256, 256, 330);
  if (kind === 'milk') {
    grad.addColorStop(0, '#246e6c');
    grad.addColorStop(0.35, '#2f9c91');
    grad.addColorStop(0.7, '#72c9b4');
    grad.addColorStop(0.9, '#d8e7d6');
    grad.addColorStop(1, '#eef1e2');
  } else {
    grad.addColorStop(0, '#22546f');
    grad.addColorStop(0.22, '#1f7f92');
    grad.addColorStop(0.44, '#2aa7a0');
    grad.addColorStop(0.62, '#63bf9c');
    grad.addColorStop(0.78, '#b6bf7d');
    grad.addColorStop(0.9, '#dac684');
    grad.addColorStop(1, '#e9e3ca');
  }
  g.fillStyle = grad;
  g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 1200; i++) {
    const a = rand(41, i) * 6.28;
    const r = Math.sqrt(rand(43, i)) * 235;
    g.fillStyle = rand(47, i) > 0.55 ? 'rgba(238,244,222,0.13)' : 'rgba(28,70,68,0.12)';
    g.beginPath();
    g.arc(256 + Math.cos(a) * r, 256 + Math.sin(a) * r, 0.7 + rand(53, i) * 3.2, 0, 6.28);
    g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 4;
  return tex;
}

function makeSignTexture(title, sub) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 192;
  const g = c.getContext('2d');
  g.fillStyle = '#61452d';
  g.fillRect(0, 0, 512, 192);
  g.strokeStyle = 'rgba(224,188,120,0.72)';
  g.lineWidth = 5;
  g.strokeRect(10, 10, 492, 172);
  for (let i = 0; i < 260; i++) {
    g.fillStyle = rand(61, i) > 0.5 ? 'rgba(255,226,170,0.05)' : 'rgba(30,18,10,0.09)';
    g.fillRect(rand(67, i) * 512, rand(71, i) * 192, 2 + rand(73, i) * 50, 1);
  }
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = '#f5e5bd';
  g.font = '600 86px "Noto Serif CJK SC", "Songti SC", serif';
  g.fillText(title, 256, 84);
  g.fillStyle = 'rgba(236,214,166,0.7)';
  g.font = '22px "Helvetica Neue", Arial, sans-serif';
  g.fillText(sub, 256, 148);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

const rockMat = new THREE.MeshStandardMaterial({ color: 0x777b74, roughness: 0.98, flatShading: true });
const rockDarkMat = new THREE.MeshStandardMaterial({ color: 0x4f5959, roughness: 1.0, flatShading: true });
const mineralMat = new THREE.MeshStandardMaterial({ color: 0xdfe3d1, roughness: 0.94 });
const mineralAquaMat = new THREE.MeshStandardMaterial({ color: 0xa8dcc9, roughness: 0.9 });
const mineralGoldMat = new THREE.MeshStandardMaterial({ color: 0xcbbd86, roughness: 0.92 });
const plankMat = new THREE.MeshStandardMaterial({ color: 0x7c5a39, roughness: 0.92 });
const plankDarkMat = new THREE.MeshStandardMaterial({ color: 0x533b26, roughness: 0.95 });
const poleMat = new THREE.MeshStandardMaterial({ color: 0x5a4129, roughness: 0.92 });
const ropeMat = new THREE.MeshStandardMaterial({ color: 0x3b2f24, roughness: 0.96 });
const bladeMat = new THREE.MeshStandardMaterial({ color: 0x678d4d, roughness: 0.9 });
const flowerWhiteMat = new THREE.MeshStandardMaterial({ color: 0xeee9d5, roughness: 0.88 });
const flowerGoldMat = new THREE.MeshStandardMaterial({ color: 0xdeb84d, roughness: 0.86 });
const flowerBlueMat = new THREE.MeshStandardMaterial({ color: 0x8197c8, roughness: 0.88 });
const flowerStemMat = new THREE.MeshStandardMaterial({ color: 0x55743f, roughness: 0.95 });
const larchGoldMat = new THREE.MeshStandardMaterial({ color: 0xd9a53d, roughness: 0.86 });
const larchAmberMat = new THREE.MeshStandardMaterial({ color: 0xc98a30, roughness: 0.88 });
const coniferGreenMat = new THREE.MeshStandardMaterial({ color: 0x3f6a4b, roughness: 0.92 });
const larchTrunkMat = new THREE.MeshStandardMaterial({ color: 0x5b412b, roughness: 0.96 });
const skinMat = new THREE.MeshStandardMaterial({ color: 0xcf9f78, roughness: 0.9 });
const hikerDarkMat = new THREE.MeshStandardMaterial({ color: 0x323436, roughness: 0.9 });
const hikerBlueMat = new THREE.MeshStandardMaterial({ color: 0x3f627d, roughness: 0.88 });
const hikerRedMat = new THREE.MeshStandardMaterial({ color: 0x8a4636, roughness: 0.88 });
const hikerGoldMat = new THREE.MeshStandardMaterial({ color: 0xa9833e, roughness: 0.86 });
const packMat = new THREE.MeshStandardMaterial({ color: 0x536050, roughness: 0.9 });
const furMat = new THREE.MeshStandardMaterial({ color: 0x2a211a, roughness: 0.98, flatShading: true });
const hornMat = new THREE.MeshStandardMaterial({ color: 0xbcae8c, roughness: 0.78 });

const flagVertexShader = `
  attribute vec3 aColor;
  attribute float aPhase;
  uniform float uTime;
  varying vec3 vColor;
  varying float vShade;
  void main() {
    vColor = aColor;
    vec3 p = position;
    float wave = sin(uTime * 2.7 + aPhase + p.x * 2.4 + p.y * 3.4);
    p.z += wave * (0.05 + max(0.0, 4.0 - p.y) * 0.055);
    p.x += sin(uTime * 1.7 + aPhase * 1.6) * 0.03;
    vShade = 0.8 + 0.2 * wave;
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

function makeLakeWater(day, dusk) {
  const material = makeWaterMaterial();
  material.uniforms.uDeep.value.set(day.deep);
  material.uniforms.uShallow.value.set(day.shallow);
  material.uniforms.uSky.value.set(day.sky);
  material.userData.day = day;
  material.userData.dusk = dusk;
  return material;
}

function createSacredPeaks() {
  const geo = new THREE.PlaneGeometry(2500, 1500, 210, 124);
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, 0, 795);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const peaks = [
    { x: -365, z: 610, h: 360, rx: 258, rz: 224, p: 1.75 },
    { x: 0, z: 702, h: 430, rx: 232, rz: 208, p: 1.18 },
    { x: 398, z: 614, h: 345, rx: 250, rz: 226, p: 1.68 },
    { x: -760, z: 860, h: 238, rx: 330, rz: 285, p: 1.9 },
    { x: 790, z: 835, h: 258, rx: 330, rz: 290, p: 1.9 },
    { x: -135, z: 520, h: 150, rx: 170, rz: 176, p: 2.0 },
    { x: 190, z: 520, h: 165, rx: 180, rz: 180, p: 2.0 },
  ];
  const c = new THREE.Color();
  const rockLow = new THREE.Color(0x445252);
  const rockMid = new THREE.Color(0x68716d);
  const rockWarm = new THREE.Color(0x817b6d);
  const snow = new THREE.Color(0xeef4f3);
  const snowBlue = new THREE.Color(0xcbdfe6);
  const glacier = new THREE.Color(0xafd0dc);
  const scree = new THREE.Color(0x9a9485);

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const foot = smoothstep(215, 470, z);
    const und = 0.5 + 0.5 * Math.sin(x * 0.007 + Math.sin(z * 0.0045) * 1.9);
    let h = foot * (42 + und * 46);
    for (const p of peaks) {
      const dx = (x - p.x) / p.rx;
      const dz = (z - p.z) / p.rz;
      const d = Math.sqrt(dx * dx + dz * dz);
      const base = Math.pow(Math.max(0, 1 - d), p.p);
      h += p.h * base;
      h += p.h * 0.12 * Math.exp(-(dx * dx + dz * dz) * 2.2) * (0.5 + 0.5 * Math.sin(x * 0.045 + z * 0.031));
    }
    const ridge = 0.5 + 0.5 * Math.sin(x * 0.017 + z * 0.009);
    h += foot * (16 * Math.sin(x * 0.034 + z * 0.021) + 8 * Math.sin(x * 0.094 - z * 0.047));
    h += foot * ridge * 14;
    h = Math.max(0, h * foot);
    pos.setY(i, h - 2.4);

    const snowLine = 128 + 18 * Math.sin(x * 0.009 + 0.6) + 12 * Math.sin(z * 0.012);
    const jag = 15 * Math.sin(x * 0.041 + z * 0.029) + 7 * Math.sin(x * 0.115 - z * 0.052);
    const strata = 0.5 + 0.5 * Math.sin(h * 0.14 + x * 0.019);
    const patch = 0.5 + 0.5 * Math.sin(x * 0.055 + z * 0.048);
    if (h > snowLine + jag) {
      c.copy(snow).lerp(snowBlue, patch * 0.4);
      if (patch > 0.68 && h < snowLine + 85) c.lerp(glacier, 0.58);
    } else if (h > snowLine - 36 + jag * 0.5) {
      c.copy(rockMid).lerp(rockWarm, strata * 0.58).lerp(snow, patch * 0.45);
    } else if (h > 58) {
      c.copy(rockLow).lerp(rockMid, strata * 0.55);
      if (h < 118) c.lerp(scree, 0.35);
      if (h > 100) c.lerp(rockWarm, 0.2);
    } else {
      c.copy(scree).lerp(rockLow, 0.35 + patch * 0.2);
    }
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.97,
    metalness: 0,
    flatShading: true,
  });
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return mesh;
}

function streamDistance(x, z) {
  let min = Infinity;
  for (let i = 0; i < STREAM.length - 1; i++) {
    const a = STREAM[i];
    const b = STREAM[i + 1];
    const vx = b[0] - a[0];
    const vz = b[1] - a[1];
    const len2 = vx * vx + vz * vz || 1;
    const t = Math.max(0, Math.min(1, ((x - a[0]) * vx + (z - a[1]) * vz) / len2));
    min = Math.min(min, Math.hypot(x - a[0] - vx * t, z - a[1] - vz * t));
  }
  return min;
}

function createTerrain() {
  const geo = new THREE.PlaneGeometry(2400, 2400, 140, 140);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const edge = smoothstep(170, 720, Math.max(Math.abs(x), Math.abs(z)));
    const roll = Math.sin(x * 0.009) * Math.sin(z * 0.011) * 0.18 + Math.sin(x * 0.031 + z * 0.017) * 0.07;
    let y = -0.12 + roll + edge * 5.5;
    const inLake = insidePoly(x, z, MILK_LAKE) || insidePoly(x, z, WUSE_LAKE);
    if (inLake) y = -1.1;
    else if (ringDistance(x, z, MILK_LAKE) < 5 || ringDistance(x, z, WUSE_LAKE) < 5) y = Math.min(y, -0.18);
    if (streamDistance(x, z) < 3.4) y = Math.min(y, -0.24);
    pos.setY(i, y);
  }
  geo.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({
    map: makeGrassTexture(),
    color: 0xd6dfb2,
    roughness: 1.0,
    metalness: 0,
  });
  const mesh = new THREE.Mesh(geo, material);
  mesh.receiveShadow = true;
  return mesh;
}

function makeRim(poly, inner, outer, y, material) {
  const curve = new THREE.CatmullRomCurve3(
    poly.map(([x, z]) => new THREE.Vector3(x, 0, z)), true, 'catmullrom', 0.28
  );
  const pts = curve.getSpacedPoints(140);
  const cx = poly.reduce((s, p) => s + p[0], 0) / poly.length;
  const cz = poly.reduce((s, p) => s + p[1], 0) / poly.length;
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const dx = p.x - cx;
    const dz = p.z - cz;
    const d = Math.hypot(dx, dz) || 1;
    const nx = dx / d;
    const nz = dz / d;
    positions.push(p.x + nx * inner, y, p.z + nz * inner);
    positions.push(p.x + nx * outer, y - 0.015, p.z + nz * outer);
    uvs.push(0, i / pts.length * 8, 1, i / pts.length * 8);
  }
  for (let i = 0; i < pts.length; i++) {
    const a = i * 2;
    const b = ((i + 1) % pts.length) * 2;
    indices.push(a, b, a + 1, a + 1, b, b + 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, material);
  mesh.material.side = THREE.DoubleSide;
  mesh.receiveShadow = true;
  return mesh;
}

function createLake(poly, waterMaterial, bedTexture, rimA, rimB) {
  const group = new THREE.Group();
  const shape = shapeFromPoly(poly);
  const geo = new THREE.ShapeGeometry(shape, 26);
  geo.rotateX(-Math.PI / 2);
  setShapeUV(geo);
  const bed = new THREE.Mesh(geo.clone(), new THREE.MeshStandardMaterial({
    map: bedTexture,
    roughness: 0.92,
    color: 0xdfe7d8,
  }));
  bed.position.y = -0.62;
  bed.receiveShadow = true;
  group.add(bed);
  const water = new THREE.Mesh(geo, waterMaterial);
  water.position.y = 0.32;
  water.renderOrder = 1;
  group.add(water);
  group.add(makeRim(poly, -0.4, 5.2, 0.27, rimA));
  group.add(makeRim(poly, 4.6, 10.5, 0.255, rimB));
  return group;
}

function createStream() {
  const curve = new THREE.CatmullRomCurve3(
    STREAM.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'catmullrom', 0.32
  );
  const pts = curve.getSpacedPoints(190);
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const t = curve.getTangent(i / (pts.length - 1));
    const nx = -t.z;
    const nz = t.x;
    const w = 2.0 + Math.sin(i * 0.22) * 0.55 + Math.sin(i * 0.067 + 1.4) * 0.4;
    const y = 0.34 + Math.sin(i * 0.18) * 0.02;
    positions.push(p.x + nx * w, y, p.z + nz * w);
    positions.push(p.x - nx * w, y, p.z - nz * w);
    uvs.push(0, i / pts.length * 14, 1, i / pts.length * 14);
  }
  for (let i = 0; i < pts.length - 1; i++) {
    const a = i * 2;
    const b = a + 2;
    indices.push(a, b, a + 1, a + 1, b, b + 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uDeep: { value: new THREE.Color(0x2b7a7c) },
      uShallow: { value: new THREE.Color(0x95ddd2) },
      uSky: { value: new THREE.Color(0xd9efec) },
      uSun: { value: new THREE.Color(0xfff6df) },
      uSunDir: { value: new THREE.Vector3(0.4, 0.8, 0.3).normalize() },
    },
    vertexShader: `
      uniform float uTime;
      varying vec2 vUv;
      varying vec3 vWorldPos;
      void main() {
        vUv = uv;
        vec3 p = position;
        p.y += sin(p.x * 0.9 + uTime * 2.3) * 0.025;
        vec4 world = modelMatrix * vec4(p, 1.0);
        vWorldPos = world.xyz;
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
      varying vec2 vUv;
      varying vec3 vWorldPos;
      void main() {
        float band = sin(vUv.y * 22.0 - uTime * 4.2 + sin(vUv.x * 9.0) * 1.8);
        float fine = sin(vUv.y * 63.0 - uTime * 7.0 + vUv.x * 18.0);
        float fall = smoothstep(-1.0, 1.0, band + fine * 0.28);
        vec3 col = mix(uDeep, uShallow, 0.28 + fall * 0.62);
        float edge = smoothstep(0.66, 0.98, abs(vUv.x * 2.0 - 1.0));
        col = mix(col, vec3(0.94, 0.99, 0.97), edge * (0.42 + 0.3 * fall));
        vec3 viewDir = normalize(cameraPosition - vWorldPos);
        vec3 n = normalize(vec3((fall - 0.5) * 0.25, 1.0, 0.1));
        vec3 hv = normalize(viewDir + normalize(uSunDir));
        float spec = pow(max(dot(n, hv), 0.0), 90.0);
        col += uSun * spec * 0.35;
        col += uSky * 0.08;
        gl_FragColor = vec4(col, 0.82);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  material.userData.day = { deep: 0x2b7a7c, shallow: 0x95ddd2, sky: 0xd9efec, stream: true };
  material.userData.dusk = { deep: 0x1d4f58, shallow: 0x5b9690, sky: 0xd2ab92, stream: true };
  const mesh = new THREE.Mesh(geo, material);
  mesh.renderOrder = 2;
  return { mesh, material };
}

function createBoardwalk(points, width, y) {
  const group = new THREE.Group();
  const curve = new THREE.CatmullRomCurve3(
    points.map((p) => new THREE.Vector3(p[0], 0, p[1])), false, 'catmullrom', 0.26
  );
  const len = curve.getLength();
  const count = Math.max(22, Math.round(len / 0.92));
  const pts = curve.getSpacedPoints(count);
  const planks = [];
  const beams = [];
  const posts = [];
  const rails = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const segLen = Math.hypot(b.x - a.x, b.z - a.z);
    const ang = Math.atan2(b.x - a.x, b.z - a.z);
    const plank = new THREE.BoxGeometry(width, 0.14, segLen * 0.9);
    plank.rotateY(ang);
    plank.translate((a.x + b.x) / 2, y - 0.07 + rand(31, i) * 0.016, (a.z + b.z) / 2);
    planks.push(plank);
    if (i % 2 === 0) {
      const beam = new THREE.BoxGeometry(0.24, 0.22, segLen + 0.18);
      beam.rotateY(ang);
      beam.translate((a.x + b.x) / 2, y - 0.25, (a.z + b.z) / 2);
      beams.push(beam);
    }
  }
  const step = Math.max(2, Math.round(len / 13));
  for (let i = 0; i <= count; i += step) {
    const j = Math.min(i, pts.length - 1);
    const p = pts[j];
    const t = curve.getTangent(j / (pts.length - 1));
    const nx = -t.z;
    const nz = t.x;
    for (const side of [-1, 1]) {
      const x = p.x + nx * side * (width / 2 + 0.2);
      const z = p.z + nz * side * (width / 2 + 0.2);
      addBox(posts, 0.2, 1.35, 0.2, x, y + 0.52, z);
      addBox(posts, 0.36, 0.1, 0.36, x, y + 1.2, z);
    }
    if (i + step <= count) {
      const p2 = pts[Math.min(i + step, pts.length - 1)];
      const t2 = curve.getTangent(Math.min(1, (i + step) / (pts.length - 1)));
      for (const side of [-1, 1]) {
        const x1 = p.x + nx * side * (width / 2 + 0.2);
        const z1 = p.z + nz * side * (width / 2 + 0.2);
        const x2 = p2.x - t2.z * side * (width / 2 + 0.2);
        const z2 = p2.z + t2.x * side * (width / 2 + 0.2);
        addBar(rails, x1, z1, x2, z2, y + 1.12, 0.1, 0.13);
        addBar(rails, x1, z1, x2, z2, y + 0.66, 0.08, 0.09);
      }
    }
  }
  for (const [list, material] of [
    [planks, plankMat],
    [beams, plankDarkMat],
    [posts, plankDarkMat],
    [rails, plankMat],
  ]) {
    const mesh = mergedMesh(list, material, true, true);
    if (mesh) group.add(mesh);
  }
  return group;
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

function createPrayerFlags() {
  const group = new THREE.Group();
  const poles = [];
  const ropes = [];
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
    { a: [28, -45], b: [76, -24], y: 6.8, sag: 1.1, count: 18 },
    { a: [-62, -114], b: [-12, -96], y: 6.1, sag: 1.0, count: 16 },
    { a: [-174, 118], b: [-124, 104], y: 6.4, sag: 0.95, count: 14 },
    { a: [76, 150], b: [128, 160], y: 6.2, sag: 0.9, count: 14 },
  ];
  lines.forEach((line, li) => {
    const [ax, az] = line.a;
    const [bx, bz] = line.b;
    addCylinder(poles, 0.1, 0.15, line.y + 0.55, 7, ax, (line.y + 0.55) / 2, az);
    addCylinder(poles, 0.1, 0.15, line.y + 0.55, 7, bx, (line.y + 0.55) / 2, bz);
    const dirX = (bx - ax) / Math.hypot(bx - ax, bz - az);
    const dirZ = (bz - az) / Math.hypot(bx - ax, bz - az);
    for (let i = 0; i < line.count; i++) {
      const t0 = i / line.count;
      const t1 = (i + 1) / line.count;
      const tm = (t0 + t1) / 2;
      const x = ax + (bx - ax) * tm;
      const z = az + (bz - az) * tm;
      const yTop = line.y - line.sag * 4 * tm * (1 - tm);
      const w = 0.42;
      const h = 0.54;
      addRod(
        ropes,
        ax + (bx - ax) * t0, line.y - line.sag * 4 * t0 * (1 - t0), az + (bz - az) * t0,
        x - dirX * w / 2, yTop, z - dirZ * w / 2, 0.02, 4
      );
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
  const pm = mergedMesh(poles, poleMat, true, true);
  if (pm) group.add(pm);
  const rm = mergedMesh(ropes, ropeMat, false, true);
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
  return {
    group,
    update(t) {
      flagMaterial.uniforms.uTime.value = t;
    },
  };
}

function createLarch({ height, seed, amber }) {
  const group = new THREE.Group();
  const trunk = [];
  const gold = [];
  const green = [];
  const t = new THREE.CylinderGeometry(height * 0.022, height * 0.05, height * 0.75, 7);
  t.translate(0, height * 0.375, 0);
  trunk.push(t);
  for (let i = 0; i < 7; i++) {
    const f = i / 6;
    const r = height * (0.29 - f * 0.21);
    const cone = new THREE.ConeGeometry(r, height * (0.23 - f * 0.06), 8);
    cone.rotateY(rand(seed + 7, i) * 6.28);
    cone.translate(
      (rand(seed + 11, i) - 0.5) * 0.35,
      height * (0.38 + i * 0.088),
      (rand(seed + 13, i) - 0.5) * 0.35
    );
    if (rand(seed + 17, i) > 0.22) gold.push(cone);
    else green.push(cone);
  }
  for (let i = 0; i < 10; i++) {
    const a = rand(seed + 19, i) * 6.28;
    const y = height * (0.45 + rand(seed + 23, i) * 0.42);
    const g = new THREE.ConeGeometry(height * 0.055, height * 0.15, 4);
    g.rotateZ(1.1 + rand(seed + 29, i) * 0.3);
    g.rotateY(a);
    g.translate(Math.cos(a) * height * 0.15, y, Math.sin(a) * height * 0.15);
    gold.push(g);
  }
  for (const [list, material] of [
    [trunk, larchTrunkMat],
    [gold, amber ? larchAmberMat : larchGoldMat],
    [green, coniferGreenMat],
  ]) {
    const mesh = mergedMesh(list, material, true, true);
    if (mesh) group.add(mesh);
  }
  return group;
}

function createLarchForest(root) {
  const clusters = [
    [-236, -70, 64], [-250, 80, 76], [226, -116, 62], [242, 34, 70],
    [164, 212, 76], [-168, 218, 72], [278, 178, 54], [-286, -178, 48],
    [-198, -196, 44], [198, -200, 46], [-290, 150, 40], [296, 118, 38],
  ];
  let seed = 83;
  clusters.forEach(([cx, cz, radius], ci) => {
    const count = ci < 6 ? 13 : 8;
    for (let i = 0; i < count; i++) {
      seed++;
      const a = rand(seed, i) * 6.28;
      const d = Math.sqrt(rand(seed + 3, i)) * radius;
      const x = cx + Math.cos(a) * d;
      const z = cz + Math.sin(a) * d;
      if (insidePoly(x, z, MILK_LAKE) || insidePoly(x, z, WUSE_LAKE)) continue;
      if (ringDistance(x, z, MILK_LAKE) < 9 || ringDistance(x, z, WUSE_LAKE) < 9) continue;
      if (Math.hypot(x - 30, z + 20) < 16) continue;
      const height = 7.5 + rand(seed + 5, i) * 8.5;
      const tree = createLarch({ height, seed: seed * 5 + i, amber: rand(seed + 31, i) > 0.72 });
      tree.position.set(x, 0, z);
      tree.rotation.y = rand(seed + 9, i) * 6.28;
      root.add(tree);
    }
  });
}

function createHiker({ x, z, rot, coat, pole, y = 0 }) {
  const group = new THREE.Group();
  const dark = [];
  const skin = [];
  const cloth = [];
  const pack = [];
  const poleList = [];
  for (const sx of [-0.16, 0.16]) {
    const leg = new THREE.CylinderGeometry(0.1, 0.13, 0.86, 6);
    leg.translate(sx, 0.43, 0);
    dark.push(leg);
    const boot = new THREE.BoxGeometry(0.24, 0.14, 0.36);
    boot.translate(sx, 0.08, 0.08);
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
  const hat = new THREE.CylinderGeometry(0.2, 0.25, 0.13, 10);
  hat.translate(0, 2.12, 0);
  dark.push(hat);
  const packGeo = new THREE.BoxGeometry(0.46, 0.62, 0.28);
  packGeo.translate(0, 1.35, -0.34);
  pack.push(packGeo);
  const roll = new THREE.CylinderGeometry(0.12, 0.12, 0.52, 8);
  roll.rotateZ(Math.PI / 2);
  roll.translate(0, 1.72, -0.34);
  pack.push(roll);
  if (pole) {
    addRod(poleList, 0.48, 1.42, 0.08, 0.62, 0.02, 0.62, 0.022, 4);
  }
  const clothMat = coat === 'red' ? hikerRedMat : coat === 'gold' ? hikerGoldMat : hikerBlueMat;
  for (const [list, material] of [
    [dark, hikerDarkMat],
    [skin, skinMat],
    [cloth, clothMat],
    [pack, packMat],
    [poleList, hikerDarkMat],
  ]) {
    const mesh = mergedMesh(list, material, true, true);
    if (mesh) group.add(mesh);
  }
  group.position.set(x, y, z);
  group.rotation.y = rot;
  return group;
}

function createSign(text, sub, x, z, rot, y = 0) {
  const group = new THREE.Group();
  const posts = [];
  addBox(posts, 0.18, 2.35, 0.18, -1.15, 1.18, 0);
  addBox(posts, 0.18, 2.35, 0.18, 1.15, 1.18, 0);
  addBox(posts, 3.0, 0.16, 0.22, 0, 2.34, 0);
  const pm = mergedMesh(posts, poleMat, true, true);
  if (pm) group.add(pm);
  const mat = new THREE.MeshStandardMaterial({
    map: makeSignTexture(text, sub),
    roughness: 0.82,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 1.08), mat);
  panel.position.set(0, 1.74, 0.03);
  group.add(panel);
  group.position.set(x, y, z);
  group.rotation.y = rot;
  return group;
}

function createLakeStones(poly) {
  const group = new THREE.Group();
  const curve = new THREE.CatmullRomCurve3(
    poly.map(([x, z]) => new THREE.Vector3(x, 0, z)), true, 'catmullrom', 0.3
  );
  const pts = curve.getSpacedPoints(100);
  const cx = poly.reduce((s, p) => s + p[0], 0) / poly.length;
  const cz = poly.reduce((s, p) => s + p[1], 0) / poly.length;
  const stones = [];
  const gravel = [];
  let seed = 151;
  pts.forEach((p, i) => {
    if (i % 2 !== 0) return;
    const dx = p.x - cx;
    const dz = p.z - cz;
    const d = Math.hypot(dx, dz) || 1;
    const nx = dx / d;
    const nz = dz / d;
    const off = 4.5 + rand(seed, i) * 7.5;
    const s = 0.55 + rand(seed + 2, i) * 1.7;
    const g = new THREE.IcosahedronGeometry(s, 0);
    g.scale(1.2, 0.7, 1.0);
    g.rotateY(rand(seed + 4, i) * 6.28);
    g.translate(p.x + nx * off, s * 0.3, p.z + nz * off);
    stones.push(g);
    for (let k = 0; k < 2; k++) {
      const a = rand(seed + 8, i * 5 + k) * 6.28;
      const off2 = 1.5 + rand(seed + 12, i * 5 + k) * 6.0;
      const h = new THREE.IcosahedronGeometry(0.1 + rand(seed + 6, i * 3 + k) * 0.22, 0);
      h.scale(1.25, 0.6, 1.0);
      h.translate(
        p.x + Math.cos(a) * off2,
        0.06 + rand(seed + 9, i * 7 + k) * 0.08,
        p.z + Math.sin(a) * off2
      );
      gravel.push(h);
    }
  });
  const sm = mergedMesh(stones, rockMat, true, true);
  if (sm) group.add(sm);
  const gm = mergedMesh(gravel, rockDarkMat, false, true);
  if (gm) group.add(gm);
  return group;
}

function createMeadow() {
  const group = new THREE.Group();
  const blades = [];
  const flowers = { white: [], gold: [], blue: [] };
  const stems = [];
  const flowerMats = [
    ['white', flowerWhiteMat],
    ['gold', flowerGoldMat],
    ['blue', flowerBlueMat],
  ];
  let placed = 0;
  let tries = 0;
  while (placed < 520 && tries < 5200) {
    tries++;
    const x = -270 + rand(101, tries) * 540;
    const z = -215 + rand(107, tries) * 390;
    if (insidePoly(x, z, MILK_LAKE) || insidePoly(x, z, WUSE_LAKE)) continue;
    if (ringDistance(x, z, MILK_LAKE) < 11 || ringDistance(x, z, WUSE_LAKE) < 11) continue;
    let nearBoard = false;
    for (const p of BOARDWALK) if (Math.hypot(x - p[0], z - p[1]) < 7) nearBoard = true;
    for (const p of MILK_WALK) if (Math.hypot(x - p[0], z - p[1]) < 6) nearBoard = true;
    if (nearBoard) continue;
    let nearStream = false;
    for (const p of STREAM) if (Math.hypot(x - p[0], z - p[1]) < 7) nearStream = true;
    if (nearStream) continue;
    const h = 0.3 + rand(113, tries) * 0.55;
    for (let k = 0; k < 3; k++) {
      const g = new THREE.ConeGeometry(0.042, h * (0.72 + rand(127, tries + k) * 0.42), 3);
      g.rotateZ((rand(131, tries + k) - 0.5) * 0.5);
      g.rotateY(rand(137, tries + k) * 6.28);
      g.translate(
        x + (rand(139, tries + k) - 0.5) * 0.42,
        h * 0.36,
        z + (rand(149, tries + k) - 0.5) * 0.42
      );
      blades.push(g);
    }
    if (rand(151, tries) > 0.48) {
      const which = flowerMats[(rand(157, tries) * 3) | 0];
      const stem = new THREE.CylinderGeometry(0.017, 0.024, 0.4, 4);
      stem.translate(x, 0.2, z);
      stems.push(stem);
      const head = new THREE.IcosahedronGeometry(0.07 + rand(163, tries) * 0.04, 0);
      head.scale(1, 0.7, 1);
      head.translate(x, 0.42, z);
      flowers[which[0]].push(head);
    }
    placed++;
  }
  const bm = mergedMesh(blades, bladeMat, false, true);
  if (bm) group.add(bm);
  const sm = mergedMesh(stems, flowerStemMat, false, true);
  if (sm) group.add(sm);
  for (const [key, material] of flowerMats) {
    const fm = mergedMesh(flowers[key], material, false, true);
    if (fm) group.add(fm);
  }
  return group;
}

function createYaks() {
  const group = new THREE.Group();
  const fur = [];
  const horns = [];
  const body = new THREE.SphereGeometry(1.0, 12, 9);
  body.scale(1.42, 0.9, 0.82);
  body.translate(0, 1.3, 0);
  fur.push(body);
  const hump = new THREE.SphereGeometry(0.78, 10, 8);
  hump.scale(1.0, 0.62, 0.82);
  hump.translate(0, 1.74, 0.26);
  fur.push(hump);
  const head = new THREE.SphereGeometry(0.52, 10, 8);
  head.scale(0.82, 0.82, 0.95);
  head.translate(0, 1.47, 1.2);
  fur.push(head);
  const snout = new THREE.SphereGeometry(0.33, 8, 6);
  snout.scale(0.85, 0.7, 1.15);
  snout.translate(0, 1.29, 1.6);
  fur.push(snout);
  for (const sx of [-1, 1]) {
    for (const sz of [-0.48, 0.44]) {
      const leg = new THREE.CylinderGeometry(0.11, 0.14, 0.9, 6);
      leg.translate(sx * 0.6, 0.45, sz);
      fur.push(leg);
      const hoof = new THREE.CylinderGeometry(0.15, 0.17, 0.13, 6);
      hoof.translate(sx * 0.6, 0.06, sz);
      horns.push(hoof);
    }
    const ear = new THREE.ConeGeometry(0.1, 0.3, 5);
    ear.rotateZ(sx * 0.7);
    ear.translate(sx * 0.4, 1.82, 1.25);
    fur.push(ear);
    const horn = new THREE.ConeGeometry(0.07, 0.72, 6);
    horn.rotateZ(sx * 0.72);
    horn.rotateX(-0.18);
    horn.translate(sx * 0.36, 1.86, 1.28);
    horns.push(horn);
  }
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * Math.PI * 2;
    const tuft = new THREE.ConeGeometry(0.12, 0.62 + rand(171, i) * 0.35, 4);
    tuft.rotateX(Math.PI);
    tuft.rotateZ((rand(173, i) - 0.5) * 0.3);
    tuft.translate(Math.cos(a) * 1.02, 0.78, Math.sin(a) * 0.58);
    fur.push(tuft);
  }
  const tail = new THREE.ConeGeometry(0.16, 0.95, 5);
  tail.rotateX(0.45);
  tail.scale(1, 1, 0.55);
  tail.translate(0, 1.45, -1.18);
  fur.push(tail);
  const furMesh = mergedMesh(fur, furMat, true, true);
  const hornMesh = mergedMesh(horns, hornMat, true, true);
  const defs = [
    { x: -96, z: -72, r: 5.2, speed: 0.055, phase: 0.4, scale: 1.05 },
    { x: -58, z: -38, r: 4.1, speed: -0.072, phase: 1.6, scale: 0.95 },
    { x: -26, z: -92, r: 5.8, speed: 0.048, phase: 2.7, scale: 1.12 },
    { x: 22, z: -26, r: 3.6, speed: -0.063, phase: 4.1, scale: 1.0 },
    { x: -118, z: -10, r: 4.6, speed: 0.051, phase: 3.2, scale: 1.08 },
    { x: 56, z: 18, r: 3.9, speed: 0.068, phase: 5.0, scale: 0.92 },
    { x: -72, z: 36, r: 5.0, speed: -0.045, phase: 0.9, scale: 1.02 },
    { x: 8, z: -150, r: 4.2, speed: 0.06, phase: 2.1, scale: 1.1 },
  ];
  const count = defs.length;
  const furInst = new THREE.InstancedMesh(furMesh.geometry, furMat, count);
  const hornInst = new THREE.InstancedMesh(hornMesh.geometry, hornMat, count);
  furInst.castShadow = true;
  furInst.receiveShadow = true;
  hornInst.castShadow = true;
  furInst.frustumCulled = false;
  hornInst.frustumCulled = false;
  group.add(furInst, hornInst);
  const dummy = new THREE.Object3D();
  function update(t) {
    defs.forEach((d, i) => {
      const a = t * d.speed + d.phase;
      const x = d.x + Math.cos(a) * d.r;
      const z = d.z + Math.sin(a) * d.r * 0.72;
      const tx = -Math.sin(a) * d.r;
      const tz = Math.cos(a) * d.r * 0.72;
      dummy.position.set(x, 0.02 + Math.abs(Math.sin(t * 1.8 + d.phase)) * 0.045, z);
      dummy.rotation.set(0, Math.atan2(tx, tz), Math.sin(t * 1.8 + d.phase) * 0.015);
      dummy.scale.setScalar(d.scale);
      dummy.updateMatrix();
      furInst.setMatrixAt(i, dummy.matrix);
      hornInst.setMatrixAt(i, dummy.matrix);
    });
    furInst.instanceMatrix.needsUpdate = true;
    hornInst.instanceMatrix.needsUpdate = true;
  }
  update(0);
  return { group, update };
}

function createMist() {
  const quads = [
    [-380, 220, 560, 440, 92], [0, 250, 600, 520, 110], [390, 215, 580, 430, 88],
    [-650, 175, 700, 460, 84], [650, 185, 690, 420, 80], [0, 160, 470, 360, 64],
  ];
  const positions = [];
  const uvs = [];
  const phases = [];
  const indices = [];
  quads.forEach(([x, y, z, w, h], i) => {
    const base = positions.length / 3;
    const phase = i * 1.63 + rand(201, i) * 4;
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
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(0xe6eff3) } },
    vertexShader: `
      attribute float aPhase;
      uniform float uTime;
      varying vec2 vUv;
      varying float vFade;
      void main() {
        vUv = uv;
        vec3 p = position;
        p.x += sin(uTime * 0.04 + aPhase) * 22.0;
        p.y += sin(uTime * 0.06 + aPhase * 1.8) * 3.2;
        vFade = 0.7 + 0.3 * sin(uTime * 0.09 + aPhase);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      varying vec2 vUv;
      varying float vFade;
      void main() {
        float d = length(vUv - vec2(0.5));
        float a = smoothstep(0.52, 0.05, d);
        a *= smoothstep(0.0, 0.24, vUv.y) * smoothstep(1.0, 0.74, vUv.y);
        gl_FragColor = vec4(uColor, a * 0.18 * vFade);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, material);
  mesh.renderOrder = 4;
  return {
    group: mesh,
    update(t) {
      material.uniforms.uTime.value = t;
    },
  };
}

export function buildYadingScene() {
  const root = new THREE.Group();

  const milkWater = makeLakeWater(
    { deep: 0x2fa8a0, shallow: 0xa8ecdf, sky: 0xe2f5f1 },
    { deep: 0x1c5a63, shallow: 0x64aaa2, sky: 0xd6ad98 }
  );
  const wuseWater = makeLakeWater(
    { deep: 0x2a89a8, shallow: 0x96dfcd, sky: 0xe0f2ef },
    { deep: 0x16495b, shallow: 0x578f88, sky: 0xd0a891 }
  );
  const waterMaterials = [milkWater, wuseWater];

  const terrain = createTerrain();
  const terrainMaterial = terrain.material;
  root.add(terrain);
  root.add(createLake(MILK_LAKE, milkWater, makeBedTexture('milk'), mineralMat, mineralAquaMat));
  root.add(createLake(WUSE_LAKE, wuseWater, makeBedTexture('wuse'), mineralMat, mineralGoldMat));
  root.add(createLakeStones(MILK_LAKE));
  root.add(createLakeStones(WUSE_LAKE));

  root.add(createBoardwalk(BOARDWALK, 3.5, 0.45));
  root.add(createBoardwalk(MILK_WALK, 2.9, 0.45));
  root.add(createMeadow());
  createLarchForest(root);

  const hikers = [
    [-52, -184, Math.PI, 'blue', true, 0.45],
    [-34, -145, Math.PI, 'red', false, 0.45],
    [-12, -106, Math.PI, 'gold', true, 0.45],
    [16, -69, Math.PI, 'blue', false, 0.45],
    [39, -18, Math.PI, 'red', true, 0.45],
    [65, 29, Math.PI, 'gold', false, 0.45],
    [91, 92, Math.PI, 'blue', true, 0.45],
    [-43, 34, 0.7, 'red', false, 0],
    [118, 152, -1.2, 'gold', true, 0],
  ];
  hikers.forEach(([x, z, rot, coat, pole, y]) => {
    root.add(createHiker({ x, z, rot, coat, pole, y }));
  });

  root.add(createSign('牛奶海', 'MILK LAKE · 4600M', -94, 114, Math.PI - 0.12));
  root.add(createSign('五色海', 'WUSE LAKE · 4700M', 84, 150, Math.PI + 0.1));
  root.add(createSign('洛绒牛场', 'LUORONG PASTURE · 4180M', 42, 27, Math.PI - 0.22));

  const prayer = createPrayerFlags();
  const stream = createStream();
  const yaks = createYaks();
  const mist = createMist();

  const merged = mergeStaticGroup(root);
  merged.traverse((mesh) => {
    if (mesh.isMesh && mesh.material === terrainMaterial) mesh.castShadow = false;
  });
  merged.add(createSacredPeaks());
  merged.add(prayer.group);
  merged.add(stream.mesh);
  merged.add(yaks.group);
  merged.add(mist.group);
  waterMaterials.push(stream.material);

  const life = {
    update(t) {
      prayer.update(t);
      yaks.update(t);
      stream.material.uniforms.uTime.value = t;
      mist.update(t);
    },
  };

  return {
    group: merged,
    waterMaterial: milkWater,
    waterMaterials,
    life,
  };
}




