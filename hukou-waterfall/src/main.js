import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildHukou } from './layout.js';
import { createHukouOverlay } from './hukou.js';
import { createFirstPerson } from './firstperson.js';
import { initInteractions } from '../../shared/interactions.js';

const isCompact = window.innerWidth < 900 || /Mobi|Android/i.test(navigator.userAgent);
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, isCompact ? 1.35 : 1.7));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xd9c7a4, 820, 3900);

const camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.8, 9000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.minDistance = 18;
controls.maxDistance = 2400;
controls.maxPolarAngle = Math.PI * 0.68;
controls.autoRotateSpeed = 0.2;

const skyUniforms = {
  topColor: { value: new THREE.Color(0x5d8fa8) },
  horizonColor: { value: new THREE.Color(0xefdcb6) },
  bottomColor: { value: new THREE.Color(0xb99c70) },
  sunDir: { value: new THREE.Vector3(0.52, 0.42, 0.5).normalize() },
  sunColor: { value: new THREE.Color(0xffe0ad) },
};
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(6600, 48, 28),
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
        vec3 col = mix(bottomColor, horizonColor, smoothstep(-0.16, 0.06, h));
        col = mix(col, topColor, smoothstep(-0.01, 0.42, h));
        float sd = max(dot(dir, normalize(sunDir)), 0.0);
        col += sunColor * pow(sd, 1200.0) * 1.6;
        col += sunColor * pow(sd, 26.0) * 0.2;
        col += sunColor * pow(sd, 4.0) * 0.035;
        float haze = smoothstep(0.16, -0.02, h) * smoothstep(-0.24, -0.01, h);
        col = mix(col, horizonColor * 1.05, haze * 0.24);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  })
);
scene.add(sky);

const hemi = new THREE.HemisphereLight(0xf2e0bd, 0x695438, 1.3);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xffe2b0, 2.85);
sun.position.set(540, 390, 460);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -1180;
sun.shadow.camera.right = 1180;
sun.shadow.camera.top = 1180;
sun.shadow.camera.bottom = -1180;
sun.shadow.camera.near = 20;
sun.shadow.camera.far = 3800;
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 1.1;
scene.add(sun);
scene.add(sun.target);
sun.target.position.set(0, 28, -62);

const ambient = new THREE.AmbientLight(0xd9bea0, 0.66);
scene.add(ambient);

const fill = new THREE.DirectionalLight(0xa9c4cc, 0.62);
fill.position.set(-620, 320, -520);
scene.add(fill);

let world;
try {
  console.log('MARK base-start');
  world = buildHukou();
  console.log('MARK base-done');
  scene.add(world.group);
  console.log('MARK overlay-start');
  world.overlay = createHukouOverlay();
  console.log('MARK overlay-done');
  scene.add(world.overlay.group);
} catch (error) {
  console.error('Hukou scene build failed', error);
  const loaderText = document.querySelector('#loader p');
  if (loaderText) loaderText.textContent = '场景构建失败';
  throw error;
}

const dayState = {
  sun: new THREE.Color(0xffe2b0),
  hemiSky: new THREE.Color(0xf2e0bd),
  hemiGround: new THREE.Color(0x695438),
  top: new THREE.Color(0x5d8fa8),
  horizon: new THREE.Color(0xefdcb6),
  bottom: new THREE.Color(0xb99c70),
  fog: new THREE.Color(0xd9c7a4),
  sunPos: new THREE.Vector3(540, 390, 460),
  sunIntensity: 2.85,
  hemiIntensity: 1.3,
  fillIntensity: 0.62,
  exposure: 1.08,
};

const duskState = {
  sun: new THREE.Color(0xff8b4e),
  hemiSky: new THREE.Color(0x8f8098),
  hemiGround: new THREE.Color(0x584433),
  top: new THREE.Color(0x2b3b5c),
  horizon: new THREE.Color(0xf0a065),
  bottom: new THREE.Color(0x8d6a4d),
  fog: new THREE.Color(0xc9a27f),
  sunPos: new THREE.Vector3(520, 205, -420),
  sunIntensity: 2.2,
  hemiIntensity: 0.6,
  fillIntensity: 0.24,
  exposure: 0.94,
};

const initial = world.views.overview;
camera.position.set(...initial.p);
controls.target.set(...initial.t);
if (initial.fov) camera.fov = initial.fov;
camera.updateProjectionMatrix();
controls.update();

let envTarget = 0;
let envMix = 0;
let isDusk = false;

const tour = {
  active: false,
  t: 0,
  duration: 2.2,
  fromP: new THREE.Vector3(),
  fromT: new THREE.Vector3(),
  toP: new THREE.Vector3(),
  toT: new THREE.Vector3(),
  fromFov: 46,
  toFov: 46,
};

function travelTo(view, duration = 2.2) {
  if (!view) return;
  tour.fromP.copy(camera.position);
  tour.fromT.copy(controls.target);
  tour.toP.set(...view.p);
  tour.toT.set(...view.t);
  tour.fromFov = camera.fov;
  tour.toFov = view.fov || 46;
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
    if (fp.isActive()) fp.exit();
    document.querySelectorAll('[data-view]').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    setCaption(btn.dataset.view);
    const wantDusk = btn.dataset.view === 'dusk';
    isDusk = wantDusk;
    envTarget = wantDusk ? 1 : 0;
    travelTo(world.views[btn.dataset.view]);
  });
});

const rotateBtn = document.getElementById('btn-rotate');
rotateBtn.addEventListener('click', () => {
  controls.autoRotate = !controls.autoRotate;
  rotateBtn.classList.toggle('active', controls.autoRotate);
});

const duskBtn = document.getElementById('btn-dusk');
if (duskBtn) {
  duskBtn.addEventListener('click', () => {
    isDusk = !isDusk;
    envTarget = isDusk ? 1 : 0;
    duskBtn.classList.toggle('active', isDusk);
    duskBtn.textContent = isDusk ? '日间' : '黄昏';
  });
}

const fp = createFirstPerson({
  camera,
  renderer,
  controls,
  world,
  onEnter: () => {
    tour.active = false;
    controls.autoRotate = false;
    rotateBtn.classList.remove('active');
  },
  onExit: () => {
    rotateBtn.classList.toggle('active', controls.autoRotate);
  },
});
window.__fp = fp;

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

function updateEnvironment(dt) {
  envMix += (envTarget - envMix) * Math.min(1, dt * 1.55);
  if (Math.abs(envTarget - envMix) < 0.001) envMix = envTarget;

  sun.color.copy(dayState.sun).lerp(duskState.sun, envMix);
  sun.intensity = THREE.MathUtils.lerp(dayState.sunIntensity, duskState.sunIntensity, envMix);
  tmpSunPos.copy(dayState.sunPos).lerp(duskState.sunPos, envMix);
  sun.position.copy(tmpSunPos);

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
}

function animate() {
  const rawDt = clock.getDelta();
  const dt = Math.min(rawDt, 0.05);
  updateEnvironment(Math.min(rawDt, 0.2));
  if (world.update) world.update(clock.elapsedTime, dt);
  if (world.overlay && world.overlay.update) world.overlay.update(clock.elapsedTime, dt);

  if (fp.isActive()) {
    fp.update(dt);
  } else {
    if (tour.active) {
      tour.t += rawDt / tour.duration;
      const t = Math.min(1, tour.t);
      const ease = 1 - Math.pow(1 - t, 3);
      camera.position.lerpVectors(tour.fromP, tour.toP, ease);
      controls.target.lerpVectors(tour.fromT, tour.toT, ease);
      camera.fov = THREE.MathUtils.lerp(tour.fromFov, tour.toFov, ease);
      camera.updateProjectionMatrix();
      if (t >= 1) {
        camera.position.copy(tour.toP);
        controls.target.copy(tour.toT);
        camera.fov = tour.toFov;
        camera.updateProjectionMatrix();
        tour.active = false;
      }
    }
    controls.update();
  }
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
  fp,
  travelTo,
  setCaption,
});
window.__interactions = interactions;

console.log('MARK animate-start');
updateEnvironment(1);
animate();
console.log('MARK animate-returned');

const loader = document.getElementById('loader');
function revealScene() {
  loader.classList.add('hidden');
  document.body.classList.add('ready');
  window.__ready = true;
}
setTimeout(revealScene, 700);
requestAnimationFrame(() => requestAnimationFrame(revealScene));

const debugApi = {
  scene,
  camera,
  renderer,
  controls,
  world,
  views: world.views,
  travelTo,
  firstPerson: fp,
  overlay: world.overlay,
  interactions,
  getMetrics: () => ({
    calls: renderer.info.render.calls,
    triangles: renderer.info.render.triangles,
    points: renderer.info.render.points,
    lines: renderer.info.render.lines,
    geometries: renderer.info.memory.geometries,
    textures: renderer.info.memory.textures,
    camera: camera.position.toArray().map((v) => +v.toFixed(2)),
    target: controls.target.toArray().map((v) => +v.toFixed(2)),
    fov: +camera.fov.toFixed(1),
    ready: !!window.__ready,
  }),
  getStats: () => debugApi.getMetrics(),
  env: () => ({
    isDusk,
    envMix: +envMix.toFixed(3),
    exposure: +renderer.toneMappingExposure.toFixed(3),
    fog: '#' + scene.fog.color.getHexString(),
  }),
  checkTrailGrounding: () => {
    let maxGap = -Infinity;
    let minGap = Infinity;
    let worst = 0;
    for (let i = 2; i < 298; i++) {
      const t = i / 300;
      const p = world.trailPointAt(t);
      const gap = p.y - world.heightAt(p.x, p.z);
      if (gap > maxGap) {
        maxGap = gap;
        worst = t;
      }
      if (gap < minGap) minGap = gap;
    }
    return { maxTrailAboveTerrain: +maxGap.toFixed(2), minTrailAboveTerrain: +minGap.toFixed(2), worstT: +worst.toFixed(3) };
  },
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
window.__hukou = debugApi;
window.__stats = debugApi.getStats;
