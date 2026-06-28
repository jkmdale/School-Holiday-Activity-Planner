<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { CATEGORIES, type Category, type Cost } from '../types'
import {
  state, activeKid, isSaved, toggleSave, openActivity,
  isSavedForAll, toggleSaveForAll, requestLocation
} from '../store'
import { overlapsBreak, currentOrNextBreak, formatDateRange, todayISO } from '../utils/dates'
import { CATEGORY_META, avatarColor, initial } from '../utils/categories'
import { haversineKm } from '../utils/geo'
import ActivityCard from '../components/ActivityCard.vue'
import SuggestDay from '../components/SuggestDay.vue'
import Icon from '../components/Icon.vue'

type SortKey = 'soon' | 'price' | 'name' | 'near'

const filters = reactive<{
  q: string
  matchInterests: boolean
  suburb: string
  category: Category | ''
  cost: Cost | 'all'
  holidaySetId: string
  breakName: string
  date: string
  showPast: boolean
}>({
  q: '',
  matchInterests: true,
  suburb: '',
  category: '',
  cost: 'all',
  holidaySetId: '',
  breakName: '',
  date: '',
  showPast: false
})

const showFilters = ref(false)
const sort = ref<SortKey>('soon')
const today = todayISO()

/** Whole-family mode: find activities that suit every kid at once. */
const familyMode = ref(false)
const canFamily = computed(() => state.kids.length > 1)
const family = computed(() => familyMode.value && canFamily.value)

/** Combined interests across all kids, used for family interest matching. */
const familyInterests = computed(
  () => new Set(state.kids.flatMap((k) => k.interests))
)

function priceOf(a: { cost: Cost; price?: number }): number {
  return a.cost === 'free' ? 0 : a.price ?? 0
}

const showSuggest = ref(false)
/** Whose day to plan: the whole family, the active kid, or nobody. */
const suggestKidIds = computed(() => {
  if (family.value) return state.kids.map((k) => k.id)
  return state.activeKidId ? [state.activeKidId] : []
})

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
  const q = filters.q.trim().toLowerCase()
  return state.activities.filter((a) => {
    // Hide finished activities unless the parent opts to see them.
    if (!filters.showPast && a.endDate < today) return false

    // Free-text search across name, provider and description.
    if (q && !`${a.name} ${a.provider} ${a.description}`.toLowerCase().includes(q)) {
      return false
    }

    if (family.value) {
      // Must suit every kid's age, and (optionally) one of their interests.
      if (!state.kids.every((k) => k.age >= a.ageMin && k.age <= a.ageMax)) return false
      if (filters.matchInterests && familyInterests.value.size) {
        if (!a.categories.some((c) => familyInterests.value.has(c))) return false
      }
    } else {
      if (kid && (kid.age < a.ageMin || kid.age > a.ageMax)) return false
      if (kid && filters.matchInterests && kid.interests.length) {
        if (!a.categories.some((c) => kid.interests.includes(c))) return false
      }
    }

    if (filters.suburb && a.suburb !== filters.suburb) return false
    if (filters.category && !a.categories.includes(filters.category)) return false
    if (filters.cost !== 'all' && a.cost !== filters.cost) return false
    if (selectedBreak.value && !overlapsBreak(a, selectedBreak.value)) return false
    if (filters.date && !(a.startDate <= filters.date && a.endDate >= filters.date)) return false
    return true
  })
})

function distanceKm(a: { lat?: number; lng?: number }): number {
  const c = state.coords
  if (!c || a.lat == null || a.lng == null) return Number.POSITIVE_INFINITY
  return haversineKm(c.lat, c.lng, a.lat, a.lng)
}

/** Filtered results in the chosen sort order. */
const results = computed(() => {
  const arr = [...filtered.value]
  if (sort.value === 'price') return arr.sort((a, b) => priceOf(a) - priceOf(b))
  if (sort.value === 'name') return arr.sort((a, b) => a.name.localeCompare(b.name))
  if (sort.value === 'near' && state.coords) {
    return arr.sort((a, b) => distanceKm(a) - distanceKm(b))
  }
  return arr.sort((a, b) => a.startDate.localeCompare(b.startDate)) // 'soon'
})

/** Switching to "nearest" asks for location the first time. */
async function pickSort(key: SortKey) {
  if (key === 'near' && !state.coords) {
    const ok = await requestLocation()
    if (!ok) return // stay on the current sort if permission was denied
  }
  sort.value = key
}

const activeFilterCount = computed(() => {
  let n = 0
  if (filters.suburb) n++
  if (filters.category) n++
  if (filters.cost !== 'all') n++
  if (filters.breakName) n++
  if (filters.date) n++
  if (filters.showPast) n++
  return n
})

function selectKid(id: string) {
  familyMode.value = false
  state.activeKidId = state.activeKidId === id ? null : id
}

function selectFamily() {
  familyMode.value = true
}

function resetFilters() {
  Object.assign(filters, {
    q: '',
    matchInterests: true,
    suburb: '',
    category: '',
    cost: 'all',
    holidaySetId: '',
    breakName: '',
    date: '',
    showPast: false
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
          :class="{ on: !family && state.activeKidId === kid.id }"
          @click="selectKid(kid.id)"
        >
          <span class="avatar sm" :style="{ background: avatarColor(kid.name) }">
            {{ initial(kid.name) }}
          </span>
          {{ kid.name }} · {{ kid.age }}
        </button>
        <button
          v-if="canFamily"
          class="kid-chip family-chip"
          :class="{ on: family }"
          @click="selectFamily"
        >
          <span class="avatar sm family-avatar"><Icon name="users" :size="14" /></span>
          Whole family
        </button>
      </div>
      <p v-if="family" class="hint family-hint">
        Showing activities that suit all {{ state.kids.length }} kids. Saving adds them to every kid's plan.
      </p>
    </div>
    <p v-else class="hint">
      Add a kid on the <strong>Kids</strong> tab to filter by their age and interests.
    </p>

    <!-- Search -->
    <div class="search-box">
      <Icon name="search" :size="17" />
      <input
        v-model="filters.q"
        type="search"
        inputmode="search"
        placeholder="Search activities, providers…"
        aria-label="Search activities"
      />
      <button v-if="filters.q" class="search-clear" aria-label="Clear search" @click="filters.q = ''">✕</button>
    </div>

    <!-- Suggest a day -->
    <button
      v-if="state.kids.length"
      class="suggest-cta"
      @click="showSuggest = true"
    >
      <span class="suggest-spark"><Icon name="star" :size="16" /></span>
      <span class="suggest-cta-text">
        <strong>Suggest a day</strong>
        <span>Auto-plan a day for {{ family ? 'the whole family' : (activeKid()?.name ?? 'your kid') }}</span>
      </span>
      <Icon name="arrow" :size="16" />
    </button>

    <!-- Filter bar -->
    <div class="filter-bar">
      <button class="filter-toggle" :class="{ open: showFilters }" @click="showFilters = !showFilters">
        <Icon name="sliders" :size="16" />
        <span>Filters</span>
        <span v-if="activeFilterCount" class="filter-count">{{ activeFilterCount }}</span>
      </button>
      <span class="result-count">{{ results.length }} {{ results.length === 1 ? 'result' : 'results' }}</span>
    </div>

    <Transition name="expand">
      <div v-show="showFilters" class="filters">
        <label
          v-if="!family && activeKid() && activeKid()!.interests.length"
          class="switch-row"
        >
          <span>Match {{ activeKid()!.name }}'s interests</span>
          <span class="switch">
            <input v-model="filters.matchInterests" type="checkbox" />
            <span class="track"><span class="thumb" /></span>
          </span>
        </label>
        <label v-else-if="family && familyInterests.size" class="switch-row">
          <span>Match the kids' interests</span>
          <span class="switch">
            <input v-model="filters.matchInterests" type="checkbox" />
            <span class="track"><span class="thumb" /></span>
          </span>
        </label>

        <div class="field">
          <span class="field-label">Sort by</span>
          <div class="segmented">
            <button :class="{ on: sort === 'soon' }" @click="pickSort('soon')">Soonest</button>
            <button :class="{ on: sort === 'price' }" @click="pickSort('price')">Price</button>
            <button :class="{ on: sort === 'name' }" @click="pickSort('name')">Name</button>
            <button :class="{ on: sort === 'near' }" @click="pickSort('near')">
              {{ state.locating ? 'Locating…' : 'Nearest' }}
            </button>
          </div>
        </div>

        <label class="switch-row">
          <span>Show past activities</span>
          <span class="switch">
            <input v-model="filters.showPast" type="checkbox" />
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

        <label class="field">
          <span class="field-label">On a particular day</span>
          <div class="date-row">
            <input v-model="filters.date" type="date" />
            <button v-if="filters.date" class="link-btn" @click="filters.date = ''">Clear</button>
          </div>
        </label>

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
    <div v-if="!results.length" class="empty">
      <span class="empty-icon"><Icon name="search" :size="26" /></span>
      <p class="empty-title">No matching activities</p>
      <p class="empty-sub">Try widening your filters or turning off interest matching.</p>
    </div>

    <TransitionGroup v-else name="list" tag="div">
      <ActivityCard
        v-for="a in results"
        :key="a.id"
        :activity="a"
        :can-save="family ? state.kids.length > 0 : !!state.activeKidId"
        :saved="family ? isSavedForAll(a.id) : (!!state.activeKidId && isSaved(state.activeKidId, a.id))"
        @toggle-save="family ? toggleSaveForAll(a.id) : (state.activeKidId && toggleSave(state.activeKidId, a.id))"
        @open="openActivity(a.id)"
      />
    </TransitionGroup>

    <SuggestDay :open="showSuggest" :kid-ids="suggestKidIds" @close="showSuggest = false" />
  </section>
</template>
