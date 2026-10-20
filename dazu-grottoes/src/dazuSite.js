import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { M, add, box, cyl, ball, bar3, patch, frontAt } from './dazuCommon.js';
import { colliders } from './architectures.js';
import { makePlaqueTexture } from './textures.js';

function roofX(g, cx, cy, cz, depthX, widthZ, rise, m, edge) {
  for (const sx of [-1, 1]) {
    const geo = new THREE.BoxGeometry(depthX * 0.64, 0.42, widthZ);
    geo.rotateZ(sx * 0.34);
    geo.translate(cx + sx * depthX * 0.23, cy + rise * 0.44, cz);
    add(g, geo, m, 0, 0, 0);
    const e = new THREE.BoxGeometry(depthX * 0.66, 0.28, widthZ + 1.8);
    e.rotateZ(sx * 0.34);
    e.translate(cx + sx * depthX * 0.25, cy + rise * 0.2, cz);
    add(g, e, edge, 0, 0, 0);
  }
  box(g, 0.7, 0.6, widthZ + 1.6, edge, cx, cy + rise * 0.94, cz);
  for (const sz of [-1, 1]) {
    const tip = new THREE.BoxGeometry(depthX * 0.5, 0.42, 1.2);
    tip.rotateX(sz * -0.24);
    tip.rotateZ(0.16);
    tip.translate(cx - depthX * 0.48, cy + rise * 0.55, cz + sz * (widthZ * 0.5 + 0.6));
    add(g, tip, edge, 0, 0, 0);
  }
}

function railingZ(g, x, z1, z2, y, m) {
  const n = Math.max(2, Math.round(Math.abs(z2 - z1) / 2.2));
  for (let i = 0; i <= n; i++) {
    const z = z1 + (z2 - z1) * (i / n);
    box(g, 0.28, 1.15, 0.28, m, x, y + 0.57, z);
    box(g, 0.4, 0.14, 0.4, m, x, y + 1.18, z);
  }
  box(g, 0.22, 0.18, z2 - z1, m, x, y + 1.15, (z1 + z2) / 2);
  box(g, 0.16, 0.15, z2 - z1, m, x, y + 0.62, (z1 + z2) / 2);
}

function railingX(g, z, x1, x2, y, m) {
  const n = Math.max(2, Math.round(Math.abs(x2 - x1) / 2.2));
  for (let i = 0; i <= n; i++) {
    const x = x1 + (x2 - x1) * (i / n);
    box(g, 0.28, 1.15, 0.28, m, x, y + 0.57, z);
    box(g, 0.4, 0.14, 0.4, m, x, y + 1.18, z);
  }
  box(g, x2 - x1, 0.18, 0.22, m, (x1 + x2) / 2, y + 1.15, z);
  box(g, x2 - x1, 0.14, 0.16, m, (x1 + x2) / 2, y + 0.62, z);
}

function stairsX(g, xFront, z, widthZ, steps, stepD, stepH, m) {
  for (let i = 0; i < steps; i++) {
    const h = (i + 1) * stepH;
    const x = xFront - i * stepD;
    box(g, stepD, h, widthZ, m, x, h / 2, z);
    box(g, 0.24, 0.12, widthZ, M.rockPale, x - stepD * 0.5, h, z);
  }
  for (const sz of [-1, 1]) box(g, steps * stepD, 1.0, 0.6, M.stoneDark, xFront - steps * stepD * 0.5, (steps * stepH) / 2, z + sz * widthZ * 0.5);
}

function ladder(g, x, z, y0, y1, lean, m) {
  for (const sz of [-1, 1]) bar3(g, x, y0, z + sz * 0.55, x - lean, y1, z + sz * 0.55, 0.11, m, 5);
  const n = Math.max(3, Math.round((y1 - y0) / 0.6));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    box(g, 0.16, 0.12, 1.2, m, x - lean * t, y0 + (y1 - y0) * t, z);
  }
}

function pine(g, x, z, s) {
  const gy = 2.8;
  cyl(g, 0.18 * s, 0.34 * s, 4.2 * s, 6, M.trunk, x, gy + 2.1 * s, z);
  for (let i = 0; i < 5; i++) {
    const r = (3.0 - i * 0.44) * s;
    const cone = new THREE.ConeGeometry(r, 2.5 * s, 7);
    cone.translate(x + Math.sin(i * 2.1) * 0.6 * s, gy + (4.4 + i * 1.25) * s, z + Math.cos(i * 1.7) * 0.55 * s);
    add(g, cone, M.pine, 0, 0, 0);
  }
  for (let i = 0; i < 3; i++) {
    const a = i * 2.1;
    bar3(g, x, gy + (4.0 + i * 0.8) * s, z, x + Math.cos(a) * 2.6 * s, gy + (5.2 + i * 0.9) * s, z + Math.sin(a) * 2.4 * s, 0.1 * s, M.trunk, 4);
  }
}

function templeHall(g, cx, cz, wz, h, tiers) {
  const base = 3.2;
  box(g, 16, 1.6, wz + 4, M.stone, cx, base + 0.8, cz);
  box(g, 14, h, wz, M.woodRed, cx, base + 1.6 + h / 2, cz);
  for (let i = 0; i <= 8; i++) {
    const z = cz - wz / 2 + (wz * i) / 8;
    box(g, 0.72, h, 0.72, M.woodDark, cx - 7.4, base + 1.6 + h / 2, z);
  }
  box(g, 0.9, 0.8, wz + 2, M.woodDark, cx - 7.3, base + 2.3, cz);
  box(g, 0.9, 0.65, wz + 2, M.gold, cx - 7.3, base + h + 0.6, cz);
  for (let i = 0; i < 6; i++) {
    const z = cz - wz / 2 + 2 + i * (wz - 4) / 5;
    patch(g, cx - 7.85, base + h * 0.52, z, 3.4, h * 0.52, M.caveDark);
    for (let k = 0; k < 5; k++) box(g, 0.12, h * 0.5, 0.25, M.wood, cx - 7.8, base + h * 0.52, z - 1.5 + k * 0.75);
  }
  roofX(g, cx, base + h + 1.0, cz, 19, wz + 4, 5.4, M.roof, M.roofEdge);
  if (tiers) roofX(g, cx, base + h + 5.4, cz, 10, wz * 0.5, 3.0, M.roof, M.roofEdge);
  for (const sz of [-1, 1]) box(g, 0.55, 2.2, 0.55, M.lantern, cx - 8.6, base + h * 0.55, cz + sz * wz * 0.36);
  colliders.push({ name: '宝顶山木构殿宇', minX: cx - 9, maxX: cx + 7, minZ: cz - wz / 2 - 2, maxZ: cz + wz / 2 + 2 });
}

function incenseBurner(g, x, z) {
  box(g, 4.6, 0.7, 4.6, M.stoneDark, x, 3.3, z);
  box(g, 3.4, 0.5, 3.4, M.stone, x, 3.85, z);
  cyl(g, 1.4, 1.1, 1.8, 10, M.bronze, x, 4.9, z);
  cyl(g, 1.7, 1.7, 0.2, 10, M.bronze, x, 5.85, z);
  for (const sz of [-1, 1]) bar3(g, x, 4.1, z + sz * 1.0, x, 5.9, z + sz * 0.4, 0.08, M.bronze, 4);
  for (let i = 0; i < 5; i++) cyl(g, 0.05, 0.05, 1.7, 4, M.woodDark, x - 0.7 + i * 0.35, 6.7, z);
}

function stoneLantern(g, x, z, s = 1) {
  box(g, 1.3 * s, 0.5 * s, 1.3 * s, M.stoneDark, x, 3.35, z);
  cyl(g, 0.28 * s, 0.4 * s, 2.3 * s, 6, M.stone, x, 4.6 * s, z);
  box(g, 1.1 * s, 1.1 * s, 1.1 * s, M.stone, x, 5.9 * s, z);
  for (const sz of [-1, 1]) patch(g, x - 0.57 * s, 5.9 * s, z + sz * 0.3 * s, 0.5 * s, 0.5 * s, M.lantern);
  const cap = new THREE.ConeGeometry(0.95 * s, 0.7 * s, 4);
  cap.rotateY(Math.PI / 4);
  cap.translate(x, 6.8 * s, z);
  add(g, cap, M.stoneDark, 0, 0, 0);
  ball(g, 6, M.stone, x, 7.25 * s, z, 0.24 * s, 0.28 * s, 0.24 * s);
}

function plaque(g, text, x, y, z, w, h) {
  const material = new THREE.MeshStandardMaterial({ map: makePlaqueTexture(text), roughness: 0.78, metalness: 0.06 });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
  mesh.rotation.y = -Math.PI / 2;
  mesh.position.set(x, y, z);
  g.add(mesh);
  box(g, 0.35, h + 0.5, w + 0.5, M.gold, x + 0.25, y, z);
}

function stele(g, text, x, z, s = 1) {
  box(g, 1.1 * s, 3.2 * s, 2.2 * s, M.stone, x, 3.6, z);
  box(g, 1.4 * s, 0.35 * s, 2.6 * s, M.stoneDark, x, 2.1, z);
  plaque(g, text, x - 0.58 * s, 4.1, z, 1.7 * s, 1.0 * s);
}

function terrainBase(x, z) {
  return Math.max(-2, 4 + 2.5 * Math.sin(x * 0.004) + 2 * Math.cos(z * 0.003));
}

function distantMesas(g) {
  const defs = [
    [-520, -440, 150, 70, 0x9c7c5c], [-700, -120, 210, 92, 0x8f7054],
    [-610, 360, 180, 64, 0xa48361], [-880, 560, 240, 110, 0x8a6b50],
    [690, -520, 200, 84, 0x9c7c5c], [880, -80, 260, 118, 0x8d6f53],
    [760, 420, 190, 72, 0xa28260], [980, 680, 280, 130, 0x86684d],
    [180, -850, 230, 96, 0x96775a], [-260, 900, 220, 88, 0x9d7d5d],
  ];
  for (let i = 0; i < defs.length; i++) {
    const [x, z, r, h, c] = defs[i];
    const m = new THREE.MeshStandardMaterial({ color: c, roughness: 1, flatShading: true });
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.55, r, h, 7, 2), m);
    mesh.position.set(x, terrainBase(x, z) + h / 2 - 10, z);
    mesh.rotation.y = i * 1.7;
    mesh.scale.z = 0.72;
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    g.add(mesh);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.5, r * 0.62, h * 0.2, 7), m);
    cap.position.set(x, terrainBase(x, z) + h - 6, z);
    cap.rotation.y = i * 1.7;
    cap.scale.z = 0.72;
    g.add(cap);
  }
  for (let i = 0; i < 68; i++) {
    const x = 65 + (i % 7) * 17 + (i % 3) * 8;
    const z = -230 + i * 6.7;
    const s = 1.6 + (i % 5) * 0.6;
    ball(g, 7, i % 2 ? M.pine : M.moss, x, 8 + (i % 6) * 3.9, z, 3.4 * s, 2.2 * s, 3.1 * s);
  }
}

function makeSmokeTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 2, 64, 64, 62);
  grd.addColorStop(0, 'rgba(246,241,226,0.85)');
  grd.addColorStop(0.35, 'rgba(232,226,210,0.42)');
  grd.addColorStop(1, 'rgba(220,214,198,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function visitorGeometry() {
  const parts = [];
  const body = new THREE.CylinderGeometry(0.28, 0.42, 1.25, 7);
  body.translate(0, 0.85, 0);
  parts.push(body);
  const head = new THREE.SphereGeometry(0.24, 8, 6);
  head.translate(0, 1.72, 0);
  parts.push(head);
  const skirt = new THREE.BoxGeometry(0.55, 0.55, 0.4);
  skirt.translate(0, 0.3, 0);
  parts.push(skirt);
  const hat = new THREE.ConeGeometry(0.34, 0.22, 7);
  hat.translate(0, 1.95, 0);
  parts.push(hat);
  const merged = mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)), false);
  parts.forEach((p) => p.dispose());
  return merged;
}

export function buildDazuSite(g) {
  const f = frontAt(0);
  templeHall(g, f - 14, 188, 26, 9.2, true);
  box(g, 32, 1.4, 60, M.stone, f - 18, 3.7, 160);
  box(g, 30, 0.5, 58, M.stoneDark, f - 18, 3.15, 160);
  stairsX(g, f - 27, 160, 12, 7, 1.6, 0.36, M.stone);
  railingZ(g, f - 13, 126, 146, 4.3, M.stoneDark);
  railingZ(g, f - 13, 174, 194, 4.3, M.stoneDark);
  railingX(g, 132, f - 34, f - 14, 4.3, M.stoneDark);
  incenseBurner(g, f - 25, 138);
  for (const z of [-112, -58, 22, 92, 140, 208]) stoneLantern(g, f - 22, z, 0.95);
  stele(g, '宝顶山', f - 27, 104, 1.0);
  stele(g, '大足石刻', f - 27, 118, 1.0);
  plaque(g, '宝顶山大佛湾', f - 8.2, 8.6, 152, 5.0, 1.5);
  plaque(g, '圣寿寺', f - 6.6, 8.0, 188, 4.0, 1.4);
  for (const z of [-160, -130, -100, -70, -40, -10, 20, 50, 80, 110, 150, 185, 220]) {
    box(g, 6.4, 0.28, 4.8, z % 40 === 0 ? M.stoneDark : M.stone, f - 22, 2.9, z);
    box(g, 0.2, 0.08, 4.8, M.rockPale, f - 25, 3.04, z);
  }
  const pineSpots = [
    [-9, -190, 1.15], [-16, -172, 0.9], [-6, -136, 1.05], [-18, -102, 0.95],
    [-8, -22, 1.2], [-14, 12, 1.0], [-6, 58, 1.1], [-18, 76, 0.92],
    [-9, 118, 1.15], [-15, 148, 0.88], [-7, 214, 1.08], [-17, 236, 0.95],
    [-28, -154, 1.0], [-31, -12, 0.86], [-27, 68, 1.02], [-30, 176, 0.94],
  ];
  for (const [x, z, s] of pineSpots) pine(g, f + x - 2, z, s);
  for (const [x, z, s] of [[f - 34, -78, 0.9], [f - 36, 44, 1.0], [f - 33, 196, 0.92]]) pine(g, x, z, s);
  for (const [x, z, s] of [[f + 58, -190, 1.8], [f + 67, -90, 2.0], [f + 62, 35, 1.7], [f + 70, 150, 1.9], [f + 56, 238, 1.6]]) {
    ball(g, 8, M.moss, x, 63 + (Math.abs(z) % 7), z, 7 * s, 4.2 * s, 6 * s);
  }
  distantMesas(g);

  const flags = [];
  for (let i = 0; i < 18; i++) flags.push({ x: f - 15.5, z: -22 + i * 2.6, y: 8.4 + (i % 3) * 0.45, p: i * 0.55 });
  const flagGeo = new THREE.PlaneGeometry(0.95, 1.35);
  const flagMat = new THREE.MeshStandardMaterial({ color: 0x9e3529, roughness: 0.9, side: THREE.DoubleSide });
  const flagMesh = new THREE.InstancedMesh(flagGeo, flagMat, flags.length);
  flagMesh.castShadow = false;
  g.add(flagMesh);
  for (const fz of flags) for (const dz of [-1.35, 1.35]) cyl(g, 0.05, 0.06, 5.0, 4, M.woodDark, fz.x, 5.8, fz.z + dz);

  const smokeGeo = new THREE.PlaneGeometry(3.2, 3.2);
  const smokeMat = new THREE.MeshBasicMaterial({ map: makeSmokeTexture(), color: 0xe8e3d4, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide });
  const smoke = new THREE.InstancedMesh(smokeGeo, smokeMat, 9);
  smoke.frustumCulled = false;
  g.add(smoke);

  const visitorGeo = visitorGeometry();
  const visitorMesh = new THREE.InstancedMesh(visitorGeo, new THREE.MeshStandardMaterial({ color: 0x4a4034, roughness: 0.96 }), 16);
  visitorMesh.castShadow = true;
  visitorMesh.receiveShadow = true;
  g.add(visitorMesh);

  const lanternGeo = new THREE.SphereGeometry(0.42, 8, 6);
  lanternGeo.scale(0.85, 1.3, 0.85);
  const lanternMesh = new THREE.InstancedMesh(lanternGeo, M.lantern, 10);
  lanternMesh.castShadow = false;
  g.add(lanternMesh);
  const lanternSpots = [];
  for (let i = 0; i < 5; i++) lanternSpots.push([f - 9.0, 9.4, 132 + i * 8.4]);
  for (let i = 0; i < 5; i++) lanternSpots.push([f - 27, 8.2, 100 + i * 8.2]);

  const dummy = new THREE.Object3D();
  const life = {
    update(time) {
      flags.forEach((fl, i) => {
        dummy.position.set(fl.x - 0.22, fl.y + 2.05 + Math.sin(time * 1.2 + fl.p) * 0.11, fl.z);
        dummy.rotation.set(Math.sin(time * 1.8 + fl.p) * 0.15, -0.2 + Math.sin(time * 2.2 + fl.p) * 0.2, Math.sin(time * 2.6 + fl.p) * 0.11);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        flagMesh.setMatrixAt(i, dummy.matrix);
      });
      flagMesh.instanceMatrix.needsUpdate = true;
      for (let i = 0; i < 16; i++) {
        const speed = i < 8 ? 1.05 : 0.55;
        const z = -120 + ((time * speed + i * 21.7) % 300);
        const lane = i % 3;
        dummy.position.set(f - 25 + lane * 3.0 + Math.sin(time * 0.7 + i) * 0.25, 3.02, z);
        dummy.rotation.set(0, Math.sin(time * 0.6 + i) * 0.5 + (lane - 1) * 0.4, 0);
        dummy.scale.setScalar(0.92 + (i % 3) * 0.07);
        dummy.updateMatrix();
        visitorMesh.setMatrixAt(i, dummy.matrix);
      }
      visitorMesh.instanceMatrix.needsUpdate = true;
      for (let i = 0; i < 9; i++) {
        const t = (time * 0.15 + i * 0.13) % 1;
        dummy.position.set(f - 25 + Math.sin(time * 0.5 + i * 2) * 0.4 + t * 1.0, 5.9 + t * 9.5, 138 + Math.sin(time * 0.4 + i) * 0.18);
        dummy.rotation.set(0, -Math.PI / 2, 0);
        dummy.scale.setScalar(0.3 + t * 1.35);
        dummy.updateMatrix();
        smoke.setMatrixAt(i, dummy.matrix);
      }
      smoke.instanceMatrix.needsUpdate = true;
      smokeMat.opacity = 0.12 + Math.sin(time * 0.6) * 0.04;
      lanternSpots.forEach((p, i) => {
        dummy.position.set(p[0], p[1] + Math.sin(time * 1.4 + i) * 0.06, p[2] + Math.sin(time * 1.1 + i) * 0.05);
        dummy.rotation.set(Math.sin(time * 1.3 + i) * 0.08, 0, Math.sin(time * 1.6 + i) * 0.08);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        lanternMesh.setMatrixAt(i, dummy.matrix);
      });
      lanternMesh.instanceMatrix.needsUpdate = true;
    },
  };
  life.update(0);
  return life;
}
