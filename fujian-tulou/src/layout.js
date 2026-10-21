import * as THREE from 'three';

export const TIANLUOKENG = { x: -72, z: 42 };
export const CHENGQI = { x: 58, z: 38, radius: 31 };
export const ZHENCHENG = { x: 8, z: -78, radius: 21 };

export const STREAM_POINTS = [
  [-168, -150], [-132, -120], [-96, -103], [-62, -84], [-31, -58],
  [-4, -24], [17, 12], [20, 48], [8, 84], [27, 122], [66, 151], [116, 168],
];

const curve = new THREE.CatmullRomCurve3(
  STREAM_POINTS.map(([x, z]) => new THREE.Vector3(x, 0, z)),
  false,
  'catmullrom',
  0.35
);

export const STREAM_SAMPLES = [];
{
  const n = 108;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p = curve.getPoint(t);
    const tan = curve.getTangent(t);
    const len = Math.hypot(tan.x, tan.z) || 1;
    STREAM_SAMPLES.push({ x: p.x, z: p.z, tx: tan.x / len, tz: tan.z / len, t });
  }
}

export const STREAM_WIDTH = 5.6;

const leftBank = [];
const rightBank = [];
for (const s of STREAM_SAMPLES) {
  const nx = -s.tz;
  const nz = s.tx;
  const half = STREAM_WIDTH * 0.5;
  leftBank.push([s.x + nx * half, s.z + nz * half]);
  rightBank.push([s.x - nx * half, s.z - nz * half]);
}
export const STREAM_POLYGON = [...leftBank, ...rightBank.reverse()];

function bridgeAt(t, span = 8.4, width = 3.8) {
  const i = Math.max(0, Math.min(STREAM_SAMPLES.length - 1, Math.round(t * (STREAM_SAMPLES.length - 1))));
  const s = STREAM_SAMPLES[i];
  return {
    x: s.x,
    z: s.z,
    rot: Math.atan2(-s.tz, s.tx),
    span,
    width,
    rise: 0.85,
    baseY: 0.08,
  };
}

export const BRIDGES = [bridgeAt(0.37), bridgeAt(0.6), bridgeAt(0.79)];

export const SPAWN = { x: 58, z: 94, yaw: 0.08 };
export const BOUNDS = { minX: -205, maxX: 205, minZ: -190, maxZ: 205 };
export const COLLIDERS = { boxes: [], circles: [], names: [] };

export const FP_WORLD = {
  lake: STREAM_POLYGON,
  waterRects: [],
  causeways: [],
  bridges: BRIDGES,
  islets: [],
  spawn: SPAWN,
  bounds: BOUNDS,
  colliders: COLLIDERS,
};

export const VIEWS = {
  overview: { p: [154, 112, 188], t: [-8, 9, 16] },
  tianluokeng: { p: [-18, 27, 112], t: [-72, 7, 42] },
  chengqi: { p: [86, 24, 116], t: [58, 9, 38] },
  zhencheng: { p: [39, 19, -4], t: [8, 6, -78] },
  dusk: { p: [104, 30, 147], t: [-22, 7, 25] },
};

export const NOTES = {
  overview: ['福建土楼 · 全景', '田螺坑“四菜一汤”依山而筑，承启楼与振成楼环环相套，夯土墙与圆形瓦顶沉入稻田茶山之间'],
  tianluokeng: ['田螺坑 · 四菜一汤', '四座圆楼与一座方楼围成梅花状，层层瓦顶落在梯田与茶山之间，是客家土楼最负盛名的聚落图景'],
  chengqi: ['承启楼 · 土楼之王', '承启楼直径逾七十米，外环四层、内环相套，四百余间木构房舍围合祖堂，夯土墙厚可丈余'],
  zhencheng: ['振成楼 · 土楼王子', '振成楼内外两环相抱，中轴祖堂雕梁画栋，天井、水井与回廊相连，砖木装饰在土楼中尤为精致'],
  dusk: ['土楼黄昏', '暮色越过茶山，溪水映着圆楼瓦顶，炊烟从院落升起，木廊灯笼次第点亮，稻田里仍有归家的身影'],
};
