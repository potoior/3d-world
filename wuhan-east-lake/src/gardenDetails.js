import * as THREE from 'three';
import { mats } from './materials.js';
import { addBox, addCylinder, addBar, mergedMesh } from './geometry.js';
import { createRoof } from './roof.js';
import { getPlaqueMaterial } from './gardenBuild.js';

export function createCoveredBridge({ span = 16, width = 3.6, rise = 1.3, roofH = 2.2, x = 0, z = 0, rot = 0 }) {
  const group = new THREE.Group();
  const segs = 12;
  const deck = [];
  const curveY = (t) => 0.4 + rise * Math.cos((t * Math.PI) / 2);
  for (let i = 0; i < segs; i++) {
    const t0 = -1 + (2 * i) / segs;
    const t1 = -1 + (2 * (i + 1)) / segs;
    const z0 = (t0 * span) / 2;
    const z1 = (t1 * span) / 2;
    const y0 = curveY(t0);
    const y1 = curveY(t1);
    const g = new THREE.BoxGeometry(width, 0.3, (z1 - z0) * 1.03);
    g.rotateX(-Math.atan2(y1 - y0, z1 - z0));
    g.translate(0, (y0 + y1) / 2, (z0 + z1) / 2);
    deck.push(g);
  }
  const dm = mergedMesh(deck, mats.marbleShade, true, true);
  if (dm) group.add(dm);

  const posts = [];
  for (const sx of [-1, 1]) {
    for (let i = 0; i <= 6; i++) {
      const t = -1 + (2 * i) / 6;
      const zz = (t * span) / 2;
      const yy = curveY(t);
      addBox(posts, 0.16, 1.0, 0.16, sx * (width / 2 - 0.15), yy + 0.5, zz);
      addCylinder(posts, 0.12, 0.14, 2.3, 6, sx * (width / 2 - 0.15), yy + 1.9, zz);
    }
    for (let i = 0; i < 6; i++) {
      const t0 = -1 + (2 * i) / 6;
      const t1 = -1 + (2 * (i + 1)) / 6;
      const z0 = (t0 * span) / 2;
      const z1 = (t1 * span) / 2;
      const y0 = curveY(t0) + 1.0;
      const y1 = curveY(t1) + 1.0;
      addBar(posts, sx * (width / 2 - 0.15), z0, sx * (width / 2 - 0.15), z1, (y0 + y1) / 2, 0.1, 0.12);
    }
  }
  const pm = mergedMesh(posts, mats.wallDark, true, true);
  if (pm) group.add(pm);

  const roof = createRoof({
    width: span + 1.4,
    depth: width + 1.8,
    height: roofH,
    cornerLift: 0.5,
    curve: 1.5,
    ridgeRatio: 0.6,
    hasRidge: true,
    beasts: false,
  });
  roof.rotation.y = Math.PI / 2;
  roof.position.y = 2.9;
  group.add(roof);

  group.position.set(x, 0, z);
  group.rotation.y = rot;
  return group;
}

export function createZigzagBridge({ points = [], width = 2.2 }) {
  const group = new THREE.Group();
  const deck = [];
  const rails = [];
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, z0] = points[i];
    const [x1, z1] = points[i + 1];
    const len = Math.hypot(x1 - x0, z1 - z0);
    const ang = Math.atan2(x1 - x0, z1 - z0);
    const g = new THREE.BoxGeometry(width, 0.24, len + 0.6);
    g.rotateY(ang);
    g.translate((x0 + x1) / 2, 0.42, (z0 + z1) / 2);
    deck.push(g);
    for (const side of [-1, 1]) {
      const px = Math.cos(ang) * side * width / 2;
      const pz = -Math.sin(ang) * side * width / 2;
      const b = new THREE.BoxGeometry(0.16, 0.8, len);
      b.rotateY(ang);
      b.translate((x0 + x1) / 2 + px, 0.85, (z0 + z1) / 2 + pz);
      rails.push(b);
      for (let k = 0; k <= 3; k++) {
        const t = k / 3;
        addBox(rails, 0.18, 0.95, 0.18, x0 + (x1 - x0) * t + px, 0.9, z0 + (z1 - z0) * t + pz);
      }
    }
  }
  const dm = mergedMesh(deck, mats.marbleShade, true, true);
  if (dm) group.add(dm);
  const rm = mergedMesh(rails, mats.marble, true, true);
  if (rm) group.add(rm);
  return group;
}

export function createGardenWall({ length = 40, height = 3.2, thickness = 0.55, axis = 'x', windows = [], x = 0, z = 0 }) {
  const group = new THREE.Group();
  const w = axis === 'x' ? length : thickness;
  const d = axis === 'x' ? thickness : length;
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, height, d), mats.wall);
  body.position.y = height / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const base = new THREE.Mesh(new THREE.BoxGeometry(w + 0.15, 0.4, d + 0.15), mats.stone);
  base.position.y = 0.2;
  base.receiveShadow = true;
  group.add(base);

  const cap = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, 0.28, d + 0.3), mats.roofDark);
  cap.position.y = height + 0.1;
  cap.castShadow = true;
  group.add(cap);

  const geo = new THREE.PlaneGeometry(1, 1);
  for (const off of windows) {
    for (const side of [1, -1]) {
      const win = new THREE.Mesh(geo, mats.lattice);
      win.position.set(
        axis === 'x' ? off : side * (thickness / 2 + 0.01),
        height * 0.55,
        axis === 'x' ? side * (thickness / 2 + 0.01) : off
      );
      win.rotation.y = axis === 'x' ? (side > 0 ? 0 : Math.PI) : (side > 0 ? Math.PI / 2 : -Math.PI / 2);
      win.scale.set(1.5, 1.15, 1);
      group.add(win);
    }
  }

  group.position.set(x, 0, z);
  return group;
}

export function createMoonGateWall({ length = 22, height = 3.5, thickness = 0.7, radius = 1.55, x = 0, z = 0 }) {
  const group = new THREE.Group();
  const shape = new THREE.Shape();
  shape.moveTo(-length / 2, 0);
  shape.lineTo(length / 2, 0);
  shape.lineTo(length / 2, height);
  shape.lineTo(-length / 2, height);
  shape.closePath();
  const hole = new THREE.Path();
  hole.absarc(0, height * 0.48, radius, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false, curveSegments: 20 });
  geo.translate(0, 0, -thickness / 2);
  const body = new THREE.Mesh(geo, mats.wall);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const cap = new THREE.Mesh(new THREE.BoxGeometry(length + 0.3, 0.28, thickness + 0.3), mats.roofDark);
  cap.position.y = height + 0.1;
  group.add(cap);

  for (const sz of [-1, 1]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.1, 8, 40), mats.stone);
    ring.position.set(0, height * 0.48, sz * (thickness / 2 + 0.02));
    group.add(ring);
  }
  group.position.set(x, 0, z);
  return group;
}

export function createRibbonPath({ points = [], width = 2.6, y = 0.05, material = mats.path }) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(p[0], 0, p[1])), false, 'catmullrom', 0.4);
  const segs = Math.max(10, points.length * 8);
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const p = curve.getPoint(t);
    const tan = curve.getTangent(t);
    const nx = -tan.z;
    const nz = tan.x;
    const half = width / 2;
    positions.push(p.x + nx * half, y, p.z + nz * half);
    positions.push(p.x - nx * half, y, p.z - nz * half);
    uvs.push(t * 18, 0, t * 18, 1);
  }
  for (let i = 0; i < segs; i++) {
    const a = i * 2;
    indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, material);
  mesh.receiveShadow = true;
  return mesh;
}

export function createWillow({ height = 7.5, spread = 2.8, seed = 1 }) {
  const group = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.34, height * 0.6, 7), mats.trunk);
  trunk.position.y = height * 0.3;
  trunk.castShadow = true;
  group.add(trunk);
  const rnd = (n) => {
    const v = Math.sin(seed * 73.1 + n * 41.7) * 43758.5453;
    return v - Math.floor(v);
  };
  const foliage = [];
  for (let i = 0; i < 10; i++) {
    const r = 0.55 + rnd(i) * 0.75;
    const blob = new THREE.IcosahedronGeometry(r, 1);
    blob.scale(0.75, 1.6, 0.75);
    blob.translate((rnd(i + 8) - 0.5) * spread * 1.6, height * (0.55 + rnd(i + 3) * 0.28), (rnd(i + 15) - 0.5) * spread * 1.6);
    foliage.push(blob);
  }
  for (let i = 0; i < 7; i++) {
    const strand = new THREE.CylinderGeometry(0.05, 0.12, height * 0.38, 5);
    strand.rotateZ((rnd(i + 22) - 0.5) * 0.35);
    strand.translate((rnd(i + 30) - 0.5) * spread * 1.8, height * 0.55, (rnd(i + 37) - 0.5) * spread * 1.8);
    foliage.push(strand);
  }
  const fm = mergedMesh(foliage, mats.willow, true, true);
  if (fm) group.add(fm);
  group.scale.setScalar(0.9 + rnd(50) * 0.35);
  return group;
}

export function createBamboo({ height = 7, radius = 1.8, seed = 1 }) {
  const group = new THREE.Group();
  const list = [];
  const rnd = (n) => {
    const v = Math.sin(seed * 33.7 + n * 91.3) * 43758.5453;
    return v - Math.floor(v);
  };
  for (let i = 0; i < 14; i++) {
    const x = (rnd(i) - 0.5) * radius * 2;
    const z = (rnd(i + 4) - 0.5) * radius * 2;
    const h = height * (0.7 + rnd(i + 8) * 0.4);
    const g = new THREE.CylinderGeometry(0.03, 0.05, h, 5);
    g.rotateZ((rnd(i + 12) - 0.5) * 0.12);
    g.translate(x, h / 2, z);
    list.push(g);
    for (let k = 0; k < 3; k++) {
      const leaf = new THREE.IcosahedronGeometry(0.38 + rnd(i + k) * 0.2, 0);
      leaf.scale(1.5, 0.45, 0.7);
      leaf.translate(x + (rnd(i + k + 4) - 0.5) * 1.1, h * (0.62 + k * 0.12), z + (rnd(i + k + 7) - 0.5) * 1.1);
      list.push(leaf);
    }
  }
  const mesh = mergedMesh(list, mats.bamboo, true, true);
  if (mesh) group.add(mesh);
  return group;
}

export function createLotus({ x = 0, z = 0, radius = 3.2, count = 12, seed = 1 }) {
  const group = new THREE.Group();
  const leaves = [];
  const flowers = [];
  const rnd = (n) => {
    const v = Math.sin(seed * 57.3 + n * 33.1) * 43758.5453;
    return v - Math.floor(v);
  };
  for (let i = 0; i < count; i++) {
    const a = rnd(i) * Math.PI * 2;
    const r = Math.sqrt(rnd(i + 3)) * radius;
    const leaf = new THREE.CircleGeometry(0.35 + rnd(i + 6) * 0.55, 12);
    leaf.rotateX(-Math.PI / 2);
    leaf.translate(x + Math.cos(a) * r, 0.22, z + Math.sin(a) * r);
    leaves.push(leaf);
    if (i % 3 === 0) {
      const f = new THREE.SphereGeometry(0.13, 6, 5);
      f.scale(0.8, 1.3, 0.8);
      f.translate(x + Math.cos(a) * r, 0.5, z + Math.sin(a) * r);
      flowers.push(f);
    }
  }
  const lm = mergedMesh(leaves, mats.lotus, true, true);
  if (lm) group.add(lm);
  const fm = mergedMesh(flowers, mats.blossom, true, false);
  if (fm) group.add(fm);
  return group;
}

export function createFanPavilion({ radius = 3.6, wallH = 2.7, roofH = 2.6, baseH = 0.5, name = '', x = 0, z = 0, rot = 0 }) {
  const group = new THREE.Group();
  const deck = new THREE.Mesh(new THREE.CircleGeometry(radius + 1.0, 30, 0, Math.PI), mats.marbleShade);
  deck.rotation.x = -Math.PI / 2;
  deck.position.y = baseH;
  deck.receiveShadow = true;
  group.add(deck);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(radius + 1.0, radius + 1.2, baseH, 30, 1, false, 0, Math.PI), mats.stone);
  base.position.y = baseH / 2;
  base.rotation.y = Math.PI / 2;
  group.add(base);

  const cols = [];
  for (let i = 0; i <= 4; i++) {
    const a = (i / 4) * Math.PI;
    addCylinder(cols, 0.14, 0.16, wallH, 7, Math.cos(a) * (radius + 0.3), baseH + wallH / 2, Math.sin(a) * (radius + 0.3));
  }
  const cm = mergedMesh(cols, mats.wallDark, true, true);
  if (cm) group.add(cm);

  const rail = [];
  for (let i = 0; i < 4; i++) {
    const a0 = (i / 4) * Math.PI;
    const a1 = ((i + 1) / 4) * Math.PI;
    addBar(
      rail,
      Math.cos(a0) * (radius + 0.3),
      Math.sin(a0) * (radius + 0.3),
      Math.cos(a1) * (radius + 0.3),
      Math.sin(a1) * (radius + 0.3),
      baseH + 0.85,
      0.09,
      0.09
    );
  }
  const rm = mergedMesh(rail, mats.wallDark, true, true);
  if (rm) group.add(rm);

  const segU = 18;
  const segV = 8;
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let j = 0; j <= segV; j++) {
    const v = j / segV;
    for (let i = 0; i <= segU; i++) {
      const u = i / segU;
      const a = u * Math.PI;
      const lift = 0.5 * Math.pow(Math.abs(u * 2 - 1), 5) * Math.pow(v, 3);
      const r = (radius + 1.6) * v;
      positions.push(Math.cos(a) * r, roofH * Math.pow(1 - v, 1.5) + lift, Math.sin(a) * r);
      uvs.push((Math.cos(a) * r) / 1.3, (v * roofH) / 1.3);
    }
  }
  for (let j = 0; j < segV; j++) {
    for (let i = 0; i < segU; i++) {
      const a = j * (segU + 1) + i;
      indices.push(a, a + segU + 1, a + 1, a + 1, a + segU + 1, a + segU + 2);
    }
  }
  const rgeo = new THREE.BufferGeometry();
  rgeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  rgeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  rgeo.setIndex(indices);
  rgeo.computeVertexNormals();
  const roof = new THREE.Mesh(rgeo, mats.roof);
  roof.position.y = baseH + wallH;
  roof.castShadow = true;
  group.add(roof);

  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.56), getPlaqueMaterial(name || '与谁同坐轩'));
  plaque.position.set(0, baseH + wallH - 0.45, radius * 0.55);
  plaque.rotation.y = 0;
  group.add(plaque);

  group.position.set(x, 0, z);
  group.rotation.y = rot;
  return group;
}

export function createBoatPavilion({ x = 0, z = 0, rot = 0, name = '香洲' }) {
  const group = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 1.1, 6), mats.wood);
  hull.rotation.y = Math.PI / 6;
  hull.scale.set(3.4, 1, 1);
  hull.position.y = 0.55;
  hull.castShadow = true;
  group.add(hull);
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(2.7, 2.7, 0.2, 6), mats.wallDark);
  rim.rotation.y = Math.PI / 6;
  rim.scale.set(3.4, 1, 1);
  rim.position.y = 1.12;
  group.add(rim);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(8.5, 2.8, 3.8), mats.wall);
  cabin.position.set(-1.0, 2.6, 0);
  cabin.castShadow = true;
  group.add(cabin);
  const cols = [];
  for (let i = 0; i <= 4; i++) {
    const px = -1.0 - 4.25 + (i * 8.5) / 4;
    addCylinder(cols, 0.14, 0.15, 2.8, 7, px, 2.6, 1.95);
    addCylinder(cols, 0.14, 0.15, 2.8, 7, px, 2.6, -1.95);
  }
  const cm = mergedMesh(cols, mats.wallDark, true, true);
  if (cm) group.add(cm);

  const geo = new THREE.PlaneGeometry(1, 1);
  for (let i = 0; i < 4; i++) {
    const win = new THREE.Mesh(geo, mats.lattice);
    win.position.set(-1.0 - 4.25 + (i + 0.5) * (8.5 / 4), 2.7, 1.96);
    win.scale.set(1.7, 1.8, 1);
    group.add(win);
  }

  const roof = createRoof({
    width: 11.5,
    depth: 6.0,
    height: 3.2,
    cornerLift: 1.1,
    curve: 1.55,
    ridgeRatio: 0.55,
    hasRidge: true,
    beasts: false,
  });
  roof.position.set(-1.0, 4.0, 0);
  group.add(roof);

  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.62), getPlaqueMaterial(name));
  plaque.position.set(-1.0, 3.55, 1.98);
  group.add(plaque);

  group.position.set(x, 0, z);
  group.rotation.y = rot;
  return group;
}
