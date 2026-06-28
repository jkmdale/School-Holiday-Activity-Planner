<script setup lang="ts">
import type { Activity } from '../types'
import { formatDateRange, formatTime } from '../utils/dates'

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
  <article class="card">
    <div class="card-head">
      <h2>{{ activity.name }}</h2>
      <button
        v-if="canSave"
        class="save-btn"
        :class="{ on: saved }"
        :aria-pressed="saved"
        :title="saved ? 'Saved — tap to remove' : 'Save for this kid'"
        @click="emit('toggleSave')"
      >
        {{ saved ? '♥' : '♡' }}
      </button>
    </div>

    <p class="provider">{{ activity.provider }} · {{ activity.suburb }}</p>

    <p class="when">
      📅 {{ formatDateRange(activity.startDate, activity.endDate) }}
      <template v-if="activity.sessionTimes">
        · {{ formatTime(activity.sessionTimes.start) }}–{{ formatTime(activity.sessionTimes.end) }}
      </template>
    </p>

    <p class="desc">{{ activity.description }}</p>

    <div class="tags">
      <span class="tag">Ages {{ activity.ageMin }}–{{ activity.ageMax }}</span>
      <span class="tag" :class="`cost-${activity.cost}`">
        {{ activity.cost === 'free' ? 'Free' : `$${activity.price}` }}
      </span>
      <span v-for="c in activity.categories" :key="c" class="tag">{{ c }}</span>
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
        Registration required
      </span>
      <button v-if="removable" class="remove-btn" @click="emit('remove')">
        Remove
      </button>
    </div>
  </article>
</template>
