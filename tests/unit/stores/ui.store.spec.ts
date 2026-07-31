import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useUiStore } from '~/stores/ui.store'

describe('useUiStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('começa sem toasts', () => {
    const store = useUiStore()
    expect(store.toasts).toEqual([])
  })

  it('pushToast adiciona um toast com id único', () => {
    const store = useUiStore()
    const id = store.pushToast('success', 'Salvo com sucesso.')

    expect(store.toasts).toHaveLength(1)
    expect(store.toasts[0]).toEqual({ id, tone: 'success', message: 'Salvo com sucesso.' })
  })

  it('múltiplos toasts empilham na ordem de chegada', () => {
    const store = useUiStore()
    store.pushToast('info', 'Primeiro')
    store.pushToast('error', 'Segundo')

    expect(store.toasts.map((t) => t.message)).toEqual(['Primeiro', 'Segundo'])
  })

  it('dismissToast remove só o toast indicado', () => {
    const store = useUiStore()
    const firstId = store.pushToast('info', 'Primeiro')
    const secondId = store.pushToast('error', 'Segundo')

    store.dismissToast(firstId)

    expect(store.toasts).toHaveLength(1)
    expect(store.toasts[0]?.id).toBe(secondId)
  })

  it('setThemeConfig atualiza themeConfig', () => {
    const store = useUiStore()
    store.setThemeConfig({ primaryColor: '#6e2439' })

    expect(store.themeConfig).toEqual({ primaryColor: '#6e2439' })
  })
})
