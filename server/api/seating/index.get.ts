import { serverSupabaseClient } from '#supabase/server'
import { areaDaPlanta, resumoDaMesa, resumoDoSalao } from '#shared/utils/mesas'
import type { OcupanteParaCalculo } from '#shared/utils/mesas'
import type { FormatoDeMesa, TipoDeElemento } from '#shared/schemas/mesas'
import type { RsvpStatus } from '#shared/utils/rsvp-status'
import type {
  ElementoDaPlanta,
  MesaComOcupantes,
  PessoaParaSentar,
  SeatingResponse,
} from '~/types/mesa'

/**
 * Tudo que a tela de Mesas precisa, numa resposta só: as mesas com quem senta
 * nelas, os elementos do salão, quem ainda não sentou e os agregados.
 *
 * **Devolve a narrativa pronta, não linhas cruas para a tela somar.** A mesma
 * lista é desenhada em duas vistas (lista e planta), e cada uma somando por
 * conta própria é exatamente como as duas divergem. Os cálculos vêm de
 * `shared/utils/mesas.ts`, que é função pura e testada.
 *
 * Lê a lista inteira, sem paginação: um salão tem dezenas de mesas, e tanto o
 * resumo quanto a planta precisam do conjunto — não existe "página 2 da
 * planta".
 */
export default defineEventHandler(async (event): Promise<SeatingResponse> => {
  const { weddingId } = await requireWeddingContext(event)
  const client = await serverSupabaseClient(event)

  const [mesasResult, elementosResult, convidadosResult, avulsosResult, casamentoResult] =
    await Promise.all([
      client.from('mesas').select('*').eq('casamento_id', weddingId).order('nome'),
      client.from('elementos_planta').select('*').eq('casamento_id', weddingId).order('created_at'),
      // A view, e não a tabela: o status de RSVP resolvido (sem resposta =
      // pendente) é o que decide quem entra em "falta acomodar".
      client
        .from('convidados_com_status')
        .select('id, nome_completo, mesa_id, status_rsvp, convite_id, nucleo_id, em_consideracao')
        .eq('casamento_id', weddingId)
        .is('excluido_em', null)
        // Rascunho da lista nunca senta — a constraint garante, e o filtro
        // evita que ele apareça no painel "quem falta acomodar".
        .eq('em_consideracao', false)
        .order('nome_completo'),
      client
        .from('acompanhantes_avulsos')
        .select('id, nome_completo, mesa_id, convite_id')
        .eq('casamento_id', weddingId)
        .is('excluido_em', null),
      client
        .from('casamentos')
        .select('planta_largura_cm, planta_profundidade_cm')
        .eq('id', weddingId)
        .single(),
    ])

  if (mesasResult.error) throw badRequestError(mesasResult.error.message)
  if (elementosResult.error) throw badRequestError(elementosResult.error.message)
  if (convidadosResult.error) throw badRequestError(convidadosResult.error.message)
  if (avulsosResult.error) throw badRequestError(avulsosResult.error.message)
  if (casamentoResult.error) throw badRequestError(casamentoResult.error.message)

  // O nome do convite entra em cada pessoa para o casal reconhecer quem vai
  // com quem ao montar a mesa — sem isso, a lista de "falta acomodar" é uma
  // parede de nomes sem parentesco visível.
  const { data: convites } = await client
    .from('convites')
    .select('id, nome')
    .eq('casamento_id', weddingId)
    .is('excluido_em', null)

  const nomePorConvite = new Map((convites ?? []).map((convite) => [convite.id, convite.nome]))

  const pessoas: PessoaParaSentar[] = [
    ...(convidadosResult.data ?? []).map((convidado) => ({
      id: convidado.id as string,
      nomeCompleto: convidado.nome_completo as string,
      mesaId: convidado.mesa_id,
      statusRsvp: convidado.status_rsvp as RsvpStatus,
      tipo: 'convidado' as const,
      conviteId: convidado.convite_id,
      conviteNome: convidado.convite_id
        ? (nomePorConvite.get(convidado.convite_id) ?? null)
        : null,
      nucleoId: convidado.nucleo_id,
    })),
    ...(avulsosResult.data ?? []).map((avulso) => ({
      id: avulso.id,
      nomeCompleto: avulso.nome_completo,
      mesaId: avulso.mesa_id,
      // Avulso não tem resposta própria: ele só existe porque alguém já
      // confirmou por ele. Nulo, e não 'confirmado', para nunca somar numa
      // contagem de respostas.
      statusRsvp: null,
      tipo: 'avulso' as const,
      conviteId: avulso.convite_id,
      conviteNome: nomePorConvite.get(avulso.convite_id) ?? null,
      nucleoId: null,
    })),
  ]

  const paraCalculo: OcupanteParaCalculo[] = pessoas.map((pessoa) => ({
    id: pessoa.id,
    mesaId: pessoa.mesaId,
    statusRsvp: pessoa.statusRsvp,
  }))

  const mesas: MesaComOcupantes[] = (mesasResult.data ?? []).map((mesa) => ({
    id: mesa.id,
    nome: mesa.nome,
    capacidade: mesa.capacidade,
    formato: mesa.formato as FormatoDeMesa,
    larguraCm: mesa.largura_cm,
    profundidadeCm: mesa.profundidade_cm,
    posicaoXCm: mesa.posicao_x_cm,
    posicaoYCm: mesa.posicao_y_cm,
    rotacaoGraus: mesa.rotacao_graus,
    observacao: mesa.observacao,
    ocupantes: pessoas.filter((pessoa) => pessoa.mesaId === mesa.id),
    resumo: resumoDaMesa({ id: mesa.id, capacidade: mesa.capacidade }, paraCalculo),
  }))

  const elementos: ElementoDaPlanta[] = (elementosResult.data ?? []).map((elemento) => ({
    id: elemento.id,
    tipo: elemento.tipo as TipoDeElemento,
    nome: elemento.nome,
    larguraCm: elemento.largura_cm,
    profundidadeCm: elemento.profundidade_cm,
    posicaoXCm: elemento.posicao_x_cm,
    posicaoYCm: elemento.posicao_y_cm,
    rotacaoGraus: elemento.rotacao_graus,
  }))

  const area = areaDaPlanta(
    {
      larguraCm: casamentoResult.data.planta_largura_cm,
      profundidadeCm: casamentoResult.data.planta_profundidade_cm,
    },
    [...mesas, ...elementos],
  )

  return {
    mesas,
    elementos,
    // Recusado NÃO entra: não há o que acomodar para quem já disse que não vai,
    // e mantê-lo aqui faria a fila nunca esvaziar.
    semMesa: pessoas.filter((pessoa) => !pessoa.mesaId && pessoa.statusRsvp !== 'recusado'),
    salao: {
      larguraCm: casamentoResult.data.planta_largura_cm,
      profundidadeCm: casamentoResult.data.planta_profundidade_cm,
      areaLarguraCm: area.larguraCm,
      areaProfundidadeCm: area.profundidadeCm,
      definida: area.definida,
    },
    resumo: resumoDoSalao(
      mesas.map((mesa) => ({ id: mesa.id, capacidade: mesa.capacidade })),
      paraCalculo,
    ),
  }
})
