import * as THREE from 'three';
import { buildTerrain } from './terrain.js';
import { buildPalace } from './palace.js';
import { mergeStaticGroup } from './geometry.js';

export function buildPotala() {
  const root = new THREE.Group();
  buildTerrain(root);
  root.add(buildPalace());
  const group = mergeStaticGroup(root);
  return { group };
}
