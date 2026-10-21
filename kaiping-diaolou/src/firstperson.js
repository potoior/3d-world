import * as THREE from 'three';
import { KAIPING_FP_WORLD as FP_WORLD } from './kaiping.js';

const RADIUS = 0.42;
const EYE = 1.65;
const WALK = 4.2;
const SPRINT = 7.6;
const GRAVITY = -22;
const JUMP = 6.4;
const WATER_MARGIN = 1.0;

const W = FP_WORLD;
const BOUNDS = W.bounds;
const SPAWN = W.spawn;
const boxes = W.colliders.boxes;
const circles = W.colliders.circles;

const causeways = W.causeways.map((c) => {
  const curve = new THREE.CatmullRomCurve3(c.points.map((p) => new THREE.Vector3(p[0], 0, p[1])), false, 'catmullrom', 0.25);
  return { ...c, pts: curve.getSpacedPoints(90) };
});

function segDist(px, pz, ax, az, bx, bz) {
  const dx = bx - ax;
  const dz = bz - az;
  const len2 = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / len2));
  return Math.hypot(px - ax - dx * t, pz - az - dz * t);
}

function polyDist(x, z) {
  const p = W.lake;
  let min = Infinity;
  for (let i = 0; i < p.length; i++) {
    const a = p[i];
    const b = p[(i + 1) % p.length];
    min = Math.min(min, segDist(x, z, a[0], a[1], b[0], b[1]));
  }
  return min;
}

function inLake(x, z) {
  const p = W.lake;
  let inside = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const xi = p[i][0];
    const zi = p[i][1];
    const xj = p[j][0];
    const zj = p[j][1];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

function bridgeHeight(x, z) {
  for (const b of W.bridges) {
    const dx = x - b.x;
    const dz = z - b.z;
    const lx = dx * Math.cos(b.rot) - dz * Math.sin(b.rot);
    const lz = dx * Math.sin(b.rot) + dz * Math.cos(b.rot);
    if (Math.abs(lx) > b.width * 0.5 - 0.15) continue;
    if (Math.abs(lz) > b.span * 0.5) continue;
    const t = lz / (b.span * 0.5);
    return b.baseY + 0.35 + b.rise * Math.cos(t * Math.PI * 0.5);
  }
  return null;
}

function causewayHeight(x, z) {
  for (const c of causeways) {
    const half = c.width * 0.5 - 0.2;
    for (let i = 0; i < c.pts.length - 1; i++) {
      const a = c.pts[i];
      const b = c.pts[i + 1];
      if (segDist(x, z, a.x, a.z, b.x, b.z) <= half) return c.y;
    }
  }
  return null;
}

function isletHeight(x, z) {
  for (const s of W.islets) {
    const dx = (x - s.x) / (s.rx - 0.7);
    const dz = (z - s.z) / (s.rz - 0.7);
    if (dx * dx + dz * dz <= 1) return s.h;
  }
  return null;
}

function onCausewayOrBridge(x, z) {
  return bridgeHeight(x, z) !== null || causewayHeight(x, z) !== null;
}

function inWaterRect(x, z) {
  const rects = W.waterRects || [];
  for (const r of rects) {
    if (x > r.minX && x < r.maxX && z > r.minZ && z < r.maxZ) return true;
  }
  return false;
}

function blockedByWater(x, z) {
  if (onCausewayOrBridge(x, z) || isletHeight(x, z) !== null) return false;
  if (inWaterRect(x, z)) return true;
  if (W.lake.length && inLake(x, z)) return true;
  if (W.lake.length && polyDist(x, z) < WATER_MARGIN) return true;
  return false;
}

function groundAt(x, z) {
  const b = bridgeHeight(x, z);
  if (b !== null) return b;
  const c = causewayHeight(x, z);
  if (c !== null) return c;
  const i = isletHeight(x, z);
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
      const dx = p.x - nx;
      const dz = p.z - nz;
      const d = Math.hypot(dx, dz);
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
      if (d < 0.0001) p.x = c.x + min;
      else {
        p.x = c.x + (dx / d) * min;
        p.z = c.z + (dz / d) * min;
      }
      moved = true;
    }
    if (!moved) break;
  }
}

function sampleGround(x, z) {
  const r = 0.32;
  const pts = [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r], [r * 0.7, r * 0.7], [-r * 0.7, -r * 0.7]];
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
  let yaw = SPAWN.yaw || 0;
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
    yaw = SPAWN.yaw || 0;
    pitch = -0.05;
    vy = 0;
    const h = sampleGround(SPAWN.x, SPAWN.z);
    feetY = h === null ? 0.55 : h;
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
    grounded = g !== null && Math.abs(feetY - g) < 0.7;
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
      if (g === null || g - feetY > 0.68 || feetY - g > 0.68) {
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
    if (locked) wasLocked = true;
    else if (wasLocked) {
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
    } else return;
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
      names: W.colliders.names,
      bounds: BOUNDS,
      lake: W.lake,
      bridges: W.bridges,
      islets: W.islets,
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
