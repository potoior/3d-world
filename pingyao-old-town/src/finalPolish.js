import * as THREE from 'three';
import { mats, getPlaqueMaterial } from './materials.js';
import { getCoupletMaterial } from './richArch.js';
import { addBox, addCylinder, mergedMesh } from './geometry.js';

function rnd(seed, n) {
  const v = Math.sin(seed * 39.71 + n * 83.17) * 43758.5453;
  return v - Math.floor(v);
}

function worldPoint(x, z, rot, lx, lz) {
  return [
    x + lx * Math.cos(rot) + lz * Math.sin(rot),
    z - lx * Math.sin(rot) + lz * Math.cos(rot),
  ];
}

function addLocal(list, def, w, h, d, lx, ly, lz, ry = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (ry) g.rotateY(ry);
  g.translate(lx, ly, lz);
  if (def.rot) g.rotateY(def.rot);
  g.translate(def.x, 0, def.z);
  list.push(g);
}

function addLocalCyl(list, def, rt, rb, h, seg, lx, ly, lz, rx = 0, rz = 0) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  if (rx) g.rotateX(rx);
  if (rz) g.rotateZ(rz);
  g.translate(lx, ly, lz);
  if (def.rot) g.rotateY(def.rot);
  g.translate(def.x, 0, def.z);
  list.push(g);
}


class QuadBatch {
  constructor() {
    this.pos = [];
    this.norm = [];
    this.uv = [];
    this.count = 0;
  }

  _pushQuad(vs, normal) {
    const order = [0, 1, 2, 0, 2, 3];
    for (const i of order) {
      this.pos.push(vs[i][0], vs[i][1], vs[i][2]);
      this.norm.push(normal[0], normal[1], normal[2]);
    }
    this.uv.push(0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1);
    this.count++;
  }

  face(w, h, x, y, z, ry = 0) {
    const c = Math.cos(ry);
    const s = Math.sin(ry);
    const local = [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]];
    const vs = local.map(([lx, ly]) => [x + lx * c, y + ly, z - lx * s]);
    this._pushQuad(vs, [s, 0, c]);
  }

  flat(w, d, x, y, z, ry = 0) {
    const c = Math.cos(ry);
    const s = Math.sin(ry);
    const local = [[-w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2], [w / 2, -d / 2]];
    const vs = local.map(([lx, lz]) => [x + lx * c + lz * s, y, z - lx * s + lz * c]);
    this._pushQuad(vs, [0, 1, 0]);
  }

  localFace(def, w, h, lx, ly, lz) {
    const [x, z] = worldPoint(def.x, def.z, def.rot, lx, lz);
    this.face(w, h, x, ly, z, def.rot);
  }

  build(material, cast = true, receive = true) {
    if (!this.count) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.norm, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    const mesh = new THREE.Mesh(g, material);
    mesh.castShadow = cast;
    mesh.receiveShadow = receive;
    return mesh;
  }
}

function wallRuns(halfX, halfZ, gateWidth) {
  const runs = [];
  for (const sign of [-1, 1]) {
    for (const [a, b] of [[-halfX, -gateWidth * 0.5], [gateWidth * 0.5, halfX]]) {
      if (b - a > 0.1) runs.push({ axis: 'x', sign, a, b, center: (a + b) * 0.5, len: b - a });
    }
    for (const [a, b] of [[-halfZ, -gateWidth * 0.5], [gateWidth * 0.5, halfZ]]) {
      if (b - a > 0.1) runs.push({ axis: 'z', sign, a, b, center: (a + b) * 0.5, len: b - a });
    }
  }
  return runs;
}

function addWallMicro(courses, caps, walk, spouts, halfX, halfZ, wallH, wallT, gateWidth) {
  const runs = wallRuns(halfX, halfZ, gateWidth);
  let seed = 4200;
  for (const run of runs) {
    const isX = run.axis === 'x';
    const inner = isX
      ? run.sign * (halfZ - wallT * 0.5 - 0.025)
      : run.sign * (halfX - wallT * 0.5 - 0.025);
    for (let y = 1.3; y < wallH - 0.2; y += 0.55) {
      const innerYaw = isX ? (run.sign > 0 ? Math.PI : 0) : (run.sign > 0 ? -Math.PI * 0.5 : Math.PI * 0.5);
      courses.face(isX ? run.len : 0.055, 0.035, isX ? run.center : inner, y, isX ? inner : run.center, innerYaw);
      const step = 2.35;
      const count = Math.floor(run.len / step);
      for (let i = 0; i < count; i++) {
        if (rnd(seed, i) > 0.46) continue;
        const t = run.a + step * (i + 0.5) + (rnd(seed, i + 8) - 0.5) * 1.1;
        courses.face(isX ? 0.035 : 0.05, 0.42, isX ? t : inner, y + 0.23, isX ? inner : t, innerYaw);
      }
    }

    const walkLine = isX ? run.sign * halfZ : run.sign * halfX;
    const slabN = Math.max(3, Math.floor(run.len / 1.12));
    const slabLen = run.len / slabN - 0.055;
    for (let i = 0; i < slabN; i++) {
      const t = run.a + (run.len * (i + 0.5)) / slabN;
      const lift = (i % 4) * 0.006;
      walk.flat(isX ? slabLen : 5.25, isX ? 5.25 : slabLen,
        isX ? t : walkLine, wallH + 0.115 + lift, isX ? walkLine : t);
    }

    const m = Math.max(2, Math.floor(run.len / 2.7));
    const outer = isX
      ? run.sign * (halfZ + wallT * 0.5 - 0.38)
      : run.sign * (halfX + wallT * 0.5 - 0.38);
    for (let i = 0; i <= m; i++) {
      const t = run.a + (run.len * i) / m;
      addBox(caps, isX ? 1.28 : 1.02, 0.075, isX ? 1.02 : 1.28,
        isX ? t : outer, wallH + 1.805, isX ? outer : t);
      addBox(caps, isX ? 0.92 : 0.66, 0.055, isX ? 0.66 : 0.92,
        isX ? t : outer, wallH + 1.877, isX ? outer : t);
      if (i % 4 === 0) {
        const outX = isX ? t : outer + run.sign * 0.52;
        const outZ = isX ? outer + run.sign * 0.52 : t;
        addBox(spouts, isX ? 0.16 : 0.62, 0.11, isX ? 0.62 : 0.16, outX, wallH + 1.56, outZ);
      }
    }
  }
}

function addShopCourses(courses, quoins, houses) {
  let seed = 5200;
  for (const def of houses) {
    if (!def.name && !def.banner) continue;
    const top = 0.5 + 3.35 + (def.storeys > 1 ? 2.75 : 0);
    const frontZ = def.d * 0.5 + 0.025;
    const half = def.w * 0.43;
    const step = 1.42;
    const count = Math.max(2, Math.floor((half * 2) / step));
    for (let y = 0.92; y < top - 0.22; y += 0.42) {
      courses.localFace(def, def.w * 0.88, 0.032, 0, y, frontZ);
      const stagger = (Math.round(y * 10) % 2) * step * 0.5;
      for (let i = 0; i < count; i++) {
        const lx = -half + i * step + stagger + (rnd(seed, i) - 0.5) * 0.1;
        if (Math.abs(lx) > half) continue;
        if (rnd(seed, i + 21) < 0.3) continue;
        courses.localFace(def, 0.032, 0.205, lx, y + 0.2, frontZ);
      }
      seed++;
    }
    for (const sx of [-1, 1]) {
      for (let i = 0; i < 9; i++) {
        const y = 0.86 + i * 0.55;
        if (y > top - 0.1) break;
        const lx = sx * (def.w * 0.5 - 0.07);
        const lz = def.d * 0.5 - 0.1;
        addLocal(quoins, def, 0.34, 0.3, 0.4, lx, y, lz);
        addLocal(quoins, def, 0.4, 0.3, 0.34, lx, y + 0.29, lz - 0.12);
      }
    }
  }
}

function addLatticeAndDoors(latticeBars, studs, rings, houses) {
  let seed = 6300;
  for (const def of houses) {
    if (!def.name && !def.banner) continue;
    const winY = 0.5 + (def.storeys > 1 ? 3.35 + 2.75 * 0.48 : 1.9);
    const winCount = def.storeys > 1 ? 3 : 2;
    const frontZ = def.d * 0.5 + 0.145;
    for (let w = 0; w < winCount; w++) {
      const wx = -def.w * 0.25 + (w * def.w * 0.5) / Math.max(1, winCount - 1);
      for (let k = 0; k < 3; k++) {
        latticeBars.localFace(def, 0.028, 0.92,
          wx - def.w * 0.07 + k * def.w * 0.07, winY, frontZ);
      }
      for (let k = 0; k < 2; k++) {
        latticeBars.localFace(def, def.w * 0.16, 0.028,
          wx, winY - 0.28 + k * 0.56, frontZ);
      }
    }
    const doorZ = def.d * 0.5 + 0.18;
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 4; col++) {
        const g = new THREE.SphereGeometry(0.065, 6, 4);
        const lx = -def.w * 0.12 + col * (def.w * 0.24) / 3;
        const ly = 1.32 + row * 0.64;
        g.translate(lx, ly, doorZ);
        if (def.rot) g.rotateY(def.rot);
        g.translate(def.x, 0, def.z);
        studs.push(g);
      }
    }
    for (const sx of [-1, 1]) {
      const g = new THREE.TorusGeometry(0.16, 0.032, 5, 12);
      g.rotateY(Math.PI * 0.5);
      g.translate(sx * def.w * 0.22, 1.36, doorZ + 0.02);
      if (def.rot) g.rotateY(def.rot);
      g.translate(def.x, 0, def.z);
      rings.push(g);
      addLocal(studs, def, 0.26, 0.26, 0.045, sx * def.w * 0.22, 1.36, doorZ - 0.06);
    }
  }
}

function addShopSigns(group, wood, houses) {
  const banners = [];
  let seed = 7300;
  for (const def of houses) {
    if (!def.name) continue;
    const lx = def.w * 0.34 + 0.34;
    const lz = def.d * 0.5 + 0.46;
    const [wx, wz] = worldPoint(def.x, def.z, def.rot, lx, lz);
    const width = Math.min(2.2, Math.max(1.25, def.name.length * 0.38 + 0.4));
    const yaw = def.rot + Math.PI * 0.5;
    const [px, pz] = worldPoint(def.x, def.z, def.rot, def.w * 0.34, def.d * 0.5 + 0.12);
    addBox(wood, 0.12, 3.15, 0.12, px, 1.58, pz);
    const armX = def.w * 0.34 + 0.18;
    const [ax, az] = worldPoint(def.x, def.z, def.rot, armX, def.d * 0.5 + 0.42);
    addBox(wood, 0.12, 0.12, 0.9, ax, 3.18, az, def.rot);
    const plaque = new THREE.Mesh(new THREE.PlaneGeometry(width, width * 0.42), getPlaqueMaterial(def.name));
    plaque.position.set(wx, 2.76, wz);
    plaque.rotation.y = yaw;
    group.add(plaque);
    addBox(wood, width + 0.12, 0.08, 0.12, wx, 2.76 + width * 0.21, wz, yaw);
    addBox(wood, width + 0.12, 0.08, 0.12, wx, 2.76 - width * 0.21, wz, yaw);
    addBox(wood, 0.08, width * 0.42 + 0.12, 0.12, wx, 2.76, wz, yaw);
    const [bx, bz] = worldPoint(def.x, def.z, def.rot, def.w * 0.34 + 0.72, def.d * 0.5 + 0.86);
    banners.push({ x: bx, z: bz, y: 3.04, yaw: def.rot, phase: seed * 0.7, color: seed % 3 });
    seed++;
  }
  return banners;
}

function addCouplets(group, houses) {
  const defs = [
    { text: '汇通天下', house: houses.find((h) => h.name === '日昇昌') },
    { text: '信义为本', house: houses.find((h) => h.name === '日昇昌') },
    { text: '宾至如归', house: houses.find((h) => h.name === '客栈') },
    { text: '厚德载物', house: houses.find((h) => h.name === '客栈') },
  ];
  defs.forEach((item, i) => {
    const def = item.house;
    if (!def) return;
    const sx = i % 2 === 0 ? -1 : 1;
    const lx = sx * (def.w * 0.36);
    const lz = def.d * 0.5 + 0.20;
    const [x, z] = worldPoint(def.x, def.z, def.rot, lx, lz);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.27, 1.82), getCoupletMaterial(item.text));
    mesh.position.set(x, 1.96, z);
    mesh.rotation.y = def.rot;
    group.add(mesh);
  });
}

const LANES = [
  { w: 15, d: 280, x: 0, z: 0, axis: 'z' },
  { w: 256, d: 15, x: 0, z: 0, axis: 'x' },
  { w: 9, d: 268, x: -68, z: 0, axis: 'z' },
  { w: 9, d: 268, x: 68, z: 0, axis: 'z' },
  { w: 248, d: 9, x: 0, z: -72, axis: 'x' },
  { w: 248, d: 9, x: 0, z: 72, axis: 'x' },
  { w: 6, d: 260, x: -112, z: 0, axis: 'z' },
  { w: 6, d: 260, x: 112, z: 0, axis: 'z' },
  { w: 244, d: 6, x: 0, z: -112, axis: 'x' },
  { w: 244, d: 6, x: 0, z: 112, axis: 'x' },
];

function addLaneSeams(seams) {
  let seed = 8100;
  for (const l of LANES) {
    const offs = l.w >= 9 ? [-0.27, 0, 0.27] : [-0.22, 0.22];
    for (const f of offs) {
      if (l.axis === 'z') {
        seams.flat(0.055, l.d - 0.5, l.x + f * l.w, 0.112, l.z);
      } else {
        seams.flat(l.w - 0.5, 0.055, l.x, 0.112, l.z + f * l.d);
      }
    }
    const n = Math.floor((l.axis === 'z' ? l.d : l.w) / 3.4);
    for (let i = 1; i < n; i++) {
      const t = -0.5 + i / n + (rnd(seed, i) - 0.5) * 0.01;
      if (rnd(seed, i + 7) < 0.42) continue;
      if (l.axis === 'z') {
        seams.flat(0.05, l.d * 0.018, l.x + l.w * (rnd(seed, i + 3) - 0.5) * 0.8,
          0.113, l.z + t * l.d);
      } else {
        seams.flat(l.w * 0.018, 0.05, l.x + t * l.w, 0.113,
          l.z + l.d * (rnd(seed, i + 3) - 0.5) * 0.8);
      }
    }
    seed += 13;
  }
}

function addCourtyardPolish(stone, wood, clay, cloth, roof, lantern, compounds, wellsOut) {
  let seed = 9100;
  for (const c of compounds) {
    const innerX = c.x - c.w * 0.5 + 0.32;
    for (let i = 0; i < 3; i++) {
      const z = c.z - 6.2 + i * 5.6;
      addBox(wood, 0.18, 2.4, 2.7, innerX, 1.2, z);
      addBox(stone, 0.26, 0.22, 3.0, innerX + 0.04, 0.11, z);
      addBox(wood, 0.1, 2.2, 2.35, innerX + 0.13, 1.2, z);
      for (let k = 0; k < 3; k++) {
        addBox(wood, 0.06, 0.06, 2.1, innerX + 0.2, 0.72 + k * 0.62, z);
      }
      addBox(wood, 0.06, 1.95, 0.06, innerX + 0.2, 1.2, z);
    }
    const plaque = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.6), getPlaqueMaterial('客栈'));
    plaque.position.set(innerX + 0.2, 2.48, c.z + 1.0);
    plaque.rotation.y = Math.PI * 0.5;
    plaque.castShadow = false;
    lanternGroupAdd(plaque);
    addBox(wood, 0.55, 0.12, 0.12, innerX + 0.2, 2.02, c.z + 2.0);
    addBox(roof, 2.1, 0.12, 0.7, innerX + 0.14, 2.62, c.z + 1.0);
    addBox(stone, 1.55, 0.18, 1.05, c.x + 2.0, 0.62, c.z - 1.0);
    for (const sx of [-1, 1]) {
      addBox(wood, 0.16, 0.46, 0.16, c.x + 2.0 + sx * 0.58, 0.23, c.z - 1.0);
    }
    for (const [bx, bz] of [[-0.7, 1.3], [0.7, 1.3], [-0.7, -1.3], [0.7, -1.3]]) {
      addBox(wood, 0.14, 0.42, 0.14, c.x + 2.0 + bx, 0.21, c.z - 1.0 + bz);
    }
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.4;
      addCylinder(clay, 0.24, 0.29, 0.62, 8, c.x + 5.0 + Math.cos(a) * 0.85, 0.31, c.z - 3.3 + Math.sin(a) * 0.6);
      addCylinder(clay, 0.2, 0.22, 0.08, 8, c.x + 5.0 + Math.cos(a) * 0.85, 0.65, c.z - 3.3 + Math.sin(a) * 0.6);
    }
    addBox(clay, 1.3, 0.48, 0.85, c.x + 4.8, 0.24, c.z + 4.1, 0.2);
    addBox(clay, 1.15, 0.3, 0.72, c.x + 4.8, 0.62, c.z + 4.1, 0.2);
    for (let i = 0; i < 3; i++) {
      addBox(clay, 1.8, 0.16, 0.22, c.x + 5.2, 0.4 + i * 0.16, c.z + 2.8, 0.1);
    }
    addBox(clay, 0.3, 0.7, 0.3, c.x + 5.2, 0.35, c.z + 2.8);
    addBox(wood, 0.1, 1.8, 0.1, c.x + 6.6, 0.9, c.z + 2.5);
    addBox(wood, 0.7, 0.08, 0.08, c.x + 6.95, 1.68, c.z + 2.5);
    for (let i = 0; i < 5; i++) {
      addCylinder(cloth, 0.16, 0.16, 0.42, 7, c.x + 6.6 + (i % 2) * 0.42, 2.2, c.z + 2.1 + i * 0.35);
    }
    for (let i = 0; i < 5; i++) {
      addBox(stone, 1.9, 0.09, 1.9, c.x - 1.5 + (i % 3) * 2.0, 0.06, c.z + 3.0 + Math.floor(i / 3) * 2.0);
    }
    const wx = c.x + c.w * 0.28;
    const wz = c.z - c.d * 0.24;
    addCylinder(stone, 0.92, 1.0, 0.62, 14, wx, 0.31, wz);
    addCylinder(stone, 0.76, 0.82, 0.1, 14, wx, 0.64, wz);
    addBox(wood, 0.12, 1.75, 0.12, wx - 0.84, 0.88, wz);
    addBox(wood, 0.12, 1.75, 0.12, wx + 0.84, 0.88, wz);
    addBox(wood, 1.95, 0.12, 0.12, wx, 1.72, wz);
    addCylinder(wood, 0.06, 0.06, 0.55, 5, wx, 1.34, wz);
    addBox(wood, 0.06, 0.06, 0.6, wx, 1.5, wz + 0.27);
    addCylinder(clay, 0.2, 0.16, 0.36, 8, wx, 0.92, wz);
    addCylinder(wood, 0.02, 0.02, 0.5, 4, wx, 1.18, wz);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      addCylinder(lantern, 0.13, 0.11, 0.26, 6, innerX + 0.45, 2.32, c.z + 1.0 + Math.cos(a) * 1.6);
    }
    wellsOut.push({ x: wx, z: wz, r: 1.35 });
    seed += 11;
  }
}

let __lanternGroup = null;
function lanternGroupAdd(mesh) {
  if (__lanternGroup) __lanternGroup.add(mesh);
}

function addCarts(wood, dark, cloth, horse, clay, carts) {
  const defs = [
    { x: -19, z: 61, rot: 0.25 },
    { x: 27, z: -116, rot: 2.7 },
    { x: -118, z: 34, rot: -1.2 },
  ];
  let seed = 10100;
  for (const def of defs) {
    addLocal(wood, def, 1.7, 0.24, 2.7, 0, 0.92, 0);
    addLocal(dark, def, 0.12, 0.5, 2.65, -0.83, 1.18, 0);
    addLocal(dark, def, 0.12, 0.5, 2.65, 0.83, 1.18, 0);
    addLocal(dark, def, 1.7, 0.5, 0.12, 0, 1.18, 1.3);
    addLocal(cloth, def, 1.9, 0.12, 2.4, 0, 1.92, 0);
    addLocal(cloth, def, 0.1, 1.15, 0.1, -0.9, 1.4, -1.24);
    addLocal(cloth, def, 0.1, 1.15, 0.1, 0.9, 1.4, -1.24);
    for (const sx of [-1, 1]) {
      const g = new THREE.CylinderGeometry(0.56, 0.56, 0.12, 14);
      g.rotateZ(Math.PI * 0.5);
      g.translate(sx * 0.92, 0.56, 0.62);
      if (def.rot) g.rotateY(def.rot);
      g.translate(def.x, 0, def.z);
      dark.push(g);
      const hub = new THREE.CylinderGeometry(0.13, 0.13, 0.18, 8);
      hub.rotateZ(Math.PI * 0.5);
      hub.translate(sx * 0.99, 0.56, 0.62);
      if (def.rot) hub.rotateY(def.rot);
      hub.translate(def.x, 0, def.z);
      wood.push(hub);
      for (let k = 0; k < 4; k++) {
        const spoke = new THREE.BoxGeometry(0.06, 1.02, 0.07);
        spoke.rotateX((k / 4) * Math.PI);
        spoke.translate(sx * 0.96, 0.56, 0.62);
        if (def.rot) spoke.rotateY(def.rot);
        spoke.translate(def.x, 0, def.z);
        wood.push(spoke);
      }
    }
    for (const sx of [-1, 1]) {
      for (let k = 0; k < 3; k++) {
        addLocal(clay, def, 0.34, 0.3, 0.34, sx * 0.38, 1.18 + k * 0.3, -0.4 + k * 0.4);
      }
    }
    addLocal(wood, def, 0.09, 0.09, 2.1, -0.34, 0.86, 2.0);
    addLocal(wood, def, 0.09, 0.09, 2.1, 0.34, 0.86, 2.0);
    const hx = 0;
    const hz = 3.1;
    const body = new THREE.SphereGeometry(0.45, 7, 6);
    body.scale(0.85, 0.8, 1.65);
    body.translate(hx, 1.02, hz);
    if (def.rot) body.rotateY(def.rot);
    body.translate(def.x, 0, def.z);
    horse.push(body);
    const neck = new THREE.CylinderGeometry(0.15, 0.21, 0.7, 6);
    neck.rotateX(-0.55);
    neck.translate(hx, 1.42, hz + 0.58);
    if (def.rot) neck.rotateY(def.rot);
    neck.translate(def.x, 0, def.z);
    horse.push(neck);
    addLocal(horse, def, 0.23, 0.27, 0.54, hx, 1.7, hz + 0.88);
    addLocal(horse, def, 0.13, 0.55, 0.13, -0.55, 1.05, hz - 0.5);
    addLocal(horse, def, 0.13, 0.55, 0.13, 0.55, 1.05, hz - 0.5);
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        addLocal(dark, def, 0.09, 0.95, 0.1, sx * 0.3, 0.47, hz + sz * 0.55);
      }
    }
    carts.push({ x: def.x, z: def.z, r: 2.4 });
    seed++;
  }
}

function addBaskets(baskets, rims, houses) {
  let seed = 11100;
  let count = 0;
  for (const def of houses) {
    if (!def.name) continue;
    for (const sx of [-1, 1]) {
      if ((count + (sx > 0 ? 1 : 0)) % 3 !== 0) continue;
      const lx = sx * (def.w * 0.29);
      const lz = def.d * 0.5 + 0.78;
      addLocalCyl(baskets, def, 0.27, 0.2, 0.4, 8, lx, 0.2, lz);
      addLocalCyl(rims, def, 0.28, 0.28, 0.06, 8, lx, 0.4, lz);
      const handle = new THREE.TorusGeometry(0.25, 0.018, 4, 10, Math.PI);
      handle.translate(lx, 0.44, lz);
      if (def.rot) handle.rotateY(def.rot);
      handle.translate(def.x, 0, def.z);
      rims.push(handle);
    }
    count++;
    seed++;
  }
}

function addPerchedBirds(birds, halfX, halfZ, wallH) {
  const spots = [
    [-58, 0, halfZ + 3.12, -Math.PI * 0.5],
    [-22, 0, halfZ + 3.12, -Math.PI * 0.5],
    [26, 0, halfZ + 3.12, -Math.PI * 0.5],
    [64, 0, halfZ + 3.12, -Math.PI * 0.5],
    [0, -78, -halfZ - 3.12, Math.PI * 0.5],
    [0, 94, -halfZ - 3.12, Math.PI * 0.5],
    [halfX + 3.12, 0, -44, Math.PI],
    [halfX + 3.12, 0, 58, Math.PI],
    [-halfX - 3.12, 0, -68, 0],
    [-halfX - 3.12, 0, 82, 0],
  ];
  for (let i = 0; i < spots.length; i++) {
    const [x, , z, yaw] = spots[i];
    const y = wallH + 1.92;
    const body = new THREE.SphereGeometry(0.1, 5, 4);
    body.scale(0.72, 0.66, 1.5);
    body.rotateY(yaw);
    body.translate(x, y, z);
    birds.push(body);
    const head = new THREE.SphereGeometry(0.06, 5, 4);
    head.translate(0, 0.07, 0.12);
    head.rotateY(yaw);
    head.translate(x, y, z);
    birds.push(head);
    const tail = new THREE.ConeGeometry(0.055, 0.28, 4);
    tail.rotateX(Math.PI * 0.5);
    tail.translate(0, 0, -0.16);
    tail.rotateY(yaw);
    tail.translate(x, y, z);
    birds.push(tail);
  }
}

function addWellTrim(stone, wood, wells) {
  for (const [x, z, s] of wells) {
    const g = new THREE.TorusGeometry(0.9 * s, 0.055, 5, 18);
    g.rotateX(Math.PI * 0.5);
    g.translate(x, 0.16, z);
    wood.push(g);
    addBox(stone, 2.2 * s, 0.16, 0.42 * s, x + 1.55 * s, 0.08, z - 0.9 * s, 0.12);
    addBox(stone, 1.1 * s, 0.12, 0.62 * s, x - 1.5 * s, 0.06, z - 0.72 * s);
    const coil = new THREE.TorusGeometry(0.24 * s, 0.045, 5, 12);
    coil.rotateX(Math.PI * 0.5);
    coil.translate(x + 0.6 * s, 0.08, z + 0.95 * s);
    wood.push(coil);
  }
}

export function createFinalPolish({
  houses = [], compounds = [], wells = [], halfX = 128, halfZ = 140,
  wallH = 10, wallT = 7, gateWidth = 15,
} = {}) {
  const group = new THREE.Group();
  group.name = 'pingyao-final-polish';
  const courses = new QuadBatch();
  const caps = [];
  const walk = new QuadBatch();
  const spouts = [];
  const quoins = [];
  const latticeBars = new QuadBatch();
  const studs = [];
  const rings = [];
  const seams = new QuadBatch();
  const stone = [];
  const wood = [];
  const dark = [];
  const clay = [];
  const cloth = [];
  const horse = [];
  const birds = [];
  const rims = [];
  const lanternParts = [];
  const colliders = [];
  const courtyardWells = [];

  __lanternGroup = group;
  addWallMicro(courses, caps, walk, spouts, halfX, halfZ, wallH, wallT, gateWidth);
  addShopCourses(courses, quoins, houses);
  addLatticeAndDoors(latticeBars, studs, rings, houses);
  addLaneSeams(seams);
  const banners = addShopSigns(group, wood, houses);
  addCouplets(group, houses);
  addCourtyardPolish(stone, wood, clay, cloth, dark, lanternParts, compounds, courtyardWells);
  addCarts(wood, dark, cloth, horse, clay, colliders);
  addBaskets(clay, rims, houses);
  addPerchedBirds(birds, halfX, halfZ, wallH);
  addWellTrim(stone, wood, wells);

  for (const [batch, mat] of [[courses, mats.greyBrickDark], [walk, mats.stoneLane], [latticeBars, mats.naxiWoodDark], [seams, mats.greyBrickDark]]) {
    const mesh = batch.build(mat, true, true);
    if (mesh) group.add(mesh);
  }

  const pairs = [
    [caps, mats.roofGreyDark],
    [spouts, mats.stone],
    [quoins, mats.greyBrickDark],
    [studs, mats.gold],
    [rings, mats.bronze],
    [stone, mats.stone],
    [wood, mats.naxiWood],
    [dark, mats.naxiWoodDark],
    [clay, mats.terracotta],
    [cloth, mats.cloth],
    [horse, mats.horse],
    [birds, mats.bird],
    [rims, mats.naxiWood],
    [lanternParts, mats.lanternRed],
  ];
  for (const [list, mat] of pairs) {
    const mesh = mergedMesh(list, mat, true, true);
    if (mesh) group.add(mesh);
  }
  for (const c of courtyardWells) colliders.push({ x: c.x, z: c.z, r: c.r, name: '客栈水井' });

  return {
    group,
    banners,
    colliders,
    stats: {
      courses: courses.count,
      crenellationCaps: caps.length,
      wallWalkSlabs: walk.count,
      latticeBars: latticeBars.count,
      shopSigns: banners.length,
      carts: 3,
      baskets: Math.floor(rims.length / 2),
      innWells: courtyardWells.length,
    },
  };
}

