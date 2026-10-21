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
  root.name = 'sea-of-clouds';
  const rand = mulberry32(7412);
  const sheets = [];
  const small = new THREE.MeshBasicMaterial({
    map: sharedTextures.cloudMap,
    color: 0xf0f4f3,
    transparent: true,
    opacity: 0.62,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: true,
  });
  const low = [
    [2600, 1500, 0, 34, 140, 0.05, mats.cloud],
    [2200, 1300, -120, 43, -120, -0.08, mats.cloud],
    [2500, 1400, 180, 52, -420, 0.03, mats.cloudWarm],
    [3000, 1600, -80, 62, -820, -0.04, small],
    [3400, 1800, 0, 96, -1860, 0, small],
  ];
  for (const s of low) {
    const m = cloudPlane(s[0], s[1], s[2], s[3], s[4], s[5], s[6], s[7]);
    m.userData.baseX = s[2];
    m.userData.drift = 3 + rand() * 5;
    root.add(m);
    sheets.push(m);
  }

  const banks = [
    [820, 180, 150, 84, -330, -0.18, 0.5],
    [620, 150, -320, 104, -540, 0.22, 0.44],
    [700, 170, 360, 70, -170, 0.1, 0.38],
  ];
  for (const b of banks) {
    const geo = new THREE.PlaneGeometry(b[0], b[1], 1, 1);
    const mat = new THREE.MeshBasicMaterial({
      map: sharedTextures.cloudMap,
      color: 0xeef3f2,
      transparent: true,
      opacity: b[6],
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: true,
    });
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
    color: 0xf6f8f6,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    fog: true,
  });
  const sprites = [];
  const defs = [
    [-540, 58, 80, 500, 120], [420, 62, 20, 560, 135], [80, 48, 240, 620, 150],
    [-220, 70, -260, 700, 160], [260, 88, -420, 650, 145], [-420, 96, -520, 560, 130],
    [180, 44, 330, 520, 120], [-260, 138, -1120, 900, 190], [640, 150, -1240, 1000, 210],
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
    color: 0xe9f0f0,
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: true,
  });
  const falls = [];
  for (let i = 0; i < 2; i++) {
    const geo = new THREE.PlaneGeometry(110 + i * 30, 190 + i * 20);
    const mesh = new THREE.Mesh(geo, fallMat);
    mesh.position.set(70 - i * 40, 58 - i * 4, -300 - i * 70);
    mesh.rotation.y = 0.15 + i * 0.04;
    mesh.renderOrder = 4;
    root.add(mesh);
    falls.push(mesh);
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
        falls[i].position.y = 58 - i * 4 + Math.sin(elapsed * 0.18 + i) * 1.6;
      }
    },
    sheets,
    sprites,
  };
}
