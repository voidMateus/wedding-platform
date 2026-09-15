import type { Meta, StoryObj } from '@storybook/vue3-vite'
import UiSuggestionChip from './SuggestionChip.vue'

/**
 * A sugestão clicável dos rodapés do Planejamento, do Financeiro e do modal de
 * modelos de mensagem.
 *
 * O story que importa é `AntesEDepois`: ele põe lado a lado a versão que a
 * auditoria reprovou (borda tracejada em `--color-border`, 1,16:1 contra o
 * fundo) e a atual. O texto sempre passou; o que faltava era a silhueta — e é
 * isso que só se vê comparando, não medindo.
 *
 * Renderizado no contexto do painel: é o único lugar onde o chip aparece.
 */
const meta = {
  title: 'UI/SuggestionChip',
  component: UiSuggestionChip,
  tags: ['autodocs'],
  parameters: { contexto: 'admin' },
  argTypes: { label: { control: 'text' } },
  args: { label: 'Fechar a banda ou o DJ' },
} satisfies Meta<typeof UiSuggestionChip>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const RotuloLongo: Story = {
  args: { label: 'Contratar o transporte dos padrinhos até a cerimônia' },
}

/** Como o Planejamento de fato mostra: uma fila no rodapé do grupo. */
export const FilaDoRodape: Story = {
  render: () => ({
    components: { UiSuggestionChip },
    template: `
      <div class="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-text-muted">
        <span>Costuma entrar aqui:</span>
        <UiSuggestionChip label="Fechar a banda ou o DJ" />
        <UiSuggestionChip label="Contratar a decoração" />
        <UiSuggestionChip label="Provar o bolo" />
        <button type="button" class="font-medium text-primary underline underline-offset-2">
          ver todas (9)
        </button>
      </div>
    `,
  }),
}

/**
 * O contraste que a auditoria mediu, lado a lado.
 *
 * À esquerda a versão antiga, reproduzida com as classes originais — está aqui
 * como evidência, não para ser reusada. À direita a atual.
 */
export const AntesEDepois: Story = {
  render: () => ({
    components: { UiSuggestionChip },
    template: `
      <div class="grid gap-6 sm:grid-cols-2">
        <div>
          <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
            Antes — borda 1,16:1
          </p>
          <div class="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-text-muted">
            <span>Costuma entrar aqui:</span>
            <button
              type="button"
              class="rounded-md border border-dashed border-border px-2 py-0.5"
            >
              + Fechar a banda ou o DJ
            </button>
          </div>
        </div>
        <div>
          <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
            Depois — borda 3,17:1, texto 16,99:1
          </p>
          <div class="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-text-muted">
            <span>Costuma entrar aqui:</span>
            <UiSuggestionChip label="Fechar a banda ou o DJ" />
          </div>
        </div>
      </div>
    `,
  }),
}
