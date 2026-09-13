<!--
  Os números da lista, em linha — para viver no cabeçalho do painel da tabela,
  ao lado do "N exibidas".

  Sem moldura e sem cartão de propósito: como faixa própria, isto ocupava uma
  fileira inteira da tela e tirava o destaque da lista, que é o que a pessoa
  vem gerenciar. Aqui divide a linha que o painel já tem.

  Descreve a lista INTEIRA (`GET /api/guests/overview`), nunca o recorte — por
  isso convive com o "N exibidas" do painel sem competir com ele: um responde
  "qual o tamanho da minha lista", o outro "quanto o filtro está mostrando".

  O "+ N em consideração" saiu daqui: a tela do rascunho foi descartada
  (docs/ROADMAP.md seção 3), e sem ela nenhuma parte do produto marca alguém
  como em consideração — o número era sempre zero e não levava a lugar nenhum.
  O recorte continua existindo na API (`emConsideracao`), na coluna e no CHECK,
  para quem retomar não começar do zero.
-->
<script setup lang="ts">
import { FAIXA_ETARIA_ROTULOS_PLURAL } from '#shared/utils/faixa-etaria'

interface Props {
  total: number
  faixas: readonly { chave: string; total: number }[]
}

const { total, faixas } = defineProps<Props>()

/** Só as faixas com gente: um "0 idosos" ocuparia espaço para não dizer nada. */
const faixasVisiveis = computed(() =>
  faixas
    .filter((faixa) => faixa.total > 0)
    .map((faixa) => ({
      chave: faixa.chave,
      total: faixa.total,
      label:
        FAIXA_ETARIA_ROTULOS_PLURAL[faixa.chave as keyof typeof FAIXA_ETARIA_ROTULOS_PLURAL] ??
        'Sem categoria',
      corClasse: classeDoPontoDeFaixa(faixa.chave),
    }))
    .sort((a, b) => b.total - a.total),
)
</script>

<template>
  <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
    <span>
      <span class="num font-medium text-text">{{ total }}</span
      >&nbsp;{{ total === 1 ? 'convidado' : 'convidados' }}
    </span>

    <span v-for="faixa in faixasVisiveis" :key="faixa.chave" class="flex items-center gap-1.5">
      <span aria-hidden="true" class="h-1.5 w-1.5 shrink-0 rounded-full" :class="faixa.corClasse" />
      {{ faixa.label }}&nbsp;<span class="num font-medium text-text">{{ faixa.total }}</span>
    </span>
  </div>
</template>
