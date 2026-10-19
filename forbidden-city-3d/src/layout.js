import * as THREE from 'three';
import { mats, makeWaterMaterial } from './materials.js';
import { createWall, createMeridianGate, createShenwuGate, createSideGate, createCornerTower } from './gates.js';
import { buildAxis } from './axis.js';
import { buildGarden, buildSidePalaces } from './garden.js';
import { createTree } from './props.js';
import { mergeStaticGroup } from './geometry.js';

function waterPlane(w, d, x, z, material, y = -1.2) {
  const geo = new THREE.PlaneGeometry(w, d, Math.max(8, Math.round(w / 12)), Math.max(4, Math.round(d / 12)));
  const mesh = new THREE.Mesh(geo, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, y, z);
  mesh.renderOrder = 1;
  return mesh;
}

function addBank(group, w, d, x, z) {
  const wall = new THREE.Mesh(new THREE.BoxGeometry(w, 2.6, d), mats.stone);
  wall.position.set(x, -0.95, z);
  wall.castShadow = true;
  wall.receiveShadow = true;
  group.add(wall);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, 0.24, d + 0.5), mats.marbleShade);
  cap.position.set(x, 0.32, z);
  cap.receiveShadow = true;
  group.add(cap);
}

export function buildForbiddenCity() {
  const root = new THREE.Group();
  const waterMaterial = makeWaterMaterial();

  const innerGround = new THREE.Mesh(new THREE.PlaneGeometry(752, 960), mats.paving);
  innerGround.rotation.x = -Math.PI / 2;
  innerGround.position.set(0, 0.0, 0);
  innerGround.receiveShadow = true;
  root.add(innerGround);

  const outerGrounds = [
    [2600, 910, 0, 1055],
    [2600, 910, 0, -1055],
    [900, 1210, 865, 0],
    [900, 1210, -865, 0],
  ];
  outerGrounds.forEach(([w, d, x, z], i) => {
    const g = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mats.dirt);
    g.rotation.x = -Math.PI / 2;
    g.position.set(x, -0.18 - i * 0.004, z);
    g.receiveShadow = true;
    root.add(g);
  });

  const moatY = -1.15;
  root.add(waterPlane(860, 42, 0, -507, waterMaterial, moatY));
  root.add(waterPlane(860, 42, 0, 507, waterMaterial, moatY));
  root.add(waterPlane(42, 1014, -403, 0, waterMaterial, moatY));
  root.add(waterPlane(42, 1014, 403, 0, waterMaterial, moatY));

  for (const sz of [-1, 1]) {
    addBank(root, 860, 3, 0, sz * 486);
    addBank(root, 860, 3, 0, sz * 528);
  }
  for (const sx of [-1, 1]) {
    addBank(root, 3, 1020, sx * 382, 0);
    addBank(root, 3, 1020, sx * 424, 0);
  }

  const walls = new THREE.Group();
  walls.add(createWall({ length: 300, axis: 'x' }).translateX(-226).translateZ(480));
  walls.add(createWall({ length: 300, axis: 'x' }).translateX(226).translateZ(480));
  walls.add(createWall({ length: 328, axis: 'x' }).translateX(-212).translateZ(-480));
  walls.add(createWall({ length: 328, axis: 'x' }).translateX(212).translateZ(-480));
  walls.add(createWall({ length: 786, axis: 'z' }).translateZ(-87).translateX(-376));
  walls.add(createWall({ length: 140, axis: 'z' }).translateZ(410).translateX(-376));
  walls.add(createWall({ length: 786, axis: 'z' }).translateZ(-87).translateX(376));
  walls.add(createWall({ length: 140, axis: 'z' }).translateZ(410).translateX(376));
  root.add(walls);

  const meridian = createMeridianGate();
  meridian.position.set(0, 0, 480);
  root.add(meridian);

  const shenwu = createShenwuGate();
  shenwu.position.set(0, 0, -480);
  root.add(shenwu);

  const eastGate = createSideGate('东华门');
  eastGate.rotation.y = Math.PI / 2;
  eastGate.position.set(376, 0, 323);
  root.add(eastGate);

  const westGate = createSideGate('西华门');
  westGate.rotation.y = -Math.PI / 2;
  westGate.position.set(-376, 0, 323);
  root.add(westGate);

  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const tower = createCornerTower();
      tower.position.set(sx * 376, 10, sz * 480);
      tower.rotation.y = sx * sz * Math.PI * 0.5;
      root.add(tower);
    }
  }

  root.add(buildAxis(waterMaterial));
  root.add(buildSidePalaces());
  root.add(buildGarden());

  const forest = new THREE.Group();
  let seed = 31;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = 0; i < 120; i++) {
    const side = rnd() < 0.5 ? -1 : 1;
    const x = side * (430 + rnd() * 290);
    const z = -840 + rnd() * 1520;
    const tree = createTree({
      height: 9 + rnd() * 6,
      spread: 3.2 + rnd() * 2.2,
      kind: rnd() > 0.45 ? 'pine' : 'broad',
      seed: i + 7,
    });
    tree.position.set(x, 0, z);
    forest.add(tree);
  }
  for (let i = 0; i < 44; i++) {
    const x = -600 + rnd() * 1200;
    const z = -650 - rnd() * 240;
    const tree = createTree({
      height: 9 + rnd() * 5,
      spread: 3.0 + rnd() * 2.0,
      kind: rnd() > 0.5 ? 'pine' : 'broad',
      seed: i + 91,
    });
    tree.position.set(x, 0, z);
    forest.add(tree);
  }
  for (let i = 0; i < 28; i++) {
    const side = rnd() < 0.5 ? -1 : 1;
    const x = side * (190 + rnd() * 430);
    const z = 640 + rnd() * 210;
    const tree = createTree({
      height: 8 + rnd() * 5,
      spread: 2.8 + rnd() * 1.8,
      kind: rnd() > 0.5 ? 'pine' : 'broad',
      seed: i + 161,
    });
    tree.position.set(x, 0, z);
    forest.add(tree);
  }
  root.add(forest);

  return { group: mergeStaticGroup(root), waterMaterial };
}
