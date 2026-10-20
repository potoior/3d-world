import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mats } from './materials.js';
import { terrainHeight, WATER_Y } from './terrain.js';
import { LAKE_RING } from './lakeData.js';
import { hash } from './detailKit.js';

const dummy = new THREE.Object3D();
const tmpColor = new THREE.Color();

function tinted(geo, hex, shade = 0.12) {
  const color = new THREE.Color(hex);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const n = Math.sin(pos.getX(i) * 12.9 + pos.getY(i) * 37.7 + pos.getZ(i) * 78.2) * 43758.5453;
    const f = 1 - shade * 0.5 + (n - Math.floor(n)) * shade;
    colors[i * 3] = color.r * f;
    colors[i * 3 + 1] = color.g * f;
    colors[i * 3 + 2] = color.b * f;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo;
}

function mergeTinted(list) {
  return mergeGeometries(list, false);
}

function makeShoreWaves() {
  const n = LAKE_RING.length / 2;
  let cx = 0;
  let cz = 0;
  for (let i = 0; i < n; i++) {
    cx += LAKE_RING[i * 2];
    cz += LAKE_RING[i * 2 + 1];
  }
  cx /= n;
  cz /= n;
  const positions = [];
  const uvs = [];
  const indices = [];
  let base = 0;
  let run = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const x0 = LAKE_RING[i * 2];
    const z0 = LAKE_RING[i * 2 + 1];
    const x1 = LAKE_RING[j * 2];
    const z1 = LAKE_RING[j * 2 + 1];
    const len = Math.hypot(x1 - x0, z1 - z0);
    if (len < 3 || len > 42) continue;
    let nx = -(z1 - z0) / len;
    let nz = (x1 - x0) / len;
    const mx = (x0 + x1) / 2;
    const mz = (z0 + z1) / 2;
    if ((mx + nx * 7 - cx) ** 2 + (mz + nz * 7 - cz) ** 2 > (mx - cx) ** 2 + (mz - cz) ** 2) {
      nx = -nx;
      nz = -nz;
    }
    const w = 7.0;
    positions.push(x0, WATER_Y + 0.06, z0, x1, WATER_Y + 0.06, z1);
    positions.push(x0 + nx * w, WATER_Y + 0.06, z0 + nz * w, x1 + nx * w, WATER_Y + 0.06, z1 + nz * w);
    const u0 = run * 0.03;
    run += len;
    const u1 = run * 0.03;
    uvs.push(u0, 0, u1, 0, u0, 1, u1, 1);
    indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
    base += 4;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const uniforms = { uTime: { value: 0 } };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        float edge = smoothstep(0.0, 0.22, vUv.y) * (1.0 - smoothstep(0.42, 1.0, vUv.y));
        float band = sin(vUv.x * 2.1 - uTime * 1.35 + sin(vUv.x * 0.53 + uTime * 0.21) * 1.8);
        float foam = smoothstep(0.55, 0.95, band) * edge;
        float wash = 0.55 + 0.45 * sin(uTime * 0.7 + vUv.x * 0.8);
        float a = foam * 0.26 * wash + (1.0 - vUv.y) * 0.028;
        vec3 col = mix(vec3(0.72, 0.82, 0.80), vec3(0.96, 0.99, 0.97), foam);
        gl_FragColor = vec4(col, a);
      }
    `,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 3;
  mesh.frustumCulled = false;
  return { mesh, uniforms };
}

function makeDuckGeometry() {
  const list = [];
  const body = new THREE.SphereGeometry(0.42, 8, 6);
  body.scale(1.5, 0.78, 0.9);
  body.translate(0, 0.3, 0);
  list.push(tinted(body, 0x6f614c));
  const breast = new THREE.SphereGeometry(0.26, 7, 5);
  breast.scale(0.9, 1.0, 0.9);
  breast.translate(0.38, 0.42, 0);
  list.push(tinted(breast, 0x8a7a60));
  const head = new THREE.SphereGeometry(0.2, 7, 5);
  head.translate(0.46, 0.72, 0);
  list.push(tinted(head, 0x30503f));
  const beak = new THREE.ConeGeometry(0.09, 0.28, 5);
  beak.rotateZ(-Math.PI / 2);
  beak.translate(0.7, 0.7, 0);
  list.push(tinted(beak, 0xd8a24c));
  const tail = new THREE.ConeGeometry(0.15, 0.34, 5);
  tail.rotateZ(Math.PI / 2);
  tail.translate(-0.62, 0.34, 0);
  list.push(tinted(tail, 0x4f4536));
  return mergeTinted(list);
}

function makeFishGeometry() {
  const list = [];
  const body = new THREE.SphereGeometry(0.34, 7, 5);
  body.scale(1.9, 0.58, 0.6);
  list.push(tinted(body, 0xd6d2be));
  const back = new THREE.SphereGeometry(0.26, 6, 4);
  back.scale(1.8, 0.4, 0.52);
  back.translate(0, 0.1, 0);
  list.push(tinted(back, 0x8e8b70));
  const tail = new THREE.ConeGeometry(0.22, 0.4, 4);
  tail.rotateZ(Math.PI / 2);
  tail.translate(-0.8, 0, 0);
  list.push(tinted(tail, 0xcfae74));
  return mergeTinted(list);
}

function makeCyclistGeometry() {
  const list = [];
  for (const sx of [-0.62, 0.62]) {
    const wheel = new THREE.TorusGeometry(0.34, 0.045, 4, 10);
    wheel.translate(sx, 0.35, 0);
    list.push(tinted(wheel, 0x24282a));
  }
  const frame = new THREE.BoxGeometry(1.05, 0.07, 0.07);
  frame.rotateZ(0.12);
  frame.translate(0, 0.56, 0);
  list.push(tinted(frame, 0x8f3d2f));
  const seat = new THREE.BoxGeometry(0.24, 0.08, 0.14);
  seat.translate(-0.3, 0.78, 0);
  list.push(tinted(seat, 0x2b2724));
  const bar = new THREE.BoxGeometry(0.07, 0.28, 0.44);
  bar.translate(0.48, 0.78, 0);
  list.push(tinted(bar, 0x303234));
  const body = new THREE.BoxGeometry(0.28, 0.52, 0.24);
  body.rotateZ(-0.22);
  body.translate(0.02, 1.05, 0);
  list.push(tinted(body, 0x3d6b83));
  const head = new THREE.SphereGeometry(0.13, 7, 5);
  head.translate(0.16, 1.38, 0);
  list.push(tinted(head, 0x6a513d));
  const arm = new THREE.BoxGeometry(0.42, 0.07, 0.07);
  arm.rotateZ(-0.65);
  arm.translate(0.34, 1.02, 0);
  list.push(tinted(arm, 0x3d6b83));
  return mergeTinted(list);
}

function makeBirdGeometry() {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute([
    -1, 0, 0, 0, 0.32, 0, 0, 0, 0,
    1, 0, 0, 0, 0.32, 0, 0, 0, 0,
  ], 3));
  geo.computeVertexNormals();
  return geo;
}

function makeLanternGeometry() {
  const body = new THREE.SphereGeometry(0.22, 8, 6);
  body.scale(0.88, 1.25, 0.88);
  body.translate(0, -0.26, 0);
  return body;
}

export function createEastLakeRefinementLife() {
  const group = new THREE.Group();
  group.name = 'refinement-life';

  const waves = makeShoreWaves();
  waves.mesh.name = 'refine-shore-waves';
  group.add(waves.mesh);

  const duckGeo = makeDuckGeometry();
  const duckMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92 });
  const duckCenters = [
    [-338, 164, 8.5, 0.16], [-330, 188, 5.5, -0.13],
    [116, 166, 9.0, 0.11], [176, 152, 6.0, -0.17],
    [414, 148, 8.0, 0.14], [-204, 282, 7.0, 0.12],
  ];
  const duckCount = 15;
  const ducks = new THREE.InstancedMesh(duckGeo, duckMat, duckCount);
  ducks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  ducks.frustumCulled = false;
  ducks.castShadow = false;
  ducks.name = 'refine-ducks';
  group.add(ducks);
  const duckSeeds = [];
  for (let i = 0; i < duckCount; i++) {
    const c = duckCenters[i % duckCenters.length];
    const child = i >= duckCenters.length ? 0.72 : 1;
    duckSeeds.push({
      cx: c[0] + (hash(20001, i) - 0.5) * 3.5,
      cz: c[1] + (hash(20001, i + 4) - 0.5) * 3.5,
      r: c[2] * (0.55 + hash(20001, i + 8) * 0.35),
      speed: c[3] * (0.8 + hash(20001, i + 12) * 0.5),
      phase: hash(20001, i + 16) * 6.28,
      scale: child * (0.8 + hash(20001, i + 20) * 0.35),
      bob: hash(20001, i + 24) * 6.28,
    });
  }

  const fishGeo = makeFishGeometry();
  const fishMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.15 });
  const fishSpots = [
    [-330, 122, 7.0], [-326, 154, 6.0], [-330, 182, 5.2],
    [108, 146, 6.0], [160, 180, 5.0], [404, 140, 5.0],
  ];
  const fishCount = 16;
  const fish = new THREE.InstancedMesh(fishGeo, fishMat, fishCount);
  fish.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  fish.frustumCulled = false;
  fish.castShadow = false;
  fish.name = 'refine-fish';
  group.add(fish);
  const fishSeeds = [];
  for (let i = 0; i < fishCount; i++) {
    const s = fishSpots[i % fishSpots.length];
    fishSeeds.push({
      cx: s[0] + (hash(21001, i) - 0.5) * 4,
      cz: s[1] + (hash(21001, i + 3) - 0.5) * 4,
      r: s[2] * (0.4 + hash(21001, i + 6) * 0.5),
      speed: 0.22 + hash(21001, i + 9) * 0.18,
      phase: hash(21001, i + 12) * 6.28,
      scale: 0.8 + hash(21001, i + 15) * 0.5,
    });
  }

  const lanternGeo = makeLanternGeometry();
  const lanternCount = 22;
  const lanterns = new THREE.InstancedMesh(lanternGeo, mats.lantern, lanternCount);
  lanterns.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  lanterns.frustumCulled = false;
  lanterns.castShadow = false;
  lanterns.name = 'refine-lanterns';
  group.add(lanterns);
  const lanternSeeds = [];
  for (let i = 0; i < lanternCount; i++) {
    let x;
    let z;
    if (i < 10) {
      const t = i / 9;
      x = -352 + t * 13;
      z = 92 + t * 122;
    } else if (i < 18) {
      const t = (i - 10) / 7;
      x = -410 + t * 142;
      z = 694 + t * 34;
    } else {
      const t = (i - 18) / 3;
      x = -302 + t * 46;
      z = 838 - t * 26;
    }
    const gy = Math.max(0.6, terrainHeight(x, z));
    lanternSeeds.push({ x, z, y: gy + 4.2 + hash(22001, i) * 0.3, phase: hash(22001, i + 5) * 6.28 });
  }

  const cyclistGeo = makeCyclistGeometry();
  const cyclistMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.72 });
  const cyclistCount = 5;
  const cyclists = new THREE.InstancedMesh(cyclistGeo, cyclistMat, cyclistCount);
  cyclists.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  cyclists.frustumCulled = false;
  cyclists.castShadow = false;
  cyclists.name = 'refine-cyclists';
  group.add(cyclists);
  const cycleCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-446, 0, -640), new THREE.Vector3(-462, 0, -560),
    new THREE.Vector3(-444, 0, -480), new THREE.Vector3(-472, 0, -400),
    new THREE.Vector3(-532, 0, -320), new THREE.Vector3(-546, 0, -240),
    new THREE.Vector3(-412, 0, -200), new THREE.Vector3(-444, 0, -120),
    new THREE.Vector3(-454, 0, -80), new THREE.Vector3(-462, 0, -8),
    new THREE.Vector3(-388, 0, 52), new THREE.Vector3(-366, 0, 120),
    new THREE.Vector3(-348, 0, 160), new THREE.Vector3(-346, 0, 200),
    new THREE.Vector3(-360, 0, 280), new THREE.Vector3(-438, 0, 340),
    new THREE.Vector3(-392, 0, 400), new THREE.Vector3(-482, 0, 480),
    new THREE.Vector3(-650, 0, 560),
  ], false, 'centripetal', 0.5);
  const cycleSeeds = [];
  for (let i = 0; i < cyclistCount; i++) {
    cycleSeeds.push({
      t: i / cyclistCount + 0.04,
      speed: 0.007 + hash(23001, i) * 0.0025,
      lane: (i % 2 ? 1.25 : -1.25),
      scale: 0.95 + hash(23001, i + 4) * 0.18,
    });
  }

  const birdGeo = makeBirdGeometry();
  const birdMat = new THREE.MeshBasicMaterial({ color: 0x536164, side: THREE.DoubleSide, transparent: true, opacity: 0.66 });
  const birdCount = 20;
  const birds = new THREE.InstancedMesh(birdGeo, birdMat, birdCount);
  birds.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  birds.frustumCulled = false;
  birds.castShadow = false;
  birds.name = 'refine-birds';
  group.add(birds);
  const birdSeeds = [];
  for (let i = 0; i < birdCount; i++) {
    birdSeeds.push({
      cx: -322 + (hash(24001, i) - 0.5) * 120,
      cz: 754 + (hash(24001, i + 4) - 0.5) * 100,
      y: 34 + hash(24001, i + 8) * 26,
      r: 18 + hash(24001, i + 12) * 40,
      speed: 0.09 + hash(24001, i + 16) * 0.05,
      phase: hash(24001, i + 20) * 6.28,
      tilt: i % 2 ? 1 : -1,
    });
  }

  const cyclePoint = new THREE.Vector3();
  const cycleTan = new THREE.Vector3();

  function update(elapsed) {
    waves.uniforms.uTime.value = elapsed;

    for (let i = 0; i < duckCount; i++) {
      const s = duckSeeds[i];
      const a = elapsed * s.speed + s.phase;
      const x = s.cx + Math.cos(a) * s.r;
      const z = s.cz + Math.sin(a) * s.r;
      dummy.position.set(x, WATER_Y + 0.02 + Math.sin(elapsed * 1.4 + s.bob) * 0.045, z);
      dummy.rotation.set(Math.sin(elapsed * 1.1 + s.bob) * 0.03, -a + Math.PI * 0.5, Math.sin(elapsed * 1.5 + s.phase) * 0.045);
      dummy.scale.setScalar(s.scale);
      dummy.updateMatrix();
      ducks.setMatrixAt(i, dummy.matrix);
    }
    ducks.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < fishCount; i++) {
      const s = fishSeeds[i];
      const a = elapsed * s.speed + s.phase;
      const cycle = (Math.sin(a * 0.7 + s.phase) + 1) * 0.5;
      const leap = Math.max(0, Math.sin(a * 0.7 + s.phase));
      const x = s.cx + Math.cos(a) * s.r;
      const z = s.cz + Math.sin(a) * s.r;
      dummy.position.set(x, WATER_Y - 0.18 + leap * leap * 1.25, z);
      dummy.rotation.set(0, -a + Math.PI * 0.5, -leap * 0.9 + cycle * 0.05);
      dummy.scale.setScalar(s.scale);
      dummy.updateMatrix();
      fish.setMatrixAt(i, dummy.matrix);
    }
    fish.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < lanternCount; i++) {
      const s = lanternSeeds[i];
      const sway = Math.sin(elapsed * 1.5 + s.phase);
      dummy.position.set(
        s.x + sway * 0.18,
        s.y + Math.sin(elapsed * 2.1 + s.phase * 1.7) * 0.05,
        s.z + Math.cos(elapsed * 1.2 + s.phase) * 0.14
      );
      dummy.rotation.set(sway * 0.22, elapsed * 0.12 + s.phase, Math.cos(elapsed * 1.1 + s.phase) * 0.18);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      lanterns.setMatrixAt(i, dummy.matrix);
    }
    lanterns.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < cyclistCount; i++) {
      const s = cycleSeeds[i];
      const t = (s.t + elapsed * s.speed) % 1;
      cycleCurve.getPointAt(t, cyclePoint);
      cycleCurve.getTangentAt(t, cycleTan);
      const nx = -cycleTan.z;
      const nz = cycleTan.x;
      const gy = terrainHeight(cyclePoint.x + nx * s.lane, cyclePoint.z + nz * s.lane);
      dummy.position.set(cyclePoint.x + nx * s.lane, gy + 0.06 + Math.sin(elapsed * 3.2 + i) * 0.025, cyclePoint.z + nz * s.lane);
      dummy.rotation.set(0, Math.atan2(-cycleTan.z, cycleTan.x), Math.sin(elapsed * 1.5 + i) * 0.03);
      dummy.scale.setScalar(s.scale);
      dummy.updateMatrix();
      cyclists.setMatrixAt(i, dummy.matrix);
    }
    cyclists.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < birdCount; i++) {
      const s = birdSeeds[i];
      const a = elapsed * s.speed + s.phase;
      dummy.position.set(
        s.cx + Math.cos(a) * s.r,
        s.y + Math.sin(a * 1.8 + s.phase) * 4,
        s.cz + Math.sin(a) * s.r
      );
      dummy.rotation.set(0, -a - Math.PI * 0.5, Math.sin(elapsed * 7 + s.phase) * 0.55 * s.tilt, 'YXZ');
      dummy.scale.setScalar(1.2 + (i % 3) * 0.14);
      dummy.updateMatrix();
      birds.setMatrixAt(i, dummy.matrix);
    }
    birds.instanceMatrix.needsUpdate = true;
  }

  return { group, update };
}
