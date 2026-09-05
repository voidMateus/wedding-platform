-- Resumo de resposta por convite, resolvido no banco.
--
-- Por que existe: a listagem de convites é paginada, mas "quantas pessoas" e
-- "respondeu?" eram calculados na aplicação DEPOIS de paginar. Enquanto isso
-- servia só para desenhar a linha, passava; no momento em que a tela precisa
-- filtrar e ordenar por esses valores, calcular depois significa recortar
-- apenas a página carregada — e um convite arquivado (ou pendente) que caísse
-- na página 2 simplesmente não apareceria no recorte.
--
-- Segunda view do projeto, mesma regra da primeira: `security_invoker = true`
-- (CLAUDE.md, seção 10). Sem isso ela rodaria com o privilégio do dono e
-- ignoraria a RLS de `convites`/`convidados`/`respostas_rsvp` — o achado de
-- segurança "Security Definer View" registrado em docs/CHANGELOG.md. Com o
-- invoker ligado, cada linha continua passando pelas policies das tabelas de
-- origem: é a mesma leitura de sempre, com três colunas derivadas a mais.
--
-- CORREÇÃO DE COMPORTAMENTO: o denominador de "respondeu" passa a ser o número
-- de MEMBROS do convite, não o número de linhas em `respostas_rsvp`. A conta
-- anterior comparava respondidos com o total de respostas existentes, e
-- `respostas_rsvp` só ganha linha quando alguém responde — então um convite de
-- 3 pessoas em que só 1 respondeu tinha "1 de 1" e aparecia como **Respondido**.
-- Agora é "1 de 3" e aparece como Parcial, que é o que o casal precisa ver para
-- saber que ainda falta cobrar alguém.
--
-- Manutenção: `c.*` é expandido na criação. Coluna nova em `convites` não
-- aparece aqui sozinha — é preciso `drop view` + `create view` (o `create or
-- replace` não muda a lista de colunas).

create view public.convites_com_resumo
with (security_invoker = true) as
select
  c.*,
  coalesce(m.total_membros, 0) as total_membros,
  coalesce(m.total_respondidos, 0) as total_respondidos,
  case
    when coalesce(m.total_respondidos, 0) = 0 then 'pendente'
    when m.total_respondidos >= m.total_membros then 'respondido'
    else 'parcial'
  end as status_resposta
from public.convites c
left join (
  select
    g.convite_id,
    count(*) as total_membros,
    -- Só resposta de verdade conta: linha ausente e linha 'pendente' são a
    -- mesma coisa para quem organiza — ninguém respondeu ainda.
    count(*) filter (
      where r.status_rsvp is not null and r.status_rsvp <> 'pendente'
    ) as total_respondidos
  from public.convidados g
  left join public.respostas_rsvp r on r.convidado_id = g.id
  where g.excluido_em is null
    and g.convite_id is not null
  group by g.convite_id
) m on m.convite_id = c.id;

comment on view public.convites_com_resumo is
  'Convites com total de membros, total de respostas e status consolidado (pendente/parcial/respondido). Leitura da listagem/filtro do admin — escrita continua sempre em convites. security_invoker: respeita a RLS das tabelas de origem.';

grant select on public.convites_com_resumo to authenticated, service_role;
