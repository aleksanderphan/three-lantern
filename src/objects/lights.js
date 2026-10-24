import * as THREE from 'three';
import { CONFIG } from '../config.js';

// All scene-wide lights live here
export function createLights(scene) {
  const group = new THREE.Group();
  group.name = 'lights';

  // Ambient night tint
  group.add(new THREE.AmbientLight(0x111122, 0.25));
  group.add(new THREE.AmbientLight(0x222244, 10));

  // Moonlight (casts the tree's shadow onto the floor)
  const moon = new THREE.DirectionalLight(0x99bbff, 1.2);
  moon.position.set(-30, 50, -20);
  moon.castShadow = true;
  moon.shadow.mapSize.set(2048, 2048);
  moon.shadow.bias = -0.0001;
  moon.shadow.camera.near = 1;
  moon.shadow.camera.far = 150;
  Object.assign(moon.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30 });
  group.add(moon);

  // Back fill from the opposite side
  const fill = new THREE.DirectionalLight(0x99bbff, 1.2);
  fill.position.set(30, 50, 20);
  group.add(fill);

  // Warm glows around the tree
  group.add(new THREE.PointLight(0xff929f, 800, 10000));
  const treeGlow = new THREE.PointLight(0xffeecc, 500);
  treeGlow.position.set(0, 15, 0);
  group.add(treeGlow);

  scene.add(group);
  return group;
}

// Background, fog
export function createAtmosphere(scene) {
  scene.background = new THREE.Color(CONFIG.background);
  scene.fog = new THREE.FogExp2(CONFIG.fog.color, CONFIG.fog.density);
}
