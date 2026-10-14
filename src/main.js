import * as THREE from 'three';
import { gsap } from 'gsap';
import { createRenderer, createCamera, createControls } from './core/renderer.js';
import { createPostProcessing } from './core/postprocessing.js';
import { createLoadingManager, showLoadError } from './core/loading.js';
import { createAtmosphere, createLights } from './objects/lights.js';
import { createFloor } from './objects/floor.js';
import { createStars } from './objects/stars.js';
import { loadTree } from './objects/tree.js';
import { createLanterns } from './objects/lanterns.js';
import { createPicker } from './interaction/picker.js';
import { createCameraRig } from './interaction/cameraRig.js';
import { createPopup } from './ui/popup.js';

// Core
const manager = createLoadingManager();
const scene = new THREE.Scene();
const camera = createCamera();
const renderer = createRenderer();
const controls = createControls(camera, renderer.domElement);
const { composer, update: updatePost } = createPostProcessing(renderer, scene, camera);

// World
createAtmosphere(scene);
createLights(scene);
createFloor(scene);
const stars = createStars(scene);

let lanterns = null;

Promise.all([createLanterns(scene, manager), loadTree(scene, manager)])
  .then(([result]) => {
    lanterns = result;
  })
  .catch((err) => {
    console.error(err);
    showLoadError('Something went wrong loading the scene. Please refresh.');
  });

// Lantern focus + popup
const rig = createCameraRig(camera, controls);
let focused = null;

const popup = createPopup({
  onClose: () => {
    if (focused) focused.paused = false;
    focused = null;
    rig.reset();
  },
});

function focusLantern(lantern) {
  focused = lantern;
  lantern.paused = true;

  // Turn the banner's front face (+Z) toward where the camera will be
  const { rotation, position } = lantern.group;
  const dir = rig.outwardDirection(position);
  const facing = Math.atan2(dir.x, dir.z);
  const turn = Math.PI * 2;
  const y = facing + Math.round((rotation.y - facing) / turn) * turn; // nearest equivalent angle
  gsap.to(rotation, { y, duration: 1, ease: 'power2.out' });

  rig.focus(lantern.group, () => popup.open(lantern.data));
}

createPicker({
  camera,
  domElement: renderer.domElement,
  getTargets: () => lanterns?.hitboxes ?? [],
  isEnabled: () => !focused,
  onPick: (hitbox) => focusLantern(hitbox.userData.lantern),
});

// Expose internals in the dev console
if (import.meta.env.DEV) {
  Object.assign(window, { THREE, scene, camera, controls, renderer, gsap });
}

// Resize
window.addEventListener('resize', () => {
  const { innerWidth: w, innerHeight: h } = window;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
});

// Loop
const timer = new THREE.Timer();
timer.connect(document); // pauses delta while the tab is hidden

renderer.setAnimationLoop((timestamp) => {
  timer.update(timestamp);
  const delta = Math.min(timer.getDelta(), 0.1);
  const elapsed = timer.getElapsed();

  lanterns?.update(delta, elapsed);
  stars.update(elapsed);
  updatePost(elapsed);
  controls.update(delta);

  composer.render();
});
