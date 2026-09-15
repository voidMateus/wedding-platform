import type {
  AssentoInput,
  ElementoInput,
  MesaInput,
  MesaPosicaoInput,
  PlantaSalaoInput,
} from '#shared/schemas/mesas'
import type { SeatingResponse } from '~/types/mesa'

/**
 * Mesas e planta do salão. Toda chamada de rede do client passa por aqui,
 * nunca direto em página/componente (CLAUDE.md, seção 4.1).
 */
export function useSeating() {
  /** Tudo numa resposta só: mesas, ocupantes, elementos, quem falta e os agregados. */
  function listSeating() {
    return useFetch<SeatingResponse>('/api/seating', { key: useWeddingScopedKey('seating') })
  }

  async function criarMesa(input: MesaInput) {
    return $fetch<{ id: string }>('/api/seating/tables', { method: 'POST', body: input })
  }

  async function atualizarMesa(id: string, input: MesaInput) {
    return $fetch<{ id: string }>(`/api/seating/tables/${id}`, { method: 'PATCH', body: input })
  }

  /**
   * Só posição e rotação — endpoint estreito porque o arrasto salva muito, e um
   * PATCH gordo levaria junto nome e capacidade lidos quando a tela montou.
   */
  async function moverMesa(id: string, input: MesaPosicaoInput) {
    return $fetch<{ id: string }>(`/api/seating/tables/${id}/position`, {
      method: 'PATCH',
      body: input,
    })
  }

  async function excluirMesa(id: string) {
    return $fetch<{ id: string }>(`/api/seating/tables/${id}`, { method: 'DELETE' })
  }

  /** Sentar e tirar são a mesma mutação: `mesaId: null` é o "tirar". */
  async function sentar(input: AssentoInput) {
    return $fetch<{ atualizados: number }>('/api/seating/assign', { method: 'POST', body: input })
  }

  async function criarElemento(input: ElementoInput) {
    return $fetch<{ id: string }>('/api/seating/elements', { method: 'POST', body: input })
  }

  async function atualizarElemento(id: string, input: ElementoInput) {
    return $fetch<{ id: string }>(`/api/seating/elements/${id}`, { method: 'PATCH', body: input })
  }

  async function excluirElemento(id: string) {
    return $fetch<{ id: string }>(`/api/seating/elements/${id}`, { method: 'DELETE' })
  }

  async function salvarSalao(input: PlantaSalaoInput) {
    return $fetch('/api/seating/floorplan', { method: 'PATCH', body: input })
  }

  /**
   * Baixa o mapa em CSV. Blob, e não navegação direta: a rota exige a sessão do
   * Supabase, e navegar até ela sairia do contexto do app — mesmo caminho da
   * exportação de convidados.
   */
  async function exportarMapa() {
    const blob = await $fetch<Blob>('/api/seating/export', { responseType: 'blob' })
    const url = URL.createObjectURL(blob)
    const ancora = document.createElement('a')
    ancora.href = url
    ancora.download = `mesas-${new Date().toISOString().slice(0, 10)}.csv`
    ancora.click()
    URL.revokeObjectURL(url)
  }

  return {
    listSeating,
    criarMesa,
    atualizarMesa,
    moverMesa,
    excluirMesa,
    sentar,
    criarElemento,
    atualizarElemento,
    excluirElemento,
    salvarSalao,
    exportarMapa,
  }
}
