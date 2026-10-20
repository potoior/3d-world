import * as THREE from 'three';
import { mergeStaticGroup } from './geometry.js';
import { makeWaterMaterial } from './materials.js';
import { createTerrain, createWater, createMist, WATER_Y } from './terrain.js';
import { createBirds } from './life.js';
import { colliders } from './architectures.js';

export function buildDazuScene() {
  colliders.length = 0;
  const root = new THREE.Group();
  const waterMaterial = makeWaterMaterial();
  root.add(createTerrain());
  const water = new THREE.Mesh(createWater(), waterMaterial);
  water.position.y = WATER_Y;
  water.renderOrder = 1;
  root.add(water);

  const extras = new THREE.Group();
  const mist = createMist();
  extras.add(mist);
  const birds = createBirds();
  extras.add(birds);
  extras.userData.birds = birds;
  extras.userData.mist = mist;

  return { group: mergeStaticGroup(root), extras, waterMaterial, colliders };
}
