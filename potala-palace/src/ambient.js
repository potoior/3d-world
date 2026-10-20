import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { FLAG_LINES } from './route.js';
import { mats } from './materials.js';
import { addCylinder } from './geometry.js';

const COLORS = [0x2f6fbf, 0xf0e8d2, 0xc63f2b, 0x3c7a4a, 0xe0b33f];

const BANNERS = [
  { x: 79, y: 60.5, z: 111, ry: Math.PI / 2, c: 2 },
  { x: 175, y: 60.5, z: 111, ry: -Math.PI / 2, c: 4 },
  { x: 79, y: 60.5, z: 171, ry: Math.PI / 2, c: 3 },
  { x: 175, y: 60.5, z: 171, ry: -Math.PI / 2, c: 2 },
  { x: 61, y: 64, z: 86, ry: 0, c: 4 },
  { x: 183, y: 64, z: 86, ry: 0, c: 2 },
];

function buildFlags() {
  const positions = [];
  const uvs = [];
  const colors = [];
  const indices = [];
  let base = 0;
  const palette = COLORS.map((c) => new THREE.Color(c));
  for (const line of FLAG_LINES) {
    const ax = line.a[0];
    const ay = line.a[1];
    const az = line.a[2];
    const bx = line.b[0];
    const by = line.b[1];
    const bz = line.b[2];
    const dx = bx - ax;
    const dz = bz - az;
    const dy = by - ay;
    const horizontal = Math.hypot(dx, dz);
    const nx = -dz / horizontal;
    const nz = dx / horizontal;
    const n = Math.max(4, Math.round(horizontal / 3.1));
    for (let i = 0; i < n; i++) {
      const t = (i + 0.55) / n;
      const cx = ax + dx * t;
      const cy = ay + dy * t;
      const cz = az + dz * t;
      const hw = 0.85;
      const len = 1.35;
      positions.push(
        cx - nx * hw, cy, cz - nz * hw,
        cx + nx * hw, cy, cz + nz * hw,
        cx - nx * hw, cy - len, cz - nz * hw,
        cx + nx * hw, cy - len, cz + nz * hw
      );
      uvs.push(0, 1, 1, 1, 0, 0, 1, 0);
      const c = palette[i % palette.length];
      for (let k = 0; k < 4; k++) colors.push(c.r, c.g, c.b);
      indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
      base += 4;
    }
  }
  for (const b of BANNERS) {
    const tx = Math.cos(b.ry);
    const tz = -Math.sin(b.ry);
    const hw = 0.9;
    const len = 7.0;
    positions.push(
      b.x - tx * hw, b.y, b.z - tz * hw,
      b.x + tx * hw, b.y, b.z + tz * hw,
      b.x - tx * hw, b.y - len, b.z - tz * hw,
      b.x + tx * hw, b.y - len, b.z + tz * hw
    );
    uvs.push(0, 1, 1, 1, 0, 0, 1, 0);
    const c = palette[b.c % palette.length];
    for (let k = 0; k < 4; k++) colors.push(c.r, c.g, c.b);
    indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
    base += 4;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    side: THREE.DoubleSide,
    vertexColors: true,
    vertexShader: `
      uniform float uTime;
      varying vec2 vUv;
      varying vec3 vColor;
      void main() {
        vUv = uv;
        vColor = color;
        vec3 p = position;
        float hang = 1.0 - uv.y;
        p.x += sin(uTime * 2.1 + position.x * 0.35 + position.y * 0.6) * 0.24 * hang;
        p.z += cos(uTime * 1.6 + position.z * 0.32 + position.y * 0.5) * 0.18 * hang;
        p.y += sin(uTime * 1.2 + position.x * 0.25) * 0.06 * hang;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      varying vec3 vColor;
      void main() {
        float edge = smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x);
        edge *= smoothstep(0.0, 0.1, 1.0 - vUv.y);
        gl_FragColor = vec4(vColor * (0.86 + vUv.y * 0.22), edge * 0.96);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 2;
  return { mesh, mat };
}

function buildPoles() {
  const wood = [];
  const gold = [];
  const copper = [];
  const seen = new Set();
  const spots = [];
  for (const line of FLAG_LINES) {
    spots.push(line.a, line.b);
  }
  for (const b of BANNERS) spots.push([b.x, b.y, b.z]);
  for (const [x, y, z] of spots) {
    const key = `${x.toFixed(1)},${y.toFixed(1)},${z.toFixed(1)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const base = x > 70 && x < 185 && z > 100 && z < 182 ? 44 : (z > 80 && z < 100 && x > 54 && x < 186 ? 54 : 0);
    const h = Math.max(2, y - base);
    addCylinder(wood, 0.11, 0.19, h, 6, x, base + h / 2, z);
    const orb = new THREE.SphereGeometry(0.26, 8, 6);
    orb.translate(x, y + 0.2, z);
    gold.push(orb);
    addBoxCopper(copper, x, base, z);
  }
  const woodMesh = new THREE.Mesh(mergeGeometries(wood, false), mats.wood);
  const goldMesh = new THREE.Mesh(mergeGeometries(gold, false), mats.goldBright);
  const copperMesh = new THREE.Mesh(mergeGeometries(copper, false), mats.copper);
  woodMesh.castShadow = true;
  goldMesh.castShadow = true;
  return { woodMesh, goldMesh, copperMesh };
}

function addBoxCopper(list, x, base, z) {
  addCylinder(list, 0.18, 0.24, 0.5, 6, x, base + 0.25, z);
}

function buildWheels() {
  const spots = [];
  for (const x of [80.2, 170.0]) {
    for (let i = 0; i < 8; i++) {
      spots.push({ x, z: 121 + i * 6.1, phase: i * 0.9 + (x > 100 ? 1.7 : 0) });
    }
  }
  const bodyGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.92, 10);
  const bandGeo = new THREE.CylinderGeometry(0.375, 0.375, 0.12, 10);
  const body = new THREE.InstancedMesh(bodyGeo, mats.copper, spots.length);
  const band = new THREE.InstancedMesh(bandGeo, mats.goldBright, spots.length);
  body.castShadow = true;
  band.castShadow = true;
  body.frustumCulled = false;
  band.frustumCulled = false;
  const axles = [];
  for (const s of spots) addCylinder(axles, 0.055, 0.055, 2.4, 6, s.x, 45.2, s.z);
  const axleMesh = new THREE.Mesh(mergeGeometries(axles, false), mats.copper);
  axleMesh.castShadow = true;
  return { body, band, axleMesh, spots };
}

function buildBirds() {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute([
    -1.25, 0, 0.16, 0, 0, 0.24, 0, 0, -0.36,
    1.25, 0, 0.16, 0, 0, 0.24, 0, 0, -0.36,
  ], 3));
  geo.computeVertexNormals();
  const mat = new THREE.MeshBasicMaterial({ color: 0x2b2723, side: THREE.DoubleSide });
  const mesh = new THREE.InstancedMesh(geo, mat, 28);
  mesh.frustumCulled = false;
  const data = [];
  for (let i = 0; i < 28; i++) {
    data.push({
      r: 95 + Math.random() * 185,
      y: 104 + Math.random() * 76,
      speed: 0.055 + Math.random() * 0.07,
      phase: Math.random() * Math.PI * 2,
      s: 1.1 + Math.random() * 1.5,
    });
  }
  return { mesh, data };
}

export function createAmbient() {
  const group = new THREE.Group();
  const flags = buildFlags();
  group.add(flags.mesh);
  const poles = buildPoles();
  group.add(poles.woodMesh, poles.goldMesh, poles.copperMesh);
  const wheels = buildWheels();
  group.add(wheels.body, wheels.band, wheels.axleMesh);
  const birds = buildBirds();
  group.add(birds.mesh);
  const dummy = new THREE.Object3D();
  function updateWheels(time) {
    for (let i = 0; i < wheels.spots.length; i++) {
      const s = wheels.spots[i];
      dummy.position.set(s.x, 45.15, s.z);
      dummy.rotation.set(0, time * 0.55 + s.phase, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      wheels.body.setMatrixAt(i, dummy.matrix);
      wheels.band.setMatrixAt(i, dummy.matrix);
    }
    wheels.body.instanceMatrix.needsUpdate = true;
    wheels.band.instanceMatrix.needsUpdate = true;
  }
  function updateBirds(time) {
    for (let i = 0; i < birds.data.length; i++) {
      const b = birds.data[i];
      const a = b.phase + time * b.speed;
      dummy.position.set(
        -10 + Math.cos(a) * b.r,
        b.y + Math.sin(time * 1.4 + b.phase * 2) * 4.5,
        20 + Math.sin(a) * b.r * 0.86
      );
      dummy.rotation.set(0, -a, Math.sin(time * 2.2 + b.phase) * 0.18);
      dummy.scale.setScalar(b.s);
      dummy.updateMatrix();
      birds.mesh.setMatrixAt(i, dummy.matrix);
    }
    birds.mesh.instanceMatrix.needsUpdate = true;
  }
  updateWheels(0);
  updateBirds(0);
  return {
    group,
    update(time) {
      flags.mat.uniforms.uTime.value = time;
      updateWheels(time);
      updateBirds(time);
    },
  };
}
