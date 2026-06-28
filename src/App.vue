<script setup lang="ts">
/**
 * Scaffold shell. For this first step it simply loads the seed activities
 * through the data service and lists them, to prove the project runs and the
 * data layer works. The real features (kid onboarding, filtering, saving,
 * .ics export) are built in the next step once the scaffold is approved.
 */
import { onMounted, ref } from 'vue'
import { getActivities } from './services/dataService'
import type { Activity } from './types'

const activities = ref<Activity[]>([])

onMounted(async () => {
  activities.value = await getActivities()
})

function ageLabel(a: Activity): string {
  return `Ages ${a.ageMin}–${a.ageMax}`
}
</script>

<template>
  <header>
    <h1>Christchurch Holiday Planner</h1>
    <p class="tagline">Plan the school holidays around your kids — in a couple of taps.</p>
    <p class="privacy-note">
      🔒 Private by design. Your kids' profiles and saved activities stay on this
      device. Nothing about a child is ever sent anywhere.
    </p>
  </header>

  <main>
    <p class="tagline" v-if="activities.length">
      {{ activities.length }} example activities loaded (scaffold preview).
    </p>

    <article v-for="a in activities" :key="a.id" class="card">
      <h2>{{ a.name }}</h2>
      <p class="provider">{{ a.provider }} · {{ a.suburb }}</p>
      <p class="desc">{{ a.description }}</p>
      <div class="tags">
        <span class="tag">{{ ageLabel(a) }}</span>
        <span class="tag" :class="`cost-${a.cost}`">
          {{ a.cost === 'free' ? 'Free' : `$${a.price}` }}
        </span>
        <span v-for="c in a.categories" :key="c" class="tag">{{ c }}</span>
      </div>
    </article>
  </main>
</template>
