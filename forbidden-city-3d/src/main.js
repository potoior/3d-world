import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildForbiddenCity } from './layout.js';
import { createFirstPerson } from './firstperson.js';
import { createAmbient } from './ambient.js';
import { mats } from './materials.js';
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
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.shadowMap.autoUpdate = false;
renderer.shadowMap.needsUpdate = true;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xbcd2e4, 1450, 3800);

const camera = new THREE.PerspectiveCamera(80, window.innerWidth / window.innerHeight, 1, 6000);
camera.position.set(0, 300, 820);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 20, 60);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.minDistance = 25;
controls.maxDistance = 1700;
controls.maxPolarAngle = Math.PI * 0.492;
controls.autoRotateSpeed = 0.28;
controls.update();

const skyUniforms = {
  topColor: { value: new THREE.Color(0x3a86d6) },
  horizonColor: { value: new THREE.Color(0x96c4f0) },
  bottomColor: { value: new THREE.Color(0xb6cde4) },
  sunDir: { value: new THREE.Vector3(0.5, 0.65, 0.4).normalize() },
  sunColor: { value: new THREE.Color(0xfff2d4) },
};
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(4200, 48, 28),
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

const hemi = new THREE.HemisphereLight(0xb9d4f2, 0x9c6a45, 0.62);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xffebc2, 3.0);
sun.position.set(420, 760, 560);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -880;
sun.shadow.camera.right = 880;
sun.shadow.camera.top = 880;
sun.shadow.camera.bottom = -880;
sun.shadow.camera.near = 40;
sun.shadow.camera.far = 2400;
sun.shadow.bias = -0.00035;
sun.shadow.normalBias = 1.8;
scene.add(sun);
scene.add(sun.target);

const fill = new THREE.DirectionalLight(0x7fa8dc, 0.3);
fill.position.set(-400, 260, -500);
scene.add(fill);

const world = buildForbiddenCity();
scene.add(world.group);
const waterMaterial = world.waterMaterial;
const ambient = createAmbient();
scene.add(ambient.group);

window.__forbidden = { scene, camera, renderer, controls, world };

const dayState = {
  sun: new THREE.Color(0xffebc2),
  hemiSky: new THREE.Color(0xb9d4f2),
  hemiGround: new THREE.Color(0x9c6a45),
  top: new THREE.Color(0x3a86d6),
  horizon: new THREE.Color(0x96c4f0),
  bottom: new THREE.Color(0xb6cde4),
  fog: new THREE.Color(0xbcd2e4),
  waterDeep: new THREE.Color(0x173744),
  waterSky: new THREE.Color(0xacc9d6),
  sunPos: new THREE.Vector3(420, 760, 560),
  sunIntensity: 3.0,
  hemiIntensity: 0.62,
  exposure: 1.12,
};

const duskState = {
  sun: new THREE.Color(0xff9a58),
  hemiSky: new THREE.Color(0x8797b8),
  hemiGround: new THREE.Color(0x8e6d52),
  top: new THREE.Color(0x263a5e),
  horizon: new THREE.Color(0xe99650),
  bottom: new THREE.Color(0x8d6248),
  fog: new THREE.Color(0xbe8a60),
  waterDeep: new THREE.Color(0x142331),
  waterSky: new THREE.Color(0xbb8059),
  sunPos: new THREE.Vector3(760, 235, -320),
  sunIntensity: 1.9,
  hemiIntensity: 0.55,
  exposure: 1.0,
};

let envTarget = 0;
let envMix = 0;

let fp = null;

const tour = {
  active: false,
  t: 0,
  duration: 1.9,
  fromP: new THREE.Vector3(),
  fromT: new THREE.Vector3(),
  toP: new THREE.Vector3(),
  toT: new THREE.Vector3(),
  fromF: 80,
  toF: 80,
};

const views = {
  overview: { p: [0, 300, 820], t: [0, 20, 60], fov: 48 },
  taihe: { p: [140, 92, 330], t: [0, 45, 87], fov: 46 },
  meridian: { p: [0, 55, 690], t: [0, 32, 480], fov: 46 },
  corner: { p: [520, 140, 700], t: [376, 28, 480], fov: 50 },
  garden: { p: [95, 82, -270], t: [0, 12, -408], fov: 50 },
};

function travelTo(view) {
  tour.fromP.copy(camera.position);
  tour.fromT.copy(controls.target);
  tour.toP.set(...view.p);
  tour.toT.set(...view.t);
  tour.fromF = camera.fov;
  tour.toF = view.fov || 46;
  tour.t = 0;
  tour.active = true;
  controls.autoRotate = false;
  document.getElementById('btn-rotate').classList.remove('active');
}

const notes = {
  overview: ['紫禁城', '南北 961 米，东西 753 米；中轴自午门经三台直抵神武门'],
  meridian: ['午门', '三面环抱的阙门，五凤楼东西翼展约一百九十米'],
  taihe: ['太和殿', '重檐庑殿顶，面阔十一间，坐落于八米余高的三台之上'],
  corner: ['角楼', '九梁十八柱七十二脊，宫城四隅的防御与点景'],
  garden: ['御花园', '坤宁门至顺贞门之间，古柏、叠石与亭台相间'],
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

window.__fp = fp;
window.__forbidden.fp = fp;

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
  const prevMix = envMix;
  envMix += (envTarget - envMix) * Math.min(1, dt * 1.4);
  if (Math.abs(envTarget - envMix) < 0.001) envMix = envTarget;
  if (envMix !== prevMix) renderer.shadowMap.needsUpdate = true;

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
  mats.lantern.emissiveIntensity = THREE.MathUtils.lerp(0.5, 1.65, envMix);
}

function animate() {
  const rawDt = clock.getDelta();
  const dt = Math.min(rawDt, 0.05);
  const time = clock.elapsedTime;

  updateEnvironment(Math.min(rawDt, 0.2));
  waterMaterial.uniforms.uTime.value = time;
  ambient.update(time);
  if (world.life) world.life.update(time, dt);

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
});
