<script setup lang="ts">
/**
 * "Suggest a day" sheet. Proposes one day in the upcoming break with a small,
 * non-clashing combo of activities that suit the chosen kid(s), and lets the
 * parent save the lot or shuffle to another day.
 */
import { computed, ref, watch } from 'vue'
import type { Category } from '../types'
import { state, isSaved, toggleSave, openActivity, notify } from '../store'
import { currentOrNextBreak, formatDate, formatTime, todayISO } from '../utils/dates'
import { suggestDay } from '../utils/suggest'
import { useModal } from '../composables/useModal'
import Icon from './Icon.vue'

const props = defineProps<{ open: boolean; kidIds: string[] }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const sheet = ref<HTMLElement | null>(null)
useModal({ isOpen: () => props.open, onClose: () => emit('close'), container: sheet })

const today = todayISO()
const excluded = ref<Set<string>>(new Set())

const kids = computed(() => state.kids.filter((k) => props.kidIds.includes(k.id)))
const ages = computed(() => kids.value.map((k) => k.age))
const interests = computed<Set<Category>>(
  () => new Set(kids.value.flatMap((k) => k.interests))
)
const brk = computed(() => currentOrNextBreak(state.holidaySets))

const suggestion = computed(() => {
  if (!props.open || !kids.value.length || !brk.value) return null
  return suggestDay(state.activities, {
    ages: ages.value,
    interests: interests.value,
    from: brk.value.brk.start,
    to: brk.value.brk.end,
    today,
    exclude: excluded.value
  })
})

// Reset the "try another day" history whenever the sheet (re)opens.
watch(
  () => props.open,
  (open) => {
    if (open) excluded.value = new Set()
  }
)

function tryAnother() {
  if (suggestion.value) {
    excluded.value = new Set([...excluded.value, suggestion.value.date])
  }
}

function saveAll() {
  const s = suggestion.value
  if (!s) return
  let added = 0
  for (const a of s.activities) {
    for (const k of kids.value) {
      if (!isSaved(k.id, a.id)) {
        toggleSave(k.id, a.id)
        added++
      }
    }
  }
  notify(added ? `Saved ${s.activities.length} activities for ${formatDate(s.date)}.` : 'Already in your plan.')
  emit('close')
}
</script>

<template>
  <Transition name="sheet">
    <div v-if="open" class="modal-overlay" @click.self="emit('close')">
      <section ref="sheet" class="sheet" role="dialog" aria-modal="true" aria-label="Suggest a day">
        <div class="sheet-bar">
          <span class="sheet-grip" />
          <button class="install-x sheet-close" aria-label="Close" @click="emit('close')">✕</button>
        </div>
        <div class="sheet-body">
          <h2 class="detail-title">Suggest a day</h2>

          <template v-if="!kids.length">
            <p class="hint">Pick a kid on the Browse tab first, then we'll plan a day for them.</p>
          </template>

          <template v-else-if="!suggestion">
            <p class="hint">
              No full day fits {{ kids.length > 1 ? 'all the kids' : kids[0].name }} in the
              {{ brk ? brk.brk.name.toLowerCase() + ' break' : 'upcoming break' }} just yet.
              Try turning off interest matching or saving activities manually.
            </p>
          </template>

          <template v-else>
            <p class="detail-provider">
              <Icon name="calendar" :size="15" />
              {{ formatDate(suggestion.date) }} ·
              for {{ kids.map((k) => k.name).join(', ') }}
            </p>

            <div class="suggest-list">
              <button
                v-for="a in suggestion.activities"
                :key="a.id"
                class="suggest-item"
                @click="openActivity(a.id)"
              >
                <div class="suggest-when">
                  <Icon name="clock" :size="14" />
                  {{ a.sessionTimes ? `${formatTime(a.sessionTimes.start)}–${formatTime(a.sessionTimes.end)}` : 'Any time' }}
                </div>
                <div class="suggest-name">{{ a.name }}</div>
                <div class="suggest-sub">
                  {{ a.provider }} · {{ a.suburb }} · {{ a.cost === 'free' ? 'Free' : '$' + a.price }}
                </div>
              </button>
            </div>

            <div class="detail-actions">
              <button class="primary-btn" @click="saveAll">
                <Icon name="heart" :size="16" /> Save this day
              </button>
              <button class="primary-btn ghost" @click="tryAnother">
                <Icon name="arrow" :size="16" /> Try another day
              </button>
            </div>
          </template>
        </div>
      </section>
    </div>
  </Transition>
</template>
