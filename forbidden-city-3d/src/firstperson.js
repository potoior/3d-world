import * as THREE from 'three';

const EYE = 1.7;
const RADIUS = 0.42;
const MARGIN = 0.08;
const COLLIDE = RADIUS + MARGIN;
const BOUNDS = { minX: -371, maxX: 371, minZ: -475, maxZ: 475 };
const START = { x: 0, z: 445 };
const MAX_STEP = 0.62;
const SNAP_DOWN = 0.75;
const GRAVITY = -22;
const JUMP_SPEED = 6.2;
const SUBSTEP = 0.06;

const colliders = [
  [-70, -50, 460, 500],
  [-34, -11, 460, 500],
  [11, 34, 460, 500],
  [50, 70, 460, 500],
  [-36, -4, 276, 315],
  [4, 36, 276, 315],
  [-79, -51, 271, 319],
  [47, 75, 267, 315],
  [-127, -95, 359, 411],
  [88, 120, 348, 400],
  [-123, -83, 156, 213],
  [83, 123, 156, 213],
  [165, 175, 126, 264],
  [-175, -165, 126, 264],
  [130.5, 133.5, 129, 271],
  [-133.5, -130.5, 129, 271],
  [130.5, 133.5, -316, -184],
  [-133.5, -130.5, -316, -184],
  [72, 134, 268.5, 271.5],
  [-134, -72, 268.5, 271.5],
  [72, 134, 128.5, 131.5],
  [-134, -72, 128.5, 131.5],
  [69, 123, -117.5, -114.5],
  [-123, -69, -117.5, -114.5],
  [-37, 37, 63, 111],
  [-14, 14, 6, 34],
  [-30, 30, -63, -27],
  [66, 90, 63, 113],
  [-97, -71, 68, 118],
  [66, 90, -73, -23],
  [-97, -71, -67, -17],
  [-22, -3.5, -150, -123],
  [3.5, 22, -150, -123],
  [-28, 28, -252, -218],
  [-13, 13, -288, -260],
  [-27, 27, -322, -292],
  [-78, -70, -333, -211],
  [70, 78, -333, -211],
  [-12, -3, -351, -337],
  [3, 12, -351, -337],
  [-48, -27.5, -494, -466],
  [-16.5, -7, -494, -466],
  [7, 16.5, -494, -466],
  [27.5, 48, -494, -466],
  [-376, -76, 477, 483],
  [76, 376, 477, 483],
  [-376, -48, -483, -477],
  [48, 376, -483, -477],
  [-379, -373, -480, 306],
  [-379, -373, 340, 480],
  [373, 379, -480, 306],
  [373, 379, 340, 480],
  [-390, -362, 299, 347],
  [362, 390, 299, 347],
  [-244, -198, 253, 293],
  [163, 210, 236, 275],
  [-62, -60, 147, 149],
  [-62, -60, 181, 183],
  [-62, -60, 215, 217],
  [60, 62, 147, 149],
  [60, 62, 181, 183],
  [60, 62, 215, 217],
  [-58, -56, -225, -223],
  [-58, -56, -261, -259],
  [-58, -56, -297, -295],
  [56, 58, -225, -223],
  [56, 58, -261, -259],
  [56, 58, -297, -295],
  [-25.5, -22.5, 348.5, 351.5],
  [22.5, 25.5, 348.5, 351.5],
  [-35.2, -32.8, -216.2, -213.8],
  [32.8, 35.2, -216.2, -213.8],
  [-35.2, -32.8, -301.2, -298.8],
  [32.8, 35.2, -301.2, -298.8],
  [-53, -51, 149.4, 150.6],
  [51, 53, 149.4, 150.6],
  [-53, -51, 199.4, 200.6],
  [51, 53, 199.4, 200.6],
  [-90, -86, -416, -412],
  [-98, -94, -428, -424],
  [34, 38, -458, -454],
];

function blocked(x, z) {
  for (let i = 0; i < colliders.length; i++) {
    const c = colliders[i];
    if (x > c[0] - COLLIDE && x < c[1] + COLLIDE && z > c[2] - COLLIDE && z < c[3] + COLLIDE) {
      return true;
    }
  }
  return false;
}

function resolvePoint(x, z) {
  for (let pass = 0; pass < 8; pass++) {
    let moved = false;
    for (let i = 0; i < colliders.length; i++) {
      const c = colliders[i];
      const minX = c[0] - COLLIDE;
      const maxX = c[1] + COLLIDE;
      const minZ = c[2] - COLLIDE;
      const maxZ = c[3] + COLLIDE;
      if (x > minX && x < maxX && z > minZ && z < maxZ) {
        const dl = x - minX;
        const dr = maxX - x;
        const db = z - minZ;
        const dt = maxZ - z;
        const near = Math.min(dl, dr, db, dt);
        if (near === dl) x = minX - 0.001;
        else if (near === dr) x = maxX + 0.001;
        else if (near === db) z = minZ - 0.001;
        else z = maxZ + 0.001;
        moved = true;
      }
    }
    if (!moved) break;
  }
  return { x, z };
}

function groundAt(x, z) {
  let g = 0;
  const ax = Math.abs(x);
  if (z > -90 && z < 126 && ax < 69) g = 2.2;
  if (z > -84 && z < 120 && ax < 63) g = 4.4;
  if (z > -78 && z < 114 && ax < 57) g = 6.8;
  if (ax < 19 && z >= 114 && z <= 132) {
    g = Math.max(g, (6.8 * (132 - z)) / 18);
  }
  if (ax < 19 && z >= -96 && z <= -78) {
    g = Math.max(g, (6.8 * (z + 96)) / 18);
  }
  if (z > -337 && z < -207 && ax < 52) g = Math.max(g, 1.2);
  if (ax < 12 && z >= -207 && z <= -197) {
    g = Math.max(g, (1.2 * (-197 - z)) / 10);
  }
  if (ax < 10 && z >= -347 && z <= -337) {
    g = Math.max(g, (1.2 * (z + 347)) / 10);
  }
  if (z > 276 && z < 315 && ax < 30) g = Math.max(g, 0.2);
  if (z > -150 && z < -123 && ax < 20) g = Math.max(g, 0.2);
  if (z > -351 && z < -337 && ax < 11) g = Math.max(g, 0.15);
  return g;
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
    fov: camera.fov,
  };
  const state = {
    active: false,
    x: START.x,
    z: START.z,
    ground: groundAt(START.x, START.z),
    feetY: groundAt(START.x, START.z),
    vy: 0,
    grounded: true,
    jumpHeld: false,
    yaw: 0,
    pitch: -0.04,
  };
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let everLocked = false;

  function applyLook(dx, dy) {
    state.yaw -= dx * 0.0022;
    state.pitch = clamp(state.pitch - dy * 0.0022, -1.45, 1.45);
    camera.rotation.order = 'YXZ';
    camera.rotation.set(state.pitch, state.yaw, 0);
  }

  function syncCamera() {
    camera.position.set(state.x, state.feetY + EYE, state.z);
    camera.rotation.order = 'YXZ';
    camera.rotation.set(state.pitch, state.yaw, 0);
  }

  function tryStep(nx, nz) {
    const x = clamp(nx, BOUNDS.minX, BOUNDS.maxX);
    const z = clamp(nz, BOUNDS.minZ, BOUNDS.maxZ);
    if (blocked(x, z)) return;
    const g = groundAt(x, z);
    if (g > state.feetY + MAX_STEP) return;
    state.x = x;
    state.z = z;
    state.ground = g;
  }

  function moveHorizontal(dx, dz, distance) {
    const substeps = Math.max(1, Math.ceil(distance / SUBSTEP));
    const step = distance / substeps;
    for (let i = 0; i < substeps; i++) {
      tryStep(state.x + dx * step, state.z);
      tryStep(state.x, state.z + dz * step);
    }
    if (blocked(state.x, state.z)) {
      const point = resolvePoint(state.x, state.z);
      state.x = clamp(point.x, BOUNDS.minX, BOUNDS.maxX);
      state.z = clamp(point.z, BOUNDS.minZ, BOUNDS.maxZ);
      state.ground = groundAt(state.x, state.z);
    }
  }

  function jump() {
    if (!state.active || !state.grounded || state.jumpHeld) return false;
    state.vy = JUMP_SPEED;
    state.grounded = false;
    state.jumpHeld = true;
    state.feetY += 0.001;
    return true;
  }

  function enter() {
    if (state.active) return true;
    if (onEnter) onEnter();
    saved.pos.copy(camera.position);
    saved.quat.copy(camera.quaternion);
    saved.target.copy(controls.target);
    saved.autoRotate = controls.autoRotate;
    saved.enabled = controls.enabled;
    state.active = true;
    state.x = START.x;
    state.z = START.z;
    state.ground = groundAt(START.x, START.z);
    state.feetY = state.ground;
    state.vy = 0;
    state.grounded = true;
    state.jumpHeld = false;
    state.yaw = 0;
    state.pitch = -0.04;
    keys.clear();
    saved.near = camera.near;
    saved.fov = camera.fov;
    camera.near = 0.12;
    camera.fov = 65;
    camera.updateProjectionMatrix();
    controls.enabled = false;
    controls.autoRotate = false;
    syncCamera();
    document.body.classList.add('fp-active');
    if (hint) {
      const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
      hint.textContent = coarse ? '拖拽环顾 · 点击按钮退出 · 空格跳跃' : hintDefault;
    }
    if (btn) {
      btn.classList.add('active');
      btn.textContent = '退出漫游';
    }
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
    dragging = false;
    state.vy = 0;
    state.grounded = true;
    state.jumpHeld = false;
    camera.near = saved.near;
    camera.fov = saved.fov;
    camera.updateProjectionMatrix();
    document.body.classList.remove('fp-active');
    if (hint) hint.textContent = hintDefault;
    if (btn) {
      btn.classList.remove('active');
      btn.textContent = '第一人称漫游';
    }
    if (document.pointerLockElement === canvas && document.exitPointerLock) {
      try {
        document.exitPointerLock();
      } catch (e) {}
    }
    controls.enabled = saved.enabled !== false;
    controls.autoRotate = saved.autoRotate;
    camera.position.copy(saved.pos);
    camera.quaternion.copy(saved.quat);
    controls.target.copy(saved.target);
    controls.update();
    if (onExit) onExit();
    return true;
  }

  function update(dt) {
    if (!state.active) return;
    dt = Math.min(Math.max(dt, 0), 0.05);
    const down = (...codes) => codes.some((code) => keys.has(code));
    const jumpDown = down('Space');
    if (jumpDown && !state.jumpHeld) jump();
    state.jumpHeld = jumpDown;
    const forward = (down('KeyW', 'ArrowUp') ? 1 : 0) - (down('KeyS', 'ArrowDown') ? 1 : 0);
    const strafe = (down('KeyD', 'ArrowRight') ? 1 : 0) - (down('KeyA', 'ArrowLeft') ? 1 : 0);
    if (forward || strafe) {
      let dx = forward * -Math.sin(state.yaw) + strafe * Math.cos(state.yaw);
      let dz = forward * -Math.cos(state.yaw) - strafe * Math.sin(state.yaw);
      const length = Math.hypot(dx, dz);
      dx /= length;
      dz /= length;
      const sprint = down('ShiftLeft', 'ShiftRight');
      const distance = (sprint ? 8.5 : 4.3) * dt;
      moveHorizontal(dx, dz, distance);
    }
    const g = groundAt(state.x, state.z);
    if (state.grounded) {
      if (g <= state.feetY + MAX_STEP && g >= state.feetY - SNAP_DOWN) {
        state.feetY = g;
        state.vy = 0;
      } else if (g < state.feetY - SNAP_DOWN) {
        state.grounded = false;
      }
    }
    if (!state.grounded) {
      state.feetY += (state.vy + GRAVITY * dt * 0.5) * dt;
      state.vy += GRAVITY * dt;
      if (state.vy <= 0 && state.feetY <= g) {
        state.feetY = g;
        state.vy = 0;
        state.grounded = true;
      }
    }
    state.ground = g;
    syncCamera();
  }

  function getPosition() {
    return {
      x: +state.x.toFixed(3),
      y: +(state.feetY + EYE).toFixed(3),
      z: +state.z.toFixed(3),
      ground: +state.ground.toFixed(3),
      feetY: +state.feetY.toFixed(3),
      vy: +state.vy.toFixed(3),
      grounded: state.grounded,
      yaw: +state.yaw.toFixed(3),
      pitch: +state.pitch.toFixed(3),
      active: state.active,
    };
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
      keys.add(event.code);
    }
  });

  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', () => keys.clear());

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
    jump,
    isActive: () => state.active,
    getPosition,
    groundAt,
    getGroundAt: groundAt,
    lookAt: (yaw, pitch = 0) => {
      state.yaw = yaw;
      state.pitch = clamp(pitch, -1.45, 1.45);
      if (state.active) syncCamera();
    },
    teleport: (x, z) => {
      let nx = clamp(x, BOUNDS.minX, BOUNDS.maxX);
      let nz = clamp(z, BOUNDS.minZ, BOUNDS.maxZ);
      if (blocked(nx, nz)) {
        const point = resolvePoint(nx, nz);
        nx = clamp(point.x, BOUNDS.minX, BOUNDS.maxX);
        nz = clamp(point.z, BOUNDS.minZ, BOUNDS.maxZ);
      }
      state.x = nx;
      state.z = nz;
      state.ground = groundAt(nx, nz);
      state.feetY = state.ground;
      state.vy = 0;
      state.grounded = true;
      state.jumpHeld = false;
      if (state.active) syncCamera();
    },
    colliders,
    bounds: BOUNDS,
    eyeHeight: EYE,
    radius: RADIUS,
    margin: MARGIN,
    collisionRadius: COLLIDE,
    gravity: GRAVITY,
    jumpSpeed: JUMP_SPEED,
    nearPlane: () => camera.near,
    start: START,
  };
}
