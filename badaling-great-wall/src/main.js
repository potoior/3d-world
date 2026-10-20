import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildBadaling } from './layout.js';
import { createFirstPerson } from './firstperson.js';
import { initInteractions } from '../../shared/interactions.js';

const isCompact = window.innerWidth < 900 || /Mobi|Android/i.test(navigator.userAgent);
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, isCompact ? 1.3 : 1.6));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.24;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xc3cbc8, 540, 3120);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.8, 7500);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.minDistance = 22;
controls.maxDistance = 2400;
controls.maxPolarAngle = Math.PI * 0.486;
controls.autoRotateSpeed = 0.24;

const skyUniforms = {
  topColor: { value: new THREE.Color(0x3d78ba) },
  horizonColor: { value: new THREE.Color(0xd8d3c0) },
  bottomColor: { value: new THREE.Color(0xa5ad9f) },
  sunDir: { value: new THREE.Vector3(0.6, 0.4, 0.42).normalize() },
  sunColor: { value: new THREE.Color(0xffdcae) },
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
        vec3 col = mix(bottomColor, horizonColor, smoothstep(-0.22, 0.06, h));
        col = mix(col, topColor, smoothstep(-0.015, 0.36, h));
        float sd = max(dot(dir, normalize(sunDir)), 0.0);
        col += sunColor * pow(sd, 900.0) * 1.3;
        col += sunColor * pow(sd, 18.0) * 0.12;
        float haze = smoothstep(0.16, -0.04, h) * smoothstep(-0.25, -0.02, h);
        col = mix(col, horizonColor * 1.03, haze * 0.16);
        float c1 = sin(dir.x * 8.0 + dir.z * 5.0) * 0.5 + 0.5;
        float c2 = sin(dir.x * 17.0 - dir.z * 11.0 - 1.3) * 0.5 + 0.5;
        float cloud = smoothstep(0.62, 0.96, c1 * c2);
        cloud *= smoothstep(0.015, 0.12, h) * (1.0 - smoothstep(0.3, 0.62, h));
        vec3 cloudCol = mix(vec3(0.78, 0.82, 0.86), sunColor * 1.05, 0.35);
        col = mix(col, cloudCol, cloud * 0.13);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  })
);
scene.add(sky);

const hemi = new THREE.HemisphereLight(0xc4d8e8, 0x7a6d58, 1.45);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xffdfb4, 2.42);
sun.position.set(760, 300, 440);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -1080;
sun.shadow.camera.right = 1080;
sun.shadow.camera.top = 1080;
sun.shadow.camera.bottom = -1080;
sun.shadow.camera.near = 20;
sun.shadow.camera.far = 3300;
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 1.0;
scene.add(sun);
scene.add(sun.target);
sun.target.position.set(-150, 40, -180);

const ambient = new THREE.AmbientLight(0xc4c8bc, 1.06);
scene.add(ambient);

const fill = new THREE.DirectionalLight(0x9cb8cc, 0.66);
fill.position.set(-520, 280, -600);
scene.add(fill);

let world;
try {
  world = buildBadaling();
  scene.add(world.group);
} catch (error) {
  console.error('Badaling scene build failed', error);
  const loaderText = document.querySelector('#loader p');
  if (loaderText) loaderText.textContent = '场景构建失败';
  throw error;
}

const dayState = {
  sun: new THREE.Color(0xffdfb4),
  hemiSky: new THREE.Color(0xc4d8e8),
  hemiGround: new THREE.Color(0x7a6d58),
  top: new THREE.Color(0x3d78ba),
  horizon: new THREE.Color(0xd8d3c0),
  bottom: new THREE.Color(0xa5ad9f),
  fog: new THREE.Color(0xc3cbc8),
  sunPos: new THREE.Vector3(760, 300, 440),
  sunIntensity: 2.42,
  hemiIntensity: 1.45,
  fillIntensity: 0.66,
  exposure: 1.2,
};

const duskState = {
  sun: new THREE.Color(0xff9d63),
  hemiSky: new THREE.Color(0x8d9bb2),
  hemiGround: new THREE.Color(0x5f5448),
  top: new THREE.Color(0x243a5e),
  horizon: new THREE.Color(0xd2a179),
  bottom: new THREE.Color(0x8b7969),
  fog: new THREE.Color(0xb3a294),
  sunPos: new THREE.Vector3(780, 270, -420),
  sunIntensity: 1.82,
  hemiIntensity: 0.58,
  fillIntensity: 0.24,
  exposure: 0.98,
};

const initial = world.views.overview;
camera.position.set(...initial.p);
controls.target.set(...initial.t);
controls.update();

let envTarget = 0;
let envMix = 0;
let isDusk = false;

const tour = {
  active: false,
  t: 0,
  duration: 1.9,
  fromP: new THREE.Vector3(),
  fromT: new THREE.Vector3(),
  toP: new THREE.Vector3(),
  toT: new THREE.Vector3(),
};

function travelTo(view, duration = 1.9) {
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
    if (fp.isActive()) fp.exit();
    document.querySelectorAll('[data-view]').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    setCaption(btn.dataset.view);
    travelTo(world.views[btn.dataset.view]);
  });
});

const rotateBtn = document.getElementById('btn-rotate');
rotateBtn.addEventListener('click', () => {
  controls.autoRotate = !controls.autoRotate;
  rotateBtn.classList.toggle('active', controls.autoRotate);
});

const duskBtn = document.getElementById('btn-dusk');
duskBtn.addEventListener('click', () => {
  isDusk = !isDusk;
  envTarget = isDusk ? 1 : 0;
  duskBtn.classList.toggle('active', isDusk);
  duskBtn.textContent = isDusk ? '日间' : '黄昏';
});

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
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isCompact ? 1.3 : 1.6));
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

  if (fp.isActive()) {
    fp.update(dt);
  } else {
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

updateEnvironment(1);

const loader = document.getElementById('loader');
function revealScene() {
  loader.classList.add('hidden');
  document.body.classList.add('ready');
  window.__ready = true;
}
revealScene();
requestAnimationFrame(() => requestAnimationFrame(animate));

function checkWallGrounding() {
  const walls = [world.mainWall, world.southWall];
  let maxGap = -Infinity;
  let minSink = Infinity;
  let samples = 0;
  for (const wall of walls) {
    for (const s of wall.samples) {
      const g = world.heightAt(s.x, s.z);
      const gap = s.bottom - g;
      if (gap > maxGap) maxGap = gap;
      if (gap < minSink) minSink = gap;
      samples++;
    }
  }
  return { maxBottomAboveGround: maxGap, deepestSink: minSink, samples };
}

window.__badaling = {
  scene,
  camera,
  renderer,
  controls,
  world,
  views: world.views,
  travelTo,
  firstPerson: fp,
  checkWallGrounding,
  pick: (px, py) => {
    const rc = new THREE.Raycaster();
    rc.setFromCamera(new THREE.Vector2((px / window.innerWidth) * 2 - 1, -(py / window.innerHeight) * 2 + 1), camera);
    const hits = rc.intersectObjects(scene.children, true);
    return hits.slice(0, 4).map((h) => ({
      object: h.object.name || h.object.type,
      distance: +h.distance.toFixed(1),
      point: h.point.toArray().map((v) => +v.toFixed(1)),
      material: h.object.material?.name || h.object.material?.color?.getHexString?.() || '',
      tri: h.object.geometry?.attributes?.position?.count ? h.object.geometry.attributes.position.count / 3 : 0,
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
  }),
};
