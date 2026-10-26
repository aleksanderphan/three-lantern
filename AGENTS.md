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
npm run optimize   # regenerate WebP photos + thumbnails from */images/*.jpeg (default + every site) and rewrite data.json
npm run new-site   # create public/sites/<uuid>/ for a new content set (optional title argument)
```

There are no tests, linter, or formatter scripts. To check a change, run `npm run build` and look at it in the browser (`npm run dev` or `npm run preview`).

## Layout

```
index.html                     Page shell: loader, close button, hint, and all CSS (inline <style>)
src/site.js                    loadSiteContent(): picks the content set from the <uuid> subdomain or ?site=<uuid>
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
scripts/new-site.mjs           Scaffolds public/sites/<uuid>/ with data.json + images/
public/data.json               Default lantern content: [{ id, image, thumb, text }]; lanterns cycle through it
public/images/                 Source JPEGs, plus generated .webp and thumbs/ (what the app actually loads)
public/sites/<uuid>/           One folder per subdomain: data.json ({ title, lanterns: [...] }) + its own images/
public/icon.svg                Favicon and PWA icon
vite.config.js                 Vendor chunks (three, gsap) + PWA/Workbox config
dist/                          Build output; git-ignored (Vercel builds on deploy)
```

## How the scene fits together

- **Units:** world units; the floor is at `FLOOR_Y` (-5). The island is scaled by `TREE_SCALE` about the point under the trunk, and `createTree` returns `groundY` (the island's top). Pass that to `createBunnies` and `createLandscape`.
- **Bunny scene** is authored at 1x in `bunnies.js` and scaled up in code; positions are in that 1x space.
- **Landscape scatter** keeps the area in front of the camera (the path, pond, bunnies, lantern ring) clear. If you add objects, check the view from the default camera in `main.js`.
- **Lanterns** spawn in a ring around the island and never on the camera's side (`z <= 16`). Focusing one pauses it; its scroll keeps the same thumbnail texture.
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

Edit `public/data.json` (`text`) and put JPEGs in `public/images/`, then run `npm run optimize`. It writes the `.webp` photo and thumbnail, fills in the `image`/`thumb` paths, and adds an entry (caption = file name) for any new photo. The lantern count is the second argument to `createLanterns` in `main.js`. If there are fewer entries than lanterns, entries repeat.

### Per-subdomain sites

The same page serves different content per subdomain. `src/site.js` reads the first hostname label; if it is a UUID it loads `/sites/<uuid>/data.json`, otherwise (or if that file is missing) the default `/data.json`. `?site=<uuid>` does the same on hosts without wildcard subdomains (localhost, `*.vercel.app` previews); `<uuid>.localhost:5173` also works locally.

1. `npm run new-site -- "Title"` creates `public/sites/<uuid>/`.
2. Put JPEGs in its `images/`, run `npm run optimize`, then edit the captions in its `data.json`.
3. Commit and push; the site is live at `https://<uuid>.<domain>`.

Photo paths in a site's `data.json` are relative to that file. A path starting with `/` points at shared files (for example `/images/...` from the default set) and `optimize` leaves it alone. `title` sets the page title.

### Admin dashboard

`admin.html` + `src/admin/` is a second Vite entry, served at `/admin.html`. It signs in with Supabase Auth (email/password) and does CRUD on `sites` and `lanterns` plus photo upload/replace/delete in the storage bucket. Photos are resized to WebP in the browser (`src/admin/images.js`, same sizes as `npm run optimize`) and stored as `<uuid>/<random>.webp` + `<uuid>/thumbs/<random>.webp`. Needs `VITE_SUPABASE_*` in `.env.local`, and the write policies at the bottom of `supabase/schema.sql` (writes are limited to `authenticated`; disable public sign-ups). The service worker excludes it from precache and the navigation fallback.

It is only reachable on its own subdomain, `admin.<domain>` (covered by the same `*.<domain>` wildcard as the sites; `admin` is not a UUID so it never collides with a site). `vercel.json` redirects `/` to `/admin.html` on that host and redirects `/admin.html` to `/` on every other host, and adds `noindex`/`no-store`/`X-Frame-Options`. `src/admin/main.js` also refuses to run off an `admin.*` host (localhost is allowed in dev). `*.vercel.app` hosts can't serve it. The admin JS chunk is still fetchable by URL on any host, but it holds no secrets (the publishable key is public) and every write needs a signed-in user.

## Deployment

**Vercel**, through its GitHub integration. Every push to `main` triggers a Production deploy to https://three-lantern.vercel.app. Deploys show up as GitHub Deployments created by `vercel[bot]`. The repo has no GitHub Actions workflow; `vercel.json` only holds the admin host rules, and the Vercel project otherwise uses its settings for a Vite project (build `npm run build`, output `dist/`).

**Environment variables** are not read from `.env.local` (git-ignored) on Vercel. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in Vercel → Settings → Environment Variables for **Production and Preview**, then redeploy; without them the site silently falls back to the static files and the dashboard shows an error. Never put `SUPABASE_SECRET_KEY` there; it is only for the local `npm run migrate`.

**Temporary `admin` branch.** Until `admin.<domain>` exists, the dashboard is served from the `admin` git branch, which Vercel builds as a Preview (alias `three-lantern-git-admin-<team>.vercel.app`, behind Vercel's deployment protection). That branch differs from `main` in exactly two files: `vercel.json` redirects `/` to `/admin.html` on every host, and the host check in `src/admin/main.js` also accepts `*.vercel.app`. **Never merge `admin` into `main`** (it would expose the dashboard on the public site); bring dashboard changes over by merging `main` into `admin`. When the custom domain is ready, delete the branch (`git push origin --delete admin`).

Subdomain sites need a custom domain with a wildcard: add both `example.com` and `*.example.com` to the Vercel project. Wildcard domains require the domain to use Vercel's nameservers. `*.vercel.app` can't serve them, so use `?site=<uuid>` there.

Release steps:

1. Make the change and check it locally with `npm run dev`.
2. Run `npm run build` to make sure the production build succeeds. You can check the result with `npm run preview`.
3. Commit only the source changes (`src/`, `public/`, `scripts/`, `index.html`, config files). **Don't commit `dist/`.** Vercel runs the build itself.
4. Push to `main`. Vercel builds and deploys automatically. Check the deploy status on the commit in GitHub or in the Vercel dashboard.

Only commit or push when the user asks you to.

### PWA and caching

- `vite-plugin-pwa` generates `sw.js` with `registerType: 'autoUpdate'`. Workbox precaches `js, css, html, ico, png, svg` (not `models/`, `images/` or `sites/`); photos and any model files are cached CacheFirst at runtime (caches `images` and `models`, 60 entries, 30 days).
- After a deploy, returning visitors may see the old version until the service worker updates. If a change doesn't seem to show up, hard-reload or clear site data before assuming the deploy failed.
- If you replace a photo, give it a new filename so clients don't keep serving the cached copy for 30 days.

## Gotchas

- Keep photos small. `npm run optimize` produces ~1024px WebP for the popup-size image and 384x512 thumbnails for the banner. Don't commit multi-megabyte JPEGs as the displayed images.
- `public/images/*.jpeg` are only the sources for `npm run optimize`; the app loads the `.webp` files.
- The PWA plugin injects `registerSW.js` (`injectRegister: 'script'`). That is the only service-worker registration; don't add another one in `main.js`.
- The renderer uses `antialias: false` and 4x MSAA on the `EffectComposer` target, with `OutputPass` doing tone mapping and sRGB conversion. Keep `OutputPass` last; materials and canvas textures are authored for it (sRGB textures use `THREE.SRGBColorSpace`).
- In dev, Vite's server doesn't serve `sw.js`, so a "service worker registration failed" console error is expected there.
- GSAP lag smoothing makes tweens crawl at very low frame rates (for example headless SwiftShader). When testing headless, call `gsap.ticker.lagSmoothing(0)` in the dev console.
