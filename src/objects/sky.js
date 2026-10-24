import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

function radialTexture(inner, outer, size = 128) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, inner);
  grad.addColorStop(1, outer);
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function moonTexture(size = 256) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  const h = size / 2;
  g.beginPath();
  g.arc(h, h, h - 2, 0, Math.PI * 2);
  g.fillStyle = "#f4f0d8";
  g.fill();
  g.globalCompositeOperation = "source-atop";
  g.fillStyle = "rgba(170,165,140,0.35)"; // maria
  for (const [x, y, r] of [[0.38, 0.4, 0.16], [0.6, 0.35, 0.1], [0.55, 0.62, 0.2], [0.3, 0.65, 0.08]]) {
    g.beginPath();
    g.arc(x * size, y * size, r * size, 0, Math.PI * 2);
    g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Gradient sky dome + moon disc with glow. Everything is unlit and fog-free,
// so it costs three cheap draw calls.
export function createSky(scene, moonDirection) {
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(500, 24, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        top: { value: new THREE.Color(0x050a1c) },
        horizon: { value: new THREE.Color(0x1b3a5e) },
      },
      vertexShader: /* glsl */ `
        varying float vH;
        void main() {
          vH = normalize(position).y;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 top; uniform vec3 horizon; varying float vH;
        void main() {
          gl_FragColor = vec4(mix(horizon, top, pow(clamp(vH, 0.0, 1.0), 0.6)), 1.0);
          #include <colorspace_fragment>
        }`,
    }),
  );
  dome.renderOrder = -2;
  scene.add(dome);

  const pos = moonDirection.clone().normalize().multiplyScalar(420);

  // Sprite so the disc always faces the camera (a flat mesh turns into an oval at angles)
  const moon = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: moonTexture(),
      fog: false,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  moon.scale.setScalar(44);
  moon.position.copy(pos);
  moon.renderOrder = -1;

  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: radialTexture("rgba(190,215,255,0.3)", "rgba(190,215,255,0)", 256),
      fog: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    }),
  );
  glow.scale.setScalar(120);
  glow.position.copy(pos).multiplyScalar(0.99);
  glow.renderOrder = -1;

  scene.add(moon, glow);
  return { dome, moon, glow };
}

/** Ring of low-poly hills on the horizon so the ground has a landscape edge. One draw call. */
export function createHills(scene, { count = 22, seed = 3 } = {}) {
  let t = seed;
  const rand = () => ((t = (t * 16807) % 2147483647) - 1) / 2147483646;
  const geoms = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + rand() * 0.2;
    const r = 170 + rand() * 70;
    const h = 25 + rand() * 45;
    const g = new THREE.ConeGeometry(30 + rand() * 40, h, 6 + Math.floor(rand() * 3), 1).toNonIndexed();
    g.deleteAttribute("uv");
    g.rotateY(rand() * 3);
    g.translate(Math.cos(a) * r, -5 + h / 2 - 3, Math.sin(a) * r);
    geoms.push(g);
  }
  const mesh = new THREE.Mesh(
    mergeGeometries(geoms, false),
    new THREE.MeshBasicMaterial({ color: 0x0f2036 }), // fog blends it into the horizon
  );
  geoms.forEach((g) => g.dispose());
  scene.add(mesh);
  return mesh;
}
