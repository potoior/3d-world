import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { clamp, isLand, lakeInfo, rand, terrainHeight } from './sayramTerrain.js';

function addInstanced(root, geo, material, count, layer = 1) {
  const im = new THREE.InstancedMesh(geo, material, count);
  im.castShadow = false;
  im.receiveShadow = true;
  im.layers.set(layer);
  root.add(im);
  return im;
}

function distanceToPolyline(x, z, pts) {
  let min = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const vx = b[0] - a[0];
    const vz = b[1] - a[1];
    const len2 = vx * vx + vz * vz || 1;
    const t = clamp(((x - a[0]) * vx + (z - a[1]) * vz) / len2, 0, 1);
    const dx = x - a[0] - vx * t;
    const dz = z - a[1] - vz * t;
    const d = dx * dx + dz * dz;
    if (d < min) min = d;
  }
  return Math.sqrt(min);
}


function mergeFlower(parts) {
  return mergeGeometries(
    parts.map((g) => {
      let x = g.index ? g.toNonIndexed() : g;
      for (const key of Object.keys(x.attributes)) {
        if (key !== 'position' && key !== 'normal') x.deleteAttribute(key);
      }
      if (!x.attributes.normal) x.computeVertexNormals();
      return x;
    }),
    false
  );
}

function blossomGeometry(petals, ballR, petalLen) {
  const parts = [];
  const ball = new THREE.TetrahedronGeometry(ballR, 0);
  ball.scale(1.35, 0.82, 1.35);
  ball.translate(0, ballR * 0.22, 0);
  parts.push(ball);
  const pos = [];
  for (let i = 0; i < petals; i++) {
    const a = (i / petals) * Math.PI * 2;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const bx = ca * ballR * 0.45;
    const bz = sa * ballR * 0.45;
    const tx = ca * petalLen;
    const tz = sa * petalLen;
    const ny = ballR * 0.8;
    pos.push(
      bx - sa * ballR * 0.32, ballR * 0.12, bz + ca * ballR * 0.32,
      bx + sa * ballR * 0.32, ballR * 0.12, bz - ca * ballR * 0.32,
      tx, ny, tz
    );
  }
  const petalsGeo = new THREE.BufferGeometry();
  petalsGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  petalsGeo.computeVertexNormals();
  parts.push(petalsGeo);
  return mergeFlower(parts);
}

function spikeGeometry(radius, height) {
  const cone = new THREE.ConeGeometry(radius, height, 5, 1);
  cone.translate(0, height * 0.5, 0);
  return cone;
}

function petalGeometry(petals, length, width, lift) {
  const pos = [];
  const push = (x, y, z) => pos.push(x, y, z);
  for (let i = 0; i < petals; i++) {
    const a = (i / petals) * Math.PI * 2;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const c = [Math.sin(a) * 0.018, 0, Math.cos(a) * 0.018];
    const l = [ca * -width + sa * length * 0.36, 0.004, sa * -width + ca * length * 0.36];
    const t = [sa * length, lift, ca * length];
    const r = [ca * width + sa * length * 0.36, 0.004, sa * width + ca * length * 0.36];
    push(...c);
    push(...l);
    push(...t);
    push(...c);
    push(...t);
    push(...r);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

function stemGeometry() {
  const pos = [
    -0.019, 0, 0, 0.019, 0, 0, 0.011, 1, 0,
    -0.019, 0, 0, 0.011, 1, 0, -0.011, 1, 0,
  ];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

function grassTuftGeometry() {
  const pos = [];
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.35;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const w = 0.035;
    const h = 0.62 + i * 0.13;
    const lean = 0.12;
    const bx = ca * 0.05;
    const bz = sa * 0.05;
    const tx = ca * lean;
    const tz = sa * lean;
    pos.push(
      bx - sa * w, 0, bz + ca * w,
      bx + sa * w, 0, bz - ca * w,
      tx, h, tz,
      bx - sa * w, 0, bz + ca * w,
      tx, h, tz,
      tx - sa * w * 0.4, h * 0.36, tz + ca * w * 0.4
    );
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

function makeClusters(seed, count, area, roadPts) {
  const out = [];
  let attempts = 0;
  while (out.length < count && attempts < count * 70) {
    attempts++;
    const x = area.xMin + rand(seed + attempts, 1) * (area.xMax - area.xMin);
    const z = area.zMin + rand(seed + attempts, 2) * (area.zMax - area.zMin);
    if (!isLand(x, z, 11)) continue;
    if (distanceToPolyline(x, z, roadPts) < 18) continue;
    out.push([x, z]);
  }
  return out;
}

function sampleCluster(clusters, seed, i, radius) {
  const c = clusters[Math.abs(Math.floor(rand(seed + i, 11) * clusters.length)) % clusters.length];
  const a = rand(seed + i, 12) * Math.PI * 2;
  const r = Math.sqrt(rand(seed + i, 13)) * radius;
  return [c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r];
}

export function createWildflowers(roadPts) {
  const root = new THREE.Group();
  root.name = 'sayram-wildflower-sea';

  const species = [
    {
      count: 10500,
      seed: 101,
      geo: blossomGeometry(4, 0.19, 0.46),
      colors: [0xffd21f, 0xffc400, 0xffe24a, 0xffb300, 0xffdf5c],
      height: [0.62, 1.12],
      radius: 46,
    },
    {
      count: 8000,
      seed: 202,
      geo: spikeGeometry(0.12, 0.56),
      colors: [0x7b3ff2, 0x9353ff, 0x6a34d8, 0xb06cff, 0x5f2ec4],
      height: [0.9, 1.4],
      radius: 38,
    },
    {
      count: 9000,
      seed: 303,
      geo: blossomGeometry(5, 0.17, 0.4),
      colors: [0xfff9ea, 0xf7f3df, 0xffeaf0, 0xffdce8, 0xffffff],
      height: [0.62, 1.12],
      radius: 50,
    },
    {
      count: 8500,
      seed: 404,
      geo: blossomGeometry(4, 0.155, 0.36),
      colors: [0x1d5fe0, 0x2e7cff, 0x4b9bff, 0x1650c8, 0x6cb7ff],
      height: [0.52, 0.94],
      radius: 42,
    },
  ];

  const area = { xMin: -700, xMax: 700, zMin: -390, zMax: 500 };
  const stemMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.95,
    side: THREE.DoubleSide,
  });
  const blossomMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.58,
    metalness: 0,
    side: THREE.DoubleSide,
    emissive: new THREE.Color(0x0b0d0a),
    emissiveIntensity: 0.08,
  });
  const total = species.reduce((s, x) => s + x.count, 0);
  const stems = addInstanced(root, stemGeometry(), stemMat, total);
  const stemColor = new THREE.Color();
  const color = new THREE.Color();
  const dummy = new THREE.Object3D();
  let index = 0;

  species.forEach((sp) => {
    const clusters = makeClusters(sp.seed, 26, { xMin: -680, xMax: 680, zMin: 80, zMax: 470 }, roadPts).concat(makeClusters(sp.seed + 444, 10, { xMin: -20, xMax: 280, zMin: 170, zMax: 370 }, roadPts)).concat(makeClusters(sp.seed + 777, 7, area, roadPts));
    if (!clusters.length) clusters.push([0, 260]);
    const mat = blossomMat.clone();
    mat.toneMapped = sp.seed !== 303;
    const blossoms = addInstanced(root, sp.geo, mat, sp.count);
    for (let i = 0; i < sp.count; i++) {
      let x = 0;
      let z = 0;
      let ok = false;
      for (let k = 0; k < 9; k++) {
        [x, z] = sampleCluster(clusters, sp.seed + k * 37, i, sp.radius);
        if (isLand(x, z, 4.2) && distanceToPolyline(x, z, roadPts) > 8.2) {
          ok = true;
          break;
        }
      }
      if (!ok) {
        const c = clusters[i % clusters.length];
        x = c[0] + (rand(sp.seed, i) - 0.5) * 4;
        z = c[1] + (rand(sp.seed, i + 3) - 0.5) * 4;
      }
      const g = terrainHeight(x, z);
      const h = sp.height[0] + rand(sp.seed + i, 21) * (sp.height[1] - sp.height[0]);
      const swell = 1.15 + rand(sp.seed + i, 22) * 0.95;
      const yaw = rand(sp.seed + i, 23) * Math.PI * 2;
      const tilt = (rand(sp.seed + i, 24) - 0.5) * 0.16;
      dummy.position.set(x, g, z);
      dummy.rotation.set(0, yaw, 0);
      dummy.scale.set(swell * 0.92, h, swell * 0.92);
      dummy.updateMatrix();
      stems.setMatrixAt(index, dummy.matrix);
      color.setHex([0x4b7c31, 0x5e913c, 0x6e9f48, 0x3d6b2b, 0x7aa452][i % 5]);
      stems.setColorAt(index, color);
      dummy.position.set(x, g + h, z);
      dummy.rotation.set(tilt, yaw, tilt * 0.7);
      dummy.scale.setScalar(swell * (sp.seed === 202 ? 1 : 0.95));
      dummy.updateMatrix();
      blossoms.setMatrixAt(i, dummy.matrix);
      color.setHex(sp.colors[Math.floor(rand(sp.seed + i, 25) * sp.colors.length) % sp.colors.length]);
      blossoms.setColorAt(i, color);
      index++;
    }
    blossoms.instanceMatrix.needsUpdate = true;
    blossoms.instanceColor.needsUpdate = true;
  });

  stems.instanceMatrix.needsUpdate = true;
  stems.instanceColor.needsUpdate = true;
  return root;
}

export function createGrass(roadPts) {
  const root = new THREE.Group();
  root.name = 'sayram-grassland';
  const count = 14000;
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.98,
    side: THREE.DoubleSide,
  });
  const mesh = addInstanced(root, grassTuftGeometry(), mat, count);
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  let filled = 0;
  let tries = 0;
  while (filled < count && tries < count * 18) {
    tries++;
    const x = -760 + rand(701 + tries, 1) * 1520;
    const z = -430 + rand(701 + tries, 2) * 970;
    if (!isLand(x, z, 2.8)) continue;
    if (distanceToPolyline(x, z, roadPts) < 7.4) continue;
    const g = terrainHeight(x, z);
    const s = 0.32 + rand(701 + tries, 3) * 0.62;
    dummy.position.set(x, g, z);
    dummy.rotation.set(0, rand(701 + tries, 4) * Math.PI * 2, 0);
    dummy.scale.set(s * (0.65 + rand(701 + tries, 5) * 0.7), s, s);
    dummy.updateMatrix();
    mesh.setMatrixAt(filled, dummy.matrix);
    const v = rand(701 + tries, 6);
    if (v < 0.24) color.setHex(0x3e6a2c);
    else if (v < 0.58) color.setHex(0x5c8738);
    else if (v < 0.86) color.setHex(0x7da24a);
    else color.setHex(0x9b9a4e);
    mesh.setColorAt(filled, color);
    filled++;
  }
  mesh.count = filled;
  mesh.instanceMatrix.needsUpdate = true;
  mesh.instanceColor.needsUpdate = true;
  return root;
}
