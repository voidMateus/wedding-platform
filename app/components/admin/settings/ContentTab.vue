<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { weddingContentConfigSchema } from '#shared/schemas/content'
import { resolveWeddingContent } from '#shared/wedding-content'
import type { Wedding } from '~/types/wedding'

interface Props {
  wedding: Wedding | null | undefined
}

const props = defineProps<Props>()
const emit = defineEmits<{ saved: [] }>()

interface ApiError {
  statusCode?: number
  data?: { message?: string }
}

function isApiError(err: unknown): err is ApiError {
  return typeof err === 'object' && err !== null
}

const toast = useToast()
const { updateWeddingContent } = useWedding()

const conteudoItems = [
  { id: 'boas-vindas', trigger: 'Boas-vindas' },
  { id: 'historia', trigger: 'Nossa História' },
  { id: 'dress-code', trigger: 'Dress Code' },
  { id: 'manual', trigger: 'Manual dos Convidados' },
  { id: 'presentes', trigger: 'Lista de Presentes' },
  { id: 'faq', trigger: 'Perguntas Frequentes' },
]

const { handleSubmit, defineField, errors, resetForm, isSubmitting } = useForm({
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

watch(
  () => props.wedding,
  (value) => {
    if (!value) return
    const resolved = resolveWeddingContent(value.content_config)
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
  },
  { immediate: true },
)

const onSubmit = handleSubmit(async (values) => {
  try {
    await updateWeddingContent(values)
    emit('saved')
    toast.success('Conteúdo salvo.')
  } catch (err) {
    toast.error(
      isApiError(err)
        ? (err.data?.message ?? 'Não foi possível salvar o conteúdo.')
        : 'Não foi possível salvar o conteúdo.',
    )
  }
})
</script>

<template>
  <UiCard>
    <form class="flex flex-col gap-6" @submit="onSubmit">
      <p class="text-xs text-text-muted">
        Cada mensagem já vem preenchida com o texto padrão da plataforma — edite à vontade para
        contar a sua própria história, ou deixe como está.
      </p>

      <UiAccordion :items="conteudoItems">
        <template #content="{ item }">
          <div class="flex flex-col gap-4 px-5 pb-5">
            <template v-if="item.id === 'boas-vindas'">
              <UiInput v-model="welcomeTitle" label="Título" :error="errors.welcomeTitle" />
              <UiTextarea
                v-model="welcomeMessage"
                label="Mensagem"
                :rows="4"
                :error="errors.welcomeMessage"
              />
              <p class="-mt-2 text-xs text-text-muted">
                Separe parágrafos deixando uma linha em branco entre eles.
              </p>
            </template>

            <template v-if="item.id === 'historia'">
              <UiTextarea
                v-model="storyMessage"
                label="Mensagem"
                :rows="6"
                :error="errors.storyMessage"
              />
              <p class="-mt-2 text-xs text-text-muted">
                Separe parágrafos deixando uma linha em branco entre eles.
              </p>
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
                    @update:model-value="(value) => updateDressCodeSuggestion(index, value)"
                  />
                  <UiButton
                    type="button"
                    size="sm"
                    variant="ghost"
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

      <div class="flex justify-end">
        <UiButton type="submit" :disabled="isSubmitting">Salvar conteúdo</UiButton>
      </div>
    </form>
  </UiCard>
</template>
