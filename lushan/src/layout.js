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
  root.name = 'huangshan-world';

  const terrain = createTerrain(mats.terrain, 2600, 256);
  root.add(terrain);

  const staticRoot = new THREE.Group();
  staticRoot.name = 'static-granite-and-pine';
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
    makeLabel('迎客松', 'GUEST-GREETING PINE', 139, 153, 45, 1),
    makeLabel('光明顶', 'BRIGHT SUMMIT · 1860 M', -150, 237, -226, 1),
    makeLabel('飞来石', 'FLYING-OVER ROCK', -255, 170, -78, 0.9),
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
    overview: view([312, 86, 512], [-6, 122, -210]),
    sandiequan: view([180, 122, 108], [136, 108, 38]),
    wulaofeng: view([-84, 242, -125], [-206, 193, -330]),
    hanpokou: view([-166, 156, 66], [-252, 152, -80]),
    sunrise: view([-132, 236, -178], [438, 310, 38]),
  };

  const notes = {
    overview: ['庐山 · 云海飞瀑', '鄱阳湖平原之上，庐山群峰拔地而起，云雾在谷壑间流动，飞瀑从崖口垂落'],
    sandiequan: ['三叠泉', '三级瀑布沿崖壁层层跌落，水声如雷，潭水碧绿，石阶沿峡壁盘旋而下'],
    wulaofeng: ['五老峰', '五座岩峰并列如五位老人，崖壁临鄱阳湖，云海自山脚漫上来'],
    hanpokou: ['含鄱口', '山口正对鄱阳湖，晨光从湖面升起，云涛与远水连成一线'],
    sunrise: ['庐山日出', '东天泛金，云海被晨光染暖，峰尖浮出雾面，山体仍沉在蓝灰阴影里'],
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
