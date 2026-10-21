import * as THREE from 'three';
import { mergeStaticGroup } from './geometry.js';
import { heightAt } from './terrain.js';
import { mats, sharedTextures } from './materials.js';

const WATER_Y = 9;
const TEMPLE = { x: -222, z: 452 };
const MAT = new Map();

function mat(color, rough = 0.95, metal = 0) {
  const key = color + ':' + rough + ':' + metal;
  if (!MAT.has(key)) {
    MAT.set(key, new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal }));
  }
  return MAT.get(key);
}

function add(parent, geo, material, x, y, z, ry = 0) {
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(x, y, z);
  mesh.rotation.y = ry;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function box(parent, w, h, d, material, x, y, z, ry = 0) {
  return add(parent, new THREE.BoxGeometry(w, h, d), material, x, y, z, ry);
}

function cylinder(parent, rt, rb, h, material, x, y, z, seg = 8, ry = 0) {
  return add(parent, new THREE.CylinderGeometry(rt, rb, h, seg), material, x, y, z, ry);
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeTileTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#384845';
  ctx.fillRect(0, 0, 256, 256);
  for (let row = 0; row < 16; row++) {
    const y = row * 16;
    ctx.fillStyle = row % 2 ? '#415450' : '#354540';
    ctx.fillRect(0, y, 256, 14);
    ctx.fillStyle = 'rgba(190, 208, 201, 0.18)';
    ctx.fillRect(0, y + 1, 256, 1.2);
    ctx.fillStyle = 'rgba(8, 14, 13, 0.4)';
    ctx.fillRect(0, y + 14, 256, 2);
    const offset = row % 2 ? 16 : 0;
    for (let col = 0; col < 9; col++) {
      const x = offset + col * 32;
      ctx.fillStyle = 'rgba(10, 18, 16, 0.3)';
      ctx.fillRect(x, y, 2, 14);
      ctx.fillStyle = 'rgba(180, 199, 192, 0.12)';
      ctx.fillRect(x + 2, y + 2, 1, 10);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  return texture;
}

function makePlaqueTexture(text, sub) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#241a12';
  ctx.fillRect(0, 0, 512, 160);
  ctx.strokeStyle = '#c19b55';
  ctx.lineWidth = 7;
  ctx.strokeRect(11, 11, 490, 138);
  ctx.strokeStyle = 'rgba(193, 155, 85, 0.45)';
  ctx.lineWidth = 2;
  ctx.strokeRect(23, 23, 466, 114);
  ctx.fillStyle = '#e4c47a';
  ctx.font = '600 76px "Noto Serif CJK SC", "Songti SC", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 76);
  if (sub) {
    ctx.fillStyle = 'rgba(228, 196, 122, 0.66)';
    ctx.font = '20px "Helvetica Neue", Arial, sans-serif';
    ctx.fillText(sub, 256, 132);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function makeFlagTexture(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 192;
  canvas.height = 320;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#9d2f25';
  ctx.fillRect(0, 0, 192, 320);
  ctx.fillStyle = 'rgba(240, 202, 116, 0.2)';
  ctx.fillRect(0, 0, 192, 10);
  ctx.strokeStyle = '#e1bb6a';
  ctx.lineWidth = 5;
  ctx.strokeRect(9, 9, 174, 302);
  ctx.fillStyle = '#e8cf92';
  ctx.font = '600 88px "Noto Serif CJK SC", "Songti SC", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 96, 150);
  ctx.font = '20px "Helvetica Neue", Arial, sans-serif';
  ctx.fillText('LAOSHAN', 96, 250);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function roofGeometry(w, d, h, ridgeRatio = 0.4) {
  const hw = w * 0.5;
  const hd = d * 0.5;
  const rw = w * ridgeRatio * 0.5;
  const positions = [];
  const uvs = [];
  const push = (x, y, z, u, v) => {
    positions.push(x, y, z);
    uvs.push(u, v);
  };
  const tri = (a, b, c) => {
    push(a[0], a[1], a[2], a[0] / 5 + 0.5, a[2] / 5 + 0.5);
    push(b[0], b[1], b[2], b[0] / 5 + 0.5, b[2] / 5 + 0.5);
    push(c[0], c[1], c[2], c[0] / 5 + 0.5, c[2] / 5 + 0.5);
  };
  const b0 = [-hw, 0, -hd];
  const b1 = [hw, 0, -hd];
  const b2 = [hw, 0, hd];
  const b3 = [-hw, 0, hd];
  const r0 = [-rw, h, 0];
  const r1 = [rw, h, 0];
  tri(b0, r1, b1);
  tri(b0, r0, r1);
  tri(b2, r0, b3);
  tri(b2, r1, r0);
  tri(b3, r1, b2);
  tri(b3, r0, r1);
  tri(b0, b1, r1);
  tri(b0, r1, r0);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.computeVertexNormals();
  return geo;
}

function addRoof(parent, w, d, h, material, x, y, z, ry = 0, ridgeMaterial = null) {
  const roof = add(parent, roofGeometry(w, d, h), material, x, y, z, ry);
  roof.material.side = THREE.DoubleSide;
  add(parent, new THREE.BoxGeometry(w * 0.42, 0.55, 0.7), ridgeMaterial || material, x, y + h + 0.1, z, ry);
  for (const s of [-1, 1]) {
    add(parent, new THREE.BoxGeometry(0.8, 0.9, 0.8), ridgeMaterial || material, x + Math.cos(ry) * s * w * 0.2, y + h + 0.55, z - Math.sin(ry) * s * w * 0.2, ry);
  }
  return roof;
}

function addPine(parent, x, y, z, height, spread, seed, leanAngle = null) {
  const rand = mulberry32(seed);
  const angle = leanAngle == null ? rand() * Math.PI * 2 : leanAngle;
  const lean = (0.12 + rand() * 0.22) * height;
  const tx = Math.cos(angle) * lean;
  const tz = Math.sin(angle) * lean;
  const points = [
    [x, y - 0.6, z],
    [x + tx * 0.2, y + height * 0.42, z + tz * 0.2],
    [x + tx * 0.52, y + height * 0.74, z + tz * 0.52],
    [x + tx, y + height, z + tz],
  ];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const dz = b[2] - a[2];
    const len = Math.hypot(dx, dy, dz) || 1;
    const geo = new THREE.CylinderGeometry(0.12 + (1 - i / 3) * height * 0.012, 0.2 + (1 - i / 3) * height * 0.018, len, 6);
    geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx / len, dy / len, dz / len)));
    geo.translate((a[0] + b[0]) * 0.5, (a[1] + b[1]) * 0.5, (a[2] + b[2]) * 0.5);
    const mesh = new THREE.Mesh(geo, mats.trunk);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
  }
  const pineMats = [mats.pineDeep, mats.pine, mats.pineLight];
  const tiers = 3 + (rand() * 2 | 0);
  for (let i = 0; i < tiers; i++) {
    const k = i / Math.max(1, tiers - 1);
    const cx = x + tx * (0.56 + k * 0.42) + (rand() - 0.5) * spread * 0.8;
    const cz = z + tz * (0.56 + k * 0.42) + (rand() - 0.5) * spread * 0.8;
    const cy = y + height * (0.62 + k * 0.33);
    const r = spread * (0.72 - k * 0.18) * (0.75 + rand() * 0.45);
    const geo = new THREE.IcosahedronGeometry(1, 0);
    geo.scale(r * 1.25, r * 0.26, r);
    geo.rotateY(rand() * 6.2);
    geo.translate(cx, cy, cz);
    const mesh = new THREE.Mesh(geo, pineMats[(i + seed) % pineMats.length]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
  }
  for (let i = 0; i < 3; i++) {
    const cx = x + tx + (rand() - 0.5) * spread * 1.1;
    const cz = z + tz + (rand() - 0.5) * spread * 1.1;
    const geo = new THREE.IcosahedronGeometry(1, 0);
    geo.scale(spread * 0.5, spread * 0.16, spread * 0.4);
    geo.rotateY(rand() * 6.2);
    geo.translate(cx, y + height * (0.9 + rand() * 0.1), cz);
    const mesh = new THREE.Mesh(geo, pineMats[(i + seed + 1) % pineMats.length]);
    mesh.castShadow = true;
    parent.add(mesh);
  }
}

function addPriest(parent, x, y, z, ry, robeColor) {
  const group = new THREE.Group();
  const robe = new THREE.MeshStandardMaterial({ color: robeColor, roughness: 0.93 });
  const skin = mat(0xc9a27c, 0.86);
  const dark = mat(0x1d2426, 0.8);
  const sash = mat(0xd6c7a2, 0.9);
  cylinder(group, 0.3, 0.66, 1.75, robe, 0, 0.88, 0, 9);
  cylinder(group, 0.34, 0.34, 0.22, sash, 0, 1.24, 0, 9);
  box(group, 0.82, 0.28, 0.38, robe, 0, 1.82, 0);
  cylinder(group, 0.18, 0.2, 0.34, robe, 0, 2.06, 0, 8);
  add(group, new THREE.SphereGeometry(0.23, 10, 8), skin, 0, 2.3, 0);
  add(group, new THREE.SphereGeometry(0.235, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.55), dark, 0, 2.38, 0);
  cylinder(group, 0.1, 0.13, 0.18, dark, 0, 2.54, 0, 7);
  for (const s of [-1, 1]) {
    const arm = cylinder(group, 0.09, 0.12, 0.9, robe, s * 0.42, 1.74, 0.04, 6);
    arm.rotation.z = s * 0.34;
    arm.rotation.x = -0.18;
    add(group, new THREE.SphereGeometry(0.11, 7, 6), skin, s * 0.55, 1.34, 0.12);
  }
  group.position.set(x, y, z);
  group.rotation.y = ry;
  group.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });
  parent.add(group);
}

function addSeaStack(parent, x, z, height, radius, seed) {
  const rand = mulberry32(seed);
  const group = new THREE.Group();
  const base = WATER_Y - 5;
  const rockMaterials = [mats.graniteDark, mats.granite, mats.graniteLight];
  const columns = 2 + (seed % 3);
  for (let c = 0; c < columns; c++) {
    const h = height * (0.55 + rand() * 0.5);
    const r = radius * (0.42 + rand() * 0.32);
    const geo = new THREE.CylinderGeometry(r * (0.26 + rand() * 0.22), r, h, 7 + (rand() * 3 | 0), 5);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const px = pos.getX(i);
      const py = pos.getY(i);
      const pz = pos.getZ(i);
      const angle = Math.atan2(pz, px);
      const k = (py + h * 0.5) / h;
      const wobble = 0.78 + 0.3 * Math.sin(angle * 3 + seed * 0.6) + 0.14 * Math.sin(angle * 7 - k * 5);
      pos.setX(i, px * wobble + Math.sin(k * 8 + angle * 2) * r * 0.08);
      pos.setZ(i, pz * wobble + Math.cos(k * 7 - angle * 3) * r * 0.08);
      pos.setY(i, py + Math.sin(angle * 4 + seed) * h * 0.02);
    }
    geo.computeVertexNormals();
    geo.translate(x + (rand() - 0.5) * radius * 0.8, base + h * 0.5, z + (rand() - 0.5) * radius * 0.8);
    const mesh = new THREE.Mesh(geo, rockMaterials[(c + seed) % rockMaterials.length]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  for (let i = 0; i < 5; i++) {
    const r = radius * (0.25 + rand() * 0.4);
    const geo = new THREE.DodecahedronGeometry(r, 0);
    geo.scale(1.1, 0.6 + rand() * 0.7, 0.9);
    geo.rotateY(rand() * 6.2);
    geo.translate(x + (rand() - 0.5) * radius * 1.5, WATER_Y + rand() * height * 0.5, z + (rand() - 0.5) * radius * 1.5);
    const mesh = new THREE.Mesh(geo, rockMaterials[(i + seed + 1) % rockMaterials.length]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  parent.add(group);
  return { x, z, height, radius };
}

function addSteps(parent, cx, cz, topY, bottomY, width, count, depth, material) {
  const rise = (topY - bottomY) / count;
  for (let i = 0; i < count; i++) {
    const y = topY - rise * (i + 0.5);
    box(parent, width - i * 0.12, rise + 0.16, depth, material, cx, y, cz + i * depth, 0);
  }
  for (let i = 1; i < count; i += 2) {
    box(parent, 0.55, 1.2, depth * 0.8, material, cx - width * 0.5 + 1.4, topY - rise * i + 0.3, cz + i * depth, 0);
    box(parent, 0.55, 1.2, depth * 0.8, material, cx + width * 0.5 - 1.4, topY - rise * i + 0.3, cz + i * depth, 0);
  }
}

function makeBoat(x, z, scale, seed) {
  const group = new THREE.Group();
  const hullMat = mat(0x4e3522, 0.92);
  const darkWood = mat(0x2d2117, 0.94);
  const deckMat = mat(0x7b5a36, 0.9);
  const sailMat = new THREE.MeshStandardMaterial({ color: 0xc9ad78, roughness: 0.92, side: THREE.DoubleSide });
  const redMat = new THREE.MeshStandardMaterial({ color: 0x9e3527, roughness: 0.88, side: THREE.DoubleSide });
  const hull = new THREE.Mesh(new THREE.CapsuleGeometry(1.35, 5.2, 6, 10), hullMat);
  hull.rotation.x = Math.PI / 2;
  hull.scale.set(1.15, 0.62, 1);
  hull.position.y = 0.72;
  hull.castShadow = true;
  group.add(hull);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.18, 6.2), deckMat);
  deck.position.y = 0.72;
  deck.castShadow = true;
  group.add(deck);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.25, 2.3), darkWood);
  cabin.position.set(0, 1.45, -0.35);
  cabin.castShadow = true;
  group.add(cabin);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.18, 7.2, 7), darkWood);
  mast.position.set(0, 4.1, 0.7);
  mast.castShadow = true;
  group.add(mast);
  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.7, 6), darkWood);
  boom.rotation.z = Math.PI / 2;
  boom.position.set(0, 6.2, 0.78);
  group.add(boom);
  const sail = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 4.3, 4, 3), sailMat);
  sail.position.set(0.05, 4.25, 0.8);
  sail.rotation.y = 0.18;
  group.add(sail);
  for (let i = 0; i < 4; i++) {
    const batten = new THREE.Mesh(new THREE.BoxGeometry(3.45, 0.055, 0.06), darkWood);
    batten.position.set(0.05, 2.55 + i * 1.03, 0.82);
    batten.rotation.y = 0.18;
    group.add(batten);
  }
  const pennant = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.35), redMat);
  pennant.position.set(0, 7.7, 0.7);
  group.add(pennant);
  const bow = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.1, 0.18), darkWood);
  bow.position.set(0, 1.2, 3.65);
  group.add(bow);
  group.position.set(x, WATER_Y - 0.1, z);
  group.scale.setScalar(scale);
  group.rotation.y = (seed % 7) * 0.42;
  group.userData = {
    baseX: x,
    baseZ: z,
    phase: (seed % 13) * 0.61,
    speed: 0.55 + (seed % 5) * 0.12,
    turn: (seed % 2 ? 1 : -1) * (0.02 + (seed % 4) * 0.004),
    pennant,
  };
  return group;
}

function makeWater() {
  const geometry = new THREE.PlaneGeometry(3800, 2500, 190, 130);
  geometry.rotateX(-Math.PI / 2);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uDeep: { value: new THREE.Color(0x164b58) },
      uShallow: { value: new THREE.Color(0x3d8b88) },
      uSky: { value: new THREE.Color(0xa8c7c9) },
      uSunColor: { value: new THREE.Color(0xffe3b8) },
      uSunDir: { value: new THREE.Vector3(0.72, 0.36, 0.46).normalize() },
      uOpacity: { value: 0.93 },
      fogColor: { value: new THREE.Color(0xc4d0d4) },
      fogNear: { value: 560 },
      fogFar: { value: 3100 },
    },
    vertexShader: `
      uniform float uTime;
      varying vec3 vWorld;
      varying vec3 vNormal;
      varying float vWave;
      #include <fog_pars_vertex>
      void main() {
        vec3 p = position;
        vec4 world = modelMatrix * vec4(p, 1.0);
        float x = world.x;
        float z = world.z;
        float w1 = sin(x * 0.045 + uTime * 0.9) * 0.55;
        float w2 = sin(z * 0.062 - uTime * 1.15) * 0.42;
        float w3 = sin((x + z) * 0.021 + uTime * 0.52) * 0.9;
        float w4 = sin((x - z) * 0.11 - uTime * 1.7) * 0.17;
        float h = w1 + w2 + w3 + w4;
        p.y += h;
        vWave = h;
        world = modelMatrix * vec4(p, 1.0);
        vWorld = world.xyz;
        float nx = cos(x * 0.045 + uTime * 0.9) * 0.045 * 0.55
          + cos((x + z) * 0.021 + uTime * 0.52) * 0.021 * 0.9
          + cos((x - z) * 0.11 - uTime * 1.7) * 0.11 * 0.17;
        float nz = cos(z * 0.062 - uTime * 1.15) * 0.062 * 0.42
          + cos((x + z) * 0.021 + uTime * 0.52) * 0.021 * 0.9
          - cos((x - z) * 0.11 - uTime * 1.7) * 0.11 * 0.17;
        vNormal = normalize(vec3(-nx, 1.0, -nz));
        vec4 mvPosition = viewMatrix * world;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: `
      uniform vec3 uDeep;
      uniform vec3 uShallow;
      uniform vec3 uSky;
      uniform vec3 uSunColor;
      uniform vec3 uSunDir;
      uniform float uTime;
      uniform float uOpacity;
      varying vec3 vWorld;
      varying vec3 vNormal;
      varying float vWave;
      #include <fog_pars_fragment>
      void main() {
        vec3 viewDir = normalize(cameraPosition - vWorld);
        vec3 normal = normalize(vNormal);
        vec3 sunDir = normalize(uSunDir);
        float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.0);
        vec3 color = mix(uDeep, uShallow, clamp(0.28 + vWave * 0.3, 0.0, 1.0));
        color = mix(color, uSky, fresnel * 0.62);
        vec3 halfDir = normalize(sunDir + viewDir);
        float spec = pow(max(dot(normal, halfDir), 0.0), 150.0);
        color += uSunColor * spec * 1.15;
        color += uSunColor * max(dot(normal, sunDir), 0.0) * 0.06;
        float crest = smoothstep(0.92, 1.38, vWave);
        float ripple = sin(vWorld.x * 0.9 + vWorld.z * 1.1 + uTime * 3.2) * 0.5 + 0.5;
        color = mix(color, vec3(0.82, 0.91, 0.9), crest * (0.06 + ripple * 0.1));
        gl_FragColor = vec4(color, uOpacity);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
    fog: true,
    toneMapped: true,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'laoshan-sea-water';
  mesh.position.set(0, WATER_Y, 1600);
  mesh.renderOrder = 1;
  mesh.frustumCulled = false;
  return mesh;
}

function makeCloudSheet(texture, w, d, x, y, z, opacity, drift, phase) {
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    color: 0xf2f6f4,
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: true,
    toneMapped: true,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, y, z);
  mesh.renderOrder = 2;
  mesh.userData = { baseX: x, baseY: y, baseZ: z, drift, phase, baseOpacity: opacity };
  return mesh;
}

function buildTemple(parent, dynamicGroup, tileMaterial, goldMaterial) {
  let maxGround = 0;
  for (let dx = -38; dx <= 38; dx += 9.5) {
    for (let dz = -27; dz <= 27; dz += 9) {
      maxGround = Math.max(maxGround, heightAt(TEMPLE.x + dx, TEMPLE.z + dz));
    }
  }
  const platformY = Math.max(27, maxGround + 2.4);
  const cx = TEMPLE.x;
  const cz = TEMPLE.z;

  const stone = new THREE.MeshStandardMaterial({ map: sharedTextures.stoneMap, color: 0xb2ac9d, roughness: 1.0 });
  const stoneDark = new THREE.MeshStandardMaterial({ map: sharedTextures.stoneMap, color: 0x837f73, roughness: 1.0 });
  const wall = mat(0x8e3c2f, 0.94);
  const red = mat(0x7c2c23, 0.9);
  const cream = mat(0xd8c9a9, 0.92);
  const darkWood = mat(0x38271c, 0.94);
  const bronze = mat(0x65573e, 0.55, 0.35);

  const headland = new THREE.CylinderGeometry(44, 59, platformY + 9, 15, 5);
  const hp = headland.attributes.position;
  const rand = mulberry32(1187);
  for (let i = 0; i < hp.count; i++) {
    const px = hp.getX(i);
    const py = hp.getY(i);
    const pz = hp.getZ(i);
    const angle = Math.atan2(pz, px);
    const k = (py + (platformY + 9) * 0.5) / (platformY + 9);
    const wobble = 0.9 + 0.09 * Math.sin(angle * 4 + 1.2) + 0.05 * Math.sin(angle * 9 - k * 4);
    hp.setX(i, px * wobble + (rand() - 0.5) * 1.2);
    hp.setZ(i, pz * wobble + (rand() - 0.5) * 1.2);
  }
  headland.computeVertexNormals();
  headland.translate(cx, platformY - (platformY + 9) * 0.5, cz);
  const headlandMesh = new THREE.Mesh(headland, mats.graniteDark);
  headlandMesh.castShadow = true;
  headlandMesh.receiveShadow = true;
  parent.add(headlandMesh);

  box(parent, 70, 2.0, 54, stone, cx, platformY - 1.0, cz);
  box(parent, 58, 0.35, 42, stoneDark, cx, platformY + 0.18, cz);

  const mainZ = cz - 13;
  box(parent, 29, 1.3, 18, stoneDark, cx, platformY + 0.8, mainZ);
  box(parent, 28, 9.6, 17, wall, cx, platformY + 5.7, mainZ);
  for (let i = -2; i <= 2; i++) {
    cylinder(parent, 0.42, 0.48, 9.6, red, cx + i * 5.2, platformY + 5.1, mainZ + 8.7, 8);
  }
  box(parent, 5.2, 6.0, 0.42, darkWood, cx, platformY + 3.8, mainZ + 8.52);
  for (let i = -1; i <= 1; i += 2) {
    box(parent, 2.0, 3.2, 0.2, cream, cx + i * 7.4, platformY + 5.2, mainZ + 8.55);
  }
  addRoof(parent, 37, 24, 4.8, tileMaterial, cx, platformY + 10.3, mainZ, 0, goldMaterial);
  box(parent, 20, 2.8, 12, wall, cx, platformY + 14.2, mainZ);
  addRoof(parent, 29, 18, 4.1, tileMaterial, cx, platformY + 15.4, mainZ, 0, goldMaterial);

  const plaqueMat = new THREE.MeshStandardMaterial({ map: makePlaqueTexture('太清宫', 'TAIQING PALACE'), roughness: 0.82 });
  add(parent, new THREE.PlaneGeometry(6.2, 1.9), plaqueMat, cx, platformY + 8.5, mainZ + 8.74, 0);

  for (const s of [-1, 1]) {
    const sx = cx + s * 33;
    const sideZ = cz - 2;
    box(parent, 13, 1.0, 12, stoneDark, sx, platformY + 0.6, sideZ);
    box(parent, 12.2, 6.4, 11.2, wall, sx, platformY + 3.6, sideZ);
    for (let i = -1; i <= 1; i++) {
      cylinder(parent, 0.3, 0.34, 6.4, red, sx + i * 3.4, platformY + 3.2, sideZ + 5.7, 7);
    }
    addRoof(parent, 17, 15, 3.6, tileMaterial, sx, platformY + 7.1, sideZ, 0, goldMaterial);
    box(parent, 2.4, 3.4, 0.24, darkWood, sx, platformY + 2.7, sideZ + 5.66);
  }

  const gateZ = cz + 23;
  for (const s of [-1, 1]) {
    box(parent, 4.8, 6.8, 6.2, wall, cx + s * 5.4, platformY + 3.4, gateZ);
    cylinder(parent, 0.34, 0.38, 6.8, red, cx + s * 2.8, platformY + 3.4, gateZ + 3.3, 7);
  }
  addRoof(parent, 17, 10, 3.5, tileMaterial, cx, platformY + 7.0, gateZ, 0, goldMaterial);
  add(parent, new THREE.PlaneGeometry(4.6, 1.4), plaqueMat.clone(), cx, platformY + 5.8, gateZ + 3.14, 0);

  for (const s of [-1, 1]) {
    const wx = cx + s * 27;
    box(parent, 0.7, 1.5, 29, stone, wx, platformY + 0.75, cz + 7);
    for (let i = 0; i < 5; i++) {
      box(parent, 0.32, 2.0, 0.32, stone, wx, platformY + 1.0, cz - 6 + i * 7);
    }
  }

  cylinder(parent, 2.1, 2.7, 1.0, stoneDark, cx, platformY + 0.7, cz + 7, 12);
  cylinder(parent, 1.5, 1.9, 2.3, bronze, cx, platformY + 2.3, cz + 7, 10);
  add(parent, new THREE.SphereGeometry(1.5, 12, 8), bronze, cx, platformY + 3.7, cz + 7);
  add(parent, new THREE.ConeGeometry(1.9, 1.2, 10), goldMaterial, cx, platformY + 4.8, cz + 7);

  for (const [lx, lz] of [[-19, 15], [19, 15], [-19, -1], [19, -1]]) {
    cylinder(parent, 0.55, 0.75, 1.1, stone, cx + lx, platformY + 0.7, cz + lz, 8);
    cylinder(parent, 0.28, 0.4, 2.0, stone, cx + lx, platformY + 2.1, cz + lz, 6);
    box(parent, 1.1, 1.0, 1.1, stone, cx + lx, platformY + 3.3, cz + lz);
    box(parent, 1.4, 0.22, 1.4, stoneDark, cx + lx, platformY + 3.9, cz + lz);
  }

  const priests = [
    [-9, 17, 0.3, 0x33495c],
    [-2, 13, 2.5, 0x415568],
    [8, 18, -0.4, 0x3a4b5e],
    [14, 10, 3.0, 0x4c5b66],
    [-15, 8, 1.4, 0x2f4254],
  ];
  priests.forEach(([px, pz, ry, color]) => addPriest(parent, cx + px, platformY + 0.35, cz + pz, ry, color));

  const stepTop = platformY;
  const stepBottom = WATER_Y + 1.6;
  const stepDepth = 1.55;
  const stepCount = 14;
  const rise = (stepTop - stepBottom) / stepCount;
  for (let i = 0; i < stepCount; i++) {
    const y = stepTop - rise * (i + 0.5);
    const h = y - stepBottom + 0.2;
    box(parent, 11.5 - i * 0.16, h, stepDepth, stone, cx, stepBottom + h * 0.5, cz + 28 + i * stepDepth);
  }
  for (let i = 1; i < stepCount; i += 2) {
    const sy = stepTop - rise * i;
    for (const s of [-1, 1]) {
      cylinder(parent, 0.26, 0.32, 1.3, stoneDark, cx + s * 5.0, sy + 0.65, cz + 28 + i * stepDepth, 6);
    }
  }

  const pierZ = cz + 28 + stepCount * stepDepth + 8;
  box(parent, 12, 0.6, 19, darkWood, cx, WATER_Y + 1.4, pierZ);
  for (const s of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      cylinder(parent, 0.18, 0.22, 4.2, darkWood, cx + s * 5.2, WATER_Y + 0.6, pierZ - 7 + i * 5, 6);
    }
  }

  for (const [fx, fz, fh] of [[-27, 27, 11], [27, 27, 11], [-39, 3, 11.5], [39, 3, 11.5]]) {
    cylinder(parent, 0.28, 0.36, fh, darkWood, cx + fx, platformY + fh * 0.5, cz + fz, 7);
    add(parent, new THREE.SphereGeometry(0.45, 8, 6), goldMaterial, cx + fx, platformY + fh + 0.35, cz + fz);
    const flagTexture = makeFlagTexture(fx < 0 ? '道' : '山');
    const material = new THREE.MeshStandardMaterial({ map: flagTexture, roughness: 0.9, side: THREE.DoubleSide });
    const geometry = new THREE.PlaneGeometry(2.5, 3.8, 6, 4);
    geometry.translate(1.26, 0, 0);
    const base = new Float32Array(geometry.attributes.position.array);
    const flag = new THREE.Mesh(geometry, material);
    flag.position.set(cx + fx, platformY + fh - 2.4, cz + fz);
    flag.rotation.y = -0.35;
    flag.castShadow = true;
    dynamicGroup.add(flag);
    flag.userData = { geometry, base, phase: fx * 0.13 + fz * 0.07, width: 2.5 };
  }

  const pineSpots = [
    [cx - 31, platformY, cz - 20, 12, 4.6, 11],
    [cx + 30, platformY, cz - 20, 14, 5.2, 12],
    [cx - 38, platformY, cz + 12, 11, 4.2, 13],
    [cx + 38, platformY, cz + 14, 12.5, 4.8, 14],
    [cx - 15, platformY, cz + 26, 8.5, 3.4, 15],
    [cx + 15, platformY, cz + 26, 9.5, 3.8, 16],
  ];
  pineSpots.forEach(([px, py, pz, h, spread, seed]) => addPine(parent, px, py, pz, h, spread, seed));

  return { platformY, promontory: { x: cx, z: cz }, priests: priests.length, steps: stepCount, flags: 4 };
}

export function buildLaoshanOverlay() {
  const group = new THREE.Group();
  group.name = 'laoshan-signature-overlay';
  const staticGroup = new THREE.Group();
  const dynamicGroup = new THREE.Group();
  const tileTexture = makeTileTexture();
  tileTexture.repeat.set(2.2, 1.0);
  const tileMaterial = new THREE.MeshStandardMaterial({ map: tileTexture, color: 0x6a7b74, roughness: 0.93, side: THREE.DoubleSide });
  const goldMaterial = mat(0x9a773a, 0.52, 0.28);
  const stone = new THREE.MeshStandardMaterial({ map: sharedTextures.stoneMap, color: 0xa9a496, roughness: 1.0 });

  const temple = buildTemple(staticGroup, dynamicGroup, tileMaterial, goldMaterial);

  const stacks = [];
  const stackDefs = [
    [205, 520, 54, 19, 3],
    [268, 565, 72, 24, 4],
    [338, 532, 46, 16, 5],
    [405, 598, 62, 21, 6],
    [468, 540, 38, 14, 7],
    [-352, 548, 58, 20, 8],
    [-422, 590, 76, 25, 9],
    [-486, 546, 43, 16, 10],
    [30, 625, 28, 12, 11],
    [-120, 595, 34, 13, 12],
  ];
  stackDefs.forEach(([x, z, h, r, seed]) => stacks.push(addSeaStack(staticGroup, x, z, h, r, seed)));

  const shoreRocks = [
    [-310, 505, 18, 10, 21],
    [-170, 528, 14, 9, 22],
    [-60, 512, 11, 8, 23],
    [96, 526, 13, 9, 24],
    [150, 548, 17, 10, 25],
    [360, 505, 16, 10, 26],
    [-262, 522, 9, 7, 27],
  ];
  shoreRocks.forEach(([x, z, h, r, seed]) => addSeaStack(staticGroup, x, z, h, r, seed));

  const cliffPines = [
    [205, 520, 54, 15, 5.4, 31],
    [268, 565, 72, 16, 5.8, 32],
    [-352, 548, 58, 14, 5.0, 33],
    [405, 598, 62, 15, 5.2, 34],
    [-486, 546, 43, 11, 4.2, 35],
  ];
  cliffPines.forEach(([x, z, cliff, h, spread, seed]) => addPine(staticGroup, x, WATER_Y + cliff * 0.94, z, h, spread, seed));
  const shorePines = [
    [-170, 478, 14, 5.2, 36],
    [96, 486, 12, 4.4, 37],
    [338, 486, 13, 4.8, 38],
    [-310, 482, 15, 5.4, 39],
  ];
  shorePines.forEach(([x, z, h, spread, seed]) => {
    const y = heightAt(x, z);
    if (y > WATER_Y + 1) addPine(staticGroup, x, y - 0.4, z, h, spread, seed);
  });

  const jufengStele = new THREE.Group();
  box(jufengStele, 2.0, 4.8, 1.2, stone, 0, 2.4, 0);
  box(jufengStele, 3.0, 0.7, 2.0, stone, 0, 0.35, 0);
  add(jufengStele, new THREE.PlaneGeometry(1.4, 2.6), new THREE.MeshStandardMaterial({ map: makePlaqueTexture('巨峰', '1132 M'), roughness: 0.85 }), 0, 3.2, 0.63, 0);
  jufengStele.position.set(22, 269, -414);
  jufengStele.rotation.y = 0.25;
  staticGroup.add(jufengStele);

  const merged = mergeStaticGroup(staticGroup);
  merged.name = 'laoshan-merged-static';
  group.add(merged);

  const water = makeWater();
  group.add(water);

  const boats = [];
  const boatDefs = [
    [-160, 555, 1.0, 1],
    [-88, 610, 1.15, 2],
    [58, 575, 0.92, 3],
    [142, 628, 1.05, 4],
    [250, 655, 1.2, 5],
    [-285, 640, 0.98, 6],
  ];
  boatDefs.forEach(([x, z, s, seed]) => {
    const boat = makeBoat(x, z, s, seed);
    boats.push(boat);
    dynamicGroup.add(boat);
  });

  const clouds = [];
  const cloudTex = sharedTextures.cloudMap;
  const cloudDefs = [
    [520, 220, 40, 22, 640, 0.24, 16, 0.4],
    [620, 260, -250, 34, 700, 0.2, 20, 1.7],
    [420, 180, 140, 152, -360, 0.24, 12, 2.9],
    [500, 220, -210, 186, -470, 0.2, 15, 4.2],
    [610, 240, 330, 116, -250, 0.17, 18, 5.4],
  ];
  cloudDefs.forEach(([w, d, x, y, z, op, drift, phase]) => {
    const cloud = makeCloudSheet(cloudTex, w, d, x, y, z, op, drift, phase);
    clouds.push(cloud);
    dynamicGroup.add(cloud);
  });

  const foam = [];
  stacks.forEach((stack, index) => {
    for (let ring = 0; ring < 2; ring++) {
      const radius = stack.radius * (0.95 + ring * 0.32);
      const material = new THREE.MeshBasicMaterial({
        color: 0xe8f3ef,
        transparent: true,
        opacity: 0.2 - ring * 0.06,
        depthWrite: false,
        side: THREE.DoubleSide,
        fog: true,
      });
      const mesh = new THREE.Mesh(new THREE.RingGeometry(radius, radius + 1.0, 36), material);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(stack.x, WATER_Y + 1.0, stack.z);
      mesh.renderOrder = 3;
      mesh.userData = { phase: index * 1.7 + ring * 0.9, baseOpacity: material.opacity };
      foam.push(mesh);
      dynamicGroup.add(mesh);
    }
  });

  const sprayPositions = new Float32Array(240 * 3);
  const spraySeeds = new Float32Array(240);
  stacks.forEach((stack, index) => {
    for (let i = 0; i < 24; i++) {
      const k = index * 24 + i;
      const angle = Math.random() * Math.PI * 2;
      const radius = stack.radius * (0.8 + Math.random() * 0.3);
      sprayPositions[k * 3] = stack.x + Math.cos(angle) * radius;
      sprayPositions[k * 3 + 1] = WATER_Y + 1 + Math.random() * 9;
      sprayPositions[k * 3 + 2] = stack.z + Math.sin(angle) * radius;
      spraySeeds[k] = Math.random();
    }
  });
  const sprayGeo = new THREE.BufferGeometry();
  sprayGeo.setAttribute('position', new THREE.BufferAttribute(sprayPositions, 3));
  const spray = new THREE.Points(sprayGeo, new THREE.PointsMaterial({
    color: 0xe7f4f0,
    size: 1.5,
    transparent: true,
    opacity: 0.36,
    depthWrite: false,
    sizeAttenuation: true,
  }));
  spray.frustumCulled = false;
  spray.renderOrder = 4;
  dynamicGroup.add(spray);

  group.add(dynamicGroup);

  const sprayBase = new Float32Array(sprayPositions);
  const flags = dynamicGroup.children.filter((child) => child.userData && child.userData.geometry);
  const dayWater = {
    deep: new THREE.Color(0x164b58),
    shallow: new THREE.Color(0x3d8b88),
    sky: new THREE.Color(0xa8c7c9),
    sun: new THREE.Color(0xffe3b8),
    cloud: new THREE.Color(0xf2f6f4),
  };
  const duskWater = {
    deep: new THREE.Color(0x1a2434),
    shallow: new THREE.Color(0x4b5d68),
    sky: new THREE.Color(0xd9a074),
    sun: new THREE.Color(0xff9260),
    cloud: new THREE.Color(0xf1c6ab),
  };

  function setEnvironment(mix) {
    const uniforms = water.material.uniforms;
    uniforms.uDeep.value.copy(dayWater.deep).lerp(duskWater.deep, mix);
    uniforms.uShallow.value.copy(dayWater.shallow).lerp(duskWater.shallow, mix);
    uniforms.uSky.value.copy(dayWater.sky).lerp(duskWater.sky, mix);
    uniforms.uSunColor.value.copy(dayWater.sun).lerp(duskWater.sun, mix);
    for (const cloud of clouds) {
      cloud.material.color.copy(dayWater.cloud).lerp(duskWater.cloud, mix);
    }
  }

  function update(elapsed, dt) {
    water.material.uniforms.uTime.value = elapsed;

    for (const boat of boats) {
      const data = boat.userData;
      boat.position.x = data.baseX + Math.sin(elapsed * 0.055 + data.phase) * 10;
      boat.position.z = data.baseZ + Math.cos(elapsed * 0.045 + data.phase) * 6;
      boat.position.y = WATER_Y - 0.1 + Math.sin(elapsed * 0.9 + data.phase) * 0.28;
      boat.rotation.z = Math.sin(elapsed * 0.75 + data.phase) * 0.035;
      boat.rotation.x = Math.cos(elapsed * 0.62 + data.phase) * 0.025;
      boat.rotation.y += dt * data.turn;
      data.pennant.rotation.y = Math.sin(elapsed * 5 + data.phase) * 0.5;
    }

    for (const flag of flags) {
      const data = flag.userData;
      const position = data.geometry.attributes.position;
      for (let i = 0; i < position.count; i++) {
        const x = data.base[i * 3];
        const y = data.base[i * 3 + 1];
        const wave = Math.sin(elapsed * 3.4 + data.phase + x * 1.4 + y * 0.5) * 0.22 * (x / data.width);
        position.setZ(i, wave);
      }
      position.needsUpdate = true;
      data.geometry.computeVertexNormals();
    }

    for (const cloud of clouds) {
      const data = cloud.userData;
      cloud.position.x = data.baseX + Math.sin(elapsed * 0.018 + data.phase) * data.drift * 4;
      cloud.position.z = data.baseZ + Math.cos(elapsed * 0.014 + data.phase) * data.drift * 2;
      cloud.material.opacity = data.baseOpacity * (0.82 + 0.18 * Math.sin(elapsed * 0.11 + data.phase));
    }

    for (const ring of foam) {
      const data = ring.userData;
      const pulse = 1 + 0.13 * Math.sin(elapsed * 0.9 + data.phase);
      ring.scale.setScalar(pulse);
      ring.material.opacity = data.baseOpacity * (0.7 + 0.3 * Math.sin(elapsed * 0.8 + data.phase));
    }

    const sprayAttr = spray.geometry.attributes.position;
    for (let i = 0; i < sprayAttr.count; i++) {
      const seed = spraySeeds[i];
      sprayAttr.setX(i, sprayBase[i * 3] + Math.sin(elapsed * 0.5 + seed * 6.2) * 1.6);
      sprayAttr.setY(i, WATER_Y + 1 + ((elapsed * 2.4 + seed * 7) % 9));
      sprayAttr.setZ(i, sprayBase[i * 3 + 2] + Math.cos(elapsed * 0.45 + seed * 5.1) * 1.4);
    }
    sprayAttr.needsUpdate = true;
  }

  return {
    group,
    water,
    boats,
    clouds,
    flags,
    temple,
    setEnvironment,
    update,
    stats: {
      seaStacks: stacks.length + shoreRocks.length,
      boats: boats.length,
      priests: temple.priests,
      coastalPines: cliffPines.length + shorePines.length + 6,
      clouds: clouds.length,
      flags: temple.flags,
      waves: 'shader',
      waterTransparent: true,
    },
  };
}
