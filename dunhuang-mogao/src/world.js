import * as THREE from 'three';
import { buildTerrain, heightAt } from './terrain.js';
import { buildLake, inLake, LAKE_POLYGON } from './lake.js';
import { buildMogao } from './mogao.js';
import { buildDunes } from './dunes.js';
import { buildLife } from './life.js';
import { buildDunhuangDetail } from './detail.js';

export const SPAWN = { x: -38, z: 72, yaw: 0.32 };
export const BOUNDS = { minX: -228, maxX: 300, minZ: -126, maxZ: 320 };

export const FP_WORLD = {
  spawn: SPAWN,
  bounds: BOUNDS,
  lake: LAKE_POLYGON,
  inLake,
  heightAt,
  decks: [
    { minX: -89.5, maxX: -32.5, minZ: 58.5, maxZ: 63.5, y: 0.55 },
    { minX: -97.5, maxX: -86.5, minZ: 45.5, maxZ: 56.5, y: 0.72 },
  ],
  colliders: {
    boxes: [
      { minX: -200, maxX: 160, minZ: -190, maxZ: -130 },
      { minX: -100.2, maxX: -83.8, minZ: 42.8, maxZ: 59.2 },
      { minX: 22, maxX: 62, minZ: -142, maxZ: -126 },
    ],
    circles: [
      { x: -92, z: 51, r: 4.6 },
    ],
  },
};

export function buildDunhuangScene(materials) {
  const group = new THREE.Group();
  const terrain = buildTerrain(materials);
  group.add(terrain);
  const lake = buildLake(materials);
  group.add(lake.group);
  const mogao = buildMogao(materials);
  group.add(mogao.group);
  const dunes = buildDunes(materials);
  group.add(dunes.group);
  const detail = buildDunhuangDetail(materials, { lake, mogao, dunes });
  group.add(detail.group);
  const life = buildLife(materials, { lake, mogao, dunes, detail });
  group.add(life.group);
  return {
    group,
    materials,
    lake,
    mogao,
    dunes,
    detail,
    life,
    waterMaterial: lake.waterMaterial,
    fpWorld: FP_WORLD,
    stats: {
      camels: dunes.camels.length,
      trees: dunes.trees.length,
      reeds: lake.reedCount,
      shrubs: dunes.shrubCount,
      rocks: dunes.rockCount,
      flags: mogao.flags.data.length + detail.flags.data.length,
      caves: detail.caveCount,
      detailReeds: detail.reedCount,
    },
  };
}
