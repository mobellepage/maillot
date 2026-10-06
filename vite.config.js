import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // Which build an error report came from (Vercel and GitHub set the commit).
  define: { __RELEASE__: JSON.stringify((process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || 'dev').slice(0, 12)) },
  plugins: [
    react(),
    // Installable PWA shell: precaches the built app (JS/CSS/HTML/icons) so
    // the UI itself loads instantly and even offline, like a native app icon
    // on the home screen. Deliberately does NOT cache Supabase API responses
    // (auth, orders, prices etc.) — those must always hit the network live,
    // same as the web app today, so nobody ever sees stale escrow/price data.
    VitePWA({
      registerType: 'autoUpdate',
      // Registering the service worker must never hold up the first paint.
      injectRegister: 'script-defer',
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
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        // Offline/repeat navigations get the empty shell; prerendered pages
        // are for first visits, crawlers and link previews.
        navigateFallback: '/app.html'
      }
    })
  ],
  build: {
    // app.html is the same shell as index.html, kept empty: index.html gets
    // the prerendered home page (scripts/prerender.mjs), app.html is what
    // every other route falls back to.
    rollupOptions: { input: { main: 'index.html', app: 'app.html' } }
  },
  test: {
    // Unit tests only; e2e/ is Playwright's.
    include: ['src/**/*.test.{js,jsx}']
  }
})
