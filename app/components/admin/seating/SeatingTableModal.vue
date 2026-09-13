<!--
  Criar e editar uma mesa: nome, lugares, formato e medidas.

  Posição NÃO está aqui: a mesa nasce na origem e se posiciona arrastando na
  planta. Um "onde ela fica?" no formulário pediria uma coordenada que ninguém
  sabe de cabeça.
-->
<script setup lang="ts">
import type { FormatoDeMesa, MesaInput } from '#shared/schemas/mesas'
import type { MesaComOcupantes } from '~/types/mesa'

interface Props {
  modelValue: boolean
  mesa: MesaComOcupantes | null
}

const { modelValue, mesa } = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  salvar: [input: MesaInput]
}>()

const nome = ref('')
const capacidade = ref(8)
const formato = ref<FormatoDeMesa>('redonda')
const diametroCm = ref(180)
const larguraCm = ref(240)
const profundidadeCm = ref(90)
const observacao = ref('')

const opcoesDeFormato = [
  { value: 'redonda' as const, label: 'Redonda' },
  { value: 'retangular' as const, label: 'Retangular' },
]

watch(
  () => [modelValue, mesa] as const,
  ([aberto]) => {
    if (!aberto) return
    nome.value = mesa?.nome ?? ''
    capacidade.value = mesa?.capacidade ?? 8
    formato.value = mesa?.formato ?? 'redonda'
    // Medidas por formato em estados separados: alternar redonda/retangular e
    // voltar tem que devolver o que estava lá, não uma medida traduzida de
    // outro formato.
    if (mesa?.formato === 'retangular') {
      larguraCm.value = mesa.larguraCm
      profundidadeCm.value = mesa.profundidadeCm
    } else if (mesa) {
      diametroCm.value = mesa.larguraCm
    }
    observacao.value = mesa?.observacao ?? ''
  },
  { immediate: true },
)

const titulo = computed(() => (mesa ? 'Editar mesa' : 'Nova mesa'))

function salvar() {
  emit('salvar', {
    nome: nome.value.trim(),
    capacidade: capacidade.value,
    formato: formato.value,
    // Na redonda as duas medidas SÃO o diâmetro — o schema e o CHECK do banco
    // exigem isso, e a tela mostra um campo só.
    larguraCm: formato.value === 'redonda' ? diametroCm.value : larguraCm.value,
    profundidadeCm: formato.value === 'redonda' ? diametroCm.value : profundidadeCm.value,
    observacao: observacao.value.trim() || null,
  })
}

const podeSalvar = computed(() => nome.value.trim().length > 0 && capacidade.value > 0)
</script>

<template>
  <UiModal
    :model-value="modelValue"
    :title="titulo"
    description="A mesa aparece na lista e na planta. Arraste na planta para posicionar."
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="flex flex-col gap-4">
      <UiInput
        v-model="nome"
        label="Nome ou número"
        placeholder="Mesa 7, Mesa dos Pais, Cabeceira..."
        hint="Livre: nem toda mesa é numerada."
      />

      <div class="flex flex-wrap gap-3">
        <UiInput
          :model-value="String(capacidade)"
          label="Lugares"
          type="number"
          class="w-28"
          @update:model-value="capacidade = Number($event) || 0"
        />
        <UiSelect v-model="formato" label="Formato" :options="opcoesDeFormato" class="w-40" />
      </div>

      <!-- Medidas reais, em centímetros: é a comparação entre elas e o tamanho
           do salão que responde "cabe?". Em pixels a planta mudaria de
           significado junto com o tamanho da tela. -->
      <div v-if="formato === 'redonda'" class="flex gap-3">
        <UiInput
          :model-value="String(diametroCm)"
          label="Diâmetro (cm)"
          type="number"
          class="w-36"
          hint="Redonda de 8 lugares costuma ter 180 cm."
          @update:model-value="diametroCm = Number($event) || 0"
        />
      </div>
      <div v-else class="flex flex-wrap gap-3">
        <UiInput
          :model-value="String(larguraCm)"
          label="Largura (cm)"
          type="number"
          class="w-36"
          @update:model-value="larguraCm = Number($event) || 0"
        />
        <UiInput
          :model-value="String(profundidadeCm)"
          label="Profundidade (cm)"
          type="number"
          class="w-36"
          @update:model-value="profundidadeCm = Number($event) || 0"
        />
      </div>

      <UiInput
        v-model="observacao"
        label="Observação (opcional)"
        placeholder="Perto do ar-condicionado, acesso para cadeira de rodas..."
      />
    </div>

    <template #footer>
      <UiButton variant="ghost" @click="emit('update:modelValue', false)">Cancelar</UiButton>
      <UiButton :disabled="!podeSalvar" @click="salvar">Salvar</UiButton>
    </template>
  </UiModal>
</template>
