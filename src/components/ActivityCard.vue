<script setup lang="ts">
import type { Activity } from '../types'
import { formatDateRange, formatTime } from '../utils/dates'
import { CATEGORY_META } from '../utils/categories'

defineProps<{
  activity: Activity
  /** Whether this activity is saved for the active kid. */
  saved?: boolean
  /** Show the save toggle (hidden when there's no active kid). */
  canSave?: boolean
  /** Show a "Remove" action (used in the saved list). */
  removable?: boolean
}>()

const emit = defineEmits<{ toggleSave: []; remove: [] }>()
</script>

<template>
  <article class="card activity">
    <!-- Coloured accent rail tinted by the first category -->
    <span
      class="accent"
      :style="{ background: CATEGORY_META[activity.categories[0]]?.color }"
    />

    <div class="activity-body">
      <div class="card-head">
        <h2>{{ activity.name }}</h2>
        <button
          v-if="canSave"
          class="save-btn"
          :class="{ on: saved }"
          :aria-pressed="saved"
          :aria-label="saved ? 'Saved — tap to remove' : 'Save for this kid'"
          @click="emit('toggleSave')"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path
              d="M12 21s-7.5-4.6-10-9.3C.3 8 2 4.5 5.4 4.5c2 0 3.4 1.2 4.2 2.4l.4.6.4-.6c.8-1.2 2.2-2.4 4.2-2.4C22 4.5 23.7 8 22 11.7 19.5 16.4 12 21 12 21z"
              :fill="saved ? 'currentColor' : 'none'"
              stroke="currentColor"
              stroke-width="1.8"
            />
          </svg>
        </button>
      </div>

      <p class="provider">
        <span class="pin">📍</span>{{ activity.provider }} · {{ activity.suburb }}
      </p>

      <div class="meta-row">
        <span class="meta-pill">
          📅 {{ formatDateRange(activity.startDate, activity.endDate) }}
        </span>
        <span v-if="activity.sessionTimes" class="meta-pill">
          🕘 {{ formatTime(activity.sessionTimes.start) }}–{{ formatTime(activity.sessionTimes.end) }}
        </span>
      </div>

      <p class="desc">{{ activity.description }}</p>

      <div class="tags">
        <span class="tag age">Ages {{ activity.ageMin }}–{{ activity.ageMax }}</span>
        <span class="tag" :class="activity.cost === 'free' ? 'cost-free' : 'cost-paid'">
          {{ activity.cost === 'free' ? 'Free' : `$${activity.price}` }}
        </span>
        <span
          v-for="c in activity.categories"
          :key="c"
          class="tag cat"
          :style="{ color: CATEGORY_META[c].color, background: CATEGORY_META[c].bg }"
        >
          {{ CATEGORY_META[c].icon }} {{ CATEGORY_META[c].label }}
        </span>
      </div>

      <div class="card-actions">
        <a
          v-if="activity.registrationRequired && activity.registrationUrl"
          :href="activity.registrationUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="reg-link"
        >
          Register ↗
        </a>
        <span v-else-if="activity.registrationRequired" class="reg-note">
          ✎ Registration required
        </span>
        <span v-else class="reg-note free-drop">✓ Just turn up</span>

        <button v-if="removable" class="remove-btn" @click="emit('remove')">
          Remove
        </button>
      </div>
    </div>
  </article>
</template>
