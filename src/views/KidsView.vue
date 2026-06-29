<script setup lang="ts">
import { reactive, ref } from 'vue'
import { CATEGORIES, type Category, type KidProfile } from '../types'
import { state, addKid, updateKid, removeKid } from '../store'
import { CATEGORY_META, avatarColor, initial } from '../utils/categories'
import Icon from '../components/Icon.vue'

const draft = reactive<{
  id: string | null
  name: string
  age: number | null
  interests: Category[]
  gender: 'boy' | 'girl' | ''
}>({ id: null, name: '', age: null, interests: [], gender: '' })
const showForm = ref(false)

function startAdd() {
  Object.assign(draft, { id: null, name: '', age: null, interests: [], gender: '' })
  showForm.value = true
}

function startEdit(kid: KidProfile) {
  Object.assign(draft, {
    id: kid.id, name: kid.name, age: kid.age,
    interests: [...kid.interests], gender: kid.gender ?? ''
  })
  showForm.value = true
}

function toggleInterest(c: Category) {
  const i = draft.interests.indexOf(c)
  if (i === -1) draft.interests.push(c)
  else draft.interests.splice(i, 1)
}

async function save() {
  const name = draft.name.trim()
  if (!name || draft.age === null) return
  if (draft.id) {
    await updateKid({ id: draft.id, name, age: draft.age, interests: [...draft.interests], gender: draft.gender })
  } else {
    await addKid({ name, age: draft.age, interests: [...draft.interests], gender: draft.gender })
  }
  showForm.value = false
}

async function confirmRemove(kid: KidProfile) {
  if (confirm(`Remove ${kid.name}? Their saved activities will also be cleared from this device.`)) {
    await removeKid(kid.id)
  }
}
</script>

<template>
  <section>
    <div class="section-head">
      <h2 class="section-title">Your kids</h2>
      <button v-if="!showForm" class="primary-btn" @click="startAdd">
        <Icon name="plus" :size="16" /> Add a kid
      </button>
    </div>

    <p class="privacy-note">
      <strong>Private by design.</strong> Profiles and saved activities stay on this
      device only — nothing about a child is ever sent anywhere.
    </p>

    <!-- Empty state -->
    <div v-if="!state.kids.length && !showForm" class="empty">
      <span class="empty-icon"><Icon name="users" :size="26" /></span>
      <p class="empty-title">No kids yet</p>
      <p class="empty-sub">
        Add a kid to start planning. Their age and interests filter activities just for them.
      </p>
      <button class="primary-btn" @click="startAdd">
        <Icon name="plus" :size="16" /> Add your first kid
      </button>
    </div>

    <!-- Kid list -->
    <TransitionGroup v-if="!showForm" name="list" tag="ul" class="kid-list">
      <li v-for="kid in state.kids" :key="kid.id" class="kid-row">
        <span class="avatar" :style="{ background: avatarColor(kid.name) }">
          {{ initial(kid.name) }}
        </span>
        <div class="kid-info">
          <div class="kid-name">{{ kid.name }} <span class="muted">· {{ kid.age }} yrs</span></div>
          <div class="classify" v-if="kid.interests.length">
            <span
              v-for="c in kid.interests"
              :key="c"
              class="class-tag cat"
              :style="{ background: CATEGORY_META[c].bg, color: CATEGORY_META[c].color }"
            ><Icon :name="CATEGORY_META[c].icon" :size="13" />{{ CATEGORY_META[c].label }}</span>
          </div>
          <div class="muted small" v-else>No interests set</div>
        </div>
        <div class="kid-actions">
          <button class="icon-btn" aria-label="Edit" @click="startEdit(kid)"><Icon name="edit" :size="16" /></button>
          <button class="icon-btn danger" aria-label="Remove" @click="confirmRemove(kid)"><Icon name="trash" :size="16" /></button>
        </div>
      </li>
    </TransitionGroup>

    <!-- Add / edit form -->
    <form v-if="showForm" class="card form" @submit.prevent="save">
      <h2 class="section-title">{{ draft.id ? 'Edit kid' : 'Add a kid' }}</h2>

      <label class="field">
        <span class="field-label">Name</span>
        <input v-model="draft.name" type="text" placeholder="e.g. Maia" required />
      </label>

      <label class="field">
        <span class="field-label">Age (years)</span>
        <input v-model.number="draft.age" type="number" min="0" max="18" placeholder="e.g. 8" required />
      </label>

      <div class="field">
        <span class="field-label">Gender (optional)</span>
        <div class="segmented">
          <button type="button" :class="{ on: draft.gender === '' }" @click="draft.gender = ''">Prefer not to say</button>
          <button type="button" :class="{ on: draft.gender === 'girl' }" @click="draft.gender = 'girl'">Girl</button>
          <button type="button" :class="{ on: draft.gender === 'boy' }" @click="draft.gender = 'boy'">Boy</button>
        </div>
        <span class="muted small">Only used to skip gender-specific activities that wouldn't fit. Stays on this device.</span>
      </div>

      <div class="field">
        <span class="field-label">Interests</span>
        <div class="classify choices">
          <button
            v-for="c in CATEGORIES"
            :key="c"
            type="button"
            class="class-tag cat choice"
            :class="{ on: draft.interests.includes(c) }"
            :style="draft.interests.includes(c) ? { background: CATEGORY_META[c].bg, color: CATEGORY_META[c].color } : {}"
            @click="toggleInterest(c)"
          ><Icon :name="CATEGORY_META[c].icon" :size="13" />{{ CATEGORY_META[c].label }}</button>
        </div>
      </div>

      <div class="form-actions">
        <button type="button" class="link-btn" @click="showForm = false">Cancel</button>
        <button type="submit" class="primary-btn">Save</button>
      </div>
    </form>
  </section>
</template>
