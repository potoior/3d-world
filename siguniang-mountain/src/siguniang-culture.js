import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { BOARDWALK } from './layout.js';
import { canvasTexture, heightAt, rand } from './siguniang-util.js';

function addBox(list, w, h, d, x, y, z, ry = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (ry) g.rotateY(ry);
  g.translate(x, y, z);
  list.push(g);
}

function addCylinder(list, rt, rb, h, seg, x, y, z, rx = 0, rz = 0) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  if (rx) g.rotateX(rx);
  if (rz) g.rotateZ(rz);
  g.translate(x, y, z);
  list.push(g);
}

function makeSignTexture(title, sub) {
  return canvasTexture(512, 256, (g, w, h) => {
    g.fillStyle = '#2b241b';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(216,176,106,0.85)';
    g.lineWidth = 7;
    g.strokeRect(13, 13, w - 26, h - 26);
    g.strokeStyle = 'rgba(216,176,106,0.32)';
    g.lineWidth = 2;
    g.strokeRect(27, 27, w - 54, h - 54);
    g.fillStyle = '#f1e5c9';
    g.font = '600 86px "Noto Serif CJK SC","Source Han Serif SC","Songti SC",serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(title, w / 2, h / 2 - 22);
    g.fillStyle = 'rgba(216,176,106,0.9)';
    g.font = '500 23px "Helvetica Neue",Arial,sans-serif';
    g.fillText(sub, w / 2, h / 2 + 64);
  });
}

export function createBoardwalk(staticRoot, mats) {
  const deck = [];
  const rails = [];
  const pts = BOARDWALK.map(([x, z]) => ({ x, z, y: heightAt(x, z) + 0.55 }));
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz);
    const ry = Math.atan2(dx, dz);
    const mx = (a.x + b.x) / 2;
    const mz = (a.z + b.z) / 2;
    const my = (a.y + b.y) / 2;
    addBox(deck, 3.1, 0.22, len + 0.24, mx, my, mz, ry);
    const posts = Math.max(1, Math.round(len / 3.6));
    for (let k = 0; k <= posts; k++) {
      const t = k / posts;
      const px = a.x + dx * t;
      const pz = a.z + dz * t;
      const py = a.y + (b.y - a.y) * t;
      const nx = Math.cos(ry);
      const nz = -Math.sin(ry);
      for (const side of [-1, 1]) {
        addBox(rails, 0.16, 1.25, 0.16, px + nx * 1.48 * side, py + 0.55, pz + nz * 1.48 * side);
      }
      if (k < posts) {
        const t2 = (k + 0.5) / posts;
        const rx = a.x + dx * t2;
        const rz = a.z + dz * t2;
        const ry2 = a.y + (b.y - a.y) * t2;
        for (const side of [-1, 1]) {
          addBox(rails, 0.09, 0.09, len / posts, rx + nx * 1.48 * side, ry2 + 1.08, rz + nz * 1.48 * side, ry);
        }
      }
    }
  }
  const deckMesh = new THREE.Mesh(mergeList(deck), mats.wood);
  deckMesh.castShadow = true;
  deckMesh.receiveShadow = true;
  staticRoot.add(deckMesh);
  const railMesh = new THREE.Mesh(mergeList(rails), mats.woodDark);
  railMesh.castShadow = true;
  railMesh.receiveShadow = true;
  staticRoot.add(railMesh);
}

function mergeList(list) {
  return mergeGeometries(list, false);
}

function buildBridge(list, x1, x2, z, width, mats) {
  const y1 = heightAt(x1, z);
  const y2 = heightAt(x2, z);
  const y = Math.max(y1, y2) + 0.9;
  const steps = 16;
  const nz = width * 0.5;
  for (let i = 0; i < steps; i++) {
    const t = i / steps;
    const x = x1 + (x2 - x1) * ((i + 0.5) / steps);
    const yy = y + Math.sin(t * Math.PI) * 0.5;
    addBox(list, (x2 - x1) / steps + 0.06, 0.22, width, x, yy, z);
  }
  for (const side of [-1, 1]) {
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      const x = x1 + (x2 - x1) * t;
      const yy = y + Math.sin(t * Math.PI) * 0.5;
      addBox(list, 0.16, 1.3, 0.16, x, yy + 0.62, z + side * (nz - 0.12));
      if (i < 10) {
        const xa = x1 + (x2 - x1) * ((i + 0.5) / 10);
        addBox(list, (x2 - x1) / 10, 0.1, 0.1, xa, yy + 1.22, z + side * (nz - 0.12));
        addBox(list, (x2 - x1) / 10, 0.08, 0.08, xa, yy + 0.55, z + side * (nz - 0.12));
      }
    }
  }
}

export function createBridges(staticRoot, mats) {
  const list = [];
  buildBridge(list, 2, 96, -250, 4.4, mats);
  buildBridge(list, -24, 68, -84, 4.0, mats);
  const mesh = new THREE.Mesh(mergeList(list), mats.woodDark);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  staticRoot.add(mesh);
}

export function createStupa(staticRoot, mats) {
  const x = 318;
  const z = -302;
  const base = heightAt(x, z);
  const white = [];
  const gold = [];
  addBox(white, 17, 1.6, 17, x, base + 0.8, z);
  addBox(white, 13, 1.2, 13, x, base + 2.2, z);
  addBox(white, 9.5, 1.1, 9.5, x, base + 3.35, z);
  addBox(white, 6.2, 1.0, 6.2, x, base + 4.4, z);
  const dome = new THREE.SphereGeometry(3.2, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.5);
  dome.scale(1, 1.12, 1);
  dome.translate(x, base + 4.95, z);
  white.push(dome);
  addCylinder(white, 1.35, 1.7, 1.0, 12, x, base + 8.15, z);
  addCylinder(gold, 0.22, 0.34, 4.4, 8, x, base + 10.6, z);
  for (let i = 0; i < 4; i++) {
    const ring = new THREE.TorusGeometry(0.62 - i * 0.1, 0.09, 6, 14);
    ring.rotateX(Math.PI / 2);
    ring.translate(x, base + 9.2 + i * 0.5, z);
    gold.push(ring);
  }
  const tip = new THREE.ConeGeometry(0.55, 1.2, 8);
  tip.translate(x, base + 13.1, z);
  gold.push(tip);
  const wm = new THREE.Mesh(mergeList(white), mats.white);
  wm.castShadow = true;
  wm.receiveShadow = true;
  staticRoot.add(wm);
  const gm = new THREE.Mesh(mergeList(gold), mats.gold);
  gm.castShadow = true;
  staticRoot.add(gm);

  const stones = [];
  for (let i = 0; i < 16; i++) {
    const a = rand(1901, i) * Math.PI * 2;
    const r = 9.5 + rand(1907, i) * 4.5;
    const sx = x + Math.cos(a) * r;
    const sz = z + Math.sin(a) * r;
    const s = 0.6 + rand(1913, i) * 1.15;
    const g = new THREE.DodecahedronGeometry(1, 0);
    g.scale(s * 1.2, s * 0.7, s);
    g.rotateY(rand(1919, i) * 3);
    g.translate(sx, heightAt(sx, sz) + s * 0.35, sz);
    stones.push(g);
  }
  const sm = new THREE.Mesh(mergeList(stones), mats.stone);
  sm.castShadow = true;
  sm.receiveShadow = true;
  staticRoot.add(sm);
}

export function createManiCairn(staticRoot, mats) {
  const x = 164;
  const z = -252;
  const base = heightAt(x, z);
  const list = [];
  let y = base;
  for (let i = 0; i < 9; i++) {
    const s = 1.9 - i * 0.15;
    const g = new THREE.DodecahedronGeometry(1, 0);
    g.scale(s * (0.9 + rand(2001, i) * 0.3), s * 0.42, s * (0.85 + rand(2007, i) * 0.3));
    g.rotateY(rand(2011, i) * 3);
    g.translate(x + (rand(2017, i) - 0.5) * 0.5, y + s * 0.2, z + (rand(2021, i) - 0.5) * 0.5);
    list.push(g);
    y += s * 0.36;
  }
  for (let i = 0; i < 10; i++) {
    const a = rand(2027, i) * Math.PI * 2;
    const r = 3.5 + rand(2029, i) * 2.6;
    const sx = x + Math.cos(a) * r;
    const sz = z + Math.sin(a) * r;
    const s = 0.45 + rand(2031, i) * 0.8;
    const g = new THREE.DodecahedronGeometry(1, 0);
    g.scale(s, s * 0.7, s);
    g.rotateY(rand(2033, i) * 3);
    g.translate(sx, heightAt(sx, sz) + s * 0.3, sz);
    list.push(g);
  }
  const mesh = new THREE.Mesh(mergeList(list), mats.stone);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  staticRoot.add(mesh);
}

export function createSigns(staticRoot, mats) {
  const defs = [
    ['双桥沟', 'SHUANGQIAO VALLEY · 3200 M', 168, -462, Math.PI - 0.18, 0.85],
    ['四姑娘山', 'SIGUNIANG MOUNTAIN · 6250 M', 366, -346, Math.PI - 0.38, 1.05],
  ];
  for (const [title, sub, x, z, ry, scale] of defs) {
    const texture = makeSignTexture(title, sub);
    const boardMat = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.82,
      metalness: 0.04,
      side: THREE.DoubleSide,
    });
    const y = heightAt(x, z);
    const board = new THREE.Mesh(new THREE.PlaneGeometry(11, 5.5), boardMat);
    board.position.set(x, y + 4.1 * scale, z);
    board.rotation.y = ry;
    board.castShadow = true;
    board.receiveShadow = true;
    staticRoot.add(board);
    const posts = [];
    for (const side of [-1, 1]) {
      addCylinder(posts, 0.17, 0.2, 3.6 * scale, 6, x + Math.cos(ry) * side * 3.6, y + 1.8 * scale, z - Math.sin(ry) * side * 3.6);
    }
    const pm = new THREE.Mesh(mergeList(posts), mats.woodDark);
    pm.castShadow = true;
    staticRoot.add(pm);
  }
}
