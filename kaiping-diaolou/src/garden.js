import * as THREE from 'three';
import { mats } from './materials.js';
import { createHall, createCorridor } from './buildings.js';
import { addBox, mergedMesh } from './geometry.js';
import { createTree, createRock, createLantern } from './props.js';

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
        const cx = sx * (158 + col * 82);
        const cz = 18 - row * 102;
        const courtyard = createCourtyard(seed++);
        courtyard.position.set(cx, 0, cz);
        group.add(courtyard);
      }
    }
  }
  return group;
}

function grassPatch(group, x, z, rx, rz) {
  const material = new THREE.MeshStandardMaterial({ color: 0x5c6a45, roughness: 1 });
  const mesh = new THREE.Mesh(new THREE.CircleGeometry(1, 22), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.scale.set(rx, rz, 1);
  mesh.position.set(x, 0.02, z);
  mesh.receiveShadow = true;
  group.add(mesh);
}

function gardenWall(group) {
  const h = 3.6;
  const list = [];
  const gap = 30;
  const seg = (240 - gap) / 2;
  const off = gap / 2 + seg / 2;
  addBox(list, seg, h, 1.3, -off, h / 2, -145);
  addBox(list, seg, h, 1.3, off, h / 2, -145);
  addBox(list, seg, h, 1.3, -off, h / 2, -390);
  addBox(list, seg, h, 1.3, off, h / 2, -390);
  addBox(list, 1.3, h, 245, -120, h / 2, -267.5);
  addBox(list, 1.3, h, 245, 120, h / 2, -267.5);
  const mesh = mergedMesh(list, mats.wall, true, true);
  if (mesh) group.add(mesh);
  const caps = [];
  addBox(caps, seg + 0.3, 0.36, 1.6, -off, h + 0.12, -145);
  addBox(caps, seg + 0.3, 0.36, 1.6, off, h + 0.12, -145);
  addBox(caps, seg + 0.3, 0.36, 1.6, -off, h + 0.12, -390);
  addBox(caps, seg + 0.3, 0.36, 1.6, off, h + 0.12, -390);
  addBox(caps, 1.6, 0.36, 245, -120, h + 0.12, -267.5);
  addBox(caps, 1.6, 0.36, 245, 120, h + 0.12, -267.5);
  const cm = mergedMesh(caps, mats.roofDark, false, false);
  if (cm) group.add(cm);
}

export function buildGarden() {
  const group = new THREE.Group();

  gardenWall(group);

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
  gate.position.set(0, 0, -145);
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
  qian.position.set(0, 0, -235);
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
    pavilion.position.set(sx * 72, 0, -200);
    group.add(pavilion);
    const lantern = createLantern();
    lantern.position.set(sx * 20, 0, -190);
    group.add(lantern);
  }

  const patchDefs = [
    [-55, -170, 28, 18],
    [58, -250, 34, 22],
    [-60, -300, 30, 24],
    [10, -350, 26, 18],
    [-95, -360, 18, 26],
    [95, -345, 20, 20],
  ];
  for (const p of patchDefs) grassPatch(group, ...p);

  const rocks = [
    [88, -285, 2.4],
    [96, -292, 3.0],
    [80, -296, 2.2],
    [91, -302, 2.6],
    [101, -281, 2.0],
    [74, -288, 1.8],
    [86, -308, 2.4],
    [103, -300, 1.7],
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
    const z = -155 - rand() * 228;
    if (Math.abs(x) < 22) continue;
    if (Math.abs(x) < 22 && z > -260) continue;
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

  return group;
}
