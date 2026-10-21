import * as THREE from 'three';

function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function setColor(geo, fn) {
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    fn(c, pos.getX(i), pos.getY(i), pos.getZ(i), i);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo;
}

export function makeStalagmiteGeometry({
  height = 10,
  radius = 3,
  seed = 1,
  seg = 18,
  rings = 22,
  lean = 0.05,
}) {
  const rng = mulberry32(seed * 7919 + 17);
  const leanX = (rng() * 2 - 1) * lean * height;
  const leanZ = (rng() * 2 - 1) * lean * height;
  const positions = [];
  const uvs = [];
  const indices = [];
  const tipIndex = rings * seg;
  for (let i = 0; i < rings; i++) {
    const t = i / rings;
    const taper = Math.pow(1 - t, 0.94);
    const flare = 1 + 0.6 * Math.pow(1 - t, 7);
    for (let j = 0; j < seg; j++) {
      const theta = (j / seg) * Math.PI * 2;
      const ridge =
        1 +
        0.13 * Math.sin(theta * 6 + t * 8 + seed * 1.7) +
        0.055 * Math.sin(theta * 13 - t * 11) +
        0.045 * Math.sin(theta * 3 + seed);
      const wobble = 1 + 0.05 * Math.sin(t * 14 + seed * 2.3);
      const r = radius * (0.06 + 0.94 * taper) * flare * ridge * wobble;
      const x = leanX * t * t + Math.cos(theta) * r + 0.2 * Math.sin(t * 9 + seed);
      const z = leanZ * t * t + Math.sin(theta) * r + 0.2 * Math.cos(t * 7 + seed);
      const y = height * t + 0.16 * Math.sin(theta * 5 + seed) * (1 - t);
      positions.push(x, y, z);
      uvs.push(theta / (Math.PI * 2), t * 2.4);
    }
  }
  positions.push(leanX, height + 0.18, leanZ);
  uvs.push(0.5, 2.4);
  for (let i = 0; i < rings - 1; i++) {
    for (let j = 0; j < seg; j++) {
      const a = i * seg + j;
      const b = i * seg + ((j + 1) % seg);
      const c = (i + 1) * seg + j;
      const d = (i + 1) * seg + ((j + 1) % seg);
      indices.push(a, c, b, b, c, d);
    }
  }
  for (let j = 0; j < seg; j++) {
    const a = (rings - 1) * seg + j;
    const b = (rings - 1) * seg + ((j + 1) % seg);
    indices.push(a, tipIndex, b);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  setColor(geo, (c, x, y, z) => {
    const t = y / height;
    const ang = Math.atan2(z, x);
    const ridge = Math.sin(ang * 7 + t * 9 + seed) * 0.5 + 0.5;
    const tone = 0.48 + t * 0.26 + ridge * 0.07;
    c.setRGB(tone * 1.05, tone * 0.94, tone * 0.78);
    if (t < 0.18) c.multiplyScalar(0.86);
    if (ridge > 0.82) c.multiplyScalar(1.08);
  });
  return geo;
}

export function makeStalactiteGeometry({
  height = 12,
  radius = 2.1,
  seed = 2,
  seg = 14,
  rings = 15,
  lean = 0.03,
}) {
  const rng = mulberry32(seed * 4483 + 31);
  const leanX = (rng() * 2 - 1) * lean * height;
  const leanZ = (rng() * 2 - 1) * lean * height;
  const positions = [];
  const uvs = [];
  const indices = [];
  const tipIndex = rings * seg;
  for (let i = 0; i < rings; i++) {
    const t = i / rings;
    const taper = Math.pow(1 - Math.pow(t, 1.45), 0.7);
    for (let j = 0; j < seg; j++) {
      const theta = (j / seg) * Math.PI * 2;
      const ridge =
        1 +
        0.15 * Math.sin(theta * 5 + t * 7 + seed) +
        0.07 * Math.sin(theta * 11 - t * 9) +
        0.05 * Math.sin(theta * 3 + seed * 2.1);
      const r = radius * (0.08 + 0.92 * taper) * ridge;
      const x = leanX * t * t + Math.cos(theta) * r;
      const z = leanZ * t * t + Math.sin(theta) * r;
      const y = -height * t;
      positions.push(x, y, z);
      uvs.push((theta / (Math.PI * 2)) * 1.5, t * 2.2);
    }
  }
  positions.push(leanX, -height - 0.2, leanZ);
  uvs.push(0.5, 2.2);
  for (let i = 0; i < rings - 1; i++) {
    for (let j = 0; j < seg; j++) {
      const a = i * seg + j;
      const b = i * seg + ((j + 1) % seg);
      const c = (i + 1) * seg + j;
      const d = (i + 1) * seg + ((j + 1) % seg);
      indices.push(a, b, c, b, d, c);
    }
  }
  for (let j = 0; j < seg; j++) {
    const a = (rings - 1) * seg + j;
    const b = (rings - 1) * seg + ((j + 1) % seg);
    indices.push(a, b, tipIndex);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  setColor(geo, (c, x, y, z) => {
    const t = -y / height;
    const ang = Math.atan2(z, x);
    const ridge = Math.sin(ang * 9 + t * 7 + seed) * 0.5 + 0.5;
    const tone = 0.55 + t * 0.2 + ridge * 0.08;
    c.setRGB(tone * 1.06, tone * 0.96, tone * 0.82);
    if (t > 0.82) c.multiplyScalar(0.84);
  });
  return geo;
}

export function makeCurtainGeometry({ width, height, seed, cols = 22, rows = 18 }) {
  const positions = [];
  const uvs = [];
  const indices = [];
  const colors = [];
  const c = new THREE.Color();
  for (let iy = 0; iy <= rows; iy++) {
    const v = iy / rows;
    for (let ix = 0; ix <= cols; ix++) {
      const u = ix / cols;
      const taper = 1 - 0.16 * v;
      let x = (u - 0.5) * width * taper;
      let y = -height * v;
      y -= 1.1 * Math.pow(v, 5) * (0.5 + 0.5 * Math.sin(u * 17 + seed));
      const fold =
        Math.sin(u * Math.PI * 3.2 + seed) * 1.25 +
        Math.sin(u * Math.PI * 7.4 - seed * 1.7 + v * 2.4) * 0.5 +
        Math.sin(v * 9 + u * 13 + seed) * 0.28;
      const z = fold * (0.35 + 0.65 * v);
      x += Math.sin(v * 5 + seed * 2) * 0.35;
      positions.push(x, y, z);
      uvs.push(u * 3, v * 3.2);
      const ridge = Math.sin(u * 31 + seed) * 0.5 + 0.5;
      const tone = 0.58 + v * 0.13 + ridge * 0.08;
      c.setRGB(tone * 1.05, tone * 0.97, tone * 0.82);
      if (v > 0.8) c.multiplyScalar(0.9);
      colors.push(c.r, c.g, c.b);
    }
  }
  for (let iy = 0; iy < rows; iy++) {
    for (let ix = 0; ix < cols; ix++) {
      const a = iy * (cols + 1) + ix;
      const b = a + 1;
      const d = a + cols + 1;
      const e = d + 1;
      indices.push(a, d, b, b, d, e);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

export function makeColumnGeometry({ height, radius, seed = 1, leanX = 0, leanZ = 0 }) {
  const seg = 24;
  const rings = 32;
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let i = 0; i <= rings; i++) {
    const t = i / rings;
    const waist =
      0.82 +
      0.18 * Math.sin(t * Math.PI * 2.2 + seed) +
      0.1 * Math.sin(t * Math.PI * 5 + seed * 1.9);
    const flare = 1 + 0.34 * Math.pow(t, 3.3) + 0.22 * Math.pow(1 - t, 6);
    for (let j = 0; j < seg; j++) {
      const theta = (j / seg) * Math.PI * 2;
      const ridge =
        1 +
        0.1 * Math.sin(theta * 7 + t * 4 + seed) +
        0.045 * Math.sin(theta * 15 - t * 7) +
        0.03 * Math.sin(theta * 3 + seed * 2.4);
      const r = radius * waist * flare * ridge;
      const x = leanX * height * t * t + Math.cos(theta) * r;
      const z = leanZ * height * t * t + Math.sin(theta) * r;
      const y = height * t + 0.22 * Math.sin(theta * 6 + seed) * (1 - t);
      positions.push(x, y, z);
      uvs.push((theta / (Math.PI * 2)) * 2.5, t * 5);
    }
  }
  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < seg; j++) {
      const a = i * seg + j;
      const b = i * seg + ((j + 1) % seg);
      const c = (i + 1) * seg + j;
      const d = (i + 1) * seg + ((j + 1) % seg);
      indices.push(a, c, b, b, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  setColor(geo, (c, x, y, z) => {
    const t = y / height;
    const ang = Math.atan2(z, x);
    const ridge = Math.sin(ang * 8 + t * 10 + seed) * 0.5 + 0.5;
    const tone = 0.4 + t * 0.28 + ridge * 0.08;
    c.setRGB(tone * 1.08, tone * 0.93, tone * 0.73);
    if (t > 0.86) c.multiplyScalar(0.92);
  });
  return geo;
}

export function makeHelictiteGeometry(curves, seed) {
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  const colorArray = [];
  const c = new THREE.Color();
  let vertexOffset = 0;
  for (let n = 0; n < curves.length; n++) {
    const curve = curves[n];
    const tubular = 15;
    const radial = 5;
    const radius = 0.07 + (n % 4) * 0.045;
    const frames = curve.computeFrenetFrames(tubular, false);
    for (let i = 0; i <= tubular; i++) {
      const t = i / tubular;
      const p = curve.getPointAt(t);
      const N = frames.normals[i];
      const B = frames.binormals[i];
      const rr = radius * (1 - t * 0.65);
      for (let j = 0; j <= radial; j++) {
        const v = (j / radial) * Math.PI * 2;
        const sin = Math.sin(v);
        const cos = -Math.cos(v);
        const normal = new THREE.Vector3(cos * N.x + sin * B.x, cos * N.y + sin * B.y, cos * N.z + sin * B.z).normalize();
        positions.push(p.x + rr * normal.x, p.y + rr * normal.y, p.z + rr * normal.z);
        normals.push(normal.x, normal.y, normal.z);
        uvs.push(t * 2, j / radial);
        const tone = 0.72 - t * 0.12;
        c.setRGB(tone, tone * 0.94, tone * 0.8);
        colorArray.push(c.r, c.g, c.b);
      }
    }
    for (let i = 0; i < tubular; i++) {
      for (let j = 0; j < radial; j++) {
        const a = vertexOffset + i * (radial + 1) + j;
        const b = a + 1;
        const cc = a + radial + 1;
        const d = cc + 1;
        indices.push(a, cc, b, b, cc, d);
      }
    }
    vertexOffset += (tubular + 1) * (radial + 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colorArray, 3));
  geo.setIndex(indices);
  return geo;
}

export function makeHelictiteClusters(anchors, rand) {
  const curves = [];
  for (const anchor of anchors) {
    const count = 3 + Math.floor(rand() * 4);
    for (let b = 0; b < count; b++) {
      const a0 = rand() * Math.PI * 2;
      const dir = new THREE.Vector3(Math.cos(a0), -0.25 + rand() * 0.55, Math.sin(a0)).normalize();
      const len = 0.9 + rand() * 2.6;
      const p0 = anchor.clone();
      const p1 = p0.clone().addScaledVector(dir, len * 0.36);
      const p1b = p1.clone().add(
        new THREE.Vector3((rand() - 0.5) * len * 0.5, (rand() - 0.5) * len * 0.4, (rand() - 0.5) * len * 0.5)
      );
      const p2 = p1.clone().addScaledVector(dir, len * 0.34).add(
        new THREE.Vector3(Math.cos(a0 + 1.7) * len * 0.36, 0.24 * len, Math.sin(a0 + 1.7) * len * 0.36)
      );
      const p3 = p2.clone().addScaledVector(dir, len * 0.4).add(
        new THREE.Vector3(Math.cos(a0 + 3.2) * len * 0.32, -0.18 * len, Math.sin(a0 + 3.2) * len * 0.32)
      );
      curves.push(new THREE.CatmullRomCurve3([p0, p1b.lerp(p1, 0.5), p2, p3]));
    }
  }
  return makeHelictiteGeometry(curves, 3);
}
