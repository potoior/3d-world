import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mats } from './materials.js';

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

function tasselGeometry() {
  const parts = [];
  const knot = new THREE.SphereGeometry(0.045, 6, 5);
  knot.translate(0, -0.02, 0);
  parts.push(knot);
  const body = new THREE.ConeGeometry(0.07, 0.34, 6);
  body.rotateX(Math.PI);
  body.translate(0, -0.22, 0);
  parts.push(body);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const strand = new THREE.CylinderGeometry(0.012, 0.012, 0.34, 4);
    strand.translate(Math.cos(a) * 0.075, -0.43, Math.sin(a) * 0.075);
    parts.push(strand);
  }
  const loop = new THREE.TorusGeometry(0.035, 0.012, 4, 10);
  loop.translate(0, 0.06, 0);
  parts.push(loop);
  return mergeGeometries(parts, false);
}

function touristGeometry() {
  const parts = [];
  const legs = new THREE.BoxGeometry(0.14, 0.54, 0.16);
  legs.translate(-0.1, 0.27, 0);
  parts.push(legs);
  const legs2 = legs.clone();
  legs2.translate(0.2, 0, 0);
  parts.push(legs2);
  const torso = new THREE.BoxGeometry(0.42, 0.64, 0.26);
  torso.translate(0, 0.88, 0);
  parts.push(torso);
  const head = new THREE.SphereGeometry(0.16, 7, 6);
  head.translate(0, 1.36, 0);
  parts.push(head);
  const hat = new THREE.ConeGeometry(0.27, 0.15, 8);
  hat.translate(0, 1.52, 0);
  parts.push(hat);
  const bag = new THREE.BoxGeometry(0.28, 0.38, 0.16);
  bag.translate(0, 0.94, -0.2);
  parts.push(bag);
  return mergeGeometries(parts, false);
}

function parasolGeometry() {
  const parts = [];
  const pole = new THREE.CylinderGeometry(0.018, 0.018, 1.5, 4);
  pole.translate(0, 0.75, 0);
  parts.push(pole);
  const canopy = new THREE.ConeGeometry(0.52, 0.24, 10, 1, true);
  canopy.translate(0, 1.5, 0);
  parts.push(canopy);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const rib = new THREE.CylinderGeometry(0.008, 0.008, 0.52, 3);
    rib.rotateZ(Math.PI * 0.5);
    rib.translate(0, 0.26, 0);
    rib.rotateY(a);
    rib.translate(0, 1.48, 0);
    parts.push(rib);
  }
  return mergeGeometries(parts, false);
}

function bannerGeometry() {
  const g = new THREE.PlaneGeometry(0.58, 1.3, 1, 4);
  g.translate(0, -0.65, 0);
  return g;
}

const PATHS = [
  { pts: [[-6, -132], [-6, 124]], speed: 0.85 },
  { pts: [[6, 124], [6, -132]], speed: 0.92 },
  { pts: [[-18, 44], [18, 44], [18, 62], [-18, 62], [-18, 44]], speed: 0.55 },
  { pts: [[-4, 36], [-4, 70]], speed: 0.62 },
];

function pathData(path) {
  const segs = [];
  let total = 0;
  for (let i = 0; i < path.pts.length - 1; i++) {
    const a = path.pts[i];
    const b = path.pts[i + 1];
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const len = Math.hypot(dx, dz);
    segs.push({ ax: a[0], az: a[1], dx, dz, len, start: total });
    total += len;
  }
  return { segs, total };
}

function samplePath(path, dist) {
  let seg = path.segs[0];
  for (const s of path.segs) {
    if (dist >= s.start && dist <= s.start + s.len) {
      seg = s;
      break;
    }
  }
  const t = Math.min(1, Math.max(0, (dist - seg.start) / Math.max(0.001, seg.len)));
  return {
    x: seg.ax + seg.dx * t,
    z: seg.az + seg.dz * t,
    yaw: Math.atan2(seg.dx, seg.dz),
  };
}

export function createFinalLife({ lanternSpots = [], banners = [] } = {}) {
  const group = new THREE.Group();
  group.name = 'pingyao-final-life';
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  const rand = mulberry32(6811);

  const tassels = new THREE.InstancedMesh(tasselGeometry(), mats.gold, Math.max(1, lanternSpots.length));
  tassels.frustumCulled = false;
  tassels.castShadow = false;
  group.add(tassels);

  const bannerMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.9,
    side: THREE.DoubleSide,
  });
  const bannerMesh = new THREE.InstancedMesh(bannerGeometry(), bannerMat, Math.max(1, banners.length));
  bannerMesh.frustumCulled = false;
  bannerMesh.castShadow = false;
  const bannerPalette = [0xb04432, 0x344e63, 0x9b7438, 0x4f6048];
  for (let i = 0; i < banners.length; i++) {
    bannerMesh.setColorAt(i, color.setHex(bannerPalette[banners[i].color % bannerPalette.length]));
  }
  if (bannerMesh.instanceColor) bannerMesh.instanceColor.needsUpdate = true;
  group.add(bannerMesh);

  const pathList = PATHS.map((p) => ({ ...pathData(p), speed: p.speed }));
  const touristCount = 16;
  const tourists = new THREE.InstancedMesh(touristGeometry(), mats.visitor, touristCount);
  tourists.frustumCulled = false;
  tourists.castShadow = true;
  const parasols = new THREE.InstancedMesh(parasolGeometry(), mats.rust, touristCount);
  parasols.frustumCulled = false;
  parasols.castShadow = true;
  const touristData = [];
  const tints = [0x566b76, 0x764d44, 0x4d5d49, 0x806c51, 0x3f4a55, 0x8b5544];
  for (let i = 0; i < touristCount; i++) {
    const path = pathList[i % pathList.length];
    const data = {
      path,
      offset: (i / touristCount) * path.total + rand() * 8,
      speed: 0.62 + rand() * 0.22,
      scale: 0.92 + rand() * 0.12,
      phase: rand() * Math.PI * 2,
      parasol: i % 2 === 0,
      sway: 0.02 + rand() * 0.05,
    };
    touristData.push(data);
    tourists.setColorAt(i, color.setHex(tints[i % tints.length]));
  }
  if (tourists.instanceColor) tourists.instanceColor.needsUpdate = true;
  group.add(tourists, parasols);

  function update(time) {
    for (let i = 0; i < lanternSpots.length; i++) {
      const s = lanternSpots[i];
      const swing = Math.sin(time * 1.05 + s.phase) * 0.17;
      const ox = Math.sin(swing) * 0.52;
      const oy = -Math.cos(swing) * 0.52;
      dummy.position.set(s.x + ox, s.y + oy - 0.82, s.z);
      dummy.rotation.set(swing * 0.38, 0, swing);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      tassels.setMatrixAt(i, dummy.matrix);
    }
    tassels.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < banners.length; i++) {
      const b = banners[i];
      const sway = Math.sin(time * 1.42 + b.phase) * 0.12;
      const twist = Math.cos(time * 1.1 + b.phase) * 0.16;
      dummy.position.set(b.x, b.y, b.z);
      dummy.rotation.set(sway, b.yaw + twist, sway * 0.6);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      bannerMesh.setMatrixAt(i, dummy.matrix);
    }
    bannerMesh.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < touristData.length; i++) {
      const p = touristData[i];
      const dist = (time * p.speed + p.offset) % p.path.total;
      const pos = samplePath(p.path, dist);
      const bob = Math.abs(Math.sin(time * 4.2 + p.phase)) * 0.045;
      dummy.position.set(pos.x, 0.03 + bob, pos.z);
      dummy.rotation.set(0, pos.yaw, Math.sin(time * 2 + p.phase) * 0.012);
      dummy.scale.setScalar(p.scale);
      dummy.updateMatrix();
      tourists.setMatrixAt(i, dummy.matrix);
      if (p.parasol) {
        dummy.position.set(pos.x, 0.03 + bob + 1.82, pos.z);
        dummy.rotation.set(Math.sin(time * 1.5 + p.phase) * p.sway, pos.yaw, Math.cos(time * 1.3 + p.phase) * p.sway);
        dummy.scale.setScalar(p.scale);
        dummy.updateMatrix();
        parasols.setMatrixAt(i, dummy.matrix);
      } else {
        dummy.position.set(0, -200, 0);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.setScalar(0.001);
        dummy.updateMatrix();
        parasols.setMatrixAt(i, dummy.matrix);
      }
    }
    tourists.instanceMatrix.needsUpdate = true;
    parasols.instanceMatrix.needsUpdate = true;
  }

  update(0);
  return {
    group,
    update,
    counts: {
      tassels: lanternSpots.length,
      banners: banners.length,
      tourists: touristCount,
    },
  };
}
