import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import TopicGrid from '~/components/public/TopicGrid.vue'
import { ICON_STUBS } from '../test-utils/icon-stubs'

const TOPICS = [
  { icon: 'lucide:bed', title: 'Hospedagem', description: 'Descrição A' },
  { icon: 'lucide:car', title: 'Transporte', description: 'Descrição B' },
]

describe('PublicTopicGrid', () => {
  it('renderiza um item por tópico, com título e descrição', () => {
    const wrapper = mount(TopicGrid, {
      props: { topics: TOPICS },
      global: { stubs: ICON_STUBS },
    })
    expect(wrapper.text()).toContain('Hospedagem')
    expect(wrapper.text()).toContain('Descrição A')
    expect(wrapper.text()).toContain('Transporte')
    expect(wrapper.text()).toContain('Descrição B')
  })

  it('renderiza uma quantidade de cards igual à quantidade de tópicos', () => {
    const wrapper = mount(TopicGrid, {
      props: { topics: TOPICS },
      global: { stubs: ICON_STUBS },
    })
    expect(wrapper.findAll('.rounded-xl.border')).toHaveLength(2)
  })
})
