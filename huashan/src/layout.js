import * as THREE from 'three';
import { mats } from './materials.js';
import { heightAt, createTerrain, createDistantMountains, trailPointAt, platforms } from './terrain.js';
import {
  createGraniteOutcrops,
  createGongbeiStone,
  createAncientPine,
  createStoneTrail,
  createPlatforms,
  createTrailMarkers,
  createPlankWalkway,
  createChainRoute,
} from './peaks.js';
import { createVegetation } from './vegetation.js';
import { createCloudSea } from './clouds.js';
import { createFineDetail, createSkyDetail } from './details.js';
import { createArchitecture } from './architecture.js';
import { createLife } from './life.js';
import { mergeStaticGroup } from './geometry.js';
import { makeLabelTexture } from './textures.js';

function makeLabel(title, subtitle, x, y, z, scale = 1) {
  const tex = makeLabelTexture(title, subtitle);
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: true,
    depthWrite: false,
    opacity: 0.9,
    toneMapped: true,
  });
  const spr = new THREE.Sprite(mat);
  spr.scale.set(30 * scale, 9.4 * scale, 1);
  spr.position.set(x, y, z);
  spr.renderOrder = 5;
  return spr;
}

export function buildHuashan() {
  const root = new THREE.Group();
  root.name = 'huashan-world';

  const terrain = createTerrain(mats.terrain, 2600, 282);
  root.add(terrain);

  const architecture = createArchitecture();
  const walkway = createPlankWalkway();
  const chainRoute = createChainRoute();

  const staticRoot = new THREE.Group();
  staticRoot.name = 'static-granite-temple-and-cliff-walkway';
  staticRoot.add(createDistantMountains(mats.farA, mats.farB));
  staticRoot.add(createGraniteOutcrops());
  staticRoot.add(createGongbeiStone());
  staticRoot.add(createAncientPine());
  staticRoot.add(createStoneTrail());
  staticRoot.add(createPlatforms());
  staticRoot.add(walkway.group);
  staticRoot.add(chainRoute.group);
  staticRoot.add(createTrailMarkers());
  staticRoot.add(createFineDetail());
  staticRoot.add(architecture.group);
  const vegetation = createVegetation();
  staticRoot.add(vegetation.group);

  const merged = mergeStaticGroup(staticRoot);
  merged.name = 'merged-static-scene';
  root.add(merged);

  const life = createLife(architecture);
  root.add(life.group);

  const labels = [
    makeLabel('长空栈道', 'CHANGKONG PLANK ROAD · 2160 M', 58, 356, -352, 0.95),
    makeLabel('北峰', 'NORTH PEAK · 1614 M', 166, 336, 24, 0.9),
    makeLabel('西峰', 'WEST PEAK · 2087 M', -220, 406, -250, 0.9),
    makeLabel('南峰', 'SOUTH PEAK · 2154 M', -28, 422, -382, 0.9),
  ];
  labels.forEach((l) => root.add(l));

  const clouds = createCloudSea();
  root.add(clouds.group);
  root.add(createSkyDetail());

  function view(p, t) {
    return { p, t };
  }

  const views = {
    overview: view([520, 330, 760], [-10, 250, -300]),
    changkong: view([196, 372, -184], [58, 326, -352]),
    plank: view([104, 340, -316], [58, 330, -362]),
    northpeak: view([268, 342, 176], [165, 306, 25]),
    clouds: view([-172, 432, -92], [60, 300, -420]),
  };

  const notes = {
    overview: ['华山 · 西岳', '白花岗岩峰林自渭河平原拔起，五峰环峙，深谷如裂，长空栈道横挂南峰绝壁'],
    changkong: ['长空栈道', '铁索与木板悬于南峰绝壁，脚下深谷数百米，云气在崖壁间来回涌动'],
    plank: ['栈道悬空', '木板以铁梁嵌入岩壁，外侧仅一链可扶，山风过处铁索轻响，人行其上如履虚空'],
    northpeak: ['北峰', '北峰平台临崖而立，真武殿、石阶与古松相守，苍龙岭如脊线通往诸峰'],
    clouds: ['华山云海', '云涛在深谷中聚散，峰尖浮出白色海面，铁链与松影在雾中若隐若现'],
  };

  return {
    group: root,
    terrain,
    labels,
    clouds,
    architecture,
    life,
    walkway,
    chainRoute,
    vegetation: vegetation.counts,
    update: (elapsed, dt = 0.016) => {
      clouds.update(elapsed);
      life.update(elapsed, dt);
    },
    views,
    notes,
    heightAt,
    trailPointAt,
    platforms,
  };
}
