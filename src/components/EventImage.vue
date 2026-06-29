<script setup lang="ts">
/**
 * Event header visual. Shows the real photo when an activity has an `image`
 * URL; otherwise renders an attractive generated banner from the activity's
 * primary category (gradient tint + large faded category icon) so every event
 * has a picture either way.
 */
import { computed, ref } from 'vue'
import type { Activity } from '../types'
import { CATEGORY_META } from '../utils/categories'
import Icon from './Icon.vue'

const props = defineProps<{ activity: Activity; height?: number }>()

const cat = computed(() => props.activity.categories[0] ?? 'social')
const meta = computed(() => CATEGORY_META[cat.value])
const failed = ref(false)
const showPhoto = computed(() => !!props.activity.image && !failed.value)
</script>

<template>
  <div class="event-img" :style="{ height: (height ?? 116) + 'px' }">
    <img
      v-if="showPhoto"
      :src="activity.image"
      :alt="activity.name"
      loading="lazy"
      @error="failed = true"
    />
    <div
      v-else
      class="event-img-gen"
      :style="{ background: `linear-gradient(135deg, ${meta.bg}, #ffffff)`, color: meta.color }"
    >
      <Icon :name="meta.icon" :size="46" />
    </div>
  </div>
</template>
