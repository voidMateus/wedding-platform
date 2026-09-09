<!--
  Ordem dos capítulos da home (config_tema.sectionOrder, Fase Rebrand do
  Convite).

  Arrastar é a interação principal, mas NÃO é a única: cada linha tem "subir" e
  "descer" em botões de verdade. Arrastar com o mouse não existe para quem
  navega por teclado nem para quem usa leitor de tela, e reordenar é a função
  inteira desta tela — se o arraste fosse o único caminho, a tela simplesmente
  não funcionaria para essas pessoas. Os dois caminhos escrevem no mesmo lugar.

  Drag nativo do HTML5, sem biblioteca: a lista tem onze itens fixos, não
  precisa de virtualização, sensores de toque nem multi-lista. Uma dependência
  de drag-and-drop aqui custaria mais em bundle do site do que resolve.

  Cada linha também liga/desliga a seção. Esvaziar o conteúdo continua
  escondendo a seção sozinho, mas as duas coisas respondem a perguntas
  diferentes: "não tenho o que dizer aqui" e "tenho, e não quero mostrar
  agora". Sem o interruptor, tirar o dress code da página exigia apagar um
  texto que o casal talvez queira de volta na semana seguinte.

  Seção desligada continua na lista, na posição dela, esmaecida — some da
  página do convidado, não daqui. Tirá-la da lista faria o casal perder de vista
  que ela existe, e a ordem em que ela voltaria.
-->
<script setup lang="ts">
import { HOME_SECTION_CATALOG, findHomeSection } from '#shared/home-sections'

interface Props {
  /** `config_tema.sectionOrder` já resolvido pelo pai (nunca uma lista parcial). */
  modelValue: string[]
  /** `config_tema.hiddenSections` — as que o casal desligou. */
  hidden: string[]
}

const { modelValue, hidden } = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
  'update:hidden': [value: string[]]
}>()

function isHidden(id: string): boolean {
  return hidden.includes(id)
}

function toggleHidden(id: string) {
  emit('update:hidden', isHidden(id) ? hidden.filter((item) => item !== id) : [...hidden, id])
}

const sections = computed(() =>
  modelValue
    .map((id) => findHomeSection(id))
    .filter((section): section is NonNullable<typeof section> => section !== undefined),
)

const draggingIndex = ref<number | null>(null)
const dropTargetIndex = ref<number | null>(null)

function move(from: number, to: number) {
  if (to < 0 || to >= modelValue.length || from === to) return
  const next = [...modelValue]
  const [moved] = next.splice(from, 1)
  if (moved === undefined) return
  next.splice(to, 0, moved)
  emit('update:modelValue', next)
}

function onDragStart(index: number, event: DragEvent) {
  draggingIndex.value = index
  // `effectAllowed` + um dado qualquer no dataTransfer: sem payload o Firefox
  // cancela o arraste antes do primeiro dragover.
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(index))
  }
}

function onDragOver(index: number) {
  if (draggingIndex.value === null) return
  dropTargetIndex.value = index
}

function onDrop(index: number) {
  if (draggingIndex.value !== null) move(draggingIndex.value, index)
  draggingIndex.value = null
  dropTargetIndex.value = null
}

function onDragEnd() {
  draggingIndex.value = null
  dropTargetIndex.value = null
}

function restoreDefault() {
  emit(
    'update:modelValue',
    HOME_SECTION_CATALOG.map((section) => section.id),
  )
}

const isDefaultOrder = computed(() =>
  modelValue.every((id, index) => HOME_SECTION_CATALOG[index]?.id === id),
)
</script>

<template>
  <div class="flex flex-col gap-3">
    <!-- Sem rótulo próprio: o AdminSettingsSectionCard que envolve este campo
         já se chama "Ordem das seções", e repetir o nome logo abaixo do título
         do cartão só empilha a mesma frase duas vezes. -->
    <p class="text-xs leading-relaxed text-text-muted">
      A sequência em que os convidados leem a página, de cima para baixo. Arraste para reordenar, ou
      use as setas. O olho liga e desliga a seção. A capa fica sempre no topo, e seções sem conteúdo
      não aparecem no site mesmo ligadas.
    </p>

    <ol class="flex flex-col gap-1.5">
      <li
        v-for="(section, index) in sections"
        :key="section.id"
        draggable="true"
        class="flex items-center gap-3 rounded-md border p-2.5 transition-brand"
        :class="[
          isHidden(section.id) ? 'bg-surface-muted/40' : 'bg-surface-elevated',
          draggingIndex === index ? 'opacity-50' : '',
          dropTargetIndex === index && draggingIndex !== index
            ? 'border-primary bg-primary/5'
            : 'border-border',
        ]"
        @dragstart="onDragStart(index, $event)"
        @dragover.prevent="onDragOver(index)"
        @drop.prevent="onDrop(index)"
        @dragend="onDragEnd"
      >
        <Icon
          name="lucide:grip-vertical"
          class="h-4 w-4 shrink-0 cursor-grab text-text-muted"
          aria-hidden="true"
        />

        <span class="w-5 shrink-0 text-xs tabular-nums text-text-muted">{{ index + 1 }}</span>

        <span class="min-w-0 flex-1" :class="isHidden(section.id) ? 'opacity-50' : ''">
          <span class="block truncate text-sm font-medium text-text">{{ section.label }}</span>
          <span class="block truncate text-xs text-text-muted">
            {{ isHidden(section.id) ? 'Não aparece no site.' : section.hint }}
          </span>
        </span>

        <span class="flex shrink-0 items-center gap-1">
          <UiButton
            type="button"
            size="sm"
            variant="ghost"
            :aria-pressed="isHidden(section.id)"
            :aria-label="
              isHidden(section.id)
                ? `Mostrar ${section.label} no site`
                : `Ocultar ${section.label} do site`
            "
            @click="toggleHidden(section.id)"
          >
            <Icon
              :name="isHidden(section.id) ? 'lucide:eye-off' : 'lucide:eye'"
              class="h-4 w-4"
              :class="isHidden(section.id) ? 'text-text-muted' : ''"
            />
          </UiButton>
          <UiButton
            type="button"
            size="sm"
            variant="ghost"
            :disabled="index === 0"
            :aria-label="`Mover ${section.label} para cima`"
            @click="move(index, index - 1)"
          >
            <Icon name="lucide:arrow-up" class="h-4 w-4" />
          </UiButton>
          <UiButton
            type="button"
            size="sm"
            variant="ghost"
            :disabled="index === sections.length - 1"
            :aria-label="`Mover ${section.label} para baixo`"
            @click="move(index, index + 1)"
          >
            <Icon name="lucide:arrow-down" class="h-4 w-4" />
          </UiButton>
        </span>
      </li>
    </ol>

    <UiButton
      v-if="!isDefaultOrder"
      type="button"
      variant="ghost"
      size="sm"
      class="self-start"
      @click="restoreDefault"
    >
      <Icon name="lucide:rotate-ccw" class="h-4 w-4" />
      Voltar à ordem sugerida
    </UiButton>
  </div>
</template>
