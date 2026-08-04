import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import TreatedImage from '~/components/ui/TreatedImage.vue'

const NuxtImgStub = {
  name: 'NuxtImgStub',
  template: '<img :src="src" :alt="alt" />',
  props: ['src', 'alt', 'sizes', 'preload', 'loading', 'placeholder'],
}

function mountImage(props: Record<string, unknown>) {
  return mount(TreatedImage, {
    props,
    global: { stubs: { NuxtImg: NuxtImgStub } },
  })
}

describe('UiTreatedImage', () => {
  it('repassa src/alt para o NuxtImg', () => {
    const wrapper = mountImage({ src: '/foto.jpg', alt: 'Foto do casal' })
    const img = wrapper.find('img')
    expect(img.attributes('src')).toBe('/foto.jpg')
    expect(img.attributes('alt')).toBe('Foto do casal')
  })

  it('aplica um style inline (aspect-ratio) quando ratio é passado', () => {
    const wrapper = mountImage({ src: '/foto.jpg', alt: 'Foto', ratio: '4/5' })
    expect(wrapper.attributes('style')).toBeTruthy()
  })

  it('não aplica style inline quando ratio é omitido', () => {
    const wrapper = mountImage({ src: '/foto.jpg', alt: 'Foto' })
    expect(wrapper.attributes('style')).toBeUndefined()
  })

  it('aplica rounded-lg por padrão, e remove com fullBleed', () => {
    const wrapper = mountImage({ src: '/foto.jpg', alt: 'Foto' })
    expect(wrapper.classes()).toContain('rounded-lg')

    const fullBleed = mountImage({ src: '/foto.jpg', alt: 'Foto', fullBleed: true })
    expect(fullBleed.classes()).not.toContain('rounded-lg')
  })

  it('não renderiza overlay por padrão', () => {
    const wrapper = mountImage({ src: '/foto.jpg', alt: 'Foto' })
    expect(wrapper.find('[aria-hidden="true"]').exists()).toBe(false)
  })

  it('renderiza o gradiente de overlay="bottom"', () => {
    const wrapper = mountImage({ src: '/foto.jpg', alt: 'Foto', overlay: 'bottom' })
    const overlay = wrapper.find('[aria-hidden="true"]')
    expect(overlay.exists()).toBe(true)
    expect(overlay.classes()).toContain('bg-gradient-to-t')
  })

  it('renderiza a camada de overlay="full"', () => {
    const wrapper = mountImage({ src: '/foto.jpg', alt: 'Foto', overlay: 'full' })
    expect(wrapper.find('[aria-hidden="true"]').classes()).toContain('bg-black/40')
  })

  it('repassa objectPosition como object-position inline no NuxtImg', () => {
    const wrapper = mountImage({ src: '/foto.jpg', alt: 'Foto', objectPosition: '30% 70%' })
    expect(wrapper.find('img').attributes('style')).toContain('object-position: 30% 70%')
  })

  it('usa loading="lazy" por padrão, sem preload', () => {
    const wrapper = mountImage({ src: '/foto.jpg', alt: 'Foto' })
    expect(wrapper.findComponent(NuxtImgStub).props('loading')).toBe('lazy')
    expect(wrapper.findComponent(NuxtImgStub).props('preload')).toBeFalsy()
  })

  it('usa preload e sem loading="lazy" quando priority=true', () => {
    const wrapper = mountImage({ src: '/foto.jpg', alt: 'Foto', priority: true })
    expect(wrapper.findComponent(NuxtImgStub).props('preload')).toBe(true)
    expect(wrapper.findComponent(NuxtImgStub).props('loading')).toBeUndefined()
  })
})
