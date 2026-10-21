import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mats, ptextures } from './putuoshanTextures.js';
import { mesh, mergeBoxes, mulberry32 } from './psUtil.js';

const SMOKE_VERTEX = `
  uniform float uTime;
  uniform float uHeight;
  uniform float uSize;
  attribute float aSeed;
  varying float vAlpha;
  void main() {
    vec3 p = position;
    float rise = 1.0 + aSeed * 1.6;
    p.y = mod(position.y + uTime * rise, uHeight);
    float k = p.y / uHeight;
    p.x += sin(uTime * 0.42 + aSeed * 6.283 + p.y * 0.22) * (0.5 + p.y * 0.12);
    p.z += cos(uTime * 0.37 + aSeed * 5.1 + p.y * 0.19) * (0.4 + p.y * 0.1);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = clamp(uSize * (1.0 + k * 2.6) * (260.0 / max(1.0, -mv.z)), 1.0, 90.0);
    vAlpha = smoothstep(0.0, 0.09, k) * (1.0 - smoothstep(0.72, 1.0, k));
  }
`;

const SMOKE_FRAGMENT = `
  uniform sampler2D uMap;
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vAlpha;
  void main() {
    vec4 tex = texture2D(uMap, gl_PointCoord);
    float a = tex.a * vAlpha * uOpacity;
    if (a < 0.003) discard;
    gl_FragColor = vec4(uColor, a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export function createIncense(emitters) {
  const group = new THREE.Group();
  group.name = 'temple-incense';
  const rand = mulberry32(5519);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uHeight: { value: 26 },
      uSize: { value: 2.2 },
      uMap: { value: ptextures.smoke },
      uColor: { value: new THREE.Color(0xd9d7cc) },
      uOpacity: { value: 0.34 },
    },
    vertexShader: SMOKE_VERTEX,
    fragmentShader: SMOKE_FRAGMENT,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.NormalBlending,
  });
  const systems = [];
  for (const e of emitters) {
    const count = e.count || 260;
    const height = e.height || 26;
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const a = rand() * Math.PI * 2;
      const r = Math.sqrt(rand()) * (e.spread || 1.4);
      positions[i * 3] = Math.cos(a) * r;
      positions[i * 3 + 1] = rand() * height;
      positions[i * 3 + 2] = Math.sin(a) * r;
      seeds[i] = rand();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    const points = new THREE.Points(geo, material);
    points.position.copy(e.position);
    points.frustumCulled = false;
    points.renderOrder = 4;
    group.add(points);
    systems.push({ points, height });
  }
  return {
    group,
    material,
    update(elapsed) {
      material.uniforms.uTime.value = elapsed;
    },
  };
}

function addFlagGeometry(arrays, a, b, count, palette, rand, size = 1.0) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  const len = Math.hypot(dx, dz) || 1;
  const rx = dz / len;
  const rz = -dx / len;
  const nx = -rz;
  const nz = rx;
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    const cx = a.x + dx * t;
    const cy = a.y + dy * t - Math.sin(t * Math.PI) * 0.6;
    const cz = a.z + dz * t;
    const col = new THREE.Color(palette[(rand() * palette.length) | 0]);
    const phase = rand() * Math.PI * 2;
    const w = size * (0.82 + rand() * 0.35);
    const h = size * (1.3 + rand() * 0.5);
    const cols = 3;
    const rows = 3;
    const baseIndex = arrays.pos.length / 3;
    for (let ry = 0; ry <= rows; ry++) {
      for (let cx2 = 0; cx2 <= cols; cx2++) {
        const u = cx2 / cols - 0.5;
        const v = ry / rows;
        arrays.pos.push(
          cx + rx * u * w,
          cy - v * h + Math.sin(v * Math.PI) * 0.06,
          cz + rz * u * w
        );
        arrays.uv.push(cx2 / cols, 1 - v);
        arrays.color.push(col.r, col.g, col.b);
        arrays.phase.push(phase);
        arrays.wave.push(nx, nz);
      }
    }
    for (let ry = 0; ry < rows; ry++) {
      for (let cx2 = 0; cx2 < cols; cx2++) {
        const p = baseIndex + ry * (cols + 1) + cx2;
        arrays.idx.push(p, p + cols + 1, p + 1, p + 1, p + cols + 1, p + cols + 2);
      }
    }
  }
}

const FLAG_VERTEX = `
  uniform float uTime;
  attribute vec3 aColor;
  attribute float aPhase;
  attribute vec2 aWave;
  varying vec3 vColor;
  varying vec2 vUv;
  #include <fog_pars_vertex>
  void main() {
    vec3 p = position;
    float sway = sin(uTime * 2.5 + aPhase + uv.x * 5.2) * (uv.y * 0.34 + 0.02);
    p.x += aWave.x * sway;
    p.z += aWave.y * sway;
    vColor = aColor;
    vUv = uv;
    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const FLAG_FRAGMENT = `
  varying vec3 vColor;
  varying vec2 vUv;
  #include <fog_pars_fragment>
  void main() {
    vec3 col = vColor * (0.76 + 0.24 * vUv.y);
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

export function createPrayerFlags(strings, poles) {
  const group = new THREE.Group();
  group.name = 'prayer-flags';
  const arrays = { pos: [], uv: [], color: [], phase: [], wave: [], idx: [] };
  const rand = mulberry32(4133);
  const palette = [0xc23a2c, 0xe0b33c, 0x2f6f7b, 0xe8e2d1, 0x4e7a45];
  for (const s of strings) {
    addFlagGeometry(arrays, s.a, s.b, s.count || 12, s.palette || palette, rand, s.size || 1.0);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(arrays.pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(arrays.uv, 2));
  geo.setAttribute('aColor', new THREE.Float32BufferAttribute(arrays.color, 3));
  geo.setAttribute('aPhase', new THREE.Float32BufferAttribute(arrays.phase, 1));
  geo.setAttribute('aWave', new THREE.Float32BufferAttribute(arrays.wave, 2));
  geo.setIndex(arrays.idx);
  geo.computeVertexNormals();
  const uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 } }]);
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: FLAG_VERTEX,
    fragmentShader: FLAG_FRAGMENT,
    side: THREE.DoubleSide,
    fog: true,
  });
  const flags = new THREE.Mesh(geo, material);
  flags.castShadow = false;
  flags.receiveShadow = false;
  group.add(flags);

  if (poles) {
    const geos = [];
    for (const p of poles) {
      const g = new THREE.CylinderGeometry(p.r || 0.12, (p.r || 0.12) * 1.3, p.h || 9, 6);
      g.translate(p.x, (p.h || 9) * 0.5 + (p.y || 0), p.z);
      geos.push(g);
      const cap = new THREE.SphereGeometry((p.r || 0.12) * 2.0, 6, 4);
      cap.translate(p.x, (p.h || 9) + (p.y || 0), p.z);
      geos.push(cap);
    }
    const pm = mergeBoxes(geos);
    mesh(group, pm, mats.goldDark, true, false);
  }

  return {
    group,
    update(elapsed) {
      material.uniforms.uTime.value = elapsed;
    },
  };
}

function paint(geo, color) {
  const n = geo.attributes.position.count;
  const arr = new Float32Array(n * 3);
  const c = new THREE.Color(color);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}

function personGeometry(kind) {
  const parts = [];
  const robe = kind === 'monk' ? 0xc7802e : kind === 'pilgrimA' ? 0x5c7182 : 0x7b5c4c;
  const robeDark = kind === 'monk' ? 0x9c5d1d : kind === 'pilgrimA' ? 0x3f5364 : 0x5e4337;
  const rbody = new THREE.CylinderGeometry(kind === 'monk' ? 0.25 : 0.22, kind === 'monk' ? 0.4 : 0.32, 1.04, 6, 1);
  rbody.translate(0, 0.55, 0);
  parts.push(paint(rbody, robe));

  const sash = new THREE.BoxGeometry(0.5, 0.14, 0.3);
  sash.translate(0, 0.78, 0.02);
  parts.push(paint(sash, robeDark));

  for (const sx of [-1, 1]) {
    const arm = new THREE.CylinderGeometry(0.06, 0.075, 0.62, 5);
    arm.rotateZ(sx * 0.22);
    arm.translate(sx * 0.27, 0.8, 0.02);
    parts.push(paint(arm, robe));
    const leg = new THREE.CylinderGeometry(0.075, 0.085, 0.45, 5);
    leg.translate(sx * 0.12, 0.23, 0);
    parts.push(paint(leg, 0x2b2923));
  }
  const head = new THREE.SphereGeometry(0.155, 7, 5);
  head.translate(0, 1.24, 0.02);
  parts.push(paint(head, 0xc59a6e));
  if (kind === 'monk') {
    const shoulder = new THREE.SphereGeometry(0.3, 7, 5);
    shoulder.scale(1.15, 0.5, 0.8);
    shoulder.translate(0, 1.05, 0);
    parts.push(paint(shoulder, robe));
  } else {
    const hat = new THREE.ConeGeometry(0.3, 0.2, 8);
    hat.translate(0, 1.42, 0.02);
    parts.push(paint(hat, kind === 'pilgrimA' ? 0x4a4a3f : 0x8a6a3f));
    const pack = new THREE.BoxGeometry(0.34, 0.46, 0.18);
    pack.translate(0, 0.78, -0.22);
    parts.push(paint(pack, kind === 'pilgrimA' ? 0x4b3c2c : 0x6c4f36));
  }
  const merged = mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)), false);
  return merged;
}

function matrixFor(x, y, z, yaw, scale = 1) {
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0));
  m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(scale, scale, scale));
  return m;
}

export function createCrowd({ monks, pilgrims, groundAt }) {
  const group = new THREE.Group();
  group.name = 'monks-and-pilgrims';
  const rand = mulberry32(7351);
  const defs = [
    { kind: 'monk', entries: monks },
    { kind: 'pilgrimA', entries: pilgrims.filter((_, i) => i % 2 === 0) },
    { kind: 'pilgrimB', entries: pilgrims.filter((_, i) => i % 2 === 1) },
  ];
  const walkers = [];
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92 });
  let total = 0;
  for (const def of defs) {
    if (!def.entries.length) continue;
    const geo = personGeometry(def.kind === 'monk' ? 'monk' : def.kind);
    const inst = new THREE.InstancedMesh(geo, material, def.entries.length);
    inst.castShadow = true;
    inst.receiveShadow = true;
    inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    def.entries.forEach((e, i) => {
      const s = 0.9 + rand() * 0.22;
      inst.setMatrixAt(i, matrixFor(e.x, e.y, e.z, e.yaw || rand() * 6.28, s));
      if (e.walk) {
        walkers.push({ inst, i, e, s, phase: rand() });
      }
    });
    inst.instanceMatrix.needsUpdate = true;
    group.add(inst);
    total += def.entries.length;
  }
  return {
    group,
    count: total,
    update(elapsed) {
      for (const w of walkers) {
        const { e, inst, i, s } = w;
        const [ax, az, bx, bz] = e.walk;
        const speed = e.speed || 0.02;
        const t = (elapsed * speed + w.phase) % 1;
        const x = ax + (bx - ax) * t;
        const z = az + (bz - az) * t;
        const y = groundAt(x, z) + Math.abs(Math.sin(elapsed * 5 + w.phase * 8)) * 0.035;
        const yaw = Math.atan2(bx - ax, bz - az);
        inst.setMatrixAt(i, matrixFor(x, y, z, yaw, s));
      }
      for (const w of walkers) w.inst.instanceMatrix.needsUpdate = true;
    },
  };
}

export function createBirds() {
  const group = new THREE.Group();
  group.name = 'gulls';
  const count = 46;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array([
    0, 0.1, -0.5, 0, 0, 0.4, -1.1, 0.12, 0.2,
    0, 0.1, -0.5, 1.1, 0.12, 0.2, 0, 0, 0.4,
    -0.1, 0, 0, 0.1, 0, 0, 0, 0, 0.5,
  ]);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  const mat = new THREE.MeshBasicMaterial({ color: 0x3d4548, side: THREE.DoubleSide });
  const inst = new THREE.InstancedMesh(geo, mat, count);
  inst.frustumCulled = false;
  const rand = mulberry32(2299);
  const birds = [];
  for (let i = 0; i < count; i++) {
    birds.push({
      r: 130 + rand() * 280,
      a: rand() * Math.PI * 2,
      y: 58 + rand() * 80,
      speed: (0.04 + rand() * 0.06) * (rand() < 0.5 ? -1 : 1),
      scale: 0.8 + rand() * 1.4,
      phase: rand() * 6.28,
    });
    inst.setMatrixAt(i, new THREE.Matrix4());
  }
  group.add(inst);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  return {
    group,
    update(elapsed) {
      for (let i = 0; i < birds.length; i++) {
        const b = birds[i];
        const a = b.a + elapsed * b.speed;
        const x = Math.cos(a) * b.r;
        const z = Math.sin(a) * b.r;
        const y = b.y + Math.sin(elapsed * 0.7 + b.phase) * 6;
        const yaw = -a + (b.speed > 0 ? 0 : Math.PI);
        e.set(Math.sin(elapsed * 8 + b.phase) * 0.18, yaw, 0);
        q.setFromEuler(e);
        m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(b.scale, b.scale, b.scale));
        inst.setMatrixAt(i, m);
      }
      inst.instanceMatrix.needsUpdate = true;
    },
  };
}
