import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createLanterns } from './objects/lanterns.js';
import { loadTree } from './objects/tree.js';
import { createStars } from './objects/stars.js';

// Scene, Camera, Renderer
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0c2a);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 12, 35);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 5, 0);

scene.add(new THREE.AmbientLight(0x111122, 0.25));

// Floor
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(200, 200),
  new THREE.MeshStandardMaterial({
    color: 0x221a0f,
    roughness: 1,
    metalness: 0,
  })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -5;
scene.add(floor);

// Objects
let lanterns = [];
let treeModel;

(async () => {
  lanterns = await createLanterns(scene, 50); // now async
  console.log('Lanterns loaded');

  treeModel = await loadTree(scene);
  console.log('Blender Sakura tree loaded');
})();

const stars = createStars(scene);

// Popup
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const popup = document.getElementById('popup');
const popupImage = document.getElementById('popupImage');
const popupText = document.getElementById('popupText');
document.getElementById('popupClose').addEventListener('click', () => {
  popup.style.display = 'none';
});

window.addEventListener('click', (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(lanterns.map((l) => l.mesh));
  if (intersects.length > 0) {
    const clicked = intersects[0].object.userData;
    popupImage.src = clicked.image;
    popupText.textContent = clicked.text;
    popup.style.display = 'block';
  }
});

// Animate
function animate() {
  requestAnimationFrame(animate);
  const time = Date.now() * 0.002;

  lanterns.forEach((l) => {
    l.mesh.position.y += l.speed;
    l.mesh.position.x +=
      Math.sin(Date.now() * 0.001 + l.mesh.position.y) * 0.002;
    l.mesh.position.z +=
      Math.cos(Date.now() * 0.001 + l.mesh.position.y) * 0.002;
    l.mesh.rotation.y += l.rotationSpeed;

    if (l.mesh.position.y > 20) {
      l.mesh.position.y = Math.random() * 2 + 4;
      l.mesh.position.x = (Math.random() - 0.5) * 40;
      l.mesh.position.z = (Math.random() - 0.5) * 40;
    }

    // 🔹 Flicker light only (no shaderMaterial anymore)
    const intensity =
      0.5 + Math.sin(time + l.flickerOffset) * 0.2 + Math.random() * 0.05;
    l.light.intensity = intensity;
  });

  camera.position.y = 12 + Math.sin(time * 0.1) * 0.5;
  controls.update();
  renderer.render(scene, camera);
}

animate();
