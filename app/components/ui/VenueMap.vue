<script setup lang="ts">
// Embed do Google Maps (mesmo padrão visual do concorrente comparado nesta
// fase) — iframe simples, sem chave de API/billing: usa a URL pública
// google.com/maps?q=...&output=embed, não a "Maps Embed API" oficial (essa
// exige chave). SSR-safe (iframe não precisa de window/DOM como Leaflet
// precisava — por isso este componente não tem sufixo .client).
//
// Promovido de components/public/ para ui/ na Fase Localização: além do card
// do site público, o painel usa o mesmo embed como preview de confirmação do
// local escolhido (CLAUDE.md, seção 5 — genérico só sobe para ui/ depois de
// aparecer em 2+ contextos reais; admin nunca importa de public/).
interface Props {
  /** Coordenadas ("lat,lng") ou endereço em texto — ver montarConsultaEmbedMapa. */
  query: string
  label: string
  /**
   * 'sm' é o preview de confirmação do painel: pequeno e só informativo, para
   * o casal reconhecer o ponto sem o mapa tomar a tela (CLAUDE.md, seção 12).
   * 'md' (default) é o mapa do site público, feito para o convidado explorar.
   */
  size?: 'sm' | 'md'
}

const { query, label, size = 'md' } = defineProps<Props>()

const SIZE_CLASSES: Record<NonNullable<Props['size']>, string> = {
  sm: 'h-40',
  md: 'h-64 sm:h-80',
}

const embedUrl = computed(
  () => `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`,
)
</script>

<template>
  <div class="w-full overflow-hidden rounded-lg border border-border" :class="SIZE_CLASSES[size]">
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
