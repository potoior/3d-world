export const STREAM = [
  [28, 330], [16, 286], [4, 238], [-6, 194], [-12, 150], [-10, 108],
  [-4, 66], [4, 24], [6, -18], [0, -62], [-10, -108], [-20, -158],
  [-28, -212], [-34, -268], [-38, -322],
];

export const PATHS = [
  [72, -206], [58, -166], [30, -138], [8, -110], [-4, -70], [-2, -20],
  [10, 24], [22, 62], [20, 104], [10, 150], [-6, 194], [-12, 236],
];

export const LAKE = [];
export const LAKES = [];
export const CAUSEWAYS = [];
export const BRIDGES = [];
export const ISLETS = [];

export const SPAWN = { x: 4, z: -168, yaw: Math.PI };
export const BOUNDS = { minX: -175, maxX: 175, minZ: -245, maxZ: 245 };

export const COLLIDERS = {
  boxes: [
    { minX: -87, maxX: -76, minZ: 53, maxZ: 63 },
    { minX: -69, maxX: -59, minZ: 87, maxZ: 97 },
    { minX: -98, maxX: -86, minZ: 112, maxZ: 124 },
    { minX: -61, maxX: -51, minZ: 129, maxZ: 139 },
    { minX: -79, maxX: -69, minZ: 162, maxZ: 174 },
    { minX: -43, maxX: -33, minZ: 181, maxZ: 191 },
    { minX: 29, maxX: 39, minZ: 55, maxZ: 65 },
    { minX: 56, maxX: 68, minZ: 82, maxZ: 94 },
    { minX: 85, maxX: 95, minZ: 107, maxZ: 117 },
    { minX: 41, maxX: 51, minZ: 113, maxZ: 123 },
    { minX: 66, maxX: 78, minZ: 140, maxZ: 152 },
    { minX: 101, maxX: 111, minZ: 149, maxZ: 159 },
    { minX: 27, maxX: 37, minZ: 165, maxZ: 175 },
    { minX: -30, maxX: -18, minZ: 208, maxZ: 220 },
    { minX: 7, maxX: 17, minZ: 224, maxZ: 236 },
    { minX: 45, maxX: 55, minZ: 204, maxZ: 216 },
  ],
  circles: [],
  names: [],
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
