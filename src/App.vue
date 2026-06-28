<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { state, init } from './store'
import KidsView from './views/KidsView.vue'
import BrowseView from './views/BrowseView.vue'
import SavedView from './views/SavedView.vue'

type Tab = 'kids' | 'browse' | 'saved'
const tab = ref<Tab>('browse')

const savedCount = computed(() => state.saved.length)

onMounted(() => {
  init().then(() => {
    // Send first-time users to onboarding.
    if (!state.kids.length) tab.value = 'kids'
  })
})

const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: 'browse', label: 'Browse', icon: '🔎' },
  { id: 'saved', label: 'Plan', icon: '♥' },
  { id: 'kids', label: 'Kids', icon: '🧒' }
]
</script>

<template>
  <header class="app-header">
    <div class="app-header-inner">
      <span class="app-logo" aria-hidden="true">
        <svg viewBox="0 0 64 64" width="30" height="30">
          <rect x="10" y="14" width="44" height="42" rx="8" fill="#ffffff" />
          <rect x="10" y="14" width="44" height="12" rx="8" fill="rgba(255,255,255,.55)" />
          <path d="M24 38 l6 6 l12 -13" fill="none" stroke="#0f766e" stroke-width="5"
            stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </span>
      <div>
        <h1>Holiday Planner</h1>
        <p class="app-sub">Christchurch · school holidays, sorted</p>
      </div>
    </div>
  </header>

  <main v-if="state.ready" class="app-main">
    <Transition name="fade" mode="out-in">
      <KidsView v-if="tab === 'kids'" key="kids" />
      <BrowseView v-else-if="tab === 'browse'" key="browse" />
      <SavedView v-else key="saved" />
    </Transition>
  </main>
  <main v-else class="app-main">
    <div class="skeleton-list">
      <div v-for="n in 3" :key="n" class="skeleton-card" />
    </div>
  </main>

  <nav class="tabbar">
    <div class="tabbar-inner">
      <button
        v-for="t in tabs"
        :key="t.id"
        class="tab"
        :class="{ on: tab === t.id }"
        @click="tab = t.id"
      >
        <span class="tab-icon">
          {{ t.icon }}
          <span v-if="t.id === 'saved' && savedCount" class="badge">{{ savedCount }}</span>
        </span>
        <span class="tab-label">{{ t.label }}</span>
      </button>
    </div>
  </nav>
</template>
