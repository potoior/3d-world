import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mats, sharedTextures } from './materials.js';
import { mainCurve, heightAt } from './terrain.js';
import { WALL_HEIGHT, getWallFrame } from './wall.js';

const dummy = new THREE.Object3D();

function tinted(geo, hex, vary = 0.18) {
  const c = new THREE.Color(hex);
  const p = geo.attributes.position;
  const colors = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const n = Math.sin(p.getX(i) * 12.3 + p.getY(i) * 31.7 + p.getZ(i) * 71.1) * 43758.5453;
    const k = 1 - vary * 0.5 + (n - Math.floor(n)) * vary;
    colors[i * 3] = c.r * k;
    colors[i * 3 + 1] = c.g * k;
    colors[i * 3 + 2] = c.b * k;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo;
}

function box(list, hex, w, h, d, x, y, z, ry = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (ry) g.rotateY(ry);
  g.translate(x, y, z);
  list.push(tinted(g, hex));
}

function cylinder(list, hex, rt, rb, h, seg, x, y, z) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  g.translate(x, y, z);
  list.push(tinted(g, hex));
}

function makeWalkerGeometry() {
  const list = [];
  box(list, 0x1b201d, 0.2, 0.78, 0.24, -0.13, 0.4, 0);
  box(list, 0x1b201d, 0.2, 0.78, 0.24, 0.13, 0.4, 0);
  box(list, 0x8e3a2e, 0.48, 0.7, 0.3, 0, 1.12, 0);
  box(list, 0x8e3a2e, 0.15, 0.56, 0.18, 0.32, 1.12, 0);
  box(list, 0x8e3a2e, 0.15, 0.56, 0.18, -0.32, 1.12, 0);
  cylinder(list, 0x6a513d, 0.13, 0.14, 0.27, 6, 0, 1.59, 0);
  box(list, 0x2a2e2b, 0.4, 0.07, 0.4, 0, 1.74, 0);
  box(list, 0x5d4732, 0.4, 0.5, 0.22, 0, 1.2, -0.24);
  return mergeGeometries(list.map((g) => (g.index ? g.toNonIndexed() : g)), false);
}

function makeRavenGeometry() {
  const pos = [];
  const tri = (ax, ay, az, bx, by, bz, cx, cy, cz) => {
    pos.push(ax, ay, az, bx, by, bz, cx, cy, cz);
  };
  tri(0, 0, 0, -1.15, 0.28, 0.28, -0.36, -0.02, 0.62);
  tri(0, 0, 0, 1.15, 0.28, 0.28, 0.36, -0.02, 0.62);
  tri(0, 0.04, -0.2, -0.14, -0.04, 0.42, 0.14, -0.04, 0.42);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  return geo;
}

export function createBadalingRefinementLife(towers) {
  const group = new THREE.Group();
  group.name = 'badaling-refinement-life';

  const walkGeo = makeWalkerGeometry();
  const walkMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.94 });
  const walkCount = 10;
  const walkers = new THREE.InstancedMesh(walkGeo, walkMat, walkCount);
  walkers.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  walkers.frustumCulled = false;
  walkers.castShadow = false;
  walkers.name = 'refine-walkers';
  group.add(walkers);
  const walkSeeds = [];
  for (let i = 0; i < walkCount; i++) {
    walkSeeds.push({
      t: 0.05 + (i / walkCount) * 0.9,
      speed: 0.0011 + (i % 5) * 0.00016,
      side: i % 2 ? 1 : -1,
      lane: 0.75 + (i % 3) * 0.28,
      phase: i * 0.77,
      scale: 0.92 + (i % 4) * 0.045,
    });
  }

  const mistGeo = new THREE.PlaneGeometry(1, 1);
  const mistMat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        map: { value: sharedTextures.mistMap },
        uTime: { value: 0 },
        uOpacity: { value: 0.22 },
        uColor: { value: new THREE.Color(0xdde7ee) },
      },
    ]),
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: true,
    vertexShader: `
      varying vec2 vUv;
      #include <fog_pars_vertex>
      void main() {
        vUv = uv;
        vec3 ipos = instanceMatrix[3].xyz;
        vec2 iscale = vec2(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz));
        vec4 mvPosition = modelViewMatrix * vec4(ipos, 1.0);
        float bend = sin(position.x * 2.0 + ipos.x * 0.01) * 0.06;
        mvPosition.xy += (position.xy + vec2(bend, 0.0)) * iscale;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: `
      uniform sampler2D map;
      uniform float uTime;
      uniform float uOpacity;
      uniform vec3 uColor;
      varying vec2 vUv;
      #include <fog_pars_fragment>
      void main() {
        vec4 tex = texture2D(map, vUv);
        gl_FragColor = vec4(uColor * tex.rgb, tex.a * uOpacity);
        #include <fog_fragment>
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const mistCount = 5;
  const mist = new THREE.InstancedMesh(mistGeo, mistMat, mistCount);
  mist.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mist.frustumCulled = false;
  mist.renderOrder = 3;
  mist.name = 'refine-mist-bands';
  group.add(mist);
  const mistSeeds = [
    { x: -410, y: 118, z: -1020, sx: 760, sy: 76, speed: 10, phase: 0.4 },
    { x: 240, y: 88, z: -760, sx: 560, sy: 54, speed: 7, phase: 1.9 },
    { x: -820, y: 146, z: -1320, sx: 900, sy: 88, speed: 12, phase: 3.2 },
    { x: 680, y: 66, z: -420, sx: 420, sy: 40, speed: 5, phase: 4.6 },
    { x: -160, y: 208, z: -1520, sx: 1040, sy: 100, speed: 8, phase: 5.7 },
  ];

  const beaconTowers = towers.filter((t) => t.beaconWorld);
  const smokeCount = Math.max(24, beaconTowers.length * 20);
  const smokePos = new Float32Array(smokeCount * 3);
  const smokeSeeds = [];
  for (let i = 0; i < smokeCount; i++) {
    const anchor = beaconTowers[i % beaconTowers.length] || towers[0];
    const base = anchor.beaconWorld;
    const s = {
      x: base.x + (Math.sin(i * 1.7) * 0.24),
      y: base.y + 1.1,
      z: base.z + (Math.cos(i * 2.3) * 0.24),
      phase: (i / smokeCount + (i % 4) * 0.07) % 1,
      drift: Math.sin(i * 0.9) * 0.6,
    };
    smokeSeeds.push(s);
    smokePos[i * 3] = s.x;
    smokePos[i * 3 + 1] = s.y;
    smokePos[i * 3 + 2] = s.z;
  }
  const smokeGeo = new THREE.BufferGeometry();
  smokeGeo.setAttribute('position', new THREE.BufferAttribute(smokePos, 3));
  const smokeMat = new THREE.PointsMaterial({
    map: sharedTextures.mistMap,
    color: 0x9e9b91,
    size: 2.6,
    transparent: true,
    opacity: 0.2,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const smoke = new THREE.Points(smokeGeo, smokeMat);
  smoke.frustumCulled = false;
  smoke.renderOrder = 4;
  smoke.name = 'refine-brazier-smoke';
  group.add(smoke);

  const ravenGeo = makeRavenGeometry();
  const ravenCount = 12;
  const ravens = new THREE.InstancedMesh(ravenGeo, mats.dark, ravenCount);
  ravens.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  ravens.frustumCulled = false;
  ravens.castShadow = false;
  ravens.name = 'refine-ravens';
  group.add(ravens);
  const n8 = towers.find((t) => t.name === '北八楼') || towers[0];
  const s4 = towers.find((t) => t.name === '南四楼') || towers[towers.length - 1];
  const ravenSeeds = [];
  for (let i = 0; i < ravenCount; i++) {
    const base = i < 8 ? n8 : s4;
    ravenSeeds.push({
      cx: base.x + (i % 3 - 1) * 24,
      cz: base.z + (i % 4 - 1.5) * 18,
      y: base.walkTop + 32 + (i % 5) * 7,
      r: 32 + (i % 5) * 9,
      speed: 0.07 + (i % 4) * 0.018,
      phase: i * 0.71,
      tilt: i % 2 ? 1 : -1,
    });
  }

  function update(elapsed) {
    for (let i = 0; i < walkCount; i++) {
      const s = walkSeeds[i];
      const t = (s.t + elapsed * s.speed) % 1;
      const frame = getWallFrame(mainCurve, t);
      const x = frame.x + frame.nx * s.lane * s.side;
      const z = frame.z + frame.nz * s.lane * s.side;
      const y = frame.y + WALL_HEIGHT + Math.abs(Math.sin(elapsed * 4.2 + s.phase)) * 0.035;
      dummy.position.set(x, y, z);
      dummy.rotation.set(0, Math.atan2(frame.tx, frame.tz), Math.sin(elapsed * 4.2 + s.phase) * 0.02);
      dummy.scale.setScalar(s.scale);
      dummy.updateMatrix();
      walkers.setMatrixAt(i, dummy.matrix);
    }
    walkers.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < mistCount; i++) {
      const s = mistSeeds[i];
      dummy.position.set(
        s.x + Math.sin(elapsed * 0.018 + s.phase) * 36,
        s.y + Math.sin(elapsed * 0.05 + s.phase) * 2.2,
        s.z + Math.sin(elapsed * 0.012 + s.phase * 1.7) * 14
      );
      dummy.rotation.set(0, Math.sin(elapsed * 0.01 + s.phase) * 0.2, 0);
      dummy.scale.set(s.sx, s.sy, s.sx);
      dummy.updateMatrix();
      mist.setMatrixAt(i, dummy.matrix);
    }
    mist.instanceMatrix.needsUpdate = true;
    mistMat.uniforms.uTime.value = elapsed;
    mistMat.uniforms.uOpacity.value = 0.2 + Math.sin(elapsed * 0.11) * 0.03;

    const p = smokeGeo.attributes.position;
    for (let i = 0; i < smokeCount; i++) {
      const s = smokeSeeds[i];
      const life = (s.phase + elapsed * 0.055) % 1;
      p.setXYZ(
        i,
        s.x + s.drift * life * 2.4 + Math.sin(elapsed * 0.7 + i) * 0.35 * life,
        s.y + life * 7.2,
        s.z + Math.cos(elapsed * 0.55 + i * 0.8) * 0.55 * life
      );
    }
    p.needsUpdate = true;
    smokeMat.opacity = 0.16 + Math.sin(elapsed * 0.9) * 0.035;

    for (let i = 0; i < ravenCount; i++) {
      const s = ravenSeeds[i];
      const a = elapsed * s.speed + s.phase;
      dummy.position.set(
        s.cx + Math.cos(a) * s.r,
        s.y + Math.sin(a * 1.7 + s.phase) * 7,
        s.cz + Math.sin(a) * s.r
      );
      dummy.rotation.set(0, -a - Math.PI * 0.5, Math.sin(elapsed * 6.4 + s.phase) * 0.5 * s.tilt, 'YXZ');
      dummy.scale.setScalar(1.25 + (i % 3) * 0.18);
      dummy.updateMatrix();
      ravens.setMatrixAt(i, dummy.matrix);
    }
    ravens.instanceMatrix.needsUpdate = true;
  }

  return { group, update };
}
