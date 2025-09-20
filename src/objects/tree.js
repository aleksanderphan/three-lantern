import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Color, PointLight, AmbientLight, DirectionalLight } from 'three';

// In-memory cache
const treeCache = new Map();

export function loadTree(scene, path = '/models/cherry_tree.glb') {
  return new Promise((resolve, reject) => {
    // Return cached tree if it exists
    if (treeCache.has(path)) {
      console.log('Cached Tree!');
      const cachedTree = treeCache.get(path);
      const clone = cachedTree.clone(true); // clone to allow multiple instances
      scene.add(clone);
      resolve(clone);
      return;
    }

    const loader = new GLTFLoader();

    // Low ambient light (soft bluish tint)
    const ambient = new AmbientLight(0x222244, 10);
    scene.add(ambient);

    loader.load(
      path,
      (gltf) => {
        const tree = gltf.scene;
        tree.scale.set(5, 5, 5);
        tree.position.set(0, -5, 0);

        // Moonlight (directional)
        const moonLight = new DirectionalLight(0x99bbff, 1.2);
        moonLight.position.set(30, 50, 20);
        moonLight.castShadow = true;
        moonLight.shadow.mapSize.width = 64;
        moonLight.shadow.mapSize.height = 64;
        moonLight.shadow.camera.near = 1;
        moonLight.shadow.camera.far = 2;
        moonLight.shadow.bias = -0.01;
        scene.add(moonLight);

        // Soft lantern light near the tree
        const pointLight = new PointLight(0xffeecc, 100, 3000);
        pointLight.position.set(-2, 10, 0);
        scene.add(pointLight);

        // Cache the loaded tree
        treeCache.set(path, tree);

        // Add a clone to the scene
        const clone = tree.clone(true);
        scene.add(clone);
        resolve(clone);
      },
      (xhr) => {
        if (xhr.total) {
          console.log(
            `Tree ${((xhr.loaded / xhr.total) * 100).toFixed(2)}% loaded`
          );
        }
      },
      (err) => {
        console.error('Error loading tree GLB:', err);
        reject(err);
      }
    );
  });
}
