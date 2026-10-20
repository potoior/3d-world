import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mats } from './materials.js';
import { mergedMesh } from './geometry.js';
import { terrainHeight, riverCenter, riverHalfWidth, WATER_Y } from './terrain.js';
import { RIPPLE_SPOTS } from './refine.js';

let seed = 9327;
function rnd() {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
}

function box(list, w, h, d, x, y, z, ry = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (ry) g.rotateY(ry);
  g.translate(x, y, z);
  list.push(g);
}

function cyl(list, rt, rb, h, seg, x, y, z) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  g.translate(x, y, z);
  list.push(g);
}

function tint(geo, hex) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const c = new THREE.Color(hex);
  const n = g.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}

export const WORKER_SPOTS = [];
export const LAUNDRY_PANELS = [];

function dockY(x) {
  return 1.12 + ((x - 30) / 46) * 0.84;
}

function addCrate(wood, straw, x, y, z, ry, s = 1) {
  const w = 0.74 * s;
  const h = 0.52 * s;
  const d = 0.56 * s;
  box(wood, w, 0.06, d, x, y + 0.03, z, ry);
  for (const sz of [-1, 1]) {
    box(wood, w, h, 0.045, x, y + h * 0.5, z + sz * d * 0.5, ry);
    box(wood, w * 0.94, 0.055, 0.03, x, y + h * 0.58, z + sz * d * 0.5, ry);
  }
  for (const sx of [-1, 1]) {
    box(wood, 0.045, h, d, x + sx * w * 0.5, y + h * 0.5, z, ry);
  }
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      box(wood, 0.055, h * 1.06, 0.055, x + sx * w * 0.48, y + h * 0.53, z + sz * d * 0.48, ry);
    }
  }
  box(wood, w * 1.04, 0.06, d * 1.04, x, y + h, z, ry);
  box(straw, w * 0.7, 0.05, d * 0.6, x, y + 0.08, z, ry);
}

function addDockCrates(root) {
  const wood = [];
  const straw = [];
  for (const [x, z, ry, s] of [
    [43.4, 482.2, 0.16, 0.96],
    [44.5, 484.4, -0.28, 0.82],
    [69.6, 487.6, 0.42, 1.04],
    [67.0, 480.5, -0.18, 0.9],
    [57.2, 491.8, 0.22, 0.78],
    [59.5, 490.5, -0.5, 1.1],
  ]) {
    const y = dockY(x) + 0.1;
    addCrate(wood, straw, x, y, z, ry, s);
    if (s < 0.9) {
      box(wood, 0.045, 0.85, 0.62, x + 0.02, y + 0.42, z + 0.02, ry);
    }
  }
  box(wood, 1.5, 0.09, 0.72, 38.4, dockY(38.4) + 0.82, 480.8, -0.08);
  for (const sx of [-1, 1]) {
    box(wood, 0.08, 0.8, 0.08, 38.4 + sx * 0.66, dockY(38.4) + 0.4, 480.8);
  }
  for (let i = 0; i < 7; i++) {
    box(straw, 0.14 + rnd() * 0.1, 0.42 + rnd() * 0.26, 0.06, 38.2 + rnd() * 0.5, dockY(38.4) + 1.02, 480.5 + i * 0.09, 0.04);
  }
  const wm = mergedMesh(wood, mats.wood, true, true);
  const sm = mergedMesh(straw, mats.straw, true, true);
  if (wm) root.add(wm);
  if (sm) root.add(sm);
}

function addVillageLaundry(root) {
  const wood = [];
  const rope = [];
  const baskets = [];
  const lines = [
    [434, 12.8, 0.09, 5],
    [523, 14.4, -0.12, 6],
    [586, 9.6, 0.18, 4],
  ];
  for (let li = 0; li < lines.length; li++) {
    const [z, len, tilt, count] = lines[li];
    const edge = riverCenter(z) + riverHalfWidth(z);
    const x = edge + 17 + li * 2.4;
    const base = terrainHeight(x, z);
    if (base < 0.8) continue;
    const dx = Math.sin(tilt) * len;
    const dz = Math.cos(tilt) * len;
    const ax = x - dx * 0.5;
    const az = z - dz * 0.5;
    const bx = x + dx * 0.5;
    const bz = z + dz * 0.5;
    const lineY = base + 3.15 + li * 0.18;
    for (const [px, pz] of [[ax, az], [bx, bz]]) {
      cyl(wood, 0.055, 0.075, 3.35, 5, px, base + 1.67, pz);
      cyl(wood, 0.035, 0.05, 0.3, 4, px, base + 3.42, pz);
      baskets.push(new THREE.TorusGeometry(0.18, 0.035, 4, 7).rotateX(Math.PI / 2).translate(px, base + 3.1, pz));
    }
    const ropeGeo = new THREE.BoxGeometry(0.035, 0.035, len);
    ropeGeo.rotateY(Math.atan2(dx, dz));
    ropeGeo.translate(x, lineY, z);
    rope.push(ropeGeo);
    const ry = -Math.atan2(dz, dx);
    for (let i = 0; i < count; i++) {
      const u = (i + 0.55) / count;
      LAUNDRY_PANELS.push({
        x: ax + dx * u,
        y: lineY,
        z: az + dz * u,
        ry,
        phase: rnd() * Math.PI * 2,
        sway: 0.5 + rnd() * 0.7,
        w: 0.48 + rnd() * 0.3,
        h: 0.7 + rnd() * 0.42,
        color: [0x2e4b58, 0x6e3b31, 0x394f3a, 0x8d8468, 0x4a3c55][i % 5],
      });
    }
    for (let i = 0; i < 3; i++) {
      const bxx = ax + dx * (0.18 + i * 0.3);
      const bzz = az + dz * (0.18 + i * 0.3);
      cyl(wood, 0.24, 0.3, 0.42, 7, bxx, base + 0.23, bzz + 0.8);
      cyl(wood, 0.27, 0.27, 0.06, 7, bxx, base + 0.46, bzz + 0.8);
    }
  }
  const wm = mergedMesh(wood, mats.wood, true, true);
  const rm = mergedMesh(rope, mats.straw, false, false);
  const bm = mergedMesh(baskets, mats.straw, false, false);
  if (wm) root.add(wm);
  if (rm) root.add(rm);
  if (bm) root.add(bm);
}

function addFieldProps(root) {
  const straw = [];
  const wood = [];
  const candidates = [
    [155, 428], [128, 458], [170, 708], [-142, -404],
    [128, 884], [88, 618], [112, 392], [-118, -438],
  ];
  for (let i = 0; i < candidates.length; i++) {
    const [x, z] = candidates[i];
    const base = terrainHeight(x, z);
    if (base < 1.1) continue;
    if (Math.abs(x - riverCenter(z)) < riverHalfWidth(z) + 14) continue;
    WORKER_SPOTS.push({ x, z, y: base, ry: rnd() * Math.PI * 2, phase: rnd() * 9, scale: 0.92 + rnd() * 0.16 });
    for (let k = 0; k < 4; k++) {
      const sx = x + (rnd() - 0.5) * 3.6;
      const sz = z + (rnd() - 0.5) * 3.2;
      const sh = 0.7 + rnd() * 0.5;
      if (terrainHeight(sx, sz) < 1) continue;
      const g = new THREE.CylinderGeometry(0.16, 0.04, sh, 5);
      g.rotateZ((rnd() - 0.5) * 0.25);
      g.translate(sx, terrainHeight(sx, sz) + sh * 0.5, sz);
      straw.push(g);
      for (let j = 0; j < 3; j++) {
        const blade = new THREE.ConeGeometry(0.025, sh * 0.8, 3);
        blade.rotateZ((rnd() - 0.5) * 0.5);
        blade.translate(sx + (rnd() - 0.5) * 0.24, terrainHeight(sx, sz) + sh * 0.55, sz + (rnd() - 0.5) * 0.24);
        straw.push(blade);
      }
    }
    if (i % 3 === 0) {
      cyl(wood, 0.3, 0.36, 0.45, 7, x + 1.5, base + 0.24, z - 1.1);
      cyl(wood, 0.33, 0.33, 0.06, 7, x + 1.5, base + 0.48, z - 1.1);
    }
  }
  const sm = mergedMesh(straw, mats.straw, true, true);
  const wm = mergedMesh(wood, mats.wood, true, true);
  if (sm) root.add(sm);
  if (wm) root.add(wm);
}

export function buildPolishDetails(root) {
  addDockCrates(root);
  addVillageLaundry(root);
  addFieldProps(root);
}

function workerGeometry() {
  const parts = [];
  for (const sx of [-1, 1]) {
    const leg = new THREE.CylinderGeometry(0.052, 0.07, 0.5, 5);
    leg.rotateZ(sx * 0.04);
    leg.translate(sx * 0.085, 0.25, 0);
    parts.push(tint(leg, 0x2e3436));
  }
  const body = new THREE.CylinderGeometry(0.15, 0.21, 0.66, 7);
  body.translate(0, 0.82, 0);
  parts.push(tint(body, 0x3c5560));
  const belt = new THREE.CylinderGeometry(0.205, 0.205, 0.09, 7);
  belt.translate(0, 0.58, 0);
  parts.push(tint(belt, 0x8f7445));
  const head = new THREE.SphereGeometry(0.105, 6, 4);
  head.translate(0, 1.26, 0);
  parts.push(tint(head, 0xa4774e));
  const hat = new THREE.ConeGeometry(0.3, 0.16, 8);
  hat.translate(0, 1.39, 0);
  parts.push(tint(hat, 0xc3aa6d));
  const arm = new THREE.CylinderGeometry(0.045, 0.055, 0.56, 4);
  arm.rotateZ(-0.55);
  arm.translate(-0.23, 0.9, 0.02);
  parts.push(tint(arm, 0x334a54));
  const arm2 = new THREE.CylinderGeometry(0.04, 0.05, 0.48, 4);
  arm2.rotateZ(-0.9);
  arm2.translate(0.2, 0.74, 0.16);
  parts.push(tint(arm2, 0x334a54));
  const handle = new THREE.CylinderGeometry(0.018, 0.022, 1.15, 4);
  handle.rotateZ(0.55);
  handle.rotateX(0.18);
  handle.translate(0.35, 0.6, 0.34);
  parts.push(tint(handle, 0x6d4b30));
  const blade = new THREE.BoxGeometry(0.2, 0.06, 0.15);
  blade.rotateZ(0.55);
  blade.translate(0.58, 0.12, 0.44);
  parts.push(tint(blade, 0x4d4a42));
  const geo = mergeGeometries(parts, false);
  parts.forEach((g) => g.dispose());
  return geo;
}

function buildRippleGeometry() {
  const centers = [];
  for (const s of RIPPLE_SPOTS.slice(0, 40)) centers.push([s.x, s.z]);
  for (let z = -840; z <= 840; z += 84) {
    const c = riverCenter(z);
    const w = riverHalfWidth(z);
    centers.push([c + (rnd() < 0.5 ? -1 : 1) * (w * (0.24 + rnd() * 0.52)), z + (rnd() - 0.5) * 22]);
  }
  const positions = [];
  const aCenter = [];
  const aPhase = [];
  const aMax = [];
  const aSpeed = [];
  const seg = 18;
  for (const [cx, cz] of centers) {
    const phase = rnd();
    const maxR = 1.8 + rnd() * 4.8;
    const speed = 0.055 + rnd() * 0.075;
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * Math.PI * 2;
      const a1 = ((i + 1) / seg) * Math.PI * 2;
      const pairs = [
        [a0, 0.82, a1, 0.82, a0, 1.0],
        [a1, 0.82, a1, 1.0, a0, 1.0],
      ];
      for (const p of pairs) {
        for (let k = 0; k < 3; k++) {
          const a = p[k * 2];
          const r = p[k * 2 + 1];
          positions.push(Math.cos(a) * r, Math.sin(a) * r, 0);
          aCenter.push(cx, WATER_Y + 0.068, cz);
          aPhase.push(phase);
          aMax.push(maxR);
          aSpeed.push(speed);
        }
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('aCenter', new THREE.Float32BufferAttribute(aCenter, 3));
  geo.setAttribute('aPhase', new THREE.Float32BufferAttribute(aPhase, 1));
  geo.setAttribute('aMax', new THREE.Float32BufferAttribute(aMax, 1));
  geo.setAttribute('aSpeed', new THREE.Float32BufferAttribute(aSpeed, 1));
  return geo;
}

function buildRippleMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    vertexShader: `
      uniform float uTime;
      attribute vec3 aCenter;
      attribute float aPhase;
      attribute float aMax;
      attribute float aSpeed;
      varying float vAlpha;
      void main() {
        float life = fract(uTime * aSpeed + aPhase);
        float r = aMax * (0.16 + life * 0.98);
        vec3 p = aCenter + vec3(position.x * r, 0.0, position.y * r);
        vAlpha = smoothstep(0.0, 0.14, life) * (1.0 - life);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: `
      varying float vAlpha;
      void main() {
        gl_FragColor = vec4(0.86, 0.94, 0.9, vAlpha * 0.3);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
}

export function createPolishLife() {
  const group = new THREE.Group();
  const dummy = new THREE.Object3D();

  const workers = new THREE.InstancedMesh(
    workerGeometry(),
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92 }),
    Math.max(1, WORKER_SPOTS.length)
  );
  workers.castShadow = true;
  workers.frustumCulled = false;
  group.add(workers);

  const clothGeo = new THREE.PlaneGeometry(1, 1, 1, 3);
  clothGeo.translate(0, -0.5, 0);
  const laundry = new THREE.InstancedMesh(
    clothGeo,
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.94, side: THREE.DoubleSide }),
    Math.max(1, LAUNDRY_PANELS.length)
  );
  laundry.frustumCulled = false;
  laundry.castShadow = false;
  const cTmp = new THREE.Color();
  for (let i = 0; i < LAUNDRY_PANELS.length; i++) laundry.setColorAt(i, cTmp.setHex(LAUNDRY_PANELS[i].color));
  laundry.instanceColor.needsUpdate = true;
  group.add(laundry);

  const rippleMat = buildRippleMaterial();
  const ripples = new THREE.Mesh(buildRippleGeometry(), rippleMat);
  ripples.frustumCulled = false;
  ripples.renderOrder = 3;
  group.add(ripples);

  function updateWorkers(time) {
    for (let i = 0; i < WORKER_SPOTS.length; i++) {
      const w = WORKER_SPOTS[i];
      const bend = 0.12 + Math.sin(time * 1.35 + w.phase) * 0.2;
      dummy.position.set(w.x, w.y + Math.abs(Math.sin(time * 1.35 + w.phase)) * 0.025, w.z);
      dummy.rotation.set(bend, w.ry, Math.sin(time * 0.7 + w.phase) * 0.02);
      dummy.scale.setScalar(w.scale);
      dummy.updateMatrix();
      workers.setMatrixAt(i, dummy.matrix);
    }
    workers.instanceMatrix.needsUpdate = true;
  }

  function updateLaundry(time) {
    for (let i = 0; i < LAUNDRY_PANELS.length; i++) {
      const p = LAUNDRY_PANELS[i];
      const sway = Math.sin(time * 1.6 + p.phase) * 0.14 * p.sway + Math.sin(time * 3.7 + p.phase * 2) * 0.035;
      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set(sway * 0.8, p.ry, sway);
      dummy.scale.set(p.w, p.h, 1);
      dummy.updateMatrix();
      laundry.setMatrixAt(i, dummy.matrix);
    }
    laundry.instanceMatrix.needsUpdate = true;
  }

  updateWorkers(0);
  updateLaundry(0);
  return {
    group,
    update(time) {
      rippleMat.uniforms.uTime.value = time;
      updateWorkers(time);
      updateLaundry(time);
    },
  };
}
