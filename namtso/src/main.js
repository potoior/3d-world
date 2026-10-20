import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildQinghaiScene } from './qinghai.js';
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
scene.fog = new THREE.Fog(0xdde7e3, 320, 2200);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.5, 3000);
camera.position.set(0, 120, 300);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 20, -80);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.minDistance = 8;
controls.maxDistance = 1300;
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

const world = buildQinghaiScene();
scene.add(world.group);
const waterMaterial = world.waterMaterial;

window.__namtso = { scene, camera, renderer, controls, world };

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
window.__namtso.fp = fp;

const dayState = {
  sun: new THREE.Color(0xfff2dc),
  hemiSky: new THREE.Color(0xe2edf1),
  hemiGround: new THREE.Color(0x7e8f6e),
  top: new THREE.Color(0x7da4c4),
  horizon: new THREE.Color(0xe9eee8),
  bottom: new THREE.Color(0xd3ddd6),
  fog: new THREE.Color(0xdde7e3),
  waterDeep: new THREE.Color(0x0a4f78),
  waterSky: new THREE.Color(0xcfe4ee),
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
  waterDeep: new THREE.Color(0x123f5c),
  waterSky: new THREE.Color(0xe0b08a),
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
  overview: { p: [0, 120, 300], t: [0, 20, -80] },
  shore: { p: [190, 20, 185], t: [120, 2, 80] },
  rapeseed: { p: [-60, 18, 185], t: [-180, 2, 115] },
  pasture: { p: [-130, 22, 225], t: [-195, 3, 150] },
  sunset: { p: [220, 34, 210], t: [-20, 10, -80] },
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
  overview: ['纳木错 · 全景', '念青唐古拉雪山环抱天湖，碧水铺展至天际，湖岸草场与玛尼堆相接'],
  shore: ['湖岸 · 木栈道', '长岸碎石与清浅涟漪相拥，木栈道沿湖蜿蜒，经幡在风中猎猎作响'],
  rapeseed: ['扎西半岛', '半岛伸入天湖，岩洞、玛尼石与经幡簇拥，转湖者沿湖岸缓行'],
  pasture: ['念青唐古拉', '雪峰横亘湖南，冰川与云影倒映湖中，牦牛与牧人散落草场'],
  sunset: ['天湖日落', '暮色漫过雪山，湖面浮起金红光带，经幡与飞鸟归向晚照'],
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
