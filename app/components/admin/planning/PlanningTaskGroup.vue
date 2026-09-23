<!--
  Um grupo da checklist — uma janela de prazo, as tarefas dela e, no rodapé, o
  que costuma entrar ali.

  As tarefas se editam NO LUGAR, pelo mesmo motivo do Financeiro: planejar é um
  gesto repetido, e um modal por linha cobra um pedágio que faz o casal
  desistir no meio. Este é o segundo componente de domínio do projeto que chama
  a própria mutação (CLAUDE.md, seção 9 permite quando é "self-contained"), e o
  motivo é o mesmo: a edição no lugar precisa saber se o salvamento FALHOU para
  devolver o valor anterior ao campo.

  Diferença deliberada em relação ao rodapé de sugestões do Financeiro: lá o
  clique abre uma linha com o cursor no valor, porque o valor é o que falta
  saber. Aqui a sugestão já traz título E prazo, então não falta nada a digitar
  — o clique cria, e a tarefa aparece pronta na janela certa.
-->
<script setup lang="ts">
import type { TarefaSugerida } from '#shared/planejamento-tarefas'
import type { JanelaId } from '#shared/utils/planejamento'
import type { Tarefa } from '~/types/planning'

interface Props {
  janela: JanelaId
  rotulo: string
  tarefas: readonly Tarefa[]
  sugestoes: readonly TarefaSugerida[]
  /**
   * Aberto ou fechado — quem manda é a PÁGINA.
   *
   * Era estado interno do grupo, e um "recolher tudo" no cabeçalho não teria
   * como alcançá-lo: dez componentes com dez refs próprios. A página guarda
   * quais estão recolhidos, do mesmo jeito que Pagamentos faz com as faixas
   * dele.
   */
  aberto: boolean
  /**
   * Os nomes já usados como responsável em QUALQUER tarefa da checklist — a
   * lista vem da página, não do grupo: quem escreveu "Cerimonial Ana" numa
   * tarefa de dezembro não deveria ter que redigitá-la numa de março.
   *
   * Continua texto livre: isto autocompleta, não restringe.
   */
  responsaveisConhecidos?: readonly string[]
}

const {
  janela,
  rotulo,
  tarefas,
  sugestoes,
  responsaveisConhecidos = [],
} = defineProps<Props>()

const emit = defineEmits<{ alternar: [] }>()

const toast = useToast()
const { atualizarTarefa, excluirTarefa, criarTarefaSugerida } = usePlanning()

/** Quantas sugestões cabem antes de o rodapé virar uma segunda lista. */
const SUGESTOES_VISIVEIS = 5
const verTodasSugestoes = ref(false)

const sugestoesVisiveis = computed(() =>
  verTodasSugestoes.value ? sugestoes : sugestoes.slice(0, SUGESTOES_VISIVEIS),
)

/**
 * O que está sendo digitado, por tarefa.
 *
 * Sem isto, o refetch que toda mutação dispara jogaria fora o que o casal
 * acabou de escrever na linha vizinha.
 */
const rascunhos = ref<Record<string, { titulo: string; responsavel: string }>>({})

function rascunho(tarefa: Tarefa) {
  return (
    rascunhos.value[tarefa.id] ?? {
      titulo: tarefa.titulo,
      responsavel: tarefa.responsavel ?? '',
    }
  )
}

function editar(tarefa: Tarefa, campo: 'titulo' | 'responsavel', valor: string) {
  rascunhos.value = {
    ...rascunhos.value,
    [tarefa.id]: { ...rascunho(tarefa), [campo]: valor },
  }
}

function esquecer(id: string) {
  rascunhos.value = Object.fromEntries(
    Object.entries(rascunhos.value).filter(([chave]) => chave !== id),
  )
}

function mudou(tarefa: Tarefa): boolean {
  const atual = rascunhos.value[tarefa.id]
  if (!atual) return false
  return (
    atual.titulo.trim() !== tarefa.titulo || atual.responsavel.trim() !== (tarefa.responsavel ?? '')
  )
}

async function salvar(tarefa: Tarefa) {
  if (!mudou(tarefa)) return
  const atual = rascunhos.value[tarefa.id]
  if (!atual) return

  // Título vazio é engano de digitação, não intenção de apagar a tarefa: o
  // campo volta ao que era. Excluir é ação explícita, no menu da linha.
  const titulo = atual.titulo.trim() || tarefa.titulo

  try {
    await atualizarTarefa(tarefa.id, { titulo, responsavel: atual.responsavel.trim() || null })
    esquecer(tarefa.id)
  } catch (erro) {
    // O rascunho é descartado TAMBÉM no erro: manter no campo um texto que o
    // servidor recusou é pior que voltar ao anterior, porque o casal continua
    // lendo como salvo.
    esquecer(tarefa.id)
    toast.error(getApiErrorMessage(erro, 'Não foi possível salvar a tarefa.'))
  }
}

/**
 * O prazo salva na hora, e não ao sair da linha como o texto.
 *
 * Duas razões: escolher uma data no calendário é um gesto deliberado e único
 * (não há "continuar digitando"), e o calendário é renderizado num portal FORA
 * da linha — o guarda de `focusout` veria o foco saindo e salvaria no meio da
 * escolha.
 */
async function definirPrazo(tarefa: Tarefa, prazo: string) {
  const novo = prazo || null
  if (novo === tarefa.prazo) return
  try {
    await atualizarTarefa(tarefa.id, { prazo: novo })
  } catch (erro) {
    toast.error(getApiErrorMessage(erro, 'Não foi possível mudar o prazo.'))
  }
}

async function alternarConclusao(tarefa: Tarefa, concluida: boolean) {
  try {
    await atualizarTarefa(tarefa.id, { concluida })
  } catch (erro) {
    toast.error(getApiErrorMessage(erro, 'Não foi possível atualizar a tarefa.'))
  }
}

async function excluir(tarefa: Tarefa) {
  try {
    await excluirTarefa(tarefa.id)
    toast.success('Tarefa excluída.')
  } catch (erro) {
    toast.error(getApiErrorMessage(erro, 'Não foi possível excluir a tarefa.'))
  }
}

async function usarSugestao(sugestao: TarefaSugerida) {
  try {
    await criarTarefaSugerida(sugestao.chave)
  } catch (erro) {
    toast.error(getApiErrorMessage(erro, 'Não foi possível adicionar a tarefa.'))
  }
}

/**
 * Salva quando o foco deixa a LINHA, não o campo: passar do título para o
 * responsável é continuar na mesma linha, e salvar ali dispararia um refetch no
 * meio da digitação.
 */
function aoSairDaLinha(evento: FocusEvent, acao: () => void) {
  const linha = evento.currentTarget as HTMLElement
  const proximo = evento.relatedTarget as Node | null
  if (proximo && linha.contains(proximo)) return
  acao()
}

/**
 * A contagem só aparece quando há o que contar: um grupo que existe apenas para
 * carregar sugestões mostraria "0" ao lado do nome, anunciando uma ausência que
 * ninguém perguntou.
 */
const totalNoGrupo = computed(() => (tarefas.length > 0 ? String(tarefas.length) : ''))
</script>

<template>
  <section class="flex flex-col gap-1">
    <button
      type="button"
      class="flex w-full items-center gap-2 rounded-lg px-1 py-2 text-left transition-brand hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      :aria-expanded="aberto"
      @click="emit('alternar')"
    >
      <Icon
        :name="aberto ? 'lucide:chevron-down' : 'lucide:chevron-right'"
        class="h-4 w-4 shrink-0 text-text-muted"
      />
      <h3
        class="text-xs font-medium uppercase tracking-wide"
        :class="janela === 'vencida' ? 'text-danger' : 'text-text-muted'"
      >
        {{ rotulo }}
      </h3>
      <span v-if="totalNoGrupo" class="num text-xs text-text-muted">{{ totalNoGrupo }}</span>
    </button>

    <div v-show="aberto" class="flex flex-col pl-1">
      <ul v-if="tarefas.length > 0" class="flex flex-col">
        <li
          v-for="tarefa in tarefas"
          :key="tarefa.id"
          class="flex flex-col gap-2 border-b border-border/40 py-2 last:border-b-0 sm:flex-row sm:items-center sm:gap-1"
          @focusout="aoSairDaLinha($event, () => salvar(tarefa))"
          @keyup.enter="salvar(tarefa)"
        >
          <UiCheckbox
            :model-value="Boolean(tarefa.concluida_em)"
            :aria-label="`Concluir ${tarefa.titulo}`"
            @update:model-value="alternarConclusao(tarefa, $event)"
          />

          <UiInput
            variant="quiet-desktop"
            class="min-w-0 flex-1"
            :model-value="rascunho(tarefa).titulo"
            :aria-label="`Tarefa ${tarefa.titulo}`"
            :class="tarefa.concluida_em ? 'line-through opacity-70' : ''"
            @update:model-value="editar(tarefa, 'titulo', $event)"
          />

          <!-- "Definir prazo", e não "Sem prazo": dentro do grupo "Sem prazo"
               cada linha repetiria o nome do próprio grupo, e o campo é uma
               ação a tomar, não um estado a reafirmar. -->
          <UiDatePicker
            variant="quiet-desktop"
            class="sm:w-44"
            clearable
            :model-value="tarefa.prazo ?? ''"
            placeholder="Definir prazo"
            @update:model-value="definirPrazo(tarefa, $event)"
          />

          <UiInput
            variant="quiet-desktop"
            class="sm:w-40"
            :model-value="rascunho(tarefa).responsavel"
            :aria-label="`Responsável por ${tarefa.titulo}`"
            :suggestions="responsaveisConhecidos"
            placeholder="Quem faz?"
            @update:model-value="editar(tarefa, 'responsavel', $event)"
          />

          <AdminRowMenu
            :label="`Ações de ${tarefa.titulo}`"
            :items="[{ key: 'excluir', label: 'Excluir', icon: 'lucide:trash-2', tone: 'danger' }]"
            @select="excluir(tarefa)"
          />
        </li>
      </ul>

      <!-- A sugestão é um convite, não uma tarefa: ela não some depois de usada
           uma vez — o casal volta em março e o que ele não criou continua aqui.
           O que a distingue de uma tarefa é o "+" e a moldura leve do
           UiSuggestionChip, não mais uma borda tracejada (ver o componente:
           tracejado era metade da presença visual, e era o que faltava). -->
      <div
        v-if="sugestoes.length > 0"
        class="flex flex-wrap items-center gap-x-2 gap-y-1.5 py-2 text-xs text-text-muted"
      >
        <span>Costuma entrar aqui:</span>
        <UiSuggestionChip
          v-for="sugestao in sugestoesVisiveis"
          :key="sugestao.chave"
          :label="sugestao.titulo"
          @click="usarSugestao(sugestao)"
        />
        <button
          v-if="!verTodasSugestoes && sugestoes.length > SUGESTOES_VISIVEIS"
          type="button"
          class="font-medium text-primary underline underline-offset-2 transition-brand hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          @click="verTodasSugestoes = true"
        >
          ver todas ({{ sugestoes.length }})
        </button>
      </div>
    </div>
  </section>
</template>
