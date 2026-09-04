import { describe, expect, it } from 'vitest'
import { createTestApiClient } from '../helpers/http-client'

/**
 * Integração — busca de lugares (/api/places/**).
 *
 * O que estes testes protegem é o portão, não a integração com o Google: o
 * provedor tem cota paga e a chave vive só no servidor, então o risco real
 * aqui é o endpoint virar uma API de geocodificação aberta para qualquer
 * visitante (CLAUDE.md, seção 12). A normalização das respostas do provedor é
 * coberta sem rede em tests/unit/server/places-google.spec.ts.
 *
 * `requireWeddingContext` roda antes de qualquer coisa nos dois handlers —
 * inclusive antes de olhar se existe chave configurada — então estes casos
 * valem igual em ambiente com e sem GOOGLE_MAPS_API_KEY.
 */
describe('api: /api/places', () => {
  it('autocomplete sem sessão nenhuma é rejeitado com 401', async () => {
    const client = createTestApiClient()
    const res = await client.get(
      '/api/places/autocomplete?q=buffet&sessionToken=' + crypto.randomUUID(),
    )
    expect(res.status).toBe(401)
  })

  it('detalhes sem sessão nenhuma são rejeitados com 401', async () => {
    const client = createTestApiClient()
    const res = await client.get('/api/places/ChIJ-qualquer?sessionToken=' + crypto.randomUUID())
    expect(res.status).toBe(401)
  })
})
