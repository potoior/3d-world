import * as THREE from 'three';
import { mats, makePlaqueMaterial } from './materials.js';
import { heightAt, platforms } from './terrain.js';
import { spireSpecs, plankRoute, chainRoute } from './peaks.js';
import { mergeGeometryList } from './geometry.js';

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

function addBox(list, w, h, d, x, y, z, ry = 0, rx = 0, rz = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (rx) g.rotateX(rx);
  if (rz) g.rotateZ(rz);
  if (ry) g.rotateY(ry);
  g.translate(x, y, z);
  list.push(g);
}

function addCyl(list, rt, rb, h, seg, x, y, z, rx = 0, rz = 0) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  if (rx) g.rotateX(rx);
  if (rz) g.rotateZ(rz);
  g.translate(x, y, z);
  list.push(g);
}

function segGeo(ax, ay, az, bx, by, bz, ra, rb, seg = 5) {
  const dx = bx - ax;
  const dy = by - ay;
  const dz = bz - az;
  const len = Math.hypot(dx, dy, dz) || 1;
  const g = new THREE.CylinderGeometry(rb, ra, len, seg, 1, false);
  const q = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(dx / len, dy / len, dz / len)
  );
  g.applyQuaternion(q);
  g.translate((ax + bx) * 0.5, (ay + by) * 0.5, (az + bz) * 0.5);
  return g;
}

function localPoint(x, z, yaw, lx, lz) {
  return [
    x + lx * Math.cos(yaw) + lz * Math.sin(yaw),
    z - lx * Math.sin(yaw) + lz * Math.cos(yaw),
  ];
}

function addLadder(list, cx, cy, cz, height, yaw, lean = 0.1, width = 0.6) {
  const hx = Math.sin(yaw) * lean * height * 0.5;
  const hz = Math.cos(yaw) * lean * height * 0.5;
  for (const side of [-1, 1]) {
    const ox = Math.cos(yaw) * side * width * 0.5;
    const oz = -Math.sin(yaw) * side * width * 0.5;
    list.push(segGeo(cx + ox - hx, cy, cz + oz - hz, cx + ox + hx, cy + height, cz + oz + hz, 0.055, 0.055, 5));
  }
  const rungs = Math.max(4, Math.round(height / 0.4));
  for (let i = 1; i < rungs; i++) {
    const k = i / rungs;
    const y = cy + height * k;
    const shift = (k - 0.5) * lean * height;
    const g = new THREE.CylinderGeometry(0.032, 0.032, width + 0.12, 5);
    g.rotateZ(Math.PI * 0.5);
    g.rotateY(yaw);
    g.translate(cx + Math.sin(yaw) * shift, y, cz + Math.cos(yaw) * shift);
    list.push(g);
  }
}

let warningMaterial = null;
function getWarningMaterial() {
  if (warningMaterial) return warningMaterial;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 144;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#d9cba8';
  ctx.fillRect(0, 0, 256, 144);
  ctx.strokeStyle = '#8d2b20';
  ctx.lineWidth = 9;
  ctx.strokeRect(8, 8, 240, 128);
  ctx.fillStyle = '#8d2b20';
  ctx.font = '700 44px "Noto Serif CJK SC", "Songti SC", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('注意安全', 128, 58);
  ctx.font = '700 21px "Helvetica Neue", Arial, sans-serif';
  ctx.fillText('KEEP HOLD · NO CROSSING', 128, 105);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  warningMaterial = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.92,
    metalness: 0,
    side: THREE.DoubleSide,
  });
  return warningMaterial;
}

function addWarningSign(group, lists, x, y, z, yaw, scale = 1) {
  const lx = 1.1 * scale;
  const [, pz1] = localPoint(x, z, yaw, -lx, 0);
  const [px1] = localPoint(x, z, yaw, -lx, 0);
  addBox(lists.wood, 0.12, 2.3 * scale, 0.12, px1, y + 1.1 * scale, pz1);
  const [px2, pz2] = localPoint(x, z, yaw, lx, 0);
  addBox(lists.wood, 0.12, 2.3 * scale, 0.12, px2, y + 1.1 * scale, pz2);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2.1 * scale, 1.15 * scale), getWarningMaterial());
  mesh.position.set(x, y + 1.72 * scale, z);
  mesh.rotation.y = yaw;
  mesh.castShadow = true;
  group.add(mesh);
}

function addGraniteSurface(L) {
  const rand = mulberry32(9101);
  for (const s of spireSpecs) {
    const [cx, cz, , topY, rBottom, rTop] = s;
    const baseY = Math.max(12, heightAt(cx, cz) - 12);
    const h = Math.max(8, topY - baseY);
    for (let k = 1; k <= 8; k++) {
      const f = k / 9;
      const y = baseY + h * f;
      const rad = rBottom + (rTop - rBottom) * f;
      const n = Math.max(5, Math.round(rad / 3.0));
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + k * 0.21 + (rand() - 0.5) * 0.12;
        const w = 0.55 + rand() * 0.95;
        const hh = 0.045 + rand() * 0.065;
        const d = 0.16 + rand() * 0.26;
        const g = new THREE.BoxGeometry(w, hh, d);
        g.rotateY(a + Math.PI * 0.5);
        g.rotateZ((rand() - 0.5) * 0.05);
        g.translate(cx + Math.cos(a) * rad * 1.012, y + (rand() - 0.5) * 0.3, cz + Math.sin(a) * rad * 1.012);
        (i % 2 ? L.graniteDark : L.graniteLight).push(g);
      }
    }
    for (let i = 0; i < 3; i++) {
      const a = rand() * Math.PI * 2;
      const rad = rBottom * (0.82 + rand() * 0.2);
      const y = baseY + h * (0.2 + rand() * 0.55);
      const g = new THREE.BoxGeometry(0.045 + rand() * 0.05, h * (0.08 + rand() * 0.12), 0.055);
      g.rotateY(a);
      g.translate(cx + Math.cos(a) * rad, y, cz + Math.sin(a) * rad);
      L.stoneDark.push(g);
    }
    for (let i = 0; i < 4; i++) {
      const a = rand() * Math.PI * 2;
      const rad = rBottom * (0.84 + rand() * 0.18);
      const y = baseY + h * (0.22 + rand() * 0.5);
      const g = new THREE.BoxGeometry(0.1 + rand() * 0.13, h * (0.08 + rand() * 0.13), 0.03);
      g.rotateY(a);
      g.translate(cx + Math.cos(a) * rad, y, cz + Math.sin(a) * rad);
      L.wet.push(g);
    }
    for (let i = 0; i < 3; i++) {
      const a = rand() * Math.PI * 2;
      const rad = rBottom * (0.78 + rand() * 0.24);
      const y = baseY + h * (0.08 + rand() * 0.28);
      const moss = new THREE.IcosahedronGeometry(0.55 + rand() * 1.25, 0);
      moss.scale(1.4 + rand() * 0.8, 0.22, 1.05 + rand() * 0.5);
      moss.rotateY(rand() * 6.2);
      moss.translate(cx + Math.cos(a) * rad, y, cz + Math.sin(a) * rad);
      (i % 2 ? L.moss : L.mossLight).push(moss);
    }
  }
}

function addGate(L, x, y, z, yaw, w, h, title, subtitle) {
  const depth = 1.7;
  for (const side of [-1, 1]) {
    for (const dz of [-depth * 0.5, depth * 0.5]) {
      const [px, pz] = localPoint(x, z, yaw, side * w * 0.5, dz);
      L.stone.push(new THREE.BoxGeometry(0.62, h, 0.62).translate(px, y + h * 0.5, pz));
      const cap = new THREE.BoxGeometry(0.82, 0.22, 0.82);
      cap.translate(px, y + h + 0.11, pz);
      L.stoneDark.push(cap);
    }
  }
  for (const dz of [-depth * 0.5, depth * 0.5]) {
    const [px, pz] = localPoint(x, z, yaw, 0, dz);
    L.stone.push(new THREE.BoxGeometry(w + 0.9, 0.42, 0.5).translate(px, y + h - 0.3, pz));
    L.stoneDark.push(new THREE.BoxGeometry(w + 1.2, 0.22, 0.62).translate(px, y + h + 0.02, pz));
  }
  for (const side of [-1, 1]) {
    const [px, pz] = localPoint(x, z, yaw, 0, side * 0.72);
    const slope = new THREE.BoxGeometry(w + 2.2, 0.16, 1.45);
    slope.rotateX(side * 0.34);
    slope.rotateY(yaw);
    slope.translate(px, y + h + 0.42, pz);
    L.roof.push(slope);
  }
  const [rx, rz] = localPoint(x, z, yaw, 0, 0);
  L.roof.push(new THREE.BoxGeometry(w + 2.0, 0.16, 0.22).rotateY(yaw).translate(rx, y + h + 0.74, rz));
  for (const side of [-1, 1]) {
    const [px, pz] = localPoint(x, z, yaw, side * (w + 0.9) * 0.5, 0);
    const tip = new THREE.ConeGeometry(0.16, 0.55, 5);
    tip.rotateZ(side * 0.65);
    tip.rotateY(yaw);
    tip.translate(px, y + h + 0.86, pz);
    L.gold.push(tip);
  }
  if (title) {
    const [px, pz] = localPoint(x, z, yaw, 0, depth * 0.5 + 0.06);
    const plaque = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 1.0), makePlaqueMaterial(title, subtitle));
    plaque.position.set(px, y + h - 0.58, pz);
    plaque.rotation.y = yaw;
    plaque.renderOrder = 4;
    L.extras.push(plaque);
  }
}

function addStele(L, x, y, z, yaw, w = 1.0, h = 2.3) {
  L.stoneDark.push(new THREE.BoxGeometry(w, h, 0.4).rotateY(yaw).translate(x, y + h * 0.5 + 0.2, z));
  L.stone.push(new THREE.BoxGeometry(w + 0.55, 0.24, 0.88).rotateY(yaw).translate(x, y + 0.12, z));
  L.stoneDark.push(new THREE.BoxGeometry(w + 0.3, 0.18, 0.56).rotateY(yaw).translate(x, y + h + 0.2, z));
  L.gold.push(new THREE.BoxGeometry(w * 0.62, 0.06, 0.03).rotateY(yaw).translate(x, y + h * 0.62, z + 0.22));
  L.gold.push(new THREE.BoxGeometry(w * 0.46, 0.06, 0.03).rotateY(yaw).translate(x, y + h * 0.46, z + 0.22));
}

function addRack(L, x, y, z, yaw, width, height = 2.25) {
  for (const side of [-1, 1]) {
    const [px, pz] = localPoint(x, z, yaw, side * width * 0.5, 0);
    addCyl(L.wood, 0.085, 0.115, height, 6, px, y + height * 0.5, pz);
    addCyl(L.gold, 0.12, 0.12, 0.1, 6, px, y + height, pz);
  }
  const [cx, cz] = localPoint(x, z, yaw, 0, 0);
  const bar = new THREE.CylinderGeometry(0.075, 0.075, width + 0.2, 6);
  bar.rotateZ(Math.PI * 0.5);
  bar.rotateY(yaw);
  bar.translate(cx, y + height - 0.08, cz);
  L.wood.push(bar);
  return { x: cx, y: y + height - 0.1, z: cz, yaw, width: width - 0.2, count: 16 };
}

function addBench(L, x, y, z, yaw, length = 1.9) {
  L.wood.push(new THREE.BoxGeometry(length, 0.12, 0.48).rotateY(yaw).translate(x, y + 0.52, z));
  for (const side of [-1, 1]) {
    const [px, pz] = localPoint(x, z, yaw, side * (length * 0.5 - 0.22), 0);
    L.wood.push(new THREE.BoxGeometry(0.13, 0.5, 0.42).rotateY(yaw).translate(px, y + 0.25, pz));
  }
}

function addTelescope(L, x, y, z, yaw) {
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    addCyl(L.iron, 0.035, 0.05, 1.2, 5, x + Math.cos(a) * 0.28, y + 0.55, z + Math.sin(a) * 0.28, Math.sin(a) * 0.22, Math.cos(a) * 0.22);
  }
  const tube = new THREE.CylinderGeometry(0.12, 0.16, 0.85, 10);
  tube.rotateZ(Math.PI * 0.5);
  tube.rotateY(yaw);
  tube.translate(x, y + 1.28, z);
  L.iron.push(tube);
  L.bronze.push(new THREE.CylinderGeometry(0.17, 0.17, 0.16, 10).rotateZ(Math.PI * 0.5).rotateY(yaw).translate(x, y + 1.28, z));
}

function addPine(L, x, z, height, seed) {
  const rand = mulberry32(seed);
  const y = heightAt(x, z);
  const lean = 0.8 + rand() * 1.2;
  const dir = rand() * Math.PI * 2;
  const tx = Math.cos(dir) * lean;
  const tz = Math.sin(dir) * lean;
  L.trunk.push(segGeo(x, y - 0.5, z, x + tx * 0.45, y + height * 0.55, z + tz * 0.45, 0.26, 0.15, 5));
  L.trunk.push(segGeo(x + tx * 0.45, y + height * 0.55, z + tz * 0.45, x + tx, y + height * 0.94, z + tz, 0.15, 0.055, 4));
  for (let i = 0; i < 4; i++) {
    const k = i / 3;
    const cx = x + tx * (0.4 + k * 0.6);
    const cz = z + tz * (0.4 + k * 0.6);
    const cy = y + height * (0.55 + k * 0.32);
    const r = height * (0.24 - k * 0.035);
    const cone = new THREE.ConeGeometry(r, height * 0.2, 7, 1, false);
    cone.rotateY(rand() * 6.2);
    cone.translate(cx, cy, cz);
    (i % 2 ? L.pine : L.pineLight).push(cone);
    const sideA = rand() * Math.PI * 2;
    const branch = new THREE.ConeGeometry(r * 0.55, height * 0.15, 6, 1, false);
    branch.rotateZ(0.55);
    branch.rotateY(sideA);
    branch.translate(cx + Math.cos(sideA) * r * 0.7, cy - height * 0.02, cz + Math.sin(sideA) * r * 0.7);
    L.pine.push(branch);
  }
}

function addPlatformDetail(L, racks, peopleSpots) {
  const rand = mulberry32(5151);
  const north = platforms[1];
  const west = platforms[3];

  addGate(L, west.x, west.y + 0.1, west.z + west.r - 2.0, Math.PI, 5.0, 4.1, '西峰', 'WEST PEAK · 2087 M');
  addStele(L, west.x - 7.4, west.y, west.z + 2.6, 0.35, 1.05, 2.4);
  addStele(L, west.x + 6.8, west.y, west.z - 2.2, -0.5, 0.8, 1.9);
  const westRack = addRack(L, west.x - 5.5, west.y, west.z + 6.0, 0.25, 3.2, 2.4);
  racks.push(westRack);
  addBench(L, west.x + 5.8, west.y, west.z + 4.2, -0.45, 2.1);
  addBench(L, west.x - 2.0, west.y, west.z + 9.0, 0.1, 1.8);
  addBench(L, west.x + 9.0, west.y, west.z - 4.0, 1.25, 1.9);
  addTelescope(L, west.x + 3.0, west.y, west.z + 8.2, -0.7);
  for (let i = 0; i < 5; i++) {
    const a = -0.7 + i * 1.35;
    const x = west.x + Math.cos(a) * (west.r + 3.2);
    const z = west.z + Math.sin(a) * (west.r + 2.6);
    addPine(L, x, z, 5.2 + rand() * 3.6, 7100 + i);
  }
  for (let i = 0; i < 5; i++) {
    const a = 0.4 + i * 1.2;
    peopleSpots.push({
      x: west.x + Math.cos(a) * (west.r * 0.55),
      y: west.y,
      z: west.z + Math.sin(a) * (west.r * 0.55),
      yaw: -a + Math.PI * 0.5,
      phase: i * 1.3,
    });
  }

  addStele(L, north.x + 6.2, north.y, north.z + 5.2, 0.2, 0.95, 2.2);
  addStele(L, north.x - 5.4, north.y, north.z + 7.4, -0.25, 0.75, 1.8);
  const northRack = addRack(L, north.x + 4.4, north.y, north.z + 1.4, -0.35, 2.9, 2.3);
  racks.push(northRack);
  addBench(L, north.x - 4.0, north.y, north.z + 2.0, 0.5, 1.9);
  addBench(L, north.x + 9.0, north.y, north.z - 3.5, -1.0, 1.8);
  addTelescope(L, north.x - 7.2, north.y, north.z + 2.6, 0.8);
  for (let i = 0; i < 4; i++) {
    const a = 1.6 + i * 1.25;
    const x = north.x + Math.cos(a) * (north.r + 1.8);
    const z = north.z + Math.sin(a) * (north.r + 1.6);
    addPine(L, x, z, 4.6 + rand() * 3.4, 7200 + i);
  }
  for (let i = 0; i < 4; i++) {
    const a = 0.8 + i * 1.45;
    peopleSpots.push({
      x: north.x + Math.cos(a) * (north.r * 0.5),
      y: north.y,
      z: north.z + Math.sin(a) * (north.r * 0.5),
      yaw: a + Math.PI * 0.5,
      phase: i * 1.7 + 2.0,
    });
  }
}

function addWalkwayMicro(L, group) {
  const rand = mulberry32(9632);
  const curve = new THREE.CatmullRomCurve3(
    plankRoute.map((p) => new THREE.Vector3(p[0], p[1], p[2])),
    false,
    'centripetal',
    0.5
  );
  const length = Math.max(1, curve.getLength());
  const boardCount = Math.max(150, Math.round(length / 0.42));
  for (let i = 0; i < boardCount; i++) {
    const t = (i + 0.5) / boardCount;
    const p = curve.getPointAt(t);
    const tan = curve.getTangentAt(t);
    const yaw = Math.atan2(tan.x, tan.z);
    const nx = tan.z;
    const nz = -tan.x;
    if (i % 2 === 0) {
      for (const side of [-1, 1]) {
        addBox(L.iron, 0.06, 0.028, 0.09,
          p.x + nx * side * 0.39, p.y + 0.058, p.z + nz * side * 0.39, yaw);
      }
    }
    if (i % 6 === 0) {
      for (const side of [-1, 1]) {
        addCyl(L.iron, 0.022, 0.028, 0.1, 5,
          p.x + nx * side * 0.44, p.y + 0.075, p.z + nz * side * 0.44);
      }
    }
    if (i % 12 === 5) {
      addBox(L.iron, 0.28, 0.1, 0.12, p.x - nx * 0.56, p.y - 0.22, p.z - nz * 0.56, yaw);
      addBox(L.iron, 0.16, 0.16, 0.1, p.x - nx * 1.15, p.y + 1.9, p.z - nz * 1.15, yaw);
      L.iron.push(segGeo(
        p.x - nx * 0.58, p.y - 0.18, p.z - nz * 0.58,
        p.x - nx * 1.13, p.y + 1.88, p.z - nz * 1.13, 0.024, 0.024, 4
      ));
    }
  }
  const chainSteps = 44;
  let prev = null;
  for (let i = 0; i <= chainSteps; i++) {
    const t = i / chainSteps;
    const p = curve.getPointAt(Math.min(1, t));
    const tan = curve.getTangentAt(Math.min(1, t));
    const nx = tan.z;
    const nz = -tan.x;
    const x = p.x + nx * 0.62;
    const y = p.y - 0.42;
    const z = p.z + nz * 0.62;
    if (prev) {
      L.iron.push(segGeo(prev[0], prev[1], prev[2], x, y, z, 0.023, 0.023, 4));
    }
    prev = [x, y, z];
  }
  for (const t of [0.36, 0.73]) {
    const p = curve.getPointAt(t);
    const tan = curve.getTangentAt(t);
    const yaw = Math.atan2(tan.x, tan.z);
    const nx = tan.z;
    const nz = -tan.x;
    addLadder(L.iron, p.x - nx * 1.15, p.y - 6.1, p.z - nz * 1.15, 6.6, yaw + Math.PI * 0.5, 0.07, 0.6);
    addCyl(L.iron, 0.09, 0.11, 0.2, 6, p.x - nx * 1.18, p.y - 0.02, p.z - nz * 1.18);
  }
  const signT = 0.52;
  const sp = curve.getPointAt(signT);
  const st = curve.getTangentAt(signT);
  const syaw = Math.atan2(st.x, st.z);
  const snx = st.z;
  const snz = -st.x;
  addWarningSign(group, L, sp.x - snx * 1.65, sp.y + 0.1, sp.z - snz * 1.65, syaw, 0.92);
}

function addChainRouteMicro(L, group) {
  const rand = mulberry32(7745);
  const top = chainRoute.top;
  const bottom = chainRoute.bottom;
  const points = [];
  const count = 30;
  for (let i = 0; i <= count; i++) {
    const u = i / count;
    const bow = Math.sin(u * Math.PI) * 5.5;
    const x = top[0] + (bottom[0] - top[0]) * u + bow;
    const z = top[1] + (bottom[1] - top[1]) * u - bow * 0.35;
    points.push(new THREE.Vector3(x, heightAt(x, z) + 1.15, z));
  }
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz) || 1;
    const tx = dx / len;
    const tz = dz / len;
    const nx = tz;
    const nz = -tx;
    const yaw = Math.atan2(tx, tz);
    if (i % 2 === 1) {
      addBox(L.iron, 0.72, 0.08, 0.22, a.x, a.y + 0.08, a.z, yaw);
    }
    if (i % 3 === 0) {
      for (const side of [-1, 1]) {
        const g = new THREE.TorusGeometry(0.16, 0.028, 4, 10);
        g.rotateY(yaw);
        g.translate(a.x + nx * side * 0.92, a.y + 1.52, a.z + nz * side * 0.92);
        L.iron.push(g);
      }
    }
    if (i % 5 === 0) {
      addCyl(L.iron, 0.035, 0.045, 1.35, 5, a.x + nx * 0.92, a.y + 0.68, a.z + nz * 0.92);
      addCyl(L.iron, 0.07, 0.09, 0.12, 5, a.x + nx * 0.92, a.y + 1.38, a.z + nz * 0.92);
    }
    for (const side of [-1, 1]) {
      const ox = nx * side * 1.0;
      const oz = nz * side * 1.0;
      L.iron.push(segGeo(
        a.x + ox, a.y + 0.42, a.z + oz,
        b.x + ox, b.y + 0.42, b.z + oz, 0.018, 0.018, 4
      ));
    }
  }
  const mid = points[Math.floor(count * 0.55)];
  const midNext = points[Math.floor(count * 0.55) + 2];
  const myaw = Math.atan2(midNext.x - mid.x, midNext.z - mid.z);
  addLadder(L.iron, mid.x, mid.y - 0.4, mid.z, 4.7, myaw, 0.06, 0.56);
  const topP = points[0];
  addWarningSign(group, L, topP.x, topP.y + 0.15, topP.z + 0.4, myaw, 0.85);
}

function addPerchedBirds(L) {
  const west = platforms[3];
  const north = platforms[1];
  const spots = [
    [west.x - 2.2, west.y + 4.85, west.z + west.r - 2.2, 0.3],
    [west.x + 1.6, west.y + 4.85, west.z + west.r - 2.2, -0.2],
    [north.x - 8.0, north.y + 0.7, north.z + 2.5, 0.6],
    [north.x - 6.6, north.y + 0.7, north.z + 3.2, -0.4],
    [north.x + 2.0, north.y + 1.32, north.z + north.r - 0.4, 0.1],
    [north.x - 1.8, north.y + 1.32, north.z + north.r - 0.4, -0.5],
  ];
  for (const [x, y, z, yaw] of spots) {
    const body = new THREE.SphereGeometry(0.1, 5, 4);
    body.scale(0.7, 0.65, 1.55);
    body.rotateY(yaw);
    body.translate(x, y, z);
    L.bird.push(body);
    const tail = new THREE.ConeGeometry(0.055, 0.26, 4);
    tail.rotateX(Math.PI * 0.5);
    tail.rotateY(yaw);
    tail.translate(x, y, z - 0.16);
    L.bird.push(tail);
    const head = new THREE.SphereGeometry(0.06, 5, 4);
    head.translate(x, y + 0.08, z + 0.12);
    L.bird.push(head);
  }
}

export function createFinalPolish() {
  const group = new THREE.Group();
  group.name = 'huashan-final-polish';
  const L = {
    granite: [],
    graniteDark: [],
    graniteLight: [],
    stone: [],
    stoneDark: [],
    wood: [],
    iron: [],
    gold: [],
    bronze: [],
    roof: [],
    trunk: [],
    pine: [],
    pineLight: [],
    moss: [],
    mossLight: [],
    wet: [],
    bird: [],
    extras: [],
  };
  const ribbonRacks = [];
  const peopleSpots = [];

  const stoneDarkBase = L.stoneDark.length;
  const wetBase = L.wet.length;
  const mossBase = L.moss.length + L.mossLight.length;
  const strataBase = L.graniteLight.length + L.graniteDark.length;
  addGraniteSurface(L);
  const cracks = L.stoneDark.length - stoneDarkBase;
  const wetStreaks = L.wet.length - wetBase;
  const mossPatches = L.moss.length + L.mossLight.length - mossBase;
  const strataBands = L.graniteLight.length + L.graniteDark.length - strataBase;
  addPlatformDetail(L, ribbonRacks, peopleSpots);
  addWalkwayMicro(L, group);
  addChainRouteMicro(L, group);
  addPerchedBirds(L);
  const missingRoot = group;

  const pairs = [
    [L.granite, mats.granite],
    [L.graniteDark, mats.graniteDark],
    [L.graniteLight, mats.graniteLight],
    [L.stone, mats.stone],
    [L.stoneDark, mats.stoneDark],
    [L.wood, mats.wood],
    [L.iron, mats.iron],
    [L.gold, mats.gold],
    [L.bronze, mats.bronze],
    [L.roof, mats.roof],
    [L.trunk, mats.trunk],
    [L.pine, mats.pine],
    [L.pineLight, mats.pineLight],
    [L.moss, mats.shrub],
    [L.mossLight, mats.shrubLight],
    [L.wet, mats.stoneDark],
    [L.bird, mats.bird],
  ];
  for (const [list, mat] of pairs) {
    if (!list.length) continue;
    const geo = mergeGeometryList(list);
    if (!geo) continue;
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = mat !== mats.shrub && mat !== mats.shrubLight && mat !== mats.bird;
    mesh.receiveShadow = true;
    missingRoot.add(mesh);
  }
  for (const extra of L.extras) missingRoot.add(extra);

  return {
    group: missingRoot,
    ribbonRacks,
    peopleSpots,
    stats: {
      strataBands,
      cracks,
      wetStreaks,
      mossPatches,
      walkwayBoards: 150,
      walkwayHardware: L.iron.length,
      chains: 44,
      platforms: 2,
      steles: 4,
      pines: 9,
      signs: 2,
      birds: 6,
      ribbonRacks: ribbonRacks.length,
    },
  };
}

