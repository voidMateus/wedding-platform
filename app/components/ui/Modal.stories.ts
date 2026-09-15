import { ref } from 'vue'
import type { Meta, StoryObj } from '@storybook/vue3-vite'
import UiModal from './Modal.vue'
import UiButton from './Button.vue'
import UiInput from './Input.vue'

/**
 * O diálogo. `DialogRoot` do Reka, o que significa foco preso dentro, `Escape`
 * fechando e `aria-labelledby`/`aria-describedby` amarrados a `title` e
 * `description` sem ninguém passar id à mão.
 *
 * Duas coisas a saber ao ler estes stories:
 *
 * 1. O conteúdo sai por `DialogPortal`, para o fim do `<body>` — fora da árvore
 *    do story e fora do `<div class="admin-ui">` do decorador de contexto. Por
 *    isso o modal aparece sempre com os neutros do site público aqui, mesmo com
 *    o seletor em "Painel". Na aplicação o portal cai dentro do layout, que
 *    tem a classe; a divergência é da vitrine, não do componente.
 * 2. Os stories abrem o modal por um botão, e não com `modelValue: true` fixo:
 *    um modal que já nasce aberto nunca exercita a devolução do foco ao
 *    gatilho, que é metade do que o primitive entrega.
 */
const meta = {
  title: 'UI/Modal',
  component: UiModal,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'inline-radio', options: ['md', 'lg'] },
    scroll: { control: 'inline-radio', options: ['body', 'content'] },
    title: { control: 'text' },
    description: { control: 'text' },
  },
  args: {
    modelValue: false,
    title: 'Excluir convidado',
    description: 'A pessoa sai da lista, mas continua no histórico do casamento.',
    size: 'md',
    scroll: 'body',
  },
  render: (args) => ({
    components: { UiModal, UiButton },
    setup() {
      const aberto = ref(args.modelValue)
      return { args, aberto }
    },
    template: `
      <div>
        <UiButton @click="aberto = true">Abrir diálogo</UiButton>
        <UiModal v-bind="args" v-model="aberto">
          <p class="text-sm text-text-muted">
            Mariana Ribeiro sai da lista e do convite "Família Ribeiro". O convite continua
            existindo, com as outras duas pessoas.
          </p>
          <template #footer>
            <UiButton variant="ghost" @click="aberto = false">Cancelar</UiButton>
            <UiButton variant="destructive" @click="aberto = false">Excluir</UiButton>
          </template>
        </UiModal>
      </div>
    `,
  }),
} satisfies Meta<typeof UiModal>

export default meta
type Story = StoryObj<typeof meta>

export const Confirmacao: Story = {}

export const SemDescricao: Story = {
  args: { title: 'Registrar envio', description: undefined },
}

/** `size="lg"` — formulário de várias colunas, lightbox de foto. */
export const Largo: Story = {
  args: {
    size: 'lg',
    title: 'Cadastrar convidado',
    description: 'Uma tela só: sem "Próximo" e sem passo de revisão.',
  },
  render: (args) => ({
    components: { UiModal, UiButton, UiInput },
    setup() {
      const aberto = ref(false)
      return { args, aberto }
    },
    template: `
      <div>
        <UiButton @click="aberto = true">Abrir cadastro</UiButton>
        <UiModal v-bind="args" v-model="aberto">
          <div class="grid gap-4 sm:grid-cols-2">
            <UiInput label="Nome completo" placeholder="Como aparece no convite" />
            <UiInput label="Telefone" type="tel" placeholder="(11) 98888-7777" />
            <UiInput label="E-mail" type="email" placeholder="voce@exemplo.com" />
            <UiInput label="Data de nascimento" type="date" />
          </div>
          <template #footer>
            <UiButton variant="ghost" @click="aberto = false">Cancelar</UiButton>
            <UiButton @click="aberto = false">Cadastrar convidado</UiButton>
          </template>
        </UiModal>
      </div>
    `,
  }),
}

/**
 * Conteúdo mais alto que a janela: com `scroll="body"` o corpo inteiro rola e
 * o rodapé acompanha. `scroll="content"` existe para o caso oposto — quando o
 * próprio conteúdo precisa fixar cabeçalho e rodapé.
 */
export const ConteudoLongo: Story = {
  args: { title: 'Manual dos convidados', description: undefined },
  render: (args) => ({
    components: { UiModal, UiButton },
    setup() {
      const aberto = ref(false)
      const paragrafos = Array.from({ length: 12 }, (_, i) => `Parágrafo ${i + 1} do manual.`)
      return { args, aberto, paragrafos }
    },
    template: `
      <div>
        <UiButton @click="aberto = true">Abrir manual</UiButton>
        <UiModal v-bind="args" v-model="aberto">
          <p v-for="texto in paragrafos" :key="texto" class="mb-4 text-sm text-text-muted">
            {{ texto }}
          </p>
          <template #footer>
            <UiButton @click="aberto = false">Fechar</UiButton>
          </template>
        </UiModal>
      </div>
    `,
  }),
}
