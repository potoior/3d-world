import * as THREE from 'three';
import { terrainHeight } from './sayramTerrain.js';

export function createVillage() {
  const root = new THREE.Group();
  root.name = 'sayram-yurts';

  const wallMat = new THREE.MeshStandardMaterial({ color: 0xf4f0e2, roughness: 0.86 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0xe9e3d1, roughness: 0.9 });
  const bandMat = new THREE.MeshStandardMaterial({ color: 0xb24a35, roughness: 0.68 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0xc99a45, roughness: 0.42, metalness: 0.25 });
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x5a3a22, roughness: 0.82 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2c, roughness: 0.9 });
  const windowMat = new THREE.MeshStandardMaterial({
    color: 0xffc16e,
    emissive: 0xff8a2e,
    emissiveIntensity: 0.1,
    roughness: 0.4,
  });
  const clothMat = new THREE.MeshStandardMaterial({
    color: 0xd9d1b8,
    roughness: 0.95,
    side: THREE.DoubleSide,
  });

  const defs = [
    [-275, 225, 1.02, 0.7],
    [-160, 248, 1.12, 2.2],
    [-35, 262, 1.0, 3.5],
    [105, 252, 1.14, 1.0],
    [190, 276, 0.92, 4.1],
    [365, 250, 1.06, 1.8],
    [-390, 204, 0.96, 2.7],
  ];

  const add = (geo, mat, x, y, z, cast = true) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = cast;
    m.receiveShadow = true;
    root.add(m);
    return m;
  };

  defs.forEach(([x, z, s, rot], idx) => {
    const g = new THREE.Group();
    g.position.set(x, terrainHeight(x, z), z);
    g.rotation.y = rot;
    g.scale.setScalar(s);
    root.add(g);

    const r = 5.1;
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.03, 2.35, 22), wallMat);
    wall.position.y = 1.22;
    wall.castShadow = true;
    wall.receiveShadow = true;
    g.add(wall);

    const baseBand = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.015, r * 1.035, 0.45, 22), bandMat);
    baseBand.position.y = 0.28;
    g.add(baseBand);

    const roof = new THREE.Mesh(new THREE.SphereGeometry(r * 1.012, 22, 10, 0, Math.PI * 2, 0, Math.PI / 2), roofMat);
    roof.position.y = 2.38;
    roof.scale.y = 0.58;
    roof.castShadow = true;
    roof.receiveShadow = true;
    g.add(roof);

    const edge = new THREE.Mesh(new THREE.TorusGeometry(r * 1.0, 0.1, 6, 30), bandMat);
    edge.rotation.x = Math.PI / 2;
    edge.position.y = 2.38;
    g.add(edge);

    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.72, 0.62, 12), trimMat);
    crown.position.y = 5.34;
    crown.castShadow = true;
    g.add(crown);

    const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(1.9, 2.25, 0.18), trimMat);
    doorFrame.position.set(0, 1.12, r + 0.02);
    g.add(doorFrame);
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.92, 0.2), doorMat);
    door.position.set(0, 1.02, r + 0.12);
    g.add(door);

    const windowGeo = new THREE.BoxGeometry(0.95, 0.72, 0.12);
    for (const a of [-1.25, 1.25]) {
      const win = new THREE.Mesh(windowGeo, windowMat);
      win.position.set(Math.sin(a) * (r + 0.04), 1.62, Math.cos(a) * (r + 0.04));
      win.rotation.y = a;
      g.add(win);
    }

    const rope = new THREE.Mesh(new THREE.TorusGeometry(r * 1.03, 0.035, 4, 30), clothMat);
    rope.rotation.x = Math.PI / 2;
    rope.position.y = 1.98;
    g.add(rope);

    for (let t = 0; t < 4; t++) {
      const a = (t / 4) * Math.PI * 2 + 0.4;
      const strip = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 1.4), clothMat);
      strip.position.set(Math.sin(a) * (r + 0.04), 3.5, Math.cos(a) * (r + 0.04));
      strip.rotation.y = a;
      strip.rotation.z = 0.1;
      g.add(strip);
    }

    if (idx % 2 === 0) {
      const stone = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.22, 5, 10), woodMat);
      stone.rotation.x = Math.PI / 2;
      stone.position.set(7.0, 0.2, 1.8);
      g.add(stone);
    }
  });

  const fence = (points, height = 1.1) => {
    for (let i = 0; i < points.length; i++) {
      const [x, z] = points[i];
      const y = terrainHeight(x, z);
      add(new THREE.CylinderGeometry(0.09, 0.12, height, 6), woodMat, x, y + height * 0.5, z);
      if (i < points.length - 1) {
        const [x2, z2] = points[i + 1];
        const y2 = terrainHeight(x2, z2);
        const len = Math.hypot(x2 - x, z2 - z);
        const angle = Math.atan2(x2 - x, z2 - z);
        for (const yy of [height * 0.42, height * 0.78]) {
          const beam = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, len), woodMat);
          beam.position.set((x + x2) * 0.5, (y + y2) * 0.5 + yy, (z + z2) * 0.5);
          beam.rotation.y = angle;
          beam.rotation.x = Math.atan2(y2 - y, len);
          root.add(beam);
        }
      }
    }
  };

  fence([
    [-310, 246], [-300, 272], [-268, 286], [-228, 290],
  ]);
  fence([
    [72, 282], [112, 296], [152, 292], [176, 272],
  ]);
  fence([
    [330, 282], [360, 294], [392, 286],
  ]);

  const pen = new THREE.Group();
  pen.name = 'sayram-horse-pen';
  root.add(pen);

  return { group: root, windowMat };
}
