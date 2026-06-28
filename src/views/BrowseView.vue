<script setup lang="ts">
import { computed, reactive } from 'vue'
import { CATEGORIES, type Category, type Cost } from '../types'
import { state, activeKid, isSaved, toggleSave } from '../store'
import { overlapsBreak } from '../utils/dates'
import ActivityCard from '../components/ActivityCard.vue'

/** Filters. Kid age is applied automatically when a kid is selected. */
const filters = reactive<{
  matchInterests: boolean
  suburb: string
  category: Category | ''
  cost: Cost | 'all'
  holidaySetId: string
  breakName: string
}>({
  matchInterests: true,
  suburb: '',
  category: '',
  cost: 'all',
  holidaySetId: '',
  breakName: ''
})

// Distinct suburbs from the catalogue, for the dropdown.
const suburbs = computed(() =>
  [...new Set(state.activities.map((a) => a.suburb))].sort()
)

const selectedSet = computed(() =>
  state.holidaySets.find((s) => s.id === filters.holidaySetId) ?? null
)

const selectedBreak = computed(() =>
  selectedSet.value?.breaks.find((b) => b.name === filters.breakName) ?? null
)

const filtered = computed(() => {
  const kid = activeKid()
  return state.activities.filter((a) => {
    // Auto age match when a kid is selected.
    if (kid && (kid.age < a.ageMin || kid.age > a.ageMax)) return false
    // Optional interest match when a kid is selected and has interests.
    if (kid && filters.matchInterests && kid.interests.length) {
      if (!a.categories.some((c) => kid.interests.includes(c))) return false
    }
    if (filters.suburb && a.suburb !== filters.suburb) return false
    if (filters.category && !a.categories.includes(filters.category)) return false
    if (filters.cost !== 'all' && a.cost !== filters.cost) return false
    if (selectedBreak.value && !overlapsBreak(a, selectedBreak.value)) return false
    return true
  })
})

function selectKid(id: string) {
  state.activeKidId = state.activeKidId === id ? null : id
}

function resetFilters() {
  Object.assign(filters, {
    matchInterests: true,
    suburb: '',
    category: '',
    cost: 'all',
    holidaySetId: '',
    breakName: ''
  })
}

// Keep the break selection valid when the calendar set changes.
function onSetChange() {
  filters.breakName = ''
}
</script>

<template>
  <section>
    <!-- Kid selector -->
    <div v-if="state.kids.length" class="kid-picker">
      <span class="muted small">Filter for:</span>
      <button
        v-for="kid in state.kids"
        :key="kid.id"
        class="chip"
        :class="{ on: state.activeKidId === kid.id }"
        @click="selectKid(kid.id)"
      >
        {{ kid.name }} ({{ kid.age }})
      </button>
    </div>
    <p v-else class="empty small">
      Tip: add a kid on the Kids tab to auto-filter by their age and interests.
    </p>

    <!-- Filters -->
    <div class="filters">
      <label v-if="activeKid() && activeKid()!.interests.length" class="toggle">
        <input v-model="filters.matchInterests" type="checkbox" />
        Match {{ activeKid()!.name }}'s interests
      </label>

      <div class="filter-grid">
        <label class="field compact">
          <span>Suburb</span>
          <select v-model="filters.suburb">
            <option value="">All</option>
            <option v-for="s in suburbs" :key="s" :value="s">{{ s }}</option>
          </select>
        </label>

        <label class="field compact">
          <span>Category</span>
          <select v-model="filters.category">
            <option value="">All</option>
            <option v-for="c in CATEGORIES" :key="c" :value="c">{{ c }}</option>
          </select>
        </label>

        <label class="field compact">
          <span>Cost</span>
          <select v-model="filters.cost">
            <option value="all">All</option>
            <option value="free">Free</option>
            <option value="paid">Paid</option>
          </select>
        </label>

        <label class="field compact">
          <span>Holiday set</span>
          <select v-model="filters.holidaySetId" @change="onSetChange">
            <option value="">Any time</option>
            <option v-for="hs in state.holidaySets" :key="hs.id" :value="hs.id">
              {{ hs.name }}
            </option>
          </select>
        </label>

        <label v-if="selectedSet" class="field compact">
          <span>Break</span>
          <select v-model="filters.breakName">
            <option value="">All breaks</option>
            <option v-for="b in selectedSet.breaks" :key="b.name" :value="b.name">
              {{ b.name }}
            </option>
          </select>
        </label>
      </div>

      <button class="link-btn" @click="resetFilters">Reset filters</button>
    </div>

    <!-- Results -->
    <p class="muted small">{{ filtered.length }} activit{{ filtered.length === 1 ? 'y' : 'ies' }}</p>

    <p v-if="!filtered.length" class="empty">
      No activities match these filters. Try widening them or turning off
      interest matching.
    </p>

    <ActivityCard
      v-for="a in filtered"
      :key="a.id"
      :activity="a"
      :can-save="!!state.activeKidId"
      :saved="!!state.activeKidId && isSaved(state.activeKidId, a.id)"
      @toggle-save="state.activeKidId && toggleSave(state.activeKidId, a.id)"
    />
  </section>
</template>
