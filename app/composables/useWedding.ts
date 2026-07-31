import type { WeddingSettingsInput } from '#shared/schemas/wedding'
import type { ThemeConfigInput } from '#shared/schemas/theme'
import type { Wedding } from '~/types/wedding'

/**
 * Configuração do evento (CLAUDE.md, seção 19.2 — "Configurações"). Toda
 * chamada de rede do client passa por aqui (CLAUDE.md, seção 5.1).
 */
export function useWedding() {
  function getWedding() {
    return useFetch<Wedding>('/api/wedding', { key: 'wedding' })
  }

  async function updateWedding(input: WeddingSettingsInput): Promise<Wedding> {
    return $fetch<Wedding>('/api/wedding', { method: 'PATCH', body: input })
  }

  // Aparência (cor/fonte/countdown) — endpoint próprio, separado dos dados
  // de negócio do evento (CLAUDE.md, seção 22.3).
  async function updateWeddingTheme(input: ThemeConfigInput): Promise<Wedding> {
    return $fetch<Wedding>('/api/wedding/theme', { method: 'PATCH', body: input })
  }

  return { getWedding, updateWedding, updateWeddingTheme }
}
