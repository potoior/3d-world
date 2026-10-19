import * as THREE from 'three';
import { mats } from './materials.js';
import { mergedMesh } from './geometry.js';
import { terrainHeight, WATER_Y, lakeField } from './terrain.js';
import { LAKE_RING } from './lakeData.js';
import {
  addBuoy,
  addLotusBed,
  addReeds,
  addShoreRocks,
  addPetalCarpet,
} from './detailKit.js';

function addMooredBoat(root, x, z, rot, scale) {
  if (terrainHeight(x, z) > WATER_Y - 0.05) return;
  const dark = [];
  const light = [];
  const body = new THREE.CylinderGeometry(1.2, 1.45, 1.05, 7);
  body.scale(3.2, 1, 1);
  body.translate(0, 0.38, 0);
  dark.push(body);
  const deck = new THREE.BoxGeometry(5.8, 0.16, 2.1);
  deck.translate(0, 0.96, 0);
  light.push(deck);
  const cab = new THREE.BoxGeometry(2.1, 1.05, 1.7);
  cab.translate(-0.7, 1.45, 0);
  light.push(cab);
  const roof = new THREE.ConeGeometry(1.5, 0.7, 4);
  roof.rotateY(Math.PI / 4);
  roof.translate(-0.7, 2.25, 0);
  dark.push(roof);
  const mast = new THREE.CylinderGeometry(0.06, 0.08, 2.2, 5);
  mast.translate(1.9, 1.95, 0);
  dark.push(mast);
  const group = new THREE.Group();
  const dm = mergedMesh(dark, mats.wood, true, true);
  if (dm) group.add(dm);
  const lm = mergedMesh(light, mats.white, true, true);
  if (lm) group.add(lm);
  group.scale.setScalar(scale);
  group.position.set(x, WATER_Y - 0.22, z);
  group.rotation.y = rot;
  root.add(group);
}

function createFoam() {
  const positions = [];
  const uvs = [];
  const indices = [];
  const n = LAKE_RING.length / 2;
  let cx = 0;
  let cz = 0;
  for (let i = 0; i < n; i++) {
    cx += LAKE_RING[i * 2];
    cz += LAKE_RING[i * 2 + 1];
  }
  cx /= n;
  cz /= n;
  let base = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const x0 = LAKE_RING[i * 2];
    const z0 = LAKE_RING[i * 2 + 1];
    const x1 = LAKE_RING[j * 2];
    const z1 = LAKE_RING[j * 2 + 1];
    const len = Math.hypot(x1 - x0, z1 - z0);
    if (len < 3 || len > 40) continue;
    let nx = -(z1 - z0) / len;
    let nz = (x1 - x0) / len;
    if (lakeField((x0 + x1) / 2 + nx * 8, (z0 + z1) / 2 + nz * 8) > 0) {
      nx = -nx;
      nz = -nz;
    }
    const w = 2.2;
    positions.push(x0, WATER_Y + 0.025, z0, x1, WATER_Y + 0.025, z1);
    positions.push(x0 + nx * w, WATER_Y + 0.025, z0 + nz * w, x1 + nx * w, WATER_Y + 0.025, z1 + nz * w);
    uvs.push(0, 0, 1, 0, 0, 1, 1, 1);
    indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
    base += 4;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mats.wake);
  mesh.renderOrder = 2;
  return mesh;
}

export function addWaterDetails(root) {
  const foam = createFoam();
  if (foam.geometry.attributes.position.count) root.add(foam);

  const lantern = [];
  const white = [];
  const buoys = [
    [-120, -300], [60, -180], [220, 60], [300, 220],
    [-180, 360], [380, 20], [500, -180], [100, 420],
    [-540, 120], [260, -260],
  ];
  for (const [x, z] of buoys) {
    if (terrainHeight(x, z) < WATER_Y - 0.05) addBuoy(lantern, white, x, z, 0.9 + ((x + z) % 3) * 0.06);
  }

  for (const [x, z, r, c, s] of [
    [-360, 42, 5.6, 22, 5101], [-304, 248, 6.4, 26, 5102],
    [104, 126, 6.0, 24, 5103], [204, 248, 7.0, 28, 5104],
    [432, 128, 5.4, 22, 5105], [-150, 416, 6.2, 24, 5106],
    [300, -118, 4.8, 18, 5107], [-402, 304, 5.0, 20, 5108],
  ]) addLotusBed(root, x, z, r, c, s);

  addMooredBoat(root, -348, 11, 0.55, 0.82);
  addMooredBoat(root, -342, 23, 0.8, 0.7);
  addMooredBoat(root, 367, -76, -0.4, 0.78);
  addMooredBoat(root, 386, -58, 0.2, 0.72);
  addMooredBoat(root, -40, 104, 1.3, 0.76);
  addMooredBoat(root, -30, 88, 2.1, 0.66);

  const reed = [];
  const rock = [];
  for (const [x, z, s] of [
    [-338, 108, 7101], [-326, 168, 7102], [-304, 238, 7103],
    [-392, 296, 7104], [-406, 332, 7105], [118, 184, 7106],
    [-198, 312, 7107], [418, 144, 7108], [-366, 54, 7109],
    [262, 296, 7110],
  ]) {
    addReeds(reed, x, z, s, 10, 1.4);
    addShoreRocks(rock, x, z, s + 3, 4, 4.4, 0.9);
  }

  const petal = [];
  addPetalCarpet(petal, -330, 150, 14, 70, 7201, 'water');
  addPetalCarpet(petal, 116, 150, 12, 50, 7202, 'water');

  const lamps = mergedMesh(lantern, mats.lantern, true, false);
  if (lamps) root.add(lamps);
  const whites = mergedMesh(white, mats.white, true, true);
  if (whites) root.add(whites);
  const reeds = mergedMesh(reed, mats.reed, false, true);
  if (reeds) root.add(reeds);
  const rocks = mergedMesh(rock, mats.rock, true, true);
  if (rocks) root.add(rocks);
  const petals = mergedMesh(petal, mats.cherryLight, false, true);
  if (petals) root.add(petals);
}
