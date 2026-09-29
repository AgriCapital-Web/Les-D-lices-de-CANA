import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.svg'],
      manifest: {
        name: 'Les Délices de CANA',
        short_name: 'CANA',
        description: 'Menu du jour et réservations — Les Délices de CANA',
        theme_color: '#2B170F',
        background_color: '#F8F2E8',
        display: 'standalone',
        lang: 'fr',
        start_url: '/',
        icons: [
          { src: '/logo.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }
        ]
      },
      workbox: {
        navigateFallback: '/',
        globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2}']
      }
    })
  ]
});