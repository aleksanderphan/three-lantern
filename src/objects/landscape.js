import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { taperedTube, mulberry32, FLOOR_Y } from "./tree.js";
import { createStoneLantern, radialGlow } from "./bunnies.js";

// Everything that fills the world around the island: rolling terrain, a stone path with a
// torii gate, a moonlit pond, distant sakura trees, rocks, swaying grass, flowers and fireflies.
// All scatter is instanced (one draw call per kind) and kept clear of the camera's view of
// the tree, the bunnies and the floating lanterns.

const { smoothstep } = THREE.MathUtils;

const POND = { x: 20, z: 15, r: 8 };
const PATH_POINTS = [
  [1.5, 33], [-3.5, 27], [2, 21.5], [0, 17], [-1.5, 11.5],
].map(([x, z]) => new THREE.Vector3(x, 0, z));
const ISLAND_R = 13.8;

/** Height of the terrain at (x, z). Flat around the island, rolling hills further out. */
export function terrainY(x, z) {
  const r = Math.hypot(x, z);
  const n =
    Math.sin(x * 0.07 + 1.3) * Math.cos(z * 0.06) * 0.55 +
    Math.sin(x * 0.15 + z * 0.11) * 0.28 +
    Math.sin(z * 0.21 - x * 0.09) * 0.17;
  const amp = smoothstep(r, 28, 75) * (1 - smoothstep(r, 105, 125)) * 9;
  return FLOOR_Y + (n + 0.4) * amp;
}

function colorGeometry(g, hex) {
  if (g.index) g = g.toNonIndexed();
  g.deleteAttribute("uv");
  const c = new THREE.Color(hex);
  const a = new Float32Array(g.attributes.position.count * 3);
  for (let i = 0; i < a.length; i += 3) a.set([c.r, c.g, c.b], i);
  g.setAttribute("color", new THREE.BufferAttribute(a, 3));
  return g;
}

// ---------------------------------------------------------------------------
// Terrain
// ---------------------------------------------------------------------------
function buildTerrain() {
  const g = new THREE.PlaneGeometry(260, 260, 120, 120).rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  const colors = new Float32Array(p.count * 3);
  const a = new THREE.Color(0x25493c);
  const b = new THREE.Color(0x1a3a34);
  const lawn = new THREE.Color(0x336348);
  const edge = new THREE.Color(0x1b2e2a); // matches the floor disc beyond the terrain
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const z = p.getZ(i);
    const r = Math.hypot(x, z);
    p.setY(i, terrainY(x, z));
    const t = 0.5 + 0.5 * Math.sin(x * 0.31 + Math.cos(z * 0.23) * 2) * Math.sin(z * 0.27 - x * 0.05);
    c.copy(a).lerp(b, t).lerp(lawn, 1 - smoothstep(r, 14, 40));
    c.lerp(edge, smoothstep(r, 95, 130));
    colors.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  g.computeVertexNormals();
  const mesh = new THREE.Mesh(
    g,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, emissive: 0x08140f }),
  );
  mesh.receiveShadow = true;
  return mesh;
}

// ---------------------------------------------------------------------------
// Placement helpers
// ---------------------------------------------------------------------------
const pathCurve = new THREE.CatmullRomCurve3(PATH_POINTS);
const pathSamples = pathCurve.getPoints(80);

function distToPath(x, z) {
  let d = Infinity;
  for (const s of pathSamples) d = Math.min(d, Math.hypot(s.x - x, s.z - z));
  return d;
}
const inPond = (x, z, pad = 1.5) => Math.hypot(x - POND.x, z - POND.z) < POND.r + pad;
const onIsland = (x, z) => Math.hypot(x, z) < ISLAND_R;
// The patch of island the bunnies and their lanterns occupy
const inBunnyZone = (x, z) => x > -11 && x < 11 && z > 0 && z < 11;

function scatter(rand, count, accept, sample) {
  const out = [];
  for (let tries = 0; out.length < count && tries < count * 40; tries++) {
    const [x, z] = sample();
    if (accept(x, z, out)) out.push({ x, z });
  }
  return out;
}
const ring = (rand, rMin, rMax) => () => {
  const a = rand() * Math.PI * 2;
  const r = Math.sqrt(rMin * rMin + rand() * (rMax * rMax - rMin * rMin));
  return [Math.cos(a) * r, Math.sin(a) * r];
};

// ---------------------------------------------------------------------------
// Distant sakura trees (one merged geometry, instanced)
// ---------------------------------------------------------------------------
function buildMiniTreeGeometry(seed) {
  const rand = mulberry32(seed);
  const parts = [];
  const v = (x, y, z) => new THREE.Vector3(x, y, z);
  const trunk = [v(0, 0, 0), v(0.35, 2, 0.1), v(-0.1, 3.8, 0.25), v(0.2, 5, 0)];
  parts.push(colorGeometry(taperedTube(trunk, 0.4, 0.15, 6), 0x4a3328));

  const anchors = [v(0.2, 5.2, 0)];
  for (let k = 0; k < 3; k++) {
    const az = k * 2.1 + rand();
    const base = trunk[2].clone();
    const tip = base.clone().add(v(Math.cos(az) * 2.4, 1.5 + rand(), Math.sin(az) * 2.4));
    const mid = base.clone().lerp(tip, 0.5).add(v(0, 0.5, 0));
    parts.push(colorGeometry(taperedTube([base, mid, tip], 0.17, 0.07, 5), 0x4a3328));
    anchors.push(tip);
  }
  const pinks = [0xffb7c5, 0xff9fb5, 0xffd1dc, 0xf48fb1];
  for (const a of anchors) {
    for (let i = 0; i < 3; i++) {
      const r = 1.1 + rand() * 0.9;
      const blob = new THREE.IcosahedronGeometry(1, 1);
      blob.scale(r, r * 0.75, r);
      blob.translate(a.x + (rand() - 0.5) * 1.8, a.y + rand() * 0.8, a.z + (rand() - 0.5) * 1.8);
      parts.push(colorGeometry(blob, pinks[Math.floor(rand() * pinks.length)]));
    }
  }
  const merged = mergeGeometries(parts, false);
  parts.forEach((g) => g.dispose());
  return merged;
}

function buildMiniTrees(rand, count) {
  const mesh = new THREE.InstancedMesh(
    buildMiniTreeGeometry(11),
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, emissive: 0x4a1a2c, emissiveIntensity: 0.7 }),
    count,
  );
  // Behind and to the sides of the island; the front sector (path, pond, camera) stays open
  const spots = scatter(
    rand,
    count,
    (x, z, placed) =>
      !(z > 6 && Math.abs(x) < 46) &&
      !inPond(x, z, 6) &&
      placed.every((p) => Math.hypot(p.x - x, p.z - z) > 11),
    ring(rand, 34, 100),
  );
  mesh.count = spots.length;
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  spots.forEach(({ x, z }, i) => {
    const s = 1.6 + rand() * 1.8;
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * Math.PI * 2);
    mesh.setMatrixAt(i, m.compose(new THREE.Vector3(x, terrainY(x, z) - 0.2, z), q, new THREE.Vector3(s, s, s)));
  });
  mesh.castShadow = true;
  return mesh;
}

// ---------------------------------------------------------------------------
// Rocks, grass, flowers
// ---------------------------------------------------------------------------
function buildRocks(rand, count, groundY) {
  const mesh = new THREE.InstancedMesh(
    new THREE.DodecahedronGeometry(1, 0),
    new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }),
    count,
  );
  const spots = scatter(rand, Math.floor(count * 0.7), (x, z) => !inPond(x, z, -2) && distToPath(x, z) > 2.5 && !(z > 4 && Math.abs(x) < 20 && Math.hypot(x, z) > 40), ring(rand, 14, 75));
  // A necklace of rocks around the pond edge
  for (let i = 0; spots.length < count; i++) {
    const a = (i / 12) * Math.PI * 2 + rand() * 0.3;
    spots.push({ x: POND.x + Math.cos(a) * (POND.r + 0.2), z: POND.z + Math.sin(a) * (POND.r + 0.2) });
  }
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const col = new THREE.Color();
  spots.slice(0, count).forEach(({ x, z }, i) => {
    const s = 0.4 + Math.pow(rand(), 2) * 1.5;
    const y = onIsland(x, z) ? groundY : terrainY(x, z);
    q.setFromEuler(e.set(rand() * 0.6, rand() * 6, rand() * 0.6));
    mesh.setMatrixAt(i, m.compose(new THREE.Vector3(x, y + s * 0.15, z), q, new THREE.Vector3(s * 1.2, s * 0.7, s)));
    mesh.setColorAt(i, col.setHex(0x59606e).offsetHSL(0, 0, (rand() - 0.5) * 0.08));
  });
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  return mesh;
}

function buildGrass(rand, count, groundY, timeUniform) {
  const geo = new THREE.ConeGeometry(0.11, 1, 4, 1).translate(0, 0.5, 0);
  const mat = new THREE.MeshStandardMaterial({ roughness: 1, emissive: 0x0b2a18 });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = timeUniform;
    shader.vertexShader =
      "uniform float uTime;\n" +
      shader.vertexShader.replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        #ifdef USE_INSTANCING
          float ph = instanceMatrix[3].x * 0.35 + instanceMatrix[3].z * 0.27;
          transformed.x += sin(uTime * 1.6 + ph) * 0.2 * position.y;
          transformed.z += cos(uTime * 1.3 + ph) * 0.14 * position.y;
        #endif`,
      );
  };
  const mesh = new THREE.InstancedMesh(geo, mat, count);

  const onIslandCount = Math.floor(count * 0.12);
  const island = scatter(rand, onIslandCount, (x, z) => !inBunnyZone(x, z), ring(rand, 0, ISLAND_R - 1.5));
  const field = scatter(
    rand,
    count - island.length,
    (x, z) => !onIsland(x, z) && !inPond(x, z) && distToPath(x, z) > 1.6,
    ring(rand, ISLAND_R + 0.3, 62),
  );
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const col = new THREE.Color();
  const greens = [0x2f7a4a, 0x3f8f55, 0x5aa86a, 0x2a8a72];
  [...island.map((s) => ({ ...s, y: groundY })), ...field.map((s) => ({ ...s, y: terrainY(s.x, s.z) }))].forEach((s, i) => {
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * 6);
    const h = 0.7 + rand() * 1.1;
    mesh.setMatrixAt(i, m.compose(new THREE.Vector3(s.x, s.y - 0.05, s.z), q, new THREE.Vector3(1 + rand(), h, 1 + rand())));
    mesh.setColorAt(i, col.setHex(greens[Math.floor(rand() * greens.length)]).offsetHSL(0, 0, (rand() - 0.5) * 0.08));
  });
  mesh.count = island.length + field.length;
  return mesh;
}

function buildFlowers(rand, count, groundY) {
  const mesh = new THREE.InstancedMesh(
    new THREE.SphereGeometry(1, 7, 5),
    new THREE.MeshStandardMaterial({ roughness: 0.7, emissive: 0xffffff, emissiveIntensity: 0.25 }),
    count,
  );
  const spots = [
    ...scatter(rand, Math.floor(count * 0.2), (x, z) => !inBunnyZone(x, z), ring(rand, 0, ISLAND_R - 1.5)),
    ...scatter(rand, Math.floor(count * 0.8), (x, z) => !onIsland(x, z) && !inPond(x, z) && distToPath(x, z) > 1.4, ring(rand, ISLAND_R + 0.3, 50)),
  ];
  const palette = [0xffd1dc, 0xffffff, 0xffe27a, 0xf48fb1, 0xc9b6ff];
  const m = new THREE.Matrix4();
  const col = new THREE.Color();
  spots.forEach(({ x, z }, i) => {
    const s = 0.11 + rand() * 0.07;
    const y = onIsland(x, z) ? groundY : terrainY(x, z);
    mesh.setMatrixAt(i, m.compose(new THREE.Vector3(x, y + 0.28, z), new THREE.Quaternion(), new THREE.Vector3(s, s, s)));
    mesh.setColorAt(i, col.setHex(palette[Math.floor(rand() * palette.length)]));
  });
  mesh.count = spots.length;
  return mesh;
}

// ---------------------------------------------------------------------------
// Path, torii gate, pond
// ---------------------------------------------------------------------------
function buildPath(rand) {
  const stones = Math.floor(pathCurve.getLength() / 1.5);
  const mesh = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.75, 0.85, 0.14, 7),
    new THREE.MeshStandardMaterial({ roughness: 0.95, flatShading: true }),
    stones,
  );
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const col = new THREE.Color();
  for (let i = 0; i < stones; i++) {
    const t = i / (stones - 1);
    const p = pathCurve.getPointAt(t);
    const tan = pathCurve.getTangentAt(t);
    const side = new THREE.Vector3(-tan.z, 0, tan.x).multiplyScalar((rand() - 0.5) * 0.9);
    const x = p.x + side.x;
    const z = p.z + side.z;
    const y = onIsland(x, z) ? terrainY(0, 0) + 1.5 : terrainY(x, z);
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * 3);
    const s = 0.85 + rand() * 0.45;
    mesh.setMatrixAt(i, m.compose(new THREE.Vector3(x, y + 0.04, z), q, new THREE.Vector3(s, 1, s)));
    mesh.setColorAt(i, col.setHex(0x8d93a2).offsetHSL(0, 0, (rand() - 0.5) * 0.07));
  }
  mesh.receiveShadow = true;
  return mesh;
}

function buildTorii(x, y, z, scale = 1) {
  const g = new THREE.Group();
  const red = new THREE.MeshStandardMaterial({ color: 0xb3261e, roughness: 0.6, emissive: 0x3a0a08, emissiveIntensity: 0.5 });
  const black = new THREE.MeshStandardMaterial({ color: 0x1b1418, roughness: 0.7 });
  const H = 8;
  const S = 7;
  const base = 0;
  for (const s of [-1, 1]) {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.52, H, 10), red);
    pillar.position.set(s * S, base + H / 2, 0);
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.68, 0.5, 10), black);
    foot.position.set(s * S, base + 0.2, 0);
    g.add(pillar, foot);
  }
  const nuki = new THREE.Mesh(new THREE.BoxGeometry(S * 2 + 0.6, 0.38, 0.4), red);
  nuki.position.set(0, base + H - 2.2, 0);
  const kasagi = new THREE.Mesh(new THREE.BoxGeometry(S * 2 + 3.2, 0.55, 0.9), black);
  kasagi.position.set(0, base + H + 0.15, 0);
  const shimaki = new THREE.Mesh(new THREE.BoxGeometry(S * 2 + 2, 0.45, 0.7), red);
  shimaki.position.set(0, base + H - 0.4, 0);
  g.add(nuki, kasagi, shimaki);
  g.position.set(x, y, z);
  g.scale.setScalar(scale);
  g.traverse((o) => {
    if (o.isMesh) o.castShadow = true;
  });
  return g;
}

function buildPond() {
  const size = 256;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  const base = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  base.addColorStop(0, "#143a52");
  base.addColorStop(1, "#0b2236");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  // Moon reflection: a soft vertical streak on the far side of the pond
  const streak = ctx.createRadialGradient(size * 0.3, size * 0.3, 0, size * 0.3, size * 0.3, size * 0.32);
  streak.addColorStop(0, "rgba(235,240,255,0.85)");
  streak.addColorStop(0.4, "rgba(170,200,255,0.35)");
  streak.addColorStop(1, "rgba(120,160,230,0)");
  ctx.save();
  ctx.translate(size * 0.3, size * 0.3);
  ctx.scale(0.7, 1.5);
  ctx.translate(-size * 0.3, -size * 0.3);
  ctx.fillStyle = streak;
  ctx.fillRect(0, 0, size, size);
  ctx.restore();
  ctx.strokeStyle = "rgba(200,225,255,0.18)";
  for (let i = 0; i < 9; i++) {
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(size * 0.3, size * 0.3, 14 + i * 9, 5 + i * 3.5, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;

  const group = new THREE.Group();
  const water = new THREE.Mesh(
    new THREE.CircleGeometry(POND.r, 48).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ map: tex }),
  );
  water.position.set(POND.x, FLOOR_Y + 0.18, POND.z);
  group.add(water);

  // Lily pads and a few pink lotus blooms
  const padGeo = new THREE.CircleGeometry(0.6, 10).rotateX(-Math.PI / 2);
  const padMat = new THREE.MeshStandardMaterial({ color: 0x2f7a4a, roughness: 0.8, side: THREE.DoubleSide });
  const bloomMat = new THREE.MeshStandardMaterial({ color: 0xffb7c5, emissive: 0xff9fb5, emissiveIntensity: 0.5 });
  const rand = mulberry32(5);
  for (let i = 0; i < 9; i++) {
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(rand()) * (POND.r - 1.5);
    const pad = new THREE.Mesh(padGeo, padMat);
    pad.position.set(POND.x + Math.cos(a) * r, FLOOR_Y + 0.22, POND.z + Math.sin(a) * r);
    pad.scale.setScalar(0.8 + rand() * 0.8);
    group.add(pad);
    if (i % 3 === 0) {
      const bloom = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), bloomMat);
      bloom.scale.y = 0.7;
      bloom.position.set(pad.position.x, FLOOR_Y + 0.4, pad.position.z);
      group.add(bloom);
    }
  }
  return group;
}

// ---------------------------------------------------------------------------
// Fireflies
// ---------------------------------------------------------------------------
function buildFireflies(rand, count) {
  const pos = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const [x, z] = ring(rand, 12, 55)();
    pos.set([x, terrainY(x, z) + 0.8 + rand() * 4, z], i * 3);
    seed[i] = rand();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("seed", new THREE.BufferAttribute(seed, 1));
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { time: { value: 0 }, pixelRatio: { value: 1 } },
    vertexShader: /* glsl */ `
      uniform float time; uniform float pixelRatio;
      attribute float seed;
      varying float vGlow;
      void main() {
        vec3 p = position;
        p.x += sin(time * (0.3 + seed * 0.4) + seed * 30.0) * 2.5;
        p.z += cos(time * (0.25 + seed * 0.4) + seed * 17.0) * 2.5;
        p.y += sin(time * (0.5 + seed) + seed * 9.0) * 0.9;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = (0.5 + seed * 0.4) * 110.0 * pixelRatio / -mv.z;
        vGlow = 0.35 + 0.65 * pow(0.5 + 0.5 * sin(time * (1.2 + seed * 1.6) + seed * 40.0), 2.0);
      }`,
    fragmentShader: /* glsl */ `
      varying float vGlow;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d) * vGlow;
        gl_FragColor = vec4(vec3(0.85, 1.0, 0.45) * a, a);
      }`,
  });
  const points = new THREE.Points(g, material);
  points.frustumCulled = false;
  return points;
}

// ---------------------------------------------------------------------------
/**
 * @param {number} groundY  world height of the island's top
 * @param {number} quality  1 = full, <1 thins out the instanced scatter (phones)
 */
export function createLandscape(scene, { groundY = -3.5, quality = 1 } = {}) {
  const rand = mulberry32(2024);
  const group = new THREE.Group();
  const time = { value: 0 };
  const q = (n) => Math.max(1, Math.round(n * quality));

  group.add(buildTerrain());
  group.add(buildMiniTrees(rand, q(16)));
  group.add(buildRocks(rand, q(46), groundY));
  group.add(buildGrass(rand, q(2400), groundY, time));
  group.add(buildFlowers(rand, q(520), groundY));
  group.add(buildPath(rand));
  group.add(buildTorii(POND.x - 0.5, FLOOR_Y + 0.1, POND.z + 1, 0.8));
  group.add(buildPond());

  // Stone lanterns along the path: glow only, no extra real lights
  const glowMap = radialGlow();
  const lamps = [[-5.3, 27], [4.6, 21.5], [-4.8, 14.5], [5.2, 30]].map(([x, z]) => {
    const lamp = createStoneLantern(glowMap);
    lamp.group.position.set(x, terrainY(x, z), z);
    lamp.group.scale.setScalar(1.5);
    lamp.glow.scale.setScalar(3.4);
    lamp.phase = x + z;
    group.add(lamp.group);
    return lamp;
  });

  const fireflies = buildFireflies(rand, q(150));
  group.add(fireflies);
  scene.add(group);

  return {
    group,
    update(t) {
      time.value = t;
      fireflies.material.uniforms.time.value = t;
      for (const l of lamps) {
        l.glow.material.opacity = 0.7 + Math.sin(t * 7 + l.phase) * 0.06 + Math.sin(t * 17 + l.phase * 2) * 0.04;
      }
    },
    setPixelRatio(dpr) {
      fireflies.material.uniforms.pixelRatio.value = dpr;
    },
  };
}
