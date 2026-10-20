import * as THREE from 'three';
import { mergeStaticGroup } from './geometry.js';
import { makeWaterMaterial } from './materials.js';
import { createTerrain, createWater, createMist, WATER_Y } from './terrain.js';
import { createPeaks, createBamboo, createTrees, createPines } from './peaks.js';
import { createReeds, createRockGarden } from './fields.js';
import { createShoreDetails } from './waterDetails.js';
import { createAncientVillage, createYulinuPeak, createDawangPeak, colliders } from './architectures.js';
import { createRafts, createEgrets } from './life.js';
import { createTeaTerraces, createTeaFlags } from './tea.js';
import { buildRefineDetails, createRefineLife } from './refine.js';

export function buildWuyishanScene() {
  colliders.length = 0;
  const root = new THREE.Group();
  const waterMaterial = makeWaterMaterial();
  root.add(createTerrain());
  const water = new THREE.Mesh(createWater(), waterMaterial);
  water.position.y = WATER_Y;
  water.renderOrder = 1;
  root.add(water);

  root.add(createPeaks());
  buildRefineDetails(root);
  root.add(createBamboo());
  root.add(createTrees());
  root.add(createPines());
  root.add(createTeaTerraces());
  root.add(createReeds());
  root.add(createShoreDetails());
  const rocks = createRockGarden();
  if (rocks) root.add(rocks);
  root.add(createAncientVillage());
  root.add(createYulinuPeak());
  root.add(createDawangPeak());

  const extras = new THREE.Group();
  const mist = createMist();
  extras.add(mist);
  extras.userData.mist = mist;
  const rafts = createRafts();
  extras.add(rafts);
  extras.userData.rafts = rafts.userData.rafts;
  const egrets = createEgrets();
  extras.add(egrets);
  extras.userData.egrets = egrets;
  const teaFlags = createTeaFlags();
  extras.add(teaFlags);
  extras.userData.teaFlags = teaFlags;
  const refineLife = createRefineLife();
  extras.add(refineLife.group);
  extras.userData.refineLife = refineLife;

  return { group: mergeStaticGroup(root), extras, waterMaterial, colliders };
}
