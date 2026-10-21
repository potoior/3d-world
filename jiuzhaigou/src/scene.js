import * as THREE from 'three';
import { mergeStaticGroup } from './geometry.js';
import { createTerrain, createMist } from './terrain.js';
import { createSnowPeaks, createDistantRidge } from './jiuzhaiNature.js';
import { colliders } from './architectures.js';

export function buildJiuzhaiScene() {
  colliders.length = 0;
  const root = new THREE.Group();
  root.add(createTerrain());
  root.add(createDistantRidge());
  root.add(createSnowPeaks());

  const extras = new THREE.Group();
  extras.add(createMist());

  return {
    group: mergeStaticGroup(root),
    extras,
    waterMaterial: null,
    colliders,
  };
}
