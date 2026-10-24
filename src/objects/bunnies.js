import * as THREE from "three";

// A small picnic under the tree: two bunnies, dango, and stone lanterns that light them.
// Everything is procedural and shares a handful of geometries/materials.

const sphereGeo = new THREE.SphereGeometry(1, 18, 14); // unit sphere, scaled per use
const earGeo = new THREE.CapsuleGeometry(0.1, 0.46, 4, 10);
const stickGeo = new THREE.CylinderGeometry(0.018, 0.018, 1.1, 6);

const mats = {};
function mat(key, params) {
  return (mats[key] ??= new THREE.MeshStandardMaterial({ roughness: 0.9, ...params }));
}
const furMat = (hex) => mat(`fur${hex}`, { color: hex, emissive: hex, emissiveIntensity: 0.12 });
const innerEarMat = () => mat("ear", { color: 0xf7a8bd, emissive: 0xf7a8bd, emissiveIntensity: 0.15 });
const eyeMat = () => mat("eye", { color: 0x1a1216, roughness: 0.25 });
const noseMat = () => mat("nose", { color: 0xf48fb1 });
const cheekMat = () => mat("cheek", { color: 0xffb3c6, transparent: true, opacity: 0.7 });
const woodMat = () => mat("wood", { color: 0x9a6b3d });
const DANGO = [0xf6a5c0, 0xfff7ee, 0xa7d28d]; // hanami dango: pink, white, green
const dangoMat = (i) => mat(`dango${i}`, { color: DANGO[i % 3], roughness: 0.55, emissive: DANGO[i % 3], emissiveIntensity: 0.1 });

function blob(geo, material, x, y, z, sx, sy = sx, sz = sx) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  m.castShadow = true;
  return m;
}

function createBunny({ fur = 0xfff4ea, lop = 0, scale = 1 }) {
  const g = new THREE.Group();
  const body = blob(sphereGeo, furMat(fur), 0, 0.46, 0, 0.5, 0.47, 0.54);
  const tail = blob(sphereGeo, furMat(0xffffff), 0, 0.42, -0.5, 0.15);
  const feet = [-1, 1].map((s) => blob(sphereGeo, furMat(fur), s * 0.3, 0.1, 0.15, 0.13, 0.09, 0.24));
  const paws = [-1, 1].map((s) => blob(sphereGeo, furMat(fur), s * 0.17, 0.13, 0.45, 0.09, 0.08, 0.12));

  const nose = blob(sphereGeo, noseMat(), 0, -0.04, 0.37, 0.045, 0.035, 0.035);

  // Head group so it can turn independently
  const head = new THREE.Group();
  head.position.set(0, 1.03, 0.2);
  head.add(
    blob(sphereGeo, furMat(fur), 0, 0, 0, 0.4, 0.36, 0.38),
    ...[-1, 1].map((s) => blob(sphereGeo, eyeMat(), s * 0.17, 0.05, 0.33, 0.05)),
    nose,
    ...[-1, 1].map((s) => blob(sphereGeo, cheekMat(), s * 0.27, -0.06, 0.28, 0.07, 0.05, 0.03)),
  );

  // Ears pivot at the base so they can twitch
  const ears = [-1, 1].map((s) => {
    const pivot = new THREE.Group();
    pivot.position.set(s * 0.16, 0.28, -0.02);
    const outer = new THREE.Mesh(earGeo, furMat(fur));
    outer.position.y = 0.3;
    outer.castShadow = true;
    const inner = new THREE.Mesh(earGeo, innerEarMat());
    inner.position.set(0, 0.3, 0.035);
    inner.scale.set(0.55, 0.9, 0.4);
    pivot.add(outer, inner);
    pivot.rotation.z = -s * (0.14 + lop * 1.1); // lop-eared bunnies droop outwards
    pivot.rotation.x = lop * 0.5;
    head.add(pivot);
    return pivot;
  });

  g.add(body, tail, ...feet, ...paws, head);
  g.scale.setScalar(scale);
  return { group: g, body, head, ears, tail, nose, feet };
}

function createSkewer(n = 3) {
  const g = new THREE.Group();
  const stick = new THREE.Mesh(stickGeo, woodMat());
  stick.position.y = 0.2;
  g.add(stick);
  for (let i = 0; i < n; i++) g.add(blob(sphereGeo, dangoMat(i), 0, 0.28 + i * 0.27, 0, 0.14));
  return g;
}

function createDangoPlate() {
  const g = new THREE.Group();
  const plate = new THREE.Mesh(
    new THREE.CylinderGeometry(0.85, 0.7, 0.1, 24),
    mat("plate", { color: 0xe9dcc6, roughness: 0.5 }),
  );
  plate.position.y = 0.05;
  plate.castShadow = true;
  plate.receiveShadow = true;
  g.add(plate);
  const ball = 0.17;
  [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3], [0, 0]].forEach(([x, z], i) =>
    g.add(blob(sphereGeo, dangoMat(i), x, 0.1 + ball, z, ball)),
  );
  g.add(blob(sphereGeo, dangoMat(1), 0, 0.1 + ball * 2.6, 0, ball));
  return g;
}

export function createStoneLantern(glowMap) {
  const g = new THREE.Group();
  const stone = mat("stone", { color: 0x6b6b78, roughness: 1, flatShading: true });
  const add = (geo, y, m = stone) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.y = y;
    mesh.castShadow = true;
    g.add(mesh);
    return mesh;
  };
  add(new THREE.CylinderGeometry(0.42, 0.5, 0.18, 6), 0.09); // base
  add(new THREE.CylinderGeometry(0.13, 0.16, 0.7, 6), 0.53); // pillar
  add(new THREE.CylinderGeometry(0.36, 0.28, 0.14, 6), 0.95); // seat
  const chamber = add(
    new THREE.BoxGeometry(0.46, 0.46, 0.46),
    1.25,
    new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff9a2e).multiplyScalar(1.7) }),
  );
  const roof = add(new THREE.ConeGeometry(0.58, 0.4, 4), 1.68);
  roof.rotation.y = Math.PI / 4;
  add(new THREE.SphereGeometry(0.08, 8, 6), 1.93);
  // Dark window frame lines so the chamber reads as a lantern, not a lamp
  const frame = mat("frame", { color: 0x3a2a22 });
  for (const s of [-1, 1]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.48, 0.48), frame);
    bar.position.set(s * 0.12, 1.25, 0);
    g.add(bar);
  }

  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowMap,
      color: 0xffa040,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
      opacity: 0.8,
    }),
  );
  glow.scale.setScalar(3.4);
  glow.position.y = 1.25;
  g.add(glow);
  return { group: g, glow, chamber };
}

export function radialGlow() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d");
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,190,90,1)");
  grad.addColorStop(0.35, "rgba(255,140,40,0.35)");
  grad.addColorStop(1, "rgba(255,120,20,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * @param groundY world height of the island's top surface
 * @returns {{ group: THREE.Group, update: (time: number) => void }}
 */
export function createBunnies(scene, { groundY = -4, withLights = true, scale = 2.4 } = {}) {
  const group = new THREE.Group();
  group.position.y = groundY + 0.02;
  group.scale.setScalar(scale); // layout below is authored at 1x; scaled to suit the big tree
  const glowMap = radialGlow();

  const bunnies = [
    { x: -1.7, z: 2.6, rot: 0.35, opts: { fur: 0xfff4ea, scale: 1.15 }, holdsDango: true },
    { x: 2.1, z: 2.5, rot: -0.55, opts: { fur: 0xe9cfae, scale: 0.85 } },
  ].map((b, i) => {
    const bunny = createBunny(b.opts);
    bunny.group.position.set(b.x, 0, b.z);
    bunny.group.rotation.y = b.rot;
    if (b.holdsDango) {
      const skewer = createSkewer(3);
      skewer.position.set(0.3, 0.42, 0.5);
      skewer.rotation.set(-0.35, 0, -0.22);
      bunny.group.add(skewer);
    }
    bunny.phase = i * 1.7;
    group.add(bunny.group);
    return bunny;
  });

  // Dango on a plate between the bunnies, plus skewers standing in the ground
  const plate = createDangoPlate();
  plate.position.set(0.3, 0, 2.0);
  group.add(plate);
  for (const [x, z, r] of [[-0.8, 1.5, 0.12], [1.2, 1.5, -0.1], [-3.0, 2.0, 0.08]]) {
    const s = createSkewer(3);
    s.position.set(x, 0, z);
    s.rotation.z = r;
    group.add(s);
  }

  // Stone lanterns that light the bunnies; two carry a real light, the third is glow-only
  const lamps = [
    { x: -3.6, z: 3.4, light: true },
    { x: 3.7, z: 3.2, light: true },
    { x: 1.8, z: 0.9, light: false },
  ].map((p, i) => {
    const lamp = createStoneLantern(glowMap);
    lamp.group.position.set(p.x, 0, p.z);
    lamp.phase = i * 2.3;
    if (p.light && withLights) {
      lamp.light = new THREE.PointLight(0xffa050, 90, 30, 2);
      lamp.light.position.set(0, 1.35, 0);
      lamp.group.add(lamp.light);
    }
    group.add(lamp.group);
    return lamp;
  });

  group.traverse((o) => {
    if (o.isMesh && !o.material.isMeshBasicMaterial) o.receiveShadow = true;
  });
  scene.add(group);

  function update(t) {
    for (const b of bunnies) {
      const breathe = Math.sin(t * 2 + b.phase);
      b.body.scale.y = 0.47 * (1 + breathe * 0.02);
      b.head.rotation.y = Math.sin(t * 0.5 + b.phase) * 0.22;
      // occasional ear flick
      const flick = Math.max(0, Math.sin(t * 0.7 + b.phase * 3) - 0.9) * 3;
      b.ears[0].rotation.x = flick * 0.6;
      b.ears[1].rotation.x = flick * 0.4;

      // Nose twitch: constant fast little wiggle, stronger in short bursts
      const burst = 0.4 + 0.6 * Math.max(0, Math.sin(t * 0.9 + b.phase * 2));
      b.nose.scale.y = 0.035 * (1 + Math.sin(t * 16 + b.phase) * 0.25 * burst);

      // Tail wiggle in occasional bursts
      const wag = Math.max(0, Math.sin(t * 0.45 + b.phase * 5) - 0.6) * 2.5;
      b.tail.rotation.z = Math.sin(t * 22) * 0.5 * wag;
      b.tail.position.x = Math.sin(t * 22) * 0.04 * wag;

      // Nibble: head dips with quick chews for a moment, otherwise a lazy nod
      const nibble = Math.max(0, Math.sin(t * 0.35 + b.phase * 4) - 0.55) * 2.2;
      b.head.rotation.x = Math.sin(t * 0.8 + b.phase) * 0.04 + nibble * (0.12 + Math.sin(t * 14) * 0.05);

      // Tiny hop every ~8s, with a little squash before leaving the ground
      const cycle = (t + b.phase * 2.1) % 8;
      let hop = 0;
      let squash = 0;
      if (cycle < 0.25) squash = Math.sin((cycle / 0.25) * Math.PI) * 0.08;
      else if (cycle < 0.85) hop = Math.sin(((cycle - 0.25) / 0.6) * Math.PI) * 0.16;
      b.group.position.y = hop;
      b.body.scale.y *= 1 - squash;
    }
    for (const l of lamps) {
      const f = 0.85 + Math.sin(t * 7 + l.phase) * 0.08 + Math.sin(t * 17 + l.phase * 2) * 0.05;
      l.glow.material.opacity = f * 0.75;
      if (l.light) l.light.intensity = 90 * f;
    }
  }

  return { group, update };
}
