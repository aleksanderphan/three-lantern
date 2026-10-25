import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

const SPAWN_MIN_RADIUS = 21; // keep clear of the tree canopy
const SPAWN_MAX_RADIUS = 38;
const CEILING = 34;
const LIGHT_POOL = 3; // real point lights shared by the lanterns nearest the camera

// Lantern-local layout (the instance is scaled by 0.5):
//   body y -1..1, tassel ends ~ -1.95, banner pivot at PIVOT_Y, card hangs below it.
const PIVOT_Y = -2.15;
const CARD_W = 2.56;
const CARD_H = 3.6;
const ROD_Y = -0.75; // rod / card top, relative to the pivot

function glowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,190,90,1)");
  grad.addColorStop(0.35, "rgba(255,140,40,0.35)");
  grad.addColorStop(1, "rgba(255,120,20,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function respawn(mesh, initial = false) {
  // Keep clear of the camera's side (+z) so a lantern never floats right up to the lens
  let x, z;
  do {
    const angle = Math.random() * Math.PI * 2;
    const radius = SPAWN_MIN_RADIUS + Math.random() * (SPAWN_MAX_RADIUS - SPAWN_MIN_RADIUS);
    x = Math.cos(angle) * radius;
    z = Math.sin(angle) * radius;
  } while (z > 16);
  mesh.position.set(x, initial ? 4 + Math.random() * (CEILING - 4) : 4 + Math.random() * 2, z);
}

// ---------------------------------------------------------------------------
// Lantern model (procedural). Two merged geometries -> two draw calls, shared by clones.
// ---------------------------------------------------------------------------
function paint(g, hex) {
  g.deleteAttribute("uv");
  const c = new THREE.Color(hex);
  const n = g.attributes.position.count;
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3);
  g.setAttribute("color", new THREE.BufferAttribute(a, 3));
  return g;
}

function buildLanternParts() {
  const RED = 0x9c1c14;
  const GOLD = 0xe0b040;

  // Smooth barrel profile
  const curve = new THREE.SplineCurve(
    [[0.42, -1.0], [0.66, -0.93], [0.9, -0.7], [1.02, -0.3], [1.05, 0], [1.02, 0.3], [0.9, 0.7], [0.66, 0.93], [0.42, 1.0]].map(
      ([r, y]) => new THREE.Vector2(r, y),
    ),
  );
  const profile = curve.getPoints(28);

  // Paper body: warm gradient (bright belly, deeper orange at the ends) via vertex colors
  const body = new THREE.LatheGeometry(profile, 32);
  body.deleteAttribute("uv");
  const bp = body.attributes.position;
  const bc = new Float32Array(bp.count * 3);
  const belly = new THREE.Color(0xffa63d);
  const end = new THREE.Color(0xff4d12);
  const tmp = new THREE.Color();
  for (let i = 0; i < bp.count; i++) {
    tmp.copy(end).lerp(belly, Math.pow(1 - Math.abs(bp.getY(i)), 0.8)).multiplyScalar(1.5);
    bc.set([tmp.r, tmp.g, tmp.b], i * 3);
  }
  body.setAttribute("color", new THREE.BufferAttribute(bc, 3));

  const trim = [];
  // Caps: red core with gold rims
  for (const s of [1, -1]) {
    trim.push(paint(new THREE.CylinderGeometry(0.46, 0.4, 0.2, 24).translate(0, 1.08 * s, 0), RED));
    trim.push(paint(new THREE.TorusGeometry(0.46, 0.04, 6, 28).rotateX(Math.PI / 2).translate(0, 1.08 * s + 0.1 * s, 0), GOLD));
    trim.push(paint(new THREE.TorusGeometry(0.4, 0.035, 6, 28).rotateX(Math.PI / 2).translate(0, 1.08 * s - 0.1 * s, 0), GOLD));
  }
  // Vertical ribs following the barrel
  const RIBS = 14;
  for (let k = 0; k < RIBS; k++) {
    const a = (k / RIBS) * Math.PI * 2;
    const pts = profile.map((p) => new THREE.Vector3(Math.cos(a) * (p.x + 0.012), p.y, Math.sin(a) * (p.x + 0.012)));
    trim.push(paint(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, 0.016, 4), RED));
  }
  // Gold decorative band around the belly
  trim.push(paint(new THREE.TorusGeometry(1.065, 0.03, 6, 40).rotateX(Math.PI / 2), GOLD));
  // Hanging loop
  trim.push(paint(new THREE.TorusGeometry(0.17, 0.028, 6, 16).translate(0, 1.36, 0), GOLD));
  // Tassel: cord, gold knot, red bead, fringe strands
  trim.push(paint(new THREE.CylinderGeometry(0.022, 0.022, 0.3, 6).translate(0, -1.3, 0), RED));
  trim.push(paint(new THREE.SphereGeometry(0.09, 10, 8).translate(0, -1.5, 0), GOLD));
  trim.push(paint(new THREE.SphereGeometry(0.13, 10, 8).scale(1, 1.3, 1).translate(0, -1.66, 0), RED));
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI * 2;
    const strand = new THREE.CylinderGeometry(0.012, 0.012, 0.32, 3).translate(0, -0.16, 0);
    strand.rotateZ(Math.sin(a) * 0.18).rotateX(Math.cos(a) * 0.18);
    strand.translate(Math.cos(a) * 0.06, -1.72, Math.sin(a) * 0.06);
    trim.push(paint(strand, RED));
  }
  // Cord from the tassel down to the banner pivot
  trim.push(paint(new THREE.CylinderGeometry(0.014, 0.014, 0.3, 4).translate(0, -2.0, 0), RED));

  const trimMerged = mergeGeometries(trim, false);
  trim.forEach((g) => g.dispose());

  return {
    body,
    trim: trimMerged,
    bodyMaterial: new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }),
    trimMaterial: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.35 }),
  };
}

// ---------------------------------------------------------------------------
// Banner card: photo + caption painted onto a single canvas texture
// ---------------------------------------------------------------------------
function wrapText(ctx, text, maxWidth, maxLines) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, "") + "…";
  }
  return lines;
}

/** Darkens the inside edges of a rect, so it reads as recessed. */
function innerShadow(ctx, r, blur, color) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(r.x, r.y, r.w, r.h);
  ctx.clip();
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.rect(r.x - 60, r.y - 60, r.w + 120, r.h + 120);
  ctx.rect(r.x, r.y, r.w, r.h);
  ctx.fill("evenodd");
  ctx.restore();
}

/**
 * Paints the scroll (frame, photo, caption) onto a canvas texture.
 * Drawing happens in 512x720 logical units; `scale` raises the pixel resolution.
 */
function createCardTexture(metadata, anisotropy, { scale = 1, url = metadata.thumb ?? metadata.image, onReady } = {}) {
  const W = 512;
  const H = Math.round((W * CARD_H) / CARD_W);
  const canvas = document.createElement("canvas");
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;

  const imgBox = { x: 52, y: 52, w: W - 104, h: Math.round(H * 0.6) };

  // Red lacquer plaque with a bevel: light catches the top/left edges, shade the bottom/right
  const lacquer = ctx.createLinearGradient(0, 0, 0, H);
  lacquer.addColorStop(0, "#c42a1f");
  lacquer.addColorStop(0.5, "#9c1c14");
  lacquer.addColorStop(1, "#7a130d");
  ctx.fillStyle = lacquer;
  ctx.fillRect(0, 0, W, H);
  ctx.lineWidth = 5;
  ctx.strokeStyle = "rgba(255,200,170,0.45)";
  ctx.beginPath();
  ctx.moveTo(3, H - 3);
  ctx.lineTo(3, 3);
  ctx.lineTo(W - 3, 3);
  ctx.stroke();
  ctx.strokeStyle = "rgba(40,4,2,0.55)";
  ctx.beginPath();
  ctx.moveTo(W - 3, 3);
  ctx.lineTo(W - 3, H - 3);
  ctx.lineTo(3, H - 3);
  ctx.stroke();

  // Double gold border
  ctx.strokeStyle = "#d8a93a";
  ctx.lineWidth = 4;
  ctx.strokeRect(14, 14, W - 28, H - 28);
  ctx.strokeStyle = "rgba(216,169,58,0.8)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(24, 24, W - 48, H - 48);

  // Washi panel, sunk into the lacquer (inner shadow along its top/left)
  const panel = { x: 36, y: 36, w: W - 72, h: H - 72 };
  ctx.fillStyle = "#f4e8cf";
  ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
  innerShadow(ctx, panel, 16, "rgba(60,25,10,0.45)");

  // Photo placeholder until the picture arrives
  ctx.fillStyle = "#d9c9a8";
  ctx.fillRect(imgBox.x, imgBox.y, imgBox.w, imgBox.h);

  // Caption, shrunk until it fits under the photo
  const top = imgBox.y + imgBox.h + 40;
  const bottom = H - 56;
  // Gold diamond divider between photo and caption
  const dy = imgBox.y + imgBox.h + 22;
  ctx.strokeStyle = "rgba(156,28,20,0.5)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(imgBox.x + 40, dy);
  ctx.lineTo(W / 2 - 16, dy);
  ctx.moveTo(W / 2 + 16, dy);
  ctx.lineTo(imgBox.x + imgBox.w - 40, dy);
  ctx.stroke();
  ctx.fillStyle = "#b8892f";
  ctx.beginPath();
  ctx.moveTo(W / 2, dy - 7);
  ctx.lineTo(W / 2 + 7, dy);
  ctx.lineTo(W / 2, dy + 7);
  ctx.lineTo(W / 2 - 7, dy);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#3a1a10";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  let size = 34;
  let lines;
  do {
    ctx.font = `600 ${size}px Georgia, "Times New Roman", serif`;
    lines = wrapText(ctx, metadata.text ?? "", W - 130, 4);
    size -= 2;
  } while (lines.length * size * 1.3 > bottom - top && size > 18);
  const lh = size * 1.3;
  const y0 = (top + bottom) / 2 - ((lines.length - 1) * lh) / 2;
  lines.forEach((l, i) => ctx.fillText(l, W / 2, y0 + i * lh));

  if (url) {
    const img = new Image();
    img.crossOrigin = "anonymous"; // Supabase photos are cross-origin; without this the canvas is tainted and WebGL refuses to upload it
    img.onerror = () => console.warn("Lantern photo failed to load:", url);
    img.onload = () => {
      // object-fit: cover
      const s = Math.max(imgBox.w / img.width, imgBox.h / img.height);
      const sw = imgBox.w / s;
      const sh = imgBox.h / s;
      ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, imgBox.x, imgBox.y, imgBox.w, imgBox.h);
      innerShadow(ctx, imgBox, 14, "rgba(0,0,0,0.6)"); // photo sits recessed in the panel
      ctx.strokeStyle = "#d8a93a";
      ctx.lineWidth = 3;
      ctx.strokeRect(imgBox.x - 1.5, imgBox.y - 1.5, imgBox.w + 3, imgBox.h + 3);
      tex.needsUpdate = true;
      onReady?.();
    };
    img.src = url;
  } else if (onReady) {
    queueMicrotask(onReady);
  }
  return tex;
}

function buildBanner(metadata, anisotropy, shared) {
  // Strings meet at the pivot, so the whole card swings from the lantern's cord
  const pivot = new THREE.Group();
  pivot.position.set(0, PIVOT_Y, 0);

  const card = new THREE.Mesh(
    shared.cardGeometry,
    new THREE.MeshBasicMaterial({ map: createCardTexture(metadata, anisotropy) }),
  );
  card.position.set(0, ROD_Y - CARD_H / 2, 0);

  // A lacquered slab behind the painted face gives the scroll real thickness
  const back = new THREE.Mesh(shared.slabGeometry, shared.slabMaterial);
  back.position.set(0, ROD_Y - CARD_H / 2, -0.045);

  const rod = new THREE.Mesh(shared.rodGeometry, shared.rodMaterial);
  rod.position.set(0, ROD_Y + 0.02, 0);

  const capL = new THREE.Mesh(shared.capGeometry, shared.capMaterial);
  capL.position.set(-(CARD_W + 0.25) / 2, ROD_Y + 0.02, 0);
  const capR = capL.clone();
  capR.position.x *= -1;

  pivot.add(card, back, rod, capL, capR, new THREE.Line(shared.stringGeometry, shared.stringMaterial));
  return { pivot, card };
}

export async function createLanterns(
  scene,
  count = 5,
  lanternData,
  manager,
  { maxAnisotropy = 4 } = {},
) {
  const parts = buildLanternParts();

  const shared = {
    cardGeometry: new THREE.PlaneGeometry(CARD_W, CARD_H),
    slabGeometry: new THREE.BoxGeometry(CARD_W + 0.08, CARD_H + 0.08, 0.08),
    slabMaterial: new THREE.MeshStandardMaterial({ color: 0x8a160f, roughness: 0.4, metalness: 0.2 }),
    capGeometry: new THREE.SphereGeometry(0.075, 10, 8),
    capMaterial: new THREE.MeshStandardMaterial({ color: 0xd8a93a, roughness: 0.35, metalness: 0.6 }),
    rodGeometry: new THREE.CylinderGeometry(0.04, 0.04, CARD_W + 0.25, 6).rotateZ(Math.PI / 2),
    rodMaterial: new THREE.MeshStandardMaterial({ color: 0x8a5a2b, roughness: 0.7 }),
    stringGeometry: new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-CARD_W / 2, ROD_Y, 0),
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(CARD_W / 2, ROD_Y, 0),
    ]),
    stringMaterial: new THREE.LineBasicMaterial({ color: 0xb8892f }),
  };

  const glowMap = glowTexture();
  const items = [];

  for (let i = 0; i < count; i++) {
    const lantern = new THREE.Group();
    lantern.add(new THREE.Mesh(parts.body, parts.bodyMaterial), new THREE.Mesh(parts.trim, parts.trimMaterial));
    lantern.scale.setScalar(0.65);
    respawn(lantern, true);

    const metadata = lanternData[i % lanternData.length];
    lantern.userData.custom = metadata;

    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowMap,
        color: new THREE.Color(0xffa500).offsetHSL(0, 0, (Math.random() - 0.5) * 0.1),
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
      }),
    );
    glow.scale.setScalar(6.5);
    glow.position.set(0, 0.2, 0);
    glow.raycast = () => {}; // never block clicks on the lantern behind it
    lantern.add(glow);

    const banner = buildBanner(metadata, maxAnisotropy, shared);
    lantern.add(banner.pivot);

    scene.add(lantern);
    items.push({
      mesh: lantern,
      glow,
      banner: banner.pivot,
      bannerCard: banner.card,
      speed: (0.01 + Math.random() * 0.02) * 60, // units / second
      rotationSpeed: (Math.random() - 0.5) * 0.12, // rad / second
      flickerOffset: Math.random() * Math.PI * 2,
      swingOffset: Math.random() * Math.PI * 2,
      paused: false,
      sharpened: false,
      sway: 1, // eased to 0 while focused so the scroll settles before the camera arrives
    });
  }

  for (const item of items) {
    // The banner texture starts as the small thumbnail; swap in the full photo at 2x once
    // a lantern is focused so the close-up isn't blurry or over-cropped.
    item.sharpen = () => {
      if (item.sharpened) return;
      item.sharpened = true;
      const data = item.mesh.userData.custom;
      if (!data.image) return;
      const tex = createCardTexture(data, maxAnisotropy, {
        scale: 2,
        url: data.image,
        onReady: () => {
          const mat = item.bannerCard.material;
          mat.map.dispose();
          mat.map = tex;
          mat.needsUpdate = true;
        },
      });
    };

    // World-space pose of the settled (un-swung) scroll, for camera framing
    item.cardPose = () => {
      item.mesh.updateWorldMatrix(true, false);
      const s = item.mesh.scale.x;
      return {
        center: item.mesh.localToWorld(new THREE.Vector3(0, PIVOT_Y + ROD_Y - CARD_H / 2, 0)),
        normal: new THREE.Vector3(0, 0, 1).transformDirection(item.mesh.matrixWorld),
        width: CARD_W * s,
        height: CARD_H * s,
      };
    };
  }

  // Forward-rendered lights are expensive per-fragment, so only a few real
  // lights exist and they hop to whichever lanterns are closest to the camera.
  const lights = Array.from({ length: LIGHT_POOL }, () => {
    const l = new THREE.PointLight(0xffa040, 0, 14, 2);
    scene.add(l);
    return l;
  });
  const assigned = new Array(LIGHT_POOL).fill(null); // wanted lantern per slot
  const current = new Array(LIGHT_POOL).fill(null); // lantern the slot is actually lighting
  const fade = new Array(LIGHT_POOL).fill(0);
  const world = new THREE.Vector3();
  let assignTimer = 0;

  function assignLights(camera) {
    const top = items
      .map((it) => ({ it, d: it.mesh.position.distanceToSquared(camera.position) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, LIGHT_POOL)
      .map((r) => r.it);
    // Keep slots on their lantern while it's still in the nearest set; only free slots change
    const free = top.filter((it) => !current.includes(it) && !assigned.includes(it));
    for (let i = 0; i < LIGHT_POOL; i++) {
      if (top.includes(current[i])) assigned[i] = current[i];
      else assigned[i] = free.shift() ?? null;
    }
  }

  function update(dt, time, camera) {
    assignTimer -= dt;
    if (assignTimer <= 0) {
      assignLights(camera);
      assignTimer = 0.4;
    }

    for (const it of items) {
      const { mesh } = it;
      if (!it.paused) {
        mesh.position.y += it.speed * dt;
        mesh.rotation.y += it.rotationSpeed * dt;
        if (mesh.position.y > CEILING) respawn(mesh);
      }

      it.glow.material.opacity =
        (0.8 + Math.sin(time * 6 + it.flickerOffset) * 0.12 + Math.sin(time * 13.7 + it.flickerOffset * 2) * 0.06) * 0.7;

      // Gentle pendulum from the cord; eases to a stop while focused
      it.sway += ((it.paused ? 0 : 1) - it.sway) * Math.min(1, dt * 3);
      const sway = it.sway;
      it.banner.rotation.z = Math.sin(time * 1.5 + it.swingOffset) * 0.12 * sway;
      it.banner.rotation.x = Math.cos(time * 1.2 + it.swingOffset) * 0.05 * sway;
    }

    // A slot fades out, snaps to its new lantern while dark, then fades back in,
    // so a light never slides across the scene or pops when the camera orbits.
    for (let i = 0; i < LIGHT_POOL; i++) {
      const light = lights[i];
      if (current[i] !== assigned[i]) {
        fade[i] = Math.max(0, fade[i] - dt * 6);
        if (fade[i] === 0) {
          current[i] = assigned[i];
          if (current[i]) light.position.copy(current[i].mesh.position);
        }
      } else if (current[i]) {
        fade[i] = Math.min(1, fade[i] + dt * 4);
      }
      const it = current[i];
      if (!it) {
        light.intensity = 0;
        continue;
      }
      world.copy(it.mesh.position);
      world.y += 0.3;
      // Follow the lantern directly; if it respawned far away, snap instead of streaking
      if (light.position.distanceToSquared(world) > 4) light.position.copy(world);
      else light.position.lerp(world, Math.min(1, dt * 8));
      light.intensity = 25 * fade[i] * (0.8 + Math.sin(time * 6 + it.flickerOffset) * 0.15);
    }
  }

  function dispose() {
    parts.body.dispose();
    parts.trim.dispose();
    parts.bodyMaterial.dispose();
    parts.trimMaterial.dispose();
    Object.values(shared).forEach((v) => v.dispose?.());
    glowMap.dispose();
    items.forEach((it) => {
      it.glow.material.dispose();
      it.bannerCard.material.map.dispose();
      it.bannerCard.material.dispose();
      scene.remove(it.mesh);
    });
    lights.forEach((l) => scene.remove(l));
  }

  return { items, pickables: items.map((it) => it.mesh), update, dispose };
}
