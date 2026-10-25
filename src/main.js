import * as THREE from "three";
import { gsap } from "gsap";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { createLanterns } from "./objects/lanterns.js";
import { createTree } from "./objects/tree.js";
import { createBunnies } from "./objects/bunnies.js";
import { createLandscape } from "./objects/landscape.js";
import { createStars } from "./objects/stars.js";
import { createSky, createHills } from "./objects/sky.js";
import { loadSiteContent, MAX_LANTERNS } from "./site.js";

// ---------------------------------------------------------------------------
// Quality tier: phones/tablets skip shadows + bloom and render at lower DPR.
// ---------------------------------------------------------------------------
const isLowTier =
  window.matchMedia("(pointer: coarse)").matches ||
  Math.min(window.innerWidth, window.innerHeight) < 600 ||
  (navigator.hardwareConcurrency ?? 8) <= 4;

const MAX_DPR = Math.min(window.devicePixelRatio, isLowTier ? 1.5 : 2);
const MIN_DPR = 0.75;
let dpr = MAX_DPR;

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------
const loaderEl = document.getElementById("loader");
const progressEl = document.getElementById("progress-text");
const manager = new THREE.LoadingManager();
let pendingAssets = false;
let onAssetsIdle = null;
manager.onStart = () => (pendingAssets = true);
manager.onProgress = (_url, loaded, total) => {
  progressEl.textContent = `Loading ${Math.round((loaded / total) * 100)}%`;
};
manager.onLoad = () => {
  pendingAssets = false;
  onAssetsIdle?.();
};

async function hideLoader() {
  if (pendingAssets) {
    // Textures are queued after the models resolve; wait for them (capped).
    await new Promise((resolve) => {
      onAssetsIdle = resolve;
      setTimeout(resolve, 4000);
    });
  }
  loaderEl.classList.add("hidden");
  setTimeout(() => loaderEl.remove(), 800);
}

// ---------------------------------------------------------------------------
// Scene, camera, renderer
// ---------------------------------------------------------------------------
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0b1220, 0.006);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
const defaultCamPos = new THREE.Vector3(0, 13, 44);
const defaultTarget = new THREE.Vector3(0, 8.5, 0);
const MIN_DIST = 20;
const MAX_DIST = 80;
camera.position.copy(defaultCamPos);

const renderer = new THREE.WebGLRenderer({
  antialias: false, // MSAA is done on the composer target instead
  powerPreference: "high-performance",
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.shadowMap.enabled = !isLowTier;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.shadowMap.autoUpdate = false; // only static geometry casts; rendered once after load
document.body.appendChild(renderer.domElement);
const maxAnisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), isLowTier ? 2 : 8);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.copy(defaultTarget);
controls.enablePan = false;
controls.enableDamping = true;
controls.minDistance = MIN_DIST;
controls.maxDistance = MAX_DIST;
controls.maxPolarAngle = Math.PI * 0.49;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.25;
// Wheel zoom aims at the cursor, pinch zoom at the midpoint between the fingers. This moves
// the orbit target toward that point, so it's clamped each frame (see the main loop).
controls.zoomToCursor = true;
controls.zoomSpeed = 0.8;
controls.dampingFactor = 0.06;
const TARGET_LIMIT = { radius: 30, minY: 0, maxY: 24 };
const CAMERA_MIN_Y = -3; // keep the camera above the terrain

// ---------------------------------------------------------------------------
// Sky + lights
// ---------------------------------------------------------------------------
createSky(scene, new THREE.Vector3(-0.4, 0.26, -0.85));
createHills(scene);
const stars = createStars(scene, isLowTier ? 1000 : 1800);
const { petals, groundY } = createTree(scene, { petalCount: isLowTier ? 150 : 350 });
const bunnies = createBunnies(scene, { groundY, withLights: !isLowTier });
const landscape = createLandscape(scene, { groundY, quality: isLowTier ? 0.45 : 1 });

// Moonlit night: cool sky bounce from above, dark green-brown bounce from the ground,
// and just a touch of ambient so the shadow side never goes pure black.
scene.add(new THREE.AmbientLight(0x1a2240, 0.6));
scene.add(new THREE.HemisphereLight(0x6f8fd8, 0x1c1a14, 0.9));

// Key light: the moon, placed on its side of the sky (behind and left of the island)
// so the tree throws its shadow toward the camera.
const moonLight = new THREE.DirectionalLight(0xaec6ff, 2.2);
moonLight.position.set(-50, 65, -55);
moonLight.castShadow = !isLowTier;
moonLight.shadow.mapSize.set(2048, 2048);
Object.assign(moonLight.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 10, far: 220 });
moonLight.shadow.bias = -0.0005;
moonLight.shadow.normalBias = 0.05;
scene.add(moonLight);

// Fill from the camera side, dim and slightly cooler/dimmer than the key, so the
// front of the island keeps form instead of silhouetting against the moon.
const fillLight = new THREE.DirectionalLight(0x7f9ae0, 0.5);
fillLight.position.set(30, 25, 50);
scene.add(fillLight);

// Warm glow from the lanterns and picnic lighting up the blossoms from below/inside.
const treeLight = new THREE.PointLight(0xffd9a8, 40, 60, 2);
treeLight.position.set(0, 14, 0);
scene.add(treeLight);

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(300, 48),
  new THREE.MeshStandardMaterial({ color: 0x1b2e2a, roughness: 1, metalness: 0, emissive: 0x08120f }),
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -5.06; // just under the terrain so they never z-fight
floor.receiveShadow = true;
scene.add(floor);

// ---------------------------------------------------------------------------
// Post-processing: render -> (bloom) -> tone map / sRGB
// ---------------------------------------------------------------------------
const composer = new EffectComposer(
  renderer,
  new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: isLowTier ? 2 : 4 }),
);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2), 0.6, 1.0, 1.0);
bloomPass.enabled = !isLowTier;
composer.addPass(bloomPass);
composer.addPass(new OutputPass());

function applyResolution() {
  renderer.setPixelRatio(dpr);
  composer.setPixelRatio(dpr);
  composer.setSize(window.innerWidth, window.innerHeight);
  stars.material.uniforms.pixelRatio.value = dpr;
  petals.material.uniforms.pixelRatio.value = dpr;
  landscape.setPixelRatio(dpr);
}
applyResolution();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  applyResolution();
});

// ---------------------------------------------------------------------------
// Objects (loaded in parallel)
// ---------------------------------------------------------------------------
let lanternSystem = null;

loadSiteContent()
  .then((site) => {
    if (site.title) document.title = site.title;
    // One lantern per photo, no repeats, capped
    const list = site.lanterns.slice(0, MAX_LANTERNS);
    return createLanterns(scene, list.length, list, manager, { maxAnisotropy });
  })
  .then(async (system) => {
    lanternSystem = system;
    renderer.shadowMap.needsUpdate = true; // bake the tree shadow once
    await renderer.compileAsync(scene, camera); // avoid a first-frame shader hitch
  })
  .catch((err) => console.error("Failed to load scene assets:", err))
  .finally(hideLoader);

// ---------------------------------------------------------------------------
// Interaction: click a lantern -> the camera flies in to its hanging scroll
// ---------------------------------------------------------------------------
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const closeBtn = document.getElementById("focusClose");
let focused = null;

function resetCamera() {
  gsap.killTweensOf([camera.position, controls.target]);
  gsap.to(camera.position, { duration: 1.2, ease: "power2.inOut", ...defaultCamPos });
  gsap.to(controls.target, {
    duration: 1.2,
    ease: "power2.inOut",
    ...defaultTarget,
    onComplete: () => {
      controls.minDistance = MIN_DIST;
      controls.autoRotate = true;
    },
  });
}

function closeFocus() {
  if (!focused) return;
  const item = focused;
  focused = null;
  item.paused = false;
  closeBtn.classList.remove("show");
  document.body.classList.remove("focused");
  resetCamera();
}

closeBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  closeFocus();
});
window.addEventListener("keydown", (e) => e.key === "Escape" && closeFocus());

function focusLantern(item) {
  if (focused && focused !== item) {
    focused.paused = false;
  }
  focused = item;
  item.paused = true; // hold it still; the scroll stays attached to the lantern in 3D
  controls.autoRotate = false;
  controls.minDistance = 0;
  closeBtn.classList.add("show");
  document.body.classList.add("focused");

  // Stand in front of the scroll, far enough that it fills ~72% of the view height
  // (and at most 88% of the width on narrow screens). The target sits a little above
  // the scroll's centre so the strings that hold it stay visible at the top.
  // Lanterns spin as they drift, so turn this one to show its scroll to the camera first.
  const mesh = item.mesh;
  const startYaw = mesh.rotation.y;
  const turn = Math.atan2(camera.position.x - mesh.position.x, camera.position.z - mesh.position.z) - startYaw;
  const wrapped = Math.atan2(Math.sin(turn), Math.cos(turn)); // shortest way round
  mesh.rotation.y = startYaw + wrapped;
  const { center, normal, width, height } = item.cardPose();
  mesh.rotation.y = startYaw;
  gsap.killTweensOf(mesh.rotation);
  gsap.to(mesh.rotation, { duration: 1.2, ease: "power2.inOut", y: startYaw + wrapped });
  item.sharpen();
  const tanHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
  const dist = Math.max(height / (0.72 * 2 * tanHalf), width / (0.88 * 2 * tanHalf * camera.aspect));
  const lift = new THREE.Vector3(0, height * 0.08, 0);
  const target = center.clone().add(lift);
  const camPos = center.clone().addScaledVector(normal, dist).add(lift);

  gsap.killTweensOf([camera.position, controls.target]);
  gsap.to(controls.target, { duration: 1.6, ease: "power2.inOut", x: target.x, y: target.y, z: target.z });
  gsap.to(camera.position, { duration: 1.6, ease: "power2.inOut", x: camPos.x, y: camPos.y, z: camPos.z });
}

// Tell a click from an orbit drag so rotating the view never triggers anything.
let downX = 0;
let downY = 0;
renderer.domElement.addEventListener("pointerdown", (e) => {
  downX = e.clientX;
  downY = e.clientY;
});
renderer.domElement.addEventListener("pointerup", (e) => {
  if (!lanternSystem || Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return;
  pointer.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(lanternSystem.pickables, true)[0];

  if (focused) {
    // While zoomed in, clicking anywhere except the scroll itself backs out
    if (!hit || hit.object !== focused.bannerCard) closeFocus();
    return;
  }
  if (!hit) return;
  let root = hit.object;
  while (root && !root.userData.custom) root = root.parent;
  const item = lanternSystem.items.find((it) => it.mesh === root);
  if (item) focusLantern(item);
});
controls.addEventListener("start", () => (controls.autoRotate = false));

// ---------------------------------------------------------------------------
// Main loop with adaptive resolution
// ---------------------------------------------------------------------------
const clock = new THREE.Clock();
let avgFrame = 16;
let sinceAdjust = 0;

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.1);
  const t = clock.elapsedTime;

  stars.material.uniforms.time.value = t;
  petals.material.uniforms.time.value = t;
  bunnies.update(t);
  landscape.update(t);
  lanternSystem?.update(dt, t, camera);
  controls.update(dt);
  if (!focused) {
    // Zooming toward a point shifts the orbit target; keep it near the island, and ease it
    // back toward the centre as the user zooms out so the default framing is always reachable.
    const tg = controls.target;
    const r = Math.hypot(tg.x, tg.z);
    if (r > TARGET_LIMIT.radius) {
      tg.x *= TARGET_LIMIT.radius / r;
      tg.z *= TARGET_LIMIT.radius / r;
    }
    tg.y = THREE.MathUtils.clamp(tg.y, TARGET_LIMIT.minY, TARGET_LIMIT.maxY);
    const zoomedOut = THREE.MathUtils.smoothstep(camera.position.distanceTo(tg), MAX_DIST * 0.6, MAX_DIST);
    if (zoomedOut > 0 && !gsap.isTweening(tg)) {
      tg.lerp(defaultTarget, 1 - Math.exp(-dt * 3 * zoomedOut));
    }
    if (camera.position.y < CAMERA_MIN_Y) camera.position.y = CAMERA_MIN_Y;
  }
  composer.render();

  // Moving average of frame time; trade resolution for smoothness.
  avgFrame += (dt * 1000 - avgFrame) * 0.05;
  sinceAdjust += dt;
  if (sinceAdjust > 2) {
    sinceAdjust = 0;
    if (avgFrame > 24 && dpr > MIN_DPR) {
      dpr = Math.max(MIN_DPR, dpr - 0.25);
      applyResolution();
    } else if (avgFrame < 14 && dpr < MAX_DPR) {
      dpr = Math.min(MAX_DPR, dpr + 0.25);
      applyResolution();
    }
  }
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .catch((err) => console.error("Service worker registration failed:", err));
  });
}
