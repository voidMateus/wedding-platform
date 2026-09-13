import { describe, expect, it } from 'vitest'
import {
  LEMBRETES_PADRAO,
  configLembretesSchema,
  lembretesDoCasamento,
} from '#shared/schemas/lembretes'

describe('configLembretesSchema', () => {
  it('ordena as marcas da mais distante para a mais próxima', () => {
    const parsed = configLembretesSchema.parse({
      rsvp: { ativo: true, diasAntes: [3, 14] },
      pagamentos: { ativo: false, diasAntes: [1, 7] },
    })

    expect(parsed.rsvp.diasAntes).toEqual([14, 3])
    expect(parsed.pagamentos.diasAntes).toEqual([7, 1])
  })

  it('descarta marca repetida', () => {
    const parsed = configLembretesSchema.parse({
      rsvp: { ativo: true, diasAntes: [7, 7, 3] },
      pagamentos: { ativo: false, diasAntes: [] },
    })

    expect(parsed.rsvp.diasAntes).toEqual([7, 3])
  })

  it('recusa mais de três marcas — cada marca é um e-mail a mais na caixa de alguém', () => {
    const resultado = configLembretesSchema.safeParse({
      rsvp: { ativo: true, diasAntes: [30, 14, 7, 3] },
      pagamentos: { ativo: false, diasAntes: [] },
    })

    expect(resultado.success).toBe(false)
  })

  it('recusa antecedência negativa e acima do teto', () => {
    for (const dias of [-1, 200]) {
      const resultado = configLembretesSchema.safeParse({
        rsvp: { ativo: true, diasAntes: [dias] },
        pagamentos: { ativo: false, diasAntes: [] },
      })
      expect(resultado.success).toBe(false)
    }
  })
})

describe('lembretesDoCasamento', () => {
  it('jsonb vazio cai no padrão, que é DESLIGADO', () => {
    expect(lembretesDoCasamento({})).toEqual(LEMBRETES_PADRAO)
    expect(LEMBRETES_PADRAO.rsvp.ativo).toBe(false)
    expect(LEMBRETES_PADRAO.pagamentos.ativo).toBe(false)
  })

  it('nulo cai no padrão', () => {
    expect(lembretesDoCasamento(null)).toEqual(LEMBRETES_PADRAO)
  })

  it('preenche só a chave que falta', () => {
    const config = lembretesDoCasamento({ rsvp: { ativo: true, diasAntes: [7] } })

    expect(config.rsvp).toEqual({ ativo: true, diasAntes: [7] })
    expect(config.pagamentos).toEqual(LEMBRETES_PADRAO.pagamentos)
  })

  it('jsonb malformado cai no padrão em vez de derrubar o cron', () => {
    // Na dúvida, o sistema não manda nada — é a degradação certa para a única
    // peça que age sozinha.
    expect(lembretesDoCasamento({ rsvp: 'sim' })).toEqual(LEMBRETES_PADRAO)
    expect(lembretesDoCasamento('qualquer coisa')).toEqual(LEMBRETES_PADRAO)
  })
})
