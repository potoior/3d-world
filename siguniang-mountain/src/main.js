import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildSiguniangScene } from './siguniang.js';
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
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xd1dcd8, 1300, 5200);

const camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.5, 6500);
camera.position.set(0, 380, -1200);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 330, 820);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.minDistance = 8;
controls.maxDistance = 2600;
controls.maxPolarAngle = Math.PI * 0.492;
controls.autoRotateSpeed = 0.18;
controls.update();

const skyUniforms = {
  topColor: { value: new THREE.Color(0x2b6096) },
  horizonColor: { value: new THREE.Color(0xf5cba2) },
  bottomColor: { value: new THREE.Color(0xc4d8d7) },
  sunDir: { value: new THREE.Vector3(0.81, 0.54, -0.13).normalize() },
  sunColor: { value: new THREE.Color(0xffe4b8) },
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
        vec3 col = mix(bottomColor, horizonColor, smoothstep(-0.2, 0.08, h));
        col = mix(col, topColor, smoothstep(0.02, 0.66, h));
        float sd = max(dot(dir, normalize(sunDir)), 0.0);
        col += sunColor * pow(sd, 900.0) * 1.7;
        col += sunColor * pow(sd, 16.0) * 0.18;
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  })
);
scene.add(sky);

const hemi = new THREE.HemisphereLight(0xd7eaf5, 0x5b573b, 1.82);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xffe1b4, 3.08);
sun.position.set(900, 620, -180);
sun.castShadow = true;
sun.shadow.mapSize.set(isCompact ? 2048 : 2048, isCompact ? 2048 : 2048);
sun.shadow.camera.left = -780;
sun.shadow.camera.right = 780;
sun.shadow.camera.top = 780;
sun.shadow.camera.bottom = -780;
sun.shadow.camera.near = 20;
sun.shadow.camera.far = 2600;
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 1.8;
scene.add(sun);
scene.add(sun.target);

const fill = new THREE.DirectionalLight(0xaec8dd, 0.55);
fill.position.set(-160, 140, -220);
scene.add(fill);
scene.add(new THREE.AmbientLight(0xe4ecef, 0.52));

const world = buildSiguniangScene();
scene.add(world.group);
window.__siguniangTerrainHeight = world.heightAt;

const views = {
  overview: { p: [0, 380, -1200], t: [0, 330, 820], fov: 46 },
  'yao-mei': { p: [120, 620, -480], t: [680, 610, 890], fov: 48 },
  shuangqiao: { p: [-380, 120, -500], t: [-20, 115, 80], fov: 54 },
  meadow: { p: [420, 150, -650], t: [60, 110, 200], fov: 50 },
  dusk: { p: [780, 380, -1150], t: [180, 340, 820], fov: 48 },
};

const notes = {
  overview: [
    '四姑娘山 · 四峰全景',
    '大峰、二峰、三峰与幺妹峰自西向东列峙，幺妹峰海拔 6250 米，雪脊之上云海翻涌，山谷里是双桥沟的针叶林与草甸',
  ],
  'yao-mei': [
    '幺妹峰 · 蜀山皇后',
    '四姑娘山主峰，海拔 6250 米。金字塔般的角峰刺破云层，北壁冰川与裸露岩脊在晨光中明暗交错',
  ],
  shuangqiao: [
    '双桥沟 · 云杉冷杉林',
    '三十余公里峡谷中，云杉、冷杉与秋日金黄的落叶松层层铺展，两座木桥跨过雪山融水，通往谷底草甸',
  ],
  meadow: [
    '高山草甸 · 牦牛与经幡',
    '海拔三千余米的草甸上牦牛低头吃草，五色经幡横跨溪谷，青稞与野花在风里起伏，远处雪峰终年不化',
  ],
  dusk: [
    '四姑娘山暮色',
    '落日把幺妹峰染成玫瑰金，云海沉入双桥沟，经幡在最后的暖光里猎猎作响，草甸与溪流渐渐安静下来',
  ],
};

const dayState = {
  sun: new THREE.Color(0xffe1b4),
  hemiSky: new THREE.Color(0xd7eaf5),
  hemiGround: new THREE.Color(0x5b573b),
  top: new THREE.Color(0x2b6096),
  horizon: new THREE.Color(0xf5cba2),
  bottom: new THREE.Color(0xc4d8d7),
  fog: new THREE.Color(0xd1dcd8),
  sunPos: new THREE.Vector3(900, 620, -180),
  sunIntensity: 3.08,
  hemiIntensity: 1.82,
  exposure: 1.08,
};

const duskState = {
  sun: new THREE.Color(0xff9a68),
  hemiSky: new THREE.Color(0x8089b2),
  hemiGround: new THREE.Color(0x46443a),
  top: new THREE.Color(0x1c294a),
  horizon: new THREE.Color(0xe28a61),
  bottom: new THREE.Color(0x728096),
  fog: new THREE.Color(0xbfb3ad),
  sunPos: new THREE.Vector3(-760, 120, 300),
  sunIntensity: 1.85,
  hemiIntensity: 0.95,
  exposure: 1.17,
};

let envTarget = 0;
let envMix = 0;

const tour = {
  active: false,
  t: 0,
  duration: 2.4,
  fromP: new THREE.Vector3(),
  fromT: new THREE.Vector3(),
  toP: new THREE.Vector3(),
  toT: new THREE.Vector3(),
  fromFov: 46,
  toFov: 46,
};

function travelTo(view) {
  if (fp.isActive()) fp.exit();
  tour.fromP.copy(camera.position);
  tour.fromT.copy(controls.target);
  tour.fromFov = camera.fov;
  tour.toP.set(...view.p);
  tour.toT.set(...view.t);
  tour.toFov = view.fov || 46;
  tour.t = 0;
  tour.active = true;
  controls.autoRotate = false;
  document.getElementById('btn-rotate').classList.remove('active');
}

window.__siguniang = {
  scene,
  camera,
  renderer,
  controls,
  world,
  views,
  notes,
  stats: () => ({
    calls: renderer.info.render.calls,
    triangles: renderer.info.render.triangles,
    textures: renderer.info.memory.textures,
    geometries: renderer.info.memory.geometries,
  }),
  getStats: () => ({
    calls: renderer.info.render.calls,
    triangles: renderer.info.render.triangles,
    textures: renderer.info.memory.textures,
    geometries: renderer.info.memory.geometries,
  }),
};

const fp = createFirstPerson({
  camera,
  controls,
  renderer,
  canvas,
  onEnter: () => {
    tour.active = false;
    controls.autoRotate = false;
    const rb = document.getElementById('btn-rotate');
    if (rb) rb.classList.remove('active');
  },
});
window.__fp = fp;
window.__siguniang.fp = fp;

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

function setActiveView(key) {
  document.querySelectorAll('[data-view]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.view === key);
  });
}

document.querySelectorAll('[data-view]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const key = btn.dataset.view;
    const view = views[key];
    setCaption(key);
    setActiveView(key);
    if (view) travelTo(view);
    const toggle = document.getElementById('btn-dusk');
    if (key === 'dusk') {
      envTarget = 1;
      if (toggle) {
        toggle.classList.add('active');
        toggle.textContent = '日间';
      }
    } else {
      envTarget = 0;
      if (toggle) {
        toggle.classList.remove('active');
        toggle.textContent = '黄昏';
      }
    }
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
window.__siguniang.interactions = interactions;

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  world.sky.resize();
});

const clock = new THREE.Clock();
const tmpColor = new THREE.Color();
const tmpSunPos = new THREE.Vector3();

function updateEnvironment(dt) {
  envMix += (envTarget - envMix) * Math.min(1, dt * 1.35);
  if (Math.abs(envTarget - envMix) < 0.001) envMix = envTarget;

  sun.color.copy(dayState.sun).lerp(duskState.sun, envMix);
  sun.intensity = THREE.MathUtils.lerp(dayState.sunIntensity, duskState.sunIntensity, envMix);
  tmpSunPos.copy(dayState.sunPos).lerp(duskState.sunPos, envMix);
  sun.position.copy(tmpSunPos);

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

  const sunDir = tmpSunPos.clone().normalize();
  for (const material of world.waterMaterials) {
    const day = material.userData.day;
    const dusk = material.userData.dusk;
    if (day && dusk) {
      material.uniforms.uDeep.value.set(day.deep).lerp(tmpColor.set(dusk.deep), envMix);
      material.uniforms.uShallow.value.set(day.shallow).lerp(tmpColor.set(dusk.shallow), envMix);
      material.uniforms.uSky.value.set(day.sky).lerp(tmpColor.set(dusk.sky), envMix);
    }
    material.uniforms.uSun.value.copy(sun.color);
    material.uniforms.uSunDir.value.copy(sunDir);
  }
  world.sky.setDusk(envMix, sun.color);
}

function animate() {
  const rawDt = clock.getDelta();
  const dt = Math.min(rawDt, 0.05);
  const time = clock.elapsedTime;

  updateEnvironment(Math.min(rawDt, 0.2));
  world.life.update(time, dt);

  if (!fp.isActive()) {
    if (tour.active) {
      tour.t += rawDt / tour.duration;
      const t = Math.min(1, tour.t);
      const ease = 1 - Math.pow(1 - t, 3);
      camera.position.lerpVectors(tour.fromP, tour.toP, ease);
      controls.target.lerpVectors(tour.fromT, tour.toT, ease);
      camera.fov = THREE.MathUtils.lerp(tour.fromFov, tour.toFov, ease);
      camera.updateProjectionMatrix();
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
  loader.style.transition = 'none';
  loader.style.opacity = '0';
  loader.style.visibility = 'hidden';
  loader.classList.add('hidden');
  document.body.classList.add('ready');
  setTimeout(() => {
    loader.style.display = 'none';
  }, 1200);
});
