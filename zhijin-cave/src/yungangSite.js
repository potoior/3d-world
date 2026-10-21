import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { M, add, box, cyl, ball, bar3, patch, frontAt, topAt } from './yungangCommon.js';
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
    box(g, 0.28, 1.25, 0.28, m, x, y + 0.62, z);
  }
  box(g, 0.22, 0.18, z2 - z1, m, x, y + 1.2, (z1 + z2) / 2);
  box(g, 0.16, 0.15, z2 - z1, m, x, y + 0.68, (z1 + z2) / 2);
}

function railingX(g, z, x1, x2, y, m) {
  const n = Math.max(2, Math.round(Math.abs(x2 - x1) / 2.2));
  for (let i = 0; i <= n; i++) {
    const x = x1 + (x2 - x1) * (i / n);
    box(g, 0.28, 1.25, 0.28, m, x, y + 0.62, z);
  }
  box(g, x2 - x1, 0.18, 0.22, m, (x1 + x2) / 2, y + 1.2, z);
}

function stairsX(g, xFront, z, widthZ, steps, stepD, stepH, m) {
  for (let i = 0; i < steps; i++) {
    const h = (i + 1) * stepH;
    const x = xFront - i * stepD;
    box(g, stepD, h, widthZ, m, x, h / 2, z);
    box(g, 0.22, 0.12, widthZ, M.rockPale, x - stepD * 0.5, h, z);
  }
  for (const sz of [-1, 1]) {
    box(g, steps * stepD, 1.0, 0.6, M.stoneDark, xFront - steps * stepD * 0.5, (steps * stepH) / 2, z + sz * widthZ * 0.5);
  }
}

function ladder(g, x, z, y0, y1, lean, m) {
  for (const sz of [-1, 1]) bar3(g, x, y0, z + sz * 0.55, x - lean, y1, z + sz * 0.55, 0.11, m, 5);
  const n = Math.max(3, Math.round((y1 - y0) / 0.6));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    box(g, 0.16, 0.12, 1.2, m, x - lean * t, y0 + (y1 - y0) * t, z);
  }
}

function person(g, x, z, s, m) {
  const gy = Math.max(2.8, 0);
  cyl(g, 0.22 * s, 0.35 * s, 1.15 * s, 7, m, x, gy + 0.95 * s, z);
  ball(g, 8, M.carve, x, gy + 1.7 * s, z, 0.22 * s, 0.24 * s, 0.22 * s);
  box(g, 0.34 * s, 0.6 * s, 0.26 * s, M.woodDark, x, gy + 0.38 * s, z);
  if (s > 0.9) {
    box(g, 0.5 * s, 0.1 * s, 0.5 * s, M.straw || M.wood, x, gy + 1.92 * s, z);
  }
}

function pine(g, x, z, s) {
  const gy = 3.0;
  cyl(g, 0.18 * s, 0.32 * s, 4.0 * s, 6, M.trunk, x, gy + 2.0 * s, z);
  for (let i = 0; i < 4; i++) {
    const r = (2.6 - i * 0.42) * s;
    const cone = new THREE.ConeGeometry(r, 2.4 * s, 7);
    cone.translate(x + Math.sin(i * 2.1) * 0.5 * s, gy + (4.4 + i * 1.35) * s, z + Math.cos(i * 1.7) * 0.5 * s);
    add(g, cone, M.pine, 0, 0, 0);
  }
}

function woodFacade(g, cx, cz, wz) {
  const base = 3.0;
  box(g, 7, 1.1, wz, M.stoneDark, cx, base + 0.55, cz);
  for (let i = 0; i <= 6; i++) {
    const z = cz - wz / 2 + (wz * i) / 6;
    box(g, 0.8, 16, 0.8, M.woodRed, cx - 2.4, base + 8.5, z);
  }
  for (const y of [8.8, 14.8, 19.0]) box(g, 0.9, 0.75, wz + 1.2, M.woodDark, cx - 2.4, y, cz);
  for (const y of [8.4, 14.4]) {
    box(g, 4.2, 0.5, wz + 2.0, M.wood, cx - 4.1, y, cz);
    railingZ(g, cx - 6.1, cz - wz / 2, cz + wz / 2, y + 0.3, M.woodRed);
    box(g, 4.2, 0.24, 0.5, M.woodDark, cx - 4.1, y + 2.2, cz - wz / 2);
    box(g, 4.2, 0.24, 0.5, M.woodDark, cx - 4.1, y + 2.2, cz + wz / 2);
  }
  for (let i = 0; i < 5; i++) {
    const z = cz - wz / 2 + 3 + i * (wz - 6) / 4;
    for (let k = 0; k < 4; k++) {
      box(g, 0.16, 2.5, 0.35, M.woodDark, cx - 2.0, base + 5.0 + k * 0.7, z);
    }
    patch(g, cx - 1.95, base + 5.9, z, 2.8, 3.2, M.caveDark);
  }
  ladder(g, cx - 8.0, cz - wz * 0.28, base, 14.4, 3.2, M.woodDark);
  roofX(g, cx - 2.5, base + 19.2, cz, 11, wz + 3, 4.6, M.roof, M.roofEdge);
  roofX(g, cx - 3.2, base + 12.8, cz, 8, wz * 0.45, 2.3, M.roof, M.roofEdge);
  box(g, 0.45, 1.0, 6.0, M.gold, cx - 6.35, base + 17.0, cz);
  for (const sz of [-1, 1]) box(g, 0.55, 2.6, 0.55, M.lantern, cx - 6.2, base + 10.0, cz + sz * wz * 0.3);
}

function templeHall(g, cx, cz, wz, h, tiers) {
  const base = 4.6;
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
  for (const sz of [-1, 1]) {
    box(g, 0.55, 2.2, 0.55, M.lantern, cx - 8.6, base + h * 0.55, cz + sz * wz * 0.36);
  }
  colliders.push({ name: '云冈木构窟檐', minX: cx - 9, maxX: cx + 7, minZ: cz - wz / 2 - 2, maxZ: cz + wz / 2 + 2 });
}

function incenseBurner(g, x, z) {
  box(g, 4.2, 0.7, 4.2, M.stoneDark, x, 3.35, z);
  cyl(g, 1.4, 1.1, 1.8, 10, M.bronze, x, 4.6, z);
  cyl(g, 1.7, 1.7, 0.2, 10, M.bronze, x, 5.55, z);
  for (const sz of [-1, 1]) bar3(g, x, 3.8, z + sz * 1.0, x, 5.6, z + sz * 0.4, 0.08, M.bronze, 4);
  for (let i = 0; i < 3; i++) cyl(g, 0.05, 0.05, 1.7, 4, M.woodDark, x - 0.35 + i * 0.35, 6.3, z);
}

function plaque(g, tex, x, y, z, w, h) {
  const material = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.78, metalness: 0.06 });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
  mesh.rotation.y = -Math.PI / 2;
  mesh.position.set(x, y, z);
  g.add(mesh);
  box(g, 0.35, h + 0.5, w + 0.5, M.gold, x + 0.25, y, z);
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
    const geo = new THREE.CylinderGeometry(r * 0.55, r, h, 7, 2);
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x, terrainBase(x, z) + h / 2 - 10, z);
    mesh.rotation.y = i * 1.7;
    mesh.scale.z = 0.72;
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    g.add(mesh);
    const cap = new THREE.CylinderGeometry(r * 0.5, r * 0.62, h * 0.2, 7);
    const cm = new THREE.Mesh(cap, m);
    cm.position.set(x, terrainBase(x, z) + h - 6, z);
    cm.rotation.y = i * 1.7;
    cm.scale.z = 0.72;
    g.add(cm);
  }
}

function terrainBase(x, z) {
  return Math.max(-2, 4 + 2.5 * Math.sin(x * 0.004) + 2 * Math.cos(z * 0.003));
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

export function buildYungangSite(g) {
  const f56 = frontAt(56);
  woodFacade(g, f56 - 2.5, 56, 42);
  templeHall(g, 181, 126, 34, 10.5, true);
  templeHall(g, 181, 157, 20, 7.5, true);
  templeHall(g, 184, 178, 15, 6.0, false);
  box(g, 30, 1.4, 54, M.stone, 179, 3.7, 128);
  box(g, 28, 0.5, 52, M.stoneDark, 179, 3.15, 128);
  stairsX(g, 164, 128, 12, 7, 1.6, 0.38, M.stone);
  railingZ(g, 165.5, 104, 118, 4.3, M.stoneDark);
  railingZ(g, 165.5, 139, 153, 4.3, M.stoneDark);
  railingX(g, 103.5, 166, 192, 4.3, M.stoneDark);
  ladder(g, 162.6, 152.5, 3.0, 14.0, 2.6, M.woodDark);
  ladder(g, 169.5, 111.5, 3.0, 11.0, 2.2, M.woodDark);
  incenseBurner(g, 162, 124);
  plaque(g, makePlaqueTexture('云冈石窟'), 172.9, 11.6, 126, 6.0, 2.0);
  plaque(g, makePlaqueTexture('石窟寒泉'), 172.9, 8.2, 157, 4.2, 1.5);
  for (const [x, z] of [[150, 168], [156, 176], [166, 182], [143, 142], [137, 120], [146, 105], [158, 96], [187, 189], [193, 168], [126, 150], [208, 96], [213, 118]]) {
    pine(g, x, z, 0.9 + ((x + z) % 5) * 0.07);
  }
  const visitorMats = [M.visitorA, M.visitorB, M.visitorC];
  for (let i = 0; i < 12; i++) {
    const z = 108 + i * 4.8;
    const x = 151 + (i % 3) * 5.0;
    person(g, x, z, 0.95 + (i % 2) * 0.1, visitorMats[i % 3]);
  }
  for (let i = 0; i < 5; i++) person(g, 168 + (i % 2) * 3, 112 + i * 8, 1.0, M.woodRed);
  for (const [x, z, s] of [[168, 190, 1.2], [172, 198, 1.0], [178, 202, 1.1], [190, 210, 0.9], [182, 188, 1.1], [196, 118, 1.0], [200, 76, 0.9]]) {
    box(g, 5 * s, 0.8 * s, 5 * s, M.rockDark, x, 3.1, z);
    ball(g, 7, M.rockB, x, 3.9 * s, z, 3.2 * s, 1.5 * s, 3.0 * s);
  }
  distantMesas(g);

  const flags = [];
  for (let i = 0; i < 16; i++) {
    flags.push({ x: 157, z: 102 + i * 3.45, y: 8.2 + (i % 3) * 0.5, p: i * 0.55 });
  }
  const flagGeo = new THREE.PlaneGeometry(1.1, 1.5);
  const flagMat = new THREE.MeshStandardMaterial({ color: 0x9e3529, roughness: 0.9, side: THREE.DoubleSide });
  const flagMesh = new THREE.InstancedMesh(flagGeo, flagMat, flags.length);
  flagMesh.castShadow = false;
  g.add(flagMesh);
  for (const f of flags) {
    for (const dz of [-1.5, 1.5]) cyl(g, 0.05, 0.06, 5.2, 4, M.woodDark, f.x, 5.8, f.z + dz);
  }

  const smokeGeo = new THREE.PlaneGeometry(3.6, 3.6);
  const smokeMat = new THREE.MeshBasicMaterial({ map: makeSmokeTexture(), color: 0xe8e3d4, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide });
  const smoke = new THREE.InstancedMesh(smokeGeo, smokeMat, 7);
  smoke.frustumCulled = false;
  g.add(smoke);

  const visitorGeo = visitorGeometry();
  const visitorMesh = new THREE.InstancedMesh(visitorGeo, new THREE.MeshStandardMaterial({ color: 0x4a4034, roughness: 0.96 }), 7);
  visitorMesh.castShadow = true;
  visitorMesh.receiveShadow = true;
  g.add(visitorMesh);

  const lanternGeo = new THREE.SphereGeometry(0.42, 8, 6);
  lanternGeo.scale(0.85, 1.3, 0.85);
  const lanternMesh = new THREE.InstancedMesh(lanternGeo, M.lantern, 10);
  lanternMesh.castShadow = false;
  g.add(lanternMesh);
  const lanternSpots = [];
  for (let i = 0; i < 5; i++) lanternSpots.push([170.2, 8.9, 112 + i * 7.4]);
  for (let i = 0; i < 5; i++) lanternSpots.push([f56 - 8.7, 11.4, 42 + i * 7.0]);

  const dummy = new THREE.Object3D();
  const life = {
    update(time) {
      flags.forEach((f, i) => {
        dummy.position.set(f.x - 0.25, f.y + 2.1 + Math.sin(time * 1.2 + f.p) * 0.12, f.z);
        dummy.rotation.set(Math.sin(time * 1.8 + f.p) * 0.16, -0.2 + Math.sin(time * 2.2 + f.p) * 0.22, Math.sin(time * 2.6 + f.p) * 0.12);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        flagMesh.setMatrixAt(i, dummy.matrix);
      });
      flagMesh.instanceMatrix.needsUpdate = true;
      for (let i = 0; i < 7; i++) {
        const t = time * 0.24 + i * 0.9;
        const a = i < 4 ? 0 : Math.PI;
        const cx = 161 + Math.cos(t * 0.7 + a) * (i < 4 ? 5 : 9);
        const cz = 124 + Math.sin(t * 0.5 + i) * 2.2;
        dummy.position.set(cx, 3.05, cz);
        dummy.rotation.set(0, Math.sin(t * 1.2 + i) * 0.4 + (i < 4 ? 1.5 : -1.5), 0);
        dummy.scale.setScalar(0.9);
        dummy.updateMatrix();
        visitorMesh.setMatrixAt(i, dummy.matrix);
      }
      visitorMesh.instanceMatrix.needsUpdate = true;
      for (let i = 0; i < 7; i++) {
        const t = (time * 0.16 + i * 0.14) % 1;
        const y = 5.8 + t * 9.0;
        dummy.position.set(162 - 0.35 + Math.sin(time * 0.5 + i * 2) * 0.35 + t * 0.7, y, 124 + Math.sin(time * 0.4 + i) * 0.15);
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
