import * as THREE from 'three';
import { mats, sharedTextures } from './materials.js';
import { heightAt, platforms, trailSamples } from './terrain.js';
import { mergeGeometryList } from './geometry.js';

function rand32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function addBox(list, w, h, d, x, y, z, ry = 0, rx = 0, rz = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (rx) g.rotateX(rx);
  if (rz) g.rotateZ(rz);
  if (ry) g.rotateY(ry);
  g.translate(x, y, z);
  list.push(g);
}

function addCyl(list, rt, rb, h, seg, x, y, z, ry = 0) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg, 1, false);
  if (ry) g.rotateY(ry);
  g.translate(x, y, z);
  list.push(g);
}

function addRockGeo(list, size, x, y, z, seed, squash = 0.8) {
  const rand = rand32(seed);
  const geo = new THREE.DodecahedronGeometry(size, 0);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    p.setXYZ(
      i,
      p.getX(i) * (0.7 + rand() * 0.55),
      p.getY(i) * squash * (0.72 + rand() * 0.5),
      p.getZ(i) * (0.74 + rand() * 0.5)
    );
  }
  geo.computeVertexNormals();
  geo.rotateY(rand() * 6.2);
  geo.translate(x, y, z);
  list.push(geo);
}

class Bucket {
  constructor() { this.map = new Map(); }
  add(geo, mat) {
    if (!this.map.has(mat)) this.map.set(mat, []);
    this.map.get(mat).push(geo);
  }
  finish(name) {
    const group = new THREE.Group();
    group.name = name;
    for (const [mat, list] of this.map) {
      if (!list.length) continue;
      const geo = mergeGeometryList(list);
      if (!geo) continue;
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = mat !== mats.deck && mat !== mats.sign;
      mesh.receiveShadow = true;
      group.add(mesh);
    }
    return group;
  }
}

function latticeNoise(x, z) {
  return (
    Math.sin(x * 0.11 + z * 0.07) * 0.5 +
    Math.sin(x * 0.29 - z * 0.17 + 1.7) * 0.3 +
    Math.sin(z * 0.61 + x * 0.05 + 4.1) * 0.2
  );
}

function cliffGeometry(w, h, d, seed) {
  const geo = new THREE.BoxGeometry(w, h, d, 16, 14, 6);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const front = z > d * 0.28;
    const top = y > h * 0.32;
    const flute = Math.sin(x * 0.34 + seed) * 2.6 + Math.sin(x * 0.82 - 0.7) * 1.25;
    const n = latticeNoise(x * 0.7 + seed, y * 0.4 + z * 0.5);
    p.setX(i, x + n * 2.2);
    p.setZ(i, z + (front ? flute * 0.45 + Math.max(0, y / h) * 3.2 : n * 1.6));
    p.setY(i, y + (top ? n * 5.5 + Math.sin(x * 0.13 + seed) * 4.0 : n * 1.2));
  }
  geo.computeVertexNormals();
  geo.translate(0, h * 0.5, 0);
  return geo;
}

function pinnacleGeometry(cx, cz, baseY, topY, rBottom, rTop, seed) {
  const h = Math.max(6, topY - baseY);
  const geo = new THREE.CylinderGeometry(rTop, rBottom, h, 9, 9, false);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const a = Math.atan2(z, x);
    const k = (y + h * 0.5) / h;
    const flute = 1 + 0.09 * Math.sin(a * 11 + seed);
    const overhang = 1 + 0.11 * Math.sin(k * Math.PI) * (0.6 + 0.4 * Math.sin(a * 4 + seed));
    p.setX(i, x * flute * overhang + Math.sin(k * 8 + a) * rBottom * 0.05);
    p.setZ(i, z * flute * overhang + Math.cos(k * 6 - a) * rBottom * 0.05);
    p.setY(i, y + Math.sin(a * 5 + seed) * h * 0.012);
  }
  geo.computeVertexNormals();
  geo.translate(cx, baseY + h * 0.5, cz);
  return geo;
}

function createDalongqiu() {
  const rand = rand32(9317);
  const bucket = new Bucket();
  const dynamic = new THREE.Group();
  dynamic.name = 'dalongqiu-water';
  const CX = 458;
  const POOL_Z = -65;
  const POOL_Y = 59.2;
  const POOL_R = 38;
  const FALL_Z = -103;
  const FALL_TOP = 218;
  const FALL_BOTTOM = POOL_Y + 1.2;

  const cliff = cliffGeometry(196, 172, 118, 4.7);
  cliff.translate(CX, 58, -160);
  bucket.add(cliff, mats.graniteDark);

  const backFin = cliffGeometry(122, 214, 74, 8.2);
  backFin.translate(CX - 24, 54, -201);
  bucket.add(backFin, mats.granite);

  for (let i = 0; i < 11; i++) {
    const x = CX - 84 + i * 16 + (rand() - 0.5) * 8;
    const baseY = Math.min(108, heightAt(x, -112) - 4);
    const topY = FALL_TOP - 20 - rand() * 44;
    const r = 8 + rand() * 8;
    bucket.add(
      pinnacleGeometry(x, -108 + rand() * 9, baseY - 14, topY, r, r * 0.42, 20 + i),
      i % 3 === 0 ? mats.graniteLight : mats.graniteDark
    );
  }

  const wetRocks = [];
  for (let i = 0; i < 9; i++) {
    const a = rand() * Math.PI * 2;
    const x = CX + Math.cos(a) * (POOL_R + 1 + rand() * 8);
    const z = POOL_Z + Math.sin(a) * (POOL_R + 1 + rand() * 8);
    addRockGeo(wetRocks, 1.4 + rand() * 3.0, x, POOL_Y + 0.2, z, 440 + i, 0.68);
  }
  wetRocks.forEach((g) => bucket.add(g, mats.wetRock));

  const fallGeo = new THREE.PlaneGeometry(14, FALL_TOP - FALL_BOTTOM, 8, 26);
  const fp = fallGeo.attributes.position;
  for (let i = 0; i < fp.count; i++) {
    const x = fp.getX(i);
    const y = fp.getY(i);
    const k = (y + (FALL_TOP - FALL_BOTTOM) * 0.5) / (FALL_TOP - FALL_BOTTOM);
    fp.setZ(i, Math.sin(x * 0.8) * 0.55 + Math.sin(k * 7) * 0.45 + (1 - k) * 0.8);
  }
  fallGeo.computeVertexNormals();
  const fallMain = fallGeo.clone();
  fallMain.translate(CX, (FALL_TOP + FALL_BOTTOM) * 0.5, FALL_Z);
  const fallWing = fallGeo.clone();
  fallWing.scale(0.55, 0.97, 1);
  fallWing.translate(CX + 10, (FALL_TOP + FALL_BOTTOM) * 0.5 - 4, FALL_Z - 4);
  const fall = new THREE.Mesh(mergeGeometryList([fallMain, fallWing]), mats.waterfall);
  fall.name = 'dalongqiu-fall';
  fall.renderOrder = 4;
  dynamic.add(fall);

  const poolGeo = new THREE.CircleGeometry(POOL_R, 40);
  poolGeo.rotateX(-Math.PI / 2);
  poolGeo.translate(CX, POOL_Y, POOL_Z);

  const baseFoam = new THREE.Mesh(new THREE.CircleGeometry(16, 28), mats.foam);
  baseFoam.rotation.x = -Math.PI / 2;
  baseFoam.position.set(CX, POOL_Y + 0.12, FALL_Z + 5);
  baseFoam.renderOrder = 5;
  dynamic.add(baseFoam);


  const streamPts = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const x = CX + Math.sin(t * 2.4) * 24 + t * 58;
    const z = POOL_Z + POOL_R + t * 250;
    streamPts.push(new THREE.Vector3(x, heightAt(x, z) + 0.22, z));
  }
  const streamPos = [];
  const streamUv = [];
  for (let i = 0; i < streamPts.length - 1; i++) {
    const a = streamPts[i];
    const b = streamPts[i + 1];
    const w = 2.2 + i * 0.06;
    streamPos.push(
      a.x - w, a.y, a.z, b.x - w, b.y, b.z, a.x + w, a.y, a.z,
      a.x + w, a.y, a.z, b.x - w, b.y, b.z, b.x + w, b.y, b.z
    );
    const v0 = i / 10;
    const v1 = (i + 1) / 10;
    streamUv.push(0, v0, 0, v1, 1, v0, 1, v0, 0, v1, 1, v1);
  }
  const streamGeo = new THREE.BufferGeometry();
  streamGeo.setAttribute('position', new THREE.Float32BufferAttribute(streamPos, 3));
  streamGeo.setAttribute('uv', new THREE.Float32BufferAttribute(streamUv, 2));
  streamGeo.computeVertexNormals();
  const water = new THREE.Mesh(mergeGeometryList([poolGeo, streamGeo]), mats.water);
  water.name = 'dalongqiu-pool-and-stream';
  water.receiveShadow = true;
  water.renderOrder = 3;
  dynamic.add(water);

  const planks = [];
  const posts = [];
  const rails = [];
  const startA = -0.12;
  const endA = Math.PI + 0.42;
  const deckSegments = 30;
  for (let i = 0; i < deckSegments; i++) {
    const a = startA + (i / (deckSegments - 1)) * (endA - startA);
    const r = POOL_R + 6.2;
    const x = CX + Math.cos(a) * r;
    const z = POOL_Z + Math.sin(a) * r;
    addBox(planks, 3.3, 0.24, 1.6, x, POOL_Y + 0.22, z, -a);
    if (i % 3 === 0) {
      addCyl(posts, 0.09, 0.13, 1.3, 5, CX + Math.cos(a) * (r + 1.65), POOL_Y + 0.85, POOL_Z + Math.sin(a) * (r + 1.65));
    }
    if (i < deckSegments - 1) {
      const b = startA + ((i + 1) / (deckSegments - 1)) * (endA - startA);
      const ax = CX + Math.cos(a) * (r + 1.65);
      const az = POOL_Z + Math.sin(a) * (r + 1.65);
      const bx = CX + Math.cos(b) * (r + 1.65);
      const bz = POOL_Z + Math.sin(b) * (r + 1.65);
      const len = Math.hypot(bx - ax, bz - az);
      const yaw = Math.atan2(bx - ax, bz - az);
      addBox(rails, 0.09, 0.09, len, (ax + bx) * 0.5, POOL_Y + 1.42, (az + bz) * 0.5, yaw);
      addBox(rails, 0.07, 0.07, len, (ax + bx) * 0.5, POOL_Y + 1.02, (az + bz) * 0.5, yaw);
    }
  }
  const deckX = CX + 4;
  const deckZ = POOL_Z + POOL_R + 14;
  addBox(planks, 14, 0.3, 8, deckX, POOL_Y + 0.18, deckZ, 0.06);
  for (const side of [-1, 1]) {
    addBox(rails, 13.6, 0.1, 0.1, deckX, POOL_Y + 1.25, deckZ + side * 4, 0.06);
    for (let i = 0; i < 5; i++) {
      addCyl(posts, 0.09, 0.13, 1.3, 5, deckX - 6 + i * 3, POOL_Y + 0.82, deckZ + side * 4);
    }
  }
  planks.forEach((g) => bucket.add(g, mats.deck));
  posts.forEach((g) => bucket.add(g, mats.wood));
  rails.forEach((g) => bucket.add(g, mats.iron));

  const signPosts = [];
  const signBoards = [];
  addCyl(signPosts, 0.12, 0.16, 3.0, 6, deckX - 7, POOL_Y + 1.6, deckZ + 3.4);
  addCyl(signPosts, 0.12, 0.16, 3.0, 6, deckX - 4.6, POOL_Y + 1.6, deckZ + 3.4);
  addBox(signBoards, 3.3, 1.5, 0.16, deckX - 5.8, POOL_Y + 3.0, deckZ + 3.45, 0.42 + Math.PI * 0.5);
  signPosts.forEach((g) => bucket.add(g, mats.wood));
  signBoards.forEach((g) => bucket.add(g, mats.sign));

  const sprayCount = 170;
  const sprayPos = new Float32Array(sprayCount * 3);
  const sprayGeo = new THREE.BufferGeometry();
  sprayGeo.setAttribute('position', new THREE.BufferAttribute(sprayPos, 3));
  const sprayMat = new THREE.PointsMaterial({
    map: sharedTextures.cloudMap,
    color: 0xf0fbf7,
    size: 11,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.46,
    depthWrite: false,
    fog: true,
    toneMapped: true,
  });
  const spray = new THREE.Points(sprayGeo, sprayMat);
  spray.name = 'dalongqiu-spray';
  spray.frustumCulled = false;
  spray.renderOrder = 6;
  dynamic.add(spray);
  const sprayParts = [];
  for (let i = 0; i < sprayCount; i++) {
    sprayParts.push({
      x: CX + (rand() - 0.5) * 30,
      y: FALL_BOTTOM + rand() * 12,
      z: FALL_Z + 4 + (rand() - 0.5) * 18,
      vy: 2.4 + rand() * 5.2,
      vx: (rand() - 0.5) * 3.4,
      vz: (rand() - 0.5) * 3.4,
      age: rand() * 2.4,
      life: 1.4 + rand() * 2.4,
      seed: rand() * 6.28,
    });
  }

  return {
    staticGroup: bucket.finish('dalongqiu-cliff-and-boardwalk'),
    dynamic,
    update(elapsed, dt) {
      for (let i = 0; i < sprayParts.length; i++) {
        const p = sprayParts[i];
        p.age += dt;
        if (p.age > p.life) {
          p.age = 0;
          p.x = CX + (rand() - 0.5) * 28;
          p.y = FALL_BOTTOM + rand() * 8;
          p.z = FALL_Z + 3 + (rand() - 0.5) * 14;
          p.vy = 2.4 + rand() * 5.4;
          p.vx = (rand() - 0.5) * 3.2;
          p.vz = (rand() - 0.5) * 3.2;
          p.life = 1.3 + rand() * 2.2;
        }
        const k = p.age / p.life;
        sprayPos[i * 3] = p.x + p.vx * p.age + Math.sin(elapsed * 2 + p.seed) * 0.5;
        sprayPos[i * 3 + 1] = p.y + p.vy * p.age - 3.6 * p.age * p.age - (k > 0.82 ? (k - 0.82) * 6 : 0);
        sprayPos[i * 3 + 2] = p.z + p.vz * p.age;
      }
      sprayGeo.attributes.position.needsUpdate = true;
      sprayMat.opacity = 0.34 + Math.sin(elapsed * 1.7) * 0.05;
      baseFoam.scale.setScalar(0.92 + Math.sin(elapsed * 1.5) * 0.07);
    },
  };
}

function createGuanyinCave() {
  const rand = rand32(5519);
  const bucket = new Bucket();
  const summit = platforms[3];
  const cx = summit.x + 8.0;
  const baseY = summit.y;
  const cz = summit.z - 8.5;
  const mouthZ = cz + 7.5;

  const caveBlack = new THREE.MeshBasicMaterial({ color: 0x090b09, side: THREE.DoubleSide });
  const caveGroup = new THREE.Group();
  caveGroup.name = 'guanyin-cave';

  const backGeo = new THREE.PlaneGeometry(26, 18);
  backGeo.translate(cx, baseY + 6.2, cz - 10.5);
  const leftGeo = new THREE.PlaneGeometry(20, 15);
  leftGeo.rotateY(Math.PI * 0.5);
  leftGeo.translate(cx - 13, baseY + 5.6, cz - 1.5);
  const rightGeo = new THREE.PlaneGeometry(20, 15);
  rightGeo.rotateY(Math.PI * 0.5);
  rightGeo.translate(cx + 13, baseY + 5.6, cz - 1.5);
  const depth = new THREE.Mesh(mergeGeometryList([backGeo, leftGeo, rightGeo]), caveBlack);
  depth.name = 'guanyin-cave-depth';
  caveGroup.add(depth);

  const arch = [];
  for (let i = 0; i < 17; i++) {
    const a = (i / 16) * Math.PI;
    const r = 13.5 + rand() * 2.2;
    addRockGeo(arch, 3.1 + rand() * 3.6, cx + Math.cos(a) * r, baseY + 2.0 + Math.sin(a) * r * 0.92, mouthZ - 3.2 + (rand() - 0.5) * 2.2, 8100 + i, 0.85);
  }
  for (let i = 0; i < 7; i++) {
    addRockGeo(arch, 4.2 + rand() * 4.4, cx - 16 + i * 5.3, baseY + 15.2 + (rand() - 0.5) * 2.2, mouthZ - 4.5, 8300 + i, 0.75);
  }
  arch.forEach((g, i) => bucket.add(g, i % 2 ? mats.rock : mats.rockLight));

  const overhang = cliffGeometry(38, 24, 20, 12.3);
  overhang.rotateX(-0.13);
  overhang.translate(cx, baseY + 12, cz - 6);
  bucket.add(overhang, mats.graniteDark);

  const steps = [];
  for (let i = 0; i < 7; i++) {
    addBox(steps, 8.4 - i * 0.3, 0.22, 1.5, cx, baseY + 0.11 + i * 0.16, summit.z + 12 - i * 1.25, 0);
  }
  steps.forEach((g) => bucket.add(g, mats.stone));

  const posts = [];
  const railList = [];
  for (const side of [-1, 1]) {
    for (let i = 0; i < 6; i++) {
      const z = summit.z + 12.5 - i * 2.1;
      const x = cx + side * (4.6 - i * 0.17);
      addCyl(posts, 0.09, 0.12, 1.25, 5, x, baseY + 0.72 + i * 0.13, z);
      if (i < 5) {
        const z2 = summit.z + 12.5 - (i + 1) * 2.1;
        const x2 = cx + side * (4.6 - (i + 1) * 0.17);
        addBox(railList, 0.06, 0.06, Math.hypot(x2 - x, z2 - z), (x + x2) * 0.5, baseY + 1.36 + i * 0.13, (z + z2) * 0.5, Math.atan2(x2 - x, z2 - z));
      }
    }
  }
  posts.forEach((g) => bucket.add(g, mats.wood));
  railList.forEach((g) => bucket.add(g, mats.iron));

  const signPosts = [];
  const signBoards = [];
  addCyl(signPosts, 0.1, 0.14, 2.3, 6, cx + 12.5, baseY + 1.2, summit.z + 8.5);
  addCyl(signPosts, 0.1, 0.14, 2.3, 6, cx + 14.5, baseY + 1.2, summit.z + 8.5);
  addBox(signBoards, 2.5, 1.1, 0.14, cx + 13.5, baseY + 2.25, summit.z + 8.55, 0.1 + Math.PI * 0.5);
  signPosts.forEach((g) => bucket.add(g, mats.wood));
  signBoards.forEach((g) => bucket.add(g, mats.sign));

  const light = new THREE.PointLight(0xffb066, 1.6, 72, 1.7);
  light.position.set(cx, baseY + 5.2, summit.z + 2.2);
  caveGroup.add(light);

  const lanternPositions = [
    [cx - 8, baseY + 3.4, mouthZ - 1.8],
    [cx + 8, baseY + 3.4, mouthZ - 1.8],
    [cx - 6.5, baseY + 5.6, cz - 2.5],
    [cx + 6.5, baseY + 5.6, cz - 2.5],
  ];

  caveGroup.add(bucket.finish('guanyin-cave-rock'));
  return { group: caveGroup, light, lanternPositions };
}

function createNightLights(caveLanterns) {
  const rand = rand32(2277);
  const group = new THREE.Group();
  group.name = 'yandang-night-lights';

  const lanternPoints = [];
  const lanternTs = [0.08, 0.15, 0.23, 0.31, 0.39, 0.47, 0.55, 0.63, 0.71, 0.79, 0.87, 0.93];
  for (let i = 0; i < lanternTs.length; i++) {
    const idx = Math.round(lanternTs[i] * (trailSamples.length - 1));
    const s = trailSamples[idx];
    const a = trailSamples[Math.max(0, idx - 1)];
    const b = trailSamples[Math.min(trailSamples.length - 1, idx + 1)];
    let tx = b.x - a.x;
    let tz = b.z - a.z;
    const len = Math.hypot(tx, tz) || 1;
    tx /= len;
    tz /= len;
    const side = i % 2 ? 1 : -1;
    lanternPoints.push([
      s.x - tz * side * (s.width * 0.5 + 0.95),
      s.y + 2.5,
      s.z + tx * side * (s.width * 0.5 + 0.95),
    ]);
  }
  lanternPoints.push([458, 63.5, 32], [450, 64.5, 34], [466, 64.5, 34]);
  caveLanterns.forEach((p) => lanternPoints.push(p));

  const lanternPos = new Float32Array(lanternPoints.length * 3);
  lanternPoints.forEach((p, i) => {
    lanternPos[i * 3] = p[0];
    lanternPos[i * 3 + 1] = p[1];
    lanternPos[i * 3 + 2] = p[2];
  });
  const lanternGeo = new THREE.BufferGeometry();
  lanternGeo.setAttribute('position', new THREE.BufferAttribute(lanternPos, 3));
  const lanternMat = new THREE.PointsMaterial({
    map: sharedTextures.glowMap,
    color: 0xffb271,
    size: 26,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.08,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: true,
    toneMapped: true,
  });
  const lanterns = new THREE.Points(lanternGeo, lanternMat);
  lanterns.name = 'lantern-glows';
  lanterns.frustumCulled = false;
  lanterns.renderOrder = 7;
  group.add(lanterns);

  const fireflyCount = 90;
  const fireflyPos = new Float32Array(fireflyCount * 3);
  const fireflyBase = [];
  for (let i = 0; i < fireflyCount; i++) {
    const nearPool = i < 38;
    const x = nearPool ? 420 + rand() * 100 : -80 + rand() * 380;
    const z = nearPool ? -90 + rand() * 150 : -260 + rand() * 360;
    const y = nearPool ? 60 + rand() * 26 : heightAt(x, z) + 1 + rand() * 8;
    fireflyBase.push({ x, y, z, phase: rand() * 6.28, speed: 0.3 + rand() * 0.8 });
  }
  const fireflyGeo = new THREE.BufferGeometry();
  fireflyGeo.setAttribute('position', new THREE.BufferAttribute(fireflyPos, 3));
  const fireflyMat = new THREE.PointsMaterial({
    map: sharedTextures.glowMap,
    color: 0xf4e09a,
    size: 5,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: true,
    toneMapped: true,
  });
  const fireflies = new THREE.Points(fireflyGeo, fireflyMat);
  fireflies.name = 'fireflies';
  fireflies.frustumCulled = false;
  fireflies.renderOrder = 7;
  group.add(fireflies);

  const starCount = 300;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const a = rand() * Math.PI * 2;
    const b = 0.2 + rand() * 1.15;
    const r = 3600;
    starPos[i * 3] = Math.cos(a) * Math.cos(b) * r;
    starPos[i * 3 + 1] = Math.sin(b) * r;
    starPos[i * 3 + 2] = Math.sin(a) * Math.cos(b) * r;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({
    color: 0xdfe8ff,
    size: 3.2,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    fog: false,
    toneMapped: false,
  });
  const stars = new THREE.Points(starGeo, starMat);
  stars.name = 'night-stars';
  stars.frustumCulled = false;
  group.add(stars);

  return {
    group,
    lanternMat,
    fireflyMat,
    fireflyGeo,
    fireflyBase,
    starMat,
    update(elapsed, envMix) {
      lanternMat.opacity = 0.06 + envMix * 0.94 + Math.sin(elapsed * 2.7) * 0.055 * envMix;
      const fpos = fireflyGeo.attributes.position;
      for (let i = 0; i < fireflyBase.length; i++) {
        const f = fireflyBase[i];
        fpos.setXYZ(
          i,
          f.x + Math.sin(elapsed * f.speed + f.phase) * 3.2,
          f.y + Math.sin(elapsed * f.speed * 1.7 + f.phase) * 1.4,
          f.z + Math.cos(elapsed * f.speed * 0.8 + f.phase) * 3.2
        );
      }
      fpos.needsUpdate = true;
      fireflyMat.opacity = envMix * (0.62 + Math.sin(elapsed * 1.3) * 0.16);
      starMat.opacity = envMix * (0.66 + Math.sin(elapsed * 0.6) * 0.12);
    },
  };
}

export function createYandangFeatures() {
  const dalong = createDalongqiu();
  const cave = createGuanyinCave();
  const night = createNightLights(cave.lanternPositions);
  const group = new THREE.Group();
  group.name = 'yandang-animated-features';
  group.add(dalong.dynamic, cave.group, night.group);

  const fallMap = mats.waterfall.map;
  const waterMap = mats.water.map;

  return {
    staticGroup: dalong.staticGroup,
    group,
    cave,
    night,
    update(elapsed, dt, envMix = 0) {
      dalong.update(elapsed, dt);
      fallMap.offset.y = -elapsed * 0.42;
      waterMap.offset.x = elapsed * 0.018;
      waterMap.offset.y = elapsed * 0.032;
      night.update(elapsed, envMix);
      cave.light.intensity = 0.28 + envMix * 2.5;
    },
    counts: {
      spray: 170,
      lanterns: 19,
      fireflies: 90,
      stars: 300,
    },
  };
}
