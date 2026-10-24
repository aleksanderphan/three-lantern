import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { ColorShiftShader } from '../shaders/colorShift.js';
import { CONFIG } from '../config.js';

// Bloom + color shift. Returns the composer and a per-frame update.
export function createPostProcessing(renderer, scene, camera) {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const { strength, radius, threshold } = CONFIG.bloom;
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    strength,
    radius,
    threshold
  );
  composer.addPass(bloomPass);

  const colorPass = new ShaderPass(ColorShiftShader);
  colorPass.uniforms.amount.value = CONFIG.colorShift.amount;
  composer.addPass(colorPass);

  function update(elapsed) {
    colorPass.uniforms.time.value = elapsed * CONFIG.colorShift.speed;
  }

  return { composer, update };
}
