import type { Meta, StoryObj } from '@storybook/vue3-vite'
import UiBadge from './Badge.vue'

/**
 * O selo de estado. Quatro tons de ESTADO (neutral/success/warning/danger,
 * saindo do mapa único de `app/utils/status-presentation.ts`) e um de
 * IDENTIDADE (`primary` — dono, padrinho, madrinha), que nunca é estado.
 *
 * `primary` é o único sem preenchimento, e o comentário do componente explica
 * por quê: a cor primária é configurável por casamento e o validador só garante
 * o mínimo AA dela contra a superfície da página. Sobre um fundo tingido a
 * conta muda, e com o pior primary permitido o texto cairia abaixo de AA.
 * Trocar a borda por `bg-primary/10` aqui é a regressão que estes stories
 * existem para pegar.
 */
const meta = {
  title: 'UI/Badge',
  component: UiBadge,
  tags: ['autodocs'],
  argTypes: {
    tone: {
      control: 'inline-radio',
      options: ['neutral', 'success', 'warning', 'danger', 'primary'],
    },
  },
  args: { tone: 'neutral' },
  render: (args) => ({
    components: { UiBadge },
    setup: () => ({ args }),
    template: `<UiBadge v-bind="args">Sem convite</UiBadge>`,
  }),
} satisfies Meta<typeof UiBadge>

export default meta
type Story = StoryObj<typeof meta>

export const Neutral: Story = {}

export const Success: Story = {
  args: { tone: 'success' },
  render: (args) => ({
    components: { UiBadge },
    setup: () => ({ args }),
    template: `<UiBadge v-bind="args">Estará lá</UiBadge>`,
  }),
}

export const Warning: Story = {
  args: { tone: 'warning' },
  render: (args) => ({
    components: { UiBadge },
    setup: () => ({ args }),
    template: `<UiBadge v-bind="args">Parcial</UiBadge>`,
  }),
}

export const Danger: Story = {
  args: { tone: 'danger' },
  render: (args) => ({
    components: { UiBadge },
    setup: () => ({ args }),
    template: `<UiBadge v-bind="args">Não poderá ir</UiBadge>`,
  }),
}

export const Primary: Story = {
  args: { tone: 'primary' },
  render: (args) => ({
    components: { UiBadge },
    setup: () => ({ args }),
    template: `<UiBadge v-bind="args">Dono</UiBadge>`,
  }),
}

/** Os cinco tons juntos — a única forma de ver que `primary` é o estranho da fila. */
export const TodosOsTons: Story = {
  render: () => ({
    components: { UiBadge },
    template: `
      <div class="flex flex-wrap items-center gap-2">
        <UiBadge tone="neutral">Não enviado</UiBadge>
        <UiBadge tone="success">Respondido</UiBadge>
        <UiBadge tone="warning">Parcial</UiBadge>
        <UiBadge tone="danger">Não poderá ir</UiBadge>
        <UiBadge tone="primary">Dono</UiBadge>
      </div>
    `,
  }),
}

/**
 * Os cinco estágios do funil de convites, que é onde o badge mais aparece — e o
 * caso em que os tons precisam ser distinguíveis entre si, não só legíveis um a
 * um. Quem não distingue cor lê a palavra; ela nunca é redundante com o tom.
 */
export const FunilDeConvites: Story = {
  render: () => ({
    components: { UiBadge },
    template: `
      <div class="flex flex-wrap items-center gap-2">
        <UiBadge tone="neutral">Não enviado</UiBadge>
        <UiBadge tone="warning">Enviado</UiBadge>
        <UiBadge tone="warning">Aberto</UiBadge>
        <UiBadge tone="warning">Parcial</UiBadge>
        <UiBadge tone="success">Respondido</UiBadge>
      </div>
    `,
  }),
}
