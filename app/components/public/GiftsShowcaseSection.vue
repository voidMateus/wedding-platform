<script setup lang="ts">
// Teaser (não a vitrine completa embutida) — direciona pra página dedicada
// /{slug}/presentes, pública desde sempre, sem token de convite (CLAUDE.md,
// seção 18.2/4.5).
interface Props {
  /** Fundo da seção — resolvido pela página (resolveHomeSections), nunca fixo aqui. */
  tone?: 'default' | 'muted'
}

const { tone = 'default' } = defineProps<Props>()

const slug = useWeddingSlug()
const giftsLink = computed(() => `/${slug}/presentes`)
</script>

<template>
  <PublicEditorialSection
    id="presentes"
    eyebrow="Para essa nova fase"
    title="Lista de Presentes"
    :tone="tone"
  >
    <div class="mx-auto flex max-w-2xl flex-col items-center gap-6 text-center">
      <p class="leading-relaxed text-body">
        Sua presença já é o presente mais importante. Mas se quiser nos ajudar a começar essa nova
        fase, preparamos uma lista com carinho — de itens do dia a dia a uma contribuição para a lua
        de mel.
      </p>
      <!-- Contorno, não preenchido: numa página que já tem "Confirmar presença"
           em destaque, dois botões sólidos disputariam a mesma atenção — e a
           confirmação é a ação de que o casal precisa de fato. -->
      <UiButton :to="giftsLink" variant="outline" rounded="full" size="lg">
        <Icon name="lucide:gift" class="h-4 w-4" />
        Ver lista de presentes
      </UiButton>
    </div>
  </PublicEditorialSection>
</template>
