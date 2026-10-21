function makeRing(cx, cz, rx, rz, count, seed) {
  const points = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const wobble =
      1 +
      0.13 * Math.sin(a * 3 + seed) +
      0.065 * Math.sin(a * 5 - seed * 1.4) +
      0.04 * Math.cos(a * 7 + seed);
    points.push([cx + Math.cos(a) * rx * wobble, cz + Math.sin(a) * rz * wobble]);
  }
  return points;
}

export const POOLS = [
  { cx: 10, cz: -30, rx: 36, rz: 26, level: 9.9, seed: 1.3, poly: makeRing(10, -30, 36, 26, 28, 1.3) },
  { cx: 35, cz: -205, rx: 46, rz: 32, level: 7.7, seed: 3.6, poly: makeRing(35, -205, 46, 32, 28, 3.6) },
  { cx: 95, cz: -430, rx: 60, rz: 42, level: 5.1, seed: 5.4, poly: makeRing(95, -430, 60, 42, 28, 5.4) },
];

export const STREAM_POINTS = [
  [520, 720], [438, 540], [340, 400], [244, 278], [154, 150],
  [78, 42], [38, -84], [22, -148], [35, -205], [58, -268],
  [80, -342], [95, -430], [110, -540], [120, -680], [100, -820],
];

export const BOARDWALK = [
  [158, -456], [140, -380], [126, -300], [118, -222], [128, -146],
  [116, -72], [96, 2], [78, 62],
];

export const CAUSEWAYS = [];

export const BRIDGES = [];

export const ISLETS = [];

export const SPAWN = { x: 300, z: -392, yaw: Math.PI };

export const BOUNDS = { minX: -600, maxX: 620, minZ: -760, maxZ: 320 };

export const COLLIDERS = { boxes: [], circles: [], names: [] };

export const FP_WORLD = {
  lake: POOLS[2].poly,
  lakes: POOLS.map((p) => p.poly),
  causeways: CAUSEWAYS,
  bridges: BRIDGES,
  islets: ISLETS,
  spawn: SPAWN,
  bounds: BOUNDS,
  colliders: COLLIDERS,
};
