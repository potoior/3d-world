import * as THREE from 'three';
import { mats, makeWaterMaterial } from './materials.js';
import { mergedMesh, mergeStaticGroup } from './geometry.js';
import { createTree } from './props.js';
import { createWillow, createLotus } from './gardenDetails.js';
import {
  createMountain,
  createFoxiangGe,
  createPalace,
  createLongCorridor,
  createSeventeenBridge,
  createMarbleBoat,
  createSuzhouStreet,
  createNanhuIsland,
  createCauseway,
  createLakeRocks,
  createShoreDetails,
  heightAt,
} from './summerPalace.js';
import { createSummerLife } from './summerLife.js';

export const POND = [
  [-124, 16],
  [-120, -6],
  [-104, -3],
  [-88, 1],
  [-74, -5],
  [-60, 0],
  [-46, -6],
  [-32, -3],
  [-18, -7],
  [-4, -3],
  [10, -7],
  [24, -3],
  [38, -7],
  [52, -3],
  [66, -7],
  [80, -3],
  [96, -6],
  [110, -1],
  [122, 12],
  [120, 42],
  [112, 72],
  [98, 96],
  [74, 108],
  [44, 112],
  [12, 110],
  [-18, 108],
  [-48, 102],
  [-78, 92],
  [-102, 74],
  [-118, 46],
];

function createPond(material) {
  const shape = new THREE.Shape();
  POND.forEach(([x, z], i) => {
    if (i === 0) shape.moveTo(x, -z);
    else shape.lineTo(x, -z);
  });
  shape.closePath();
  const geo = new THREE.ShapeGeometry(shape, 24);
  geo.rotateX(-Math.PI / 2);
  const water = new THREE.Mesh(geo, material);
  water.position.y = 0.12;
  water.renderOrder = 1;

  const curve = new THREE.CatmullRomCurve3(POND.map(([x, z]) => new THREE.Vector3(x, 0, z)), true, 'catmullrom', 0.3);
  const pts = curve.getPoints(180);
  const curb = [];
  const joints = [];
  const outer = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    const ang = Math.atan2(b.x - a.x, b.z - a.z);
    const g = new THREE.BoxGeometry(1.1, 0.42, len + 0.5);
    g.rotateY(ang);
    g.translate((a.x + b.x) / 2, 0.18, (a.z + b.z) / 2);
    curb.push(g);
    if (i % 4 === 0) {
      const j = new THREE.BoxGeometry(1.16, 0.06, 0.14);
      j.rotateY(ang);
      j.translate(a.x, 0.41, a.z);
      joints.push(j);
    }
    if (i % 9 === 0) {
      const t = new THREE.BoxGeometry(1.7, 0.24, 0.5);
      t.rotateY(ang);
      t.translate(a.x, 0.44, a.z);
      outer.push(t);
    }
  }
  const group = new THREE.Group();
  group.add(water);
  const cm = mergedMesh(curb, mats.stone, true, true);
  if (cm) group.add(cm);
  const jm = mergedMesh(joints, mats.trimDark, false, true);
  if (jm) group.add(jm);
  const om = mergedMesh(outer, mats.marbleShade, false, true);
  if (om) group.add(om);
  return group;
}

function addApron(group, x, z, w, d, rot = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, d), mats.path);
  mesh.position.set(x, 0.055, z);
  mesh.rotation.y = rot;
  mesh.receiveShadow = true;
  group.add(mesh);
}

export function buildGardenScene() {
  const root = new THREE.Group();
  const waterMaterial = makeWaterMaterial();

  const outerGround = new THREE.Mesh(new THREE.PlaneGeometry(1500, 1500), mats.grass);
  outerGround.rotation.x = -Math.PI / 2;
  outerGround.position.y = -0.1;
  outerGround.receiveShadow = true;
  root.add(outerGround);

  const mountain = createMountain();
  root.add(mountain);
  root.add(createPond(waterMaterial));

  addApron(root, -42, -13.6, 112, 9);
  addApron(root, -8, -22, 46, 26);
  addApron(root, -8, -43, 34, 16);
  addApron(root, -8, -60, 30, 14);
  addApron(root, 42, 52, 38, 38);
  addApron(root, -48, 36, 16, 16);
  addApron(root, 0, 108, 190, 14);
  addApron(root, 112, 8, 16, 26);
  addApron(root, -108, -32, 20, 54);

  const island = createNanhuIsland(42, 52, 17);
  root.add(island);
  root.add(createSeventeenBridge(59, 52, 120, 44));
  root.add(createCauseway());
  root.add(createMarbleBoat(-64, 1.5, 0.08));
  root.add(createSuzhouStreet());

  const westIslandBase = new THREE.Mesh(new THREE.CylinderGeometry(7, 7.6, 1.0, 32), mats.stone);
  westIslandBase.position.set(-48, 0.5, 36);
  westIslandBase.castShadow = true;
  westIslandBase.receiveShadow = true;
  root.add(westIslandBase);
  const westTop = new THREE.Mesh(new THREE.CircleGeometry(6.9, 32), mats.grass);
  westTop.rotation.x = -Math.PI / 2;
  westTop.position.set(-48, 1.01, 36);
  westTop.receiveShadow = true;
  root.add(westTop);
  root.add(createPalace({
    x: -48, z: 36, y: 1.02, w: 8.2, d: 6.4, wallH: 3.2, roofH: 3.0, baseH: 0.6,
    name: '治镜阁', roofMat: mats.roofGreen, railing: false,
  }));

  root.add(createLongCorridor(-42, -13.6, 108));

  const paiyunY = heightAt(-8, -34);
  root.add(createPalace({
    x: -8, z: -34, y: paiyunY, w: 28, d: 15, wallH: 5.8, roofH: 5.8, bays: 7,
    name: '排云殿', roofMat: mats.roofGold,
    couplets: ['嵩岳大云垂九如献颂', '瀛洲甘雨润五色呈祥'],
  }));
  for (const [sx, nm, cp] of [
    [-31, '紫霄殿', ['丹崖留胜迹', '碧落映仙居']],
    [15, '玉华殿', ['云霞成伴侣', '冰雪净聪明']],
  ]) {
    root.add(createPalace({
      x: sx, z: -34, y: heightAt(sx, -34), w: 11, d: 8, wallH: 4.0, roofH: 3.8,
      baseH: 0.8, bays: 3, name: nm, roofMat: mats.roofGold, couplets: cp, railing: false,
    }));
  }
  root.add(createPalace({
    x: -8, z: -16.5, y: 0.1, w: 8, d: 4.2, wallH: 3.4, roofH: 2.8, baseH: 0.7,
    bays: 3, name: '排云门', roofMat: mats.roofGold, railing: false,
    couplets: ['迎辇花红凝晓露', '拂墙柳绿带春烟'],
  }));

  root.add(createFoxiangGe(-8, -58));
  root.add(createPalace({
    x: 15, z: -76, y: heightAt(15, -76), w: 18, d: 10.5, wallH: 4.8, roofH: 4.2,
    baseH: 0.9, bays: 5, name: '智慧海', roofMat: mats.roofGreen,
    couplets: ['智慧海无边', '慈悲云有影'],
  }));
  root.add(createPalace({
    x: -32, z: -60, y: heightAt(-32, -60), w: 9, d: 7, wallH: 3.6, roofH: 3.2,
    baseH: 0.7, bays: 3, name: '转轮藏', roofMat: mats.roofGold, railing: false,
  }));
  root.add(createPalace({
    x: 25, z: -46, y: heightAt(25, -46), w: 8, d: 6.4, wallH: 3.4, roofH: 3.0,
    baseH: 0.6, bays: 3, name: '五方阁', roofMat: mats.roofGreen, railing: false,
  }));

  const terrace = new THREE.Mesh(new THREE.BoxGeometry(40, 1.0, 26), mats.marbleShade);
  terrace.position.set(-8, paiyunY - 0.5, -34);
  terrace.receiveShadow = true;
  root.add(terrace);
  const terraceRail = [];
  for (const sx of [-1, 1]) {
    for (let i = 0; i <= 8; i++) {
      const pz = -45 + i * 3.1;
      for (const side of [-1, 1]) {
        const g = new THREE.CylinderGeometry(0.15, 0.19, 1.25, 6);
        g.translate(-8 + side * 20, paiyunY + 0.62, pz);
        terraceRail.push(g);
      }
    }
  }
  const trm = mergedMesh(terraceRail, mats.marble, true, true);
  if (trm) root.add(trm);

  const shorePines = [
    [-108, 10], [-100, 28], [-96, 54], [-86, 82], [-58, 104], [-30, 112],
    [2, 114], [34, 114], [68, 108], [94, 94], [112, 76], [119, 50],
    [120, 18], [114, -10], [96, -12], [62, -12], [34, -14], [18, 0],
    [-16, 8], [-22, 28], [-16, 52], [-22, 76], [-8, 96], [8, 86],
    [30, 88], [56, 78], [78, 62], [90, 40], [98, 18], [80, 2],
  ];
  shorePines.forEach(([x, z], i) => {
    const t = createTree({
      height: 8 + (i % 5),
      spread: 2.8 + (i % 3) * 0.5,
      kind: i % 3 === 0 ? 'pine' : 'broad',
      seed: i + 310,
    });
    t.position.set(x, heightAt(x, z), z);
    root.add(t);
  });

  const ridgeTrees = [
    [-52, -48], [-40, -66], [-28, -82], [-6, -88], [14, -88], [30, -78],
    [36, -60], [-64, -44], [-72, -34], [44, -36], [48, -18], [-70, -14],
  ];
  ridgeTrees.forEach(([x, z], i) => {
    const t = createTree({
      height: 7.5 + (i % 4),
      spread: 2.6 + (i % 2) * 0.6,
      kind: i % 2 ? 'pine' : 'broad',
      seed: i + 400,
    });
    t.position.set(x, heightAt(x, z), z);
    root.add(t);
  });

  const willows = [
    [-90, 102], [-74, 100], [-58, 101], [-36, 105], [-12, 104], [12, 104],
    [36, 101], [60, 96], [82, 86], [100, 70], [112, 52], [116, 30],
    [-112, 48], [-110, 70], [-100, 86], [-84, 96], [42, 32], [28, 42],
    [58, 66], [52, 78], [-48, 50], [-60, 44], [-76, 46], [-96, 40],
    [-92, 20], [-100, 20], [-92, 72], [-90, 88], [6, 44], [-4, 60],
  ];
  willows.forEach(([x, z], i) => {
    const t = createWillow({
      height: 7.2 + (i % 4) * 0.6,
      spread: 2.3,
      seed: i + 510,
    });
    t.position.set(x, Math.max(0.1, heightAt(x, z)), z);
    root.add(t);
  });

  const lotus = [
    [-56, 20, 6, 18, 4], [-36, 8, 5, 15, 8], [-14, 4, 5, 16, 12],
    [8, 6, 6, 18, 16], [32, 10, 5, 15, 20], [54, 16, 5, 14, 24],
    [76, 26, 5, 15, 28], [96, 42, 6, 17, 32], [-74, 58, 7, 20, 36],
    [-60, 82, 6, 18, 40], [-20, 94, 7, 20, 44], [20, 94, 6, 18, 48],
    [56, 82, 6, 18, 52], [86, 62, 6, 17, 56], [-98, 60, 5, 15, 60],
    [42, 44, 4, 13, 64], [52, 60, 4, 13, 68], [-40, 42, 4, 13, 72],
  ];
  for (const [x, z, r, c, s] of lotus) root.add(createLotus({ x, z, radius: r, count: c, seed: s }));
  root.add(createShoreDetails());
  const benches = [
    [-86, 8], [-70, 40], [-30, 104], [10, 104], [46, 98], [82, 74],
    [100, 40], [110, 16],
  ];
  benches.forEach(([x, z], i) => {
    const b = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.16, 0.55), mats.timber);
    seat.position.set(0, 0.45, 0);
    b.add(seat);
    for (const sx of [-0.85, 0.85]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.45, 0.46), mats.stone);
      leg.position.set(sx, 0.22, 0);
      b.add(leg);
    }
    const back = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.5, 0.12), mats.timber);
    back.position.set(0, 0.78, -0.24);
    b.add(back);
    b.position.set(x, Math.max(0.1, heightAt(x, z)), z);
    b.rotation.y = i * 0.55;
    root.add(b);
  });

  for (const [x, z, s] of [
    [-86, 12, 1.0], [4, 103, 1.0], [64, 88, 1.0], [110, 24, 0.9],
    [-48, 28, 0.9], [42, 34, 0.9], [-8, -21, 1.1],
  ]) {
    const lantern = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.18, 2.4, 6), mats.timber);
    pole.position.y = 1.2;
    lantern.add(pole);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.14, 0.72), mats.roofDark);
    cap.position.y = 2.4;
    lantern.add(cap);
    const glow = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.5), mats.lanternRed);
    glow.position.y = 2.0;
    lantern.add(glow);
    lantern.position.set(x, Math.max(0.1, heightAt(x, z)), z);
    lantern.scale.setScalar(s);
    root.add(lantern);
  }

  root.add(createLakeRocks());
  const merged = mergeStaticGroup(root);
  const life = createSummerLife();
  merged.add(life.group);
  return {
    group: merged,
    waterMaterial,
    life,
    lanternMaterial: mats.lanternRed,
  };
}
