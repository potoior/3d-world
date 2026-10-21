import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mergeStaticGroup } from './geometry.js';
import { makeLabelTexture, makeRoofTexture, makeCloudTexture, makeMistTexture, makeGlowTexture } from './textures.js';
import { makePlaqueMaterial } from './materials.js';
import { heightAt, trailSamples, trailDistanceSq, platforms } from './terrain.js';

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

function colorGeo(geo, hex) {
  const c = new THREE.Color(hex);
  const p = geo.attributes.position;
  const colors = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo;
}

function segGeo(ax, ay, az, bx, by, bz, ra, rb, seg = 5) {
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

function frameAt(t) {
  const n = trailSamples.length;
  const f = Math.max(0, Math.min(1, t)) * (n - 1);
  const i = Math.floor(f);
  const s = trailSamples[Math.min(n - 1, i)];
  const a = trailSamples[Math.max(0, i - 1)];
  const b = trailSamples[Math.min(n - 1, i + 1)];
  let tx = b.x - a.x;
  let tz = b.z - a.z;
  const len = Math.hypot(tx, tz) || 1;
  tx /= len;
  tz /= len;
  return {
    x: s.x, y: s.y, z: s.z, width: s.width || 2.5,
    tx, tz, nx: -tz, nz: tx, yaw: Math.atan2(tx, tz),
  };
}

function groundSpan(x, z, radius) {
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const h = heightAt(x + Math.cos(a) * radius, z + Math.sin(a) * radius);
    if (h < min) min = h;
    if (h > max) max = h;
  }
  const center = heightAt(x, z);
  if (center > max) max = center;
  if (center < min) min = center;
  return { top: max + 0.2, sink: Math.min(8, max - min + 1.1) };
}

const roofMap = makeRoofTexture();
roofMap.wrapS = roofMap.wrapT = THREE.RepeatWrapping;
roofMap.repeat.set(3.4, 2.4);
roofMap.needsUpdate = true;

const M = {
  stoneWarm: new THREE.MeshStandardMaterial({ color: 0xa58a72, roughness: 1, flatShading: true }),
  stoneRed: new THREE.MeshStandardMaterial({ color: 0x925743, roughness: 1, flatShading: true }),
  stonePale: new THREE.MeshStandardMaterial({ color: 0xb7a48d, roughness: 1, flatShading: true }),
  redWall: new THREE.MeshStandardMaterial({ color: 0x9a4433, roughness: 0.92 }),
  ochreWall: new THREE.MeshStandardMaterial({ color: 0xc7a262, roughness: 0.94 }),
  roof: new THREE.MeshStandardMaterial({ map: roofMap, color: 0x7d8a80, roughness: 0.88, side: THREE.DoubleSide }),
  roofDark: new THREE.MeshStandardMaterial({ color: 0x38433f, roughness: 0.9, side: THREE.DoubleSide }),
  column: new THREE.MeshStandardMaterial({ color: 0x7c2f26, roughness: 0.88 }),
  wood: new THREE.MeshStandardMaterial({ color: 0x4c3728, roughness: 0.96 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x242320, roughness: 0.95 }),
  gold: new THREE.MeshStandardMaterial({ color: 0xc59a4c, roughness: 0.42, metalness: 0.55 }),
  bronze: new THREE.MeshStandardMaterial({ color: 0x6c5c3f, roughness: 0.5, metalness: 0.45 }),
  lantern: new THREE.MeshStandardMaterial({ color: 0x8c2418, emissive: 0xff5a1e, emissiveIntensity: 0.65, roughness: 0.68 }),
  glow: new THREE.MeshStandardMaterial({ color: 0x4a341f, emissive: 0xffb15c, emissiveIntensity: 1.15, roughness: 0.6 }),
  water: new THREE.MeshStandardMaterial({ color: 0x4d7468, roughness: 0.18, metalness: 0.18 }),
  white: new THREE.MeshStandardMaterial({ color: 0xd9d2c2, roughness: 0.9 }),
};

function stage(name) {
  window.__hsStage = name;
  document.title = 'HS ' + name;
}

function addBox(parent, material, w, h, d, x, y, z, ry = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.rotation.y = ry;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addCyl(parent, material, rt, rb, h, seg, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addSphere(parent, material, r, x, y, z, sx = 1, sy = 1, sz = 1) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 7), material);
  mesh.position.set(x, y, z);
  mesh.scale.set(sx, sy, sz);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

function addPlaque(parent, title, subtitle, w, h, x, y, z, ry = 0) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), makePlaqueMaterial(title, subtitle));
  mesh.position.set(x, y, z);
  mesh.rotation.y = ry;
  mesh.castShadow = false;
  parent.add(mesh);
  return mesh;
}

function pushTri(pos, uv, a, b, c) {
  pos.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
  uv.push(a[0] * 0.09, a[2] * 0.09, b[0] * 0.09, b[2] * 0.09, c[0] * 0.09, c[2] * 0.09);
}

function roofGeometry(w, d, h, overhang = 1.6, lift = 1.15, seg = 7) {
  const hw = w * 0.5 + overhang;
  const hd = d * 0.5 + overhang;
  const rw = Math.max(0.6, w * 0.13);
  const front = [];
  const back = [];
  const left = [];
  const right = [];
  const ease = (t) => lift * Math.pow(Math.abs(t * 2 - 1), 2.6);
  for (let i = 0; i <= seg; i++) {
    const t = i / seg;
    front.push([-hw + 2 * hw * t, ease(t), hd]);
    back.push([-hw + 2 * hw * t, ease(t), -hd]);
    left.push([-hw, ease(t), -hd + 2 * hd * t]);
    right.push([hw, ease(t), -hd + 2 * hd * t]);
  }
  const ridge = (t) => [-rw + 2 * rw * t, h + 0.32, 0];
  const pos = [];
  const uv = [];
  for (let i = 0; i < seg; i++) {
    const r0 = ridge(i / seg);
    const r1 = ridge((i + 1) / seg);
    pushTri(pos, uv, front[i], front[i + 1], r1);
    pushTri(pos, uv, front[i], r1, r0);
    pushTri(pos, uv, back[i + 1], back[i], r0);
    pushTri(pos, uv, back[i + 1], r0, r1);
    pushTri(pos, uv, left[i], ridge(0), left[i + 1]);
    pushTri(pos, uv, right[i + 1], ridge(1), right[i]);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.computeVertexNormals();
  return geo;
}

function addRoof(parent, w, d, h, y, overhang = 1.8, lift = 1.15, material = M.roof) {
  const roof = new THREE.Mesh(roofGeometry(w, d, h, overhang, lift), material);
  roof.position.y = y;
  roof.castShadow = true;
  roof.receiveShadow = true;
  parent.add(roof);
  addBox(parent, M.dark, w + overhang * 2, 0.28, d + overhang * 2, 0, y + 0.02, 0);
  addBox(parent, M.dark, w * 0.27, 0.46, 0.62, 0, y + h + 0.32, 0);
  addBox(parent, M.gold, 0.34, 0.72, 0.34, 0, y + h + 0.62, 0);
  addBox(parent, M.gold, 0.9, 0.22, 0.22, -w * 0.14, y + h + 0.42, 0);
  addBox(parent, M.gold, 0.9, 0.22, 0.22, w * 0.14, y + h + 0.42, 0);
  return roof;
}
function addHall(parent, cfg) {
  const {
    x = 0, y = 0, z = 0, yaw = 0, w = 10, d = 7, h = 4.8,
    twoTier = false, wall = M.ochreWall, name = '', sub = '',
    lanterns = true, plaque = true,
  } = cfg;
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = yaw;
  parent.add(g);

  addBox(g, M.stoneWarm, w + 4.2, 1.5, d + 4.2, 0, -0.75, 0);
  addBox(g, M.stonePale, w + 4.8, 0.24, d + 4.8, 0, 0.02, 0);
  for (let i = 0; i < 4; i++) {
    addBox(g, M.stonePale, w * 0.58, 0.24, 0.72, 0, -0.12 - i * 0.02, d * 0.5 + 2.1 + i * 0.6);
  }

  addBox(g, wall, w, h, 0.5, 0, h * 0.5, -d * 0.5);
  addBox(g, wall, 0.5, h, d, -w * 0.5, h * 0.5, 0);
  addBox(g, wall, 0.5, h, d, w * 0.5, h * 0.5, 0);
  addBox(g, wall, w * 0.3, h * 0.72, 0.36, -w * 0.33, h * 0.36, d * 0.5);
  addBox(g, wall, w * 0.3, h * 0.72, 0.36, w * 0.33, h * 0.36, d * 0.5);
  addBox(g, M.dark, w * 0.34, h * 0.8, 0.22, 0, h * 0.4, d * 0.5 + 0.03);
  addBox(g, M.column, w * 0.34, 0.16, 0.28, 0, h * 0.8, d * 0.5 + 0.06);

  for (const sx of [-0.42, -0.21, 0, 0.21, 0.42]) {
    addCyl(g, M.column, 0.2, 0.24, h + 0.3, 7, sx * w, (h + 0.3) * 0.5, d * 0.5 + 0.38);
  }
  for (const sx of [-0.42, 0.42]) {
    addCyl(g, M.column, 0.2, 0.24, h + 0.3, 7, sx * w, (h + 0.3) * 0.5, -d * 0.5 + 0.1);
  }
  for (const [ox, oz] of [[-w * 0.42, d * 0.36], [w * 0.42, d * 0.36], [-w * 0.42, -d * 0.34], [w * 0.42, -d * 0.34]]) {
    addBox(g, M.dark, 0.7, 1.0, 0.16, ox, h * 0.56, oz);
    addBox(g, M.glow, 0.48, 0.7, 0.09, ox, h * 0.56, oz + (oz > 0 ? 0.1 : -0.1));
  }

  addBox(g, M.dark, w + 0.6, 0.34, d + 0.6, 0, h + 0.14, 0);
  addRoof(g, w, d, twoTier ? 2.35 : 2.65, h + 0.28, 1.9, 1.2, M.roof);

  if (twoTier) {
    addBox(g, wall, w * 0.58, 1.7, d * 0.55, 0, h + 2.85, 0);
    addBox(g, M.dark, w * 0.63, 0.22, d * 0.6, 0, h + 3.72, 0);
    addRoof(g, w * 0.56, d * 0.52, 1.85, h + 3.78, 1.4, 0.95, M.roofDark);
  }

  if (name && plaque) {
    addPlaque(g, name, sub, 2.9, 0.92, 0, h * 0.78, d * 0.5 + 0.48);
  }

  if (lanterns) {
    for (const sx of [-0.44, 0.44]) {
      addSphere(g, M.lantern, 0.24, sx * w, h * 0.66, d * 0.5 + 0.72, 1, 1.25, 1);
      addBox(g, M.gold, 0.24, 0.08, 0.24, sx * w, h * 0.66 + 0.32, d * 0.5 + 0.72);
      addBox(g, M.wood, 0.045, 0.7, 0.045, sx * w, h * 0.66 + 0.66, d * 0.5 + 0.72);
    }
  }
  return g;
}

function addWallRun(parent, x0, z0, x1, z1, h = 2.2, material = M.redWall) {
  const dx = x1 - x0;
  const dz = z1 - z0;
  const len = Math.hypot(dx, dz);
  const cx = (x0 + x1) * 0.5;
  const cz = (z0 + z1) * 0.5;
  const ry = Math.atan2(dx, dz);
  addBox(parent, material, 0.48, h, len, cx, h * 0.5, cz, ry);
  addBox(parent, M.roofDark, 0.82, 0.22, len + 0.2, cx, h + 0.08, cz, ry);
}

function addBrazier(parent, x, y, z, scale = 1) {
  addCyl(parent, M.bronze, 0.85 * scale, 1.05 * scale, 0.5 * scale, 12, x, y + 0.75 * scale, z);
  addBox(parent, M.bronze, 0.28 * scale, 0.9 * scale, 0.28 * scale, x - 0.45 * scale, y + 0.45 * scale, z);
  addBox(parent, M.bronze, 0.28 * scale, 0.9 * scale, 0.28 * scale, x + 0.45 * scale, y + 0.45 * scale, z);
  addCyl(parent, M.bronze, 0.08 * scale, 0.1 * scale, 1.3 * scale, 6, x, y + 1.55 * scale, z);
  addSphere(parent, M.gold, 0.16 * scale, x, y + 1.55 * scale, z + 0.16 * scale);
}

function addFlagRun(store, ax, ay, az, bx, by, bz, count, palette) {
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    store.push({
      x: ax + (bx - ax) * t,
      y: ay + (by - ay) * t - Math.sin(t * Math.PI) * 0.4,
      z: az + (bz - az) * t,
      yaw: Math.atan2(bx - ax, bz - az) + Math.PI * 0.5,
      phase: i * 0.47 + store.length * 0.13,
      color: palette[i % palette.length],
    });
  }
}

function localPoint(x, z, yaw, lx, lz) {
  return [
    x + Math.cos(yaw) * lx + Math.sin(yaw) * lz,
    z - Math.sin(yaw) * lx + Math.cos(yaw) * lz,
  ];
}

function pineGeometry(seed, tall) {
  const rand = mulberry32(seed);
  const trunk = [];
  const foliage = [];
  const height = tall ? 11 : 8.5;
  const lean = (rand() - 0.5) * 0.5;
  const tx = lean * height;
  const tz = (rand() - 0.5) * 0.5 * height;
  trunk.push(colorGeo(segGeo(0, -0.5, 0, tx * 0.24, height * 0.36, tz * 0.24, 0.36, 0.28, 6), '#5b4736'));
  trunk.push(colorGeo(segGeo(tx * 0.24, height * 0.36, tz * 0.24, tx * 0.62, height * 0.68, tz * 0.62, 0.28, 0.19, 6), '#544235'));
  trunk.push(colorGeo(segGeo(tx * 0.62, height * 0.68, tz * 0.62, tx, height, tz, 0.19, 0.09, 5), '#4b3a2f'));
  for (let i = 0; i < 4; i++) {
    const k = 0.45 + i * 0.16;
    const bx = tx * k + (rand() - 0.5) * 4.5;
    const bz = tz * k + (rand() - 0.5) * 4.5;
    const by = height * (0.5 + i * 0.12);
    trunk.push(colorGeo(segGeo(tx * k, height * (0.44 + i * 0.12), tz * k, bx, by, bz, 0.12, 0.05, 4), '#5b4736'));
    const r = (tall ? 2.8 : 2.4) * (1.1 - i * 0.13) * (0.9 + rand() * 0.3);
    const blob = new THREE.IcosahedronGeometry(r, 1);
    blob.scale(1.25, 0.46, 1.05);
    blob.rotateY(rand() * 6.2);
    blob.translate(bx, by + r * 0.14, bz);
    foliage.push(colorGeo(blob, ['#2b4b36', '#34573b', '#3d6341', '#476d45'][i % 4]));
    if (rand() < 0.7) {
      const small = new THREE.IcosahedronGeometry(r * 0.62, 1);
      small.scale(1.1, 0.5, 1);
      small.translate(bx + (rand() - 0.5) * 2.4, by - 0.35, bz + (rand() - 0.5) * 2.4);
      foliage.push(colorGeo(small, '#315239'));
    }
  }
  const cap = new THREE.IcosahedronGeometry(tall ? 2.3 : 2.0, 1);
  cap.scale(1.2, 0.42, 1.05);
  cap.translate(tx, height * 0.97, tz);
  foliage.push(colorGeo(cap, '#3a6141'));
  const prepared = [...trunk, ...foliage].map((g) => (g.index ? g.toNonIndexed() : g));
  const merged = mergeGeometries(prepared, false);
  prepared.forEach((g) => g.dispose());
  return merged;
}

function rockGeometry(seed) {
  const rand = mulberry32(seed);
  const geo = new THREE.DodecahedronGeometry(1, 0);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    p.setXYZ(i, p.getX(i) * (0.7 + rand() * 0.65), p.getY(i) * (0.5 + rand() * 0.55), p.getZ(i) * (0.75 + rand() * 0.6));
  }
  geo.computeVertexNormals();
  return colorGeo(geo, '#9c6b57');
}
function personGeometry(seed) {
  const rand = mulberry32(seed);
  const parts = [];
  const robe = ['#8f3b2d', '#3c566f', '#4d6440', '#7a5b3e', '#8b4f62'][seed % 5];
  const skin = '#c79a78';
  const trousers = '#2f3232';
  parts.push(colorGeo(segGeo(-0.11, 0.06, 0, -0.09, 0.62, 0.02, 0.075, 0.07, 4), trousers));
  parts.push(colorGeo(segGeo(0.11, 0.06, 0, 0.1, 0.62, -0.01, 0.075, 0.07, 4), trousers));
  const body = new THREE.CylinderGeometry(0.19, 0.23, 0.62, 8);
  body.translate(0, 0.92, 0);
  parts.push(colorGeo(body, robe));
  const pack = new THREE.BoxGeometry(0.34, 0.36, 0.16);
  pack.translate(0, 0.94, -0.22);
  parts.push(colorGeo(pack, '#5d4a34'));
  parts.push(colorGeo(segGeo(-0.2, 1.02, 0, -0.29, 0.72, 0.04, 0.045, 0.04, 4), robe));
  parts.push(colorGeo(segGeo(0.2, 1.02, 0, 0.27, 0.8, 0.08, 0.045, 0.04, 4), robe));
  const head = new THREE.SphereGeometry(0.145, 8, 6);
  head.translate(0, 1.32, 0);
  parts.push(colorGeo(head, skin));
  const hat = new THREE.CylinderGeometry(0.2, 0.22, 0.07, 9);
  hat.translate(0, 1.45, 0);
  parts.push(colorGeo(hat, '#b9a37a'));
  const stick = new THREE.CylinderGeometry(0.018, 0.022, 0.95, 4);
  stick.rotateZ(0.12);
  stick.translate(0.32, 0.75 + rand() * 0.05, 0.12);
  parts.push(colorGeo(stick, '#6f4b2d'));
  const prepared = parts.map((g) => (g.index ? g.toNonIndexed() : g));
  const merged = mergeGeometries(prepared, false);
  prepared.forEach((g) => g.dispose());
  return merged;
}

function createPines() {
  const rand = mulberry32(4471);
  const clusters = [
    { x: 122, z: 54, r: 42, n: 30 },
    { x: 198, z: 344, r: 34, n: 24 },
    { x: -150, z: -226, r: 44, n: 20 },
    { x: 70, z: -20, r: 58, n: 22 },
    { x: -30, z: -100, r: 54, n: 18 },
    { x: -250, z: -70, r: 42, n: 14 },
  ];
  const data = [];
  for (const c of clusters) {
    for (let i = 0; i < c.n; i++) {
      let x = c.x + (rand() - 0.5) * c.r * 2;
      let z = c.z + (rand() - 0.5) * c.r * 2;
      if (Math.hypot(x - c.x, z - c.z) > c.r) continue;
      if (trailDistanceSq(x, z) < 30) continue;
      const y = heightAt(x, z);
      if (y < 8 || y > 226) continue;
      data.push({ x, y, z, s: 0.78 + rand() * 0.55, yaw: rand() * 6.28, v: i % 2 });
    }
  }
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96, metalness: 0 });
  const geoA = pineGeometry(1201, true);
  const geoB = pineGeometry(2202, false);
  const buckets = [[], []];
  for (const d of data) buckets[d.v].push(d);
  const dummy = new THREE.Object3D();
  buckets.forEach((list, idx) => {
    if (!list.length) return;
    const mesh = new THREE.InstancedMesh(idx ? geoB : geoA, material, list.length);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    list.forEach((d, i) => {
      dummy.position.set(d.x, d.y, d.z);
      dummy.rotation.set(0, d.yaw, 0);
      dummy.scale.setScalar(d.s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    group.add(mesh);
  });
  return { group, count: data.length };
}

function createRocks() {
  const rand = mulberry32(9021);
  const spots = [
    { x: 122, z: 54, r: 24, n: 26 },
    { x: 198, z: 344, r: 20, n: 20 },
    { x: -150, z: -226, r: 24, n: 22 },
    { x: 0, z: -60, r: 70, n: 24 },
  ];
  const geo = rockGeometry(771);
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true });
  const list = [];
  for (const s of spots) {
    for (let i = 0; i < s.n; i++) {
      const x = s.x + (rand() - 0.5) * s.r * 2;
      const z = s.z + (rand() - 0.5) * s.r * 2;
      if (Math.hypot(x - s.x, z - s.z) > s.r) continue;
      if (trailDistanceSq(x, z) < 10) continue;
      const y = heightAt(x, z);
      if (y < 6) continue;
      list.push({ x, y: y + 0.1, z, s: 0.7 + rand() * 2.6, yaw: rand() * 6.28 });
    }
  }
  const mesh = new THREE.InstancedMesh(geo, material, list.length);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  const dummy = new THREE.Object3D();
  list.forEach((d, i) => {
    dummy.position.set(d.x, d.y, d.z);
    dummy.rotation.set(0, d.yaw, 0);
    dummy.scale.set(d.s, d.s * (0.65 + rand() * 0.5), d.s);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  return { mesh, count: list.length };
}

function createPilgrims(anchors) {
  const rand = mulberry32(6621);
  const geo = personGeometry(3);
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
  const walkers = [];
  for (let i = 0; i < 34; i++) {
    walkers.push({
      t: rand(),
      speed: (rand() < 0.5 ? 1 : -1) * (0.0016 + rand() * 0.0026),
      side: (rand() - 0.5) * 1.7,
      phase: rand() * 6.28,
      scale: 0.86 + rand() * 0.24,
    });
  }
  const standers = [];
  const spots = [
    { x: anchors.scripture.x, z: anchors.scripture.z, y: anchors.scripture.y },
    { x: anchors.foot.x, z: anchors.foot.z, y: anchors.foot.y },
    { x: anchors.summit.x, z: anchors.summit.z, y: anchors.summit.y },
  ];
  for (let i = 0; i < 20; i++) {
    const s = spots[i % spots.length];
    const a = rand() * 6.28;
    const r = 2 + rand() * 8;
    standers.push({
      x: s.x + Math.cos(a) * r,
      z: s.z + Math.sin(a) * r,
      y: s.y + 0.1,
      yaw: rand() * 6.28,
      phase: rand() * 6.28,
      scale: 0.9 + rand() * 0.25,
    });
  }
  const count = walkers.length + standers.length;
  const mesh = new THREE.InstancedMesh(geo, material, count);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  const color = new THREE.Color();
  const tints = [0xffffff, 0xf0e2cc, 0xd9e6f4, 0xffe9d9, 0xe4eedd];
  for (let i = 0; i < count; i++) {
    mesh.setColorAt(i, color.setHex(tints[i % tints.length]));
  }
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return { mesh, walkers, standers };
}

function createFlags(flagList) {
  const geo = new THREE.PlaneGeometry(0.44, 0.62);
  geo.translate(0, -0.31, 0);
  const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: true, fog: true });
  const mesh = new THREE.InstancedMesh(geo, material, flagList.length);
  mesh.frustumCulled = false;
  const color = new THREE.Color();
  flagList.forEach((f, i) => mesh.setColorAt(i, color.setHex(f.color)));
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return mesh;
}

function createCloudLife(cloudMap) {
  const rand = mulberry32(3391);
  const data = [];
  for (let i = 0; i < 26; i++) {
    const a = rand() * Math.PI * 2;
    const r = 70 + rand() * 190;
    const summit = i < 18;
    data.push({
      x: (summit ? -150 : 10) + Math.cos(a) * r,
      y: (summit ? 138 : 62) + rand() * (summit ? 45 : 50),
      z: (summit ? -226 : -110) + Math.sin(a) * r,
      w: 90 + rand() * 230,
      h: 50 + rand() * 120,
      rx: summit ? -Math.PI * 0.42 : -Math.PI * 0.5,
      rz: (rand() - 0.5) * 0.5,
      phase: rand() * 6.28,
      drift: 6 + rand() * 18,
    });
  }
  const mat = new THREE.MeshBasicMaterial({
    map: cloudMap, color: 0xf3f5f0, transparent: true, opacity: 0.44,
    depthWrite: false, side: THREE.DoubleSide, fog: true,
  });
  const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), mat, data.length);
  mesh.frustumCulled = false;
  mesh.renderOrder = 3;
  return { mesh, data };
}

function createMistLife(mistMap) {
  const rand = mulberry32(8821);
  const data = [];
  for (let i = 0; i < 24; i++) {
    const a = rand() * Math.PI * 2;
    const r = 40 + rand() * 220;
    data.push({
      x: (rand() - 0.5) * 300,
      y: 40 + rand() * 120,
      z: -80 + (rand() - 0.5) * 500,
      w: 70 + rand() * 190,
      h: 24 + rand() * 60,
      yaw: rand() * 6.28,
      phase: rand() * 6.28,
      drift: 4 + rand() * 10,
    });
  }
  const mat = new THREE.MeshBasicMaterial({
    map: mistMap, color: 0xe8f0e8, transparent: true, opacity: 0.26,
    depthWrite: false, side: THREE.DoubleSide, fog: true,
  });
  const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), mat, data.length);
  mesh.frustumCulled = false;
  mesh.renderOrder = 4;
  return { mesh, data };
}

function createSmoke(points, glowMap) {
  const count = 34;
  const positions = new Float32Array(count * 3);
  const seeds = [];
  for (let i = 0; i < count; i++) {
    const p = points[i % points.length];
    seeds.push({ ox: p.x + (Math.random() - 0.5) * 0.4, oy: p.y, oz: p.z + (Math.random() - 0.5) * 0.4, phase: Math.random() * 6.28, speed: 0.18 + Math.random() * 0.18 });
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    map: glowMap, color: 0xd8c9b0, size: 2.1, transparent: true, opacity: 0.32,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  return { pts, seeds, positions };
}

function makeLabel(title, subtitle, x, y, z, scale = 1) {
  const mat = new THREE.SpriteMaterial({
    map: makeLabelTexture(title, subtitle), transparent: true, depthTest: true,
    depthWrite: false, opacity: 0.9, toneMapped: true,
  });
  const spr = new THREE.Sprite(mat);
  spr.scale.set(30 * scale, 9.4 * scale, 1);
  spr.position.set(x, y, z);
  spr.renderOrder = 6;
  return spr;
}
export function createHengshan() {
  const root = new THREE.Group();
  root.name = 'hengshan-signature-overlay';
  const staticRoot = new THREE.Group();
  const flags = [];
  const smokePoints = [];
  const palette = [0xb63a2b, 0xe0a12c, 0x2e5f86, 0x40704a, 0xe8e2d2];

  const summit = { x: platforms[1].x, y: platforms[1].y, z: platforms[1].z };
  const scripture = { x: platforms[0].x, y: platforms[0].y, z: platforms[0].z };
  const gateFrame = frameAt(0.62);
  const gate = { x: gateFrame.x, y: gateFrame.y, z: gateFrame.z, yaw: gateFrame.yaw, width: gateFrame.width };
  const footGround = groundSpan(198, 344, 14);
  const foot = { x: 198, y: footGround.top, z: 344, yaw: 0.58, sink: footGround.sink };

  stage('start');
  // ---- 祝融峰 summit: stone terrace, 祝融殿, braziers and banners ----
  const sg = new THREE.Group();
  sg.position.set(summit.x, summit.y, summit.z);
  sg.rotation.y = 0.55;
  staticRoot.add(sg);
  addBox(sg, M.stoneWarm, 22, 1.6, 17, 0, -0.8, 0);
  addBox(sg, M.stonePale, 23, 0.24, 18, 0, 0.02, 0);
  addHall(sg, { x: 0, y: 0, z: 0, w: 9.4, d: 7.2, h: 4.4, wall: M.stoneWarm, name: '祝融殿', sub: 'ZHURONG HALL' });
  for (let i = 0; i < 5; i++) {
    addBox(sg, M.stonePale, 6.2, 0.24, 0.9, 0, -0.08 - i * 0.05, 5.2 + i * 0.62);
  }
  for (let i = 0; i < 12; i++) {
    const a = -0.4 + (i / 11) * Math.PI * 1.15;
    const px = Math.cos(a) * 9.6;
    const pz = Math.sin(a) * 7.4;
    addCyl(sg, M.stonePale, 0.22, 0.3, 1.2, 6, px, 0.7, pz);
    if (i < 11) {
      const b = -0.4 + ((i + 1) / 11) * Math.PI * 1.15;
      const qx = Math.cos(b) * 9.6;
      const qz = Math.sin(b) * 7.4;
      addBox(sg, M.stonePale, 0.16, 0.16, Math.hypot(qx - px, qz - pz), (px + qx) / 2, 1.18, (pz + qz) / 2, Math.atan2(qx - px, qz - pz));
    }
  }
  addBrazier(sg, 0, 0, 7.2, 1.15);
  smokePoints.push({ x: summit.x + Math.sin(0.55) * 7.2, y: summit.y + 2.0, z: summit.z + Math.cos(0.55) * 7.2 });
  for (const sx of [-2.8, 2.8]) {
    addBox(sg, M.stonePale, 0.9, 1.2, 0.7, sx, 0.6, 4.4);
    addSphere(sg, M.stonePale, 0.42, sx, 1.55, 4.4, 1.1, 0.9, 1);
  }
  for (const [lx, lz] of [[-9, 6.6], [9, 6.6]]) {
    const [wx, wz] = localPoint(summit.x, summit.z, 0.55, lx, lz);
    addBox(sg, M.wood, 0.13, 6.6, 0.13, lx, 3.3, lz);
    addSphere(sg, M.gold, 0.18, lx, 6.7, lz);
    const [ex, ez] = localPoint(summit.x, summit.z, 0.55, -lx, lz);
    addFlagRun(flags, wx, summit.y + 6.3, wz, ex, summit.y + 6.3, ez, 12, palette);
  }

  stage('summit');
  // ---- 南天门 gate on the ridge trail ----
  const gg = new THREE.Group();
  gg.position.set(gate.x, gate.y, gate.z);
  gg.rotation.y = gate.yaw;
  staticRoot.add(gg);
  addBox(gg, M.stoneWarm, 17, 1.3, 10, 0, -0.65, 0);
  addBox(gg, M.stonePale, 18, 0.2, 11, 0, 0.02, 0);
  for (const sx of [-5.2, 5.2]) {
    addBox(gg, M.stoneRed, 1.9, 8.2, 2.2, sx, 4.1, 0);
    addBox(gg, M.stonePale, 2.2, 0.28, 2.5, sx, 8.25, 0);
    addBox(gg, M.stoneWarm, 2.4, 0.32, 2.7, sx, 0.18, 0);
  }
  addBox(gg, M.stoneRed, 12.6, 1.3, 2.4, 0, 8.9, 0);
  addBox(gg, M.stonePale, 13.2, 0.22, 2.7, 0, 9.58, 0);
  addRoof(gg, 12.4, 4.8, 2.5, 9.7, 1.5, 1.05, M.roof);
  addPlaque(gg, '南天门', 'NANTIANMEN', 3.7, 1.05, 0, 8.85, 1.26);
  addPlaque(gg, '南天门', 'NANTIANMEN', 3.7, 1.05, 0, 8.85, -1.26, Math.PI);
  for (const sx of [-8.6, 8.6]) {
    addBox(gg, M.stoneWarm, 2.6, 3.2, 1.1, sx, 1.6, 0);
    addBox(gg, M.roofDark, 3.1, 0.24, 1.5, sx, 3.25, 0);
  }
  for (const sx of [-3.3, 3.3]) {
    addBrazier(gg, sx, 0.1, 3.0, 0.7);
  }
  for (let i = 0; i < 6; i++) {
    addBox(gg, M.stonePale, 9.6, 0.22, 0.78, 0, 0.05 - i * 0.08, -3.8 - i * 0.6);
  }
  const [gax, gaz] = localPoint(gate.x, gate.z, gate.yaw, -8.4, 2.2);
  const [gbx, gbz] = localPoint(gate.x, gate.z, gate.yaw, 8.4, 2.2);
  addFlagRun(flags, gax, gate.y + 6.6, gaz, gbx, gate.y + 6.6, gbz, 16, palette);
  for (const side of [-1, 1]) {
    const [px, pz] = localPoint(gate.x, gate.z, gate.yaw, side * 8.4, 2.2);
    addBox(staticRoot, M.wood, 0.16, 7.2, 0.16, px, gate.y + 3.6, pz);
  }

  stage('gate');
  // ---- 藏经殿 courtyard temple ----
  const tg = new THREE.Group();
  tg.position.set(scripture.x, scripture.y, scripture.z);
  tg.rotation.y = 0.15;
  staticRoot.add(tg);
  addBox(tg, M.stoneWarm, 30, 1.5, 24, 0, -0.75, 0);
  addBox(tg, M.stonePale, 31, 0.22, 25, 0, 0.02, 0);
  addHall(tg, { x: 0, y: 0, z: -5, w: 12, d: 8.2, h: 5.0, twoTier: true, wall: M.ochreWall, name: '藏经殿', sub: 'SCRIPTURE HALL' });
  addHall(tg, { x: -10.4, y: 0, z: 1.4, yaw: Math.PI * 0.5, w: 5, d: 7, h: 3.8, wall: M.ochreWall, name: '', plaque: false, lanterns: false });
  addHall(tg, { x: 10.4, y: 0, z: 1.4, yaw: -Math.PI * 0.5, w: 5, d: 7, h: 3.8, wall: M.ochreWall, name: '', plaque: false, lanterns: false });
  addWallRun(tg, -15, 10.6, -4.6, 10.6, 2.2);
  addWallRun(tg, 4.6, 10.6, 15, 10.6, 2.2);
  addBox(tg, M.ochreWall, 4.4, 3.4, 2.8, 0, 1.7, 10.6);
  addRoof(tg, 4.0, 2.6, 1.7, 3.5, 1.3, 0.9, M.roofDark);
  addBrazier(tg, -4.2, 0.1, 4.4, 0.85);
  addBrazier(tg, 4.2, 0.1, 4.4, 0.85);
  smokePoints.push({ x: scripture.x - 4.2, y: scripture.y + 1.6, z: scripture.z + 4.4 });
  smokePoints.push({ x: scripture.x + 4.2, y: scripture.y + 1.6, z: scripture.z + 4.4 });
  for (const sx of [-7.2, 7.2]) {
    addCyl(tg, M.stonePale, 0.34, 0.44, 1.5, 7, sx, 0.75, 3.0);
    addBox(tg, M.glow, 0.5, 0.62, 0.5, sx, 1.72, 3.0);
    addBox(tg, M.roofDark, 0.9, 0.18, 0.9, sx, 2.12, 3.0);
  }
  for (let i = 0; i < 7; i++) {
    addBox(tg, M.stonePale, 9.4, 0.22, 0.8, 0, -0.05 - i * 0.07, 12.6 + i * 0.6);
  }
  const [tax, taz] = localPoint(scripture.x, scripture.z, 0.15, -11, 7.6);
  const [tbx, tbz] = localPoint(scripture.x, scripture.z, 0.15, 11, 7.6);
  addFlagRun(flags, tax, scripture.y + 4.6, taz, tbx, scripture.y + 4.6, tbz, 18, palette);
  for (const side of [-1, 1]) {
    const [px, pz] = localPoint(scripture.x, scripture.z, 0.15, side * 13, 8.8);
    addBox(staticRoot, M.wood, 0.16, 5.4, 0.16, px, scripture.y + 2.7, pz);
  }

  stage('temple');
  // ---- 方广寺 valley temple with pond and bridge ----
  const fg = new THREE.Group();
  fg.position.set(foot.x, foot.y, foot.z);
  fg.rotation.y = foot.yaw;
  staticRoot.add(fg);
  addBox(fg, M.stoneWarm, 28, foot.sink + 1.4, 21, 0, -(foot.sink + 1.4) * 0.5 + 0.2, 0);
  addBox(fg, M.stonePale, 29, 0.22, 22, 0, 0.02, 0);
  addHall(fg, { x: 0, y: 0, z: -4.4, w: 11, d: 7.4, h: 4.6, wall: M.redWall, name: '方广寺', sub: 'FANGGUANG TEMPLE' });
  addHall(fg, { x: -9.4, y: 0, z: 1.2, yaw: Math.PI * 0.5, w: 4.6, d: 6.4, h: 3.5, wall: M.redWall, name: '', plaque: false, lanterns: false });
  addHall(fg, { x: 9.4, y: 0, z: 1.2, yaw: -Math.PI * 0.5, w: 4.6, d: 6.4, h: 3.5, wall: M.redWall, name: '', plaque: false, lanterns: false });
  addWallRun(fg, -13.4, 8.4, -4.2, 8.4, 2.1);
  addWallRun(fg, 4.2, 8.4, 13.4, 8.4, 2.1);
  addBox(fg, M.water, 9.2, 0.24, 5.2, 0, 0.16, 9.0);
  addBox(fg, M.stonePale, 10.2, 0.5, 0.5, 0, 0.3, 6.25);
  addBox(fg, M.stonePale, 10.2, 0.5, 0.5, 0, 0.3, 11.75);
  addBox(fg, M.stonePale, 2.6, 0.3, 6.2, 0, 0.62, 9.0);
  for (const sx of [-1.1, 1.1]) {
    addBox(fg, M.stonePale, 0.14, 1.0, 6.0, sx, 1.12, 9.0);
    addBox(fg, M.stonePale, 0.2, 0.18, 6.0, sx, 1.58, 9.0);
  }
  addBrazier(fg, -3.4, 0.1, 4.3, 0.8);
  addBrazier(fg, 3.4, 0.1, 4.3, 0.8);
  smokePoints.push({ x: foot.x - 3.4, y: foot.y + 1.5, z: foot.z + 4.3 });
  for (let i = 0; i < 6; i++) {
    addBox(fg, M.stonePale, 8.6, 0.22, 0.8, 0, -0.05 - i * 0.06, 12.6 + i * 0.62);
  }
  const [fax, faz] = localPoint(foot.x, foot.z, foot.yaw, -10, 6.6);
  const [fbx, fbz] = localPoint(foot.x, foot.z, foot.yaw, 10, 6.6);
  addFlagRun(flags, fax, foot.y + 4.4, faz, fbx, foot.y + 4.4, fbz, 14, palette);

  stage('foot');
  // ---- winding stone step nosings on the ridge trail ----
  for (let i = 0; i < 46; i++) {
    const t = 0.53 + (i / 45) * 0.16;
    const f = frameAt(t);
    addBox(staticRoot, M.stonePale, Math.min(9, f.width * 0.92), 0.13, 0.58, f.x, f.y + 0.21, f.z, f.yaw);
  }

  stage('steps ' + staticRoot.children.length);
  const merged = mergeStaticGroup(staticRoot);
  stage('merged ' + merged.children.length);
  merged.name = 'hengshan-merged-architecture';
  root.add(merged);

  // ---- instanced pines, rocks, pilgrims, flags and animated weather ----
  const cloudMap = makeCloudTexture();
  const mistMap = makeMistTexture();
  const glowMap = makeGlowTexture();

  stage('life start');
  const pines = createPines();
  stage('pines ' + pines.count);
  root.add(pines.group);
  const rocks = createRocks();
  stage('rocks ' + rocks.count);
  root.add(rocks.mesh);
  const pilgrims = createPilgrims({ summit, scripture, foot });
  stage('pilgrims');
  root.add(pilgrims.mesh);
  const flagMesh = createFlags(flags);
  root.add(flagMesh);
  stage('flags');
  const clouds = createCloudLife(cloudMap);
  root.add(clouds.mesh);
  const mist = createMistLife(mistMap);
  root.add(mist.mesh);
  const smoke = createSmoke(smokePoints, glowMap);
  stage('smoke');
  root.add(smoke.pts);

  const labels = [
    makeLabel('祝融峰', 'ZHURONG PEAK · 1300 M', summit.x, summit.y + 20, summit.z, 0.95),
    makeLabel('南天门', 'NANTIANMEN GATE', gate.x, gate.y + 16, gate.z, 0.78),
    makeLabel('藏经殿', 'SCRIPTURE HALL', scripture.x, scripture.y + 16, scripture.z, 0.86),
    makeLabel('方广寺', 'FANGGUANG TEMPLE', foot.x, foot.y + 14, foot.z, 0.78),
  ];
  labels.forEach((l) => root.add(l));

  const gateCam = frameAt(0.45);
  const views = {
    overview: { p: [520, 215, 650], t: [-55, 135, -205] },
    zhurong: { p: [-58, 245, -96], t: [-150, 209, -226] },
    nantianmen: { p: [gateCam.x, gateCam.y + 8.6, gateCam.z], t: [gate.x, gate.y + 6.6, gate.z] },
    temple: { p: [scripture.x + Math.sin(0.15) * 32, scripture.y + 13, scripture.z + Math.cos(0.15) * 32], t: [scripture.x, scripture.y + 6.8, scripture.z] },
    dusk: { p: [560, 195, 600], t: [-45, 132, -210] },
  };
  const notes = {
    overview: ['衡山 · 南岳独秀', '湘中丘陵间，祝融峰浮出云海，赤壁与青峦层叠，石阶在松影里盘旋而上'],
    zhurong: ['祝融峰 · 云海', '南岳最高峰，祝融殿踞于峰顶，脚下云涛翻涌，远山如黛'],
    nantianmen: ['南天门', '石阙跨于山脊，千级石阶穿门而过，香客持香拾级，松风与云气相随'],
    temple: ['藏经殿', '殿宇隐于香樟古松之间，黄墙黛瓦，钟磬声与山雾一同沉入庭院'],
    dusk: ['衡山暮色', '夕阳沉入湘中丘陵，祝融峰与南天门化作剪影，云海泛起最后一层暖金'],
  };

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  function update(time) {
    clouds.data.forEach((c, i) => {
      dummy.position.set(
        c.x + Math.sin(time * 0.012 + c.phase) * c.drift,
        c.y + Math.sin(time * 0.05 + c.phase) * 1.2,
        c.z + Math.cos(time * 0.009 + c.phase) * c.drift * 0.45
      );
      dummy.rotation.set(c.rx, 0, c.rz);
      dummy.scale.set(c.w, c.h, 1);
      dummy.updateMatrix();
      clouds.mesh.setMatrixAt(i, dummy.matrix);
    });
    clouds.mesh.instanceMatrix.needsUpdate = true;

    mist.data.forEach((c, i) => {
      dummy.position.set(
        c.x + Math.sin(time * 0.02 + c.phase) * c.drift,
        c.y + Math.sin(time * 0.06 + c.phase) * 1.4,
        c.z + Math.cos(time * 0.017 + c.phase) * c.drift * 0.6
      );
      dummy.rotation.set(-0.15, c.yaw, 0);
      dummy.scale.set(c.w, c.h, 1);
      dummy.updateMatrix();
      mist.mesh.setMatrixAt(i, dummy.matrix);
    });
    mist.mesh.instanceMatrix.needsUpdate = true;

    flags.forEach((f, i) => {
      dummy.position.set(f.x, f.y, f.z);
      dummy.rotation.set(Math.sin(time * 2.7 + f.phase) * 0.28, f.yaw, Math.cos(time * 2.2 + f.phase) * 0.18);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      flagMesh.setMatrixAt(i, dummy.matrix);
    });
    flagMesh.instanceMatrix.needsUpdate = true;

    pilgrims.walkers.forEach((p, i) => {
      const t = ((p.t + time * p.speed) % 1 + 1) % 1;
      const f = frameAt(t);
      dummy.position.set(f.x + f.nx * p.side, f.y + 0.12 + Math.abs(Math.sin(time * 3.4 + p.phase)) * 0.07, f.z + f.nz * p.side);
      dummy.rotation.set(0, p.speed > 0 ? f.yaw : f.yaw + Math.PI, Math.sin(time * 3.4 + p.phase) * 0.03);
      dummy.scale.setScalar(p.scale);
      dummy.updateMatrix();
      pilgrims.mesh.setMatrixAt(i, dummy.matrix);
    });
    pilgrims.standers.forEach((p, j) => {
      const i = pilgrims.walkers.length + j;
      dummy.position.set(p.x, p.y + Math.sin(time * 1.4 + p.phase) * 0.03, p.z);
      dummy.rotation.set(0.08 + Math.sin(time * 1.6 + p.phase) * 0.1, p.yaw, 0);
      dummy.scale.setScalar(p.scale);
      dummy.updateMatrix();
      pilgrims.mesh.setMatrixAt(i, dummy.matrix);
    });
    pilgrims.mesh.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < smoke.seeds.length; i++) {
      const s = smoke.seeds[i];
      const life = ((time * s.speed + s.phase * 0.16) % 1 + 1) % 1;
      smoke.positions[i * 3] = s.ox + Math.sin(time * 0.6 + s.phase) * life * 1.6;
      smoke.positions[i * 3 + 1] = s.oy + life * 7.5;
      smoke.positions[i * 3 + 2] = s.oz + Math.cos(time * 0.5 + s.phase) * life * 1.2;
    }
    smoke.pts.geometry.attributes.position.needsUpdate = true;
  }

  stage('update0');
  update(0);
  stage('done');
  return {
    group: root,
    views,
    notes,
    anchors: { summit, scripture, gate, foot },
    counts: {
      pines: pines.count,
      rocks: rocks.count,
      pilgrims: pilgrims.walkers.length + pilgrims.standers.length,
      flags: flags.length,
      clouds: clouds.data.length,
      mist: mist.data.length,
    },
    update,
  };
}
