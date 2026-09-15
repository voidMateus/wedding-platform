import { describe, expect, it } from 'vitest'
import { getServiceRoleClient } from './helpers/supabase-clients'

/**
 * A allowlist de buckets contabilizados não pode envelhecer calada
 * (docs/fase5-multievento.md 8.3).
 *
 * Uma allowlist sozinha tem um defeito espelhado ao de somar tudo: o bucket
 * novo fica DE FORA e ninguém percebe — do mesmo jeito que `wedding-photos`
 * ficou para trás quando a galeria passou a espelhar o Drive, sem nada
 * acusar. Então ela vem com esta varredura: aparecendo um bucket que a lista
 * não conhece, quem o criou decide ali se ele conta, e registra o porquê.
 *
 * Mesmo mecanismo de `auditoria-completa.spec.ts`: a dívida não se paga
 * conferindo a lista hoje, e sim garantindo que ela não possa envelhecer.
 */
describe('storage: buckets contabilizados', () => {
  const admin = getServiceRoleClient()

  /**
   * O bucket morto, e o motivo de estar fora — não um esquecimento.
   * A galeria espelha uma pasta do Google Drive do casal e nunca copia, então
   * somá-lo leria zero para sempre enquanto as fotos, o maior volume de
   * qualquer casamento, não tocam a nossa infraestrutura.
   */
  const FORA_DA_CONTA = ['wedding-photos']

  it('a função conhece exatamente os buckets vivos', async () => {
    const { data: contabilizados, error } = await admin.rpc('buckets_contabilizados')
    expect(error).toBeNull()

    const { data: existentes, error: listError } = await admin.storage.listBuckets()
    expect(listError).toBeNull()

    const naoContabilizados = (existentes ?? [])
      .map((bucket) => bucket.name)
      .filter((nome) => !(contabilizados ?? []).includes(nome))
      .filter((nome) => !FORA_DA_CONTA.includes(nome))
      .sort()

    expect(
      naoContabilizados,
      'bucket novo que a métrica de storage não conhece — decida se ele conta e registre o motivo',
    ).toEqual([])
  })

  it('não contabiliza bucket que não existe mais', async () => {
    const { data: contabilizados } = await admin.rpc('buckets_contabilizados')
    const { data: existentes } = await admin.storage.listBuckets()
    const nomes = (existentes ?? []).map((bucket) => bucket.name)

    for (const bucket of contabilizados ?? []) {
      expect(nomes, `a métrica soma "${bucket}", que não existe no Storage`).toContain(bucket)
    }
  })

  it('a soma por casamento devolve bytes, nunca megabytes', async () => {
    const { data, error } = await admin.rpc('uso_de_storage_por_casamento')
    expect(error).toBeNull()

    for (const linha of (data ?? []) as { casamento_id: string; bytes: number }[]) {
      expect(Number.isInteger(Number(linha.bytes))).toBe(true)
      // O agrupamento é pelo primeiro segmento do caminho, que é o
      // casamento_id — objeto fora desse padrão é descartado, nunca somado no
      // grupo errado.
      expect(linha.casamento_id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      )
    }
  })
})
