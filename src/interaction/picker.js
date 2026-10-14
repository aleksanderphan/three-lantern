import * as THREE from 'three';

const DRAG_THRESHOLD = 6; // px; more movement than this is an orbit drag, not a click

// Raycasts pointer events against `getTargets()`.
// Calls onPick(object) on click and toggles a pointer cursor on hover.
export function createPicker({ camera, domElement, getTargets, onPick, isEnabled = () => true }) {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let downX = 0;
  let downY = 0;

  function pick(event) {
    const rect = domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObjects(getTargets(), false)[0]?.object ?? null;
  }

  domElement.addEventListener('pointerdown', (event) => {
    downX = event.clientX;
    downY = event.clientY;
  });

  domElement.addEventListener('pointerup', (event) => {
    if (!isEnabled()) return;
    if (Math.hypot(event.clientX - downX, event.clientY - downY) > DRAG_THRESHOLD) return;
    const hit = pick(event);
    if (hit) onPick(hit);
  });

  domElement.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse') return;
    domElement.style.cursor = isEnabled() && pick(event) ? 'pointer' : '';
  });
}
