<script setup lang="ts">
/**
 * Full activity detail, shown as a bottom sheet when a card is tapped.
 * Shows every field plus actions: save/remove for the active kid, add this one
 * event to the calendar, and open the registration link.
 */
import { computed, onMounted, onBeforeUnmount, ref, watch, nextTick } from 'vue'
import { state, selectedActivity, closeActivity, activeKid, isSaved, toggleSave } from '../store'
import { formatDateRange, formatTime } from '../utils/dates'
import { CATEGORY_META } from '../utils/categories'
import { downloadIcs } from '../services/ics'
import Icon from './Icon.vue'

const activity = computed(() => selectedActivity())
const kid = computed(() => activeKid())
const saved = computed(() =>
  !!kid.value && !!activity.value && isSaved(kid.value.id, activity.value.id)
)
const multiDay = computed(
  () => !!activity.value && activity.value.startDate !== activity.value.endDate
)

const sheet = ref<HTMLElement | null>(null)
// The element focused before the sheet opened, so we can restore it on close.
let lastFocused: HTMLElement | null = null

function focusables(): HTMLElement[] {
  if (!sheet.value) return []
  return Array.from(
    sheet.value.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
  ).filter((el) => el.offsetParent !== null || el === document.activeElement)
}

function onKey(e: KeyboardEvent) {
  if (!activity.value) return
  if (e.key === 'Escape') {
    closeActivity()
    return
  }
  if (e.key === 'Tab') {
    // Trap focus within the sheet.
    const items = focusables()
    if (!items.length) return
    const first = items[0]
    const last = items[items.length - 1]
    const active = document.activeElement as HTMLElement | null
    if (e.shiftKey && (active === first || !sheet.value?.contains(active))) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && active === last) {
      e.preventDefault()
      first.focus()
    }
  }
}

// Lock background scroll and move focus into the sheet while it's open;
// restore both when it closes.
watch(activity, (now, prev) => {
  if (now && !prev) {
    lastFocused = document.activeElement as HTMLElement | null
    document.body.classList.add('modal-open')
    nextTick(() => {
      const first = focusables()[0]
      first?.focus()
    })
  } else if (!now && prev) {
    document.body.classList.remove('modal-open')
    lastFocused?.focus?.()
    lastFocused = null
  }
})

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  document.body.classList.remove('modal-open')
})

function exportOne() {
  const a = activity.value
  if (!a) return
  const safe = a.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  downloadIcs(`${safe || 'activity'}.ics`, [a])
}

function mapsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
}
</script>

<template>
  <Transition name="sheet">
    <div v-if="activity" class="modal-overlay" @click.self="closeActivity()">
      <section ref="sheet" class="sheet" role="dialog" aria-modal="true" :aria-label="activity.name">
        <div class="sheet-bar">
          <span class="sheet-grip" />
          <button class="install-x sheet-close" aria-label="Close" @click="closeActivity()">✕</button>
        </div>

        <div class="sheet-body">
          <h2 class="detail-title">{{ activity.name }}</h2>
          <p class="detail-provider">
            <Icon name="pin" :size="15" /> {{ activity.provider }} · {{ activity.suburb }}, Christchurch
          </p>

          <div class="detail-meta">
            <span class="meta">
              <Icon name="calendar" :size="15" />
              {{ formatDateRange(activity.startDate, activity.endDate) }}
            </span>
            <span v-if="activity.sessionTimes" class="meta">
              <Icon name="clock" :size="15" />
              {{ multiDay ? 'Daily ' : '' }}{{ formatTime(activity.sessionTimes.start) }}–{{ formatTime(activity.sessionTimes.end) }}
            </span>
          </div>

          <div class="classify detail-tags">
            <span class="class-tag age">{{ activity.ageMin }}–{{ activity.ageMax }} yrs</span>
            <span class="class-tag" :class="activity.cost === 'free' ? 'free' : 'paid'">
              {{ activity.cost === 'free' ? 'Free' : `$${activity.price}` }}
            </span>
            <span
              v-for="c in activity.categories"
              :key="c"
              class="class-tag cat"
              :style="{ background: CATEGORY_META[c].bg, color: CATEGORY_META[c].color }"
            ><Icon :name="CATEGORY_META[c].icon" :size="13" />{{ CATEGORY_META[c].label }}</span>
          </div>

          <p class="detail-desc">{{ activity.description }}</p>

          <!-- Booking -->
          <div class="detail-line">
            <span class="overline">Booking</span>
            <template v-if="activity.registrationRequired && activity.registrationUrl">
              <a :href="activity.registrationUrl" target="_blank" rel="noopener noreferrer" class="reg-link">
                Register / book <Icon name="arrow" :size="14" />
              </a>
            </template>
            <span v-else-if="activity.registrationRequired" class="reg-note">Booking required</span>
            <span v-else class="reg-note ok"><Icon name="check" :size="14" /> No booking needed — just turn up</span>
          </div>

          <!-- Location map link -->
          <div class="detail-line" v-if="activity.lat && activity.lng">
            <span class="overline">Location</span>
            <a :href="mapsUrl(activity.lat, activity.lng)" target="_blank" rel="noopener noreferrer" class="reg-link">
              View on map <Icon name="arrow" :size="14" />
            </a>
          </div>

          <!-- Actions -->
          <div class="detail-actions">
            <button
              v-if="kid"
              class="primary-btn"
              :class="{ ghost: saved }"
              @click="toggleSave(kid.id, activity.id)"
            >
              <Icon name="heart" :size="16" :class="{ filled: saved }" />
              {{ saved ? `Saved for ${kid.name}` : `Save for ${kid.name}` }}
            </button>
            <p v-else class="hint detail-hint">Pick a kid on the Browse tab to save this.</p>

            <button class="primary-btn alt" @click="exportOne">
              <Icon name="download" :size="16" /> Add to calendar
            </button>
          </div>

          <p class="muted small" v-if="state.kids.length === 0">
            Tip: add a kid to save activities and build a plan.
          </p>
        </div>
      </section>
    </div>
  </Transition>
</template>
