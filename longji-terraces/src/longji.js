import * as THREE from 'three';
import { mergeStaticGroup } from './geometry.js';
import { M, mat, makeMistTexture } from './longjiKit.js';
import {
  buildPingan, buildJinkeng, createViewpoint, buildQixingGrounds, addQixingCrescentWater,
  buildQixingWaterRings, buildJiulongGrounds, addBamboo, createFarmer,
} from './longjiVillage.js';

const RIDGES = [
  { key: 'qixing', cx: -380, cz: -330, rx: 300, rz: 280, h: 185, levels: 22, phase: 0.7, seed: 1 },
  { key: 'jiulong', cx: 400, cz: -340, rx: 320, rz: 290, h: 205, levels: 24, phase: 2.1, seed: 2 },
  { key: 'jinkeng', cx: 430, cz: 310, rx: 310, rz: 310, h: 175, levels: 21, phase: 4.2, seed: 3 },
  { key: 'pingan', cx: -410, cz: 300, rx: 310, rz: 310, h: 190, levels: 22, phase: 5.4, seed: 4 },
  { key: 'back', cx: 20, cz: -650, rx: 400, rz: 300, h: 260, levels: 27, phase: 1.3, seed: 5 },
];

function wobble(m, theta) {
  return 1 + Math.sin(theta * 3 + m.phase) * 0.075 + Math.sin(theta * 7 - m.phase * 1.7) * 0.045 + Math.sin(theta * 11 + m.seed) * 0.018;
}

function surfaceHeight(m, x, z) {
  const dx = (x - m.cx) / m.rx;
  const dz = (z - m.cz) / m.rz;
  const f = Math.sqrt(dx * dx + dz * dz);
  if (f >= 1) return 0;
  return m.h * Math.pow(Math.max(0, 1 - f), 1.16);
}

function heightAt(x, z) {
  let y = 0;
  for (const m of RIDGES) y = Math.max(y, surfaceHeight(m, x, z));
  return y;
}

function ringBandGeometry(m, sOut, sInner, y, segs) {
  const pos = [];
  const uv = [];
  const idx = [];
  for (let i = 0; i <= segs; i++) {
    const th = (i / segs) * Math.PI * 2;
    const w = wobble(m, th);
    const c = Math.cos(th);
    const s = Math.sin(th);
    const xo = m.cx + m.rx * sOut * w * c;
    const zo = m.cz + m.rz * sOut * w * s;
    const xi = m.cx + m.rx * sInner * w * c;
    const zi = m.cz + m.rz * sInner * w * s;
    pos.push(xo, y, zo, xi, y, zi);
    uv.push(i / segs, 1, i / segs, 0);
    if (i < segs) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

function wallGeometry(m, s, yLow, yHigh, segs) {
  const pos = [];
  const uv = [];
  const idx = [];
  for (let i = 0; i <= segs; i++) {
    const th = (i / segs) * Math.PI * 2;
    const w = wobble(m, th);
    const c = Math.cos(th);
    const sn = Math.sin(th);
    const x = m.cx + m.rx * s * w * c;
    const z = m.cz + m.rz * s * w * sn;
    pos.push(x, yLow, z, x, yHigh, z);
    uv.push(i / segs, 0, i / segs, 1);
    if (i < segs) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

function makeWaterMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uDusk: { value: 0 },
      uSunDir: { value: new THREE.Vector3(0.45, 0.72, -0.3).normalize() },
    },
    vertexShader: `
      uniform float uTime;
      varying vec3 vWorld;
      void main() {
        vec3 p = position;
        p.y += sin(p.x * 0.08 + uTime * 0.55) * 0.026 + cos(p.z * 0.11 - uTime * 0.42) * 0.022;
        vec4 world = modelMatrix * vec4(p, 1.0);
        vWorld = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uDusk;
      uniform vec3 uSunDir;
      varying vec3 vWorld;
      void main() {
        vec3 N = normalize(vec3(
          sin(vWorld.x * 0.21 + uTime * 0.7) * 0.06,
          1.0,
          cos(vWorld.z * 0.24 - uTime * 0.55) * 0.06
        ));
        vec3 V = normalize(cameraPosition - vWorld);
        float fres = pow(1.0 - max(dot(V, N), 0.0), 2.1);
        float bands = 0.5 + 0.5 * sin(vWorld.x * 0.026 + vWorld.z * 0.019 + uTime * 0.05);
        vec3 deep = mix(vec3(0.03, 0.12, 0.24), vec3(0.06, 0.09, 0.14), uDusk);
        vec3 shallow = mix(vec3(0.12, 0.36, 0.55), vec3(0.22, 0.20, 0.20), uDusk);
        vec3 sky = mix(vec3(0.38, 0.68, 0.95), vec3(0.80, 0.48, 0.28), uDusk);
        vec3 sun = mix(vec3(1.0, 0.95, 0.82), vec3(1.0, 0.64, 0.38), uDusk);
        vec3 base = mix(deep, shallow, 0.28 + bands * 0.28);
        vec3 col = mix(base, sky, 0.50 + fres * 0.44);
        vec3 H = normalize(V + normalize(uSunDir));
        float spec = pow(max(dot(N, H), 0.0), 140.0);
        col += sun * spec * 0.7;
        float glint = pow(max(0.0, sin(vWorld.x * 0.57 + vWorld.z * 0.41 + uTime * 1.7)), 28.0);
        col += sun * glint * 0.12;
        gl_FragColor = vec4(col, 0.92);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

function addWaterRing(water, cx, cz, rx, rz, sOut, sInner, y, segs, wfn) {
  const indexBase = water.pos.length / 3;
  for (let i = 0; i <= segs; i++) {
    const th = (i / segs) * Math.PI * 2;
    const w = wfn ? wfn(th) : 1;
    const c = Math.cos(th);
    const s = Math.sin(th);
    const xo = cx + rx * sOut * w * c;
    const zo = cz + rz * sOut * w * s;
    const xi = cx + rx * sInner * w * c;
    const zi = cz + rz * sInner * w * s;
    water.pos.push(xo, y, zo, xi, y, zi);
    water.uv.push(i / segs, 1, i / segs, 0);
    if (i < segs) {
      const a = indexBase + i * 2;
      water.idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
}

function addRidge(g, water, m) {
  const segs = 104;
  const N = m.levels;
  for (let k = 0; k < N; k++) {
    const t0 = k / N;
    const t1 = (k + 1) / N;
    const s0 = 1 - 0.88 * t0;
    const s1 = 1 - 0.88 * t1;
    const y0 = m.h * Math.pow(t0, 1.27) + 0.35;
    const y1 = m.h * Math.pow(t1, 1.27) + 0.35;
    const top = new THREE.Mesh(ringBandGeometry(m, s0, s1, y0, segs), M.top[(k + m.seed) % M.top.length]);
    top.castShadow = true;
    top.receiveShadow = true;
    g.add(top);
    const low = k === 0 ? -1.2 : m.h * Math.pow((k - 1) / N, 1.27) + 0.35;
    const wall = new THREE.Mesh(wallGeometry(m, s0, low - 1.0, y0, segs), M.wall[(k + m.seed * 2) % M.wall.length]);
    wall.castShadow = true;
    wall.receiveShadow = true;
    g.add(wall);
    addWaterRing(water, m.cx, m.cz, m.rx, m.rz, Math.max(s0 - 0.0065, s1 + 0.01), s1 + 0.0065, y0 + 0.2, segs, (th) => wobble(m, th));
    if (k === N - 1) {
      const capH = 24 + (m.seed % 3) * 5;
      const cap = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 28, 4), M.forest);
      cap.scale.set(m.rx * 0.12, capH * 0.5, m.rz * 0.12);
      cap.position.set(m.cx, y1 + capH * 0.25, m.cz);
      cap.castShadow = true;
      cap.receiveShadow = true;
      g.add(cap);
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2 + m.seed;
        const rr = 0.14 + (i % 5) * 0.055;
        const tx = m.cx + m.rx * rr * Math.cos(a);
        const tz = m.cz + m.rz * rr * Math.sin(a);
        const ty = m.h * Math.pow(1 - rr, 1.27) + 0.4;
        const hh = 9 + (i % 4) * 4;
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.9, hh, 5), M.woodDark);
        trunk.position.set(tx, ty + hh * 0.5, tz);
        trunk.castShadow = true;
        g.add(trunk);
        const crown = new THREE.Mesh(new THREE.ConeGeometry(3.2 + (i % 3), hh * 0.85, 7), i % 3 === 0 ? M.leafDeep : M.forest);
        crown.position.set(tx, ty + hh * 1.02, tz);
        crown.rotation.y = i * 0.6;
        crown.castShadow = true;
        crown.receiveShadow = true;
        g.add(crown);
      }
    }
  }
}

function makeMist(texture) {
  const group = new THREE.Group();
  const geo = new THREE.PlaneGeometry(1, 1);
  geo.rotateX(-Math.PI / 2);
  const systems = [];
  const specs = [
    [-120, 34, -40, 300, 190, 0.12], [110, 46, -120, 340, 220, 0.14], [-40, 62, -230, 420, 230, 0.11],
    [220, 72, 10, 320, 210, 0.1], [-240, 78, 100, 360, 240, 0.1], [40, 28, 110, 300, 190, 0.13],
    [-300, 96, -180, 360, 220, 0.09], [300, 110, -220, 380, 240, 0.09], [0, 120, -420, 520, 260, 0.08],
    [-120, 150, -520, 520, 280, 0.07], [260, 150, 220, 400, 260, 0.08], [-270, 145, 270, 400, 260, 0.08],
    [120, 24, 210, 280, 180, 0.12], [-170, 20, 180, 260, 170, 0.12], [0, 50, 0, 260, 160, 0.06],
  ];
  specs.forEach((s, i) => {
    const material = new THREE.MeshBasicMaterial({
      map: texture, transparent: true, opacity: s[5], depthWrite: false,
      color: 0xe4ede9, side: THREE.DoubleSide, fog: true,
    });
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.set(s[0], s[1], s[2]);
    mesh.scale.set(s[3], 1, s[4]);
    mesh.rotation.y = (i * 0.83) % Math.PI;
    mesh.renderOrder = 2;
    group.add(mesh);
    systems.push({ mesh, material, baseX: s[0], baseZ: s[2], phase: i * 1.37, speed: 0.12 + (i % 4) * 0.035 });
  });
  return { group, systems };
}

function placeFarmer(m, t, theta, seed) {
  const s = 1 - 0.88 * t;
  const w = wobble(m, theta);
  const x = m.cx + m.rx * s * w * Math.cos(theta);
  const z = m.cz + m.rz * s * w * Math.sin(theta);
  const y = m.h * Math.pow(t, 1.27) + 0.75;
  return { x, y, z, ry: Math.atan2(-Math.cos(theta), -Math.sin(theta)) + (seed % 2 ? 0.4 : -0.3), seed };
}

export function buildLongjiOverlay() {
  const staticRoot = new THREE.Group();
  const water = { pos: [], uv: [], idx: [] };

  RIDGES.forEach((m) => addRidge(staticRoot, water, m));

  const pinganBamboo = buildPingan(staticRoot);
  const jinkengBamboo = buildJinkeng(staticRoot);
  const qx = buildQixingGrounds(staticRoot);
  addQixingCrescentWater(water, qx);
  buildQixingWaterRings(water, qx);

  const qm = RIDGES.find((m) => m.key === 'qixing');
  const jm = RIDGES.find((m) => m.key === 'jiulong');
  buildJiulongGrounds(staticRoot, surfaceHeight, jm);
  createViewpoint(staticRoot, -238, surfaceHeight(qm, -238, -128) + 0.4, -128, 0.92, 1.0);
  createViewpoint(staticRoot, 236, surfaceHeight(jm, 236, -160) + 0.4, -160, -0.95, 1.05);
  createViewpoint(staticRoot, -176, qx.topY + 0.2, -42, Math.PI, 0.72);

  const bambooValley = [
    [-146, 24], [-160, -20], [96, 64], [132, 18], [-114, 190], [156, 176],
    [-270, -18], [286, -12], [-62, -196], [226, -74], [-214, 42], [208, 54],
    [-96, -128], [134, -112], [-286, 160], [296, 172],
  ];
  addBamboo(staticRoot, pinganBamboo.concat(jinkengBamboo, bambooValley), heightAt);

  const farmers = [];
  const farmerGroup = new THREE.Group();
  const spots = [
    placeFarmer(qm, 0.32, 0.52, 1), placeFarmer(qm, 0.48, 0.78, 2), placeFarmer(qm, 0.62, 0.92, 3),
    placeFarmer(jm, 0.36, 2.32, 4), placeFarmer(jm, 0.54, 2.55, 5), placeFarmer(jm, 0.68, 2.72, 6),
    placeFarmer(RIDGES[2], 0.3, -2.45, 7), placeFarmer(RIDGES[2], 0.5, -2.68, 8),
    placeFarmer(RIDGES[3], 0.34, -0.42, 9), placeFarmer(RIDGES[3], 0.55, -0.66, 10),
    placeFarmer(RIDGES[4], 0.24, 1.35, 11), placeFarmer(RIDGES[4], 0.42, 1.68, 12),
    { x: -124, y: qx.topY + 1.5, z: -56, ry: 0.5, seed: 13 },
    { x: -214, y: 23.6, z: 150, ry: 2.4, seed: 14 },
    { x: 232, y: 23.2, z: 168, ry: -2.1, seed: 15 },
  ];
  spots.forEach((p) => {
    const f = createFarmer(p.x, p.y, p.z, p.ry, p.seed);
    farmerGroup.add(f);
    farmers.push(f);
  });

  const mist = makeMist(makeMistTexture());
  const waterMaterial = makeWaterMaterial();
  const waterGeo = new THREE.BufferGeometry();
  waterGeo.setAttribute('position', new THREE.Float32BufferAttribute(water.pos, 3));
  waterGeo.setAttribute('uv', new THREE.Float32BufferAttribute(water.uv, 2));
  waterGeo.setIndex(water.idx);
  waterGeo.computeVertexNormals();
  const waterMesh = new THREE.Mesh(waterGeo, waterMaterial);
  waterMesh.name = 'longji-paddy-water';
  waterMesh.renderOrder = 1;
  waterMesh.frustumCulled = false;

  const merged = mergeStaticGroup(staticRoot);
  const group = new THREE.Group();
  group.add(merged);
  group.add(waterMesh);
  group.add(mist.group);
  group.add(farmerGroup);

  const life = {
    update(time, dt, envMix = 0) {
      waterMaterial.uniforms.uTime.value = time;
      waterMaterial.uniforms.uDusk.value = envMix;
      waterMaterial.uniforms.uSunDir.value.set(0.45, 0.72, -0.3).lerp(new THREE.Vector3(-0.55, 0.18, 0.6), envMix).normalize();
      mist.systems.forEach((s, i) => {
        s.mesh.position.x = s.baseX + Math.sin(time * s.speed + s.phase) * 24;
        s.mesh.position.z = s.baseZ + Math.cos(time * s.speed * 0.7 + s.phase) * 14;
        s.material.opacity = (0.07 + (i % 5) * 0.013) * (0.7 + 0.3 * (1 - envMix));
      });
      farmers.forEach((f) => {
        const u = f.userData;
        f.position.y = u.baseY + Math.sin(time * 1.15 + u.phase) * 0.035;
        f.rotation.y = u.baseRy + Math.sin(time * 0.42 + u.phase) * 0.22;
        u.body.rotation.z = Math.sin(time * 0.7 + u.phase) * 0.035;
        u.armL.rotation.x = -0.18 + Math.sin(time * 1.35 + u.phase) * 0.55;
        u.armR.rotation.x = -0.18 - Math.sin(time * 1.35 + u.phase) * 0.35;
      });
    },
  };

  return {
    group,
    life,
    waterMaterial,
    stats: {
      ridges: RIDGES.length,
      terraceBands: RIDGES.reduce((n, m) => n + m.levels, 0),
      farmers: farmers.length,
      mistPlanes: mist.systems.length,
      waterRings: water.idx.length / 6,
    },
  };
}
