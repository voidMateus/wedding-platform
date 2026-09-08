import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import SectionOrderField from '~/components/admin/settings/SectionOrderField.vue'
import Button from '~/components/ui/Button.vue'
import { DEFAULT_SECTION_ORDER } from '#shared/home-sections'
import { ICON_STUBS } from '../test-utils/icon-stubs'

function mountField(modelValue: string[] = [...DEFAULT_SECTION_ORDER]) {
  return mount(SectionOrderField, {
    props: { modelValue },
    global: { components: { UiButton: Button }, stubs: ICON_STUBS },
  })
}

/** Último `update:modelValue` emitido, ou undefined se nada foi emitido. */
function lastEmit(wrapper: ReturnType<typeof mountField>): string[] | undefined {
  const events = wrapper.emitted('update:modelValue')
  return events?.at(-1)?.[0] as string[] | undefined
}

describe('AdminSettingsSectionOrderField', () => {
  it('lista uma linha por seção, na ordem recebida', () => {
    const wrapper = mountField(['versiculo', 'boas-vindas'])
    const items = wrapper.findAll('li')
    expect(items).toHaveLength(2)
    expect(items[0]!.text()).toContain('Versículo')
    expect(items[1]!.text()).toContain('Boas-vindas')
  })

  it('ignora id que não existe mais no catálogo em vez de desenhar uma linha vazia', () => {
    const wrapper = mountField(['boas-vindas', 'secao-extinta'])
    expect(wrapper.findAll('li')).toHaveLength(1)
  })

  it('mover para cima troca o item com o anterior', () => {
    const wrapper = mountField(['boas-vindas', 'versiculo', 'historia'])
    wrapper.get('[aria-label="Mover Versículo para cima"]').trigger('click')
    expect(lastEmit(wrapper)).toEqual(['versiculo', 'boas-vindas', 'historia'])
  })

  it('mover para baixo troca o item com o seguinte', () => {
    const wrapper = mountField(['boas-vindas', 'versiculo', 'historia'])
    wrapper.get('[aria-label="Mover Boas-vindas para baixo"]').trigger('click')
    expect(lastEmit(wrapper)).toEqual(['versiculo', 'boas-vindas', 'historia'])
  })

  it('desabilita "subir" no primeiro e "descer" no último', () => {
    const wrapper = mountField(['boas-vindas', 'versiculo'])
    expect(
      wrapper.get('[aria-label="Mover Boas-vindas para cima"]').attributes('disabled'),
    ).toBeDefined()
    expect(
      wrapper.get('[aria-label="Mover Versículo para baixo"]').attributes('disabled'),
    ).toBeDefined()
  })

  it('reordenar preserva o conjunto exato de seções — nunca perde nem duplica', () => {
    const wrapper = mountField([...DEFAULT_SECTION_ORDER])
    wrapper.get('[aria-label="Mover Perguntas Frequentes para cima"]').trigger('click')
    const next = lastEmit(wrapper)!
    expect(new Set(next)).toEqual(new Set(DEFAULT_SECTION_ORDER))
    expect(next).toHaveLength(DEFAULT_SECTION_ORDER.length)
  })

  it('arrastar uma linha sobre outra move o item para aquela posição', () => {
    const wrapper = mountField(['boas-vindas', 'versiculo', 'historia'])
    const items = wrapper.findAll('li')
    items[2]!.trigger('dragstart', { dataTransfer: { setData: () => {} } })
    items[0]!.trigger('dragover')
    items[0]!.trigger('drop')
    expect(lastEmit(wrapper)).toEqual(['historia', 'boas-vindas', 'versiculo'])
  })

  it('soltar sobre a própria linha não emite mudança', () => {
    const wrapper = mountField(['boas-vindas', 'versiculo'])
    const items = wrapper.findAll('li')
    items[0]!.trigger('dragstart', { dataTransfer: { setData: () => {} } })
    items[0]!.trigger('drop')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('oferece voltar à ordem sugerida só quando a ordem foi alterada', () => {
    const naOrdemPadrao = mountField([...DEFAULT_SECTION_ORDER])
    expect(naOrdemPadrao.text()).not.toContain('Voltar à ordem sugerida')

    const alterada = mountField([...DEFAULT_SECTION_ORDER].reverse())
    expect(alterada.text()).toContain('Voltar à ordem sugerida')
  })

  it('voltar à ordem sugerida devolve o catálogo completo', () => {
    const wrapper = mountField([...DEFAULT_SECTION_ORDER].reverse())
    const botao = wrapper
      .findAll('button')
      .find((b) => b.text().includes('Voltar à ordem sugerida'))!
    botao.trigger('click')
    expect(lastEmit(wrapper)).toEqual(DEFAULT_SECTION_ORDER)
  })
})
