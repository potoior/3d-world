function makeRing(cx, cz, rx, rz, count, seed) {
  const points = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const wobble =
      1 +
      0.13 * Math.sin(a * 3 + seed) +
      0.07 * Math.sin(a * 5 - seed * 1.7) +
      0.04 * Math.cos(a * 7 + seed * 0.6);
    points.push([cx + Math.cos(a) * rx * wobble, cz + Math.sin(a) * rz * wobble]);
  }
  return points;
}

export const MILK_LAKE = makeRing(-132, 138, 49, 35, 20, 1.9);
export const WUSE_LAKE = makeRing(108, 166, 39, 31, 20, 4.6);
export const LAKES = [MILK_LAKE, WUSE_LAKE];
export const LAKE = WUSE_LAKE;

export const BOARDWALK = [
  [-64, -214], [-54, -184], [-42, -152], [-26, -120], [-8, -88],
  [10, -57], [27, -25], [43, 8], [61, 40], [81, 75], [99, 111], [108, 139],
];

export const MILK_WALK = [
  [27, -25], [7, -8], [-16, 15], [-40, 40], [-64, 66], [-88, 94], [-112, 119],
];

export const CAUSEWAYS = [
  { name: '洛绒牛场木栈道', points: BOARDWALK, width: 3.5, y: 0.45 },
  { name: '牛奶海栈道', points: MILK_WALK, width: 2.9, y: 0.45 },
];

export const STREAM = [
  [92, 152], [84, 132], [73, 110], [61, 86], [50, 61], [39, 33],
  [27, 4], [16, -28], [8, -62], [0, -98], [-7, -135], [-12, -172], [-15, -218],
];

export const BRIDGES = [];
export const ISLETS = [];

export const SPAWN = { x: -64, z: -214, yaw: Math.PI };
export const BOUNDS = { minX: -310, maxX: 310, minZ: -260, maxZ: 260 };

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
