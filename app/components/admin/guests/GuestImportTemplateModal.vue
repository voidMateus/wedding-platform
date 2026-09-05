<!--
  Gerador de modelo de planilha de importação.

  Uma tela só, e não três caminhos ("recomendado" / "personalizar" /
  "completo"): os três produzem o mesmo tipo de arquivo e diferem apenas em
  quais caixas vêm marcadas, então viram presets em chip sobre a mesma lista.
  Um passo a menos no fluxo, e o casal vê de imediato o que cada preset
  significa em vez de escolher às cegas.

  As colunas oferecidas saem do catálogo central (shared/utils/campos-
  convidado.ts) — o mesmo que o importador consome. Campo derivado
  (faixa etária calculada, status do RSVP) nunca aparece aqui: não é uma
  escolha da tela, é consequência de `importacao: 'nao'` no catálogo.
-->
<script setup lang="ts">
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

/** Vazio quando a seleção não bate com nenhum preset — aí o chip ativo é nenhum. */
const activePreset = computed(() => matchingPreset(selected.value) ?? '')

const activePresetDescription = computed(
  () => presets.find((p) => p.chave === activePreset.value)?.descricao ?? '',
)

const selectionSummary = computed(() => summary(selected.value))

const requiredKeys = computed(() => fields.filter((f) => f.obrigatorio).map((f) => f.chave))

/** Sem nome não existe convidado — a coluna obrigatória nunca é desmarcável. */
function isLocked(chave: string): boolean {
  return requiredKeys.value.includes(chave)
}

function applyPreset(chave: string) {
  const preset = presets.find((p) => p.chave === chave)
  if (preset) selected.value = [...preset.campos]
}

function toggle(chave: string, valor: boolean) {
  if (isLocked(chave)) return
  selected.value = valor
    ? [...selected.value, chave]
    : selected.value.filter((atual) => atual !== chave)
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
    description="Escolha as colunas que você quer preencher. O sistema monta a planilha — e garante que ela volta compatível com o importador."
    size="lg"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="flex flex-col gap-5">
      <div class="flex flex-col gap-2">
        <AdminFilterChips
          :model-value="activePreset"
          :items="presetChips"
          group-label="Modelos prontos de importação"
          @update:model-value="applyPreset"
        />
        <p class="text-xs text-text-muted">
          {{ activePresetDescription || 'Seleção personalizada.' }}
        </p>
      </div>

      <div class="flex flex-col gap-3">
        <div class="flex items-baseline justify-between gap-2">
          <h3 class="text-sm font-medium text-text">Colunas da planilha</h3>
          <span class="num text-xs text-text-muted">{{ selectionSummary }}</span>
        </div>

        <ul class="flex flex-col gap-3">
          <li v-for="campo in fields" :key="campo.chave" class="flex flex-col gap-0.5">
            <UiCheckbox
              :model-value="selected.includes(campo.chave)"
              :label="campo.rotulo"
              :disabled="isLocked(campo.chave)"
              @update:model-value="toggle(campo.chave, $event)"
            />
            <p class="pl-6 text-xs leading-relaxed text-text-muted">
              {{ campo.descricao }}
              <span v-if="campo.valores?.length" class="block">
                Valores aceitos: {{ campo.valores.map((v) => v.rotulo).join(', ') }}.
              </span>
            </p>
          </li>
        </ul>
      </div>

      <!--
        A linha de exemplo resolve o problema real de "qual formato a data
        espera?", mas cria outro: esquecida na planilha, viraria uma convidada
        chamada "Maria Exemplo". O aviso vem antes do download, e o importador
        ainda reconhece e ignora a linha pelo nome — cinto e suspensório,
        porque contar só com o aviso seria contar com a memória de quem está
        editando a planilha dias depois.
      -->
      <div class="flex flex-col gap-2 rounded-lg bg-surface-muted/60 p-3">
        <UiCheckbox v-model="withExample" label="Incluir uma linha de exemplo preenchida" />
        <p v-if="withExample" class="flex items-start gap-2 pl-6 text-xs text-text-muted">
          <Icon name="lucide:info" class="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Apague a linha de exemplo antes de importar. Se ela ficar, o sistema a reconhece pelo
            nome e a ignora — mas conferir é mais seguro.
          </span>
        </p>
      </div>
    </div>

    <template #footer>
      <UiButton variant="ghost" @click="emit('update:modelValue', false)">Cancelar</UiButton>
      <UiButton :disabled="!selected.length" @click="handleDownload">
        <Icon name="lucide:download" class="h-4 w-4" />
        Baixar modelo
      </UiButton>
    </template>
  </UiModal>
</template>
