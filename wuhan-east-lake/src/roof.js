import * as THREE from 'three';
import { mats } from './materials.js';
import { addBox, mergedMesh } from './geometry.js';

const TILE = 1.32;

function tubeFromPoints(points, radius, radialSegments = 6) {
  const curve = new THREE.CatmullRomCurve3(points);
  return new THREE.TubeGeometry(curve, Math.max(8, points.length * 4), radius, radialSegments, false);
}

function surfaceGeometry(sample, segments, vSegments) {
  const positions = [];
  const uvs = [];
  const indices = [];
  const offset = 0;
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
      const a = offset + j * (segments + 1) + i;
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

export function createRoofGeometry({
  width,
  depth,
  height,
  cornerLift = 2.1,
  curve = 1.62,
  ridgeRatio = 0.55,
  segments = 26,
  vSegments = 16,
}) {
  const W = width;
  const D = depth;
  const H = height;
  const ridgeHalf = Math.max(0, (W - D) * 0.5 * ridgeRatio);
  const slope = Math.hypot(H, Math.max(D, 1) * 0.5);
  const geos = [];

  for (const sign of [1, -1]) {
    geos.push(
      surfaceGeometry(
        (s, v) => {
          const lift = cornerLift * Math.pow(Math.abs(s), 4.5) * Math.pow(v, 3.2);
          const x = s * (ridgeHalf + (W * 0.5 - ridgeHalf) * v);
          const y = H * Math.pow(1 - v, curve) + lift;
          const z = sign * D * 0.5 * (1 - v);
          return [x, y, z, x / TILE, (v * slope) / TILE];
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
          const lift = cornerLift * Math.pow(Math.abs(s), 4.5) * Math.pow(v, 3.2);
          const x = sign * (ridgeHalf + (W * 0.5 - ridgeHalf) * v);
          const y = H * Math.pow(1 - v, curve) + lift;
          const z = s * D * 0.5 * (1 - v);
          return [x, y, z, z / TILE, (v * slope) / TILE];
        },
        segments,
        vSegments
      )
    );
  }

  const merged = new THREE.BufferGeometry();
  const pos = [];
  const uv = [];
  const idx = [];
  let base = 0;
  for (const g of geos) {
    pos.push(...g.attributes.position.array);
    uv.push(...g.attributes.uv.array);
    const ix = g.index.array;
    for (let i = 0; i < ix.length; i++) idx.push(ix[i] + base);
    base += g.attributes.position.count;
    g.dispose();
  }
  merged.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  merged.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  merged.setIndex(idx);
  merged.computeVertexNormals();
  merged.userData = { width: W, depth: D, height: H, ridgeHalf, cornerLift, curve, ridgeRatio };
  return merged;
}

export function hipPoint(width, depth, height, cornerLift, curve, sx, sz, v, ridgeRatio = 0.55) {
  const W = width;
  const D = depth;
  const H = height;
  const ridgeHalf = Math.max(0, (W - D) * 0.5 * ridgeRatio);
  const lift = cornerLift * Math.pow(v, 3.2);
  const x = sx * (ridgeHalf + (W * 0.5 - ridgeHalf) * v);
  const y = H * Math.pow(1 - v, curve) + lift;
  const z = sz * D * 0.5 * (1 - v);
  return new THREE.Vector3(x, y, z);
}

function addEaveTrim(group, width, depth, y = -0.18, scale = 1) {
  const teal = [];
  addBox(teal, width + 0.2, 0.62 * scale, 0.34, 0, y, depth * 0.5 + 0.12);
  addBox(teal, width + 0.2, 0.62 * scale, 0.34, 0, y, -depth * 0.5 - 0.12);
  addBox(teal, 0.34, 0.62 * scale, depth + 0.2, width * 0.5 + 0.12, y, 0);
  addBox(teal, 0.34, 0.62 * scale, depth + 0.2, -width * 0.5 - 0.12, y, 0);
  const tm = mergedMesh(teal, mats.teal, false, false);
  if (tm) group.add(tm);

  const trim = [];
  addBox(trim, width + 0.26, 0.11, 0.4, 0, y + 0.32, depth * 0.5 + 0.13);
  addBox(trim, width + 0.26, 0.11, 0.4, 0, y + 0.32, -depth * 0.5 - 0.13);
  addBox(trim, 0.4, 0.11, depth + 0.26, width * 0.5 + 0.13, y + 0.32, 0);
  addBox(trim, 0.4, 0.11, depth + 0.26, -width * 0.5 - 0.13, y + 0.32, 0);
  const rm = mergedMesh(trim, mats.gold, false, false);
  if (rm) group.add(rm);
}

export function createRoof({
  width,
  depth,
  height,
  cornerLift = 2.1,
  curve = 1.62,
  ridgeRatio = 0.55,
  beasts = true,
  hasRidge = true,
  fascia = true,
}) {
  const group = new THREE.Group();
  const geo = createRoofGeometry({ width, depth, height, cornerLift, curve, ridgeRatio });
  const mesh = new THREE.Mesh(geo, mats.roof);
  mesh.castShadow = true;
  group.add(mesh);

  const darkList = [];
  const goldList = [];
  const ridgeHalf = geo.userData.ridgeHalf;

  if (hasRidge && ridgeHalf > 0.5) {
    darkList.push(
      tubeFromPoints(
        [
          new THREE.Vector3(-ridgeHalf, height + 0.1, 0),
          new THREE.Vector3(-ridgeHalf * 0.55, height + 0.3, 0),
          new THREE.Vector3(0, height + 0.36, 0),
          new THREE.Vector3(ridgeHalf * 0.55, height + 0.3, 0),
          new THREE.Vector3(ridgeHalf, height + 0.1, 0),
        ],
        0.38,
        8
      )
    );
    for (const sx of [-1, 1]) {
      const lip = new THREE.BoxGeometry(1.0, 2.2, 1.2);
      lip.translate(sx * (ridgeHalf + 0.18), height + 1.0, 0);
      darkList.push(lip);
      const tail = new THREE.ConeGeometry(0.62, 1.6, 4);
      tail.rotateZ(sx * -0.35);
      tail.translate(sx * (ridgeHalf + 0.34), height + 2.35, 0);
      darkList.push(tail);
    }
  }

  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const pts = [];
      for (let i = 0; i <= 10; i++) {
        const v = i / 10;
        pts.push(hipPoint(width, depth, height, cornerLift, curve, sx, sz, v, ridgeRatio));
      }
      darkList.push(tubeFromPoints(pts, 0.28, 6));
      if (beasts) {
        for (let i = 0; i < 5; i++) {
          const v = 0.55 + i * 0.075;
          const p = hipPoint(width, depth, height, cornerLift, curve, sx, sz, v, ridgeRatio);
          const cone = new THREE.ConeGeometry(0.2 + 0.02 * i, 0.55 + 0.04 * i, 5);
          cone.translate(p.x, p.y + 0.48, p.z);
          goldList.push(cone);
        }
      }
    }
  }

  if (fascia) addEaveTrim(group, width, depth);

  const darkMesh = mergedMesh(darkList, mats.roofDark, true, false);
  if (darkMesh) group.add(darkMesh);
  const goldMesh = mergedMesh(goldList, mats.gold, true, false);
  if (goldMesh) group.add(goldMesh);

  const ceiling = new THREE.Mesh(new THREE.BoxGeometry(width * 0.985, 0.25, depth * 0.985), mats.teal);
  ceiling.position.y = -0.32;
  group.add(ceiling);

  group.userData.ridgeHalf = ridgeHalf;
  return group;
}

export function createSkirtRoof({
  outerW,
  outerD,
  innerW,
  innerD,
  height,
  cornerLift = 1.8,
  curve = 1.5,
  segments = 26,
  vSegments = 14,
}) {
  const geoParts = [];
  const slope = Math.hypot(height, (outerD - innerD) * 0.5 + 1);
  for (const sign of [1, -1]) {
    geoParts.push(
      surfaceGeometry(
        (s, v) => {
          const lift = cornerLift * Math.pow(Math.abs(s), 4.5) * Math.pow(v, 3.0);
          const x = s * (innerW * 0.5 + (outerW * 0.5 - innerW * 0.5) * v);
          const y = height * Math.pow(1 - v, curve) + lift;
          const z = sign * (innerD * 0.5 + (outerD * 0.5 - innerD * 0.5) * v);
          return [x, y, z, x / TILE, (v * slope) / TILE];
        },
        segments,
        vSegments
      )
    );
  }
  for (const sign of [1, -1]) {
    geoParts.push(
      surfaceGeometry(
        (s, v) => {
          const lift = cornerLift * Math.pow(Math.abs(s), 4.5) * Math.pow(v, 3.0);
          const x = sign * (innerW * 0.5 + (outerW * 0.5 - innerW * 0.5) * v);
          const y = height * Math.pow(1 - v, curve) + lift;
          const z = s * (innerD * 0.5 + (outerD * 0.5 - innerD * 0.5) * v);
          return [x, y, z, z / TILE, (v * slope) / TILE];
        },
        segments,
        vSegments
      )
    );
  }

  const pos = [];
  const uv = [];
  const idx = [];
  let base = 0;
  for (const g of geoParts) {
    pos.push(...g.attributes.position.array);
    uv.push(...g.attributes.uv.array);
    const ix = g.index.array;
    for (let i = 0; i < ix.length; i++) idx.push(ix[i] + base);
    base += g.attributes.position.count;
    g.dispose();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();

  const group = new THREE.Group();
  const mesh = new THREE.Mesh(geo, mats.roof);
  mesh.castShadow = true;
  group.add(mesh);

  const darkList = [];
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const pts = [];
      for (let i = 0; i <= 8; i++) {
        const v = i / 8;
        const lift = cornerLift * Math.pow(v, 3.0);
        pts.push(
          new THREE.Vector3(
            sx * (innerW * 0.5 + (outerW * 0.5 - innerW * 0.5) * v),
            height * Math.pow(1 - v, curve) + lift,
            sz * (innerD * 0.5 + (outerD * 0.5 - innerD * 0.5) * v)
          )
        );
      }
      darkList.push(tubeFromPoints(pts, 0.28, 6));
    }
  }
  addEaveTrim(group, outerW, outerD);
  const dm = mergedMesh(darkList, mats.roofDark, true, false);
  if (dm) group.add(dm);

  const innerTop = new THREE.Mesh(new THREE.BoxGeometry(innerW, 0.3, innerD), mats.teal);
  innerTop.position.y = height - 0.1;
  group.add(innerTop);
  return group;
}
