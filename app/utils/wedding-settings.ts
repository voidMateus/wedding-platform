import { resolverFaixasEtarias } from '#shared/utils/faixa-etaria'
import type { WeddingSettingsInput } from '#shared/schemas/wedding'
import type { Wedding } from '~/types/wedding'

/**
 * A linha de `casamentos` no formato que `PATCH /api/wedding` espera.
 *
 * `PATCH /api/wedding` **substitui** o conjunto inteiro de configurações do
 * evento de propósito — a validação de continuidade das faixas etárias só vale
 * sobre o conjunto completo, e o schema não tem `.default()` justamente para
 * que um corpo incompleto não sobrescreva a configuração do casal pela padrão
 * da plataforma.
 *
 * Quem quiser mudar UM campo, então, precisa mandar todos os outros como estão:
 * é o que o formulário de Configurações faz ao popular seus campos, e é o que o
 * wizard do onboarding faz ao salvar uma etapa. Escrito duas vezes, o mapa
 * divergiria no primeiro campo novo — e o sintoma seria um campo alheio voltando
 * ao padrão sem ninguém ter tocado nele.
 */
export function weddingSettingsFromRow(wedding: Wedding): WeddingSettingsInput {
  return {
    nomesNoivos: wedding.nomes_noivos,
    dataEvento: wedding.data_evento,
    // HH:MM:SS no Postgres, HH:MM no <input type="time">.
    horarioEvento: wedding.horario_evento ? wedding.horario_evento.slice(0, 5) : '',
    prazoRsvp: wedding.prazo_rsvp ? isoParaDatetimeLocal(wedding.prazo_rsvp) : '',
    faixasEtarias: resolverFaixasEtarias(wedding.config_faixas_etarias),
    modoListaConvidados: wedding.modo_lista_convidados as 'fechada' | 'aberta',
    handleInfinitepay: wedding.handle_infinitepay ?? '',
    modoEntregaPresenteFisico: wedding.modo_entrega_presente_fisico as
      'ambos' | 'somente_compra_propria' | 'somente_pagamento',
  }
}

/** ISO do servidor → `YYYY-MM-DDTHH:mm` local, o formato do schema e do input. */
export function isoParaDatetimeLocal(iso: string): string {
  const date = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}
