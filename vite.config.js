import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Installable PWA shell: precaches the built app (JS/CSS/HTML/icons) so
    // the UI itself loads instantly and even offline, like a native app icon
    // on the home screen. Deliberately does NOT cache Supabase API responses
    // (auth, orders, prices etc.) — those must always hit the network live,
    // same as the web app today, so nobody ever sees stale escrow/price data.
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'MAILLOT — Football Shirt Marketplace',
        short_name: 'MAILLOT',
        description: 'The catalogue, marketplace and price index for football shirts.',
        start_url: '/',
        display: 'standalone',
        background_color: '#0A0C0B',
        theme_color: '#0A0C0B',
        icons: [
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}']
      }
    })
  ],
})
