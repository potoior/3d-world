import * as THREE from 'three';
import { mats } from './materials.js';
import { addBox, mergedMesh } from './geometry.js';

const TILE = 1.32;

function tubeFromPoints(points, radius, radialSegments = 5) {
  const curve = new THREE.CatmullRomCurve3(points);
  return new THREE.TubeGeometry(curve, Math.max(6, Math.round(points.length * 1.25)), radius, radialSegments, false);
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
  segments = 20,
  vSegments = 12,
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
  const shade = [];
  addBox(shade, width + 0.12, 0.2, 0.3, 0, y - 0.52, depth * 0.5 + 0.08);
  addBox(shade, width + 0.12, 0.2, 0.3, 0, y - 0.52, -depth * 0.5 - 0.08);
  addBox(shade, 0.3, 0.2, depth + 0.12, width * 0.5 + 0.08, y - 0.52, 0);
  addBox(shade, 0.3, 0.2, depth + 0.12, -width * 0.5 - 0.08, y - 0.52, 0);
  const sm = mergedMesh(shade, mats.blue, false, false);
  if (sm) group.add(sm);
}

function addEaveTiles(list, width, depth, cornerLift, detail = false) {
  const spacing = 1.72;
  let capTick = 0;
  const tile = (x, y, z, along) => {
    const g = new THREE.CylinderGeometry(0.15, 0.17, 0.22, 5, 1, true);
    if (along === 'z') g.rotateX(Math.PI / 2);
    else g.rotateZ(Math.PI / 2);
    g.translate(x, y, z);
    list.push(g);
    if (detail && capTick++ % 3 === 0) {
      const dir = along === 'z' ? (z > 0 ? 1 : -1) : (x > 0 ? 1 : -1);
      if (along === 'z') addBox(list, 0.28, 0.11, 0.07, x, y + 0.01, z + dir * 0.16);
      else addBox(list, 0.07, 0.11, 0.28, x + dir * 0.16, y + 0.01, z);
    }
  };
  const nx = Math.max(2, Math.round(width / spacing));
  for (let i = 0; i <= nx; i++) {
    const s = (i / nx) * 2 - 1;
    const x = s * width * 0.5;
    const y = cornerLift * Math.pow(Math.abs(s), 4.5) + 0.02;
    tile(x, y, depth * 0.5 + 0.04, 'z');
    tile(x, y, -depth * 0.5 - 0.04, 'z');
  }
  const nz = Math.max(2, Math.round(depth / spacing));
  for (let i = 0; i <= nz; i++) {
    const s = (i / nz) * 2 - 1;
    const z = s * depth * 0.5;
    const y = cornerLift * Math.pow(Math.abs(s), 4.5) + 0.02;
    tile(width * 0.5 + 0.04, y, z, 'x');
    tile(-width * 0.5 - 0.04, y, z, 'x');
  }
}

function addCornerTips(list, width, depth, cornerLift, detail = false) {
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const p = new THREE.Vector3(sx * width * 0.5, cornerLift + 0.05, sz * depth * 0.5);
      const pts = [
        p.clone(),
        p.clone().add(new THREE.Vector3(sx * 0.45, 0.18, sz * 0.45)),
        p.clone().add(new THREE.Vector3(sx * 0.95, 0.62, sz * 0.95)),
        p.clone().add(new THREE.Vector3(sx * 1.3, 1.32, sz * 1.3)),
      ];
      list.push(tubeFromPoints(pts, 0.2, 5));
      if (detail && width >= 36) {
        const inner = [
          p.clone().add(new THREE.Vector3(-sx * 0.35, -0.05, -sz * 0.35)),
          p.clone().add(new THREE.Vector3(sx * 0.1, 0.14, sz * 0.1)),
          p.clone().add(new THREE.Vector3(sx * 0.62, 0.5, sz * 0.62)),
          p.clone().add(new THREE.Vector3(sx * 1.05, 1.12, sz * 1.05)),
        ];
        list.push(tubeFromPoints(inner, 0.12, 4));
        for (let i = 0; i < 3; i++) {
          const t = 0.42 + i * 0.18;
          addBox(list, 0.1, 0.1, 0.74, sx * width * 0.5, cornerLift + t * 0.36, sz * depth * 0.5, sx * sz * 0.15);
        }
      }
    }
  }
}

function addBeast(list, x, y, z, s = 1) {
  const body = new THREE.SphereGeometry(0.16 * s, 5, 3);
  body.scale(1.45, 0.85, 0.72);
  body.translate(x, y, z);
  list.push(body);
  const head = new THREE.SphereGeometry(0.1 * s, 4, 3);
  head.translate(x + 0.2 * s, y + 0.06 * s, z);
  list.push(head);
  const ear = new THREE.ConeGeometry(0.045 * s, 0.13 * s, 4);
  ear.translate(x + 0.2 * s, y + 0.17 * s, z);
  list.push(ear);
  const tail = new THREE.ConeGeometry(0.05 * s, 0.3 * s, 4);
  tail.rotateZ(-0.7);
  tail.translate(x - 0.27 * s, y + 0.1 * s, z);
  list.push(tail);
}

function addCoffers(list, width, depth) {
  if (width < 18 || depth < 12) return;
  const cw = width * 0.82;
  const cd = depth * 0.8;
  const step = 3.4;
  for (let x = -cw / 2; x <= cw / 2 + 0.01; x += step) {
    addBox(list, 0.1, 0.09, cd, x, -0.5, 0);
  }
  for (let z = -cd / 2; z <= cd / 2 + 0.01; z += step) {
    addBox(list, cw, 0.09, 0.1, 0, -0.5, z);
  }
  addBox(list, cw + 0.2, 0.13, 0.16, 0, -0.48, cd / 2);
  addBox(list, cw + 0.2, 0.13, 0.16, 0, -0.48, -cd / 2);
  addBox(list, 0.16, 0.13, cd + 0.2, cw / 2, -0.48, 0);
  addBox(list, 0.16, 0.13, cd + 0.2, -cw / 2, -0.48, 0);
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
  const rich = Math.min(width, depth) >= 13;
  const geo = createRoofGeometry({
    width,
    depth,
    height,
    cornerLift,
    curve,
    ridgeRatio,
    segments: rich ? 11 : 7,
    vSegments: rich ? 7 : 4,
  });
  const mesh = new THREE.Mesh(geo, mats.roof);
  mesh.castShadow = true;
  group.add(mesh);

  const darkList = [];
  const goldList = [];
  const ridgeHalf = geo.userData.ridgeHalf;

  addEaveTiles(darkList, width, depth, cornerLift, rich);
  addCornerTips(darkList, width, depth, cornerLift, rich);
  addCoffers(goldList, width, depth);

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
    if (rich) {
      for (let p = -ridgeHalf + 0.55; p < ridgeHalf - 0.3; p += 1.6) {
        addBox(darkList, 0.5, 0.26, 0.76, p, height + 0.62, 0);
      }
    }
    for (const sx of [-1, 1]) {
      const lip = new THREE.BoxGeometry(1.0, 2.2, 1.2);
      lip.translate(sx * (ridgeHalf + 0.18), height + 1.0, 0);
      darkList.push(lip);
      const tail = new THREE.ConeGeometry(0.62, 1.6, 4);
      tail.rotateZ(sx * -0.35);
      tail.translate(sx * (ridgeHalf + 0.34), height + 2.35, 0);
      darkList.push(tail);
      if (rich) {
        const curl = [
          new THREE.Vector3(sx * (ridgeHalf + 0.1), height + 0.55, 0),
          new THREE.Vector3(sx * (ridgeHalf + 0.62), height + 1.1, 0),
          new THREE.Vector3(sx * (ridgeHalf + 0.28), height + 1.85, 0),
          new THREE.Vector3(sx * (ridgeHalf - 0.12), height + 2.3, 0),
          new THREE.Vector3(sx * (ridgeHalf - 0.52), height + 2.08, 0),
        ];
        darkList.push(tubeFromPoints(curl, 0.23, 5));
        const eye = new THREE.SphereGeometry(0.24, 5, 4);
        eye.translate(sx * (ridgeHalf + 0.34), height + 1.85, 0);
        darkList.push(eye);
      }
      if (beasts) {
        for (let i = 0; i < 3; i++) {
          const cone = new THREE.ConeGeometry(0.18, 0.5, 5);
          cone.translate(sx * ridgeHalf * (0.55 + i * 0.16), height + 0.56, 0);
          goldList.push(cone);
        }
      }
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
      if (rich) {
        for (let i = 0; i < 3; i++) {
          const v = i / 3 + 0.08;
          const p = hipPoint(width, depth, height, cornerLift, curve, sx, sz, v, ridgeRatio);
          const p2 = hipPoint(width, depth, height, cornerLift, curve, sx, sz, Math.min(1, v + 0.16), ridgeRatio);
          addBox(darkList, 0.46, 0.22, 0.68, (p.x + p2.x) / 2, (p.y + p2.y) / 2 + 0.12, (p.z + p2.z) / 2, Math.atan2(p2.x - p.x, p2.z - p.z));
        }
      }
      if (beasts) {
        for (let i = 0; i < 2; i++) {
          const v = 0.62 + i * 0.16;
          const p = hipPoint(width, depth, height, cornerLift, curve, sx, sz, v, ridgeRatio);
          if (rich) {
            addBeast(goldList, p.x, p.y + 0.45, p.z, 0.9 + i * 0.06);
          } else {
            const cone = new THREE.ConeGeometry(0.2 + 0.02 * i, 0.55 + 0.04 * i, 5);
            cone.translate(p.x, p.y + 0.48, p.z);
            goldList.push(cone);
          }
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
  segments = 12,
  vSegments = 6,
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
  const rich = outerW >= 20 || outerD >= 18;
  addEaveTiles(darkList, outerW, outerD, cornerLift, rich);
  addCornerTips(darkList, outerW, outerD, cornerLift, rich);
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
