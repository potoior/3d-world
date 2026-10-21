import * as THREE from 'three';
import { mats } from './materials.js';
import { heightAt, createTerrain, createDistantMountains, trailPointAt, platforms } from './terrain.js';
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
  spr.scale.set(28 * scale, 8.8 * scale, 1);
  spr.position.set(x, y, z);
  spr.renderOrder = 5;
  return spr;
}

export function buildShennongjia() {
  const root = new THREE.Group();
  root.name = 'shennongjia-world';

  const terrain = createTerrain(mats.terrain, 2600, 240);
  root.add(terrain);

  const staticRoot = new THREE.Group();
  staticRoot.name = 'shennongjia-static-highland';
  staticRoot.add(createDistantMountains(mats.farA, mats.farB));

  const merged = mergeStaticGroup(staticRoot);
  merged.name = 'merged-distant-ridges';
  root.add(merged);

  const labels = [
    makeLabel('神农顶', 'SHENNONGDING · 3106.2 M', -334, heightAt(-334, -364) + 42, -364, 1.02),
    makeLabel('大九湖', 'DAJIUHU WETLAND', 330, 44, 150, 0.98),
    makeLabel('板壁岩', 'BANBIYAN ROCK SLABS', -62, heightAt(-62, -520) + 38, -520, 0.92),
    makeLabel('原始森林', 'PRIMEVAL MIXED FOREST', 150, heightAt(150, -145) + 30, -145, 0.82),
  ];
  labels.forEach((l) => root.add(l));

  function view(p, t) {
    return { p, t };
  }

  const views = {
    overview: view([690, 430, 790], [10, 105, -170]),
    shennongding: view([-70, 405, -60], [-334, 318, -364]),
    dajiuhu: view([530, 105, 405], [320, 12, 130]),
    banbiyan: view([95, 305, -315], [-62, 202, -520]),
    dusk: view([760, 275, 575], [-30, 108, -260]),
  };

  const notes = {
    overview: ['神农架 · 华中屋脊', '原始混交林铺满山脊，大九湖的水光与远山在薄雾中层层退远'],
    shennongding: ['神农顶', '海拔三千余米的华中屋脊，高山草甸与冷杉林在云线之上展开'],
    dajiuhu: ['大九湖', '高山湿地湖泊星罗棋布，草甸、木栈道与水面倒影交织成静谧的谷地'],
    banbiyan: ['板壁岩', '层叠岩壁如书页般立起，金丝猴在冷杉与苔藓之间穿行'],
    dusk: ['暮色神农架', '落日沉入蓝色的远山，雾气漫过湿地与林梢，山谷归于安静'],
  };

  return {
    group: root,
    terrain,
    labels,
    platforms,
    views,
    notes,
    heightAt,
    trailPointAt,
    update: () => {},
  };
}
