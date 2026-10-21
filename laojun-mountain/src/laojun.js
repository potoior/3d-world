import * as THREE from 'three';
import { createLaojunArchitecture } from './laojunArchitecture.js';
import { createLaojunNature } from './laojunNature.js';
import { createLaojunLife } from './laojunLife.js';
import { createCloudSea } from './clouds.js';
import { makeGlowTexture } from './textures.js';

export function createLaojunOverlay() {
  const root = new THREE.Group();
  root.name = 'laojun-overlay';

  const architecture = createLaojunArchitecture();
  const nature = createLaojunNature();
  const clouds = createCloudSea();
  const life = createLaojunLife({
    ribbonAnchors: architecture.ribbonAnchors,
    walkCurve: architecture.walkCurve,
    bridgeCurve: architecture.bridgeCurve,
  });

  root.add(nature.group);
  root.add(architecture.group);
  root.add(clouds.group);
  root.add(life.group);

  const glowMat = new THREE.SpriteMaterial({
    map: makeGlowTexture(),
    color: 0xffe2b0,
    transparent: true,
    opacity: 0.45,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: true,
  });
  const glow = new THREE.Sprite(glowMat);
  glow.position.set(720, 340, 220);
  glow.scale.set(900, 500, 1);
  glow.renderOrder = 4;
  root.add(glow);

  const mistMat = new THREE.SpriteMaterial({
    map: makeGlowTexture(),
    color: 0xc9d9dc,
    transparent: true,
    opacity: 0.12,
    depthWrite: false,
    fog: true,
  });
  const haze = new THREE.Sprite(mistMat);
  haze.position.set(120, 150, -420);
  haze.scale.set(620, 240, 1);
  root.add(haze);

  return {
    group: root,
    architecture,
    nature,
    life,
    clouds,
    counts: {
      cliffPanels: nature.counts.cliffPanels,
      pines: nature.counts.pines,
      rocks: nature.counts.rocks,
      ribbons: architecture.ribbonAnchors.length,
      pilgrims: 46,
    },
    update(elapsed, dt) {
      clouds.update(elapsed, dt);
      life.update(elapsed, dt);
      glowMat.opacity = 0.38 + Math.sin(elapsed * 0.08) * 0.05;
      haze.position.x = 120 + Math.sin(elapsed * 0.012) * 40;
    },
  };
}
