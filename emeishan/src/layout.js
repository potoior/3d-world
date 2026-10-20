import * as THREE from 'three';
import { mats } from './materials.js';
import { heightAt, createTerrain, createDistantMountains, trailPointAt, platforms } from './terrain.js';
import { createGraniteOutcrops, createGongbeiStone, createAncientPine, createStoneTrail, createPlatforms, createTrailMarkers } from './peaks.js';
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

export function buildEmeishan() {
  const root = new THREE.Group();
  root.name = 'emeishan-world';

  const terrain = createTerrain(mats.terrain, 2600, 256);
  root.add(terrain);

  const architecture = createArchitecture();

  const staticRoot = new THREE.Group();
  staticRoot.name = 'static-forest-temple-and-stair';
  staticRoot.add(createDistantMountains(mats.farA, mats.farA));
  staticRoot.add(createGraniteOutcrops());
  staticRoot.add(createGongbeiStone());
  staticRoot.add(createAncientPine());
  staticRoot.add(createStoneTrail());
  staticRoot.add(createPlatforms());
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
    makeLabel('报国寺', 'BAOGUO TEMPLE · 550 M', 236, 47, 438, 1),
    makeLabel('万年寺', 'WANNIAN TEMPLE · 1020 M', 128, 126, 68, 1),
    makeLabel('金顶 · 十方普贤', 'GOLDEN SUMMIT · 3099 M', -134, 288, -236, 1.08),
    makeLabel('云海', 'SEA OF CLOUDS', -52, 267, -296, 0.8),
  ];
  labels.forEach((l) => root.add(l));

  const clouds = createCloudSea();
  root.add(clouds.group);
  root.add(createSkyDetail());

  function view(p, t) {
    return { p, t };
  }

  const monkeyPoint = trailPointAt(0.535);
  const views = {
    overview: view([400, 320, 780], [-24, 160, -120]),
    golden: view([-78, 282, -168], [-134, 272, -238]),
    monkeys: view([monkeyPoint.x + 30, monkeyPoint.y + 17, monkeyPoint.z + 42], [monkeyPoint.x, monkeyPoint.y + 3, monkeyPoint.z]),
    temple: view([278, 54, 495], [230, 36, 429]),
    clouds: view([-72, 286, -286], [560, 296, -118]),
  };

  const notes = {
    overview: ['峨眉山 · 金顶', '印度洋暖湿气流托起常绿林海，石阶古道自报国寺盘旋而上，直入金顶云涛'],
    golden: ['金顶 · 十方普贤', '十方普贤铜像骑六牙白象，立于多重金台之上；金殿、铜瓦与云海同映晨光'],
    monkeys: ['峨眉灵猴', '冷杉与苔藓覆盖的陡坡间，藏酋猴沿古道两侧觅食嬉戏，链栏在雾里泛着青光'],
    temple: ['报国寺', '红墙灰瓦的山门寺院依坡而建，香炉青烟、钟声与朝山者的祈愿红绸交织'],
    clouds: ['金顶云海', '东天破晓，日轮自云海跃出，金色光柱穿过薄雾，群峰只余青黛色的岛影'],
  };

  return {
    group: root,
    terrain,
    labels,
    clouds,
    architecture,
    life,
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
