import * as THREE from 'three';
import { heightAt, nearestRiver, campCenter, aobao } from './terrain.js';
import { mats } from './materials.js';
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

function segGeo(ax, ay, az, bx, by, bz, ra, rb, seg = 5) {
  const dx = bx - ax;
  const dy = by - ay;
  const dz = bz - az;
  const len = Math.hypot(dx, dy, dz) || 1;
  const geo = new THREE.CylinderGeometry(rb, ra, len, seg, 1, false);
  const q = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(dx / len, dy / len, dz / len)
  );
  geo.applyQuaternion(q);
  geo.translate((ax + bx) * 0.5, (ay + by) * 0.5, (az + bz) * 0.5);
  return geo;
}

class Bucket {
  constructor() { this.map = new Map(); }
  add(geo, mat) {
    if (!this.map.has(mat)) this.map.set(mat, []);
    this.map.get(mat).push(geo);
  }
  finish(parent, name) {
    const group = new THREE.Group();
    group.name = name;
    for (const [mat, list] of this.map) {
      const geo = mergeGeometryList(list);
      if (!geo) continue;
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    }
    parent.add(group);
    return group;
  }
}

const uWind = { value: 0 };

function attachSway(material, height, amount, speed) {
  const h = height.toFixed(3);
  const a = amount.toFixed(3);
  const s = speed.toFixed(3);
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uWindTime = uWind;
    shader.vertexShader = 'uniform float uWindTime;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\n' +
      '#ifdef USE_INSTANCING\n' +
      'vec3 iOrigin = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);\n' +
      'float phase = iOrigin.x * 0.16 + iOrigin.z * 0.12;\n' +
      'float hh = clamp(transformed.y / ' + h + ', 0.0, 1.0);\n' +
      'float sway = sin(uWindTime * ' + s + ' + phase) * ' + a + ' + sin(uWindTime * ' + (s * 1.9).toFixed(3) + ' + phase * 1.7) * ' + (a * 0.42).toFixed(3) + ';\n' +
      'transformed.x += sway * hh * hh;\n' +
      'transformed.z += cos(uWindTime * ' + (s * 0.73).toFixed(3) + ' + phase) * ' + (a * 0.55).toFixed(3) + ' * hh * hh;\n' +
      '#endif'
    );
  };
  material.customProgramCacheKey = () => 'sway-' + h + '-' + a + '-' + s;
}

function yurtFront(rot) {
  return { x: Math.sin(rot), z: Math.cos(rot) };
}

function addYurt(bucket, x, z, r, rot, variant) {
  const y = heightAt(x, z);
  const wallH = r * 0.72;
  const roofH = r * 0.62;
  const wall = new THREE.CylinderGeometry(r, r * 1.035, wallH, 20, 1, false);
  wall.translate(x, y + wallH * 0.5, z);
  bucket.add(wall, mats.yurtWall);

  const roof = new THREE.ConeGeometry(r * 1.13, roofH, 20, 1, false);
  roof.translate(x, y + wallH + roofH * 0.5, z);
  bucket.add(roof, mats.yurtRoof);

  const band = new THREE.CylinderGeometry(r * 1.055, r * 1.055, 0.24, 20, 1, true);
  band.translate(x, y + wallH - 0.05, z);
  bucket.add(band, variant ? mats.yurtTeal : mats.yurtTrim);

  const skirt = new THREE.CylinderGeometry(r * 1.06, r * 1.09, 0.32, 20, 1, true);
  skirt.translate(x, y + 0.14, z);
  bucket.add(skirt, variant ? mats.yurtTrim : mats.yurtTeal);

  const crown = new THREE.CylinderGeometry(r * 0.13, r * 0.1, 0.32, 10);
  crown.translate(x, y + wallH + roofH + 0.05, z);
  bucket.add(crown, mats.woodDark);

  for (let i = 0; i < 12; i++) {
    const ang = (i / 12) * Math.PI * 2 + rot;
    const ex = x + Math.cos(ang) * r * 1.04;
    const ez = z + Math.sin(ang) * r * 1.04;
    const ey = y + wallH + 0.06;
    const tx = x + Math.cos(ang) * r * 0.16;
    const tz = z + Math.sin(ang) * r * 0.16;
    const ty = y + wallH + roofH * 0.93;
    bucket.add(segGeo(tx, ty, tz, ex, ey, ez, 0.028, 0.018, 4), mats.rope);
  }

  const f = yurtFront(rot);
  const doorX = x + f.x * (r * 1.0 + 0.03);
  const doorZ = z + f.z * (r * 1.0 + 0.03);
  const door = new THREE.PlaneGeometry(r * 0.3, r * 0.5);
  door.rotateY(rot);
  door.translate(doorX, y + r * 0.25, doorZ);
  bucket.add(door, mats.yurtDoor);

  const frameSide = new THREE.BoxGeometry(r * 0.045, r * 0.54, 0.12);
  frameSide.rotateY(rot);
  frameSide.translate(doorX + f.z * r * 0.17, y + r * 0.27, doorZ - f.x * r * 0.17);
  bucket.add(frameSide, mats.yurtTrim);
  const frameSide2 = frameSide.clone();
  frameSide2.translate(-f.z * r * 0.34, 0, f.x * r * 0.34);
  bucket.add(frameSide2, mats.yurtTrim);
  const lintel = new THREE.BoxGeometry(r * 0.38, r * 0.05, 0.13);
  lintel.rotateY(rot);
  lintel.translate(doorX, y + r * 0.51, doorZ);
  bucket.add(lintel, mats.yurtTrim);

  for (let i = 0; i < 4; i++) {
    const ang = rot + Math.PI * 0.25 + i * (Math.PI * 0.5);
    const ax = x + Math.cos(ang) * r * 1.1;
    const az = z + Math.sin(ang) * r * 1.1;
    const bx = x + Math.cos(ang) * r * 2.15;
    const bz = z + Math.sin(ang) * r * 2.15;
    bucket.add(segGeo(ax, y + wallH * 0.92, az, bx, heightAt(bx, bz) + 0.03, bz, 0.018, 0.012, 4), mats.rope);
  }
}

const yurtSpots = [
  [72, 172, 7.2, 0.42, 0],
  [133, 178, 6.0, 1.35, 1],
  [104, 116, 6.2, -0.62, 0],
  [36, 129, 5.0, 2.15, 1],
  [161, 135, 4.7, 0.86, 0],
  [63, 220, 4.3, -1.55, 1],
];

function addCampProps(bucket, rand) {
  const cartX = 148;
  const cartZ = 197;
  const cy = heightAt(cartX, cartZ);
  const bed = new THREE.BoxGeometry(3.4, 0.22, 1.7);
  bed.rotateY(0.5);
  bed.translate(cartX, cy + 0.92, cartZ);
  bucket.add(bed, mats.wood);
  for (const side of [-1, 1]) {
    const wheel = new THREE.CylinderGeometry(0.72, 0.72, 0.16, 12);
    wheel.rotateZ(Math.PI * 0.5);
    wheel.rotateY(0.5);
    wheel.translate(
      cartX + Math.cos(0.5) * side * 1.0,
      cy + 0.72,
      cartZ - Math.sin(0.5) * side * 1.0
    );
    bucket.add(wheel, mats.woodDark);
  }
  const shaft = new THREE.BoxGeometry(2.8, 0.1, 0.1);
  shaft.rotateY(0.5);
  shaft.translate(cartX + 2.3, cy + 0.78, cartZ + 0.9);
  bucket.add(shaft, mats.woodDark);

  for (let i = 0; i < 4; i++) {
    const x = 172 + i * 0.6;
    const z = 165 + (i % 2) * 0.5;
    const yy = heightAt(x, z);
    const post = new THREE.BoxGeometry(0.18, 1.35, 0.18);
    post.translate(x, yy + 0.67, z);
    bucket.add(post, mats.woodDark);
    const rail = new THREE.BoxGeometry(2.5, 0.1, 0.1);
    rail.translate(x + 1.2, yy + 1.0, z);
    bucket.add(rail, mats.wood);
  }

  for (let i = 0; i < 3; i++) {
    const x = 136 + i * 3.1;
    const z = 238;
    const yy = heightAt(x, z);
    bucket.add(segGeo(x, yy, z, x, yy + 1.5, z, 0.08, 0.06, 5), mats.woodDark);
    bucket.add(segGeo(x - 0.5, yy + 1.2, z, x + 0.5, yy + 1.2, z, 0.03, 0.03, 4), mats.rope);
  }

  for (let i = 0; i < 10; i++) {
    const a = rand() * Math.PI * 2;
    const d = 18 + rand() * 34;
    const x = campCenter.x + Math.cos(a) * d;
    const z = campCenter.z + Math.sin(a) * d;
    const yy = heightAt(x, z);
    const rock = new THREE.DodecahedronGeometry(0.25 + rand() * 0.55, 0);
    rock.scale(1.2, 0.6, 1.0);
    rock.rotateY(rand() * 6.2);
    rock.translate(x, yy + 0.1, z);
    bucket.add(rock, rand() < 0.5 ? mats.stone : mats.stoneDark);
  }

  for (let i = 0; i < 12; i++) {
    const a = rand() * Math.PI * 2;
    const d = 40 + rand() * 40;
    const x = campCenter.x + Math.cos(a) * d;
    const z = campCenter.z + Math.sin(a) * d;
    const yy = heightAt(x, z);
    const stack = new THREE.CylinderGeometry(0.18, 0.18, 0.5, 6);
    stack.rotateZ(Math.PI * 0.5);
    stack.rotateY(a);
    stack.translate(x, yy + 0.2, z);
    bucket.add(stack, mats.woodDark);
  }
}

function addPrayerFlags(root) {
  const baseX = aobao.x;
  const baseZ = aobao.z;
  const baseY = heightAt(baseX, baseZ);
  const topY = baseY + 9.4;
  const colors = [
    new THREE.Color(0x2f73b8),
    new THREE.Color(0xf2ead6),
    new THREE.Color(0xc53b32),
    new THREE.Color(0x3f8c5a),
    new THREE.Color(0xe2b23f),
  ];
  const positions = [];
  const colorsArr = [];
  const drops = [];
  const rand = rand32(7742);
  const anchors = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.28;
    const d = 10 + rand() * 7;
    const ax = baseX + Math.cos(a) * d;
    const az = baseZ + Math.sin(a) * d;
    anchors.push([ax, heightAt(ax, az) + 0.3, az]);
  }
  for (let line = 0; line < anchors.length; line++) {
    const [ax, ay, az] = anchors[line];
    const n = 9;
    for (let k = 0; k < n; k++) {
      const t0 = k / n;
      const t1 = (k + 0.82) / n;
      const sag = (t) => Math.sin(t * Math.PI) * 1.05;
      const p0 = new THREE.Vector3(
        baseX + (ax - baseX) * t0,
        topY + (ay - topY) * t0 - sag(t0),
        baseZ + (az - baseZ) * t0
      );
      const p1 = new THREE.Vector3(
        baseX + (ax - baseX) * t1,
        topY + (ay - topY) * t1 - sag(t1),
        baseZ + (az - baseZ) * t1
      );
      const drop = 0.48;
      const c = colors[(line + k) % colors.length];
      const verts = [
        p0, p1,
        new THREE.Vector3(p1.x, p1.y - drop, p1.z),
        new THREE.Vector3(p0.x, p0.y - drop, p0.z),
      ];
      const uv = [0, 0, 1, 0, 1, 1, 0, 1];
      for (const v of verts) positions.push(v.x, v.y, v.z);
      for (let q = 0; q < 4; q++) {
        colorsArr.push(c.r, c.g, c.b);
        drops.push(uv[q * 2 + 1]);
      }
    }
    for (let k = 0; k < 16; k++) {
      const t0 = k / 16;
      const t1 = (k + 1) / 16;
      const sag = (t) => Math.sin(t * Math.PI) * 1.05;
      positions.push(
        baseX + (ax - baseX) * t0,
        topY + (ay - topY) * t0 - sag(t0),
        baseZ + (az - baseZ) * t0
      );
      positions.push(
        baseX + (ax - baseX) * t1,
        topY + (ay - topY) * t1 - sag(t1),
        baseZ + (az - baseZ) * t1
      );
    }
  }
  const count = positions.length / 3 - anchors.length * 16 * 2;
  const flagGeo = new THREE.BufferGeometry();
  flagGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions.slice(0, count * 3), 3));
  flagGeo.setAttribute('color', new THREE.Float32BufferAttribute(colorsArr, 3));
  flagGeo.setAttribute('aDrop', new THREE.Float32BufferAttribute(drops, 1));
  flagGeo.computeVertexNormals();
  const flagMesh = new THREE.Mesh(flagGeo, mats.flag);
  flagMesh.castShadow = false;
  flagMesh.receiveShadow = false;
  flagMesh.name = 'prayer-flags';
  root.add(flagMesh);

  const linePositions = positions.slice(count * 3);
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
  const lineMat = new THREE.LineBasicMaterial({ color: 0x5a5142, transparent: true, opacity: 0.7 });
  const lines = new THREE.LineSegments(lineGeo, lineMat);
  lines.name = 'prayer-flag-ropes';
  root.add(lines);

  mats.flag.onBeforeCompile = (shader) => {
    shader.uniforms.uWindTime = uWind;
    shader.vertexShader = 'uniform float uWindTime;\nattribute float aDrop;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\n' +
      'float ph = position.x * 0.55 + position.z * 0.42;\n' +
      'transformed.x += sin(uWindTime * 3.6 + ph) * 0.12 * aDrop;\n' +
      'transformed.z += cos(uWindTime * 2.8 + ph * 1.4) * 0.08 * aDrop;\n' +
      'transformed.y += sin(uWindTime * 4.3 + ph * 0.7) * 0.025 * aDrop;'
    );
  };
  mats.flag.customProgramCacheKey = () => 'prayer-flag-wind';
  return anchors;
}

function addAobao(bucket, rand) {
  const x = aobao.x;
  const z = aobao.z;
  const y = heightAt(x, z);
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2 + rand() * 0.12;
    const d = 4.2 + rand() * 1.6;
    const sx = x + Math.cos(a) * d;
    const sz = z + Math.sin(a) * d;
    const sy = heightAt(sx, sz);
    const s = 0.55 + rand() * 0.65;
    const g = new THREE.DodecahedronGeometry(s, 0);
    g.scale(1.2, 0.65, 1.05);
    g.rotateY(rand() * 6.2);
    g.translate(sx, sy + s * 0.3, sz);
    bucket.add(g, i % 3 === 0 ? mats.stoneLight : (i % 3 === 1 ? mats.stone : mats.stoneDark));
  }
  for (let i = 0; i < 9; i++) {
    const s = 1.4 - i * 0.1;
    const g = new THREE.DodecahedronGeometry(s, 0);
    g.scale(1.25, 0.52, 1.15);
    g.rotateY(i * 1.7);
    g.translate(x + (rand() - 0.5) * 0.3, y + 0.35 + i * 0.56, z + (rand() - 0.5) * 0.3);
    bucket.add(g, i % 2 ? mats.stone : mats.stoneDark);
  }
  const pole = new THREE.CylinderGeometry(0.075, 0.11, 9.6, 7);
  pole.translate(x, y + 4.8, z);
  bucket.add(pole, mats.woodDark);
  const tip = new THREE.ConeGeometry(0.22, 0.65, 7);
  tip.translate(x, y + 9.75, z);
  bucket.add(tip, mats.yurtTrim);
  for (let i = 0; i < 7; i++) {
    const a = rand() * Math.PI * 2;
    const d = 2.2 + rand() * 4.5;
    const g = new THREE.CylinderGeometry(0.045, 0.06, 0.9, 5);
    g.rotateZ((rand() - 0.5) * 0.5);
    g.translate(x + Math.cos(a) * d, y + 0.45, z + Math.sin(a) * d);
    bucket.add(g, mats.wood);
  }
}

function addBirch(bucket, x, z, h, rand) {
  const y = heightAt(x, z);
  const lean = (rand() - 0.5) * 0.1;
  const trunk = new THREE.CylinderGeometry(0.055 + h * 0.008, 0.09 + h * 0.012, h * 0.82, 6);
  trunk.rotateZ(lean);
  trunk.translate(x, y + h * 0.41, z);
  bucket.add(trunk, mats.birchTrunk);
  for (let i = 0; i < 5; i++) {
    const band = new THREE.CylinderGeometry(0.075 + h * 0.011, 0.08 + h * 0.011, 0.09 + rand() * 0.08, 6);
    band.rotateZ(lean);
    band.translate(x - lean * h * (0.15 + i * 0.1), y + h * (0.12 + i * 0.15), z);
    bucket.add(band, mats.birchMark);
  }
  const crowns = 3 + (rand() * 3 | 0);
  for (let i = 0; i < crowns; i++) {
    const a = rand() * Math.PI * 2;
    const rr = h * (0.08 + rand() * 0.18);
    const size = h * (0.13 + rand() * 0.13);
    const g = new THREE.IcosahedronGeometry(size, 0);
    g.scale(1.15, 0.8 + rand() * 0.3, 1.05);
    g.rotateY(rand() * 6.2);
    g.translate(
      x + Math.cos(a) * rr,
      y + h * (0.66 + rand() * 0.26),
      z + Math.sin(a) * rr
    );
    bucket.add(g, rand() < 0.32 ? mats.birchLeafGold : mats.birchLeaf);
  }
}

function buildBirches(bucket) {
  const rand = rand32(3927);
  const groves = [
    [-470, 25, 95, 28],
    [-520, -170, 105, 24],
    [320, -420, 80, 14],
  ];
  for (const [cx, cz, radius, count] of groves) {
    for (let i = 0; i < count; i++) {
      const a = rand() * Math.PI * 2;
      const d = Math.sqrt(rand()) * radius;
      const x = cx + Math.cos(a) * d;
      const z = cz + Math.sin(a) * d;
      if (nearestRiver(x, z).d < 18) continue;
      const h = 5.5 + rand() * 6.5;
      addBirch(bucket, x, z, h, rand);
    }
  }
  for (let i = 0; i < 18; i++) {
    const x = -80 + (rand() - 0.5) * 520;
    const z = 340 + (rand() - 0.5) * 280;
    if (nearestRiver(x, z).d < 22) continue;
    addBirch(bucket, x, z, 4.5 + rand() * 4.5, rand);
  }
}

function makeGrassGeometry() {
  const positions = [];
  const colors = [];
  const rand = rand32(5512);
  const palette = [
    [0.29, 0.36, 0.14],
    [0.39, 0.46, 0.18],
    [0.48, 0.5, 0.2],
    [0.56, 0.54, 0.24],
  ];
  for (let b = 0; b < 3; b++) {
    const a = (b / 3) * Math.PI + rand() * 0.35;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const w = 0.055 + rand() * 0.025;
    const h = 0.72 + rand() * 0.34;
    const lx = (rand() - 0.5) * 0.22;
    const lz = (rand() - 0.5) * 0.22;
    const tip = palette[2 + (b % 2)];
    const base = palette[0];
    positions.push(-c * w, 0, -s * w, c * w, 0, s * w, lx, h, lz);
    colors.push(base[0], base[1], base[2], base[0], base[1], base[2], tip[0], tip[1], tip[2]);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

function makeFlowerGeometry() {
  const positions = [];
  const colors = [];
  for (let q = 0; q < 2; q++) {
    const a = q * Math.PI * 0.5;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const w = 0.16;
    const h = 0.12;
    positions.push(
      -c * w, 0.24, -s * w,
      c * w, 0.24, s * w,
      c * w, 0.24 + h, s * w,
      -c * w, 0.24, -s * w,
      c * w, 0.24 + h, s * w,
      -c * w, 0.24 + h, -s * w
    );
    for (let k = 0; k < 6; k++) colors.push(1, 1, 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

function buildGrassAndFlowers(staticRoot, stats) {
  const rand = rand32(18421);
  const grassGeo = makeGrassGeometry();
  const grassMat = mats.grass;
  attachSway(grassMat, 1.05, 0.16, 1.35);
  const grassCount = 58000;
  const grass = new THREE.InstancedMesh(grassGeo, grassMat, grassCount);
  grass.name = 'wind-grass';
  grass.castShadow = false;
  grass.receiveShadow = false;
  grass.frustumCulled = false;
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  let placed = 0;
  let attempts = 0;
  while (placed < grassCount && attempts < grassCount * 4) {
    attempts++;
    const x = (rand() - 0.5) * 1820;
    const z = (rand() - 0.5) * 1820;
    const nr = nearestRiver(x, z);
    const waterHalf = 14 + Math.sin(nr.s.t * 31 + 1.3) * 4.5;
    if (nr.d < waterHalf + 2.4) continue;
    if (Math.abs(x) > 890 || Math.abs(z) > 890) continue;
    const patch = Math.sin(x * 0.019 + 4) * Math.sin(z * 0.017 - 2) + Math.sin((x + z) * 0.008);
    if (patch < -1.35 && rand() < 0.7) continue;
    let nearYurt = false;
    for (const [yx, yz, yr] of yurtSpots) {
      if (Math.hypot(x - yx, z - yz) < yr + 1.5) { nearYurt = true; break; }
    }
    if (nearYurt) continue;
    const y = heightAt(x, z);
    const bank = nr.d < 52 ? 1.32 - nr.d / 170 : 1;
    const s = (0.68 + rand() * 0.9) * bank;
    dummy.position.set(x, y + 0.01, z);
    dummy.rotation.set(0, rand() * Math.PI * 2, 0);
    dummy.scale.set(0.8 + rand() * 0.55, s, 0.8 + rand() * 0.55);
    dummy.updateMatrix();
    grass.setMatrixAt(placed, dummy.matrix);
    const gold = nr.d < 45 ? 0.24 : 0.11;
    color.setRGB(
      0.72 + rand() * 0.25,
      0.8 + rand() * 0.2 - gold * 0.25,
      0.55 + rand() * 0.2 - gold
    );
    color.offsetHSL((rand() - 0.5) * 0.03, -0.06 + rand() * 0.12, (rand() - 0.5) * 0.07);
    grass.setColorAt(placed, color);
    placed++;
  }
  grass.count = placed;
  grass.instanceMatrix.needsUpdate = true;
  if (grass.instanceColor) grass.instanceColor.needsUpdate = true;
  staticRoot.add(grass);

  const flowerGeo = makeFlowerGeometry();
  const flowerMat = mats.flower;
  attachSway(flowerMat, 0.4, 0.09, 1.7);
  const flowerCount = 11500;
  const flowers = new THREE.InstancedMesh(flowerGeo, flowerMat, flowerCount);
  flowers.name = 'wildflowers';
  flowers.castShadow = false;
  flowers.receiveShadow = false;
  flowers.frustumCulled = false;
  const petal = new THREE.Color();
  const petals = [0xf0d75e, 0xf5efdc, 0xc58bd1, 0xe97a6a, 0xffb95c, 0x9dbde0];
  let fp = 0;
  attempts = 0;
  while (fp < flowerCount && attempts < flowerCount * 6) {
    attempts++;
    let x;
    let z;
    if (rand() < 0.42) {
      const c = yurtSpots[(rand() * yurtSpots.length) | 0];
      x = c[0] + (rand() - 0.5) * 110;
      z = c[1] + (rand() - 0.5) * 110;
    } else {
      x = (rand() - 0.5) * 1560;
      z = (rand() - 0.5) * 1560;
    }
    const nr = nearestRiver(x, z);
    if (nr.d < 19) continue;
    if (Math.abs(x) > 850 || Math.abs(z) > 850) continue;
    const y = heightAt(x, z);
    dummy.position.set(x, y + 0.02, z);
    dummy.rotation.set(0, rand() * Math.PI * 2, 0);
    const sc = 0.8 + rand() * 0.7;
    dummy.scale.set(sc, sc, sc);
    dummy.updateMatrix();
    flowers.setMatrixAt(fp, dummy.matrix);
    petal.setHex(petals[(rand() * petals.length) | 0]);
    petal.offsetHSL((rand() - 0.5) * 0.04, 0, (rand() - 0.5) * 0.1);
    flowers.setColorAt(fp, petal);
    fp++;
  }
  flowers.count = fp;
  flowers.instanceMatrix.needsUpdate = true;
  if (flowers.instanceColor) flowers.instanceColor.needsUpdate = true;
  staticRoot.add(flowers);
  stats.grass = placed;
  stats.flowers = fp;
  return { grass, flowers };
}

function buildHorseGeometries() {
  const bodyParts = [];
  const b1 = new THREE.SphereGeometry(0.58, 10, 8);
  b1.scale(0.9, 0.98, 1.7);
  b1.translate(0, 1.18, 0);
  bodyParts.push(b1);
  const b2 = new THREE.SphereGeometry(0.46, 8, 6);
  b2.scale(1.0, 0.95, 1.0);
  b2.translate(0, 1.14, 0.62);
  bodyParts.push(b2);
  const b3 = new THREE.SphereGeometry(0.45, 8, 6);
  b3.scale(1.0, 0.98, 1.0);
  b3.translate(0, 1.19, -0.62);
  bodyParts.push(b3);
  const body = mergeGeometryList(bodyParts);

  const headParts = [];
  headParts.push(segGeo(0, 0, 0, 0, 0.46, 0.42, 0.185, 0.13, 6));
  const skull = new THREE.SphereGeometry(0.25, 8, 6);
  skull.scale(0.76, 0.82, 1.45);
  skull.translate(0, 0.58, 0.65);
  headParts.push(skull);
  const muzzle = new THREE.SphereGeometry(0.16, 7, 5);
  muzzle.scale(0.85, 0.72, 1.2);
  muzzle.translate(0, 0.49, 0.94);
  headParts.push(muzzle);
  for (const side of [-1, 1]) {
    const ear = new THREE.ConeGeometry(0.075, 0.22, 5);
    ear.translate(side * 0.11, 0.83, 0.55);
    ear.rotateZ(side * 0.18);
    headParts.push(ear);
  }
  const head = mergeGeometryList(headParts);

  const maneParts = [];
  for (let i = 0; i < 4; i++) {
    const m = new THREE.BoxGeometry(0.085, 0.36, 0.13);
    m.rotateX(-0.55);
    m.translate(0, 0.2 + i * 0.13, 0.06 + i * 0.11);
    maneParts.push(m);
  }
  const mane = mergeGeometryList(maneParts);

  const leg = new THREE.CylinderGeometry(0.062, 0.088, 0.92, 5);
  leg.translate(0, -0.46, 0);
  const hoof = new THREE.BoxGeometry(0.14, 0.13, 0.2);
  hoof.translate(0, -0.94, 0.03);
  const legGeo = mergeGeometryList([leg, hoof]);

  const tailParts = [];
  tailParts.push(segGeo(0, 0, 0, 0, -0.6, -0.2, 0.055, 0.02, 5));
  const tuft = new THREE.ConeGeometry(0.1, 0.45, 5);
  tuft.rotateX(0.32);
  tuft.translate(0, -0.78, -0.26);
  tailParts.push(tuft);
  const tail = mergeGeometryList(tailParts);

  return { body, head, mane, leg: legGeo, tail };
}

const horseDefs = [
  [30, 258], [42, 250], [16, 266], [55, 262], [6, 250],
  [68, 246], [-6, 272], [40, 238], [20, 240], [80, 258],
  [-16, 246], [58, 276], [30, 228], [76, 238], [92, 250],
  [-26, 260],
];

function buildHorses(dynamic) {
  const geos = buildHorseGeometries();
  const count = horseDefs.length;
  const body = new THREE.InstancedMesh(geos.body, mats.horseBody, count);
  const head = new THREE.InstancedMesh(geos.head, mats.horseBody, count);
  const mane = new THREE.InstancedMesh(geos.mane, mats.horseMane, count);
  const legs = new THREE.InstancedMesh(geos.leg, mats.horseBody, count * 4);
  const tail = new THREE.InstancedMesh(geos.tail, mats.horseMane, count);
  for (const mesh of [body, head, mane, legs, tail]) {
    mesh.castShadow = true;
    mesh.receiveShadow = false;
    mesh.frustumCulled = false;
    dynamic.add(mesh);
  }
  body.name = 'horse-herd';
  const rand = rand32(9021);
  const colors = [0x6b3f28, 0x8b4d2c, 0x3d2b22, 0xa5743f, 0x6d5746, 0x94532f];
  const states = horseDefs.map(([x, z], i) => {
    const walk = i < 6 || i === 11;
    return {
      homeX: x,
      homeZ: z,
      x,
      z,
      y: heightAt(x, z),
      heading: rand() * Math.PI * 2,
      radius: walk ? 2.5 + rand() * 4.5 : 0,
      speed: 0.045 + rand() * 0.035,
      phase: rand() * Math.PI * 2,
      graze: i % 3 === 1 ? 0.52 + rand() * 0.24 : 0.04 + rand() * 0.1,
      scale: 0.94 + rand() * 0.16,
      color: new THREE.Color(colors[(rand() * colors.length) | 0]),
    };
  });
  for (let i = 0; i < count; i++) {
    body.setColorAt(i, states[i].color);
    head.setColorAt(i, states[i].color);
    for (let j = 0; j < 4; j++) legs.setColorAt(i * 4 + j, states[i].color);
  }
  if (body.instanceColor) body.instanceColor.needsUpdate = true;
  if (head.instanceColor) head.instanceColor.needsUpdate = true;
  if (legs.instanceColor) legs.instanceColor.needsUpdate = true;

  const horseM = new THREE.Matrix4();
  const off = new THREE.Matrix4();
  const rot = new THREE.Matrix4();
  const tmp = new THREE.Matrix4();
  const euler = new THREE.Euler();
  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const legOffsets = [[-0.26, 0.58], [0.26, 0.58], [-0.26, -0.56], [0.26, -0.56]];

  function update(elapsed) {
    for (let i = 0; i < count; i++) {
      const h = states[i];
      if (h.radius > 0) {
        const a = elapsed * h.speed + h.phase;
        h.x = h.homeX + Math.cos(a) * h.radius;
        h.z = h.homeZ + Math.sin(a) * h.radius;
        const dx = -Math.sin(a);
        const dz = Math.cos(a);
        const target = Math.atan2(dx, dz);
        let diff = target - h.heading;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        h.heading += diff * 0.08;
      }
      const ground = heightAt(h.x, h.z);
      const bob = h.radius > 0 ? Math.sin(elapsed * 4.2 + h.phase) * 0.035 : Math.sin(elapsed * 1.2 + h.phase) * 0.012;
      h.y = ground + bob;
      euler.set(0, h.heading, 0);
      quat.setFromEuler(euler);
      pos.set(h.x, h.y, h.z);
      scale.setScalar(h.scale);
      horseM.compose(pos, quat, scale);

      body.setMatrixAt(i, horseM);
      off.makeTranslation(0, 1.34, 0.7);
      tmp.multiplyMatrices(horseM, off);
      const headAngle = h.graze + Math.sin(elapsed * 0.75 + h.phase) * 0.09;
      rot.makeRotationX(headAngle);
      tmp.multiply(rot);
      head.setMatrixAt(i, tmp);
      mane.setMatrixAt(i, tmp);

      const moving = h.radius > 0 ? 1 : 0.18;
      for (let j = 0; j < 4; j++) {
        const [lx, lz] = legOffsets[j];
        const swing = Math.sin(elapsed * (h.radius > 0 ? 5.2 : 1.3) + h.phase + j * Math.PI * 0.55) * 0.3 * moving;
        off.makeTranslation(lx, 0.98, lz);
        tmp.multiplyMatrices(horseM, off);
        rot.makeRotationX(swing);
        tmp.multiply(rot);
        legs.setMatrixAt(i * 4 + j, tmp);
      }

      off.makeTranslation(0, 1.22, -0.96);
      tmp.multiplyMatrices(horseM, off);
      rot.makeRotationX(-0.42 + Math.sin(elapsed * 2.1 + h.phase) * 0.16);
      tmp.multiply(rot);
      const tailTwist = new THREE.Matrix4().makeRotationZ(Math.sin(elapsed * 1.4 + h.phase) * 0.18);
      tmp.multiply(tailTwist);
      tail.setMatrixAt(i, tmp);
    }
    body.instanceMatrix.needsUpdate = true;
    head.instanceMatrix.needsUpdate = true;
    mane.instanceMatrix.needsUpdate = true;
    legs.instanceMatrix.needsUpdate = true;
    tail.instanceMatrix.needsUpdate = true;
  }

  return { body, head, mane, legs, tail, states, update };
}

function buildSheep(dynamic) {
  const woolParts = [];
  const w1 = new THREE.IcosahedronGeometry(0.5, 1);
  w1.scale(0.88, 0.95, 1.16);
  w1.translate(0, 0.64, 0);
  woolParts.push(w1);
  const w2 = new THREE.SphereGeometry(0.26, 7, 5);
  w2.scale(0.9, 0.9, 0.9);
  w2.translate(0, 0.84, -0.38);
  woolParts.push(w2);
  const woolGeo = mergeGeometryList(woolParts);

  const darkParts = [];
  const headG = new THREE.SphereGeometry(0.17, 7, 5);
  headG.scale(0.85, 0.95, 1.25);
  headG.translate(0, 0.84, 0.5);
  darkParts.push(headG);
  for (const [lx, lz] of [[-0.16, 0.26], [0.16, 0.26], [-0.16, -0.26], [0.16, -0.26]]) {
    const l = new THREE.CylinderGeometry(0.035, 0.04, 0.42, 4);
    l.translate(lx, 0.22, lz);
    darkParts.push(l);
  }
  const darkGeo = mergeGeometryList(darkParts);

  const rand = rand32(12071);
  const count = 54;
  const wool = new THREE.InstancedMesh(woolGeo, mats.sheepWool, count);
  const dark = new THREE.InstancedMesh(darkGeo, mats.sheepDark, count);
  for (const m of [wool, dark]) {
    m.castShadow = true;
    m.receiveShadow = false;
    m.frustumCulled = false;
    dynamic.add(m);
  }
  wool.name = 'sheep-flock';
  const clusters = [[-24, 232], [128, 244], [48, 300]];
  const states = [];
  const shade = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const c = clusters[i % clusters.length];
    states.push({
      homeX: c[0] + (rand() - 0.5) * 54,
      homeZ: c[1] + (rand() - 0.5) * 42,
      radius: rand() < 0.5 ? 0.6 + rand() * 3.4 : 0,
      speed: 0.03 + rand() * 0.06,
      phase: rand() * Math.PI * 2,
      heading: rand() * Math.PI * 2,
      scale: 0.72 + rand() * 0.36,
      x: 0,
      z: 0,
    });
    shade.setHSL(0.1 + rand() * 0.03, 0.1 + rand() * 0.1, 0.82 + rand() * 0.12);
    wool.setColorAt(i, shade);
  }
  if (wool.instanceColor) wool.instanceColor.needsUpdate = true;

  const mat4 = new THREE.Matrix4();
  const euler = new THREE.Euler();
  const quat = new THREE.Quaternion();
  const pos = new THREE.Vector3();
  const sc = new THREE.Vector3();
  function update(elapsed) {
    for (let i = 0; i < count; i++) {
      const s = states[i];
      if (s.radius > 0) {
        const a = elapsed * s.speed + s.phase;
        s.x = s.homeX + Math.cos(a) * s.radius;
        s.z = s.homeZ + Math.sin(a) * s.radius;
        const target = Math.atan2(-Math.sin(a), Math.cos(a));
        let diff = target - s.heading;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        s.heading += diff * 0.05;
      } else {
        s.x = s.homeX;
        s.z = s.homeZ;
      }
      const y = heightAt(s.x, s.z) + Math.sin(elapsed * (2.1 + s.speed) + s.phase) * 0.018;
      euler.set(0, s.heading, 0);
      quat.setFromEuler(euler);
      pos.set(s.x, y, s.z);
      sc.setScalar(s.scale);
      mat4.compose(pos, quat, sc);
      wool.setMatrixAt(i, mat4);
      dark.setMatrixAt(i, mat4);
    }
    wool.instanceMatrix.needsUpdate = true;
    dark.instanceMatrix.needsUpdate = true;
  }
  return { wool, dark, states, update };
}

function buildClouds(root) {
  const group = new THREE.Group();
  group.name = 'sunset-clouds';
  const defs = [
    [-2050, 520, -2400, 1700, 480, mats.cloudDark, 0.2, 1.6],
    [-1300, 610, -2750, 1450, 420, mats.cloudRose, 0.3, 1.2],
    [-520, 660, -3050, 1600, 450, mats.cloudWarm, 2.1, 0.9],
    [420, 600, -2900, 1350, 400, mats.cloudWarm, 4.2, 1.4],
    [1350, 545, -2500, 1550, 430, mats.cloudDark, 0.1, 1.8],
    [2200, 620, -1800, 1300, 380, mats.cloudRose, 3.5, 1.0],
    [-2500, 500, -1000, 1250, 360, mats.cloudRose, 2.5, 1.3],
    [2550, 520, -200, 1400, 390, mats.cloudWarm, 5.1, 1.1],
    [-2600, 680, 700, 1350, 380, mats.cloudWhite, 1.4, 0.9],
    [1700, 760, 1250, 1500, 420, mats.cloudWarm, 2.9, 1.2],
    [-950, 780, 1900, 1600, 460, mats.cloudRose, 4.8, 1.5],
    [350, 830, 2300, 1800, 500, mats.cloudWhite, 0.8, 1.1],
    [-1750, 330, -1750, 950, 250, mats.cloudDark, 1.1, 2.1],
    [900, 350, -1950, 1050, 280, mats.cloudDark, 3.2, 1.8],
    [2250, 330, -950, 950, 250, mats.cloudRose, 0.6, 1.7],
    [-2250, 350, 100, 1000, 270, mats.cloudDark, 2.2, 2.0],
    [-750, 430, -2650, 1150, 300, mats.cloudWhite, 3.8, 1.3],
    [1500, 440, -2850, 1200, 320, mats.cloudWhite, 5.6, 1.0],
    [-300, 470, -2600, 1000, 280, mats.cloudRose, 4.5, 1.4],
    [300, 520, -2250, 850, 230, mats.cloudWarm, 1.9, 1.6],
    [-1600, 560, -2150, 900, 260, mats.cloudWarm, 2.7, 1.2],
    [1900, 700, -1500, 900, 250, mats.cloudDark, 5.8, 1.9],
  ];
  const rand = rand32(6631);
  const sprites = [];
  for (const [x, y, z, sx, sy, mat, phase, speed] of defs) {
    const sprite = new THREE.Sprite(mat);
    sprite.position.set(x, y, z);
    sprite.scale.set(sx, sy, 1);
    sprite.renderOrder = 2;
    sprite.userData = {
      baseX: x,
      baseY: y,
      phase,
      speed: 0.01 + speed * 0.008,
      drift: 30 + rand() * 60,
    };
    group.add(sprite);
    sprites.push(sprite);
  }
  const glow = new THREE.Sprite(mats.glow);
  glow.position.set(-2220, 690, -1460);
  glow.scale.set(1450, 1450, 1);
  glow.renderOrder = 1;
  group.add(glow);
  root.add(group);
  return { group, sprites, glow };
}

function makeBirds(dynamic) {
  const wing = new THREE.BufferGeometry();
  wing.setAttribute('position', new THREE.Float32BufferAttribute([
    -0.42, 0, 0, 0, 0, 0.18, 0, 0, -0.14,
    0, 0, -0.14, 0.42, 0, 0, 0, 0, 0.18,
  ], 3));
  wing.computeVertexNormals();
  const mat = new THREE.MeshBasicMaterial({ color: 0x2f2a25, side: THREE.DoubleSide });
  const count = 12;
  const mesh = new THREE.InstancedMesh(wing, mat, count);
  mesh.frustumCulled = false;
  dynamic.add(mesh);
  const states = [];
  const rand = rand32(4310);
  for (let i = 0; i < count; i++) {
    states.push({
      r: 220 + rand() * 420,
      cx: -300 + rand() * 500,
      cz: -320 + rand() * 300,
      y: 95 + rand() * 80,
      speed: 0.02 + rand() * 0.025,
      phase: rand() * Math.PI * 2,
      flap: 2 + rand() * 2,
    });
  }
  const m4 = new THREE.Matrix4();
  const e = new THREE.Euler();
  const q = new THREE.Quaternion();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3();
  function update(elapsed) {
    for (let i = 0; i < count; i++) {
      const b = states[i];
      const a = elapsed * b.speed + b.phase;
      p.set(b.cx + Math.cos(a) * b.r, b.y + Math.sin(elapsed * 0.5 + b.phase) * 6, b.cz + Math.sin(a) * b.r);
      e.set(Math.sin(elapsed * b.flap + b.phase) * 0.3, -a + Math.PI, 0);
      q.setFromEuler(e);
      s.setScalar(1.2 + (i % 3) * 0.15);
      m4.compose(p, q, s);
      mesh.setMatrixAt(i, m4);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }
  return { mesh, update };
}

export function createHulunbuirOverlay() {
  const group = new THREE.Group();
  group.name = 'hulunbuir-signature';
  const staticRoot = new THREE.Group();
  staticRoot.name = 'hulunbuir-static';
  const dynamic = new THREE.Group();
  dynamic.name = 'hulunbuir-dynamic';
  const bucket = new Bucket();
  const rand = rand32(27183);
  const stats = {};

  for (const [x, z, r, rot, variant] of yurtSpots) addYurt(bucket, x, z, r, rot, variant);
  addCampProps(bucket, rand);
  addAobao(bucket, rand);
  buildBirches(bucket);
  bucket.finish(staticRoot, 'yurts-aobao-birches');
  const flagAnchors = addPrayerFlags(group);
  buildGrassAndFlowers(staticRoot, stats);

  const horses = buildHorses(dynamic);
  const sheep = buildSheep(dynamic);
  const birds = makeBirds(dynamic);
  const clouds = buildClouds(rootFor(group));
  group.add(staticRoot, dynamic);

  function update(elapsed) {
    uWind.value = elapsed;
    mats.water.map.offset.x = elapsed * 0.005;
    mats.water.map.offset.y = elapsed * 0.0018;
    mats.water.normalMap.offset.x = elapsed * 0.018;
    mats.water.normalMap.offset.y = elapsed * 0.009;
    horses.update(elapsed);
    sheep.update(elapsed);
    birds.update(elapsed);
    for (const sprite of clouds.sprites) {
      const u = sprite.userData;
      sprite.position.x = u.baseX + Math.sin(elapsed * u.speed + u.phase) * u.drift;
      sprite.position.y = u.baseY + Math.sin(elapsed * u.speed * 0.7 + u.phase * 1.3) * 7;
    }
    const sunPulse = 0.68 + Math.sin(elapsed * 0.35) * 0.05;
    mats.glow.opacity = sunPulse;
  }

  return {
    group,
    static: staticRoot,
    dynamic,
    horses,
    sheep,
    birds,
    clouds,
    flagAnchors,
    update,
    counts: {
      yurts: yurtSpots.length,
      horses: horseDefs.length,
      sheep: 54,
      grass: stats.grass,
      flowers: stats.flowers,
      birches: 66,
      clouds: clouds.sprites.length,
      flags: 8 * 9,
    },
  };
}

function rootFor(group) {
  return group;
}



