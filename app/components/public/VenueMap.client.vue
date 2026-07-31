<script setup lang="ts">
// Sufixo .client: Leaflet manipula window/document diretamente e não pode
// rodar em SSR (CLAUDE.md, seção 22.2). Mapa livre, sem chave de API —
// tiles do OpenStreetMap. Import dinâmico (não estático no topo do
// arquivo) de propósito: o pacote "leaflet" não publica um entry point
// ESM (só "main", estilo UMD) — import estático nesse formato causou o
// mapa a nunca inicializar em produção nesta fase (onMounted rodava, mas
// o objeto importado não se comportava como a API real do Leaflet).
// Import dinâmico dentro de onMounted evita qualquer ambiguidade de
// bundling e é o padrão recomendado para bibliotecas client-only no Nuxt.
import type { Map as LeafletMap } from 'leaflet'

interface Props {
  latitude: number
  longitude: number
  label: string
}

const { latitude, longitude, label } = defineProps<Props>()

const mapContainer = ref<HTMLElement | null>(null)
let map: LeafletMap | null = null

onMounted(async () => {
  const [{ default: L }] = await Promise.all([import('leaflet'), import('leaflet/dist/leaflet.css')])

  if (!mapContainer.value) return

  map = L.map(mapContainer.value, {
    center: [latitude, longitude],
    zoom: 15,
    scrollWheelZoom: false,
  })

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(map)

  L.marker([latitude, longitude]).addTo(map).bindPopup(label)
})

onBeforeUnmount(() => {
  map?.remove()
  map = null
})
</script>

<template>
  <div
    ref="mapContainer"
    class="h-64 w-full overflow-hidden rounded-lg border border-border sm:h-80"
    role="img"
    :aria-label="`Mapa do local: ${label}`"
  />
</template>
