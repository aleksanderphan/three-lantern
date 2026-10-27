import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const DAY = 60 * 60 * 24;

const cacheFirst = (cacheName, test, maxEntries) => ({
  urlPattern: ({ url }) => test.test(url.pathname),
  handler: "CacheFirst",
  options: {
    cacheName,
    expiration: { maxEntries, maxAgeSeconds: 30 * DAY },
    cacheableResponse: { statuses: [0, 200] },
  },
});

export default defineConfig({
  build: {
    // Never ship source maps: they would hand out the original scene source (Vite's default, kept explicit)
    sourcemap: false,
    // Vendor code changes rarely, so keep it in its own long-cached chunk
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      input: { main: "index.html", admin: "admin.html" },
      output: { manualChunks: { three: ["three"], gsap: ["gsap"] } },
    },
  },
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "script", // only service-worker registration; don't add another
      includeAssets: ["icon.svg"],
      manifest: {
        name: "Three Lantern",
        short_name: "Lanterns",
        description: "Floating paper lanterns rise around a sakura tree under a starry sky.",
        theme_color: "#0a0a14",
        background_color: "#0a0a14",
        display: "fullscreen",
        icons: [{ src: "icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
      },
      workbox: {
        // Large binary assets are cached on first use instead of precached
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
        globIgnores: ["models/**", "images/**", "sites/**", "admin.html"],
        // The admin page is network-only; don't let the SPA fallback serve the lantern scene for it
        navigateFallbackDenylist: [/^\/admin/],
        runtimeCaching: [
          cacheFirst("models", /\.(glb|obj)$/i, 60),
          cacheFirst("images", /\.(jpe?g|webp|avif|png)$/i, 60),
        ],
      },
    }),
  ],
});
