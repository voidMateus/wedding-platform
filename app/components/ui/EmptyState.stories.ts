import type { Meta, StoryObj } from '@storybook/vue3-vite'
import UiEmptyState from './EmptyState.vue'
import UiButton from './Button.vue'

/**
 * O estado vazio. É o componente mais presente da plataforma sem ninguém
 * reparar: todo módulo abre nele — Planejamento, Gastos, Mesas, Convites — e
 * quase todo casal o vê antes de ver qualquer lista.
 *
 * `title` é obrigatório; `description` e `icon` são opcionais, e o slot padrão
 * carrega a ação de saída. O ícone é decorativo (`aria-hidden` no stub, como no
 * componente real), então o estado vazio precisa dizer o que é por escrito —
 * nunca por desenho.
 */
const meta = {
  title: 'UI/EmptyState',
  component: UiEmptyState,
  tags: ['autodocs'],
  argTypes: {
    title: { control: 'text' },
    description: { control: 'text' },
    icon: { control: 'text' },
  },
  args: {
    title: 'Nenhum convidado ainda',
  },
} satisfies Meta<typeof UiEmptyState>

export default meta
type Story = StoryObj<typeof meta>

/** Só o título — o mínimo que o componente aceita. */
export const SoTitulo: Story = {}

export const ComDescricao: Story = {
  args: {
    description: 'A lista começa vazia. Cadastre a primeira pessoa ou cole direto da planilha.',
  },
}

export const ComIcone: Story = {
  args: {
    icon: 'lucide:users',
    description: 'A lista começa vazia. Cadastre a primeira pessoa ou cole direto da planilha.',
  },
}

/** Com ação: o slot padrão é onde a saída mora, e é o que transforma o vazio em convite. */
export const ComAcao: Story = {
  args: {
    icon: 'lucide:users',
    description: 'A lista começa vazia. Cadastre a primeira pessoa ou cole direto da planilha.',
  },
  render: (args) => ({
    components: { UiEmptyState, UiButton },
    setup: () => ({ args }),
    template: `
      <UiEmptyState v-bind="args">
        <UiButton>Cadastrar convidado</UiButton>
      </UiEmptyState>
    `,
  }),
}

/** Duas ações — a principal e a alternativa, que é o padrão do primeiro acesso. */
export const ComDuasAcoes: Story = {
  args: {
    icon: 'lucide:wallet',
    title: 'Nenhum gasto registrado',
    description: 'Comece pelo que você já sabe que vai ter. O valor pode ficar em branco.',
  },
  render: (args) => ({
    components: { UiEmptyState, UiButton },
    setup: () => ({ args }),
    template: `
      <UiEmptyState v-bind="args">
        <div class="flex flex-wrap items-center justify-center gap-2">
          <UiButton>Adicionar gasto</UiButton>
          <UiButton variant="ghost">Ver sugestões por categoria</UiButton>
        </div>
      </UiEmptyState>
    `,
  }),
}
