-- `convidados_com_status` volta a expor TODAS as colunas de `convidados`.
--
-- O ACHADO. A view é `select c.*, ...`, e `*` numa view não é dinâmico: o
-- Postgres o expande UMA VEZ, no momento da criação, e congela a lista de
-- colunas. `alter table convidados add column mesa_id` (migration
-- 20260913110001) não a alcançou — a tela de Mesas quebrou com "column
-- convidados_com_status.mesa_id does not exist", já no primeiro carregamento.
--
-- A consequência que fica: **toda coluna nova em `convidados` exige recriar
-- esta view**, e o sintoma é sempre este erro, nunca um dado errado em
-- silêncio. É o preço de `c.*` — e ele continua valendo a pena: listar as
-- dezenove colunas à mão trocaria uma falha barulhenta e imediata por uma
-- lista que envelhece sem ninguém notar.
--
-- `drop` e não `create or replace`: substituir só aceita ACRESCENTAR colunas no
-- fim, e `mesa_id` entra no meio da expansão de `c.*`.

drop view if exists public.convidados_com_status;

create view public.convidados_com_status
with (security_invoker = true)
as
select
  c.*,
  coalesce(r.status_rsvp, 'pendente') as status_rsvp,
  r.respondido_em
from public.convidados c
left join public.respostas_rsvp r on r.convidado_id = c.id;

comment on view public.convidados_com_status is
  'Convidados com o status de RSVP resolvido (sem resposta = pendente). Leitura da listagem/filtro do admin — escrita continua sendo sempre em convidados/respostas_rsvp. security_invoker: respeita a RLS das tabelas de origem. ATENÇÃO: `c.*` é expandido na criação, então coluna nova em `convidados` exige recriar esta view.';

grant select on public.convidados_com_status to authenticated, service_role;
