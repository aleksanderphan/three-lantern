import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  MeshStandardMaterial,
  Color,
  PointLight,
  AmbientLight,
  HemisphereLight,
  TextureLoader,
  BackSide,
  SphereGeometry,
  Mesh,
} from 'three';

export function loadTree(scene, path = '/models/cherry_tree.glb') {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();

    loader.load(
      path,
      (gltf) => {
        const tree = gltf.scene;

        // Make the tree bigger
        tree.scale.set(5, 5, 5);
        tree.position.set(0, -5, 0);

        // 🌌 Night sky background (large sphere around the scene)
        const textureLoader = new TextureLoader();
        textureLoader.load('/textures/stars.jpg', (starsTexture) => {
          const skyGeo = new SphereGeometry(200, 64, 64);
          const skyMat = new MeshStandardMaterial({
            map: starsTexture,
            side: BackSide,
          });
          const sky = new Mesh(skyGeo, skyMat);
          scene.add(sky);
        });

        // 🌙 Moonlight (bluish ambient)
        const ambient = new AmbientLight(0x334466, 0.4);
        scene.add(ambient);

        // 🌌 Subtle hemisphere light (sky = blue, ground = dark)
        const hemiLight = new HemisphereLight(0x223366, 0x000000, 0.3);
        scene.add(hemiLight);

        // 🔦 Point light near tree (like lantern/moon glow)
        const light = new PointLight(0xffffff, 100, 50);
        light.position.set(0, 10, 10);
        scene.add(light);

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
