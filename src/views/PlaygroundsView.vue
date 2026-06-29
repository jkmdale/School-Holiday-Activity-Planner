<script setup lang="ts">
/**
 * Playgrounds — every Christchurch City Council playground (sourced from the
 * council's open data). Browse as a list or map, search by name, sort by
 * nearest / your rating / A–Z, and rate + note them privately on-device.
 */
import { computed, reactive, ref } from 'vue'
import {
  state, playRating, setPlayStars, setPlayNote, requestLocation
} from '../store'
import { haversineKm, formatDistance } from '../utils/geo'
import MapView from '../components/MapView.vue'
import Icon from '../components/Icon.vue'

const LIST_LIMIT = 60

const q = ref('')
const sort = ref<'near' | 'rated' | 'name'>('name')
const view = ref<'list' | 'map'>('list')
const noteOpen = reactive<Record<string, boolean>>({})
const noteDraft = reactive<Record<string, string>>({})

function distance(pg: { lat: number; lng: number }): number {
  const c = state.coords
  return c ? haversineKm(c.lat, c.lng, pg.lat, pg.lng) : Infinity
}

const filtered = computed(() => {
  const needle = q.value.trim().toLowerCase()
  let list = state.playgrounds
  if (needle) list = list.filter((p) => p.name.toLowerCase().includes(needle))
  const arr = [...list]
  if (sort.value === 'near' && state.coords) arr.sort((a, b) => distance(a) - distance(b))
  else if (sort.value === 'rated') {
    arr.sort((a, b) => playRating(b.id).stars - playRating(a.id).stars || a.name.localeCompare(b.name))
  } else arr.sort((a, b) => a.name.localeCompare(b.name))
  return arr
})

const shown = computed(() => filtered.value.slice(0, LIST_LIMIT))

async function pickSort(s: 'near' | 'rated' | 'name') {
  if (s === 'near' && !state.coords) {
    const ok = await requestLocation()
    if (!ok) return
  }
  sort.value = s
}

function googleDir(lat: number, lng: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
}
function appleDir(lat: number, lng: number) {
  return `https://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`
}
function distLabel(pg: { lat: number; lng: number }): string | null {
  return state.coords ? formatDistance(distance(pg)) : null
}

function toggleNote(id: string) {
  noteOpen[id] = !noteOpen[id]
  if (noteOpen[id]) noteDraft[id] = playRating(id).note ?? ''
}
function saveNote(id: string) {
  setPlayNote(id, noteDraft[id] ?? '')
  noteOpen[id] = false
}
</script>

<template>
  <section>
    <div class="section-head">
      <h2 class="section-title">Playgrounds</h2>
      <span class="result-count">{{ filtered.length }} of {{ state.playgrounds.length }}</span>
    </div>
    <p class="privacy-note">
      <strong>Every CCC playground.</strong> Rate and note your favourites — ratings stay on this device.
    </p>

    <div class="search-row">
      <div class="search-box">
        <Icon name="search" :size="17" />
        <input v-model="q" type="search" placeholder="Search playgrounds…" aria-label="Search playgrounds" />
        <button v-if="q" class="search-clear" aria-label="Clear search" @click="q = ''">✕</button>
      </div>
    </div>

    <div class="play-controls">
      <div class="segmented view-toggle sm">
        <button :class="{ on: sort === 'near' }" @click="pickSort('near')">{{ state.locating ? '…' : 'Near me' }}</button>
        <button :class="{ on: sort === 'rated' }" @click="pickSort('rated')">Rated</button>
        <button :class="{ on: sort === 'name' }" @click="pickSort('name')">A–Z</button>
      </div>
      <div class="segmented view-toggle sm">
        <button :class="{ on: view === 'list' }" @click="view = 'list'">List</button>
        <button :class="{ on: view === 'map' }" @click="view = 'map'">Map</button>
      </div>
    </div>

    <MapView v-if="view === 'map'" :points="filtered" />

    <template v-else>
      <div class="play-list">
        <article v-for="pg in shown" :key="pg.id" class="card play-card">
          <div class="play-head">
            <div>
              <h3 class="play-name">{{ pg.name }}</h3>
              <p v-if="distLabel(pg)" class="provider"><Icon name="pin" :size="14" /> {{ distLabel(pg) }} away</p>
            </div>
          </div>

          <p class="desc">{{ pg.description }}</p>

          <div class="classify" v-if="pg.features.length">
            <span v-for="f in pg.features" :key="f" class="class-tag">{{ f }}</span>
          </div>

          <div class="play-rate">
            <div class="stars" role="group" :aria-label="`Rate ${pg.name}`">
              <button
                v-for="n in 5"
                :key="n"
                class="star"
                :class="{ on: n <= playRating(pg.id).stars }"
                :aria-label="`${n} star${n > 1 ? 's' : ''}`"
                @click="setPlayStars(pg.id, n)"
              >
                <Icon name="star" :size="22" />
              </button>
            </div>
            <button class="link-btn" @click="toggleNote(pg.id)">
              {{ playRating(pg.id).note ? 'Edit note' : 'Add note' }}
            </button>
          </div>

          <p v-if="playRating(pg.id).note && !noteOpen[pg.id]" class="play-note">“{{ playRating(pg.id).note }}”</p>

          <div v-if="noteOpen[pg.id]" class="play-note-edit">
            <input v-model="noteDraft[pg.id]" type="text" placeholder="e.g. great for under-5s, shady" @keydown.enter="saveNote(pg.id)" />
            <button class="primary-btn" @click="saveNote(pg.id)">Save</button>
          </div>

          <div class="detail-line">
            <span class="overline">Directions</span>
            <div class="dir-links">
              <a :href="googleDir(pg.lat, pg.lng)" target="_blank" rel="noopener noreferrer" class="reg-link"><Icon name="pin" :size="14" /> Google Maps</a>
              <a :href="appleDir(pg.lat, pg.lng)" target="_blank" rel="noopener noreferrer" class="reg-link"><Icon name="pin" :size="14" /> Apple Maps</a>
            </div>
          </div>
        </article>
      </div>

      <p v-if="filtered.length > shown.length" class="map-note">
        Showing {{ shown.length }} of {{ filtered.length }}. Search or use “Near me” to narrow it down.
      </p>
      <div v-if="!filtered.length" class="empty">
        <span class="empty-icon"><Icon name="search" :size="26" /></span>
        <p class="empty-title">No playgrounds found</p>
        <p class="empty-sub">Try a different search.</p>
      </div>
    </template>
  </section>
</template>
