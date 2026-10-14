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
index.html              Page shell: inline CSS for the loader and popup, popup/loader markup, loads src/main.js
src/main.js             Scene, camera, renderer, OrbitControls, lights, floor, post-processing
                        (UnrealBloom + color-shift shader), click raycasting, popup, animation loop,
                        service-worker registration
src/objects/lanterns.js createLanterns(): loads lantern.glb, clones it N times, adds a point light and an
                        image banner to each, attaches the matching data.json entry as userData.custom
src/objects/tree.js     loadTree(): loads sakura_tree.glb and adds the tree's own lights
src/objects/stars.js    createStars(): 3000-point starfield
src/objects/mountain.js createMountain(): currently unused
src/style.css           Leftover Vite template CSS; not imported
public/data.json        Lantern content: [{ id, image, text }]; lanterns cycle through it
public/images/          Banner/popup images referenced by data.json
public/models/          lantern.glb, sakura_tree.glb
vite.config.js          PWA/Workbox config (.glb files are cached at runtime, not precached)
dist/                   Build output; don't commit (Vercel builds on deploy)
```

## Conventions

- Each scene object lives in its own `src/objects/*.js` module and exports a `create*`/`load*` function that takes `scene` (and an optional `THREE.LoadingManager`), adds itself to the scene, and returns the object or a Promise for it.
- Pass the shared `manager` from `main.js` into loaders so the loading screen's progress counts the asset.
- Assets in `public/` are referenced by absolute paths (`/models/lantern.glb`, `/data.json`). Image paths inside `data.json` are relative (`images/...`).
- Import Three.js addons from `three/examples/jsm/...`.
- Code style: 2-space indent, single quotes, semicolons, short `//` section comments.

### Changing lantern content

Edit `public/data.json` and put images in `public/images/`. The lantern count is set in `main.js` (`createLanterns(scene, 10, ...)`). If there are fewer data entries than lanterns, entries repeat.

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
- If you replace a `.glb` file, give it a new filename (or change the cache name) so clients don't keep serving the cached copy for 30 days.

## Gotchas

- Models are about 4–5 MB each and some images are about 6 MB. Keep new assets small, since they slow first load on mobile.
- `main.js` registers `/sw.js` by hand, and the PWA plugin also injects `registerSW.js`. Both point at the same worker. Don't add a third registration.
- `main.js` and `tree.js` both add moonlight and ambient lights, so lighting changes may need edits in both files.
- `animate()` sets lantern light intensity, and `animateLanterns()` then overrides it in the same frame. Change flicker behavior in `animateLanterns()`.
