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

export function buildHuangshan() {
  const root = new THREE.Group();
  root.name = 'danxia-world';

  const terrain = createTerrain(mats.terrain, 2600, 256);
  root.add(terrain);

  const staticRoot = new THREE.Group();
  staticRoot.name = 'static-red-sandstone-and-forest';
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
  const vegetation = createVegetation();
  staticRoot.add(vegetation.group);

  const merged = mergeStaticGroup(staticRoot);
  merged.name = 'merged-danxia-static';
  root.add(merged);

  const labels = [];

  const clouds = createCloudSea();
  const refineLife = createHuangshanRefineLife();
  const finalLife = createHuangshanFinalLife();
  root.add(clouds.group);
  root.add(refineLife.group);
  root.add(finalLife.group);
  root.add(createSkyDetail());

  function view(p, t) {
    return { p, t };
  }

  const views = {
    overview: view([430, 280, 700], [-20, 70, -150]),
    yangyuan: view([202, 190, 178], [116, 154, 48]),
    changlao: view([-18, 300, -54], [-166, 246, -240]),
    jinjiang: view([288, 92, 486], [30, 26, 292]),
    dusk: view([566, 176, 512], [-34, 128, -214]),
  };

  const notes = {
    overview: ['丹霞山 · 赤壁丹崖', '红色砂砾岩层层叠起，锦江在群峰之间折出一道碧湾，晨光把崖壁染成赤金'],
    yangyuan: ['阳元石', '一柱孤峰自谷底拔起，风化刻出浑圆的峰头，与满山横纹赤壁相互映照'],
    changlao: ['长老峰', '丹霞山主峰之一，崖顶平台可俯瞰锦江曲流与远处层叠的红色山块'],
    jinjiang: ['锦江曲流', '江水绕过赤壁山根，竹影与湿雾浮在河面，舟行其间如入丹青长卷'],
    dusk: ['暮色丹崖', '夕阳低垂，赤壁由赭红转为暗紫，河谷升起薄雾，归鸟掠过峰顶'],
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
    },
    views,
    notes,
    heightAt,
    trailPointAt,
    platforms,
  };
}
