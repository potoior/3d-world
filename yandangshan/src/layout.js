import * as THREE from 'three';
import { mats } from './materials.js';
import { heightAt, createTerrain, createDistantMountains, trailPointAt, platforms } from './terrain.js';
import { createGraniteOutcrops, createGongbeiStone, createAncientPine, createStoneTrail, createPlatforms, createTrailMarkers } from './peaks.js';
import { createVegetation } from './vegetation.js';
import { createCloudSea } from './clouds.js';
import { createFineDetail, createSkyDetail } from './details.js';
import { createArchitecture } from './architecture.js';
import { createLife } from './life.js';
import { createYandangFeatures } from './features.js';
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

export function buildYandangshan() {
  const root = new THREE.Group();
  root.name = 'yandangshan-world';

  const terrain = createTerrain(mats.terrain, 2600, 256);
  root.add(terrain);

  const architecture = createArchitecture();
  const features = createYandangFeatures();

  const staticRoot = new THREE.Group();
  staticRoot.name = 'static-rhyolite-temple-stair-and-falls';
  staticRoot.add(createDistantMountains(mats.farA, mats.farB));
  staticRoot.add(createGraniteOutcrops());
  staticRoot.add(createGongbeiStone());
  staticRoot.add(createAncientPine());
  staticRoot.add(createStoneTrail());
  staticRoot.add(createPlatforms());
  staticRoot.add(createTrailMarkers());
  staticRoot.add(createFineDetail());
  staticRoot.add(architecture.group);
  staticRoot.add(features.staticGroup);
  const vegetation = createVegetation();
  staticRoot.add(vegetation.group);

  const merged = mergeStaticGroup(staticRoot);
  merged.name = 'merged-static-scene';
  root.add(merged);

  const life = createLife(architecture);
  root.add(life.group);
  root.add(features.group);

  const labels = [
    makeLabel('大龙湫', 'DALONGQIU FALL · 197 M', 462, 240, -96, 1.05),
    makeLabel('灵岩', 'LINGYAN PEAK', 128, 138, 66, 0.95),
    makeLabel('观音洞', 'GUANYIN CAVE TEMPLE', -122, 282, -224, 0.95),
    makeLabel('灵峰', 'LINGFENG PEAK', -46, 292, -286, 0.95),
  ];
  labels.forEach((l) => root.add(l));

  const clouds = createCloudSea();
  root.add(clouds.group);
  root.add(createSkyDetail());

  function view(p, t) {
    return { p, t };
  }

  const views = {
    overview: view([430, 235, 780], [55, 155, -180]),
    dalongqiu: view([548, 84, 156], [458, 150, -96]),
    lingyan: view([252, 126, 198], [86, 126, -34]),
    guanyin: view([-52, 286, -146], [-126, 260, -236]),
    night: view([360, 215, 600], [30, 155, -185]),
  };

  const notes = {
    overview: ['雁荡山 · 灵峰', '流纹岩峰林拔地而起，大龙湫自百丈高崖跌落，灵峰洞壑间古寺隐现'],
    dalongqiu: ['大龙湫', '一瀑自百丈崖顶凌空而下，落入碧潭，水雾在风里散成轻烟，栈道贴着湿岩环潭而行'],
    lingyan: ['灵岩', '群峰合抱如城，寺宇与亭榭藏在岩壁下，石阶和铁链沿裂隙向峰顶攀升'],
    guanyin: ['观音洞', '灵峰合掌之间，洞窟深嵌崖腹，石阶穿洞而上，洞中梵宇灯火与香雾相映'],
    night: ['雁荡夜色', '峰影沉入靛蓝天幕，栈道灯笼与洞中灯火次第亮起，流萤在溪谷间明灭'],
  };

  return {
    group: root,
    terrain,
    labels,
    clouds,
    architecture,
    life,
    features,
    vegetation: vegetation.counts,
    update: (elapsed, dt = 0.016, envMix = 0) => {
      clouds.update(elapsed);
      life.update(elapsed, dt);
      features.update(elapsed, dt, envMix);
    },
    views,
    notes,
    heightAt,
    trailPointAt,
    platforms,
  };
}
