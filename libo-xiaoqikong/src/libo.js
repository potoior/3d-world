import * as THREE from 'three';
import { FALLS, CASCADE_Z, riverCenter, riverWidth, mulberry32 } from './liboTerrain.js';

function makeMistTexture() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,0.95)');
  g.addColorStop(0.35, 'rgba(225,255,245,0.5)');
  g.addColorStop(1, 'rgba(190,240,225,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function makeFallMaterial(seed, tint) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uSeed: { value: seed },
      uColor: { value: new THREE.Color(tint) },
      uOpacity: { value: 0.86 },
    },
    vertexShader: `
      varying vec2 vUv;
      varying float vWave;
      uniform float uTime;
      uniform float uSeed;
      void main() {
        vUv = uv;
        vec3 pos = position;
        float w = sin(uv.y * 9.0 + uTime * 2.2 + uSeed) * 0.025;
        pos.x += w * uv.y;
        pos.y += sin(uv.x * 14.0 + uTime * 1.4 + uSeed) * 0.02;
        vWave = w;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uSeed;
      uniform vec3 uColor;
      uniform float uOpacity;
      varying vec2 vUv;
      varying float vWave;
      float hash(float n) { return fract(sin(n) * 43758.5453); }
      void main() {
        float x = vUv.x;
        float y = vUv.y;
        float edge = smoothstep(0.0, 0.12, x) * smoothstep(1.0, 0.88, x);
        float streak = sin(x * 48.0 + uSeed * 3.0 + y * 6.0) * 0.5 + 0.5;
        streak *= 0.55 + 0.45 * sin(x * 17.0 - uTime * 3.4 + y * 15.0);
        float flow = fract(y * 2.4 - uTime * 0.85 + hash(x * 7.0 + uSeed) * 0.7);
        float foam = smoothstep(0.0, 0.1, y) * smoothstep(1.0, 0.82, y) * (0.62 + 0.38 * streak);
        float glint = pow(max(0.0, sin(x * 34.0 + y * 21.0 + uTime * 4.0 + uSeed)), 18.0) * 0.5;
        float bottomFoam = smoothstep(0.14, 0.0, y) * (0.7 + 0.3 * streak);
        float alpha = edge * (0.34 + foam * 0.46 + bottomFoam * 0.5 + glint * flow * 0.2);
        vec3 col = mix(uColor * 0.72, vec3(1.0), foam * 0.55 + bottomFoam * 0.65 + glint * 0.25);
        gl_FragColor = vec4(col, alpha * uOpacity);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
  });
}

function addFall(group, site, seed, tint, fallMaterials) {
  const mat = makeFallMaterial(seed, tint);
  const geo = new THREE.PlaneGeometry(site.width, site.height, 10, 24);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(site.x, site.baseY + site.height * 0.5, site.z);
  mesh.rotation.y = site.rot || 0;
  mesh.renderOrder = 4;
  mesh.name = 'libo-fall';
  group.add(mesh);
  fallMaterials.push(mat);
  return mesh;
}

function buildMist(group, sites) {
  const rand = mulberry32(4401);
  const count = 520;
  const positions = new Float32Array(count * 3);
  const parts = [];
  for (let i = 0; i < count; i++) {
    const site = sites[(rand() * sites.length) | 0];
    const life = 0.5 + rand();
    const p = {
      x: site.x + (rand() - 0.5) * site.width,
      y: site.baseY + 0.3 + rand() * 2.2,
      z: site.z + (rand() - 0.5) * 3.2,
      vx: (rand() - 0.5) * 0.9,
      vy: 0.45 + rand() * 1.0,
      vz: (rand() - 0.5) * 0.9,
      life: rand() * life,
      max: life,
      site,
    };
    parts.push(p);
    positions[i * 3] = p.x;
    positions[i * 3 + 1] = p.y;
    positions[i * 3 + 2] = p.z;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    map: makeMistTexture(),
    color: 0xd8fff0,
    size: 3.2,
    transparent: true,
    opacity: 0.19,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
    fog: false,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.renderOrder = 5;
  group.add(points);
  return { points, parts, positions, rand };
}

function buildPollen(group) {
  const rand = mulberry32(9902);
  const count = 260;
  const positions = new Float32Array(count * 3);
  const seeds = [];
  for (let i = 0; i < count; i++) {
    const z = -170 + rand() * 330;
    const x = riverCenter(z) + (rand() - 0.5) * (riverWidth(z) + 26);
    positions[i * 3] = x;
    positions[i * 3 + 1] = 1.2 + rand() * 10;
    positions[i * 3 + 2] = z;
    seeds.push({ x, z, y: 1.2 + rand() * 10, phase: rand() * 6.28, speed: 0.2 + rand() * 0.5 });
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    map: makeMistTexture(),
    color: 0xd8f5a8,
    size: 0.32,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
    fog: true,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  group.add(points);
  return { points, positions, seeds };
}

function buildLeaves(group) {
  const rand = mulberry32(6631);
  const count = 240;
  const geo = new THREE.PlaneGeometry(0.2, 0.11);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.82,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.96,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  const colors = [0x7f9b3e, 0xa3b148, 0x5c8a3a, 0xc2b356, 0x8c9c3c, 0x4d7a35];
  const c = new THREE.Color();
  const data = [];
  for (let i = 0; i < count; i++) {
    const z = -170 + rand() * 350;
    const x = riverCenter(z) + (rand() - 0.5) * (riverWidth(z) + 34);
    data.push({
      x,
      z,
      y: 2 + rand() * 12,
      phase: rand() * 6.28,
      speed: 0.35 + rand() * 0.8,
      spin: (rand() - 0.5) * 3.2,
      drift: 0.4 + rand() * 1.2,
    });
    c.setHex(colors[i % colors.length]);
    mesh.setColorAt(i, c);
  }
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.frustumCulled = false;
  group.add(mesh);
  return { mesh, data };
}

export function buildLiboOverlay(world) {
  const group = new THREE.Group();
  group.name = 'libo-overlay';
  const fallMaterials = [];
  const fallSites = [];
  const sites = [
    { ...FALLS.laya, seed: 1 },
    { ...FALLS.cui, seed: 2 },
    { ...FALLS.cui2, seed: 3 },
    { ...FALLS.wolong, seed: 4 },
  ];
  for (const site of sites) {
    addFall(group, site, site.seed, 0xe6fff4, fallMaterials);
    fallSites.push(site);
  }
  for (let i = 0; i < CASCADE_Z.length; i++) {
    const z = CASCADE_Z[i];
    const site = {
      x: riverCenter(z),
      z: z - 0.7,
      width: riverWidth(z) - 2,
      height: 0.8 + i * 0.04,
      baseY: 0.62,
      rot: 0,
      seed: 10 + i,
    };
    addFall(group, site, site.seed, 0xeafff8, fallMaterials);
    fallSites.push(site);
  }

  const mist = buildMist(group, fallSites);
  const pollen = buildPollen(group);
  const leaves = buildLeaves(group);
  const dummy = new THREE.Object3D();
  const c = new THREE.Color();
  const leafColors = [0x91a844, 0xb4b64e, 0x6e963d, 0xcbb95a, 0x7f9a39];

  const life = {
    update(time, dt) {
      const d = Math.min(dt || 0.016, 0.05);
      if (world && world.waterMaterial) world.waterMaterial.uniforms.uTime.value = time;
      for (const mat of fallMaterials) mat.uniforms.uTime.value = time;

      const arr = mist.positions;
      for (let i = 0; i < mist.parts.length; i++) {
        const p = mist.parts[i];
        p.life += d;
        if (p.life > p.max) {
          p.life = 0;
          p.x = p.site.x + (mist.rand() - 0.5) * p.site.width;
          p.y = p.site.baseY + 0.3 + mist.rand() * 1.6;
          p.z = p.site.z + (mist.rand() - 0.5) * 3.2;
          p.max = 0.5 + mist.rand();
        }
        const t = p.life / p.max;
        p.x += p.vx * d + Math.sin(time * 0.7 + i) * 0.01;
        p.y += p.vy * d * (1.0 - t * 0.5);
        p.z += p.vz * d;
        arr[i * 3] = p.x;
        arr[i * 3 + 1] = p.y + t * 1.8;
        arr[i * 3 + 2] = p.z;
      }
      mist.points.geometry.attributes.position.needsUpdate = true;

      const parr = pollen.positions;
      for (let i = 0; i < pollen.seeds.length; i++) {
        const s = pollen.seeds[i];
        parr[i * 3] = s.x + Math.sin(time * s.speed + s.phase) * 1.8;
        parr[i * 3 + 1] = s.y + Math.sin(time * 0.6 + s.phase * 1.7) * 0.7;
        parr[i * 3 + 2] = s.z + Math.cos(time * s.speed * 0.7 + s.phase) * 1.4;
      }
      pollen.points.geometry.attributes.position.needsUpdate = true;

      for (let i = 0; i < leaves.data.length; i++) {
        const leaf = leaves.data[i];
        leaf.y -= leaf.speed * d;
        leaf.x += Math.sin(time * 0.5 + leaf.phase) * leaf.drift * d;
        leaf.z += Math.cos(time * 0.37 + leaf.phase * 1.3) * leaf.drift * d;
        if (leaf.y < 0.3) {
          leaf.y = 10 + (i % 7) * 1.4;
          leaf.x = riverCenter(leaf.z) + (Math.sin(time + i) * 0.5) * (riverWidth(leaf.z) + 30);
        }
        dummy.position.set(leaf.x, leaf.y, leaf.z);
        dummy.rotation.set(time * leaf.spin, time * leaf.spin * 0.7 + leaf.phase, Math.sin(time + leaf.phase) * 1.2);
        dummy.scale.setScalar(0.8 + (i % 5) * 0.12);
        dummy.updateMatrix();
        leaves.mesh.setMatrixAt(i, dummy.matrix);
      }
      leaves.mesh.instanceMatrix.needsUpdate = true;
    },
    setEnv(mix) {
      for (let i = 0; i < fallMaterials.length; i++) {
        const mat = fallMaterials[i];
        if (i < 4) mat.uniforms.uColor.value.setRGB(0.9 - mix * 0.25, 1.0 - mix * 0.12, 0.96 - mix * 0.2);
      }
    },
    fallMaterials,
    fallSites,
  };

  return { group, life, fallMaterials, fallSites };
}
