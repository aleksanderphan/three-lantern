import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

// Fully procedural sakura island: no model files, so placement and scale are exact.
// Layout (world units): island top sits at FLOOR_Y + 1, the trunk grows from the origin,
// the canopy spans roughly 18 units wide and tops out near y = 14.

export const FLOOR_Y = -5;
const ISLAND_RADIUS = 9;
const BLOSSOM_COLORS = [0xffb7c5, 0xff9fb5, 0xffd1dc, 0xf48fb1, 0xffc2d1];

export function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Cheap deterministic hash noise in [-1, 1] for rocky displacement
function noise3(x, y, z) {
  const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
  return (s - Math.floor(s)) * 2 - 1;
}

/** Tapered tube along a Catmull-Rom path; radius lerps r0 -> r1. */
export function taperedTube(points, r0, r1, radial = 7) {
  const curve = new THREE.CatmullRomCurve3(points);
  const steps = Math.max(6, Math.ceil(curve.getLength() * 2));
  const frames = curve.computeFrenetFrames(steps, false);
  const pos = [];
  const idx = [];
  for (let i = 0; i <= steps; i++) {
    const p = curve.getPointAt(i / steps);
    const r = THREE.MathUtils.lerp(r0, r1, i / steps);
    const n = frames.normals[i];
    const b = frames.binormals[i];
    for (let j = 0; j < radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const c = Math.cos(a) * r;
      const s = Math.sin(a) * r;
      pos.push(p.x + n.x * c + b.x * s, p.y + n.y * c + b.y * s, p.z + n.z * c + b.z * s);
    }
  }
  for (let i = 0; i < steps; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * radial + j;
      const b = i * radial + ((j + 1) % radial);
      idx.push(a, b, a + radial, b, b + radial, a + radial);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function buildIsland() {
  const g = new THREE.IcosahedronGeometry(1, 4); // non-indexed already, so faces stay flat-shaded
  const p = g.attributes.position;
  const colors = new Float32Array(p.count * 3);
  const stone = new THREE.Color(0x4a4a56);
  const moss = new THREE.Color(0x2f5a34);
  const dirt = new THREE.Color(0x3b2a1c);
  const c = new THREE.Color();

  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i);
    let y = p.getY(i);
    let z = p.getZ(i);
    const n = noise3(Math.round(x * 6), Math.round(y * 6), Math.round(z * 6));
    const top = y > 0.25;
    // Flat top, bulging then tapering underside
    const depth = top ? 0 : Math.abs(y);
    const taper = 1 - Math.pow(depth, 1.6) * 0.55;
    const rim = 1 + n * 0.05;
    x *= ISLAND_RADIUS * taper * rim;
    z *= ISLAND_RADIUS * taper * rim;
    y = top ? 1 + n * 0.04 : 1 + (y - 0.25) * 4 + n * 0.25;
    p.setXYZ(i, x, y + FLOOR_Y, z);

    if (top) c.copy(moss).lerp(dirt, Math.max(0, n) * 0.6);
    else c.copy(stone).lerp(dirt, (1 - depth) * 0.35 + n * 0.08);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  g.computeVertexNormals();
  const mesh = new THREE.Mesh(
    g,
    new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 }),
  );
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  return mesh;
}

function buildBranches(rand) {
  const geoms = [];
  const anchors = [];
  const segs = 4;

  function grow(start, dir, length, radius, depth) {
    const pts = [start.clone()];
    const d = dir.clone();
    for (let i = 0; i < segs; i++) {
      d.x += (rand() - 0.5) * 0.7;
      d.z += (rand() - 0.5) * 0.7;
      d.y += depth === 3 ? 0.12 : -0.08; // trunk reaches up, limbs droop a little
      d.normalize();
      pts.push(pts[i].clone().addScaledVector(d, length / segs));
    }
    geoms.push(taperedTube(pts, radius, radius * 0.55, depth >= 2 ? 8 : 5));

    // Blossoms only on the outer twigs + crown, so the trunk and limbs stay visible
    if (depth <= 1 || depth === 3) anchors.push(pts[segs].clone());
    if (depth === 0) return;

    const kids = depth === 3 ? 5 : 2 + Math.floor(rand() * 2);
    for (let k = 0; k < kids; k++) {
      const at = depth === 3 ? 0.45 + (k / kids) * 0.55 : 0.35 + rand() * 0.65;
      const i = Math.min(segs - 1, Math.floor(at * segs));
      const origin = pts[i].clone().lerp(pts[i + 1], (at * segs) % 1);
      const az = (depth === 3 ? k * 2.399 : rand() * Math.PI * 2) + rand() * 0.6;
      const tilt = depth === 3 ? 0.6 + rand() * 0.4 : 0.3 + rand() * 0.6;
      const childDir = new THREE.Vector3(Math.cos(az), tilt, Math.sin(az)).normalize();
      grow(origin, childDir, length * (depth === 3 ? 0.62 : 0.7), radius * 0.55, depth - 1);
    }
  }

  grow(new THREE.Vector3(0, FLOOR_Y + 0.8, 0), new THREE.Vector3(0.18, 1, 0.05).normalize(), 11, 1.2, 3);

  const merged = mergeGeometries(geoms, false);
  geoms.forEach((g) => g.dispose());
  const mesh = new THREE.Mesh(
    merged,
    new THREE.MeshStandardMaterial({ color: 0x6b4733, roughness: 1, flatShading: true }),
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return { mesh, anchors };
}

function buildCanopy(anchors, rand) {
  const perAnchor = 6;
  const mesh = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(1, 2),
    new THREE.MeshStandardMaterial({
      roughness: 0.9,
      emissive: 0x7a2a45, // keeps blossoms pink (not blue) under moonlight
      emissiveIntensity: 0.9,
    }),
    anchors.length * perAnchor,
  );
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const pos = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const col = new THREE.Color();
  let n = 0;
  for (const a of anchors) {
    for (let i = 0; i < perAnchor; i++) {
      const r = 1.2 + rand() * 1.2;
      pos.set(a.x + (rand() - 0.5) * 3.4, a.y + (rand() - 0.1) * 2.0, a.z + (rand() - 0.5) * 3.4);
      scale.set(r, r * 0.72, r);
      q.setFromEuler(e.set(rand() * 3, rand() * 3, rand() * 3));
      mesh.setMatrixAt(n, m.compose(pos, q, scale));
      col.setHex(BLOSSOM_COLORS[Math.floor(rand() * BLOSSOM_COLORS.length)]).offsetHSL(0, 0, (rand() - 0.5) * 0.06);
      mesh.setColorAt(n, col);
      n++;
    }
  }
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** Falling petals: one Points draw call, animated entirely in the vertex shader. */
function buildPetals(count) {
  const rand = mulberry32(99);
  const pos = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(rand()) * 24;
    pos.set([Math.cos(a) * r, rand() * 22, Math.sin(a) * r], i * 3);
    seed[i] = rand();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("seed", new THREE.BufferAttribute(seed, 1));

  const base = (FLOOR_Y + 1).toFixed(1);
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { time: { value: 0 }, pixelRatio: { value: 1 } },
    vertexShader: /* glsl */ `
      uniform float time; uniform float pixelRatio;
      attribute float seed;
      varying float vFade;
      void main() {
        vec3 p = position;
        p.y = mod(p.y - time * (1.2 + seed * 1.4), 22.0) + ${base};
        p.x += sin(time * (0.5 + seed) + seed * 40.0) * 1.6;
        p.z += cos(time * (0.4 + seed) + seed * 25.0) * 1.6;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = (0.35 + seed * 0.35) * 90.0 * pixelRatio / -mv.z;
        vFade = smoothstep(0.0, 2.0, p.y - ${base});
      }`,
    fragmentShader: /* glsl */ `
      varying float vFade;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float a = smoothstep(0.5, 0.25, length(c * vec2(1.0, 1.6))) * vFade * 0.9;
        gl_FragColor = vec4(1.0, 0.72, 0.8, a);
      }`,
  });
  const points = new THREE.Points(g, material);
  points.frustumCulled = false;
  return points;
}

/** Builds island, trunk, canopy and petals. Returns { group, petals, groundY }. */
export const TREE_SCALE = 1.5;

export function createTree(scene, { petalCount = 350, seed = 7, scale = TREE_SCALE } = {}) {
  const rand = mulberry32(seed);
  const group = new THREE.Group();
  const island = buildIsland();
  const { mesh: branches, anchors } = buildBranches(rand);
  const canopy = buildCanopy(anchors, rand);
  const petals = buildPetals(petalCount);
  group.add(island, branches, canopy, petals);
  // Scale about the floor point under the trunk so the island stays on the ground
  group.scale.setScalar(scale);
  group.position.y = FLOOR_Y * (1 - scale);
  scene.add(group);
  return { group, petals, groundY: FLOOR_Y + scale }; // groundY = world height of the island top
}
