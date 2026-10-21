import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildYulongScene } from './yulong.js';
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
scene.fog = new THREE.Fog(0xd5d8cc, 760, 3550);

const camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.5, 5200);
camera.position.set(0, 215, -770);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 255, 330);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.minDistance = 8;
controls.maxDistance = 1900;
controls.maxPolarAngle = Math.PI * 0.492;
controls.autoRotateSpeed = 0.22;
controls.update();

const skyUniforms = {
  topColor: { value: new THREE.Color(0x346a9d) },
  horizonColor: { value: new THREE.Color(0xffd2a2) },
  bottomColor: { value: new THREE.Color(0xbcd7dc) },
  sunDir: { value: new THREE.Vector3(0.82, 0.3, -0.28).normalize() },
  sunColor: { value: new THREE.Color(0xffe2b0) },
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

const hemi = new THREE.HemisphereLight(0xd9ecf4, 0x6f6b52, 2.1);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xffd9a8, 2.9);
sun.position.set(720, 430, -240);
sun.castShadow = true;
sun.shadow.mapSize.set(isCompact ? 2048 : 4096, isCompact ? 2048 : 4096);
sun.shadow.camera.left = -460;
sun.shadow.camera.right = 460;
sun.shadow.camera.top = 460;
sun.shadow.camera.bottom = -460;
sun.shadow.camera.near = 20;
sun.shadow.camera.far = 1800;
sun.shadow.bias = -0.00035;
sun.shadow.normalBias = 1.6;
scene.add(sun);
scene.add(sun.target);

const fill = new THREE.DirectionalLight(0xb6ced8, 0.65);
fill.position.set(-120, 90, -140);
scene.add(fill);
scene.add(new THREE.AmbientLight(0xe0e8ea, 0.5));

const world = buildYulongScene();
scene.add(world.group);
window.__yulongTerrainHeight = world.heightAt;

window.__yulong = {
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
window.__yulong.fp = fp;

const dayState = {
  sun: new THREE.Color(0xffd7a2),
  hemiSky: new THREE.Color(0xd8e9f3),
  hemiGround: new THREE.Color(0x6d6a50),
  top: new THREE.Color(0x316a9e),
  horizon: new THREE.Color(0xffd3a4),
  bottom: new THREE.Color(0xbcd6dc),
  fog: new THREE.Color(0xd5d8cc),
  sunPos: new THREE.Vector3(720, 430, -240),
  sunIntensity: 2.95,
  hemiIntensity: 1.95,
  exposure: 1.13,
};

const duskState = {
  sun: new THREE.Color(0xff8e5c),
  hemiSky: new THREE.Color(0x7f8bb1),
  hemiGround: new THREE.Color(0x4b4842),
  top: new THREE.Color(0x202d50),
  horizon: new THREE.Color(0xdb825e),
  bottom: new THREE.Color(0x6c7a8d),
  fog: new THREE.Color(0xb4aaa4),
  sunPos: new THREE.Vector3(-540, 130, 320),
  sunIntensity: 1.75,
  hemiIntensity: 0.9,
  exposure: 1.16,
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
  overview: { p: [0, 215, -770], t: [0, 255, 330] },
  glacier: { p: [250, 110, 70], t: [40, 170, 420] },
  'blue-moon': { p: [30, 62, -500], t: [-185, 22, -190] },
  ganhaizi: { p: [180, 44, -430], t: [40, 52, -160] },
  dusk: { p: [330, 300, -780], t: [0, 280, 340] },
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
  overview: ['玉龙雪山 · 扇子陡', '十三峰雪脊如扇面展开，主峰扇子陡海拔 5596 米，金色晨光越过蓝月谷与甘海子'],
  glacier: ['冰川公园 · 白水一号冰川', '冰舌沿山谷倾泻，蓝冰塔林、冰裂隙与黑色冰碛垄在雪线之上交错铺展'],
  'blue-moon': ['蓝月谷 · 白水河梯级钙华池', '雪山融水漫过白色钙华台地，一池池孔雀蓝在云杉林与雪峰之间层层跌落'],
  ganhaizi: ['甘海子 · 高山草甸', '牦牛散落在海拔三千米的草甸上，五色经幡横跨山谷，远处雪峰终年不化'],
  dusk: ['玉龙暮色', '落日把扇子陡染成玫瑰金，云带沉入蓝月谷，经幡在最后的暖光里猎猎作响'],
};

window.__yulong.views = views;
window.__yulong.notes = notes;

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
    if (view) travelTo(view);
    if (key === 'dusk') {
      envTarget = 1;
      const toggle = document.getElementById('btn-dusk');
      if (toggle) {
        toggle.classList.add('active');
        toggle.textContent = '日间';
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
window.__yulong.interactions = interactions;

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

  const sunDir = tmpSunPos.clone().normalize();
  for (const material of world.waterMaterials || []) {
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
  if (world.lanternMaterial) world.lanternMaterial.emissiveIntensity = THREE.MathUtils.lerp(0.38, 0.9, envMix);
}

function animate() {
  const rawDt = clock.getDelta();
  const dt = Math.min(rawDt, 0.05);
  const time = clock.elapsedTime;

  updateEnvironment(Math.min(rawDt, 0.2));
  for (const material of world.waterMaterials || []) material.uniforms.uTime.value = time;
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
