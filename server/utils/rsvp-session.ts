import type { H3Event } from 'h3'
import { signRsvpToken, verifyRsvpToken } from './rsvp-token'

/**
 * Sessão de RSVP (CLAUDE.md, seção 14.3/16) — cookie httpOnly, curto,
 * assinado com HMAC-SHA256 (server/utils/rsvp-token.ts). Emitida só depois
 * que o convidado se identifica, via link direto (/rsvp/[code]) ou busca por
 * nome + "Sim, sou eu" (rsvp-search/confirm) — e exigida pelas rotas de
 * mutação (PUT status / POST finalize).
 *
 * Antes desta sessão existir, essas rotas de mutação aceitavam qualquer
 * guestId/inviteId informado na própria URL sem checar posse — como usam
 * service_role (RLS não protege, CLAUDE.md §4.5), qualquer pessoa conseguia
 * alterar o RSVP de terceiros a partir de um id descoberto pela busca
 * pública por nome (achado de segurança, varredura de 2026-08-19). A busca
 * por nome em si continua igual — é decisão de produto já deliberada
 * (mesmo padrão de Presentes), só a escrita precisava de posse comprovada.
 */

const COOKIE_NAME = 'rsvp_session'
const TTL_SECONDS = 6 * 60 * 60 // 6h — dá tempo de preencher o formulário sem precisar buscar de novo

export interface RsvpSession {
  casamentoId: string
  conviteId: string
}

function getSecret(): string {
  const secret = useRuntimeConfig().rsvpSessionSecret
  if (!secret) {
    throw new Error('RSVP_SESSION_SECRET não configurada.')
  }
  return secret
}

/** Emite/renova o cookie de sessão de RSVP para um convite específico. */
export function issueRsvpSession(event: H3Event, session: RsvpSession): void {
  const token = signRsvpToken({ ...session, exp: Date.now() + TTL_SECONDS * 1000 }, getSecret())
  setCookie(event, COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: !import.meta.dev,
    path: '/',
    maxAge: TTL_SECONDS,
  })
}

/** Lê e valida a sessão de RSVP da requisição, sem exigir um convite específico. */
export function readRsvpSession(event: H3Event): RsvpSession | null {
  const token = getCookie(event, COOKIE_NAME)
  if (!token) {
    return null
  }
  const payload = verifyRsvpToken(token, getSecret())
  if (!payload) {
    return null
  }
  return { casamentoId: payload.casamentoId, conviteId: payload.conviteId }
}

/**
 * Exige uma sessão de RSVP válida vinculada exatamente a `conviteId` — usada
 * pelas rotas de mutação. Lança 403 se a sessão estiver ausente, expirada,
 * adulterada, ou apontar para outro convite (inclui o caso de `conviteId`
 * vazio/nulo, ex.: convidado ainda sem convite_id — nunca bate com uma
 * sessão real).
 */
export function requireRsvpSessionForInvite(event: H3Event, conviteId: string | null | undefined): RsvpSession {
  const session = readRsvpSession(event)
  if (!session || !conviteId || session.conviteId !== conviteId) {
    throw forbiddenError('Você precisa confirmar sua identidade antes de alterar este RSVP.')
  }
  return session
}
