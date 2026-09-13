-- Migration B da Fase 2 do Hub — `convites.enviado_em` e `convites.status_convite`
-- saem do schema. Refinamento em docs/fase2-convidados.md (F2.7, seção 12.1).
--
-- POR QUE SÓ AGORA. A migration A (20260913100001) criou `comunicacoes`, copiou
-- o que estava marcado como enviado e passou `convites_com_resumo.enviado_em` a
-- derivar do registro de envio — mas manteve a coluna física e um
-- `coalesce(derivado, c.enviado_em)` sobre ela. O motivo era a JANELA DE DEPLOY:
-- as migrations são aplicadas em produção no merge, em paralelo com o deploy da
-- Vercel, e existe um intervalo em que o código publicado ainda é o antigo. Nele,
-- um "Marcar como enviado" faria `update convites set enviado_em` — que sem o
-- coalesce seria aceito pelo banco e ignorado pela tela, o pior desfecho, porque
-- parece funcionar.
--
-- Essa janela fechou no merge anterior: o código em produção registra envio em
-- `comunicacoes` e lê `enviado_em` da view. Nada mais escreve nas duas colunas —
-- `status_convite` está órfão desde 20260910090001, quando o estágio do convite
-- passou a ser derivado (`status_operacional`).
--
-- ORDEM. A view depende de `c.enviado_em` pelo coalesce, então ela cai primeiro e
-- é recriada depois do drop das colunas. `convites_status_convite_idx` some junto
-- com a coluna que indexava, sem precisar de linha própria.

drop view if exists convites_com_resumo;

alter table convites
  drop column enviado_em,
  drop column status_convite;

-- Recriada idêntica à da migration A, menos o coalesce: `env.enviado_em` — o
-- primeiro registro de envio do tipo `convite` — é agora a única origem
-- possível do estágio "Enviado".
create view convites_com_resumo
with (security_invoker = true)
as
select
  c.id,
  c.casamento_id,
  c.codigo_interno,
  c.nome,
  c.convidado_responsavel_id,
  c.max_acompanhantes,
  c.mensagem_rsvp,
  c.mensagem_rsvp_em,
  c.observacoes,
  c.arquivado_em,
  c.excluido_em,
  c.created_at,
  c.updated_at,
  env.enviado_em,
  env.ultimo_contato,
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
    -- registrado o envio.
    when a.primeiro_acesso is not null then 'aberto'
    when env.enviado_em is not null then 'enviado'
    else 'nao_enviado'
  end as status_operacional,
  -- Espelha o CASE acima, na mesma ordem: o timestamp do fato que define o
  -- estágio. Manter os dois no mesmo SELECT é o que garante que não divirjam.
  case
    when coalesce(m.total_membros, 0) > 0 and m.total_respondidos >= m.total_membros
      then m.ultima_resposta
    when coalesce(m.total_respondidos, 0) > 0 then m.ultima_resposta
    when a.primeiro_acesso is not null then a.primeiro_acesso
    else env.enviado_em
  end as estagio_desde
from convites c
left join lateral (
  -- O PRIMEIRO envio de convite define o estágio "Enviado"; o último de
  -- QUALQUER tipo responde outra pergunta ("faz quanto tempo que falamos com
  -- essas pessoas?"), e é a tela de Comunicações que a usa.
  select
    min(k.enviado_em) filter (where k.tipo = 'convite') as enviado_em,
    max(k.enviado_em) as ultimo_contato
  from comunicacoes k
  where k.convite_id = c.id
) env on true
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
  from convidados g
  left join respostas_rsvp r on r.convidado_id = g.id
  where g.excluido_em is null
    and g.convite_id is not null
  group by g.convite_id
) m on m.convite_id = c.id
left join lateral (
  -- Primeiro acesso vive só no log, e é gravado POR CONVITE (não por
  -- convidado): "João abriu, Maria não" é `aberto`, nunca `parcial` — acesso
  -- parcial não é resposta parcial.
  --
  -- `min`, não `limit 1`: o estágio precisa da data do PRIMEIRO acesso, e o
  -- log pode ter mais de um evento desse tipo se algum caminho novo o gravar.
  select min(h.ocorrido_em) as primeiro_acesso
  from historico_convite h
  where h.convite_id = c.id
    and h.tipo_evento = 'rsvp.first_access'
) a on true;

comment on view convites_com_resumo is
  'Convites com total de membros, total de respostas, `status_operacional` (o estágio mais avançado do funil: nao_enviado/enviado/aberto/parcial/respondido), `estagio_desde` (o timestamp do fato que define o estágio), `enviado_em` (DERIVADO do primeiro registro em comunicacoes do tipo convite) e `ultimo_contato` (o envio mais recente de qualquer tipo). Tudo derivado — nunca fonte de verdade própria. security_invoker: respeita a RLS das tabelas de origem.';

grant select on convites_com_resumo to authenticated, service_role;
