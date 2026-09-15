import type { Meta, StoryObj } from '@storybook/vue3-vite'
import UiButton from './Button.vue'

/**
 * O botão da plataforma — e o componente que mais muda de cara entre os dois
 * contextos: pílula uppercase com glow no site público, retangular no painel.
 * Os dois estados estão no seletor "Contexto" da barra de ferramentas, e a
 * história `PublicoVsAdmin` mostra os dois lado a lado.
 */
const meta = {
  title: 'UI/Button',
  component: UiButton,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'outline', 'ghost', 'destructive'],
    },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    rounded: {
      control: 'inline-radio',
      options: [undefined, 'md', 'full'],
      description: 'Sem valor, o formato vem do contexto: pílula no público, retangular no admin',
    },
    disabled: { control: 'boolean' },
    to: { control: 'text' },
  },
  args: {
    variant: 'primary',
    size: 'md',
    disabled: false,
  },
  render: (args) => ({
    components: { UiButton },
    setup: () => ({ args }),
    template: `<UiButton v-bind="args">Confirmar presença</UiButton>`,
  }),
} satisfies Meta<typeof UiButton>

export default meta
type Story = StoryObj<typeof meta>

export const Primary: Story = {}

export const Secondary: Story = { args: { variant: 'secondary' } }

export const Outline: Story = { args: { variant: 'outline' } }

export const Ghost: Story = { args: { variant: 'ghost' } }

export const Destructive: Story = {
  args: { variant: 'destructive' },
  render: (args) => ({
    components: { UiButton },
    setup: () => ({ args }),
    template: `<UiButton v-bind="args">Excluir convidado</UiButton>`,
  }),
}

/** As cinco variantes na mesma régua — é assim que se vê se alguma saiu do sistema. */
export const TodasAsVariantes: Story = {
  render: () => ({
    components: { UiButton },
    template: `
      <div class="flex flex-wrap items-center gap-3">
        <UiButton variant="primary">Primary</UiButton>
        <UiButton variant="secondary">Secondary</UiButton>
        <UiButton variant="outline">Outline</UiButton>
        <UiButton variant="ghost">Ghost</UiButton>
        <UiButton variant="destructive">Destructive</UiButton>
      </div>
    `,
  }),
}

export const Tamanhos: Story = {
  render: () => ({
    components: { UiButton },
    template: `
      <div class="flex flex-wrap items-center gap-3">
        <UiButton size="sm">Pequeno</UiButton>
        <UiButton size="md">Médio</UiButton>
        <UiButton size="lg">Grande</UiButton>
      </div>
    `,
  }),
}

/**
 * Desabilitado em todas as variantes: o tratamento é uma opacidade só
 * (`disabled:opacity-50`), então é justamente aqui que uma variante já clara
 * pode cair abaixo do contraste.
 */
export const Desabilitado: Story = {
  render: () => ({
    components: { UiButton },
    template: `
      <div class="flex flex-wrap items-center gap-3">
        <UiButton variant="primary" disabled>Primary</UiButton>
        <UiButton variant="secondary" disabled>Secondary</UiButton>
        <UiButton variant="outline" disabled>Outline</UiButton>
        <UiButton variant="ghost" disabled>Ghost</UiButton>
        <UiButton variant="destructive" disabled>Destructive</UiButton>
      </div>
    `,
  }),
}

/**
 * Com `to`, o componente deixa de ser `<button>` e vira âncora — papel
 * diferente, foco diferente, e `disabled` deixa de existir (âncora não
 * desabilita).
 */
export const ComoLink: Story = {
  args: { to: '/presentes' },
  render: (args) => ({
    components: { UiButton },
    setup: () => ({ args }),
    template: `<UiButton v-bind="args">Ver lista de presentes</UiButton>`,
  }),
}

/**
 * O mesmo botão nos dois contextos, um ao lado do outro.
 *
 * O da direita está dentro de `.admin-ui`, mas SEM o `provide` do contexto —
 * que é o que decide o formato. O resultado é o meio-termo que não existe na
 * aplicação: serve para ver que a classe sozinha muda os neutros, e que é o
 * `provide` (não a classe) que troca pílula por retângulo.
 */
export const PublicoVsAdmin: Story = {
  render: () => ({
    components: { UiButton },
    template: `
      <div class="grid gap-6 sm:grid-cols-2">
        <div class="rounded-lg border border-border p-4">
          <p class="mb-3 text-xs uppercase tracking-wider text-text-muted">Site público</p>
          <UiButton rounded="full">Confirmar presença</UiButton>
        </div>
        <div class="admin-ui rounded-lg border border-border bg-surface p-4">
          <p class="mb-3 text-xs uppercase tracking-wider text-text-muted">Painel</p>
          <UiButton rounded="md">Salvar</UiButton>
        </div>
      </div>
    `,
  }),
}
