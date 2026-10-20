import * as THREE from 'three';
import { mats } from './materials.js';
import { heightAt, createTerrain, createDistantMountains, trailPointAt, platforms } from './terrain.js';
import { createGraniteOutcrops, createFeilaiStone, createYingkePine, createStoneTrail, createPlatforms, createTrailMarkers } from './peaks.js';
import { createVegetation } from './vegetation.js';
import { createCloudSea } from './clouds.js';
import { createFineDetail, createSkyDetail } from './details.js';
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
  root.add(clouds.group);
  root.add(createSkyDetail());

  function view(p, t) {
    return { p, t };
  }

  const views = {
    overview: view([312, 86, 512], [-6, 122, -210]),
    yingkesong: view([180, 122, 108], [136, 129, 38]),
    guangmingding: view([-84, 242, -125], [-206, 193, -330]),
    feilaishi: view([-166, 156, 66], [-252, 152, -80]),
    sunrise: view([-132, 236, -178], [438, 310, 38]),
  };

  const notes = {
    overview: ['黄山 · 云海群峰', '自南麓低处仰望，花岗岩峰林拔地而起，松影与云气在峡谷间层层退远'],
    yingkesong: ['迎客松', '玉屏楼侧，古松探身崖外，枝干如臂，与远处群峰一同迎向云海'],
    guangmingding: ['光明顶', '黄山第二高峰，平台临崖，云海在脚下铺展，远脊如墨线浮沉'],
    feilaishi: ['飞来石', '巨石孤悬峰顶，似自天外飞来，云涛掠过岩壁时更显峭拔'],
    sunrise: ['黄山日出', '东天泛金，云海被晨光染暖，峰尖浮出雾面，山体仍沉在蓝灰阴影里'],
  };

  return {
    group: root,
    terrain,
    labels,
    clouds,
    vegetation: vegetation.counts,
    update: (elapsed) => clouds.update(elapsed),
    views,
    notes,
    heightAt,
    trailPointAt,
    platforms,
  };
}
