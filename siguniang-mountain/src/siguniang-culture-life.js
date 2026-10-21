import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { heightAt, rand } from './siguniang-util.js';

const FLAG_COLORS = [0x2f6fb3, 0xf2eee0, 0xc9452f, 0x3f8a52, 0xdfb13a];

function addRod(list, ax, ay, az, bx, by, bz, r = 0.06, seg = 5) {
  const dx = bx - ax;
  const dy = by - ay;
  const dz = bz - az;
  const len = Math.hypot(dx, dy, dz);
  if (len < 0.0001) return;
  const g = new THREE.CylinderGeometry(r, r, len, seg);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx / len, dy / len, dz / len)));
  g.translate((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
  list.push(g);
}

function catenary(a, b, sag, t) {
  const x = a[0] + (b[0] - a[0]) * t;
  const z = a[1] + (b[1] - a[1]) * t;
  const ga = heightAt(a[0], a[1]);
  const gb = heightAt(b[0], b[1]);
  const y = Math.max(ga, gb) + 8.6 + (gb - ga) * t - sag * 4 * t * (1 - t);
  return new THREE.Vector3(x, y, z);
}

export function createPrayerFlags(staticRoot, mats) {
  const group = new THREE.Group();
  const positions = [];
  const colors = [];
  const uvs = [];
  const drops = [];
  const phases = [];
  const indices = [];
  const ropes = [];
  const poles = [];
  const color = new THREE.Color();

  const strings = [
    { a: [-72, -212], b: [136, -188], sag: 4.4, n: 17, pole: 9.2 },
    { a: [252, -334], b: [372, -300], sag: 3.1, n: 13, pole: 8.2 },
    { a: [-196, -34], b: [-28, 66], sag: 4.9, n: 16, pole: 9.4 },
    { a: [196, -122], b: [326, -92], sag: 3.2, n: 12, pole: 7.8 },
  ];

  let flagIndex = 0;
  for (const s of strings) {
    const ga = heightAt(s.a[0], s.a[1]);
    const gb = heightAt(s.b[0], s.b[1]);
    for (const [px, pz, gy] of [[s.a[0], s.a[1], ga], [s.b[0], s.b[1], gb]]) {
      addRod(poles, px, gy - 0.4, pz, px, gy + s.pole, pz, 0.15, 6);
      const finial = new THREE.SphereGeometry(0.24, 7, 5);
      finial.translate(px, gy + s.pole + 0.15, pz);
      poles.push(finial);
    }
    const curvePts = [];
    for (let i = 0; i <= 18; i++) curvePts.push(catenary(s.a, s.b, s.sag, i / 18));
    const ropeCurve = new THREE.CatmullRomCurve3(curvePts);
    ropes.push(new THREE.TubeGeometry(ropeCurve, 30, 0.045, 3, false));

    for (let k = 0; k < s.n; k++) {
      const t = (k + 0.5) / s.n;
      const c = catenary(s.a, s.b, s.sag, t);
      const ahead = catenary(s.a, s.b, s.sag, Math.min(1, t + 0.01));
      const behind = catenary(s.a, s.b, s.sag, Math.max(0, t - 0.01));
      const tx = ahead.x - behind.x;
      const tz = ahead.z - behind.z;
      const tl = Math.hypot(tx, tz) || 1;
      const ux = tx / tl;
      const uz = tz / tl;
      const w = 1.45;
      const h = 1.0;
      const phase = rand(2101, flagIndex) * Math.PI * 2;
      color.setHex(FLAG_COLORS[flagIndex % FLAG_COLORS.length]);
      const base = positions.length / 3;
      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 3; col++) {
          const u = col / 2;
          const drop = row;
          const fold = col === 1 ? 0.14 : 0;
          positions.push(
            c.x + ux * (u - 0.5) * w + uz * fold,
            c.y - drop * h,
            c.z + uz * (u - 0.5) * w - ux * fold
          );
          colors.push(color.r, color.g, color.b);
          uvs.push(u, drop);
          drops.push(drop);
          phases.push(phase);
        }
      }
      for (let col = 0; col < 2; col++) {
        const a = base + col;
        const b = base + col + 1;
        const c2 = base + 3 + col;
        const d = base + 4 + col;
        indices.push(a, c2, b, b, c2, d);
      }
      flagIndex++;
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute('aDrop', new THREE.Float32BufferAttribute(drops, 1));
  geo.setAttribute('aPhase', new THREE.Float32BufferAttribute(phases, 1));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const flagTime = { value: 0 };
  const flagMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
    roughness: 0.88,
    metalness: 0.02,
  });
  flagMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = flagTime;
    shader.vertexShader = 'uniform float uTime;\nattribute float aDrop;\nattribute float aPhase;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      float sway = sin(uTime * 3.6 + aPhase + position.x * 0.11 + position.z * 0.07);
      transformed.x += sway * 0.34 * aDrop;
      transformed.z += cos(uTime * 3.1 + aPhase * 1.4 + position.x * 0.07) * 0.2 * aDrop;
      transformed.y += sin(uTime * 5.2 + aPhase) * 0.055 * aDrop;`
    );
  };
  flagMat.customProgramCacheKey = () => 'siguniang-flags';
  const flags = new THREE.Mesh(geo, flagMat);
  flags.userData.animTime = flagTime;
  flags.castShadow = true;
  flags.receiveShadow = true;
  group.add(flags);

  const ropeMesh = new THREE.Mesh(mergeGeometries(ropes, false), mats.rope);
  ropeMesh.castShadow = true;
  staticRoot.add(ropeMesh);
  const poleMesh = new THREE.Mesh(mergeGeometries(poles, false), mats.woodDark);
  poleMesh.castShadow = true;
  staticRoot.add(poleMesh);

  return {
    group,
    update(t) {
      flagTime.value = t;
    },
  };
}

function mergeYak(list) {
  return mergeGeometries(list, false);
}

function makeYakBody() {
  const parts = [];
  const body = new THREE.SphereGeometry(1, 12, 9);
  body.scale(1.55, 0.92, 0.84);
  body.translate(0, 1.95, 0);
  parts.push(body);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const leg = new THREE.CylinderGeometry(0.13, 0.19, 1.5, 6);
      leg.translate(sx * 0.78, 0.75, sz * 0.58);
      parts.push(leg);
    }
  }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const shag = new THREE.ConeGeometry(0.22, 0.78, 5);
    shag.rotateZ(Math.PI);
    shag.translate(Math.cos(a) * 1.18, 1.24, Math.sin(a) * 0.66);
    parts.push(shag);
  }
  const tail = new THREE.ConeGeometry(0.16, 0.85, 5);
  tail.rotateX(-0.5);
  tail.translate(0, 1.55, -1.4);
  parts.push(tail);
  return mergeYak(parts);
}

function makeYakHead() {
  const parts = [];
  const skull = new THREE.SphereGeometry(0.58, 10, 8);
  skull.scale(0.9, 0.82, 0.92);
  skull.translate(0, 0.16, 0.1);
  parts.push(skull);
  const snout = new THREE.BoxGeometry(0.5, 0.38, 0.66);
  snout.translate(0, -0.05, 0.72);
  parts.push(snout);
  for (const sx of [-1, 1]) {
    const ear = new THREE.ConeGeometry(0.12, 0.36, 5);
    ear.rotateZ(sx * 1.1);
    ear.translate(sx * 0.48, 0.32, 0.0);
    parts.push(ear);
  }
  return mergeYak(parts);
}

function makeYakHorns() {
  const parts = [];
  for (const sx of [-1, 1]) {
    addRod(parts, sx * 0.28, 0.36, 0.16, sx * 0.58, 0.52, 0.02, 0.085, 5);
    addRod(parts, sx * 0.58, 0.52, 0.02, sx * 0.78, 0.78, 0.12, 0.06, 5);
    const tip = new THREE.ConeGeometry(0.06, 0.28, 5);
    tip.rotateZ(-sx * 0.35);
    tip.translate(sx * 0.82, 0.9, 0.14);
    parts.push(tip);
  }
  return mergeYak(parts);
}

const YAK_SPOTS = [
  [178, -182], [238, -148], [148, -96], [268, -248], [106, -334],
  [-42, -304], [-92, -202], [304, -62], [212, -32], [-132, -122],
  [62, -362], [332, -352], [338, -468], [276, -486], [392, -512],
];

export function createYaks(mats) {
  const group = new THREE.Group();
  const count = YAK_SPOTS.length;
  const bodyGeo = makeYakBody();
  const headGeo = makeYakHead();
  const hornGeo = makeYakHorns();
  const bodies = new THREE.InstancedMesh(bodyGeo, mats.fur, count);
  const heads = new THREE.InstancedMesh(headGeo, mats.fur, count);
  const horns = new THREE.InstancedMesh(hornGeo, mats.horn, count);
  bodies.castShadow = true;
  bodies.receiveShadow = true;
  heads.castShadow = true;
  horns.castShadow = true;
  const color = new THREE.Color();
  const entries = [];
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3(1, 1, 1);
  const p = new THREE.Vector3();
  const e = new THREE.Euler();

  for (let i = 0; i < count; i++) {
    const [x, z] = YAK_SPOTS[i];
    const y = heightAt(x, z);
    const yaw = rand(2201, i) * Math.PI * 2;
    const scale = 0.88 + rand(2203, i) * 0.26;
    entries.push({ x, y, z, yaw, phase: rand(2207, i) * Math.PI * 2, scale });
    p.set(x, y, z);
    e.set(0, yaw, 0);
    q.setFromEuler(e);
    s.set(scale, scale, scale);
    m.compose(p, q, s);
    bodies.setMatrixAt(i, m);
    color.setHSL(0.075, 0.2 + rand(2211, i) * 0.14, 0.13 + rand(2213, i) * 0.09);
    bodies.setColorAt(i, color);
    heads.setColorAt(i, color);
  }

  group.add(bodies, heads, horns);
  const hq = new THREE.Quaternion();
  const hp = new THREE.Vector3();
  const hs = new THREE.Vector3();
  const he = new THREE.Euler();
  const hm = new THREE.Matrix4();

  function update(t) {
    for (let i = 0; i < count; i++) {
      const it = entries[i];
      const graze = 0.5 + 0.5 * Math.sin(t * 0.43 + it.phase);
      const pitch = 0.12 + graze * 0.62 + Math.sin(t * 0.9 + it.phase) * 0.03;
      const sinY = Math.sin(it.yaw);
      const cosY = Math.cos(it.yaw);
      hp.set(it.x + sinY * 1.42 * it.scale, it.y + 2.26 * it.scale, it.z + cosY * 1.42 * it.scale);
      he.set(pitch, it.yaw, 0, 'YXZ');
      hq.setFromEuler(he);
      hs.set(it.scale, it.scale, it.scale);
      hm.compose(hp, hq, hs);
      heads.setMatrixAt(i, hm);
      horns.setMatrixAt(i, hm);
    }
    heads.instanceMatrix.needsUpdate = true;
    horns.instanceMatrix.needsUpdate = true;
  }

  update(0);
  return { group, update, count };
}
