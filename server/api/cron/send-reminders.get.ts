import { lembretesDoCasamento } from '#shared/schemas/lembretes'
import { conviteDeveReceberLembrete, marcaQueDispara } from '#shared/utils/lembretes'
import { hojeNoFusoDoEvento } from '#shared/utils/orcamento'
import { normalizarEmail } from '#shared/utils/email'
import { formatDatePtBR } from '#shared/utils/format-date'
import { formatCentsToBRL } from '#shared/utils/format-currency'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { EmailProvider } from '../../utils/email-provider'
import type { Database } from '~/types/database.types'

/**
 * Os avisos automáticos do dia — a única peça da plataforma que age sem
 * ninguém clicar.
 *
 * **UM cron para os dois lembretes**, e não um por assunto: o plano Hobby da
 * Vercel permite poucos cron jobs por projeto, e a sincronização da galeria já
 * ocupa um. Dois assuntos no mesmo endpoint é um custo de organização; um
 * assunto sem cron disponível é um recurso que não existe.
 *
 * **Roda todo dia e quase sempre não faz nada.** É o desenho certo: a decisão
 * de enviar é uma comparação de datas (`marcaQueDispara`), e um cron que só
 * roda "quando precisa" precisaria de alguém para saber quando é.
 *
 * Autoriza pelo `CRON_SECRET` e roda com `service_role` — sem sessão de
 * usuário, como o cron da galeria.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const authHeader = getRequestHeader(event, 'authorization')
  if (!config.cronSecret || authHeader !== `Bearer ${config.cronSecret}`) {
    throw unauthorizedError('Cron não autorizado.')
  }

  const provider = resolveEmailProvider()
  // Sem provedor configurado não há o que fazer, e isso não é falha: é um
  // ambiente sem domínio de envio. Responder 200 evita que o painel da Vercel
  // acuse falha diária num ambiente que nunca vai mandar e-mail.
  if (!provider) return { enviados: 0, motivo: 'provedor de e-mail não configurado' }

  const admin = supabaseAdmin(event)
  const hoje = hojeNoFusoDoEvento()
  const origin = config.public.siteUrl || getRequestURL(event).origin

  const { data: casamentos, error } = await admin
    .from('casamentos')
    .select('id, slug, nomes_noivos, prazo_rsvp, status_ciclo_vida, config_tema, config_lembretes')
    .neq('status_ciclo_vida', 'arquivado')

  if (error) throw badRequestError(error.message)

  let rsvpEnviados = 0
  let pagamentosEnviados = 0

  for (const casamento of casamentos ?? []) {
    const lembretes = lembretesDoCasamento(casamento.config_lembretes)

    try {
      // Só casamento PUBLICADO manda lembrete de RSVP: o lembrete leva um link
      // para o site, e mandar o convidado para um site que ainda não está no ar
      // é pior que não lembrar.
      if (lembretes.rsvp.ativo && casamento.status_ciclo_vida === 'publicado') {
        const marca = marcaQueDispara(hoje, casamento.prazo_rsvp, lembretes.rsvp.diasAntes)
        if (marca !== null) {
          rsvpEnviados += await enviarLembretesDeRsvp({
            admin,
            provider,
            origin,
            hoje,
            marca,
            casamento,
          })
        }
      }

      if (lembretes.pagamentos.ativo) {
        pagamentosEnviados += await enviarAvisoDePagamentos({
          admin,
          provider,
          origin,
          hoje,
          diasAntes: lembretes.pagamentos.diasAntes,
          casamento,
        })
      }
    } catch (err) {
      // Um casamento com problema não pode impedir os outros de receber —
      // mesma tolerância do cron de galerias.
      console.error('[cron:send-reminders] falha no casamento', casamento.id, err)
    }
  }

  return { rsvpEnviados, pagamentosEnviados }
})

interface CasamentoDoCron {
  id: string
  slug: string
  nomes_noivos: string
  prazo_rsvp: string | null
  config_tema: unknown
}

/**
 * O lembrete de RSVP: para quem já recebeu o convite e ainda não respondeu por
 * inteiro.
 *
 * Quem decide quem recebe é `conviteDeveReceberLembrete` (pura, testada); aqui
 * só se junta o que ela precisa saber.
 */
async function enviarLembretesDeRsvp(params: {
  admin: SupabaseClient<Database>
  provider: EmailProvider
  origin: string
  hoje: string
  marca: number
  casamento: CasamentoDoCron
}): Promise<number> {
  const { admin, provider, origin, hoje, marca, casamento } = params

  const { data: convites } = await admin
    .from('convites_com_resumo')
    .select('id, convidado_responsavel_id, enviado_em, status_operacional')
    .eq('casamento_id', casamento.id)
    .is('excluido_em', null)
    .is('arquivado_em', null)

  if (!convites?.length) return 0

  // "Já recebeu lembrete hoje": uma consulta para o casamento inteiro, não uma
  // por convite. O recorte é o dia no fuso do evento, não as últimas 24h — o
  // que se quer evitar é dois lembretes no mesmo dia, e uma janela deslizante
  // suprimiria o envio de amanhã de manhã.
  const { data: lembretesDeHoje } = await admin
    .from('comunicacoes')
    .select('convite_id')
    .eq('casamento_id', casamento.id)
    .eq('tipo', 'lembrete')
    .gte('enviado_em', `${hoje}T00:00:00Z`)

  const jaLembrados = new Set((lembretesDeHoje ?? []).map((linha) => linha.convite_id))

  const responsaveisIds = convites
    .map((convite) => convite.convidado_responsavel_id)
    .filter((id): id is string => Boolean(id))

  const { data: responsaveis } = responsaveisIds.length
    ? await admin.from('convidados').select('id, email').in('id', responsaveisIds)
    : { data: [] }

  const emailPorPessoa = new Map(
    (responsaveis ?? []).map((pessoa) => [pessoa.id, normalizarEmail(pessoa.email)]),
  )

  const candidatos = convites.filter((convite) =>
    conviteDeveReceberLembrete({
      recebeuConvite: Boolean(convite.enviado_em),
      respondidoPorCompleto: convite.status_operacional === 'respondido',
      temDestinatario: Boolean(
        convite.convidado_responsavel_id &&
        emailPorPessoa.get(convite.convidado_responsavel_id) !== null &&
        emailPorPessoa.get(convite.convidado_responsavel_id) !== undefined,
      ),
      lembreteEnviadoHoje: jaLembrados.has(convite.id as string),
    }),
  )

  if (!candidatos.length) return 0

  // Uma vez por casamento, não por convite: são oitenta mensagens do mesmo
  // evento, com o mesmo local e o mesmo modelo.
  const contexto = await carregarContextoDoCasamento(admin, casamento.id)
  const tema = (casamento.config_tema ?? {}) as { primaryColor?: string }
  let enviados = 0

  for (const convite of candidatos) {
    const conviteId = convite.id as string
    try {
      const mensagem = await montarMensagemDoConvite({
        client: admin,
        weddingId: casamento.id,
        conviteId,
        tipo: 'lembrete',
        origin,
        contexto,
      })

      const para = mensagem.destinatario?.email
      if (!para) continue

      const enviado = await provider.enviar({
        para,
        remetenteNome: contexto.nomesNoivos,
        assunto: assuntoDeEmail(contexto.nomesNoivos, 'lembrete'),
        html: montarHtmlDeEmail({
          texto: mensagem.texto,
          nomesNoivos: contexto.nomesNoivos,
          corPrimaria: tema.primaryColor ?? null,
          urlDoSite: `${origin}/${contexto.slug}`,
        }),
        texto: mensagem.texto,
      })

      if (!enviado.ok) {
        console.error('[cron:send-reminders] rsvp recusado —', enviado.reason)
        continue
      }

      await admin.from('comunicacoes').insert({
        casamento_id: casamento.id,
        convite_id: conviteId,
        convidado_id: convite.convidado_responsavel_id,
        canal: 'email',
        tipo: 'lembrete',
        // Nulo de propósito: `registrado_por` é quem CLICOU, e aqui não houve
        // clique. É o que distingue, no histórico, o lembrete que o casal
        // mandou do que a plataforma mandou por ele.
        registrado_por: null,
        provedor_mensagem_id: enviado.data.idNoProvedor,
      })

      await admin.from('historico_convite').insert({
        casamento_id: casamento.id,
        convite_id: conviteId,
        tipo_evento: 'comunicacao.enviada',
        metadados: { tipo: 'lembrete', canal: 'email', source: 'cron', marca },
      })

      enviados += 1
    } catch (err) {
      console.error('[cron:send-reminders] falha no convite', conviteId, err)
    }
  }

  if (enviados > 0) {
    await recordSystemAuditLog(admin, casamento.id, {
      action: 'communication.rsvp_reminder.sent',
      entityType: 'wedding',
      entityId: casamento.id,
      metadata: { marca, enviados, prazo: casamento.prazo_rsvp },
    })
  }

  return enviados
}

/**
 * O aviso de vencimento: vai para o CASAL, não para convidado nenhum.
 *
 * **Um e-mail com todas as parcelas do dia**, nunca um por parcela: três
 * contas vencendo na mesma semana são uma notícia só, e três e-mails seguidos
 * são o que faz alguém criar uma regra de filtro.
 */
async function enviarAvisoDePagamentos(params: {
  admin: SupabaseClient<Database>
  provider: EmailProvider
  origin: string
  hoje: string
  diasAntes: readonly number[]
  casamento: CasamentoDoCron
}): Promise<number> {
  const { admin, provider, origin, hoje, diasAntes, casamento } = params
  if (!diasAntes.length) return 0

  const maiorMarca = Math.max(...diasAntes)
  const limite = new Date(Date.parse(`${hoje}T00:00:00Z`) + maiorMarca * 86_400_000)
    .toISOString()
    .slice(0, 10)

  const { data: parcelas } = await admin
    .from('parcelas_despesa')
    .select('id, vence_em, valor_centavos, numero, despesas(nome)')
    .eq('casamento_id', casamento.id)
    .is('pago_em', null)
    .gte('vence_em', hoje)
    .lte('vence_em', limite)
    .order('vence_em')

  const doDia = (parcelas ?? []).filter(
    (parcela) => marcaQueDispara(hoje, parcela.vence_em, diasAntes) !== null,
  )

  if (!doDia.length) return 0

  // Mesma proteção contra rodada dupla do lembrete de RSVP, com a diferença de
  // que aqui não existe `comunicacoes` (não é envio a convidado): quem guarda
  // o fato é a trilha de auditoria do sistema.
  const { data: jaAvisado } = await admin
    .from('trilha_auditoria')
    .select('id')
    .eq('casamento_id', casamento.id)
    .eq('acao', 'finance.payment_reminder.sent')
    .gte('created_at', `${hoje}T00:00:00Z`)
    .limit(1)

  if (jaAvisado?.length) return 0

  const destinatarios = await emailsDosMembros(admin, casamento.id)
  if (!destinatarios.length) return 0

  const linhas = doDia.map((parcela) => {
    const nome = (parcela.despesas as { nome?: string } | null)?.nome ?? 'Gasto'
    const quando = formatDatePtBR(parcela.vence_em)
    return `• ${nome} — ${formatCentsToBRL(parcela.valor_centavos)}, vence em ${quando}`
  })

  const total = doDia.reduce((soma, parcela) => soma + parcela.valor_centavos, 0)
  const texto = [
    `Oi! Passando para avisar que ${doDia.length === 1 ? 'um pagamento do casamento vence' : `${doDia.length} pagamentos do casamento vencem`} em breve:`,
    '',
    linhas.join('\n'),
    '',
    `Total: ${formatCentsToBRL(total)}`,
    '',
    `Os detalhes estão em ${origin}/admin/${casamento.slug}/financeiro/pagamentos`,
  ].join('\n')

  const tema = (casamento.config_tema ?? {}) as { primaryColor?: string }
  let enviados = 0

  for (const para of destinatarios) {
    const enviado = await provider.enviar({
      para,
      // O remetente aqui é a PLATAFORMA, não o casal: quem recebe é o próprio
      // casal, e um e-mail assinado com o nome deles chegando na caixa deles
      // pareceria phishing.
      remetenteNome: 'MeuSiteCasamento',
      assunto:
        doDia.length === 1
          ? 'Um pagamento do casamento vence em breve'
          : `${doDia.length} pagamentos do casamento vencem em breve`,
      html: montarHtmlDeEmail({
        texto,
        nomesNoivos: casamento.nomes_noivos,
        corPrimaria: tema.primaryColor ?? null,
        urlDoSite: null,
      }),
      texto,
    })

    if (enviado.ok) enviados += 1
    else console.error('[cron:send-reminders] pagamento recusado —', enviado.reason)
  }

  if (enviados > 0) {
    await recordSystemAuditLog(admin, casamento.id, {
      action: 'finance.payment_reminder.sent',
      entityType: 'wedding',
      entityId: casamento.id,
      // Sem valores nem nomes de fornecedor: o log diz o que aconteceu, não o
      // que estava escrito na mensagem.
      metadata: { parcelas: doDia.length, destinatarios: enviados },
    })
  }

  return enviados
}

/** Os e-mails de quem administra o casamento — o e-mail de login de cada membro. */
async function emailsDosMembros(
  admin: SupabaseClient<Database>,
  weddingId: string,
): Promise<string[]> {
  const { data: membros } = await admin
    .from('membros_casamento')
    .select('usuario_id')
    .eq('casamento_id', weddingId)

  const emails = await Promise.all(
    (membros ?? []).map(async (membro) => {
      const { data } = await admin.auth.admin.getUserById(membro.usuario_id)
      return normalizarEmail(data.user?.email)
    }),
  )

  return [...new Set(emails.filter((email): email is string => Boolean(email)))]
}
