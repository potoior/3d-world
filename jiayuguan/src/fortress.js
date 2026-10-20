import * as THREE from 'three';
import { mats } from './materials.js';
import { heightAt } from './terrain.js';

export const WALL_HEIGHT = 9.2;
export const GROUND = 0.55;
export const FORTRESS = { W: 90, D: 62, BW: 124, BD: 18 };

export function scaleUV(geo, u, v) {
  const uv = geo.attributes.uv;
  if (!uv) return geo;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, uv.getX(i) * u, uv.getY(i) * v);
  }
  return geo;
}

export function box(w, h, d, x, y, z, ry = 0, uv = null) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (uv) scaleUV(g, uv[0], uv[1]);
  if (ry) g.rotateY(ry);
  g.translate(x, y, z);
  return g;
}

export function cyl(rt, rb, h, seg, x, y, z, ry = 0) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  if (ry) g.rotateY(ry);
  g.translate(x, y, z);
  return g;
}

export function makeHipRoof(w, d, h) {
  const hw = w / 2;
  const hd = d / 2;
  const ridge = Math.min(hw * 0.36, 2.4);
  const verts = [
    [-ridge, h, 0], [ridge, h, 0],
    [-hw, 0, hd], [hw, 0, hd], [hw, 0, -hd], [-hw, 0, -hd],
  ];
  const idx = [
    0, 2, 3, 0, 3, 1,
    0, 1, 4, 0, 4, 5,
    0, 5, 2,
    1, 3, 4,
  ];
  const positions = [];
  for (const i of idx) positions.push(verts[i][0], verts[i][1], verts[i][2]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const uvs = [];
  for (let i = 0; i < positions.length; i += 3) {
    uvs.push((positions[i] + hw) * 0.16 + positions[i + 2] * 0.03, (positions[i + 2] + hd) * 0.16 + positions[i + 1] * 0.04);
  }
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.computeVertexNormals();
  return geo;
}

export function addWall(push, axis, fixed, from, to, opts = {}) {
  const height = opts.height || WALL_HEIGHT;
  const thick = opts.thickness || 7.2;
  const outward = opts.outward || 1;
  const openings = (opts.openings || []).slice().sort((a, b) => a.center - b.center);
  const intervals = [];
  let cursor = from;
  for (const o of openings) {
    const a = o.center - o.width / 2;
    const b = o.center + o.width / 2;
    if (a > cursor) intervals.push([cursor, a]);
    cursor = Math.max(cursor, b);
  }
  if (cursor < to) intervals.push([cursor, to]);

  const isZ = axis === 'z';
  const boxB = (mat, w, h, d, x, y, z, ry = 0, uv = null) => push(mat, box(w, h, d, x, y, z, ry, uv));
  const place = (mat, len, thick2, h, along, y, extra = 0) => {
    if (isZ) boxB(mat, thick2 + extra, h, len, fixed, y, along, 0, [thick2 * 0.23, h * 0.24]);
    else boxB(mat, len, h, thick2 + extra, along, y, fixed, 0, [len * 0.23, h * 0.24]);
  };
  const placeOuter = (mat, len, off, h, along, y, thickness2) => {
    if (isZ) boxB(mat, thickness2, h, len, fixed + outward * off, y, along, 0, [len * 0.2, h * 0.2]);
    else boxB(mat, len, h, thickness2, along, y, fixed + outward * off, 0, [len * 0.2, h * 0.2]);
  };

  for (const [a, b] of intervals) {
    const len = b - a;
    if (len < 0.2) continue;
    const along = (a + b) / 2;
    place(mats.stone, len, thick, 1.3, along, GROUND + 0.65, 0.5);
    place(mats.earth, len, thick, height - 1.3, along, GROUND + 1.3 + (height - 1.3) / 2);
    for (const yy of [2.2, 4.1, 6.0, 7.8]) {
      if (yy < height - 0.5) placeOuter(mats.earthDark, len, thick / 2 + 0.05, 0.2, along, GROUND + yy, 0.2);
    }
    for (let j = a + 3.2; j < b - 1; j += 6.4) {
      placeOuter(mats.earthDark, 0.12, thick / 2 + 0.06, height - 2.2, j, GROUND + height / 2 + 0.1, 0.12);
    }
    place(mats.walkway, len, thick - 1.35, 0.18, along, GROUND + height + 0.09);
    place(mats.stoneDark, len, thick + 0.16, 0.22, along, GROUND + height + 0.02);
    if (isZ) {
      boxB(mats.brick, 0.46, 0.9, len, fixed + outward * (thick / 2 - 0.26), GROUND + height + 0.55, along, 0, [len * 0.17, 0.7]);
      boxB(mats.brick, 0.42, 0.62, len, fixed - outward * (thick / 2 - 0.23), GROUND + height + 0.41, along, 0, [len * 0.17, 0.5]);
    } else {
      boxB(mats.brick, len, 0.9, 0.46, along, GROUND + height + 0.55, fixed + outward * (thick / 2 - 0.26), 0, [len * 0.17, 0.7]);
      boxB(mats.brick, len, 0.62, 0.42, along, GROUND + height + 0.41, fixed - outward * (thick / 2 - 0.23), 0, [len * 0.17, 0.5]);
    }
    const merlonLen = 1.55;
    for (let j = a + 1.1; j < b - 1.4; j += 2.55) {
      if (isZ) {
        boxB(mats.earth, 0.62, 1.16, merlonLen, fixed + outward * (thick / 2 - 0.3), GROUND + height + 1.58, j, 0, [0.4, 0.8]);
        boxB(mats.stoneDark, 0.78, 0.16, merlonLen + 0.2, fixed + outward * (thick / 2 - 0.3), GROUND + height + 2.24, j, 0, [0.44, 0.1]);
      } else {
        boxB(mats.earth, merlonLen, 1.16, 0.62, j, GROUND + height + 1.58, fixed + outward * (thick / 2 - 0.3), 0, [0.8, 0.4]);
        boxB(mats.stoneDark, merlonLen + 0.2, 0.16, 0.78, j, GROUND + height + 2.24, fixed + outward * (thick / 2 - 0.3), 0, [0.44, 0.1]);
      }
    }
  }

  for (const o of openings) {
    const gh = o.height || 7.0;
    const topH = height - gh;
    if (topH > 0.2) {
      if (isZ) boxB(mats.earth, thick, topH, o.width, fixed, GROUND + height - topH / 2, o.center, 0, [o.width * 0.22, topH * 0.22]);
      else boxB(mats.earth, o.width, topH, thick, o.center, GROUND + height - topH / 2, fixed, 0, [o.width * 0.22, topH * 0.22]);
    }
    if (isZ) boxB(mats.walkway, thick - 1.35, 0.18, o.width, fixed, GROUND + height + 0.09, o.center);
    else boxB(mats.walkway, o.width, 0.18, thick - 1.35, o.center, GROUND + height + 0.09, fixed);
    if (isZ) {
      boxB(mats.stone, 1.1, gh + 0.5, 0.8, fixed + outward * (thick / 2), GROUND + (gh + 0.5) / 2, o.center - o.width / 2);
      boxB(mats.stone, 1.1, gh + 0.5, 0.8, fixed + outward * (thick / 2), GROUND + (gh + 0.5) / 2, o.center + o.width / 2);
      boxB(mats.stone, 1.1, 0.7, o.width + 1.4, fixed + outward * (thick / 2), GROUND + gh + 0.25, o.center);
      boxB(mats.dark, 0.5, gh, o.width - 0.4, fixed, GROUND + gh / 2, o.center);
      boxB(mats.door, 0.22, gh - 0.3, o.width - 0.7, fixed + outward * 0.22, GROUND + (gh - 0.3) / 2, o.center, 0, [1.2, 1.2]);
    } else {
      boxB(mats.stone, 0.8, gh + 0.5, 1.1, o.center - o.width / 2, GROUND + (gh + 0.5) / 2, fixed + outward * (thick / 2));
      boxB(mats.stone, 0.8, gh + 0.5, 1.1, o.center + o.width / 2, GROUND + (gh + 0.5) / 2, fixed + outward * (thick / 2));
      boxB(mats.stone, o.width + 1.4, 0.7, 1.1, o.center, GROUND + gh + 0.25, fixed + outward * (thick / 2));
      boxB(mats.dark, o.width - 0.4, gh, 0.5, o.center, GROUND + gh / 2, fixed);
      boxB(mats.door, o.width - 0.7, gh - 0.3, 0.22, o.center, GROUND + (gh - 0.3) / 2, fixed + outward * 0.22, 0, [1.2, 1.2]);
    }
    const studs = o.studs === false ? 0 : 7;
    for (let row = 0; row < studs; row++) {
      for (let col = 0; col < studs; col++) {
        const py = GROUND + 1.0 + row * ((gh - 1.6) / Math.max(1, studs - 1));
        const pz = o.center - (o.width - 1.6) / 2 + col * ((o.width - 1.6) / Math.max(1, studs - 1));
        if (isZ) push(mats.iron, cyl(0.085, 0.085, 0.12, 6, fixed + outward * 0.36, py, pz, Math.PI / 2));
        else push(mats.iron, cyl(0.085, 0.085, 0.12, 6, pz, py, fixed + outward * 0.36, 0));
      }
    }
  }
  return height;
}

export function addRamps(push) {
  const ramp = (x, z, w, len, rise, ry) => {
    const geo = new THREE.BoxGeometry(w, 0.4, len);
    const angle = Math.atan2(rise, len);
    geo.rotateX(angle);
    geo.rotateY(ry);
    geo.translate(x, GROUND + rise * 0.5, z);
    push(mats.stone, geo);
    const wallGeo = new THREE.BoxGeometry(0.5, 1.0, len);
    wallGeo.rotateX(angle);
    wallGeo.rotateY(ry);
    wallGeo.translate(x - Math.sin(ry + Math.PI / 2) * w * 0.5, GROUND + rise * 0.5 + 0.5, z - Math.cos(ry + Math.PI / 2) * w * 0.5);
    push(mats.stoneDark, wallGeo);
    const wallGeo2 = wallGeo.clone();
    wallGeo2.translate(Math.sin(ry + Math.PI / 2) * w, 0, Math.cos(ry + Math.PI / 2) * w);
    push(mats.stoneDark, wallGeo2);
  };
  ramp(-73, 36, 3.4, 24, WALL_HEIGHT, Math.PI / 2);
  ramp(69, -34, 3.4, 24, WALL_HEIGHT, -Math.PI / 2);
}

export function addInterior(push) {
  const boxB = (mat, w, h, d, x, y, z, ry = 0, uv = null) => push(mat, box(w, h, d, x, y, z, ry, uv));
  for (const [x, z] of [[-72, 46], [72, -46], [-72, -48], [72, 48]]) {
    boxB(mats.stone, 12, 0.5, 9, x, GROUND + 0.25, z);
    boxB(mats.brick, 10.5, 3.0, 7.5, x, GROUND + 1.75, z, 0, [5, 1.6]);
    const roof = makeHipRoof(11.8, 8.8, 1.8);
    roof.translate(x, GROUND + 3.25, z);
    push(mats.roof, roof);
  }
  boxB(mats.stone, 8, 1.1, 8, 0, GROUND + 0.55, 0);
  boxB(mats.stoneDark, 6.2, 0.18, 6.2, 0, GROUND + 1.14, 0);
  boxB(mats.dark, 4.4, 0.06, 4.4, 0, GROUND + 1.24, 0);
}

export function wallTopAt(axis, fixed, value, outward) {
  return { y: GROUND + WALL_HEIGHT, fixed };
}
