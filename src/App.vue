<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { state, init, closeEventForm, editingEvent } from './store'
import { readPlanFromHash } from './services/share'
import KidsView from './views/KidsView.vue'
import BrowseView from './views/BrowseView.vue'
import SavedView from './views/SavedView.vue'
import Icon from './components/Icon.vue'
import InstallPrompt from './components/InstallPrompt.vue'
import ActivityDetail from './components/ActivityDetail.vue'
import ImportPlan from './components/ImportPlan.vue'
import CustomEventForm from './components/CustomEventForm.vue'

const eventFormKids = computed(() => (state.activeKidId ? [state.activeKidId] : []))

type Tab = 'kids' | 'browse' | 'saved'
const tab = ref<Tab>('browse')

const savedCount = computed(() => state.saved.length)

onMounted(() => {
  init().then(() => {
    // A shared plan in the URL takes priority over the empty-state nudge.
    const incoming = readPlanFromHash()
    if (incoming) {
      state.pendingImport = incoming
    } else if (!state.kids.length) {
      tab.value = 'kids'
    }
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
                <stop offset="0" stop-color="#ff9276" />
                <stop offset="1" stop-color="#ff7a6b" />
              </linearGradient>
            </defs>
            <rect width="48" height="48" rx="14" fill="url(#mkbg)" />
            <rect x="11" y="14" width="26" height="20" rx="5" fill="#fff" />
            <rect x="11" y="14" width="26" height="6" rx="3" fill="#ffe69a" />
            <circle cx="24" cy="26" r="4.4" fill="#ffd23f" />
            <path d="M22.4 26.4s0.7 1 1.6 1 1.6-1 1.6-1" fill="none" stroke="#e0563f"
              stroke-width="1.1" stroke-linecap="round" />
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
  <ImportPlan />
  <CustomEventForm
    :open="state.eventForm.open"
    :editing="editingEvent()"
    :default-kid-ids="eventFormKids"
    @close="closeEventForm"
  />

  <Transition name="toast">
    <div v-if="state.toast" class="toast" role="status" aria-live="polite">{{ state.toast }}</div>
  </Transition>
</template>
