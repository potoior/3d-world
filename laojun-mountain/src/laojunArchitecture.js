import * as THREE from 'three';
import { heightAt, platforms } from './terrain.js';
import {
  Bucket, Local, matrixFor, addBox, addCyl, boxTo, cylTo, segGeo, buildMaterials,
  addHall, addPavilion, addOctPavilion, addGate, addBridge, addPlaque, addLabel,
} from './laojunParts.js';

function boardwalk(L, M, points, width = 2.3) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(p[0], p[1], p[2])), false, 'centripetal', 0.5);
  const n = 110;
  const deck = [];
  const posts = [];
  const rails = [];
  const braces = [];
  for (let i = 0; i < n; i++) {
    const p = curve.getPointAt(i / n);
    const q = curve.getPointAt((i + 1) / n);
    const dx = q.x - p.x;
    const dz = q.z - p.z;
    const dy = q.y - p.y;
    const yaw = Math.atan2(dx, dz);
    const len = Math.hypot(dx, dz);
    addBox(deck, width, 0.18, len * 1.1, (p.x + q.x) * 0.5, (p.y + q.y) * 0.5, (p.z + q.z) * 0.5, yaw, -Math.atan2(dy, len), 0);
    if (i % 4 === 0) {
      const t = curve.getTangentAt(i / n);
      const nx = t.z;
      const nz = -t.x;
      for (const s of [-1, 1]) {
        addBox(posts, 0.16, 7.5, 0.16, p.x + nx * width * 0.5 * s, p.y - 3.6, p.z + nz * width * 0.5 * s);
        addBox(braces, 0.12, 0.12, 6.5, p.x + nx * (width * 0.5 + 1.5) * s, p.y - 2.2, p.z + nz * (width * 0.5 + 1.5) * s, yaw, 0, s * 0.5);
      }
    }
    if (i % 3 === 0) {
      const t = curve.getTangentAt(i / n);
      const nx = t.z;
      const nz = -t.x;
      for (const s of [-1, 1]) {
        addBox(posts, 0.08, 1.05, 0.08, p.x + nx * width * 0.5 * s, p.y + 0.55, p.z + nz * width * 0.5 * s);
        addBox(rails, 0.09, 0.09, 3.6, p.x + nx * width * 0.5 * s, p.y + 1.05, p.z + nz * width * 0.5 * s, Math.atan2(t.x, t.z));
        addBox(rails, 0.07, 0.07, 3.6, p.x + nx * width * 0.5 * s, p.y + 0.6, p.z + nz * width * 0.5 * s, Math.atan2(t.x, t.z));
      }
    }
  }
  deck.forEach((g) => L.add(g, M.wood));
  posts.forEach((g) => L.add(g, M.woodRed));
  rails.forEach((g) => L.add(g, M.woodRed));
  braces.forEach((g) => L.add(g, M.iron));
  return curve;
}

function viewingDeck(L, M, x, y, z, r = 5) {
  const g = new THREE.CylinderGeometry(r, r + 0.4, 0.4, 18);
  g.translate(x, y - 0.2, z);
  L.add(g, M.stone);
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const px = x + Math.cos(a) * (r - 0.15);
    const pz = z + Math.sin(a) * (r - 0.15);
    if (Math.sin(a) < -0.65) continue;
    cylTo(L, M.wood, 0.08, 0.1, 1.1, 5, px, y + 0.55, pz);
  }
  for (let i = 0; i < 17; i++) {
    const a = (i / 18) * Math.PI * 2;
    const b = ((i + 1) / 18) * Math.PI * 2;
    if (Math.sin(a) < -0.65 || Math.sin(b) < -0.65) continue;
    boxTo(L, M.stoneDark, 0.09, 0.09, r * 0.36, x + Math.cos((a + b) * 0.5) * (r - 0.15), y + 1.05, z + Math.sin((a + b) * 0.5) * (r - 0.15), -(a + b) * 0.5);
  }
}

function stairsDown(L, M, x, y, z, yaw, steps = 7, w = 3.2) {
  for (let i = 0; i < steps; i++) {
    boxTo(L, M.stone, w, 0.22, 0.72, x + Math.sin(yaw) * i * 0.7, y - i * 0.24, z + Math.cos(yaw) * i * 0.7, yaw);
  }
}

export function createLaojunArchitecture() {
  const M = buildMaterials();
  const B = new Bucket();
  const root = new THREE.Group();
  root.name = 'laojun-architecture';
  const labels = [];

  const hall = new Local();
  addHall(hall, M);
  hall.commit(B, matrixFor(-26, 225.9, -132, -0.12, 1.0));
  addPlaque(root, '老君庙', -26 - Math.sin(-0.12) * 4.3, 233.0, -132 + Math.cos(-0.12) * 4.3, -0.12, 3.0, 0.95);

  const admin = new Local();
  addHall(admin, M);
  admin.commit(B, matrixFor(-27, heightAt(-27, -76) - 0.3, -76, 0.18, 0.66));
  addPlaque(root, '道德府', -27 - Math.sin(0.18) * 2.9, heightAt(-27, -76) + 3.8, -76 + Math.cos(0.18) * 2.9, 0.18, 2.1, 0.68);

  const topHall = new Local();
  addHall(topHall, M);
  topHall.commit(B, matrixFor(42, 261.9, -336, 0.05, 0.92));
  addPlaque(root, '玉皇顶', 42 - Math.sin(0.05) * 3.9, 268.4, -336 + Math.cos(0.05) * 3.9, 0.05, 2.8, 0.88);

  const liangbao = new Local();
  addPavilion(liangbao, M, 0.92);
  liangbao.commit(B, matrixFor(-58, 213.8, -96, 0.6));
  addPlaque(root, '亮宝台', -58 - Math.sin(0.6) * 3.2, 218.8, -96 + Math.cos(0.6) * 3.2, 0.6, 2.4, 0.76);

  const wumu = new Local();
  addOctPavilion(wumu, M, 0.9);
  wumu.commit(B, matrixFor(17, heightAt(17, -186) - 0.2, -186, 0.35));
  addPlaque(root, '五母金殿', 17 - Math.sin(0.35) * 3.6, heightAt(17, -186) + 5.6, -186 + Math.cos(0.35) * 3.6, 0.35, 2.4, 0.8);

  const gate = new Local();
  addGate(gate, M);
  gate.commit(B, matrixFor(53, 157.8, 222, 0));
  addPlaque(root, '南天门', 53, 165.4, 223.35, 0, 2.8, 0.8);

  const cliffDeck = new Local();
  addPavilion(cliffDeck, M, 0.52);
  const shiliY = heightAt(184, -236) - 0.4;
  cliffDeck.commit(B, matrixFor(184, shiliY, -236, 0.4));
  addPlaque(root, '十里画屏', 184 - Math.sin(0.4) * 2.2, shiliY + 4.2, -236 + Math.cos(0.4) * 2.2, 0.4, 2.0, 0.64);

  const walkPts = [
    [204, 153, 166], [220, 169, 48], [236, 184, -70], [248, 195, -190],
    [260, 193, -300], [274, 181, -412], [286, 164, -524], [294, 150, -598],
  ];
  const walkCurve = boardwalk(B, M, walkPts, 2.35);
  viewingDeck(B, M, 250, 195.8, -206, 5.2);

  const bridgeCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-33, 226.0, -118),
    new THREE.Vector3(-42, 223.5, -108),
    new THREE.Vector3(-51, 214.2, -99),
  ], false, 'centripetal', 0.5);
  addBridge(B, M, [-33, 226.0, -118], [-51, 214.2, -99], 2.5);

  stairsDown(B, M, 53, 157.8, 228.5, 0, 8, 3.0);

  const group = B.finish('laojun-temples-walkways');
  root.add(group);

  labels.push(addLabel(root, '金顶道观群', 'GOLDEN SUMMIT TEMPLES · 2217 M', -12, 252, -120, 1.15));
  labels.push(addLabel(root, '玉皇顶', 'JADE EMPEROR PEAK', 42, 286, -336, 0.95));
  labels.push(addLabel(root, '亮宝台', 'LIANGBAO TERRACE', -58, 233, -96, 0.82));
  labels.push(addLabel(root, '十里画屏', 'TEN-MILE PAINTED SCREEN', 206, 224, -236, 1.0));

  const ribbonAnchors = [];
  const ring = (cx, cy, cz, r, n, yawBase = 0) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      ribbonAnchors.push({ x: cx + Math.cos(a) * r, y: cy, z: cz + Math.sin(a) * r, yaw: -a + yawBase, kind: i % 5 });
    }
  };
  ring(-8, 227.1, -120, 29.2, 56, 0);
  ring(-8, 227.1, -120, 20.4, 36, 0);
  ring(-58, 214.9, -96, 8.9, 18, 0);
  ring(42, 262.9, -336, 13.0, 22, 0);
  ring(17, heightAt(17, -186) + 1.0, -186, 8.8, 18, 0);
  for (let i = 0; i <= 20; i++) {
    const p = bridgeCurve.getPointAt(i / 20);
    ribbonAnchors.push({ x: p.x, y: p.y + 1.05, z: p.z, yaw: 0.3 + i * 0.1, kind: i % 4 });
  }
  for (let i = 4; i < 104; i += 5) {
    const p = walkCurve.getPointAt(i / 110);
    ribbonAnchors.push({ x: p.x + 1.15, y: p.y + 1.05, z: p.z, yaw: i * 0.21, kind: i % 5 });
  }
  for (let i = 0; i < 28; i++) {
    const p = walkCurve.getPointAt(i / 27);
    ribbonAnchors.push({ x: p.x - 1.2, y: p.y + 1.0, z: p.z, yaw: i * 0.17, kind: i % 3 });
  }

  return { group: root, materials: M, ribbonAnchors, bridgeCurve, walkCurve, shiliY };
}
