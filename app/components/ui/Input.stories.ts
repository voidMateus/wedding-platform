import type { Meta, StoryObj } from '@storybook/vue3-vite'
import UiInput from './Input.vue'

/**
 * O campo de texto. Dois eixos visuais — `variant` (campo/quiet) e `tone`
 * (default/muted) — e três estados de apoio que mudam o que o leitor de tela
 * anuncia: `hint`, `error` e `ariaLabel`.
 *
 * O contrato acessível é o que mais importa aqui: `hint` e `error` entram
 * juntos em `aria-describedby`, o erro tem `role="alert"`, e `aria-invalid`
 * acompanha o erro. Um story por estado existe para que uma mudança que quebre
 * essa cadeia apareça na vitrine, não só numa tela do produto.
 */
const meta = {
  title: 'UI/Input',
  component: UiInput,
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'inline-radio', options: ['campo', 'quiet', 'quiet-desktop'] },
    tone: { control: 'inline-radio', options: ['default', 'muted'] },
    type: {
      control: 'select',
      options: ['text', 'email', 'tel', 'password', 'number', 'date', 'time'],
    },
    disabled: { control: 'boolean' },
    label: { control: 'text' },
    hint: { control: 'text' },
    error: { control: 'text' },
    icon: { control: 'text' },
  },
  args: {
    label: 'Nome completo',
    placeholder: 'Como aparece no convite',
    modelValue: '',
    disabled: false,
    variant: 'campo',
    tone: 'default',
  },
  decorators: [() => ({ template: `<div class="max-w-sm"><story /></div>` })],
} satisfies Meta<typeof UiInput>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const ComValor: Story = {
  args: { modelValue: 'Mariana Ribeiro de Andrade' },
}

/** A linha de apoio explica o PORQUÊ da regra — o formato esperado é papel do placeholder. */
export const ComHint: Story = {
  args: {
    label: 'Telefone',
    type: 'tel',
    placeholder: '(11) 98888-7777',
    hint: 'Só com o telefone o convite pode sair por WhatsApp.',
  },
}

export const ComErro: Story = {
  args: {
    modelValue: 'mariana@',
    label: 'E-mail',
    type: 'email',
    error: 'Informe um e-mail válido.',
  },
}

/** Hint e erro ao mesmo tempo: os dois ids entram em `aria-describedby`, nessa ordem. */
export const ComHintEErro: Story = {
  args: {
    modelValue: 'mariana@',
    label: 'E-mail',
    type: 'email',
    hint: 'Usado para enviar o convite e os lembretes.',
    error: 'Informe um e-mail válido.',
  },
}

export const Desabilitado: Story = {
  args: { modelValue: 'Não editável aqui', disabled: true },
}

export const ComIcone: Story = {
  args: {
    label: undefined,
    ariaLabel: 'Buscar convidado',
    placeholder: 'Digite um nome...',
    icon: 'lucide:search',
  },
}

/** `tone="muted"` assenta o campo sobre a faixa do cabeçalho, sem competir com o conteúdo. */
export const TomMuted: Story = {
  args: {
    label: undefined,
    ariaLabel: 'Buscar',
    placeholder: 'Buscar...',
    icon: 'lucide:search',
    tone: 'muted',
  },
}

/**
 * `variant="quiet"` é a célula editável da planilha: sem moldura até o
 * hover/foco. Sem `label` desenhado, o nome acessível vem de `ariaLabel` — e é
 * o que este story exercita.
 */
export const Quiet: Story = {
  args: {
    label: undefined,
    ariaLabel: 'Nome de Joao da Silva',
    modelValue: 'Joao da Silva',
    variant: 'quiet',
  },
  decorators: [
    () => ({
      template: `<div class="max-w-sm rounded-lg border border-border bg-surface-elevated p-2"><story /></div>`,
    }),
  ],
}

/**
 * `variant="quiet-desktop"` é a mesma sobriedade, mas só a partir de `sm` —
 * para a linha editável que NÃO é tabela e empilha no celular em vez de sumir.
 * Estreite a janela da vitrine e a moldura volta: abaixo de `sm` isto é
 * `campo`, e é o que garante alvo de toque onde o campo é o controle da tela.
 */
export const QuietDesktop: Story = {
  args: {
    label: undefined,
    ariaLabel: 'Tarefa Enviar o save the date',
    modelValue: 'Enviar o save the date',
    variant: 'quiet-desktop',
  },
  decorators: [
    () => ({
      template: `<div class="max-w-sm rounded-lg border border-border bg-surface-elevated p-2"><story /></div>`,
    }),
  ],
}

/**
 * `suggestions` autocompleta a partir do que já existe **sem fechar o conjunto**:
 * o campo continua texto livre, e quem digita um nome novo não é corrigido. Se o
 * vocabulário fosse fechado, o controle certo seria o `UiSelect`.
 */
export const ComSugestoes: Story = {
  args: {
    label: 'Quem faz?',
    placeholder: 'Quem faz?',
    hint: 'Comece a digitar para ver quem já aparece na checklist.',
    suggestions: ['Cerimonial Ana', 'Mãe da noiva', 'Mariana', 'Rafael'],
  },
}

/** Os tipos que a plataforma usa, um embaixo do outro. */
export const Tipos: Story = {
  render: () => ({
    components: { UiInput },
    template: `
      <div class="flex flex-col gap-4">
        <UiInput label="Texto" type="text" placeholder="Nome completo" />
        <UiInput label="E-mail" type="email" placeholder="voce@exemplo.com" />
        <UiInput label="Telefone" type="tel" placeholder="(11) 98888-7777" />
        <UiInput label="Senha" type="password" placeholder="••••••••" />
        <UiInput label="Quantidade" type="number" placeholder="0" />
        <UiInput label="Data" type="date" />
      </div>
    `,
  }),
}
