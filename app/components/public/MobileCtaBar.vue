<script setup lang="ts">
// Barra fixa no rodapé do celular com a única ação que o casal precisa de
// verdade: confirmar presença. Vem do protótipo do convite, e resolve um
// problema real do site — a home tem dez capítulos, e quem lê tudo até o fim
// no celular fica longe do CTA a maior parte do tempo.
//
// Só no celular: no desktop o cabeçalho fica visível o tempo todo e já carrega
// o mesmo destino, então a barra seria redundante ocupando altura útil.
//
// Não aparece quando o casal desligou a seção de RSVP: nesse caso a
// confirmação não é o que ele quer que o convidado faça, e uma barra fixa
// insistindo nisso contraria a escolha dele.
interface Props {
  slug: string
  /** `config_tema.hiddenSections` — desligar o RSVP também apaga esta barra. */
  hiddenSections?: string[]
}

const { slug, hiddenSections = [] } = defineProps<Props>()

const isVisible = computed(() => !hiddenSections.includes('confirmar-presenca'))
const rsvpLink = computed(() => `/${slug}/rsvp`)
</script>

<template>
  <template v-if="isVisible">
    <div
      class="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-surface/95 p-3 backdrop-blur md:hidden"
    >
      <NuxtLink
        :to="rsvpLink"
        class="flex h-12 items-center justify-center gap-2 rounded-full bg-primary text-sm font-medium text-primary-foreground [font-family:var(--font-button)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <Icon name="lucide:heart-handshake" class="h-4 w-4" aria-hidden="true" />
        Confirmar presença
      </NuxtLink>
    </div>

    <!--
      Espaçador da mesma altura da barra. Sem ele o rodapé fica coberto: a
      barra é `fixed`, não ocupa espaço no fluxo, e as últimas linhas da página
      passariam por baixo dela sem nunca poderem ser roladas até aparecer.
    -->
    <div class="h-20 md:hidden" aria-hidden="true" />
  </template>
</template>
