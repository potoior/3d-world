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
  grd.addColorStop(0, '#2f7d74');
  grd.addColorStop(0.38, '#236c6d');
  grd.addColorStop(0.72, '#1c5c63');
  grd.addColorStop(1, '#174e57');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 280; i++) {
    const y = rand() * 512;
    const x = rand() * 512;
    const len = 20 + rand() * 150;
    ctx.strokeStyle = 'rgba(213,243,235,' + (0.03 + rand() * 0.14).toFixed(3) + ')';
    ctx.lineWidth = 0.6 + rand() * 2.4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x + len * 0.3, y - 4, x + len * 0.7, y + 4, x + len, y);
    ctx.stroke();
  }
  for (let i = 0; i < 52; i++) {
    const x = rand() * 512;
    const y = rand() * 512;
    const r = 12 + rand() * 58;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(158,220,203,0.1)');
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

function makePoolTexture() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 1024;
  const ctx = c.getContext('2d');
  const rand = mulberry32(5521);
  const g = ctx.createRadialGradient(512, 540, 30, 512, 540, 560);
  g.addColorStop(0, '#2b8a80');
  g.addColorStop(0.28, '#257a76');
  g.addColorStop(0.62, '#20676a');
  g.addColorStop(0.86, '#2a6d60');
  g.addColorStop(1, '#3d7b5a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 70; i++) {
    const cx = 512 + (rand() - 0.5) * 760;
    const cy = 520 + (rand() - 0.5) * 700;
    const r = 14 + rand() * 120;
    const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    rg.addColorStop(0, 'rgba(185,239,221,' + (0.025 + rand() * 0.05).toFixed(3) + ')');
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  }
  ctx.strokeStyle = 'rgba(221,247,238,0.15)';
  for (let i = 0; i < 36; i++) {
    ctx.lineWidth = 0.7 + rand() * 2;
    ctx.beginPath();
    const y = 430 + rand() * 360;
    const x = 120 + rand() * 660;
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x + 90, y - 5, x + 180, y + 6, x + 280, y);
    ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function makePlungeFoamTexture() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const ctx = c.getContext('2d');
  const rand = mulberry32(7727);
  ctx.clearRect(0, 0, 1024, 512);
  const g = ctx.createRadialGradient(512, 250, 20, 512, 250, 500);
  g.addColorStop(0, 'rgba(255,255,255,0.78)');
  g.addColorStop(0.3, 'rgba(250,255,252,0.52)');
  g.addColorStop(0.62, 'rgba(242,253,248,0.2)');
  g.addColorStop(1, 'rgba(238,250,245,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 340; i++) {
    const x = 512 + (rand() - 0.5) * 940;
    const y = 250 + (rand() - 0.5) * 430;
    const d = Math.hypot((x - 512) / 500, (y - 250) / 245);
    if (d > 1) continue;
    const r = 1.5 + rand() * 10;
    ctx.strokeStyle = 'rgba(255,255,255,' + (0.05 + rand() * 0.42 * (1 - d)).toFixed(3) + ')';
    ctx.lineWidth = 0.8 + rand() * 4.2;
    ctx.beginPath();
    ctx.arc(x, y, r, rand() * 6.2, rand() * 6.2 + 2.4);
    ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

const waterTexture = makeWaterTexture();
const poolTexture = makePoolTexture();
const plungeFoamTexture = makePlungeFoamTexture();

const waterMaterial = new THREE.MeshStandardMaterial({
  map: waterTexture,
  color: 0xa7ded0,
  transparent: true,
  opacity: 0.88,
  roughness: 0.13,
  metalness: 0.22,
  depthWrite: false,
  side: THREE.DoubleSide,
});

const poolMaterial = new THREE.MeshStandardMaterial({
  map: poolTexture,
  color: 0xbde6d8,
  transparent: true,
  opacity: 0.93,
  roughness: 0.18,
  metalness: 0.16,
  depthWrite: false,
  side: THREE.DoubleSide,
});

function createRiverStrip(z0, z1, y, rows, widthFn) {
  const cols = 16;
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let i = 0; i <= rows; i++) {
    const z = z0 + ((z1 - z0) * i) / rows;
    const c = riverCenter(z);
    const w = widthFn(z);
    for (let j = 0; j <= cols; j++) {
      const t = j / cols - 0.5;
      positions.push(c + t * 2 * w, y + Math.sin(i * 0.61 + j * 0.23) * 0.04, z);
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
    [-980, 168, -690, 700, 180, 0.2],
    [820, 144, -740, 760, 200, 0.17],
    [-880, 124, 520, 700, 165, 0.22],
    [960, 160, 640, 800, 220, 0.16],
    [20, 138, -1280, 1020, 250, 0.22],
    [180, 178, 1240, 1140, 280, 0.18],
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

export function buildHuangguoshu() {
  const root = new THREE.Group();
  root.name = 'huangguoshu-falls-world';

  const terrainMaterial = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.99,
    metalness: 0,
  });
  const terrain = createTerrain(terrainMaterial, 3000, 320);
  root.add(terrain);

  const farMaterialA = new THREE.MeshStandardMaterial({
    color: 0x4f7965,
    roughness: 1,
    flatShading: true,
  });
  const farMaterialB = new THREE.MeshStandardMaterial({
    color: 0x739381,
    roughness: 1,
    flatShading: true,
  });
  root.add(createDistantMountains(farMaterialA, farMaterialB));

  const lowerGeo = createRiverStrip(CLIFF_Z + 8, 1120, WATER_LOW, 200, (z) => lowerHalfWidth(z) + 12);
  const lowerWater = new THREE.Mesh(lowerGeo, waterMaterial);
  lowerWater.renderOrder = 2;
  lowerWater.name = 'baishui-river-lower';
  lowerWater.receiveShadow = true;
  root.add(lowerWater);

  const upperGeo = createRiverStrip(-1160, CLIFF_Z - 22, WATER_HIGH - 0.5, 128, (z) => upperHalfWidth(z) + 6);
  const upperWater = new THREE.Mesh(upperGeo, waterMaterial.clone());
  upperWater.material.opacity = 0.91;
  upperWater.renderOrder = 2;
  upperWater.name = 'baishui-river-upper';
  upperWater.receiveShadow = true;
  root.add(upperWater);

  const poolGeo = new THREE.CircleGeometry(1, 72);
  const pool = new THREE.Mesh(poolGeo, poolMaterial);
  pool.rotation.x = -Math.PI / 2;
  pool.scale.set(173, 122, 1);
  pool.position.set(0, WATER_LOW + 0.16, CLIFF_Z + 78);
  pool.renderOrder = 2;
  pool.name = 'rhino-plunge-pool';
  root.add(pool);

  const foamMat = new THREE.MeshBasicMaterial({
    map: plungeFoamTexture,
    color: 0xf3fff9,
    transparent: true,
    opacity: 0.56,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: true,
    toneMapped: true,
  });
  const plungeFoam = new THREE.Mesh(new THREE.PlaneGeometry(330, 196), foamMat);
  plungeFoam.rotation.x = -Math.PI / 2;
  plungeFoam.position.set(0, WATER_LOW + 0.34, CLIFF_Z + 58);
  plungeFoam.renderOrder = 3;
  plungeFoam.name = 'rhino-pool-foam';
  root.add(plungeFoam);

  const trailFoamMat = new THREE.MeshBasicMaterial({
    map: sharedTextures.mistMap.clone(),
    color: 0xeafaf3,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: true,
    toneMapped: true,
  });
  trailFoamMat.map.needsUpdate = true;
  const riverFoam = new THREE.Mesh(new THREE.PlaneGeometry(130, 560), trailFoamMat);
  riverFoam.rotation.x = -Math.PI / 2;
  riverFoam.position.set(0, WATER_LOW + 0.28, CLIFF_Z + 370);
  riverFoam.renderOrder = 3;
  root.add(riverFoam);

  const cloudBands = createCloudBands();
  root.add(cloudBands.group);

  const views = {
    overview: { p: [-312, 196, 470], t: [0, 50, -150], fov: 46 },
    'main-fall': { p: [18, 26, 122], t: [0, 42, -148], fov: 50 },
    'water-curtain': { p: [55, 40.8, -181], t: [-18, 43, -153], fov: 68 },
    doupotang: { p: [-344, 86, -516], t: [-303, 96, -601], fov: 56 },
    dusk: { p: [-350, 158, 450], t: [0, 44, -150], fov: 48 },
  };

  const notes = {
    overview: [
      '黄果树瀑布 · 贵州·亚洲第一瀑',
      '白水河自黔中高原跌落，77.8 米主瀑横展百米，犀牛潭水雾升腾，水帘洞、陡坡塘与天星桥在亚热带峡谷中层叠展开',
    ],
    'main-fall': [
      '黄果树主瀑',
      '主瀑高 77.8 米、宽 101 米，白帘自断崖整体倾泻，撞击犀牛潭激起数十米水雾，晴天常见彩虹横跨潭面',
    ],
    'water-curtain': [
      '水帘洞',
      '瀑后崖壁中藏 134 米长的水帘洞，洞窗嵌在飞瀑背后；穿行其中，水声如雷，岩壁终年湿滑，苔藓与蕨类沿灯光生长',
    ],
    doupotang: [
      '陡坡塘瀑布',
      '白水河上游的陡坡塘宽 105 米、高 21 米，水流沿钙华滩面铺展成一面银色扇幕，是黄果树瀑布群中最宽阔的一级',
    ],
    dusk: [
      '黄果树暮色',
      '落日掠过喀斯特峰丛，瀑雾被染成暖金；布依村寨的炊烟、观瀑亭的灯火与犀牛潭的轰鸣一起沉入黔中夜色',
    ],
  };

  function update(elapsed, dt) {
    const step = Number.isFinite(dt) ? dt : 0.016;
    waterTexture.offset.x = (waterTexture.offset.x + step * 0.022) % 1;
    waterTexture.offset.y = (waterTexture.offset.y - step * 0.038) % 1;
    poolTexture.offset.x = (poolTexture.offset.x + step * 0.004) % 1;
    poolTexture.offset.y = (poolTexture.offset.y - step * 0.008) % 1;
    lowerWater.material.map = waterTexture;
    upperWater.material.map = waterTexture;
    poolMaterial.map = poolTexture;
    upperWater.material.opacity = 0.89 + Math.sin(elapsed * 0.9) * 0.03;
    plungeFoamTexture.offset.y = (plungeFoamTexture.offset.y - step * 0.05) % 1;
    foamMat.opacity = 0.5 + Math.sin(elapsed * 1.15) * 0.08;
    plungeFoam.rotation.z = Math.sin(elapsed * 0.09) * 0.06;
    trailFoamMat.opacity = 0.3 + Math.sin(elapsed * 0.7 + 1.2) * 0.06;
    trailFoamMat.map.offset.y = (trailFoamMat.map.offset.y - step * 0.03) % 1;
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
    water: { lowerWater, upperWater, pool, foam: plungeFoam },
    update,
  };
}

export const buildDetian = buildHuangguoshu;
