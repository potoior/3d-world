import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildGuilinScene } from './scene.js';
import { buildDujiangyanOverlay } from './dujiangyan.js';
import { buildYellowCraneOverlay } from './yellowcrane.js';
import { createFirstPerson } from './firstperson.js';
import { updateRafts } from './life.js';
import { initInteractions } from '../../shared/interactions.js';

const isCompact = window.innerWidth < 820 || /Mobi|Android/i.test(navigator.userAgent);
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, isCompact ? 1.4 : 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.04;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xc9d8d2, 620, 2750);

const camera = new THREE.PerspectiveCamera(54, window.innerWidth / window.innerHeight, 1, 6200);
camera.position.set(60, 50, 700);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(85, 15, 240);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.minDistance = 12;
controls.maxDistance = 2100;
controls.maxPolarAngle = Math.PI * 0.492;
controls.autoRotateSpeed = 0.22;
controls.update();

const skyUniforms = {
  topColor: { value: new THREE.Color(0x7fa3ad) },
  horizonColor: { value: new THREE.Color(0xdbe5df) },
  bottomColor: { value: new THREE.Color(0xb9cbc5) },
  sunDir: { value: new THREE.Vector3(0.5, 0.65, 0.4).normalize() },
  sunColor: { value: new THREE.Color(0xfff2d4) },
};
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(5200, 48, 28),
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

const hemi = new THREE.HemisphereLight(0xd8e6df, 0x6f8060, 1.45);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff1d6, 2.4);
sun.position.set(380, 900, 620);
sun.castShadow = true;
sun.shadow.mapSize.set(isCompact ? 1536 : 2048, isCompact ? 1536 : 2048);
sun.shadow.camera.left = -700;
sun.shadow.camera.right = 700;
sun.shadow.camera.top = 620;
sun.shadow.camera.bottom = -620;
sun.shadow.camera.near = 30;
sun.shadow.camera.far = 2200;
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 1.6;
scene.add(sun);
scene.add(sun.target);
const fill = new THREE.DirectionalLight(0xb8d0d0, 0.62);
fill.position.set(-520, 280, 340);
scene.add(fill);
const ambient = new THREE.AmbientLight(0xd9e6df, 0.32);
scene.add(ambient);

const world = buildGuilinScene();
scene.add(world.group);
scene.add(world.extras);
const overlay = buildDujiangyanOverlay();
scene.add(overlay.group);
const overlayLife = overlay.life;
scene.add(buildYellowCraneOverlay());
const waterMaterial = world.waterMaterial;

let fp = null;
const dayState = {
  sun: new THREE.Color(0xfff1da),
  hemiSky: new THREE.Color(0xd7e6ea),
  hemiGround: new THREE.Color(0x6f8060),
  top: new THREE.Color(0x7fa3ad),
  horizon: new THREE.Color(0xdbe5df),
  bottom: new THREE.Color(0xb9cbc5),
  fog: new THREE.Color(0xc9d8d2),
  waterDeep: new THREE.Color(0x245b4b),
  waterShallow: new THREE.Color(0x5d9675),
  waterSky: new THREE.Color(0xb9d2cb),
  waterTop: new THREE.Color(0x8eb7b5),
  waterHorizon: new THREE.Color(0xd2ded4),
  sunPos: new THREE.Vector3(420, 900, 620),
  sunIntensity: 2.4,
  hemiIntensity: 1.45,
  exposure: 1.04,
};
const duskState = {
  sun: new THREE.Color(0xff9a58),
  hemiSky: new THREE.Color(0x92a4bd),
  hemiGround: new THREE.Color(0x6d5b48),
  top: new THREE.Color(0x2e4a6d),
  horizon: new THREE.Color(0xeaa06d),
  bottom: new THREE.Color(0x81655b),
  fog: new THREE.Color(0xbd9079),
  waterDeep: new THREE.Color(0x1b333b),
  waterShallow: new THREE.Color(0x3f5f57),
  waterSky: new THREE.Color(0xc58f74),
  waterTop: new THREE.Color(0x3b5c7b),
  waterHorizon: new THREE.Color(0xe5a374),
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
  overview: { p: [250, 110, 280], t: [50, 24, 30] },
  tower: { p: [-20, 40, 190], t: [-78, 36, 112] },
  river: { p: [180, 30, 300], t: [60, 4, 0] },
  poem: { p: [-120, 30, 190], t: [-80, 12, 120] },
  dusk: { p: [260, 78, 250], t: [50, 22, 30] },
};
const notes = {
  overview: ['黄鹤楼 · 全景', '蛇山临江，黄鹤楼五层飞檐立于山脊，长江与武汉三镇在脚下展开'],
  tower: ['黄鹤楼', '五层重檐攒尖顶，红柱黄瓦，层层回廊，登楼可望长江大桥与汉阳树'],
  river: ['长江', '大江东去，桥影横江，船队与江雾在宽阔水面往来'],
  poem: ['诗碑', '崔颢、李白题咏黄鹤楼的诗句刻于碑石，白云千载，江楼相望'],
  dusk: ['黄鹤楼黄昏', '夕照染红江面，楼檐灯火初上，蛇山与长江收进暮色'],
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
    controls.autoRotate = false;
    rotateBtn.classList.remove('active');
  },
});

window.__yellowcrane = { scene, camera, renderer, controls, world, fp, views, notes, env: () => ({ mix: envMix, target: envTarget }) };
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
const rafts = world.extras.userData.rafts;
const birds = world.extras.userData.birds;
const refineLife = world.extras.userData.refineLife;
const polishLife = world.extras.userData.polishLife;

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
  waterMaterial.uniforms.uTop.value.copy(dayState.waterTop).lerp(duskState.waterTop, envMix);
  waterMaterial.uniforms.uHorizon.value.copy(dayState.waterHorizon).lerp(duskState.waterHorizon, envMix);
  waterMaterial.uniforms.uShallow.value.copy(dayState.waterShallow).lerp(duskState.waterShallow, envMix);
  waterMaterial.uniforms.fogColor.value.copy(scene.fog.color);
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
  if (rafts) updateRafts(rafts, time);
  if (refineLife) refineLife.update(time);
  if (polishLife) polishLife.update(time);
  if (overlayLife) overlayLife.update(time);
  if (birds) {
    birds.rotation.y = Math.sin(time * 0.04) * 0.18;
    birds.position.y = Math.sin(time * 0.2) * 2.4;
  }
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
