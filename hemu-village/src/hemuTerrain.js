import * as THREE from 'three';
import { rand, smoothstep, mergeGeo, mergedMesh } from './hemuCore.js';

export const RIVER_PTS = [
  [-16, -540], [-12, -460], [-4, -380], [4, -300], [-4, -220], [8, -140],
  [12, -60], [4, 20], [-8, 100], [-12, 180], [-4, 260], [8, 340], [14, 430], [10, 540],
];

export function riverCenterX(z) {
  const pts = RIVER_PTS;
  if (z <= pts[0][1]) return pts[0][0];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    if (z >= a[1] && z <= b[1]) {
      const t = (z - a[1]) / (b[1] - a[1]);
      return a[0] + (b[0] - a[0]) * t;
    }
  }
  return pts[pts.length - 1][0];
}

export function distanceToRiver(x, z) {
  let best = Infinity;
  for (let i = 0; i < RIVER_PTS.length - 1; i++) {
    const a = RIVER_PTS[i];
    const b = RIVER_PTS[i + 1];
    const vx = b[0] - a[0];
    const vz = b[1] - a[1];
    const len2 = vx * vx + vz * vz || 1;
    const t = Math.max(0, Math.min(1, ((x - a[0]) * vx + (z - a[1]) * vz) / len2));
    best = Math.min(best, Math.hypot(x - a[0] - vx * t, z - a[1] - vz * t));
  }
  return best;
}

export function terrainHeight(x, z) {
  const cx = riverCenterX(z);
  const d = Math.abs(x - cx);
  const flat = smoothstep(16, 70, d);
  let h = 0.5 * Math.sin(x * 0.045 + z * 0.031) * flat;
  h += 0.26 * Math.sin(x * 0.11 - z * 0.061) * flat;
  const side = Math.max(0, d - 92);
  h += smoothstep(0, 180, side) * (20 + 9 * Math.sin(z * 0.016 + x * 0.011));
  h += smoothstep(160, 430, side) * 52;
  const gx = (x + 168) / 84;
  const gz = (z + 30) / 108;
  h += 44 * Math.exp(-(gx * gx + gz * gz) * 1.7);
  const ex = (x - 215) / 130;
  const ez = (z - 70) / 230;
  h += 17 * Math.exp(-(ex * ex + ez * ez) * 1.4);
  const sx = (x + 10) / 170;
  const sz = (z - 420) / 150;
  h += 22 * Math.exp(-(sx * sx + sz * sz) * 1.5);
  return h;
}

function makeTerrainMaterial(M) {
  M.meadow.color.setHex(0xffffff);
  return M.meadow;
}

export function createTerrain(M) {
  const geo = new THREE.PlaneGeometry(2400, 2600, 190, 200);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  const low = new THREE.Color(0xe9e2c0);
  const gold = new THREE.Color(0xefd8a2);
  const forest = new THREE.Color(0xa7b795);
  const rock = new THREE.Color(0xbcbeb2);
  const wet = new THREE.Color(0xc8c7a8);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const h = terrainHeight(x, z);
    pos.setY(i, h);
    const d = distanceToRiver(x, z);
    const n = 0.5 + 0.5 * Math.sin(x * 0.024 + z * 0.017) * Math.sin(z * 0.012 - x * 0.01);
    c.copy(low).lerp(gold, n * 0.75);
    c.lerp(wet, (1 - smoothstep(10, 40, d)) * 0.45);
    c.lerp(forest, smoothstep(7, 30, h) * 0.8);
    c.lerp(rock, smoothstep(46, 92, h) * 0.75);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, makeTerrainMaterial(M));
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  mesh.name = 'hemu-meadow';
  return mesh;
}

export function createBaseGround(M) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(3600, 3600), M.hillFar);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -2.2;
  mesh.receiveShadow = false;
  return mesh;
}

function mountainColor(h, x, z, c) {
  const snowLine = 188 + 24 * Math.sin(x * 0.006 + 0.6) + 14 * Math.sin(z * 0.008);
  const jag = 18 * Math.sin(x * 0.035 + z * 0.021) + 8 * Math.sin(x * 0.09 - z * 0.033);
  const strata = 0.5 + 0.5 * Math.sin(h * 0.11 + x * 0.013);
  const patch = 0.5 + 0.5 * Math.sin(x * 0.048 + z * 0.038);
  if (h > snowLine + jag) {
    c.setHex(0xeef4f3).lerp(new THREE.Color(0xc4d8df), patch * 0.5);
  } else if (h > snowLine - 48 + jag * 0.4) {
    c.setHex(0x9aa2a0).lerp(new THREE.Color(0xb5b4aa), strata * 0.5).lerp(new THREE.Color(0xf0f3ef), patch * 0.45);
  } else if (h > 50) {
    c.setHex(0x6e7974).lerp(new THREE.Color(0x8b8b7e), strata * 0.55);
  } else {
    c.setHex(0x4d614c).lerp(new THREE.Color(0x707a62), strata * 0.55);
  }
}

function buildRange(M, { width, depth, z, segX, segZ, peaks, snowScale = 1 }) {
  const geo = new THREE.PlaneGeometry(width, depth, segX, segZ);
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, 0, z);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const zz = pos.getZ(i);
    const foot = smoothstep(z - depth * 0.5, z - depth * 0.16, zz);
    let h = foot * (34 + 20 * (0.5 + 0.5 * Math.sin(x * 0.004 + zz * 0.003)));
    for (const p of peaks) {
      const gx = (x - p.x) / p.rx;
      const gz = (zz - p.z) / p.rz;
      h += p.h * Math.exp(-(gx * gx + gz * gz) * p.k);
    }
    h += foot * (16 * Math.sin(x * 0.028 + zz * 0.014) + 8 * Math.sin(x * 0.072 - zz * 0.026));
    h = Math.max(0, h);
    pos.setY(i, h - 2.4);
    mountainColor(h * snowScale, x, zz, c);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 1,
    metalness: 0,
    flatShading: true,
    emissive: new THREE.Color(0x1a2228),
    emissiveIntensity: 0.22,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return mesh;
}

export function createMountains(M) {
  const group = new THREE.Group();
  group.name = 'hemu-peaks';
  const near = [
    { x: -1280, z: 1120, h: 250, rx: 300, rz: 320, k: 1.7 },
    { x: -960, z: 1000, h: 300, rx: 250, rz: 300, k: 1.8 },
    { x: -640, z: 1120, h: 350, rx: 250, rz: 310, k: 1.7 },
    { x: -320, z: 1040, h: 392, rx: 230, rz: 300, k: 1.9 },
    { x: 20, z: 1120, h: 445, rx: 260, rz: 330, k: 1.7 },
    { x: 360, z: 1040, h: 388, rx: 240, rz: 300, k: 1.8 },
    { x: 700, z: 1140, h: 332, rx: 260, rz: 320, k: 1.7 },
    { x: 1030, z: 1080, h: 286, rx: 280, rz: 320, k: 1.8 },
    { x: 1320, z: 1220, h: 238, rx: 320, rz: 340, k: 1.7 },
  ];
  group.add(buildRange(M, { width: 3500, depth: 1450, z: 1150, segX: 184, segZ: 84, peaks: near }));
  const far = [
    { x: -1400, z: 1900, h: 330, rx: 340, rz: 380, k: 1.8 },
    { x: -800, z: 1820, h: 420, rx: 300, rz: 360, k: 1.8 },
    { x: -180, z: 1920, h: 500, rx: 310, rz: 400, k: 1.7 },
    { x: 520, z: 1850, h: 430, rx: 300, rz: 380, k: 1.8 },
    { x: 1180, z: 1950, h: 360, rx: 340, rz: 400, k: 1.8 },
    { x: 1660, z: 2050, h: 310, rx: 380, rz: 420, k: 1.9 },
  ];
  group.add(buildRange(M, { width: 4600, depth: 1500, z: 2200, segX: 120, segZ: 44, peaks: far, snowScale: 0.92 }));
  return group;
}

function makeWaterMaterial(M, normalMap) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uDeep: { value: new THREE.Color(0x24545a) },
      uShallow: { value: new THREE.Color(0x6f9d90) },
      uSky: { value: new THREE.Color(0xc6d8d0) },
      uSun: { value: new THREE.Color(0xfff1d2) },
      uSunDir: { value: new THREE.Vector3(-0.4, 0.75, -0.35).normalize() },
      uNormalMap: { value: normalMap },
      uFlow: { value: 1.0 },
    },
    vertexShader: `
      uniform float uTime;
      varying vec3 vWorldPos;
      varying vec3 vNormalW;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec3 pos = position;
        pos.y += sin(pos.x * 0.28 + uTime * 0.95) * 0.035;
        pos.y += cos(pos.z * 0.36 + uTime * 0.7) * 0.028;
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
      uniform sampler2D uNormalMap;
      uniform float uFlow;
      varying vec3 vWorldPos;
      varying vec3 vNormalW;
      varying vec2 vUv;
      void main() {
        float t = uTime * uFlow;
        vec2 uv1 = vWorldPos.xz * 0.034 + vec2(t * 0.011, t * 0.02);
        vec2 uv2 = vWorldPos.xz * 0.018 - vec2(t * 0.008, t * 0.015);
        vec2 uv3 = vWorldPos.xz * 0.092 + vec2(-t * 0.024, t * 0.018);
        vec2 uv4 = vWorldPos.xz * 0.24 + vec2(t * 0.043, -t * 0.028);
        vec3 n1 = texture2D(uNormalMap, uv1).rgb * 2.0 - 1.0;
        vec3 n2 = texture2D(uNormalMap, uv2).rgb * 2.0 - 1.0;
        vec3 n3 = texture2D(uNormalMap, uv3).rgb * 2.0 - 1.0;
        vec3 n4 = texture2D(uNormalMap, uv4).rgb * 2.0 - 1.0;
        vec3 n = normalize(vNormalW + vec3(n1.x + n2.x + n3.x * 0.55 + n4.x * 0.3, 0.0, n1.y + n2.y + n3.y * 0.55 + n4.y * 0.3) * 0.38);
        float band = sin(vWorldPos.x * 0.028 + vWorldPos.z * 0.013 + sin(vWorldPos.z * 0.008) * 2.5);
        float fine = sin(vWorldPos.x * 0.11 - vWorldPos.z * 0.06 + t * 0.1);
        vec3 base = mix(uDeep, uShallow, 0.45 + band * 0.15);
        base = mix(base, uShallow * 1.06, smoothstep(0.18, 0.7, fine * 0.5 + 0.5) * 0.3);
        vec3 viewDir = normalize(cameraPosition - vWorldPos);
        float fres = pow(1.0 - clamp(dot(viewDir, n), 0.0, 1.0), 2.7);
        vec3 col = mix(base, uSky, fres * 0.5);
        vec3 hv = normalize(viewDir + normalize(uSunDir));
        float spec = pow(max(dot(n, hv), 0.0), 170.0);
        col += uSun * spec * 0.62;
        float ripple = sin(vWorldPos.x * 1.7 + vWorldPos.z * 0.9 + t * 2.5) * sin(vWorldPos.z * 2.1 - t * 1.8);
        float glint = pow(max(ripple, 0.0), 34.0);
        col += vec3(1.0, 0.95, 0.82) * glint * 0.13;
        gl_FragColor = vec4(col, 0.965);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
  });
}

export function createRiver(M, normalMap) {
  const group = new THREE.Group();
  group.name = 'hemu-river';
  const material = makeWaterMaterial(M, normalMap);
  material.userData.day = { deep: 0x24545a, shallow: 0x6f9d90, sky: 0xc6d8d0 };
  material.userData.dusk = { deep: 0x273c48, shallow: 0x8c8271, sky: 0xe0b184 };

  const waterRibbon = makeRibbon(RIVER_PTS, (t) => 17 * (0.86 + 0.12 * Math.sin(t * 11.3 + 0.6) + 0.05 * Math.sin(t * 27.0)), 0.16);
  const water = new THREE.Mesh(waterRibbon, material);
  water.name = 'hemu-river-water';
  water.renderOrder = 1;
  group.add(water);

  const bedRibbon = makeRibbon(RIVER_PTS, (t) => 24 * (0.9 + 0.1 * Math.sin(t * 11.3 + 0.6)), -0.42);
  const bed = new THREE.Mesh(bedRibbon, M.riverbed);
  bed.receiveShadow = true;
  group.add(bed);

  const rocks = [];
  const dark = [];
  const moss = [];
  const curve = new THREE.CatmullRomCurve3(
    RIVER_PTS.map((p) => new THREE.Vector3(p[0], 0, p[1])), false, 'catmullrom', 0.32
  );
  const pts = curve.getSpacedPoints(170);
  for (let i = 4; i < pts.length - 4; i++) {
    const p = pts[i];
    const t = i / (pts.length - 1);
    const tang = curve.getTangent(t);
    const nx = -tang.z;
    const nz = tang.x;
    for (const side of [-1, 1]) {
      if (rand(601 + i, side + 2) > 0.72) continue;
      const off = 10.2 + rand(611 + i, side + 4) * 4.6;
      const s = 0.45 + rand(621 + i, side + 5) * 1.6;
      const g = new THREE.IcosahedronGeometry(s, 0);
      g.scale(1.25, 0.62, 1.0);
      g.rotateY(rand(631 + i, side) * 6.28);
      g.translate(p.x + nx * off * side, s * 0.2 + 0.05, p.z + nz * off * side);
      rocks.push(g);
      if (rand(641 + i, side) > 0.62) {
        const cap = new THREE.IcosahedronGeometry(s * 0.65, 0);
        cap.scale(1.05, 0.22, 0.9);
        cap.rotateY(rand(651 + i, side) * 6.28);
        cap.translate(p.x + nx * off * side, s * 0.48, p.z + nz * off * side);
        moss.push(cap);
      }
      if (rand(661 + i, side) > 0.7) {
        const s2 = 0.22 + rand(671 + i, side) * 0.5;
        const d = new THREE.IcosahedronGeometry(s2, 0);
        d.scale(1.3, 0.54, 1.0);
        d.translate(p.x + nx * off * side + 1.2, s2 * 0.16, p.z + nz * off * side - 0.8);
        dark.push(d);
      }
    }
  }
  const rm = mergedMesh(rocks, M.rock, true, true);
  if (rm) group.add(rm);
  const dm = mergedMesh(dark, M.rockDark, false, true);
  if (dm) group.add(dm);
  const mm = mergedMesh(moss, M.moss, false, true);
  if (mm) group.add(mm);

  return { group, material, pts };
}

export function makeRibbon(points, widthFn, y, uvScale = 20) {
  const curve = new THREE.CatmullRomCurve3(
    points.map((p) => new THREE.Vector3(p[0], 0, p[1])), false, 'catmullrom', 0.32
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
    const yy = typeof y === 'function' ? y(p.x, p.z, t) : y;
    positions.push(p.x + nx * w * 0.5, yy, p.z + nz * w * 0.5);
    positions.push(p.x - nx * w * 0.5, yy, p.z - nz * w * 0.5);
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
  return geo;
}

const PATHS = [
  [[22, -200], [32, -150], [42, -100], [56, -50], [68, 0], [78, 55], [88, 115], [96, 175], [108, 235]],
  [[34, -112], [58, -96], [86, -70], [108, -34], [116, 12], [110, 62], [118, 112], [132, 160]],
  [[30, -46], [6, -44], [-28, -42], [-68, -36], [-108, -31], [-138, -30], [-156, -34]],
  [[-54, -118], [-30, -114], [-6, -110], [22, -114], [48, -122]],
  [[-40, 36], [-16, 39], [8, 42], [32, 40], [54, 34]],
  [[46, -60], [58, -20], [62, 30], [56, 82], [62, 126]],
];

export function createPaths(M) {
  const list = [];
  for (const pts of PATHS) {
    const geo = makeRibbon(pts, 3.4, (x, z) => terrainHeight(x, z) + 0.09, 30);
    list.push(geo);
  }
  const mesh = mergedMesh(list, M.path, false, true);
  mesh.name = 'hemu-paths';
  return mesh;
}

export function createScatterRocks(M) {
  const group = new THREE.Group();
  const rocks = [];
  const dark = [];
  const moss = [];
  const clusters = [
    [-200, 130, 22], [190, 190, 20], [-190, -150, 18], [230, -90, 18],
    [-40, 300, 20], [150, 300, 18], [-240, 20, 16], [260, 20, 16],
    [30, -240, 14], [-70, -260, 16], [-150, 230, 16], [120, 240, 14],
  ];
  clusters.forEach(([cx, cz, size], ci) => {
    const count = 5 + (ci % 4);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + rand(ci + 3, i) * 0.7;
      const r = size * (0.18 + rand(ci + 7, i) * 0.66);
      const x = cx + Math.cos(a) * r;
      const z = cz + Math.sin(a) * r * 0.82;
      const s = 1.3 + rand(ci + 11, i) * 3.0;
      const g = new THREE.IcosahedronGeometry(s, 0);
      g.scale(1.14, 0.7 + rand(ci, i) * 0.38, 0.92);
      g.rotateY(rand(ci + 13, i) * 6.28);
      g.rotateX((rand(ci + 17, i) - 0.5) * 0.28);
      g.translate(x, terrainHeight(x, z) + s * 0.32, z);
      rocks.push(g);
      if (i % 3 === 0) {
        const cap = new THREE.IcosahedronGeometry(s * 0.68, 0);
        cap.scale(1.0, 0.2, 0.9);
        cap.rotateY(rand(ci + 19, i) * 6.28);
        cap.translate(x - s * 0.1, terrainHeight(x, z) + s * 0.68, z);
        moss.push(cap);
      }
      if (i % 4 === 1) {
        const d = new THREE.IcosahedronGeometry(s * 0.5, 0);
        d.scale(1.2, 0.6, 1);
        d.translate(x + s * 0.8, terrainHeight(x, z) + s * 0.2, z - s * 0.4);
        dark.push(d);
      }
    }
  });
  const rm = mergedMesh(rocks, M.rock, true, true);
  if (rm) group.add(rm);
  const dm = mergedMesh(dark, M.rockDark, false, true);
  if (dm) group.add(dm);
  const mm = mergedMesh(moss, M.moss, false, true);
  if (mm) group.add(mm);
  group.name = 'hemu-rocks';
  return group;
}
