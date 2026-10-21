import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildSayramScene } from './layout.js';
import { buildSayramOverlay } from './sayram.js';
import { createWaterReflection } from './sayramTerrain.js';
import { createFirstPerson } from './firstperson.js';
import { initInteractions } from '../../shared/interactions.js';

const isCompact = window.innerWidth < 820 || /Mobi|Android/i.test(navigator.userAgent);
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, isCompact ? 1.35 : 1.7));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.shadowMap.autoUpdate = false;
renderer.shadowMap.needsUpdate = true;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xcfe1ee, 520, 4300);

const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.5, 6500);
camera.position.set(0, 170, 540);
camera.layers.enable(1);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 35, -200);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 8;
controls.maxDistance = 1600;
controls.maxPolarAngle = Math.PI * 0.492;
controls.autoRotateSpeed = 0.18;
controls.update();

const skyUniforms = {
  topColor: { value: new THREE.Color(0x1c5d9e) },
  horizonColor: { value: new THREE.Color(0xc6e4f2) },
  bottomColor: { value: new THREE.Color(0xa9cee0) },
  sunDir: { value: new THREE.Vector3(-0.35, 0.58, -0.74).normalize() },
  sunColor: { value: new THREE.Color(0xfff4dc) },
};
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(5000, 56, 32),
  new THREE.ShaderMaterial({
    uniforms: skyUniforms,
    side: THREE.BackSide,
    depthWrite: false,
    toneMapped: false,
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
        vec3 col = mix(bottomColor, horizonColor, smoothstep(-0.2, 0.07, h));
        col = mix(col, topColor, smoothstep(0.01, 0.34, h));
        float sd = max(dot(dir, normalize(sunDir)), 0.0);
        col += sunColor * pow(sd, 1200.0) * 2.2;
        col += sunColor * pow(sd, 28.0) * 0.22;
        col += sunColor * pow(sd, 5.0) * 0.035;
        float haze = smoothstep(0.16, -0.02, h) * smoothstep(-0.3, -0.02, h);
        col = mix(col, horizonColor * 1.05, haze * 0.22);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  })
);
scene.add(sky);

const hemi = new THREE.HemisphereLight(0xdcecf5, 0x5e7250, 1.62);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xfff4e0, 2.65);
sun.position.set(-260, 380, -420);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -460;
sun.shadow.camera.right = 460;
sun.shadow.camera.top = 460;
sun.shadow.camera.bottom = -460;
sun.shadow.camera.near = 20;
sun.shadow.camera.far = 1250;
sun.shadow.bias = -0.00035;
sun.shadow.normalBias = 1.1;
scene.add(sun);
scene.add(sun.target);
sun.target.position.set(0, 0, -80);

const fill = new THREE.DirectionalLight(0x9fc4d8, 0.55);
fill.position.set(220, 120, 320);
scene.add(fill);
scene.add(new THREE.AmbientLight(0xa9bfb2, 0.34));

const world = buildSayramScene();
scene.add(world.group);
const overlay = buildSayramOverlay();
scene.add(overlay.group);
const waterMaterial = world.waterMaterial;

const reflection = createWaterReflection({
  renderer,
  scene,
  camera,
  waterMesh: world.waterMesh,
  waterMaterial,
});

const dayState = {
  sun: new THREE.Color(0xfff4e0),
  hemiSky: new THREE.Color(0xdcecf5),
  hemiGround: new THREE.Color(0x5e7250),
  top: new THREE.Color(0x1c5d9e),
  horizon: new THREE.Color(0xc6e4f2),
  bottom: new THREE.Color(0xa9cee0),
  fog: new THREE.Color(0xcfe1ee),
  waterDeep: new THREE.Color(0x062b55),
  waterMid: new THREE.Color(0x0a5f92),
  waterShallow: new THREE.Color(0x2aa5b8),
  waterSky: new THREE.Color(0xa9d8e9),
  sunPos: new THREE.Vector3(-260, 380, -420),
  sunIntensity: 2.65,
  hemiIntensity: 1.62,
  exposure: 1.08,
};

const duskState = {
  sun: new THREE.Color(0xff9a5e),
  hemiSky: new THREE.Color(0x6c86a8),
  hemiGround: new THREE.Color(0x4f4940),
  top: new THREE.Color(0x1c2d4f),
  horizon: new THREE.Color(0xffa769),
  bottom: new THREE.Color(0x8b6f66),
  fog: new THREE.Color(0xd6a681),
  waterDeep: new THREE.Color(0x0a2442),
  waterMid: new THREE.Color(0x1d4c6d),
  waterShallow: new THREE.Color(0x5b8f9b),
  waterSky: new THREE.Color(0xe0a47d),
  sunPos: new THREE.Vector3(-620, 72, -360),
  sunIntensity: 1.9,
  hemiIntensity: 0.9,
  exposure: 1.12,
};

let envTarget = 0;
let envMix = 0;

const tour = {
  active: false,
  t: 0,
  duration: 2.3,
  fromP: new THREE.Vector3(),
  fromT: new THREE.Vector3(),
  toP: new THREE.Vector3(),
  toT: new THREE.Vector3(),
};

const views = {
  overview: { p: [0, 170, 540], t: [0, 35, -200] },
  lake: { p: [270, 18, 250], t: [-80, 2, -100] },
  swans: { p: [-218, 6, 138], t: [-214, 1, 80] },
  meadow: { p: [22, 26, 342], t: [150, 3, 248] },
  dusk: { p: [352, 62, 330], t: [-160, 20, -210], night: true },
};

const notes = {
  overview: ['赛里木湖 · 全景', '天山雪峰环抱的高山冷水湖，深蓝湖面铺向天际，环湖公路与花海草甸层层展开'],
  lake: ['湖心 · 蓝宝石', '大西洋的暖湿气流止步于此，冰川融水汇成一汪澄澈深蓝，雪峰倒影沉入湖心'],
  swans: ['天鹅 · 浅湾', '疣鼻天鹅在西南浅湾缓缓游弋，白羽映着冷蓝水色，涟漪一圈圈散向木栈道'],
  meadow: ['花海 · 牧场', '金露梅、紫鸢尾与龙胆铺满湖岸，毡房炊烟升起，骏马在花海与公路之间漫步'],
  dusk: ['圣湖 · 日落', '夕阳越过天山脊线，湖面浮起金红光带，经幡与归鸟一同沉入蓝色暮光'],
};

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

function setEnvironment(mode) {
  envTarget = mode;
  const duskBtn = document.getElementById('btn-dusk');
  if (duskBtn) {
    duskBtn.classList.toggle('active', envTarget > 0.5);
    duskBtn.textContent = envTarget > 0.5 ? '日间' : '黄昏';
  }
}

function travelTo(view, key) {
  if (!view) return;
  if (fp.isActive()) fp.exit();
  tour.fromP.copy(camera.position);
  tour.fromT.copy(controls.target);
  tour.toP.set(...view.p);
  tour.toT.set(...view.t);
  tour.t = 0;
  tour.active = true;
  controls.autoRotate = false;
  const rotateBtn = document.getElementById('btn-rotate');
  if (rotateBtn) rotateBtn.classList.remove('active');
  setEnvironment(view.night ? 1 : 0);
}

const fp = createFirstPerson({
  camera,
  controls,
  renderer,
  canvas,
  onEnter: () => {
    tour.active = false;
    controls.autoRotate = false;
    document.getElementById('btn-rotate').classList.remove('active');
  },
});
window.__fp = fp;

document.querySelectorAll('[data-view]').forEach((btn) => {
  btn.addEventListener('click', () => {
    setCaption(btn.dataset.view);
    travelTo(views[btn.dataset.view], btn.dataset.view);
  });
});

const rotateBtn = document.getElementById('btn-rotate');
rotateBtn.addEventListener('click', () => {
  controls.autoRotate = !controls.autoRotate;
  rotateBtn.classList.toggle('active', controls.autoRotate);
});

document.getElementById('btn-dusk').addEventListener('click', () => {
  setEnvironment(envTarget > 0.5 ? 0 : 1);
});

controls.addEventListener('start', () => {
  tour.active = false;
});

const interactions = initInteractions({
  views,
  notes,
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

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  reflection.resize();
});

const clock = new THREE.Clock();
const tmpSunPos = new THREE.Vector3();
const tmpColor = new THREE.Color();

function updateEnvironment(dt) {
  envMix += (envTarget - envMix) * Math.min(1, dt * 1.35);
  if (Math.abs(envTarget - envMix) < 0.001) envMix = envTarget;

  sun.color.copy(dayState.sun).lerp(duskState.sun, envMix);
  sun.intensity = THREE.MathUtils.lerp(dayState.sunIntensity, duskState.sunIntensity, envMix);
  tmpSunPos.copy(dayState.sunPos).lerp(duskState.sunPos, envMix);
  sun.position.copy(tmpSunPos);
  sun.target.position.set(0, 0, -80);

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

  const u = waterMaterial.uniforms;
  u.uSun.value.copy(sun.color);
  u.uSunDir.value.copy(tmpSunPos).normalize();
  u.uDeep.value.copy(dayState.waterDeep).lerp(duskState.waterDeep, envMix);
  u.uMid.value.copy(dayState.waterMid).lerp(duskState.waterMid, envMix);
  u.uShallow.value.copy(dayState.waterShallow).lerp(duskState.waterShallow, envMix);
  u.uSky.value.copy(dayState.waterSky).lerp(duskState.waterSky, envMix);
  u.uFog.value.copy(scene.fog.color);

  if (world.windowMat) {
    world.windowMat.emissiveIntensity = THREE.MathUtils.lerp(0.15, 1.7, envMix);
  }
}

let frameNo = 0;

function animate() {
  const rawDt = clock.getDelta();
  frameNo++;
  const dt = Math.min(rawDt, 0.05);
  const time = clock.elapsedTime;

  updateEnvironment(Math.min(rawDt, 0.25));
  waterMaterial.uniforms.uTime.value = time;
  overlay.life.update(time, dt);

  if (!fp.isActive()) {
    if (tour.active) {
      tour.t += rawDt / tour.duration;
      const t = Math.min(1, tour.t);
      const ease = 1 - Math.pow(1 - t, 3);
      camera.position.lerpVectors(tour.fromP, tour.toP, ease);
      controls.target.lerpVectors(tour.fromT, tour.toT, ease);
      if (t >= 1) tour.active = false;
    }
    controls.update();
  } else {
    fp.update(dt);
  }

  if (envMix !== envTarget) renderer.shadowMap.needsUpdate = true;
  if (frameNo % 24 === 0) renderer.shadowMap.needsUpdate = true;
  reflection.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

updateEnvironment(1);
animate();

const loader = document.getElementById('loader');
function revealScene() {
  loader.classList.add('hidden');
  document.body.classList.add('ready');
  window.__ready = true;
}
requestAnimationFrame(() => requestAnimationFrame(revealScene));
setTimeout(revealScene, 900);

window.__sayram = {
  scene,
  camera,
  renderer,
  controls,
  world,
  overlay,
  reflection,
  views,
  notes,
  travelTo,
  setCaption,
  setEnvironment,
  updateEnvironment,
  fp,
  interactions,
  stats: () => ({
    calls: renderer.info.render.calls,
    triangles: renderer.info.render.triangles,
    points: renderer.info.render.points,
    lines: renderer.info.render.lines,
    geometries: renderer.info.memory.geometries,
    textures: renderer.info.memory.textures,
  }),
  getState: () => ({
    ready: !!window.__ready,
    envMix: +envMix.toFixed(3),
    camera: camera.position.toArray().map((v) => +v.toFixed(1)),
    target: controls.target.toArray().map((v) => +v.toFixed(1)),
    world: world.stats,
    overlay: overlay.stats,
  }),
};
