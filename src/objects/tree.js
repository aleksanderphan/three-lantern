import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { PointLight, AmbientLight, DirectionalLight } from 'three';

export function loadTree(
  scene,
  path = '/models/sakura_tree.glb',
  loaderManager
) {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader(loaderManager);

    // Night sky background
    // scene.background = new Color(0x000010);

    // Low ambient light (soft bluish tint)
    const ambient = new AmbientLight(0x222244, 10);
    scene.add(ambient);

    loader.load(
      path,
      (gltf) => {
        const tree = gltf.scene;
        tree.scale.set(100, 100, 100);
        tree.position.set(0, -5, 0);

        // Moonlight (directional)
        const moonLight = new DirectionalLight(0x99bbff, 1.2);
        moonLight.position.set(30, 50, 20);
        moonLight.castShadow = true;

        // Shadow settings for softer look
        moonLight.shadow.mapSize.width = 64;
        moonLight.shadow.mapSize.height = 64;
        moonLight.shadow.camera.near = 1;
        moonLight.shadow.camera.far = 2;
        moonLight.shadow.bias = -0.01;
        scene.add(moonLight);

        // Soft lantern light near the tree
        const pointLight = new PointLight(0xffeecc, 500);
        pointLight.position.set(0, 15, 0);
        scene.add(pointLight);

        scene.add(tree);
        resolve(tree);
      },
      (xhr) => {
        if (xhr.total) {
        }
      },
      (err) => {
        console.error('Error loading tree GLB:', err);
        reject(err);
      }
    );
  });
}
