import * as THREE from 'three';
import {
  LAKE,
  WATER_Y,
  buildTerrainAndLake,
  mergeStaticGroup,
  terrainHeight,
} from './sayramTerrain.js';
import { createRoad, createRoadPolyline, createBoardwalk } from './sayramRoad.js';
import { createWildflowers, createGrass } from './sayramFlora.js';
import { createScatter } from './sayramScatter.js';
import { createVillage } from './sayramVillage.js';

const YURT_POINTS = [
  [-275, 225], [-160, 248], [-35, 262], [105, 252],
  [190, 276], [365, 250], [-390, 204],
];

export const FP_WORLD = {
  lake: LAKE,
  causeways: [],
  bridges: [],
  islets: [],
  spawn: { x: -88, z: 292, yaw: Math.PI },
  bounds: { minX: -800, maxX: 800, minZ: -540, maxZ: 650 },
  colliders: {
    boxes: [],
    circles: YURT_POINTS.map(([x, z]) => ({ x, z, r: 7.2 })),
  },
  heightAt: terrainHeight,
};

export function buildSayramScene() {
  const root = new THREE.Group();
  root.name = 'sayram-lake-world';

  const base = buildTerrainAndLake();
  root.add(base.root);

  const roadPoly = createRoadPolyline();
  const road = createRoad();
  root.add(road.group);

  const staticRoot = new THREE.Group();
  staticRoot.name = 'sayram-static-village';
  staticRoot.add(createBoardwalk());
  const village = createVillage();
  staticRoot.add(village.group);
  const merged = mergeStaticGroup(staticRoot);
  root.add(merged);

  root.add(createGrass(roadPoly));
  root.add(createWildflowers(roadPoly));
  root.add(createScatter(roadPoly));

  const stats = {
    flowers: 36000,
    grass: 14000,
    trees: 260,
    yurts: YURT_POINTS.length,
    lakeVertices: LAKE.length,
  };

  return {
    group: root,
    waterMaterial: base.waterMaterial,
    waterMesh: base.waterMesh,
    clouds: base.clouds,
    windowMat: village.windowMat,
    roadCurve: road.curve,
    roadPolyline: roadPoly,
    stats,
  };
}
