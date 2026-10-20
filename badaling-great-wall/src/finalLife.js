import * as THREE from 'three';
import { mats, sharedTextures } from './materials.js';
import { heightAt } from './terrain.js';

const dummy = new THREE.Object3D();
const tint = new THREE.Color();

function towerWorld(tower, lx, ly, lz) {
  const c = Math.cos(tower.yaw);
  const s = Math.sin(tower.yaw);
  return new THREE.Vector3(
    tower.x + lx * c + lz * s,
    tower.sizes.baseBottom + ly,
    tower.z - lx * s + lz * c
  );
}

function makeLeafGeometry() {
  const geo = new THREE.PlaneGeometry(0.24, 0.15, 1, 1);
  geo.translate(0, 0, 0);
  return geo;
}

function makePennantGeometry() {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute([
    -0.16, 0, 0,
    0.16, 0, 0,
    0, -0.44, 0,
  ], 3));
  geo.computeVertexNormals();
  return geo;
}

function addRodMesh(group, a, b, radius, material) {
  const dir = b.clone().sub(a);
  const len = dir.length();
  if (len < 0.02) return;
  const geo = new THREE.CylinderGeometry(radius, radius, len, 5);
  geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()));
  geo.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = false;
  group.add(mesh);
}

export function createBadalingFinalLife(towers, brazierAnchors) {
  const group = new THREE.Group();
  group.name = 'badaling-final-life';

  const anchors = towers.filter((t) => t.name === '北八楼' || t.name === '北四楼' || t.name === '南四楼');
  const leafGeo = makeLeafGeometry();
  const leafMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.94,
    side: THREE.DoubleSide,
  });
  const leafCount = 66;
  const leaves = new THREE.InstancedMesh(leafGeo, leafMat, leafCount);
  leaves.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  leaves.frustumCulled = false;
  leaves.castShadow = false;
  leaves.name = 'final-autumn-leaves';
  group.add(leaves);
  const leafSeeds = [];
  for (let i = 0; i < leafCount; i++) {
    const base = anchors[i % anchors.length] || towers[0];
    const cx = base.x + (Math.sin(i * 2.17) * 0.5) * 54;
    const cz = base.z + (Math.cos(i * 1.73) * 0.5) * 46;
    const ground = heightAt(cx, cz);
    const top = Math.max(ground + 7, base.walkTop + 7 + (i % 9) * 2.4);
    leafSeeds.push({
      cx,
      cz,
      ground: Math.max(ground, 2),
      top,
      speed: 0.035 + (i % 7) * 0.006,
      phase: (i / leafCount + (i % 5) * 0.11) % 1,
      sway: 1.2 + (i % 5) * 0.55,
      spin: i * 1.37,
      scale: 0.8 + (i % 4) * 0.16,
    });
    tint.setHSL(0.07 + (i % 5) * 0.012, 0.56, 0.36 + (i % 4) * 0.05);
    leaves.setColorAt(i, tint);
  }
  if (leaves.instanceColor) leaves.instanceColor.needsUpdate = true;

  const brazierList = [];
  for (const a of brazierAnchors || []) brazierList.push(a);
  for (const t of towers) {
    if (t.beaconWorld) brazierList.push(new THREE.Vector3(t.beaconWorld.x, t.beaconWorld.y + 0.2, t.beaconWorld.z));
  }
  const emberCount = Math.max(24, brazierList.length * 9);
  const emberPos = new Float32Array(emberCount * 3);
  const emberGeo = new THREE.BufferGeometry();
  emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPos, 3));
  const emberMat = new THREE.PointsMaterial({
    map: sharedTextures.mistMap,
    color: 0xff9b4e,
    size: 1.05,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });
  const embers = new THREE.Points(emberGeo, emberMat);
  embers.frustumCulled = false;
  embers.renderOrder = 4;
  embers.name = 'final-brazier-embers';
  group.add(embers);
  const emberSeeds = [];
  for (let i = 0; i < emberCount; i++) {
    const base = brazierList[i % brazierList.length];
    emberSeeds.push({
      x: base ? base.x : 0,
      y: base ? base.y : 0,
      z: base ? base.z : 0,
      phase: (i / emberCount + (i % 3) * 0.16) % 1,
      drift: Math.sin(i * 2.31) * 0.45,
      speed: 0.22 + (i % 5) * 0.035,
    });
  }

  const n8 = towers.find((t) => t.name === '北八楼') || towers[0];
  const { W, D, capY } = n8.sizes;
  const ropeA = towerWorld(n8, -W / 2 - 0.25, capY + 3.5, -D / 2 - 0.4);
  const ropeB = towerWorld(n8, W / 2 + 0.25, capY + 3.5, -D / 2 - 0.4);
  addRodMesh(group, ropeA, ropeB, 0.018, mats.iron);
  const pennantGeo = makePennantGeometry();
  const pennantMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.9,
    side: THREE.DoubleSide,
  });
  const pennantCount = 11;
  const pennants = new THREE.InstancedMesh(pennantGeo, pennantMat, pennantCount);
  pennants.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  pennants.frustumCulled = false;
  pennants.castShadow = false;
  pennants.name = 'final-pennant-line';
  group.add(pennants);
  const ropeDir = ropeB.clone().sub(ropeA);
  const ropeYaw = Math.atan2(ropeDir.x, ropeDir.z);
  const pennantSeeds = [];
  for (let i = 0; i < pennantCount; i++) {
    const t = (i + 0.5) / pennantCount;
    pennantSeeds.push({
      x: ropeA.x + ropeDir.x * t,
      y: ropeA.y + ropeDir.y * t,
      z: ropeA.z + ropeDir.z * t,
      phase: i * 0.83,
      yaw: ropeYaw,
      scale: 0.8 + (i % 3) * 0.12,
    });
    tint.setHSL(0.015 + (i % 4) * 0.01, 0.62, 0.33 + (i % 3) * 0.04);
    pennants.setColorAt(i, tint);
  }
  if (pennants.instanceColor) pennants.instanceColor.needsUpdate = true;

  function update(elapsed) {
    for (let i = 0; i < leafCount; i++) {
      const s = leafSeeds[i];
      const p = (elapsed * s.speed + s.phase) % 1;
      const x = s.cx + Math.sin(p * 8.3 + s.spin) * s.sway;
      const z = s.cz + Math.cos(p * 6.1 + s.spin * 1.3) * s.sway * 0.7;
      const y = s.ground + (s.top - s.ground) * (1 - p);
      dummy.position.set(x, y, z);
      dummy.rotation.set(elapsed * 1.9 + s.spin, elapsed * 2.4 + s.spin * 2, Math.sin(elapsed * 1.4 + s.spin) * 1.1);
      dummy.scale.setScalar(s.scale);
      dummy.updateMatrix();
      leaves.setMatrixAt(i, dummy.matrix);
    }
    leaves.instanceMatrix.needsUpdate = true;

    const pos = emberGeo.attributes.position;
    for (let i = 0; i < emberCount; i++) {
      const s = emberSeeds[i];
      const life = (s.phase + elapsed * s.speed) % 1;
      pos.setXYZ(
        i,
        s.x + s.drift * life * 1.8 + Math.sin(elapsed * 2.1 + i) * 0.2 * life,
        s.y + life * 3.4,
        s.z + Math.cos(elapsed * 1.7 + i * 0.7) * 0.24 * life
      );
    }
    pos.needsUpdate = true;
    emberMat.opacity = 0.56 + Math.sin(elapsed * 3.2) * 0.1;

    for (let i = 0; i < pennantCount; i++) {
      const s = pennantSeeds[i];
      const sway = Math.sin(elapsed * 2.8 + s.phase) * 0.32 + Math.sin(elapsed * 1.7 + s.phase * 0.6) * 0.12;
      dummy.position.set(s.x, s.y, s.z);
      dummy.rotation.set(0, s.yaw, sway);
      dummy.scale.setScalar(s.scale);
      dummy.updateMatrix();
      pennants.setMatrixAt(i, dummy.matrix);
    }
    pennants.instanceMatrix.needsUpdate = true;
  }

  return { group, update };
}
