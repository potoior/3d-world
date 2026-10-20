import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildGardenScene } from './layout.js';
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
scene.fog = new THREE.Fog(0xdfe8de, 150, 780);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.5, 3000);
camera.position.set(118, 82, 176);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(-4, 14, 4);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.minDistance = 8;
controls.maxDistance = 620;
controls.maxPolarAngle = Math.PI * 0.492;
controls.autoRotateSpeed = 0.3;
controls.update();

const skyUniforms = {
  topColor: { value: new THREE.Color(0x8fb6d6) },
  horizonColor: { value: new THREE.Color(0xe9ede3) },
  bottomColor: { value: new THREE.Color(0xcfd9cc) },
  sunDir: { value: new THREE.Vector3(0.5, 0.65, 0.4).normalize() },
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

const hemi = new THREE.HemisphereLight(0xeaf2ec, 0x91a078, 1.82);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xfff5e4, 2.15);
sun.position.set(90, 160, 110);
sun.castShadow = true;
sun.shadow.mapSize.set(isCompact ? 2048 : 4096, isCompact ? 2048 : 4096);
sun.shadow.camera.left = -190;
sun.shadow.camera.right = 190;
sun.shadow.camera.top = 190;
sun.shadow.camera.bottom = -190;
sun.shadow.camera.near = 20;
sun.shadow.camera.far = 700;
sun.shadow.bias = -0.00035;
sun.shadow.normalBias = 1.2;
sun.shadow.autoUpdate = false;
sun.shadow.needsUpdate = true;
scene.add(sun);
scene.add(sun.target);

const fill = new THREE.DirectionalLight(0xb8d2d8, 0.76);
fill.position.set(-120, 90, -140);
scene.add(fill);
scene.add(new THREE.AmbientLight(0xdde7da, 0.5));

const world = buildGardenScene();
scene.add(world.group);
const waterMaterial = world.waterMaterial;

window.__summerpalace = { scene, camera, renderer, controls, world, title: '颐和园' };

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
window.__summerpalace.fp = fp;

const dayState = {
  sun: new THREE.Color(0xfff4e2),
  hemiSky: new THREE.Color(0xeaf2ec),
  hemiGround: new THREE.Color(0x93a37c),
  top: new THREE.Color(0x8fb6d6),
  horizon: new THREE.Color(0xe9ede3),
  bottom: new THREE.Color(0xcfd9cc),
  fog: new THREE.Color(0xe0e8df),
  waterDeep: new THREE.Color(0x355a4d),
  waterSky: new THREE.Color(0xc4d6cc),
  sunPos: new THREE.Vector3(90, 160, 110),
  sunIntensity: 2.15,
  hemiIntensity: 1.82,
  exposure: 1.08,
};

const duskState = {
  sun: new THREE.Color(0xffa267),
  hemiSky: new THREE.Color(0x9aa8bd),
  hemiGround: new THREE.Color(0x74654f),
  top: new THREE.Color(0x3a4d6b),
  horizon: new THREE.Color(0xe9b07a),
  bottom: new THREE.Color(0x9b7d63),
  fog: new THREE.Color(0xcda987),
  waterDeep: new THREE.Color(0x2f4a40),
  waterSky: new THREE.Color(0xd8ab7c),
  sunPos: new THREE.Vector3(220, 80, -180),
  sunIntensity: 1.75,
  hemiIntensity: 0.85,
  exposure: 1.12,
};

let envTarget = 0;
let envMix = 0;

const tour = {
  active: false,
  t: 0,
  duration: 1.9,
  fromP: new THREE.Vector3(),
  fromT: new THREE.Vector3(),
  toP: new THREE.Vector3(),
  toT: new THREE.Vector3(),
};

const views = {
  overview: { p: [120, 86, 178], t: [-4, 16, 2] },
  foxiang: { p: [36, 45, 24], t: [-8, 42, -58] },
  kunming: { p: [96, 30, 130], t: [4, 2, 44] },
  seventeen: { p: [152, 16, 72], t: [84, 4, 48] },
  dusk: { p: [-150, 58, 142], t: [-6, 18, -24] },
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

window.__summerpalace.tour = tour;
window.__summerpalace.info = () => ({
  calls: renderer.info.render.calls,
  triangles: renderer.info.render.triangles,
  textures: renderer.info.memory.textures,
  geometries: renderer.info.memory.geometries,
});
window.__summerpalace.views = views;

const notes = {
  overview: ['颐和园', '以万寿山、昆明湖为骨，佛香阁、长廊、十七孔桥与南湖岛相映成景'],
  foxiang: ['佛香阁', '万寿山前山三重檐八角阁，红墙黄瓦，登阁可俯瞰昆明湖光'],
  kunming: ['昆明湖', '仿西湖而拓的皇家湖苑，西堤六桥、石舫与岛屿散落烟波之间'],
  seventeen: ['十七孔桥', '连南湖岛与东岸的石桥，十七道券洞如长虹卧波，栏柱石狮成列'],
  dusk: ['夕照颐和', '暮色染湖，长廊与桥亭的宫灯次第亮起，西山倒影入水'],
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
    document.querySelectorAll('[data-view]').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    setCaption(btn.dataset.view);
    if (btn.dataset.view === 'dusk') {
      envTarget = 1;
      duskBtn.classList.add('active');
      duskBtn.textContent = '日间';
    }
    if (view) travelTo(view);
  });
});
document.querySelector('[data-view="overview"]')?.classList.add('active');

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
  if (Math.abs(envMix - prevMix) > 0.0004) sun.shadow.needsUpdate = true;

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
