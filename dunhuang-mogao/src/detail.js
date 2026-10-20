import * as THREE from 'three';
import { box, cyl, sph, beam, merge, mesh, instanced, paint, seeded } from './geo.js';
import { heightAt, RIDGES } from './terrain.js';
import { LAKE_POLYGON, inLake } from './lake.js';

const tmpColor = new THREE.Color();

function panelGeo(x, y, z, w, h, uvIndex) {
  const g = new THREE.PlaneGeometry(w, h, 1, 1);
  const u0 = (uvIndex % 2) * 0.5;
  const v0 = uvIndex < 2 ? 0.5 : 0;
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, u0 + uv.getX(i) * 0.5, v0 + uv.getY(i) * 0.5);
  }
  g.translate(x, y, z);
  paint(g, '#ffffff');
  return g;
}

function border(stone, x, y, z, w, h, color = '#d3b68c', t = 0.13) {
  stone.push(box(w + t * 2, t, 0.16, color, x, y + h * 0.5 + t * 0.5, z + 0.03));
  stone.push(box(w + t * 2, t, 0.16, color, x, y - h * 0.5 - t * 0.5, z + 0.03));
  stone.push(box(t, h + t * 2, 0.16, color, x - w * 0.5 - t * 0.5, y, z + 0.03));
  stone.push(box(t, h + t * 2, 0.16, color, x + w * 0.5 + t * 0.5, y, z + 0.03));
}

function statue(gold, stone, dark, x, y, z, s, variant) {
  dark.push(box(1.16 * s, 0.18, 0.5, '#160f0a', x, y + 0.06, z + 0.16));
  stone.push(cyl(0.5 * s, 0.58 * s, 0.16 * s, 8, '#caa879', x, y + 0.16 * s, z + 0.22));
  gold.push(cyl(0.3 * s, 0.38 * s, 0.12 * s, 8, '#d3a94f', x, y + 0.3 * s, z + 0.23));
  gold.push(sph(0.28 * s, '#d8b25c', x, y + 0.78 * s, z + 0.23, 0.95, 1.25, 0.78, 7));
  gold.push(sph(0.17 * s, '#e0bb6b', x, y + 1.24 * s, z + 0.24, 0.9, 1.02, 0.9, 7));
  gold.push(cyl(0.2 * s, 0.25 * s, 0.1 * s, 7, '#c79a45', x, y + 1.38 * s, z + 0.24));
  const halo = new THREE.TorusGeometry(0.4 * s, 0.045 * s, 5, 14);
  paint(halo, '#d8b25c');
  halo.translate(x, y + 1.0 * s, z + 0.13);
  gold.push(halo);
  if (variant % 2 === 0) {
    gold.push(cyl(0.07 * s, 0.08 * s, 0.52 * s, 5, '#d8b25c', x - 0.28 * s, y + 0.72 * s, z + 0.34, 0, 0, 0.42));
    gold.push(cyl(0.07 * s, 0.08 * s, 0.52 * s, 5, '#d8b25c', x + 0.28 * s, y + 0.72 * s, z + 0.34, 0, 0, -0.42));
  }
}

function caveReveal(dark, x, y, z, w, h) {
  dark.push(box(w * 0.11, h * 0.94, 0.28, '#1c130c', x - w * 0.47, y + h * 0.47, z + 0.18));
  dark.push(box(w * 0.11, h * 0.94, 0.28, '#1c130c', x + w * 0.47, y + h * 0.47, z + 0.18));
  dark.push(box(w * 0.96, h * 0.09, 0.26, '#24180f', x, y + h * 0.94, z + 0.18));
  dark.push(box(w * 0.98, 0.1, 0.34, '#2a1b11', x, y + 0.03, z + 0.26));
}

function ladder(wood, x, y0, y1, z, lean = 0.5) {
  const z1 = z + lean;
  for (const sx of [-0.35, 0.35]) {
    wood.push(beam([x + sx, y0, z1], [x + sx, y1, z], 0.055, '#7a4a30', 4));
  }
  const n = Math.max(3, Math.round((y1 - y0) / 0.85));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    wood.push(box(0.82, 0.055, 0.075, '#8c5637', x, y0 + (y1 - y0) * t, z1 + (z - z1) * t));
  }
}

function balcony(wood, x, y, z, w) {
  const px = x;
  const py = y - 0.14;
  wood.push(box(w + 2.2, 0.15, 1.16, '#8b5235', px, py, z + 0.68));
  wood.push(box(w + 2.3, 0.1, 0.13, '#a76843', px, py - 0.06, z + 1.24));
  for (const sx of [-1, 1]) {
    wood.push(beam([px + sx * (w * 0.5 + 0.8), py - 0.1, z + 1.18], [px + sx * (w * 0.5 + 0.8), py - 0.62, z + 0.2], 0.07, '#73452d', 4));
  }
  const posts = 5;
  for (let i = 0; i < posts; i++) {
    const bx = px - (w + 1.7) * 0.5 + ((w + 1.7) * i) / (posts - 1);
    wood.push(box(0.07, 0.72, 0.07, '#8b5235', bx, py + 0.36, z + 1.18));
  }
  wood.push(box(w + 1.75, 0.075, 0.09, '#a76843', px, py + 0.73, z + 1.18));
  wood.push(box(w + 1.75, 0.05, 0.06, '#75452d', px, py + 0.38, z + 1.18));
}

function rippleBand(parts, r, x, z, len, width, angle) {
  const pts = [];
  const n = 5;
  for (let i = 0; i <= n; i++) {
    const t = i / n - 0.5;
    const px = x + Math.cos(angle) * len * t - Math.sin(angle) * Math.sin(t * 6.3) * width * 0.25;
    const pz = z + Math.sin(angle) * len * t + Math.cos(angle) * Math.sin(t * 6.3) * width * 0.25;
    pts.push([px, pz]);
  }
  const pos = [];
  const col = [];
  const uv = [];
  const idx = [];
  const c = tmpColor.set(r() > 0.55 ? '#c59a63' : '#d8b27c');
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const l = Math.hypot(dx, dz) || 1;
    const nx = (-dz / l) * width * 0.5;
    const nz = (dx / l) * width * 0.5;
    const x0 = pts[i][0];
    const z0 = pts[i][1];
    pos.push(x0 + nx, heightAt(x0 + nx, z0 + nz) + 0.1, z0 + nz);
    pos.push(x0 - nx, heightAt(x0 - nx, z0 - nz) + 0.1, z0 - nz);
    col.push(c.r, c.g, c.b, c.r, c.g, c.b);
    uv.push(0, i * 0.2, 1, i * 0.2);
    if (i < pts.length - 1) {
      const k = i * 2;
      idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  parts.push(g);
}

function crossing(w, h) {
  const a = new THREE.PlaneGeometry(w, h);
  a.translate(0, h / 2, 0);
  const b = a.clone();
  b.rotateY(Math.PI / 2);
  return merge([a, b]);
}

function buildCliffDetail(refs, parts) {
  const { cliff, stone, wood, gold, dark, mural } = parts;
  const { caves, frontAt, facade } = refs.mogao;
  const r = seeded(7401);

  for (let i = 0; i < caves.length; i++) {
    const c = caves[i];
    const face = frontAt(c.x) + 0.24;
    if (i % 3 === 0) caveReveal(dark, c.x, c.y, face, c.w, c.h);
    if (i % 4 === 1) statue(gold, stone, dark, c.x, c.y + 0.08, face + 0.06, 0.68 + (i % 3) * 0.1, i);
    if (i % 5 === 2 && c.row > 0) balcony(wood, c.x, c.y, face, c.w);
    if (c.row < 4 && i % 9 === 3) {
      const sides = r() > 0.5 ? 1 : -1;
      const px = c.x + sides * (c.w * 0.5 + 1.25);
      const py = c.y + c.h * 0.48;
      cliff.push(box(1.6, c.h * 0.84, 0.12, '#d7bd96', px, py, face + 0.02));
      mural.push(panelGeo(px, py, face + 0.1, 1.28, c.h * 0.68, (i + 1) % 4));
      border(stone, px, py, face + 0.08, 1.28, c.h * 0.68, '#c9aa7e', 0.09);
    }
  }

  const rows = [10.5, 18.5, 27, 35.5, 43];
  for (let row = 0; row < rows.length; row++) {
    for (let k = 0; k < 7; k++) {
      const x = -184 + k * 51 + (r() - 0.5) * 18;
      if (x > 4 && x < 84) continue;
      const w = 2.6 + r() * 1.4;
      const h = 1.9 + r() * 1.0;
      const y = rows[row] + (r() - 0.5) * 1.4;
      const z = frontAt(x) + 0.27 + r() * 0.05;
      cliff.push(box(w + 0.7, h + 0.7, 0.14, '#d9c09a', x, y, z));
      mural.push(panelGeo(x, y, z + 0.09, w, h, (row + k) % 4));
      border(stone, x, y, z + 0.07, w, h, r() > 0.5 ? '#d8bb90' : '#c4a374', 0.11);
    }
  }

  for (let i = 0; i < 42; i++) {
    const x = -192 + r() * 350;
    const y = 3.5 + r() * 42;
    const w = 1.6 + r() * 5.8;
    const h = 1.1 + r() * 5.2;
    const z = frontAt(x) + 0.06;
    const color = ['#d9c3a1', '#cbb08d', '#e0cbaa', '#bda07e', '#d2b995'][(r() * 5) | 0];
    cliff.push(box(w, h, 0.1, color, x, y, z));
    if (r() > 0.5) {
      for (let k = 0; k < 3; k++) {
        const cx = x + (r() - 0.5) * w * 0.8;
        const cy = y + (r() - 0.5) * h * 0.8;
        dark.push(box(0.04 + r() * 0.05, 0.5 + r() * 2.2, 0.035, '#5b4634', cx, cy, z + 0.08, (r() - 0.5) * 0.5));
      }
    }
  }

  for (let i = 0; i < 9; i++) {
    const x = -176 + i * 39;
    const y0 = 5 + (i % 3) * 2.2;
    const y1 = 36 + (i % 2) * 6;
    ladder(wood, x, y0, y1, frontAt(x) + 0.36, 0.62);
  }

  const fx = facade.x;
  for (let i = 0; i < 5; i++) {
    const x = fx - 15 + i * 7.5;
    ladder(wood, x, facade.baseY + 0.4, facade.baseY + 3.6, facade.z + 1.1, 0.25);
  }
  for (let i = 0; i < 4; i++) {
    const x = fx - 13 + i * 8.6;
    const z = facade.z + 2.0;
    wood.push(box(2.3, 0.14, 1.5, '#835033', x, facade.baseY + 0.56, z));
    for (const sx of [-1, 1]) {
      wood.push(box(0.09, 0.66, 0.09, '#8d5738', x + sx * 1.0, facade.baseY + 0.92, z + 0.62));
    }
    wood.push(box(2.15, 0.07, 0.08, '#a76843', x, facade.baseY + 1.22, z + 0.62));
  }
}

function bonePile(stoneParts, x, z, scale, rot) {
  const y = heightAt(x, z) + 0.05;
  const bone = '#d9cdb4';
  const bone2 = '#c3b79f';
  stoneParts.push(sph(0.24 * scale, bone, x, y + 0.22 * scale, z, 1.2, 0.8, 1.5, 6));
  stoneParts.push(box(0.16 * scale, 0.1 * scale, 0.42 * scale, bone2, x + Math.cos(rot) * 0.3 * scale, y + 0.16 * scale, z + Math.sin(rot) * 0.3 * scale, rot));
  for (let i = 0; i < 5; i++) {
    const dx = Math.cos(rot) * (0.45 + i * 0.17) * scale;
    const dz = Math.sin(rot) * (0.45 + i * 0.17) * scale;
    const rr = (0.55 - Math.abs(i - 2) * 0.06) * scale;
    const rib = new THREE.TorusGeometry(rr, 0.024 * scale, 4, 8, Math.PI);
    paint(rib, bone2);
    rib.rotateY(-rot);
    rib.rotateZ(Math.PI * 0.5);
    rib.translate(x + dx, y + 0.05 * scale, z + dz);
    stoneParts.push(rib);
  }
  for (let i = 0; i < 4; i++) {
    const a = rot + i * 1.7;
    stoneParts.push(beam(
      [x + Math.cos(a) * 0.9 * scale, y + 0.12 * scale, z + Math.sin(a) * 0.9 * scale],
      [x + Math.cos(a) * (1.3 + (i % 2) * 0.35) * scale, y + 0.02, z + Math.sin(a) * (1.3 + (i % 2) * 0.35) * scale],
      0.035 * scale, bone, 4
    ));
  }
}

function buildDunesDetail(parts) {
  const { crest, stone } = parts;
  const r = seeded(9951);

  for (let i = 0; i < 250; i++) {
    let x;
    let z;
    do {
      x = -235 + r() * 470;
      z = -20 + r() * 325;
    } while (Math.hypot((x + 58) / 56, (z - 14) / 48) < 1.12 || (x > -210 && x < 170 && z < -96));
    const s = 6 + r() * 22;
    const hx = heightAt(x + 1.5, z) - heightAt(x - 1.5, z);
    const hz = heightAt(x, z + 1.5) - heightAt(x, z - 1.5);
    const angle = Math.atan2(hx, hz) + Math.PI * 0.5;
    rippleBand(crest, r, x, z, s, 0.22 + r() * 0.3, angle + (r() - 0.5) * 0.22);
  }

  for (let i = 0; i < RIDGES.length; i++) {
    const rg = RIDGES[i];
    const curve = new THREE.CatmullRomCurve3(rg.pts.map((p) => new THREE.Vector3(p[0], 0, p[1])), false, 'catmullrom', 0.33);
    const pts = curve.getSpacedPoints(60).map((p) => [p.x, p.z]);
    for (const [off, width, color] of [[-2.6, 0.42, '#e5c48b'], [2.8, 0.32, '#c69a63'], [-5.4, 0.5, '#b78a55']]) {
      const line = pts.map((p, j) => {
        const n = pts[Math.min(pts.length - 1, j + 1)];
        const a = pts[Math.max(0, j - 1)];
        const dx = n[0] - a[0];
        const dz = n[1] - a[1];
        const l = Math.hypot(dx, dz) || 1;
        return [p[0] - (dz / l) * off, p[1] + (dx / l) * off];
      });
      const pos = [];
      const col = [];
      const uv = [];
      const idx = [];
      const c = tmpColor.set(color);
      for (let j = 0; j < line.length; j++) {
        const a = line[Math.max(0, j - 1)];
        const b = line[Math.min(line.length - 1, j + 1)];
        const dx = b[0] - a[0];
        const dz = b[1] - a[1];
        const l = Math.hypot(dx, dz) || 1;
        const nx = (-dz / l) * width * 0.5;
        const nz = (dx / l) * width * 0.5;
        const x0 = line[j][0];
        const z0 = line[j][1];
        pos.push(x0 + nx, heightAt(x0 + nx, z0 + nz) + 0.15, z0 + nz);
        pos.push(x0 - nx, heightAt(x0 - nx, z0 - nz) + 0.15, z0 - nz);
        col.push(c.r, c.g, c.b, c.r, c.g, c.b);
        uv.push(0, j * 0.2, 1, j * 0.2);
        if (j < line.length - 1) {
          const k = j * 2;
          idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(idx);
      g.computeVertexNormals();
      crest.push(g);
    }
  }

  for (let i = 0; i < 78; i++) {
    const x = -228 + r() * 450;
    const z = -30 + r() * 330;
    if (Math.hypot((x + 58) / 58, (z - 14) / 50) < 1.05) continue;
    const y = heightAt(x, z);
    const s = 0.45 + r() * 0.75;
    for (let k = 0; k < 5; k++) {
      const a = r() * 6.3;
      const lean = 0.25 + r() * 0.5;
      crest.push(beam([x, y + 0.02, z], [x + Math.cos(a) * lean * s, y + (0.45 + r() * 0.5) * s, z + Math.sin(a) * lean * s], 0.025, r() > 0.5 ? '#7b6a3d' : '#8d7b47', 4));
    }
  }

  const boneSpots = [[86, 44, 1.0, 0.4], [166, 84, 0.85, 2.1], [-136, 112, 0.9, 3.4], [206, 34, 1.1, 1.2], [54, 168, 0.8, 5.4]];
  for (const [x, z, s, rot] of boneSpots) bonePile(stone, x, z, s, rot);
}

function buildLakeDetail(refs, parts) {
  const { stone, wood, gold, dark } = parts;
  const r = seeded(3357);
  const pav = refs.lake.pavilion;
  const px = pav.x;
  const pz = pav.z;
  const py = pav.y;

  const plaque = box(2.8, 0.62, 0.14, '#3c2417', px, py + 3.5, pz + 4.48);
  dark.push(plaque);
  for (let i = 0; i < 3; i++) {
    gold.push(box(0.24, 0.36, 0.05, '#d8b25c', px - 0.75 + i * 0.75, py + 3.5, pz + 4.57));
    gold.push(box(0.3, 0.05, 0.04, '#d8b25c', px - 0.75 + i * 0.75, py + 3.62, pz + 4.58));
    gold.push(box(0.05, 0.26, 0.04, '#d8b25c', px - 0.75 + i * 0.75, py + 3.5, pz + 4.58));
  }
  for (const sx of [-1, 1]) {
    gold.push(box(0.09, 0.34, 0.09, '#d8b25c', px + sx * 1.52, py + 3.5, pz + 4.47));
  }

  for (let k = 0; k < 3; k++) {
    stone.push(box(4.6 - k * 0.5, 0.22, 0.85, '#ad9b80', px, py - 0.2 - k * 0.2, pz - 4.85 - k * 0.75));
  }
  stone.push(box(5.6, 0.3, 1.2, '#b9a98c', px, py - 0.9, pz - 5.2));

  const brazier = [];
  brazier.push(cyl(0.44, 0.56, 0.3, 10, '#6b5436', px + 2.8, py + 0.18, pz + 5.1));
  brazier.push(cyl(0.5, 0.34, 0.5, 10, '#75603e', px + 2.8, py + 0.6, pz + 5.1));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    gold.push(cyl(0.035, 0.035, 0.62, 4, '#b08a4c', px + 2.8 + Math.cos(a) * 0.55, py + 0.35, pz + 5.1 + Math.sin(a) * 0.55, 0, 0, 0.18));
  }
  gold.push(cyl(0.42, 0.46, 0.08, 10, '#b08a4c', px + 2.8, py + 0.9, pz + 5.1));
  gold.push(sph(0.1, '#c9a04e', px + 2.8, py + 1.0, pz + 5.1, 1, 1.4, 1, 6));
  stone.push(merge(brazier));

  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const lx = px + sx * 4.9;
    const lz = pz + sz * 4.9;
    gold.push(cyl(0.02, 0.02, 0.32, 4, '#c9a04e', lx, py + 3.86, lz));
    wood.push(box(0.22, 0.55, 0.22, '#7b4a31', lx, py + 4.18, lz));
  }

  for (const [x, z, rot] of [[-72, 58, 0.4], [-108, 40, 2.6]]) {
    stone.push(box(1.1, 2.2, 0.5, '#b1a289', x, 1.1, z, rot));
    dark.push(box(0.62, 1.15, 0.06, '#45392c', x + Math.sin(rot) * 0.28, 1.32, z + Math.cos(rot) * 0.28, rot));
    for (let i = 0; i < 3; i++) {
      gold.push(box(0.2, 0.18, 0.03, '#b08a4c', x + Math.sin(rot) * 0.32, 1.7 - i * 0.36, z + Math.cos(rot) * 0.32, rot));
    }
    stone.push(box(1.35, 0.18, 0.75, '#9c8c72', x, 0.12, z, rot));
  }

  const reedGeo = crossing(1.35, 2.3);
  const reeds = [];
  for (let i = 0; i < LAKE_POLYGON.length; i += 2) {
    const p = LAKE_POLYGON[i];
    const q = LAKE_POLYGON[(i + 5) % LAKE_POLYGON.length];
    const dx = q[0] - p[0];
    const dz = q[1] - p[1];
    const l = Math.hypot(dx, dz) || 1;
    const nx = -dz / l;
    const nz = dx / l;
    for (let k = 0; k < 2; k++) {
      const d = 2.2 + r() * 4.8;
      const x = p[0] + nx * d + (r() - 0.5) * 3;
      const z = p[1] + nz * d + (r() - 0.5) * 3;
      if (inLake(x, z) || (x > -96 && x < -78 && z > 42 && z < 60)) continue;
      reeds.push({ p: [x, 0.02, z], r: [0, r() * 6.3, 0], s: [0.75 + r() * 1.1, 0.7 + r() * 1.2, 0.75 + r() * 1.1] });
    }
  }
  for (let i = 0; i < 70; i++) {
    const x = -112 + r() * 100;
    const z = 38 + r() * 30;
    if (inLake(x, z) || (x > -98 && x < -86 && z > 45 && z < 57)) continue;
    reeds.push({ p: [x, 0.02, z], r: [0, r() * 6.3, 0], s: [0.65 + r() * 0.9, 0.6 + r() * 1.1, 0.65 + r() * 0.9] });
  }
  const reedMesh = instanced(reedGeo, refs.materials.reed, reeds, false, true);
  return { reedMesh, reedCount: reeds.length, brazier: { x: px + 2.8, y: py + 1.0, z: pz + 5.1 } };
}

function buildPrayerFlags(materials, parts) {
  const r = seeded(6607);
  const a = [144, -8];
  const b = [161, 12];
  const ya = heightAt(a[0], a[1]) + 9.4;
  const yb = heightAt(b[0], b[1]) + 10.2;
  for (const [x, z, y] of [[a[0], a[1], ya], [b[0], b[1], yb]]) {
    parts.wood.push(cyl(0.1, 0.2, y, 6, '#6d4630', x, y * 0.5, z));
    parts.wood.push(box(0.9, 0.16, 0.16, '#7a4d34', x, y - 0.25, z));
    parts.gold.push(sph(0.14, '#c9a04e', x, y + 0.14, z, 1, 1.2, 1, 6));
  }
  const data = [];
  const steps = 14;
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const x = a[0] + (b[0] - a[0]) * t;
    const z = a[1] + (b[1] - a[1]) * t;
    const y = ya + (yb - ya) * t - Math.sin(t * Math.PI) * 1.15;
    data.push({ p: [x, y, z], yaw: Math.atan2(b[0] - a[0], b[1] - a[1]), phase: r() * 6.3, color: [0xb83a2f, 0x2f5f8f, 0xd0a33a, 0x3d7a52, 0xe0d7c2][i % 5] });
  }
  const g = new THREE.PlaneGeometry(0.48, 0.74, 2, 2);
  g.translate(0, -0.37, 0);
  const mat = materials.cloth.clone();
  mat.vertexColors = false;
  mat.side = THREE.DoubleSide;
  mat.roughness = 0.92;
  const im = new THREE.InstancedMesh(g, mat, data.length);
  im.frustumCulled = false;
  im.castShadow = false;
  const c = new THREE.Color();
  for (let i = 0; i < data.length; i++) im.setColorAt(i, c.setHex(data[i].color));
  im.instanceColor.needsUpdate = true;
  const group = new THREE.Group();
  group.add(im);
  return { group, mesh: im, data };
}

export function buildDunhuangDetail(materials, refs) {
  const parts = { cliff: [], stone: [], wood: [], gold: [], dark: [], mural: [], crest: [] };
  buildCliffDetail(refs, parts);
  buildDunesDetail(parts);
  const lake = buildLakeDetail({ ...refs, materials }, parts);
  const flags = buildPrayerFlags(materials, parts);
  const group = new THREE.Group();
  const add = (list, material, cast = true, receive = true) => {
    if (!list.length) return;
    const m = mesh(merge(list), material, cast, receive);
    if (m) group.add(m);
  };
  add(parts.cliff, materials.cliff, true, true);
  add(parts.stone, materials.stone, true, true);
  add(parts.wood, materials.wood, true, true);
  add(parts.gold, materials.gold, false, true);
  add(parts.dark, materials.dark, false, true);
  add(parts.mural, materials.mural, false, true);
  add(parts.crest, materials.crest, false, true);
  group.add(flags.group);
  if (lake.reedMesh) group.add(lake.reedMesh);
  return {
    group,
    flags,
    reedCount: lake.reedCount,
    incenseSources: [lake.brazier, { x: 44.5, y: 2.2, z: -137.5 }],
    caveCount: refs.mogao.caves.length,
  };
}

