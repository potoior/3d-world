import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildKashgarScene } from './layout.js';
import { buildKashgarOverlay } from './kashgar.js';
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
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xd6bc95, 280, 1700);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.5, 3200);
camera.position.set(182, 108, 188);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(-8, 8, -6);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.minDistance = 8;
controls.maxDistance = 1000;
controls.maxPolarAngle = Math.PI * 0.60;
controls.autoRotateSpeed = 0.22;
controls.update();

const skyUniforms = {
  topColor: { value: new THREE.Color(0x7299bd) },
  horizonColor: { value: new THREE.Color(0xefd5ae) },
  bottomColor: { value: new THREE.Color(0xd4ad7c) },
  sunDir: { value: new THREE.Vector3(0.45, 0.64, 0.4).normalize() },
  sunColor: { value: new THREE.Color(0xffe4b5) },
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
        col += sunColor * pow(sd, 800.0) * 1.6;
        col += sunColor * pow(sd, 14.0) * 0.18;
        col += vec3(0.12, 0.055, 0.015) * pow(max(0.0, 1.0 - abs(h) * 5.0), 5.0);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  })
);
scene.add(sky);

const hemi = new THREE.HemisphereLight(0xf4e2c8, 0x8c6b49, 1.55);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xffe2b5, 2.6);
sun.position.set(180, 220, 120);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -260;
sun.shadow.camera.right = 260;
sun.shadow.camera.top = 260;
sun.shadow.camera.bottom = -260;
sun.shadow.camera.near = 20;
sun.shadow.camera.far = 950;
sun.shadow.bias = -0.00035;
sun.shadow.normalBias = 1.2;
scene.add(sun);
scene.add(sun.target);

const fill = new THREE.DirectionalLight(0xa8bdd0, 0.5);
fill.position.set(-140, 100, -160);
scene.add(fill);
scene.add(new THREE.AmbientLight(0xd9c3a4, 0.32));

const world = buildKashgarScene();
scene.add(world.group);
const overlay = buildKashgarOverlay();
scene.add(overlay.group);

for (const b of overlay.colliders.boxes) world.colliders.boxes.push(b);
for (const c of overlay.colliders.circles) world.colliders.circles.push(c);
for (const n of overlay.colliders.names) world.colliders.names.push(n);

window.__kashgar = { scene, camera, renderer, controls, world, overlay };
window.__kashgar.stats = () => ({
  calls: renderer.info.render.calls,
  triangles: renderer.info.render.triangles,
  points: renderer.info.render.points,
  geometries: renderer.info.memory.geometries,
  textures: renderer.info.memory.textures,
  programs: renderer.info.programs ? renderer.info.programs.length : 0,
});

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
window.__kashgar.fp = fp;

const dayState = {
  sun: new THREE.Color(0xffe2b5),
  hemiSky: new THREE.Color(0xf4e2c8),
  hemiGround: new THREE.Color(0x8c6b49),
  top: new THREE.Color(0x7299bd),
  horizon: new THREE.Color(0xefd5ae),
  bottom: new THREE.Color(0xd4ad7c),
  fog: new THREE.Color(0xd6bc95),
  sunPos: new THREE.Vector3(180, 220, 120),
  sunIntensity: 2.6,
  hemiIntensity: 1.55,
  exposure: 1.07,
};

const duskState = {
  sun: new THREE.Color(0xff8a4d),
  hemiSky: new THREE.Color(0x8f8fa5),
  hemiGround: new THREE.Color(0x6b4a36),
  top: new THREE.Color(0x2c3c60),
  horizon: new THREE.Color(0xf39a5f),
  bottom: new THREE.Color(0x9b7356),
  fog: new THREE.Color(0xcf9c77),
  sunPos: new THREE.Vector3(-200, 70, 170),
  sunIntensity: 1.75,
  hemiIntensity: 0.92,
  exposure: 1.14,
};

let envTarget = 0;
let envMix = 0;

const tour = {
  active: false,
  t: 0,
  duration: 2.2,
  fromP: new THREE.Vector3(),
  fromT: new THREE.Vector3(),
  toP: new THREE.Vector3(),
  toT: new THREE.Vector3(),
};

const views = {
  overview: { p: [182, 108, 188], t: [-8, 8, -6] },
  mosque: { p: [8, 26, 58], t: [-46, 15, -40] },
  gaotai: { p: [124, 30, 22], t: [73, 12, -44] },
  bazaar: { p: [0, 12, 122], t: [0, 5, 56] },
  dusk: { p: [148, 44, 164], t: [-10, 8, 4] },
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
  overview: ['喀什古城 · 全景', '土黄色的生土街巷、清真寺穹顶与巴扎烟火，在帕米尔高原的日光下层层铺展'],
  mosque: ['艾提尕尔清真寺', '喀什的精神地标，绿色穹顶与两座高耸的宣礼塔守望着老城，拱门层层向庭院深处展开'],
  gaotai: ['高台民居', '生土房屋沿高台层层叠叠，木廊、土墙与窄窗错落，是丝路老城最倔强的天际线'],
  bazaar: ['巴扎老街', '花帽、地毯与香料沿街铺陈，拱门下的吆喝声和铜器敲击声混成老城最鲜活的脉搏'],
  dusk: ['古城暮色', '夕阳把土墙染成蜜色，茶馆的炊烟升起，驼队踏着余晖慢悠悠穿过街巷'],
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

const duskBtn = document.getElementById('btn-dusk');

function setDusk(on) {
  envTarget = on ? 1 : 0;
  duskBtn.classList.toggle('active', envTarget > 0.5);
  duskBtn.textContent = envTarget > 0.5 ? '日间' : '黄昏';
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

duskBtn.addEventListener('click', () => setDusk(envTarget <= 0.5));

window.__kashgar.views = views;
window.__kashgar.notes = notes;
window.__kashgar.setView = (key) => {
  const view = views[key];
  if (!view) return false;
  setCaption(key);
  if (key === 'dusk') setDusk(true);
  travelTo(view);
  return true;
};
window.__kashgar.toggleDusk = () => duskBtn.click();
window.__kashgar.getStats = () => ({
  calls: renderer.info.render.calls,
  triangles: renderer.info.render.triangles,
  points: renderer.info.render.points,
  geometries: renderer.info.memory.geometries,
  textures: renderer.info.memory.textures,
  envMix,
  flags: overlay.stats.flags,
  smoke: overlay.stats.smoke,
  camels: overlay.stats.camels,
  minarets: overlay.stats.minarets,
  domes: overlay.stats.domes,
  viewKeys: Object.keys(views),
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

  if (world.lanternMaterial) world.lanternMaterial.emissiveIntensity = THREE.MathUtils.lerp(0.6, 1.7, envMix);
  if (world.glowMaterial) world.glowMaterial.opacity = THREE.MathUtils.lerp(0.025, 0.54, envMix);
}

function animate() {
  const rawDt = clock.getDelta();
  const dt = Math.min(rawDt, 0.05);
  const time = clock.elapsedTime;

  updateEnvironment(Math.min(rawDt, 0.2));
  updateFoliageSway(time);
  if (world.life) world.life.update(time, dt);
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
  loader.style.transition = 'none';
  loader.style.opacity = '0';
  loader.style.visibility = 'hidden';
  document.body.classList.add('ready');
  window.__ready = true;
});
