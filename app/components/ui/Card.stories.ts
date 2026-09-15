import type { Meta, StoryObj } from '@storybook/vue3-vite'
import UiCard from './Card.vue'
import UiButton from './Button.vue'
import UiBadge from './Badge.vue'

/**
 * O cartão. Quatro eixos — `padding`, `radius`, `elevation`, `variant` — e uma
 * regra que atravessa todos: no painel, `radius` e `elevation` deixam de valer.
 *
 * `inject(ADMIN_UI_CONTEXT_KEY)` faz o cartão virar painel de borda 1px sem
 * sombra ali, porque vários cartões elevados na mesma tela de dados competem
 * pelo peso visual. Na prática isso significa que metade dos controles destes
 * stories só tem efeito com o seletor "Contexto" em "Site público" — trocar
 * para "Painel" e ver o `elevation` sumir não é bug, é a decisão.
 */
const meta = {
  title: 'UI/Card',
  component: UiCard,
  tags: ['autodocs'],
  argTypes: {
    padding: { control: 'inline-radio', options: ['none', 'sm', 'md'] },
    radius: { control: 'inline-radio', options: ['lg', 'xl'] },
    elevation: { control: 'inline-radio', options: ['none', 'sm', 'xl'] },
    variant: {
      control: 'inline-radio',
      options: ['default', 'interactive', 'highlight', 'plain'],
    },
  },
  args: {
    padding: 'md',
    radius: 'xl',
    elevation: 'xl',
    variant: 'default',
  },
  render: (args) => ({
    components: { UiCard },
    setup: () => ({ args }),
    template: `
      <UiCard v-bind="args" class="max-w-sm">
        <p class="text-sm font-medium text-text">Jogo de panelas</p>
        <p class="mt-1 text-sm text-text-muted">R$ 450,00 · 1 disponível</p>
      </UiCard>
    `,
  }),
} satisfies Meta<typeof UiCard>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** `interactive` — cartão clicável (stat tile, item de lista): hover no degrau médio. */
export const Interactive: Story = {
  args: { variant: 'interactive' },
}

/** `highlight` — ênfase leve na primária, sem virar CTA (o prazo de RSVP no painel). */
export const Highlight: Story = {
  args: { variant: 'highlight' },
}

/** `plain` — sem moldura nenhuma, para quando o contêiner pai já é a moldura. */
export const Plain: Story = {
  args: { variant: 'plain' },
}

/** Com cabeçalho e rodapé: os dois slots ganham espaçamento e alinhamento próprios. */
export const ComCabecalhoERodape: Story = {
  render: (args) => ({
    components: { UiCard, UiButton, UiBadge },
    setup: () => ({ args }),
    template: `
      <UiCard v-bind="args" class="max-w-sm">
        <template #header>
          <p class="font-display text-base font-semibold text-text">Refrigerantes</p>
          <UiBadge tone="success">Contratado</UiBadge>
        </template>
        <p class="text-sm text-text-muted">
          R$ 1.620,00 fechados contra R$ 1.800,00 planejados.
        </p>
        <template #footer>
          <UiButton variant="ghost" size="sm">Ver ficha</UiButton>
          <UiButton size="sm">Registrar pagamento</UiButton>
        </template>
      </UiCard>
    `,
  }),
}

/** Os três degraus de elevação lado a lado — só visíveis no contexto público. */
export const Elevacoes: Story = {
  render: () => ({
    components: { UiCard },
    template: `
      <div class="grid gap-6 sm:grid-cols-3">
        <UiCard elevation="none"><p class="text-sm text-text">none</p></UiCard>
        <UiCard elevation="sm"><p class="text-sm text-text">sm</p></UiCard>
        <UiCard elevation="xl"><p class="text-sm text-text">xl</p></UiCard>
      </div>
    `,
  }),
}

export const Espacamentos: Story = {
  render: () => ({
    components: { UiCard },
    template: `
      <div class="grid gap-6 sm:grid-cols-3">
        <UiCard padding="none"><p class="text-sm text-text">none</p></UiCard>
        <UiCard padding="sm"><p class="text-sm text-text">sm</p></UiCard>
        <UiCard padding="md"><p class="text-sm text-text">md</p></UiCard>
      </div>
    `,
  }),
}
