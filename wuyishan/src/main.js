import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildWuyishanScene } from './scene.js';
import { createFirstPerson } from './firstperson.js';
import { updateRafts } from './life.js';
import { initInteractions } from '../../shared/interactions.js';

const isCompact = window.innerWidth < 820 || /Mobi|Android/i.test(navigator.userAgent);
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, isCompact ? 1.4 : 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.04;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xd6d6c6, 560, 2600);

const camera = new THREE.PerspectiveCamera(54, window.innerWidth / window.innerHeight, 1, 6200);
camera.position.set(470, 255, 1010);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 28, 120);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.minDistance = 12;
controls.maxDistance = 2100;
controls.maxPolarAngle = Math.PI * 0.492;
controls.autoRotateSpeed = 0.22;
controls.update();

const skyUniforms = {
  topColor: { value: new THREE.Color(0x789ca8) },
  horizonColor: { value: new THREE.Color(0xe5e2d4) },
  bottomColor: { value: new THREE.Color(0xc3c9b8) },
  sunDir: { value: new THREE.Vector3(0.5, 0.65, 0.4).normalize() },
  sunColor: { value: new THREE.Color(0xfff0cf) },
};
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(5200, 48, 28),
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
        float haze = smoothstep(0.2, 0.0, abs(h - 0.03));
        col = mix(col, vec3(0.93, 0.95, 0.92), haze * 0.3);
        float cl = sin(dir.x * 6.5 + 1.3) * sin(dir.z * 4.7 - 0.6) + 0.5 * sin(dir.x * 15.0 - dir.z * 10.0);
        col += vec3(1.0, 0.99, 0.96) * smoothstep(0.55, 1.2, cl) * smoothstep(0.05, 0.38, h) * 0.05;
        col += sunColor * pow(sd, 800.0) * 1.6;
        col += sunColor * pow(sd, 12.0) * 0.15;
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  })
);
scene.add(sky);

const hemi = new THREE.HemisphereLight(0xe0e6da, 0x7b6a50, 1.52);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffefcf, 2.5);
sun.position.set(380, 900, 620);
sun.castShadow = true;
sun.shadow.mapSize.set(isCompact ? 1536 : 2048, isCompact ? 1536 : 2048);
sun.shadow.camera.left = -700;
sun.shadow.camera.right = 700;
sun.shadow.camera.top = 620;
sun.shadow.camera.bottom = -620;
sun.shadow.camera.near = 30;
sun.shadow.camera.far = 2200;
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 1.6;
scene.add(sun);
scene.add(sun.target);
const fill = new THREE.DirectionalLight(0xc8d3cd, 0.6);
fill.position.set(-520, 280, 340);
scene.add(fill);
const ambient = new THREE.AmbientLight(0xe1e3d4, 0.34);
scene.add(ambient);

const world = buildWuyishanScene();
scene.add(world.group);
scene.add(world.extras);
const waterMaterial = world.waterMaterial;

let fp = null;
const dayState = {
  sun: new THREE.Color(0xfff0d4),
  hemiSky: new THREE.Color(0xdfe7df),
  hemiGround: new THREE.Color(0x7b6a50),
  top: new THREE.Color(0x789ca8),
  horizon: new THREE.Color(0xe5e2d4),
  bottom: new THREE.Color(0xc3c9b8),
  fog: new THREE.Color(0xd6d6c6),
  waterDeep: new THREE.Color(0x2a6d66),
  waterShallow: new THREE.Color(0x7cb9a6),
  waterSky: new THREE.Color(0xc9ddd5),
  waterTop: new THREE.Color(0x8fbdb8),
  waterHorizon: new THREE.Color(0xe2e4d7),
  sunPos: new THREE.Vector3(420, 900, 620),
  sunIntensity: 2.5,
  hemiIntensity: 1.52,
  exposure: 1.05,
};
const duskState = {
  sun: new THREE.Color(0xff9454),
  hemiSky: new THREE.Color(0x9aa6bb),
  hemiGround: new THREE.Color(0x705a45),
  top: new THREE.Color(0x304764),
  horizon: new THREE.Color(0xe99b68),
  bottom: new THREE.Color(0x7f6154),
  fog: new THREE.Color(0xc08a70),
  waterDeep: new THREE.Color(0x19373c),
  waterShallow: new THREE.Color(0x4a6a5d),
  waterSky: new THREE.Color(0xc99274),
  waterTop: new THREE.Color(0x3c5b75),
  waterHorizon: new THREE.Color(0xe6a06f),
  sunPos: new THREE.Vector3(-650, 230, 350),
  sunIntensity: 1.75,
  hemiIntensity: 0.64,
  exposure: 1.0,
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
  overview: { p: [470, 255, 1010], t: [0, 28, 120] },
  jiuqu: { p: [178, 34, 620], t: [80, 12, 250] },
  yulinu: { p: [282, 92, 438], t: [58, 70, 252] },
  tea: { p: [160, 70, 610], t: [-40, 20, 510] },
  clouds: { p: [520, 330, 760], t: [0, 48, 260] },
};
const notes = {
  overview: ['武夷山 · 九曲溪', '赤壁丹崖夹九曲，竹筏凌波入画中'],
  jiuqu: ['九曲溪', '溪流九折，清浅见底，竹筏载着茶客缓缓穿过丹霞峡谷'],
  yulinu: ['玉女峰', '红岩如削，横纹层叠，崖壁洞穴间垂挂青藤与野兰'],
  tea: ['大红袍茶山', '梯级茶园沿坡而上，茶农采撷，茶亭旗幡在雾中轻扬'],
  clouds: ['云海', '晨雾漫过九曲，丹崖只露峰顶，白鹭掠云而飞'],
};

function travelTo(view) {
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
    if (fp && fp.isActive()) fp.exit();
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

fp = createFirstPerson({
  camera,
  controls,
  canvas,
  onEnter: () => {
    tour.active = false;
    controls.autoRotate = false;
    rotateBtn.classList.remove('active');
  },
});

window.__wuyishan = {
  scene,
  camera,
  renderer,
  controls,
  world,
  fp,
  views,
  notes,
  travelTo,
  env: () => ({ mix: envMix, target: envTarget }),
  projectPoint: (x, y, z) => {
    const v = new THREE.Vector3(x, y, z).project(camera);
    return {
      x: ((v.x + 1) / 2) * window.innerWidth,
      y: ((1 - v.y) / 2) * window.innerHeight,
      z: v.z,
    };
  },
};
window.__fp = fp;
window.__stats = () => ({
  calls: renderer.info.render.calls,
  triangles: renderer.info.render.triangles,
  geometries: renderer.info.memory.geometries,
  textures: renderer.info.memory.textures,
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
const tmpSunPos = new THREE.Vector3();
const rafts = world.extras.userData.rafts;
const egrets = world.extras.userData.egrets;
const mist = world.extras.userData.mist;
const teaFlags = world.extras.userData.teaFlags;
const refineLife = world.extras.userData.refineLife;

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
  waterMaterial.uniforms.uTop.value.copy(dayState.waterTop).lerp(duskState.waterTop, envMix);
  waterMaterial.uniforms.uHorizon.value.copy(dayState.waterHorizon).lerp(duskState.waterHorizon, envMix);
  waterMaterial.uniforms.uShallow.value.copy(dayState.waterShallow).lerp(duskState.waterShallow, envMix);
  waterMaterial.uniforms.fogColor.value.copy(scene.fog.color);
  waterMaterial.uniforms.fogNear.value = scene.fog.near;
  waterMaterial.uniforms.fogFar.value = scene.fog.far;
}

function animate() {
  const rawDt = clock.getDelta();
  const dt = Math.min(rawDt, 0.05);
  const time = clock.elapsedTime;
  updateEnvironment(Math.min(rawDt, 0.2));
  waterMaterial.uniforms.uTime.value = time;
  if (tour.active) {
    tour.t += rawDt / tour.duration;
    const t = Math.min(1, tour.t);
    const ease = 1 - Math.pow(1 - t, 3);
    camera.position.lerpVectors(tour.fromP, tour.toP, ease);
    controls.target.lerpVectors(tour.fromT, tour.toT, ease);
    if (t >= 1) tour.active = false;
  }
  if (rafts) updateRafts(rafts, time);
  if (refineLife) refineLife.update(time);
  if (egrets && egrets.userData.update) egrets.userData.update(time);
  if (mist && mist.userData.update) mist.userData.update(time);
  if (teaFlags && teaFlags.userData.update) teaFlags.userData.update(time);
  if (fp.isActive()) fp.update(dt);
  else controls.update();
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
  loader.style.pointerEvents = 'none';
  document.body.classList.add('ready');
  setTimeout(() => {
    loader.style.display = 'none';
  }, 1500);
});
