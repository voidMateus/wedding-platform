<script setup lang="ts">
import type * as LeafletNamespace from 'leaflet'
import type { PlaceSuggestion } from '~/types/place'

/**
 * Posicionamento manual do marcador — o caminho para locais que não existem
 * como Place no Maps (chácara, sítio, salão pequeno, endereço rural), sem que
 * o casal precise saber o que é uma coordenada (CLAUDE.md, seção 12).
 *
 * Leaflet + tiles do OpenStreetMap, não o SDK do Google: o mapa arrastável é
 * exclusivo do painel, então o peso da biblioteca nunca chega ao convidado, e
 * este uso não acrescenta cobrança por carregamento de mapa à conta do
 * provedor de lugares. O site público continua com o embed sem chave
 * (UiVenueMap) — são dois usos diferentes, não uma inconsistência.
 *
 * `.client.vue`: Leaflet toca `window`/DOM na importação.
 */
interface Props {
  modelValue: boolean
  latitude: number | null
  longitude: number | null
  /** Mostrado acima do mapa para o casal saber que local está posicionando. */
  addressHint?: string
}

const { modelValue, latitude, longitude, addressHint } = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [position: { latitude: number; longitude: number }]
}>()

const { placesSearchEnabled } = useRuntimeConfig().public
const { getPlaceDetails } = usePlaces()

// Centro do país num zoom bem aberto: sem coordenada prévia, qualquer cidade
// escolhida como padrão estaria errada para a maioria dos casais.
const FALLBACK_CENTER: [number, number] = [-15.78, -47.93]
const FALLBACK_ZOOM = 4
const PLACE_ZOOM = 17

const mapEl = ref<HTMLElement | null>(null)
const position = ref<{ latitude: number; longitude: number } | null>(null)
const isLoadingMap = ref(false)

let map: LeafletNamespace.Map | null = null
let marker: LeafletNamespace.Marker | null = null

/**
 * Ícone em HTML em vez do marcador padrão do Leaflet: o default aponta para
 * arquivos .png relativos ao CSS da biblioteca, que o bundler reescreve e
 * quebra — o resultado clássico é um mapa sem marcador nenhum. Um divIcon não
 * carrega imagem alguma.
 */
function buildIcon(L: typeof LeafletNamespace): LeafletNamespace.DivIcon {
  return L.divIcon({
    className: '',
    html: `<span class="admin-map-pin"></span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
  })
}

function setPosition(latitude: number, longitude: number): void {
  position.value = { latitude, longitude }
  marker?.setLatLng([latitude, longitude])
}

async function initMap(): Promise<void> {
  if (!mapEl.value || map) return
  isLoadingMap.value = true
  try {
    // Leaflet ainda é publicado como CJS: dependendo do interop do bundler o
    // objeto `L` chega em `default` ou como o próprio namespace.
    const mod = await import('leaflet')
    const L = ((mod as { default?: typeof LeafletNamespace }).default ??
      mod) as typeof LeafletNamespace

    const hasInitial = latitude !== null && longitude !== null
    const center: [number, number] = hasInitial ? [latitude, longitude] : FALLBACK_CENTER

    map = L.map(mapEl.value, { center, zoom: hasInitial ? PLACE_ZOOM : FALLBACK_ZOOM })
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      // Exigida pela política de uso dos tiles do OpenStreetMap.
      attribution: '© OpenStreetMap',
    }).addTo(map)

    marker = L.marker(center, { draggable: true, icon: buildIcon(L) }).addTo(map)
    marker.on('dragend', () => {
      const latLng = marker!.getLatLng()
      position.value = { latitude: latLng.lat, longitude: latLng.lng }
    })
    // Clicar no mapa também move o marcador: arrastar um pin de 28px num
    // celular é bem mais difícil do que tocar no lugar certo.
    map.on('click', (event: LeafletNamespace.LeafletMouseEvent) => {
      setPosition(event.latlng.lat, event.latlng.lng)
    })

    position.value = hasInitial ? { latitude, longitude } : null
  } finally {
    isLoadingMap.value = false
  }
}

function destroyMap(): void {
  map?.remove()
  map = null
  marker = null
}

watch(
  () => modelValue,
  async (isOpen) => {
    if (!isOpen) {
      destroyMap()
      return
    }
    // O conteúdo do modal só existe no DOM depois de aberto (Reka UI usa
    // portal), então o container do mapa não pode ser medido antes disto.
    await nextTick()
    await initMap()
  },
)

onBeforeUnmount(destroyMap)

/** Busca dentro do picker: reposiciona o mapa, mas o ponto salvo continua sendo o do marcador. */
async function centerOnSuggestion(suggestion: PlaceSuggestion): Promise<void> {
  try {
    const { place } = await getPlaceDetails(suggestion.placeId)
    map?.setView([place.latitude, place.longitude], PLACE_ZOOM)
    setPosition(place.latitude, place.longitude)
  } catch {
    // Sem reposicionamento automático o casal ainda pode navegar à mão —
    // nada aqui impede concluir o posicionamento.
  }
}

function confirm(): void {
  if (!position.value) return
  emit('confirm', position.value)
  emit('update:modelValue', false)
}
</script>

<template>
  <UiModal
    :model-value="modelValue"
    title="Posicione o marcador no local correto"
    description="Toque ou arraste o marcador até o ponto exato. Ele é o que aparece no mapa do site."
    size="lg"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="flex flex-col gap-3">
      <p v-if="addressHint" class="text-sm text-text-muted">{{ addressHint }}</p>

      <AdminLocationSearchBox
        v-if="placesSearchEnabled"
        placeholder="Buscar um endereço para aproximar o mapa"
        @select="centerOnSuggestion"
      />

      <div class="relative h-80 w-full overflow-hidden rounded-lg border border-border">
        <div ref="mapEl" class="h-full w-full" />
        <p
          v-if="isLoadingMap"
          class="absolute inset-0 flex items-center justify-center bg-surface text-sm text-text-muted"
        >
          Carregando mapa...
        </p>
      </div>

      <p class="text-xs text-text-muted" role="status" aria-live="polite">
        {{ position ? 'Posição definida.' : 'Toque no mapa para posicionar o marcador.' }}
      </p>
    </div>

    <template #footer>
      <UiButton variant="ghost" @click="emit('update:modelValue', false)">Cancelar</UiButton>
      <UiButton :disabled="!position" @click="confirm">Confirmar localização</UiButton>
    </template>
  </UiModal>
</template>

<style>
/* Não escopado: o CSS do Leaflet estiliza nós que ele mesmo cria em runtime,
   fora do alcance do atributo de escopo do Vue. */
@import 'leaflet/dist/leaflet.css';

/* Marcador desenhado em CSS (ver buildIcon) — sem nenhum arquivo de imagem
   para o bundler reescrever. Vive aqui, e não como classe Tailwind, porque o
   HTML do ícone é criado pelo Leaflet, não pelo template. */
.admin-map-pin {
  display: block;
  width: 28px;
  height: 28px;
  border-radius: 50% 50% 50% 0;
  transform: rotate(-45deg);
  background: var(--color-primary);
  border: 2px solid #fff;
  box-shadow: 0 2px 6px rgb(0 0 0 / 35%);
}
</style>
