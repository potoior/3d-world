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

export function buildLaoshan() {
  const root = new THREE.Group();
  root.name = 'laoshan-world';

  const terrain = createTerrain(mats.terrain, 2600, 256);
  root.add(terrain);

  const staticRoot = new THREE.Group();
  staticRoot.name = 'laoshan-granite-temple-pines';
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
  merged.name = 'merged-static-scene';
  root.add(merged);

  const labels = [
    makeLabel('巨峰', 'JUFENG · 1132 M', 22, 286, -420, 1.2),
    makeLabel('太清宫', 'TAIQING PALACE', -222, 68, 452, 1.0),
    makeLabel('海岸礁石', 'GRANITE SEA CLIFFS', 330, 66, 545, 1.05),
  ];
  labels.forEach((l) => root.add(l));

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
    overview: view([260, 160, 820], [-80, 80, 120]),
    jufeng: view([104, 284, -246], [18, 252, -426]),
    taiqing: view([-136, 70, 548], [-222, 44, 450]),
    coast: view([382, 40, 650], [70, 54, 490]),
    dusk: view([430, 205, 690], [-120, 145, -330]),
  };

  const notes = {
    overview: ['崂山 · 海上第一名山', '黄海之滨，花岗岩峰林与海崖同时拔起，巨峰、道观、松影和云气在潮声里层层退远'],
    jufeng: ['巨峰', '崂山主峰海拔一千一百三十二米，岩脊如刀削，云海漫过时只见峰尖浮在雾上'],
    taiqing: ['太清宫', '道教全真随山派祖庭，青瓦殿宇依海崖而建，石阶自潮线盘上山门，松影掩映香火'],
    coast: ['海岸礁石', '花岗岩海崖探入黄海，浪涛拍击礁柱，渔船在晨雾与浪花之间缓缓移动'],
    dusk: ['崂山晨曦 · 云海', '东天泛金，海面与云海一同被晨光染暖，群峰从雾中浮起，山体仍沉在蓝灰阴影里'],
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
