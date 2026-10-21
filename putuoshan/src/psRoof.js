import * as THREE from 'three';
import { mats } from './putuoshanTextures.js';
import { mesh, box, tube, mergeBoxes } from './psUtil.js';

function surfaceGeometry(sample, segments, vSegments) {
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let j = 0; j <= vSegments; j++) {
    const v = j / vSegments;
    for (let i = 0; i <= segments; i++) {
      const s = (i / segments) * 2 - 1;
      const p = sample(s, v);
      positions.push(p[0], p[1], p[2]);
      uvs.push(p[3], p[4]);
    }
  }
  for (let j = 0; j < vSegments; j++) {
    for (let i = 0; i < segments; i++) {
      const a = j * (segments + 1) + i;
      const b = a + 1;
      const c = a + segments + 1;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

export function roofGeometry({
  width,
  depth,
  height,
  cornerLift = 2.0,
  curve = 1.6,
  ridgeRatio = 0.5,
  segments = 18,
  vSegments = 10,
}) {
  const tile = 1.35;
  const ridgeHalf = Math.max(0, (width - depth) * 0.5 * ridgeRatio);
  const slope = Math.hypot(height, Math.max(depth, 1) * 0.5);
  const geos = [];
  for (const sign of [1, -1]) {
    geos.push(
      surfaceGeometry(
        (s, v) => {
          const lift = cornerLift * Math.pow(Math.abs(s), 4.4) * Math.pow(v, 3.1);
          const x = s * (ridgeHalf + (width * 0.5 - ridgeHalf) * v);
          const y = height * Math.pow(1 - v, curve) + lift;
          const z = sign * depth * 0.5 * (1 - v);
          return [x, y, z, x / tile, (v * slope) / tile];
        },
        segments,
        vSegments
      )
    );
  }
  for (const sign of [1, -1]) {
    geos.push(
      surfaceGeometry(
        (s, v) => {
          const lift = cornerLift * Math.pow(Math.abs(s), 4.4) * Math.pow(v, 3.1);
          const x = sign * (ridgeHalf + (width * 0.5 - ridgeHalf) * v);
          const y = height * Math.pow(1 - v, curve) + lift;
          const z = s * depth * 0.5 * (1 - v);
          return [x, y, z, z / tile, (v * slope) / tile];
        },
        segments,
        vSegments
      )
    );
  }
  const positions = [];
  const uvs = [];
  const indices = [];
  let offset = 0;
  for (const g of geos) {
    positions.push(...g.attributes.position.array);
    uvs.push(...g.attributes.uv.array);
    const ix = g.index.array;
    for (let i = 0; i < ix.length; i++) indices.push(ix[i] + offset);
    offset += g.attributes.position.count;
    g.dispose();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  geo.userData.ridgeHalf = ridgeHalf;
  return geo;
}

export function createRoof({
  width,
  depth,
  height,
  cornerLift = 2.2,
  curve = 1.6,
  material = mats.roofGray,
  ridge = true,
  beasts = false,
}) {
  const g = new THREE.Group();
  const geo = roofGeometry({ width, depth, height, cornerLift, curve });
  mesh(g, geo, material);

  const teal = [];
  const gold = [];
  const dark = [];
  const add = (arr, w, h, d, x, y, z) => arr.push(new THREE.BoxGeometry(w, h, d).translate(x, y, z));
  add(teal, width + 0.35, 0.5, 0.4, 0, -0.16, depth * 0.5 + 0.14);
  add(teal, width + 0.35, 0.5, 0.4, 0, -0.16, -depth * 0.5 - 0.14);
  add(teal, 0.4, 0.5, depth + 0.35, width * 0.5 + 0.14, -0.16, 0);
  add(teal, 0.4, 0.5, depth + 0.35, -width * 0.5 - 0.14, -0.16, 0);
  add(gold, width + 0.42, 0.1, 0.46, 0, 0.16, depth * 0.5 + 0.15);
  add(gold, width + 0.42, 0.1, 0.46, 0, 0.16, -depth * 0.5 - 0.15);
  add(gold, 0.46, 0.1, depth + 0.42, width * 0.5 + 0.15, 0.16, 0);
  add(gold, 0.46, 0.1, depth + 0.42, -width * 0.5 - 0.15, 0.16, 0);
  add(dark, width + 0.3, 0.22, 0.34, 0, -0.48, depth * 0.5 + 0.1);
  add(dark, width + 0.3, 0.22, 0.34, 0, -0.48, -depth * 0.5 - 0.1);
  add(dark, 0.34, 0.22, depth + 0.3, width * 0.5 + 0.1, -0.48, 0);
  add(dark, 0.34, 0.22, depth + 0.3, -width * 0.5 - 0.1, -0.48, 0);

  mesh(g, mergeBoxes(teal), mats.teal, false, false);
  mesh(g, mergeBoxes(gold), mats.gold, false, false);
  mesh(g, mergeBoxes(dark), mats.roofDark, false, false);

  const ridgeHalf = geo.userData.ridgeHalf;
  if (ridge && ridgeHalf > 0.4) {
    const rl = Math.max(1.6, ridgeHalf * 2);
    box(g, mats.teal, rl, 0.52, 0.55, 0, height + 0.12, 0);
    box(g, mats.gold, rl + 0.2, 0.14, 0.68, 0, height + 0.44, 0);
    box(g, mats.goldDark, rl * 0.82, 0.16, 0.4, 0, height + 0.55, 0);
    for (const sx of [-1, 1]) {
      const tip = new THREE.ConeGeometry(0.3, 0.9, 6);
      tip.rotateZ(-sx * 0.32);
      tip.translate(sx * (rl * 0.5 + 0.2), height + 0.72, 0);
      mesh(g, tip, mats.gold, false, false);
    }
    if (beasts) {
      for (let i = 0; i < 4; i++) {
        for (const sx of [-1, 1]) {
          const bx = sx * (rl * 0.5 - 0.5 - i * 0.55);
          box(g, mats.goldDark, 0.3, 0.34, 0.32, bx, height + 0.72, 0.28);
          box(g, mats.goldDark, 0.2, 0.2, 0.26, bx, height + 0.94, 0.22);
        }
      }
    }
  }

  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const x = sx * width * 0.5;
      const z = sz * depth * 0.5;
      const points = [
        new THREE.Vector3(x, cornerLift + 0.1, z),
        new THREE.Vector3(x + sx * 0.5, cornerLift + 0.35, z + sz * 0.5),
        new THREE.Vector3(x + sx * 1.1, cornerLift + 1.05, z + sz * 1.1),
        new THREE.Vector3(x + sx * 1.55, cornerLift + 1.9, z + sz * 1.55),
      ];
      tube(g, mats.goldDark, points, 0.15, 4);
    }
  }
  return g;
}
