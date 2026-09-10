-- `estagio_desde`: quando o convite entrou no estágio em que está.
--
-- Por que isso importa (docs/PRODUCT.md seção 5.1): o estágio informa, mas o
-- tempo no estágio já diz o que fazer. "Aberto" é um fato; "Aberto há 14 dias"
-- é um pedido de lembrete. Foi a parte do redesenho deixada para a rodada
-- seguinte de propósito, porque exige um timestamp por estágio.
--
-- Cada estágio tem o SEU fato, e a data é a do fato que colocou o convite ali:
--
--   nao_enviado -> nenhum fato aconteceu, então NULL (não existe "há N dias
--                  sem nada ter acontecido" — a tela não mostra tempo aqui)
--   enviado     -> `convites.enviado_em`
--   aberto      -> o PRIMEIRO acesso (min de `historico_convite.ocorrido_em`)
--   parcial     -> a resposta MAIS RECENTE
--   respondido  -> a resposta mais recente, que é quando fechou
--
-- "Parcial" usa a última resposta, não a primeira: o que o casal precisa saber
-- é há quanto tempo nada acontece, e a primeira resposta pode ser de um mês
-- atrás num convite que recebeu outra ontem.
--
-- `respondido_em` serve para as duas porque `salvar_rsvp_convidado` grava
-- `now()` tanto no insert quanto no update — inclusive quando a resposta é
-- registrada pelo casal.

drop view if exists public.convites_com_resumo;

create view public.convites_com_resumo
with (security_invoker = true)
as
select
  c.*,
  coalesce(m.total_membros, 0) as total_membros,
  coalesce(m.total_respondidos, 0) as total_respondidos,
  case
    -- `total_membros > 0` na primeira cláusula: um convite sem ninguém dentro
    -- tem 0 >= 0 e apareceria como "respondido" sem existir uma só resposta.
    when coalesce(m.total_membros, 0) > 0 and m.total_respondidos >= m.total_membros
      then 'respondido'
    when coalesce(m.total_respondidos, 0) > 0 then 'parcial'
    -- "Aberto" é o único estágio comprovado pelo sistema: o convidado acessou.
    -- Por isso ele passa na frente de "enviado", que é só o casal informando
    -- que mandou — se alguém abriu, o convite chegou, mesmo que ninguém tenha
    -- marcado nada.
    when a.primeiro_acesso is not null then 'aberto'
    when c.enviado_em is not null then 'enviado'
    else 'nao_enviado'
  end as status_operacional,
  -- Espelha o CASE acima, na mesma ordem: o timestamp do fato que define o
  -- estágio. Manter os dois no mesmo SELECT é o que garante que não divirjam.
  case
    when coalesce(m.total_membros, 0) > 0 and m.total_respondidos >= m.total_membros
      then m.ultima_resposta
    when coalesce(m.total_respondidos, 0) > 0 then m.ultima_resposta
    when a.primeiro_acesso is not null then a.primeiro_acesso
    when c.enviado_em is not null then c.enviado_em
    else null
  end as estagio_desde
from public.convites c
left join (
  select
    g.convite_id,
    count(*) as total_membros,
    -- Só resposta de verdade conta: linha ausente e linha 'pendente' são a
    -- mesma coisa para quem organiza — ninguém respondeu ainda. `lista_espera`
    -- conta como resposta: o convidado deu retorno, quem está segurando é o
    -- casal (decisão registrada em docs/PRODUCT.md seção 5.2).
    count(*) filter (
      where r.status_rsvp is not null and r.status_rsvp <> 'pendente'
    ) as total_respondidos,
    max(r.respondido_em) filter (
      where r.status_rsvp is not null and r.status_rsvp <> 'pendente'
    ) as ultima_resposta
  from public.convidados g
  left join public.respostas_rsvp r on r.convidado_id = g.id
  where g.excluido_em is null
    and g.convite_id is not null
  group by g.convite_id
) m on m.convite_id = c.id
left join lateral (
  -- Primeiro acesso vive só no log, e é gravado POR CONVITE (não por
  -- convidado): "João abriu, Maria não" é `aberto`, nunca `parcial` — acesso
  -- parcial não é resposta parcial. Daí bastar o log, sem coluna nova em
  -- `convites` para manter sincronizada.
  --
  -- `min`, não `limit 1`: o estágio precisa da data do PRIMEIRO acesso, e o
  -- log pode ter mais de um evento desse tipo se algum caminho novo o gravar.
  select min(h.ocorrido_em) as primeiro_acesso
  from public.historico_convite h
  where h.convite_id = c.id
    and h.tipo_evento = 'rsvp.first_access'
) a on true;

comment on view public.convites_com_resumo is
  'Convites com total de membros, total de respostas, `status_operacional` (o estágio mais avançado do funil: nao_enviado/enviado/aberto/parcial/respondido) e `estagio_desde` (o timestamp do fato que define o estágio atual). Tudo derivado — nunca fonte de verdade própria. Leitura da listagem/filtro do admin; escrita continua sempre em convites. security_invoker: respeita a RLS das tabelas de origem.';

grant select on public.convites_com_resumo to authenticated, service_role;
