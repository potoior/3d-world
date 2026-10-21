import * as THREE from 'three';
import { mats } from './materials.js';
import { heightAt, createTerrain, createDistantMountains, trailPointAt, platforms, lakeDef, templeDef } from './terrain.js';
import { createGraniteOutcrops, createFeilaiStone, createYingkePine, createStoneTrail, createPlatforms, createTrailMarkers } from './peaks.js';
import { createVegetation } from './vegetation.js';
import { createCloudSea } from './clouds.js';
import { createFineDetail, createSkyDetail } from './details.js';
import { createHuangshanRefineStatic, createHuangshanRefineLife } from './refineDetail.js';
import { createHuangshanFinalStatic } from './finalPolish.js';
import { createHuangshanFinalLife } from './finalLife.js';
import { mergeStaticGroup } from './geometry.js';
import { createTianzhuStatic, createTianzhuLife, createTianzhuLabels } from './tianzhu.js';

export function buildTianzhu() {
  const root = new THREE.Group();
  root.name = 'tianzhu-world';

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
  const vegetation = createVegetation();
  staticRoot.add(vegetation.group);
  const tianzhuStatic = createTianzhuStatic();
  staticRoot.add(tianzhuStatic.landform);
  staticRoot.add(tianzhuStatic.shrines);

  const merged = mergeStaticGroup(staticRoot);
  merged.name = 'merged-static-scene';
  root.add(merged);

  const labels = createTianzhuLabels();
  labels.forEach((l) => root.add(l));

  const clouds = createCloudSea();
  const refineLife = createHuangshanRefineLife();
  const finalLife = createHuangshanFinalLife();
  const life = createTianzhuLife();
  root.add(clouds.group);
  root.add(refineLife.group);
  root.add(finalLife.group);
  root.add(life.group);
  root.add(createSkyDetail());

  function view(p, t) {
    return { p, t };
  }

  const views = {
    overview: view([322, 152, 548], [78, 182, -120]),
    tianzhu: view([258, 236, 188], [72, 272, -150]),
    shenmigu: view([318, 146, 98], [190, 82, -80]),
    liandan: view([-292, 82, 356], [-420, 30, 220]),
    dusk: view([470, 126, 540], [68, 160, -120]),
  };

  const notes = {
    overview: ['天柱山 · 云海孤峰', '自南麓远眺，天柱一峰从云海中拔起，群脊如屏，松影与雾霭层层退远'],
    tianzhu: ['天柱峰', '海拔一千四百八十九米，花岗岩独柱擎天，崖壁如削，石阶铁索盘绕而上'],
    shenmigu: ['神秘谷', '巨石叠垒成谷，洞隙幽深，冷雾穿石而过，只闻水声与松风'],
    liandan: ['炼丹湖', '高山平湖静卧西谷，松影倒映，云气从水面缓缓升起，如丹炉吐烟'],
    dusk: ['天柱夕照', '暮色沉入江淮，西天余金染红云海，峰柱与古寺渐次隐入蓝灰雾霭'],
  };

  return {
    group: root,
    terrain,
    labels,
    clouds,
    life,
    lakeDef,
    templeDef,
    vegetation: vegetation.counts,
    update: (elapsed, dt) => {
      clouds.update(elapsed, dt);
      refineLife.update(elapsed, dt);
      finalLife.update(elapsed, dt);
      life.update(elapsed, dt);
    },
    views,
    notes,
    heightAt,
    trailPointAt,
    platforms,
  };
}

export const buildHuangshan = buildTianzhu;
