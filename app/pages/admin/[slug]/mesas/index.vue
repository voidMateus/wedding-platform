<script setup lang="ts">
import type { MesaInput, ElementoInput, TipoDeElemento } from '#shared/schemas/mesas'
import type { MesaComOcupantes } from '~/types/mesa'

definePageMeta({ layout: 'admin' })

const route = useRoute()
const router = useRouter()
const toast = useToast()

const {
  listSeating,
  criarMesa,
  atualizarMesa,
  moverMesa,
  excluirMesa,
  criarElemento,
  atualizarElemento,
  excluirElemento,
  salvarSalao,
  exportarMapa,
} = useSeating()

const { data, status, error, refresh } = listSeating()

const mesas = computed(() => data.value?.mesas ?? [])
const elementos = computed(() => data.value?.elementos ?? [])
const semMesa = computed(() => data.value?.semMesa ?? [])
const resumo = computed(() => data.value?.resumo ?? null)
const salao = computed(() => data.value?.salao ?? null)

/**
 * Duas vistas do MESMO objeto, num estado de URL — nunca duas telas.
 *
 * É o mesmo eixo (o salão) e a mesma lista; o que muda é a representação. Pelo
 * critério que o Financeiro fixou, tela nova se justifica por eixo novo ou por
 * agregação, e trocar de representação não é nenhum dos dois. Na URL para que
 * link salvo e o botão Voltar continuem funcionando.
 */
const vista = computed<'lista' | 'planta'>(() =>
  route.query.vista === 'planta' ? 'planta' : 'lista',
)

function trocarVista(valor: string) {
  router.replace({ query: { ...route.query, vista: valor === 'lista' ? undefined : valor } })
}

const chipsDeVista = [
  { value: 'lista', label: 'Lista' },
  { value: 'planta', label: 'Planta' },
] as const

// --- mesas abertas na lista ---
const abertas = ref<string[]>([])

function alternar(id: string) {
  abertas.value = abertas.value.includes(id)
    ? abertas.value.filter((item) => item !== id)
    : [...abertas.value, id]
}

// --- criar/editar ---
const modalAberto = ref(false)
const emEdicao = ref<MesaComOcupantes | null>(null)

function novaMesa() {
  emEdicao.value = null
  modalAberto.value = true
}

function editar(mesa: MesaComOcupantes) {
  emEdicao.value = mesa
  modalAberto.value = true
}

async function salvar(input: MesaInput) {
  try {
    if (emEdicao.value) await atualizarMesa(emEdicao.value.id, input)
    else await criarMesa(input)
    modalAberto.value = false
    await refresh()
    toast.success('Mesa salva.')
  } catch (erro) {
    toast.error(getApiErrorMessage(erro, 'Não foi possível salvar a mesa.'))
  }
}

// --- excluir ---
const alvoDaExclusao = ref<MesaComOcupantes | null>(null)

async function confirmarExclusao() {
  const mesa = alvoDaExclusao.value
  if (!mesa) return
  try {
    await excluirMesa(mesa.id)
    alvoDaExclusao.value = null
    await refresh()
    toast.success('Mesa excluída.')
  } catch (erro) {
    toast.error(getApiErrorMessage(erro, 'Não foi possível excluir a mesa.'))
  }
}

// --- planta ---
async function aoMover(payload: { tipo: 'mesa' | 'elemento'; id: string; x: number; y: number }) {
  try {
    if (payload.tipo === 'mesa') {
      await moverMesa(payload.id, { posicaoXCm: payload.x, posicaoYCm: payload.y })
    } else {
      const elemento = elementos.value.find((item) => item.id === payload.id)
      if (!elemento) return
      // O elemento reenvia o objeto inteiro porque não tem endpoint só de
      // posição: diferente da mesa, ele não tem formulário de edição separado
      // do arrasto (é tipo, tamanho e lugar), então não existe o conflito que o
      // endpoint estreito da mesa evita.
      await atualizarElemento(payload.id, {
        tipo: elemento.tipo,
        nome: elemento.nome,
        larguraCm: elemento.larguraCm,
        profundidadeCm: elemento.profundidadeCm,
        posicaoXCm: payload.x,
        posicaoYCm: payload.y,
        rotacaoGraus: elemento.rotacaoGraus,
      })
    }
    await refresh()
  } catch (erro) {
    // Refetch também no erro: sem ele a peça ficaria na posição nova só na
    // tela, e o casal continuaria arrastando um desenho que o banco não tem.
    await refresh()
    toast.error(getApiErrorMessage(erro, 'Não foi possível mover.'))
  }
}

function abrirMesaDaPlanta(id: string) {
  const mesa = mesas.value.find((item) => item.id === id)
  if (!mesa) return
  // Abre a mesa na LISTA, que é onde se senta gente: a planta responde "como o
  // salão está montado", não "quem senta aqui".
  if (!abertas.value.includes(id)) abertas.value = [...abertas.value, id]
  router.replace({ query: { ...route.query, vista: undefined } })
}

// --- elementos do salão ---
const elementoAberto = ref(false)
const tipoDeElemento = ref<TipoDeElemento>('pista')

const opcoesDeElemento: { value: TipoDeElemento; label: string }[] = [
  { value: 'pista', label: 'Pista de dança' },
  { value: 'palco', label: 'Palco / DJ' },
  { value: 'buffet', label: 'Buffet' },
  { value: 'bolo', label: 'Mesa do bolo' },
  { value: 'entrada', label: 'Entrada' },
  { value: 'bar', label: 'Bar' },
  { value: 'outro', label: 'Outro' },
]

async function adicionarElemento() {
  const padrao: ElementoInput = {
    tipo: tipoDeElemento.value,
    nome: null,
    larguraCm: 300,
    profundidadeCm: 300,
    posicaoXCm: 0,
    posicaoYCm: 0,
    rotacaoGraus: 0,
  }
  try {
    await criarElemento(padrao)
    elementoAberto.value = false
    await refresh()
    toast.success('Elemento adicionado — arraste para posicionar.')
  } catch (erro) {
    toast.error(getApiErrorMessage(erro, 'Não foi possível adicionar.'))
  }
}

/**
 * Clicar num elemento pede a remoção — ele não tem painel para abrir (é tipo,
 * tamanho e lugar, tudo visível na própria peça). Com confirmação: um clique
 * por engano numa peça arrastável é fácil demais.
 */
const alvoDoElemento = ref<string | null>(null)

async function removerElemento() {
  const id = alvoDoElemento.value
  if (!id) return
  try {
    await excluirElemento(id)
    alvoDoElemento.value = null
    await refresh()
  } catch (erro) {
    toast.error(getApiErrorMessage(erro, 'Não foi possível remover.'))
  }
}

// --- medidas do salão ---
const salaoAberto = ref(false)
const larguraM = ref('')
const profundidadeM = ref('')

function abrirSalao() {
  larguraM.value = salao.value?.larguraCm ? String(salao.value.larguraCm / 100) : ''
  profundidadeM.value = salao.value?.profundidadeCm ? String(salao.value.profundidadeCm / 100) : ''
  salaoAberto.value = true
}

async function salvarMedidas() {
  try {
    // Metros na tela, centímetros no banco: ninguém fala "o salão tem 2000
    // centímetros", e a precisão gravada continua sendo a do centímetro.
    await salvarSalao({
      larguraCm: larguraM.value ? Math.round(Number(larguraM.value) * 100) : null,
      profundidadeCm: profundidadeM.value ? Math.round(Number(profundidadeM.value) * 100) : null,
    })
    salaoAberto.value = false
    await refresh()
  } catch (erro) {
    toast.error(getApiErrorMessage(erro, 'Não foi possível salvar as medidas.'))
  }
}

const isExporting = ref(false)
async function exportar() {
  isExporting.value = true
  try {
    await exportarMapa()
  } finally {
    isExporting.value = false
  }
}

const rotuloDoTopo = computed(() => {
  const numeros = resumo.value
  if (!numeros) return undefined
  return `${numeros.totalMesas} ${numeros.totalMesas === 1 ? 'mesa' : 'mesas'} · ${numeros.capacidadeTotal} lugares`
})

function proporcao(mesa: MesaComOcupantes): string {
  const cheio = Math.min(100, Math.round((mesa.resumo.ocupacao / mesa.capacidade) * 100))
  return `${cheio}%`
}
</script>

<template>
  <AdminSection title="Mesas" :meta="rotuloDoTopo">
    <template #actions>
      <UiButton variant="ghost" :disabled="isExporting" @click="exportar">
        <Icon name="lucide:download" class="h-4 w-4" />
        Exportar
      </UiButton>
      <UiButton @click="novaMesa">
        <Icon name="lucide:plus" class="h-4 w-4" />
        Adicionar mesa
      </UiButton>
    </template>

    <!-- Os números descrevem o salão inteiro. "Falta acomodar" é o único que
         pede ação, e por isso é o que ganha destaque de cor. -->
    <div
      v-if="resumo"
      class="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-text-muted"
    >
      <span>
        <span class="num font-medium text-text">{{ resumo.sentados }}</span>
        sentados · <span class="num">{{ resumo.livres }}</span> lugares livres
      </span>
      <span v-if="resumo.faltaAcomodar" class="text-warning">
        Falta acomodar <span class="num font-medium">{{ resumo.faltaAcomodar }}</span>
        {{ resumo.faltaAcomodar === 1 ? 'pessoa' : 'pessoas' }}
      </span>
      <span v-if="resumo.mesasAcimaDaCapacidade" class="text-warning">
        {{ resumo.mesasAcimaDaCapacidade }}
        {{ resumo.mesasAcimaDaCapacidade === 1 ? 'mesa acima' : 'mesas acima' }} da capacidade
      </span>
    </div>

    <AdminPanel title="O salão">
      <template #headerActions>
        <AdminFilterChips
          :model-value="vista"
          :items="chipsDeVista"
          group-label="Ver como lista ou como planta"
          @update:model-value="trocarVista"
        />
        <UiButton v-if="vista === 'planta'" size="sm" variant="ghost" @click="abrirSalao">
          Medidas do salão
        </UiButton>
        <UiButton
          v-if="vista === 'planta'"
          size="sm"
          variant="ghost"
          @click="elementoAberto = true"
        >
          <Icon name="lucide:shapes" class="h-4 w-4" />
          Elemento
        </UiButton>
      </template>

      <div v-if="status === 'pending' && !data" class="flex flex-col gap-2 p-4 sm:p-5">
        <UiSkeleton v-for="n in 4" :key="n" class="h-12 w-full" />
      </div>

      <div v-else-if="error" class="p-4 sm:p-5">
        <UiEmptyState
          icon="lucide:triangle-alert"
          title="Não foi possível carregar as mesas"
          description="Tente novamente em alguns instantes."
        >
          <UiButton variant="ghost" @click="refresh()">Tentar novamente</UiButton>
        </UiEmptyState>
      </div>

      <div v-else-if="!mesas.length" class="p-4 sm:p-5">
        <UiEmptyState
          icon="lucide:armchair"
          title="Nenhuma mesa ainda"
          description="Crie as mesas do salão e distribua quem já confirmou. No dia, o mapa sai em planilha para a cerimonialista."
        >
          <UiButton @click="novaMesa">Adicionar mesa</UiButton>
        </UiEmptyState>
      </div>

      <!-- PLANTA -->
      <div v-else-if="vista === 'planta'" class="p-4 sm:p-5">
        <AdminSeatingFloorPlan
          v-if="salao"
          :mesas="mesas"
          :elementos="elementos"
          :salao="salao"
          @mover="aoMover"
          @abrir-mesa="abrirMesaDaPlanta"
          @abrir-elemento="alvoDoElemento = $event"
        />
      </div>

      <!-- LISTA — o caminho completo, e o único no celular -->
      <ul v-else class="divide-y divide-border">
        <li v-for="mesa in mesas" :key="mesa.id" class="ledger-row flex flex-col">
          <div class="flex items-center gap-3 px-4 py-3.5 sm:px-5">
            <button
              type="button"
              class="flex min-w-0 flex-1 flex-col gap-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:flex-row sm:items-center sm:gap-5"
              :aria-expanded="abertas.includes(mesa.id)"
              @click="alternar(mesa.id)"
            >
              <span
                class="flex min-w-0 items-center gap-2 text-sm font-medium text-text sm:w-44 sm:flex-none"
              >
                <Icon
                  name="lucide:chevron-down"
                  class="h-4 w-4 shrink-0 text-text-muted transition-brand"
                  :class="!abertas.includes(mesa.id) && '-rotate-90'"
                />
                <span class="truncate">{{ mesa.nome }}</span>
              </span>

              <!-- aria-hidden: a mesma informação está no texto ao lado. -->
              <span
                class="relative block h-2 w-full overflow-hidden rounded-full bg-text/10 sm:flex-1"
                aria-hidden="true"
              >
                <span
                  class="absolute inset-y-0 left-0 rounded-full transition-brand"
                  :class="mesa.resumo.excedente > 0 ? 'bg-warning' : 'bg-primary/60'"
                  :style="{ width: proporcao(mesa) }"
                />
              </span>

              <span class="flex flex-col items-start gap-1 sm:w-52 sm:items-end">
                <UiBadge v-if="mesa.resumo.excedente > 0" tone="warning">
                  {{ mesa.resumo.excedente }} a mais
                </UiBadge>
                <span class="num text-xs text-text-muted sm:text-right">
                  {{ mesa.resumo.ocupacao }} de {{ mesa.capacidade }} lugares
                </span>
              </span>
            </button>

            <!-- Largura fixa: com as ações mudando de tamanho por linha, a barra
                 ao lado mudaria junto — e barras de larguras diferentes não
                 podem ser comparadas. Mesma regra de Categorias. -->
            <span class="flex shrink-0 items-center justify-end gap-1 sm:w-20">
              <AdminRowAction
                icon="lucide:pencil"
                :label="`Editar ${mesa.nome}`"
                @click="editar(mesa)"
              />
              <AdminRowAction
                icon="lucide:trash-2"
                tone="danger"
                :label="`Excluir ${mesa.nome}`"
                @click="alvoDaExclusao = mesa"
              />
            </span>
          </div>

          <div
            v-if="abertas.includes(mesa.id)"
            class="border-t border-border px-4 py-3 sm:px-5 sm:pl-12"
          >
            <AdminSeatingTableOccupants :mesa="mesa" :sem-mesa="semMesa" @changed="refresh()" />
          </div>
        </li>
      </ul>

      <!-- Quem falta acomodar fecha a lista, como "Sem grupo" fecha a de
           convidados: é o resto, não uma mesa. -->
      <div
        v-if="vista === 'lista' && semMesa.length"
        class="border-t border-border bg-surface-muted/40 px-4 py-3 sm:px-5"
      >
        <p class="text-sm text-text-muted">
          <span class="font-medium text-text">{{ semMesa.length }}</span>
          {{ semMesa.length === 1 ? 'pessoa ainda sem mesa' : 'pessoas ainda sem mesa' }}:
          {{ semMesa.slice(0, 6).map((p) => p.nomeCompleto).join(', ')
          }}<template v-if="semMesa.length > 6"> e mais {{ semMesa.length - 6 }}</template
          >. Abra uma mesa para sentá-las.
        </p>
      </div>
    </AdminPanel>

    <AdminSeatingTableModal v-model="modalAberto" :mesa="emEdicao" @salvar="salvar" />

    <UiModal
      :model-value="Boolean(alvoDaExclusao)"
      title="Excluir mesa"
      :description="`${alvoDaExclusao?.resumo.ocupacao ?? 0} ${(alvoDaExclusao?.resumo.ocupacao ?? 0) === 1 ? 'pessoa volta' : 'pessoas voltam'} para a fila de quem ainda não sentou. As pessoas não são excluídas.`"
      @update:model-value="alvoDaExclusao = null"
    >
      <template #footer>
        <UiButton variant="ghost" @click="alvoDaExclusao = null">Cancelar</UiButton>
        <UiButton variant="destructive" @click="confirmarExclusao">Excluir</UiButton>
      </template>
    </UiModal>

    <UiModal
      :model-value="Boolean(alvoDoElemento)"
      title="Remover elemento"
      description="Ele sai da planta. As mesas e quem senta nelas não mudam."
      @update:model-value="alvoDoElemento = null"
    >
      <template #footer>
        <UiButton variant="ghost" @click="alvoDoElemento = null">Cancelar</UiButton>
        <UiButton variant="destructive" @click="removerElemento">Remover</UiButton>
      </template>
    </UiModal>

    <UiModal
      v-model="elementoAberto"
      title="Elemento do salão"
      description="Pista, palco, buffet — referências que não sentam ninguém, mas que decidem onde as mesas ficam."
    >
      <UiSelect v-model="tipoDeElemento" label="O que é" :options="opcoesDeElemento" />
      <template #footer>
        <UiButton variant="ghost" @click="elementoAberto = false">Cancelar</UiButton>
        <UiButton @click="adicionarElemento">Adicionar</UiButton>
      </template>
    </UiModal>

    <UiModal
      v-model="salaoAberto"
      title="Medidas do salão"
      description="Deixe em branco se ainda não sabe — a planta se ajusta ao que você desenhar."
    >
      <div class="flex flex-wrap gap-3">
        <UiInput v-model="larguraM" label="Largura (m)" type="number" class="w-32" />
        <UiInput v-model="profundidadeM" label="Profundidade (m)" type="number" class="w-32" />
      </div>
      <template #footer>
        <UiButton variant="ghost" @click="salaoAberto = false">Cancelar</UiButton>
        <UiButton @click="salvarMedidas">Salvar</UiButton>
      </template>
    </UiModal>
  </AdminSection>
</template>
