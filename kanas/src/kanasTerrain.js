import * as THREE from 'three';
import { mats } from './materials.js';
import { mergedMesh } from './geometry.js';

export function rand(seed, n) {
  const x = Math.sin(seed * 127.1 + n * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function smoothstep(a, b, x) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export function createKanasMountains() {
  const geo = new THREE.PlaneGeometry(3000, 1500, 170, 96);
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, 0, 1220);

  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const peaks = [
    { x: -900, z: 1120, h: 245, rx: 310, rz: 260 },
    { x: -600, z: 1060, h: 300, rx: 260, rz: 245 },
    { x: -290, z: 1100, h: 355, rx: 250, rz: 260 },
    { x: 30, z: 1040, h: 430, rx: 275, rz: 285 },
    { x: 350, z: 1090, h: 375, rx: 255, rz: 260 },
    { x: 660, z: 1150, h: 315, rx: 280, rz: 270 },
    { x: 970, z: 1220, h: 250, rx: 330, rz: 300 },
    { x: -1250, z: 1300, h: 205, rx: 370, rz: 310 },
    { x: 1260, z: 1320, h: 215, rx: 380, rz: 310 },
  ];
  const c = new THREE.Color();
  const rockLow = new THREE.Color(0x5f6c6a);
  const rockMid = new THREE.Color(0x7c8580);
  const rockWarm = new THREE.Color(0x8d8578);
  const forest = new THREE.Color(0x56704f);
  const snow = new THREE.Color(0xedf2f2);
  const snowBlue = new THREE.Color(0xc7dde5);
  const glacier = new THREE.Color(0xafd0dc);

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const foot = smoothstep(600, 930, z);
    const und = 0.5 + 0.5 * Math.sin(x * 0.005 + Math.sin(z * 0.004) * 1.8);
    let h = foot * (54 + und * 56);
    for (const p of peaks) {
      const gx = (x - p.x) / p.rx;
      const gz = (z - p.z) / p.rz;
      h += p.h * Math.exp(-(gx * gx + gz * gz) * 1.5);
    }
    h += foot * (14 * Math.sin(x * 0.031 + z * 0.018) + 7 * Math.sin(x * 0.083 - z * 0.031));
    h = Math.max(0, h * foot);
    pos.setY(i, h - 2.4);

    const snowLine = 132 + 22 * Math.sin(x * 0.007 + 0.8) + 14 * Math.sin(z * 0.01);
    const jag = 14 * Math.sin(x * 0.041 + z * 0.025) + 6 * Math.sin(x * 0.11 - z * 0.047);
    const strata = 0.5 + 0.5 * Math.sin(h * 0.12 + x * 0.016);
    const patch = 0.5 + 0.5 * Math.sin(x * 0.055 + z * 0.042);
    if (h > snowLine + jag) {
      c.copy(snow).lerp(snowBlue, patch * 0.48);
      if (patch > 0.7 && h < snowLine + 80) c.lerp(glacier, 0.6);
    } else if (h > snowLine - 30 + jag * 0.5) {
      c.copy(rockMid).lerp(rockWarm, strata * 0.62).lerp(snow, patch * 0.44);
    } else if (h > 34) {
      c.copy(rockLow).lerp(rockMid, strata * 0.6);
      if (h > 95) c.lerp(rockWarm, 0.3);
    } else {
      c.copy(forest).lerp(rockLow, strata * 0.5);
    }
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.98,
    metalness: 0,
    flatShading: true,
    emissive: new THREE.Color(0x182324),
    emissiveIntensity: 0.35,
  });
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return { mesh, material };
}

export function createFoothills() {
  const geo = new THREE.PlaneGeometry(2700, 560, 120, 30);
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, 0, 770);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  const deep = new THREE.Color(0x4b6650);
  const mid = new THREE.Color(0x637d65);
  const light = new THREE.Color(0x7d9275);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const foot = smoothstep(520, 730, z);
    let h = foot * (16 + 15 * (0.5 + 0.5 * Math.sin(x * 0.013 + z * 0.006)));
    h += foot * (7 * Math.sin(x * 0.034 + 1.3) + 4 * Math.sin(x * 0.077 - z * 0.02));
    h = Math.max(0, h);
    pos.setY(i, h - 1.8);
    const t = h / 32;
    c.copy(deep).lerp(mid, t).lerp(light, Math.max(0, t - 0.55) * 0.6);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 1,
    flatShading: true,
    emissive: new THREE.Color(0x121c14),
    emissiveIntensity: 0.3,
  });
  const mesh = new THREE.Mesh(geo, material);
  mesh.receiveShadow = false;
  mesh.castShadow = false;
  return mesh;
}

export function createShoreline(lake) {
  const group = new THREE.Group();
  const curve = new THREE.CatmullRomCurve3(
    lake.map(([x, z]) => new THREE.Vector3(x, 0, z)),
    true,
    'catmullrom',
    0.32
  );
  const pts = curve.getSpacedPoints(230);
  const stones = [];
  const gravel = [];
  const mossCaps = [];
  const cc = new THREE.Vector3(0, 0, 52);
  const seed = 17;
  pts.forEach((p, i) => {
    const dir = new THREE.Vector3(p.x - cc.x, 0, p.z - cc.z).normalize();
    if (i % 2 === 0) {
      const off = 0.8 + rand(seed, i) * 5.4;
      const s = 0.5 + rand(seed + 2, i) * 1.7;
      const g = new THREE.IcosahedronGeometry(s, 0);
      g.scale(1.22, 0.7, 1.0);
      g.rotateY(rand(seed + 4, i) * 6.28);
      g.translate(p.x + dir.x * off, s * 0.3 - 0.1, p.z + dir.z * off);
      stones.push(g);
      if (i % 6 === 0) {
        const cap = new THREE.IcosahedronGeometry(s * 0.72, 0);
        cap.scale(1.05, 0.24, 0.9);
        cap.rotateY(rand(seed + 9, i) * 6.28);
        cap.translate(p.x + dir.x * off, s * 0.62, p.z + dir.z * off);
        mossCaps.push(cap);
      }
    }
    for (let k = 0; k < 3; k++) {
      const a = rand(seed + 8, i * 5 + k) * 6.28;
      const off = 0.4 + rand(seed + 12, i * 5 + k) * 4.2;
      const g = new THREE.IcosahedronGeometry(0.12 + rand(seed + 3, i * 7 + k) * 0.3, 0);
      g.scale(1.3, 0.55, 1.0);
      g.translate(
        p.x + dir.x * off + Math.cos(a) * 0.5,
        0.06 + rand(seed + 6, i * 3 + k) * 0.12,
        p.z + dir.z * off + Math.sin(a) * 0.5
      );
      gravel.push(g);
    }
  });
  const sm = mergedMesh(stones, mats.rock, true, true);
  if (sm) group.add(sm);
  const gm = mergedMesh(gravel, mats.rockDark, false, true);
  if (gm) group.add(gm);
  const mm = mergedMesh(mossCaps, mats.rockMoss, false, true);
  if (mm) group.add(mm);

  const positions = [];
  const uvs = [];
  const indices = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const dir = new THREE.Vector3(p.x - cc.x, 0, p.z - cc.z).normalize();
    positions.push(p.x + dir.x * 0.15, 0.14, p.z + dir.z * 0.15);
    positions.push(p.x + dir.x * 7.5, 0.13, p.z + dir.z * 7.5);
    uvs.push(0, 0, 1, 1);
  }
  for (let i = 0; i < pts.length; i++) {
    const a = i * 2;
    const b = ((i + 1) % pts.length) * 2;
    indices.push(a, b, a + 1, a + 1, b, b + 1);
  }
  const shallowGeo = new THREE.BufferGeometry();
  shallowGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  shallowGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  shallowGeo.setIndex(indices);
  shallowGeo.computeVertexNormals();
  const shallowMat = new THREE.MeshBasicMaterial({
    color: 0x65cfc2,
    transparent: true,
    opacity: 0.24,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const shallow = new THREE.Mesh(shallowGeo, shallowMat);
  shallow.renderOrder = 1;
  group.add(shallow);

  const foamPositions = [];
  const foamIndices = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const dir = new THREE.Vector3(p.x - cc.x, 0, p.z - cc.z).normalize();
    foamPositions.push(p.x - dir.x * 0.05, 0.155, p.z - dir.z * 0.05);
    foamPositions.push(p.x + dir.x * 1.4, 0.15, p.z + dir.z * 1.4);
  }
  for (let i = 0; i < pts.length; i++) {
    const a = i * 2;
    const b = ((i + 1) % pts.length) * 2;
    foamIndices.push(a, b, a + 1, a + 1, b, b + 1);
  }
  const foamGeo = new THREE.BufferGeometry();
  foamGeo.setAttribute('position', new THREE.Float32BufferAttribute(foamPositions, 3));
  foamGeo.setIndex(foamIndices);
  foamGeo.computeVertexNormals();
  const foamMat = new THREE.MeshBasicMaterial({
    color: 0xe9f6f2,
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const foam = new THREE.Mesh(foamGeo, foamMat);
  foam.renderOrder = 2;
  group.add(foam);
  return group;
}

export function createRiver(points, waterMaterial, width = 10) {
  const curve = new THREE.CatmullRomCurve3(
    points.map((p) => new THREE.Vector3(p[0], 0, p[1])),
    false,
    'catmullrom',
    0.32
  );
  const count = 190;
  const pts = curve.getSpacedPoints(count);
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let i = 0; i < pts.length; i++) {
    const t = i / (pts.length - 1);
    const tang = curve.getTangent(t);
    const nx = -tang.z;
    const nz = tang.x;
    const w = width * (0.72 + 0.28 * Math.sin(t * 9.2 + 0.8) + 0.14 * Math.sin(t * 23.0));
    const p = pts[i];
    positions.push(p.x + nx * w * 0.5, 0.18, p.z + nz * w * 0.5);
    positions.push(p.x - nx * w * 0.5, 0.18, p.z - nz * w * 0.5);
    uvs.push(0, t * 6, 1, t * 6);
  }
  for (let i = 0; i < pts.length - 1; i++) {
    const a = i * 2;
    const b = (i + 1) * 2;
    indices.push(a, b, a + 1, a + 1, b, b + 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const group = new THREE.Group();
  const water = new THREE.Mesh(geo, waterMaterial);
  water.name = 'kanas-river-water';
  water.renderOrder = 1;
  group.add(water);

  const bankStones = [];
  const bankMoss = [];
  for (let i = 6; i < pts.length - 6; i += 4) {
    const t = i / (pts.length - 1);
    const tang = curve.getTangent(t);
    const nx = -tang.z;
    const nz = tang.x;
    const w = width * (0.72 + 0.28 * Math.sin(t * 9.2 + 0.8));
    for (const side of [-1, 1]) {
      if (rand(301 + i, side + 2) > 0.62) continue;
      const off = w * 0.5 + 0.5 + rand(311 + i, side + 4) * 1.8;
      const s = 0.3 + rand(321 + i, side + 5) * 1.1;
      const g = new THREE.IcosahedronGeometry(s, 0);
      g.scale(1.25, 0.62, 1.0);
      g.rotateY(rand(331 + i, side) * 6.28);
      g.translate(
        pts[i].x + nx * off * side,
        s * 0.24 + 0.05,
        pts[i].z + nz * off * side
      );
      bankStones.push(g);
      if (rand(341 + i, side) > 0.6) {
        const cap = new THREE.IcosahedronGeometry(s * 0.7, 0);
        cap.scale(1.05, 0.2, 0.9);
        cap.translate(pts[i].x + nx * off * side, s * 0.5, pts[i].z + nz * off * side);
        bankMoss.push(cap);
      }
    }
  }
  const bsm = mergedMesh(bankStones, mats.rockDark, true, true);
  if (bsm) group.add(bsm);
  const bmm = mergedMesh(bankMoss, mats.rockMoss, false, true);
  if (bmm) group.add(bmm);

  return { group, pts };
}
