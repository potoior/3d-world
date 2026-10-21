import * as THREE from 'three';
import { WATER_Y, rand, terrainHeight } from './sayramTerrain.js';

export function createFlags() {
  const group = new THREE.Group();
  const flagGeo = new THREE.PlaneGeometry(0.62, 0.44);
  const flagMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.82,
    side: THREE.DoubleSide,
  });
  const colors = [0x2f6fce, 0xf2ead4, 0xc94437, 0x3f9656, 0xe6c33a];
  const strings = [
    [-300, 238, -248, 230, 5.6, 5.2],
    [-186, 254, -132, 260, 5.4, 5.0],
    [72, 262, 132, 266, 5.8, 5.4],
  ];
  const perString = 11;
  const total = strings.length * perString;
  const flags = new THREE.InstancedMesh(flagGeo, flagMat, total);
  flags.castShadow = false;
  flags.receiveShadow = false;
  flags.layers.set(0);
  group.add(flags);
  const color = new THREE.Color();
  for (let i = 0; i < total; i++) {
    color.setHex(colors[i % colors.length]);
    flags.setColorAt(i, color);
  }
  flags.instanceColor.needsUpdate = true;

  const poleGeo = new THREE.CylinderGeometry(0.075, 0.1, 1, 6);
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x6e4f31, roughness: 0.92 });
  const poles = new THREE.InstancedMesh(poleGeo, poleMat, strings.length * 2);
  poles.castShadow = true;
  group.add(poles);
  const dummy = new THREE.Object3D();
  const ropeMat = new THREE.LineBasicMaterial({ color: 0xb8ae98, transparent: true, opacity: 0.65 });
  const base = [];
  let fi = 0;

  strings.forEach(([x1, z1, x2, z2, h1, h2], si) => {
    const y1 = terrainHeight(x1, z1);
    const y2 = terrainHeight(x2, z2);
    for (let k = 0; k < 2; k++) {
      const x = k === 0 ? x1 : x2;
      const z = k === 0 ? z1 : z2;
      const y = k === 0 ? y1 : y2;
      const h = k === 0 ? h1 : h2;
      dummy.position.set(x, y + h * 0.5, z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, h, 1);
      dummy.updateMatrix();
      poles.setMatrixAt(si * 2 + k, dummy.matrix);
    }
    const linePts = [];
    for (let j = 0; j < 16; j++) {
      const t = j / 15;
      const x = x1 + (x2 - x1) * t;
      const z = z1 + (z2 - z1) * t;
      const y = y1 + (y2 - y1) * t + (1 - t) * h1 + t * h2 - Math.sin(t * Math.PI) * 1.0;
      linePts.push(new THREE.Vector3(x, y, z));
    }
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(linePts), ropeMat);
    group.add(line);

    const dx = x2 - x1;
    const dz = z2 - z1;
    const angle = Math.atan2(dx, dz);
    for (let j = 0; j < perString; j++) {
      const t = (j + 0.5) / perString;
      const x = x1 + dx * t;
      const z = z1 + dz * t;
      const y = y1 + (y2 - y1) * t + (1 - t) * h1 + t * h2 - Math.sin(t * Math.PI) * 1.0;
      base.push({ x, y: y - 0.22, z, angle, phase: rand(81 + fi, 3) * 6.28 });
      fi++;
    }
  });
  poles.instanceMatrix.needsUpdate = true;
  return { group, flags, base };
}

export function createBirds() {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      [
        0, 0, 0, -1.3, 0.24, 0.22, 0, 0.08, 0.42,
        0, 0, 0, 1.3, 0.24, 0.22, 0, 0.08, 0.42,
      ],
      3
    )
  );
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({
    color: 0xf2efe4,
    roughness: 0.8,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, 18);
  mesh.frustumCulled = false;
  mesh.layers.set(0);
  mesh.castShadow = false;
  const base = [];
  for (let i = 0; i < 18; i++) {
    base.push({
      r: 55 + rand(501 + i, 1) * 130,
      y: 46 + rand(501 + i, 2) * 62,
      speed: 0.05 + rand(501 + i, 3) * 0.07,
      phase: rand(501 + i, 4) * 6.28,
      cx: -40 + rand(501 + i, 5) * 220,
      cz: -90 + rand(501 + i, 6) * 180,
      scale: 0.7 + rand(501 + i, 7) * 0.9,
    });
  }
  return { mesh, base };
}

export function createRipple() {
  const geo = new THREE.RingGeometry(1.1, 1.32, 48);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xd8f1f0,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.layers.set(1);
  mesh.position.y = WATER_Y + 0.04;
  return mesh;
}

export function createSmoke() {
  const group = new THREE.Group();
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(235,238,232,0.7)');
  grd.addColorStop(0.45, 'rgba(225,230,226,0.32)');
  grd.addColorStop(1, 'rgba(220,228,226,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  const points = [];
  for (let i = 0; i < 5; i++) {
    const mat = new THREE.SpriteMaterial({
      map,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      fog: true,
    });
    const s = new THREE.Sprite(mat);
    s.position.set(-272 + i * 118, 7.4, 229 + (i % 3) * 14);
    s.scale.set(3.2, 3.2, 1);
    group.add(s);
    points.push({ sprite: s, phase: i * 1.7, base: s.position.clone() });
  }
  return {
    group,
    update(time) {
      points.forEach((p, i) => {
        const t = (time * 0.16 + p.phase) % 1;
        p.sprite.position.set(p.base.x + Math.sin(time * 0.2 + i) * 0.7 + t * 2.2, p.base.y + t * 10, p.base.z + t * 3.0);
        const s = 2.4 + t * 5.6;
        p.sprite.scale.set(s, s, 1);
        p.sprite.material.opacity = 0.2 * (1 - t) * Math.min(1, t * 5);
      });
    },
  };
}
