import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import Monogram from '~/components/public/Monogram.vue'

function mountMonogram(props: Record<string, unknown> = {}) {
  return mount(Monogram, { props })
}

describe('PublicMonogram', () => {
  it('deriva as iniciais do padrão "Nome1 & Nome2"', () => {
    const wrapper = mountMonogram({ coupleNames: 'Mateus Augusto & Raquel Júlia' })
    expect(wrapper.get('[data-test="monogram-initials"]').text()).toContain('M')
    expect(wrapper.get('[data-test="monogram-initials"]').text()).toContain('R')
  })

  it('coloca as iniciais em maiúscula mesmo com o nome em caixa baixa', () => {
    const wrapper = mountMonogram({ coupleNames: 'ana & joão' })
    const text = wrapper.get('[data-test="monogram-initials"]').text()
    expect(text).toContain('A')
    expect(text).toContain('J')
  })

  // `html()` traz também os comentários do template, então a ausência é
  // verificada pelos dois elementos que o componente pode desenhar.
  function rendersNothing(wrapper: ReturnType<typeof mountMonogram>) {
    return (
      !wrapper.find('img').exists() && !wrapper.find('[data-test="monogram-initials"]').exists()
    )
  }

  it('não renderiza nada sem nome de casal', () => {
    expect(rendersNothing(mountMonogram())).toBe(true)
  })

  it('não inventa iniciais para um nome fora do padrão "Nome1 & Nome2"', () => {
    // Um nome só, ou três, não rende um par confiável — e carimbar a letra
    // errada no site inteiro é pior que não desenhar monograma nenhum.
    expect(rendersNothing(mountMonogram({ coupleNames: 'Ana' }))).toBe(true)
    expect(rendersNothing(mountMonogram({ coupleNames: 'Ana & João & Maria' }))).toBe(true)
  })

  it('usa a arte enviada pelo casal no lugar das iniciais', () => {
    const wrapper = mountMonogram({
      coupleNames: 'Ana & João',
      imageUrl: 'https://exemplo.test/monograma.png',
    })
    expect(wrapper.find('img').attributes('src')).toBe('https://exemplo.test/monograma.png')
    expect(wrapper.find('[data-test="monogram-initials"]').exists()).toBe(false)
  })

  it('é sempre decorativo — nunca anunciado por leitor de tela', () => {
    // O nome do casal já está escrito ao lado em toda posição onde o
    // monograma aparece; lê-lo de novo como "M coração R" seria ruído.
    const comArte = mountMonogram({ coupleNames: 'Ana & João', imageUrl: '/m.png' })
    expect(comArte.get('img').attributes('aria-hidden')).toBe('true')
    expect(comArte.get('img').attributes('alt')).toBe('')

    const comIniciais = mountMonogram({ coupleNames: 'Ana & João' })
    expect(comIniciais.get('[data-test="monogram-initials"]').attributes('aria-hidden')).toBe(
      'true',
    )
  })
})
