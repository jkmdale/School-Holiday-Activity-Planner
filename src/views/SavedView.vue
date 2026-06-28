<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Activity } from '../types'
import { state, activeKid, savedActivitiesFor, toggleSave, openActivity } from '../store'
import { downloadIcs } from '../services/ics'
import {
  eachDateInRange, monthGrid, monthLabel, todayISO, formatDate
} from '../utils/dates'
import { avatarColor, initial } from '../utils/categories'
import { formatDateRange, formatTime } from '../utils/dates'
import ActivityCard from '../components/ActivityCard.vue'
import Icon from '../components/Icon.vue'
import SharePlan from '../components/SharePlan.vue'

const today = todayISO()
const showShare = ref(false)

function printPlan() {
  window.print()
}

const kid = computed(() => activeKid())
const allSaved = computed(() => (kid.value ? savedActivitiesFor(kid.value.id) : []))

const showPast = ref(false)
const pastCount = computed(() => allSaved.value.filter((a) => a.endDate < today).length)

/** What we actually render: upcoming only, unless the parent opts to see past. */
const savedList = computed(() =>
  showPast.value ? allSaved.value : allSaved.value.filter((a) => a.endDate >= today)
)

/** Running holiday spend across the shown plan (paid activities only). */
const budget = computed(() =>
  savedList.value.reduce((sum, a) => sum + (a.cost === 'paid' ? a.price ?? 0 : 0), 0)
)

const view = ref<'list' | 'calendar'>('list')
const cursor = ref<{ y: number; m: number } | null>(null)
const selectedDay = ref<string | null>(null)
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/** Map of ISO date → saved activities on that day (multi-day events span days). */
const byDate = computed(() => {
  const m = new Map<string, Activity[]>()
  for (const a of savedList.value) {
    for (const iso of eachDateInRange(a.startDate, a.endDate)) {
      const arr = m.get(iso) ?? []
      arr.push(a)
      m.set(iso, arr)
    }
  }
  return m
})

const defaultCursor = computed(() => {
  const first = [...savedList.value.map((a) => a.startDate)].sort()[0] ?? today
  const [y, m] = first.split('-').map(Number)
  return { y, m: m - 1 }
})
const cur = computed(() => cursor.value ?? defaultCursor.value)
const grid = computed(() => monthGrid(cur.value.y, cur.value.m))
const title = computed(() => monthLabel(cur.value.y, cur.value.m))

const dayEvents = computed(() =>
  selectedDay.value ? byDate.value.get(selectedDay.value) ?? [] : []
)

function countOn(iso: string): number {
  return byDate.value.get(iso)?.length ?? 0
}

function shiftMonth(delta: number) {
  const d = new Date(cur.value.y, cur.value.m + delta, 1)
  cursor.value = { y: d.getFullYear(), m: d.getMonth() }
  selectedDay.value = null
}

function pickDay(iso: string) {
  const evs = byDate.value.get(iso)
  if (!evs?.length) return
  selectedDay.value = iso
  // One event that day → jump straight to it; otherwise show the day's list.
  if (evs.length === 1) openActivity(evs[0].id)
}

// Keep a sensible selected day as the month/data changes.
watch(
  [grid, byDate, view],
  () => {
    if (view.value !== 'calendar') return
    const validSel =
      selectedDay.value &&
      byDate.value.has(selectedDay.value) &&
      grid.value.some((c) => c.iso === selectedDay.value && c.inMonth)
    if (!validSel) {
      const firstWithEvents = grid.value.find((c) => c.inMonth && byDate.value.has(c.iso))
      selectedDay.value = firstWithEvents?.iso ?? null
    }
  },
  { immediate: true }
)

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

      <div class="export-card" v-if="savedList.length">
        <div class="export-head">
          <div>
            <div class="export-title">{{ savedList.length }} saved {{ savedList.length === 1 ? 'activity' : 'activities' }}</div>
            <div class="export-sub">
              <template v-if="budget > 0">Planned spend <strong>${{ budget }}</strong> · </template>Calendar, share or print in one tap.
            </div>
          </div>
        </div>
        <div class="export-actions">
          <button class="primary-btn export-btn" @click="exportIcs">
            <Icon name="download" :size="16" /> Calendar
          </button>
          <button class="primary-btn alt" @click="showShare = true">
            <Icon name="share" :size="16" /> Share
          </button>
          <button class="primary-btn alt" @click="printPlan">
            <Icon name="book" :size="16" /> Print
          </button>
        </div>
      </div>

      <!-- Toggle to reveal past activities, shown only when some exist -->
      <label v-if="kid && pastCount" class="switch-row past-toggle">
        <span>Show past activities <span class="muted small">({{ pastCount }})</span></span>
        <span class="switch">
          <input v-model="showPast" type="checkbox" />
          <span class="track"><span class="thumb" /></span>
        </span>
      </label>

      <div v-if="kid && !allSaved.length" class="empty">
        <span class="empty-icon"><Icon name="calendar" :size="26" /></span>
        <p class="empty-title">Nothing saved for {{ kid.name }}</p>
        <p class="empty-sub">Save an activity in Browse to add it here.</p>
      </div>

      <div v-else-if="kid && !savedList.length" class="empty">
        <span class="empty-icon"><Icon name="calendar" :size="26" /></span>
        <p class="empty-title">No upcoming activities</p>
        <p class="empty-sub">{{ kid.name }}'s saved activities have all finished. Turn on “Show past activities” to see them.</p>
      </div>

      <template v-else-if="kid">
        <!-- View toggle -->
        <div class="segmented view-toggle">
          <button :class="{ on: view === 'list' }" @click="view = 'list'">List</button>
          <button :class="{ on: view === 'calendar' }" @click="view = 'calendar'">Calendar</button>
        </div>

        <!-- List view -->
        <TransitionGroup v-if="view === 'list'" name="list" tag="div">
          <ActivityCard
            v-for="a in savedList"
            :key="a.id"
            :activity="a"
            removable
            @remove="toggleSave(kid.id, a.id)"
            @open="openActivity(a.id)"
          />
        </TransitionGroup>

        <!-- Calendar view -->
        <div v-else class="cal-wrap">
          <div class="cal card">
            <div class="cal-nav">
              <button class="icon-btn" aria-label="Previous month" @click="shiftMonth(-1)">‹</button>
              <span class="cal-title">{{ title }}</span>
              <button class="icon-btn" aria-label="Next month" @click="shiftMonth(1)">›</button>
            </div>

            <div class="cal-weekdays">
              <span v-for="w in WEEKDAYS" :key="w" class="cal-weekday">{{ w }}</span>
            </div>

            <div class="cal-grid">
              <button
                v-for="c in grid"
                :key="c.iso"
                class="cal-cell"
                :class="{
                  dim: !c.inMonth,
                  today: c.iso === today,
                  has: countOn(c.iso) > 0,
                  on: c.iso === selectedDay
                }"
                :disabled="!countOn(c.iso)"
                @click="pickDay(c.iso)"
              >
                <span class="cal-num">{{ c.day }}</span>
                <span v-if="countOn(c.iso)" class="cal-dot">{{ countOn(c.iso) }}</span>
              </button>
            </div>
          </div>

          <!-- Selected day's events -->
          <div v-if="selectedDay" class="cal-day">
            <h3 class="cal-day-head">{{ formatDate(selectedDay) }}</h3>
            <ActivityCard
              v-for="a in dayEvents"
              :key="a.id"
              :activity="a"
              removable
              @remove="toggleSave(kid.id, a.id)"
              @open="openActivity(a.id)"
            />
          </div>
          <p v-else class="empty-sub cal-none">
            No saved activities in {{ title }}. Use ‹ › to change month.
          </p>
        </div>
      </template>
    </template>

    <!-- Print-only summary (hidden on screen, shown when printing) -->
    <div v-if="kid && savedList.length" class="print-summary">
      <h1>{{ kid.name }}'s holiday plan</h1>
      <p class="print-meta">
        {{ savedList.length }} {{ savedList.length === 1 ? 'activity' : 'activities' }}<template v-if="budget > 0"> · planned spend ${{ budget }}</template>
      </p>
      <ul>
        <li v-for="a in savedList" :key="a.id">
          <strong>{{ a.name }}</strong> — {{ a.provider }}, {{ a.suburb }}<br />
          {{ formatDateRange(a.startDate, a.endDate) }}<template v-if="a.sessionTimes">, {{ formatTime(a.sessionTimes.start) }}–{{ formatTime(a.sessionTimes.end) }}</template>
          · {{ a.cost === 'free' ? 'Free' : '$' + a.price }}
        </li>
      </ul>
    </div>

    <SharePlan :open="showShare" @close="showShare = false" />
  </section>
</template>
