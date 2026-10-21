import * as THREE from 'three';
import { heightAt, makeCloudTexture, makeLeafTexture, rand } from './siguniang-util.js';

function makeCloudLayer(texture, count, opts) {
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const alphas = new Float32Array(count);
  const speeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = opts.minX + rand(opts.seed, i) * (opts.maxX - opts.minX);
    positions[i * 3 + 1] = opts.minY + rand(opts.seed + 1, i) * (opts.maxY - opts.minY);
    positions[i * 3 + 2] = opts.minZ + rand(opts.seed + 2, i) * (opts.maxZ - opts.minZ);
    sizes[i] = opts.minSize + rand(opts.seed + 3, i) * (opts.maxSize - opts.minSize);
    alphas[i] = opts.minAlpha + rand(opts.seed + 4, i) * (opts.maxAlpha - opts.minAlpha);
    speeds[i] = opts.minSpeed + rand(opts.seed + 5, i) * (opts.maxSpeed - opts.minSpeed);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geo.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: texture },
      uScale: { value: Math.max(700, window.innerHeight * 1.18) },
      uColor: { value: new THREE.Color(0xfbfaf5) },
      uOpacity: { value: opts.opacity },
    },
    transparent: true,
    depthWrite: false,
    vertexShader: `
      uniform float uScale;
      attribute float aSize;
      attribute float aAlpha;
      varying float vAlpha;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * uScale / max(1.0, -mv.z);
        gl_Position = projectionMatrix * mv;
        vAlpha = aAlpha * (1.0 - smoothstep(1200.0, 3600.0, -mv.z));
      }
    `,
    fragmentShader: `
      uniform sampler2D uMap;
      uniform vec3 uColor;
      uniform float uOpacity;
      varying float vAlpha;
      void main() {
        vec4 tex = texture2D(uMap, gl_PointCoord);
        float a = tex.a * vAlpha * uOpacity;
        if (a < 0.006) discard;
        gl_FragColor = vec4(uColor * (0.9 + tex.r * 0.18), a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.renderOrder = 4;
  points.userData = { speeds, count };
  return points;
}

function makeLeafPoints(count) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const speeds = new Float32Array(count);
  const phases = new Float32Array(count);
  const color = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const x = -700 + rand(1601, i) * 1400;
    const z = -500 + rand(1607, i) * 1100;
    positions[i * 3] = x;
    positions[i * 3 + 1] = heightAt(x, z) + 2 + rand(1613, i) * 22;
    positions[i * 3 + 2] = z;
    speeds[i] = 1.4 + rand(1619, i) * 2.6;
    phases[i] = rand(1621, i) * Math.PI * 2;
    color.setHSL(0.08 + rand(1627, i) * 0.045, 0.6 + rand(1631, i) * 0.15, 0.46 + rand(1637, i) * 0.14);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.PointsMaterial({
    map: makeLeafTexture(),
    size: 1.7,
    transparent: true,
    alphaTest: 0.08,
    depthWrite: false,
    vertexColors: true,
    sizeAttenuation: true,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.userData = { speeds, phases, count };
  return points;
}

function makeBirds() {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute([
    -1.1, 0, 0.4, 0, 0, 0, 0, 0, -0.5,
    1.1, 0, 0.4, 0, 0, -0.5, 0, 0, 0,
  ], 3));
  geo.computeVertexNormals();
  const count = 11;
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: 0x2a2f2e, side: THREE.DoubleSide }), count);
  mesh.frustumCulled = false;
  return mesh;
}

export function createSky() {
  const group = new THREE.Group();
  const texture = makeCloudTexture();
  const low = makeCloudLayer(texture, 108, {
    seed: 1701,
    minX: -1450, maxX: 1450,
    minY: 150, maxY: 285,
    minZ: 560, maxZ: 1320,
    minSize: 170, maxSize: 340,
    minAlpha: 0.32, maxAlpha: 0.68,
    minSpeed: 1.2, maxSpeed: 3.4,
    opacity: 0.92,
  });
  const high = makeCloudLayer(texture, 54, {
    seed: 1801,
    minX: -1500, maxX: 1500,
    minY: 320, maxY: 470,
    minZ: 260, maxZ: 1000,
    minSize: 90, maxSize: 200,
    minAlpha: 0.18, maxAlpha: 0.46,
    minSpeed: 2.6, maxSpeed: 6.2,
    opacity: 0.7,
  });
  group.add(low, high);

  const leaves = makeLeafPoints(200);
  group.add(leaves);
  const birds = makeBirds();
  group.add(birds);

  low.material.userData.day = new THREE.Color(0xfbfaf5);
  low.material.userData.dusk = new THREE.Color(0xffd1ab);
  high.material.userData.day = new THREE.Color(0xffffff);
  high.material.userData.dusk = new THREE.Color(0xffc2a0);

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  const e = new THREE.Euler();

  function update(t, dt) {
    for (const layer of [low, high]) {
      const arr = layer.geometry.attributes.position.array;
      const { speeds, count } = layer.userData;
      for (let i = 0; i < count; i++) {
        arr[i * 3] += speeds[i] * dt;
        if (arr[i * 3] > 1500) arr[i * 3] = -1500;
      }
      layer.geometry.attributes.position.needsUpdate = true;
    }

    const lp = leaves.geometry.attributes.position.array;
    const { speeds: ls, phases, count: lc } = leaves.userData;
    for (let i = 0; i < lc; i++) {
      lp[i * 3] += Math.sin(t * 0.7 + phases[i]) * 0.9 * dt;
      lp[i * 3 + 1] -= ls[i] * dt;
      lp[i * 3 + 2] += Math.cos(t * 0.55 + phases[i] * 1.3) * 0.8 * dt;
      if (lp[i * 3 + 1] < heightAt(lp[i * 3], lp[i * 3 + 2]) + 0.3) {
        const x = -700 + rand(1641 + Math.floor(t), i) * 1400;
        const z = -500 + rand(1651 + Math.floor(t), i) * 1100;
        lp[i * 3] = x;
        lp[i * 3 + 1] = heightAt(x, z) + 18 + rand(1663 + Math.floor(t), i) * 8;
        lp[i * 3 + 2] = z;
      }
    }
    leaves.geometry.attributes.position.needsUpdate = true;

    for (let i = 0; i < 11; i++) {
      const a = t * 0.12 + (i / 11) * Math.PI * 2;
      const r = 260 + (i % 4) * 90;
      p.set(Math.cos(a) * r + 70, 330 + Math.sin(t * 0.5 + i) * 14 + (i % 3) * 22, 260 + Math.sin(a) * r * 0.72);
      e.set(0, -a + Math.PI * 0.5, Math.sin(t * 2.2 + i) * 0.12);
      q.setFromEuler(e);
      const sc = 1.6 + (i % 3) * 0.5;
      s.set(sc, sc, sc);
      m.compose(p, q, s);
      birds.setMatrixAt(i, m);
    }
    birds.instanceMatrix.needsUpdate = true;
  }

  function resize() {
    low.material.uniforms.uScale.value = Math.max(700, window.innerHeight * 1.18);
    high.material.uniforms.uScale.value = Math.max(700, window.innerHeight * 1.18);
  }

  function setDusk(mix, sunColor) {
    low.material.uniforms.uColor.value.copy(low.material.userData.day).lerp(low.material.userData.dusk, mix);
    high.material.uniforms.uColor.value.copy(high.material.userData.day).lerp(high.material.userData.dusk, mix);
    low.material.uniforms.uColor.value.lerp(sunColor, mix * 0.18);
    high.material.uniforms.uColor.value.lerp(sunColor, mix * 0.12);
  }

  update(0, 0.016);
  return { group, update, resize, setDusk, low, high, leaves, birds };
}
