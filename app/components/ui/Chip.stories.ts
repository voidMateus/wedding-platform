import type { Meta, StoryObj } from '@storybook/vue3-vite'
import UiChip from './Chip.vue'

/**
 * A etiqueta. Três eixos independentes que se combinam livremente — `selected`
 * (pintado na primária), `clickable` (o rótulo vira botão com `aria-pressed`) e
 * `removable` (o "×" ao final).
 *
 * O par que importa acompanhar é `selected` + `clickable`: é nele que o chip é
 * um toggle de verdade, e o único em que o texto fica sobre a cor primária do
 * casamento em vez de sobre a superfície. `--color-primary` varia por casal e o
 * validador de contraste mede a primária contra a SUPERFÍCIE, não contra
 * `--color-primary-foreground` — então este é o estado a olhar com desconfiança
 * quando alguém mudar a paleta.
 */
const meta = {
  title: 'UI/Chip',
  component: UiChip,
  tags: ['autodocs'],
  argTypes: {
    label: { control: 'text' },
    selected: { control: 'boolean' },
    clickable: { control: 'boolean' },
    removable: { control: 'boolean' },
  },
  args: {
    label: 'Amigos do trabalho',
    selected: false,
    clickable: false,
    removable: false,
  },
} satisfies Meta<typeof UiChip>

export default meta
type Story = StoryObj<typeof meta>

/** Informativo: não clica, não remove, e nunca fica selecionado. */
export const Informativo: Story = {}

export const Clicavel: Story = {
  args: { clickable: true },
}

export const Selecionado: Story = {
  args: { clickable: true, selected: true },
}

export const Removivel: Story = {
  args: { removable: true },
}

export const ClicavelERemovivel: Story = {
  args: { clickable: true, removable: true },
}

/**
 * Selecionado E removível: o "×" fica sobre a primária, herdando
 * `--color-primary-foreground`. O botão de remover só tem `aria-label`
 * ("Remover <label>") — nenhum texto visível —, então é o alvo a conferir numa
 * varredura de nome acessível.
 */
export const SelecionadoERemovivel: Story = {
  args: { clickable: true, selected: true, removable: true },
}

/** A fila de etiquetas como ela aparece num filtro de Convites. */
export const GrupoDeEtiquetas: Story = {
  render: () => ({
    components: { UiChip },
    template: `
      <div class="flex flex-wrap items-center gap-2">
        <UiChip label="Família do noivo" clickable selected />
        <UiChip label="Família da noiva" clickable />
        <UiChip label="Amigos do trabalho" clickable />
        <UiChip label="Padrinhos" clickable removable />
        <UiChip label="Sem grupo" />
      </div>
    `,
  }),
}
