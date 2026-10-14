# AGENTS.md

Guide for AI coding agents working in this repo.

## Project

**three-lantern** is a single-page Three.js scene: floating paper lanterns rise around a sakura tree under a starry sky. Clicking a lantern flies the camera to it (GSAP) and opens a popup with an image and caption. It ships as a PWA.

- Live site: https://three-lantern.vercel.app
- Repo: https://github.com/aleksanderphan/three-lantern
- Stack: Vite 7, Three.js 0.180, GSAP 3, vite-plugin-pwa. Plain JavaScript (ES modules); no framework, no TypeScript.

## Commands

```bash
npm install       # install dependencies
npm run dev       # dev server with HMR (http://localhost:5173)
npm run build     # production build into dist/
npm run preview   # serve the built dist/ locally
```

There are no tests, linter, or formatter scripts. To check a change, run `npm run build` and look at it in the browser (`npm run dev` or `npm run preview`).

## Layout

```
index.html                    Page shell: loader, popup and hint markup; links src/styles.css, loads src/main.js
src/main.js                   Entry point: builds the scene from the modules below, wires lantern focus/popup,
                              runs the render loop. In dev, exposes scene/camera/controls/gsap on window.
src/config.js                 Every tunable value (camera, lantern counts/speeds/light, bloom, stars, ...)
src/styles.css                All UI CSS
src/core/renderer.js          createRenderer / createCamera / createControls (OrbitControls, damping, auto-rotate)
src/core/postprocessing.js    EffectComposer: RenderPass + UnrealBloom + color-shift ShaderPass
src/core/loading.js           Shared LoadingManager driving the #loader overlay; showLoadError()
src/objects/lights.js         All scene-wide lights + background/fog (the only place lights are defined)
src/objects/floor.js          Ground disc
src/objects/stars.js          Twinkling starfield
src/objects/tree.js           loadTree(): sakura_tree.glb (casts shadows)
src/objects/lanterns.js       createLanterns(): loads data.json + lantern.glb, builds N lanterns (model, glow light,
                              image banner, invisible hitbox) and returns { lanterns, hitboxes, update }
src/interaction/picker.js     Pointer raycasting against hitboxes: click (ignores orbit drags) + hover cursor
src/interaction/cameraRig.js  GSAP camera fly-to (outward from the tree) and reset to the home view
src/ui/popup.js               Lantern popup: open/close, Esc, focus, image skeleton
src/shaders/colorShift.js     Color-shift post-processing shader
public/data.json              Lantern content: [{ id, image, text }]; lanterns cycle through it
public/images/                Banner/popup images (keep ~1280px wide, a few hundred KB)
public/models/                lantern.glb, sakura_tree.glb
public/icon.svg               Favicon and PWA icon
vite.config.js                Vendor chunks (three, gsap) + PWA/Workbox config
dist/                         Build output; git-ignored (Vercel builds on deploy)
```

## Conventions

- Tunable numbers go in `src/config.js`, not inline in modules.
- Each scene object lives in its own `src/objects/*.js` module and exports a `create*`/`load*` function that takes `scene` (and the shared `THREE.LoadingManager` when it loads files), adds itself to the scene, and returns the object or a Promise for it. Objects that animate return an `update(...)` function that `main.js` calls from the render loop.
- Pass the shared `manager` from `main.js` into every loader (GLTF, texture, file) so the loading screen's progress counts the asset.
- Animation uses `delta`/`elapsed` seconds from the `THREE.Timer` in `main.js`; never move things by a fixed amount per frame.
- Assets in `public/` are referenced by absolute paths (`/models/lantern.glb`, `/data.json`). Image paths inside `data.json` are relative (`images/...`).
- Import Three.js addons from `three/examples/jsm/...`.
- Code style: 2-space indent, single quotes, semicolons, short `//` section comments.

### Changing lantern content

Edit `public/data.json` and put images in `public/images/`. The lantern count is `CONFIG.lanterns.count` in `src/config.js`. If there are fewer data entries than lanterns, entries repeat.

## Deployment

**Vercel**, through its GitHub integration. Every push to `main` triggers a Production deploy to https://three-lantern.vercel.app. Deploys show up as GitHub Deployments created by `vercel[bot]`. The repo has no `vercel.json` or GitHub Actions workflow; the Vercel project uses its settings for a Vite project (build `npm run build`, output `dist/`).

Release steps:

1. Make the change and check it locally with `npm run dev`.
2. Run `npm run build` to make sure the production build succeeds. You can check the result with `npm run preview`.
3. Commit only the source changes (`src/`, `public/`, `index.html`, config files). **Don't commit `dist/`.** Vercel runs the build itself.
4. Push to `main`. Vercel builds and deploys automatically. Check the deploy status on the commit in GitHub or in the Vercel dashboard.

Only commit or push when the user asks you to.

### PWA and caching

- `vite-plugin-pwa` generates `sw.js` with `registerType: 'autoUpdate'`. Workbox precaches `js, css, html, ico, png, svg`; `.glb` models are cached CacheFirst at runtime (cache `glb-models`, 5 entries, 30 days). `.jpeg` images are neither precached nor runtime-cached.
- After a deploy, returning visitors may see the old version until the service worker updates. If a change doesn't seem to show up, hard-reload or clear site data before assuming the deploy failed.
- If you replace a `.glb` or an image, give it a new filename (or change the cache name) so clients don't keep serving the cached copy for 30 days.

## Gotchas

- Models are about 4–5 MB each. Keep new assets small, since they slow first load on mobile. Resize photos to about 1280px before adding them.
- The PWA plugin injects `registerSW.js` (`injectRegister: 'script'`). That is the only service-worker registration; don't add another one in `main.js`.
- The `EffectComposer` has no `OutputPass`, and banner textures are left in the default (non-sRGB) color space. The scene's look depends on that pairing, so change both together or neither.
- GSAP lag smoothing makes tweens crawl at very low frame rates (for example headless SwiftShader). When testing headless, call `gsap.ticker.lagSmoothing(0)` in the dev console.
