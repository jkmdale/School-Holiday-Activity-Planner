<script setup lang="ts">
import type { Activity } from '../types'
import { formatDateRange, formatTime } from '../utils/dates'
import { CATEGORY_META } from '../utils/categories'
import Icon from './Icon.vue'

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
    <div class="card-head">
      <div class="head-text">
        <h2>{{ activity.name }}</h2>
        <p class="provider">{{ activity.provider }} · {{ activity.suburb }}</p>
      </div>
      <button
        v-if="canSave"
        class="save-btn"
        :class="{ on: saved }"
        :aria-pressed="saved"
        :aria-label="saved ? 'Saved — tap to remove' : 'Save for this kid'"
        @click="emit('toggleSave')"
      >
        <Icon name="heart" :size="20" :class="{ filled: saved }" />
      </button>
    </div>

    <div class="meta-row">
      <span class="meta">
        <Icon name="calendar" :size="15" />
        {{ formatDateRange(activity.startDate, activity.endDate) }}
      </span>
      <span v-if="activity.sessionTimes" class="meta">
        <Icon name="clock" :size="15" />
        {{ formatTime(activity.sessionTimes.start) }}–{{ formatTime(activity.sessionTimes.end) }}
      </span>
    </div>

    <p class="desc">{{ activity.description }}</p>

    <!-- Classification row -->
    <div class="classify">
      <span class="class-tag age">{{ activity.ageMin }}–{{ activity.ageMax }} yrs</span>
      <span class="class-tag" :class="activity.cost === 'free' ? 'free' : 'paid'">
        {{ activity.cost === 'free' ? 'Free' : `$${activity.price}` }}
      </span>
      <span
        v-for="c in activity.categories"
        :key="c"
        class="class-tag cat"
        :style="{ background: CATEGORY_META[c].bg, color: CATEGORY_META[c].color, borderColor: CATEGORY_META[c].color }"
      >
        {{ CATEGORY_META[c].icon }} {{ CATEGORY_META[c].label }}
      </span>
    </div>

    <div class="card-foot">
      <a
        v-if="activity.registrationRequired && activity.registrationUrl"
        :href="activity.registrationUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="reg-link"
      >
        Register <Icon name="arrow" :size="14" />
      </a>
      <span v-else-if="activity.registrationRequired" class="reg-note">
        Registration required
      </span>
      <span v-else class="reg-note ok">
        <Icon name="check" :size="14" /> No booking needed
      </span>

      <button v-if="removable" class="remove-btn" @click="emit('remove')">
        Remove
      </button>
    </div>
  </article>
</template>
