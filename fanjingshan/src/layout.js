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
    depthTest: false,
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

export function buildFanjingshan() {
  const root = new THREE.Group();
  root.name = 'fanjingshan-world';

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

  const merged = mergeStaticGroup(staticRoot);
  merged.name = 'merged-static-scene';
  root.add(merged);

  const labels = [
    makeLabel('红云金顶', 'HONGYUN JINDING · 2336 M', 17, 272, -101, 1.05),
    makeLabel('蘑菇石', 'MUSHROOM ROCK', -95, 148, -35, 0.9),
    makeLabel('万卷书', 'TEN THOUSAND SCROLLS', -170, 156, -40, 0.9),
    makeLabel('梵净山索道', 'FANJINGSHAN CABLEWAY', 148, 127, 143, 0.82),
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
    overview: view([292, 122, 468], [-8, 150, -170]),
    hongyun: view([96, 205, 34], [16, 212, -101]),
    mushroom: view([-24, 142, 48], [-95, 128, -35]),
    wanduan: view([-12, 150, 40], [-170, 142, -40]),
    dusk: view([300, 104, 430], [-4, 158, -180]),
  };

  const notes = {
    overview: ['梵净山 · 天空之城', '红云金顶裂峰而起，释迦殿与弥勒殿凌驾云海，蘑菇石与万卷书静立雾中'],
    hongyun: ['红云金顶', '一道裂隙将花岗岩峰劈作两座孤峰，石桥相连，两侧佛殿香火与铁链石阶直上云端'],
    mushroom: ['蘑菇石', '上大下小的风化巨石立于山脊，如菌盖探出云涛，是梵净山最古老的地标'],
    wanduan: ['万卷书', '层层叠叠的板状岩层如经卷堆叠，记录着武陵山脉亿万年来的地质褶皱'],
    dusk: ['黄昏云海', '夕照染红金顶与云层，索道轿厢缓缓穿行，古杉与山影沉入暮色'],
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
