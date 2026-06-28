<script setup lang="ts">
/**
 * Shown when the app is opened via a co-parent share link. Confirms what will
 * be added before merging the shared plan into this device's local data.
 */
import { computed, ref } from 'vue'
import { state, importSummary, importSharedPlan, notify } from '../store'
import { clearPlanHash } from '../services/share'
import Icon from './Icon.vue'

const plan = computed(() => state.pendingImport)
const summary = computed(() => (plan.value ? importSummary(plan.value) : null))
const busy = ref(false)

async function confirmImport() {
  if (!plan.value || busy.value) return
  busy.value = true
  const s = summary.value
  await importSharedPlan(plan.value)
  clearPlanHash()
  busy.value = false
  notify(`Added ${s?.activities ?? 0} activities to your plan.`)
}

function dismiss() {
  state.pendingImport = null
  clearPlanHash()
}
</script>

<template>
  <Transition name="sheet">
    <div v-if="plan" class="modal-overlay" @click.self="dismiss">
      <section class="sheet" role="dialog" aria-modal="true" aria-label="Import shared plan">
        <div class="sheet-bar">
          <span class="sheet-grip" />
          <button class="install-x sheet-close" aria-label="Close" @click="dismiss">✕</button>
        </div>
        <div class="sheet-body">
          <h2 class="detail-title">Import shared plan</h2>
          <p class="detail-desc">
            Someone shared a holiday plan with you. Importing adds it to this device only.
          </p>

          <ul class="import-list">
            <li v-for="(k, i) in plan.kids" :key="i">
              <strong>{{ k.name }}</strong> ({{ k.age }}) ·
              {{ k.activityIds.length }} {{ k.activityIds.length === 1 ? 'activity' : 'activities' }}
            </li>
          </ul>

          <p v-if="summary" class="hint">
            Adds {{ summary.kids }} {{ summary.kids === 1 ? 'kid' : 'kids' }} and
            {{ summary.activities }} saved {{ summary.activities === 1 ? 'activity' : 'activities' }}.
            Kids you already have (same name and age) are merged, not duplicated.
          </p>

          <div class="detail-actions">
            <button class="primary-btn" :disabled="busy" @click="confirmImport">
              <Icon name="download" :size="16" /> {{ busy ? 'Importing…' : 'Import plan' }}
            </button>
            <button class="primary-btn ghost" @click="dismiss">Not now</button>
          </div>
        </div>
      </section>
    </div>
  </Transition>
</template>
