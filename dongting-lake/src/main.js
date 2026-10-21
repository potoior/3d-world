import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildDongtingScene } from './dongting.js';
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
scene.fog = new THREE.Fog(0xd2dedb, 420, 2900);

const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.5, 6000);
camera.position.set(285, 120, 590);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(-30, 20, 10);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.minDistance = 8;
controls.maxDistance = 2200;
controls.maxPolarAngle = Math.PI * 0.492;
controls.autoRotateSpeed = 0.22;
controls.update();

const skyUniforms = {
  topColor: { value: new THREE.Color(0x7fa5bd) },
  horizonColor: { value: new THREE.Color(0xecf0e8) },
  bottomColor: { value: new THREE.Color(0xd6e1da) },
  sunDir: { value: new THREE.Vector3(0.45, 0.72, -0.3).normalize() },
  sunColor: { value: new THREE.Color(0xfff2d4) },
};
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(4400, 48, 28),
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

const hemi = new THREE.HemisphereLight(0xdfeef0, 0x6f8760, 1.85);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xfff3df, 2.2);
sun.position.set(300, 215, 160);
sun.castShadow = true;
sun.shadow.mapSize.set(isCompact ? 2048 : 4096, isCompact ? 2048 : 4096);
sun.shadow.camera.left = -560;
sun.shadow.camera.right = 560;
sun.shadow.camera.top = 560;
sun.shadow.camera.bottom = -560;
sun.shadow.camera.near = 20;
sun.shadow.camera.far = 1700;
sun.shadow.bias = -0.00035;
sun.shadow.normalBias = 1.2;
scene.add(sun);
scene.add(sun.target);

const fill = new THREE.DirectionalLight(0xb6ced8, 0.65);
fill.position.set(-120, 90, -140);
scene.add(fill);
scene.add(new THREE.AmbientLight(0xdde7da, 0.42));

const world = buildDongtingScene();
scene.add(world.group);
const waterMaterial = world.waterMaterial;

window.__dongting = {
  scene, camera, renderer, controls, world, stats: world.stats,
  title: '洞庭湖', subtitle: '湖南·八百里洞庭',
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
window.__dongting.fp = fp;

const dayState = {
  sun: new THREE.Color(0xfff1da),
  hemiSky: new THREE.Color(0xdfecef),
  hemiGround: new THREE.Color(0x6b7c5b),
  top: new THREE.Color(0x7f9fb6),
  horizon: new THREE.Color(0xdde6e2),
  bottom: new THREE.Color(0xcfd9d0),
  fog: new THREE.Color(0xd2dedb),
  waterDeep: new THREE.Color(0x2a4650),
  waterShallow: new THREE.Color(0x78939a),
  waterSky: new THREE.Color(0xcfd8d6),
  sunPos: new THREE.Vector3(300, 215, 160),
  sunIntensity: 2.3,
  hemiIntensity: 1.9,
  exposure: 1.12,
};

const duskState = {
  sun: new THREE.Color(0xff9a5c),
  hemiSky: new THREE.Color(0x8d9bb6),
  hemiGround: new THREE.Color(0x635b4c),
  top: new THREE.Color(0x364760),
  horizon: new THREE.Color(0xf2b27b),
  bottom: new THREE.Color(0x8f7a68),
  fog: new THREE.Color(0xd0a987),
  waterDeep: new THREE.Color(0x1d3d43),
  waterShallow: new THREE.Color(0x5e7a66),
  waterSky: new THREE.Color(0xd9a077),
  sunPos: new THREE.Vector3(-300, 78, 260),
  sunIntensity: 1.75,
  hemiIntensity: 0.98,
  exposure: 1.2,
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
  overview: { p: [285, 120, 590], t: [-30, 20, 10] },
  yueyang: { p: [98, 33, 62], t: [40, 18, -10] },
  junshan: { p: [292, 54, 18], t: [150, 14, -172] },
  birds: { p: [170, 26, 192], t: [96, 54, -130] },
  dusk: { p: [430, 82, 420], t: [-40, 14, -120] },
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
  overview: ['洞庭湖 · 全景', '八百里洞庭横无际涯，岳阳楼临湖而立，君山浮于潇湘烟水'],
  yueyang: ['岳阳楼', '三层飞檐临湖而起，衔远山，吞长江，气象万千'],
  junshan: ['君山岛', '茶垄层叠，竹影摇风，湘妃祠隐于洞庭烟波'],
  birds: ['洞庭候鸟', '雁阵横空，白鹭点数，冬候鸟栖于苇荡莲塘'],
  dusk: ['洞庭暮色', '落日熔金，潇湘雾起，归帆与雁影没入苍茫'],
};
window.__dongting.views = views;
window.__dongting.notes = notes;

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
    if (!view) return;
    document.querySelectorAll('[data-view]').forEach((b) => b.classList.toggle('active', b === btn));
    setCaption(key);
    setDuskMode(key === 'dusk');
    travelTo(view);
  });
});
document.querySelector('[data-view="overview"]')?.classList.add('active');

function setDuskMode(on) {
  envTarget = on ? 1 : 0;
  const btn = document.getElementById('btn-dusk');
  if (!btn) return;
  btn.classList.toggle('active', on);
  btn.textContent = on ? '日间' : '黄昏';
}

const rotateBtn = document.getElementById('btn-rotate');
rotateBtn.addEventListener('click', () => {
  controls.autoRotate = !controls.autoRotate;
  rotateBtn.classList.toggle('active', controls.autoRotate);
});

const duskBtn = document.getElementById('btn-dusk');
duskBtn.addEventListener('click', () => {
  setDuskMode(envTarget < 0.5);
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
window.__dongting.interactions = interactions;
window.__dongting.env = () => ({ target: envTarget, mix: envMix, dusk: envTarget > 0.5 });
window.__dongting.getStats = () => ({
  calls: renderer.info.render.calls,
  triangles: renderer.info.render.triangles,
  geometries: renderer.info.memory.geometries,
  textures: renderer.info.memory.textures,
  ...world.stats,
});
window.__dongting.info = () => ({
  title: '洞庭湖',
  subtitle: '湖南·八百里洞庭',
  views: Object.keys(views),
  islands: world.stats.islands,
  boats: world.stats.boats,
  birds: world.stats.birds + world.stats.cranes,
  reeds: world.stats.reeds,
  lotus: world.stats.lotus,
  tea: world.stats.tea,
  houses: world.stats.houses,
  calls: renderer.info.render.calls,
  triangles: renderer.info.render.triangles,
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
  waterMaterial.uniforms.uShallow.value.copy(dayState.waterShallow).lerp(duskState.waterShallow, envMix);
  waterMaterial.uniforms.uSky.value.copy(dayState.waterSky).lerp(duskState.waterSky, envMix);
  if (world.lanternMaterial) world.lanternMaterial.emissiveIntensity = THREE.MathUtils.lerp(0.55, 1.0, envMix);
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
  if (window.__dongting) {
    window.__dongting.stats.calls = renderer.info.render.calls;
    window.__dongting.stats.triangles = renderer.info.render.triangles;
  }
  requestAnimationFrame(animate);
}

updateEnvironment(1);
animate();

const loader = document.getElementById('loader');
requestAnimationFrame(() => {
  loader.classList.add('hidden');
  document.body.classList.add('ready');
  setTimeout(() => {
    loader.style.display = 'none';
  }, 1400);
});
