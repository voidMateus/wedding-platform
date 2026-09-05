import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AdminColumnFilter from '~/components/admin/AdminColumnFilter.vue'
import Input from '~/components/ui/Input.vue'
import { ICON_STUBS } from '../test-utils/icon-stubs'
import type { TableColumnFilter, TableSortDirection, TableSortKind } from '~/types/table'

function mountPanel(props: {
  label?: string
  filter?: TableColumnFilter
  sort?: TableSortKind
  value?: string
  direction?: TableSortDirection | null
}) {
  return mount(AdminColumnFilter, {
    props: {
      label: 'Grupo',
      value: '',
      direction: null,
      ...props,
    },
    global: {
      components: { UiInput: Input },
      stubs: ICON_STUBS,
    },
  })
}

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

  it('acrescenta a opção vazia à lista de um select', () => {
    const wrapper = mountPanel({
      filter: { type: 'select', options: [{ value: 'g1', label: 'Trabalho' }] },
    })
    const options = wrapper.findAll('[role="group"] button')
    expect(options.map((option) => option.text())).toEqual(['Todos', 'Trabalho'])
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

  it('emite o valor da opção escolhida', async () => {
    const wrapper = mountPanel({
      filter: { type: 'select', options: [{ value: 'g1', label: 'Trabalho' }] },
    })
    await wrapper.findAll('[role="group"] button')[1]?.trigger('click')
    expect(wrapper.emitted('update:value')).toEqual([['g1']])
  })

  it('"Limpar" fica desabilitado sem nada aplicado e emite "clear" quando há', async () => {
    const semNada = mountPanel({ filter: { type: 'text' } })
    expect(semNada.find('button').attributes('disabled')).toBeDefined()

    const comFiltro = mountPanel({ filter: { type: 'text' }, value: 'ana' })
    const limpar = comFiltro.find('button')
    expect(limpar.attributes('disabled')).toBeUndefined()
    await limpar.trigger('click')
    expect(comFiltro.emitted('clear')).toHaveLength(1)
  })

  it('"Limpar" também fica ativo quando só a ordenação está aplicada', () => {
    const wrapper = mountPanel({ sort: 'alpha', direction: 'asc' })
    expect(wrapper.find('button').attributes('disabled')).toBeUndefined()
  })
})
