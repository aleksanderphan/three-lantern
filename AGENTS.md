# AGENTS.md

Guide for AI coding agents working in this repo.

## Project

**three-lantern** is a single-page Three.js night scene: a procedural sakura island with a bunny picnic, surrounded by a landscape (hills, path, pond with a torii gate, distant trees, grass, fireflies), under a moon and stars. Paper lanterns float up around it. Clicking a lantern flies the camera to the scroll hanging from it, which shows a photo and caption in 3D. It ships as a PWA.

Everything in the scene is generated in code. There are no model files to load; only the photos in `public/images/` and `public/data.json` are fetched.

- Live site: https://three-lantern.vercel.app
- Repo: https://github.com/aleksanderphan/three-lantern
- Stack: Vite 7, Three.js 0.180, GSAP 3, vite-plugin-pwa. Plain JavaScript (ES modules); no framework, no TypeScript.

## Commands

```bash
npm install        # install dependencies
npm run dev        # dev server with HMR (http://localhost:5173)
npm run build      # production build into dist/
npm run preview    # serve the built dist/ locally
npm run optimize   # regenerate the WebP photos + thumbnails from public/images/*.jpeg and rewrite data.json
```

There are no tests, linter, or formatter scripts. To check a change, run `npm run build` and look at it in the browser (`npm run dev` or `npm run preview`).

## Layout

```
index.html                     Page shell: loader, close button, hint, and all CSS (inline <style>)
src/main.js                    Entry point: quality tier, renderer, camera, lights, post-processing,
                               lantern focus/zoom interaction, render loop with adaptive resolution
src/objects/tree.js            createTree(): island, branching trunk, instanced blossoms, falling petals.
                               Also exports taperedTube, mulberry32, FLOOR_Y, TREE_SCALE
src/objects/bunnies.js         createBunnies(): bunnies, dango, stone lanterns (+ two real point lights).
                               Exports createStoneLantern, radialGlow
src/objects/landscape.js       createLandscape(): terrain, path, torii + pond, mini trees, rocks, grass, flowers,
                               fireflies. Exports terrainY(x, z)
src/objects/lanterns.js        createLanterns(): procedural paper lanterns + hanging photo scrolls, a pool of real
                               lights that follow the lanterns nearest the camera, update(dt, time, camera)
src/objects/sky.js             createSky() (gradient dome, moon, glow) and createHills() (horizon silhouettes)
src/objects/stars.js           createStars(): twinkling star dome, animated in the shader
scripts/optimize-assets.mjs    Resizes photos to WebP (popup size + thumbnails) and updates data.json
public/data.json               Lantern content: [{ id, image, thumb, text }]; lanterns cycle through it
public/images/                 Source JPEGs, plus generated .webp and thumbs/ (what the app actually loads)
public/icon.svg                Favicon and PWA icon
vite.config.js                 Vendor chunks (three, gsap) + PWA/Workbox config
dist/                          Build output; git-ignored (Vercel builds on deploy)
```

## How the scene fits together

- **Units:** world units; the floor is at `FLOOR_Y` (-5). The island is scaled by `TREE_SCALE` about the point under the trunk, and `createTree` returns `groundY` (the island's top). Pass that to `createBunnies` and `createLandscape`.
- **Bunny scene** is authored at 1x in `bunnies.js` and scaled up in code; positions are in that 1x space.
- **Landscape scatter** keeps the area in front of the camera (the path, pond, bunnies, lantern ring) clear. If you add objects, check the view from the default camera in `main.js`.
- **Lanterns** spawn in a ring around the island and never on the camera's side (`z <= 16`). Focusing one pauses it and swaps its scroll to a 2x texture with the full-size photo (`item.setDetail`).
- **Interaction:** a click (not an orbit drag) on a lantern calls `focusLantern`; the camera flies to the scroll using `item.cardPose()`. Esc, the × button, or a click anywhere except the scroll calls `closeFocus`.

## Conventions

- Each scene part lives in its own `src/objects/*.js` module and exports a `create*` function that takes `scene`, adds itself, and returns what `main.js` needs (often an `update(t)`).
- Prefer instancing (`InstancedMesh`), merged geometry (`mergeGeometries`) and shared geometries/materials. Keep real lights few; lights are expensive in forward rendering. Use additive glow sprites instead.
- Animate with elapsed/delta seconds (`THREE.Clock` in `main.js`); never move things by a fixed amount per frame.
- Static shadows are baked once after load (`renderer.shadowMap.autoUpdate = false`). Only static geometry should cast shadows.
- Phones/tablets use a low-quality tier (`isLowTier` in `main.js`): no shadows or bloom, fewer scatter instances, no extra real lights. New features should respect it.
- Import Three.js addons from `three/examples/jsm/...`.
- Code style: 2-space indent, double quotes, semicolons, short `//` comments that explain why.

### Changing lantern content

Edit `public/data.json` (`text`) and put JPEGs in `public/images/`, then run `npm run optimize`. It writes the `.webp` photo and thumbnail and fills in the `image`/`thumb` paths. The lantern count is the second argument to `createLanterns` in `main.js`. If there are fewer entries than lanterns, entries repeat.

## Deployment

**Vercel**, through its GitHub integration. Every push to `main` triggers a Production deploy to https://three-lantern.vercel.app. Deploys show up as GitHub Deployments created by `vercel[bot]`. The repo has no `vercel.json` or GitHub Actions workflow; the Vercel project uses its settings for a Vite project (build `npm run build`, output `dist/`).

Release steps:

1. Make the change and check it locally with `npm run dev`.
2. Run `npm run build` to make sure the production build succeeds. You can check the result with `npm run preview`.
3. Commit only the source changes (`src/`, `public/`, `scripts/`, `index.html`, config files). **Don't commit `dist/`.** Vercel runs the build itself.
4. Push to `main`. Vercel builds and deploys automatically. Check the deploy status on the commit in GitHub or in the Vercel dashboard.

Only commit or push when the user asks you to.

### PWA and caching

- `vite-plugin-pwa` generates `sw.js` with `registerType: 'autoUpdate'`. Workbox precaches `js, css, html, ico, png, svg` (not `models/` or `images/`); photos and any model files are cached CacheFirst at runtime (caches `images` and `models`, 60 entries, 30 days).
- After a deploy, returning visitors may see the old version until the service worker updates. If a change doesn't seem to show up, hard-reload or clear site data before assuming the deploy failed.
- If you replace a photo, give it a new filename so clients don't keep serving the cached copy for 30 days.

## Gotchas

- Keep photos small. `npm run optimize` produces ~1024px WebP for the popup-size image and 384x512 thumbnails for the banner. Don't commit multi-megabyte JPEGs as the displayed images.
- `public/images/*.jpeg` are only the sources for `npm run optimize`; the app loads the `.webp` files.
- The PWA plugin injects `registerSW.js` (`injectRegister: 'script'`). That is the only service-worker registration; don't add another one in `main.js`.
- The renderer uses `antialias: false` and 4x MSAA on the `EffectComposer` target, with `OutputPass` doing tone mapping and sRGB conversion. Keep `OutputPass` last; materials and canvas textures are authored for it (sRGB textures use `THREE.SRGBColorSpace`).
- In dev, Vite's server doesn't serve `sw.js`, so a "service worker registration failed" console error is expected there.
- GSAP lag smoothing makes tweens crawl at very low frame rates (for example headless SwiftShader). When testing headless, call `gsap.ticker.lagSmoothing(0)` in the dev console.
