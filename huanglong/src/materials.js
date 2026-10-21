import * as THREE from 'three';
import { makeGroundTexture, makeWaterNormalTexture, makeRoofTexture, makeWallTexture, makePlaqueTexture, makePavingTexture, makeSignAtlas } from './textures.js';

const groundMap = makeGroundTexture();
groundMap.repeat.set(95, 95);
const waterNormalMap = makeWaterNormalTexture();
const roofMap = makeRoofTexture();
roofMap.repeat.set(2.6, 1.8);
const wallMap = makeWallTexture();
wallMap.repeat.set(2.2, 1.4);
const pavingMap = makePavingTexture();
pavingMap.repeat.set(3, 3);
const cliffMap = makeCliffTexture();

function makeCliffTexture() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 704;
  const g = c.getContext('2d');
  const base = g.createLinearGradient(0, 0, 0, 704);
  base.addColorStop(0, '#9aa093');
  base.addColorStop(0.42, '#8d9184');
  base.addColorStop(0.75, '#7f8579');
  base.addColorStop(1, '#697166');
  g.fillStyle = base;
  g.fillRect(0, 0, 1024, 704);
  const bands = [
    [36, 18, 'rgba(202,188,152,0.34)'],
    [88, 10, 'rgba(74,78,68,0.40)'],
    [142, 30, 'rgba(178,151,113,0.27)'],
    [226, 16, 'rgba(96,93,77,0.35)'],
    [312, 38, 'rgba(193,170,132,0.28)'],
    [424, 20, 'rgba(68,74,64,0.42)'],
    [506, 30, 'rgba(174,144,104,0.24)'],
    [604, 24, 'rgba(86,87,72,0.34)'],
    [662, 36, 'rgba(190,181,145,0.22)'],
  ];
  for (const [y, h, col] of bands) {
    g.fillStyle = col;
    g.beginPath();
    g.moveTo(0, y);
    for (let x = 0; x <= 1024; x += 32) {
      g.lineTo(x, y + Math.sin(x * 0.012 + y) * 7 + Math.sin(x * 0.041) * 2.5);
    }
    g.lineTo(1024, y + h);
    for (let x = 1024; x >= 0; x -= 32) {
      g.lineTo(x, y + h + Math.sin(x * 0.01 + y) * 5);
    }
    g.closePath();
    g.fill();
  }
  for (let i = 0; i < 210; i++) {
    const x = (Math.sin(i * 73.1) * 0.5 + 0.5) * 1024;
    const w = 1 + (i % 13) * 1.8;
    const a = 0.035 + (i % 8) * 0.015;
    g.fillStyle = i % 3 ? `rgba(55,63,55,${a})` : `rgba(225,223,198,${a})`;
    g.fillRect(x, 0, w, 704);
    if (i % 5 === 0) {
      g.fillStyle = `rgba(48,54,47,${a * 0.8})`;
      g.fillRect(x + w, 0, 1.5, 704);
    }
  }
  g.lineCap = 'round';
  for (let i = 0; i < 44; i++) {
    const x = (Math.sin(i * 37.7 + 2) * 0.5 + 0.5) * 1024;
    const y = (Math.cos(i * 51.3) * 0.5 + 0.5) * 580;
    const r = 14 + (i % 7) * 15;
    const rg = g.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, i % 3 ? 'rgba(226,221,193,0.18)' : 'rgba(54,62,54,0.14)');
    rg.addColorStop(1, 'rgba(226,221,193,0)');
    g.fillStyle = rg;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  for (let i = 0; i < 22; i++) {
    const x = 30 + (i % 11) * 92 + (i % 3) * 13;
    const y = 180 + ((i * 47) % 400);
    g.strokeStyle = i % 2 ? 'rgba(47,53,46,0.28)' : 'rgba(220,215,188,0.25)';
    g.lineWidth = 1 + (i % 3);
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + 18, y + 24);
    g.lineTo(x + 8, y + 52);
    g.lineTo(x + 22, y + 78);
    g.stroke();
  }
  for (let i = 0; i < 9; i++) {
    const x = 92 + i * 101 + (i % 3) * 16;
    const y = 330 + (i % 4) * 46;
    const dark = i % 2 ? 'rgba(47,51,44,0.55)' : 'rgba(232,222,190,0.42)';
    g.strokeStyle = dark;
    g.fillStyle = dark;
    g.lineWidth = 7 + (i % 3) * 2;
    g.beginPath();
    g.moveTo(x - 42, y + 18);
    g.lineTo(x - 14, y - 16);
    g.lineTo(x + 7, y - 3);
    g.lineTo(x + 30, y - 24);
    g.lineTo(x + 45, y + 9);
    g.lineTo(x + 22, y + 31);
    g.lineTo(x - 34, y + 34);
    g.closePath();
    g.stroke();
    g.beginPath();
    g.moveTo(x + 2, y - 17);
    g.lineTo(x - 10, y - 55);
    g.lineTo(x + 6, y - 64);
    g.stroke();
    g.lineWidth = 3.5;
    for (let k = 0; k < 4; k++) {
      g.beginPath();
      g.moveTo(x - 30 + k * 19, y + 27);
      g.lineTo(x - 36 + k * 20, y + 58);
      g.stroke();
    }
    g.beginPath();
    g.arc(x + 34, y - 10, 5, 0, Math.PI * 2);
    g.fill();
  }
  for (let i = 0; i < 120; i++) {
    const x = (Math.sin(i * 17.3) * 0.5 + 0.5) * 1024;
    const y = (Math.cos(i * 29.1) * 0.5 + 0.5) * 704;
    g.fillStyle = i % 4 ? 'rgba(45,55,44,0.16)' : 'rgba(208,197,159,0.18)';
    g.beginPath();
    g.ellipse(x, y, 3 + (i % 5) * 3, 1.5 + (i % 4) * 2, i, 0, Math.PI * 2);
    g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

export const mats = {
  ground: new THREE.MeshStandardMaterial({ map: groundMap, vertexColors: true, roughness: 1 }),
  karst: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96, metalness: 0 }),
  cliff: new THREE.MeshStandardMaterial({ map: cliffMap, roughness: 0.98, side: THREE.DoubleSide }),
  bamboo: new THREE.MeshStandardMaterial({ color: 0x6e8a4d, roughness: 0.9 }),
  leaf: new THREE.MeshStandardMaterial({ color: 0x54783f, roughness: 0.9, side: THREE.DoubleSide }),
  trunk: new THREE.MeshStandardMaterial({ color: 0x5d4a34, roughness: 0.96 }),
  pine: new THREE.MeshStandardMaterial({ color: 0x4c6c4b, roughness: 0.92 }),
  broad: new THREE.MeshStandardMaterial({ color: 0x627f4a, roughness: 0.94 }),
  roof: new THREE.MeshStandardMaterial({ map: roofMap, color: 0xc6ccc9, roughness: 0.62, metalness: 0.16, side: THREE.DoubleSide }),
  wall: new THREE.MeshStandardMaterial({ map: wallMap, color: 0xf1ece0, roughness: 0.94 }),
  wood: new THREE.MeshStandardMaterial({ color: 0x6d4b30, roughness: 0.88 }),
  stone: new THREE.MeshStandardMaterial({ color: 0x9a9a86, roughness: 0.95 }),
  paving: new THREE.MeshStandardMaterial({ map: pavingMap, color: 0xc4c0b2, roughness: 0.94 }),
  sign: new THREE.MeshStandardMaterial({ map: makeSignAtlas(), roughness: 0.82, side: THREE.DoubleSide }),
  rice: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: THREE.DoubleSide }),
  reed: new THREE.MeshStandardMaterial({ color: 0xa5a071, roughness: 0.92, side: THREE.DoubleSide }),
  raft: new THREE.MeshStandardMaterial({ color: 0xa98c53, roughness: 0.86 }),
  boat: new THREE.MeshStandardMaterial({ color: 0x39372e, roughness: 0.8 }),
  cloth: new THREE.MeshStandardMaterial({ color: 0x2e4b58, roughness: 0.9 }),
  straw: new THREE.MeshStandardMaterial({ color: 0xc4ab6d, roughness: 0.9 }),
  bird: new THREE.MeshStandardMaterial({ color: 0x242b2a, roughness: 0.72 }),
  skin: new THREE.MeshStandardMaterial({ color: 0x9d7652, roughness: 0.9 }),
  lantern: new THREE.MeshStandardMaterial({ color: 0xb43826, roughness: 0.6, emissive: 0x420b05, emissiveIntensity: 0.8 }),
  wake: new THREE.MeshBasicMaterial({ color: 0xdff3ec, transparent: true, opacity: 0.28, depthWrite: false }),
};

export function makeWaterMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uDeep: { value: new THREE.Color(0x245b4b) },
      uShallow: { value: new THREE.Color(0x5d9675) },
      uSky: { value: new THREE.Color(0xb9d2cb) },
      uTop: { value: new THREE.Color(0x8eb7b5) },
      uHorizon: { value: new THREE.Color(0xd2ded4) },
      uSun: { value: new THREE.Color(0xfff2cf) },
      uSunDir: { value: new THREE.Vector3(0.4, 0.8, 0.3).normalize() },
      uNormalMap: { value: waterNormalMap },
      fogColor: { value: new THREE.Color(0xcbd8d2) },
      fogNear: { value: 500 },
      fogFar: { value: 2200 },
    },
    vertexShader: `
      uniform float uTime;
      varying vec3 vWorldPos;
      varying vec2 vUv;
      #include <fog_pars_vertex>
      void main() {
        vUv = uv;
        vec3 pos = position;
        vec4 world = modelMatrix * vec4(pos, 1.0);
        vWorldPos = world.xyz;
        vec4 mvPosition = viewMatrix * world;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uDeep;
      uniform vec3 uShallow;
      uniform vec3 uSky;
      uniform vec3 uTop;
      uniform vec3 uHorizon;
      uniform vec3 uSun;
      uniform vec3 uSunDir;
      uniform sampler2D uNormalMap;
      #include <fog_pars_fragment>
      varying vec3 vWorldPos;
      varying vec2 vUv;
      void main() {
        vec2 p = vWorldPos.xz;
        vec2 uv1 = p * 0.042 + vec2(uTime * 0.012, uTime * 0.020);
        vec2 uv2 = p * 0.015 - vec2(uTime * 0.008, uTime * 0.011);
        vec2 uv3 = p * 0.11 + vec2(uTime * 0.018, -uTime * 0.014);
        vec2 uv4 = p * 0.265 + vec2(uTime * 0.027, uTime * 0.019);
        vec3 n1 = texture2D(uNormalMap, uv1).rgb * 2.0 - 1.0;
        vec3 n2 = texture2D(uNormalMap, uv2).rgb * 2.0 - 1.0;
        vec3 n3 = texture2D(uNormalMap, uv3).rgb * 2.0 - 1.0;
        vec3 n4 = texture2D(uNormalMap, uv4).rgb * 2.0 - 1.0;
        vec3 rip = vec3(
          n1.x * 0.44 + n2.x * 0.32 + n3.x * 0.17 + n4.x * 0.07,
          0.0,
          n1.y * 0.44 + n2.y * 0.32 + n3.y * 0.17 + n4.y * 0.07
        );
        vec3 n = normalize(vec3(rip.x, 1.0, rip.z));
        vec3 viewDir = normalize(cameraPosition - vWorldPos);
        float fres = pow(1.0 - clamp(dot(viewDir, n), 0.0, 1.0), 2.6);
        vec3 refl = reflect(-viewDir, n);
        float up = smoothstep(-0.02, 0.62, refl.y);
        vec3 skyRef = mix(uHorizon, uTop, up);
        float glow = pow(max(dot(refl, normalize(uSunDir)), 0.0), 10.0);
        skyRef += uSun * glow * 0.3;
        float bank = smoothstep(0.135, 0.0, min(vUv.x, 1.0 - vUv.x));
        float mirror = smoothstep(0.32, 0.0, max(refl.y, 0.0)) * 0.16;
        vec3 base = mix(uDeep, uShallow, 0.34 + 0.28 * n1.x + 0.15 * n2.x + 0.08 * n4.x);
        base = mix(base, uDeep * 0.72, bank * 0.42);
        vec3 col = mix(base, skyRef, 0.28 + 0.58 * fres);
        col = mix(col, uSky, mirror);
        vec3 hv = normalize(viewDir + normalize(uSunDir));
        float spec = pow(max(dot(n, hv), 0.0), 220.0);
        col += uSun * spec * 1.05;
        float glintA = pow(max(sin(p.x * 0.73 + uTime * 1.9) * sin(p.y * 0.51 - uTime * 1.35), 0.0), 38.0);
        float glintB = pow(max(sin(p.x * 1.31 - uTime * 1.1 + p.y * 0.37), 0.0), 54.0);
        float glintC = pow(max(sin(p.x * 0.29 - p.y * 0.43 + uTime * 0.65), 0.0), 24.0);
        col += vec3(1.0, 0.965, 0.82) * (glintA * 0.16 + glintB * 0.09 + glintC * 0.035);
        float foamNoise = sin(p.x * 0.9 + uTime * 0.7) * sin(p.y * 0.63 - uTime * 0.55);
        float foam = smoothstep(0.62, 1.0, bank * (0.72 + 0.28 * foamNoise));
        col = mix(col, vec3(0.87, 0.94, 0.9), foam * 0.34);
        col = mix(col, uShallow * 1.12, smoothstep(0.72, 0.98, bank) * 0.2);
        gl_FragColor = vec4(col, 0.968);
        #include <fog_fragment>
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
    fog: true,
  });
}

export const sharedTextures = { groundMap, waterNormalMap, cliffMap };
