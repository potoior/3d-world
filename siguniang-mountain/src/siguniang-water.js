import * as THREE from 'three';
import { mergedMesh } from './geometry.js';
import { POOLS, STREAM_POINTS } from './layout.js';
import { heightAt } from './siguniang-util.js';

function makeWaterMaterial(mode) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uDeep: { value: new THREE.Color(0x0d6b70) },
      uShallow: { value: new THREE.Color(0x62d8bf) },
      uSky: { value: new THREE.Color(0xdff3ef) },
      uSun: { value: new THREE.Color(0xfff0cf) },
      uSunDir: { value: new THREE.Vector3(0.6, 0.7, 0.2).normalize() },
      uMode: { value: mode === 'stream' ? 0 : 1 },
    },
    transparent: true,
    depthWrite: false,
    vertexShader: `
      uniform float uTime;
      uniform float uMode;
      varying vec3 vWorld;
      varying vec2 vUv;
      varying vec3 vNormalW;
      void main() {
        vec3 p = position;
        float w = sin(p.x * 0.075 + p.z * 0.055 + uTime * 1.25) * 0.055
                + sin(p.z * 0.14 - uTime * 1.65) * 0.035;
        p.y += w * (0.55 + uMode * 0.25);
        vWorld = (modelMatrix * vec4(p, 1.0)).xyz;
        vUv = uv;
        vNormalW = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uMode;
      uniform vec3 uDeep;
      uniform vec3 uShallow;
      uniform vec3 uSky;
      uniform vec3 uSun;
      uniform vec3 uSunDir;
      varying vec3 vWorld;
      varying vec2 vUv;
      varying vec3 vNormalW;
      void main() {
        vec2 p = vWorld.xz;
        float t = uTime;
        float r1 = sin(p.x * 0.115 + t * 0.9) * cos(p.y * 0.093 - t * 0.7);
        float r2 = sin(p.x * 0.24 - p.y * 0.17 + t * 1.4);
        float r3 = cos(p.y * 0.21 + p.x * 0.07 - t * 1.1);
        float r4 = sin(p.x * 0.44 + p.y * 0.31 + t * 2.1);
        vec3 n = normalize(vNormalW + vec3(r1 * 0.1 + r2 * 0.055, 0.0, r3 * 0.1 - r4 * 0.045));
        vec3 viewDir = normalize(cameraPosition - vWorld);
        float fres = pow(1.0 - clamp(dot(viewDir, n), 0.0, 1.0), 2.3);
        float band = 0.5 + 0.5 * sin(p.x * 0.035 - p.y * 0.021 - t * 0.35);
        vec3 base = mix(uDeep, uShallow, 0.34 + 0.3 * band + 0.14 * r1);
        vec3 col = mix(base, uSky, fres * 0.56);
        float streak = 0.5 + 0.5 * sin(vUv.y * 46.0 - t * 2.5 + sin(vUv.x * 9.0) * 1.3);
        col += uShallow * streak * 0.075 * (1.0 - uMode);
        float edge = min(vUv.x, 1.0 - vUv.x);
        float foam = (1.0 - smoothstep(0.0, 0.115, edge)) * (0.42 + 0.26 * sin(vUv.y * 36.0 - t * 2.9));
        col = mix(col, vec3(0.93, 0.99, 0.97), foam * (1.0 - uMode) * 0.72);
        vec3 hv = normalize(viewDir + normalize(uSunDir));
        float spec = pow(max(dot(n, hv), 0.0), 130.0);
        col += uSun * spec * 0.7;
        float sp = pow(max(sin(p.x * 1.5 + sin(p.y * 0.37) * 2.0 + t * 2.3) * sin(p.y * 1.13 - t * 1.7), 0.0), 24.0);
        col += vec3(1.0, 0.97, 0.9) * sp * 0.16;
        gl_FragColor = vec4(col, 0.945);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
}

export function createWater() {
  const group = new THREE.Group();
  const curve = new THREE.CatmullRomCurve3(
    STREAM_POINTS.map(([x, z]) => new THREE.Vector3(x, heightAt(x, z), z)),
    false,
    'catmullrom',
    0.28
  );
  const N = 240;
  const pos = [];
  const uv = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const pt = curve.getPoint(t);
    const tan = curve.getTangent(t);
    const nx = -tan.z;
    const nz = tan.x;
    const inv = 1 / (Math.hypot(nx, nz) || 1);
    const width = 6.5 + 4.2 * Math.sin(t * 8.4 + 0.7) + 3.2 * Math.sin(t * 19.1) + (t > 0.55 ? 2.2 : 0);
    const half = Math.max(3.2, width * 0.5);
    pos.push(pt.x + nx * inv * half, pt.y + 0.32, pt.z + nz * inv * half);
    pos.push(pt.x - nx * inv * half, pt.y + 0.32, pt.z - nz * inv * half);
    uv.push(0, t * 62, 1, t * 62);
  }
  const idx = [];
  for (let i = 0; i < N; i++) {
    const a = i * 2;
    idx.push(a, a + 2, a + 1, a + 2, a + 3, a + 1);
  }
  const sgeo = new THREE.BufferGeometry();
  sgeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  sgeo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  sgeo.setIndex(idx);
  sgeo.computeVertexNormals();
  const streamMat = makeWaterMaterial('stream');
  const stream = new THREE.Mesh(sgeo, streamMat);
  stream.renderOrder = 2;
  group.add(stream);

  const poolGeos = [];
  for (const pool of POOLS) {
    const shape = new THREE.Shape();
    pool.poly.forEach(([x, z], i) => {
      if (i === 0) shape.moveTo(x, -z);
      else shape.lineTo(x, -z);
    });
    shape.closePath();
    const g = new THREE.ShapeGeometry(shape, 1);
    g.rotateX(-Math.PI / 2);
    g.translate(0, pool.level, 0);
    poolGeos.push(g);
  }
  const poolMat = makeWaterMaterial('pool');
  const pools = mergedMesh(poolGeos, poolMat, false, false);
  if (pools) {
    pools.renderOrder = 3;
    group.add(pools);
  }

  streamMat.userData.day = { deep: 0x0d6b70, shallow: 0x62d8bf, sky: 0xdff3ef };
  streamMat.userData.dusk = { deep: 0x123e50, shallow: 0x3f9b91, sky: 0xdda18b };
  poolMat.userData.day = { deep: 0x0b626e, shallow: 0x6fe0c7, sky: 0xe8f7f2 };
  poolMat.userData.dusk = { deep: 0x103c50, shallow: 0x499e94, sky: 0xd99a86 };

  return { group, waterMaterials: [streamMat, poolMat], stream, pools };
}
