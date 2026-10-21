import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildZhaganaScene } from './zhagana.js';
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
scene.fog = new THREE.Fog(0xd0ddd9, 480, 2450);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.5, 3600);
camera.position.set(40, 190, -430);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 80, 220);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.minDistance = 8;
controls.maxDistance = 1500;
controls.maxPolarAngle = Math.PI * 0.492;
controls.autoRotateSpeed = 0.22;
controls.update();

const skyUniforms = {
  topColor: { value: new THREE.Color(0x5f87a1) },
  horizonColor: { value: new THREE.Color(0xe2eae7) },
  bottomColor: { value: new THREE.Color(0xd0dedb) },
  sunDir: { value: new THREE.Vector3(-0.4, 0.72, -0.35).normalize() },
  sunColor: { value: new THREE.Color(0xfff2dc) },
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

const hemi = new THREE.HemisphereLight(0xdbe9ec, 0x5e6f58, 1.85);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xfff2dc, 2.2);
sun.position.set(-160, 230, -120);
sun.castShadow = true;
sun.shadow.mapSize.set(isCompact ? 2048 : 4096, isCompact ? 2048 : 4096);
sun.shadow.camera.left = -290;
sun.shadow.camera.right = 290;
sun.shadow.camera.top = 290;
sun.shadow.camera.bottom = -290;
sun.shadow.camera.near = 20;
sun.shadow.camera.far = 1200;
sun.shadow.bias = -0.00035;
sun.shadow.normalBias = 1.1;
scene.add(sun);
scene.add(sun.target);

const fill = new THREE.DirectionalLight(0xb8ced4, 0.6);
fill.position.set(130, 100, -160);
scene.add(fill);
scene.add(new THREE.AmbientLight(0xdde7da, 0.4));

const world = buildZhaganaScene();
scene.add(world.group);

const views = {
  overview: { p: [40, 190, -430], t: [0, 80, 220] },
  shicheng: { p: [168, 74, -238], t: [-12, 36, 142] },
  xiannütan: { p: [-158, 30, -178], t: [0, 18, 128] },
  guanggai: { p: [118, 152, -312], t: [-18, 176, 522] },
  dusk: { p: [96, 118, -352], t: [0, 64, 232] },
};

const notes = {
  overview: ['扎尕那 · 石城秘境', '灰白石峰环抱藏寨，梯田、草甸与晨雾在峡谷中层层铺展'],
  shicheng: ['石城', '峭壁如天然城墙合围，木屋与经幡沿山坡错落，晨光从垭口缓缓落下'],
  xiannütan: ['仙女滩', '高山草甸铺展于谷底，溪流蜿蜒，牦牛低头啃食带露的青草'],
  guanggai: ['光盖山', '裸露的灰白岩壁如巨大的天然屏障，是扎尕那石城最醒目的背景'],
  dusk: ['扎尕那暮色', '炊烟与晚霞漫过藏寨，石峰沉入蓝灰色的暮霭，溪水映着最后一缕光'],
};

window.__zhagana = {
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
window.__zhagana.fp = fp;

const dayState = {
  sun: new THREE.Color(0xfff2dc),
  hemiSky: new THREE.Color(0xdbe9ec),
  hemiGround: new THREE.Color(0x5e6f58),
  top: new THREE.Color(0x5f87a1),
  horizon: new THREE.Color(0xe2eae7),
  bottom: new THREE.Color(0xd0dedb),
  fog: new THREE.Color(0xd0ddd9),
  sunPos: new THREE.Vector3(-160, 230, -120),
  sunIntensity: 2.2,
  hemiIntensity: 1.85,
  exposure: 1.12,
};

const duskState = {
  sun: new THREE.Color(0xffad78),
  hemiSky: new THREE.Color(0x7f8fa8),
  hemiGround: new THREE.Color(0x545149),
  top: new THREE.Color(0x273a5a),
  horizon: new THREE.Color(0xd38f68),
  bottom: new THREE.Color(0x6f7f92),
  fog: new THREE.Color(0xaaa6ab),
  sunPos: new THREE.Vector3(220, 70, 180),
  sunIntensity: 1.62,
  hemiIntensity: 0.86,
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
window.__zhagana.interactions = interactions;

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
  window.__zhagana.ready = true;
});
