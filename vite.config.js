import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // The API must always reach the server, never the cached app shell.
      workbox: { navigateFallbackDenylist: [/^\/api\//] },
      includeAssets: ['apple-touch-icon.png'],
      manifest: {
        name: 'Giftoteca',
        short_name: 'Giftoteca',
        description: 'Ideas de regalos por persona y ocasión',
        theme_color: '#0b0e1c',
        background_color: '#0b0e1c',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
