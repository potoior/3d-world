import * as THREE from 'three';
import { mats } from './materials.js';
import { createHall, createCorridor } from './buildings.js';
import { addBox, mergedMesh } from './geometry.js';
import { createTree, createRock, createLantern, createShrub, createVat, createIncenseBurner, createDrainGrate } from './props.js';

function courtyardWall(group, w, d, h = 3.2) {
  const list = [];
  const gap = 10;
  addBox(list, (w - gap) / 2, h, 1.1, -(w + gap) / 4, h / 2, d / 2);
  addBox(list, (w - gap) / 2, h, 1.1, (w + gap) / 4, h / 2, d / 2);
  addBox(list, w, h, 1.1, 0, h / 2, -d / 2);
  addBox(list, 1.1, h, d, -w / 2, h / 2, 0);
  addBox(list, 1.1, h, d, w / 2, h / 2, 0);
  const mesh = mergedMesh(list, mats.wall, true, true);
  if (mesh) group.add(mesh);
  const caps = [];
  addBox(caps, (w - gap) / 2 + 0.3, 0.35, 1.4, -(w + gap) / 4, h + 0.12, d / 2);
  addBox(caps, (w - gap) / 2 + 0.3, 0.35, 1.4, (w + gap) / 4, h + 0.12, d / 2);
  addBox(caps, w + 0.3, 0.35, 1.4, 0, h + 0.12, -d / 2);
  addBox(caps, 1.4, 0.35, d + 0.3, -w / 2, h + 0.12, 0);
  addBox(caps, 1.4, 0.35, d + 0.3, w / 2, h + 0.12, 0);
  const cm = mergedMesh(caps, mats.roofDark, false, false);
  if (cm) group.add(cm);
}

function gardenPath(group, x, z, w, d) {
  const slab = new THREE.Mesh(new THREE.BoxGeometry(w, 0.07, d), mats.marbleShade);
  slab.position.set(x, 0.035, z);
  slab.receiveShadow = true;
  group.add(slab);
  const lines = [];
  const across = Math.max(2, Math.floor(d / 2.6));
  for (let i = 1; i < across; i++) {
    addBox(lines, w * 0.94, 0.028, 0.08, x, 0.078, z - d / 2 + (i * d) / across);
  }
  for (const sx of [-1, 1]) {
    addBox(lines, 0.12, 0.04, d, x + sx * (w / 2 + 0.48), 0.075, z);
  }
  const lm = mergedMesh(lines, mats.stone, false, true);
  if (lm) group.add(lm);
  for (let i = -1; i <= 1; i += 2) {
    const grate = createDrainGrate(1.0, 0.62);
    grate.position.set(x + i * (w / 2 + 1.35), 0.01, z + d * 0.3);
    group.add(grate);
  }
}

function createCourtyard(seed) {
  const group = new THREE.Group();
  courtyardWall(group, 62, 66);

  const main = createHall({
    w: 30,
    d: 14,
    wallH: 5,
    roofH: 5.2,
    eave: 2.5,
    baseH: 0.9,
    baseExtra: 2.2,
    stairs: 2.6,
    bays: 5,
    railing: false,
    beasts: false,
    plaqueWidth: 2.6,
  });
  main.position.set(0, 0, -18);
  group.add(main);

  for (const sx of [-1, 1]) {
    const wing = createCorridor({
      length: 28,
      width: 6,
      wallH: 3.7,
      roofH: 3.4,
      eave: 1.4,
      bays: 7,
      baseH: 0.5,
    });
    wing.rotation.y = Math.PI / 2;
    wing.position.set(sx * 19, 0, 2);
    group.add(wing);
  }

  const gate = createHall({
    w: 10,
    d: 4.5,
    wallH: 3.4,
    roofH: 3.0,
    eave: 1.1,
    baseH: 0.5,
    baseExtra: 0.8,
    stairs: 0,
    bays: 3,
    railing: false,
    beasts: false,
  });
  gate.position.set(0, 0, 33.5);
  group.add(gate);

  const lantern = createLantern();
  lantern.position.set(8, 0, 28);
  group.add(lantern);
  return group;
}

export function buildSidePalaces() {
  const group = new THREE.Group();
  let seed = 1;
  for (const sx of [-1, 1]) {
    for (let col = 0; col < 2; col++) {
      for (let row = 0; row < 2; row++) {
        const cx = sx * (165 + col * 93);
        const cz = -160 - row * 100;
        const courtyard = createCourtyard(seed++);
        courtyard.position.set(cx, 0, cz);
        group.add(courtyard);
        for (const off of [-18, 18]) {
          const tree = createTree({
            height: 8 + ((seed * 7) % 5),
            spread: 2.6 + ((seed * 3) % 2),
            kind: seed % 2 ? 'pine' : 'broad',
            seed: seed + off,
          });
          tree.position.set(cx + off, 0, cz + 20);
          group.add(tree);
        }
      }
    }
  }
  for (const [name, x, z, rot] of [
    ['文华殿', 186.6, 255.8, 0],
    ['武英殿', -220.8, 272.8, 0],
  ]) {
    const hall = createHall({
      w: 40,
      d: 32,
      wallH: 7,
      roofH: 7.2,
      eave: 3.2,
      baseH: 1.2,
      baseExtra: 3.2,
      stairs: 3.4,
      doubleEave: true,
      lowerRoofH: 4.6,
      upperWallH: 5.4,
      upperRoofH: 6.0,
      name,
      bays: 7,
      plaqueWidth: 3.2,
    });
    hall.rotation.y = rot;
    hall.position.set(x, 0, z);
    group.add(hall);
  }
  return group;
}

function addGrassPatches(group, patches) {
  const mesh = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 22), mats.grass, patches.length);
  const matrix = new THREE.Matrix4();
  const quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
  const pos = new THREE.Vector3();
  const scale = new THREE.Vector3();
  patches.forEach(([x, z, rx, rz], i) => {
    pos.set(x, 0.02, z);
    scale.set(rx, rz, 1);
    matrix.compose(pos, quat, scale);
    mesh.setMatrixAt(i, matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.receiveShadow = true;
  mesh.computeBoundingSphere();
  group.add(mesh);
}

function gardenWall(group) {
  const h = 3.6;
  const list = [];
  const gap = 30;
  const seg = (240 - gap) / 2;
  const off = gap / 2 + seg / 2;
  addBox(list, seg, h, 1.3, -off, h / 2, -350);
  addBox(list, seg, h, 1.3, off, h / 2, -350);
  addBox(list, seg, h, 1.3, -off, h / 2, -461);
  addBox(list, seg, h, 1.3, off, h / 2, -461);
  addBox(list, 1.3, h, 112, -120, h / 2, -405.5);
  addBox(list, 1.3, h, 112, 120, h / 2, -405.5);
  const mesh = mergedMesh(list, mats.wall, true, true);
  if (mesh) group.add(mesh);
  const caps = [];
  addBox(caps, seg + 0.3, 0.36, 1.6, -off, h + 0.12, -350);
  addBox(caps, seg + 0.3, 0.36, 1.6, off, h + 0.12, -350);
  addBox(caps, seg + 0.3, 0.36, 1.6, -off, h + 0.12, -461);
  addBox(caps, seg + 0.3, 0.36, 1.6, off, h + 0.12, -461);
  addBox(caps, 1.6, 0.36, 112, -120, h + 0.12, -405.5);
  addBox(caps, 1.6, 0.36, 112, 120, h + 0.12, -405.5);
  const cm = mergedMesh(caps, mats.roofDark, false, false);
  if (cm) group.add(cm);
}

export function buildGarden() {
  const group = new THREE.Group();

  gardenWall(group);
  gardenPath(group, 0, -405, 7.2, 108);
  gardenPath(group, 0, -382, 132, 5.2);
  gardenPath(group, 0, -447, 150, 4.4);

  const gate = createHall({
    w: 22,
    d: 9,
    wallH: 4.4,
    roofH: 4.2,
    eave: 1.8,
    baseH: 0.8,
    baseExtra: 1.8,
    stairs: 2.2,
    bays: 3,
    name: '顺贞门',
    backDoors: true,
    plaqueWidth: 3.0,
  });
  gate.position.set(0, 0, -461);
  group.add(gate);

  const qian = createHall({
    w: 24,
    d: 16,
    wallH: 5.2,
    roofH: 5.8,
    eave: 2.8,
    baseH: 1.0,
    baseExtra: 2.6,
    stairs: 3.0,
    bays: 5,
    name: '钦安殿',
    plaqueWidth: 3.2,
  });
  qian.position.set(0, 0, -400);
  group.add(qian);

  for (const sx of [-1, 1]) {
    const pavilion = createHall({
      w: 14,
      d: 14,
      wallH: 4.6,
      roofH: 5.8,
      eave: 2.4,
      baseH: 1.2,
      baseExtra: 1.8,
      stairs: 2.2,
      pyramid: true,
      beams: false,
      bays: 3,
      name: sx < 0 ? '万春亭' : '千秋亭',
      plaqueWidth: 2.2,
    });
    pavilion.position.set(sx * 72, 0, -382);
    group.add(pavilion);
    const lantern = createLantern();
    lantern.position.set(sx * 20, 0, -370);
    group.add(lantern);
  }

  const patchDefs = [
    [-55, -370, 28, 16],
    [58, -432, 34, 20],
    [-60, -442, 28, 18],
    [10, -452, 24, 12],
    [-95, -450, 18, 14],
    [95, -446, 18, 16],
  ];
  addGrassPatches(group, patchDefs);

  const rocks = [
    [88, -422, 2.4],
    [96, -429, 3.0],
    [80, -433, 2.2],
    [91, -439, 2.6],
    [101, -418, 2.0],
    [74, -425, 1.8],
    [86, -445, 2.4],
    [103, -437, 1.7],
  ];
  for (const [x, z, s] of rocks) {
    const rock = createRock();
    rock.scale.setScalar(s);
    rock.position.set(x, 0, z);
    rock.rotation.y = x * 0.7 + z * 0.3;
    group.add(rock);
  }

  const treeData = [];
  const rand = (() => {
    let a = 7;
    return () => {
      a = (a * 16807) % 2147483647;
      return a / 2147483647;
    };
  })();
  for (let i = 0; i < 46; i++) {
    const x = -115 + rand() * 230;
    const z = -354 - rand() * 102;
    if (Math.abs(x) < 20) continue;
    treeData.push([x, z, rand(), rand()]);
  }

  let seed = 1;
  for (const [x, z, kind, scale] of treeData) {
    const tree = createTree({
      height: (kind > 0.55 ? 11 : 7.5) + scale * 3,
      spread: 2.6 + scale * 1.5,
      kind: kind > 0.55 ? 'pine' : 'broad',
      seed: seed++,
    });
    tree.position.set(x, 0, z);
    tree.rotation.y = scale * Math.PI * 2;
    group.add(tree);
  }

  const shrubs = [
    [-72, -362, 1.0], [-48, -394, 1.15], [46, -368, 0.95], [70, -406, 1.1],
    [-30, -448, 1.0], [26, -462, 0.9], [-108, -402, 1.2], [110, -414, 1.05],
    [-82, -388, 0.85], [84, -372, 1.0], [-16, -430, 0.9], [16, -438, 0.95],
    [-104, -430, 1.1], [104, -440, 1.0], [-40, -420, 0.8], [42, -426, 0.85],
    [-92, -460, 1.0], [92, -458, 0.95],
  ];
  let shrubSeed = 11;
  for (const [x, z, s] of shrubs) {
    const shrub = createShrub(s, shrubSeed++);
    shrub.position.set(x, 0, z);
    shrub.rotation.y = shrubSeed * 0.7;
    group.add(shrub);
  }

  const extraRocks = [
    [-88, -414, 2.8], [-80, -424, 2.2], [-96, -426, 3.1],
    [-72, -436, 2.0], [-104, -418, 2.4], [-90, -442, 2.6],
    [36, -456, 1.9], [-36, -458, 2.1],
  ];
  for (const [x, z, s] of extraRocks) {
    const rock = createRock();
    rock.scale.setScalar(s);
    rock.position.set(x, 0, z);
    rock.rotation.y = x * 0.5 + z * 0.2;
    group.add(rock);
  }

  for (let i = 0; i < 6; i++) {
    const lantern = createLantern();
    lantern.position.set(i % 2 === 0 ? -9 : 9, 0, -356 - i * 17);
    group.add(lantern);
  }

  for (const sx of [-1, 1]) {
    const vat = createVat(1.1);
    vat.position.set(sx * 24, 0, -416);
    group.add(vat);
    const lantern = createLantern();
    lantern.position.set(sx * 14, 0, -374);
    group.add(lantern);
    const burner = createIncenseBurner(1.1);
    burner.position.set(sx * 16, 0, -378);
    group.add(burner);
  }

  const cypressGarden = [
    [-114, -370], [114, -376], [-114, -450], [114, -454],
  ];
  let cseed = 41;
  for (const [x, z] of cypressGarden) {
    const tree = createTree({ height: 12.5, spread: 2.2, kind: 'cypress', seed: cseed++ });
    tree.position.set(x, 0, z);
    group.add(tree);
  }

  return group;
}
