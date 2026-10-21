import * as THREE from 'three';
import { mergeStaticGroup } from './geometry.js';
import { buildTerrain, createRidgeBlades } from './siguniang-terrain.js';
import { createForest, createMeadow, createRocks } from './siguniang-flora.js';
import { createWater } from './siguniang-water.js';
import { createSky } from './siguniang-sky.js';
import {
  createBoardwalk,
  createBridges,
  createManiCairn,
  createSigns,
  createStupa,
} from './siguniang-culture.js';
import { createPrayerFlags, createYaks } from './siguniang-culture-life.js';
import { heightAt, makeMaterials } from './siguniang-util.js';

export function buildSiguniangScene() {
  const mats = makeMaterials();
  const staticRoot = new THREE.Group();

  const terrain = buildTerrain(mats);
  createRidgeBlades(staticRoot, mats);
  createBoardwalk(staticRoot, mats);
  createBridges(staticRoot, mats);
  createStupa(staticRoot, mats);
  createManiCairn(staticRoot, mats);
  const flags = createPrayerFlags(staticRoot, mats);
  createSigns(staticRoot, mats);

  const merged = mergeStaticGroup(staticRoot);

  const group = new THREE.Group();
  group.add(terrain);
  group.add(merged);

  const water = createWater();
  group.add(water.group);

  const forest = createForest(mats);
  group.add(forest.group);
  const rocks = createRocks(mats);
  group.add(rocks);
  const meadow = createMeadow(mats);
  group.add(meadow.group);

  group.add(flags.group);
  const yaks = createYaks(mats);
  group.add(yaks.group);
  const sky = createSky();
  group.add(sky.group);

  const counts = {
    trees: forest.count,
    conifers: forest.conifers,
    larches: forest.larches,
    rocks: rocks.count,
    grass: meadow.grass,
    flowers: meadow.flowers,
    yaks: yaks.count,
  };

  const life = {
    update(t, dt) {
      const step = dt || 0.016;
      for (const mat of water.waterMaterials) mat.uniforms.uTime.value = t;
      flags.update(t);
      yaks.update(t);
      sky.update(t, step);
    },
  };

  const world = {
    group,
    waterMaterials: water.waterMaterials,
    heightAt,
    life,
    sky,
    flags,
    yaks,
    counts,
    views: null,
    notes: null,
  };

  life.update(0, 0.016);
  return world;
}
