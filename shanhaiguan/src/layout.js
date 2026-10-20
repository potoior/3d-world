import * as THREE from 'three';
import { mats, sharedTextures } from './materials.js';
import { heightAt, createTerrain, createQilianMountains } from './terrain.js';
import { GROUND, WALL_HEIGHT, FORTRESS, addWall, addRamps, addInterior } from './fortress.js';
import { createTowers } from './towers.js';
import { createDecor } from './decor.js';
import { createLife } from './life.js';
import { mergeStaticGroup } from './geometry.js';
import { mergedMesh } from './geometry.js';

function makeView(x, y, z, tx, ty, tz) {
  const safeY = Math.max(y, heightAt(x, z) + 14);
  return { p: [x, safeY, z], t: [tx, ty, tz] };
}

function makeLabel(key, x, y, z) {
  const map = sharedTextures[key];
  if (!map) return null;
  const mat = new THREE.SpriteMaterial({
    map,
    transparent: true,
    depthWrite: false,
    opacity: 0.94,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.position.set(x, y, z);
  sprite.scale.set(7.5, 15, 1);
  sprite.name = 'label-' + key;
  return sprite;
}

export function buildJiayuguan() {
  const root = new THREE.Group();
  root.name = 'jiayuguan-world';

  const terrain = createTerrain(mats.terrain, 3400, 260);
  root.add(terrain);
  root.add(createQilianMountains(mats.farRock, mats.farSnow));

  const staticRoot = new THREE.Group();
  staticRoot.name = 'jiayuguan-architecture';

  const buckets = new Map();
  const push = (mat, geo) => {
    if (!buckets.has(mat)) buckets.set(mat, []);
    buckets.get(mat).push(geo);
  };

  addWall(push, 'z', FORTRESS.W, -FORTRESS.D, FORTRESS.D, {
    outward: 1,
    openings: [{ center: 0, width: 7.4, height: 7.2 }],
  });
  addWall(push, 'z', -FORTRESS.W, -FORTRESS.D, FORTRESS.D, {
    outward: -1,
    openings: [{ center: 0, width: 6.8, height: 6.6 }],
  });
  addWall(push, 'x', FORTRESS.D, -FORTRESS.W, FORTRESS.W, { outward: 1 });
  addWall(push, 'x', -FORTRESS.D, -FORTRESS.W, FORTRESS.W, { outward: -1 });
  addWall(push, 'z', FORTRESS.BW, -FORTRESS.BD, FORTRESS.BD, {
    outward: 1,
    height: 7.8,
    thickness: 5.4,
    openings: [{ center: 0, width: 5.6, height: 5.5 }],
  });
  addWall(push, 'x', FORTRESS.BD, FORTRESS.W, FORTRESS.BW, { outward: 1, height: 7.8, thickness: 5.4 });
  addWall(push, 'x', -FORTRESS.BD, FORTRESS.W, FORTRESS.BW, { outward: -1, height: 7.8, thickness: 5.4 });

  addRamps(push);
  addInterior(push);
  const towerLabels = createTowers(push);

  for (const [mat, list] of buckets) {
    const mesh = mergedMesh(list, mat, true, true);
    if (mesh) staticRoot.add(mesh);
  }

  createDecor(staticRoot);

  const merged = mergeStaticGroup(staticRoot);
  merged.name = 'jiayuguan-merged-static';
  root.add(merged);

  const life = createLife();
  root.add(life.group);

  const labels = [];
  for (const label of towerLabels) {
    const sprite = makeLabel(label.key, label.x, label.y, label.z);
    if (sprite) {
      root.add(sprite);
      labels.push(sprite);
    }
  }

  const views = {
    overview: makeView(246, 150, 236, 6, 24, -14),
    gate: makeView(154, 31, 27, 96, 21, 0),
    wall: makeView(104, 43, 96, 22, 29, 30),
    sea: makeView(170, 28, -42, 90, 8, -160),
    dusk: makeView(204, 57, 224, 8, 25, -18),
  };

  const notes = {
    overview: ['山海关', '燕山与渤海之间的明代雄关，城垣方正，天下第一关城楼东望大海'],
    gate: ['天下第一关', '东门城楼三层重檐，红柱回廊与巨匾高悬，券门铁钉斑驳，是关城迎送使节的正面'],
    wall: ['城垣', '夯土与砖石层层叠压，垛口、女墙与马道沿城墙展开，角楼与敌台互为呼应'],
    sea: ['老龙头', '长城东端伸入渤海，入海石城与澄海楼临浪而立，海鸥与潮声环绕'],
    dusk: ['雄关暮色', '落日把夯土墙染成赤金，旌旗与檐角在风里轻摆，戈壁渐渐沉入暮色'],
  };

  return {
    group: root,
    terrain,
    labels,
    views,
    notes,
    heightAt,
    ground: GROUND,
    wallHeight: WALL_HEIGHT,
    fortress: FORTRESS,
    life,
    update: (elapsed, dt) => {
      life.update(elapsed, dt);
    },
  };
}
