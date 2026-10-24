import * as THREE from "three";

// Twinkling star dome: one draw call, all animation on the GPU.
export function createStars(scene, count = 1800) {
  const positions = new Float32Array(count * 3);
  const phases = new Float32Array(count);
  const sizes = new Float32Array(count);
  const v = new THREE.Vector3();

  for (let i = 0; i < count; i++) {
    // Uniform points on the upper hemisphere shell
    v.randomDirection();
    v.y = Math.abs(v.y) * 0.9 + 0.1;
    v.normalize().multiplyScalar(450);
    positions.set([v.x, v.y, v.z], i * 3);
    phases[i] = Math.random() * Math.PI * 2;
    sizes[i] = 1 + Math.pow(Math.random(), 4) * 2.5;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("phase", new THREE.BufferAttribute(phases, 1));
  geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      pixelRatio: { value: 1 },
    },
    vertexShader: /* glsl */ `
      uniform float time;
      uniform float pixelRatio;
      attribute float phase;
      attribute float size;
      varying float vBrightness;
      void main() {
        vBrightness = 0.65 + 0.35 * sin(time * 1.5 + phase * 6.0);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * pixelRatio;
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vBrightness;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d) * vBrightness;
        gl_FragColor = vec4(vec3(0.85, 0.9, 1.0) * a, a);
      }
    `,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
    fog: false,
  });

  const stars = new THREE.Points(geometry, material);
  stars.frustumCulled = false;
  stars.renderOrder = -1;
  scene.add(stars);
  return stars;
}
