import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import ImageFocalPointPicker from '~/components/admin/ImageFocalPointPicker.vue'

function mountPicker(modelValue = { x: 50, y: 50 }) {
  return mount(ImageFocalPointPicker, {
    props: { src: 'https://example.com/photo.jpg', alt: 'Foto', modelValue },
  })
}

function mockRect(el: Element) {
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    width: 200,
    height: 100,
    right: 200,
    bottom: 100,
    toJSON: () => {},
  })
}

describe('AdminImageFocalPointPicker', () => {
  it('renderiza a área de seleção com a foto inteira (sem cortar)', () => {
    const wrapper = mountPicker()
    const img = wrapper.find('img')
    expect(img.classes()).not.toContain('object-cover')
  })

  it('posiciona o marcador de acordo com modelValue', () => {
    const wrapper = mountPicker({ x: 30, y: 70 })
    const marker = wrapper.find('span[aria-hidden="true"]')
    expect(marker.attributes('style')).toContain('left: 30%')
    expect(marker.attributes('style')).toContain('top: 70%')
  })

  it('clique na área de seleção emite update:modelValue com as coordenadas percentuais', async () => {
    const wrapper = mountPicker()
    const img = wrapper.find('img').element
    mockRect(img)

    const container = wrapper.find('[role="group"]')
    await container.trigger('pointerdown', { clientX: 100, clientY: 25, pointerId: 1 })

    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted).toBeTruthy()
    expect(emitted![0]![0]).toEqual({ x: 50, y: 25 })
  })

  it('setas do teclado ajustam o foco em passos de 5%, sem passar de 0-100', async () => {
    const wrapper = mountPicker({ x: 98, y: 2 })
    const container = wrapper.find('[role="group"]')

    await container.trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.emitted('update:modelValue')![0]![0]).toEqual({ x: 100, y: 2 })

    await container.trigger('keydown', { key: 'ArrowUp' })
    expect(wrapper.emitted('update:modelValue')![1]![0]).toEqual({ x: 98, y: 0 })
  })

  it('ignora teclas que não são setas', async () => {
    const wrapper = mountPicker()
    const container = wrapper.find('[role="group"]')
    await container.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('update:modelValue')).toBeFalsy()
  })

  it('mostra a prévia do corte com object-position aplicado', () => {
    const wrapper = mountPicker({ x: 25, y: 75 })
    const images = wrapper.findAll('img')
    const previewImg = images[1]
    expect(previewImg?.attributes('style')).toContain('object-position: 25% 75%')
  })
})
