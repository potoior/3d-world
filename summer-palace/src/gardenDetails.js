import * as THREE from 'three';
import { mats } from './materials.js';
import { addBox, addCylinder, addBar, mergedMesh } from './geometry.js';
import { createRoof } from './roof.js';
import { getPlaqueMaterial } from './gardenBuild.js';

export function createCoveredBridge({ span = 14, width = 2.8, rise = 1.1, roofH = 1.7, x = 0, z = 0, rot = 0 }) {
  const group = new THREE.Group();
  const segs = 14;
  const deck = [];
  const curveY = (t) => 0.35 + rise * Math.cos((t * Math.PI) / 2);
  for (let i = 0; i < segs; i++) {
    const t0 = -1 + (2 * i) / segs;
    const t1 = -1 + (2 * (i + 1)) / segs;
    const z0 = (t0 * span) / 2;
    const z1 = (t1 * span) / 2;
    const y0 = curveY(t0);
    const y1 = curveY(t1);
    const g = new THREE.BoxGeometry(width, 0.22, (z1 - z0) * 1.04);
    g.rotateX(-Math.atan2(y1 - y0, z1 - z0));
    g.translate(0, (y0 + y1) / 2, (z0 + z1) / 2);
    deck.push(g);
  }
  const dm = mergedMesh(deck, mats.timber, true, true);
  if (dm) group.add(dm);

  const posts = [];
  const rails = [];
  for (const sx of [-1, 1]) {
    for (let i = 0; i <= 7; i++) {
      const t = -1 + (2 * i) / 7;
      const zz = (t * span) / 2;
      const yy = curveY(t);
      addBox(posts, 0.16, 2.2, 0.16, sx * (width / 2 - 0.12), yy + 1.05, zz);
      addBox(posts, 0.1, 0.1, 0.72, sx * (width / 2 + 0.02), yy + 1.05, zz);
      addBox(posts, 0.24, 0.1, 0.24, sx * (width / 2 - 0.12), yy + 2.14, zz);
      addBox(posts, 0.05, 0.62, 0.05, sx * (width / 2 - 0.12), yy + 0.5, zz);
    }
    for (let i = 0; i < 14; i++) {
      const t = -1 + (2 * i) / 14;
      const zz = (t * span) / 2;
      const yy = curveY(t);
      const t2 = -1 + (2 * (i + 1)) / 14;
      const z2 = (t2 * span) / 2;
      const y2 = curveY(t2);
      addBar(rails, sx * (width / 2 - 0.12), zz, sx * (width / 2 - 0.12), z2, (yy + y2) / 2 + 0.95, 0.09, 0.1);
      addBar(rails, sx * (width / 2 - 0.12), zz, sx * (width / 2 - 0.12), z2, (yy + y2) / 2 + 0.5, 0.07, 0.07);
      if (i % 2 === 0) addBox(rails, 0.08, 0.86, 0.08, sx * (width / 2 - 0.12), yy + 0.52, zz);
      if (i % 2 === 0) {
        addBar(rails, sx * (width / 2 - 0.12), zz, sx * (width / 2 - 0.12), z2, (yy + y2) / 2 + 0.76, 0.045, 0.045);
      }
    }
  }
  const pm = mergedMesh(posts, mats.timberRed, true, true);
  if (pm) group.add(pm);
  const rm = mergedMesh(rails, mats.timber, true, true);
  if (rm) group.add(rm);

  const roof = createRoof({
    width: span + 1.4,
    depth: width + 1.5,
    height: roofH,
    cornerLift: 0.55,
    curve: 1.5,
    ridgeRatio: 0.6,
    hasRidge: true,
    beasts: false,
  });
  roof.rotation.y = Math.PI / 2;
  roof.position.y = 3.35;
  roof.traverse((o) => {
    if (o.isMesh && o.material === mats.roof) o.material = mats.roofDark;
  });
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
      addBar(rails, x0 + px, z0 + pz, x1 + px, z1 + pz, 1.3, 0.12, 0.28);
      for (let k = 0; k <= 3; k++) {
        const t = k / 3;
        const pxk = x0 + (x1 - x0) * t + px;
        const pzk = z0 + (z1 - z0) * t + pz;
        addBox(rails, 0.2, 0.95, 0.2, pxk, 0.9, pzk);
        addBox(rails, 0.3, 0.12, 0.3, pxk, 1.4, pzk);
        addBox(rails, 0.12, 0.16, 0.34, pxk, 1.24, pzk);
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

  const cap = new THREE.Mesh(new THREE.BoxGeometry(w + 0.34, 0.16, d + 0.34), mats.roofDark);
  cap.position.y = height + 0.03;
  cap.castShadow = true;
  group.add(cap);
  const capTop = new THREE.Mesh(new THREE.BoxGeometry(w + 0.12, 0.15, d + 0.12), mats.roof);
  capTop.position.y = height + 0.17;
  capTop.castShadow = true;
  group.add(capTop);
  const ridge = new THREE.Mesh(
    new THREE.BoxGeometry(axis === 'x' ? length + 0.2 : 0.15, 0.14, axis === 'x' ? 0.15 : length + 0.2),
    mats.trimDark
  );
  ridge.position.y = height + 0.3;
  group.add(ridge);
  const caps = [];
  const count = Math.max(3, Math.round(length / 1.55));
  for (let i = 0; i <= count; i++) {
    const p = -length / 2 + (i * length) / count;
    for (const side of [-1, 1]) {
      const c = new THREE.CylinderGeometry(0.065, 0.065, thickness + 0.26, 4, 1, true);
      if (axis === 'x') {
        c.rotateX(Math.PI / 2);
        c.translate(p, height + 0.29, side * 0.09);
      } else {
        c.rotateZ(Math.PI / 2);
        c.translate(side * 0.09, height + 0.29, p);
      }
      caps.push(c);
    }
  }
  const capMesh = mergedMesh(caps, mats.roofDark, false, false);
  if (capMesh) group.add(capMesh);

  const geo = new THREE.PlaneGeometry(1, 1);
  const frames = [];
  const sills = [];
  for (const off of windows) {
    for (const side of [1, -1]) {
      const win = new THREE.Mesh(geo, mats.leak);
      win.position.set(
        axis === 'x' ? off : side * (thickness / 2 + 0.02),
        height * 0.56,
        axis === 'x' ? side * (thickness / 2 + 0.02) : off
      );
      win.rotation.y = axis === 'x' ? (side > 0 ? 0 : Math.PI) : (side > 0 ? Math.PI / 2 : -Math.PI / 2);
      win.scale.set(1.75, 1.35, 1);
      group.add(win);
      const px = axis === 'x' ? off : side * (thickness / 2 + 0.035);
      const pz = axis === 'x' ? side * (thickness / 2 + 0.035) : off;
      const along = axis === 'x' ? 1 : 0;
      for (const [ux, uy, uw, uh] of [
        [0, 0.72, 1.95, 0.16],
        [0, -0.72, 1.95, 0.16],
        [-0.94, 0, 0.16, 1.45],
        [0.94, 0, 0.16, 1.45],
      ]) {
        addBox(
          frames,
          along ? uw : 0.12,
          uh,
          along ? 0.12 : uw,
          px + (along ? ux : 0),
          height * 0.56 + uy,
          pz + (along ? 0 : ux),
          0
        );
      }
      const sillY = height * 0.56 - 0.82;
      addBox(sills, along ? 2.16 : 0.26, 0.13, along ? 0.26 : 2.16, px, sillY, pz);
      addBox(sills, along ? 2.2 : 0.2, 0.1, along ? 0.2 : 2.2, px, height * 0.56 + 0.84, pz);
      for (const u of [-0.96, 0.96]) {
        addBox(sills, along ? 0.2 : 0.2, 1.62, along ? 0.2 : 0.2, px + (along ? u : 0), height * 0.56, pz + (along ? 0 : u));
      }
    }
  }
  const fm = mergedMesh(frames, mats.stone, false, true);
  if (fm) group.add(fm);
  const sm = mergedMesh(sills, mats.stone, false, true);
  if (sm) group.add(sm);

  group.position.set(x, 0, z);
  return group;
}

export function createMoonGateWall({ length = 22, height = 3.5, thickness = 0.7, radius = 1.55, x = 0, z = 0, rot = 0 }) {
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

  const cap = new THREE.Mesh(new THREE.BoxGeometry(length + 0.34, 0.17, thickness + 0.34), mats.roofDark);
  cap.position.y = height + 0.02;
  group.add(cap);
  const capTop = new THREE.Mesh(new THREE.BoxGeometry(length + 0.12, 0.16, thickness + 0.12), mats.roof);
  capTop.position.y = height + 0.17;
  group.add(capTop);
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(length + 0.2, 0.14, 0.16), mats.trimDark);
  ridge.position.y = height + 0.3;
  group.add(ridge);
  const caps = [];
  const count = Math.max(4, Math.round(length / 1.5));
  for (let i = 0; i <= count; i++) {
    const p = -length / 2 + (i * length) / count;
    for (const side of [-1, 1]) {
      const c = new THREE.CylinderGeometry(0.07, 0.07, thickness + 0.28, 4, 1, true);
      c.rotateX(Math.PI / 2);
      c.translate(p, height + 0.29, side * 0.09);
      caps.push(c);
    }
  }
  const capMesh = mergedMesh(caps, mats.roofDark, false, false);
  if (capMesh) group.add(capMesh);

  for (const sz of [-1, 1]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.09, 8, 40), mats.stone);
    ring.position.set(0, height * 0.48, sz * (thickness / 2 + 0.02));
    group.add(ring);
    const inner = new THREE.Mesh(new THREE.TorusGeometry(radius - 0.16, 0.035, 5, 32), mats.marbleShade);
    inner.position.set(0, height * 0.48, sz * (thickness / 2 + 0.03));
    group.add(inner);
  }
  const step = new THREE.Mesh(new THREE.BoxGeometry(radius * 1.5, 0.12, thickness + 1.2), mats.stone);
  step.position.set(0, 0.06, 0);
  group.add(step);
  group.position.set(x, 0, z);
  group.rotation.y = rot;
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
  const group = new THREE.Group();
  group.add(mesh);
  const edge = [];
  const total = curve.getLength();
  const step = Math.max(0.9, total / 90);
  for (let d = 0; d < total; d += step * 1.95) {
    const t = d / total;
    const p = curve.getPoint(t);
    const tan = curve.getTangent(t);
    const ang = Math.atan2(tan.x, tan.z);
    for (const side of [-1, 1]) {
      const nx = -tan.z * side;
      const nz = tan.x * side;
      const g = new THREE.BoxGeometry(0.24, 0.09, step * 1.12);
      g.rotateY(ang);
      g.translate(p.x + nx * (width / 2 + 0.14), y + 0.02, p.z + nz * (width / 2 + 0.14));
      edge.push(g);
    }
  }
  const em = mergedMesh(edge, mats.stone, false, true);
  if (em) group.add(em);
  return group;
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
  for (let i = 0; i < 12; i++) {
    const r = 0.55 + rnd(i) * 0.72;
    const blob = new THREE.IcosahedronGeometry(r, 1);
    blob.scale(0.8, 1.45, 0.8);
    blob.translate((rnd(i + 8) - 0.5) * spread * 1.7, height * (0.58 + rnd(i + 3) * 0.25), (rnd(i + 15) - 0.5) * spread * 1.7);
    foliage.push(blob);
  }
  for (let i = 0; i < 12; i++) {
    const len = height * (0.3 + rnd(i + 2) * 0.16);
    const strand = new THREE.ConeGeometry(0.16, len, 5);
    strand.rotateX(Math.PI);
    strand.rotateZ((rnd(i + 22) - 0.5) * 0.4);
    strand.translate((rnd(i + 30) - 0.5) * spread * 2.0, height * 0.52 - len * 0.5, (rnd(i + 37) - 0.5) * spread * 2.0);
    foliage.push(strand);
  }
  for (let i = 0; i < 12; i++) {
    const a = rnd(i + 60) * Math.PI * 2;
    const rr = spread * (0.55 + rnd(i + 61) * 0.75);
    const leaf = new THREE.IcosahedronGeometry(0.1 + rnd(i + 62) * 0.1, 0);
    leaf.scale(0.55, 1.9, 0.55);
    leaf.translate(
      Math.cos(a) * rr,
      height * (0.2 + rnd(i + 63) * 0.34),
      Math.sin(a) * rr
    );
    foliage.push(leaf);
  }
  for (let i = 0; i < 9; i++) {
    const a = rnd(i + 84) * Math.PI * 2;
    const len = height * (0.26 + rnd(i + 85) * 0.2);
    const strand = new THREE.ConeGeometry(0.075, len, 4);
    strand.rotateX(Math.PI);
    strand.rotateZ((rnd(i + 86) - 0.5) * 0.5);
    strand.translate(
      Math.cos(a) * spread * (0.7 + rnd(i + 87) * 0.75),
      height * (0.5 + rnd(i + 88) * 0.1) - len * 0.5,
      Math.sin(a) * spread * (0.7 + rnd(i + 89) * 0.75)
    );
    foliage.push(strand);
  }
  const branches = [];
  for (let i = 0; i < 3; i++) {
    const a = rnd(i + 70) * Math.PI * 2;
    const pts = [
      new THREE.Vector3(0, height * 0.42, 0),
      new THREE.Vector3(Math.cos(a) * spread * 0.4, height * 0.56, Math.sin(a) * spread * 0.4),
      new THREE.Vector3(Math.cos(a) * spread * 0.8, height * (0.66 + rnd(i + 71) * 0.1), Math.sin(a) * spread * 0.8),
    ];
    branches.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 5, 0.06, 4, false));
  }
  const bm = mergedMesh(branches, mats.trunk, true, true);
  if (bm) group.add(bm);
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
    for (let k = 1; k <= 3; k++) {
      const node = new THREE.CylinderGeometry(0.052, 0.052, 0.035, 4, 1, true);
      node.rotateZ((rnd(i + 12) - 0.5) * 0.12);
      node.translate(x, (h * k) / 4, z);
      list.push(node);
    }
    for (let k = 0; k < 5; k++) {
      const leaf = new THREE.IcosahedronGeometry(0.34 + rnd(i + k) * 0.22, 0);
      leaf.scale(1.6, 0.4, 0.68);
      leaf.rotateY(rnd(i + k + 17) * 3.1);
      leaf.translate(x + (rnd(i + k + 4) - 0.5) * 1.2, h * (0.58 + k * 0.09), z + (rnd(i + k + 7) - 0.5) * 1.2);
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
  const buds = [];
  const rnd = (n) => {
    const v = Math.sin(seed * 57.3 + n * 33.1) * 43758.5453;
    return v - Math.floor(v);
  };
  for (let i = 0; i < count; i++) {
    const a = rnd(i) * Math.PI * 2;
    const r = Math.sqrt(rnd(i + 3)) * radius;
    const px = x + Math.cos(a) * r;
    const pz = z + Math.sin(a) * r;
    const size = 0.45 + rnd(i + 6) * 0.55;
    const ly = 0.24 + rnd(i + 9) * 0.08;
    const leaf = new THREE.CircleGeometry(size, 14);
    leaf.rotateX(-Math.PI / 2);
    leaf.rotateY(rnd(i + 2) * 3.1);
    leaf.translate(px, ly, pz);
    leaves.push(leaf);
    for (let k = 0; k < 6; k++) {
      const va = (k / 6) * Math.PI * 2 + rnd(i + 30) * 0.4;
      addBar(leaves, px, pz, px + Math.cos(va) * size * 0.86, pz + Math.sin(va) * size * 0.86, ly + 0.006, 0.008, 0.014);
    }
    if (size > 0.68) {
      const rim = new THREE.TorusGeometry(size * 0.92, 0.012, 3, 9);
      rim.rotateX(-Math.PI / 2);
      rim.translate(px, ly + 0.004, pz);
      leaves.push(rim);
    }
    const stem = new THREE.CylinderGeometry(0.025, 0.03, 0.34, 4);
    stem.translate(px, 0.15, pz);
    leaves.push(stem);
    if (i % 2 === 0) {
      const cy = 0.55 + rnd(i + 4) * 0.22;
      for (let k = 0; k < 4; k++) {
        const pa = (k / 4) * Math.PI * 2 + rnd(i + 40) * 0.5;
        const p = new THREE.SphereGeometry(0.075, 6, 4);
        p.scale(1.15, 1.8, 0.42);
        p.rotateX(0.55);
        p.rotateY(pa);
        p.translate(px + Math.cos(pa) * 0.11, cy, pz + Math.sin(pa) * 0.11);
        flowers.push(p);
      }
      const core = new THREE.SphereGeometry(0.07, 6, 4);
      core.scale(1, 0.7, 1);
      core.translate(px, cy + 0.03, pz);
      buds.push(core);
    } else if (i % 5 === 0) {
      const bud = new THREE.ConeGeometry(0.08, 0.28, 6);
      bud.rotateZ((rnd(i + 50) - 0.5) * 0.3);
      bud.translate(px, 0.72, pz);
      flowers.push(bud);
    }
  }
  const lm = mergedMesh(leaves, mats.lotus, true, true);
  if (lm) group.add(lm);
  const fm = mergedMesh(flowers, seed % 3 === 0 ? mats.blossomPale : seed % 3 === 1 ? mats.blossom : mats.blossomRose, true, false);
  if (fm) group.add(fm);
  const cm = mergedMesh(buds, mats.gold, false, false);
  if (cm) group.add(cm);
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

  const fanWin = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.58, 24, 0, Math.PI), mats.leak);
  fanWin.position.set(0, baseH + wallH * 0.53, -0.04);
  fanWin.rotation.y = Math.PI;
  fanWin.scale.set(1.35, 1, 1);
  group.add(fanWin);
  const fanRim = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.58, 0.05, 6, 24, Math.PI), mats.timber);
  fanRim.position.set(0, baseH + wallH * 0.53, -0.08);
  fanRim.rotation.y = Math.PI;
  fanRim.scale.set(1.35, 1, 1);
  group.add(fanRim);

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
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(2.7, 2.7, 0.2, 6), mats.timberRed);
  rim.rotation.y = Math.PI / 6;
  rim.scale.set(3.4, 1, 1);
  rim.position.y = 1.12;
  group.add(rim);
  const bow = new THREE.Mesh(new THREE.ConeGeometry(2.05, 4.6, 6), mats.timber);
  bow.rotation.z = -Math.PI / 2;
  bow.rotation.x = Math.PI / 6;
  bow.position.set(9.4, 0.58, 0);
  bow.scale.set(1, 1, 0.55);
  bow.castShadow = true;
  group.add(bow);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.18, 4.4), mats.timber);
  deck.position.set(-0.6, 1.24, 0);
  deck.receiveShadow = true;
  group.add(deck);

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

  const rail = [];
  const geo = new THREE.PlaneGeometry(1, 1);
  for (let i = 0; i < 4; i++) {
    for (const sz of [1, -1]) {
      const win = new THREE.Mesh(geo, mats.lattice);
      win.position.set(-1.0 - 4.25 + (i + 0.5) * (8.5 / 4), 2.7, sz * 1.96);
      win.rotation.y = sz > 0 ? 0 : Math.PI;
      win.scale.set(1.7, 1.8, 1);
      group.add(win);
      const wx = -1.0 - 4.25 + (i + 0.5) * (8.5 / 4);
      addBox(rail, 0.055, 1.86, 0.055, wx - 0.84, 2.7, sz * 2.0);
      addBox(rail, 0.055, 1.86, 0.055, wx + 0.84, 2.7, sz * 2.0);
      addBox(rail, 1.74, 0.055, 0.055, wx, 2.7, sz * 2.0);
      addBox(rail, 1.74, 0.055, 0.055, wx, 2.32, sz * 2.0);
    }
  }
  const trim = [];
  const bowRing = new THREE.TorusGeometry(1.1, 0.09, 6, 18);
  bowRing.rotateY(Math.PI / 2);
  bowRing.scale(1, 0.72, 1);
  bowRing.translate(10.35, 0.72, 0);
  trim.push(bowRing);
  const head = new THREE.SphereGeometry(0.28, 8, 6);
  head.scale(1.5, 0.9, 0.8);
  head.translate(11.5, 0.86, 0);
  trim.push(head);
  const horn = new THREE.ConeGeometry(0.13, 0.7, 5);
  horn.rotateZ(-0.7);
  horn.translate(11.6, 1.3, 0.2);
  trim.push(horn);
  const horn2 = horn.clone();
  horn2.translate(0, 0, -0.4);
  trim.push(horn2);
  const tm = mergedMesh(trim, mats.gold, false, false);
  if (tm) group.add(tm);
  for (let i = 0; i <= 5; i++) {
    const px = 3.3 + i * 0.8;
    for (const sz of [-1, 1]) addCylinder(rail, 0.06, 0.07, 0.9, 5, px, 1.75, sz * 2.15);
  }
  for (const sz of [-1, 1]) addBar(rail, 3.3, sz * 2.15, 7.3, sz * 2.15, 2.2, 0.09, 0.1);
  const rm = mergedMesh(rail, mats.timberRed, true, true);
  if (rm) group.add(rm);

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

export function createShrub({ radius = 1.6, height = 1.5, seed = 1 }) {
  const group = new THREE.Group();
  const list = [];
  const rnd = (n) => {
    const v = Math.sin(seed * 61.7 + n * 39.1) * 43758.5453;
    return v - Math.floor(v);
  };
  for (let i = 0; i < 8; i++) {
    const r = radius * (0.35 + rnd(i) * 0.42);
    const blob = new THREE.IcosahedronGeometry(r, 1);
    blob.scale(1.15, 0.72 + rnd(i + 3) * 0.35, 1.05);
    blob.translate(
      (rnd(i + 5) - 0.5) * radius * 1.2,
      height * (0.32 + rnd(i + 7) * 0.34),
      (rnd(i + 9) - 0.5) * radius * 1.2
    );
    list.push(blob);
  }
  const mesh = mergedMesh(list, mats.shrub, true, true);
  if (mesh) group.add(mesh);
  return group;
}

export function createBanana({ height = 3.2, seed = 1 }) {
  const group = new THREE.Group();
  const rnd = (n) => {
    const v = Math.sin(seed * 29.3 + n * 51.7) * 43758.5453;
    return v - Math.floor(v);
  };
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.26, height * 0.62, 8), mats.trunk);
  trunk.position.y = height * 0.31;
  trunk.castShadow = true;
  group.add(trunk);
  const leaves = [];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + rnd(i) * 0.6;
    const leaf = new THREE.SphereGeometry(0.55, 8, 6);
    leaf.scale(0.32, 0.1, 1.5 + rnd(i + 4) * 0.7);
    leaf.rotateX(-0.55 - rnd(i + 6) * 0.25);
    leaf.translate(Math.cos(a) * 0.75, height * (0.68 + rnd(i + 8) * 0.2), Math.sin(a) * 0.75);
    leaf.rotateY(a);
    leaves.push(leaf);
  }
  const mesh = mergedMesh(leaves, mats.banana, true, true);
  if (mesh) group.add(mesh);
  return group;
}

export function createArchBridge({ span = 8, width = 2.4, rise = 1.8, x = 0, z = 0, rot = 0 }) {
  const group = new THREE.Group();
  const segs = 12;
  const deck = [];
  const curveY = (t) => 0.35 + rise * Math.cos((t * Math.PI) / 2);
  for (let i = 0; i < segs; i++) {
    const t0 = -1 + (2 * i) / segs;
    const t1 = -1 + (2 * (i + 1)) / segs;
    const z0 = (t0 * span) / 2;
    const z1 = (t1 * span) / 2;
    const y0 = curveY(t0);
    const y1 = curveY(t1);
    const g = new THREE.BoxGeometry(width, 0.22, (z1 - z0) * 1.05);
    g.rotateX(-Math.atan2(y1 - y0, z1 - z0));
    g.translate(0, (y0 + y1) / 2, (z0 + z1) / 2);
    deck.push(g);
  }
  const dm = mergedMesh(deck, mats.stone, true, true);
  if (dm) group.add(dm);
  const rails = [];
  for (const sx of [-1, 1]) {
    for (let i = 0; i <= 8; i++) {
      const t = -1 + (2 * i) / 8;
      addBox(rails, 0.14, 0.85, 0.14, sx * (width / 2 - 0.08), curveY(t) + 0.55, (t * span) / 2);
      addBox(rails, 0.24, 0.13, 0.24, sx * (width / 2 - 0.08), curveY(t) + 1.02, (t * span) / 2);
      addBox(rails, 0.1, 0.16, 0.28, sx * (width / 2 - 0.08), curveY(t) + 0.88, (t * span) / 2);
    }
    for (let i = 0; i < 8; i++) {
      const t0 = -1 + (2 * i) / 8;
      const t1 = -1 + (2 * (i + 1)) / 8;
      addBar(rails, sx * (width / 2 - 0.08), (t0 * span) / 2, sx * (width / 2 - 0.08), (t1 * span) / 2, (curveY(t0) + curveY(t1)) / 2 + 0.95, 0.1, 0.12);
      addBar(rails, sx * (width / 2 - 0.05), (t0 * span) / 2, sx * (width / 2 - 0.05), (t1 * span) / 2, (curveY(t0) + curveY(t1)) / 2 + 1.06, 0.11, 0.24);
      addBar(rails, sx * (width / 2 - 0.06), (t0 * span) / 2, sx * (width / 2 - 0.06), (t1 * span) / 2, (curveY(t0) + curveY(t1)) / 2 + 0.45, 0.07, 0.08);
    }
  }
  const rm = mergedMesh(rails, mats.stone, true, true);
  if (rm) group.add(rm);
  const arch = new THREE.Mesh(new THREE.TorusGeometry(span * 0.34, 0.16, 8, 24, Math.PI), mats.stone);
  arch.rotation.y = Math.PI / 2;
  arch.position.y = 0.12;
  group.add(arch);
  group.position.set(x, 0, z);
  group.rotation.y = rot;
  return group;
}
