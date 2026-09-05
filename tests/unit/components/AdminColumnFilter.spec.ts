import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AdminColumnFilter from '~/components/admin/AdminColumnFilter.vue'
import Checkbox from '~/components/ui/Checkbox.vue'
import Input from '~/components/ui/Input.vue'
import { ICON_STUBS } from '../test-utils/icon-stubs'
import type { TableColumnFilter, TableSortDirection, TableSortKind } from '~/types/table'

function mountPanel(props: {
  label?: string
  filter?: TableColumnFilter
  sort?: TableSortKind
  values?: string[]
  direction?: TableSortDirection | null
}) {
  return mount(AdminColumnFilter, {
    props: {
      label: 'Grupo',
      values: [],
      direction: null,
      ...props,
    },
    global: {
      components: { UiInput: Input, UiCheckbox: Checkbox },
      stubs: ICON_STUBS,
    },
  })
}

const OPCOES = [
  { value: 'g1', label: 'Família da Noiva' },
  { value: 'g2', label: 'Trabalho' },
]

describe('AdminColumnFilter', () => {
  it('não desenha a seção "Ordenar" quando a coluna não é ordenável', () => {
    const wrapper = mountPanel({ filter: { type: 'text' } })
    expect(wrapper.text()).not.toContain('Ordenar')
    expect(wrapper.text()).toContain('Filtrar')
  })

  it('não desenha a seção "Filtrar" quando a coluna só ordena', () => {
    const wrapper = mountPanel({ sort: 'alpha' })
    expect(wrapper.text()).toContain('Ordenar')
    expect(wrapper.text()).not.toContain('Filtrar')
  })

  it('usa os rótulos de ordenação do tipo do dado', () => {
    expect(mountPanel({ sort: 'alpha' }).text()).toContain('A a Z')
    expect(mountPanel({ sort: 'date' }).text()).toContain('Mais recente a mais antiga')
  })

  it('emite o sentido pedido ao clicar em uma das ordenações', async () => {
    const wrapper = mountPanel({ sort: 'numeric' })
    const [ascendente, descendente] = wrapper.findAll('button[aria-pressed]')
    await descendente?.trigger('click')
    expect(wrapper.emitted('sort')).toEqual([['desc']])
    await ascendente?.trigger('click')
    expect(wrapper.emitted('sort')).toEqual([['desc'], ['asc']])
  })

  it('marca o sentido ativo para leitor de tela', () => {
    const wrapper = mountPanel({ sort: 'alpha', direction: 'desc' })
    const pressed = wrapper.findAll('button[aria-pressed="true"]')
    expect(pressed).toHaveLength(1)
    expect(pressed[0]?.text()).toContain('Z a A')
  })

  describe('valor único', () => {
    it('acrescenta a opção vazia à lista', () => {
      const wrapper = mountPanel({ filter: { type: 'select', options: OPCOES } })
      const options = wrapper.findAll('[role="group"] button')
      expect(options.map((option) => option.text())).toEqual([
        'Todos',
        'Família da Noiva',
        'Trabalho',
      ])
    })

    it('respeita a opção vazia que a página já declarou, sem duplicar', () => {
      const wrapper = mountPanel({
        filter: {
          type: 'select',
          options: [
            { value: '', label: 'Todas as idades' },
            { value: 'crianca', label: 'Crianças' },
          ],
        },
      })
      const options = wrapper.findAll('[role="group"] button')
      expect(options.map((option) => option.text())).toEqual(['Todas as idades', 'Crianças'])
    })

    it('emite a opção escolhida', async () => {
      const wrapper = mountPanel({ filter: { type: 'select', options: OPCOES } })
      await wrapper.findAll('[role="group"] button')[2]?.trigger('click')
      expect(wrapper.emitted('select')).toEqual([['g2']])
    })

    it('"Todos" aparece marcado enquanto não há recorte', () => {
      const wrapper = mountPanel({ filter: { type: 'select', options: OPCOES } })
      const marcadas = wrapper.findAll('[role="group"] button[aria-pressed="true"]')
      expect(marcadas).toHaveLength(1)
      expect(marcadas[0]?.text()).toBe('Todos')
    })
  })

  describe('múltipla escolha', () => {
    const filtroMultiplo: TableColumnFilter = { type: 'select', multiple: true, options: OPCOES }

    it('desenha caixas de marcar de verdade, sem a linha "Todos"', () => {
      const wrapper = mountPanel({ filter: filtroMultiplo })
      const caixas = wrapper.findAll('input[type="checkbox"]')
      expect(caixas).toHaveLength(2)
      expect(wrapper.text()).not.toContain('Todos')
    })

    it('mostra marcadas as opções que estão no recorte', () => {
      const wrapper = mountPanel({ filter: filtroMultiplo, values: ['g2'] })
      const caixas = wrapper.findAll('input[type="checkbox"]')
      expect((caixas[0]?.element as HTMLInputElement).checked).toBe(false)
      expect((caixas[1]?.element as HTMLInputElement).checked).toBe(true)
    })

    it('emite a opção clicada — quem decide marcar ou desmarcar é quem escuta', async () => {
      const wrapper = mountPanel({ filter: filtroMultiplo, values: ['g1'] })
      const caixas = wrapper.findAll('input[type="checkbox"]')
      await caixas[1]?.setValue(true)
      expect(wrapper.emitted('select')).toEqual([['g2']])

      await caixas[0]?.setValue(false)
      expect(wrapper.emitted('select')).toEqual([['g2'], ['g1']])
    })

    it('tira a opção vazia que a página declarou (quem limpa é o "Limpar")', () => {
      const wrapper = mountPanel({
        filter: {
          type: 'select',
          multiple: true,
          options: [
            { value: '', label: 'Todas as idades' },
            { value: 'crianca', label: 'Crianças' },
          ],
        },
      })
      expect(wrapper.findAll('input[type="checkbox"]')).toHaveLength(1)
      expect(wrapper.text()).not.toContain('Todas as idades')
    })
  })

  it('"Limpar" fica desabilitado sem nada aplicado e emite "clear" quando há', async () => {
    const semNada = mountPanel({ filter: { type: 'text' } })
    expect(semNada.find('button').attributes('disabled')).toBeDefined()

    const comFiltro = mountPanel({ filter: { type: 'text' }, values: ['ana'] })
    const limpar = comFiltro.find('button')
    expect(limpar.attributes('disabled')).toBeUndefined()
    await limpar.trigger('click')
    expect(comFiltro.emitted('clear')).toHaveLength(1)
  })

  it('"Limpar" também fica ativo quando só a ordenação está aplicada', () => {
    const wrapper = mountPanel({ sort: 'alpha', direction: 'asc' })
    expect(wrapper.find('button').attributes('disabled')).toBeUndefined()
  })

  it('o campo de texto começa com o valor do recorte', () => {
    const wrapper = mountPanel({ filter: { type: 'text' }, values: ['ana'] })
    expect(wrapper.find('input[type="text"]').element).toHaveProperty('value', 'ana')
  })
})
