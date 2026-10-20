import * as THREE from 'three';
import { mats } from './materials.js';
import { heightAt, createTerrain, createDistantMountains, trailPointAt, platforms } from './terrain.js';
import { createGraniteOutcrops, createGongbeiStone, createAncientPine, createStoneTrail, createPlatforms, createTrailMarkers } from './peaks.js';
import { createVegetation } from './vegetation.js';
import { createCloudSea } from './clouds.js';
import { createFineDetail, createSkyDetail } from './details.js';
import { createArchitecture } from './architecture.js';
import { createLife } from './life.js';
import { createMountTaiFinalPolish } from './finalPolish.js';
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

export function buildTaishan() {
  const root = new THREE.Group();
  root.name = 'taishan-world';

  const terrain = createTerrain(mats.terrain, 2600, 256);
  root.add(terrain);

  const architecture = createArchitecture();

  const staticRoot = new THREE.Group();
  staticRoot.name = 'static-granite-temple-and-stair';
  staticRoot.add(createDistantMountains(mats.farA, mats.farB));
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
  const finalPolish = createMountTaiFinalPolish();
  staticRoot.add(finalPolish.staticGroup);

  const merged = mergeStaticGroup(staticRoot);
  merged.name = 'merged-static-scene';
  root.add(merged);

  const life = createLife(architecture);
  root.add(life.group);
  root.add(finalPolish.dynamicGroup);

  const labels = [
    makeLabel('十八盘', 'EIGHTEEN BENDS · 1633 STEPS', -32, 206, -128, 1),
    makeLabel('南天门', 'NANTIAN GATE · 1460 M', -112, 252, -208, 1),
    makeLabel('玉皇顶', 'JADE EMPEROR SUMMIT · 1545 M', -134, 278, -238, 1),
  ];
  labels.forEach((l) => root.add(l));

  const clouds = createCloudSea();
  root.add(clouds.group);
  root.add(createSkyDetail());

  function view(p, t) {
    return { p, t };
  }

  const views = {
    overview: view([340, 260, 720], [-20, 130, -230]),
    nantian: view([-38, 254, -148], [-116, 238, -210]),
    summit: view([-184, 278, -266], [-62, 252, -234]),
    steps: view([92, 178, 14], [-104, 228, -206]),
    sunrise: view([-74, 270, -292], [430, 304, -150]),
  };

  const notes = {
    overview: ['泰山 · 岱宗', '五岳独尊，花岗岩山体自齐鲁平原拔起，十八盘石阶穿过云海直抵南天门'],
    nantian: ['南天门', '红墙金瓦的关门峙于十八盘尽头，云气自脚下翻涌，天门之上便是岱顶'],
    summit: ['玉皇顶', '岱顶碧霞祠前香烟袅袅，古松、碑刻与祈愿红带在晨风中舒展'],
    steps: ['十八盘', '一千六百余级石阶沿山脊陡升，石坊、灯笼与挑山工的身影在云中时隐时现'],
    sunrise: ['泰山日出', '东天泛金，日观峰下云海被晨光染暖，群峰浮出雾面，山体仍沉在青灰阴影里'],
  };

  return {
    group: root,
    terrain,
    labels,
    clouds,
    architecture,
    life,
    vegetation: vegetation.counts,
    finalPolish: finalPolish.stats,
    update: (elapsed, dt = 0.016) => {
      clouds.update(elapsed);
      life.update(elapsed, dt);
      finalPolish.update(elapsed, dt);
    },
    views,
    notes,
    heightAt,
    trailPointAt,
    platforms,
  };
}
