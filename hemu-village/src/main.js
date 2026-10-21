import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildHemuScene } from './hemu.js';
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
renderer.toneMappingExposure = 1.12;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xd6ddd2, 420, 2550);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.5, 4200);
camera.position.set(-250, 175, -365);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(22, 38, 95);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.minDistance = 8;
controls.maxDistance = 1750;
controls.maxPolarAngle = Math.PI * 0.492;
controls.autoRotateSpeed = 0.22;
controls.update();

const skyUniforms = {
  topColor: { value: new THREE.Color(0x5c86a4) },
  horizonColor: { value: new THREE.Color(0xe8e5d1) },
  bottomColor: { value: new THREE.Color(0xd3d9c5) },
  sunDir: { value: new THREE.Vector3(-0.42, 0.7, -0.36).normalize() },
  sunColor: { value: new THREE.Color(0xfff0d8) },
};
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(2000, 48, 28),
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

const hemi = new THREE.HemisphereLight(0xdde6df, 0x5a6248, 1.8);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xffefd2, 2.35);
sun.position.set(-240, 280, -150);
sun.castShadow = true;
sun.shadow.mapSize.set(isCompact ? 2048 : 4096, isCompact ? 2048 : 4096);
sun.shadow.camera.left = -320;
sun.shadow.camera.right = 320;
sun.shadow.camera.top = 320;
sun.shadow.camera.bottom = -320;
sun.shadow.camera.near = 20;
sun.shadow.camera.far = 1400;
sun.shadow.bias = -0.00035;
sun.shadow.normalBias = 1.1;
scene.add(sun);
scene.add(sun.target);

const fill = new THREE.DirectionalLight(0xb8c8c8, 0.55);
fill.position.set(170, 120, -170);
scene.add(fill);
scene.add(new THREE.AmbientLight(0xdde4d4, 0.35));

const world = buildHemuScene();
scene.add(world.group);

const views = {
  overview: { p: [-250, 175, -365], t: [22, 38, 95] },
  village: { p: [14, 28, -70], t: [86, 14, 110] },
  river: { p: [-40, 24, -155], t: [8, 20, 115] },
  birch: { p: [-112, 15, -110], t: [-18, 13, 18] },
  dusk: { p: [96, 118, -300], t: [10, 44, 105] },
};

const notes = {
  overview: ['禾木村 · 神的自留地', '木屋炊烟沿禾木河铺展，白桦与金落叶松染透山谷，远处雪峰静立'],
  village: ['图瓦木屋', '原木垒砌的尖顶木屋错落于河岸，晨烟升起，马群在围栏外缓行'],
  river: ['禾木河', '河水从雪峰脚下穿过白桦林，木桥横跨，秋叶顺流而下'],
  birch: ['白桦林', '银白树干与金黄落叶铺满西坡，晨雾在树干之间缓缓流动'],
  dusk: ['禾木暮色', '夕阳把雪峰染成暖金，木屋亮起灯火，炊烟与暮霭沉入河谷'],
};

window.__hemu = {
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
window.__hemu.fp = fp;

const dayState = {
  sun: new THREE.Color(0xffefd2),
  hemiSky: new THREE.Color(0xdde6df),
  hemiGround: new THREE.Color(0x5a6248),
  top: new THREE.Color(0x5c86a4),
  horizon: new THREE.Color(0xe8e5d1),
  bottom: new THREE.Color(0xd3d9c5),
  fog: new THREE.Color(0xd6ddd2),
  sunPos: new THREE.Vector3(-240, 280, -150),
  sunIntensity: 2.35,
  hemiIntensity: 1.8,
  exposure: 1.1,
};

const duskState = {
  sun: new THREE.Color(0xffb079),
  hemiSky: new THREE.Color(0x808ca3),
  hemiGround: new THREE.Color(0x545045),
  top: new THREE.Color(0x2c3e5c),
  horizon: new THREE.Color(0xe4a377),
  bottom: new THREE.Color(0x8a7e80),
  fog: new THREE.Color(0xb9a79b),
  sunPos: new THREE.Vector3(250, 85, 260),
  sunIntensity: 1.65,
  hemiIntensity: 0.85,
  exposure: 1.18,
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
    envTarget = key === 'dusk' ? 1 : 0;
    const toggle = document.getElementById('btn-dusk');
    if (toggle) {
      toggle.classList.toggle('active', envTarget > 0.5);
      toggle.textContent = envTarget > 0.5 ? '日间' : '黄昏';
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
window.__hemu.interactions = interactions;

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
}

function animate() {
  const rawDt = clock.getDelta();
  const dt = Math.min(rawDt, 0.05);
  const time = clock.elapsedTime;

  updateEnvironment(Math.min(rawDt, 0.2));
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
  window.__hemu.ready = true;
});
