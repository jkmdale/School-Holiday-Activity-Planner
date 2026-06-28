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
        name: 'Christchurch Holiday Planner',
        short_name: 'Holiday Planner',
        description:
          'Plan Christchurch school holidays: filter activities by your kids, save them, export to your calendar. All data stays on your device.',
        theme_color: '#14b8a6',
        background_color: '#fbe8cf',
        display: 'standalone',
        orientation: 'portrait',
        start_url: base,
        scope: base,
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-512.png',
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
