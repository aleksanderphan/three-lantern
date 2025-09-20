import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Color, PointLight, AmbientLight, DirectionalLight } from 'three';

export function loadTree(scene, path = '/models/cherry_tree.glb') {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();

    // 🌌 Night sky background
    scene.background = new Color(0x000010);

    // Low ambient light (soft bluish tint)
    const ambient = new AmbientLight(0x222244, 0.3);
    scene.add(ambient);

    loader.load(
      path,
      (gltf) => {
        const tree = gltf.scene;
        tree.scale.set(5, 5, 5);
        tree.position.set(0, -5, 0);

        // 🌙 Moonlight (directional)
        const moonLight = new DirectionalLight(0x99bbff, 1.2);
        moonLight.position.set(-30, 50, -20); // high left, angled
        moonLight.castShadow = true;

        // Shadow settings for softer look
        moonLight.shadow.mapSize.width = 2048;
        moonLight.shadow.mapSize.height = 2048;
        moonLight.shadow.camera.near = 1;
        moonLight.shadow.camera.far = 100;
        moonLight.shadow.bias = -0.0001;
        scene.add(moonLight);

        // ✨ Soft lantern light near the tree
        const pointLight = new PointLight(0xffeecc, 1.5, 30);
        pointLight.position.set(0, 8, 0);
        scene.add(pointLight);

        scene.add(tree);
        resolve(tree);
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
