import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildWestLakeScene } from './layout.js';
import { buildSlenderOverlay } from './slender.js';
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
scene.fog = new THREE.Fog(0xdde7e3, 240, 1500);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.5, 3000);
camera.position.set(85, 45, -195);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(30, 4, 140);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.minDistance = 8;
controls.maxDistance = 760;
controls.maxPolarAngle = Math.PI * 0.492;
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

const world = buildWestLakeScene();
scene.add(world.group);
const slenderOverlay = buildSlenderOverlay();
scene.add(slenderOverlay.group);
const waterMaterial = world.waterMaterial;

window.__slender = { scene, camera, renderer, controls, world };

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
window.__slender.fp = fp;

const dayState = {
  sun: new THREE.Color(0xfff2dc),
  hemiSky: new THREE.Color(0xe2edf1),
  hemiGround: new THREE.Color(0x7e8f6e),
  top: new THREE.Color(0x7da4c4),
  horizon: new THREE.Color(0xe9eee8),
  bottom: new THREE.Color(0xd3ddd6),
  fog: new THREE.Color(0xdde7e3),
  waterDeep: new THREE.Color(0x2f5952),
  waterSky: new THREE.Color(0xb9d0d1),
  sunPos: new THREE.Vector3(140, 180, -80),
  sunIntensity: 2.2,
  hemiIntensity: 1.85,
  exposure: 1.1,
};

const duskState = {
  sun: new THREE.Color(0xff9d63),
  hemiSky: new THREE.Color(0x8e9fb8),
  hemiGround: new THREE.Color(0x6d6353),
  top: new THREE.Color(0x344a68),
  horizon: new THREE.Color(0xe8ad78),
  bottom: new THREE.Color(0x927a65),
  fog: new THREE.Color(0xc9a486),
  waterDeep: new THREE.Color(0x2a433f),
  waterSky: new THREE.Color(0xd9ab83),
  sunPos: new THREE.Vector3(-220, 78, 210),
  sunIntensity: 1.8,
  hemiIntensity: 0.9,
  exposure: 1.13,
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
  overview: { p: [290, 125, 300], t: [0, 10, 40] },
  wuting: { p: [130, 30, -20], t: [45, 8, -78] },
  baita: { p: [170, 32, -30], t: [105, 22, -112] },
  xuyuan: { p: [210, 28, 100], t: [120, 10, 10] },
  dusk: { p: [260, 82, 220], t: [0, 10, 50] },
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
  overview: ['瘦西湖 · 全景', '湖水如带，五亭桥、白塔、徐园与长堤春柳沿水铺展，是扬州湖上园林的长卷'],
  wuting: ['五亭桥', '桥上五亭并列，黄瓦朱柱，桥下十五孔洞，月夜可映出十五轮月影'],
  baita: ['白塔', '白色喇嘛塔立于湖岸，塔身洁白，与绿柳碧水相映，是瘦西湖最醒目的地标'],
  xuyuan: ['徐园', '湖上园林庭院，花木、厅堂与曲廊临水而筑，园门题额古雅'],
  dusk: ['瘦西湖黄昏', '暮色落向湖面，五亭桥与白塔映在水中，画舫与柳影收进晚照'],
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
  if (world.lanternMaterial) world.lanternMaterial.emissiveIntensity = THREE.MathUtils.lerp(0.38, 0.9, envMix);
}

function animate() {
  const rawDt = clock.getDelta();
  const dt = Math.min(rawDt, 0.05);
  const time = clock.elapsedTime;

  updateEnvironment(Math.min(rawDt, 0.2));
  waterMaterial.uniforms.uTime.value = time;
  updateFoliageSway(time);
  if (world.life) world.life.update(time, dt);
  if (slenderOverlay) slenderOverlay.life.update(time);

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

updateEnvironment(1);
animate();

const loader = document.getElementById('loader');
requestAnimationFrame(() => {
  loader.classList.add('hidden');
  document.body.classList.add('ready');
});
