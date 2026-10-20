export const STAIRS = [
  { a: [130, 368], b: [130, 318], y0: 0, y1: 6 },
  { a: [130, 318], b: [170, 318], y0: 6, y1: 9 },
  { a: [170, 318], b: [170, 274], y0: 9, y1: 16 },
  { a: [170, 274], b: [128, 274], y0: 16, y1: 19 },
  { a: [128, 274], b: [128, 232], y0: 19, y1: 27 },
  { a: [128, 232], b: [168, 232], y0: 27, y1: 30 },
  { a: [168, 232], b: [168, 196], y0: 30, y1: 36 },
  { a: [168, 196], b: [128, 196], y0: 36, y1: 39 },
  { a: [128, 196], b: [128, 168], y0: 39, y1: 44 },
];

export const UPPER_STAIR = { a: [82, 106], b: [82, 96], y0: 44, y1: 54, width: 96 };

export const COURTYARD = { x0: 72, x1: 182, z0: 106, z1: 176, y: 44 };
export const TERRACE = { x0: 56, x1: 184, z0: 78, z1: 96, y: 54 };

export const START = { x: 130, z: 372 };
export const BOUNDS = { minX: -430, maxX: 430, minZ: -260, maxZ: 470 };

const BARRIERS = [
  { x0: -275, x1: 275, z0: -175, z1: 248 },
  { x0: 112, x1: 186, z0: 158, z1: 376 },
];

export const COLLIDERS = [
  [42, 186, 58, 82],
  [-66, 50, 56, 86],
  [-188, -80, 58, 82],
  [48, 60, 78, 98],
  [176, 186, 78, 98],
  [64, 72, 98, 184],
  [182, 192, 98, 184],
  [70, 118, 174, 184],
  [150, 190, 174, 184],
  [60, 70, 94, 108],
  [176, 186, 94, 108],
  [92, 100, 108, 122],
  [158, 166, 108, 122],
  [70, 90, 120, 132],
  [162, 182, 140, 152],
];

function segGround(x, z, seg, half) {
  const ax = seg.a[0];
  const az = seg.a[1];
  const bx = seg.b[0];
  const bz = seg.b[1];
  const dx = bx - ax;
  const dz = bz - az;
  const len2 = dx * dx + dz * dz;
  let t = ((x - ax) * dx + (z - az) * dz) / len2;
  t = Math.max(0, Math.min(1, t));
  const px = ax + dx * t;
  const pz = az + dz * t;
  const dist = Math.hypot(x - px, z - pz);
  if (dist > half) return -1e9;
  return seg.y0 + (seg.y1 - seg.y0) * t;
}

function inRect(x, z, r) {
  return x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;
}

export function groundAt(x, z) {
  let g = -1e9;
  for (let i = 0; i < STAIRS.length; i++) {
    g = Math.max(g, segGround(x, z, STAIRS[i], 4.8));
  }
  if (x >= 82 && x <= 178 && z >= 96 && z <= 106) {
    const t = Math.max(0, Math.min(1, (106 - z) / 10));
    g = Math.max(g, 44 + t * 10);
  }
  if (inRect(x, z, COURTYARD)) g = Math.max(g, COURTYARD.y);
  if (inRect(x, z, TERRACE)) g = Math.max(g, TERRACE.y);
  if (g > -1e8) return g;
  for (let i = 0; i < BARRIERS.length; i++) {
    if (inRect(x, z, BARRIERS[i])) return 999;
  }
  return 0;
}

export function blockedByObstacle(x, z, radius) {
  for (let i = 0; i < COLLIDERS.length; i++) {
    const c = COLLIDERS[i];
    if (
      x > c[0] - radius &&
      x < c[1] + radius &&
      z > c[2] - radius &&
      z < c[3] + radius
    ) {
      return true;
    }
  }
  return false;
}

export const FLAG_LINES = [
  { a: [84, 58, 112], b: [170, 58, 112] },
  { a: [84, 58, 168], b: [170, 58, 168] },
  { a: [182, 54, 120], b: [238, 26, 78] },
  { a: [72, 54, 176], b: [22, 18, 236] },
  { a: [104, 15, 344], b: [172, 15, 344] },
  { a: [128, 12, 362], b: [128, 18, 300] },
  { a: [80, 60, 118], b: [80, 60, 166] },
  { a: [176, 60, 118], b: [176, 60, 166] },
  { a: [150, 31, 240], b: [186, 24, 214] },
];
