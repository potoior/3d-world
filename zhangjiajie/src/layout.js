import * as THREE from 'three';
import { mats } from './materials.js';
import { heightAt, createTerrain, createDistantMountains, trailPointAt, platforms } from './terrain.js';
import { createSandstonePillars, createStoneTrail, createPlatforms, createTrailMarkers } from './peaks.js';
import { createVegetation } from './vegetation.js';
import { createCloudSea } from './clouds.js';
import { createFineDetail, createSkyDetail } from './details.js';
import { createLandmarks } from './landmarks.js';
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

export function buildZhangjiajie() {
  const root = new THREE.Group();
  root.name = 'zhangjiajie-world';

  const terrain = createTerrain(mats.terrain, 2600, 256);
  root.add(terrain);

  const landmarks = createLandmarks();

  const staticRoot = new THREE.Group();
  staticRoot.name = 'static-quartz-and-pine';
  staticRoot.add(createDistantMountains(mats.farA, mats.farB));
  staticRoot.add(createSandstonePillars());
  staticRoot.add(createStoneTrail());
  staticRoot.add(createPlatforms());
  staticRoot.add(createTrailMarkers());
  staticRoot.add(createFineDetail());
  staticRoot.add(landmarks.staticGroup);
  const vegetation = createVegetation();
  staticRoot.add(vegetation.group);

  const merged = mergeStaticGroup(staticRoot);
  merged.name = 'merged-static-scene';
  root.add(merged);

  const labels = [
    makeLabel('天下第一桥', 'FIRST BRIDGE UNDER HEAVEN', 28, 264, -452, 1.05),
    makeLabel('百龙天梯', 'BAILONG ELEVATOR', 298, 312, -418, 1.0),
    makeLabel('迷魂台', 'MAGIC VIEWPOINT', -150, 246, -226, 0.9),
    makeLabel('玻璃栈道', 'GLASS WALKWAY', 352, 258, -394, 0.8),
  ];
  labels.forEach((l) => root.add(l));

  const clouds = createCloudSea();
  root.add(clouds.group);
  root.add(landmarks.dynamicGroup);
  root.add(createSkyDetail());

  function view(p, t) {
    return { p, t };
  }

  const views = {
    overview: view([430, 150, 580], [0, 150, -300]),
    pillars: view([210, 215, 240], [-40, 190, -330]),
    bridge: view([-120, 300, -600], [0, 238, -470]),
    elevator: view([120, 190, -360], [300, 212, -420]),
    clouds: view([-250, 185, -120], [40, 175, -560]),
  };

  const notes = {
    overview: ['张家界 · 武陵源', '石英砂岩峰林拔地而起，云气在深谷与岩柱之间层层退远'],
    pillars: ['峰林', '密集的岩柱如林矗立，横向岩层与纵向裂隙刻出亿万年的地质切片'],
    bridge: ['天下第一桥', '天然石桥横跨两峰，岩拱悬于深谷之上，松影与云海在桥下流动'],
    elevator: ['百龙天梯', '玻璃天梯贴崖而上，缆车索道越过峰谷，云雾在脚下聚散'],
    clouds: ['云海', '低云漫过峰腰，只余柱顶如岛屿浮沉，山脊在雾中一层层退远'],
  };

  return {
    group: root,
    terrain,
    labels,
    clouds,
    landmarks,
    vegetation: vegetation.counts,
    update: (elapsed) => {
      clouds.update(elapsed);
      landmarks.update(elapsed);
    },
    views,
    notes,
    heightAt,
    trailPointAt,
    platforms,
  };
}
