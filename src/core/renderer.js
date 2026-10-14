import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CONFIG } from '../config.js';

// Renderer
export function createRenderer(container = document.body) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, CONFIG.maxPixelRatio));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);
  return renderer;
}

// Camera
export function createCamera() {
  const { fov, near, far, position } = CONFIG.camera;
  const camera = new THREE.PerspectiveCamera(
    fov,
    window.innerWidth / window.innerHeight,
    near,
    far
  );
  camera.position.set(...position);
  return camera;
}

// Orbit controls
export function createControls(camera, domElement) {
  const { target, minDistance, maxDistance, autoRotateSpeed } = CONFIG.camera;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const controls = new OrbitControls(camera, domElement);
  controls.target.set(...target);
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.minDistance = minDistance;
  controls.maxDistance = maxDistance;
  controls.maxPolarAngle = Math.PI * 0.55; // keep the camera above the floor
  controls.autoRotate = !reduceMotion;
  controls.autoRotateSpeed = autoRotateSpeed;
  controls.update();
  return controls;
}
