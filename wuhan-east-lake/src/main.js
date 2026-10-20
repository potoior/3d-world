import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildEastLakeScene } from './layout.js';
import { createFirstPerson } from './firstperson.js';
import { updateLakeLife } from './lakeLife.js';
import { mats } from './materials.js';
import { initInteractions } from '../../shared/interactions.js';

const isCompact = window.innerWidth < 820 || /Mobi|Android/i.test(navigator.userAgent);
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, isCompact ? 1.25 : 1.6));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.02;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xc6d2ce, 620, 3300);

const camera = new THREE.PerspectiveCamera(56, window.innerWidth / window.innerHeight, 1, 6000);
camera.position.set(-560, 90, 250);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(-382, 10, -8);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.minDistance = 15;
controls.maxDistance = 2600;
controls.maxPolarAngle = Math.PI * 0.492;
controls.autoRotateSpeed = 0.25;
controls.update();

const skyUniforms = {
  topColor: { value: new THREE.Color(0x6f95ad) },
  horizonColor: { value: new THREE.Color(0xd3dde0) },
  bottomColor: { value: new THREE.Color(0xbccbd0) },
  sunDir: { value: new THREE.Vector3(0.5, 0.65, 0.4).normalize() },
  sunColor: { value: new THREE.Color(0xfff2d4) },
};
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(5000, 48, 28),
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
        float haze = smoothstep(0.16, 0.0, abs(h - 0.02));
        col = mix(col, vec3(0.91, 0.94, 0.92), haze * 0.24);
        float cl = sin(dir.x * 7.0 + 1.3) * sin(dir.z * 5.0 - 0.6) + 0.5 * sin(dir.x * 16.0 - dir.z * 11.0);
        col += vec3(1.0, 0.99, 0.96) * smoothstep(0.55, 1.2, cl) * smoothstep(0.04, 0.4, h) * 0.06;
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

const hemi = new THREE.HemisphereLight(0xd7e6ea, 0x7b876c, 1.5);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xfff1da, 2.55);
sun.position.set(380, 950, 620);
sun.castShadow = true;
sun.shadow.mapSize.set(isCompact ? 1024 : 2048, isCompact ? 1024 : 2048);
sun.shadow.camera.left = -880;
sun.shadow.camera.right = 880;
sun.shadow.camera.top = 760;
sun.shadow.camera.bottom = -760;
sun.shadow.camera.near = 40;
sun.shadow.camera.far = 2600;
sun.shadow.bias = -0.00035;
sun.shadow.normalBias = 1.8;
scene.add(sun);
scene.add(sun.target);

const fill = new THREE.DirectionalLight(0xb8ccd2, 0.7);
fill.position.set(-500, 300, 300);
scene.add(fill);
const ambient = new THREE.AmbientLight(0xd9e4df, 0.36);
scene.add(ambient);

const world = buildEastLakeScene();
scene.add(world.group);
scene.add(world.extras);
const waterMaterial = world.waterMaterial;

window.__eastlake = { scene, camera, renderer, controls, world };
window.__eastlake.stats = () => ({
  calls: renderer.info.render.calls,
  triangles: renderer.info.render.triangles,
  geometries: renderer.info.memory.geometries,
  textures: renderer.info.memory.textures,
});

let fp = null;

const dayState = {
  sun: new THREE.Color(0xfff1da),
  hemiSky: new THREE.Color(0xd7e6ea),
  hemiGround: new THREE.Color(0x7b876c),
  top: new THREE.Color(0x6f95ad),
  horizon: new THREE.Color(0xd3dde0),
  bottom: new THREE.Color(0xbccbd0),
  fog: new THREE.Color(0xc6d2ce),
  waterDeep: new THREE.Color(0x2e5050),
  waterShallow: new THREE.Color(0x4f7f80),
  waterSky: new THREE.Color(0x9dbccb),
  waterTop: new THREE.Color(0x6f9697),
  waterHorizon: new THREE.Color(0xb9cbc8),
  sunPos: new THREE.Vector3(420, 900, 620),
  sunIntensity: 2.55,
  hemiIntensity: 1.5,
  exposure: 1.02,
};

const duskState = {
  sun: new THREE.Color(0xff9b55),
  hemiSky: new THREE.Color(0x93a6c2),
  hemiGround: new THREE.Color(0x74604d),
  top: new THREE.Color(0x2c4a70),
  horizon: new THREE.Color(0xec9d63),
  bottom: new THREE.Color(0x8a6a5e),
  fog: new THREE.Color(0xc28f6f),
  waterDeep: new THREE.Color(0x152b38),
  waterShallow: new THREE.Color(0x2b4d55),
  waterSky: new THREE.Color(0xc48f74),
  waterTop: new THREE.Color(0x3c5c7e),
  waterHorizon: new THREE.Color(0xe7a677),
  sunPos: new THREE.Vector3(-700, 250, 250),
  sunIntensity: 1.8,
  hemiIntensity: 0.6,
  exposure: 0.98,
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
  overview: { p: [-560, 90, 250], t: [-382, 10, -8] },
  tingtao: { p: [-268, 58, 120], t: [-418, 16, 70] },
  xingyin: { p: [-480, 46, 72], t: [-382, -35, -8] },
  chutian: { p: [320, 140, 160], t: [600, -20, -110] },
  cherry: { p: [-380, 50, 830], t: [-322, 8, 738] },
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

const notes = {
  overview: ['东湖', '西岸行吟阁、磨山楚天台与开阔湖面相映，环湖绿道穿林临水'],
  tingtao: ['听涛景区', '西岸临水而筑，长天楼、听涛轩与垂柳荷风隐于湖湾'],
  xingyin: ['行吟阁', '小岛上的三层绿瓦楼阁，长堤石桥卧波，取屈原行吟泽畔之意'],
  chutian: ['楚天台', '磨山之巅的层台高阁，石阶直下湖岸，可俯瞰东湖与武汉三镇'],
  cherry: ['东湖樱园', '磨山南麓的樱花林，粉云夹道，落英映水，春日游人如织'],
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

window.__fp = fp;
window.__eastlake.fp = fp;

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

  mats.lantern.emissiveIntensity = 0.42 + envMix * 1.35;
  mats.paper.emissiveIntensity = 0.4 + envMix * 1.15;
  mats.paper.color.setHex(envMix > 0.45 ? 0xffc27a : 0xf1d7a2);
  tmpColor.setHex(0xffd9a3);
  skyUniforms.sunColor.value.lerp(tmpColor, envMix * 0.08);
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

  const birds = world.extras.userData.birds;
  if (birds) {
    birds.rotation.y = Math.sin(time * 0.045) * 0.22;
    birds.position.y = Math.sin(time * 0.22) * 3.2;
  }
  const life = world.extras.userData.life;
  if (life) updateLakeLife(life, time);
  const refineLife = world.extras.userData.refineLife;
  if (refineLife) refineLife.update(time);
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
  document.body.classList.add('ready');
});
