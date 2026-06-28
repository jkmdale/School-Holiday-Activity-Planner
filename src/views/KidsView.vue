<script setup lang="ts">
import { reactive, ref } from 'vue'
import { CATEGORIES, type Category, type KidProfile } from '../types'
import { state, addKid, updateKid, removeKid } from '../store'

/** Form model for adding/editing a kid. */
const draft = reactive<{ id: string | null; name: string; age: number | null; interests: Category[] }>(
  { id: null, name: '', age: null, interests: [] }
)
const showForm = ref(false)

function startAdd() {
  Object.assign(draft, { id: null, name: '', age: null, interests: [] })
  showForm.value = true
}

function startEdit(kid: KidProfile) {
  Object.assign(draft, { id: kid.id, name: kid.name, age: kid.age, interests: [...kid.interests] })
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
    await updateKid({ id: draft.id, name, age: draft.age, interests: [...draft.interests] })
  } else {
    await addKid({ name, age: draft.age, interests: [...draft.interests] })
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
    <p class="privacy-note">
      🔒 Private by design. Your kids' profiles and saved activities are stored
      only on this device and are never sent anywhere.
    </p>

    <div class="section-head">
      <h2 class="section-title">Your kids</h2>
      <button v-if="!showForm" class="primary-btn" @click="startAdd">+ Add a kid</button>
    </div>

    <p v-if="!state.kids.length && !showForm" class="empty">
      Add a kid to start planning. Their age and interests are used to filter
      activities just for them.
    </p>

    <!-- Kid list -->
    <ul v-if="!showForm" class="kid-list">
      <li v-for="kid in state.kids" :key="kid.id" class="kid-row">
        <div>
          <strong>{{ kid.name }}</strong>
          <span class="muted"> · age {{ kid.age }}</span>
          <div class="tags" v-if="kid.interests.length">
            <span v-for="c in kid.interests" :key="c" class="tag">{{ c }}</span>
          </div>
          <div class="muted small" v-else>No interests set</div>
        </div>
        <div class="kid-actions">
          <button class="link-btn" @click="startEdit(kid)">Edit</button>
          <button class="link-btn danger" @click="confirmRemove(kid)">Remove</button>
        </div>
      </li>
    </ul>

    <!-- Add / edit form -->
    <form v-if="showForm" class="card form" @submit.prevent="save">
      <h2 class="section-title">{{ draft.id ? 'Edit kid' : 'Add a kid' }}</h2>

      <label class="field">
        <span>Name</span>
        <input v-model="draft.name" type="text" placeholder="e.g. Maia" required />
      </label>

      <label class="field">
        <span>Age (years)</span>
        <input v-model.number="draft.age" type="number" min="0" max="18" required />
      </label>

      <div class="field">
        <span>Interests</span>
        <div class="tags choices">
          <button
            v-for="c in CATEGORIES"
            :key="c"
            type="button"
            class="tag choice"
            :class="{ on: draft.interests.includes(c) }"
            @click="toggleInterest(c)"
          >
            {{ c }}
          </button>
        </div>
      </div>

      <div class="form-actions">
        <button type="button" class="link-btn" @click="showForm = false">Cancel</button>
        <button type="submit" class="primary-btn">Save</button>
      </div>
    </form>
  </section>
</template>
