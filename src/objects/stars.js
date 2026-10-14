import * as THREE from 'three';
import { CONFIG } from '../config.js';

// Twinkling starfield. Call update(elapsed) each frame.
export function createStars(scene) {
  const { count, spread, height } = CONFIG.stars;
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * spread;
    positions[i * 3 + 1] = Math.random() * height - 10;
    positions[i * 3 + 2] = (Math.random() - 0.5) * spread;
    sizes[i] = 1.2 + Math.random() * 1.6;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      pixelRatio: { value: Math.min(window.devicePixelRatio, CONFIG.maxPixelRatio) },
    },
    vertexShader: /* glsl */ `
      uniform float time;
      uniform float pixelRatio;
      attribute float size;
      varying float vBrightness;
      void main() {
        vBrightness = 0.7 + 0.3 * sin(time + position.x * 0.2 + position.y * 0.1);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * pixelRatio;
      }`,
    fragmentShader: /* glsl */ `
      varying float vBrightness;
      void main() {
        gl_FragColor = vec4(vec3(vBrightness), 1.0);
      }`,
    depthWrite: false,
  });

  const stars = new THREE.Points(geometry, material);
  stars.name = 'stars';
  scene.add(stars);

  function update(elapsed) {
    material.uniforms.time.value = elapsed * 2;
  }

  return { stars, update };
}
