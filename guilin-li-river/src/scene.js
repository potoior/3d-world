import * as THREE from 'three';
import { mergeStaticGroup } from './geometry.js';
import { makeWaterMaterial } from './materials.js';
import { createTerrain, createWater, createMist, WATER_Y } from './terrain.js';
import { createPeaks, createBamboo, createTrees, createPines } from './peaks.js';
import { createPaddies, createReeds, createRockGarden, createBuffalo, createFieldPaths } from './fields.js';
import { createShoreDetails } from './waterDetails.js';
import { createXingping, createElephantHill, createNineHorseCliff, colliders } from './architectures.js';
import { createRafts, createBirds } from './life.js';

export function buildGuilinScene() {
  colliders.length = 0;
  const root = new THREE.Group();
  const waterMaterial = makeWaterMaterial();
  root.add(createTerrain());
  const water = new THREE.Mesh(createWater(), waterMaterial);
  water.position.y = WATER_Y;
  water.renderOrder = 1;
  root.add(water);

  root.add(createPeaks());
  root.add(createBamboo());
  root.add(createTrees());
  root.add(createPines());
  root.add(createPaddies());
  root.add(createReeds());
  root.add(createShoreDetails());
  root.add(createBuffalo());
  root.add(createFieldPaths());
  const rocks = createRockGarden();
  if (rocks) root.add(rocks);
  root.add(createXingping());
  root.add(createElephantHill());
  root.add(createNineHorseCliff());

  const extras = new THREE.Group();
  extras.add(createMist());
  const rafts = createRafts();
  extras.add(rafts);
  extras.userData.rafts = rafts.userData.rafts;
  const birds = createBirds();
  extras.add(birds);
  extras.userData.birds = birds;

  return { group: mergeStaticGroup(root), extras, waterMaterial, colliders };
}
