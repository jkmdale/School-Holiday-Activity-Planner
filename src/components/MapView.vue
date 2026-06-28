<script setup lang="ts">
/**
 * Map of the current results, using Leaflet + OpenStreetMap tiles (free, with
 * attribution). Markers come from each activity's lat/lng; tapping one opens the
 * detail sheet. A "you" marker shows if the parent has opted into location.
 */
import { onMounted, onBeforeUnmount, ref, watch, nextTick } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Activity } from '../types'
import { state, openActivity } from '../store'

const props = defineProps<{ activities: Activity[] }>()

const el = ref<HTMLElement | null>(null)
let map: L.Map | null = null
let markers: L.LayerGroup | null = null
let meMarker: L.Marker | null = null

const CHCH: L.LatLngTuple = [-43.5321, 172.6362]

const pinIcon = L.divIcon({ className: 'map-pin', html: '', iconSize: [18, 18], iconAnchor: [9, 9] })
const meIcon = L.divIcon({ className: 'map-me', html: '', iconSize: [16, 16], iconAnchor: [8, 8] })

const withCoords = () => props.activities.filter((a) => a.lat != null && a.lng != null)

function render() {
  if (!map || !markers) return
  markers.clearLayers()
  const pts: L.LatLngTuple[] = []
  for (const a of withCoords()) {
    const ll: L.LatLngTuple = [a.lat as number, a.lng as number]
    pts.push(ll)
    L.marker(ll, { icon: pinIcon })
      .bindTooltip(a.name, { direction: 'top', offset: [0, -8] })
      .on('click', () => openActivity(a.id))
      .addTo(markers)
  }
  // "You" marker
  if (meMarker) { meMarker.remove(); meMarker = null }
  if (state.coords) {
    meMarker = L.marker([state.coords.lat, state.coords.lng], { icon: meIcon })
      .bindTooltip('You', { direction: 'top', offset: [0, -8] })
      .addTo(map)
    pts.push([state.coords.lat, state.coords.lng])
  }
  if (pts.length > 1) {
    map.fitBounds(L.latLngBounds(pts).pad(0.2))
  } else if (pts.length === 1) {
    map.setView(pts[0], 13)
  } else {
    map.setView(CHCH, 11)
  }
}

onMounted(() => {
  if (!el.value) return
  map = L.map(el.value, { scrollWheelZoom: false }).setView(CHCH, 11)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(map)
  markers = L.layerGroup().addTo(map)
  nextTick(() => {
    map?.invalidateSize()
    render()
  })
})

watch(() => props.activities, render)

onBeforeUnmount(() => {
  map?.remove()
  map = null
  markers = null
  meMarker = null
})
</script>

<template>
  <div class="map-wrap">
    <div ref="el" class="map" />
    <p v-if="!withCoords().length" class="map-note">
      None of these results have a location to map. Try widening your filters.
    </p>
  </div>
</template>
