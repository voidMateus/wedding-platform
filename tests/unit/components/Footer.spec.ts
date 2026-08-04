import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import Footer from '~/components/public/Footer.vue'
import SectionDivider from '~/components/ui/SectionDivider.vue'
import { ICON_STUBS } from '../test-utils/icon-stubs'

function mountFooter(props: Record<string, unknown> = {}) {
  return mount(Footer, {
    props,
    global: {
      components: { UiSectionDivider: SectionDivider },
      stubs: ICON_STUBS,
    },
  })
}

describe('PublicFooter', () => {
  it('mostra o nome do casal quando informado', () => {
    const wrapper = mountFooter({ coupleNames: 'Ana & João' })
    expect(wrapper.text()).toContain('Ana & João')
  })

  it('formata e mostra a data do evento quando informada', () => {
    const wrapper = mountFooter({ eventDate: '2027-05-16' })
    expect(wrapper.text()).toContain('16 de maio de 2027')
  })

  it('mostra o crédito da plataforma', () => {
    const wrapper = mountFooter()
    expect(wrapper.text()).toContain('MeuSiteCasamento')
  })
})
