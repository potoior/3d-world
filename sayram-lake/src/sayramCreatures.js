import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

function part(geo, { p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1] } = {}) {
  geo.scale(s[0], s[1], s[2]);
  geo.rotateX(r[0]);
  geo.rotateY(r[1]);
  geo.rotateZ(r[2]);
  geo.translate(p[0], p[1], p[2]);
  return geo;
}

function mergeParts(parts) {
  return mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)), false);
}

function tube(points, radius, material) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  return new THREE.Mesh(new THREE.TubeGeometry(curve, 10, radius, 6, false), material);
}

export function createSwan(scale) {
  const group = new THREE.Group();
  const white = new THREE.MeshStandardMaterial({
    color: 0xfaf9f0,
    roughness: 0.58,
    metalness: 0,
    emissive: new THREE.Color(0x1b1d1a),
    emissiveIntensity: 0.34,
  });
  const black = new THREE.MeshStandardMaterial({ color: 0x17191a, roughness: 0.7 });
  const orange = new THREE.MeshStandardMaterial({ color: 0xf29a2c, roughness: 0.55 });

  const body = mergeParts([
    part(new THREE.SphereGeometry(1, 16, 12), { p: [0, 0.82, 0], s: [1.1, 0.72, 1.6] }),
    part(new THREE.SphereGeometry(1, 12, 8), { p: [-0.66, 1.0, -0.02], r: [0, 0, 0.16], s: [0.55, 0.28, 1.02] }),
    part(new THREE.SphereGeometry(1, 12, 8), { p: [0.66, 1.0, -0.02], r: [0, 0, -0.16], s: [0.55, 0.28, 1.02] }),
    part(new THREE.ConeGeometry(0.32, 0.9, 7), { p: [0, 0.88, -1.65], r: [-1.2, 0, 0] }),
  ]);
  const bodyMesh = new THREE.Mesh(body, white);
  bodyMesh.castShadow = true;
  group.add(bodyMesh);

  const neck = tube(
    [
      [0, 1.1, 0.86],
      [0, 1.55, 1.08],
      [0, 2.02, 1.08],
      [0, 2.2, 1.3],
    ],
    0.105,
    white
  );
  neck.castShadow = true;
  group.add(neck);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 10), white);
  head.position.set(0, 2.28, 1.38);
  head.scale.set(0.9, 1, 1.15);
  group.add(head);

  const mask = new THREE.Mesh(new THREE.SphereGeometry(0.19, 10, 8), black);
  mask.position.set(0, 2.31, 1.47);
  mask.scale.set(0.78, 0.55, 0.52);
  group.add(mask);

  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.3, 6), orange);
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, 2.26, 1.62);
  group.add(beak);

  group.scale.setScalar(scale);
  return group;
}

export function createHorse(color, maneColor, saddleColor, scale) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.86 });
  const maneMat = new THREE.MeshStandardMaterial({ color: maneColor, roughness: 0.92 });
  const saddleMat = new THREE.MeshStandardMaterial({ color: saddleColor, roughness: 0.78 });

  const body = mergeParts([
    part(new THREE.SphereGeometry(1, 14, 10), { p: [0, 1.28, 0], s: [0.55, 0.6, 1.24] }),
    part(new THREE.CylinderGeometry(0.22, 0.33, 0.96, 7), { p: [0, 1.68, 0.72], r: [-0.46, 0, 0] }),
    part(new THREE.BoxGeometry(0.36, 0.34, 0.82), { p: [0, 2.02, 1.15], r: [0.18, 0, 0] }),
    part(new THREE.BoxGeometry(0.25, 0.23, 0.38), { p: [0, 1.92, 1.52], r: [0.12, 0, 0] }),
    part(new THREE.ConeGeometry(0.08, 0.28, 5), { p: [-0.14, 2.22, 1.02], r: [0, 0, -0.16] }),
    part(new THREE.ConeGeometry(0.08, 0.28, 5), { p: [0.14, 2.22, 1.02], r: [0, 0, 0.16] }),
  ]);
  const bodyMesh = new THREE.Mesh(body, bodyMat);
  bodyMesh.castShadow = true;
  group.add(bodyMesh);

  const mane = mergeParts([
    part(new THREE.BoxGeometry(0.13, 0.2, 0.92), { p: [0, 1.75, 0.66], r: [-0.46, 0, 0] }),
    part(new THREE.ConeGeometry(0.16, 0.9, 6), { p: [0, 1.28, -1.28], r: [0.55, 0, 0] }),
  ]);
  const maneMesh = new THREE.Mesh(mane, maneMat);
  maneMesh.castShadow = true;
  group.add(maneMesh);

  const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.12, 0.72), saddleMat);
  saddle.position.set(0, 1.64, -0.02);
  saddle.castShadow = true;
  group.add(saddle);

  const legGeo = mergeParts([
    part(new THREE.CylinderGeometry(0.085, 0.11, 1.16, 6), { p: [-0.28, -0.58, 0] }),
    part(new THREE.CylinderGeometry(0.085, 0.11, 1.16, 6), { p: [0.28, -0.58, 0] }),
    part(new THREE.BoxGeometry(0.16, 0.16, 0.22), { p: [-0.28, -1.12, 0.04] }),
    part(new THREE.BoxGeometry(0.16, 0.16, 0.22), { p: [0.28, -1.12, 0.04] }),
  ]);
  const front = new THREE.Group();
  front.position.set(0, 1.18, 0.68);
  const frontMesh = new THREE.Mesh(legGeo, bodyMat);
  frontMesh.castShadow = true;
  front.add(frontMesh);
  group.add(front);

  const back = new THREE.Group();
  back.position.set(0, 1.18, -0.66);
  const backMesh = new THREE.Mesh(legGeo, bodyMat);
  backMesh.castShadow = true;
  back.add(backMesh);
  group.add(back);

  group.scale.setScalar(scale);
  return { group, front, back };
}
