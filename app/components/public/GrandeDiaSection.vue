<script setup lang="ts">
// "O Grande Dia" — seção única cobrindo Cerimônia e Recepção (CLAUDE.md,
// §12.2/§21), mesmo quando os dois eventos têm endereços diferentes e por
// isso viram dois cards lado a lado em vez de um só (ver
// groupEventSegmentsByVenue). Antes cada grupo virava sua própria seção com
// título dinâmico ("Cerimônia", "Cerimônia e Recepção"...) — agora existe um
// único capítulo com nome fixo, e PublicEventSpotlight passa a ser só o
// cartão de conteúdo, não a seção inteira.
import type { EventSegment } from '~/types/event-segment'

interface Props {
  groups: EventSegment[][]
}

const { groups } = defineProps<Props>()
</script>

<template>
  <PublicEditorialSection v-if="groups.length" id="grande-dia" title="O Grande Dia">
    <div class="mx-auto grid w-full gap-6" :class="groups.length > 1 ? 'max-w-4xl sm:grid-cols-2' : 'max-w-xl'">
      <PublicEventSpotlight v-for="group in groups" :key="group[0]!.id" :segments="group" />
    </div>
  </PublicEditorialSection>
</template>
