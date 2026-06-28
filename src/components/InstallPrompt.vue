<script setup lang="ts">
/**
 * "Add to Home Screen" prompt.
 *  - Android/Chrome/desktop: uses the captured beforeinstallprompt event to
 *    trigger the native install dialog.
 *  - iOS Safari: no programmatic install exists, so we show the manual
 *    Share → Add to Home Screen instructions instead.
 * Hidden when already installed (standalone) or previously dismissed.
 */
import { onMounted, onBeforeUnmount, ref } from 'vue'
import Icon from './Icon.vue'

const DISMISS_KEY = 'chp.install.dismissed.v1'

const show = ref(false)
const isIos = ref(false)
const deferred = ref<any>(null)

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true
  )
}

function onBipReady() {
  deferred.value = (window as any).__deferredInstall
  if (deferred.value) show.value = true
}

function onInstalled() {
  show.value = false
}

onMounted(() => {
  if (isStandalone() || localStorage.getItem(DISMISS_KEY)) return

  const ua = navigator.userAgent || ''
  const ios = /iphone|ipad|ipod/i.test(ua)
  const safari = /^((?!chrome|android|crios|fxios|edgios).)*safari/i.test(ua)
  if (ios && safari) {
    isIos.value = true
    // Small delay so it doesn't slam in on first paint.
    window.setTimeout(() => (show.value = true), 1200)
  }

  // Android/desktop: the event may already be captured in main.ts.
  if ((window as any).__deferredInstall) onBipReady()
  window.addEventListener('bip-ready', onBipReady)
  window.addEventListener('appinstalled', onInstalled)
})

onBeforeUnmount(() => {
  window.removeEventListener('bip-ready', onBipReady)
  window.removeEventListener('appinstalled', onInstalled)
})

async function install() {
  if (!deferred.value) return
  deferred.value.prompt()
  const { outcome } = await deferred.value.userChoice
  deferred.value = null
  show.value = false
  if (outcome !== 'accepted') localStorage.setItem(DISMISS_KEY, '1')
}

function dismiss() {
  show.value = false
  localStorage.setItem(DISMISS_KEY, '1')
}
</script>

<template>
  <Transition name="slide-up">
    <div v-if="show" class="install-banner" role="dialog" aria-label="Install app">
      <span class="install-mark" aria-hidden="true">
        <Icon name="download" :size="22" />
      </span>

      <div class="install-text">
        <strong>Add to your home screen</strong>
        <span v-if="isIos" class="install-sub">
          Tap the Share button, then “Add to Home Screen”.
        </span>
        <span v-else class="install-sub">
          Install the planner for one-tap access and offline use.
        </span>
      </div>

      <div class="install-actions">
        <button v-if="!isIos" class="primary-btn install-btn" @click="install">Install</button>
        <button class="install-x" aria-label="Dismiss" @click="dismiss">✕</button>
      </div>
    </div>
  </Transition>
</template>
