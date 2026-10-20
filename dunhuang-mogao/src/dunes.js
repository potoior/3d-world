import * as THREE from 'three';
import { box, cyl, sph, beam, cone, ico, merge, mesh, instanced, seeded, swayMaterial } from './geo.js';
import { heightAt, RIDGES } from './terrain.js';

function camelGeo(seed, riderColor) {
  const r = seeded(seed);
  const parts = [];
  const hide = r() > 0.5 ? '#b98956' : '#a97a4b';
  const dark = '#8a6038';
  parts.push(sph(1, hide, 0, 2.25, 0, 0.95, 0.78, 1.65, 8));
  parts.push(sph(0.55, hide, 0, 2.86, 0.42, 1, 0.92, 0.95, 7));
  parts.push(sph(0.55, hide, 0, 2.86, -0.45, 1, 0.92, 0.95, 7));
  parts.push(beam([0, 2.5, 1.25], [0, 3.55, 1.82], 0.24, hide, 6));
  parts.push(sph(0.3, hide, 0, 3.68, 2.02, 0.9, 0.95, 1.35, 7));
  parts.push(cone(0.09, 0.28, 5, dark, -0.16, 3.96, 1.88, 0, 0, 0.2));
  parts.push(cone(0.09, 0.28, 5, dark, 0.16, 3.96, 1.88, 0, 0, -0.2));
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const x = sx * 0.42;
      const z = sz * 0.72;
      parts.push(beam([x, 1.88, z], [x + sx * 0.06, 0.95, z + sz * 0.05], 0.1, hide, 5));
      parts.push(beam([x + sx * 0.06, 0.95, z + sz * 0.05], [x + sx * 0.03, 0.06, z + sz * 0.09], 0.075, dark, 5));
      parts.push(sph(0.13, dark, x + sx * 0.03, 0.05, z + sz * 0.13, 1.3, 0.5, 1.5, 5));
    }
  }
  parts.push(beam([0, 2.45, -1.55], [0, 1.6, -1.9], 0.06, dark, 4));
  parts.push(box(0.62, 0.1, 1.2, '#9c3f2e', 0, 2.94, 0.05, 0, 0, 0));
  parts.push(box(0.55, 0.42, 0.55, riderColor, 0, 3.5, 0.28));
  parts.push(sph(0.16, '#c5976d', 0, 3.86, 0.3, 0.9, 1.05, 0.9, 6));
  parts.push(cyl(0.25, 0.27, 0.09, 6, '#7a5a36', 0, 3.99, 0.3));
  for (const s of [-1, 1]) {
    parts.push(cyl(0.075, 0.08, 0.52, 5, riderColor, s * 0.29, 3.32, 0.38, 0.25, 0, s * 0.2));
    parts.push(box(0.18, 0.1, 0.34, '#5c3b25', s * 0.42, 3.08, 0.5));
    parts.push(cyl(0.055, 0.06, 0.5, 5, '#c5976d', s * 0.38, 3.62, 0.46, 0.5, 0, s * 0.15));
  }
  return merge(parts);
}

function buildCaravan(materials) {
  const group = new THREE.Group();
  const curve = new THREE.CatmullRomCurve3(RIDGES[0].pts.map((p) => new THREE.Vector3(p[0], 0, p[1])), false, 'catmullrom', 0.38);
  const camelColors = ['#7d3e2f', '#39566a', '#7b6a34', '#8a4a36', '#4e5f48', '#6a3a55', '#8c6b3a'];
  const camels = [];
  const n = 7;
  for (let i = 0; i < n; i++) {
    const t = 0.17 + (i / (n - 1)) * 0.6;
    const p = curve.getPointAt(t);
    const tan = curve.getTangentAt(t);
    const x = p.x + Math.sin(i * 2.1) * 1.6;
    const z = p.z + Math.cos(i * 1.7) * 1.6;
    const y = heightAt(x, z) + 0.04;
    const m = mesh(camelGeo(500 + i * 37, camelColors[i % camelColors.length]), materials.camel, true, true);
    m.position.set(x, y, z);
    m.rotation.y = Math.atan2(tan.x, tan.z);
    m.userData.baseY = y;
    m.userData.phase = i * 0.9;
    group.add(m);
    camels.push(m);
  }
  return { group, camels, curve };
}

function buildPoplarGrove(materials) {
  const group = new THREE.Group();
  const r = seeded(1717);
  const trees = [];
  for (let i = 0; i < 54; i++) {
    let x;
    let z;
    do {
      x = -214 + r() * 122;
      z = 66 + r() * 92;
    } while (Math.hypot((x + 58) / 52, (z - 14) / 44) < 1.35 || (x > -90 && z < 70));
    trees.push({ x, z, y: heightAt(x, z), s: 0.8 + r() * 0.5, rot: r() * 6.3 });
  }
  const trunkGeo = cyl(0.13, 0.34, 12, 5, '#6b4a32', 0, 6, 0);
  const trunkItems = trees.map((t) => ({
    p: [t.x, t.y, t.z],
    r: [0, t.rot, (r() - 0.5) * 0.08],
    s: [t.s, t.s, t.s],
  }));
  group.add(instanced(trunkGeo, materials.wood, trunkItems, true, true));

  const foliageGeo = new THREE.SphereGeometry(1, 7, 6);
  const canopyItems = [];
  for (const t of trees) {
    canopyItems.push({ p: [t.x, t.y + 10.4 * t.s, t.z], r: [0, t.rot, 0], s: [2.3 * t.s, 4.1 * t.s, 2.3 * t.s], c: 0xffffff });
    canopyItems.push({ p: [t.x + 0.4, t.y + 13.2 * t.s, t.z - 0.2], r: [0, t.rot + 0.5, 0], s: [1.6 * t.s, 2.8 * t.s, 1.6 * t.s], c: 0xead9a4 });
  }
  group.add(instanced(foliageGeo, materials.foliage, canopyItems, true, true));

  const leafGeo = new THREE.PlaneGeometry(1.3, 1.1);
  const leafItems = [];
  for (const t of trees) {
    for (let i = 0; i < 20; i++) {
      const a = r() * 6.3;
      const rad = Math.sqrt(r()) * 2.5 * t.s;
      leafItems.push({
        p: [t.x + Math.cos(a) * rad, t.y + (8.6 + r() * 6.2) * t.s, t.z + Math.sin(a) * rad],
        r: [r() * 2, r() * 6.3, r() * 2],
        s: (0.6 + r() * 0.8) * t.s,
      });
    }
    for (let i = 0; i < 7; i++) {
      const a = r() * 6.3;
      const rad = Math.sqrt(r()) * 5.5;
      leafItems.push({
        p: [t.x + Math.cos(a) * rad, t.y + 0.05, t.z + Math.sin(a) * rad],
        r: [-Math.PI / 2, r() * 6.3, 0],
        s: (0.5 + r() * 0.6) * t.s,
      });
    }
  }
  const leafMat = swayMaterial(materials.leaf.clone(), 0.09, 1.1);
  group.add(instanced(leafGeo, leafMat, leafItems, false, true));
  return { group, trees, leafMat };
}
function buildScatter(materials) {
  const group = new THREE.Group();
  const r = seeded(2820);
  const shrubs = [];
  const rocks = [];
  for (let i = 0; i < 150; i++) {
    const x = -230 + r() * 430;
    const z = -40 + r() * 330;
    if (Math.hypot((x + 58) / 54, (z - 14) / 46) < 1.0) continue;
    const y = heightAt(x, z);
    shrubs.push({
      p: [x, y + 0.28, z],
      r: [0, r() * 6.3, 0],
      s: [0.5 + r() * 0.9, 0.4 + r() * 0.55, 0.5 + r() * 0.9],
      c: ['#756d3e', '#8a7c48', '#655f38', '#9a8750'][(r() * 4) | 0],
    });
  }
  for (let i = 0; i < 90; i++) {
    const x = -220 + r() * 440;
    const z = -80 + r() * 340;
    if (Math.hypot((x + 58) / 56, (z - 14) / 48) < 1.05) continue;
    const y = heightAt(x, z);
    rocks.push({
      p: [x, y + 0.15, z],
      r: [r() * 0.5, r() * 6.3, r() * 0.5],
      s: [0.5 + r() * 1.8, 0.35 + r() * 1.2, 0.5 + r() * 1.6],
      c: ['#8a7259', '#9e866b', '#72614f', '#b09878'][(r() * 4) | 0],
    });
  }
  const shrubGeo = merge([
    ico(1, '#ffffff', 0, 0.45, 0, 0),
    ico(0.7, '#ffffff', 0.55, 0.5, 0.2, 0),
    ico(0.62, '#ffffff', -0.45, 0.55, -0.15, 0),
    ico(0.5, '#ffffff', 0.1, 0.9, -0.35, 0),
  ]);
  const rockGeo = new THREE.DodecahedronGeometry(1, 0);
  group.add(instanced(shrubGeo, materials.shrub, shrubs, true, true));
  group.add(instanced(rockGeo, materials.rock, rocks, true, true));
  return { group, shrubs: shrubs.length, rocks: rocks.length };
}

function buildYardang(materials) {
  const parts = [];
  const r = seeded(3301);
  for (let i = 0; i < 11; i++) {
    const x = 262 + r() * 150;
    const z = -265 + r() * 125;
    const h = 8 + r() * 22;
    const w = 10 + r() * 26;
    const d = 5 + r() * 12;
    const cols = ['#b39570', '#c3a47d', '#98795c', '#ccb08a'];
    for (let l = 0; l < 4; l++) {
      parts.push(box(w * (1 - l * 0.13), h / 4, d * (1 - l * 0.09), cols[(i + l) % 4], x + (r() - 0.5) * 3, l * (h / 4) + h / 8 - 1, z + (r() - 0.5) * 3, r() * 0.8));
    }
    for (let g = 0; g < 4; g++) {
      parts.push(box(1.2, h * (0.35 + r() * 0.4), 1.0, '#7f654c', x - w * 0.35 + g * (w * 0.2), h * 0.4, z + d * 0.52));
    }
  }
  return mesh(merge(parts), materials.crest, false, true);
}

function buildFarHills(materials) {
  const parts = [];
  const r = seeded(4452);
  for (let i = 0; i < 12; i++) {
    const x = -520 + i * 95 + r() * 30;
    const z = -390 - r() * 120;
    const s = 55 + r() * 75;
    parts.push(sph(1, '#b58f78', x, -8, z, s, s * (0.26 + r() * 0.18), s * 0.5, 7));
  }
  for (let i = 0; i < 8; i++) {
    const x = 520 + r() * 260;
    const z = 120 + r() * 250;
    const s = 50 + r() * 55;
    parts.push(sph(1, '#b99372', x, -10, z, s, s * (0.22 + r() * 0.15), s * 0.55, 7));
  }
  return mesh(merge(parts), materials.crest, false, true);
}

export function buildDunes(materials) {
  const group = new THREE.Group();
  const caravan = buildCaravan(materials);
  group.add(caravan.group);
  const grove = buildPoplarGrove(materials);
  group.add(grove.group);
  const scatter = buildScatter(materials);
  group.add(scatter.group);
  group.add(buildYardang(materials));
  group.add(buildFarHills(materials));
  return {
    group,
    camels: caravan.camels,
    caravanCurve: caravan.curve,
    trees: grove.trees,
    leafMat: grove.leafMat,
    shrubCount: scatter.shrubs,
    rockCount: scatter.rocks,
  };
}

