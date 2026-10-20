import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildPotala } from './layout.js';
import { createFirstPerson } from './firstperson.js';
import { createAmbient } from './ambient.js';
import { createRefineAmbient } from './refine.js';
import { makeSkyMaterial } from './materials.js';
import { initInteractions } from '../../shared/interactions.js';

const isCompact = window.innerWidth < 820 || /Mobi|Android/i.test(navigator.userAgent);
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, isCompact ? 1.4 : 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xc9d7e2, 1550, 5800);

const camera = new THREE.PerspectiveCamera(44, window.innerWidth / window.innerHeight, 1, 9000);
camera.position.set(310, 108, 500);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 63, 5);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.minDistance = 45;
controls.maxDistance = 1800;
controls.maxPolarAngle = Math.PI * 0.492;
controls.autoRotateSpeed = 0.25;
controls.update();

const skyMaterial = makeSkyMaterial();
const sky = new THREE.Mesh(new THREE.SphereGeometry(5200, 48, 28), skyMaterial);
scene.add(sky);
const skyUniforms = skyMaterial.uniforms;

const hemi = new THREE.HemisphereLight(0xbdd6f2, 0x866b4c, 0.7);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xfff0d2, 3.35);
sun.position.set(430, 720, 520);
sun.castShadow = true;
sun.shadow.mapSize.set(isCompact ? 2048 : 4096, isCompact ? 2048 : 4096);
sun.shadow.camera.left = -620;
sun.shadow.camera.right = 620;
sun.shadow.camera.top = 620;
sun.shadow.camera.bottom = -620;
sun.shadow.camera.near = 40;
sun.shadow.camera.far = 2200;
sun.shadow.bias = -0.0003;
sun.shadow.normalBias = 1.6;
scene.add(sun);
scene.add(sun.target);

const fill = new THREE.DirectionalLight(0x7fa8dc, 0.3);
fill.position.set(-420, 280, -460);
scene.add(fill);

const world = buildPotala();
scene.add(world.group);
const ambient = createAmbient();
scene.add(ambient.group);
const refine = createRefineAmbient();
scene.add(refine.group);

let fp = null;

const dayState = {
  sun: new THREE.Color(0xfff0d2),
  hemiSky: new THREE.Color(0xc3dbf5),
  hemiGround: new THREE.Color(0x8b6f4f),
  top: new THREE.Color(0x0c4f9e),
  horizon: new THREE.Color(0xa9cdf0),
  bottom: new THREE.Color(0xd9cfb8),
  fog: new THREE.Color(0xc9d7e2),
  sunPos: new THREE.Vector3(430, 745, 520),
  sunIntensity: 3.35,
  hemiIntensity: 0.72,
  exposure: 1.1,
};

const duskState = {
  sun: new THREE.Color(0xff9a58),
  hemiSky: new THREE.Color(0x8c93b0),
  hemiGround: new THREE.Color(0x7b5c45),
  top: new THREE.Color(0x1d3158),
  horizon: new THREE.Color(0xf0a064),
  bottom: new THREE.Color(0x9d6c50),
  fog: new THREE.Color(0xbf9068),
  sunPos: new THREE.Vector3(760, 215, -300),
  sunIntensity: 2.05,
  hemiIntensity: 0.6,
  exposure: 1.04,
};

let envTarget = 0;
let envMix = 0;

const tour = {
  active: false,
  t: 0,
  duration: 1.9,
  fromP: new THREE.Vector3(),
  fromT: new THREE.Vector3(),
  toP: new THREE.Vector3(),
  toT: new THREE.Vector3(),
  fromF: 44,
  toF: 44,
};

const views = {
  overview: { p: [310, 108, 500], t: [0, 63, 5], fov: 44 },
  white: { p: [255, 94, 250], t: [96, 72, 32], fov: 47 },
  red: { p: [95, 108, 330], t: [-8, 90, 36], fov: 45 },
  gold: { p: [138, 150, 220], t: [-4, 118, 22], fov: 50 },
  courtyard: { p: [158, 61, 222], t: [122, 47, 138], fov: 54 },
};

function travelTo(view) {
  tour.fromP.copy(camera.position);
  tour.fromT.copy(controls.target);
  tour.toP.set(...view.p);
  tour.toT.set(...view.t);
  tour.fromF = camera.fov;
  tour.toF = view.fov || 45;
  tour.t = 0;
  tour.active = true;
  controls.autoRotate = false;
  document.getElementById('btn-rotate').classList.remove('active');
}

const notes = {
  overview: ['布达拉宫', '红山南麓，白宫与红宫依山层叠，主体高逾百米，十三层殿堂'],
  white: ['白宫', '东侧白宫为政务与居所，梯形窗、黑色窗套与白色石墙层层收分'],
  red: ['红宫', '中央红宫为灵塔与佛殿，深红宫墙承托金顶，是宫堡的视觉核心'],
  gold: ['金顶', '红宫之巅鎏金屋顶与宝瓶、胜利幢相望，日光下映照雪域'],
  courtyard: ['德阳厦', '白宫前的德阳厦广场，经曲折石阶而上，是旧时观戏与集会的庭院'],
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

document.querySelectorAll('[data-view]').forEach((btn) => {
  btn.addEventListener('click', () => {
    if (fp && fp.isActive()) fp.exit();
    const view = views[btn.dataset.view];
    setCaption(btn.dataset.view);
    if (view) travelTo(view);
  });
});

const rotateBtn = document.getElementById('btn-rotate');
rotateBtn.addEventListener('click', () => {
  controls.autoRotate = !controls.autoRotate;
  rotateBtn.classList.toggle('active', controls.autoRotate);
});

const duskBtn = document.getElementById('btn-dusk');
duskBtn.addEventListener('click', () => {
  envTarget = envTarget > 0.5 ? 0 : 1;
  duskBtn.classList.toggle('active', envTarget > 0.5);
  duskBtn.textContent = envTarget > 0.5 ? '日间' : '黄昏';
});

fp = createFirstPerson({
  camera,
  controls,
  canvas,
  onEnter: () => {
    tour.active = false;
  },
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
}

function animate() {
  const rawDt = clock.getDelta();
  const dt = Math.min(rawDt, 0.05);
  const time = clock.elapsedTime;
  updateEnvironment(Math.min(rawDt, 0.2));
  ambient.update(time);
  refine.update(time, envMix);
  if (tour.active) {
    tour.t += rawDt / tour.duration;
    const t = Math.min(1, tour.t);
    const ease = 1 - Math.pow(1 - t, 3);
    camera.position.lerpVectors(tour.fromP, tour.toP, ease);
    controls.target.lerpVectors(tour.fromT, tour.toT, ease);
    camera.fov = THREE.MathUtils.lerp(tour.fromF, tour.toF, ease);
    camera.updateProjectionMatrix();
    if (t >= 1) tour.active = false;
  }
  if (fp.isActive()) fp.update(dt);
  else controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

updateEnvironment(1);
animate();

window.__potala = {
  scene,
  camera,
  renderer,
  controls,
  world,
  ambient,
  refine,
  fp,
  tour,
  views,
  travelTo,
  setCaption,
  env: () => ({ mix: envMix, target: envTarget }),
  stats: () => ({
    calls: renderer.info.render.calls,
    triangles: renderer.info.render.triangles,
    geometries: renderer.info.memory.geometries,
    textures: renderer.info.memory.textures,
  }),
};

const loader = document.getElementById('loader');
requestAnimationFrame(() => {
  loader.classList.add('hidden');
  document.body.classList.add('ready');
});
