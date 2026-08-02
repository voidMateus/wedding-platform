import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import SaveTheDateCard from '~/components/public/SaveTheDateCard.vue'
import { ICON_STUBS } from '../test-utils/icon-stubs'

function mountCard(eventDate: string) {
  return mount(SaveTheDateCard, {
    props: { eventDate },
    global: { stubs: ICON_STUBS },
  })
}

describe('PublicSaveTheDateCard', () => {
  it('formata a data no padrão dia/mês por extenso/ano', () => {
    const wrapper = mountCard('2027-05-16')
    expect(wrapper.text()).toContain('16 de maio de 2027')
  })

  it('mostra o rótulo "Save the date"', () => {
    const wrapper = mountCard('2027-05-16')
    expect(wrapper.text()).toContain('Save the date')
  })
})
