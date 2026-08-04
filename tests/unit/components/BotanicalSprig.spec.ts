import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import BotanicalSprig from '~/components/ui/BotanicalSprig.vue'

describe('UiBotanicalSprig', () => {
  it('é decorativo (aria-hidden)', () => {
    const wrapper = mount(BotanicalSprig)
    expect(wrapper.attributes('aria-hidden')).toBe('true')
  })

  it('não espelha por padrão', () => {
    const wrapper = mount(BotanicalSprig)
    expect(wrapper.classes()).not.toContain('-scale-x-100')
  })

  it('espelha horizontalmente quando flip=true', () => {
    const wrapper = mount(BotanicalSprig, { props: { flip: true } })
    expect(wrapper.classes()).toContain('-scale-x-100')
  })
})
