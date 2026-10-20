import * as THREE from 'three';
import { mats } from './materials.js';
import { GROUND, WALL_HEIGHT, FORTRESS, box, cyl, makeHipRoof, scaleUV } from './fortress.js';

function localPush(push, mat, geo, x, z, yaw, baseY, scale = 1) {
  if (scale !== 1) geo.scale(scale, scale, scale);
  geo.rotateY(yaw);
  geo.translate(x, baseY, z);
  push(mat, geo);
}

function roofCornerTips(push, mat, w, d, y, yaw, x, z, baseY, scale, sign) {
  const dirs = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  for (const [sx, sz] of dirs) {
    const tip = new THREE.BoxGeometry(2.4, 0.2, 0.4);
    tip.rotateZ(sx * 0.4);
    tip.rotateY(Math.atan2(sz * d, sx * w));
    tip.translate(sx * w * 0.46, y + 0.16, sz * d * 0.46);
    localPush(push, mat, tip, x, z, yaw, baseY, scale);
  }
}

function addRoof(push, local, w, d, h, y, x, z, yaw, baseY, scale, goldTips = true) {
  const geo = makeHipRoof(w, d, h);
  geo.translate(0, y, 0);
  localPush(push, mats.roof, geo, x, z, yaw, baseY, scale);
  const ridge = new THREE.BoxGeometry(w * 0.66, 0.28, 0.32);
  ridge.translate(0, y + h + 0.08, 0);
  localPush(push, mats.stoneDark, ridge, x, z, yaw, baseY, scale);
  if (goldTips) {
    roofCornerTips(push, mats.gold, w, d, y, yaw, x, z, baseY, scale, 1);
  }
}

function addRailing(push, local, w, d, y, x, z, yaw, baseY, scale) {
  const postH = 0.85;
  for (let i = -4; i <= 4; i++) {
    const lx = (i / 4) * w * 0.46;
    const p1 = new THREE.BoxGeometry(0.12, postH, 0.12);
    p1.translate(lx, y + postH / 2, d * 0.47);
    localPush(push, mats.column, p1, x, z, yaw, baseY, scale);
    const p2 = p1.clone();
    p2.translate(0, 0, -d * 0.94);
    localPush(push, mats.column, p2, x, z, yaw, baseY, scale);
  }
  const rail = new THREE.BoxGeometry(w * 0.94, 0.1, 0.12);
  rail.translate(0, y + postH, d * 0.47);
  localPush(push, mats.wood, rail, x, z, yaw, baseY, scale);
  const rail2 = rail.clone();
  rail2.translate(0, 0, -d * 0.94);
  localPush(push, mats.wood, rail2, x, z, yaw, baseY, scale);
  const side1 = new THREE.BoxGeometry(0.12, 0.1, d * 0.94);
  side1.translate(w * 0.47, y + postH, 0);
  localPush(push, mats.wood, side1, x, z, yaw, baseY, scale);
  const side2 = side1.clone();
  side2.translate(-w * 0.94, 0, 0);
  localPush(push, mats.wood, side2, x, z, yaw, baseY, scale);
}

function addLanterns(push, local, x, z, yaw, baseY, scale, y, spread) {
  for (const side of [-1, 1]) {
    const lx = side * spread;
    const lz = 4.4;
    const line = new THREE.BoxGeometry(0.05, 0.8, 0.05);
    line.translate(lx, y + 0.4, lz);
    localPush(push, mats.iron, line, x, z, yaw, baseY, scale);
    const body = new THREE.CylinderGeometry(0.34, 0.28, 0.72, 10);
    body.translate(lx, y - 0.36, lz);
    localPush(push, mats.lantern, body, x, z, yaw, baseY, scale);
    const cap = new THREE.CylinderGeometry(0.12, 0.36, 0.12, 10);
    cap.translate(lx, y + 0.02, lz);
    localPush(push, mats.gold, cap, x, z, yaw, baseY, scale);
    const tassel = new THREE.CylinderGeometry(0.04, 0.04, 0.5, 5);
    tassel.translate(lx, y - 0.95, lz);
    localPush(push, mats.gold, tassel, x, z, yaw, baseY, scale);
  }
}

function addGateTower(push, def) {
  const { x, z, yaw, scale = 1 } = def;
  const baseY = GROUND + WALL_HEIGHT;
  const small = def.kind === 'barbican';
  const tiers = small ? 1 : 2;
  const brickW = small ? 9 : 12.4;
  const brickD = small ? 7 : 8.4;
  const baseW = brickW + 3;
  const baseD = brickD + 2.6;

  localPush(push, mats.stone, (() => { const g = new THREE.BoxGeometry(baseW, 2.0, baseD); g.translate(0, 1.0, 0); return g; })(), x, z, yaw, baseY, scale);
  localPush(push, mats.brick, (() => { const g = new THREE.BoxGeometry(brickW, 5.2, brickD); g.translate(0, 2.0 + 2.6, 0); return scaleUV(g, 3.2, 1.6); })(), x, z, yaw, baseY, scale);

  const colX = brickW / 2 - 0.35;
  const colZ = brickD / 2 - 0.3;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const g = cyl(0.32, 0.38, 5.2, 8, sx * colX, 4.6, sz * colZ);
      localPush(push, mats.column, g, x, z, yaw, baseY, scale);
    }
  }
  for (const sx of [-1, 1]) {
    const beam = new THREE.BoxGeometry(0.55, 0.45, brickD + 0.6);
    beam.translate(sx * colX, 7.3, 0);
    localPush(push, mats.wood, beam, x, z, yaw, baseY, scale);
  }
  const door = new THREE.BoxGeometry(small ? 2.4 : 3.4, 3.8, 0.24);
  door.translate(0, 3.9, brickD / 2 + 0.02);
  localPush(push, mats.door, door, x, z, yaw, baseY, scale);
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const stud = new THREE.CylinderGeometry(0.07, 0.07, 0.12, 6);
      stud.rotateX(Math.PI / 2);
      stud.translate((c - 1.5) * (small ? 0.46 : 0.68), 2.8 + r * 0.72, brickD / 2 + 0.16);
      localPush(push, mats.iron, stud, x, z, yaw, baseY, scale);
    }
  }
  const plaqueMat = mats[def.plaque || 'plaqueJiayu'];
  if (plaqueMat) {
    const pg = new THREE.PlaneGeometry(small ? 2.6 : 4.2, small ? 1.0 : 1.55);
    pg.translate(0, 6.35, brickD / 2 + 0.07);
    localPush(push, plaqueMat, pg, x, z, yaw, baseY, scale);
  }

  addRoof(push, null, baseW + 4.6, baseD + 4.0, 1.7, 7.55, x, z, yaw, baseY, scale);
  addLanterns(push, null, x, z, yaw, baseY, scale, 6.85, brickW * 0.34);

  if (tiers >= 1) {
    const secondW = brickW * 0.78;
    const secondD = brickD * 0.78;
    const secondY = 9.1;
    const body2 = new THREE.BoxGeometry(secondW, 3.7, secondD);
    body2.translate(0, secondY + 1.85, 0);
    localPush(push, mats.wood, body2, x, z, yaw, baseY, scale);
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const g = cyl(0.24, 0.28, 3.7, 8, sx * (secondW / 2 - 0.2), secondY + 1.85, sz * (secondD / 2 - 0.18));
        localPush(push, mats.column, g, x, z, yaw, baseY, scale);
      }
    }
    const win = new THREE.BoxGeometry(secondW * 0.62, 1.5, 0.14);
    win.translate(0, secondY + 1.9, secondD / 2 + 0.02);
    localPush(push, mats.dark, win, x, z, yaw, baseY, scale);
    addRailing(push, null, secondW + 1.2, secondD + 1.2, 8.6, x, z, yaw, baseY, scale);
    addRoof(push, null, secondW + 5.0, secondD + 4.4, 1.5, secondY + 3.7, x, z, yaw, baseY, scale);
  }

  const thirdW = brickW * 0.55;
  const thirdD = brickD * 0.56;
  const thirdY = 13.7;
  const body3 = new THREE.BoxGeometry(thirdW, 2.9, thirdD);
  body3.translate(0, thirdY + 1.45, 0);
  localPush(push, mats.wood, body3, x, z, yaw, baseY, scale);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const g = cyl(0.2, 0.23, 2.9, 8, sx * (thirdW / 2 - 0.16), thirdY + 1.45, sz * (thirdD / 2 - 0.14));
      localPush(push, mats.column, g, x, z, yaw, baseY, scale);
    }
  }
  const win3 = new THREE.BoxGeometry(thirdW * 0.58, 1.1, 0.12);
  win3.translate(0, thirdY + 1.5, thirdD / 2 + 0.02);
  localPush(push, mats.dark, win3, x, z, yaw, baseY, scale);
  addRoof(push, null, thirdW + 4.2, thirdD + 3.8, 1.9, thirdY + 2.9, x, z, yaw, baseY, scale);
  const finial = new THREE.CylinderGeometry(0.06, 0.16, 1.3, 6);
  finial.translate(0, thirdY + 2.9 + 1.9 + 0.55, 0);
  localPush(push, mats.gold, finial, x, z, yaw, baseY, scale);
}

function addCornerTower(push, def) {
  const { x, z, yaw, scale = 0.72 } = def;
  const baseY = GROUND + WALL_HEIGHT;
  localPush(push, mats.stone, (() => { const g = new THREE.BoxGeometry(9.4, 1.6, 9.4); g.translate(0, 0.8, 0); return g; })(), x, z, yaw, baseY, scale);
  localPush(push, mats.brick, (() => { const g = new THREE.BoxGeometry(8.0, 4.4, 8.0); g.translate(0, 1.6 + 2.2, 0); return scaleUV(g, 2.2, 1.4); })(), x, z, yaw, baseY, scale);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const g = cyl(0.26, 0.3, 4.4, 8, sx * 3.55, 3.8, sz * 3.55);
      localPush(push, mats.column, g, x, z, yaw, baseY, scale);
    }
  }
  const door = new THREE.BoxGeometry(1.8, 2.8, 0.16);
  door.translate(0, 2.6, 4.03);
  localPush(push, mats.door, door, x, z, yaw, baseY, scale);
  addRoof(push, null, 12.2, 12.2, 1.4, 6.0, x, z, yaw, baseY, scale);
  addRoof(push, null, 7.6, 7.6, 1.5, 8.9, x, z, yaw, baseY, scale);
  const win = new THREE.BoxGeometry(2.4, 1.0, 0.1);
  win.translate(0, 5.0, 4.05);
  localPush(push, mats.dark, win, x, z, yaw, baseY, scale);
}

function addWatchTower(push, def) {
  const { x, z, yaw, scale = 0.5 } = def;
  const baseY = GROUND + WALL_HEIGHT;
  localPush(push, mats.stone, (() => { const g = new THREE.BoxGeometry(7.6, 1.0, 7.6); g.translate(0, 0.5, 0); return g; })(), x, z, yaw, baseY, scale);
  localPush(push, mats.earth, (() => { const g = new THREE.BoxGeometry(6.2, 4.6, 6.2); g.translate(0, 1.0 + 2.3, 0); return scaleUV(g, 1.8, 1.2); })(), x, z, yaw, baseY, scale);
  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j += 2) {
      if (i === 0 && j === 1) continue;
      const m = new THREE.BoxGeometry(1.2, 1.0, 0.5);
      m.translate(i * 1.8, 5.9, j * 3.0);
      localPush(push, mats.earthDark, m, x, z, yaw, baseY, scale);
    }
  }
  const cap = new THREE.BoxGeometry(6.6, 0.18, 6.6);
  cap.translate(0, 5.25, 0);
  localPush(push, mats.stoneDark, cap, x, z, yaw, baseY, scale);
  const pole = new THREE.CylinderGeometry(0.08, 0.1, 3.2, 5);
  pole.translate(0, 7.0, 0);
  localPush(push, mats.iron, pole, x, z, yaw, baseY, scale);
}

export function createTowers(push) {
  const labels = [];
  const gate = (def) => {
    addGateTower(push, def);
    if (def.label) labels.push({ x: def.x, y: GROUND + WALL_HEIGHT + 26 * (def.scale || 1), z: def.z, key: def.label });
  };

  gate({ x: FORTRESS.W, z: 0, yaw: Math.PI / 2, kind: 'guanghua', plaque: 'plaqueGuanghua', label: 'labelGuanghua', scale: 1.0 });
  gate({ x: -FORTRESS.W, z: 0, yaw: -Math.PI / 2, kind: 'rouyuan', plaque: 'plaqueRouyuan', label: 'labelRouyuan', scale: 1.0 });
  gate({ x: FORTRESS.BW, z: 0, yaw: Math.PI / 2, kind: 'barbican', plaque: 'plaqueChaozong', scale: 0.62 });

  for (const [x, z] of [[FORTRESS.W, FORTRESS.D], [-FORTRESS.W, FORTRESS.D], [FORTRESS.W, -FORTRESS.D], [-FORTRESS.W, -FORTRESS.D]]) {
    addCornerTower(push, { x, z, yaw: x > 0 ? -Math.PI / 4 : Math.PI / 4, scale: 0.74 });
  }
  addWatchTower(push, { x: 0, z: FORTRESS.D, yaw: 0, scale: 0.58 });
  addWatchTower(push, { x: 0, z: -FORTRESS.D, yaw: 0, scale: 0.58 });
  addWatchTower(push, { x: 50, z: -FORTRESS.D, yaw: 0, scale: 0.5 });
  addWatchTower(push, { x: -50, z: FORTRESS.D, yaw: 0, scale: 0.5 });

  return labels;
}
