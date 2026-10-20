import * as THREE from 'three';
import { mats, sharedTextures } from './materials.js';
import { GROUND, WALL_HEIGHT, FORTRESS } from './fortress.js';
import { heightAt } from './terrain.js';
import { makeRockGeometry, makeGrassGeometry } from './models.js';

export const FLAGS = [
  { x: 84, z: 44, y: GROUND + WALL_HEIGHT + 0.2, yaw: -0.4 },
  { x: 84, z: -44, y: GROUND + WALL_HEIGHT + 0.2, yaw: 0.4 },
  { x: -84, z: 44, y: GROUND + WALL_HEIGHT + 0.2, yaw: -2.7 },
  { x: -84, z: -44, y: GROUND + WALL_HEIGHT + 0.2, yaw: 2.7 },
  { x: 40, z: 58, y: GROUND + WALL_HEIGHT + 0.2, yaw: 1.2 },
  { x: -40, z: 58, y: GROUND + WALL_HEIGHT + 0.2, yaw: 1.9 },
  { x: 42, z: -58, y: GROUND + WALL_HEIGHT + 0.2, yaw: -1.2 },
  { x: 118, z: 12, y: GROUND + 8.0, yaw: -0.2 },
];

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

export function createDecor(staticRoot) {
  const rand = mulberry32(7411);
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  const rockGeo = makeRockGeometry();
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x9a8162, roughness: 0.99, flatShading: true });
  const rocks = new THREE.InstancedMesh(rockGeo, rockMat, 110);
  rocks.name = 'gobi-rocks';
  for (let i = 0; i < 110; i++) {
    let x = 0;
    let z = 0;
    do {
      const angle = rand() * Math.PI * 2;
      const radius = 100 + rand() * 380;
      x = Math.cos(angle) * radius;
      z = Math.sin(angle) * radius;
    } while (Math.abs(x) < 136 && Math.abs(z) < 84);
    const s = 0.6 + rand() * 3.0;
    dummy.position.set(x, heightAt(x, z) + s * 0.23, z);
    dummy.rotation.set(rand() * 0.4, rand() * Math.PI, rand() * 0.35);
    dummy.scale.set(s, s * (0.55 + rand() * 0.5), s * (0.7 + rand() * 0.4));
    dummy.updateMatrix();
    rocks.setMatrixAt(i, dummy.matrix);
    color.setHSL(0.09, 0.18, 0.32 + rand() * 0.16);
    rocks.setColorAt(i, color);
  }
  rocks.instanceMatrix.needsUpdate = true;
  rocks.instanceColor.needsUpdate = true;
  rocks.castShadow = true;
  rocks.receiveShadow = true;
  staticRoot.add(rocks);

  const grassGeo = makeGrassGeometry();
  const grass = new THREE.InstancedMesh(grassGeo, mats.dryGrass, 560);
  grass.name = 'dry-grass';
  for (let i = 0; i < 560; i++) {
    let x = 0;
    let z = 0;
    do {
      const angle = rand() * Math.PI * 2;
      const radius = 95 + rand() * 310;
      x = Math.cos(angle) * radius;
      z = Math.sin(angle) * radius;
    } while (Math.abs(x) < 132 && Math.abs(z) < 80);
    const s = 0.55 + rand() * 1.35;
    dummy.position.set(x, heightAt(x, z), z);
    dummy.rotation.set(0, rand() * Math.PI * 2, (rand() - 0.5) * 0.2);
    dummy.scale.set(s, s * (0.7 + rand() * 0.7), s);
    dummy.updateMatrix();
    grass.setMatrixAt(i, dummy.matrix);
    color.setHSL(0.11 + rand() * 0.03, 0.22 + rand() * 0.14, 0.4 + rand() * 0.16);
    grass.setColorAt(i, color);
  }
  grass.instanceMatrix.needsUpdate = true;
  grass.instanceColor.needsUpdate = true;
  staticRoot.add(grass);

  const signGroup = new THREE.Group();
  signGroup.name = 'pass-signs';
  const addSign = (x, z, yaw) => {
    const g = new THREE.Group();
    g.position.set(x, heightAt(x, z), z);
    g.rotation.y = yaw;
    const board = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 2.2), mats.sign);
    board.position.y = 2.9;
    board.castShadow = true;
    g.add(board);
    const back = new THREE.Mesh(new THREE.BoxGeometry(4.5, 2.3, 0.16), mats.wood);
    back.position.set(0, 2.9, -0.1);
    back.castShadow = true;
    g.add(back);
    for (const sx of [-1.5, 1.5]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 3.2, 6), mats.wood);
      post.position.set(sx, 1.6, -0.18);
      post.castShadow = true;
      g.add(post);
    }
    signGroup.add(g);
  };
  addSign(137, 22, Math.PI / 2);
  addSign(112, -26, Math.PI / 2);
  staticRoot.add(signGroup);

  for (const flag of FLAGS) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 9.4, 6), mats.iron);
    pole.position.set(flag.x, flag.y + 4.7, flag.z);
    pole.castShadow = true;
    staticRoot.add(pole);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 5), mats.gold);
    ball.position.set(flag.x, flag.y + 9.45, flag.z);
    staticRoot.add(ball);
  }

  const gateFlag = new THREE.Mesh(new THREE.BoxGeometry(13, 0.4, 0.4), mats.wood);
  gateFlag.position.set(FORTRESS.W + 14, GROUND + WALL_HEIGHT + 7.8, 0);
  staticRoot.add(gateFlag);
}
