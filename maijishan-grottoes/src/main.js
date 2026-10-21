import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildYungangScene } from './scene.js';
import { buildMaijishanOverlay } from './maijishan.js';
import { createFirstPerson } from './firstperson.js';
import { initInteractions } from '../../shared/interactions.js';

const isCompact = window.innerWidth < 820 || /Mobi|Android/i.test(navigator.userAgent);
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, isCompact ? 1.4 : 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.06;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xccd4c9, 420, 2900);

const camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 1, 7600);
camera.position.set(140, 104, 330);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(420, 80, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.minDistance = 12;
controls.maxDistance = 2300;
controls.maxPolarAngle = Math.PI * 0.492;
controls.autoRotateSpeed = 0.2;
controls.update();

const skyUniforms = {
  topColor: { value: new THREE.Color(0x7fa1b6) },
  horizonColor: { value: new THREE.Color(0xe9ddc5) },
  bottomColor: { value: new THREE.Color(0xc5c1aa) },
  sunDir: { value: new THREE.Vector3(-0.35, 0.62, 0.5).normalize() },
  sunColor: { value: new THREE.Color(0xffedc9) },
};
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(6200, 48, 28),
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
        vec3 col = mix(bottomColor, horizonColor, smoothstep(-0.2, 0.09, h));
        col = mix(col, topColor, smoothstep(0.02, 0.68, h));
        float sd = max(dot(dir, normalize(sunDir)), 0.0);
        float haze = smoothstep(0.26, 0.0, abs(h - 0.025));
        col = mix(col, vec3(0.94, 0.95, 0.91), haze * 0.34);
        float cl = sin(dir.x * 6.1 + 1.1) * sin(dir.z * 4.4 - 0.4) + 0.5 * sin(dir.x * 14.0 - dir.z * 9.0);
        col += vec3(1.0, 0.99, 0.96) * smoothstep(0.55, 1.2, cl) * smoothstep(0.05, 0.36, h) * 0.05;
        col += sunColor * pow(sd, 900.0) * 1.7;
        col += sunColor * pow(sd, 14.0) * 0.16;
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  })
);
scene.add(sky);

const hemi = new THREE.HemisphereLight(0xdbe4dd, 0x76694d, 1.32);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0d3, 2.5);
sun.position.set(150, 560, 420);
sun.castShadow = true;
sun.shadow.mapSize.set(isCompact ? 1536 : 2048, isCompact ? 1536 : 2048);
sun.shadow.camera.left = -520;
sun.shadow.camera.right = 520;
sun.shadow.camera.top = 470;
sun.shadow.camera.bottom = -470;
sun.shadow.camera.near = 30;
sun.shadow.camera.far = 2400;
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 1.5;
scene.add(sun);
sun.target.position.set(430, 60, 0);
scene.add(sun.target);
const fill = new THREE.DirectionalLight(0xbccbc4, 0.52);
fill.position.set(-420, 260, 380);
scene.add(fill);
const ambient = new THREE.AmbientLight(0xdfe2d4, 0.34);
scene.add(ambient);

console.log('MAIN base start');
const world = buildYungangScene();
console.log('MAIN base done');
scene.add(world.group);
scene.add(world.extras.userData.birds);
console.log('MAIN overlay start');
const maijishan = buildMaijishanOverlay();
console.log('MAIN overlay done');
scene.add(maijishan.group);
const waterMaterial = world.waterMaterial;

let fp = null;
const dayState = {
  sun: new THREE.Color(0xfff0d3),
  hemiSky: new THREE.Color(0xdbe4dd),
  hemiGround: new THREE.Color(0x76694d),
  top: new THREE.Color(0x7fa1b6),
  horizon: new THREE.Color(0xe9ddc5),
  bottom: new THREE.Color(0xc5c1aa),
  fog: new THREE.Color(0xccd4c9),
  waterDeep: new THREE.Color(0x35544a),
  waterShallow: new THREE.Color(0x73876a),
  waterSky: new THREE.Color(0xbfcbbc),
  waterTop: new THREE.Color(0x92aaa7),
  waterHorizon: new THREE.Color(0xd8d2bb),
  sunPos: new THREE.Vector3(150, 560, 420),
  sunIntensity: 2.5,
  hemiIntensity: 1.32,
  exposure: 1.06,
};
const duskState = {
  sun: new THREE.Color(0xff9d5f),
  hemiSky: new THREE.Color(0x9da2b5),
  hemiGround: new THREE.Color(0x6a503d),
  top: new THREE.Color(0x2b4164),
  horizon: new THREE.Color(0xe9a071),
  bottom: new THREE.Color(0x82614f),
  fog: new THREE.Color(0xbf9276),
  waterDeep: new THREE.Color(0x28383a),
  waterShallow: new THREE.Color(0x53635a),
  waterSky: new THREE.Color(0xc58f74),
  waterTop: new THREE.Color(0x3e5a78),
  waterHorizon: new THREE.Color(0xe6a878),
  sunPos: new THREE.Vector3(-90, 220, 520),
  sunIntensity: 1.75,
  hemiIntensity: 0.7,
  exposure: 0.99,
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
  overview: { p: [140, 104, 330], t: [420, 80, 0] },
  cliff: { p: [258, 74, 132], t: [397, 96, 8] },
  buddha: { p: [278, 59, 136], t: [336, 60, 54] },
  walkway: { p: [286, 90, 190], t: [360, 58, 12] },
  dusk: { p: [96, 64, 300], t: [420, 72, 0] },
};
const notes = {
  overview: ['麦积山石窟全景', '秦岭西端，赤色砾岩孤峰如麦垛，蜂巢窟龛与凌空栈道层叠而上'],
  cliff: ['崖壁千龛', '东崖西崖密布后秦至明清窟龛，泥塑彩绘与岩体相融，栈道悬于崖腹'],
  buddha: ['东崖大佛', '高逾十五米的泥塑大佛结跏趺坐，胁侍菩萨侍立两侧，木构窟檐翼然'],
  walkway: ['凌空栈道', '木栈盘旋于崖壁，梁柱插入岩孔，连接上下层窟龛，行人如履云中'],
  dusk: ['麦积暮色', '秦岭雾霭漫过崖顶，灯火沿栈道次第亮起，松涛与晚钟相和'],
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
  duskBtn.textContent = envTarget > 0.5 ? '日间' : '夜色';
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

window.__maijishan = {
  scene,
  camera,
  renderer,
  controls,
  world,
  overlay: maijishan,
  life: maijishan.life,
  fp,
  views,
  notes,
  env: () => ({ mix: envMix, target: envTarget }),
  setEnv: (v) => {
    envTarget = v ? 1 : 0;
    duskBtn.classList.toggle('active', envTarget > 0.5);
    duskBtn.textContent = envTarget > 0.5 ? '日间' : '夜色';
  },
  setView: (key) => {
    if (!views[key]) return false;
    camera.position.set(...views[key].p);
    controls.target.set(...views[key].t);
    controls.update();
    setCaption(key);
    return true;
  },
  getStats: () => ({
    calls: renderer.info.render.calls,
    triangles: renderer.info.render.triangles,
    geometries: renderer.info.memory.geometries,
    textures: renderer.info.memory.textures,
  }),
  getState: () => ({ envMix, envTarget, view: controls.target.toArray() }),
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
const birds = world.extras.userData.birds;

function updateEnvironment(dt) {
  envMix += (envTarget - envMix) * Math.min(1, dt * 1.4);
  if (Math.abs(envTarget - envMix) < 0.001) envMix = envTarget;
  sun.color.copy(dayState.sun).lerp(duskState.sun, envMix);
  sun.intensity = THREE.MathUtils.lerp(dayState.sunIntensity, duskState.sunIntensity, envMix);
  tmpSunPos.copy(dayState.sunPos).lerp(duskState.sunPos, envMix);
  sun.position.copy(tmpSunPos);
  sun.target.position.set(430, 60, 0);
  hemi.color.copy(dayState.hemiSky).lerp(duskState.hemiSky, envMix);
  hemi.groundColor.copy(dayState.hemiGround).lerp(duskState.hemiGround, envMix);
  hemi.intensity = THREE.MathUtils.lerp(dayState.hemiIntensity, duskState.hemiIntensity, envMix);
  skyUniforms.topColor.value.copy(dayState.top).lerp(duskState.top, envMix);
  skyUniforms.horizonColor.value.copy(dayState.horizon).lerp(duskState.horizon, envMix);
  skyUniforms.bottomColor.value.copy(dayState.bottom).lerp(duskState.bottom, envMix);
  skyUniforms.sunColor.value.copy(sun.color);
  skyUniforms.sunDir.value.copy(tmpSunPos).sub(sun.target.position).normalize();
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
  if (maijishan.life) maijishan.life.update(time);
  if (birds) {
    birds.rotation.y = Math.sin(time * 0.04) * 0.18;
    birds.position.y = Math.sin(time * 0.2) * 2.4;
  }
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

console.log('MAIN animate start');
updateEnvironment(1);
animate();
console.log('MAIN animate returned');

const loader = document.getElementById('loader');
requestAnimationFrame(() => {
  loader.classList.add('hidden');
  loader.style.pointerEvents = 'none';
  document.body.classList.add('ready');
  setTimeout(() => {
    loader.style.display = 'none';
  }, 1500);
});
