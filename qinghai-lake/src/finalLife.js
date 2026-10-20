import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mats } from './materials.js';

function rnd(seed, n) {
  const v = Math.sin(seed * 97.31 + n * 53.77) * 43758.5453;
  return v - Math.floor(v);
}

const WILLOWS = [
  [-34, -62, 1.15, 1.1], [-8, -73, 1.15, 1.0], [4, 22, 0.95, 0.9],
  [-48, 98, 1.05, 0.95], [-33, 109, 1.05, 0.85], [-140, -114, 0, 1.0],
  [-174, -80, 0, 1.0], [-184, 12, 0, 1.0], [-168, 94, 0, 1.0],
  [-128, 140, 0, 1.0], [-68, 168, 0, 1.0], [42, 174, 0, 1.0],
  [118, 144, 0, 1.0], [156, 78, 0, 1.0], [164, 16, 0, 1.0],
  [148, -72, 0, 1.0], [104, -108, 0, 1.0], [-112, -100, 0.55, 1.0],
  [-120, -48, 0.55, 1.0], [-126, 8, 0.55, 1.0], [-132, 70, 0.55, 1.0],
  [-137, 112, 0.55, 1.0], [126, -108, 0.55, 1.0], [90, -97, 0.55, 1.0],
  [58, -88, 0.55, 1.0], [24, -79, 0.55, 1.0],
];

const PETAL_TREES = [
  [-47, -62, 1.15], [-21, -85, 1.15], [12, 22, 0.95], [-36, 96, 1.05],
  [-44, 111, 1.05], [36, 62, 0.8], [-34, -62, 1.15], [-8, -73, 1.15],
  [-48, 98, 1.05], [-33, 109, 1.05],
];

function strandGeometry() {
  const rows = 6;
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let i = 0; i < rows; i++) {
    const t = i / (rows - 1);
    const w = 0.025 + 0.055 * t;
    const z = Math.sin(t * Math.PI) * 0.12;
    positions.push(-w, -t, z, w, -t, z);
    uvs.push(0, t, 1, t);
  }
  for (let i = 0; i < rows - 1; i++) {
    const a = i * 2;
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function lotusGeometry() {
  const parts = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const petal = new THREE.ConeGeometry(0.065, 0.22, 4, 1, true);
    petal.translate(0, 0.11, 0);
    petal.rotateZ(0.62);
    petal.rotateY(a);
    petal.translate(Math.cos(a) * 0.035, 0.02, Math.sin(a) * 0.035);
    parts.push(petal);
  }
  const center = new THREE.SphereGeometry(0.04, 6, 4);
  center.translate(0, 0.1, 0);
  parts.push(center);
  return mergeGeometries(parts, false);
}

function createWillowLife(group) {
  const strands = [];
  WILLOWS.forEach(([x, z, y, scale], ti) => {
    const count = 10;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + rnd(ti + 31, i) * 0.7;
      const r = 0.8 + rnd(ti + 41, i) * 1.9;
      const h = 6.9 + rnd(ti + 51, i) * 1.6;
      strands.push({
        x: x + Math.cos(a) * r,
        y: y + h * (0.58 + rnd(ti + 61, i) * 0.1) * scale,
        z: z + Math.sin(a) * r,
        len: 2.8 + rnd(ti + 71, i) * 2.2,
        yaw: rnd(ti + 81, i) * 6.28,
        phase: rnd(ti + 91, i) * 6.28,
        speed: 0.7 + rnd(ti + 101, i) * 0.7,
      });
    }
  });
  const mesh = new THREE.InstancedMesh(
    strandGeometry(),
    new THREE.MeshStandardMaterial({ color: 0x819e58, roughness: 0.92, side: THREE.DoubleSide }),
    strands.length
  );
  mesh.frustumCulled = false;
  group.add(mesh);
  return { mesh, strands };
}

function createPetalLife(group, bridges) {
  const spots = PETAL_TREES.slice();
  bridges.forEach((b, i) => {
    const side = i % 2 === 0 ? 1 : -1;
    spots.push([b.x + side * (b.width * 0.5 + 4.2), b.z + (i % 3 - 1) * 4.2, 0.08]);
  });
  const count = 180;
  const data = [];
  for (let i = 0; i < count; i++) {
    const s = spots[i % spots.length];
    data.push({
      x: s[0] + (rnd(i + 11, 1) - 0.5) * 5.2,
      z: s[1] + (rnd(i + 11, 2) - 0.5) * 5.2,
      y0: s[2] + 3.4 + rnd(i + 11, 3) * 3.4,
      speed: 0.24 + rnd(i + 11, 4) * 0.42,
      phase: rnd(i + 11, 5) * 12,
      drift: 0.35 + rnd(i + 11, 6) * 0.6,
    });
  }
  const geo = new THREE.CircleGeometry(0.075, 5);
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.InstancedMesh(geo, mats.petal, count);
  mesh.frustumCulled = false;
  const color = new THREE.Color();
  data.forEach((p, i) => {
    color.setHex(i % 4 === 0 ? 0xf6ecec : i % 3 === 0 ? 0xe7b7b8 : 0xdf9fa6);
    mesh.setColorAt(i, color);
  });
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  group.add(mesh);
  return { mesh, data };
}

function createLotusLife(group, lotusBeds) {
  const data = [];
  lotusBeds.forEach(([x, z, r], bi) => {
    if (bi % 2 === 1) return;
    const count = 4;
    for (let i = 0; i < count; i++) {
      const a = rnd(bi + 201, i) * Math.PI * 2;
      const rr = Math.sqrt(rnd(bi + 211, i)) * r * 0.72;
      data.push({
        x: x + Math.cos(a) * rr,
        z: z + Math.sin(a) * rr,
        y: 0.38 + rnd(bi + 221, i) * 0.22,
        phase: rnd(bi + 231, i) * 6.28,
        scale: 0.8 + rnd(bi + 241, i) * 0.45,
      });
    }
  });
  const mesh = new THREE.InstancedMesh(lotusGeometry(), mats.blossom, data.length);
  mesh.frustumCulled = false;
  const color = new THREE.Color();
  data.forEach((p, i) => {
    color.setHex(i % 5 === 0 ? 0xf3dde0 : i % 3 === 0 ? 0xe8b3bb : 0xdf9fa6);
    mesh.setColorAt(i, color);
  });
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  group.add(mesh);
  return { mesh, data };
}

function createReflectionLife(group, bridges, santan) {
  const data = [];
  bridges.forEach((b) => {
    const c = Math.cos(b.rot);
    const s = Math.sin(b.rot);
    for (const side of [-1, 1]) {
      for (const end of [-1, 1]) {
        const lx = side * (b.width * 0.5 + 0.6);
        const lz = end * (b.span * 0.5 + 0.55);
        data.push({
          x: b.x + lx * c + lz * s,
          z: b.z - lx * s + lz * c,
          rot: b.rot,
          len: 3.4 + (b.span % 5) * 0.3,
        });
      }
    }
  });
  santan.forEach(([x, z], i) => {
    data.push({ x, z, rot: i * 1.1, len: 4.6 });
  });
  const geo = new THREE.PlaneGeometry(0.62, 1);
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, 0, -0.5);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffd39a,
    transparent: true,
    opacity: 0.12,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, data.length);
  mesh.frustumCulled = false;
  mesh.renderOrder = 2;
  group.add(mesh);
  return { mesh, data };
}

export function createWestLakeFinalLife({
  lotusBeds = [],
  bridges = [],
  santan = [],
} = {}) {
  const group = new THREE.Group();
  group.name = 'westlake-final-life';
  const dummy = new THREE.Object3D();
  const willow = createWillowLife(group);
  const petals = createPetalLife(group, bridges);
  const lotus = createLotusLife(group, lotusBeds);
  const reflections = createReflectionLife(group, bridges, santan);

  function update(time) {
    willow.strands.forEach((s, i) => {
      const sway = Math.sin(time * s.speed + s.phase) * 0.14;
      dummy.position.set(s.x, s.y, s.z);
      dummy.rotation.set(sway * 0.4, s.yaw + Math.sin(time * 0.5 + s.phase) * 0.18, sway);
      dummy.scale.set(1, s.len, 1);
      dummy.updateMatrix();
      willow.mesh.setMatrixAt(i, dummy.matrix);
    });
    willow.mesh.instanceMatrix.needsUpdate = true;

    petals.data.forEach((p, i) => {
      const span = p.y0 - 0.12;
      const fall = (time * p.speed + p.phase) % span;
      const y = p.y0 - fall;
      const x = p.x + Math.sin(time * p.drift + p.phase) * 1.4;
      const z = p.z + Math.cos(time * p.drift * 0.7 + p.phase) * 1.1;
      dummy.position.set(x, y, z);
      dummy.rotation.set(time * 1.2 + p.phase, time * 1.7 + p.phase, Math.sin(time + p.phase) * 0.8);
      dummy.scale.set(1, 1, 0.7);
      dummy.updateMatrix();
      petals.mesh.setMatrixAt(i, dummy.matrix);
    });
    petals.mesh.instanceMatrix.needsUpdate = true;

    lotus.data.forEach((p, i) => {
      const bloom = 0.82 + 0.18 * Math.sin(time * 0.55 + p.phase);
      dummy.position.set(p.x, p.y + Math.sin(time * 0.8 + p.phase) * 0.025, p.z);
      dummy.rotation.set(0, p.phase + Math.sin(time * 0.3 + p.phase) * 0.2, 0);
      dummy.scale.set(p.scale * bloom, p.scale * (0.9 + bloom * 0.15), p.scale * bloom);
      dummy.updateMatrix();
      lotus.mesh.setMatrixAt(i, dummy.matrix);
    });
    lotus.mesh.instanceMatrix.needsUpdate = true;

    reflections.mesh.material.opacity = 0.1 + 0.035 * (0.5 + 0.5 * Math.sin(time * 1.9));
    reflections.data.forEach((r, i) => {
      dummy.position.set(r.x, 0.17, r.z);
      dummy.rotation.set(0, r.rot, 0);
      dummy.scale.set(1, 1, r.len);
      dummy.updateMatrix();
      reflections.mesh.setMatrixAt(i, dummy.matrix);
    });
    reflections.mesh.instanceMatrix.needsUpdate = true;
  }

  update(0);
  return { group, update };
}
