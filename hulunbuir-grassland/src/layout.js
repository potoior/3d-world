import * as THREE from 'three';
import { mats } from './materials.js';
import {
  heightAt,
  createTerrain,
  createDistantHills,
  createRiverGeometry,
  riverPointAt,
  trailPointAt,
  campCenter,
  aobao,
} from './terrain.js';

function view(p, t, fov) {
  const v = { p, t };
  if (fov) v.fov = fov;
  return v;
}

export function buildHulunbuir() {
  const root = new THREE.Group();
  root.name = 'hulunbuir-world';

  const terrain = createTerrain(mats.terrain, 1980, 240);
  root.add(terrain);

  const hills = createDistantHills([mats.farA, mats.farB, mats.farC]);
  root.add(hills);

  const river = new THREE.Mesh(createRiverGeometry(), mats.water);
  river.name = 'morigele-river';
  river.receiveShadow = false;
  river.renderOrder = 1;
  root.add(river);

  const views = {
    overview: view([720, 330, 790], [10, 34, -150], 46),
    river: view([250, 92, 432], [-125, 12, 155], 44),
    camp: view([204, 54, 302], [104, 15, 142], 45),
    horses: view([185, 33, 338], [24, 9, 238], 42),
    dusk: view([790, 265, 700], [-90, 36, -200], 47),
  };

  const notes = {
    overview: [
      '呼伦贝尔 · 牧草王国',
      '莫日格勒河在金色草浪间蜿蜒，蒙古包、马群与远山沉入辽阔的黄昏',
    ],
    river: [
      '莫日格勒河',
      '河水在草原上反复折返，像一条被风拉长的银色哈达，映着天光缓缓流向远方',
    ],
    camp: [
      '牧民营地',
      '白色蒙古包围着夏季牧场，炊烟、木车与拴马桩守着河湾里的日常',
    ],
    horses: [
      '马群',
      '三河马低头啃食丰茂的牧草，鬃毛被晚风掀起，远处羊群缓缓移动',
    ],
    dusk: [
      '草原暮色',
      '落日贴近低缓的丘陵，云层被烧成铜红，草浪与河水一同没入深蓝',
    ],
  };

  return {
    group: root,
    terrain,
    river,
    hills,
    views,
    notes,
    heightAt,
    trailPointAt,
    riverPointAt,
    campCenter,
    aobao,
    update: () => {},
  };
}
