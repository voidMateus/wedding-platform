<script setup lang="ts">
// Embed do Google Maps (mesmo padrão visual do concorrente comparado nesta
// fase) — iframe simples, sem chave de API/billing: usa a URL pública
// google.com/maps?q=...&output=embed, não a "Maps Embed API" oficial (essa
// exige chave). SSR-safe (iframe não precisa de window/DOM como Leaflet
// precisava — por isso este componente não tem sufixo .client).
interface Props {
  query: string
  label: string
}

const { query, label } = defineProps<Props>()

const embedUrl = computed(
  () => `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`,
)
</script>

<template>
  <div class="h-64 w-full overflow-hidden rounded-lg border border-border sm:h-80">
    <iframe
      :src="embedUrl"
      :title="`Mapa do local: ${label}`"
      class="h-full w-full"
      style="border: 0"
      loading="lazy"
      referrerpolicy="no-referrer-when-downgrade"
    />
  </div>
</template>
