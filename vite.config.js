import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
// `vite build --mode native` builds the iOS app's bundle (npm run ios:sync).
export default defineConfig(({ mode }) => ({
  // Which build an error report came from (Vercel and GitHub set the commit;
  // the app build passes its version).
  define: { __RELEASE__: JSON.stringify((process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || process.env.APP_RELEASE || 'dev').slice(0, 12)) },
  plugins: [
    react(),
    // Installable PWA shell: precaches the built app (JS/CSS/HTML/icons) so
    // the UI itself loads instantly and even offline, like a native app icon
    // on the home screen. Deliberately does NOT cache Supabase API responses
    // (auth, orders, prices etc.) — those must always hit the network live,
    // same as the web app today, so nobody ever sees stale escrow/price data.
    VitePWA({
      // The iOS app ships its files inside the app; a service worker can't run there.
      disable: mode === 'native',
      registerType: 'autoUpdate',
      // Registering the service worker must never hold up the first paint.
      injectRegister: 'script-defer',
      manifest: {
        name: 'MAILLOT — your football shirt collection',
        short_name: 'MAILLOT',
        description: 'Capture your football shirt collection, see what it’s worth and have it with you everywhere.',
        // ?app=3 marks installs made with the green app icon (app/AppUpdates.tsx).
        start_url: '/?app=3',
        display: 'standalone',
        background_color: '#FFFFFF',
        theme_color: '#FFFFFF',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}', 'favicon.png'],
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
}))
