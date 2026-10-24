import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const cacheFirst = (cacheName, test, maxEntries) => ({
  urlPattern: ({ url }) => test.test(url.pathname),
  handler: "CacheFirst",
  options: {
    cacheName,
    expiration: { maxEntries, maxAgeSeconds: 60 * 60 * 24 * 30 },
    cacheableResponse: { statuses: [0, 200] },
  },
});

export default defineConfig({
  build: {
    rollupOptions: {
      output: { manualChunks: { three: ["three"], gsap: ["gsap"] } },
    },
  },
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        // Big binary assets are cached at runtime instead of precached
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
        globIgnores: ["models/**", "images/**"],
        runtimeCaching: [
          cacheFirst("models", /\.(glb|obj)$/i, 60),
          cacheFirst("images", /\.(webp|jpe?g|png)$/i, 60),
        ],
      },
    }),
  ],
});
