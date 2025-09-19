import * as THREE from 'three';

export function createStars(scene, count = 500) {
  const starsGeometry = new THREE.BufferGeometry();
  const starVertices = [];
  for (let i = 0; i < count; i++) {
    starVertices.push(
      (Math.random() - 0.5) * 400,
      Math.random() * 200 + 10,
      (Math.random() - 0.5) * 400
    );
  }
  starsGeometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(starVertices, 3)
  );
  const stars = new THREE.Points(
    starsGeometry,
    new THREE.PointsMaterial({ color: 0xffffff, size: 0.3 })
  );
  scene.add(stars);
  return stars;
}
