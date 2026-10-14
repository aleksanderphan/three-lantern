import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { CONFIG } from '../config.js';

const rand = (min, max) => min + Math.random() * (max - min);

// Random point in a ring around the tree
function placeInRing(object, y) {
  const { min, max } = CONFIG.lanterns.spawnRadius;
  const angle = Math.random() * Math.PI * 2;
  const radius = Math.sqrt(rand(min * min, max * max)); // even spread over the ring area
  object.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
}

// Invisible box around lantern + banner, used for click/hover raycasts.
// Much cheaper than raycasting the full model and easier to hit.
function createHitboxGeometry(model, banner) {
  const box = new THREE.Box3().setFromObject(model);
  box.union(
    new THREE.Box3(
      new THREE.Vector3(-banner.width / 2, banner.offsetY - banner.height / 2, -0.1),
      new THREE.Vector3(banner.width / 2, banner.offsetY + banner.height / 2, 0.1)
    )
  );
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  return new THREE.BoxGeometry(size.x, size.y, size.z).translate(center.x, center.y, center.z);
}

// Loads lantern data + model, adds `count` lanterns to the scene.
// Returns { lanterns, hitboxes, update(delta, elapsed) }.
export async function createLanterns(scene, manager, count = CONFIG.lanterns.count) {
  const cfg = CONFIG.lanterns;

  const [data, gltf] = await Promise.all([
    new THREE.FileLoader(manager).setResponseType('json').loadAsync(cfg.dataPath),
    new GLTFLoader(manager).loadAsync(cfg.modelPath),
  ]);
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error(`${cfg.dataPath} must be a non-empty array`);
  }

  const baseModel = gltf.scene;
  const textureLoader = new THREE.TextureLoader(manager);
  const bannerGeometry = new THREE.BoxGeometry(cfg.banner.width, cfg.banner.height, 0.1);
  const hitboxGeometry = createHitboxGeometry(baseModel, cfg.banner);
  const hitboxMaterial = new THREE.MeshBasicMaterial();

  const lanterns = [];

  for (let i = 0; i < count; i++) {
    const info = data[i % data.length];

    const group = new THREE.Group();
    group.name = `lantern-${info.id ?? i}`;
    group.scale.setScalar(cfg.scale);
    placeInRing(group, rand(cfg.spawnHeight.min, cfg.maxHeight));

    // Model
    const model = baseModel.clone(true);
    group.add(model);

    // Glow
    const color = new THREE.Color(cfg.color).offsetHSL(0, 0, (Math.random() - 0.5) * 0.1);
    const light = new THREE.PointLight(color, cfg.light.base, cfg.light.distance, cfg.light.decay);
    light.position.y = 0.5;
    group.add(light);

    // Image banner hanging below
    let banner = null;
    if (info.image) {
      banner = new THREE.Mesh(
        bannerGeometry,
        new THREE.MeshBasicMaterial({
          map: textureLoader.load(info.image),
          transparent: true,
          side: THREE.DoubleSide,
        })
      );
      banner.position.y = cfg.banner.offsetY;
      group.add(banner);
    }

    // Click target (not rendered, still raycastable)
    const hitbox = new THREE.Mesh(hitboxGeometry, hitboxMaterial);
    hitbox.visible = false;
    group.add(hitbox);

    const lantern = {
      group,
      light,
      banner,
      hitbox,
      data: info,
      speed: rand(cfg.riseSpeed.min, cfg.riseSpeed.max),
      spin: rand(-cfg.spinSpeed, cfg.spinSpeed),
      flickerOffset: Math.random() * Math.PI * 2,
      swingOffset: Math.random() * Math.PI * 2,
      paused: false, // true while the camera is focused on it
    };
    hitbox.userData.lantern = lantern;

    scene.add(group);
    lanterns.push(lantern);
  }

  function update(delta, elapsed) {
    const t = elapsed * 2;
    const { base, flicker, noise } = cfg.light;

    for (const l of lanterns) {
      // Rise and respawn
      if (!l.paused) {
        l.group.position.y += l.speed * delta;
        if (l.group.position.y > cfg.maxHeight) {
          placeInRing(l.group, rand(cfg.spawnHeight.min, cfg.spawnHeight.max));
        }
        l.group.rotation.y += l.spin * delta;
      }

      // Flicker
      l.light.intensity =
        base + Math.sin(t * 6 + l.flickerOffset) * flicker + (Math.random() - 0.5) * noise;

      // Banner sway
      if (l.banner) {
        l.banner.rotation.z = Math.sin(t * 1.5 + l.swingOffset) * 0.15;
        l.banner.rotation.x = Math.cos(t * 1.2 + l.swingOffset) * 0.05;
      }
    }
  }

  return { lanterns, hitboxes: lanterns.map((l) => l.hitbox), update };
}
