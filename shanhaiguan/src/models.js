import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

function paint(geo, hex, variance = 0.08) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const p = g.attributes.position;
  const colors = new Float32Array(p.count * 3);
  const base = new THREE.Color(hex);
  for (let i = 0; i < p.count; i++) {
    const k = 1 - variance * 0.5 + Math.random() * variance;
    colors[i * 3] = base.r * k;
    colors[i * 3 + 1] = base.g * k;
    colors[i * 3 + 2] = base.b * k;
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  if (g !== geo) geo.dispose();
  return g;
}

function finishParts(list) {
  return mergeGeometries(list, false);
}

export function buildCamelGeometry() {
  const parts = [];
  const coat = 0x9b7245;
  const dark = 0x6e4e2d;
  const cloth = 0x8f2f22;
  const pack = 0x6b5534;
  const body = new THREE.SphereGeometry(1, 8, 6);
  body.scale(1.05, 0.92, 1.55);
  body.translate(0, 2.05, 0);
  parts.push(paint(body, coat));
  for (const dz of [-0.42, 0.38]) {
    const hump = new THREE.SphereGeometry(0.58, 7, 5);
    hump.scale(1, 0.9, 0.8);
    hump.translate(0, 2.86, dz);
    parts.push(paint(hump, dark));
  }
  const neck = new THREE.CylinderGeometry(0.22, 0.36, 1.75, 6);
  neck.rotateX(-0.48);
  neck.translate(0, 2.65, 1.56);
  parts.push(paint(neck, coat));
  const head = new THREE.SphereGeometry(0.34, 6, 5);
  head.scale(0.85, 0.95, 1.25);
  head.translate(0, 3.38, 2.12);
  parts.push(paint(head, coat));
  const muzzle = new THREE.SphereGeometry(0.21, 6, 4);
  muzzle.scale(0.85, 0.8, 1.15);
  muzzle.translate(0, 3.24, 2.48);
  parts.push(paint(muzzle, dark));
  for (const sx of [-0.2, 0.2]) {
    const ear = new THREE.ConeGeometry(0.08, 0.24, 4);
    ear.translate(sx, 3.65, 2.06);
    parts.push(paint(ear, dark));
  }
  for (const sx of [-1, 1]) {
    for (const dz of [-0.72, 0.72]) {
      const leg = new THREE.CylinderGeometry(0.11, 0.16, 1.55, 5);
      leg.translate(sx * 0.58, 1.1, dz);
      parts.push(paint(leg, coat));
      const hoof = new THREE.CylinderGeometry(0.17, 0.19, 0.18, 6);
      hoof.translate(sx * 0.58, 0.18, dz);
      parts.push(paint(hoof, dark));
    }
  }
  const tail = new THREE.CylinderGeometry(0.06, 0.11, 0.85, 5);
  tail.rotateX(0.5);
  tail.translate(0, 2.05, -1.52);
  parts.push(paint(tail, dark));
  const blanket = new THREE.BoxGeometry(1.74, 0.12, 1.5);
  blanket.translate(0, 2.55, 0);
  parts.push(paint(blanket, cloth));
  for (const sx of [-1, 1]) {
    const bag = new THREE.BoxGeometry(0.34, 0.78, 0.85);
    bag.translate(sx * 1.08, 2.08, -0.12);
    parts.push(paint(bag, pack));
    const roll = new THREE.CylinderGeometry(0.17, 0.17, 1.1, 6);
    roll.rotateX(Math.PI / 2);
    roll.translate(sx * 1.06, 2.62, -0.12);
    parts.push(paint(roll, 0xb6482f));
  }
  return finishParts(parts);
}

export function buildHorseGeometry() {
  const parts = [];
  const coat = 0x6b3f28;
  const dark = 0x38251a;
  const body = new THREE.SphereGeometry(0.92, 8, 6);
  body.scale(0.78, 0.82, 1.45);
  body.translate(0, 1.55, 0);
  parts.push(paint(body, coat));
  const neck = new THREE.CylinderGeometry(0.2, 0.4, 1.15, 6);
  neck.rotateX(-0.45);
  neck.translate(0, 2.1, 1.02);
  parts.push(paint(neck, coat));
  const head = new THREE.SphereGeometry(0.3, 6, 5);
  head.scale(0.75, 0.85, 1.3);
  head.translate(0, 2.65, 1.52);
  parts.push(paint(head, coat));
  for (const sx of [-1, 1]) {
    for (const dz of [-0.58, 0.58]) {
      const leg = new THREE.CylinderGeometry(0.075, 0.11, 1.15, 5);
      leg.translate(sx * 0.42, 0.68, dz);
      parts.push(paint(leg, coat));
      const hoof = new THREE.CylinderGeometry(0.12, 0.13, 0.16, 5);
      hoof.translate(sx * 0.42, 0.1, dz);
      parts.push(paint(hoof, dark));
    }
  }
  const mane = new THREE.BoxGeometry(0.12, 0.5, 0.9);
  mane.translate(0, 2.35, 1.02);
  parts.push(paint(mane, dark));
  const saddle = new THREE.BoxGeometry(0.8, 0.16, 0.9);
  saddle.translate(0, 1.98, -0.05);
  parts.push(paint(saddle, 0x7b2e22));
  const tail = new THREE.CylinderGeometry(0.05, 0.14, 0.95, 5);
  tail.rotateX(0.55);
  tail.translate(0, 1.5, -1.32);
  parts.push(paint(tail, dark));
  return finishParts(parts);
}

export function buildPersonGeometry() {
  const parts = [];
  const body = new THREE.CylinderGeometry(0.18, 0.28, 1.05, 6);
  body.translate(0, 1.05, 0);
  parts.push(paint(body, 0xe8e0cd, 0.03));
  const legs = new THREE.CylinderGeometry(0.13, 0.16, 0.72, 5);
  legs.translate(0, 0.36, 0);
  parts.push(paint(legs, 0x4d4a43, 0.04));
  const head = new THREE.SphereGeometry(0.18, 6, 5);
  head.translate(0, 1.78, 0);
  parts.push(paint(head, 0xc79d78, 0.05));
  const hat = new THREE.CylinderGeometry(0.34, 0.36, 0.06, 8);
  hat.translate(0, 1.93, 0);
  parts.push(paint(hat, 0x2f2b24, 0.04));
  const top = new THREE.CylinderGeometry(0.15, 0.17, 0.18, 6);
  top.translate(0, 2.02, 0);
  parts.push(paint(top, 0x332f27, 0.04));
  for (const sx of [-1, 1]) {
    const arm = new THREE.CylinderGeometry(0.06, 0.075, 0.78, 5);
    arm.rotateZ(sx * 0.12);
    arm.translate(sx * 0.27, 1.16, 0);
    parts.push(paint(arm, 0xc9bda8, 0.05));
  }
  return finishParts(parts);
}

export function buildRavenGeometry() {
  const parts = [];
  const body = new THREE.SphereGeometry(0.32, 5, 4);
  body.scale(0.62, 0.55, 1.45);
  parts.push(paint(body, 0x151515, 0.03));
  const head = new THREE.SphereGeometry(0.16, 5, 4);
  head.translate(0, 0.08, 0.44);
  parts.push(paint(head, 0x101010, 0.03));
  const tail = new THREE.ConeGeometry(0.2, 0.5, 3);
  tail.rotateX(Math.PI / 2);
  tail.translate(0, 0, -0.62);
  parts.push(paint(tail, 0x101010, 0.03));
  for (const sx of [-1, 1]) {
    const wing = new THREE.BufferGeometry();
    wing.setAttribute('position', new THREE.Float32BufferAttribute([
      0, 0, 0.18,
      sx * 1.5, 0.12, 0.02,
      sx * 1.25, 0.02, -0.34,
    ], 3));
    wing.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1], 2));
    wing.computeVertexNormals();
    parts.push(paint(wing, 0x171717, 0.03));
  }
  return finishParts(parts);
}

export function makeRockGeometry() {
  const g = new THREE.DodecahedronGeometry(1, 0);
  g.scale(1, 0.62, 0.9);
  return g;
}

export function makeGrassGeometry() {
  const p = [];
  const uv = [];
  const add = (x1, z1, x2, z2) => {
    p.push(x1, 0, z1, x2, 0, z2, x1, 1, z1);
    p.push(x2, 0, z2, x2, 1, z2, x1, 1, z1);
    uv.push(0, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0, 1);
  };
  add(-0.22, 0, 0.22, 0);
  add(0, -0.22, 0, 0.22);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.computeVertexNormals();
  return geo;
}
