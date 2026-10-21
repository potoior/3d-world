import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildYuanyangScene } from './yuanyang.js';
import { createFirstPerson } from './firstperson.js';
import { updateFoliageSway } from './materials.js';
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
renderer.toneMappingExposure = 1.16;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xe2c3ab, 520, 2350);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.5, 4200);
camera.position.set(360, 250, 560);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, -50, -170);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.minDistance = 8;
controls.maxDistance = 1700;
controls.maxPolarAngle = Math.PI * 0.60;
controls.autoRotateSpeed = 0.2;
controls.update();

const skyUniforms = {
  topColor: { value: new THREE.Color(0x5d86b4) },
  horizonColor: { value: new THREE.Color(0xf2c6a6) },
  bottomColor: { value: new THREE.Color(0xcfc6b6) },
  sunDir: { value: new THREE.Vector3(0.82, 0.2, -0.12).normalize() },
  sunColor: { value: new THREE.Color(0xffd9a4) },
};
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(2600, 48, 28),
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
        vec3 col = mix(bottomColor, horizonColor, smoothstep(-0.18, 0.08, h));
        col = mix(col, topColor, smoothstep(0.02, 0.62, h));
        float sd = max(dot(dir, normalize(sunDir)), 0.0);
        col += sunColor * pow(sd, 900.0) * 2.2;
        col += sunColor * pow(sd, 12.0) * 0.24;
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  })
);
scene.add(sky);

const hemi = new THREE.HemisphereLight(0xf2dfd0, 0x5d5a43, 1.6);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xffd2a0, 2.15);
sun.position.set(520, 140, -90);
sun.castShadow = true;
sun.shadow.mapSize.set(isCompact ? 2048 : 4096, isCompact ? 2048 : 4096);
sun.shadow.camera.left = -430;
sun.shadow.camera.right = 430;
sun.shadow.camera.top = 430;
sun.shadow.camera.bottom = -430;
sun.shadow.camera.near = 20;
sun.shadow.camera.far = 1600;
sun.shadow.bias = -0.00035;
sun.shadow.normalBias = 1.4;
scene.add(sun);
scene.add(sun.target);

const fill = new THREE.DirectionalLight(0xb8cdd4, 0.6);
fill.position.set(-260, 120, -240);
scene.add(fill);
scene.add(new THREE.AmbientLight(0xe4ddcc, 0.4));

const world = buildYuanyangScene();
scene.add(world.group);
const waterMaterial = world.waterMaterial;

window.__yuanyang = { scene, camera, renderer, controls, world };

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
window.__yuanyang.fp = fp;

const dayState = {
  sun: new THREE.Color(0xffd2a0),
  hemiSky: new THREE.Color(0xf2dfd0),
  hemiGround: new THREE.Color(0x5d5a43),
  top: new THREE.Color(0x5d86b4),
  horizon: new THREE.Color(0xf2c6a6),
  bottom: new THREE.Color(0xcfc6b6),
  fog: new THREE.Color(0xe2c3ab),
  waterDeep: new THREE.Color(0x23403f),
  waterShallow: new THREE.Color(0x4f7070),
  waterSky: new THREE.Color(0xaec8d8),
  waterRose: new THREE.Color(0xdd9a8e),
  waterGold: new THREE.Color(0xf7c27c),
  sunPos: new THREE.Vector3(520, 140, -90),
  sunIntensity: 2.15,
  hemiIntensity: 1.6,
  exposure: 1.16,
};

const duskState = {
  sun: new THREE.Color(0xff8750),
  hemiSky: new THREE.Color(0x7b819f),
  hemiGround: new THREE.Color(0x55483e),
  top: new THREE.Color(0x283954),
  horizon: new THREE.Color(0xf09a63),
  bottom: new THREE.Color(0x8f7463),
  fog: new THREE.Color(0xd59a74),
  waterDeep: new THREE.Color(0x1c2f33),
  waterShallow: new THREE.Color(0x3e5558),
  waterSky: new THREE.Color(0xd79a76),
  waterRose: new THREE.Color(0xc97f75),
  waterGold: new THREE.Color(0xf0a45c),
  sunPos: new THREE.Vector3(-240, 70, 260),
  sunIntensity: 1.55,
  hemiIntensity: 0.82,
  exposure: 1.12,
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
  overview: { p: [360, 250, 560], t: [0, -50, -170] },
  duoyishu: { p: [-36, 108, 46], t: [320, -64, -168] },
  bada: { p: [-58, 132, 36], t: [-410, -72, -226] },
  laohuzui: { p: [248, 126, 46], t: [278, -116, -582] },
  dusk: { p: [420, 205, 610], t: [0, -42, -180] },
};

function travelTo(view) {
  if (fp.isActive()) fp.exit();
  tour.fromP.copy(camera.position);
  tour.fromT.copy(controls.target);
  tour.toP.set(...view.p);
  tour.toT.set(...view.t);
  tour.t = 0;
  tour.active = true;
  controls.autoRotate = false;
  document.getElementById('btn-rotate').classList.remove('active');
}

const notes = {
  overview: ['元阳梯田 · 全景', '哈尼人用千年时光雕刻群山，多依树、坝达与老虎嘴的层层水田在天光下铺成镜面'],
  duoyishu: ['多依树 · 日出', '晨光越过山脊，灌满水的梯田收下粉、金、蓝三色天光，云海在脚下缓慢流动'],
  bada: ['坝达 · 万级梯田', '坝达的坡面如大地年轮层层跌落，村寨与森林守在坡顶，水田一直铺到云雾深处'],
  laohuzui: ['老虎嘴 · 悬崖梯田', '陡峭山嘴被哈尼人削成无数细密田埂，深谷云海翻涌，落日把水面染成琥珀色'],
  dusk: ['元阳 · 黄昏', '蘑菇房的炊烟升向晚霞，梯田收起最后一层金光，群山沉入安静的马蓝夜色'],
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
    const key = btn.dataset.view;
    const view = views[key];
    currentView = key;
    setCaption(key);
    setDusk(key === 'dusk');
    if (view) travelTo(view);
  });
});

const rotateBtn = document.getElementById('btn-rotate');
rotateBtn.addEventListener('click', () => {
  controls.autoRotate = !controls.autoRotate;
  rotateBtn.classList.toggle('active', controls.autoRotate);
});

const duskBtn = document.getElementById('btn-dusk');
function setDusk(on) {
  envTarget = on ? 1 : 0;
  duskBtn.classList.toggle('active', envTarget > 0.5);
}
duskBtn.addEventListener('click', () => setDusk(true));

window.__yuanyang.views = views;
window.__yuanyang.notes = notes;
window.__yuanyang.setView = (key) => {
  const view = views[key];
  if (!view) return false;
  currentView = key;
  setDusk(key === 'dusk');
  setCaption(key);
  travelTo(view);
  return true;
};
window.__yuanyang.toggleDusk = () => setDusk(envTarget < 0.5);
window.__yuanyang.setDusk = setDusk;
window.__yuanyang.getStats = () => ({
  calls: renderer.info.render.calls,
  triangles: renderer.info.render.triangles,
  geometries: renderer.info.memory.geometries,
  textures: renderer.info.memory.textures,
  envMix,
  clouds: world.cloudLayers ? world.cloudLayers.length : 0,
  smokeOrigins: world.smoke ? world.smoke.geometry.getAttribute('position').count : 0,
});
window.__yuanyang.getState = () => ({
  view: currentView,
  dusk: envTarget > 0.5,
  fp: fp.isActive(),
  loaderHidden: document.getElementById('loader').classList.contains('hidden'),
  ready: !!window.__ready,
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
  sun.target.position.set(0, -40, -200);

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
    u.uSun.value.copy(sun.color);
    u.uSunDir.value.copy(tmpSunPos).normalize();
    u.uDeep.value.copy(dayState.waterDeep).lerp(duskState.waterDeep, envMix);
    u.uShallow.value.copy(dayState.waterShallow).lerp(duskState.waterShallow, envMix);
    u.uSky.value.copy(dayState.waterSky).lerp(duskState.waterSky, envMix);
    u.uRose.value.copy(dayState.waterRose).lerp(duskState.waterRose, envMix);
    u.uGold.value.copy(dayState.waterGold).lerp(duskState.waterGold, envMix);
  }
}

let currentView = 'overview';

function animate() {
  const rawDt = clock.getDelta();
  const dt = Math.min(rawDt, 0.05);
  const time = clock.elapsedTime;

  updateEnvironment(Math.min(rawDt, 0.2));
  updateFoliageSway(time);
  if (waterMaterial && waterMaterial.uniforms) waterMaterial.uniforms.uTime.value = time;
  if (world.life) world.life.update(time, dt);

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
  document.body.classList.add('ready');
  window.__ready = true;
});
