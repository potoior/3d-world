import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildXijiangScene } from './xijiang.js';
import { createFirstPerson } from './firstperson.js';
import { initInteractions } from '../../shared/interactions.js';

const isCompact = window.innerWidth < 820 || /Mobi|Android/i.test(navigator.userAgent);
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, isCompact ? 1.4 : 1.7));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.06;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xcbd6d2, 170, 1650);

const camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.5, 3200);
camera.position.set(150, 108, 265);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 22, -35);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.minDistance = 8;
controls.maxDistance = 950;
controls.maxPolarAngle = Math.PI * 0.60;
controls.autoRotateSpeed = 0.18;
controls.update();

const skyUniforms = {
  topColor: { value: new THREE.Color(0x6f9dba) },
  horizonColor: { value: new THREE.Color(0xe5ebe3) },
  bottomColor: { value: new THREE.Color(0xccd8d0) },
  sunDir: { value: new THREE.Vector3(0.45, 0.72, -0.3).normalize() },
  sunColor: { value: new THREE.Color(0xfff2d4) },
};
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(2100, 48, 28),
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
        col += sunColor * pow(sd, 800.0) * 1.4;
        col += sunColor * pow(sd, 14.0) * 0.15;
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  })
);
scene.add(sky);

const hemi = new THREE.HemisphereLight(0xe2edf1, 0x77826a, 1.75);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0d8, 2.1);
sun.position.set(150, 190, -110);
sun.castShadow = true;
sun.shadow.mapSize.set(isCompact ? 1024 : 2048, isCompact ? 1024 : 2048);
sun.shadow.camera.left = -270;
sun.shadow.camera.right = 270;
sun.shadow.camera.top = 270;
sun.shadow.camera.bottom = -270;
sun.shadow.camera.near = 20;
sun.shadow.camera.far = 950;
sun.shadow.bias = -0.00035;
sun.shadow.normalBias = 1.2;
scene.add(sun);
scene.add(sun.target);
const fill = new THREE.DirectionalLight(0xb6ced8, 0.6);
fill.position.set(-120, 90, -140);
scene.add(fill);
scene.add(new THREE.AmbientLight(0xdde7da, 0.4));

const world = buildXijiangScene();
scene.add(world.group);
const waterMaterial = world.waterMaterial;

window.__xijiang = { scene, camera, renderer, controls, world, houseCount: world.spots.length };

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
window.__xijiang.fp = fp;

const dayState = {
  sun: new THREE.Color(0xfff0d8),
  hemiSky: new THREE.Color(0xe4eef0),
  hemiGround: new THREE.Color(0x77826a),
  top: new THREE.Color(0x6f9dba),
  horizon: new THREE.Color(0xe5ebe3),
  bottom: new THREE.Color(0xccd8d0),
  fog: new THREE.Color(0xcbd6d2),
  sunPos: new THREE.Vector3(150, 190, -110),
  sunIntensity: 2.1,
  hemiIntensity: 1.75,
  exposure: 1.06,
};

const duskState = {
  sun: new THREE.Color(0xff9256),
  hemiSky: new THREE.Color(0x8496b0),
  hemiGround: new THREE.Color(0x62564a),
  top: new THREE.Color(0x26354f),
  horizon: new THREE.Color(0xf0a06a),
  bottom: new THREE.Color(0x7c6b62),
  fog: new THREE.Color(0xbea58c),
  sunPos: new THREE.Vector3(-200, 65, 190),
  sunIntensity: 1.45,
  hemiIntensity: 0.82,
  exposure: 1.12,
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
  overview: { p: [150, 108, 265], t: [0, 22, -35] },
  village: { p: [72, 34, 128], t: [20, 18, 15] },
  'wind-rain-bridge': { p: [46, 19, 35], t: [-4, 10, -28] },
  terraces: { p: [82, 72, -118], t: [245, 78, -230] },
  dusk: { p: [82, 42, 150], t: [8, 22, 5] },
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
  overview: ['西江千户苗寨 · 全景', '白水河穿谷而过，两山木楼层叠，风雨桥横卧水上，鼓楼与梯田在暮霭中相望'],
  village: ['千户苗寨', '吊脚楼依山就势，杉木黑瓦层层而上，石巷与美人靠串联起千户人家'],
  'wind-rain-bridge': ['风雨桥', '廊桥覆瓦，桥身跨白水河，栏杆与美人靠间挂着红灯笼，风雨可避'],
  terraces: ['稻作梯田', '山坡上的梯田层层叠叠，水光与稻浪沿着等高线铺展，一直漫向云端'],
  dusk: ['苗寨黄昏', '千户灯火次第亮起，炊烟与山岚浮在吊脚楼之间，银饰与飞歌在鼓楼广场回响'],
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

window.__xijiang.views = views;
window.__xijiang.setView = (key) => {
  const view = views[key];
  if (!view) return false;
  if (key === 'dusk') setDusk(true);
  setCaption(key);
  travelTo(view);
  return true;
};
window.__xijiang.toggleDusk = () => setDusk(envTarget < 0.5);
window.__xijiang.setDusk = setDusk;
window.__xijiang.getStats = () => ({
  calls: renderer.info.render.calls,
  triangles: renderer.info.render.triangles,
  geometries: renderer.info.memory.geometries,
  textures: renderer.info.memory.textures,
  houses: world.spots.length,
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
}

function animate() {
  const rawDt = clock.getDelta();
  const dt = Math.min(rawDt, 0.05);
  const time = clock.elapsedTime;
  updateEnvironment(Math.min(rawDt, 0.2));
  if (world.life) world.life.update(time, dt, envMix);
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
