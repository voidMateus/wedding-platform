<!--
  Caixa de envio de foto da tela de Configurações — a "moldura" do modelo:
  vazia, é um retângulo de borda tracejada com rótulo, orientação de formato
  e um único botão; preenchida, mostra a prévia no enquadramento real com as
  ações de editar, trocar e remover.

  A prévia é ESTÁTICA de propósito. Antes ela era o seletor de ponto de foco,
  editável ali mesmo e persistido a cada arraste — cada micro-ajuste virava
  requisição e recarregamento, e a tela piscava durante o enquadramento. Agora
  ajustar é uma ação explícita ("Editar imagem" abre o
  AdminSettingsImageEditorModal) que salva uma vez, ao aplicar.

  É só apresentação: quem tem os composables de upload são os chamadores
  (`AdminCoverImageUploader`/`AdminStoryImageUploader`), que antes eram dois
  arquivos ~95% idênticos — toda a diferença real entre os dois é rótulo,
  proporção e qual par upload/remove usar.

  A borda tracejada só existe no estado vazio: tracejado comunica "espaço a
  preencher"; com a foto lá, viraria ruído em volta de conteúdo resolvido.
-->
<script setup lang="ts">
interface Props {
  label: string
  /** Orientação de formato/proporção ("Aparece no topo do site. Ideal 2000×1200px."). */
  hint: string
  modelValue: string | null
  /** Classe de proporção da prévia (`aspect-video` na capa, `aspect-[4/5]` na história). */
  previewAspectClass: string
  previewAlt: string
  isUploading: boolean
  isRemoving: boolean
  errorMessage: string | null
}

defineProps<Props>()

const emit = defineEmits<{
  /** Abrir o seletor de arquivos do sistema. */
  pick: []
  /** Abrir o editor de corte/rotação. */
  edit: []
  remove: []
}>()
</script>

<template>
  <div
    class="flex flex-col gap-3 rounded-md border bg-surface-muted/30 p-4 transition-brand"
    :class="modelValue ? 'border-border' : 'border-dashed border-border'"
  >
    <div>
      <p class="text-sm font-medium text-text">{{ label }}</p>
      <p class="mt-0.5 text-xs leading-relaxed text-text-muted">{{ hint }}</p>
    </div>

    <template v-if="modelValue">
      <div
        class="overflow-hidden rounded-md border border-border bg-surface-elevated"
        :class="previewAspectClass"
      >
        <img :src="modelValue" :alt="previewAlt" class="h-full w-full object-cover" />
      </div>

      <div class="flex flex-wrap gap-2">
        <UiButton type="button" size="sm" @click="emit('edit')">
          <Icon name="lucide:crop" class="h-4 w-4" />
          Editar imagem
        </UiButton>
        <UiButton
          type="button"
          size="sm"
          variant="ghost"
          :disabled="isUploading"
          @click="emit('pick')"
        >
          <Icon name="lucide:upload-cloud" class="h-4 w-4" />
          {{ isUploading ? 'Enviando...' : 'Trocar' }}
        </UiButton>
        <UiButton
          type="button"
          size="sm"
          variant="destructive"
          :disabled="isRemoving"
          @click="emit('remove')"
        >
          Remover
        </UiButton>
      </div>
    </template>

    <UiButton
      v-else
      type="button"
      size="sm"
      variant="ghost"
      class="self-start"
      :disabled="isUploading"
      @click="emit('pick')"
    >
      <Icon name="lucide:upload-cloud" class="h-4 w-4" />
      {{ isUploading ? 'Enviando...' : 'Enviar imagem' }}
    </UiButton>

    <p v-if="errorMessage" class="text-sm text-danger" role="alert">{{ errorMessage }}</p>
  </div>
</template>
