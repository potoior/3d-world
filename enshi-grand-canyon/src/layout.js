import * as THREE from 'three';
import { mats } from './materials.js';
import { heightAt, createTerrain, createDistantMountains, trailPointAt, platforms } from './terrain.js';
import { createSandstonePillars, createStoneTrail, createPlatforms, createTrailMarkers } from './peaks.js';
import { createVegetation } from './vegetation.js';
import { createCloudSea } from './clouds.js';
import { createFineDetail, createSkyDetail } from './details.js';
import { mergeStaticGroup } from './geometry.js';


export function buildEnshi() {
  const root = new THREE.Group();
  root.name = 'enshi-grand-canyon-world';

  const terrain = createTerrain(mats.terrain, 2600, 256);
  root.add(terrain);

  const staticRoot = new THREE.Group();
  staticRoot.name = 'static-quartz-and-pine';
  staticRoot.add(createDistantMountains(mats.farA, mats.farB));
  staticRoot.add(createSandstonePillars());
  staticRoot.add(createStoneTrail());
  staticRoot.add(createPlatforms());
  staticRoot.add(createTrailMarkers());
  staticRoot.add(createFineDetail());
  const vegetation = createVegetation();
  staticRoot.add(vegetation.group);

  const merged = mergeStaticGroup(staticRoot);
  merged.name = 'merged-static-scene';
  root.add(merged);


  const clouds = createCloudSea();
  root.add(clouds.group);
  root.add(createSkyDetail());

  function view(p, t) {
    return { p, t };
  }

  const views = {
    overview: view([-300, 296, 760], [760, 120, 80]),
    qixingzhai: view([470, 232, -120], [665, 180, -100]),
    yizhuxiang: view([350, 176, -330], [575, 138, -175]),
    yunlong: view([220, 112, 150], [880, 78, 150]),
    dusk: view([-260, 258, 680], [760, 116, 60]),
  };

  const notes = {
    overview: ['恩施大峡谷 · 湖北', '层叠石灰岩绝壁与云海相接，七星寨、一炷香与云龙地缝在雾中次第展开'],
    qixingzhai: ['七星寨', '绝壁栈道沿石灰岩崖壁盘旋，石峰与松影在千米高差间层层退远'],
    yizhuxiang: ['一炷香', '孤峰如香柱直插谷底，层理与裂隙在风蚀中刻出细瘦的岩骨'],
    yunlong: ['云龙地缝', '地缝深切如裂，飞瀑自崖顶跌落，水声与雾气在幽谷中回旋'],
    dusk: ['黄昏', '落日把石灰岩崖壁染成暖金，云海沉入谷底，索道与松林渐次隐入暮色'],
  };

  return {
    group: root,
    terrain,
    clouds,
    vegetation: vegetation.counts,
    update: (elapsed) => {
      clouds.update(elapsed);
    },
    views,
    notes,
    heightAt,
    trailPointAt,
    platforms,
  };
}
