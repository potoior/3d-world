import * as THREE from 'three';
import { mats } from './materials.js';
import { mulberry32, riverCenter, riverWidth, riverLeft, boardwalkX } from './liboTerrain.js';

const TREE_COLORS = [0x2f6b3c, 0x3c7d44, 0x4b8d4d, 0x2a5f37, 0x568f4b, 0x356f46, 0x629a52, 0x3f7240];
const ROCK_COLORS = [0x7b8577, 0x6d776c, 0x8a9080, 0x66756b, 0x919687, 0x71806f, 0x596b5f];

function makeInstanced(geometry, material, items, colors, cast = true, receive = true) {
  if (!items.length) return null;
  const mesh = new THREE.InstancedMesh(geometry, material, items.length);
  const dummy = new THREE.Object3D();
  const c = new THREE.Color();
  items.forEach((it, i) => {
    dummy.position.copy(it.p);
    dummy.rotation.set(it.rx || 0, it.ry || 0, it.rz || 0);
    dummy.scale.copy(it.s);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    if (colors) {
      c.setHex(colors[i % colors.length]);
      mesh.setColorAt(i, c);
    }
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  return mesh;
}

function insideRiver(x, z, margin = 0) {
  return Math.abs(x - riverCenter(z)) < riverWidth(z) * 0.5 + margin;
}

function nearBoardwalk(x, z, margin = 4) {
  return Math.abs(x - boardwalkX(z)) < margin && z > -256 && z < 226;
}

function nearVillage(x, z) {
  return x > 48 && x < 122 && z > 125 && z < 228;
}

function nearBridge(x, z) {
  return Math.abs(z - 40) < 12 && Math.abs(x) < 28;
}

function treeData(trunk, canopy, x, z, h, spread, seed, baseY = 0, blobCount = 3) {
  const rand = mulberry32(seed);
  trunk.push({
    p: new THREE.Vector3(x, baseY, z),
    s: new THREE.Vector3(0.85 + rand() * 0.5, h, 0.85 + rand() * 0.5),
    ry: rand() * 6.28,
  });
  for (let i = 0; i < blobCount; i++) {
    const off = spread * (0.18 + rand() * 0.5);
    const ang = (i / blobCount) * Math.PI * 2 + rand() * 0.9;
    const y = h * (0.62 + rand() * 0.28);
    canopy.push({
      p: new THREE.Vector3(x + Math.cos(ang) * off, baseY + y, z + Math.sin(ang) * off),
      s: new THREE.Vector3(spread * (0.72 + rand() * 0.38), spread * (0.54 + rand() * 0.28), spread * (0.72 + rand() * 0.38)),
      ry: rand() * 6.28,
    });
  }
}

export function addNature(root, colliders) {
  const trunkGeo = new THREE.CylinderGeometry(0.2, 0.34, 1, 6);
  trunkGeo.translate(0, 0.5, 0);
  const canopyGeo = new THREE.IcosahedronGeometry(1, 1);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.94 });
  const canopyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, flatShading: true });
  const trunk = [];
  const canopy = [];
  const rootFlare = [];
  const rand = mulberry32(1234);

  for (let i = 0; i < 430; i++) {
    let x = (rand() * 2 - 1) * 150;
    let z = -252 + rand() * 495;
    if (insideRiver(x, z, 4) || nearBoardwalk(x, z, 4.5) || nearVillage(x, z) || nearBridge(x, z)) {
      i -= 1;
      continue;
    }
    const h = 4.8 + rand() * 5.4;
    const spread = 1.7 + rand() * 2.1;
    treeData(trunk, canopy, x, z, h, spread, 5000 + i);
    if (h > 8.4) {
      colliders.circles.push({ x, z, r: 0.7 });
      colliders.names.push('古树');
    }
  }

  const waterTrees = [];
  for (let i = 0; i < 76; i++) {
    const z = -136 + rand() * 118;
    const x = riverCenter(z) + (rand() * 2 - 1) * riverWidth(z) * 0.34;
    if (Math.abs(z - 40) < 15) {
      i -= 1;
      continue;
    }
    const h = 5.2 + rand() * 4.6;
    const spread = 1.5 + rand() * 1.1;
    treeData(trunk, canopy, x, z, h, spread, 8000 + i, -0.22, 2);
    waterTrees.push([x, z]);
    rootFlare.push({
      p: new THREE.Vector3(x, -0.08, z),
      s: new THREE.Vector3(1.1 + rand() * 0.9, 0.26 + rand() * 0.16, 1.1 + rand() * 0.9),
      ry: rand() * 6.28,
    });
  }

  const giant = [
    [-19, 24, 13.5, 4.6, 44], [23, 18, 15.5, 5.2, 45], [-36, 62, 12.5, 4.0, 46],
    [-12, 120, 14.5, 4.7, 57], [20, 128, 13.2, 4.1, 55], [-42, -56, 12.8, 4.3, 56],
    [27, -92, 13.6, 4.5, 58],
  ];
  for (const [x, z, h, spread, seed] of giant) {
    treeData(trunk, canopy, x, z, h, spread, seed, 0, 4);
    colliders.circles.push({ x, z, r: 1.0 });
    colliders.names.push('古榕');
  }

  root.add(makeInstanced(trunkGeo, trunkMat, trunk, [0x5b4632, 0x4e3b2c, 0x66513b, 0x5b4430]));
  root.add(makeInstanced(canopyGeo, canopyMat, canopy, TREE_COLORS));
  if (rootFlare.length) {
    root.add(makeInstanced(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: 0x5b4732, roughness: 0.98 }), rootFlare, [0x544432, 0x5f4d37, 0x493b2c]));
  }

  const rockGeo = new THREE.DodecahedronGeometry(1, 0);
  const rockItems = [];
  for (let i = 0; i < 520; i++) {
    let x = (rand() * 2 - 1) * 150;
    let z = -252 + rand() * 492;
    const d = Math.abs(x - riverCenter(z)) - riverWidth(z) * 0.5;
    if (d > 22 || nearVillage(x, z) || nearBridge(x, z)) {
      i -= 1;
      continue;
    }
    const s = 0.35 + rand() * (d < 4 ? 1.8 : 2.6);
    rockItems.push({
      p: new THREE.Vector3(x, s * 0.18 - 0.02, z),
      s: new THREE.Vector3(s * (0.8 + rand() * 0.6), s * (0.5 + rand() * 0.4), s * (0.8 + rand() * 0.5)),
      ry: rand() * 6.28,
      rx: rand() * 0.35,
    });
  }
  for (const z of [-128, -116, -104, -92]) {
    for (let i = 0; i < 9; i++) {
      const x = riverCenter(z) + (rand() * 2 - 1) * riverWidth(z) * 0.36;
      const s = 0.3 + rand() * 0.9;
      rockItems.push({ p: new THREE.Vector3(x, 0.08, z + (rand() - 0.5) * 3.4), s: new THREE.Vector3(s, s * 0.65, s), ry: rand() * 6.28 });
    }
  }
  root.add(makeInstanced(rockGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.97 }), rockItems, ROCK_COLORS));
  const mossItems = rockItems.filter((_, i) => i % 3 === 0).map((r) => ({
    p: new THREE.Vector3(r.p.x, r.p.y + r.s.y * 0.42, r.p.z),
    s: new THREE.Vector3(r.s.x * 0.72, r.s.y * 0.3, r.s.z * 0.72),
    ry: r.ry,
  }));
  root.add(makeInstanced(rockGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.98 }), mossItems, [0x547044, 0x607a4c, 0x4b673f, 0x6a8152]));

  const tuftGeo = new THREE.ConeGeometry(0.5, 1, 5, 1);
  const tuftItems = [];
  for (let i = 0; i < 840; i++) {
    const x = (rand() * 2 - 1) * 145;
    const z = -250 + rand() * 488;
    if (Math.abs(x - riverCenter(z)) < riverWidth(z) * 0.5 + 1.4 || nearVillage(x, z) || nearBridge(x, z)) {
      i -= 1;
      continue;
    }
    const s = 0.28 + rand() * 0.62;
    tuftItems.push({ p: new THREE.Vector3(x, s * 0.45, z), s: new THREE.Vector3(s, s * (1 + rand()), s), ry: rand() * 6.28 });
  }
  root.add(makeInstanced(tuftGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, flatShading: true }), tuftItems, [0x4d7a3b, 0x5d8b43, 0x426d36, 0x6d9a4e, 0x79a65b]));

  const stalkGeo = new THREE.CylinderGeometry(0.055, 0.085, 1, 5);
  stalkGeo.translate(0, 0.5, 0);
  const leafGeo = new THREE.PlaneGeometry(0.2, 1.0);
  leafGeo.translate(0, 0.5, 0);
  const stalks = [];
  const leaves = [];
  const clusters = [[-24, -150], [14, -168], [-36, -208], [26, -226], [38, 96], [-45, 105], [50, 122], [96, 134], [-44, 172], [16, 178]];
  for (let c = 0; c < clusters.length; c++) {
    const [cx, cz] = clusters[c];
    for (let i = 0; i < 24; i++) {
      const x = cx + (rand() - 0.5) * 12;
      const z = cz + (rand() - 0.5) * 12;
      const h = 4 + rand() * 7;
      const lean = (rand() - 0.5) * 0.16;
      stalks.push({ p: new THREE.Vector3(x, 0, z), s: new THREE.Vector3(1, h, 1), rz: lean, rx: (rand() - 0.5) * 0.1 });
      for (let k = 0; k < 4; k++) {
        leaves.push({
          p: new THREE.Vector3(x + lean * h * 0.5, h * (0.52 + k * 0.12), z),
          s: new THREE.Vector3(0.8 + rand() * 0.7, 1.1 + rand() * 0.8, 0.8 + rand() * 0.7),
          ry: rand() * 6.28,
          rz: (rand() - 0.5) * 1.2,
        });
      }
    }
  }
  root.add(makeInstanced(stalkGeo, new THREE.MeshStandardMaterial({ color: 0x6f8b4d, roughness: 0.9 }), stalks));
  root.add(makeInstanced(leafGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, side: THREE.DoubleSide }), leaves, [0x4e843d, 0x5d9448, 0x417334, 0x6aa253]));
}
