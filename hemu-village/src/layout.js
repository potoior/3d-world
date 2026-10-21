export const STREAM = [
  [-16, -540], [-12, -460], [-4, -380], [4, -300], [-4, -220], [8, -140],
  [12, -60], [4, 20], [-8, 100], [-12, 180], [-4, 260], [8, 340], [14, 430], [10, 540],
];

export const PATHS = [
  [22, -200], [32, -150], [42, -100], [56, -50], [68, 0], [78, 55], [88, 115], [96, 175], [108, 235],
];

export const LAKE = [];
export const LAKES = [];
export const CAUSEWAYS = [];
export const BRIDGES = [];
export const ISLETS = [];

export const SPAWN = { x: 28, z: -118, yaw: Math.PI * 0.92 };
export const BOUNDS = { minX: -250, maxX: 250, minZ: -280, maxZ: 280 };

const HOUSE_BOXES = [
  [46, -126, 8.6, 6.8], [72, -132, 7.4, 6.2], [104, -122, 9.2, 7.2],
  [56, -92, 7.8, 6.4], [90, -96, 8.8, 7.0], [129, -86, 7.0, 6.0],
  [42, -48, 9.0, 7.0], [74, -54, 8.2, 6.6], [108, -46, 9.8, 7.6],
  [140, -24, 7.6, 6.2], [48, -6, 8.4, 6.8], [82, -2, 9.4, 7.2],
  [115, 8, 8.0, 6.4], [146, 28, 9.0, 7.0], [40, 44, 7.4, 6.2],
  [68, 50, 8.8, 7.0], [100, 62, 9.6, 7.4], [134, 72, 8.2, 6.6],
  [58, 96, 8.0, 6.4], [92, 104, 9.0, 7.0], [126, 118, 8.6, 6.8],
  [48, 144, 9.2, 7.2], [82, 152, 8.4, 6.6], [118, 162, 7.8, 6.2],
  [142, 150, 8.8, 7.0],
];

export const COLLIDERS = {
  boxes: HOUSE_BOXES.map(([x, z, w, d]) => ({
    minX: x - w * 0.68, maxX: x + w * 0.68, minZ: z - d * 0.68, maxZ: z + d * 0.68,
  })),
  circles: [],
  names: HOUSE_BOXES.map(() => '图瓦木屋'),
};

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
