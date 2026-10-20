import * as THREE from 'three';
import { BOUNDS, START, groundAt, blockedByObstacle, COLLIDERS } from './route.js';

const EYE = 1.7;
const RADIUS = 0.42;
const MARGIN = 0.08;
const COLLIDE = RADIUS + MARGIN;
const MAX_STEP = 0.72;
const SNAP_DOWN = 0.82;
const GRAVITY = -24;
const JUMP_SPEED = 6.6;
const SUBSTEP = 0.055;
const colliders = COLLIDERS;

function blocked(x, z) {
  return blockedByObstacle(x, z, COLLIDE);
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
    pitch: 0.07,
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
    state.pitch = 0.07;
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
      const g = groundAt(nx, nz);
      if (g > 200) return;
      state.x = nx;
      state.z = nz;
      state.ground = g;
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
