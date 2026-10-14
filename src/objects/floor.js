import * as THREE from 'three';
import { CONFIG } from '../config.js';

export function createFloor(scene) {
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(64, 64),
    new THREE.MeshStandardMaterial({
      color: 0x221a0f,
      roughness: 1,
      metalness: 0,
      emissive: 0x111111,
    })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = CONFIG.floorY;
  floor.receiveShadow = true;
  scene.add(floor);
  return floor;
}
