<script setup lang="ts">
// Seção de maior destaque da home (pedido do usuário — CLAUDE.md, seção 21):
// tone="accent" (mesma banda usada no Hero sem foto de capa) e CTA real para
// a busca por nome em /{slug}/rsvp (RsvpInviteFlow — busca tolerante →
// confirmação leve mascarada → convite completo), não apenas um cartão
// informativo estático.
import type { Wedding } from '~/types/wedding'

interface Props {
  wedding: Wedding
  /** Fundo da seção — resolvido pela página (resolveHomeSections). 'accent' é o tom fixo desta seção no catálogo. */
  tone?: 'default' | 'muted' | 'accent'
}

const { wedding, tone = 'accent' } = defineProps<Props>()

const rsvpLink = computed(() => `/${wedding.slug}/rsvp`)

const formattedDate = computed(() =>
  new Date(`${wedding.data_evento}T00:00:00`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }),
)
</script>

<template>
  <PublicEditorialSection
    id="confirmar-presenca"
    eyebrow="R.S.V.P"
    title="Confirme sua Presença"
    :tone="tone"
  >
    <!--
      Texto centrado e um botão, sem cartão em volta: esta seção já é a banda
      de destaque da página (tone accent), e um cartão elevado dentro dela
      criava uma segunda moldura em torno de um conteúdo de três linhas. É o
      tratamento do protótipo — o peso vem da faixa, não de uma caixa.
    -->
    <div class="mx-auto flex max-w-2xl flex-col items-center gap-6 text-center">
      <p class="leading-relaxed text-body">
        Digite seu nome para localizar seu convite — ele já traz todas as pessoas do seu grupo, e
        você confirma cada uma na etapa seguinte.
      </p>
      <p class="text-xs tracking-[0.2em] text-text-muted uppercase">{{ formattedDate }}</p>
      <UiButton :to="rsvpLink" rounded="full" size="lg">
        <Icon name="lucide:check" class="h-4 w-4" />
        Confirmar presença
      </UiButton>
    </div>
  </PublicEditorialSection>
</template>
