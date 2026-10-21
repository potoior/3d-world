import * as THREE from 'three';
import { mergeStaticGroup } from './geometry.js';
import { colliders } from './architectures.js';

export const CAVE = {
  rx: 112,
  rz: 152,
  height: 78,
  waterY: -1.55,
};

export function riverX(z) {
  return -34 + 11 * Math.sin(z * 0.02) + 5 * Math.sin(z * 0.057 + 1.3);
}

export function riverHalf(z) {
  return 9.5 + 2.2 * Math.sin(z * 0.031 + 0.4);
}

const pools = [
  { x: 52, z: -64, rx: 22, rz: 15 },
  { x: -2, z: 103, rx: 11, rz: 8 },
  { x: 63, z: 70, rx: 14, rz: 10 },
];

export function caveFloorHeight(x, z) {
  let y =
    0.3 * Math.sin(x * 0.06) * Math.cos(z * 0.045) +
    0.16 * Math.sin(x * 0.135 + z * 0.09) +
    0.06 * Math.sin(x * 0.31 - z * 0.17);

  const d = Math.abs(x - riverX(z));
  const shore = riverHalf(z) + 7.5;
  if (d < shore) {
    const t = 1 - d / shore;
    y -= 4.8 * Math.pow(t, 1.55);
  }

  for (const pool of pools) {
    const dx = (x - pool.x) / pool.rx;
    const dz = (z - pool.z) / pool.rz;
    const radial = Math.hypot(dx, dz);
    if (radial < 1.5) {
      y -= 3.25 * Math.pow(1 - radial / 1.5, 1.6);
    }
  }
  return y;
}

export function caveCeilingHeight(x, z) {
  const nx = x / CAVE.rx;
  const nz = z / CAVE.rz;
  const r = Math.min(1, Math.hypot(nx, nz));
  if (r >= 1) return 0;
  const base = CAVE.height * Math.pow(1 - Math.pow(r, 2.1), 0.6);
  const noise =
    Math.sin(x * 0.11 + z * 0.07) * 3.4 +
    Math.sin(x * 0.37 - z * 0.23) * 1.5 +
    Math.cos(x * 0.09 - z * 0.19) * 2.1 +
    Math.sin(x * 0.026 + z * 0.041 + 2.2) * 3.2;
  return base + noise * (0.3 + 0.7 * (1 - r));
}

export function caveWaterDepth(x, z) {
  return CAVE.waterY - caveFloorHeight(x, z);
}

export function insideCave(x, z, margin = 0.94) {
  const nx = x / CAVE.rx;
  const nz = z / CAVE.rz;
  return nx * nx + nz * nz < margin * margin;
}

function makeCaveRockTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const g = c.getContext('2d');
  const base = g.createLinearGradient(0, 0, 512, 512);
  base.addColorStop(0, '#9c8d73');
  base.addColorStop(0.34, '#857961');
  base.addColorStop(0.68, '#776d59');
  base.addColorStop(1, '#8e8067');
  g.fillStyle = base;
  g.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 260; i++) {
    const x = (Math.sin(i * 37.31 + 2.7) * 0.5 + 0.5) * 512;
    const y = (Math.cos(i * 53.17 - 1.1) * 0.5 + 0.5) * 512;
    const r = 2 + (i % 11) * 4.5;
    const a = 0.025 + (i % 7) * 0.012;
    const rg = g.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, i % 3 ? `rgba(214,198,163,${a})` : `rgba(48,42,32,${a * 1.4})`);
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rg;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }

  for (let i = 0; i < 42; i++) {
    const y = (i / 42) * 512 + (i % 3) * 4;
    g.strokeStyle = i % 3 ? 'rgba(58,51,39,0.16)' : 'rgba(222,209,177,0.14)';
    g.lineWidth = 1 + (i % 4);
    g.beginPath();
    for (let x = 0; x <= 512; x += 16) {
      const yy = y + Math.sin(x * 0.027 + i * 1.7) * 4 + Math.sin(x * 0.061 + i) * 2;
      if (x === 0) g.moveTo(x, yy);
      else g.lineTo(x, yy);
    }
    g.stroke();
  }

  g.lineCap = 'round';
  for (let i = 0; i < 34; i++) {
    const x = (Math.sin(i * 21.3 + 5) * 0.5 + 0.5) * 512;
    const y = (Math.cos(i * 41.7) * 0.5 + 0.5) * 512;
    g.strokeStyle = i % 2 ? 'rgba(47,42,32,0.28)' : 'rgba(231,219,190,0.22)';
    g.lineWidth = 1 + (i % 3);
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + 8, y + 26);
    g.lineTo(x - 4, y + 54);
    g.lineTo(x + 11, y + 81);
    g.stroke();
  }

  for (let i = 0; i < 120; i++) {
    const x = (Math.sin(i * 17.9) * 0.5 + 0.5) * 512;
    const y = (Math.cos(i * 29.3) * 0.5 + 0.5) * 512;
    g.fillStyle = i % 4 ? 'rgba(48,44,35,0.12)' : 'rgba(236,224,196,0.14)';
    g.beginPath();
    g.ellipse(x, y, 2 + (i % 5) * 3, 1.5 + (i % 3) * 2, i, 0, Math.PI * 2);
    g.fill();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function makeGlowTexture() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const g = c.getContext('2d');
  const rg = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  rg.addColorStop(0, 'rgba(255,255,255,0.95)');
  rg.addColorStop(0.24, 'rgba(255,255,255,0.42)');
  rg.addColorStop(0.62, 'rgba(255,255,255,0.08)');
  rg.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = rg;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const rockTexture = makeCaveRockTexture();
const glowTexture = makeGlowTexture();

export const caveMaterials = {
  rock: new THREE.MeshStandardMaterial({
    map: rockTexture,
    vertexColors: true,
    roughness: 0.93,
    metalness: 0.02,
  }),
  shell: new THREE.MeshStandardMaterial({
    map: rockTexture,
    vertexColors: true,
    roughness: 0.96,
    metalness: 0.01,
    side: THREE.DoubleSide,
  }),
  flowstone: new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.58,
    metalness: 0.03,
    side: THREE.DoubleSide,
  }),
  helictite: new THREE.MeshStandardMaterial({
    color: 0xf0e5cd,
    roughness: 0.36,
    metalness: 0.06,
    emissive: 0x20180c,
    emissiveIntensity: 0.55,
  }),
  wood: new THREE.MeshStandardMaterial({ color: 0x64462d, roughness: 0.86 }),
  metal: new THREE.MeshStandardMaterial({ color: 0x3d4038, roughness: 0.55, metalness: 0.55 }),
  lamp: new THREE.MeshStandardMaterial({
    color: 0xffdcae,
    emissive: 0xffad55,
    emissiveIntensity: 2.4,
    roughness: 0.3,
  }),
  glowTexture,
};

function makeWaterMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uDeep: { value: new THREE.Color(0x061a1e) },
      uShallow: { value: new THREE.Color(0x1b5553) },
      uGlow: { value: new THREE.Color(0x6fe6dc) },
      uWarm: { value: new THREE.Color(0xffc183) },
      uMist: { value: new THREE.Color(0x315f63) },
      fogColor: { value: new THREE.Color(0x0a191b) },
      fogNear: { value: 70 },
      fogFar: { value: 480 },
    },
    vertexShader: `
      varying vec3 vWorldPos;
      varying vec2 vUv;
      #include <fog_pars_vertex>
      void main() {
        vUv = uv;
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorldPos = world.xyz;
        vec4 mvPosition = viewMatrix * world;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uDeep;
      uniform vec3 uShallow;
      uniform vec3 uGlow;
      uniform vec3 uWarm;
      uniform vec3 uMist;
      #include <fog_pars_fragment>
      varying vec3 vWorldPos;
      varying vec2 vUv;

      void main() {
        vec2 p = vWorldPos.xz;
        float w1 = sin(p.x * 0.47 + uTime * 0.72) * sin(p.y * 0.39 - uTime * 0.51);
        float w2 = sin(p.x * 1.13 - uTime * 1.15 + p.y * 0.71) * 0.55;
        float w3 = sin(p.x * 2.27 + p.y * 1.81 + uTime * 1.62) * 0.22;
        float w4 = sin(p.x * 0.13 - p.y * 0.19 - uTime * 0.23) * 0.8;
        float slopeX = cos(p.x * 0.47 + uTime * 0.72) * 0.47 * w4 + cos(p.x * 1.13 - uTime * 1.15 + p.y * 0.71) * 0.62;
        float slopeZ = cos(p.y * 0.39 - uTime * 0.51) * 0.39 * w4 + cos(p.x * 1.13 - uTime * 1.15 + p.y * 0.71) * 0.39;
        vec3 n = normalize(vec3(slopeX * 0.055, 1.0, slopeZ * 0.055));
        vec3 viewDir = normalize(cameraPosition - vWorldPos);
        float fres = pow(1.0 - clamp(dot(viewDir, n), 0.0, 1.0), 2.3);
        float ripple = w1 * 0.5 + w2 + w3 * 0.45;
        vec3 base = mix(uDeep, uShallow, 0.48 + ripple * 0.2);
        base = mix(base, uMist, fres * 0.4);
        vec3 lightDirA = normalize(vec3(-0.3, 0.86, 0.42));
        vec3 lightDirB = normalize(vec3(0.55, 0.7, -0.44));
        float specA = pow(max(dot(n, normalize(lightDirA + viewDir)), 0.0), 110.0);
        float specB = pow(max(dot(n, normalize(lightDirB + viewDir)), 0.0), 150.0);
        float broad = pow(max(dot(reflect(-viewDir, n), lightDirA), 0.0), 9.0);
        vec3 col = base;
        col += uWarm * (specA * 1.45 + broad * 0.10);
        col += uGlow * (specB * 0.85 + broad * 0.06);
        float caustic = pow(max(sin(p.x * 0.71 + uTime * 0.55) * sin(p.y * 0.63 - uTime * 0.47), 0.0), 9.0);
        float caustic2 = pow(max(sin(p.x * 1.37 - uTime * 0.72 + p.y * 0.51), 0.0), 13.0);
        col += uGlow * (caustic * 0.22 + caustic2 * 0.15);
        float ribbons = pow(max(sin(p.x * 0.31 + p.y * 0.13 + uTime * 0.38), 0.0), 7.0);
        col += mix(uGlow, uWarm, 0.38) * ribbons * 0.16;
        float edge = smoothstep(0.4, 0.5, abs(vUv.x - 0.5));
        col = mix(col, uGlow * 0.92, edge * 0.22);
        col = mix(col, uDeep * 0.8, smoothstep(0.485, 0.5, abs(vUv.x - 0.5)) * 0.18);
        gl_FragColor = vec4(col, 0.935);
        #include <fog_fragment>
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
    fog: true,
  });
}

function buildShell() {
  const rings = 58;
  const seg = 148;
  const positions = [];
  const uvs = [];
  const colors = [];
  const indices = [];
  const c = new THREE.Color();
  for (let i = 0; i <= rings; i++) {
    const r = 1 - i / rings;
    for (let j = 0; j <= seg; j++) {
      const theta = (j / seg) * Math.PI * 2;
      const wobble =
        r *
        (1 +
          0.055 * Math.sin(theta * 3 + 1.1) +
          0.03 * Math.sin(theta * 7 - 0.5) +
          0.018 * Math.sin(theta * 11 + r * 4.2));
      const x = CAVE.rx * wobble * Math.cos(theta);
      const z = CAVE.rz * wobble * Math.sin(theta);
      let y = caveCeilingHeight(x, z);
      if (i === 0) y -= 1.25;
      positions.push(x, y, z);
      uvs.push((theta / (Math.PI * 2)) * 7, r * 4.4);
      const depth = 0.36 + 0.4 * r;
      const streak = Math.sin(theta * 23 + r * 14) * 0.5 + 0.5;
      const band = Math.sin(y * 0.24 + theta * 2.2) * 0.5 + 0.5;
      c.setRGB(
        0.46 + depth * 0.24 + streak * 0.05,
        0.4 + depth * 0.22 + band * 0.045,
        0.32 + depth * 0.17 + streak * 0.025
      );
      if (r > 0.72 && band > 0.72) c.multiplyScalar(1.12);
      colors.push(c.r, c.g, c.b);
    }
  }
  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < seg; j++) {
      const a = i * (seg + 1) + j;
      const b = a + 1;
      const d = a + seg + 1;
      const e = d + 1;
      indices.push(a, b, d, b, e, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, caveMaterials.shell);
  mesh.name = 'cave-shell';
  mesh.receiveShadow = true;
  return mesh;
}

function buildFloor() {
  const nx = 118;
  const nz = 150;
  const x0 = -118;
  const x1 = 118;
  const z0 = -158;
  const z1 = 158;
  const positions = [];
  const uvs = [];
  const colors = [];
  const indices = [];
  const c = new THREE.Color();
  for (let i = 0; i <= nx; i++) {
    const x = x0 + ((x1 - x0) * i) / nx;
    for (let j = 0; j <= nz; j++) {
      const z = z0 + ((z1 - z0) * j) / nz;
      const h = caveFloorHeight(x, z);
      positions.push(x, h, z);
      uvs.push(x / 22, z / 22);
      const damp = Math.min(1, Math.max(0, (-h - 0.35) / 2.4));
      const grain = Math.sin(x * 0.47 + z * 0.31) * 0.5 + 0.5;
      const warm = Math.min(1, Math.max(0, 0.55 + h * 0.12));
      c.setRGB(
        (0.38 + warm * 0.2 + grain * 0.04) * (1 - damp * 0.35),
        (0.32 + warm * 0.17 + grain * 0.035) * (1 - damp * 0.28),
        (0.25 + warm * 0.12 + grain * 0.02) * (1 - damp * 0.16)
      );
      colors.push(c.r, c.g, c.b);
    }
  }
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < nz; j++) {
      const a = i * (nz + 1) + j;
      const b = a + nz + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, caveMaterials.rock);
  mesh.name = 'cave-floor';
  mesh.receiveShadow = true;
  return mesh;
}

function buildRiver() {
  const positions = [];
  const uvs = [];
  const indices = [];
  let row = 0;
  for (let z = -150; z <= 150; z += 2.5) {
    const cx = riverX(z);
    const half = riverHalf(z) * 0.86;
    positions.push(cx - half, CAVE.waterY, z, cx + half, CAVE.waterY, z);
    uvs.push(0, z / 24, 1, z / 24);
    if (row > 0) {
      const a = (row - 1) * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      indices.push(a, c, b, b, c, d);
    }
    row++;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function buildPool(pool) {
  const seg = 40;
  const radial = 14;
  const positions = [];
  const uvs = [];
  const indices = [];
  positions.push(pool.x, CAVE.waterY, pool.z);
  uvs.push(0.5, 0.5);
  for (let r = 0; r <= radial; r++) {
    const rr = (r / radial) * 0.66;
    for (let j = 0; j < seg; j++) {
      const a = (j / seg) * Math.PI * 2;
      const x = pool.x + Math.cos(a) * pool.rx * rr;
      const z = pool.z + Math.sin(a) * pool.rz * rr;
      positions.push(x, CAVE.waterY, z);
      uvs.push(0.5 + Math.cos(a) * rr * 0.5, 0.5 + Math.sin(a) * rr * 0.5);
      if (r > 0) {
        const prev = (r - 1) * seg;
        const cur = r * seg;
        const a = r === 1 ? 0 : 1 + prev + j;
        const b = r === 1 ? 0 : 1 + prev + ((j + 1) % seg);
        const c = 1 + cur + j;
        const d = 1 + cur + ((j + 1) % seg);
        if (r === 1) indices.push(0, c, d);
        else indices.push(a, c, b, b, c, d);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function createMist(glowTexture) {
  const count = 520;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const color = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const a = Math.sin(i * 12.9898 + 4.1) * 0.5 + 0.5;
    const b = Math.cos(i * 78.233 - 1.7) * 0.5 + 0.5;
    const c = Math.sin(i * 39.425 + 2.3) * 0.5 + 0.5;
    const ang = a * Math.PI * 2;
    const rad = Math.sqrt(b) * 0.88;
    const x = Math.cos(ang) * CAVE.rx * rad;
    const z = Math.sin(ang) * CAVE.rz * rad;
    const y = 1.5 + c * 24 + Math.sin(x * 0.04 + z * 0.03) * 4;
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
    color.setHSL(0.45 + (i % 7) * 0.004, 0.16, 0.58 + (i % 5) * 0.05);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.PointsMaterial({
    map: glowTexture,
    size: 23,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.12,
    depthWrite: false,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geo, mat);
  points.name = 'cave-mist';
  points.frustumCulled = false;
  return points;
}

export function buildZhijinScene() {
  colliders.length = 0;
  const root = new THREE.Group();
  root.add(buildShell());
  root.add(buildFloor());

  const waterMaterial = makeWaterMaterial();
  const waterGeos = [buildRiver(), ...pools.map(buildPool)];
  const waterGroup = new THREE.Group();
  for (const geo of waterGeos) {
    const mesh = new THREE.Mesh(geo, waterMaterial);
    mesh.name = 'cave-water';
    mesh.renderOrder = 2;
    waterGroup.add(mesh);
  }
  root.add(waterGroup);

  const extras = new THREE.Group();
  const mist = createMist(glowTexture);
  extras.add(mist);
  extras.userData.mist = mist;

  return {
    group: mergeStaticGroup(root),
    extras,
    waterMaterial,
    mist,
    colliders,
    glowTexture,
  };
}
