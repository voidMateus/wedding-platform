<script setup lang="ts">
// Rodapé com o mesmo tratamento editorial das seções (banda tonal, marca
// central, tipografia serifada) — antes era só uma linha de texto solta,
// destoando do resto do site (pedido do usuário: "nosso rodapé também
// precisa ser bonito de igual forma", referência de estilo mimodocasal.com.br).
interface Props {
  coupleNames?: string | null
  eventDate?: string | null
}

const { coupleNames, eventDate } = defineProps<Props>()

const formattedDate = computed(() =>
  eventDate
    ? new Date(`${eventDate}T00:00:00`).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : null,
)
</script>

<template>
  <footer class="relative bg-gradient-to-b from-surface-muted to-surface px-4 py-14 text-center">
    <!-- Mesma costura curva das seções (EditorialSection) — sem linha reta antes do rodapé. -->
    <svg
      viewBox="0 0 1440 96"
      preserveAspectRatio="none"
      aria-hidden="true"
      class="pointer-events-none absolute inset-x-0 bottom-full h-10 w-full text-surface-muted sm:h-14"
    >
      <path fill="currentColor" d="M0,96 L0,64 Q720,0 1440,64 L1440,96 Z" />
    </svg>
    <div class="mx-auto flex max-w-md flex-col items-center gap-3">
      <Icon name="lucide:sparkle" class="h-5 w-5 text-primary/50" />
      <p v-if="coupleNames" class="font-display text-2xl font-semibold text-heading">{{ coupleNames }}</p>
      <p v-if="formattedDate" class="text-xs font-medium tracking-[0.3em] text-primary/50 uppercase">
        {{ formattedDate }}
      </p>
      <UiSectionDivider />
      <p class="text-xs text-text-muted">Feito com <span class="text-primary">♥</span> por MeuSiteCasamento</p>
    </div>
  </footer>
</template>
