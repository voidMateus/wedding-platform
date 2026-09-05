<!--
  Gerador de modelo de planilha de importação.

  Uma tela só, e não três caminhos ("recomendado" / "personalizar" /
  "completo"): os três produzem o mesmo tipo de arquivo e diferem apenas em
  quais caixas vêm marcadas, então viram um seletor de recorte sobre a mesma
  lista. Um passo a menos no fluxo, e o casal vê de imediato o que cada modelo
  significa em vez de escolher às cegas.

  Segue a linguagem da tela de Configurações (DESIGN-SYSTEM.md, 2.1): recorte
  em controle segmentado no topo, campos em linhas com borda agrupadas por
  seção, liga/desliga em `ToggleRow` e a explicação longa numa caixa de apoio
  em vez de um parágrafo colado sob o controle.

  As colunas oferecidas saem do catálogo central (shared/utils/campos-
  convidado.ts) — o mesmo que o importador consome. Campo derivado (faixa
  etária calculada, status do RSVP) nunca aparece aqui: não é uma escolha da
  tela, é consequência de `importacao: 'nao'` no catálogo.
-->
<script setup lang="ts">
import { SECOES_CAMPOS, type CampoConvidado } from '#shared/utils/campos-convidado'
import type { ChavePreset } from '#shared/utils/modelo-importacao'

interface Props {
  modelValue: boolean
}

defineProps<Props>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const { fields, presets, matchingPreset, summary, download } = useGuestImportTemplate()

const PRESET_INICIAL: ChavePreset = 'recomendado'

const selected = ref<string[]>([...(presets.find((p) => p.chave === PRESET_INICIAL)?.campos ?? [])])
const withExample = ref(true)

const presetChips = computed(() => presets.map((p) => ({ value: p.chave, label: p.rotulo })))

/** Vazio quando a seleção não bate com nenhum modelo — aí nenhum fica aceso. */
const activePreset = computed(() => matchingPreset(selected.value) ?? '')

const activePresetDescription = computed(
  () =>
    presets.find((p) => p.chave === activePreset.value)?.descricao ??
    'Você ajustou as colunas à mão.',
)

const selectionSummary = computed(() => summary(selected.value))

/** Só as seções que têm campo — nenhuma vira cabeçalho vazio. */
const sections = computed(() =>
  SECOES_CAMPOS.map((secao) => ({
    ...secao,
    campos: fields.filter((campo) => campo.secao === secao.chave),
  })).filter((secao) => secao.campos.length > 0),
)

/** Sem nome não existe convidado — a coluna obrigatória nunca é desmarcável. */
function isLocked(campo: CampoConvidado): boolean {
  return campo.obrigatorio
}

function isSelected(campo: CampoConvidado): boolean {
  return selected.value.includes(campo.chave)
}

function applyPreset(chave: string) {
  const preset = presets.find((p) => p.chave === chave)
  if (preset) selected.value = [...preset.campos]
}

function toggle(campo: CampoConvidado, valor: boolean) {
  if (isLocked(campo)) return
  selected.value = valor
    ? [...selected.value, campo.chave]
    : selected.value.filter((atual) => atual !== campo.chave)
}

function handleDownload() {
  download(selected.value, { withExample: withExample.value })
  emit('update:modelValue', false)
}
</script>

<template>
  <UiModal
    :model-value="modelValue"
    title="Criar modelo de importação"
    description="Escolha as colunas que você quer preencher e baixe a planilha pronta."
    size="lg"
    scroll="content"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="flex min-h-0 flex-1 flex-col gap-4">
      <!-- Fora da área rolável: o recorte é a decisão principal da tela e não
           pode sair de vista enquanto se percorre uma lista de doze itens. -->
      <div class="flex shrink-0 flex-col gap-2">
        <AdminFilterChips
          :model-value="activePreset"
          :items="presetChips"
          variant="segmented"
          group-label="Modelos prontos de importação"
          @update:model-value="applyPreset"
        />
        <p class="text-xs leading-relaxed text-text-muted">{{ activePresetDescription }}</p>
      </div>

      <div class="flex shrink-0 items-baseline justify-between gap-2 border-t border-border pt-4">
        <h3 class="text-sm font-medium text-text">Colunas da planilha</h3>
        <UiBadge tone="neutral">{{ selectionSummary }}</UiBadge>
      </div>

      <div class="-mx-6 min-h-0 flex-1 overflow-y-auto px-6">
        <div class="flex flex-col gap-5 pb-1">
          <section v-for="secao in sections" :key="secao.chave" class="flex flex-col gap-2">
            <h4 class="text-xs font-semibold uppercase tracking-wide text-text-muted">
              {{ secao.rotulo }}
            </h4>

            <ul class="flex flex-col gap-2">
              <li
                v-for="campo in secao.campos"
                :key="campo.chave"
                class="rounded-md border px-4 py-3 transition-brand"
                :class="
                  isSelected(campo)
                    ? 'border-primary/50 bg-surface-elevated'
                    : 'border-border hover:bg-surface-muted/40'
                "
              >
                <div class="flex items-start justify-between gap-3">
                  <!--
                    A coluna obrigatória não é um checkbox desativado: marcado e
                    com opacidade reduzida, ele lê como "indisponível" em vez de
                    "sempre vem junto". Vira um ícone de travado com etiqueta,
                    que diz a mesma coisa sem parecer um controle quebrado.
                  -->
                  <span
                    v-if="isLocked(campo)"
                    class="flex items-center gap-2 text-sm font-medium text-text"
                  >
                    <Icon name="lucide:lock" class="h-4 w-4 shrink-0 text-primary" />
                    {{ campo.rotulo }}
                  </span>
                  <UiCheckbox
                    v-else
                    :model-value="isSelected(campo)"
                    :label="campo.rotulo"
                    @update:model-value="toggle(campo, $event)"
                  />

                  <UiBadge v-if="isLocked(campo)" tone="primary">Sempre incluída</UiBadge>
                  <UiBadge v-else-if="campo.importacao === 'identificador'" tone="warning">
                    Só para atualizar
                  </UiBadge>
                </div>

                <p class="mt-1 pl-6 text-xs leading-relaxed text-text-muted">
                  {{ campo.descricao }}
                </p>

                <!-- Valores de enum em etiqueta, não em frase: "Valores
                     aceitos: Criança, Adolescente, Adulto, Idoso" dentro de um
                     parágrafo cinza vira parede de texto na lista inteira. -->
                <div v-if="campo.valores?.length" class="mt-1.5 flex flex-wrap gap-1 pl-6">
                  <UiBadge v-for="valor in campo.valores" :key="valor.valor" tone="neutral">
                    {{ valor.rotulo }}
                  </UiBadge>
                </div>
              </li>
            </ul>
          </section>
        </div>
      </div>

      <div class="flex shrink-0 flex-col gap-2 border-t border-border pt-4">
        <AdminSettingsToggleRow
          v-model="withExample"
          icon="lucide:sparkles"
          label="Incluir uma linha de exemplo"
          hint="Mostra o formato esperado de cada coluna — útil sobretudo para a data de nascimento."
        />

        <!--
          A linha de exemplo resolve "qual formato a data espera?", mas cria
          outro risco: esquecida na planilha, viraria uma convidada chamada
          "Maria Exemplo". O aviso vem antes do download, e o importador ainda
          reconhece e ignora a linha pelo nome — cinto e suspensório, porque
          contar só com o aviso seria contar com a memória de quem edita a
          planilha dias depois.
        -->
        <p
          v-if="withExample"
          class="flex items-start gap-2 rounded-md bg-surface-muted/60 px-3 py-2 text-xs leading-relaxed text-text-muted"
        >
          <Icon name="lucide:info" class="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>
            Apague a linha de exemplo antes de importar. Se ela ficar, o sistema a reconhece pelo
            nome e a ignora — mas conferir é mais seguro.
          </span>
        </p>
      </div>
    </div>

    <template #footer>
      <UiButton variant="ghost" @click="emit('update:modelValue', false)">Cancelar</UiButton>
      <UiButton variant="outline" :disabled="!selected.length" @click="handleDownload">
        <Icon name="lucide:download" class="h-4 w-4" />
        Baixar modelo
      </UiButton>
    </template>
  </UiModal>
</template>
