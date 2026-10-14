import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { CONFIG } from '../config.js';

// Sakura tree at the center of the scene
export async function loadTree(scene, manager) {
  const { modelPath, scale } = CONFIG.tree;
  const gltf = await new GLTFLoader(manager).loadAsync(modelPath);

  const tree = gltf.scene;
  tree.name = 'tree';
  tree.scale.setScalar(scale);
  tree.position.y = CONFIG.floorY;
  tree.traverse((child) => {
    if (child.isMesh) child.castShadow = true;
  });

  scene.add(tree);
  return tree;
}
