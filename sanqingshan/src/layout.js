import * as THREE from 'three';
import { mats } from './materials.js';
import { heightAt, createTerrain, createDistantMountains, trailPointAt, platforms } from './terrain.js';
import { createGraniteOutcrops, createFeilaiStone, createYingkePine, createStoneTrail, createPlatforms, createTrailMarkers } from './peaks.js';
import { createVegetation } from './vegetation.js';
import { createCloudSea } from './clouds.js';
import { createFineDetail, createSkyDetail } from './details.js';
import { createHuangshanRefineStatic, createHuangshanRefineLife } from './refineDetail.js';
import { createHuangshanFinalStatic } from './finalPolish.js';
import { createHuangshanFinalLife } from './finalLife.js';
import { mergeStaticGroup } from './geometry.js';
import { makeLabelTexture } from './textures.js';
import { createSanqingStatic } from './sanqing.js';
import { createSanqingLife } from './sanqingLife.js';

function makeLabel(title, subtitle, x, y, z, scale = 1) {
  const tex = makeLabelTexture(title, subtitle);
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: true,
    depthWrite: false,
    opacity: 0.88,
    toneMapped: true,
  });
  const spr = new THREE.Sprite(mat);
  spr.scale.set(30 * scale, 9.4 * scale, 1);
  spr.position.set(x, y, z);
  spr.renderOrder = 5;
  return spr;
}

export function buildSanqingshan() {
  const root = new THREE.Group();
  root.name = 'sanqingshan-world';

  const terrain = createTerrain(mats.terrain, 2600, 256);
  root.add(terrain);

  const staticRoot = new THREE.Group();
  staticRoot.name = 'static-granite-pine-temple';
  staticRoot.add(createDistantMountains(mats.farA, mats.farB));
  staticRoot.add(createGraniteOutcrops());
  staticRoot.add(createFeilaiStone());
  staticRoot.add(createYingkePine());
  staticRoot.add(createStoneTrail());
  staticRoot.add(createPlatforms());
  staticRoot.add(createTrailMarkers());
  staticRoot.add(createFineDetail());
  staticRoot.add(createHuangshanRefineStatic());
  staticRoot.add(createHuangshanFinalStatic());
  staticRoot.add(createSanqingStatic());
  const vegetation = createVegetation();
  staticRoot.add(vegetation.group);

  const merged = mergeStaticGroup(staticRoot);
  merged.name = 'merged-static-scene';
  root.add(merged);

  const labels = [
    makeLabel('巨蟒出山', 'GIANT PYTHON PEAK', 99, 220, 34, 1),
    makeLabel('东方女神', 'ORIENTAL GODDESS', 72, 298, -150, 0.95),
    makeLabel('玉京峰', 'YUJING PEAK · 1819 M', -170, 273, -240, 1),
    makeLabel('三清宫', 'SANQING TAOIST TEMPLE', -220, 112, -20, 0.9),
  ];
  labels.forEach((l) => root.add(l));

  const clouds = createCloudSea();
  const refineLife = createHuangshanRefineLife();
  const finalLife = createHuangshanFinalLife();
  const sanqingLife = createSanqingLife();
  root.add(clouds.group);
  root.add(refineLife.group);
  root.add(finalLife.group);
  root.add(sanqingLife.group);
  root.add(createSkyDetail());

  function view(p, t) {
    return { p, t };
  }

  const views = {
    overview: view([312, 86, 512], [-6, 122, -210]),
    julian: view([180, 230, -16], [60, 225, -148]),
    mangshan: view([220, 150, 180], [98, 140, 30]),
    yujing: view([-84, 258, -132], [-188, 248, -288]),
    clouds: view([352, 128, 286], [-22, 96, -380]),
  };

  const notes = {
    overview: ['三清山 · 云海群峰', '自南麓仰望，花岗岩柱峰拔地而起，巨蟒、女神与玉京诸峰在云气中层层退远'],
    julian: ['聚仙台', '南清园高处的天然石台，凭栏可望东方女神柱峰，松影与云涛在脚下回旋'],
    mangshan: ['巨蟒出山', '一柱擎天，蟒首探云，垂直节理与横向岩层在雾中清晰可辨'],
    yujing: ['玉京峰', '三清山最高峰，平台临崖，云海在脚下铺展，远脊如墨线浮沉'],
    clouds: ['西海岸云海', '高空栈道悬于崖壁，云层沿峡谷漫涌，链栏与松枝在风里轻响'],
  };

  return {
    group: root,
    terrain,
    labels,
    clouds,
    vegetation: vegetation.counts,
    update: (elapsed, dt) => {
      clouds.update(elapsed, dt);
      refineLife.update(elapsed, dt);
      finalLife.update(elapsed, dt);
      sanqingLife.update(elapsed, dt);
    },
    views,
    notes,
    heightAt,
    trailPointAt,
    platforms,
  };
}
