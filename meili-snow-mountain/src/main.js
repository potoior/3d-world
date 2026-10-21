import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildMeiliScene } from './meili.js';
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
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xd5d2c1, 1450, 4300);

const camera = new THREE.PerspectiveCamera(47, window.innerWidth / window.innerHeight, 0.6, 7200);
camera.position.set(0, 330, -980);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 430, 560);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.minDistance = 8;
controls.maxDistance = 2600;
controls.maxPolarAngle = Math.PI * 0.495;
controls.autoRotateSpeed = 0.2;
controls.update();

const skyUniforms = {
  topColor: { value: new THREE.Color(0x27588f) },
  horizonColor: { value: new THREE.Color(0xffc996) },
  bottomColor: { value: new THREE.Color(0xbfd8e2) },
  sunDir: { value: new THREE.Vector3(0.78, 0.34, 0.32).normalize() },
  sunColor: { value: new THREE.Color(0xffdfae) },
};
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(4500, 48, 28),
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
        vec3 col = mix(bottomColor, horizonColor, smoothstep(-0.16, 0.06, h));
        col = mix(col, topColor, smoothstep(0.02, 0.68, h));
        float sd = max(dot(dir, normalize(sunDir)), 0.0);
        col += sunColor * pow(sd, 1200.0) * 2.4;
        col += sunColor * pow(sd, 22.0) * 0.22;
        col += sunColor * pow(sd, 4.0) * 0.05;
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  })
);
scene.add(sky);

function makeGlowTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(128, 128, 2, 128, 128, 128);
  grad.addColorStop(0, 'rgba(255,250,226,0.98)');
  grad.addColorStop(0.18, 'rgba(255,219,150,0.56)');
  grad.addColorStop(0.48, 'rgba(255,172,94,0.15)');
  grad.addColorStop(1, 'rgba(255,146,76,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const glowMaterial = new THREE.SpriteMaterial({
  map: makeGlowTexture(),
  color: 0xffd8a2,
  transparent: true,
  opacity: 0.72,
  depthWrite: false,
  depthTest: true,
  blending: THREE.AdditiveBlending,
});
const sunGlow = new THREE.Sprite(glowMaterial);
sunGlow.scale.set(1500, 1500, 1);
sunGlow.renderOrder = 1;
scene.add(sunGlow);

const hemi = new THREE.HemisphereLight(0xd3e8f6, 0x6f6a4c, 1.65);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xffd2a2, 3.4);
sun.position.set(940, 410, 390);
sun.castShadow = true;
sun.shadow.mapSize.set(isCompact ? 2048 : 4096, isCompact ? 2048 : 4096);
sun.shadow.camera.left = -480;
sun.shadow.camera.right = 480;
sun.shadow.camera.top = 480;
sun.shadow.camera.bottom = -480;
sun.shadow.camera.near = 20;
sun.shadow.camera.far = 2400;
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 1.8;
scene.add(sun);
scene.add(sun.target);

const fill = new THREE.DirectionalLight(0xb6ced8, 0.62);
fill.position.set(-560, 240, -380);
scene.add(fill);
scene.add(new THREE.AmbientLight(0xe0e8ea, 0.34));

const world = buildMeiliScene();
scene.add(world.group);

window.__meili = {
  scene,
  camera,
  renderer,
  controls,
  world,
  views: null,
  notes: null,
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

const dayState = {
  sun: new THREE.Color(0xffd2a2),
  hemiSky: new THREE.Color(0xd3e8f6),
  hemiGround: new THREE.Color(0x6f6a4c),
  top: new THREE.Color(0x27588f),
  horizon: new THREE.Color(0xffc996),
  bottom: new THREE.Color(0xbfd8e2),
  fog: new THREE.Color(0xd5d2c1),
  sunDir: new THREE.Vector3(0.78, 0.34, 0.32).normalize(),
  sunIntensity: 3.4,
  hemiIntensity: 1.65,
  exposure: 1.12,
  glow: new THREE.Color(0xffd8a2),
  glowOpacity: 0.72,
  cloudOpacity: 0.92,
  windowIntensity: 0.2,
};

const duskState = {
  sun: new THREE.Color(0xff8d5e),
  hemiSky: new THREE.Color(0x7b86ad),
  hemiGround: new THREE.Color(0x49443f),
  top: new THREE.Color(0x172444),
  horizon: new THREE.Color(0xdd8a63),
  bottom: new THREE.Color(0x6f7a91),
  fog: new THREE.Color(0xb4a49b),
  sunDir: new THREE.Vector3(-0.78, 0.27, 0.42).normalize(),
  sunIntensity: 1.8,
  hemiIntensity: 0.78,
  exposure: 1.18,
  glow: new THREE.Color(0xff8b6a),
  glowOpacity: 0.5,
  cloudOpacity: 0.62,
  windowIntensity: 1.0,
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
  overview: { p: [0, 330, -980], t: [0, 430, 560] },
  kawagarbo: { p: [72, 330, -300], t: [0, 640, 800] },
  glacier: { p: [560, 220, -150], t: [300, 270, 470] },
  yubeng: { p: [-480, 132, -468], t: [-322, 52, -142] },
  dusk: { p: [-430, 410, -960], t: [0, 450, 620] },
};

const notes = {
  overview: ['梅里雪山 · 十三峰', '十三座雪峰横亘滇藏边界，卡瓦格博居中如金字塔，云海在明永冰川与雨崩村之间缓慢流动'],
  kawagarbo: ['卡瓦格博 · 6740M', '藏语意为“雪山之神”，四壁陡峭如金字塔，金色晨光越过山脊，照亮终年不化的雪冠'],
  glacier: ['明永冰川 · 冰舌', '冰川自卡瓦格博东坡倾泻而下，冰塔林、冰裂隙与黑色冰碛垄在雪线之下层层铺展'],
  yubeng: ['雨崩村 · 雪山脚下的藏寨', '白墙木顶的藏房散落在青稞田与冷杉林之间，五色经幡横跨山谷，融水绕村而过'],
  dusk: ['梅里暮色 · 日照金山', '落日把卡瓦格博染成玫瑰金，云海沉入谷底，经幡在最后的暖光里猎猎作响'],
};

window.__meili.views = views;
window.__meili.notes = notes;

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

function travelTo(view) {
  tour.fromP.copy(camera.position);
  tour.fromT.copy(controls.target);
  tour.toP.set(...view.p);
  tour.toT.set(...view.t);
  tour.t = 0;
  tour.active = true;
  controls.autoRotate = false;
  const rotateBtn = document.getElementById('btn-rotate');
  if (rotateBtn) rotateBtn.classList.remove('active');
}

function syncDuskButton() {
  const btn = document.getElementById('btn-dusk');
  if (!btn) return;
  btn.classList.toggle('active', envTarget > 0.5);
  btn.textContent = envTarget > 0.5 ? '日间' : '黄昏';
}

document.querySelectorAll('[data-view]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const key = btn.dataset.view;
    const view = views[key];
    setCaption(key);
    if (view) travelTo(view);
    envTarget = key === 'dusk' ? 1 : 0;
    syncDuskButton();
  });
});

const rotateBtn = document.getElementById('btn-rotate');
if (rotateBtn) {
  rotateBtn.addEventListener('click', () => {
    controls.autoRotate = !controls.autoRotate;
    rotateBtn.classList.toggle('active', controls.autoRotate);
  });
}

const duskBtn = document.getElementById('btn-dusk');
if (duskBtn) {
  duskBtn.addEventListener('click', () => {
    envTarget = envTarget > 0.5 ? 0 : 1;
    syncDuskButton();
  });
}

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
  travelTo,
  setCaption,
});
window.__interactions = interactions;
window.__meili.interactions = interactions;

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();
const tmpColor = new THREE.Color();
const tmpDir = new THREE.Vector3();

function updateEnvironment(dt) {
  envMix += (envTarget - envMix) * Math.min(1, dt * 1.35);
  if (Math.abs(envTarget - envMix) < 0.001) envMix = envTarget;

  sun.color.copy(dayState.sun).lerp(duskState.sun, envMix);
  sun.intensity = THREE.MathUtils.lerp(dayState.sunIntensity, duskState.sunIntensity, envMix);
  tmpDir.copy(dayState.sunDir).lerp(duskState.sunDir, envMix).normalize();
  sun.position.copy(tmpDir).multiplyScalar(1250);
  sun.target.position.set(0, 0, 0);

  hemi.color.copy(dayState.hemiSky).lerp(duskState.hemiSky, envMix);
  hemi.groundColor.copy(dayState.hemiGround).lerp(duskState.hemiGround, envMix);
  hemi.intensity = THREE.MathUtils.lerp(dayState.hemiIntensity, duskState.hemiIntensity, envMix);

  skyUniforms.topColor.value.copy(dayState.top).lerp(duskState.top, envMix);
  skyUniforms.horizonColor.value.copy(dayState.horizon).lerp(duskState.horizon, envMix);
  skyUniforms.bottomColor.value.copy(dayState.bottom).lerp(duskState.bottom, envMix);
  skyUniforms.sunColor.value.copy(sun.color);
  skyUniforms.sunDir.value.copy(tmpDir);

  sunGlow.position.copy(tmpDir).multiplyScalar(3600);
  glowMaterial.color.copy(dayState.glow).lerp(duskState.glow, envMix);
  glowMaterial.opacity = THREE.MathUtils.lerp(dayState.glowOpacity, duskState.glowOpacity, envMix);

  scene.fog.color.copy(dayState.fog).lerp(duskState.fog, envMix);
  if (world.cloudMaterial) {
    world.cloudMaterial.uniforms.uFogColor.value.copy(scene.fog.color);
    world.cloudMaterial.uniforms.uOpacity.value = THREE.MathUtils.lerp(dayState.cloudOpacity, duskState.cloudOpacity, envMix);
  }
  if (world.windowMaterial) {
    world.windowMaterial.emissiveIntensity = THREE.MathUtils.lerp(dayState.windowIntensity, duskState.windowIntensity, envMix);
  }
  renderer.toneMappingExposure = THREE.MathUtils.lerp(dayState.exposure, duskState.exposure, envMix);

  for (const material of world.waterMaterials || []) {
    const day = material.userData.day;
    const dusk = material.userData.dusk;
    if (day && dusk) {
      material.uniforms.uDeep.value.set(day.deep).lerp(tmpColor.set(dusk.deep), envMix);
      material.uniforms.uShallow.value.set(day.shallow).lerp(tmpColor.set(dusk.shallow), envMix);
      material.uniforms.uSky.value.set(day.sky).lerp(tmpColor.set(dusk.sky), envMix);
    }
    material.uniforms.uSun.value.copy(sun.color);
    material.uniforms.uSunDir.value.copy(tmpDir);
  }
  for (const material of world.glacierMaterials || []) {
    material.uniforms.uSun.value.copy(sun.color);
    material.uniforms.uSunDir.value.copy(tmpDir);
  }
  for (const material of world.fallMaterials || []) {
    if (material.uniforms.uSun) material.uniforms.uSun.value.copy(sun.color);
  }
}

function animate() {
  const rawDt = clock.getDelta();
  const dt = Math.min(rawDt, 0.05);
  const time = clock.elapsedTime;

  updateEnvironment(Math.min(rawDt, 0.2));
  for (const material of world.waterMaterials || []) material.uniforms.uTime.value = time;
  if (world.life) world.life.update(time, dt);

  if (tour.active) {
    tour.t += rawDt / tour.duration;
    const t = Math.min(1, tour.t);
    const ease = 1 - Math.pow(1 - t, 3);
    camera.position.lerpVectors(tour.fromP, tour.toP, ease);
    controls.target.lerpVectors(tour.fromT, tour.toT, ease);
    if (t >= 1) tour.active = false;
  }

  controls.update();
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
