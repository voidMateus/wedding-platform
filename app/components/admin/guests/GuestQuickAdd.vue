<!--
  A entrada rápida do Modo Lista: digita o nome, Enter, digita o próximo.

  É o princípio que motivou a tela inteira — *digitar → organizar*, não *abrir
  formulário → preencher → salvar → repetir*. O casal monta a lista no Excel
  justamente porque a planilha deixa despejar dezenas de nomes rápido; um
  cadastro completo por pessoa perde a lista para o Excel antes da vigésima.

  Por isso o campo mora no RODAPÉ DO BLOCO, e não numa barra no topo: o grupo
  de destino é o bloco em que se está digitando, então ele não precisa ser
  escolhido — e o nome nasce onde vai aparecer.

  Só nome. Categoria, contato e o resto são refinamento depois, pela linha ou
  pelo cadastro completo; pedir qualquer campo a mais aqui reintroduz o
  formulário que esta tela existe para evitar.

  O TECLADO NÃO ESPERA A REDE. O Enter enfileira e devolve o campo vazio no
  mesmo quadro; quem conversa com o servidor é um trabalhador em segundo plano.
  A primeira versão fazia o contrário — `await` no Enter, campo desabilitado
  durante a ida e volta — e ficava rápida como a rede, não como a digitação
  (achado do usuário). Falha não bloqueia a fila: o nome fica visível com o
  motivo e um "tentar de novo", e os seguintes continuam entrando.
-->
<script setup lang="ts">
interface Props {
  /** Grupo (ou subdivisão) de destino. `null` no bloco "Sem grupo". */
  grupoId: string | null
  /** Nome do bloco — aparece no rótulo e no aria-label. */
  grupoLabel: string
}

const { grupoId, grupoLabel } = defineProps<Props>()

const emit = defineEmits<{
  /** Uma pessoa entrou de verdade. O pai decide quando recarregar a lista. */
  adicionado: []
  /** Pedido de cadastro completo, com este grupo já escolhido. */
  'abrir-cadastro': []
}>()

const { createGuest } = useGuests()

interface NaFila {
  chave: number
  nome: string
  estado: 'enviando' | 'erro'
  motivo?: string
}

const aberto = ref(false)
const nome = ref('')
const fila = ref<NaFila[]>([])
const enviados = ref(0)

let proximaChave = 0
/** Uma requisição por vez: preserva a ordem de digitação e não enxameia o servidor. */
let drenando = false

function abrir() {
  fila.value = []
  enviados.value = 0
  aberto.value = true
}

function fechar() {
  aberto.value = false
  nome.value = ''
  fila.value = []
}

/** Enfileira e devolve o campo IMEDIATAMENTE — nada de `await` neste caminho. */
function enfileirar() {
  const nomeCompleto = nome.value.trim()
  if (!nomeCompleto) return
  nome.value = ''
  fila.value.push({ chave: (proximaChave += 1), nome: nomeCompleto, estado: 'enviando' })
  void drenar()
}

async function drenar() {
  if (drenando) return
  drenando = true
  try {
    // Item em erro fica na fila mas sai da varredura, então o laço termina
    // quando não há mais nada para enviar.
    for (;;) {
      const item = fila.value.find((candidato) => candidato.estado === 'enviando')
      if (!item) break
      try {
        await createGuest({ nomeCompleto: item.nome, grupoId, emConsideracao: false })
        fila.value = fila.value.filter((candidato) => candidato.chave !== item.chave)
        enviados.value += 1
        emit('adicionado')
      } catch (err) {
        const apiError = err as { data?: { message?: string } }
        item.estado = 'erro'
        item.motivo = apiError.data?.message ?? 'Não foi possível adicionar.'
      }
    }
  } finally {
    drenando = false
  }
}

function tentarDeNovo(chave: number) {
  const item = fila.value.find((candidato) => candidato.chave === chave)
  if (!item) return
  item.estado = 'enviando'
  item.motivo = undefined
  void drenar()
}

function descartar(chave: number) {
  fila.value = fila.value.filter((candidato) => candidato.chave !== chave)
}

const emErro = computed(() => fila.value.filter((item) => item.estado === 'erro'))
const enviando = computed(() => fila.value.filter((item) => item.estado === 'enviando'))
</script>

<template>
  <div class="px-4 py-2 md:pl-12">
    <button
      v-if="!aberto"
      type="button"
      :aria-label="`Adicionar convidado em ${grupoLabel}`"
      class="flex w-full items-center gap-1.5 py-0.5 text-left text-xs text-text-muted transition-brand hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
      @click="abrir"
    >
      <Icon name="lucide:plus" class="h-3.5 w-3.5 shrink-0" />
      Adicionar convidado
    </button>

    <div v-else class="flex flex-col gap-1.5">
      <div class="flex items-center gap-2">
        <!-- Sem `:disabled`: o campo nunca fica travado esperando o servidor.
             Enter atrás de Enter continua entrando. -->
        <UiInput
          v-model="nome"
          autofocus
          :aria-label="`Nome do convidado em ${grupoLabel}`"
          placeholder="Nome e Enter — pode digitar o seguinte na hora"
          class="max-w-sm flex-1"
          @keyup.enter="enfileirar"
          @keyup.esc="fechar"
        />
        <UiButton size="sm" :disabled="!nome.trim()" @click="enfileirar">Adicionar</UiButton>
        <AdminRowAction icon="lucide:x" label="Fechar entrada rápida" @click="fechar" />
      </div>

      <!-- `aria-live`: a linha entra na tabela só quando a recarga chega, então
           sem este retorno o Enter pareceria não ter feito nada. -->
      <p class="text-xs text-text-muted" role="status" aria-live="polite">
        <template v-if="enviados || enviando.length">
          <span class="num font-medium text-text">{{ enviados }}</span>
          {{ enviados === 1 ? 'adicionado' : 'adicionados' }}
          <span v-if="enviando.length">
            · enviando <span class="num">{{ enviando.length }}</span>
          </span>
        </template>
        <template v-else>Só o nome — categoria e contato ficam para depois.</template>

        <button
          type="button"
          class="ml-2 text-primary hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          @click="emit('abrir-cadastro')"
        >
          cadastro completo
        </button>
      </p>

      <!-- Falha não some e não bloqueia a fila: o nome digitado continua à vista
           com o motivo, para não ser preciso lembrar dele para tentar de novo. -->
      <ul v-if="emErro.length" class="flex flex-col gap-1">
        <li
          v-for="item in emErro"
          :key="item.chave"
          class="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs"
        >
          <Icon name="lucide:alert-triangle" class="h-3.5 w-3.5 shrink-0 text-danger" />
          <span class="font-medium text-text">{{ item.nome }}</span>
          <span class="text-danger">{{ item.motivo }}</span>
          <button
            type="button"
            class="text-primary hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            @click="tentarDeNovo(item.chave)"
          >
            tentar de novo
          </button>
          <button
            type="button"
            class="text-text-muted hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            @click="descartar(item.chave)"
          >
            descartar
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>
