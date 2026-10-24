import * as THREE from 'three';
import { gsap } from 'gsap';
import { CONFIG } from '../config.js';

// Fly the camera to an object and back to the default view
export function createCameraRig(camera, controls) {
  const home = {
    position: new THREE.Vector3(...CONFIG.camera.position),
    target: new THREE.Vector3(...CONFIG.camera.target),
  };
  const { distance, height } = CONFIG.focus;
  const autoRotate = controls.autoRotate;

  function tween(position, target, duration, onComplete) {
    gsap.killTweensOf([camera.position, controls.target]);
    gsap.to(camera.position, { ...position, duration, ease: 'power2.inOut' });
    gsap.to(controls.target, { ...target, duration, ease: 'power2.inOut', onComplete });
  }

  // Direction from the tree (scene center) out to the object, on the ground plane
  function outwardDirection(position) {
    const dir = new THREE.Vector3(position.x, 0, position.z);
    return dir.lengthSq() > 1e-6 ? dir.normalize() : new THREE.Vector3(0, 0, 1);
  }

  // Place the camera on the far side of the object from the tree, looking back in,
  // so it never ends up inside the canopy.
  function focus(object, onArrive) {
    const target = object.getWorldPosition(new THREE.Vector3());
    const destination = target
      .clone()
      .addScaledVector(outwardDirection(target), distance)
      .add(new THREE.Vector3(0, height, 0));

    controls.enabled = false;
    controls.autoRotate = false;
    controls.minDistance = 0;

    tween(
      { x: destination.x, y: destination.y, z: destination.z },
      { x: target.x, y: target.y + 1, z: target.z },
      CONFIG.focus.duration,
      onArrive
    );
  }

  function reset() {
    controls.enabled = false;
    tween(
      { x: home.position.x, y: home.position.y, z: home.position.z },
      { x: home.target.x, y: home.target.y, z: home.target.z },
      CONFIG.focus.resetDuration,
      () => {
        controls.minDistance = CONFIG.camera.minDistance;
        controls.maxDistance = CONFIG.camera.maxDistance;
        controls.autoRotate = autoRotate;
        controls.enabled = true;
      }
    );
  }

  return { focus, reset, outwardDirection };
}
