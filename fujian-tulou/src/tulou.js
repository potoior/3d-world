import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mergeStaticGroup } from './geometry.js';
import { makeWaterMaterial } from './materials.js';
import {
  TIANLUOKENG,
  CHENGQI,
  ZHENCHENG,
  STREAM_SAMPLES,
  STREAM_WIDTH,
  BRIDGES,
  COLLIDERS,
} from './layout.js';

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

function canvas2d(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

function finishTexture(canvas, repeatX = 1, repeatY = 1) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeatX, repeatY);
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

function makeEarthTexture() {
  const [c, ctx] = canvas2d(512, 512);
  const rand = mulberry32(207);
  ctx.fillStyle = '#b98f5e';
  ctx.fillRect(0, 0, 512, 512);
  const layerH = 18;
  for (let y = 0; y < 512; y += layerH) {
    const v = 0.82 + rand() * 0.24;
    ctx.fillStyle = `rgba(${Math.round(178 * v)},${Math.round(132 * v)},${Math.round(84 * v)},0.55)`;
    ctx.fillRect(0, y, 512, layerH);
    ctx.fillStyle = 'rgba(92,62,37,0.18)';
    ctx.fillRect(0, y + layerH - 1, 512, 1.2);
    if (rand() > 0.58) {
      ctx.fillStyle = 'rgba(229,194,142,0.18)';
      ctx.fillRect(0, y + 2, 512, 1.2);
    }
  }
  for (let i = 0; i < 2600; i++) {
    const g = 110 + rand() * 110;
    ctx.fillStyle = `rgba(${g + 30},${g},${g - 30},${0.05 + rand() * 0.12})`;
    ctx.beginPath();
    ctx.arc(rand() * 512, rand() * 512, 0.3 + rand() * 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 26; i++) {
    const x = rand() * 512;
    ctx.strokeStyle = `rgba(91,62,37,${0.08 + rand() * 0.1})`;
    ctx.lineWidth = 0.6 + rand() * 1.2;
    ctx.beginPath();
    ctx.moveTo(x, rand() * 80);
    ctx.bezierCurveTo(x + rand() * 14 - 7, 190, x + rand() * 18 - 9, 350, x + rand() * 12 - 6, 512);
    ctx.stroke();
  }
  const shade = ctx.createLinearGradient(0, 0, 0, 512);
  shade.addColorStop(0, 'rgba(255,236,201,0.16)');
  shade.addColorStop(0.55, 'rgba(0,0,0,0)');
  shade.addColorStop(1, 'rgba(55,35,20,0.14)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, 512, 512);
  return finishTexture(c, 7, 3);
}

function makeRoofTexture() {
  const [c, ctx] = canvas2d(256, 256);
  const rand = mulberry32(311);
  ctx.fillStyle = '#555c5c';
  ctx.fillRect(0, 0, 256, 256);
  for (let x = 0; x < 256; x += 32) {
    const g = ctx.createLinearGradient(x, 0, x + 32, 0);
    g.addColorStop(0, 'rgba(25,30,31,0.55)');
    g.addColorStop(0.2, 'rgba(165,174,171,0.32)');
    g.addColorStop(0.52, 'rgba(198,204,199,0.2)');
    g.addColorStop(0.84, 'rgba(120,130,128,0.1)');
    g.addColorStop(1, 'rgba(18,23,24,0.6)');
    ctx.fillStyle = g;
    ctx.fillRect(x, 0, 32, 256);
    ctx.strokeStyle = 'rgba(18,23,24,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, 256);
    ctx.stroke();
  }
  for (let y = 0; y < 256; y += 22) {
    ctx.strokeStyle = 'rgba(21,26,27,0.52)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(256, y + 0.5);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(210,217,213,0.16)';
    ctx.beginPath();
    ctx.moveTo(0, y + 2.5);
    ctx.lineTo(256, y + 2.5);
    ctx.stroke();
  }
  for (let i = 0; i < 500; i++) {
    ctx.fillStyle = `rgba(${40 + rand() * 100},${45 + rand() * 100},${44 + rand() * 96},0.15)`;
    ctx.fillRect(rand() * 256, rand() * 256, 1 + rand() * 5, 1);
  }
  return finishTexture(c, 3, 2);
}

function makePaddyTexture() {
  const [c, ctx] = canvas2d(512, 512);
  const rand = mulberry32(509);
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, '#7f9d4f');
  g.addColorStop(0.5, '#6e9144');
  g.addColorStop(1, '#5d803b');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 512);
  for (let y = 6; y < 512; y += 15) {
    ctx.strokeStyle = 'rgba(43,70,30,0.34)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
    for (let x = 0; x < 512; x += 7) {
      const h = 5 + rand() * 8;
      ctx.strokeStyle = `rgba(${106 + rand() * 44},${144 + rand() * 46},${58 + rand() * 30},0.72)`;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(x + rand() * 3, y);
      ctx.lineTo(x + rand() * 5 - 2.5, y - h);
      ctx.stroke();
    }
  }
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = rand() > 0.5 ? 'rgba(190,190,86,0.2)' : 'rgba(40,74,32,0.16)';
    ctx.beginPath();
    ctx.arc(rand() * 512, rand() * 512, 0.5 + rand() * 2, 0, Math.PI * 2);
    ctx.fill();
  }
  return finishTexture(c, 2.2, 2.2);
}

function makeGroundTexture() {
  const [c, ctx] = canvas2d(512, 512);
  const rand = mulberry32(613);
  ctx.fillStyle = '#87976a';
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 1700; i++) {
    ctx.fillStyle = rand() > 0.5 ? 'rgba(112,136,82,0.25)' : 'rgba(58,80,48,0.2)';
    ctx.beginPath();
    ctx.arc(rand() * 512, rand() * 512, 1 + rand() * 7, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 700; i++) {
    ctx.fillStyle = 'rgba(172,158,112,0.18)';
    ctx.fillRect(rand() * 512, rand() * 512, 1 + rand() * 3, 1 + rand() * 2);
  }
  return finishTexture(c, 22, 22);
}

function makeSmokeTexture() {
  const [c, ctx] = canvas2d(128, 128);
  const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  g.addColorStop(0, 'rgba(244,242,234,0.72)');
  g.addColorStop(0.35, 'rgba(232,230,221,0.36)');
  g.addColorStop(0.72, 'rgba(220,219,210,0.12)');
  g.addColorStop(1, 'rgba(220,219,210,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function makeFlagTexture() {
  const [c, ctx] = canvas2d(256, 160);
  ctx.fillStyle = '#a83228';
  ctx.fillRect(0, 0, 256, 160);
  ctx.strokeStyle = '#e4c26d';
  ctx.lineWidth = 10;
  ctx.strokeRect(8, 8, 240, 144);
  ctx.fillStyle = '#e4c26d';
  const cx = 72;
  const cy = 80;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 34 : 14;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(244,230,194,0.88)';
  ctx.font = '30px serif';
  ctx.fillText('客 家', 124, 92);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function makePlaqueTexture(text) {
  const [c, ctx] = canvas2d(512, 168);
  const g = ctx.createLinearGradient(0, 0, 0, 168);
  g.addColorStop(0, '#3a2418');
  g.addColorStop(0.5, '#24150e');
  g.addColorStop(1, '#3c271a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 168);
  ctx.strokeStyle = '#b48643';
  ctx.lineWidth = 7;
  ctx.strokeRect(12, 12, 488, 144);
  ctx.strokeStyle = 'rgba(221,182,105,0.55)';
  ctx.lineWidth = 2;
  ctx.strokeRect(25, 25, 462, 118);
  ctx.fillStyle = '#e4c683';
  ctx.font = 'bold 76px "Noto Serif CJK SC", "Songti SC", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 88);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

const earthTexture = makeEarthTexture();
const roofTexture = makeRoofTexture();
const paddyTexture = makePaddyTexture();
const groundTexture = makeGroundTexture();
const smokeTexture = makeSmokeTexture();
const flagTexture = makeFlagTexture();

const earthMat = new THREE.MeshStandardMaterial({
  map: earthTexture,
  color: 0xd2b184,
  roughness: 0.98,
  metalness: 0,
});
const earthInnerMat = earthMat.clone();
earthInnerMat.side = THREE.BackSide;
earthInnerMat.color = new THREE.Color(0xc5a171);
const earthBandMat = new THREE.MeshStandardMaterial({ color: 0x987048, roughness: 1 });
const roofMat = new THREE.MeshStandardMaterial({
  map: roofTexture,
  color: 0xa8aca6,
  roughness: 0.86,
  metalness: 0.03,
  side: THREE.DoubleSide,
});
const roofRidgeMat = new THREE.MeshStandardMaterial({ color: 0x444a49, roughness: 0.8 });
const woodMat = new THREE.MeshStandardMaterial({ color: 0x704731, roughness: 0.9 });
const woodDarkMat = new THREE.MeshStandardMaterial({ color: 0x3e271b, roughness: 0.88 });
const stoneMat = new THREE.MeshStandardMaterial({ color: 0x9c998c, roughness: 0.95 });
const stoneDarkMat = new THREE.MeshStandardMaterial({ color: 0x706c60, roughness: 0.98 });
const darkMat = new THREE.MeshStandardMaterial({ color: 0x17130f, roughness: 0.82 });
const limeMat = new THREE.MeshStandardMaterial({ color: 0xd8d2c0, roughness: 0.96 });
const paddyMat = new THREE.MeshStandardMaterial({ map: paddyTexture, roughness: 1 });
const grassMat = new THREE.MeshStandardMaterial({ map: groundTexture, color: 0xa4b286, roughness: 1 });
const teaMat = new THREE.MeshStandardMaterial({ color: 0x476f39, roughness: 1 });
const teaDarkMat = new THREE.MeshStandardMaterial({ color: 0x31562b, roughness: 1 });
const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5d402a, roughness: 1 });
const leafMat = new THREE.MeshStandardMaterial({ color: 0x4f7438, roughness: 1 });
const leafFarMat = new THREE.MeshStandardMaterial({ color: 0x577c4d, roughness: 1 });
const hillMat = new THREE.MeshStandardMaterial({ color: 0x6f8760, roughness: 1 });
const hillFarMat = new THREE.MeshStandardMaterial({ color: 0x788b70, roughness: 1 });
const lanternMat = new THREE.MeshStandardMaterial({
  color: 0x9c241b,
  emissive: 0x6f120c,
  emissiveIntensity: 0.45,
  roughness: 0.62,
});
const glowMaterial = new THREE.MeshBasicMaterial({
  color: 0xffb066,
  transparent: true,
  opacity: 0.03,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});
const waterBedMat = new THREE.MeshStandardMaterial({ color: 0x4d5847, roughness: 1 });
const flagMat = new THREE.MeshStandardMaterial({
  map: flagTexture,
  side: THREE.DoubleSide,
  roughness: 0.82,
});
const villagerMat = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.9,
  metalness: 0,
});

function addMesh(parent, geo, material) {
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addBox(parent, material, w, h, d, x, y, z, ry = 0) {
  const geo = new THREE.BoxGeometry(w, h, d);
  if (ry) geo.rotateY(ry);
  geo.translate(x, y, z);
  return addMesh(parent, geo, material);
}

function addCylinder(parent, material, rt, rb, h, seg, x, y, z) {
  const geo = new THREE.CylinderGeometry(rt, rb, h, seg);
  geo.translate(x, y, z);
  return addMesh(parent, geo, material);
}

function addTorus(parent, material, radius, tube, x, y, z) {
  const geo = new THREE.TorusGeometry(radius, tube, 5, 84);
  geo.rotateX(Math.PI / 2);
  geo.translate(x, y, z);
  return addMesh(parent, geo, material);
}

function addQuad(parent, material, a, b, c, d, uMax = 1, vMax = 1) {
  const va = new THREE.Vector3(...a);
  const vb = new THREE.Vector3(...b);
  const vc = new THREE.Vector3(...c);
  const vd = new THREE.Vector3(...d);
  const normal = new THREE.Vector3().subVectors(vb, va).cross(new THREE.Vector3().subVectors(vc, va));
  if (normal.y < 0) {
    const tmp = vb.clone();
    vb.copy(vd);
    vd.copy(tmp);
  }
  const positions = [
    va.x, va.y, va.z, vb.x, vb.y, vb.z, vc.x, vc.y, vc.z,
    va.x, va.y, va.z, vc.x, vc.y, vc.z, vd.x, vd.y, vd.z,
  ];
  const uvs = [0, 0, uMax, 0, uMax, vMax, 0, 0, uMax, vMax, 0, vMax];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.computeVertexNormals();
  return addMesh(parent, geo, material);
}

function addOrientedBox(parent, material, sx, sy, sz, x, y, z, dx, dz) {
  const geo = new THREE.BoxGeometry(sx, sy, sz);
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.position.set(x, y, z);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), new THREE.Vector3(dx, 0, dz).normalize());
  parent.add(mesh);
  return mesh;
}

function addBoxCollider(x, z, w, d, name) {
  COLLIDERS.boxes.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
  COLLIDERS.names.push(name);
}

function addCircleCollider(x, z, r, name) {
  COLLIDERS.circles.push({ x, z, r });
  COLLIDERS.names.push(name);
}

function addPlaza(parent, x, z, radius, material = stoneMat) {
  const geo = new THREE.CircleGeometry(radius, 44);
  geo.rotateX(-Math.PI / 2);
  geo.translate(x, 0.075, z);
  return addMesh(parent, geo, material);
}

function addRoundRoof(parent, innerR, outerR, yIn, yOut, segments = 76) {
  const group = new THREE.Group();
  const cos = Math.cos;
  const sin = Math.sin;
  for (let i = 0; i < segments; i++) {
    const a0 = (i / segments) * Math.PI * 2;
    const a1 = ((i + 1) / segments) * Math.PI * 2;
    addQuad(
      group,
      roofMat,
      [cos(a0) * innerR, yIn, sin(a0) * innerR],
      [cos(a1) * innerR, yIn, sin(a1) * innerR],
      [cos(a1) * outerR, yOut, sin(a1) * outerR],
      [cos(a0) * outerR, yOut, sin(a0) * outerR],
      0.9,
      1
    );
    addQuad(
      group,
      roofRidgeMat,
      [cos(a0) * outerR, yOut + 0.02, sin(a0) * outerR],
      [cos(a1) * outerR, yOut + 0.02, sin(a1) * outerR],
      [cos(a1) * outerR, yOut - 0.28, sin(a1) * outerR],
      [cos(a0) * outerR, yOut - 0.28, sin(a0) * outerR],
      1,
      1
    );
  }
  parent.add(group);
  return group;
}

function addRoundRoofRidges(parent, innerR, outerR, yIn, yOut, count) {
  const start = new THREE.Vector3();
  const end = new THREE.Vector3();
  const dir = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + 0.035;
    start.set(Math.cos(a) * innerR, yIn + 0.05, Math.sin(a) * innerR);
    end.set(Math.cos(a) * outerR, yOut + 0.02, Math.sin(a) * outerR);
    dir.subVectors(end, start);
    const geo = new THREE.BoxGeometry(0.12, 0.13, dir.length());
    const mesh = new THREE.Mesh(geo, roofRidgeMat);
    mesh.position.copy(start).add(end).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir.normalize());
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
  }
}

function addGate(parent, x, z, rotY, text) {
  const gate = new THREE.Group();
  gate.position.set(x, 0, z);
  gate.rotation.y = rotY;
  addBox(gate, stoneMat, 5.2, 0.32, 2.2, 0, 0.16, 0.6);
  addBox(gate, stoneDarkMat, 0.72, 4.8, 0.9, -1.85, 2.4, 0);
  addBox(gate, stoneDarkMat, 0.72, 4.8, 0.9, 1.85, 2.4, 0);
  addBox(gate, stoneMat, 4.4, 0.72, 1.0, 0, 4.62, 0);
  addBox(gate, woodDarkMat, 2.8, 3.7, 0.24, 0, 2.12, -0.04);
  addBox(gate, woodMat, 0.12, 3.5, 0.2, -1.35, 2.05, 0.12);
  addBox(gate, woodMat, 0.12, 3.5, 0.2, 1.35, 2.05, 0.12);
  addBox(gate, woodMat, 2.9, 0.12, 0.22, 0, 3.1, 0.12);
  const plaque = new THREE.Mesh(
    new THREE.PlaneGeometry(2.5, 0.82),
    new THREE.MeshBasicMaterial({ map: makePlaqueTexture(text), toneMapped: false, side: THREE.DoubleSide })
  );
  plaque.position.set(0, 5.22, 0.57);
  gate.add(plaque);
  for (const sx of [-1, 1]) {
    const lantern = addMesh(gate, new THREE.SphereGeometry(0.28, 10, 8), lanternMat);
    lantern.scale.set(1, 1.22, 1);
    lantern.position.set(sx * 1.45, 3.74, 0.72);
    const glow = addMesh(gate, new THREE.SphereGeometry(0.62, 10, 8), glowMaterial);
    glow.position.copy(lantern.position);
    glow.castShadow = false;
    glow.receiveShadow = false;
  }
  addBox(gate, stoneDarkMat, 4.6, 0.5, 1.4, 0, 0.25, 1.15);
  parent.add(gate);
  return gate;
}

function addCentralHall(parent, size, height, name, cx = 0, cz = 0) {
  const hall = new THREE.Group();
  hall.position.set(cx, 0, cz);
  parent.add(hall);
  parent = hall;
  const half = size * 0.5;
  addBox(parent, stoneMat, size + 2.2, 0.7, size + 2.2, 0, 0.35, 0);
  addBox(parent, stoneMat, size + 1.6, 0.3, size + 1.6, 0, 0.84, 0);
  addBox(parent, limeMat, size, height * 0.58, size, 0, 0.95 + height * 0.29, 0);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addCylinder(parent, woodDarkMat, 0.17, 0.2, height * 0.62, 8, sx * half * 0.82, 1.0 + height * 0.31, sz * half * 0.82);
    }
  }
  for (const sz of [-1, 1]) {
    addBox(parent, woodDarkMat, size * 0.76, height * 0.42, 0.14, 0, 1.65, sz * (half + 0.08));
    for (let i = -2; i <= 2; i++) {
      addBox(parent, woodMat, 0.09, height * 0.38, 0.17, i * size * 0.15, 1.62, sz * (half + 0.16));
    }
  }
  addBox(parent, woodDarkMat, size * 0.96, 0.34, size * 0.96, 0, 1.0 + height * 0.58, 0);
  const roofY = 1.0 + height * 0.58;
  const roofH = Math.max(2.2, height * 0.42);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(half * 1.32, roofH, 4), roofMat);
  roof.rotation.y = Math.PI / 4;
  roof.position.y = roofY + roofH * 0.5;
  roof.castShadow = true;
  roof.receiveShadow = true;
  parent.add(roof);
  addBox(parent, roofRidgeMat, size * 1.5, 0.12, size * 1.5, 0, roofY + 0.06, 0);
  const plaque = new THREE.Mesh(
    new THREE.PlaneGeometry(2.8, 0.9),
    new THREE.MeshBasicMaterial({ map: makePlaqueTexture(name), toneMapped: false, side: THREE.DoubleSide })
  );
  plaque.position.set(0, 2.65, half + 0.18);
  parent.add(plaque);
  addCylinder(parent, stoneDarkMat, 0.8, 0.9, 0.75, 16, -half * 0.52, 0.38, -half * 0.42);
  const well = addMesh(parent, new THREE.CircleGeometry(0.62, 16), darkMat);
  well.rotation.x = -Math.PI / 2;
  well.position.set(-half * 0.52, 0.78, -half * 0.42);
}

function addRoundTulou(parent, opts) {
  const {
    cx, cz, radius, wallH, floors = 3, wallT = 1.8, gateAngle = Math.PI / 2,
    name, courtyard = true, central = false, floorY = 0.13, roofSegments = 76,
  } = opts;
  const g = new THREE.Group();
  g.position.set(cx, 0, cz);
  const floorH = (wallH - 1.25) / floors;
  const innerR = radius - wallT;

  addCylinder(g, stoneDarkMat, radius + 1.55, radius + 1.95, 0.72, 76, 0, 0.18, 0);
  addCylinder(g, stoneMat, radius + 0.72, radius + 1.42, 0.62, 76, 0, 0.78, 0);

  const outer = addMesh(g, new THREE.CylinderGeometry(radius, radius * 1.012, wallH - 0.75, 76, 1, true), earthMat);
  outer.position.y = 0.75 + (wallH - 0.75) * 0.5;
  const inner = addMesh(g, new THREE.CylinderGeometry(innerR, innerR, wallH - 0.75, 76, 1, true), earthInnerMat);
  inner.position.y = 0.75 + (wallH - 0.75) * 0.5;
  const topRing = addMesh(g, new THREE.RingGeometry(innerR, radius, 76, 1), earthMat);
  topRing.rotation.x = -Math.PI / 2;
  topRing.position.y = wallH;

  for (let i = 1; i <= 3; i++) {
    addTorus(g, earthBandMat, radius + 0.02, 0.075, 0, 1.2 + i * ((wallH - 2.2) / 4), 0);
  }

  const winCount = Math.max(16, Math.round(radius * 0.84));
  for (let f = 0; f < floors; f++) {
    const y = 1.95 + f * floorH;
    for (let i = 0; i < winCount; i++) {
      const a = (i / winCount) * Math.PI * 2 + f * 0.13;
      let da = a - gateAngle;
      da = Math.atan2(Math.sin(da), Math.cos(da));
      if (f === 0 && Math.abs(da) < 0.19) continue;
      const wide = f === 0 && i % 5 === 0;
      addBox(
        g,
        darkMat,
        wide ? 1.3 : 0.82,
        wide ? 2.05 : 1.18,
        0.18,
        Math.cos(a) * (radius + 0.035),
        wide ? 2.05 : y,
        Math.sin(a) * (radius + 0.035),
        Math.PI / 2 - a
      );
      if (!wide) {
        addBox(g, woodMat, 1.04, 0.12, 0.22, Math.cos(a) * (radius + 0.075), y - 0.72, Math.sin(a) * (radius + 0.075), Math.PI / 2 - a);
      }
    }
  }

  if (courtyard) {
    const floor = addMesh(g, new THREE.CircleGeometry(Math.max(1, innerR - 2.2), 52), stoneMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = floorY;
  }

  const colR = innerR - 0.8;
  const colCount = Math.max(12, Math.round(radius * 0.7));
  for (let i = 0; i < colCount; i++) {
    const a = (i / colCount) * Math.PI * 2 + 0.09;
    addCylinder(g, woodMat, 0.13, 0.16, wallH - 1.45, 6, Math.cos(a) * colR, 0.85 + (wallH - 1.45) * 0.5, Math.sin(a) * colR);
  }
  for (let f = 1; f < floors; f++) {
    const y = 0.75 + f * floorH;
    const walkway = addMesh(g, new THREE.RingGeometry(Math.max(1, innerR - 2.4), innerR - 0.08, 76, 1), woodDarkMat);
    walkway.rotation.x = -Math.PI / 2;
    walkway.position.y = y;
    addTorus(g, woodMat, innerR - 1.55, 0.075, 0, y + 0.95, 0);
    const postCount = Math.max(12, Math.round(radius * 0.62));
    for (let i = 0; i < postCount; i++) {
      const a = (i / postCount) * Math.PI * 2;
      addBox(g, woodMat, 0.1, 0.95, 0.1, Math.cos(a) * (innerR - 1.55), y + 0.48, Math.sin(a) * (innerR - 1.55));
    }
  }

  const gateX = Math.cos(gateAngle) * (radius - 0.08);
  const gateZ = Math.sin(gateAngle) * (radius - 0.08);
  if (name) addGate(g, gateX, gateZ, Math.PI / 2 - gateAngle, name);

  if (central) {
    const size = Math.min(radius * 0.72, 11);
    addCentralHall(g, size, Math.min(8.2, wallH * 0.58), name || '祖堂');
  }

  const innerRoofR = Math.max(2.8, innerR - 1.8);
  addRoundRoof(g, innerRoofR, radius + 2.25, wallH + 2.0, wallH + 0.18, roofSegments);
  addRoundRoofRidges(g, innerRoofR, radius + 2.25, wallH + 2.0, wallH + 0.18, Math.max(16, Math.round(radius * 0.9)));
  addTorus(g, roofRidgeMat, radius + 2.26, 0.13, 0, wallH + 0.15, 0);

  parent.add(g);
  addCircleCollider(cx, cz, radius + 0.55, name || '土楼');
  return g;
}

function addSquareRoof(parent, outerHalf, innerHalf, yIn, yOut) {
  const o = outerHalf;
  const i = innerHalf;
  const sides = [
    [[-i, yIn, i], [i, yIn, i], [o, yOut, o], [-o, yOut, o]],
    [[i, yIn, -i], [-i, yIn, -i], [-o, yOut, -o], [o, yOut, -o]],
    [[i, yIn, i], [i, yIn, -i], [o, yOut, -o], [o, yOut, o]],
    [[-i, yIn, -i], [-i, yIn, i], [-o, yOut, o], [-o, yOut, -o]],
  ];
  for (const s of sides) addQuad(parent, roofMat, s[0], s[1], s[2], s[3], 1, 1);
  addBox(parent, roofRidgeMat, o * 2 + 0.2, 0.16, 0.18, 0, yOut + 0.02, o);
  addBox(parent, roofRidgeMat, o * 2 + 0.2, 0.16, 0.18, 0, yOut + 0.02, -o);
  addBox(parent, roofRidgeMat, 0.18, 0.16, o * 2 + 0.2, o, yOut + 0.02, 0);
  addBox(parent, roofRidgeMat, 0.18, 0.16, o * 2 + 0.2, -o, yOut + 0.02, 0);
}

function addSquareTulou(parent, opts) {
  const { cx, cz, width, wallH = 9, floors = 2, wallT = 1.7, name } = opts;
  const g = new THREE.Group();
  g.position.set(cx, 0, cz);
  const half = width * 0.5;
  const floorH = (wallH - 1.1) / floors;
  addBox(g, stoneDarkMat, width + 3.4, 0.68, width + 3.4, 0, 0.34, 0);
  addBox(g, stoneMat, width + 1.8, 0.4, width + 1.8, 0, 0.86, 0);
  const h = wallH - 1.0;
  addBox(g, earthMat, width, h, wallT, 0, 1.0 + h * 0.5, half - wallT * 0.5);
  addBox(g, earthMat, width, h, wallT, 0, 1.0 + h * 0.5, -half + wallT * 0.5);
  addBox(g, earthMat, wallT, h, width - wallT * 2, half - wallT * 0.5, 1.0 + h * 0.5, 0);
  addBox(g, earthMat, wallT, h, width - wallT * 2, -half + wallT * 0.5, 1.0 + h * 0.5, 0);
  addBox(g, earthBandMat, width + 0.1, 0.18, 0.22, 0, 2.2, half + 0.05);
  addBox(g, earthBandMat, width + 0.1, 0.18, 0.22, 0, 4.8, half + 0.05);
  addBox(g, woodDarkMat, width - wallT * 2, 0.12, width - wallT * 2, 0, 0.15, 0);
  addBox(g, stoneMat, width - wallT * 2 + 0.1, 0.16, width - wallT * 2 + 0.1, 0, 0.12, 0);
  const winCount = Math.max(4, Math.round(width / 2.6));
  for (let f = 0; f < floors; f++) {
    const y = 2.1 + f * floorH;
    for (let i = 0; i < winCount; i++) {
      const off = (i + 0.5) / winCount * width - half;
      if (f === 0 && Math.abs(off) < 2.5) continue;
      addBox(g, darkMat, 0.86, 1.16, 0.16, off, y, half + 0.02);
      addBox(g, darkMat, 0.86, 1.16, 0.16, off, y, -half - 0.02);
      addBox(g, darkMat, 0.16, 1.16, 0.86, half + 0.02, y, off);
      addBox(g, darkMat, 0.16, 1.16, 0.86, -half - 0.02, y, off);
    }
  }
  const colCount = Math.max(4, Math.round(width / 3));
  for (let f = 1; f < floors; f++) {
    const y = 0.9 + f * floorH;
    const w2 = width - wallT * 2;
    addBox(g, woodDarkMat, w2, 0.14, 1.2, 0, y, half - wallT - 0.6);
    addBox(g, woodDarkMat, w2, 0.14, 1.2, 0, y, -half + wallT + 0.6);
    addBox(g, woodDarkMat, 1.2, 0.14, w2, half - wallT - 0.6, y, 0);
    addBox(g, woodDarkMat, 1.2, 0.14, w2, -half + wallT + 0.6, y, 0);
  }
  for (let i = 0; i < colCount; i++) {
    const p = -half + wallT + 1.2 + i * ((width - wallT * 2 - 2.4) / Math.max(1, colCount - 1));
    for (const s of [-1, 1]) {
      addCylinder(g, woodMat, 0.1, 0.13, wallH - 1.3, 6, p, 0.8 + (wallH - 1.3) * 0.5, s * (half - wallT - 0.7));
      addCylinder(g, woodMat, 0.1, 0.13, wallH - 1.3, 6, s * (half - wallT - 0.7), 0.8 + (wallH - 1.3) * 0.5, p);
    }
  }
  addGate(g, 0, half - 0.03, 0, name || '土楼');
  addSquareRoof(g, half + 2.1, half - wallT - 1.4, wallH + 1.8, wallH + 0.1);
  addBox(g, roofRidgeMat, half * 2 + 4.4, 0.14, 0.18, 0, wallH + 0.12, half + 2.1);
  addBox(g, roofRidgeMat, half * 2 + 4.4, 0.14, 0.18, 0, wallH + 0.12, -half - 2.1);
  addBox(g, roofRidgeMat, 0.18, 0.14, half * 2 + 4.4, half + 2.1, wallH + 0.12, 0);
  addBox(g, roofRidgeMat, 0.18, 0.14, half * 2 + 4.4, -half - 2.1, wallH + 0.12, 0);
  parent.add(g);
  addBoxCollider(cx, cz, width + 1.4, width + 1.4, name || '方楼');
  return g;
}

function addStream(parent, waterMaterial) {
  const positions = [];
  const uvs = [];
  const indices = [];
  const half = STREAM_WIDTH * 0.5;
  for (let i = 0; i < STREAM_SAMPLES.length; i++) {
    const s = STREAM_SAMPLES[i];
    const nx = -s.tz;
    const nz = s.tx;
    positions.push(s.x + nx * half, -0.025, s.z + nz * half);
    positions.push(s.x - nx * half, -0.025, s.z - nz * half);
    uvs.push(s.t * 26, 0, s.t * 26, 1);
    if (i < STREAM_SAMPLES.length - 1) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const water = new THREE.Mesh(geo, waterMaterial);
  water.receiveShadow = true;
  parent.add(water);

  const bedPositions = [];
  const bedIndices = [];
  const bedHalf = half + 1.5;
  for (let i = 0; i < STREAM_SAMPLES.length; i++) {
    const s = STREAM_SAMPLES[i];
    const nx = -s.tz;
    const nz = s.tx;
    bedPositions.push(s.x + nx * bedHalf, -0.46, s.z + nz * bedHalf);
    bedPositions.push(s.x - nx * bedHalf, -0.46, s.z - nz * bedHalf);
    if (i < STREAM_SAMPLES.length - 1) {
      const a = i * 2;
      bedIndices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const bedGeo = new THREE.BufferGeometry();
  bedGeo.setAttribute('position', new THREE.Float32BufferAttribute(bedPositions, 3));
  bedGeo.setIndex(bedIndices);
  bedGeo.computeVertexNormals();
  addMesh(parent, bedGeo, waterBedMat);

  for (let i = 2; i < STREAM_SAMPLES.length - 2; i += 3) {
    const s = STREAM_SAMPLES[i];
    const nx = -s.tz;
    const nz = s.tx;
    for (const side of [-1, 1]) {
      addOrientedBox(
        parent,
        stoneDarkMat,
        2.1,
        0.34,
        0.8,
        s.x + nx * (half + 0.55) * side,
        0.15,
        s.z + nz * (half + 0.55) * side,
        s.tx,
        s.tz
      );
    }
    if (i % 6 === 0) {
      addOrientedBox(
        parent,
        stoneMat,
        1.2 + (i % 3) * 0.4,
        0.45,
        0.9,
        s.x + nx * (half + 1.3) * (i % 2 ? 1 : -1),
        0.22,
        s.z + nz * (half + 1.3) * (i % 2 ? 1 : -1),
        s.tx,
        s.tz
      );
    }
  }
}

function addBridge(parent, b) {
  const g = new THREE.Group();
  g.position.set(b.x, 0, b.z);
  g.rotation.y = b.rot;
  const steps = 7;
  for (let i = 0; i < steps; i++) {
    const t = (i + 0.5) / steps;
    const z = -b.span * 0.5 + t * b.span;
    const y = b.baseY + 0.22 + b.rise * Math.cos((t * 2 - 1) * Math.PI * 0.5);
    addBox(g, stoneMat, b.width, 0.34, b.span / steps + 0.15, 0, y, z);
    addBox(g, stoneDarkMat, b.width + 0.46, 0.18, 0.2, 0, y - 0.15, z);
  }
  for (const sx of [-1, 1]) {
    for (let i = 0; i <= 6; i++) {
      const t = i / 6;
      const z = -b.span * 0.5 + t * b.span;
      const y = b.baseY + 0.5 + b.rise * Math.cos((t * 2 - 1) * Math.PI * 0.5);
      addBox(g, stoneMat, 0.18, 0.9, 0.25, sx * (b.width * 0.5 - 0.08), y + 0.18, z);
    }
    const rail = addOrientedBox(g, stoneMat, 0.2, 0.15, b.span + 0.2, sx * (b.width * 0.5 - 0.08), b.rise + 0.72, 0, 0, 1);
    rail.rotation.x = 0;
  }
  parent.add(g);
}

const PADDIES = [
  [-126, 121, 38, 25, 0.07], [-84, 127, 33, 21, -0.05], [-43, 143, 30, 19, 0.1],
  [-119, 80, 28, 17, -0.13], [-77, 90, 23, 15, 0.08], [-31, 106, 21, 14, -0.09],
  [92, 84, 38, 22, -0.06], [128, 48, 30, 20, 0.04], [111, -26, 31, 18, 0.09],
  [73, -129, 34, 20, -0.04], [29, -133, 24, 17, 0.07], [-142, -32, 30, 19, 0.04],
  [-113, 8, 25, 16, -0.08], [-33, -142, 27, 17, 0.06],
];

function addPaddies(parent) {
  for (const [x, z, w, d, rot] of PADDIES) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = rot;
    const field = addMesh(g, new THREE.PlaneGeometry(w, d), paddyMat);
    field.rotation.x = -Math.PI / 2;
    field.position.y = 0.055;
    field.castShadow = false;
    addBox(g, earthBandMat, w + 1.2, 0.22, 1.0, 0, 0.12, d * 0.5);
    addBox(g, earthBandMat, w + 1.2, 0.22, 1.0, 0, 0.12, -d * 0.5);
    addBox(g, earthBandMat, 1.0, 0.22, d, w * 0.5, 0.12, 0);
    addBox(g, earthBandMat, 1.0, 0.22, d, -w * 0.5, 0.12, 0);
    parent.add(g);
  }
}

function addTree(parent, x, z, scale, seed, far = false) {
  const rand = mulberry32(seed);
  const trunkH = (3.2 + rand() * 2.1) * scale;
  addCylinder(parent, trunkMat, 0.18 * scale, 0.3 * scale, trunkH, 6, x, trunkH * 0.5, z);
  const material = far ? leafFarMat : leafMat;
  const count = 2 + Math.floor(rand() * 2);
  for (let i = 0; i < count; i++) {
    const r = (1.4 + rand() * 1.5) * scale;
    const geo = new THREE.IcosahedronGeometry(r, 1);
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.set(x + (rand() - 0.5) * 1.8 * scale, trunkH + (rand() - 0.2) * 1.2 * scale, z + (rand() - 0.5) * 1.8 * scale);
    mesh.scale.y = 0.8 + rand() * 0.45;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
  }
}

function addBamboo(parent, x, z, scale, seed) {
  const rand = mulberry32(seed);
  for (let i = 0; i < 5; i++) {
    const h = (6 + rand() * 4) * scale;
    const px = x + (rand() - 0.5) * 2.8;
    const pz = z + (rand() - 0.5) * 2.8;
    addCylinder(parent, teaDarkMat, 0.055, 0.075, h, 5, px, h * 0.5, pz);
    for (let k = 0; k < 3; k++) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.5, 4), leafMat);
      leaf.position.set(px + (rand() - 0.5) * 0.7, h - 0.4 - k * 0.8, pz + (rand() - 0.5) * 0.7);
      leaf.castShadow = true;
      parent.add(leaf);
    }
  }
}

function addHill(parent, x, z, rx, rz, h, material, seed) {
  const geo = new THREE.SphereGeometry(1, 30, 14, 0, Math.PI * 2, 0, Math.PI / 2);
  const pos = geo.attributes.position;
  const rand = mulberry32(seed);
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n = 0.9 + Math.sin(v.x * 7 + v.z * 4) * 0.06 + (rand() - 0.5) * 0.08;
    v.x *= n;
    v.z *= n;
    pos.setXYZ(i, v.x, v.y * (0.94 + Math.sin(v.x * 5.1) * 0.05), v.z);
  }
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, material);
  mesh.scale.set(rx, h, rz);
  mesh.position.set(x, -0.4, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
}

function addTeaTerraces(parent, cx, cz, baseY, radius0, radiusStep, rings, a0, a1, segments = 22) {
  for (let k = 0; k < rings; k++) {
    const r = radius0 + k * radiusStep;
    const y = baseY + k * 0.82;
    for (let i = 0; i < segments; i++) {
      const a = a0 + ((a1 - a0) * (i + 0.5)) / segments;
      const arc = ((a1 - a0) * r) / segments;
      const dx = -Math.sin(a);
      const dz = Math.cos(a);
      addOrientedBox(
        parent,
        k % 2 ? teaDarkMat : teaMat,
        arc + 0.24,
        0.55,
        radiusStep * 0.84,
        cx + Math.cos(a) * r,
        y,
        cz + Math.sin(a) * r,
        dx,
        dz
      );
      if (i % 2 === 0) {
        const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45 + (i % 3) * 0.06, 0), teaDarkMat);
        bush.position.set(cx + Math.cos(a) * (r + radiusStep * 0.18), y + 0.48, cz + Math.sin(a) * (r + radiusStep * 0.18));
        bush.castShadow = true;
        parent.add(bush);
      }
    }
  }
}

function coloredGeometry(geo, color) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const c = new THREE.Color(color);
  const count = g.attributes.position.count;
  const arr = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(arr, 3));
  return g;
}

function villagerGeometry() {
  const parts = [];
  const torso = new THREE.CylinderGeometry(0.2, 0.27, 0.82, 6);
  torso.translate(0, 0.96, 0);
  parts.push(coloredGeometry(torso, 0xb7b0a0));
  const head = new THREE.SphereGeometry(0.16, 7, 6);
  head.translate(0, 1.55, 0);
  parts.push(coloredGeometry(head, 0xd2a27f));
  for (const sx of [-1, 1]) {
    const leg = new THREE.BoxGeometry(0.14, 0.58, 0.15);
    leg.translate(sx * 0.11, 0.29, 0);
    parts.push(coloredGeometry(leg, 0x393d40));
    const arm = new THREE.BoxGeometry(0.1, 0.54, 0.11);
    arm.rotateZ(sx * 0.1);
    arm.translate(sx * 0.29, 1.0, 0);
    parts.push(coloredGeometry(arm, 0xb7b0a0));
  }
  const hat = new THREE.ConeGeometry(0.31, 0.19, 8);
  hat.translate(0, 1.73, 0);
  parts.push(coloredGeometry(hat, 0x9a7446));
  return mergeGeometries(parts, false);
}

function createLife() {
  const group = new THREE.Group();

  const smokeSpots = [
    [-72, 50, 10.5], [58, 42, 19], [8, -76, 14.5], [-89, 55, 8.4],
    [-54, 61, 8.2], [108, 32, 5.8], [-74, 44, 13.5],
  ];
  const perColumn = 16;
  const smokeCount = smokeSpots.length * perColumn;
  const smokePositions = new Float32Array(smokeCount * 3);
  const smokeSeeds = new Float32Array(smokeCount);
  const smokeData = [];
  let si = 0;
  for (const [sx, sz, sy] of smokeSpots) {
    for (let i = 0; i < perColumn; i++) {
      const seed = i / perColumn;
      smokeSeeds[si] = seed;
      smokeData.push({ sx, sz, sy, seed, drift: (Math.random() - 0.5) * 1.8 });
      smokePositions[si * 3] = sx;
      smokePositions[si * 3 + 1] = sy;
      smokePositions[si * 3 + 2] = sz;
      si++;
    }
  }
  const smokeGeo = new THREE.BufferGeometry();
  smokeGeo.setAttribute('position', new THREE.BufferAttribute(smokePositions, 3));
  smokeGeo.setAttribute('aSeed', new THREE.BufferAttribute(smokeSeeds, 1));
  const smokeMat = new THREE.PointsMaterial({
    map: smokeTexture,
    color: 0xe9e5d8,
    size: 4.7,
    transparent: true,
    opacity: 0.34,
    depthWrite: false,
    sizeAttenuation: true,
    blending: THREE.NormalBlending,
  });
  const smoke = new THREE.Points(smokeGeo, smokeMat);
  smoke.frustumCulled = false;
  smoke.renderOrder = 2;
  group.add(smoke);

  const flagDefs = [
    [-76, 58, 0.04], [-67, 58, -0.04], [-58, 58, 0.1],
    [53.4, 73.2, 0.08], [62.6, 73.2, -0.08], [3.4, -52.5, 0.05], [12.6, -52.5, -0.06],
  ];
  const flags = [];
  for (let i = 0; i < flagDefs.length; i++) {
    const [fx, fz, ry] = flagDefs[i];
    addCylinder(group, woodDarkMat, 0.07, 0.09, 8.6, 6, fx, 4.3, fz);
    const geo = new THREE.PlaneGeometry(2.35, 1.35, 10, 4);
    const mesh = new THREE.Mesh(geo, flagMat);
    mesh.position.set(fx + Math.cos(ry) * 1.2, 7.25, fz - Math.sin(ry) * 1.2);
    mesh.rotation.y = ry;
    mesh.castShadow = true;
    group.add(mesh);
    const base = new Float32Array(geo.attributes.position.array);
    flags.push({ geo, base, phase: i * 0.9, ry });
  }

  const pathData = [];
  const paths = [
    [[-128, 100], [-96, 94], [-68, 78], [-42, 96], [-55, 122], [-95, 132], [-128, 100]],
    [[42, 82], [78, 92], [100, 118], [72, 140], [39, 130], [28, 106], [42, 82]],
    [[22, -36], [52, -22], [82, -42], [69, -72], [38, -80], [18, -58], [22, -36]],
    [[-146, 42], [-128, 62], [-110, 48], [-122, 20], [-146, 42]],
  ];
  for (const pts of paths) {
    const segs = [];
    let total = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const ax = pts[i][0];
      const az = pts[i][1];
      const bx = pts[i + 1][0];
      const bz = pts[i + 1][1];
      const len = Math.hypot(bx - ax, bz - az);
      segs.push({ ax, az, bx, bz, len, start: total });
      total += len;
    }
    pathData.push({ segs, total });
  }

  const peopleCount = 22;
  const people = new THREE.InstancedMesh(villagerGeometry(), villagerMat, peopleCount);
  people.frustumCulled = false;
  people.castShadow = true;
  people.receiveShadow = true;
  const dummy = new THREE.Object3D();
  const tint = new THREE.Color();
  const peopleData = [];
  for (let i = 0; i < peopleCount; i++) {
    const path = pathData[i % pathData.length];
    peopleData.push({
      path,
      offset: (i / peopleCount) * path.total + (i % 5) * 3.2,
      speed: 0.72 + (i % 6) * 0.09,
      phase: i * 0.67,
      scale: 0.9 + (i % 4) * 0.05,
    });
    if (i % 3 === 0) tint.setHex(0x4f5f74);
    else if (i % 3 === 1) tint.setHex(0x8b4f3d);
    else tint.setHex(0xa99b76);
    people.setColorAt(i, tint);
  }
  if (people.instanceColor) people.instanceColor.needsUpdate = true;
  group.add(people);

  function positionOnPath(data, distance) {
    const path = data.path;
    const d = ((distance % path.total) + path.total) % path.total;
    for (const seg of path.segs) {
      if (d <= seg.start + seg.len) {
        const t = (d - seg.start) / seg.len;
        return {
          x: seg.ax + (seg.bx - seg.ax) * t,
          z: seg.az + (seg.bz - seg.az) * t,
          dx: (seg.bx - seg.ax) / seg.len,
          dz: (seg.bz - seg.az) / seg.len,
        };
      }
    }
    const last = path.segs[path.segs.length - 1];
    return { x: last.bx, z: last.bz, dx: 1, dz: 0 };
  }

  const update = (time, dt) => {
    const pos = smokeGeo.attributes.position;
    for (let i = 0; i < smokeData.length; i++) {
      const d = smokeData[i];
      const life = (time * (0.62 + d.seed * 0.5) + d.seed * 18) % 18;
      const k = life / 18;
      pos.setXYZ(
        i,
        d.sx + Math.sin(time * 0.6 + d.seed * 12) * (0.3 + k * 2.2) + d.drift * k,
        d.sy + life,
        d.sz + Math.cos(time * 0.48 + d.seed * 9) * (0.24 + k * 1.7)
      );
    }
    pos.needsUpdate = true;

    for (const f of flags) {
      const p = f.geo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const bx = f.base[i * 3];
        const by = f.base[i * 3 + 1];
        const wave = Math.sin(time * 2.4 + bx * 2.0 + by * 0.7 + f.phase) * 0.19;
        p.setZ(i, f.base[i * 3 + 2] + wave * ((bx + 1.18) / 2.35));
      }
      p.needsUpdate = true;
      f.geo.computeVertexNormals();
    }

    for (let i = 0; i < peopleData.length; i++) {
      const data = peopleData[i];
      const p = positionOnPath(data, data.offset + time * data.speed);
      dummy.position.set(p.x, Math.sin(time * 5 + data.phase) * 0.025, p.z);
      dummy.rotation.set(0, Math.atan2(p.dx, p.dz), 0);
      dummy.scale.setScalar(data.scale);
      dummy.updateMatrix();
      people.setMatrixAt(i, dummy.matrix);
    }
    people.instanceMatrix.needsUpdate = true;
  };

  update(0, 0);
  return { group, update };
}

export function buildTulouScene() {
  const waterMaterial = makeWaterMaterial();
  const staticGroup = new THREE.Group();

  const terrain = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000), grassMat);
  terrain.rotation.x = -Math.PI / 2;
  terrain.position.y = -0.4;
  terrain.receiveShadow = true;
  staticGroup.add(terrain);

  addPlaza(staticGroup, CHENGQI.x, CHENGQI.z, CHENGQI.radius + 12, stoneDarkMat);
  addPlaza(staticGroup, TIANLUOKENG.x, TIANLUOKENG.z, 38, stoneDarkMat);
  addPlaza(staticGroup, ZHENCHENG.x, ZHENCHENG.z, ZHENCHENG.radius + 11, stoneDarkMat);

  addStream(staticGroup, waterMaterial);
  for (const b of BRIDGES) addBridge(staticGroup, b);
  addPaddies(staticGroup);

  addHill(staticGroup, -238, -38, 118, 86, 39, hillMat, 701);
  addHill(staticGroup, 218, -46, 128, 96, 43, hillMat, 703);
  addHill(staticGroup, -176, 168, 104, 72, 29, hillFarMat, 705);
  addHill(staticGroup, 182, 178, 118, 82, 32, hillFarMat, 707);
  addHill(staticGroup, -22, -244, 172, 82, 34, hillFarMat, 709);
  addHill(staticGroup, 258, 110, 110, 76, 31, hillFarMat, 711);
  addHill(staticGroup, -282, 120, 112, 78, 30, hillFarMat, 713);

  addTeaTerraces(staticGroup, -238, -38, 5.2, 46, 8.5, 9, 0.28, 1.62, 20);
  addTeaTerraces(staticGroup, 218, -46, 5.4, 44, 8.8, 9, 2.15, 3.9, 20);

  addRoundTulou(staticGroup, {
    cx: CHENGQI.x, cz: CHENGQI.z, radius: 31, wallH: 17.2, floors: 4,
    wallT: 2.15, gateAngle: Math.PI / 2, name: '承启楼', central: false, roofSegments: 88,
  });
  addRoundTulou(staticGroup, {
    cx: CHENGQI.x, cz: CHENGQI.z, radius: 22.4, wallH: 9.2, floors: 2,
    wallT: 1.55, gateAngle: Math.PI / 2, courtyard: false, floorY: 0.17, roofSegments: 80,
  });
  addRoundTulou(staticGroup, {
    cx: CHENGQI.x, cz: CHENGQI.z, radius: 14.8, wallH: 6.7, floors: 1,
    wallT: 1.35, gateAngle: Math.PI / 2, courtyard: false, floorY: 0.19, roofSegments: 72,
  });
  addCentralHall(staticGroup, 10.2, 7.2, '承启祖堂', CHENGQI.x, CHENGQI.z);

  addRoundTulou(staticGroup, {
    cx: ZHENCHENG.x, cz: ZHENCHENG.z, radius: 21, wallH: 13.4, floors: 4,
    wallT: 1.75, gateAngle: Math.PI / 2, name: '振成楼', central: false, roofSegments: 80,
  });
  addRoundTulou(staticGroup, {
    cx: ZHENCHENG.x, cz: ZHENCHENG.z, radius: 11.4, wallH: 7.4, floors: 2,
    wallT: 1.25, gateAngle: Math.PI / 2, courtyard: false, floorY: 0.17, roofSegments: 64,
  });
  addCentralHall(staticGroup, 7.2, 6.1, '振成祖堂', ZHENCHENG.x, ZHENCHENG.z);

  const tx = TIANLUOKENG.x;
  const tz = TIANLUOKENG.z;
  addRoundTulou(staticGroup, {
    cx: tx - 18, cz: tz - 16, radius: 10.2, wallH: 7.8, floors: 2,
    wallT: 1.35, gateAngle: Math.PI * 0.55, name: '和昌楼', central: false, roofSegments: 64,
  });
  addRoundTulou(staticGroup, {
    cx: tx + 17, cz: tz - 18, radius: 9.1, wallH: 7.1, floors: 2,
    wallT: 1.25, gateAngle: Math.PI * 0.48, name: '文昌楼', central: false, roofSegments: 60,
  });
  addRoundTulou(staticGroup, {
    cx: tx - 20, cz: tz + 18, radius: 9.8, wallH: 7.4, floors: 2,
    wallT: 1.3, gateAngle: Math.PI * 0.38, name: '瑞云楼', central: false, roofSegments: 60,
  });
  addRoundTulou(staticGroup, {
    cx: tx + 19, cz: tz + 16, radius: 9.4, wallH: 7.2, floors: 2,
    wallT: 1.28, gateAngle: Math.PI * 0.62, name: '振昌楼', central: false, roofSegments: 60,
  });
  addSquareTulou(staticGroup, {
    cx: tx + 1, cz: tz + 1, width: 14.5, wallH: 8.6, floors: 2, wallT: 1.45, name: '步云楼',
  });

  const trees = [
    [-152, 92, 1.25, 901], [-142, 64, 1.05, 902], [-32, 72, 1.1, 903],
    [-12, 94, 1.2, 904], [22, 74, 1.1, 905], [84, 72, 1.2, 906],
    [104, 112, 1.15, 907], [136, 8, 1.3, 908], [120, -78, 1.2, 909],
    [49, -118, 1.18, 910], [-2, -126, 1.2, 911], [-34, -112, 1.1, 912],
    [-124, -110, 1.15, 913], [-162, -78, 1.2, 914], [-96, -168, 1.25, 915],
    [58, -166, 1.28, 916], [126, -154, 1.25, 917], [171, -118, 1.3, 918],
    [174, 70, 1.3, 919], [-170, 142, 1.2, 920], [-75, 171, 1.18, 921],
    [38, 178, 1.25, 922], [97, 158, 1.18, 923], [-4, 185, 1.15, 924],
    [200, 15, 1.28, 925], [-205, 55, 1.3, 926], [10, -190, 1.2, 927],
  ];
  for (const [x, z, s, seed] of trees) addTree(staticGroup, x, z, s, seed);
  for (const [x, z, s, seed] of [
    [-148, 156, 1.0, 951], [78, 166, 1.0, 952], [26, -150, 0.95, 953], [-108, -132, 0.95, 954],
  ]) addBamboo(staticGroup, x, z, s, seed);

  for (const [x, z, r] of [[-148, 92, 1.0], [22, 74, 0.9], [104, 112, 0.9], [49, -118, 0.9], [-34, -112, 0.85]]) {
    addCircleCollider(x, z, r, '古树');
  }

  const staticMerged = mergeStaticGroup(staticGroup);
  const life = createLife();
  const group = new THREE.Group();
  group.add(staticMerged);
  group.add(life.group);

  return {
    group,
    waterMaterial,
    life,
    lanternMaterial: lanternMat,
    glowMaterial,
    stream: STREAM_SAMPLES,
    paddies: PADDIES,
    buildings: {
      tianluokeng: { x: tx, z: tz, radius: 34 },
      chengqi: { x: CHENGQI.x, z: CHENGQI.z, radius: CHENGQI.radius },
      zhencheng: { x: ZHENCHENG.x, z: ZHENCHENG.z, radius: ZHENCHENG.radius },
    },
  };
}
