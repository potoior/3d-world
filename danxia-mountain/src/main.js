import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildHuangshan } from './layout.js';
import { createDanxia } from './danxia.js';
import { createFirstPerson } from './firstperson.js';
import { mats, sharedTextures } from './materials.js';
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
renderer.toneMappingExposure = 1.18;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xc4d0d4, 560, 3100);

const camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.8, 8500);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.minDistance = 20;
controls.maxDistance = 2600;
controls.maxPolarAngle = Math.PI * 0.68;
controls.autoRotateSpeed = 0.22;

const skyUniforms = {
  topColor: { value: new THREE.Color(0x5b8fbd) },
  horizonColor: { value: new THREE.Color(0xded3bf) },
  bottomColor: { value: new THREE.Color(0xb7bdb9) },
  sunDir: { value: new THREE.Vector3(0.72, 0.36, 0.46).normalize() },
  sunColor: { value: new THREE.Color(0xffdfb2) },
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
        vec3 col = mix(bottomColor, horizonColor, smoothstep(-0.2, 0.05, h));
        col = mix(col, topColor, smoothstep(-0.01, 0.4, h));
        float sd = max(dot(dir, normalize(sunDir)), 0.0);
        col += sunColor * pow(sd, 1100.0) * 1.5;
        col += sunColor * pow(sd, 22.0) * 0.16;
        col += sunColor * pow(sd, 4.0) * 0.025;
        float haze = smoothstep(0.14, -0.03, h) * smoothstep(-0.26, -0.02, h);
        col = mix(col, horizonColor * 1.04, haze * 0.2);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  })
);
scene.add(sky);

const hemi = new THREE.HemisphereLight(0xc3d7e6, 0x6b716c, 1.38);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xffe6cc, 2.5);
sun.position.set(760, 330, 430);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -1080;
sun.shadow.camera.right = 1080;
sun.shadow.camera.top = 1080;
sun.shadow.camera.bottom = -1080;
sun.shadow.camera.near = 20;
sun.shadow.camera.far = 3500;
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 1.0;
scene.add(sun);
scene.add(sun.target);
sun.target.position.set(-120, 80, -220);

const ambient = new THREE.AmbientLight(0xb8c6ce, 0.86);
scene.add(ambient);

const fill = new THREE.DirectionalLight(0x8fb2d0, 0.66);
fill.position.set(-560, 280, -620);
scene.add(fill);

let world;
let danxia;
try {
  world = buildHuangshan();
  if (world.clouds && world.clouds.group) world.clouds.group.visible = false;
  const skyDetail = world.group.getObjectByName('layered-mist-and-sunrise');
  if (skyDetail) skyDetail.visible = false;
  world.group.traverse((obj) => {
    const mat = obj.material;
    if (!mat || !mat.map) return;
    if (mat.map === sharedTextures.cloudMap || mat.map === sharedTextures.mistMap) {
      mat.opacity = Math.min(mat.opacity, 0.1);
      mat.depthWrite = false;
    }
  });
  danxia = createDanxia();
  world.group.add(danxia.group);
  world.views = danxia.views;
  world.notes = danxia.notes;
  world.danxia = danxia;
  const baseUpdate = world.update;
  world.update = (elapsed, dt) => {
    baseUpdate(elapsed, dt);
    danxia.update(elapsed, dt);
  };
  scene.add(world.group);
} catch (error) {
  console.error('Danxia scene build failed', error);
  const loaderText = document.querySelector('#loader p');
  if (loaderText) loaderText.textContent = '场景构建失败';
  throw error;
}

const dayState = {
  sun: new THREE.Color(0xffd4a4),
  hemiSky: new THREE.Color(0xc8dbe6),
  hemiGround: new THREE.Color(0x7c5d49),
  top: new THREE.Color(0x4e7ca6),
  horizon: new THREE.Color(0xf3c795),
  bottom: new THREE.Color(0xc2a58d),
  fog: new THREE.Color(0xd7c3ae),
  cloud: new THREE.Color(0xfaf3e7),
  cloudWarm: new THREE.Color(0xffd5a8),
  sunPos: new THREE.Vector3(820, 305, 505),
  sunIntensity: 2.72,
  hemiIntensity: 1.28,
  fillIntensity: 0.6,
  exposure: 1.2,
};

const duskState = {
  sun: new THREE.Color(0xff9260),
  hemiSky: new THREE.Color(0x8b93aa),
  hemiGround: new THREE.Color(0x5c5048),
  top: new THREE.Color(0x263a5c),
  horizon: new THREE.Color(0xd9a074),
  bottom: new THREE.Color(0x8d7a6d),
  fog: new THREE.Color(0xb5a394),
  cloud: new THREE.Color(0xf1c6ab),
  cloudWarm: new THREE.Color(0xe9a982),
  sunPos: new THREE.Vector3(820, 250, -440),
  sunIntensity: 1.95,
  hemiIntensity: 0.54,
  fillIntensity: 0.22,
  exposure: 0.96,
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
};

function travelTo(view, duration = 2.2) {
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

function setDusk(on) {
  isDusk = !!on;
  envTarget = isDusk ? 1 : 0;
  duskBtn.classList.toggle('active', isDusk);
  duskBtn.textContent = isDusk ? '晨光' : '暮色';
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
duskBtn.addEventListener('click', () => {
  setDusk(!isDusk);
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

  mats.cloud.color.copy(dayState.cloud).lerp(duskState.cloud, envMix);
  mats.cloudWarm.color.copy(dayState.cloudWarm).lerp(duskState.cloudWarm, envMix);

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
animate();

const loader = document.getElementById('loader');
function revealScene() {
  loader.classList.add('hidden');
  document.body.classList.add('ready');
  window.__ready = true;
}
revealScene();
setTimeout(revealScene, 700);
requestAnimationFrame(() => requestAnimationFrame(revealScene));

window.__danxia = {
  scene,
  camera,
  renderer,
  controls,
  world,
  views: world.views,
  travelTo,
  firstPerson: fp,
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
  danxia,
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
