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
    <h1>Christchurch Holiday Planner</h1>
  </header>

  <main v-if="state.ready" class="app-main">
    <KidsView v-show="tab === 'kids'" />
    <BrowseView v-show="tab === 'browse'" />
    <SavedView v-show="tab === 'saved'" />
  </main>
  <main v-else class="app-main">
    <p class="empty">Loading…</p>
  </main>

  <nav class="tabbar">
    <button
      v-for="t in tabs"
      :key="t.id"
      class="tab"
      :class="{ on: tab === t.id }"
      @click="tab = t.id"
    >
      <span class="tab-icon">{{ t.icon }}</span>
      <span class="tab-label">
        {{ t.label }}
        <span v-if="t.id === 'saved' && savedCount" class="badge">{{ savedCount }}</span>
      </span>
    </button>
  </nav>
</template>
