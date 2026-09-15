import type { Meta, StoryObj } from '@storybook/vue3-vite'
import UiSelect from './Select.vue'

const FAIXAS = [
  { value: 'crianca', label: 'Criança' },
  { value: 'adolescente', label: 'Adolescente' },
  { value: 'adulto', label: 'Adulto' },
  { value: 'idoso', label: 'Idoso' },
]

/**
 * O dropdown da plataforma — headless via Reka UI, não `<select>` nativo.
 *
 * Duas coisas deste componente só aparecem com a lista ABERTA, e por isso um
 * story estático conta metade da história: a lista sai por `SelectPortal` (vai
 * para o fim do `<body>`, fora da árvore do story) e o item marcado usa
 * `data-[state=checked]` com `bg-primary/[0.06]`. Abrir o dropdown no canvas é
 * parte de olhar estes stories, não um extra.
 *
 * `ComOpcaoVazia` cobre o sentinel interno: o primitive proíbe `value=""`, e o
 * componente troca por `__ui-select-empty__` na ida e desfaz na volta, para
 * "Não informada" poder ser uma opção escolhida em vez de virar placeholder.
 */
const meta = {
  title: 'UI/Select',
  component: UiSelect,
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'inline-radio', options: ['campo', 'quiet'] },
    disabled: { control: 'boolean' },
    label: { control: 'text' },
    hint: { control: 'text' },
    error: { control: 'text' },
  },
  args: {
    label: 'Faixa etária',
    options: FAIXAS,
    modelValue: '',
    disabled: false,
    variant: 'campo',
  },
  decorators: [() => ({ template: `<div class="max-w-sm"><story /></div>` })],
} satisfies Meta<typeof UiSelect>

export default meta
type Story = StoryObj<typeof meta>

/** Sem valor: o placeholder aparece em `text-text-muted` via `data-[placeholder]`. */
export const Default: Story = {}

export const ComValor: Story = {
  args: { modelValue: 'adulto' },
}

export const ComHint: Story = {
  args: {
    modelValue: 'adulto',
    hint: 'A faixa é derivada da data de nascimento; esta escolha só vale para quem não tem data.',
  },
}

export const ComErro: Story = {
  args: { error: 'Escolha uma faixa etária.' },
}

export const Desabilitado: Story = {
  args: { modelValue: 'adulto', disabled: true },
}

/**
 * `variant="quiet"` dentro de uma linha de tabela, que é o único lugar em que
 * ele existe. Sem `label` desenhado, o nome acessível vem de `ariaLabel`.
 */
export const Quiet: Story = {
  args: {
    label: undefined,
    ariaLabel: 'Categoria de Joao da Silva',
    modelValue: 'adulto',
    variant: 'quiet',
  },
  decorators: [
    () => ({
      template: `<div class="max-w-sm rounded-lg border border-border bg-surface-elevated p-2"><story /></div>`,
    }),
  ],
}

/** A opção "Não informada" selecionada — e não confundida com ausência de escolha. */
export const ComOpcaoVazia: Story = {
  args: {
    label: 'Sexo',
    options: [
      { value: '', label: 'Não informado' },
      { value: 'feminino', label: 'Feminino' },
      { value: 'masculino', label: 'Masculino' },
    ],
    modelValue: '',
  },
}

/** Lista longa: o primitive rola sozinho até o item ativo e aceita busca por digitação. */
export const ListaLonga: Story = {
  args: {
    label: 'Grupo',
    modelValue: 'g12',
    options: Array.from({ length: 24 }, (_, indice) => ({
      value: `g${indice + 1}`,
      label: `Grupo ${indice + 1}`,
    })),
  },
}
