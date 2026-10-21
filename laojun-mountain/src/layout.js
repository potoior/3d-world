import * as THREE from 'three';
import { mats } from './materials.js';
import {
  heightAt,
  createTerrain,
  createDistantMountains,
  trailPointAt,
  platforms,
} from './terrain.js';
import { createStoneTrail, createTrailMarkers } from './peaks.js';
import { mergeStaticGroup } from './geometry.js';
import { createLaojunOverlay } from './laojun.js';

function view(p, t) {
  return { p, t };
}

export function buildLaojun() {
  const root = new THREE.Group();
  root.name = 'laojun-world';

  const terrain = createTerrain(mats.terrain, 2800, 256);
  root.add(terrain);

  const staticRoot = new THREE.Group();
  staticRoot.name = 'laojun-merged-stone';
  staticRoot.add(createDistantMountains(mats.farA, mats.farB));
  staticRoot.add(createStoneTrail());
  staticRoot.add(createTrailMarkers());
  const merged = mergeStaticGroup(staticRoot);
  merged.name = 'merged-static-scene';
  root.add(merged);

  const overlay = createLaojunOverlay();
  root.add(overlay.group);

  const views = {
    overview: view([432, 298, 548], [-8, 216, -176]),
    jinding: view([96, 268, -8], [-16, 233, -132]),
    shili: view([356, 246, 128], [208, 190, -292]),
    yuhuang: view([128, 324, -206], [42, 272, -336]),
    dusk: view([386, 246, 474], [-10, 210, -196]),
  };

  const notes = {
    overview: ['老君山 · 金顶云海', '伏牛山巅，金顶道观群立于刀脊之上，云海在十里画屏与群峰之间缓缓铺开'],
    jinding: ['金顶道观群', '老君庙、玉皇顶、亮宝台错落于绝壁之巅，金瓦映日，红绸在风里翻卷'],
    shili: ['十里画屏', '花岗岩绝壁层层如屏，栈道贴崖而行，松影与流云在峡壁间明灭'],
    yuhuang: ['玉皇顶', '海拔二千二百余米，金殿高出云表，远山如黛，香火与雾霭一同升起'],
    dusk: ['金顶暮色', '落日沉入伏牛山脊，金瓦转为赤铜色，云海染上一层淡淡的金红'],
  };

  return {
    group: root,
    terrain,
    overlay,
    views,
    notes,
    heightAt,
    trailPointAt,
    platforms,
    update: (elapsed, dt) => {
      overlay.update(elapsed, dt);
    },
  };
}
