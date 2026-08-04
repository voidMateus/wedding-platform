import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import DressCodeIllustration from '~/components/public/DressCodeIllustration.vue'

describe('PublicDressCodeIllustration', () => {
  it('é puramente decorativa (aria-hidden, sem texto)', () => {
    const wrapper = mount(DressCodeIllustration)
    expect(wrapper.find('svg').attributes('aria-hidden')).toBe('true')
    expect(wrapper.text()).toBe('')
  })
})
