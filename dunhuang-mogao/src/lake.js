import * as THREE from 'three';
import { box, cyl, sph, beam, merge, mesh, instanced, ribbon, seeded } from './geo.js';

export const LAKE_CENTER = { x: -58, z: 14 };

function makeCrescent() {
  const pts = [];
  const n = 70;
  const rot = -0.22;
  const cs = Math.cos(rot);
  const sn = Math.sin(rot);
  const sx = 46;
  const sz = 38;
  const cx = LAKE_CENTER.x;
  const cz = LAKE_CENTER.z;
  const map = (u, v) => [cx + (u * cs - v * sn) * sx, cz + (u * sn + v * cs) * sz];
  const a0 = 0.9232;
  const a1 = 5.3599;
  for (let i = 0; i <= n; i++) {
    const a = a0 + (a1 - a0) * (i / n);
    pts.push(map(Math.cos(a), Math.sin(a)));
  }
  const b0 = -1.5055;
  const b1 = -4.7766;
  for (let i = 1; i <= n; i++) {
    const a = b0 + (b1 - b0) * (i / n);
    pts.push(map(0.55 + 0.8 * Math.cos(a), 0.8 * Math.sin(a)));
  }
  return pts;
}

export const LAKE_POLYGON = makeCrescent();

export function inLake(x, z) {
  const p = LAKE_POLYGON;
  let inside = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const xi = p[i][0];
    const zi = p[i][1];
    const xj = p[j][0];
    const zj = p[j][1];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

function lakeShape() {
  const s = new THREE.Shape();
  LAKE_POLYGON.forEach((p, i) => {
    if (i === 0) s.moveTo(p[0], -p[1]);
    else s.lineTo(p[0], -p[1]);
  });
  s.closePath();
  return s;
}
function waterMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uDeep: { value: new THREE.Color(0x0f3d3d) },
      uShallow: { value: new THREE.Color(0x2d6b61) },
      uSky: { value: new THREE.Color(0xa8c7bc) },
      uSunColor: { value: new THREE.Color(0xffe2ae) },
      uSunDir: { value: new THREE.Vector3(0.4, 0.7, -0.3).normalize() },
      uFogColor: { value: new THREE.Color(0xd9c3a0) },
      uNight: { value: 0 },
    },
    transparent: true,
    depthWrite: true,
    vertexShader: `
      varying vec3 vWorld;
      void main() {
        vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uDeep;
      uniform vec3 uShallow;
      uniform vec3 uSky;
      uniform vec3 uSunColor;
      uniform vec3 uSunDir;
      uniform vec3 uFogColor;
      uniform float uNight;
      varying vec3 vWorld;
      void main() {
        vec3 view = normalize(cameraPosition - vWorld);
        float dist = distance(cameraPosition, vWorld);
        float fres = pow(1.0 - clamp(view.y, 0.0, 1.0), 3.0);
        vec2 p = vWorld.xz;
        float w1 = sin(p.x * 0.21 + uTime * 0.85)
                 + sin(p.y * 0.33 - uTime * 0.62)
                 + sin((p.x + p.y) * 0.11 + uTime * 1.15);
        float w2 = cos(p.x * 0.17 - uTime * 0.55)
                 + cos(p.y * 0.27 + uTime * 0.9)
                 + cos((p.x - p.y) * 0.14 - uTime * 0.4);
        vec3 n = normalize(vec3(w1 * 0.032, 1.0, w2 * 0.032));
        vec3 refl = reflect(-normalize(uSunDir), n);
        float spec = pow(max(dot(refl, view), 0.0), 95.0);
        float glow = pow(max(dot(refl, view), 0.0), 10.0);
        vec3 col = mix(uDeep, uShallow, 0.42 + 0.12 * sin(p.x * 0.08 + p.y * 0.05));
        col = mix(col, uSky, 0.16 + fres * 0.58);
        col += uSunColor * spec * (2.4 - uNight * 0.7);
        col += uSunColor * glow * 0.2;
        col += vec3(0.1, 0.11, 0.08) * pow(max(0.0, w1 * 0.5 + 0.5), 9.0);
        col = mix(col, uFogColor, smoothstep(140.0, 850.0, dist) * 0.85);
        gl_FragColor = vec4(col, 0.975);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
}
function outlineWithOutward() {
  const c = new THREE.Vector2(LAKE_CENTER.x, LAKE_CENTER.z);
  return LAKE_POLYGON.map((p, i) => {
    const n = LAKE_POLYGON[(i + 1) % LAKE_POLYGON.length];
    const a = LAKE_POLYGON[(i + LAKE_POLYGON.length - 1) % LAKE_POLYGON.length];
    let tx = n[0] - a[0];
    let tz = n[1] - a[1];
    const l = Math.hypot(tx, tz) || 1;
    tx /= l;
    tz /= l;
    const dx = p[0] - c.x;
    const dz = p[1] - c.y;
    let nx = -tz;
    let nz = tx;
    if (nx * dx + nz * dz < 0) {
      nx = -nx;
      nz = -nz;
    }
    return { p, nx, nz, tx, tz };
  });
}

function crossPlanes(w, h) {
  const a = new THREE.PlaneGeometry(w, h);
  a.translate(0, h / 2, 0);
  const b = a.clone();
  b.rotateY(Math.PI / 2);
  return merge([a, b]);
}

function roofPyramid(w, d, h, color, y) {
  const g = new THREE.ConeGeometry(1, h, 4, 1);
  g.rotateY(Math.PI / 4);
  g.scale(w * 0.72, 1, d * 0.72);
  g.translate(0, y + h / 2, 0);
  const n = g.attributes.position.count;
  const arr = new Float32Array(n * 3);
  const c = new THREE.Color(color);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}

function buildPavilion(materials) {
  const woodParts = [];
  const roofParts = [];
  const stoneParts = [];
  const ox = -92;
  const oz = 51;
  const baseY = 0.35;
  const W = 8.4;
  const D = 8.4;
  stoneParts.push(box(W + 1.8, 0.9, D + 1.8, '#b9a98c', ox, baseY - 0.35, oz));
  stoneParts.push(box(W + 1.0, 0.35, D + 1.0, '#9c8b72', ox, baseY + 0.16, oz));
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      woodParts.push(cyl(0.22, 0.27, 4.2, 7, '#b56b45', ox + sx * 3.5, baseY + 2.4, oz + sz * 3.5));
      woodParts.push(box(0.7, 0.24, 0.7, '#7d4932', ox + sx * 3.5, baseY + 4.55, oz + sz * 3.5));
    }
  }
  for (const sx of [-1, 1]) {
    woodParts.push(box(W - 0.2, 0.22, 0.18, '#a05e3c', ox + sx * 3.5, baseY + 1.1, oz - 3.5));
    woodParts.push(box(W - 0.2, 0.22, 0.18, '#a05e3c', ox + sx * 3.5, baseY + 1.1, oz + 3.5));
    woodParts.push(box(0.18, 0.22, D - 0.2, '#a05e3c', ox - 3.5, baseY + 1.1, oz + sx * 3.5));
    woodParts.push(box(0.18, 0.22, D - 0.2, '#a05e3c', ox + 3.5, baseY + 1.1, oz + sx * 3.5));
  }
  for (let i = -3; i <= 3; i++) {
    woodParts.push(box(0.12, 0.8, 0.12, '#8e5335', ox + i * 1.05, baseY + 0.75, oz - 3.5));
    woodParts.push(box(0.12, 0.8, 0.12, '#8e5335', ox + i * 1.05, baseY + 0.75, oz + 3.5));
    woodParts.push(box(0.12, 0.8, 0.12, '#8e5335', ox - 3.5, baseY + 0.75, oz + i * 1.05));
    woodParts.push(box(0.12, 0.8, 0.12, '#8e5335', ox + 3.5, baseY + 0.75, oz + i * 1.05));
  }
  roofParts.push(roofPyramid(W + 3.2, D + 3.2, 2.4, '#5c4a38', baseY + 4.55));
  roofParts.push(roofPyramid(W + 0.5, D + 0.5, 1.5, '#66513c', baseY + 6.5));
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const x = ox + sx * (W * 0.72 + 1.4);
      const z = oz + sz * (D * 0.72 + 1.4);
      woodParts.push(beam([x, baseY + 4.75, z], [x + sx * 1.2, baseY + 6.1, z + sz * 1.2], 0.12, '#7b4a31', 5));
      woodParts.push(beam([x + sx * 0.1, baseY + 6.1, z + sz * 0.1], [x + sx * 2.0, baseY + 6.6, z + sz * 2.0], 0.07, '#7b4a31', 4));
    }
  }
  woodParts.push(sph(0.34, '#c9a04e', ox, baseY + 8.15, oz, 1, 1.2, 1, 8));
  return {
    wood: mesh(merge(woodParts), materials.wood, true, true),
    roof: mesh(merge(roofParts), materials.roof, true, true),
    stone: mesh(merge(stoneParts), materials.stone, true, true),
    lanternPoints: [
      [ox - 4.9, baseY + 4.2, oz - 4.9],
      [ox + 4.9, baseY + 4.2, oz - 4.9],
      [ox - 4.9, baseY + 4.2, oz + 4.9],
      [ox + 4.9, baseY + 4.2, oz + 4.9],
    ],
    x: ox,
    z: oz,
    y: baseY,
  };
}
function buildBoardwalk(materials) {
  const parts = [];
  const pts = [];
  for (let i = 0; i <= 18; i++) {
    const t = i / 18;
    pts.push([-88 + t * 54, 60 + Math.sin(t * Math.PI) * 2.2]);
  }
  const y = 0.42;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const len = Math.hypot(dx, dz);
    const ang = Math.atan2(dx, dz);
    parts.push(box(2.9, 0.16, len + 0.6, '#9a6544', (a[0] + b[0]) / 2, y, (a[1] + b[1]) / 2, ang));
    parts.push(box(0.1, 1.0, 0.1, '#70452f', a[0] + 1.25, y - 0.4, a[1]));
    parts.push(box(0.1, 1.0, 0.1, '#70452f', a[0] - 1.25, y - 0.4, a[1]));
    const nx = Math.cos(ang) * 1.32;
    const nz = -Math.sin(ang) * 1.32;
    parts.push(beam([a[0] + nx, y + 0.82, a[1] + nz], [b[0] + nx, y + 0.82, b[1] + nz], 0.07, '#7d4b32', 5));
    parts.push(beam([a[0] - nx, y + 0.82, a[1] - nz], [b[0] - nx, y + 0.82, b[1] - nz], 0.07, '#7d4b32', 5));
    for (const side of [-1, 1]) {
      parts.push(box(0.11, 0.85, 0.11, '#794830', a[0] + nx * side, y + 0.42, a[1] + nz * side));
    }
  }
  return mesh(merge(parts), materials.wood, true, true);
}

export function buildLake(materials) {
  const group = new THREE.Group();
  const shape = lakeShape();
  const waterGeo = new THREE.ShapeGeometry(shape, 1);
  waterGeo.rotateX(-Math.PI / 2);
  const bed = mesh(waterGeo.clone(), new THREE.MeshStandardMaterial({ color: 0x5e5540, roughness: 1 }), false, true);
  bed.position.y = -0.75;
  group.add(bed);
  const wm = waterMaterial();
  const water = mesh(waterGeo, wm, false, true);
  water.position.y = 0.07;
  water.renderOrder = 2;
  group.add(water);

  const outline = outlineWithOutward();
  const rim = mesh(ribbon(outline.map((o) => o.p), 4.2, '#b9925f', () => 0.035), materials.crest, false, true);
  group.add(rim);

  const stones = [];
  const r = seeded(1204);
  for (let i = 0; i < outline.length; i += 2) {
    const o = outline[i];
    const w = 1.1 + r() * 1.2;
    const h = 0.28 + r() * 0.3;
    const d = 0.55 + r() * 0.5;
    const ang = Math.atan2(o.tx, o.tz);
    stones.push(box(w, h, d, r() > 0.5 ? '#a2937c' : '#8f806c', o.p[0] + o.nx * 1.35, 0.16, o.p[1] + o.nz * 1.35, ang));
    if (r() > 0.55) {
      stones.push(box(w * 0.55, h * 0.7, d * 0.7, '#b3a48c', o.p[0] + o.nx * 2.4 + r(), 0.1, o.p[1] + o.nz * 2.4 + r(), ang + 0.4));
    }
  }
  group.add(mesh(merge(stones), materials.stone, true, true));

  const reedGeo = crossPlanes(1.25, 2.0);
  const reeds = [];
  for (let i = 0; i < outline.length; i += 1) {
    if (r() > 0.46) continue;
    const o = outline[i];
    const d = 2.2 + r() * 4.5;
    const x = o.p[0] + o.nx * d + (r() - 0.5) * 2.5;
    const z = o.p[1] + o.nz * d + (r() - 0.5) * 2.5;
    if (inLake(x, z)) continue;
    reeds.push({ p: [x, 0.02, z], r: [0, r() * 6.3, 0], s: [0.8 + r() * 1.2, 0.7 + r() * 1.3, 0.8 + r() * 1.2] });
  }
  for (let i = 0; i < 130; i++) {
    const x = -108 + r() * 92;
    const z = 41 + r() * 26;
    if (!inLake(x, z) && (x > -75 || z > 55)) {
      reeds.push({ p: [x, 0.02, z], r: [0, r() * 6.3, 0], s: [0.7 + r() * 1.0, 0.6 + r() * 1.2, 0.7 + r() * 1.0] });
    }
  }
  group.add(instanced(reedGeo, materials.reed, reeds, false, true));

  const pav = buildPavilion(materials);
  group.add(pav.wood, pav.roof, pav.stone);
  group.add(buildBoardwalk(materials));

  const lanternGeo = merge([
    sph(0.3, '#d97d32', 0, 0, 0, 0.8, 1.15, 0.8, 8),
    cyl(0.16, 0.16, 0.1, 6, '#7b4a31', 0, 0.37, 0),
    cyl(0.16, 0.16, 0.1, 6, '#7b4a31', 0, -0.37, 0),
  ]);
  const lanternItems = [];
  for (const p of pav.lanternPoints) {
    lanternItems.push({ p: [p[0], p[1], p[2]], s: 1 });
  }
  for (let i = 0; i < 6; i++) {
    lanternItems.push({ p: [-80 + i * 8.4, 1.55, 60 + Math.sin((i / 6) * Math.PI) * 2.2 + 1.35], s: 0.8 });
  }
  const lanternMesh = instanced(lanternGeo, materials.lantern, lanternItems, false, false);
  group.add(lanternMesh);

  return {
    group,
    waterMaterial: wm,
    pavilion: pav,
    lanternItems,
    lanternMesh,
    reedCount: reeds.length,
  };
}



