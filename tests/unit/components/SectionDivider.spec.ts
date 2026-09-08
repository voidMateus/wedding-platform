import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import SectionDivider from '~/components/ui/SectionDivider.vue'

describe('UiSectionDivider', () => {
  it('é puramente decorativo (aria-hidden)', () => {
    const wrapper = mount(SectionDivider)
    expect(wrapper.attributes('aria-hidden')).toBe('true')
  })

  it('é um filete único, não um ornamento composto', () => {
    // O protótipo do convite não tem ornamento composto em lugar nenhum: a
    // página respira por espaço em branco e um traço curto. O losango entre
    // pontos, repetido dez vezes ao descer a home, virava insistente.
    const wrapper = mount(SectionDivider)
    expect(wrapper.element.tagName).toBe('SPAN')
    expect(wrapper.findAll('span')).toHaveLength(1)
    expect(wrapper.classes()).toContain('h-px')
  })

  it('é tingido pela cor de ornamento', () => {
    expect(mount(SectionDivider).classes().join(' ')).toContain('bg-ornament')
  })
})
