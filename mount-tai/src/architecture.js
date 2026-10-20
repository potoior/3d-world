import * as THREE from 'three';
import { mats, makePlaqueMaterial } from './materials.js';
import { heightAt, trailSamples, platforms, smoothstep } from './terrain.js';
import { mergeGeometryList } from './geometry.js';

function frameAt(index) {
  const n = trailSamples.length;
  const s = trailSamples[Math.max(0, Math.min(n - 1, index))];
  const a = trailSamples[Math.max(0, index - 1)];
  const b = trailSamples[Math.min(n - 1, index + 1)];
  let tx = b.x - a.x;
  let tz = b.z - a.z;
  const len = Math.hypot(tx, tz) || 1;
  tx /= len;
  tz /= len;
  return { s, tx, tz, nx: -tz, nz: tx, yaw: Math.atan2(tx, tz) };
}

function localBox(list, w, h, d, lx, ly, lz, ox, oy, oz, yaw = 0, rx = 0, rz = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (rx) g.rotateX(rx);
  if (rz) g.rotateZ(rz);
  g.translate(lx, ly, lz);
  if (yaw) g.rotateY(yaw);
  g.translate(ox, oy, oz);
  list.push(g);
}

function localCyl(list, rt, rb, h, seg, lx, ly, lz, ox, oy, oz, yaw = 0, rx = 0, rz = 0) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg, 1, false);
  if (rx) g.rotateX(rx);
  if (rz) g.rotateZ(rz);
  g.translate(lx, ly, lz);
  if (yaw) g.rotateY(yaw);
  g.translate(ox, oy, oz);
  list.push(g);
}

function localSphere(list, r, lx, ly, lz, ox, oy, oz, yaw = 0, ws = 8, hs = 6) {
  const g = new THREE.SphereGeometry(r, ws, hs);
  g.translate(lx, ly, lz);
  if (yaw) g.rotateY(yaw);
  g.translate(ox, oy, oz);
  list.push(g);
}

function roofGeometry(w, d, h, lift = 0.5, segX = 14, segZ = 9) {
  const pos = [];
  const uv = [];
  const idx = [];
  for (let iz = 0; iz <= segZ; iz++) {
    const vz = (iz / segZ) * 2 - 1;
    for (let ix = 0; ix <= segX; ix++) {
      const vx = (ix / segX) * 2 - 1;
      const zf = Math.abs(vz);
      const xf = Math.abs(vx);
      let y = h * (1 - Math.pow(zf, 1.18));
      y *= 1 - smoothstep(0.52, 0.99, xf) * 0.72;
      y += lift * smoothstep(0.4, 1, xf) * Math.pow(zf, 1.8) * 1.15;
      y += h * 0.045 * Math.pow(xf, 3.2) * (1 - zf * 0.35);
      pos.push(vx * w * 0.5, y, vz * d * 0.5);
      uv.push(ix / segX, iz / segZ);
    }
  }
  for (let iz = 0; iz < segZ; iz++) {
    for (let ix = 0; ix < segX; ix++) {
      const a = iz * (segX + 1) + ix;
      const b = a + 1;
      const c = a + segX + 1;
      const e = c + 1;
      idx.push(a, c, b, b, c, e);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

function addRoof(parts, ox, oy, oz, yaw, w, d, h, lift = 0.55) {
  const g = roofGeometry(w, d, h, lift);
  g.rotateY(yaw);
  g.translate(ox, oy, oz);
  parts.roof.push(g);
  localBox(parts.gold, w * 0.56, 0.16, 0.24, 0, h + 0.04, 0, ox, oy, oz, yaw);
  for (const side of [-1, 1]) {
    localBox(parts.roof, 0.42, 0.24, 0.42, side * w * 0.285, h + 0.08, 0, ox, oy, oz, yaw);
    localCyl(parts.roof, 0.09, 0.14, 0.65, 6, side * w * 0.285, h + 0.28, 0, ox, oy, oz, yaw, 0, side * 0.45);
  }
  for (const [lx, lz] of [[-w / 2, -d / 2], [-w / 2, d / 2], [w / 2, -d / 2], [w / 2, d / 2]]) {
    localCyl(parts.gold, 0.04, 0.09, 0.55, 5, lx, 0.24, lz, ox, oy, oz, yaw, 0, lx > 0 ? -0.7 : 0.7);
  }
}

function addCenser(parts, x, y, z, scale = 1) {
  localCyl(parts.bronze, 1.05 * scale, 0.72 * scale, 0.95 * scale, 12, 0, 0.95 * scale, 0, x, y, z);
  localCyl(parts.bronze, 1.14 * scale, 1.08 * scale, 0.22 * scale, 12, 0, 1.5 * scale, 0, x, y, z);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI * 0.25;
    localCyl(parts.bronze, 0.12 * scale, 0.17 * scale, 0.85 * scale, 6, Math.cos(a) * 0.62 * scale, 0.4 * scale, Math.sin(a) * 0.62 * scale, x, y, z);
  }
  for (const side of [-1, 1]) {
    const g = new THREE.TorusGeometry(0.42 * scale, 0.07 * scale, 5, 10, Math.PI);
    g.rotateZ(Math.PI * 0.5);
    g.rotateY(side > 0 ? 0 : Math.PI);
    g.translate(side * 1.03 * scale, 1.45 * scale, 0);
    g.rotateY(0);
    g.translate(x, y, z);
    parts.bronze.push(g);
  }
  localBox(parts.gold, 1.9 * scale, 0.08 * scale, 0.18 * scale, 0, 1.54 * scale, 0, x, y, z);
}

function addGate(parts, x, y, z, yaw, w, h, plaque, plaqueW) {
  const colH = h;
  for (const side of [-1, 1]) {
    for (const dz of [-1.55, 1.55]) {
      localBox(parts.stone, 1.55, 0.46, 1.35, side * w * 0.5, 0.23, dz, x, y, z, yaw);
      localCyl(parts.pillar, 0.26, 0.32, colH, 8, side * w * 0.5, colH * 0.5 + 0.35, dz, x, y, z);
      localCyl(parts.gold, 0.34, 0.38, 0.2, 8, side * w * 0.5, colH + 0.36, dz, x, y, z);
    }
  }
  localBox(parts.pillar, w + 0.9, 0.42, 0.34, 0, colH + 0.12, 1.55, x, y, z, yaw);
  localBox(parts.pillar, w + 0.9, 0.42, 0.34, 0, colH + 0.12, -1.55, x, y, z, yaw);
  localBox(parts.pillar, w + 1.3, 0.46, 0.4, 0, colH + 0.76, 1.55, x, y, z, yaw);
  localBox(parts.pillar, w + 1.3, 0.46, 0.4, 0, colH + 0.76, -1.55, x, y, z, yaw);
  localBox(parts.gold, w + 1.8, 0.16, 0.5, 0, colH + 1.08, 0, x, y, z, yaw);
  addRoof(parts, x, y + colH + 1.15, z, yaw, w + 3.2, 4.6, 2.3, 0.6);
  for (const side of [-1, 1]) {
    localCyl(parts.wood, 0.03, 0.03, 0.7, 4, side * (w * 0.5 - 0.55), colH - 0.2, 1.9, x, y, z, yaw);
    localSphere(parts.lantern, 0.28, side * (w * 0.5 - 0.55), colH - 0.72, 1.9, x, y, z, yaw, 8, 6);
    localCyl(parts.gold, 0.12, 0.15, 0.12, 6, side * (w * 0.5 - 0.55), colH - 0.44, 1.9, x, y, z, yaw);
  }
  if (plaque) {
    const mat = makePlaqueMaterial(plaque, plaqueW || 'TAISHAN');
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.2), mat);
    const fx = Math.sin(yaw) * 1.77;
    const fz = Math.cos(yaw) * 1.77;
    plane.position.set(x + fx, y + colH + 0.42, z + fz);
    plane.rotation.y = yaw;
    plane.renderOrder = 4;
    parts.extras.push(plane);
  }
}

function addHall(parts, x, y, z, yaw, w, d, wallH, roofH, opts = {}) {
  const baseH = opts.baseH ?? 0.55;
  localBox(parts.stone, w + 1.1, baseH, d + 1.1, 0, baseH * 0.5, 0, x, y, z, yaw);
  localBox(parts.redWall, w, wallH, d, 0, baseH + wallH * 0.5, 0, x, y, z, yaw);
  const front = d * 0.5 + 0.02;
  localBox(parts.wood, w * 0.34, wallH * 0.66, 0.16, 0, baseH + wallH * 0.33, front, x, y, z, yaw);
  localBox(parts.gold, w * 0.38, 0.18, 0.22, 0, baseH + wallH * 0.7, front + 0.02, x, y, z, yaw);
  const cols = opts.columns ?? 4;
  for (let i = 0; i < cols; i++) {
    const lx = -w * 0.5 + 0.5 + (i / (cols - 1)) * (w - 1);
    localCyl(parts.pillar, 0.18, 0.23, wallH, 7, lx, baseH + wallH * 0.5, front + 0.26, x, y, z, yaw);
  }
  if (opts.sideColumns) {
    for (const side of [-1, 1]) {
      localCyl(parts.pillar, 0.17, 0.21, wallH, 7, side * (w * 0.5 + 0.28), baseH + wallH * 0.5, 0, x, y, z, yaw);
    }
  }
  addRoof(parts, x, y + baseH + wallH + 0.06, z, yaw, w + 2.2, d + 1.9, roofH, 0.62);
  for (const side of [-1, 1]) {
    localSphere(parts.lantern, 0.24, side * (w * 0.5 - 0.7), baseH + wallH - 0.38, front + 0.48, x, y, z, yaw, 8, 6);
  }
}

function addRack(parts, x, y, z, yaw, width, height = 2.3) {
  for (const side of [-1, 1]) {
    localCyl(parts.wood, 0.09, 0.12, height, 6, side * width * 0.5, height * 0.5, 0, x, y, z, yaw);
    localCyl(parts.gold, 0.13, 0.13, 0.12, 6, side * width * 0.5, height, 0, x, y, z, yaw);
  }
  localCyl(parts.wood, 0.08, 0.08, width + 0.2, 6, 0, height - 0.08, 0, x, y, z, yaw, 0, Math.PI * 0.5);
}

function addStele(parts, x, y, z, yaw, w = 1.0, h = 2.3) {
  localBox(parts.stoneDark, w, h, 0.42, 0, h * 0.5 + 0.18, 0, x, y, z, yaw);
  localBox(parts.stone, w + 0.5, 0.26, 0.86, 0, 0.13, 0, x, y, z, yaw);
  localBox(parts.stoneDark, w + 0.28, 0.18, 0.58, 0, h + 0.18, 0, x, y, z, yaw);
  localBox(parts.gold, w * 0.62, 0.07, 0.03, 0, h * 0.62, 0.225, x, y, z, yaw);
  localBox(parts.gold, w * 0.46, 0.07, 0.03, 0, h * 0.45, 0.225, x, y, z, yaw);
}

function addLanternPost(parts, x, y, z, side, yaw) {
  localCyl(parts.wood, 0.08, 0.12, 2.5, 6, 0, 1.25, 0, x, y, z);
  localBox(parts.wood, 0.7, 0.08, 0.08, side * 0.3, 2.42, 0, x, y, z, yaw);
  localSphere(parts.lantern, 0.3, side * 0.62, 2.08, 0, x, y, z, 0, 8, 6);
  localCyl(parts.gold, 0.1, 0.14, 0.16, 6, side * 0.62, 2.38, 0, x, y, z);
  localCyl(parts.gold, 0.04, 0.04, 0.3, 4, side * 0.62, 2.62, 0, x, y, z);
}

function addInscriptionRock(parts, x, y, z, yaw, width, height, material) {
  localBox(parts.stoneDark, width + 0.5, height + 0.5, 0.7, 0, height * 0.5, 0, x, y, z, yaw);
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  plane.position.set(x + Math.sin(yaw) * 0.37, y + height * 0.5 + 0.15, z + Math.cos(yaw) * 0.37);
  plane.rotation.y = yaw;
  parts.extras.push(plane);
}

export function createArchitecture() {
  const group = new THREE.Group();
  group.name = 'taishan-architecture';
  const parts = {
    stone: [], stoneDark: [], redWall: [], pillar: [], roof: [], wood: [],
    gold: [], bronze: [], lantern: [], extras: [],
  };
  const smokeEmitters = [];
  const ribbonRacks = [];
  const stats = { gates: 0, halls: 0, steles: 0, censers: 0, lanterns: 0, inscriptions: 0 };

  const gateDefs = [
    { t: 0.018, w: 12.5, h: 5.4, name: '红门', plaque: '红门', sub: 'RED GATE' },
    { t: 0.37, w: 11.2, h: 5.0, name: '中天门', plaque: '中天门', sub: 'MIDWAY GATE' },
    { t: 0.61, w: 7.4, h: 4.2, name: '升仙坊', plaque: '升仙坊', sub: 'ASCENT ARCH' },
    { t: 0.905, w: 13.2, h: 6.0, name: '南天门', plaque: '南天门', sub: 'NANTIAN GATE' },
  ];
  for (const gd of gateDefs) {
    const idx = Math.round(gd.t * (trailSamples.length - 1));
    const f = frameAt(idx);
    const s = f.s;
    const facing = Math.atan2(-f.tx, -f.tz);
    const named = gd.name === '南天门' ? gd.plaque : null;
    addGate(parts, s.x, s.y + 0.05, s.z, facing, gd.w, gd.h, named, named ? gd.sub : null);
    stats.gates++;
    if (named) stats.lanterns += 2;
    if (gd.name === '红门' || gd.name === '中天门' || gd.name === '南天门') {
      const off = gd.w * 0.5 + 2.1;
      const rx = s.x + f.nx * off;
      const rz = s.z + f.nz * off;
      addRack(parts, rx, s.y + 0.05, rz, facing + Math.PI * 0.5, 3.4, 2.4);
      ribbonRacks.push({ x: rx, y: s.y + 2.32, z: rz, yaw: facing + Math.PI * 0.5, width: 3.1, count: 18 });
      addStele(parts, s.x - f.nx * off, s.y + 0.05, s.z - f.nz * off, facing + 0.1);
      stats.steles++;
      if (gd.name !== '红门') {
        addCenser(parts, s.x - f.nx * (off - 0.4), s.y + 0.18, s.z - f.nz * (off - 0.4), 0.85);
        smokeEmitters.push({ x: s.x - f.nx * (off - 0.4), y: s.y + 1.6, z: s.z - f.nz * (off - 0.4), scale: 0.9 });
        stats.censers++;
      }
    }
  }

  const summit = platforms[3];
  addHall(parts, summit.x + 8.0, summit.y, summit.z - 7.0, 0, 12.4, 6.6, 4.1, 3.2, { columns: 5, sideColumns: true });
  addHall(parts, summit.x - 3.4, summit.y, summit.z - 10.0, 0.12, 5.0, 3.8, 2.8, 2.1, { columns: 3 });
  addHall(parts, summit.x + 16.6, summit.y, summit.z - 8.6, -0.1, 5.0, 3.8, 2.8, 2.1, { columns: 3 });
  addHall(parts, summit.x + 8.0, summit.y, summit.z + 1.4, 0, 6.4, 3.2, 3.0, 2.2, { columns: 3 });
  stats.halls += 4;
  addCenser(parts, summit.x + 8.0, summit.y + 0.1, summit.z - 2.4, 1.05);
  smokeEmitters.push({ x: summit.x + 8.0, y: summit.y + 1.75, z: summit.z - 2.4, scale: 1.35 });
  stats.censers++;
  for (const [sx, sz] of [[summit.x - 8.5, summit.z - 2.0], [summit.x + 20.2, summit.z - 1.4]]) {
    addRack(parts, sx, summit.y, sz, 0.2, 3.0, 2.5);
    ribbonRacks.push({ x: sx, y: summit.y + 2.42, z: sz, yaw: 0.2, width: 2.7, count: 16 });
    addStele(parts, sx + 0.4, summit.y, sz - 2.2, 0.1, 0.85, 2.0);
    stats.steles++;
  }
  addStele(parts, summit.x - 7.6, summit.y, summit.z + 5.8, 0.25, 1.2, 2.6);
  stats.steles++;
  const templePlaque = new THREE.Mesh(
    new THREE.PlaneGeometry(3.6, 1.28),
    makePlaqueMaterial('碧霞祠', 'BIXIA SHRINE')
  );
  templePlaque.position.set(summit.x + 8.0, summit.y + 5.2, summit.z - 3.2);
  templePlaque.rotation.y = 0;
  templePlaque.renderOrder = 4;
  parts.extras.push(templePlaque);

  const sunrise = platforms[4];
  addInscriptionRock(parts, sunrise.x + 7.5, heightAt(sunrise.x + 7.5, sunrise.z + 1.2) + 0.1, sunrise.z + 1.2, Math.PI + 0.28, 5.2, 2.1, mats.inscriptionA);
  stats.inscriptions++;
  addStele(parts, sunrise.x - 6.4, heightAt(sunrise.x - 6.4, sunrise.z + 2.2), sunrise.z + 2.2, 0.3, 1.0, 2.2);
  stats.steles++;

  for (const [t, side, matIdx] of [[0.52, 1, 1], [0.735, -1, 0]]) {
    const f = frameAt(Math.round(t * (trailSamples.length - 1)));
    const s = f.s;
    const off = s.width * 0.5 + 3.4;
    const x = s.x + f.nx * side * off;
    const z = s.z + f.nz * side * off;
    const facing = Math.atan2(-f.nx * side, -f.nz * side);
    addInscriptionRock(parts, x, heightAt(x, z) + 0.2, z, facing, 4.6, 1.9, matIdx ? mats.inscriptionB : mats.inscriptionA);
    stats.inscriptions++;
  }

  const lanternTs = [0.43, 0.49, 0.55, 0.66, 0.72, 0.78, 0.84, 0.89];
  for (let i = 0; i < lanternTs.length; i++) {
    const f = frameAt(Math.round(lanternTs[i] * (trailSamples.length - 1)));
    const s = f.s;
    const side = i % 2 ? 1 : -1;
    const off = s.width * 0.5 + 0.95;
    addLanternPost(parts, s.x + f.nx * side * off, s.y + 0.08, s.z + f.nz * side * off, side, f.yaw);
    stats.lanterns++;
  }

  const materialMap = {
    stone: mats.stone,
    stoneDark: mats.stoneDark,
    redWall: mats.redWall,
    pillar: mats.redPillar,
    roof: mats.roof,
    wood: mats.wood,
    gold: mats.gold,
    bronze: mats.bronze,
    lantern: mats.lantern,
  };
  for (const [key, list] of Object.entries(materialMap)) {
    if (!parts[key].length) continue;
    const mesh = new THREE.Mesh(mergeGeometryList(parts[key]), list);
    mesh.name = 'taishan-' + key;
    mesh.castShadow = key !== 'roof';
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  for (const extra of parts.extras) group.add(extra);

  return { group, smokeEmitters, ribbonRacks, stats };
}
