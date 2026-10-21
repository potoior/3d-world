import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildHulunbuir } from './layout.js';
import { createHulunbuirOverlay } from './hulunbuir.js';
import { createFirstPerson } from './firstperson.js';
import { mats } from './materials.js';
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
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xd8c4a0, 620, 4300);

const camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.8, 9000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.minDistance = 12;
controls.maxDistance = 2200;
controls.maxPolarAngle = Math.PI * 0.62;
controls.autoRotateSpeed = 0.18;

const skyUniforms = {
  topColor: { value: new THREE.Color(0x4e7f92) },
  horizonColor: { value: new THREE.Color(0xf0c389) },
  bottomColor: { value: new THREE.Color(0xcdb78f) },
  sunDir: { value: new THREE.Vector3(-0.74, 0.23, -0.42).normalize() },
  sunColor: { value: new THREE.Color(0xffd49a) },
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
        vec3 col = mix(bottomColor, horizonColor, smoothstep(-0.24, 0.015, h));
        col = mix(col, topColor, smoothstep(-0.015, 0.52, h));
        float sd = max(dot(dir, normalize(sunDir)), 0.0);
        col += sunColor * pow(sd, 1400.0) * 3.2;
        col += sunColor * pow(sd, 26.0) * 0.2;
        col += sunColor * pow(sd, 5.0) * 0.055;
        float horizonGlow = pow(max(0.0, 1.0 - abs(h) * 7.0), 2.0);
        col += vec3(0.24, 0.12, 0.04) * horizonGlow;
        float haze = smoothstep(0.16, -0.02, h) * smoothstep(-0.3, -0.02, h);
        col = mix(col, horizonColor * 1.05, haze * 0.24);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  })
);
scene.add(sky);

const hemi = new THREE.HemisphereLight(0xc2d6ca, 0x5f693b, 1.06);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xffe0ae, 2.68);
sun.position.set(-980, 310, -560);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -960;
sun.shadow.camera.right = 960;
sun.shadow.camera.top = 960;
sun.shadow.camera.bottom = -960;
sun.shadow.camera.near = 40;
sun.shadow.camera.far = 3800;
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.9;
scene.add(sun);
scene.add(sun.target);
sun.target.position.set(20, 0, 0);

const ambient = new THREE.AmbientLight(0xa4b39a, 0.36);
scene.add(ambient);

const fill = new THREE.DirectionalLight(0x93a9c4, 0.5);
fill.position.set(620, 300, 720);
scene.add(fill);

let world;
try {
  world = buildHulunbuir();
  scene.add(world.group);
} catch (error) {
  console.error('Hulunbuir scene build failed', error);
  const loaderText = document.querySelector('#loader p');
  if (loaderText) loaderText.textContent = '场景构建失败';
  throw error;
}

const overlay = createHulunbuirOverlay();
scene.add(overlay.group);
world.overlay = overlay;
world.update = (elapsed, dt) => {
  overlay.update(elapsed, dt);
};

const dayState = {
  sun: new THREE.Color(0xffe0ae),
  hemiSky: new THREE.Color(0xc2d6ca),
  hemiGround: new THREE.Color(0x5f693b),
  top: new THREE.Color(0x4e7f92),
  horizon: new THREE.Color(0xf0c389),
  bottom: new THREE.Color(0xcdb78f),
  fog: new THREE.Color(0xd8c4a0),
  cloudWarm: new THREE.Color(0xffd8ad),
  cloudRose: new THREE.Color(0xf3a98a),
  cloudDark: new THREE.Color(0x7e6c74),
  glow: new THREE.Color(0xffd49a),
  sunPos: new THREE.Vector3(-980, 310, -560),
  sunIntensity: 2.68,
  hemiIntensity: 1.06,
  fillIntensity: 0.5,
  exposure: 1.15,
};

const duskState = {
  sun: new THREE.Color(0xff8a4f),
  hemiSky: new THREE.Color(0x7d7f9c),
  hemiGround: new THREE.Color(0x4a4030),
  top: new THREE.Color(0x1f2f50),
  horizon: new THREE.Color(0xf08a54),
  bottom: new THREE.Color(0x76584f),
  fog: new THREE.Color(0xb58c73),
  cloudWarm: new THREE.Color(0xff9d73),
  cloudRose: new THREE.Color(0xc96e62),
  cloudDark: new THREE.Color(0x4c425b),
  glow: new THREE.Color(0xff7d3f),
  sunPos: new THREE.Vector3(-1100, 155, -600),
  sunIntensity: 2.1,
  hemiIntensity: 0.58,
  fillIntensity: 0.18,
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
    setDusk(btn.dataset.view === 'dusk');
    travelTo(world.views[btn.dataset.view]);
  });
});

const rotateBtn = document.getElementById('btn-rotate');
rotateBtn.addEventListener('click', () => {
  controls.autoRotate = !controls.autoRotate;
  rotateBtn.classList.toggle('active', controls.autoRotate);
});

const duskBtn = document.getElementById('btn-dusk');
function setDusk(on) {
  isDusk = !!on;
  envTarget = isDusk ? 1 : 0;
  duskBtn.classList.toggle('active', isDusk);
}
duskBtn.addEventListener('click', () => {
  setDusk(!isDusk);
  const key = isDusk ? 'dusk' : 'overview';
  document.querySelectorAll('[data-view]').forEach((b) => b.classList.toggle('active', b.dataset.view === key));
  if (world.views[key]) {
    setCaption(key);
    travelTo(world.views[key]);
  }
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
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isCompact ? 1.35 : 1.7));
});

const clock = new THREE.Clock();
const tmpSunPos = new THREE.Vector3();
const tmpDir = new THREE.Vector3();

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

  mats.cloudWarm.color.copy(dayState.cloudWarm).lerp(duskState.cloudWarm, envMix);
  mats.cloudRose.color.copy(dayState.cloudRose).lerp(duskState.cloudRose, envMix);
  mats.cloudDark.color.copy(dayState.cloudDark).lerp(duskState.cloudDark, envMix);
  mats.cloudWhite.color.copy(dayState.cloudWarm).lerp(duskState.cloudWarm, envMix);
  mats.glow.color.copy(dayState.glow).lerp(duskState.glow, envMix);

  const glow = overlay.clouds && overlay.clouds.glow;
  if (glow) {
    tmpDir.copy(tmpSunPos).normalize().multiplyScalar(3300);
    glow.position.copy(tmpDir);
    glow.position.y = Math.max(360, glow.position.y);
  }

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

updateEnvironment(1);
animate();

const loader = document.getElementById('loader');
function revealScene() {
  loader.classList.add('hidden');
  document.body.classList.add('ready');
  window.__ready = true;
}
setTimeout(revealScene, 700);
requestAnimationFrame(() => requestAnimationFrame(revealScene));

function getMetrics() {
  return {
    calls: renderer.info.render.calls,
    triangles: renderer.info.render.triangles,
    points: renderer.info.render.points,
    lines: renderer.info.render.lines,
    geometries: renderer.info.memory.geometries,
    textures: renderer.info.memory.textures,
    camera: camera.position.toArray().map((v) => +v.toFixed(2)),
    target: controls.target.toArray().map((v) => +v.toFixed(2)),
    fov: +camera.fov.toFixed(1),
    envMix: +envMix.toFixed(3),
    dusk: isDusk,
    ready: !!window.__ready,
    counts: overlay.counts,
  };
}

window.__hulunbuir = {
  scene,
  camera,
  renderer,
  controls,
  world,
  views: world.views,
  notes: world.notes,
  travelTo,
  firstPerson: fp,
  overlay,
  getMetrics,
  getStats: getMetrics,
  stats: getMetrics,
  heightAt: world.heightAt,
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
    return {
      maxTrailAboveTerrain: +maxGap.toFixed(2),
      minTrailAboveTerrain: +minGap.toFixed(2),
      worstT: +worst.toFixed(3),
    };
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
window.__stats = getMetrics;


