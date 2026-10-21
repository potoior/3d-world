import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildPutuoshan } from './putuoshan.js';
import { ptextures } from './putuoshanTextures.js';
import { initInteractions } from '../../shared/interactions.js';

const params = new URLSearchParams(window.location.search);
const isCompact = window.innerWidth < 900 || /Mobi|Android/i.test(navigator.userAgent);
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance',
});
const pixelCap = params.has('lowres') ? Number(params.get('lowres')) || 0.6 : isCompact ? 1.35 : 1.7;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, pixelCap));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.enabled = !params.has('noshadow');
renderer.shadowMap.autoUpdate = false;
renderer.shadowMap.needsUpdate = true;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xb8cdd0, 780, 4700);

const camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.8, 9000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.minDistance = 18;
controls.maxDistance = 3000;
controls.maxPolarAngle = Math.PI * 0.66;
controls.autoRotateSpeed = 0.18;

const skyUniforms = {
  topColor: { value: new THREE.Color(0x4d84ad) },
  horizonColor: { value: new THREE.Color(0xd8dccc) },
  bottomColor: { value: new THREE.Color(0x9fb6b7) },
  sunDir: { value: new THREE.Vector3(0.66, 0.35, 0.46).normalize() },
  sunColor: { value: new THREE.Color(0xffe0b2) },
};
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(7200, 48, 28),
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
        vec3 col = mix(bottomColor, horizonColor, smoothstep(-0.18, 0.06, h));
        col = mix(col, topColor, smoothstep(-0.01, 0.48, h));
        float sd = max(dot(dir, normalize(sunDir)), 0.0);
        col += sunColor * pow(sd, 1200.0) * 1.6;
        col += sunColor * pow(sd, 26.0) * 0.18;
        col += sunColor * pow(sd, 5.0) * 0.035;
        float haze = smoothstep(0.16, -0.02, h) * smoothstep(-0.24, -0.01, h);
        col = mix(col, horizonColor * 1.03, haze * 0.25);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  })
);
scene.add(sky);

const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({
  map: ptextures.glow,
  color: 0xffe3b4,
  transparent: true,
  opacity: 0.42,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  fog: false,
}));
sunGlow.scale.set(1150, 1150, 1);
scene.add(sunGlow);

const hemi = new THREE.HemisphereLight(0xc8dde8, 0x6d6c56, 1.24);
scene.add(hemi);
const ambient = new THREE.AmbientLight(0xb3c5ca, 0.52);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xffe5c8, 2.25);
sun.position.set(760, 470, 610);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -660;
sun.shadow.camera.right = 660;
sun.shadow.camera.top = 660;
sun.shadow.camera.bottom = -660;
sun.shadow.camera.near = 20;
sun.shadow.camera.far = 3200;
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 1.4;
scene.add(sun);
scene.add(sun.target);
sun.target.position.set(0, 40, 80);

const fill = new THREE.DirectionalLight(0x8bb6ca, 0.58);
fill.position.set(-620, 320, -520);
scene.add(fill);

let world;
try {
  world = buildPutuoshan();
  scene.add(world.group);
} catch (error) {
  console.error('Putuoshan scene build failed', error);
  const loaderText = document.querySelector('#loader p');
  if (loaderText) loaderText.textContent = '普陀山场景构建失败';
  throw error;
}

const skip = new Set((params.get('skip') || '').split(',').filter(Boolean));
if (skip.has('sea')) world.parts.sea.mesh.visible = false;
if (skip.has('foam')) world.parts.foam.group.visible = false;
if (skip.has('mist')) world.parts.mist.group.visible = false;
if (skip.has('clouds')) world.parts.clouds.group.visible = false;
if (skip.has('incense')) world.parts.incense.group.visible = false;
if (skip.has('flags')) world.parts.flags.group.visible = false;
if (skip.has('crowd')) world.parts.crowd.group.visible = false;
if (skip.has('birds')) world.parts.birds.group.visible = false;
if (skip.has('veg')) world.parts.vegetation.group.visible = false;
if (skip.has('static')) world.merged.visible = false;

const dayState = {
  sun: new THREE.Color(0xffe5c8),
  hemiSky: new THREE.Color(0xc8dde8),
  hemiGround: new THREE.Color(0x6d6c56),
  top: new THREE.Color(0x4d84ad),
  horizon: new THREE.Color(0xd8dccc),
  bottom: new THREE.Color(0x9fb6b7),
  fog: new THREE.Color(0xb8cdd0),
  seaDeep: new THREE.Color(0x0d3542),
  seaShallow: new THREE.Color(0x2d6f70),
  sunPos: new THREE.Vector3(760, 470, 610),
  sunIntensity: 2.25,
  hemiIntensity: 1.24,
  fillIntensity: 0.58,
  exposure: 1.08,
  glow: 0.42,
};
const duskState = {
  sun: new THREE.Color(0xff9861),
  hemiSky: new THREE.Color(0x8c93a8),
  hemiGround: new THREE.Color(0x5d5047),
  top: new THREE.Color(0x273b5c),
  horizon: new THREE.Color(0xdea273),
  bottom: new THREE.Color(0x8b796d),
  fog: new THREE.Color(0xb8a291),
  seaDeep: new THREE.Color(0x12222f),
  seaShallow: new THREE.Color(0x4a5e63),
  sunPos: new THREE.Vector3(-840, 205, 330),
  sunIntensity: 1.75,
  hemiIntensity: 0.6,
  fillIntensity: 0.2,
  exposure: 0.94,
  glow: 0.6,
};

const initial = world.views.overview;
camera.position.set(...initial.p);
controls.target.set(...initial.t);
controls.update();

let envTarget = 0;
let envMix = 0;
let shadowMix = null;
let isDusk = false;
let currentView = 'overview';

const tour = {
  active: false,
  t: 0,
  duration: 2.4,
  fromP: new THREE.Vector3(),
  fromT: new THREE.Vector3(),
  toP: new THREE.Vector3(),
  toT: new THREE.Vector3(),
};

function travelTo(view, duration = 2.4) {
  if (!view) return;
  tour.fromP.copy(camera.position);
  tour.fromT.copy(controls.target);
  tour.toP.set(...view.p);
  tour.toT.set(...view.t);
  tour.t = 0;
  tour.duration = duration;
  tour.active = true;
  controls.autoRotate = false;
  document.getElementById('btn-rotate').classList.remove('active');
}

function setCaption(key) {
  const note = world.notes[key];
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
    currentView = key;
    isDusk = key === 'dusk';
    envTarget = isDusk ? 1 : 0;
    document.querySelectorAll('[data-view]').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    setCaption(key);
    travelTo(world.views[key]);
  });
});

const rotateBtn = document.getElementById('btn-rotate');
rotateBtn.addEventListener('click', () => {
  controls.autoRotate = !controls.autoRotate;
  rotateBtn.classList.toggle('active', controls.autoRotate);
});

controls.addEventListener('start', () => {
  tour.active = false;
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isCompact ? 1.35 : 1.7));
});

const clock = new THREE.Clock();
const tmpSunPos = new THREE.Vector3();
const tmpSeaDeep = new THREE.Color();
const tmpSeaShallow = new THREE.Color();

function updateEnvironment(dt) {
  envMix += (envTarget - envMix) * Math.min(1, dt * 1.5);
  if (Math.abs(envTarget - envMix) < 0.001) envMix = envTarget;
  if (Math.abs(envTarget - envMix) < 0.002 && shadowMix !== envTarget) {
    renderer.shadowMap.needsUpdate = true;
    shadowMix = envTarget;
  }

  sun.color.copy(dayState.sun).lerp(duskState.sun, envMix);
  sun.intensity = THREE.MathUtils.lerp(dayState.sunIntensity, duskState.sunIntensity, envMix);
  tmpSunPos.copy(dayState.sunPos).lerp(duskState.sunPos, envMix);
  sun.position.copy(tmpSunPos);
  sun.target.position.set(0, 40, 80);

  hemi.color.copy(dayState.hemiSky).lerp(duskState.hemiSky, envMix);
  hemi.groundColor.copy(dayState.hemiGround).lerp(duskState.hemiGround, envMix);
  hemi.intensity = THREE.MathUtils.lerp(dayState.hemiIntensity, duskState.hemiIntensity, envMix);
  fill.intensity = THREE.MathUtils.lerp(dayState.fillIntensity, duskState.fillIntensity, envMix);

  skyUniforms.topColor.value.copy(dayState.top).lerp(duskState.top, envMix);
  skyUniforms.horizonColor.value.copy(dayState.horizon).lerp(duskState.horizon, envMix);
  skyUniforms.bottomColor.value.copy(dayState.bottom).lerp(duskState.bottom, envMix);
  skyUniforms.sunColor.value.copy(sun.color);
  skyUniforms.sunDir.value.copy(tmpSunPos).normalize();

  scene.fog.color.copy(dayState.fog).lerp(duskState.fog, envMix);
  renderer.toneMappingExposure = THREE.MathUtils.lerp(dayState.exposure, duskState.exposure, envMix);

  const u = world.seaUniforms;
  u.uSunDir.value.copy(tmpSunPos).normalize();
  u.uSunColor.value.copy(sun.color);
  tmpSeaDeep.copy(dayState.seaDeep).lerp(duskState.seaDeep, envMix);
  tmpSeaShallow.copy(dayState.seaShallow).lerp(duskState.seaShallow, envMix);
  u.uDeep.value.copy(tmpSeaDeep);
  u.uShallow.value.copy(tmpSeaShallow);

  const dir = tmpSunPos.clone().normalize();
  sunGlow.position.copy(dir.multiplyScalar(5600));
  sunGlow.material.opacity = THREE.MathUtils.lerp(dayState.glow, duskState.glow, envMix);
  sunGlow.material.color.copy(sun.color);
}

function animate() {
  const rawDt = clock.getDelta();
  const dt = Math.min(rawDt, 0.05);
  updateEnvironment(Math.min(rawDt, 0.2));
  if (world.update) world.update(clock.elapsedTime, dt);

  if (tour.active) {
    tour.t += rawDt / tour.duration;
    const t = Math.min(1, tour.t);
    const ease = 1 - Math.pow(1 - t, 3);
    camera.position.lerpVectors(tour.fromP, tour.toP, ease);
    controls.target.lerpVectors(tour.fromT, tour.toT, ease);
    if (t >= 1) {
      camera.position.copy(tour.toP);
      controls.target.copy(tour.toT);
      tour.active = false;
    }
  }
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

const interactions = initInteractions({
  views: world.views,
  notes: world.notes,
  camera,
  controls,
  renderer,
  scene,
  canvas,
  fp: null,
  travelTo,
  setCaption,
});
window.__interactions = interactions;

updateEnvironment(1);
animate();

const loader = document.getElementById('loader');
function revealScene() {
  loader.classList.add('hidden');
  document.body.classList.add('ready');
  window.__ready = true;
}
setTimeout(revealScene, 800);
requestAnimationFrame(() => requestAnimationFrame(revealScene));

window.__putuoshan = {
  scene,
  camera,
  renderer,
  controls,
  world,
  views: world.views,
  notes: world.notes,
  travelTo,
  setView: (key) => {
    const btn = document.querySelector(`[data-view="${key}"]`);
    if (btn) btn.click();
  },
  tourState: () => ({
    active: tour.active,
    t: tour.t,
    duration: tour.duration,
    toP: tour.toP.toArray(),
    toT: tour.toT.toArray(),
    elapsed: clock.elapsedTime,
    frame: renderer.info.render.frame,
  }),
  getMetrics: () => ({
    calls: renderer.info.render.calls,
    triangles: renderer.info.render.triangles,
    points: renderer.info.render.points,
    lines: renderer.info.render.lines,
    geometries: renderer.info.memory.geometries,
    textures: renderer.info.memory.textures,
    camera: camera.position.toArray().map((v) => +v.toFixed(2)),
    target: controls.target.toArray().map((v) => +v.toFixed(2)),
    ready: !!window.__ready,
    dusk: isDusk,
    view: currentView,
    vegetation: world.vegetation,
    crowd: world.crowdCount,
  }),
  stats: () => window.__putuoshan.getMetrics(),
  pick: (px, py) => {
    const rc = new THREE.Raycaster();
    rc.setFromCamera(new THREE.Vector2((px / window.innerWidth) * 2 - 1, -(py / window.innerHeight) * 2 + 1), camera);
    const hits = rc.intersectObjects(scene.children, true);
    return hits.slice(0, 4).map((h) => ({
      object: h.object.name || h.object.type,
      distance: +h.distance.toFixed(1),
      point: h.point.toArray().map((v) => +v.toFixed(1)),
    }));
  },
  THREE,
  projectPoint: (x, y, z) => {
    const v = new THREE.Vector3(x, y, z).project(camera);
    return [
      Math.round((v.x * 0.5 + 0.5) * window.innerWidth),
      Math.round((-v.y * 0.5 + 0.5) * window.innerHeight),
      +v.z.toFixed(4),
    ];
  },
};
