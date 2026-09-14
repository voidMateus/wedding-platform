import { serverSupabaseClient } from '#supabase/server'
import { formatCentsToBRL } from '#shared/utils/format-currency'
import { formatDatePtBR } from '#shared/utils/format-date'
import { findThemePreset } from '#shared/theme-presets'
import type { FatoObservado } from '#shared/fatos-do-casamento'
import type { OnboardingSummary } from '~/types/onboarding'

/**
 * Os fatos que o roteiro de Primeiros passos lê (docs/fase4-onboarding.md 9).
 *
 * Devolve FATOS, não passos prontos: quem observa é o servidor, quem sabe
 * desenhar é o catálogo compartilhado (`shared/onboarding-passos.ts`) — mesmo
 * arranjo de `resolveHomeSections()`. A lista de passos vira uma função pura,
 * testável sem servidor nenhum, e este endpoint não muda quando um passo muda
 * de rótulo, de grupo ou de ordem.
 *
 * Reaproveita o observador do Planejamento inteiro: é uma ida ao banco, e os
 * dois consumidores leem exatamente os mesmos fatos.
 *
 * `valores` é o que cada passo cumprido MOSTRA na linha — "Espaço Villa Rosa",
 * não um selo de concluído: é o que confirma ao casal que o sistema entendeu o
 * que ele quis dizer. Vem daqui já formatado porque cada chave tem uma forma
 * própria (data, dinheiro, nome de preset), e espalhar isso por um componente
 * de lista faria a tela conhecer os sete passos um a um.
 */
export default defineEventHandler(async (event): Promise<OnboardingSummary> => {
  const { weddingId } = await requireWeddingContext(event)
  const client = await serverSupabaseClient(event)

  const [{ fatos }, casamento, etapaComLocal] = await Promise.all([
    observarFatosDoCasamento(client, weddingId),
    client
      .from('casamentos')
      .select('data_evento, horario_evento, prazo_rsvp, orcamento_total_centavos, config_tema')
      .eq('id', weddingId)
      .single(),
    client
      .from('etapas_evento')
      .select('nome_local')
      .eq('casamento_id', weddingId)
      .not('nome_local', 'is', null)
      .order('ordem_exibicao', { ascending: true })
      .limit(1)
      .maybeSingle(),
  ])

  return {
    fatos: fatos as FatoObservado[],
    valores: montarValores(casamento.data, etapaComLocal.data?.nome_local ?? null),
  }
})

function montarValores(
  casamento: {
    data_evento: string
    horario_evento: string | null
    prazo_rsvp: string | null
    orcamento_total_centavos: number | null
    config_tema: unknown
  } | null,
  nomeLocal: string | null,
): Record<string, string> {
  const valores: Record<string, string> = {}
  if (!casamento) return valores

  if (casamento.horario_evento) {
    // O horário vem do Postgres como HH:MM:SS; a linha do roteiro é um resumo,
    // e segundo nenhum casamento tem.
    const hora = casamento.horario_evento.slice(0, 5)
    valores['data-horario'] = `${formatDatePtBR(casamento.data_evento)} · ${hora}`
  }

  if (nomeLocal) valores.local = nomeLocal
  if (casamento.prazo_rsvp) valores['prazo-rsvp'] = formatDatePtBR(casamento.prazo_rsvp)

  if ((casamento.orcamento_total_centavos ?? 0) > 0) {
    valores.orcamento = formatCentsToBRL(casamento.orcamento_total_centavos ?? 0)
  }

  const tema = (casamento.config_tema ?? {}) as { presetId?: string; coverImageUrl?: string }
  const preset = tema.presetId ? findThemePreset(tema.presetId) : undefined
  if (preset) valores.aparencia = preset.label
  else if (tema.presetId || tema.coverImageUrl) valores.aparencia = 'personalizada'

  return valores
}
