import * as THREE from 'three';
import { buildMaterials, updateHemuSway } from './hemuCore.js';
import {
  createTerrain, createBaseGround, createMountains, createRiver,
  createPaths, createScatterRocks, terrainHeight,
} from './hemuTerrain.js';
import { createForest, createMeadowDetails, createFallenLeaves } from './hemuVegetation.js';
import { createVillageBundle } from './hemuVillage.js';
import { createHerd, createBirds, createMist, createLife } from './hemuLife.js';

export { terrainHeight };

export function buildHemuScene() {
  const { M, maps } = buildMaterials();
  const root = new THREE.Group();
  root.name = 'hemu-world';

  root.add(createBaseGround(M));
  root.add(createTerrain(M));
  root.add(createMountains(M));

  const river = createRiver(M, maps.waterNormalMap);
  root.add(river.group);
  root.add(createPaths(M));
  root.add(createScatterRocks(M));

  const forest = createForest(M);
  root.add(forest.group);
  const village = createVillageBundle(M);
  root.add(village.group);
  root.add(createMeadowDetails(M));
  root.add(createFallenLeaves(M));

  const herd = createHerd(M);
  root.add(herd.group);
  const birds = createBirds(M);
  root.add(birds.group);

  const mist = createMist();
  root.add(mist.group);

  const life = createLife({ M, smokeSpots: village.smokeSpots, herd, birds, mist });
  if (life.smoke) root.add(life.smoke.group);
  const baseUpdate = life.update;
  life.update = (t, dt) => {
    updateHemuSway(t);
    baseUpdate(t, dt);
  };
  life.update(0, 0);

  root.traverse((obj) => {
    if (!obj.isMesh) return;
    if (obj.name === 'hemu-meadow' || obj.name === 'hemu-paths') {
      obj.receiveShadow = true;
      obj.castShadow = false;
    }
  });

  return {
    group: root,
    mats: M,
    waterMaterials: [river.material],
    river,
    forest,
    village,
    meadow: root.getObjectByName('hemu-meadow'),
    herd,
    birds,
    mist,
    smoke: life.smoke,
    life,
    signs: village.signs,
    lookout: village.lookout,
    treeCount: forest.count,
    smokeCount: village.smokeSpots.length,
  };
}
