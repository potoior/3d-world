import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildKanasScene } from './layout.js';
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
renderer.toneMappingExposure = 1.1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xc7dde2, 380, 2400);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.5, 3400);
camera.position.set(-70, 120, -350);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(20, 24, 140);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.minDistance = 8;
controls.maxDistance = 1350;
controls.maxPolarAngle = Math.PI * 0.492;
controls.autoRotateSpeed = 0.22;
controls.update();

const skyUniforms = {
  topColor: { value: new THREE.Color(0x4f86b8) },
  horizonColor: { value: new THREE.Color(0xdfeaec) },
  bottomColor: { value: new THREE.Color(0xc4dbe0) },
  sunDir: { value: new THREE.Vector3(0.45, 0.72, -0.3).normalize() },
  sunColor: { value: new THREE.Color(0xfff4e2) },
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

const hemi = new THREE.HemisphereLight(0xd8e7ee, 0x5b6f58, 1.75);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xfff4e2, 2.4);
sun.position.set(180, 220, -60);
sun.castShadow = true;
sun.shadow.mapSize.set(isCompact ? 2048 : 4096, isCompact ? 2048 : 4096);
sun.shadow.camera.left = -270;
sun.shadow.camera.right = 270;
sun.shadow.camera.top = 270;
sun.shadow.camera.bottom = -270;
sun.shadow.camera.near = 20;
sun.shadow.camera.far = 950;
sun.shadow.bias = -0.00035;
sun.shadow.normalBias = 1.2;
scene.add(sun);
scene.add(sun.target);

const fill = new THREE.DirectionalLight(0xb6ced8, 0.85);
fill.position.set(-140, 100, -150);
scene.add(fill);
scene.add(new THREE.AmbientLight(0xdde7da, 0.46));

const world = buildKanasScene();
scene.add(world.group);
const waterMaterial = world.waterMaterial;

window.__kanas = {
  scene,
  camera,
  renderer,
  controls,
  world,
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
window.__kanas.fp = fp;

const dayState = {
  sun: new THREE.Color(0xfff4e2),
  hemiSky: new THREE.Color(0xd8e7ee),
  hemiGround: new THREE.Color(0x5b6f58),
  top: new THREE.Color(0x4f86b8),
  horizon: new THREE.Color(0xdfeaec),
  bottom: new THREE.Color(0xc4dbe0),
  fog: new THREE.Color(0xc7dde2),
  waterDeep: new THREE.Color(0x0d4b58),
  waterShallow: new THREE.Color(0x46b3a7),
  waterSky: new THREE.Color(0xbad9de),
  sunPos: new THREE.Vector3(180, 220, -60),
  sunIntensity: 2.4,
  hemiIntensity: 1.75,
  exposure: 1.1,
};

const duskState = {
  sun: new THREE.Color(0xffab74),
  hemiSky: new THREE.Color(0x8199b8),
  hemiGround: new THREE.Color(0x545a50),
  top: new THREE.Color(0x2e4567),
  horizon: new THREE.Color(0xd9a38a),
  bottom: new THREE.Color(0x7e8797),
  fog: new THREE.Color(0xb9bcc9),
  waterDeep: new THREE.Color(0x113f4c),
  waterShallow: new THREE.Color(0x4e8f8d),
  waterSky: new THREE.Color(0xd0a891),
  sunPos: new THREE.Vector3(-230, 80, 220),
  sunIntensity: 1.7,
  hemiIntensity: 0.95,
  exposure: 1.14,
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
  overview: { p: [-70, 120, -350], t: [20, 24, 140] },
  lake: { p: [64, 15, -128], t: [-8, 3, 20] },
  bend: { p: [112, 46, 10], t: [30, 2, 300] },
  village: { p: [246, 22, 68], t: [166, 5, 30] },
  forest: { p: [-112, 18, -150], t: [-200, 16, -30] },
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
  overview: ['喀纳斯', '阿尔泰山深处的冰碛湖泊，雪峰、泰加林与图瓦木屋沿湖铺展'],
  lake: ['喀纳斯湖', '冰川融水汇成翡翠湖面，水色由浅碧到深青层层递进，涟漪映着天光'],
  bend: ['喀纳斯河湾', '河水在草甸间回环转折，云杉与落叶松沿岸而立，晨雾漫过水面'],
  village: ['图瓦村落', '原木小屋、木栅栏与马厩散落草坡，炊烟升起，牧马人收拾鞍具'],
  forest: ['泰加林', '云杉、落叶松与白桦混生，树皮纹理与针叶层次在栈道旁清晰可辨'],
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
window.__kanas.interactions = interactions;

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

  waterMaterial.uniforms.uSun.value.copy(sun.color);
  waterMaterial.uniforms.uSunDir.value.copy(tmpSunPos).normalize();
  waterMaterial.uniforms.uDeep.value.copy(dayState.waterDeep).lerp(duskState.waterDeep, envMix);
  waterMaterial.uniforms.uShallow.value.copy(dayState.waterShallow).lerp(duskState.waterShallow, envMix);
  waterMaterial.uniforms.uSky.value.copy(dayState.waterSky).lerp(duskState.waterSky, envMix);
  if (world.windowMaterial) {
    world.windowMaterial.emissiveIntensity = THREE.MathUtils.lerp(0.35, 1.15, envMix);
  }
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
  requestAnimationFrame(animate);
}

updateEnvironment(1);
animate();

const loader = document.getElementById('loader');
requestAnimationFrame(() => {
  loader.classList.add('hidden');
  document.body.classList.add('ready');
});
