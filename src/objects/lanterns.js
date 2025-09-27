import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export async function createLanterns(
  scene,
  count = 5, // Default value 5
  modelPath = '/models/lantern.glb',
  dataPath = '/data.json'
) {
  const response = await fetch(dataPath);
  const lanternData = await response.json();

  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    const textureLoader = new THREE.TextureLoader();

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
            Math.random() * 35,
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
          const metadata = lanternData[i % lanternData.length];
          lantern.userData.custom = metadata;

          // Banner
          let banner = null;
          if (metadata.image) {
            const texture = textureLoader.load(metadata.image);
            const bannerGeometry = new THREE.BoxGeometry(2.5, 4, 0.1);
            const bannerMaterial = new THREE.MeshBasicMaterial({
              map: texture,
              transparent: true,
              side: THREE.DoubleSide,
            });

            banner = new THREE.Mesh(bannerGeometry, bannerMaterial);
            banner.position.set(0, -4, 0); // Banner position

            lantern.add(banner);
          }

          // Add to scene
          scene.add(lantern);

          lanterns.push({
            mesh: lantern,
            speed: 0.01 + Math.random() * 0.02,
            light: light,
            flickerOffset: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.002,
            banner: banner,
            swingOffset: Math.random() * Math.PI * 2,
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
