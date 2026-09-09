<!--
  Importação de convidados por planilha, em três passos: arquivo → mapeamento
  de colunas → revisão. Nada é escrito antes do último passo.

  O passo de mapeamento existe porque a planilha real vem de qualquer lugar —
  do modelo que este mesmo sistema gerou, de uma exportação antiga, de uma
  lista que a cerimonialista mandou. A autodetecção acerta a maioria; o que
  sobra, o casal reaponta à mão em vez de ter que renomear colunas no Excel.

  Mesma linguagem visual do gerador de modelo (DESIGN-SYSTEM.md 2.1): cromo
  fixo comprimido, conteúdo principal com a altura.
-->
<script setup lang="ts">
import { camposImportaveis } from '#shared/utils/campos-convidado'
import { parsearCsv } from '#shared/utils/csv'
import type { GuestImportResult } from '#shared/schemas/guest-import'
import { qualificarSubgrupo } from '#shared/utils/grupos'
import type { MapeamentoColuna, ResultadoPreparacao } from '#shared/utils/importacao-convidados'

interface Props {
  modelValue: boolean
  /**
   * Qual entrada do passo 1 abre expandida. `'colar'` é o que o botão "Colar
   * do Excel" da barra da lista promete — abrir no seletor de arquivo depois
   * de clicar em "colar" seria entregar outra coisa.
   */
  modo?: 'arquivo' | 'colar'
}

const { modelValue, modo = 'arquivo' } = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  /** A listagem precisa recarregar — a importação mudou a lista inteira. */
  imported: []
  /** O casal pediu o gerador de modelo; a página abre o outro modal. */
  'request-template': []
}>()

const { lerArquivo, mapearCabecalho, revisar, importar } = useGuestImport()
const { listGroups } = useGroups()
const { listInvites } = useInvites()
const { success, error: toastError } = useToast()

const { data: gruposData } = listGroups({ pageSize: 100 })
const { data: convitesData } = listInvites({ pageSize: 100 })

type Passo = 'arquivo' | 'mapeamento' | 'revisao' | 'concluido'

/**
 * Por onde as linhas entram. As duas origens desembocam no MESMO `linhasCsv`,
 * então o de-para e a revisão valem para as duas sem uma linha de código a
 * mais — a diferença entre arquivo e colagem acaba no passo 1.
 */
const passo = ref<Passo>('arquivo')
const origem = ref<'arquivo' | 'colar'>(modo)
const textoColado = ref('')
const nomeDoArquivo = ref('')
const linhasCsv = ref<string[][]>([])
const mapeamento = ref<MapeamentoColuna[]>([])
const revisao = ref<ResultadoPreparacao | null>(null)
const criarVinculos = ref(false)
const erroDeLeitura = ref<string | null>(null)
const enviando = ref(false)
const progresso = ref('')
const resultado = ref<GuestImportResult | null>(null)

/** Opções do seletor de cada coluna — só o que a importação aceita gravar. */
const opcoesDeCampo = computed(() => [
  { value: '', label: 'Ignorar esta coluna' },
  ...camposImportaveis().map((campo) => ({ value: campo.chave, label: campo.rotulo })),
])

const temNome = computed(() => mapeamento.value.some((coluna) => coluna.chave === 'nome_completo'))
const temId = computed(() => mapeamento.value.some((coluna) => coluna.chave === 'id'))

const totalDeLinhas = computed(() => Math.max(0, linhasCsv.value.length - 1))
const podeAvancar = computed(() => temNome.value || temId.value)

function reiniciar() {
  passo.value = 'arquivo'
  origem.value = modo
  textoColado.value = ''
  nomeDoArquivo.value = ''
  linhasCsv.value = []
  mapeamento.value = []
  revisao.value = null
  criarVinculos.value = false
  erroDeLeitura.value = null
  progresso.value = ''
  resultado.value = null
}

function fechar() {
  emit('update:modelValue', false)
  // Reinicia depois do fecho para o conteúdo não piscar durante a transição.
  setTimeout(reiniciar, 200)
}

/**
 * Excel e Google Sheets colam a seleção como TSV. `parsearCsv` já autodetecta
 * entre `;`, `,` e tab, então colar não precisa de parser próprio — e a mesma
 * máquina de estados continua respondendo por campo entre aspas com separador
 * dentro.
 */
function usarTextoColado() {
  erroDeLeitura.value = null
  const linhas = parsearCsv(textoColado.value)

  // Uma linha só é o cabeçalho sem ninguém embaixo: seguir daria um de-para
  // sobre zero convidados, e o passo de revisão viria vazio sem explicar por
  // quê.
  if (linhas.length < 2) {
    erroDeLeitura.value = 'Cole o cabeçalho e ao menos uma linha de convidado, direto da planilha.'
    return
  }

  linhasCsv.value = linhas
  nomeDoArquivo.value = 'colado da planilha'
  mapeamento.value = mapearCabecalho(linhas)
  passo.value = 'mapeamento'
}

// A entrada expandida é decidida na ABERTURA, não na montagem: o componente
// fica montado o tempo todo (quem abre e fecha é o `UiModal`), então definir
// `origem` só no setup deixaria o botão "Colar do Excel" abrindo no seletor de
// arquivo — o `modo` chega depois de o componente já existir.
watch(
  () => modelValue,
  (aberto) => {
    if (aberto) origem.value = modo
  },
)

async function selecionarArquivo(evento: Event) {
  const arquivo = (evento.target as HTMLInputElement).files?.[0]
  if (!arquivo) return

  erroDeLeitura.value = null
  try {
    linhasCsv.value = await lerArquivo(arquivo)
    nomeDoArquivo.value = arquivo.name
    mapeamento.value = mapearCabecalho(linhasCsv.value)
    passo.value = 'mapeamento'
  } catch (erro) {
    erroDeLeitura.value = erro instanceof Error ? erro.message : 'Não foi possível ler o arquivo.'
  }
}

function definirColuna(indice: number, chave: string) {
  mapeamento.value = mapeamento.value.map((coluna) =>
    coluna.indice === indice ? { ...coluna, chave: chave || null } : coluna,
  )
}

// A revisão precisa enxergar a hierarquia do mesmo jeito que
// `importar_convidados`: a coluna "Grupo" resolve só entre grupos de primeiro
// nível, e a "Subdivisão" dentro do grupo da linha. Mandar todos os grupos
// como se fossem raízes faria a revisão anunciar "nenhum grupo novo" para um
// nome que só existe como subdivisão — e a importação falharia depois de
// confirmada, com o casal já tendo aprovado outra coisa.
const gruposRaizes = computed(() => (gruposData.value?.data ?? []).filter((g) => !g.grupo_pai_id))

const subgruposQualificados = computed(() => {
  const nomePorId = new Map((gruposData.value?.data ?? []).map((g) => [g.id, g.nome]))
  return (gruposData.value?.data ?? []).flatMap((grupo) => {
    if (!grupo.grupo_pai_id) return []
    const nomeDoPai = nomePorId.get(grupo.grupo_pai_id)
    return nomeDoPai ? [qualificarSubgrupo(nomeDoPai, grupo.nome)] : []
  })
})

function irParaRevisao() {
  revisao.value = revisar(linhasCsv.value, mapeamento.value, {
    gruposExistentes: gruposRaizes.value.map((grupo) => grupo.nome),
    subgruposExistentes: subgruposQualificados.value,
    convitesExistentes: convitesData.value?.data.map((convite) => convite.nome) ?? [],
  })
  criarVinculos.value = false
  passo.value = 'revisao'
}

const totalDeVinculosNovos = computed(
  () =>
    (revisao.value?.resumo.grupos.length ?? 0) +
    (revisao.value?.resumo.subgrupos.length ?? 0) +
    (revisao.value?.resumo.convites.length ?? 0),
)

const precisaConfirmarVinculos = computed(() => totalDeVinculosNovos.value > 0)

const podeImportar = computed(
  () =>
    (revisao.value?.linhas.length ?? 0) > 0 &&
    (!precisaConfirmarVinculos.value || criarVinculos.value),
)

async function confirmarImportacao() {
  if (!revisao.value || !podeImportar.value) return

  enviando.value = true
  progresso.value = ''
  try {
    resultado.value = await importar(
      revisao.value.linhas.map((item) => item.dados),
      criarVinculos.value,
      ({ loteAtual, totalDeLotes }) => {
        progresso.value = totalDeLotes > 1 ? `Lote ${loteAtual} de ${totalDeLotes}...` : ''
      },
    )
    passo.value = 'concluido'
    success('Importação concluída.')
    emit('imported')
  } catch (erro) {
    toastError(getApiErrorMessage(erro, 'Não foi possível concluir a importação.'))
  } finally {
    enviando.value = false
  }
}

const tituloDoPasso = computed(
  () =>
    ({
      arquivo: 'Trazer convidados de uma planilha',
      mapeamento: 'Conferir as colunas',
      revisao: 'Revisar antes de importar',
      concluido: 'Importação concluída',
    })[passo.value],
)
</script>

<template>
  <UiModal
    :model-value="modelValue"
    :title="tituloDoPasso"
    size="lg"
    scroll="content"
    @update:model-value="(aberto) => !aberto && fechar()"
  >
    <div class="flex min-h-0 flex-1 flex-col gap-3">
      <!-- ---------------------------------------------------------- 1. Arquivo -->
      <div v-if="passo === 'arquivo'" class="flex flex-col gap-4">
        <p class="text-sm leading-relaxed text-text-muted">
          Traga a planilha que você já tem — por arquivo ou colando as células. O sistema reconhece
          as colunas sozinho e mostra tudo o que vai acontecer antes de gravar qualquer coisa.
        </p>

        <!-- Duas origens, um funil: as duas produzem as mesmas linhas e seguem
             para o mesmo de-para. -->
        <UiRadioGroup
          v-model="origem"
          layout="inline"
          :options="[
            { value: 'colar', label: 'Colar da planilha' },
            { value: 'arquivo', label: 'Enviar arquivo CSV' },
          ]"
          aria-label="De onde vêm os convidados"
        />

        <div v-if="origem === 'colar'" class="flex flex-col gap-2">
          <UiTextarea
            v-model="textoColado"
            label="Cole aqui"
            :rows="8"
            placeholder="Selecione as células no Excel (com a linha de títulos), copie e cole aqui."
            hint="Funciona com Excel, Google Sheets e Numbers — separador por tabulação, ponto e vírgula ou vírgula."
          />
          <UiButton class="self-start" :disabled="!textoColado.trim()" @click="usarTextoColado">
            Reconhecer colunas
          </UiButton>
        </div>

        <label
          v-else
          class="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-border px-6 py-8 text-center transition-brand hover:border-primary/50 hover:bg-surface-muted/40"
        >
          <Icon name="lucide:upload" class="h-6 w-6 text-text-muted" />
          <span class="text-sm font-medium text-text">Escolher arquivo CSV</span>
          <span class="text-xs text-text-muted">Aceita separador ponto e vírgula ou vírgula</span>
          <input type="file" accept=".csv,text/csv" class="sr-only" @change="selecionarArquivo" />
        </label>

        <p v-if="erroDeLeitura" class="text-sm text-danger">{{ erroDeLeitura }}</p>

        <p class="text-xs leading-relaxed text-text-muted">
          Ainda não tem uma planilha?
          <button
            type="button"
            class="text-primary hover:underline"
            @click="
              () => {
                fechar()
                emit('request-template')
              }
            "
          >
            Crie um modelo com as colunas que você quer preencher.
          </button>
        </p>
      </div>

      <!-- ------------------------------------------------------- 2. Mapeamento -->
      <template v-else-if="passo === 'mapeamento'">
        <p class="shrink-0 text-xs text-text-muted">
          <span class="font-medium text-text">{{ nomeDoArquivo }}</span>
          <span aria-hidden="true"> · </span>{{ totalDeLinhas }}
          {{ totalDeLinhas === 1 ? 'linha' : 'linhas' }}
        </p>

        <div class="-mx-6 min-h-56 flex-1 overflow-y-auto border-y border-border px-6 py-3">
          <ul class="flex flex-col gap-2">
            <li
              v-for="coluna in mapeamento"
              :key="coluna.indice"
              class="flex flex-col gap-2 rounded-md border px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
              :class="coluna.chave ? 'border-primary/50' : 'border-border'"
            >
              <div class="min-w-0">
                <p class="truncate text-sm font-medium text-text">
                  {{ coluna.cabecalho || `Coluna ${coluna.indice + 1}` }}
                </p>
                <p class="truncate text-xs text-text-muted">
                  Ex.: {{ linhasCsv[1]?.[coluna.indice] || '—' }}
                </p>
              </div>
              <UiSelect
                :model-value="coluna.chave ?? ''"
                :options="opcoesDeCampo"
                :aria-label="`Campo para a coluna ${coluna.cabecalho || coluna.indice + 1}`"
                class="w-full sm:w-56"
                @update:model-value="definirColuna(coluna.indice, $event)"
              />
            </li>
          </ul>
        </div>

        <p v-if="!podeAvancar" class="shrink-0 text-xs text-danger">
          Aponte ao menos uma coluna para "Nome completo" (ou para "Identificador", se a planilha só
          atualiza convidados existentes).
        </p>
      </template>

      <!-- ---------------------------------------------------------- 3. Revisão -->
      <template v-else-if="passo === 'revisao' && revisao">
        <div class="flex shrink-0 flex-wrap gap-2">
          <UiBadge tone="success">{{ revisao.resumo.criar }} a cadastrar</UiBadge>
          <UiBadge tone="neutral">{{ revisao.resumo.atualizar }} a atualizar</UiBadge>
          <UiBadge v-if="revisao.erros.length" tone="danger">
            {{ revisao.erros.length }} com erro
          </UiBadge>
          <UiBadge v-if="revisao.exemplosIgnorados" tone="warning">
            {{ revisao.exemplosIgnorados }} linha de exemplo ignorada
          </UiBadge>
        </div>

        <div class="-mx-6 min-h-56 flex-1 overflow-y-auto border-y border-border px-6 py-3">
          <div class="flex flex-col gap-4">
            <!--
              Erros primeiro: são o que impede uma linha de entrar, e o casal
              precisa saber o número da linha para achá-la no Excel.
            -->
            <section v-if="revisao.erros.length" class="flex flex-col gap-1.5">
              <h4 class="text-xs font-semibold uppercase tracking-wide text-danger">
                Linhas que serão ignoradas
              </h4>
              <ul class="flex flex-col gap-1">
                <li
                  v-for="(problema, indice) in revisao.erros"
                  :key="indice"
                  class="rounded-md bg-danger/5 px-3 py-1.5 text-xs leading-relaxed text-text"
                >
                  <span class="num font-medium">Linha {{ problema.linha }}</span>
                  <template v-if="problema.campo"> · {{ problema.campo }}</template>
                  — {{ problema.mensagem }}
                </li>
              </ul>
            </section>

            <section v-if="revisao.avisos.length" class="flex flex-col gap-1.5">
              <h4 class="text-xs font-semibold uppercase tracking-wide text-text-muted">Avisos</h4>
              <ul class="flex flex-col gap-1">
                <li
                  v-for="(aviso, indice) in revisao.avisos"
                  :key="indice"
                  class="rounded-md bg-surface-muted/60 px-3 py-1.5 text-xs leading-relaxed text-text-muted"
                >
                  <span v-if="aviso.linha > 1" class="num font-medium">
                    Linha {{ aviso.linha }} ·
                  </span>
                  {{ aviso.mensagem }}
                </li>
              </ul>
            </section>

            <section v-if="precisaConfirmarVinculos" class="flex flex-col gap-1.5">
              <h4 class="text-xs font-semibold uppercase tracking-wide text-text-muted">
                Serão criados
              </h4>
              <p class="text-xs leading-relaxed text-text-muted">
                <template v-if="revisao.resumo.grupos.length">
                  Grupos: {{ revisao.resumo.grupos.join(', ') }}.
                </template>
                <template v-if="revisao.resumo.subgrupos.length">
                  Subdivisões: {{ revisao.resumo.subgrupos.join(', ') }}.
                </template>
                <template v-if="revisao.resumo.convites.length">
                  Convites: {{ revisao.resumo.convites.join(', ') }}.
                </template>
              </p>
            </section>

            <section v-if="revisao.linhas.length" class="flex flex-col gap-1.5">
              <h4 class="text-xs font-semibold uppercase tracking-wide text-text-muted">
                Primeiras linhas
              </h4>
              <ul class="flex flex-col gap-1">
                <li
                  v-for="item in revisao.linhas.slice(0, 20)"
                  :key="item.linha"
                  class="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-1.5 text-xs"
                >
                  <span class="min-w-0 truncate text-text">
                    {{ item.dados.nome_completo || `Convidado ${item.dados.id?.slice(0, 8)}` }}
                  </span>
                  <UiBadge :tone="item.acao === 'criar' ? 'success' : 'neutral'">
                    {{ item.acao === 'criar' ? 'Cadastrar' : 'Atualizar' }}
                  </UiBadge>
                </li>
              </ul>
            </section>
          </div>
        </div>

        <!--
          Confirmação explícita, não caixa marcada por padrão: um erro de
          digitação numa coluna de grupo ("Familia da Noiva" em três linhas)
          criaria entidades novas em silêncio, e desfazer isso é trabalho
          manual.
        -->
        <div v-if="precisaConfirmarVinculos" class="shrink-0">
          <UiCheckbox
            v-model="criarVinculos"
            :label="`Criar os ${totalDeVinculosNovos} grupos/convites listados acima`"
          />
        </div>
      </template>

      <!-- -------------------------------------------------------- 4. Concluído -->
      <div v-else-if="passo === 'concluido' && resultado" class="flex flex-col gap-3">
        <p class="text-sm text-text">
          <span class="num font-medium">{{ resultado.criados }}</span> convidados cadastrados e
          <span class="num font-medium">{{ resultado.atualizados }}</span> atualizados.
        </p>
        <p
          v-if="
            resultado.gruposCriados.length ||
            resultado.subgruposCriados.length ||
            resultado.convitesCriados.length
          "
          class="text-xs leading-relaxed text-text-muted"
        >
          <template v-if="resultado.gruposCriados.length">
            Grupos criados: {{ resultado.gruposCriados.join(', ') }}.
          </template>
          <template v-if="resultado.subgruposCriados.length">
            Subdivisões criadas: {{ resultado.subgruposCriados.join(', ') }}.
          </template>
          <template v-if="resultado.convitesCriados.length">
            Convites criados: {{ resultado.convitesCriados.join(', ') }}.
          </template>
        </p>
      </div>
    </div>

    <template #footer>
      <span v-if="progresso" class="mr-auto self-center text-xs text-text-muted">
        {{ progresso }}
      </span>

      <UiButton v-if="passo === 'mapeamento'" variant="ghost" @click="passo = 'arquivo'">
        Voltar
      </UiButton>
      <UiButton v-else-if="passo === 'revisao'" variant="ghost" @click="passo = 'mapeamento'">
        Voltar
      </UiButton>
      <UiButton v-else variant="ghost" @click="fechar">
        {{ passo === 'concluido' ? 'Fechar' : 'Cancelar' }}
      </UiButton>

      <UiButton
        v-if="passo === 'mapeamento'"
        variant="outline"
        :disabled="!podeAvancar"
        @click="irParaRevisao"
      >
        Revisar
      </UiButton>
      <UiButton
        v-else-if="passo === 'revisao'"
        variant="outline"
        :disabled="!podeImportar || enviando"
        @click="confirmarImportacao"
      >
        <Icon name="lucide:check" class="h-4 w-4" />
        {{ enviando ? 'Importando...' : `Importar ${revisao?.linhas.length ?? 0}` }}
      </UiButton>
    </template>
  </UiModal>
</template>
