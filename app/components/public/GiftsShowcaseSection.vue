<script setup lang="ts">
// Vitrine completa de presentes embutida na home (redesign de referência —
// CLAUDE.md, "Fase Vermelho Clássico"; antes era só um teaser com botão
// para /presentes). Reaproveita o mesmo componente usado na página
// dedicada (GiftsShowcase.vue) — /presentes continua existindo à parte
// para link direto/compartilhável.
const route = useRoute()
const code = typeof route.query.code === 'string' ? route.query.code : undefined
</script>

<template>
  <PublicEditorialSection id="presentes" title="Lista de Presentes">
    <p class="mx-auto max-w-xl text-center leading-relaxed text-body">
      Sua presença já é o presente mais importante. Mas se quiser nos ajudar a começar essa nova
      fase, preparamos uma lista com carinho — de itens do dia a dia a uma contribuição para a
      lua de mel.
    </p>
    <GiftsShowcase :code="code" class="mt-6" />
  </PublicEditorialSection>
</template>
