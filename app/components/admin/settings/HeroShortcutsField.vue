<!--
  Atalhos do Hero: um switch mestre liga/desliga a faixa toda e, ligado,
  revela um switch por atalho do catálogo mais o seletor de destaque.

  O "desligado" não precisou de campo novo em `config_tema`: uma lista vazia
  de `heroButtons` já significa "nenhum botão no Hero" para
  `resolveHeroButtons` (que só cai no padrão quando o valor é nulo, nunca
  quando é uma lista vazia). Desligar guarda a seleção anterior em memória
  para religar sem o casal ter que remarcar tudo — e como isso é só estado de
  tela, religar depois de recarregar a página cai no conjunto padrão.

  Extraído da AppearanceTab: com o mestre, os oito switches e a regra de
  destaque, isto virou lógica demais para conviver com o resto da aba.
-->
<script setup lang="ts">
import { DEFAULT_HERO_BUTTONS, HERO_BUTTON_CATALOG } from '#shared/hero-buttons'

interface Props {
  /** `config_tema.heroButtons` — lista vazia significa faixa desligada. */
  modelValue: string[] | undefined
  /** `config_tema.heroFeaturedButton`. */
  featured: string | undefined
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
  'update:featured': [value: string]
}>()

const selected = computed(() => props.modelValue ?? [])
const isEnabled = computed(() => selected.value.length > 0)

/** Seleção guardada ao desligar, para religar sem remarcar tudo. */
const lastSelection = ref<string[]>([])

function isSelected(id: string): boolean {
  return selected.value.includes(id)
}

/**
 * O destaque tem de ser sempre um atalho ligado — senão o Hero público
 * receberia um id órfão e nenhum botão apareceria preenchido.
 */
function emitWithFeatured(next: string[]) {
  emit('update:modelValue', next)
  if (!next.includes(props.featured ?? '')) {
    emit('update:featured', next[0] ?? '')
  }
}

function setEnabled(enabled: boolean) {
  if (enabled) {
    const restored = lastSelection.value.length ? lastSelection.value : DEFAULT_HERO_BUTTONS
    emitWithFeatured([...restored])
    return
  }
  lastSelection.value = [...selected.value]
  emitWithFeatured([])
}

function toggleShortcut(id: string, on: boolean) {
  // Mantém a ordem do catálogo em vez da ordem de clique: é ela que define a
  // ordem dos botões no Hero, e uma lista na ordem em que o casal foi
  // marcando embaralharia o site a cada edição.
  const next = HERO_BUTTON_CATALOG.filter((button) =>
    button.id === id ? on : isSelected(button.id),
  ).map((button) => button.id)
  emitWithFeatured(next)
}

const featuredOptions = computed(() =>
  HERO_BUTTON_CATALOG.filter((button) => isSelected(button.id)).map((button) => ({
    value: button.id,
    label: button.label,
  })),
)
</script>

<template>
  <div class="flex flex-col gap-3">
    <AdminSettingsToggleRow
      :model-value="isEnabled"
      label="Atalhos do Hero"
      hint="Botões rápidos logo abaixo da contagem regressiva — RSVP, presentes, local e o que mais você escolher."
      @update:model-value="setEnabled"
    />

    <div v-if="isEnabled" class="flex flex-col gap-3 pl-0 sm:pl-4">
      <div class="grid gap-2 sm:grid-cols-2">
        <AdminSettingsToggleRow
          v-for="button in HERO_BUTTON_CATALOG"
          :key="button.id"
          :model-value="isSelected(button.id)"
          :label="button.label"
          :icon="button.icon"
          @update:model-value="(on) => toggleShortcut(button.id, on)"
        />
      </div>

      <UiSelect
        v-if="featuredOptions.length"
        :model-value="featured"
        label="Atalho em destaque"
        hint="Aparece preenchido na cor do tema; os demais ficam em contorno."
        class="sm:max-w-sm"
        :options="featuredOptions"
        @update:model-value="(value) => emit('update:featured', value)"
      />
      <p v-else class="text-xs text-text-muted">
        Ative ao menos um atalho acima para escolher qual fica em destaque.
      </p>
    </div>
  </div>
</template>
