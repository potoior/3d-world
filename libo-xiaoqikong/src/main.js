import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildLiboScene } from './layout.js';
import { buildLiboOverlay } from './libo.js';
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
renderer.toneMappingExposure = 1.12;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xcfe4d6, 185, 1250);

const camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.5, 3200);
camera.position.set(175, 125, 255);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 8, 10);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 7;
controls.maxDistance = 760;
controls.maxPolarAngle = Math.PI * 0.595;
controls.autoRotateSpeed = 0.2;
controls.update();

const skyUniforms = {
  topColor: { value: new THREE.Color(0x5c9fbf) },
  horizonColor: { value: new THREE.Color(0xdff0e4) },
  bottomColor: { value: new THREE.Color(0xbcd8c9) },
  sunDir: { value: new THREE.Vector3(0.45, 0.72, -0.3).normalize() },
  sunColor: { value: new THREE.Color(0xfff2d4) },
};
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(1900, 48, 28),
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
        col += sunColor * pow(sd, 900.0) * 1.4;
        col += sunColor * pow(sd, 12.0) * 0.14;
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  })
);
scene.add(sky);

const hemi = new THREE.HemisphereLight(0xdff4ea, 0x5f7355, 1.8);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xfff0cf, 2.3);
sun.position.set(120, 178, -72);
sun.castShadow = true;
sun.shadow.mapSize.set(isCompact ? 2048 : 4096, isCompact ? 2048 : 4096);
sun.shadow.camera.left = -250;
sun.shadow.camera.right = 250;
sun.shadow.camera.top = 250;
sun.shadow.camera.bottom = -250;
sun.shadow.camera.near = 20;
sun.shadow.camera.far = 900;
sun.shadow.bias = -0.00035;
sun.shadow.normalBias = 1.2;
scene.add(sun);
scene.add(sun.target);

const fill = new THREE.DirectionalLight(0x9fe0cc, 0.7);
fill.position.set(-120, 80, -140);
scene.add(fill);
scene.add(new THREE.AmbientLight(0xd8eadc, 0.4));

const world = buildLiboScene();
scene.add(world.group);
const overlay = buildLiboOverlay(world);
scene.add(overlay.group);
const waterMaterial = world.waterMaterial;

window.__libo = { scene, camera, renderer, controls, world, overlay };

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
window.__libo.fp = fp;

const dayState = {
  sun: new THREE.Color(0xfff2dc),
  hemiSky: new THREE.Color(0xe4f2ea),
  hemiGround: new THREE.Color(0x63775a),
  top: new THREE.Color(0x5c9fbf),
  horizon: new THREE.Color(0xdff0e4),
  bottom: new THREE.Color(0xbcd8c9),
  fog: new THREE.Color(0xcfe4d6),
  waterDeep: new THREE.Color(0x0b4d42),
  waterShallow: new THREE.Color(0x2f8f72),
  waterSky: new THREE.Color(0x9bd2bd),
  sunPos: new THREE.Vector3(120, 178, -72),
  sunIntensity: 2.35,
  hemiIntensity: 1.85,
  exposure: 1.12,
};

const duskState = {
  sun: new THREE.Color(0xff9d63),
  hemiSky: new THREE.Color(0x8398af),
  hemiGround: new THREE.Color(0x5c5549),
  top: new THREE.Color(0x2c3d5c),
  horizon: new THREE.Color(0xeca26b),
  bottom: new THREE.Color(0x8e7461),
  fog: new THREE.Color(0xc99f82),
  waterDeep: new THREE.Color(0x153f3c),
  waterShallow: new THREE.Color(0x4f7661),
  waterSky: new THREE.Color(0xd6a176),
  sunPos: new THREE.Vector3(-208, 68, 208),
  sunIntensity: 1.8,
  hemiIntensity: 0.92,
  exposure: 1.16,
};

let envTarget = 0;
let envMix = 0;

const tour = {
  active: false,
  t: 0,
  duration: 2.25,
  fromP: new THREE.Vector3(),
  fromT: new THREE.Vector3(),
  toP: new THREE.Vector3(),
  toT: new THREE.Vector3(),
};

const views = {
  overview: { p: [175, 125, 255], t: [0, 8, 10] },
  xiaoqikong: { p: [15, 13, 69], t: [0, 3.4, 38] },
  'water-forest': { p: [7, 9, -18], t: [0, 1.5, -88] },
  wolong: { p: [50, 26, -166], t: [0, 3, -210] },
  dusk: { p: [128, 62, 205], t: [15, 6, 35] },
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
  overview: ['荔波小七孔 · 全景', '响水河穿过喀斯特峰丛，七孔古桥、涵碧潭与两岸森林铺开一片地球绿宝石'],
  xiaoqikong: ['小七孔古桥', '七孔石桥横跨涵碧潭，青石苔痕与翡翠水色相映，桥下流水终年碧透'],
  'water-forest': ['水上森林', '树木扎根于溪流石缝，清泉漫过盘根，人行栈道穿行于水与林之间'],
  wolong: ['卧龙潭', '峡谷深潭沉静如镜，弧形坝上水帘垂落，潭心收着一整片墨绿天光'],
  dusk: ['荔波黄昏', '暮色漫过峰丛与瑶寨，瀑布与水面收进最后一层暖光，山谷归于安静'],
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
    setCaption(key);
    if (key === 'dusk') setDusk(true);
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

window.__libo.views = views;
window.__libo.setView = (key) => {
  const view = views[key];
  if (!view) return false;
  if (key === 'dusk') setDusk(true);
  else setDusk(false);
  setCaption(key);
  travelTo(view);
  return true;
};
window.__libo.toggleDusk = () => setDusk(envTarget < 0.5);
window.__libo.setDusk = setDusk;
window.__libo.getStats = () => ({
  calls: renderer.info.render.calls,
  triangles: renderer.info.render.triangles,
  geometries: renderer.info.memory.geometries,
  textures: renderer.info.memory.textures,
  envMix,
});
window.__libo.getDebug = () => ({
  camera: camera.position.toArray().map((v) => +v.toFixed(1)),
  target: controls.target.toArray().map((v) => +v.toFixed(1)),
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

  waterMaterial.uniforms.uSun.value.copy(sun.color);
  waterMaterial.uniforms.uSunDir.value.copy(tmpSunPos).normalize();
  waterMaterial.uniforms.uDeep.value.copy(dayState.waterDeep).lerp(duskState.waterDeep, envMix);
  waterMaterial.uniforms.uShallow.value.copy(dayState.waterShallow).lerp(duskState.waterShallow, envMix);
  waterMaterial.uniforms.uSky.value.copy(dayState.waterSky).lerp(duskState.waterSky, envMix);
  overlay.life.setEnv(envMix);
}

function animate() {
  const rawDt = clock.getDelta();
  const dt = Math.min(rawDt, 0.05);
  const time = clock.elapsedTime;

  updateEnvironment(Math.min(rawDt, 0.2));
  updateFoliageSway(time);
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
requestAnimationFrame(() => {
  loader.classList.add('hidden');
  document.body.classList.add('ready');
  window.__ready = true;
});
