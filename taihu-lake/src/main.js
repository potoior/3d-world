import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildTaihuScene } from './taihu.js';
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
scene.fog = new THREE.Fog(0xd8e4de, 380, 2350);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.5, 4600);
camera.position.set(-200, 265, 735);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(-75, 8, -110);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.minDistance = 8;
controls.maxDistance = 1900;
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
  new THREE.SphereGeometry(3400, 48, 28),
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
sun.position.set(140, 180, -80);
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

const world = buildTaihuScene();
scene.add(world.group);
const waterMaterial = world.waterMaterial;

window.__taihu = {
  scene, camera, renderer, controls, world, stats: world.stats,
  title: '太湖', subtitle: '江苏·江南水韵',
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
window.__taihu.fp = fp;

const dayState = {
  sun: new THREE.Color(0xfff3dc),
  hemiSky: new THREE.Color(0xdfeef0),
  hemiGround: new THREE.Color(0x6f8760),
  top: new THREE.Color(0x7fa5bd),
  horizon: new THREE.Color(0xecf0e8),
  bottom: new THREE.Color(0xd6e1da),
  fog: new THREE.Color(0xd8e4de),
  waterDeep: new THREE.Color(0x24524d),
  waterShallow: new THREE.Color(0x6f9a7c),
  waterSky: new THREE.Color(0xc9d9cf),
  sunPos: new THREE.Vector3(140, 190, -90),
  sunIntensity: 2.25,
  hemiIntensity: 1.9,
  exposure: 1.12,
};

const duskState = {
  sun: new THREE.Color(0xffa064),
  hemiSky: new THREE.Color(0x8f9db8),
  hemiGround: new THREE.Color(0x665d4d),
  top: new THREE.Color(0x3b4d68),
  horizon: new THREE.Color(0xf0b47e),
  bottom: new THREE.Color(0x917b68),
  fog: new THREE.Color(0xcfaa88),
  waterDeep: new THREE.Color(0x1b3f45),
  waterShallow: new THREE.Color(0x617b66),
  waterSky: new THREE.Color(0xdaa075),
  sunPos: new THREE.Vector3(-260, 85, 240),
  sunIntensity: 1.7,
  hemiIntensity: 0.95,
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

const views = {
  overview: { p: [-200, 265, 735], t: [-75, 8, -110] },
  yuantouzhu: { p: [155, 48, 270], t: [-120, 18, 70] },
  sanshan: { p: [-70, 62, 45], t: [190, 16, -205] },
  boats: { p: [-5, 13, 155], t: [120, 5, 25] },
  dusk: { p: [330, 58, 300], t: [-90, 10, -130] },
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
  overview: ['太湖 · 全景', '三万六千顷碧波，鼋头渚与三山仙岛浮于烟水之间'],
  yuantouzhu: ['鼋头渚 · 灯塔', '长春桥畔樱云如雪，灯塔临水，湖山第一佳绝处'],
  sanshan: ['三山仙岛', '三峰浮玉，拱桥相连，楼阁隐现于太湖烟波'],
  boats: ['太湖帆影', '七桅帆船与渔舟逐浪，白鹭掠水，苇荡摇风'],
  dusk: ['太湖暮色', '落日熔金，远岛如黛，归帆与飞鸟没入苍茫'],
};
window.__taihu.views = views;
window.__taihu.notes = notes;

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
window.__taihu.interactions = interactions;
window.__taihu.env = () => ({ target: envTarget, mix: envMix, dusk: envTarget > 0.5 });
window.__taihu.getStats = () => ({
  calls: renderer.info.render.calls,
  triangles: renderer.info.render.triangles,
  geometries: renderer.info.memory.geometries,
  textures: renderer.info.memory.textures,
  ...world.stats,
});
window.__taihu.info = () => ({
  title: '太湖',
  subtitle: '江苏·江南水韵',
  views: Object.keys(views),
  islands: world.stats.islands,
  boats: world.stats.boats,
  birds: world.stats.birds,
  cherryTrees: world.stats.cherryTrees,
  reeds: world.stats.reeds,
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
  if (world.lanternMaterial) world.lanternMaterial.emissiveIntensity = THREE.MathUtils.lerp(0.38, 0.9, envMix);
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
  if (window.__taihu) {
    window.__taihu.stats.calls = renderer.info.render.calls;
    window.__taihu.stats.triangles = renderer.info.render.triangles;
  }
  requestAnimationFrame(animate);
}

updateEnvironment(1);
animate();

const loader = document.getElementById('loader');
requestAnimationFrame(() => {
  loader.classList.add('hidden');
  document.body.classList.add('ready');
});
