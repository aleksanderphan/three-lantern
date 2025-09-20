import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export function createLanterns(
  scene,
  count = 50,
  modelPath = '/models/lantern.glb'
) {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();

    loader.load(
      modelPath,
      (gltf) => {
        const baseLantern = gltf.scene;
        const lanterns = [];

        for (let i = 0; i < count; i++) {
          // Clone the loaded lantern model
          const lantern = baseLantern.clone(true);

          // Random position
          lantern.position.set(
            (Math.random() - 0.5) * 40,
            Math.random() * 4 + 4,
            (Math.random() - 0.5) * 40
          );
          lantern.scale.set(0.5, 0.5, 0.5); // adjust size

          // Glow color
          const color = new THREE.Color(0xffa500).offsetHSL(
            0,
            0,
            (Math.random() - 0.5) * 0.1
          );

          // Add a point light inside lantern
          const light = new THREE.PointLight(color, 1.0, 6, 2);
          light.position.set(0, 0.5, 0);
          lantern.add(light);

          // Extra data
          lantern.userData = {
            id: i + 1,
            image: `https://placehold.co/200x150.png?text=Lantern+${i + 1}`,
            text: `lantern ${i + 1}`,
          };

          // Add to scene
          scene.add(lantern);

          lanterns.push({
            mesh: lantern,
            speed: 0.01 + Math.random() * 0.02,
            light: light,
            flickerOffset: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.002,
          });
        }

        resolve(lanterns);
      },
      (xhr) => {
        if (xhr.total) {
          console.log(
            `Lantern model ${((xhr.loaded / xhr.total) * 100).toFixed(
              2
            )}% loaded`
          );
        }
      },
      (err) => {
        console.error('Error loading lantern:', err);
        reject(err);
      }
    );
  });
}
