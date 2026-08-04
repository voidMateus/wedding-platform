<script setup lang="ts">
// Teaser (não mais a vitrine completa embutida) — direciona pra página
// dedicada /{slug}/presentes, pensada pra escalar quando a lista crescer
// bastante (ex.: 100+ itens, agrupados por categoria). CLAUDE.md, redesign
// pós-Fase Premium Experience, foco em RSVP/Presentes.
interface Props {
  /** ?code= atual, resolvido pela página (evita useRoute() aqui — mantém testável com @vue/test-utils puro). */
  code?: string
}

const { code } = defineProps<Props>()
const slug = useWeddingSlug()

const giftsLink = computed(() => `/${slug}/presentes${code ? `?code=${code}` : ''}`)
</script>

<template>
  <PublicEditorialSection id="presentes" title="Lista de Presentes">
    <div class="mx-auto flex max-w-md flex-col items-center gap-4 text-center">
      <span class="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon name="lucide:gift" class="h-6 w-6" />
      </span>
      <p class="leading-relaxed text-body">
        Sua presença já é o presente mais importante. Mas se quiser nos ajudar a começar essa nova
        fase, preparamos uma lista com carinho — de itens do dia a dia a uma contribuição para a
        lua de mel.
      </p>
      <UiButton :to="giftsLink" rounded="full" size="lg">
        <Icon name="lucide:gift" class="h-4 w-4" />
        Ver lista de presentes
      </UiButton>
    </div>
  </PublicEditorialSection>
</template>
