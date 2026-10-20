import * as THREE from 'three';
import { makeWaterMaterial } from './materials.js';

const LAKE = [
  [-330, -60], [-300, -190], [-160, -265], [40, -270], [230, -215],
  [330, -95], [315, 45], [170, 120], [-40, 135], [-235, 105], [-325, 45],
];
const R = (() => {
  let a = 7;
  return () => ((a = (a * 1664525 + 1013904223) >>> 0) / 4294967296);
})();

function mat(color, rough = 0.95, metal = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
}

function addMesh(group, geo, material, x, y, z, ry = 0, shadow = true) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.rotation.y = ry;
  m.castShadow = shadow;
  m.receiveShadow = true;
  group.add(m);
  return m;
}

function addInstanced(group, geo, material, count, place) {
  const im = new THREE.InstancedMesh(geo, material, count);
  const d = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    place(d, i);
    d.updateMatrix();
    im.setMatrixAt(i, d.matrix);
  }
  im.instanceMatrix.needsUpdate = true;
  im.castShadow = true;
  im.receiveShadow = true;
  group.add(im);
  return im;
}

function lowPolyTree(group, x, z, scale, material) {
  const trunk = new THREE.CylinderGeometry(0.18 * scale, 0.3 * scale, 3.4 * scale, 5);
  const crown = new THREE.ConeGeometry(2.2 * scale, 8 * scale, 6);
  addMesh(group, trunk, mat(0x5b432a), x, 1.7 * scale, z);
  addMesh(group, crown, material, x, 6.2 * scale, z);
}

export function buildQinghaiScene() {
  const group = new THREE.Group();
  const stats = { yaks: 4, horses: 2, sheep: 12, gulls: 16, flags: 32, rapeseed: 900 };
  const waterMaterial = makeWaterMaterial();
  waterMaterial.uniforms.uDeep.value.set(0x145f7a);
  waterMaterial.uniforms.uShallow.value.set(0x4aa5b8);
  waterMaterial.uniforms.uSky.value.set(0xcfe4ee);

  const groundGeo = new THREE.PlaneGeometry(920, 780, 80, 64);
  groundGeo.rotateX(-Math.PI / 2);
  const gp = groundGeo.attributes.position;
  for (let i = 0; i < gp.count; i++) {
    const x = gp.getX(i);
    const z = gp.getZ(i);
    const roll = Math.sin(x * 0.014) * 0.18 + Math.cos(z * 0.018) * 0.14;
    gp.setY(i, -0.22 + roll - Math.max(0, (-z - 210) / 200) * 1.2);
  }
  groundGeo.computeVertexNormals();
  const ground = new THREE.Mesh(groundGeo, mat(0x8b8d72, 1));
  ground.receiveShadow = true;
  group.add(ground);

  const shape = new THREE.Shape();
  LAKE.forEach(([x, z], i) => (i ? shape.lineTo(x, -z) : shape.moveTo(x, -z)));
  shape.closePath();
  const lakeGeo = new THREE.ShapeGeometry(shape, 24);
  lakeGeo.rotateX(-Math.PI / 2);
  const lake = new THREE.Mesh(lakeGeo, waterMaterial);
  lake.position.y = 0.12;
  lake.renderOrder = 1;
  group.add(lake);

  const rockMat = mat(0x747a70, 0.98);
  const bank = addInstanced(group, new THREE.DodecahedronGeometry(1.2, 0), rockMat, 240, (d, i) => {
    const seg = Math.floor(R() * LAKE.length);
    const a = LAKE[seg];
    const b = LAKE[(seg + 1) % LAKE.length];
    const t = R();
    d.position.set(a[0] + (b[0] - a[0]) * t + (R() - 0.5) * 8, 0.05, a[1] + (b[1] - a[1]) * t + (R() - 0.5) * 8);
    d.scale.set(1.4 + R() * 1.4, 0.35 + R() * 0.4, 0.9 + R() * 1.1);
    d.rotation.set(0, R() * Math.PI, 0);
  });
  bank.receiveShadow = true;

  const mountain = mat(0x70766d, 1);
  const snow = mat(0xe8edf0, 0.7);
  [[-380, -370, 150], [-250, -395, 210], [-100, -382, 180], [40, -410, 245], [190, -388, 200], [330, -365, 160]].forEach(([x, z, h]) => {
    addMesh(group, new THREE.ConeGeometry(h * 0.92, h, 7), mountain, x, h * 0.5 - 3, z, R() * 3);
    addMesh(group, new THREE.ConeGeometry(h * 0.3, h * 0.34, 7), snow, x, h * 0.86, z, R() * 3);
  });

  const rapeseedMat = mat(0x7d9656, 0.9);
  addInstanced(group, new THREE.IcosahedronGeometry(0.42, 0), rapeseedMat, 900, (d, i) => {
    const band = i < 450 ? -1 : 1;
    const x = band < 0 ? -260 + R() * 210 : 30 + R() * 250;
    const z = 95 + R() * 115;
    d.position.set(x, 0.38 + R() * 0.35, z);
    d.scale.set(0.8 + R() * 0.8, 0.7 + R() * 0.7, 0.8 + R() * 0.8);
  });

  const flagGeo = new THREE.PlaneGeometry(1.0, 0.62);
  const flagMat = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.9 });
  const flagColors = [0x2f5fa8, 0xd9c75a, 0xb63a30, 0x3d8a55, 0xe8e1cf];
  const flags = addInstanced(group, flagGeo, flagMat, 32, (d, i) => {
    d.position.set(-70 + (i % 16) * 9, 5.2 + Math.sin(i * 0.9) * 0.7, 95 + Math.floor(i / 16) * 24);
    d.rotation.y = -0.4;
  });
  for (let i = 0; i < 32; i++) flags.setColorAt(i, new THREE.Color(flagColors[i % flagColors.length]));
  flags.instanceColor.needsUpdate = true;
  for (let i = 0; i < 2; i++) {
    addMesh(group, new THREE.CylinderGeometry(0.12, 0.18, 12, 6), mat(0x5b432a), -70 + i * 144, 6, 95, 0);
  }

  const plankMat = mat(0x8b6e48, 0.92);
  addInstanced(group, new THREE.BoxGeometry(2.4, 0.16, 1.2), plankMat, 48, (d, i) => {
    d.position.set(150, 0.55, 105 + i * 2.4);
  });
  addMesh(group, new THREE.BoxGeometry(0.12, 1.05, 48), mat(0x6c5336), 151.2, 1.05, 162);
  addMesh(group, new THREE.BoxGeometry(0.12, 1.05, 48), mat(0x6c5336), 148.8, 1.05, 162);
  addInstanced(group, new THREE.BoxGeometry(0.16, 1.0, 0.16), mat(0x6c5336), 24, (d, i) => {
    d.position.set(i % 2 ? 151.2 : 148.8, 1.0, 108 + Math.floor(i / 2) * 4);
  });

  const yaks = [];
  const yakMat = mat(0x2a2420, 0.98);
  for (let i = 0; i < 4; i++) {
    const y = new THREE.Group();
    addMesh(y, new THREE.BoxGeometry(2.4, 1.15, 1.25), yakMat, 0, 1.25, 0);
    addMesh(y, new THREE.BoxGeometry(1.7, 0.55, 1.15), mat(0x171310), 0, 0.65, 0);
    addMesh(y, new THREE.BoxGeometry(0.85, 0.75, 0.72), mat(0x372d26), 0, 1.2, 1.45);
    addMesh(y, new THREE.ConeGeometry(0.08, 0.7, 6), mat(0xd7cbb0), -0.32, 1.75, 1.5, 0, false).rotation.z = -0.9;
    addMesh(y, new THREE.ConeGeometry(0.08, 0.7, 6), mat(0xd7cbb0), 0.32, 1.75, 1.5, 0, false).rotation.z = 0.9;
    y.position.set(-210 + i * 22 + R() * 8, 0, 115 + R() * 40);
    y.rotation.y = R() * Math.PI;
    group.add(y);
    yaks.push(y);
  }

  const horses = [];
  const horseMat = mat(0x6b482d, 0.9);
  for (let i = 0; i < 2; i++) {
    const h = new THREE.Group();
    addMesh(h, new THREE.BoxGeometry(2.1, 0.95, 0.95), horseMat, 0, 1.45, 0);
    addMesh(h, new THREE.BoxGeometry(0.5, 1.15, 0.52), mat(0x4d3320), 0, 2.0, 0.95, 0, false).rotation.x = -0.3;
    addMesh(h, new THREE.BoxGeometry(0.42, 0.95, 0.5), mat(0x3b2618), 0, 2.35, 1.28);
    for (const x of [-0.65, 0.65]) for (const z of [-0.34, 0.36]) {
      addMesh(h, new THREE.CylinderGeometry(0.09, 0.11, 1.35, 6), mat(0x3a281a), x, 0.68, z, 0, false);
    }
    h.position.set(-140 + i * 18, 0, 155 + R() * 18);
    h.rotation.y = R() * Math.PI;
    group.add(h);
    horses.push(h);
  }

  addInstanced(group, new THREE.SphereGeometry(0.55, 8, 6), mat(0xd8d2c4, 1), 12, (d, i) => {
    d.position.set(35 + R() * 60, 0.55, 145 + R() * 38);
    d.scale.set(1.2, 0.8, 0.9);
  });

  const gullGeo = new THREE.BufferGeometry();
  gullGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, -1.2, 0.25, 0, 0, 0.1, 0.35, 0, 0, 0, 1.2, 0.25, 0, 0, 0.1, 0.35], 3));
  gullGeo.computeVertexNormals();
  const gulls = addInstanced(group, gullGeo, new THREE.MeshStandardMaterial({ color: 0xf3f0e8, side: THREE.DoubleSide, roughness: 0.8 }), 16, (d, i) => {
    d.position.set(-120 + R() * 280, 18 + R() * 18, -80 + R() * 160);
    d.scale.setScalar(0.8 + R() * 0.7);
  });

  const visitors = [];
  const visitorMat = new THREE.MeshStandardMaterial({ vertexColors: false, color: 0x8a4a34, roughness: 0.9 });
  for (let i = 0; i < 3; i++) {
    const v = new THREE.Group();
    addMesh(v, new THREE.CylinderGeometry(0.24, 0.34, 1.2, 8), visitorMat, 0, 1.0, 0);
    addMesh(v, new THREE.SphereGeometry(0.23, 10, 8), mat(0xc79c78), 0, 1.78, 0);
    addMesh(v, new THREE.BoxGeometry(0.34, 0.55, 0.28), mat(0x5c2d26), 0, 0.45, 0, 0, false);
    v.position.set(138 + R() * 24, 0, 120 + R() * 35);
    v.rotation.y = R() * Math.PI;
    group.add(v);
    visitors.push(v);
  }

  const treeMat = mat(0x3f5c35, 1);
  const treeSpots = [];
  for (let i = 0; i < 18; i++) treeSpots.push([-300 + R() * 150, 135 + R() * 80, 0.8 + R() * 0.8]);
  for (let i = 0; i < 12; i++) treeSpots.push([220 + R() * 80, -80 + R() * 150, 0.7 + R() * 0.7]);
  addInstanced(group, new THREE.CylinderGeometry(0.18, 0.3, 3.4, 5), mat(0x5b432a), treeSpots.length, (d, i) => {
    const [x, z, s] = treeSpots[i];
    d.position.set(x, 1.7 * s, z);
    d.scale.setScalar(s);
  });
  addInstanced(group, new THREE.ConeGeometry(2.2, 8, 6), treeMat, treeSpots.length, (d, i) => {
    const [x, z, s] = treeSpots[i];
    d.position.set(x, 6.2 * s, z);
    d.scale.setScalar(s);
  });

  const dummy = new THREE.Object3D();
  const flagBase = [];
  for (let i = 0; i < 32; i++) flagBase.push({ x: -70 + (i % 16) * 9, y: 5.2 + Math.sin(i * 0.9) * 0.7, z: 95 + Math.floor(i / 16) * 24, p: R() * 6 });
  const gullBase = [];
  for (let i = 0; i < 16; i++) gullBase.push({ r: 40 + R() * 90, y: 18 + R() * 18, c: R() * 6, s: 0.1 + R() * 0.15 });

  const life = {
    update(time) {
      waterMaterial.uniforms.uTime.value = time;
      flagBase.forEach((f, i) => {
        dummy.position.set(f.x, f.y + Math.sin(time * 1.4 + f.p) * 0.12, f.z);
        dummy.rotation.set(0, -0.4 + Math.sin(time * 2.0 + f.p) * 0.22, Math.sin(time * 2.6 + f.p) * 0.1);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        flags.setMatrixAt(i, dummy.matrix);
      });
      flags.instanceMatrix.needsUpdate = true;
      gullBase.forEach((g, i) => {
        const a = time * g.s + g.c;
        dummy.position.set(Math.cos(a) * g.r, g.y + Math.sin(time * 0.8 + g.c) * 2, -30 + Math.sin(a) * g.r * 0.6);
        dummy.rotation.set(0, -a + Math.PI / 2, 0);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        gulls.setMatrixAt(i, dummy.matrix);
      });
      gulls.instanceMatrix.needsUpdate = true;
      yaks.forEach((y, i) => { y.position.y = Math.sin(time * 0.8 + i) * 0.035; });
      horses.forEach((h, i) => { h.position.y = Math.sin(time * 0.7 + i * 1.7) * 0.03; });
    },
  };

  return { group, waterMaterial, life, stats, lake: LAKE };
}
