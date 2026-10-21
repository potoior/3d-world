import * as THREE from 'three';
import { makeCloudTexture } from './textures.js';
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

function makeYellowRiverTexture(seed, dark = false) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d');
  const rand = mulberry32(seed);
  const grd = ctx.createLinearGradient(0, 0, 512, 512);
  if (dark) {
    grd.addColorStop(0, '#7b5b31');
    grd.addColorStop(0.42, '#8d6939');
    grd.addColorStop(0.75, '#9c7742');
    grd.addColorStop(1, '#80602f');
  } else {
    grd.addColorStop(0, '#9a763f');
    grd.addColorStop(0.38, '#b08a4e');
    grd.addColorStop(0.72, '#a37d42');
    grd.addColorStop(1, '#8b6734');
  }
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 360; i++) {
    const y = rand() * 512;
    const x = rand() * 512;
    const len = 30 + rand() * 220;
    const light = rand() > 0.42;
    ctx.strokeStyle = light
      ? 'rgba(236,214,164,' + (0.025 + rand() * 0.12).toFixed(3) + ')'
      : 'rgba(76,53,26,' + (0.02 + rand() * 0.09).toFixed(3) + ')';
    ctx.lineWidth = 0.7 + rand() * 4.6;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x + len * 0.28, y - 5, x + len * 0.72, y + 6, x + len, y);
    ctx.stroke();
  }
  for (let i = 0; i < 48; i++) {
    const x = rand() * 512;
    const y = rand() * 512;
    const r = 14 + rand() * 60;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(231,206,157,' + (0.03 + rand() * 0.055).toFixed(3) + ')');
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

const upperTexture = makeYellowRiverTexture(4817, false);
const lowerTexture = makeYellowRiverTexture(9123, true);
upperTexture.repeat.set(2.4, 9);
lowerTexture.repeat.set(1.7, 12);

const upperWaterMaterial = new THREE.MeshStandardMaterial({
  map: upperTexture,
  color: 0xd7b172,
  roughness: 0.34,
  metalness: 0.08,
  transparent: true,
  opacity: 0.97,
  side: THREE.DoubleSide,
});

const lowerWaterMaterial = new THREE.MeshStandardMaterial({
  map: lowerTexture,
  color: 0xc69a58,
  roughness: 0.3,
  metalness: 0.1,
  transparent: true,
  opacity: 0.97,
  side: THREE.DoubleSide,
});

function createRiverStrip(z0, z1, y, rows, widthFn) {
  const cols = 22;
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let i = 0; i <= rows; i++) {
    const z = z0 + ((z1 - z0) * i) / rows;
    const c = riverCenter(z);
    const w = widthFn(z);
    for (let j = 0; j <= cols; j++) {
      const t = j / cols - 0.5;
      positions.push(
        c + t * 2 * w,
        y + Math.sin(i * 0.51 + j * 0.37) * 0.06 + Math.sin(i * 0.13) * 0.04,
        z
      );
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
  const map = makeCloudTexture();
  const defs = [
    [-1080, 176, -760, 820, 210, 0.2],
    [900, 154, -820, 900, 240, 0.17],
    [-980, 138, 640, 780, 190, 0.16],
    [1080, 172, 720, 940, 260, 0.15],
    [40, 158, -1420, 1180, 300, 0.18],
    [220, 188, 1360, 1280, 320, 0.14],
  ];
  const sheets = [];
  for (let i = 0; i < defs.length; i++) {
    const d = defs[i];
    const mat = new THREE.MeshBasicMaterial({
      map,
      color: i % 2 ? 0xf3e3c6 : 0xf7ecd6,
      transparent: true,
      opacity: d[5],
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: true,
      toneMapped: true,
    });
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
        s.position.x = s.userData.baseX + Math.sin(elapsed * 0.014 + s.userData.phase) * s.userData.drift * 3;
        s.position.y = s.userData.baseY + Math.sin(elapsed * 0.019 + s.userData.phase) * 1.6;
      }
    },
  };
}

export function buildHukou() {
  const root = new THREE.Group();
  root.name = 'hukou-waterfall-world';

  const terrainMaterial = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.99,
    metalness: 0,
  });
  console.log('MARK terrain-start');
  const terrain = createTerrain(terrainMaterial, 3000, 340);
  console.log('MARK terrain-done');
  root.add(terrain);

  const farMaterialA = new THREE.MeshStandardMaterial({
    color: 0xa98d63,
    roughness: 1,
    flatShading: true,
  });
  const farMaterialB = new THREE.MeshStandardMaterial({
    color: 0xc0a77c,
    roughness: 1,
    flatShading: true,
  });
  console.log('MARK mesas-start');
  root.add(createDistantMountains(farMaterialA, farMaterialB));
  console.log('MARK mesas-done');

  const upperGeo = createRiverStrip(-1180, CLIFF_Z - 3, WATER_HIGH + 0.12, 180, (z) => upperHalfWidth(z) + 6);
  const upperWater = new THREE.Mesh(upperGeo, upperWaterMaterial);
  upperWater.renderOrder = 2;
  upperWater.name = 'yellow-river-upper';
  upperWater.receiveShadow = true;
  root.add(upperWater);

  const lowerGeo = createRiverStrip(CLIFF_Z + 3, 1020, WATER_LOW + 0.12, 280, (z) => lowerHalfWidth(z) + 5);
  const lowerWater = new THREE.Mesh(lowerGeo, lowerWaterMaterial);
  lowerWater.renderOrder = 2;
  lowerWater.name = 'yellow-river-gorge';
  lowerWater.receiveShadow = true;
  root.add(lowerWater);

  const plungeGeo = new THREE.CircleGeometry(1, 64);
  const plungeMat = new THREE.MeshStandardMaterial({
    map: lowerTexture,
    color: 0xcaa360,
    roughness: 0.24,
    metalness: 0.12,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const plunge = new THREE.Mesh(plungeGeo, plungeMat);
  plunge.rotation.x = -Math.PI / 2;
  plunge.scale.set(56, 34, 1);
  plunge.position.set(0, WATER_LOW + 0.26, -34);
  plunge.renderOrder = 2;
  plunge.name = 'hukou-plunge-pool';
  root.add(plunge);

  const cloudBands = createCloudBands();
  root.add(cloudBands.group);

  const views = {
    overview: { p: [212, 122, 262], t: [-2, 32, -72], fov: 46 },
    hukou: { p: [52, 35, 46], t: [0, 27, -60], fov: 52 },
    'dragon-cave': { p: [-36.5, 20.4, 10], t: [4, 26, -58], fov: 64 },
    river: { p: [-152, 78, -476], t: [-8, 40, -104], fov: 52 },
    dusk: { p: [238, 100, 286], t: [0, 30, -68], fov: 47 },
  };

  const notes = {
    overview: [
      '壶口瀑布 · 晋陕·黄河之心',
      '黄河自晋陕峡谷奔涌而来，三百米河面骤然收束成壶口，跌入三十米深的十里龙槽，浊浪翻卷，水雾遮天',
    ],
    hukou: [
      '壶口 · 千里黄河一壶收',
      '河床由三百米收至三十余米，黄水在壶口挤成一道金瀑；浪头撞击岩壁，水雾升腾数十米，晴日彩虹横跨两岸',
    ],
    'dragon-cave': [
      '龙洞 · 瀑底观河',
      '龙洞开在山西一侧的崖脚，沿石阶下到瀑底，水声如雷。洞窗正对壶口，飞沫扑面，黄河的金色水墙近在咫尺',
    ],
    river: [
      '黄河 · 晋陕大峡谷',
      '黄河在黄土高原切出晋陕大峡谷，两岸黄土层叠、沟壑纵横；河面宽阔平缓，流至壶口忽然收束，声震秦晋',
    ],
    dusk: [
      '壶口暮色',
      '落日沉入吕梁山，壶口的水雾被染成赤金；龙槽轰鸣不绝，岸边的毛驴与游人剪影留在黄河故道',
    ],
  };

  function update(elapsed, dt) {
    const step = Number.isFinite(dt) ? dt : 0.016;
    upperTexture.offset.y = (upperTexture.offset.y - step * 0.046) % 1;
    lowerTexture.offset.y = (lowerTexture.offset.y - step * 0.072) % 1;
    upperTexture.offset.x = Math.sin(elapsed * 0.06) * 0.008;
    lowerTexture.offset.x = Math.sin(elapsed * 0.08 + 1.4) * 0.012;
    upperWaterMaterial.opacity = 0.96 + Math.sin(elapsed * 0.8) * 0.015;
    lowerWaterMaterial.opacity = 0.96 + Math.sin(elapsed * 1.05 + 0.7) * 0.018;
    plungeMat.opacity = 0.86 + Math.sin(elapsed * 1.3 + 0.3) * 0.035;
    cloudBands.update(elapsed);
  }

  console.log('MARK base-end');
  update(0.2, 0.016);

  return {
    group: root,
    terrain,
    views,
    notes,
    heightAt,
    trailPointAt,
    platforms,
    water: { upperWater, lowerWater, plunge },
    update,
  };
}

export const buildHuangguoshu = buildHukou;
export const buildDetian = buildHukou;
