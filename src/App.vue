<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { state, init } from './store'
import KidsView from './views/KidsView.vue'
import BrowseView from './views/BrowseView.vue'
import SavedView from './views/SavedView.vue'
import Icon from './components/Icon.vue'
import InstallPrompt from './components/InstallPrompt.vue'
import ActivityDetail from './components/ActivityDetail.vue'

type Tab = 'kids' | 'browse' | 'saved'
const tab = ref<Tab>('browse')

const savedCount = computed(() => state.saved.length)

onMounted(() => {
  init().then(() => {
    if (!state.kids.length) tab.value = 'kids'
  })
})

const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: 'browse', label: 'Browse', icon: 'search' },
  { id: 'saved', label: 'Plan', icon: 'bookmark' },
  { id: 'kids', label: 'Kids', icon: 'users' }
]
</script>

<template>
  <header class="app-header">
    <div class="app-header-inner">
      <div class="wordmark">
        <span class="mark" aria-hidden="true">
          <svg viewBox="0 0 48 48" width="34" height="34">
            <defs>
              <linearGradient id="mkbg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stop-color="#6366f1" />
                <stop offset="1" stop-color="#0ea5e9" />
              </linearGradient>
            </defs>
            <rect width="48" height="48" rx="14" fill="url(#mkbg)" />
            <rect x="13" y="18" width="22" height="4.5" rx="2.25" fill="#fbbf24" />
            <path d="M16 27 l5.5 5.5 l11 -13" fill="none" stroke="#fff" stroke-width="4"
              stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </span>
        <span class="wordmark-text">Holiday&nbsp;Planner</span>
      </div>
      <span class="locale">Christchurch</span>
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
          <Icon :name="t.icon" :size="22" />
          <span v-if="t.id === 'saved' && savedCount" class="badge">{{ savedCount }}</span>
        </span>
        <span class="tab-label">{{ t.label }}</span>
      </button>
    </div>
  </nav>

  <InstallPrompt />
  <ActivityDetail />
</template>
