// vite.config.js
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // Don’t precache giant .glb files
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],

        // Tell workbox how to cache .glb at runtime
        runtimeCaching: [
          {
            // match any request ending with .glb
            urlPattern: ({ url }) => url.pathname.endsWith('.glb'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'glb-models',
              expiration: {
                maxEntries: 5, // keep up to 2 models
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
        ],
      },
    }),
  ],
});
