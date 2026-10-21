import * as THREE from 'three';
import { mats } from './materials.js';
import { heightAt, createTerrain, trailPointAt, trailSamples, platforms, trailCurve } from './terrain.js';

export function buildHuangshan() {
  const root = new THREE.Group();
  root.name = 'zhangye-world';

  const terrain = createTerrain(mats.terrain, 3000, 320);
  root.add(terrain);

  return {
    group: root,
    terrain,
    labels: [],
    clouds: null,
    heightAt,
    trailPointAt,
    trailSamples,
    trailCurve,
    platforms,
    update: () => {},
    views: {},
    notes: {},
  };
}
