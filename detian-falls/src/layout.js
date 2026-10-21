import * as THREE from 'three';
import { mats, sharedTextures } from './materials.js';
import {
  heightAt,
  createTerrain,
  createDistantMountains,
  trailPointAt,
  platforms,
  riverCenter,
  lowerHalfWidth,
  upperHalfWidth,
  WATER_LOW,
  WATER_HIGH,
  CLIFF_Z,
} from './terrain.js';

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

function makeWaterTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d');
  const rand = mulberry32(9157);
  const grd = ctx.createLinearGradient(0, 0, 512, 512);
  grd.addColorStop(0, '#3f837c');
  grd.addColorStop(0.45, '#2f716f');
  grd.addColorStop(1, '#245d61');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 220; i++) {
    const y = rand() * 512;
    const x = rand() * 512;
    const len = 20 + rand() * 130;
    ctx.strokeStyle = 'rgba(217,241,233,' + (0.03 + rand() * 0.11).toFixed(3) + ')';
    ctx.lineWidth = 0.6 + rand() * 2.2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x + len * 0.3, y - 3, x + len * 0.7, y + 3, x + len, y);
    ctx.stroke();
  }
  for (let i = 0; i < 40; i++) {
    const x = rand() * 512;
    const y = rand() * 512;
    const r = 12 + rand() * 46;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(177,221,207,0.09)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

const waterTexture = makeWaterTexture();
const waterMaterial = new THREE.MeshStandardMaterial({
  map: waterTexture,
  color: 0xb5ded2,
  transparent: true,
  opacity: 0.84,
  roughness: 0.16,
  metalness: 0.18,
  depthWrite: false,
  side: THREE.DoubleSide,
});

function createRiverStrip(z0, z1, y, rows, widthFn) {
  const cols = 14;
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let i = 0; i <= rows; i++) {
    const z = z0 + ((z1 - z0) * i) / rows;
    const c = riverCenter(z);
    const w = widthFn(z);
    for (let j = 0; j <= cols; j++) {
      const t = j / cols - 0.5;
      positions.push(c + t * 2 * w, y + Math.sin(i * 0.61 + j * 0.23) * 0.035, z);
      uvs.push(j / cols, i / rows);
    }
  }
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const a = i * (cols + 1) + j;
      const b = a + 1;
      const c2 = a + cols + 1;
      const d = c2 + 1;
      indices.push(a, c2, b, b, c2, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function createCloudBands() {
  const group = new THREE.Group();
  const rand = mulberry32(4417);
  const defs = [
    [-980, 146, -620, 640, 170, 0.18],
    [820, 132, -700, 720, 190, 0.16],
    [-860, 116, 520, 680, 160, 0.2],
    [940, 152, 610, 760, 210, 0.14],
    [20, 126, -1220, 980, 240, 0.2],
    [180, 168, 1180, 1120, 270, 0.16],
  ];
  const materials = [mats.cloud, mats.cloudWarm];
  const sheets = [];
  for (let i = 0; i < defs.length; i++) {
    const d = defs[i];
    const mat = materials[i % 2].clone();
    mat.opacity = d[5];
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(d[3], d[4]), mat);
    mesh.position.set(d[0], d[1], d[2]);
    mesh.rotation.y = rand() * 0.4 - 0.2;
    mesh.renderOrder = 2;
    mesh.userData.baseX = d[0];
    mesh.userData.baseY = d[1];
    mesh.userData.drift = 4 + i * 1.3;
    mesh.userData.phase = i * 1.1;
    group.add(mesh);
    sheets.push(mesh);
  }
  return {
    group,
    update(elapsed) {
      for (const s of sheets) {
        s.position.x = s.userData.baseX + Math.sin(elapsed * 0.016 + s.userData.phase) * s.userData.drift * 3;
        s.position.y = s.userData.baseY + Math.sin(elapsed * 0.02 + s.userData.phase) * 1.6;
      }
    },
  };
}

export function buildDetian() {
  const root = new THREE.Group();
  root.name = 'detian-falls-world';

  const terrainMaterial = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 1,
    metalness: 0,
  });
  const terrain = createTerrain(terrainMaterial, 3000, 300);
  root.add(terrain);

  const farMaterialA = new THREE.MeshStandardMaterial({
    color: 0x6d8f7a,
    roughness: 1,
    flatShading: true,
  });
  const farMaterialB = new THREE.MeshStandardMaterial({
    color: 0x8ba594,
    roughness: 1,
    flatShading: true,
  });
  root.add(createDistantMountains(farMaterialA, farMaterialB));

  const lowerGeo = createRiverStrip(CLIFF_Z + 4, 1080, WATER_LOW, 190, (z) => lowerHalfWidth(z) + 8);
  const lowerWater = new THREE.Mesh(lowerGeo, waterMaterial);
  lowerWater.renderOrder = 2;
  lowerWater.name = 'guichun-river-lower';
  lowerWater.receiveShadow = true;
  root.add(lowerWater);

  const upperGeo = createRiverStrip(-1120, CLIFF_Z - 19, WATER_HIGH - 0.5, 120, (z) => upperHalfWidth(z) + 5);
  const upperWater = new THREE.Mesh(upperGeo, waterMaterial.clone());
  upperWater.material.opacity = 0.9;
  upperWater.renderOrder = 2;
  upperWater.name = 'guichun-river-upper';
  upperWater.receiveShadow = true;
  root.add(upperWater);

  const foamTexture = sharedTextures.mistMap.clone();
  foamTexture.needsUpdate = true;
  const foamMat = new THREE.MeshBasicMaterial({
    map: foamTexture,
    color: 0xeefaf4,
    transparent: true,
    opacity: 0.44,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: true,
    toneMapped: true,
  });
  const foam = new THREE.Mesh(new THREE.CircleGeometry(135, 40), foamMat);
  foam.rotation.x = -Math.PI / 2;
  foam.position.set(0, WATER_LOW + 0.13, CLIFF_Z + 62);
  foam.renderOrder = 3;
  foam.name = 'detian-plunge-foam';
  root.add(foam);

  const cloudBands = createCloudBands();
  root.add(cloudBands.group);

  const views = {
    overview: { p: [-336, 205, 505], t: [0, 44, -72] },
    falls: { p: [2, 48, 292], t: [0, 39, -116] },
    raft: { p: [-88, 14, 176], t: [26, 7, 38] },
    karst: { p: [352, 158, 336], t: [-96, 82, -238] },
    dusk: { p: [-418, 236, 545], t: [0, 38, -66] },
  };

  const notes = {
    overview: ['德天瀑布 · 广西·中越边境', '归春河在喀斯特峰林间铺开百米白帘，雾气、竹筏与两岸稻田共同构成中越边境的山水长卷'],
    falls: ['德天瀑布', '多级跌水沿灰岩崖壁分层倾泻，主瀑宽逾百米，水雾升腾处常见彩虹横跨归春河'],
    raft: ['竹筏漂流', '竹筏自下游码头驶向瀑底，撑筏人与边境村民在河面往来，越南板约瀑布就在水雾另一侧'],
    karst: ['喀斯特峰林', '锥状与塔状石灰岩孤峰在稻田尽头层层排列，峰体裂隙与藤蔓记录着热带季风的侵蚀'],
    dusk: ['黄昏', '落日把瀑雾染成暖金色，界碑与村舍沉入暮色，归春河仍带着白日的轰鸣向南流去'],
  };

  function update(elapsed, dt) {
    const step = Number.isFinite(dt) ? dt : 0.016;
    waterTexture.offset.x = (waterTexture.offset.x + step * 0.028) % 1;
    waterTexture.offset.y = (waterTexture.offset.y - step * 0.045) % 1;
    lowerWater.material.map = waterTexture;
    upperWater.material.map = waterTexture;
    upperWater.material.opacity = 0.88 + Math.sin(elapsed * 0.9) * 0.03;
    foamTexture.offset.x = (foamTexture.offset.x + step * 0.015) % 1;
    foamTexture.offset.y = (foamTexture.offset.y + step * 0.03) % 1;
    foam.material.opacity = 0.38 + Math.sin(elapsed * 0.8) * 0.06;
    foam.rotation.z = Math.sin(elapsed * 0.07) * 0.08;
    cloudBands.update(elapsed);
  }

  update(0.2, 0.016);

  return {
    group: root,
    terrain,
    views,
    notes,
    heightAt,
    trailPointAt,
    platforms,
    water: { lowerWater, upperWater, foam },
    update,
  };
}
