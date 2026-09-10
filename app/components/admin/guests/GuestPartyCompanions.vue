<!--
  O bloco de acompanhantes do cadastro.
  ("Acompanhantes" é o núcleo, `nucleos_acompanhantes`: quem normalmente é
  convidado junto. Não confundir com `convites`, que é a unidade de RSVP, nem
  com `grupos`, que é etiqueta livre — CLAUDE.md, seção 12.)

  O rascunho tem DUAS etapas, e a ordem é a correção de um bug real: antes ele
  abria a busca junto de nome/categoria/grupo, e os resultados — que ficam
  abaixo do campo — nasciam fora da área visível da modal. A busca respondia
  200 com resultados e o usuário via a tela parada; parecia quebrada.
  Começando só com a busca, não há nada embaixo para empurrar a lista para
  fora.

  A segunda etapa (os campos) abre por escolha explícita, e leva o que já foi
  digitado como nome — ninguém redigita o que acabou de escrever.

  Rascunho embutido, e não um segundo modal: diálogo sobre diálogo prende o
  foco em duas camadas e, no celular, cobre a lista que se está montando.
-->
<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'
import type { GuestPersonInput } from '#shared/schemas/guests'
import type { Group } from '~/types/group'

const MIN_LETRAS_DA_BUSCA = 2
const RESULTADOS_DA_BUSCA = 6
const ESPERA_DA_BUSCA = 250

export interface CompanionEntry {
  key: string
  person: GuestPersonInput
}

interface Props {
  modelValue: CompanionEntry[]
  groupOptions: Array<{ value: string; label: string }>
  /** Excluído da busca de convidado existente — normalmente o próprio responsável. */
  primaryId?: string
  /** Nome do convidado deste cadastro, para ele aparecer na fila do núcleo. */
  primaryName: string
  /** Posição dele nessa fila — ver `primaryPosition` em guestPartySyncSchema. */
  primaryPosition: number
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: CompanionEntry[]]
  'update:primaryPosition': [value: number]
  'group-created': [group: Group]
  /** Acompanhante removido que já existia cadastrado — o pai desvincula no submit. */
  'remove-existing': [guestId: string]
}>()

const { fetchGuests, fetchGuestDetail } = useGuests()
const { classify, label: rotuloDeFaixa } = useAgeGroups()

/** Categoria de cada linha — derivada, igual à que a listagem vai exibir. */
function categoriaDe(person: GuestPersonInput): string {
  const classificacao = classify({
    data_nascimento: person.dataNascimento || null,
    faixa_etaria_manual: person.faixaEtariaManual || null,
  })
  return classificacao.chave ? rotuloDeFaixa(classificacao.chave) : ''
}

const rascunhoAberto = ref(false)
const etapa = ref<'busca' | 'cadastro'>('busca')
const rascunho = ref<GuestPersonInput>(emptyPerson())
const chaveEmEdicao = ref<string | null>(null)
const erroDoNome = ref<string | null>(null)

/**
 * `curta` cobre campo vazio e termo de uma letra: nos dois casos não há busca a
 * anunciar. Os outros quatro são o retorno imediato que faltava — sem eles o
 * campo ficava mudo entre a tecla e a resposta, e não havia como distinguir
 * "procurando" de "não achei ninguém".
 */
type StatusDaBusca = 'curta' | 'buscando' | 'achou' | 'vazio' | 'erro'

const busca = ref('')
const statusDaBusca = ref<StatusDaBusca>('curta')
const resultados = ref<Array<{ id: string; nome_completo: string }>>([])
const idSendoAnexado = ref<string | null>(null)
const termoDigitado = computed(() => busca.value.trim())

/**
 * Sequência da busca. Com digitação rápida, a resposta de um termo antigo pode
 * chegar DEPOIS da do atual e sobrescrever a lista com o resultado de algo que
 * já não está no campo. Só a resposta do token corrente é aceita — e
 * incrementar o token também descarta a resposta em voo ao fechar o rascunho.
 */
let buscaAtual = 0

const buscar = useDebounceFn(async (termo: string, token: number) => {
  try {
    const resposta = await fetchGuests({
      search: termo,
      withoutParty: true,
      pageSize: RESULTADOS_DA_BUSCA,
    })
    if (token !== buscaAtual) return
    const excluidos = new Set(
      [props.primaryId, ...props.modelValue.map((c) => c.person.id)].filter(Boolean),
    )
    resultados.value = resposta.data.filter((g) => !excluidos.has(g.id))
    statusDaBusca.value = resultados.value.length ? 'achou' : 'vazio'
  } catch {
    // Antes a exceção subia para dentro do debounce e morria como rejeição não
    // tratada: a busca falhava calada, indistinguível de "não achei ninguém".
    if (token !== buscaAtual) return
    resultados.value = []
    statusDaBusca.value = 'erro'
  }
}, ESPERA_DA_BUSCA)

watch(busca, (valor) => {
  const termo = valor.trim()
  buscaAtual += 1
  if (termo.length < MIN_LETRAS_DA_BUSCA) {
    resultados.value = []
    statusDaBusca.value = 'curta'
    return
  }
  // Fora do debounce de propósito: é o que responde na tecla, não 250ms mais
  // uma viagem de rede depois dela.
  statusDaBusca.value = 'buscando'
  buscar(termo, buscaAtual)
})

function abrirBusca() {
  rascunho.value = emptyPerson()
  chaveEmEdicao.value = null
  erroDoNome.value = null
  busca.value = ''
  resultados.value = []
  statusDaBusca.value = 'curta'
  buscaAtual += 1
  etapa.value = 'busca'
  rascunhoAberto.value = true
}

function fecharRascunho() {
  rascunhoAberto.value = false
  chaveEmEdicao.value = null
  buscaAtual += 1
}

/** Editar não busca: a pessoa já está no núcleo, então abre direto nos campos. */
function editarAcompanhante(entry: CompanionEntry) {
  rascunho.value = { ...entry.person }
  chaveEmEdicao.value = entry.key
  erroDoNome.value = null
  etapa.value = 'cadastro'
  rascunhoAberto.value = true
}

/** Leva o que já foi digitado como nome. */
function incluirNovaPessoa() {
  rascunho.value = { ...emptyPerson(), nomeCompleto: termoDigitado.value }
  erroDoNome.value = null
  etapa.value = 'cadastro'
}

/**
 * Convidado já cadastrado entra direto, sem passar pelos campos: os dados dele
 * já existem, e abrir um formulário para revisar o que não mudou seria pedir
 * confirmação sem pergunta. Se for o errado, o × da linha desfaz.
 *
 * O detalhe é buscado porque o resultado da busca traz só id e nome — montar a
 * pessoa a partir dele apagaria contato, apelido e observações no submit.
 */
async function anexarExistente(id: string) {
  idSendoAnexado.value = id
  try {
    const detalhe = await fetchGuestDetail(id)
    emit('update:modelValue', [...props.modelValue, { key: id, person: personFromGuest(detalhe) }])
    fecharRascunho()
  } catch {
    statusDaBusca.value = 'erro'
  } finally {
    idSendoAnexado.value = null
  }
}

function confirmarRascunho() {
  if (!rascunho.value.nomeCompleto.trim()) {
    erroDoNome.value = 'Informe o nome do acompanhante.'
    return
  }
  erroDoNome.value = null

  if (chaveEmEdicao.value) {
    emit(
      'update:modelValue',
      props.modelValue.map((c) =>
        c.key === chaveEmEdicao.value ? { ...c, person: { ...rascunho.value } } : c,
      ),
    )
  } else {
    emit('update:modelValue', [
      ...props.modelValue,
      {
        key: rascunho.value.id ?? `new-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        person: { ...rascunho.value },
      },
    ])
  }
  fecharRascunho()
}

/**
 * A fila do núcleo INTEIRO — o convidado deste cadastro incluído, na posição
 * dele.
 *
 * Ele aparece aqui porque o núcleo é simétrico: não existe "o titular e os
 * acompanhantes dele", existe um grupo de pessoas que vão juntas. Enquanto a
 * lista mostrava só os outros, a posição do editado era invisível e implícita
 * (`ordem_nucleo = 0`, sempre) — então salvar pela Maria trocava "João e Maria"
 * por "Maria e João" na lista inteira.
 *
 * Com ele na fila, a ordem que se vê aqui é literalmente a ordem que fica
 * gravada, e mudá-la é uma escolha, não um efeito de qual cadastro foi aberto.
 */
type LinhaDoNucleo =
  { tipo: 'principal'; nome: string } | { tipo: 'acompanhante'; entry: CompanionEntry }

const membrosDoNucleo = computed<LinhaDoNucleo[]>(() => {
  const linhas: LinhaDoNucleo[] = props.modelValue.map((entry) => ({
    tipo: 'acompanhante',
    entry,
  }))
  const posicao = Math.min(Math.max(props.primaryPosition, 0), linhas.length)
  // Nome vazio acontece durante um cadastro novo, antes de o campo de cima ser
  // preenchido: a linha existe de todo modo, senão a fila mudaria de tamanho
  // conforme se digita.
  linhas.splice(posicao, 0, {
    tipo: 'principal',
    nome: props.primaryName.trim() || 'Este convidado',
  })
  return linhas
})

/**
 * Prévia do rótulo que a lista vai exibir ("João e Maria +1").
 *
 * Pela MESMA função que a listagem usa, nunca por uma segunda regra montada
 * aqui: o valor deste aviso é ser exatamente o que vai aparecer depois, e duas
 * implementações do mesmo rótulo divergem na primeira mudança de uma delas.
 */
const rotuloDoNucleo = computed(() => {
  if (!props.modelValue.length) return ''
  const membros = membrosDoNucleo.value.map((linha, index) => ({
    nucleo_id: 'previa',
    nome_completo: linha.tipo === 'principal' ? linha.nome : linha.entry.person.nomeCompleto,
    ordem_nucleo: index,
  }))
  return montarRotulosDeNucleo(membros).get('previa') ?? ''
})

/** Decompõe a fila de volta nos dois modelos que o pai guarda. */
function aplicarFila(linhas: LinhaDoNucleo[]) {
  emit(
    'update:primaryPosition',
    linhas.findIndex((linha) => linha.tipo === 'principal'),
  )
  emit(
    'update:modelValue',
    linhas.flatMap((linha) => (linha.tipo === 'acompanhante' ? [linha.entry] : [])),
  )
}

function removerAcompanhante(entry: CompanionEntry) {
  if (entry.person.id) emit('remove-existing', entry.person.id)
  // Pela fila, e não filtrando `modelValue`: tirar alguém que estava ANTES do
  // principal muda a posição dele, e recalcular daqui é o que mantém as duas
  // metades coerentes.
  aplicarFila(
    membrosDoNucleo.value.filter(
      (linha) => linha.tipo === 'principal' || linha.entry.key !== entry.key,
    ),
  )
}

function mover(index: number, direcao: -1 | 1) {
  const linhas = [...membrosDoNucleo.value]
  const alvo = index + direcao
  if (alvo < 0 || alvo >= linhas.length) return
  const temp = linhas[index]!
  linhas[index] = linhas[alvo]!
  linhas[alvo] = temp
  aplicarFila(linhas)
}
</script>

<template>
  <section class="flex flex-col gap-3">
    <div class="flex items-baseline gap-2">
      <h3 class="text-sm font-semibold text-text">Acompanhantes</h3>
      <span v-if="modelValue.length" class="num text-sm text-text-muted">
        {{ modelValue.length }}
      </span>
    </div>

    <p
      v-if="!modelValue.length && !rascunhoAberto"
      class="max-w-prose text-sm leading-relaxed text-text-muted"
    >
      Casal, pais e filhos, amigos inseparáveis — quem normalmente é convidado junto entra aqui e
      responde o RSVP em nome próprio.
    </p>

    <!-- A fila inclui o convidado deste cadastro: a ordem que se vê aqui é a
         que fica gravada, e quem vem primeiro é escolha, não consequência de
         qual cadastro foi aberto. -->
    <ul v-if="modelValue.length" class="flex flex-col gap-2">
      <li
        v-for="(linha, index) in membrosDoNucleo"
        :key="linha.tipo === 'principal' ? 'principal' : linha.entry.key"
        class="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border px-3 py-2"
        :class="
          linha.tipo === 'principal' ? 'border-primary/30 bg-surface-muted/40' : 'border-border'
        "
      >
        <Icon name="lucide:user-round" class="h-4 w-4 shrink-0 text-text-muted" />
        <span class="min-w-0 flex-1 truncate text-sm font-medium text-text">
          {{ linha.tipo === 'principal' ? linha.nome : linha.entry.person.nomeCompleto }}
        </span>
        <span v-if="linha.tipo === 'principal'" class="shrink-0 text-xs text-text-muted">
          este cadastro
        </span>
        <span v-else-if="categoriaDe(linha.entry.person)" class="shrink-0 text-xs text-text-muted">
          {{ categoriaDe(linha.entry.person) }}
        </span>

        <div class="flex shrink-0 items-center">
          <AdminRowAction
            icon="lucide:chevron-up"
            :label="`Subir ${linha.tipo === 'principal' ? linha.nome : linha.entry.person.nomeCompleto} na ordem`"
            :disabled="index === 0"
            @click="mover(index, -1)"
          />
          <AdminRowAction
            icon="lucide:chevron-down"
            :label="`Descer ${linha.tipo === 'principal' ? linha.nome : linha.entry.person.nomeCompleto} na ordem`"
            :disabled="index === membrosDoNucleo.length - 1"
            @click="mover(index, 1)"
          />
          <!-- O principal se edita nos campos acima, não numa linha da fila:
               são os mesmos dados, e um segundo formulário para eles seria
               duas verdades na mesma tela. Remover, idem — quem sai do núcleo
               é acompanhante; o cadastro em si se exclui pela lista. -->
          <template v-if="linha.tipo === 'acompanhante'">
            <AdminRowAction
              icon="lucide:pencil"
              :label="`Editar ${linha.entry.person.nomeCompleto}`"
              @click="editarAcompanhante(linha.entry)"
            />
            <AdminRowAction
              icon="lucide:x"
              :label="`Remover ${linha.entry.person.nomeCompleto} dos acompanhantes`"
              tone="danger"
              @click="removerAcompanhante(linha.entry)"
            />
          </template>
        </div>
      </li>
    </ul>

    <!-- O que a lista vai exibir. O núcleo não tem nome gravado, então o
         rótulo é derivado de quem está dentro e na ordem em que está — dizer
         isso aqui é o que torna a ordem acima uma decisão informada, em vez de
         um detalhe que só aparece depois de salvar. -->
    <p v-if="rotuloDoNucleo" class="text-xs text-text-muted">
      Na lista, aparece como
      <span class="font-medium text-text">{{ rotuloDoNucleo }}</span>
    </p>

    <div v-if="rascunhoAberto" class="rounded-md border border-primary/30 bg-surface-muted/40 p-4">
      <!-- Etapa 1: só a busca. Nada abaixo do campo, para o resultado nascer
           dentro da área visível da modal. -->
      <template v-if="etapa === 'busca'">
        <UiInput
          v-model="busca"
          icon="lucide:search"
          label="Nome do acompanhante"
          placeholder="Comece a digitar o nome"
          autofocus
          hint="Se a pessoa já estiver na sua lista, aproveitamos o cadastro dela."
        />

        <!-- `aria-live`: o retorno chega sem o usuário mexer em nada, então
             precisa ser anunciado, não só desenhado. `min-h` reserva o espaço
             para a área não pular a cada troca de estado. -->
        <div class="mt-3 min-h-9" role="status" aria-live="polite">
          <p v-if="statusDaBusca === 'buscando'" class="text-sm text-text-muted">
            Procurando na sua lista...
          </p>

          <div v-else-if="statusDaBusca === 'achou'" class="flex flex-col gap-2">
            <p class="text-xs text-text-muted">Já na sua lista — escolha para reaproveitar:</p>
            <ul class="flex flex-col gap-1">
              <li v-for="resultado in resultados" :key="resultado.id">
                <button
                  type="button"
                  class="flex w-full items-center justify-between gap-2 rounded-md border border-border bg-surface px-3 py-2 text-left text-sm transition-brand hover:border-primary/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
                  :disabled="idSendoAnexado !== null"
                  @click="anexarExistente(resultado.id)"
                >
                  <span class="min-w-0 truncate">{{ resultado.nome_completo }}</span>
                  <span
                    v-if="idSendoAnexado === resultado.id"
                    class="shrink-0 text-xs text-text-muted"
                  >
                    adicionando...
                  </span>
                </button>
              </li>
            </ul>
            <button
              type="button"
              class="self-start text-xs text-primary hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              @click="incluirNovaPessoa"
            >
              Não é nenhuma dessas — incluir nova pessoa
            </button>
          </div>

          <div v-else-if="statusDaBusca === 'vazio'" class="flex flex-col items-start gap-2">
            <p class="text-sm text-text-muted">Ninguém com esse nome na sua lista.</p>
            <UiButton size="sm" @click="incluirNovaPessoa">
              <Icon name="lucide:plus" class="h-4 w-4" />
              Incluir {{ termoDigitado }} como nova pessoa
            </UiButton>
          </div>

          <div v-else-if="statusDaBusca === 'erro'" class="flex flex-col items-start gap-2">
            <p class="text-sm text-danger">Não foi possível buscar agora.</p>
            <div class="flex flex-wrap gap-2">
              <UiButton size="sm" variant="outline" @click="buscar(termoDigitado, buscaAtual)">
                Tentar de novo
              </UiButton>
              <UiButton size="sm" variant="ghost" @click="incluirNovaPessoa">
                Incluir como nova pessoa
              </UiButton>
            </div>
          </div>
        </div>

        <div class="mt-4 flex justify-end">
          <UiButton size="sm" variant="ghost" @click="fecharRascunho">Cancelar</UiButton>
        </div>
      </template>

      <!-- Etapa 2: os campos, com o nome já vindo do que foi digitado. -->
      <template v-else>
        <AdminGuestsGuestPersonFields
          v-model="rascunho"
          :group-options="groupOptions"
          :full-name-error="erroDoNome"
          @group-created="(group) => emit('group-created', group)"
        />
        <div class="mt-4 flex justify-end gap-2">
          <UiButton v-if="chaveEmEdicao" size="sm" variant="ghost" @click="fecharRascunho">
            Cancelar
          </UiButton>
          <UiButton v-else size="sm" variant="ghost" @click="etapa = 'busca'">Voltar</UiButton>
          <UiButton size="sm" @click="confirmarRascunho">
            {{ chaveEmEdicao ? 'Salvar acompanhante' : 'Adicionar' }}
          </UiButton>
        </div>
      </template>
    </div>

    <UiButton v-else variant="outline" size="sm" class="self-start" @click="abrirBusca">
      <Icon name="lucide:user-round-plus" class="h-4 w-4" />
      Adicionar acompanhante
    </UiButton>
  </section>
</template>
