// Scene tunables. Change values here rather than in the modules.

export const CONFIG = {
  // Scene
  background: 0x0d203d,
  fog: { color: 0x0b0c2a, density: 0.015 },
  floorY: -5,

  // Camera & controls
  camera: {
    fov: 60,
    near: 0.1,
    far: 1000,
    position: [0, 12, 35],
    target: [0, 5, 0],
    minDistance: 20,
    maxDistance: 40,
    autoRotateSpeed: 0.25,
  },

  // Camera fly-to when a lantern is clicked
  focus: {
    distance: 5, // camera distance out from the lantern (away from the tree)
    height: 2, // camera height above the lantern
    duration: 1.5, // seconds
    resetDuration: 1.0,
  },

  // Lanterns
  lanterns: {
    count: 10,
    modelPath: '/models/lantern.glb',
    dataPath: '/data.json',
    scale: 0.5,
    color: 0xffa500,
    spawnRadius: { min: 6, max: 20 }, // ring around the tree
    spawnHeight: { min: 4, max: 6 },
    maxHeight: 20, // respawn above this
    riseSpeed: { min: 0.6, max: 1.8 }, // units per second
    spinSpeed: 1.5, // max radians per second (either direction)
    light: { base: 30, flicker: 3, noise: 5, distance: 6, decay: 2 },
    banner: { width: 2.5, height: 4, offsetY: -4 },
  },

  // Tree
  tree: {
    modelPath: '/models/sakura_tree.glb',
    scale: 100,
  },

  // Stars
  stars: { count: 3000, spread: 800, height: 400 },

  // Post-processing
  bloom: { strength: 0.5, radius: 1.8, threshold: 0.85 },
  colorShift: { amount: 0.02, speed: 1.0 },

  maxPixelRatio: 2,
};
