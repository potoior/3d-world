import * as THREE from 'three';
import { mergedMesh } from './geometry.js';
import { PEAKS, heightAt, inPool, rand, smoothstep, streamDistance } from './siguniang-util.js';

export function buildTerrain(mats) {
  const geo = new THREE.PlaneGeometry(3400, 3000, 320, 280);
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, 0, 300);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setY(i, heightAt(pos.getX(i), pos.getZ(i)));
  }
  geo.computeVertexNormals();
  const normal = geo.attributes.normal;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  const snow = new THREE.Color(0xf4f9f8);
  const snowBlue = new THREE.Color(0xc5dbe8);
  const snowWarm = new THREE.Color(0xffe8cc);
  const rock = new THREE.Color(0x6a635a);
  const rockWarm = new THREE.Color(0x8a775f);
  const rockDark = new THREE.Color(0x3f3c37);
  const forest = new THREE.Color(0x314b37);
  const forestDark = new THREE.Color(0x22382b);
  const forestWarm = new THREE.Color(0x55673c);
  const meadow = new THREE.Color(0x82974b);
  const meadowWarm = new THREE.Color(0xa89c4f);
  const meadowDry = new THREE.Color(0x9c9852);
  const gravel = new THREE.Color(0xa6ac9b);
  const turquoise = new THREE.Color(0x74bdb0);

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const h = pos.getY(i);
    const up = normal.getY(i);
    const patch = 0.5 + 0.5 * Math.sin(x * 0.054 + z * 0.043);
    const strata = 0.5 + 0.5 * Math.sin(h * 0.13 + x * 0.012 + z * 0.009);
    const snowLine = 302 + 34 * Math.sin(x * 0.0054 + 0.9) + 21 * Math.sin(z * 0.0072 - 0.4) + 15 * Math.sin(x * 0.022 + z * 0.014);
    const jag = 22 * Math.sin(x * 0.031 + z * 0.021) + 10 * Math.sin(x * 0.088 - z * 0.047);
    const sd = streamDistance(x, z);
    const nearWater = sd < 20 || inPool(x, z, 1.18);

    if (h > snowLine + jag) {
      c.copy(snow).lerp(snowBlue, patch * 0.45).lerp(snowWarm, smoothstep(520, 900, h) * 0.3);
      if (up < 0.44) c.lerp(rockDark, smoothstep(0.44, 0.2, up) * 0.78);
      if (patch > 0.76 && h < snowLine + 95) c.lerp(snowBlue, 0.42);
    } else if (h > snowLine - 58 + jag * 0.7) {
      c.copy(rockWarm).lerp(rockDark, strata * 0.55).lerp(snow, patch * 0.46);
      if (up > 0.63) c.lerp(snow, 0.32);
      if (up < 0.34) c.lerp(rockDark, 0.45);
    } else if (h > 148) {
      c.copy(rock).lerp(rockWarm, strata * 0.5).lerp(rockDark, patch * 0.32);
      if (up < 0.38) c.lerp(rockDark, 0.5);
      if (h < 225 && up > 0.46 && patch > 0.5) c.lerp(forestDark, 0.34);
      if (h > 120 && up > 0.55 && patch > 0.72) c.lerp(meadowDry, 0.2);
    } else if (h > 25) {
      c.copy(forest).lerp(forestDark, patch * 0.58).lerp(forestWarm, strata * 0.22);
      if (up < 0.42) c.lerp(rock, 0.46);
      if (up > 0.7 && patch > 0.66) c.lerp(meadowWarm, 0.25);
    } else {
      c.copy(meadow).lerp(meadowWarm, patch * 0.33).lerp(meadowDry, strata * 0.14);
      if (patch > 0.72) c.lerp(forest, 0.16);
      if (up < 0.58) c.lerp(rock, 0.28);
    }

    if (nearWater && h < 40) c.lerp(gravel, 0.42).lerp(turquoise, 0.1);
    if (sd < 6.5 && h < 34) c.lerp(gravel, 0.38);

    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mesh = new THREE.Mesh(geo, mats.terrain);
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  mesh.name = 'siguniang-terrain';
  return mesh;
}

export function createRidgeBlades(staticRoot, mats) {
  const rocks = [];
  const snows = [];
  for (const p of PEAKS) {
    const count = p.name === '幺妹峰' ? 7 : 5;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + p.phase * 0.3;
      const rad = 0.09 + rand(211 + i, p.x) * 0.15;
      const x = p.x + Math.cos(a) * p.rx * rad;
      const z = p.z + Math.sin(a) * p.rz * rad;
      const ground = heightAt(x, z);
      const hh = p.h * (0.16 + rand(223 + i, p.z) * 0.15);
      const w = p.rx * (0.07 + rand(227 + i, p.x) * 0.06);
      const d = p.rz * (0.07 + rand(229 + i, p.z) * 0.06);
      const rock = new THREE.ConeGeometry(1, 1, 4, 1);
      rock.rotateY(a + 0.4);
      rock.scale(w, hh, d);
      rock.translate(x, ground + hh * 0.5 - 24, z);
      rocks.push(rock);
      const cap = new THREE.ConeGeometry(1, 1, 4, 1);
      cap.rotateY(a + 0.4);
      cap.scale(w * 0.56, hh * 0.42, d * 0.58);
      cap.translate(x, ground + hh * 0.77 - 18, z);
      snows.push(cap);
    }
  }
  const rockMesh = mergedMesh(rocks, mats.cliff, true, true);
  if (rockMesh) staticRoot.add(rockMesh);
  const snowMesh = mergedMesh(snows, mats.snow, true, true);
  if (snowMesh) staticRoot.add(snowMesh);
}
