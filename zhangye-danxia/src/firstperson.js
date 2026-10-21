import * as THREE from 'three';
import { trailCurve, trailWidthAt, trailPointAt } from './terrain.js';

const START_T = 0.42;
const EYE_HEIGHT = 1.68;
const WALK_SPEED = 3.4;
const SPRINT_SPEED = 6.2;
const GRAVITY = 22;
const JUMP_SPEED = 6.2;
const MIN_T = 0.004;
const MAX_T = 0.996;
const NEAR_PLANE = 0.12;

function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

export function createFirstPerson(options) {
  const { camera, renderer, controls, world, onEnter, onExit } = options;
  const canvas = renderer.domElement;
  const curveLength = Math.max(1, trailCurve.getLength());
  const button = options.button || document.getElementById('btn-fp');
  const buttonLabel = button ? button.textContent : '第一人称漫游';

  let active = false;
  let locked = false;
  let wasLocked = false;
  let lockedAt = 0;
  let dragging = false;
  let dragX = 0;
  let dragY = 0;
  let t = START_T;
  let lateral = 0;
  let yaw = 0;
  let pitch = 0;
  let vy = 0;
  let jumpOffset = 0;
  let grounded = true;
  let bobPhase = 0;
  let bob = 0;

  const keys = Object.create(null);
  const saved = {
    position: new THREE.Vector3(),
    target: new THREE.Vector3(),
    near: camera.near,
    autoRotate: false,
    enabled: true,
  };

  function surfaceAt(value) {
    return trailPointAt(clamp(value, MIN_T, MAX_T)).y + 0.15;
  }

  function lateralLimit(value) {
    return Math.max(0.5, trailWidthAt(value) * 0.5 - 0.5);
  }

  function facingYaw() {
    const tan = trailCurve.getTangentAt(clamp(t, MIN_T, MAX_T));
    return Math.atan2(-tan.x, -tan.z);
  }

  function updateCamera() {
    const p = trailPointAt(t);
    const tan = trailCurve.getTangentAt(t);
    const nx = tan.z;
    const nz = -tan.x;
    const len = Math.hypot(nx, nz) || 1;
    camera.position.set(
      p.x + (nx / len) * lateral,
      surfaceAt(t) + jumpOffset + EYE_HEIGHT + bob,
      p.z + (nz / len) * lateral
    );
    camera.rotation.set(pitch, yaw, 0, 'YXZ');
  }

  function getPosition() {
    return {
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z,
      t,
      lateral,
      ground: surfaceAt(t),
      yaw,
      pitch,
      jumpOffset,
      grounded,
      active,
    };
  }

  function jump() {
    if (!active || !grounded) return false;
    vy = JUMP_SPEED;
    jumpOffset = 0.0001;
    grounded = false;
    return true;
  }

  function update(dt) {
    if (!active) return;
    const step = clamp(Number.isFinite(dt) ? dt : 1 / 60, 0, 0.1);
    const p = trailPointAt(t);
    const tan = trailCurve.getTangentAt(t);
    const nx = tan.z;
    const nz = -tan.x;
    const nlen = Math.hypot(nx, nz) || 1;
    let forward = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0);
    let strafe = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
    const moving = forward !== 0 || strafe !== 0;
    if (moving) {
      const norm = Math.hypot(forward, strafe);
      forward /= norm;
      strafe /= norm;
    }
    const sprint = keys.ShiftLeft || keys.ShiftRight;
    const speed = sprint ? SPRINT_SPEED : WALK_SPEED;
    const sinYaw = Math.sin(yaw);
    const cosYaw = Math.cos(yaw);
    const fwdX = -sinYaw;
    const fwdZ = -cosYaw;
    const rightX = cosYaw;
    const rightZ = -sinYaw;
    const alongSign = fwdX * tan.x + fwdZ * tan.z < -0.15 ? -1 : 1;
    const sideSign = rightX * nx + rightZ * nz < 0 ? -1 : 1;
    let along = forward * alongSign;
    let side = strafe * sideSign;
    const magnitude = Math.hypot(along, side);
    if (magnitude > 1) {
      along /= magnitude;
      side /= magnitude;
    }
    along *= speed;
    side *= speed;
    const substeps = Math.max(1, Math.ceil((speed * step) / 0.1));
    const subDt = step / substeps;
    for (let i = 0; i < substeps; i++) {
      t = clamp(t + (along * subDt) / curveLength, MIN_T, MAX_T);
      const limit = lateralLimit(t);
      lateral = clamp(lateral + side * subDt, -limit, limit);
    }
    if (!grounded) {
      vy -= GRAVITY * step;
      jumpOffset += vy * step;
      if (jumpOffset <= 0) {
        jumpOffset = 0;
        vy = 0;
        grounded = true;
      }
    }
    if (grounded && moving) {
      bobPhase += step * speed * 1.9;
      bob = Math.sin(bobPhase) * 0.024;
    } else {
      bob *= Math.max(0, 1 - step * 9);
      if (Math.abs(bob) < 0.0005) bob = 0;
    }
    updateCamera();
  }

  function teleportToT(value, offset = 0) {
    t = clamp(Number.isFinite(value) ? value : START_T, MIN_T, MAX_T);
    const limit = lateralLimit(t);
    lateral = clamp(Number.isFinite(offset) ? offset : 0, -limit, limit);
    yaw = facingYaw();
    pitch = -0.02;
    vy = 0;
    jumpOffset = 0;
    grounded = true;
    bob = 0;
    bobPhase = 0;
    updateCamera();
    return getPosition();
  }

  function lookAt(nextYaw, nextPitch = 0) {
    if (Number.isFinite(nextYaw)) yaw = nextYaw;
    if (Number.isFinite(nextPitch)) pitch = clamp(nextPitch, -1.2, 1.2);
    updateCamera();
  }

  function requestLock() {
    if (!active || locked) return;
    try {
      const result = canvas.requestPointerLock?.();
      if (result && result.catch) result.catch(() => {});
    } catch (error) {
      locked = false;
    }
  }

  function enter() {
    if (active) return;
    saved.position.copy(camera.position);
    saved.target.copy(controls.target);
    saved.near = camera.near;
    saved.autoRotate = controls.autoRotate;
    saved.enabled = controls.enabled;
    active = true;
    for (const code in keys) delete keys[code];
    dragging = false;
    t = START_T;
    lateral = 0;
    vy = 0;
    jumpOffset = 0;
    grounded = true;
    bob = 0;
    bobPhase = 0;
    yaw = facingYaw() + 2.6;
    pitch = 0.02;
    camera.near = NEAR_PLANE;
    camera.updateProjectionMatrix();
    controls.enabled = false;
    controls.autoRotate = false;
    updateCamera();
    document.body.classList.add('fp-active');
    if (button) {
      button.classList.add('active');
      button.textContent = '退出漫游';
      if (document.activeElement === button) button.blur();
    }
    if (onEnter) onEnter();
    requestLock();
  }

  function exit() {
    if (!active) return;
    active = false;
    for (const code in keys) delete keys[code];
    dragging = false;
    document.body.classList.remove('fp-active');
    if (button) {
      button.classList.remove('active');
      button.textContent = buttonLabel;
    }
    if (document.pointerLockElement === canvas) {
      try {
        document.exitPointerLock();
      } catch (error) {}
    }
    locked = false;
    wasLocked = false;
    camera.near = saved.near;
    camera.updateProjectionMatrix();
    camera.position.copy(saved.position);
    controls.target.copy(saved.target);
    controls.enabled = saved.enabled;
    controls.autoRotate = saved.autoRotate;
    controls.update();
    if (onExit) onExit();
  }

  function applyLook(dx, dy, sensitivity) {
    yaw -= dx * sensitivity;
    pitch = clamp(pitch - dy * sensitivity, -1.2, 1.2);
  }

  function onKeyDown(event) {
    if (!active) return;
    if (event.code === 'Escape') {
      event.preventDefault();
      exit();
      return;
    }
    if (event.code === 'Space' || event.code.startsWith('Arrow')) event.preventDefault();
    keys[event.code] = true;
    if (event.code === 'Space' && !event.repeat) jump();
  }

  function onKeyUp(event) {
    keys[event.code] = false;
  }

  function onMouseDown(event) {
    if (!active || event.button !== 0 || document.pointerLockElement === canvas) return;
    dragging = true;
    dragX = event.clientX;
    dragY = event.clientY;
  }

  function onMouseUp() {
    dragging = false;
  }

  function onMouseMove(event) {
    if (!active) return;
    if (locked) {
      applyLook(event.movementX || 0, event.movementY || 0, 0.0022);
      return;
    }
    if (!dragging) return;
    applyLook(event.clientX - dragX, event.clientY - dragY, 0.0032);
    dragX = event.clientX;
    dragY = event.clientY;
  }

  function onPointerLockChange() {
    const nowLocked = document.pointerLockElement === canvas;
    if (nowLocked) {
      locked = true;
      wasLocked = true;
      lockedAt = performance.now();
      dragging = false;
      return;
    }
    locked = false;
    const heldLongEnough = performance.now() - lockedAt > 600;
    if (active && wasLocked && heldLongEnough) {
      wasLocked = false;
      exit();
      return;
    }
    wasLocked = false;
  }

  function onPointerLockError() {
    locked = false;
  }

  function onBlur() {
    for (const code in keys) delete keys[code];
    dragging = false;
  }

  function onCanvasClick() {
    if (active && !locked) requestLock();
  }

  if (button) {
    button.addEventListener('click', () => {
      if (active) exit();
      else enter();
    });
  }
  window.addEventListener('keydown', onKeyDown, { passive: false });
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('mousemove', onMouseMove, { passive: true });
  window.addEventListener('mouseup', onMouseUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('click', onCanvasClick);
  document.addEventListener('pointerlockchange', onPointerLockChange);
  document.addEventListener('pointerlockerror', onPointerLockError);

  return {
    enter,
    exit,
    isActive: () => active,
    update,
    getPosition,
    jump,
    teleportToT,
    teleport: teleportToT,
    walkwayAt: surfaceAt,
    lookAt,
    lateralLimit,
    camera,
    get t() {
      return t;
    },
    get lateral() {
      return lateral;
    },
  };
}
