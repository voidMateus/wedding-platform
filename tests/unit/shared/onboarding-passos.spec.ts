import { describe, expect, it } from 'vitest'
import {
  GRUPOS_DO_ROTEIRO,
  PASSOS_DO_ONBOARDING,
  PASSOS_DO_WIZARD,
  resolverPassosDoOnboarding,
} from '#shared/onboarding-passos'
import { FATOS_SIMPLES } from '#shared/fatos-do-casamento'
import type { FatoObservado } from '#shared/fatos-do-casamento'

const TODOS_OS_FATOS = PASSOS_DO_ONBOARDING.map((passo) => passo.fato) as FatoObservado[]

describe('catálogo do roteiro', () => {
  it('só cita fatos que o observador conhece', () => {
    // A quebra seria muda: um fato inventado nunca casaria, e o passo ficaria
    // pendente para sempre sem nada acusar.
    for (const passo of PASSOS_DO_ONBOARDING) {
      expect(FATOS_SIMPLES).toContain(passo.fato)
    }
  })

  it('não repete passo nem fato', () => {
    const ids = PASSOS_DO_ONBOARDING.map((passo) => passo.id)
    const fatos = PASSOS_DO_ONBOARDING.map((passo) => passo.fato)
    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(fatos).size).toBe(fatos.length)
  })

  it('usa só grupos do catálogo, e todo passo fora do wizard tem destino', () => {
    const grupos = GRUPOS_DO_ROTEIRO.map((grupo) => grupo.id)
    for (const passo of PASSOS_DO_ONBOARDING) {
      expect(grupos).toContain(passo.grupo)
      if (!passo.noWizard) expect(passo.destino).toBeTruthy()
    }
  })

  it('o wizard é um FILTRO do roteiro, na mesma ordem', () => {
    // É esta a garantia de que roteiro e wizard nunca divergem de ordem: uma
    // segunda lista foi como o catálogo de atalhos do Hero ficou com 8 entradas
    // para 11 seções sem nada acusar a falta.
    const doRoteiro = PASSOS_DO_ONBOARDING.filter((passo) => passo.noWizard).map((p) => p.id)
    expect(PASSOS_DO_WIZARD.map((p) => p.id)).toEqual(doRoteiro)
  })
})

describe('resolverPassosDoOnboarding', () => {
  it('sem fato nenhum, nada está concluído e a primeira etapa é a próxima', () => {
    const roteiro = resolverPassosDoOnboarding([])

    expect(roteiro.concluidos).toBe(0)
    expect(roteiro.total).toBe(PASSOS_DO_ONBOARDING.length)
    expect(roteiro.completo).toBe(false)
    expect(roteiro.proximaEtapaDoWizard?.id).toBe(PASSOS_DO_WIZARD[0]!.id)
    expect(roteiro.passos.every((passo) => !passo.pulado)).toBe(true)
  })

  it('com todos os fatos, o roteiro está completo e não há próxima etapa', () => {
    const roteiro = resolverPassosDoOnboarding(TODOS_OS_FATOS)

    expect(roteiro.completo).toBe(true)
    expect(roteiro.concluidos).toBe(roteiro.total)
    expect(roteiro.proximaEtapaDoWizard).toBeNull()
  })

  it('ignora fato que não pertence a nenhum passo', () => {
    const roteiro = resolverPassosDoOnboarding(['tem_mesa', 'contratado:Buffet'])

    expect(roteiro.concluidos).toBe(0)
  })

  it('marca como PULADO o passo vazio que tem um posterior cumprido', () => {
    // O casal respondeu horário e aparência, e passou batido por local, prazo e
    // orçamento: os três só podem ter sido pulados. Nada disso está no banco —
    // é derivado da posição.
    const roteiro = resolverPassosDoOnboarding(['horario_definido', 'identidade_visual_definida'])
    const porId = Object.fromEntries(roteiro.passos.map((passo) => [passo.id, passo]))

    expect(porId.local!.pulado).toBe(true)
    expect(porId['prazo-rsvp']!.pulado).toBe(true)
    expect(porId.orcamento!.pulado).toBe(true)
  })

  it('não marca como pulado o passo onde o casal simplesmente parou', () => {
    // Nada depois dele foi respondido: é o ponto onde a pessoa parou, não uma
    // etapa que ela decidiu deixar para trás — e por isso não ganha aviso.
    const roteiro = resolverPassosDoOnboarding(['horario_definido', 'local_definido'])
    const porId = Object.fromEntries(roteiro.passos.map((passo) => [passo.id, passo]))

    expect(porId['prazo-rsvp']!.pulado).toBe(false)
    expect(porId.publicar!.pulado).toBe(false)
    expect(roteiro.proximaEtapaDoWizard?.id).toBe('prazo-rsvp')
  })

  it('passo cumprido nunca é pulado', () => {
    const roteiro = resolverPassosDoOnboarding(TODOS_OS_FATOS)

    expect(roteiro.passos.some((passo) => passo.pulado)).toBe(false)
  })

  it('a próxima etapa ignora os passos que não são do wizard', () => {
    // Montar a lista e publicar não são etapas: o casal que só tem convidados
    // cadastrados continua sendo levado à primeira PERGUNTA em aberto.
    const roteiro = resolverPassosDoOnboarding(['tem_convidado'])

    expect(roteiro.proximaEtapaDoWizard?.id).toBe('data-horario')
  })

  it('um passo volta a aparecer quando o fato deixa de valer', () => {
    // Mesma regra da sugestão que não se esgota: a conta é determinística e não
    // guarda estado, então "voltar" não é caso especial — é a ausência de um.
    const completo = resolverPassosDoOnboarding(TODOS_OS_FATOS)
    expect(completo.completo).toBe(true)

    const semLocal = resolverPassosDoOnboarding(
      TODOS_OS_FATOS.filter((fato) => fato !== 'local_definido'),
    )

    expect(semLocal.completo).toBe(false)
    expect(semLocal.passos.find((passo) => passo.id === 'local')!.concluido).toBe(false)
  })
})

describe('o próximo passo que o acolhimento nomeia', () => {
  it('é o primeiro em aberto, mesmo quando não é etapa do wizard', () => {
    // Cinco perguntas respondidas, lista ainda vazia: "Começar" precisa apontar
    // para a lista de convidados — e não sumir por não haver mais etapa.
    const roteiro = resolverPassosDoOnboarding([
      'horario_definido',
      'local_definido',
      'prazo_rsvp_definido',
      'orcamento_definido',
      'identidade_visual_definida',
    ])

    expect(roteiro.proximaEtapaDoWizard).toBeNull()
    expect(roteiro.proximoPasso?.id).toBe('convidados')
  })

  it('some junto com o roteiro quando tudo está cumprido', () => {
    expect(resolverPassosDoOnboarding(TODOS_OS_FATOS).proximoPasso).toBeNull()
  })

  it('todo passo tem a frase do botão, e ela nunca repete o rótulo cru', () => {
    // "Começar por Data e horário" é leitura de formulário, não convite — a
    // chamada existe justamente para a frase sobreviver.
    for (const passo of PASSOS_DO_ONBOARDING) {
      expect(passo.chamada.trim().length).toBeGreaterThan(0)
      expect(passo.chamada).not.toBe(passo.rotulo)
    }
  })
})
