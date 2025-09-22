import * as THREE from 'three';
import { gsap } from 'gsap';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { createLanterns } from './objects/lanterns.js';
import { loadTree } from './objects/tree.js';
import { createStars } from './objects/stars.js';

// Scene, Camera, Renderer
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d203d);
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
// Limit zoom distance
controls.minDistance = 20;
controls.maxDistance = 40;

// Lights
scene.add(new THREE.AmbientLight(0x111122, 0.25));
const moonLight = new THREE.DirectionalLight(0x99bbff, 1.2);
moonLight.position.set(-30, 50, -20);
moonLight.castShadow = true;
moonLight.shadow.mapSize.set(2048, 2048);
moonLight.shadow.bias = -0.0001;
scene.add(moonLight);

// Floor
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
  console.log('Sakura tree loaded');
})();

// Stars
const stars = createStars(scene);

// Bloom & Shader Effects
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

// UnrealBloomPass (glow effect)
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.5, // strength
  1.8, // radius
  0.85 // threshold
);
composer.addPass(bloomPass);

// Simple color shift shader (optional "dreamy" look)
const colorShiftShader = {
  uniforms: { tDiffuse: { value: null }, time: { value: 0 } },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
    }`,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float time;
    varying vec2 vUv;
    void main() {
      vec2 uv = vUv;
      vec3 col = texture2D(tDiffuse, uv).rgb;
      col.r += 0.02 * sin(time + uv.y * 10.0);
      col.b += 0.02 * cos(time + uv.x * 10.0);
      gl_FragColor = vec4(col, 1.0);
    }`,
};
const colorPass = new ShaderPass(colorShiftShader);
composer.addPass(colorPass);

// Resize handling
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

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
const pointLight = new THREE.PointLight(
  0xff929f, // Color
  800, // Intensity
  10000 // Distance (How far it reaches)
);
scene.add(pointLight);

// Popup close button
document.getElementById('popupClose').addEventListener('click', (event) => {
  event.stopPropagation(); // prevent click-through to lanterns
  popup.style.display = 'none';

  resetCamera(); // reset camera after closing popup
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

    controls.minDistance = 0;
    controls.maxDistance = 40;

    gsap.to(camera.position, {
      duration: 1.5,
      x: destination.x,
      y: destination.y,
      z: destination.z,
      ease: 'power2.inOut',
      onComplete: () => {
        // After zoom, show popup
        let clicked = clickedLantern;
        while (clicked && !clicked.userData.custom) {
          clicked = clicked.parent; // climb up until you find the group with your data
        }

        if (clicked && clicked.userData.custom) {
          alert(JSON.stringify(clicked.userData));
          const { image, text } = clicked.userData.custom;
          popupImage.src = image;
          popupText.textContent = text;
          popup.style.display = 'block';
        }
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

  lanterns.forEach((l) => {
    l.mesh.position.y += l.speed;
    l.mesh.rotation.y += l.rotationSpeed;
    if (l.mesh.position.y > 20) {
      l.mesh.position.y = Math.random() * 2 + 4;
      l.mesh.position.x = (Math.random() - 0.5) * 40;
      l.mesh.position.z = (Math.random() - 0.5) * 40;
    }
    const intensity =
      0.6 + Math.sin(time + l.flickerOffset) * 0.2 + Math.random() * 0.5;
    l.light.intensity = intensity;
  });

  // stars.material.uniforms.time.value = time;
  colorPass.uniforms.time.value = time * 0.5;

  camera.position.y = 12 + Math.sin(time * 0.1) * 0.5;
  controls.update();

  composer.render();
}

animate();

// Register the service worker once at startup
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(
      (reg) => console.log('Service worker registered:', reg),
      (err) => console.error('Service worker registration failed:', err)
    );
  });
}
