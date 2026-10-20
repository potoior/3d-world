import * as THREE from 'three';
import { mats } from './materials.js';
import { mergedMesh, addBox, addCylinder, addBar } from './geometry.js';
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
  const gold = [];
  const paper = [];
  const body = new THREE.CylinderGeometry(1.2, 1.45, 1.05, 7);
  body.scale(3.2, 1, 1);
  body.translate(0, 0.38, 0);
  dark.push(body);
  const rim = new THREE.TorusGeometry(1.31, 0.07, 5, 14);
  rim.rotateX(Math.PI / 2);
  rim.scale(3.05, 1.02, 1);
  rim.translate(0, 0.9, 0);
  dark.push(rim);
  const deck = new THREE.BoxGeometry(5.8, 0.16, 2.1);
  deck.translate(0, 0.96, 0);
  light.push(deck);
  const cab = new THREE.BoxGeometry(2.1, 1.05, 1.7);
  cab.translate(-0.7, 1.45, 0);
  light.push(cab);
  for (const sx of [-1.7, 0.3]) {
    for (const sz of [-0.86, 0.86]) {
      addBox(dark, 0.08, 1.05, 0.08, sx, 1.45, sz);
    }
  }
  addBox(dark, 2.3, 0.08, 0.08, -0.7, 2.02, 0.86);
  addBox(dark, 2.3, 0.08, 0.08, -0.7, 2.02, -0.86);
  for (let i = 0; i < 7; i++) {
    addBox(dark, 0.06, 0.05, 2.0, -2.4 + i * 0.8, 0.86, 0);
  }
  const roof = new THREE.ConeGeometry(1.5, 0.7, 4);
  roof.rotateY(Math.PI / 4);
  roof.translate(-0.7, 2.25, 0);
  dark.push(roof);
  const mast = new THREE.CylinderGeometry(0.06, 0.08, 2.2, 5);
  mast.translate(1.9, 1.95, 0);
  dark.push(mast);
  for (const sz of [-1, 1]) {
    const oar = new THREE.BoxGeometry(0.06, 0.06, 3.2);
    oar.rotateY(sz * 0.34);
    oar.translate(0.9, 1.08, sz * 1.5);
    dark.push(oar);
    const blade = new THREE.BoxGeometry(0.24, 0.03, 0.6);
    blade.rotateY(sz * 0.34);
    blade.translate(0.42, 1.08, sz * 2.35);
    light.push(blade);
  }
  addCylinder(gold, 0.03, 0.04, 0.5, 4, 2.55, 1.05, 0.5);
  const lamp = new THREE.SphereGeometry(0.14, 7, 5);
  lamp.scale(0.9, 1.2, 0.9);
  lamp.translate(2.55, 1.32, 0.5);
  paper.push(lamp);
  addBox(gold, 0.7, 0.5, 0.04, 2.2, 2.7, -0.05);
  const group = new THREE.Group();
  const dm = mergedMesh(dark, mats.wood, true, true);
  if (dm) group.add(dm);
  const lm = mergedMesh(light, mats.white, true, true);
  if (lm) group.add(lm);
  const gm = mergedMesh(gold, mats.gold, true, false);
  if (gm) group.add(gm);
  const pm = mergedMesh(paper, mats.paper, true, false);
  if (pm) group.add(pm);
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
    [-540, 120], [260, -260], [-260, -160], [140, -360],
    [440, 260], [-360, 330], [20, 260], [-80, -120],
  ];
  for (const [x, z] of buoys) {
    if (terrainHeight(x, z) < WATER_Y - 0.05) addBuoy(lantern, white, x, z, 0.9 + ((x + z) % 3) * 0.06);
  }

  for (const [x, z, r, c, s] of [
    [-360, 42, 5.6, 22, 5101], [-304, 248, 6.4, 26, 5102],
    [104, 126, 6.0, 24, 5103], [204, 248, 7.0, 28, 5104],
    [432, 128, 5.4, 22, 5105], [-150, 416, 6.2, 24, 5106],
    [300, -118, 4.8, 18, 5107], [-402, 304, 5.0, 20, 5108],
    [-340, 178, 5.2, 20, 5109], [-288, 128, 5.6, 22, 5110],
    [172, 176, 5.6, 22, 5111], [-166, 366, 5.0, 18, 5112],
  ]) addLotusBed(root, x, z, r, c, s);

  addMooredBoat(root, -348, 11, 0.55, 0.82);
  addMooredBoat(root, -342, 23, 0.8, 0.7);
  addMooredBoat(root, 367, -76, -0.4, 0.78);
  addMooredBoat(root, 386, -58, 0.2, 0.72);
  addMooredBoat(root, -40, 104, 1.3, 0.76);
  addMooredBoat(root, -30, 88, 2.1, 0.66);
  addMooredBoat(root, -372, 28, 0.35, 0.58);
  addMooredBoat(root, 352, -96, 0.9, 0.6);
  addMooredBoat(root, -58, 118, 1.9, 0.62);
  addMooredBoat(root, -18, 72, 0.1, 0.55);
  addMooredBoat(root, 396, -36, -0.8, 0.64);

  const ripple = [];
  for (const [x, z, r] of [
    [-348, 11, 6.2], [-342, 23, 5.4], [-40, 104, 5.8], [-30, 88, 5.0],
    [367, -76, 5.6], [386, -58, 5.0], [-372, 28, 4.2], [352, -96, 4.4],
  ]) {
    for (const q of [0.62, 1]) {
      const g = new THREE.TorusGeometry(r * q, 0.09, 4, 18);
      g.rotateX(-Math.PI / 2);
      g.scale(1.1, 1, 0.72);
      g.translate(x, WATER_Y + 0.045, z);
      ripple.push(g);
    }
  }
  const rm = mergedMesh(ripple, mats.wake, false, false);
  if (rm) {
    rm.renderOrder = 2;
    root.add(rm);
  }

  const reed = [];
  const rock = [];
  for (const [x, z, s] of [
    [-338, 108, 7101], [-326, 168, 7102], [-304, 238, 7103],
    [-392, 296, 7104], [-406, 332, 7105], [118, 184, 7106],
    [-198, 312, 7107], [418, 144, 7108], [-366, 54, 7109],
    [262, 296, 7110], [-330, 86, 7111], [-306, 210, 7112],
    [-220, 250, 7113], [160, 210, 7114], [342, 286, 7115],
    [-430, 278, 7116], [40, 150, 7117], [470, 160, 7118],
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
