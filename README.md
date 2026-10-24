# Three Lantern

Floating paper lanterns rise around a sakura tree under a starry sky. Click a lantern to fly to it and see its photo and caption.

**Live:** https://three-lantern.vercel.app

Built with [Three.js](https://threejs.org), [GSAP](https://gsap.com) and [Vite](https://vite.dev), and installable as a PWA.

## Getting started

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # production build into dist/
npm run preview   # serve the build locally
```

## Customizing

- **Lantern photos and captions:** edit `public/data.json` (`[{ id, image, text }]`) and put images in `public/images/`. Keep images around 1280px wide and under about 400 KB.
- **Scene settings** such as lantern count, speeds, camera, bloom and colors are all in `src/config.js`.

## Project structure

```
index.html                 Page shell (loader, popup, hint)
src/
  main.js                  Entry: wires everything together and runs the render loop
  config.js                All tunable values
  styles.css               UI styles
  core/
    renderer.js            Renderer, camera, orbit controls
    postprocessing.js      Bloom + color-shift passes
    loading.js             LoadingManager + loading screen
  objects/                 Things in the scene
    lights.js              All scene lights, background, fog
    floor.js
    stars.js
    tree.js
    lanterns.js            Lantern model, glow, banner, animation
  interaction/
    picker.js              Pointer raycasting (click + hover)
    cameraRig.js           Camera fly-to / reset
  ui/
    popup.js               Lantern detail popup
  shaders/
    colorShift.js
public/
  data.json                Lantern content
  images/                  Lantern photos
  models/                  lantern.glb, sakura_tree.glb
  icon.svg                 Favicon / PWA icon
```

## Deployment

Pushing to `main` deploys to Vercel automatically.
