import * as THREE from 'three';
import { WATER_Y, terrainHeight } from './sayramTerrain.js';
import { createSwan, createHorse } from './sayramCreatures.js';
import { createFlags, createBirds, createRipple, createSmoke } from './sayramFlags.js';

const SWANS = [
  { cx: -228, cz: 78, rx: 8, rz: 5, speed: 0.09, phase: 0.2, scale: 1.78 },
  { cx: -203, cz: 70, rx: 10, rz: 6, speed: -0.075, phase: 1.8, scale: 1.6 },
  { cx: -250, cz: 68, rx: 7, rz: 4, speed: 0.1, phase: 3.2, scale: 1.5 },
  { cx: -178, cz: 82, rx: 9, rz: 5, speed: -0.085, phase: 4.4, scale: 1.66 },
];

const HORSES = [
  { cx: 105, cz: 312, r: 8, speed: 0.04, phase: 0.4, color: 0x7a4526, mane: 0x24170f, saddle: 0x8d3e30, scale: 1.28 },
  { cx: 140, cz: 330, r: 16, speed: -0.028, phase: 2.0, color: 0x3c2a20, mane: 0x17110d, saddle: 0x2f5d7c, scale: 1.16 },
  { cx: 224, cz: 300, r: 10, speed: 0.044, phase: 3.6, color: 0xb98548, mane: 0x4f351f, saddle: 0x7a2f49, scale: 1.22 },
  { cx: -56, cz: 342, r: 17, speed: -0.033, phase: 1.2, color: 0x6a3d23, mane: 0x1f1611, saddle: 0x9a7a36, scale: 0.98 },
  { cx: 338, cz: 330, r: 12, speed: 0.05, phase: 5.0, color: 0x8a5530, mane: 0x2c1c12, saddle: 0x3e6d52, scale: 1.02 },
];

export function buildSayramOverlay() {
  const group = new THREE.Group();
  group.name = 'sayram-life-overlay';

  const swans = SWANS.map((d) => {
    const g = createSwan(d.scale);
    group.add(g);
    const ripple = createRipple();
    group.add(ripple);
    return { ...d, group: g, ripple };
  });

  const horses = HORSES.map((d) => {
    const h = createHorse(d.color, d.mane, d.saddle, d.scale);
    group.add(h.group);
    return { ...d, ...h };
  });

  const flagData = createFlags();
  group.add(flagData.group);

  const birds = createBirds();
  group.add(birds.mesh);

  const smoke = createSmoke();
  group.add(smoke.group);

  const dummy = new THREE.Object3D();

  const life = {
    update(time) {
      swans.forEach((s, i) => {
        const a = time * s.speed + s.phase;
        const x = s.cx + Math.cos(a) * s.rx;
        const z = s.cz + Math.sin(a) * s.rz * 0.72;
        const dx = -Math.sin(a) * s.rx * s.speed;
        const dz = Math.cos(a) * s.rz * 0.72 * s.speed;
        s.group.position.set(x, WATER_Y - 0.02 + Math.sin(time * 1.1 + i) * 0.035, z);
        s.group.rotation.y = Math.atan2(dx, dz);
        s.group.rotation.z = Math.sin(time * 1.27 + i * 1.7) * 0.035;
        const amp = 0.72 + Math.sin(time * 1.6 + i * 2.1) * 0.18;
        s.ripple.position.set(x, WATER_Y + 0.045, z);
        s.ripple.scale.setScalar(amp * s.scale * 1.6);
        s.ripple.material.opacity = 0.18 + Math.sin(time * 1.6 + i) * 0.06;
        s.ripple.rotation.y = a * 0.3;
      });

      horses.forEach((h, i) => {
        const a = time * h.speed + h.phase;
        const x = h.cx + Math.cos(a) * h.r;
        const z = h.cz + Math.sin(a) * h.r;
        const dx = -Math.sin(a);
        const dz = Math.cos(a);
        const walk = time * 2.0 + h.phase * 3.0;
        h.group.position.set(x, terrainHeight(x, z) + 0.02 + Math.abs(Math.sin(walk * 2)) * 0.035, z);
        h.group.rotation.y = Math.atan2(dx, dz);
        h.front.rotation.x = Math.sin(walk) * 0.46;
        h.back.rotation.x = -Math.sin(walk) * 0.42;
        h.group.rotation.z = Math.sin(walk * 0.5 + i) * 0.012;
      });

      flagData.base.forEach((f, i) => {
        const gust = Math.sin(time * 2.2 + f.phase);
        dummy.position.set(
          f.x + Math.sin(time * 1.7 + f.phase) * 0.05,
          f.y + Math.sin(time * 2.6 + f.phase) * 0.045,
          f.z + Math.cos(time * 1.4 + f.phase) * 0.04
        );
        dummy.rotation.set(
          0.12 + gust * 0.12,
          f.angle + Math.sin(time * 1.9 + f.phase) * 0.16,
          Math.sin(time * 2.4 + f.phase) * 0.14
        );
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        flagData.flags.setMatrixAt(i, dummy.matrix);
      });
      flagData.flags.instanceMatrix.needsUpdate = true;

      birds.base.forEach((b, i) => {
        const a = time * b.speed + b.phase;
        dummy.position.set(
          b.cx + Math.cos(a) * b.r,
          b.y + Math.sin(time * 0.7 + b.phase) * 2.4,
          b.cz + Math.sin(a) * b.r * 0.62
        );
        dummy.rotation.set(0.05 + Math.sin(time * 1.4 + i) * 0.08, -a + Math.PI * 0.5, Math.sin(time * 1.8 + i) * 0.16);
        dummy.scale.setScalar(b.scale);
        dummy.updateMatrix();
        birds.mesh.setMatrixAt(i, dummy.matrix);
      });
      birds.mesh.instanceMatrix.needsUpdate = true;

      smoke.update(time);
    },
  };

  const stats = {
    swans: swans.length,
    horses: horses.length,
    flags: flagData.base.length,
    birds: birds.base.length,
  };

  return { group, life, swans, horses, flags: flagData, birds, smoke, stats };
}
