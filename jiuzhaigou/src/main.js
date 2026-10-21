import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildJiuzhaiScene } from './scene.js';
import { buildJiuzhaigouOverlay } from './jiuzhaigou.js';
import { createFirstPerson } from './firstperson.js';
import { initInteractions } from '../../shared/interactions.js';

const isCompact = window.innerWidth < 820 || /Mobi|Android/i.test(navigator.userAgent);
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, isCompact ? 1.4 : 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xc7d8d1, 520, 3000);

const camera = new THREE.PerspectiveCamera(54, window.innerWidth / window.innerHeight, 1, 7000);
camera.position.set(218, 158, 536);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 22, 42);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.minDistance = 12;
controls.maxDistance = 2300;
controls.maxPolarAngle = Math.PI * 0.492;
controls.autoRotateSpeed = 0.2;
controls.update();

const skyUniforms = {
  topColor: { value: new THREE.Color(0x72a0b3) },
  horizonColor: { value: new THREE.Color(0xdfe9e1) },
  bottomColor: { value: new THREE.Color(0xb8cdc8) },
  sunDir: { value: new THREE.Vector3(0.5, 0.65, 0.4).normalize() },
  sunColor: { value: new THREE.Color(0xfff2d4) },
};
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(6000, 48, 28),
  new THREE.ShaderMaterial({
    uniforms: skyUniforms,
    side: THREE.BackSide,
    depthWrite: false,
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 horizonColor;
      uniform vec3 bottomColor;
      uniform vec3 sunColor;
      uniform vec3 sunDir;
      varying vec3 vWorldPosition;
      void main() {
        vec3 dir = normalize(vWorldPosition);
        float h = dir.y;
        vec3 col = mix(bottomColor, horizonColor, smoothstep(-0.2, 0.08, h));
        col = mix(col, topColor, smoothstep(0.02, 0.66, h));
        float sd = max(dot(dir, normalize(sunDir)), 0.0);
        float haze = smoothstep(0.2, 0.0, abs(h - 0.03));
        col = mix(col, vec3(0.93, 0.95, 0.92), haze * 0.3);
        float cl = sin(dir.x * 6.5 + 1.3) * sin(dir.z * 4.7 - 0.6) + 0.5 * sin(dir.x * 15.0 - dir.z * 10.0);
        col += vec3(1.0, 0.99, 0.96) * smoothstep(0.55, 1.2, cl) * smoothstep(0.05, 0.38, h) * 0.05;
        col += sunColor * pow(sd, 800.0) * 1.6;
        col += sunColor * pow(sd, 12.0) * 0.15;
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  })
);
scene.add(sky);

const hemi = new THREE.HemisphereLight(0xdcebe4, 0x71855f, 1.62);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff1d6, 2.45);
sun.position.set(420, 900, 640);
sun.castShadow = true;
sun.shadow.mapSize.set(isCompact ? 1536 : 2048, isCompact ? 1536 : 2048);
sun.shadow.camera.left = -760;
sun.shadow.camera.right = 760;
sun.shadow.camera.top = 700;
sun.shadow.camera.bottom = -700;
sun.shadow.camera.near = 30;
sun.shadow.camera.far = 2500;
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 1.8;
scene.add(sun);
scene.add(sun.target);
const fill = new THREE.DirectionalLight(0xb8d0d0, 0.6);
fill.position.set(-560, 300, 380);
scene.add(fill);
const ambient = new THREE.AmbientLight(0xdcebe4, 0.42);
scene.add(ambient);

const world = buildJiuzhaiScene();
scene.add(world.group);
scene.add(world.extras);
const overlay = buildJiuzhaigouOverlay(scene.fog);
scene.add(overlay.group);
const overlayLife = overlay.life;
const waterMaterial = overlay.waterMaterial || world.waterMaterial;

let fp = null;
const dayState = {
  sun: new THREE.Color(0xfff1da),
  hemiSky: new THREE.Color(0xd7e6ea),
  hemiGround: new THREE.Color(0x687a58),
  top: new THREE.Color(0x72a0b3),
  horizon: new THREE.Color(0xdfe9e1),
  bottom: new THREE.Color(0xb8cdc8),
  fog: new THREE.Color(0xc7d8d1),
  waterDeep: new THREE.Color(0x0c5a63),
  waterShallow: new THREE.Color(0x61d4b7),
  waterSky: new THREE.Color(0xb9d8d2),
  sunPos: new THREE.Vector3(420, 900, 640),
  sunIntensity: 2.45,
  hemiIntensity: 1.62,
  exposure: 1.12,
};
const duskState = {
  sun: new THREE.Color(0xff9a58),
  hemiSky: new THREE.Color(0x92a4bd),
  hemiGround: new THREE.Color(0x6d5b48),
  top: new THREE.Color(0x2e4a6d),
  horizon: new THREE.Color(0xeaa06d),
  bottom: new THREE.Color(0x81655b),
  fog: new THREE.Color(0xbd9079),
  waterDeep: new THREE.Color(0x14343b),
  waterShallow: new THREE.Color(0x3f5f57),
  waterSky: new THREE.Color(0xc58f74),
  sunPos: new THREE.Vector3(-650, 230, 350),
  sunIntensity: 1.7,
  hemiIntensity: 0.62,
  exposure: 0.99,
};
let envTarget = 0;
let envMix = 0;
const tour = {
  active: false,
  t: 0,
  duration: 2.1,
  fromP: new THREE.Vector3(),
  fromT: new THREE.Vector3(),
  toP: new THREE.Vector3(),
  toT: new THREE.Vector3(),
};
const views = {
  overview: { p: [218, 158, 536], t: [0, 22, 42] },
  wuhua: { p: [112, 45, 168], t: [-2, 3, 34] },
  nuorilang: { p: [124, 68, 22], t: [0, 12, -106] },
  shuzheng: { p: [128, 54, 388], t: [-4, 3, 242] },
  dusk: { p: [236, 108, 486], t: [0, 26, 46] },
};
const notes = {
  overview: ['九寨沟全景', '五花海、诺日朗瀑布与树正群海在雪峰与彩林之间层层铺展'],
  wuhua: ['五花海', '钙华湖底沉积与水生植物交织，湖水在碧绿、宝蓝与琥珀色之间流转'],
  nuorilang: ['诺日朗瀑布', '宽阔的钙华瀑布如银帘铺展，水雾在彩林与雪峰间升腾'],
  shuzheng: ['树正群海', '钙华堤埂将溪流分成层层海子，木栈道沿水蜿蜒穿过藏族村寨'],
  dusk: ['九寨暮色', '暮光落在雪峰与彩林上，海子与经幡在高原晚风里沉静下来'],
};

function travelTo(view) {
  tour.fromP.copy(camera.position);
  tour.fromT.copy(controls.target);
  tour.toP.set(...view.p);
  tour.toT.set(...view.t);
  tour.t = 0;
  tour.active = true;
  controls.autoRotate = false;
  document.getElementById('btn-rotate').classList.remove('active');
}

function setCaption(key) {
  const note = notes[key];
  if (!note) return;
  document.getElementById('caption-title').textContent = note[0];
  document.getElementById('caption-text').textContent = note[1];
  const cap = document.getElementById('caption');
  cap.classList.remove('pulse');
  void cap.offsetWidth;
  cap.classList.add('pulse');
}

const duskBtn = document.getElementById('btn-dusk');
function applyEnvTarget(value) {
  envTarget = value > 0.5 ? 1 : 0;
  duskBtn.classList.toggle('active', envTarget > 0.5);
  duskBtn.textContent = envTarget > 0.5 ? '白昼' : '暮色';
}

document.querySelectorAll('[data-view]').forEach((btn) => {
  btn.addEventListener('click', () => {
    if (fp && fp.isActive()) fp.exit();
    const view = views[btn.dataset.view];
    setCaption(btn.dataset.view);
    document.querySelectorAll('[data-view]').forEach((b) => b.classList.toggle('active', b === btn));
    applyEnvTarget(btn.dataset.view === 'dusk' ? 1 : 0);
    if (view) travelTo(view);
  });
});

const rotateBtn = document.getElementById('btn-rotate');
rotateBtn.addEventListener('click', () => {
  controls.autoRotate = !controls.autoRotate;
  rotateBtn.classList.toggle('active', controls.autoRotate);
});
duskBtn.addEventListener('click', () => {
  applyEnvTarget(envTarget > 0.5 ? 0 : 1);
});

fp = createFirstPerson({
  camera,
  controls,
  canvas,
  onEnter: () => {
    tour.active = false;
    controls.autoRotate = false;
    rotateBtn.classList.remove('active');
  },
});

window.__jiuzhai = {
  scene, camera, renderer, controls, world, overlay, fp, views, notes,
  env: () => ({ mix: envMix, target: envTarget }),
  stats: overlay.stats,
};
window.__huanglong = window.__jiuzhai;
window.__fp = fp;
window.__stats = () => ({
  calls: renderer.info.render.calls,
  triangles: renderer.info.render.triangles,
  geometries: renderer.info.memory.geometries,
  textures: renderer.info.memory.textures,
});
controls.addEventListener('start', () => {
  tour.active = false;
});
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();
const tmpSunPos = new THREE.Vector3();

function updateEnvironment(dt) {
  envMix += (envTarget - envMix) * Math.min(1, dt * 1.4);
  if (Math.abs(envTarget - envMix) < 0.001) envMix = envTarget;
  sun.color.copy(dayState.sun).lerp(duskState.sun, envMix);
  sun.intensity = THREE.MathUtils.lerp(dayState.sunIntensity, duskState.sunIntensity, envMix);
  tmpSunPos.copy(dayState.sunPos).lerp(duskState.sunPos, envMix);
  sun.position.copy(tmpSunPos);
  sun.target.position.set(0, 0, 0);
  hemi.color.copy(dayState.hemiSky).lerp(duskState.hemiSky, envMix);
  hemi.groundColor.copy(dayState.hemiGround).lerp(duskState.hemiGround, envMix);
  hemi.intensity = THREE.MathUtils.lerp(dayState.hemiIntensity, duskState.hemiIntensity, envMix);
  skyUniforms.topColor.value.copy(dayState.top).lerp(duskState.top, envMix);
  skyUniforms.horizonColor.value.copy(dayState.horizon).lerp(duskState.horizon, envMix);
  skyUniforms.bottomColor.value.copy(dayState.bottom).lerp(duskState.bottom, envMix);
  skyUniforms.sunColor.value.copy(sun.color);
  skyUniforms.sunDir.value.copy(tmpSunPos).normalize();
  scene.fog.color.copy(dayState.fog).lerp(duskState.fog, envMix);
  renderer.toneMappingExposure = THREE.MathUtils.lerp(dayState.exposure, duskState.exposure, envMix);
  if (waterMaterial && waterMaterial.uniforms) {
    const u = waterMaterial.uniforms;
    if (u.uSun) u.uSun.value.copy(sun.color);
    if (u.uSunDir) u.uSunDir.value.copy(tmpSunPos).normalize();
    if (u.uDeep) u.uDeep.value.copy(dayState.waterDeep).lerp(duskState.waterDeep, envMix);
    if (u.uSky) u.uSky.value.copy(dayState.waterSky).lerp(duskState.waterSky, envMix);
    if (u.uShallow) u.uShallow.value.copy(dayState.waterShallow).lerp(duskState.waterShallow, envMix);
    if (u.fogColor) u.fogColor.value.copy(scene.fog.color);
    if (u.fogNear) u.fogNear.value = scene.fog.near;
    if (u.fogFar) u.fogFar.value = scene.fog.far;
  }
}

function animate() {
  const rawDt = clock.getDelta();
  const dt = Math.min(rawDt, 0.05);
  const time = clock.elapsedTime;
  updateEnvironment(Math.min(rawDt, 0.2));
  if (tour.active) {
    tour.t += rawDt / tour.duration;
    const t = Math.min(1, tour.t);
    const ease = 1 - Math.pow(1 - t, 3);
    camera.position.lerpVectors(tour.fromP, tour.toP, ease);
    controls.target.lerpVectors(tour.fromT, tour.toT, ease);
    if (t >= 1) tour.active = false;
  }
  if (overlayLife) overlayLife.update(time, envMix);
  if (fp.isActive()) fp.update(dt);
  else controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

const interactions = initInteractions({
  views: views,
  notes: notes,
  camera,
  controls,
  renderer,
  scene,
  canvas,
  fp,
  travelTo,
  setCaption,
});
window.__interactions = interactions;

updateEnvironment(1);
animate();

const loader = document.getElementById('loader');
requestAnimationFrame(() => {
  loader.classList.add('hidden');
  loader.style.pointerEvents = 'none';
  document.body.classList.add('ready');
  setTimeout(() => {
    loader.style.display = 'none';
  }, 1500);
});
