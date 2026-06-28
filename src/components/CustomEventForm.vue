<script setup lang="ts">
/**
 * Create or edit the parent's own event/plan. Custom events are stored locally
 * and flow through the saved list, calendar and .ics export exactly like
 * catalogue activities. On create, the event can be added to one or more kids'
 * plans straight away.
 */
import { reactive, ref, watch, computed } from 'vue'
import { CATEGORIES, type Activity, type Category } from '../types'
import {
  state, addCustomActivity, updateCustomActivity, toggleSave, isSaved, notify
} from '../store'
import { CATEGORY_META, avatarColor, initial } from '../utils/categories'
import { useModal } from '../composables/useModal'
import Icon from './Icon.vue'

const props = defineProps<{ open: boolean; editing: Activity | null; defaultKidIds: string[] }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const sheet = ref<HTMLElement | null>(null)
useModal({ isOpen: () => props.open, onClose: () => emit('close'), container: sheet })

interface Draft {
  name: string
  location: string
  description: string
  category: Category
  cost: 'free' | 'paid'
  price: number | null
  startDate: string
  endDate: string
  allDay: boolean
  start: string
  end: string
  kidIds: string[]
}

function blank(): Draft {
  return {
    name: '', location: '', description: '', category: 'social',
    cost: 'free', price: null,
    startDate: '', endDate: '', allDay: true, start: '10:00', end: '12:00',
    kidIds: [...props.defaultKidIds]
  }
}

const draft = reactive<Draft>(blank())
const error = ref('')
const isEdit = computed(() => !!props.editing)

// (Re)load the draft whenever the sheet opens.
watch(
  () => props.open,
  (open) => {
    if (!open) return
    error.value = ''
    const e = props.editing
    if (e) {
      Object.assign(draft, {
        name: e.name,
        location: e.suburb,
        description: e.description,
        category: e.categories[0] ?? 'social',
        cost: e.cost,
        price: e.price ?? null,
        startDate: e.startDate,
        endDate: e.endDate !== e.startDate ? e.endDate : '',
        allDay: !e.sessionTimes,
        start: e.sessionTimes?.start ?? '10:00',
        end: e.sessionTimes?.end ?? '12:00',
        kidIds: []
      })
    } else {
      Object.assign(draft, blank())
    }
  },
  { immediate: true }
)

function toggleKid(id: string) {
  const i = draft.kidIds.indexOf(id)
  if (i === -1) draft.kidIds.push(id)
  else draft.kidIds.splice(i, 1)
}

function build(): Activity | string {
  const name = draft.name.trim()
  if (!name) return 'Give your event a name.'
  if (!draft.startDate) return 'Pick a date.'
  const endDate = draft.endDate || draft.startDate
  if (endDate < draft.startDate) return 'The end date is before the start date.'
  if (!draft.allDay) {
    if (!draft.start || !draft.end) return 'Add a start and end time (or switch to all day).'
    if (draft.start >= draft.end) return 'The end time must be after the start time.'
  }
  if (draft.cost === 'paid' && (draft.price == null || draft.price < 0)) {
    return 'Enter a price, or mark it free.'
  }

  const activity: Activity = {
    id: props.editing?.id ?? 'pending',
    name,
    provider: 'Your event',
    description: draft.description.trim(),
    suburb: draft.location.trim() || 'Christchurch',
    ageMin: 0,
    ageMax: 18,
    categories: [draft.category],
    cost: draft.cost,
    registrationRequired: false,
    startDate: draft.startDate,
    endDate,
    custom: true
  }
  if (draft.cost === 'paid' && draft.price != null) activity.price = draft.price
  if (!draft.allDay) activity.sessionTimes = { start: draft.start, end: draft.end }
  return activity
}

async function submit() {
  const built = build()
  if (typeof built === 'string') {
    error.value = built
    return
  }
  if (props.editing) {
    await updateCustomActivity(built)
    notify('Event updated.')
  } else {
    const created = await addCustomActivity(built)
    if (created) {
      for (const id of draft.kidIds) {
        if (!isSaved(id, created.id)) await toggleSave(id, created.id)
      }
      notify(draft.kidIds.length ? 'Event added to your plan.' : 'Event created.')
    }
  }
  emit('close')
}
</script>

<template>
  <Transition name="sheet">
    <div v-if="open" class="modal-overlay" @click.self="emit('close')">
      <section ref="sheet" class="sheet" role="dialog" aria-modal="true"
        :aria-label="isEdit ? 'Edit event' : 'Add your own event'">
        <div class="sheet-bar">
          <span class="sheet-grip" />
          <button class="install-x sheet-close" aria-label="Close" @click="emit('close')">✕</button>
        </div>
        <div class="sheet-body">
          <h2 class="detail-title">{{ isEdit ? 'Edit event' : 'Add your own event' }}</h2>

          <form @submit.prevent="submit">
            <label class="field">
              <span class="field-label">Event name</span>
              <input v-model="draft.name" type="text" placeholder="e.g. Swimming lesson" required />
            </label>

            <label class="field">
              <span class="field-label">Location (optional)</span>
              <input v-model="draft.location" type="text" placeholder="e.g. Jellie Park" />
            </label>

            <div class="filter-grid">
              <label class="field compact">
                <span class="field-label">Date</span>
                <input v-model="draft.startDate" type="date" required />
              </label>
              <label class="field compact">
                <span class="field-label">End date (optional)</span>
                <input v-model="draft.endDate" type="date" :min="draft.startDate" />
              </label>
            </div>

            <label class="switch-row">
              <span>All day</span>
              <span class="switch">
                <input v-model="draft.allDay" type="checkbox" />
                <span class="track"><span class="thumb" /></span>
              </span>
            </label>

            <div v-if="!draft.allDay" class="filter-grid">
              <label class="field compact">
                <span class="field-label">Start time</span>
                <input v-model="draft.start" type="time" />
              </label>
              <label class="field compact">
                <span class="field-label">End time</span>
                <input v-model="draft.end" type="time" />
              </label>
            </div>

            <div class="field">
              <span class="field-label">Cost</span>
              <div class="segmented">
                <button type="button" :class="{ on: draft.cost === 'free' }" @click="draft.cost = 'free'">Free</button>
                <button type="button" :class="{ on: draft.cost === 'paid' }" @click="draft.cost = 'paid'">Paid</button>
              </div>
            </div>
            <label v-if="draft.cost === 'paid'" class="field">
              <span class="field-label">Price (NZD)</span>
              <input v-model.number="draft.price" type="number" min="0" placeholder="e.g. 12" />
            </label>

            <label class="field">
              <span class="field-label">Category</span>
              <select v-model="draft.category">
                <option v-for="c in CATEGORIES" :key="c" :value="c">{{ CATEGORY_META[c].label }}</option>
              </select>
            </label>

            <label class="field">
              <span class="field-label">Notes (optional)</span>
              <textarea v-model="draft.description" rows="2" placeholder="Anything to remember"></textarea>
            </label>

            <div v-if="!isEdit && state.kids.length" class="field">
              <span class="field-label">Add to whose plan?</span>
              <div class="kid-picker">
                <button
                  v-for="k in state.kids"
                  :key="k.id"
                  type="button"
                  class="kid-chip"
                  :class="{ on: draft.kidIds.includes(k.id) }"
                  @click="toggleKid(k.id)"
                >
                  <span class="avatar sm" :style="{ background: avatarColor(k.name) }">{{ initial(k.name) }}</span>
                  {{ k.name }}
                </button>
              </div>
            </div>

            <p v-if="error" class="form-error">{{ error }}</p>

            <div class="detail-actions">
              <button type="submit" class="primary-btn">
                <Icon name="check" :size="16" /> {{ isEdit ? 'Save changes' : 'Add event' }}
              </button>
              <button type="button" class="primary-btn ghost" @click="emit('close')">Cancel</button>
            </div>
          </form>
        </div>
      </section>
    </div>
  </Transition>
</template>
