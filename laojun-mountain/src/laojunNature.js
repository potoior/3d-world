import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { sharedTextures } from './materials.js';
import { heightAt, slopeAt, fbm, trailSamples, trailDistanceSq, platforms } from './terrain.js';

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

function colors(geo, fn) {
  const p = geo.attributes.position;
  const arr = new Float32Array(p.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    c.copy(fn(p.getX(i), p.getY(i), p.getZ(i)));
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}

function prism(cx, cz, baseY, topY, rBottom, rTop, seed) {
  const h = Math.max(5, topY - baseY);
  const geo = new THREE.CylinderGeometry(rTop, rBottom, h, 7, 5, false);
  const p = geo.attributes.position;
  const rand = mulberry32(seed);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const a = Math.atan2(z, x);
    const k = (y + h * 0.5) / h;
    const wob = 0.76 + 0.32 * Math.sin(a * 3 + seed * 0.5) + 0.13 * Math.sin(a * 7 - k * 5);
    const notch = 1 - Math.max(0, Math.sin(a * 2.5 + seed)) * 0.16;
    p.setX(i, x * wob * notch + Math.sin(k * 6 + a * 2) * rBottom * 0.05);
    p.setZ(i, z * wob * notch + Math.cos(k * 7 - a * 3) * rBottom * 0.05);
    p.setY(i, y + Math.sin(a * 4 + seed) * h * 0.012 + (k > 0.86 ? Math.sin(a * 5 + seed) * h * 0.05 : 0));
  }
  geo.computeVertexNormals();
  const shadeA = new THREE.Color(0x9a9d9a);
  const shadeB = new THREE.Color(0xb8b5aa);
  const dark = new THREE.Color(0x626b69);
  const snow = new THREE.Color(0xd8e1e2);
  colors(geo, (x, y, z) => {
    const k = (y + h * 0.5) / h;
    const band = 0.5 + 0.5 * Math.sin(k * 22 + Math.sin(x * 0.1) * 2);
    const c = shadeA.clone().lerp(shadeB, band * 0.7);
    c.lerp(dark, Math.max(0, 0.38 - k) * 0.55);
    if (k > 0.9) c.lerp(snow, 0.28);
    return c;
  });
  geo.translate(cx, baseY + h * 0.5, cz);
  return geo;
}

function snowPine(detail = true) {
  const rand = mulberry32(731);
  const parts = [];
  const trunkCol = new THREE.Color(0x473a2e);
  const deep = new THREE.Color(0x29483a);
  const green = new THREE.Color(0x3d6046);
  const snow = new THREE.Color(0xe6edee);
  const trunk = new THREE.CylinderGeometry(0.1, 0.24, 2.4, 5, 1);
  trunk.translate(0, 1.2, 0);
  colors(trunk, () => trunkCol);
  parts.push(trunk);
  const layers = detail ? 5 : 3;
  for (let i = 0; i < layers; i++) {
    const yBase = 1.35 + i * (detail ? 0.82 : 1.05);
    const r = (detail ? 1.95 : 1.7) * (1 - i * (detail ? 0.145 : 0.2));
    const h = detail ? 1.35 : 1.5;
    const cone = new THREE.ConeGeometry(r, h, detail ? 7 : 6, detail ? 3 : 2, true);
    cone.rotateY(rand() * 6.28);
    cone.translate((rand() - 0.5) * 0.18, yBase + h * 0.5, (rand() - 0.5) * 0.18);
    colors(cone, (x, y, z) => {
      const n = (y - yBase) / h;
      const c = deep.clone().lerp(green, 0.35 + n * 0.4);
      const dust = Math.max(0, (n - 0.42) / 0.58);
      c.lerp(snow, Math.min(1, dust * 1.15));
      return c;
    });
    parts.push(cone);
  }
  if (detail) {
    const top = new THREE.ConeGeometry(0.55, 1.3, 6, 2, true);
    top.translate(0, 5.55, 0);
    colors(top, (x, y) => snow.clone().lerp(green, Math.max(0, (5.1 - y) * 0.35)));
    parts.push(top);
  }
  const geo = mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)), false);
  parts.forEach((g) => g.dispose());
  geo.computeVertexNormals();
  return geo;
}

function rockGeometry() {
  const rand = mulberry32(904);
  const geo = new THREE.DodecahedronGeometry(1, 0);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    p.setXYZ(i, p.getX(i) * (0.7 + rand() * 0.6), p.getY(i) * (0.5 + rand() * 0.55), p.getZ(i) * (0.72 + rand() * 0.55));
  }
  geo.computeVertexNormals();
  const grey = new THREE.Color(0x8f9694);
  const light = new THREE.Color(0xb9bcb5);
  const snow = new THREE.Color(0xe0e8e9);
  colors(geo, (x, y) => grey.clone().lerp(light, rand() * 0.5).lerp(snow, Math.max(0, y - 0.18) * 0.72));
  return geo;
}

function clearOf(x, z, margin = 3.2) {
  if (Math.sqrt(trailDistanceSq(x, z)) < margin) return false;
  for (const p of platforms) {
    if (Math.hypot(x - p.x, z - p.z) < p.r + 2.5) return false;
  }
  const extra = [[-26, -132], [42, -336], [-27, -76], [17, -186], [53, 222], [184, -236]];
  for (const e of extra) {
    if (Math.hypot(x - e[0], z - e[1]) < 16) return false;
  }
  return true;
}

export function createLaojunNature() {
  const root = new THREE.Group();
  root.name = 'laojun-nature';
  const rand = mulberry32(20261021);
  const graniteMap = sharedTextures.graniteMap;
  const mats = {
    granite: new THREE.MeshStandardMaterial({ map: graniteMap, color: 0xaeb0ab, roughness: 1, flatShading: true, vertexColors: true }),
    graniteLight: new THREE.MeshStandardMaterial({ map: graniteMap, color: 0xd2cfc4, roughness: 1, flatShading: true, vertexColors: true }),
    graniteDark: new THREE.MeshStandardMaterial({ map: graniteMap, color: 0x747c79, roughness: 1, flatShading: true, vertexColors: true }),
    pine: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.94 }),
    rock: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }),
  };
  const buckets = { a: [], b: [], c: [], dark: [], snow: [] };

  const wall = [
    [164, 206], [186, 78], [202, -72], [216, -228], [232, -382], [246, -528], [256, -620],
  ];
  for (let i = 0; i < 42; i++) {
    const t = i / 41;
    const seg = Math.min(wall.length - 2, Math.floor(t * (wall.length - 1)));
    const local = t * (wall.length - 1) - seg;
    const x = wall[seg][0] + (wall[seg + 1][0] - wall[seg][0]) * local + (rand() - 0.5) * 22;
    const z = wall[seg][1] + (wall[seg + 1][1] - wall[seg][1]) * local + (rand() - 0.5) * 26;
    const base = heightAt(x, z) - 20 - rand() * 18;
    const top = 168 + rand() * 58;
    const rb = 9 + rand() * 13;
    const rt = 2.5 + rand() * 5;
    const g = prism(x, z, base, top, rb, rt, 1000 + i);
    const bucket = i % 3 === 0 ? buckets.b : buckets.a;
    bucket.push(g);
    for (let k = 0; k < 3; k++) {
      const a = (rand() - 0.5) * 2.4;
      const side = x + Math.cos(a) * rb * 0.9;
      const sideZ = z + Math.sin(a) * rb * 0.9;
      const ledge = new THREE.BoxGeometry(7 + rand() * 10, 0.45 + rand() * 0.5, 2.2 + rand() * 2.5);
      ledge.rotateY(a);
      ledge.translate(side, base + (top - base) * (0.25 + rand() * 0.55), sideZ);
      buckets.c.push(ledge);
      if (k === 0) {
        const crack = new THREE.BoxGeometry(0.18, 8 + rand() * 18, 0.22);
        crack.rotateY(a);
        crack.translate(side, base + (top - base) * 0.62, sideZ);
        buckets.dark.push(crack);
      }
    }
  }

  for (let i = 0; i < 86; i++) {
    const z = -520 + rand() * 760;
    const side = rand() < 0.62 ? 1 : -1;
    const x = (side > 0 ? 26 : -26) + (rand() - 0.5) * 48;
    const base = heightAt(x, z) - 12;
    if (base < 80) continue;
    const h = 26 + rand() * 62;
    const g = prism(x + (rand() - 0.5) * 10, z + (rand() - 0.5) * 22, base, base + h, 3.5 + rand() * 4.5, 1.2 + rand() * 1.7, 3000 + i);
    (i % 2 ? buckets.b : buckets.a).push(g);
  }

  for (let i = 0; i < 46; i++) {
    const a = rand() * Math.PI * 2;
    const d = 260 + rand() * 300;
    const x = Math.cos(a) * d;
    const z = Math.sin(a) * d - 120;
    const size = 3 + rand() * 8;
    const g = new THREE.DodecahedronGeometry(size, 0);
    const p = g.attributes.position;
    for (let v = 0; v < p.count; v++) {
      p.setXYZ(v, p.getX(v) * (0.8 + rand() * 0.42), p.getY(v) * (0.7 + rand() * 0.4), p.getZ(v) * (0.8 + rand() * 0.42));
    }
    g.computeVertexNormals();
    g.rotateY(rand() * 6.2);
    g.translate(x, heightAt(x, z) + size * 0.2, z);
    buckets.snow.push(g);
  }

  function flush(list, mat, name, cast = true) {
    if (!list.length) return;
    const geo = mergeGeometries(list.map((g) => (g.index ? g.toNonIndexed() : g)), false);
    list.forEach((g) => g.dispose());
    if (!geo) return;
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = cast;
    m.receiveShadow = true;
    m.name = name;
    root.add(m);
  }
  flush(buckets.a, mats.granite, 'shili-cliff-a');
  flush(buckets.b, mats.graniteLight, 'shili-cliff-b');
  flush(buckets.c, mats.graniteLight, 'cliff-strata');
  flush(buckets.dark, mats.graniteDark, 'cliff-fissures');
  flush(buckets.snow, mats.graniteLight, 'high-boulders');

  const pineSites = [];
  for (let attempt = 0; attempt < 9000; attempt++) {
    const x = (rand() - 0.5) * 1500;
    const z = (rand() - 0.5) * 1500;
    if (Math.abs(x) > 760 || Math.abs(z) > 760) continue;
    const y = heightAt(x, z);
    if (y < 26 || y > 246) continue;
    if (slopeAt(x, z) > 2.3) continue;
    if (!clearOf(x, z, 4.4)) continue;
    const density = fbm(x * 0.013 + 4.2, z * 0.013 - 1.7, 3);
    if (density < 0.4 && rand() > 0.42) continue;
    const ridge = Math.abs(x) < 180 && z > -520 && z < 280;
    pineSites.push({ x, y, z, s: 0.62 + rand() * 0.62, detail: ridge && rand() < 0.62, phase: rand() * 6.28 });
  }
  for (let i = 0; i < 130; i++) {
    const t = rand();
    const seg = Math.min(wall.length - 2, Math.floor(t * (wall.length - 1)));
    const local = t * (wall.length - 1) - seg;
    const x = wall[seg][0] + (wall[seg + 1][0] - wall[seg][0]) * local + 13 + rand() * 22;
    const z = wall[seg][1] + (wall[seg + 1][1] - wall[seg][1]) * local + (rand() - 0.5) * 30;
    const y = heightAt(x, z);
    if (y < 90) continue;
    pineSites.push({ x, y, z, s: 0.6 + rand() * 0.55, detail: rand() < 0.4, phase: rand() * 6.28 });
  }

  const detailed = pineSites.filter((p) => p.detail);
  const simple = pineSites.filter((p) => !p.detail);
  const dummy = new THREE.Object3D();
  const addInstanced = (list, geometry, name, mat) => {
    if (!list.length) return null;
    const mesh = new THREE.InstancedMesh(geometry, mat, list.length);
    mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    list.forEach((p, i) => {
      dummy.position.set(p.x, p.y - 0.25, p.z);
      dummy.rotation.set(0, p.phase, 0);
      dummy.scale.set(p.s, p.s * (0.9 + (p.phase % 0.3)), p.s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    root.add(mesh);
    return mesh;
  };
  addInstanced(detailed, snowPine(true), 'snow-pines-detail', mats.pine);
  addInstanced(simple, snowPine(false), 'snow-pines-far', mats.pine);

  const rockSites = [];
  for (let i = 0; i < 620; i++) {
    const x = (rand() - 0.5) * 1300;
    const z = (rand() - 0.5) * 1300;
    const y = heightAt(x, z);
    if (y < 18 || y > 242) continue;
    if (slopeAt(x, z) > 2.5 && rand() < 0.65) continue;
    if (!clearOf(x, z, 2.4)) continue;
    rockSites.push({ x, y, z, s: 0.55 + rand() * 2.4, phase: rand() * 6.28 });
  }
  const rocks = new THREE.InstancedMesh(rockGeometry(), mats.rock, rockSites.length);
  rocks.name = 'instanced-boulders';
  rocks.castShadow = true;
  rocks.receiveShadow = true;
  rockSites.forEach((p, i) => {
    dummy.position.set(p.x, p.y + p.s * 0.2, p.z);
    dummy.rotation.set(0, p.phase, (p.phase % 0.3) - 0.15);
    dummy.scale.set(p.s, p.s * (0.7 + (p.phase % 0.4)), p.s);
    dummy.updateMatrix();
    rocks.setMatrixAt(i, dummy.matrix);
  });
  rocks.instanceMatrix.needsUpdate = true;
  root.add(rocks);

  return {
    group: root,
    counts: { pines: pineSites.length, rocks: rockSites.length, cliffPanels: 42 },
  };
}
