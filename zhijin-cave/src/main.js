import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildZhijinScene, caveFloorHeight, caveWaterDepth, insideCave } from './scene.js';
import { buildZhijinOverlay } from './zhijin.js';
import { createFirstPerson } from './firstperson.js';
import { initInteractions } from '../../shared/interactions.js';

const isCompact = window.innerWidth < 820 || /Mobi|Android/i.test(navigator.userAgent);
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, isCompact ? 1.4 : 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.16;
renderer.shadowMap.enabled = false;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x081315);
scene.fog = new THREE.Fog(0x0b1c1f, 85, 520);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1600);
camera.position.set(34, 27, 100);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(-4, 22, -20);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.minDistance = 7;
controls.maxDistance = 260;
controls.maxPolarAngle = Math.PI * 0.62;
controls.autoRotateSpeed = 0.2;
controls.update();

const hemi = new THREE.HemisphereLight(0x8faeb0, 0x34261a, 0.66);
scene.add(hemi);
const ambient = new THREE.AmbientLight(0x4a6266, 0.72);
scene.add(ambient);
const fill = new THREE.DirectionalLight(0xc4dcda, 0.66);
fill.position.set(60, 130, 90);
scene.add(fill);
const fillLow = new THREE.DirectionalLight(0x376d74, 0.44);
fillLow.position.set(-90, 20, -70);
scene.add(fillLow);

const world = buildZhijinScene();
scene.add(world.group);
scene.add(world.extras);
const overlay = buildZhijinOverlay();
scene.add(overlay.group);
scene.add(overlay.extras);
const waterMaterial = world.waterMaterial;

const views = {
  overview: { p: [34, 27, 100], t: [-4, 22, -20] },
  hall: { p: [0, 20, 66], t: [-2, 27, -36] },
  columns: { p: [26, 17, 18], t: [-8, 26, -30] },
  river: { p: [-14, 8, 50], t: [-32, 1, 4] },
  lights: { p: [38, 13, 54], t: [-6, 16, -30] },
};
const notes = {
  overview: [
    '织金洞 · 地下天宫',
    '贵州织金县官寨乡，洞腔层叠如城，石笋石柱擎天而立，暗河与彩灯在岩壁间流转。',
  ],
  hall: [
    '迎宾大厅',
    '万仞洞厅豁然开阔，穹顶高悬，石幔如瀑垂落，水汽在灯光里缓缓浮沉。',
  ],
  columns: [
    '擎天石柱',
    '石笋与石钟乳历经数十万年相接成柱，层层流石如凝固的瀑布，撑起整座洞厅。',
  ],
  river: [
    '地下暗河',
    '暗河沿洞底蜿蜒，水面映着青碧与暖金，滴水声在空腔里久久回荡。',
  ],
  lights: [
    '彩灯映石',
    '冷青、湖绿与暖金交织，勾勒出石笋的褶理与石幔的薄翼，洞中光影随之呼吸。',
  ],
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
const moodBtn = document.getElementById('btn-dusk');
moodBtn.addEventListener('click', () => {
  envTarget = envTarget > 0.5 ? 0 : 1;
  moodBtn.classList.toggle('active', envTarget > 0.5);
  moodBtn.textContent = envTarget > 0.5 ? '冷光' : '暖光';
});

const caveBlocked = (x, z) => !insideCave(x, z, 0.94) || caveWaterDepth(x, z) > -0.35;

const fp = createFirstPerson({
  camera,
  controls,
  canvas,
  groundAt: caveFloorHeight,
  blocked: caveBlocked,
  start: { x: 27, z: 130, yaw: 0.04, pitch: -0.03 },
  bounds: { minX: -104, maxX: 104, minZ: -145, maxZ: 145 },
  onEnter: () => {
    tour.active = false;
    controls.autoRotate = false;
    rotateBtn.classList.remove('active');
  },
});

window.__zhijin = {
  scene,
  camera,
  renderer,
  controls,
  world,
  overlay,
  fp,
  views,
  notes,
  env: () => ({ mix: envMix, target: envTarget, name: envTarget > 0.5 ? 'warm' : 'cool' }),
  getStats: () => ({
    calls: renderer.info.render.calls,
    triangles: renderer.info.render.triangles,
    geometries: renderer.info.memory.geometries,
    textures: renderer.info.memory.textures,
  }),
  getState: () => ({
    envMix,
    envTarget,
    view: controls.target.toArray(),
    camera: camera.position.toArray(),
    fp: fp.getPosition(),
  }),
};
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

const cool = {
  fog: new THREE.Color(0x0b1c1f),
  ambient: new THREE.Color(0x4a6266),
  hemiSky: new THREE.Color(0x8faeb0),
  hemiGround: new THREE.Color(0x34261a),
  waterDeep: new THREE.Color(0x0b2b30),
  waterShallow: new THREE.Color(0x28736b),
  waterGlow: new THREE.Color(0x86f2e4),
  waterMist: new THREE.Color(0x3d7276),
  exposure: 1.16,
};
const warm = {
  fog: new THREE.Color(0x1f1a13),
  ambient: new THREE.Color(0x6a5540),
  hemiSky: new THREE.Color(0xb09a7c),
  hemiGround: new THREE.Color(0x34261a),
  waterDeep: new THREE.Color(0x17231f),
  waterShallow: new THREE.Color(0x356156),
  waterGlow: new THREE.Color(0xb8f0ce),
  waterMist: new THREE.Color(0x5c6858),
  exposure: 1.06,
};
const clock = new THREE.Clock();
const tmpColor = new THREE.Color();

function updateEnvironment(dt) {
  envMix += (envTarget - envMix) * Math.min(1, dt * 1.3);
  if (Math.abs(envTarget - envMix) < 0.001) envMix = envTarget;
  tmpColor.copy(cool.fog).lerp(warm.fog, envMix);
  scene.fog.color.copy(tmpColor);
  scene.background.copy(tmpColor);
  ambient.color.copy(cool.ambient).lerp(warm.ambient, envMix);
  hemi.color.copy(cool.hemiSky).lerp(warm.hemiSky, envMix);
  hemi.groundColor.copy(cool.hemiGround).lerp(warm.hemiGround, envMix);
  renderer.toneMappingExposure = THREE.MathUtils.lerp(cool.exposure, warm.exposure, envMix);
  waterMaterial.uniforms.uDeep.value.copy(cool.waterDeep).lerp(warm.waterDeep, envMix);
  waterMaterial.uniforms.uShallow.value.copy(cool.waterShallow).lerp(warm.waterShallow, envMix);
  waterMaterial.uniforms.uGlow.value.copy(cool.waterGlow).lerp(warm.waterGlow, envMix);
  waterMaterial.uniforms.uMist.value.copy(cool.waterMist).lerp(warm.waterMist, envMix);
  waterMaterial.uniforms.fogColor.value.copy(tmpColor);
  waterMaterial.uniforms.fogNear.value = scene.fog.near;
  waterMaterial.uniforms.fogFar.value = scene.fog.far;
}

function animate() {
  const rawDt = clock.getDelta();
  const dt = Math.min(rawDt, 0.05);
  const time = clock.elapsedTime;
  updateEnvironment(Math.min(rawDt, 0.2));
  waterMaterial.uniforms.uTime.value = time;
  if (tour.active) {
    tour.t += rawDt / tour.duration;
    const t = Math.min(1, tour.t);
    const ease = 1 - Math.pow(1 - t, 3);
    camera.position.lerpVectors(tour.fromP, tour.toP, ease);
    controls.target.lerpVectors(tour.fromT, tour.toT, ease);
    if (t >= 1) tour.active = false;
  }
  overlay.life.update(time, dt);
  world.mist.rotation.y = Math.sin(time * 0.012) * 0.13;
  world.mist.position.y = Math.sin(time * 0.18) * 0.7;
  if (fp.isActive()) fp.update(dt);
  else controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

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

updateEnvironment(1);
animate();

const loader = document.getElementById('loader');
loader.classList.add('hidden');
loader.style.pointerEvents = 'none';
loader.style.opacity = '0';
loader.style.visibility = 'hidden';
loader.style.display = 'none';
document.body.classList.add('ready');
