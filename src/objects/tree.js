import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Color, PointLight, AmbientLight, DirectionalLight } from 'three';

export function loadTree(scene, path = '/models/cherry_tree.glb') {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();

    // 🌌 Set night sky background
    scene.background = new Color(0x000010); // deep navy

    // 🌙 Add dim ambient light (soft global glow)
    const ambient = new AmbientLight(0x222244, 0.5); // bluish dim light
    scene.add(ambient);

    loader.load(
      path,
      (gltf) => {
        const tree = gltf.scene;

        // Make the tree bigger
        tree.scale.set(5, 5, 5);
        tree.position.set(0, -5, 0);

        // 🌙 "Moonlight" directional light
        const moonLight = new DirectionalLight(0xaaaaff, 1.0);
        moonLight.position.set(-10, 20, 10);
        scene.add(moonLight);

        // ✨ Soft point light to highlight tree (like a lantern)
        const pointLight = new PointLight(0xffffff, 2, 50);
        pointLight.position.set(0, 10, 0);
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
