<script setup lang="ts">
import { computed } from 'vue'
import { state, activeKid, savedActivitiesFor, toggleSave } from '../store'
import { downloadIcs } from '../services/ics'
import { avatarColor, initial } from '../utils/categories'
import ActivityCard from '../components/ActivityCard.vue'
import Icon from '../components/Icon.vue'

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
    <div v-if="!state.kids.length" class="empty">
      <span class="empty-icon"><Icon name="bookmark" :size="26" /></span>
      <p class="empty-title">No plans yet</p>
      <p class="empty-sub">Add a kid first, then save activities to build their plan.</p>
    </div>

    <template v-else>
      <span class="overline block">Plan for</span>
      <div class="kid-picker">
        <button
          v-for="k in state.kids"
          :key="k.id"
          class="kid-chip"
          :class="{ on: state.activeKidId === k.id }"
          @click="state.activeKidId = k.id"
        >
          <span class="avatar sm" :style="{ background: avatarColor(k.name) }">
            {{ initial(k.name) }}
          </span>
          {{ k.name }}
        </button>
      </div>

      <div class="section-head" v-if="kid">
        <h2 class="section-title">{{ kid.name }}'s plan</h2>
      </div>

      <!-- Export call-to-action -->
      <div v-if="savedList.length" class="export-card">
        <div>
          <div class="export-title">{{ savedList.length }} saved {{ savedList.length === 1 ? 'activity' : 'activities' }}</div>
          <div class="export-sub">Add them to your phone calendar in one tap.</div>
        </div>
        <button class="primary-btn export-btn" @click="exportIcs">
          <Icon name="download" :size="16" /> Export
        </button>
      </div>

      <div v-if="kid && !savedList.length" class="empty">
        <span class="empty-icon"><Icon name="calendar" :size="26" /></span>
        <p class="empty-title">Nothing saved for {{ kid.name }}</p>
        <p class="empty-sub">Save an activity in Browse to add it here.</p>
      </div>

      <TransitionGroup name="list" tag="div">
        <ActivityCard
          v-for="a in savedList"
          :key="a.id"
          :activity="a"
          removable
          @remove="kid && toggleSave(kid.id, a.id)"
        />
      </TransitionGroup>
    </template>
  </section>
</template>
