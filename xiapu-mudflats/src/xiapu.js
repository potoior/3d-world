import * as THREE from 'three';
import { makeWaterMaterial } from './materials.js';
import { mergeStaticGroup } from './geometry.js';

const R = (() => { let a = 41; return () => ((a = (a * 1664525 + 1013904223) >>> 0) / 4294967296); })();
const MAT = new Map();
function mat(color, rough = 0.94, metal = 0) {
  const k = color + ':' + rough + ':' + metal;
  if (!MAT.has(k)) MAT.set(k, new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal }));
  return MAT.get(k);
}
function box(g, w, h, d, m, x, y, z, ry = 0) {
  const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.rotation.y = ry; o.castShadow = o.receiveShadow = true; g.add(o); return o;
}
function add(g, geo, m, x, y, z, ry = 0) {
  const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.y = ry; o.castShadow = o.receiveShadow = true; g.add(o); return o;
}
function inst(g, geo, m, count, place) {
  const im = new THREE.InstancedMesh(geo, m, count); const d = new THREE.Object3D();
  for (let i = 0; i < count; i++) { place(d, i); d.updateMatrix(); im.setMatrixAt(i, d.matrix); }
  im.instanceMatrix.needsUpdate = true; im.castShadow = true; im.receiveShadow = true; g.add(im); return im;
}
function roof(g, w, d, h, m, x, y, z) {
  const geo = new THREE.ConeGeometry(Math.max(w, d) * 0.72, h, 4); geo.rotateY(Math.PI / 4); geo.scale(w / Math.max(w, d), 1, d / Math.max(w, d));
  add(g, geo, m, x, y + h / 2, z);
}
function person(g, x, z, s = 1, hat = true, net = false) {
  const p = new THREE.Group();
  add(p, new THREE.CylinderGeometry(0.28, 0.42, 1.5, 7), mat(0x43505a), 0, 0.95, 0);
  add(p, new THREE.SphereGeometry(0.23, 7, 6), mat(0xb98262), 0, 1.82, 0);
  if (hat) add(p, new THREE.ConeGeometry(0.52, 0.28, 10), mat(0xc7ab72), 0, 2.0, 0);
  if (net) {
    const n = new THREE.Mesh(new THREE.ConeGeometry(0.9, 2.0, 7, 1, true), new THREE.MeshStandardMaterial({ color: 0x7c8c7c, side: THREE.DoubleSide, transparent: true, opacity: 0.55, roughness: 0.9 }));
    n.position.set(0.9, 0.9, 0); n.rotation.z = 0.7; p.add(n);
  }
  p.position.set(x, 0.2, z); p.scale.setScalar(s); p.rotation.y = R() * 6.28; g.add(p);
}
export function buildXiapuScene() {
  const group = new THREE.Group();
  const base = new THREE.Group();
  const dynamic = new THREE.Group();
  group.add(dynamic);
  const stats = { poles: 2200, boats: 8, birds: 24, reeds: 1800, fishermen: 16, houses: 9 };

  const waterMaterial = makeWaterMaterial();
  waterMaterial.uniforms.uDeep.value.set(0x335b63);
  waterMaterial.uniforms.uShallow.value.set(0x8fa99b);
  waterMaterial.uniforms.uSky.value.set(0xe6c6a0);

  add(base, new THREE.PlaneGeometry(1900, 1500), mat(0x6d5b46, 1), 0, -0.9, -100);
  const mudGeo = new THREE.PlaneGeometry(1700, 850, 72, 40); mudGeo.rotateX(-Math.PI / 2);
  const mp = mudGeo.attributes.position;
  for (let i = 0; i < mp.count; i++) {
    const x = mp.getX(i), z = mp.getZ(i);
    mp.setY(i, Math.sin(x * 0.018) * 0.16 + Math.cos(z * 0.028) * 0.12 + (z < -120 ? 0.1 : 0));
  }
  mudGeo.computeVertexNormals();
  const mud = new THREE.Mesh(mudGeo, new THREE.MeshStandardMaterial({ color: 0x8a7155, roughness: 1 }));
  mud.position.set(0, 0.08, 90); mud.receiveShadow = true; base.add(mud);

  const sea = new THREE.Mesh(new THREE.PlaneGeometry(1900, 950, 40, 24), waterMaterial);
  sea.rotation.x = -Math.PI / 2; sea.position.set(0, 0.16, -620); sea.renderOrder = 1; base.add(sea);

  const channelCurves = [
    [[-620, 280], [-380, 190], [-170, 210], [40, 110], [220, 70], [470, -40]],
    [[-560, 10], [-330, -20], [-80, 70], [160, -10], [400, -120], [650, -190]],
    [[-520, -150], [-300, -120], [-40, -190], [210, -210], [450, -300]],
    [[-680, 430], [-420, 380], [-190, 420], [60, 350]],
  ];
  const channelMat = new THREE.MeshStandardMaterial({ color: 0x536f72, roughness: 0.18, metalness: 0.12, transparent: true, opacity: 0.88 });
  channelCurves.forEach((pts) => {
    const curve = new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, 0.25, z)));
    const geo = new THREE.TubeGeometry(curve, 80, 13, 5, false); geo.scale(1, 0.04, 1);
    const m = new THREE.Mesh(geo, channelMat); m.receiveShadow = true; m.renderOrder = 2; base.add(m);
  });

  const poleGeo = new THREE.CylinderGeometry(0.055, 0.075, 1, 4);
  const poles = [];
  for (let r = 0; r < 30; r++) {
    for (let c = 0; c < 70; c++) {
      const x = -760 + c * 23 + Math.sin(r * 1.7) * 4;
      const z = 400 - r * 24 + Math.cos(c * 0.6) * 5;
      if (Math.abs(z - 110) < 26 && x > -180 && x < 260) continue;
      poles.push([x, z, 2.4 + R() * 3.6]);
    }
  }
  inst(dynamic, poleGeo, mat(0x3e3a30, 0.9), poles.length, (d, i) => {
    const [x, z, h] = poles[i]; d.position.set(x, 0.25 + h / 2, z); d.scale.set(1, h, 1); d.rotation.z = (R() - 0.5) * 0.06;
  });
  for (let i = 0; i < 14; i++) {
    box(base, 120, 0.06, 0.06, mat(0x4b4538), -610 + i * 23, 2.6, 330 - i * 18, 0);
  }

  const boats = [];
  const boatDefs = [[-320, 190, 0.5], [-130, 205, 1.2], [80, 110, -0.4], [300, 60, 2.1], [-260, -20, 0.9], [120, -20, -1.1], [420, -130, 0.2], [-30, 350, 2.8], [-470, 80, 1.6], [210, 300, -0.8], [520, 180, 2.4], [-100, -90, 0.1]];
  boatDefs.forEach(([x, z, rot], i) => {
    const b = new THREE.Group();
    add(b, new THREE.BoxGeometry(6.4, 0.55, 1.9), mat(0x5e422b), 0, 0.35, 0);
    add(b, new THREE.BoxGeometry(2.2, 0.75, 1.35), mat(0x3f2e20), 1.2, 0.9, 0);
    add(b, new THREE.ConeGeometry(0.85, 1.7, 4), mat(0x5e422b), -3.4, 0.45, 0).rotation.z = -Math.PI / 2;
    box(b, 0.1, 3.8, 0.1, mat(0x6b5338), 0.6, 2.4, 0);
    const sail = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 2.2), new THREE.MeshStandardMaterial({ color: i % 2 ? 0xd9c8a8 : 0x6b4a35, side: THREE.DoubleSide, roughness: 0.9 }));
    sail.position.set(0.6, 3.3, 0); b.add(sail);
    b.position.set(x, 0.25, z); b.rotation.y = rot; b.userData = { baseX: x, baseZ: z, phase: i * 0.8 }; group.add(b); boats.push(b);
  });

  const reedGeo = new THREE.ConeGeometry(0.16, 1, 4);
  inst(dynamic, reedGeo, mat(0x7d8552, 1), 1800, (d, i) => {
    const x = -720 + R() * 1400, z = 300 + R() * 160; d.position.set(x, 1.1 + R() * 1.2, z); d.scale.set(1, 2 + R() * 2, 1); d.rotation.z = (R() - 0.5) * 0.2;
  });

  for (let i = 0; i < 16; i++) person(group, -420 + R() * 760, 60 + R() * 260, 0.9 + R() * 0.35, true, i % 3 === 0);
  for (let i = 0; i < 9; i++) {
    const x = 430 + (i % 3) * 15, z = 250 + Math.floor(i / 3) * 14;
    box(base, 9, 5.2, 8, mat(0xd8d0bd), x, 2.8, z, 0);
    roof(base, 11, 10, 2.2, mat(0x4a4b42), x, 5.4, z);
    box(base, 1.4, 2.0, 0.2, mat(0x3a2e22), x, 3.0, z + 4.1);
  }
  add(base, new THREE.CylinderGeometry(1.1, 1.3, 9, 7), mat(0x7b6b55), 500, 4.5, 280);
  roof(base, 5, 5, 3, mat(0x3f443d), 500, 8.6, 280);

  const hillMat = mat(0x4f6850, 1);
  for (let i = 0; i < 12; i++) {
    const x = -900 + i * 160, h = 70 + R() * 110;
    add(base, new THREE.ConeGeometry(h * 0.7, h, 7), hillMat, x, h / 2 - 6, -760 - R() * 120, R() * 3);
  }

  const puddleGeo = new THREE.CircleGeometry(1, 18); puddleGeo.rotateX(-Math.PI / 2);
  inst(dynamic, puddleGeo, new THREE.MeshStandardMaterial({ color: 0x9fb3ac, roughness: 0.12, metalness: 0.2, transparent: true, opacity: 0.72 }), 46, (d, i) => {
    d.position.set(-520 + R() * 1050, 0.27, 130 + R() * 250);
    d.scale.set(3 + R() * 12, 1, 1.6 + R() * 5);
  });
  const egretGeo = new THREE.BufferGeometry();
  egretGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, -1.4, 0.3, 0, 0, 0.1, 0.35, 0, 0, 0, 1.4, 0.3, 0, 0, 0.1, 0.35], 3));
  egretGeo.computeVertexNormals();
  const egrets = inst(dynamic, egretGeo, new THREE.MeshStandardMaterial({ color: 0xf2eee2, side: THREE.DoubleSide, roughness: 0.8 }), 24, (d, i) => {
    d.position.set(-500 + R() * 1000, 8 + R() * 26, -100 + R() * 420); d.scale.setScalar(0.8 + R() * 0.6);
  });

  const life = {
    update(t, dt) {
      waterMaterial.uniforms.uTime.value = t;
      boats.forEach((b, i) => { const d = b.userData; b.position.x = d.baseX + Math.sin(t * 0.08 + d.phase) * 16; b.position.z = d.baseZ + Math.cos(t * 0.06 + d.phase) * 10; b.position.y = 0.25 + Math.sin(t * 1.2 + i) * 0.03; b.rotation.z = Math.sin(t * 0.7 + i) * 0.02; });
      const dummy = new THREE.Object3D();
      for (let i = 0; i < 24; i++) {
        const a = t * 0.07 + i * 0.7;
        dummy.position.set(Math.cos(a) * (90 + i * 11), 14 + Math.sin(t * 0.5 + i) * 5, 30 + Math.sin(a) * (60 + i * 6));
        dummy.rotation.set(0, -a + Math.PI / 2, 0); dummy.scale.setScalar(1); dummy.updateMatrix(); egrets.setMatrixAt(i, dummy.matrix);
      }
      egrets.instanceMatrix.needsUpdate = true;
    },
  };
  life.update(0, 0.016);
  group.add(mergeStaticGroup(base));
  return { group, waterMaterial, life, stats: { ...stats, poles: poles.length, islands: 0, cherryTrees: 0, reeds: 1800, birds: 24 } };
}
