import type { Meta, StoryObj } from '@storybook/vue3-vite'
import UiToast from './Toast.vue'

/**
 * O aviso efêmero. Quatro tons, e neles o tom pinta o TEXTO, não só a moldura —
 * `text-success` sobre `bg-success/5`, e assim por diante.
 *
 * É a diferença que importa em relação ao `UiBadge`, que evita fundo tingido de
 * propósito: aqui o fundo é tingido a 5% de uma cor FIXA da plataforma
 * (`--color-danger`, `--color-success`, `--color-warning`), nunca da primária
 * do casamento — então a conta de contraste é a mesma para todos os casais, e
 * pode ser verificada uma vez. Trocar qualquer um desses por um token que varie
 * por casamento invalidaria esse raciocínio.
 *
 * O botão de fechar é um "×" de texto com `aria-label="Fechar"` e
 * `text-current` — ele herda o tom, então é o elemento a conferir na varredura:
 * `opacity-60` em repouso sobre o fundo tingido é o pior caso de contraste do
 * componente.
 */
const meta = {
  title: 'UI/Toast',
  component: UiToast,
  tags: ['autodocs'],
  argTypes: {
    tone: { control: 'inline-radio', options: ['info', 'success', 'warning', 'error'] },
    message: { control: 'text' },
  },
  args: {
    tone: 'info',
    message: 'Nada mudou desde a última vez que você salvou.',
  },
  decorators: [() => ({ template: `<div class="max-w-md"><story /></div>` })],
} satisfies Meta<typeof UiToast>

export default meta
type Story = StoryObj<typeof meta>

export const Info: Story = {}

export const Success: Story = {
  args: { tone: 'success', message: 'Convite registrado como enviado.' },
}

export const Warning: Story = {
  args: {
    tone: 'warning',
    message: 'A soma das parcelas não fecha com o valor contratado.',
  },
}

export const Error: Story = {
  args: { tone: 'error', message: 'Não foi possível salvar. Tente de novo.' },
}

/** Mensagem longa: o texto embrulha e o "×" fica alinhado ao topo, não ao centro. */
export const MensagemLonga: Story = {
  args: {
    tone: 'warning',
    message:
      'Duas pessoas deste núcleo estão em convites diferentes, então elas deixaram de ser convidadas juntas — a operação foi recusada em vez de mover alguém de convite.',
  },
}

/** Os quatro empilhados, como o `UiToastViewport` os mostra. */
export const TodosOsTons: Story = {
  render: () => ({
    components: { UiToast },
    template: `
      <div class="flex flex-col gap-2">
        <UiToast tone="info" message="Nada mudou desde a última vez que você salvou." />
        <UiToast tone="success" message="Convite registrado como enviado." />
        <UiToast tone="warning" message="A soma das parcelas não fecha com o valor contratado." />
        <UiToast tone="error" message="Não foi possível salvar. Tente de novo." />
      </div>
    `,
  }),
}
