import * as THREE from 'three';
import { seeded, updateSway } from './geo.js';
import { heightAt } from './terrain.js';

const tmpObj = new THREE.Object3D();
const tmpColor = new THREE.Color();

function buildSand(materials) {
  const r = seeded(771);
  const n = 1400;
  const pos = new Float32Array(n * 3);
  const phase = new Float32Array(n);
  const speed = new Float32Array(n);
  const size = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = -280 + r() * 640;
    pos[i * 3 + 1] = 0.4 + r() * 26;
    pos[i * 3 + 2] = -220 + r() * 560;
    phase[i] = r() * 6.3;
    speed[i] = 2.5 + r() * 6.5;
    size[i] = 1.2 + r() * 2.6;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
  geo.setAttribute('aSpeed', new THREE.BufferAttribute(speed, 1));
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uMap: { value: materials.tex.dot } },
    transparent: true,
    depthWrite: false,
    vertexShader: `
      attribute float aPhase;
      attribute float aSpeed;
      attribute float aSize;
      uniform float uTime;
      varying float vAlpha;
      void main() {
        vec3 p = position;
        p.x = mod(position.x + uTime * aSpeed + 320.0, 660.0) - 320.0;
        p.z += sin(uTime * 0.22 + aPhase) * 9.0;
        p.y += sin(uTime * 0.42 + aPhase) * 1.8;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = aSize * (230.0 / max(1.0, -mv.z));
        gl_Position = projectionMatrix * mv;
        vAlpha = 0.28 + 0.24 * sin(uTime * 1.6 + aPhase);
      }
    `,
    fragmentShader: `
      uniform sampler2D uMap;
      varying float vAlpha;
      void main() {
        vec4 t = texture2D(uMap, gl_PointCoord);
        gl_FragColor = vec4(vec3(0.86, 0.68, 0.44), t.a * vAlpha);
      }
    `,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  return { points, mat };
}

function buildStars() {
  const r = seeded(9012);
  const n = 980;
  const pos = new Float32Array(n * 3);
  const phase = new Float32Array(n);
  const size = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2;
    const y = 0.1 + Math.pow(r(), 0.65) * 0.9;
    const rad = Math.sqrt(1 - y * y);
    pos[i * 3] = Math.cos(a) * rad * 1250;
    pos[i * 3 + 1] = y * 1250;
    pos[i * 3 + 2] = Math.sin(a) * rad * 1250;
    phase[i] = r() * 6.3;
    size[i] = 1.3 + Math.pow(r(), 2.2) * 2.5;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 } },
    transparent: true,
    depthWrite: false,
    vertexShader: `
      attribute float aPhase;
      attribute float aSize;
      uniform float uTime;
      varying float vTw;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        float tw = 0.66 + 0.34 * sin(uTime * (0.7 + fract(aPhase) * 1.2) + aPhase * 4.1);
        vTw = tw;
        gl_PointSize = aSize * (0.84 + tw * 0.42);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform float uOpacity;
      varying float vTw;
      void main() {
        vec2 p = gl_PointCoord - 0.5;
        float d = length(p);
        float a = smoothstep(0.5, 0.05, d);
        gl_FragColor = vec4(vec3(1.0, 0.96, 0.84), a * uOpacity * vTw);
      }
    `,
  });
  return new THREE.Points(geo, mat);
}

function buildHaze(materials) {
  const group = new THREE.Group();
  const mats = [];
  const spots = [
    [-380, 24, -420, 260, 70],
    [120, 30, -470, 340, 80],
    [430, 26, -210, 280, 74],
    [440, 24, 220, 300, 80],
    [-420, 22, 300, 280, 72],
  ];
  for (let i = 0; i < spots.length; i++) {
    const m = materials.haze.clone();
    m.opacity = 0;
    const s = new THREE.Sprite(m);
    const [x, y, z, sx, sy] = spots[i];
    s.position.set(x, y, z);
    s.scale.set(sx, sy, 1);
    group.add(s);
    mats.push(m);
  }
  return { group, mats };
}
function buildBirds() {
  const g = new THREE.BufferGeometry();
  g.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      [
        0, 0, 0.4, -1.25, 0.32, -0.55, 0, 0, -0.85,
        0, 0, 0.4, 1.25, 0.32, -0.55, 0, 0, -0.85,
      ],
      3
    )
  );
  g.computeVertexNormals();
  const mat = new THREE.MeshBasicMaterial({ color: 0x3a2b21, side: THREE.DoubleSide, transparent: true, opacity: 0.78 });
  const n = 18;
  const im = new THREE.InstancedMesh(g, mat, n);
  im.frustumCulled = false;
  const data = [];
  for (let i = 0; i < n; i++) {
    data.push({
      cx: -30 + (i % 6) * 38,
      cz: -40 + Math.floor(i / 6) * 52,
      rad: 18 + (i % 4) * 9,
      y: 44 + (i % 5) * 6,
      speed: 0.13 + (i % 3) * 0.035,
      phase: i * 1.37,
      flap: 5.5 + (i % 4),
      scale: 1.4 + (i % 3) * 0.35,
    });
  }
  return { im, data };
}

function buildSmoke(materials) {
  const r = seeded(5521);
  const count = 84;
  const pos = new Float32Array(count * 3);
  const aAlpha = new Float32Array(count);
  const meta = [];
  const sources = [
    { x: 16, y: heightAt(16, -132) + 2.2, z: -132, spread: 1.2, rise: 9 },
    { x: 151, y: heightAt(151, 2) + 1.2, z: 2, spread: 2.2, rise: 15 },
  ];
  for (let i = 0; i < count; i++) {
    const src = sources[i % sources.length];
    meta.push({
      src,
      age: r(),
      speed: 0.10 + r() * 0.1,
      phase: r() * 6.3,
      dx: (r() - 0.5) * src.spread,
      dz: (r() - 0.5) * src.spread,
      size: 0.8 + r() * 0.9,
    });
    pos[i * 3] = src.x;
    pos[i * 3 + 1] = src.y;
    pos[i * 3 + 2] = src.z;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aAlpha', new THREE.BufferAttribute(aAlpha, 1));
  geo.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(count), 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uMap: { value: materials.tex.smoke } },
    transparent: true,
    depthWrite: false,
    vertexShader: `
      attribute float aAlpha;
      attribute float aSize;
      varying float vAlpha;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * (300.0 / max(1.0, -mv.z));
        gl_Position = projectionMatrix * mv;
        vAlpha = aAlpha;
      }
    `,
    fragmentShader: `
      uniform sampler2D uMap;
      varying float vAlpha;
      void main() {
        vec4 t = texture2D(uMap, gl_PointCoord);
        gl_FragColor = vec4(vec3(0.82, 0.78, 0.71), t.a * vAlpha);
      }
    `,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  const sizes = geo.attributes.aSize.array;
  for (let i = 0; i < count; i++) sizes[i] = meta[i].size * 20;
  geo.attributes.aSize.needsUpdate = true;
  return { points, meta, geo, count };
}
function buildCaravanDust(materials, camels) {
  const r = seeded(4417);
  const count = 150;
  const pos = new Float32Array(count * 3);
  const aAlpha = new Float32Array(count);
  const aSize = new Float32Array(count);
  const meta = [];
  for (let i = 0; i < count; i++) {
    const camel = i % camels.length;
    const size = 0.55 + r() * 0.95;
    aSize[i] = size * 20;
    meta.push({
      camel,
      age: r(),
      speed: 0.22 + r() * 0.3,
      phase: r() * 6.3,
      rad: 0.5 + r() * 1.7,
      lift: 0.12 + r() * 0.45,
      wob: 0.6 + r() * 1.4,
    });
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aAlpha', new THREE.BufferAttribute(aAlpha, 1));
  geo.setAttribute('aSize', new THREE.BufferAttribute(aSize, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uMap: { value: materials.tex.smoke } },
    transparent: true,
    depthWrite: false,
    vertexShader: `
      attribute float aAlpha;
      attribute float aSize;
      varying float vAlpha;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * (340.0 / max(1.0, -mv.z));
        gl_Position = projectionMatrix * mv;
        vAlpha = aAlpha;
      }
    `,
    fragmentShader: `
      uniform sampler2D uMap;
      varying float vAlpha;
      void main() {
        vec4 t = texture2D(uMap, gl_PointCoord);
        gl_FragColor = vec4(vec3(0.83, 0.68, 0.47), t.a * vAlpha);
      }
    `,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  return { points, meta, geo, count };
}

function buildIncense(materials, sources) {
  const r = seeded(8831);
  const count = 84;
  const pos = new Float32Array(count * 3);
  const aAlpha = new Float32Array(count);
  const aSize = new Float32Array(count);
  const meta = [];
  for (let i = 0; i < count; i++) {
    const src = sources[i % sources.length];
    const size = 1.3 + r() * 1.2;
    aSize[i] = size * 13;
    meta.push({
      src,
      age: r(),
      speed: 0.055 + r() * 0.045,
      phase: r() * 6.3,
      drift: 0.25 + r() * 0.5,
    });
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aAlpha', new THREE.BufferAttribute(aAlpha, 1));
  geo.setAttribute('aSize', new THREE.BufferAttribute(aSize, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uMap: { value: materials.tex.smoke } },
    transparent: true,
    depthWrite: false,
    vertexShader: `
      attribute float aAlpha;
      attribute float aSize;
      varying float vAlpha;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * (300.0 / max(1.0, -mv.z));
        gl_Position = projectionMatrix * mv;
        vAlpha = aAlpha;
      }
    `,
    fragmentShader: `
      uniform sampler2D uMap;
      varying float vAlpha;
      void main() {
        vec4 t = texture2D(uMap, gl_PointCoord);
        gl_FragColor = vec4(vec3(0.76, 0.72, 0.64), t.a * vAlpha);
      }
    `,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  return { points, meta, geo, count };
}

export function buildLife(materials, refs) {
  const group = new THREE.Group();
  const sand = buildSand(materials);
  const stars = buildStars();
  const haze = buildHaze(materials);
  const birds = buildBirds();
  const smoke = buildSmoke(materials);
  const caravanDust = buildCaravanDust(materials, refs.dunes.camels);
  const incense = buildIncense(materials, refs.detail.incenseSources);
  group.add(sand.points);
  group.add(stars);
  group.add(haze.group);
  group.add(birds.im);
  group.add(smoke.points);
  group.add(caravanDust.points);
  group.add(incense.points);

  const flagMesh = refs.mogao.flags.mesh;
  const flagData = refs.mogao.flags.data;
  const detailFlagMesh = refs.detail.flags.mesh;
  const detailFlagData = refs.detail.flags.data;
  const camels = refs.dunes.camels;
  const lanternMesh = refs.lake.lanternMesh;
  const lanternItems = refs.lake.lanternItems;

  function update(time, dt, envMix) {
    sand.mat.uniforms.uTime.value = time;
    updateSway(materials.reed, time);
    updateSway(refs.dunes.leafMat, time);

    for (let i = 0; i < flagData.length; i++) {
      const f = flagData[i];
      tmpObj.position.set(f.p[0], f.p[1], f.p[2]);
      tmpObj.rotation.set(
        Math.sin(time * 2.4 + f.phase) * 0.28,
        f.yaw,
        Math.cos(time * 2.1 + f.phase * 1.3) * 0.38
      );
      tmpObj.scale.setScalar(1);
      tmpObj.updateMatrix();
      flagMesh.setMatrixAt(i, tmpObj.matrix);
    }
    flagMesh.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < detailFlagData.length; i++) {
      const f = detailFlagData[i];
      tmpObj.position.set(f.p[0], f.p[1], f.p[2]);
      tmpObj.rotation.set(
        Math.sin(time * 2.0 + f.phase) * 0.22,
        f.yaw,
        Math.cos(time * 2.7 + f.phase * 1.4) * 0.34
      );
      tmpObj.scale.setScalar(1);
      tmpObj.updateMatrix();
      detailFlagMesh.setMatrixAt(i, tmpObj.matrix);
    }
    detailFlagMesh.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < camels.length; i++) {
      const c = camels[i];
      c.position.y = c.userData.baseY + Math.sin(time * 1.15 + c.userData.phase) * 0.035;
      c.rotation.y = c.userData.baseYaw + Math.sin(time * 0.7 + c.userData.phase) * 0.012;
    }

    for (let i = 0; i < lanternItems.length; i++) {
      const l = lanternItems[i];
      const s = l.s === undefined ? 1 : l.s;
      tmpObj.position.set(l.p[0], l.p[1] + Math.sin(time * 1.3 + i) * 0.03, l.p[2]);
      tmpObj.rotation.set(Math.cos(time * 1.1 + i * 0.7) * 0.06, 0, Math.sin(time * 1.25 + i * 0.9) * 0.09);
      tmpObj.scale.setScalar(s);
      tmpObj.updateMatrix();
      lanternMesh.setMatrixAt(i, tmpObj.matrix);
    }
    lanternMesh.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < birds.data.length; i++) {
      const b = birds.data[i];
      const a = time * b.speed + b.phase;
      const x = b.cx + Math.cos(a) * b.rad;
      const z = b.cz + Math.sin(a) * b.rad;
      const y = b.y + Math.sin(time * 0.5 + b.phase) * 2.4;
      tmpObj.position.set(x, y, z);
      tmpObj.rotation.set(0, -a + Math.PI / 2, Math.sin(time * b.flap + b.phase) * 0.42);
      tmpObj.scale.setScalar(b.scale);
      tmpObj.updateMatrix();
      birds.im.setMatrixAt(i, tmpObj.matrix);
    }
    birds.im.instanceMatrix.needsUpdate = true;
    birds.im.material.opacity = 0.55 + envMix * 0.25;

    const p = smoke.geo.attributes.position.array;
    const a = smoke.geo.attributes.aAlpha.array;
    for (let i = 0; i < smoke.count; i++) {
      const m = smoke.meta[i];
      m.age += dt * m.speed;
      if (m.age > 1) m.age -= 1;
      const age = m.age;
      const sway = 1 + age * 3.2;
      p[i * 3] = m.src.x + m.dx + Math.sin(age * 6 + m.phase) * sway + age * 5.5;
      p[i * 3 + 1] = m.src.y + age * m.src.rise;
      p[i * 3 + 2] = m.src.z + m.dz + Math.cos(age * 5 + m.phase) * sway * 0.6 + age * 2.2;
      a[i] = Math.min(1, age * 7) * (1 - age) * 0.34;
    }
    smoke.geo.attributes.position.needsUpdate = true;
    smoke.geo.attributes.aAlpha.needsUpdate = true;

    const dp = caravanDust.geo.attributes.position.array;
    const da = caravanDust.geo.attributes.aAlpha.array;
    for (let i = 0; i < caravanDust.count; i++) {
      const m = caravanDust.meta[i];
      const c = camels[m.camel];
      m.age += dt * m.speed;
      if (m.age > 1) m.age -= 1;
      const age = m.age;
      const a = time * 1.6 + m.phase + m.camel * 0.9;
      const rad = m.rad * (0.45 + age * 1.35);
      dp[i * 3] = c.position.x + Math.cos(a) * rad + age * 0.8;
      dp[i * 3 + 1] = c.position.y + m.lift + age * 1.05 + Math.sin(a * 1.7) * 0.12;
      dp[i * 3 + 2] = c.position.z + Math.sin(a) * rad * 0.7 + age * 0.55;
      da[i] = Math.min(1, age * 8) * (1 - age) * 0.3;
    }
    caravanDust.geo.attributes.position.needsUpdate = true;
    caravanDust.geo.attributes.aAlpha.needsUpdate = true;

    const ip = incense.geo.attributes.position.array;
    const ia = incense.geo.attributes.aAlpha.array;
    for (let i = 0; i < incense.count; i++) {
      const m = incense.meta[i];
      m.age += dt * m.speed;
      if (m.age > 1) m.age -= 1;
      const age = m.age;
      const a = m.phase + age * 5.5;
      ip[i * 3] = m.src.x + Math.cos(a) * m.drift * age * 3.2 + age * 1.4;
      ip[i * 3 + 1] = m.src.y + age * 7.5;
      ip[i * 3 + 2] = m.src.z + Math.sin(a) * m.drift * age * 2.2 + age * 0.7;
      ia[i] = Math.min(1, age * 7) * (1 - age) * 0.24;
    }
    incense.geo.attributes.position.needsUpdate = true;
    incense.geo.attributes.aAlpha.needsUpdate = true;

    stars.material.uniforms.uTime.value = time;
    stars.material.uniforms.uOpacity.value = envMix * envMix * 0.95;
    for (let i = 0; i < haze.mats.length; i++) {
      haze.mats[i].opacity = 0.03 + envMix * 0.23;
      haze.mats[i].color.setHex(0xe9a35b).lerp(tmpColor.setHex(0xd9734a), envMix);
    }
  }

  return { group, update, stars, sand, birds, smoke, caravanDust, incense };
}


