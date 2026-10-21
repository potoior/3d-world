import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mats } from './materials.js';
import { heightAt, lakeDef, templeDef } from './terrain.js';
import { makeLabelTexture } from './textures.js';
import { TIANZHU_PEAK } from './tianzhuStructure.js';
import { createTianzhuLandform } from './tianzhuStructure.js';
import { createTianzhuShrines } from './tianzhuShrines.js';

export { TIANZHU_PEAK };

function makeWaterNormal() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const nx = Math.sin(u * 21.0 + Math.sin(v * 13.0) * 1.7) * 0.5
        + Math.sin(u * 7.0 - v * 11.0) * 0.32
        + Math.sin(u * 39.0 + v * 6.0) * 0.14;
      const ny = Math.cos(v * 19.0 + Math.sin(u * 9.0) * 1.9) * 0.5
        + Math.cos(v * 6.0 + u * 15.0) * 0.3
        + Math.cos(v * 34.0 - u * 7.0) * 0.12;
      const i = (y * size + x) * 4;
      img.data[i] = Math.max(0, Math.min(255, (nx * 0.5 + 0.5) * 255));
      img.data[i + 1] = Math.max(0, Math.min(255, (ny * 0.5 + 0.5) * 255));
      img.data[i + 2] = 245;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(5, 5);
  return tex;
}

function createWater() {
  const normalMap = makeWaterNormal();
  const material = new THREE.MeshStandardMaterial({
    color: 0x2b5158,
    roughness: 0.14,
    metalness: 0.34,
    transparent: true,
    opacity: 0.9,
    normalMap,
    normalScale: new THREE.Vector2(0.52, 0.52),
  });
  const geo = new THREE.CircleGeometry(lakeDef.radius - 0.5, 96);
  geo.rotateX(-Math.PI * 0.5);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(lakeDef.x, lakeDef.waterY, lakeDef.z);
  mesh.receiveShadow = true;
  mesh.renderOrder = 1;
  return { mesh, material, normalMap };
}

function createClouds() {
  const count = 26;
  const material = new THREE.MeshBasicMaterial({
    map: mats.cloud.map,
    color: 0xeef4f1,
    transparent: true,
    opacity: 0.34,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: true,
    toneMapped: true,
  });
  const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), material, count);
  mesh.frustumCulled = false;
  mesh.renderOrder = 2;
  const data = [];
  const rand = seeded(8811);
  for (let i = 0; i < count; i++) {
    const aroundPillar = i < 15;
    const angle = rand() * Math.PI * 2;
    const radius = aroundPillar ? 90 + rand() * 260 : 240 + rand() * 560;
    data.push({
      x: (aroundPillar ? TIANZHU_PEAK.x : 0) + Math.cos(angle) * radius,
      z: (aroundPillar ? TIANZHU_PEAK.z : -180) + Math.sin(angle) * radius * 0.8,
      y: 52 + rand() * 96,
      w: 180 + rand() * 320,
      h: 80 + rand() * 150,
      yaw: rand() * Math.PI,
      tilt: (rand() - 0.5) * 0.08,
      drift: 2 + rand() * 6,
      phase: rand() * 6.28,
    });
  }
  return { mesh, data, material };
}

function createMist() {
  const count = 34;
  const material = new THREE.MeshBasicMaterial({
    map: mats.mist.map,
    color: 0xeaf2ee,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: true,
    toneMapped: true,
  });
  const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), material, count);
  mesh.frustumCulled = false;
  mesh.renderOrder = 3;
  const data = [];
  const rand = seeded(9821);
  for (let i = 0; i < count; i++) {
    const zone = i % 3;
    const baseX = zone === 0 ? TIANZHU_PEAK.x : zone === 1 ? lakeDef.x : templeDef.x;
    const baseZ = zone === 0 ? TIANZHU_PEAK.z : zone === 1 ? lakeDef.z : templeDef.z;
    const spread = zone === 0 ? 180 : zone === 1 ? 150 : 70;
    data.push({
      x: baseX + (rand() - 0.5) * spread,
      z: baseZ + (rand() - 0.5) * spread,
      y: (zone === 1 ? lakeDef.waterY + 5 : 58) + rand() * 92,
      w: 110 + rand() * 230,
      h: 38 + rand() * 96,
      yaw: rand() * Math.PI,
      drift: 1.4 + rand() * 3.4,
      phase: rand() * 6.28,
    });
  }
  return { mesh, data, material };
}

function seeded(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createFlags() {
  const palette = [0xb63a2b, 0xe0a12c, 0x2e5f86, 0x40704a, 0xe8e2d2];
  const flags = [];
  const runs = [
    { a: [templeDef.x - 8, templeDef.y + 5.2, templeDef.z + 14.7], b: [templeDef.x + 8, templeDef.y + 5.2, templeDef.z + 14.7], n: 18 },
    { a: [66.5, TIANZHU_PEAK.topY - 22.4, -138.5], b: [77.5, TIANZHU_PEAK.topY - 22.4, -138.5], n: 14 },
  ];
  const sx = 250;
  const sz = 40;
  runs.push({ a: [sx - 4, heightAt(sx, sz) + 5.0, sz], b: [sx + 4, heightAt(sx, sz) + 5.0, sz], n: 12 });
  const rand = seeded(5371);
  for (const run of runs) {
    for (let i = 0; i < run.n; i++) {
      const t = (i + 0.5) / run.n;
      flags.push({
        x: run.a[0] + (run.b[0] - run.a[0]) * t,
        y: run.a[1] + (run.b[1] - run.a[1]) * t - Math.sin(t * Math.PI) * 0.45,
        z: run.a[2] + (run.b[2] - run.a[2]) * t,
        yaw: Math.atan2(run.b[0] - run.a[0], run.b[2] - run.a[2]) + Math.PI * 0.5,
        phase: rand() * 6.28,
        speed: 2.6 + rand() * 2.2,
      });
    }
  }
  const geo = new THREE.PlaneGeometry(0.54, 0.72);
  geo.translate(0, -0.36, 0);
  const material = new THREE.MeshBasicMaterial({
    side: THREE.DoubleSide,
    fog: true,
    toneMapped: true,
  });
  const mesh = new THREE.InstancedMesh(geo, material, flags.length);
  mesh.frustumCulled = false;
  const color = new THREE.Color();
  flags.forEach((f, i) => {
    color.setHex(palette[i % palette.length]);
    mesh.setColorAt(i, color);
  });
  mesh.instanceColor.needsUpdate = true;
  return { mesh, flags, material };
}

function createBirds() {
  const count = 18;
  const parts = [];
  const mesh = new THREE.BufferGeometry();
  parts.push(new THREE.BoxGeometry(0.72, 0.05, 0.16).translate(-0.36, 0, 0));
  parts.push(new THREE.BoxGeometry(0.72, 0.05, 0.16).translate(0.36, 0, 0));
  const pos = [];
  const nor = [];
  for (const g of parts) {
    const p = g.toNonIndexed().attributes.position;
    const n = g.attributes.normal;
    for (let i = 0; i < p.count; i++) {
      pos.push(p.getX(i), p.getY(i), p.getZ(i));
      nor.push(n.getX(i), n.getY(i), n.getZ(i));
    }
  }
  mesh.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  mesh.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  const inst = new THREE.InstancedMesh(mesh, mats.iron, count);
  inst.frustumCulled = false;
  const rand = seeded(4407);
  const data = [];
  for (let i = 0; i < count; i++) {
    data.push({
      cx: TIANZHU_PEAK.x + (rand() - 0.5) * 120,
      cz: TIANZHU_PEAK.z + (rand() - 0.5) * 110,
      y: 230 + rand() * 100,
      r: 34 + rand() * 46,
      speed: 0.12 + rand() * 0.1,
      phase: rand() * 6.28,
      size: 1.4 + rand() * 1.2,
    });
  }
  return { mesh: inst, data };
}


function createInstancedScatter() {
  const group = new THREE.Group();
  group.name = 'tianzhu-instanced-pines-and-rocks';
  const rand = seeded(66119);

  const rockGeo = new THREE.DodecahedronGeometry(1, 0);
  const rockCount = 110;
  const rocks = new THREE.InstancedMesh(rockGeo, mats.rock, rockCount);
  rocks.frustumCulled = false;
  const dummy = new THREE.Object3D();

  const shore = [];
  for (let i = 0; i < 70; i++) {
    const a = rand() * Math.PI * 2;
    const r = lakeDef.radius + 6 + rand() * 54;
    shore.push([lakeDef.x + Math.cos(a) * r, lakeDef.z + Math.sin(a) * r, 0.6 + rand() * 2.4]);
  }
  for (let i = 0; i < 40; i++) {
    const a = rand() * Math.PI * 2;
    const r = TIANZHU_PEAK.baseR + 12 + rand() * 46;
    shore.push([TIANZHU_PEAK.x + Math.cos(a) * r, TIANZHU_PEAK.z + Math.sin(a) * r, 0.5 + rand() * 2.1]);
  }
  shore.forEach(([x, z, s], i) => {
    const y = heightAt(x, z);
    dummy.position.set(x, y + s * 0.28, z);
    dummy.rotation.set(rand() * 0.4, rand() * 6.2, rand() * 0.3);
    dummy.scale.set(s * (0.8 + rand() * 0.5), s * (0.5 + rand() * 0.4), s * (0.8 + rand() * 0.5));
    dummy.updateMatrix();
    rocks.setMatrixAt(i, dummy.matrix);
  });
  rocks.instanceMatrix.needsUpdate = true;
  rocks.castShadow = true;
  rocks.receiveShadow = true;
  group.add(rocks);

  const trunk = new THREE.CylinderGeometry(0.1, 0.17, 1.8, 4);
  trunk.translate(0, 0.9, 0);
  const layers = [];
  for (let i = 0; i < 4; i++) {
    const cone = new THREE.ConeGeometry(1.15 - i * 0.2, 1.5, 6, 1, true);
    cone.translate(0, 2.0 + i * 0.9, 0);
    layers.push(cone);
  }
  const pineGeo = mergeGeometries([trunk, ...layers], false);
  const pineMat = new THREE.MeshStandardMaterial({ color: 0x2d4d3b, roughness: 0.97, flatShading: true });
  const pineCount = 90;
  const pines = new THREE.InstancedMesh(pineGeo, pineMat, pineCount);
  pines.frustumCulled = false;
  let placed = 0;
  let guard = 0;
  while (placed < pineCount && guard < 2000) {
    guard++;
    const zone = placed % 3;
    const x = zone === 0 ? lakeDef.x + (rand() - 0.5) * 260 : zone === 1 ? templeDef.x + (rand() - 0.5) * 150 : TIANZHU_PEAK.x + (rand() - 0.5) * 260;
    const z = zone === 0 ? lakeDef.z + (rand() - 0.5) * 240 : zone === 1 ? templeDef.z + (rand() - 0.5) * 140 : TIANZHU_PEAK.z + (rand() - 0.5) * 240;
    const y = heightAt(x, z);
    if (y < lakeDef.waterY + 2.5) continue;
    if (Math.hypot(x - templeDef.x, z - templeDef.z) < templeDef.radius + 8) continue;
    const s = 0.8 + rand() * 1.1;
    dummy.position.set(x, y - 0.1, z);
    dummy.rotation.set(0, rand() * 6.2, 0);
    dummy.scale.set(s, s * (0.9 + rand() * 0.5), s);
    dummy.updateMatrix();
    pines.setMatrixAt(placed, dummy.matrix);
    placed++;
  }
  pines.count = placed;
  pines.instanceMatrix.needsUpdate = true;
  pines.castShadow = true;
  pines.receiveShadow = true;
  group.add(pines);
  return group;
}

function createTianzhuLabels() {
  const defs = [
    ['天柱峰', 'TIANZHU PEAK · 1489 M', 72, 400, -150, 1.2],
    ['神秘谷', 'SHENMI VALLEY', 196, 118, -70, 0.92],
    ['炼丹湖', 'LIANDAN LAKE', -420, 58, 220, 1.0],
    ['三祖寺', 'SANZU TEMPLE', 265, 68, 278, 0.95],
    ['飞来石', 'FLYING ROCK', -255, 188, -78, 0.86],
  ];
  return defs.map(([title, sub, x, y, z, scale]) => {
    const mat = new THREE.SpriteMaterial({
      map: makeLabelTexture(title, sub),
      transparent: true,
      depthTest: true,
      depthWrite: false,
      opacity: 0.9,
      toneMapped: true,
    });
    const spr = new THREE.Sprite(mat);
    spr.scale.set(30 * scale, 9.4 * scale, 1);
    spr.position.set(x, y, z);
    spr.renderOrder = 5;
    spr.name = 'label-' + title;
    return spr;
  });
}

export function createTianzhuStatic() {
  return {
    landform: createLandformGroup(),
    shrines: createShrineGroup(),
  };
}

function createLandformGroup() {
  return createTianzhuLandform();
}

function createShrineGroup() {
  return createTianzhuShrines().group;
}

export function createTianzhuLife() {
  const group = new THREE.Group();
  group.name = 'tianzhu-life';
  const water = createWater();
  const clouds = createClouds();
  const mist = createMist();
  const flags = createFlags();
  const birds = createBirds();
  const scatter = createInstancedScatter();
  group.add(water.mesh, clouds.mesh, mist.mesh, flags.mesh, birds.mesh, scatter);

  const dummy = new THREE.Object3D();

  function update(elapsed) {
    water.normalMap.offset.set(elapsed * 0.008, elapsed * 0.0045);

    clouds.data.forEach((c, i) => {
      dummy.position.set(
        c.x + Math.sin(elapsed * 0.014 + c.phase) * c.drift * 8,
        c.y + Math.sin(elapsed * 0.03 + c.phase) * 1.6,
        c.z + Math.cos(elapsed * 0.011 + c.phase) * c.drift * 3
      );
      dummy.rotation.set(-Math.PI * 0.5 + c.tilt, c.yaw, 0);
      dummy.scale.set(c.w, c.h, 1);
      dummy.updateMatrix();
      clouds.mesh.setMatrixAt(i, dummy.matrix);
    });
    clouds.mesh.instanceMatrix.needsUpdate = true;

    mist.data.forEach((m, i) => {
      dummy.position.set(
        m.x + Math.sin(elapsed * 0.022 * m.drift + m.phase) * 18,
        m.y + Math.sin(elapsed * 0.08 + m.phase) * 1.2,
        m.z + Math.cos(elapsed * 0.017 * m.drift + m.phase) * 8
      );
      dummy.rotation.set(0, m.yaw + Math.sin(elapsed * 0.03 + m.phase) * 0.08, 0);
      dummy.scale.set(m.w, m.h, 1);
      dummy.updateMatrix();
      mist.mesh.setMatrixAt(i, dummy.matrix);
    });
    mist.mesh.instanceMatrix.needsUpdate = true;

    flags.flags.forEach((f, i) => {
      const flutter = Math.sin(elapsed * f.speed + f.phase);
      dummy.position.set(f.x, f.y - Math.abs(flutter) * 0.04, f.z);
      dummy.rotation.set(0, f.yaw + flutter * 0.28, Math.sin(elapsed * f.speed * 0.7 + f.phase) * 0.12);
      dummy.scale.set(1, 1 + Math.abs(flutter) * 0.04, 1);
      dummy.updateMatrix();
      flags.mesh.setMatrixAt(i, dummy.matrix);
    });
    flags.mesh.instanceMatrix.needsUpdate = true;

    birds.data.forEach((b, i) => {
      const a = elapsed * b.speed + b.phase;
      dummy.position.set(b.cx + Math.cos(a) * b.r, b.y + Math.sin(a * 2.1) * 4, b.cz + Math.sin(a) * b.r * 0.7);
      dummy.rotation.set(0, -a, Math.sin(a * 2.0) * 0.18);
      dummy.scale.set(b.size, b.size, b.size);
      dummy.updateMatrix();
      birds.mesh.setMatrixAt(i, dummy.matrix);
    });
    birds.mesh.instanceMatrix.needsUpdate = true;
  }

  update(0);
  return { group, update, water, clouds, mist, flags, birds };
}

export { createTianzhuLabels };
