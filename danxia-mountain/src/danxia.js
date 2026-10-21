import * as THREE from 'three';
import { mergeGeometryList, mergeStaticGroup } from './geometry.js';
import {
  heightAt,
  slopeAt,
  trailDistanceSq,
  riverAt,
  riverCurve,
  RIVER_BED_Y,
} from './terrain.js';
import { sharedTextures } from './materials.js';
import { makeLabelTexture } from './textures.js';

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

function lerp(a, b, t) {
  return a + (b - a) * t;
}

const STRATA = [0x9c3f2b, 0xb55335, 0xc76940, 0x873224, 0xcf804d, 0xa64630, 0xd79a63];

const strataMat = new THREE.MeshStandardMaterial({
  vertexColors: true,
  flatShading: true,
  roughness: 1,
  metalness: 0,
});
const boulderMat = new THREE.MeshStandardMaterial({
  color: 0xa95438,
  roughness: 1,
  flatShading: true,
  vertexColors: true,
});
const boulderLightMat = new THREE.MeshStandardMaterial({
  color: 0xc2734a,
  roughness: 1,
  flatShading: true,
  vertexColors: true,
});
const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4f3c2c, roughness: 1 });
const woodMat = new THREE.MeshStandardMaterial({ color: 0x7f3d29, roughness: 0.88 });
const plankMat = new THREE.MeshStandardMaterial({ color: 0x8b5a38, roughness: 0.96 });
const railMat = new THREE.MeshStandardMaterial({ color: 0x33302a, roughness: 0.7, metalness: 0.22 });
const roofMat = new THREE.MeshStandardMaterial({ color: 0x2f3b38, roughness: 0.82, metalness: 0.05 });
const goldMat = new THREE.MeshStandardMaterial({ color: 0xc7a45a, roughness: 0.5, metalness: 0.35 });
const stoneMat = new THREE.MeshStandardMaterial({ color: 0xa77a5f, roughness: 1, flatShading: true });
const bambooMat = new THREE.MeshStandardMaterial({ color: 0x6e8b43, roughness: 0.96 });
const leafMats = [
  new THREE.MeshStandardMaterial({ color: 0x2e6b42, roughness: 0.98, flatShading: true }),
  new THREE.MeshStandardMaterial({ color: 0x3d8050, roughness: 0.98, flatShading: true }),
  new THREE.MeshStandardMaterial({ color: 0x5a9454, roughness: 0.98, flatShading: true }),
  new THREE.MeshStandardMaterial({ color: 0x6da05b, roughness: 0.98, flatShading: true }),
];

function addGeo(bucket, geo, mat) {
  if (!bucket.has(mat)) bucket.set(mat, []);
  bucket.get(mat).push(geo);
}

function tint(hex, rand, amount = 0.05) {
  const c = new THREE.Color(hex);
  c.offsetHSL((rand() - 0.5) * 0.012, (rand() - 0.5) * 0.05, (rand() - 0.5) * amount);
  return c;
}

function layeredRock(spec) {
  const {
    x, z, height, rBottom, rTop, seed,
    seg = 16, sink = 12, lean = 0.02,
    sx = 1, sz = 1, flatTop = true,
  } = spec;
  const rand = rand32(seed);
  const baseY = Math.max(2, heightAt(x, z) - sink);
  const rings = Math.max(12, Math.round(height / 2.7));
  const ringPts = [];
  const ringColors = [];
  const leanX = (rand() - 0.5) * height * lean;
  const leanZ = (rand() - 0.5) * height * lean;

  for (let i = 0; i <= rings; i++) {
    const f = i / rings;
    const y = baseY + height * f;
    const taper = Math.pow(f, 0.78);
    let r = lerp(rBottom, rTop, taper);
    if (i % 5 === 0) r *= 1.045;
    if (i % 9 === 4) r *= 0.955;
    r *= 0.96 + 0.07 * Math.sin(i * 1.73 + seed * 0.41);
    const pts = [];
    for (let j = 0; j < seg; j++) {
      const a = (j / seg) * Math.PI * 2;
      const wobble = 1 + 0.075 * Math.sin(a * 3 + seed * 0.7) + 0.045 * Math.sin(a * 7 - i * 0.9);
      const rr = r * wobble;
      pts.push(new THREE.Vector3(
        x + Math.cos(a) * rr * sx + leanX * f * f,
        y + Math.sin(a * 4 + seed) * height * 0.006,
        z + Math.sin(a) * rr * sz + leanZ * f * f
      ));
    }
    ringPts.push(pts);
    let hex = STRATA[i % STRATA.length];
    if (i % 11 === 5) hex = 0x6f2b20;
    ringColors.push(tint(hex, rand, 0.07));
  }

  const positions = [];
  const colors = [];
  const pushTri = (a, b, c, color) => {
    positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    colors.push(color.r, color.g, color.b, color.r, color.g, color.b, color.r, color.g, color.b);
  };

  for (let i = 0; i < rings; i++) {
    const lower = ringPts[i];
    const upper = ringPts[i + 1];
    const color = ringColors[i];
    for (let j = 0; j < seg; j++) {
      const k = (j + 1) % seg;
      pushTri(lower[j], lower[k], upper[k], color);
      pushTri(lower[j], upper[k], upper[j], color);
    }
  }

  if (flatTop) {
    const top = ringPts[rings];
    const center = new THREE.Vector3(x + leanX, baseY + height, z + leanZ);
    const topColor = tint(0x7a6a3f, rand, 0.06);
    for (let j = 0; j < seg; j++) {
      const k = (j + 1) % seg;
      pushTri(center, top[k], top[j], topColor);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return { geo, topY: baseY + height, baseY };
}

function addBox(bucket, w, h, d, x, y, z, ry, mat) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (ry) g.rotateY(ry);
  g.translate(x, y, z);
  addGeo(bucket, g, mat);
}

function addCyl(bucket, rt, rb, h, seg, x, y, z, mat) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  g.translate(x, y, z);
  addGeo(bucket, g, mat);
}

function segmentGeo(ax, ay, az, bx, by, bz, ra, rb, seg = 5) {
  const dx = bx - ax;
  const dy = by - ay;
  const dz = bz - az;
  const len = Math.hypot(dx, dy, dz) || 1;
  const geo = new THREE.CylinderGeometry(rb, ra, len, seg, 1, false);
  geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(dx / len, dy / len, dz / len)
  ));
  geo.translate((ax + bx) * 0.5, (ay + by) * 0.5, (az + bz) * 0.5);
  return geo;
}

function addBroadleaf(bucket, x, z, h, seed) {
  const rand = rand32(seed);
  const y = heightAt(x, z);
  const leanA = rand() * Math.PI * 2;
  const lean = 0.08 + rand() * 0.18;
  const tx = Math.cos(leanA) * lean * h;
  const tz = Math.sin(leanA) * lean * h;
  addGeo(bucket, segmentGeo(x, y - 0.5, z, x + tx * 0.35, y + h * 0.58, z + tz * 0.35, 0.36 + h * 0.018, 0.21, 6), trunkMat);
  addGeo(bucket, segmentGeo(x + tx * 0.35, y + h * 0.58, z + tz * 0.35, x + tx, y + h * 0.9, z + tz, 0.2, 0.09, 5), trunkMat);
  const branches = 4 + (rand() * 3 | 0);
  for (let i = 0; i < branches; i++) {
    const a = leanA + (i / branches) * Math.PI * 2 + rand() * 0.5;
    const reach = h * (0.18 + rand() * 0.2);
    const ey = y + h * (0.62 + rand() * 0.3);
    addGeo(bucket, segmentGeo(
      x + tx * 0.55, y + h * (0.55 + rand() * 0.2), z + tz * 0.55,
      x + tx * 0.8 + Math.cos(a) * reach, ey, z + tz * 0.8 + Math.sin(a) * reach,
      0.09, 0.035, 4
    ), trunkMat);
  }
  const clusters = 6 + (rand() * 4 | 0);
  for (let i = 0; i < clusters; i++) {
    const a = rand() * Math.PI * 2;
    const d = h * (0.08 + rand() * 0.24);
    const g = new THREE.IcosahedronGeometry(1, 1);
    g.scale(h * (0.16 + rand() * 0.1), h * (0.13 + rand() * 0.08), h * (0.16 + rand() * 0.1));
    g.rotateY(rand() * 6.2);
    g.translate(
      x + tx * (0.55 + rand() * 0.4) + Math.cos(a) * d,
      y + h * (0.72 + rand() * 0.24),
      z + tz * (0.55 + rand() * 0.4) + Math.sin(a) * d
    );
    addGeo(bucket, g, leafMats[(i + seed) % leafMats.length]);
  }
}

function addBamboo(bucket, x, z, h, seed) {
  const rand = rand32(seed);
  const y = heightAt(x, z);
  for (let i = 0; i < 3; i++) {
    const ox = (rand() - 0.5) * 3;
    const oz = (rand() - 0.5) * 3;
    const hh = h * (0.8 + rand() * 0.4);
    addGeo(bucket, segmentGeo(
      x + ox, y, z + oz,
      x + ox + (rand() - 0.5) * 1.4, y + hh, z + oz + (rand() - 0.5) * 1.4,
      0.09, 0.055, 4
    ), bambooMat);
    for (let k = 0; k < 4; k++) {
      const g = new THREE.PlaneGeometry(2.4 + rand() * 1.4, 0.55);
      g.rotateY(rand() * 6.2);
      g.rotateZ((rand() - 0.5) * 0.5);
      g.translate(x + ox + (rand() - 0.5) * 1.8, y + hh * (0.6 + rand() * 0.35), z + oz + (rand() - 0.5) * 1.8);
      addGeo(bucket, g, leafMats[2]);
    }
  }
}

function addPavilion(bucket, x, y, z, scale, rot, seed) {
  const rand = rand32(seed);
  addCyl(bucket, 4.4 * scale, 4.9 * scale, 0.45 * scale, 8, x, y + 0.2 * scale, z, stoneMat);
  const r = 2.7 * scale;
  for (const [dx, dz] of [[-r, -r], [r, -r], [r, r], [-r, r]]) {
    addCyl(bucket, 0.19 * scale, 0.22 * scale, 4.1 * scale, 6, x + dx, y + 2.35 * scale, z + dz, woodMat);
  }
  for (const side of [-1, 1]) {
    addBox(bucket, 5.7 * scale, 0.25 * scale, 0.24 * scale, x, y + 4.42 * scale, z + side * r, rot, woodMat);
    addBox(bucket, 0.24 * scale, 0.25 * scale, 5.7 * scale, x + side * r, y + 4.42 * scale, z, rot, woodMat);
  }
  const roof1 = new THREE.ConeGeometry(4.6 * scale, 1.7 * scale, 4, 2);
  roof1.rotateY(Math.PI * 0.25 + rot);
  roof1.translate(x, y + 5.45 * scale, z);
  addGeo(bucket, roof1, roofMat);
  const roof2 = new THREE.ConeGeometry(2.8 * scale, 1.35 * scale, 4, 2);
  roof2.rotateY(Math.PI * 0.25 + rot);
  roof2.translate(x, y + 6.4 * scale, z);
  addGeo(bucket, roof2, roofMat);
  addCyl(bucket, 0.11 * scale, 0.15 * scale, 1.4 * scale, 6, x, y + 7.1 * scale, z, goldMat);
  const finial = new THREE.IcosahedronGeometry(0.28 * scale, 0);
  finial.translate(x, y + 7.85 * scale, z);
  addGeo(bucket, finial, goldMat);
  for (const [dx, dz] of [[-r, -r], [r, -r], [r, r], [-r, r]]) {
    const eave = new THREE.CylinderGeometry(0.09 * scale, 0.13 * scale, 1.5 * scale, 4);
    eave.rotateZ(dx > 0 ? -0.75 : 0.75);
    eave.rotateX(dz > 0 ? 0.75 : -0.75);
    eave.translate(x + dx, y + 5.15 * scale, z + dz);
    addGeo(bucket, eave, roofMat);
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const px = x + Math.cos(a) * (r + 0.5 * scale);
    const pz = z + Math.sin(a) * (r + 0.5 * scale);
    addCyl(bucket, 0.055 * scale, 0.075 * scale, 1.1 * scale, 5, px, y + 0.78 * scale, pz, woodMat);
    if (i < 7) {
      const b = ((i + 1) / 8) * Math.PI * 2;
      addGeo(bucket, segmentGeo(
        px, y + 1.3 * scale, pz,
        x + Math.cos(b) * (r + 0.5 * scale), y + 1.3 * scale, z + Math.sin(b) * (r + 0.5 * scale),
        0.035 * scale, 0.035 * scale, 4
      ), railMat);
    }
  }
  if (rand() < 0.5) {
    const lamp = new THREE.IcosahedronGeometry(0.24 * scale, 0);
    lamp.translate(x, y + 4.1 * scale, z);
    addGeo(bucket, lamp, goldMat);
  }
}

function addWalkway(bucket, cx, cz, radius, y, a0, a1, count, seed) {
  const rand = rand32(seed);
  const pts = [];
  for (let i = 0; i <= count; i++) {
    const a = a0 + ((a1 - a0) * i) / count;
    pts.push({
      a,
      x: cx + Math.cos(a) * radius,
      z: cz + Math.sin(a) * radius,
      y: y + Math.sin(i * 0.55 + seed) * 0.18,
    });
  }
  for (let i = 0; i < count; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz);
    const tx = dx / len;
    const tz = dz / len;
    const yaw = Math.atan2(tx, tz);
    const mx = (a.x + b.x) * 0.5;
    const mz = (a.z + b.z) * 0.5;
    const my = (a.y + b.y) * 0.5;
    addBox(bucket, 1.9, 0.16, len + 0.28, mx, my, mz, yaw, plankMat);
    const bx = mx - Math.cos(a.a) * 0.95;
    const bz = mz - Math.sin(a.a) * 0.95;
    addBox(bucket, 0.18, 0.55, 0.18, bx, my - 0.32, bz, yaw, railMat);
    if (i % 2 === 0) {
      const px = a.x + Math.cos(a.a) * 0.95;
      const pz = a.z + Math.sin(a.a) * 0.95;
      addCyl(bucket, 0.065, 0.085, 1.25, 5, px, a.y + 0.52, pz, railMat);
      const qx = a.x - Math.cos(a.a) * 1.3;
      const qz = a.z - Math.sin(a.a) * 1.3;
      addBox(bucket, 0.16, 0.16, 1.55, (a.x + qx) * 0.5, a.y - 0.18, (a.z + qz) * 0.5, Math.atan2(tx, tz), railMat);
    }
    if (i % 2 === 0 && i < count - 1) {
      const c = pts[i + 2];
      const pax = a.x + Math.cos(a.a) * 0.95;
      const paz = a.z + Math.sin(a.a) * 0.95;
      const pbx = c.x + Math.cos(c.a) * 0.95;
      const pbz = c.z + Math.sin(c.a) * 0.95;
      addGeo(bucket, segmentGeo(pax, a.y + 1.14, paz, pbx, c.y + 1.14, pbz, 0.035, 0.035, 4), railMat);
    }
    if (i % 4 === 0) {
      const rock = new THREE.DodecahedronGeometry(0.55 + rand() * 0.35, 0);
      rock.translate(a.x - Math.cos(a.a) * 2.1, a.y - 0.55, a.z - Math.sin(a.a) * 2.1);
      addGeo(bucket, rock, boulderMat);
    }
  }
}

function birdGeometry() {
  const positions = [
    0, 0, 0.9, -0.16, 0, 0.1, 0.16, 0, 0.1,
    0, 0, 0.9, 0.16, 0, 0.1, 0, 0, -0.72,
    -0.16, 0, 0.1, -3.1, 0, 0.04, -0.3, 0, -0.42,
    0.16, 0, 0.1, 0.3, 0, -0.42, 3.1, 0, 0.04,
  ];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  return geo;
}

function createRaptorsLife() {
  const rand = rand32(9402);
  const count = 9;
  const phases = new Float32Array(count);
  for (let i = 0; i < count; i++) phases[i] = rand() * Math.PI * 2;
  const geo = birdGeometry();
  geo.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phases, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(0x2c211c) } },
    side: THREE.DoubleSide,
    vertexShader: `
      attribute float aPhase;
      uniform float uTime;
      void main() {
        vec3 p = position;
        float flap = sin(uTime * 3.6 + aPhase);
        p.y += abs(p.x) * flap * 0.55;
        vec4 m = vec4(p, 1.0);
        #ifdef USE_INSTANCING
          m = instanceMatrix * m;
        #endif
        gl_Position = projectionMatrix * modelViewMatrix * m;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      void main() {
        gl_FragColor = vec4(uColor, 1.0);
      }
    `,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  mesh.frustumCulled = false;
  const data = [];
  for (let i = 0; i < count; i++) {
    data.push({
      cx: -70 + (i % 3) * 210,
      cz: -70 - (i % 4) * 120,
      r: 90 + (i % 4) * 38,
      y: 168 + (i % 4) * 22,
      speed: 0.035 + (i % 3) * 0.009,
      phase: i * 1.31,
      size: 1.1 + (i % 3) * 0.28,
    });
  }
  return { mesh, data, mat, group: mesh };
}

function createCloudLife(root) {
  const rand = rand32(7701);
  const mat = new THREE.SpriteMaterial({
    map: sharedTextures.cloudMap,
    color: 0xffedd8,
    transparent: true,
    opacity: 0.34,
    depthWrite: false,
    fog: true,
    toneMapped: true,
  });
  const sprites = [];
  const defs = [
    [-520, 124, -170, 640, 180], [370, 142, -300, 720, 210],
    [-110, 96, 250, 560, 150], [610, 168, 90, 660, 190],
    [-380, 180, -520, 760, 220], [120, 210, -640, 820, 240],
    [260, 112, 380, 600, 170], [-650, 150, 320, 620, 180],
  ];
  defs.forEach((d, i) => {
    const spr = new THREE.Sprite(mat.clone());
    spr.material.color.setHex(i % 2 ? 0xffe4c6 : 0xf8eee2);
    spr.material.opacity = 0.28 + rand() * 0.14;
    spr.position.set(d[0], d[1], d[2]);
    spr.userData.baseY = d[1];
    spr.scale.set(d[3], d[4], 1);
    spr.renderOrder = 2;
    spr.userData.baseX = d[0];
    spr.userData.drift = 16 + rand() * 24;
    spr.userData.phase = rand() * 6.28;
    root.add(spr);
    sprites.push(spr);
  });
  return { sprites };
}

function makeLabel(title, subtitle, x, y, z, scale = 1) {
  const tex = makeLabelTexture(title, subtitle);
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: true,
    depthWrite: false,
    opacity: 0.9,
    toneMapped: true,
  });
  const spr = new THREE.Sprite(mat);
  spr.scale.set(32 * scale, 10 * scale, 1);
  spr.position.set(x, y, z);
  spr.renderOrder = 5;
  return spr;
}

function createRiverWater() {
  const pts = riverCurve.getSpacedPoints(150);
  const half = 30;
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    let tx = b.x - a.x;
    let tz = b.z - a.z;
    const len = Math.hypot(tx, tz) || 1;
    tx /= len;
    tz /= len;
    const nx = -tz;
    const nz = tx;
    const p = pts[i];
    const y = RIVER_BED_Y + 1.38;
    for (const side of [-1, 1]) {
      positions.push(p.x + nx * half * side, y, p.z + nz * half * side);
      uvs.push(side < 0 ? 0 : 1, i / (pts.length - 1));
    }
    if (i < pts.length - 1) {
      const k = i * 2;
      indices.push(k, k + 1, k + 3, k, k + 3, k + 2);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uDeep: { value: new THREE.Color(0x276c6d) },
      uShallow: { value: new THREE.Color(0x58a192) },
      uSun: { value: new THREE.Color(0xffd2a1) },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vWorld;
      void main() {
        vUv = uv;
        vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uDeep;
      uniform vec3 uShallow;
      uniform vec3 uSun;
      varying vec2 vUv;
      varying vec3 vWorld;
      void main() {
        vec2 p = vWorld.xz * 0.055;
        float w1 = sin(p.x * 1.5 + p.y * 0.8 + uTime * 0.7) * 0.5 + 0.5;
        float w2 = sin(p.y * 2.2 - p.x * 0.9 + uTime * 0.43) * 0.5 + 0.5;
        float w3 = sin((p.x + p.y) * 4.1 - uTime * 1.1) * 0.5 + 0.5;
        vec3 col = mix(uDeep, uShallow, w1 * 0.42 + w2 * 0.34);
        float glint = pow(w3, 9.0) * 0.28;
        col += uSun * glint;
        float edge = smoothstep(0.0, 0.09, vUv.x) * smoothstep(1.0, 0.91, vUv.x);
        float alpha = (0.74 + 0.14 * w2) * (0.35 + 0.65 * edge);
        gl_FragColor = vec4(col, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'jinjiang-water';
  mesh.renderOrder = 1;
  return { mesh, mat };
}

function addTalus(bucket, spec, seed) {
  const rand = rand32(seed);
  const count = Math.max(10, Math.round((spec.rBottom + spec.rTop) * 0.18));
  for (let i = 0; i < count; i++) {
    const a = rand() * Math.PI * 2;
    const d = spec.rBottom * (1.02 + rand() * 0.32) * (spec.sx || 1);
    const x = spec.x + Math.cos(a) * d;
    const z = spec.z + Math.sin(a) * d * (spec.sz || 1);
    const y = heightAt(x, z);
    const size = 0.8 + rand() * 2.6;
    const g = new THREE.DodecahedronGeometry(size, 0);
    const p = g.attributes.position;
    for (let v = 0; v < p.count; v++) {
      p.setXYZ(v, p.getX(v) * (0.72 + rand() * 0.55), p.getY(v) * (0.5 + rand() * 0.4), p.getZ(v) * (0.76 + rand() * 0.5));
    }
    g.computeVertexNormals();
    g.rotateY(rand() * 6.2);
    g.translate(x, y + size * 0.28, z);
    addGeo(bucket, g, rand() < 0.55 ? boulderMat : boulderLightMat);
  }
  for (let i = 0; i < Math.round(count * 0.45); i++) {
    const a = rand() * Math.PI * 2;
    const d = spec.rBottom * (1.1 + rand() * 0.7) * (spec.sx || 1);
    const x = spec.x + Math.cos(a) * d;
    const z = spec.z + Math.sin(a) * d * (spec.sz || 1);
    if (riverAt(x, z).d < 48) continue;
    if (heightAt(x, z) < 9) continue;
    addBroadleaf(bucket, x, z, 7 + rand() * 7, seed + i * 13);
  }
}

export function createDanxia() {
  const root = new THREE.Group();
  root.name = 'danxia-signature-overlay';
  const bucket = new Map();
  const rand = rand32(6501);

  const changlaoSpec = {
    x: -166, z: -246, height: 100, rBottom: 59, rTop: 40,
    seed: 11, sink: 14, lean: 0.015, seg: 18,
  };
  const changlao = layeredRock(changlaoSpec);
  addGeo(bucket, changlao.geo, strataMat);
  addTalus(bucket, changlaoSpec, 1201);

  const pillarSpec = {
    x: 118, z: 48, height: 96, rBottom: 10.5, rTop: 5.4,
    seed: 21, sink: 9, lean: 0.06, seg: 14,
  };
  const pillar = layeredRock(pillarSpec);
  addGeo(bucket, pillar.geo, strataMat);
  const knob = new THREE.IcosahedronGeometry(6.6, 1);
  knob.scale(1.05, 1.35, 1.05);
  knob.translate(pillarSpec.x + 2, pillar.topY + 4.1, pillarSpec.z - 1);
  addGeo(bucket, knob, boulderLightMat);
  addTalus(bucket, pillarSpec, 2201);

  const wallSpecs = [
    { x: -430, z: -330, height: 78, rBottom: 86, rTop: 61, seed: 31, sx: 2.1, sz: 0.52, sink: 18, seg: 20 },
    { x: 322, z: -458, height: 90, rBottom: 94, rTop: 66, seed: 41, sx: 1.65, sz: 0.5, sink: 20, seg: 20 },
    { x: 368, z: -158, height: 66, rBottom: 50, rTop: 30, seed: 51, sx: 1.3, sz: 0.72, sink: 12, seg: 16 },
    { x: -338, z: 88, height: 56, rBottom: 41, rTop: 23, seed: 61, sink: 10, seg: 14 },
    { x: 468, z: 16, height: 62, rBottom: 47, rTop: 25, seed: 71, sink: 11, seg: 14 },
    { x: -64, z: -404, height: 60, rBottom: 45, rTop: 27, seed: 81, sx: 1.2, sz: 0.8, sink: 12, seg: 16 },
    { x: 236, z: -342, height: 54, rBottom: 38, rTop: 21, seed: 91, sink: 11, seg: 14 },
    { x: 28, z: -152, height: 44, rBottom: 31, rTop: 17, seed: 101, sink: 9, seg: 14 },
  ];
  const wallTops = [];
  wallSpecs.forEach((spec, i) => {
    const res = layeredRock(spec);
    addGeo(bucket, res.geo, strataMat);
    addTalus(bucket, spec, 3001 + i * 31);
    wallTops.push(res);
  });

  for (let i = 0; i < 150; i++) {
    const x = (rand() - 0.5) * 1560;
    const z = (rand() - 0.48) * 1260 - 90;
    if (riverAt(x, z).d < 54) continue;
    if (Math.sqrt(trailDistanceSq(x, z)) < 10) continue;
    const y = heightAt(x, z);
    if (y < 10 || y > 214) continue;
    if (slopeAt(x, z) > 2.35) continue;
    addBroadleaf(bucket, x, z, 8 + rand() * 8, 5001 + i * 17);
  }

  for (let i = 0; i < 70; i++) {
    const t = rand();
    const p = riverCurve.getPointAt(t);
    const tan = riverCurve.getTangentAt(t);
    const side = rand() < 0.5 ? -1 : 1;
    const d = 52 + rand() * 62;
    const x = p.x + tan.z * d * side;
    const z = p.z - tan.x * d * side;
    const y = heightAt(x, z);
    if (y < 10 || y > 72) continue;
    addBamboo(bucket, x, z, 7 + rand() * 6, 8001 + i * 23);
  }

  addWalkway(
    bucket, changlaoSpec.x, changlaoSpec.z,
    changlaoSpec.rBottom * 0.79,
    changlao.baseY + changlaoSpec.height * 0.55,
    0.32, 1.58, 18, 8801
  );
  addWalkway(
    bucket, pillarSpec.x, pillarSpec.z, 16.5,
    pillar.baseY + pillarSpec.height * 0.58,
    2.0, 3.55, 9, 8811
  );

  addPavilion(bucket, changlaoSpec.x + 5, changlao.topY + 0.35, changlaoSpec.z + 2, 1.22, 0.12, 9901);
  addPavilion(bucket, wallSpecs[0].x + 8, wallTops[0].topY + 0.35, wallSpecs[0].z + 2, 0.82, 0.4, 9902);

  let riverPavilion = null;
  for (const t of [0.5, 0.56, 0.62, 0.44, 0.68]) {
    const p = riverCurve.getPointAt(t);
    const tan = riverCurve.getTangentAt(t);
    for (const side of [1, -1]) {
      const x = p.x + tan.z * 62 * side;
      const z = p.z - tan.x * 62 * side;
      const y = heightAt(x, z);
      if (y > RIVER_BED_Y + 4 && riverAt(x, z).d > 49) {
        riverPavilion = { x, y, z };
        break;
      }
    }
    if (riverPavilion) break;
  }
  if (!riverPavilion) {
    const p = riverCurve.getPointAt(0.55);
    riverPavilion = { x: p.x + 70, y: heightAt(p.x + 70, p.z + 12), z: p.z + 12 };
  }
  addPavilion(bucket, riverPavilion.x, riverPavilion.y + 0.1, riverPavilion.z, 0.9, -0.35, 9903);

  const staticGroup = new THREE.Group();
  staticGroup.name = 'danxia-opaque-static';
  for (const [mat, list] of bucket) {
    const geo = mergeGeometryList(list);
    if (!geo) continue;
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = !mat.userData.noShadow;
    mesh.receiveShadow = true;
    staticGroup.add(mesh);
  }
  const mergedStatic = mergeStaticGroup(staticGroup);
  mergedStatic.name = 'merged-danxia-overlay-static';
  root.add(mergedStatic);

  const water = createRiverWater();
  root.add(water.mesh);

  const labels = [
    makeLabel('阳元石', 'YANGYUAN PILLAR', pillarSpec.x, pillar.topY + 18, pillarSpec.z, 0.92),
    makeLabel('长老峰', 'CHANGLAO PEAK', changlaoSpec.x, changlao.topY + 30, changlaoSpec.z, 1),
    makeLabel('锦江曲流', 'JINJIANG RIVER BEND', 30, 42, 292, 1.05),
    makeLabel('赤壁栈道', 'CLIFF PLANK WALKWAY', changlaoSpec.x + 36, changlao.baseY + changlaoSpec.height * 0.55 + 7, changlaoSpec.z - 8, 0.82),
  ];
  labels.forEach((label) => root.add(label));

  const raptors = createRaptorsLife();
  root.add(raptors.mesh);
  const clouds = createCloudLife(root);

  const pillarBase = heightAt(pillarSpec.x, pillarSpec.z);
  const changlaoBase = heightAt(changlaoSpec.x, changlaoSpec.z);
  const views = {
    overview: { p: [430, 280, 700], t: [-20, 70, -150] },
    yangyuan: { p: [204, pillarBase + 78, 168], t: [118, pillarBase + 62, 48] },
    changlao: { p: [-6, changlaoBase + 154, -42], t: [-170, changlaoBase + 112, -252] },
    jinjiang: { p: [330, 96, 506], t: [24, 26, 296] },
    dusk: { p: [596, 190, 526], t: [-36, 132, -218] },
  };
  const notes = {
    overview: ['丹霞山 · 赤壁丹崖', '红色砂砾岩层层叠起，锦江在群峰之间折出一道碧湾，晨光把崖壁染成赤金'],
    yangyuan: ['阳元石', '一柱孤峰自谷底拔起，风化刻出浑圆的峰头，与满山横纹赤壁相互映照'],
    changlao: ['长老峰', '丹霞山主峰之一，崖顶平台可俯瞰锦江曲流与远处层叠的红色山块'],
    jinjiang: ['锦江曲流', '江水绕过赤壁山根，竹影与湿雾浮在河面，舟行其间如入丹青长卷'],
    dusk: ['暮色丹崖', '夕阳低垂，赤壁由赭红转为暗紫，河谷升起薄雾，归鸟掠过峰顶'],
  };

  const dummy = new THREE.Object3D();
  function update(elapsed) {
    water.mat.uniforms.uTime.value = elapsed;
    raptors.mat.uniforms.uTime.value = elapsed;
    raptors.data.forEach((b, i) => {
      const t = elapsed * b.speed + b.phase;
      const x = b.cx + Math.cos(t) * b.r;
      const z = b.cz + Math.sin(t) * b.r * 0.72;
      const y = b.y + Math.sin(elapsed * 0.42 + b.phase) * 4.5;
      const dx = -Math.sin(t) * b.r;
      const dz = Math.cos(t) * b.r * 0.72;
      dummy.position.set(x, y, z);
      dummy.rotation.set(Math.sin(elapsed * 1.7 + i) * 0.18, Math.atan2(dx, dz), Math.sin(elapsed * 1.3 + i) * 0.15);
      dummy.scale.setScalar(b.size);
      dummy.updateMatrix();
      raptors.mesh.setMatrixAt(i, dummy.matrix);
    });
    raptors.mesh.instanceMatrix.needsUpdate = true;
    clouds.sprites.forEach((s, i) => {
      s.position.x = s.userData.baseX + Math.sin(elapsed * 0.018 + s.userData.phase) * s.userData.drift;
      s.position.y = s.userData.baseY + Math.sin(elapsed * 0.12 + i) * 2.2;
    });
  }
  update(0);

  return {
    group: root,
    views,
    notes,
    labels,
    water,
    raptors,
    clouds,
    mergedStatic,
    update,
  };
}
