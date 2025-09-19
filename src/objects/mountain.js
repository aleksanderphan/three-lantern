import * as THREE from 'three';

export function createMountain(scene) {
  const mountain = new THREE.Mesh(
    new THREE.ConeGeometry(8, 8, 32),
    new THREE.MeshStandardMaterial({
      color: 0x0d0d0d,
      roughness: 1,
      metalness: 0,
    })
  );
  mountain.position.set(0, -1, 0);
  scene.add(mountain);

  const mountainLight = new THREE.PointLight(0xffaa55, 1.2, 20, 2);
  mountainLight.position.set(0, 7, 0);
  scene.add(mountainLight);

  return { mountain, mountainLight };
}
