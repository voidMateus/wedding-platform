<script setup lang="ts">
import { sugestoesQueFaltam, type TarefaSugerida } from '#shared/planejamento-tarefas'
import {
  JANELAS,
  ROTULOS_JANELA,
  janelaDaSugestao,
  janelaDaTarefa,
  resumoDoPlanejamento,
  type JanelaId,
} from '#shared/utils/planejamento'
import type { Tarefa } from '~/types/planning'

definePageMeta({ layout: 'admin' })

const { listTasks } = usePlanning()
const { data, status, error, refresh } = listTasks()

const hoje = computed(() => data.value?.hoje ?? '')
const dataEvento = computed(() => data.value?.dataEvento ?? null)
const tarefas = computed<Tarefa[]>(() => data.value?.data ?? [])

/**
 * As sugestões que ainda fazem sentido: tira o que o casal já criou e o que os
 * fatos do sistema já resolveram.
 *
 * Nada aqui conclui tarefa — uma sugestão dispensada volta a aparecer se o fato
 * deixar de valer, porque a conta é determinística e não guarda estado.
 */
const sugestoes = computed(() =>
  sugestoesQueFaltam(
    tarefas.value
      .map((tarefa) => tarefa.origem_catalogo)
      .filter((chave): chave is string => !!chave),
    data.value?.fatos ?? [],
  ),
)

/**
 * Os nomes já usados como responsável, para o campo autocompletar.
 *
 * Sai daqui, e não de cada grupo, porque a memória é da CHECKLIST: quem digitou
 * "Cerimonial Ana" numa tarefa de dezembro deve encontrá-la numa de março. O
 * campo segue texto livre — a lista poupa a digitação, não fecha o conjunto
 * (decisão 7 da Fase 3: quem executa tarefa de casamento quase nunca tem
 * login).
 */
const responsaveisConhecidos = computed(() =>
  [
    ...new Set(
      tarefas.value
        .map((tarefa) => tarefa.responsavel?.trim())
        .filter((nome): nome is string => !!nome),
    ),
  ].sort((a, b) => a.localeCompare(b, 'pt-BR')),
)

/**
 * Os grupos da tela: tarefas e sugestões no MESMO eixo, o do tempo.
 *
 * É o que evita duas taxonomias na mesma tela — a sugestão não se agrupa por
 * "fase do planejamento" enquanto as tarefas se agrupam por urgência: ela cai
 * na janela do próprio prazo sugerido, no rodapé do grupo a que pertenceria.
 */
const grupos = computed(() => {
  const porJanela = new Map<JanelaId, { tarefas: Tarefa[]; sugestoes: TarefaSugerida[] }>()
  for (const janela of JANELAS) {
    porJanela.set(janela, { tarefas: [], sugestoes: [] })
  }

  for (const tarefa of tarefas.value) {
    porJanela.get(janelaDaTarefa(tarefa, hoje.value))?.tarefas.push(tarefa)
  }
  for (const sugestao of sugestoes.value) {
    porJanela
      .get(janelaDaSugestao(sugestao, dataEvento.value, hoje.value))
      ?.sugestoes.push(sugestao)
  }

  return JANELAS.map((janela) => ({
    janela,
    rotulo: ROTULOS_JANELA[janela],
    ...porJanela.get(janela)!,
  })).filter((grupo) => grupo.tarefas.length > 0 || grupo.sugestoes.length > 0)
})

const resumo = computed(() => resumoDoPlanejamento(tarefas.value, hoje.value))

/**
 * Faixa de números — UM agregado no módulo inteiro, no topo da única tela.
 *
 * "Vencidas" só entra quando existe: um zero em vermelho todo dia é alarme
 * falso, e a faixa deixa de informar para virar decoração.
 */
const metrics = computed(() => {
  const itens: {
    label: string
    value: string | number
    tone?: 'danger' | 'primary'
    apoio?: string
  }[] = []
  if (resumo.value.vencidas > 0) {
    itens.push({ label: 'Vencidas', value: resumo.value.vencidas, tone: 'danger' })
  }
  itens.push({
    label: ROTULOS_JANELA.esta_semana,
    value: resumo.value.estaSemana,
    tone: 'primary',
  })
  // "1 de 5" sozinho não diz de quê: sugestão não é linha no banco, então o
  // denominador poderia ser tarefa, sugestão ou as duas coisas. A linha de
  // apoio nomeia o universo sem acrescentar um segundo número — e usa a mesma
  // palavra que o bloco do Início ("tarefas concluídas").
  itens.push({
    label: 'Concluídas',
    value: `${resumo.value.concluidas} de ${resumo.value.total}`,
    apoio: 'tarefas',
  })
  return itens
})

/**
 * Histórico e pano de fundo começam fechados. "De etapas que já passaram" são as
 * fases que ficaram para trás para quem chegou tarde — contexto, não pendência;
 * e "Concluídas" é registro.
 */
function recolhido(janela: JanelaId) {
  return janela === 'concluida' || janela === 'ja_passou'
}

const vazio = computed(() => status.value === 'success' && tarefas.value.length === 0)
</script>

<template>
  <AdminSection
    title="Planejamento"
    description="O que falta fazer até o casamento — e o que já passou da hora."
  >
    <div v-if="status === 'pending'" class="flex flex-col gap-5">
      <UiSkeleton class="h-20 w-full" />
      <UiSkeleton class="h-64 w-full" />
    </div>

    <UiEmptyState
      v-else-if="error"
      icon="lucide:alert-triangle"
      title="Não foi possível carregar o planejamento"
      description="Verifique sua conexão e tente novamente."
    >
      <UiButton variant="ghost" @click="refresh()">Tentar novamente</UiButton>
    </UiEmptyState>

    <div v-else class="flex flex-col gap-5">
      <AdminMetricStrip v-if="!vazio" :metrics="metrics" />

      <!-- Quem chega sem nenhuma tarefa não vê uma tela vazia com um botão:
           vê as sugestões da fase em que o casamento está, que é a resposta
           literal a "por onde eu começo?". Não existe "criar tudo de uma vez"
           — quarenta e cinco linhas nascidas juntas fazem o progresso começar
           em 0 de 45, o oposto de acolhedor. -->
      <p v-if="vazio" class="text-sm text-text-muted">
        A checklist começa vazia de propósito. Escreva a primeira tarefa, ou aproveite o que costuma
        entrar em cada etapa — nada é criado sem o seu clique.
      </p>

      <!-- A checklist mora no mesmo painel branco da tabela de Convidados
           (`AdminPanel`), e não solta sobre o fundo da página: é a mesma coisa
           — uma lista de linhas — e duas superfícies diferentes para o mesmo
           tipo de conteúdo faziam esta tela parecer de outro produto. A linha
           de entrada é a primeira faixa do painel, como a barra de filtros é lá.
           Sem título: a tela tem uma lista só, e o H1 já a nomeia. -->
      <AdminPanel>
        <AdminPlanningQuickAdd />

        <div class="flex flex-col gap-3 px-4 py-3 sm:px-5">
          <AdminPlanningTaskGroup
            v-for="grupo in grupos"
            :key="grupo.janela"
            :janela="grupo.janela"
            :rotulo="grupo.rotulo"
            :tarefas="grupo.tarefas"
            :sugestoes="grupo.sugestoes"
            :responsaveis-conhecidos="responsaveisConhecidos"
            :recolhido-por-padrao="recolhido(grupo.janela)"
          />
        </div>
      </AdminPanel>
    </div>
  </AdminSection>
</template>
