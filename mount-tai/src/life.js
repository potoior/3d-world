import * as THREE from 'three';
import { mats } from './materials.js';
import { trailCurve, trailPointAt, trailWidthAt } from './terrain.js';
import { mergeGeometryList } from './geometry.js';

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pushBox(list, w, h, d, x, y, z, ry = 0, rz = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (rz) g.rotateZ(rz);
  if (ry) g.rotateY(ry);
  g.translate(x, y, z);
  list.push(g);
}

function createRibbons(racks) {
  const rand = mulberry32(7731);
  const total = racks.reduce((sum, r) => sum + r.count, 0);
  const geo = new THREE.PlaneGeometry(0.16, 1, 1, 4);
  geo.translate(0, -0.5, 0);
  const mesh = new THREE.InstancedMesh(geo, mats.ribbon, total);
  mesh.name = 'prayer-ribbons';
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.frustumCulled = false;
  const items = [];
  const color = new THREE.Color();
  const palette = [0xa83224, 0xc0442c, 0xd4a33f, 0xb26a2a, 0x9a2d22, 0xcf8a35];
  let index = 0;
  for (const rack of racks) {
    for (let i = 0; i < rack.count; i++) {
      const u = rack.count === 1 ? 0 : i / (rack.count - 1);
      const lx = (u - 0.5) * rack.width;
      const x = rack.x + Math.cos(rack.yaw) * lx;
      const z = rack.z - Math.sin(rack.yaw) * lx;
      items.push({
        x, y: rack.y, z,
        yaw: rack.yaw,
        phase: rand() * Math.PI * 2,
        amp: 0.08 + rand() * 0.17,
        len: 0.46 + rand() * 0.55,
        drift: (rand() - 0.5) * 0.2,
      });
      color.setHex(palette[(rand() * palette.length) | 0]);
      mesh.setColorAt(index, color);
      index++;
    }
  }
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  const dummy = new THREE.Object3D();
  return {
    mesh,
    count: total,
    update(elapsed) {
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const sway = Math.sin(elapsed * 2.1 + it.phase) * it.amp;
        const twist = Math.cos(elapsed * 1.35 + it.phase) * it.amp * 0.4;
        dummy.position.set(it.x, it.y, it.z);
        dummy.rotation.set(0, it.yaw + twist, sway, 'YXZ');
        dummy.scale.set(1, it.len, 1);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}

function hikerGeometry(withLoad) {
  const list = [];
  pushBox(list, 0.14, 0.52, 0.16, -0.1, 0.28, 0);
  pushBox(list, 0.14, 0.52, 0.16, 0.1, 0.28, 0);
  pushBox(list, 0.36, 0.62, 0.24, 0, 0.95, 0);
  pushBox(list, 0.12, 0.52, 0.13, -0.24, 0.94, 0, 0, 0.12);
  pushBox(list, 0.12, 0.52, 0.13, 0.24, 0.94, 0, 0, -0.12);
  const head = new THREE.SphereGeometry(0.17, 8, 6);
  head.translate(0, 1.46, 0);
  list.push(head);
  const hat = new THREE.ConeGeometry(0.28, 0.16, 8);
  hat.translate(0, 1.64, 0);
  list.push(hat);
  if (withLoad) {
    const pole = new THREE.CylinderGeometry(0.035, 0.035, 1.9, 5);
    pole.rotateZ(Math.PI * 0.5);
    pole.translate(0, 1.24, 0.08);
    list.push(pole);
    for (const side of [-1, 1]) {
      const basket = new THREE.CylinderGeometry(0.2, 0.16, 0.28, 7);
      basket.translate(side * 0.82, 0.98, 0.08);
      list.push(basket);
      const rope = new THREE.CylinderGeometry(0.012, 0.012, 0.35, 3);
      rope.translate(side * 0.82, 1.18, 0.08);
      list.push(rope);
    }
    pushBox(list, 0.3, 0.4, 0.16, 0, 1.14, -0.17);
  } else {
    pushBox(list, 0.3, 0.38, 0.15, 0, 1.03, -0.18);
  }
  return mergeGeometryList(list);
}

function createPeople() {
  const rand = mulberry32(4471);
  const dummy = new THREE.Object3D();
  const colors = [0x3e4b55, 0x5b4a3b, 0x6b3230, 0x47553f, 0x7a6a53, 0x39424a];
  const hikerGeo = hikerGeometry(false);
  const porterGeo = hikerGeometry(true);

  const hikers = [];
  const hikerMesh = new THREE.InstancedMesh(hikerGeo, mats.person, 12);
  hikerMesh.name = 'hikers';
  hikerMesh.castShadow = true;
  hikerMesh.receiveShadow = true;
  hikerMesh.frustumCulled = false;
  for (let i = 0; i < 12; i++) {
    hikers.push({
      t: 0.06 + rand() * 0.88,
      speed: 0.012 + rand() * 0.012,
      dir: rand() < 0.62 ? 1 : -1,
      lateral: (rand() - 0.5) * 1.2,
      phase: rand() * 10,
      scale: 0.9 + rand() * 0.18,
    });
    hikerMesh.setColorAt(i, new THREE.Color(colors[(rand() * colors.length) | 0]));
  }
  if (hikerMesh.instanceColor) hikerMesh.instanceColor.needsUpdate = true;

  const porters = [];
  const porterMesh = new THREE.InstancedMesh(porterGeo, mats.person, 5);
  porterMesh.name = 'porters';
  porterMesh.castShadow = true;
  porterMesh.receiveShadow = true;
  porterMesh.frustumCulled = false;
  for (let i = 0; i < 5; i++) {
    porters.push({
      t: 0.18 + rand() * 0.7,
      speed: 0.007 + rand() * 0.006,
      dir: rand() < 0.5 ? 1 : -1,
      lateral: (rand() - 0.5) * 0.9,
      phase: rand() * 10,
      scale: 0.98 + rand() * 0.1,
    });
    porterMesh.setColorAt(i, new THREE.Color(i % 2 ? 0x5e4a37 : 0x4a4036));
  }
  if (porterMesh.instanceColor) porterMesh.instanceColor.needsUpdate = true;

  const curveLength = Math.max(1, trailCurve.getLength());

  function updatePeople(mesh, list, elapsed, dt, bobScale) {
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      p.t += (p.dir * p.speed * dt);
      if (p.t > 0.985) { p.t = 0.985; p.dir = -1; }
      if (p.t < 0.015) { p.t = 0.015; p.dir = 1; }
      const pos = trailPointAt(p.t);
      const tan = trailCurve.getTangentAt(p.t);
      const nx = tan.z;
      const nz = -tan.x;
      const limit = Math.max(0.4, trailWidthAt(p.t) * 0.5 - 0.7);
      const lateral = Math.max(-limit, Math.min(limit, p.lateral));
      const bob = Math.abs(Math.sin(elapsed * 3.4 + p.phase)) * 0.045 * bobScale;
      dummy.position.set(pos.x + nx * lateral, pos.y + 0.16 + bob, pos.z + nz * lateral);
      const yaw = Math.atan2(tan.x, tan.z) + (p.dir < 0 ? Math.PI : 0);
      dummy.rotation.set(0, yaw, 0);
      dummy.scale.setScalar(p.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  return {
    group: [hikerMesh, porterMesh],
    count: { hikers: hikers.length, porters: porters.length },
    update(elapsed, dt) {
      updatePeople(hikerMesh, hikers, elapsed, dt, 1);
      updatePeople(porterMesh, porters, elapsed, dt, 0.6);
    },
  };
}

function createBirds() {
  const list = [];
  for (const side of [-1, 1]) {
    const wing = new THREE.BoxGeometry(0.56, 0.035, 0.16);
    wing.rotateZ(side * -0.42);
    wing.translate(side * 0.25, 0, 0);
    list.push(wing);
  }
  pushBox(list, 0.16, 0.07, 0.36, 0, 0, 0.02);
  const geo = mergeGeometryList(list);
  const mesh = new THREE.InstancedMesh(geo, mats.bird, 26);
  mesh.name = 'birds';
  mesh.castShadow = false;
  mesh.frustumCulled = false;
  const dummy = new THREE.Object3D();
  const birds = [];
  const rand = mulberry32(6612);
  for (let i = 0; i < 26; i++) {
    birds.push({
      cx: -60 + (rand() - 0.5) * 240,
      cz: -260 + (rand() - 0.5) * 260,
      r: 60 + rand() * 170,
      y: 268 + rand() * 64,
      speed: 0.08 + rand() * 0.13,
      phase: rand() * Math.PI * 2,
      flap: rand() * 10,
      scale: 0.7 + rand() * 0.9,
    });
  }
  return {
    mesh,
    count: birds.length,
    update(elapsed) {
      for (let i = 0; i < birds.length; i++) {
        const b = birds[i];
        const a = b.phase + elapsed * b.speed;
        const x = b.cx + Math.cos(a) * b.r;
        const z = b.cz + Math.sin(a) * b.r * 0.7;
        const y = b.y + Math.sin(elapsed * 0.6 + b.phase) * 6;
        dummy.position.set(x, y, z);
        dummy.rotation.set(Math.sin(elapsed * b.flap) * 0.22, -a + Math.PI * 0.5, Math.sin(elapsed * b.flap) * 0.35);
        dummy.scale.setScalar(b.scale);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}

function createSmoke(emitters) {
  const rand = mulberry32(3321);
  const count = 130;
  const positions = new Float32Array(count * 3);
  const particles = [];
  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    const e = emitters[i % emitters.length] || { x: 0, y: 200, z: 0, scale: 1 };
    particles.push({
      e,
      offset: rand() * 2.6,
      life: rand() * 3.2,
      duration: 3 + rand() * 2.4,
      rise: 0.7 + rand() * 1.4,
      drift: (rand() - 0.5) * 0.7,
      phase: rand() * Math.PI * 2,
    });
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const points = new THREE.Points(geo, mats.smoke);
  points.name = 'incense-smoke';
  points.frustumCulled = false;
  points.renderOrder = 5;
  return {
    points,
    count,
    update(elapsed, dt) {
      const pos = geo.attributes.position;
      for (let i = 0; i < count; i++) {
        const p = particles[i];
        p.life += dt;
        if (p.life > p.duration) {
          p.life = 0;
          p.offset = rand() * 1.2 - 0.6;
          p.phase = rand() * Math.PI * 2;
        }
        const k = p.life / p.duration;
        const spread = (p.e.scale || 1) * (0.12 + k * 0.55 * p.rise);
        const x = p.e.x + p.offset * p.e.scale + Math.sin(elapsed * 0.8 + p.phase) * spread;
        const y = p.e.y + p.life * p.rise;
        const z = p.e.z + Math.cos(elapsed * 0.7 + p.phase) * spread * 0.8;
        pos.setXYZ(i, x, y, z);
      }
      pos.needsUpdate = true;
    },
  };
}

export function createLife(arch) {
  const group = new THREE.Group();
  group.name = 'taishan-animated-life';
  const ribbons = createRibbons(arch.ribbonRacks);
  group.add(ribbons.mesh);
  const people = createPeople();
  people.group.forEach((m) => group.add(m));
  const birds = createBirds();
  group.add(birds.mesh);
  const smoke = createSmoke(arch.smokeEmitters.length ? arch.smokeEmitters : [{ x: 0, y: 250, z: 0, scale: 1 }]);
  group.add(smoke.points);
  ribbons.update(0);
  people.update(0, 0.016);
  birds.update(0);
  smoke.update(0, 0.016);
  return {
    group,
    update(elapsed, dt) {
      ribbons.update(elapsed);
      people.update(elapsed, dt);
      birds.update(elapsed);
      smoke.update(elapsed, dt);
    },
    counts: {
      ribbons: ribbons.count,
      hikers: people.count.hikers,
      porters: people.count.porters,
      birds: birds.count,
      smoke: smoke.count,
    },
  };
}
