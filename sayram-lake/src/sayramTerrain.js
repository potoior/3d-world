import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const WATER_Y = 0.18;

export const LAKE = [
  [-392, -74], [-366, -206], [-270, -304], [-124, -356], [48, -366],
  [216, -330], [340, -244], [408, -126], [424, 8], [378, 112],
  [274, 172], [138, 192], [-8, 188], [-150, 166], [-278, 118],
  [-362, 34],
];

export const LAKE_BOUNDS = { xMin: -950, xMax: 950, zMin: -790, zMax: 890 };
export const ROAD_WIDTH = 13.5;
export const ROAD_OFFSET = 48;
export const CENTER = new THREE.Vector2(0, -78);

export function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

export function smoothstep(a, b, x) {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

export function rand(seed, n) {
  const x = Math.sin(seed * 127.1 + n * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function insidePoly(x, z, poly = LAKE) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0];
    const zi = poly[i][1];
    const xj = poly[j][0];
    const zj = poly[j][1];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

export function polyDistance(x, z, poly = LAKE) {
  let min = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const vx = b[0] - a[0];
    const vz = b[1] - a[1];
    const len2 = vx * vx + vz * vz || 1;
    const t = clamp(((x - a[0]) * vx + (z - a[1]) * vz) / len2, 0, 1);
    const dx = x - a[0] - vx * t;
    const dz = z - a[1] - vz * t;
    const d = dx * dx + dz * dz;
    if (d < min) min = d;
  }
  return Math.sqrt(min);
}

export function lakeInfo(x, z) {
  const inside = insidePoly(x, z, LAKE);
  const d = polyDistance(x, z, LAKE);
  return { inside, d: inside ? -d : d };
}

export function terrainHeight(x, z) {
  const info = lakeInfo(x, z);
  const d = info.d;
  const side = Math.max(0, Math.abs(x) - 430);
  const south = Math.max(0, z - 250);
  const north = Math.max(0, -z - 390);
  let h =
    -0.35 +
    Math.sin(x * 0.011 + 1.2) * 0.5 +
    Math.cos(z * 0.014) * 0.46 +
    Math.sin((x + z) * 0.021) * 0.28;
  h *= 0.58;
  h += smoothstep(0, 18, Math.abs(d)) * 0.28;
  h += Math.pow(Math.min(1, side / 560), 1.6) * 62;
  h += Math.pow(Math.min(1, south / 420), 1.7) * 24;
  h += Math.pow(Math.min(1, north / 320), 1.7) * 13;
  if (info.inside) h = Math.min(h, -1.1 - Math.min(Math.abs(d), 110) * 0.035);
  return h;
}

export function isLand(x, z, margin = 7) {
  const info = lakeInfo(x, z);
  return !info.inside && info.d > margin;
}

export function makeWaterMask() {
  const W = 512;
  const H = 512;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(W, H);
  const data = img.data;
  const xMin = LAKE_BOUNDS.xMin;
  const xMax = LAKE_BOUNDS.xMax;
  const zMin = LAKE_BOUNDS.zMin;
  const zMax = LAKE_BOUNDS.zMax;
  for (let y = 0; y < H; y++) {
    const z = zMin + ((y + 0.5) / H) * (zMax - zMin);
    for (let x = 0; x < W; x++) {
      const wx = xMin + ((x + 0.5) / W) * (xMax - xMin);
      const signed = -lakeInfo(wx, z).d;
      const mask = smoothstep(-2.6, 2.6, signed);
      const depth = smoothstep(1.5, 150, Math.max(0, signed));
      const idx = (y * W + x) * 4;
      data[idx] = Math.round(depth * 255);
      data[idx + 1] = Math.round(mask * 255);
      data[idx + 2] = Math.round(smoothstep(0, 20, Math.max(0, signed)) * 255);
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = true;
  t.needsUpdate = true;
  return t;
}

export function makeWaterMaterial(mask) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uDeep: { value: new THREE.Color(0x042347) },
      uMid: { value: new THREE.Color(0x075380) },
      uShallow: { value: new THREE.Color(0x2f9fae) },
      uSky: { value: new THREE.Color(0x9ecfe4) },
      uSun: { value: new THREE.Color(0xfff2d2) },
      uSunDir: { value: new THREE.Vector3(-0.35, 0.72, -0.58).normalize() },
      uFog: { value: new THREE.Color(0xcfe1ee) },
      uLakeMask: { value: mask },
      uReflect: { value: null },
      uReflectMatrix: { value: new THREE.Matrix4() },
      uReflectStrength: { value: 0.72 },
    },
    vertexShader: `
      uniform float uTime;
      uniform mat4 uReflectMatrix;
      varying vec3 vWorldPos;
      varying vec2 vLakeUv;
      varying vec4 vReflectCoord;
      void main() {
        vec3 pos = position;
        pos.y += sin(pos.x * 0.052 + uTime * 0.58) * 0.045;
        pos.y += sin(pos.z * 0.043 - uTime * 0.47) * 0.035;
        vec4 world = modelMatrix * vec4(pos, 1.0);
        vWorldPos = world.xyz;
        vLakeUv = uv;
        vReflectCoord = uReflectMatrix * vec4(world.xyz, 1.0);
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uDeep;
      uniform vec3 uMid;
      uniform vec3 uShallow;
      uniform vec3 uSky;
      uniform vec3 uSun;
      uniform vec3 uSunDir;
      uniform vec3 uFog;
      uniform sampler2D uLakeMask;
      uniform sampler2D uReflect;
      uniform float uReflectStrength;
      varying vec3 vWorldPos;
      varying vec2 vLakeUv;
      varying vec4 vReflectCoord;

      void main() {
        vec4 lake = texture2D(uLakeMask, vLakeUv);
        float mask = smoothstep(0.34, 0.62, lake.g);
        if (mask < 0.035) discard;

        vec2 p = vWorldPos.xz;
        float t = uTime;
        float c1 = cos(p.x * 0.052 + t * 0.58);
        float c2 = cos(p.y * 0.043 - t * 0.47);
        float c3 = cos((p.x + p.y) * 0.118 + t * 0.95);
        float c4 = cos(p.x * 0.23 - p.y * 0.19 + t * 1.35);
        float c5 = cos(p.x * 0.61 + p.y * 0.43 - t * 2.1);
        vec2 grad = vec2(
          c1 * 0.0022 + c3 * 0.0038 + c4 * 0.0042 + c5 * 0.0026,
          c2 * 0.0019 + c3 * 0.0038 - c4 * 0.0042 + c5 * 0.0026
        );
        vec3 n = normalize(vec3(-grad.x * 9.0, 1.0, -grad.y * 9.0));
        vec3 viewDir = normalize(cameraPosition - vWorldPos);
        float fres = pow(1.0 - clamp(dot(n, viewDir), 0.0, 1.0), 3.0);

        vec3 base = mix(uShallow, uMid, smoothstep(0.0, 0.28, lake.r));
        base = mix(base, uDeep, smoothstep(0.25, 0.86, lake.r));

        vec2 ruv = vReflectCoord.xy / max(vReflectCoord.w, 0.0001);
        ruv += n.xz * (0.018 + fres * 0.03);
        ruv = clamp(ruv, 0.002, 0.998);
        vec3 refl = texture2D(uReflect, ruv).rgb;
        refl = mix(refl, refl * refl * 1.35, 0.32);
        vec3 col = mix(base, refl, (0.18 + fres * 0.52) * uReflectStrength);
        col = mix(col, uSky, fres * 0.1);

        vec3 hv = normalize(normalize(uSunDir) + viewDir);
        float spec = pow(max(dot(n, hv), 0.0), 260.0);
        col += uSun * spec * 1.85;
        float sparkle = pow(max(0.0, sin(p.x * 1.55 + sin(p.y * 0.29) * 2.2 + t * 2.35) * sin(p.y * 1.12 - t * 1.8)), 24.0);
        col += vec3(1.0, 0.95, 0.82) * sparkle * 0.1;

        float foam = (1.0 - smoothstep(0.0, 0.045, lake.r)) * smoothstep(0.02, 0.16, lake.g);
        foam *= 0.55 + 0.45 * sin(t * 1.3 + p.x * 0.21 + p.y * 0.17);
        col = mix(col, vec3(0.84, 0.94, 0.98), max(0.0, foam) * 0.4);

        float fog = smoothstep(420.0, 2800.0, distance(cameraPosition, vWorldPos));
        col = mix(col, uFog, fog * 0.72);
        gl_FragColor = vec4(col, 0.95 * mask);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: true,
  });
}

export function makeLakeCurve() {
  return new THREE.CatmullRomCurve3(
    LAKE.map(([x, z]) => new THREE.Vector3(x, 0, z)),
    true,
    'catmullrom',
    0.28
  );
}

export function mergeStaticGroup(source) {
  source.updateMatrixWorld(true);
  const buckets = new Map();
  const skipped = [];
  source.traverse((obj) => {
    if (!obj.isMesh) return;
    if (obj.isInstancedMesh || obj.isSprite || obj.isPoints) {
      skipped.push(obj);
      return;
    }
    const mat = obj.material;
    if (Array.isArray(mat) || mat.transparent || mat.isShaderMaterial || !obj.visible) {
      skipped.push(obj);
      return;
    }
    let geo = obj.geometry.clone();
    geo.applyMatrix4(obj.matrixWorld);
    if (geo.index) geo = geo.toNonIndexed();
    for (const key of Object.keys(geo.attributes)) {
      if (key !== 'position' && key !== 'normal' && key !== 'uv') geo.deleteAttribute(key);
    }
    if (!geo.attributes.normal) geo.computeVertexNormals();
    if (!geo.attributes.uv) {
      const count = geo.attributes.position.count;
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(count * 2), 2));
    }
    if (!buckets.has(mat)) buckets.set(mat, []);
    buckets.get(mat).push(geo);
  });
  const merged = new THREE.Group();
  for (const [material, list] of buckets) {
    const geo = mergeGeometries(list, false);
    list.forEach((g) => g.dispose());
    if (!geo) continue;
    const mesh = new THREE.Mesh(geo, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    merged.add(mesh);
  }
  for (const obj of skipped) {
    obj.updateWorldMatrix(true, false);
    const matrix = obj.matrixWorld.clone();
    if (obj.parent) obj.parent.remove(obj);
    matrix.decompose(obj.position, obj.quaternion, obj.scale);
    merged.add(obj);
  }
  return merged;
}

export function createWaterReflection({ renderer, scene, camera, waterMesh, waterMaterial }) {
  const target = new THREE.WebGLRenderTarget(2, 2, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
    type: THREE.UnsignedByteType,
    depthBuffer: true,
  });
  target.texture.colorSpace = THREE.NoColorSpace;

  const virtualCamera = new THREE.PerspectiveCamera();
  virtualCamera.layers.set(0);
  const reflectorPosition = new THREE.Vector3(0, WATER_Y, 0);
  const normal = new THREE.Vector3(0, 1, 0);
  const cameraWorldPosition = new THREE.Vector3();
  const rotationMatrix = new THREE.Matrix4();
  const lookAtPosition = new THREE.Vector3();
  const view = new THREE.Vector3();
  const lookTarget = new THREE.Vector3();
  const textureMatrix = new THREE.Matrix4();
  const size = new THREE.Vector2();

  function resize() {
    renderer.getDrawingBufferSize(size);
    const scale = size.x > 1400 ? 0.3 : 0.4;
    const w = Math.max(2, Math.floor(size.x * scale));
    const h = Math.max(2, Math.floor(size.y * scale));
    target.setSize(w, h);
  }
  resize();

  function update() {
    camera.updateMatrixWorld();
    cameraWorldPosition.setFromMatrixPosition(camera.matrixWorld);
    view.subVectors(reflectorPosition, cameraWorldPosition);
    if (view.dot(normal) > 0) return;
    view.reflect(normal).negate();
    view.add(reflectorPosition);

    rotationMatrix.extractRotation(camera.matrixWorld);
    lookAtPosition.set(0, 0, -1).applyMatrix4(rotationMatrix).add(cameraWorldPosition);
    lookTarget.subVectors(reflectorPosition, lookAtPosition);
    lookTarget.reflect(normal).negate();
    lookTarget.add(reflectorPosition);

    virtualCamera.position.copy(view);
    virtualCamera.up.set(0, 1, 0).applyMatrix4(rotationMatrix).reflect(normal);
    virtualCamera.lookAt(lookTarget);
    virtualCamera.near = camera.near;
    virtualCamera.far = camera.far;
    virtualCamera.projectionMatrix.copy(camera.projectionMatrix);
    virtualCamera.projectionMatrixInverse.copy(camera.projectionMatrixInverse);
    virtualCamera.updateMatrixWorld();
    virtualCamera.matrixWorldInverse.copy(virtualCamera.matrixWorld).invert();

    textureMatrix.set(
      0.5, 0, 0, 0.5,
      0, 0.5, 0, 0.5,
      0, 0, 0.5, 0.5,
      0, 0, 0, 1
    );
    textureMatrix.multiply(virtualCamera.projectionMatrix);
    textureMatrix.multiply(virtualCamera.matrixWorldInverse);
    waterMaterial.uniforms.uReflectMatrix.value.copy(textureMatrix);
    waterMaterial.uniforms.uReflect.value = target.texture;

    const prevTarget = renderer.getRenderTarget();
    const prevAutoClear = renderer.autoClear;
    const prevXr = renderer.xr.enabled;
    renderer.xr.enabled = false;
    waterMesh.visible = false;
    renderer.autoClear = true;
    renderer.setRenderTarget(target);
    renderer.clear();
    renderer.render(scene, virtualCamera);
    renderer.setRenderTarget(prevTarget);
    renderer.autoClear = prevAutoClear;
    renderer.xr.enabled = prevXr;
    waterMesh.visible = true;
  }

  return { update, resize, target, camera: virtualCamera };
}

function createMountainRange() {
  const geo = new THREE.PlaneGeometry(5600, 2200, 170, 90);
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, 0, -1500);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const peaks = [
    { x: -2200, z: -1260, h: 350, rx: 430, rz: 380 },
    { x: -1720, z: -1400, h: 430, rx: 400, rz: 400 },
    { x: -1230, z: -1270, h: 385, rx: 370, rz: 360 },
    { x: -760, z: -1460, h: 485, rx: 390, rz: 420 },
    { x: -260, z: -1330, h: 445, rx: 360, rz: 380 },
    { x: 230, z: -1480, h: 515, rx: 400, rz: 430 },
    { x: 730, z: -1300, h: 405, rx: 370, rz: 360 },
    { x: 1210, z: -1410, h: 460, rx: 390, rz: 400 },
    { x: 1710, z: -1270, h: 365, rx: 380, rz: 370 },
    { x: 2200, z: -1430, h: 325, rx: 440, rz: 400 },
  ];
  const c = new THREE.Color();
  const forest = new THREE.Color(0x3d5b45);
  const forestLight = new THREE.Color(0x57725a);
  const rockLow = new THREE.Color(0x586b7a);
  const rockMid = new THREE.Color(0x71818c);
  const rockWarm = new THREE.Color(0x8b8d8a);
  const snow = new THREE.Color(0xf2f6f8);
  const snowBlue = new THREE.Color(0xcbdfea);
  const glacier = new THREE.Color(0xa9cbdc);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const foot = smoothstep(-540, -1080, z);
    const und = 0.5 + 0.5 * Math.sin(x * 0.004 + Math.sin(z * 0.0035) * 1.7);
    let h = foot * (56 + und * 64);
    for (const p of peaks) {
      const gx = (x - p.x) / p.rx;
      const gz = (z - p.z) / p.rz;
      h += p.h * 0.76 * Math.exp(-(gx * gx + gz * gz) * 1.45);
    }
    h += foot * (16 * Math.sin(x * 0.021 + z * 0.014) + 8 * Math.sin(x * 0.061 - z * 0.026));
    h = Math.max(0, h * foot);
    pos.setY(i, h - 3.4);
    const snowLine = 148 + 28 * Math.sin(x * 0.006 + 1.1) + 16 * Math.sin(z * 0.009);
    const jag = 16 * Math.sin(x * 0.033 + z * 0.021) + 7 * Math.sin(x * 0.094 - z * 0.038);
    const strata = 0.5 + 0.5 * Math.sin(h * 0.11 + x * 0.014);
    const patch = 0.5 + 0.5 * Math.sin(x * 0.048 + z * 0.036);
    if (h > snowLine + jag) {
      c.copy(snow).lerp(snowBlue, patch * 0.5);
      if (patch > 0.72 && h < snowLine + 70) c.lerp(glacier, 0.55);
    } else if (h > snowLine - 34 + jag * 0.5) {
      c.copy(rockMid).lerp(rockWarm, strata * 0.58).lerp(snow, patch * 0.48);
    } else if (h > 44) {
      c.copy(rockLow).lerp(rockMid, strata * 0.58);
      if (h > 100) c.lerp(rockWarm, 0.24);
    } else {
      c.copy(forest).lerp(forestLight, strata * 0.55).lerp(rockLow, patch * 0.26);
    }
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.97,
    metalness: 0,
    flatShading: true,
    emissive: new THREE.Color(0x101c25),
    emissiveIntensity: 0.34,
  });
  const mesh = new THREE.Mesh(geo, material);
  mesh.name = 'sayram-tianshan';
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return mesh;
}

function makeCloudTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 256, 256);
  let state = 71;
  const rr = () => ((state = (state * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < 52; i++) {
    const x = 42 + rr() * 172;
    const y = 96 + (rr() - 0.5) * 74;
    const r = 15 + rr() * 38;
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, `rgba(255,255,255,${0.1 + rr() * 0.15})`);
    grd.addColorStop(0.55, `rgba(247,251,255,${0.05 + rr() * 0.09})`);
    grd.addColorStop(1, 'rgba(238,248,255,0)');
    g.fillStyle = grd;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function createClouds() {
  const group = new THREE.Group();
  const map = makeCloudTexture();
  const material = new THREE.SpriteMaterial({
    map,
    color: 0xffffff,
    transparent: true,
    opacity: 0.46,
    depthWrite: false,
    fog: false,
  });
  const defs = [
    [-1750, 380, -1750, 900, 300, 0.8],
    [-980, 430, -1900, 760, 240, 0.7],
    [-180, 475, -2050, 1020, 300, 0.8],
    [720, 420, -1880, 860, 270, 0.7],
    [1650, 390, -1800, 940, 300, 0.8],
    [-1350, 300, -1500, 560, 170, 0.5],
    [1250, 315, -1600, 640, 190, 0.55],
  ];
  defs.forEach(([x, y, z, sx, sy, op]) => {
    const s = new THREE.Sprite(material.clone());
    s.material.opacity = op;
    s.position.set(x, y, z);
    s.scale.set(sx, sy, 1);
    group.add(s);
  });
  return { group, material };
}

export function buildTerrainAndLake() {
  const root = new THREE.Group();

  const grassMap = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 512;
    const g = c.getContext('2d');
    g.fillStyle = '#5e7f43';
    g.fillRect(0, 0, 512, 512);
    let state = 19;
    const rr = () => ((state = (state * 1664525 + 1013904223) >>> 0) / 4294967296);
    for (let i = 0; i < 8400; i++) {
      const x = rr() * 512;
      const y = rr() * 512;
      const v = rr();
      if (v < 0.24) g.fillStyle = `rgba(49,74,37,${0.2 + rr() * 0.35})`;
      else if (v < 0.58) g.fillStyle = `rgba(112,146,74,${0.16 + rr() * 0.28})`;
      else if (v < 0.86) g.fillStyle = `rgba(144,168,92,${0.12 + rr() * 0.22})`;
      else g.fillStyle = `rgba(190,177,100,${0.08 + rr() * 0.16})`;
      g.fillRect(x, y, 0.6 + rr() * 2.6, 1.4 + rr() * 7);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(68, 68);
    t.anisotropy = 4;
    return t;
  })();

  const terrainGeo = new THREE.PlaneGeometry(2600, 2600, 110, 110);
  terrainGeo.rotateX(-Math.PI / 2);
  const tp = terrainGeo.attributes.position;
  for (let i = 0; i < tp.count; i++) {
    const x = tp.getX(i);
    const z = tp.getZ(i);
    tp.setY(i, terrainHeight(x, z));
  }
  terrainGeo.computeVertexNormals();
  const terrainMat = new THREE.MeshStandardMaterial({
    map: grassMap,
    color: 0xd9e6c9,
    roughness: 1,
    metalness: 0,
  });
  const terrain = new THREE.Mesh(terrainGeo, terrainMat);
  terrain.receiveShadow = true;
  terrain.name = 'sayram-meadow-ground';
  root.add(terrain);

  const mask = makeWaterMask();
  const waterMaterial = makeWaterMaterial(mask);
  const waterGeo = new THREE.PlaneGeometry(1900, 1680, 120, 100);
  waterGeo.rotateX(-Math.PI / 2);
  waterGeo.translate(0, 0, (LAKE_BOUNDS.zMin + LAKE_BOUNDS.zMax) * 0.5);
  const waterMesh = new THREE.Mesh(waterGeo, waterMaterial);
  waterMesh.position.y = WATER_Y;
  waterMesh.name = 'sayram-lake-water';
  waterMesh.renderOrder = 1;
  root.add(waterMesh);

  root.add(createMountainRange());
  const clouds = createClouds();
  root.add(clouds.group);

  return { root, waterMaterial, waterMesh, clouds };
}
