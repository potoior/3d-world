import * as THREE from 'three';
import { mats, sharedTextures } from './materials.js';

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

function cloudPlane(w, d, x, y, z, rotation, material, opacity) {
  const geo = new THREE.PlaneGeometry(w, d, 1, 1);
  const mesh = new THREE.Mesh(geo, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.rotation.z = rotation;
  mesh.position.set(x, y, z);
  mesh.renderOrder = 2;
  return mesh;
}

export function createCloudSea() {
  const root = new THREE.Group();
  root.name = 'huashan-sea-of-clouds';
  const rand = mulberry32(7412);
  const sheets = [];
  const small = new THREE.MeshBasicMaterial({
    map: sharedTextures.cloudMap,
    color: 0xf4f2e9,
    transparent: true,
    opacity: 0.62,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: true,
  });
  small.forceSinglePass = true;
  const low = [
    [2700, 1560, 0, 198, 160, 0.05, mats.cloud],
    [2400, 1380, -120, 218, -120, -0.08, mats.cloud],
    [2600, 1460, 180, 242, -420, 0.03, mats.cloudWarm],
    [3100, 1650, -80, 268, -820, -0.04, small],
    [3600, 1850, 20, 302, -1900, 0, small],
    [3000, 1500, 120, 326, -1120, -0.02, mats.cloudWarm],
  ];
  for (const s of low) {
    const m = cloudPlane(s[0], s[1], s[2], s[3], s[4], s[5], s[6], s[7]);
    m.userData.baseX = s[2];
    m.userData.drift = 3 + rand() * 5;
    root.add(m);
    sheets.push(m);
  }

  const banks = [
    [860, 190, 150, 286, -330, -0.18, 0.5],
    [660, 160, -320, 304, -540, 0.22, 0.44],
    [740, 180, 360, 262, -170, 0.1, 0.38],
    [980, 210, -60, 326, -760, -0.08, 0.34],
    [620, 150, 110, 292, -430, 0.16, 0.42],
  ];
  for (const b of banks) {
    const geo = new THREE.PlaneGeometry(b[0], b[1], 1, 1);
    const mat = new THREE.MeshBasicMaterial({
      map: sharedTextures.cloudMap,
      color: 0xf1efe6,
      transparent: true,
      opacity: b[6],
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: true,
    });
    mat.forceSinglePass = true;
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(b[2], b[3], b[4]);
    mesh.rotation.y = b[5];
    mesh.renderOrder = 3;
    mesh.userData.baseX = b[2];
    mesh.userData.drift = 2;
    root.add(mesh);
    sheets.push(mesh);
  }

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
    [-540, 232, 80, 540, 132], [420, 246, 20, 610, 148], [80, 218, 240, 670, 162],
    [-220, 262, -260, 750, 174], [260, 282, -420, 700, 158], [-420, 300, -520, 610, 142],
    [180, 212, 330, 560, 132], [-260, 338, -1120, 940, 200],
    [-60, 312, -660, 520, 120],
  ];
  for (const d of defs) {
    const spr = new THREE.Sprite(spriteMat);
    spr.position.set(d[0], d[1], d[2]);
    spr.scale.set(d[3], d[4], 1);
    spr.renderOrder = 4;
    spr.userData.baseX = d[0];
    spr.userData.drift = 2 + rand() * 4;
    root.add(spr);
    sprites.push(spr);
  }

  const fallMat = new THREE.MeshBasicMaterial({
    map: sharedTextures.cloudMap,
    color: 0xeeede6,
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: true,
  });
  fallMat.forceSinglePass = true;
  const falls = [];
  for (let i = 0; i < 2; i++) {
    const geo = new THREE.PlaneGeometry(110 + i * 30, 190 + i * 20);
    const mesh = new THREE.Mesh(geo, fallMat);
    mesh.position.set(70 - i * 40, 286 - i * 8, -300 - i * 70);
    mesh.rotation.y = 0.15 + i * 0.04;
    mesh.renderOrder = 4;
    root.add(mesh);
    falls.push(mesh);
  }

  for (let i = 0; i < 5; i++) {
    const geo = new THREE.PlaneGeometry(160 + i * 46, 90 + i * 18);
    const mesh = new THREE.Mesh(geo, small);
    mesh.position.set(-20 + i * 38, 252 + i * 13, -280 - i * 34);
    mesh.rotation.y = -0.28 + i * 0.12;
    mesh.renderOrder = 4;
    mesh.userData.baseX = mesh.position.x;
    mesh.userData.drift = 4 + rand() * 5;
    mesh.userData.baseY = mesh.position.y;
    root.add(mesh);
    sheets.push(mesh);
  }

  return {
    group: root,
    update(elapsed) {
      for (const m of sheets) {
        m.position.x = m.userData.baseX + Math.sin(elapsed * 0.012 + m.position.z * 0.001) * m.userData.drift * 3;
      }
      for (const s of sprites) {
        s.position.x = s.userData.baseX + Math.sin(elapsed * 0.02 + s.position.z * 0.002) * s.userData.drift * 4;
      }
      for (let i = 0; i < falls.length; i++) {
        falls[i].position.y = 286 - i * 8 + Math.sin(elapsed * 0.18 + i) * 2.2;
      }
    },
    sheets,
    sprites,
  };
}
