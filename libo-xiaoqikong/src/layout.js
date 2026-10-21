import * as THREE from 'three';
import { mergeStaticGroup } from './geometry.js';
import {
  makeWaterMaterial,
  addRiver,
  addTerrain,
  addKarsts,
  addCliff,
  RIVER_POLY,
  BRIDGE,
  BOARDWALK,
  SPAWN,
  BOUNDS,
  FALLS,
  riverCenter,
} from './liboTerrain.js';
import {
  createSevenArchBridge,
  createBoardwalk,
  createStonePath,
  addVillage,
  addCascades,
  addRocksNearFalls,
} from './liboStructures.js';
import { addNature } from './liboNature.js';

export { RIVER_POLY, BRIDGE, BOARDWALK, SPAWN, BOUNDS, FALLS };

export const COLLIDERS = { boxes: [], circles: [], names: [] };

export const FP_WORLD = {
  lake: RIVER_POLY,
  waterRects: [],
  causeways: [
    { points: BOARDWALK, width: 3.2, y: 0.42 },
    { points: [[-30.5, 40], [-23, 40]], width: 4.2, y: 0.48 },
  ],
  ramps: [
    { x: -26.7, z: 40, rot: Math.PI / 2, width: 4.2, span: 7.6, y0: 0.46, y1: 0.63 },
  ],
  bridges: [BRIDGE],
  islets: [],
  spawn: SPAWN,
  bounds: BOUNDS,
  colliders: COLLIDERS,
};

export function buildLiboScene() {
  COLLIDERS.boxes.length = 0;
  COLLIDERS.circles.length = 0;
  COLLIDERS.names.length = 0;

  const root = new THREE.Group();
  const staticRoot = new THREE.Group();
  const waterMaterial = makeWaterMaterial();

  addTerrain(staticRoot);
  addRiver(staticRoot, root, waterMaterial);
  addKarsts(staticRoot, COLLIDERS);

  staticRoot.add(createSevenArchBridge());
  staticRoot.add(createBoardwalk());
  staticRoot.add(createStonePath([[34, 44], [46, 62], [58, 94], [64, 126], [72, 146]], 2.6));
  staticRoot.add(createStonePath([[-10, 126], [-34, 132], [-56, 132], [-72, 132]], 2.4));
  addVillage(staticRoot, COLLIDERS);
  addCascades(staticRoot);
  addRocksNearFalls(staticRoot);

  addCliff(staticRoot, FALLS.laya.x + 4.5, FALLS.laya.z, 10, 16, 611);
  addCliff(staticRoot, FALLS.cui.x - 6, FALLS.cui.z, 14, 23, 612);
  addCliff(staticRoot, FALLS.wolong.x - 12, FALLS.wolong.z - 4, 10, 8, 613);
  for (const z of [-126, -114, -102, -90]) {
    addCliff(staticRoot, riverCenter(z) - 11, z, 5, 4, 620 + z);
  }

  const merged = mergeStaticGroup(staticRoot);
  merged.name = 'libo-static';
  root.add(merged);

  addNature(root, COLLIDERS);

  const water = root.getObjectByName('libo-water');

  return {
    group: root,
    waterMaterial,
    water,
    fallSites: FALLS,
    bridge: BRIDGE,
    spawn: SPAWN,
    colliders: COLLIDERS,
  };
}

