import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildFlamingScene } from './flaming.js';
import { createFirstPerson } from './firstperson.js';
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
renderer.toneMappingExposure = 1.18;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xe6a06f, 430, 2380);

const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.6, 4200);
camera.position.set(5, 158, 455);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(-40, 48, -175);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.minDistance = 10;
controls.maxDistance = 1500;
controls.maxPolarAngle = Math.PI * 0.492;
controls.autoRotateSpeed = 0.22;
controls.update();

const skyUniforms = {
  topColor: { value: new THREE.Color(0x3f74a6) },
  horizonColor: { value: new THREE.Color(0xffc078) },
  bottomColor: { value: new THREE.Color(0xe8894f) },
  sunDir: { value: new THREE.Vector3(-0.86, 0.36, 0.3).normalize() },
  sunColor: { value: new THREE.Color(0xffd7a2) },
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
        col = mix(col, topColor, smoothstep(0.03, 0.44, h));
        float sd = max(dot(dir, normalize(sunDir)), 0.0);
        col += sunColor * pow(sd, 800.0) * 1.5;
        col += sunColor * pow(sd, 14.0) * 0.18;
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  })
);
scene.add(sky);

const hemi = new THREE.HemisphereLight(0xffd2a0, 0x8f4a2e, 1.55);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xffd6a0, 2.7);
sun.position.set(-320, 250, 170);
sun.castShadow = true;
sun.shadow.mapSize.set(isCompact ? 2048 : 4096, isCompact ? 2048 : 4096);
sun.shadow.camera.left = -360;
sun.shadow.camera.right = 360;
sun.shadow.camera.top = 320;
sun.shadow.camera.bottom = -320;
sun.shadow.camera.near = 20;
sun.shadow.camera.far = 1200;
sun.shadow.bias = -0.00035;
sun.shadow.normalBias = 1.2;
scene.add(sun);
scene.add(sun.target);

const fill = new THREE.DirectionalLight(0x9dbad0, 0.36);
fill.position.set(220, 90, -140);
scene.add(fill);
scene.add(new THREE.AmbientLight(0xf0c79a, 0.45));

const world = buildFlamingScene();
scene.add(world.group);
const waterMaterials = world.waterMaterials;
const debugStats = { calls: 0, triangles: 0, geometries: 0, textures: 0 };

window.__flaming = {
  scene,
  camera,
  renderer,
  controls,
  world,
  title: '火焰山',
  stats: debugStats,
  views: null,
  notes: null,
};

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
window.__flaming.fp = fp;

const dayState = {
  sun: new THREE.Color(0xffd6a0),
  hemiSky: new THREE.Color(0xffd2a0),
  hemiGround: new THREE.Color(0x8f4a2e),
  top: new THREE.Color(0x3f74a6),
  horizon: new THREE.Color(0xffc078),
  bottom: new THREE.Color(0xe8894f),
  fog: new THREE.Color(0xe6a06f),
  waterDeep: new THREE.Color(0x1f5a55),
  waterSky: new THREE.Color(0xf0c48d),
  sunPos: new THREE.Vector3(-320, 250, 170),
  sunIntensity: 2.7,
  hemiIntensity: 1.55,
  exposure: 1.18,
};

const duskState = {
  sun: new THREE.Color(0xff7738),
  hemiSky: new THREE.Color(0x9a7886),
  hemiGround: new THREE.Color(0x6a3826),
  top: new THREE.Color(0x2a2e58),
  horizon: new THREE.Color(0xff6f35),
  bottom: new THREE.Color(0xa8412c),
  fog: new THREE.Color(0xd06a4a),
  waterDeep: new THREE.Color(0x243c3f),
  waterSky: new THREE.Color(0xe08a5c),
  sunPos: new THREE.Vector3(-360, 48, -120),
  sunIntensity: 1.95,
  hemiIntensity: 0.72,
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
  fromF: 48,
  toF: 48,
};

const views = {
  overview: { p: [5, 158, 455], t: [-40, 48, -175], fov: 49 },
  mountain: { p: [-250, 115, 210], t: [-20, 80, -250], fov: 50 },
  valley: { p: [10, 82, -6], t: [2, 32, -360], fov: 56 },
  oasis: { p: [-70, 62, 305], t: [-190, 10, 112], fov: 46 },
  dusk: { p: [85, 150, 470], t: [0, 58, -170], fov: 50 },
};
window.__flaming.views = views;

const notes = {
  overview: ['火焰山 · 全景', '赤焰山峦横亘吐鲁番盆地，沟壑如焰，葡萄沟绿洲在热浪中铺展'],
  mountain: ['赤焰山峦', '赭红砂岩被亿万年风雨刻成深沟纵壑，日光下如烈焰翻涌'],
  valley: ['火焰山峡谷', '穿行于赤色崖壁之间，脚下砾石滚烫，热浪沿沟谷升腾'],
  oasis: ['葡萄沟 · 坎儿井', '雪水潜行地下，坎儿井滋养葡萄长廊与土黄色村落'],
  dusk: ['大漠落日 · 赤焰', '夕阳把山脊烧成金红，驼队与炊烟沉入吐鲁番暮色'],
};
window.__flaming.notes = notes;

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

function syncDuskButton() {
  const btn = document.getElementById('btn-dusk');
  if (!btn) return;
  btn.classList.toggle('active', envTarget > 0.5);
  btn.textContent = envTarget > 0.5 ? '日间' : '夕照';
}

function travelTo(view, key) {
  if (fp.isActive()) fp.exit();
  tour.fromP.copy(camera.position);
  tour.fromT.copy(controls.target);
  tour.toP.set(...view.p);
  tour.toT.set(...view.t);
  tour.fromF = camera.fov;
  tour.toF = view.fov || 48;
  tour.t = 0;
  tour.active = true;
  controls.autoRotate = false;
  document.getElementById('btn-rotate').classList.remove('active');
  envTarget = key === 'dusk' ? 1 : 0;
  syncDuskButton();
}

document.querySelectorAll('[data-view]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const view = views[btn.dataset.view];
    setCaption(btn.dataset.view);
    if (view) travelTo(view, btn.dataset.view);
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
  syncDuskButton();
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
  travelTo: (view) => travelTo(view, null),
  setCaption,
});
window.__interactions = interactions;
window.__flaming.interactions = interactions;

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

  waterMaterials.forEach((mat) => {
    mat.uniforms.uSun.value.copy(sun.color);
    mat.uniforms.uSunDir.value.copy(tmpSunPos).normalize();
    mat.uniforms.uDeep.value.copy(dayState.waterDeep).lerp(duskState.waterDeep, envMix);
    mat.uniforms.uSky.value.copy(dayState.waterSky).lerp(duskState.waterSky, envMix);
  });
}

function animate() {
  const rawDt = clock.getDelta();
  const dt = Math.min(rawDt, 0.05);
  const time = clock.elapsedTime;

  updateEnvironment(Math.min(rawDt, 0.2));
  if (world.life) world.life.update(time, dt);

  if (!fp.isActive()) {
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
    controls.update();
  } else {
    fp.update(dt);
  }
  renderer.render(scene, camera);
  debugStats.calls = renderer.info.render.calls;
  debugStats.triangles = renderer.info.render.triangles;
  debugStats.geometries = renderer.info.memory.geometries;
  debugStats.textures = renderer.info.memory.textures;
  requestAnimationFrame(animate);
}

Object.defineProperty(window.__flaming, 'env', {
  value: () => ({ mix: envMix, target: envTarget }),
});
Object.defineProperty(window.__flaming, 'getStats', {
  value: () => ({
    calls: renderer.info.render.calls,
    triangles: renderer.info.render.triangles,
    geometries: renderer.info.memory.geometries,
    textures: renderer.info.memory.textures,
  }),
});

updateEnvironment(1);
animate();

const loader = document.getElementById('loader');
requestAnimationFrame(() => {
  loader.classList.add('hidden');
  document.body.classList.add('ready');
});
window.__ready = true;
window.__flaming.bootMs = Math.round(performance.now());
