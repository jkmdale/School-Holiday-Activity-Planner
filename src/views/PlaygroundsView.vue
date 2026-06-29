<script setup lang="ts">
/**
 * Playgrounds — a browsable list of Christchurch playgrounds the parent can
 * rate (1–5 stars) and note, all stored on-device. Separate from holiday events
 * because playgrounds are places, not dated activities.
 */
import { computed, reactive, ref } from 'vue'
import { state, playRating, setPlayStars, setPlayNote } from '../store'
import Icon from '../components/Icon.vue'

const sort = ref<'rated' | 'name'>('rated')
const noteOpen = reactive<Record<string, boolean>>({})
const noteDraft = reactive<Record<string, string>>({})

const playgrounds = computed(() => {
  const list = [...state.playgrounds]
  if (sort.value === 'name') return list.sort((a, b) => a.name.localeCompare(b.name))
  return list.sort((a, b) => {
    const d = playRating(b.id).stars - playRating(a.id).stars
    return d || a.name.localeCompare(b.name)
  })
})

function googleDir(lat: number, lng: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
}
function appleDir(lat: number, lng: number) {
  return `https://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`
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
      <div class="segmented view-toggle sm">
        <button :class="{ on: sort === 'rated' }" @click="sort = 'rated'">Top rated</button>
        <button :class="{ on: sort === 'name' }" @click="sort = 'name'">A–Z</button>
      </div>
    </div>
    <p class="privacy-note">
      <strong>Your picks.</strong> Rate and note playgrounds to remember the good ones —
      ratings stay on this device.
    </p>

    <div class="play-list">
      <article v-for="pg in playgrounds" :key="pg.id" class="card play-card">
        <div class="play-head">
          <div>
            <h3 class="play-name">{{ pg.name }}</h3>
            <p class="provider"><Icon name="pin" :size="14" /> {{ pg.suburb }}</p>
          </div>
        </div>

        <p class="desc">{{ pg.description }}</p>

        <div class="classify" v-if="pg.features.length">
          <span v-for="f in pg.features" :key="f" class="class-tag">{{ f }}</span>
        </div>

        <!-- Star rating -->
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

        <p v-if="playRating(pg.id).note && !noteOpen[pg.id]" class="play-note">
          “{{ playRating(pg.id).note }}”
        </p>

        <div v-if="noteOpen[pg.id]" class="play-note-edit">
          <input
            v-model="noteDraft[pg.id]"
            type="text"
            placeholder="e.g. great for under-5s, shady spots"
            @keydown.enter="saveNote(pg.id)"
          />
          <button class="primary-btn" @click="saveNote(pg.id)">Save</button>
        </div>

        <div class="detail-line">
          <span class="overline">Directions</span>
          <div class="dir-links">
            <a :href="googleDir(pg.lat, pg.lng)" target="_blank" rel="noopener noreferrer" class="reg-link">
              <Icon name="pin" :size="14" /> Google Maps
            </a>
            <a :href="appleDir(pg.lat, pg.lng)" target="_blank" rel="noopener noreferrer" class="reg-link">
              <Icon name="pin" :size="14" /> Apple Maps
            </a>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>
