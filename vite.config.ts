import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

// On GitHub Pages the app is served from a repo subpath. A RELATIVE base makes
// the build work under any repo name (so renaming the repo needs no code change)
// and on any host. Locally it stays at root for the dev server.
const base = process.env.GITHUB_ACTIONS ? './' : '/'

// Installable PWA config. The service worker precaches the built app shell and
// the local JSON seed so browsing works offline once installed.
export default defineConfig({
  base,
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'Fun Days — find family fun near you',
        short_name: 'Fun Days',
        description:
          'Local family activities, all in one place. Filter by your kids, save plans, map and export to your calendar. All data stays on your device.',
        theme_color: '#FF7A6B',
        background_color: '#fff7eb',
        display: 'standalone',
        orientation: 'portrait',
        start_url: base,
        scope: base,
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: 'icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,json,ico,woff2}']
      }
    })
  ]
})
