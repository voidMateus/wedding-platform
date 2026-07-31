import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import Accordion from '~/components/ui/Accordion.vue'
import { ICON_STUBS } from '../test-utils/icon-stubs'

const ITEMS = [
  { id: 'a', trigger: 'Pergunta A', content: 'Resposta A' },
  { id: 'b', trigger: 'Pergunta B', content: 'Resposta B' },
]

function mountAccordion() {
  return mount(Accordion, { props: { items: ITEMS }, global: { stubs: ICON_STUBS } })
}

describe('UiAccordion', () => {
  it('renderiza um trigger por item', () => {
    const wrapper = mountAccordion()
    expect(wrapper.text()).toContain('Pergunta A')
    expect(wrapper.text()).toContain('Pergunta B')
  })

  it('itens começam fechados (aria-expanded="false")', () => {
    const wrapper = mountAccordion()
    const triggers = wrapper.findAll('button')
    for (const trigger of triggers) {
      expect(trigger.attributes('aria-expanded')).toBe('false')
    }
  })

  it('clicar no trigger abre o item e mostra a resposta', async () => {
    const wrapper = mountAccordion()
    const firstTrigger = wrapper.findAll('button')[0]
    await firstTrigger?.trigger('click')

    expect(firstTrigger?.attributes('aria-expanded')).toBe('true')
    expect(wrapper.text()).toContain('Resposta A')
  })

  it('abrir um segundo item fecha o primeiro (type="single")', async () => {
    const wrapper = mountAccordion()
    const [firstTrigger, secondTrigger] = wrapper.findAll('button')
    await firstTrigger?.trigger('click')
    await secondTrigger?.trigger('click')

    expect(firstTrigger?.attributes('aria-expanded')).toBe('false')
    expect(secondTrigger?.attributes('aria-expanded')).toBe('true')
  })

  it('clicar de novo no mesmo trigger fecha o item (collapsible)', async () => {
    const wrapper = mountAccordion()
    const firstTrigger = wrapper.findAll('button')[0]
    await firstTrigger?.trigger('click')
    await firstTrigger?.trigger('click')

    expect(firstTrigger?.attributes('aria-expanded')).toBe('false')
  })
})
