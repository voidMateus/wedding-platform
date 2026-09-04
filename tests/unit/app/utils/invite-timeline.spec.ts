import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  INVITE_EVENT_PRESENTATION,
  describeInviteEvent,
} from '../../../../app/utils/invite-timeline'
import type { InviteEvent, InviteMember } from '../../../../app/types/invite'

const RAIZ = join(__dirname, '../../../..')

function evento(parcial: Partial<InviteEvent> & Pick<InviteEvent, 'tipo_evento'>): InviteEvent {
  return {
    id: 'evt-1',
    casamento_id: 'cas-1',
    convite_id: 'conv-1',
    metadados: {},
    ocorrido_em: '2026-09-04T07:56:00.000Z',
    ...parcial,
  } as InviteEvent
}

const MEMBROS: InviteMember[] = [
  {
    id: 'guest-1',
    fullName: 'Ana Souza',
    nickname: null,
    partyOrder: 0,
    isResponsible: true,
    rsvpStatus: 'confirmado',
  },
]

/**
 * Varre os pontos de escrita reais de `historico_convite.tipo_evento` (TypeScript
 * do servidor e funções SQL) e devolve cada literal encontrado.
 *
 * Este é o teste que faltava: a primeira versão da Linha do Tempo mapeava
 * `invite.token_sent`/`invite.token_revoked`, chaves que nunca existiram no
 * banco — o casal via `token.sent` cru na tela e nada quebrou.
 */
function tiposDeEventoGravados(): Set<string> {
  const tipos = new Set<string>()
  const arquivos: string[] = []

  function varrer(diretorio: string, extensoes: string[]) {
    for (const item of readdirSync(join(RAIZ, diretorio), { withFileTypes: true })) {
      const caminho = `${diretorio}/${item.name}`
      if (item.isDirectory()) varrer(caminho, extensoes)
      else if (extensoes.some((ext) => item.name.endsWith(ext))) arquivos.push(caminho)
    }
  }
  varrer('server', ['.ts'])
  varrer('supabase/migrations', ['.sql'])

  // Literal pontuado ('invite.created'), que é a forma de todo tipo_evento —
  // pegar só isso evita confundir com chaves de jsonb ('guestId') ao redor.
  const LITERAL_PONTUADO = /'([a-z_]+\.[a-z_]+)'/g

  for (const arquivo of arquivos) {
    const conteudo = readFileSync(join(RAIZ, arquivo), 'utf8')
    // TS: tudo que estiver na expressão de `tipo_evento:` — inclusive os dois
    // lados de um ternário, como em invites/[id]/archive.post.ts.
    for (const [, expressao] of conteudo.matchAll(/tipo_evento:\s*(.+)/g)) {
      for (const [, tipo] of expressao.matchAll(LITERAL_PONTUADO)) tipos.add(tipo)
    }
    // SQL: os literais do `values (...)` de um insert em historico_convite.
    for (const [, bloco] of conteudo.matchAll(
      /insert into historico_convite[^;]*?values\s*\(([^;]*?)\)\s*;/gis,
    )) {
      for (const [, tipo] of bloco.matchAll(LITERAL_PONTUADO)) tipos.add(tipo)
    }
  }
  return tipos
}

describe('describeInviteEvent', () => {
  it('não deixa nenhum tipo de evento sem frase para o casal', () => {
    for (const [tipo, apresentacao] of Object.entries(INVITE_EVENT_PRESENTATION)) {
      expect(apresentacao.label, `${tipo} sem rótulo`).toBeTruthy()
      // o rótulo nunca pode ser o identificador técnico, que é o bug original
      expect(apresentacao.label).not.toBe(tipo)
      expect(apresentacao.label).not.toMatch(/^(invite|token|rsvp)\./)
      expect(apresentacao.icon).toMatch(/^lucide:/)
    }
  })

  it('cobre todo tipo_evento que o servidor realmente grava', () => {
    const gravados = [...tiposDeEventoGravados()].sort()
    // Piso deliberado: sem isso, um regex que parasse de casar deixaria o teste
    // passar varrendo zero arquivo — que é justamente o modo de falhar que este
    // guard existe para impedir. Limitação conhecida: um tipo_evento montado em
    // variável (nunca literal) escapa da varredura.
    expect(gravados.length).toBeGreaterThanOrEqual(8)
    const semRotulo = gravados.filter((tipo) => !(tipo in INVITE_EVENT_PRESENTATION))
    expect(
      semRotulo,
      `tipos gravados sem rótulo na Linha do Tempo: ${semRotulo.join(', ')}`,
    ).toEqual([])
  })

  it('escreve o nome de quem respondeu e o que respondeu', () => {
    const resultado = describeInviteEvent(
      evento({
        tipo_evento: 'rsvp.guest_status_changed',
        metadados: { guestId: 'guest-1', previousStatus: 'pendente', newStatus: 'confirmado' },
      }),
      MEMBROS,
    )
    expect(resultado.label).toBe('Ana Souza confirmou presença')
    expect(resultado.tone).toBe('success')
  })

  it('funciona sem o nome quando o convidado já saiu do convite', () => {
    const resultado = describeInviteEvent(
      evento({
        tipo_evento: 'rsvp.guest_status_changed',
        metadados: { guestId: 'guest-removido', newStatus: 'recusado' },
      }),
      MEMBROS,
    )
    expect(resultado.label).toBe('Um convidado não poderá ir')
    expect(resultado.tone).toBe('danger')
  })

  it('cai no rótulo genérico quando os metadados vêm incompletos', () => {
    const resultado = describeInviteEvent(evento({ tipo_evento: 'rsvp.guest_status_changed' }), [])
    expect(resultado.label).toBe('Resposta de RSVP atualizada')
  })

  it('mostra o evento mesmo quando o tipo é desconhecido desta versão da tela', () => {
    const resultado = describeInviteEvent(evento({ tipo_evento: 'invite.futuro' }), [])
    expect(resultado.label).toBe('Evento registrado')
  })
})
