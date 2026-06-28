import { createApp } from 'vue'
import App from './App.vue'
import './style.css'

// Register the PWA service worker (auto-update). Injected by vite-plugin-pwa.
import { registerSW } from 'virtual:pwa-register'
registerSW({ immediate: true })

// Capture the install prompt as early as possible (it can fire before Vue
// mounts). The InstallPrompt component reads this and listens for the event.
;(window as any).__deferredInstall = null
window.addEventListener('beforeinstallprompt', (e: Event) => {
  e.preventDefault()
  ;(window as any).__deferredInstall = e
  window.dispatchEvent(new Event('bip-ready'))
})

createApp(App).mount('#app')
