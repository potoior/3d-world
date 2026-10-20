import * as THREE from 'three';
import { box, cyl, sph, beam, merge, mesh, instanced, paint, seeded } from './geo.js';
import { heightAt } from './terrain.js';

const FRONT = -146;
const X0 = -196;
const SEG_W = 11.8;
const NSEG = 30;
const FACADE_X = 42;

function archShape(w, h, extra = 0) {
  const s = new THREE.Shape();
  const r = w * 0.5 + extra;
  const y0 = -extra;
  s.moveTo(-r, y0);
  s.lineTo(r, y0);
  s.lineTo(r, h);
  s.absarc(0, h, r, 0, Math.PI, false);
  s.lineTo(-r, y0);
  return s;
}

function archGeo(w, h, color) {
  const g = new THREE.ShapeGeometry(archShape(w, h), 9);
  paint(g, color);
  return g;
}

function archFrameGeo(w, h, color) {
  const outer = archShape(w, h, 0.55);
  const inner = archShape(w, h, 0);
  outer.holes.push(inner);
  const g = new THREE.ShapeGeometry(outer, 9);
  paint(g, color);
  return g;
}

function muralPanelGeo(x, y, z, w, h, uvIndex, color) {
  const g = new THREE.PlaneGeometry(w, h, 1, 1);
  const u0 = (uvIndex % 2) * 0.5;
  const v0 = uvIndex < 2 ? 0.5 : 0;
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, u0 + uv.getX(i) * 0.5, v0 + uv.getY(i) * 0.5);
  }
  g.translate(x, y, z);
  paint(g, color || '#ffffff');
  return g;
}

function buildCliff(materials) {
  const cliffParts = [];
  const darkParts = [];
  const stoneParts = [];
  const muralParts = [];
  const woodParts = [];
  const goldParts = [];
  const r = seeded(2209);
  const fronts = [];
  const caves = [];

  for (let i = 0; i < NSEG; i++) {
    const x = X0 + SEG_W * (i + 0.5);
    const front = FRONT + (r() - 0.5) * 3.2;
    fronts.push(front);
    const totalH = 42 + r() * 9;
    const layers = 5;
    let y = -1.5;
    for (let l = 0; l < layers; l++) {
      const lh = (totalH / layers) * (0.8 + r() * 0.45);
      const depth = 12 + r() * 8;
      const colors = ['#c9a87d', '#b18a61', '#9b7452', '#d2b188', '#a9825c'];
      const w = SEG_W + 1.2;
      cliffParts.push(box(w, lh, depth, colors[(i + l) % colors.length], x + (r() - 0.5) * 1.5, y + lh / 2, front - depth / 2));
      y += lh;
    }
    if (r() > 0.52) {
      cliffParts.push(box(2.2 + r() * 3, 7 + r() * 12, 3.5 + r() * 3, '#b28a60', x + (r() - 0.5) * 5, 9 + r() * 20, front + 1.2));
    }
    if (r() > 0.62) {
      cliffParts.push(box(4 + r() * 6, 3 + r() * 5, 4 + r() * 3, '#c6a479', x + (r() - 0.5) * 6, 34 + r() * 8, front + 1.6));
    }
  }

  cliffParts.push(box(370, 7, 38, '#9c7654', -22, 1.4, FRONT - 18));
  cliffParts.push(box(378, 3, 44, '#c7a67c', -22, 45, FRONT - 20));

  function frontAt(x) {
    const idx = Math.max(0, Math.min(NSEG - 1, Math.floor((x - X0) / SEG_W)));
    return fronts[idx];
  }

  const caveRows = [7.5, 15.5, 24, 32.5, 40];
  for (let row = 0; row < caveRows.length; row++) {
    for (let k = 0; k < 10; k++) {
      const x = -178 + k * 33.5 + (r() - 0.5) * 10;
      if (x > 6 && x < 82) continue;
      if (r() > 0.82) continue;
      const w = 2.2 + r() * 1.3;
      const h = 2.8 + r() * 1.5;
      const z = frontAt(x) + 0.16;
      const y = caveRows[row] + (r() - 0.5) * 1.6;
      caves.push({ x, y, z, w, h, row, k });
      const inner = archGeo(w, h, '#1a120c');
      inner.translate(x, y, z);
      darkParts.push(inner);
      const frame = archFrameGeo(w, h, r() > 0.5 ? '#d5b88f' : '#c3a176');
      frame.translate(x, y, z + 0.05);
      stoneParts.push(frame);
      if (r() > 0.45) {
        const doorH = h * (0.42 + r() * 0.2);
        woodParts.push(box(w * 0.80, doorH, 0.16, '#4e2d1e', x, y + doorH / 2, z + 0.12));
        woodParts.push(box(w * 0.86, 0.18, 0.22, '#7d4a2c', x, y + doorH, z + 0.14));
        woodParts.push(box(0.12, doorH, 0.2, '#2f1a11', x, y + doorH / 2, z + 0.21));
      } else if (r() > 0.35) {
        muralParts.push(muralPanelGeo(x, y + h * 0.62, z + 0.1, w * 0.78, h * 0.55, (row + k) % 4));
      }
    }
  }

  const panelSpots = [
    [-164, 12.5], [-143, 21], [-112, 13], [-92, 26], [-60, 18],
    [-38, 30], [-8, 14], [18, 33], [96, 16], [121, 27], [147, 19], [-186, 29],
  ];
  for (let i = 0; i < panelSpots.length; i++) {
    const [x, y] = panelSpots[i];
    const z = frontAt(x) + 0.22;
    muralParts.push(muralPanelGeo(x, y, z, 5.2, 3.6, i % 4));
    stoneParts.push(box(5.7, 0.16, 0.22, '#dac09a', x, y + 1.9, z + 0.05));
    stoneParts.push(box(5.7, 0.16, 0.22, '#dac09a', x, y - 1.9, z + 0.05));
    stoneParts.push(box(0.16, 4.0, 0.22, '#dac09a', x - 2.72, y, z + 0.05));
    stoneParts.push(box(0.16, 4.0, 0.22, '#dac09a', x + 2.72, y, z + 0.05));
  }

  const fx = FACADE_X;
  const fz = frontAt(fx) + 5.0;
  const baseY = 0.3;
  const levelH = 4.65;
  for (let i = 0; i < 9; i++) {
    const y = baseY + i * levelH;
    const w = 32 - i * 1.55;
    const d = 7.2 - i * 0.24;
    woodParts.push(box(w + 0.8, 0.5, d + 1.2, '#9a5d3d', fx, y + 0.25, fz - d / 2));
    for (let c = 0; c < 6; c++) {
      const cx = fx + (c - 2.5) * (w / 6);
      woodParts.push(cyl(0.19, 0.23, 3.75, 6, '#b46843', cx, y + 2.3, fz + 0.2));
      woodParts.push(box(0.38, 0.22, 0.38, '#7c4630', cx, y + 4.16, fz + 0.2));
    }
    woodParts.push(box(w + 0.6, 0.32, 0.35, '#8d5336', fx, y + 4.08, fz + 0.25));
    woodParts.push(box(w + 0.4, 0.2, 0.2, '#a96742', fx, y + 1.2, fz + 0.28));
    for (let c = 0; c < 13; c++) {
      const cx = fx + (c - 6) * (w / 13);
      woodParts.push(box(0.09, 0.86, 0.09, '#955838', cx, y + 0.78, fz + 0.28));
    }
    const rh = 1.15;
    const roof = new THREE.ConeGeometry(1, rh, 4, 1);
    roof.rotateY(Math.PI / 4);
    roof.scale((w + 2.4) * 0.74, 1, (d + 2.6) * 0.74);
    roof.translate(fx, y + 4.35 + rh / 2, fz - d / 2);
    paint(roof, '#5b4938');
    woodParts.push(roof);

    const nicheW = w * 0.3;
    const niche = archGeo(nicheW, 2.0, '#24170e');
    niche.translate(fx, y + 1.0, fz + 0.32);
    darkParts.push(niche);
    goldParts.push(sph(0.3, '#d8b25c', fx, y + 1.65, fz + 0.38, 0.75, 1.15, 0.45, 7));
    goldParts.push(cyl(0.22, 0.34, 0.55, 7, '#c79a45', fx, y + 0.8, fz + 0.38));
    if (i % 2 === 0) {
      const lx = fx - w * 0.52;
      const z0 = fz + 0.6;
      woodParts.push(beam([lx - 0.35, y + 0.5, z0], [lx - 0.35, y + levelH - 0.1, z0 - 1.2], 0.075, '#7c4930', 5));
      woodParts.push(beam([lx + 0.35, y + 0.5, z0], [lx + 0.35, y + levelH - 0.1, z0 - 1.2], 0.075, '#7c4930', 5));
      for (let s = 0; s < 5; s++) {
        const t = (s + 1) / 6;
        const yy = y + 0.5 + t * (levelH - 0.6);
        const zz = z0 - t * 1.2;
        woodParts.push(box(0.9, 0.07, 0.09, '#8e5838', lx, yy, zz));
      }
    }
  }
  goldParts.push(sph(0.65, '#d8b25c', fx, baseY + 9 * levelH + 0.6, fz - 3, 1, 1.3, 1, 9));
  woodParts.push(cyl(0.22, 0.34, 2.6, 7, '#7a4030', fx, baseY + 9 * levelH - 1.0, fz - 3));

  for (const z of [fz + 2.2, fz + 4.3]) {
    for (let i = 0; i < 4; i++) {
      let x = fx - 42 + i * 28;
      let y = heightAt(x, z);
      if (y < 2) y = heightAt(x, z - 20) + 0.6;
      woodParts.push(cyl(0.13, 0.18, 5.5, 5, '#7a4a31', x, y + 2.6, z));
    }
  }

  return {
    cliff: merge(cliffParts),
    dark: merge(darkParts),
    stone: merge(stoneParts),
    mural: merge(muralParts),
    wood: merge(woodParts),
    gold: merge(goldParts),
    frontAt,
    caves,
    facade: { x: fx, z: fz, baseY, levelH },
  };
}
function buildFlags(materials) {
  const palette = [0xb83a2f, 0x2f5f8f, 0xd0a33a, 0x3d7a52, 0xe0d7c2];
  const lines = [
    [[-82, 46, -138], [-64, 2.4, -104]],
    [[-16, 47, -139], [4, 2.6, -106]],
    [[78, 46, -140], [62, 2.4, -103]],
    [[108, 43, -142], [126, 2.5, -108]],
  ];
  const data = [];
  const ropePos = [];
  const r = seeded(661);
  for (let li = 0; li < lines.length; li++) {
    const [a, b] = lines[li];
    const prev = new THREE.Vector3(a[0], a[1], a[2]);
    const steps = 26;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const sag = Math.sin(t * Math.PI) * -5.5;
      const x = a[0] + (b[0] - a[0]) * t;
      const y = a[1] + (b[1] - a[1]) * t + sag;
      const z = a[2] + (b[2] - a[2]) * t;
      ropePos.push(prev.x, prev.y, prev.z, x, y, z);
      if (i % 2 === 0) {
        const dx = b[0] - a[0];
        const dz = b[2] - a[2];
        const ang = Math.atan2(dx, dz);
        data.push({
          p: [x, y, z],
          yaw: ang,
          phase: r() * 6.3 + li,
          color: palette[(i + li) % palette.length],
        });
      }
      prev.set(x, y, z);
    }
  }
  const g = new THREE.PlaneGeometry(0.58, 0.8, 2, 2);
  g.translate(0, -0.42, 0);
  const mat = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.9, metalness: 0 });
  const im = new THREE.InstancedMesh(g, mat, data.length);
  const colors = new THREE.Color();
  for (let i = 0; i < data.length; i++) {
    im.setColorAt(i, colors.setHex(data[i].color));
  }
  im.instanceColor.needsUpdate = true;
  im.castShadow = true;
  im.frustumCulled = false;
  const ropeGeo = new THREE.BufferGeometry();
  ropeGeo.setAttribute('position', new THREE.Float32BufferAttribute(ropePos, 3));
  const rope = new THREE.LineSegments(ropeGeo, new THREE.LineBasicMaterial({ color: 0x4a3424, transparent: true, opacity: 0.75 }));
  const group = new THREE.Group();
  group.add(im, rope);
  return { group, mesh: im, data };
}

function humanGeo(monk) {
  const parts = [];
  const robe = monk ? '#a85b2a' : '#6a3a28';
  const skin = '#c89a70';
  parts.push(cyl(0.25, 0.38, 1.05, 7, robe, 0, 0.72, 0));
  parts.push(sph(0.24, robe, 0, 1.28, 0, 1, 1.15, 0.75, 7));
  parts.push(cyl(0.075, 0.09, 0.62, 5, '#4a3024', 0, 0.3, 0));
  parts.push(cyl(0.13, 0.16, 0.18, 6, '#5a3a28', 0, 0.08, 0));
  parts.push(sph(0.16, skin, 0, 1.62, 0, 0.92, 1.05, 0.92, 7));
  if (!monk) {
    parts.push(cyl(0.26, 0.29, 0.1, 7, '#d8c29a', 0, 1.77, 0));
  }
  parts.push(cyl(0.06, 0.07, 0.55, 5, skin, -0.25, 1.0, 0.02, 0, 0, 0.16));
  parts.push(cyl(0.06, 0.07, 0.55, 5, skin, 0.25, 1.0, 0.02, 0, 0, -0.16));
  return merge(parts);
}

function buildPeople(materials) {
  const group = new THREE.Group();
  const r = seeded(912);
  const monkItems = [];
  const visitItems = [];
  const colors = ['#b8643c', '#4b6e7d', '#7b5136', '#88694a', '#3f5c55', '#a3814e', '#6b4550'];
  for (let i = 0; i < 8; i++) {
    const x = -40 + i * 11 + (r() - 0.5) * 5;
    const z = -108 + (r() - 0.5) * 7;
    monkItems.push({ p: [x, heightAt(x, z) + 0.02, z], r: [0, r() * 6.3, 0], s: 0.95 + r() * 0.12 });
  }
  for (let i = 0; i < 14; i++) {
    const x = -128 + r() * 230;
    const z = -104 + (r() - 0.5) * 16;
    visitItems.push({
      p: [x, heightAt(x, z) + 0.02, z],
      r: [0, r() * 6.3, 0],
      s: 0.88 + r() * 0.22,
      c: colors[i % colors.length],
    });
  }
  group.add(instanced(humanGeo(true), materials.figure, monkItems, true, true));
  group.add(instanced(humanGeo(false), materials.figure, visitItems, true, true));
  return group;
}

export function buildMogao(materials) {
  const group = new THREE.Group();
  const c = buildCliff(materials);
  group.add(mesh(c.cliff, materials.cliff, true, true));
  group.add(mesh(c.dark, materials.dark, false, true));
  group.add(mesh(c.stone, materials.stone, true, true));
  if (c.mural) group.add(mesh(c.mural, materials.mural, false, true));
  group.add(mesh(c.wood, materials.wood, true, true));
  if (c.gold) group.add(mesh(c.gold, materials.gold, false, true));
  const flags = buildFlags(materials);
  group.add(flags.group);
  group.add(buildPeople(materials));
  return {
    group,
    flags,
    facade: c.facade,
    frontAt: c.frontAt,
    caves: c.caves,
    caveCount: c.caves.length,
  };
}

