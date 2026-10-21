import * as THREE from 'three';
import { mergeStaticGroup } from './geometry.js';
import { buildYungangRock } from './yungangRock.js';
import { buildYungangSite } from './yungangSite.js';
import { frontAt } from './yungangCommon.js';
import { colliders } from './architectures.js';

export function buildYungangOverlay() {
  const group = new THREE.Group();
  buildYungangRock(group);
  const life = buildYungangSite(group);
  for (let z = -250; z <= 250; z += 20) {
    const f = frontAt(z);
    colliders.push({ name: '云冈砂岩崖壁', minX: f - 4, maxX: f + 34, minZ: z - 11, maxZ: z + 11 });
  }
  return { group: mergeStaticGroup(group), life };
}
