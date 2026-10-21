function makeRing(cx, cz, rx, rz, count, seed) {
  const points = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const wobble =
      1 +
      0.12 * Math.sin(a * 3 + seed) +
      0.06 * Math.sin(a * 5 - seed * 1.4) +
      0.035 * Math.cos(a * 7 + seed);
    points.push([cx + Math.cos(a) * rx * wobble, cz + Math.sin(a) * rz * wobble]);
  }
  return points;
}

export const BLUE_MOON_UPPER = makeRing(-170, -62, 54, 37, 30, 1.4);
export const BLUE_MOON_MID = makeRing(-207, -145, 64, 45, 30, 3.1);
export const BLUE_MOON_LOWER = makeRing(-176, -232, 73, 52, 30, 5.7);
export const BLUE_MOON_BASE = makeRing(-214, -326, 86, 61, 30, 8.2);
export const LAKES = [BLUE_MOON_UPPER, BLUE_MOON_MID, BLUE_MOON_LOWER, BLUE_MOON_BASE];
export const LAKE = BLUE_MOON_LOWER;

export const BOARDWALK = [
  [-108, -372], [-98, -300], [-104, -226], [-98, -148], [-86, -78], [-78, -18],
];

export const STREAM = [
  [-214, -390], [-208, -340], [-190, -286], [-172, -232], [-198, -180], [-207, -145], [-178, -96], [-170, -62],
];

export const CAUSEWAYS = [
  { name: '蓝月谷木栈道', points: BOARDWALK, width: 3.2, y: 0.55 },
];

export const BRIDGES = [];
export const ISLETS = [];

export const SPAWN = { x: 110, z: -392, yaw: Math.PI };
export const BOUNDS = { minX: -760, maxX: 760, minZ: -600, maxZ: 620 };

export const COLLIDERS = { boxes: [], circles: [], names: [] };

export const FP_WORLD = {
  lake: LAKE,
  lakes: LAKES,
  causeways: CAUSEWAYS,
  bridges: BRIDGES,
  islets: ISLETS,
  spawn: SPAWN,
  bounds: BOUNDS,
  colliders: COLLIDERS,
};
