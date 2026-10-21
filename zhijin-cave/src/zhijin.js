import * as THREE from 'three';
import { mergeStaticGroup } from './geometry.js';
import {
  caveMaterials as M,
  caveFloorHeight,
  caveCeilingHeight,
  riverX,
  riverHalf,
  insideCave,
  CAVE,
} from './scene.js';
import {
  makeStalagmiteGeometry,
  makeStalactiteGeometry,
  makeCurtainGeometry,
  makeColumnGeometry,
  makeHelictiteClusters,
} from './zhijinShapes.js';
import { buildWalkways, walkMainX, walkRiverX } from './zhijinWalkway.js';
import { colliders } from './architectures.js';

function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(0x7a11e1);

function nearWalkway(x, z, pad = 3.5) {
  if (z <= 142 && z >= -32 && Math.abs(x - walkMainX(z)) < 5 + pad) return true;
  if (z <= 102 && z >= -54 && Math.abs(x - walkRiverX(z)) < 4.4 + pad) return true;
  if (Math.abs(z - 26) < 3.8 + pad && x > -18 && x < 33) return true;
  return false;
}

function nearWater(x, z, pad = 2) {
  if (Math.abs(x - riverX(z)) < riverHalf(z) + 5 + pad) return true;
  if (Math.hypot((x - 52) / 22, (z + 64) / 15) < 1.2 + pad / 18) return true;
  if (Math.hypot((x + 2) / 11, (z - 103) / 8) < 1.18 + pad / 18) return true;
  if (Math.hypot((x - 63) / 14, (z - 70) / 10) < 1.18 + pad / 18) return true;
  return false;
}

function freeSpot(x, z, clearance = 3) {
  if (!insideCave(x, z, 0.9)) return false;
  if (nearWater(x, z, clearance * 0.4)) return false;
  if (nearWalkway(x, z, clearance)) return false;
  return true;
}

function addInstanced(root, geo, material, transforms, tint = 1) {
  if (!transforms.length) return null;
  const mesh = new THREE.InstancedMesh(geo, material, transforms.length);
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  transforms.forEach((t, i) => {
    dummy.position.set(t.x, t.y, t.z);
    dummy.rotation.set(0, t.ry || 0, 0);
    dummy.scale.set(t.sx, t.sy, t.sx);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    color.setRGB(tint, tint * 0.97, tint * 0.9);
    mesh.setColorAt(i, color);
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  root.add(mesh);
  return mesh;
}

function buildHeroFormations(root) {
  const heroes = [
    { x: 0, z: -36, h: 46, r: 10.5, seed: 4, lean: 0.035 },
    { x: 36, z: -26, h: 30, r: 7.4, seed: 11, lean: 0.05 },
    { x: -42, z: -4, h: 27, r: 8.2, seed: 21, lean: 0.04 },
    { x: 10, z: -6, h: 19, r: 5.2, seed: 33, lean: 0.06 },
    { x: -12, z: 62, h: 16, r: 4.8, seed: 41, lean: 0.05 },
    { x: 58, z: -104, h: 24, r: 6.6, seed: 52, lean: 0.04 },
    { x: -68, z: 88, h: 20, r: 5.6, seed: 63, lean: 0.05 },
    { x: 42, z: 96, h: 14, r: 4.4, seed: 74, lean: 0.06 },
  ];
  for (const h of heroes) {
    const base = caveFloorHeight(h.x, h.z);
    const geo = makeStalagmiteGeometry({ height: h.h, radius: h.r, seed: h.seed, lean: h.lean });
    const mesh = new THREE.Mesh(geo, M.flowstone);
    mesh.position.set(h.x, base - 0.2, h.z);
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    root.add(mesh);
    colliders.push({
      name: '织金洞石笋',
      minX: h.x - h.r * 0.78,
      maxX: h.x + h.r * 0.78,
      minZ: h.z - h.r * 0.78,
      maxZ: h.z + h.r * 0.78,
    });
  }

  const columns = [
    { x: -8, z: -22, r: 5.2, seed: 3, lx: 0.006, lz: -0.004 },
    { x: 18, z: -48, r: 5.8, seed: 9, lx: -0.005, lz: 0.004 },
    { x: -46, z: 24, r: 5.4, seed: 17, lx: 0.004, lz: 0.005 },
    { x: 44, z: 8, r: 4.8, seed: 27, lx: -0.006, lz: -0.003 },
  ];
  for (const c of columns) {
    const floor = caveFloorHeight(c.x, c.z);
    const top = caveCeilingHeight(c.x, c.z);
    const height = Math.max(24, top - floor + 2.4);
    const geo = makeColumnGeometry({ height, radius: c.r, seed: c.seed, leanX: c.lx, leanZ: c.lz });
    const mesh = new THREE.Mesh(geo, M.rock);
    mesh.position.set(c.x, floor - 0.2, c.z);
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    root.add(mesh);

    for (const t of [0.16, 0.34, 0.51, 0.68, 0.82]) {
      const ringR = c.r * (0.83 + 0.12 * Math.sin(t * Math.PI * 2.2 + c.seed));
      const torus = new THREE.TorusGeometry(ringR, 0.42, 5, 26);
      torus.rotateX(Math.PI / 2);
      torus.rotateY(c.seed * 0.4);
      torus.translate(c.x + c.lx * height * t * t, floor + height * t, c.z + c.lz * height * t * t);
      const ring = new THREE.Mesh(torus, M.rock);
      root.add(ring);
    }

    colliders.push({
      name: '织金洞石柱',
      minX: c.x - c.r * 0.9,
      maxX: c.x + c.r * 0.9,
      minZ: c.z - c.r * 0.9,
      maxZ: c.z + c.r * 0.9,
    });
  }
}

function buildStalagmiteField(root) {
  const variants = [
    makeStalagmiteGeometry({ height: 8, radius: 2.2, seed: 101, seg: 12, rings: 12 }),
    makeStalagmiteGeometry({ height: 6.5, radius: 1.7, seed: 202, seg: 11, rings: 11 }),
    makeStalagmiteGeometry({ height: 11, radius: 2.8, seed: 303, seg: 13, rings: 13 }),
    makeStalagmiteGeometry({ height: 4.2, radius: 1.25, seed: 404, seg: 10, rings: 9 }),
    makeStalagmiteGeometry({ height: 2.2, radius: 0.65, seed: 505, seg: 8, rings: 7 }),
  ];
  const sets = variants.map(() => []);
  const attempts = 760;
  for (let i = 0; i < attempts; i++) {
    const x = (rand() * 2 - 1) * CAVE.rx * 0.9;
    const z = (rand() * 2 - 1) * CAVE.rz * 0.9;
    if (!freeSpot(x, z, 1.6)) continue;
    const v = Math.floor(rand() * variants.length);
    const s = v === 4 ? 0.4 + rand() * 0.9 : 0.3 + rand() * 1.15;
    const y = caveFloorHeight(x, z) - 0.15;
    sets[v].push({ x, y, z, sx: s * (0.8 + rand() * 0.4), sy: s, ry: rand() * Math.PI * 2 });
  }
  variants.forEach((geo, i) => addInstanced(root, geo, M.flowstone, sets[i], 0.96));
}

function buildStalactites(root) {
  const variants = [
    makeStalactiteGeometry({ height: 12, radius: 2.1, seed: 7, seg: 11, rings: 12 }),
    makeStalactiteGeometry({ height: 9, radius: 1.5, seed: 14, seg: 10, rings: 11 }),
    makeStalactiteGeometry({ height: 16, radius: 2.9, seed: 28, seg: 12, rings: 13 }),
    makeStalactiteGeometry({ height: 6.5, radius: 1.1, seed: 42, seg: 9, rings: 9 }),
  ];
  const sets = variants.map(() => []);
  for (let i = 0; i < 700; i++) {
    const x = (rand() * 2 - 1) * CAVE.rx * 0.92;
    const z = (rand() * 2 - 1) * CAVE.rz * 0.92;
    if (!insideCave(x, z, 0.92)) continue;
    const v = Math.floor(rand() * variants.length);
    const ceil = caveCeilingHeight(x, z);
    if (ceil < 8) continue;
    let sy = 0.42 + rand() * 1.25;
    const length = [12, 9, 16, 6.5][v] * sy;
    const floor = caveFloorHeight(x, z);
    if (ceil - length < floor + 5) {
      sy = Math.max(0.3, (ceil - floor - 5) / [12, 9, 16, 6.5][v]);
    }
    const sx = 0.62 + rand() * 0.9;
    sets[v].push({ x, y: ceil + 0.1, z, sx, sy, ry: rand() * Math.PI * 2 });
  }
  variants.forEach((geo, i) => addInstanced(root, geo, M.flowstone, sets[i], 0.97));

  const strawGeo = makeStalactiteGeometry({ height: 5.5, radius: 0.38, seed: 88, seg: 6, rings: 6 });
  const straws = [];
  for (let i = 0; i < 420; i++) {
    const x = (rand() * 2 - 1) * CAVE.rx * 0.86;
    const z = (rand() * 2 - 1) * CAVE.rz * 0.86;
    if (!insideCave(x, z, 0.9)) continue;
    const ceil = caveCeilingHeight(x, z);
    if (ceil < 14) continue;
    straws.push({
      x,
      y: ceil + 0.05,
      z,
      sx: 0.7 + rand() * 0.8,
      sy: 0.5 + rand() * 1.7,
      ry: rand() * Math.PI * 2,
    });
  }
  addInstanced(root, strawGeo, M.flowstone, straws, 1.02);
}

function buildCurtains(root) {
  const angles = [0.42, 0.95, 1.5, 2.05, 2.62, 3.18, 3.76, 4.3, 4.86, 5.42, 5.96];
  angles.forEach((angle, i) => {
    const rr = 0.82 + (i % 3) * 0.05;
    const x = CAVE.rx * rr * Math.cos(angle);
    const z = CAVE.rz * rr * Math.sin(angle);
    const ceil = caveCeilingHeight(x, z);
    const width = 11 + (i % 4) * 4.5;
    const height = Math.min(24, Math.max(10, ceil * 0.55 + (i % 3) * 4));
    const top = Math.min(ceil - 2, 30 + (i % 4) * 4);
    const geo = makeCurtainGeometry({ width, height, seed: i * 3.17 + 1, cols: 24, rows: 20 });
    const mesh = new THREE.Mesh(geo, M.flowstone);
    mesh.position.set(x, top, z);
    mesh.rotation.y = Math.atan2(-x, -z);
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    root.add(mesh);
  });

  for (let i = 0; i < 9; i++) {
    const angle = rand() * Math.PI * 2;
    const rr = 0.44 + rand() * 0.32;
    const x = CAVE.rx * rr * Math.cos(angle);
    const z = CAVE.rz * rr * Math.sin(angle);
    const ceil = caveCeilingHeight(x, z);
    const width = 7 + rand() * 8;
    const height = 8 + rand() * 9;
    const geo = makeCurtainGeometry({ width, height, seed: 50 + i * 2.3, cols: 20, rows: 16 });
    const mesh = new THREE.Mesh(geo, M.flowstone);
    mesh.position.set(x, ceil - 1.5, z);
    mesh.rotation.y = rand() * Math.PI * 2;
    root.add(mesh);
  }
}

function buildHelictites(root) {
  const anchors = [];
  const clusters = [
    new THREE.Vector3(-8, 20, -22),
    new THREE.Vector3(0, 26, -36),
    new THREE.Vector3(18, 24, -48),
    new THREE.Vector3(-46, 18, 24),
    new THREE.Vector3(44, 16, 8),
  ];
  for (const c of clusters) {
    for (let i = 0; i < 7; i++) {
      anchors.push(
        new THREE.Vector3(
          c.x + (rand() - 0.5) * 9,
          c.y + (rand() - 0.5) * 10,
          c.z + (rand() - 0.5) * 9
        )
      );
    }
  }
  for (let i = 0; i < 48; i++) {
    const angle = rand() * Math.PI * 2;
    const rr = 0.42 + rand() * 0.46;
    const x = CAVE.rx * rr * Math.cos(angle);
    const z = CAVE.rz * rr * Math.sin(angle);
    const y = 8 + rand() * 34;
    anchors.push(new THREE.Vector3(x, y, z));
  }
  const geo = makeHelictiteClusters(anchors.slice(0, 70), rand);
  const mesh = new THREE.Mesh(geo, M.helictite);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  root.add(mesh);
}

function buildLights(extras, walkAnchors) {
  const defs = [
    { x: 0, y: 16, z: -34, color: 0xffb266, intensity: 1500, distance: 84, phase: 0.2, speed: 0.65 },
    { x: -8, y: 27, z: -22, color: 0x63d8ff, intensity: 1250, distance: 74, phase: 1.4, speed: 0.52 },
    { x: -27, y: 5, z: 24, color: 0x2fe0c6, intensity: 1000, distance: 62, phase: 2.7, speed: 0.74 },
    { x: 18, y: 24, z: -48, color: 0x8cf27c, intensity: 950, distance: 68, phase: 3.1, speed: 0.61 },
    { x: 44, y: 12, z: 8, color: 0xff74c8, intensity: 820, distance: 58, phase: 4.4, speed: 0.8 },
    { x: 7, y: 47, z: -55, color: 0x7d9cff, intensity: 1100, distance: 80, phase: 5.2, speed: 0.47 },
    { x: 51, y: 7, z: -64, color: 0x5fd4ff, intensity: 900, distance: 58, phase: 0.9, speed: 0.69 },
    { x: -46, y: 13, z: 24, color: 0xc883ff, intensity: 760, distance: 56, phase: 2.2, speed: 0.57 },
    { x: -72, y: 28, z: -48, color: 0x548cff, intensity: 1250, distance: 98, phase: 3.7, speed: 0.36 },
    { x: 72, y: 24, z: 64, color: 0xffa266, intensity: 1000, distance: 88, phase: 1.8, speed: 0.42 },
    { x: -78, y: 18, z: 84, color: 0xd06aff, intensity: 900, distance: 82, phase: 5.6, speed: 0.48 },
  ];
  const lights = [];
  for (const d of defs) {
    const light = new THREE.PointLight(d.color, d.intensity, d.distance, 2);
    light.position.set(d.x, d.y, d.z);
    extras.add(light);
    lights.push({ light, base: d.intensity, phase: d.phase, speed: d.speed });
  }

  const warm = walkAnchors.filter((_, i) => i % 4 === 1).slice(0, 6);
  for (let i = 0; i < warm.length; i++) {
    const a = warm[i];
    const light = new THREE.PointLight(0xffb066, 105, 26, 2);
    light.position.set(a.x, a.y + 0.1, a.z);
    extras.add(light);
    lights.push({ light, base: 105, phase: i * 1.7, speed: 0.9 });
  }

  const positions = [];
  const colors = [];
  const color = new THREE.Color();
  for (const d of defs) {
    positions.push(d.x, d.y, d.z);
    color.setHex(d.color);
    colors.push(color.r, color.g, color.b);
  }
  for (const a of walkAnchors) {
    positions.push(a.x, a.y, a.z);
    color.setHex(0xffb066);
    colors.push(color.r * 0.85, color.g * 0.62, color.b * 0.3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const glowMat = new THREE.PointsMaterial({
    map: M.glowTexture,
    size: 11,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.64,
    depthWrite: false,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
  });
  const glow = new THREE.Points(geo, glowMat);
  glow.frustumCulled = false;
  extras.add(glow);

  const riverPositions = [];
  const riverColors = [];
  for (let z = -138; z <= 138; z += 7) {
    riverPositions.push(riverX(z) + Math.sin(z * 0.17) * 3.5, CAVE.waterY + 0.42, z);
    color.setHex(z % 3 === 0 ? 0x9ff8ec : 0x49c9c4);
    riverColors.push(color.r * 0.8, color.g * 0.8, color.b * 0.8);
  }
  const riverGeo = new THREE.BufferGeometry();
  riverGeo.setAttribute('position', new THREE.Float32BufferAttribute(riverPositions, 3));
  riverGeo.setAttribute('color', new THREE.Float32BufferAttribute(riverColors, 3));
  const riverGlow = new THREE.Points(
    riverGeo,
    new THREE.PointsMaterial({
      map: M.glowTexture,
      size: 7,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.36,
      depthWrite: false,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
    })
  );
  riverGlow.frustumCulled = false;
  extras.add(riverGlow);
  return { lights, glow, glowMat };
}

function buildDrips(extras) {
  const count = 340;
  const positions = new Float32Array(count * 3);
  const speeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(rand()) * 0.82;
    const x = Math.cos(a) * CAVE.rx * r;
    const z = Math.sin(a) * CAVE.rz * r;
    const ceil = caveCeilingHeight(x, z);
    positions[i * 3] = x;
    positions[i * 3 + 1] = 2 + rand() * Math.max(2, ceil - 4);
    positions[i * 3 + 2] = z;
    speeds[i] = 2.6 + rand() * 4.2;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xc8f0ea,
    size: 0.34,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    map: M.glowTexture,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  extras.add(points);
  return { points, positions, speeds, count };
}

export function buildZhijinOverlay() {
  const root = new THREE.Group();
  buildHeroFormations(root);
  buildStalagmiteField(root);
  buildStalactites(root);
  buildCurtains(root);
  buildHelictites(root);
  const walkAnchors = buildWalkways(root);

  const extras = new THREE.Group();
  const lightRig = buildLights(extras, walkAnchors);
  const drips = buildDrips(extras);
  const merged = mergeStaticGroup(root);

  const life = {
    lights: lightRig.lights,
    update(time, dt) {
      for (const item of lightRig.lights) {
        const pulse = 0.84 + 0.16 * Math.sin(time * item.speed + item.phase);
        item.light.intensity = item.base * pulse;
      }
      lightRig.glowMat.opacity = 0.56 + 0.1 * Math.sin(time * 0.9);
      const p = drips.positions;
      for (let i = 0; i < drips.count; i++) {
        p[i * 3 + 1] -= drips.speeds[i] * dt;
        const x = p[i * 3];
        const z = p[i * 3 + 2];
        const floor = caveFloorHeight(x, z);
        if (p[i * 3 + 1] < floor + 0.25) {
          p[i * 3 + 1] = caveCeilingHeight(x, z) - 0.6;
        }
      }
      drips.points.geometry.attributes.position.needsUpdate = true;
    },
  };

  return {
    group: merged,
    extras,
    life,
    lights: lightRig.lights,
    walkAnchors,
  };
}
