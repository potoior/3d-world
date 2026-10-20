import * as THREE from 'three';
import { mats } from './materials.js';
import { heightAt } from './terrain.js';
import { chainRoute } from './peaks.js';
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

function visitorGeometry() {
  const list = [];
  pushBox(list, 0.14, 0.52, 0.16, -0.1, 0.28, 0);
  pushBox(list, 0.14, 0.52, 0.16, 0.1, 0.28, 0);
  pushBox(list, 0.36, 0.62, 0.24, 0, 0.95, 0);
  pushBox(list, 0.12, 0.52, 0.13, -0.24, 0.94, 0, 0, 0.12);
  pushBox(list, 0.12, 0.52, 0.13, 0.24, 0.94, 0, 0, -0.12);
  const head = new THREE.SphereGeometry(0.17, 7, 6);
  head.translate(0, 1.46, 0);
  list.push(head);
  const hat = new THREE.ConeGeometry(0.28, 0.16, 8);
  hat.translate(0, 1.64, 0);
  list.push(hat);
  pushBox(list, 0.3, 0.38, 0.15, 0, 1.03, -0.19);
  return mergeGeometryList(list);
}

function ribbonGeometry() {
  const g = new THREE.PlaneGeometry(0.16, 1, 1, 4);
  g.translate(0, -0.5, 0);
  return g;
}

function makeRibbons(racks) {
  const rand = mulberry32(8813);
  const total = Math.max(1, racks.reduce((sum, r) => sum + r.count, 0));
  const mesh = new THREE.InstancedMesh(ribbonGeometry(), mats.ribbon, total);
  mesh.name = 'final-prayer-ribbons';
  mesh.castShadow = false;
  mesh.frustumCulled = false;
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  const palette = [0xa83224, 0xc0442c, 0xd4a33f, 0xb26a2a, 0x9a2d22, 0xcf8a35];
  const items = [];
  let index = 0;
  for (const rack of racks) {
    for (let i = 0; i < rack.count; i++) {
      const u = rack.count === 1 ? 0 : i / (rack.count - 1);
      const lx = (u - 0.5) * rack.width;
      items.push({
        x: rack.x + Math.cos(rack.yaw) * lx,
        y: rack.y,
        z: rack.z - Math.sin(rack.yaw) * lx,
        yaw: rack.yaw,
        phase: rand() * Math.PI * 2,
        amp: 0.09 + rand() * 0.18,
        len: 0.45 + rand() * 0.55,
      });
      mesh.setColorAt(index, color.setHex(palette[(rand() * palette.length) | 0]));
      index++;
    }
  }
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return {
    mesh,
    count: total,
    update(time) {
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const sway = Math.sin(time * 2.0 + it.phase) * it.amp;
        const twist = Math.cos(time * 1.3 + it.phase) * it.amp * 0.35;
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

function makeMist() {
  const rand = mulberry32(9911);
  const count = 22;
  const geo = new THREE.PlaneGeometry(48, 12);
  const mesh = new THREE.InstancedMesh(geo, mats.mist, count);
  mesh.name = 'final-valley-mist';
  mesh.frustumCulled = false;
  mesh.renderOrder = 4;
  const dummy = new THREE.Object3D();
  const data = [];
  for (let i = 0; i < count; i++) {
    data.push({
      x: -200 + rand() * 430,
      y: 232 + rand() * 92,
      z: -430 + rand() * 260,
      yaw: rand() * Math.PI * 2,
      phase: rand() * Math.PI * 2,
      speed: 0.035 + rand() * 0.05,
      drift: 6 + rand() * 16,
      scale: 0.7 + rand() * 1.7,
    });
  }
  return {
    mesh,
    count,
    update(time) {
      for (let i = 0; i < data.length; i++) {
        const d = data[i];
        const drift = Math.sin(time * d.speed + d.phase);
        dummy.position.set(
          d.x + drift * d.drift,
          d.y + Math.sin(time * d.speed * 0.7 + d.phase) * 1.8,
          d.z + Math.cos(time * d.speed * 0.9 + d.phase) * d.drift * 0.4
        );
        dummy.rotation.set(-Math.PI * 0.5, 0, d.yaw + drift * 0.04);
        dummy.scale.set(d.scale, d.scale, 1);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}

function chainCurve() {
  const top = chainRoute.top;
  const bottom = chainRoute.bottom;
  const points = [];
  const count = 32;
  for (let i = 0; i <= count; i++) {
    const u = i / count;
    const bow = Math.sin(u * Math.PI) * 5.5;
    const x = top[0] + (bottom[0] - top[0]) * u + bow;
    const z = top[1] + (bottom[1] - top[1]) * u - bow * 0.35;
    points.push(new THREE.Vector3(x, heightAt(x, z) + 1.3, z));
  }
  return new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.5);
}

export function createFinalLife({ peopleSpots = [], ribbonRacks = [] } = {}) {
  const group = new THREE.Group();
  group.name = 'huashan-final-life';
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  const rand = mulberry32(7717);
  const curve = chainCurve();

  const climbers = [
    { t: 0.18, speed: 0.021, phase: 0.7, color: 0x9b3b2f },
    { t: 0.44, speed: 0.017, phase: 2.4, color: 0x344b5a },
    { t: 0.68, speed: 0.023, phase: 4.1, color: 0xd0a24a },
  ];
  const peopleCount = peopleSpots.length + climbers.length;
  const people = new THREE.InstancedMesh(visitorGeometry(), mats.person, Math.max(1, peopleCount));
  people.name = 'final-platform-visitors-and-climbers';
  people.castShadow = true;
  people.receiveShadow = true;
  people.frustumCulled = false;
  const palette = [0x3e4b55, 0x5b4a3b, 0x6b3230, 0x47553f, 0x7a6a53, 0x39424a];
  const visitorData = peopleSpots.map((p, i) => ({
    ...p,
    radius: 0.35 + rand() * 0.75,
    speed: 0.05 + rand() * 0.09,
    phase: p.phase ?? i,
    scale: 0.9 + rand() * 0.14,
  }));
  for (let i = 0; i < visitorData.length; i++) {
    people.setColorAt(i, color.setHex(palette[i % palette.length]));
  }
  for (let i = 0; i < climbers.length; i++) {
    people.setColorAt(visitorData.length + i, color.setHex(climbers[i].color));
  }
  if (people.instanceColor) people.instanceColor.needsUpdate = true;

  const ribbons = makeRibbons(ribbonRacks);
  const mist = makeMist();
  group.add(people, ribbons.mesh, mist.mesh);

  const tmp = new THREE.Vector3();
  const tan = new THREE.Vector3();

  function updatePeople(time) {
    for (let i = 0; i < visitorData.length; i++) {
      const p = visitorData[i];
      const a = p.phase * 1.7 + time * p.speed;
      const bob = Math.abs(Math.sin(time * 2.3 + p.phase)) * 0.025;
      dummy.position.set(
        p.x + Math.cos(a) * p.radius,
        p.y + 0.06 + bob,
        p.z + Math.sin(a) * p.radius
      );
      dummy.rotation.set(0, p.yaw + Math.sin(a) * 0.35, 0);
      dummy.scale.setScalar(p.scale);
      dummy.updateMatrix();
      people.setMatrixAt(i, dummy.matrix);
    }
    for (let i = 0; i < climbers.length; i++) {
      const c = climbers[i];
      const t = 0.12 + ((c.t + time * c.speed) % 1) * 0.72;
      curve.getPointAt(t, tmp);
      curve.getTangentAt(t, tan);
      dummy.position.set(tmp.x, tmp.y + 0.08, tmp.z);
      const yaw = Math.atan2(tan.x, tan.z) + (Math.sin(time * 2.4 + c.phase) > 0 ? 0 : Math.PI);
      dummy.rotation.set(0, yaw, Math.sin(time * 2.4 + c.phase) * 0.06);
      dummy.scale.setScalar(0.92);
      dummy.updateMatrix();
      people.setMatrixAt(visitorData.length + i, dummy.matrix);
    }
    people.instanceMatrix.needsUpdate = true;
  }

  updatePeople(0);
  ribbons.update(0);
  mist.update(0);

  return {
    group,
    update(time) {
      updatePeople(time);
      ribbons.update(time);
      mist.update(time);
    },
    counts: {
      platformVisitors: visitorData.length,
      climbers: climbers.length,
      ribbons: ribbons.count,
      mist: mist.count,
    },
  };
}
