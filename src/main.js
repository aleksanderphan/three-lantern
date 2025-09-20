import * as THREE from 'three';
import { gsap } from 'gsap';

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createLanterns } from './objects/lanterns.js';
import { loadTree } from './objects/tree.js';
import { createStars } from './objects/stars.js';

// Scene, Camera, Renderer
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0c2a);
scene.fog = new THREE.FogExp2(0x0b0c2a, 0.015);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 12, 35);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 5, 0);
controls.enablePan = false;
controls.enableZoom = true;
controls.minDistance = 20;
controls.maxDistance = 40;

// 🌌 Ambient night light
scene.add(new THREE.AmbientLight(0x111122, 0.25));

// 🌙 Moonlight
const moonLight = new THREE.DirectionalLight(0x99bbff, 1.2);
moonLight.position.set(-30, 50, -20);
moonLight.castShadow = true;
moonLight.shadow.mapSize.width = 2048;
moonLight.shadow.mapSize.height = 2048;
moonLight.shadow.bias = -0.0001;
scene.add(moonLight);

// Floor (shrink & circular)
const floor = new THREE.Mesh(
  new THREE.CircleGeometry(20, 64), // smaller circle, radius 20
  new THREE.MeshStandardMaterial({
    color: 0x221a0f,
    roughness: 1,
    metalness: 0,
    emissive: 0x111111,
  })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -5;
floor.receiveShadow = true;
scene.add(floor);

// Objects
let lanterns = [];
let treeModel;

(async () => {
  lanterns = await createLanterns(scene, 50);
  console.log('Lanterns loaded');

  treeModel = await loadTree(scene);
  console.log('Blender Sakura tree loaded');
})();

// 🌟 Stars
const stars = createStars(scene);

// Popup
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const popup = document.getElementById('popup');
const popupImage = document.getElementById('popupImage');
const popupText = document.getElementById('popupText');
// Default camera settings
const defaultCamPos = new THREE.Vector3(0, 12, 35);
const defaultTarget = new THREE.Vector3(0, 5, 0);

// Reset camera function
function resetCamera() {
  // Smooth transition
  const duration = 1000; // ms
  const startPos = camera.position.clone();
  const startTarget = controls.target.clone();
  const startTime = performance.now();

  function animateReset(time) {
    const t = Math.min((time - startTime) / duration, 1);

    // Lerp camera position
    camera.position.lerpVectors(startPos, defaultCamPos, t);

    // Lerp controls target
    controls.target.lerpVectors(startTarget, defaultTarget, t);

    if (t < 1) {
      requestAnimationFrame(animateReset);
    }
  }

  requestAnimationFrame(animateReset);
}

// Popup close button
document.getElementById('popupClose').addEventListener('click', (event) => {
  event.stopPropagation(); // 🔒 prevent click-through to lanterns
  popup.style.display = 'none';

  resetCamera(); // 🔄 reset after closing popup
});

window.addEventListener('click', (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObjects(lanterns.map((l) => l.mesh));
  if (intersects.length > 0) {
    const clickedLantern = intersects[0].object;

    // Smooth camera move toward lantern
    const targetPos = new THREE.Vector3();
    clickedLantern.getWorldPosition(targetPos);

    const offset = new THREE.Vector3(0, 2, 5); // camera offset from lantern
    const destination = targetPos.clone().add(offset);

    gsap.to(camera.position, {
      duration: 1.5,
      x: destination.x,
      y: destination.y,
      z: destination.z,
      ease: 'power2.inOut',
      onComplete: () => {
        // After zoom, show popup
        const clicked = clickedLantern.userData;
        popupImage.src = clicked.image;
        popupText.textContent = clicked.text;
        popup.style.display = 'block';
      },
    });

    gsap.to(controls.target, {
      duration: 1.5,
      x: targetPos.x,
      y: targetPos.y + 1,
      z: targetPos.z,
      ease: 'power2.inOut',
    });
  }
});

// Animate
function animate() {
  requestAnimationFrame(animate);
  const time = Date.now() * 0.002;

  // Lanterns floating + flicker
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

    // Flicker effect
    const intensity =
      0.6 + Math.sin(time + l.flickerOffset) * 0.2 + Math.random() * 0.05;
    l.light.intensity = intensity;
  });

  // Stars twinkling
  stars.material.uniforms.time.value = time;

  camera.position.y = 12 + Math.sin(time * 0.1) * 0.5;
  controls.update();
  renderer.render(scene, camera);
}

animate();
