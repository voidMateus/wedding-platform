import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { createResendProvider } from '../../../server/utils/email-resend'

const SEGREDO = `whsec_${Buffer.from('segredo-do-webhook').toString('base64')}`

function provedor(webhookSecret: string | null = SEGREDO) {
  return createResendProvider({
    apiKey: 'chave',
    remetente: 'convites@exemplo.com.br',
    webhookSecret,
  })
}

function assinar(corpo: string, id = 'msg_1', timestamp = Math.floor(Date.now() / 1000)) {
  const chave = Buffer.from(SEGREDO.replace(/^whsec_/, ''), 'base64')
  const assinatura = createHmac('sha256', chave)
    .update(`${id}.${timestamp}.${corpo}`)
    .digest('base64')

  return {
    cabecalhos: {
      'svix-id': id,
      'svix-timestamp': String(timestamp),
      'svix-signature': `v1,${assinatura}`,
    },
  }
}

describe('verificarAssinatura', () => {
  const corpo = JSON.stringify({ type: 'email.delivered', data: { email_id: 'abc' } })

  it('aceita a assinatura correta', () => {
    const { cabecalhos } = assinar(corpo)
    expect(provedor().verificarAssinatura(corpo, cabecalhos)).toBe(true)
  })

  it('recusa quando o corpo mudou depois de assinado', () => {
    const { cabecalhos } = assinar(corpo)
    expect(provedor().verificarAssinatura(`${corpo} `, cabecalhos)).toBe(false)
  })

  it('recusa assinatura de outro segredo', () => {
    const { cabecalhos } = assinar(corpo)
    const outro = createResendProvider({
      apiKey: 'chave',
      remetente: 'convites@exemplo.com.br',
      webhookSecret: `whsec_${Buffer.from('outro-segredo').toString('base64')}`,
    })
    expect(outro.verificarAssinatura(corpo, cabecalhos)).toBe(false)
  })

  it('recusa requisição antiga — é o que impede o replay', () => {
    const dezMinutosAtras = Math.floor(Date.now() / 1000) - 600
    const { cabecalhos } = assinar(corpo, 'msg_1', dezMinutosAtras)
    expect(provedor().verificarAssinatura(corpo, cabecalhos)).toBe(false)
  })

  it('recusa quando falta cabeçalho', () => {
    const { cabecalhos } = assinar(corpo)
    const semId = { ...cabecalhos, 'svix-id': '' }
    expect(provedor().verificarAssinatura(corpo, semId)).toBe(false)
  })

  it('aceita quando uma entre várias assinaturas bate — rotação de segredo', () => {
    const { cabecalhos } = assinar(corpo)
    const comLixo = {
      ...cabecalhos,
      'svix-signature': `v1,assinaturaVelha ${cabecalhos['svix-signature']}`,
    }
    expect(provedor().verificarAssinatura(corpo, comLixo)).toBe(true)
  })

  it('SEM SEGREDO CONFIGURADO, recusa — nunca "aceita porque não dá para verificar"', () => {
    const { cabecalhos } = assinar(corpo)
    expect(provedor(null).verificarAssinatura(corpo, cabecalhos)).toBe(false)
  })
})

describe('interpretarEvento', () => {
  it('traduz o vocabulário do provedor para o nosso', () => {
    expect(
      provedor().interpretarEvento({
        type: 'email.bounced',
        created_at: '2026-09-13T12:00:00Z',
        data: { email_id: 'abc' },
      }),
    ).toMatchObject({ idNoProvedor: 'abc', tipoEvento: 'devolvido' })
  })

  it.each([
    ['email.delivered', 'entregue'],
    ['email.complained', 'reclamado'],
    ['email.delivery_delayed', 'adiado'],
  ])('%s vira %s', (tipoResend, nosso) => {
    expect(
      provedor().interpretarEvento({ type: tipoResend, data: { email_id: 'abc' } }),
    ).toMatchObject({ tipoEvento: nosso })
  })

  it('ignora o evento de envio — o envio já é a linha de comunicacoes', () => {
    expect(
      provedor().interpretarEvento({ type: 'email.sent', data: { email_id: 'abc' } }),
    ).toBeNull()
  })

  it('ignora abertura e clique — o produto recusou o pixel de rastreamento', () => {
    expect(
      provedor().interpretarEvento({ type: 'email.opened', data: { email_id: 'abc' } }),
    ).toBeNull()
    expect(
      provedor().interpretarEvento({ type: 'email.clicked', data: { email_id: 'abc' } }),
    ).toBeNull()
  })

  it('ignora corpo sem id de mensagem', () => {
    expect(provedor().interpretarEvento({ type: 'email.bounced', data: {} })).toBeNull()
    expect(provedor().interpretarEvento(null)).toBeNull()
  })
})
