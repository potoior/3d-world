import * as THREE from 'three';
import { terrainHeight, isWater } from './terrain.js';

const EYE = 1.65;
const RADIUS = 0.4;
const WALK = 4.5;
const SPRINT = 8.0;
const GRAVITY = -22;
const JUMP_SPEED = 6.2;
const MAX_STEP = 0.62;
const BOUNDS = { minX: -1300, maxX: 2200, minZ: -1400, maxZ: 1200 };
const START = { x: -480, z: 30, yaw: -1.35, pitch: -0.03 };
const ISLAND = { cx: -382, cz: -8, half: 13 };
const ISLAND_BASE = terrainHeight(ISLAND.cx, ISLAND.cz);
const ISLAND_Y = ISLAND_BASE + 3.0;
const BRIDGE = {
  x0: -448,
  x1: -394,
  z: -8,
  halfZ: 2.8,
  deckY: ISLAND_Y,
  stairStart: -474,
};

const colliders = [
  { name: '长天楼', minX: -417, maxX: -391, minZ: 55, maxZ: 93 },
  { name: '听涛轩', minX: -383, maxX: -361, minZ: 139, maxZ: 161 },
  { name: '行吟阁', minX: -392, maxX: -372, minZ: -18, maxZ: 2 },
  { name: '楚天台', minX: 583, maxX: 617, minZ: -127, maxZ: -93 },
  { name: '楚城', minX: 458, maxX: 478, minZ: -170, maxZ: -108 },
  { name: '樱园', minX: -330, maxX: -314, minZ: 732, maxZ: 744 },
  { name: '楚天台观景台', minX: 588, maxX: 612, minZ: -146, maxZ: -132 },
  { name: '行吟阁码头', minX: -381, maxX: -353, minZ: 1, maxZ: 8 },
];

const GREENWAY = [
  [-452, -680], [-446, -640], [-454, -600], [-462, -560],
  [-462, -520], [-444, -480], [-450, -440], [-472, -400],
  [-514, -360], [-532, -320], [-544, -280], [-546, -240],
  [-412, -200], [-418, -160], [-444, -120], [-454, -80],
  [-452, -40], [-462, -8], [-450, 22], [-388, 52],
  [-380, 82], [-366, 120], [-348, 160], [-346, 200],
  [-354, 240], [-360, 280], [-440, 310], [-438, 340],
  [-426, 370], [-392, 400], [-436, 440], [-482, 480],
  [-562, 520], [-650, 560],
];
const PATH_HALF = 3.2;

function insideAABB(x, z, c, pad = RADIUS) {
  return x > c.minX - pad && x < c.maxX + pad && z > c.minZ - pad && z < c.maxZ + pad;
}

function hitsCollider(x, z) {
  for (let i = 0; i < colliders.length; i++) {
    if (insideAABB(x, z, colliders[i])) return true;
  }
  return false;
}

function bridgeGround(x, z) {
  if (Math.abs(z - BRIDGE.z) > BRIDGE.halfZ) return null;
  if (x >= BRIDGE.x0 && x <= BRIDGE.x1) return BRIDGE.deckY;
  if (x >= BRIDGE.stairStart && x < BRIDGE.x0) {
    const t = (x - BRIDGE.stairStart) / (BRIDGE.x0 - BRIDGE.stairStart);
    const base = terrainHeight(BRIDGE.stairStart, BRIDGE.z) + 0.25;
    return THREE.MathUtils.lerp(base, BRIDGE.deckY, t);
  }
  return null;
}

function islandGround(x, z) {
  if (Math.abs(x - ISLAND.cx) <= ISLAND.half && Math.abs(z - ISLAND.cz) <= ISLAND.half) {
    return ISLAND_Y;
  }
  return null;
}

function pathInfo(x, z) {
  let best = Infinity;
  let py = 0;
  for (let i = 0; i < GREENWAY.length - 1; i++) {
    const ax = GREENWAY[i][0];
    const az = GREENWAY[i][1];
    const bx = GREENWAY[i + 1][0];
    const bz = GREENWAY[i + 1][1];
    const dx = bx - ax;
    const dz = bz - az;
    const len2 = dx * dx + dz * dz;
    const t = THREE.MathUtils.clamp(((x - ax) * dx + (z - az) * dz) / len2, 0, 1);
    const px = ax + dx * t;
    const pz = az + dz * t;
    const d = Math.hypot(x - px, z - pz);
    if (d < best) {
      best = d;
      py = Math.max(0.6, terrainHeight(px, pz) + 0.3);
    }
  }
  return [best, py];
}

function terrainAround(x, z) {
  const r = RADIUS + 0.1;
  const d = r * 0.72;
  let h = terrainHeight(x, z);
  h = Math.max(h, terrainHeight(x + r, z), terrainHeight(x - r, z));
  h = Math.max(h, terrainHeight(x, z + r), terrainHeight(x, z - r));
  h = Math.max(h, terrainHeight(x + d, z + d), terrainHeight(x - d, z + d));
  h = Math.max(h, terrainHeight(x + d, z - d), terrainHeight(x - d, z - d));
  return h;
}

function groundAt(x, z) {
  let h = terrainAround(x, z);
  const b = bridgeGround(x, z);
  if (b !== null) h = Math.max(h, b);
  const island = islandGround(x, z);
  if (island !== null) h = Math.max(h, island);
  const [pd, py] = pathInfo(x, z);
  if (pd <= PATH_HALF) h = Math.max(h, py);
  return h;
}

function onPath(x, z) {
  return pathInfo(x, z)[0] <= PATH_HALF;
}

function validStart(x, z) {
  return !isWater(x, z, 0.2) && !hitsCollider(x, z) && groundAt(x, z) > 0.8;
}

let startX = START.x;
let startZ = START.z;
if (!validStart(startX, startZ)) {
  outer: for (let r = 2; r <= 40; r += 2) {
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const x = START.x + Math.cos(a) * r;
      const z = START.z + Math.sin(a) * r;
      if (validStart(x, z)) {
        startX = x;
        startZ = z;
        break outer;
      }
    }
  }
}

function canStand(x, z, fromGround, grounded) {
  if (x < BOUNDS.minX || x > BOUNDS.maxX || z < BOUNDS.minZ || z > BOUNDS.maxZ) return false;
  const bridge = bridgeGround(x, z);
  if (hitsCollider(x, z)) return false;
  if (isWater(x, z, 0.2) && bridge === null && !onPath(x, z)) return false;
  const g = groundAt(x, z);
  if (grounded && g - fromGround > MAX_STEP) return false;
  return true;
}

function pushOut(x, z) {
  for (let iter = 0; iter < 4; iter++) {
    let moved = false;
    for (let i = 0; i < colliders.length; i++) {
      const c = colliders[i];
      if (!insideAABB(x, z, c)) continue;
      const dl = x - (c.minX - RADIUS);
      const dr = c.maxX + RADIUS - x;
      const db = z - (c.minZ - RADIUS);
      const dt = c.maxZ + RADIUS - z;
      const m = Math.min(dl, dr, db, dt);
      if (m === dl) x = c.minX - RADIUS;
      else if (m === dr) x = c.maxX + RADIUS;
      else if (m === db) z = c.minZ - RADIUS;
      else z = c.maxZ + RADIUS;
      moved = true;
    }
    if (!moved) break;
  }
  return [x, z];
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

export function createFirstPerson({ camera, controls, canvas, onEnter, onExit }) {
  const btn = document.getElementById('btn-walk');
  const hint = document.querySelector('.fp-hint');
  const hintDefault = hint ? hint.textContent : '';
  const keys = new Set();
  const saved = {
    pos: new THREE.Vector3(),
    quat: new THREE.Quaternion(),
    target: new THREE.Vector3(),
    autoRotate: false,
    enabled: true,
    near: camera.near,
  };
  const state = {
    active: false,
    x: startX,
    z: startZ,
    y: groundAt(startX, startZ),
    ground: groundAt(startX, startZ),
    vy: 0,
    grounded: true,
    yaw: START.yaw,
    pitch: START.pitch,
    dip: 0,
  };
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let everLocked = false;
  let jumpQueued = false;

  function applyLook(dx, dy) {
    state.yaw -= dx * 0.0022;
    state.pitch = clamp(state.pitch - dy * 0.0022, -1.45, 1.45);
  }

  function syncCamera() {
    camera.position.set(state.x, state.y + EYE - state.dip, state.z);
    camera.rotation.order = 'YXZ';
    camera.rotation.set(state.pitch, state.yaw, 0);
  }

  function performMove(dx, dz) {
    const dist = Math.hypot(dx, dz);
    if (dist < 1e-8) return;
    const steps = Math.max(1, Math.ceil(dist / 0.12));
    const sx = dx / steps;
    const sz = dz / steps;
    for (let i = 0; i < steps; i++) {
      const g0 = groundAt(state.x, state.z);
      const nx = state.x + sx;
      if (canStand(nx, state.z, g0, state.grounded)) state.x = nx;
      const g1 = groundAt(state.x, state.z);
      const nz = state.z + sz;
      if (canStand(state.x, nz, g1, state.grounded)) state.z = nz;
      const [px, pz] = pushOut(state.x, state.z);
      if (px !== state.x || pz !== state.z) {
        if (!isWater(px, pz, 0.2) || bridgeGround(px, pz) !== null || onPath(px, pz)) {
          state.x = px;
          state.z = pz;
        }
      }
    }
  }

  function enter() {
    if (state.active) return true;
    if (onEnter) onEnter();
    saved.pos.copy(camera.position);
    saved.quat.copy(camera.quaternion);
    saved.target.copy(controls.target);
    saved.autoRotate = controls.autoRotate;
    saved.enabled = controls.enabled;
    saved.near = camera.near;
    state.active = true;
    state.x = startX;
    state.z = startZ;
    state.y = groundAt(startX, startZ);
    state.ground = state.y;
    state.vy = 0;
    state.grounded = true;
    state.yaw = START.yaw;
    state.pitch = START.pitch;
    state.dip = 0;
    keys.clear();
    jumpQueued = false;
    controls.enabled = false;
    controls.autoRotate = false;
    camera.near = 0.08;
    camera.updateProjectionMatrix();
    document.body.classList.add('fp-active');
    if (btn) {
      btn.classList.add('active');
      btn.textContent = '退出漫游';
    }
    if (hint) hint.textContent = hintDefault;
    everLocked = false;
    syncCamera();
    try {
      const request = canvas.requestPointerLock && canvas.requestPointerLock();
      if (request && request.catch) request.catch(() => {});
    } catch (e) {}
    return true;
  }

  function exit() {
    if (!state.active) return false;
    state.active = false;
    keys.clear();
    jumpQueued = false;
    dragging = false;
    document.body.classList.remove('fp-active');
    if (btn) {
      btn.classList.remove('active');
      btn.textContent = '第一人称漫游';
    }
    if (hint) hint.textContent = hintDefault;
    if (document.pointerLockElement === canvas && document.exitPointerLock) {
      try {
        document.exitPointerLock();
      } catch (e) {}
    }
    camera.near = saved.near;
    camera.updateProjectionMatrix();
    camera.position.copy(saved.pos);
    camera.quaternion.copy(saved.quat);
    controls.target.copy(saved.target);
    controls.enabled = saved.enabled !== false;
    controls.autoRotate = saved.autoRotate;
    controls.update();
    if (onExit) onExit();
    return true;
  }

  function jump() {
    if (!state.active || !state.grounded) return false;
    state.vy = JUMP_SPEED;
    state.grounded = false;
    state.y += 0.015;
    return true;
  }

  function update(dt) {
    if (!state.active) return;
    const down = (...codes) => codes.some((code) => keys.has(code));
    const forward = (down('KeyW', 'ArrowUp') ? 1 : 0) - (down('KeyS', 'ArrowDown') ? 1 : 0);
    const strafe = (down('KeyD', 'ArrowRight') ? 1 : 0) - (down('KeyA', 'ArrowLeft') ? 1 : 0);
    if (forward || strafe) {
      let dx = forward * -Math.sin(state.yaw) + strafe * Math.cos(state.yaw);
      let dz = forward * -Math.cos(state.yaw) - strafe * Math.sin(state.yaw);
      const length = Math.hypot(dx, dz) || 1;
      dx /= length;
      dz /= length;
      const sprint = down('ShiftLeft', 'ShiftRight');
      const distance = (sprint ? SPRINT : WALK) * dt;
      performMove(dx * distance, dz * distance);
    }
    const g = groundAt(state.x, state.z);
    state.ground = g;
    if (state.grounded && jumpQueued) jump();
    jumpQueued = false;
    if (!state.grounded) {
      state.vy += GRAVITY * dt;
      state.y += state.vy * dt;
      if (state.y <= g) {
        const impact = Math.max(0, -state.vy);
        state.y = g;
        state.vy = 0;
        state.grounded = true;
        state.dip = Math.min(0.16, impact * 0.014);
      }
    } else if (g > state.y) {
      state.y = g;
    } else if (state.y - g <= 0.65) {
      state.y = g;
    } else {
      state.grounded = false;
      state.vy = 0;
    }
    if (state.dip > 0.0005) state.dip *= Math.exp(-dt * 9);
    else state.dip = 0;
    syncCamera();
  }

  if (btn) {
    btn.addEventListener('click', () => {
      if (state.active) exit();
      else enter();
    });
  }

  window.addEventListener('keydown', (event) => {
    if (!state.active) return;
    if (event.code === 'Escape') {
      exit();
      return;
    }
    const codes = [
      'KeyW', 'KeyA', 'KeyS', 'KeyD',
      'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
      'ShiftLeft', 'ShiftRight', 'Space',
    ];
    if (codes.includes(event.code)) {
      event.preventDefault();
      if (event.code === 'Space') {
        if (!event.repeat) jumpQueued = true;
      } else {
        keys.add(event.code);
      }
    }
  });

  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', () => {
    keys.clear();
    jumpQueued = false;
  });

  document.addEventListener('mousemove', (event) => {
    if (!state.active || document.pointerLockElement !== canvas) return;
    applyLook(event.movementX || 0, event.movementY || 0);
  });

  canvas.addEventListener('pointerdown', (event) => {
    if (!state.active || document.pointerLockElement === canvas) return;
    event.preventDefault();
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    if (canvas.setPointerCapture) canvas.setPointerCapture(event.pointerId);
  });

  window.addEventListener('pointermove', (event) => {
    if (!state.active || !dragging || document.pointerLockElement === canvas) return;
    applyLook(event.clientX - lastX, event.clientY - lastY);
    lastX = event.clientX;
    lastY = event.clientY;
  });

  window.addEventListener('pointerup', () => {
    dragging = false;
  });

  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement === canvas) {
      everLocked = true;
    } else if (state.active && everLocked) {
      everLocked = false;
      exit();
    }
  });

  return {
    enter,
    exit,
    update,
    isActive: () => state.active,
    jump,
    lookAt: (yaw, pitch = 0) => {
      state.yaw = yaw;
      state.pitch = clamp(pitch, -1.45, 1.45);
      if (state.active) syncCamera();
    },
    teleport: (x, z) => {
      state.x = clamp(x, BOUNDS.minX, BOUNDS.maxX);
      state.z = clamp(z, BOUNDS.minZ, BOUNDS.maxZ);
      state.y = groundAt(state.x, state.z);
      state.ground = state.y;
      state.vy = 0;
      state.grounded = true;
      state.dip = 0;
      if (state.active) syncCamera();
    },
    groundAt,
    getPosition: () => ({
      x: +state.x.toFixed(3),
      y: +(state.y + EYE - state.dip).toFixed(3),
      feet: +state.y.toFixed(3),
      z: +state.z.toFixed(3),
      ground: +state.ground.toFixed(3),
      yaw: +state.yaw.toFixed(3),
      pitch: +state.pitch.toFixed(3),
      grounded: state.grounded,
      active: state.active,
    }),
    colliders,
    bounds: BOUNDS,
    eyeHeight: EYE,
    radius: RADIUS,
    start: { x: startX, z: startZ, yaw: START.yaw, ground: groundAt(startX, startZ) },
    bridge: BRIDGE,
  };
}
