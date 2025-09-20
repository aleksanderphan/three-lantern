// objects/stars.js
import * as THREE from 'three';

export function createStars(scene) {
  const starCount = 3000;
  const positions = new Float32Array(starCount * 3);

  for (let i = 0; i < starCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 800; // wider spread
    positions[i * 3 + 1] = Math.random() * 400 - 10; // up in the "sky"
    positions[i * 3 + 2] = (Math.random() - 0.5) * 800;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
    },
    vertexShader: `
      uniform float time;
      varying float vBrightness;
      void main() {
        // Simple flicker using sine wave & position noise
        vBrightness = 0.7 + 0.3 * sin(time + position.x * 0.2 + position.y * 0.1);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = 2.0; // size of stars
      }
    `,
    fragmentShader: `
      varying float vBrightness;
      void main() {
        vec3 color = vec3(1.0) * vBrightness; // white stars with flicker
        gl_FragColor = vec4(color, 1.0);
      }
    `,
    transparent: true,
    depthWrite: false, // prevents z-fighting with sky/fog
  });

  const stars = new THREE.Points(geometry, material);
  scene.add(stars);
  return stars;
}
