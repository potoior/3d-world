import * as THREE from 'three';
import { mats, makePlaqueMaterial } from './putuoshanTextures.js';
import { mesh, box, cyl, tube, mergeBoxes, mulberry32 } from './psUtil.js';

export function createGuanyin() {
  const g = new THREE.Group();
  g.name = 'nanhai-guanyin';
  const B = 8;

  cyl(g, mats.stone, 25.2, 27.0, 2.2, 40, 0, 1.1, 0);
  box(g, mats.stoneDark, 52, 0.25, 52, 0, 2.2, 0);
  cyl(g, mats.stone, 20.2, 22.0, 1.9, 36, 0, 3.1, 0);
  box(g, mats.stoneLight, 42, 0.16, 42, 0, 4.08, 0);
  cyl(g, mats.stoneDark, 17.8, 18.2, 0.32, 36, 0, 4.22, 0);

  const bal = [];
  const rail = new THREE.TorusGeometry(23.6, 0.2, 5, 48);
  rail.rotateX(Math.PI * 0.5);
  rail.translate(0, 4.85, 0);
  bal.push(rail);
  const rail2 = new THREE.TorusGeometry(23.6, 0.28, 5, 48);
  rail2.rotateX(Math.PI * 0.5);
  rail2.translate(0, 3.3, 0);
  bal.push(rail2);
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    if (Math.sin(a) > 0.92) continue;
    bal.push(new THREE.CylinderGeometry(0.18, 0.24, 1.5, 6).translate(Math.cos(a) * 23.6, 3.95, Math.sin(a) * 23.6));
  }
  mesh(g, mergeBoxes(bal), mats.stoneLight);

  for (let i = 0; i < 10; i++) {
    const h = 2.2 * ((i + 1) / 10);
    const z = 25 + (10 - i) * 0.85;
    box(g, mats.stone, 15, h, 1.0, 0, h * 0.5, z);
    box(g, mats.stoneDark, 15.4, 0.1, 1.0, 0, h + 0.04, z);
  }

  cyl(g, mats.bronze, 9.4, 10.4, 1.4, 32, 0, 4.95, 0);
  cyl(g, mats.bronzeLight, 8.2, 9.4, 0.55, 32, 0, 5.82, 0);

  const petal = new THREE.SphereGeometry(1, 8, 5);
  const rnd = mulberry32(8831);
  const rings = [
    [30, 9.8, 6.05, 2.35, 0.44],
    [24, 8.4, 7.0, 2.05, 0.52],
    [18, 6.8, 7.85, 1.7, 0.62],
  ];
  for (const [n, r, y, s, tilt] of rings) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const geo = petal.clone();
      geo.scale(s, s * 0.4, s * 0.6);
      geo.rotateX(-tilt);
      geo.rotateY(-a + Math.PI * 0.5);
      geo.translate(Math.cos(a) * (r + 0.6), y + (rnd() - 0.5) * 0.1, Math.sin(a) * (r + 0.6));
      mesh(g, geo, i % 3 === 0 ? mats.bronzeLight : mats.bronze);
    }
  }

  const profile = [
    [8.4, 0], [8.95, 1.6], [8.6, 3.2], [8.0, 5.0], [7.2, 7.2],
    [6.4, 9.4], [5.8, 11.6], [5.35, 13.6], [5.0, 15.4], [4.75, 17.0],
    [4.55, 18.4], [4.35, 19.7], [4.15, 20.8], [3.95, 21.7], [3.65, 22.5],
    [3.25, 23.1],
  ];
  mesh(g, new THREE.LatheGeometry(profile.map((p) => new THREE.Vector2(p[0], B + p[1])), 30), mats.bronze);

  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + 0.12;
    const r0 = 7.8 + (i % 2) * 0.4;
    tube(g, i % 3 === 0 ? mats.bronzeLight : mats.bronzePatina, [
      new THREE.Vector3(Math.cos(a) * r0, B + 1.1, Math.sin(a) * r0),
      new THREE.Vector3(Math.cos(a + 0.06) * (r0 - 0.7), B + 6.0, Math.sin(a + 0.06) * (r0 - 0.7)),
      new THREE.Vector3(Math.cos(a - 0.03) * (r0 - 1.4), B + 11.4, Math.sin(a - 0.03) * (r0 - 1.4)),
      new THREE.Vector3(Math.cos(a) * (r0 - 2.2), B + 15.4, Math.sin(a) * (r0 - 2.2)),
    ], 0.16, 4);
  }

  const shoulder = new THREE.SphereGeometry(1, 16, 10);
  shoulder.scale(4.5, 2.6, 2.9);
  shoulder.translate(0, B + 21.8, 0);
  mesh(g, shoulder, mats.bronze);
  cyl(g, mats.bronze, 1.4, 1.75, 2.2, 12, 0, B + 24, 0);

  const head = new THREE.SphereGeometry(2.35, 16, 12);
  head.scale(1, 1.08, 0.95);
  head.translate(0, B + 26.4, 0.1);
  mesh(g, head, mats.bronzeLight);
  for (const sx of [-1, 1]) {
    const ear = new THREE.SphereGeometry(0.42, 7, 5);
    ear.scale(0.55, 1.5, 0.55);
    ear.translate(sx * 2.2, B + 26.1, 0.05);
    mesh(g, ear, mats.bronzeLight);
  }
  const hair = new THREE.SphereGeometry(2.42, 14, 9, 0, Math.PI * 2, 0, 1.55);
  hair.translate(0, B + 26.7, -0.05);
  mesh(g, hair, mats.bronzePatina);
  const ush = new THREE.SphereGeometry(0.72, 9, 7);
  ush.translate(0, B + 29, 0);
  mesh(g, ush, mats.bronzeLight);

  const crown = new THREE.TorusGeometry(2.12, 0.24, 6, 20);
  crown.rotateX(Math.PI * 0.5);
  crown.translate(0, B + 27.7, 0.02);
  mesh(g, crown, mats.gold);
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI * 0.72 + (i / 6) * Math.PI * 1.44;
    const spike = new THREE.ConeGeometry(0.28, 1.25, 5);
    spike.rotateZ(-Math.cos(a) * 0.2);
    spike.translate(Math.sin(a) * 2.05, B + 28.55 + Math.cos(a) * 0.18, Math.cos(a) * 0.35 + 0.05);
    mesh(g, spike, mats.gold, false, false);
  }
  const urna = new THREE.SphereGeometry(0.19, 7, 5);
  urna.translate(0, B + 26.75, 2.25);
  mesh(g, urna, mats.gold, false, false);

  tube(g, mats.bronze, [
    new THREE.Vector3(3.9, B + 21.2, 0.15),
    new THREE.Vector3(5.4, B + 18.4, 0.95),
    new THREE.Vector3(5.5, B + 15.6, 1.15),
    new THREE.Vector3(5.0, B + 13.2, 1.5),
  ], 0.92, 7);
  const rh = new THREE.SphereGeometry(1, 9, 7);
  rh.scale(0.8, 1.35, 0.55);
  rh.translate(5.0, B + 12.1, 1.62);
  mesh(g, rh, mats.bronzeLight);
  for (let i = 0; i < 4; i++) {
    const f = new THREE.CylinderGeometry(0.14, 0.19, 1.0, 5);
    f.translate(4.55 + i * 0.3, B + 11.1, 1.72);
    mesh(g, f, mats.bronzeLight);
  }

  tube(g, mats.bronze, [
    new THREE.Vector3(-3.9, B + 21.2, 0.15),
    new THREE.Vector3(-5.4, B + 18.6, 0.9),
    new THREE.Vector3(-5.0, B + 17.0, 1.6),
    new THREE.Vector3(-3.2, B + 17.5, 2.15),
  ], 0.88, 7);
  const lh = new THREE.SphereGeometry(1, 9, 7);
  lh.scale(0.82, 0.8, 0.55);
  lh.translate(-2.85, B + 17.45, 2.3);
  mesh(g, lh, mats.bronzeLight);

  const vase = new THREE.LatheGeometry([
    [0.62, 0], [1.05, 0.55], [1.25, 1.15], [1.1, 1.72], [0.68, 2.1],
    [0.42, 2.32], [0.55, 2.55], [0.38, 2.72],
  ].map((p) => new THREE.Vector2(p[0], p[1])), 16);
  vase.translate(-2.55, B + 17.9, 2.35);
  mesh(g, vase, mats.gold);

  const haloY = B + 26.5;
  const halo = new THREE.TorusGeometry(8.4, 0.34, 6, 48);
  halo.translate(0, haloY, -2.7);
  mesh(g, halo, mats.gold, false, false);
  const halo2 = new THREE.TorusGeometry(6.5, 0.13, 5, 40);
  halo2.translate(0, haloY, -2.76);
  mesh(g, halo2, mats.goldDark, false, false);
  const spokes = [];
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const s = new THREE.BoxGeometry(0.12, 1.8, 0.08);
    s.rotateZ(a);
    s.translate(Math.cos(a + Math.PI * 0.5) * 7.4, haloY + Math.sin(a + Math.PI * 0.5) * 7.4, -2.72);
    spokes.push(s);
  }
  mesh(g, mergeBoxes(spokes), mats.goldDark, false, false);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const flame = new THREE.ConeGeometry(0.28, 1.3, 4);
    flame.rotateZ(-a - Math.PI * 0.5);
    flame.translate(Math.cos(a) * 8.9, haloY + Math.sin(a) * 8.9, -2.74);
    mesh(g, flame, mats.gold, false, false);
  }

  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 2.2), makePlaqueMaterial('南海观音'));
  plaque.position.set(0, 2.75, 25.6);
  g.add(plaque);

  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const gr = ctx.createRadialGradient(64, 64, 2, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,232,180,0.85)');
  gr.addColorStop(0.25, 'rgba(255,205,120,0.35)');
  gr.addColorStop(1, 'rgba(255,190,100,0)');
  ctx.fillStyle = gr;
  ctx.fillRect(0, 0, 128, 128);
  const glowTex = new THREE.CanvasTexture(c);
  glowTex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex,
    color: 0xffd49a,
    transparent: true,
    opacity: 0.38,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }));
  sprite.position.set(0, haloY, -4.0);
  sprite.scale.set(42, 42, 1);
  g.add(sprite);

  return g;
}
