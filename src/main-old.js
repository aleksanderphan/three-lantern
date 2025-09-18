import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Scene, Camera, Renderer
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.02);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 10, 30);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Controls (optional)
const controls = new OrbitControls(camera, renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0x404040, 1);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(0, 50, 50);
scene.add(directionalLight);

const lanterns = [];
const lanternCount = 50;

for (let i = 0; i < lanternCount; i++) {
  const geometry = new THREE.CylinderGeometry(0.2, 0.3, 1, 8);
  const material = new THREE.MeshStandardMaterial({ color: 0xffa500 });
  const lantern = new THREE.Mesh(geometry, material);

  // Random starting position
  lantern.position.set(
    (Math.random() - 0.5) * 20,
    Math.random() * 10,
    (Math.random() - 0.5) * 20
  );

  // Add soft glowing light
  const light = new THREE.PointLight(0xffa500, 1, 5);
  light.position.set(0, 0.5, 0);
  lantern.add(light);

  scene.add(lantern);
  lanterns.push({ mesh: lantern, speed: 0.01 + Math.random() * 0.02 });
}

function animate() {
  requestAnimationFrame(animate);

  lanterns.forEach((lantern) => {
    // Move upwards
    lantern.mesh.position.y += lantern.speed;

    // Add slight horizontal drift
    lantern.mesh.position.x +=
      Math.sin(Date.now() * 0.001 + lantern.mesh.position.y) * 0.002;
    lantern.mesh.position.z +=
      Math.cos(Date.now() * 0.001 + lantern.mesh.position.y) * 0.002;

    // Reset lantern if it goes too high
    if (lantern.mesh.position.y > 20) {
      lantern.mesh.position.y = -5;
      lantern.mesh.position.x = (Math.random() - 0.5) * 20;
      lantern.mesh.position.z = (Math.random() - 0.5) * 20;
    }
  });

  controls.update();
  renderer.render(scene, camera);
}

animate();
