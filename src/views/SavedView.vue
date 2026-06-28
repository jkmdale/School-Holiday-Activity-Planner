<script setup lang="ts">
import { computed } from 'vue'
import { state, activeKid, savedActivitiesFor, toggleSave } from '../store'
import { downloadIcs } from '../services/ics'
import ActivityCard from '../components/ActivityCard.vue'

const kid = computed(() => activeKid())
const savedList = computed(() => (kid.value ? savedActivitiesFor(kid.value.id) : []))

function exportIcs() {
  if (!kid.value || !savedList.value.length) return
  const safe = kid.value.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  downloadIcs(`${safe}-holiday-plan.ics`, savedList.value)
}
</script>

<template>
  <section>
    <p v-if="!state.kids.length" class="empty">
      Add a kid on the Kids tab first, then save activities to build their plan.
    </p>

    <template v-else>
      <!-- Kid selector -->
      <div class="kid-picker">
        <span class="muted small">Plan for:</span>
        <button
          v-for="k in state.kids"
          :key="k.id"
          class="chip"
          :class="{ on: state.activeKidId === k.id }"
          @click="state.activeKidId = k.id"
        >
          {{ k.name }}
        </button>
      </div>

      <div class="section-head" v-if="kid">
        <h2 class="section-title">{{ kid.name }}'s plan</h2>
        <button
          class="primary-btn"
          :disabled="!savedList.length"
          @click="exportIcs"
        >
          ⬇ Export to calendar
        </button>
      </div>

      <p v-if="kid && !savedList.length" class="empty">
        Nothing saved yet. Tap the ♡ on an activity in Browse to add it to
        {{ kid.name }}'s plan.
      </p>

      <p v-if="savedList.length" class="muted small">
        {{ savedList.length }} saved · the export downloads an .ics you can open
        in Google or Apple Calendar.
      </p>

      <ActivityCard
        v-for="a in savedList"
        :key="a.id"
        :activity="a"
        removable
        @remove="kid && toggleSave(kid.id, a.id)"
      />
    </template>
  </section>
</template>
