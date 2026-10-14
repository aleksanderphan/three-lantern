import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const DAY = 60 * 60 * 24;

export default defineConfig({
  build: {
    // Vendor code changes rarely, so keep it in its own long-cached chunk
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: { three: ['three'], gsap: ['gsap'] },
      },
    },
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script', // only service-worker registration; don't add another
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Three Lantern',
        short_name: 'Lanterns',
        description: 'Floating paper lanterns rise around a sakura tree under a starry sky.',
        theme_color: '#0a0a14',
        background_color: '#0a0a14',
        display: 'fullscreen',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
      workbox: {
        // Large models and photos are cached on first use instead of precached
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.endsWith('.glb'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'glb-models',
              expiration: { maxEntries: 5, maxAgeSeconds: 30 * DAY },
            },
          },
          {
            urlPattern: ({ url }) => /\.(jpe?g|webp|avif)$/i.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'images',
              expiration: { maxEntries: 60, maxAgeSeconds: 30 * DAY },
            },
          },
        ],
      },
    }),
  ],
});
