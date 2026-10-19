import * as THREE from 'three';
import { POND } from './layout.js';
import { RICH_COLLIDERS } from './richPlacement.js';

const RADIUS = 0.4;
const EYE = 1.65;
const WALK = 4.0;
const SPRINT = 7.2;
const GRAVITY = -22;
const JUMP = 6.2;
const SPAWN = { x: 0, z: 74 };
const BOUNDS = { minX: -102.6, maxX: 118, minZ: -81.4, maxZ: 83.4 };
const WATER_MARGIN = 0.7;

const boxes = [];
const circles = [];
const names = [];

function box(x, z, w, d, name) {
  boxes.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
  names.push(name);
}

function circle(x, z, r, name) {
  circles.push({ x, z, r });
  names.push(name);
}

box(-6, 53, 23.5, 12.5, '远香堂');
box(-65, 61, 10.2, 19.2, '卅六鸳鸯馆');
box(-55, 20, 14.5, 10.5, '见山楼');
box(-31, 54, 18.2, 7.2, '香洲');
box(-60, 50, 7.2, 8.2, '小沧浪');
circle(-60, 47, 4.8, '与谁同坐轩');
box(-52, 57, 9.6, 9.6, '宜两亭');
box(-13, 27, 10.0, 10.0, '雪香云蔚亭');
box(19, 27, 10.2, 10.2, '梧竹幽居');
box(98, 78, 12, 8, '兰雪堂');
box(108, 64, 8, 8, '芙蓉榭');
circle(89, 37, 4, '天泉亭');
box(0, 82, 12.4, 8.4, '门厅');
circle(-27, 40, 4.45, '荷风四面亭');


box(-22.35, 64, 0.22, 13.2, '廊桥栏杆');
box(-19.65, 64, 0.22, 13.2, '廊桥栏杆');
box(24.85, 36, 0.16, 8.8, '拱桥栏杆');
box(27.15, 36, 0.16, 8.8, '拱桥栏杆');

const ROCK_CLUSTERS = [
  [-40, 44, 10, 3, 6.8],
  [-62, 50, 8, 8, 6.5],
  [-64, 33, 6, 12, 4.8],
  [18, 28, 6, 15, 6.0],
  [-55, 22, 8, 21, 6.0],
  [30, 58, 5, 27, 4.2],
  [-45, 58, 5, 31, 4.2],
  [-31, 50, 3, 35, 2.4],
  [23, 48, 3, 41, 2.8],
];
for (const [cx, cz, count, seed, spread] of ROCK_CLUSTERS) {
  const rnd = (n) => {
    const v = Math.sin(seed * 33.7 + n * 71.3) * 43758.5453;
    return v - Math.floor(v);
  };
  for (let i = 0; i < count; i++) {
    const px = cx + (rnd(i + 11) - 0.5) * spread;
    const pz = cz + (rnd(i + 17) - 0.5) * spread;
    const rr = (0.8 + rnd(i) * 0.85) * Math.max(0.85 + rnd(i + 2) * 0.75, 0.8 + rnd(i + 8) * 0.7) * 0.62;
    if (Math.hypot(px + 6, pz + 17) < 2.6) continue;
    circle(px, pz, Math.max(0.55, rr), '假山');
  }
}

const walls = [
  [-72.5, -82, 63, 0.9, '北墙'],
  [42.5, -82, 123, 0.9, '北墙'],
  [-104, -5, 0.9, 150, '西墙'],
  [120, -5, 0.9, 150, '东墙'],
  [-61, 84, 118, 0.9, '南墙'],
  [61, 84, 118, 0.9, '南墙'],
  [-30, -82, 22, 0.9, '月洞门'],
  [-103, 50, 0.9, 22, '月洞门'],
];
for (const [x, z, w, d, n] of walls) box(x, z, w, d, n);
for (const c of RICH_COLLIDERS) {
  if (c.type === 'box') box(c.x, c.z, c.w, c.d, c.name);
  else circle(c.x, c.z, c.r, c.name);
}

const ZIGZAG = [
  {
    points: [[-8, 56], [-14, 50], [-18, 46], [-23, 43], [-27, 41]],
    height: 0.54,
    half: 0.82,
  },
  {
    points: [[-27, 40], [-24, 36], [-20, 32], [-16, 29], [-13, 27]],
    height: 0.54,
    half: 0.82,
  },
];

function segDist(px, pz, ax, az, bx, bz) {
  const dx = bx - ax;
  const dz = bz - az;
  const len2 = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / len2));
  return Math.hypot(px - ax - dx * t, pz - az - dz * t);
}

function polyDist(x, z) {
  let min = Infinity;
  for (let i = 0; i < POND.length; i++) {
    const a = POND[i];
    const b = POND[(i + 1) % POND.length];
    min = Math.min(min, segDist(x, z, a[0], a[1], b[0], b[1]));
  }
  return min;
}

function inPond(x, z) {
  let inside = false;
  for (let i = 0, j = POND.length - 1; i < POND.length; j = i++) {
    const xi = POND[i][0];
    const zi = POND[i][1];
    const xj = POND[j][0];
    const zj = POND[j][1];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

function bridgeHeight(x, z) {
  for (const b of ZIGZAG) {
    for (let i = 0; i < b.points.length - 1; i++) {
      const a = b.points[i];
      const c = b.points[i + 1];
      if (segDist(x, z, a[0], a[1], c[0], c[1]) <= b.half) return b.height;
    }
  }
  if (Math.abs(x - 26) <= 1.18 && Math.abs(z - 36) <= 4.35) {
    const t = (z - 36) / 4.25;
    return 0.46 + 1.7 * Math.cos((t * Math.PI) / 2);
  }
  if (Math.abs(x + 21) <= 1.28 && Math.abs(z - 64) <= 6.6) {
    const t = (z - 64) / 6.5;
    return 0.46 + 1.15 * Math.cos((t * Math.PI) / 2);
  }
  return null;
}

const ISLANDS = [
  { x: -27, z: 40, r: 6.05, h: 0.91 },
  { x: -13, z: 27, r: 8.85, h: 1.01 },
  { x: 24, z: 42, r: 3.05, h: 0.76 },
];

function islandHeight(x, z) {
  for (const s of ISLANDS) {
    if (Math.hypot(x - s.x, z - s.z) <= s.r) return s.h;
  }
  return null;
}

function blockedByWater(x, z) {
  if (bridgeHeight(x, z) !== null || islandHeight(x, z) !== null) return false;
  if (inPond(x, z)) return true;
  return polyDist(x, z) < WATER_MARGIN;
}

function groundAt(x, z) {
  const b = bridgeHeight(x, z);
  if (b !== null) return b;
  const i = islandHeight(x, z);
  if (i !== null) return i;
  if (blockedByWater(x, z)) return null;
  return 0;
}

function boxHit(x, z, b, r) {
  const nx = Math.max(b.minX, Math.min(x, b.maxX));
  const nz = Math.max(b.minZ, Math.min(z, b.maxZ));
  const dx = x - nx;
  const dz = z - nz;
  return dx * dx + dz * dz < r * r;
}

function collides(x, z) {
  for (const b of boxes) if (boxHit(x, z, b, RADIUS)) return true;
  for (const c of circles) {
    const dx = x - c.x;
    const dz = z - c.z;
    if (dx * dx + dz * dz < (c.r + RADIUS) * (c.r + RADIUS)) return true;
  }
  return false;
}

function valid(x, z) {
  if (x < BOUNDS.minX || x > BOUNDS.maxX || z < BOUNDS.minZ || z > BOUNDS.maxZ) return false;
  if (collides(x, z)) return false;
  return !blockedByWater(x, z);
}

function pushOut(p) {
  for (let iter = 0; iter < 5; iter++) {
    let moved = false;
    for (const b of boxes) {
      const nx = Math.max(b.minX, Math.min(p.x, b.maxX));
      const nz = Math.max(b.minZ, Math.min(p.z, b.maxZ));
      let dx = p.x - nx;
      let dz = p.z - nz;
      let d = Math.hypot(dx, dz);
      if (d >= RADIUS) continue;
      if (d < 0.0001) {
        const left = p.x - b.minX;
        const right = b.maxX - p.x;
        const back = p.z - b.minZ;
        const front = b.maxZ - p.z;
        const m = Math.min(left, right, back, front);
        if (m === left) p.x = b.minX - RADIUS;
        else if (m === right) p.x = b.maxX + RADIUS;
        else if (m === back) p.z = b.minZ - RADIUS;
        else p.z = b.maxZ + RADIUS;
      } else {
        const push = (RADIUS - d) / d;
        p.x += dx * push;
        p.z += dz * push;
      }
      moved = true;
    }
    for (const c of circles) {
      const dx = p.x - c.x;
      const dz = p.z - c.z;
      const d = Math.hypot(dx, dz);
      const min = c.r + RADIUS;
      if (d >= min) continue;
      if (d < 0.0001) {
        p.x = c.x + min;
      } else {
        p.x = c.x + (dx / d) * min;
        p.z = c.z + (dz / d) * min;
      }
      moved = true;
    }
    if (!moved) break;
  }
}

function sampleGround(x, z) {
  const r = 0.3;
  const pts = [
    [0, 0],
    [r, 0],
    [-r, 0],
    [0, r],
    [0, -r],
    [r * 0.7, r * 0.7],
    [-r * 0.7, -r * 0.7],
  ];
  let best = null;
  for (const [dx, dz] of pts) {
    const h = groundAt(x + dx, z + dz);
    if (h !== null && (best === null || h > best)) best = h;
  }
  return best;
}

export function createFirstPerson({ camera, controls, renderer, canvas, onEnter, onExit }) {
  const btn = document.getElementById('btn-fp');
  const keys = Object.create(null);
  const position = { x: SPAWN.x, z: SPAWN.z };
  const savedPos = new THREE.Vector3();
  const savedTarget = new THREE.Vector3();
  const saved = { near: camera.near, enabled: true, autoRotate: false, order: 'XYZ' };
  let active = false;
  let grounded = true;
  let feetY = 0;
  let vy = 0;
  let yaw = 0;
  let pitch = 0;
  let pointerLocked = false;
  let wasLocked = false;
  let dragging = false;
  let dragX = 0;
  let dragY = 0;
  let lockRequested = false;

  function requestLock() {
    if (!canvas.requestPointerLock) return;
    try {
      const p = canvas.requestPointerLock();
      if (p && p.catch) p.catch(() => {});
      lockRequested = true;
    } catch (err) {
      lockRequested = false;
    }
  }

  function applyCamera() {
    camera.position.set(position.x, feetY + EYE, position.z);
    camera.rotation.set(pitch, yaw, 0, 'YXZ');
  }

  function setActiveUI(on) {
    document.body.classList.toggle('fp-active', on);
    if (btn) {
      btn.classList.toggle('active', on);
      btn.textContent = on ? '退出漫游' : '第一人称漫游';
    }
  }

  function enter() {
    if (active) return;
    savedPos.copy(camera.position);
    savedTarget.copy(controls.target);
    saved.near = camera.near;
    saved.enabled = controls.enabled;
    saved.autoRotate = controls.autoRotate;
    saved.order = camera.rotation.order;
    if (onEnter) onEnter();
    active = true;
    position.x = SPAWN.x;
    position.z = SPAWN.z;
    yaw = 0;
    pitch = 0;
    vy = 0;
    const h = sampleGround(SPAWN.x, SPAWN.z);
    feetY = h === null ? 0 : h;
    grounded = true;
    camera.near = 0.12;
    camera.updateProjectionMatrix();
    camera.rotation.order = 'YXZ';
    controls.enabled = false;
    controls.autoRotate = false;
    applyCamera();
    setActiveUI(true);
    requestLock();
  }

  function exit() {
    if (!active) return;
    active = false;
    dragging = false;
    keys.KeyW = keys.KeyA = keys.KeyS = keys.KeyD = keys.Space = false;
    if (document.pointerLockElement === canvas && document.exitPointerLock) document.exitPointerLock();
    pointerLocked = false;
    wasLocked = false;
    camera.near = saved.near;
    camera.updateProjectionMatrix();
    camera.position.copy(savedPos);
    camera.rotation.order = saved.order;
    controls.target.copy(savedTarget);
    controls.enabled = saved.enabled;
    controls.autoRotate = saved.autoRotate;
    const rb = document.getElementById('btn-rotate');
    if (rb) rb.classList.toggle('active', saved.autoRotate);
    controls.update();
    setActiveUI(false);
    if (onExit) onExit();
  }

  function jump() {
    if (!active || !grounded) return false;
    vy = JUMP;
    grounded = false;
    return true;
  }

  function teleport(x, z, y) {
    position.x = Math.max(BOUNDS.minX, Math.min(BOUNDS.maxX, x));
    position.z = Math.max(BOUNDS.minZ, Math.min(BOUNDS.maxZ, z));
    const g = sampleGround(position.x, position.z);
    feetY = typeof y === 'number' ? y : g === null ? 0 : g;
    grounded = g !== null && Math.abs(feetY - g) < 0.65;
    vy = 0;
    applyCamera();
    return getPosition();
  }

  function getPosition() {
    return {
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z,
      feetY,
      ground: sampleGround(position.x, position.z),
      grounded,
      yaw,
      pitch,
    };
  }

  function update(dt) {
    if (!active) return;
    dt = Math.max(0, Math.min(dt, 0.05));
    const fwd = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0);
    const side = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
    let mx = 0;
    let mz = 0;
    if (fwd || side) {
      const fx = -Math.sin(yaw);
      const fz = -Math.cos(yaw);
      const rx = Math.cos(yaw);
      const rz = -Math.sin(yaw);
      mx = fx * fwd + rx * side;
      mz = fz * fwd + rz * side;
      const len = Math.hypot(mx, mz);
      mx /= len;
      mz /= len;
    }
    const speed = keys.ShiftLeft || keys.ShiftRight ? SPRINT : WALK;
    const dist = Math.hypot(mx, mz) * speed * dt;
    if (dist > 0) {
      const steps = Math.max(1, Math.ceil(dist / 0.1));
      const sx = (mx * speed * dt) / steps;
      const sz = (mz * speed * dt) / steps;
      for (let i = 0; i < steps; i++) {
        if (valid(position.x + sx, position.z)) position.x += sx;
        if (valid(position.x, position.z + sz)) position.z += sz;
      }
      pushOut(position);
    }

    const g = sampleGround(position.x, position.z);
    if (grounded) {
      if (g === null) {
        grounded = false;
        vy = 0;
      } else if (g - feetY > 0.62) {
        grounded = false;
        vy = 0;
      } else if (feetY - g > 0.62) {
        grounded = false;
        vy = 0;
      } else {
        feetY = g;
        vy = 0;
      }
    }
    if (!grounded) {
      vy += GRAVITY * dt;
      feetY += vy * dt;
      const land = sampleGround(position.x, position.z);
      if (land !== null && feetY <= land) {
        feetY = land;
        vy = 0;
        grounded = true;
      }
    }
    applyCamera();
  }

  if (btn) {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (active) exit();
      else enter();
    });
  }

  document.addEventListener('pointerlockchange', () => {
    const locked = document.pointerLockElement === canvas;
    pointerLocked = locked;
    if (!active) return;
    if (locked) {
      wasLocked = true;
    } else if (wasLocked) {
      wasLocked = false;
      exit();
    }
  });

  document.addEventListener('pointerlockerror', () => {
    pointerLocked = false;
    lockRequested = false;
  });

  canvas.addEventListener('pointerdown', (e) => {
    if (!active || e.button !== 0) return;
    dragging = true;
    dragX = e.clientX;
    dragY = e.clientY;
    if (!pointerLocked) requestLock();
  });

  window.addEventListener('pointerup', () => {
    dragging = false;
  });

  document.addEventListener('mousemove', (e) => {
    if (!active) return;
    const locked = document.pointerLockElement === canvas;
    if (locked) {
      yaw -= (e.movementX || 0) * 0.0022;
      pitch -= (e.movementY || 0) * 0.0022;
    } else if (dragging) {
      yaw -= (e.clientX - dragX) * 0.0042;
      pitch -= (e.clientY - dragY) * 0.0042;
      dragX = e.clientX;
      dragY = e.clientY;
    } else {
      return;
    }
    pitch = Math.max(-1.35, Math.min(1.35, pitch));
  });

  window.addEventListener('keydown', (e) => {
    if (!active) return;
    if (e.code === 'Escape') {
      exit();
      return;
    }
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ShiftLeft', 'ShiftRight'].includes(e.code)) {
      e.preventDefault();
    }
    if (e.code === 'Space') {
      if (!e.repeat) jump();
      return;
    }
    keys[e.code] = true;
  });

  window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
  });

  window.addEventListener('blur', () => {
    for (const k of Object.keys(keys)) keys[k] = false;
    dragging = false;
  });

  const api = {
    enter,
    exit,
    isActive: () => active,
    update,
    getPosition,
    jump,
    teleport,
    groundAt,
    sampleGround,
    colliders: {
      boxes,
      circles,
      names,
      bounds: BOUNDS,
      pond: POND,
      bridges: ZIGZAG,
      islands: ISLANDS,
      radius: RADIUS,
      eyeHeight: EYE,
      waterMargin: WATER_MARGIN,
    },
    setLook: (y, p = 0) => {
      yaw = y;
      pitch = Math.max(-1.35, Math.min(1.35, p));
      if (active) applyCamera();
    },
    getState: () => ({ active, grounded, vy, feetY, pointerLocked, near: camera.near }),
  };
  return api;
}
