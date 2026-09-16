<!--
  O bloco "Atenção" da listagem interna — o que transforma a tabela em
  monitoramento.

  As regras não vivem aqui: vivem em `shared/diagnostico-da-plataforma.ts`,
  puras e testadas. Este componente só desenha o resultado, e faz uma coisa a
  mais que importa: cada achado é um FILTRO. Indicador que gera ação vira o
  recorte dessa ação (mesmo contrato da faixa de métricas do Financeiro) —
  senão a equipe lê "3 casamentos sem convidados" e vai procurá-los na mão.

  O bloco só existe quando há achado. Um painel de problemas vazio, desenhado
  todo dia dizendo "nada por aqui", ocupa o topo da tela para não informar nada
  — e some do campo de visão exatamente como o aviso que se repete.
-->
<script setup lang="ts">
import type { AchadoDaPlataforma } from '#shared/diagnostico-da-plataforma'

interface Props {
  achados: readonly AchadoDaPlataforma[]
  /** O achado cujo recorte está aplicado na tabela, se houver. */
  ativo?: string | null
}

const { achados, ativo = null } = defineProps<Props>()

const emit = defineEmits<{
  /** Alterna o recorte. `null` quando o próprio item ativo é clicado de novo. */
  selecionar: [id: string | null]
}>()

/**
 * Casamentos DISTINTOS, não a soma dos achados: o mesmo evento pode estar sem
 * dono e parado ao mesmo tempo, e somar diria que há dois casamentos com
 * problema onde há um.
 */
const quantosCasamentos = computed(() => {
  const ids = new Set<string>()
  for (const achado of achados) {
    for (const casamento of achado.casamentos) ids.add(casamento.id)
  }
  return ids.size
})

/** O tom do cabeçalho segue o pior achado — é ele que decide a urgência do bloco. */
const temAlerta = computed(() => achados.some((achado) => achado.severidade === 'alerta'))

const TOM_DO_ICONE = {
  alerta: 'text-danger',
  atencao: 'text-warning',
} as const
</script>

<template>
  <section
    v-if="achados.length"
    class="overflow-clip rounded-lg border bg-surface-elevated"
    :class="temAlerta ? 'border-danger/25' : 'border-warning/25'"
    aria-labelledby="titulo-da-atencao"
  >
    <div
      class="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b px-4 py-3 sm:px-5"
      :class="temAlerta ? 'border-danger/20 bg-danger/5' : 'border-warning/20 bg-warning/5'"
    >
      <h2
        id="titulo-da-atencao"
        class="font-display text-sm font-semibold"
        :class="temAlerta ? 'text-danger' : 'text-warning'"
      >
        Atenção
      </h2>
      <span class="text-xs text-text-muted">
        {{ quantosCasamentos === 1 ? '1 casamento pede' : `${quantosCasamentos} casamentos pedem` }}
        um olhar
      </span>
    </div>

    <ul class="flex flex-col divide-y divide-border">
      <li v-for="achado in achados" :key="achado.id">
        <button
          type="button"
          :aria-pressed="ativo === achado.id"
          class="flex w-full items-center gap-3 px-4 py-3 text-left transition-brand hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary sm:px-5"
          :class="ativo === achado.id && 'bg-surface-muted'"
          @click="emit('selecionar', ativo === achado.id ? null : achado.id)"
        >
          <Icon
            :name="achado.icone"
            class="h-5 w-5 shrink-0"
            :class="TOM_DO_ICONE[achado.severidade]"
            aria-hidden="true"
          />

          <span class="min-w-0 flex-1">
            <span class="block text-sm font-medium text-text">{{ achado.titulo }}</span>
            <!-- A saída, sempre: um achado sem o que fazer é só má notícia. -->
            <span class="block text-xs leading-relaxed text-text-muted">{{ achado.acao }}</span>
          </span>

          <span class="flex shrink-0 items-center gap-1 text-xs font-medium text-primary">
            {{ ativo === achado.id ? 'Limpar filtro' : 'Ver na lista' }}
            <Icon
              :name="ativo === achado.id ? 'lucide:x' : 'lucide:arrow-down'"
              class="h-3.5 w-3.5"
            />
          </span>
        </button>
      </li>
    </ul>
  </section>
</template>
