import * as THREE from 'three';
import { POND, EXTRA_PONDS, COLLIDERS, BRIDGES, ISLANDS, SPAWN, BOUNDS } from './layout.js';

const RADIUS = 0.4;
const EYE = 1.65;
const WALK = 4.0;
const SPRINT = 7.2;
const GRAVITY = -22;
const JUMP = 6.2;
const WATER_MARGIN = 0.7;

const boxes = [];
const circles = [];
const names = [];

for (const c of COLLIDERS) {
  if (c.type === 'box') {
    boxes.push({
      minX: c.x - c.w / 2,
      maxX: c.x + c.w / 2,
      minZ: c.z - c.d / 2,
      maxZ: c.z + c.d / 2,
    });
    names.push(c.name);
  } else {
    circles.push({ x: c.x, z: c.z, r: c.r });
    names.push(c.name);
  }
}

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

function inExtraPond(x, z) {
  for (const p of EXTRA_PONDS) {
    if (Math.hypot(x - p.x, z - p.z) < p.r) return true;
  }
  return false;
}

function bridgeHeight(x, z) {
  for (const b of BRIDGES) {
    if (b.type === 'arch') {
      if (Math.abs(x - b.x) <= b.width / 2 && Math.abs(z - b.z) <= b.span / 2) {
        const t = (z - b.z) / (b.span / 2);
        return 0.46 + b.rise * Math.cos((t * Math.PI) / 2);
      }
      continue;
    }
    for (let i = 0; i < b.points.length - 1; i++) {
      const a = b.points[i];
      const c = b.points[i + 1];
      if (segDist(x, z, a[0], a[1], c[0], c[1]) <= b.half) return b.height;
    }
  }
  return null;
}

function islandHeight(x, z) {
  for (const s of ISLANDS) {
    if (Math.hypot(x - s.x, z - s.z) <= s.r) return s.h;
  }
  return null;
}

function blockedByWater(x, z) {
  if (bridgeHeight(x, z) !== null || islandHeight(x, z) !== null) return false;
  if (inPond(x, z) || inExtraPond(x, z)) return true;
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
    [0, 0], [r, 0], [-r, 0], [0, r], [0, -r],
    [r * 0.7, r * 0.7], [-r * 0.7, -r * 0.7],
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
      bridges: BRIDGES,
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
