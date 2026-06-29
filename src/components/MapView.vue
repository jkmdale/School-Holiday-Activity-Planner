<script setup lang="ts">
/**
 * Map of points (activities or playgrounds), using Leaflet + OpenStreetMap
 * tiles (free, with attribution). Tapping a marker emits `select` with its id
 * when `selectable` is set. A "you" marker shows if location is opted in.
 */
import { onMounted, onBeforeUnmount, ref, watch, nextTick } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { state } from '../store'

interface MapPoint { id: string; name: string; lat?: number; lng?: number }

const props = defineProps<{ points: MapPoint[]; selectable?: boolean }>()
const emit = defineEmits<{ (e: 'select', id: string): void }>()

const el = ref<HTMLElement | null>(null)
let map: L.Map | null = null
let markers: L.LayerGroup | null = null
let meMarker: L.Marker | null = null

const CHCH: L.LatLngTuple = [-43.5321, 172.6362]

const pinIcon = L.divIcon({ className: 'map-pin', html: '', iconSize: [18, 18], iconAnchor: [9, 9] })
const meIcon = L.divIcon({ className: 'map-me', html: '', iconSize: [16, 16], iconAnchor: [8, 8] })

const withCoords = () => props.points.filter((p) => p.lat != null && p.lng != null)

function render() {
  if (!map || !markers) return
  markers.clearLayers()
  const pts: L.LatLngTuple[] = []
  for (const p of withCoords()) {
    const ll: L.LatLngTuple = [p.lat as number, p.lng as number]
    pts.push(ll)
    const m = L.marker(ll, { icon: pinIcon }).bindTooltip(p.name, { direction: 'top', offset: [0, -8] })
    if (props.selectable) m.on('click', () => emit('select', p.id))
    m.addTo(markers)
  }
  if (meMarker) { meMarker.remove(); meMarker = null }
  if (state.coords) {
    meMarker = L.marker([state.coords.lat, state.coords.lng], { icon: meIcon })
      .bindTooltip('You', { direction: 'top', offset: [0, -8] })
      .addTo(map)
    pts.push([state.coords.lat, state.coords.lng])
  }
  if (pts.length > 1) map.fitBounds(L.latLngBounds(pts).pad(0.2))
  else if (pts.length === 1) map.setView(pts[0], 14)
  else map.setView(CHCH, 11)
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

watch(() => props.points, render)

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
      Nothing to map here yet.
    </p>
  </div>
</template>
