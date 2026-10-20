import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildHongcunScene } from './layout.js';
import { buildWuyuanOverlay } from './wuyuan.js';
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
renderer.toneMappingExposure = 1.13;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xd9e2da, 230, 1750);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.5, 3000);
camera.position.set(150, 92, 168);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(-8, 6, -20);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.minDistance = 8;
controls.maxDistance = 900;
controls.maxPolarAngle = Math.PI * 0.60;
controls.autoRotateSpeed = 0.22;
controls.update();

const skyUniforms = {
  topColor: { value: new THREE.Color(0x7da4c4) },
  horizonColor: { value: new THREE.Color(0xe9eee8) },
  bottomColor: { value: new THREE.Color(0xd3ddd6) },
  sunDir: { value: new THREE.Vector3(0.45, 0.72, -0.3).normalize() },
  sunColor: { value: new THREE.Color(0xfff2d4) },
};
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(1800, 48, 28),
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
        col += sunColor * pow(sd, 800.0) * 1.5;
        col += sunColor * pow(sd, 14.0) * 0.16;
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  })
);
scene.add(sky);

const hemi = new THREE.HemisphereLight(0xe2edf1, 0x7e8f6e, 1.85);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xfff3df, 2.2);
sun.position.set(140, 180, -80);
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

const fill = new THREE.DirectionalLight(0xb6ced8, 0.65);
fill.position.set(-120, 90, -140);
scene.add(fill);
scene.add(new THREE.AmbientLight(0xdde7da, 0.42));

const world = buildHongcunScene();
scene.add(world.group);
const wuyuanOverlay = buildWuyuanOverlay();
scene.add(wuyuanOverlay.group);
const waterMaterial = world.waterMaterial;

window.__wuyuan = { scene, camera, renderer, controls, world };

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
window.__wuyuan.fp = fp;

const dayState = {
  sun: new THREE.Color(0xfff2dc),
  hemiSky: new THREE.Color(0xe4eef0),
  hemiGround: new THREE.Color(0x7b876c),
  top: new THREE.Color(0x719fc6),
  horizon: new THREE.Color(0xe6ece5),
  bottom: new THREE.Color(0xd2ddd5),
  fog: new THREE.Color(0xd9e2da),
  waterDeep: new THREE.Color(0x23514e),
  waterSky: new THREE.Color(0xb9d3d2),
  sunPos: new THREE.Vector3(130, 190, -90),
  sunIntensity: 2.35,
  hemiIntensity: 1.9,
  exposure: 1.12,
};

const duskState = {
  sun: new THREE.Color(0xff9b60),
  hemiSky: new THREE.Color(0x879ab8),
  hemiGround: new THREE.Color(0x685c4d),
  top: new THREE.Color(0x2e3f60),
  horizon: new THREE.Color(0xefa66e),
  bottom: new THREE.Color(0x8f7664),
  fog: new THREE.Color(0xd2a483),
  waterDeep: new THREE.Color(0x213b3a),
  waterSky: new THREE.Color(0xd9a87c),
  sunPos: new THREE.Vector3(-210, 74, 215),
  sunIntensity: 1.75,
  hemiIntensity: 0.92,
  exposure: 1.15,
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
  overview: { p: [120, 85, 160], t: [-4, 6, -30] },
  huangling: { p: [60, 18, 70], t: [10, 8, -40] },
  likeng: { p: [-30, 14, 80], t: [-60, 5, 10] },
  rainbowbridge: { p: [60, 12, -40], t: [20, 4, -90] },
  dusk: { p: [100, 28, 140], t: [-6, 6, -20] },
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
  overview: ['婺源 · 全景', '白墙黛瓦的徽州村落散落在山谷，油菜花田、溪流与古樟围出中国最美乡村'],
  huangling: ['篁岭晒秋', '山居人家在晒架上铺开红辣椒、黄菊与稻谷，层层屋顶与秋色相叠'],
  likeng: ['李坑', '溪水穿村，石桥与木亭相连，徽派民居沿水而筑，鸭群在浅水中游过'],
  rainbowbridge: ['彩虹桥', '宋代廊桥横跨溪面，木构廊屋与石墩错落，桥下流水映着青山'],
  dusk: ['婺源黄昏', '暮色落向马头墙，炊烟与花田渐暗，溪面收进最后一层天光'],
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

window.__wuyuan.views = views;
window.__wuyuan.setView = (key) => {
  const view = views[key];
  if (!view) return false;
  if (key === 'dusk') setDusk(true);
  setCaption(key);
  travelTo(view);
  return true;
};
window.__wuyuan.toggleDusk = () => setDusk(envTarget < 0.5);
window.__wuyuan.setDusk = setDusk;
window.__wuyuan.getStats = () => ({
  calls: renderer.info.render.calls,
  triangles: renderer.info.render.triangles,
  geometries: renderer.info.memory.geometries,
  textures: renderer.info.memory.textures,
  envMix,
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
const tmpColor = new THREE.Color();
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
  waterMaterial.uniforms.uSky.value.copy(dayState.waterSky).lerp(duskState.waterSky, envMix);
  if (world.lanternMaterial) world.lanternMaterial.emissiveIntensity = THREE.MathUtils.lerp(0.55, 1.55, envMix);
  if (world.glowMaterial) world.glowMaterial.opacity = THREE.MathUtils.lerp(0.025, 0.52, envMix);
}

function animate() {
  const rawDt = clock.getDelta();
  const dt = Math.min(rawDt, 0.05);
  const time = clock.elapsedTime;

  updateEnvironment(Math.min(rawDt, 0.2));
  waterMaterial.uniforms.uTime.value = time;
  updateFoliageSway(time);
  if (world.life) world.life.update(time, dt);
  if (wuyuanOverlay) wuyuanOverlay.life.update(time);

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
