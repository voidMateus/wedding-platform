<!--
  O índice de Configurações — os assuntos, em uma linha, no topo da tela.

  A tela tem catorze seções, e havia um só jeito de alcançá-las: a coluna do
  menu, que no desktop é longa e no celular é uma fileira que rola (rodada de
  usabilidade de 20/09/2026, ponto 22). Quem sabe o nome digita na busca; este
  índice é para quem navega OLHANDO — oito rótulos que cabem de uma vez, em vez
  de catorze que não cabem.

  Ele leva à primeira seção de cada assunto, porque assunto não é destino: é o
  rótulo de um grupo. Quem clica em "Aparência" quer chegar em Aparência, e a
  primeira seção dela é o começo dela.

  Não é `<nav>`: a navegação da tela é o menu da seção, e anunciar duas
  navegações para o mesmo conjunto de destinos faz um leitor de tela listar
  tudo duas vezes. Aqui é uma lista de atalhos para o que já está no menu.
-->
<script setup lang="ts">
import { QUERY_SECAO_CONFIGURACOES, SETTINGS_ASSUNTOS } from '~/utils/admin-nav'

interface Props {
  /** O assunto em foco — o índice marca onde a pessoa está. */
  atual: string
}

const { atual } = defineProps<Props>()

const slug = useActiveWeddingSlug()

const assuntos = computed(() =>
  SETTINGS_ASSUNTOS.map((assunto) => ({
    id: assunto.id,
    label: assunto.label,
    to: `/admin/${slug}/configuracoes?${QUERY_SECAO_CONFIGURACOES}=${assunto.secoes[0].id}`,
  })),
)
</script>

<template>
  <ul class="-mx-1 flex flex-wrap gap-1.5 px-1">
    <li v-for="assunto in assuntos" :key="assunto.id">
      <NuxtLink
        :to="assunto.to"
        class="block rounded-full border px-3 py-1.5 text-xs font-medium transition-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        :class="
          assunto.id === atual
            ? 'border-primary bg-primary/10 text-primary'
            : 'border-border text-text-muted hover:bg-surface-muted hover:text-text'
        "
        :aria-current="assunto.id === atual ? 'true' : undefined"
      >
        {{ assunto.label }}
      </NuxtLink>
    </li>
  </ul>
</template>
