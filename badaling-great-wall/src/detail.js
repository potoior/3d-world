import * as THREE from 'three';
import { mats, sharedTextures } from './materials.js';
import { heightAt, mainCurve, mainSamples, southSamples } from './terrain.js';
import { WALL_HEIGHT, getWallFrame } from './wall.js';

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function box(group, material, w, h, d, x, y, z, ry = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.rotation.y = ry;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function barrel(group, material, rt, rb, h, seg, x, y, z, ry = 0) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), material);
  mesh.position.set(x, y, z);
  mesh.rotation.y = ry;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function distSq(x, z, samples) {
  let best = Infinity;
  for (let i = 0; i < samples.length; i++) {
    const dx = x - samples[i].x;
    const dz = z - samples[i].z;
    const d = dx * dx + dz * dz;
    if (d < best) best = d;
  }
  return best;
}

function wallDistSq(x, z) {
  return Math.min(distSq(x, z, mainSamples), distSq(x, z, southSamples));
}

function pushQuad(pos, uvs, a, b, c, d, ua, ub, uc, ud) {
  pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  pos.push(b.x, b.y, b.z, d.x, d.y, d.z, c.x, c.y, c.z);
  uvs.push(ua[0], ua[1], ub[0], ub[1], uc[0], uc[1]);
  uvs.push(ub[0], ub[1], ud[0], ud[1], uc[0], uc[1]);
}

function buildRidgeWall(group, path, seed, height, halfTop) {
  const rand = mulberry32(seed);
  const curve = new THREE.CatmullRomCurve3(
    path.map((p) => new THREE.Vector3(p[0], 0, p[1])),
    false,
    'centripetal',
    0.5
  );
  const n = Math.max(30, Math.round(curve.getLength() / 14));
  const pts = curve.getSpacedPoints(n);
  const heights = pts.map((p) => heightAt(p.x, p.z));
  for (let pass = 0; pass < 4; pass++) {
    for (let i = 1; i < heights.length - 1; i++) {
      heights[i] = heights[i - 1] * 0.2 + heights[i] * 0.6 + heights[i + 1] * 0.2;
    }
  }
  const samples = pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    let tx = b.x - a.x;
    let tz = b.z - a.z;
    const len = Math.hypot(tx, tz) || 1;
    tx /= len;
    tz /= len;
    const h = heights[i];
    return {
      x: p.x, z: p.z, h,
      nx: -tz, nz: tx, tx, tz,
      top: h + height,
      bottom: h - height * 0.9,
      yaw: Math.atan2(tx, tz),
    };
  });

  const pos = [];
  const uv = [];
  let u = 0;
  for (let i = 0; i < samples.length - 1; i++) {
    const a = samples[i];
    const b = samples[i + 1];
    const ua = u;
    u += Math.hypot(b.x - a.x, b.z - a.z) * 0.12;
    const ub = u;
    const aLb = new THREE.Vector3(a.x + a.nx * halfTop * 1.25, a.bottom, a.z + a.nz * halfTop * 1.25);
    const aRb = new THREE.Vector3(a.x - a.nx * halfTop * 1.25, a.bottom, a.z - a.nz * halfTop * 1.25);
    const aLt = new THREE.Vector3(a.x + a.nx * halfTop, a.top, a.z + a.nz * halfTop);
    const aRt = new THREE.Vector3(a.x - a.nx * halfTop, a.top, a.z - a.nz * halfTop);
    const bLb = new THREE.Vector3(b.x + b.nx * halfTop * 1.25, b.bottom, b.z + b.nz * halfTop * 1.25);
    const bRb = new THREE.Vector3(b.x - b.nx * halfTop * 1.25, b.bottom, b.z - b.nz * halfTop * 1.25);
    const bLt = new THREE.Vector3(b.x + b.nx * halfTop, b.top, b.z + b.nz * halfTop);
    const bRt = new THREE.Vector3(b.x - b.nx * halfTop, b.top, b.z - b.nz * halfTop);
    pushQuad(pos, uv, aLb, bLb, aLt, bLt, [ua, 0], [ub, 0], [ua, 1], [ub, 1]);
    pushQuad(pos, uv, aRb, aRt, bRb, bRt, [ua, 0], [ua, 1], [ub, 0], [ub, 1]);
    pushQuad(pos, uv, aLt, bLt, aRt, bRt, [0, ua], [0, ub], [1, ua], [1, ub]);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.computeVertexNormals();
  const ribbon = new THREE.Mesh(geo, mats.wall);
  ribbon.castShadow = true;
  ribbon.receiveShadow = true;
  group.add(ribbon);

  for (let i = 2; i < samples.length - 2; i += 2) {
    const s = samples[i];
    const off = halfTop - 0.2;
    box(group, mats.wallShade, 1.1, 0.9, 1.3,
      s.x + s.nx * off, s.top + 0.45, s.z + s.nz * off, s.yaw);
  }

  for (let i = 8; i < samples.length - 4; i += 15) {
    const s = samples[i];
    const tw = 7.4 + rand() * 2.2;
    const td = 9.2 + rand() * 2.6;
    const bodyH = 8.6 + rand() * 1.6;
    box(group, mats.stone, tw, bodyH, td,
      s.x, s.top + bodyH * 0.35, s.z, s.yaw);
    box(group, mats.stoneDark, tw + 0.8, 0.42, td + 0.8,
      s.x, s.top + bodyH * 0.35 + bodyH * 0.5, s.z, s.yaw);
    for (let k = -1; k <= 1; k++) {
      box(group, mats.dark, 0.9, 1.3, 0.16,
        s.x + s.tx * k * (td * 0.24) + s.nx * (tw * 0.5 + 0.02),
        s.top + bodyH * 0.18,
        s.z + s.tz * k * (td * 0.24) + s.nz * (tw * 0.5 + 0.02), s.yaw);
    }
  }
}

function addFigure(group, x, y, z, yaw, variant) {
  box(group, mats.cloth, 0.5, 0.7, 0.3, x, y + 1.12, z, yaw);
  box(group, mats.dark, 0.19, 0.78, 0.22, x + Math.cos(yaw) * 0.13, y + 0.4, z - Math.sin(yaw) * 0.13, yaw);
  box(group, mats.dark, 0.19, 0.78, 0.22, x - Math.cos(yaw) * 0.13, y + 0.4, z + Math.sin(yaw) * 0.13, yaw);
  box(group, mats.cloth, 0.15, 0.58, 0.18, x + Math.cos(yaw) * 0.34, y + 1.12, z - Math.sin(yaw) * 0.34, yaw);
  box(group, mats.cloth, 0.15, 0.58, 0.18, x - Math.cos(yaw) * 0.34, y + 1.12, z + Math.sin(yaw) * 0.34, yaw);
  box(group, mats.wood, 0.3, 0.34, 0.3, x, y + 1.68, z, yaw);
  box(group, mats.dark, 0.44, 0.08, 0.44, x, y + 1.9, z, yaw);
  if (variant % 2 === 0) {
    box(group, mats.wood, 0.4, 0.46, 0.2, x - Math.sin(yaw) * 0.22, y + 1.2, z - Math.cos(yaw) * 0.22, yaw);
  }
  if (variant % 3 === 0) {
    box(group, mats.stoneDark, 0.06, 1.5, 0.06, x + Math.cos(yaw) * 0.5, y + 0.8, z - Math.sin(yaw) * 0.5, yaw);
  }
}

function addBench(group, x, y, z, yaw) {
  box(group, mats.wood, 2.7, 0.14, 0.52, x, y + 0.52, z, yaw);
  box(group, mats.wood, 2.7, 0.4, 0.1, x - Math.sin(yaw) * 0.28, y + 0.78, z - Math.cos(yaw) * 0.28, yaw);
  for (const s of [-1, 1]) {
    box(group, mats.stoneDark, 0.22, 0.5, 0.55,
      x + Math.cos(yaw) * s * 1.1, y + 0.25, z - Math.sin(yaw) * s * 1.1, yaw);
  }
}

function addFirePit(group, x, y, z, rand) {
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const r = 0.95 + rand() * 0.2;
    box(group, mats.stone, 0.42, 0.3, 0.34,
      x + Math.cos(a) * r, y + 0.14, z + Math.sin(a) * r, a);
  }
  box(group, mats.ember, 0.9, 0.1, 0.9, x, y + 0.1, z, rand() * 3);
  for (let i = 0; i < 4; i++) {
    box(group, mats.dark, 0.16, 0.16, 1.5,
      x + (rand() - 0.5) * 0.4, y + 0.22 + i * 0.06, z + (rand() - 0.5) * 0.4, rand() * Math.PI);
  }
}

export function createDetailStatics(towers) {
  const group = new THREE.Group();
  group.name = 'wall-detail-props';
  const rand = mulberry32(4211);

  const byName = {};
  for (const tower of towers) byName[tower.name] = tower;

  const addSign = (tower, scale = 1) => {
    if (!tower) return;
    const f = tower.frame;
    const x = tower.x + f.nx * 12.5;
    const z = tower.z + f.nz * 12.5;
    const y = heightAt(x, z);
    const yaw = Math.atan2(f.nx, f.nz);
    for (const s of [-1, 1]) {
      const px = x + f.tx * s * 1.25;
      const pz = z + f.tz * s * 1.25;
      box(group, mats.wood, 0.18, 2.6 * scale, 0.18, px, y + 1.3 * scale, pz, yaw);
    }
    box(group, mats.wood, 2.9 * scale, 0.14, 0.36, x, y + 2.55 * scale, z, yaw);
    const board = new THREE.Mesh(new THREE.PlaneGeometry(2.75 * scale, 1.45 * scale), mats.sign);
    board.position.set(x, y + 1.78 * scale, z);
    board.rotation.y = yaw;
    board.castShadow = true;
    group.add(board);
  };

  addSign(byName['北一楼'], 0.9);
  addSign(byName['北八楼'], 1.1);
  addSign(byName['南四楼'], 0.9);

  const benchSpecs = [
    ['北四楼', 21, 1], ['北八楼', -24, 2], ['南四楼', 18, 3], ['北一楼', 19, 4],
  ];
  for (const [name, off, seed] of benchSpecs) {
    const tower = byName[name];
    if (!tower) continue;
    const f = tower.frame;
    const sign = off < 0 ? -1 : 1;
    const x = tower.x + f.nx * off + f.tx * (seed * 2 - 5);
    const z = tower.z + f.nz * off + f.tz * (seed * 2 - 5);
    addBench(group, x, heightAt(x, z), z, Math.atan2(f.tx, f.tz) + sign * 0.2);
  }

  for (const name of ['北一楼', '北四楼', '北八楼', '南四楼']) {
    const tower = byName[name];
    if (!tower) continue;
    const f = tower.frame;
    const side = name === '北八楼' ? -1 : 1;
    const x = tower.x + f.nx * 17 * side + f.tx * (rand() - 0.5) * 9;
    const z = tower.z + f.nz * 17 * side + f.tz * (rand() - 0.5) * 9;
    addFirePit(group, x, heightAt(x, z), z, rand);
  }

  const guardTs = [0.132, 0.286, 0.512, 0.742];
  for (let i = 0; i < guardTs.length; i++) {
    const t = guardTs[i];
    const frame = getWallFrame(mainCurve, t);
    const side = i % 2 === 0 ? -1 : 1;
    const x = frame.x + frame.nx * 1.34 * side;
    const z = frame.z + frame.nz * 1.34 * side;
    addFigure(group, x, frame.y + WALL_HEIGHT, z, frame.yaw + Math.PI * 0.5, i);
  }

  for (const name of ['北二楼', '北八楼', '南三楼']) {
    const tower = byName[name];
    if (!tower) continue;
    const f = tower.frame;
    const side = rand() < 0.5 ? -1 : 1;
    const x = tower.x + f.nx * (20 + rand() * 10) * side + f.tx * (rand() - 0.5) * 12;
    const z = tower.z + f.nz * (20 + rand() * 10) * side + f.tz * (rand() - 0.5) * 12;
    addFigure(group, x, heightAt(x, z), z, rand() * Math.PI * 2, 5);
  }

  for (const tower of towers) {
    if (!tower.flagWorld) continue;
    const f = tower.frame;
    box(group, mats.wood, 0.13, 0.13, 2.55,
      tower.flagWorld.x + f.tx * 1.2, tower.flagWorld.y + 0.06, tower.flagWorld.z + f.tz * 1.2,
      Math.atan2(f.tx, f.tz));
  }
  return group;
}

function makeBirdGeometry() {
  const pos = [];
  const tri = (ax, ay, az, bx, by, bz, cx, cy, cz) => {
    pos.push(ax, ay, az, bx, by, bz, cx, cy, cz);
  };
  tri(0, 0, 0, -1.0, 0.22, 0.24, -0.34, -0.02, 0.52);
  tri(0, 0, 0, 1.0, 0.22, 0.24, 0.34, -0.02, 0.52);
  tri(0, 0.03, -0.16, -0.12, -0.03, 0.36, 0.12, -0.03, 0.36);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  return geo;
}

export function createDetailDynamics(towers, mists) {
  const root = new THREE.Group();
  root.name = 'living-detail';

  const flagTowers = towers.filter((t) => t.flagWorld);
  const flagData = [];
  const positions = [];
  const uvs = [];
  const bases = [];
  const normals = [];
  let vertexOffset = 0;
  for (let f = 0; f < flagTowers.length; f++) {
    const tower = flagTowers[f];
    const frame = tower.frame;
    const anchor = tower.flagWorld;
    const L = 2.35;
    const H = 1.32;
    const U = 6;
    const V = 3;
    const phase = f * 1.17 + Math.sin(f * 3.1) * 0.6;
    const nx = frame.nx;
    const nz = frame.nz;
    for (let iv = 0; iv <= V; iv++) {
      for (let iu = 0; iu <= U; iu++) {
        const u = iu / U;
        const v = iv / V;
        const x = anchor.x + frame.tx * u * L;
        const y = anchor.y - 0.06 - v * H;
        const z = anchor.z + frame.tz * u * L;
        positions.push(x, y, z);
        bases.push(x, y, z);
        uvs.push(u, 1 - v);
        normals.push(nx, 0, nz);
      }
    }
    const count = (U + 1) * (V + 1);
    const index = [];
    for (let iv = 0; iv < V; iv++) {
      for (let iu = 0; iu < U; iu++) {
        const a = vertexOffset + iv * (U + 1) + iu;
        const b = a + 1;
        const c = a + (U + 1);
        const d = c + 1;
        index.push(a, c, b, b, c, d);
      }
    }
    flagData.push({ offset: vertexOffset, count, phase, nx, nz, tx: frame.tx, tz: frame.tz, L, H, U });
    vertexOffset += count;
    tower._flagIndex = index;
  }
  let allIndex = [];
  for (const tower of flagTowers) {
    allIndex = allIndex.concat(tower._flagIndex || []);
    delete tower._flagIndex;
  }
  const flagGeo = new THREE.BufferGeometry();
  flagGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  flagGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  flagGeo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  flagGeo.setIndex(allIndex);
  const flagMesh = new THREE.Mesh(flagGeo, mats.banner);
  flagMesh.castShadow = true;
  flagMesh.frustumCulled = false;
  root.add(flagMesh);

  const birdGeo = makeBirdGeometry();
  const birds = new THREE.InstancedMesh(birdGeo, mats.dark, 14);
  birds.castShadow = false;
  birds.frustumCulled = false;
  root.add(birds);
  const birdSeeds = [];
  const centerTower = towers.find((t) => t.name === '北八楼') || towers[0];
  for (let i = 0; i < 14; i++) {
    birdSeeds.push({
      cx: centerTower.x + (i % 2 === 0 ? 0 : -210) + (i - 7) * 9,
      cz: centerTower.z + (i % 2 === 0 ? -35 : -150) + (i - 7) * 7,
      y: centerTower.walkTop + 34 + (i % 5) * 7,
      r: 26 + (i % 4) * 13,
      speed: 0.11 + (i % 3) * 0.035,
      phase: i * 0.83,
      tilt: (i % 2 ? 1 : -1),
    });
  }

  const glowMat = new THREE.SpriteMaterial({
    map: sharedTextures.mistMap,
    color: 0xffa257,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: true,
  });
  const glows = [];
  for (const tower of towers) {
    if (!tower.beaconWorld) continue;
    const sprite = new THREE.Sprite(glowMat);
    sprite.scale.set(4.5, 3.4, 1);
    sprite.position.copy(tower.beaconWorld);
    sprite.renderOrder = 4;
    root.add(sprite);
    glows.push({ sprite, base: tower.beaconWorld.clone(), phase: glows.length * 1.7 });
  }
  let fireLight = null;
  if (glows.length) {
    fireLight = new THREE.PointLight(0xff8a3c, 9, 42, 2);
    fireLight.position.copy(glows[0].base).add(new THREE.Vector3(0, 1.1, 0));
    root.add(fireLight);
  }

  const dummy = new THREE.Object3D();
  const clockTime = { value: 0 };

  function update(elapsed, dt) {
    clockTime.value = elapsed;
    const pa = flagGeo.attributes.position;
    for (let f = 0; f < flagData.length; f++) {
      const d = flagData[f];
      for (let i = 0; i < d.count; i++) {
        const k = (d.offset + i) * 3;
        const local = i % (d.U + 1);
        const row = (i / (d.U + 1)) | 0;
        const u = local / d.U;
        const v = row / 3;
        const wave = (Math.sin(elapsed * 2.3 + d.phase + u * 5.4) * 0.2 +
          Math.sin(elapsed * 3.7 + d.phase * 0.8 + v * 2.4) * 0.06) * u;
        pa.array[k] = bases[k] + d.nx * wave;
        pa.array[k + 1] = bases[k + 1] + Math.sin(elapsed * 1.7 + d.phase + u * 3.0) * 0.03 * u;
        pa.array[k + 2] = bases[k + 2] + d.nz * wave;
      }
    }
    pa.needsUpdate = true;

    for (let i = 0; i < birdSeeds.length; i++) {
      const b = birdSeeds[i];
      const a = elapsed * b.speed + b.phase;
      dummy.position.set(
        b.cx + Math.cos(a) * b.r,
        b.y + Math.sin(a * 1.6 + b.phase) * 6,
        b.cz + Math.sin(a) * b.r
      );
      dummy.rotation.set(0, -a - Math.PI / 2, Math.sin(elapsed * 7 + b.phase) * 0.55 * b.tilt, 'YXZ');
      dummy.scale.setScalar(1.25 + (i % 3) * 0.16);
      dummy.updateMatrix();
      birds.setMatrixAt(i, dummy.matrix);
    }
    birds.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < glows.length; i++) {
      const g = glows[i];
      const flick = 0.82 + Math.sin(elapsed * 9.3 + g.phase) * 0.12 + Math.sin(elapsed * 21.7 + g.phase) * 0.06;
      g.sprite.scale.set(4.2 * flick, 3.2 * flick, 1);
      g.sprite.position.y = g.base.y + Math.sin(elapsed * 4.1 + g.phase) * 0.14;
    }
    if (glowMat) glowMat.opacity = 0.42 + Math.sin(elapsed * 7.7) * 0.08;
    if (fireLight) fireLight.intensity = 8 + Math.sin(elapsed * 11.3) * 1.8;

    if (mists) {
      for (let i = 0; i < mists.sprites.length; i++) {
        const s = mists.sprites[i];
        s.userData.baseX = s.userData.baseX ?? s.position.x;
        s.userData.baseZ = s.userData.baseZ ?? s.position.z;
        s.position.x = s.userData.baseX + Math.sin(elapsed * 0.035 + i * 1.7) * 34;
        s.position.z = s.userData.baseZ + Math.sin(elapsed * 0.021 + i * 2.3) * 18;
      }
      for (let i = 0; i < mists.sheets.length; i++) {
        const s = mists.sheets[i];
        s.userData.baseX = s.userData.baseX ?? s.position.x;
        s.position.x = s.userData.baseX + Math.sin(elapsed * 0.018 + i * 2.1) * 55;
      }
    }
  }

  return { group: root, update };
}

export function createDistantWalls() {
  const group = new THREE.Group();
  group.name = 'distant-wall-segments';
  buildRidgeWall(group, [
    [-1085, -995], [-820, -1068], [-545, -1102], [-250, -1118],
    [55, -1110], [370, -1070], [690, -1002], [975, -930],
  ], 511, 5.1, 1.9);
  buildRidgeWall(group, [
    [612, 690], [676, 470], [714, 250], [742, 35],
    [752, -190], [748, -392], [812, -612], [905, -760],
  ], 733, 4.7, 1.8);
  buildRidgeWall(group, [
    [-586, 610], [-626, 400], [-676, 190], [-714, -20],
    [-726, -238], [-790, -456], [-902, -650],
  ], 947, 4.6, 1.75);
  return group;
}
