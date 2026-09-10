import { describe, expect, it } from 'vitest'
import { INVITE_STAGE_VALUES, inviteStagePresentation } from '~/utils/status-presentation'
import { inviteStageFromView, inviteStageToView } from '../../../../server/utils/invite-stage'
import type { InviteStage } from '~/types/invite'

/**
 * O funil de estágios do convite. O que estes testes guardam não é o texto —
 * é a razão de o funil existir: cada estágio tem uma providência diferente, e
 * era exatamente isso que a palavra "Pendente" apagava ao cobrir quatro
 * situações (não enviado, enviado sem resposta, aberto sem resposta, parte
 * respondeu).
 */
describe('inviteStagePresentation', () => {
  it('dá rótulo próprio a cada um dos cinco estágios — nenhum texto repetido', () => {
    const rotulos = INVITE_STAGE_VALUES.map((stage) => inviteStagePresentation(stage).label)
    expect(new Set(rotulos).size).toBe(INVITE_STAGE_VALUES.length)
    expect(rotulos).toEqual(['Não enviado', 'Enviado', 'Aberto', 'Parcial', 'Respondido'])
  })

  it('só pede providência onde existe uma a tomar', () => {
    // A regra de tom da plataforma: warning é "pendente COM ação esperada".
    // "Enviado" é neutral porque a bola está com o convidado — nada a fazer
    // ainda; "Aberto" é warning porque chegou, a pessoa olhou e não respondeu.
    expect(inviteStagePresentation('not_sent')).toMatchObject({ tone: 'warning' })
    expect(inviteStagePresentation('sent')).toMatchObject({ tone: 'neutral', action: null })
    expect(inviteStagePresentation('opened')).toMatchObject({ tone: 'warning' })
    expect(inviteStagePresentation('partial')).toMatchObject({ tone: 'warning' })
    expect(inviteStagePresentation('responded')).toMatchObject({ tone: 'success', action: null })
  })

  it('tem ação em todo estágio que pede providência, e só neles', () => {
    for (const stage of INVITE_STAGE_VALUES) {
      const { tone, action } = inviteStagePresentation(stage)
      expect(Boolean(action)).toBe(tone === 'warning')
    }
  })

  it('nunca chama o convidado de devedor: "lembrete", nunca "cobrar"', () => {
    const acoes = INVITE_STAGE_VALUES.map((stage) => inviteStagePresentation(stage).action ?? '')
    expect(acoes.join(' ').toLowerCase()).not.toContain('cobrar')
  })

  it('lista os estágios na ordem do processo, não em ordem alfabética', () => {
    // A lista de opções do filtro é o próprio caminho que um convite percorre.
    expect(INVITE_STAGE_VALUES).toEqual(['not_sent', 'sent', 'opened', 'partial', 'responded'])
  })
})

describe('tradução do estágio entre banco e DTO', () => {
  it('vai e volta sem perder nenhum dos cinco', () => {
    for (const stage of INVITE_STAGE_VALUES) {
      expect(inviteStageFromView(inviteStageToView(stage))).toBe(stage)
    }
  })

  it('cobre exatamente o vocabulário da view', () => {
    const doBanco = ['nao_enviado', 'enviado', 'aberto', 'parcial', 'respondido']
    expect(INVITE_STAGE_VALUES.map(inviteStageToView)).toEqual(doBanco)
  })

  it('cai no primeiro estágio para valor ausente ou desconhecido', () => {
    // `nao_enviado` é o piso: nenhum fato é exigido para estar nele, então é o
    // único default honesto — inventar "respondido" por causa de um valor novo
    // esconderia trabalho a fazer.
    const esperado: InviteStage = 'not_sent'
    expect(inviteStageFromView(null)).toBe(esperado)
    expect(inviteStageFromView(undefined)).toBe(esperado)
    expect(inviteStageFromView('estagio_do_futuro')).toBe(esperado)
  })
})
