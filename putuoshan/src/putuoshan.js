import * as THREE from 'three';
import { mergeStaticGroup } from './geometry.js';
import { heightAt, createTerrain, createDistantIsland, createFarIslets, SITES } from './psTerrain.js';
import { createPujiTemple, createFayuTemple, createHuijiTemple } from './psTemples.js';
import { createGuanyin } from './psGuanyin.js';
import { createPagoda, createSeaStack, createBalancedRock, createSteleSign, createIncenseBurner } from './psProps.js';
import { createStonePath } from './psPath.js';
import { createSea, createFoamRing, createSeaMist, createCloudBanks } from './psSea.js';
import { createIncense, createPrayerFlags, createCrowd, createBirds } from './psLife.js';
import { createVegetation, createCrowdData } from './psScatter.js';
import { coastRadius } from './psTerrain.js';
import { mulberry32 } from './psUtil.js';

const PATHS = {
  guanyin: [
    [0, 382], [4, 350], [-2, 318], [-22, 288], [-46, 258],
    [-58, 236], [-60, 224],
  ],
  fayu: [
    [-22, 150], [28, 146], [86, 128], [136, 104],
    [162, 70], [176, 30], [180, -12], [180, -40],
  ],
  huiji: [
    [-118, 116], [-150, 86], [-166, 40], [-166, -26],
    [-150, -96], [-124, -158], [-96, -208], [-72, -238],
  ],
  coast: [
    [-116, 146], [-172, 176], [-232, 204], [-292, 232], [-332, 254],
  ],
  south: [
    [10, 398], [26, 362], [52, 330], [90, 300], [140, 280], [196, 262],
  ],
};

function buildPaths(staticRoot) {
  const parts = [];
  const clearance = [];
  for (const key of Object.keys(PATHS)) {
    const res = createStonePath(PATHS[key], heightAt, {
      width: key === 'guanyin' ? 4.2 : 3.5,
      lamps: key !== 'south',
    });
    staticRoot.add(res.group);
    clearance.push(...res.clearance);
    parts.push(res);
  }
  return { parts, clearance };
}

function addHeroRocks(staticRoot) {
  const rand = mulberry32(6113);
  const y = heightAt(-236, 166);
  const rock = createBalancedRock({ scale: 1.0 });
  rock.position.set(-236, y - 0.5, 166);
  rock.rotation.y = 0.4;
  staticRoot.add(rock);

  const turtleMat = matsTurtle();
  for (const [x, z, s, ry] of [[-286, 152, 3.4, 0.7], [-270, 166, 2.6, 2.1], [-306, 138, 2.0, 1.1]]) {
    const gy = heightAt(x, z);
    const body = new THREE.DodecahedronGeometry(1, 0);
    body.scale(s * 1.4, s * 0.5, s);
    body.rotateY(ry);
    body.translate(x, gy + s * 0.3, z);
    const m = new THREE.Mesh(body, turtleMat);
    m.castShadow = true;
    m.receiveShadow = true;
    staticRoot.add(m);
    const head = new THREE.SphereGeometry(s * 0.28, 7, 5);
    head.scale(1.3, 0.8, 1.0);
    head.translate(x + Math.sin(ry) * s * 1.25, gy + s * 0.3, z + Math.cos(ry) * s * 1.25);
    const hm = new THREE.Mesh(head, turtleMat);
    hm.castShadow = true;
    staticRoot.add(hm);
  }

  for (let i = 0; i < 18; i++) {
    const a = rand() * Math.PI * 2;
    const r = 40 + rand() * 50;
    const x = -236 + Math.cos(a) * r;
    const z = 166 + Math.sin(a) * r;
    const gy = heightAt(x, z);
    if (gy < 4) continue;
    const size = 1.2 + rand() * 3.4;
    const g = new THREE.DodecahedronGeometry(size, 0);
    g.scale(1, 0.6 + rand() * 0.5, 1);
    g.rotateY(rand() * 6.28);
    g.translate(x, gy + size * 0.3, z);
    const m = new THREE.Mesh(g, i % 2 ? matsTurtle() : graniteMat());
    m.castShadow = false;
    m.receiveShadow = true;
    staticRoot.add(m);
  }
}

let _turtle = null;
let _granite = null;
function matsTurtle() {
  if (!_turtle) {
    _turtle = new THREE.MeshStandardMaterial({ color: 0x8d8e85, roughness: 0.98, flatShading: true });
  }
  return _turtle;
}
function graniteMat() {
  if (!_granite) {
    _granite = new THREE.MeshStandardMaterial({ color: 0xa8a69c, roughness: 0.98, flatShading: true });
  }
  return _granite;
}

function addFlagPoles(staticRoot, flags) {
  const flagGroup = flags.group;
  staticRoot.add(flagGroup);
}

export function buildPutuoshan() {
  const root = new THREE.Group();
  root.name = 'putuoshan-world';
  const staticRoot = new THREE.Group();
  staticRoot.name = 'putuoshan-static';

  const terrain = createTerrain();
  root.add(terrain);
  const luojia = createDistantIsland();
  const luojiaPagoda = createPagoda({ tiers: 5, radius: 4.6, height: 2.6, name: '珞珈山' });
  luojiaPagoda.position.set(-18, 50.5, 12);
  luojiaPagoda.scale.setScalar(0.72);
  luojia.add(luojiaPagoda);
  luojia.translateX(SITES.luojia.x).translateZ(SITES.luojia.z);
  staticRoot.add(luojia);
  staticRoot.add(createFarIslets());

  const paths = buildPaths(staticRoot);

  const puji = createPujiTemple();
  puji.group.position.set(SITES.puji.x, SITES.puji.y, SITES.puji.z);
  staticRoot.add(puji.group);
  const fayu = createFayuTemple();
  fayu.group.position.set(SITES.fayu.x, SITES.fayu.y, SITES.fayu.z);
  staticRoot.add(fayu.group);
  const huiji = createHuijiTemple();
  huiji.group.position.set(SITES.huiji.x, SITES.huiji.y, SITES.huiji.z);
  staticRoot.add(huiji.group);

  const guanyin = createGuanyin();
  guanyin.position.set(SITES.guanyin.x, SITES.guanyin.y, SITES.guanyin.z);
  guanyin.rotation.y = 0;
  staticRoot.add(guanyin);

  addHeroRocks(staticRoot);

  const burnerG = createIncenseBurner(1.5);
  burnerG.position.set(0, SITES.guanyin.y, 384);
  staticRoot.add(burnerG);

  const stacks = [
    [386, 424, 62, 13, 31],
    [452, 356, 44, 10, 47],
    [-402, 388, 58, 12, 53],
    [-474, 306, 40, 9, 59],
    [524, 110, 34, 8, 67],
    [-516, -58, 30, 7, 71],
  ];
  for (const [x, z, h, r, seed] of stacks) {
    const st = createSeaStack({ radius: r, height: h, seed });
    st.position.set(x, 0, z);
    staticRoot.add(st);
  }

  for (const [site, text] of [
    [SITES.guanyin, '南海观音'],
    [SITES.puji, '普济禅寺'],
    [SITES.fayu, '法雨禅寺'],
    [SITES.huiji, '慧济禅寺'],
    [SITES.coast, '千步沙'],
  ]) {
    const sign = createSteleSign(text);
    sign.position.set(site.x + 18, heightAt(site.x + 18, site.z + 20), site.z + 20);
    sign.rotation.y = -0.5;
    staticRoot.add(sign);
  }

  const guanyinBase = SITES.guanyin.y;
  const flagPoles = [
    { x: -42, z: 382, y: guanyinBase, h: 12, r: 0.16 },
    { x: 42, z: 382, y: guanyinBase, h: 12, r: 0.16 },
    { x: -48, z: 348, y: guanyinBase, h: 11, r: 0.15 },
    { x: 48, z: 348, y: guanyinBase, h: 11, r: 0.15 },
    { x: -34, z: 136, y: SITES.puji.y, h: 10, r: 0.15 },
    { x: 34, z: 136, y: SITES.puji.y, h: 10, r: 0.15 },
    { x: -34, z: 96, y: SITES.puji.y, h: 10, r: 0.15 },
    { x: 34, z: 96, y: SITES.puji.y, h: 10, r: 0.15 },
  ];
  const flagStrings = [
    { a: new THREE.Vector3(-42, guanyinBase + 11.8, 382), b: new THREE.Vector3(42, guanyinBase + 11.8, 382), count: 20, size: 1.15 },
    { a: new THREE.Vector3(-48, guanyinBase + 10.8, 348), b: new THREE.Vector3(-42, guanyinBase + 11.8, 382), count: 10, size: 1.0 },
    { a: new THREE.Vector3(48, guanyinBase + 10.8, 348), b: new THREE.Vector3(42, guanyinBase + 11.8, 382), count: 10, size: 1.0 },
    { a: new THREE.Vector3(-34, SITES.puji.y + 9.8, 136), b: new THREE.Vector3(34, SITES.puji.y + 9.8, 136), count: 16, size: 1.05 },
    { a: new THREE.Vector3(-34, SITES.puji.y + 9.8, 96), b: new THREE.Vector3(34, SITES.puji.y + 9.8, 96), count: 16, size: 1.05 },
  ];
  const flags = createPrayerFlags(flagStrings, flagPoles);
  staticRoot.add(flags.group);

  const clearZones = [
    { x: SITES.guanyin.x, z: SITES.guanyin.z, r: 82 },
    { x: SITES.puji.x, z: SITES.puji.z, r: 132 },
    { x: SITES.fayu.x, z: SITES.fayu.z, r: 92 },
    { x: SITES.huiji.x, z: SITES.huiji.z, r: 66 },
    { x: 62, z: 168, r: 26 },
    { x: -236, z: 166, r: 54 },
    { x: -300, z: 250, r: 54 },
  ];
  const pathClear = paths.clearance;
  function isClear(x, z, margin = 0) {
    for (const c of clearZones) {
      if (Math.hypot(x - c.x, z - c.z) < c.r + margin) return true;
    }
    for (const c of pathClear) {
      if (Math.hypot(x - c.x, z - c.z) < c.r + margin) return true;
    }
    return false;
  }

  const vegetation = createVegetation(isClear);
  root.add(vegetation.group);

  const overlaySprites = [];
  guanyin.traverse((obj) => {
    if (obj.isSprite) overlaySprites.push(obj);
  });
  for (const s of overlaySprites) {
    guanyin.remove(s);
    s.position.add(guanyin.position);
  }

  const merged = mergeStaticGroup(staticRoot);
  merged.name = 'merged-static';
  root.add(merged);
  for (const s of overlaySprites) root.add(s);

  const sea = createSea();
  root.add(sea.mesh);
  const foam = createFoamRing(coastRadius);
  root.add(foam.group);
  const mist = createSeaMist();
  root.add(mist.group);
  const clouds = createCloudBanks();
  root.add(clouds.group);

  const emitters = [
    { position: new THREE.Vector3(-60, SITES.puji.y + 11.9, 130), count: 300, height: 34, spread: 1.8 },
    { position: new THREE.Vector3(180, SITES.fayu.y + 9.2, -78), count: 240, height: 26, spread: 1.4 },
    { position: new THREE.Vector3(-70, SITES.huiji.y + 7.2, -241), count: 180, height: 22, spread: 1.2 },
    { position: new THREE.Vector3(0, SITES.guanyin.y + 7.8, 384), count: 320, height: 40, spread: 2.0 },
  ];
  const incense = createIncense(emitters);
  root.add(incense.group);

  const crowdData = createCrowdData(heightAt);
  const crowd = createCrowd({ ...crowdData, groundAt: heightAt });
  root.add(crowd.group);
  const birds = createBirds();
  root.add(birds.group);

  const views = {
    overview: { p: [352, 212, 792], t: [0, 52, 62] },
    guanyin: { p: [30, 33, 404], t: [0, 33, 342] },
    puji: { p: [-64, 36, 252], t: [-60, 15, 112] },
    coast: { p: [-448, 42, 402], t: [-302, 12, 252] },
    dusk: { p: [486, 152, 672], t: [0, 56, 42] },
  };

  const notes = {
    overview: ['普陀山 · 海天佛国', '自莲花洋远眺，普陀山如一叶青螺浮于东海，南海观音金身、普济寺殿宇与满岛松涛尽收眼底'],
    guanyin: ['南海观音', '三十三米铜像立于龙湾岗上，面朝莲花洋，左手持净瓶，右手施无畏印，海天之间金光湛然'],
    puji: ['普济禅寺', '前临海印池，三桥卧波，大圆通殿黄瓦重檐，香火与古樟浓荫在庭院里交织'],
    coast: ['千步沙 · 花岗海岸', '花岗岩礁石与海蚀崖沿岛铺展，浪击石骨，雾从潮间带缓缓升起'],
    dusk: ['普陀暮色', '夕阳沉入莲花洋，殿脊、观音金身与珞珈山影渐次隐入海雾'],
  };

  const smokeBurners = [];
  return {
    group: root,
    terrain,
    merged,
    vegetation: vegetation.counts,
    crowdCount: crowd.count,
    seaUniforms: sea.uniforms,
    parts: { sea, foam, mist, clouds, incense, flags, crowd, birds, vegetation },
    views,
    notes,
    heightAt,
    sites: SITES,
    update(elapsed, dt) {
      sea.uniforms.uTime.value = elapsed;
      foam.materials[0].opacity = 0.42 + Math.sin(elapsed * 0.8) * 0.08;
      foam.materials[1].opacity = 0.18 + Math.sin(elapsed * 0.55 + 1.4) * 0.04;
      foam.maps[0].offset.x = elapsed * 0.018;
      foam.maps[1].offset.x = -elapsed * 0.011;
      mist.update(elapsed);
      clouds.update(elapsed);
      incense.update(elapsed);
      flags.update(elapsed);
      crowd.update(elapsed);
      birds.update(elapsed);
    },
  };
}
