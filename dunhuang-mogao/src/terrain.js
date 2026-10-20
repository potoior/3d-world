import * as THREE from 'three';
import { ribbon, merge, mesh, seeded } from './geo.js';

export const RIDGES = [
  { pts: [[52, -42], [118, -26], [188, 1], [252, 43], [318, 98]], h: 41, w: 62, sharp: 1.25 },
  { pts: [[62, 128], [134, 154], [212, 186], [292, 228], [364, 276]], h: 31, w: 52, sharp: 1.2 },
  { pts: [[-12, 88], [44, 110], [96, 140], [148, 177]], h: 17, w: 34, sharp: 1.1 },
  { pts: [[212, -92], [266, -70], [330, -38], [392, 4]], h: 35, w: 54, sharp: 1.3 },
  { pts: [[298, 146], [354, 184], [420, 232]], h: 42, w: 60, sharp: 1.35 },
  { pts: [[124, -108], [172, -86], [222, -58]], h: 15, w: 30, sharp: 1.0 },
];

const ridgeSegs = RIDGES.map((rg) => {
  const pts = rg.pts;
  return { ...rg, pts, segs: pts.slice(0, -1).map((p, i) => [p, pts[i + 1]]) };
});

function segDist2(px, pz, a, b) {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const l2 = dx * dx + dz * dz || 1;
  let t = ((px - a[0]) * dx + (pz - a[1]) * dz) / l2;
  t = Math.max(0, Math.min(1, t));
  const x = a[0] + dx * t - px;
  const z = a[1] + dz * t - pz;
  return { d: Math.sqrt(x * x + z * z), t };
}

function smoothstep(a, b, x) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export function heightAt(x, z) {
  let h = 0;
  for (let i = 0; i < ridgeSegs.length; i++) {
    const rg = ridgeSegs[i];
    let best = 1e9;
    for (let s = 0; s < rg.segs.length; s++) {
      const r = segDist2(x, z, rg.segs[s][0], rg.segs[s][1]);
      if (r.d < best) best = r.d;
    }
    if (best < rg.w) {
      const t = 1 - (best / rg.w) * (best / rg.w);
      h = Math.max(h, rg.h * Math.pow(t, rg.sharp));
    }
  }
  const lx = (x + 52) / 52;
  const lz = (z - 18) / 44;
  const e = Math.sqrt(lx * lx + lz * lz);
  h -= 5.2 * (1 - smoothstep(0.72, 1.16, e));
  h += 7.5 * smoothstep(-96, -168, z);
  h += 3.2 * smoothstep(250, 420, x) * (1 - smoothstep(280, 430, z));
  const ripple = Math.sin(x * 0.23 + z * 0.13) * 0.16 + Math.sin(x * 0.071 - z * 0.11) * 0.28;
  const grain = Math.sin(x * 1.7 + z * 2.3) * 0.025 + Math.sin(x * 3.1 - z * 1.1) * 0.018;
  return h + ripple + grain + 0.05;
}

export function slopeAt(x, z) {
  const e = 1.4;
  const hx = heightAt(x + e, z) - heightAt(x - e, z);
  const hz = heightAt(x, z + e) - heightAt(x, z - e);
  return Math.min(1, Math.sqrt(hx * hx + hz * hz) / (e * 2));
}

function buildCrests() {
  const parts = [];
  const r = seeded(31);
  for (let i = 0; i < RIDGES.length; i++) {
    const rg = RIDGES[i];
    const curve = new THREE.CatmullRomCurve3(rg.pts.map((p) => new THREE.Vector3(p[0], 0, p[1])), false, 'catmullrom', 0.33);
    const pts = curve.getSpacedPoints(54).map((p) => [p.x, p.z]);
    parts.push(ribbon(pts, 4.6, '#b78f5a', (x, z) => heightAt(x, z) + 0.13));
    parts.push(ribbon(pts, 1.25, '#f2d9a2', (x, z) => heightAt(x, z) + 0.3));
    const off = pts.map((p, j) => {
      const n = pts[Math.min(pts.length - 1, j + 1)];
      const a = pts[Math.max(0, j - 1)];
      const dx = n[0] - a[0];
      const dz = n[1] - a[1];
      const l = Math.hypot(dx, dz) || 1;
      return [p[0] - (dz / l) * 5.5 + (r() - 0.5) * 1.2, p[1] + (dx / l) * 5.5 + (r() - 0.5) * 1.2];
    });
    parts.push(ribbon(off, 0.8, '#a87e4e', (x, z) => heightAt(x, z) + 0.16));
  }
  return merge(parts);
}

export function buildTerrain(materials) {
  const group = new THREE.Group();
  const geo = new THREE.PlaneGeometry(1500, 1500, 224, 224);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  const light = new THREE.Color('#e7c68d');
  const mid = new THREE.Color('#d2aa72');
  const dark = new THREE.Color('#a87e4e');
  const red = new THREE.Color('#b98355');
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const y = heightAt(x, z);
    pos.setY(i, y);
    const s = slopeAt(x, z);
    const n = Math.sin(x * 0.13 + z * 0.17) * 0.5 + 0.5;
    c.copy(mid).lerp(light, Math.min(1, Math.max(0, y / 42 + n * 0.22)));
    c.lerp(dark, Math.min(0.55, s * 0.95 + (1 - n) * 0.1));
    if (Math.sin(x * 0.021 + z * 0.037) > 0.64) c.lerp(red, 0.22);
    const grain = 0.94 + (Math.sin(x * 2.7 + z * 1.9) * 0.5 + 0.5) * 0.1;
    colors[i * 3] = c.r * grain;
    colors[i * 3 + 1] = c.g * grain;
    colors[i * 3 + 2] = c.b * grain;
  }
  geo.computeVertexNormals();
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const terrain = mesh(geo, materials.sand, false, true);
  group.add(terrain);
  const crestGeo = buildCrests();
  if (crestGeo) group.add(mesh(crestGeo, materials.crest, false, true));
  return group;
}
