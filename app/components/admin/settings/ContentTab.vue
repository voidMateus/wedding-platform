<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { weddingContentConfigSchema } from '#shared/schemas/content'
import { resolveWeddingContent } from '#shared/wedding-content'
import { getApiErrorMessage } from '~/utils/api-error'
import type { Wedding } from '~/types/wedding'

interface Props {
  wedding: Wedding | null | undefined
}

const props = defineProps<Props>()
const emit = defineEmits<{ saved: [] }>()

const toast = useToast()
const { updateWeddingContent } = useWedding()

// `hint` diz onde no site o texto aparece — a dúvida real do casal ao abrir
// esta lista é "qual destes é aquele parágrafo que eu vi na página?", não o
// que a palavra "Manual" significa.
const conteudoItems = [
  { id: 'boas-vindas', trigger: 'Boas-vindas', hint: 'Primeiro texto que o convidado lê no site.' },
  { id: 'historia', trigger: 'Nossa História', hint: 'Como vocês se conheceram.' },
  { id: 'dress-code', trigger: 'Dress Code', hint: 'Orientação de traje.' },
  { id: 'manual', trigger: 'Manual dos Convidados', hint: 'Regras e recomendações práticas.' },
  { id: 'presentes', trigger: 'Lista de Presentes', hint: 'Texto acima da lista.' },
  { id: 'faq', trigger: 'Perguntas Frequentes', hint: 'Dúvidas comuns dos convidados.' },
]

const { handleSubmit, defineField, errors, resetForm, isSubmitting, meta } = useForm({
  validationSchema: toTypedSchema(weddingContentConfigSchema),
})

const [welcomeTitle] = defineField('welcomeTitle')
const [welcomeMessage] = defineField('welcomeMessage')
const [storyMessage] = defineField('storyMessage')
const [dressCodeDescription] = defineField('dressCodeDescription')
const [dressCodeSuggestions] = defineField('dressCodeSuggestions')
const [guestManualIntro] = defineField('guestManualIntro')
const [guestManualTopics] = defineField('guestManualTopics')
const [giftsIntroMessage] = defineField('giftsIntroMessage')
const [faqItems] = defineField('faqItems')

function addDressCodeSuggestion() {
  dressCodeSuggestions.value = [...(dressCodeSuggestions.value ?? []), '']
}
function updateDressCodeSuggestion(index: number, value: string) {
  dressCodeSuggestions.value = (dressCodeSuggestions.value ?? []).map((tip, i) =>
    i === index ? value : tip,
  )
}
function removeDressCodeSuggestion(index: number) {
  dressCodeSuggestions.value = (dressCodeSuggestions.value ?? []).filter((_, i) => i !== index)
}

// Mesma função no watcher e no "Descartar" da barra de salvamento — ver
// GeneralTab.
function applyWeddingToForm() {
  const value = props.wedding
  if (!value) return
  const resolved = resolveWeddingContent(value.config_conteudo)
  resetForm({
    values: {
      welcomeTitle: resolved.welcomeTitle,
      welcomeMessage: resolved.welcomeParagraphs.join('\n\n'),
      storyMessage: resolved.storyParagraphs.join('\n\n'),
      dressCodeDescription: resolved.dressCodeDescription,
      dressCodeSuggestions: resolved.dressCodeSuggestions,
      guestManualIntro: resolved.guestManualIntro,
      guestManualTopics: resolved.guestManualTopics,
      giftsIntroMessage: resolved.giftsIntroMessage,
      faqItems: resolved.faqItems,
    },
  })
}

watch(() => props.wedding, applyWeddingToForm, { immediate: true })

const onSubmit = handleSubmit(
  async (values) => {
    try {
      await updateWeddingContent(values)
      emit('saved')
      toast.success('Conteúdo salvo.')
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Não foi possível salvar o conteúdo.'))
    }
  },
  // Ver AppearanceTab: sem este retorno, salvar com campo inválido é um clique
  // que não produz nada nem explica por quê.
  () => {
    toast.error('Há campos que precisam de ajuste nesta aba — confira os destaques acima.')
  },
)
</script>

<template>
  <form class="flex flex-col gap-5" @submit="onSubmit">
    <AdminSettingsSectionCard
      section-id="mensagens"
      title="Mensagens do site"
      description="Cada mensagem já vem preenchida com o texto padrão da plataforma — edite à vontade para contar a sua própria história, ou deixe como está."
    >
      <UiAccordion :items="conteudoItems" variant="plain" default-open-id="boas-vindas">
        <template #content="{ item }">
          <div class="flex flex-col gap-4 px-4 pb-4">
            <template v-if="item.id === 'boas-vindas'">
              <UiInput v-model="welcomeTitle" label="Título" :error="errors.welcomeTitle" />
              <UiTextarea
                v-model="welcomeMessage"
                label="Mensagem"
                :rows="4"
                hint="Separe parágrafos deixando uma linha em branco entre eles."
                :error="errors.welcomeMessage"
              />
            </template>

            <template v-if="item.id === 'historia'">
              <UiTextarea
                v-model="storyMessage"
                label="Mensagem"
                :rows="6"
                hint="Separe parágrafos deixando uma linha em branco entre eles."
                :error="errors.storyMessage"
              />
            </template>

            <template v-if="item.id === 'dress-code'">
              <UiTextarea
                v-model="dressCodeDescription"
                label="Descrição"
                :rows="3"
                :error="errors.dressCodeDescription"
              />
              <div class="flex flex-col gap-2">
                <span class="text-sm font-medium text-text">Sugestões</span>
                <div
                  v-for="(tip, index) in dressCodeSuggestions"
                  :key="index"
                  class="flex items-center gap-2"
                >
                  <UiInput
                    class="flex-1"
                    :model-value="tip"
                    aria-label="Sugestão de traje"
                    @update:model-value="(value) => updateDressCodeSuggestion(index, value)"
                  />
                  <UiButton
                    type="button"
                    size="sm"
                    variant="ghost"
                    aria-label="Remover sugestão"
                    @click="removeDressCodeSuggestion(index)"
                  >
                    <Icon name="lucide:trash-2" class="h-4 w-4" />
                  </UiButton>
                </div>
                <UiButton
                  type="button"
                  variant="outline"
                  class="self-start"
                  @click="addDressCodeSuggestion"
                >
                  <Icon name="lucide:plus" class="h-4 w-4" />
                  Adicionar sugestão
                </UiButton>
              </div>
            </template>

            <template v-if="item.id === 'manual'">
              <UiTextarea
                v-model="guestManualIntro"
                label="Introdução"
                :rows="2"
                :error="errors.guestManualIntro"
              />
              <AdminManualTopicsEditor
                :model-value="guestManualTopics ?? []"
                @update:model-value="(value) => (guestManualTopics = value)"
              />
            </template>

            <template v-if="item.id === 'presentes'">
              <UiTextarea
                v-model="giftsIntroMessage"
                label="Mensagem"
                :rows="4"
                :error="errors.giftsIntroMessage"
              />
            </template>

            <template v-if="item.id === 'faq'">
              <AdminFaqItemsEditor
                :model-value="faqItems ?? []"
                @update:model-value="(value) => (faqItems = value)"
              />
            </template>
          </div>
        </template>
      </UiAccordion>
    </AdminSettingsSectionCard>

    <AdminSettingsSaveBar
      action="Salvar conteúdo"
      :dirty="meta.dirty"
      :submitting="isSubmitting"
      @discard="applyWeddingToForm"
    />
  </form>
</template>
