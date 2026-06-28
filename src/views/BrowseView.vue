<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { CATEGORIES, type Category, type Cost } from '../types'
import { state, activeKid, isSaved, toggleSave } from '../store'
import { overlapsBreak, currentOrNextBreak, formatDateRange } from '../utils/dates'
import { CATEGORY_META, avatarColor, initial } from '../utils/categories'
import ActivityCard from '../components/ActivityCard.vue'
import Icon from '../components/Icon.vue'

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

const showFilters = ref(false)

const suburbs = computed(() =>
  [...new Set(state.activities.map((a) => a.suburb))].sort()
)

const selectedSet = computed(() =>
  state.holidaySets.find((s) => s.id === filters.holidaySetId) ?? null
)

const selectedBreak = computed(() =>
  selectedSet.value?.breaks.find((b) => b.name === filters.breakName) ?? null
)

const upcoming = computed(() => currentOrNextBreak(state.holidaySets))

const filtered = computed(() => {
  const kid = activeKid()
  return state.activities.filter((a) => {
    if (kid && (kid.age < a.ageMin || kid.age > a.ageMax)) return false
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

const activeFilterCount = computed(() => {
  let n = 0
  if (filters.suburb) n++
  if (filters.category) n++
  if (filters.cost !== 'all') n++
  if (filters.breakName) n++
  return n
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

function onSetChange() {
  filters.breakName = ''
}

function applyUpcoming() {
  if (!upcoming.value) return
  filters.holidaySetId = upcoming.value.set.id
  filters.breakName = upcoming.value.brk.name
  showFilters.value = true
}
</script>

<template>
  <section>
    <!-- Contextual holiday banner -->
    <button v-if="upcoming" class="break-banner" @click="applyUpcoming">
      <span class="bb-left">
        <span class="overline">{{ upcoming.status === 'current' ? 'On now' : 'Next break' }}</span>
        <span class="bb-title">{{ upcoming.brk.name }} holidays</span>
        <span class="bb-dates">{{ formatDateRange(upcoming.brk.start, upcoming.brk.end) }}</span>
      </span>
      <span class="bb-action">Show <Icon name="arrow" :size="14" /></span>
    </button>

    <!-- Kid selector -->
    <div v-if="state.kids.length">
      <span class="overline block">Planning for</span>
      <div class="kid-picker">
        <button
          v-for="kid in state.kids"
          :key="kid.id"
          class="kid-chip"
          :class="{ on: state.activeKidId === kid.id }"
          @click="selectKid(kid.id)"
        >
          <span class="avatar sm" :style="{ background: avatarColor(kid.name) }">
            {{ initial(kid.name) }}
          </span>
          {{ kid.name }} · {{ kid.age }}
        </button>
      </div>
    </div>
    <p v-else class="hint">
      Add a kid on the <strong>Kids</strong> tab to filter by their age and interests.
    </p>

    <!-- Filter bar -->
    <div class="filter-bar">
      <button class="filter-toggle" :class="{ open: showFilters }" @click="showFilters = !showFilters">
        <Icon name="sliders" :size="16" />
        <span>Filters</span>
        <span v-if="activeFilterCount" class="filter-count">{{ activeFilterCount }}</span>
      </button>
      <span class="result-count">{{ filtered.length }} {{ filtered.length === 1 ? 'result' : 'results' }}</span>
    </div>

    <Transition name="expand">
      <div v-show="showFilters" class="filters">
        <label
          v-if="activeKid() && activeKid()!.interests.length"
          class="switch-row"
        >
          <span>Match {{ activeKid()!.name }}'s interests</span>
          <span class="switch">
            <input v-model="filters.matchInterests" type="checkbox" />
            <span class="track"><span class="thumb" /></span>
          </span>
        </label>

        <div class="field">
          <span class="field-label">Cost</span>
          <div class="segmented">
            <button :class="{ on: filters.cost === 'all' }" @click="filters.cost = 'all'">All</button>
            <button :class="{ on: filters.cost === 'free' }" @click="filters.cost = 'free'">Free</button>
            <button :class="{ on: filters.cost === 'paid' }" @click="filters.cost = 'paid'">Paid</button>
          </div>
        </div>

        <div class="filter-grid">
          <label class="field compact">
            <span class="field-label">Suburb</span>
            <select v-model="filters.suburb">
              <option value="">All suburbs</option>
              <option v-for="s in suburbs" :key="s" :value="s">{{ s }}</option>
            </select>
          </label>

          <label class="field compact">
            <span class="field-label">Category</span>
            <select v-model="filters.category">
              <option value="">All categories</option>
              <option v-for="c in CATEGORIES" :key="c" :value="c">{{ CATEGORY_META[c].label }}</option>
            </select>
          </label>

          <label class="field compact">
            <span class="field-label">Holiday set</span>
            <select v-model="filters.holidaySetId" @change="onSetChange">
              <option value="">Any time</option>
              <option v-for="hs in state.holidaySets" :key="hs.id" :value="hs.id">{{ hs.name }}</option>
            </select>
          </label>

          <label v-if="selectedSet" class="field compact">
            <span class="field-label">Break</span>
            <select v-model="filters.breakName">
              <option value="">All breaks</option>
              <option v-for="b in selectedSet.breaks" :key="b.name" :value="b.name">{{ b.name }}</option>
            </select>
          </label>
        </div>

        <button class="link-btn" @click="resetFilters">Reset all filters</button>
      </div>
    </Transition>

    <!-- Results -->
    <div v-if="!filtered.length" class="empty">
      <span class="empty-icon"><Icon name="search" :size="26" /></span>
      <p class="empty-title">No matching activities</p>
      <p class="empty-sub">Try widening your filters or turning off interest matching.</p>
    </div>

    <TransitionGroup v-else name="list" tag="div">
      <ActivityCard
        v-for="a in filtered"
        :key="a.id"
        :activity="a"
        :can-save="!!state.activeKidId"
        :saved="!!state.activeKidId && isSaved(state.activeKidId, a.id)"
        @toggle-save="state.activeKidId && toggleSave(state.activeKidId, a.id)"
      />
    </TransitionGroup>
  </section>
</template>
