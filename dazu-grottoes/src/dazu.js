import * as THREE from 'three';
import { mergeStaticGroup } from './geometry.js';
import { buildDazuRock } from './dazuRock.js';
import { buildDazuSite } from './dazuSite.js';
import { frontAt } from './dazuCommon.js';
import { colliders } from './architectures.js';

export function buildDazuOverlay() {
  const group = new THREE.Group();
  buildDazuRock(group);
  const life = buildDazuSite(group);
  for (let z = -250; z <= 250; z += 20) {
    const f = frontAt(z);
    colliders.push({ name: '大足砂岩崖壁', minX: f - 3, maxX: f + 34, minZ: z - 11, maxZ: z + 11 });
  }
  return { group: mergeStaticGroup(group), life };
}
