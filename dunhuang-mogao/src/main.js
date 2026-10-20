import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createMaterials } from './materials.js';
import { buildDunhuangScene } from './world.js';
import { createFirstPerson } from './firstperson.js';
import { initInteractions } from '../../shared/interactions.js';

const isCompact = window.innerWidth < 820 || /Mobi|Android/i.test(navigator.userAgent);
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
renderer.toneMappingExposure = 1.06;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xd8bd96, 240, 1450);

const camera = new THREE.PerspectiveCamera(44, window.innerWidth / window.innerHeight, 0.5, 3200);
camera.position.set(186, 116, 224);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(-26, 8, -42);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.minDistance = 8;
controls.maxDistance = 980;
controls.maxPolarAngle = Math.PI * 0.495;
controls.autoRotateSpeed = 0.2;
controls.update();

const skyUniforms = {
  topColor: { value: new THREE.Color(0x5e87a9) },
  horizonColor: { value: new THREE.Color(0xefcca2) },
  bottomColor: { value: new THREE.Color(0xd9b283) },
  sunDir: { value: new THREE.Vector3(0.5, 0.62, 0.4).normalize() },
  sunColor: { value: new THREE.Color(0xffdca6) },
};
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(2000, 48, 28),
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
        vec3 col = mix(bottomColor, horizonColor, smoothstep(-0.16, 0.08, h));
        col = mix(col, topColor, smoothstep(0.02, 0.58, h));
        float sd = max(dot(dir, normalize(sunDir)), 0.0);
        col += sunColor * pow(sd, 900.0) * 2.2;
        col += sunColor * pow(sd, 12.0) * 0.22;
        col += vec3(0.16, 0.08, 0.02) * pow(max(0.0, 1.0 - abs(h) * 5.0), 5.0);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  })
);
scene.add(sky);

const hemi = new THREE.HemisphereLight(0xd9e5ea, 0x9d7a50, 1.55);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xffd39c, 2.75);
sun.position.set(240, 210, 150);
sun.castShadow = true;
sun.shadow.mapSize.set(isCompact ? 1536 : 2048, isCompact ? 1536 : 2048);
sun.shadow.camera.left = -290;
sun.shadow.camera.right = 290;
sun.shadow.camera.top = 290;
sun.shadow.camera.bottom = -290;
sun.shadow.camera.near = 30;
sun.shadow.camera.far = 1050;
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 1.1;
scene.add(sun);
scene.add(sun.target);

const fill = new THREE.DirectionalLight(0x9fb6c8, 0.5);
fill.position.set(-180, 110, -160);
scene.add(fill);
scene.add(new THREE.AmbientLight(0xe6d6bd, 0.34));

const materials = createMaterials();
const world = buildDunhuangScene(materials);
scene.add(world.group);
const waterMaterial = world.waterMaterial;

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
const dayState = {
  sun: new THREE.Color(0xffd39c),
  hemiSky: new THREE.Color(0xd9e5ea),
  hemiGround: new THREE.Color(0x9d7a50),
  top: new THREE.Color(0x5e87a9),
  horizon: new THREE.Color(0xefcca2),
  bottom: new THREE.Color(0xd9b283),
  fog: new THREE.Color(0xd8bd96),
  fogNear: 240,
  fogFar: 1450,
  waterDeep: new THREE.Color(0x103b3b),
  waterShallow: new THREE.Color(0x2c6a60),
  waterSky: new THREE.Color(0xa6c5bb),
  sunPos: new THREE.Vector3(240, 210, 150),
  sunIntensity: 2.75,
  hemiIntensity: 1.55,
  exposure: 1.06,
  night: 0,
};

const duskState = {
  sun: new THREE.Color(0xff9554),
  hemiSky: new THREE.Color(0x6e84a3),
  hemiGround: new THREE.Color(0x6b503c),
  top: new THREE.Color(0x26344f),
  horizon: new THREE.Color(0xe08a52),
  bottom: new THREE.Color(0x8e6247),
  fog: new THREE.Color(0xbc8a66),
  fogNear: 180,
  fogFar: 1120,
  waterDeep: new THREE.Color(0x142c2e),
  waterShallow: new THREE.Color(0x384c49),
  waterSky: new THREE.Color(0xc08a6d),
  sunPos: new THREE.Vector3(-230, 62, 215),
  sunIntensity: 2.0,
  hemiIntensity: 0.82,
  exposure: 1.02,
  night: 1,
};

let envTarget = 0;
let envMix = 0;

const tour = {
  active: false,
  t: 0,
  duration: 2.15,
  fromP: new THREE.Vector3(),
  fromT: new THREE.Vector3(),
  toP: new THREE.Vector3(),
  toT: new THREE.Vector3(),
};

const views = {
  overview: { p: [186, 116, 224], t: [-26, 8, -42] },
  crescent: { p: [16, 46, 84], t: [-60, 0, 8] },
  mogao: { p: [112, 33, -36], t: [28, 26, -140] },
  dunes: { p: [286, 108, 194], t: [108, 26, 8] },
  caravan: { p: [64, 57, 108], t: [182, 34, 10] },
};

const notes = {
  overview: ['敦煌 · 沙海胜境', '鸣沙山环抱月牙泉，崖壁千窟映照丝路余晖，沙脊与绿洲在暮色中相接'],
  crescent: ['月牙泉', '一弯新月嵌于沙海，泉畔芦苇摇曳，木亭栈道临水，风吹细浪映出天光'],
  mogao: ['莫高窟', '九层楼阁依崖而建，层叠石窟、彩塑壁画与经幡藏纳千年光色'],
  dunes: ['鸣沙山', '沙脊如刃，风过沙鸣，金色波纹层层铺向天际，砾石与沙生植物点缀其间'],
  caravan: ['沙脊驼队', '七峰骆驼沿鸣沙山脊缓行，铃声随暮色飘向远方，胡杨金黄如焰'],
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

function setActiveView(key) {
  document.querySelectorAll('[data-view]').forEach((b) => {
    b.classList.toggle('active', b.dataset.view === key);
  });
}

function travelTo(view, key) {
  if (fp.isActive()) fp.exit();
  tour.fromP.copy(camera.position);
  tour.fromT.copy(controls.target);
  tour.toP.set(...view.p);
  tour.toT.set(...view.t);
  tour.t = 0;
  tour.active = true;
  controls.autoRotate = false;
  document.getElementById('btn-rotate').classList.remove('active');
  if (key) {
    setCaption(key);
    setActiveView(key);
  }
}

document.querySelectorAll('[data-view]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const view = views[btn.dataset.view];
    if (view) travelTo(view, btn.dataset.view);
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
  duskBtn.textContent = envTarget > 0.5 ? '白昼' : '黄昏';
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

function updateEnvironment(dt) {
  envMix += (envTarget - envMix) * Math.min(1, dt * 1.35);
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
  scene.fog.near = THREE.MathUtils.lerp(dayState.fogNear, duskState.fogNear, envMix);
  scene.fog.far = THREE.MathUtils.lerp(dayState.fogFar, duskState.fogFar, envMix);
  renderer.toneMappingExposure = THREE.MathUtils.lerp(dayState.exposure, duskState.exposure, envMix);

  waterMaterial.uniforms.uSunDir.value.copy(tmpSunPos).normalize();
  waterMaterial.uniforms.uSunColor.value.copy(sun.color);
  waterMaterial.uniforms.uDeep.value.copy(dayState.waterDeep).lerp(duskState.waterDeep, envMix);
  waterMaterial.uniforms.uShallow.value.copy(dayState.waterShallow).lerp(duskState.waterShallow, envMix);
  waterMaterial.uniforms.uSky.value.copy(dayState.waterSky).lerp(duskState.waterSky, envMix);
  waterMaterial.uniforms.uFogColor.value.copy(dayState.fog).lerp(duskState.fog, envMix);
  waterMaterial.uniforms.uNight.value = envMix;
  materials.lantern.emissiveIntensity = THREE.MathUtils.lerp(1.25, 2.4, envMix);
}

function animate() {
  const rawDt = clock.getDelta();
  const dt = Math.min(rawDt, 0.05);
  const time = clock.elapsedTime;

  updateEnvironment(Math.min(rawDt, 0.2));
  waterMaterial.uniforms.uTime.value = time;
  world.life.update(time, dt, envMix);

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

function getStats() {
  return {
    calls: renderer.info.render.calls,
    triangles: renderer.info.render.triangles,
    points: renderer.info.render.points,
    lines: renderer.info.render.lines,
    textures: renderer.info.memory.textures,
    geometries: renderer.info.memory.geometries,
    envMix,
    camels: world.stats.camels,
    trees: world.stats.trees,
    reeds: world.stats.reeds,
    flags: world.stats.flags,
    caves: world.stats.caves,
    detailReeds: world.stats.detailReeds,
  };
}

window.__dunhuang = {
  scene,
  camera,
  renderer,
  controls,
  world,
  materials,
  fp,
  views,
  notes,
  getStats,
  getState: () => ({
    envTarget,
    envMix,
    fpActive: fp.isActive(),
    view: document.querySelector('[data-view].active')?.dataset.view || null,
    camera: camera.position.toArray(),
    target: controls.target.toArray(),
  }),
  setView: (key) => {
    const v = views[key];
    if (v) travelTo(v, key);
  },
  setDusk: (on) => {
    envTarget = on ? 1 : 0;
    duskBtn.classList.toggle('active', on);
    duskBtn.textContent = on ? '白昼' : '黄昏';
  },
};

setCaption('overview');
setActiveView('overview');

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


