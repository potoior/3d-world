import * as THREE from 'three';
import { mats, makeWaterMaterial as makeBaseWaterMaterial } from './materials.js';

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function riverCenter(z) {
  return Math.sin(z * 0.011) * 7 + Math.sin(z * 0.0035 + 1.1) * 5;
}

export function riverWidth(z) {
  const g = (d, s) => Math.exp(-(d * d) / (2 * s * s));
  return 16.5 + 14 * g(z - 54, 18) + 24 * g(z + 205, 22) + 6 * g(z + 82, 28) + 3.5 * g(z - 150, 34);
}

function riverPolygon(step = 3) {
  const left = [];
  const right = [];
  for (let z = -270; z <= 252; z += step) {
    const c = riverCenter(z);
    const w = riverWidth(z);
    left.push([c - w * 0.5, z]);
    right.push([c + w * 0.5, z]);
  }
  return left.concat(right.reverse());
}

export const RIVER_POLY = riverPolygon();

export const riverLeft = (z) => riverCenter(z) - riverWidth(z) * 0.5;
export const riverRight = (z) => riverCenter(z) + riverWidth(z) * 0.5;

const detour = (z) => 1 - smooth(19, 34, Math.abs(z - 40));

export function boardwalkX(z) {
  const natural = riverLeft(z) - 5.6 - Math.sin(z * 0.045) * 0.5;
  return natural * (1 - detour(z)) - 30.5 * detour(z);
}

export const BOARDWALK = [];
for (let z = -248; z <= 218; z += 6) BOARDWALK.push([boardwalkX(z), z]);

export const BRIDGE = { x: 0, z: 40, rot: Math.PI / 2, span: 46, width: 6.2, rise: 2.65, baseY: 0.2 };

export const SPAWN = { x: -30.5, z: 53, yaw: -1.18 };
export const BOUNDS = { minX: -168, maxX: 166, minZ: -258, maxZ: 236 };

export const FALLS = {
  laya: { x: riverRight(-42) + 2.6, z: -42, width: 9.5, height: 13.5, baseY: 0.0, rot: -Math.PI / 2 },
  cui: { x: -82, z: 132, width: 12.5, height: 12.5, baseY: 0.6, rot: Math.PI / 2 },
  cui2: { x: -80, z: 134.5, width: 7.2, height: 10.5, baseY: 12.8, rot: Math.PI / 2 },
  wolong: { x: riverCenter(-182), z: -181, width: 25, height: 2.8, baseY: 1.5, rot: 0 },
};

export const CASCADE_Z = [-126, -114, -102, -90];

export function makeRockGeometry(seed = 1, detail = 0) {
  const geo = new THREE.IcosahedronGeometry(1, detail);
  const rand = mulberry32(seed);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    v.multiplyScalar(0.76 + rand() * 0.46);
    v.y *= 0.72;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

export function createKarstGeometry(radius, height, seed) {
  const rand = mulberry32(seed);
  const rings = 9;
  const radial = 10;
  const positions = [];
  const uvs = [];
  const indices = [];
  const phase = rand() * 6.28;
  for (let r = 0; r <= rings; r++) {
    const t = r / rings;
    const taper = Math.pow(1 - t, 0.78) * (0.78 + 0.3 * Math.sin(t * Math.PI * 0.9));
    for (let a = 0; a < radial; a++) {
      const ang = (a / radial) * Math.PI * 2;
      const wob = 1 + Math.sin(ang * 3 + phase + t * 4.1) * 0.1 + Math.sin(ang * 5 - t * 3) * 0.045;
      const rad = radius * taper * wob;
      positions.push(Math.cos(ang) * rad, height * t + Math.sin(ang * 4 + phase) * height * 0.014 * (1 - t), Math.sin(ang) * rad);
      uvs.push(a / radial, t);
    }
  }
  for (let r = 0; r < rings; r++) {
    for (let a = 0; a < radial; a++) {
      const a2 = (a + 1) % radial;
      const i0 = r * radial + a;
      const i1 = r * radial + a2;
      const i2 = (r + 1) * radial + a;
      const i3 = (r + 1) * radial + a2;
      indices.push(i0, i1, i2, i1, i3, i2);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function pointsToShape(points, scale = 1) {
  const shape = new THREE.Shape();
  points.forEach(([px, pz], i) => {
    const x = px * scale;
    const y = -pz * scale;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  });
  shape.closePath();
  return shape;
}

export function makeWaterMaterial() {
  const material = makeBaseWaterMaterial();
  material.uniforms.uDeep.value.setHex(0x0b4d42);
  material.uniforms.uShallow.value.setHex(0x2f8f72);
  material.uniforms.uSky.value.setHex(0x9bd2bd);
  return material;
}

export function addRiver(staticRoot, root, waterMaterial) {
  const bedGeo = new THREE.ShapeGeometry(pointsToShape(RIVER_POLY, 1.02));
  bedGeo.rotateX(-Math.PI / 2);
  const bed = new THREE.Mesh(bedGeo, mats.lakeBed);
  bed.position.y = -1.05;
  bed.receiveShadow = true;
  staticRoot.add(bed);

  const waterGeo = new THREE.ShapeGeometry(pointsToShape(RIVER_POLY, 0.995));
  waterGeo.rotateX(-Math.PI / 2);
  const water = new THREE.Mesh(waterGeo, waterMaterial);
  water.position.y = -0.14;
  water.renderOrder = 2;
  water.name = 'libo-water';
  root.add(water);

  const rand = mulberry32(211);
  const stone = [];
  const moss = [];
  for (let z = -266; z <= 248; z += 4.5) {
    for (const side of [-1, 1]) {
      const c = riverCenter(z);
      const w = riverWidth(z);
      const x = c + side * (w * 0.5 + 0.35 + rand() * 0.9);
      const s = 0.5 + rand() * 1.1;
      const m = new THREE.Mesh(makeRockGeometry(700 + ((z * 7 + side * 13) | 0), 0), rand() > 0.5 ? mats.waterStone : mats.moss);
      m.position.set(x, -0.05 + rand() * 0.25, z);
      m.scale.set(s * (1 + rand() * 0.5), s * 0.55, s * (0.8 + rand() * 0.8));
      m.rotation.y = rand() * Math.PI;
      m.castShadow = true;
      m.receiveShadow = true;
      staticRoot.add(m);
    }
  }
  return water;
}

export function addTerrain(staticRoot) {
  const outer = new THREE.Mesh(new THREE.PlaneGeometry(1800, 1800), mats.hillFar);
  outer.rotation.x = -Math.PI / 2;
  outer.position.y = -1.4;
  outer.receiveShadow = true;
  staticRoot.add(outer);

  const valley = new THREE.Mesh(new THREE.PlaneGeometry(500, 660), mats.grass);
  valley.rotation.x = -Math.PI / 2;
  valley.position.set(0, -0.02, -10);
  valley.receiveShadow = true;
  staticRoot.add(valley);

  const bank = new THREE.Mesh(new THREE.PlaneGeometry(300, 140), mats.dirt);
  bank.rotation.x = -Math.PI / 2;
  bank.position.set(0, -0.03, 58);
  bank.receiveShadow = true;
  staticRoot.add(bank);
}

export function addKarsts(staticRoot, colliders) {
  const defs = [
    [-196, -214, 53, 74, 21, true], [-244, -88, 63, 92, 22, false], [204, -184, 64, 96, 23, false],
    [243, 34, 76, 112, 24, false], [-218, 108, 66, 98, 25, false], [146, 236, 75, 78, 26, false],
    [-126, 264, 68, 73, 27, false], [224, 196, 60, 88, 28, false], [-252, -6, 72, 106, 29, false],
    [177, -54, 42, 61, 30, true], [-166, 20, 43, 66, 31, true], [40, -292, 82, 72, 32, false],
    [-42, 302, 88, 68, 33, false], [288, 140, 70, 92, 34, false], [-292, 190, 74, 86, 35, false],
  ];
  for (const [x, z, radius, height, seed, near] of defs) {
    const mesh = new THREE.Mesh(createKarstGeometry(radius, height, seed), near ? mats.hill : mats.hillFar);
    mesh.position.set(x, 0, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    staticRoot.add(mesh);
    if (colliders) {
      colliders.circles.push({ x, z, r: radius * 0.82 });
      colliders.names.push('喀斯特峰丛');
    }
    if (near) {
      const rand = mulberry32(seed * 7);
      for (let i = 0; i < 14; i++) {
        const ang = rand() * Math.PI * 2;
        const r = radius * (0.28 + rand() * 0.64);
        const s = 2 + rand() * 3;
        const tree = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), mats.pine);
        tree.position.set(x + Math.cos(ang) * r, height * (0.05 + rand() * 0.18), z + Math.sin(ang) * r);
        tree.scale.set(s * 0.7, s, s * 0.7);
        tree.castShadow = true;
        staticRoot.add(tree);
      }
    }
  }
}

export function addCliff(staticRoot, cx, cz, radius, height, seed) {
  const rand = mulberry32(seed);
  for (let i = 0; i < 18; i++) {
    const ang = rand() * Math.PI * 2;
    const r = radius * (0.12 + rand() * 0.78);
    const s = radius * (0.24 + rand() * 0.34);
    const m = new THREE.Mesh(makeRockGeometry(seed * 31 + i, 0), rand() > 0.5 ? mats.rock : mats.moss);
    m.position.set(cx + Math.cos(ang) * r, height * (0.05 + rand() * 0.8), cz + Math.sin(ang) * r * 0.6);
    m.scale.set(s, s * (1.1 + rand()), s * 0.8);
    m.rotation.set(rand() * 0.7, rand() * 6.28, rand() * 0.5);
    m.castShadow = true;
    m.receiveShadow = true;
    staticRoot.add(m);
  }
  for (let i = 0; i < 8; i++) {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), mats.pine);
    m.position.set(cx + (rand() - 0.5) * radius * 1.5, height * (0.55 + rand() * 0.4), cz + (rand() - 0.5) * radius * 0.5);
    m.scale.set(1.5 + rand() * 2.2, 1.8 + rand() * 2.4, 1.5 + rand() * 2.2);
    m.castShadow = true;
    staticRoot.add(m);
  }
}
