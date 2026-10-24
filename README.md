# Three Lantern

A moonlit night scene: a sakura island with a little bunny picnic, a landscape of hills, a stone path, a pond with a torii gate, fireflies, and paper lanterns floating up into the sky. Click a lantern to fly to the scroll hanging from it and see its photo and caption.

**Live:** https://three-lantern.vercel.app

Built with [Three.js](https://threejs.org), [GSAP](https://gsap.com) and [Vite](https://vite.dev), and installable as a PWA. The whole scene is generated in code, so there are no 3D model files to download.

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build into dist/
npm run preview    # serve the build locally
npm run optimize   # regenerate WebP photos + thumbnails from public/images/*.jpeg
```

## Customizing

- **Lantern photos and captions:** put JPEGs in `public/images/`, add or edit entries in `public/data.json` (`text`), then run `npm run optimize`. It creates the WebP images and fills in the `image` and `thumb` paths.
- **Scene look and layout:** tweak the modules in `src/objects/`. For example `landscape.js` (pond position, amount of grass and flowers), `bunnies.js` (bunny layout and scale) and `tree.js` (`TREE_SCALE`, blossom colors).
- **Lantern count:** the second argument to `createLanterns` in `src/main.js`.

## Project structure

```
index.html                 Page shell: loader, close button, hint, inline CSS
src/
  main.js                  Renderer, lights, post-processing, lantern zoom interaction, render loop
  objects/
    tree.js                Island, trunk, blossoms, falling petals
    bunnies.js             Bunnies, dango, stone lanterns
    landscape.js           Terrain, path, pond + torii, trees, rocks, grass, flowers, fireflies
    lanterns.js            Floating lanterns and their photo scrolls
    sky.js                 Sky dome, moon, horizon hills
    stars.js               Star dome
scripts/
  optimize-assets.mjs      Photo resizing / WebP conversion
public/
  data.json                Lantern content
  images/                  Source JPEGs + generated WebP and thumbnails
  icon.svg                 Favicon / PWA icon
```

On phones and tablets the scene drops to a lighter quality tier (no shadows or bloom, less scenery), and the resolution adapts to keep the frame rate smooth.

## Deployment

Pushing to `main` deploys to Vercel automatically.
