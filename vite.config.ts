import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * La aplicación se instala como PWA y guarda en caché el shell y los recursos
 * de PDF.js. Los recursos de OCR (unos 12 MB) se cachean la primera vez que se
 * usan, para no retrasar la primera visita.
 */
export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['icons/apple-touch-icon.png', 'icons/favicon-32.png'],
      manifest: {
        name: 'Proyecto PDF — Lector local',
        short_name: 'Proyecto PDF',
        description:
          'Lector de PDF con búsqueda, selección de texto y OCR que funciona sin conexión.',
        lang: 'es',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'any',
        background_color: '#f4f5f7',
        theme_color: '#1a56db',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,mjs,svg,png,ico,woff2}'],
        globIgnores: ['ocr/**'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /\/ocr\/.*\.(?:js|gz)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'ocr-recursos',
              expiration: {
                maxEntries: 12,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
});
