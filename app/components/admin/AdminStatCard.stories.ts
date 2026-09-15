import type { Meta, StoryObj } from '@storybook/vue3-vite'
import AdminStatCard from './AdminStatCard.vue'

/**
 * O número do painel. Cinco tons, e o tom pinta SÓ a rodela do ícone — rótulo e
 * valor ficam sempre em `text-text-muted`/`text-text`, sobre o cartão branco.
 *
 * É o componente com mais tons da plataforma, e o único em que um deles
 * (`primary`) usa `bg-primary/10` como fundo de conteúdo. O `UiBadge` evitou
 * exatamente esse padrão de propósito (ver o comentário lá): com o pior
 * `--color-primary` que o validador aceita, texto sobre `bg-primary/10` cai
 * abaixo de AA. Aqui não há texto sobre o tingido — só o ícone, que é
 * decorativo —, mas é a diferença que faz este cartão precisar de story
 * próprio.
 *
 * Renderizado no contexto do painel por padrão: é o único lugar onde ele
 * aparece, e fora de `.admin-ui` o cartão sairia elevado e sobre creme.
 */
const meta = {
  title: 'Admin/AdminStatCard',
  component: AdminStatCard,
  tags: ['autodocs'],
  parameters: { contexto: 'admin' },
  argTypes: {
    tone: {
      control: 'inline-radio',
      options: ['default', 'primary', 'success', 'warning', 'danger'],
    },
    icon: { control: 'text' },
    label: { control: 'text' },
    value: { control: 'text' },
  },
  args: {
    icon: 'lucide:users',
    label: 'Convidados',
    value: 128,
    tone: 'default',
  },
} satisfies Meta<typeof AdminStatCard>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Primary: Story = {
  args: { tone: 'primary', icon: 'lucide:mail', label: 'Convites enviados', value: 42 },
}

export const Success: Story = {
  args: { tone: 'success', icon: 'lucide:check', label: 'Confirmados', value: 87 },
}

export const Warning: Story = {
  args: { tone: 'warning', icon: 'lucide:clock', label: 'Aguardando resposta', value: 31 },
}

export const Danger: Story = {
  args: { tone: 'danger', icon: 'lucide:x', label: 'Não poderão ir', value: 10 },
}

/** Os cinco tons na grade em que o painel de fato os empilha. */
export const TodosOsTons: Story = {
  render: () => ({
    components: { AdminStatCard },
    template: `
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <AdminStatCard icon="lucide:users" label="Convidados" :value="128" />
        <AdminStatCard icon="lucide:mail" label="Convites enviados" :value="42" tone="primary" />
        <AdminStatCard icon="lucide:check" label="Confirmados" :value="87" tone="success" />
        <AdminStatCard icon="lucide:clock" label="Aguardando" :value="31" tone="warning" />
        <AdminStatCard icon="lucide:x" label="Não poderão ir" :value="10" tone="danger" />
        <AdminStatCard icon="lucide:wallet" label="A pagar" value="R$ 24.380,00" tone="warning" />
      </div>
    `,
  }),
}

/**
 * Valor e rótulo longos demais para a caixa.
 *
 * O componente trunca os dois (`truncate`) e põe o valor inteiro no `title`.
 * `title` é dica de mouse: não chega a quem navega por teclado nem a leitor de
 * tela em toda plataforma — então este story existe para a decisão ficar
 * visível, não porque ela está resolvida.
 */
export const ValorLongo: Story = {
  args: {
    icon: 'lucide:wallet',
    label: 'Total contratado com fornecedores do buffet',
    value: 'R$ 1.284.930,00',
  },
}
