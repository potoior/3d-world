import * as THREE from 'three';
import { mats } from './materials.js';
import { terrainHeight, WATER_Y } from './terrain.js';
import { addBox, addCylinder, mergedMesh } from './geometry.js';
import { hash } from './detailKit.js';

const dummy = new THREE.Object3D();

function makePetalGeometry() {
  const geo = new THREE.CircleGeometry(0.1, 6);
  geo.scale(1.15, 0.62, 1);
  return geo;
}

function makeBoat() {
  const group = new THREE.Group();
  const hull = [];
  const body = new THREE.CylinderGeometry(0.92, 1.18, 5.4, 9);
  body.rotateZ(Math.PI / 2);
  body.scale(1, 0.52, 0.86);
  body.translate(0, 0.42, 0);
  hull.push(body);
  const deck = new THREE.BoxGeometry(5.6, 0.16, 1.72);
  deck.translate(0, 0.84, 0);
  hull.push(deck);
  const prow = new THREE.ConeGeometry(0.72, 1.5, 4);
  prow.rotateZ(-Math.PI / 2);
  prow.rotateX(Math.PI / 4);
  prow.scale(1, 0.55, 0.9);
  prow.translate(3.32, 0.5, 0);
  hull.push(prow);
  const stern = new THREE.BoxGeometry(0.55, 0.62, 1.62);
  stern.translate(-2.72, 0.84, 0);
  hull.push(stern);
  const mast = new THREE.CylinderGeometry(0.05, 0.06, 2.1, 5);
  mast.translate(-1.4, 1.9, 0);
  hull.push(mast);
  const hm = mergedMesh(hull, mats.wood, true, true);
  if (hm) group.add(hm);
  const canopy = [];
  addBox(canopy, 2.15, 0.92, 1.5, -0.75, 1.38, 0);
  addBox(canopy, 2.35, 0.1, 1.65, -0.75, 1.88, 0);
  const cm = mergedMesh(canopy, mats.white, true, true);
  if (cm) group.add(cm);
  const rail = [];
  for (const sz of [-1, 1]) {
    addCylinder(rail, 0.025, 0.025, 2.8, 4, 0.7, 1.22, sz * 0.82);
    addCylinder(rail, 0.025, 0.025, 0.5, 4, 1.6, 0.95, sz * 0.82);
  }
  const rm = mergedMesh(rail, mats.gold, false, false);
  if (rm) group.add(rm);
  return group;
}

function makeWake(count) {
  const positions = new Float32Array((count + 1) * 2 * 3);
  const indices = [];
  for (let i = 0; i < count; i++) {
    const a = i * 2;
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setIndex(indices);
  const mat = mats.wake.clone();
  mat.opacity = 0.3;
  mat.side = THREE.DoubleSide;
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 3;
  return { mesh, geo, mat, positions, count };
}

export function createEastLakeFinalLife(detail) {
  const group = new THREE.Group();
  group.name = 'final-life';
  const foamMaterial = detail && detail.foamMaterial;

  const petalMat = mats.cherryLight.clone();
  petalMat.color.setHex(0xf6ccd8);
  petalMat.side = THREE.DoubleSide;
  const petalGeo = makePetalGeometry();
  const petalCount = 84;
  const petals = new THREE.InstancedMesh(petalGeo, petalMat, petalCount);
  petals.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  petals.frustumCulled = false;
  petals.castShadow = false;
  petals.name = 'final-petal-drift';
  group.add(petals);
  const petalSeeds = [];
  const waterCenters = [
    [-330, 148, 15], [-322, 180, 12], [-335, 212, 11],
    [112, 158, 12], [406, 146, 10], [-198, 306, 10],
  ];
  for (let i = 0; i < petalCount; i++) {
    if (i < 38) {
      const c = waterCenters[i % waterCenters.length];
      petalSeeds.push({
        mode: 0,
        cx: c[0] + (hash(41000, i) - 0.5) * 4,
        cz: c[1] + (hash(41001, i) - 0.5) * 4,
        r: c[2] * (0.35 + hash(41002, i) * 0.55),
        speed: 0.08 + hash(41003, i) * 0.09,
        phase: hash(41004, i) * 6.28,
        spin: hash(41005, i) * 6.28,
        scale: 0.7 + hash(41006, i) * 0.7,
      });
    } else {
      let gx = 0;
      let gz = 0;
      let gy = 0;
      for (let k = 0; k < 8; k++) {
        gx = -438 + hash(41100 + i, k) * 220;
        gz = 650 + hash(41200 + i, k) * 205;
        gy = terrainHeight(gx, gz);
        if (gy > 1.6 && gy < 70) break;
      }
      petalSeeds.push({
        mode: 1,
        cx: gx,
        cz: gz,
        gy: Math.max(gy, 1.6),
        r: 1.2 + hash(41007, i) * 2.2,
        speed: 0.035 + hash(41008, i) * 0.045,
        phase: hash(41009, i),
        spin: hash(41010, i) * 6.28,
        scale: 0.75 + hash(41011, i) * 0.8,
      });
    }
  }

  const boat = makeBoat();
  boat.name = 'final-tour-boat';
  boat.scale.setScalar(0.92);
  boat.position.set(-80, WATER_Y, -350);
  group.add(boat);

  const wakes = makeWake(26);
  wakes.mesh.name = 'final-boat-wake';
  group.add(wakes.mesh);
  const boatPath = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-80, 0, -350),
    new THREE.Vector3(120, 0, -280),
    new THREE.Vector3(300, 0, -150),
    new THREE.Vector3(380, 0, 40),
    new THREE.Vector3(330, 0, 210),
    new THREE.Vector3(100, 0, 350),
    new THREE.Vector3(-120, 0, 330),
    new THREE.Vector3(-280, 0, 200),
    new THREE.Vector3(-360, 0, 40),
    new THREE.Vector3(-300, 0, -250),
  ], true, 'centripetal', 0.5);
  const trail = [];
  const boatPoint = new THREE.Vector3();
  const boatTangent = new THREE.Vector3();
  let wakeReady = false;

  function update(elapsed) {
    if (foamMaterial) foamMaterial.opacity = 0.2 + (Math.sin(elapsed * 1.35) * 0.5 + 0.5) * 0.16;

    for (let i = 0; i < petalCount; i++) {
      const s = petalSeeds[i];
      if (s.mode === 0) {
        const a = elapsed * s.speed + s.phase;
        const x = s.cx + Math.cos(a) * s.r;
        const z = s.cz + Math.sin(a) * s.r;
        dummy.position.set(x, WATER_Y + 0.045 + Math.sin(elapsed * 1.6 + s.spin) * 0.02, z);
        dummy.rotation.set(-Math.PI / 2 + Math.sin(elapsed * 0.9 + s.spin) * 0.16, s.spin + elapsed * 0.12, 0);
      } else {
        const p = (elapsed * s.speed + s.phase) % 1;
        const x = s.cx + Math.sin(p * 9.1 + s.spin) * s.r;
        const z = s.cz + Math.cos(p * 7.3 + s.spin) * s.r * 0.8;
        const y = s.gy + 8.5 * (1 - p);
        dummy.position.set(x, y, z);
        dummy.rotation.set(elapsed * 1.7 + s.spin, elapsed * 2.3 + s.spin * 2, Math.sin(elapsed * 1.3 + s.spin) * 0.9);
      }
      dummy.scale.setScalar(s.scale);
      dummy.updateMatrix();
      petals.setMatrixAt(i, dummy.matrix);
    }
    petals.instanceMatrix.needsUpdate = true;

    const t = (elapsed * 0.0065) % 1;
    boatPath.getPointAt(t, boatPoint);
    boatPath.getTangentAt(t, boatTangent);
    boat.position.set(boatPoint.x, WATER_Y + 0.03 + Math.sin(elapsed * 1.4) * 0.035, boatPoint.z);
    boat.rotation.set(Math.sin(elapsed * 1.1) * 0.025, Math.atan2(-boatTangent.z, boatTangent.x), Math.sin(elapsed * 1.7) * 0.02);

    if (!wakeReady) {
      for (let i = 0; i < wakes.count + 1; i++) trail.push(new THREE.Vector3(boatPoint.x, 0, boatPoint.z));
      wakeReady = true;
    }
    trail.unshift(new THREE.Vector3(boatPoint.x, 0, boatPoint.z));
    if (trail.length > wakes.count + 1) trail.pop();

    for (let i = 0; i <= wakes.count; i++) {
      const p = trail[Math.min(i, trail.length - 1)];
      const q = trail[Math.min(i + 1, trail.length - 1)];
      let dx = p.x - q.x;
      let dz = p.z - q.z;
      const len = Math.hypot(dx, dz) || 1;
      dx /= len;
      dz /= len;
      const width = 0.35 + i * 0.18;
      const px = -dz;
      const pz = dx;
      const y = WATER_Y + 0.055;
      const a = (i / wakes.count);
      const o = i * 6;
      wakes.positions[o] = p.x + px * width;
      wakes.positions[o + 1] = y;
      wakes.positions[o + 2] = p.z + pz * width;
      wakes.positions[o + 3] = p.x - px * width;
      wakes.positions[o + 4] = y;
      wakes.positions[o + 5] = p.z - pz * width;
    }
    wakes.geo.attributes.position.needsUpdate = true;
  }

  return { group, update };
}
