import * as THREE from 'three';
import { mats, sharedTextures } from './materials.js';
import { mergeGeometryList } from './geometry.js';

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function planeGeo(w, d, x, y, z, rotation, rx = -Math.PI / 2) {
  const geo = new THREE.PlaneGeometry(w, d, 1, 1);
  geo.rotateX(rx);
  geo.rotateZ(rotation);
  geo.translate(x, y, z);
  return geo;
}

export function createCloudSea() {
  const root = new THREE.Group();
  root.name = 'yandang-sea-of-clouds';
  const rand = mulberry32(7412);
  const sheets = [];

  const cool = [];
  const warm = [];
  const low = [
    [2700, 1560, 0, 52, 160, 0.05, cool],
    [2400, 1380, -120, 66, -120, -0.08, cool],
    [2600, 1460, 180, 82, -420, 0.03, warm],
    [3600, 1850, 20, 148, -1900, 0, cool],
    [3000, 1500, 120, 176, -1120, -0.02, warm],
  ];
  for (const s of low) s[6].push(planeGeo(s[0], s[1], s[2], s[3], s[4], s[5]));
  for (const [list, mat] of [[cool, mats.cloud], [warm, mats.cloudWarm]]) {
    if (!list.length) continue;
    const mesh = new THREE.Mesh(mergeGeometryList(list), mat);
    mesh.renderOrder = 2;
    mesh.userData.baseX = 0;
    mesh.userData.drift = 2.5;
    root.add(mesh);
    sheets.push(mesh);
  }

  const bankMat = new THREE.MeshBasicMaterial({
    map: sharedTextures.cloudMap,
    color: 0xf1efe6,
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: true,
  });
  const banks = [
    [860, 190, 150, 152, -330, -0.18],
    [660, 160, -320, 176, -540, 0.22],
    [740, 180, 360, 124, -170, 0.1],
    [980, 210, -60, 196, -760, -0.08],
  ].map((b) => planeGeo(b[0], b[1], b[2], b[3], b[4], b[5], 0));
  const bankMesh = new THREE.Mesh(mergeGeometryList(banks), bankMat);
  bankMesh.renderOrder = 3;
  bankMesh.userData.baseX = 0;
  bankMesh.userData.drift = 1.8;
  root.add(bankMesh);
  sheets.push(bankMesh);

  const spriteMat = new THREE.SpriteMaterial({
    map: sharedTextures.cloudMap,
    color: 0xf6f4ec,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    fog: true,
  });
  const sprites = [];
  const defs = [
    [-540, 92, 80, 620, 148],
    [260, 128, -260, 820, 186],
  ];
  for (const d of defs) {
    const spr = new THREE.Sprite(spriteMat);
    spr.position.set(d[0], d[1], d[2]);
    spr.scale.set(d[3], d[4], 1);
    spr.renderOrder = 4;
    spr.userData.baseX = d[0];
    spr.userData.drift = 2 + rand() * 3;
    root.add(spr);
    sprites.push(spr);
  }

  const falls = [
    planeGeo(110, 190, 70, 118, -300, 0.15, 0),
    planeGeo(140, 210, 30, 110, -370, 0.19, 0),
  ];
  const fallMesh = new THREE.Mesh(mergeGeometryList(falls), mats.mist);
  fallMesh.renderOrder = 4;
  fallMesh.userData.baseY = 0;
  root.add(fallMesh);
  sheets.push(fallMesh);

  return {
    group: root,
    update(elapsed) {
      for (const m of sheets) {
        const base = m.userData.baseX || 0;
        m.position.x = base + Math.sin(elapsed * 0.012 + m.position.z * 0.001) * m.userData.drift * 3;
      }
      for (const s of sprites) {
        s.position.x = s.userData.baseX + Math.sin(elapsed * 0.02 + s.position.z * 0.002) * s.userData.drift * 4;
      }
      fallMesh.position.y = Math.sin(elapsed * 0.18) * 1.6;
    },
    sheets,
    sprites,
  };
}
