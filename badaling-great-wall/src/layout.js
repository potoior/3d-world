import * as THREE from 'three';
import { mats, sharedTextures } from './materials.js';
import { mainCurve, southCurve, heightAt, createTerrain, createDistantMountains } from './terrain.js';
import { createWall } from './wall.js';
import { createTowerAt } from './towers.js';
import { createVegetation } from './vegetation.js';
import { createDistantWalls, createDetailStatics, createDetailDynamics } from './detail.js';
import { addBadalingRefinement } from './refineDetails.js';
import { createBadalingRefinementLife } from './refineLife.js';
import { addBadalingFinalPolish } from './finalPolish.js';
import { createBadalingFinalLife } from './finalLife.js';
import { mergeStaticGroup } from './geometry.js';

const northTowerSpecs = [
  { t: 0.062, name: '北一楼', subtitle: 'BADALING N.1', roof: false },
  { t: 0.152, name: '北二楼', subtitle: 'N.2', roof: false },
  { t: 0.268, name: '北四楼', subtitle: 'N.4 · 山脊转折', roof: false, beacon: true },
  { t: 0.392, name: '北五楼', subtitle: 'N.5', roof: false },
  { t: 0.522, name: '北八楼', subtitle: '好汉坡 · 海拔 888 米', roof: false, beacon: true },
  { t: 0.662, name: '北九楼', subtitle: 'N.9', roof: false },
  { t: 0.802, name: '北十楼', subtitle: 'N.10', roof: false, beacon: true, flag: false },
  { t: 0.926, name: '北十二楼', subtitle: 'N.12 · 远山', roof: false, flag: false },
];

const southTowerSpecs = [
  { t: 0.18, name: '南一楼', subtitle: 'S.1', roof: false, label: false },
  { t: 0.42, name: '南二楼', subtitle: 'S.2', roof: false, label: false },
  { t: 0.66, name: '南三楼', subtitle: 'S.3', roof: false, label: false },
  { t: 0.92, name: '南四楼', subtitle: 'S.4 · 南线尽头', roof: true, label: true, beacon: true },
];

function addMist(sceneRoot) {
  const rand = (() => {
    let a = 12345;
    return () => {
      a = (a * 16807) % 2147483647;
      return a / 2147483647;
    };
  })();

  const sheetDefs = [
    { y: 44, z: 40, w: 2500, d: 1250, color: 0xe0e8f0, ry: 0.1 },
    { y: 58, z: -300, w: 2800, d: 1500, color: 0xe8eef4, ry: 0 },
    { y: 86, z: -650, w: 3000, d: 1700, color: 0xe0e8f0, ry: 0 },
    { y: 112, z: -1080, w: 3300, d: 1600, color: 0xe8eef4, ry: 0 },
    { y: 142, z: -1520, w: 3600, d: 1500, color: 0xe0e8f0, ry: 0 },
  ];
  const sheetGeo = new THREE.PlaneGeometry(1, 1, 1, 1);
  sheetGeo.rotateX(-Math.PI / 2);
  const sheetMat = new THREE.MeshBasicMaterial({
    map: sharedTextures.mistMap,
    color: 0xffffff,
    transparent: true,
    opacity: 0.06,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
    toneMapped: true,
  });
  const sheetMesh = new THREE.InstancedMesh(sheetGeo, sheetMat, sheetDefs.length);
  sheetMesh.name = 'mist-sheets';
  sheetMesh.renderOrder = 2;
  sheetMesh.frustumCulled = false;
  const sheetData = [];
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  for (let i = 0; i < sheetDefs.length; i++) {
    const s = sheetDefs[i];
    dummy.position.set(0, s.y, s.z);
    dummy.rotation.set(0, s.ry, 0);
    dummy.scale.set(s.w, 1, s.d);
    dummy.updateMatrix();
    sheetMesh.setMatrixAt(i, dummy.matrix);
    sheetMesh.setColorAt(i, color.set(s.color));
    sheetData.push({ baseX: 0, x: 0, y: s.y, z: s.z, ry: s.ry, w: s.w, d: s.d, phase: i * 2.1 });
  }
  sheetMesh.instanceMatrix.needsUpdate = true;
  sheetMesh.instanceColor.needsUpdate = true;
  sceneRoot.add(sheetMesh);

  const puffGeo = new THREE.PlaneGeometry(1, 1);
  const puffMat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        map: { value: sharedTextures.mistMap },
        color: { value: new THREE.Color(0xe4ebf2) },
        opacity: { value: 0.38 },
      },
    ]),
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: true,
    toneMapped: true,
    vertexShader: `
      varying vec2 vUv;
      #include <fog_pars_vertex>
      void main() {
        vUv = uv;
        vec3 ipos = instanceMatrix[3].xyz;
        vec2 iscale = vec2(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz));
        vec4 mvPosition = modelViewMatrix * vec4(ipos, 1.0);
        mvPosition.xy += position.xy * iscale;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: `
      uniform sampler2D map;
      uniform vec3 color;
      uniform float opacity;
      varying vec2 vUv;
      #include <fog_pars_fragment>
      void main() {
        vec4 tex = texture2D(map, vUv);
        gl_FragColor = vec4(color * tex.rgb, tex.a * opacity);
        #include <fog_fragment>
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const puffMesh = new THREE.InstancedMesh(puffGeo, puffMat, 24);
  puffMesh.name = 'mist-puffs';
  puffMesh.renderOrder = 3;
  puffMesh.frustumCulled = false;
  const puffData = [];
  for (let i = 0; i < 14; i++) {
    const x = -1050 + rand() * 2100;
    const z = -300 - rand() * 1280;
    const y = 78 + rand() * 138;
    const sx = 420 + rand() * 560;
    const sy = 92 + rand() * 96;
    puffData.push({ baseX: x, x, y, z, sx, sy, ry: rand() * Math.PI, phase: i * 1.7 });
  }
  for (let i = 0; i < 5; i++) {
    const x = -650 + rand() * 1300;
    const z = 280 + rand() * 620;
    const y = 42 + rand() * 34;
    const sx = 260 + rand() * 220;
    const sy = 40 + rand() * 32;
    puffData.push({ baseX: x, x, y, z, sx, sy, ry: rand() * Math.PI, phase: (14 + i) * 2.3 });
  }
  for (let i = 0; i < puffData.length; i++) {
    const d = puffData[i];
    dummy.position.set(d.x, d.y, d.z);
    dummy.rotation.set(0, d.ry, 0);
    dummy.scale.set(d.sx, d.sy, d.sx);
    dummy.updateMatrix();
    puffMesh.setMatrixAt(i, dummy.matrix);
  }
  puffMesh.instanceMatrix.needsUpdate = true;
  sceneRoot.add(puffMesh);

  return { sheetMesh, puffMesh, sheetData, puffData };
}

function makeView(x, y, z, tx, ty, tz) {
  const safeY = Math.max(y, heightAt(x, z) + 18);
  return { p: [x, safeY, z], t: [tx, ty, tz] };
}

function ridgeView(tower, curve, side, back, lift, lookT) {
  const f = tower.frame;
  const x = tower.x + f.nx * side + f.tx * back;
  const z = tower.z + f.nz * side + f.tz * back;
  const p = curve.getPointAt(Math.max(0, Math.min(1, lookT)));
  return makeView(x, tower.walkTop + lift, z, p.x, heightAt(p.x, p.z) + 7, p.z);
}

export function buildBadaling() {
  const root = new THREE.Group();
  root.name = 'badaling-world';

  const terrain = createTerrain(mats.terrain, 2600, 280);
  root.add(terrain);

  const staticRoot = new THREE.Group();
  staticRoot.name = 'static-architecture';

  staticRoot.add(createDistantMountains(mats.farA, mats.farB));

  const mainWall = createWall(mainCurve, {
    name: 'north-wall',
    spacing: 2.3,
    startT: 0,
    endT: 1,
    breakRange: [0.337, 0.356],
    repairRanges: [[0.612, 0.628], [0.845, 0.858]],
  });
  const southWall = createWall(southCurve, {
    name: 'south-wall',
    spacing: 2.4,
    startT: 0,
    endT: 1,
    repairRanges: [[0.475, 0.492]],
  });
  staticRoot.add(mainWall.group);
  staticRoot.add(southWall.group);

  const labels = [];
  const northTowers = [];
  for (const spec of northTowerSpecs) {
    const tower = createTowerAt(mainCurve, spec.t, {
      name: spec.name,
      subtitle: spec.subtitle,
      roof: spec.roof,
      label: true,
      beacon: !!spec.beacon,
      flag: spec.flag !== false,
      scale: spec.t > 0.8 ? 1.03 : 1,
    });
    staticRoot.add(tower.group);
    labels.push(tower.sprite);
    northTowers.push(tower);
  }

  const southTowers = [];
  for (const spec of southTowerSpecs) {
    const tower = createTowerAt(southCurve, spec.t, {
      name: spec.name,
      subtitle: spec.subtitle,
      roof: spec.roof,
      label: spec.label,
      beacon: !!spec.beacon,
      flag: spec.flag !== false,
      scale: 0.94,
    });
    staticRoot.add(tower.group);
    if (tower.sprite) labels.push(tower.sprite);
    southTowers.push(tower);
  }

  const vegetation = createVegetation();
  staticRoot.add(vegetation.group);
  staticRoot.add(createDistantWalls());
  const allTowers = northTowers.concat(southTowers);
  staticRoot.add(createDetailStatics(allTowers));
  addBadalingRefinement(staticRoot, mainWall, southWall, allTowers);
  const finalPolish = addBadalingFinalPolish(staticRoot, mainWall, southWall, allTowers);

  const merged = mergeStaticGroup(staticRoot);
  merged.name = 'merged-static-scene';
  root.add(merged);

  for (const label of labels) {
    if (label) root.add(label);
  }
  const mists = addMist(root);
  const dynamics = createDetailDynamics(allTowers, mists);
  root.add(dynamics.group);
  const refinementLife = createBadalingRefinementLife(allTowers);
  root.add(refinementLife.group);
  const finalLife = createBadalingFinalLife(allTowers, finalPolish.braziers);
  root.add(finalLife.group);

  const towerByT = (list, t) => list.reduce((best, tw) => (Math.abs(tw.t - t) < Math.abs(best.t - t) ? tw : best), list[0]);
  const n1 = towerByT(northTowers, 0.062);
  const n4 = towerByT(northTowers, 0.268);
  const n8 = towerByT(northTowers, 0.522);
  const s4 = towerByT(southTowers, 0.92);

  const views = {
    overview: makeView(180, 145, 740, 40, 115, 560),
    north1: makeView(172, 134, 679, 112, 102, 747),
    north4: makeView(-45, 156, 368, -148, 130, 340),
    north8: makeView(257, 222, -232, 150, 194, -184),
    south4: makeView(785, 141, 393, 684, 117, 397),
    far: makeView(-830, 200, -540, -220, 70, -180),
  };

  const notes = {
    overview: ['八达岭长城', '自东侧山梁低处望向北线，城墙贴着脊线起伏，垛口、敌楼与岩壁层层相叠'],
    north1: ['北一楼', '贴近关城的第一座敌楼，砖石墙体沿陡脊抬升，垛口在午后阳光里投下长影'],
    north4: ['北四楼', '山脊转折处的空心敌楼，拱门、箭窗与雉堞在近处清晰可辨'],
    north8: ['北八楼 · 好汉坡', '北线最高敌楼，墙身攀上陡坡，敌楼与山岩一同压向天际'],
    south4: ['南四楼', '南线城墙沿侧梁下行，敌楼立于松林与秋色灌木之间'],
    far: ['远山', '多道蓝灰山脊层叠退远，长城穿过松林与岩壁，没入燕山余脉'],
  };

  return {
    group: root,
    terrain,
    mainWall,
    southWall,
    northTowers,
    southTowers,
    labels,
    mists,
    dynamics,
    update: (elapsed, dt) => {
      dynamics.update(elapsed, dt);
      refinementLife.update(elapsed, dt);
      finalLife.update(elapsed, dt);
    },
    views,
    notes,
    vegetation: vegetation.counts,
    heightAt,
  };
}
