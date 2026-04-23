import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'icons/icon-192.png',
        'icons/icon-512.png',
        'icons/icon-maskable-512.png',
        'icons/apple-touch-icon-180.png',
        'sounds/primary.mp3',
        'sounds/secondary.mp3',
        'sounds/danger.mp3',
        'sounds/flip.mp3',
        'sounds/eliminate.mp3',
        'sounds/win.mp3',
      ],
      manifest: {
        name: 'Undercover',
        short_name: 'Undercover',
        description: 'Offline party game of secret words and hidden infiltrators.',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
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
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest,json,mp3}'],
        // The winner fanfare mp3 is ~260 KB which is above workbox's default
        // 2 MB precache cap per file, but well under it. Bump the total cache
        // size to a comfortable 10 MB to leave room for future growth.
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
      },
    }),
  ],
});
