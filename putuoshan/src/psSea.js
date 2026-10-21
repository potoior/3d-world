import * as THREE from 'three';
import { mats, ptextures } from './putuoshanTextures.js';

const SEA_VERTEX = `
  uniform float uTime;
  uniform float uWaveScale;
  varying vec3 vWorld;
  varying vec3 vN;
  #include <fog_pars_vertex>

  void main() {
    vec3 p = position;
    vec2 q = p.xz;
    float h = 0.0;
    vec2 grad = vec2(0.0);

    vec2 d1 = normalize(vec2(0.82, 0.57));
    float ph1 = dot(q, d1) * 0.052 + uTime * 0.42;
    h += sin(ph1) * 0.85;
    grad += cos(ph1) * 0.85 * 0.052 * d1;

    vec2 d2 = normalize(vec2(-0.42, 0.91));
    float ph2 = dot(q, d2) * 0.091 + uTime * 0.68;
    h += sin(ph2) * 0.42;
    grad += cos(ph2) * 0.42 * 0.091 * d2;

    vec2 d3 = normalize(vec2(0.95, -0.31));
    float ph3 = dot(q, d3) * 0.17 - uTime * 0.95;
    h += sin(ph3) * 0.18;
    grad += cos(ph3) * 0.18 * 0.17 * d3;

    vec2 d4 = normalize(vec2(-0.25, -0.97));
    float ph4 = dot(q, d4) * 0.031 + uTime * 0.29;
    h += sin(ph4) * 1.25;
    grad += cos(ph4) * 1.25 * 0.031 * d4;

    p.y += h * uWaveScale;
    vec4 world = modelMatrix * vec4(p, 1.0);
    vWorld = world.xyz;
    vec3 n = normalize(vec3(-grad.x * uWaveScale, 1.0, -grad.y * uWaveScale));
    vN = normalize(mat3(modelMatrix) * n);

    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const SEA_FRAGMENT = `
  uniform float uTime;
  uniform vec3 uDeep;
  uniform vec3 uShallow;
  uniform vec3 uSunColor;
  uniform vec3 uSunDir;
  varying vec3 vWorld;
  varying vec3 vN;
  #include <fog_pars_fragment>

  void main() {
    vec3 N = normalize(vN);
    vec3 V = normalize(cameraPosition - vWorld);
    float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
    float lift = clamp(0.16 + fres * 0.58 + max(uSunDir.y, 0.0) * 0.12, 0.0, 1.0);
    vec3 col = mix(uDeep, uShallow, lift);
    col *= 0.86 + max(dot(N, uSunDir), 0.0) * 0.28;

    vec3 H = normalize(uSunDir + V);
    float spec = pow(max(dot(N, H), 0.0), 210.0);
    col += uSunColor * spec * 1.45;

    float ripple = sin(vWorld.x * 0.63 + vWorld.z * 0.81 + uTime * 1.5);
    float sparkle = pow(max(ripple * 0.5 + 0.5, 0.0), 22.0);
    col += uSunColor * sparkle * 0.04;

    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

export function createSea() {
  const geo = new THREE.PlaneGeometry(6800, 6800, 180, 180);
  geo.rotateX(-Math.PI / 2);
  const uniforms = THREE.UniformsUtils.merge([
    THREE.UniformsLib.fog,
    {
      uTime: { value: 0 },
      uWaveScale: { value: 1.0 },
      uDeep: { value: new THREE.Color(0x0d3542) },
      uShallow: { value: new THREE.Color(0x2d6f70) },
      uSunColor: { value: new THREE.Color(0xffe3b0) },
      uSunDir: { value: new THREE.Vector3(0.6, 0.4, 0.5).normalize() },
    },
  ]);
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: SEA_VERTEX,
    fragmentShader: SEA_FRAGMENT,
    fog: true,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, material);
  mesh.name = 'east-china-sea';
  mesh.position.y = 0;
  mesh.receiveShadow = false;
  mesh.frustumCulled = false;
  return { mesh, uniforms, material };
}

export function createFoamRing(coastRadius) {
  const group = new THREE.Group();
  const segments = 260;
  const makeRing = (inner, outer, y) => {
    const positions = [];
    const uvs = [];
    const indices = [];
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      const r = coastRadius(a);
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      positions.push(ca * (r + inner), y, sa * (r + inner));
      positions.push(ca * (r + outer), y, sa * (r + outer));
      uvs.push(i / segments * 9, 0, i / segments * 9, 1);
    }
    for (let i = 0; i < segments; i++) {
      const a = i * 2;
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  };

  const mat = mats.foam.clone();
  mat.map = ptextures.foam.clone();
  mat.map.needsUpdate = true;
  mat.map.wrapS = THREE.RepeatWrapping;
  mat.map.wrapT = THREE.ClampToEdgeWrapping;
  mat.opacity = 0.48;
  const near = new THREE.Mesh(makeRing(1, 20, 0.42), mat);
  near.name = 'surf-foam';
  near.renderOrder = 1;
  group.add(near);
  const farMat = mat.clone();
  farMat.opacity = 0.2;
  const far = new THREE.Mesh(makeRing(18, 48, 0.34), farMat);
  far.renderOrder = 1;
  group.add(far);
  return { group, materials: [mat, farMat], maps: [mat.map, farMat.map] };
}

export function createSeaMist() {
  const count = 22;
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  const base = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + (i % 3) * 0.17;
    const r = 380 + (i % 5) * 60;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const y = 8 + (i % 6) * 6;
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
    seeds[i] = i / count;
    base.push({ x, z, y, phase: i * 1.7 });
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  const mat = new THREE.PointsMaterial({
    map: ptextures.cloud,
    color: 0xe3efed,
    size: 360,
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
    sizeAttenuation: true,
    fog: true,
    blending: THREE.NormalBlending,
  });
  const points = new THREE.Points(geo, mat);
  points.name = 'sea-mist';
  points.frustumCulled = false;
  points.renderOrder = 2;
  const attr = geo.attributes.position;
  return {
    group: points,
    update(elapsed) {
      for (let i = 0; i < base.length; i++) {
        const b = base[i];
        attr.setX(i, b.x + Math.sin(elapsed * 0.045 + b.phase) * 26);
        attr.setY(i, b.y + Math.sin(elapsed * 0.16 + b.phase) * 2.4);
        attr.setZ(i, b.z + Math.cos(elapsed * 0.033 + b.phase) * 20);
      }
      attr.needsUpdate = true;
    },
  };
}

export function createCloudBanks() {
  const group = new THREE.Group();
  group.name = 'sea-clouds';
  const defs = [
    [1800, 520, 60, 250, 300, 0xffffff, 0.55, 0.012],
    [2300, 620, -120, 300, -600, 0xffffff, 0.5, -0.009],
    [1700, 480, 420, 275, 260, 0xf6dec6, 0.42, 0.008],
    [2600, 700, -60, 340, -1500, 0xffffff, 0.4, 0.006],
  ];
  const meshes = [];
  for (const d of defs) {
    const geo = new THREE.PlaneGeometry(d[0], d[1]);
    const mat = mats.cloud.clone();
    mat.color = new THREE.Color(d[5]);
    mat.opacity = d[6];
    const m = new THREE.Mesh(geo, mat);
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = d[7] * 3;
    m.position.set(d[2], d[3], d[4]);
    m.renderOrder = 3;
    m.userData.base = d[2];
    m.userData.drift = d[7];
    group.add(m);
    meshes.push(m);
  }
  for (let i = 0; i < 6; i++) {
    const mat = new THREE.SpriteMaterial({
      map: ptextures.cloud,
      color: i % 2 ? 0xf6dec6 : 0xffffff,
      transparent: true,
      opacity: i % 2 ? 0.34 : 0.4,
      depthWrite: false,
      fog: true,
    });
    const spr = new THREE.Sprite(mat);
    const a = (i / 6) * Math.PI * 2 + 0.3;
    spr.position.set(Math.cos(a) * (1200 + i * 120), 200 + i * 26, Math.sin(a) * (1200 + i * 140));
    spr.scale.set(900, 280, 1);
    spr.renderOrder = 3;
    spr.userData.base = spr.position.x;
    spr.userData.drift = 0.004 + i * 0.001;
    group.add(spr);
    meshes.push(spr);
  }
  return {
    group,
    update(elapsed) {
      for (const m of meshes) {
        m.position.x = m.userData.base + Math.sin(elapsed * m.userData.drift) * 40;
      }
    },
  };
}
